const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const PORT = 3030;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function ensureDir(target) {
  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
}

function seedStore() {
  return {
    users: [
      { id: "user-admin", email: "admin@thenowghost.com", password: "ghostadmin", name: "Danny Gleason", role: "admin", clientId: null },
      { id: "user-bettera", email: "david@bettera.com", password: "ghostclient", name: "David Holstein", role: "client", clientId: "client-bettera" },
      { id: "user-venture", email: "founder@ventureco.com", password: "ghostclient", name: "Alex Carter", role: "client", clientId: "client-ventureco" },
    ],
    clients: [
      { id: "client-bettera", name: "Bettera", contactName: "David Holstein", vertical: "ServiceNow Partner" },
      { id: "client-ventureco", name: "VentureCo", contactName: "Alex Carter", vertical: "VC-Backed Startup" },
    ],
    posts: [
      {
        id: "post-1",
        clientId: "client-bettera",
        title: "Why ServiceNow Partners Need Founder Signal",
        content:
          "Most ServiceNow firms sound interchangeable online. The firms that win trust faster are the ones whose founders show how they think before the call ever happens.\n\nThat means clearer opinions on workflow transformation, sharper stories from the field, and a point of view buyers can remember.",
        publishDate: "2026-03-20",
        status: "draft",
        createdAt: "2026-03-18T09:00:00.000Z",
        updatedAt: "2026-03-18T09:00:00.000Z",
        comments: [
          { id: "comment-1", authorName: "Danny Gleason", role: "admin", body: "Drafted for your March content batch. Curious if you want this more partner-side or buyer-side.", createdAt: "2026-03-18T09:30:00.000Z" },
        ],
      },
      {
        id: "post-2",
        clientId: "client-bettera",
        title: "The Best ServiceNow Content is Specific",
        content:
          "Generic thought leadership does not move enterprise buyers. Specificity does.\n\nSpecific lessons from delivery. Specific mistakes. Specific customer pain. Specific tradeoffs. That is what makes founder-led LinkedIn work.",
        publishDate: "2026-03-24",
        status: "approved",
        createdAt: "2026-03-18T10:00:00.000Z",
        updatedAt: "2026-03-18T12:00:00.000Z",
        comments: [
          { id: "comment-2", authorName: "David Holstein", role: "client", body: "Approved. Good to post next week.", createdAt: "2026-03-18T12:00:00.000Z" },
        ],
      },
      {
        id: "post-3",
        clientId: "client-ventureco",
        title: "Why Founder-Led Content Still Matters in AI",
        content:
          "In AI, products move fast and features get copied even faster. Founder-led content is how you show the market you understand the deeper problem, not just the latest launch.\n\nThat trust compounds long before a demo request shows up.",
        publishDate: "2026-03-21",
        status: "in_review",
        createdAt: "2026-03-18T08:30:00.000Z",
        updatedAt: "2026-03-18T08:30:00.000Z",
        comments: [
          { id: "comment-3", authorName: "Danny Gleason", role: "admin", body: "Queued this for your thought-leadership slot next week.", createdAt: "2026-03-18T08:35:00.000Z" },
        ],
      },
    ],
    sessions: [],
  };
}

function ensureStore() {
  ensureDir(DATA_DIR);
  if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify(seedStore(), null, 2));
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
}

function writeStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function sendJson(res, code, payload, headers = {}) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(content);
  });
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return header.split(";").reduce((acc, part) => {
    const [key, ...value] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(value.join("="));
    return acc;
  }, {});
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sessionUser(req, store) {
  const token = parseCookies(req).sessionToken;
  if (!token) return null;
  const session = store.sessions.find((entry) => entry.token === token);
  return session ? store.users.find((user) => user.id === session.userId) || null : null;
}

function requireUser(req, res, store) {
  const user = sessionUser(req, store);
  if (!user) {
    sendJson(res, 401, { error: "Unauthorized" });
    return null;
  }
  return user;
}

function safeUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, clientId: user.clientId };
}

function dashboardPayload(store, user) {
  const clientIds = user.role === "admin" ? store.clients.map((client) => client.id) : [user.clientId];
  return {
    user: safeUser(user),
    clients: store.clients
      .filter((client) => clientIds.includes(client.id))
      .map((client) => ({
        ...client,
        posts: store.posts.filter((post) => post.clientId === client.id).sort((a, b) => a.publishDate.localeCompare(b.publishDate)),
      })),
  };
}

function updatePost(store, postId, updates) {
  const post = store.posts.find((entry) => entry.id === postId);
  if (!post) return null;
  Object.assign(post, updates, { updatedAt: new Date().toISOString() });
  return post;
}

ensureStore();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith("/api/")) {
    const store = readStore();

    if (req.method === "POST" && url.pathname === "/api/login") {
      try {
        const body = await readBody(req);
        const user = store.users.find(
          (entry) =>
            entry.email.toLowerCase() === String(body.email || "").trim().toLowerCase() &&
            entry.password === body.password
        );
        if (!user) {
          sendJson(res, 401, { error: "Invalid credentials" });
          return;
        }
        const token = crypto.randomBytes(24).toString("hex");
        store.sessions = store.sessions.filter((session) => session.userId !== user.id);
        store.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString() });
        writeStore(store);
        sendJson(res, 200, { user: safeUser(user) }, { "Set-Cookie": `sessionToken=${token}; HttpOnly; Path=/; SameSite=Lax` });
      } catch {
        sendJson(res, 400, { error: "Invalid request" });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/logout") {
      const token = parseCookies(req).sessionToken;
      store.sessions = store.sessions.filter((session) => session.token !== token);
      writeStore(store);
      sendJson(res, 200, { ok: true }, { "Set-Cookie": "sessionToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax" });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/session") {
      const user = sessionUser(req, store);
      sendJson(res, 200, { user: user ? safeUser(user) : null });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/dashboard") {
      const user = requireUser(req, res, store);
      if (!user) return;
      sendJson(res, 200, dashboardPayload(store, user));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/posts") {
      const user = requireUser(req, res, store);
      if (!user) return;
      if (user.role !== "admin") {
        sendJson(res, 403, { error: "Forbidden" });
        return;
      }
      try {
        const body = await readBody(req);
        const post = {
          id: crypto.randomUUID(),
          clientId: body.clientId,
          title: body.title || "Untitled Post",
          content: body.content || "",
          publishDate: body.publishDate,
          status: body.status || "draft",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          comments: [],
        };
        store.posts.push(post);
        writeStore(store);
        sendJson(res, 201, { post });
      } catch {
        sendJson(res, 400, { error: "Invalid request" });
      }
      return;
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/posts/")) {
      const user = requireUser(req, res, store);
      if (!user) return;
      try {
        const body = await readBody(req);
        const postId = url.pathname.split("/").pop();
        const post = store.posts.find((entry) => entry.id === postId);
        if (!post) {
          sendJson(res, 404, { error: "Post not found" });
          return;
        }
        if (user.role !== "admin" && post.clientId !== user.clientId) {
          sendJson(res, 403, { error: "Forbidden" });
          return;
        }
        const allowed =
          user.role === "admin"
            ? { title: body.title, content: body.content, publishDate: body.publishDate, status: body.status }
            : { status: body.status };
        const updates = Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined));
        const updated = updatePost(store, postId, updates);
        writeStore(store);
        sendJson(res, 200, { post: updated });
      } catch {
        sendJson(res, 400, { error: "Invalid request" });
      }
      return;
    }

    if (req.method === "POST" && url.pathname.match(/^\/api\/posts\/[^/]+\/comments$/)) {
      const user = requireUser(req, res, store);
      if (!user) return;
      try {
        const body = await readBody(req);
        const postId = url.pathname.split("/")[3];
        const post = store.posts.find((entry) => entry.id === postId);
        if (!post) {
          sendJson(res, 404, { error: "Post not found" });
          return;
        }
        if (user.role !== "admin" && post.clientId !== user.clientId) {
          sendJson(res, 403, { error: "Forbidden" });
          return;
        }
        if (!String(body.body || "").trim()) {
          sendJson(res, 400, { error: "Comment body is required" });
          return;
        }
        post.comments.push({
          id: crypto.randomUUID(),
          authorName: user.name,
          role: user.role,
          body: String(body.body).trim(),
          createdAt: new Date().toISOString(),
        });
        post.updatedAt = new Date().toISOString();
        writeStore(store);
        sendJson(res, 201, { ok: true });
      } catch {
        sendJson(res, 400, { error: "Invalid request" });
      }
      return;
    }

    sendJson(res, 404, { error: "Not found" });
    return;
  }

  let filePath = path.join(PUBLIC_DIR, url.pathname === "/" ? "index.html" : url.pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  sendFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`The Now Ghost portal is running at http://localhost:${PORT}`);
});
