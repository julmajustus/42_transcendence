/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.test.js                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mpellegr <mpellegr@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/02 16:27:49 by jmakkone          #+#    #+#             */
/*   Updated: 2025/05/26 15:09:53 by mpellegr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const t = require('tap');
const fastify = require('../server');
const db = require('../db');
const { spawn } = require('child_process');


// Test 1: Server initialization via fastify.ready() - Should start without errors.

t.test('Server initializes correctly via fastify.ready()', t => {
	fastify.ready(err => {
		t.error(err, 'Server started without errors');
		t.end();
	});
});


// Test 2: Server start() function - Runs when executed as main.

t.test('Server start() function runs when executed as main', t => {
	const child = spawn('node', ['server.js'], {
		env: {
			...process.env,
			// Use an in-memory database for testing if not set.
			SQLITE_DB_PATH: process.env.SQLITE_DB_PATH || ':memory:',
		}
	});

	let output = '';

	child.stdout.on('data', data => {
		output += data.toString();
		if (output.includes(`Server running on port 8888`)) {
			t.match(
				output,
				/Server running on port 8888/,
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


// Test 3: Teardown - Close database and Fastify instance to clean up resources.

t.teardown(async () => {
	await new Promise((resolve, reject) => {
		db.close(err => (err ? reject(err) : resolve()));
	});
	await fastify.close();
});
