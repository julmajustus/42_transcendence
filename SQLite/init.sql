-- Users table
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL UNIQUE,
	email TEXT UNIQUE,
	password TEXT NOT NULL,
	google_id TEXT UNIQUE,
	avatar TEXT,
	online_status TEXT,
	two_fa BOOLEAN,
	two_fa_code TEXT,
	two_fa_code_expiration INTEGER,
	last_seen INTEGER
);

CREATE TABLE IF NOT EXISTS friends (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	friend_id INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
	UNIQUE (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS token_blacklist (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	token TEXT UNIQUE,
	expiration INTEGER
);

CREATE TABLE IF NOT EXISTS tournaments (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	owner_id INTEGER NOT NULL,
	status TEXT NOT NULL DEFAULT 'pending',    -- pending, active, completed, maybe we need also cancelled as option
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	started_at DATETIME,
	finished_at DATETIME,
	winner_id INTEGER,
	game_type TEXT,
	FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (winner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tournament_players (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	tournament_id INTEGER NOT NULL,
	user_id INTEGER NOT NULL,
	seed INTEGER,
	FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	UNIQUE (tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	tournament_id INTEGER NOT NULL,
	player1_slot INTEGER,
	player2_slot INTEGER,
	round INTEGER NOT NULL,
	match_id INTEGER,
	status TEXT NOT NULL DEFAULT 'not_scheduled',  -- not_scheduled, scheduled, finished
	winner_slot INTEGER,
	next_match_slot INTEGER,
	FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
	FOREIGN KEY (player1_slot) REFERENCES tournament_players(id),
	FOREIGN KEY (player2_slot) REFERENCES tournament_players(id),
	FOREIGN KEY (match_id) REFERENCES matches(id)
);

CREATE TABLE IF NOT EXISTS pending_matches (
	id           INTEGER PRIMARY KEY AUTOINCREMENT,
	creator_id   INTEGER NOT NULL,
	status       TEXT    NOT NULL DEFAULT 'open',
	created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	match_id     INTEGER,
	game_type         TEXT,
	FOREIGN KEY (creator_id) REFERENCES users(id),
	FOREIGN KEY (match_id)   REFERENCES matches(id)
);

CREATE TABLE IF NOT EXISTS pending_match_players (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	pending_id INTEGER NOT NULL,
	user_id    INTEGER NOT NULL,
	joined_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	game_type       TEXT,
	UNIQUE(pending_id, user_id),
	FOREIGN KEY (pending_id) REFERENCES pending_matches(id) ON DELETE CASCADE,
	FOREIGN KEY (user_id)    REFERENCES users(id)            ON DELETE CASCADE
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	player1_id INTEGER NOT NULL,
	player2_id INTEGER NOT NULL,
	player1_score INTEGER DEFAULT 0,
	player2_score INTEGER DEFAULT 0,
	status TEXT DEFAULT 'not_started',
	finished_rounds INTEGER DEFAULT 0,
	winner_id INTEGER DEFAULT NULL,
	loser_id INTEGER DEFAULT NULL,
	match_time DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (player1_id) REFERENCES users(id),
	FOREIGN KEY (player2_id) REFERENCES users(id),
	FOREIGN KEY (winner_id) REFERENCES users(id),
	FOREIGN KEY (loser_id) REFERENCES users(id)
);
