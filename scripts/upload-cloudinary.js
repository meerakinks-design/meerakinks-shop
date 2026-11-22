/**
 * Synchronise les médias du dossier `public/` vers Cloudinary (adapté de upload-cloudinary.js d'AKATech).
 *
 *   npm run media:sync            envoie ce qui a changé
 *   npm run media:sync -- --force renvoie tout
 *   npm run media:sync:dry        simule, n'envoie rien
 *
 * - Tous les formats médias partent : images (png, jpg, webp, gif, avif, svg…), vidéos (webm, mp4, mov…), sons (mp3, wav…)
 *   et, à défaut, tout autre fichier en « raw ». Le type est choisi d'après l'extension, comme dans src/lib/cloudinary-static.ts.
 * - Les polices et les icônes de site (favicon) restent locales : voir `localOnly` dans config/cloudinary-media.json.
 * - Même arborescence que `public/` sous `baseFolder` : `/brand/logo-meera-kinks.png` devient
 *   `meera/public/brand/logo-meera-kinks`. Le site lit ensuite ces médias avec `cld('/brand/logo-meera-kinks.png')`.
 * - Relançable à volonté : identifiants déterministes + `overwrite`, donc jamais de doublon ; un manifeste de hachages évite de
 *   renvoyer ce qui n'a pas changé.
 * - Les secrets viennent de `.env.local` en priorité, puis de `.env` (jamais écrits dans le manifeste ni dans les logs).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const media = JSON.parse(fs.readFileSync(path.join(root, 'config', 'cloudinary-media.json'), 'utf8'));

// Chargement sans dépendance externe : .env.local remplace .env lorsqu'une clé existe dans les deux.
for (const envFile of ['.env', '.env.local']) {
  const envPath = path.join(root, envFile);
  if (!fs.existsSync(envPath)) continue;
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const equalsIdx = trimmed.indexOf('=');
    if (equalsIdx === -1) return;
    const key = trimmed.slice(0, equalsIdx).trim();
    let value = trimmed.slice(equalsIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (envFile === '.env.local' || !(key in process.env)) process.env[key] = value;
  });
}

const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!DRY_RUN && (!cloudName || !apiKey || !apiSecret)) {
  console.error('❌ CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY ou CLOUDINARY_API_SECRET manquants dans .env.local ou .env');
  process.exit(1);
}

const BASE_FOLDER = media.baseFolder;
const publicDir = path.join(root, 'public');
const manifestPath = path.join(__dirname, '.cloudinary-manifest.json');

const extensionOf = (file) => path.extname(file).slice(1).toLowerCase();

function resourceTypeFor(relativePath) {
  const extension = extensionOf(relativePath);
  if (media.imageExtensions.includes(extension)) return 'image';
  if (media.videoExtensions.includes(extension) || media.audioExtensions.includes(extension)) return 'video';
  return 'raw';
}

function isLocalOnly(relativePath) {
  return media.localOnly.some((entry) => (entry.endsWith('/') ? relativePath.startsWith(entry) : relativePath === entry));
}

/** Identifiant déterministe : chemin public sans extension (image, vidéo), avec extension pour « raw ». */
function publicIdFor(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/').normalize('NFC');
  const extension = path.posix.extname(normalized);
  const keepExtension = resourceTypeFor(normalized) === 'raw' || !extension;
  return `${BASE_FOLDER}/${keepExtension ? normalized : normalized.slice(0, -extension.length)}`;
}

function loadManifest() {
  if (FORCE) return {};
  try { return JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { return {}; }
}

const fileHash = (filePath) => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

function getFilesRecursively(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    return entry.isDirectory() ? getFilesRecursively(filePath) : [filePath];
  });
}

function generateSignature(params, secret) {
  const payload = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join('&');
  return crypto.createHash('sha1').update(payload + secret).digest('hex');
}

async function uploadFile(filePath, relativePath) {
  const publicId = publicIdFor(relativePath);
  const resourceType = resourceTypeFor(relativePath);
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    invalidate: 'true',
    overwrite: 'true',
    public_id: publicId,
    timestamp,
    unique_filename: 'false',
    use_filename: 'false',
  };
  // Vidéos : version optimisée générée en arrière-plan, pour que le premier visiteur n'attende pas (et éviter
  // l'erreur « trop lourd pour un traitement synchrone »).
  if (resourceType === 'video') {
    paramsToSign.eager = 'f_auto,q_auto';
    paramsToSign.eager_async = 'true';
  }
  const signature = generateSignature(paramsToSign, apiSecret);

  const formData = new FormData();
  formData.append('file', new Blob([fs.readFileSync(filePath)]), path.basename(filePath));
  formData.append('api_key', apiKey);
  formData.append('signature', signature);
  for (const [key, value] of Object.entries(paramsToSign)) formData.append(key, String(value));

  if (DRY_RUN) return { secure_url: '[dry-run]', public_id: publicId, resource_type: resourceType };

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, { method: 'POST', body: formData });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || JSON.stringify(data));
  return data;
}

async function uploadAll() {
  if (!fs.existsSync(publicDir)) throw new Error("Le dossier public n'existe pas.");
  const manifest = loadManifest();
  const files = getFilesRecursively(publicDir).filter((filePath) => {
    const relativePath = path.relative(publicDir, filePath).replace(/\\/g, '/');
    return !path.basename(filePath).startsWith('.') && !isLocalOnly(relativePath);
  });
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  const seenPaths = new Set();

  console.log(`🚀 Synchronisation de ${files.length} médias vers Cloudinary${DRY_RUN ? ' (dry-run)' : ''}${FORCE ? ' (force)' : ''}`);

  for (const filePath of files) {
    const relativePath = path.relative(publicDir, filePath).replace(/\\/g, '/');
    const publicId = publicIdFor(relativePath);
    const hash = fileHash(filePath);
    seenPaths.add(relativePath);
    const previous = manifest[relativePath];
    const previousHash = typeof previous === 'string' ? previous : previous?.hash;

    if (!FORCE && previousHash === hash) {
      skipped++;
      continue;
    }

    try {
      console.log(`⏳ ${relativePath} → ${publicId} (${resourceTypeFor(relativePath)})`);
      const result = await uploadFile(filePath, relativePath);
      manifest[relativePath] = { hash, publicId, resourceType: resourceTypeFor(relativePath), updatedAt: new Date().toISOString() };
      console.log(`  ✅ ${result.secure_url}`);
      uploaded++;
    } catch (error) {
      console.error(`  ❌ ${relativePath}: ${error.message}`);
      failed++;
    }
  }

  for (const knownPath of Object.keys(manifest)) {
    if (!seenPaths.has(knownPath)) delete manifest[knownPath];
  }
  if (!DRY_RUN) fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nTerminé — envoyés: ${uploaded}, inchangés: ${skipped}, échecs: ${failed}`);
  if (failed) process.exitCode = 1;
}

uploadAll().catch((error) => { console.error(`❌ ${error.message}`); process.exitCode = 1; });
