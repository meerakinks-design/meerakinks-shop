'use client';

import { useMemo, useState } from 'react';
import { lastPoints, seriesTotal, type SeriesPoint } from '@/lib/admin-series';
import { formatSeriesValue, type SeriesUnit } from '@/lib/admin-chart-format';
import { TrendChart } from './TrendChart';

/** Un indicateur : la tuile (valeur + légende) et, s'il a une courbe, ce qu'il faut pour la tracer. */
export interface KpiItem {
  key: string;
  /** Légende de la tuile (« commandes à traiter », « Visiteurs »…). */
  label: string;
  /** Valeur déjà mise en forme côté serveur (« 12 500 FCFA »). */
  value: string;
  hint?: string;
  /** Tuile d'alerte (fond marron) : le nombre qui demande une action. */
  main?: boolean;
  /** Sans courbe, la tuile reste une simple carte. */
  series?: SeriesPoint[];
  unit?: SeriesUnit;
  /** Titre de la courbe (« Commandes par jour ») et nom de la valeur dans la bulle (« Commandes »). */
  chartTitle?: string;
  valueName?: string;
  /** Périodes proposées, en jours (la série est découpée dans le navigateur) ; absent = série entière. */
  ranges?: readonly number[];
  /** Ce que résume la phrase lue aux lecteurs d'écran : la somme, la dernière valeur, ou rien (moyennes). */
  summary?: 'sum' | 'last' | 'none';
}

interface KpiTrendsProps {
  items: readonly KpiItem[];
  /** Légende au-dessus de la valeur (page Analytics) au lieu d'en dessous (tableau de bord). */
  labelFirst?: boolean;
  ariaLabel: string;
}

function describe(item: KpiItem, series: readonly SeriesPoint[]): string {
  const unit = item.unit ?? 'count';
  const base = `${item.chartTitle ?? item.label}, ${series.length} jours`;
  if (item.summary === 'last') {
    const known = series.filter((point) => point.value !== null);
    const last = known[known.length - 1]?.value;
    return last === undefined || last === null ? base : `${base} : ${formatSeriesValue(last, unit)} à ce jour`;
  }
  if (item.summary === 'none') return base;
  return `${base} : ${formatSeriesValue(seriesTotal(series), unit)} au total`;
}

/**
 * Tuiles d'indicateurs dont chacune (si elle a une série) ouvre sa courbe Recharts juste dessous. Un seul état :
 * la tuile choisie ; le bouton « 7 j / 30 j » découpe la même série sans rien recharger.
 */
export function KpiTrends({ items, labelFirst = false, ariaLabel }: KpiTrendsProps) {
  const firstWithSeries = items.find((item) => item.series)?.key ?? null;
  const [selectedKey, setSelectedKey] = useState<string | null>(firstWithSeries);
  const [rangeByKey, setRangeByKey] = useState<Record<string, number>>({});

  const selected = items.find((item) => item.key === selectedKey && item.series) ?? null;
  const ranges = selected?.ranges ?? null;
  const activeRange = selected && ranges ? (rangeByKey[selected.key] ?? ranges[ranges.length - 1] ?? null) : null;
  const points = useMemo(() => {
    if (!selected?.series) return [];
    return activeRange ? lastPoints(selected.series, activeRange) : selected.series;
  }, [selected, activeRange]);

  return (
    <>
      <div className="stat-grid" role="group" aria-label={ariaLabel}>
        {items.map((item) => {
          const inner = labelFirst ? (
            <>
              <span className="help-text">{item.label}</span>
              <strong className="stat-value">{item.value}</strong>
              {item.hint && <span className="help-text">{item.hint}</span>}
            </>
          ) : (
            <>
              <strong>{item.value}</strong>
              <span className="help-text">{item.label}</span>
              {item.hint && <span className="help-text">{item.hint}</span>}
            </>
          );
          if (!item.series) {
            return (
              <div key={item.key} className={`stat${item.main ? ' is-main' : ''}`}>
                {inner}
              </div>
            );
          }
          const isSelected = item.key === selected?.key;
          return (
            <button key={item.key} type="button" className={`stat stat-btn${isSelected ? ' is-selected' : ''}`} aria-pressed={isSelected} onClick={() => setSelectedKey(item.key)}>
              {inner}
              <span className="stat-cue" aria-hidden="true">
                {isSelected ? 'Courbe affichée' : 'Voir la courbe'}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <section className="card chart-card" aria-label={selected.chartTitle ?? selected.label}>
          <div className="chart-head">
            <h2>{selected.chartTitle ?? selected.label}</h2>
            {ranges && activeRange && (
              <div className="range-toggle" role="group" aria-label="Période de la courbe">
                {ranges.map((range) => (
                  <button key={range} type="button" aria-pressed={range === activeRange} onClick={() => setRangeByKey((current) => ({ ...current, [selected.key]: range }))}>
                    {range} j
                  </button>
                ))}
              </div>
            )}
          </div>
          <TrendChart data={points} unit={selected.unit ?? 'count'} name={selected.valueName ?? selected.label} summary={describe(selected, points)} />
        </section>
      )}
    </>
  );
}
