// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   server.test.js                                     :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/02 16:27:49 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/02 16:27:57 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const t = require('tap');
const fastify = require('../server');

t.test('Server initializes correctly', t => {
  // fastify.ready() waits for all plugins to load.
  fastify.ready(err => {
    t.error(err, 'Server started without errors');
    t.end();
  });
});
