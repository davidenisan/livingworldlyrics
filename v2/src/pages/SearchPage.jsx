import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Music } from 'lucide-react'
import { api } from '../api'

export default function SearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get('q') || ''
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!q) return
    setLoading(true)
    api.songs.search(q).then(setResults).finally(() => setLoading(false))
  }, [q])

  return (
    <div className="page">
      <div className="page-header">
        <h1>Search results</h1>
        <p>"{q}" — {results.length} result{results.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Searching...</p>
      ) : results.length === 0 ? (
        <div className="empty-state">
          <Music size={40} />
          <p>No songs or lyrics matched "{q}"</p>
        </div>
      ) : (
        <div className="card">
          <ul className="song-list">
            {results.map(song => (
              <li
                key={song.id}
                className="song-item"
                onClick={() => navigate(`/albums/${song.album_id}/songs/${song.id}`)}
              >
                <span className="song-track">{song.track_number ?? '—'}</span>
                <div style={{ flex: 1 }}>
                  <div className="song-title">{song.title}</div>
                  <div className="search-result-album">{song.album_title}</div>
                  {song.songwriters && <div className="search-result-meta">Words &amp; Music: {song.songwriters}</div>}
                </div>
                <div className="song-badges">
                  {song.lyrics && <span className="badge badge-lyrics">lyrics</span>}
                  {song.youtube_url && <span className="badge badge-yt">YT</span>}
                  {song.lwm_url && <span className="badge badge-lwm">LWM</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
