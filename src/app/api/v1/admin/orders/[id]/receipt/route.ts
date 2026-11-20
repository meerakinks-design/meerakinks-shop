import { requireAdminApi } from '@/server/auth/guards';
import { withApi } from '@/server/http';
import { getReceiptPdf } from '@/server/services/receipt-pdf.service';

export const dynamic = 'force-dynamic';

/**
 * Reçu PDF d'une commande, généré à la demande (RM-25). `[id]` : identifiant de la commande ou référence publique
 * (CMD-…). Réservé aux comptes du back-office ; jamais mis en cache.
 */
export const GET = withApi(async (_request, context: { params: { id: string } }) => {
  await requireAdminApi();
  const receipt = await getReceiptPdf(context.params.id);
  return new Response(new Uint8Array(receipt.bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${receipt.filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
