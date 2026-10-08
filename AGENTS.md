See [CLAUDE.md](CLAUDE.md) for project overview and commands.

## Cursor Cloud specific instructions

- Dependencies are installed by `.cursor/environment.json` (root and `server/`).
- The backend reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`) from environment variables; these come from Cursor Cloud secrets, not a committed `.env`.
- Run `npm start` to launch the API on :3001 and the Vite dev server on :5173.
- There is no test suite; verify changes with `npm run build` and by exercising the UI.
