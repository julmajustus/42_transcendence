/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game_server.js                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mpellegr <mpellegr@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/16 10:03:53 by pleander          #+#    #+#             */
/*   Updated: 2025/05/27 11:18:43 by mpellegr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const { GameServer, MessageType, Error, ErrorType, SinglePlayerIds, GameType} = require('../game/game_server');
const db = require('../db');
const jwt = require("jsonwebtoken");

const game_server = new GameServer();

// Don't run the server async processes or they break the tests
if (process.env.NODE_ENV !== 'test') {
	game_server.setupIntervals();
}

const runServer = (ws, req) => {
	ws.on('message', (msg) => {
		try {
			const {type, payload} = JSON.parse(msg);
			if (type === MessageType.JOIN_MULTI) {
				console.log(payload);
				const user = jwt.verify(payload.token, process.env.JWT_SECRET);
				game_server.joinGame(Number(user.id), Number(payload.game_id));
				ws.game_id = payload.game_id;
				ws.user_id = user.id;
				ws.game_type = GameType.MULTI_PLAYER;
				game_server.sockets.add(ws);
				ws.send(JSON.stringify({type: MessageType.SETTINGS, payload: game_server.multiplayerGames.get(Number(payload.game_id)).getSettings()}));
				//console.log(`Player with id ${Number(payload.player_id)} joined game ${payload.game_id}`);
			}
			else if (type === MessageType.JOIN_SINGLE) {
				const user = jwt.verify(payload.token, process.env.JWT_SECRET);
				// const game = game_server.singleplayerGames.get(Number(user.id));
				const game = game_server.singleplayerGames.get(Number(payload.game_id));
				game.players[0].joined = true;
				game.players[1].joined = true;
				ws.game_id = payload.game_id;
				ws.user_id = user.id;
				ws.game_type = GameType.SINGLE_PLAYER;
				game_server.sockets.add(ws);
				ws.send(JSON.stringify({type: MessageType.SETTINGS, payload: game.getSettings()})); // MARCO i think this can stay the same
			}

			else if (type === MessageType.CONTROL_INPUT) {
				if (ws.game_type === GameType.MULTI_PLAYER)
				{
					if (!game_server.multiplayerGames.has(Number(ws.game_id))) {
						throw new Error(ErrorType.GAME_DOES_NOT_EXIST, "The game does not exist");
					}
					const game = game_server.multiplayerGames.get(Number(ws.game_id));
					if (!game.getPlayer(ws.user_id).joined) {
						console.warn(`Player with id ${ws.user_id} has not joined the game yet`)
					}
					game.acceptPlayerInput(ws.user_id, payload.input);
				}
				else if (ws.game_type === GameType.SINGLE_PLAYER) {
					// if (!game_server.singleplayerGames.get(Number(ws.user_id))) {
					if (!game_server.singleplayerGames.get(Number(ws.game_id))) {
						throw new Error(ErrorType.GAME_DOES_NOT_EXIST, "The game does not exist");
					}
					// const game = game_server.singleplayerGames.get(Number(ws.user_id));
					const game = game_server.singleplayerGames.get(Number(ws.game_id));
					const player1_id = game.players[0].id;
					const player2_id = game.players[1].id;
					// game.acceptPlayerInput(SinglePlayerIds.PLAYER_1, payload.input_player1);
					// game.acceptPlayerInput(SinglePlayerIds.PLAYER_2, payload.input_player2);
					game.acceptPlayerInput(player1_id, payload.input_player1);
					game.acceptPlayerInput(player2_id, payload.input_player2);
				}
			}
		}
		catch (e) {
			if (typeof e == Error) {
				ws.close(1008, e.msg);
			}
			else {
				ws.close(1008, "Invalid auth");
			}
		}
	});
};

const createNewMultiplayerGame = async (request, reply) => {
	const { player1_id, player2_id } = request.body;
	try {
		const p1_exists = await new Promise((resolve, reject) => {
			db.get('SELECT * FROM users WHERE id = ?', [player1_id], (err, row) => {
				if (err) return (reject(err));
					resolve(row);
			});
		});
		if (!p1_exists) {
			reply.status(400).send({ error: `player1_id ${player1_id} does not exist`});
		}
		const p2_exists = await new Promise((resolve, reject) => {
			db.get('SELECT * FROM users WHERE id = ?', [player2_id], (err, row) => {
				if (err) return (reject(err));
					resolve(row);
			});
		});
		if (!p2_exists) {
			reply.status(400).send({ error: `player2_id ${player2_id} does not exist`});
		}
		const gameId = await new Promise((resolve, reject) => {
			db.run(
				'INSERT INTO matches (player1_id, player2_id) VALUES (?, ?)',
				[player1_id, player2_id],
				function(err) {
					if (err) return (reject(err));
					resolve(this.lastID);
				}
			);
		});
		await game_server.createMultiplayerGame(gameId, player1_id, player2_id);
		reply.status(200).send({
			"id": gameId
		});
	}
	catch (e) {
		request.log.error(e);
		if (e.error_type === ErrorType.BAD_PLAYER_ID || e.error_type === ErrorType.GAME_ID_ALREADY_EXISTS) {
			reply.status(400).send({ error: e.msg });
		}
		else {
			reply.status(500).send({ error: 'Internal Server Error' });
		}
	}
};


const createNewSinglePlayerGame = async (request, reply) => {
	// const { player_id } = request.body;
	const { player1_id, player2_id } = request.body;
	try {
		const p1_exists = await new Promise((resolve, reject) => {
			// db.get('SELECT * FROM users WHERE id = ?', [player_id], (err, row) => {
			db.get('SELECT * FROM users WHERE id = ?', [player1_id], (err, row) => {
				if (err) return (reject(err));
					resolve(row);
			});
		});
		if (!p1_exists) {
			// reply.status(400).send({ error: `player_id ${player_id} does not exist`});
			reply.status(400).send({ error: `player_id ${player1_id} does not exist`});
		}
		const p2_exists = await new Promise((resolve, reject) => {
			db.get('SELECT * FROM users WHERE id = ?', [player2_id], (err, row) => {
				if (err) return (reject(err));
					resolve(row);
			});
		});
		if (!p2_exists) {
			reply.status(400).send({ error: `player2_id ${player2_id} does not exist`});
		}
		// game_server.createSingleplayerGame(player_id);
		const gameId = await new Promise((resolve, reject) => {
			db.run(
				'INSERT INTO matches (player1_id, player2_id) VALUES (?, ?)',
				[player1_id, player2_id],
				function(err) {
					if (err) return (reject(err));
					resolve(this.lastID);
				}
			);
		});
		await game_server.createSingleplayerGame(gameId, player1_id, player2_id);
		// reply.status(200);
		reply.status(200).send({
			"id": gameId
		});
	}
	catch (e) {
		request.log.error(e);
		if (e.error_type === ErrorType.BAD_PLAYER_ID || e.error_type === ErrorType.GAME_ID_ALREADY_EXISTS) {
			reply.status(400).send({ error: e.msg });
		}
		else {
			reply.status(500).send({ error: 'Internal Server Error' });
		}
	}
};

const listGames = (request, reply) => {
	db.all('SELECT * FROM matches', [], (err, rows) => {
		if (err) {
			request.log.error(`Error fetching games: ${err.message}`);
			return reply.status(500).send({error: `Database error: ${err.message}`});
		}
		if (rows.length === 0) {
			request.log.warn('No games in database')
			return reply.status(404).send({error: 'No games found'})
		}
		return reply.status(200).send(rows);
	});
};

const getGame = (request, reply) => {
	const { id } = request.params;
	db.get('SELECT * FROM matches WHERE id = ?', [id], (err, row) => {
		if (err) {
			request.log.error(`Error fetching game: ${err.message}`);
			return reply.status(500).send({error: `Database error: ${err.message}`});
		}
		if (!row) {
			request.log.warn(`Game with id ${id} not found`)
			return reply.status(404).send({error: `Game with id ${id} not found`})
		}
		return reply.status(200).send(row);
	})
};

module.exports = { runServer, createNewMultiplayerGame, createNewSinglePlayerGame, listGames, getGame, game_server }
