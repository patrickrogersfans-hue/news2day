
function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function createSignature(value, secret) {
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
    new TextEncoder().encode(value)
  );

  return base64url(new Uint8Array(signature));
}

function safeEqual(a, b) {
  const encoder = new TextEncoder();
  const x = encoder.encode(a);
  const y = encoder.encode(b);

  let difference = x.length ^ y.length;
  const length = Math.max(x.length, y.length);

  for (let i = 0; i < length; i++) {
    difference |= (x[i] || 0) ^ (y[i] || 0);
  }

  return difference === 0;
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
    return Response.json(
      { error: "Admin credentials are not configured." },
      { status: 500 }
    );
  }

  try {
    const credentials = await request.json();

    const username = String(credentials.username || "");
    const password = String(credentials.password || "");

    if (
      !safeEqual(username, env.ADMIN_USERNAME) ||
      !safeEqual(password, env.ADMIN_PASSWORD)
    ) {
      return Response.json(
        { error: "Incorrect username or password." },
        { status: 401 }
      );
    }

    const expires = Math.floor(Date.now() / 1000) + 8 * 60 * 60;

    const payload = base64url(
      new TextEncoder().encode(JSON.stringify({ expires }))
    );

    const signature = await createSignature(
      payload,
      env.ADMIN_PASSWORD
    );

    const token = `${payload}.${signature}`;

    return new Response(
      JSON.stringify({ success: true, message: "Login successful." }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Set-Cookie":
            `news2day_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`
        }
      }
    );

  } catch {
    return Response.json(
      { error: "Unable to process login." },
      { status: 400 }
    );
  }
}
