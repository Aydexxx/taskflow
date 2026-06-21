import { Link } from 'react-router-dom';
import { splitMentionSegments } from '../../lib/board/mentionRender';

interface CommentBodyProps {
  body: string;
  workspaceId: string;
}

/** Renders a comment's body, turning any `@[Name](userId)` references into chips linking to the member's workspace profile. */
export function CommentBody({ body, workspaceId }: CommentBodyProps): JSX.Element {
  const segments = splitMentionSegments(body);

  return (
    <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
      {segments.map((segment, index) =>
        segment.type === 'mention' ? (
          <Link
            key={index}
            to={`/workspaces/${workspaceId}/members`}
            className="rounded bg-indigo-50 px-1 font-medium text-indigo-700 hover:underline dark:bg-indigo-500/10 dark:text-indigo-300"
          >
            @{segment.name}
          </Link>
        ) : (
          <span key={index}>{segment.value}</span>
        ),
      )}
    </p>
  );
}
