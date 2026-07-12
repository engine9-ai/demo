import type { APIRoute } from "astro";
import { delegateAuth } from "../../lib/engine9";
import { getSession, setSession } from "../../lib/session";

/**
 * Role selection (demo policy). Roles are segments: core's grantRole upserts
 * the person_segment row for the chosen segment and returns the refreshed
 * role list, which is re-signed into the session cookie.
 *
 * Adding new delegate users to person_segment like this is a DEMO-only
 * behavior -- delegate itself knows nothing about roles or segments, and
 * production deployments would assign segments through their own processes.
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const session = getSession(cookies);
  if (!session) return redirect("/login?required=member", 303);

  const form = await request.formData();
  const role = form.get("role");
  if (role !== "vip" && role !== "admin") {
    return new Response("Unknown role", { status: 400 });
  }

  const roles = await delegateAuth().grantRole(session.personId, role);
  setSession(cookies, { ...session, roles });

  return redirect(role === "admin" ? "/admin" : "/vip", 303);
};
