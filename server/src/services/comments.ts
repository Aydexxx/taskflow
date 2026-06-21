import type { Comment as PrismaComment, User as PrismaUser } from '@prisma/client';
import type { CommentWithAuthor } from '@taskflow/shared';
import { extractMentionedUserIds } from '@taskflow/shared';
import type { CreateCommentInput } from '../validation/comment.schemas';
import { prisma } from './prisma';
import { getMembership, requireWorkspaceMember, requireWorkspaceRole, resolveCardContext } from './authorization';
import { ForbiddenError, NotFoundError } from '../errors/HttpError';
import { boardBus } from '../events/boardBus';
import { recordActivity } from './activity';
import { createNotification } from './notifications';
import { toSafeUser } from './users';

function toComment(comment: PrismaComment & { author: PrismaUser }): CommentWithAuthor {
  return {
    id: comment.id,
    cardId: comment.cardId,
    authorId: comment.authorId,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    author: toSafeUser(comment.author),
  };
}

export async function listComments(cardId: string, userId: string): Promise<CommentWithAuthor[]> {
  const { workspaceId } = await resolveCardContext(cardId);
  await requireWorkspaceMember(workspaceId, userId);

  const comments = await prisma.comment.findMany({
    where: { cardId },
    include: { author: true },
    orderBy: { createdAt: 'asc' },
  });
  return comments.map(toComment);
}

export async function createComment(
  cardId: string,
  userId: string,
  input: CreateCommentInput,
): Promise<CommentWithAuthor> {
  const { boardId, workspaceId } = await resolveCardContext(cardId);
  await requireWorkspaceRole(workspaceId, userId, 'MEMBER');

  const card = await prisma.card.findUniqueOrThrow({
    where: { id: cardId },
    select: { title: true, assigneeId: true },
  });
  const comment = await prisma.comment.create({
    data: { cardId, authorId: userId, body: input.body },
    include: { author: true },
  });
  const result = toComment(comment);

  boardBus.publish('comment:created', { boardId, actorId: userId, cardId, comment: result });
  await recordActivity(boardId, userId, 'card_commented', {
    cardId,
    cardTitle: card.title,
    commentExcerpt: input.body.slice(0, 120),
  });
  await notifyCommentParticipants(workspaceId, boardId, userId, cardId, card.title, card.assigneeId, input.body);
  return result;
}

/**
 * Notifies everyone the comment is relevant to: a "mention" notification for
 * each @mentioned workspace member, plus a "comment" notification for the
 * card's assignee (unless they were already mentioned, to avoid double-
 * notifying them about the same comment). `createNotification` itself
 * no-ops when the recipient is the comment's author.
 */
async function notifyCommentParticipants(
  workspaceId: string,
  boardId: string,
  authorId: string,
  cardId: string,
  cardTitle: string,
  assigneeId: string | null,
  body: string,
): Promise<void> {
  const metadata = { cardId, cardTitle, commentExcerpt: body.slice(0, 120) };
  const mentionedUserIds = extractMentionedUserIds(body);

  await Promise.all(
    mentionedUserIds.map(async (mentionedUserId) => {
      const membership = await getMembership(workspaceId, mentionedUserId);
      if (!membership) return; // ignore mentions of non-members (e.g. a stale/copied reference)
      await createNotification({ userId: mentionedUserId, actorId: authorId, boardId, type: 'mention', metadata });
    }),
  );

  if (assigneeId && !mentionedUserIds.includes(assigneeId)) {
    await createNotification({ userId: assigneeId, actorId: authorId, boardId, type: 'comment', metadata });
  }
}

export async function deleteComment(commentId: string, userId: string): Promise<void> {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new NotFoundError('Comment not found');
  if (comment.authorId !== userId) throw new ForbiddenError('You can only delete your own comments');

  const { boardId, workspaceId } = await resolveCardContext(comment.cardId);
  // Defense in depth: a former MEMBER demoted to VIEWER (or removed and re-invited
  // as a viewer) can no longer delete a comment they wrote while they still had write access.
  await requireWorkspaceRole(workspaceId, userId, 'MEMBER');
  await prisma.comment.delete({ where: { id: commentId } });
  boardBus.publish('comment:deleted', { boardId, actorId: userId, cardId: comment.cardId, commentId });
}
