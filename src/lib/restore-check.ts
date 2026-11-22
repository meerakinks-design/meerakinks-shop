// Contrôle d'une restauration de base (sauvegardes Neon, cahier §10.2). Fonctions pures : le script
// `scripts/verify-restore.ts` lit la base, ce fichier décrit et compare. Rien ici ne contient de donnée personnelle :
// uniquement des compteurs et des dates.

export interface RestoreSnapshot {
  takenAt: string;
  /** Hôte et nom de la base, jamais l'identifiant ni le mot de passe. */
  target: string;
  counts: Record<string, number>;
  /** Date la plus récente de chaque table suivie (null = table vide). */
  latest: Record<string, string | null>;
  /** Migrations Prisma appliquées (null = table `_prisma_migrations` absente). */
  migrations: number | null;
}

export interface SnapshotDifference {
  key: string;
  saved: string | number | null;
  restored: string | number | null;
}

/** « host/base » à partir d'une URL PostgreSQL, sans identifiants. Une URL illisible donne « (URL illisible) ». */
export function describeDatabaseTarget(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return '(URL illisible)';
  }
}

/** Différences entre un état enregistré avant l'incident et l'état de la base restaurée. */
export function compareSnapshots(saved: RestoreSnapshot, restored: RestoreSnapshot): { identical: boolean; differences: SnapshotDifference[] } {
  const differences: SnapshotDifference[] = [];
  const compare = (prefix: string, left: Record<string, string | number | null>, right: Record<string, string | number | null>) => {
    for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
      const a = left[key] ?? null;
      const b = right[key] ?? null;
      if (a !== b) differences.push({ key: `${prefix}.${key}`, saved: a, restored: b });
    }
  };
  compare('counts', saved.counts, restored.counts);
  compare('latest', saved.latest, restored.latest);
  if (saved.migrations !== restored.migrations) differences.push({ key: 'migrations', saved: saved.migrations, restored: restored.migrations });
  return { identical: differences.length === 0, differences };
}

export function isRestoreSnapshot(value: unknown): value is RestoreSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.takenAt === 'string' &&
    typeof candidate.target === 'string' &&
    typeof candidate.counts === 'object' && candidate.counts !== null &&
    typeof candidate.latest === 'object' && candidate.latest !== null &&
    (candidate.migrations === null || typeof candidate.migrations === 'number')
  );
}
