import type { AstroCookies } from "astro";

/**
 * Pretend authentication.
 *
 * In production, authentication is handled by the sibling "delegate"
 * deployment (a shared external auth scheme). Delegate would verify the user
 * and hand this site a person_id + entitlement level. This demo skips all of
 * that: the "Login as VIP" / "Login as Admin" buttons simply set a session
 * cookie directly. Everything downstream of the cookie -- the middleware
 * gating, the role checks, keying per-person data on person_id -- works the
 * same way it would with real auth.
 */

export type Role = "vip" | "admin";

export interface Session {
  /** Integer key for all per-person data in SQLite (ticket, name, address...). */
  personId: number;
  role: Role;
}

const COOKIE_NAME = "festival_session";

/** The two seeded demo identities the login buttons sign in as. */
export const DEMO_USERS: Record<Role, { personId: number; label: string }> = {
  vip: { personId: 101, label: "Vera Vipperman (VIP)" },
  admin: { personId: 900, label: "Ada Adminson (Admin)" },
};

export function getSession(cookies: AstroCookies): Session | null {
  const raw = cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [role, id] = raw.split(":");
  const personId = Number(id);
  if ((role !== "vip" && role !== "admin") || !Number.isInteger(personId)) return null;
  return { personId, role };
}

export function setSession(cookies: AstroCookies, role: Role): void {
  cookies.set(COOKIE_NAME, `${role}:${DEMO_USERS[role].personId}`, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 1 day
  });
}

export function clearSession(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, { path: "/" });
}

/** Can this session see VIP content? Admins can, so they can preview it. */
export function canAccessVip(session: Session | null): boolean {
  return session?.role === "vip" || session?.role === "admin";
}

export function isAdmin(session: Session | null): boolean {
  return session?.role === "admin";
}
