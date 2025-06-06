const t = require('tap');
const db = require('../db');
const fastify = require('../server');

// Clear users && friends table before running the tests
t.before(async () => {
	await new Promise((resolve, reject) => {
		db.serialize(() => {
			db.run('DELETE FROM friends', err => {
				if (err) return reject(err);
			});
			db.run('DELETE FROM users', err => {
				if (err) return reject(err);
			});
			db.run("DELETE FROM sqlite_sequence WHERE name = 'friends'", err => {
				if (err) return reject(err);
			});
			db.run("DELETE FROM sqlite_sequence WHERE name = 'users'", err => {
				if (err) return reject(err);
				resolve();
			});
		});
	});
});

t.test('add/remove friends tests', async t => {
	const userA = { username: 'userA', password: 'Qwerty23', email: 'aaa@aaa.aaa'};
	const userB = { username: 'userB', password: 'Qwerty23', email: 'bbb@bbb.bbb' };
	const userC = { username: 'userC', password: 'Qwerty23', email: 'ccc@ccc.ccc' };

	// register userA
	const regA = await fastify.inject({
		method: 'POST',
		url: 'api/user/register',
		payload: userA,
	});
	const userAId = JSON.parse(regA.payload).id;
	const userAUsername = JSON.parse(regA.payload).username;

	// register userB
	const regB = await fastify.inject({
		method: 'POST',
		url: 'api/user/register',
		payload: userB,
	});
	const userBId = JSON.parse(regB.payload).id;

	// register userC
	const regC = await fastify.inject({
		method: 'POST',
		url: 'api/user/register',
		payload: userC,
	});
	const userCId = JSON.parse(regC.payload).id;

	// login userA
	const loginA = await fastify.inject({
		method: 'POST',
		url: 'api/user/login',
		payload: userA,
	});
	const tokenA = JSON.parse(loginA.payload).token;

	// add userB as friend to userA
	const friend1 = await fastify.inject({
		method: 'POST',
		url: 'api/add_friend',
		headers: { Authorization: `Bearer ${tokenA}` },
		payload: { user_id: userAId, friend_id: userBId },
	});
	t.equal(friend1.statusCode, 200, 'friend added succesfully')

	// add userC as friend to userA
	const friend2 = await fastify.inject({
		method: 'POST',
		url: 'api/add_friend',
		headers: { Authorization: `Bearer ${tokenA}` },
		payload: { user_id: userAId, friend_id: userCId },
	});
	t.equal(friend2.statusCode, 200, 'friend added succesfully')
	let users = await fastify.inject({
		method: 'GET',
		url: `api/user/${userAUsername}/friends`
	})
	let friends = JSON.parse(users.payload)
	t.equal(friends.length, 2, 'userA should have 2 friends')
	let friendIds = friends.map(f => f.id).sort()
	t.same(friendIds, [userBId, userCId].sort(), 'Friend IDs should match B and C')
	t.ok(friends[0].friendshipId, 'friendshipId should be included')
	t.ok(friends[1].friendshipId, 'friendshipId should be included')

	// adding a non existing friend
	const nonExistingFriend = await fastify.inject({
		method: 'POST',
		url: 'api/add_friend',
		headers: { Authorization: `Bearer ${tokenA}` },
		payload: { user_id: userAId, friend_id: '9999' },
	});
	t.equal(nonExistingFriend.statusCode, 400, 'not able to add a non existing user')

	// removing userB from friend list of userA
	let friendsBefore = JSON.parse(users.payload)
	let friendshipId = friendsBefore[0].friendshipId
	let removedFriend = await fastify.inject({
		method: 'DELETE',
		url: `api/remove_friend/${friendshipId}`,
		headers: { Authorization: `Bearer ${tokenA}` },
	})
	let usersAfter = await fastify.inject({
		method: 'GET',
		url: `api/user/${userAUsername}/friends`
	})
	let friendsAfter = JSON.parse(usersAfter.payload)
	t.equal(removedFriend.statusCode, 200, 'friend removed successfully')
	let remainingIds = friendsAfter.map(f => f.friendshipId)
	t.notOk(remainingIds.includes(friendshipId), 'removed friend is not in friend list anymore')

	// login userB
	const loginB = await fastify.inject({
		method: 'POST',
		url: 'api/user/login',
		payload: userB,
	});
	const tokenB = JSON.parse(loginB.payload).token;

	// trying to remove a friend from userA friend list with userB login token
	friendshipId = JSON.parse(users.payload)[0].id
	removedFriend = await fastify.inject({
		method: 'DELETE',
		url: `api/remove_friend/${friendshipId}`,
		headers: { Authorization: `Bearer ${tokenB}` },
	})
	t.equal(removedFriend.statusCode, 400, 'not able to remove a friend from another user')

	// trying to add userB as friend of userA with userB login token
	const selfMadeFriend = await fastify.inject({
		method: 'POST',
		url: 'api/add_friend',
		headers: { Authorization: `Bearer ${tokenB}` },
		payload: { user_id: userAId, friend_id: userBId },
	});
	t.equal(selfMadeFriend.statusCode, 400, 'not able to add yourself as friend of another user')

/* 	// trying to add a lot of friends and seeing if the friends list enpoint shows only 10 elements
	const username = 'user'
	const email = `${username}@gmail.com`
	for (let i = 3; i < 25; i++) {
		const current_username = `${username}${i}`;
		const email = `${current_username}@gmail.com`
		await fastify.inject({
			method: 'POST',
			url: 'api/user/register',
			payload: {
				username: current_username,
				password: 'Qwerty23',
				email: email,
			}
		});

		await fastify.inject({
			method: 'POST',
			url: 'api/add_friend',
			headers: { Authorization: `Bearer ${tokenA}` },
			payload: { user_id: userAId, friend_id: i },
		});
	}
	const limitedList = await fastify.inject({
		method: 'GET',
		url: `api/user/${userAUsername}/friends`
	})
	t.equal(JSON.parse(limitedList.payload).length, 10, 'limit of 10 for each page ok') */
})

t.teardown(async () => {
	try {
		await new Promise((resolve, reject) => {
			db.serialize(() => {
				db.run('DELETE FROM friends', err => {
					if (err) return reject(err);
				});
				db.run('DELETE FROM users', err => {
					if (err) return reject(err);
				});
				db.run("DELETE FROM sqlite_sequence WHERE name = 'friends'", err => {
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