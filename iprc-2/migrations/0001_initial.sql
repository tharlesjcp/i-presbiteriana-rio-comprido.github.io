PRAGMA foreign_keys = ON;

CREATE TABLE recurring_schedules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT,
  location_name TEXT NOT NULL,
  location_address TEXT,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE agenda_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  start_time TEXT,
  end_time TEXT,
  location_name TEXT NOT NULL,
  location_address TEXT,
  summary TEXT,
  description TEXT,
  image_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'cancelled')),
  source_kind TEXT NOT NULL CHECK (source_kind IN ('manual', 'bulletin')),
  bulletin_id TEXT,
  bulletin_item_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX agenda_events_public_dates_idx ON agenda_events (status, start_date, end_date);
CREATE INDEX agenda_events_bulletin_idx ON agenda_events (bulletin_id, bulletin_item_id);

CREATE TABLE bulletin_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('annual', 'special')),
  style_key TEXT NOT NULL,
  cover_key TEXT,
  back_cover_key TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE bulletins (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL CHECK (number > 0),
  slug TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  template_id TEXT NOT NULL REFERENCES bulletin_templates(id),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'trashed')),
  pastoral_title TEXT NOT NULL,
  pastoral_body_json TEXT NOT NULL,
  bible_book TEXT,
  bible_chapter INTEGER,
  bible_verse_start INTEGER,
  bible_verse_end INTEGER,
  published_at TEXT,
  deleted_at TEXT,
  pdf_storage_key TEXT,
  pdf_generated_at TEXT,
  pdf_page_count INTEGER CHECK (pdf_page_count IS NULL OR pdf_page_count = 2),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CONSTRAINT bulletins_number_unique UNIQUE (number),
  CHECK (status != 'trashed' OR deleted_at IS NOT NULL)
);

CREATE INDEX bulletins_public_idx ON bulletins (status, deleted_at, number DESC, date DESC);

CREATE TABLE bulletin_announcements (
  id TEXT PRIMARY KEY,
  bulletin_id TEXT NOT NULL REFERENCES bulletins(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_json TEXT NOT NULL,
  image_key TEXT,
  agenda_event_id TEXT REFERENCES agenda_events(id),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE bulletin_activities (
  id TEXT PRIMARY KEY,
  bulletin_id TEXT NOT NULL REFERENCES bulletins(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  agenda_event_id TEXT REFERENCES agenda_events(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE TABLE bulletin_birthdays (
  id TEXT PRIMARY KEY,
  bulletin_id TEXT NOT NULL REFERENCES bulletins(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'member')),
  member_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  CHECK (source = 'manual' OR member_id IS NOT NULL)
);

CREATE TABLE bulletin_diaconal_schedule (
  id TEXT PRIMARY KEY,
  bulletin_id TEXT NOT NULL REFERENCES bulletins(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  responsible_json TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE bulletin_weekly_readings (
  id TEXT PRIMARY KEY,
  bulletin_id TEXT NOT NULL REFERENCES bulletins(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  reference_text TEXT NOT NULL,
  bible_book TEXT,
  bible_chapter INTEGER,
  bible_verse_start INTEGER,
  bible_verse_end INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE bulletin_blocks (
  id TEXT PRIMARY KEY,
  bulletin_id TEXT NOT NULL REFERENCES bulletins(id) ON DELETE CASCADE,
  block_json TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX bulletin_announcements_parent_idx ON bulletin_announcements (bulletin_id, sort_order);
CREATE INDEX bulletin_activities_parent_idx ON bulletin_activities (bulletin_id, sort_order);
CREATE INDEX bulletin_birthdays_parent_idx ON bulletin_birthdays (bulletin_id, sort_order);
CREATE INDEX bulletin_diaconal_parent_idx ON bulletin_diaconal_schedule (bulletin_id, sort_order);
CREATE INDEX bulletin_readings_parent_idx ON bulletin_weekly_readings (bulletin_id, sort_order);
CREATE INDEX bulletin_blocks_parent_idx ON bulletin_blocks (bulletin_id, sort_order);
