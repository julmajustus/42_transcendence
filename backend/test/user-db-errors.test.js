// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   user-db-errors.test.js                             :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/03 01:29:31 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/03 13:45:21 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const t = require('tap');

// 1) Mock the DB module
// We'll create a simple fake object with stubbed methods.
const dbMock = {
  get: (sql, params, cb) => {
    // Force an error no matter what the query is
    cb(new Error('Simulated DB error'), null);
  },
  run: (sql, params, cb) => {
    cb(new Error('Simulated DB error'));
  },
  all: (sql, params, cb) => {
    cb(new Error('Simulated DB error'), null);
  }
};

// 2) Load the server, telling Tap to replace '../db' with our mock
//    This means every handler that does require('../db') will get dbMock instead.
const fastify = t.mockRequire('../server', {
  '../db': dbMock,
});

t.test('GET /users returns 500 when DB.all() errors', async t => {
  const response = await fastify.inject({
    method: 'GET',
    url: '/users'
  });
  t.equal(response.statusCode, 500, 'Should return 500 on DB error');
  const payload = JSON.parse(response.payload);
  t.match(payload.error, /Database error/, 'Error message indicates DB failure');
});

t.test('GET /user/:id returns 500 when DB.get() errors', async t => {
  const response = await fastify.inject({
    method: 'GET',
    url: '/user/999'
  });
  t.equal(response.statusCode, 500, 'Should return 500 on DB error');
  const payload = JSON.parse(response.payload);
  t.match(payload.error, /Database error/, 'Error message indicates DB failure');
});

t.test('PUT /user/:id returns 500 when DB.run() errors', async t => {
  const response = await fastify.inject({
    method: 'PUT',
    url: '/user/999',
    payload: { username: 'someuser' }
  });
  t.equal(response.statusCode, 404, 'Should return 404 on DB error');
  const payload = JSON.parse(response.payload);
  t.match(payload.error, "Not Found", 'Error message indicates DB failure');
});

t.test('POST /user/register returns 500 when DB.get() or DB.run() errors', async t => {
  const response = await fastify.inject({
    method: 'POST',
    url: '/user/register',
    payload: { username: 'bad', email: 'bad@example.com', password: 'bad' }
  });
  t.equal(response.statusCode, 500, 'Should return 500 on DB error');
  const payload = JSON.parse(response.payload);
  t.match(payload.error, "Internal server error", 'Error message indicates DB failure');
});

// Since we're mocking the DB, we don't need to worry about clearing or
// closing the real DB. But if your server is listening, you can still
// close it in teardown:
t.teardown(async () => {
  await fastify.close();
});
