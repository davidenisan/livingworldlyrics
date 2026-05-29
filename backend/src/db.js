const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../lyrics.db');
const bundledDbPath = path.join(__dirname, '../lyrics.db');

if (process.env.DB_PATH && !fs.existsSync(dbPath) && fs.existsSync(bundledDbPath)) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.copyFileSync(bundledDbPath, dbPath);
}

const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

async function initializeDb() {
  await run('PRAGMA foreign_keys = ON');

  await run(`CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    year INTEGER,
    description TEXT,
    cover_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    track_number INTEGER,
    title TEXT NOT NULL,
    lyrics TEXT,
    youtube_url TEXT,
    lwm_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const columns = await all('PRAGMA table_info(songs)');
  const hasSongwriters = columns.some((column) => column.name === 'songwriters');
  if (!hasSongwriters) {
    await run('ALTER TABLE songs ADD COLUMN songwriters TEXT');
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initializeDb,
};
