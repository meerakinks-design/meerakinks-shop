import type { Metadata } from 'next';
import Link from 'next/link';
import { UtmLinkBuilder } from '@/components/admin/UtmLinkBuilder';
import { PERIOD_CHOICES, parsePeriod, type Counted } from '@/lib/analytics/aggregate';
import { formatAbidjanDateTime, formatDuration } from '@/lib/analytics/classify';
import { EVENT_LABELS, TARGET_LABELS, isTrackTarget, type StoredEventType } from '@/lib/analytics/events';
import { ADMIN_HOME_PATH } from '@/lib/constants/auth';
import { HOME_ANALYTICS_ENABLED } from '@/lib/constants/features';
import { ANALYTICS_DETAIL_RETENTION_DAYS } from '@/lib/constants/retention';
import { absoluteUrl } from '@/lib/shop/seo';
import { requireAdminPage } from '@/server/auth/guards';
import { getAnalyticsOverview, getVisitorJourney } from '@/server/services/analytics-stats.service';

export const metadata: Metadata = { title: 'Analytics' };
export const dynamic = 'force-dynamic';

type SearchParams = { jours?: string | string[]; visiteur?: string | string[] };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card stat">
      <p className="help-text">{label}</p>
      <p className="stat-value">{value}</p>
      {hint && <p className="help-text">{hint}</p>}
    </div>
  );
}

function Ranking({ title, rows, empty = 'Aucune donnée sur la période.' }: { title: string; rows: Counted[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="card stack" aria-label={title}>
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="help-text">{empty}</p>
      ) : (
        <ul className="plain-list rank-list">
          {rows.map((row) => (
            <li key={row.label}>
              <span className="rank-label">{row.label}</span>
              <span className="rank-bar" aria-hidden="true">
                <span style={{ width: `${Math.max(4, Math.round((row.count / max) * 100))}%` }} />
              </span>
              <span className="rank-count">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdminPage();
  if (admin.role !== 'OWNER') {
    return (
      <main>
        <div className="page-head">
          <h1>Analytics</h1>
        </div>
        <p>Cette page est réservée au compte propriétaire.</p>
        <p>
          <Link href={ADMIN_HOME_PATH}>Retour au tableau de bord</Link>
        </p>
      </main>
    );
  }

  const visitorId = first(searchParams.visiteur);
  if (visitorId) {
    const journey = await getVisitorJourney(visitorId);
    return (
      <main>
        <div className="page-head">
          <h1>Parcours d’un visiteur</h1>
        </div>
        <p>
          <Link href="/admin/analytics">← Retour aux statistiques</Link>
        </p>
        {!journey ? (
          <p>Ce visiteur n’existe plus (détail supprimé après {ANALYTICS_DETAIL_RETENTION_DAYS} jours, ou refus de la mesure).</p>
        ) : (
          <>
            <p className="help-text">
              {journey.visitor.place} · {journey.visitor.source} · {journey.visitor.device}, {journey.visitor.browser} · {formatDuration(journey.visitor.durationSeconds)} actif au total
            </p>
            <ol className="card journey">
              {journey.steps.map((step) => {
                const type = step.type as StoredEventType;
                const detail = step.type === 'click' ? (isTrackTarget(step.target) ? TARGET_LABELS[step.target] : step.target) : (step.path ?? '');
                return (
                  <li key={step.id}>
                    <time dateTime={step.occurredAt.toISOString()}>{formatAbidjanDateTime(step.occurredAt)}</time>
                    <span>
                      {EVENT_LABELS[type] ?? step.type}
                      {detail ? ` — ${detail}` : ''}
                      {step.durationSeconds ? ` (${formatDuration(step.durationSeconds)})` : ''}
                    </span>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </main>
    );
  }

  const days = parsePeriod(searchParams.jours);
  const overview = await getAnalyticsOverview(days);
  const maxDay = Math.max(1, ...overview.perDay.map((day) => day.count));

  return (
    <main>
      <div className="page-head">
        <h1>Analytics</h1>
      </div>

      {!HOME_ANALYTICS_ENABLED && (
        <p className="card" role="status">
          La mesure des visites est désactivée sur ce déploiement : rien n’est enregistré. Pour l’activer, définissez <code>NEXT_PUBLIC_HOME_ANALYTICS_ENABLED=1</code>, puis publiez à nouveau (la politique de cookies s’adapte toute seule).
        </p>
      )}
      <p className="help-text">
        Visites des personnes qui ont <strong>accepté</strong> les statistiques anonymes. Aucune adresse IP n’est conservée ; le détail est supprimé au bout de {ANALYTICS_DETAIL_RETENTION_DAYS} jours.
      </p>

      <nav aria-label="Période" className="admin-nav">
        {PERIOD_CHOICES.map((choice) => (
          <Link key={choice} href={`/admin/analytics?jours=${choice}`} aria-current={choice === days ? 'page' : undefined}>
            {choice} jours
          </Link>
        ))}
      </nav>

      <div className="stat-grid">
        <Stat label="Visiteurs" value={String(overview.visitors)} hint={`${overview.newVisitors} nouveaux · ${overview.returningVisitors} de retour`} />
        <Stat label="Visites" value={String(overview.visits)} />
        <Stat label="Pages vues" value={String(overview.pageViews)} />
        <Stat label="Durée moyenne d’une visite" value={overview.avgVisitSeconds === null ? '—' : formatDuration(overview.avgVisitSeconds)} />
      </div>

      <section className="card stack" aria-label="Visites par jour">
        <h2>Visites par jour</h2>
        <div className="day-chart" role="img" aria-label={`Visites par jour sur ${days} jours : ${overview.perDay.reduce((sum, day) => sum + day.count, 0)} au total`}>
          {overview.perDay.map((day) => (
            <span key={day.day} className="day-bar" title={`${day.day} : ${day.count}`} style={{ height: `${Math.max(2, Math.round((day.count / maxDay) * 100))}%` }} />
          ))}
        </div>
      </section>

      <div className="stat-grid">
        <Ranking title="Provenance" rows={overview.sources} />
        <Ranking title="Pays" rows={overview.countries} />
        <Ranking title="Villes" rows={overview.cities} />
        <Ranking title="Appareils" rows={overview.devices} />
        <Ranking title="Navigateurs" rows={overview.browsers} />
        <Ranking title="Pages les plus vues" rows={overview.topPages} />
        <Ranking title="Boutons les plus touchés" rows={overview.topClicks} />
      </div>

      <section className="card stack" aria-label="Parcours d’achat">
        <h2>Parcours d’achat</h2>
        <ol className="plain-list funnel">
          {overview.funnel.map((step) => (
            <li key={step.key}>
              <span>{step.label}</span>
              <strong>{step.visitors}</strong>
              <span className="help-text">{step.fromPrevious === null ? '' : `${step.fromPrevious} % de l’étape précédente`}</span>
            </li>
          ))}
        </ol>
        <p className="help-text">Visiteurs distincts par étape. Aucun montant ni lien avec une commande ou un client.</p>
      </section>

      <section className="card stack" aria-label="Derniers visiteurs">
        <h2>Derniers visiteurs</h2>
        {overview.recent.length === 0 ? (
          <p className="help-text">Aucun visiteur pour l’instant.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Dernière activité</th>
                  <th>Zone</th>
                  <th>Provenance</th>
                  <th>Appareil</th>
                  <th>Durée</th>
                  <th>Actions</th>
                  <th>
                    <span className="sr-only">Parcours</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {overview.recent.map((visitor) => (
                  <tr key={visitor.id}>
                    <td>{formatAbidjanDateTime(visitor.lastSeenAt)}</td>
                    <td>{visitor.place}</td>
                    <td>{visitor.source}</td>
                    <td>
                      {visitor.device} · {visitor.browser}
                    </td>
                    <td>{formatDuration(visitor.durationSeconds)}</td>
                    <td>{visitor.eventCount}</td>
                    <td>
                      <Link href={`/admin/analytics?visiteur=${encodeURIComponent(visitor.id)}`}>Voir le parcours</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <UtmLinkBuilder siteUrl={absoluteUrl('/')?.replace(/\/$/, '') ?? ''} />
    </main>
  );
}
