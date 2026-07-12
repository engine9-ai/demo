import { env } from "cloudflare:workers";

/**
 * The D1 binding is the primary data store. Locally (astro dev / wrangler
 * dev) it is a plain SQLite file under .wrangler/state; deployed it is a
 * Cloudflare D1 database. Same query API either way.
 */
/** D1 binding metadata (matches wrangler.jsonc). */
export const DB_BINDING = {
  binding: "DB",
  database_name: "festival-db",
  database_id: "c7c28218-d45f-4abf-a844-be05070a9f07",
} as const;

export function getDB(): D1Database {
  return env.DB;
}

/**
 * Log database location for debugging. D1 blocks PRAGMA database_list inside
 * Workers, so we always log the binding metadata and the usual local path.
 */
export async function logDbPath(db: D1Database = getDB()): Promise<void> {
  console.log(
    `engine9-db: binding=${DB_BINDING.binding} database=${DB_BINDING.database_name} id=${DB_BINDING.database_id}`
  );
  console.log(
    "engine9-db: local SQLite path (wrangler dev): .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite"
  );
  try {
    const { results } = await db
      .prepare("PRAGMA database_list")
      .all<{ seq: number; name: string; file: string }>();
    for (const row of results) {
      if (row.file) console.log(`engine9-db: pragma path=${row.file}`);
    }
  } catch {
    // D1/miniflare does not authorize PRAGMA database_list in the Worker sandbox.
  }
}

export interface Artist {
  id: number;
  name: string;
  genre: string;
  blurb: string;
  emoji: string;
  color: string;
}

export interface Performance {
  id: number;
  artist_id: number;
  day: string;
  stage: string;
  start_time: string;
  end_time: string;
  vip_only: number;
  artist_name?: string;
  emoji?: string;
  color?: string;
}

export interface TicketType {
  id: number;
  code: string;
  name: string;
  price_cents: number;
  description: string;
}

export interface Person {
  person_id: number;
  name: string;
  email: string | null;
  address: string | null;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
