const PALETTE = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500', 'bg-violet-500'];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length] as string;
}

function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase();
}

interface AvatarProps {
  name: string;
  className?: string;
}

/** A small colored initials avatar, deterministically colored by name. */
export function Avatar({ name, className = '' }: AvatarProps): JSX.Element {
  return (
    <span
      title={name}
      className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${colorForName(name)} ${className}`}
    >
      {initialsForName(name)}
    </span>
  );
}
