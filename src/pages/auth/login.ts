import type { APIRoute } from "astro";
import { setSession } from "../../lib/session";

/**
 * Pretend login endpoint. A real deployment would redirect to the delegate
 * auth service and receive a verified identity back; here the form button
 * just tells us which role to become.
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const role = form.get("role");

  if (role !== "vip" && role !== "admin") {
    return new Response("Unknown role", { status: 400 });
  }

  setSession(cookies, role);
  return redirect(role === "admin" ? "/admin" : "/vip", 303);
};
