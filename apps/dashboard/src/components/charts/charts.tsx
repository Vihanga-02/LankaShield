import {
  colors,
  type AlertTimelineDatum,
  type CountDatum,
  type OccupancyDatum,
  type OccupancyTimelineDatum,
} from '@lankashield/shared';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
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

export function AlertTimelineChart({ data }: { data: AlertTimelineDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} {...GRID} />
        <XAxis dataKey="day" tickFormatter={shortDay} tick={AXIS} tickLine={false} />
        <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip {...TOOLTIP} labelFormatter={(d) => shortDay(String(d))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="high" name="High threat" stackId="alerts" fill={colors.danger} />
        <Bar dataKey="medium" name="Medium" stackId="alerts" fill={colors.warning} />
        <Bar
          dataKey="advisory"
          name="Advisory"
          stackId="alerts"
          fill={colors.primarySoft}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ShelterOccupancyTimelineChart({ data }: { data: OccupancyTimelineDatum[] }) {
  const peak = data.reduce<OccupancyTimelineDatum | null>(
    (highest, row) => (!highest || row.occupancy > highest.occupancy ? row : highest),
    null,
  );

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 76, right: 20, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="occupancyShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.primary} stopOpacity={0.28} />
            <stop offset="100%" stopColor={colors.primary} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} {...GRID} />
        <XAxis dataKey="day" tickFormatter={shortDay} tick={AXIS} tickLine={false} />
        <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip
          {...TOOLTIP}
          labelFormatter={(d) => shortDay(String(d))}
          formatter={(v, name) => [v, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="occupancy"
          name="Occupied"
          stroke={colors.primary}
          strokeWidth={3}
          fill="url(#occupancyShade)"
          dot={{ r: 4, fill: colors.primary, stroke: '#fff', strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="capacity"
          name="Capacity"
          stroke={colors.textSecondary}
          strokeDasharray="5 5"
          dot={false}
        />
        {peak ? (
          <ReferenceDot
            x={peak.day}
            y={peak.occupancy}
            r={6}
            fill={colors.primary}
            stroke="#fff"
            strokeWidth={3}
            label={({ viewBox }) => {
              const box = viewBox as { cx?: number; cy?: number };
              const x = (box.cx ?? 0) - 58;
              const y = (box.cy ?? 0) - 68;
              return (
                <g>
                  <rect
                    x={x}
                    y={y}
                    width={116}
                    height={55}
                    rx={7}
                    fill="#fff"
                    stroke={colors.border}
                  />
                  <text x={x + 10} y={y + 16} fontSize={11} fill={colors.textSecondary}>
                    Peak occupancy
                  </text>
                  <text
                    x={x + 10}
                    y={y + 33}
                    fontSize={13}
                    fontWeight={700}
                    fill={colors.textPrimary}>
                    {peak.occupancy.toLocaleString('en-LK')} people
                  </text>
                  <text x={x + 10} y={y + 48} fontSize={10} fill={colors.textSecondary}>
                    {shortDay(peak.day)}
                  </text>
                </g>
              );
            }}
          />
        ) : null}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
