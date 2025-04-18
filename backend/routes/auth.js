const fp = require("fastify-plugin")

module.exports = fp(async function(fastify, opts) {
	// fastify.register(require("@fastify/jwt"), {
		// secret: "supersecret"
	// })

	fastify.decorate("authenticate", async function(request, reply) {
		try {
			await request.jwtVerify()
			return request.user
		} catch (err) {
			reply.send(err)
		}
	})
})