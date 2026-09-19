import type { APIRoute } from "astro";
import { ADMIN_SEGMENT_ID, VIP_SEGMENT_ID, delegateAuth } from "../../lib/engine9";
import { canClaimRole, getSession, setSession } from "../../lib/session";

/**
 * Role selection (demo policy). role_id is the segment UUID. Core's changeRole
 * upserts person_segment and re-signs the session cookie.
 *
 * With loadRolesOnLogin: false, every fresh login re-prompts here even if
 * segments still exist from a prior visit.
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
  const roleId =
    role === "admin" ? ADMIN_SEGMENT_ID : role === "vip" ? VIP_SEGMENT_ID : null;
  if (!roleId) {
    return new Response("Unknown role", { status: 400 });
  }
  if (!canClaimRole(session, roleId)) {
    return redirect("/choose-role?error=level", 303);
  }

  const { session: next } = await delegateAuth().changeRole({
    personId: session.personId,
    roleId,
    exclusive: true,
    session,
  });
  setSession(cookies, next);

  return redirect(roleId === ADMIN_SEGMENT_ID ? "/admin" : "/vip", 303);
};
