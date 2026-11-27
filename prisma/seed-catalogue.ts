/**
 * Catalogue Meëra Kinks d'après le « Dossier produit » v1.1 : 3 catégories (nos soins, nos duos, la gamme complète) et
 * 10 produits (6 soins, 3 duos, la gamme complète), avec leurs prix, leurs textes et leurs photos.
 *
 *   npm run db:seed:catalogue                 crée ce qui manque ; ne modifie AUCUN produit déjà présent
 *   npm run db:seed:catalogue -- --sync       réaligne aussi les produits présents (nom, textes, prix, ordre, catégorie, photos
 *                                             du seed) sur le dossier ; ne touche jamais au stock, au statut, à la date de
 *                                             publication ni aux photos envoyées par la vendeuse depuis le back-office
 *   npm run db:seed:catalogue -- --dry-run    affiche le plan sans rien écrire ni envoyer
 *
 * Les prix : un soin garde son prix ; une offre (duo, gamme complète) enregistre l'ancien prix (somme des prix séparés) comme
 * prix normal et le prix réel comme prix promotionnel. Le client paie donc toujours le prix réel, calculé par le serveur.
 *
 * Les photos (public/products/*.webp) sont envoyées chez Cloudinary dans le dossier des photos de produits (boutique/products,
 * identifiants fixes, jamais de doublon) : c'est ce que le back-office exige pour pouvoir ensuite modifier le produit.
 * Variables lues : DATABASE_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET (.env puis .env.local,
 * jamais écrites dans les journaux). Sans Cloudinary, les photos locales sont enregistrées (affichage correct) mais le
 * back-office refusera d'enregistrer ces produits tant que leurs photos ne sont pas renvoyées : relancer avec --sync une fois
 * Cloudinary configuré.
 */
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { CATALOGUE_CATEGORIES } from '../src/content/catalogue';
import { SEED_ROWS, canReplaceImages, planSeed, type CatalogueSeedRow } from '../src/lib/shop/catalogue';
import { signCloudinaryParams } from '../src/server/integrations/cloudinary';

const root = path.join(__dirname, '..');

/** .env puis .env.local (celui-ci l'emporte), sans dépendance externe : même principe que scripts/upload-cloudinary.js. */
function loadLocalEnv(): void {
  for (const file of ['.env', '.env.local']) {
    const envPath = path.join(root, file);
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const equals = trimmed.indexOf('=');
      if (equals === -1) continue;
      const key = trimmed.slice(0, equals).trim();
      let value = trimmed.slice(equals + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (file === '.env.local' || !(key in process.env)) process.env[key] = value;
    }
  }
}

loadLocalEnv();

const SYNC = process.argv.includes('--sync');
const DRY_RUN = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

function readCloudinaryConfig(): CloudinaryConfig | null {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

/** Envoi signé d'une photo ; identifiant fixe + overwrite : relançable sans doublon. Rend l'adresse https de la photo. */
async function uploadToCloudinary(config: CloudinaryConfig, image: CatalogueSeedRow['images'][number]): Promise<string> {
  const file = readFileSync(path.join(root, 'public', image.path));
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { overwrite: 'true', public_id: image.publicId, timestamp };
  const form = new FormData();
  form.set('file', new Blob([file], { type: 'image/webp' }), image.file);
  form.set('api_key', config.apiKey);
  form.set('timestamp', String(timestamp));
  form.set('public_id', image.publicId);
  form.set('overwrite', 'true');
  form.set('signature', signCloudinaryParams(signed, config.apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, { method: 'POST', body: form });
  const body = (await response.json().catch(() => null)) as { secure_url?: string; error?: { message?: string } } | null;
  if (!response.ok || !body?.secure_url) throw new Error(`Cloudinary a refusé ${image.file} (${response.status}) : ${body?.error?.message ?? 'réponse inattendue'}`);
  return body.secure_url;
}

type ResolvedImage = { url: string; publicId: string; alt: string };

/** Adresse de chaque photo : Cloudinary si configuré, sinon le fichier local du site (affichage correct, mais non modifiable en back-office). */
async function resolveImages(row: CatalogueSeedRow, cloudinary: CloudinaryConfig | null): Promise<ResolvedImage[]> {
  const images: ResolvedImage[] = [];
  for (const image of row.images) {
    const url = cloudinary ? await uploadToCloudinary(cloudinary, image) : image.path;
    images.push({ url, publicId: image.publicId, alt: image.alt });
  }
  return images;
}

async function seedCategories(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const category of CATALOGUE_CATEGORIES) {
    const data = { name: category.name, description: category.description, accentColor: category.accentColor, position: category.position };
    const existing = await prisma.category.findUnique({ where: { slug: category.slug }, select: { id: true } });
    if (existing) {
      if (SYNC && !DRY_RUN) await prisma.category.update({ where: { id: existing.id }, data });
      ids.set(category.slug, existing.id);
      console.info(`Catégorie « ${category.name} » : ${SYNC ? 'réalignée' : 'déjà présente, laissée telle quelle'}.`);
    } else if (DRY_RUN) {
      ids.set(category.slug, `(à créer : ${category.slug})`);
      console.info(`Catégorie « ${category.name} » : à créer.`);
    } else {
      const created = await prisma.category.create({ data: { slug: category.slug, ...data }, select: { id: true } });
      ids.set(category.slug, created.id);
      console.info(`Catégorie « ${category.name} » : créée.`);
    }
  }
  return ids;
}

const scalarData = (row: CatalogueSeedRow, categoryId: string) => ({
  name: row.name,
  description: row.description,
  characteristics: row.characteristics,
  usageAdvice: row.usageAdvice,
  price: row.price,
  salePrice: row.salePrice,
  seoTitle: row.seoTitle,
  metaDescription: row.metaDescription,
  sortOrder: row.sortOrder,
  categoryId,
});

async function main() {
  const cloudinary = readCloudinaryConfig();
  console.info(
    `${DRY_RUN ? '[simulation] ' : ''}Catalogue Meëra Kinks : ${SEED_ROWS.length} produits. Photos : ${cloudinary ? 'envoi chez Cloudinary' : 'fichiers locaux (Cloudinary non configuré : le back-office refusera d’enregistrer ces produits avant l’envoi des photos)'}.`,
  );

  const categoryIds = await seedCategories();
  const existingRows = await prisma.product.findMany({ where: { slug: { in: SEED_ROWS.map((row) => row.slug) } }, select: { slug: true, id: true } });
  const idBySlug = new Map(existingRows.map((row) => [row.slug, row.id]));
  const plan = planSeed(idBySlug.keys(), SYNC);

  for (const row of plan.keep) console.info(`  = ${row.slug} : déjà présent, laissé tel quel (--sync pour le réaligner).`);

  for (const row of plan.create) {
    const categoryId = categoryIds.get(row.categorySlug);
    if (!categoryId) throw new Error(`Catégorie « ${row.categorySlug} » introuvable pour ${row.slug}.`);
    if (DRY_RUN) {
      console.info(`  + ${row.slug} : à créer (${row.salePrice ?? row.price} FCFA, ${row.images.length} photo${row.images.length > 1 ? 's' : ''}).`);
      continue;
    }
    const images = await resolveImages(row, cloudinary);
    await prisma.product.create({
      data: {
        slug: row.slug,
        ...scalarData(row, categoryId),
        status: 'PUBLISHED',
        publishedAt: new Date(),
        stock: null, // stock non suivi : jamais « épuisé » tant que la vendeuse n'en saisit pas un
        images: { create: images.map((image, position) => ({ ...image, position })) },
      },
    });
    console.info(`  + ${row.slug} : créé.`);
  }

  for (const row of plan.update) {
    const id = idBySlug.get(row.slug)!;
    const categoryId = categoryIds.get(row.categorySlug);
    if (!categoryId) throw new Error(`Catégorie « ${row.categorySlug} » introuvable pour ${row.slug}.`);
    const currentImages = await prisma.productImage.findMany({ where: { productId: id }, select: { publicId: true } });
    const replaceImages = canReplaceImages(currentImages.map((image) => image.publicId), row);
    if (DRY_RUN) {
      console.info(`  ~ ${row.slug} : à réaligner${replaceImages ? ' (photos comprises)' : ' (photos de la vendeuse conservées)'}.`);
      continue;
    }
    const images = replaceImages ? await resolveImages(row, cloudinary) : [];
    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: scalarData(row, categoryId) });
      if (replaceImages) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({ data: images.map((image, position) => ({ ...image, productId: id, position })) });
      }
    });
    console.info(`  ~ ${row.slug} : réaligné${replaceImages ? '' : ' (photos de la vendeuse conservées)'}.`);
  }

  console.info(`${DRY_RUN ? '[simulation] ' : ''}Terminé : ${plan.create.length} créé(s), ${plan.update.length} réaligné(s), ${plan.keep.length} laissé(s) tel(s) quel(s).`);
  if (!DRY_RUN) console.info('La landing et les fiches se rafraîchissent dans l’heure (ou à la prochaine modification en back-office).');
}

main()
  .catch((error) => {
    // Jamais le secret Cloudinary ni l'URL de la base : seulement le message.
    console.error('Seed du catalogue échoué :', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
