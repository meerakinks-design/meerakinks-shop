import type { ZoneTypeValue } from '@/lib/constants/order';
import { DELIVERY_STATUS_LABELS, PAYMENT_STATUS_LABELS, type DeliveryStatusValue, type PaymentStatusValue } from '@/lib/constants/order-status';
import { ORDERS_EXPORT_ZONE_LABELS, type OrdersExportFormat } from '@/lib/constants/orders-export';
import { formatPlaceLabel } from '@/lib/shop/order-types';
import { netPaid, remainingToPay, type PaymentLine } from '@/lib/shop/payments';

// Construction du fichier d'export des commandes (cahier P-55). Fonctions pures : le même tableau sert au CSV et à
// l'Excel, et la protection contre l'injection de formules s'applique à un seul endroit.

/** Heure d'Abidjan = UTC, toute l'année (pas d'heure d'été) : les dates enregistrées en UTC s'y lisent telles quelles. */
const ABIDJAN_TIME_ZONE = 'Africa/Abidjan';
/** Excel compte les jours depuis le 30/12/1899 : 25 569 jours séparent cette date de 1970-01-01. */
const EXCEL_EPOCH_OFFSET_DAYS = 25_569;
const MS_PER_DAY = 86_400_000;

export const CSV_SEPARATOR = ';';
export const CSV_BOM = '﻿';
export const CSV_LINE_BREAK = '\r\n';
/** Séparateur des lignes d'une commande dans une cellule. */
const ITEMS_SEPARATOR = '\n';

/** Un instant, écrit à l'heure d'Abidjan (date Excel en .xlsx, texte « jj/mm/aaaa hh:mm » en CSV). */
export interface ExportDateTime {
  at: Date;
}
/** Texte, nombre entier (FCFA), instant, ou vide. */
export type ExportCell = string | number | null | ExportDateTime;

export const isExportDateTime = (cell: ExportCell): cell is ExportDateTime => typeof cell === 'object' && cell !== null;

/** Colonnes, dans l'ordre du cahier (P-55). `width` en caractères, pour l'Excel. */
export const ORDERS_EXPORT_COLUMNS = [
  { header: 'Référence', width: 14 },
  { header: 'Date et heure (Abidjan)', width: 18 },
  { header: 'Nom', width: 24 },
  { header: 'Téléphone', width: 18 },
  { header: 'Email', width: 28 },
  { header: 'Zone', width: 26 },
  { header: 'Destination', width: 24 },
  { header: 'Adresse', width: 36 },
  { header: 'Lignes', width: 40 },
  { header: 'Sous-total (FCFA)', width: 16 },
  { header: 'Frais de livraison (FCFA)', width: 16 },
  { header: 'Total (FCFA)', width: 14 },
  { header: 'À régler pour confirmer (FCFA)', width: 18 },
  { header: 'Encaissé (FCFA)', width: 14 },
  { header: 'Reste à payer (FCFA)', width: 16 },
  { header: 'Statut de livraison', width: 18 },
  { header: 'Statut de paiement', width: 22 },
  { header: 'Note du client', width: 40 },
] as const;

export interface ExportOrder {
  reference: string;
  createdAt: Date;
  deliveryStatus: DeliveryStatusValue;
  paymentStatus: PaymentStatusValue;
  zoneType: ZoneTypeValue;
  shippingCountry: string;
  shippingCity: string;
  shippingAddress: string;
  customerNote: string | null;
  subtotal: number;
  deliveryFee: number | null;
  total: number | null;
  upfrontAmount: number | null;
  customer: { fullName: string; phone: string; email: string | null };
  items: readonly { productNameSnapshot: string; quantity: number }[];
  payments: readonly PaymentLine[];
}

export interface ExportTable {
  headers: string[];
  rows: ExportCell[][];
}

// ---------- Protection des tableurs ----------

/** Caractères qui font d'une cellule une formule pour Excel, LibreOffice ou Google Sheets (OWASP : CSV injection). */
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'] as const;

/**
 * Une cellule de texte qui commence par `=`, `+`, `-` ou `@` (ou par une tabulation / un retour chariot) peut
 * s'exécuter comme une formule : un nom saisi par un client suffirait. On la préfixe d'une apostrophe (cahier P-55).
 * Les nombres ne passent pas par ici : un montant négatif reste un nombre.
 */
export function neutralizeFormula(text: string): string {
  return FORMULA_TRIGGERS.some((trigger) => text.startsWith(trigger)) ? `'${text}` : text;
}

// ---------- Mise en forme ----------

const dateTimeParts = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ABIDJAN_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** « 20/11/2026 14:30 », à l'heure d'Abidjan. */
export function formatAbidjanDateTime(date: Date): string {
  const parts = Object.fromEntries(dateTimeParts.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

/** Date Excel (jours, avec fraction) de l'heure d'Abidjan : la même valeur que l'UTC. Arrondie à la minute, comme l'affichage. */
export function toExcelSerial(date: Date): number {
  const minute = Math.floor(date.getTime() / 60_000) * 60_000;
  return minute / MS_PER_DAY + EXCEL_EPOCH_OFFSET_DAYS;
}

/** AAAA-MM-JJ à Abidjan : sert au nom du fichier. */
export function abidjanDateStamp(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: ABIDJAN_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function exportFilename(format: OrdersExportFormat, now: Date): string {
  return `commandes-${abidjanDateStamp(now)}.${format}`;
}

// ---------- Tableau ----------

/** Lignes d'une commande : « produit × quantité » (sans variantes ; avec variantes ce sera « produit — option × quantité »). */
export function formatOrderLines(items: ExportOrder['items']): string {
  return items.map((item) => `${item.productNameSnapshot} × ${item.quantity}`).join(ITEMS_SEPARATOR);
}

const text = (value: string): string => neutralizeFormula(value);

export function buildExportRow(order: ExportOrder): ExportCell[] {
  const paid = netPaid(order.payments);
  return [
    text(order.reference),
    { at: order.createdAt },
    text(order.customer.fullName.trim()),
    text(order.customer.phone),
    text(order.customer.email ?? ''),
    ORDERS_EXPORT_ZONE_LABELS[order.zoneType],
    text(formatPlaceLabel(order.zoneType, order.shippingCity, order.shippingCountry)),
    text(order.shippingAddress),
    text(formatOrderLines(order.items)),
    order.subtotal,
    order.deliveryFee,
    order.total,
    order.upfrontAmount,
    paid,
    remainingToPay(order.total, paid),
    DELIVERY_STATUS_LABELS[order.deliveryStatus],
    PAYMENT_STATUS_LABELS[order.paymentStatus],
    text(order.customerNote ?? ''),
  ];
}

export function buildExportTable(orders: readonly ExportOrder[]): ExportTable {
  return { headers: ORDERS_EXPORT_COLUMNS.map((column) => column.header), rows: orders.map(buildExportRow) };
}

// ---------- CSV ----------

function csvField(cell: ExportCell): string {
  if (cell === null) return '';
  const raw = typeof cell === 'number' ? String(cell) : isExportDateTime(cell) ? formatAbidjanDateTime(cell.at) : cell;
  return /[;"\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

/** CSV pour Excel en français : UTF-8 avec BOM, séparateur « ; », fins de ligne CRLF (cahier P-55). */
export function toCsv(table: ExportTable): string {
  const lines = [table.headers, ...table.rows].map((row) => row.map(csvField).join(CSV_SEPARATOR));
  return `${CSV_BOM}${lines.join(CSV_LINE_BREAK)}${CSV_LINE_BREAK}`;
}
