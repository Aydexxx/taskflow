import type { Request, Response } from 'express';
import type {
  AskAssistantResponse,
  AskBoardResponse,
  AskWorkspaceResponse,
  DraftDescriptionResponse,
  SuggestMetadataResponse,
  SuggestSubtasksResponse,
  SummarizeBoardResponse,
} from '@taskflow/shared';
import { currentUserId } from '../middleware/auth';
import * as ai from '../services/ai/features';
import type {
  AskAssistantInput,
  AskBoardInput,
  AskWorkspaceInput,
  DraftDescriptionInput,
} from '../validation/ai.schemas';

export async function summarizeBoard(
  req: Request<{ boardId: string }>,
  res: Response<SummarizeBoardResponse>,
): Promise<void> {
  res.json(await ai.summarizeBoard(req.params.boardId, currentUserId(req)));
}

export async function askBoard(
  req: Request<{ boardId: string }, unknown, AskBoardInput>,
  res: Response<AskBoardResponse>,
): Promise<void> {
  res.json(await ai.askBoard(req.params.boardId, currentUserId(req), req.body.question));
}

export async function askWorkspace(
  req: Request<{ workspaceId: string }, unknown, AskWorkspaceInput>,
  res: Response<AskWorkspaceResponse>,
): Promise<void> {
  res.json(await ai.askWorkspace(req.params.workspaceId, currentUserId(req), req.body.question));
}

export async function askAssistant(
  req: Request<Record<string, never>, unknown, AskAssistantInput>,
  res: Response<AskAssistantResponse>,
): Promise<void> {
  res.json(await ai.askAssistant(currentUserId(req), req.body.question, req.body.history));
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
