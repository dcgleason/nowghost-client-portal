import crypto from "crypto";
import { getSessionUser } from "./_lib/auth.mjs";
import { json } from "./_lib/response.mjs";
import { insert, maybeSingle } from "./_lib/supabase.mjs";

export async function POST(request) {
  const session = getSessionUser(request);
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const postId = String(body.postId || "");
    const commentBody = String(body.body || "").trim();
    if (!commentBody) return json({ error: "Comment body is required" }, { status: 400 });
    const post = await maybeSingle("portal_posts", `select=id,client_id&id=eq.${encodeURIComponent(postId)}`);
    if (!post) return json({ error: "Post not found" }, { status: 404 });
    if (session.role !== "admin" && post.client_id !== session.clientId) {
      return json({ error: "Forbidden" }, { status: 403 });
    }
    await insert("portal_comments", {
      id: crypto.randomUUID(),
      post_id: postId,
      author_name: session.name,
      role: session.role,
      body: commentBody,
      created_at: new Date().toISOString(),
    });
    return json({ ok: true });
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }
}
