import { serializeJsonLd } from '@/lib/shop/json-ld';

/** Données structurées pour les moteurs de recherche (échappées : voir serializeJsonLd). */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
