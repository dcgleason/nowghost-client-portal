import { createSessionCookie, hashPassword } from "./_lib/auth.mjs";
import { maybeSingle } from "./_lib/supabase.mjs";
import { json } from "./_lib/response.mjs";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user = await maybeSingle(
      "portal_users",
      `select=id,email,name,role,client_id,password_salt,password_hash&email=eq.${encodeURIComponent(email)}`
    );
    if (!user) return json({ error: "Invalid credentials" }, { status: 401 });
    if (hashPassword(password, user.password_salt) !== user.password_hash) {
      return json({ error: "Invalid credentials" }, { status: 401 });
    }
    return json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          clientId: user.client_id,
        },
      },
      { headers: { "Set-Cookie": createSessionCookie(user) } }
    );
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }
}
