const express = require('express');
const { all, get, run } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { q } = req.query;

    if (q) {
      const queryVariants = searchVariants(String(q));
      const clauses = queryVariants
        .map(() => '(s.title LIKE ? OR s.lyrics LIKE ? OR s.songwriters LIKE ?)')
        .join(' OR ');
      const values = queryVariants.flatMap((value) => [`%${value}%`, `%${value}%`, `%${value}%`]);

      const songs = await all(
        `SELECT s.*, a.title AS album_title
         FROM songs s
         JOIN albums a ON a.id = s.album_id
         WHERE ${clauses}
         ORDER BY s.title ASC`,
        values,
      );

      return res.json(songs);
    }

    const songs = await all(
      'SELECT s.*, a.title AS album_title FROM songs s JOIN albums a ON a.id = s.album_id ORDER BY a.title, s.track_number',
    );

    return res.json(songs);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const song = await get(
      'SELECT s.*, a.title AS album_title FROM songs s JOIN albums a ON a.id = s.album_id WHERE s.id = ?',
      [req.params.id],
    );

    if (!song) return res.status(404).json({ error: 'Song not found' });
    return res.json(song);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const song = await get('SELECT * FROM songs WHERE id = ?', [req.params.id]);
    if (!song) return res.status(404).json({ error: 'Song not found' });

    const { title, track_number, lyrics, youtube_url, lwm_url, songwriters } = req.body;

    await run(
      `UPDATE songs
       SET title = ?, track_number = ?, lyrics = ?, youtube_url = ?, lwm_url = ?, songwriters = ?
       WHERE id = ?`,
      [
        title ?? song.title,
        track_number ?? song.track_number,
        lyrics ?? song.lyrics,
        youtube_url ?? song.youtube_url,
        lwm_url ?? song.lwm_url,
        songwriters ?? song.songwriters,
        req.params.id,
      ],
    );

    return res.json(await get('SELECT * FROM songs WHERE id = ?', [req.params.id]));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const song = await get('SELECT * FROM songs WHERE id = ?', [req.params.id]);
    if (!song) return res.status(404).json({ error: 'Song not found' });

    await run('DELETE FROM songs WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;

function searchVariants(query) {
  return [
    query,
    query.replace(/'/g, '&#x27;'),
    query.replace(/'/g, '&#39;'),
    query.replace(/'/g, '&apos;'),
    query.replace(/’/g, '&#x27;'),
    query.replace(/’/g, "'"),
  ].filter((value, index, values) => value && values.indexOf(value) === index);
}
