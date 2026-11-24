import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/admin/EmptyState';
import { Pagination } from '@/components/admin/Pagination';
import { formatDay } from '@/lib/admin-format';
import { ADMIN_CUSTOMERS_PATH, adminCustomerPath } from '@/lib/constants/admin-orders';
import { formatFcfa } from '@/lib/money';
import { formatPhoneDisplay } from '@/lib/shop/phone';
import { requireAdminPage } from '@/server/auth/guards';
import { listAdminCustomers } from '@/server/services/orders-admin.service';

export const metadata: Metadata = { title: 'Clients' };
export const dynamic = 'force-dynamic';

interface CustomersPageProps {
  searchParams: { q?: string | string[]; page?: string | string[] };
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  await requireAdminPage();
  const q = typeof searchParams.q === 'string' ? searchParams.q.trim().slice(0, 80) : '';
  const rawPage = Number(typeof searchParams.page === 'string' ? searchParams.page : 1);
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 10_000 ? rawPage : 1;
  const result = await listAdminCustomers({ q, page });

  return (
    <main>
      <div className="page-head">
        <h1>Clients</h1>
        <span className="help-text">
          {result.total} client{result.total > 1 ? 's' : ''}
        </span>
      </div>

      <div className="toolbar">
        <span />
        <form action={ADMIN_CUSTOMERS_PATH} method="get" role="search" className="search-form">
          <label className="visually-hidden" htmlFor="q">
            Rechercher un client
          </label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Nom, téléphone, email" maxLength={80} />
          <button className="btn btn-quiet" type="submit">
            Chercher
          </button>
        </form>
      </div>

      {result.rows.length === 0 ? (
        q ? (
          <EmptyState title="Aucun client ne correspond" description="Essaie un autre nom ou un autre numéro." action={{ href: ADMIN_CUSTOMERS_PATH, label: 'Voir tous les clients' }} />
        ) : (
          <EmptyState title="Aucun client pour le moment" description="Un client est enregistré dès sa première commande." />
        )
      ) : (
        <ul className="order-list">
          {result.rows.map((customer) => (
            <li key={customer.id}>
              <Link href={adminCustomerPath(customer.id)} className="order-row">
                <span className="order-row-head">
                  <strong>{customer.name}</strong>
                  {!customer.anonymized && <span className="help-text">{formatPhoneDisplay(customer.phone)}</span>}
                </span>
                <span className="order-row-meta">
                  <span className="help-text">
                    {customer.orderCount} commande{customer.orderCount > 1 ? 's' : ''}
                    {customer.lastOrderAt ? ` · dernière le ${formatDay(customer.lastOrderAt)}` : ''}
                  </span>
                  <span className="money">{formatFcfa(customer.spent)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination basePath={ADMIN_CUSTOMERS_PATH} params={{ q: q || undefined }} page={result.page} pageCount={result.pageCount} />
    </main>
  );
}
