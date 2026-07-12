import type { APIRoute } from "astro";
import { createDelegateLoginFailure } from "@engine9/core/auth/delegate";
import type { DelegateLoginFailure } from "@engine9/core/auth/delegate";
import { delegateAuth } from "../../lib/engine9";
import { setSession, needsRole, isAdmin, type Session } from "../../lib/session";

function loginFailureRedirect(err: DelegateLoginFailure | Error) {
  const failure = err as DelegateLoginFailure;
  const params = new URLSearchParams();
  if (failure.reason) params.set("error", failure.reason);
  if (failure.userMessage) params.set("message", failure.userMessage);
  if (failure.kind) params.set("kind", failure.kind);
  return `/login?${params}`;
}

/**
 * Delegate callback. The browser lands here from delegate's
 * /handoff/authorize with a one-time ?delegate_code=. Core does all the work
 * (server-to-server code exchange under the shared secret, person dedupe via
 * id_type "delegate", role lookup from person_segment, session signing); this
 * endpoint just stores the cookie and routes the user.
 */
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get("delegate_code");

  let session: Session;
  try {
    if (!code) throw createDelegateLoginFailure("missing_delegate_code");
    ({ session } = await delegateAuth().login(code));
  } catch (e) {
    console.error("delegate login failed", e);
    const err = e as Partial<DelegateLoginFailure>;
    const failure =
      err.userMessage && err.reason && err.kind
        ? (err as DelegateLoginFailure)
        : createDelegateLoginFailure(err.reason || "login_failed");
    return redirect(loginFailureRedirect(failure), 303);
  }

  setSession(cookies, session);

  // New delegate users have no role segments yet -> pick one (demo policy).
  if (needsRole(session)) return redirect("/choose-role", 303);
  return redirect(isAdmin(session) ? "/admin" : "/vip", 303);
};
