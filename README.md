# TaskFlow

[![CI](https://github.com/Aydexxx/taskflow/actions/workflows/ci.yml/badge.svg)](https://github.com/Aydexxx/taskflow/actions/workflows/ci.yml)

A real-time, collaborative Kanban board for project management — built as a strict-TypeScript full-stack monorepo.

Create workspaces, invite teammates with role-based permissions, and organize
work on drag-and-drop boards. Every change propagates live to everyone viewing
the same board; an optional AI layer assists with planning; and a per-board
analytics dashboard turns the board into throughput, cycle-time, and workload
insights.

## Headline features

- 🟢 **Real-time collaboration** — card/column mutations, comments, and an
  activity feed broadcast instantly over Socket.IO to everyone in a board's
  room, with presence avatars showing who is viewing and editing what.
- 🔐 **Role-based access control (RBAC)** — `OWNER / ADMIN / MEMBER / VIEWER`
  roles enforced in the service layer on every workspace, board, column, card,
  label, and comment operation (not just in the UI).
- ✨ **AI assist (optional)** — board summaries, subtask breakdown, description
  drafting, and label/priority suggestions behind a provider-agnostic service
  (OpenAI or local Ollama). **Off by default** and completely inert until a
  provider is configured. See [AI assist](#ai-assist-optional).
- 📊 **Workspace analytics** — a read-only, per-board dashboard: cards by status,
  assignee, and priority; weekly throughput; overdue count; and a created → done
  cycle-time approximation. Accessible, responsive, theme-aware charts.

## Also included

- **Drag-and-drop Kanban** — reorder columns and move cards within and across
  columns with [@dnd-kit](https://dndkit.com/) (pointer + keyboard accessible),
  with optimistic updates and rollback on failure.
- **Full-stack TypeScript** — one `@taskflow/shared` package is the single
  source of truth for the HTTP API and Socket.IO contract; the frontend and
  backend are type-checked against the same definitions.
- **JWT authentication** — register/login issues signed JWTs that gate both REST
  routes (`requireAuth` middleware) and every Socket.IO handshake.
- **Cards with structure** — descriptions, assignees, priorities, due dates,
  color labels, and threaded comments with @mentions and notifications.
- **Search & filtering** — free-text search plus assignee, label, priority, and
  due-date filters, all combined client-side for instant results; filter state
  lives in the URL (shareable/bookmarkable) and can be saved as a named view.
- **Polished UI** — a small reusable design system (buttons, inputs, modals,
  avatars, badges, spinners), responsive layout, loading/empty/error states,
  reduced-motion support, and a persisted light/dark theme.

## Tech stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript (strict) across all packages |
| Monorepo | npm workspaces (`shared`, `server`, `client`) |
| Backend | Node.js, Express |
| Realtime | Socket.IO (JWT-authenticated, room-per-board) |
| Database | Prisma ORM — SQLite (dev) / PostgreSQL (prod) |
| Auth | JSON Web Tokens (`jsonwebtoken`) + `bcryptjs` password hashing |
| Validation | Zod request schemas |
| Frontend | React 18, Vite, React Router |
| Styling | Tailwind CSS |
| Drag & drop | @dnd-kit |
| Charts | Recharts (lazy-loaded, theme-aware) |
| AI (optional) | OpenAI or local Ollama, provider-agnostic |
| Testing | Vitest (+ Testing Library, jsdom) |
| CI | GitHub Actions |

## Project structure

```
taskflow/
├── shared/   # @taskflow/shared — domain models, API types, Socket.IO contract
├── server/   # Express + Prisma + Socket.IO
│   ├── prisma/   # schema.prisma (SQLite dev / Postgres-ready), migrations
│   └── src/
│       ├── routes/        # auth, workspaces, boards (+analytics), columns, cards, labels, comments, ai
│       ├── services/      # data access, positioning, authorization, analytics, jwt, password
│       │   └── ai/        # provider-agnostic AiService (OpenAI/Ollama/disabled), features
│       ├── middleware/    # requireAuth, validateBody, requireAiEnabled, error/404 handlers
│       ├── socket/        # typed, JWT-authenticated Socket.IO server + board rooms
│       └── seed.ts        # demo data seeder (backdated history for lively analytics)
└── client/   # React + Vite + Tailwind
    └── src/
        ├── components/ui/         # reusable design-system primitives
        ├── components/board/      # KanbanBoard, CardModal, PresenceBar, ActivityFeed
        ├── components/analytics/  # StatCard, ChartCard, theme-aware Recharts charts
        ├── hooks/                 # useBoardRealtime (socket subscription)
        ├── lib/board/             # pure reorder + event-reducer logic
        ├── lib/analytics.ts       # chart palettes + formatting (pure, unit-tested)
        └── pages/                 # Login, Register, Workspaces, Board, Analytics
```

## Prerequisites

- Node.js 18+ and npm 9+ (for workspaces).

## Local setup

From the repository root:

```bash
# 1. Install all workspace dependencies
npm install

# 2. Build the shared types package (consumed by server + client)
npm run build:shared

# 3. Configure environment
cp server/.env.example server/.env   # AI is off by default (AI_PROVIDER=none)
cp client/.env.example client/.env   # optional; defaults to localhost:4000

# 4. Create the SQLite database and generate the Prisma client
npm run prisma:migrate        # name the first migration e.g. "init"

# 5. (Optional) Populate a demo workspace with users, a board, cards and comments
npm run seed
```

Then start both dev servers (two terminals from the root):

```bash
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5173
```

Open http://localhost:5173 and register a new account, or — if you ran the
seed — sign in with a demo account below.

### Demo credentials

`npm run seed` creates a workspace ("Acme Product") with one teammate of **each
role** and a board carrying ~20 cards — including a backdated history of
completed work so the activity feed and the analytics dashboard look alive
(multi-week throughput, realistic cycle times, overdue items). All demo accounts
share the same password:

| Email | Password | Role |
| --- | --- | --- |
| `alice@taskflow.dev` | `password123` | Owner |
| `bob@taskflow.dev` | `password123` | Admin |
| `carol@taskflow.dev` | `password123` | Member |
| `erin@taskflow.dev` | `password123` | Viewer |

Sign in as two of them in separate browsers to see real-time collaboration and
presence; sign in as Erin to see read-only (viewer) permissions in action. Open
a board's analytics from the header chart icon. Re-running `npm run seed` resets
the demo data to a clean state (it is destructive — never run it against a
production database).

## Scripts (root)

| Script | Description |
| --- | --- |
| `npm run build:shared` | Compile the shared types package |
| `npm run build` | Build shared, server, and client |
| `npm run dev:server` | Run the backend with hot reload (`tsx watch`) |
| `npm run dev:client` | Run the Vite dev server |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run seed` | Seed the demo workspace |
| `npm run typecheck` | Type-check all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run test` | Run the server + client test suites |

## Architecture overview

### Shared types as the contract

`@taskflow/shared` exports the domain models (`User`, `Workspace`, `Board`,
`Column`, `Card`, `Label`, `Comment`, …), the REST request/response shapes, and
the Socket.IO event map. Both ends import from it, so an API or event change that
is not reflected on both sides fails `tsc`. Because the server and client resolve
the package from its compiled `dist/`, **run `npm run build:shared` after editing
anything under `shared/src`.**

### Real-time room model

The Socket.IO server authenticates every handshake with the same JWT used for
REST. A client viewing a board emits `board:join`; the server verifies the user
is a member of the board's workspace before adding the socket to a room keyed by
board id. All mutations to that board (card created/updated/moved/deleted, column
changes, new comments, activity entries) are broadcast only to that room. Client
state is reconciled by **idempotent, position-sorted reducers** keyed on entity
id, so a user's own echoed change, out-of-order events, and post-reconnect
resyncs all converge to the same layout without duplicates. Presence (who is
viewing, who is editing which card) is tracked per room and synced on join/leave.

### Authorization

Authorization is enforced in the service layer, not just the routes. Every
workspace/board/column/card/label/comment operation resolves the target's
workspace and checks the caller's membership (and role, for owner-only actions
like renaming or deleting a workspace) before reading or writing. The helpers
accept either the Prisma client or a transaction client, so a "read siblings →
compute position → write" sequence runs atomically inside `prisma.$transaction`
while reusing the exact same authorization checks.

### Analytics

`GET /api/boards/:boardId/analytics?weeks=N` returns a read-only snapshot
(`requireWorkspaceMember`, so viewers can read it too) computed entirely
server-side: current distribution by status/assignee/priority, weekly throughput
over the last _N_ weeks, an overdue count, and a created → done cycle-time
approximation. "Completion" is defined as a card residing in the board's **last
column** (highest position); a card's completion time is the most recent
`card_moved` activity into that column, falling back to its creation time. The
client only renders — charts are theme-aware [Recharts](https://recharts.org/),
each wrapped in a `role="img"` figure with a visually-hidden data table so the
information is never SVG-only, and the whole dashboard is **lazy-loaded** so the
charting library stays out of the main bundle.

### AI assist (optional)

AI is an additive layer that follows a strict **graceful-degradation** contract:
the app must run perfectly with **no AI configured**, which is the default.

- **Provider-agnostic service.** A single `AiService` wraps one swappable
  `LlmClient` (`server/src/services/ai`). Providers — OpenAI, Ollama, or a
  disabled `null` default — are selected purely by config; no feature code ever
  branches on the provider. `isEnabled()` is the one gate every feature, route,
  and the health endpoint consult.
- **Config-only switch.** `AI_PROVIDER` (`none` | `openai` | `ollama`, default
  `none`) plus the matching credentials/model in `server/.env` turn AI on. A
  provider without its credentials (e.g. `openai` with no `OPENAI_API_KEY`)
  stays **disabled** rather than crashing. See
  [`server/.env.example`](server/.env.example).
- **Inert when off.** With AI disabled, every `/api/ai/*` route responds `404`
  (the feature set genuinely does not exist), `/api/health` reports
  `ai.enabled: false`, and the client renders **no AI UI at all**. The frontend
  discovers availability from `/api/health` and gates every affordance on it.
- **Features (all gated, authorized, and rate-limited per user):** *summarize
  board* (a manager-friendly digest), *break into subtasks* (an editable
  checklist), *draft description* (from a title), and *suggest labels/priority*.
  Every result is a **draft/suggestion the user reviews and accepts** — AI never
  mutates board data on its own.
- **Defensive by design.** Structured features demand strict JSON and parse it
  defensively (code-fence stripping, balanced-span extraction, zod validation),
  falling back gracefully on bad output. Calls are per-user rate-limited
  (`AI_RATE_LIMIT_PER_MINUTE`), time-bounded (`AI_REQUEST_TIMEOUT_MS`), and the
  board summary is briefly cached to stay cost-aware. AI activity is logged as
  structured JSON lines (metadata only — never prompt/response bodies).

## Testing

```bash
npm run test
```

Runs both suites; no external services are required.

- **Server (Vitest):** auth (register/login/me, success and failure paths),
  workspace/board/column/card CRUD, authorization boundaries (403s for
  non-members and non-owners), card move/reorder correctness, label and comment
  flows, the activity feed, and Socket.IO behavior — authorized board join,
  live propagation to a second connected client, and presence add/remove. Tests
  run against an isolated SQLite `test.db` (pushed fresh in a global setup) and
  an in-process Socket.IO server.
- **Client (Vitest + Testing Library):** board rendering, a drag-and-drop
  reorder (keyboard sensor), the pure reorder logic, `useBoardRealtime` applying
  an incoming live broadcast (and ignoring events for other boards), and the
  analytics dashboard's loading/empty/error states and accessible data tables.
- **Analytics (Vitest):** status/priority/assignee aggregation, throughput
  bucketing, overdue and cycle-time computation, the `weeks` clamp, empty-board
  handling, and viewer-allowed / non-member-denied authorization.
- **AI (Vitest, zero real API calls):** a *disabled* suite proving graceful
  degradation (health reports AI off, every `/api/ai/*` route is `404`, the rest
  of the app works), and an *enabled* suite driven by a **faked provider** that
  covers summarize/subtasks/description/suggestions, strict-JSON parsing with
  fallbacks, authorization, and per-user rate limiting. The client gating
  (no AI UI when disabled) is unit-tested too.

## Deployment & PostgreSQL

The schema is written to be database-portable (no SQLite- or Postgres-specific
features — enum-like fields are stored as `String` and validated against the
shared union types). To move from the dev SQLite database to **PostgreSQL** in
production:

1. In [`server/prisma/schema.prisma`](server/prisma/schema.prisma), change the
   `datasource db` `provider` from `"sqlite"` to `"postgresql"`.
2. Point `DATABASE_URL` at your Postgres instance, e.g.
   `postgresql://user:password@host:5432/taskflow?schema=public`.
3. Run `npm run prisma:migrate` (or `prisma migrate deploy` in CI/CD) to apply
   migrations, then `npm run build` and start the server with `npm run start -w
   @taskflow/server`.

Set `JWT_SECRET` to a long random value and `CLIENT_URL` to your deployed
frontend origin (used for CORS and Socket.IO). See
[`server/.env.example`](server/.env.example) for every variable.

## License

MIT © 2026 Aydexxx — see [LICENSE](LICENSE).
