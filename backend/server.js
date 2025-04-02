const fastify = require('fastify')({ logger: true })

fastify.register(import('@fastify/swagger'))

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
fastify.register(require('./routes/users'))

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
