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

export function ChartIcon({ className = 'h-4 w-4' }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v13.5A1.5 1.5 0 0 0 4.5 18H17" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 13.5v-3M10 13.5v-6M13.5 13.5v-4.5M17 13.5V6" />
    </svg>
  );
}

export function SparklesIcon({ className = 'h-4 w-4' }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M10 1.5l1.6 4.2a3 3 0 0 0 1.7 1.7L19.5 9l-4.2 1.6a3 3 0 0 0-1.7 1.7L11.5 16.5l-1.6-4.2a3 3 0 0 0-1.7-1.7L4 9l4.2-1.6a3 3 0 0 0 1.7-1.7L11.5 1.5H10Z" />
      <path d="M4.5 13l.6 1.6a1.5 1.5 0 0 0 .9.9L7.5 16l-1.5.6a1.5 1.5 0 0 0-.9.9L4.5 19l-.6-1.5a1.5 1.5 0 0 0-.9-.9L1.5 16l1.5-.5a1.5 1.5 0 0 0 .9-.9L4.5 13Z" />
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

// Brand glyphs for profile social links. lucide-react 1.x dropped its brand
// icons, so we ship our own minimal marks to keep the set consistent.
export function GithubIcon({ className = 'h-4 w-4' }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.48v-1.7c-2.78.62-3.37-1.22-3.37-1.22-.46-1.18-1.11-1.5-1.11-1.5-.9-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.34 1.12 2.91.86.09-.66.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.32 9.32 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9v2.82c0 .27.18.59.69.48A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

export function LinkedinIcon({ className = 'h-4 w-4' }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9h4v12H3V9Zm6 0h3.83v1.64h.05c.53-1 1.84-2.06 3.78-2.06 4.04 0 4.79 2.66 4.79 6.12V21h-4v-5.49c0-1.31-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.91V21H9V9Z" />
    </svg>
  );
}

export function TwitterIcon({ className = 'h-4 w-4' }: IconProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.53 3h3.05l-6.67 7.62L21.75 21h-6.14l-4.81-6.29L5.3 21H2.25l7.13-8.15L2.5 3h6.3l4.35 5.75L17.53 3Zm-1.07 16.2h1.69L7.62 4.71H5.8L16.46 19.2Z" />
    </svg>
  );
}
