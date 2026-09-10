import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, ChevronLeft, Music, X, Trash2, Youtube, Link } from 'lucide-react'
import { api } from '../api'

function AddSongModal({ albumId, onClose, onSave }) {
  const [form, setForm] = useState({ title: '', track_number: '', youtube_url: '', lwm_url: '', songwriters: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await api.songs.create(albumId, form)
      onSave()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Add song</h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Track #</label>
              <input type="number" placeholder="1" value={form.track_number} onChange={e => set('track_number', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 1' }}>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Song title *</label>
            <input placeholder="e.g. Praise the Lord All Nations" value={form.title} onChange={e => set('title', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </div>
          <div className="form-group">
            <label className="form-label">YouTube URL</label>
            <input placeholder="https://youtube.com/watch?v=..." value={form.youtube_url} onChange={e => set('youtube_url', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Songwriters (comma-separated)</label>
            <input placeholder="John Doe, Jane Smith" value={form.songwriters} onChange={e => set('songwriters', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Living Word Media URL</label>
            <input placeholder="https://livingwordmedia.org/..." value={form.lwm_url} onChange={e => set('lwm_url', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Adding...' : 'Add song'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AlbumPage({ onRefresh, showToast }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [album, setAlbum] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddSong, setShowAddSong] = useState(false)

  const load = async () => {
    try {
      setAlbum(await api.albums.get(id))
    } catch { navigate('/') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const handleDeleteSong = async (e, song) => {
    e.stopPropagation()
    if (!confirm(`Delete "${song.title}"?`)) return
    try {
      await api.songs.delete(song.id)
      showToast('Song deleted')
      load()
    } catch (e) { alert(e.message) }
  }

  if (loading) return <div className="page" style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
  if (!album) return null

  return (
    <div className="page">
      <div className="breadcrumb">
        <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => navigate('/')}>
          <ChevronLeft size={14} /> Albums
        </span>
        <span className="breadcrumb-sep">/</span>
        <span>{album.title}</span>
      </div>

      <div className="page-header">
        <h1>{album.title}</h1>
        {album.year && <p style={{ marginBottom: 4 }}>{album.year}</p>}
        {album.description && <p>{album.description}</p>}
      </div>

      <div className="page-actions">
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          {album.songs?.length || 0} song{album.songs?.length !== 1 ? 's' : ''}
        </span>
        <button className="btn btn-primary" onClick={() => setShowAddSong(true)}>
          <Plus size={15} /> Add song
        </button>
      </div>

      {!album.songs?.length ? (
        <div className="empty-state">
          <Music size={40} />
          <p>No songs yet. Add the first song to this album.</p>
          <button className="btn btn-primary" onClick={() => setShowAddSong(true)}>
            <Plus size={15} /> Add song
          </button>
        </div>
      ) : (
        <div className="card">
          <ul className="song-list">
            {album.songs.map(song => (
              <li
                key={song.id}
                className="song-item"
                onClick={() => navigate(`/albums/${id}/songs/${song.id}`)}
              >
                <span className="song-track">{song.track_number ?? '—'}</span>
                <span className="song-title">{song.title}</span>
                <div className="song-badges">
                  {song.lyrics && <span className="badge badge-lyrics">lyrics</span>}
                  {song.youtube_url && <span className="badge badge-yt"><Youtube size={10} /></span>}
                  {song.lwm_url && <span className="badge badge-lwm"><Link size={10} /></span>}
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '4px 6px', marginLeft: 4 }}
                  onClick={e => handleDeleteSong(e, song)}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showAddSong && (
        <AddSongModal
          albumId={id}
          onClose={() => setShowAddSong(false)}
          onSave={() => { setShowAddSong(false); showToast('Song added'); load(); onRefresh() }}
        />
      )}
    </div>
  )
}
