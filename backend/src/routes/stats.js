const express = require('express');
const { all } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/summary', requireAuth, async (req, res) => {
  try {
    const [albums, songs] = await Promise.all([
      all(`
        SELECT a.id, a.title, COUNT(s.id) AS song_count
        FROM albums a
        LEFT JOIN songs s ON s.album_id = a.id
        GROUP BY a.id
        ORDER BY song_count DESC, a.title ASC
      `),
      all(`
        SELECT s.id, s.album_id, s.title, s.lyrics, s.youtube_url, s.lwm_url, s.songwriters,
               s.created_at, a.title AS album_title
        FROM songs s
        JOIN albums a ON a.id = s.album_id
        ORDER BY s.created_at DESC, s.id DESC
      `),
    ]);

    const totalSongs = songs.length;
    const songsWithLyrics = songs.filter((song) => hasUsableLyrics(song.lyrics)).length;
    const missingLyrics = totalSongs - songsWithLyrics;
    const lyricCoveragePercent = totalSongs > 0
      ? Math.round((songsWithLyrics / totalSongs) * 100)
      : 0;

    const summary = {
      totalAlbums: albums.length,
      totalSongs,
      songsWithLyrics,
      missingLyrics,
      lyricCoveragePercent,
      songsWithYouTube: songs.filter((song) => hasValue(song.youtube_url)).length,
      songsWithLwm: songs.filter((song) => hasValue(song.lwm_url)).length,
      songsWithSongwriters: songs.filter((song) => hasValue(song.songwriters)).length,
      albumsWithoutSongs: albums.filter((album) => Number(album.song_count) === 0).length,
      largestAlbum: albums[0] && Number(albums[0].song_count) > 0
        ? {
          id: albums[0].id,
          title: albums[0].title,
          songCount: Number(albums[0].song_count),
        }
        : null,
      recentlyAddedSongs: songs.slice(0, 5).map((song) => ({
        id: song.id,
        albumId: song.album_id,
        title: song.title,
        albumTitle: song.album_title,
        hasLyrics: hasUsableLyrics(song.lyrics),
        createdAt: song.created_at,
      })),
    };

    return res.json(summary);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;

function hasValue(value) {
  return Boolean(String(value || '').trim());
}

function hasUsableLyrics(lyrics = '') {
  const plain = htmlToPlainLyrics(lyrics).toLowerCase().replace(/\s+/g, ' ').trim();

  if (!plain) return false;
  if (plain.includes('no lyrics for this yet')) return false;
  if (plain.includes('no lyrics yet')) return false;

  return true;
}

function htmlToPlainLyrics(html = '') {
  return decodeHtmlEntities(String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h2|h3|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim());
}

function decodeHtmlEntities(value = '') {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
