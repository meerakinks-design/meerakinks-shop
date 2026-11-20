import { categoryInputSchema } from '@/lib/validation/category.schema';
import { requireAdminApi } from '@/server/auth/guards';
import { assertSameOrigin, jsonOk, readJson, withApi } from '@/server/http';
import { deleteCategory, updateCategory } from '@/server/services/categories.service';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export const PUT = withApi<RouteContext>(async (request, { params }) => {
  assertSameOrigin(request);
  await requireAdminApi();
  const input = categoryInputSchema.parse(await readJson(request));
  return jsonOk(await updateCategory(params.id, input));
});

export const DELETE = withApi<RouteContext>(async (request, { params }) => {
  assertSameOrigin(request);
  await requireAdminApi();
  await deleteCategory(params.id);
  return jsonOk({});
});
