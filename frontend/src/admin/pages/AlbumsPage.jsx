import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Disc, X, Pencil, Trash2 } from 'lucide-react'
import { api } from '../../api'
import { ALBUM_SORT_OPTIONS, sortAlbums } from '../../shared/utils/albums'

function AlbumModal({ album, onClose, onSave }) {
  const [form, setForm] = useState({
    title: album?.title || '',
    year: album?.year || '',
    description: album?.description || '',
    cover_url: album?.cover_url || '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      if (album) await api.albums.update(album.id, form)
      else await api.albums.create(form)
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
          <h2>{album ? 'Edit album' : 'New album'}</h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input placeholder="e.g. Saints Community Songs Vol. 13" value={form.title} onChange={(e) => set('title', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Year</label>
              <input type="number" placeholder="2023" value={form.year} onChange={(e) => set('year', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea rows={3} placeholder="Brief description of this volume..." value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Cover image URL</label>
            <input placeholder="https://..." value={form.cover_url} onChange={(e) => set('cover_url', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : album ? 'Save changes' : 'Create album'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AlbumsPage({ albums, onRefresh, showToast }) {
  const navigate = useNavigate()
  const [modal, setModal] = useState(null)
  const [albumSort, setAlbumSort] = useState('smart_desc')
  const sortedAlbums = sortAlbums(albums, albumSort)

  const handleDelete = async (event, album) => {
    event.stopPropagation()
    if (!confirm(`Delete "${album.title}" and all its songs?`)) return

    try {
      await api.albums.delete(album.id)
      showToast('Album deleted')
      onRefresh()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="page page-wide">
      <div className="page-header">
        <h1>Albums</h1>
        <p>Create and manage song volumes</p>
      </div>

      <div className="page-actions">
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{albums.length} album{albums.length !== 1 ? 's' : ''}</span>
        <div className="actions-cluster">
          <label className="sort-control">
            <span>Sort</span>
            <select value={albumSort} onChange={(event) => setAlbumSort(event.target.value)}>
              {ALBUM_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            <Plus size={15} /> New album
          </button>
        </div>
      </div>

      {albums.length === 0 ? (
        <div className="empty-state">
          <Disc size={48} />
          <p>No albums yet.</p>
          <button className="btn btn-primary" onClick={() => setModal('new')}><Plus size={15} /> New album</button>
        </div>
      ) : (
        <div className="card-grid">
          {sortedAlbums.map((album) => (
            <div key={album.id} className="album-card" onClick={() => navigate(`/admin/albums/${album.id}`)}>
              <div className="album-cover">
                {album.cover_url ? <img src={album.cover_url} alt={album.title} /> : <Disc size={40} className="album-cover-placeholder" />}
              </div>
              <div className="album-title">{album.title}</div>
              <div className="album-meta">
                {album.year && <span>{album.year} · </span>}
                <span>{album.song_count} song{album.song_count !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setModal(album) }}>
                  <Pencil size={13} /> Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(e, album)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <AlbumModal
          album={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => {
            setModal(null)
            showToast(modal === 'new' ? 'Album created' : 'Album updated')
            onRefresh()
          }}
        />
      )}
    </div>
  )
}
