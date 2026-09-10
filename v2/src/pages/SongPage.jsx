import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { ChevronLeft, Youtube, Link, Save, Pencil, X, Bold, Italic, Heading2, Heading3, Quote } from 'lucide-react'
import { api } from '../api'

function LyricsEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Add lyrics here... Use headings for Verse, Chorus, Bridge labels.' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  if (!editor) return null

  const escapeHtml = (text) => text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  const handlePaste = (event) => {
    const plain = event.clipboardData?.getData('text/plain')
    const richHtml = event.clipboardData?.getData('text/html')

    if (!plain || richHtml?.trim()) return

    event.preventDefault()
    const normalized = plain.replace(/\r\n/g, '\n')
    const blocks = normalized.split(/\n{2,}/).filter(Boolean)
    const html = blocks
      .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
      .join('')

    editor.chain().focus().insertContent(html || '<p></p>').run()
  }

  const ToolBtn = ({ onClick, active, children, title }) => (
    <button
      type="button"
      className={`toolbar-btn ${active ? 'active' : ''}`}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
    >
      {children}
    </button>
  )

  return (
    <div className="tiptap-wrapper">
      <div className="tiptap-toolbar">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <Bold size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <Italic size={13} />
        </ToolBtn>
        <div style={{ width: 1, background: 'var(--border)', margin: '2px 4px' }} />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Section label (Verse, Chorus...)">
          <Heading2 size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Sub-label">
          <Heading3 size={13} />
        </ToolBtn>
        <div style={{ width: 1, background: 'var(--border)', margin: '2px 4px' }} />
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Chorus indent">
          <Quote size={13} />
        </ToolBtn>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">↩</ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">↪</ToolBtn>
        </div>
      </div>
      <EditorContent editor={editor} className="tiptap-editor" onPaste={handlePaste} />
    </div>
  )
}

export default function SongPage({ showToast }) {
  const { albumId, songId } = useParams()
  const navigate = useNavigate()
  const [song, setSong] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [projectionMode, setProjectionMode] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const s = await api.songs.get(songId)
      setSong(s)
      setForm({ title: s.title, track_number: s.track_number ?? '', lyrics: s.lyrics ?? '', youtube_url: s.youtube_url ?? '', lwm_url: s.lwm_url ?? '', songwriters: s.songwriters ?? '' })
    } catch { navigate(`/albums/${albumId}`) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [songId])

  useEffect(() => {
    if (!projectionMode) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape' || event.key.toLowerCase() === 'p') {
        setProjectionMode(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [projectionMode])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.songs.update(songId, form)
      showToast('Song saved')
      setEditing(false)
      load()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleCancel = () => {
    setForm({ title: song.title, track_number: song.track_number ?? '', lyrics: song.lyrics ?? '', youtube_url: song.youtube_url ?? '', lwm_url: song.lwm_url ?? '', songwriters: song.songwriters ?? '' })
    setEditing(false)
  }

  if (loading) return <div className="page" style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
  if (!song) return null

  return (
    <div className="page">
      <div className="breadcrumb">
        <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => navigate('/')}>Albums</span>
        <span className="breadcrumb-sep">/</span>
        <span style={{ cursor: 'pointer' }} onClick={() => navigate(`/albums/${albumId}`)}>{song.album_title}</span>
        <span className="breadcrumb-sep">/</span>
        <span>{song.title}</span>
      </div>

      <div className="song-detail-header">
        <div>
          {editing ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                style={{ fontSize: 22, fontFamily: 'Lora, serif', fontWeight: 600, width: 'auto', minWidth: 280 }}
              />
              <input
                type="number"
                value={form.track_number}
                onChange={e => set('track_number', e.target.value)}
                placeholder="Track #"
                style={{ width: 90 }}
              />
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 26, marginBottom: 6 }}>
                {song.track_number && <span style={{ color: 'var(--text-light)', fontSize: 18, marginRight: 8 }}>{song.track_number}.</span>}
                {song.title}
              </h1>
              {song.songwriters && (
                <p className="songwriters-meta">Words &amp; Music: {song.songwriters}</p>
              )}
            </>
          )}

          <div className="song-links">
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Youtube size={15} style={{ color: '#b91c1c', flexShrink: 0 }} />
                  <input placeholder="YouTube URL" value={form.youtube_url} onChange={e => set('youtube_url', e.target.value)} style={{ width: 340 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    placeholder="Songwriters (comma-separated)"
                    value={form.songwriters}
                    onChange={e => set('songwriters', e.target.value)}
                    style={{ width: 340 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Link size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <input placeholder="Living Word Media URL" value={form.lwm_url} onChange={e => set('lwm_url', e.target.value)} style={{ width: 340 }} />
                </div>
              </div>
            ) : (
              <>
                {song.youtube_url && (
                  <a href={song.youtube_url} target="_blank" rel="noopener noreferrer" className="link-btn link-btn-yt">
                    <Youtube size={13} /> YouTube
                  </a>
                )}
                {song.lwm_url && (
                  <a href={song.lwm_url} target="_blank" rel="noopener noreferrer" className="link-btn link-btn-lwm">
                    <Link size={13} /> Living Word Media
                  </a>
                )}
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {editing ? (
            <>
              <button className="btn btn-secondary" onClick={handleCancel}><X size={14} /> Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={14} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setProjectionMode(true)}>
                Projection mode
              </button>
              <button className="btn btn-secondary" onClick={() => setEditing(true)}>
                <Pencil size={14} /> Edit
              </button>
            </>
          )}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-light)', marginBottom: 10 }}>
          Lyrics
        </div>

        {editing ? (
          <LyricsEditor value={form.lyrics} onChange={v => set('lyrics', v)} />
        ) : song.lyrics ? (
          <div className="lyrics-view" dangerouslySetInnerHTML={{ __html: song.lyrics }} />
        ) : (
          <div className="lyrics-view">
            <span className="lyrics-empty">No lyrics yet — click Edit to add them.</span>
          </div>
        )}
      </div>

      {projectionMode && (
        <div className="projection-overlay" onClick={() => setProjectionMode(false)}>
          <button
            type="button"
            className="projection-exit-btn"
            onClick={(event) => {
              event.stopPropagation()
              setProjectionMode(false)
            }}
          >
            Exit
          </button>
          <div className="projection-content" onClick={(event) => event.stopPropagation()}>
            {song.lyrics ? (
              <div className="projection-lyrics" dangerouslySetInnerHTML={{ __html: song.lyrics }} />
            ) : (
              <p className="projection-empty">No lyrics available for projection.</p>
            )}
          </div>
          <div className="projection-hint">Press `Esc` or `P` to exit</div>
        </div>
      )}
    </div>
  )
}
