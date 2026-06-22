import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type {
  GrantableWorkspaceRole,
  Workspace,
  WorkspaceMemberEvent,
  WorkspaceMemberRemovedEvent,
  WorkspaceMemberWithUser,
  WorkspaceRole,
} from '@taskflow/shared';
import { WORKSPACE_ROLE_RANK, roleAtLeast } from '@taskflow/shared';
import { api, ApiRequestError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { AppHeader } from '../components/AppHeader';
import { AppPage } from '../components/AppPage';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { TrashIcon } from '../components/icons';
import { Badge, Button, EmptyState, Input, Select, Spinner } from '../components/ui';
import { useWorkspaceRealtime } from '../hooks/useWorkspaceRealtime';
import { myRole as deriveMyRole } from '../lib/workspaceRole';

/** Roles assignable through this page; OWNER only ever changes via "Make owner". */
const GRANTABLE_ROLES: GrantableWorkspaceRole[] = ['ADMIN', 'MEMBER', 'VIEWER'];

/** Mirrors the server's `assertCanManageMember`: managing a member requires strictly outranking them. */
function outranks(a: WorkspaceRole, b: WorkspaceRole): boolean {
  return WORKSPACE_ROLE_RANK[a] > WORKSPACE_ROLE_RANK[b];
}

export function WorkspaceMembersPage(): JSX.Element {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberWithUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<GrantableWorkspaceRole>('MEMBER');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [rowError, setRowError] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    Promise.all([api.workspaces.get(workspaceId), api.workspaces.listMembers(workspaceId)])
      .then(([loadedWorkspace, loadedMembers]) => {
        if (cancelled) return;
        setWorkspace(loadedWorkspace);
        setMembers(loadedMembers);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof ApiRequestError ? error.message : 'Failed to load members');
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const myRoleValue = useMemo(() => deriveMyRole(members ?? [], user?.id), [members, user?.id]);
  const canManage = myRoleValue !== null && roleAtLeast(myRoleValue, 'ADMIN');

  const handleMemberUpserted = useCallback((event: WorkspaceMemberEvent) => {
    setMembers((current) => {
      if (!current) return current;
      const exists = current.some((member) => member.id === event.member.id);
      return exists
        ? current.map((member) => (member.id === event.member.id ? event.member : member))
        : [...current, event.member];
    });
  }, []);

  const handleMemberRemoved = useCallback(
    (event: WorkspaceMemberRemovedEvent) => {
      if (event.userId === user?.id) {
        navigate('/app');
        return;
      }
      setMembers((current) => current?.filter((member) => member.userId !== event.userId) ?? current);
    },
    [navigate, user?.id],
  );

  useWorkspaceRealtime({ workspaceId, onMemberUpserted: handleMemberUpserted, onMemberRemoved: handleMemberRemoved });

  async function handleInvite(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!workspaceId) return;
    const email = inviteEmail.trim();
    if (!email) return;

    setIsInviting(true);
    setInviteError(null);
    try {
      const member = await api.workspaces.addMember(workspaceId, { email, role: inviteRole });
      setMembers((current) => (current ? [...current, member] : [member]));
      setInviteEmail('');
      setInviteRole('MEMBER');
    } catch (error) {
      setInviteError(error instanceof ApiRequestError ? error.message : 'Failed to invite member');
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRoleChange(member: WorkspaceMemberWithUser, role: GrantableWorkspaceRole): Promise<void> {
    if (!workspaceId) return;
    setRowError(null);
    setBusyMemberId(member.id);
    try {
      const updated = await api.workspaces.updateMemberRole(workspaceId, member.id, { role });
      setMembers((current) => current?.map((m) => (m.id === member.id ? updated : m)) ?? current);
    } catch (error) {
      setRowError(error instanceof ApiRequestError ? error.message : 'Failed to update role');
    } finally {
      setBusyMemberId(null);
    }
  }

  async function handleRemove(member: WorkspaceMemberWithUser): Promise<void> {
    if (!workspaceId) return;
    if (!window.confirm(`Remove ${member.user.name} from this workspace?`)) return;
    setRowError(null);
    setBusyMemberId(member.id);
    try {
      await api.workspaces.removeMember(workspaceId, member.id);
      setMembers((current) => current?.filter((m) => m.id !== member.id) ?? current);
    } catch (error) {
      setRowError(error instanceof ApiRequestError ? error.message : 'Failed to remove member');
      setBusyMemberId(null);
    }
  }

  async function handleTransferOwnership(member: WorkspaceMemberWithUser): Promise<void> {
    if (!workspaceId) return;
    if (!window.confirm(`Make ${member.user.name} the workspace owner? You will become an admin.`)) return;
    setRowError(null);
    setBusyMemberId(member.id);
    try {
      await api.workspaces.transferOwnership(workspaceId, { memberId: member.id });
      setMembers(
        (current) =>
          current?.map((m) => {
            if (m.id === member.id) return { ...m, role: 'OWNER' };
            if (m.userId === user?.id) return { ...m, role: 'ADMIN' };
            return m;
          }) ?? current,
      );
    } catch (error) {
      setRowError(error instanceof ApiRequestError ? error.message : 'Failed to transfer ownership');
    } finally {
      setBusyMemberId(null);
    }
  }

  const memberCount = members?.length ?? 0;

  return (
    <AppPage
      header={
        <AppHeader
          title={workspace ? `Members – ${workspace.name}` : 'Members'}
          backTo={workspaceId ? { to: `/workspaces/${workspaceId}`, label: 'Boards' } : undefined}
        />
      }
      maxWidth="max-w-3xl"
    >
      <PageHeader
        eyebrow={
          members !== null ? (
            <Badge tone="accent" mono>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Badge>
          ) : undefined
        }
        title="Members"
        subtitle={
          workspace
            ? `Manage who can see and shape ${workspace.name} — invite teammates, set their access, and hand off ownership.`
            : 'Manage who can see and shape this workspace — invite teammates, set their access, and hand off ownership.'
        }
      />
      <div className="mt-8">
        {canManage && (
          <form
            onSubmit={handleInvite}
            className="mb-8 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-soft ring-1 ring-slate-900/[0.02] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/60 dark:ring-0"
          >
            <Input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="Invite by email"
              aria-label="Invite by email"
              className="min-w-[14rem] flex-1"
            />
            <Select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as GrantableWorkspaceRole)}
              aria-label="Role for new member"
              className="w-36"
            >
              {GRANTABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>
            <Button type="submit" isLoading={isInviting} disabled={!inviteEmail.trim()}>
              {isInviting ? 'Inviting…' : 'Invite'}
            </Button>
          </form>
        )}
        {inviteError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{inviteError}</p>}
        {rowError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{rowError}</p>}

        {members === null && !loadError && (
          <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
            <Spinner className="h-4 w-4" />
            Loading members…
          </div>
        )}
        {loadError && <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>}
        {members !== null && members.length === 0 && (
          <EmptyState title="No members" description="This workspace has no members yet." />
        )}

        <ul className="flex flex-col gap-2">
          {members?.map((member) => {
            const canManageRow =
              canManage && myRoleValue !== null && outranks(myRoleValue, member.role) && member.userId !== user?.id;
            const canTransferTo = myRoleValue === 'OWNER' && member.userId !== user?.id;
            const isBusy = busyMemberId === member.id;
            return (
              <li
                key={member.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-soft ring-1 ring-slate-900/[0.02] transition duration-150 ease-out-soft hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:ring-0"
              >
                <Avatar name={member.user.name} avatarUrl={member.user.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {member.user.name}
                    {member.userId === user?.id && <span className="ml-1 text-slate-400">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{member.user.email}</p>
                </div>

                {canManageRow ? (
                  <Select
                    value={member.role}
                    disabled={isBusy}
                    onChange={(event) => handleRoleChange(member, event.target.value as GrantableWorkspaceRole)}
                    aria-label={`Role for ${member.user.name}`}
                    className="w-32"
                  >
                    {GRANTABLE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Badge tone={member.role === 'OWNER' ? 'accent' : 'neutral'}>{member.role}</Badge>
                )}

                {canManageRow && (
                  <button
                    type="button"
                    onClick={() => handleRemove(member)}
                    disabled={isBusy}
                    aria-label={`Remove ${member.user.name}`}
                    className="flex-shrink-0 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    <TrashIcon />
                  </button>
                )}

                {canTransferTo && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => handleTransferOwnership(member)}
                  >
                    Make owner
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </AppPage>
  );
}
