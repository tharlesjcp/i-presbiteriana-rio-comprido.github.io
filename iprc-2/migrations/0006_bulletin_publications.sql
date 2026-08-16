CREATE TABLE bulletin_publications (
  id TEXT PRIMARY KEY,
  bulletin_id TEXT NOT NULL REFERENCES bulletins(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  source_updated_at TEXT NOT NULL,
  published_at TEXT NOT NULL,
  published_by TEXT NOT NULL,
  withdrawn_at TEXT,
  withdrawn_by TEXT,
  UNIQUE (bulletin_id, revision)
);

CREATE UNIQUE INDEX bulletin_publications_active_idx
  ON bulletin_publications (bulletin_id)
  WHERE withdrawn_at IS NULL;

CREATE INDEX bulletin_publications_public_idx
  ON bulletin_publications (withdrawn_at, published_at DESC);
