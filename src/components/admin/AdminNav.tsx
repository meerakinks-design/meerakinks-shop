'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Navigation du back-office. Deux présentations du même menu (la feuille de style en affiche une seule selon l'écran) :
 * - « side » : barre latérale (ordinateur, ≥ 900 px), entrées regroupées sous de petits titres, repliable en rail d'icônes ;
 * - « tabs » : barre flottante en bas (téléphone et tablette) : une seule rangée, icônes seules sur petit écran.
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
  settings: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 3.2v2.1M12 18.7v2.1M3.2 12h2.1M18.7 12h2.1M5.8 5.8l1.5 1.5M16.7 16.7l1.5 1.5M18.2 5.8l-1.5 1.5M7.3 16.7l-1.5 1.5" />
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

/** `group` : petit titre affiché au-dessus de la première entrée de chaque groupe dans la barre latérale. */
const ITEMS = [
  { href: '/admin', label: 'Tableau de bord', short: 'Accueil', exact: true, icon: 'dashboard', ownerOnly: false, group: 'Ventes' },
  { href: '/admin/commandes', label: 'Commandes', short: 'Commandes', exact: false, icon: 'orders', ownerOnly: false, group: 'Ventes' },
  { href: '/admin/clients', label: 'Clients', short: 'Clients', exact: false, icon: 'customers', ownerOnly: false, group: 'Ventes' },
  { href: '/admin/produits', label: 'Produits', short: 'Produits', exact: false, icon: 'products', ownerOnly: false, group: 'Catalogue' },
  { href: '/admin/categories', label: 'Catégories', short: 'Catégories', exact: false, icon: 'categories', ownerOnly: false, group: 'Catalogue' },
  // Zones, frais, délais et paramètres : réglages de la boutique, réservés à la propriétaire.
  { href: '/admin/livraison', label: 'Livraison', short: 'Livraison', exact: false, icon: 'delivery', ownerOnly: true, group: 'Boutique' },
  { href: '/admin/parametres', label: 'Paramètres', short: 'Réglages', exact: false, icon: 'settings', ownerOnly: true, group: 'Boutique' },
  // Statistiques de visites : réservées à la propriétaire (cahier §7.6).
  { href: '/admin/analytics', label: 'Analytics', short: 'Stats', exact: false, icon: 'analytics', ownerOnly: true, group: 'Boutique' },
] as const;

export function AdminNav({ variant = 'side', isOwner = false }: { variant?: Variant; isOwner?: boolean }) {
  const pathname = usePathname();
  const items = ITEMS.filter((item) => isOwner || !item.ownerOnly);
  return (
    <nav aria-label="Navigation du back-office" className={`admin-nav admin-nav-${variant}`}>
      <ul style={variant === 'tabs' ? ({ '--tabs-count': items.length } as CSSProperties) : undefined}>
        {items.map((item, index) => {
          const isCurrent = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const startsGroup = variant === 'side' && items[index - 1]?.group !== item.group;
          return (
            <li key={item.href}>
              {startsGroup && (
                <span className="admin-nav-group" aria-hidden="true">
                  {item.group}
                </span>
              )}
              {/* Sur petit écran la barre du bas n'affiche que les icônes : le nom complet reste lu et visible au survol. */}
              <Link href={item.href} aria-current={isCurrent ? 'page' : undefined} aria-label={item.label} title={item.label}>
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
