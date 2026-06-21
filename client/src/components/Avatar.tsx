import { useState } from 'react';
import { resolveAvatarUrl } from '../lib/avatar';

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
  /** Uploaded avatar URL (server-relative or absolute); falls back to initials when absent or it fails to load. */
  avatarUrl?: string | null;
  className?: string;
}

/**
 * A small avatar: shows the user's uploaded image when available, otherwise a
 * deterministically-colored initials chip. If the image fails to load we fall
 * back to initials too, so a broken/expired URL never shows a broken image.
 */
export function Avatar({ name, avatarUrl, className = '' }: AvatarProps): JSX.Element {
  const [failed, setFailed] = useState(false);
  const resolved = resolveAvatarUrl(avatarUrl);
  const showImage = resolved !== null && !failed;

  return (
    <span
      title={name}
      className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-semibold tracking-tight text-white shadow-sm ring-1 ring-inset ring-white/20 ${
        showImage ? 'bg-slate-200 dark:bg-slate-700' : colorForName(name)
      } ${className}`}
    >
      {showImage ? (
        <img
          src={resolved}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        initialsForName(name)
      )}
    </span>
  );
}
