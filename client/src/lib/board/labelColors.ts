import type { LabelColor } from '@taskflow/shared';

/** Static Tailwind class pairs per label color, keyed so the JIT compiler can see every literal. */
const LABEL_COLOR_STYLES: Record<LabelColor, { chip: string; swatch: string }> = {
  gray: { chip: 'bg-slate-100 text-slate-700', swatch: 'bg-slate-400' },
  red: { chip: 'bg-red-100 text-red-700', swatch: 'bg-red-500' },
  orange: { chip: 'bg-orange-100 text-orange-700', swatch: 'bg-orange-500' },
  amber: { chip: 'bg-amber-100 text-amber-700', swatch: 'bg-amber-500' },
  green: { chip: 'bg-green-100 text-green-700', swatch: 'bg-green-500' },
  teal: { chip: 'bg-teal-100 text-teal-700', swatch: 'bg-teal-500' },
  blue: { chip: 'bg-blue-100 text-blue-700', swatch: 'bg-blue-500' },
  indigo: { chip: 'bg-indigo-100 text-indigo-700', swatch: 'bg-indigo-500' },
  purple: { chip: 'bg-purple-100 text-purple-700', swatch: 'bg-purple-500' },
  pink: { chip: 'bg-pink-100 text-pink-700', swatch: 'bg-pink-500' },
};

export function labelChipClass(color: LabelColor): string {
  return LABEL_COLOR_STYLES[color].chip;
}

export function labelSwatchClass(color: LabelColor): string {
  return LABEL_COLOR_STYLES[color].swatch;
}
