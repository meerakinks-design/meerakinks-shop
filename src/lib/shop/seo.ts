/** Résumé pour une méta-description : espaces réduits, coupé proprement entre deux mots (≈ 155 caractères). */
export function summarize(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.!?-]+$/, '')}…`;
}

/** Accepte un domaine nu ou une URL complète, et renvoie l'origine avec protocole. */
export function normalizeSiteUrl(siteUrl: string): string {
  const value = siteUrl.trim();
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  const parsed = new URL(withProtocol);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_SITE_URL doit utiliser http ou https');
  }
  return parsed.origin;
}

/** Adresse absolue, ou null si l'adresse du site n'est pas configurée (on n'invente pas de domaine). */
export function absoluteUrl(path: string, siteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string | null {
  if (!siteUrl) return null;
  return new URL(path, `${normalizeSiteUrl(siteUrl)}/`).toString();
}
