import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Disc,
  FileText,
  FileWarning,
  Globe2,
  Link,
  MonitorSmartphone,
  Music,
  PenLine,
  Plus,
  Users,
  Youtube,
} from 'lucide-react'
import { api } from '../../api'

export default function DashboardPage({ albums }) {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [statsError, setStatsError] = useState('')
  const [analyticsError, setAnalyticsError] = useState('')

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
    largestAlbum: [...albums].sort((a, b) => Number(b.song_count || 0) - Number(a.song_count || 0))[0],
    recentlyAddedSongs: [],
  }), [albums])

  useEffect(() => {
    let cancelled = false

    Promise.allSettled([
      api.stats.summary(),
      api.stats.analytics(),
    ]).then(([summaryResult, analyticsResult]) => {
      if (cancelled) return

      if (summaryResult.status === 'fulfilled') {
        setStats(summaryResult.value)
        setStatsError('')
      } else {
        setStatsError('Could not load detailed stats.')
      }

      if (analyticsResult.status === 'fulfilled') {
        setAnalytics(analyticsResult.value)
        setAnalyticsError('')
      } else {
        setAnalyticsError('Could not load Google Analytics.')
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

      <AnalyticsPanel analytics={analytics} analyticsError={analyticsError} />

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

function AnalyticsPanel({ analytics, analyticsError }) {
  if (analyticsError) return <p className="dashboard-error">{analyticsError}</p>

  if (!analytics) {
    return (
      <section className="analytics-panel">
        <h2>Google Analytics</h2>
        <p>Loading analytics...</p>
      </section>
    )
  }

  if (!analytics.configured) {
    return (
      <section className="analytics-panel">
        <h2>Google Analytics</h2>
        <p>{analytics.message}</p>
        <p>Add GA API credentials to show active users, top pages, countries, and devices here.</p>
      </section>
    )
  }

  const overview = analytics.overview30d || {}

  return (
    <section className="analytics-panel" aria-label="Google Analytics">
      <div className="section-heading-row">
        <h2>Google Analytics</h2>
        <span className="analytics-range">Last 30 days</span>
      </div>

      <div className="analytics-metrics">
        <AnalyticsMetric icon={<Users size={15} />} label="Active users" value={overview.activeUsers} />
        <AnalyticsMetric icon={<Users size={15} />} label="New users" value={overview.newUsers} />
        <AnalyticsMetric icon={<BarChart3 size={15} />} label="Sessions" value={overview.sessions} />
        <AnalyticsMetric icon={<FileText size={15} />} label="Page views" value={overview.screenPageViews} />
      </div>

      <div className="analytics-grid">
        <AnalyticsList title="Top pages" icon={<FileText size={15} />} rows={analytics.topPages} labelKey="pagePath" valueKey="screenPageViews" />
        <AnalyticsList title="Countries" icon={<Globe2 size={15} />} rows={analytics.countries} labelKey="country" valueKey="activeUsers" />
        <AnalyticsList title="Devices" icon={<MonitorSmartphone size={15} />} rows={analytics.devices} labelKey="deviceCategory" valueKey="activeUsers" />
      </div>
    </section>
  )
}

function AnalyticsMetric({ icon, label, value }) {
  return (
    <div className="analytics-metric">
      {icon}
      <span>{label}</span>
      <strong>{value || 0}</strong>
    </div>
  )
}

function AnalyticsList({ title, icon, rows = [], labelKey, valueKey }) {
  return (
    <div className="analytics-list">
      <h3>{icon}{title}</h3>
      {rows.length === 0 ? (
        <p>No data yet.</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={`${row[labelKey]}-${row[valueKey]}`}>
              <span>{row[labelKey] || '(not set)'}</span>
              <strong>{row[valueKey] || 0}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
