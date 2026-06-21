import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Optional supporting line under the value. */
  hint?: string;
  /** Highlight tone — `warn` draws attention (e.g. overdue), `default` is neutral. */
  tone?: 'default' | 'warn' | 'positive';
}

const VALUE_TONE: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-slate-900 dark:text-slate-50',
  warn: 'text-red-600 dark:text-red-400',
  positive: 'text-emerald-600 dark:text-emerald-400',
};

/** Compact KPI tile used across the top of the analytics dashboard. */
export function StatCard({ label, value, hint, tone = 'default' }: StatCardProps): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft ring-1 ring-slate-900/[0.02] transition duration-150 ease-out-soft hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:ring-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1.5 font-display text-3xl font-bold tabular-nums tracking-tight ${VALUE_TONE[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}
