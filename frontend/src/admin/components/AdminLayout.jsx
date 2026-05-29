import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Disc, Home, LogOut, Shield, FolderOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

export default function AdminLayout({ albums, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('adminSidebarCollapsed') === 'true')

  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')
  const toggleLabel = sidebarCollapsed ? 'Expand admin navigation' : 'Collapse admin navigation'

  return (
    <div className={`layout ${sidebarCollapsed ? 'layout-sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="sidebar-logo-main">Admin Console</span>
            <span className="sidebar-logo-sub">Living Word Lyrics</span>
          </div>
          <button className="sidebar-toggle" type="button" onClick={() => setSidebarCollapsed((value) => !value)} title={toggleLabel} aria-label={toggleLabel}>
            {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className={`nav-item ${location.pathname === '/admin' ? 'active' : ''}`} onClick={() => navigate('/admin')}>
            <Shield size={15} className="nav-item-icon" />
            <span className="nav-item-label">Dashboard</span>
          </div>

          <div className={`nav-item ${isActive('/admin/albums') ? 'active' : ''}`} onClick={() => navigate('/admin/albums')}>
            <FolderOpen size={15} className="nav-item-icon" />
            <span className="nav-item-label">Albums</span>
          </div>

          {albums.length > 0 && (
            <>
              <div className="nav-section-label nav-volumes-label">Volumes</div>
              {albums.map((album) => (
                <div
                  key={album.id}
                  className={`nav-item nav-volume-item ${isActive(`/admin/albums/${album.id}`) ? 'active' : ''}`}
                  onClick={() => navigate(`/admin/albums/${album.id}`)}
                >
                  <Disc size={14} className="nav-item-icon" />
                  <span className="nav-item-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {album.title}
                  </span>
                </div>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            <Home size={14} /> <span className="sidebar-action-label">Public site</span>
          </button>
          <button className="btn btn-danger" onClick={onLogout}>
            <LogOut size={14} /> <span className="sidebar-action-label">Logout</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
