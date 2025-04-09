const { createNewGame, listGames, getGame} = require('../handlers/game_server')

const errorResponse = {
	type: 'object',
	properties: {
		error: { type: 'string' },
	}
}

const GameListElement = {
	type: 'object',
	properties: {
		game_id: {type: 'integer'},
		player1_id: {type: 'integer'},
		player2_id: {type: 'integer'}
	}
}

const Game = {
	schema: {
		body: {
			type: 'object',
			properties: {
				game_id: {type: 'integer'},
				finished_rounds: {type: 'integer'},
				total_rounds: {type: 'integer'},
				winner:	{type: 'integer'},
				player1_id: {type: 'integer'},
				player2_id: {type: 'integer'},
				game_state: {type: 'string'},
			}
		}
	}
}

const createGameSchema = {
	schema: {
		body: {
			type: 'object',
			properties: {
				player1_id: {type: 'integer'},
				player2_id: {type: 'integer'}
			},
			required: ['player1_id', 'player2_id'],
		},
		response: {
			200: {
				type: 'object',
				properties: {
					game_id: {type: 'integer'}
				}
			},
			400: errorResponse,
			500: errorResponse,
		},
	},
	handler: createNewGame
}

const listGamesSchema = {
	schema: {
		response: {
			200: {
				type: 'array',
				items: GameListElement
			},
			400: errorResponse,
			500: errorResponse,
		},
	},
	handler: listGames
}

const getGameSchema = {
	schema: {
		response: {
			200: {
				type: 'object',
				items: Game
			},
			404: errorResponse,
			500: errorResponse,
		},
	},
	handler: getGame
}

function gameRoutes(fastify, options, done) {
	

	fastify.post('/game/new', createGameSchema);

	fastify.get('/game/list', listGamesSchema);
	
	fastify.get('/game/list/:id', getGameSchema);

	done();
}

module.exports = gameRoutes;
