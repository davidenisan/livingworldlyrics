import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { api } from './api'

import AdminLayout from './admin/components/AdminLayout'
import LoginPage from './admin/pages/LoginPage'
import DashboardPage from './admin/pages/DashboardPage'
import AdminAlbumsPage from './admin/pages/AlbumsPage'
import AdminAlbumPage from './admin/pages/AlbumPage'
import AdminSongPage from './admin/pages/SongPage'

import PublicLayout from './public/components/PublicLayout'
import HomePage from './public/pages/HomePage'
import AlbumViewPage from './public/pages/AlbumViewPage'
import SongViewPage from './public/pages/SongViewPage'

function RequireAdmin({ authed, children }) {
  if (authed === null) {
    return <div className="page" style={{ color: 'var(--text-muted)', fontSize: 14 }}>Checking access...</div>
  }

  if (!authed) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}

export default function App() {
  const [albums, setAlbums] = useState([])
  const [toast, setToast] = useState(null)
  const [adminAuthed, setAdminAuthed] = useState(null)

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  const loadAlbums = useCallback(async () => {
    try {
      setAlbums(await api.albums.list())
    } catch {
      setAlbums([])
    }
  }, [])

  const refreshAuth = useCallback(async () => {
    try {
      await api.auth.me()
      setAdminAuthed(true)
    } catch {
      setAdminAuthed(false)
    }
  }, [])

  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  useEffect(() => {
    if (adminAuthed) {
      loadAlbums()
    }
  }, [adminAuthed, loadAlbums])

  const handleLogout = async () => {
    try {
      await api.auth.logout()
    } catch {
      // noop
    }
    setAdminAuthed(false)
    setAlbums([])
    showToast('Logged out')
  }

  return (
    <>
      <Routes>
        <Route
          path="/admin/login"
          element={
            adminAuthed === null
              ? <div className="page" style={{ color: 'var(--text-muted)', fontSize: 14 }}>Checking access...</div>
              : adminAuthed
                ? <Navigate to="/admin" replace />
                : <LoginPage onLoggedIn={refreshAuth} />
          }
        />

        <Route
          path="/admin"
          element={(
            <RequireAdmin authed={adminAuthed}>
              <AdminLayout albums={albums} onLogout={handleLogout} />
            </RequireAdmin>
          )}
        >
          <Route index element={<DashboardPage albums={albums} />} />
          <Route path="albums" element={<AdminAlbumsPage albums={albums} onRefresh={loadAlbums} showToast={showToast} />} />
          <Route path="albums/:id" element={<AdminAlbumPage onRefresh={loadAlbums} showToast={showToast} />} />
          <Route path="albums/:albumId/songs/:songId" element={<AdminSongPage showToast={showToast} />} />
        </Route>

        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="songs/:id" element={<SongViewPage />} />
          <Route path="albums" element={<Navigate to="/" replace />} />
          <Route path="albums/:id" element={<AlbumViewPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
