/**
 * Seed idempotent : relancer `npm run db:seed` ne duplique rien et n'écrase aucun réglage existant.
 *
 *   ADMIN_EMAIL / ADMIN_PASSWORD   obligatoires : compte propriétaire (les mêmes variables que le serveur lit à la connexion).
 *                                  Anciens noms SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD acceptés si les nouveaux sont absents.
 *   ADMIN_NAME (ou SEED_ADMIN_NAME), SEED_STORE_NAME, SEED_SELLER_WHATSAPP   facultatifs
 *   SEED_CONTACT_EMAIL, SEED_INSTAGRAM_URL, SEED_TIKTOK_URL, SEED_FACEBOOK_URL   facultatifs (landing, pied de page)
 *   SEED_DEMO=1             ajoute des produits de démonstration (refusé en production)
 *
 * L'environnement fait foi : si le compte existe déjà avec un autre mot de passe, il est réaligné sur ADMIN_PASSWORD
 * et les sessions ouvertes sont fermées. Seul le hash bcrypt est enregistré en base.
 */
import { PrismaClient, ZoneType } from '@prisma/client';
import { readEnvAdminConfig, syncEnvAdmin } from '../src/server/auth/env-admin';

const prisma = new PrismaClient();

// Les 13 communes du district d'Abidjan. Frais à null = « à confirmer ».
// À ajuster selon la réponse C1 du questionnaire (communes réellement desservies).
const ABIDJAN_COMMUNES = [
  'Abobo', 'Adjamé', 'Anyama', 'Attécoubé', 'Bingerville', 'Cocody', 'Koumassi',
  'Marcory', 'Plateau', 'Port-Bouët', 'Songon', 'Treichville', 'Yopougon',
];

const PLACEHOLDER_WHATSAPP = 'À configurer';

/** Adresse https facultative : une valeur invalide fait échouer le seed plutôt que d'afficher un lien cassé. */
function optionalUrl(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value) return null;
  const url = new URL(value); // lève une erreur si ce n'est pas une adresse
  if (url.protocol !== 'https:') throw new Error(`${name} doit commencer par https://`);
  return url.toString();
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable manquante : ${name}`);
  return value;
}

async function seedAdmin() {
  const config = readEnvAdminConfig({
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD,
    ADMIN_NAME: process.env.ADMIN_NAME || process.env.SEED_ADMIN_NAME,
  });
  if (config.status === 'absent') throw new Error('Variables manquantes : ADMIN_EMAIL et ADMIN_PASSWORD (voir .env.example).');
  if (config.status === 'invalid') throw new Error(config.problems.join(' '));

  const result = await syncEnvAdmin(prisma, config);
  const messages = {
    created: 'Compte admin créé.',
    updated: 'Compte admin mis à jour d’après l’environnement (mot de passe, nom ou rôle) ; sessions ouvertes fermées si le mot de passe a changé.',
    unchanged: 'Compte admin déjà à jour : inchangé.',
  } as const;
  console.info(messages[result]);
  return config.email;
}

async function seedSettings(notificationEmail: string) {
  // `update: {}` : on ne réécrase jamais des paramètres déjà saisis par la vendeuse.
  await prisma.storeSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      storeName: process.env.SEED_STORE_NAME?.trim() || 'MEËRA KINKS',
      sellerWhatsApp: process.env.SEED_SELLER_WHATSAPP?.trim() || PLACEHOLDER_WHATSAPP,
      notificationEmail,
      contactEmail: process.env.SEED_CONTACT_EMAIL?.trim() || null,
      instagramUrl: optionalUrl('SEED_INSTAGRAM_URL'),
      tiktokUrl: optionalUrl('SEED_TIKTOK_URL'),
      facebookUrl: optionalUrl('SEED_FACEBOOK_URL'),
    },
  });
}

async function seedZones() {
  for (const [position, name] of ABIDJAN_COMMUNES.entries()) {
    await prisma.deliveryZone.upsert({
      where: { type_name: { type: ZoneType.ABIDJAN, name } },
      update: {},
      create: { type: ZoneType.ABIDJAN, name, position, fee: null },
    });
  }
}

async function seedDemoProducts() {
  if (process.env.NODE_ENV === 'production') throw new Error('SEED_DEMO est refusé en production.');
  const category = await prisma.category.upsert({
    where: { slug: 'demo' },
    update: {},
    create: { name: 'Démo', slug: 'demo' },
  });
  const demoProducts = [
    { slug: 'produit-demo-1', name: 'Produit démo 1', price: 5000 },
    { slug: 'produit-demo-2', name: 'Produit démo 2', price: 12500 },
    { slug: 'pack-demo', name: 'Pack démo', price: 27500 },
  ];
  for (const [sortOrder, product] of demoProducts.entries()) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        ...product,
        description: 'Produit de démonstration, à supprimer avant la mise en ligne.',
        characteristics: ['Exemple de caractéristique'],
        status: 'PUBLISHED' as const,
        publishedAt: new Date(),
        isFeatured: sortOrder < 2,
        sortOrder,
        categoryId: category.id,
      },
    });
  }
  // Démo : le premier produit devient le « Focus produit » de la landing, sans écraser un choix existant.
  const focus = await prisma.product.findUnique({ where: { slug: 'produit-demo-1' }, select: { id: true } });
  if (focus) await prisma.storeSettings.updateMany({ where: { id: 'singleton', focusProductId: null }, data: { focusProductId: focus.id } });
}

async function main() {
  const adminEmail = await seedAdmin();
  await seedSettings(adminEmail);
  await seedZones();
  if (process.env.SEED_DEMO === '1') await seedDemoProducts();
  console.info('Seed terminé.');
}

main()
  .catch((error) => {
    // Le message de zod / Prisma ne contient pas la valeur du mot de passe.
    console.error('Seed échoué :', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
