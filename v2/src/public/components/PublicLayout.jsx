import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'

export default function PublicLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  useEffect(() => {
    const current = new URLSearchParams(location.search).get('q') || ''
    setQuery(current)
  }, [location.search])

  const handleSubmit = (event) => {
    event.preventDefault()
    const value = query.trim()
    if (!value) {
      navigate('/')
      return
    }
    navigate(`/?q=${encodeURIComponent(value)}`)
  }

  return (
    <div className="public-layout">
      <header className="public-header">
        <Link className="public-brand" to="/">Living Word Lyrics</Link>
        <form className="public-header-search" onSubmit={handleSubmit}>
          <Search size={16} />
          <input
            placeholder="Search songs, lyrics, songwriters..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="btn btn-primary" type="submit">Search</button>
        </form>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
