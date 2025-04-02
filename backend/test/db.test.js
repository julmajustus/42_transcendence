// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   db.test.js                                         :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/03 01:00:10 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/03 01:00:19 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const t = require('tap');
const proxyquire = require('proxyquire');

// Create a fake sqlite3 module that always calls the callback with an error.
const fakeSqlite3 = {
  verbose: () => ({
    Database: function(path, callback) {
      // Simulate an error opening the database.
      callback(new Error("Simulated error"));
    }
  })
};

// Capture console.error so we can assert on its output.
let capturedError = '';
const originalConsoleError = console.error;
console.error = (msg) => {
  capturedError += msg;
};

t.test('db.js error handling: logs error when database fails to open', t => {
  // Load the db module with sqlite3 replaced by our fake.
  proxyquire('../db', {
    'sqlite3': fakeSqlite3
  });

  // Check that our error message was printed.
  t.match(
    capturedError,
    /Error opening database: Simulated error/i,
    'Proper error message was logged'
  );

  // Restore console.error so other tests are not affected.
  console.error = originalConsoleError;
  t.end();
});
