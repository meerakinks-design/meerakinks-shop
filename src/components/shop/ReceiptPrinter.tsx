'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RECEIPT_TEXT } from '@/content/receipt';
import { formatFcfa } from '@/lib/money';
import type { OrderRecap } from '@/lib/shop/order-types';
import { clearFreshReceipt, isFreshReceipt } from '@/lib/shop/receipt-flag';
import { buildTicketModel, downloadBlob, receiptFilename, renderReceipt, ticketAltText, type RenderedReceipt } from '@/lib/shop/receipt-ticket';

type Stage = 'processing' | 'printing' | 'complete';

const PROCESSING_MS = 900;
const PRINTING_MS = 1750;

// Téléchargements déjà lancés dans cette page : le mode strict de React exécute les effets deux fois en développement.
const alreadyDownloaded = new Set<string>();

interface ReceiptPrinterProps {
  order: OrderRecap;
  shopName?: string | undefined;
  /** Date d'enregistrement de la commande (ISO) ; à défaut, l'heure de l'appareil. */
  issuedAt?: string | undefined;
}

function SpinnerIcon() {
  return (
    <svg className="spin" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M236,128a108,108,0,0,1-216,0c0-42.52,24.73-81.34,63-98.9A12,12,0,1,1,93,50.91C63.24,64.57,44,94.83,44,128a84,84,0,0,0,168,0c0-33.17-19.24-63.43-49-77.09A12,12,0,1,1,173,29.1C211.27,46.66,236,85.48,236,128Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z" />
    </svg>
  );
}

/**
 * Reçu de commande façon ticket de caisse : l'imprimante « sort » le ticket, qui est aussi téléchargé en PNG.
 * Juste après l'enregistrement de la commande, le téléchargement démarre tout seul, dès que l'image est prête ;
 * ensuite, le bouton permet de le retélécharger. Le reçu ne dit jamais qu'un paiement est reçu (RM-10).
 */
export function ReceiptPrinter({ order, shopName, issuedAt }: ReceiptPrinterProps) {
  const [stage, setStage] = useState<Stage>('processing');
  const [preview, setPreview] = useState<{ url: string; width: number; height: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const rendered = useRef<RenderedReceipt | null>(null);
  const { reference } = order;
  const filename = receiptFilename(reference);

  useEffect(() => {
    let cancelled = false;
    let previewUrl: string | null = null;
    const timers: number[] = [];
    // On lit le drapeau sans l'effacer tout de suite : si l'effet est rejoué (mode strict), le second passage doit pouvoir télécharger.
    const fresh = isFreshReceipt(reference);

    (async () => {
      try {
        const parsed = issuedAt ? new Date(issuedAt) : new Date();
        const issued = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
        const result = await renderReceipt(buildTicketModel(order, { shopName, issuedAt: issued }));
        if (cancelled) return;
        rendered.current = result;
        previewUrl = URL.createObjectURL(result.preview);
        setPreview({ url: previewUrl, width: result.width, height: result.height });

        if (fresh && !alreadyDownloaded.has(reference)) {
          alreadyDownloaded.add(reference);
          clearFreshReceipt(reference);
          downloadBlob(result.download, filename);
          setAutoDownloaded(true);
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          setStage('complete');
          return;
        }
        timers.push(
          window.setTimeout(() => {
            setStage('printing');
            timers.push(window.setTimeout(() => setStage('complete'), PRINTING_MS));
          }, PROCESSING_MS),
        );
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [order, reference, shopName, issuedAt, filename]);

  const handleDownload = useCallback(() => {
    if (rendered.current) downloadBlob(rendered.current.download, filename);
  }, [filename]);

  if (order.lines.length === 0) return null;

  if (failed) {
    return (
      <p className="help-text" role="alert">
        {RECEIPT_TEXT.failed}
      </p>
    );
  }

  const amount = order.total === null ? `${formatFcfa(order.subtotal)} + livraison` : formatFcfa(order.total);

  return (
    <section className="receipt-printer" aria-label={RECEIPT_TEXT.section} data-stage={stage}>
      <div className="printer-machine">
        <div className="printer-screen">
          <div className="printer-header">
            <span className="status-icon-wrap" aria-hidden="true">
              <span className="status-icon working">
                <SpinnerIcon />
              </span>
              <span className="status-icon complete">
                <CheckIcon />
              </span>
            </span>
            <div className="status-text" role="status" aria-live="polite">
              <span key={stage} className="status-label">
                {RECEIPT_TEXT.statuses[stage]}
              </span>
            </div>
          </div>
          <div className="screen-details">
            <span>{reference}</span>
            <strong>{amount}</strong>
          </div>
        </div>
        <div className="printer-slot" aria-hidden="true" />
      </div>

      <div className="printer-output">
        <div className="slot-shadow" aria-hidden="true" />
        <div className="paper-motion-wrapper">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="receipt-paper" src={preview.url} width={preview.width} height={preview.height} alt={ticketAltText(order)} />
          )}
        </div>
      </div>

      <div className="receipt-actions">
        <button type="button" className="btn btn-quiet" onClick={handleDownload} disabled={!preview}>
          {RECEIPT_TEXT.downloadCta}
        </button>
        <p className="help-text">{autoDownloaded ? RECEIPT_TEXT.downloaded : RECEIPT_TEXT.downloadHint}</p>
      </div>
    </section>
  );
}
