/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   users.test.js                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mpellegr <mpellegr@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/02 16:28:11 by jmakkone          #+#    #+#             */
/*   Updated: 2025/05/26 15:21:54 by mpellegr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const t = require('tap');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const db = require('../db');
const fastify = require('../server');

// Store a user ID and token for later use
let userUsername;
let authToken;


// Clear users table before running the tests

t.before(async () => {
	await new Promise((resolve, reject) => {
		db.serialize(() => {
			db.run('DELETE FROM users', err => {
				if (err) return reject(err);
			});
			db.run("DELETE FROM sqlite_sequence WHERE name = 'users'", err => {
				if (err) return reject(err);
				resolve();
			});
		});
	});
});


// TEST 1: Registration (Positive)

t.test('Test 1: POST /user/register (Positive) - creates a new user', async t => {
	const payload = { username: 'testuser', password: 'Qwerty12', email: 'testuser@aaa.aaa' };

	const res = await fastify.inject({
		method: 'POST',
		url: '/api/user/register',
		payload,
	});

	t.equal(res.statusCode, 200, 'Should return 200 on successful registration');
	const body = JSON.parse(res.payload);
	t.ok(body.id, 'Response includes an id');
	t.equal(body.username, payload.username, 'Username matches');
	userUsername = body.username;
});


// TEST 2: Registration (Negative) - Duplicate username

t.test('Test 2: POST /user/register (Duplicate) - returns 400 if username already exists', async t => {
	const payload = { username: 'testuser', password: 'Qwerty12', email: 'testuser@testuser.aaa' };

	const res = await fastify.inject({
		method: 'POST',
		url: '/api/user/register',
		payload,
	});

	t.equal(res.statusCode, 400, 'Duplicate registration returns 400');
	const body = JSON.parse(res.payload);
	t.match(body.error, /already exists/i, 'Error indicates duplicate username');
});


// TEST 3: Login (Positive)

t.test('Test 3: POST /user/login (Positive) - logs in existing user', async t => {
	const payload = { username: 'testuser', password: 'Qwerty12' };

	const res = await fastify.inject({
		method: 'POST',
		url: '/api/user/login',
		payload,
	});

	t.equal(res.statusCode, 200, 'Should return 200 on successful login');
	const body = JSON.parse(res.payload);
	t.ok(body.token, 'Response should have a JWT token');
	authToken = body.token;
});


// TEST 4: Login (Negative) - Wrong password

t.test('Test 4: POST /user/login (Wrong password) - returns 401', async t => {
	const payload = { username: 'testuser', password: 'Wrongpassword12' };

	const res = await fastify.inject({
		method: 'POST',
		url: '/api/user/login',
		payload,
	});

	t.equal(res.statusCode, 401, 'Should return 401 for wrong password');
	const body = JSON.parse(res.payload);
	t.match(body.error, /invalid credentials/i, 'Indicates invalid credentials');
});


// TEST 5: Login (Negative) - Non-existent user

t.test('Test 5: POST /user/login (No such user) - returns 400', async t => {
	const res = await fastify.inject({
		method: 'POST',
		url: '/api/user/login',
		payload: { username: 'nonexistent', password: 'Qwerty12' },
	});
	t.equal(res.statusCode, 400, 'Should return 400 for non-existent user');
	const body = JSON.parse(res.payload);
	t.match(body.error, /invalid username or password/i, 'Error message indicates invalid credentials');
});


// TEST 6: updateUser => 400 if user not found

t.test('Test 6: PUT /user/:username/update => returns 400 if user is deleted first', async t => {
	// 1 Register
	const regRes = await fastify.inject({
		method: 'POST',
		url: '/api/user/register',
		payload: { username: 'tempuser', password: 'Qwerty12', email: 'tempuser@aaa.aaa' },
	});
	t.equal(regRes.statusCode, 200, 'Temporary user registration succeeds');
	const regBody = JSON.parse(regRes.payload);
	const tempUserId = regBody.id;
	// 2 Login
	const loginRes = await fastify.inject({
		method: 'POST',
		url: '/api/user/login',
		payload: { username: 'tempuser', password: 'Qwerty12' },
	});
	t.equal(loginRes.statusCode, 200, 'Login of tempuser succeeds');
	const token = JSON.parse(loginRes.payload).token;

	// Delete the user from DB
	await new Promise((resolve, reject) => {
		db.run('DELETE FROM users WHERE id = ?', [tempUserId], err => (err ? reject(err) : resolve()));
	});

	// Attempt to update now-deleted user => 400
	const updateRes = await fastify.inject({
		method: 'PUT',
		url: '/api/user/tempuser/update',
		headers: { Authorization: `Bearer ${token}` },
		payload: { currentPassword: 'Qwerty12', newPassword: 'Qwerty23' },
	});
	t.equal(updateRes.statusCode, 400, 'Should return 400 when user not found');
	t.match(JSON.parse(updateRes.payload).error, /user not found/i);

	t.end();
});


// TEST 7: GET /user/:id (Positive)

t.test('Test 7: GET /user/:id => returns the registered user', async t => {
	t.ok(userUsername, 'User username must be set from test #1');
	const res = await fastify.inject({
		method: 'GET',
		url: `/api/user/${userUsername}`,
	});
	t.equal(res.statusCode, 200, 'Should return 200 for existing user');
	const body = JSON.parse(res.payload);
	// t.equal(body.username, userUsername, 'Returned ID matches stored userId');
	t.equal(body.username, 'testuser', 'Returned username matches');
});


// TEST 8: GET /users => returns list with the new user

t.test('Test 8: GET /users => 200 + array containing testuser', async t => {
	const res = await fastify.inject({
		method: 'GET',
		url: '/api/users',
	});
	t.equal(res.statusCode, 200, 'GET /users returns 200');
	const list = JSON.parse(res.payload);
	t.ok(Array.isArray(list), 'Response is an array');
	const found = list.some(u => u.username === userUsername);
	t.ok(found, 'Registered user is in the list');
});


// TEST 9: GET /user/:id => 404 if user not found

t.test('Test 9: GET /user/:id (Non-existent) => returns 404', async t => {
	const res = await fastify.inject({
		method: 'GET',
		url: '/api/user/999999',
	});
	t.equal(res.statusCode, 404, 'Non-existent user => 404');
	t.match(JSON.parse(res.payload).error, /not found/i);
});


// TEST 10: updateUser (Positive)

t.test('Test 10: PUT /user/:username/update (Positive) => updates password', async t => {
	const newData = {
		currentPassword: 'Qwerty12',
		newPassword: 'Qwerty23',
	};

	const res = await fastify.inject({
		method: 'PUT',
		url: '/api/user/testuser/update',
		headers: { Authorization: `Bearer ${authToken}` },
		payload: newData,
	});

	t.equal(res.statusCode, 200, 'Should return 200 on successful update');
	t.match(JSON.parse(res.payload).message, /updated successfully/i);
});


// TEST 11: updateUser => returns 401 if current password is wrong

t.test('Test 11: PUT /user/:username/update => 401 if wrong currentPassword', async t => {
	const newData = {
		currentPassword: 'Qwerty12',
		newPassword: 'Qwerty12',
	};

	const res = await fastify.inject({
		method: 'PUT',
		url: '/api/user/testuser/update',
		headers: { Authorization: `Bearer ${authToken}` },
		payload: newData,
	});

	t.equal(res.statusCode, 401, 'Wrong current password => 401');
	t.match(JSON.parse(res.payload).error, /current password is not correct/i);
});


// TEST 12: updateUser => 400 if new username already exists

t.test('Test 12: PUT /user/:username/update => 400 duplicate newUsername', async t => {
	const userA = { username: 'userA', password: 'Qwerty12', email: 'userA@aaa.aaa' };
	const userB = { username: 'userB', password: 'Qwerty12', email: 'userB@aaa.aaa' };

	// Register both:
	const regA = await fastify.inject({
		method: 'POST',
		url: '/api/user/register',
		payload: userA,
	});
	t.equal(regA.statusCode, 200, 'User A registration ok');

	const regB = await fastify.inject({
		method: 'POST',
		url: '/api/user/register',
		payload: userB,
	});
	t.equal(regB.statusCode, 200, 'User B registration ok');

	// Login as userB
	const loginB = await fastify.inject({
		method: 'POST',
		url: '/api/user/login',
		payload: userB,
	});
	t.equal(loginB.statusCode, 200, 'User B login ok');
	const tokenB = JSON.parse(loginB.payload).token;

	// Attempt to rename userB => userA
	const updateRes = await fastify.inject({
		method: 'PUT',
		url: '/api/user/userB/update',
		headers: { Authorization: `Bearer ${tokenB}` },
		payload: { currentPassword: 'Qwerty12', newUsername: 'userA' },
	});
	t.equal(updateRes.statusCode, 400, '400 for duplicate new username');
	t.match(JSON.parse(updateRes.payload).error, /already exists/i);
});


// TEST 15: uploadAvatar => invalid MIME, large file, mismatch, success

t.test('Test 15: uploadAvatar => checks for invalid mime, size limit, param mismatch, success', async t => {
	// Re-login testuser w/ new password from test #10
	const loginAgain = await fastify.inject({
		method: 'POST',
		url: '/api/user/login',
		payload: { username: 'testuser', password: 'Qwerty23' },
	});
	t.equal(loginAgain.statusCode, 200, 'Re-login success');
	const testuserToken = JSON.parse(loginAgain.payload).token;

	// Invalid MIME
	{
		const form = new FormData();
		form.append('file', Buffer.from('not an image'), {
			filename: 'test.txt',
			contentType: 'text/plain',
		});
		const invalidRes = await fastify.inject({
			method: 'PUT',
			url: '/api/user/testuser/upload_avatar',
			headers: { ...form.getHeaders(), Authorization: `Bearer ${testuserToken}`, },
			payload: await form.getBuffer(),
		});
		t.equal(invalidRes.statusCode, 400, '400 invalid mime');
		t.match(JSON.parse(invalidRes.payload).error, /Invalid file format/i);
	}

//	// File too large
//	{
//		const form = new FormData();
//		const bigBuffer = Buffer.alloc((2 * 1024 * 1024) + 1);
//		form.append('file', bigBuffer, {
//			filename: 'big.png',
//			contentType: 'image/png',
//		});
//		const bigRes = await fastify.inject({
//			method: 'PUT',
//			url: '/user/testuser/upload_avatar',
//			headers: { ...form.getHeaders(), Authorization: `Bearer ${testuserToken}`, },
//			payload: await form.getBuffer(),
//		});
//		t.equal(bigRes.statusCode, 400, '400 File is too large. Maximum size is 2MB.');
//		t.match(JSON.parse(bigRes.payload).error, /File is too large/i);
//	}

	// Param mismatch
	{
		const form = new FormData();
		// 1x1px valid PNG
		const tinyPngBuffer = Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
			'base64'
		);
		form.append('file', tinyPngBuffer, {
			filename: 'avatar.png',
			contentType: 'image/png',
		});
		const mismatchRes = await fastify.inject({
			method: 'PUT',
			url: '/api/user/SomeOtherUser/upload_avatar',
			headers: { ...form.getHeaders(), Authorization: `Bearer ${testuserToken}`, },
			payload: await form.getBuffer(),
		});
		t.equal(mismatchRes.statusCode, 400, '400 param mismatch');
		t.match(JSON.parse(mismatchRes.payload).error, /permission|modify/i);
	}

	// Success
	{
		const form = new FormData();
		const tinyPngBuffer = Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
			'base64'
		);
		form.append('file', tinyPngBuffer, {
			filename: 'avatar.png',
			contentType: 'image/png',
		});
		const successRes = await fastify.inject({
			method: 'PUT',
			url: '/api/user/testuser/upload_avatar',
			headers: { ...form.getHeaders(), Authorization: `Bearer ${testuserToken}`, },
			payload: await form.getBuffer(),
		});
		t.equal(successRes.statusCode, 200, '200 success upload');
		t.match(JSON.parse(successRes.payload).message, /avatar uploaded succesfully/i);
	}

	t.end();
});


// TEST 16: getUserAvatar => 404 if no user, 200 if user found

t.test('Test 16: getUserAvatar => 404 not found user, 200 existing user', async t => {
	// 404 if user not found
	const notFoundRes = await fastify.inject({
		method: 'GET',
		url: '/api/user/NoSuchUser/avatar',
	});
	t.equal(notFoundRes.statusCode, 404, '404 if user not found');
	t.match(JSON.parse(notFoundRes.payload).error, /User not found/i);

	// 200 for existing testuser (assuming the file is physically present & fastify-static is configured)
	const avatarRes = await fastify.inject({
		method: 'GET',
		url: '/api/user/testuser/avatar',
	});
	t.equal(avatarRes.statusCode, 200, 'Returns 200 if user + avatar is found');
	t.end();
});


// TEST 17: removeAvatar => mismatch => 400, success => 200

t.test('Test 17: removeAvatar => param mismatch vs success', async t => {
	// Re-login to ensure a valid token
	const loginAgain = await fastify.inject({
		method: 'POST',
		url: '/api/user/login',
		payload: { username: 'testuser', password: 'Qwerty23' },
	});
	t.equal(loginAgain.statusCode, 200, 'Login again success');
	const testuserToken = JSON.parse(loginAgain.payload).token;

	// Mismatch
	const mismatchRes = await fastify.inject({
		method: 'PUT',
		url: '/api/user/NotTestuser/remove_avatar',
		headers: { Authorization: `Bearer ${testuserToken}` },
	});
	t.equal(mismatchRes.statusCode, 400, '400 mismatch');
	t.match(JSON.parse(mismatchRes.payload).error, /permission|modify/i);

	// Success
	const removeRes = await fastify.inject({
		method: 'PUT',
		url: '/api/user/testuser/remove_avatar',
		headers: { Authorization: `Bearer ${testuserToken}` },
	});
	t.equal(removeRes.statusCode, 200, '200 success remove');
	t.match(JSON.parse(removeRes.payload).message, /avatar removed succesfully/i);

	t.end();
});

// TEST 18: logout user

t.test('Test 18: logout user', async t => {
	// login to ensure a valid token
	const loginA = await fastify.inject({
		method: 'POST',
		url: '/api/user/login',
		payload: { username: 'testuser', password: 'Qwerty23' },
	});
	t.equal(loginA.statusCode, 200, 'Login again success');
	const testuserToken = JSON.parse(loginA.payload).token;

	// logout with a wrong token
	const wrongToken = await fastify.inject({
		method: 'POST',
		url: '/api/user/logout',
		headers: { Authorization: `Bearer wrongToken` },
	})
	t.equal(wrongToken.statusCode, 401, 'invalid token')
	t.match(JSON.parse(wrongToken.payload).error, /Unauthorized/i);

	// logout userA
	let logoutA = await fastify.inject({
		method: 'POST',
		url: '/api/user/logout',
		headers: { Authorization: `Bearer ${testuserToken}` },
	})
	t.equal(logoutA.statusCode, 200, 'userA logged out')
	t.match(JSON.parse(logoutA.payload).message, /Logged out successfully/i);

	// logout userA with the same token of previous logout that should have been blacklisted
	logoutA = await fastify.inject({
		method: 'POST',
		url: '/api/user/logout',
		headers: { Authorization: `Bearer ${testuserToken}` },
	})
	t.equal(logoutA.statusCode, 401, 'userA cannot use a revoked token')
	t.match(JSON.parse(logoutA.payload).error, /Token has been revoked/i);
})

// TEST 19: /verify_2fa_code

t.test('/verify_2fa_code', async t => {
	const code = '123456'
	try {
		await new Promise((resolve, reject) => {
			db.run('UPDATE users SET two_fa_code = ?, two_fa_code_expiration = ? WHERE username = ?',
				[code, Date.now() + 5 * 60 * 1000, 'testuser'], (err) => {
					if (err) return reject(err)
						resolve()
				}
			)
		})
		const verifyCode = await fastify.inject({
			method: 'POST',
			url: '/api/verify_2fa_code',
			payload: { code: code, username: 'testuser'}
		})
		t.equal(verifyCode.statusCode, 200, '2FA verification succeeded')
		t.ok(JSON.parse(verifyCode.payload).token, 'Got token after 2FA')
	} catch (err) {
		console.error('2FA code verification error:', err);
		throw err;
	}
	const wrongCode = await fastify.inject({
		method: 'POST',
		url: '/api/verify_2fa_code',
		payload: { code: '000000', username: 'testuser'}
	})
	t.equal(wrongCode.statusCode, 401, 'Invalid 2FA code')

	const wrongUsername = await fastify.inject({
		method: 'POST',
		url: '/api/verify_2fa_code',
		payload: { code: code, username: 'wronguser'}
	})
	t.equal(wrongUsername.statusCode, 400, 'Invalid username')

	try {
		await new Promise((resolve, reject) => {
			db.run('UPDATE users SET two_fa_code_expiration = ? WHERE username = ?',
				[Date.now() - 1 * 60 * 1000, 'testuser'], (err) => {
					if (err) return reject(err)
						resolve()
				}
			)
		})
		const verifyCode = await fastify.inject({
			method: 'POST',
			url: '/api/verify_2fa_code',
			payload: { code: code, username: 'testuser'}
		})
		t.equal(verifyCode.statusCode, 401, '2FA code expired')
	} catch (err) {
		console.error('2FA code verification error:', err);
		throw err;
	}
})

// TEARDOWN: Clean up DB and close Fastify

t.teardown(async () => {
	try {
		await new Promise((resolve, reject) => {
			db.serialize(() => {
				db.run('DELETE FROM users', err => {
					if (err) return reject(err);
				});
				db.run("DELETE FROM sqlite_sequence WHERE name = 'users'", err => {
					if (err) return reject(err);
					resolve();
				});
			});
		});

		await new Promise((resolve, reject) => {
			db.close(err => (err ? reject(err) : resolve()));
		});

		await fastify.close();
	} catch (err) {
		console.error('Teardown error:', err);
		throw err;
	}
});
