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
Same pipeline from step 4 onward. `POST /api/process-text` splits raw text into sentence chunks, wraps them as `TranscriptDataEvent` objects, and feeds them through `accumulate` → `processWindow` → emit, exactly like the webhook handler does.

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
