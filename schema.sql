-- isocline.app launch notices: one row per address, deleted after the notice is sent.
CREATE TABLE IF NOT EXISTS notify (
  email      TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);
