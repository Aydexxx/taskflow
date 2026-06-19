import type { PresenceUser } from '@taskflow/shared';

interface PresenceEntry extends PresenceUser {
  socketId: string;
  boardId: string;
}

/**
 * In-memory presence tracker for board collaborators.
 *
 * Entries are keyed per `(socket, board)` so multiple tabs of the same user are
 * tracked independently, but `listForBoard` de-duplicates by user id for
 * display. Single-process only (no Redis adapter) — sufficient for the
 * single-node deployment; a horizontal scale-out would swap this for a shared
 * store behind the same interface.
 */
export class PresenceRegistry {
  private entries = new Map<string, PresenceEntry>();

  private static key(socketId: string, boardId: string): string {
    return `${socketId}::${boardId}`;
  }

  join(entry: PresenceEntry): void {
    this.entries.set(PresenceRegistry.key(entry.socketId, entry.boardId), entry);
  }

  /** Remove one socket's presence on a board. Returns true if anything changed. */
  leave(socketId: string, boardId: string): boolean {
    return this.entries.delete(PresenceRegistry.key(socketId, boardId));
  }

  /** Remove all of a socket's presence (on disconnect). Returns the affected board ids. */
  removeSocket(socketId: string): string[] {
    const affected: string[] = [];
    for (const [key, entry] of this.entries) {
      if (entry.socketId === socketId) {
        this.entries.delete(key);
        affected.push(entry.boardId);
      }
    }
    return affected;
  }

  /** Update which card a socket is editing on a board. Returns true if the socket was present. */
  setEditing(socketId: string, boardId: string, cardId: string | null): boolean {
    const entry = this.entries.get(PresenceRegistry.key(socketId, boardId));
    if (!entry) return false;
    entry.editingCardId = cardId;
    return true;
  }

  /** De-duplicated presence list for a board (one entry per user). */
  listForBoard(boardId: string): PresenceUser[] {
    const byUser = new Map<string, PresenceUser>();
    for (const entry of this.entries.values()) {
      if (entry.boardId !== boardId) continue;
      const existing = byUser.get(entry.userId);
      // If the user has several tabs open, surface one that is actively editing
      // so the "editing" indicator survives regardless of tab order.
      if (!existing || (entry.editingCardId !== null && existing.editingCardId === null)) {
        byUser.set(entry.userId, {
          userId: entry.userId,
          name: entry.name,
          avatarUrl: entry.avatarUrl,
          editingCardId: entry.editingCardId,
        });
      }
    }
    return [...byUser.values()];
  }
}
