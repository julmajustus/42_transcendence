// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   server-failcase.test.js                            :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/03 01:56:01 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/03 02:00:00 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const t = require('tap');
const { spawn } = require('child_process');
const net = require('net');

t.test('server.js fails to bind port -> triggers catch block', t => {
  // 1) Occupy port 8888 so the second server can’t bind
  const dummyServer = net.createServer();
  dummyServer.listen(0, '0.0.0.0', () => {
    // 2) Now spawn server.js in a child process
    const child = spawn('node', ['server.js'], {
      env: {
        ...process.env,
        // Override any DB path or other env if needed
        SQLITE_DB_PATH: process.env.SQLITE_DB_PATH || ':memory:',
      },
      cwd: process.cwd()
    });

    let output = '';
    child.stdout.on('data', data => {
      output += data.toString();
    });
    child.stderr.on('data', data => {
      output += data.toString();
    });

    child.on('exit', (code, signal) => {
      t.equal(code, 1, 'child process should exit with code 1 on port bind failure');
      t.match(output, /listen EADDRINUSE|fastify.log.error/, 'Error log or EADDRINUSE present');
      dummyServer.close();  // release the port
      t.end();
    });
  });

  dummyServer.on('error', err => {
    t.fail('Failed to occupy port 0: ' + err.message);
    t.end();
  });
});
