import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, ChevronLeft, Music, X, Trash2, Youtube, Link, Upload } from 'lucide-react'
import { api } from '../../api'

function hasUsableLyrics(lyrics) {
  if (!lyrics) return false

  const plain = String(lyrics)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  if (!plain) return false
  if (plain.includes('no lyrics for this yet')) return false
  if (plain.includes('no lyrics yet')) return false

  return true
}

function AddSongModal({ albumId, onClose, onSave }) {
  const [form, setForm] = useState({ title: '', track_number: '', youtube_url: '', lwm_url: '', songwriters: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await api.songs.create(albumId, form)
      onSave()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Add song</h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Track #</label>
              <input type="number" placeholder="1" value={form.track_number} onChange={(e) => set('track_number', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 1' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Song title *</label>
            <input
              placeholder="e.g. Praise the Lord All Nations"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Songwriters (comma-separated)</label>
            <input placeholder="John Doe, Jane Smith" value={form.songwriters} onChange={(e) => set('songwriters', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">YouTube URL</label>
            <input placeholder="https://youtube.com/watch?v=..." value={form.youtube_url} onChange={(e) => set('youtube_url', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Living Word Media URL</label>
            <input placeholder="https://livingwordmedia.org/..." value={form.lwm_url} onChange={(e) => set('lwm_url', e.target.value)} />
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function ImportDocxModal({ albumId, onClose, onImported }) {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  const handleImport = async () => {
    if (!file) return
    setError('')
    setImporting(true)

    try {
      const fileBase64 = await fileToBase64(file)
      const result = await api.albums.importDocx(albumId, { filename: file.name, fileBase64 })
      onImported(result.imported || 0)
    } catch (err) {
      setError(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Import DOCX songs</h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">DOCX file</label>
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Format guide: `Heading 1` or `Heading 2` for song titles, `Heading 3` for songwriter names.
          </p>
          {file && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Selected: {file.name}
            </p>
          )}
          {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleImport} disabled={!file || importing}>
            {importing ? 'Importing...' : 'Import songs'}
          </button>
        </div>
      </div>
    </div>
  )
}

function LwmLinkModal({ albumId, initialUrl, onClose, onApplied }) {
  const [lwmUrl, setLwmUrl] = useState(initialUrl || '')
  const [onlyMissing, setOnlyMissing] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleApply = async () => {
    if (!lwmUrl.trim()) return
    setError('')
    setSaving(true)

    try {
      const result = await api.albums.applyLwmUrl(albumId, { lwm_url: lwmUrl, onlyMissing })
      onApplied(result.updated || 0)
    } catch (err) {
      setError(err.message || 'Could not apply link')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Apply Living Word Media link</h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Living Word Media URL</label>
            <input
              placeholder="https://livingwordmedia.org/..."
              value={lwmUrl}
              onChange={(event) => setLwmUrl(event.target.value)}
            />
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={onlyMissing} onChange={(event) => setOnlyMissing(event.target.checked)} />
            <span>Only fill songs missing a Living Word Media link</span>
          </label>
          {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply} disabled={!lwmUrl.trim() || saving}>
            {saving ? 'Applying...' : 'Apply link'}
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
  const [showImport, setShowImport] = useState(false)
  const [showLwmLink, setShowLwmLink] = useState(false)

  const load = async () => {
    try {
      setAlbum(await api.albums.get(id))
    } catch {
      navigate('/admin/albums')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const handleDeleteSong = async (event, song) => {
    event.stopPropagation()
    if (!confirm(`Delete "${song.title}"?`)) return

    try {
      await api.songs.delete(song.id)
      showToast('Song deleted')
      load()
      onRefresh()
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <div className="page" style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
  if (!album) return null

  const firstLwmUrl = album.songs?.find((song) => song.lwm_url)?.lwm_url || ''
  const songsMissingLwm = album.songs?.filter((song) => !song.lwm_url).length || 0

  return (
    <div className="page">
      <div className="breadcrumb">
        <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => navigate('/admin/albums')}>
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
          {album.songs?.length > 0 && ` · ${songsMissingLwm} missing LWM`}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowLwmLink(true)} disabled={!album.songs?.length}>
            <Link size={14} /> Apply LWM link
          </button>
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={14} /> Import DOCX
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddSong(true)}>
            <Plus size={15} /> Add song
          </button>
        </div>
      </div>

      {!album.songs?.length ? (
        <div className="empty-state">
          <Music size={40} />
          <p>No songs yet.</p>
          <button className="btn btn-primary" onClick={() => setShowAddSong(true)}>
            <Plus size={15} /> Add song
          </button>
        </div>
      ) : (
        <div className="card">
          <ul className="song-list">
            {album.songs.map((song) => (
              <li key={song.id} className="song-item" onClick={() => navigate(`/admin/albums/${id}/songs/${song.id}`)}>
                <span className="song-track">{song.track_number ?? '—'}</span>
                <span className="song-title">{song.title}</span>
                <div className="song-badges">
                  {hasUsableLyrics(song.lyrics)
                    ? <span className="badge badge-lyrics">lyrics</span>
                    : <span className="badge badge-no-lyrics">No lyrics yet</span>}
                  {song.youtube_url && <span className="badge badge-yt"><Youtube size={10} /></span>}
                  {song.lwm_url && <span className="badge badge-lwm"><Link size={10} /></span>}
                </div>
                <button className="btn btn-ghost" style={{ padding: '4px 6px', marginLeft: 4 }} onClick={(e) => handleDeleteSong(e, song)}>
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
          onSave={() => {
            setShowAddSong(false)
            showToast('Song added')
            load()
            onRefresh()
          }}
        />
      )}

      {showImport && (
        <ImportDocxModal
          albumId={id}
          onClose={() => setShowImport(false)}
          onImported={(count) => {
            setShowImport(false)
            showToast(`Imported ${count} song${count !== 1 ? 's' : ''}`)
            load()
            onRefresh()
          }}
        />
      )}

      {showLwmLink && (
        <LwmLinkModal
          albumId={id}
          initialUrl={firstLwmUrl}
          onClose={() => setShowLwmLink(false)}
          onApplied={(count) => {
            setShowLwmLink(false)
            showToast(`Updated ${count} song${count !== 1 ? 's' : ''}`)
            load()
            onRefresh()
          }}
        />
      )}
    </div>
  )
}
