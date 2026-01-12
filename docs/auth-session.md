# Firebase auth session (server) — setup & quick tests

This project uses Firebase Authentication for client sign-in and a server-side session cookie
so server middleware and server-side role checks can verify a user without requiring the
client to send the idToken on every request.

Files added
- `src/app/api/auth/session/route.ts` — POST { idToken } -> exchanges idToken for a Firebase session cookie and sets an HttpOnly cookie named `session`.
- `src/app/api/auth/logout/route.ts` — POST -> clears the `session` cookie and attempts to revoke refresh tokens.

Required environment / configuration

You must provide Firebase Admin credentials on the server. Two supported options:

1) FIREBASE_ADMIN_SVC_PATH (recommended for local dev)
   - Point this to a JSON service account file (example: `./serviceAccountKey.json`).
   - This is the easiest local setup. Add this to your `.env.local`:

     FIREBASE_ADMIN_SVC_PATH=./serviceAccountKey.json

2) FIREBASE_ADMIN_SVC (single env var)
   - Paste the full service account JSON (or base64-encoded JSON) into the env var.
   - The server routes will attempt to parse raw JSON, trimmed/quoted, a `\\n`-escaped string,
     and a base64-encoded JSON string.
   - Treat this as a secret. Example (base64 placeholder):

     FIREBASE_ADMIN_SVC=ewoicHJvamVjdF9pZCI6ICJ..."

Notes on security
- Keep service account credentials out of public repos.
- Prefer `FIREBASE_ADMIN_SVC_PATH` when developing locally and use deployment secrets (not repo files) for production.

Cookie behavior
- Cookie name: `session`
- HttpOnly
- SameSite=Strict (change to `Lax` if you need cross-site POST flows)
- Secure is set only when `NODE_ENV === 'production'` (so local dev over http works)
- Default expiration: 5 days (adjust in `src/app/api/auth/session/route.ts` if desired)

Quick manual tests (PowerShell / curl)

1) Start the dev server as you normally do (e.g., `pnpm dev` / `npm run dev`).

2) Obtain an `idToken` from the client SDK (e.g., in a browser console after sign-in or via your app login flow).

3) Create a session cookie (server will set `session` cookie):

```powershell
curl -i -X POST http://localhost:3000/api/auth/session -H "Content-Type: application/json" -d '{"idToken":"<ID_TOKEN>"}'
```

- Response should include `Set-Cookie: session=...` and body `{ "ok": true }` on success.

4) Verify server-side role endpoint (example):

```powershell
curl -i -X GET http://localhost:3000/api/_auth/verify-role --cookie "session=<cookie value>"
```

- If the `session` cookie is present and valid the endpoint returns `{ ok: true, uid, role, user }`.

5) Logout / clear session cookie:

```powershell
curl -i -X POST http://localhost:3000/api/auth/logout -c cookies.txt
```

- Response will set `session=` cookie with `Max-Age=0`.

Troubleshooting & tips
- If you get `Admin SDK not initialized` from server routes, ensure `FIREBASE_ADMIN_SVC` or `FIREBASE_ADMIN_SVC_PATH` is set and readable by the server process.
- For production deployments (Vercel, Netlify, GCP), set the Admin service account as a secret environment variable rather than committing JSON.
- If you need a `SameSite` or `Secure` policy change for your hosting environment, update the cookie options in `src/app/api/auth/session/route.ts` and `logout/route.ts`.

Next steps you might want me to do
- Wire `FIREBASE_ADMIN_SVC_PATH` in `.env.local` automatically (done) or point to an absolute path.
- Add a `GET /api/auth/session` route to introspect session (non-sensitive info only).
- Add tests that run a small integration flow (requires service account and local server to be running).

If you'd like any of those, tell me which and I'll implement it.
