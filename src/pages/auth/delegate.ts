import type { APIRoute } from "astro";
import {
  createDelegateLoginFailure,
  domainFromUrl,
  normalizeDelegateLoginFailure,
} from "@engine9/core/auth/delegate";
import type { DelegateLoginFailure } from "@engine9/core/auth/delegate";
import { delegateAuth } from "../../lib/engine9";
import { setSession, needsRole, isAdmin, type Session } from "../../lib/session";

function loginFailureRedirect(failure: DelegateLoginFailure) {
  const params = new URLSearchParams();
  if (failure.reason) params.set("error", failure.reason);
  if (failure.userMessage) params.set("message", failure.userMessage);
  if (failure.kind) params.set("kind", failure.kind);
  if (failure.message && failure.message !== failure.userMessage) {
    params.set("detail", failure.message);
  }
  return `/login?${params}`;
}

/**
 * Identity Token callback. Lands here from `/identity/authorize` with
 * `?delegate_token=` (`response_mode=query`).
 *
 * Core verifies the JWT, runs person dedupe, and returns a signed session.
 */
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const identityToken = url.searchParams.get("delegate_token");
  const returnTo = new URL("/auth/delegate", url.origin).toString();

  let session: Session;
  try {
    if (!identityToken) {
      throw createDelegateLoginFailure("invalid_identity_token");
    }
    ({ session } = await delegateAuth().login(identityToken, {
      returnTo,
      domain: domainFromUrl(url.origin),
    }));
  } catch (e) {
    console.error("delegate login failed", e);
    const failure = normalizeDelegateLoginFailure(e);
    return redirect(loginFailureRedirect(failure), 303);
  }

  setSession(cookies, session);

  // New delegate users have no role segments yet -> pick one (demo policy).
  if (needsRole(session)) return redirect("/choose-role", 303);
  return redirect(isAdmin(session) ? "/admin" : "/vip", 303);
};
