/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    session: import("./lib/session").Session | null;
    /** Set by @astrojs/cloudflare on each request (see createLocals). */
    cfContext?: ExecutionContext;
  }
}
