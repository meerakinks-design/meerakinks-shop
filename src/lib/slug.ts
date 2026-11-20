export const SLUG_MAX_LENGTH = 80;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const LIGATURES: Record<string, string> = { 'œ': 'oe', 'æ': 'ae', 'ß': 'ss' };

/** « Bonnet double face — l’Été ! » → « bonnet-double-face-lete » */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[œæß]/g, (char) => LIGATURES[char] ?? char)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // retire les accents
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.slice(0, SLUG_MAX_LENGTH).replace(/-+$/, '');
}

/** Premier slug libre : base, base-2, base-3… `isTaken` interroge la base. */
export async function findFreeSlug(
  base: string,
  fallback: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = base || fallback;
  if (!(await isTaken(root))) return root;
  for (let suffix = 2; suffix <= 50; suffix += 1) {
    const candidate = `${root.slice(0, SLUG_MAX_LENGTH - String(suffix).length - 1)}-${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error('Aucun slug libre trouvé');
}
