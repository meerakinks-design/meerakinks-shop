import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeliveryBadge, PaymentBadge } from '@/components/admin/OrderBadges';
import { formatDateTime, formatDay } from '@/lib/admin-format';
import { ADMIN_CUSTOMERS_PATH, adminOrderPath } from '@/lib/constants/admin-orders';
import { ADMIN_CUSTOMER_DATA_PATH } from '@/lib/constants/retention';
import { formatFcfa } from '@/lib/money';
import { formatPhoneDisplay } from '@/lib/shop/phone';
import { whatsappLink } from '@/lib/shop/whatsapp';
import { requireAdminPage } from '@/server/auth/guards';
import { getAdminCustomer } from '@/server/services/orders-admin.service';

export const metadata: Metadata = { title: 'Client' };
export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const admin = await requireAdminPage();
  const customer = await getAdminCustomer(params.id);
  if (!customer) notFound();
  const whatsapp = customer.anonymized ? null : whatsappLink(customer.phone);

  return (
    <main>
      <Link className="back-link" href={ADMIN_CUSTOMERS_PATH}>
        ← Tous les clients
      </Link>
      <div className="page-head">
        <h1>{customer.name}</h1>
        <span className="help-text">Client depuis le {formatDay(customer.createdAt)}</span>
      </div>

      <div className="stack">
        <section className="card detail-card" aria-labelledby="contact-title">
          <h2 id="contact-title">Coordonnées</h2>
          {customer.anonymized ? (
            <p className="help-text" style={{ margin: 0 }}>
              Les données personnelles de ce client ont été effacées sur sa demande. Ses commandes sont conservées sans nom ni coordonnées.
            </p>
          ) : (
            <>
              <dl className="kv">
                <dt>Téléphone</dt>
                <dd>{formatPhoneDisplay(customer.phone)}</dd>
                {customer.email && (
                  <>
                    <dt>Email</dt>
                    <dd>{customer.email}</dd>
                  </>
                )}
                <dt>Encaissé au total</dt>
                <dd className="money">{formatFcfa(customer.spent)}</dd>
              </dl>
              <div className="form-actions" style={{ marginTop: 'var(--space-3)' }}>
                {whatsapp && (
                  <a className="btn btn-quiet" href={whatsapp} target="_blank" rel="noopener noreferrer">
                    Écrire sur WhatsApp
                  </a>
                )}
                {admin.role === 'OWNER' && (
                  <Link className="btn-link" href={ADMIN_CUSTOMER_DATA_PATH}>
                    Effacer les données de ce client
                  </Link>
                )}
              </div>
            </>
          )}
        </section>

        <section aria-labelledby="orders-title">
          <h2 id="orders-title">Commandes ({customer.orders.length})</h2>
          <ul className="order-list">
            {customer.orders.map((order) => (
              <li key={order.id}>
                <Link href={adminOrderPath(order.id)} className="order-row">
                  <span className="order-row-head">
                    <strong>{order.reference}</strong>
                    <span className="help-text">{formatDateTime(order.createdAt)}</span>
                  </span>
                  <span className="order-row-meta">
                    <span className="badge-row">
                      <DeliveryBadge status={order.deliveryStatus} />
                      <PaymentBadge status={order.paymentStatus} />
                    </span>
                    <span className="money">{order.total === null ? 'Total à confirmer' : formatFcfa(order.total)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
