export const ALBUM_SORT_OPTIONS = [
  { value: 'smart_desc', label: 'Newest volumes first' },
  { value: 'smart_asc', label: 'Oldest volumes first' },
  { value: 'title_asc', label: 'Name A-Z' },
  { value: 'title_desc', label: 'Name Z-A' },
]

export function sortAlbums(albums = [], sort = 'smart_desc') {
  const normalizedSort = ALBUM_SORT_OPTIONS.some((option) => option.value === sort) ? sort : 'smart_desc'

  return [...albums].sort((a, b) => compareAlbums(a, b, normalizedSort))
}

function compareAlbums(a, b, sort) {
  const direction = sort.endsWith('_desc') ? -1 : 1

  if (sort.startsWith('title')) {
    return compareText(a.title, b.title) * direction
  }

  const yearComparison = compareNullableNumber(nullableNumber(a.year), nullableNumber(b.year), direction)
  if (yearComparison !== 0) return yearComparison

  const numberComparison = compareNullableNumber(albumNumber(a.title), albumNumber(b.title), direction)
  if (numberComparison !== 0) return numberComparison

  return compareText(a.title, b.title) * direction
}

function albumNumber(title = '') {
  const matches = String(title).match(/\d+/g)
  if (!matches) return null

  return Number(matches[matches.length - 1])
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function compareNullableNumber(a, b, direction) {
  const aIsNumber = Number.isFinite(a)
  const bIsNumber = Number.isFinite(b)

  if (aIsNumber && bIsNumber && a !== b) return (a - b) * direction
  if (aIsNumber && !bIsNumber) return -1
  if (!aIsNumber && bIsNumber) return 1
  return 0
}

function compareText(a = '', b = '') {
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}
