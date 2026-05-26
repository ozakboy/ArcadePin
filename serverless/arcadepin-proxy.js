// ArcadePin score-submission proxy (Cloudflare Worker).
//
// The browser cannot safely hold a GitHub token, so the frontend POSTs the
// score here; this worker (which holds the token as a secret) forwards it to the
// repository_dispatch API. The GitHub Action then validates and writes the JSON.
//
// Required environment / secrets (set in the Cloudflare dashboard or wrangler):
//   GH_TOKEN       (secret)  fine-grained PAT with "Contents: write" on the repo
//   GH_OWNER                 e.g. ozakboy
//   GH_REPO                  e.g. ArcadePin
//   EVENT_TYPE               arcadepin_score   (optional, this is the default)
//   ALLOWED_ORIGIN           https://ozakboy.github.io  (optional, defaults to *)

const REQUIRED = ['playerId', 'playerName', 'score', 'maxCombo', 'playTimeSeconds', 'timestamp', 'sig'];

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405, cors);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'invalid json' }, 400, cors); }
    for (const k of REQUIRED) {
      if (!(k in body)) return json({ error: `missing field: ${k}` }, 400, cors);
    }

    const res = await fetch(`https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/dispatches`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${env.GH_TOKEN}`,
        'User-Agent': 'arcadepin-proxy',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ event_type: env.EVENT_TYPE || 'arcadepin_score', client_payload: body })
    });

    if (res.status === 204) return json({ ok: true }, 200, cors);
    const detail = (await res.text()).slice(0, 300);
    return json({ ok: false, status: res.status, detail }, 502, cors);
  }
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors }
  });
}
