import { PrismaClient } from '@prisma/client';

// Un seul client par processus : en développement, le rechargement à chaud recréerait
// une connexion à chaque modification et finirait par saturer la base.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
