# Deploying @engine9/core on this site

This demo doubles as the reference installation of the Engine9 client on a
"real" website. The D1 database (`festival-db`) **is** the engine9 database:
migration `0003_engine9.sql` installed the standard Engine9 interface tables
alongside the site's own content tables, and the site now serves the Engine9
client API under `/api` from the same Worker.

What the client provides here:

| Endpoint | What it does |
| --- | --- |
| `GET /api/ok` | Health check (no auth) |
| `POST /api/people` | Runs posted people through the standard inbound transform pipeline (identifier extraction, person id assignment) and upserts `person` / `person_email` / `person_phone` / `person_address` |
| `POST /api/upsert/:table` | Direct upserts to allow-listed person-related tables (e.g. `person_segment` for event attendance / entitlements) |
| `GET /api/read/:name` | Named reads of site content, optionally gated by `person_segment` membership. The `person_id` comes from the caller (the delegate-style session) — the client never looks it up |

All writes require an API key (`Authorization: Bearer e9k_...`); every
modification is written to the database and then logged through the client's
batch logger (here: the Worker log stream; with an R2 bucket, batches would be
written to R2).

## The stages

These are the stages that were applied to this repository, in order. Follow
the same sequence to install the client on any existing site.

### Stage 1 — Add the client library

```bash
npm install @engine9/core
```

`package.json` currently uses `"@engine9/core": "github:engine9-ai/core"` so
installs work before the package is on npm; switch to `"^0.1.0"` once it is
published. `overrides` pin transitive `@engine9/input-tools` and
`@engine9/interfaces` until those packages are published with registry deps
(push the updated `core` and `interfaces` repos first). To develop against a
local `core` checkout, run `npm link @engine9/core` after linking from
`../core` — see the README.

Bundler wiring for Cloudflare lives in `astro.config.mjs`:

- alias `@engine9/input-tools` (exact match) to
  `@engine9/core/cloudflare/input-tools-shim` so the interface transforms
  don't drag in server-only dependencies;
- alias `knex`, `mysql2/promise`, and `better-sqlite3` to
  `@engine9/core/cloudflare/unavailable-module` — they back SQLWorker's
  non-D1 connection modes and are never loaded on Workers.

`wrangler.jsonc` already had `nodejs_compat` and the `DB` D1 binding; nothing
else was needed.

### Stage 2 — Install the engine9 schema into the existing database

Generate the DDL with the client (no server required):

```bash
npx e9core sqlite-ddl > engine9-ddl.sql
```

That DDL (idempotent `create table if not exists`) is the middle section of
`migrations/0003_engine9.sql`, plus the `api_key` table. On a fresh site with
no data to migrate, this stage is just "put the generated DDL in a migration".

### Stage 3 — Migrate existing data into the engine9 tables

This site already had its own `person` table (`person_id`, `name`, `email`,
`address`). `0003_engine9.sql`:

1. renames it out of the way,
2. copies rows into engine9's `person` (ids preserved, so session
   `person_id`s and `ticket` foreign keys keep working), `person_email`, and
   `person_address`,
3. rebuilds `ticket` so its foreign key points at `person(id)`,
4. drops the old table.

Site queries that read the old shape were updated (`/vip` now joins
`person` + `person_email` + `person_address`). Identifier hashes
(`person_identifier`) are not backfilled by SQL; they are computed by the
transform pipeline the next time a person flows through `POST /api/people`.

### Stage 4 — Seed the plugin, API key, and segments

Also in `0003_engine9.sql`:

- a `plugin` row for this website (`86dfc4a8-318b-51e6-9f25-d9648f963609`,
  from `getPluginUUID('engine9.demo', 'festival-website')`) — everything
  written through the API is attributed to it;
- an `api_key` row. The demo key is
  `e9k_0ca7302713d70f5d130cf52cbf9167f0ea1a45ef` (only its SHA-256 is
  stored). **Rotate this for any non-demo deployment**:

  ```bash
  # prints the key once (stderr) and the INSERT statement (stdout)
  npx e9core create-api-key --print-sql --name my-website \
    --scopes people:write,tables:write,data:read > new-key.sql
  npx wrangler d1 execute festival-db --remote --file new-key.sql
  # deactivate the demo key
  npx wrangler d1 execute festival-db --remote \
    --command "UPDATE api_key SET active = 0 WHERE name = 'festival-demo-website'"
  ```

- a `VIP` segment (`5f2ab45c-0a39-4939-a2af-c1fcc58f37ff`) plus
  `person_segment` rows for the existing VIP ticket holders;
- an `Admin` segment (`4f4ac886-f53d-48e1-b4bd-5a98eb48cc6f`, in
  `0004_admin_segment.sql`) with the seeded demo admin. Segments double as
  the site's **roles** for delegate logins (see Stage 8).

### Stage 5 — Wire the API into the site

Two small files:

- `src/lib/engine9.ts` — builds the client: `PersonWorker` on the `DB` D1
  binding, `SqlApiKeyStore` (swap for `KVApiKeyStore` + a KV namespace without
  touching endpoints), `BatchLogger`, and `createApi` with this site's plugin
  id, upsertable tables, and named reads (`vip-performances` gated by the VIP
  segment, `lineup` public).
- `src/pages/api/[...path].ts` — Astro catch-all route that hands the raw
  `Request` to `api.handleFetch`. On a plain Worker (no Astro) you'd call
  `handleFetch` from `fetch()` directly — see
  `@engine9/core/cloudflare/worker.js`.

### Stage 6 — Verify locally

```bash
npm run db:reset            # apply all migrations to local D1
npm run preview             # build + wrangler dev
```

```bash
KEY=e9k_0ca7302713d70f5d130cf52cbf9167f0ea1a45ef
curl localhost:8787/api/ok
# create a person through the transform pipeline
curl -X POST localhost:8787/api/people -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  -d '{"people":[{"email":"new@example.com","given_name":"New","family_name":"Person"}]}'
# gated read: denied until the person joins the segment
curl "localhost:8787/api/read/vip-performances?person_id=901" -H "Authorization: Bearer $KEY"
# grant VIP via a person_segment upsert, then the read succeeds
curl -X POST localhost:8787/api/upsert/person_segment -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  -d '{"rows":[{"person_id":901,"segment_id":"5f2ab45c-0a39-4939-a2af-c1fcc58f37ff"}]}'
curl "localhost:8787/api/read/vip-performances?person_id=901" -H "Authorization: Bearer $KEY"
```

### Stage 7 — Deploy

```bash
npm run db:migrate:remote   # apply migrations to the production D1 database
npm run deploy              # astro build && wrangler deploy
```

For production, also rotate the API key (Stage 4) and, if long-term
modification logs are wanted, add an R2 bucket binding and switch the logger
in `src/lib/engine9.ts` to the R2 sink.

### Stage 8 — Delegate authentication

Login is provided by the shared **delegate** deployment via
`@engine9/core/auth/delegate` (`createDelegateAuth`). This site only wires
config and endpoints:

- `src/lib/engine9.ts` — `delegateAuth()` config (delegate URL, shared secret,
  session secret, plugin id, role→segment map)
- `GET /auth/delegate` — callback that calls `login(code)` and sets the cookie
- `GET /auth/role` + `/choose-role` — demo-only first-login role picker
- `src/middleware.ts` — gates `/vip` and `/admin` from the session

See [`@engine9/core` README — Delegate
authentication](../core/README.md#delegate-authentication) for the handoff
flow, person resolution, and session signing.

Secrets: `DELEGATE_SHARED_SECRET` (must match the delegate deployment) and
`SESSION_SECRET`, set via `.env` locally and `wrangler secret put` in
production. `DELEGATE_URL` is a wrangler var (`https://delegate.engine9.ai`),
overridable in `.env` for a local delegate.

## What stays on the engine9 server

The client is deliberately minimal: schema install, API keys, single-person
creation, person-related upserts, and segment-gated reads. Bulk file
ingestion, person export, FileWorker, scheduled jobs, and every other worker
remain in the engine9 server, which consumes this same client as an npm
library for the shared SQL/schema code.
