-- Events and responses. Candidate dates (candidates) and response choices (choices) are stored as JSON strings.
-- Timestamps (created_at / updated_at) are ISO 8601 strings; expires_at is epoch seconds.

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  fee INTEGER,
  memo TEXT,
  candidates TEXT NOT NULL,
  closed INTEGER NOT NULL DEFAULT 0,
  manage_token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- For deleting expired events (Cron Trigger)
CREATE INDEX events_expires_at ON events (expires_at);

CREATE TABLE answers (
  id TEXT PRIMARY KEY,
  -- Deleting an event also deletes its responses
  event_id TEXT NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT,
  choices TEXT NOT NULL,
  edit_token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  -- One event cannot have two responses with the same name. Also serves as the index for looking up an event's responses
  UNIQUE (event_id, name)
);
