-- Users table
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL UNIQUE,
	email TEXT UNIQUE,
	password TEXT NOT NULL,
	google_id TEXT UNIQUE,
	avatar TEXT
);

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL
    -- name TEXT
);

-- Tournament Registrations table
CREATE TABLE IF NOT EXISTS tournament_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    registration_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'registered',
    UNIQUE(tournament_id, user_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER,  -- NULL for standalone matches
    round INTEGER NOT NULL,
    player1_id INTEGER NOT NULL,
    player2_id INTEGER NOT NULL,
    result TEXT,
    winner_id INTEGER,
    loser_id INTEGER,
    match_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'NOT_STARTED',
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    FOREIGN KEY (player1_id) REFERENCES users(id),
    FOREIGN KEY (player2_id) REFERENCES users(id),
    FOREIGN KEY (winner_id) REFERENCES users(id),
    FOREIGN KEY (loser_id) REFERENCES users(id)
);
