ALTER TABLE bulletin_birthdays
ADD COLUMN visibility TEXT NOT NULL DEFAULT 'print'
CHECK (visibility IN ('hidden', 'print', 'public'));
