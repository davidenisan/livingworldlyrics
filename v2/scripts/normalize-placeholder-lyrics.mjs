import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function toPlainText(html = '') {
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const placeholderText = 'the devil is a liar..... no lyrics for this yet';
const { data: songs, error: readError } = await supabase.from('songs').select('id, lyrics');
if (readError) throw new Error(`Could not read songs: ${readError.message}`);

const ids = songs.filter((song) => toPlainText(song.lyrics) === placeholderText).map((song) => song.id);
if (ids.length !== 66) {
  throw new Error(`Safety check stopped the update: expected 66 exact placeholders, found ${ids.length}.`);
}

const { error: updateError } = await supabase.from('songs').update({ lyrics: null }).in('id', ids);
if (updateError) throw new Error(`Could not normalize placeholders: ${updateError.message}`);

console.log(`Normalized ${ids.length} placeholder lyric records to NULL.`);
