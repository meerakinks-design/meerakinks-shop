// Planche de l'éclatement d'un pot à plusieurs instants (60, 160, 320, 520 ms), pour trois contenants : sert à régler les effets.
//   node e2e/burst-sheet.mjs [sortie.png]
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = process.argv[2] ?? path.join(here, 'output', 'burst-sheet.png');
const bundle = await build({
  stdin: { contents: "export * from '@/lib/smash/effects'; export * from '@/lib/smash/render'; export * from '@/lib/smash/palette'; export * from '@/lib/smash/engine';", resolveDir: root, loader: 'ts' },
  bundle: true, format: 'iife', globalName: 'Smash', write: false, target: 'es2020', alias: { '@': path.join(root, 'src') },
});
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1480, height: 1000 }, deviceScaleFactor: 1.5 });
await page.setContent('<body style="margin:0;background:#231f1c"><div id="r" style="display:grid;grid-template-columns:repeat(4,360px);gap:10px;padding:10px"></div>');
await page.addScriptTag({ content: bundle.outputFiles[0].text });
await page.evaluate(() => {
  const palettes = Smash.buildPalettes(['#f4a6c0', '#f2c94c', '#b69bd6', '#b7d36b']);
  const times = [60, 160, 320, 520];
  const cases = [['jar', 0, 'glass', 46], ['dropper', 2, 'glass', 36], ['tube', 1, 'plastic', 27]];
  for (const [kind, index, material, radius] of cases) {
    for (const time of times) {
      const canvas = document.createElement('canvas');
      canvas.width = 540; canvas.height = 450; canvas.style.cssText = 'width:360px;height:300px;border-radius:12px;background:radial-gradient(ellipse at 50% 28%,#faf7f2,#e2dcd2)';
      document.getElementById('r').appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const makeCanvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
      const renderer = new Smash.SmashRenderer(ctx, palettes, makeCanvas);
      renderer.resize(360, 300, 1.5);
      const effects = new Smash.Effects(Smash.mulberry32(42));
      const event = { potId: 1, kind, size: 'large', paletteIndex: index, x: 180, y: 150, vx: 30, vy: -60, angle: 0.3, radius, points: 20 };
      effects.burst(event, material);
      for (let t = 0; t < time; t += 16) effects.update(16, 300);
      renderer.draw({ pots: [] }, effects);
    }
  }
});
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('Planche enregistrée :', out);
