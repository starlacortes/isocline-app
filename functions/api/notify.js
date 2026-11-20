/*
  isocline.app — Pages Function for the launch-notice form.

  Cloudflare Pages serves everything in ./public by itself and runs this file
  only for /api/notify.

    POST /api/notify   save one email address for the launch notice

  What is stored: the address and the time it arrived. Nothing else — no IP
  address, no user agent, no cookie.
*/

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY = 2048;

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}

async function readSubmission(request) {
  const text = await request.text();
  if (text.length > MAX_BODY) return null;
  const type = request.headers.get("Content-Type") || "";
  if (type.includes("application/json")) {
    try {
      const body = JSON.parse(text);
      return { email: body.email, trap: body.company, wantsJson: true };
    } catch {
      return null;
    }
  }
  const form = new URLSearchParams(text);
  return { email: form.get("email"), trap: form.get("company"), wantsJson: false };
}

// Every method except POST.
export function onRequest() {
  return json({ ok: false, error: "method" }, 405, { Allow: "POST" });
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);

  // Only the site's own form may post here.
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ ok: false, error: "origin" }, 403);

  const sub = await readSubmission(request);
  if (!sub) return json({ ok: false, error: "invalid" }, 400);

  const done = () => (sub.wantsJson ? json({ ok: true }) : Response.redirect(`${url.origin}/?noted=1`, 303));

  // The hidden field is never filled by a person. Answer as if saved, and save nothing.
  if (sub.trap) return done();

  const email = String(sub.email || "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return json({ ok: false, error: "invalid" }, 400);

  try {
    await env.DB.prepare("INSERT OR IGNORE INTO notify (email, created_at) VALUES (?1, ?2)")
      .bind(email, new Date().toISOString())
      .run();
  } catch (err) {
    console.error("notify: could not save", err && err.message);
    return json({ ok: false, error: "storage" }, 500);
  }
  return done();
}
