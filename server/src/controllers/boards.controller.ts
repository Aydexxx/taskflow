import type { Request, Response } from 'express';
import type { ActivityWithActor, BoardAnalytics, BoardWithChildren, Board, Column } from '@taskflow/shared';
import { currentUserId } from '../middleware/auth';
import * as boardService from '../services/boards';
import * as columnService from '../services/columns';
import * as activityService from '../services/activity';
import * as analyticsService from '../services/analytics';
import type { UpdateBoardInput } from '../validation/board.schemas';
import type { CreateColumnInput } from '../validation/column.schemas';

export async function getBoard(req: Request<{ boardId: string }>, res: Response<BoardWithChildren>): Promise<void> {
  const board = await boardService.getBoardWithChildren(req.params.boardId, currentUserId(req));
  res.json(board);
}

export async function updateBoard(
  req: Request<{ boardId: string }, unknown, UpdateBoardInput>,
  res: Response<Board>,
): Promise<void> {
  const board = await boardService.updateBoard(req.params.boardId, currentUserId(req), req.body);
  res.json(board);
}

export async function deleteBoard(req: Request<{ boardId: string }>, res: Response): Promise<void> {
  await boardService.deleteBoard(req.params.boardId, currentUserId(req));
  res.status(204).end();
}

export async function createColumn(
  req: Request<{ boardId: string }, unknown, CreateColumnInput>,
  res: Response<Column>,
): Promise<void> {
  const column = await columnService.createColumn(req.params.boardId, currentUserId(req), req.body);
  res.status(201).json(column);
}

export async function listActivity(
  req: Request<{ boardId: string }>,
  res: Response<ActivityWithActor[]>,
): Promise<void> {
  const activity = await activityService.listActivity(req.params.boardId, currentUserId(req));
  res.json(activity);
}

export async function getAnalytics(
  req: Request<{ boardId: string }, unknown, unknown, { weeks?: string }>,
  res: Response<BoardAnalytics>,
): Promise<void> {
  const weeks = req.query.weeks === undefined ? undefined : Number.parseInt(req.query.weeks, 10);
  const analytics = await analyticsService.getBoardAnalytics(req.params.boardId, currentUserId(req), weeks);
  res.json(analytics);
}
