import type { Request, Response } from 'express';
import type {
  DraftDescriptionResponse,
  SuggestMetadataResponse,
  SuggestSubtasksResponse,
  SummarizeBoardResponse,
} from '@taskflow/shared';
import { currentUserId } from '../middleware/auth';
import * as ai from '../services/ai/features';
import type { DraftDescriptionInput } from '../validation/ai.schemas';

export async function summarizeBoard(
  req: Request<{ boardId: string }>,
  res: Response<SummarizeBoardResponse>,
): Promise<void> {
  res.json(await ai.summarizeBoard(req.params.boardId, currentUserId(req)));
}

export async function suggestSubtasks(
  req: Request<{ cardId: string }>,
  res: Response<SuggestSubtasksResponse>,
): Promise<void> {
  res.json(await ai.suggestSubtasks(req.params.cardId, currentUserId(req)));
}

export async function draftDescription(
  req: Request<{ workspaceId: string }, unknown, DraftDescriptionInput>,
  res: Response<DraftDescriptionResponse>,
): Promise<void> {
  res.json(await ai.draftDescription(req.params.workspaceId, currentUserId(req), req.body.title));
}

export async function suggestMetadata(
  req: Request<{ cardId: string }>,
  res: Response<SuggestMetadataResponse>,
): Promise<void> {
  res.json(await ai.suggestMetadata(req.params.cardId, currentUserId(req)));
}
