const { googleOAuthHandler } = require('../handlers/google')
const db = require('../db')

const errorResponse = {
	type: 'object',
	properties: {
	  error: { type: 'string' },
	}
  }

  const messageResponse = {
	type: 'object',
	properties: {
	  message: { type: 'string' },
	}
  }

  const messageErrorResponse = {
	type: 'object',
	properties: {
	  message: { type: 'string' },
	  error: { type: 'string' }
	}
  }

  const googleCallbackSchema = {
	schema: {
	  response: {
		200: {
		  type: 'object',
		  properties: {
			token: { type: 'string' }
		  }
		},
		400: errorResponse,
		500: errorResponse,
	  }
	},
	handler: googleOAuthHandler
  }

function googleRoutes(fastify, options, done) {
  // Register OAuth2 with Google configuration
  if (process.env.NODE_ENV !== 'test') {   // Skip OAuth registration in test environment
    fastify.register(require('@fastify/oauth2'), {
      name: 'googleOAuth2',
      credentials: {
        client: {
          id: process.env.GOOGLE_CLIENT_ID,
          secret: process.env.GOOGLE_CLIENT_SECRET,
        },
        auth: {
          authorizeHost: 'https://accounts.google.com',
          authorizePath: '/o/oauth2/v2/auth',
          tokenHost: 'https://www.googleapis.com',
          tokenPath: '/oauth2/v4/token',
        },
      },
      scope: ['profile', 'email'],
      startRedirectPath: '/oauth2/google/',
      callbackUri: `https://localhost:8443/api/oauth2/google/callback`,
    });
  }

  const homeRouteSchema = {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          access_token: { type: 'string' },
          error: { type: 'string' }
        }
      },
      response: {
        200: messageResponse,
        400: messageErrorResponse,
        401: messageErrorResponse,
        404: messageErrorResponse,
        500: errorResponse
      }
    },
    handler: async (request, reply) => {
      const { access_token, error } = request.query;

      if (error) {
        // Handle authentication errors
        return reply.status(400).send({
          message: 'Authentication failed',
          error: error
        });
      }

      if (access_token) {
        try {
          const decoded = fastify.jwt.verify(access_token);

          // Fetch user details from database
          const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [decoded.id], (err, row) => {
              if (err) return reject(err);
              resolve(row);
            });
          });

          if (!user) {
            return reply.status(404).send({
              message: 'User not found in database',
              error: 'User record missing'
            });
          }

          // Return welcome message with username
          return reply.send({
            message: `Welcome to the homepage, ${user.username}!`
          });
        } catch (err) {
          request.log.error(`Error processing homepage with token: ${err.message}`);
          return reply.status(401).send({
            message: 'Invalid token or database error',
            error: err.message
          });
        }
      }

      // Regular homepage (no token in URL)
      return reply.send({
        message: 'Welcome to the homepage, Guest!'
      });
    }
  }

  // Register routes with schemas
  fastify.get('/oauth2/google/callback', googleCallbackSchema)
  fastify.get('/', homeRouteSchema)

  done();
}

module.exports = googleRoutes