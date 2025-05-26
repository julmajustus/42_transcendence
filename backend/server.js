const fs = require('fs')
const path = require('path')
const fastify = require('fastify')({
	logger: true,
	// https: {
	// 	key: fs.readFileSync(path.join(__dirname, '../etc/transcendence/certs', 'ssl.key')), // to uncomment for https
	// 	cert: fs.readFileSync(path.join(__dirname, '../etc/transcendence/certs', 'ssl.crt')) // to uncomment for https
	// }
})

require('./cron');

const fastifyOAuth2 = require('@fastify/oauth2')

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

require('dotenv').config();
const ALLOWED_ORIGINS = [
	'http://localhost:5173',
	process.env.VITE_FRONTEND_URL_FOR_CORS,
].filter(Boolean); // drop any undefined

console.log("allowd origins: ", ALLOWED_ORIGINS)
console.log(process.env.VITE_FRONTEND_URL_FOR_CORS)

fastify.register(require('@fastify/cors'), {
	origin: (origin, cb) => {
		// allow requests like curl or mobile apps with no origin header
		if (!origin) return cb(null, true);

		if (ALLOWED_ORIGINS.includes(origin)) {
			return cb(null, true);
		}
		return cb(new Error(`Origin ${origin} not allowed by CORS`), false);
	},
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
	credentials: true,
});

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
fastify.register(require('@fastify/websocket'))

fastify.register(require('./routes/auth'))

fastify.register(require('./routes/users'))

fastify.register(require('./routes/google'))

fastify.register(require('./routes/game'))

fastify.register(require('./routes/tournaments'))

fastify.register(require('./routes/matchmaking'));

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
}
