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

function buildForwardHeaders(request: Request, targetUrl: string): Headers {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  const apiKey = request.headers.get('x-api-key');
  if (apiKey) headers.set('x-api-key', apiKey);

  const auth = request.headers.get('Authorization');
  if (auth) headers.set('Authorization', auth);

  const explicitVersion = request.headers.get('anthropic-version');
  if (explicitVersion) {
    headers.set('anthropic-version', explicitVersion);
  } else if (targetUrl.includes('api.anthropic.com')) {
    headers.set('anthropic-version', '2023-06-01');
  }

  return headers;
}

export async function onRequestPost({ request }: { request: Request }): Promise<Response> {
  const url = new URL(request.url);
  const targetUrl = request.headers.get('x-target-endpoint') || url.searchParams.get('target') || 'https://api.anthropic.com/v1/messages';
  const forwardHeaders = buildForwardHeaders(request, targetUrl);

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
