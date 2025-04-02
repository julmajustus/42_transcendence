// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   swagger.test.js                                    :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/02 16:28:39 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/03 01:44:44 by jmakkone         ###   ########.fr       //
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

t.test('GET /documentation/json calls transformSpecification', async t => {
  const response = await fastify.inject({
    method: 'GET',
    url: '/documentation/json'
  });
  t.equal(response.statusCode, 200, 'Should return 200 for the JSON spec');
  
  // The transformSpecification callback *should* have been invoked here,
  // so if coverage was missing that function, this request will trigger it.
});
