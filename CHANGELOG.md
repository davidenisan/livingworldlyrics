# Changelog

## 2026-05-24
- Added bulk DOCX import in admin album page (`Import DOCX`) to auto-create songs from heading-based documents.
- Added backend import API `POST /api/albums/:albumId/import-docx` with auth protection.
- Added zero-dependency DOCX parser script `backend/scripts/parse_docx_songs.py` and Node service bridge `backend/src/services/docxImport.js`.
- Parser supports `Heading 1`/`Heading 2` for song titles, `Heading 3` for songwriters, and extracts numbered track prefixes.
- Added songwriter support end-to-end: DB column, API create/update/get/search, admin forms, and read-only display.
- Improved lyric readability for projection: larger typography, stronger section separation, and enhanced blockquote treatment.
- Added projection mode overlays with keyboard (`Esc` or `P`) and click exit behavior.
- Split frontend into protected admin routes (`/admin/*`) and open public routes (`/`, `/songs/:id`, `/albums`, `/albums/:id`).
- Added admin authentication flow with login/logout/session check.
- Refactored backend into modular structure:
  - `backend/src/index.js`
  - `backend/src/db.js`
  - `backend/src/middleware/auth.js`
  - `backend/src/routes/auth.js`
  - `backend/src/routes/albums.js`
  - `backend/src/routes/songs.js`
- Enforced SQLite foreign keys with `PRAGMA foreign_keys = ON`.
- Added migration file `backend/migrations/001_add_songwriters_to_songs.sql`.
- Added admin password hash helper script: `backend/scripts/generate-admin-hash.js`.
- Added `.env.example` and updated README setup guidance.
