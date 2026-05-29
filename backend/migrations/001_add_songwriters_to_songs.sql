-- Adds songwriter credits to songs.
-- Safe for existing data: it only appends a nullable TEXT column.
ALTER TABLE songs ADD COLUMN songwriters TEXT;
