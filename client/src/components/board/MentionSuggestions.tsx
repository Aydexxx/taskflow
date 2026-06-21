import type { WorkspaceMemberWithUser } from '@taskflow/shared';
import { Avatar } from '../Avatar';

interface MentionSuggestionsProps {
  members: WorkspaceMemberWithUser[];
  activeIndex: number;
  onSelect: (member: WorkspaceMemberWithUser) => void;
}

/** Popover listing workspace members matching an in-progress "@query", anchored above the comment input. */
export function MentionSuggestions({ members, activeIndex, onSelect }: MentionSuggestionsProps): JSX.Element | null {
  if (members.length === 0) return null;

  return (
    <ul
      role="listbox"
      aria-label="Mention a member"
      className="absolute bottom-full left-0 z-20 mb-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
    >
      {members.map((member, index) => (
        <li key={member.userId} role="option" aria-selected={index === activeIndex}>
          <button
            type="button"
            // Prevent the input from blurring on click so the caret position
            // we computed (and are about to restore) stays valid.
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(member);
            }}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
              index === activeIndex
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Avatar name={member.user.name} />
            {member.user.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
