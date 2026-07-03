// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

// All pages are server-rendered so that VIP/Admin gating happens on the
// server, never in client JS. The Cloudflare adapter runs dev in workerd and
// exposes the D1 binding (a local SQLite file under .wrangler/state) during
// `astro dev`, so the same code runs locally under Node and on Workers.
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    imageService: "passthrough",
  }),
});
