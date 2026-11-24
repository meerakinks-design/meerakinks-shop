import type { Metadata } from 'next';
import Link from 'next/link';
import { DeliveryBadge, PaymentBadge } from '@/components/admin/OrderBadges';
import { EmptyState } from '@/components/admin/EmptyState';
import { Pagination } from '@/components/admin/Pagination';
import { formatDateTime } from '@/lib/admin-format';
import { ADMIN_ORDERS_PATH, adminOrderPath, ORDER_DELIVERY_FILTERS, ORDER_PAYMENT_FILTERS, type OrderDeliveryFilterKey, type OrderPaymentFilterKey } from '@/lib/constants/admin-orders';
import { DELIVERY_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/constants/order-status';
import { ZONE_TYPE_LABELS } from '@/lib/constants/order';
import { formatFcfa } from '@/lib/money';
import { parseOrderListQuery } from '@/lib/validation/order-admin.schema';
import { requireAdminPage } from '@/server/auth/guards';
import { listAdminOrders } from '@/server/services/orders-admin.service';

export const metadata: Metadata = { title: 'Commandes' };
export const dynamic = 'force-dynamic';

const DELIVERY_FILTER_LABELS: Record<OrderDeliveryFilterKey, string> = {
  'a-confirmer': DELIVERY_STATUS_LABELS.PENDING,
  confirmees: DELIVERY_STATUS_LABELS.CONFIRMED,
  'en-preparation': DELIVERY_STATUS_LABELS.PREPARING,
  'en-livraison': DELIVERY_STATUS_LABELS.SHIPPED,
  livrees: DELIVERY_STATUS_LABELS.DELIVERED,
  annulees: DELIVERY_STATUS_LABELS.CANCELLED,
};

const PAYMENT_FILTER_LABELS: Record<OrderPaymentFilterKey, string> = {
  'a-encaisser': 'À encaisser',
  'acompte-recu': PAYMENT_STATUS_LABELS.DEPOSIT_PAID,
  partiel: PAYMENT_STATUS_LABELS.PARTIALLY_PAID,
  paye: PAYMENT_STATUS_LABELS.PAID,
  rembourse: PAYMENT_STATUS_LABELS.REFUNDED,
};

interface OrdersPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  await requireAdminPage();
  const query = parseOrderListQuery(searchParams);
  const result = await listAdminOrders(query);
  const hasFilter = Boolean(query.deliveryKey || query.paymentKey || query.q);

  const params = { statut: query.deliveryKey, paiement: query.paymentKey, q: query.q || undefined };
  const link = (overrides: Partial<typeof params>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, ...overrides })) if (value) search.set(key, value);
    const text = search.toString();
    return text ? `${ADMIN_ORDERS_PATH}?${text}` : ADMIN_ORDERS_PATH;
  };

  return (
    <main>
      <div className="page-head">
        <h1>Commandes</h1>
        <span className="help-text">
          {result.total} commande{result.total > 1 ? 's' : ''}
          {hasFilter ? ' correspondante' + (result.total > 1 ? 's' : '') : ''}
        </span>
      </div>

      <div className="toolbar">
        <nav aria-label="Filtrer par livraison" className="filter-links">
          <Link href={link({ statut: undefined })} aria-current={query.deliveryKey ? undefined : 'page'}>
            Toutes
          </Link>
          {(Object.keys(ORDER_DELIVERY_FILTERS) as OrderDeliveryFilterKey[]).map((key) => (
            <Link key={key} href={link({ statut: key })} aria-current={query.deliveryKey === key ? 'page' : undefined}>
              {DELIVERY_FILTER_LABELS[key]}
            </Link>
          ))}
        </nav>
      </div>
      <div className="toolbar">
        <nav aria-label="Filtrer par paiement" className="filter-links">
          <Link href={link({ paiement: undefined })} aria-current={query.paymentKey ? undefined : 'page'}>
            Tous les paiements
          </Link>
          {(Object.keys(ORDER_PAYMENT_FILTERS) as OrderPaymentFilterKey[]).map((key) => (
            <Link key={key} href={link({ paiement: key })} aria-current={query.paymentKey === key ? 'page' : undefined}>
              {PAYMENT_FILTER_LABELS[key]}
            </Link>
          ))}
        </nav>
        <form action={ADMIN_ORDERS_PATH} method="get" role="search" className="search-form">
          {query.deliveryKey && <input type="hidden" name="statut" value={query.deliveryKey} />}
          {query.paymentKey && <input type="hidden" name="paiement" value={query.paymentKey} />}
          <label className="visually-hidden" htmlFor="q">
            Rechercher une commande
          </label>
          <input id="q" name="q" type="search" defaultValue={query.q} placeholder="Référence, nom, téléphone" maxLength={80} />
          <button className="btn btn-quiet" type="submit">
            Chercher
          </button>
        </form>
      </div>

      {result.rows.length === 0 ? (
        hasFilter ? (
          <EmptyState title="Aucune commande ne correspond" description="Essaie un autre mot ou retire un filtre." action={{ href: ADMIN_ORDERS_PATH, label: 'Voir toutes les commandes' }} />
        ) : (
          <EmptyState title="Aucune commande pour le moment" description="Les commandes passées sur la boutique apparaîtront ici, les plus récentes en premier." />
        )
      ) : (
        <ul className="order-list">
          {result.rows.map((order) => (
            <li key={order.id}>
              <Link href={adminOrderPath(order.id)} className="order-row">
                <span className="order-row-head">
                  <strong>{order.customerName}</strong>
                  <span className="help-text">
                    {order.reference} · {formatDateTime(order.createdAt)}
                  </span>
                </span>
                <span className="order-row-meta">
                  <span className="badge-row">
                    <DeliveryBadge status={order.deliveryStatus} />
                    <PaymentBadge status={order.paymentStatus} />
                  </span>
                  <span className="money">{order.total === null ? 'Total à confirmer' : formatFcfa(order.total)}</span>
                </span>
                <span className="help-text">
                  {order.itemCount} article{order.itemCount > 1 ? 's' : ''} · {ZONE_TYPE_LABELS[order.zoneType]}
                  {order.paid > 0 ? ` · encaissé ${formatFcfa(order.paid)}` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination basePath={ADMIN_ORDERS_PATH} params={params} page={result.page} pageCount={result.pageCount} />
    </main>
  );
}
