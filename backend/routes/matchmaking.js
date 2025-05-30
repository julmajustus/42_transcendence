/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   matchmaking.js                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mpellegr <mpellegr@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/23 14:47:13 by jmakkone          #+#    #+#             */
/*   Updated: 2025/05/29 22:31:41 by mpellegr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */


const auth = require('../routes/auth');
const { matchmaking } = require('../handlers/matchmaking');

const errorResponse = {
  type: 'object',
  properties: { error: { type: 'string' } }
};

const AutoResponse = {
  type: 'object',
  properties: {
    pending_id: { type: 'integer', nullable: true },
    match_id:   { type: 'integer', nullable: true }
  }
};

function matchmakingRoutes(fastify, options, done) {
  const matchmakingSchema = {
    onRequest: [ fastify.authenticate ],
    schema: {
      body: {
				type: 'object',
				properties: {
					player_id: { type: 'integer' },
					game_type: { type: 'string' },
				},
				required: ['player_id', 'game_type'],
			},
      response: {
        200: AutoResponse,
        400: errorResponse,
        409: errorResponse,
        500: errorResponse
      }
    },
    handler: matchmaking
  };

  fastify.post('/matchmaking', matchmakingSchema);

  done();
}

module.exports = matchmakingRoutes;
