import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Disc, FileText, FileWarning, Link, Music, PenLine, Plus, Youtube } from 'lucide-react'
import { api } from '../../api'

export default function DashboardPage({ albums }) {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState('')

  const fallbackStats = useMemo(() => ({
    totalAlbums: albums.length,
    totalSongs: albums.reduce((sum, album) => sum + Number(album.song_count || 0), 0),
    songsWithLyrics: 0,
    missingLyrics: 0,
    lyricCoveragePercent: 0,
    songsWithYouTube: 0,
    songsWithLwm: 0,
    songsWithSongwriters: 0,
    albumsWithoutSongs: albums.filter((album) => Number(album.song_count || 0) === 0).length,
    largestAlbum: [...albums]
      .sort((a, b) => Number(b.song_count || 0) - Number(a.song_count || 0))[0],
    recentlyAddedSongs: [],
  }), [albums])

  useEffect(() => {
    let cancelled = false

    api.stats.summary()
      .then((summary) => {
        if (!cancelled) {
          setStats(summary)
          setStatsError('')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatsError('Could not load detailed stats.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const dashboardStats = stats || fallbackStats
  const missingLyricsTone = dashboardStats.missingLyrics > 0 ? 'warning' : 'good'

  return (
    <div className="page page-wide">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Manage your worship lyrics library</p>
      </div>

      {statsError && <p className="dashboard-error">{statsError}</p>}

      <section className="dashboard-metrics" aria-label="Library stats">
        <div className="metric-card">
          <Disc size={16} />
          <span>Total albums</span>
          <strong>{dashboardStats.totalAlbums}</strong>
        </div>
        <div className="metric-card">
          <Music size={16} />
          <span>Total songs</span>
          <strong>{dashboardStats.totalSongs}</strong>
        </div>
        <div className="metric-card metric-card-good">
          <FileText size={16} />
          <span>With lyrics</span>
          <strong>{dashboardStats.songsWithLyrics}</strong>
        </div>
        <button className={`metric-card metric-card-${missingLyricsTone}`} type="button" onClick={() => navigate('/admin/albums')}>
          <FileWarning size={16} />
          <span>Missing lyrics</span>
          <strong>{dashboardStats.missingLyrics}</strong>
        </button>
        <div className="metric-card">
          <BarChart3 size={16} />
          <span>Lyrics coverage</span>
          <strong>{dashboardStats.lyricCoveragePercent}%</strong>
        </div>
      </section>

      <section className="dashboard-insights" aria-label="More stats">
        <div className="insight-row">
          <Youtube size={15} />
          <span>YouTube links</span>
          <strong>{dashboardStats.songsWithYouTube}</strong>
        </div>
        <div className="insight-row">
          <Link size={15} />
          <span>Living Word Media links</span>
          <strong>{dashboardStats.songsWithLwm}</strong>
        </div>
        <div className="insight-row">
          <PenLine size={15} />
          <span>Songwriter credits</span>
          <strong>{dashboardStats.songsWithSongwriters}</strong>
        </div>
        <div className="insight-row">
          <Disc size={15} />
          <span>Empty albums</span>
          <strong>{dashboardStats.albumsWithoutSongs}</strong>
        </div>
      </section>

      <div className="page-actions">
        <button className="btn btn-primary" onClick={() => navigate('/admin/albums')}>
          <Plus size={15} /> Add / edit albums
        </button>
      </div>

      <section className="dashboard-summary">
        <div>
          <h2>Library snapshot</h2>
          <p>
            {dashboardStats.largestAlbum
              ? `${dashboardStats.largestAlbum.title} is the largest album with ${dashboardStats.largestAlbum.songCount || dashboardStats.largestAlbum.song_count} songs.`
              : 'Add songs to start building a library snapshot.'}
          </p>
        </div>
        {dashboardStats.recentlyAddedSongs.length > 0 && (
          <div>
            <h2>Recently added</h2>
            <ul className="recent-song-list">
              {dashboardStats.recentlyAddedSongs.map((song) => (
                <li key={song.id}>
                  <button type="button" onClick={() => navigate(`/admin/albums/${song.albumId}/songs/${song.id}`)}>
                    <span>{song.title}</span>
                    <small>{song.albumTitle}{song.hasLyrics ? ' · lyrics' : ' · missing lyrics'}</small>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {albums.length === 0 ? (
        <div className="empty-state">
          <Disc size={48} />
          <p>No albums yet. Create your first volume.</p>
          <button className="btn btn-primary" onClick={() => navigate('/admin/albums')}>
            <Plus size={15} /> Manage albums
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {albums.map((album) => (
            <div key={album.id} className="album-card" onClick={() => navigate(`/admin/albums/${album.id}`)}>
              <div className="album-cover">
                {album.cover_url ? <img src={album.cover_url} alt={album.title} /> : <Disc size={40} className="album-cover-placeholder" />}
              </div>
              <div className="album-title">{album.title}</div>
              <div className="album-meta">
                {album.year && <span>{album.year} · </span>}
                <span>{album.song_count} song{album.song_count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
