// Planche-contact des pots du mini-jeu : chaque contenant, dans les couleurs de catégories, sur fond clair et sur fond sombre.
//   node e2e/pots-sheet.mjs [sortie.png]
// Sert à juger le réalisme à l'œil AVANT de brancher les pots dans le jeu (D-19).
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = process.argv[2] ?? path.join(here, 'output', 'pots-sheet.png');

const bundle = await build({
  stdin: { contents: "export * from '@/lib/smash/pots'; export * from '@/lib/smash/palette';", resolveDir: root, loader: 'ts' },
  bundle: true, format: 'iife', globalName: 'Smash', write: false, target: 'es2020', alias: { '@': path.join(root, 'src') },
});

const ACCENTS = ['#f4a6c0', '#f2c94c', '#b69bd6', '#b7d36b'];
const KINDS = ['jar', 'pump', 'dropper', 'tube', 'bottle'];
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;font:12px system-ui;color:#666}
.stage{display:grid;grid-template-columns:repeat(5,200px);gap:0;padding:16px 8px}
.light{background:radial-gradient(ellipse at 50% 30%,#f3ede4,#ddd2c2)}
.dark{background:radial-gradient(ellipse at 50% 30%,#3a342f,#211e1b)}
.cell{position:relative;height:200px}
canvas{position:absolute;left:0;top:0;width:200px;height:200px}
</style><div id="root"></div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1040, height: 800 }, deviceScaleFactor: 2 });
await page.setContent(html);
await page.addScriptTag({ content: bundle.outputFiles[0].text });
await page.evaluate(({ ACCENTS, KINDS }) => {
  const root = document.getElementById('root');
  const palettes = Smash.buildPalettes(ACCENTS);
  for (const theme of ['light', 'dark']) {
    for (const [index, palette] of palettes.entries()) {
      const stage = document.createElement('div');
      stage.className = `stage ${theme}`;
      for (const kind of KINDS) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const canvas = document.createElement('canvas');
        canvas.width = 400; canvas.height = 400;
        const ctx = canvas.getContext('2d');
        // Ombre portée douce sous le pot (ellipse écrasée).
        ctx.save();
        ctx.translate(200, 372);
        ctx.scale(1, 0.22);
        const shadow = ctx.createRadialGradient(0, 0, 4, 0, 0, 120);
        shadow.addColorStop(0, theme === 'light' ? 'rgba(40,24,10,0.34)' : 'rgba(0,0,0,0.55)');
        shadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadow;
        ctx.beginPath();
        ctx.arc(0, 0, 120, 0, 6.3);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(200, 190);
        ctx.scale(2.6, 2.6);
        Smash.drawPotShape(ctx, kind, palette, index);
        ctx.restore();
        cell.appendChild(canvas);
        stage.appendChild(cell);
      }
      root.appendChild(stage);
    }
  }
}, { ACCENTS, KINDS });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('Planche enregistrée :', out);
