import { cn } from '../ui/cn';

interface MockCard {
  title: string;
  tone: 'indigo' | 'emerald' | 'amber' | 'slate';
  meta?: string;
}

const COLUMNS: { title: string; count: number; cards: MockCard[] }[] = [
  {
    title: 'In progress',
    count: 3,
    cards: [
      { title: 'Realtime presence sync', tone: 'indigo', meta: 'AD' },
      { title: 'Drag-and-drop columns', tone: 'emerald', meta: 'MK' },
    ],
  },
  {
    title: 'Review',
    count: 2,
    cards: [
      { title: 'Role-based permissions', tone: 'amber', meta: 'JS' },
      { title: 'Weekly throughput chart', tone: 'slate', meta: 'TL' },
    ],
  },
  {
    title: 'Done',
    count: 5,
    cards: [{ title: 'AI summary for board', tone: 'indigo', meta: 'AI' }],
  },
];

const DOT_TONE: Record<MockCard['tone'], string> = {
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  slate: 'bg-slate-400',
};

function MiniCard({ card, floating }: { card: MockCard; floating?: boolean }): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200/80 bg-white p-2.5 shadow-soft dark:border-slate-700/70 dark:bg-slate-800/90',
        floating && 'motion-safe:animate-float motion-safe:[will-change:transform] ring-1 ring-indigo-400/30',
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', DOT_TONE[card.tone])} />
        <span className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">{card.title}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[7px] font-semibold text-white ring-1 ring-inset ring-white/20">
          {card.meta}
        </span>
      </div>
    </div>
  );
}

/**
 * A purely decorative, CSS-driven mock of the Kanban board for the hero. No real
 * data or interactivity — one card gently floats and a collaborator cursor drifts
 * to hint at live collaboration. All motion is transform-only and disabled under
 * prefers-reduced-motion (`motion-safe:` + the global guard).
 */
export function HeroBoard(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="relative w-full select-none rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 shadow-overlay ring-1 ring-slate-900/5 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70 dark:ring-white/10 sm:p-4"
    >
      {/* Faux window chrome */}
      <div className="mb-3 flex items-center gap-1.5 px-1">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800/70 dark:text-slate-400 dark:ring-slate-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
          3 online
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {COLUMNS.map((column, columnIndex) => (
          <div
            key={column.title}
            className="rounded-xl border border-slate-200/70 bg-white/60 p-2 dark:border-slate-800/70 dark:bg-slate-900/50"
          >
            <div className="mb-2 flex items-center justify-between px-0.5">
              <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {column.title}
              </span>
              <span className="rounded-full bg-slate-100 px-1.5 text-[9px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
                {column.count}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {column.cards.map((card, cardIndex) => (
                <MiniCard key={card.title} card={card} floating={columnIndex === 0 && cardIndex === 0} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Drifting collaborator cursor — the "live" tell. */}
      <div className="pointer-events-none absolute left-[34%] top-[42%] motion-safe:animate-cursor-drift">
        <svg viewBox="0 0 16 16" className="h-4 w-4 drop-shadow" fill="none">
          <path d="M1 1l5.5 13 2-5.5L14 6 1 1z" fill="#6366f1" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
        <span className="ml-3 mt-0.5 inline-block rounded-md bg-indigo-600 px-1.5 py-0.5 text-[9px] font-medium text-white shadow-sm">
          Maya
        </span>
      </div>
    </div>
  );
}
