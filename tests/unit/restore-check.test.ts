import { describe, expect, it } from 'vitest';
import { compareSnapshots, describeDatabaseTarget, isRestoreSnapshot, type RestoreSnapshot } from '@/lib/restore-check';

const snapshot = (overrides: Partial<RestoreSnapshot> = {}): RestoreSnapshot => ({
  takenAt: '2026-11-20T10:00:00.000Z',
  target: 'ep-cool-123.eu-central-1.aws.neon.tech/shop',
  counts: { orders: 42, customers: 30, receipts: 40 },
  latest: { order: '2026-11-19T18:00:00.000Z', payment: null },
  migrations: 3,
  ...overrides,
});

describe('describeDatabaseTarget', () => {
  it('ne garde que l’hôte et le nom de la base, jamais l’identifiant ni le mot de passe', () => {
    const target = describeDatabaseTarget('postgresql://neondb_owner:S3cr3t!@ep-cool-123.eu-central-1.aws.neon.tech/shop?sslmode=require');
    expect(target).toBe('ep-cool-123.eu-central-1.aws.neon.tech/shop');
    expect(target).not.toContain('S3cr3t');
    expect(target).not.toContain('neondb_owner');
  });

  it('ne laisse rien filtrer quand l’URL est illisible', () => {
    expect(describeDatabaseTarget('pas une url avec mot-de-passe')).toBe('(URL illisible)');
  });
});

describe('compareSnapshots', () => {
  it('reconnaît deux états identiques', () => {
    expect(compareSnapshots(snapshot(), snapshot({ takenAt: '2026-11-20T11:00:00.000Z', target: 'autre/base' }))).toEqual({ identical: true, differences: [] });
  });

  it('liste chaque compteur, date ou migration qui diffère', () => {
    const restored = snapshot({
      counts: { orders: 40, customers: 30, receipts: 40 },
      latest: { order: '2026-11-18T09:00:00.000Z', payment: null },
      migrations: 2,
    });
    const { identical, differences } = compareSnapshots(snapshot(), restored);
    expect(identical).toBe(false);
    expect(differences).toEqual([
      { key: 'counts.orders', saved: 42, restored: 40 },
      { key: 'latest.order', saved: '2026-11-19T18:00:00.000Z', restored: '2026-11-18T09:00:00.000Z' },
      { key: 'migrations', saved: 3, restored: 2 },
    ]);
  });

  it('signale une table présente d’un seul côté', () => {
    const { differences } = compareSnapshots(snapshot(), snapshot({ counts: { orders: 42, customers: 30, receipts: 40, auditLogs: 2 } }));
    expect(differences).toEqual([{ key: 'counts.auditLogs', saved: null, restored: 2 }]);
  });

  it('distingue une table vide (0) d’une table absente (null)', () => {
    const { differences } = compareSnapshots(snapshot({ counts: { orders: 0 } }), snapshot({ counts: {} }));
    expect(differences).toEqual([{ key: 'counts.orders', saved: 0, restored: null }]);
  });
});

describe('isRestoreSnapshot', () => {
  it('accepte un état valide et refuse le reste', () => {
    expect(isRestoreSnapshot(snapshot())).toBe(true);
    expect(isRestoreSnapshot(snapshot({ migrations: null }))).toBe(true);
    for (const value of [null, undefined, 'x', 12, {}, { takenAt: 'x' }, { ...snapshot(), counts: null }, { ...snapshot(), migrations: 'trois' }]) {
      expect(isRestoreSnapshot(value)).toBe(false);
    }
  });
});
