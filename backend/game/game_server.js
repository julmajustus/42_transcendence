/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game_server.js                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mpellegr <mpellegr@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/04 09:40:51 by pleander          #+#    #+#             */
/*   Updated: 2025/05/15 17:30:37 by mpellegr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const { Game, GameState } = require('./game.js');
const db = require('../db');

const ErrorType = {
	BAD_PLAYER_ID: 0,
	GAME_ID_ALREADY_EXISTS: 1,
	GAME_DOES_NOT_EXIST: 2,
	PLAYER_NOT_IN_GAME: 3,
	TOO_MANY_SINGLEPLAYER_GAMES: 4,
	UNKNOWN_ARGUMENT: 5,
};

const MessageType = {
	JOIN_MULTI: "join_multi",
	JOIN_SINGLE: "join_single",
	CONTROL_INPUT: "input",
	SETTINGS: "settings",
	STATE: "state",
};

const GameType = {
	SINGLE_PLAYER: 1,
	MULTI_PLAYER: 2
};

const SinglePlayerIds = {
	PLAYER_1: -1,
	PLAYER_2: -2
};

class Error {
	constructor(error_type, msg) {
		this.error_type = error_type;
		this.msg = msg;
	}
};

const getUserById = async (userId) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT username FROM users WHERE id = ?',
      [userId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
};

class GameServer {
	constructor() {
		this.multiplayerGames = new Map();
		this.singleplayerGames = new Map();
		this.sockets = new Set();
		this.intervals = [];
		if (process.env.NODE_ENV != 'test') {
			this.loadUnfinishedGamesFromDB();
		}
	}

	async createMultiplayerGame(game_id, player1_id, player2_id) {
		if (player1_id === player2_id) {
			throw new Error(ErrorType.BAD_PLAYER_ID, "Error: bad player id")
		}
		if (this.multiplayerGames.has(game_id)) {
			throw new Error(ErrorType.GAME_ID_ALREADY_EXISTS, `Error: game id ${game_id} already exists`);
		}
		const [user1, user2] = await Promise.all([
			getUserById(player1_id),
			getUserById(player2_id),
		]);
		const game = new Game(player1_id, user1.username, player2_id, user2.username);
		game.type = GameType.MULTI_PLAYER;
		this.multiplayerGames.set(game_id, game);
	}

	// createSingleplayerGame(player_id) {
	async createSingleplayerGame(game_id, player1_id, player2_id) { //for local game if user refresh the page before finishing or starting the game also not started/not finished games are stored...should not be a problem for local games
		// if (this.singleplayerGames.has(player_id)) {
/* 		if (this.singleplayerGames.has(game_id)) { don't think it is needed for local game
			throw new Error(ErrorType.TOO_MANY_SINGLEPLAYER_GAMES, "Error: player can only run one singleplayer game at a time");
		} */
		if (player1_id === player2_id) {
			throw new Error(ErrorType.BAD_PLAYER_ID, "Error: bad player id")
		}
		const [user1, user2] = await Promise.all([
			getUserById(player1_id),
			getUserById(player2_id),
		]);
		// const game = new Game(SinglePlayerIds.PLAYER_1, SinglePlayerIds.PLAYER_2);
		const game = new Game(player1_id, user1.username, player2_id, user2.username);
		game.type = GameType.SINGLE_PLAYER;
		// this.singleplayerGames.set(player_id, game);
		this.singleplayerGames.set(game_id, game);
	}

	joinGame(player_id, game_id) {
		if (!this.multiplayerGames.has(game_id)) {
			throw new Error(ErrorType.GAME_DOES_NOT_EXIST,`Error: game with id ${game_id} does not exist` )
		}
		const player = this.multiplayerGames.get(game_id).getPlayer(player_id);
		if (!player) {
			throw new Error(ErrorType.PLAYER_NOT_IN_GAME, `Error: player with id ${player_id} is not in game ${game_id}`);
		}
		player.joined = true;
	}

	broadcastStates() {
		if (this.sockets) {
			this.sockets.forEach( (sock) => {
				let game;
				if (sock.game_type === GameType.MULTI_PLAYER) {
					if (!this.multiplayerGames.has(Number(sock.game_id))) {
						console.warn("Game id does not exist");
					}
					game = this.multiplayerGames.get(Number(sock.game_id));
				}
				else if (sock.game_type === GameType.SINGLE_PLAYER) {
					// game = this.singleplayerGames.get(sock.user_id);
					game = this.singleplayerGames.get(sock.game_id);

				}
				else {
					throw new Error(ErrorType.UNKNOWN_ARGUMENT, `Game type ${sock.game_type} does not exist`);
				}
				const msg = JSON.stringify({type: MessageType.STATE, payload: game.state});
				if (sock.readyState === WebSocket.OPEN) {
					sock.send(msg);
				}
			});

		}
	}

	refreshGames() {
		this.multiplayerGames.forEach((game, game_id) => {
			game.refreshGame();
			if (game.gameState === GameState.FINSIHED) {
				this.finishGame(game, game_id);
			}
		});
		// this.singleplayerGames.forEach((game, player_id) => {
		this.singleplayerGames.forEach((game, game_id) => {
			game.refreshGame();
			// Single player game ending here.. yeah not pretty
			if (game.gameState === GameState.FINSIHED) {
				new Promise((resolve, reject) => { //last point was not stored indatabase
					db.run('UPDATE matches SET winner_id = ?, loser_id = ?, \
							status = ?, player1_score = ?, player2_score = ?, \
							finished_rounds = ? WHERE id = ?', 
					[
						game.winner.id,
						game.loser.id,
						game.gameState,
						game.players[0].score,
						game.players[1].score,
						game.finished_rounds,
						game_id
					],
						(err, game) => {
							if (err)
								return reject(err);
							resolve(game);
						});
				});
				const msg = JSON.stringify({type: MessageType.STATE, payload: game.state});
				this.sockets.forEach((socket) => {
					// if (socket.user_id === player_id) {
					if (socket.game_id == game_id) {
						socket.send(msg);
						socket.close(1000, "Game has finished");
						this.sockets.delete(socket);
					}
				});
				// this.singleplayerGames.delete(player_id);
				this.singleplayerGames.delete(game_id)
				
				// const msg = JSON.stringify({type: MessageType.STATE, payload: game.state});
				// this.sockets.forEach( (sock) => {
				// 	if (sock.game_id == game_id) {
				// 		sock.send(msg);
				// 		sock.close(1000, "Game has finished");
				// 		this.sockets.delete(sock);
				// 	}
				// });
				// this.singleplayerGames.delete(game_id); // Stop actively refreshing finished games
			}
		});
	}

	finishGame(game, id) {
		new Promise((resolve, reject) => { //last point was not stored in database
			db.run('UPDATE matches SET winner_id = ?, loser_id = ?, \
					status = ?, player1_score = ?, player2_score = ?, \
					finished_rounds = ? WHERE id = ?', 
			[
				game.winner.id,
				game.loser.id,
				game.gameState,
				game.players[0].score,
				game.players[1].score,
				game.finished_rounds,
				id
			],
				(err, game) => {
					if (err)
						return reject(err);
					resolve(game);
				});
		});
		const msg = JSON.stringify({type: MessageType.STATE, payload: game.state});
		this.sockets.forEach( (sock) => {
			if (sock.game_id == id) {
				sock.send(msg);
				sock.close(1000, "Game has finished");
				this.sockets.delete(sock);
			}
		});
		this.multiplayerGames.delete(id); // Stop actively refreshing finished games
	}

	/** Updates game information in the database */
	async updateDatabase() {
		this.multiplayerGames.forEach( (value, key) => {
			new Promise ((resolve, reject) => {
				db.run(`UPDATE matches SET status = ?, finished_rounds = ?, player1_score = ?, player2_score = ? WHERE id = ?`, 
					[
						value.gameState,
						value.finished_rounds, 
						value.players[0].score,
						value.players[1].score,
						key
					], 
					(err, game) => {
					if (err)
						return reject(err);
					resolve(game);
				});
			});
		});
		this.singleplayerGames.forEach( (value, key) => {
			new Promise ((resolve, reject) => {
				db.run(`UPDATE matches SET status = ?, finished_rounds = ?, player1_score = ?, player2_score = ? WHERE id = ?`, 
					[
						value.gameState,
						value.finished_rounds, 
						value.players[0].score,
						value.players[1].score,
						key
					], 
					(err, game) => {
					if (err)
						return reject(err);
					resolve(game);
				});
			});
		});
	}

	async loadUnfinishedGamesFromDB() {
		const rows = await new Promise((resolve, reject) => {
			db.all('SELECT * FROM matches WHERE status IN (?, ?, ?)', [GameState.ACTIVE, GameState.NOT_STARTED, GameState.RESETTING],
			(err, rows) => {
				if (err) {
					return (reject(err));
				}
				resolve(rows);
			});
		});

		if (this.multiplayerGames.has(rows.id)) {
			throw new Error(ErrorType.GAME_ID_ALREADY_EXISTS, `Error: game id ${game_id} already exists`);
		}
		rows.forEach((row) => {
			this.multiplayerGames.set(row.id, new Game(row.player1_id, row.player2_id));
			const game = this.multiplayerGames.get(row.id);
			game.players[0].score = row.player1_score;
			game.players[1].score = row.player2_score;
			game.gameState = row.status;
			game.finished_rounds = row.finished_rounds;
		});
	}

	setupIntervals() {
		this.intervals.push(
			setInterval(() => this.refreshGames(), 10)
		);
		this.intervals.push(
			setInterval(() => this.broadcastStates(), 1000 / 30)
		); // 30 FPS
		this.intervals.push(
			setInterval(() => this.updateDatabase(), 1000)
		);
	}

	clearIntervals() {
		for (const id of this.intervals) {
			clearInterval(id);
		}
		this.intervals = [];
	}

	stop() {
		this.clearIntervals();
	}
}

module.exports = { GameServer, MessageType, Error, ErrorType, SinglePlayerIds, GameType };
