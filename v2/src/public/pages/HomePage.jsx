import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Link, Search, Youtube } from 'lucide-react'
import { api } from '../../api'
import { ALBUM_SORT_OPTIONS } from '../../shared/utils/albums'
import { hasUsableLyrics, highlightText, searchMatchSnippet } from '../../shared/utils/lyrics'

const INITIAL_RESULT_COUNT = 3

export default function HomePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''

  const [query, setQuery] = useState(q)
  const [results, setResults] = useState([])
  const [albums, setAlbums] = useState([])
  const [albumSort, setAlbumSort] = useState('smart_desc')
  const [loading, setLoading] = useState(false)
  const [showAllResults, setShowAllResults] = useState(false)

  useEffect(() => {
    api.albums.list({ sort: albumSort }).then(setAlbums).catch(() => {})
  }, [albumSort])

  useEffect(() => {
    setQuery((current) => (current.trim() === q ? current : q))
    setShowAllResults(false)
  }, [q])

  useEffect(() => {
    const value = query.trim()

    if (!value) {
      const timeout = setTimeout(() => {
        if (q) setParams({})
      }, 180)
      return () => clearTimeout(timeout)
    }

    if (!shouldSearch(value, query)) return undefined

    const timeout = setTimeout(() => {
      if (value !== q) setParams({ q: value })
    }, query.endsWith(' ') ? 0 : 260)

    return () => clearTimeout(timeout)
  }, [query, q, setParams])

  useEffect(() => {
    if (!q) {
      setResults([])
      return
    }

    let cancelled = false
    setLoading(true)
    api.songs.search(q)
      .then((songs) => {
        if (!cancelled) setResults(songs)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [q])

  const visibleResults = showAllResults ? results : results.slice(0, INITIAL_RESULT_COUNT)
  const hiddenResultCount = Math.max(0, results.length - INITIAL_RESULT_COUNT)

  return (
    <div className="public-page">
      <section className="search-hero">
        <h1>Find Worship Lyrics Fast</h1>
        <form
          className="home-search"
          onSubmit={(event) => {
            event.preventDefault()
            const value = query.trim()
            if (value) setParams({ q: value })
          }}
        >
          <Search size={20} />
          <input
            placeholder="Search songs, lyrics, songwriters..."
            value={query}
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="btn btn-primary" type="submit">Search</button>
        </form>
        <p>Songs, lyrics, and writers from the Living Word library.</p>
      </section>

      {q && (
        <section className="public-section">
          <h2>Results for "{q}"</h2>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Searching...</p>
          ) : results.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No songs found.</p>
          ) : (
            <div className="public-results">
              {visibleResults.map((song) => (
                <SearchResult key={song.id} song={song} query={q} onOpen={() => navigate(`/songs/${song.id}`)} />
              ))}
              {!showAllResults && hiddenResultCount > 0 && (
                <button className="btn btn-secondary public-show-more" type="button" onClick={() => setShowAllResults(true)}>
                  Show {hiddenResultCount} more
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {!q && (
        <section className="public-section">
          <div className="section-heading-row">
            <h2>Albums</h2>
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
                <div className="album-meta">{album.song_count} song{album.song_count !== 1 ? 's' : ''}</div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function SearchResult({ song, query, onOpen }) {
  const snippet = searchMatchSnippet(song.lyrics, query)

  return (
    <article className="public-result" onClick={onOpen}>
      <h3>{renderHighlighted(song.title, query)}</h3>
      <p className="public-result-meta">{song.album_title}</p>
      {song.songwriters && (
        <p className="public-result-meta">Words &amp; Music: {renderHighlighted(song.songwriters, query)}</p>
      )}
      {snippet.segments.length > 0 && (
        <p className="public-result-snippet">
          <span className="public-result-snippet-label">Lyrics: </span>
          {snippet.prefix}
          {snippet.segments.map((segment, index) => (
            <span key={`${segment.text}-${index}`} className={segment.match ? 'search-highlight' : undefined}>
              {segment.text}
            </span>
          ))}
          {snippet.suffix}
        </p>
      )}
      <div className="song-badges" style={{ marginTop: 8 }}>
        {hasUsableLyrics(song.lyrics)
          ? <span className="badge badge-lyrics">lyrics</span>
          : <span className="badge badge-no-lyrics">No lyrics yet</span>}
        {song.youtube_url && <span className="badge badge-yt"><Youtube size={10} /></span>}
        {song.lwm_url && <span className="badge badge-lwm"><Link size={10} /></span>}
      </div>
    </article>
  )
}

function renderHighlighted(value, query) {
  return highlightText(value, query).map((segment, index) => (
    <span key={`${segment.text}-${index}`} className={segment.match ? 'search-highlight' : undefined}>
      {segment.text}
    </span>
  ))
}

function shouldSearch(value, rawValue) {
  return value.length >= 2 || /\S+\s$/.test(rawValue)
}
