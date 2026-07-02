import type {
  ActivityWithActor,
  AddWorkspaceMemberRequest,
  ApiError,
  AskAssistantResponse,
  AskBoardRequest,
  AskBoardResponse,
  AskWorkspaceRequest,
  AskWorkspaceResponse,
  ChatMessage,
  AttachLabelRequest,
  AuthResponse,
  Board,
  BoardAnalytics,
  BoardWithChildren,
  Card,
  Column,
  CommentWithAuthor,
  CreateBoardRequest,
  CreateCardRequest,
  CreateColumnRequest,
  CreateCommentRequest,
  CreateLabelRequest,
  CreateWorkspaceRequest,
  DraftDescriptionRequest,
  DraftDescriptionResponse,
  HealthResponse,
  Label,
  LoginRequest,
  MoveCardRequest,
  NotificationWithActor,
  RegisterRequest,
  SuggestMetadataResponse,
  SuggestSubtasksResponse,
  SummarizeBoardResponse,
  TransferOwnershipRequest,
  UpdateBoardRequest,
  UpdateCardRequest,
  UpdateColumnRequest,
  UpdateProfileRequest,
  UpdateWorkspaceMemberRoleRequest,
  UpdateWorkspaceRequest,
  UploadAvatarRequest,
  User,
  Workspace,
  WorkspaceMemberWithUser,
} from '@taskflow/shared';
import { config } from '../config';
import { tokenStorage } from './tokenStorage';

/** Error thrown when the API responds with a non-2xx status. */
export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

/** Type guard for the shared ApiError envelope. */
function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as { error: unknown }).error === 'object'
  );
}

/** Typed fetch wrapper that resolves the JSON body or throws ApiRequestError. Attaches the stored bearer token, if any. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokenStorage.get();
  const response = await fetch(`${config.apiUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiError(body)) {
      throw new ApiRequestError(body.error.message, response.status, body.error.code);
    }
    throw new ApiRequestError(`Request failed (${response.status})`, response.status);
  }

  return body as T;
}

/** Typed API client. Extend with feature endpoints as the app grows. */
export const api = {
  health: (): Promise<HealthResponse> => request<HealthResponse>('/api/health'),

  register: (input: RegisterRequest): Promise<AuthResponse> =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(input) }),

  login: (input: LoginRequest): Promise<AuthResponse> =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(input) }),

  me: (): Promise<User> => request<User>('/api/auth/me'),

  users: {
    updateProfile: (input: UpdateProfileRequest): Promise<User> =>
      request<User>('/api/users/me', { method: 'PATCH', body: JSON.stringify(input) }),

    uploadAvatar: (input: UploadAvatarRequest): Promise<User> =>
      request<User>('/api/users/me/avatar', { method: 'POST', body: JSON.stringify(input) }),
  },

  workspaces: {
    list: (): Promise<Workspace[]> => request<Workspace[]>('/api/workspaces'),

    create: (input: CreateWorkspaceRequest): Promise<Workspace> =>
      request<Workspace>('/api/workspaces', { method: 'POST', body: JSON.stringify(input) }),

    get: (workspaceId: string): Promise<Workspace> =>
      request<Workspace>(`/api/workspaces/${workspaceId}`),

    update: (workspaceId: string, input: UpdateWorkspaceRequest): Promise<Workspace> =>
      request<Workspace>(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),

    delete: (workspaceId: string): Promise<void> =>
      request<void>(`/api/workspaces/${workspaceId}`, { method: 'DELETE' }),

    listMembers: (workspaceId: string): Promise<WorkspaceMemberWithUser[]> =>
      request<WorkspaceMemberWithUser[]>(`/api/workspaces/${workspaceId}/members`),

    addMember: (
      workspaceId: string,
      input: AddWorkspaceMemberRequest,
    ): Promise<WorkspaceMemberWithUser> =>
      request<WorkspaceMemberWithUser>(`/api/workspaces/${workspaceId}/members`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    updateMemberRole: (
      workspaceId: string,
      memberId: string,
      input: UpdateWorkspaceMemberRoleRequest,
    ): Promise<WorkspaceMemberWithUser> =>
      request<WorkspaceMemberWithUser>(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),

    removeMember: (workspaceId: string, memberId: string): Promise<void> =>
      request<void>(`/api/workspaces/${workspaceId}/members/${memberId}`, { method: 'DELETE' }),

    transferOwnership: (workspaceId: string, input: TransferOwnershipRequest): Promise<void> =>
      request<void>(`/api/workspaces/${workspaceId}/transfer-ownership`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    listLabels: (workspaceId: string): Promise<Label[]> =>
      request<Label[]>(`/api/workspaces/${workspaceId}/labels`),

    createLabel: (workspaceId: string, input: CreateLabelRequest): Promise<Label> =>
      request<Label>(`/api/workspaces/${workspaceId}/labels`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    deleteLabel: (labelId: string): Promise<void> =>
      request<void>(`/api/labels/${labelId}`, { method: 'DELETE' }),
  },

  boards: {
    listForWorkspace: (workspaceId: string): Promise<Board[]> =>
      request<Board[]>(`/api/workspaces/${workspaceId}/boards`),

    createForWorkspace: (workspaceId: string, input: CreateBoardRequest): Promise<Board> =>
      request<Board>(`/api/workspaces/${workspaceId}/boards`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    get: (boardId: string): Promise<BoardWithChildren> =>
      request<BoardWithChildren>(`/api/boards/${boardId}`),

    update: (boardId: string, input: UpdateBoardRequest): Promise<Board> =>
      request<Board>(`/api/boards/${boardId}`, { method: 'PATCH', body: JSON.stringify(input) }),

    delete: (boardId: string): Promise<void> =>
      request<void>(`/api/boards/${boardId}`, { method: 'DELETE' }),

    listActivity: (boardId: string): Promise<ActivityWithActor[]> =>
      request<ActivityWithActor[]>(`/api/boards/${boardId}/activity`),

    analytics: (boardId: string, weeks?: number): Promise<BoardAnalytics> =>
      request<BoardAnalytics>(`/api/boards/${boardId}/analytics${weeks ? `?weeks=${weeks}` : ''}`),
  },

  columns: {
    createForBoard: (boardId: string, input: CreateColumnRequest): Promise<Column> =>
      request<Column>(`/api/boards/${boardId}/columns`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    update: (columnId: string, input: UpdateColumnRequest): Promise<Column> =>
      request<Column>(`/api/columns/${columnId}`, { method: 'PATCH', body: JSON.stringify(input) }),

    delete: (columnId: string): Promise<void> =>
      request<void>(`/api/columns/${columnId}`, { method: 'DELETE' }),
  },

  cards: {
    createForColumn: (columnId: string, input: CreateCardRequest): Promise<Card> =>
      request<Card>(`/api/columns/${columnId}/cards`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    update: (cardId: string, input: UpdateCardRequest): Promise<Card> =>
      request<Card>(`/api/cards/${cardId}`, { method: 'PATCH', body: JSON.stringify(input) }),

    move: (cardId: string, input: MoveCardRequest): Promise<Card> =>
      request<Card>(`/api/cards/${cardId}/move`, { method: 'PATCH', body: JSON.stringify(input) }),

    delete: (cardId: string): Promise<void> =>
      request<void>(`/api/cards/${cardId}`, { method: 'DELETE' }),

    addLabel: (cardId: string, input: AttachLabelRequest): Promise<Card> =>
      request<Card>(`/api/cards/${cardId}/labels`, { method: 'POST', body: JSON.stringify(input) }),

    removeLabel: (cardId: string, labelId: string): Promise<Card> =>
      request<Card>(`/api/cards/${cardId}/labels/${labelId}`, { method: 'DELETE' }),

    listComments: (cardId: string): Promise<CommentWithAuthor[]> =>
      request<CommentWithAuthor[]>(`/api/cards/${cardId}/comments`),

    addComment: (cardId: string, input: CreateCommentRequest): Promise<CommentWithAuthor> =>
      request<CommentWithAuthor>(`/api/cards/${cardId}/comments`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    deleteComment: (commentId: string): Promise<void> =>
      request<void>(`/api/comments/${commentId}`, { method: 'DELETE' }),
  },

  notifications: {
    list: (): Promise<NotificationWithActor[]> => request<NotificationWithActor[]>('/api/notifications'),

    markRead: (notificationId: string): Promise<NotificationWithActor> =>
      request<NotificationWithActor>(`/api/notifications/${notificationId}/read`, { method: 'PATCH' }),

    markAllRead: (): Promise<void> => request<void>('/api/notifications/read-all', { method: 'POST' }),
  },

  // AI assist. These endpoints only exist when the server has a provider
  // configured; the client gates them behind `health().ai.enabled` so they are
  // never called (and never shown) when AI is off.
  ai: {
    summarizeBoard: (boardId: string): Promise<SummarizeBoardResponse> =>
      request<SummarizeBoardResponse>(`/api/ai/boards/${boardId}/summary`, { method: 'POST' }),

    askBoard: (boardId: string, input: AskBoardRequest): Promise<AskBoardResponse> =>
      request<AskBoardResponse>(`/api/ai/boards/${boardId}/ask`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    askWorkspace: (workspaceId: string, input: AskWorkspaceRequest): Promise<AskWorkspaceResponse> =>
      request<AskWorkspaceResponse>(`/api/ai/workspaces/${workspaceId}/ask`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    askAssistant: (question: string, history: ChatMessage[]): Promise<AskAssistantResponse> =>
      request<AskAssistantResponse>('/api/ai/assistant/ask', {
        method: 'POST',
        body: JSON.stringify({ question, history }),
      }),

    draftDescription: (workspaceId: string, input: DraftDescriptionRequest): Promise<DraftDescriptionResponse> =>
      request<DraftDescriptionResponse>(`/api/ai/workspaces/${workspaceId}/draft-description`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),

    suggestSubtasks: (cardId: string): Promise<SuggestSubtasksResponse> =>
      request<SuggestSubtasksResponse>(`/api/ai/cards/${cardId}/subtasks`, { method: 'POST' }),

    suggestMetadata: (cardId: string): Promise<SuggestMetadataResponse> =>
      request<SuggestMetadataResponse>(`/api/ai/cards/${cardId}/suggestions`, { method: 'POST' }),
  },
};
