import {
  ORDER_NOTICE_CONFIRMATION_INTRO,
  ORDER_NOTICE_CONFIRMATION_STEPS,
  ORDER_NOTICE_OUTSIDE,
  ORDER_NOTICE_TITLE,
  orderNoticeAbidjan,
} from '@/content/livraison';
import { upfrontLabel } from '@/content/receipt';
import type { ZoneTypeValue } from '@/lib/constants/order';
import { formatFcfa } from '@/lib/money';

interface OrderTotalsProps {
  subtotal: number;
  deliveryFee: number | null;
  total: number | null;
  upfrontAmount: number | null;
  zoneType: ZoneTypeValue;
  /** Formulaire : estimation. Confirmation : montants enregistrés. */
  estimated?: boolean;
}

/** Sous-total, frais, total et montant à régler. Frais inconnus : « à confirmer », jamais un chiffre inventé (RM-03). */
export function OrderTotals({ subtotal, deliveryFee, total, upfrontAmount, zoneType, estimated = false }: OrderTotalsProps) {
  return (
    <dl className="order-totals">
      <div>
        <dt>Sous-total</dt>
        <dd>{formatFcfa(subtotal)}</dd>
      </div>
      <div>
        <dt>Frais de livraison</dt>
        <dd>{deliveryFee === null ? 'à confirmer' : formatFcfa(deliveryFee)}</dd>
      </div>
      <div className="order-totals-main">
        <dt>{estimated ? 'Total estimé' : 'Total'}</dt>
        <dd>{total === null ? 'à confirmer' : formatFcfa(total)}</dd>
      </div>
      <div>
        <dt>{upfrontLabel(zoneType)}</dt>
        <dd>{upfrontAmount === null ? 'montant confirmé par la vendeuse' : formatFcfa(upfrontAmount)}</dd>
      </div>
    </dl>
  );
}

/** Note d'information sur le paiement et la livraison, visible AVANT la validation (RM-11) : texte validé, annexe B. */
export function OrderNotice({ zoneType, depositAmount }: { zoneType: ZoneTypeValue; depositAmount: number }) {
  return (
    <section className="order-notice" aria-label={ORDER_NOTICE_TITLE}>
      <h3>{ORDER_NOTICE_TITLE}</h3>
      <p>{zoneType === 'ABIDJAN' ? orderNoticeAbidjan(depositAmount) : ORDER_NOTICE_OUTSIDE}</p>
      <p>{ORDER_NOTICE_CONFIRMATION_INTRO}</p>
      <ul>
        {ORDER_NOTICE_CONFIRMATION_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
    </section>
  );
}
