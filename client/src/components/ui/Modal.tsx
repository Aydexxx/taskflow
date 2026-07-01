import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';

interface ModalProps {
  /** Accessible label for the dialog. */
  ariaLabel: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Centered modal dialog with a dimmed backdrop. Closes on backdrop click and on
 * Escape, animates in, and locks body scroll while open.
 *
 * Rendered through a portal into document.body so the `fixed inset-0` overlay is
 * positioned against the viewport. Otherwise an ancestor that establishes a
 * containing block for fixed descendants — e.g. the app header's
 * `backdrop-blur` — would trap the overlay and pin it to that element instead.
 */
export function Modal({ ariaLabel, onClose, children, className }: ModalProps): JSX.Element {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 animate-fade-in backdrop-blur-sm dark:bg-slate-950/70"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'scrollbar-subtle flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-2xl bg-white p-6 shadow-overlay ring-1 ring-slate-900/5 animate-scale-in dark:bg-slate-900 dark:ring-white/10',
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
