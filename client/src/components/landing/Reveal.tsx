import type { ElementType, ReactNode } from 'react';
import { useReveal } from '../../hooks/useReveal';
import { cn } from '../ui/cn';

interface RevealProps {
  children: ReactNode;
  /** Stagger child sections by passing an increasing delay (ms). */
  delay?: number;
  /** Render as a different element (e.g. `section`, `li`) while keeping the ref. */
  as?: ElementType;
  className?: string;
}

/**
 * Fades + lifts its children into view the first time they scroll on-screen.
 * Motion lives entirely on transform/opacity (cheap, GPU-friendly) and is
 * suppressed automatically for users who prefer reduced motion (see useReveal,
 * plus the global reduced-motion CSS guard).
 */
export function Reveal({ children, delay = 0, as, className }: RevealProps): JSX.Element {
  const Tag = (as ?? 'div') as ElementType;
  const { ref, shown } = useReveal<HTMLElement>();

  return (
    <Tag
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        'transition-all duration-700 ease-out-soft motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-4 opacity-0 blur-[2px]',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
