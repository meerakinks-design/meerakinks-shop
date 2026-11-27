'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesPoint } from '@/lib/admin-series';
import { formatSeriesValue, formatShortDay, type SeriesUnit } from '@/lib/admin-chart-format';

// Courbe d'un indicateur (Recharts). Couleurs = palette de la charte, posées en valeurs (pas en variables CSS) :
// les attributs SVG de Recharts les lisent plus sûrement ainsi. Orange = la courbe, marron = les textes.
const ORANGE = '#F47C26';
const BROWN = '#7F3F20';
const GRID = '#E5C7AA';

interface TrendChartProps {
  data: readonly SeriesPoint[];
  unit: SeriesUnit;
  /** Nom de la valeur dans la bulle (« Commandes », « Encaissé »…). */
  name: string;
  /** Texte lu par les lecteurs d'écran : la courbe seule n'est pas accessible. */
  summary: string;
  height?: number;
}

/** Bulle au survol / au toucher : Recharts lui passe `active` et `payload` ; `unit` et `name` viennent de nous. */
interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly { value?: unknown; payload?: unknown }[];
  unit: SeriesUnit;
  name: string;
}

function ChartTooltip({ active, payload, unit, name }: ChartTooltipProps) {
  const point = payload?.[0];
  if (!active || !point || typeof point.value !== 'number') return null;
  const day = (point.payload as SeriesPoint).day;
  return (
    <div className="chart-tip">
      <p>{formatShortDay(day, true)}</p>
      <p>
        <strong>{formatSeriesValue(point.value, unit)}</strong> · {name}
      </p>
    </div>
  );
}

export function TrendChart({ data, unit, name, summary, height = 230 }: TrendChartProps) {
  const known = data.map((point) => point.value).filter((value): value is number => value !== null);
  const peak = known.length === 0 ? 0 : Math.max(...known);
  const gradientId = `trend-fill-${unit}`;
  // Tout à zéro : on garde une échelle lisible au lieu d'une courbe collée au bord.
  const yMax = peak === 0 ? (unit === 'count' ? 4 : 1000) : undefined;
  return (
    <figure className="chart" role="group" aria-label={summary}>
      <div className="chart-box" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={data as SeriesPoint[]} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ORANGE} stopOpacity={0.45} />
                <stop offset="100%" stopColor={ORANGE} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 5" vertical={false} stroke={GRID} />
            <XAxis dataKey="day" tickFormatter={(day: string) => formatShortDay(day)} tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: BROWN, fontSize: 12 }} minTickGap={28} interval="preserveStartEnd" />
            <YAxis
              width={unit === 'fcfa' ? 62 : 40}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: BROWN, fontSize: 12 }}
              domain={[0, yMax ?? 'auto']}
              tickFormatter={(value: number) => formatSeriesValue(value, unit, true)}
            />
            <Tooltip content={<ChartTooltip unit={unit} name={name} />} cursor={{ stroke: BROWN, strokeDasharray: '3 4', strokeOpacity: 0.5 }} />
            <Area type="monotone" dataKey="value" stroke={ORANGE} strokeWidth={3} fill={`url(#${gradientId})`} connectNulls={false} dot={data.length <= 12 ? { r: 3, fill: ORANGE, stroke: ORANGE } : false} activeDot={{ r: 5, fill: BROWN, stroke: '#FFF9F0', strokeWidth: 2 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}
