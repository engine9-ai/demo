import { env } from "cloudflare:workers";
import PersonWorker from "@engine9/core/PersonWorker";
import { SqlApiKeyStore } from "@engine9/core/auth";
import { createDelegateAuth } from "@engine9/core/auth/delegate";
import { BatchLogger } from "@engine9/core/logging";
import { createApi } from "@engine9/core/api";

/**
 * Engine9 client wiring for the festival demo.
 *
 * The D1 binding (festival-db) IS the engine9 database: migration
 * 0003_engine9.sql installed the standard Engine9 interface schema and seeded
 * the plugin row, a demo API key, and a VIP segment. The client API exposes
 * people writes, person-related upserts, and segment-gated reads under /api.
 */

/** getPluginUUID('engine9.demo', 'festival-website') -- seeded in 0003_engine9.sql */
export const FESTIVAL_PLUGIN_ID = "86dfc4a8-318b-51e6-9f25-d9648f963609";
/** The VIP segment seeded in 0003_engine9.sql; gates VIP content reads */
export const VIP_SEGMENT_ID = "5f2ab45c-0a39-4939-a2af-c1fcc58f37ff";
/** The Admin segment seeded in 0004_admin_segment.sql; grants /admin access */
export const ADMIN_SEGMENT_ID = "4f4ac886-f53d-48e1-b4bd-5a98eb48cc6f";
/** Demo API key seeded in 0003_engine9.sql -- server-side only, never sent to the browser */
export const DEMO_API_KEY = "e9k_0ca7302713d70f5d130cf52cbf9167f0ea1a45ef";

/** Role -> segment id. Roles ARE segments in this demo (ordered admin-first). */
export const ROLE_SEGMENTS = {
  admin: ADMIN_SEGMENT_ID,
  vip: VIP_SEGMENT_ID,
} as const;

/** The PersonWorker runs the full inbound person pipeline against D1. */
export function createPersonWorker() {
  return new PersonWorker({ accountId: "festival-demo", d1: env.DB });
}

/**
 * All delegate login/session/role logic lives in @engine9/core; this is pure
 * configuration: which delegate to trust, which secrets to use, which plugin
 * records the logins, and which segments count as roles.
 */
export function delegateAuth() {
  return createDelegateAuth({
    worker: createPersonWorker(),
    delegateUrl: env.DELEGATE_URL || "https://delegate.engine9.ai",
    handoffSecret: env.DELEGATE_SHARED_SECRET,
    sessionSecret: env.SESSION_SECRET,
    pluginId: FESTIVAL_PLUGIN_ID,
    remoteInputId: "delegate-login",
    roleSegments: ROLE_SEGMENTS,
  });
}

export function createEngine9Api() {
  const worker = createPersonWorker();
  // API keys live in the api_key D1 table (swap for KVApiKeyStore + a KV
  // namespace without touching the endpoints)
  const keyStore = new SqlApiKeyStore({ worker });
  // Cloudflare-style batch logging. The demo has no R2 bucket, so each
  // request's batch goes to the Worker log stream (wrangler tail /
  // observability). With R2: new BatchLogger({ sink: r2Sink(env.LOG_BUCKET) })
  const logger = new BatchLogger({
    sink: (records: unknown[]) => console.log("engine9-modifications", JSON.stringify(records)),
  });
  return createApi({
    worker,
    keyStore,
    logger,
    config: {
      pluginId: FESTIVAL_PLUGIN_ID,
      defaultRemoteInputId: "festival-website",
      upsertTables: ["person_email", "person_phone", "person_address", "person_segment"],
      reads: {
        // VIP-only sets, gated by VIP segment membership; the person_id is
        // supplied by the caller (the delegate-style session), never looked up
        "vip-performances": {
          table: "performance",
          segmentId: VIP_SEGMENT_ID,
          columns: ["*"],
          where: "vip_only = 1",
          orderBy: "start_time",
        },
        // Public content read (no segment gate)
        lineup: { table: "artist", columns: ["id", "name", "genre", "blurb"] },
      },
    },
  });
}
