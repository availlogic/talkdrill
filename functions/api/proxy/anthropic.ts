const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version, x-target-endpoint',
};

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function buildForwardHeaders(request: Request): Headers {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  const apiKey = request.headers.get('x-api-key');
  if (apiKey) headers.set('x-api-key', apiKey);

  const auth = request.headers.get('Authorization');
  if (auth) headers.set('Authorization', auth);

  const version = request.headers.get('anthropic-version') || '2023-06-01';
  headers.set('anthropic-version', version);

  return headers;
}

export async function onRequestPost({ request }: { request: Request }): Promise<Response> {
  const targetUrl = request.headers.get('x-target-endpoint') || 'https://api.anthropic.com/v1/messages';
  const forwardHeaders = buildForwardHeaders(request);

  const forwardRes = await fetch(targetUrl, {
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
