import type { Prisma } from '@prisma/client';
import type { AuditAction, AuditDetails } from '@/lib/constants/audit';
import { prisma } from '@/server/db';

/** Le client global ou celui d'une transaction interactive (`prisma.$transaction(async (tx) => …)`). */
type AuditClient = Pick<Prisma.TransactionClient, 'adminAuditLog'>;

export interface AuditEntry {
  action: AuditAction;
  /** null = tâche planifiée. */
  adminUserId: string | null;
  details?: AuditDetails;
}

/**
 * Ligne de journal prête à être jointe à une transaction : `prisma.$transaction([modifierQuelqueChose, auditEntry(...)])`.
 * L'action et ce qu'elle a changé sont alors enregistrées ensemble, ou pas du tout.
 */
export function auditEntry(entry: AuditEntry, client: AuditClient = prisma) {
  return client.adminAuditLog.create({
    data: { action: entry.action, adminUserId: entry.adminUserId, ...(entry.details ? { details: entry.details } : {}) },
    select: { id: true },
  });
}

/** Journalise une action hors transaction. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  await auditEntry(entry);
}
