// Scénario Chromium du mini-jeu « Cosmetic Smash » (cahier §4.6, D-19), appelé par visual-check.mjs.
// Contexte neuf : le code du jeu ne doit PAS être déjà en cache pour vérifier le chargement différé.
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

const digits = (text) => Number(String(text).replace(/\D/g, ''));

export async function scenarioGame({ page: parentPage, context: parentContext, device, check, open, BASE, mockImages, DEVICES, OUT, sleep }) {
  void parentPage;
  const scope = `${device}/jeu`;
  const phone = device === 'phone';
  const dir = path.join(OUT, device);
  await mkdir(dir, { recursive: true });
  const browser = parentContext.browser();
  const context = await browser.newContext({ ...DEVICES[device], locale: 'fr-FR' });
  await mockImages(context);
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);

  const problems = [];
  const smashRequests = [];
  page.on('pageerror', (error) => problems.push(`erreur de page : ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/favicon|webpack-hmr/.test(message.text())) problems.push(`console : ${message.text().slice(0, 200)}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !/favicon|webpack-hmr/.test(response.url())) problems.push(`HTTP ${response.status()} ${response.url()}`);
  });
  page.on('request', (request) => {
    if (/\/chunks\/smash/.test(request.url())) smashRequests.push(request.url());
  });

  const section = page.locator('.smash');
  const shotSection = (name) => section.screenshot({ path: path.join(dir, `${name}.png`) });
  const state = () => section.getAttribute('data-smash');
  const hud = async () => ({
    score: digits(await page.locator('.smash-stat').nth(0).innerText()),
    seconds: digits(await page.locator('.smash-stat').nth(1).innerText()),
  });
  const waitState = (expected, timeout = 8000) => page.waitForFunction((value) => document.querySelector('.smash')?.getAttribute('data-smash') === value, expected, { timeout }).then(() => true, () => false);

  // 1. Chargement différé -----------------------------------------------------------------------------------------
  await open(page, '/', '.smash-play');
  const distance = await page.evaluate(() => document.querySelector('.smash').getBoundingClientRect().top - window.innerHeight);
  check(scope, 'au chargement : jeu au repos, code non chargé', (await state()) === 'idle' && (await section.getAttribute('data-code')) === 'waiting' && smashRequests.length === 0, `footer à ${Math.round(distance)} px sous l’écran`);
  check(scope, 'au chargement : ni canvas, ni score, ni chronomètre', (await page.locator('.smash canvas').count()) === 0 && (await page.locator('.smash-stat').count()) === 0);
  if (distance > 900) {
    await page.evaluate(() => window.scrollTo({ top: window.scrollY + document.querySelector('.smash').getBoundingClientRect().top - window.innerHeight - 1000, behavior: 'instant' }));
    await sleep(900);
    check(scope, 'footer encore loin (1 000 px) : le code n’est toujours pas chargé', smashRequests.length === 0 && (await section.getAttribute('data-code')) === 'waiting', `${smashRequests.length} requête(s)`);
  }
  await page.evaluate(() => window.scrollTo({ top: window.scrollY + document.querySelector('.smash').getBoundingClientRect().top - window.innerHeight - 250, behavior: 'instant' }));
  const loaded = await page.waitForFunction(() => document.querySelector('.smash')?.getAttribute('data-code') === 'ready', undefined, { timeout: 30_000 }).then(() => true, () => false);
  check(scope, 'footer qui approche : le code du jeu se charge (une requête)', loaded && smashRequests.length >= 1, `${smashRequests.length} requête(s) : ${smashRequests.map((url) => url.split('/').pop()).join(', ')}`);
  check(scope, 'code chargé mais le jeu ne démarre pas tout seul (aucun canvas, au repos)', (await state()) === 'idle' && (await page.locator('.smash canvas').count()) === 0);

  await page.evaluate(() => document.querySelector('.smash').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sleep(1800);
  const titleIsSpaghetti = await page.evaluate(() => Boolean(document.querySelector('.smash-title.sp')) && Boolean(document.querySelector('.smash-text.sp')));
  check(scope, 'titre et texte suivent l’effet « spaghetti »', titleIsSpaghetti);
  check(scope, 'titre et texte validés', (await page.locator('.smash-title').innerText()).replace(/\s+/g, ' ').trim() === 'Une petite pause beauté ?' && /Lancez Cosmetic Smash/.test(await page.locator('.smash-text').innerText()));
  const playBox = await page.locator('.smash-play').boundingBox();
  check(scope, 'bouton « Jouer » visible, au moins 44 px, actif', Boolean(playBox) && playBox.height >= 44 && (await page.locator('.smash-play').isEnabled()), playBox ? `${Math.round(playBox.height)} px` : '');
  check(scope, 'message « moins d’animations » masqué en temps normal', !(await page.locator('.smash-reduced').isVisible()));
  await shotSection('20-jeu-repos');

  // 2. Démarrage au clic -------------------------------------------------------------------------------------------
  await page.locator('.smash-play').click();
  check(scope, 'clic sur « Jouer » : la partie démarre', await waitState('running'));
  await page.waitForSelector('.smash canvas');
  await sleep(250);
  const initial = await hud();
  check(scope, 'score 0, chronomètre à 30 s au départ', initial.score === 0 && initial.seconds >= 29, `Score ${initial.score}, Temps ${initial.seconds} s`);
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('.smash canvas');
    const rect = canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height, pixelWidth: canvas.width, dpr: window.devicePixelRatio, touchAction: getComputedStyle(canvas).touchAction, focused: document.activeElement === canvas };
  });
  check(scope, 'canvas net sur écran dense (taille réelle = taille affichée × densité)', Math.abs(canvasInfo.pixelWidth - Math.round(canvasInfo.width * Math.min(canvasInfo.dpr, 2))) <= 1, `${canvasInfo.pixelWidth} px pour ${Math.round(canvasInfo.width)} px CSS (×${canvasInfo.dpr})`);
  check(scope, 'défilement vertical laissé au navigateur (touch-action: pan-y)', canvasInfo.touchAction === 'pan-y', canvasInfo.touchAction);
  check(scope, 'le canvas prend le focus au démarrage (clavier prêt)', canvasInfo.focused);
  await sleep(1200);
  const afterOne = await hud();
  check(scope, 'le chronomètre décompte', afterOne.seconds < initial.seconds, `${initial.seconds} s → ${afterOne.seconds} s`);

  // Fluidité : médiane des intervalles entre images pendant 2,5 s.
  const frames = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const times = [];
        const stop = performance.now() + 2500;
        const loop = (now) => {
          times.push(now);
          if (now < stop) requestAnimationFrame(loop);
          else {
            const deltas = times.slice(1).map((time, index) => time - times[index]).sort((a, b) => a - b);
            resolve({ median: deltas[Math.floor(deltas.length / 2)], p95: deltas[Math.floor(deltas.length * 0.95)], count: deltas.length });
          }
        };
        requestAnimationFrame(loop);
      }),
  );
  check(scope, 'fluidité : intervalle médian entre images ≤ 25 ms', frames.median <= 25, `médiane ${frames.median.toFixed(1)} ms, 95e centile ${frames.p95.toFixed(1)} ms (${frames.count} images ; Chromium sans accélération graphique)`);
  await shotSection('21-jeu-en-cours');

  // 3. Éclatement ---------------------------------------------------------------------------------------------------
  // On cherche un pot à l'écran en lisant les pixels du canvas (la zone la plus dense en pixels opaques).
  const findPot = () =>
    page.evaluate(() => {
      const canvas = document.querySelector('.smash canvas');
      const ctx = canvas.getContext('2d');
      const ratio = canvas.width / canvas.getBoundingClientRect().width;
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const cell = Math.round(10 * ratio);
      const columns = Math.ceil(canvas.width / cell);
      const counts = new Map();
      for (let y = 0; y < canvas.height; y += 2) {
        for (let x = 0; x < canvas.width; x += 2) {
          if (image.data[(y * canvas.width + x) * 4 + 3] > 220) {
            const key = Math.floor(y / cell) * columns + Math.floor(x / cell);
            counts.set(key, (counts.get(key) ?? 0) + 1);
          }
        }
      }
      let best = null;
      for (const [key, count] of counts) if (!best || count > best.count) best = { key, count };
      if (!best || best.count < 6) return null;
      return { x: ((best.key % columns) * cell + cell / 2) / ratio, y: (Math.floor(best.key / columns) * cell + cell / 2) / ratio };
    });
  const aim = async () => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const point = await findPot();
      if (point) return point;
      await sleep(150);
    }
    return null;
  };
  let scoreBefore = (await hud()).score;
  let gained = false;
  let burstShot = false;
  for (let attempt = 0; attempt < 12 && !gained; attempt += 1) {
    const point = await aim();
    if (!point) break;
    const box = await page.locator('.smash canvas').boundingBox();
    if (phone) await page.touchscreen.tap(box.x + point.x, box.y + point.y);
    else await page.mouse.click(box.x + point.x, box.y + point.y);
    await sleep(60);
    gained = (await hud()).score > scoreBefore;
    if (gained && !burstShot) {
      burstShot = true;
      await shotSection('22-eclatement');
    }
  }
  const afterSmash = await hud();
  check(scope, phone ? 'un toucher sur un pot le fait éclater : le score monte' : 'un clic sur un pot le fait éclater : le score monte', gained && afterSmash.score >= 10, `Score ${scoreBefore} → ${afterSmash.score}`);
  check(scope, 'points gagnés = 10, 20 ou 30 selon la taille', [10, 20, 30].includes(afterSmash.score - scoreBefore), `+${afterSmash.score - scoreBefore}`);

  // 3 bis. Commandes en icônes ---------------------------------------------------------------------------------------
  const iconButtons = await page.evaluate(() =>
    [...document.querySelectorAll('.smash-icon-btn')].map((button) => {
      const box = button.getBoundingClientRect();
      return { name: button.getAttribute('aria-label'), text: button.textContent.trim(), width: box.width, height: box.height, top: Math.round(box.top) };
    }),
  );
  check(scope, 'commandes : trois boutons à icône nommés (Pause, Recommencer, Son), sans texte visible', iconButtons.length === 3 && iconButtons.every((button) => button.name && button.text === ''), iconButtons.map((button) => button.name).join(', '));
  check(scope, 'commandes : cibles d’au moins 44 px, sur une seule ligne', iconButtons.every((button) => button.width >= 44 && button.height >= 44) && new Set(iconButtons.map((button) => button.top)).size === 1, iconButtons.map((button) => `${Math.round(button.width)}×${Math.round(button.height)}`).join(' · '));
  check(scope, 'texte d’introduction retiré une fois le plateau ouvert', (await page.locator('.smash-text').count()) === 0);
  await page.getByRole('button', { name: 'Couper le son' }).click();
  check(scope, 'Son : le bouton devient « Activer le son » et l’état est annoncé', (await page.getByRole('button', { name: 'Activer le son' }).isVisible()) && /son coupé/i.test(await page.locator('.smash [aria-live]').innerText()));
  await page.getByRole('button', { name: 'Activer le son' }).click();
  check(scope, 'Son : un second clic le rétablit', await page.getByRole('button', { name: 'Couper le son' }).isVisible());

  // 4. Pause / reprise ----------------------------------------------------------------------------------------------
  await page.getByRole('button', { name: 'Pause' }).click();
  check(scope, 'Pause : la partie est en pause, le bouton devient « Reprendre »', (await waitState('paused', 2000)) && (await page.getByRole('button', { name: 'Reprendre' }).isVisible()));
  const frozenA = await page.evaluate(() => document.querySelector('.smash canvas').toDataURL());
  const frozenTime = (await hud()).seconds;
  await sleep(1300);
  const frozenB = await page.evaluate(() => document.querySelector('.smash canvas').toDataURL());
  check(scope, 'en pause : image figée et chronomètre arrêté', frozenA === frozenB && (await hud()).seconds === frozenTime, `Temps ${frozenTime} s`);
  await shotSection('23-jeu-en-pause');
  const live = await page.locator('.smash [aria-live]').innerText();
  check(scope, 'lecteur d’écran : « Partie en pause. » annoncé', /en pause/i.test(live), live);
  await page.getByRole('button', { name: 'Reprendre' }).click();
  check(scope, 'Reprendre : la partie repart', await waitState('running', 2000));
  await sleep(1300);
  check(scope, 'après la reprise, le chronomètre repart', (await hud()).seconds < frozenTime, `${frozenTime} s → ${(await hud()).seconds} s`);

  // 5. Clavier ------------------------------------------------------------------------------------------------------
  await page.locator('.smash canvas').focus();
  const keyScroll = await page.evaluate(() => window.scrollY);
  const keyScore = (await hud()).score;
  let keyHit = false;
  for (let attempt = 0; attempt < 25 && !keyHit; attempt += 1) {
    await page.keyboard.press('Space');
    await sleep(160);
    keyHit = (await hud()).score > keyScore;
  }
  check(scope, 'clavier : Espace fait éclater un pot', keyHit, `Score ${keyScore} → ${(await hud()).score}`);
  check(scope, 'clavier : Espace pendant la partie ne fait pas défiler la page', (await page.evaluate(() => window.scrollY)) === keyScroll);

  // 6. Défilement jamais bloqué, liens du footer libres -------------------------------------------------------------
  const beforeWheel = await page.evaluate(() => window.scrollY);
  const box = await page.locator('.smash canvas').boundingBox();
  if (phone) {
    const cdp = await context.newCDPSession(page);
    const x = Math.round(box.x + box.width / 2);
    const y0 = Math.round(box.y + box.height * 0.3);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
    for (let step = 1; step <= 14; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + step * 14 }] });
      await sleep(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(700);
    await cdp.detach();
  } else {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -320);
    await sleep(500);
  }
  const afterWheel = await page.evaluate(() => window.scrollY);
  check(scope, phone ? 'glissement vertical du doigt sur le jeu : la page défile' : 'molette au-dessus du jeu : la page défile', afterWheel < beforeWheel - 40, `${Math.round(beforeWheel)} → ${Math.round(afterWheel)} px`);
  // Le jeu reste en cours tant qu'il est à moitié visible ; il se met en pause dès qu'on l'a quitté des yeux (moins de 25 % visible).
  check(scope, 'jeu encore à moitié visible : la partie continue', (await state()) === 'running', `état : ${await state()}`);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  check(scope, 'page défilée loin du jeu : la partie se met en pause (jamais de partie fantôme)', await waitState('paused', 3000), `état : ${await state()}`);
  await sleep(500);
  check(scope, 'revenu devant le jeu : il reste en pause (pas de reprise surprise)', (await page.evaluate(() => { document.querySelector('.smash').scrollIntoView({ block: 'center', behavior: 'instant' }); return document.querySelector('.smash').getAttribute('data-smash'); })) === 'paused');
  await page.getByRole('button', { name: 'Reprendre' }).click();
  await waitState('running', 2000);

  await page.evaluate(() => document.querySelector('.smash').scrollIntoView({ block: 'center', behavior: 'instant' }));
  const links = await page.evaluate(() => {
    const stage = document.querySelector('.smash').getBoundingClientRect();
    const result = [];
    for (const link of document.querySelectorAll('.site-footer .footer-col a')) {
      const rect = link.getBoundingClientRect();
      const overlaps = rect.bottom > stage.top && rect.top < stage.bottom && rect.right > stage.left && rect.left < stage.right;
      result.push({ text: link.textContent.trim(), overlaps });
    }
    return result;
  });
  check(scope, 'les liens du footer ne sont jamais recouverts par le jeu', links.length >= 6 && links.every((link) => !link.overlaps), `${links.length} liens vérifiés`);
  const legal = page.locator('.footer-col-info a').first();
  await legal.scrollIntoViewIfNeeded();
  const topElement = await legal.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const found = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return element.contains(found);
  });
  check(scope, 'un lien légal du footer reste cliquable pendant la partie', topElement);
  check(scope, 'aucun défilement horizontal de la page', (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);

  // 7. Recommencer, puis partie complète jusqu'à la fin -----------------------------------------------------------------
  await page.evaluate(() => document.querySelector('.smash').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sleep(300);
  await page.getByRole('button', { name: 'Recommencer' }).click();
  await sleep(300);
  const restarted = await hud();
  check(scope, 'Recommencer : score à 0 et chronomètre à 30 s', (await state()) === 'running' && restarted.score === 0 && restarted.seconds >= 29, `Score ${restarted.score}, Temps ${restarted.seconds} s`);

  // 20 secondes de jeu sans toucher : les pots tombent, la partie va au bout, aucun point gagné tout seul.
  await sleep(12_000);
  await shotSection('24-jeu-mi-partie');
  const idleScore = (await hud()).score;
  check(scope, 'sans toucher, aucun point n’est gagné', idleScore === 0, `Score ${idleScore}`);
  const ended = await waitState('over', 25_000);
  check(scope, 'la partie se termine d’elle-même au bout de 30 s', ended);
  const finalHud = await hud();
  check(scope, 'fin : chronomètre à 0 s', finalHud.seconds === 0, `Temps ${finalHud.seconds} s`);
  await sleep(1500);
  const overText = (await page.locator('.smash-over p').innerText()).trim();
  check(scope, 'fin : message « Bien joué ! Envie de refaire une partie ? »', overText === 'Bien joué ! Envie de refaire une partie ?', overText);
  check(scope, 'fin : bouton « Rejouer » visible et au focus (clavier)', (await page.getByRole('button', { name: 'Rejouer' }).isVisible()) && (await page.evaluate(() => document.activeElement?.textContent?.trim() === 'Rejouer')));
  check(scope, 'fin : « Pause » inactif', await page.getByRole('button', { name: 'Pause' }).isDisabled());
  await shotSection('25-jeu-fin');
  await page.getByRole('button', { name: 'Rejouer' }).click();
  await sleep(400);
  const replayed = await hud();
  check(scope, 'Rejouer : nouvelle partie à 0 point', (await state()) === 'running' && replayed.score === 0 && replayed.seconds >= 29, `Score ${replayed.score}, Temps ${replayed.seconds} s`);

  check(scope, 'aucune erreur de console, de page ni de réseau pendant le jeu', problems.length === 0, problems.slice(0, 4).join(' | '));
  await context.close();

  // 8. Moins d'animations demandé -------------------------------------------------------------------------------------
  const calm = await browser.newContext({ ...DEVICES[device], reducedMotion: 'reduce', locale: 'fr-FR' });
  await mockImages(calm);
  const calmPage = await calm.newPage();
  const calmRequests = [];
  calmPage.on('request', (request) => {
    if (/\/chunks\/smash/.test(request.url())) calmRequests.push(request.url());
  });
  await open(calmPage, '/', '.smash-title');
  await calmPage.evaluate(() => document.querySelector('.smash').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sleep(1500);
  const calmState = await calmPage.evaluate(() => ({
    playVisible: Boolean(document.querySelector('.smash-play')) && getComputedStyle(document.querySelector('.smash-play')).display !== 'none',
    message: document.querySelector('.smash-reduced') && getComputedStyle(document.querySelector('.smash-reduced')).display !== 'none' ? document.querySelector('.smash-reduced').textContent.trim() : null,
    canvas: document.querySelectorAll('.smash canvas').length,
    code: document.querySelector('.smash').getAttribute('data-code'),
    title: document.querySelector('.smash-title').textContent.trim(),
  }));
  check(scope, 'moins d’animations : pas de bouton « Jouer »', !calmState.playVisible);
  check(scope, 'moins d’animations : message validé à la place', calmState.message === 'Le jeu est désactivé car vous avez demandé moins d’animations.', calmState.message ?? 'absent');
  check(scope, 'moins d’animations : aucun canvas et le code du jeu n’est pas chargé', calmState.canvas === 0 && calmState.code === 'waiting' && calmRequests.length === 0, `${calmRequests.length} requête(s), code : ${calmState.code}`);
  check(scope, 'moins d’animations : le titre reste lisible tel quel', calmState.title.replace(/\s+/g, ' ') === 'Une petite pause beauté ?');
  await calmPage.locator('.smash').screenshot({ path: path.join(dir, '26-jeu-mouvement-reduit.png') });
  await calm.close();
}
