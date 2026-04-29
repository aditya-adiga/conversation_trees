# Conversation Trees — Developer Context

## What this project is

A real-time conversation analysis tool. It joins a Google Meet call via a Recall AI bot, streams the transcript, runs it through an LLM to generate insight nodes, and displays those nodes as a navigable tree in the browser.

---

## Architecture overview

```
Browser (Next.js)
  ├── InputView         → accepts Google Meet URL or raw text
  ├── NodeView          → spatial tree navigation (parent / siblings / children)
  ├── Minimap           → overview of the full tree
  └── EventSource       → SSE client at /api/recall/stream/[botId]

Next.js API routes
  ├── POST /api/recall/create-bot          → creates Recall AI bot, returns botId
  ├── POST /api/process-text               → accepts raw text, returns botId (text path)
  ├── GET  /api/recall/stream/[botId]      → SSE endpoint (emitter → client)
  ├── POST /api/webhooks/recall/stream     → receives Recall AI transcript webhooks
  └── CRUD /api/nodes, /api/conversations  → node/conversation management

Core services (lib/)
  ├── windowBuffer.ts   → accumulates transcript chunks, calls LLM, emits nodes
  ├── nodeService.ts    → creates nodes with sibling/parent linking in the in-memory DB
  ├── emitter.ts        → Node.js EventEmitter keyed by botId (pub/sub for SSE)
  ├── eventQueue.ts     → queues events if SSE client isn't connected yet
  └── openRouter.ts     → LLM client (OpenRouter)
```

---

## How data flows

**Google Meet path:**
1. `POST /api/recall/create-bot` → Recall AI creates a bot, returns a `botId`
2. Browser opens `EventSource` at `/api/recall/stream/[botId]`
3. Recall AI sends transcript chunks to `POST /api/webhooks/recall/stream`
4. Webhook calls `accumulate(botId, chunk)` then `processWindow(botId)`
5. `processWindow` sends chunks to the LLM → gets back insight nodes
6. Nodes are saved via `nodeService.createNode()` → emitted via `emitter.emit(botId, { node })`
7. SSE endpoint forwards each event to the browser as `data: {JSON}\n\n`
8. Terminal event (`bot.done`) triggers `forceFlush` → `drainAndCleanup` → close

**Text path:**
`POST /api/process-text` wraps the full pasted text as a single `TranscriptDataEvent` (words split on whitespace, dummy timestamps), calls `accumulate` + `forceFlush` to generate all nodes in one LLM call, then emits them through the same emitter/queue pipeline before sending a `bot.done` terminal event. The response returns immediately with a `{ botId }` — all processing is async in the background.

---

## Environment variables

```
RECALL_API_KEY          Recall AI token
RECALL_REGION           Recall AI region (e.g. us-west-2)
NEXT_PUBLIC_APP_URL     Public URL for webhooks (needs to be reachable by Recall AI)
OPENROUTER_API_KEY      OpenRouter LLM key
INFERENCE_MODEL         Model ID (e.g. google/gemini-2.5-flash-preview)
NGROK_DOMAIN            Persistent ngrok domain
NGROK_AUTH_TOKEN        ngrok auth token
```

---

## Code structure conventions

### API routes (`app/api/`)

Route files (`route.ts`) handle only HTTP concerns: parse the request, validate input, return a response. Business logic lives in `lib/services/` and is imported.

```
app/api/<name>/route.ts          ← HTTP only: validate, call service, respond
lib/services/<name>.ts           ← business logic, pipeline, side-effects
lib/services/__tests__/<name>.test.ts
app/api/<name>/__tests__/route.test.ts
```

**Route file responsibilities:**
- Parse and validate the request body
- Return the correct HTTP status and response shape
- Fire-and-forget background work (`.catch()` errors, respond immediately)
- Import everything from `lib/`; no business logic inline

**Service file responsibilities:**
- Own the processing pipeline (accumulate, LLM calls, dispatch, emit)
- Import from `lib/db/`, `lib/emitter/`, other services as needed
- Local helpers (e.g. `dispatch`) stay in the service file, not the route

**Test split:**
- Route test: mock the service, test validation and response shape only
- Service test: mock `windowBuffer`/`emitter`/`eventQueue`, test pipeline ordering and side-effects

### Services (`lib/services/`)

Prefer extending existing services over creating new ones. When a new service is needed:
- It should have a single, clear responsibility
- Export named functions (not classes)
- Keep `dispatch`-style helpers local to the service that owns them

---

## Testing

Uses **Vitest**. Run with:

```bash
bun run test          # run all tests once
bun run test:watch    # watch mode
```

Test files live next to the code they test under `__tests__/` directories. Patterns to follow (see existing tests):

- Mock module-level dependencies with `vi.mock(...)` **before** imports
- Use `vi.mocked()` to get typed references to mocked functions
- Background async work (fire-and-forget) requires `await flushPromises()` before asserting side-effects:
  ```typescript
  const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
  ```
- Use `vi.stubEnv` / `vi.stubGlobal` for env vars and globals; restore with `vi.unstubAllEnvs()` in `afterEach`
- Always `vi.clearAllMocks()` in `beforeEach`

Coverage areas per route:
- Input validation (missing fields, wrong types, empty strings, malformed JSON) → 4xx
- Happy path → correct status + response shape
- Side effects (emitter calls, queue updates, service calls) and their ordering

## Running locally

```bash
npm run dev          # starts Next.js on localhost:3000
```

For the Google Meet path, the webhook URL (`NEXT_PUBLIC_APP_URL`) must be publicly reachable. Use ngrok with a persistent domain so you don't have to update Recall AI config on every restart.

---

## Branch and PR strategy

Work in small, focused branches. Keep backend and frontend changes in separate PRs where possible so each one stays reviewable in isolation.

```
feature/<name>   → one piece of work (backend OR frontend, not both)
integration/<name> → combines related feature branches for end-to-end testing
main             → stable, tested code
```

**Workflow per change:**
1. Branch from `integration/<current>` (or `main` if starting fresh)
2. Make the change, verify it works in isolation
3. Commit and wait for review before moving to the next piece
4. Merge into the integration branch, test end-to-end, then PR to `main`

**Scope guideline:** If a PR touches both `app/api/` and `app/components/`, it's probably too big. Split it.
