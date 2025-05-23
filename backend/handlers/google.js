const { PROTOCOL } =  require('../config');
const { FRONTEND_PORT } =  require('../config');
const db = require('../db');
const bcrypt = require('bcryptjs')

const googleOAuthHandler = async function(request, reply) {
  // In test environment, use mock behavior
  if (process.env.NODE_ENV === 'test') {
    // Create a mock JWT token for testing
    const jwtToken = await reply.jwtSign({
      id: 1,
      email: 'test@example.com'
    });
    return reply.redirect(`/?access_token=${jwtToken}`);
  }

  try {
    // Exchange the authorization code for tokens
    const { token } = await this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

    // Use the access token to get user profile
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

    const googleUser = await userInfoResponse.json();


	if (!googleUser.email) {
		request.log.error('Google account does not have an email');
		return reply.redirect('/?error=missing_email');
	}

    // Check if user exists with the email
    const existingUser = await new Promise((resolve, reject) => {
		db.get('SELECT id, username FROM users WHERE email = ?', [googleUser.email], (err, row) => {
		  if (err) return reject(err);
		  resolve(row);
		});
	  });

    let userId;
	let username;

    if (existingUser) {
		request.log.info(`Linked Google account already registered with same email`);
		// User exists with this email, update google_id if not set
		userId = existingUser.id;
		username = existingUser.username;

		// If user exists but doesn't have a google_id, link the accounts
		if (!existingUser.google_id) {
		  await new Promise((resolve, reject) => {
			db.run(
			  'UPDATE users SET google_id = ? WHERE id = ?',
			  [googleUser.id, existingUser.id],
			  function(err) {
				if (err) return reject(err);
				resolve();
			  }
			);
		  });
		  request.log.info(`Linked Google account to existing user: ${existingUser.username}`);
		}
    } else {
      // Create new user with Google account
      // Generate a unique username based on Google profile
      const baseUsername = googleUser.name;
      username = baseUsername;

      // Check if username exists and add a suffix if needed
      let usernameTaken = true;
      let counter = 1;
      const maxAttempts = 1000; // Cap the counter to prevent overflow

      while (usernameTaken && counter <= maxAttempts) {
        const existingUsername = await new Promise((resolve, reject) => {
          db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
            if (err) return reject(err);
            resolve(row);
          });
        });

        if (!existingUsername) {
          usernameTaken = false;
        } else {
          username = `${baseUsername}${counter}`;
          counter++;
        }
      }

      if (usernameTaken) {
        throw new Error('Failed to generate a unique username after maximum attempts');
      }

    // Generate avatar for the new user
	let fileName;
	try {
	  const avatarResponse = await fetch(`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${username}`)
	  if (!avatarResponse.ok)
		throw new Error('External avatar API returned an error')
	  const svg = await avatarResponse.text()
	  fileName = `${username}_default.png`
	  const filePath = path.join(__dirname, '../uploads/avatars', fileName)
	  await sharp(Buffer.from(svg)).resize(256, 256).png().toFile(filePath)
	  request.log.info('Default avatar downloaded and converted to PNG for Google user');
	} catch (avatarError) {
	  request.log.error(`Avatar generation failed: ${avatarError.message}. Using fallback avatar.`)
	  fileName = 'fallback.jpeg'
	}

  const hashedPassword = await bcrypt.hash('googlePsw12', 10);

	// Insert the new user
	userId = await new Promise((resolve, reject) => {
	  db.run(
		'INSERT INTO users (username, email, google_id, password, avatar, online_status) VALUES (?, ?, ?, ?, ?, ?)',
		[username, googleUser.email, googleUser.id, hashedPassword, fileName, 'online'],
		function(err) {
		  if (err) return reject(err);
		  resolve(this.lastID);
		}
	  );
	});

	request.log.info(`Created new user from Google account: ${username}`);
  }

  // Update user's online status
  await new Promise((resolve, reject) => {
	db.run(
	  'UPDATE users SET online_status = ? WHERE id = ?',
	  ['online', userId],
	  function(err) {
		if (err) return reject(err);
		resolve();
	  }
	);
  });

  // Generate a JWT token
  const jwtToken = await reply.jwtSign({
	id: userId,
	username: username,
	email: googleUser.email
  });

  // Redirect to frontend with the token
  // const frontendUrl = `${PROTOCOL}://localhost:${FRONTEND_PORT}`;
  // return reply.redirect(`${frontendUrl}/login?access_token=${jwtToken}`);
  return reply.redirect(`/login?access_token=${jwtToken}`);


  } catch (err) {
  request.log.error(`Google OAuth error: ${err.message}`);
  return reply.redirect('/?error=authentication_failed');
  }
};

module.exports = {
  googleOAuthHandler
};