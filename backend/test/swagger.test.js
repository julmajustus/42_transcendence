// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   swagger.test.js                                    :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/02 16:28:39 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/02 16:28:53 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const t = require('tap');
const fastify = require('../server');

t.test('GET /documentation returns Swagger docs', async t => {
  const response = await fastify.inject({
    method: 'GET',
    url: '/documentation'
  });

  t.equal(response.statusCode, 200, 'Documentation endpoint should return status 200');
  // Check that the payload contains a string like "Swagger" (case-insensitive)
  t.match(response.payload, /swagger/i, 'Documentation page contains "swagger" text');
});
