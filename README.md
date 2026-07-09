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

Open http://localhost:4321. The dev script first applies the SQL migrations
in `migrations/` to a local SQLite database (stored under `.wrangler/state/`),
seeding the five acts, the schedule, ticket types, and two demo people.
`npm run db:reset` wipes it back to the seed state.

## The demo

- **Public**: home, `/lineup`, `/schedule`, `/tickets`. The schedule query
  excludes VIP-only sets, so gated data never reaches logged-out visitors.
- **`/vip`**: VIP Lounge — the visitor's name, address, and ticket (all
  per-person data keyed by integer `person_id`), plus VIP-only sessions.
- **`/admin`**: add/remove artists, edit the schedule (including flagging
  sets VIP-only), and set ticket prices. Changes appear on the public site
  immediately.

### Pretend login

Real authentication belongs to the shared **delegate** service (a sibling
deployment); this demo deliberately does not implement it. `/login` instead
offers two buttons:

| Button | Identity | person_id | Can see |
| --- | --- | --- | --- |
| Login as VIP | Vera Vipperman | 101 | `/vip` |
| Login as Admin | Ada Adminson | 900 | `/vip` and `/admin` |

Clicking one sets a session cookie; `src/middleware.ts` reads it on every
request and redirects to `/login` before any gated page renders. Swapping the
pretend login for delegate would only replace `src/lib/session.ts` and
`src/pages/auth/login.ts` — the gating and data model stay the same.

## How it's put together

```
migrations/            SQL schema + seed (person, ticket, ticket_type, artist, performance)
src/middleware.ts      Server-side gate for /vip/* and /admin/*
src/lib/session.ts     Cookie session: { personId, role } and role checks
src/lib/db.ts          D1/SQLite access + row types
src/pages/             Public pages, /login, /vip, /admin, auth endpoints
src/layouts/           Shared layout, nav that reflects login state, festival styling
```

Every page is server-rendered (`output: "server"`); there is no client-side
gating anywhere. All per-person rows (`person`, `ticket`) are keyed by an
integer `person_id`, matching how delegate identifies people.

## Engine9 client

The D1 database is also an **engine9 database**: migration
`0003_engine9.sql` installs the standard Engine9 interface tables (`person`,
`person_email`, `person_segment`, ...) and the site serves the
`@engine9/client` API under `/api` — API-key-authenticated people creation,
person-related upserts, and segment-gated content reads. See
[ENGINE9.md](./ENGINE9.md) for the deployment stages.

## Deploying

See [Cloudflare.md](./Cloudflare.md) for deploying to Cloudflare Workers with
a D1 database.
