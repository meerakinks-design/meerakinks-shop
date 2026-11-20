import type { Prisma } from '@prisma/client';
import { ORDER_REFERENCE_PATTERN } from '@/lib/constants/order';
import { HttpError } from '@/server/http';
import { prisma } from '@/server/db';
import { renderReceiptPdf } from '@/server/integrations/pdf';
import { parseReceiptData } from '@/server/services/receipt.service';

// Tout ce qu'il faut pour produire un document (reçu PDF, emails) à partir d'une commande : lu une seule fois.
const DOCUMENT_SELECT = {
  id: true,
  reference: true,
  customerNote: true,
  deliveryStatus: true,
  paymentStatus: true,
  receipt: { select: { number: true, data: true } },
  payments: { orderBy: { receivedAt: 'asc' }, select: { kind: true, method: true, amount: true, receivedAt: true, voidedAt: true } },
} satisfies Prisma.OrderSelect;
export type OrderDocumentRow = Prisma.OrderGetPayload<{ select: typeof DOCUMENT_SELECT }>;

export async function loadOrderDocument(where: { id: string } | { reference: string }): Promise<OrderDocumentRow | null> {
  return prisma.order.findUnique({ where, select: DOCUMENT_SELECT });
}

export interface RenderedReceipt {
  number: string;
  filename: string;
  bytes: Uint8Array;
}

/** RM-25 : généré à la demande, avec les paiements déjà enregistrés ; « paiement non reçu » tant qu'il n'y en a aucun. */
export async function renderOrderReceipt(order: OrderDocumentRow): Promise<RenderedReceipt> {
  if (!order.receipt) throw new HttpError(404, 'NOT_FOUND', 'Cette commande n’a pas de reçu.');
  let receipt;
  try {
    receipt = parseReceiptData(order.receipt.data);
  } catch {
    // Données figées corrompues : une erreur serveur claire, jamais un « 422 » trompeur ni un document faux.
    throw new HttpError(500, 'INTERNAL_ERROR', 'Les données du reçu sont illisibles.');
  }
  const bytes = await renderReceiptPdf({ number: order.receipt.number, reference: order.reference, receipt, payments: order.payments });
  return { number: order.receipt.number, filename: `${order.receipt.number}.pdf`, bytes };
}

/** Pour le back-office : l'identifiant OU la référence publique de la commande. */
export async function getReceiptPdf(idOrReference: string): Promise<RenderedReceipt> {
  const order = await loadOrderDocument(ORDER_REFERENCE_PATTERN.test(idOrReference) ? { reference: idOrReference } : { id: idOrReference });
  if (!order) throw new HttpError(404, 'NOT_FOUND', 'Commande introuvable.');
  return renderOrderReceipt(order);
}
