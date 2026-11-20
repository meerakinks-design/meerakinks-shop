/**
 * Sérialise des données structurées pour une balise <script type="application/ld+json">.
 * « < » est échappé : une description produit contenant « </script> » ne peut pas fermer la balise.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
