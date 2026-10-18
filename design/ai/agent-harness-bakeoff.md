# Agent harness bake-off: TanStack AI, Strands Agents and LangChain createAgent

Written 2026-10-10. This document compares three agent frameworks as candidates for the harness
inside graphty-element's AI assistant: **TanStack AI**, **Strands Agents for TypeScript** and
**LangChain's `createAgent`** (on LangGraph). It says which one fits graphty best, what each one
gives and costs, how far each can be extended to every feature graphty needs, and whether any of
them should replace the current plan.

The setting decides almost everything, so here it is in full. The assistant lives in
graphty-element (a standalone web component, Lit and Babylon.js, ESM) under `src/ai/`
(`AiController.ts`, `AiManager.ts`, `providers/`, `commands/`, `schema/`). It runs **in the
reader's browser**, on the reader's own OpenAI, Anthropic or Google key, or on an in-browser model
(WebLLM). **There is no graphty server.** Today it is a hand-written tool loop on the Vercel AI SDK
5, and zod 3 types appear in graphty-element's public API. The current plan, from the earlier
document `inputs/agent-harness-build-vs-buy.md`, is to keep graphty's own controller, move it to
the Vercel AI SDK 7 with the next graphty-element major, and adopt no agent framework.

Two graphty rules decide much of the comparison, because a harness either helps keep them or works
against them:

- **One assistant message is one undo step.** Every change the assistant makes to the graph while
  answering one message goes into one undo group, so the reader undoes the whole answer with one
  Ctrl+Z. The harness must say reliably when a turn starts and ends, including when the reader
  presses Stop, when the run pauses for an approval, and when a page reload interrupts it. A change
  that lands after the group has closed cannot be undone.
- **graphty-element returns codes, and the app writes the words.** graphty-element is neutral about
  presentation: its APIs return `{ code, params }` facts, never English sentences, and the
  application chooses the words. Any English the harness writes into the conversation or its errors
  is text graphty must find and replace.

Paths in this document are relative to `tmp/ai-bakeoff/`, the bake-off's working directory in the
graphty monorepo, unless they say otherwise. That directory is not checked in (git ignores `tmp/`);
its `inputs/` folder holds copies of the earlier documents, which are checked in under `design/ai/`.
A citation such as `@tanstack/ai/src/activities/chat/index.ts:1020` points into that framework's
installed `node_modules`, at the version listed in section 8.

### Terms used throughout

- **Feature.** One of the 162 capabilities graphty's 507 AI use cases need, from
  `inputs/agent-harness-features.md`. Features have real ids such as F99 (approval gate).
- **Essential count.** How many use cases cannot be done without a feature. Scores are weighted by
  it: a feature 100 use cases depend on counts ten times as much as one 10 depend on. All 162
  features add up to 5,327 "essential-weighted".
- **Ratings.** Each framework got one rating per feature:
    - **native**: in the framework's core package;
    - **official add-on**: in an official package of the framework, or a provider-hosted tool
      reached through the framework's own model classes whose results actually come back to graphty;
    - **extension point**: graphty writes the feature, but plugs it into a seam the framework designed
      for that purpose (a hook, a middleware stage, an adapter interface);
    - **build on top**: graphty writes the feature beside the framework, which contributes little;
    - **needs a service**: a page on the reader's own key cannot do it at all; a server is required.
- **Bought** = native plus official add-on. **Reachable** = bought plus extension point. Both are
  shares of the 5,327 essential-weighted total.
- **Effort.** Each feature graphty must write got a size: S = half a day, M = 3 days, L = 8 days,
  XL = 20 days. "Extension effort" sums those over every feature not bought, service work included.
- **Scenarios.** Fourteen concrete tasks every framework was built against in a hands-on spike, from
  a basic tool loop to an approval that survives a page reload (section 4).
- **Strict-consumer check.** graphty-element's `tsconfig.strict-consumer.json`: the type check a
  third party's strictest build would run against graphty-element's published declarations, with
  `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `skipLibCheck: false` and no Node types.
  A framework whose declarations fail it cannot have its types in graphty-element's public API.
- **BYOK** (bring your own key): the reader supplies their own provider key, as graphty does today.
- **AG-UI**: an open protocol of typed events between an agent and its user interface
  (`RUN_STARTED`, `TEXT_MESSAGE_CONTENT`, `TOOL_CALL_START` and so on), published as `@ag-ui/core`.
- **Hermes models**: Nous Research's tool-calling fine-tunes of Llama and Mistral; they are the only
  five WebLLM models that accept tools (`@mlc-ai/web-llm/lib/index.js:957-962`).

## 1. The answer

**On coverage and effort the three frameworks are tied.** Counted over all 162 features, TanStack AI
buys 21.5% of what graphty's use cases need, Strands 17.1% and LangChain 18.3%. Reachable is 83.3%,
83.5% and 79.5%. Extension effort is 776.5, 780.5 and 857 days. Those gaps sit inside the spread of
rating judgment. Counting the days still owed on features rated bought, the totals become 811.5,
793.5 and 878 days, and Strands is lowest. With the disputed ratings put on one standard they become
776.5, 781 and 783 days (773 for Strands if hosted code execution were counted for it although its
models drop the results). TanStack AI's lead on bought share rests mostly on one feature, F74 code
execution, which it buys through an add-on that needs zod 4; without its three zod 4 add-ons it buys
17.5%, level with Strands. Weighted by the "helpful" counts instead, TanStack AI leads on bought
(28.5% against 21.1% and 22.2%). No reading of the numbers separates the three by more than about 10
days of effort once the ratings are on one standard (section 8, "Sensitivity").

**What does separate them is how well each fits a page with no server, and how mature each is.**
Ranked on fit, TanStack AI is first, Strands second and LangChain last:

1. **Browser persistence, approvals that survive a reload, one undo step per turn.** TanStack AI is
   the only one of the three that ships browser storage, for the conversation and for pending
   approvals. Both survived a real page reload in Chromium with 13 and 9 lines of graphty code, and
   its middleware gave one undo step per turn in 18 lines. Strands did the same on its own storage
   interface with 21, 25 and 12 lines. LangChain's approval feature does not work in a browser:
   LangGraph's `interrupt()` needs Node's AsyncLocalStorage, and the request to fix it has been open
   since February 2025. Its undo step needed a workaround, because its turn hooks are skipped on
   abort and on resume.
2. **Stop.** Measured with a provider `fetch` that stalls, TanStack AI and LangChain abort the HTTP
   request for all three of graphty's providers; Strands aborts it only for OpenAI. With a graph
   command really running, TanStack AI and Strands wait for it before the run ends, so its change
   lands inside the undo group. LangChain returns at once and the change lands about 180 ms later,
   outside the already closed group.
3. **Bytes.** With the three providers graphty ships and no zod counted: TanStack AI 268 kB gzip,
   Strands 336 kB, LangChain 453 kB. The AI SDK 7 is 255 kB with zod 3 counted.
4. **zod.** zod 3 types are part of graphty-element's public API. LangChain takes zod 3 natively.
   TanStack AI's core takes it through a 7-line shim, but three of its add-ons (Code Mode, Skills,
   and snippets) fail on zod 3, and giving them their own zod 4 was not tried. Strands requires zod
   4 under the name `zod` and fails at import on zod 3. graphty would need either a breaking zod 4
   migration, or a bundler alias that points Strands at the copy of zod 4 that zod 3.25 ships
   inside itself (at `zod/v4`). The alias was tested and runs (213 kB gzip), and it is not
   breaking, but graphty-element would then bundle Strands and its zod instead of sharing one copy
   with the consumer's application.
5. **Maturity, where TanStack AI trails.** TanStack AI is 0.x, with breaking minor releases after
   its release candidate, a small core team and no named production users. Strands is 1.x under a
   written versioning policy and funded by AWS. LangChain has the strongest stability promise ("no
   breaking changes until 2.0") and named production users (Uber, LinkedIn, Klarna, JP Morgan and
   others).

Weighted equally, or with browser fit first, these criteria put TanStack AI first. Weighted toward
maturity and vendor risk, Strands is first and TanStack AI last (section 1.1). The order this
document uses is the fit order.

Strands is second on fit because it is the best engineered for the browser (its maintainers test it
in headless Chromium in CI) and has the richest orchestration (interrupts that survive
serialization, interventions, agent graphs and swarms). Against it: the zod 4 requirement, the
Amazon Bedrock client and its MCP client pulled statically into every bundle, and a Stop that does
not abort the network request for Anthropic, Google or any AI SDK model.

LangChain is last on fit because approvals do not work in a page, it is the heaviest by a wide
margin (244 kB gzip before any provider, 605 kB for the full spike page), and seven of its fourteen
scenarios needed a workaround, including the undo and Stop defects above.

**The bake-off gives no evidence against the standing recommendation, and cannot confirm it,
because the AI SDK 7 was not run here.** The recommendation is to keep graphty's own controller,
move it to the AI SDK 7 and adopt no framework now. The bake-off changes two things around it.

1. **It strengthens the recommendation's main premise.** Counted over all 162 features, the best
   framework buys about a fifth of what the use cases need. 127 of the 162 features are rated
   neither native nor official add-on by any of the three, so graphty writes them whichever is
   chosen, and they carry 730 to 817 of each framework's 776 to 857 days. The three frameworks
   differ from each other by about 10 to 80 days in total, depending on the rating standard. The
   earlier document's figures of 69% to 77% "bought" were over its 54 harness features only (the
   49 features of an agent loop plus the five platform features a loop reaches, such as web
   search; 1,944 essential-weighted) and under coarser rules. On those same 54 rows the verified
   ratings here give 52% (TanStack AI), 45% (LangChain) and 40% (Strands).
2. **It reverses the ranking among frameworks.** The earlier document named LangChain the best
   framework for graphty and Strands the runner-up, and rated TanStack AI lowest of the three. In
   the browser, with the source read and the scenarios run, the fit order is the opposite. If
   graphty ever adopts a framework, the first one to evaluate again is TanStack AI.

Why not adopt TanStack AI now, instead of the AI SDK 7? The earlier document rejected frameworks
for four certain costs: two to three times the bytes, a zod 4 migration, a second provider layer,
and a loop that knows nothing of graphty's undo transaction. TanStack AI escapes the first, second
and fourth: with one provider it is 102 to 143 kB gzip against the AI SDK 7's 109 to 120, with all
three providers 268 kB against 255, its core keeps zod 3, and its hooks did the undo transaction.
What still keeps it behind the AI SDK 7:

- **It replaces the provider layer rather than adding to it.** TanStack AI cannot use AI SDK
  models. Moving to it means rewriting graphty-element's `VercelAiProvider` and `WebLlmProvider`,
  the controller's internals, the unit tests that mock the SDK and the provider layer of the paid
  regression harness. The move to the AI SDK 7 is about a day of code plus one regression run
  (`inputs/ai-sdk-v5-vs-v7.md`). Either one is a graphty-element major, because the AI SDK packages
  are graphty-element's peer dependencies.
- **It is still 0.x and still breaking.** `@tanstack/ai` 0.68.0 is a "release candidate" since
  2026-08-21, with 35 releases in 90 days and breaking changes in minor releases after the release
  candidate (0.66.0 on 2026-10-08 changed what `chat({ stream: false })` returns).
- **Its in-browser path is undocumented.** TanStack AI is designed as a client plus a server; its
  BYOK page (bring your own key: the reader supplies the provider key) assumes a relay server.
  Everything ran in a page, but nobody upstream tests that path.
- **In-browser models are weaker there.** No TanStack adapter for WebLLM exists. Its OpenAI-
  compatible base adapter accepts the WebLLM engine through an undocumented cast and then inherits
  WebLLM's limits: tools work only on five "Hermes" models (Nous Research's tool-calling
  fine-tunes of Llama and Mistral), and a system prompt cannot come with tools. The AI SDK 7 has
  community providers (`@browser-ai/web-llm` and others, all from one maintainer) that emulate tool
  calls by prompting and so work with any WebLLM model. graphty already offers tools only to the
  in-browser models that accept them (pull request #1693, which closed issue #1681 on 2026-10-09).

What TanStack AI would buy over the AI SDK 7 is a short list from the AI SDK 7's "still build"
column: browser persistence of the conversation and of pending approvals, conversation compaction,
sub-agents, and an in-page code sandbox (QuickJS, which needs zod 4 inside that one add-on). How
many days that list saves, and how many the migration costs, was not measured: the AI SDK 7 was
neither rated feature by feature nor run through the fourteen scenarios. Against the list stand the
provider-layer rewrite and the cost of tracking a 0.x dependency that breaks in minor releases. For
a decision made now, maturity weighs heavily, and on maturity the AI SDK 7 is ahead.

So the plan stays: graphty's controller on the AI SDK 7. TanStack AI becomes the named alternative
behind the same controller, worth adopting when it reaches 1.0 with a documented in-page path.
Whatever is chosen, graphty's controller, its public AI types, its undo transaction and its
`{ code, params }` results stay graphty's: none of the three frameworks can carry those for it.

**The next step is to run the AI SDK 7 through the same fourteen scenarios and rate it on the same
162 features**, with the same independent re-run and ratings check. That settles whether TanStack
AI's persistence and reload-safe approvals are real work saved against the AI SDK 7 (section 7).
For scale: this bake-off's whole pipeline (dossier, spike, re-run, ratings, ratings check) ran for
three frameworks side by side in about two hours of agent time on 2026-10-10, with no provider keys
and no paid model calls. One more framework is a run of the same size.

### 1.1 The criteria and their weights

Each criterion is scored 3 (best of the three), 2 or 1. Ties share a score. The evidence for each
row is in sections 2 to 5.

| Criterion                                                            |                                 TanStack AI |                       Strands Agents |                                 LangChain createAgent |
| -------------------------------------------------------------------- | ------------------------------------------: | -----------------------------------: | ----------------------------------------------------: |
| Browser fit: persistence, reload-safe approvals, undo per turn, Stop |                                           3 |                                    2 |                                                     1 |
| zod 3 in graphty's public API                                        | 2 (core via shim; three add-ons need zod 4) | 1 (zod 4 migration or bundled alias) |                                            3 (native) |
| Bytes, three providers                                               |                                  3 (268 kB) |                           2 (336 kB) |                                            1 (453 kB) |
| Scenarios, clean of 14                                               |                                      3 (11) |                               2 (10) |                                                 1 (7) |
| Coverage and effort                                                  |                                           2 |                                    2 |                                                     2 |
| Maturity                                                             |                    1 (0.x, breaking minors) |              2 (1.x, written policy) | 3 (1.x, "no breaking changes until 2.0", named users) |
| Vendor risk                                                          |   1 (small team; in-page path undocumented) |        3 (AWS; browser tested in CI) |                 2 (well funded; browser not a target) |

| Weighting                                                      | TanStack AI | Strands Agents | LangChain createAgent | Order                           |
| -------------------------------------------------------------- | ----------: | -------------: | --------------------: | ------------------------------- |
| Equal weights                                                  |          15 |             14 |                    13 | TanStack AI, Strands, LangChain |
| Fit first (browser fit 3; zod, bytes, scenarios 2; the rest 1) |          29 |             23 |                    20 | TanStack AI, Strands, LangChain |
| Maturity first (maturity and vendor risk 3; the rest 1)        |          19 |             24 |                    23 | Strands, LangChain, TanStack AI |

The fit order holds unless maturity and vendor risk together outweigh the browser criteria. That
is also why the AI SDK 7 stays ahead of TanStack AI for a decision made today: the AI SDK 7 matches
TanStack AI on bytes and zod, and leads it on maturity.

## 2. The headline table

|                                                                  | TanStack AI                                                                                                                   | Strands Agents                                                                                                                                                             | LangChain createAgent                                                                                                                                                      |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version examined                                                 | `@tanstack/ai` 0.68.0, `@tanstack/ai-client` 0.39.2, provider adapters 0.21 to 0.37                                           | `@strands-agents/sdk` 1.20.0                                                                                                                                               | `langchain` 1.5.16, `@langchain/core` 1.2.17, `@langchain/langgraph` 1.4.21                                                                                                |
| License                                                          | MIT                                                                                                                           | Apache-2.0                                                                                                                                                                 | MIT                                                                                                                                                                        |
| Who is behind it                                                 | TanStack (Tanner Linsley); a small core team, funded through TanStack's partners                                              | Amazon Web Services                                                                                                                                                        | LangChain Inc. (about $260M raised)                                                                                                                                        |
| Maturity                                                         | 0.x; "release candidate" since 2026-08-21; 35 releases in 90 days; breaking minor releases after the release candidate        | 1.x since 2026-04-30; a minor release almost every week; two breaking minor releases in 1.x under written policy exceptions                                                | 1.x since 2025-10-22; "no breaking changes until 2.0"; 12 to 15 releases per package in 90 days                                                                            |
| Weekly npm downloads                                             | 597,000                                                                                                                       | 535,000                                                                                                                                                                    | 3.1 million (`langchain`), 6.2 million (`@langchain/core`)                                                                                                                 |
| Smallest working agent, gzip                                     | **69 kB** as built (zod 3 and the shim included); 50 kB for the loop with no zod                                              | **224 kB** as built (zod 3 and zod 4 included); 180 kB with no zod at all                                                                                                  | **244 kB** as built, zod left out                                                                                                                                          |
| Smallest agent with one real provider, no zod                    | 102 kB (Anthropic) to 143 kB (OpenAI Responses)                                                                               | about 220 kB (OpenAI)                                                                                                                                                      | 307 kB (Anthropic) to 361 kB (OpenAI)                                                                                                                                      |
| Smallest agent with all three of graphty's providers, no zod     | **268 kB**                                                                                                                    | 336 kB                                                                                                                                                                     | 453 kB                                                                                                                                                                     |
| Full spike page, gzip                                            | 434 kB (includes the MCP client, about 121 kB, and the two nested zod 4 copies it brings under npm)                           | **385 kB**                                                                                                                                                                 | 605 kB (with the MCP adapter's own zod 4 copy, which graphty does not ship today)                                                                                          |
| zod 3 (graphty's version)                                        | Yes, through a 7-line shim that adds JSON Schema; a raw zod 3 schema throws. The MCP, Code Mode and Skills add-ons need zod 4 | **No.** zod 4 is a required peer; the SDK fails at import on zod 3. Only a bundler alias to zod 3.25's internal zod 4 copy, inside graphty's own build, avoids a migration | Yes, natively, schemas and inferred types. The MCP adapter brings its own zod 4                                                                                            |
| Browser support                                                  | Runs fully in a page; undocumented (server-first design)                                                                      | Officially supported and tested in headless Chromium in CI                                                                                                                 | Runs except approvals (`interrupt()`), deep agents and the MCP adapter's build without an alias; undocumented in v1                                                        |
| TypeScript quality: graphty's strict-consumer check              | Core and client clean; the four provider adapters' declarations fail (4 TS2415 errors)                                        | 26 errors in declarations (Node types through the Bedrock client, `Symbol.asyncDispose`)                                                                                   | 26 errors in declarations for the core (34 with the Anthropic and OpenAI packages), and a zod 3 schema passed to `tool()` fails to type under `exactOptionalPropertyTypes` |
| Scenarios passed, of 14                                          | **14**: 11 clean, 3 with a workaround                                                                                         | **14**: 10 clean, 4 with a workaround                                                                                                                                      | **14**: 7 clean, 7 with a workaround                                                                                                                                       |
| Stop aborts the HTTP request (stalling `fetch`)                  | Anthropic, OpenAI, Gemini                                                                                                     | OpenAI (and Bedrock, by its source); not Anthropic, Google or AI SDK models                                                                                                | Anthropic, OpenAI, Google                                                                                                                                                  |
| Stop while a graph command runs                                  | Waits for the command; change lands inside the undo group                                                                     | Waits for the command; change lands inside the undo group                                                                                                                  | Returns at once; change lands about 180 ms later, outside the undo group                                                                                                   |
| graphty code for all 14 scenarios                                | about 115 lines (130 counted, with one shared 8-line connector counted three times)                                           | 249 lines                                                                                                                                                                  | 268 lines                                                                                                                                                                  |
| Bought (native + official add-on)                                | **21.5%**                                                                                                                     | 17.1%                                                                                                                                                                      | 18.3%                                                                                                                                                                      |
| Reachable (bought + extension point)                             | 83.3%                                                                                                                         | **83.5%**                                                                                                                                                                  | 79.5%                                                                                                                                                                      |
| Extension effort, all features not bought                        | **776.5 days**                                                                                                                | 780.5 days                                                                                                                                                                 | 857 days                                                                                                                                                                   |
| of which in the page (extension point and build on top)          | **532.5 days**                                                                                                                | 560.5 days                                                                                                                                                                 | 609 days                                                                                                                                                                   |
| of which needs a service                                         | 244 days                                                                                                                      | 220 days                                                                                                                                                                   | 248 days                                                                                                                                                                   |
| Extension effort counting the days still owed on bought features | 811.5 days                                                                                                                    | **793.5 days**                                                                                                                                                             | 878 days                                                                                                                                                                   |

For scale, from the earlier research measured the same way: the AI SDK 7 is 74 kB gzip for the
loop alone, 109 to 120 kB with one provider and 255 kB with all three (zod 3 counted, which
graphty-element already ships); graphty's loop on the AI SDK 5 today is 152 kB with all three. The
three-provider row is the like-for-like one for graphty. The full spike pages hold different things:
TanStack AI's is heavier than Strands' because of its MCP client and the two zod 4 copies that client
nests under npm, while its loop and providers are lighter.
"Smallest working agent, as built" is the bake-off's first
scenario (three tools over four model calls on a scripted model); the three frameworks counted zod
differently, which is why the "no zod" figures are given beside them.

## 3. The three frameworks

### 3.1 TanStack AI

#### What it is and how it works

TanStack AI is a large, fast-moving TypeScript SDK (about 70 npm packages) built around one
`chat()` function and many "activities" (`summarize`, `generateImage`, `generateSpeech`,
`generateTranscription`, `embed`, `rerank`, `decide`, and more), each served by per-provider
adapters (`openaiText`, `anthropicText`, `geminiText`, ...). There is no Agent class: `chat()` with
tools is the agent.

The loop is `TextEngine` (`@tanstack/ai/src/activities/chat/index.ts:838`). Each cycle streams one
model turn (line 1574), runs the requested tools (line 2330), then asks whether to continue, which
combines the loop strategy, every middleware's vote and the tool phase's own verdict (line 3728).
Everything the loop emits is an AG-UI event (`RUN_STARTED`, `TEXT_MESSAGE_*`, `TOOL_CALL_*`,
`RUN_FINISHED`, `RUN_ERROR` with a `code`, `SUBAGENT_*`, `CUSTOM`), and the same stream feeds the
UI client, persistence and devtools. A pause (an approval, a tool the client must run, a typed
question) ends the run; continuing is a new run that carries `resume` items and the parent run's
id. There is no suspended coroutine in memory, which is what makes a pause survive a reload.

It comes in two halves. The "server" half (`chat()` and middleware) needs no server despite the
name and ran in the page. The client half (`ChatClient` in `@tanstack/ai-client`) owns the
message list, interrupts, queueing, persistence and the connection to the server half. In a page
the connection is the documented `fetcher` option: a function that calls `chat()` in the same page
(`@tanstack/ai-client/src/types.ts:287-325`).

#### Features

**Loop and control**

- Default stop after 5 model turns (`maxIterations(5)`, `chat/index.ts:1019-1020`), plus
  `untilFinishReason`, `combineStrategies` and custom strategies that see the turn count, messages,
  finish reason and tool-call counts.
- Tools in one turn run in parallel by default; `toolExecution: 'sequential'` runs them in order.
- Abort through an `AbortController`; middleware can abort; every tool receives the combined signal.
  Exactly one of `onFinish`, `onAbort` or `onError` fires per run.

**Tools and schemas**

- `toolDefinition({ name, description, inputSchema, outputSchema, needsApproval, approvalSchema,
lazy })`, then `.server(fn)` (runs in the loop; in a page, in the page) or `.client(fn)` (runs in
  the UI client and pauses the run).
- Input validated before the tool runs; a failure goes back to the model as a tool error. Output
  schemas validate results before the model sees them.
- Schemas are Standard JSON Schema (zod 4.2 and later, ArkType, Valibot through a wrapper) or plain
  JSON Schema. zod 3 needs the shim (below).
- A mutable tool registry; tools marked `lazy: true` are withheld behind a synthetic discovery tool,
  for every provider.
- Provider-hosted tools typed per model: OpenAI web search, file search, code interpreter, image
  generation, computer use, MCP; Anthropic web search, web fetch, code execution, memory; Gemini
  Google Search, URL context, code execution, file search, Maps.

**Streaming and structured output**

- AG-UI events with text, reasoning, tool-call argument deltas, partial structured output, usage per
  turn; chunking strategies for smooth UI text.
- `chat({ outputSchema })` returns a typed result after the tool loop; on the OpenAI, Anthropic and
  Gemini adapters the schema goes in the same call as the tools. `decide()`, `choice()`, `score()`
  and `boolean()` ask typed classification questions.

**Approvals and questions**

- `needsApproval: true` pauses before the tool runs; `approvalSchema` makes the answer typed data
  (an edited argument, for example).
- Typed questions from middleware (`defineInterrupt`) at four boundaries (before and after the
  model, before and after tools), with a response schema; an invalid answer is not delivered.
- `.client()` tools are another kind of pause.

**History, persistence and memory**

- `ChatClient` persists the transcript and the resume snapshot (pending approvals, an in-flight
  run) in IndexedDB, localStorage or sessionStorage (`ai-client/src/storage-adapters.ts:134`). This
  is the only shipped browser storage among the three.
- `@tanstack/ai-persistence`: a persistence middleware with store contracts and a conformance test
  suite; only an in-memory store ships.
- `@tanstack/ai-memory`: recall and save middleware with adapters for in-process memory, Redis,
  mem0 and others; an IndexedDB adapter is a small interface graphty would implement.
- `@tanstack/ai-compaction`: evict, summarize (wrapped as untrusted content) or clear old tool
  results before each model call.

**Middleware**

`ChatMiddleware` (`chat/middleware/types.ts:653-870`): `setup`, `onConfig` (replace messages, what
the model sees separately from the stored history, system prompts, tools, model options, and wrap
`fetch` for one call), `onStructuredOutputConfig`, `onStart`, `onIteration`,
`onInterruptBoundary`, `onInterruptResolution`, `onChunk` (pass, replace, expand or drop any
event), `onBeforeToolCall` (transform arguments, skip with a substitute result, abort),
`onAfterToolCall` (replace the result), `onToolPhaseComplete`, `onShouldContinue`, `onUsage`, and
exactly one of `onFinish`, `onAbort`, `onError`. Middleware share typed capabilities. What it cannot
do: switch the adapter or model inside one run. Built-ins: tool cache, a content guard over streamed
text, OpenTelemetry.

**Multi-agent, MCP and code**

- `defineAgent` plus `chat({ subagents })`: each child is a `chat()` with its own model and tools,
  chosen by the main model or a router, run in parallel or in sequence, streaming `SUBAGENT_*`
  events.
- `@tanstack/ai-mcp`: an MCP client over HTTP and SSE (stdio only on a separate entry), MCP
  resources and prompts, elicitation as a resumable interrupt, and an MCP server.
- `registerWebMCPTools` registers tools with the browser's own `navigator.modelContext`.
- Code Mode (`@tanstack/ai-code-mode` with `@tanstack/ai-isolate-quickjs`): the model writes
  TypeScript that calls tools, run in a QuickJS sandbox in the page (240 kB gzip of WASM). Ran in
  Chromium with zod 4; fails with zod 3 although its peer range claims zod 3.

**Providers and other activities**

- Official adapters for OpenAI (Responses and Chat Completions), Anthropic, Gemini, Mistral, Grok,
  Groq, OpenRouter, Bedrock, Ollama, Cohere, Perplexity, Vertex and others, each wrapping the
  vendor's own SDK. Model ids are literal unions per adapter; a new model id needs a package update
  or `extendAdapter`.
- A custom provider extends `BaseTextAdapter` (`chatStream` and `structuredOutput`).
- A BYOK key store in `@tanstack/ai-client/byok`: provider keys encrypted at rest in IndexedDB with a
  key derived from a passkey (WebAuthn PRF, HKDF, AES-256-GCM; `ai-client/src/byok/passkey.ts`),
  masked previews, and helpers that scrub keys from logs. It is designed to send the key to a relay
  server; using it in a page with no relay was not run.
- Provider-hosted tool results: the Anthropic adapter surfaces web search and web fetch results but
  not code execution (measured with a fake `fetch`: neither the code nor its output reaches any
  event), and the OpenAI Responses adapter handles only web search among hosted tool calls
  (`openai-base/dist/esm/adapters/responses-text.js:1091-1099`).
- Speech, transcription, realtime voice (OpenAI, Grok, ElevenLabs), image and video generation,
  embeddings and rerank, multimodal input parts with per-model modality typing. None was run here.

**Observability and testing**

- OpenTelemetry middleware with GenAI conventions; a debug logger; a devtools event bus that is
  **always installed** and cannot be removed (`chat/index.ts:1069-1072`).
- `fakeText()` (`@tanstack/ai/testing`): scripted responses, tool calls, errors, pacing and token
  estimates. Conformance suites for custom persistence and memory stores. No evaluation harness.

**UI**

Hooks for React, Solid, Vue, Svelte, Preact and Angular over the headless `ChatClient`. No Lit
binding; graphty-element would use `ChatClient` directly, which is what its architecture wants
anyway.

#### Strengths

- Smallest and best tree-shaken of the three, close to the AI SDK 7 per provider.
- The only one that ships browser persistence of the conversation and of pending approvals; both
  survived a real reload.
- The richest hook surface: arguments, results, every streamed event, per-call fetch, what the model
  sees versus what is stored, typed questions at four boundaries.
- One typed pause model for approvals, client-run tools and questions, resumable from data.
- Lazy tool discovery that works with every provider, for graphty's large command list.
- An in-page code sandbox with tool bridging.
- Sub-agents with per-agent models and parallel or sequential plans.
- An excellent fake model; deterministic tests with no extra code.
- zod 3 works through a small shim; the core forces no schema library.
- Its events follow AG-UI, an open protocol, so events, persistence and UI share one vocabulary.
- A passkey-encrypted key store for BYOK keys in IndexedDB.
- A type-forward API: model options and input modalities narrowed per model, typed interrupts and
  approval payloads.
- Broad testing: 265 end-to-end tests across 10 providers run on every pull request (beta
  announcement); 24 open issues and 18 open pull requests (against Strands' 104 open TypeScript
  issues).
- Stop aborts the HTTP request on all three of graphty's providers, and a running tool finishes
  before the run ends (both measured).

#### Weaknesses

- 0.x with breaking minor releases after the release candidate; a small core team; no named
  production users.
- Server-first design; the in-page path is undocumented and leans on the vendor SDKs'
  `dangerouslyAllowBrowser` flags.
- The always-on devtools middleware broadcasts every prompt, tool argument and answer as `window`
  events; a ten-line listener received 123 events in the dossier's page probe
  (`dossier-tanstack.md:337`). Any script on a host page
  embedding graphty-element could read the conversation (a host page can already patch `fetch`, so
  the new exposure is small, but it is unrequested work on every chunk).
- No in-browser model adapter; the workaround is undocumented.
- Persistence swallows write failures and has no flush (below).
- Declarations of all four provider adapters fail graphty's strict-consumer type check (TS2415 at
  `ai-anthropic/dist/esm/adapters/text.d.ts:59` and the OpenAI and Gemini equivalents). No TanStack
  type could appear in graphty-element's public API, which is already graphty's rule.
- Engine-made English texts ("Input validation failed for tool ...", "User declined tool
  execution", `RUN_ERROR.message`).
- No guardrail policies, planner, evaluation harness or model fallback built in.
- A monolithic engine: a loop with no approvals or sub-agents still carries their code
  (`spike-tanstack.md:102`).
- The key store protects keys at rest only; script injected into the page can read them once
  unlocked, as its own header says (`ai-client/src/byok/passkey.ts:1-17`).
- Code Mode's QuickJS driver runs on the calling thread (`ai-isolate-quickjs/src/isolate-driver.ts`),
  so a long program blocks the canvas unless graphty moves it into a Worker.
- A lagging vendor SDK pin: `@tanstack/ai-anthropic` 0.21.1 pins `@anthropic-ai/sdk` 0.97.1 (Strands
  installs 0.109.1, LangChain 0.122.0), whose worker build breaks a Vite production build (below).
- Three add-ons graphty would want (Code Mode, Skills, snippets) fail on zod 3 although their peer
  ranges claim it.

#### What the spike showed

Eleven scenarios passed cleanly and three with a workaround. Highlights, in scenario order:

- **Tool loop (workaround).** The scripted model ran three graph tools over four calls. graphty's
  zod 3 schemas need a shim that keeps zod 3 as the validator and adds the JSON Schema TanStack AI
  requires:

    ```ts
    export function zod3<T extends z.ZodTypeAny>(schema: T) {
        const json = zodToJsonSchema(schema, { $refStrategy: "none" }) as Record<string, unknown>;
        const std = schema["~standard"] as StandardSchemaV1.Props<z.input<T>, z.output<T>>;
        return { "~standard": { ...std, jsonSchema: { input: () => json, output: () => json } } };
    }
    ```

    Without it a zod 3 schema throws before any event is emitted, with a message that blames
    `outputSchema` even for a tool's input schema (`tools/schema-converter.ts:257-283`). Surprise:
    the default 5-turn cap ends a longer task **silently**: the last events are `RUN_FINISHED` and
    then a tool result no model ever sees, with no finish reason. graphty must set the loop strategy.

- **Streaming (clean, 8 lines).** One turn in Chromium gave 33 renders; tool-call parts move
  through four states, enough to show "preparing a call" without extra plumbing.
- **Abort (clean, 1 line).** The stream ends without an error event, `onAbort` fires once, partial
  text stays, the next turn runs, and running tools see the signal. Trap: after `ChatClient.stop()`
  the client reports idle before the aborted run's `onAbort` fires, so graphty's undo hook must key
  its group by run id, not assume one open group. Two later probes (`tanstack/probes-final/probe.mjs`,
  calling `chat()` directly): with a provider `fetch` that stalls, an abort after 100 ms aborted the
  HTTP request and ended the run within 2 ms for Anthropic, OpenAI and Gemini (the adapters forward
  the signal: `ai-anthropic/src/adapters/text.ts:493,586`, `ai-gemini/src/adapters/text.ts:1330-1333`);
  and with a 200 ms graph command running, an abort 20 ms in let the command finish, its change
  landed while the undo group was still open, and only then did `onAbort` close the group (the
  engine drains the tool generator, `chat/index.ts:2460`).
- **Approval that survives a reload (clean, 9 lines).** `needsApproval: true` plus the in-page
  `fetcher`:

    ```ts
    const fetcher: ChatFetcher = ({ messages, threadId, runId, parentRunId, resume }, { signal }) => {
        const abortController = new AbortController();
        signal.addEventListener("abort", () => abortController.abort(signal.reason));
        return chat({
            adapter,
            messages,
            tools,
            middleware,
            abortController,
            threadId,
            runId,
            ...(parentRunId ? { parentRunId } : {}),
            ...(resume ? { resume } : {}),
        });
    };
    new ChatClient({ threadId: "t", persistence: indexedDBPersistence(), tools: [deleteNodesDef.client()], fetcher });
    ```

    Approve and deny both worked after a real page reload in Chromium. Surprises: the client must be
    given the tool's definition, or the pending approval arrives as an untyped interrupt and
    approving it does **not** run the tool; one call needing approval holds every other call of the
    same turn until the reader answers (deliberate, `tool-calls.ts:1008-1048`); and the reloads in
    the test came after two IndexedDB reads, so a reload at the very instant the prompt appears is not
    proven safe. The shipped `stream()` connection helper drops the resume data and must not be used
    for this.

- **History in IndexedDB (clean, 13 lines).** Six messages before a reload, six after, and the
  model saw all of them. Three caveats: no API waits for or flushes the writes, and `dispose()` does
  not wait; writes happen on every streamed delta, so a reload mid-answer restores truncated text
  that is later sent to the model as if complete; and write failures are swallowed as "best-effort"
  (`ai-client/src/client-persistor.ts:218-251`), so a full quota loses history silently. The 13
  lines do not cover those defects. The storage option is a plain `{ getItem, setItem, removeItem }`
  object, so graphty can wrap `setItem` to know when a write lands or fails (a small extra piece,
  section 6.1); not marking texts complete until their run finishes is graphty's too.
- **One turn = one undo step (clean, 18 lines).**

    ```ts
    export function undoPerTurn(graph: Graph): ChatMiddleware {
        let paused = false;
        return {
            name: "undo-per-turn",
            onStart: (ctx) => {
                paused = false;
                if (!graph.openGroup) graph.beginGroup(`assistant turn ${ctx.parentRunId ?? ctx.runId}`);
            },
            onToolPhaseComplete: (_ctx, info) => {
                paused = info.needsApproval.length > 0 || info.needsClientExecution.length > 0;
            },
            onFinish: () => {
                if (!paused) graph.endGroup();
            },
            onAbort: () => graph.endGroup(),
            onError: () => graph.endGroup(),
        };
    }
    ```

    One group per turn, including across an approval pause resumed on a new client. The open group
    lives in memory; across a real reload graphty must persist it or accept two undo steps.

- **Tool errors (clean, 0 lines).** A thrown error reaches the model, which retried; invalid input
  never reaches the tool, and the model gets English validation text.
- **Structured output (workaround, 1 line plus the shim).** Typed result; a failing answer rejects
  with zod's message, with no retry and no code.
- **Delegation (clean, 9 lines).** `defineAgent` sub-agents: the planner saw only its tool and the
  synthetic agent tool; the specialist saw only its own.
- **MCP in the browser (clean, 3 lines).** Listed and called a tool on a real HTTP server in
  Chromium. Adds two nested zod 4 copies under npm.
- **Providers and an in-page model (workaround, 9 lines).** All four adapters construct in
  Chromium (OpenAI and Anthropic need `dangerouslyAllowBrowser`). A Vite production build fails
  with the Anthropic adapter ("randomUUID is not exported by __vite-browser-external") until a
  6-line plugin stubs one import; the defect is in `@anthropic-ai/sdk` 0.97.1
  (`lib/environments/worker.mjs:159`), the version TanStack's adapter pins. Strands (0.109.1) and
  LangChain (0.122.0) install newer versions of that SDK, and neither spike hit the failure. The in-page
  model needs no hand-written adapter: TanStack's `OpenAIBaseChatCompletionsTextAdapter` takes an
  injected client and only calls `client.chat.completions.create`, which is WebLLM's engine API
  (`openai-base/src/adapters/chat-completions-text.ts:88-99`):

    ```ts
    class InPageModel extends OpenAIBaseChatCompletionsTextAdapter<string> {}
    const adapter = new InPageModel("Hermes-3-Llama-3.1-8B-q4f16_1-MLC", "webllm", engine as unknown as OpenAI);
    ```

    It ran the tool loop on a WebLLM-shaped stand-in at 73.6 kB gzip with no OpenAI SDK code. It is
    undocumented and relies on a cast. Real WebLLM 0.2.85 allows tools on only five Hermes models and
    throws when a system prompt comes with tools (`@mlc-ai/web-llm/lib/index.js:700-716,955-963`), and
    this adapter turns image tool results into plain text (`chat-completions-text.ts:1395-1410`), so
    an in-page model would get a canvas screenshot as base64 text. No real model was loaded.

- **Many tools (clean, 0 lines).** 100 tools, 97 marked lazy: the first request carried 4 tools; the
  model discovered `metric_42`, which was then sent and ran.
- **Observability (clean, 23 lines).** A trace middleware delivered every model call, token count,
  tool call and the end, in Node and Chromium.
- **Deterministic tests (clean, 0 lines).** `fakeText()` gave identical events, requests and graph
  state across runs. Its tool-call ids restart per fake instance, and in the browser a reused id made
  the client bind a new approval to an old, already denied call: the client does not detect
  duplicate ids.

#### How it extends to graphty's features, and where it fights graphty

| graphty need                                              | TanStack AI seam                                                                                                      | What graphty writes                                                               |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Commands as tools                                         | `toolDefinition(...).server()`                                                                                        | The zod 3 shim per command (or JSON Schema from the catalog)                      |
| One message = one undo step                               | `onStart`, `onToolPhaseComplete`, `onFinish`, `onAbort`, `onError`                                                    | The 18-line middleware, keyed by run id; persisting an open group across a reload |
| Neutral results (`{ code, params }`)                      | Tool results are free-form; the denial payload is replaceable (`tool-calls.ts:558-562`); `onChunk` can rewrite events | Mapping the engine's English texts and `RUN_ERROR.message` to codes               |
| Per-call approval policy (approve 3 nodes, ask for 3,000) | `onBeforeToolCall` plus `defineInterrupt`                                                                             | Threshold rules (S)                                                               |
| Untrusted content, sensitive data, harm screening         | `onAfterToolCall`, `onConfig` (what the model sees), `onChunk`, content guard                                         | The graph-specific policies                                                       |
| Egress control                                            | `wrapFetch` per model call from `onConfig`                                                                            | The ledger and allow-list                                                         |
| Budgets                                                   | `onUsage`, `onShouldContinue`, loop strategy                                                                          | Money and time accounting                                                         |
| Memory across sessions                                    | `memoryMiddleware` with a `MemoryAdapter`                                                                             | An IndexedDB adapter, encryption, export                                          |
| Scripted step-by-step sessions                            | Typed interrupts plus the IndexedDB resume snapshot                                                                   | The script engine                                                                 |
| In-page model                                             | Injected engine, or `BaseTextAdapter`                                                                                 | System-prompt folding or tool-call emulation; image handling                      |
| Local code execution                                      | Code Mode with QuickJS                                                                                                | Its own zod 4 copy for that add-on (not tried); running it in a Worker            |

Where it fights graphty's architecture:

- **Undo groups.** A pause ends the run and the continuation is a new run, so the transaction rule
  for paused runs is sharper here than in a loop that suspends: graphty's middleware must hold the
  group open across the pause, and across a reload persist it. The approval batch rule (every call
  of a turn waits) helps, because nothing runs before the reader decides.
- **Presentation-neutral rule.** Tool results pass `{ code, params }` through untouched; only the
  engine's own texts need mapping, and the hooks reach all of them.
- **zod types in the public API.** No conflict in the core. The MCP client brings its own zod 4
  (nested under npm). Code Mode, Skills and snippets fail on graphty's zod 3; giving them their own
  zod 4 without touching graphty's public schemas may work but was not tried. They carry 214 of the
  essential-weighted total (4.0 points of TanStack AI's 21.5% bought); without them TanStack AI
  buys about 17.5%, level with Strands' 17.1%.
- **Browser-only, no server.** Works, but against the grain of the documentation: the BYOK feature
  assumes a relay, realtime voice tokens are designed to be minted server-side, and durable streams
  need a server. graphty would be off the main road.

#### Maintenance and risk

MIT. Repository created 2025-10-08; 3,181 stars, 146 contributors, 823 commits in six months; three
people make most commits. Alpha 2025-12-04, beta 2026-06-09, release candidate 2026-08-21
("architecture is locked"). 100 versions of `@tanstack/ai` since December; 18 minor releases since
the release candidate, some breaking. Relevant open issues: #929 (Bedrock adapter not bundleable),
#1639 (async persistence restored before `attach()` never rejoins a run), #1631 (MCP list-changed
notifications). The client-side twin of the devtools broadcast was fixed on 2026-10-07 (#1649); the
server-side one was not. The roadmap after 1.0 is orchestration (parallel agents, scheduled jobs,
workflows). The risk is churn and a small team; graphty's design limits the blast radius because
no TanStack type would be in graphty-element's public API.

Sources: https://tanstack.com/ai/latest/docs/getting-started/overview,
https://tanstack.com/ai/latest/docs/advanced/byok, https://tanstack.com/blog/tanstack-ai-rc,
https://github.com/TanStack/ai, `dossier-tanstack.md`, `spike-tanstack.md`.

### 3.2 Strands Agents (TypeScript)

#### What it is and how it works

Strands is a full agent framework from AWS, released in Python and TypeScript in lockstep. One
`Agent` class (`agent/agent.js`, about 2,000 lines) owns the loop, the message history (carried
across calls), tools, hooks, middleware, "interventions", interrupts, structured output,
conversation and context management, sessions and snapshots, memory, retries, model routing,
multi-agent patterns, an MCP client, OpenTelemetry and per-call limits. The default model is Amazon
Bedrock.

`invoke()` drains `stream()` (`agent/agent.js:687-781`). Each cycle checks cancel and limits, calls
the model through the model-stage middleware and the model hooks, and runs any requested tools
through the tool executor and the tool hooks. The assistant message with tool calls and the tool
results are appended **together, after the tools finish** (`agent/agent.js:1212-1219`), so the
history never holds a dangling tool call and the agent can always be called again.
`AfterInvocationEvent` always fires, even on error or cancel (`agent/agent.js:732-779`). A pause
ends the call with `stopReason: 'interrupt'`; the pending tool calls are kept and run on resume
without another model call, and the paused state is part of `agent.takeSnapshot()`.

#### Features

**Loop and control**

- 15 stop reasons, including `cancelled`, `interrupt`, `limitTurns`, `limitTotalTokens`,
  `limitOutputTokens`, `guardrailIntervened`.
- Per-call limits on turns, output tokens and total tokens (`types/agent.d.ts:114-147`); soft caps.
- `agent.cancel()` or a cancel signal stops the loop at the next checkpoint.
- Retry strategies (exponential backoff by default) and background tasks (tools that run while the
  loop continues).
- Concurrent tool execution by default; `toolExecutor: 'sequential'` available.

**Tools and schemas**

- `tool({ name, description, inputSchema, callback })` returns a validating `ZodTool` only for the
  SDK's own zod 4 (an `instanceof` check in `tools/tool-factory.js`), and an unvalidated
  `FunctionTool` for anything else.
- Tool callbacks get the cancel signal, the agent, per-call state and `interrupt()`; a callback may
  be an async generator that streams progress.
- `agent.tool.<name>.invoke()` calls a tool directly. Tool names capped at 64 characters.
- Vended tools: HTTP request, notebook, sleep, hand-off to user, stop, A2A client (browser);
  file editor, bash, shell, web fetch and MCP router (Node only).

**Streaming and structured output**

- `agent.stream()` yields 14 typed event types per tool round trip; breaking out still fires the
  after-hooks. (Bidirectional voice streaming, `BidiAgent`, is Python only: the TypeScript package
  has no Bidi code.)
- `structuredOutputSchema` (zod 4) registers a hidden tool and forces it if the model answers in
  text; violations go back to the model.

**Approvals, interventions and questions**

- Interrupts from a tool, a hook or middleware, with any JSON reason; resumed with an interrupt
  response; the agent refuses ordinary input while one is pending (`agent/agent.js:1036`).
- Interventions: handlers on the invocation, the model call or a tool call that return proceed,
  deny, guide, confirm or transform.
- `HumanInTheLoop`: per-tool approval with allow-lists, "trust this tool from now on", an optional
  model-based risk classifier, and an in-process `ask` callback or a pause.
- `handoffToUser`: a tool the model calls to stop and ask the reader.

**History, context, sessions and memory**

- Conversation managers: sliding window (default, 40 messages), summarizing, none, or custom.
- A context manager: truncate large tool results, summarize at 85% of the window, offload content
  to a stash with a retrieval tool, or let the model manage its context (experimental).
- `Storage` interface (write, read, delete, list; optional search) with in-memory, local-file and
  S3 implementations; no browser implementation, but one is about 20 lines.
- `SessionManager` saves agent snapshots (messages, state, interrupts) and restores them.
- `MemoryManager` with `MemoryStore` (search and add): adds memory tools, injects results, extracts
  memories with a model on triggers. Stores ship for files (Node) and Bedrock Knowledge Bases.
- `appState` and `modelState`: JSON state never sent to the model.

**Hooks, middleware and plugins**

- Hooks with writable fields: refuse a whole message, start another round after it, block or retry
  a model call, rewrite a tool's input, swap its implementation, cancel it, raise an interrupt,
  rewrite or retry its result, end the turn after tools.
- Middleware wraps the model stage (replace the model, messages, system prompt, tool list, tool
  choice for one call), the tool stage and the whole stream. Public and typed, but **not in the
  user guide**; the only description is a design note in the source.
- Plugins: Agent Skills (loaded on demand), context offloader and injector, `GoalLoop` (re-run until
  a validator or a judge model passes).

**Multi-agent and MCP**

- Agent as a tool (`asTool()`, with `preserveContext` and `delegate`); nested interrupts propagate.
- `Graph` (nodes are agents, conditional edges, snapshots) and `Swarm` (hand-offs with step limits
  and loop detection). Both ran in Chromium.
- A2A client (browser) and server (Express, Node).
- `McpClient` over Streamable HTTP with OAuth, header and custom transports, prefixed and filtered
  tool names, MCP tasks. stdio and server-file loading are Node-only.

**Guardrails**

Amazon Bedrock Guardrails (needs AWS credentials in the page), a Cedar policy intervention
(Node-only: `vended-interventions/cedar/cedar.js:3-4`), and an LLM steering judge that only judges
tool calls (`steering/handlers/llm.d.ts:44`). No PII detector.

**Providers**

`BedrockModel` (default), `OpenAIModel` (Responses or Chat Completions), `AnthropicModel` (with
Anthropic server tools: web search, web fetch, code execution, tool search), `GoogleModel` (with
Gemini built-in tools), `VercelModel` (any AI SDK model of the version-3 spec, so AI SDK 6
providers; AI SDK 7 providers run but need a type cast), and `ModelRouter` with classifier and
fallback strategies. A custom model is a `Model` subclass with three methods. No in-browser model
provider (WebLLM is requested in issue #2481).

**Observability, testing and UI**

- Local traces and metrics on every result with no setup; OpenTelemetry spans and metrics; a
  pluggable logger. Evaluations are Python only.
- No published test model: the repository's `MockMessageModel` is excluded from the npm package.
- No UI bindings; an AG-UI adapter exists as an Express server.

#### Strengths

- Real, tested browser support: unit and integration tests run in headless Chromium in CI
  (`.github/workflows/typescript-ts-test.yml:39-42`), with an official browser example.
- The most complete orchestration: interrupts that survive serialization, interventions, approvals
  with trust and a risk classifier, Graph, Swarm, model routing, retries, background tasks, context
  offloading, memory extraction.
- Small, documented extension interfaces: a model is 3 methods, storage 4, a sandbox 6, a memory
  store 2, a plugin 2.
- History is always valid after a cancel or crash (deferred append); the whole agent state is JSON.
- Native turn and token limits.
- Funded by AWS; a written versioning policy with 6 months of support for a superseded major.
- Precise types (4 occurrences of `: any` across 258 declaration files; events discriminated by
  `type`) and thorough doc comments on nearly every public member.

#### Weaknesses

- **zod 4 required**; fails at import on zod 3. Passing a zod 3 schema to `tool()` fails silently:
  the model is sent zod's internals as the schema and nothing is validated.
- **A high byte floor**: `agent/agent.js:2` imports the Bedrock model and `:5` the MCP client
  statically, about 370 kB of minified code in every bundle whether used or not; every consumer also
  installs `@aws-sdk/client-bedrock-runtime`, a hard dependency.
- **Stop does not reach the network** for Anthropic (`models/anthropic.js:158-160`), Google or
  AI SDK models; only the OpenAI and Bedrock models pass the signal.
- **English strings in history** ("Cancelled by user", "Tool execution cancelled", `DENIED: ...`,
  `Approve "tool"? Input: ...`; `interventions/registry.js:65-106`).
- **The default agent prints every model output to `console.log`** (`agent/printer.js:6-13`);
  graphty must always pass `printer: false`.
- AWS-first defaults (Bedrock model, Bedrock guardrails, file and S3 storage).
- No published test utilities, no TypeScript evaluations, several features Python-only.
- Two breaking minor releases in 1.x (middleware in 1.6.0; the MCP client peer's major in 1.20.0).
- No named production user of the TypeScript SDK (the named ones use Python).
- Its type declarations reach Node types through the Bedrock client: 26 errors under graphty's
  strict-consumer check.
- A plain esbuild browser build fails on its dynamic Node imports (`Could not resolve "path"` from
  `session/file-storage.js:37`, `"node:readline"` from `hitl.js:16`) until they are marked external;
  Vite only warns.
- AI SDK 7 providers fall outside `VercelModel`'s types (it is typed for the AI SDK 6 provider
  spec), so they need a cast, and the in-browser model providers that track the AI SDK 7 do too.
- Structured output works only with zod 4 schemas, and its result is typed `unknown`.
- 1,006 open issues and pull requests across the monorepo (Python and TypeScript), 104 of them open
  TypeScript issues.

#### What the spike showed

Ten scenarios passed cleanly and four with a workaround.

- **Tool loop (workaround, 48 lines).** Each zod 3 schema is converted with `zod-to-json-schema`
  into a `FunctionTool` that validates in its own callback:

    ```ts
    export function zod3Tool<S extends z.ZodTypeAny>(
        name: string,
        description: string,
        schema: S,
        run: (input: z.infer<S>, ctx: ToolContext) => JSONValue | Promise<JSONValue>,
    ): FunctionTool {
        return new FunctionTool({
            name,
            description,
            inputSchema: zodToJsonSchema(schema as unknown as Parameters<typeof zodToJsonSchema>[0], {
                $refStrategy: "none",
            }) as JSONSchema,
            callback: (input, ctx) => run(schema.parse(input), ctx), // FunctionTool itself does not validate
        });
    }
    ```

    The cast is needed: without it TypeScript fails with "Type instantiation is excessively deep",
    because zod 3 and zod 4 types meet.

- **Streaming (clean, 20 lines).** Typed events rendered in Chromium with real typing and clicks.
- **Abort (workaround, 5 lines).** With the scripted model, Stop took 67 ms in Chromium, the history
  stayed valid and the next turn ran. With the real `AnthropicModel` on a fake `fetch` that stalls,
  Stop took 1,505 ms and the HTTP request was never aborted, because the loop checks for cancel only
  between chunks (`agent/agent.js:1750`) and the model passes no signal. A 3-line `fetch` wrapper
  that adds the turn's signal fixed it (54 ms). `OpenAIModel` stopped in 50 ms on its own. The
  same wrapper for Google and AI SDK models was not run. A later probe (`strands/probes-final/probe.mjs`)
  cancelled 20 ms into a 200 ms graph command that ignores the cancel signal: `invoke()` waited for
  the command, its change landed while the undo group was still open, and then the after-invocation
  hook closed the group and `invoke()` returned `stopReason: 'cancelled'`.
- **Approval that survives a reload (clean, 25 lines).** A hook raises an interrupt whose reason is
  graphty's own `{ code, params }`, the session is saved in IndexedDB, and after a reload the
  pending approvals are listed with public APIs:

    ```ts
    agent.addHook(BeforeToolCallEvent, (e) => {
        if (!destructive.includes(e.toolUse.name)) return;
        const answer = e.interrupt({
            name: APPROVAL,
            reason: { code: "APPROVE_TOOL", params: { tool: e.toolUse.name, input: e.toolUse.input } },
        });
        if (answer !== "approve") e.cancel = JSON.stringify({ code: "E_DENIED", params: { tool: e.toolUse.name } });
    });
    agent.addHook(InterruptEvent, (e) => {
        agent.appState.set("pending", [
            ...(agent.appState.get("pending") ?? []),
            { id: e.interrupt.id, reason: e.interrupt.reason ?? null },
        ]);
    });
    agent.addHook(BeforeInvocationEvent, () => {
        agent.appState.set("pending", []);
    });
    ```

    Resuming ran the pending tool without another model call. While an approval is pending the agent
    throws on ordinary input, so graphty's UI must block or route new messages.

- **History in IndexedDB (clean, 21 lines).** A 4-method `Storage` on IndexedDB plus the session
  manager; 14 messages came back after a reload in Chromium.
- **One turn = one undo step (clean, 12 lines).**

    ```ts
    agent.addHook(BeforeInvocationEvent, () => undo.begin());
    agent.addHook(AfterInvocationEvent, () => undo.end()); // fires on success, error, cancel, break and interrupt
    ```

    By default an approval pause splits one turn into two undo groups; an `InterruptEvent` hook that
    leaves the group open while paused keeps one. That takes 3 more lines, counted in the 12 for
    parity with TanStack AI's 18, which include the pause.

- **Tool errors (clean, 0 lines).** Errors and invalid input reach the model as `Error: <message>`.
- **Structured output (workaround, 8 lines).** Validates and feeds violations back, but only with zod
  4: a zod 3 schema throws "reading 'def'" (`spike-strands.md:72`), so graphty must hand it a zod 4
  schema (or the alias's), and the result is typed `unknown` (`types/agent.d.ts:372`). It is a
  workaround for the same reason TanStack AI's scenario 8 is: graphty's own zod 3 schema does not
  work as it is.
- **Delegation (clean, 12 lines).** `analyst.asTool()`; each agent saw only its own tools.
- **MCP in the browser (clean, 2 lines).** `new McpClient({ url })` against a cross-origin server in
  Chromium. Chrome's Local Network Access check will also apply when a public page reaches an MCP
  server on the reader's machine, for every framework.
- **Providers and an in-page model (clean, 12 lines).** OpenAI, Anthropic and Google models
  construct in the page. Strands' `VercelModel` with the community `@browser-ai/web-llm` 2.1.10 ran
  the tool loop on a stand-in engine with a non-Hermes model, because that provider asks for tool
  calls in a fenced JSON block and keeps the system prompt. It must stay pinned to 2.1.x: its 3.x line
  targets the AI SDK 7, which `VercelModel` does not accept. A 26-line shim over `OpenAIModel` is
  the alternative without the community package.
- **Many tools (clean, 18 lines).** One model-stage middleware sent 5 of 100 tools per call.
- **Observability (clean, 19 lines).** Four hooks; `result.metrics` and `result.traces` come free.
- **Deterministic tests (workaround, 47 lines).** No fake model is published, so graphty writes one.

Other findings: a default Vite build that imports Agent Skills fails (`vended-plugins/skills/skill.js:9-10`
imports `fs` and `path`), and with those aliased, activating a skill throws "No Sandbox configured"
until an inert `Sandbox` subclass is supplied; and the Anthropic model only logs provider-hosted
tool results (`models/anthropic.js:178-181`), so with Anthropic's hosted code execution no code,
output or file ever comes back to graphty (confirmed with a fake `fetch`,
`strands/probes-final/probe.mjs`). Its OpenAI model documents code interpreter output as "not
surfaced" (`models/openai/responses-adapter.js:9`), and its Google model has no handling for
Gemini's executable code parts.

#### How it extends to graphty's features, and where it fights graphty

| graphty need                | Strands seam                                                         | What graphty writes                                                                      |
| --------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Commands as tools           | `FunctionTool` or a `Tool` subclass                                  | The zod 3 adapter with validation                                                        |
| One message = one undo step | Invocation hooks; tool-stage middleware; `InterruptEvent`            | 12 lines; a rule for pauses that outlive a reload                                        |
| Neutral results             | `cancel` accepts any string; `AfterToolCallEvent.result` is writable | A replacement on every cancel, deny and interrupt path; never the vended approval prompt |
| Approvals                   | Hook interrupts, interventions, `HumanInTheLoop`                     | A graphty intervention raising `{ code, params }` (about 40 lines)                       |
| Persistence                 | `Storage`, `SessionManager`, `MemoryStore`                           | IndexedDB implementations, encryption, export                                            |
| Stop that stops spending    | Model classes                                                        | A `fetch` wrapper per provider, or an upstream fix                                       |
| Guardrails                  | Interventions, hooks, model-stage middleware                         | All policy content (Bedrock Guardrails and Cedar do not run on graphty's setup)          |
| Tool selection              | Model-stage middleware                                               | A selector over the command catalog                                                      |
| Local code execution        | `Sandbox` (6 methods)                                                | A QuickJS or Pyodide sandbox in a Worker (rated extension point, L)                      |
| Tests                       | `Model` subclass                                                     | A scripted model                                                                         |

Where it fights graphty's architecture:

- **zod types in the public API.** This is Strands' largest cost. graphty-element exposes zod 3
  types in its main and `./schema` entry points. Strands needs zod 4 under the name `zod`. The
  options are a zod 4 migration of graphty-element (breaking) or bundling Strands into
  graphty-element's own `dist` with every `import "zod"` inside it aliased to the zod 4 copy that zod
  3.25 ships at `zod/v4`. The alias was tested and ran (213 kB gzip) and is not breaking, but it
  works only while graphty bundles Strands rather than letting the consumer's bundler resolve it,
  so graphty-element can no longer share one copy of Strands or zod with the consumer.
- **Undo groups.** Fits well: the after-invocation hook fires on every exit.
- **Presentation-neutral rule.** The loop and vended handlers write English into the history, which
  reaches the model and, if rendered, the reader. Every path can be overridden, but the defaults are
  sentences.
- **Browser-only, no server.** The core fits best of the three. The defaults do not: Bedrock is the
  default model, guardrails and memory stores assume AWS, and several vended pieces are Node-only.

#### Maintenance and risk

Apache-2.0. Monorepo https://github.com/strands-agents/harness-sdk: 8,753 stars, 319 contributors;
342 commits to the TypeScript SDK in six months by 49 authors. 45 versions since 2025-11-28; 1.0.0
on 2026-04-30; 1.1.0 to 1.20.0 in 23 weeks. A written semver policy, with "pay for play" breaking
changes allowed in minor releases and MCP, A2A and OpenTelemetry conventions excluded. 104 open
TypeScript issues, including a P1 where an Ollama AI SDK provider breaks the loop (#3190). The
risk is moderate: strong funding and process, but AWS-first defaults, Python-first features and
breaking changes under exceptions.

Sources: https://strandsagents.com/blog/strands-agents-typescript-v1/,
https://github.com/strands-agents/harness-sdk, `dossier-strands.md`, `spike-strands.md`,
`verify-strands.md`.

### 3.3 LangChain createAgent

#### What it is and how it works

`createAgent()` from the `langchain` package (v1) builds a LangGraph state graph around a chat
model from a provider package, customized by middleware. The graph has a model node
(`agents/nodes/AgentNode.js:25`), a tool node (`agents/nodes/ToolNode.js:17`) and one node per
middleware hook. The loop is: every `beforeAgent`, every `beforeModel`, the model call wrapped by
every `wrapModelCall`, every `afterModel` in reverse, then either the tools (one LangGraph task per
tool call, so calls in one step run **concurrently**, `ReactAgent.js:394-397`) and back to the
model, or every `afterAgent` and the end. It stops when the model asks for no tools, a tool marked
`returnDirect` returns, a middleware jumps to the end, or LangGraph's recursion limit throws (25
graph steps by default; near the limit the model node writes "Sorry, need more steps to process
this request." in place of the answer, `AgentNode.js:99-103`).

State is LangGraph channels (`messages`, `structuredResponse`, each middleware's own fields),
persisted after every step when a checkpointer is passed. That gives threads, interrupts, state
history and "time travel", and it is why a reload can resume a run: on resume LangGraph re-runs only
the tasks that had not finished.

#### Features

**Loop and control**

- Graph-step recursion limit; middleware jumps to the model, the tools or the end.
- `invoke`, `stream` (seven stream modes) and `streamEvents` (including the new v3 run stream with
  typed projections for messages, tool calls, sub-agents, interrupts).
- Abort through an `AbortSignal`, raced against the model call (`AgentNode.js:150-153`); the provider
  classes pass the signal to their client (`@langchain/anthropic/dist/chat_models.js:894,944`). With a
  provider `fetch` that stalls, an abort after 100 ms aborted the HTTP request and rejected the run
  within 2 ms for `ChatAnthropic`, `ChatOpenAI` and `ChatGoogle` (`langchain/spike/probes-final/probe.mjs`).

**Tools and schemas**

- `tool(fn, { name, description, schema })` with zod 3, zod 4, JSON Schema or Standard Schema;
  arguments validated and defaults applied.
- Tools receive the signal, the call id, the graph state, the run context, the store and a stream
  writer; they may return strings, objects, a `ToolMessage` with an out-of-context artifact, or a
  LangGraph `Command`.
- Errors go back to the model with " Please fix your mistakes." appended (`ToolNode.js:31-47`).

**Structured output**

`responseFormat` with a zod schema, a JSON schema, a tool strategy or the provider's native
JSON-schema mode; violations sent back and retried by default; strongly inferred result types.

**Approvals**

`humanInTheLoopMiddleware` (approve, edit or reject per tool, batched into one interrupt) and
`interrupt()` anywhere. **Both fail in a browser** (below).

**Threads, checkpoints and stores**

- `MemorySaver` (in memory) and server checkpointers (SQLite, Postgres, Redis, MongoDB); no
  browser checkpointer exists on npm. A checkpointer is five methods.
- `InMemoryStore` for long-term memory, with optional embedding search.

**Middleware**

Six hooks (`beforeAgent`, `beforeModel`, `wrapModelCall`, `afterModel`, `wrapToolCall`,
`afterAgent`) with persisted per-middleware state and jumps. 17 built-ins: human-in-the-loop,
summarization, context editing, a to-do list planner, tool and model call limits, model and tool
retry, model fallback, tool error mapping, PII detection and redaction, an LLM tool selector,
provider-side tool search, dynamic system prompts, a tool emulator for tests, OpenAI moderation
(OpenAI models only), and prompt caching for Anthropic and Bedrock.

**Multi-agent and MCP**

- Agent as a tool, with sub-agent event streaming; supervisor and swarm packages; any custom
  LangGraph graph; `deepagents` (sub-agents, a virtual file system, skills), which does not load in
  a page.
- `@langchain/mcp-adapters` 2.0 (MCP over HTTP, OAuth, per-call hooks, elicitation through
  interrupts). It imports the stdio transport statically, so a browser build needs an alias, and it
  brings its own zod 4.

**Providers, observability and testing**

- First-party packages for OpenAI, Anthropic, Google (two), Azure, Bedrock, Vertex, Mistral, Groq,
  Cohere, xAI, DeepSeek and more. In a page, pass model instances: string model ids load the
  provider with a dynamic import that bundlers leave unresolved (`chat_models/universal.js:134`).
  `ChatWebLLM` cannot call tools (`@langchain/community/dist/chat_models/webllm.js:30`).
- Provider-hosted code execution: measured with a fake `fetch`, `ChatAnthropic` returns Anthropic's
  code-execution blocks (the code and its output) on a plain call, but drops the result blocks when
  streaming, because the stream converter's list of block types omits them
  (`@langchain/anthropic/dist/utils/message_outputs.js:42-50`). In `createAgent` the same holds:
  `invoke` keeps them, `stream` with token streaming does not. By their source, the OpenAI Responses
  converter keeps code interpreter calls when streaming (`@langchain/openai/dist/converters/responses.js:536-540`)
  and the Google converter keeps executable code and its result (`@langchain/google/dist/converters/messages.js:349-359`);
  those two were not run.
- Callbacks on every model and tool call; LangSmith tracing stays off in a page, but its client
  (about 54 kB gzip) is a static import that cannot be dropped.
- `fakeModel()` and `FakeToolCallingModel`; vitest matchers; the tool emulator.
- React hooks only, aimed at LangChain's hosted Agent Server.

#### Strengths

- Native zod 3, with strong inference from graphty's own schemas.
- The best built-in middleware library: summarization, planning, limits, retries, fallbacks, PII,
  tool selection, all of which ran in Chromium.
- Broadest first-party provider coverage, and a short path to a custom provider.
- Structured output with automatic retry.
- Checkpoints make reload-safe runs possible once a browser checkpointer exists, and on resume only
  unfinished tool calls run again.
- Good test doubles.
- The strongest stability promise of the three, from a large, funded company.
- Named production users: Uber, LinkedIn, Klarna, JP Morgan, BlackRock, Cisco and Rippling
  (LangChain's 1.0 announcement; mostly Python and server use). The other two have none for their
  TypeScript packages.
- State history and "time travel" (replaying or forking a run from any checkpoint) come with
  LangGraph.
- The largest ecosystem of the three: 3.1 million weekly downloads of `langchain` and 6.2 million
  of `@langchain/core`, and integrations for most providers, stores and tools.
- Stop aborts the HTTP request on all three of graphty's providers (measured).

#### Weaknesses

- **Approvals, interrupt-based questions and MCP elicitation do not work in a browser.**
  `interrupt()` reads its context from AsyncLocalStorage (`@langchain/langgraph/dist/interrupt.js:55-57`),
  which LangGraph's browser entry does not install; an `interrupt()` inside a tool fails quietly and
  the run carries on (langgraphjs issue 879, open since 2025-02-19).
- **The heaviest by far**: 244 kB gzip before any provider, 307 to 361 kB with one, 453 kB with
  three, 605 kB for the full spike page.
- Browser support is not documented in v1 (docs issue 1177); the install page names Node and Bun.
- Any `wrapToolCall` middleware makes tool errors fatal (`ToolNode.js:150-152`; langchainjs issue
  11844, open); graphty's agent would always have one.
- Concurrent tool calls, with no option to run a step's calls in sequence: both graph versions run
  them concurrently (`langchain/dist/agents/types.d.ts:685-704`). TanStack AI and Strands also run
  tools in parallel by default but each has a switch. graphty must serialize graph commands itself,
  or ask the provider for one tool call per turn.
- An abort does not stop a running tool (below).
- English strings in the message list and errors.
- A large type surface, with a wrong result-message type and untyped state reads. Checking the whole
  spike (every provider, MCP, the community package and Node types) reads 1,729 declaration files
  in 3 to 4 seconds; a 30-line agent with one provider reads 1,062 (`dossier-langchain.md:455`).
- graphty's strict-consumer check fails: 26 errors in the declarations of `langchain`,
  `@langchain/core`, `@langchain/langgraph` and `langsmith` (zod interop constraints,
  `Symbol.asyncDispose`, a missing `NullableHeaders` type), 34 with the Anthropic and OpenAI
  packages; and under `exactOptionalPropertyTypes` a zod 3 schema passed to `tool()` matches no
  overload (TS2769). Without that flag the declaration errors drop to 6 and 9
  (`langchain/spike/tmp/strict/`).
- Hosted code execution results from Anthropic are lost when streaming (above).

#### What the spike showed

Seven scenarios passed cleanly and seven with a workaround. Everything ran in Node and in Chromium
except the built-in approval middleware.

- **Tool loop (clean, 33 lines).** `createAgent({ model, tools })` and `invoke`; 31 of the lines are
  the three tool definitions with zod 3 schemas.
- **Streaming (clean, 21 lines).** Two stream modes joined (token chunks and per-node updates).
  Trap: with Anthropic or the OpenAI Responses API, text arrives as arrays of content blocks
  whenever tools are bound, so code that handles only string content shows nothing; the
  `message.text` getter (`@langchain/core/dist/messages/base.js:144`) flattens them.
- **Abort (workaround, 16 lines plus signal checks in every command).** Aborting during the model
  call is clean. Aborting during a tool leaves an unanswered tool call in the thread, which the next
  turn sends and the providers reject; graphty repairs it:

    ```ts
    const cancelled = dangling.map(
        (c) =>
            new ToolMessage({
                tool_call_id: c.id,
                name: c.name,
                status: "error",
                content: JSON.stringify({ code: "E_CANCELLED", params: {} }),
            }),
    );
    await agent.graph.updateState(cfg, { messages: cancelled }, "tools");
    ```

    Worse: aborted while a graph command was really running, the run rejected at once, LangGraph did
    not wait for the tool, and the command **applied its change about 180 ms later**, after the undo
    group had closed, so the change could not be undone and the repair told the model `E_CANCELLED`
    for a change that was applied. Every graphty command must check the abort signal before it
    applies anything, or the stop path must wait for the in-flight command. The same probe on
    TanStack AI and Strands found that both wait for the running command before the run ends, so this
    defect is LangChain's alone.

- **Approval that survives a reload (workaround, 38 lines).** The built-in middleware throws "Called
  interrupt() outside the context of a graph." in Chromium. A 3-line AsyncLocalStorage stand-in
  suggested in issue 879 made it work only in some run orders, so it is not usable. What works is a
  `wrapToolCall` that awaits graphty's own prompt, on an IndexedDB checkpointer, resumed after a
  reload with `invoke(null)`:

    ```ts
    wrapToolCall: async (request, handler) => {
        const { id = "", name, args } = request.toolCall;
        if (!destructive.has(name)) return handler(request);
        if ((await ask({ id, name, args }, request.runtime.signal)) === "approve") return handler(request);
        return new ToolMessage({ tool_call_id: id, name, status: "error",
            content: JSON.stringify({ code: "E_DENIED_BY_USER", params: { tool: name } }) });
    },
    ```

    With two destructive calls in one step, the one approved before the reload was not run again.
    Editing arguments and reviewing a batch are graphty's to write.

- **History in IndexedDB (workaround, 50 lines).** No browser checkpointer exists, so the spike
  subclassed `MemorySaver` and mirrored it to IndexedDB in 44 lines. It rewrites the whole snapshot
  on every write; one record per checkpoint is the production version. `invoke` returns only after
  the writes finish, so each turn is saved when it returns.
- **One turn = one undo step (workaround, 25 lines).** `afterAgent` is skipped on abort and error,
  `beforeAgent` is skipped on a resumed run, and a step's tool calls run concurrently, so the
  middleware opens the group in `wrapToolCall` too, queues the calls, and a `finally` around every
  `invoke` closes it:

    ```ts
    createMiddleware({
        name: "UndoTurn",
        beforeAgent: () => {
            g.beginGroup("assistant turn");
        },
        wrapToolCall: async (request, handler) => {
            g.beginGroup("assistant turn"); // a resumed run never runs beforeAgent
            const run = queue.then(() => handler(request)); // one step's tool calls run concurrently
            queue = run.catch(() => undefined);
            return run;
        },
        afterAgent: () => {
            g.endGroup();
        },
    });
    ```

- **Tool errors (workaround, 3 lines).** Recovery works with no middleware; any `wrapToolCall`
  makes the error fatal; the built-in `toolErrorMiddleware` restores recovery and lets graphty send
  `{ code, params }`.
- **Structured output (clean, 4 lines).** A zod 3 schema; an invalid answer was retried; the result
  is typed.
- **Delegation (clean, 10 lines).** The specialist is its own `createAgent`, called from a tool.
- **MCP in the browser (workaround, 12 lines).** The Vite build fails without aliasing the stdio
  transport (`@langchain/mcp-adapters/dist/connection.js:6`); the adapter keeps a long-lived SSE
  stream that a buffering proxy breaks; its zod 4 is 82 kB gzip of new weight.
- **Providers and an in-page model (workaround, 27 lines).** The shipped adapters construct in the
  page and set `dangerouslyAllowBrowser` themselves. `ChatOpenAI` with a 21-line
  `configuration.fetch` that calls the WebLLM engine drove the loop in Chromium on a fake engine.
  A fake must send `delta.role` and a fresh response id like real WebLLM does, or `ChatOpenAI` drops
  the deltas and LangGraph's reducer replaces the message.
- **Many tools (clean, 5 lines).** `llmToolSelectorMiddleware` sent 3 of 100 tools per step at the
  cost of one extra model call per step; an 8-line keyword filter did the same with no extra call.
- **Observability (clean, 13 lines).** A callback handler saw every model call with tokens and every
  tool call, in order.
- **Deterministic tests (clean, 11 lines).** `fakeModel().respondWithTools(...).respond(...)`.

Other findings: the Anthropic converter calls `Buffer.from` on raw bytes
(`@langchain/anthropic/dist/utils/message_inputs.js:98, 118`), which does not exist in a page, so
images and files must be passed as base64 strings; and `agent.getState` and friends are marked
internal and typed `never` (`ReactAgent.d.ts:294-318`), so the working path is `agent.graph`.

#### How it extends to graphty's features, and where it fights graphty

| graphty need                | LangChain seam                                                                        | What graphty writes                                                         |
| --------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Commands as tools           | `tool()` with zod 3                                                                   | One adapter; abort checks inside every command                              |
| One message = one undo step | `beforeAgent`, `wrapToolCall`, `afterAgent`                                           | The 25-line middleware with serialization, plus `finally` around every call |
| Neutral results             | `toolErrorMiddleware`, `toolStrategy(..., { handleError })`, HITL description options | Mapping each English string to `{ code, params }`                           |
| Approvals                   | `wrapToolCall` (the built-in middleware fails in a page)                              | Policy per command, edit, batch review, the prompt (M)                      |
| Persistence                 | Checkpointer (5 methods), store (1 method)                                            | IndexedDB implementations                                                   |
| Abort                       | `AbortSignal`                                                                         | Dangling-call repair; waiting for in-flight commands                        |
| Guardrails                  | All six hooks; PII middleware                                                         | Untrusted content, egress, policy modes, budgets                            |
| In-page model               | `ChatOpenAI` with a custom `fetch`, or a `BaseChatModel`                              | The WebLLM bridge                                                           |
| Structured questions        | none in a page (interrupts fail)                                                      | A tool that awaits graphty's UI (M)                                         |

Where it fights graphty's architecture:

- **Undo groups.** Worst of the three: concurrent tool calls, turn hooks skipped on abort and
  resume, and tools that keep running after an abort. Each is fixable in graphty, but each is a
  place where an undo group can silently miss a change.
- **Presentation-neutral rule.** English in the loop ("Please fix your mistakes.", "Sorry, need more
  steps ...", "User rejected the tool call ...", "Tool call limit exceeded ..."). Each has a
  documented knob, but graphty must find and set every one.
- **zod types in the public API.** No conflict; LangChain accepts zod 3 and graphty's `zod/v4`
  schemas.
- **Browser-only, no server.** The weakest fit: interrupts need Node, the browser is not a documented
  target, and the product's center of gravity is LangSmith and the hosted Agent Server.

#### Maintenance and risk

MIT. LangChain Inc. (Series B at $1.25B, October 2025). 1.0 on 2025-10-22 with "no breaking changes
until 2.0" and at least a year of 1.x maintenance after 2.0. `langchainjs` 18,252 stars;
`langgraphjs` 3,342; about 400 commits each in six months. 26 stable releases of `langchain` in six
months. Companion packages break on their own schedule (`@langchain/mcp-adapters` 2.0 on
2026-10-01; `@langchain/google` still 0.x and replacing `@langchain/google-genai`). Open defects
that touch graphty: 879 (browser interrupts), 11844 (fatal tool errors), 11647 (a throwing tool
under `streamEvents` crashes the process), 10818 (string model ids do not bundle), 11887 (tool
callbacks skipped on validation failure). The risk is not the company; it is that the browser is
not a target, so nothing commits LangChain to keep the page build working.

Sources: https://docs.langchain.com/oss/javascript/release-policy,
https://docs.langchain.com/oss/javascript/langchain/middleware/built-in,
https://github.com/langchain-ai/langgraphjs/issues/879,
https://github.com/langchain-ai/langchainjs/issues/11844, `dossier-langchain.md`,
`spike-langchain.md`, `verify-langchain.md`.

## 4. The fourteen scenarios

Every framework was built against the same fourteen scenarios, the way that framework intends,
against scripted fake models (no provider key). "Clean" means it passed with documented, public
APIs; "workaround" means it passed only with code that works around a defect or gap. No scenario
failed outright on any framework. Lines are non-blank, non-comment lines of code graphty would own.

|   # | Scenario                                                              | TanStack AI                                                                                                                                         | Strands Agents                                                                        | LangChain createAgent                                                     |
| --: | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
|   1 | Tool loop: three graph tools with zod 3 schemas over four model calls | workaround, 36 (zod 3 shim)                                                                                                                         | workaround, 48 (zod 3 adapter; `tool()` silently accepts zod 3 and validates nothing) | clean, 33                                                                 |
|   2 | Streaming text and tool events to a page                              | clean, 8                                                                                                                                            | clean, 20                                                                             | clean, 21 (must use `message.text`)                                       |
|   3 | Stop in the middle of a run                                           | clean, 1 (key the undo group by run id)                                                                                                             | workaround, 5 (Stop does not abort Anthropic, Google or AI SDK requests)              | workaround, 16 (dangling tool call; a running tool lands after the abort) |
|   4 | Approval before a destructive tool, surviving a page reload           | clean, 9                                                                                                                                            | clean, 25                                                                             | workaround, 38 (built-in approval fails in a page)                        |
|   5 | History in IndexedDB, restored in a new session                       | clean, 13 (the 13 lines do not cover two defects: a reload mid-answer restores truncated text later sent as complete, and failed writes are silent) | clean, 21                                                                             | workaround, 50 (no browser checkpointer)                                  |
|   6 | One user turn is one undo step                                        | clean, 18                                                                                                                                           | clean, 12 (9, plus 3 to keep one group across an approval pause)                      | workaround, 25 (hooks skipped on abort and resume; concurrent tools)      |
|   7 | Tool error recovery                                                   | clean, 0                                                                                                                                            | clean, 0                                                                              | workaround, 3 (any `wrapToolCall` makes errors fatal)                     |
|   8 | Structured output                                                     | workaround, 1 (zod 3 shim; no retry)                                                                                                                | workaround, 8 (zod 3 throws; zod 4 only; result untyped)                              | clean, 4                                                                  |
|   9 | Delegation to a specialist agent                                      | clean, 9                                                                                                                                            | clean, 12                                                                             | clean, 10                                                                 |
|  10 | MCP client in the browser over Streamable HTTP                        | clean, 3 (two nested zod 4 copies)                                                                                                                  | clean, 2                                                                              | workaround, 12 (stdio alias; zod 4)                                       |
|  11 | Three providers in a browser bundle, and an in-page model             | workaround, 9 (Vite stub for the old `@anthropic-ai/sdk` 0.97.1 TanStack AI pins; undocumented injected engine)                                     | clean, 12 (community WebLLM provider pinned to 2.1.x)                                 | workaround, 27 (WebLLM through a custom `fetch`)                          |
|  12 | 100 tools, a relevant subset per step                                 | clean, 0 (`lazy: true`)                                                                                                                             | clean, 18 (middleware)                                                                | clean, 5 (built-in selector)                                              |
|  13 | Per-step events and traces to a callback                              | clean, 23                                                                                                                                           | clean, 19                                                                             | clean, 13                                                                 |
|  14 | Deterministic unit test with the framework's own fake model           | clean, 0                                                                                                                                            | workaround, 47 (no published fake)                                                    | clean, 11                                                                 |
|     | **Clean / workaround**                                                | **11 / 3**                                                                                                                                          | **10 / 4**                                                                            | **7 / 7**                                                                 |
|     | **Lines of graphty code**                                             | **130** (about 115 counting the shared 8-line connector once)                                                                                       | **249**                                                                               | **268**                                                                   |

What the table says:

- **The three that matter most to graphty are 3, 4 and 6** (stop, reload-safe approval, one undo step
  per turn). TanStack AI passed all three cleanly; Strands passed two cleanly and stop with a
  per-provider wrapper; LangChain needed a workaround on all three, and its stop workaround touches
  every graph command.
- **zod 3 is where TanStack AI and Strands pay**: both need an adapter per command (scenarios 1 and
  8), but TanStack's validates with zod 3 and Strands' must validate by hand because its own
  non-zod tool type does not.
- **The heavy LangChain line counts are infrastructure LangChain lacks in a page**: a checkpointer,
  an approval middleware, abort repair.
- **Several of the heaviest features are exercised by no scenario**: F74 sandboxed code execution
  (181 essential), F61 reading the reader's files (164), F38 view and camera control (105) and F100
  action proposal and dry-run preview (90). Four of them are in the "differ most" table in section 5. Their ratings come from reading the source and docs, plus, for F74, the fake-`fetch` probes of
  hosted code execution described in section 5.
- **Every in-page model path is a workaround of some kind**, and real WebLLM's own limits (tools on
  five models, no system prompt with tools) apply to any framework that passes tools through to it.
  Only a provider that emulates tool calls by prompting, like the AI SDK community provider Strands
  reached, avoids them.

## 5. Feature comparison by family

The 162 features fall into 21 families. Bought and reachable are essential-weighted shares within
the family; days are extension effort.

| Family                                | Features | Essential | TanStack AI bought / reachable / days | Strands bought / reachable / days | LangChain bought / reachable / days |
| ------------------------------------- | -------: | --------: | ------------------------------------- | --------------------------------- | ----------------------------------- |
| Conversation and context              |        8 |       191 | 44% / 97.9% / 15.5                    | 44% / 97.9% / 15.5                | 44% / 97.9% / 15.5                  |
| Asking the user                       |        5 |       134 | 78.4% / 91.8% / 11                    | 56.7% / 91.8% / 7                 | 56.7% / 100% / 14.5                 |
| Planning and orchestration            |        6 |        56 | 57.1% / 94.6% / 9                     | 41.1% / 94.6% / 12                | 67.9% / 100% / 9                    |
| Memory and knowledge                  |        8 |       129 | 26.4% / 99.2% / 15.5                  | 18.6% / 95.3% / 18.5              | 7.8% / 99.2% / 16                   |
| Graph and product tools               |       24 |     1,544 | 0% / 96.8% / 92                       | 0% / 96% / 92                     | 0% / 96% / 148.5                    |
| Information gathering                 |        7 |       196 | 81.1% / 95.4% / 37                    | 81.1% / 95.4% / 29.5              | 81.1% / 93.9% / 29.5                |
| Files, documents and media            |       14 |       548 | 12.8% / 53.5% / 58                    | 9.3% / 53.5% / 64                 | 21.2% / 21.2% / 55                  |
| Execution and compute                 |        9 |       293 | 64.5% / 86.7% / 48                    | 2.7% / 88.7% / 58.5               | 66.6% / 88.7% / 50                  |
| Integrations and outbound actions     |        9 |       313 | 42.8% / 92.3% / 71                    | 45% / 94.6% / 63                  | 42.8% / 92.3% / 66                  |
| Long-running and proactive work       |        4 |       165 | 0% / 6.7% / 51                        | 0% / 6.7% / 51                    | 0% / 6.7% / 51                      |
| Human control and trust               |        7 |       401 | 52.4% / 83.8% / 22.5                  | 52.4% / 92.8% / 22.5              | 25.9% / 83.8% / 42.5                |
| Quality and verification              |        7 |       248 | 5.2% / 99.2% / 20.5                   | 0% / 99.2% / 21                   | 5.6% / 99.6% / 17.5                 |
| Provenance, reproducibility and audit |        5 |       205 | 0% / 94.6% / 25                       | 0% / 94.6% / 25                   | 0% / 94.6% / 25                     |
| Observability                         |        2 |         3 | 66.7% / 66.7% / 0.5                   | 66.7% / 66.7% / 0.5               | 66.7% / 66.7% / 0.5                 |
| Explanation and communication         |        4 |       132 | 36.4% / 100% / 0.5                    | 100% / 100% / 0                   | 28.8% / 100% / 6                    |
| Interaction modes and channels        |        8 |        84 | 46.4% / 46.4% / 70                    | 0% / 0% / 73                      | 0% / 0% / 73                        |
| Safety                                |        8 |       122 | 0% / 87.7% / 26.5                     | 0% / 87.7% / 26.5                 | 0% / 94.3% / 31.5                   |
| Privacy and data governance           |       13 |       195 | 1.5% / 83.1% / 95                     | 1.5% / 83.1% / 95                 | 1.5% / 83.1% / 100                  |
| Security                              |        3 |       210 | 10.5% / 73.8% / 11                    | 0% / 63.3% / 14                   | 0% / 63.3% / 14                     |
| Identity, access and collaboration    |        9 |       122 | 0% / 14.8% / 91                       | 0% / 39.3% / 86                   | 0% / 33.6% / 86                     |
| Cost and performance                  |        2 |        36 | 0% / 69.4% / 6                        | 0% / 100% / 6                     | 0% / 69.4% / 6                      |

Reading it:

- **The graph and product tools are 29% of everything (1,544 of 5,327) and 0% bought everywhere.**
  Every framework hosts them as tools; none supplies any. The effort gap (92 days against 148.5 for
  LangChain) comes from LangChain's raters sizing most graph tools one step larger, mainly because
  every command must serialize, check the abort signal and live inside an undo middleware whose
  hooks are skipped on abort and resume. The abort defect behind that is measured and is
  LangChain's alone (TanStack AI and Strands wait for a running command), but the size of each
  step is rater judgment: with the ten graph tools sized as TanStack AI's raters sized them (F31,
  F38, F40, F41, F45, F46, F48, F53, F169, F178), LangChain's total falls from 857 to 800.5 days.
- **Execution and compute** separates Strands, almost entirely through F74 sandboxed code execution
  (181 essential). All three are rated by one rule: code execution counts as an official add-on
  when the framework ships an in-page sandbox, or when at least one of graphty's three providers
  returns the code and its output through the framework's own model classes. TanStack AI qualifies
  through Code Mode, its in-page QuickJS sandbox, which ran in Chromium but only with zod 4; its
  own provider adapters drop hosted code-execution results (Anthropic measured with a fake
  `fetch`, OpenAI by its source). LangChain qualifies through its provider packages: `ChatAnthropic`
  returns the code and output on a plain call but drops the results when streaming (measured), and
  the OpenAI and Google converters keep them by their source (not run). Strands does not qualify:
  its Anthropic model drops the result blocks (measured), its OpenAI model documents the output as
  not surfaced, and its Google model has no handling for them, so code execution is graphty's to
  build (an in-page sandbox behind Strands' `Sandbox` interface, rated extension point, L). F74
  alone is 3.4 of the 4.4 points between TanStack AI's and Strands' bought shares.
- **Human control and trust** separates LangChain: its approval gate (F99) is an extension point
  because the built-in one fails in a page.
- **Interaction modes and channels**: only TanStack AI ships anything (realtime voice, speech and
  transcription add-ons), and its whole 46.4% there is one rating, F129 voice conversation, official
  add-on. That rating rests on an assumption nobody checked: that OpenAI's
  `/v1/realtime/client_secrets` endpoint accepts a call from a browser, so a page can mint the
  realtime token with the reader's key (TanStack's own token helper runs on a server). Likewise
  F158 credential vault rests on TanStack's key store, which is built to send keys to a relay
  server and was not run without one. Rated as the other two frameworks are, the two would take
  TanStack AI from 21.5% to 20.3% bought.
- **Explanation and communication**: Strands rates plain-language explanation (F125) native; the
  other two rate it an extension point, because graphty feeds its catalog's facts to the model
  through a prompt hook. The wording is the model's in all three, so this is mostly a difference of
  rating standard.
- **Identity, access and collaboration** and **long-running and proactive work** are mostly service
  work for every framework; the differences in "reachable" there are rating disagreements about
  what a reader's own mail or drive account can do (section 8).
- **Files, documents and media** is the biggest reachable gap: LangChain rates reading the reader's
  files (F61) build on top, since it contributes nothing to opening uploads or folders.

### The features where they differ most

Ranked by essential count. Each cell is rating / effort.

| Feature                                                  | Essential | TanStack AI         | Strands Agents                  | LangChain createAgent           | Why they differ                                                                                                                                                                         |
| -------------------------------------------------------- | --------: | ------------------- | ------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F74 Sandboxed code execution                             |       181 | official add-on / M | extension point / L             | official add-on / M             | TanStack AI: Code Mode in the page (zod 4 only); its adapters drop hosted results. LangChain: hosted results come back except Anthropic when streaming. Strands: every model drops them |
| F31 Graph data query                                     |       166 | extension point / S | extension point / S             | extension point / M             | LangChain's commands need serialization and abort checks                                                                                                                                |
| F61 Read user files                                      |       164 | extension point / L | extension point / M             | build on top / M                | Strands has file content blocks and a sandbox file interface; LangChain only carries results                                                                                            |
| F81 External tools and connectors (MCP)                  |       134 | official add-on / M | native / M                      | official add-on / M             | All three work in a page; Strands' is in the core                                                                                                                                       |
| F99 Approval gate                                        |       106 | native / S          | native / S                      | extension point / M             | LangChain's approvals fail in a page                                                                                                                                                    |
| F38 View and camera control                              |       105 | extension point / S | extension point / S             | extension point / M             | As F31                                                                                                                                                                                  |
| F100 Action proposal and dry-run preview                 |        90 | extension point / M | extension point / M             | extension point / L             | As F31                                                                                                                                                                                  |
| F125 Plain-language explanation                          |        84 | extension point / S | native / none                   | extension point / M             | Rating standard differs; it is model output in all three                                                                                                                                |
| F46 Versions, branches and structural diff               |        49 | extension point / L | extension point / L             | extension point / XL            | As F31                                                                                                                                                                                  |
| F129 Voice conversation                                  |        39 | official add-on / M | build on top / L                | build on top / L                | Only TanStack ships realtime voice; its in-page token minting is unverified                                                                                                             |
| F155 Consent management                                  |        38 | extension point / M | extension point / M             | extension point / L             | Effort judgment                                                                                                                                                                         |
| F63 Document parsing and OCR                             |        37 | extension point / M | extension point / M             | native / S                      | LangChain passes page citations through from Anthropic                                                                                                                                  |
| F106 Hand-off to a person                                |        36 | needs a service / L | extension point / L             | needs a service / XL            | Rating disagreement (the reader's own mail account)                                                                                                                                     |
| F27 Domain knowledge packs                               |        24 | official add-on / M | native / M                      | extension point / M             | Skills in TanStack (zod 4) and Strands (browser workarounds); LangChain's live in `deepagents`, which does not load in a page                                                           |
| F129, F65, F182 Voice, audio and video, generative media | 39, 13, 6 | official add-on     | build on top or extension point | build on top or official add-on | TanStack's media activities                                                                                                                                                             |
| F10 Structured questions                                 |        17 | native / S          | extension point / S             | extension point / M             | TanStack's typed interrupts; LangChain's interrupts fail in a page                                                                                                                      |
| F14 Planning                                             |        15 | extension point / M | extension point / M             | native / S                      | LangChain's to-do list middleware                                                                                                                                                       |
| F87 Agent-to-agent exchange                              |         7 | build on top / L    | native / M                      | build on top / M                | Strands' A2A client                                                                                                                                                                     |

The effort on the 35 features where at least one framework is native or official add-on is 21 days
for TanStack AI, 50 for Strands and 40.5 for LangChain, counting only the features each framework
does not buy. Counting the days still owed on the features it does buy (its own zod 4 for Code
Mode, wiring the voice token, and so on), it is 56, 63 and 61.5 days. That is where the choice of
framework saves or costs work; the 127 other features cost about the same whichever is chosen.

## 6. What graphty would build on top

### 6.1 On TanStack AI

| Piece                                                                                                                                       | Effort         |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| The zod 3 shim, applied to every command (or JSON Schema from graphty's catalog)                                                            | S              |
| The in-page `fetcher` connection                                                                                                            | S              |
| The undo middleware keyed by run id, with the open group persisted across a reload                                                          | S              |
| An explicit loop strategy (the default 5-turn cap ends tasks silently)                                                                      | S              |
| A write-confirming wrapper around persistence `setItem` (failures are silent; no flush)                                                     | S              |
| A unique-id guard for tool calls (duplicates bind approvals to the wrong call)                                                              | S              |
| Mapping the engine's English texts and `RUN_ERROR.message` to `{ code, params }`                                                            | S to M         |
| Per-call approval thresholds on `onBeforeToolCall` plus `defineInterrupt`                                                                   | S              |
| An IndexedDB `MemoryAdapter` and persistence store, with encryption and export                                                              | M              |
| The in-page model: the injected engine, system-prompt folding or tool-call emulation, image results                                         | M              |
| Code Mode with its own zod 4 copy (not tried; it fails on zod 3), run in a Worker                                                           | M              |
| Guardrail policies on the hooks: untrusted content, sensitive attributes, egress through `wrapFetch`, harm screening, policy modes, budgets | M to L         |
| A planning tool (none is built in)                                                                                                          | M              |
| A Vite plugin for the Anthropic SDK's Node import                                                                                           | S              |
| Keeping TanStack types out of graphty-element's public API (adapter declarations fail the strict check)                                     | included above |
| Upstream: ask for a way to turn off the devtools middleware                                                                                 | -              |

Total extension effort over all 162 features: 776.5 days, of which 532.5 in the page; 811.5 days
counting the days still owed on features rated bought.

### 6.2 On Strands Agents

| Piece                                                                                                                                                                                                                                        | Effort                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **The zod decision**: migrate graphty-element to zod 4 (a breaking major), or bundle Strands into graphty-element's `dist` with `zod` aliased to the zod 4 copy inside zod 3.25 (tested, not breaking, but no copy shared with the consumer) | M to L, plus a major if migrating |
| The zod 3 tool adapter with validation in the callback                                                                                                                                                                                       | S                                 |
| An IndexedDB `Storage` (sessions and the context stash) and a `MemoryStore`                                                                                                                                                                  | S and M                           |
| A `fetch` wrapper per provider so Stop aborts Anthropic, Google and AI SDK requests (or an upstream fix)                                                                                                                                     | S each                            |
| A graphty intervention for approvals with `{ code, params }` reasons, and replacements for every English cancel and deny string                                                                                                              | S to M                            |
| `printer: false` everywhere                                                                                                                                                                                                                  | S                                 |
| The undo hooks and the pause rule                                                                                                                                                                                                            | S                                 |
| A tool-selection middleware over the command catalog                                                                                                                                                                                         | S                                 |
| A scripted test model                                                                                                                                                                                                                        | S                                 |
| The in-page model through `VercelModel` and `@browser-ai/web-llm` pinned to 2.1.x, or the 26-line shim                                                                                                                                       | S                                 |
| An in-page `Sandbox` over QuickJS or Pyodide for local code execution                                                                                                                                                                        | L                                 |
| Workarounds to use Agent Skills in a page (Node built-in aliases and an inert `Sandbox`)                                                                                                                                                     | S                                 |
| Guardrail policies (Bedrock Guardrails and Cedar do not apply)                                                                                                                                                                               | M to L                            |
| Vite stubs for the dynamic Node imports                                                                                                                                                                                                      | S                                 |

Total extension effort: 780.5 days, of which 560.5 in the page; 793.5 days counting the days still
owed on features rated bought.

### 6.3 On LangChain createAgent

| Piece                                                                                                                     | Effort |
| ------------------------------------------------------------------------------------------------------------------------- | ------ |
| An in-page approval middleware: per-command policy, edit, batch review                                                    | M      |
| A production IndexedDB checkpointer (one record per checkpoint) and store                                                 | M      |
| Abort handling: dangling-call repair, abort checks in every command, waiting for in-flight commands                       | S to M |
| The undo middleware with serialization and a `finally` around every call (no option runs a step's tool calls in sequence) | S      |
| `toolErrorMiddleware` on every agent                                                                                      | S      |
| Structured questions as tools that await graphty's UI (interrupts fail in a page)                                         | M      |
| The in-page model bridge through `ChatOpenAI` with a custom `fetch`                                                       | S to M |
| Mapping every English string to `{ code, params }`                                                                        | S to M |
| Bundler setup: alias the MCP stdio transport; pass model instances, never string ids                                      | S      |
| Base64 strings for every image and file (the Anthropic converter uses `Buffer`)                                           | S      |
| Guardrail policies beyond the shipped PII middleware                                                                      | M to L |
| A reader-file tool (F61, build on top)                                                                                    | M      |

Total extension effort: 857 days, of which 609 in the page; 878 days counting the days still owed
on features rated bought.

### 6.4 Whichever is chosen

127 features are bought by none of the three, and they are most of the work in every case
(730.5 to 816.5 days). By family, the largest:

- **Graph and product tools** (24 features, 1,544 essential-weighted, 92 to 148.5 days): editing,
  algorithm and layout execution, data import and schema design, style layers, graph data query,
  view and camera control, entity resolution, render capture, versions and structural diff. These
  are graphty-element commands, exposed as tools.
- **Privacy and data governance** (13 features, 95 to 100 days): consent, redaction, retention and
  deletion, encrypted storage, local-only processing.
- **Identity, access and collaboration** (9 features, 86 to 91 days), **long-running and proactive
  work** (4 features, 51 days) and most of **integrations and outbound actions**: largely
  service work. 220 to 248 days of every framework's total are features a page cannot do without a
  companion service (durable jobs, triggers, hand-off to a person, sharing, shared editing,
  notifications, channel adapters, browser automation, scaled compute).
- **Files, documents and media** (14 features, 55 to 64 days): reading the reader's files, document
  generation, exports, charts.
- **Interaction modes and channels** (8 features, 70 to 73 days): voice, non-visual output, other
  surfaces.
- **The cross-cutting pieces** every option needs: conversation history and its pruning, browser
  persistence (TanStack AI ships part of it), the undo transaction and its rule for paused runs,
  `{ code, params }` results, graphty's own public AI types (`LlmProvider`, `MockLlmProvider`,
  graphty's message types), guardrail policy content, and the product screens and words, which
  belong to the graphty app.

## 7. What would change the answer

- **The AI SDK 7, run through the same fourteen scenarios and rated on the same 162 features.** This
  is the missing comparison and the cheapest way to settle the choice. If its approvals cannot
  resume across a reload in a page, or it lacks the hooks graphty's undo and guardrails need,
  TanStack AI's lead becomes real work saved and adopting it moves ahead of the AI SDK 7.
- **TanStack AI reaches 1.0 with a documented in-page path**, minor releases stop breaking, and the
  devtools middleware can be turned off. Then it is the better foundation than the AI SDK 7, and the
  move rides the same graphty-element major.
- **graphty-element moves to zod 4 for its own reasons.** Strands' largest cost disappears; its
  byte floor (the static Bedrock and MCP imports) and its Stop defect remain, and it would then
  compete with TanStack AI on orchestration.
- **Strands drops the static Bedrock and MCP imports, publishes its fake model and passes the cancel
  signal in every model class.** It would then be the strongest candidate on engineering quality.
- **LangGraph makes `interrupt()` work in browsers (issue 879) and documents browser support.**
  LangChain would rise to about Strands' level, but it would still be the heaviest.
- **Orchestration moves to the front of graphty's roadmap** (critique and agreement protocols,
  agent-based simulation, multi-agent graphs). Strands' Graph and Swarm then save the most.
- **In-browser models become the main path.** The ecosystem of in-page providers that emulate tool
  calls lives around the AI SDK; Strands reaches it (pinned to an older AI SDK spec), and TanStack AI
  and LangChain reach WebLLM only through workarounds bound by WebLLM's own limits.
- **graphty decides to run a companion service.** 220 to 248 days of each framework's effort is
  service work, and the server-side halves (TanStack's durable streams, LangGraph's Agent Server,
  Strands on Temporal) would then count. The comparison would need redoing for that half.

## 8. Method

### Versions

All installed from npm on 2026-10-10, latest stable:

- **TanStack AI**: `@tanstack/ai` 0.68.0, `@tanstack/ai-client` 0.39.2, `@tanstack/ai-openai` 0.29.1,
  `@tanstack/openai-base` 0.13.1, `@tanstack/ai-anthropic` 0.21.1 (on `@anthropic-ai/sdk` 0.97.1),
  `@tanstack/ai-gemini` 0.37.2, `@tanstack/ai-mcp` 0.8.3, plus the persistence, compaction,
  memory, skills, Code Mode and QuickJS add-ons.
- **Strands Agents**: `@strands-agents/sdk` 1.20.0, with `@modelcontextprotocol/client` 2.3.1 and
  `@browser-ai/web-llm` 2.1.10.
- **LangChain**: `langchain` 1.5.16, `@langchain/core` 1.2.17, `@langchain/langgraph` 1.4.21,
  `@langchain/langgraph-checkpoint` 1.1.6, `@langchain/anthropic` 1.5.12, `@langchain/openai` 1.6.2,
  `@langchain/google` 0.2.10, `@langchain/mcp-adapters` 2.0.1, `@langchain/community` 1.1.29.
- Shared: zod 3.25.76 (graphty-element's version), Vite 7, Vitest 3.2.7, TypeScript 5.9.3, Node 22,
  headless Chromium through Playwright, `@mlc-ai/web-llm` 0.2.85 (types and source only).

### How the evidence was made

1. **A dossier per framework** (`dossier-*.md`): the installed JavaScript and type declarations read
   and cited by file and line, plus documentation, release notes, issues, npm and GitHub statistics.
2. **A spike per framework** (`spike-*.md`, code under `tanstack/spike/`, `strands/spike/`,
   `langchain/spike/`): the fourteen scenarios built the way each framework intends, run as Vitest
   tests in Node (with fake-indexeddb) and in headless Chromium against a real Vite build, with real
   clicks, typing and page reloads. Mock MCP servers and the pages ran under servherd; browsers ran
   one at a time through the machine's shared browser-slot gate.
3. **An independent re-run of every spike**: every test, type check, bundle measurement and browser
   check was repeated, and the claims the spike's own code did not test were probed with added tests
   (stalling providers for Stop, aborts during a running tool, public APIs for pending approvals,
   shipped adapters for in-page models, run-order effects on the approval middleware). The scenario
   results above are the corrected ones.
4. **Ratings of all 162 features per framework** (`ratings-<framework>-1.json` to `-6.json`), each
   with the mechanism, effort and evidence.
5. **A skeptic's check of the ratings** (`verify-*.md`): every native and official add-on rating on a
   feature with an essential count of 10 or more, every needs-a-service rating, a random 25 of the
   extension point and build on top ratings (fixed seed), and every feature where one framework
   differed from both others. It changed 10 TanStack ratings, 29 Strands ratings and 6 LangChain
   ratings, ran new Chromium checks for Strands' vended plugins and new Node tests for TanStack's
   typed questions.
6. **Scores** (`score.mjs`, `scores.md`, `scores.json`) computed from the verified ratings.
7. **Probes run on all three frameworks after the ratings check**, so each comparison rests on the
   same test: Stop against a provider `fetch` that stalls (all three providers on TanStack AI and
   LangChain; Strands from its dossier), Stop while a 200 ms graph command is running, whether
   Anthropic's hosted code-execution results reach graphty (a fake `fetch` speaking Anthropic's wire
   format), and graphty's strict-consumer type check on LangChain (TanStack AI and Strands had it in
   their spikes). Code: `tanstack/probes-final/`, `strands/probes-final/`,
   `langchain/spike/probes-final/`, `langchain/spike/tmp/strict/`, `probes/fakes.mjs`.

### How the scores are computed

- Bought and reachable are essential-weighted shares of 5,327.
- Effort is S = 0.5, M = 3, L = 8, XL = 20 days summed over features not rated native or official
  add-on, including features that need a service.
- Native and official add-on ratings can still carry an effort grade (for example TanStack AI's
  code execution, official add-on / M, which needs its own zod 4). The headline totals count those
  as 0 days. They are not small, and not even: 35 days for TanStack AI, 13 for Strands and 21 for
  LangChain. Counted in, the totals are 811.5, 793.5 and 878 days, and Strands is lowest.
- Scores are weighted by the essential counts. As a robustness check they were also weighted by the
  "helpful" counts (how many use cases a feature makes better without being required; 6,330 in
  all): bought becomes 28.5% (TanStack AI), 21.1% (Strands) and 22.2% (LangChain), and with
  essential and helpful added together 25.3%, 19.3% and 20.4%. The helpful weighting favors
  TanStack AI, which offsets the effort counting above, which favors Strands.
- "Common" features are those no framework rates native or official add-on (127); "differing" are
  the other 35.
- The earlier document's 69% to 77% used a coarser four-way scale over 54 harness features; it
  counted generic guardrail hooks as native and missed TanStack AI's shipped browser storage. The
  numbers here are not comparable with it except where stated (52%, 40% and 45% over those same 54
  rows).

### Sensitivity

The ratings check flagged some ratings as disagreements between the raters of different frameworks
and left them as they were. This table puts them on one standard, one at a time and then together
(computed from `ratings-*.json` and the feature map). Each cell is bought share, reachable share
and extension effort in days.

| Rating standard                                                                                                                                                         | TanStack AI           | Strands Agents        | LangChain createAgent |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------- | --------------------- |
| As rated                                                                                                                                                                | 21.5% / 83.3% / 776.5 | 17.1% / 83.5% / 780.5 | 18.3% / 79.5% / 857   |
| Counting days owed on bought features                                                                                                                                   | 21.5% / 83.3% / 811.5 | 17.1% / 83.5% / 793.5 | 18.3% / 79.5% / 878   |
| F74 code execution counted for Strands although its models drop the results (provider-hosted tools counted as bought without checking, as LangChain's raters first did) | as rated              | 20.5% / 83.5% / 772.5 | as rated              |
| F125 plain-language explanation and F126 audience adaptation under one standard                                                                                         | as rated              | 15.6% / 83.5% / 781   | 18.5% / 79.5% / 851.5 |
| LangChain's ten graph-tool efforts sized as TanStack AI's raters sized them                                                                                             | as rated              | as rated              | 18.3% / 79.5% / 800.5 |
| F61 reading the reader's files rated extension point for LangChain (TanStack AI's rating rests on the same seams)                                                       | as rated              | as rated              | 18.3% / 82.6% / 857   |
| F125 and F126, the graph-tool efforts and F61 harmonized together, plus F106, F161 and F162 rated as TanStack AI's raters rated them                                    | 21.5% / 83.3% / 776.5 | 15.6% / 82.7% / 781   | 18.5% / 82.6% / 783   |
| The same, with F74 counted for Strands                                                                                                                                  | 21.5% / 83.3% / 776.5 | 19.0% / 82.7% / 773   | 18.5% / 82.6% / 783   |
| TanStack AI without its three zod 4 add-ons (Code Mode, Skills, snippets: F74, F27, F20)                                                                                | 17.5% / 83.3% / 785.5 | as rated              | as rated              |
| TanStack AI without its two unverified ratings (F129 voice, F158 key store)                                                                                             | 20.3% / 82.5% / 782.5 | as rated              | as rated              |
| Weighted by helpful counts                                                                                                                                              | 28.5% bought          | 21.1% bought          | 22.2% bought          |
| Weighted by essential plus helpful counts                                                                                                                               | 25.3% bought          | 19.3% bought          | 20.4% bought          |

Under one standard the three are within 10 days of each other on effort. On bought share TanStack
AI stays ahead by 2.5 to 6 points, and most of that lead is F74, which TanStack AI buys only through
Code Mode and zod 4; without its three zod 4 add-ons it buys 17.5%. The row that counts F74 for
Strands departs from the rule this document applies (section 5); it is shown because F74 is the
largest single rating difference.

### Bundle measurements

Each spike measured its own bundles with Vite 7 (minified, gzip level 9, one inlined chunk per
entry); the dossiers measured with esbuild for the browser. The two methods agree within about 2%
for TanStack AI and LangChain; for Strands, Vite tree-shakes zod 4 much better than esbuild (about
27 kB against 90 kB gzip). The spikes counted zod differently: TanStack's smallest agent includes
zod 3 and the shim, Strands' includes zod 3 and zod 4, LangChain's leaves zod out. Section 2 gives
the like-for-like "no zod" figures. The full spike pages hold different things (each holds every
scenario the way that framework needed it), so they compare only roughly.

### Limits

- **No real provider was called** (no keys were available). Provider behavior, CORS from a page,
  rate limits and model quality are not proven; every model was a scripted fake, a fake `fetch`
  speaking the provider's wire format, or a stand-in WebLLM engine.
- **No real in-browser model was loaded** (it needs WebGPU and a 4 to 5 GB download).
- **The AI SDK 7 was not part of this bake-off**: it was not run through the fourteen scenarios and
  not rated on the 162 features, so every comparison with it relies on the earlier research.
- **Effort sizes are judgments.** Raters for different frameworks sized the same work differently
  in places, and some disagreements were flagged and left as they are: F159 identity and roles, F161
  per-item access policy, F106 hand-off to a person, F162 access-controlled sharing, F126 audience
  adaptation, F125 plain-language explanation, F74 code execution (whether LangChain's adapters
  actually return hosted code-execution results), F68 and F71 document generation and media
  composition, F77 batch pipelines, F170 entity extraction and F48 live streaming updates. Put on
  one standard they close the gap between all three to about 10 days (section 8, "Sensitivity"),
  so the coverage and effort scores do not rank the frameworks.
- **Several heavy features are rated from source only**: no scenario exercises F74 code execution
  (beyond the fake-`fetch` probes), F61 reading the reader's files, F38 view and camera control or
  F100 dry-run preview.
- **TanStack AI's F129 voice and F158 key store ratings are unverified** in a page with no server.
- **The scenarios run in Chromium only**; Firefox and Safari were not tried.
- TanStack AI's typed questions from middleware ran in Node only; the reload-safe approval path they
  share ran in Chromium.

### Files

In `tmp/ai-bakeoff/`:

- `dossier-tanstack.md`, `dossier-strands.md`, `dossier-langchain.md`: the frameworks in depth.
- `spike-tanstack.md`, `spike-strands.md`, `spike-langchain.md`: the fourteen scenarios, with code.
- `verify-tanstack.md`, `verify-strands.md`, `verify-langchain.md`: the ratings checks.
- `ratings-*.json`: every rating with its evidence; `scores.md`, `scores.json`, `score.mjs`: the
  scores.
- `tanstack/spike/`, `strands/spike/`, `langchain/spike/`: runnable code; each spike report ends
  with the commands that reproduce it.
- `inputs/`: the earlier research, including `agent-harness-build-vs-buy.md`.
