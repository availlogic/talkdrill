import {
  createCorsResponse,
  jsonResponse,
  authenticateSyncRequest,
  getR2Bucket,
  SYNC_CORS_HEADERS,
  type SyncEnv,
} from '../_helpers';

export async function onRequestOptions(): Promise<Response> {
  return createCorsResponse();
}

export async function onRequestGet({
  request,
  params,
  env,
}: {
  request: Request;
  params: { id?: string };
  env: SyncEnv;
}): Promise<Response> {
  const auth = await authenticateSyncRequest(request);
  if (auth instanceof Response) return auth;

  const bucket = getR2Bucket(env);
  if (bucket instanceof Response) return bucket;

  const audioId = params.id;
  if (!audioId) return jsonResponse({ error: 'Missing audio id' }, 400);

  const obj = await bucket.get(`users/${auth.namespace}/audios/${audioId}`);
  if (!obj) return jsonResponse({ error: 'Audio not found' }, 404);

  const headers = new Headers(SYNC_CORS_HEADERS);
  headers.set('Content-Type', obj.httpMetadata?.contentType || 'audio/mpeg');
  return new Response(obj.body, { status: 200, headers });
}

export async function onRequestPut({
  request,
  params,
  env,
}: {
  request: Request;
  params: { id?: string };
  env: SyncEnv;
}): Promise<Response> {
  const auth = await authenticateSyncRequest(request);
  if (auth instanceof Response) return auth;

  const bucket = getR2Bucket(env);
  if (bucket instanceof Response) return bucket;

  const audioId = params.id;
  if (!audioId) return jsonResponse({ error: 'Missing audio id' }, 400);

  const contentType = request.headers.get('Content-Type') || 'audio/mpeg';
  const body = await request.arrayBuffer();

  await bucket.put(`users/${auth.namespace}/audios/${audioId}`, body, {
    httpMetadata: { contentType },
  });

  return jsonResponse({ success: true, audioId });
}
