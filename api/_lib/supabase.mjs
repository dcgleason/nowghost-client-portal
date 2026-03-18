const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
}

function url(table, query = "") {
  return `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ""}`;
}

export async function select(table, query) {
  const response = await fetch(url(table, query), { headers: headers(), cache: "no-store" });
  if (!response.ok) throw new Error(`Supabase select failed: ${response.status}`);
  return response.json();
}

export async function maybeSingle(table, query) {
  const rows = await select(table, query);
  return rows[0] || null;
}

export async function insert(table, payload, { selectQuery } = {}) {
  const response = await fetch(url(table, selectQuery || ""), {
    method: "POST",
    headers: { ...headers(), Prefer: selectQuery ? "return=representation" : "return=minimal" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Supabase insert failed: ${response.status}`);
  return response.status === 204 ? null : response.json();
}

export async function update(table, filterQuery, payload, { selectQuery } = {}) {
  const response = await fetch(url(table, `${filterQuery}${selectQuery ? `&${selectQuery}` : ""}`), {
    method: "PATCH",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Supabase update failed: ${response.status}`);
  return response.json();
}
