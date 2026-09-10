import 'dotenv/config';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { createClient } from '@supabase/supabase-js';

const sourcePath = path.resolve(process.cwd(), process.env.SQLITE_DB_PATH || '../backend/lyrics.db');
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length) {
  throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
}

const source = new sqlite3.Database(sourcePath, sqlite3.OPEN_READONLY);
const all = (sql) => new Promise((resolve, reject) => {
  source.all(sql, (error, rows) => (error ? reject(error) : resolve(rows)));
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsert(table, rows) {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`${table} import failed: ${error.message}`);
}

try {
  const albums = await all('select id, title, year, description, cover_url, created_at from albums order by id');
  const songs = await all(`
    select id, album_id, track_number, title, lyrics, youtube_url, lwm_url, songwriters, created_at
    from songs order by id
  `);

  await upsert('albums', albums);
  await upsert('songs', songs);

  const { error } = await supabase.rpc('sync_lyrics_identity_sequences');
  if (error) throw new Error(`Could not sync ID sequences: ${error.message}`);

  console.log(`Migration complete: ${albums.length} albums and ${songs.length} songs imported.`);
} finally {
  source.close();
}
