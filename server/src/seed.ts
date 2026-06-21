/**
 * Demo data seeder for TaskFlow.
 *
 * Populates a realistic workspace — a few teammates, a board with several
 * columns, cards with priorities/assignees/due dates/labels, comments, and a
 * resulting activity feed — so the app is immediately explorable.
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
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

async function wipe(): Promise<void> {
  // Workspace deletion cascades to members, boards, columns, cards, labels,
  // comments, and activities; users are removed afterwards.
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
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

  // --- Cards -----------------------------------------------------------------
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
      columnId: todo.id,
      title: 'Card due-date reminders',
      description: 'Email teammates when an assigned card is overdue.',
      actorId: alice.id,
      assignAfter: bob.id,
      priority: 'HIGH',
      dueDate: daysFromNow(5),
      labelNames: ['Feature'],
      comments: [{ authorId: alice.id, body: 'Let’s start with in-app banners before email.' }],
    },
    {
      columnId: todo.id,
      title: 'Write onboarding docs',
      actorId: carol.id,
      assigneeId: carol.id,
      priority: 'MEDIUM',
      dueDate: daysFromNow(10),
      labelNames: ['Docs'],
    },
    {
      columnId: inProgress.id,
      title: 'Fix drag-and-drop flicker on Safari',
      description: 'Cards briefly jump back to their origin before settling.',
      actorId: bob.id,
      assignAfter: bob.id,
      priority: 'URGENT',
      dueDate: daysFromNow(-1),
      labelNames: ['Bug', 'Urgent'],
      comments: [
        { authorId: bob.id, body: 'Reproduced on Safari 17. Looks like a transform timing issue.' },
        { authorId: alice.id, body: 'Nice find — can you check the @dnd-kit version too?' },
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
    },
    {
      columnId: done.id,
      title: 'Set up JWT authentication',
      actorId: alice.id,
      assigneeId: alice.id,
      priority: 'HIGH',
      labelNames: ['Feature'],
      comments: [{ authorId: carol.id, body: 'Verified token refresh works end to end. 🎉' }],
    },
    {
      columnId: done.id,
      title: 'Design the Kanban board layout',
      actorId: carol.id,
      assigneeId: carol.id,
      priority: 'MEDIUM',
      labelNames: ['Design'],
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
  console.log(`   • ${cardCount} cards, ${commentCount} comments`);

  // A cross-column move, so the activity feed shows a realistic `card_moved` entry.
  const shipped = await createCard(todo.id, alice.id, { title: 'Ship marketing site', priority: 'MEDIUM' });
  await moveCard(shipped.id, alice.id, { columnId: done.id, index: 0 });

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
