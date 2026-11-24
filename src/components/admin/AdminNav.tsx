'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/admin', label: 'Tableau de bord', exact: true },
  { href: '/admin/commandes', label: 'Commandes', exact: false },
  { href: '/admin/clients', label: 'Clients', exact: false },
  { href: '/admin/produits', label: 'Produits', exact: false },
  { href: '/admin/categories', label: 'Catégories', exact: false },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation du back-office" className="admin-nav">
      {ITEMS.map((item) => {
        const isCurrent = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={isCurrent ? 'page' : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
