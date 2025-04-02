// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   server.test.js                                     :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/02 16:27:49 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/03 00:56:22 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const t = require('tap');
const fastify = require('../server');
const db = require('../db');
const { spawn } = require('child_process');

// Test the Fastify instance initialization using fastify.ready()
t.test('Server initializes correctly via fastify.ready()', t => {
  fastify.ready(err => {
    t.error(err, 'Server started without errors');
    t.end();
  });
});

// Test the code branch that calls start() when the module is run directly
t.test('Server start() function runs when executed as main', t => {
  const child = spawn('node', ['server.js'], {
    env: {
      ...process.env,
      // Use an in-memory database for testing if not set
      SQLITE_DB_PATH: process.env.SQLITE_DB_PATH || ':memory:',
    }
  });
  
  let output = '';
  
  child.stdout.on('data', data => {
    output += data.toString();
    if (output.includes(`Server listening on http://localhost:8888`)) {
      t.match(
        output,
        /Server listening on http:\/\/localhost:8888/,
        'Output contains the expected listening message'
      );
      // Send SIGINT to attempt a graceful shutdown.
      child.kill('SIGINT');
    }
  });
  
  child.on('exit', (code, signal) => {
    t.pass(`Child process exited with code ${code} and signal ${signal}`);
    t.end();
  });
  
  child.on('error', err => {
    t.fail('Failed to spawn server.js: ' + err.message);
    t.end();
  });
});

// Teardown: Close resources so the process exits cleanly.
t.teardown(async () => {
  // Close the SQLite connection if still open.
  await new Promise((resolve, reject) => {
    db.close(err => (err ? reject(err) : resolve()));
  });
  // Close the Fastify instance.
  await fastify.close();
});
