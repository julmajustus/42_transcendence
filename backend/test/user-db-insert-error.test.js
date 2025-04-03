// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   user-db-insert-error.test.js                       :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/03 01:33:35 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/03 13:47:14 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const t = require('tap');

// Mock the db module but only fail the INSERT
const dbMock = {
  // For the "SELECT * FROM users WHERE email = ?"
  // we simulate "no user found" (null) and no error.
  get: (sql, params, cb) => {
    if (/SELECT \* FROM users/i.test(sql)) {
      cb(null, null);
    } else {
      cb(new Error('Unexpected DB call in get()'));
    }
  },

  // For the "INSERT INTO users (...)"
  // we force an error to test the 'Error inserting user' branch.
  run: (sql, params, cb) => {
    if (/INSERT INTO users/i.test(sql)) {
      cb(new Error('Simulated DB insert error'));
    } else {
      cb(new Error('Unexpected DB call in run()'));
    }
  },

  // Not used by this route, but must exist if other parts of the code call them
  all: (sql, params, cb) => cb(new Error('Unexpected DB call in all()'), null),
};

const fastify = t.mockRequire('../server', {
  '../db': dbMock, // So the handlers see this mock instead of the real DB
});

t.test('POST /user/register -> fails on INSERT', async t => {
  const response = await fastify.inject({
    method: 'POST',
    url: '/user/register',
    payload: {
      username: 'mockFail',
      email: 'mockFail@example.com',
      password: 'password'
    }
  });

  t.equal(response.statusCode, 500, 'Should return 500 on INSERT error');
  const payload = JSON.parse(response.payload);
  t.match(payload.error, "Internal server error", 
    'Error message indicates DB insert failure');

  t.end();
});

t.teardown(async () => {
  await fastify.close();
});
