import type { CardPriority, LabelColor, User, WorkspaceMember, WorkspaceRole } from './models';

/**
 * HTTP API contract types shared by server and client.
 */

/** Response shape for `GET /api/health`. */
export interface HealthResponse {
  status: 'ok';
  time: string;
}

/** Standard error envelope returned by the API on failure. */
export interface ApiError {
  error: {
    message: string;
    code?: string;
  };
}

/** Request body for `POST /api/auth/register`. */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

/** Request body for `POST /api/auth/login`. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Response shape for register and login: a bearer token plus the safe user view. */
export interface AuthResponse {
  token: string;
  user: User;
}

/** A workspace member with the member's safe user profile attached. */
export interface WorkspaceMemberWithUser extends WorkspaceMember {
  user: User;
}

/** Roles assignable to another member. OWNER is excluded — it only changes via ownership transfer. */
export type GrantableWorkspaceRole = Exclude<WorkspaceRole, 'OWNER'>;

/** Request body for `POST /api/workspaces`. */
export interface CreateWorkspaceRequest {
  name: string;
}

/** Request body for `PATCH /api/workspaces/:workspaceId`. */
export interface UpdateWorkspaceRequest {
  name?: string;
}

/** Request body for `POST /api/workspaces/:workspaceId/members`. Adds an existing user by email. */
export interface AddWorkspaceMemberRequest {
  email: string;
  /** Defaults to "MEMBER". "OWNER" cannot be granted through this endpoint. */
  role?: GrantableWorkspaceRole;
}

/** Request body for `PATCH /api/workspaces/:workspaceId/members/:memberId`. */
export interface UpdateWorkspaceMemberRoleRequest {
  role: GrantableWorkspaceRole;
}

/** Request body for `POST /api/workspaces/:workspaceId/transfer-ownership`. */
export interface TransferOwnershipRequest {
  /** The `WorkspaceMember.id` of the member who becomes the new owner. */
  memberId: string;
}

/** Request body for `POST /api/workspaces/:workspaceId/boards`. */
export interface CreateBoardRequest {
  title: string;
  description?: string;
}

/** Request body for `PATCH /api/boards/:boardId`. */
export interface UpdateBoardRequest {
  title?: string;
  description?: string | null;
}

/** Request body for `POST /api/boards/:boardId/columns`. */
export interface CreateColumnRequest {
  title: string;
  /** 0-based target index among the board's columns; defaults to the end of the list. */
  index?: number;
}

/** Request body for `PATCH /api/columns/:columnId`. */
export interface UpdateColumnRequest {
  title?: string;
  /** 0-based target index among the board's columns; reorders within the same board. */
  index?: number;
}

/** Request body for `POST /api/columns/:columnId/cards`. */
export interface CreateCardRequest {
  title: string;
  description?: string;
  assigneeId?: string;
  priority?: CardPriority;
  /** ISO-8601 timestamp string. */
  dueDate?: string;
  /** 0-based target index among the column's cards; defaults to the end of the list. */
  index?: number;
}

/** Request body for `PATCH /api/cards/:cardId`. Does not move the card; see `MoveCardRequest`. */
export interface UpdateCardRequest {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  priority?: CardPriority;
  dueDate?: string | null;
}

/** Request body for `PATCH /api/cards/:cardId/move`. */
export interface MoveCardRequest {
  /** Destination column id (may be the card's current column for a same-column reorder). */
  columnId: string;
  /** 0-based target index among the destination column's cards, after the move. */
  index: number;
}

/** Request body for `POST /api/workspaces/:workspaceId/labels`. */
export interface CreateLabelRequest {
  name: string;
  color: LabelColor;
}

/** Request body for `POST /api/cards/:cardId/labels`. */
export interface AttachLabelRequest {
  labelId: string;
}

/** Request body for `POST /api/cards/:cardId/comments`. */
export interface CreateCommentRequest {
  body: string;
}
