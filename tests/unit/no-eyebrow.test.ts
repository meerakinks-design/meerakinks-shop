import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANDING } from '@/content/landing';

const SRC = path.resolve(__dirname, '../../src');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
}

// Décision du 24 novembre 2026 : plus aucun surtitre (« eyebrow ») au-dessus des titres, nulle part sur le site.
describe('aucun surtitre (eyebrow)', () => {
  it('le code source (composants, pages, styles, textes) ne contient plus le mot « eyebrow »', () => {
    const offenders = files(SRC)
      .filter((file) => /\.(tsx?|css)$/.test(file))
      .filter((file) => /eyebrow/i.test(readFileSync(file, 'utf-8')))
      .map((file) => path.relative(SRC, file));
    expect(offenders).toEqual([]);
  });

  it('aucune section de la landing ne porte de texte « eyebrow »', () => {
    for (const [name, section] of Object.entries(LANDING)) {
      if (section && typeof section === 'object' && !Array.isArray(section)) expect(section, name).not.toHaveProperty('eyebrow');
    }
  });
});
