// Contrôle visuel dans un vrai Chromium (téléphone + ordinateur), sur les VRAIES pages, avec des données de démonstration.
//   npm run e2e:visual            lance le serveur de développement (E2E_FAKE_DATA=1), joue les scénarios, l'arrête
//   BASE_URL=http://localhost:3000 npm run e2e:visual   réutilise un serveur déjà lancé avec E2E_FAKE_DATA=1
// Sorties : e2e/output/<appareil>/*.png (captures), e2e/output/report.json. Code de sortie 1 si une vérification échoue.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const OUT = process.env.E2E_OUT ?? path.join(here, 'output');
const PORT = Number(process.env.E2E_PORT ?? 3100);
const EXTERNAL = process.env.BASE_URL;
const BASE = EXTERNAL ?? `http://localhost:${PORT}`;
const ONLY = process.env.E2E_ONLY ? new Set(process.env.E2E_ONLY.split(',')) : null; // ex. E2E_ONLY=produit,panier
const ORDER = JSON.parse(await readFile(path.join(here, 'order.json'), 'utf8'));

const DEVICES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

// ---------------------------------------------------------------------------------------------------------------
// Rapport
// ---------------------------------------------------------------------------------------------------------------
const results = [];
function check(scope, label, ok, detail = '') {
  results.push({ scope, label, ok: Boolean(ok), detail: String(detail) });
  console.log(`${ok ? '  ✔' : '  ✘'} [${scope}] ${label}${detail ? ` — ${detail}` : ''}`);
}
const digits = (text) => Number(String(text).replace(/\D/g, ''));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------------------------------------------
// Serveur
// ---------------------------------------------------------------------------------------------------------------
async function startServer() {
  const require = createRequire(path.join(root, 'package.json'));
  const nextBin = require.resolve('next/dist/bin/next');
  const child = spawn(process.execPath, [nextBin, 'dev', '-p', String(PORT)], {
    cwd: root,
    env: { ...process.env, E2E_FAKE_DATA: '1', NEXT_PUBLIC_CHECKOUT_ENABLED: '1', DATABASE_URL: 'postgresql://fake:fake@localhost:5432/fake', NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (chunk) => (log += chunk));
  child.stderr.on('data', (chunk) => (log += chunk));
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    if (child.exitCode !== null) throw new Error(`Le serveur s'est arrêté :\n${log}`);
    try {
      const response = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(90_000) }).catch(() => null);
      if (response) return { child, log: () => log };
    } catch {
      /* pas encore prêt */
    }
    await sleep(500);
  }
  child.kill();
  throw new Error(`Le serveur n'a pas démarré en 2 minutes :\n${log}`);
}

// ---------------------------------------------------------------------------------------------------------------
// Fausses photos (aucun accès à Cloudinary : le navigateur reçoit un dessin selon le nom du fichier)
// ---------------------------------------------------------------------------------------------------------------
function hash(text) {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}
function photoSvg(fileName) {
  const match = fileName.match(/^(.*)-(\d+)\.jpg$/);
  const slug = match?.[1] ?? fileName;
  const index = Number(match?.[2] ?? 1);
  const hue = (hash(slug) + index * 28) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 86%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360} 60% 68%)"/></linearGradient></defs>
<rect width="800" height="1000" fill="url(#g)"/>
<ellipse cx="400" cy="820" rx="190" ry="26" fill="rgba(0,0,0,.18)"/>
<rect x="250" y="520" width="300" height="290" rx="46" fill="hsl(${hue} 30% 97%)"/>
<rect x="262" y="450" width="276" height="86" rx="28" fill="hsl(${hue} 25% 30%)"/>
<text x="400" y="300" font-family="sans-serif" font-size="190" font-weight="800" text-anchor="middle" fill="rgba(0,0,0,.28)">${index}</text>
</svg>`;
}
async function mockImages(context) {
  await context.route('https://res.cloudinary.com/**', (route) => {
    const fileName = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop() ?? 'x-1.jpg');
    return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: photoSvg(fileName) });
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Aides de page
// ---------------------------------------------------------------------------------------------------------------
async function open(page, url, readySelector) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForSelector(readySelector, { timeout: 90_000 });
  // React a « hydraté » la page quand un élément porte ses propriétés internes.
  await page.waitForFunction((selector) => Object.keys(document.querySelector(selector) ?? {}).some((key) => key.startsWith('__reactFiber')), readySelector, { timeout: 90_000 });
}
const shot = (page, device, name, options = {}) => page.screenshot({ path: path.join(OUT, device, `${name}.png`), ...options });
const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const box = (locator) => locator.boundingBox();

// ---------------------------------------------------------------------------------------------------------------
// Scénario 1 — fiche produit : galerie, barre d'achat collée
// ---------------------------------------------------------------------------------------------------------------
async function scenarioProduct(page, context, device) {
  const scope = `${device}/produit`;
  const phone = device === 'phone';
  await open(page, '/produit/creme-hydratante-visage', '.purchase-add');
  await page.waitForTimeout(400);
  await shot(page, device, '01-fiche-haut');
  check(scope, 'aucun défilement horizontal de la page', (await noSideScroll(page)) <= 1, `écart ${await noSideScroll(page)} px`);

  // Galerie ----------------------------------------------------------------------------------------------------
  const dots = page.locator('.gallery-dot');
  check(scope, 'galerie : 4 pastilles pour 4 photos', (await dots.count()) === 4, `${await dots.count()} pastilles`);
  const stage = await box(page.locator('.gallery-stage'));
  const prev = page.locator('.gallery-prev');
  const next = page.locator('.gallery-next');
  const prevBox = await box(prev);
  const nextBox = await box(next);
  check(scope, 'flèches visibles, dans la photo, au moins 44 px', Boolean(prevBox && nextBox && prevBox.width >= 44 && nextBox.width >= 44 && prevBox.x >= stage.x && nextBox.x + nextBox.width <= stage.x + stage.width + 0.5), `précédent ${prevBox?.width}px, suivant ${nextBox?.width}px`);
  check(scope, 'flèches centrées verticalement sur la photo', Math.abs(prevBox.y + prevBox.height / 2 - (stage.y + stage.height / 2)) < 4, '');

  const currentIndex = () => page.evaluate(() => [...document.querySelectorAll('.gallery-dot')].findIndex((dot) => dot.getAttribute('aria-current') === 'true'));
  const settleOn = async (expected) => {
    await page.waitForFunction(
      (target) => {
        const track = document.querySelector('.gallery-track');
        const index = [...document.querySelectorAll('.gallery-dot')].findIndex((dot) => dot.getAttribute('aria-current') === 'true');
        return index === target && Math.abs(track.scrollLeft - target * track.clientWidth) < 2;
      },
      expected,
      { timeout: 4000 },
    ).catch(() => undefined);
    return currentIndex();
  };

  await next.click();
  check(scope, 'flèche suivante : photo 2', (await settleOn(1)) === 1, `pastille ${(await currentIndex()) + 1}`);
  await shot(page, device, '02-galerie-photo-2');
  const secondLoaded = await page.evaluate(() => {
    const img = document.querySelectorAll('.gallery-slide img')[1];
    return img.complete && img.naturalWidth > 0;
  });
  check(scope, 'la photo 2 est chargée (pas de carré vide)', secondLoaded);
  await next.click();
  await settleOn(2);
  await next.click();
  await settleOn(3);
  await next.click();
  check(scope, 'flèche suivante après la dernière photo : retour à la première', (await settleOn(0)) === 0, `pastille ${(await currentIndex()) + 1}`);
  await prev.click();
  check(scope, 'flèche précédente depuis la première : va à la dernière', (await settleOn(3)) === 3, `pastille ${(await currentIndex()) + 1}`);
  await dots.nth(1).click();
  check(scope, 'pastille 2 : va à la photo 2', (await settleOn(1)) === 1);

  if (phone) {
    // Vrais évènements tactiles (le geste « synthétisé » de Chromium ne défile pas ce conteneur en émulation).
    const cdp = await context.newCDPSession(page);
    const trackBox = await box(page.locator('.gallery-track'));
    const y = Math.round(trackBox.y + trackBox.height / 2);
    const startX = Math.round(trackBox.x + trackBox.width * 0.8);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y }] });
    for (let step = 1; step <= 12; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX - step * 18, y }] });
      await sleep(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    check(scope, 'balayage du doigt : photo suivante (aimantée)', (await settleOn(2)) === 2, `pastille ${(await currentIndex()) + 1}`);
    await cdp.detach();
  }
  await dots.nth(0).click();
  await settleOn(0);

  // Barre d'achat collée ---------------------------------------------------------------------------------------
  const bar = page.locator('.sticky-buy');
  const barState = () => page.evaluate(() => {
    const element = document.querySelector('.sticky-buy');
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return { visible: element.classList.contains('is-visible'), display: style.display, visibility: style.visibility, bottom: rect.bottom, top: rect.top, width: rect.width, innerHeight: window.innerHeight, innerWidth: window.innerWidth };
  });
  const mainButtonOnScreen = () => page.evaluate(() => {
    const rect = document.querySelector('.purchase-add').getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  });
  const scrollTo = async (top) => {
    await page.evaluate((value) => window.scrollTo({ top: value, behavior: 'instant' }), top);
    await page.waitForTimeout(450);
  };
  const buttonTop = await page.evaluate(() => document.querySelector('.purchase-add').getBoundingClientRect().top + window.scrollY);
  const vh = page.viewportSize().height;

  if (phone) {
    // Règle du code : la barre est visible tant que le bouton principal n'est pas à l'écran (au-dessus OU en dessous).
    const initial = await barState();
    const buttonBelowFold = !(await mainButtonOnScreen());
    check(scope, 'barre collée : visible au chargement si le bouton principal est sous la ligne de flottaison', initial.visible === buttonBelowFold, `bouton ${buttonBelowFold ? 'hors écran' : 'à l’écran'}, barre ${initial.visible ? 'visible' : 'cachée'}`);
    await shot(page, device, '03-barre-au-chargement');

    await scrollTo(Math.max(0, buttonTop - vh / 2));
    const withButton = await barState();
    check(scope, 'barre collée : cachée quand le bouton principal est à l’écran', (await mainButtonOnScreen()) && !withButton.visible && withButton.visibility === 'hidden', `barre ${withButton.visible ? 'visible' : 'cachée'}`);
    await shot(page, device, '03b-bouton-principal-a-lecran');

    await scrollTo(buttonTop + 600);
    const scrolled = await barState();
    check(scope, 'barre collée : réapparaît quand le bouton principal sort de l’écran', !(await mainButtonOnScreen()) && scrolled.visible && scrolled.visibility === 'visible');
    check(scope, 'barre collée : en bas de l’écran, pleine largeur', Math.abs(scrolled.bottom - scrolled.innerHeight) <= 1 && Math.abs(scrolled.width - scrolled.innerWidth) <= 1, `bas ${scrolled.bottom}/${scrolled.innerHeight}, largeur ${scrolled.width}/${scrolled.innerWidth}`);
    const addButton = await box(page.locator('.sticky-buy-add'));
    check(scope, 'barre collée : bouton « Ajouter » d’au moins 44 px de haut', addButton.height >= 44, `${addButton.height}px`);
    await shot(page, device, '03c-barre-collee-defilee');
    await page.locator('.sticky-buy-add').click();
    await page.waitForTimeout(250);
    const label = (await page.locator('.sticky-buy-add').innerText()).trim();
    check(scope, 'barre collée : le bouton confirme « Ajouté »', /ajouté/i.test(label), label);
    check(scope, 'barre collée : le badge du panier passe à 1', (await page.locator('.cart-badge').first().innerText()).trim() === '1', (await page.locator('.cart-badge').first().innerText()).trim());
    await shot(page, device, '03d-barre-collee-ajoute');
    await page.waitForTimeout(2000);
    const reset = (await page.locator('.sticky-buy-add').innerText()).trim();
    check(scope, 'barre collée : le bouton redevient « Ajouter » après 2 s', /^ajouter$/i.test(reset), reset);
  } else {
    await scrollTo(buttonTop + 600);
    const scrolled = await barState();
    check(scope, 'barre collée : jamais affichée sur ordinateur', scrolled.display === 'none', `display=${scrolled.display}`);
    await shot(page, device, '03-fiche-milieu');
  }
  await scrollTo(0);

  // Achat principal : quantité puis « Ajouter au panier » ----------------------------------------------------
  await page.locator('.purchase .stepper button').last().click();
  const total = (await page.locator('.purchase-add-price').innerText()).trim();
  check(scope, 'quantité 2 : le prix du bouton devient 13 800 FCFA', digits(total) === 13800, total);
  await page.locator('.purchase-add').click();
  await page.waitForTimeout(250);
  const inCartText = (await page.locator('.purchase .help-text').first().innerText()).trim();
  check(scope, 'ajout principal : « Déjà dans votre panier »', digits(inCartText) === (phone ? 3 : 2), inCartText);
  await shot(page, device, '04-fiche-apres-ajout');

  if (device === 'desktop') {
    await shot(page, device, '04b-fiche-complete', { fullPage: true });
  }

  // Pied de page : la barre collée se range, les liens légaux restent atteignables.
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(700);
  const atBottom = await barState();
  check(scope, 'pied de page à l’écran : la barre collée se range', !atBottom.visible, `visible : ${atBottom.visible}`);
  const legalReachable = await page.evaluate(() => {
    const links = [...document.querySelectorAll('.footer-legal a')];
    return links.length > 0 && links.every((link) => {
      const rect = link.getBoundingClientRect();
      return link.contains(document.elementFromPoint(rect.left + Math.min(8, rect.width / 2), rect.top + rect.height / 2));
    });
  });
  check(scope, 'pied de page : aucun lien légal recouvert', legalReachable);
  if (phone) await shot(page, device, '04c-fiche-pied-de-page');
}

// ---------------------------------------------------------------------------------------------------------------
// Scénario — landing : aucune barre d'achat collée (elle est réservée à la fiche produit), pied de page libre
// ---------------------------------------------------------------------------------------------------------------
async function scenarioLanding(page, device) {
  const scope = `${device}/landing`;
  await open(page, '/', '.hero, .purchase-add');
  await page.waitForTimeout(1800);
  await shot(page, device, '00-landing-haut');
  check(scope, 'aucune barre d’achat collée sur la landing (réservée à la fiche produit)', (await page.locator('.sticky-buy').count()) === 0);
  check(scope, 'aucun défilement horizontal de la page', (await noSideScroll(page)) <= 1, `écart ${await noSideScroll(page)} px`);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(900);
  const fixedOverFooter = await page.evaluate(() => {
    const links = [...document.querySelectorAll('.footer-legal a')];
    return links.every((link) => {
      const rect = link.getBoundingClientRect();
      return link.contains(document.elementFromPoint(rect.left + Math.min(8, rect.width / 2), rect.top + rect.height / 2));
    });
  });
  check(scope, 'bas de page : liens légaux et copyright atteignables (rien de collé par-dessus)', fixedOverFooter);
  await shot(page, device, '00b-landing-bas');
}

// ---------------------------------------------------------------------------------------------------------------
// Scénario 2 — panier en feuille
// ---------------------------------------------------------------------------------------------------------------
async function scenarioCart(page, device) {
  const scope = `${device}/panier`;
  const phone = device === 'phone';
  // Deuxième produit, pour avoir deux lignes.
  await open(page, '/produit/huile-corps-nourrissante', '.purchase-add');
  await page.locator('.purchase-add').click();
  await page.waitForTimeout(250);

  await page.locator('.cart-button').first().click();
  await page.waitForSelector('dialog.modal-cart[open] .cart-line', { timeout: 20_000 });
  await page.waitForTimeout(500);
  check(scope, 'adresse : #panier', (await page.evaluate(() => location.hash)) === '#panier');
  const lines = await page.locator('.cart-line').count();
  check(scope, 'deux lignes dans le panier', lines === 2, `${lines} lignes`);

  const panel = await box(page.locator('dialog.modal-cart .modal-panel'));
  const viewport = page.viewportSize();
  if (phone) {
    check(scope, 'feuille : ancrée en bas de l’écran', Math.abs(panel.y + panel.height - (viewport.height - 8)) <= 2, `bas ${Math.round(panel.y + panel.height)} / écran ${viewport.height}`);
    check(scope, 'feuille : presque pleine largeur', panel.width >= viewport.width - 20 && panel.x >= 0, `${Math.round(panel.width)} px sur ${viewport.width}`);
    check(scope, 'feuille : ne dépasse pas 92 % de la hauteur', panel.height <= viewport.height * 0.92 + 1, `${Math.round(panel.height)} px`);
  } else {
    const centeredY = Math.abs(panel.y + panel.height / 2 - viewport.height / 2) < 6;
    const centeredX = Math.abs(panel.x + panel.width / 2 - viewport.width / 2) < 2;
    check(scope, 'fenêtre centrée sur ordinateur', centeredX && centeredY, `centre (${Math.round(panel.x + panel.width / 2)}, ${Math.round(panel.y + panel.height / 2)})`);
  }
  const checkout = await box(page.locator('.cart-checkout'));
  check(scope, 'bouton « Passer commande » entièrement visible', checkout.y >= 0 && checkout.y + checkout.height <= viewport.height && checkout.height >= 44, `haut ${Math.round(checkout.y)}, bas ${Math.round(checkout.y + checkout.height)}, ${Math.round(checkout.height)} px`);
  const enabled = await page.locator('.cart-checkout').isEnabled();
  check(scope, 'bouton « Passer commande » actif', enabled);
  await shot(page, device, '05-panier');

  // Sous-total officiel = somme des lignes (crème 2 × 6 900 [+1 sur téléphone] + huile 7 000)
  const subtotalText = await page.locator('.cart-subtotal strong').innerText();
  const creamQty = phone ? 3 : 2;
  const expected = creamQty * 6900 + 7000;
  check(scope, 'sous-total calculé par le serveur', digits(subtotalText) === expected, `${subtotalText.trim()} (attendu ${expected})`);

  // Quantité dans la feuille
  await page.locator('.cart-line').first().locator('.stepper button').last().click();
  await page.waitForFunction((value) => Number(document.querySelector('.cart-subtotal strong')?.textContent.replace(/\D/g, '')) === value, expected + 6900, { timeout: 8000 }).catch(() => undefined);
  const updated = digits(await page.locator('.cart-subtotal strong').innerText());
  check(scope, '« + » dans la feuille : le sous-total se met à jour', updated === expected + 6900, `${updated}`);
  await page.locator('.cart-line').first().locator('.stepper button').first().click();
  await page.waitForFunction((value) => Number(document.querySelector('.cart-subtotal strong')?.textContent.replace(/\D/g, '')) === value, expected, { timeout: 8000 }).catch(() => undefined);

  // Échap ferme la feuille et retire #panier
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const closed = await page.evaluate(() => !document.querySelector('dialog.modal-cart').open && location.hash === '');
  check(scope, 'Échap : la feuille se ferme et #panier disparaît', closed);
  await page.locator('.cart-button').first().click();
  await page.waitForSelector('dialog.modal-cart[open] .cart-line');
  await page.waitForTimeout(400);
}

// ---------------------------------------------------------------------------------------------------------------
// Scénario 3 — commande → confirmation → imprimante à ticket → PNG téléchargé une seule fois
// ---------------------------------------------------------------------------------------------------------------
async function scenarioReceipt(page, context, device, downloads) {
  const scope = `${device}/ticket`;
  const phone = device === 'phone';
  await context.route('**/api/v1/orders', (route) => route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, data: ORDER }) }));

  // La feuille du panier est ouverte (scénario précédent) : « Passer commande » ouvre le formulaire.
  await page.locator('.cart-checkout').click();
  await page.waitForSelector('dialog.modal-checkout[open] form', { timeout: 15_000 });
  await page.waitForTimeout(400);
  await shot(page, device, '06-commande-formulaire');
  const dialog = page.locator('dialog.modal-checkout');
  await dialog.getByLabel('Prénom').fill('Awa');
  await dialog.getByLabel('Nom', { exact: true }).fill('Koné');
  await dialog.locator('input[type="tel"]').fill('07 00 00 00 00');
  await dialog.locator('select[name="deliveryZoneId"]').selectOption('zone-cocody');
  await dialog.getByLabel('Adresse précise').fill('Riviera Palmeraie, près de la pharmacie');
  const submit = dialog.locator('button[type="submit"]');
  check(scope, 'formulaire : bouton d’envoi actif une fois rempli', await submit.isEnabled());
  await shot(page, device, '07-commande-rempli');

  const before = downloads.length;
  await submit.click();
  await page.waitForURL(/\/commande\/confirmation\?ref=CMD-/, { timeout: 30_000 });
  await page.waitForSelector('.receipt-printer', { timeout: 30_000 });
  await page.waitForTimeout(200);
  await shot(page, device, '08-ticket-debut');
  const stagesSeen = [await page.locator('.receipt-printer').getAttribute('data-stage')];
  try {
    await page.waitForSelector('.receipt-printer[data-stage="printing"]', { timeout: 6000 });
    stagesSeen.push('printing');
    await page.waitForTimeout(700);
    await shot(page, device, '09-ticket-impression');
    await page.waitForSelector('.receipt-printer[data-stage="complete"]', { timeout: 8000 });
    stagesSeen.push('complete');
  } catch {
    /* le contrôle ci-dessous le signalera */
  }
  await page.waitForTimeout(1200);
  await shot(page, device, '10-ticket-fin');
  check(scope, 'imprimante : préparation → impression → reçu prêt', stagesSeen.join(' → ').includes('printing') && stagesSeen.includes('complete'), stagesSeen.join(' → '));

  const label = (await page.locator('.status-label').innerText()).trim();
  check(scope, 'imprimante : libellé final « Reçu prêt »', label === 'Reçu prêt', label);
  const paper = await page.evaluate(() => {
    const img = document.querySelector('.receipt-paper');
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    return { loaded: img.complete && img.naturalWidth > 0, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, left: rect.left, right: rect.right, width: rect.width, alt: img.alt, innerWidth: window.innerWidth };
  });
  check(scope, 'ticket : image générée et chargée', paper?.loaded, paper ? `${paper.naturalWidth}×${paper.naturalHeight}` : 'absente');
  check(scope, 'ticket : tient dans la largeur de l’écran', paper && paper.left >= 0 && paper.right <= paper.innerWidth + 0.5, paper ? `${Math.round(paper.left)}→${Math.round(paper.right)} sur ${paper.innerWidth}` : '');
  check(scope, 'ticket : texte alternatif sans « paiement reçu »', Boolean(paper?.alt) && /Paiement non reçu/.test(paper.alt), paper?.alt ?? '');
  check(scope, 'aucun défilement horizontal de la page', (await noSideScroll(page)) <= 1, `écart ${await noSideScroll(page)} px`);

  // Téléchargement automatique : exactement un PNG
  const received = downloads.slice(before);
  check(scope, 'le PNG se télécharge tout seul, une seule fois', received.length === 1, `${received.length} téléchargement(s) : ${received.map((d) => d.suggestedFilename()).join(', ')}`);
  if (received[0]) {
    check(scope, 'nom du fichier recu-CMD-….png', received[0].suggestedFilename() === `recu-${ORDER.reference}.png`, received[0].suggestedFilename());
    const file = await received[0].path();
    const bytes = await readFile(file);
    const isPng = bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    check(scope, 'le fichier téléchargé est un vrai PNG', isPng && width > 200 && height > 400, `${width}×${height}, ${Math.round(bytes.length / 1024)} Ko`);
    await writeFile(path.join(OUT, device, 'recu-telecharge.png'), bytes);
  }
  const hint = (await page.locator('.receipt-actions .help-text').innerText()).trim();
  check(scope, 'message : « reçu téléchargé sur votre appareil »', /téléchargé/.test(hint), hint);

  // Page rouverte : plus de téléchargement automatique
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.receipt-printer[data-stage="complete"]', { timeout: 20_000 });
  await page.waitForTimeout(1500);
  check(scope, 'page rouverte : pas de nouveau téléchargement automatique', downloads.length - before === 1, `${downloads.length - before} au total`);

  // Bouton : téléchargement manuel
  await page.locator('.receipt-actions button').click();
  await page.waitForTimeout(1200);
  check(scope, 'bouton « Télécharger mon reçu » : un téléchargement de plus', downloads.length - before === 2, `${downloads.length - before} au total`);
  await shot(page, device, '11-confirmation-page', { fullPage: true });

  if (phone) {
    const calm = await context.browser().newContext({ ...DEVICES.phone, reducedMotion: 'reduce', acceptDownloads: true, locale: 'fr-FR' });
    await mockImages(calm);
    const calmPage = await calm.newPage();
    await calmPage.goto(`${BASE}/commande/confirmation?ref=${ORDER.reference}`, { waitUntil: 'domcontentloaded' });
    await calmPage.waitForSelector('.receipt-printer[data-stage="complete"]', { timeout: 8000 }).then(
      () => check(scope, 'mouvement réduit : le ticket s’affiche directement, sans animation', true),
      () => check(scope, 'mouvement réduit : le ticket s’affiche directement, sans animation', false, 'étape finale non atteinte'),
    );
    await calm.close();
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------------------------------------------
async function runDevice(browser, device) {
  console.log(`\n=== ${device} ===`);
  await mkdir(path.join(OUT, device), { recursive: true });
  const context = await browser.newContext({ ...DEVICES[device], acceptDownloads: true, locale: 'fr-FR' });
  await mockImages(context);
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const problems = [];
  const downloads = [];
  page.on('download', (download) => downloads.push(download));
  page.on('pageerror', (error) => problems.push(`erreur de page : ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/favicon|webpack-hmr/.test(message.text())) problems.push(`console : ${message.text().slice(0, 200)}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !/favicon|webpack-hmr/.test(response.url())) problems.push(`HTTP ${response.status()} ${response.url()}`);
  });

  const wanted = (name) => !ONLY || ONLY.has(name);
  try {
    if (wanted('landing')) await scenarioLanding(page, device);
    if (wanted('produit')) await scenarioProduct(page, context, device);
    if (wanted('panier')) await scenarioCart(page, device);
    if (wanted('ticket')) await scenarioReceipt(page, context, device, downloads);
    if (wanted('jeu')) {
      const { scenarioGame } = await import('./game-check.mjs');
      await scenarioGame({ page, context, device, check, shot, open, BASE, mockImages, DEVICES, OUT, sleep });
    }
  } catch (error) {
    check(`${device}/scénario`, 'le scénario va jusqu’au bout', false, error.message.split('\n')[0]);
    await shot(page, device, 'zz-erreur').catch(() => undefined);
  }
  check(device, 'aucune erreur de console, de page ni de réseau', problems.length === 0, problems.slice(0, 4).join(' | '));
  await context.close();
}

async function main() {
  if (!ONLY) await rm(OUT, { recursive: true, force: true }); // un lancement partiel (E2E_ONLY) garde les captures des autres scénarios
  await mkdir(OUT, { recursive: true });
  const server = EXTERNAL ? null : await startServer();
  const browser = await chromium.launch();
  try {
    for (const device of Object.keys(DEVICES)) await runDevice(browser, device);
  } finally {
    await browser.close();
    server?.child.kill();
  }
  const failed = results.filter((result) => !result.ok);
  await writeFile(path.join(OUT, 'report.json'), JSON.stringify({ date: new Date().toISOString(), passed: results.length - failed.length, failed: failed.length, results }, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies${failed.length ? ` — ${failed.length} échec(s)` : ''}. Captures : ${OUT}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
