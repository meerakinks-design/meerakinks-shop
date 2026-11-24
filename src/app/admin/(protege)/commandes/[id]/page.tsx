import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeliveryFeeForm, InternalNoteForm } from '@/components/admin/OrderSideForms';
import { OrderActions } from '@/components/admin/OrderActions';
import { DeliveryBadge, PaymentBadge } from '@/components/admin/OrderBadges';
import { PaymentPanel, type PaymentLineView } from '@/components/admin/PaymentPanel';
import { formatDateTime } from '@/lib/admin-format';
import { ADMIN_ORDERS_API_PATH, ADMIN_ORDERS_PATH, adminCustomerPath } from '@/lib/constants/admin-orders';
import { ZONE_TYPE_LABELS } from '@/lib/constants/order';
import { DELIVERY_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/constants/order-status';
import { formatFcfa } from '@/lib/money';
import { paymentKindOptions, refundDue } from '@/lib/shop/order-admin';
import { netPaid, remainingToPay } from '@/lib/shop/payments';
import { formatPhoneDisplay } from '@/lib/shop/phone';
import { whatsappLink } from '@/lib/shop/whatsapp';
import { requireAdminPage } from '@/server/auth/guards';
import { getAdminOrder } from '@/server/services/orders-admin.service';

export const metadata: Metadata = { title: 'Commande' };
export const dynamic = 'force-dynamic';

const statusLabel = (kind: 'DELIVERY' | 'PAYMENT', value: string | null): string => {
  if (value === null) return 'Création';
  const labels = (kind === 'DELIVERY' ? DELIVERY_STATUS_LABELS : PAYMENT_STATUS_LABELS) as Record<string, string>;
  return labels[value] ?? value;
};

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  await requireAdminPage();
  const order = await getAdminOrder(params.id);
  if (!order) notFound();

  const paid = netPaid(order.payments);
  const remaining = remainingToPay(order.total, paid);
  const owed = refundDue(order.deliveryStatus, order.payments);
  const kinds = paymentKindOptions({ deliveryStatus: order.deliveryStatus, zoneType: order.zoneType, total: order.total, upfrontAmount: order.upfrontAmount, payments: order.payments });
  const canRecord = order.deliveryStatus !== 'CANCELLED';
  const feeEditable = order.deliveryStatus !== 'DELIVERED' && order.deliveryStatus !== 'CANCELLED';

  const paymentViews: PaymentLineView[] = order.payments.map((payment) => ({
    id: payment.id,
    kind: payment.kind,
    method: payment.method,
    amount: payment.amount,
    receivedAt: payment.receivedAt.toISOString(),
    note: payment.note,
    voidedAt: payment.voidedAt?.toISOString() ?? null,
    voidReason: payment.voidReason,
    recordedBy: payment.recordedBy?.name ?? null,
  }));

  const { customer } = order;
  const whatsapp = customer.anonymizedAt ? null : whatsappLink(customer.phone, `Bonjour ${customer.fullName}, c’est la boutique Meëra Kinks au sujet de votre commande ${order.reference}.`);

  return (
    <main>
      <Link className="back-link" href={ADMIN_ORDERS_PATH}>
        ← Toutes les commandes
      </Link>
      <div className="page-head">
        <div>
          <h1 style={{ marginBottom: 'var(--space-1)' }}>{order.reference}</h1>
          <p className="help-text">
            Reçue le {formatDateTime(order.createdAt)} · {order.source === 'MANUAL' ? 'saisie à la main' : 'passée sur le site'}
          </p>
        </div>
        <div className="badge-row">
          <DeliveryBadge status={order.deliveryStatus} />
          <PaymentBadge status={order.paymentStatus} />
        </div>
      </div>

      {owed > 0 && (
        <p className="notice" role="note">
          Commande annulée : <strong>{formatFcfa(owed)}</strong> déjà encaissés sont à rembourser au client. Enregistre le remboursement dans les paiements.
        </p>
      )}
      {order.total === null && order.deliveryStatus !== 'CANCELLED' && (
        <p className="notice" role="note">
          Le total est « à confirmer » : fixe les frais de livraison pour pouvoir enregistrer le paiement intégral et annoncer le montant au client.
        </p>
      )}

      <div className="stack">
        <OrderActions orderId={order.id} status={order.deliveryStatus} paid={paid} remaining={remaining} />

        <div className="detail-grid">
          <section className="card detail-card" aria-labelledby="client-title">
            <h2 id="client-title">Client</h2>
            {customer.anonymizedAt ? (
              <p className="help-text">Données effacées sur demande du client.</p>
            ) : (
              <dl className="kv">
                <dt>Nom</dt>
                <dd>
                  <Link href={adminCustomerPath(customer.id)}>
                    {customer.fullName}
                  </Link>
                </dd>
                <dt>Téléphone</dt>
                <dd>{formatPhoneDisplay(customer.phone)}</dd>
                {customer.email && (
                  <>
                    <dt>Email</dt>
                    <dd>{customer.email}</dd>
                  </>
                )}
              </dl>
            )}
            {whatsapp && (
              <p style={{ marginBottom: 0, marginTop: 'var(--space-3)' }}>
                <a className="btn btn-quiet" href={whatsapp} target="_blank" rel="noopener noreferrer">
                  Écrire sur WhatsApp
                </a>
              </p>
            )}
          </section>

          <section className="card detail-card" aria-labelledby="delivery-title">
            <h2 id="delivery-title">Livraison</h2>
            <dl className="kv">
              <dt>Zone</dt>
              <dd>{ZONE_TYPE_LABELS[order.zoneType]}</dd>
              <dt>Lieu</dt>
              <dd>{order.shippingCity}{order.shippingCountry ? `, ${order.shippingCountry}` : ''}</dd>
              <dt>Adresse</dt>
              <dd>{order.shippingAddress}</dd>
            </dl>
            {order.customerNote && (
              <p style={{ marginBottom: 0 }}>
                <span className="help-text">Message du client</span>
                <br />
                {order.customerNote}
              </p>
            )}
          </section>

          <section className="card detail-card" aria-labelledby="items-title">
            <h2 id="items-title">Articles</h2>
            <ul className="line-list">
              {order.items.map((item) => (
                <li key={item.id}>
                  <span style={{ minWidth: 0 }}>
                    {item.quantity} × {item.productNameSnapshot}
                    {item.variantLabelSnapshot ? ` (${item.variantLabelSnapshot})` : ''}
                    <br />
                    <span className="help-text">{formatFcfa(item.unitPriceSnapshot)} l’unité</span>
                  </span>
                  <span className="money">{formatFcfa(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            {order.stockRestoredAt && <p className="help-text" style={{ marginTop: 'var(--space-3)', marginBottom: 0 }}>Stock remis en rayon le {formatDateTime(order.stockRestoredAt)}.</p>}
          </section>

          <section className="card detail-card" aria-labelledby="amounts-title">
            <h2 id="amounts-title">Montants</h2>
            <dl className="kv">
              <dt>Sous-total</dt>
              <dd className="money">{formatFcfa(order.subtotal)}</dd>
              <dt>Livraison</dt>
              <dd className="money">{order.deliveryFee === null ? 'À confirmer' : formatFcfa(order.deliveryFee)}</dd>
              <dt className="is-total">Total</dt>
              <dd className="money is-total">{order.total === null ? 'À confirmer' : formatFcfa(order.total)}</dd>
              {order.upfrontAmount !== null && (
                <>
                  <dt>{order.zoneType === 'ABIDJAN' ? 'Acompte demandé' : 'À régler avant envoi'}</dt>
                  <dd className="money">{formatFcfa(order.upfrontAmount)}</dd>
                </>
              )}
            </dl>
            {feeEditable && <DeliveryFeeForm orderId={order.id} subtotal={order.subtotal} currentFee={order.deliveryFee} />}
          </section>

          <section className="card detail-card span-2" aria-labelledby="payments-title">
            <h2 id="payments-title">Paiements</h2>
            <PaymentPanel
              orderId={order.id}
              kinds={kinds}
              payments={paymentViews}
              netPaid={paid}
              remaining={remaining}
              canRecord={canRecord}
              defaultMethod="WAVE"
            />
          </section>

          <section className="card detail-card" aria-labelledby="history-title">
            <h2 id="history-title">Historique</h2>
            <ol className="timeline">
              {order.history.map((entry) => (
                <li key={entry.id}>
                  <strong>
                    {entry.previousValue === null
                      ? entry.kind === 'DELIVERY'
                        ? 'Commande reçue'
                        : `Paiement : ${statusLabel('PAYMENT', entry.newValue)}`
                      : `${entry.kind === 'DELIVERY' ? 'Livraison' : 'Paiement'} : ${statusLabel(entry.kind, entry.previousValue)} → ${statusLabel(entry.kind, entry.newValue)}`}
                  </strong>
                  <br />
                  <span className="help-text">
                    {formatDateTime(entry.createdAt)} · {entry.changedBy?.name ?? 'Client / système'}
                    {entry.note ? ` · ${entry.note}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="card detail-card" aria-labelledby="notes-title">
            <h2 id="notes-title">Note et reçu</h2>
            <InternalNoteForm orderId={order.id} initial={order.internalNote} />
            {order.receipt && (
              <p style={{ marginBottom: 0, marginTop: 'var(--space-3)' }}>
                <a className="btn btn-quiet" href={`${ADMIN_ORDERS_API_PATH}/${encodeURIComponent(order.id)}/receipt`} target="_blank" rel="noopener noreferrer">
                  Voir le reçu ({order.receipt.number})
                </a>
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
