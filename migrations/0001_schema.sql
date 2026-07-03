-- Migration 0001: core schema for the festival demo.
-- Runs identically against local SQLite (.wrangler/state) and Cloudflare D1.

-- People. person_id is the integer key for ALL per-person data.
-- In the real system this id would be issued/matched by the external
-- "delegate" authentication deployment; here it is seeded.
CREATE TABLE person (
  person_id INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  email     TEXT,
  address   TEXT
);

-- Ticket types with admin-editable prices (cents, to avoid float math).
CREATE TABLE ticket_type (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,      -- 'ga' | 'vip'
  name        TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  description TEXT NOT NULL
);

-- A ticket owned by a person.
CREATE TABLE ticket (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id      INTEGER NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  ticket_type_id INTEGER NOT NULL REFERENCES ticket_type(id),
  purchased_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE artist (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  name   TEXT NOT NULL,
  genre  TEXT NOT NULL,
  blurb  TEXT NOT NULL,
  emoji  TEXT NOT NULL DEFAULT '🎤',     -- stand-in for artist imagery
  color  TEXT NOT NULL DEFAULT '#7c3aed' -- accent colour on lineup cards
);

-- A scheduled set. vip_only rows are hidden from the public schedule and
-- only surfaced on the VIP page (data-level gating, not just page gating).
CREATE TABLE performance (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id  INTEGER NOT NULL REFERENCES artist(id) ON DELETE CASCADE,
  day        TEXT NOT NULL,              -- 'Saturday' | 'Sunday'
  stage      TEXT NOT NULL,              -- 'Main Stage' | 'Lagoon Stage' | 'VIP Lounge'
  start_time TEXT NOT NULL,              -- 'HH:MM' 24h
  end_time   TEXT NOT NULL,
  vip_only   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_ticket_person ON ticket(person_id);
CREATE INDEX idx_performance_artist ON performance(artist_id);
