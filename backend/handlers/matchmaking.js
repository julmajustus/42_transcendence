/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   matchmaking.js                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mpellegr <mpellegr@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/23 14:45:31 by jmakkone          #+#    #+#             */
/*   Updated: 2025/06/04 13:53:55 by mpellegr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const db = require('../db');
const { game_server } = require('./game_server');
const { Mutex } = require('async-mutex');
const txMutex = new Mutex();

// Single-endpoint “one-button” matchmaking:
// 
// URL: POST /matchmaking
// Auth: required (JWT)
// 
// If there's another user's open lobby (exactly one other player):
//   • join it,
//   • create a real match,
//   • spin up GameServer,
//   • return { match_id }.
// Else if user have just been promoted into an active match:
//   • return { match_id }.
// Else if user already have an open lobby:
//   • return { pending_id }.
// Otherwise:
//      • create a new lobby (auto-join user),
//      • return { pending_id }.
// 
// Front-end usage:
//   const res = await fetch('/matchmaking', {
//     method: 'POST',
//     headers: { Authorization: `Bearer ${token}` }
//   });
//   const body = await res.json();
//   if (body.match_id) {
//     // redirect to /game?game_id=body.match_id&token=...
//   } else {
//     // show “Waiting for players…” with body.pending_id
//   }

const matchmaking = async (request, reply) => {
  return txMutex.runExclusive(async () => {
    const gameType = request.body.game_type
	  const userId = gameType === 'local' ? request.body.player_id : request.user.id;
    let inTransaction = false;
    const playerIndex = request.body.player_index
    const matchPendingId = request.body.pending_id

    try {
      // BEGIN TRANSACTION to serialize concurrent callers
      await new Promise((res, rej) =>
        db.run('BEGIN IMMEDIATE', err => {
          if (err) return rej(err)
            inTransaction = true
            res()
        })
      );

      // Join somebody else's open lobby (exactly 1 other player)
      let joinRow
      if (gameType === 'local' && playerIndex === 1)
        joinRow = null
      else {
        joinRow = await new Promise((res, rej) =>
          db.get(
            `
              SELECT pm.id AS pending_id
                FROM pending_matches pm
                JOIN pending_match_players pmp
                  ON pmp.pending_id = pm.id
              WHERE pm.status = 'open'
                AND pm.game_type = pmp.game_type
                AND pm.game_type = ?
                AND pm.id NOT IN (
                  SELECT pending_id
                    FROM pending_match_players
                    WHERE user_id = ?
                )
              GROUP BY pm.id
              HAVING COUNT(*) = 1
              ORDER BY pm.created_at ASC
              LIMIT 1
            `,
            [gameType, userId],
            (err, row) => err ? rej(err) : res(row)
          )
        );
      }

      if (joinRow) {
        let pendingId = joinRow.pending_id;
        if (gameType === 'local' && playerIndex === 2 && matchPendingId !== -1)
          pendingId = matchPendingId

        // add the second player
        await new Promise((res, rej) =>
          db.run(
            'INSERT INTO pending_match_players (pending_id, user_id, game_type) VALUES (?, ?, ?)',
            [pendingId, userId, gameType],
            err => err ? rej(err) : res()
          )
        );

        // fetch both participants
        const players = await new Promise((res, rej) =>
          db.all(
            'SELECT user_id FROM pending_match_players WHERE pending_id = ?',
            [pendingId],
            (err, rows) => err ? rej(err) : res(rows.map(r => r.user_id)))
        );
        const [p1, p2] = players;

        // create the real match
        const matchId = await new Promise((res, rej) =>
          db.run(
            'INSERT INTO matches (player1_id, player2_id) VALUES (?, ?)',
            [p1, p2],
            function(err) { err ? rej(err) : res(this.lastID) }
          )
        );

        // mark lobby full + attach match_id
        await new Promise((res, rej) =>
          db.run(
            'UPDATE pending_matches SET status = ?, match_id = ? WHERE id = ?',
            ['full', matchId, pendingId],
            err => err ? rej(err) : res()
          )
        );

        // spin up the in-memory game
        if (gameType === 'local')
          game_server.createSingleplayerGame(matchId, p1, p2);
        else
          game_server.createMultiplayerGame(matchId, p1, p2);

        await new Promise((res, rej) =>
          db.run('COMMIT', err => err ? rej(err) : res())
        );
        return reply.send({ match_id: matchId });
      }

      // Did user just get promoted by someone else
      let doneRow
      if (gameType === 'local' && playerIndex === 1)
        doneRow = null
      else {
        doneRow = await new Promise((res, rej) =>
          db.get(
            `
              SELECT pm.match_id
                FROM pending_matches pm
                JOIN pending_match_players pmp
                  ON pmp.pending_id = pm.id
                JOIN matches m
                  ON m.id = pm.match_id
              WHERE pmp.user_id = ?
                AND pm.match_id IS NOT NULL
                AND m.status NOT IN ('finished', 'interrupted')
                AND pm.game_type = pmp.game_type
                AND pm.game_type = ?
              LIMIT 1
            `,
            [userId, gameType],
            (err, row) => err ? rej(err) : res(row)
          )
        );
      }
      if (doneRow) {
        await new Promise((res, rej) =>
          db.run('COMMIT', err => err ? rej(err) : res())
        );
        return reply.send({ match_id: doneRow.match_id });
      }

      // Does user already have an open lobby
      const openRow = await new Promise((res, rej) =>
        db.get(
          `
            SELECT pm.id AS pending_id
              FROM pending_matches pm
              JOIN pending_match_players pmp
                ON pmp.pending_id = pm.id
            WHERE pmp.user_id = ?
              AND pm.status   = 'open'
              AND pm.game_type = pmp.game_type
              AND pm.game_type = ?
            LIMIT 1
          `,
          [userId, gameType],
          (err, row) => err ? rej(err) : res(row)
        )
      );
      if (openRow) {
        await new Promise((res, rej) =>
          db.run('COMMIT', err => err ? rej(err) : res())
        );
        return reply.send({ pending_id: openRow.pending_id });
      }

      // If no lobby create one & auto-join user
      const pendingId = await new Promise((res, rej) =>
        db.run(
          'INSERT INTO pending_matches (creator_id, game_type) VALUES (?, ?)',
          [userId, gameType],
          function(err) { err ? rej(err) : res(this.lastID) }
        )
      );
      await new Promise((res, rej) =>
        db.run(
          'INSERT INTO pending_match_players (pending_id, user_id, game_type) VALUES (?, ?, ?)',
          [pendingId, userId, gameType],
          err => err ? rej(err) : res()
        )
      );

      await new Promise((res, rej) =>
        db.run('COMMIT', err => err ? rej(err) : res())
      );
      return reply.send({ pendingId });
    }
    catch (err) {
      // ROLLBACK on any error
      if (inTransaction) {
        try {
          await new Promise((res, rej) =>
            db.run('ROLLBACK', err => err ? rej(err) : res())
          );
        } catch (rollbackErr) {
          request.log.error(`Rollback failed: ${rollbackErr.message}`);
        }
      }
      request.log.error(`Error in matchmaking: ${err.message}`);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  })
};

module.exports = { matchmaking };
