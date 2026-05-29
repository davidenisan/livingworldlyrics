import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'

export default function LoginPage({ onLoggedIn }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.auth.login(form)
      await onLoggedIn()
      navigate('/admin')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Admin Login</h1>
        <p>Manage albums and songs for Living Word Lyrics.</p>

        <div className="form-group">
          <label className="form-label">Username</label>
          <input value={form.username} onChange={(event) => set('username', event.target.value)} autoComplete="username" />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(event) => set('password', event.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
