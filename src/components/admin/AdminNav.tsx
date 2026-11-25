'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Navigation du back-office. Deux présentations du même menu (la feuille de style en affiche une seule selon l'écran) :
 * - « side » : menu latéral marron, ordinateur ;
 * - « tabs » : barre flottante en bas, téléphone et tablette.
 */
type Variant = 'side' | 'tabs';

const ICON_PROPS = {
  className: 'admin-nav-icon',
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

const ICONS: Record<string, ReactNode> = {
  dashboard: (
    <svg {...ICON_PROPS}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </svg>
  ),
  orders: (
    <svg {...ICON_PROPS}>
      <path d="M5.5 8h13l1 12.5h-15L5.5 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </svg>
  ),
  customers: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.5 20.5c.6-3.8 3.7-6 7.5-6s6.9 2.2 7.5 6" />
    </svg>
  ),
  products: (
    <svg {...ICON_PROPS}>
      <path d="M3.5 12.2V4.5h7.7l9.3 9.3-7.7 7.7-9.3-9.3Z" />
      <circle cx="7.9" cy="8.9" r="1.1" />
    </svg>
  ),
  delivery: (
    <svg {...ICON_PROPS}>
      <path d="M3 6.5h11v9H3z" />
      <path d="M14 9.5h3.8l3.2 3.2v2.8H14" />
      <circle cx="7.5" cy="17.5" r="1.7" />
      <circle cx="17.5" cy="17.5" r="1.7" />
    </svg>
  ),
  analytics: (
    <svg {...ICON_PROPS}>
      <path d="M4.5 20V11" />
      <path d="M10 20V5" />
      <path d="M15.5 20v-6.5" />
      <path d="M21 20H3" />
    </svg>
  ),
  categories: (
    <svg {...ICON_PROPS}>
      <path d="m12 3.5 8.5 4.6-8.5 4.6-8.5-4.6L12 3.5Z" />
      <path d="m3.5 12.2 8.5 4.6 8.5-4.6" />
      <path d="m3.5 16.3 8.5 4.6 8.5-4.6" />
    </svg>
  ),
};

const ITEMS = [
  { href: '/admin', label: 'Tableau de bord', short: 'Accueil', exact: true, icon: 'dashboard', ownerOnly: false },
  { href: '/admin/commandes', label: 'Commandes', short: 'Commandes', exact: false, icon: 'orders', ownerOnly: false },
  { href: '/admin/clients', label: 'Clients', short: 'Clients', exact: false, icon: 'customers', ownerOnly: false },
  { href: '/admin/produits', label: 'Produits', short: 'Produits', exact: false, icon: 'products', ownerOnly: false },
  { href: '/admin/categories', label: 'Catégories', short: 'Catégories', exact: false, icon: 'categories', ownerOnly: false },
  // Zones, frais et délais : réglages de la boutique, réservés à la propriétaire (comme les paramètres).
  { href: '/admin/livraison', label: 'Livraison', short: 'Livraison', exact: false, icon: 'delivery', ownerOnly: true },
  // Statistiques de visites : réservées à la propriétaire (cahier §7.6).
  { href: '/admin/analytics', label: 'Analytics', short: 'Stats', exact: false, icon: 'analytics', ownerOnly: true },
] as const;

export function AdminNav({ variant = 'side', isOwner = false }: { variant?: Variant; isOwner?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation du back-office" className={`admin-nav admin-nav-${variant}`}>
      <ul>
        {ITEMS.filter((item) => isOwner || !item.ownerOnly).map((item) => {
          const isCurrent = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={isCurrent ? 'page' : undefined}>
                {ICONS[item.icon]}
                <span>{variant === 'tabs' ? item.short : item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
