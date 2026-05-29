const express = require('express');
const { all, get, run } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { parseSongsFromDocxBuffer } = require('../services/docxImport');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const albums = await all(`
      SELECT a.*, COUNT(s.id) AS song_count
      FROM albums a
      LEFT JOIN songs s ON s.album_id = a.id
      GROUP BY a.id
    `);

    res.json(sortAlbums(albums, req.query.sort));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const album = await get('SELECT * FROM albums WHERE id = ?', [req.params.id]);
    if (!album) return res.status(404).json({ error: 'Album not found' });

    const songs = await all(
      'SELECT * FROM songs WHERE album_id = ? ORDER BY track_number ASC, title ASC',
      [req.params.id],
    );

    res.json({ ...album, songs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:albumId/songs', requireAuth, async (req, res) => {
  try {
    const { title, track_number, lyrics, youtube_url, lwm_url, songwriters } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const album = await get('SELECT * FROM albums WHERE id = ?', [req.params.albumId]);
    if (!album) return res.status(404).json({ error: 'Album not found' });

    const result = await run(
      `INSERT INTO songs (album_id, title, track_number, lyrics, youtube_url, lwm_url, songwriters)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.albumId,
        title,
        track_number || null,
        lyrics || null,
        youtube_url || null,
        lwm_url || null,
        songwriters || null,
      ],
    );

    return res.status(201).json(await get('SELECT * FROM songs WHERE id = ?', [result.lastID]));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/:albumId/import-docx', requireAuth, async (req, res) => {
  try {
    const album = await get('SELECT * FROM albums WHERE id = ?', [req.params.albumId]);
    if (!album) return res.status(404).json({ error: 'Album not found' });

    const { fileBase64, filename } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: 'fileBase64 is required' });
    }

    if (filename && !filename.toLowerCase().endsWith('.docx')) {
      return res.status(400).json({ error: 'Only .docx files are supported' });
    }

    const normalizedBase64 = String(fileBase64).includes(',')
      ? String(fileBase64).split(',').pop()
      : String(fileBase64);

    const fileBuffer = Buffer.from(normalizedBase64, 'base64');
    if (!fileBuffer.length) {
      return res.status(400).json({ error: 'Invalid DOCX payload' });
    }

    const parsedSongs = await parseSongsFromDocxBuffer(fileBuffer);
    if (!parsedSongs.length) {
      return res.status(400).json({ error: 'No songs found in DOCX. Use Heading 1/2 for titles and Heading 3 for songwriters.' });
    }

    const trackInfo = await get(
      'SELECT COALESCE(MAX(track_number), 0) AS max_track_number FROM songs WHERE album_id = ?',
      [req.params.albumId],
    );
    let nextTrackNumber = Number(trackInfo?.max_track_number || 0) + 1;
    const importedSongs = [];

    await run('BEGIN TRANSACTION');
    try {
      for (const song of parsedSongs) {
        const parsedTrackNumber = Number(song.track_number);
        const hasParsedTrackNumber = Number.isFinite(parsedTrackNumber) && parsedTrackNumber > 0;
        const trackNumber = hasParsedTrackNumber ? parsedTrackNumber : nextTrackNumber;
        nextTrackNumber = Math.max(nextTrackNumber, trackNumber + 1);

        await run(
          `INSERT INTO songs (album_id, title, track_number, lyrics, youtube_url, lwm_url, songwriters)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            req.params.albumId,
            song.title,
            trackNumber,
            song.lyrics || null,
            song.youtube_url || null,
            null,
            song.songwriters || null,
          ],
        );

        importedSongs.push({
          ...song,
          track_number: trackNumber,
        });
      }
      await run('COMMIT');
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }

    return res.json({
      success: true,
      imported: importedSongs.length,
      songs: importedSongs.map((song) => ({
        title: song.title,
        track_number: song.track_number ?? null,
        youtube_url: song.youtube_url ?? null,
        songwriters: song.songwriters ?? null,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/:albumId/lwm-url', requireAuth, async (req, res) => {
  try {
    const album = await get('SELECT * FROM albums WHERE id = ?', [req.params.albumId]);
    if (!album) return res.status(404).json({ error: 'Album not found' });

    const lwmUrl = String(req.body.lwm_url || '').trim();
    if (!lwmUrl) return res.status(400).json({ error: 'Living Word Media URL is required' });

    const onlyMissing = req.body.onlyMissing !== false;
    const result = await run(
      `UPDATE songs
       SET lwm_url = ?
       WHERE album_id = ?
       ${onlyMissing ? "AND (lwm_url IS NULL OR TRIM(lwm_url) = '')" : ''}`,
      [lwmUrl, req.params.albumId],
    );

    return res.json({
      success: true,
      updated: result.changes || 0,
      onlyMissing,
      lwm_url: lwmUrl,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, year, description, cover_url } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const result = await run(
      'INSERT INTO albums (title, year, description, cover_url) VALUES (?, ?, ?, ?)',
      [title, year || null, description || null, cover_url || null],
    );

    res.status(201).json(await get('SELECT * FROM albums WHERE id = ?', [result.lastID]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const album = await get('SELECT * FROM albums WHERE id = ?', [req.params.id]);
    if (!album) return res.status(404).json({ error: 'Album not found' });

    const { title, year, description, cover_url } = req.body;

    await run('UPDATE albums SET title = ?, year = ?, description = ?, cover_url = ? WHERE id = ?', [
      title ?? album.title,
      year ?? album.year,
      description ?? album.description,
      cover_url ?? album.cover_url,
      req.params.id,
    ]);

    res.json(await get('SELECT * FROM albums WHERE id = ?', [req.params.id]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const album = await get('SELECT * FROM albums WHERE id = ?', [req.params.id]);
    if (!album) return res.status(404).json({ error: 'Album not found' });

    await run('DELETE FROM albums WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

function sortAlbums(albums, sort = 'smart_desc') {
  const normalizedSort = ['smart_asc', 'smart_desc', 'title_asc', 'title_desc'].includes(sort)
    ? sort
    : 'smart_desc';

  return [...albums].sort((a, b) => compareAlbums(a, b, normalizedSort));
}

function compareAlbums(a, b, sort) {
  const direction = sort.endsWith('_desc') ? -1 : 1;

  if (sort.startsWith('title')) {
    return compareText(a.title, b.title) * direction;
  }

  const yearComparison = compareNullableNumber(nullableNumber(a.year), nullableNumber(b.year), direction);
  if (yearComparison !== 0) return yearComparison;

  const numberComparison = compareNullableNumber(albumNumber(a.title), albumNumber(b.title), direction);
  if (numberComparison !== 0) return numberComparison;

  return compareText(a.title, b.title) * direction;
}

function albumNumber(title = '') {
  const matches = String(title).match(/\d+/g);
  if (!matches) return null;

  return Number(matches[matches.length - 1]);
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function compareNullableNumber(a, b, direction) {
  const aIsNumber = Number.isFinite(a);
  const bIsNumber = Number.isFinite(b);

  if (aIsNumber && bIsNumber && a !== b) return (a - b) * direction;
  if (aIsNumber && !bIsNumber) return -1;
  if (!aIsNumber && bIsNumber) return 1;
  return 0;
}

function compareText(a = '', b = '') {
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}
