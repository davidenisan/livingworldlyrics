import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const apply = process.argv.includes('--apply');
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const additions = [
  { album: 'Saints Community in Songs - Volume 10', title: 'Jesus Has Filled My Heart With Joy' },
  { album: 'Saints Community in Songs - Volume 10', title: 'Lord I Trust in You', sourceTitle: 'Lord I Trust In You' },
  { album: 'Saints Community in Songs - Volume 10', title: 'Lord We Are Hungry' },
  { album: 'Saints Community in Songs - Volume 10', title: 'Supernatural Occurrences' },

  { album: 'Saints Community in Songs – Volume 11', title: "As We're Yielding" },
  { album: 'Saints Community in Songs – Volume 11', title: "Healing is the Children's Bread" },
  { album: 'Saints Community in Songs – Volume 11', title: 'Help is Here' },
  { album: 'Saints Community in Songs – Volume 11', title: 'Hungry for Fresh Fire' },
  { album: 'Saints Community in Songs – Volume 11', title: 'I Burn', sourceTitle: 'I Burn' },
  { album: 'Saints Community in Songs – Volume 11', title: 'Jesus is Here', sourceTitle: 'Jesus is here' },
  { album: 'Saints Community in Songs – Volume 11', title: 'Jesus Stands by Me' },
  { album: 'Saints Community in Songs – Volume 11', title: 'Majesty' },
  { album: 'Saints Community in Songs – Volume 11', title: 'Speak to Me' },
  { album: 'Saints Community in Songs – Volume 11', title: 'Your Glory Fills This Place' },

  { album: 'SAINTS COMMUNITY IN SONGS – VOL 13', title: 'Suddenly', sourceTitle: 'Suddenly' },
  { album: 'SAINTS COMMUNITY IN SONGS – VOL 13', title: 'We Worship Jesus', sourceTitle: 'We Worship Jesus' },
  { album: 'SAINTS COMMUNITY IN SONGS – VOL 13', title: 'You Open My Eyes', sourceTitle: 'You Open My Eyes' },

  { album: 'Saints Community in Songs Vol. 14', title: 'Almighty God', sourceTitle: 'Almighty God' },
  { album: 'Saints Community in Songs Vol. 14', title: 'As I Pray' },
  { album: 'Saints Community in Songs Vol. 14', title: 'Built to Last' },
  { album: 'Saints Community in Songs Vol. 14', title: 'Jesus' },
  { album: 'Saints Community in Songs Vol. 14', title: 'Our God' },
  { album: 'Saints Community in Songs Vol. 14', title: 'Tend and Keep Your Garden' },
  { album: 'Saints Community in Songs Vol. 14', title: 'The Harvest Is Plenteous' },
  { album: 'Saints Community in Songs Vol. 14', title: 'What a Privilege' },
];

const normalize = (value = '') => String(value).toLowerCase()
  .replace(/holyghost/g, 'holy ghost')
  .replace(/[’']/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const [{ data: albums, error: albumsError }, { data: songs, error: songsError }] = await Promise.all([
  supabase.from('albums').select('id,title'),
  supabase.from('songs').select('album_id,track_number,title,lyrics,youtube_url,lwm_url,songwriters'),
]);
if (albumsError) throw new Error(albumsError.message);
if (songsError) throw new Error(songsError.message);

const albumByTitle = new Map(albums.map((album) => [album.title, album]));
const groupedSongs = new Map(albums.map((album) => [album.id, songs.filter((song) => song.album_id === album.id)]));
const existingTitles = new Map([...groupedSongs].map(([id, values]) => [id, new Set(values.map((song) => normalize(song.title)))]));

const rows = [];
const skipped = [];
for (const item of additions) {
  const album = albumByTitle.get(item.album);
  if (!album) throw new Error(`Expected album not found: ${item.album}`);
  if (existingTitles.get(album.id).has(normalize(item.title))) { skipped.push(item); continue; }

  const source = item.sourceTitle
    ? songs.find((song) => normalize(song.title) === normalize(item.sourceTitle) && String(song.lyrics || '').trim())
    : null;
  const nextTrack = Math.max(0, ...groupedSongs.get(album.id).map((song) => Number(song.track_number) || 0)) + 1;
  const row = {
    album_id: album.id,
    track_number: nextTrack,
    title: item.title,
    lyrics: source?.lyrics || null,
    youtube_url: source?.youtube_url || null,
    lwm_url: source?.lwm_url || null,
    songwriters: source?.songwriters || null,
  };
  rows.push(row);
  groupedSongs.get(album.id).push(row);
  existingTitles.get(album.id).add(normalize(item.title));
}

console.log(`${apply ? 'Applying' : 'Dry run'}: ${rows.length} additions, ${skipped.length} already present.`);
for (const row of rows) {
  const album = albums.find((item) => item.id === row.album_id);
  console.log(`- ${album.title}: ${row.title}${row.lyrics ? ' (lyrics copied)' : ' (lyrics missing)'}`);
}

if (apply && rows.length) {
  const { error } = await supabase.from('songs').insert(rows);
  if (error) throw new Error(error.message);
  console.log(`Added ${rows.length} songs.`);
}
