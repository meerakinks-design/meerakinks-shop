import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(path.resolve(__dirname, '../..', file), 'utf-8');

// Régression du 24 novembre 2026 : les rideaux (menu, panier, commande, confirmation) ne jouaient bien leur glissement qu'à
// la 1re ouverture. Dès la 2e, showModal() donnait le focus au bouton ✕ encore rangé hors écran, et le navigateur faisait
// défiler le <dialog> : le panneau semblait déjà en place et les rideaux partaient à gauche. Vérifié dans Chromium
// (5 ouvertures + menu → panier) ; ces tests gardent le correctif en place.
describe('rideaux : l’animation rejoue à chaque ouverture et fermeture', () => {
  it('le défilement du dialog est remis à zéro juste après showModal()', () => {
    const source = read('src/components/shop/CurtainModal.tsx');
    const open = source.indexOf('dialog.showModal()');
    expect(open).toBeGreaterThan(-1);
    const after = source.slice(open, open + 900);
    expect(after).toContain('dialog.scrollLeft = 0');
    expect(after).toContain('dialog.scrollTop = 0');
  });

  it('le dialog ne peut pas défiler (overflow: clip, avec overflow: hidden en repli)', () => {
    const rule = read('src/styles/ui.css').split('\n').find((line) => line.startsWith('.curtain-dialog {')) ?? '';
    expect(rule).toMatch(/overflow: hidden; overflow: clip;/);
  });
});
