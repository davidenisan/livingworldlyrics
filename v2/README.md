# Living Word Lyrics v2

This is an isolated, deployable v2 application. Nothing here modifies or depends on the v1 runtime, so the current Render-compatible application remains available while v2 is built.

## Why this architecture

- **Vercel or Netlify:** host the Vite frontend as static files.
- **Supabase Postgres:** replaces the non-persistent SQLite database.
- **Supabase Auth:** replaces the environment-variable admin account and JWT cookie.
- **Supabase Row Level Security:** makes albums and songs public to read, but editable only by users in `admin_users`.

The browser must use only the publishable key. The service-role key is for the one-time import script and must never be exposed in frontend code or a Vercel/Netlify public environment variable.

## Initial setup

1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql` in its SQL Editor.
3. In Supabase Auth, create the first admin user (email/password is sufficient).
4. Add that user to the admin allow-list in the SQL Editor:

   ```sql
   insert into public.admin_users (user_id)
   values ('the-auth-user-uuid');
   ```

5. Copy `.env.example` to `.env` and add the project URL plus service-role key.
6. From this directory, run `npm install`, then `npm run migrate:data`.

The importer upserts IDs from `../backend/lyrics.db`; it can be safely re-run before go-live.

## Run locally

```bash
npm run dev
```

The app reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env`. It uses Supabase Auth for the admin login, Row Level Security for database writes, and a browser-based DOCX parser—no Express server, SQLite file, or Python runtime is required.

## Deploy

Deploy the `v2` directory as the project root on either platform:

- **Vercel:** build command `npm run build`, output directory `dist`. `vercel.json` provides the required SPA rewrite.
- **Netlify:** `netlify.toml` already provides the build, publish, and SPA rewrite configuration.

Add these environment variables in the host's build environment:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Do not add `SUPABASE_SERVICE_ROLE_KEY` to Vercel or Netlify. It was only used locally by the one-time importer and normalizer.

## Deferred server-only feature

Google Analytics reporting is intentionally not included in the static v2 build: its service-account key must stay server-side. Add it later through a protected Vercel or Netlify function if the dashboard analytics panel is still needed.
