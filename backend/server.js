const fs = require('fs')
const path = require('path')
const fastify = require('fastify')({
	logger: true,
	bodyLimit: 5 * 1024 * 1024 * 1024,
})

require('./cron');

if (process.env.NODE_ENV !== 'test') {
	require('dotenv').config();
	// Check credential works
	try {
		require('dotenv').config();
		console.log("Environment loaded. GOOGLE_CLIENT_ID exists:", !!process.env.GOOGLE_CLIENT_ID);
		console.log(process.env.GOOGLE_CLIENT_ID)
	} catch (error) {
		console.error("Error loading dotenv:", error.message);
	}
}

fastify.register(import('@fastify/swagger'), {
	swagger: {
		securityDefinitions: {
			bearerAuth: {
				type: 'apiKey',
				name: 'Authorization',
				in: 'header',
				description: 'Enter JWT token in the format: Bearer token',
			},
		},
		security: [{ bearerAuth: [] }],
	},
});

fastify.register(import('@fastify/swagger-ui'), {
	routePrefix: '/api/documentation',
	uiConfig: {
		docExpansion: 'full',
		deepLinking: false
	},
	uiHooks: {
		onRequest: function (request, reply, next) { next() },
		preHandler: function (request, reply, next) { next() }
	},
	staticCSP: true,
	transformStaticCSP: (header) => header,
	transformSpecification: (swaggerObject, request, reply) => { return swaggerObject },
	transformSpecificationClone: true
})

fastify.register(require('@fastify/jwt'), {
	secret: process.env.JWT_SECRET || 'supersecret'
})

fastify.register(require('@fastify/static'), {
	root: path.join(__dirname, '/uploads/avatars'),
	prefix: '/avatars/', // optional: default '/'
	// constraints: { host: 'example.com' } // optional: default {}
})

fastify.register(require('@fastify/multipart'), {
	limits: {
		fileSize: 5 * 1024 * 1024 * 1024
	}
})
fastify.register(require('@fastify/websocket'))

fastify.register(require('./routes/auth'), { prefix: '/api' })

fastify.register(require('./routes/users'), { prefix: '/api' })

fastify.register(require('./routes/google'), { prefix: '/api' })

fastify.register(require('./routes/game'), { prefix: '/api' })

fastify.register(require('./routes/tournaments'), { prefix: '/api' })

fastify.register(require('./routes/matchmaking'), { prefix: '/api' });

module.exports = fastify

const PORT = 8888

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' })
    /* c8 ignore start */
    console.log(`Server running on port ${PORT}`)
    /* c8 ignore stop */
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}

if (require.main == module) {
	start()
}
