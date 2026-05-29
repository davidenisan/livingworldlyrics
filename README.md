# Living Word Lyrics App

A lyrics library and projection tool for fast song retrieval during live worship sessions.

## Stack
- Backend: Node.js, Express, SQLite
- Frontend: React (Vite), React Router v6, TipTap

## Project Structure

```text
lyrics-app/
├── backend/
│   ├── migrations/
│   │   └── 001_add_songwriters_to_songs.sql
│   ├── scripts/
│   │   └── generate-admin-hash.js
│   └── src/
│       ├── db.js
│       ├── index.js
│       ├── middleware/
│       │   └── auth.js
│       └── routes/
│           ├── albums.js
│           ├── auth.js
│           └── songs.js
└── frontend/src/
    ├── admin/
    ├── public/
    └── shared/
```

## Features
- Songwriter credits (`songwriters`) on songs
- Rich TipTap lyrics editor (HTML storage preserved)
- Search across title, lyrics, and songwriters
- Read-only lyric view tuned for projection readability
- Projection mode (fullscreen-style overlay)
- Bulk DOCX song import into an album (heading-based parser)
- Public lyrics interface (`/`) and protected admin interface (`/admin/*`)
- JWT auth for admin mutations (7-day expiry)

## Environment Setup

1. Copy env template:

```bash
cp .env.example .env
```

2. Generate a bcrypt hash for your admin password:

```bash
cd backend
npm run hash-admin-password -- "your_admin_password"
```

3. Put the generated hash into `.env` as `ADMIN_PASSWORD_HASH`.

Required env vars:
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `JWT_SECRET`
- `DB_PATH` (recommended in production, points SQLite at persistent storage)
- `PORT` (optional, default `3001`)

## Install and Run

Install all dependencies:

```bash
npm run install:all
```

Run backend:

```bash
npm run dev:backend
```

Run frontend:

```bash
npm run dev:frontend
```

Frontend runs on Vite default port (`5173`) and proxies `/api` to backend `3001`.

## Render Deploy

Use the root project as one Node web service. The backend serves the built frontend from `frontend/dist`.

Recommended settings:

```text
Build Command: npm run render-build
Start Command: npm start
```

Do not remove `package-lock.json` during the build. The build script installs backend dependencies and installs frontend dependencies with dev tools included so Vite is available.

Set these Render environment variables:

```text
NODE_ENV=production
ADMIN_USERNAME=your_admin_name
ADMIN_PASSWORD_HASH=your_generated_bcrypt_hash
JWT_SECRET=a_long_random_secret
DB_PATH=/opt/render/project/src/storage/lyrics.db
```

Add a Render persistent disk mounted at:

```text
/opt/render/project/src/storage
```

SQLite must live on persistent storage in production, otherwise redeploys can lose the library database.

## Database Migration

Migration file:
- `backend/migrations/001_add_songwriters_to_songs.sql`

Apply it with sqlite3 CLI (from `backend` directory):

```bash
sqlite3 lyrics.db < migrations/001_add_songwriters_to_songs.sql
```

Note: runtime initialization also checks for and adds the `songwriters` column if missing.

## Routes

### Public
- `GET /` home (search-first)
- `GET /songs/:id` read-only song view
- `GET /albums` browse albums
- `GET /albums/:id` album songs

### Admin
- `GET /admin/login`
- `GET /admin`
- `GET /admin/albums/:id`
- `GET /admin/albums/:id/songs/:songId`
- Album page includes `Import DOCX` bulk uploader

### Auth API
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Data API
- Public `GET` routes for albums/songs/search
- Protected `POST`, `PUT`, `DELETE` routes for albums/songs
- Protected bulk import: `POST /api/albums/:albumId/import-docx`

## Bulk DOCX Import Format

Use one `.docx` with repeated song blocks:
- `Heading 1` or `Heading 2`: song title
- `Heading 3`: songwriter(s)
- Optional `URL:` paragraph or plain paragraph containing a YouTube link
- Following paragraphs: lyrics body

Notes:
- Numbered titles like `02. Holy Ground` auto-fill `track_number` and clean the title.
- Unnumbered imported songs are assigned track numbers automatically, continuing after the album's highest existing track number.
- YouTube links are imported into `youtube_url`; `URL:` metadata lines are not included in lyrics.
- Section lines such as `Verse 1:` and `Chorus:` are promoted to section headings in lyrics HTML.

## Notes
- Lyrics remain stored as TipTap HTML in SQLite.
- Cascading delete integrity is enforced by `PRAGMA foreign_keys = ON`.
