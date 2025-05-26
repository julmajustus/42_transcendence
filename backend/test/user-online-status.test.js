const t = require('tap');
const db = require('../db');
const fastify = require('../server');

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

t.test('online status tests', async t => {
	const userA = { username: 'userA', password: 'Qwerty23', email: 'aaa@aaa.aaa' };
	
	// register userA
	const regA = await fastify.inject({
		method: 'POST',
		url: 'api/user/register',
		payload: userA,
	});
	// const userAId = JSON.parse(regA.payload).id;
	const userAUsername = JSON.parse(regA.payload).username;

	// get default online status of userA
	let statusUserA = await fastify.inject({
		method: 'GET',
		url: `api/user/${userAUsername}`
	})
	t.equal(JSON.parse(statusUserA.payload).online_status, 'offline', 'user is correctly set offline at registration')

	// login userA
	const loginA = await fastify.inject({
		method: 'POST',
		url: 'api/user/login',
		payload: userA,
	});
	const tokenA = JSON.parse(loginA.payload).token;

	// get status of userA afetr login
	statusUserA = await fastify.inject({
		method: 'GET',
		url: `api/user/${userAUsername}`
	})
	t.equal(JSON.parse(statusUserA.payload).online_status, 'online', 'user is correctly set online after login')

	// set userA status to away
	let updatedStatus = await fastify.inject({
		method: 'PUT',
		url: `api/update_online_status/${userAUsername}`,
		headers: { Authorization: `Bearer ${tokenA}` },
		payload: { status: 'away' },
	})
	t.equal(updatedStatus.statusCode, 200, 'online status set to away succesfully')
	statusUserA = await fastify.inject({
		method: 'GET',
		url: `api/user/${userAUsername}`
	})
	t.equal(JSON.parse(statusUserA.payload).online_status, 'away', 'user status updated also on db successfully')

	// set userA status to a wrong status
	updatedStatus = await fastify.inject({
		method: 'PUT',
		url: `api/update_online_status/${userAUsername}`,
		headers: { Authorization: `Bearer ${tokenA}` },
		payload: { status: 'wrongStatus' },
	})
	t.equal(updatedStatus.statusCode, 400, 'invalid status')

	// try to set status of another user
	updatedStatus = await fastify.inject({
		method: 'PUT',
		url: `api/update_online_status/wrongUsername`,
		headers: { Authorization: `Bearer ${tokenA}` },
		payload: { status: 'online' },
	})
	t.equal(updatedStatus.statusCode, 400, 'permission denied')
})

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