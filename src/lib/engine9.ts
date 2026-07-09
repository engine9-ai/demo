import { env } from "cloudflare:workers";
import PersonWorker from "@engine9/client/PersonWorker";
import { SqlApiKeyStore } from "@engine9/client/auth";
import { BatchLogger } from "@engine9/client/logging";
import { createApi } from "@engine9/client/api";

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

export function createEngine9Api() {
  const worker = new PersonWorker({ accountId: "festival-demo", d1: env.DB });
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
