const db = require('../db')

const {
	getUsers,
	registerUser,
	getUser,
	getCurrentUser,
	updateUser,
	loginUser,
	logoutUser,
	linkGoogleAccount,
	uploadAvatar,
	getUserAvatar,
	removeAvatar,
	addFriend,
	updateOnlineStatus,
	getUserFriends,
	removeFriend,
	checkPassword,
} = require('../handlers/users')

const User = {
	type: 'object',
	properties: {
		id: { type: 'integer' },
		username: { type: 'string' },
		email: { type: 'string' },
		avatar: { type: 'string'},
		online_status: {type : 'string' },
		two_fa: { type: 'integer' }
	}
}

const errorResponse = {
	type: 'object',
	properties: {
		error: { type: 'string' },
	}
}

const successResponse = {
	type: 'object',
	properties: {
		message: { type: 'string' },
	}
}

const getUsersSchema = {
	schema: {
		response: {
			200: {
				type: 'array',
				items: User,
			},
			404: errorResponse,
			500: errorResponse,
		},
	},
	handler: getUsers
}

const getUserSchema = {
	schema: {
		response: {
			200: User,
			404: errorResponse,
			500: errorResponse,
		},
	},
	handler: getUser
}

const registerUserSchema = {
	schema: {
		body: {
			type: 'object',
			properties: {
				username: { type: 'string'},
				password: { type: 'string'},
				email: { type: 'string' },
			},
			required: ['username', 'password', 'email' ],
		},
		response: {
			200: User,
			400: errorResponse,
			500: errorResponse,
		},
	},
	handler: registerUser
}

const loginUserSchema = {
	schema: {
		body: {
			type: 'object',
			properties: {
				username: { type: 'string'},
				password: { type: 'string'},
			},
			required: ['username', 'password']
		},
		response: {
			200: {
				anyOf: [
					{
						type: 'object',
						properties: {
							token: { type: 'string' }
						},
						required: ['token'],
					},
					successResponse
				]
			},
			400: errorResponse,
			500: errorResponse,
		},
	},
	handler: loginUser
}

const getUserAvatarSchema = {
	schema: {
		response: {
			200: {
				type: 'object',
				properties: {
					file: {
						type: 'string',
						example: 'username_default.png' },
				}
			},
			404: errorResponse,
			500: errorResponse
		}
	},
	handler: getUserAvatar
}

const getUserFriendsSchema = {
	schema: {
		querystring: {
			type: 'object',
			properties: {
				page: { type: 'integer', default: 1 },
				limit: { type: 'integer', default: 10 }
			}
		},
		response: {
			200: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						id: { type: 'integer' },
						username: { type: 'string' },
						avatar: { type: 'string' },
						online_status: { type: 'string' },
						friendshipId: { type: 'integer' }
					}
				}
			},
			404: errorResponse,
			500: errorResponse
		}
	},
	handler: getUserFriends
}

const checkPasswordSchema = {
	schema: {
		body: {
			type: 'object',
			properties: {
				selected: { type: 'string' },
				password: { type: 'string' },
			},
			required: [ 'selected', 'password' ],
		},
		response: {
			200: {
				type: 'object',
				properties: {
					ok: { type: 'boolean' },
				},
				required: ['ok'],
			},
			404: errorResponse,
			500: errorResponse,
		},
		security: [{ bearerAuth: [] }],
	},
	handler: checkPassword,
};

function usersRoutes(fastify, options, done) {

	const logoutUserSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: successResponse,
				400: errorResponse,
				401: errorResponse,
			},
			security: [{ bearerAuth: [] }],
		},
		handler: logoutUser
	}

	const updateUserSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			body: {
				type: 'object',
				properties: {
					currentPassword: { type: 'string' },
					newPassword: { type: 'string' },
					newUsername: { type: 'string' },
					twoFA: { type: 'integer'},
					newEmail: { type: 'string' },
				},
				required: ['currentPassword'],
				anyOf: [
					{ required: ['newPassword'] },
					{ required: ['newUsername'] },
					{ required: ['twoFA'] },
					{ required: ['newEmail'] },
				],
			},
			response: {
				200: successResponse,
				404: errorResponse,
				500: errorResponse,
			},
			security: [{ bearerAuth: [] }],
		},
		handler: updateUser
	};

	const uploadAvatarSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: {
					type: 'object',
					properties: {
						message: { type: 'string' }
					}
				},
				400: errorResponse,
				500: errorResponse,
			},
			security: [{ bearerAuth: [] }],
		},
		handler: uploadAvatar
	}

	const removeAvatarSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: {
					type: 'object',
					properties: {
						message: { type: 'string' }
					}
				},
				400: errorResponse,
				500: errorResponse,
			},
			security: [{ bearerAuth: [] }],
		},
		handler: removeAvatar
	}

	const addFriendSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			body: {
				type: 'object',
				properties: {
					user_id: { type: 'integer' },
					friend_id: { type: 'integer' },
				},
				required: [ 'user_id', 'friend_id' ],
			},
			response: {
				200: successResponse,
				400: errorResponse,
				409: errorResponse,
				500: errorResponse
			},
			security: [{ bearerAuth: [] }],
		},
		handler: addFriend
	}

	const removeFriendSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: successResponse,
				400: errorResponse,
				500: errorResponse
			},
			security: [{ bearerAuth: [] }],
		},
		handler: removeFriend
	}

	const updateOnlineStatusSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			body: {
				type: 'object',
				properties: {
					status: { type: 'string' },
				},
				required: [ 'status' ],
			},
			response: {
				200: successResponse,
				400: errorResponse,
				500: errorResponse,
			},
			security: [{ bearerAuth: [] }],
		},
		handler: updateOnlineStatus,
	};

	const getCurrentUserSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: User,
				404: errorResponse,
				500: errorResponse,
			},
			security: [{ bearerAuth: [] }],
		},
		handler: getCurrentUser,
	};

	fastify.get('/users', getUsersSchema)

	fastify.get('/user/:username', getUserSchema)

	fastify.post('/user/register', registerUserSchema)

	fastify.post('/user/login', loginUserSchema)

	fastify.post('/user/logout', logoutUserSchema)

	fastify.put('/user/:username/update', updateUserSchema)

	fastify.get('/user/:username/avatar', getUserAvatarSchema)

	fastify.put('/user/:username/upload_avatar', uploadAvatarSchema)

	fastify.put('/user/:username/remove_avatar', removeAvatarSchema)

	fastify.post('/add_friend', addFriendSchema)

	fastify.get('/user/:username/friends', getUserFriendsSchema)

	fastify.delete('/remove_friend/:friendshipId', removeFriendSchema)

	fastify.put('/update_online_status/:username', updateOnlineStatusSchema)

	fastify.get('/user/me', getCurrentUserSchema);

	fastify.post('/check_password', checkPasswordSchema)

	fastify.get('/user/:username/matches', async (request, reply) => {
		const { username } = request.params;

		try {
		// 1) Look up user ID by username
			const userRow = await new Promise((res, rej) =>
				db.get('SELECT id FROM users WHERE username = ?', [username],
					(err, row) => err ? rej(err) : res(row)
				)
			);

			if (!userRow) {
				return reply.status(404).send({ error: 'User not found' });
			}
			const userId = userRow.id;

			// 2) Fetch all finished matches involving that user
			const matches = await new Promise((res, rej) =>
				db.all(
					`SELECT
						id,
						player1_id,
						player2_id,
						player1_score,
						player2_score,
						winner_id,
						loser_id,
						match_time
					FROM matches
					WHERE
						(player1_id = ? OR player2_id = ?)
						AND status = 'finished'
					ORDER BY match_time DESC`,
					[userId, userId],
					(err, rows) => err ? rej(err) : res(rows)
				)
			);

			// 3) Optionally post-process each row to add “opponent” and “didWin” flags
			const result = await Promise.all(matches.map(async (m) => {
				const isPlayer1 = m.player1_id === userId;
				let opponentId = isPlayer1 ? m.player2_id : m.player1_id;
				const userScore = isPlayer1 ? m.player1_score : m.player2_score;
				const oppScore = isPlayer1 ? m.player2_score : m.player1_score;
				const result = m.winner_id === userId ? 'win' : 'loss';

				const row = await new Promise ((res, rej) => {
					db.get('SELECT username, avatar FROM users where id = ?', [opponentId],
						(err, row) => err ? rej(err) : res(row)
					)
				})
				const opponent = row ? row.username : null
				// const opponentAvatar = row ? row.avatar : null
				const backendAddress = process.env.VITE_BACKEND_HOST || 'localhost'
				const opponentAvatar = `http://${backendAddress}:8888/user/${opponent}/avatar`

				return {
					id: m.id,
					opponent: opponent,
					opponentAvatar: opponentAvatar,
					result: result,
					score: `${userScore}-${oppScore}`,
					date: m.match_time,
				};
			}));

			return reply.send(result);
		} catch (err) {
			request.log.error(`Error fetching matches for ${username}: ${err.stack}`);
			return reply.status(500).send({ error: 'Internal server error' });
		}
	});

	fastify.get('/user/:username/stats', async(request, reply) => {
		const { username } = request.params;

		try {
			const userRow = await new Promise((res, rej) =>
				db.get('SELECT id FROM users WHERE username = ?', [username],
					(err, row) => err ? rej(err) : res(row)
				)
			);

			if (!userRow) {
				return reply.status(404).send({ error: 'User not found' });
			}
			const userId = userRow.id;

			const rows = await new Promise((res, rej) =>
				db.all(
					`SELECT
						player1_id,
						player2_id,
						player1_score,
						player2_score,
						winner_id
					FROM matches
					WHERE
						(player1_id = ? OR player2_id = ?)
						AND status = 'finished'
					ORDER BY match_time DESC`,
					[userId, userId],
					(err, rows) => err ? rej(err) : res(rows)
				)
			)
			const rowsTournament = await new Promise((res, rej) => {
				db.all('SELECT id FROM tournaments WHERE winner_id = ?', [userId],
					(err, rowsTournament) => err ? rej(err) : res(rowsTournament)
				)
			})
			const tournamentsWon = rowsTournament ? rowsTournament.length : 0
			const totalMatches = rows.length
			let wins = 0
			let totalScored = 0
			let totalConceded = 0

			for (const m of rows) {
				if (m.winner_id === userId)
					wins++
				const isPlayer1 = m.player1_id === userId;
				const scored =  isPlayer1 ? m.player1_score : m.player2_score
				const conceded = isPlayer1 ? m.player2_score : m.player1_score
				totalScored += scored
				totalConceded += conceded
			}
			const losses = totalMatches - wins
			const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0
			return reply.status(200).send({
				totalMatches,
				wins,
				losses,
				winRate,
				totalScored,
				totalConceded,
				tournamentsWon
			})
		} catch (err) {
			request.log.error(`Error fetching matches for ${username}: ${err.stack}`);
			return reply.status(500).send({ error: 'Internal server error' });
		}

	})

	done()
}

module.exports = usersRoutes