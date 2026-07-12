# Solstice Wave Festival — permission-levels demo

A small festival website demonstrating **server-side permission gating** on a
public site: anonymous visitors see the lineup, schedule, and ticket prices;
VIPs get a members-only lounge page; admins get a management interface. Built
with Astro, backed by SQLite, deployable to Cloudflare Workers + D1.

## Run it locally

Requires Node.js 22+.

```bash
npm install
npm run dev
```

### Developing against a local `@engine9/core` checkout

`package.json` depends on `@engine9/core` from GitHub (`github:engine9-ai/core`)
until the package is published to npm; then switch the dependency to
`"^0.1.0"`. To iterate on a sibling `core` repo instead:

```bash
cd ../core && npm link
cd ../demo && npm link @engine9/core
```

Re-run `npm link @engine9/core` after `npm install` or `npm ci` in this repo,
since a fresh install restores the registry copy.

Open **http://localhost:5000** (or **http://localhost:5001**). Ports 5000 and
5001 are required for Delegate auth — they are the allowed `return_to` origins
for local development (see `ALLOWED_RETURN_ORIGINS` on the delegate Worker).
The dev script first applies the SQL migrations in `migrations/` to a local
SQLite database (stored under `.wrangler/state/`), seeding the five acts, the
schedule, ticket types, and two demo people. `npm run db:reset` wipes it back
to the seed state.

## The demo

- **Public**: home, `/lineup`, `/schedule`, `/tickets`. The schedule query
  excludes VIP-only sets, so gated data never reaches logged-out visitors.
- **`/vip`**: VIP Lounge — the visitor's name, address, and ticket (all
  per-person data keyed by integer `person_id`), plus VIP-only sessions.
- **`/admin`**: add/remove artists, edit the schedule (including flagging
  sets VIP-only), and set ticket prices. Changes appear on the public site
  immediately.

### Auth endpoints

Login is provided by the shared **delegate** service via `@engine9/core`.
This site only wires config and HTTP endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /login` | Starts delegate login (`return_to` → `/auth/delegate`) |
| `GET /auth/delegate` | Callback: exchanges `?delegate_code=` and sets the session cookie |
| `GET /auth/role` | Demo-only: grants VIP or Admin after first login |
| `GET /choose-role` | First-time users pick VIP or Admin |
| `POST /auth/logout` (or site logout) | Clears the local session cookie |

`src/middleware.ts` reads the session on every request and redirects to
`/login` (or `/choose-role`) before any gated page renders.

For how delegate handoff, person resolution, roles-as-segments, and signed
sessions work, see [`@engine9/core` README — Delegate
authentication](../core/README.md#delegate-authentication).

Local development: copy `.env.example` to `.env` and set `DELEGATE_SHARED_SECRET`
to a value accepted by production Delegate (comma-separated secrets support a
dev entry). Point `DELEGATE_URL` at `https://delegate.engine9.ai` — you do
**not** need a local Delegate process.

For `localhost` / `127.0.0.1` callbacks, Delegate returns a signed
`?delegate_bridge=` token in the browser (Bot Fight cannot challenge that
path). If an older `?delegate_code=` still lands here and server exchange is
blocked, `/login` shows a **Continue sign-in on Delegate** link through
`/handoff/browser-exchange`.

## How it's put together

```
migrations/            SQL schema + seed (person, ticket, artist, Engine9 tables, segments)
src/middleware.ts      Server-side gate for /vip/* and /admin/*
src/lib/engine9.ts     All Engine9 wiring: plugin/segment ids, delegateAuth() config
src/lib/session.ts     Cookie glue around core's signed delegate session
src/lib/db.ts          D1/SQLite access + row types
src/pages/             Public pages, /login, /choose-role, /vip, /admin, auth endpoints
src/layouts/           Shared layout, nav that reflects login state, festival styling
```

Every page is server-rendered (`output: "server"`); there is no client-side
gating anywhere. All per-person rows (`person`, `ticket`) are keyed by an
integer `person_id`.

## Engine9 client

The D1 database is also an **engine9 database**: migration
`0003_engine9.sql` installs the standard Engine9 interface tables (`person`,
`person_email`, `person_segment`, ...) and the site serves the
`@engine9/core` API under `/api` — API-key-authenticated people creation,
person-related upserts, and segment-gated content reads. See
[ENGINE9.md](./ENGINE9.md) for the deployment stages.

## Deploying

See [Cloudflare.md](./Cloudflare.md) for deploying to Cloudflare Workers with
a D1 database.
