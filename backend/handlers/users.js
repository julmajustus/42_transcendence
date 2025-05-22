const db = require('../db')
const bcrypt = require('bcryptjs')
const fs = require('fs')
const path = require('path')
// const { pipeline } = require('node:stream/promises')
const sharp = require('sharp');
const nodemailer = require('nodemailer')
const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.TWOFA_GMAIL_USER,
		pass: process.env.TWOFA_GMAIL_PASSWORD
	}
})

const getUsers = (request, reply) => {
	db.all('SELECT id, username, email FROM users', [], (err, rows) => {
		if (err) {
			request.log.error(`Error fetching users: ${err.message}`);
			return reply.status(500).send({error: 'Database error: ' + err.message });
		}
		if (rows.length === 0) {
			request.log.warn('No users in database')
			return reply.status(404).send({error: 'No users found'})
		}
		return reply.send(rows);
	})
}

// modified the get user to be able to fetch also with userId
const getUser = (request, reply) => {
  const identifier = request.params.username 
  const isId = /^\d+$/.test(identifier)

  const sql = isId ? 'SELECT * FROM users WHERE id = ?' : 'SELECT * FROM users WHERE username = ?'
  const value = isId ? Number(identifier) : identifier
	db.get(sql, [value], (err, row) => {
		if (err) {
			request.log.error(`Error fetching user: ${err.message}`);
			return reply.status(500).send({ error: 'Database error: ' + err.message });
		}
		if (!row) {
			request.log.warn(`User ${identifier} not found`)
			return reply.status(404).send({error: `User ${identifier} not found`})
		}
		// row.avatar = `http://localhost:8888/user/${row.username}/avatar`
		return reply.send(row)
	})
}

const registerUser = async (request, reply) => {
	const { username, email, password } = request.body;
	request.log.info(`Received registration request: ${username}`);
	try {
		const existingUser = await new Promise((resolve, reject) => {
			db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
				if (err) return reject(err);
					resolve(row);
			});
		});

		if (existingUser) {
			request.log.warn('User with this username already exists');
			return reply.status(400).send({ error: "User with this username already exists" });
		}

		const existingEmail = await new Promise((resolve, reject) => {
			db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
				if (err) return reject(err);
				resolve(row);
			});
		});

		if (existingEmail) {
			request.log.warn('User with this email already exists');
			return reply.status(400).send({ error: "Email address already registered. Please login or use a different email." });
		  }

		const hashedPassword = await bcrypt.hash(password, 10);
		// console.log(hashedPassword);
		let fileName
		try {
			const avatarResponse = await fetch(`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${username}`)
			if (!avatarResponse.ok)
				throw new Error('External avatar API returned an error')
			const svg = await avatarResponse.text()
			fileName = `${username}_default.png`
			const filePath = path.join(__dirname, '../uploads/avatars', fileName)
			await sharp(Buffer.from(svg)).resize(256, 256).png().toFile(filePath)
			request.log.info('Default avatar downloaded and converted to PNG');
		} catch (avatarError) {
			request.log.error(`Avatar generation failed: ${avatarError.message}. Using fallback avatar.`)
			fileName = 'fallback.jpeg'
		}

		const newUser = {
			username,
			email,
			password: hashedPassword,
			avatar: fileName,
		};

		const userId = await new Promise((resolve, reject) => {
			db.run(
				'INSERT INTO users (username, email, password, avatar, online_status, two_fa) VALUES (?, ?, ?, ?, ?, ?)',
				[newUser.username, newUser.email, newUser.password, newUser.avatar, 'offline', false],
				function (err) {
					if (err) return reject(err);
						resolve(this.lastID);
				}
			);
		});

		request.log.info('User registered successfully');
		return reply.status(200).send({
			id: userId,
			username: newUser.username,
			email: newUser.email
		});

	} catch (err) {
		request.log.error(`Error: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
};

const loginUser = async (request, reply) => {
	const { username, password } = request.body;
	request.log.info(`Received login request from: ${username}`);

	// const skip2fa = process.env.NODE_ENV !== 'prod'
	try {
		const user = await new Promise((resolve, reject) => {
			db.get('SELECT id, username, password, email FROM users WHERE username = ?', [username], (err, user) => {
				if (err)
					return reject(err);
				resolve(user);
			});
		});

		if (!user) {
			request.log.warn('Invalid username or password');
			return reply.status(400).send({ error: 'Invalid username or password' });
		}

		const match = await bcrypt.compare(password, user.password);
		if (!match) {
			request.log.warn('Password mismatch');
			return reply.status(401).send({ error: 'Invalid credentials' });
		}

		const loginWith2FA = await new Promise ((resolve, reject) => {
			db.get('SELECT two_fa FROM users WHERE username = ?', [username], (err, loginWith2FA) => {
				if (err)
					return reject(err)
				resolve(loginWith2FA)
			})
		})

		// in tests a token is generated at login without 2FA
		// if (skip2fa) {
		if (Number(loginWith2FA.two_fa) === 0) {
			const token = await reply.jwtSign({ id: user.id, username: user.username } ,{ expiresIn: '24h'});
			request.log.info(`Generated JWT token for user ${user.username}`);

			const now = Math.floor(Date.now() / 1000)
			await new Promise((resolve, reject) => {
				db.run('UPDATE users SET online_status = ?, last_seen = ? WHERE id = ?', ['online', now, user.id], (err) => {
					if (err)
						return reject(err)
					resolve()
				})
			})
			return reply.send({ token });
		} else {

			const code = Math.floor(100000 + Math.random() * 900000).toString();
			/*
			Math.random() -> generates a random number between 0 and 1
			Math.random() * 900000 -> scales that number between 0 and 899999.999....
			100000 + Math.random() * 900000 -> shifts the range up to 100000 - 999999.999...
			*/
			await new Promise((resolve, reject) => {
				db.run('UPDATE users SET two_fa_code = ?, two_fa_code_expiration = ? WHERE username = ?',
					[
						code,
						Date.now() + 5 * 60 * 1000,
						username,
					],
					(err) => {
						if (err)
							reject (err)
						return resolve()
					}
				)
			})
			const info = await transporter.sendMail({
				from: `"Transcendence" <${process.env.TWOFA_GMAIL_USER}>`,
				to: user.email,
				subject: '2FA Code',
				text: `Your 2FA code is: ${code}`,
				html: `<p>Your 2FA code is: <b>${code}</b></p>`,
			})
			console.log("Message sent: %s", info.messageId);
			return reply.status(200).send({ message: '2FA code sent' });
		}
	} catch (err) {
		request.log.error(`Error during login: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
};

const logoutUser = async(request, reply) => {
	try{
		const userId = request.user.id
		const token = request.token

		const decoded = request.jwtDecode(token)
		const expiresAt = decoded.exp
		// console.log(`expires at: ${expiresAt}`)
		// const now = Math.floor(Date.now() / 1000)
		// console.log(`now = ${now}`)
		// console.log(`real time = ${(expiresAt - now) / 60 / 60}`)

		await new Promise((resolve, reject) => {
			db.run('INSERT INTO token_blacklist (token, expiration) VALUES (?, ?)', [token, expiresAt], (err) => {
				if (err)
					return reject(err)
				resolve()
			})
		})

		await new Promise((resolve, reject) => {
			db.run('UPDATE users SET online_status = ? where id = ?', ['offline', userId], (err) => {
				if (err)
					return reject(err)
				return resolve()
			})
		})

		return reply.status(200).send({ message: 'Logged out successfully' });
	} catch (err) {
		request.log.warn('Invalid token')
		return reply.status(401).send({ error: 'Invalid token' });
	}
}

const updateUser = async (request, reply) => {
	const { currentPassword, newPassword, newUsername, twoFA, newEmail } = request.body
	const userId = request.user.id
	request.log.info(`Received update credentials request from: ${request.user.username}`);
	try {
		const user = await new Promise((resolve, reject) => {
			db.get('SELECT id, username, password FROM users WHERE id = ?', [userId], (err, user) => {
				if (err)
					return reject(err);
				resolve(user);
			});
		})

		if (!user) {
			request.log.warn('User not found');
			return reply.status(400).send({ error: 'User not found' });
		}

		const match = await bcrypt.compare(currentPassword, user.password);
		if (!match) {
			request.log.warn('Password mismatch');
			return reply.status(401).send({ error: 'Current password is not correct' });
		}

		if (request.params.username != request.user.username) {
			request.log.warn(`${request.user.username} is trying to update ${request.params.username}`)
			return reply.status(400).send({ error: `You don't have permission to modify ${request.params.username}` });
		}

		if (newPassword) {
			const hashedPassword = await bcrypt.hash(newPassword, 10);
			await new Promise((resolve, reject) => {
				db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], function (err) {
					if (err)
						return reject(err)
					resolve(this.changes)
				})
			})
		}

		if (twoFA !== 'undefined') {
			await new Promise((resolve, reject) => {
				db.run('UPDATE users SET two_fa = ? WHERE id = ?', [twoFA, userId], function (err) {
					if (err)
						return reject(err)
					resolve(this.changes)
				})
			})
		}

		if (newUsername) {
			const existingUser = await new Promise((resolve, reject) => {
				db.get('SELECT * FROM users WHERE username = ?', [newUsername], (err, row) => {
					if (err) return reject(err);
						resolve(row);
				});
			});

			if (existingUser) {
				request.log.warn('User with this username already exists');
				return reply.status(400).send({ error: "User with this username already exists" });
			}

			await new Promise((resolve, reject) => {
				db.run('UPDATE users SET username = ? WHERE id = ?', [newUsername, userId], function (err) {
					if (err)
						return reject(err)
					resolve(this.changes)
				})
			})
		}

		if (newEmail) {
			const existingEmail = await new Promise((resolve, reject) => {
				db.get('SELECT * FROM users WHERE email = ?', [newEmail], (err, row) => {
					if (err) return reject(err);
						resolve(row);
				});
			});

			if (existingEmail) {
				request.log.warn('User with this email already exists');
				return reply.status(400).send({ error: "User with this email already exists" });
			}

			await new Promise((resolve, reject) => {
				db.run('UPDATE users SET email = ? WHERE id = ?', [newEmail, userId], function (err) {
					if (err)
						return reject(err)
					resolve(this.changes)
				})
			})
		}

		request.log.info(`User with ID ${userId} updated successfully`);
		return reply.status(200).send({ message: 'User credentials updated successfully'})
	} catch (err) {
		request.log.error(`Error updting user credentials: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

const uploadAvatar = async (request, reply) => {
	const data = await request.file()
	const chunks = []
	for await (const chunk of data.file) {
		chunks.push(chunk)
	}
	const fileBuffer = Buffer.concat(chunks)
	const allowedMimeTypes = [ 'image/png', 'image/jpeg' ]
	try {
		if (!allowedMimeTypes.includes(data.mimetype))
			return reply.status(400).send({ error: 'Invalid file format. Only PNG and JPEG are allowed.' })

		// console.log(fileBuffer.length)
		if (fileBuffer.length >= 1 * 1024 * 1024)
			return reply.status(400).send({ error: 'File is too large. Maximum size is 1MB.' })

		const fileName = `${request.user.username}_custom.${data.mimetype.split('/')[1]}`
		const filePath = path.join(__dirname, '../uploads/avatars', fileName)

		if (request.params.username != request.user.username) {
			request.log.warn(`${request.user.username} is trying to update ${request.params.username}`)
			return reply.status(400).send({ error: `You don't have permission to modify ${request.params.username}` });
		}

		await sharp(fileBuffer).resize(256, 256, { fit: 'inside' }).toFile(filePath)
/* 		await pipeline(
			data.file,
			sharp().resize(256, 256, { fit: 'inside' }),
			fs.createWriteStream(filePath)
		) */

		await new Promise((resolve, reject) => {
			db.run('UPDATE users SET avatar = ? WHERE username = ?',
				[fileName, request.user.username],
				(err) => {
					if (err)
						return reject(err)
					resolve()
				}
			)
		})
		request.log.info('avatar uploaded succesfully')
		return reply.status(200).send({ message: 'avatar uploaded succesfully'})
	} catch (err) {
		request.log.error(`Error uploading avatar: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

const getUserAvatar = async (request, reply) => {
	const userName = request.params.username;
	try {
		const user = await new Promise((resolve, reject) => {
			db.get('SELECT avatar FROM users WHERE username = ?', [userName], (err, row) => {
				if (err) return reject(err);
					resolve(row);
				}
			);
		});
		if (!user) {
			return reply.status(404).send({ error: 'User not found' });
		}
		return reply.sendFile(user.avatar)
	} catch (err) {
		request.log.error(`Error fetching avatar: ${err.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
}

const removeAvatar = async (request, reply) => {
	try {
		if (request.params.username != request.user.username) {
			request.log.warn(`${request.user.username} is trying to update ${request.params.username}`)
			return reply.status(400).send({ error: `You don't have permission to modify ${request.params.username}` });
		}
		defaultAvatar = `${request.user.username}_default.png`
		await new Promise((resolve, reject) => {
			db.run('UPDATE users SET avatar = ? WHERE username = ?', [defaultAvatar, request.user.username], (err) => {
				if (err)
					return reject(err)
				resolve()
			})
		})
		request.log.info('avatar removed succesfully')
		return reply.status(200).send({ message: 'avatar removed succesfully'})
	} catch (err) {
		request.log.error(`Error removing avatar: ${err.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
}

const addFriend = async (request, reply) => {
	const { user_id, friend_id } = request.body
	const userId = request.user.id
	try{
		if (user_id === friend_id)
			return reply.status(400).send({ error: "Can't add youself as friend" })
		if (user_id !== userId)
			return reply.status(400).send({ error: `You don't have permission to modify another user` });
		await new Promise ((resolve, reject) => {
			db.run('INSERT INTO friends (user_id, friend_id) VALUES (?, ?)', [user_id, friend_id], (err) => {
				if (err)
					return reject(err)
				resolve ()
			})
		})
		return reply.status(200).send({ message: 'Friend added!' });
	} catch (err) {
		if (err.message.includes('FOREIGN KEY constraint failed'))
			return reply.status(400).send({ error: 'User or friend not found' });
		if (err.message.includes('UNIQUE constraint failed'))
			return reply.status(409).send({ error: 'You are already friends with this user' });
		request.log.error(`Error adding friend: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

const getUserFriends = async (request, reply) => {
	const username = request.params.username
	const { page = 1, limit = 10 } = request.query
	const offset = (page - 1) * limit
	try {
		const user = await new Promise((resolve, reject) => {
			db.get('SELECT id FROM users WHERE username = ?', [username],
				(err, row) => {
					if (err)
						return reject(err)
					if (!row)
						resolve(null)
					resolve(row)
				}
			)
		})
		if (!user)
			return reply.status(404).send({ error: 'User not found' });

		const friendsList = await new Promise((resolve, reject) => {
			db.all('SELECT id, user_id, friend_id FROM friends WHERE user_id = ? LIMIT ? OFFSET ?', [user.id, limit, offset],
				(err, rows) => {
					if (err)
						return reject(err)
					resolve(rows)
				}
			)
		})

		const friendsPromises = friendsList.map(friend=>{
			return new Promise((resolve, reject)=>{
				db.get(
					'SELECT id, username, avatar, online_status FROM users WHERE id  = ?',
					[friend.friend_id],
					(err, friendData) => {
						if (err) return reject(err)
						if (friendData) friendData.friendshipId = friend.id
						resolve(friendData)
					}
				)
			})
		})
		const friends = await Promise.all(friendsPromises)
		return reply.send(friends)
	} catch (err) {
		request.log.error(`Error fetching friends: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

const removeFriend = async(request, reply) => {
	const { friendshipId } = request.params
	const userId = request.user.id
	try {
		const user = await new Promise((resolve, reject) => {
			db.get('Select user_id FROM friends WHERE id = ?', [friendshipId], (err, row) => {
				if (err)
					return reject(err)
				resolve(row)
			})
		})
		if (user.user_id !== userId)
			return reply.status(400).send({ error: `You don't have permission to modify another user` });
		await new Promise((resolve, reject) => {
			db.run('DELETE FROM friends WHERE id = ?', [friendshipId], function (err) {
				if (err)
					return reject(err)
				if (this.changes === 0)
					return reject(new Error('Friendship not found'))
				resolve()
			})
		})
		return reply.status(200).send({ message: 'friend removed' })
	} catch (err) {
		if (err.message === 'Friendship not found')
			return reply.status(404).send({ error: 'Friendship not found' });
		request.log.error(`Error removing friend: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

const updateOnlineStatus = async (request, reply) => {
	const username = request.params.username
	const { status } = request.body
	const allowedStatus = [ 'online', 'offline', 'away']
	if (!allowedStatus.includes(status))
		return reply.status(400).send({ error: 'Invalid status' })
	if (request.params.username != request.user.username) {
		request.log.warn(`${request.user.username} is trying to update ${request.params.username}`)
		return reply.status(400).send({ error: `You don't have permission to modify ${request.params.username}` });
	}
	try {
		const userId = await new Promise((resolve, reject) => {
			db.get('SELECT id FROM users WHERE username = ?',
				[username],
				(err, row) => {
					if (err)
						return reject(err)
					if (!row) {
						request.log.warn(`User not found`)
						return reply.status(404).send({error: `User not found`})
					}
					resolve(row.id)
				}
			)
		})
		await new Promise((resolve, reject) => {
			db.run('UPDATE users SET online_status = ? WHERE id = ?',
				[status, userId],
				(err) => {
				if (err)
					return reject(err)
				resolve()
				}
			)
		})
		return reply.status(200).send({ message: 'online status updated succesfully'})
	} catch (err) {
		request.log.error(`Error updating user online tatus: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

const getCurrentUser = async (request, reply) => {
	const userId = request.user.id;
	try {
		const user = await new Promise((resolve, reject) => {
			db.get(
				'SELECT id, username, email, avatar, online_status, two_fa FROM users WHERE id = ?',
				[userId],
				(err, row) => {
					if (err) return reject(err);
					resolve(row);
				}
			);
		});

		if (!user) {
			request.log.warn(`User with ID ${userId} not found`);
			return reply.status(404).send({ error: 'User not found' });
		}

		return reply.send(user);
	} catch (err) {
		request.log.error(`Error fetching current user: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
};

const checkPassword = async(request, reply) => {
	const username = request.body.selected
	const inPwd = request.body.password
	console.log(username)
	console.log(inPwd)
	try {
		const storedPwd = await new Promise((resolve, reject) => {
			db.get('SELECT password FROM users WHERE username = ?', [username], (err, row) => {
				if (err)
					return reject(err)
				if (!row)
					return resolve(null)
				resolve(row.password)
			})
		})
		if (storedPwd === null) {
			return reply.status(404).send({ error: 'User not found' });
		}
		// Use bcrypt to compare the plain‑text input to the stored hash
		const passwordsMatch = await bcrypt.compare(inPwd, storedPwd);
		if (!passwordsMatch) {
			return reply.status(401).send({ error: 'Invalid password' });
		}
		// If we get here, the password is correct:
		return reply.send({ ok: true });
	} catch (err) {
		request.log.error(`Error checking password for ${username}: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

const getUserMatchList = async (request, reply) => {
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
			// const opponentAvatar = `http://${backendAddress}:8888/user/${opponent}/avatar`
			const opponentAvatar = `api/user/${opponent}/avatar`

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
}

const getUserStats = async(request, reply) => {
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
}

module.exports = {
	getUsers,
	registerUser,
	getUser,
	getCurrentUser,
	updateUser,
	loginUser,
	logoutUser,
	uploadAvatar,
	getUserAvatar,
	removeAvatar,
	addFriend,
	updateOnlineStatus,
	getUserFriends,
	removeFriend,
	checkPassword,
	getUserMatchList,
	getUserStats
}
