// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   users.test.js                                      :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/02 16:28:11 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/03 00:45:57 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const t = require('tap');
const fastify = require('../server');
const db = require('../db');

let registeredUserId;

// --- Positive Flow: Register, get, update, and list a user ---
t.test('Positive User Flow', async t => {
  t.test('POST /user/register registers a new user', async t => {
    const newUser = {
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'secret'
    };

    const response = await fastify.inject({
      method: 'POST',
      url: '/user/register',
      payload: newUser
    });

    t.equal(response.statusCode, 200, 'Registration returns status code 200');
    const payload = JSON.parse(response.payload);
    t.ok(payload.id, 'Response includes an id');
    t.equal(payload.username, newUser.username, 'Username matches');
    registeredUserId = payload.id;
  });

  t.test('GET /user/:id returns the registered user', async t => {
    t.ok(registeredUserId, 'User id is set from registration');
    const response = await fastify.inject({
      method: 'GET',
      url: `/user/${registeredUserId}`
    });
    t.equal(response.statusCode, 200, 'GET user returns status 200');
    const payload = JSON.parse(response.payload);
    t.equal(payload.id, Number(registeredUserId), 'Returned id matches');
  });

  t.test('PUT /user/:id updates the user', async t => {
    t.ok(registeredUserId, 'User id is set');
    const updatedData = { username: 'updateduser' };

    const response = await fastify.inject({
      method: 'PUT',
      url: `/user/${registeredUserId}`,
      payload: updatedData
    });
    t.equal(response.statusCode, 200, 'PUT update returns status 200');
    const payload = JSON.parse(response.payload);
    t.equal(payload.username, updatedData.username, 'Username is updated');
  });

  t.test('GET /users returns a list including the user', async t => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/users'
    });
    t.equal(response.statusCode, 200, 'GET /users returns status 200');
    const payload = JSON.parse(response.payload);
    t.ok(Array.isArray(payload), 'Response is an array');
    const user = payload.find(u => u.id === Number(registeredUserId));
    t.ok(user, 'The registered (and updated) user is in the list');
  });
});

// --- Negative Flow: Test error cases ---
t.test('Negative User Flow', async t => {
  // First, clear the users table so that tests run from a known state.
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM users', err => err ? reject(err) : resolve());
  });

  t.test('POST /user/register returns 400 for duplicate email', async t => {
    const newUser = {
      username: 'dupuser',
      email: 'dup@example.com',
      password: 'secret'
    };

    // First registration should succeed.
    const response1 = await fastify.inject({
      method: 'POST',
      url: '/user/register',
      payload: newUser
    });
    t.equal(response1.statusCode, 200, 'First registration succeeds');

    // Duplicate registration should fail.
    const response2 = await fastify.inject({
      method: 'POST',
      url: '/user/register',
      payload: newUser
    });
    t.equal(response2.statusCode, 400, 'Duplicate registration returns 400');
    const payload2 = JSON.parse(response2.payload);
    t.match(payload2.error, /already exists/i, 'Error indicates duplicate email');
  });

  t.test('GET /user/:id returns 404 for non-existent user', async t => {
    const response = await fastify.inject({
      method: 'GET',
      url: '/user/9999'
    });
    t.equal(response.statusCode, 404, 'GET on non-existent user returns 404');
    const payload = JSON.parse(response.payload);
    t.match(payload.error, /not found/i, 'Error message indicates user not found');
  });

  t.test('PUT /user/:id returns 404 when updating non-existent user', async t => {
    const response = await fastify.inject({
      method: 'PUT',
      url: '/user/9999',
      payload: { username: 'doesnotexist' }
    });
    t.equal(response.statusCode, 404, 'PUT on non-existent user returns 404');
    const payload = JSON.parse(response.payload);
    t.match(payload.error, /not found/i, 'Error message indicates user not found');
  });

  t.test('GET /users returns 404 when no users exist', async t => {
    // Clear the table again.
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM users', err => err ? reject(err) : resolve());
    });
    const response = await fastify.inject({
      method: 'GET',
      url: '/users'
    });
    t.equal(response.statusCode, 404, 'GET /users returns 404 when table is empty');
    const payload = JSON.parse(response.payload);
    t.match(payload.error, /No users found/i, 'Error message indicates no users found');
  });
});

// --- Teardown: Clean up and close resources ---
t.teardown(async () => {
  try {
    // Ensure the users table is cleared.
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM users', err => err ? reject(err) : resolve());
    });
    // Close the SQLite connection.
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    // Close the Fastify instance.
    await fastify.close();
  } catch (err) {
    console.error('Teardown error:', err);
    throw err;
  }
});
