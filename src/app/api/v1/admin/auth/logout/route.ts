import { destroyCurrentSession } from '@/server/auth/session';
import { assertSameOrigin, jsonOk, withApi } from '@/server/http';

export const dynamic = 'force-dynamic';

export const POST = withApi(async (request) => {
  assertSameOrigin(request);
  await destroyCurrentSession();
  return jsonOk({});
});
