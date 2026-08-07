# Architecture Context

## Stack

| Layer            | Technology              | Role                                                           |
| ---------------- | ----------------------- | -------------------------------------------------------------- |
| Framework        | Next.js 16 + TypeScript | Full-stack app with server/client boundaries                   |
| UI               | Tailwind + shadcn/ui    | Component composition and styling                              |
| Auth             | Clerk                   | User identity and route protection                             |
| Database         | Prisma + PostgreSQL     | Relational metadata: projects, collaborators, specs, task runs |
| Canvas           | Liveblocks + React Flow | Real-time collaborative canvas, presence, and cursors          |
| Background tasks | Trigger.dev             | Durable AI generation workflows                                |
| Artifact storage | Vercel Blob             | Canvas snapshots and generated Markdown specs                  |

## System Boundaries

- `app/api` — Authenticated request handlers: input validation, ownership checks, task triggering, and persistence.
- `trigger` — Long-running background jobs: AI design generation and spec generation.
- `lib` — Shared infrastructure: Prisma client, access control helpers, and utilities.
- `components` — UI composition: canvas surfaces, sidebars, dialogs, and interactive elements.
- `prisma` — Database schema and generated client output.
- `data` — Legacy local directory. Not used for new artifacts.

## Storage Model

- **Database**: metadata, ownership, relationships, and task run records.
- **Vercel Blob**: generated artifacts — canvas snapshots at `canvas/{projectId}.json` and specs at `specs/{projectId}/{specId}.md`.
- Project records, spec records, and task run records belong in PostgreSQL.
- Canvas content and Markdown output are stored in and retrieved from Vercel Blob.
- The blob URL is stored in the database (`canvasJsonPath`, `filePath`) as the reference to the artifact.

## Auth and Collaboration Model

- Every project has a single owner (Clerk user ID).
- Projects can include additional collaborators.
- Only authenticated users can access protected routes.
- Only the owner or a collaborator can mutate project resources.
- Liveblocks room tokens are issued only after verifying project membership.

## Starter System Designs

- Prebuilt templates are static canvas snapshots stored in the codebase.
- Templates are loaded into the active Liveblocks room when a user imports one.
- Import can occur on canvas creation or from within the editor at any time.
- Template data follows the same node/edge schema as user-created canvas content.
- Templates do not require a separate database record; they are resolved by template ID at import time.

## AI Generation Model

### Design Generation

- Input: user prompt, project context, and current canvas state.
- Execution: durable background task via Trigger.dev (Gemini via `@ai-sdk/google`).
- Output: structured node and edge updates written into the shared Liveblocks room via the collaborative flow utilities (`mutateFlow` from `@liveblocks/react-flow/node`).
- Presence + status: the task publishes an ephemeral AI presence (the moving AI cursor) to all room participants via Liveblocks broadcast room events, appends coarse status to the room's shared `ai-status-feed` Liveblocks feed, and mirrors status to the triggering user through the run's Trigger.dev metadata. Presence is never persisted to storage.

### Shared AI Activity State

- Three Liveblocks-native channels, each doing what it is designed for — no bespoke realtime store sits alongside them:
  - **Broadcast room events** — the AI's cursor position while it works. High frequency, ephemeral, missed by anyone who joins mid-run.
  - **Feeds** (`ai-status-feed`, one per room) — the durable, room-wide "what is the AI doing" status. Written on phase changes only; a participant who joins mid-run still reads the current state. Payload schema and validation live in `types/tasks.ts`; feed messages are validated before they are displayed.
  - **Presence** (`thinking`) — whether an individual participant is waiting on an AI run, rendered on their live cursor.
- The Liveblocks room provider wraps the whole editor workspace (canvas *and* AI sidebar) so both surfaces read the same room state.

### Room Chat

- A second per-room Liveblocks feed, `ai-chat`, carries chat between the people in the room. It is deliberately separate from `ai-status-feed`: mixing them would make a machine progress line indistinguishable from something a teammate said, and the two have different lifetimes and readers.
- Messages are human-authored only — the AI publishes progress to `ai-status-feed` and its replies stay local to the run's initiator. Payload schema (`sender`, `role`, `content`, `timestamp`) and validation live in `types/tasks.ts`, and every message is validated before it is rendered.
- Liveblocks types feed payloads globally (`FeedMessageData`), so that type is the union of both feeds' shapes and readers narrow it by parsing.

### Spec Generation

- Input: current canvas graph plus the room's chat history. Project context is resolved server-side from the authenticated user and the room id — never from a client-supplied project id.
- Execution: durable background task via Trigger.dev (Gemini via `@ai-sdk/google`).
- Output: a Markdown technical spec returned as the task's output.
- Status: mirrored to the triggering user through run metadata and to the whole room through the shared `ai-status-feed` (`kind: "spec"`), the same two channels design generation uses. The task writes nothing to the canvas.
- Persistence: not yet implemented. When added, the Markdown belongs in Vercel Blob at `specs/{projectId}/{specId}.md` with the blob URL on a `Spec` record, per the storage model above.
- Access to a run's realtime progress is granted by a run-scoped Trigger.dev public token, issued only to the user recorded as the run's owner in `TaskRun`.

## Invariants

1. Request handlers do not run long-lived AI work — that belongs in background tasks.
2. Metadata and large generated artifacts are stored in separate layers.
3. Auth and ownership are enforced at every mutation boundary.
4. Client components are used only where browser interactivity or real-time state requires them.
5. The canvas schema must remain consistent between user-created content and imported templates.
