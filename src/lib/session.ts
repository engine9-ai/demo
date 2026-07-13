import type { AstroCookies } from "astro";
import {
  sessionHasRole,
  sessionPrimaryRole,
  sessionNeedsRole,
  type DelegateSession,
  type CredentialLevel,
} from "@engine9/core/auth/delegate";
import { delegateAuth } from "./engine9";

/**
 * Thin cookie glue around @engine9/core's delegate auth. All real logic --
 * code exchange, person dedupe (id_type "delegate"), role lookup from
 * person_segment, token signing/verification -- lives in core; this file only
 * moves the signed token in and out of the Astro cookie jar and names the
 * demo's role policy (session-scoped via loadRolesOnLogin: false).
 */

export type Role = "vip" | "admin";

/** Session payload minted by core's createDelegateAuth().login(). */
export type Session = DelegateSession<Role>;
export type { CredentialLevel };

/** Astro/Lucia community convention; cookie glue stays here — core is host-agnostic. */
const COOKIE_NAME = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 1 day

export function getSession(cookies: AstroCookies): Session | null {
  const token = cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return delegateAuth().verify(token);
}

export function setSession(cookies: AstroCookies, session: Session): void {
  cookies.set(COOKIE_NAME, delegateAuth().issueToken(session), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSession(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, { path: "/" });
  // Drop the old demo-specific name if present.
  cookies.delete("festival_session", { path: "/" });
}

/** Can this session see VIP content? Admins can, so they can preview it. */
export const canAccessVip = (session: Session | null): boolean =>
  sessionHasRole(session, "vip", "admin");

export const isAdmin = (session: Session | null): boolean =>
  sessionHasRole(session, "admin");

/** Logged in via delegate but hasn't picked (or been granted) a role yet. */
export const needsRole = (session: Session | null): boolean =>
  sessionNeedsRole(session);

/** Highest role, for display. */
export const primaryRole = (session: Session | null): Role | "member" =>
  sessionPrimaryRole(session, ["admin", "vip"]) ?? "member";
