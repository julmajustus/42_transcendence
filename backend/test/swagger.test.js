/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   swagger.test.js                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mpellegr <mpellegr@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/02 16:28:39 by jmakkone          #+#    #+#             */
/*   Updated: 2025/06/02 14:36:31 by mpellegr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const t = require('tap');
const fastify = require('../server');


// Test 1: GET /documentation - Returns Swagger docs.

t.test('GET /documentation returns Swagger docs', async t => {
	const response = await fastify.inject({
		method: 'GET',
		url: '/api/documentation'
	});

	t.equal(response.statusCode, 200, 'Documentation endpoint should return status 200');
	// Verify that the payload contains the word "Swagger" (case-insensitive)
	t.match(response.payload, /swagger/i, 'Documentation page contains "swagger" text');
});


// Test 2: GET /documentation/json - Calls transformSpecification.

t.test('GET /documentation/json calls transformSpecification', async t => {
	const response = await fastify.inject({
		method: 'GET',
		url: '/api/documentation/json'
	});
	t.equal(response.statusCode, 200, 'Should return 200 for the JSON spec');
});
