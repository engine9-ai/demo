import { env } from "cloudflare:workers";

/**
 * The D1 binding is the primary data store. Locally (astro dev / wrangler
 * dev) it is a plain SQLite file under .wrangler/state; deployed it is a
 * Cloudflare D1 database. Same query API either way.
 */
export function getDB(): D1Database {
  return env.DB;
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
