import { loginSchema } from '@/lib/validation/auth.schema';
import { authenticateAdmin } from '@/server/auth/login.service';
import { setSessionCookie } from '@/server/auth/session';
import { assertSameOrigin, getClientIp, jsonOk, readJson, withApi } from '@/server/http';

export const dynamic = 'force-dynamic';

export const POST = withApi(async (request) => {
  assertSameOrigin(request);
  const input = loginSchema.parse(await readJson(request));

  const { admin, token, expiresAt } = await authenticateAdmin({
    ...input,
    ip: getClientIp(request),
    userAgent: request.headers.get('user-agent'),
  });

  setSessionCookie(token, expiresAt);
  return jsonOk({ admin });
});
