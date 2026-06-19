/**
 * Domain models shared between the TaskFlow server and client.
 *
 * These mirror the Prisma schema but use plain serializable types:
 * dates are ISO-8601 strings (how they travel over the wire as JSON),
 * and enum-like fields are string literal unions so the contract stays
 * portable across SQLite (dev) and PostgreSQL (prod) without relying on
 * database-native enum support.
 */

/** ISO-8601 timestamp string, e.g. "2026-06-19T12:00:00.000Z". */
export type ISODateString = string;

/** A member's role within a workspace. */
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export const WORKSPACE_ROLES: readonly WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER'];

/** A card's urgency, lowest to highest. */
export type CardPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const CARD_PRIORITIES: readonly CardPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/**
 * A label's display color. A curated palette (rather than free-form hex)
 * so the UI can render chips with static Tailwind classes.
 */
export type LabelColor =
  | 'gray'
  | 'red'
  | 'orange'
  | 'amber'
  | 'green'
  | 'teal'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink';

export const LABEL_COLORS: readonly LabelColor[] = [
  'gray',
  'red',
  'orange',
  'amber',
  'green',
  'teal',
  'blue',
  'indigo',
  'purple',
  'pink',
];

/** One of the "key actions" recorded on a board's activity feed. */
export type ActivityType =
  | 'card_created'
  | 'card_deleted'
  | 'card_moved'
  | 'card_assigned'
  | 'card_unassigned'
  | 'card_label_added'
  | 'card_label_removed'
  | 'card_commented'
  | 'column_created'
  | 'column_deleted';

/**
 * Denormalized details captured at the time of the action, so the feed reads
 * correctly even after the referenced entity changes or is deleted. Every
 * field is optional; the renderer reads whichever fields its `ActivityType`
 * populates (see the union members below for which fields each type sets).
 */
export interface ActivityMetadata {
  cardId?: string;
  cardTitle?: string;
  columnId?: string;
  columnTitle?: string;
  fromColumnTitle?: string;
  toColumnTitle?: string;
  assigneeName?: string;
  labelName?: string;
  labelColor?: LabelColor;
  commentExcerpt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: ISODateString;
}

export interface Board {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  /** Fractional/sequential ordering index within a board (ascending). */
  position: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Card {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  /** Ordering index within a column (ascending). */
  position: number;
  assigneeId: string | null;
  priority: CardPriority;
  /** Labels currently attached to the card; always present (full snapshot, not a delta). */
  labels: Label[];
  dueDate: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** A board with its columns and cards eagerly loaded (handy for the Kanban view). */
export interface BoardWithChildren extends Board {
  columns: Array<Column & { cards: Card[] }>;
}

/** A workspace-scoped label that can be attached to cards. */
export interface Label {
  id: string;
  workspaceId: string;
  name: string;
  color: LabelColor;
  createdAt: ISODateString;
}

/** A comment left on a card. */
export interface Comment {
  id: string;
  cardId: string;
  authorId: string;
  body: string;
  createdAt: ISODateString;
}

/** A comment with the author's safe user profile attached, for display. */
export interface CommentWithAuthor extends Comment {
  author: User;
}

/** A recorded action on a board's activity feed. */
export interface Activity {
  id: string;
  boardId: string;
  actorId: string;
  type: ActivityType;
  metadata: ActivityMetadata;
  createdAt: ISODateString;
}

/** An activity entry with the actor's safe user profile attached, for display. */
export interface ActivityWithActor extends Activity {
  actor: User;
}
