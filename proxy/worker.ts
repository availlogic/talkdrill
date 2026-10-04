export interface Env {
  // Optional environment variables if needed
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version, x-target-endpoint',
};

function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    const url = new URL(request.url);

    if (url.pathname === '/api/proxy/anthropic' && request.method === 'POST') {
      const apiKey = request.headers.get('x-api-key') || '';
      const anthropicVersion = request.headers.get('anthropic-version') || '2023-06-01';

      const forwardRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': anthropicVersion,
        },
        body: request.body,
      });

      const responseHeaders = new Headers(forwardRes.headers);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));

      return new Response(forwardRes.body, {
        status: forwardRes.status,
        headers: responseHeaders,
      });
    }

    if (url.pathname === '/api/proxy/tts' && request.method === 'POST') {
      const targetEndpoint = request.headers.get('x-target-endpoint');
      if (!targetEndpoint) {
        return new Response(JSON.stringify({ error: 'Missing x-target-endpoint header' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const forwardHeaders = new Headers();
      forwardHeaders.set('Content-Type', request.headers.get('Content-Type') || 'application/json');

      const auth = request.headers.get('Authorization');
      if (auth) forwardHeaders.set('Authorization', auth);

      const xiKey = request.headers.get('xi-api-key');
      if (xiKey) forwardHeaders.set('xi-api-key', xiKey);

      const forwardRes = await fetch(decodeURIComponent(targetEndpoint), {
        method: 'POST',
        headers: forwardHeaders,
        body: request.body,
      });

      const responseHeaders = new Headers(forwardRes.headers);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));

      return new Response(forwardRes.body, {
        status: forwardRes.status,
        headers: responseHeaders,
      });
    }

    return new Response('TalkDrill Stateless Edge Proxy Active', {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
    });
  },
};
