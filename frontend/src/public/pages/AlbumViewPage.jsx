import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Link, Youtube } from 'lucide-react'
import { api } from '../../api'
import { hasUsableLyrics } from '../../shared/utils/lyrics'

export default function AlbumViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [album, setAlbum] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.albums.get(id)
      .then(setAlbum)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="public-page">Loading...</div>
  if (!album) return null

  return (
    <div className="public-page">
      <section className="public-section">
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          <ChevronLeft size={14} /> Home
        </button>
        <h1 style={{ marginTop: 10 }}>{album.title}</h1>
        {album.description && <p style={{ color: 'var(--text-muted)' }}>{album.description}</p>}

        <div className="card" style={{ marginTop: 20 }}>
          <ul className="song-list">
            {album.songs?.map((song) => (
              <li key={song.id} className="song-item" onClick={() => navigate(`/songs/${song.id}`)}>
                <span className="song-track">{song.track_number ?? '—'}</span>
                <div style={{ flex: 1 }}>
                  <div className="song-title">{song.title}</div>
                  {song.songwriters && <div className="search-result-meta">Words &amp; Music: {song.songwriters}</div>}
                </div>
                <div className="song-badges">
                  {hasUsableLyrics(song.lyrics)
                    ? <span className="badge badge-lyrics">lyrics</span>
                    : <span className="badge badge-no-lyrics">No lyrics yet</span>}
                  {song.youtube_url && <span className="badge badge-yt"><Youtube size={10} /></span>}
                  {song.lwm_url && <span className="badge badge-lwm"><Link size={10} /></span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
