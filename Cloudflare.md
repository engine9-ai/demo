# Deploying to Cloudflare Workers + D1

This site is an Astro app served entirely by a single Cloudflare Worker, with
a D1 database (Cloudflare's hosted SQLite) as the primary data store. The
same code and the same SQL run locally and in production — locally the
database is a SQLite file under `.wrangler/state/`, deployed it is D1.

## Prerequisites

- A Cloudflare account with Workers enabled
- Wrangler authenticated: `npx wrangler login`
- Dependencies installed: `npm install`

## 1. Create the D1 database

```bash
npx wrangler d1 create festival-db
```

The command prints a `database_id` (a UUID). Copy it into `wrangler.jsonc`,
replacing the placeholder:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "festival-db",
    "database_id": "REPLACE_WITH_YOUR_D1_DATABASE_ID",  // <-- paste here
    "migrations_dir": "migrations"
  }
]
```

## 2. Apply migrations to the remote database

Migrations live in `migrations/` (`0001_schema.sql` creates the tables,
`0002_seed.sql` inserts the demo lineup, schedule, ticket types, and the two
demo people). Apply them to D1:

```bash
npm run db:migrate:remote
# equivalent to: npx wrangler d1 migrations apply festival-db --remote
```

Wrangler tracks which migrations have run, so this is safe to re-run; only
new migration files are applied. To add data changes later, add a new
numbered file (e.g. `migrations/0003_more_artists.sql`) and re-run.

## 3. Build and deploy

```bash
npm run deploy
# equivalent to: npx astro build && npx wrangler deploy
```

Wrangler uploads the Worker (entry point `@astrojs/cloudflare/entrypoints/server`,
declared in `wrangler.jsonc`) plus the static assets in `dist/`, and binds the
D1 database as `env.DB`. The command prints your `*.workers.dev` URL — the
site is live there immediately.

## 4. (Optional) Custom domain

Add a route to `wrangler.jsonc` (the zone must be in your Cloudflare
account), then redeploy:

```jsonc
"routes": [
  { "pattern": "festival.example.com", "custom_domain": true }
]
```

The sibling `delegate` service uses this exact pattern for
`delegate.engine9.ai`.

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server (applies local migrations first) |
| `npm run preview` | Build, then serve the production Worker locally via `wrangler dev` |
| `npm run deploy` | Build and deploy to Cloudflare |
| `npm run db:migrate` | Apply migrations to the **local** SQLite file |
| `npm run db:migrate:remote` | Apply migrations to **remote** D1 |
| `npm run db:reset` | Wipe local state and re-migrate/re-seed |
| `npx wrangler d1 execute festival-db --remote --command "SELECT * FROM artist"` | Ad-hoc SQL against production D1 |
| `npx wrangler tail` | Stream production Worker logs |

## Production auth note

The "Login as VIP" / "Login as Admin" buttons are a demo stand-in. In a real
deployment, authentication is delegated to the shared **delegate** service
(the sibling Worker at `delegate.engine9.ai`): the user authenticates there,
and this site receives a verified `person_id` and entitlement level instead
of letting the visitor pick a role. The gating middleware
(`src/middleware.ts`) and the person_id-keyed queries would not change —
only the code that establishes the session (`src/pages/auth/login.ts` and
`src/lib/session.ts`) would be replaced with delegate's session verification.
If you wire that up, sessions should also be signed or stored server-side
(e.g. in KV, as delegate does) rather than trusted from a plain cookie.
