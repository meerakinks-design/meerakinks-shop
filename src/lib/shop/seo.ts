/** Résumé pour une méta-description : espaces réduits, coupé proprement entre deux mots (≈ 155 caractères). */
export function summarize(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.!?-]+$/, '')}…`;
}

/** Adresse absolue, ou null si l'adresse du site n'est pas configurée (on n'invente pas de domaine). */
export function absoluteUrl(path: string, siteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string | null {
  if (!siteUrl) return null;
  return new URL(path, siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`).toString();
}
