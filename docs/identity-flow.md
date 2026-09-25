# Festival demo — identity flow

The demo is an Astro + Cloudflare Worker Site that embeds `@engine9/core`
and `@engine9/id`. Protocol: [`id/docs/protocol.md`](../../id/docs/protocol.md).

## Roles (example)

**Segment roles** (hard gates) are defined in `src/lib/roles.ts` /
`src/lib/engine9.ts`. Same `requiredAuth` shape as **declared roles** in
[`@engine9/id`](../../id/docs/declared-roles.md) / [`demo-id`](../../demo-id)
— those are soft UI only until you map them to `person_segment`.

- **VIP** — segment `5f2ab45c-0a39-4939-a2af-c1fcc58f37ff`, scopes
  `data:read`, `requiredAuth.minLevel = 1` (self-asserted profile enough
  for lounge personalization).
- **Admin** — segment `4f4ac886-f53d-48e1-b4bd-5a98eb48cc6f`, scopes
  `admin`, `requiredAuth.minLevel = 3` (trusted provider).

`loadRolesOnLogin: false` so every login hits `/choose-role`.

## People fields

Register and people APIs use `@engine9/interfaces` names:
`given_name`, `family_name`, `email`, `email_type` (`Personal` | `Work` |
`Other`). See [`id/docs/forms.md`](../../id/docs/forms.md).

## Sequence (Identity Token)

```mermaid
sequenceDiagram
  participant B as Browser
  participant D as delegate
  participant S as Demo Worker
  B->>D: GET /identity/authorize?site&min_level=1
  D-->>B: chooser or silent
  D-->>B: 302 return_to?delegate_token=JWT
  B->>S: GET /auth/delegate?delegate_token
  S->>D: GET /.well-known/jwks.json
  S->>S: verify JWT, unid to person_id, mint Core Session
  S-->>B: Set-Cookie session
  B->>S: GET /api/auth/me
  S-->>B: personId, roles, level
```

## Client vs server

- `@engine9/id` on `/login`: Identity Token popup (`requestIdentity`),
  Level 0 probe, then `GET /auth/delegate?delegate_token=`.
- Server: JWT verify, person pipeline, HttpOnly `session` cookie,
  middleware for `/vip` and `/admin` (also checks `requiredAuth.minLevel`).
- Level 1 register: `/auth/register` → `POST /api/people` with
  `{ given_name, family_name, email, email_type }` and the seeded
  `e9publickey_` (scope `public` only). The private `e9key_` stays
  server-only for admin-style API calls.

Browser-only on-ramp (no core): [`demo-id`](../../demo-id).
