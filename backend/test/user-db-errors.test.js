/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   user-db-errors.test.js                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mpellegr <mpellegr@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/03 01:29:31 by jmakkone          #+#    #+#             */
/*   Updated: 2025/05/26 15:28:43 by mpellegr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const t = require('tap');
const bcrypt = require('bcryptjs');

// Test 1: Create a mock DB object that always fails.
const dbMock = {
	get: (sql, params, cb) => {
		cb(new Error('Simulated DB error'), null);
	},
	run: (sql, params, cb) => {
		cb(new Error('Simulated DB error'));
	},
	all: (sql, params, cb) => {
		cb(new Error('Simulated DB error'), null);
	},
};

// Test 2: Load the server with our mock DB so that all routes use dbMock.
const fastify = t.mockRequire('../server', {
	'../db': dbMock,
});


// Test 3: GET /users => 500 when DB.all() fails.

t.test('GET /users => 500 when DB.all() fails', async t => {
	const res = await fastify.inject({
		method: 'GET',
		url: 'api/users',
	});
	t.equal(res.statusCode, 500, 'Should return 500 on DB error');
	const payload = JSON.parse(res.payload);
	t.match(payload.error, /Database error/i, 'Shows DB failure message');
});


// Test 4: GET /user/:id => 500 when DB.get() fails.

t.test('GET /user/:id => 500 when DB.get() fails', async t => {
	const res = await fastify.inject({
		method: 'GET',
		url: 'api/user/999',
	});
	t.equal(res.statusCode, 500, 'Should return 500 on DB error');
	const payload = JSON.parse(res.payload);
	t.match(payload.error, /Database error/i, 'Shows DB failure message');
});


// Test 5: POST /user/register => 500 when DB fails.
// This triggers the catch block in registerUser.

t.test('POST /user/register => 500 when DB fails', async t => {
	const res = await fastify.inject({
		method: 'POST',
		url: 'api/user/register',
		payload: { username: 'bad', password: 'Qwerty12', email: 'aaa@aaa.aaa' },
	});
	t.equal(res.statusCode, 500, 'DB error => 500');
	const body = JSON.parse(res.payload);
	t.match(body.error, /internal server error/i, 'Matches the expected error message');
});


// Test 6: POST /user/login => 500 when DB fails.

t.test('POST /user/login => 500 when DB fails', async t => {
	const res = await fastify.inject({
		method: 'POST',
		url: 'api/user/login',
		payload: { username: 'any', password: 'Qwerty12' },
	});
	t.equal(res.statusCode, 500, 'Should return 500 on DB error');
	const body = JSON.parse(res.payload);
	t.match(body.error, /internal server error/i, 'Catches loginUser DB error');
});


// Test 7: PUT /user/:username/update => 500 when DB fails.

t.test('PUT /user/:username/update => 500 when DB fails', async t => {
	const res = await fastify.inject({
		method: 'PUT',
		url: 'api/user/testuser/update',
		headers: { Authorization: 'Bearer faketoken' },
		payload: {
			currentPassword: 'Qwerty12',
			newPassword: 'Qwerty23',
		},
	});
	t.ok([401, 500].includes(res.statusCode), 'Status is either 401 (JWT check) or 500 (DB error)');
});


// Test 9: POST /user/login returns 500 when DB.get fails.

t.test('POST /user/login returns 500 when DB.get fails', async t => {
	const dbFailLoginMock = {
		get: (sql, params, cb) => cb(new Error('Simulated login db.get error')),
	};

	const fastifyFailLogin = t.mockRequire('../server', {
		'../db': dbFailLoginMock,
	});

	const res = await fastifyFailLogin.inject({
		method: 'POST',
		url: 'api/user/login',
		payload: { username: 'testuser', password: 'Qwerty12' },
	});

	t.equal(res.statusCode, 500, 'Should return 500 on DB.get failure during login');
	const body = JSON.parse(res.payload);
	t.match(body.error, /Internal server error/i, 'Matches expected error message');

	await fastifyFailLogin.close();
});

// Teardown: Close Fastify instance.

t.teardown(async () => {
	await fastify.close();
});
