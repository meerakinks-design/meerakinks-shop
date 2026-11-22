import { changePasswordSchema } from '@/lib/validation/auth.schema';
import { requireAdminApi } from '@/server/auth/guards';
import { changeAdminPassword } from '@/server/auth/password-change.service';
import { setSessionCookie } from '@/server/auth/session';
import { assertSameOrigin, jsonOk, readJson, withApi } from '@/server/http';

export const dynamic = 'force-dynamic';

export const POST = withApi(async (request) => {
  assertSameOrigin(request);
  const admin = await requireAdminApi();
  const input = changePasswordSchema.parse(await readJson(request));

  const { token, expiresAt } = await changeAdminPassword({ ...input, adminId: admin.id, userAgent: request.headers.get('user-agent') });

  // Les autres sessions du compte ne valent plus rien ; celle-ci est remplacée par un jeton neuf.
  setSessionCookie(token, expiresAt);
  return jsonOk({});
});
