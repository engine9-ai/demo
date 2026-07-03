import { defineMiddleware } from "astro:middleware";
import { getSession, canAccessVip, isAdmin } from "./lib/session";

/**
 * Server-side gate. Runs on every request, before any page renders.
 * Protected content under /vip and /admin is never sent to the browser
 * unless the session cookie carries the required level.
 */
export const onRequest = defineMiddleware((context, next) => {
  const session = getSession(context.cookies);
  context.locals.session = session;

  const path = context.url.pathname;

  if (path.startsWith("/vip") && !canAccessVip(session)) {
    return context.redirect("/login?required=vip");
  }

  if (path.startsWith("/admin") && !isAdmin(session)) {
    return context.redirect("/login?required=admin");
  }

  return next();
});
