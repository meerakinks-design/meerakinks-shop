/**
 * Seed idempotent : relancer `npm run db:seed` ne duplique rien et n'écrase aucun réglage existant.
 *
 *   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD   obligatoires (compte propriétaire)
 *   SEED_ADMIN_NAME, SEED_STORE_NAME, SEED_SELLER_WHATSAPP   facultatifs
 *   SEED_CONTACT_EMAIL, SEED_INSTAGRAM_URL, SEED_TIKTOK_URL, SEED_FACEBOOK_URL   facultatifs (landing, pied de page)
 *   SEED_RESET_PASSWORD=1   réinitialise le mot de passe d'un compte déjà existant
 *   SEED_DEMO=1             ajoute des produits de démonstration (refusé en production)
 *
 * Le mot de passe n'est lu qu'ici, en local, puis haché : il n'existe pas dans l'environnement
 * de production.
 */
import { PrismaClient, ZoneType } from '@prisma/client';
import { emailField, newPasswordSchema } from '../src/lib/validation/auth.schema';
import { hashPassword } from '../src/server/auth/password';

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
  const email = emailField.parse(requireEnv('SEED_ADMIN_EMAIL'));
  const password = newPasswordSchema.parse(requireEnv('SEED_ADMIN_PASSWORD'));
  const name = process.env.SEED_ADMIN_NAME?.trim() || 'Propriétaire';

  const existing = await prisma.adminUser.findUnique({ where: { email }, select: { id: true } });
  if (!existing) {
    await prisma.adminUser.create({ data: { email, name, passwordHash: await hashPassword(password), role: 'OWNER' } });
    console.info('Compte admin créé.');
    return email;
  }
  if (process.env.SEED_RESET_PASSWORD === '1') {
    await prisma.adminUser.update({ where: { id: existing.id }, data: { passwordHash: await hashPassword(password) } });
    await prisma.adminSession.deleteMany({ where: { adminUserId: existing.id } }); // révoque les sessions ouvertes
    console.info('Mot de passe réinitialisé, sessions révoquées.');
  } else {
    console.info('Compte admin déjà présent : inchangé (SEED_RESET_PASSWORD=1 pour réinitialiser).');
  }
  return email;
}

async function seedSettings(notificationEmail: string) {
  // `update: {}` : on ne réécrase jamais des paramètres déjà saisis par la vendeuse.
  await prisma.storeSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      storeName: process.env.SEED_STORE_NAME?.trim() || 'Ma boutique',
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
