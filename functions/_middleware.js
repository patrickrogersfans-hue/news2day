
async function signToken(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function validSession(request, env) {
  if (!env.ADMIN_PASSWORD) return false;

  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)news2day_session=([^;]+)/);

  if (!match) return false;

  const parts = match[1].split(".");
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;

  try {
    const expected = await signToken(payload, env.ADMIN_PASSWORD);

    if (signature !== expected) return false;

    const decoded = atob(
      payload.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - payload.length % 4) % 4)
    );

    const session = JSON.parse(decoded);

    return Number.isInteger(session.expires) &&
      session.expires > Math.floor(Date.now() / 1000);

  } catch {
    return false;
  }
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  const isAdminPage = path === "/admin.html";
  const isAdminApi = path.startsWith("/api/admin/");

  if (!isAdminPage && !isAdminApi) {
    return context.next();
  }

  if (path === "/api/admin/login") {
    return context.next();
  }

  if (await validSession(context.request, context.env)) {
    return context.next();
  }

  if (isAdminApi) {
    return Response.json(
      { error: "Authentication required." },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }

  return Response.redirect(
    new URL("/login.html", url.origin).toString(),
    302
  );
}
