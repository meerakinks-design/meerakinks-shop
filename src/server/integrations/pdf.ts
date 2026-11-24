import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS, type PaymentKindValue, type PaymentMethodValue } from '@/lib/constants/payment';
import { formatFcfa } from '@/lib/money';
import { formatPlaceLabel } from '@/lib/shop/order-types';
import { netPaid, remainingToPay } from '@/lib/shop/payments';
import { formatPhoneDisplay } from '@/lib/shop/phone';
import type { ReceiptData } from '@/server/services/receipt.service';

// Reçu de commande en PDF (RM-24, RM-25). Généré à la demande à partir des données FIGÉES du reçu et des paiements
// déjà enregistrés ; jamais stocké. pdf-lib est du JavaScript pur : rien à installer sur Vercel, aucun fichier de police.
// Les polices standard (Helvetica) ne connaissent que le latin occidental : tout autre caractère est remplacé, jamais
// laissé faire échouer le document.

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const FOOTER_SPACE = 44;
const INK = rgb(0.137, 0.122, 0.11);
const MUTED = rgb(0.42, 0.38, 0.36);
const RULE = rgb(0.86, 0.83, 0.79);
const RIGHT_EDGE = PAGE_WIDTH - MARGIN;
const COLUMNS = { quantity: 330, unitPrice: 430, total: RIGHT_EDGE } as const; // bords droits
const DESIGNATION_WIDTH = 245;
export const RECEIPT_NOT_AN_INVOICE = 'Reçu de commande — ne constitue pas une facture.';
export const NO_PAYMENT_MENTION = 'Paiement non reçu';

export interface ReceiptPdfPayment {
  kind: PaymentKindValue;
  method: PaymentMethodValue;
  amount: number;
  receivedAt: Date;
  voidedAt: Date | null;
}

export interface ReceiptPdfInput {
  number: string;
  reference: string;
  receipt: ReceiptData;
  payments: readonly ReceiptPdfPayment[];
}

const COMBINING_MARKS = /[\u0300-\u036f]/g;

/** Remplace ce que la police ne sait pas écrire : espaces fines → espace, accents rares → lettre simple, reste → « ? ». */
export function toPdfText(text: string, supported: ReadonlySet<number>): string {
  let result = '';
  for (const char of text.replace(/[\u202f\u2009\u2007]/g, ' ').replace(/[\r\n\t]+/g, ' ')) {
    const code = char.codePointAt(0) as number;
    if (supported.has(code)) {
      result += char;
      continue;
    }
    const base = char.normalize('NFD').replace(COMBINING_MARKS, '');
    const usable = base.length > 0 && [...base].every((part) => supported.has(part.codePointAt(0) as number));
    result += usable ? base : '?';
  }
  return result;
}

const formatDate = (date: Date | string): string =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Abidjan' }).format(new Date(date));

class PdfWriter {
  private page: PDFPage;
  private y = 0;
  private readonly supported: Set<number>;

  constructor(
    private readonly doc: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
    private readonly continuationTitle: string,
  ) {
    this.supported = new Set(regular.getCharacterSet());
    this.page = this.addPage();
  }

  private addPage(): PDFPage {
    const page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
    return page;
  }

  private font(bold: boolean): PDFFont {
    return bold ? this.bold : this.regular;
  }

  /** Garantit la place pour `height` points ; sinon nouvelle page avec un rappel du numéro de reçu. */
  ensure(height: number): void {
    if (this.y - height >= MARGIN + FOOTER_SPACE) return;
    this.page = this.addPage();
    this.write(this.continuationTitle, { size: 9, color: MUTED });
    this.gap(6);
  }

  gap(points: number): void {
    this.y -= points;
  }

  rule(): void {
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: RIGHT_EDGE, y: this.y }, thickness: 0.6, color: RULE });
    this.gap(10);
  }

  /** Écrit une ligne ; `align: 'right'` prend `x` comme bord droit. Ne change pas de ligne. */
  private draw(text: string, options: { x: number; size: number; bold?: boolean; color?: ReturnType<typeof rgb>; align?: 'left' | 'right' }): void {
    const font = this.font(options.bold ?? false);
    const safe = toPdfText(text, this.supported);
    const x = options.align === 'right' ? options.x - font.widthOfTextAtSize(safe, options.size) : options.x;
    this.page.drawText(safe, { x, y: this.y - options.size, size: options.size, font, color: options.color ?? INK });
  }

  /** Une ligne de texte, puis on descend. */
  write(text: string, options: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number; align?: 'left' | 'right' } = {}): void {
    const size = options.size ?? 10;
    this.ensure(size * 1.5);
    this.draw(text, { x: options.x ?? MARGIN, size, ...(options.bold !== undefined ? { bold: options.bold } : {}), ...(options.color ? { color: options.color } : {}), ...(options.align ? { align: options.align } : {}) });
    this.gap(size * 1.5);
  }

  private wrap(text: string, width: number, size: number, bold: boolean): string[] {
    const font = this.font(bold);
    const lines: string[] = [];
    for (const paragraph of text.split('\n')) {
      let current = '';
      for (const word of toPdfText(paragraph, this.supported).split(' ').filter(Boolean)) {
        // Un mot plus long que la ligne (adresse sans espace) est coupé plutôt que de déborder.
        const pieces = font.widthOfTextAtSize(word, size) > width ? word.match(new RegExp(`.{1,${Math.max(8, Math.floor(width / (size * 0.55)))}}`, 'g')) ?? [word] : [word];
        for (const piece of pieces) {
          const candidate = current ? `${current} ${piece}` : piece;
          if (font.widthOfTextAtSize(candidate, size) <= width || !current) {
            current = candidate;
          } else {
            lines.push(current);
            current = piece;
          }
        }
      }
      lines.push(current);
    }
    return lines;
  }

  paragraph(text: string, options: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; width?: number } = {}): void {
    const size = options.size ?? 10;
    for (const line of this.wrap(text, options.width ?? RIGHT_EDGE - MARGIN, size, options.bold ?? false)) {
      this.write(line, { size, ...(options.bold !== undefined ? { bold: options.bold } : {}), ...(options.color ? { color: options.color } : {}) });
    }
  }

  heading(text: string): void {
    this.gap(8);
    this.ensure(34);
    this.write(text.toUpperCase(), { size: 8.5, bold: true, color: MUTED });
  }

  /** Ligne de tableau : désignation à gauche (peut passer à la ligne), montants alignés à droite. */
  tableRow(cells: { designation: string; quantity?: string; unitPrice?: string; total?: string }, options: { bold?: boolean; size?: number } = {}): void {
    const size = options.size ?? 10;
    const bold = options.bold ?? false;
    const lines = this.wrap(cells.designation, DESIGNATION_WIDTH, size, bold);
    this.ensure(lines.length * size * 1.5 + 4);
    lines.forEach((line, index) => {
      this.draw(line, { x: MARGIN, size, bold });
      if (index === 0) {
        if (cells.quantity !== undefined) this.draw(cells.quantity, { x: COLUMNS.quantity, size, bold, align: 'right' });
        if (cells.unitPrice !== undefined) this.draw(cells.unitPrice, { x: COLUMNS.unitPrice, size, bold, align: 'right' });
        if (cells.total !== undefined) this.draw(cells.total, { x: COLUMNS.total, size, bold, align: 'right' });
      }
      this.gap(size * 1.5);
    });
    this.gap(2);
  }

  /** Libellé et montant alignés à droite (totaux). */
  amountLine(label: string, value: string, options: { bold?: boolean } = {}): void {
    const size = 10;
    this.ensure(size * 1.6);
    this.draw(label, { x: COLUMNS.unitPrice, size, bold: options.bold ?? false, align: 'right' });
    this.draw(value, { x: COLUMNS.total, size, bold: options.bold ?? false, align: 'right' });
    this.gap(size * 1.6);
  }

  /** Pied de chaque page : mention légale prudente et numéro de page. */
  finish(): void {
    const pages = this.doc.getPages();
    pages.forEach((page, index) => {
      const y = MARGIN - 6;
      page.drawLine({ start: { x: MARGIN, y: y + 14 }, end: { x: RIGHT_EDGE, y: y + 14 }, thickness: 0.6, color: RULE });
      page.drawText(toPdfText(RECEIPT_NOT_AN_INVOICE, this.supported), { x: MARGIN, y, size: 8, font: this.regular, color: MUTED });
      const label = toPdfText(`Page ${index + 1}/${pages.length}`, this.supported);
      page.drawText(label, { x: RIGHT_EDGE - this.regular.widthOfTextAtSize(label, 8), y, size: 8, font: this.regular, color: MUTED });
    });
  }
}

/** Reçu de commande : boutique, client, livraison, articles, montants, modalités, paiements enregistrés. */
export async function renderReceiptPdf(input: ReceiptPdfInput): Promise<Uint8Array> {
  const { receipt } = input;
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const issuedAt = new Date(receipt.issuedAt);
  doc.setTitle(`Reçu ${input.number}`);
  doc.setProducer(receipt.shop.name);
  doc.setCreator(receipt.shop.name);
  doc.setCreationDate(issuedAt);
  doc.setModificationDate(issuedAt);

  const writer = new PdfWriter(doc, regular, bold, `Reçu ${input.number} — commande ${input.reference} (suite)`);

  // En-tête : la boutique, puis le document.
  writer.write(receipt.shop.name, { size: 18, bold: true });
  for (const line of [receipt.shop.legalName && receipt.shop.legalName !== receipt.shop.name ? receipt.shop.legalName : null, receipt.shop.address, receipt.shop.contactPhone, receipt.shop.contactEmail]) {
    if (line) writer.write(line, { size: 9, color: MUTED });
  }
  writer.gap(14);
  writer.write('Reçu de commande', { size: 15, bold: true });
  writer.write(`Reçu n° ${input.number}  ·  Commande ${input.reference}  ·  Émis le ${formatDate(issuedAt)}`, { size: 9, color: MUTED });
  writer.gap(4);
  writer.rule();

  writer.heading('Client');
  writer.write(receipt.customer.fullName, { bold: true });
  writer.write(formatPhoneDisplay(receipt.customer.phone));
  if (receipt.customer.email) writer.write(receipt.customer.email);

  writer.heading('Livraison');
  writer.write(formatPlaceLabel(receipt.delivery.zoneType, receipt.delivery.city, receipt.delivery.country), { bold: true });
  writer.paragraph(receipt.delivery.address);

  writer.heading('Articles');
  writer.tableRow({ designation: 'Désignation', quantity: 'Qté', unitPrice: 'Prix unitaire', total: 'Total' }, { bold: true, size: 9 });
  writer.rule();
  for (const line of receipt.lines) {
    writer.tableRow({ designation: line.name, quantity: String(line.quantity), unitPrice: formatFcfa(line.unitPrice), total: formatFcfa(line.lineTotal) });
  }
  writer.rule();
  const { amounts } = receipt;
  writer.amountLine('Sous-total', formatFcfa(amounts.subtotal));
  writer.amountLine('Frais de livraison', amounts.deliveryFee === null ? 'à confirmer' : formatFcfa(amounts.deliveryFee));
  writer.amountLine('Total', amounts.total === null ? 'à confirmer' : formatFcfa(amounts.total), { bold: true });

  writer.heading('Modalités de paiement annoncées');
  writer.paragraph(receipt.paymentTerms);

  writer.heading('Paiements enregistrés');
  const valid = input.payments.filter((payment) => !payment.voidedAt).sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
  if (valid.length === 0) {
    writer.write(NO_PAYMENT_MENTION, { bold: true });
  } else {
    for (const payment of valid) {
      // Tiret simple : le signe moins typographique (U+2212) n'existe pas dans la police standard du PDF.
      const sign = payment.kind === 'REFUND' ? '- ' : '';
      writer.tableRow({
        designation: `${formatDate(payment.receivedAt)} — ${PAYMENT_KIND_LABELS[payment.kind]} (${PAYMENT_METHOD_LABELS[payment.method]})`,
        total: `${sign}${formatFcfa(payment.amount)}`,
      });
    }
    writer.rule();
    const paid = netPaid(valid);
    const remaining = remainingToPay(amounts.total, paid);
    writer.amountLine('Total encaissé', formatFcfa(paid), { bold: true });
    writer.amountLine('Reste à payer', remaining === null ? 'à confirmer' : formatFcfa(remaining));
  }

  writer.finish();
  return doc.save();
}
