# The Now Ghost Client Portal

This repo now supports:

- local file-backed development via `server.js`
- Vercel deployment via static root files + `api/*.mjs`
- free Supabase Postgres persistence

## Local run

```powershell
cd "C:\Users\DannyGleason\Documents\New project\the-now-ghost-client-portal"
node server.js
```

Open `http://localhost:3030`

## Free Supabase + Vercel setup

1. Create a free Supabase project.
2. Open the SQL Editor in Supabase.
3. Run [`supabase-schema.sql`](./supabase-schema.sql).
4. In Supabase project settings, copy:
   - `Project URL`
   - `service_role` key
5. In Vercel project settings, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET`
6. Redeploy Vercel.

## Demo accounts

- Admin: `admin@thenowghost.com` / `ghostadmin`
- Client: `david@bettera.com` / `ghostclient`
- Client: `founder@ventureco.com` / `ghostclient`

## Notes

- The deployed app uses Supabase for persistence.
- The local app still uses [`data/store.json`](./data/store.json) so you can test quickly without external setup.
