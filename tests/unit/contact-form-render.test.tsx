import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ContactForm } from '@/components/shop/ContactForm';

// Rendu serveur RÉEL du formulaire de contact : un seul champ « Contact » avec un select WhatsApp / E-mail,
// et un indicatif que le client tape lui-même.
const html = renderToStaticMarkup(<ContactForm whatsappHref={null} />);

describe('formulaire de contact : champ « Contact »', () => {
  it('un seul champ Contact avec un select WhatsApp / E-mail, plus de boutons radio', () => {
    expect(html).toContain('>Contact</label>');
    expect(html).toContain('aria-label="Moyen de contact"');
    expect(html).toContain('<option value="WHATSAPP" selected="">WhatsApp</option>');
    expect(html).toContain('<option value="EMAIL">E-mail</option>');
    expect(html).not.toContain('type="radio"');
  });

  it('par défaut (WhatsApp) : indicatif tapé librement (225) + numéro, sans liste de pays', () => {
    expect(html).toContain('aria-label="Indicatif de votre pays, chiffres seulement"');
    expect(html).toMatch(/class="dial-input"[^>]*value="225"/);
    expect(html).toContain('type="tel"');
    expect(html).toContain('Pays : Côte d’Ivoire');
    expect(html).toContain('Tapez simplement son indicatif');
    expect(html).not.toContain('<option value="225"');
    expect(html).not.toContain('type="email"');
  });

  it('le champ du numéro est relié au label « Contact »', () => {
    const phoneId = /id="([^"]+-phone)"/.exec(html)?.[1];
    expect(phoneId).toBeTruthy();
    expect(html).toContain(`for="${phoneId}">Contact</label>`);
  });
});

describe('plein écran sur téléphone', () => {
  const css = readFileSync(path.resolve(__dirname, '../../src/styles/ui.css'), 'utf-8');
  it('les modals à rideaux (menu, panier, commande, confirmation) occupent tout l’écran sous 700 px', () => {
    const block = /@media \(max-width: 699px\) \{\s*\.curtain-dialog \{[^}]*--drawer-w: 100%[^}]*\}[\s\S]*?\n\}/.exec(css)?.[0] ?? '';
    expect(block).toContain('--drawer-w: 100%');
    expect(block).toMatch(/\.curtain-layer, \.curtain-panel \{[^}]*top: 0; right: 0; bottom: 0;[^}]*border-radius: 0/);
    expect(block).toMatch(/\.curtain-layer-1, \.curtain-layer-2 \{[^}]*width: 100%/);
  });
});
