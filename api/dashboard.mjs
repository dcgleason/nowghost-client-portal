import { getSessionUser } from "./_lib/auth.mjs";
import { json } from "./_lib/response.mjs";
import { select } from "./_lib/supabase.mjs";

function commentsByPost(comments) {
  return comments.reduce((acc, comment) => {
    if (!acc[comment.post_id]) acc[comment.post_id] = [];
    acc[comment.post_id].push(comment);
    return acc;
  }, {});
}

export async function GET(request) {
  const session = getSessionUser(request);
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  const clients = await select(
    "portal_clients",
    session.role === "admin"
      ? "select=id,name,contact_name,vertical&order=name.asc"
      : `select=id,name,contact_name,vertical&id=eq.${encodeURIComponent(session.clientId)}`
  );

  const clientIds = clients.map((client) => client.id);
  const posts = clientIds.length
    ? await select(
        "portal_posts",
        `select=id,client_id,title,content,publish_date,status,created_at,updated_at&client_id=in.(${clientIds
          .map(encodeURIComponent)
          .join(",")})&order=publish_date.asc`
      )
    : [];

  const postIds = posts.map((post) => post.id);
  const comments = postIds.length
    ? await select(
        "portal_comments",
        `select=id,post_id,author_name,role,body,created_at&post_id=in.(${postIds
          .map(encodeURIComponent)
          .join(",")})&order=created_at.asc`
      )
    : [];

  const groupedComments = commentsByPost(comments);
  const postsByClient = posts.reduce((acc, post) => {
    if (!acc[post.client_id]) acc[post.client_id] = [];
    acc[post.client_id].push({
      id: post.id,
      clientId: post.client_id,
      title: post.title,
      content: post.content,
      publishDate: post.publish_date,
      status: post.status,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      comments: (groupedComments[post.id] || []).map((comment) => ({
        id: comment.id,
        postId: comment.post_id,
        authorName: comment.author_name,
        role: comment.role,
        body: comment.body,
        createdAt: comment.created_at,
      })),
    });
    return acc;
  }, {});

  return json({
    user: session,
    clients: clients.map((client) => ({
      id: client.id,
      name: client.name,
      contactName: client.contact_name,
      vertical: client.vertical,
      posts: postsByClient[client.id] || [],
    })),
  });
}
