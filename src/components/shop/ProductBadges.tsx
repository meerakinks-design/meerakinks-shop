import { PRODUCT_BADGES, type ProductBadgeIcon } from '@/content/product-page';

const ICONS: Record<ProductBadgeIcon, string[]> = {
  whatsapp: ['M4 20l1.3-4.2A8 8 0 1 1 8.4 19L4 20Z', 'M9.2 9.3c.3 2 2 3.8 4 4.4l1.3-1.2-1.7-1-.7.6c-.7-.3-1.2-.9-1.5-1.5l.6-.8-.9-1.6-1.1 1.1Z'],
  wallet: ['M4 7.5A2.5 2.5 0 0 1 6.5 5H17v3', 'M4 7.5V17a2 2 0 0 0 2 2h12.5a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5Z', 'M15.5 13.5h.01'],
  delivery: ['M3 7h11v9H3z', 'M14 10h4l3 3v3h-7', 'M7 19a1.5 1.5 0 1 0 0-.01', 'M17 19a1.5 1.5 0 1 0 0-.01'],
  receipt: ['M6 3h12v18l-3-2-3 2-3-2-3 2V3Z', 'M9 8h6M9 12h6'],
};

/** Pastilles de réassurance (content/product-page.ts) : seulement des règles validées ou des fonctions livrées. */
export function ProductBadges() {
  return (
    <ul className="product-badges" aria-label="Commander en confiance">
      {PRODUCT_BADGES.map((badge) => (
        <li key={badge.icon}>
          <span className="badge-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" focusable="false">
              {ICONS[badge.icon].map((d) => (
                <path key={d} d={d} />
              ))}
            </svg>
          </span>
          <span className="badge-label">{badge.label}</span>
        </li>
      ))}
    </ul>
  );
}
