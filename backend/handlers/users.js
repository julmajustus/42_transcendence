const db = require('../db')
const bcrypt = require('bcryptjs')
const fs = require('fs')
const path = require('path')
const { pipeline } = require('node:stream/promises')
const sharp = require('sharp');

const getUsers = (request, reply) => {
	db.all('SELECT id, username FROM users', [], (err, rows) => {
		if (err) {
			request.log.error(`Error fetching users: ${err.message}`);
			return reply.status(500).send({error: 'Database error: ' +  + err.message });
		}
		if (rows.length === 0) {
			request.log.warn('No users in database')
			return reply.status(404).send({error: 'No users found'})
		}
		return reply.send(rows);
	})
}

const getUser = (request, reply) => {
	const { id } = request.params
	db.get('SELECT * from users WHERE id = ?', [id], (err, row) => {
		if (err) {
			request.log.error(`Error fetching user: ${err.message}`);
			return reply.status(500).send({ error: 'Database error: ' + err.message });
		}
		if (!row) {
			request.log.warn(`User with id ${id} not found`)
			return reply.status(404).send({error: `User with id ${id} not found`})
		}
		return reply.send(row)
	})
}

const registerUser = async (request, reply) => {
	const { username, password } = request.body;
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

		const hashedPassword = await bcrypt.hash(password, 10);
		// console.log(hashedPassword);
		let fileName
		try {
			const avatarResponse = await fetch(`https://aapi.dicebear.com/9.x/fun-emoji/svg?seed=${username}`)
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
			password: hashedPassword,
			avatar: fileName,
		};

		const userId = await new Promise((resolve, reject) => {
			db.run(
				'INSERT INTO users (username, password, avatar) VALUES (?, ?, ?)',
				[newUser.username, newUser.password, newUser.avatar],
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
		});

	} catch (err) {
		request.log.error(`Error: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
};

const loginUser = async (request, reply) => {
	const { username, password } = request.body;
	request.log.info(`Received login request from: ${username}`);
	try {
		const user = await new Promise((resolve, reject) => {
			db.get('SELECT id, username, password FROM users WHERE username = ?', [username], (err, user) => {
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

		const token = await reply.jwtSign({ id: user.id, username: user.username } ,{ expiresIn: '24h'});
		request.log.info(`Generated JWT token for user ${user.username}`);

		return reply.send({ token });
	} catch (err) {
		request.log.error(`Error during login: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
};

const updateUser = async (request, reply) => {
	const { currentPassword, newPassword, newUsername } = request.body
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
		request.log.info(`User with ID ${userId} updated successfully`);
		return reply.status(200).send({ message: 'User credentials updated successfully'})
	} catch (err) {
		request.log.error(`Error updting user credentials: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

const linkGoogleAccount = async (request, reply) => {
	const { email, google_id } = request.body
	const userId = request.user.id
	try {
		const existingGoogleUser = await new Promise((resolve, reject) => {
			db.get('SELECT * FROM users WHERE google_id = ?', [google_id], (err, row) => {
				if (err)
					return reject(err);
				resolve(row);
			})
		})
		if (existingGoogleUser) {
			request.log.warn('This Google account is already linked with another user')
			return reply.status(400).send({ error: 'This Google account is already linked with another user'})
		}
		if (request.params.username != request.user.username) {
			request.log.warn(`${request.user.username} is trying to update ${request.params.username}`)
			return reply.status(400).send({ error: `You don't have permission to modify ${request.params.username}` });
		}
		await new Promise((resolve, reject) => {
			db.run('UPDATE users SET email = ?, google_id = ? WHERE id = ?', [email, google_id, userId], function (err) {
				if (err)
					return reject(err);
				resolve(this.changes);
			})
		})
		request.log.info('Google account linked successfully')
		return reply.status(200).send({ message: 'Google account linked successfully'})
	} catch (err) {
		request.log.error(`Error linking google account: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

const uploadAvatar = async (request, reply) => {
	const data = await request.file()
	const allowedMimeTypes = [ 'image/png', 'image/jpeg' ]
	try {
		if (!allowedMimeTypes.includes(data.mimetype))
			return reply.status(400).send({ error: 'Invalid file format. Only PNG and JPEG are allowed.' })

		if (data.file.bytesRead > 2 * 1024 * 1024)
			return reply.status(400).send({ error: 'File is too large. Maximum size is 2MB.' })

		const fileName = `${request.user.username}_custom.${data.mimetype.split('/')[1]}`
		const filePath = path.join(__dirname, '../uploads/avatars', fileName)

		if (request.params.username != request.user.username) {
			request.log.warn(`${request.user.username} is trying to update ${request.params.username}`)
			return reply.status(400).send({ error: `You don't have permission to modify ${request.params.username}` });
		}

		await pipeline(
			data.file,
			sharp().resize(256, 256, { fit: 'inside' }),
			fs.createWriteStream(filePath)
		)
		
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

module.exports = {
	getUsers,
	registerUser,
	getUser,
	updateUser,
	loginUser,
	linkGoogleAccount,
	uploadAvatar,
	getUserAvatar,
	removeAvatar,
}