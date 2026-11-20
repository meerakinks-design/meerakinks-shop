import { productInputSchema } from '@/lib/validation/product.schema';
import { requireAdminApi } from '@/server/auth/guards';
import { assertSameOrigin, jsonOk, readJson, withApi } from '@/server/http';
import { createProduct } from '@/server/services/products.service';

export const dynamic = 'force-dynamic';

export const POST = withApi(async (request) => {
  assertSameOrigin(request);
  await requireAdminApi();
  const input = productInputSchema.parse(await readJson(request, 50_000));
  return jsonOk(await createProduct(input), 201);
});
