import type { Workspace as PrismaWorkspace, WorkspaceMember as PrismaWorkspaceMember } from '@prisma/client';
import type { User as PrismaUser } from '@prisma/client';
import type { AddMemberInput, CreateWorkspaceInput, UpdateWorkspaceInput } from '../validation/workspace.schemas';
import type { Workspace, WorkspaceMemberWithUser } from '@taskflow/shared';
import { prisma } from './prisma';
import { toSafeUser } from './users';
import { requireWorkspaceMember, requireWorkspaceRole } from './authorization';
import { ConflictError, NotFoundError } from '../errors/HttpError';

export function toWorkspace(workspace: PrismaWorkspace): Workspace {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    ownerId: workspace.ownerId,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

export function toWorkspaceMember(member: PrismaWorkspaceMember & { user: PrismaUser }): WorkspaceMemberWithUser {
  return {
    id: member.id,
    workspaceId: member.workspaceId,
    userId: member.userId,
    role: member.role as WorkspaceMemberWithUser['role'],
    createdAt: member.createdAt.toISOString(),
    user: toSafeUser(member.user),
  };
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.length > 0 ? base : 'workspace';
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

export async function createWorkspace(userId: string, input: CreateWorkspaceInput): Promise<Workspace> {
  const slug = await generateUniqueSlug(input.name);
  const workspace = await prisma.workspace.create({
    data: {
      name: input.name,
      slug,
      ownerId: userId,
      members: { create: { userId, role: 'OWNER' } },
    },
  });
  return toWorkspace(workspace);
}

export async function listMyWorkspaces(userId: string): Promise<Workspace[]> {
  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: 'asc' },
  });
  return workspaces.map(toWorkspace);
}

export async function getWorkspace(workspaceId: string, userId: string): Promise<Workspace> {
  await requireWorkspaceMember(workspaceId, userId);
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) throw new NotFoundError('Workspace not found');
  return toWorkspace(workspace);
}

export async function updateWorkspace(
  workspaceId: string,
  userId: string,
  input: UpdateWorkspaceInput,
): Promise<Workspace> {
  await requireWorkspaceRole(workspaceId, userId, ['OWNER']);
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { name: input.name },
  });
  return toWorkspace(workspace);
}

export async function deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
  await requireWorkspaceRole(workspaceId, userId, ['OWNER']);
  await prisma.workspace.delete({ where: { id: workspaceId } });
}

export async function listMembers(workspaceId: string, userId: string): Promise<WorkspaceMemberWithUser[]> {
  await requireWorkspaceMember(workspaceId, userId);
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });
  return members.map(toWorkspaceMember);
}

export async function addMember(
  workspaceId: string,
  userId: string,
  input: AddMemberInput,
): Promise<WorkspaceMemberWithUser> {
  await requireWorkspaceRole(workspaceId, userId, ['OWNER', 'ADMIN']);

  const targetUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (!targetUser) throw new NotFoundError('No user found with that email');

  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: targetUser.id } },
  });
  if (existing) throw new ConflictError('User is already a member of this workspace');

  const member = await prisma.workspaceMember.create({
    data: { workspaceId, userId: targetUser.id, role: input.role ?? 'MEMBER' },
    include: { user: true },
  });
  return toWorkspaceMember(member);
}
