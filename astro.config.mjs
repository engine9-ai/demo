// @ts-check
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

const inputToolsShim = fileURLToPath(
  import.meta.resolve("@engine9/core/cloudflare/input-tools-shim")
);
const unavailableModule = fileURLToPath(
  import.meta.resolve("@engine9/core/cloudflare/unavailable-module")
);

// All pages are server-rendered so that VIP/Admin gating happens on the
// server, never in client JS. The Cloudflare adapter runs dev in workerd and
// exposes the D1 binding (a local SQLite file under .wrangler/state) during
// `astro dev`, so the same code runs locally under Node and on Workers.
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    imageService: "passthrough",
  }),
  vite: {
    resolve: {
      alias: [
        // @engine9/core's interface transforms import @engine9/input-tools,
        // whose index pulls server-only deps (AWS SDK, archiver, googleapis).
        // The shim re-exports the portable pieces. Exact match only --
        // subpaths like @engine9/input-tools/timelineTypes.js stay intact.
        { find: /^@engine9\/input-tools$/, replacement: inputToolsShim },
        // Node-only DB drivers behind SQLWorker's lazy non-D1 connection
        // modes; never reached on Workers, stubbed so the bundle resolves
        { find: /^knex$/, replacement: unavailableModule },
        { find: /^mysql2\/promise$/, replacement: unavailableModule },
        { find: /^better-sqlite3$/, replacement: unavailableModule },
      ],
    },
  },
});
