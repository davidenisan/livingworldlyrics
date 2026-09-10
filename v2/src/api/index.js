import { configurationError, supabase } from '../supabase'
import { parseSongsFromDocx } from '../../src-supabase-prototype/docx'

const assertConfigured = () => { if (configurationError) throw new Error(configurationError) }
const unwrap = ({ data, error }) => { if (error) throw new Error(error.message); return data }
const nullable = (value) => (value === '' || value === undefined ? null : value)
const normalizeSong = (song) => ({ ...song, album_title: song.albums?.title, album_cover_url: song.albums?.cover_url, albums: undefined })

function fileFromBase64(value, filename) {
  const raw = String(value).includes(',') ? String(value).split(',').pop() : String(value)
  const bytes = Uint8Array.from(atob(raw), (character) => character.charCodeAt(0))
  return new File([bytes], filename || 'songs.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

async function currentAdmin() {
  assertConfigured()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Unauthorized')
  if (!unwrap(await supabase.rpc('is_lyrics_admin'))) throw new Error('Unauthorized')
  return session.user
}

async function listAlbums() {
  assertConfigured()
  const albums = unwrap(await supabase.from('albums').select('*, songs(count)'))
  return albums.map((album) => ({ ...album, song_count: album.songs?.[0]?.count || 0, songs: undefined }))
}

export const api = {
  auth: {
    async login({ username, password }) {
      assertConfigured()
      const { data, error } = await supabase.auth.signInWithPassword({ email: username.trim(), password })
      if (error) throw new Error(error.message)
      if (!unwrap(await supabase.rpc('is_lyrics_admin'))) { await supabase.auth.signOut(); throw new Error('This account is not an admin.') }
      return { user: { username: data.user.email } }
    },
    async logout() { assertConfigured(); unwrap(await supabase.auth.signOut()); return { success: true } },
    async me() { const user = await currentAdmin(); return { user: { username: user.email } } },
  },
  albums: {
    list: listAlbums,
    async get(id) {
      assertConfigured()
      const album = unwrap(await supabase.from('albums').select('*, songs(*)').eq('id', id).single())
      return { ...album, songs: [...(album.songs || [])].sort((a, b) => (a.track_number ?? Infinity) - (b.track_number ?? Infinity) || a.title.localeCompare(b.title)) }
    },
    async create(form) { await currentAdmin(); return unwrap(await supabase.from('albums').insert({ ...form, year: nullable(form.year) }).select().single()) },
    async update(id, form) { await currentAdmin(); return unwrap(await supabase.from('albums').update({ ...form, year: nullable(form.year) }).eq('id', id).select().single()) },
    async delete(id) { await currentAdmin(); unwrap(await supabase.from('albums').delete().eq('id', id)); return { success: true } },
    async importDocx(albumId, { fileBase64, filename }) {
      await currentAdmin()
      const songs = await parseSongsFromDocx(fileFromBase64(fileBase64, filename))
      if (!songs.length) throw new Error('No songs found in DOCX. Use Heading 1 or Heading 2 for song titles.')
      const existing = unwrap(await supabase.from('songs').select('track_number').eq('album_id', albumId))
      let nextTrack = Math.max(0, ...existing.map((song) => Number(song.track_number) || 0)) + 1
      const rows = songs.map((song) => ({ ...song, album_id: Number(albumId), track_number: song.track_number || nextTrack++ }))
      unwrap(await supabase.from('songs').insert(rows))
      return { success: true, imported: rows.length, songs: rows }
    },
    async applyLwmUrl(albumId, { lwm_url, onlyMissing = true }) {
      await currentAdmin()
      let query = supabase.from('songs').select('id').eq('album_id', albumId)
      if (onlyMissing) query = query.or('lwm_url.is.null,lwm_url.eq.')
      const rows = unwrap(await query)
      if (rows.length) unwrap(await supabase.from('songs').update({ lwm_url }).in('id', rows.map((row) => row.id)))
      return { success: true, updated: rows.length, onlyMissing, lwm_url }
    },
  },
  songs: {
    async search(q) {
      assertConfigured()
      const value = String(q || '').trim()
      let query = supabase.from('songs').select('*, albums(title, cover_url)').order('title')
      if (value) query = query.or(`title.ilike.%${value}%,lyrics.ilike.%${value}%,songwriters.ilike.%${value}%`)
      return unwrap(await query).map(normalizeSong)
    },
    async get(id) { assertConfigured(); return normalizeSong(unwrap(await supabase.from('songs').select('*, albums(title, cover_url)').eq('id', id).single())) },
    async create(albumId, form) { await currentAdmin(); return unwrap(await supabase.from('songs').insert({ ...form, album_id: Number(albumId), track_number: nullable(form.track_number), lyrics: nullable(form.lyrics) }).select().single()) },
    async update(id, form) { await currentAdmin(); return unwrap(await supabase.from('songs').update({ ...form, track_number: nullable(form.track_number), lyrics: nullable(form.lyrics) }).eq('id', id).select().single()) },
    async delete(id) { await currentAdmin(); unwrap(await supabase.from('songs').delete().eq('id', id)); return { success: true } },
  },
  stats: {
    async summary() {
      await currentAdmin()
      const [albums, songs] = await Promise.all([listAlbums(), unwrap(await supabase.from('songs').select('*, albums(title)').order('created_at', { ascending: false }))])
      const usable = songs.filter((song) => Boolean(String(song.lyrics || '').trim()))
      return { totalAlbums: albums.length, totalSongs: songs.length, songsWithLyrics: usable.length, missingLyrics: songs.length - usable.length, lyricCoveragePercent: songs.length ? Math.round((usable.length / songs.length) * 100) : 0, songsWithYouTube: songs.filter((song) => song.youtube_url?.trim()).length, songsWithLwm: songs.filter((song) => song.lwm_url?.trim()).length, songsWithSongwriters: songs.filter((song) => song.songwriters?.trim()).length, albumsWithoutSongs: albums.filter((album) => !album.song_count).length, largestAlbum: [...albums].sort((a,b) => b.song_count - a.song_count)[0], recentlyAddedSongs: songs.slice(0,5).map((song) => ({ id: song.id, albumId: song.album_id, title: song.title, albumTitle: song.albums?.title, hasLyrics: Boolean(String(song.lyrics || '').trim()), createdAt: song.created_at })) }
    },
    async analytics() { await currentAdmin(); return { configured: false, message: 'Google Analytics is not configured in v2 yet.' } },
  },
}
