import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const apply = process.argv.includes('--apply');
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);

const links = new Map([
  ['Charis Camp Meeting in Songs', 'https://www.livingwordmedia.org/teachings/saints-community-in-songs-vol-15/'],
  ['Saints Community in Songs - Believers Convention', 'https://www.livingwordmedia.org/teachings/saints-community-in-songs-vol-14/'],
  ['Saints Community in Songs Vol. 14', 'https://www.livingwordmedia.org/teachings/saints-community-in-songs-vol-14/'],
  ['SAINTS COMMUNITY IN SONGS – VOL 13', 'https://www.livingwordmedia.org/teachings/saints-community-in-songs-vol-13/'],
  ['Saints Community in Songs – Volume 11', 'https://www.livingwordmedia.org/teachings/saints-community-in-songs-volume-11/'],
  ['Saints Community in Songs - Volume 10', 'https://www.livingwordmedia.org/teachings/saints-community-in-songs-vol-10/'],
  ['Saints Community in Songs – Volume 9', 'https://www.livingwordmedia.org/teachings/saints-community-in-songs-vol-9/'],
  ['Saints Community in Songs 8', 'https://www.livingwordmedia.org/teachings/saints-community-in-songs-8/'],
  ['Saints Community in Songs - Volume 7B', 'https://www.livingwordmedia.org/teachings/saints-community-in-songs-volume-7b/'],
  ['Saints Community in Songs - Volume 7', 'https://www.livingwordmedia.org/teachings/saints-community-in-songs-volume-7/'],
  ['Saints Community in Songs – Volume 6', 'https://www.livingwordmedia.org/teachings/saints-community-in-songs-vol-6/'],
  ['Saints Community in Songs - Volume 5', 'https://www.livingwordmedia.org/teachings/saints-community-in-songs-volume-five/'],
  ['Saints Community in Songs - Volume 4', 'https://www.livingwordmedia.org/teachings/saints-community-in-songs-volume-four/'],
  ['Saints Community in Songs - Volume 3', 'https://www.livingwordmedia.org/teachings/saints-community-in-songs-volume-3/'],
  ['Saints Community in Songs - Volume 2', 'https://www.livingwordmedia.org/teachings/saints-community-in-songs-volume-2/'],
  ['Saints Community in Songs - Volume 1', 'https://www.livingwordmedia.org/teachings/saints-community-in-songs/'],
]);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: albums, error } = await supabase.from('albums').select('id,title,songs(count)');
if (error) throw new Error(error.message);

let updatedSongs = 0;
for (const [title, lwmUrl] of links) {
  const album = albums.find((item) => item.title === title);
  if (!album) throw new Error(`Expected album not found: ${title}`);
  const count = album.songs?.[0]?.count || 0;
  updatedSongs += count;
  console.log(`${title}: ${count} songs → ${lwmUrl}`);
  if (apply && count) {
    const { error: updateError } = await supabase.from('songs').update({ lwm_url: lwmUrl }).eq('album_id', album.id);
    if (updateError) throw new Error(`${title}: ${updateError.message}`);
  }
}

console.log(`${apply ? 'Updated' : 'Would update'} ${updatedSongs} songs across ${links.size} albums.`);
console.log('Not changed: Saints Community in Songs - Volume 12 (no supplied or publicly indexed URL).');
