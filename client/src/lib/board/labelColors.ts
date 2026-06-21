import type { LabelColor } from '@taskflow/shared';

/**
 * Static Tailwind class pairs per label color, keyed so the JIT compiler can see
 * every literal. Each chip carries an inset ring plus a dark variant so labels
 * stay legible on dark cards as well as light ones (full light/dark parity).
 */
const LABEL_COLOR_STYLES: Record<LabelColor, { chip: string; swatch: string }> = {
  gray: { chip: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-700/50 dark:text-slate-200 dark:ring-slate-600/50', swatch: 'bg-slate-400' },
  red: { chip: 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/25', swatch: 'bg-red-500' },
  orange: { chip: 'bg-orange-100 text-orange-700 ring-1 ring-inset ring-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/25', swatch: 'bg-orange-500' },
  amber: { chip: 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25', swatch: 'bg-amber-500' },
  green: { chip: 'bg-green-100 text-green-700 ring-1 ring-inset ring-green-200 dark:bg-green-500/15 dark:text-green-300 dark:ring-green-500/25', swatch: 'bg-green-500' },
  teal: { chip: 'bg-teal-100 text-teal-700 ring-1 ring-inset ring-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-500/25', swatch: 'bg-teal-500' },
  blue: { chip: 'bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/25', swatch: 'bg-blue-500' },
  indigo: { chip: 'bg-indigo-100 text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/25', swatch: 'bg-indigo-500' },
  purple: { chip: 'bg-purple-100 text-purple-700 ring-1 ring-inset ring-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:ring-purple-500/25', swatch: 'bg-purple-500' },
  pink: { chip: 'bg-pink-100 text-pink-700 ring-1 ring-inset ring-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:ring-pink-500/25', swatch: 'bg-pink-500' },
};

export function labelChipClass(color: LabelColor): string {
  return LABEL_COLOR_STYLES[color].chip;
}

export function labelSwatchClass(color: LabelColor): string {
  return LABEL_COLOR_STYLES[color].swatch;
}
