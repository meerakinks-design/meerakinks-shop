import { ORDERS_EXPORT_CONTENT_TYPES, ORDERS_EXPORT_ROWS_HEADER } from '@/lib/constants/orders-export';
import { parseOrdersExportQuery } from '@/lib/validation/orders-export.schema';
import { requireOwnerApi } from '@/server/auth/guards';
import { withApi } from '@/server/http';
import { exportOrders } from '@/server/services/orders-export.service';

export const dynamic = 'force-dynamic';

/**
 * Export des commandes en Excel ou CSV (cahier P-55, RM-48). Réservé au compte propriétaire ; généré à la demande,
 * jamais stocké ni mis en cache ; chaque export est inscrit au journal (compte, date, filtres, nombre de lignes).
 * Le fichier contient des noms, téléphones et adresses : il sort du système, donc la trace est obligatoire.
 */
export const GET = withApi(async (request) => {
  const admin = await requireOwnerApi();
  const query = parseOrdersExportQuery(new URL(request.url).searchParams);

  const file = await exportOrders({ query, adminUserId: admin.id });
  return new Response(new Uint8Array(file.body), {
    status: 200,
    headers: {
      'Content-Type': ORDERS_EXPORT_CONTENT_TYPES[file.format],
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Cache-Control': 'private, no-store',
      [ORDERS_EXPORT_ROWS_HEADER]: String(file.rows),
    },
  });
});
