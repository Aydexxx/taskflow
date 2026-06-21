/**
 * Demo data seeder for TaskFlow.
 *
 * Populates a realistic workspace — teammates across every role, a board with
 * Backlog → To Do → In Progress → Done columns, cards with priorities,
 * assignees, due dates, labels, and comments, plus a *backdated* history of
 * completed work so the activity feed, notifications, and analytics dashboard
 * all look alive (multi-week throughput, real cycle times, overdue items).
 *
 * Run with: `npm run seed` (from the repo root) or `npm run seed -w server`.
 *
 * Idempotent: it wipes existing data first, so re-running always yields the same
 * clean demo state. Never run this against a production database.
 *
 * NOTE: `dotenv/config` must be the first import so DATABASE_URL is loaded from
 * server/.env before the Prisma client is constructed.
 */
import 'dotenv/config';
import type { CardPriority, LabelColor } from '@taskflow/shared';
import { prisma } from './services/prisma';
import { hashPassword } from './services/password';
import { createWorkspace, addMember } from './services/workspaces';
import { createBoard } from './services/boards';
import { createColumn } from './services/columns';
import { createCard, updateCard, moveCard } from './services/cards';
import { createLabel, addLabelToCard } from './services/labels';
import { createComment } from './services/comments';

/** Shared password for every demo account (documented in the README). */
const DEMO_PASSWORD = 'password123';

const DEMO_USERS = [
  { name: 'Alice Johnson', email: 'alice@taskflow.dev' },
  { name: 'Bob Lee', email: 'bob@taskflow.dev' },
  { name: 'Carol Diaz', email: 'carol@taskflow.dev' },
  { name: 'Erin Park', email: 'erin@taskflow.dev' },
] as const;

/** A date `days` from now (negative = in the past), as an ISO string. */
function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/** A `Date` exactly `days` in the past. */
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

async function wipe(): Promise<void> {
  // Workspace deletion cascades to members, boards, columns, cards, labels,
  // comments, and activities; users are removed afterwards.
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Backdate a card and its activity log so completed work appears to have
 * happened in the past. `createdAt` becomes the card's creation point and the
 * card's `card_moved` (into Done) activity becomes its completion point — which
 * is exactly what the analytics service reads for throughput and cycle time.
 */
async function backdateCompletion(cardId: string, createdAt: Date, completedAt: Date): Promise<void> {
  await prisma.card.update({ where: { id: cardId }, data: { createdAt } });

  const activities = await prisma.activity.findMany({ where: { type: 'card_moved' } });
  for (const activity of activities) {
    const metadata = JSON.parse(activity.metadata) as { cardId?: string };
    if (metadata.cardId === cardId) {
      await prisma.activity.update({ where: { id: activity.id }, data: { createdAt: completedAt } });
    }
  }
}

async function main(): Promise<void> {
  console.log('🌱  Seeding demo data…');
  await wipe();

  // --- Users -----------------------------------------------------------------
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const users = await Promise.all(
    DEMO_USERS.map((user) => prisma.user.create({ data: { ...user, passwordHash } })),
  );
  const [alice, bob, carol, erin] = users;
  if (!alice || !bob || !carol || !erin) throw new Error('Failed to create demo users');
  console.log(`   • ${users.length} users`);

  // --- Workspace + members ---------------------------------------------------
  // One of each role, so the seeded workspace is ready to manually exercise the
  // whole permission matrix: Alice=OWNER, Bob=ADMIN, Carol=MEMBER, Erin=VIEWER.
  const workspace = await createWorkspace(alice.id, { name: 'Acme Product' });
  await addMember(workspace.id, alice.id, { email: bob.email, role: 'ADMIN' });
  await addMember(workspace.id, alice.id, { email: carol.email });
  await addMember(workspace.id, alice.id, { email: erin.email, role: 'VIEWER' });
  console.log(`   • workspace "${workspace.name}" with 4 members`);

  // --- Labels ----------------------------------------------------------------
  const labelSpecs: Array<{ name: string; color: LabelColor }> = [
    { name: 'Bug', color: 'red' },
    { name: 'Feature', color: 'green' },
    { name: 'Design', color: 'purple' },
    { name: 'Urgent', color: 'orange' },
    { name: 'Docs', color: 'blue' },
    { name: 'Research', color: 'teal' },
  ];
  const labels = new Map<string, string>();
  for (const spec of labelSpecs) {
    const label = await createLabel(workspace.id, alice.id, spec);
    labels.set(spec.name, label.id);
  }
  const labelId = (name: string): string => {
    const id = labels.get(name);
    if (!id) throw new Error(`Unknown label: ${name}`);
    return id;
  };
  console.log(`   • ${labelSpecs.length} labels`);

  // --- Board + columns -------------------------------------------------------
  const board = await createBoard(workspace.id, alice.id, {
    title: 'Q3 Product Roadmap',
    description: 'Planning and execution for the third-quarter release.',
  });
  const backlog = await createColumn(board.id, alice.id, { title: 'Backlog' });
  const todo = await createColumn(board.id, alice.id, { title: 'To Do' });
  const inProgress = await createColumn(board.id, alice.id, { title: 'In Progress' });
  const done = await createColumn(board.id, alice.id, { title: 'Done' });
  console.log(`   • board "${board.title}" with 4 columns`);

  // --- Active cards (current board state) ------------------------------------
  interface CardSpec {
    columnId: string;
    title: string;
    description?: string;
    actorId: string;
    /** Set during creation (no assignment activity logged). */
    assigneeId?: string;
    /** Assigned after creation, so the activity feed records a `card_assigned` entry. */
    assignAfter?: string;
    priority?: CardPriority;
    dueDate?: string;
    labelNames?: string[];
    comments?: Array<{ authorId: string; body: string }>;
  }

  const cardSpecs: CardSpec[] = [
    {
      columnId: backlog.id,
      title: 'Dark mode support',
      description: 'Add a light/dark theme toggle persisted across sessions.',
      actorId: alice.id,
      priority: 'MEDIUM',
      labelNames: ['Feature', 'Design'],
    },
    {
      columnId: backlog.id,
      title: 'Investigate WebSocket scaling',
      description: 'Evaluate a Redis adapter for Socket.IO across multiple nodes.',
      actorId: bob.id,
      priority: 'LOW',
      labelNames: ['Research'],
    },
    {
      columnId: backlog.id,
      title: 'Keyboard shortcuts for power users',
      description: 'Quick-add, search focus, and board navigation via the keyboard.',
      actorId: carol.id,
      priority: 'LOW',
      labelNames: ['Feature'],
    },
    {
      columnId: todo.id,
      title: 'Card due-date reminders',
      description: 'Email teammates when an assigned card is overdue.',
      actorId: alice.id,
      assignAfter: bob.id,
      priority: 'HIGH',
      dueDate: daysFromNow(4),
      labelNames: ['Feature'],
      comments: [{ authorId: alice.id, body: 'Let’s start with in-app banners before email.' }],
    },
    {
      columnId: todo.id,
      title: 'Write onboarding docs',
      actorId: carol.id,
      assigneeId: carol.id,
      priority: 'MEDIUM',
      dueDate: daysFromNow(9),
      labelNames: ['Docs'],
    },
    {
      columnId: todo.id,
      title: 'Audit color contrast for accessibility',
      description: 'Verify WCAG AA across light and dark themes.',
      actorId: alice.id,
      assignAfter: carol.id,
      priority: 'MEDIUM',
      dueDate: daysFromNow(-2), // overdue
      labelNames: ['Design', 'Docs'],
    },
    {
      columnId: inProgress.id,
      title: 'Fix drag-and-drop flicker on Safari',
      description: 'Cards briefly jump back to their origin before settling.',
      actorId: bob.id,
      assignAfter: bob.id,
      priority: 'URGENT',
      dueDate: daysFromNow(-1), // overdue
      labelNames: ['Bug', 'Urgent'],
      comments: [
        { authorId: bob.id, body: 'Reproduced on Safari 17. Looks like a transform timing issue.' },
        { authorId: alice.id, body: `Nice find @[${bob.name}](${bob.id}) — can you check the @dnd-kit version too?` },
      ],
    },
    {
      columnId: inProgress.id,
      title: 'Real-time presence indicators',
      description: 'Show avatars of everyone currently viewing a board.',
      actorId: alice.id,
      assignAfter: alice.id,
      priority: 'HIGH',
      labelNames: ['Feature'],
      comments: [{ authorId: carol.id, body: `@[${alice.name}](${alice.id}) the avatar stack looks great!` }],
    },
    {
      columnId: inProgress.id,
      title: 'Workspace analytics dashboard',
      description: 'Status, throughput, and cycle-time charts per board.',
      actorId: alice.id,
      assignAfter: bob.id,
      priority: 'HIGH',
      dueDate: daysFromNow(6),
      labelNames: ['Feature', 'Design'],
    },
  ];

  let cardCount = 0;
  let commentCount = 0;
  for (const spec of cardSpecs) {
    const card = await createCard(spec.columnId, spec.actorId, {
      title: spec.title,
      description: spec.description,
      assigneeId: spec.assigneeId,
      priority: spec.priority,
      dueDate: spec.dueDate,
    });
    cardCount += 1;

    if (spec.assignAfter) {
      await updateCard(card.id, spec.actorId, { assigneeId: spec.assignAfter });
    }
    for (const name of spec.labelNames ?? []) {
      await addLabelToCard(card.id, labelId(name), spec.actorId);
    }
    for (const comment of spec.comments ?? []) {
      await createComment(card.id, comment.authorId, { body: comment.body });
      commentCount += 1;
    }
  }

  // --- Completed history (backdated for analytics) ---------------------------
  // Each card is created, moved to Done, then backdated so completions spread
  // across the last several weeks with realistic created → done cycle times.
  interface CompletedSpec {
    title: string;
    actorId: string;
    assigneeId: string;
    priority: CardPriority;
    labelNames: string[];
    createdDaysAgo: number;
    completedDaysAgo: number;
  }

  const completedSpecs: CompletedSpec[] = [
    { title: 'Set up JWT authentication', actorId: alice.id, assigneeId: alice.id, priority: 'HIGH', labelNames: ['Feature'], createdDaysAgo: 52, completedDaysAgo: 48 },
    { title: 'Design the Kanban board layout', actorId: carol.id, assigneeId: carol.id, priority: 'MEDIUM', labelNames: ['Design'], createdDaysAgo: 50, completedDaysAgo: 45 },
    { title: 'Workspace + board CRUD APIs', actorId: bob.id, assigneeId: bob.id, priority: 'HIGH', labelNames: ['Feature'], createdDaysAgo: 44, completedDaysAgo: 38 },
    { title: 'Role-based access control', actorId: alice.id, assigneeId: bob.id, priority: 'URGENT', labelNames: ['Feature'], createdDaysAgo: 40, completedDaysAgo: 31 },
    { title: 'Drag-and-drop reordering', actorId: bob.id, assigneeId: carol.id, priority: 'HIGH', labelNames: ['Feature'], createdDaysAgo: 33, completedDaysAgo: 24 },
    { title: 'Comment threads on cards', actorId: carol.id, assigneeId: carol.id, priority: 'MEDIUM', labelNames: ['Feature'], createdDaysAgo: 26, completedDaysAgo: 23 },
    { title: '@mentions and notifications', actorId: alice.id, assigneeId: alice.id, priority: 'HIGH', labelNames: ['Feature'], createdDaysAgo: 21, completedDaysAgo: 16 },
    { title: 'Search and saved filter views', actorId: bob.id, assigneeId: bob.id, priority: 'MEDIUM', labelNames: ['Feature'], createdDaysAgo: 17, completedDaysAgo: 11 },
    { title: 'AI assist (summaries & subtasks)', actorId: alice.id, assigneeId: alice.id, priority: 'HIGH', labelNames: ['Feature', 'Research'], createdDaysAgo: 13, completedDaysAgo: 9 },
    { title: 'Polish empty and loading states', actorId: carol.id, assigneeId: carol.id, priority: 'LOW', labelNames: ['Design'], createdDaysAgo: 8, completedDaysAgo: 4 },
    { title: 'Fix flaky socket reconnect test', actorId: bob.id, assigneeId: bob.id, priority: 'MEDIUM', labelNames: ['Bug'], createdDaysAgo: 5, completedDaysAgo: 2 },
  ];

  for (const spec of completedSpecs) {
    const card = await createCard(todo.id, spec.actorId, {
      title: spec.title,
      assigneeId: spec.assigneeId,
      priority: spec.priority,
    });
    for (const name of spec.labelNames) {
      await addLabelToCard(card.id, labelId(name), spec.actorId);
    }
    await moveCard(card.id, spec.actorId, { columnId: done.id, index: 0 });
    await backdateCompletion(card.id, daysAgo(spec.createdDaysAgo), daysAgo(spec.completedDaysAgo));
    cardCount += 1;
  }

  console.log(`   • ${cardCount} cards (${completedSpecs.length} completed across ~8 weeks), ${commentCount} comments`);

  console.log('\n✅  Seed complete. Demo login:');
  for (const user of DEMO_USERS) {
    console.log(`      ${user.email}  /  ${DEMO_PASSWORD}`);
  }
}

main()
  .catch((error) => {
    console.error('❌  Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
