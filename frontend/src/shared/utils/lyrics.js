export function htmlToPlainLyrics(html = '') {
  return decodeHtmlEntities(String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h2|h3|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim())
}

export function hasUsableLyrics(lyrics = '') {
  const plain = htmlToPlainLyrics(String(lyrics)).toLowerCase().replace(/\s+/g, ' ').trim()

  if (!plain) return false
  if (plain.includes('no lyrics for this yet')) return false
  if (plain.includes('no lyrics yet')) return false

  return true
}

export function lyricsSnippet(html = '', length = 140) {
  const text = htmlToPlainLyrics(html).replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (text.length <= length) return text
  return `${text.slice(0, length).trim()}...`
}

export function decodeHtmlEntities(value = '') {
  const text = String(value)

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = text
    return textarea.value
  }

  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

export function searchTerms(query = '') {
  const normalized = decodeHtmlEntities(query).toLowerCase().match(/[a-z0-9']+/gi) || []
  return [...new Set(normalized.filter((term) => term.length > 1))]
}

export function highlightText(value = '', query = '') {
  const text = decodeHtmlEntities(value)
  const terms = searchTerms(query)

  if (!text || terms.length === 0) return [{ text, match: false }]

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi')
  return text.split(pattern).filter(Boolean).map((part) => ({
    text: part,
    match: terms.includes(part.toLowerCase()),
  }))
}

export function searchMatchSnippet(html = '', query = '', length = 180) {
  const text = htmlToPlainLyrics(html).replace(/\s+/g, ' ').trim()
  const terms = searchTerms(query)

  if (!text) return { segments: [], prefix: '', suffix: '' }

  const lower = text.toLowerCase()
  const firstMatch = terms.reduce((best, term) => {
    const index = lower.indexOf(term)
    if (index === -1) return best
    return best === -1 ? index : Math.min(best, index)
  }, -1)

  const start = firstMatch === -1 ? 0 : Math.max(0, firstMatch - Math.floor(length / 3))
  const end = Math.min(text.length, start + length)
  const snippet = text.slice(start, end).trim()

  return {
    segments: highlightText(snippet, query),
    prefix: start > 0 ? '...' : '',
    suffix: end < text.length ? '...' : '',
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
