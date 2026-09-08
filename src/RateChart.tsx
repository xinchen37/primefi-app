import { formatNumber } from './utils/formatNumber';
import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { historyPeriods as periods, mockReserveHistory } from './lending/reserveHistory';
export default function RateChart({ rate, label, borrow = false, sourceKey = label }: { rate: number; label: string; borrow?: boolean; sourceKey?: string }) {
  const [period, setPeriod] = useState<(typeof periods)[number]>('1m');
  const points = useMemo(() => mockReserveHistory(sourceKey, rate, period), [sourceKey, rate, period]);
  const peak = Math.max(.01, ...points.map(p => p.value));
  const step = 10 ** Math.floor(Math.log10(peak));
  const ceiling = Math.ceil(peak * 1.15 / step) * step;
  const average = points.reduce((sum, p) => sum + p.value, 0) / points.length;
  const color = borrow ? '#b6509e' : '#2ab5c4';
  const dateLabel = (timestamp: number) => new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return <section className={`rate-chart ${borrow ? 'borrow-chart' : ''}`} aria-label={label}>
    <div className="rate-toolbar"><span><i style={{ background: color }} />{label}</span><div className="rate-periods" aria-label={`${label} time range`}>
      {periods.map(p => <button key={p} aria-pressed={period === p} onClick={() => setPeriod(p)}>{p}</button>)}
    </div></div>
    <div className="rate-readout" aria-live="polite">Average {formatNumber(average, { decimals: 2 })}% · Mock history</div>
    <div className="rate-chart-canvas">
      <ResponsiveContainer width="100%" height={220} minWidth={0}>
        <LineChart data={points} accessibilityLayer margin={{ top: 18, right: 18, bottom: 8, left: 0 }} aria-label={`${label}, ${period}, average ${formatNumber(average, { decimals: 2 })} percent`}>
          <CartesianGrid vertical={false} stroke="#eeecf2" strokeDasharray="4 5" />
          <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={dateLabel} ticks={[points[0].timestamp, points[23].timestamp, points[47].timestamp]} tick={{ fontSize: 12, fill: '#777381' }} tickLine={false} axisLine={false} tickMargin={12} minTickGap={25} />
          <YAxis domain={[0, ceiling]} ticks={[0, ceiling / 2, ceiling]} tickFormatter={value => `${formatNumber(value, { decimals: 3, trimZeros: true })}%`} width={40} tick={{ fontSize: 12, fill: '#777381' }} tickLine={false} axisLine={false} />
          <Tooltip labelFormatter={value => new Date(Number(value)).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} formatter={value => [`${formatNumber(Number(value), { decimals: 2 })}%`, label]} cursor={{ stroke: '#b8b1c4', strokeDasharray: '4 4' }} contentStyle={{ border: '1px solid #e6e3ed', borderRadius: 8, fontSize: 14, boxShadow: '0 4px 16px #29273512' }} labelStyle={{ color: '#777381', fontSize: 12 }} isAnimationActive={false} />
          <ReferenceLine y={average} stroke="#b8b1c4" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="value" name={label} stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </section>;
}
