# graphty-element's assistant on TanStack AI: design

Status: proposed, 2026-10-10, for the owner's review.

graphty-element, graphty's standalone graph web component, ships an AI assistant (`./ai`,
`enableAiControl()`) that turns a reader's request into graph commands, entirely in the reader's
browser on the reader's own OpenAI, Anthropic or Google key. Its model calls go through the Vercel
AI SDK 5 (`ai`, `@ai-sdk/*`). The owner has decided to replace that with TanStack AI without a
breaking change and to grow the assistant at the same time; this is the design for both. TanStack
facts were read from the published 0.68 packages and, where marked, run with fake models; nothing
was run against a real provider key.

---

## 1. The answer in one page

**For consumers, nothing breaks and nothing new is installed.** `enableAiControl({ provider,
apiKey })` and `aiCommand(text)` give the same `ExecutionResult` codes; `VercelAiProvider`
(including `configure({ baseUrl })`), `MockLlmProvider` and `WebLlmProvider` keep their contracts.
TanStack AI and the vendor SDKs are built into graphty-element's own lazily loaded chunks: a page
that never enables the assistant downloads none of it, one that does downloads the shared loop plus
the reader's provider (gzip: Anthropic 99 kB, Gemini 136 kB, OpenAI 153 kB, against 152 kB for all
three today). The `ai` and `@ai-sdk/*` peers stay declared and optional, unused until the next
major removes them. No framework or provider type reaches the public API; every new behavior is off
by default.

**One public type question goes to the owner** (section 12): the new features add members to the
result-code and event unions, which are published closed. Milestones 1 and 2 change no public type
and do not wait for the answer; `AiState` is not widened at all.

**What readers get**, each switched on by one option: **conversations that remember** (page session
or IndexedDB, scoped to the graph); **approvals** that survive a reload, run at most once across
tabs, and are refused if the graph changed; **helpers and plans** with typed questions mid-task;
**web search and web pages** with sources, and **code execution** in a sandbox in the page; and
**voice**: push-to-talk in and spoken answers out on every provider, a controller button or pinch in
a headset, approvals answerable in the headset, "this" resolved from pointing, never the only path.

**Cheap to switch again**: graphty owns loop, policies, plans, formats and tests; TanStack sits
behind one internal interface in one folder, held there by six checked rules (section 7).

**The plan.** Each milestone ships as a minor release; milestone 2 takes several pull requests
(section 8), the others one each.

| Milestone                      | What lands                                                                                                                                                         | Needs                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| 1. Engine seam                 | Engine interface; reentrant loop and tool executor; today's assistant on it (AI SDK 5 underneath); fake engine; contract suite; harness on the engine; every check | --                             |
| 2. TanStack engine (parity)    | Adapter folder, per-provider chunks, `baseUrl` and retries carried over, AI SDK removed, paid run equal to baseline                                                | 1, zod 4 (#1940), owner's keys |
| 3. Conversations and approvals | History; saved format version 1, complete; approvals                                                                                                               | 2, owner's answer on unions    |
| 4. Helpers and plans           | Roles, router, plans, research helper, questions                                                                                                                   | 3                              |
| 5. Tools                       | Web search and fetch; in-page code (after a spike)                                                                                                                 | 4                              |
| 6. Voice                       | Push-to-talk, speech out, XR binding and approvals, pointing                                                                                                       | 3 (parallel with 4, 5)         |
| 7. Live voice                  | Speech-to-speech on OpenAI and Gemini                                                                                                                              | 6; may slip                    |

Only milestone 3 touches the saved format's files; later milestones add behavior, not versions.

---

## 2. Architecture

### 2.1 Who owns what

graphty owns the conversation and everything done with it: loop, history, approval policy, undo
step, plans, helpers, voice routing, retries, saved formats and result codes. The engine owns one
thing, **talking to a model**: one call is one model turn, returning streamed text, the tool calls
the model asked for, hosted-tool results, usage, opaque provider state and a finish reason, or a
coded error. It never runs a command and never decides anything.

So graphty uses TanStack AI's `chat()` for one turn, not its multi-turn loop: policies and plans
written as TanStack middleware or `defineAgent` configuration would be framework code (rule 4);
graphty's loop (`src/ai/AiController.ts`) already does ordered execution, one undo step per
message, cancel-on-undo, truncation and the answer-only final round under 766 unit tests; and the
English TanStack's loop writes into conversations never arises. Tools are declared without
executors, so a turn that calls tools ends with a `tanstack:client_tool_execution` interrupt carrying
the calls (ran, study 1); a contract case guards this across upgrades. TanStack's subagent,
persistence and client packages are not used: their records carry TanStack metadata (rule 2), and
`ChatClient` persistence loses writes silently (spike, measured in Chromium).

### 2.2 Diagram

```
 page / graphty app --enableAiControl, aiCommand, resolveAiApproval, aiTalk, events-->
 graphty-element src/ai/:
   AiManager (config in graphty's terms) -> AiController (public state, status)
     -> runConversation (reentrant loop) + policy, plans, Conversation/ConversationStore
     -> ToolExecutor (validate, policy, transaction, undo step, { code, params })
     -> AiEngine (internal, one model turn); voice paths sit before and after the loop
          |- ProviderApiEngine  engine/tanstack/, the ONLY folder importing TanStack or a vendor SDK
          |- LlmProviderEngine  any LlmProvider: Mock, WebLLM, a consumer's (the in-browser seam)
          `- FakeEngine         scripted, for tests
 engine/tanstack/ --import() on first use, one chunk per provider-->
   @tanstack/ai + ai-openai | ai-anthropic | ai-gemini + vendor SDK
   --HTTPS from the page, reader's key, consumer's baseUrl--> the provider's API
```

### 2.3 The engine interface

Internal (not exported). Every type in it is graphty's own; reasons and capability values are
codes, so they can grow before the interface is ever exported.

```ts
interface AiEngine {
    readonly kind: "provider-api" | "llm-provider" | "fake";
    capabilities(model: string): EngineCapabilities;
    turn(request: TurnRequest, signal: AbortSignal): AsyncIterable<TurnEvent>;
    checkKey(signal: AbortSignal): Promise<{ code: AiResultCode; params: AiResultParams }>;
    transcribe?(audio: Blob, options: TranscribeOptions, signal: AbortSignal): Promise<TurnText>;
    speak?(text: string, options: SpeakOptions, signal: AbortSignal): Promise<Blob>;
    openLive?(options: LiveOptions): Promise<LiveConnection>;
    runProgram?(
        source: string,
        bindings: ProgramBindings,
        limits: ProgramLimits,
        signal: AbortSignal,
    ): Promise<ProgramResult>;
    dispose(): void;
}

interface TurnRequest {
    model: string;
    system: string;
    messages: readonly SavedMessage[]; // graphty's saved message type (5.1)
    tools: readonly ToolSpec[]; // name, description, zod schema and its JSON Schema
    toolMode: "auto" | "none"; // "none" = answer in text now
    hostedTools: readonly HostedToolRequest[]; // web-search, web-fetch, with limits and allowed domains
    maxOutputTokens?: number;
    temperature?: number;
}

type TurnEvent =
    | { type: "text"; delta: string; providerState?: ProviderState }
    | { type: "tool-call"; id: string; name: string; arguments: unknown; providerState?: ProviderState }
    | { type: "reasoning"; providerState: ProviderState }
    | { type: "hosted-tool"; tool: HostedToolId; status: "done" | "result-unavailable"; sources: readonly Source[] }
    | { type: "usage"; inputTokens: number; outputTokens: number }
    | { type: "finish"; reason: TurnFinishCode }
    | { type: "error"; code: AiResultCode; params: AiResultParams };

/** Opaque provider round-trip data (Gemini thought signatures, Anthropic thinking signatures,
 *  OpenAI encrypted reasoning). Only the adapter reads `data`. */
interface ProviderState {
    engine: string;
    provider: string;
    model: string;
    data: unknown;
}
```

The adapter's job, per provider: build the client with the reader's key and `baseUrl`; turn off
vendor and TanStack retries; convert `SavedMessage` to TanStack messages, sending `providerState`
back only when engine, provider and model match (Gemini's foreign tool calls get its documented
skip-validation placeholder); map `toolMode`, `maxOutputTokens` and `temperature` to each provider's
options; map AG-UI events to `TurnEvent`; map errors to codes (401/403 to `AI_KEY_REJECTED`, others
to `AI_PROVIDER_ERROR` with the status); keep Anthropic's direct-browser-access header; silence
TanStack's logger. A few hundred lines; no policy.

**`baseUrl`** (`ProviderOptions`, public, honored today for all three providers; how a consumer
routes through a proxy, Azure, OpenRouter or a local server) keeps the AI SDK's meaning, with the
API version path included. The adapter translates it: OpenAI unchanged, Anthropic strips a trailing
`/v1`, Google splits a trailing `/v1beta` or `/v1` into `@google/genai`'s `apiVersion`; where a
TanStack factory cannot take it, the adapter builds the vendor client itself.

**Retries** are graphty policy: the AI SDK 5 retries 429, 5xx and network errors twice with
backoff, TanStack AI not at all, so the loop retries on that schedule (honoring `retry-after`) and
the adapter disables every lower layer's retry, so an upgrade cannot stack them.

### 2.4 How each piece sits on the engine

- **The loop.** Milestone 1 moves the loop and tool runner out of `AiController`'s instance fields
  into a reentrant `runConversation({ conversation, engine, tools, policy, signal, sink, message })`
  and a stateless `ToolExecutor`, so helpers, live sessions and the code sandbox can run it at once;
  `AiController` keeps the public state and status. Shape unchanged: window, turn, policy per call,
  allowed calls in order, up to 5 tool rounds, then one `toolMode: "none"` turn. Deltas go out on
  `ai-stream-chunk`.
- **Built-in providers reach the engine through the provider.** `VercelAiProvider` stays the holder
  of key, model and options; an internal, unexported symbol hook on `LlmProvider` returns the
  provider-API engine, which reads that live configuration every turn, so
  `getProvider().configure()` and `setApiKey()` keep working. A provider without the hook, or a
  subclass overriding `generate` or `generateStream`, runs through `LlmProviderEngine`.
- **Undo.** As today, a message's batches merge into one undoable step tagged
  `provenance: { via: "assistant", message }`, now with the saved message id (today's per-load
  counter restarts at 1 and would collide after a reload). No transaction is open while a model
  thinks, a helper runs or an approval waits. Approved calls join the message's step if it is still
  the newest, else form their own with the same provenance.
- Approvals, history, tools, helpers and voice: section 5.

### 2.5 Where the code lives

| Folder                                                | Contents                                                                                                                                           | May import TanStack or a vendor SDK |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `src/ai/engine/`                                      | `AiEngine`, `LlmProviderEngine`, `FakeEngine`, the zod-to-JSON-Schema helper, `load.ts` (the only `import()` of the adapter)                       | No                                  |
| `src/ai/engine/tanstack/`                             | Provider-API engine, a module per provider, voice, live and program modules, mappings; excluded from `tsconfig.build.json`, so it ships no `.d.ts` | Yes, only here                      |
| `src/ai/conversation/`, `policy/`, `plans/`, `voice/` | Conversation, window, store, formats and upgrades; policies; roles and plans; speech paths                                                         | No                                  |
| `src/ai/` (rest), `commands/`                         | `AiController`, `AiManager`, `runConversation`, `ToolExecutor`, commands                                                                           | No                                  |

---

## 3. Dependencies and loading

### 3.1 Packages and exact pins

All MIT or Apache-2.0; npm `latest` on 2026-10-10. Each is loaded on first use of what it serves.

| Package                                        | Exact version | For                                                                   |
| ---------------------------------------------- | ------------- | --------------------------------------------------------------------- |
| `@tanstack/ai`                                 | 0.68.0        | `chat()` for one turn, transcription, speech                          |
| `@tanstack/ai-openai` (+ `openai-base` 0.13.1) | 0.29.1        | OpenAI (Responses API), transcription, speech, realtime, hosted tools |
| `@tanstack/ai-anthropic`                       | 0.21.1        | Anthropic, hosted tools                                               |
| `@tanstack/ai-gemini`                          | 0.37.2        | Gemini, speech, Live, hosted tools                                    |
| `@tanstack/ai-code-mode`, `ai-isolate-quickjs` | 0.5.2, 0.3.2  | In-page code execution                                                |
| `@tanstack/ai-client`                          | 0.39.2        | `RealtimeClient` only (live voice)                                    |

The vendor SDK ranges TanStack declares are fixed by pnpm overrides scoped to the TanStack chain
(`"@tanstack/ai-openai>openai": "7.32.0"`, likewise `@anthropic-ai/sdk` 0.97.1, `@google/genai`
2.28.0); the lockfile pins the rest. `@tanstack/ai-event-client` 0.13.1 is the devtools bus the
owner accepted. Every add-on peers on `@tanstack/ai ^0.68.0` (0.68.x only), so the family moves in
lockstep in one pull request, gated by the contract suite and the paid run on all three providers:
monthly, or sooner when an upstream fix graphty filed ships (filed issues are listed in
`src/ai/engine/tanstack/UPSTREAM.md`); 1.0 the same way, still pinned. Not used: `ai-persistence`,
`ai-memory`, `ai-compaction`, `ai-skills`, `ai-mcp`, framework bindings, `ai-devtools-core`,
`ai-durable-stream`.

### 3.2 Built in, not left to the consumer's bundler

The TanStack packages and vendor SDKs are devDependencies compiled into graphty-element's `dist`
chunks (Vite bundles every import it does not externalize, and only declared dependencies and peers
are externalized). Reasons, each sufficient: `@anthropic-ai/sdk` (0.97.1 through 0.133.0)
dynamically imports a Node-only module that breaks a browser production build in Vite (reproduced),
so every Vite consumer would need a build plugin, whereas built in, graphty applies a six-line
`resolveId` stub once; and "install nothing new" holds literally, with the pins being what runs. No
published file names a TanStack module: the adapter folder emits no declarations, and a packaging
check scans every shipped file (section 7, rule 1).

Costs, accepted: a consumer who also uses TanStack AI gets two copies; a consumer's `npm audit`
cannot see the built-in SDKs, so graphty's release audit covers them and an advisory ships as a
patched release on the next train; license texts ship in `dist/THIRD-PARTY-LICENSES.txt`. Moving to
ordinary dependencies later is additive.

### 3.3 Lazy loading

Today `enableAiControl` imports the `AiManager` chunk, which statically imports all three AI SDK
providers, and the `./ai` entry imports that chunk. After: `src/ai/engine/load.ts` does
`import("./tanstack/index.js")` on the first turn, and the adapter imports the module of the
provider in use. Voice, live sessions and code execution are further `import()`s. Capability tables
are data in `./catalog`, so asking what a provider can do loads no adapter.

### 3.4 Bundle cost

Gzip, esbuild with code splitting, browser, minified, Anthropic stub applied (measured,
`measure.mjs`). Each figure includes the shared loop chunk (about 54 kB); zod is not counted.

| Page                                                   |  Today |                                After |
| ------------------------------------------------------ | -----: | -----------------------------------: |
| Never enables the assistant                            |      0 |                                    0 |
| Imports a helper from `./ai` only                      | 152 kB |                                    0 |
| Assistant on Anthropic / Gemini / OpenAI               | 152 kB |                    99 / 136 / 153 kB |
| OpenAI with transcription and speech / with live voice |    n/a |                         153 / 156 kB |
| Code execution, on top                                 |    n/a | about 131 kB plus 240 kB WebAssembly |
| `./bundle` single file (code execution not included)   | 2.2 MB |                        about 2.33 MB |

### 3.5 Why this is not breaking

- The four AI SDK peers stay declared and optional; no shipped file imports them (checked). Their
  ranges widen to `*` so a consumer with `ai` 6 or 7 installed gets no peer conflict for a package
  graphty no longer uses; widening is allowed in a minor. Removal waits for the next major.
- `WebLlmProvider` imports `asSchema` from `ai` today; milestone 2 replaces it with graphty's own
  zod-to-JSON-Schema helper (zod 4's `toJSONSchema`, hence the dependency on #1940), so
  `provider: "webllm"` works without the optional peer.
- No default changes, and the default config never produces a new code (tested). `VercelAiProvider`
  keeps its contract and `baseUrl` meaning; `providerInstance` runs as today; retries keep today's
  schedule. May differ, checked by the paid run: answer wording and the HTTP status in error params.
- Anthropic's default model id `claude-haiku-4-5-20251001` is not in TanStack's typed list; the
  adapter casts once and a contract case sends the dated id.
- The only public type changes are additions (section 4.2), and two of them widen unions: see
  section 12.

---

## 4. Public API

Every declaration is in Appendix A; this section shows the simple and advanced paths.

### 4.1 What stays exactly the same

Every export in `graphty-element/api/*.api.md` keeps its name and type: the element and `Graph`
methods (`enableAiControl`, `aiCommand`, `getAiStatus`, `cancelAiCommand`, `retryLastAiCommand`,
`getAiManager`, the key manager and voice-input methods, and the rest), the `./ai` classes and
types, the `./catalog` AI facts, and the AI events. `AiState` gains no value. `ai-voice-end`'s
`reason` keeps `"user" | "timeout" | "error"`; finer reasons go in a new optional `code` field.

### 4.2 What is added

- Methods on the element and `Graph`, which delegate to `AiManager`, where each appears without
  `Ai` in its name (`resolveApproval`, `listConversations`; `execute` takes `aiCommand`'s options);
  config fields on `AiManagerConfig`; optional `effect` and `preview` on
  `GraphCommand`; optional `code` and `params` on `CommandResult`; optional `pending` on
  `AiStatus`; a built-in `askReader` command; new events; new types. All in Appendix A.
- The element gains `Graph`'s typed `addListener` overload (callback narrowed by event name,
  returns an id for `removeListener`); the existing signature stays.
- **Unions widened** (section 12): `AiResultCode` gains `AI_APPROVAL_DENIED`, `AI_APPROVAL_STALE`,
  `AI_TOOL_DENIED_BY_POLICY`, `AI_HOSTED_TOOL_UNSUPPORTED`, `AI_PROVIDER_PAUSED`,
  `AI_HISTORY_UNAVAILABLE`, `AI_HISTORY_NEWER_FORMAT`, `AI_STORAGE_FAILED`, `AI_VOICE_UNAVAILABLE`;
  the event type union gains the events of Appendix A. New unions are marked OPEN UNION from the
  start.
- Every new payload carries `{ code, params }` facts and data the reader, the model or the consumer
  supplied (command names, arguments, URLs, transcripts, the model's question text); none carries
  English written by graphty-element.

### 4.3 History and approvals

Simple path:

```js
import "@graphty/graphty-element";

const g = document.querySelector("graphty-element");
g.addListener("ai-approval-requested", ({ request }) => {
    // before enabling: catches replays
    const ok = confirm(`Run ${request.command} on ${request.count?.nodes ?? "?"} nodes?`);
    g.resolveAiApproval(request.id, { approve: ok });
});

await g.enableAiControl({
    provider: "anthropic",
    apiKey: myKey,
    history: "browser", // remember the conversation, also after a reload
    approvals: "writes", // ask before any command that changes the graph
});

const result = await g.aiCommand("Remove every node with degree 0");
console.log(result.code); // the final outcome, after the reader decided
```

Rules a consumer can rely on:

- **`aiCommand` resolves once, with the final result.** Meanwhile `getAiStatus()` shows
  `state: "ready"` with `pending: { approvals, questions }`. `ai-command-complete` fires once per
  message, for the final result.
- **One request per call.** Several "ask" calls in a batch give one request each, sharing a
  `batchId`; the batch continues when all are decided. Every `resolveAiApproval` promise resolves
  with the message's final `ExecutionResult`, the way to get it after a reload.
- **Events after state.** A request is emitted after it is saved, so a listener may decide at once.
  After a reload, requests are re-emitted (`replayed: true`) in a task after `enableAiControl`
  resolves; `getPendingAiApprovals()` is authoritative at any time. Survives a reload only with
  `history: "browser"`.
- **Ends on an event, never a timer**: a decision; a stale check (5.2); `cancelAiCommand()` or
  undoing the message's step (waiting calls denied, `AI_CANCELLED` or `AI_UNDONE`); or a new message,
  including `retryLastAiCommand()`, which denies them with `reason: "superseded"`, reported on
  `ai-pending-resolved`.
- Apps render request arguments as text, never as HTML.

Options: `history: "none"` (default) | `"memory"` | `"browser"` | `AiHistoryOptions`;
`approvals: "none"` (default) | `"writes"` | `{ ask: string[] }` | `{ policy }`.

Advanced path:

- `approvals: { policy: (call) => call.effect === "write" && (call.count?.nodes ?? 0) > 50 ? "ask" : "allow" }`;
  `call.count` comes from the command's optional `preview` (built-in selector commands have one). A
  decision may carry edited arguments: `resolveAiApproval(id, { approve: true, arguments })`.
- `history: { store: "browser", key, dataKey, database, budgetTokens }`: `key` scopes conversations
  and pending entries (default: the element's `id` plus `location.pathname`); `dataKey` names the
  dataset (default: the element's fingerprint, 5.2); `budgetTokens` sizes the window (characters / 4).
- `getAiConversation()`, `listAiConversations()`, `openAiConversation(id)`, `newAiConversation()`,
  `deleteAiConversation(id)`, `clearAiHistory()`, `exportAiConversation(id)` (the saved record as
  JSON: the published, versioned `graphty-ai-conversation` format). `aiCommand(text, { conversation })`
  opens that conversation and sends into it; an unknown id, or any id with `history: "none"`,
  resolves `AI_HISTORY_UNAVAILABLE` with `{ reason: "unknown-conversation" }`.

### 4.4 Tools

Simple path: `tools: { webSearch: true }`. Each search emits `ai-hosted-tool-result` with
`{ tool: "web-search", sources: [{ url, title }] }`.

Advanced path: `tools: { webSearch: { maxUses: 3 }, webFetch: { allowedDomains: ["example.org"] },
inPageCode: true }`. `getAiCapabilities()` (synchronous, catalog data) gives per tool
`"available" | "unsupported" | "results-not-returned" | "unknown"`. A tool the provider and model
cannot honor is **left out of the turn** and reported once per enable on `ai-capability-unavailable`
(`AI_HOSTED_TOOL_UNSUPPORTED`, `{ provider, model, tool }`); the command runs. A consumer who wants
the hard failure sets `{ required: true }` on that tool, and the command then resolves with that
code and sends nothing. So one config works on every provider.

### 4.5 Helpers and plans

Simple path:

```js
await g.enableAiControl({
    provider: "openai",
    apiKey: myKey,
    agents: [
        {
            name: "researcher",
            purpose: "Find facts on the web about the nodes",
            tools: { webSearch: true },
            commands: [],
        },
        { name: "stylist", purpose: "Color and size nodes", commands: ["findAndStyleNodes", "clearStyles"] },
    ],
});
await g.aiCommand("Look up which of these companies are public, then color those red");
```

The main model delegates to each named helper; `ai-agent-start` and `ai-agent-end` report it. A
helper gets only its commands; a helper with web tools gets no write commands. A bad config (an
unknown command or agent, web tools plus write commands) makes `enableAiControl` reject with an
`AiConfigError` carrying `{ code, params }` that names the helper and field.

Advanced path: `agents: { roles, router, confirmPlans }`, roles with their own `provider` and
`model`; `router: "model"` (default) | `"classifier"` (the configured model unless
`classifierModel` names one) | `(input) => AiPlan`, a plan being data:
`{ steps: [{ agents: ["researcher", "counter"], order: "parallel" }, { agents: ["stylist"] }] }`.
**Second keys**: `apiKeys: { anthropic: key2 }` beside `apiKey`, falling back to the key manager; a
step whose provider has no key resolves `AI_KEY_MISSING` with `{ provider }` before sending.
**Questions**: the model calls the built-in `askReader` command; `ai-question-asked` carries an
`AiQuestionRequest`; `answerAiQuestion(id, choice)` (by value) returns the answer as that call's
result, and the model continues. No command waits, so a reload needs nothing special.

### 4.6 Voice

Simple path:

```js
const g = document.querySelector("graphty-element");
await g.enableAiControl({ provider: "openai", apiKey: myKey, voice: { input: "auto", output: "browser" } });

const talk = document.querySelector("#talk"); // any button the app draws
talk.onpointerdown = (e) => {
    talk.setPointerCapture(e.pointerId);
    g.aiTalk(true);
};
talk.onpointerup = talk.onpointercancel = () => g.aiTalk(false);
talk.onkeydown = (e) => {
    if (e.key === " " && !e.repeat) g.aiTalk(true);
};
talk.onkeyup = (e) => {
    if (e.key === " ") g.aiTalk(false);
};
```

`aiTalk(true)` starts listening, `aiTalk(false)` ends the utterance; the element transcribes, sends
the text as a command and speaks the answer. `output: "auto"` speaks only in XR (on a flat page the
answer is on screen). In an immersive session the element binds push-to-talk itself (5.5). `aiTalk`
emits the existing `ai-voice-start`, `ai-voice-transcript` and `ai-voice-end` events. The existing
`startVoiceInput` stays the transcript-only, browser-recognition path; `aiTalk` is the one the
guide teaches.

Advanced path: `voice: { input, output, language, voiceName, push, transcription, mode }`.
`getAiVoiceSupport()` (async; it may probe) gives per path a status, a code and where audio goes.
`transcription: { provider: "openai" }` with `apiKeys.openai` lets an Anthropic reader transcribe
through OpenAI. `stopAiSpeech()` for barge-in.

### 4.7 Types and the Node-safe entry points

New classes and option types live in `./ai`; plain facts (codes, capability tables, hosted tool
ids) in `./catalog`. Nothing new goes into `./session`, `./schema`, `./extend` or `./format`.
`./catalog` stays free of Babylon.js, Lit, the DOM and TanStack, which
`test/packaging/node-safe-entries.test.ts` enforces.

---

## 5. Features

### 5.1 Saved history

**Format.** One IndexedDB database per origin (default `graphty-ai`, its IndexedDB version never
bumped; versions live per record), one store `conversations`, one record per conversation, written
at turn and approval boundaries (never per streamed delta):

```json
{
    "format": "graphty-ai-conversation",
    "version": 1,
    "revision": 7,
    "id": "c_01J",
    "key": "graph-1:/explore",
    "createdAt": "...",
    "updatedAt": "...",
    "graph": { "dataKey": null, "fingerprint": "n=120;e=340;h=9f2c" },
    "messages": [
        { "id": "m1", "role": "user", "parts": [{ "type": "text", "origin": "reader", "text": "..." }] },
        {
            "id": "m2",
            "role": "assistant",
            "parts": [
                {
                    "type": "tool-call",
                    "origin": "model",
                    "callId": "t1",
                    "command": "removeNodes",
                    "arguments": {},
                    "providerState": {
                        "engine": "provider-api",
                        "provider": "google",
                        "model": "gemini-3.8-flash",
                        "data": {}
                    }
                }
            ]
        },
        {
            "id": "m3",
            "role": "tool",
            "parts": [
                {
                    "type": "tool-result",
                    "origin": "graph-data",
                    "callId": "t1",
                    "code": "AI_COMPLETED",
                    "params": {},
                    "content": "truncated text"
                }
            ]
        }
    ],
    "pending": [
        {
            "kind": "approval",
            "id": "a1",
            "batchId": "b1",
            "messageId": "m2",
            "callId": "t1",
            "count": { "nodes": 12, "edges": 0 },
            "fingerprint": "n=120;e=340;h=9f2c",
            "claim": null,
            "createdAt": "..."
        }
    ]
}
```

Version 1 defines every part kind (`text`, `tool-call`, `tool-result`, `hosted-tool`, `reasoning`,
`agent-ref` for a helper's conversation, `live-transcript`) and pending kind (`approval`,
`question`, `plan-step`, `plan-confirmation`) the first version needs. Every part has an `origin`
(`reader`, `model`, `graph-data`, `web`; 5.3). `providerState` is the only place for opaque data,
and droppable: any reader may discard it, and it is never sent to another engine, provider or
model. Schemas are strict. No TanStack ids, AG-UI events or vendor shapes; the adapter translates
the record each turn (a pure function under test). Tool results keep code, params and the truncated
text the model saw (8,000 characters).

**Upgrades.** `src/ai/conversation/formats/` holds a zod schema per version and an
`upgradeV<n>ToV<n+1>` per step. A record newer than the code is left untouched
(`AI_HISTORY_NEWER_FORMAT`); an invalid one is skipped with `AI_HISTORY_UNAVAILABLE`
(`reason: "invalid-record"`), never thrown. Records are rewritten only when next saved.

**Two tabs, two elements.** Every save is one IndexedDB `readwrite` transaction that writes only if
`revision` matches what this instance loaded, else re-reads, merges (messages are append-only, keyed
by id) and writes. Resolving a pending entry first claims it the same way (sets `claim`, bumps the
revision), and only the claimant runs it; a lost claim resolves `AI_APPROVAL_STALE` with
`reason: "resolved-elsewhere"`. A `BroadcastChannel` tells other instances to re-read
(`ai-conversation-changed`).

**Scope.** `enableAiControl` reopens the newest conversation with the same `key` whose `dataKey`, or
failing that whose fingerprint, matches the loaded graph; otherwise it starts a new one, and the
others stay listed. `listAiConversations()` lists the current key (`{ allKeys: true }` lists all).

**Failures.** Every write is awaited; a failure (quota, private mode) emits `ai-conversation-changed`
with `AI_STORAGE_FAILED` and the conversation continues in memory. If IndexedDB cannot open,
`"browser"` falls back to memory with `AI_HISTORY_UNAVAILABLE`, stated, never silent.

**Privacy.** Off by default; on the reader's device only; not encrypted (same-origin scripts can
read the page's memory, and TanStack's always-on devtools events, accepted by the owner and stated
in the release notes, broadcast prompts to them anyway). No API key is saved: a configured key in
text becomes a placeholder. Audio and raw hosted-tool payloads are never stored; sources are kept,
`http:` and `https:` only. Readers can list, export and delete everything; shared headsets and
kiosks call `clearAiHistory()` at "end session".

### 5.2 Approvals that survive a reload

1. The loop meets a batch with an "ask" call. One record write holds the assistant message and a
   pending entry per "ask" call, with the graph fingerprint and the call's `preview` count; then
   `ai-approval-requested` fires per entry.
2. After a reload, `enableAiControl` reopens the conversation (5.1, Scope) and re-emits (4.3).
3. `resolveAiApproval` claims the entry (5.1), re-checks the arguments against the command's schema,
   and compares fingerprints. The fingerprint is the node and edge count plus a hash of the sorted
   node and edge ids from the session's snapshot: conservative (any edit makes the request stale) and
   needing no per-command knowledge. A different fingerprint or `dataKey` resolves
   `AI_APPROVAL_STALE` with `{ reason: "graph-changed" }` and both counts, and tells the model, which
   can ask again. When the batch is decided, approved calls run, denied ones become
   `AI_APPROVAL_DENIED` results, and the message continues with an ordinary turn.

The engine only ever sees complete message lists, so resuming needs nothing from the framework; the
first contract case of milestone 2 checks that each provider accepts history ending in tool results
(today's loop already relies on it), with the `providerState` Gemini requires.

### 5.3 Built-in and provider-hosted tools

What is honestly reachable from a page on the reader's key with TanStack AI 0.68 (the model sees
the result in every row; graphty receives it only where marked):

| Tool                                                             | OpenAI           | Anthropic                               | Gemini                      | First version      |
| ---------------------------------------------------------------- | ---------------- | --------------------------------------- | --------------------------- | ------------------ |
| Web search                                                       | Sources returned | Sources returned (inline citations not) | Grounding, sources returned | All three          |
| Web fetch (a given URL)                                          | No hosted tool   | Returned                                | URL context: not returned   | Anthropic          |
| Hosted code execution, image generation, file search, hosted MCP | Not returned     | Not returned                            | Not returned                | No; filed upstream |
| In-page code (TanStack Code Mode, QuickJS in WebAssembly)        | any              | any                                     | any                         | Yes, read-only     |

Shell, editor, computer-use and patch tools act on a machine a page does not have: never.

Rules:

- **Off by default; the reader pays** (Anthropic web search: $10 per 1,000). Each tool has its own
  switch and `maxUses`. Live sessions close when the page is hidden, on `disableAiControl` and on
  leaving XR, besides the consumer's idle setting.
- **Dropped results.** A hosted tool is offered only where results come back; a dropped one emits
  `result-unavailable`, and the defect is filed upstream. TanStack 0.68 reports Anthropic
  `pause_turn` as an ordinary stop, so a hosted-tool turn ending with no text resolves
  `AI_PROVIDER_PAUSED`, not a partial answer.
- **Web content cannot drive writes.** Web tools run only in the built-in read-only research helper
  (on Gemini it declares no function tools at all). Parts from web tools have `origin: "web"`. While
  a message's window holds one, every write call is forced to "ask" when approvals are on
  (`reason: "web-content"`) and denied with `AI_TOOL_DENIED_BY_POLICY` (same reason) when they are
  off, unless `tools.webContentMayWrite: true`; a new conversation clears it. Web tools are off by
  default, so today's consumers see no change. The window wraps `graph-data` and `web` parts in fixed
  delimiters marked as data, and data facts (property names, enum values) move out of the system
  prompt into such a block, checked by the paid run.
- **Web content cannot carry data out.** Anthropic's web fetch fetches only URLs already in the
  conversation, and a helper task written by the main model would launder a model-built URL
  (`https://evil.example/?d=<node names>`). So every fetch carries `allowed_domains`: the consumer's
  `allowedDomains` plus hosts of URLs in the reader's own text of this message (`webFetch: true`
  alone means reader-given URLs only), and the task is framed by graphty, never a user message. The
  privacy page says search queries are model-written and may carry graph content.
- **In-page code execution.** `runCode` calls `AiEngine.runProgram`, implemented in the adapter
  over Code Mode's driver without `chat()`. Its bindings wrap read-only commands through the tool
  executor; write commands refuse with `AI_TOOL_DENIED_BY_POLICY`, because Code Mode bypasses
  approvals (verified). A test audits every built-in's `effect` (`captureScreenshot` with
  `download: true` is a write). Limits: 5 seconds, capped console output and tool calls. The
  WebAssembly ships as an asset loaded by `new URL(..., import.meta.url)`, proven by a packaging test
  from a Vite and a webpack fixture; `./bundle`, and a page whose content security policy lacks
  `'wasm-unsafe-eval'`, report `inPageCode` as `"unsupported"`. Milestone 5 starts with a spike of
  Code Mode outside `chat()` in graphty's build; graphty's own QuickJS bridge (about 300 lines, in the
  adapter) is the alternative. Code Mode needs zod 4.

### 5.4 Helpers, plans and orchestration

TanStack AI offers subagents in core (`defineAgent`, model- or router-chosen picks, `parallel` and
`sequence` plans), verified in a page; its announced workflow package was never published, and the
upstream design in flight is server-side. graphty writes orchestration as its own code:

- **Role** (`AiAgentRole`): a helper runs `runConversation` on its own child conversation (an
  `agent-ref` part) with its own engine, through the same policy and executor; helpers cannot
  delegate further.
- **Router**: `"model"` gives the main model a `delegate` command (`{ agent, task }`, validated)
  that the loop handles itself: it ends the batch, runs the helpers outside any transaction, and
  returns their answers as the call's result. `"classifier"` asks one choice question first. Or a
  consumer function returning a plan.
- **Plan** (`AiPlan`): parallel helpers run with `Promise.all`; in a sequence each sees the previous
  answers. Saved in the record, so a plan paused for an approval or question resumes at its step.
- **Writes**: parallel helpers are read-only; only the main conversation or one sequential step
  writes, joining the message's undo step through its provenance.
- **Interrupts** (approval, `askReader` question, `confirmPlans`) are pending entries, as in 5.2.
- **Cost**: usage is summed into the result params; a plan has at most the tool-round limit of steps.

### 5.5 Voice

Three internal interfaces: `SpeechInput` (`probe`, `start`, `stop`, partial and final transcripts,
an end code), `SpeechOutput` (`speak`, `cancel`) and `LiveSession`. The default path is **turns**:
speech in, the ordinary loop (same tools, approvals, history, plans), speech out; it works on every
provider, and later on an in-browser model.

| Path                 | How                           | Providers                                                                                            | Where it works                                                                                                  |
| -------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Speech in, browser   | `SpeechRecognition`           | none                                                                                                 | Chrome, Edge, Safari, Vision Pro (on device), Galaxy XR Chrome (unverified); not Firefox; **not Quest Browser** |
| Speech in, provider  | `MediaRecorder`, `transcribe` | OpenAI (`gpt-4o-mini-transcribe`); Gemini via the chat model; Anthropic via `transcription.provider` | Every browser with a microphone, Quest included                                                                 |
| Speech out, browser  | `speechSynthesis`             | none                                                                                                 | All major browsers, Quest Browser 5.0 and later                                                                 |
| Speech out, provider | `speak`                       | OpenAI; Gemini (experimental upstream)                                                               | Any browser that plays audio                                                                                    |
| Live (milestone 7)   | TanStack `RealtimeClient`     | OpenAI (WebRTC), Gemini Live (WebSocket)                                                             | WebRTC or WebSocket browsers                                                                                    |

- **Choosing (`"auto"`).** Input: browser recognition when its probe succeeds (started once after
  the first press and remembered per origin, because Quest exposes a constructor that fails),
  preferring Chrome's on-device recognition when available; else provider transcription; else
  `AI_VOICE_UNAVAILABLE`. Language: the element's locale for `aiTalk` (the existing
  `VoiceInputAdapter` keeps `"en-US"`). Output: off on a flat page, on in XR. Talk cancels speech.
- **Push-to-talk in XR.** Hold B or Y on Quest Touch controllers (unused today); with hands, pinch
  and hold a wrist microphone orb, which claims the pinch so it never starts a drag. Never the
  trigger or thumbsticks. Configurable in `XRConfig`.
- **Pending entries in XR.** The page's DOM is invisible in an immersive session, so the element
  owns a neutral in-scene control: approve and deny, or one control per choice, showing only data
  (the command's catalog `plainName`, arguments, the model's question and choices) and icons; words
  come from an app-supplied `xr.ai.labels` map keyed by code. Approve and deny are also bound to a
  controller button and to "yes" or "no" in the transcript, so the next utterance answers instead of
  superseding. `XRConfig` options turn it, and the transcript-and-answer panel, off or on.
- **Pointing ("color this").** While talk is held the element records the nodes the controller ray,
  gaze-and-pinch pointer or mouse entered, in order, plus the selection; a read-only
  `getPointingContext` command returns them.
- **Microphone.** Permission, speech priming and `AudioContext` resume happen on the "Enter VR/AR"
  click (a prompt inside an immersive session is undocumented on all three headsets); priming stops
  its tracks at once; the microphone is open only while talk is held.
- **Never the only path**, off unless asked. **Privacy**: Chrome's default recognition sends audio to
  Google, provider transcription to the provider, Safari and visionOS keep it on device;
  `getAiVoiceSupport()` reports each destination.
- **Live sessions (milestone 7).** The page mints the short-lived token with the reader's key through
  graphty's own `getToken` (OpenAI and Gemini token endpoints answer browser origins with CORS,
  tested with fake keys); TanStack's token helpers read `window.env` and are never used. The
  microphone track is enabled only while talk is held, with server turn detection, because
  TanStack's manual mode never asks for a reply (filed upstream). Tool calls go through graphty's
  executor and policy; an "ask" call hands off to the turns path, since a pending entry cannot
  outlive a closed socket.

---

## 6. The seam for in-browser models (not built now)

In-browser models let a reader with no API key use the assistant. Nothing new is built now, but the
seam is in place and tested: `provider: "webllm"` and any consumer's `providerInstance` run through
`LlmProviderEngine` and so get history, approvals, plans and voice, and the contract suite runs on
`LlmProviderEngine` with `MockLlmProvider`, so the seam cannot rot. The later in-browser engine is one
more `AiEngine` (TanStack's OpenAI-compatible base adapter over WebLLM, ran on a stand-in, or a
graphty engine that emulates tool calls by prompting), passing the same suite with no public type
change. Voice has the same seam: on-device `SpeechInput` (Moonshine, 28 to 102 MB) and
`SpeechOutput` (Kokoro, 86 to 155 MB), loaded only after the reader chooses "on this device".
Exporting the interfaces from `./extend` is additive, once they survive a milestone unchanged.

---

## 7. The mechanisms that keep switching cheap

"Pre-push" is `tools/prepush.sh`; "CI" is ci.yml on pull requests affecting graphty-element and on
merge-queue runs. Each check has a self-test that seeds one violation and must fail.

| Rule                                               | The check (pre-push and CI unless noted)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. No framework or provider type exported          | `tools/api-report.mjs` fails on any import in `api/*.api.md` of `FRAMEWORK_PACKAGES` (exact `ai`, `openai`, `@google/genai`; prefixes `@tanstack/`, `@ag-ui/`, `@ai-sdk/`, `@anthropic-ai/`, `@mlc-ai/`). A packaging test scans the packed tarball: no `.js` or `.d.ts` names one of them, no `.d.ts` references `engine/tanstack`                                                                                                                                                                                                                                                                          |
| 2. Saved data in graphty's versioned format        | `formats.test.ts`: per version, a fixture covering every part and pending kind and a canonical JSON Schema file (sorted keys, no `$schema`); files of versions on the merge base never change (a zod upgrade may regenerate a schema file only if every fixture still validates and the golden output is unchanged); the current schema equals the newest file; the real writer reproduces a golden fixture byte for byte; every fixture upgrades and validates; a newer record stays untouched                                                                                                              |
| 3. Providers configured in graphty's terms         | Rule 1, plus `api-report.mjs` fails on a member added since the merge base, in `AiManagerConfig`, `ProviderOptions` or any option type they reach, typed `unknown`, `any`, `object`, a record of unknown, or with an index signature, unless an exceptions list gives a reason. Provider settings become named graphty fields                                                                                                                                                                                                                                                                                |
| 4. Policies and orchestration are graphty code     | ESLint `no-restricted-imports` plus `no-restricted-syntax` on `ImportExpression` and `TSImportType` (same patterns), non-literal `import()` under `src/ai/`, and `vi.mock`/`vi.doMock` naming them: framework and vendor packages only in the adapter folder, `ai` and `@ai-sdk/*` nowhere once section 8 step 5 lands, the adapter only from `load.ts`; inside it only named TanStack imports (`chat`, `generateTranscription`, `generateSpeech`, adapter factories, message and event types), so middleware, agents and persistence fail. Contract case: one `turn()` is one HTTP request and runs no tool |
| 5. Tests on graphty's engine and fake              | The contract suite runs for `FakeEngine`, `LlmProviderEngine(MockLlmProvider)` and the provider-API engine (recorded responses through a fake `fetch` that also compares a normalized request snapshot); rule 4's lint covers tests, so only `test/ai/engine/tanstack/` imports TanStack                                                                                                                                                                                                                                                                                                                     |
| 6. TanStack in one folder, loaded lazily           | A Rollup plugin writes each chunk's module ids and static imports to `build-meta/chunks.json` (unpublished); `ai-lazy-chunks.test.ts` walks static imports from `index.js`, `ai.js` and each Node-safe entry and fails on a reached chunk holding a framework or vendor module, a provider chunk holding another provider's SDK, or a `node:` import in an AI chunk                                                                                                                                                                                                                                          |
| 7. Peers change only in a major; exact pins; audit | `tools/check-peer-deps-stable.mjs` fails, without a breaking commit scoped to the package, on a removed peer, a new or newly required peer, a peer moved into dependencies, or a narrowed range. `check-published-deps.mjs` exempts the four unused AI SDK peers until the next major version. `ai-pins.test.ts`: direct TanStack and vendor devDependencies exact; each scoped override satisfies every dependent's range. The release train audits the bundled set's resolved closure                                                                                                                      |

New identifier and consumer-data `string` fields go into `PLAIN_STRING_ALLOWLIST` in
`tools/api-report.mjs` with a reason, as that existing check requires.

Paragraph for `graphty-element/CLAUDE.md`, under "AI Integration":

> **The AI engine seam.** Model calls go through `AiEngine` (`src/ai/engine/`, one call per turn).
> Only `src/ai/engine/tanstack/` may import `@tanstack/*`, `@ag-ui/*` or a vendor SDK; it is reached
> only through `load.ts` and ships no declarations. Six rules keep a framework switch cheap, each
> with a check: no framework type in an API report or shipped file (`tools/api-report.mjs`, the
> packaging scan); saved data only in graphty's versioned format (`formats.test.ts`); providers
> configured with graphty values, no open pass-through fields (`api-report.mjs`); loop, policies,
> plans and retries in graphty code (the import lint rules, the one-request contract case); tests on
> `FakeEngine` or `MockLlmProvider` (the engine contract suite); TanStack loaded lazily per provider
> (`ai-lazy-chunks.test.ts`). Pins are exact, upgraded together with the contract suite and the paid
> `llm-regression` run on all three providers; peers change only in a major
> (`tools/check-peer-deps-stable.mjs`).

---

## 8. Migration from the AI SDK 5

Each step is one pull request; the suite named runs before it merges.

1. **The engine seam (milestone 1).** Add `AiEngine`, `LlmProviderEngine`, `FakeEngine`, `load.ts`,
   `runConversation` and `ToolExecutor`; `AiController` calls them, with `LlmProviderEngine` over
   `VercelAiProvider`, behavior identical. Move the regression harness
   (`test/helpers/llm-regression-harness.ts`) onto a `RecordingEngine` decorator, with retries
   classified by graphty codes (`AI_PROVIDER_ERROR` with 429 or 5xx) instead of the AI SDK's error
   classes. Add the contract suite and every check of section 7 (those about the AI SDK packages exempt the
   two files that import them until step 5). Suites: unit, browser, packaging,
   API report (no change).
2. **Baseline.** Run the paid `llm-regression` project on the AI SDK 5 through the new harness three
   times per provider and commit the per-case pass counts to `test/ai/llm-regression/baseline.json`.
3. **Provider-API engine beside the old one.** Add the adapter folder, pins, scoped overrides, the
   Anthropic build stub, the `LlmProvider` hook (2.4), `baseUrl` translation, graphty-owned retries,
   and the `asSchema` replacement. `load.ts` picks the new engine only under an internal test
   switch. Record provider responses (bodies only, every header dropped; a test fails on key-shaped
   strings or organization ids) and run the contract suite on both engines.
4. **Switch (milestone 2).** Built-in providers use the new engine through the hook. `safeError.ts`
   reads graphty's mapped errors. Paid run three times per provider; merge only if no case that
   passed in all three baseline runs fails in two or more. Release as a minor.
5. **Remove the AI SDK.** Delete its devDependencies and mocks; replace `VercelAiProvider.test.ts`
   with an `LlmProvider` contract run over `MockLlmProvider` and `VercelAiProvider` (callback order,
   `validateApiKey`, key scrubbed from errors); re-check the `undici` override that existed for
   `@ai-sdk/provider-utils`; widen the four peer ranges to `*`; update comments naming the Vercel SDK.

New feature tests (history, approvals, plans, voice) are written on `FakeEngine` from the start;
loop, transaction, event, result-code, schema and command tests stay as they are.

---

## 9. Testing

- **Engine contract suite** (`test/ai/engine/contract.ts`, Node and browser projects, every
  engine): text; ordered tool calls; history ending in tool results; `toolMode: "none"`; abort;
  401/403; "429 then 200" in exactly 2 requests and three 500s in exactly 3; usage; an unlisted
  model id; web search sources; dropped and paused results; per provider, the request URL for the
  default and a custom `baseUrl`, no other host contacted, each key only to its own host;
  `allowed_domains` excludes an off-list host; Gemini's second tool round and a resumed approval
  echo the thought signature, a conversation switched from Anthropic sends no foreign state, a
  record stripped of `providerState` continues or ends with a code; `configure()` and `setApiKey()`
  after the first turn reach the running engine; the key in no error, event, params, console line,
  devtools payload or saved record; no timer outlives `dispose()`; `window.env` untouched.
- **Features on the fake** (`MockLlmProvider`, `FakeEngine`): the window, format round trips,
  policies, stale and graph-changed approvals, the web-content taint (also after a reload), plans,
  questions, helper depth and policy, voice routing, and no new code under the default config.
- **Reload and concurrency** (browser): a new element on the same database gets pending approvals,
  questions and plan steps back, and a listener attached after `enableAiControl` resolves still gets
  the replay; two elements approving one request run it once; history keys stay apart. One graphty
  app story reloads for real in its play function.
- **Real input** (`test/helpers/real-input.ts`, `userEvent`): approve and deny by clicking; hold a
  talk button by pointer and by Space with fake speech paths installed; in the `xr` project, press
  B, pinch the wrist orb and approve a request with the emulated controller; graphty app
  `*.real-element.test.tsx` cases for approvals and the microphone.
- **Paid run**: on the release train (Google) and by hand on all three providers per upgrade. New
  cases: a follow-up, approve and deny, a web search, a node label asking for a fetch to an off-list
  host (no fetch), a two-helper plan, transcription of a committed clip, provider speech. Before
  milestone 5: a real-key browser smoke of Anthropic web search and fetch (beta headers and CORS
  preflight unverified). Before milestone 6: Quest, Galaxy XR and Vision Pro device checks.

---

## 10. Documentation

Published with the milestone that adds each feature, with a Storybook story per simple path:

- `docs/guide/ai-assistant.md` (the guide has no AI page today): enable, ask, read the result, one
  simple path per feature, the rules of 4.3.
- An AI privacy page: what is stored where, where text and audio go per provider and voice path, the
  devtools event bus, and each feature's content security policy needs (`connect-src` per provider,
  `wss:` for Gemini Live, `'wasm-unsafe-eval'` for code, `media-src blob:` for provider speech).
- A provider-by-feature matrix and a browser-and-headset-by-voice-path matrix, generated from the
  `./catalog` tables; a page for command authors (`effect`, `preview`, result codes, questions); the
  `graphty-ai-conversation` format and its versioning promise.

**Blind-author gate.** Before milestone 3's API report lands, an author who sees only the docs and
Appendix A, with the developer personas in `design/designloom/personas/`, writes the simple-path
examples of section 4 and compiles them against the built types; every guess is a defect to fix.

---

## 11. Risks

| Risk                                                                                                       | Mitigation                                                                                              |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **0.x churn** (35 releases in 90 days; breaks land in minors)                                              | Exact pins, monthly lockstep upgrades gated by request snapshots and the paid run; one folder can break |
| **Undocumented in-page path** (TanStack relays keys through a server; SDKs need `dangerouslyAllowBrowser`) | Contract suite in the browser; paid run from a page; keys only to explicit-key factories                |
| **Dropped hosted results; `pause_turn`**                                                                   | Offer only tools whose results return; coded results; filed upstream                                    |
| **Old Anthropic SDK** (0.97.1)                                                                             | Pinned, audited; the adapter can build its own client for a fix                                         |
| **Live voice** (token minting tested with fake keys; manual push-to-talk broken upstream)                  | Own `getToken`; real-key smoke before milestone 7; turns are the default                                |
| **Quest Browser** has no working recognition                                                               | Probe by starting; provider transcription; on-device later                                              |
| **Bundled vendor code** is invisible to consumers' audits                                                  | Release audit of the bundled set; patched release on the next train                                     |

**What would make us reconsider:** two upgrades in a row each needing days of adapter work;
upstream dropping browser use of the SDKs; the paid run below baseline with no fix in sight; or a
TanStack 1.0 with a documented in-page path and orchestration we would rather adopt. Switching
framework (the AI SDK 7 is the named alternative) is a new adapter folder plus the contract suite.

---

## 12. For the owner

**Needed before milestone 3, a public type question:** `AiResultCode` and the event type union gain
the members listed in 4.2. The repository's rule counts new codes and events as non-breaking, but
both unions are published without the "OPEN UNION: values may be added in a minor release" note the
catalog puts on growable unions, so a consumer's exhaustive `switch` stops compiling.
Recommendation: add that note to both in milestone 1 and treat additions as minor from then on. The
alternative, holding every new code and event for the next major, defers milestones 3 to 7.

**Needed before migration step 2:** OpenAI and Anthropic keys for the paid baseline and switch runs
(the release train has Google only).

**Later, with the next major's planning:** removing the `ai` and `@ai-sdk/*` peers together with
renaming or removing `VercelAiProvider` and `VercelProviderType` (a neutral alias can come earlier,
additively); and whether any assistant default should change then (history or approvals on, the
Anthropic default model id), each a changed default and so breaking.

---

## Appendix A. Public additions

All additive; methods are on the element and `Graph` (`AiManager` names them without `Ai`). Unions marked OPEN may grow in a
minor release. Event fields sit on the event object, as for every existing event.

```ts
// AiManagerConfig gains
apiKeys?: Partial<Record<AiProviderId, string>>;
history?: "none" | "memory" | "browser" | AiHistoryOptions;
approvals?: "none" | "writes" | { ask: readonly string[] } | { policy(call: AiToolCallFacts): "allow" | "ask" | "deny" };
tools?: AiToolOptions;
agents?: readonly AiAgentRole[] | { roles: readonly AiAgentRole[]; router?: AiRouter; classifierModel?: string; confirmPlans?: boolean };
voice?: AiVoiceOptions;

interface AiHistoryOptions { store: "memory" | "browser"; key?: string; dataKey?: string; database?: string; budgetTokens?: number }
interface AiToolCallFacts { command: string; arguments: Readonly<Record<string, unknown>>; effect: "read" | "write"; count?: AiAffectedCount; webContent: boolean }
interface AiAffectedCount { nodes: number; edges: number }
interface AiToolOptions { webSearch?: boolean | AiHostedToolOptions; webFetch?: boolean | AiHostedToolOptions; inPageCode?: boolean; webContentMayWrite?: boolean }
interface AiHostedToolOptions { maxUses?: number; allowedDomains?: readonly string[]; required?: boolean }
interface AiAgentRole { name: string; purpose: string; commands: readonly string[]; tools?: AiToolOptions; provider?: AiProviderId; model?: string }
type AiRouter = "model" | "classifier" | ((input: string) => AiPlan);
interface AiPlan { steps: readonly { agents: readonly string[]; order?: "parallel" | "sequence" }[] }
interface AiVoiceOptions { input?: AiVoiceMode; output?: AiVoiceMode; language?: string; voiceName?: string;
    push?: "hold" | "toggle"; transcription?: { provider: AiProviderId; model?: string }; mode?: "turns" | "live" }
type AiVoiceMode = "auto" | "browser" | "provider" | "off";
class AiConfigError extends Error { readonly code: AiResultCode; readonly params: AiResultParams }

// GraphCommand gains effect (absent = "write") and preview; CommandResult gains code and params;
// AiStatus gains pending
effect?: "read" | "write";
preview?(params: unknown, context: CommandContext): AiAffectedCount | Promise<AiAffectedCount>;
code?: AiResultCode; params?: AiResultParams;
pending?: { approvals: number; questions: number };

// Methods
aiCommand(text: string, options?: { conversation?: string }): Promise<ExecutionResult>;
resolveAiApproval(id: string, decision: { approve: boolean; arguments?: Readonly<Record<string, unknown>> }): Promise<ExecutionResult>;
answerAiQuestion(id: string, answer: string | readonly string[]): Promise<ExecutionResult>;
getPendingAiApprovals(): readonly AiApprovalRequest[];
getPendingAiQuestions(): readonly AiQuestionRequest[];
getAiConversation(): AiConversationSnapshot | null;
listAiConversations(options?: { allKeys?: boolean }): Promise<readonly AiConversationSummary[]>;
openAiConversation(id: string): Promise<AiConversationSnapshot | null>;   // null: unknown id
newAiConversation(): Promise<AiConversationSnapshot>;
deleteAiConversation(id: string): Promise<void>;
clearAiHistory(): Promise<void>;
exportAiConversation(id: string): Promise<string | null>;
getAiCapabilities(): AiCapabilities;
getAiVoiceSupport(): Promise<AiVoiceSupport>;
aiTalk(down: boolean): void;
stopAiSpeech(): void;
// element only, added overload: addListener<K extends EventType>(type: K, cb: (evt: EventOfType<K>) => void): symbol

interface AiApprovalRequest { id: string; batchId: string; conversationId: string; messageId: string; command: string;
    arguments: Readonly<Record<string, unknown>>; effect: "read" | "write"; count?: AiAffectedCount;
    reason: "policy" | "web-content" /* OPEN */; agent?: string; createdAt: string }
interface AiQuestionRequest { id: string; conversationId: string; messageId: string; question: string; choices: readonly string[]; multiple: boolean; createdAt: string }
interface AiConversationSummary { id: string; key: string; dataKey: string | null; createdAt: string; updatedAt: string; messageCount: number; pendingCount: number }
interface AiConversationSnapshot { id: string; key: string; formatVersion: number; messages: readonly AiConversationMessage[];
    pending: readonly (AiApprovalRequest | AiQuestionRequest)[] }
type AiConversationMessage =
    | { id: string; role: "reader"; text: string; via: "text" | "voice" }
    | { id: string; role: "assistant"; text: string; agent?: string; calls: readonly AiCallRecord[]; sources: readonly AiSource[] };
interface AiCallRecord { command: string; arguments: Readonly<Record<string, unknown>>; code: AiResultCode; params: AiResultParams }
interface AiSource { tool: AiHostedToolId; url: string; title?: string }
type AiHostedToolId = "web-search" | "web-fetch" | "in-page-code";                          // OPEN
type AiCapabilityStatus = "available" | "unsupported" | "results-not-returned" | "unknown";  // OPEN
interface AiCapabilities { provider: AiProviderId; model: string; tools: Readonly<Record<AiHostedToolId, AiCapabilityStatus>> }
interface AiVoicePath { path: "browser" | "provider" | "on-device" | "none"; status: "ready" | "needs-permission" | "unavailable";
    code?: AiResultCode; destination: "on-device" | "browser-vendor" | "provider" | "none" }  // all OPEN
interface AiVoiceSupport { input: AiVoicePath; output: AiVoicePath }

// Events
{ type: "ai-approval-requested"; request: AiApprovalRequest; replayed: boolean }
{ type: "ai-question-asked"; request: AiQuestionRequest; replayed: boolean }
{ type: "ai-pending-resolved"; id: string; kind: "approval" | "question"; code: AiResultCode; params: AiResultParams }
{ type: "ai-conversation-changed"; conversationId: string; code?: AiResultCode; params?: AiResultParams }
{ type: "ai-hosted-tool-result"; tool: AiHostedToolId; status: "done" | "result-unavailable"; sources: readonly AiSource[] }
{ type: "ai-capability-unavailable"; tool: AiHostedToolId; code: AiResultCode; params: AiResultParams }
{ type: "ai-agent-start"; agent: string; task: string }
{ type: "ai-agent-end"; agent: string; code: AiResultCode; params: AiResultParams }
{ type: "ai-voice-level"; level: number } | { type: "ai-speech-start" } | { type: "ai-speech-end"; code: AiResultCode }
// ai-voice-end gains code?: AiResultCode
```

`Message` stays the `LlmProvider` contract's type, for provider authors; `AiConversationMessage` is
what an application reads to draw a transcript. The snapshot omits the model-facing tool-result
text, the system prompt and internal nudges, which are English written by graphty-element.

---

## Appendix B. Review notes

Every severity 3 finding of the first review round was accepted. Where reviewers proposed different
fixes for one defect:

- **`aiCommand` resolves once, with the final result**, rather than settling with a pending code and
  dispatching events in a microtask: the race disappears, `if (!result.success)` keeps today's
  meaning, and two pending codes leave the widened union.
- **Pending state** is `AiStatus.pending`, not a new `AiState` value.
- **Questions** come from a built-in `askReader` command, not `CommandResult.question`: same effect
  (the answer is that call's result, and the model calls the command again), nothing for command
  authors to learn.
- **Stale approvals** use the element's own graph fingerprint; `GraphCommand.targets` was not added,
  because selectors that still match would pass it. `preview` supplies the count shown.
- **Provider round-trip data** is one droppable `providerState` field on assistant parts plus a
  `reasoning` part, because Gemini's signature belongs to one function call.
- **History key default** is the element's `id` plus `location.pathname`, so different pages with
  one element id stay apart; the fingerprint match covers the rest.
- **Two tabs**: a claim inside the IndexedDB transaction makes `navigator.locks` unnecessary.
- **Bundled-code detection** reads chunk metadata from the build, leaving chunk splitting alone.
- **`baseUrl` in `AiManagerConfig`** was not added: `getProvider().configure()` reaches it today.
- **The zod 3 bridge** was dropped: the owner's decision assumes zod 4, so milestone 2 waits for
  #1940.

Severity 2 and 1 findings were folded in where they touched revised text. Deferred to the milestone
that builds it: a per-message budget across helpers, a retention setting for shared devices, and the
`ai-stream-chunk` separator between turns.
