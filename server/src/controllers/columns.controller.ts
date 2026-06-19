import type { Request, Response } from 'express';
import type { Card, Column } from '@taskflow/shared';
import { currentUserId } from '../middleware/auth';
import * as columnService from '../services/columns';
import * as cardService from '../services/cards';
import type { UpdateColumnInput } from '../validation/column.schemas';
import type { CreateCardInput } from '../validation/card.schemas';

export async function updateColumn(
  req: Request<{ columnId: string }, unknown, UpdateColumnInput>,
  res: Response<Column>,
): Promise<void> {
  const column = await columnService.updateColumn(req.params.columnId, currentUserId(req), req.body);
  res.json(column);
}

export async function deleteColumn(req: Request<{ columnId: string }>, res: Response): Promise<void> {
  await columnService.deleteColumn(req.params.columnId, currentUserId(req));
  res.status(204).end();
}

export async function createCard(
  req: Request<{ columnId: string }, unknown, CreateCardInput>,
  res: Response<Card>,
): Promise<void> {
  const card = await cardService.createCard(req.params.columnId, currentUserId(req), req.body);
  res.status(201).json(card);
}
