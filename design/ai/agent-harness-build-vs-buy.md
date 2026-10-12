# Building versus buying graphty's AI harness

A detailed bake-off of TanStack AI, Strands Agents and LangChain createAgent is in
[agent-harness-bakeoff.md](agent-harness-bakeoff.md).

Written 2026-10-09 against master. This document decides which parts of the assistant inside graphty
can come from an existing agent harness and which graphty must write. The assistant in question runs
in the reader's browser, inside graphty-element, on the reader's own model key, with no graphty
server. An outside agent driving graphty over MCP is a separate question and is not covered here.

An **agent harness** is the runtime around a language model: the loop that calls the model and runs
the tools it asks for, the conversation it carries, its memory, approvals, limits, tracing and tests.
The features a harness should have were derived from graphty's 507 use cases in
`design/ai/agent-harness-features.md`. Each feature has an **essential count**: the number of use
cases that cannot be done without it. This document weighs every feature by that count, so a
feature 100 use cases depend on matters ten times as much as one 10 depend on. Summed counts are
written "essential-weighted"; one use case is counted once for each feature it needs.

## 1. The answer

**No harness available today covers all of graphty's use cases in the browser, and none could.**
The best ones cover about three quarters of what the use cases need from a harness. The rest
splits four ways:

| Share of what the use cases need                                                                                                                                                                                                                                      | Who supplies it                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Buy.** Loop, stop conditions, streaming, structured output, multi-turn message handling, approvals, tool search, MCP client, provider-hosted web search, web fetch and code execution, in-page models, test mocks                                                   | Any strong harness; on the recommended path, the Vercel AI SDK 7 and its official add-ons                                                                  |
| **Extend.** Guardrails (untrusted content, sensitive data, egress control, harm screening, policy modes), budgets, planning and task lists, sub-agents, compaction by summary                                                                                         | graphty, as small pieces on the harness's hooks. Some frameworks ship generic versions; the graph-specific policy is graphty's either way                  |
| **Build, whatever harness is chosen.** Browser persistence for conversations, memory and resumable sessions; carrying conversation history; an in-page code sandbox; every graph tool; every product screen and policy; the file, document, voice and connector tools | graphty-element (mechanisms) and the graphty app (screens and words)                                                                                       |
| **Impossible in a browser without a service.** Work while the tab is closed, several people and sharing, inbound and outbound messaging, and a few hosted services                                                                                                    | A companion service, later. 21 of the 138 non-graph features; 210 of the 507 use cases (194 of them not speculative) need at least one of them essentially |

In numbers, over the 54 harness features and the harness-reached platform features (1,944
essential-weighted, section 2):

- **Bought** (native or an official extension): 79% for Google's ADK, 77% for LangChain and the
  OpenAI Agents SDK, 76% for Strands, 71% for the Vercel AI SDK 7, 69% for TanStack AI, 56% for
  Anthropic's tool runner, and 23% for graphty's loop as it stands.
- **Impossible in a browser for every candidate**: 8% (durable jobs, triggers, hand-off to a
  person). Five features are build work in every candidate: project memory, cross-session memory,
  resumable scripted sessions, memory isolation and learning from feedback, because no candidate
  ships browser storage.
- **Outside any harness**: the graph tools (24 features, 1,544 essential-weighted), the other
  harness-facing graphty tools (21 features, 602), the product layer (18 features, 310) and 29
  platform capabilities the agent calls as tools (762: reading the reader's files, document
  generation, exports, account connectors, vision, voice, OCR). No harness supplies these. They
  are about 60% of everything the use cases need essentially (3,218 of 5,327), and they are
  graphty's work in every option.

So the decision is about the smaller part of the work. Between the weakest candidate (graphty's
loop today) and the strongest (ADK), about 1,100 essential-weighted points move from "built" to
"bought". Between the AI SDK 7 and the strongest framework, under 200 do.

**Recommendation in one paragraph** (reasoning in section 4): keep graphty's own controller in
graphty-element, move it onto the Vercel AI SDK 7 with the next planned graphty-element major,
buy what 7 and its official add-ons provide, and build the rest as small pieces behind the
controller. Start now, on the current SDK, with the one gap that blocks the most use cases:
conversation history. Do not adopt an agent framework. The frameworks that score higher do so
mainly on guardrail and orchestration hooks whose graph-specific content graphty writes anyway,
and each costs two to three times the bytes, a different provider layer, and (for three of them)
a zod 4 migration that breaks graphty-element's public API.

## 2. The capability matrix

Rows are the 49 harness features plus the five platform features a harness reaches (web search,
web fetch, sandboxed code execution, on-device models and local-only processing), sorted by
essential count. Columns are the eight strongest candidates that load in a page:

- **Own loop, ai 5**: graphty-element's `AiController` over the Vercel AI SDK 5, as on master.
- **AI SDK 7**: the Vercel AI SDK 7 (`ai` 7 with `ToolLoopAgent`, `stopWhen`, `prepareStep`).
- **Google ADK**: Google's Agent Development Kit for TypeScript, its browser build.
- **Strands**: AWS's Strands Agents SDK for TypeScript.
- **LangChain**: LangChain's `createAgent` on LangGraph.
- **OpenAI Agents**: the OpenAI Agents SDK for JavaScript.
- **Anthropic runner**: the tool runner in Anthropic's TypeScript SDK.
- **TanStack AI**: TanStack AI with its official add-on packages.

Cells: **N** native, **E** an official extension or a provider-hosted tool, **B** graphty builds
it on a seam the candidate offers, **X** cannot be done in a page with this candidate.

Two cell rules apply to every column. A feature that must survive a page reload (the memory rows
and resumable scripted sessions) is B everywhere, because no candidate ships browser storage; the
frameworks with a memory or session interface have only in-memory implementations. A feature that
needs a service (durable jobs, triggers, hand-off to a person) is X everywhere.

An X on a candidate's own MCP client or sandbox means that candidate's version does not run in a
page; graphty could still give it an in-page sandbox or an HTTP MCP client as an ordinary tool,
which makes those cells build work in practice. Only the three service rows are truly impossible.

| Feature                                                  | Layer    | Ess. | Own loop, ai 5 | AI SDK 7 | Google ADK | Strands | LangChain | OpenAI Agents | Anthropic runner | TanStack AI |
| -------------------------------------------------------- | -------- | ---: | :------------: | :------: | :--------: | :-----: | :-------: | :-----------: | :--------------: | :---------: |
| Sandboxed code execution                                 | Platform |  181 |       B        |    E     |     E      |    X    |     X     |       E       |        E         |      E      |
| External tools and connectors                            | Harness  |  134 |       B        |    E     |     X      |    N    |     E     |       X       |        E         |      N      |
| Result verification                                      | Harness  |  134 |       N        |    N     |     N      |    N    |     N     |       N       |        N         |      N      |
| Untrusted content handling                               | Harness  |  133 |       B        |    B     |     N      |    N    |     N     |       N       |        B         |      B      |
| Approval gate                                            | Harness  |  106 |       B        |    N     |     N      |    N    |     N     |       N       |        B         |      N      |
| Stop and interrupt                                       | Harness  |  104 |       N        |    N     |     N      |    N    |     N     |       N       |        N         |      N      |
| Web fetch                                                | Platform |  100 |       B        |    E     |     E      |    E    |     E     |       E       |        E         |      E      |
| Multi-turn task conversation                             | Harness  |   81 |       B        |    N     |     N      |    N    |     N     |       N       |        N         |      N      |
| Clarifying questions                                     | Harness  |   76 |       B        |    N     |     N      |    N    |     N     |       N       |        N         |      N      |
| Durable jobs                                             | Harness  |   67 |       X        |    X     |     X      |    X    |     X     |       X       |        X         |      X      |
| Triggers                                                 | Harness  |   62 |       X        |    X     |     X      |    X    |     X     |       X       |        X         |      X      |
| Web search                                               | Platform |   59 |       B        |    E     |     E      |    E    |     E     |       E       |        E         |      E      |
| Action log and audit trail                               | Harness  |   44 |       N        |    E     |     N      |    N    |     N     |       N       |        B         |      N      |
| Project memory                                           | Harness  |   41 |       B        |    B     |     B      |    B    |     B     |       B       |        B         |      B      |
| On-device model and tool execution                       | Platform |   36 |       B        |    E     |     N      |    E    |     E     |       E       |        B         |      B      |
| Hand-off to a person                                     | Harness  |   36 |       X        |    X     |     X      |    X    |     X     |       X       |        X         |      X      |
| Sensitive data detection                                 | Harness  |   35 |       B        |    B     |     N      |    N    |     N     |       N       |        B         |      B      |
| Large-material handling                                  | Harness  |   34 |       B        |    N     |     N      |    N    |     N     |       N       |        N         |      E      |
| Cross-session user memory                                | Harness  |   34 |       B        |    B     |     B      |    B    |     B     |       B       |        B         |      B      |
| Local-only processing                                    | Platform |   32 |       B        |    E     |     N      |    E    |     E     |       E       |        B         |      B      |
| Policy and restriction modes                             | Harness  |   31 |       B        |    B     |     N      |    N    |     N     |       N       |        B         |      B      |
| Run records and show your work                           | Harness  |   29 |       N        |    E     |     N      |    N    |     N     |       N       |        B         |      N      |
| Time and date awareness                                  | Harness  |   28 |       N        |    N     |     N      |    N    |     N     |       N       |        N         |      N      |
| Budgets and limits                                       | Harness  |   25 |       B        |    B     |     N      |    B    |     N     |       N       |        B         |      B      |
| Domain knowledge packs                                   | Harness  |   24 |       B        |    E     |     N      |    E    |     E     |       B       |        E         |      E      |
| Entity and relation extraction from unstructured content | Harness  |   22 |       E        |    N     |     N      |    N    |     N     |       N       |        N         |      N      |
| Low-latency streaming responses                          | Harness  |   22 |       N        |    N     |     N      |    N    |     N     |       N       |        N         |      N      |
| Harm and misuse screening                                | Harness  |   19 |       B        |    B     |     N      |    N    |     N     |       N       |        B         |      B      |
| Scripted step-by-step sessions                           | Harness  |   18 |       B        |    B     |     B      |    B    |     B     |       B       |        B         |      B      |
| Structured questions                                     | Harness  |   17 |       B        |    N     |     N      |    N    |     N     |       N       |        B         |      N      |
| Sub-agents                                               | Harness  |   17 |       B        |    B     |     N      |    N    |     N     |       N       |        B         |      N      |
| Multilingual and translation                             | Harness  |   16 |       N        |    N     |     N      |    N    |     N     |       N       |        N         |      N      |
| Planning                                                 | Harness  |   15 |       B        |    B     |     N      |    E    |     N     |       B       |        B         |      B      |
| Hidden state keeping                                     | Harness  |   14 |       B        |    N     |     N      |    N    |     N     |       N       |        N         |      N      |
| Schema enforcement                                       | Harness  |   13 |       E        |    N     |     N      |    N    |     N     |       N       |        N         |      N      |
| Interpretation echo-back                                 | Harness  |   12 |       B        |    N     |     N      |    N    |     N     |       N       |        N         |      N      |
| Data egress control and flow ledger                      | Harness  |   12 |       B        |    B     |     N      |    N    |     N     |       N       |        B         |      B      |
| Proactive suggestions                                    | Harness  |   11 |       N        |    N     |     N      |    N    |     N     |       N       |        N         |      N      |
| Audience adaptation                                      | Harness  |   10 |       N        |    N     |     N      |    N    |     N     |       N       |        N         |      N      |
| Reusable recipes                                         | Harness  |    9 |       B        |    E     |     N      |    E    |     E     |       B       |        E         |      E      |
| Model routing and diversity                              | Harness  |    8 |       N        |    N     |     B      |    N    |     N     |       E       |        B         |      N      |
| Shared plan and task list                                | Harness  |    6 |       B        |    B     |     N      |    E    |     N     |       B       |        B         |      B      |
| Error recovery and self-repair                           | Harness  |    6 |       B        |    N     |     N      |    N    |     N     |       N       |        N         |      N      |
| Batch model pipelines                                    | Harness  |    6 |       B        |    B     |     N      |    N    |     N     |       N       |        B         |      N      |
| Rate limiting and politeness                             | Harness  |    4 |       B        |    B     |     N      |    B    |     N     |       N       |        B         |      B      |
| Critique, debate and agreement protocols                 | Harness  |    4 |       B        |    B     |     N      |    N    |     N     |       N       |        B         |      N      |
| Long-session context and transcript recall               | Harness  |    3 |       B        |    N     |     N      |    N    |     N     |       N       |        N         |      E      |
| Agent-based simulation                                   | Harness  |    3 |       B        |    B     |     N      |    N    |     N     |       N       |        B         |      N      |
| Memory isolation                                         | Harness  |    3 |       B        |    B     |     B      |    B    |     B     |       B       |        B         |      B      |
| Ephemeral sessions                                       | Harness  |    3 |       B        |    N     |     N      |    N    |     N     |       N       |        N         |      N      |
| Live work visibility                                     | Harness  |    2 |       N        |    E     |     N      |    N    |     N     |       N       |        B         |      N      |
| Learning from feedback and outcomes                      | Harness  |    1 |       B        |    B     |     B      |    B    |     B     |       B       |        B         |      B      |
| Evaluation harness                                       | Harness  |    1 |       N        |    N     |     B      |    E    |     N     |       N       |        B         |      N      |
| Incidental content scanning                              | Harness  |    1 |       B        |    B     |     N      |    N    |     N     |       N       |        B         |      B      |

**Coverage, weighted by essential count** (1,944 essential-weighted in all):

| Candidate        | Native | Bought (native + extension) | Build | Impossible in a page |
| ---------------- | -----: | --------------------------: | ----: | -------------------: |
| Google ADK       |    62% |                     **79%** |    5% |                  15% |
| LangChain        |    57% |                         77% |    5% |                  18% |
| OpenAI Agents    |    55% |                         77% |    8% |                  15% |
| Strands          |    61% |                         76% |    6% |                  18% |
| AI SDK 7         |    37% |                         71% |   21% |                   8% |
| TanStack AI      |    47% |                         69% |   23% |                   8% |
| Anthropic runner |    30% |                         56% |   35% |                   8% |
| Own loop, ai 5   |    21% |                         23% |   69% |                   8% |

How to read the gaps:

- **The frameworks' lead over the AI SDK 7 is almost all guardrails and orchestration.** The AI
  SDK 7's build column is untrusted content handling (133), sensitive data detection (35), policy
  modes (31), budgets (25), harm screening (19), sub-agents (17), planning (15), egress control
  (12) and a few small rows, plus the five persistence rows every candidate builds. A framework
  that rates N on these supplies a hook point and generic policies (PII redaction, moderation,
  call limits). What counts as untrusted in a graph, which attributes are sensitive, and which
  commands a policy blocks are graphty's to write in every case.
- **The frameworks' "impossible" share is higher than the AI SDK's** because their own MCP client
  (ADK, OpenAI Agents) or sandbox (Strands, LangChain) does not run in a page, and those two
  rows carry 134 and 181 essential use cases.
- **Provider-hosted tools count as bought, with a cost.** Web search, web fetch and code
  execution reach the page through the model provider's server-side tools on the reader's key
  (Anthropic, OpenAI and Gemini all have them). Code execution that way uploads the data to the
  provider, which conflicts with local-only processing; an in-page sandbox (Pyodide or QuickJS in
  a Worker) is build work for every candidate except TanStack AI, whose QuickJS add-on is
  documented as browser-compatible but was not run here.
- **graphty's loop today is mostly build** because it carries no history, no approvals, no MCP
  and no provider tools. Almost all of that is native in the SDK underneath it once the loop
  uses it (section 4).

## 3. The constraints that decide it

### Providers, including in-browser models

graphty offers OpenAI, Anthropic and Google on the reader's key, and an in-browser model through
WebLLM (whose five offered models cannot call tools today; issue #1681).

| Candidate        | Hosted providers                                                      | In-browser models                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Own loop, ai 5   | OpenAI, Anthropic, Google (AI SDK 5)                                  | WebLLM direct, tools broken                                                                                                                                     |
| AI SDK 7         | OpenAI, Anthropic, Google and about 40 more                           | `@browser-ai/web-llm`, `@browser-ai/core` (Chrome's built-in model), `@browser-ai/transformers-js`: maintained community providers, one maintainer, need `ai` 7 |
| Google ADK       | Gemini only; OpenAI and Anthropic need a model class graphty writes   | Chrome's built-in model, native                                                                                                                                 |
| Strands          | Bedrock, OpenAI, Anthropic, Google, any AI SDK 6 model                | Through an AI SDK 6 model adapter                                                                                                                               |
| LangChain        | OpenAI, Anthropic, Google and many more                               | Community WebLLM and Chrome models (experimental)                                                                                                               |
| OpenAI Agents    | OpenAI; others through an AI SDK adapter                              | Through the AI SDK adapter                                                                                                                                      |
| Anthropic runner | Anthropic only                                                        | None                                                                                                                                                            |
| TanStack AI      | OpenAI, Anthropic, Gemini, Mistral, Grok, OpenRouter, Bedrock, Ollama | None found                                                                                                                                                      |

The Anthropic runner cannot be graphty's general harness, and ADK would make graphty write and
maintain the OpenAI and Anthropic model classes the AI SDK already maintains. Chrome's built-in
model (desktop Chrome 138 and later, 22 GB free disk, a GPU over 4 GB or 16 GB of RAM) has no
native function calling; every provider for it emulates tool calls by prompting for JSON, one call
per turn.

### Bundle size

Measured with esbuild for the browser, minified and gzipped, for the smallest working agent (one
tool, one provider). zod is left out because graphty-element already ships it; zod 4 adds about
90 kB.

| Candidate        |                                                                        gzip kB |
| ---------------- | -----------------------------------------------------------------------------: |
| Anthropic runner |                                                                             54 |
| AI SDK 7         |              74 loop only; 120 with OpenAI; 109 with Anthropic; MCP client +29 |
| Own loop, ai 5   |                        106 loop; 152 with all three providers (zod 3 included) |
| TanStack AI      |                                                                143 with OpenAI |
| Google ADK       |                              267 (a prebundled web build; little tree-shaking) |
| Strands          | 273 with OpenAI (pulls in its MCP client and parts of the AWS SDK even unused) |
| LangChain        |       310 with Anthropic; LangSmith adds about 210 kB minified unless excluded |
| OpenAI Agents    |                                      330 with OpenAI; 388 with an AI SDK model |

With all three of graphty's providers, the AI SDK 7 is 255 kB against 152 kB on 5 (zod 3
included, `design/ai/ai-sdk-v5-vs-v7.md`). The assistant loads only when used (the `./ai` entry),
so a page that only draws a graph pays nothing; every assistant user pays the difference.

### zod 3 and zod 4

graphty-element depends on zod 3.25, and zod types appear throughout its public API (the main and
`./schema` entry points). Google ADK, Strands and the OpenAI Agents SDK declare zod 4 as a peer
dependency. Adopting any of them means moving graphty-element to zod 4, which is a breaking change
of graphty-element. The AI SDK (5 and 7), LangChain, TanStack AI and the Anthropic SDK work with
graphty's zod 3 (the AI SDK 7 was run with zod 3 schemas, including `.transform` and `.default`).

### Maintenance and license

All eight are MIT or Apache-2.0. Releases in the 90 days to 2026-10-09: the AI SDK 241 across its
5, 6 and 7 lines (5 is still patched; no end-of-support date is published); LangChain 12 to 15 per
package; TanStack AI 35, still 0.x with frequent breaking minor releases; the Anthropic SDK 28;
OpenAI Agents 16, still 0.x; Strands 13; ADK 7. Of the others surveyed, Mastra and VoltAgent fail
to load in a page (they are server frameworks), LlamaIndex.TS has had no release in 90 days, and
CopilotKit and assistant-ui are user-interface layers, not harnesses.

### Fit with graphty-element's architecture

graphty-element owns all graph functionality and is consumed by third parties directly; the
assistant lives in its lazily loaded `./ai` entry, and the graphty app only renders what the
element exposes. Four properties of the current design must survive any harness:

- **Tools are graphty's commands.** The assistant calls graphty-element's `CommandRegistry`, the
  same commands a consumer calls. Every candidate takes tools as functions with schemas, so this
  fits all of them; the commands stay the single implementation.
- **One assistant message is one undo step.** `AiController` opens a session transaction per
  message, and an undo cancels the whole message. No candidate has anything like it. Every
  framework's loop has to be wrapped so the transaction opens before its first tool call and
  closes after its last. Approvals and interrupts make this harder in every candidate, the AI
  SDK 7 included: a run paused for the reader's approval holds the transaction open across the
  reader's own actions, so the transaction rule for paused runs has to be designed.
- **Results are neutral facts.** Tool results and errors are `{ code, params }`; the app writes
  the words. A framework's own error strings and refusal messages (LangChain's human-in-the-loop
  middleware, OpenAI's guardrail tripwires) reach the reader unless graphty maps them to codes.
- **The public AI types are graphty's.** `graphty-element/api/ai.api.md` exposes `LlmProvider`,
  `MockLlmProvider` and graphty's message types, and no SDK types. That is what lets graphty swap
  what is underneath without breaking consumers; a framework whose types leak into that API
  would undo it.

### Testing and mocks

graphty already has a public `MockLlmProvider`, unit tests that mock the SDK, and a paid LLM
regression harness of about 100 cases against Google's model. The AI SDK 5 and 7 ship mock models
(`MockLanguageModelV2` and `V4`) that drive multi-step loops, streaming and approvals in tests;
LangChain, OpenAI Agents and TanStack AI ship fake models; Strands and ADK need a fake model class;
the Anthropic SDK has no mock client (a fake `fetch` works, which is how every candidate was run
here). Staying on the AI SDK keeps every existing test and the regression harness.

## 4. The options

### (a) Keep graphty's own loop and extend it on the AI SDK

graphty keeps `AiController` and its public interface and adds each missing feature itself, using
the SDK only as the model-call layer it is today.

- **Get:** the smallest bundle (106 to 152 kB), zod 3, every existing test, the undo semantics,
  no new dependency.
- **Still build:** everything in the "Own loop" column marked B (69%), including approvals, MCP,
  provider tools and the in-page model's tool calls, much of which the AI SDK already has.
- **Cost:** the most code of any option, and on `ai` 5, which the in-browser model ecosystem has
  left (`@browser-ai/web-llm` has one release for 5 and twenty for 6 and 7).
- **Risk:** graphty maintains copies of features the SDK maintains for free.

### (b) Adopt one framework

The best single framework for graphty is **LangChain's `createAgent`**. ADK scores highest (79%)
but reaches OpenAI and Anthropic only through model classes graphty would write, has no MCP client
in its browser build, and needs zod 4. Strands (76%) is the runner-up: MCP in the page, any AI SDK
model, hooks, OpenTelemetry and Cedar policies, but zod 4, 273 kB and AWS pieces even when unused.
OpenAI Agents stubs out its MCP client in the browser, sends traces to OpenAI by default, is 0.x and
needs zod 4.

- **Get from LangChain (77%):** summarization and context editing, a to-do-list planner,
  human-in-the-loop, model and tool call limits, PII redaction and moderation, tool selection and
  provider tool search, retries and fallbacks, checkpoints and interrupts, fake models for tests,
  and broad provider coverage, with graphty's zod 3.
- **Still build:** an IndexedDB checkpointer (none is official), a browser-clean MCP setup (its
  adapter's bundle reaches Node stdio code), an in-page sandbox, the undo transaction around its
  loop, mapping its strings to `{ code, params }`, and the graph-specific guardrail policies.
- **Cost:** 310 kB, more than twice the AI SDK 7 with one provider, plus LangSmith to exclude; a
  second provider layer beside or instead of the AI SDK; rewriting `AiController` internals behind
  its public interface; reworking the tests and the regression harness.
- **Risk:** graphty's assistant follows a large framework's release pace and design (LangGraph's
  graph model, middleware order); the undo and neutral-result rules fight its defaults.

### (c) Hybrid: graphty's controller on the AI SDK 7, with official add-ons

graphty keeps `AiController`, its public types and its undo semantics, moves the model layer to
the AI SDK 7 when a graphty-element major is planned anyway, and takes what 7 and its official
add-ons provide. graphty builds the rest as small pieces behind the controller, borrowing the
designs the frameworks have proven (LangChain's middleware, ADK's compactors, Strands'
conversation managers).

- **Get (71% bought):** the loop with `stopWhen` and `prepareStep`, approvals with a per-call
  policy, tool search for a large command list, structured output, pruning, streaming, the MCP
  client over HTTP (29 kB), provider-hosted web search, web fetch and code execution, the
  maintained in-browser model providers (which fix the WebLLM tool-call failure without graphty
  writing a tool-call parser), and mock models for tests.
- **Still build:** conversation history and compaction by summary, browser persistence, budgets,
  a guardrail and egress-policy hook on every model and tool call, a planning tool, sub-agents as
  tools, and an in-page sandbox.
- **Cost:** about a day of code for the version 7 move itself plus one paid regression run
  (`design/ai/ai-sdk-v5-vs-v7.md`); 48 to 102 kB more than today, depending on providers; a
  graphty-element major through the AI SDK's peer ranges, so it rides the next planned major.
- **Risk:** the in-browser model providers have one maintainer; graphty owns the orchestration
  pieces a framework would have given it.

### Recommendation

**Option (c).** The reasoning:

1. The choice moves little. The best framework buys under 200 essential-weighted points more than
   the AI SDK 7 (section 1), and most of those points are hooks whose graph-specific policies
   graphty writes anyway.
2. The costs of the frameworks are certain and large: two to three times the bytes, a second
   provider layer or graphty-written model classes, zod 4 (a breaking change) for three of them,
   and a loop that knows nothing of graphty's undo transaction or neutral results.
3. The AI SDK 7 alone has the pieces the heaviest-weighted rows need in a page: approvals (106
   essential), an MCP client that runs in a page (134), provider web tools (159) and in-browser
   models with tool calls (68). Those also fire the upgrade triggers in
   `design/ai/ai-sdk-v5-vs-v7.md` as soon as graphty starts on them.
4. The single biggest harness gap is not a framework question: conversation history is native in
   every candidate but missing from graphty's loop, and it can be fixed now on `ai` 5.

### What would change it

- **Orchestration becomes the priority.** If sub-agents, planning and multi-agent protocols move to
  the front of the roadmap, LangChain's `createAgent` (or Strands) saves more than it costs.
- **ADK gains first-party OpenAI and Anthropic models and a browser MCP client.** It would then
  lead on coverage without the provider cost, and its Chrome built-in model and WebMCP support are
  unique.
- **graphty moves to zod 4 for its own reasons.** That removes a decisive cost of ADK, Strands
  and OpenAI Agents.
- **A candidate ships a maintained browser storage backend** for sessions, checkpoints and
  memory. That removes the largest shared build item for whoever ships it.
- **TanStack AI reaches 1.0 with an in-page story.** Its add-ons (QuickJS sandbox, persistence
  adapters, compaction, memory, skills) cover more of graphty's build list than anyone's.
- **graphty decides to run a companion service.** Durable runs, triggers and the server-side
  frameworks (Mastra, the AI SDK's `WorkflowAgent`) then become available, and the comparison has
  to be redone for the service half.
- **The AI SDK stops supporting the browser, or its bundle grows past what readers accept.**

## 5. What graphty must build in any case

### The graph tools and the product

No harness supplies these, and they are most of the work.

- **Graph tools** (24 features, 1,544 essential-weighted), in graphty-element: editing (256
  essential), algorithm and layout execution (249), data import and schema design (187), style
  layers and annotation (170), graph data query (166), view and camera control (105), entity
  resolution (79), render capture (66), versions and structural diff (49), and the rest.
- **Harness-facing tool behavior** (21 features, 602), also in graphty-element, because only
  graphty's commands know these facts: uncertainty reporting (91), dry-run previews of a change
  (90), plain-language explanation from the catalog (84), grounding and citation (69), safe file
  inspection (55), element provenance (52), format detection (41), redaction (40), reference
  resolution, user activity awareness, a version-matched product knowledge pack, and cost
  estimates.
- **The product** (18 features, 310): consent, agent identity disclosure, the review queue, domain
  advisory framing, graduated friction, retention controls, the memory viewer and the settings.
  The screens and words are the graphty app's; the mechanisms they switch (an egress policy, a
  retention sweep, an approval policy) are graphty-element's, so a third-party consumer gets them
  too.
- **Platform tools** (29 features, 762): reading the reader's files (164), document generation
  (79), exports (75), outbound writes (55), account connectors (53), vision (51), voice (39), OCR
  (37), a credential vault, charts and media. These run in a page with limits (CORS, Chromium-only
  APIs, memory); graphty wires them as tools.

### Conversation history

Today every message starts a fresh conversation: `AiController.buildMessages()` sends the system
prompt and the new input and nothing else, so the assistant cannot answer a follow-up. 81 use cases
need multi-turn conversation essentially and 76 need clarifying questions, which depend on it.
Every candidate carries history natively; graphty's loop does not. The fix belongs in the
controller now, on `ai` 5: keep the message list per conversation, prune old tool results and
reasoning with the SDK's `pruneMessages`, and summarize past a token budget. One point is graphty's
alone: when the reader undoes an assistant step, the next turn's history must say so, or the model
believes its change still stands.

### Browser persistence

No candidate ships IndexedDB storage. Each offers an interface (OpenAI's `Session`, LangGraph's
checkpoint saver, ADK's session service, TanStack's run store, Strands' session manager) with an
in-memory implementation; the only IndexedDB backend found belongs to a web UI package that
stopped in May 2026. graphty-element needs one store for conversations, project and reader memory,
paused runs and resumable sessions, with a request for persistent storage (the browser may
otherwise evict it), encryption at rest for anything sensitive, per-project isolation, export with
the project file, and deletion. Memory is per browser and per device until a sync service exists.

### The 21 features that need a service

These cannot be done by a page on the reader's key with no server. 210 of the 507 use cases need
at least one of them essentially (194 of those are not marked speculative). They are later work;
none of them changes the harness choice for the in-browser assistant.

| Group                                | Features                                                                                                                                                                                                       | Use cases that need one essentially | What a minimal companion service would need                                                                                                                                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Work while the tab is closed         | Durable jobs, triggers (schedules, webhooks), notifications when the reader is away                                                                                                                            |                                 100 | A job runner that can call the model, a scheduler, a webhook endpoint, and a Web Push sender. Running a model call server-side means the service holds the reader's key or uses graphty's, which changes the bring-your-own-key trust model |
| Several people, identity and sharing | Identity and roles, per-item access policy, access-controlled sharing, concurrent editing, hand-off to a person, a shared knowledge base, a recipe marketplace, consented usage aggregation, joint computation |                                  93 | An identity provider, shared storage that filters data per person before sending it, share links with rights and expiry, and a sync relay (a CRDT such as Yjs over WebSocket, or WebRTC signaling)                                          |
| Inbound and outbound messaging       | Outbound mail and SMS, outreach with reply collection, inbound phone, text and chat channels, agent-to-agent exchange, graphty as a callable agent                                                             |                                  45 | A mail and SMS gateway holding its own secrets, a reachable form and webhook endpoint for replies, and an inbound endpoint for other agents (the last overlaps the out-of-scope outside-agent work)                                         |
| Other hosted services                | Browser automation, scaled compute, trusted timestamps, glanceable output on other surfaces                                                                                                                    |                                  48 | A hosted headless browser, a compute queue, a timestamp-authority proxy, and a sync feed for widgets                                                                                                                                        |

The groups overlap (a use case can need several). The common core is small: sign-in, encrypted
per-reader storage, a job queue, one public endpoint for webhooks and replies, and a push sender.
Whether graphty runs such a service at all, and on whose key, is a decision for later; it is
recorded here so the in-browser design leaves room for it (serializable run state, a storage
interface a remote backend can implement).

## 6. Method and sources

The features and their essential counts come from `design/ai/agent-harness-features.md` and its
map `design/ai/agent-harness-feature-map.json` (507 use cases, 162 features). Each of the 138
features outside the graph tools was then tagged with the layer that should build it (harness,
platform, graphty tools, product) and with whether it runs in a page, in a page with limits, or
only with a service. Seventeen harness candidates were then rated on 19 harness capabilities.
For the matrix, each feature was assigned to the one capability that supplies it (for example,
approval gate to approvals and interrupts, untrusted content handling to guardrails, cross-session
memory to browser storage); that assignment is a judgment, and the scores move by a few points
under reasonable alternatives. Two cells were changed from the survey's rating: the AI SDK 7's
code execution counts as an extension because provider-hosted execution works from the page, and
graphty's loop gets build for error recovery because it stops at the first failing tool. These
are the scratch analyses' outputs; they are not committed.

How each kind of claim was checked:

- **Measured.** Bundle sizes: each candidate's smallest agent bundled with esbuild
  (`--platform=browser --format=esm --minify`, gzip -9), with a plugin recording every Node
  built-in the bundle reaches. The AI SDK 5 and 7 comparison with all three providers comes from
  `design/ai/ai-sdk-v5-vs-v7.md`, measured the same way.
- **Run in a browser.** Eleven candidates were executed in headless Chromium against a fake
  provider installed as `fetch` (speaking OpenAI Chat Completions and Responses, Anthropic
  Messages and Gemini, plain and streamed). A real two-step tool loop (the model asks for a tool,
  the tool runs in the page, the model answers) completed for the AI SDK 7, Google ADK, Strands,
  LangChain with LangGraph, OpenAI Agents, the Anthropic tool runner, TanStack AI and
  pi-agent-core. Mastra and VoltAgent failed to load (Node built-ins). Ax reached the provider but
  did not register the tool. graphty's own loop ships today. Not proven by these runs: real
  provider CORS and model quality.
- **Read in the published packages.** Capabilities from each package's type declarations, export
  maps and README; license and release counts from npm metadata (90 days to 2026-10-09); zod peer
  ranges from each package.json; graphty's own behavior from `graphty-element/src/ai/` on master
  (`AiController.buildMessages()`), its public API from `graphty-element/api/ai.api.md`, and zod's
  place in its API from the other API reports.
- **Read in documentation.** Browser limits: MDN on Periodic Background Sync (Chromium,
  installed apps only), caniuse on speech recognition, Chrome's Prompt API page (requirements,
  no function calling), Anthropic's tool documentation (web search, web fetch, code execution and
  the MCP connector run on Anthropic's side), and the `anthropic-dangerous-direct-browser-access`
  header that allows browser calls with a reader's key.

See `design/ai/ai-sdk-v5-vs-v7.md` for the AI SDK upgrade itself.
