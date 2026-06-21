import type { ReactNode } from 'react';

interface SrTable {
  caption: string;
  columns: [string, string];
  rows: Array<[string, string | number]>;
}

interface ChartCardProps {
  title: string;
  /** Short helper text under the title. */
  subtitle?: string;
  /** Concise summary announced to screen readers as the chart's accessible name. */
  ariaSummary: string;
  /** Equivalent data exposed as a visually-hidden table, so the chart isn't SVG-only. */
  srTable?: SrTable;
  children: ReactNode;
}

/**
 * Themed container for a single chart. Wraps the visual (SVG) chart in a
 * `figure`/`role="img"` labelled by `ariaSummary`, and mirrors the data in a
 * visually-hidden table so assistive tech (and tests) can read the numbers
 * without depending on the rendered SVG.
 */
export function ChartCard({ title, subtitle, ariaSummary, srTable, children }: ChartCardProps): JSX.Element {
  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-soft ring-1 ring-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900 dark:ring-0">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </header>
      <figure className="m-0 flex-1" role="img" aria-label={ariaSummary}>
        {children}
        {srTable && (
          <figcaption className="sr-only">
            <table>
              <caption>{srTable.caption}</caption>
              <thead>
                <tr>
                  <th scope="col">{srTable.columns[0]}</th>
                  <th scope="col">{srTable.columns[1]}</th>
                </tr>
              </thead>
              <tbody>
                {srTable.rows.map(([label, value]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </figcaption>
        )}
      </figure>
    </section>
  );
}
