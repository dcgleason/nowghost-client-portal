import crypto from "crypto";
import { getSessionUser } from "./_lib/auth.mjs";
import { json } from "./_lib/response.mjs";
import { insert } from "./_lib/supabase.mjs";

export async function POST(request) {
  const session = getSessionUser(request);
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const rows = await insert(
      "portal_posts",
      {
        id: crypto.randomUUID(),
        client_id: body.clientId,
        title: body.title || "Untitled Post",
        content: body.content || "",
        publish_date: body.publishDate,
        status: body.status || "draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { selectQuery: "select=id,client_id,title,content,publish_date,status,created_at,updated_at" }
    );
    const post = rows[0];
    return json({
      post: {
        id: post.id,
        clientId: post.client_id,
        title: post.title,
        content: post.content,
        publishDate: post.publish_date,
        status: post.status,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        comments: [],
      },
    });
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }
}
