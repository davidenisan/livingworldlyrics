export function getYouTubeEmbedUrl(url = '') {
  if (!url) return null

  try {
    const normalized = String(url).trim()
    const withProtocol = /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`
    const parsed = new URL(withProtocol)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        const id = parsed.searchParams.get('v')
        return id ? `https://www.youtube.com/embed/${id}` : null
      }

      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/').filter(Boolean)[1]
        return id ? `https://www.youtube.com/embed/${id}` : null
      }

      if (parsed.pathname.startsWith('/embed/')) {
        const id = parsed.pathname.split('/').filter(Boolean)[1]
        return id ? `https://www.youtube.com/embed/${id}` : null
      }
    }

    return null
  } catch {
    return null
  }
}
