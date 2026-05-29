const BASE = '/api';

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || 'Request failed');
  return payload;
}

export const api = {
  auth: {
    login: (data) => req('/auth/login', { method: 'POST', body: data }),
    logout: () => req('/auth/logout', { method: 'POST' }),
    me: () => req('/auth/me'),
  },
  albums: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return req(`/albums${query ? `?${query}` : ''}`);
    },
    get: (id) => req(`/albums/${id}`),
    create: (data) => req('/albums', { method: 'POST', body: data }),
    update: (id, data) => req(`/albums/${id}`, { method: 'PUT', body: data }),
    delete: (id) => req(`/albums/${id}`, { method: 'DELETE' }),
    importDocx: (albumId, data) => req(`/albums/${albumId}/import-docx`, { method: 'POST', body: data }),
    applyLwmUrl: (albumId, data) => req(`/albums/${albumId}/lwm-url`, { method: 'POST', body: data }),
  },
  songs: {
    search: (q) => req(`/songs?q=${encodeURIComponent(q)}`),
    get: (id) => req(`/songs/${id}`),
    create: (albumId, data) => req(`/albums/${albumId}/songs`, { method: 'POST', body: data }),
    update: (id, data) => req(`/songs/${id}`, { method: 'PUT', body: data }),
    delete: (id) => req(`/songs/${id}`, { method: 'DELETE' }),
  },
  stats: {
    summary: () => req('/stats/summary'),
  },
};
