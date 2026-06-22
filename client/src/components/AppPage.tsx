import type { ReactNode } from 'react';
import { cn } from './ui/cn';
import { AppBackground } from './AppBackground';

interface AppPageProps {
  /** The sticky top bar (an <AppHeader />). Rendered above the ambient backdrop. */
  header: ReactNode;
  /** Tailwind max-width for the content column; defaults to a roomy `max-w-6xl`. */
  maxWidth?: string;
  /** Page body — typically a <PageHeader /> followed by content sections. */
  children: ReactNode;
  className?: string;
}

/**
 * Shared shell for the authenticated app pages: a themed page surface, the
 * landing-style ambient backdrop, the sticky header, and a centered content
 * column with consistent, purposeful spacing. Keeps every inner page composed
 * and on-brand without repeating the scaffolding.
 */
export function AppPage({ header, maxWidth = 'max-w-6xl', children, className }: AppPageProps): JSX.Element {
  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppBackground />
      {header}
      <main className={cn('relative z-10 mx-auto w-full px-5 py-10 sm:px-8 sm:py-12', maxWidth, className)}>
        {children}
      </main>
    </div>
  );
}
