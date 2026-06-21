import type { CardPriority } from '@taskflow/shared';

export const PRIORITY_LABELS: Record<CardPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

// Each tone carries an inset ring and a dark variant so chips read cleanly on
// both light cards and dark surfaces (full light/dark parity).
export const PRIORITY_BADGE_CLASS: Record<CardPriority, string> = {
  LOW: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:ring-slate-600/50',
  MEDIUM: 'bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/25',
  HIGH: 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25',
  URGENT: 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/25',
};
