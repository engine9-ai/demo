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
  if (failure.browserExchangeUrl) {
    params.set("continue", failure.browserExchangeUrl);
  }
  return `/login?${params}`;
}

/**
 * Delegate callback. Lands here from:
 *   - /handoff/authorize with ?delegate_code= (production server exchange), or
 *   - /handoff/authorize with ?delegate_bridge= (localhost signed bridge), or
 *   - /handoff/browser-exchange with ?delegate_bridge= (local-dev continue step)
 *
 * Core verifies the bridge or exchanges the code, runs person dedupe, and
 * returns a signed session. On Cloudflare Bot Fight blocking the exchange,
 * we send the developer back to /login with a continue URL to finish in-browser.
 */
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get("delegate_code");
  const bridge = url.searchParams.get("delegate_bridge");
  const returnTo = new URL("/auth/delegate", url.origin).toString();

  let session: Session;
  try {
    if (bridge) {
      ({ session } = await delegateAuth().login(bridge, { returnTo }));
    } else if (code) {
      ({ session } = await delegateAuth().login(code, { returnTo }));
    } else {
      throw createDelegateLoginFailure("missing_delegate_code");
    }
  } catch (e) {
    console.error("delegate login failed", e);
    const err = e as Partial<DelegateLoginFailure>;
    const failure =
      err.userMessage && err.reason && err.kind
        ? (err as DelegateLoginFailure)
        : createDelegateLoginFailure(err.reason || "login_failed");
    if (err.browserExchangeUrl) failure.browserExchangeUrl = err.browserExchangeUrl;
    return redirect(loginFailureRedirect(failure), 303);
  }

  setSession(cookies, session);

  // New delegate users have no role segments yet -> pick one (demo policy).
  if (needsRole(session)) return redirect("/choose-role", 303);
  return redirect(isAdmin(session) ? "/admin" : "/vip", 303);
};
