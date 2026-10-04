const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, xi-api-key, x-target-endpoint',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function buildTtsForwardHeaders(request: Request): Headers {
  const headers = new Headers();
  headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json');

  const auth = request.headers.get('Authorization');
  if (auth) headers.set('Authorization', auth);

  const xiKey = request.headers.get('xi-api-key');
  if (xiKey) headers.set('xi-api-key', xiKey);

  const apiKey = request.headers.get('x-api-key');
  if (apiKey) headers.set('x-api-key', apiKey);

  return headers;
}

export async function onRequestPost({ request }: { request: Request }): Promise<Response> {
  const targetEndpoint = request.headers.get('x-target-endpoint');
  if (!targetEndpoint) {
    return new Response(JSON.stringify({ error: 'Missing x-target-endpoint header' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const forwardHeaders = buildTtsForwardHeaders(request);
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
