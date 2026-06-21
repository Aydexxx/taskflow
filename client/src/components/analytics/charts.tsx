import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AssigneeDatum, PriorityDatum, StatusDatum, ThroughputDatum } from '@taskflow/shared';
import { useTheme } from '../../context/ThemeContext';
import { PRIORITY_LABELS } from '../../lib/board/priority';
import { categoricalColor, chartTheme, PRIORITY_CHART_COLOR } from '../../lib/analytics';

const CHART_HEIGHT = 240;

/** Shared axis styling so every chart matches the active theme. */
function useAxisProps() {
  const { theme } = useTheme();
  const colors = chartTheme(theme);
  return {
    colors,
    axisProps: { stroke: colors.axis, tick: { fill: colors.axis, fontSize: 12 } },
    tooltipStyle: {
      backgroundColor: colors.tooltipBg,
      border: `1px solid ${colors.tooltipBorder}`,
      borderRadius: 8,
      color: colors.tooltipText,
      fontSize: 12,
    },
  };
}

export function StatusBarChart({ data }: { data: StatusDatum[] }): JSX.Element {
  const { colors, axisProps, tooltipStyle } = useAxisProps();
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis dataKey="columnTitle" {...axisProps} interval={0} tickFormatter={(v: string) => truncate(v)} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: colors.grid, opacity: 0.4 }} />
        <Bar dataKey="count" name="Cards" radius={[4, 4, 0, 0]} fill="#6366f1" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PriorityBarChart({ data }: { data: PriorityDatum[] }): JSX.Element {
  const { colors, axisProps, tooltipStyle } = useAxisProps();
  const shaped = data.map((datum) => ({ ...datum, label: PRIORITY_LABELS[datum.priority] }));
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={shaped} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval={0} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: colors.grid, opacity: 0.4 }} />
        <Bar dataKey="count" name="Cards" radius={[4, 4, 0, 0]}>
          {shaped.map((datum) => (
            <Cell key={datum.priority} fill={PRIORITY_CHART_COLOR[datum.priority]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AssigneeBarChart({ data }: { data: AssigneeDatum[] }): JSX.Element {
  const { colors, axisProps, tooltipStyle } = useAxisProps();
  const shaped = data.map((datum, index) => ({ ...datum, color: categoricalColor(index) }));
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={shaped} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
        <XAxis type="number" allowDecimals={false} {...axisProps} />
        <YAxis
          type="category"
          dataKey="name"
          width={96}
          {...axisProps}
          tickFormatter={(v: string) => truncate(v, 14)}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: colors.grid, opacity: 0.4 }} />
        <Bar dataKey="count" name="Cards" radius={[0, 4, 4, 0]}>
          {shaped.map((datum) => (
            <Cell key={datum.assigneeId ?? 'unassigned'} fill={datum.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ThroughputAreaChart({ data }: { data: ThroughputDatum[] }): JSX.Element {
  const { colors, axisProps, tooltipStyle } = useAxisProps();
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
        <defs>
          <linearGradient id="throughputFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: colors.axis }} />
        <Area
          type="monotone"
          dataKey="completed"
          name="Completed"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#throughputFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function truncate(value: string, max = 10): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
