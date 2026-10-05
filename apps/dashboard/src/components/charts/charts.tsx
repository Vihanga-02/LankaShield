import { colors, type CountDatum, type OccupancyDatum } from '@lankashield/shared';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Chart conventions: one series hue (brand primary), bars ≤ 24px with a 4px rounded data end,
// solid hairline grid, axis text in secondary ink, values at the bar tip, tooltip on hover.
const BAR = 24;
const AXIS = { fontSize: 12, fill: colors.textSecondary };
const GRID = { stroke: colors.border, strokeDasharray: '0' };
const TOOLTIP = {
  cursor: { fill: colors.surfaceMuted },
  contentStyle: {
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    fontSize: 13,
    color: colors.textPrimary,
  },
};
const LABEL = { fontSize: 12, fill: colors.textPrimary };

const shortDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

/** Reports received per day (columns). */
export function ReportsByDayChart({ data }: { data: { day: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} {...GRID} />
        <XAxis
          dataKey="day"
          tickFormatter={shortDay}
          tick={AXIS}
          axisLine={{ stroke: colors.border }}
          tickLine={false}
        />
        <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip
          {...TOOLTIP}
          labelFormatter={(d) => shortDay(String(d))}
          formatter={(v) => [v, 'Reports']}
        />
        <Bar
          dataKey="count"
          name="Reports"
          fill={colors.primary}
          maxBarSize={BAR}
          radius={[4, 4, 0, 0]}>
          {data.length <= 14 ? <LabelList dataKey="count" position="top" style={LABEL} /> : null}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars for a category count (hazard type, verification outcome). */
export function CountBarChart({ data, valueLabel }: { data: CountDatum[]; valueLabel: string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44 + 24)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 0, left: 8 }}>
        <CartesianGrid horizontal={false} {...GRID} />
        <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={88}
          tick={AXIS}
          axisLine={{ stroke: colors.border }}
          tickLine={false}
        />
        <Tooltip {...TOOLTIP} formatter={(v) => [v, valueLabel]} />
        <Bar
          dataKey="count"
          name={valueLabel}
          fill={colors.primary}
          maxBarSize={BAR}
          radius={[0, 4, 4, 0]}>
          <LabelList dataKey="count" position="right" style={LABEL} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Shelter occupancy against capacity per district: capacity is the light track, occupancy the
 * filled bar over it (a meter). Two series, so a legend names both.
 */
export function OccupancyChart({ data }: { data: OccupancyDatum[] }) {
  const rows = data.map((d) => ({ ...d, label: `${d.occupancy} / ${d.capacity} (${d.rate}%)` }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 48 + 56)}>
      <BarChart
        data={rows}
        layout="vertical"
        barGap={-BAR}
        margin={{ top: 4, right: 110, bottom: 0, left: 8 }}>
        <CartesianGrid horizontal={false} {...GRID} />
        <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="district"
          width={96}
          tick={AXIS}
          axisLine={{ stroke: colors.border }}
          tickLine={false}
        />
        <Tooltip
          {...TOOLTIP}
          formatter={(v, name) => [v, name]}
          labelFormatter={(district) => {
            const row = rows.find((r) => r.district === district);
            return row ? `${district} — ${row.rate}% full` : String(district);
          }}
        />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="square"
          wrapperStyle={{ fontSize: 12, color: colors.textSecondary }}
        />
        <Bar
          dataKey="capacity"
          name="Capacity"
          fill={colors.primarySoft}
          barSize={BAR}
          radius={[0, 4, 4, 0]}>
          <LabelList dataKey="label" position="right" style={LABEL} />
        </Bar>
        <Bar
          dataKey="occupancy"
          name="Occupied"
          fill={colors.primary}
          barSize={BAR}
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
