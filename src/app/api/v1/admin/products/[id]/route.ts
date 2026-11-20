import { productInputSchema } from '@/lib/validation/product.schema';
import { requireAdminApi } from '@/server/auth/guards';
import { assertSameOrigin, jsonOk, readJson, withApi } from '@/server/http';
import { deleteProduct, updateProduct } from '@/server/services/products.service';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export const PUT = withApi<RouteContext>(async (request, { params }) => {
  assertSameOrigin(request);
  await requireAdminApi();
  const input = productInputSchema.parse(await readJson(request, 50_000));
  return jsonOk(await updateProduct(params.id, input));
});

export const DELETE = withApi<RouteContext>(async (request, { params }) => {
  assertSameOrigin(request);
  await requireAdminApi();
  await deleteProduct(params.id);
  return jsonOk({});
});
