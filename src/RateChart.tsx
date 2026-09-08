import { formatNumber } from './utils/formatNumber';
import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const periods = ['1w', '1m', '6m', '1y'] as const;
// Deterministic fixture history; replace this adapter with the reserve history API.
function history(rate: number, days: number) {
  return Array.from({ length: 48 }, (_, i) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setTime(date.getTime() - days * (47 - i) / 47 * 86400000);
    const value = i === 47 ? rate : Math.max(0, rate * (1 + .12 * Math.sin(i * 1.7 + days) + .07 * Math.cos(i * .6)));
    return { timestamp: date.getTime(), value };
  });
}

export default function RateChart({ rate, label, borrow = false }: { rate: number; label: string; borrow?: boolean }) {
  const [period, setPeriod] = useState<(typeof periods)[number]>('1m');
  const points = useMemo(() => history(rate, { '1w': 7, '1m': 30, '6m': 180, '1y': 365 }[period]), [rate, period]);
  const ceiling = Math.max(1, Math.ceil(Math.max(...points.map(p => p.value))));
  const average = points.reduce((sum, p) => sum + p.value, 0) / points.length;
  const color = borrow ? '#b6509e' : '#2ab5c4';
  const dateLabel = (timestamp: number) => new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return <section className={`rate-chart ${borrow ? 'borrow-chart' : ''}`} aria-label={label}>
    <div className="rate-toolbar"><span><i style={{ background: color }} />{label}</span><div className="rate-periods" aria-label={`${label} time range`}>
      {periods.map(p => <button key={p} aria-pressed={period === p} onClick={() => setPeriod(p)}>{p}</button>)}
    </div></div>
    <div className="rate-readout" aria-live="polite">Average {formatNumber(average, { decimals: 2 })}%</div>
    <div className="rate-chart-canvas">
      <ResponsiveContainer width="100%" height={220} minWidth={0}>
        <LineChart data={points} accessibilityLayer margin={{ top: 18, right: 18, bottom: 8, left: 0 }} aria-label={`${label}, ${period}, average ${formatNumber(average, { decimals: 2 })} percent`}>
          <CartesianGrid vertical={false} stroke="#eeecf2" strokeDasharray="4 5" />
          <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={dateLabel} ticks={[points[0].timestamp, points[23].timestamp, points[47].timestamp]} tick={{ fontSize: 12, fill: '#777381' }} tickLine={false} axisLine={false} tickMargin={12} minTickGap={25} />
          <YAxis domain={[0, ceiling]} ticks={[0, ceiling / 2, ceiling]} tickFormatter={value => `${value}%`} width={40} tick={{ fontSize: 12, fill: '#777381' }} tickLine={false} axisLine={false} />
          <Tooltip labelFormatter={value => new Date(Number(value)).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} formatter={value => [`${formatNumber(Number(value), { decimals: 2 })}%`, label]} cursor={{ stroke: '#b8b1c4', strokeDasharray: '4 4' }} contentStyle={{ border: '1px solid #e6e3ed', borderRadius: 8, fontSize: 14, boxShadow: '0 4px 16px #29273512' }} labelStyle={{ color: '#777381', fontSize: 12 }} isAnimationActive={false} />
          <ReferenceLine y={average} stroke="#b8b1c4" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="value" name={label} stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </section>;
}
