// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   game_server.js                                     :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: pleander <pleander@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/04 09:40:51 by pleander          #+#    #+#             //
//   Updated: 2025/04/10 00:11:12 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const { Game, Side } = require('./game.js');
const Websocket = require('ws');

//const wss = new Websocket.Server({port: 9000});

const ErrorType = {
	GAME_DOES_NOT_EXIST_ERROR: 0,
	PLAYER_IS_NOT_IN_GAME: 1

};

const MessageType = {
	JOIN: "join",
	CONTROL_INPUT: "input",
	SETTINGS: "settings",
	STATE: "state"
};

class Error {
	constructor(error_type, msg) {
		this.error_type = error_type;
		this.msg = msg;
	}
};

class GameServer {
	constructor() {
		this.games = new Map();
		this.socket_to_game = new Map();
		this.sockets = new Set();
		this.game_id_counter = 0;
	}

	createGame(player_id_1, player_id_2) {
		const id = this.game_id_counter;
		this.game_id_counter += 1;
		this.games.set(id, new Game(player_id_1, player_id_2));
		return id;
	}

	joinGame(player_id, game_id) {
		if (!this.games.has(game_id)) {
			console.error(`Game with id ${game_id} does not exist`);
			return false;
		}
		const player = this.games.get(game_id).getPlayer(player_id);
		if (!player) {
			console.error(`Player with id ${player_id} is not in game ${game_id}`);
			return false;
		}
		player.joined = true;
		return true;
	}

	broadcastStates() {
		if (this.socket_to_game) {
			this.socket_to_game.forEach( (game, socket) => {
				const msg = JSON.stringify({type: MessageType.STATE, payload: game.state});
				if (socket.readyState === WebSocket.OPEN) {
					socket.send(msg);
				}
			});
		}
	}

	refreshGames() {
		this.games.forEach((game, id) => {
			game.refreshGame();
		});
	}

	setupIntervals() {
		setInterval(() => this.refreshGames(), 10);
		setInterval(() => this.broadcastStates(), 1000 / 30); // 30 FPS
	}

	run(wss) {
		this.setupIntervals();
		try {
			wss.on('connection', (ws) => {
				this.sockets.add(ws);
				ws.on('message', (msg) => {
					const {type, payload} = JSON.parse(msg);
					if (type === MessageType.JOIN) {
						if (!this.joinGame(Number(payload.player_id), Number(payload.game_id))) {
							return;
						}
						this.socket_to_game.set(ws, this.games.get(Number(payload.game_id)));
						ws.send(JSON.stringify({type: MessageType.SETTINGS, payload: this.games.get(Number(payload.game_id)).getSettings()}));
						//console.log(`Player with id ${Number(payload.player_id)} joined game ${payload.game_id}`);
					}
					else if (type === MessageType.CONTROL_INPUT) {
						if (!this.socket_to_game.has(ws)) {
							throw new Error(ErrorType.GAME_DOES_NOT_EXIST_ERROR, "The client has not joined any games");
						}
						this.socket_to_game.get(ws).acceptPlayerInput(payload.player_id, payload.input);
					}
				});
			});
		}
		catch (e) {
			console.error(e.msg);
		}
		console.log("Game server started");
	}
};

function startGameServer(port = 9000) {
  if (global.__GAME_SERVER_INSTANCE__) {
    console.log("Game server is already running, not starting a new instance.");
    return global.__GAME_SERVER_INSTANCE__;
  }
  const wss = new Websocket.Server({ port });
  const server = new GameServer();
  server.run(wss);
  global.__GAME_SERVER_INSTANCE__ = server;
  return server;
}

module.exports = { GameServer,  startGameServer };
