const db = require('../db')

const verify2FACode = async(request, reply) => {
	const { code, username } = request.body
	try {
		const user = await new Promise((resolve, reject) => {
			db.get('SELECT id, username, two_fa_code, two_fa_code_expiration FROM users WHERE username = ?', [username], (err, row) => {
				if (err)
					return reject(err)
				resolve(row)
			})
		})

		if (!user) {
			request.log.warn('Invalid username');
			return reply.status(400).send({ error: 'Invalid username' });
		}

		if (user.two_fa_code !== code || Date.now() > user.two_fa_code_expiration) {
			return reply.status(401).send({ error: 'Invalid or expired 2FA code' });
		}
		const now = Math.floor(Date.now() / 1000)
		await new Promise((resolve, reject) => {
			db.run(`UPDATE users
					SET two_fa_code = ?,
						two_fa_code_expiration = ?,
						online_status = ?,
						last_seen = ?,
						google_id = ?
					WHERE id = ?`,
				[null, null, 'online', now, null, user.id],
				(err) => {
				if (err)
					return reject(err)
				resolve()
			})
		})
		const token = await reply.jwtSign({ id: user.id, username: user.username } ,{ expiresIn: '24h'});
		request.log.info(`Generated JWT token for user ${user.username}`);
		return reply.status(200).send({ token });
	} catch (err) {
		request.log.error(`Error during during verification of 2FA code: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

module.exports = {
	verify2FACode,
}