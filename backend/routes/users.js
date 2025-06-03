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
	getUserMatchList,
	getUserStats,
} = require('../handlers/users')

const User = {
	type: 'object',
	properties: {
		id: { type: 'integer' },
		username: { type: 'string' },
		email: { type: 'string' },
		avatar: { type: 'string'},
		online_status: {type : 'string' },
		two_fa: { type: 'integer' },
		google_id: { type: 'integer' }
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
				username: {
					type: 'string',
					minLength: 3,
					maxLength: 20,
					pattern: '^(?!\\d+$)[A-Za-z0-9_]+$'
				},
				password: {
					type: 'string',
					minLength: 8,
					pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$'
				},
				email: {
					type: 'string',
					format: 'email',
				},
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
				username: {
					type: 'string',
					minLength: 3,
					maxLength: 20,
					pattern: '^(?!\\d+$)[A-Za-z0-9_]+$'
				},
				password: {
					type: 'string',
					minLength: 1
				},
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
					currentPassword: {
						type: 'string',
						minLength: 1
					},
					newPassword: {
						type: 'string',
						minLength: 8,
						pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$'
					},
					newUsername: {
						type: 'string',
						minLength: 3,
						maxLength: 20,
						pattern: '^(?!\\d+$)[A-Za-z0-9_]+$'
					},
					twoFA: {
						type: 'integer',
						enum: [0, 1]
					},
					newEmail: {
						type: 'string',
						format: 'email'
					},
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

	const getUserMatchListSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			params: {
				type: 'object',
				properties: {
					username: { type: 'string', }
				},
				required: ['username']
			},
			response: {
			200: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						id:               { type: 'integer' },
						opponent:         { type: 'string' },
						opponentAvatar:   { type: 'string' },
						result:           { type: 'string' },
						score:            { type: 'string' },
						date:             { type: 'string' }
					},
					required: [
						'id',
						'opponent',
						'opponentAvatar',
						'result',
						'score',
						'date'
					]
				}
			},
			404: errorResponse,
			500: errorResponse
			}
		},
		handler: getUserMatchList,
	}

	const getUserStatsSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			params: {
				type: 'object',
				properties: {
					username: { type: 'string', }
				},
				required: ['username']
			},
			response: {
			200: {
				type: 'object',
				properties: {
				totalMatches: { type: 'integer' },
				wins: { type: 'integer' },
				losses: { type: 'integer' },
				winRate: { type: 'integer' },
				totalScored: { type: 'integer' },
				totalConceded: { type: 'integer' },
				tournamentsWon: { type: 'integer' },
				},
				required: [
					'totalMatches',
					'wins',
					'losses',
					'winRate',
					'totalScored',
					'totalConceded',
					'tournamentsWon'
				]
			},
			404: errorResponse,
			500: errorResponse
			}
		},
		handler: getUserStats
	}

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

	fastify.get('/user/:username/matches', getUserMatchListSchema)

	fastify.get('/user/:username/stats', getUserStatsSchema)

	done()
}

module.exports = usersRoutes