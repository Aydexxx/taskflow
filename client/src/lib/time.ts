/**
 * Human-friendly relative time ("3 days ago", "just now") for activity hints.
 * Pure and dependency-free; uses Intl.RelativeTimeFormat for correct pluralization.
 */
const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
];

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/**
 * Formats an ISO timestamp relative to `now` (defaults to the current time):
 * "just now", "5 minutes ago", "in 2 days". Returns an empty string for
 * missing/invalid input so callers can render nothing gracefully.
 */
export function formatRelativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const then = new Date(iso);
  const ms = then.getTime();
  if (Number.isNaN(ms)) return '';

  let duration = (ms - now.getTime()) / 1000;
  if (Math.abs(duration) < 45) return 'just now';

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return '';
}
