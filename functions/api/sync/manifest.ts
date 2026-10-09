import {
  createCorsResponse,
  jsonResponse,
  authenticateSyncRequest,
  getR2Bucket,
  type SyncEnv,
} from './_helpers';

export async function onRequestOptions(): Promise<Response> {
  return createCorsResponse();
}

export async function onRequestGet({
  request,
  env,
}: {
  request: Request;
  env: SyncEnv;
}): Promise<Response> {
  const auth = await authenticateSyncRequest(request);
  if (auth instanceof Response) return auth;

  const bucket = getR2Bucket(env);
  if (bucket instanceof Response) return bucket;

  const manifestKey = `users/${auth.namespace}/manifest.json`;
  const obj = await bucket.get(manifestKey);
  if (!obj) {
    return jsonResponse({ exists: false, updatedAt: 0 });
  }

  const data = await obj.json();
  return jsonResponse(data);
}
