// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   users.test.js                                      :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/02 16:28:11 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/02 17:23:54 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const t = require('tap');
const fastify = require('../server');
const db = require('../db');

let registeredUserId;

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

  t.equal(response.statusCode, 200, 'User registration should return status code 200');
  const payload = JSON.parse(response.payload);
  t.ok(payload.id, 'New user should have an id');
  t.equal(payload.username, newUser.username, 'Username should match the registered value');
  registeredUserId = payload.id; // Save for later tests
  t.end();
});

t.test('GET /user/:id returns the registered user', async t => {
  t.ok(registeredUserId, 'User id should be set from registration');
  
  const response = await fastify.inject({
    method: 'GET',
    url: `/user/${registeredUserId}`
  });
  
  t.equal(response.statusCode, 200, 'Getting a valid user should return status code 200');
  const payload = JSON.parse(response.payload);
  t.equal(payload.id, Number(registeredUserId), 'Returned user id should match the registered id');
  t.end();
});

t.test('PUT /user/:id updates the user', async t => {
  t.ok(registeredUserId, 'User id should be set');
  const updatedData = { username: 'updateduser' };

  const response = await fastify.inject({
    method: 'PUT',
    url: `/user/${registeredUserId}`,
    payload: updatedData
  });
  
  t.equal(response.statusCode, 200, 'User update should return status code 200');
  const payload = JSON.parse(response.payload);
  t.equal(payload.username, updatedData.username, 'Username should be updated correctly');
  t.end();
});

t.test('GET /users returns a list including the new user', async t => {
  const response = await fastify.inject({
    method: 'GET',
    url: '/users'
  });
  
  t.equal(response.statusCode, 200, 'Getting all users should return status code 200');
  const payload = JSON.parse(response.payload);
  t.ok(Array.isArray(payload), 'Response should be an array');
  const user = payload.find(u => u.id === Number(registeredUserId));
  t.ok(user, 'The newly registered (and updated) user should be in the list');
  t.end();
});

// Teardown: clean up the test user from the database after tests run.
t.teardown(() => {
  // Remove the test user by email.
  db.run('DELETE FROM users WHERE email = ?', ['testuser@example.com'], function (err) {
    if (err) {
      console.error('Error cleaning up test user:', err);
    } else {
      console.log(`Cleanup: Removed ${this.changes} test user(s)`);
    }
  });
});
