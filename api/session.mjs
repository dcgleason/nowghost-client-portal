import { getSessionUser } from "./_lib/auth.mjs";
import { json } from "./_lib/response.mjs";

export async function GET(request) {
  return json({ user: getSessionUser(request) });
}
