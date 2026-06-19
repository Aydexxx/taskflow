import type { Comment as PrismaComment, User as PrismaUser } from '@prisma/client';
import type { CommentWithAuthor } from '@taskflow/shared';
import type { CreateCommentInput } from '../validation/comment.schemas';
import { prisma } from './prisma';
import { requireWorkspaceMember, resolveCardContext } from './authorization';
import { ForbiddenError, NotFoundError } from '../errors/HttpError';
import { boardBus } from '../events/boardBus';
import { recordActivity } from './activity';
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
  await requireWorkspaceMember(workspaceId, userId);

  const card = await prisma.card.findUniqueOrThrow({ where: { id: cardId }, select: { title: true } });
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
  return result;
}

export async function deleteComment(commentId: string, userId: string): Promise<void> {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new NotFoundError('Comment not found');
  if (comment.authorId !== userId) throw new ForbiddenError('You can only delete your own comments');

  const { boardId } = await resolveCardContext(comment.cardId);
  await prisma.comment.delete({ where: { id: commentId } });
  boardBus.publish('comment:deleted', { boardId, actorId: userId, cardId: comment.cardId, commentId });
}
