import type { APIRoute } from "astro";
import { delegateAuth } from "../../lib/engine9";
import { setSession, needsRole, isAdmin, type Session } from "../../lib/session";

/**
 * Delegate callback. The browser lands here from delegate's
 * /handoff/authorize with a one-time ?delegate_code=. Core does all the work
 * (server-to-server code exchange under the shared secret, person dedupe via
 * id_type "delegate", role lookup from person_segment, session signing); this
 * endpoint just stores the cookie and routes the user.
 */
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get("delegate_code");
  if (!code) return redirect("/login?error=missing_delegate_code", 303);

  let session: Session;
  try {
    ({ session } = await delegateAuth().login(code));
  } catch (e) {
    console.error("delegate login failed", e);
    const reason = (e as { reason?: string }).reason || "login_failed";
    return redirect(`/login?error=${encodeURIComponent(reason)}`, 303);
  }

  setSession(cookies, session);

  // New delegate users have no role segments yet -> pick one (demo policy).
  if (needsRole(session)) return redirect("/choose-role", 303);
  return redirect(isAdmin(session) ? "/admin" : "/vip", 303);
};
