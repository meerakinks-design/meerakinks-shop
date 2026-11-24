import { z } from 'zod';
import { paymentTerms } from '@/content/livraison';
import { ZONE_TYPES, type ZoneTypeValue } from '@/lib/constants/order';

// Données FIGÉES du reçu (RM-24) : boutique, client, adresse, lignes, montants et modalités de paiement annoncées.
// Modifier le catalogue ou la fiche client plus tard ne change jamais un ancien reçu. Le PDF (étape 9) est généré à
// la demande à partir de ces données et des paiements enregistrés. Pas d'interface : un `type` reste assignable au
// JSON de Prisma. Le numéro Wave n'y figure pas (RM-08).

export type ReceiptData = {
  version: 1;
  issuedAt: string;
  shop: { name: string; legalName: string | null; address: string | null; contactPhone: string | null; contactEmail: string | null };
  customer: { fullName: string; phone: string; email: string | null };
  delivery: { zoneType: ZoneTypeValue; country: string; city: string; address: string };
  lines: { name: string; unitPrice: number; quantity: number; lineTotal: number }[];
  amounts: { currency: 'XOF'; subtotal: number; deliveryFee: number | null; total: number | null; upfrontAmount: number | null };
  paymentTerms: string;
};

export interface ReceiptInput {
  issuedAt: Date;
  shop: ReceiptData['shop'];
  depositAmount: number;
  customer: ReceiptData['customer'];
  delivery: ReceiptData['delivery'];
  lines: ReceiptData['lines'];
  subtotal: number;
  deliveryFee: number | null;
  total: number | null;
  upfrontAmount: number | null;
}

export function buildReceiptData(input: ReceiptInput): ReceiptData {
  return {
    version: 1,
    issuedAt: input.issuedAt.toISOString(),
    shop: { ...input.shop },
    customer: { ...input.customer },
    delivery: { ...input.delivery },
    lines: input.lines.map((line) => ({ ...line })),
    amounts: {
      currency: 'XOF',
      subtotal: input.subtotal,
      deliveryFee: input.deliveryFee,
      total: input.total,
      upfrontAmount: input.upfrontAmount,
    },
    paymentTerms: paymentTerms(input.delivery.zoneType, input.depositAmount),
  };
}

// Les données figées sont lues depuis une colonne JSON : on les revalide avant de les utiliser (PDF, email). Un reçu
// illisible ne doit jamais produire un document faux.
const money = z.number().int();
// Les reçus déjà enregistrés portent encore « firstName » et « lastName » (avant le champ « Nom complet ») : on les relit
// sans rien modifier en base ; ils deviennent un nom complet à la lecture.
const customerSchema = z.union([
  z.object({ fullName: z.string(), phone: z.string(), email: z.string().nullable() }),
  z
    .object({ firstName: z.string(), lastName: z.string(), phone: z.string(), email: z.string().nullable() })
    .transform(({ firstName, lastName, phone, email }) => ({ fullName: `${firstName} ${lastName}`.trim(), phone, email })),
]);

const receiptDataSchema: z.ZodType<ReceiptData, z.ZodTypeDef, unknown> = z.object({
  version: z.literal(1),
  issuedAt: z.string(),
  shop: z.object({
    name: z.string(),
    legalName: z.string().nullable(),
    address: z.string().nullable(),
    contactPhone: z.string().nullable(),
    contactEmail: z.string().nullable(),
  }),
  customer: customerSchema,
  delivery: z.object({ zoneType: z.enum(ZONE_TYPES), country: z.string(), city: z.string(), address: z.string() }),
  lines: z.array(z.object({ name: z.string(), unitPrice: money, quantity: money, lineTotal: money })),
  amounts: z.object({ currency: z.literal('XOF'), subtotal: money, deliveryFee: money.nullable(), total: money.nullable(), upfrontAmount: money.nullable() }),
  paymentTerms: z.string(),
});

export function parseReceiptData(value: unknown): ReceiptData {
  return receiptDataSchema.parse(value);
}
