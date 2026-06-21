interface IconProps {
  className?: string;
}

export function GripIcon({ className = 'h-4 w-4' }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="6" cy="5" r="1.5" />
      <circle cx="6" cy="10" r="1.5" />
      <circle cx="6" cy="15" r="1.5" />
      <circle cx="14" cy="5" r="1.5" />
      <circle cx="14" cy="10" r="1.5" />
      <circle cx="14" cy="15" r="1.5" />
    </svg>
  );
}

export function TrashIcon({ className = 'h-4 w-4' }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8.75 1A1.75 1.75 0 0 0 7 2.75V3h6v-.25A1.75 1.75 0 0 0 11.25 1h-2.5ZM3.5 5l.6 11.4a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L16.5 5h-13Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function PlusIcon({ className = 'h-4 w-4' }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export function XIcon({ className = 'h-4 w-4' }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

export function ActivityIcon({ className = 'h-4 w-4' }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h3l2 6 4-12 2 6h5" />
    </svg>
  );
}

export function SunIcon({ className = 'h-4 w-4' }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="3.25" />
      <path
        strokeLinecap="round"
        d="M10 2.5v1.75M10 15.75v1.75M17.5 10h-1.75M4.25 10H2.5M15.3 4.7l-1.24 1.24M5.94 14.06L4.7 15.3M15.3 15.3l-1.24-1.24M5.94 5.94L4.7 4.7"
      />
    </svg>
  );
}

export function MoonIcon({ className = 'h-4 w-4' }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.5 11.8A6.5 6.5 0 1 1 8.2 3.5a5.5 5.5 0 0 0 8.3 8.3Z" />
    </svg>
  );
}

export function BellIcon({ className = 'h-4 w-4' }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M10 2a4 4 0 0 0-4 4v2.2c0 .6-.2 1.2-.6 1.7L4 11.8c-.7.9-.1 2.2 1 2.2h10c1.1 0 1.7-1.3 1-2.2l-1.4-1.9a2.7 2.7 0 0 1-.6-1.7V6a4 4 0 0 0-4-4Z" />
      <path d="M8.2 16a1.8 1.8 0 0 0 3.6 0H8.2Z" />
    </svg>
  );
}
