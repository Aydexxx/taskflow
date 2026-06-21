import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../ThemeToggle';
import { Button } from '../ui';
import { cn } from '../ui/cn';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#live', label: 'Live collaboration' },
  { href: '#metrics', label: 'Why TaskFlow' },
];

/** Public top bar for the landing page: transparent at rest, refines once scrolled. */
export function MarketingHeader(): JSX.Element {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-300 ease-out-soft',
        scrolled
          ? 'border-b border-slate-200/70 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/65 dark:border-slate-800/70 dark:bg-slate-950/80 dark:supports-[backdrop-filter]:bg-slate-950/65'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="TaskFlow home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold tracking-tight text-white shadow-sm ring-1 ring-inset ring-white/15">
            TF
          </span>
          <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">TaskFlow</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            to="/login"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white sm:inline-flex"
          >
            Sign in
          </Link>
          <Link to="/register">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
