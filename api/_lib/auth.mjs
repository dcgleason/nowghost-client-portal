import crypto from "crypto";

const COOKIE_NAME = "portalSession";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing SESSION_SECRET");
  return secret;
}

function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  return header.split(";").reduce((acc, part) => {
    const [key, ...value] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(value.join("="));
    return acc;
  }, {});
}

export function hashPassword(password, salt) {
  return crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

export function createSessionCookie(user) {
  const payload = {
    sub: user.id,
    role: user.role,
    clientId: user.client_id || null,
    email: user.email,
    name: user.name,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  return `${COOKIE_NAME}=${encoded}.${signature}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; Secure`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0; Secure`;
}

export function getSessionUser(request) {
  const token = parseCookies(request)[COOKIE_NAME];
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  if (signature !== expected) return null;
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
}
