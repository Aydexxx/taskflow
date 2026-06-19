import { cn } from './cn';

interface SpinnerProps {
  className?: string;
  label?: string;
}

/** Accessible spinning indicator used inside buttons and loading states. */
export function Spinner({ className = 'h-5 w-5', label = 'Loading' }: SpinnerProps): JSX.Element {
  return (
    <svg
      className={cn('animate-spin text-current', className)}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label={label}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2Z" />
    </svg>
  );
}
