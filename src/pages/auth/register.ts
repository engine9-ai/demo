import type { APIRoute } from "astro";
import { createEngine9Api, DEMO_API_KEY } from "../../lib/engine9";

function splitName(name: string) {
  const trimmed = name.trim();
  const space = trimmed.indexOf(" ");
  if (space <= 0) return { given_name: trimmed, family_name: "" };
  return {
    given_name: trimmed.slice(0, space),
    family_name: trimmed.slice(space + 1).trim(),
  };
}

/**
 * Registration handler. Forwards the form to POST /api/people server-side so
 * the API key never reaches the browser.
 */
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();

  if (!name) return redirect("/register?error=name", 303);
  if (!email || !email.includes("@")) return redirect("/register?error=email", 303);

  const { given_name, family_name } = splitName(name);
  const api = createEngine9Api();
  const apiRequest = new Request("http://localhost/api/people", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEMO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      people: [{ given_name, family_name, email }],
    }),
  });

  const response = await api.handleFetch(apiRequest, { basePath: "/api" });
  const body = (await response.json()) as {
    personIds?: number[];
    error?: string;
  };

  if (!response.ok) {
    const message = encodeURIComponent(body.error || `status_${response.status}`);
    return redirect(`/register?error=${message}`, 303);
  }

  const personId = body.personIds?.[0];
  const suffix = personId ? `&person_id=${personId}` : "";
  return redirect(`/register?ok=1${suffix}`, 303);
};
