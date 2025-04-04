// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   users.test.js                                      :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/02 16:28:11 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/03 14:58:49 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const t = require('tap');
const fastify = require('../server');
const db = require('../db');

// We'll store a few user IDs and tokens here for our tests
let userId;
let authToken;

t.before(async () => {
  // Clear the table before all tests
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM users', err => (err ? reject(err) : resolve()));
  });
});

/**
 * 1) Test Registration (Positive)
 */
t.test('POST /user/register - creates a new user', async t => {
  const payload = {
    username: 'testuser',
    password: 'secret',
  };

  const res = await fastify.inject({
    method: 'POST',
    url: '/user/register',
    payload,
  });

  t.equal(res.statusCode, 200, 'Status code should be 200');
  const body = JSON.parse(res.payload);
  t.ok(body.id, 'Response includes an id');
  t.equal(body.username, payload.username, 'Username matches');
  userId = body.id;
});

/**
 * 2) Test Duplicate Registration (Negative)
 */
t.test('POST /user/register - returns 400 if username already exists', async t => {
  const payload = {
    username: 'testuser', // same as above
    password: 'anothersecret',
  };

  const res = await fastify.inject({
    method: 'POST',
    url: '/user/register',
    payload,
  });

  t.equal(res.statusCode, 400, 'Duplicate registration returns 400');
  const body = JSON.parse(res.payload);
  t.match(body.error, /already exists/i, 'Error indicates duplicate username');
});

/**
 * 3) Test Login (Positive)
 */
t.test('POST /user/login - logs in an existing user', async t => {
  const payload = {
    username: 'testuser',
    password: 'secret',
  };

  const res = await fastify.inject({
    method: 'POST',
    url: '/user/login',
    payload,
  });

  t.equal(res.statusCode, 200, 'Login returns 200 on success');
  const body = JSON.parse(res.payload);
  t.ok(body.token, 'Response should have a JWT token');
  authToken = body.token; // store token for subsequent tests
});

/**
 * 4) Test Login (Negative) - Wrong password
 */
t.test('POST /user/login - returns 401 with invalid password', async t => {
  const payload = {
    username: 'testuser',
    password: 'wrongpassword',
  };

  const res = await fastify.inject({
    method: 'POST',
    url: '/user/login',
    payload,
  });

  t.equal(res.statusCode, 401, 'Wrong password returns 401');
  const body = JSON.parse(res.payload);
  t.match(body.error, /invalid credentials/i, 'Indicates invalid credentials');
});

/**
 * Test login for non-existent user.
 */
t.test('POST /user/login returns 400 if user does not exist', async t => {
  const res = await fastify.inject({
    method: 'POST',
    url: '/user/login',
    payload: { username: 'nonexistent', password: 'whatever' },
  });
  t.equal(res.statusCode, 400, 'Login returns 400 for non-existent user');
  const body = JSON.parse(res.payload);
  t.match(body.error, /invalid username or password/i, 'Error message indicates invalid credentials');
});

/**
 * Test updateUser returns 400 if user is not found.
 * We simulate this by registering a user, logging in to get a token,
 * then manually deleting the user before attempting an update.
 */
t.test('PUT /user/update returns 400 if user not found', async t => {
  // Register a temporary user.
  const regRes = await fastify.inject({
    method: 'POST',
    url: '/user/register',
    payload: { username: 'tempuser', password: 'temp' },
  });
  t.equal(regRes.statusCode, 200, 'User registration succeeds');
  const regBody = JSON.parse(regRes.payload);
  const tempUserId = regBody.id;

  // Login to get token.
  const loginRes = await fastify.inject({
    method: 'POST',
    url: '/user/login',
    payload: { username: 'tempuser', password: 'temp' },
  });
  t.equal(loginRes.statusCode, 200, 'Login succeeds');
  const token = JSON.parse(loginRes.payload).token;

  // Delete the user directly from the DB.
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM users WHERE id = ?', [tempUserId], err => (err ? reject(err) : resolve()));
  });

  // Attempt to update the now-deleted user.
  const updateRes = await fastify.inject({
    method: 'PUT',
    url: '/user/update', // adjust if your route is different
    headers: { Authorization: `Bearer ${token}` },
    payload: { currentPassword: 'temp', newPassword: 'newtemp' },
  });
  t.equal(updateRes.statusCode, 400, 'Update returns 400 when user not found');
  const updateBody = JSON.parse(updateRes.payload);
  t.match(updateBody.error, /user not found/i, 'Error indicates user not found');
});
/**
 * 5) Test GET /user/:id (Positive)
 */
t.test('GET /user/:id - returns the registered user', async t => {
  t.ok(userId, 'User ID should be set from registration');
  const res = await fastify.inject({
    method: 'GET',
    url: `/user/${userId}`,
  });
  t.equal(res.statusCode, 200, 'GET user returns 200');
  const body = JSON.parse(res.payload);
  t.equal(body.id, Number(userId), 'Returned id matches');
  t.equal(body.username, 'testuser', 'Returned username matches');
});

/**
 * 6) Test GET /users (Positive) - Should see at least 1 user
 */
t.test('GET /users - returns a list including our user', async t => {
  const res = await fastify.inject({
    method: 'GET',
    url: '/users',
  });
  t.equal(res.statusCode, 200, 'GET /users returns 200');
  const list = JSON.parse(res.payload);
  t.ok(Array.isArray(list), 'Response is an array');
  const user = list.find(u => u.id === Number(userId));
  t.ok(user, 'The newly registered user is in the list');
});

/**
 * 7) Test GET /user/:id (Negative - non-existent)
 */
t.test('GET /user/:id - returns 404 if user not found', async t => {
  const res = await fastify.inject({
    method: 'GET',
    url: `/user/999999`, // hopefully doesn't exist
  });
  t.equal(res.statusCode, 404, 'Non-existent user returns 404');
  const body = JSON.parse(res.payload);
  t.match(body.error, /not found/i, 'Error message indicates user not found');
});

/**
 * 8) Test updateUser route (Positive)
 *    updateUser code requires JWT, so we pass authToken
 */
t.test('PUT /user/update - updates password and username (with correct currentPassword)', async t => {
  const newData = {
    currentPassword: 'secret',
    newPassword: 'supersecret',
    newUsername: 'newname',
  };

  const res = await fastify.inject({
    method: 'PUT',
    url: '/user/update',        // <--- Adjust if your actual route is different
    headers: {
      Authorization: `Bearer ${authToken}`, // pass the token
    },
    payload: newData,
  });

  t.equal(res.statusCode, 200, 'Update returns 200 on success');
  const body = JSON.parse(res.payload);
  t.match(body.message, /updated successfully/i, 'Confirms success');
});

/**
 * 9) Test updateUser route (Negative - wrong currentPassword)
 */
t.test('PUT /user/update - returns 401 if current password is wrong', async t => {
  const newData = {
    currentPassword: 'not-the-right-password',
    newPassword: 'whatever',
  };

  const res = await fastify.inject({
    method: 'PUT',
    url: '/user/update',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    payload: newData,
  });

  t.equal(res.statusCode, 401, 'Wrong current password returns 401');
  const body = JSON.parse(res.payload);
  t.match(body.error, /current password is not correct/i);
});

/**
 * Test updateUser returns 400 if new username already exists.
 */
t.test('PUT /user/update returns 400 if new username already exists', async t => {
  // Register two users.
  const userA = { username: 'userA', password: 'passA' };
  const userB = { username: 'userB', password: 'passB' };

  const regA = await fastify.inject({
    method: 'POST',
    url: '/user/register',
    payload: userA,
  });
  t.equal(regA.statusCode, 200, 'User A registration succeeds');

  const regB = await fastify.inject({
    method: 'POST',
    url: '/user/register',
    payload: userB,
  });
  t.equal(regB.statusCode, 200, 'User B registration succeeds');

  // Login as userB to obtain a token.
  const loginB = await fastify.inject({
    method: 'POST',
    url: '/user/login',
    payload: userB,
  });
  t.equal(loginB.statusCode, 200, 'User B login succeeds');
  const tokenB = JSON.parse(loginB.payload).token;

  // Attempt to update userB's username to "userA" which already exists.
  const updateRes = await fastify.inject({
    method: 'PUT',
    url: '/user/update',
    headers: { Authorization: `Bearer ${tokenB}` },
    payload: { currentPassword: 'passB', newUsername: 'userA' },
  });
  t.equal(updateRes.statusCode, 400, 'Update returns 400 for duplicate new username');
  const updateBody = JSON.parse(updateRes.payload);
  t.match(updateBody.error, /already exists/i, 'Error indicates duplicate username');
});

/**
 * Test linkGoogleAccount: positive and negative.
 */
t.test('PUT /user/link_google_account positive and duplicate check', async t => {
  // Register user1 and link a Google account.
  const user1 = { username: 'googleUser1', password: 'pass1' };
  const reg1 = await fastify.inject({
    method: 'POST',
    url: '/user/register',
    payload: user1,
  });
  t.equal(reg1.statusCode, 200, 'User1 registration succeeds');
  const login1 = await fastify.inject({
    method: 'POST',
    url: '/user/login',
    payload: user1,
  });
  t.equal(login1.statusCode, 200, 'User1 login succeeds');
  const token1 = JSON.parse(login1.payload).token;

  const linkRes1 = await fastify.inject({
    method: 'PUT',
    url: '/user/link_google_account',
    headers: { Authorization: `Bearer ${token1}` },
    payload: { email: 'google@example.com', google_id: 'GOOGLE123' },
  });
  t.equal(linkRes1.statusCode, 200, 'Linking Google account for user1 succeeds');
  const body1 = JSON.parse(linkRes1.payload);
  t.match(body1.message, /Google account linked successfully/i);

  // Register user2.
  const user2 = { username: 'googleUser2', password: 'pass2' };
  const reg2 = await fastify.inject({
    method: 'POST',
    url: '/user/register',
    payload: user2,
  });
  t.equal(reg2.statusCode, 200, 'User2 registration succeeds');
  const login2 = await fastify.inject({
    method: 'POST',
    url: '/user/login',
    payload: user2,
  });
  t.equal(login2.statusCode, 200, 'User2 login succeeds');
  const token2 = JSON.parse(login2.payload).token;

  // Attempt to link the same Google account for user2.
  const linkRes2 = await fastify.inject({
    method: 'PUT',
    url: '/user/link_google_account',
    headers: { Authorization: `Bearer ${token2}` },
    payload: { email: 'google@example.com', google_id: 'GOOGLE123' },
  });
  t.equal(linkRes2.statusCode, 400, 'Linking duplicate Google account returns 400');
  const body2 = JSON.parse(linkRes2.payload);
  t.match(body2.error, /already linked/i, 'Error indicates Google account already linked');
});

/**
 * Teardown
 */
t.teardown(async () => {
  try {
    // Clear the users table after all tests
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM users', err => (err ? reject(err) : resolve()));
    });
    // Close DB
    await new Promise((resolve, reject) => {
      db.close(err => (err ? reject(err) : resolve()));
    });
    // Close Fastify
    await fastify.close();
  } catch (err) {
    console.error('Teardown error:', err);
    throw err;
  }
});
