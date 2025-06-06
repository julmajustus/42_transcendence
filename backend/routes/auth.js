const fp = require("fastify-plugin")
const db = require('../db')
const {
	verify2FACode,
} = require('../handlers/auth')

const errorResponse = {
	type: 'object',
	properties: {
		error: { type: 'string' },
	}
}

const verify2FACodeSchema = {
	schema: {
		body: {
			type: 'object',
			properties: {
				code: { type: 'string'},
				username: { type: 'string'},
			},
			required: ['code', 'username'],
		},
		response: {
			200: {
				type: 'object',
				properties: {
					token: { type: 'string' }
				}
			},
			400: errorResponse,
			401: errorResponse,
			500: errorResponse,
		},
	},
	handler: verify2FACode
}

module.exports = fp(async function(fastify, opts) {
	// fastify.register(require("@fastify/jwt"), {
		// secret: "supersecret"
	// })

	fastify.decorate("authenticate", async function(request, reply) {
		try {
			await request.jwtVerify()
			
			const authHeader = request.headers.authorization
			const token = authHeader.split(' ')[1]
			if (!token)
				return reply.status(400).send({ error: "Missing token" });
			request.token = token

			const blacklisted = await new Promise((resolve, reject) => {
				db.get('SELECT 1 from token_blacklist WHERE token = ?', [token], (err, row) => {
					if (err)
						return reject(err)
					if (!row)
						return resolve(null)
					return resolve(row)
				})
			})
			if (blacklisted)
				return reply.status(401).send({ error: 'Token has been revoked' })
			
			const now = Math.floor(Date.now() / 1000)
			await new Promise((resolve, reject) => {
				db.run('UPDATE users SET last_seen = ? WHERE id = ?',
					[now, request.user.id],
					function (err) {
						if (err)
							return reject(err)
						resolve(this.changes)
					}
				)
			})

			return request.user
		} catch (err) {
			reply.send(err)
		}
	})

	fastify.post('/api/verify_2fa_code', verify2FACodeSchema)
})