const fs = require('fs')
const path = require('path')
const { startGameServer } = require('./game/game_server')
const fastify = require('fastify')({
	logger: true,
	// https: {
		// key: fs.readFileSync(path.join(__dirname, '../etc/transcendence/certs', 'ssl.key')), // to uncomment for https
		// cert: fs.readFileSync(path.join(__dirname, '../etc/transcendence/certs', 'ssl.crt')) // to uncomment for https
	// }
})


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
	routePrefix: '/documentation',
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
	secret: 'supersecret'
})

fastify.register(require('@fastify/static'), {
	root: path.join(__dirname, '/uploads/avatars'),
	prefix: '/avatars/', // optional: default '/'
	// constraints: { host: 'example.com' } // optional: default {}
})

fastify.register(require('@fastify/multipart'))

fastify.register(require('./routes/auth'))

fastify.register(require('./routes/users'))

fastify.register(require('./routes/game'))

module.exports = fastify


const PORT = 8888

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' })
    /* c8 ignore start */
    console.log(`Server listening on http://localhost:${PORT}`)
    /* c8 ignore stop */
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}

if (require.main == module) {
	start()
	startGameServer(9000);
}
