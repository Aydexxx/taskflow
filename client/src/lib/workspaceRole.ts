import type { WorkspaceMemberWithUser, WorkspaceRole } from '@taskflow/shared';

/** Finds the caller's own membership row in a workspace's member list. */
export function findMembership(
  members: WorkspaceMemberWithUser[],
  userId: string | undefined,
): WorkspaceMemberWithUser | undefined {
  return userId ? members.find((member) => member.userId === userId) : undefined;
}

/** The caller's role in a workspace, or `null` if the member list hasn't loaded yet (or they aren't a member). */
export function myRole(members: WorkspaceMemberWithUser[], userId: string | undefined): WorkspaceRole | null {
  return findMembership(members, userId)?.role ?? null;
}
