/**
 * Contrôle d'une base (restaurée ou non) : compte les lignes de chaque table et relève la date la plus récente.
 * LECTURE SEULE : aucune écriture, aucune donnée personnelle affichée ni enregistrée (compteurs et dates seulement).
 *
 *   # 1. AVANT l'essai : enregistrer l'état de la base de production
 *   npx tsx scripts/verify-restore.ts --url "<URL Neon de production>" --save etat-avant.json
 *
 *   # 2. APRÈS la restauration (sur la branche ou le projet de test) : comparer
 *   npx tsx scripts/verify-restore.ts --url "<URL Neon de la base restaurée>" --compare etat-avant.json
 *
 * Sans --url, lit DATABASE_URL. Code de sortie : 0 = rien à signaler (ou simple affichage), 1 = différences ou erreur.
 * Le fichier enregistré ne contient que des compteurs : il ne doit pas être publié pour autant (il décrit l'activité).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { compareSnapshots, describeDatabaseTarget, isRestoreSnapshot, type RestoreSnapshot } from '../src/lib/restore-check';

function readArgs(argv: string[]) {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag?.startsWith('--')) {
      const next = argv[index + 1];
      if (next !== undefined && !next.startsWith('--')) {
        values.set(flag.slice(2), next);
        index += 1;
      } else values.set(flag.slice(2), '');
    }
  }
  return values;
}

async function takeSnapshot(prisma: PrismaClient, target: string): Promise<RestoreSnapshot> {
  const [products, categories, customers, anonymizedCustomers, orders, orderItems, payments, receipts, emails, admins, auditLogs, zones] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.customer.count(),
    prisma.customer.count({ where: { anonymizedAt: { not: null } } }),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.payment.count(),
    prisma.receipt.count(),
    prisma.emailNotification.count(),
    prisma.adminUser.count(),
    prisma.adminAuditLog.count(),
    prisma.deliveryZone.count(),
  ]);
  const [lastOrder, lastPayment, lastReceipt, lastAudit, lastProduct] = await Promise.all([
    prisma.order.aggregate({ _max: { createdAt: true } }),
    prisma.payment.aggregate({ _max: { receivedAt: true } }),
    prisma.receipt.aggregate({ _max: { issuedAt: true } }),
    prisma.adminAuditLog.aggregate({ _max: { createdAt: true } }),
    prisma.product.aggregate({ _max: { updatedAt: true } }),
  ]);
  const iso = (date: Date | null) => (date ? date.toISOString() : null);

  let migrations: number | null = null;
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
    migrations = rows[0]?.count ?? 0;
  } catch {
    migrations = null;
  }

  return {
    takenAt: new Date().toISOString(),
    target,
    counts: {
      products, categories, deliveryZones: zones, customers, anonymizedCustomers, orders, orderItems, payments, receipts,
      emailNotifications: emails, adminUsers: admins, auditLogs,
    },
    latest: {
      order: iso(lastOrder._max.createdAt),
      payment: iso(lastPayment._max.receivedAt),
      receipt: iso(lastReceipt._max.issuedAt),
      auditLog: iso(lastAudit._max.createdAt),
      productUpdate: iso(lastProduct._max.updatedAt),
    },
    migrations,
  };
}

function print(snapshot: RestoreSnapshot) {
  console.log(`Base contrôlée : ${snapshot.target}`);
  console.log(`Migrations appliquées : ${snapshot.migrations ?? 'table _prisma_migrations absente'}`);
  console.log('\nLignes par table :');
  for (const [key, value] of Object.entries(snapshot.counts)) console.log(`  ${key.padEnd(20)} ${value}`);
  console.log('\nDonnée la plus récente :');
  for (const [key, value] of Object.entries(snapshot.latest)) console.log(`  ${key.padEnd(20)} ${value ?? '(aucune)'}`);
}

async function main(): Promise<number> {
  const args = readArgs(process.argv.slice(2));
  const url = args.get('url') || process.env.DATABASE_URL;
  if (!url) {
    console.error('Indique la base à contrôler : --url "<URL PostgreSQL>" (ou la variable DATABASE_URL).');
    return 1;
  }

  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    const snapshot = await takeSnapshot(prisma, describeDatabaseTarget(url));
    print(snapshot);

    const savePath = args.get('save');
    if (savePath) {
      writeFileSync(savePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
      console.log(`\nÉtat enregistré dans ${savePath}`);
    }

    const comparePath = args.get('compare');
    if (comparePath) {
      const saved: unknown = JSON.parse(readFileSync(comparePath, 'utf8'));
      if (!isRestoreSnapshot(saved)) {
        console.error(`\n${comparePath} n'est pas un état enregistré par ce script.`);
        return 1;
      }
      const { identical, differences } = compareSnapshots(saved, snapshot);
      console.log(`\nComparaison avec l'état enregistré le ${saved.takenAt} (base ${saved.target}) :`);
      if (identical) {
        console.log('  Identique : la restauration contient bien tout ce qui était enregistré.');
        return 0;
      }
      for (const difference of differences) console.log(`  ${difference.key.padEnd(28)} avant : ${difference.saved ?? '(vide)'}  →  restauré : ${difference.restored ?? '(vide)'}`);
      console.log('\nDes différences sont NORMALES si la base a continué de vivre entre l\'enregistrement et la restauration, ou si tu as restauré à un instant plus ancien. Elles ne le sont pas pour un essai fait juste après l\'enregistrement.');
      return 1;
    }
    return 0;
  } catch (error) {
    console.error('Contrôle impossible :', error instanceof Error ? error.message : error);
    return 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().then((code) => process.exit(code));
