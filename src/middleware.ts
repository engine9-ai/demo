import { defineMiddleware } from "astro:middleware";
import { getSession, canAccessVip, isAdmin, needsRole } from "./lib/session";
import { logDbPath } from "./lib/db";

let dbPathLogged = false;

/**
 * Server-side gate. Runs on every request, before any page renders.
 * Protected content under /vip and /admin is never sent to the browser
 * unless the session cookie carries the required level.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  if (!dbPathLogged) {
    dbPathLogged = true;
    try {
      await logDbPath();
    } catch {
      // PRAGMA may be blocked in D1; binding + local path hints are still logged.
    }
  }

  const session = getSession(context.cookies);
  context.locals.session = session;

  const path = context.url.pathname;
  const gated = path.startsWith("/vip") || path.startsWith("/admin");

  // Logged in via delegate but not yet in a role segment -> pick one first.
  if (gated && needsRole(session)) {
    return context.redirect("/choose-role");
  }

  if (path.startsWith("/vip") && !canAccessVip(session)) {
    return context.redirect("/login?required=vip");
  }

  if (path.startsWith("/admin") && !isAdmin(session)) {
    return context.redirect("/login?required=admin");
  }

  return next();
});
