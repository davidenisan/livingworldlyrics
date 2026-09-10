import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { ALBUM_SORT_OPTIONS } from '../../shared/utils/albums'

export default function AlbumsPage() {
  const navigate = useNavigate()
  const [albums, setAlbums] = useState([])
  const [albumSort, setAlbumSort] = useState('smart_desc')

  useEffect(() => {
    api.albums.list({ sort: albumSort }).then(setAlbums).catch(() => {})
  }, [albumSort])

  return (
    <div className="public-page">
      <section className="public-section">
        <div className="section-heading-row">
          <h1>Albums</h1>
          <label className="sort-control">
            <span>Sort</span>
            <select value={albumSort} onChange={(event) => setAlbumSort(event.target.value)}>
              {ALBUM_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="card-grid">
          {albums.map((album) => (
            <article key={album.id} className="album-card" onClick={() => navigate(`/albums/${album.id}`)}>
              <div className="album-cover">
                {album.cover_url ? <img src={album.cover_url} alt={album.title} /> : <span className="album-cover-placeholder">Album</span>}
              </div>
              <div className="album-title">{album.title}</div>
              <div className="album-meta">
                {album.year && <span>{album.year} · </span>}
                <span>{album.song_count} song{album.song_count !== 1 ? 's' : ''}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
