import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { configurationError, supabase } from './supabase';
import { parseSongsFromDocx } from './docx';

const missingLyrics = (lyrics) => !String(lyrics || '').trim();
const queryError = (error) => { if (error) throw new Error(error.message); };

async function getAlbums() {
  const { data, error } = await supabase.from('albums').select('*, songs(count)').order('year', { ascending: false, nullsFirst: false }).order('title');
  queryError(error);
  return data.map((album) => ({ ...album, song_count: album.songs?.[0]?.count || 0 }));
}

function Layout({ children }) {
  return <><header><Link className="brand" to="/">Living Word Lyrics</Link><nav><NavLink to="/albums">Albums</NavLink><NavLink to="/admin">Admin</NavLink></nav></header><main>{children}</main></>;
}

function Loading() { return <p className="state">Loading…</p>; }
function ErrorMessage({ error }) { return <p className="error">{error}</p>; }

function Home() {
  const [query, setQuery] = useState(''); const [songs, setSongs] = useState([]); const [status, setStatus] = useState('');
  useEffect(() => {
    const timer = setTimeout(async () => {
      const term = query.trim(); if (!term) return setSongs([]);
      try { setStatus(''); const { data, error } = await supabase.from('songs').select('id,title,songwriters,albums(title)').or(`title.ilike.%${term}%,lyrics.ilike.%${term}%,songwriters.ilike.%${term}%`).order('title').limit(30); queryError(error); setSongs(data); } catch (error) { setStatus(error.message); }
    }, 220); return () => clearTimeout(timer);
  }, [query]);
  return <Layout><section className="hero"><p className="eyebrow">WORSHIP LIBRARY</p><h1>Find the right song, fast.</h1><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, lyrics, or songwriter" /></section>{status && <ErrorMessage error={status} />}{query.trim() && <section className="results"><h2>{songs.length ? 'Songs' : 'No matching songs'}</h2>{songs.map((song) => <Link className="song-row" to={`/songs/${song.id}`} key={song.id}><strong>{song.title}</strong><span>{song.albums?.title}{song.songwriters ? ` · ${song.songwriters}` : ''}</span></Link>)}</section>}</Layout>;
}

function Albums() {
  const [albums, setAlbums] = useState(null); const [error, setError] = useState('');
  useEffect(() => { getAlbums().then(setAlbums).catch((error) => setError(error.message)); }, []);
  return <Layout><h1>Albums</h1>{error && <ErrorMessage error={error} />}{!albums ? <Loading /> : <div className="album-grid">{albums.map((album) => <Link to={`/albums/${album.id}`} className="album-card" key={album.id}>{album.cover_url ? <img src={album.cover_url} alt="" /> : <div className="cover-placeholder">♫</div>}<strong>{album.title}</strong><span>{album.year || '—'} · {album.song_count} songs</span></Link>)}</div>}</Layout>;
}

function Album() {
  const { id } = useParams(); const [album, setAlbum] = useState(null); const [error, setError] = useState('');
  useEffect(() => { supabase.from('albums').select('*, songs(*)').eq('id', id).single().then(({ data, error }) => { if (error) setError(error.message); else setAlbum({ ...data, songs: [...data.songs].sort((a,b) => (a.track_number || 9999) - (b.track_number || 9999) || a.title.localeCompare(b.title)) }); }); }, [id]);
  if (error) return <Layout><ErrorMessage error={error} /></Layout>; if (!album) return <Layout><Loading /></Layout>;
  return <Layout><Link className="back" to="/albums">← Albums</Link><h1>{album.title}</h1>{album.description && <p className="muted">{album.description}</p>}<section className="track-list">{album.songs.map((song) => <Link key={song.id} to={`/songs/${song.id}`}><span>{song.track_number || '—'}</span><strong>{song.title}</strong>{missingLyrics(song.lyrics) && <em>Missing lyrics</em>}</Link>)}</section></Layout>;
}

function Song() {
  const { id } = useParams(); const [song, setSong] = useState(null); const [project, setProject] = useState(false);
  useEffect(() => { supabase.from('songs').select('*, albums(id,title)').eq('id', id).single().then(({ data }) => setSong(data)); }, [id]);
  if (!song) return <Layout><Loading /></Layout>;
  if (project) return <div className="projection" onClick={() => setProject(false)}><p>Click anywhere to exit</p><h1>{song.title}</h1><article dangerouslySetInnerHTML={{ __html: song.lyrics || '<p>No lyrics for this yet.</p>' }} /></div>;
  return <Layout><Link className="back" to={`/albums/${song.albums?.id}`}>← {song.albums?.title}</Link><div className="song-heading"><div><h1>{song.title}</h1>{song.songwriters && <p className="muted">{song.songwriters}</p>}</div><button onClick={() => setProject(true)}>Project lyrics</button></div>{song.youtube_url && <a className="external" href={song.youtube_url} target="_blank" rel="noreferrer">Watch on YouTube ↗</a>}<article className="lyrics" dangerouslySetInnerHTML={{ __html: song.lyrics || '<p class="muted">No lyrics for this yet.</p>' }} /></Layout>;
}

function Admin() {
  const [session, setSession] = useState(undefined); const [allowed, setAllowed] = useState(false);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setSession(data.session)); const { data: listener } = supabase.auth.onAuthStateChange((_event, state) => setSession(state)); return () => listener.subscription.unsubscribe(); }, []);
  useEffect(() => { if (!session) return setAllowed(false); supabase.rpc('is_lyrics_admin').then(({ data }) => setAllowed(Boolean(data))); }, [session]);
  if (session === undefined) return <Layout><Loading /></Layout>;
  return <Layout>{!session ? <Login /> : !allowed ? <><h1>Admin access required</h1><p className="muted">This signed-in account is not in the `admin_users` allow-list.</p><button onClick={() => supabase.auth.signOut()}>Sign out</button></> : <LibraryAdmin />}</Layout>;
}

function Login() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  async function submit(event) { event.preventDefault(); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setError(error.message); }
  return <section className="login"><h1>Admin sign in</h1><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>{error && <ErrorMessage error={error} />}<button>Sign in</button></form></section>;
}

function LibraryAdmin() {
  const [albums, setAlbums] = useState([]); const [selected, setSelected] = useState(null); const [notice, setNotice] = useState(''); const refresh = () => getAlbums().then(setAlbums);
  useEffect(() => { refresh(); }, []);
  async function createAlbum(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const { error } = await supabase.from('albums').insert({ title: form.get('title'), year: Number(form.get('year')) || null }); if (error) setNotice(error.message); else { event.currentTarget.reset(); setNotice('Album created.'); refresh(); } }
  return <section><div className="admin-heading"><div><h1>Library admin</h1><p className="muted">Signed in securely with Supabase Auth.</p></div><button className="secondary" onClick={() => supabase.auth.signOut()}>Sign out</button></div>{notice && <p className="notice">{notice}</p>}<form className="inline-form" onSubmit={createAlbum}><input name="title" required placeholder="New album title" /><input name="year" type="number" placeholder="Year" /><button>Create album</button></form><div className="admin-layout"><section><h2>Albums</h2>{albums.map((album) => <button className={`admin-album ${selected?.id === album.id ? 'active' : ''}`} onClick={() => setSelected(album)} key={album.id}>{album.title}<small>{album.song_count} songs</small></button>)}</section>{selected ? <AlbumEditor album={selected} onSaved={() => { refresh(); setNotice('Saved.'); }} /> : <p className="muted">Choose an album to manage songs.</p>}</div></section>;
}

function AlbumEditor({ album, onSaved }) {
  const [songs, setSongs] = useState([]); const [message, setMessage] = useState(''); const refresh = () => supabase.from('songs').select('*').eq('album_id', album.id).order('track_number').then(({ data }) => setSongs(data || []));
  useEffect(() => { refresh(); }, [album.id]);
  async function addSong(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const { error } = await supabase.from('songs').insert({ album_id: album.id, title: form.get('title'), track_number: Number(form.get('track_number')) || null, songwriters: form.get('songwriters') || null, lyrics: form.get('lyrics') || null }); if (error) setMessage(error.message); else { event.currentTarget.reset(); refresh(); onSaved(); } }
  async function importDocx(event) { const file = event.target.files?.[0]; if (!file) return; try { const parsed = await parseSongsFromDocx(file); const next = (Math.max(0, ...songs.map((song) => song.track_number || 0)) + 1); const rows = parsed.map((song, index) => ({ ...song, album_id: album.id, track_number: song.track_number || next + index })); const { error } = await supabase.from('songs').insert(rows); queryError(error); setMessage(`Imported ${rows.length} songs from ${file.name}.`); refresh(); onSaved(); } catch (error) { setMessage(error.message); } finally { event.target.value = ''; } }
  async function removeSong(id) { if (!window.confirm('Delete this song?')) return; const { error } = await supabase.from('songs').delete().eq('id', id); if (error) setMessage(error.message); else { refresh(); onSaved(); } }
  return <section className="editor"><h2>{album.title}</h2><label className="upload">Import DOCX<input type="file" accept=".docx" onChange={importDocx} /></label>{message && <p className="notice">{message}</p>}<form className="song-form" onSubmit={addSong}><h3>Add song</h3><input name="title" required placeholder="Song title" /><input name="track_number" type="number" placeholder="Track #" /><input name="songwriters" placeholder="Songwriter(s)" /><textarea name="lyrics" placeholder="Lyrics (plain text or TipTap-compatible HTML)" rows="6" /><button>Add song</button></form><div className="admin-songs">{songs.map((song) => <div key={song.id}><span>{song.track_number || '—'}</span><strong>{song.title}</strong><button className="danger" onClick={() => removeSong(song.id)}>Delete</button></div>)}</div></section>;
}

export default function App() {
  if (configurationError) return <main><section className="login"><p className="eyebrow">SETUP REQUIRED</p><h1>Supabase needs one small fix.</h1><p>{configurationError}</p></section></main>;
  return <Routes><Route path="/" element={<Home />} /><Route path="/albums" element={<Albums />} /><Route path="/albums/:id" element={<Album />} /><Route path="/songs/:id" element={<Song />} /><Route path="/admin" element={<Admin />} /><Route path="*" element={<Home />} /></Routes>;
}
