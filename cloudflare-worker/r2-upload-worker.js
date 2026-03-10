// Cloudflare Worker for R2 image uploads
// Deploy: wrangler deploy
//
// wrangler.toml config needed:
// [[r2_buckets]]
// binding = "BUCKET"
// bucket_name = "plannerapp-images"
//
// Secrets to set:
// wrangler secret put AUTH_TOKEN
// wrangler secret put R2_PUBLIC_URL  (e.g. https://pub-xxx.r2.dev)

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    // Auth check
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (token !== env.AUTH_TOKEN) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file');
      const folder = formData.get('folder') || 'uploads';

      if (!file || !(file instanceof File)) {
        return jsonResponse({ error: 'No file provided' }, 400);
      }

      const ext = file.name.split('.').pop() || 'jpg';
      const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      await env.BUCKET.put(key, file.stream(), {
        httpMetadata: { contentType: file.type },
      });

      const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;

      return jsonResponse({ url: publicUrl });
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
