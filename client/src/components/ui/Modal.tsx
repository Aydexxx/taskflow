import { useEffect, type ReactNode } from 'react';
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-fade-in dark:bg-black/60"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-xl bg-white p-6 shadow-xl animate-scale-in dark:bg-slate-900 dark:ring-1 dark:ring-slate-700',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
