import { categoryInputSchema } from '@/lib/validation/category.schema';
import { requireAdminApi } from '@/server/auth/guards';
import { assertSameOrigin, jsonOk, readJson, withApi } from '@/server/http';
import { createCategory } from '@/server/services/categories.service';

export const dynamic = 'force-dynamic';

export const POST = withApi(async (request) => {
  assertSameOrigin(request);
  await requireAdminApi();
  const input = categoryInputSchema.parse(await readJson(request));
  return jsonOk(await createCategory(input), 201);
});
