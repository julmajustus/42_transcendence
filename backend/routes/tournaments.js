const auth = require('./auth')
const db   = require('../db')

const {
	tournament,
	listTournaments,
	getBracket,
	reportMatchResult,
	infoTournament,
} = require('../handlers/tournaments')

const errorResponse = {
	type: 'object',
	properties: {
		error: { type: 'string' }
	}
}

const successResponse = {
	type: 'object',
	properties: {
		message: { type: 'string' }
	}
}

const Tournament = {
	type: 'object',
	properties: {
		id:          { type: 'integer' },
		name:        { type: 'string'  },
		owner_id:    { type: 'integer' },
		status:      { type: 'string'  },
		created_at:  { type: 'string'  },
		started_at:  { type: 'string'  },
		finished_at: { type: 'string'  },
		winner_id:   { type: 'integer', nullable: true },
	}
}

const TournamentMatch = {
	type: 'object',
	properties: {
		tm_id:         { type: 'integer' },
		game_id:       { type: 'integer', nullable: true },
		round:         { type: 'integer' },
		tm_status:     { type: 'string'  },
		player1_id:    { type: 'integer', nullable: true },
		player1_username: { type: 'string',  nullable: true },
		player2_id:    { type: 'integer', nullable: true },
		player2_username: { type: 'string',  nullable: true },
		player1_score: { type: 'integer', nullable: true },
		player2_score: { type: 'integer', nullable: true },
		winner_id:     { type: 'integer', nullable: true },
	}
}

const TournamentPlayers = {
	type: 'object',
	properties: {
		id:            { type: 'integer' },
		tournament_id: { type: 'integer' },
		user_id:       { type: 'integer' },
	}
}

// shape returned by POST /tournament/auto
const TournamentResponse = {
	type: 'object',
	properties: {
		tournament_id: { type: 'integer' },
		player_count:  { type: 'integer' },
		players: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id:       { type: 'integer' },
					username: { type: 'string'  },
				}
			}
		},
		started: { type: 'boolean' },
		bracket: {
			anyOf: [
				{ type: 'null' },
				{
					type: 'array',
					items: {
						type: 'object',
						properties: {
							tm_id:             { type: 'integer' },
							game_id:           { type: 'integer', nullable: true },
							tm_status:         { type: 'string'  },
							player1_id:        { type: 'integer', nullable: true },
							player1_username:  { type: 'string',  nullable: true },
							player2_id:        { type: 'integer', nullable: true },
							player2_username:  { type: 'string',  nullable: true },
						}
					}
				}
			]
		},
		user_id: { type: 'integer' }
	}
}

function tournamentRoutes(fastify, options, done) {

	// List all tournaments
	const listTournamentsSchema = {
		onRequest: [ fastify.authenticate ],
		schema: {
			response: {
				200: { type: 'array', items: Tournament },
				500: errorResponse,
			}
		},
		handler: listTournaments,
	}

	// Auto‐join or create lobby, await 4 players, then start & return lobby+bracket
	const tournamentSchema = {
		onRequest: [ fastify.authenticate ],
		schema: {
			body: {
				type: 'object',
				properties: {
					player_id: { type: 'integer' },
					game_type: { type: 'string' },
					player_index: { type: 'integer' },
					tournament_id: { type: 'integer' }
				},
				required: ['player_id', 'game_type'],
			},
			response: {
				200: TournamentResponse,
				500: errorResponse,
			}
		},
		handler: tournament,
	}

	// Fetch full bracket for any round
	const getBracketSchema = {
		onRequest: [ fastify.authenticate ],
		schema: {
			params: {
				type: 'object',
				properties: { id: { type: 'integer' } },
				required: ['id'],
			},
			response: {
				200: {
					type: 'object',
					properties: {
						tournament: Tournament,
						matches:    { type: 'array', items: TournamentMatch },
					}
				},
				404: errorResponse,
				500: errorResponse,
			}
		},
		handler: getBracket,
	}

	// Report result of one tournament match and advance bracket
	const reportMatchResultSchema = {
		onRequest: [ fastify.authenticate ],
		schema: {
			params: {
				type: 'object',
				properties: {
					id:    { type: 'integer' },
					tm_id: { type: 'integer' }
				},
				required: ['id','tm_id']
			},
			body: {
				type: 'object',
				properties: {
					winner_slot: { type: 'integer', enum: [1,2] },
					game_type: { type: 'string' },
				},
				required: ['winner_slot', 'game_type']
			},
			response: {
				200: successResponse,
				400: errorResponse,
				404: errorResponse,
				500: errorResponse,
			}
		},
		handler: reportMatchResult,
	}

	// List players in a tournament
	const infoTournamentsSchema = {
		onRequest: [ fastify.authenticate ],
		schema: {
			params: {
				type: 'object',
				properties: { id: { type: 'integer' } },
				required: ['id'],
			},
			response: {
				200: { type: 'array', items: TournamentPlayers },
				400: errorResponse,
				500: errorResponse,
			}
		},
		handler: infoTournament,
	}

	fastify.get(  '/tournament/list',               listTournamentsSchema )
	fastify.post( '/tournament/auto',               tournamentSchema )
	fastify.get(  '/tournament/:id/info',           infoTournamentsSchema )
	fastify.get(  '/tournament/:id/bracket',        getBracketSchema )
	fastify.post( '/tournament/:id/match/:tm_id/result', reportMatchResultSchema )

	done()
}

module.exports = tournamentRoutes
