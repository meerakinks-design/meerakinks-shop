import type { Metadata } from 'next';
import Link from 'next/link';
import { DeliveryBadge, PaymentBadge } from '@/components/admin/OrderBadges';
import { ADMIN_ORDERS_PATH, adminOrderPath } from '@/lib/constants/admin-orders';
import { formatDay } from '@/lib/admin-format';
import { formatFcfa } from '@/lib/money';
import { TODO_LABELS } from '@/lib/shop/order-admin';
import { requireAdminPage } from '@/server/auth/guards';
import { getAdminDashboard } from '@/server/services/orders-admin.service';

export const metadata: Metadata = { title: 'Tableau de bord' };
export const dynamic = 'force-dynamic';

/** Premières lignes de chaque bloc : le reste se trouve dans la liste des commandes. */
const PER_BLOCK = 8;

export default async function AdminDashboardPage() {
  const admin = await requireAdminPage();
  const dashboard = await getAdminDashboard();

  return (
    <main>
      <div className="page-head">
        <h1>Bonjour {admin.name}</h1>
        <Link className="btn btn-quiet" href={ADMIN_ORDERS_PATH}>
          Toutes les commandes
        </Link>
      </div>

      <section aria-label="Aujourd’hui" className="stat-grid">
        <div className={`stat ${dashboard.toProcess > 0 ? 'is-main' : ''}`}>
          <strong>{dashboard.toProcess}</strong>
          <span className="help-text">{dashboard.toProcess > 1 ? 'commandes à traiter' : 'commande à traiter'}</span>
        </div>
        <div className="stat">
          <strong>{dashboard.ordersToday}</strong>
          <span className="help-text">{dashboard.ordersToday > 1 ? 'nouvelles commandes aujourd’hui' : 'nouvelle commande aujourd’hui'}</span>
        </div>
        <div className="stat">
          <strong>{formatFcfa(dashboard.collectedToday)}</strong>
          <span className="help-text">encaissé aujourd’hui</span>
        </div>
        <div className="stat">
          <strong>{formatFcfa(dashboard.collectedMonth)}</strong>
          <span className="help-text">encaissé ce mois-ci</span>
        </div>
      </section>

      <h2>À traiter aujourd’hui</h2>
      {dashboard.groups.length === 0 ? (
        <div className="empty-state">
          <h3>Rien à traiter pour le moment</h3>
          <p>Les nouvelles commandes, les paiements à enregistrer et les livraisons à clôturer apparaîtront ici.</p>
        </div>
      ) : (
        dashboard.groups.map((group) => {
          const { title, hint } = TODO_LABELS[group.todo];
          const shown = group.orders.slice(0, PER_BLOCK);
          return (
            <section key={group.todo} className="todo-block" aria-labelledby={`todo-${group.todo}`}>
              <h3 id={`todo-${group.todo}`}>
                {title} <span className="todo-count">{group.orders.length}</span>
              </h3>
              <p className="help-text">{hint}</p>
              <ul className="order-list">
                {shown.map((order) => (
                  <li key={order.id}>
                    <Link href={adminOrderPath(order.id)} className="order-row">
                      <span className="order-row-head">
                        <strong>{order.customerName}</strong>
                        <span className="help-text">
                          {order.reference} · {formatDay(order.createdAt)}
                        </span>
                      </span>
                      <span className="order-row-meta">
                        <span className="badge-row">
                          <DeliveryBadge status={order.deliveryStatus} />
                          <PaymentBadge status={order.paymentStatus} />
                        </span>
                        <span className="money">{group.todo === 'REFUND' ? `${formatFcfa(order.paid)} à rendre` : order.total === null ? 'Total à confirmer' : formatFcfa(order.total)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {group.orders.length > shown.length && (
                <p className="help-text" style={{ marginTop: 'var(--space-2)' }}>
                  + {group.orders.length - shown.length} autre{group.orders.length - shown.length > 1 ? 's' : ''} : ouvre la liste des commandes.
                </p>
              )}
            </section>
          );
        })
      )}
      {dashboard.truncated && <p className="notice">Beaucoup de commandes sont ouvertes : seules les plus anciennes sont affichées ici. Termine-les pour voir les suivantes.</p>}
    </main>
  );
}
