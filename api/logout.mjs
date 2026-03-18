import { clearSessionCookie } from "./_lib/auth.mjs";
import { json } from "./_lib/response.mjs";

export async function POST() {
  return json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
}
