import { getSessionUser } from "./_lib/auth.mjs";
import { json } from "./_lib/response.mjs";
import { maybeSingle, update } from "./_lib/supabase.mjs";

export async function PATCH(request) {
  const session = getSessionUser(request);
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const postId = url.searchParams.get("id");
  if (!postId) return json({ error: "Missing post id" }, { status: 400 });

  const post = await maybeSingle("portal_posts", `select=id,client_id&id=eq.${encodeURIComponent(postId)}`);
  if (!post) return json({ error: "Post not found" }, { status: 404 });
  if (session.role !== "admin" && post.client_id !== session.clientId) {
    return json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const payload =
      session.role === "admin"
        ? {
            title: body.title,
            content: body.content,
            publish_date: body.publishDate,
            status: body.status,
            updated_at: new Date().toISOString(),
          }
        : {
            status: body.status,
            updated_at: new Date().toISOString(),
          };
    const clean = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
    const rows = await update(
      "portal_posts",
      `id=eq.${encodeURIComponent(postId)}`,
      clean,
      { selectQuery: "select=id,client_id,title,content,publish_date,status,created_at,updated_at" }
    );
    const updated = rows[0];
    return json({
      post: {
        id: updated.id,
        clientId: updated.client_id,
        title: updated.title,
        content: updated.content,
        publishDate: updated.publish_date,
        status: updated.status,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    });
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }
}
