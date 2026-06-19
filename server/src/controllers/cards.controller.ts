import type { Request, Response } from 'express';
import type { Card, CommentWithAuthor } from '@taskflow/shared';
import { currentUserId } from '../middleware/auth';
import * as cardService from '../services/cards';
import * as labelService from '../services/labels';
import * as commentService from '../services/comments';
import type { MoveCardInput, UpdateCardInput } from '../validation/card.schemas';
import type { AttachLabelInput } from '../validation/label.schemas';
import type { CreateCommentInput } from '../validation/comment.schemas';

export async function updateCard(
  req: Request<{ cardId: string }, unknown, UpdateCardInput>,
  res: Response<Card>,
): Promise<void> {
  const card = await cardService.updateCard(req.params.cardId, currentUserId(req), req.body);
  res.json(card);
}

export async function moveCard(
  req: Request<{ cardId: string }, unknown, MoveCardInput>,
  res: Response<Card>,
): Promise<void> {
  const card = await cardService.moveCard(req.params.cardId, currentUserId(req), req.body);
  res.json(card);
}

export async function deleteCard(req: Request<{ cardId: string }>, res: Response): Promise<void> {
  await cardService.deleteCard(req.params.cardId, currentUserId(req));
  res.status(204).end();
}

export async function addLabel(
  req: Request<{ cardId: string }, unknown, AttachLabelInput>,
  res: Response<Card>,
): Promise<void> {
  const card = await labelService.addLabelToCard(req.params.cardId, req.body.labelId, currentUserId(req));
  res.json(card);
}

export async function removeLabel(
  req: Request<{ cardId: string; labelId: string }>,
  res: Response<Card>,
): Promise<void> {
  const card = await labelService.removeLabelFromCard(req.params.cardId, req.params.labelId, currentUserId(req));
  res.json(card);
}

export async function listComments(
  req: Request<{ cardId: string }>,
  res: Response<CommentWithAuthor[]>,
): Promise<void> {
  const comments = await commentService.listComments(req.params.cardId, currentUserId(req));
  res.json(comments);
}

export async function createComment(
  req: Request<{ cardId: string }, unknown, CreateCommentInput>,
  res: Response<CommentWithAuthor>,
): Promise<void> {
  const comment = await commentService.createComment(req.params.cardId, currentUserId(req), req.body);
  res.status(201).json(comment);
}
