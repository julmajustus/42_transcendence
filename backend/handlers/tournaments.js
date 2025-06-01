const db = require('../db');
const { game_server } = require('./game_server');

const startTournament = async (tournamentId, gameType) => {
	await new Promise((resolve, reject) => {
		db.serialize(async () => {
			db.run('BEGIN TRANSACTION');

			try {
				const tourStatus = await new Promise((res, rej) => {
					db.get(
						'SELECT status FROM tournaments WHERE id = ?',
						[tournamentId],
						(err, row) => (err ? rej(err) : res(row.status))
					);
				});

				if (tourStatus !== 'pending') {
					db.run('ROLLBACK');
					return resolve();
				}

				const players = await new Promise((res, rej) => {
					db.all(
						'SELECT id, user_id FROM tournament_players WHERE tournament_id = ?',
						[tournamentId],
						(err, rows) => (err ? rej(err) : res(rows))
					);
				});

				const shuffled = players.slice().sort(() => Math.random() - 0.5);
				for (let i = 0; i < shuffled.length; i += 2) {
					const p1 = shuffled[i], p2 = shuffled[i + 1];
					const matchId = await new Promise((res, rej) => {
						db.run(
							'INSERT INTO matches (player1_id, player2_id) VALUES (?, ?)',
							[p1.user_id, p2.user_id],
							function(err) { err ? rej(err) : res(this.lastID); }
						);
					});

					await new Promise((res, rej) => {
						db.run(
							`INSERT INTO tournament_matches
			  (tournament_id, player1_slot, player2_slot, round, match_id, status)
			  VALUES (?, ?, ?, 1, ?, 'scheduled')`,
							[tournamentId, p1.id, p2.id, matchId],
							err => err ? rej(err) : res()
						);
					});
					if (gameType === 'local')
						game_server.createSingleplayerGame(matchId, p1.user_id, p2.user_id);
					else
						game_server.createMultiplayerGame(matchId, p1.user_id, p2.user_id);
				}

				const rounds = Math.log2(shuffled.length);
				let prevCount = shuffled.length / 2;
				for (let r = 2; r <= rounds; r++) {
					for (let i = 0; i < prevCount / 2; i++) {
						await new Promise((res, rej) => {
							db.run(
								`INSERT INTO tournament_matches (tournament_id, round, status)
				 VALUES (?, ?, 'not_scheduled')`,
								[tournamentId, r],
								err => err ? rej(err) : res()
							);
						});
					}
					prevCount /= 2;
				}

				const all = await new Promise((res, rej) => {
					db.all(
						'SELECT id, round FROM tournament_matches WHERE tournament_id = ? ORDER BY round, id',
						[tournamentId],
						(err, rows) => (err ? rej(err) : res(rows))
					);
				});

				const byRound = all.reduce((acc, m) => {
					(acc[m.round] ||= []).push(m.id);
					return acc;
				}, {});

				for (let r = 1; r < rounds; r++) {
					const curr = byRound[r], next = byRound[r + 1];
					for (let i = 0; i < next.length; i++) {
						const [m1, m2] = curr.slice(i * 2, i * 2 + 2);
						for (const mid of [m1, m2]) {
							await new Promise((res, rej) => {
								db.run(
									'UPDATE tournament_matches SET next_match_slot = ? WHERE id = ?',
									[next[i], mid],
									err => err ? rej(err) : res()
								);
							});
						}
					}
				}

				await new Promise((res, rej) => {
					db.run(
						`UPDATE tournaments SET status = 'active', started_at = CURRENT_TIMESTAMP WHERE id = ?`,
						[tournamentId],
						err => err ? rej(err) : res()
					);
				});

				db.run('COMMIT');
				resolve();

			} catch (err) {
				db.run('ROLLBACK');
				reject(err);
			}
		});
	});
};

// Combine the logic of creating, joining and starting the tournament under one endpoint
//
const tournament = async (request, reply) => {
	const gameType = request.body.game_type
	const userId = gameType === 'local' ? request.body.player_id : request.user.id;

	try {
		// Check does the user already belong to a pending/active tournament
		const existing = await new Promise((res, rej) => {
			db.get(
				`SELECT t.id, t.status
		   FROM tournaments t
		   JOIN tournament_players tp
			 ON tp.tournament_id = t.id
		  WHERE tp.user_id = ?
			AND t.status IN ('pending','active')
		  ORDER BY t.created_at DESC
		  LIMIT 1`,
				[userId],
				(err, row) => (err ? rej(err) : res(row))
			);
		});

		let tournamentId, tourStatus;
		if (existing) {
			// reuse whatever tournament we’re already in (pending or active)
			tournamentId = existing.id;
			tourStatus   = existing.status;
		} else {
			// Otherwise, find any other pending tournament with < 4 players
			const row = await new Promise((res, rej) => {
				db.get(
					`SELECT t.id, COUNT(tp.user_id) AS cnt
			 FROM tournaments t
		LEFT JOIN tournament_players tp
			   ON tp.tournament_id = t.id
			WHERE t.status = 'pending'
			GROUP BY t.id
		   HAVING cnt < 4
		   ORDER BY t.created_at
		   LIMIT 1`,
					[],
					(err, r) => (err ? rej(err) : res(r))
				);
			});

			if (row) {
				tournamentId = row.id;
				tourStatus   = 'pending';
			} else {
				// If no lobby to join, create a fresh one
				tournamentId = await new Promise((res, rej) => {
					db.run(
						`INSERT INTO tournaments (name, owner_id)
			   VALUES (?, ?)`,
						['Quick Tournament', userId],
						function (err) { err ? rej(err) : res(this.lastID); }
					);
				});
				tourStatus = 'pending';
			}
		}

		// Auto-join the lobby if it’s still pending
		if (tourStatus === 'pending') {
			const already = await new Promise((res, rej) => {
				db.get(
					`SELECT 1
			 FROM tournament_players
			WHERE tournament_id = ? AND user_id = ?`,
					[tournamentId, userId],
					(err, r) => (err ? rej(err) : res(!!r))
				);
			});
			if (!already) {
				await new Promise((res, rej) => {
					db.run(
						`INSERT OR IGNORE INTO tournament_players (tournament_id, user_id)
	   VALUES (?, ?)`,
						[tournamentId, userId],
						err => (err ? rej(err) : res())
					);
				});
			}
		}

		// Count how many players are now in
		const { count } = await new Promise((res, rej) => {
			db.get(
				`SELECT COUNT(*) AS count
		   FROM tournament_players
		  WHERE tournament_id = ?`,
				[tournamentId],
				(err, r) => (err ? rej(err) : res(r))
			);
		});

		// If we just hit 4 *and* it was still pending, start it
		if (tourStatus === 'pending' && count >= 4) {
			try {
				await startTournament(tournamentId, gameType);
				tourStatus = 'active';
			} catch (err) {
				if (err.message.includes('SQLITE_CONSTRAINT')) {
					request.log.warn('Tournament already started by concurrent request');
					tourStatus = 'active'; // Already active
				} else throw err;
			}
		}

		// Fetch the current lobby players
		const players = await new Promise((res, rej) => {
			db.all(
				`SELECT u.id, u.username
		   FROM tournament_players tp
		   JOIN users u ON u.id = tp.user_id
		  WHERE tp.tournament_id = ?`,
				[tournamentId],
				(err, rows) => (err ? rej(err) : res(rows))
			);
		});

		// If active, fetch just Round 1 bracket with usernames
		let bracket = null;
		if (tourStatus !== 'pending') {
			bracket = await new Promise((res, rej) => {
				db.all(
					`
		  SELECT
			tm.id           AS tm_id,
			tm.match_id     AS game_id,
			tm.status       AS tm_status,
			p1.user_id      AS player1_id,
			u1.username     AS player1_username,
			p2.user_id      AS player2_id,
			u2.username     AS player2_username
		  FROM tournament_matches tm
		  LEFT JOIN tournament_players p1
			ON p1.id = tm.player1_slot
		  LEFT JOIN users u1
			ON u1.id = p1.user_id
		  LEFT JOIN tournament_players p2
			ON p2.id = tm.player2_slot
		  LEFT JOIN users u2
			ON u2.id = p2.user_id
		  WHERE tm.tournament_id = ? AND tm.round = 1
		  ORDER BY tm.id
		  `,
					[tournamentId],
					(err, rows) => (err ? rej(err) : res(rows))
				);
			});
		}

		// Return everything our front-end needs
		return reply.send({
			tournament_id: tournamentId,
			player_count:  count,
			players,
			bracket,
			started: tourStatus !== 'pending',
			user_id: userId
		});
	}
	catch (err) {
		request.log.error(`autoTournament error: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

// List all tournaments.
// 
// URL: GET /tournament/list
// Response: [ { id, name, owner_id, status, created_at, … } ]
// 
// Front-end usage:
//  • On the tournament overview page, fetch this list.
//  • Render “Join” buttons for pending ones; “View bracket” for active/completed.

const listTournaments = async (request, reply) => {
	try {
		const tours = await new Promise((resolve, reject) => {
			db.all('SELECT id, name, owner_id, status, created_at, started_at, finished_at, winner_id FROM tournaments', [], (err, rows) => {
				if (err) return reject(err);
				resolve(rows);
			});
		});
		return reply.send(tours);
	} catch (err) {
		request.log.error(`Error listing tournaments: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
};

const infoTournament = async (request, reply) => {
	const tournamentId = Number(request.params.id);
	try {
		const users = await new Promise((resolve, reject) => {
			db.all('SELECT id, tournament_id, user_id, seed FROM tournament_players WHERE tournament_id = ?', [tournamentId], (err, rows) => {
				if (err) return reject(err);
				resolve(rows);
			});
		});
		if (!users) {
			request.log.info('no users in tournament')
			return reply.status(400).send({ error: "no user found in tournament"})
		}
		return reply.send(users);
	} catch (err) {
		request.log.error(`Error listing tournaments: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
};

// Fetch the full bracket for a tournament.
// 
// URL: GET /tournament/:id/bracket
// Response: {
//   tournament: { id,name,status,winner_id },
//   matches: [ { tm_id, game_id, round, tm_status, player1_id, player2_id, … } ]
// }
// 
// Front-end usage:
//  • After starting (or for any active/completed), fetch this once.
//  • Draw a bracket UI grouped by `round`.
//  • For any `scheduled` match, show a “Play game” button that opens
//    /game.html?game_id={game_id}&token={JWT}.

// Fetch the full bracket for a tournament.
//
// URL: GET /tournament/:id/bracket
// Response: {
//   tournament: { id,name,status,winner_id },
//   matches: [ { tm_id, game_id, round, tm_status,
//               player1_id, player1_username,
//               player2_id, player2_username,
//               player1_score, player2_score, winner_id } ]
// }
const getBracket = async (request, reply) => {
	const tournamentId = Number(request.params.id)

	try {
		const tour = await new Promise((resolve, reject) => {
			db.get(
				'SELECT id, name, status, winner_id FROM tournaments WHERE id = ?',
				[tournamentId],
				(err, row) => (err ? reject(err) : resolve(row))
			)
		})
		if (!tour)
			return reply.status(404).send({ error: 'Tournament not found' })

		const matches = await new Promise((resolve, reject) => {
			db.all(
				`
		SELECT
		  tm.id           AS tm_id,
		  tm.match_id     AS game_id,
		  tm.round,
		  tm.status       AS tm_status,

		  p1.user_id      AS player1_id,
		  u1.username     AS player1_username,

		  p2.user_id      AS player2_id,
		  u2.username     AS player2_username,

		  m.player1_score,
		  m.player2_score,
		  m.winner_id
		FROM tournament_matches tm
		LEFT JOIN matches             m  ON m.id  = tm.match_id
		LEFT JOIN tournament_players  p1 ON p1.id = tm.player1_slot
		LEFT JOIN users              u1 ON u1.id = p1.user_id
		LEFT JOIN tournament_players  p2 ON p2.id = tm.player2_slot
		LEFT JOIN users              u2 ON u2.id = p2.user_id
		WHERE tm.tournament_id = ?
		ORDER BY tm.round, tm.id
		`,
				[tournamentId],
				(err, rows) => (err ? reject(err) : resolve(rows))
			)
		})

		for (const matchRow of matches) {
			const realMatch = await new Promise((resolve, reject) => {
				db.get(`SELECT * FROM matches WHERE id = ?`,
					[matchRow.game_id],
					(err, rowFromMatches) => {
						if (err) return reject(err);
						resolve(rowFromMatches);
					}
				)
			})
			if (matchRow.tm_status !== 'finished' && realMatch && realMatch.status === 'finished') {
				await new Promise((resolve, reject) => {
					db.run(`UPDATE tournaments SET status = ? WHERE id = ?`,
						['interrupted', tournamentId],
						function (err) {
							if (err) return reject(err);
							resolve();
						}
					);
				})
				tour.status = 'interrupted'
			}
		}

		return reply.send({ tournament: tour, matches })
	} catch (err) {
		request.log.error(`Error fetching bracket: ${err.message}`)
		return reply.status(500).send({ error: 'Internal server error' })
	}
}


// Report the result of one tournament match, and advance the bracket.
// 
// URL: POST /tournament/:id/match/:tm_id/result
// Body: { winner_slot: 1 | 2 }
// Response: { message: 'Result recorded' }
// 
// Front-end usage:
//  • After a real-time game finishes, front-end POSTs this with the slot
//    number that won.
//  • On success, client should re-fetch /tournament/:id/bracket to get
//    updated `scheduled` or `finished` statuses.

const reportMatchResult = async (request, reply) => {
	const tournamentId = Number(request.params.id);
	const tmId = Number(request.params.tm_id);
	const { winner_slot } = request.body; // 1 or 2
	const gameType = request.body.game_type
	try {
		// Mark this tournament match as finished
		const { changes } = await new Promise((resolve, reject) => {
			db.run(
				`UPDATE tournament_matches
				   SET status = ?, winner_slot = ?
					WHERE id = ? AND tournament_id = ? AND status != ?`,
				['finished', winner_slot, tmId, tournamentId, 'finished'],
				function (err) {
					if (err) return reject(err);
					// this.changes = # of rows updated
					resolve({ changes: this.changes });
				}
			);
		});
		if (changes === 0) {
			// someone else already reported—nothing to do
			return reply.send({ message: 'Result already recorded' });
		}
		// Fetch details of this match
		const tm = await new Promise((resolve, reject) => {
			db.get(
				'SELECT player1_slot, player2_slot, next_match_slot FROM tournament_matches WHERE id = ?',
				[tmId],
				(err, row) => (err ? reject(err) : resolve(row))
			);
		});
		const winnerPlayerSlot = winner_slot === 1 ? tm.player1_slot : tm.player2_slot;
		if (tm.next_match_slot) {
			// Advance to next slot
			const nextId = tm.next_match_slot;
			// Determine available side
			const nextTm = await new Promise((resolve, reject) => {
				db.get(
					'SELECT player1_slot, player2_slot FROM tournament_matches WHERE id = ?',
					[nextId],
					(err, row) => (err ? reject(err) : resolve(row))
				);
			});
			const slotField = nextTm.player1_slot ? 'player2_slot' : 'player1_slot';
			// Update slot
			await new Promise((resolve, reject) => {
				db.run(
					`UPDATE tournament_matches SET ${slotField} = ? WHERE id = ?`,
					[winnerPlayerSlot, nextId],
					function (err) {
						if (err) return reject(err);
						resolve();
					}
				);
			});
			// Check if both slots filled -> schedule match
			const updatedNextTm = await new Promise((resolve, reject) => {
				db.get(
					'SELECT player1_slot, player2_slot FROM tournament_matches WHERE id = ?',
					[nextId],
					(err, row) => (err ? reject(err) : resolve(row))
				);
			});
			if (updatedNextTm.player1_slot && updatedNextTm.player2_slot) {
				// Fetch actual user IDs
				const p1 = await new Promise((resolve, reject) => {
					db.get('SELECT user_id FROM tournament_players WHERE id = ?', [updatedNextTm.player1_slot], (err, row) => (err ? reject(err) : resolve(row.user_id)));
				});
				const p2 = await new Promise((resolve, reject) => {
					db.get('SELECT user_id FROM tournament_players WHERE id = ?', [updatedNextTm.player2_slot], (err, row) => (err ? reject(err) : resolve(row.user_id)));
				});
				const newMatchId = await new Promise((resolve, reject) => {
					db.run(
						'INSERT INTO matches (player1_id, player2_id) VALUES (?, ?)',
						[p1, p2],
						function (err) {
							if (err) return reject(err);
							resolve(this.lastID);
						}
					);
				});
				await new Promise((resolve, reject) => {
					db.run(
						'UPDATE tournament_matches SET match_id = ?, status = ? WHERE id = ?',
						[newMatchId, 'scheduled', nextId],
						function (err) {
							if (err) return reject(err);
							resolve();
						}
					);
				});
				if (gameType === 'local')
					game_server.createSingleplayerGame(newMatchId, p1, p2);
				else
					game_server.createMultiplayerGame(newMatchId, p1, p2);
			}
		} else {
			// Final match -> complete tournament
			// Get user ID of winner
			const winnerUserId = await new Promise((resolve, reject) => {
				db.get(
					'SELECT user_id FROM tournament_players WHERE id = ?',
					[winnerPlayerSlot],
					(err, row) => (err ? reject(err) : resolve(row.user_id))
				);
			});
			await new Promise((resolve, reject) => {
				db.run(
					"UPDATE tournaments SET status = 'completed', finished_at = CURRENT_TIMESTAMP, winner_id = ? WHERE id = ?",
					[winnerUserId, tournamentId],
					function (err) {
						if (err) return reject(err);
						resolve();
					}
				);
			});
		}
		return reply.send({ message: 'Result recorded' });
	} catch (err) {
		request.log.error(`Error reporting match result: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
};

module.exports = {
	tournament,
	listTournaments,
	getBracket,
	reportMatchResult,
	infoTournament,
};
