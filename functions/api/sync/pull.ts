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

  const snapshotKey = `users/${auth.namespace}/snapshot.json`;
  const obj = await bucket.get(snapshotKey);
  if (!obj) {
    return jsonResponse({ error: 'Snapshot not found' }, 404);
  }

  const snapshot = await obj.json();
  return jsonResponse(snapshot);
}
