import { useEffect, useRef } from 'react';
import type { WorkspaceMemberEvent, WorkspaceMemberRemovedEvent } from '@taskflow/shared';
import { SOCKET_EVENTS } from '@taskflow/shared';
import { socket } from '../lib/socket';

interface UseWorkspaceRealtimeParams {
  workspaceId: string | undefined;
  /** A member was invited or had their role changed. */
  onMemberUpserted: (event: WorkspaceMemberEvent) => void;
  /** A member was removed from the workspace. */
  onMemberRemoved: (event: WorkspaceMemberRemovedEvent) => void;
}

/**
 * Subscribe to a workspace's membership/role-change broadcasts: join the
 * workspace's room and re-join on reconnect (mirrors `useBoardRealtime`'s
 * board-room join pattern). No resync-on-reconnect is needed here — callers
 * already hold an authoritative member list from a REST fetch, and a missed
 * broadcast just means a brief staleness until the next change arrives.
 */
export function useWorkspaceRealtime({
  workspaceId,
  onMemberUpserted,
  onMemberRemoved,
}: UseWorkspaceRealtimeParams): void {
  const onMemberUpsertedRef = useRef(onMemberUpserted);
  const onMemberRemovedRef = useRef(onMemberRemoved);
  onMemberUpsertedRef.current = onMemberUpserted;
  onMemberRemovedRef.current = onMemberRemoved;

  useEffect(() => {
    if (!workspaceId) return;

    const join = (): void => {
      socket.emit(SOCKET_EVENTS.WORKSPACE_JOIN, { workspaceId }, (result) => {
        if (!result.ok) {
          // eslint-disable-next-line no-console
          console.error(`[workspace] join rejected: ${result.error}`);
        }
      });
    };

    const onConnect = (): void => join();
    const onMemberAdded = (p: WorkspaceMemberEvent): void => {
      if (p.workspaceId === workspaceId) onMemberUpsertedRef.current(p);
    };
    const onMemberUpdated = (p: WorkspaceMemberEvent): void => {
      if (p.workspaceId === workspaceId) onMemberUpsertedRef.current(p);
    };
    const onMemberRemovedEvent = (p: WorkspaceMemberRemovedEvent): void => {
      if (p.workspaceId === workspaceId) onMemberRemovedRef.current(p);
    };

    socket.on('connect', onConnect);
    socket.on(SOCKET_EVENTS.WORKSPACE_MEMBER_ADDED, onMemberAdded);
    socket.on(SOCKET_EVENTS.WORKSPACE_MEMBER_UPDATED, onMemberUpdated);
    socket.on(SOCKET_EVENTS.WORKSPACE_MEMBER_REMOVED, onMemberRemovedEvent);

    if (socket.connected) join();

    return () => {
      socket.emit(SOCKET_EVENTS.WORKSPACE_LEAVE, { workspaceId });
      socket.off('connect', onConnect);
      socket.off(SOCKET_EVENTS.WORKSPACE_MEMBER_ADDED, onMemberAdded);
      socket.off(SOCKET_EVENTS.WORKSPACE_MEMBER_UPDATED, onMemberUpdated);
      socket.off(SOCKET_EVENTS.WORKSPACE_MEMBER_REMOVED, onMemberRemovedEvent);
    };
  }, [workspaceId]);
}
