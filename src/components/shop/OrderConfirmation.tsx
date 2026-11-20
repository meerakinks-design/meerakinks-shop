import Link from 'next/link';
import { ORDER_THANKS } from '@/content/livraison';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';
import { formatFcfa } from '@/lib/money';
import type { OrderCreated, OrderRecap } from '@/lib/shop/order-types';
import { OrderNotice, OrderTotals } from './OrderSummary';
import { ReceiptPrinter } from './ReceiptPrinter';

/**
 * Confirmation d'une commande ENREGISTRÉE (§6.4). Le bouton WhatsApp ouvre le message déjà rédigé à partir de la
 * commande en base : le client n'a plus qu'à l'envoyer (action manuelle, RM-36). Aucun paiement n'est présenté comme
 * reçu : seule la vendeuse enregistre un paiement (RM-10).
 */
export function OrderConfirmation({ order, depositAmount, storeName }: { order: OrderCreated; depositAmount: number; storeName?: string }) {
  // Le reçu n'a besoin que du récapitulatif : le lien WhatsApp (nom, téléphone) ne part pas vers le composant client.
  const receipt: OrderRecap = {
    reference: order.reference,
    zoneType: order.zoneType,
    placeLabel: order.placeLabel,
    lines: order.lines,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    upfrontAmount: order.upfrontAmount,
  };
  return (
    <article className="container order-confirmation">
      <p className="eyebrow">Commande enregistrée</p>
      <h1>{ORDER_THANKS}</h1>
      <p>
        Votre référence : <strong className="order-reference">{order.reference}</strong>. Gardez-la, elle vous sera utile pour toute question.
      </p>

      <ReceiptPrinter order={receipt} shopName={storeName} issuedAt={order.createdAt} />

      <section aria-labelledby="order-recap-title" className="order-recap">
        <h2 id="order-recap-title">Récapitulatif</h2>
        <ul className="order-lines">
          {order.lines.map((line, index) => (
            <li key={`${line.name}-${index}`}>
              <span>
                {line.quantity} × {line.name}
              </span>
              <span>{formatFcfa(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <p className="help-text">Livraison : {order.placeLabel}</p>
        <OrderTotals subtotal={order.subtotal} deliveryFee={order.deliveryFee} total={order.total} upfrontAmount={order.upfrontAmount} zoneType={order.zoneType} />
      </section>

      <section aria-labelledby="order-next-title" className="order-next">
        <h2 id="order-next-title">Et maintenant ?</h2>
        {order.whatsappUrl ? (
          <>
            <p>Envoyez votre commande à la vendeuse sur WhatsApp : le message est déjà rédigé, il ne reste qu’à l’envoyer.</p>
            <a className="btn btn-block" href={order.whatsappUrl} target="_blank" rel="noopener noreferrer">
              Envoyer ma commande sur WhatsApp
            </a>
          </>
        ) : (
          <p>L’équipe vous contactera sur WhatsApp, au numéro indiqué dans votre commande.</p>
        )}
        <OrderNotice zoneType={order.zoneType} depositAmount={depositAmount} />
      </section>

      <p>
        <Link className="btn btn-quiet" href={PUBLIC_ROUTES.shop}>
          Continuer mes achats
        </Link>
      </p>
    </article>
  );
}
