import type { APIRoute } from "astro";
import { createEngine9Api } from "../../lib/engine9";

/**
 * Engine9 client API, served under /api by the same Worker as the site:
 *
 *   GET  /api/ok
 *   POST /api/people                 (Authorization: Bearer e9k_...)
 *   POST /api/upsert/:table
 *   GET  /api/read/vip-performances?person_id=...
 */
const handler: APIRoute = async ({ request, locals }) => {
  const api = createEngine9Api();
  const ctx = (locals as { cfContext?: unknown }).cfContext;
  return api.handleFetch(request, { basePath: "/api", ctx });
};

export const GET = handler;
export const POST = handler;
export const ALL = handler;
