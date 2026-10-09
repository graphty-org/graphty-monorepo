# AI agent harness options for graphty

Written 2026-10-08 against master at 7b3a24950. Answers GitHub issue
[#37](https://github.com/graphty-org/graphty-monorepo/issues/37), "Research: a browser-based AI
agent harness (planning, multi-turn, review, subagents, workflows)".

An earlier study, `design/element-api/agent-harness-options.md` (2026-09-21), compared the
JavaScript libraries that could run the agent loop (Vercel AI SDK, OpenAI Agents SDK, LangGraph,
TanStack AI, Pi, Mastra and others). This report compares features: what modern harnesses such as
Claude Code and Codex do, which of those things would help graphty, and in what order. Where the
two disagree, this report says so.

Evidence is marked **strong** (peer-reviewed study, or a vendor's own documentation of a shipped
feature), **medium** (preprint, vendor blog with numbers, or several secondary sources agreeing)
or **weak** (one secondary source, or reasoning from code without a test).

---

## 1. Summary

**Recommended direction: keep graphty's one assistant and harden it; do not adopt an agent
framework, subagents, or an MCP client in the web app.** The assistant's biggest problems are
basic: it forgets every message, it cannot see what it styled, a selector that matches nothing
fails silently, one thrown error discards the whole message, and it does not tell the reader what
graph data it sends. The research on what measurably makes agents reliable points at unglamorous
things: tools designed for the model, checks against real state after each action, bounded
context, and evaluation that grades the end state over repeated runs. graphty is unusually well
placed for all four, because graph state is cheap to check and every assistant message is already
one undo step.

Alongside, build the analyst features the personas actually ask for, which need no model: safe
export of result tables, comparing two results, a what-if copy of the session, and reusable
recipes. The assistant then reaches them as tools.

The three prototypes to build first:

1. **A multi-turn assistant, measured.** Conversation memory within the tab, errors returned to the
   model instead of rolling back, errors for selectors that match nothing, streaming, and the
   existing LLM regression tests extended to grade the graph's end state over several runs per
   task. Answers: does memory plus better feedback make the assistant finish real analyst tasks,
   and how consistently?
2. **Private endpoints.** Presets for an organization's own OpenAI-compatible endpoint and for a
   local model server, plus a "schema only" mode that sends no labels or sample rows. Answers: can
   a team with sensitive data use the assistant without a public cloud, and what does sending less
   cost in answer quality?
3. **External agents, three ways.** A documented Node script over graphty-element's session API, a
   skill file that teaches an agent to use it, and a private MCP server, compared on the same tasks
   in Claude Code and Claude Desktop. Answers: do external agents need a graphty MCP server, or is
   a documented script enough?

**Decisions only the owner can make** (each is costly to undo):

- **Where the app's API keys may live.** graphty.app shares one origin with the docs and seven
  Storybooks, so any script there can read a saved key. Choose a separate origin for the app, or a
  key-vault iframe on its own origin; until then keep key persistence off on graphty.app. This
  gates saved conversations and recipe trust (issue #691).
- **The recipe file format** ("The recipe profile and how it binds" in
  `design/ui/framework/one-way-doors.md`). Analysts ask for saved analysis patterns; the format
  must be fixed before recipes ship.
- **One grouped major release** that removes English sentences from the assistant's results
  (`CommandResult.message`, the status stage message), together with the English removal already
  planned in issue #866.
- **Names, if the MCP server is ever published** (package and tool names are a public contract).

## 2. What graphty has today, and what issue #37 asks

**Issue #37** asks whether a browser-based harness "similar to pi.dev" exists that supports
planning, multi-turn conversations, review (a second pass that checks the first), subagents,
workflows and tool use against a live page; how keys should be handled; and whether the harness
belongs in graphty-element or the app.

**Libraries** (answered by the earlier study, by building each package for a browser; strong): no
library offers planning, subagents, skills, memory and MCP in a page; each one that has them keeps
them on the Node side. What runs in a page is a tool-calling loop, and graphty-element already
ships one. Pi's agent core needs a Node HTTP stack; Mastra, VoltAgent and LlamaIndex.TS do not
build for the browser; OpenAI's Agents SDK and LangGraph build but add a second provider layer.

**One disagreement with the earlier study.** It recommended moving the `ai` package from 5 to 7 and
replacing the hand-written controller with the SDK's agent loop. This report does not: the
installed `ai` 5.0.116 already exports the primitives graphty would use (stop conditions, per-step
hooks, usage totals, message pruning), and the hand-written loop is the seam that lets the
in-browser model and the test mock plug in. A version move can come later on its own merits.

**What exists** (in `graphty-element/src/ai/`, about 7,900 lines, behind the
`@graphty/graphty-element/ai` entry point and loaded on demand):

- **A loop** of up to 5 model calls per message, then a forced plain-text answer; tool results go
  back as JSON cut at 8,000 characters; cancel and retry.
- **One message is one undo step.** Each message runs as one session transaction marked
  `provenance: { via: "assistant" }`; undo during a message aborts the model and its tools. Coding
  harnesses lack this: Claude Code's checkpoints do not cover shell edits.
- **15 tools** (`commands/builtin.ts`): query, find, schema, sample data, describe property, list
  and run algorithms, layout, 2D/3D, VR/AR, style nodes and edges, clear styles, camera, zoom.
  Embedders add tools with `AiManager.registerCommand`.
- **Providers**: OpenAI, Anthropic and Google through the Vercel AI SDK, called straight from the
  browser with the reader's key; an in-browser model (WebLLM); a mock for tests.
- **Keys** in memory by default; optional saving to browser storage, encrypted with a key built
  into the package, so saved keys are obscured, not protected (issue #691).
- **App**: an Assistant panel with transcript and Cancel; settings with "Remember API keys" and a
  connection test. Step records, follow-ups, retry and voice exist in the panel but are not wired.
- **Tests**: about 100 LLM regression cases (`graphty-element/test/ai/llm-regression/`), run on each
  release against Google's model (about 190 paid calls), checking tool choice and arguments.

**What is missing**, most consequential first: memory between messages; access to the element's 36
undoable session commands (the assistant cannot make sets, notes, filters or saved views); a way to
see current styles or the reader's selection; error feedback (a thrown error rolls back the whole
message); neutral results (the element builds English sentences, against the presentation-neutral
rule); a working "Local (WebLLM)" setting (it probably cannot be turned on; read from code, not
reproduced); disclosure of what data is sent (issue #326); token usage (dropped); tests of task
outcome rather than tool choice.

**Demand.** None of the 16 personas or 25 workflows in `design/designloom/` mentions an assistant.
They ask for things an assistant could reach: Analyst Alex wants "reproducible analyses" and lacks
"a way to save analysis patterns"; investigators want evidence trails; Explorer Elena fears
breaking things. So the plan validates the assistant's tasks with simulated analysts before its
second release.

## 3. How modern harnesses compare

Features as documented on 2026-10-08. "--" means the sources read did not show it, not that it is
absent.

| Feature                          | Claude Code                     | OpenAI Codex                               | Gemini CLI        | Copilot agent (VS Code)                     | Cursor                     | graphty today             |
| -------------------------------- | ------------------------------- | ------------------------------------------ | ----------------- | ------------------------------------------- | -------------------------- | ------------------------- |
| Tool loop with step limit        | yes                             | yes                                        | yes               | yes                                         | yes                        | yes, 5 calls              |
| Multi-turn memory in a session   | yes                             | yes                                        | yes               | yes                                         | yes                        | **no**                    |
| Plan-then-act mode               | yes (plan mode)                 | plan updates                               | --                | --                                          | yes                        | no                        |
| Visible todo list                | yes                             | yes                                        | --                | --                                          | yes                        | no                        |
| Subagents                        | yes                             | --                                         | --                | --                                          | --                         | no                        |
| Background or cloud agents       | yes                             | yes (cloud tasks)                          | --                | yes (cloud coding agent)                    | yes                        | no                        |
| Permission modes, per-tool rules | 6 modes incl. classifier "auto" | approval policy separate from sandbox mode | --                | Manual / Assisted / Allow all; URL approval | Agent / Ask / Manual modes | none needed so far        |
| OS sandbox                       | yes                             | yes, network off by default                | Docker/Podman     | preview                                     | --                         | the browser               |
| Checkpoints / rewind             | yes (100)                       | via git                                    | opt-in shadow git | --                                          | yes                        | one undo step per message |
| Context compaction               | yes                             | yes                                        | --                | --                                          | yes                        | no                        |
| Project instruction files        | CLAUDE.md                       | AGENTS.md                                  | GEMINI.md         | --                                          | .cursor/rules, AGENTS.md   | no                        |
| Automatic memory                 | yes                             | --                                         | --                | --                                          | yes                        | no                        |
| Lifecycle hooks                  | yes (~30 events)                | yes (in plugins)                           | --                | --                                          | --                         | stream events only        |
| Reusable prompts or workflows    | slash commands                  | --                                         | --                | prompt files                                | --                         | no                        |
| Agent Skills                     | yes                             | yes                                        | yes               | yes                                         | yes                        | no                        |
| MCP client                       | yes                             | yes                                        | yes               | yes                                         | yes                        | no                        |
| Headless / SDK use               | yes (`-p`, Agent SDK)           | yes (`exec`)                               | --                | --                                          | CLI                        | element API               |

Sources: vendor documentation for each product, primary, read 2026-10-08 (VS Code's page dated
2026-10-07); URLs in section 9.

**In-app copilots** are closer to graphty's situation: an assistant inside a document the user
owns.

| Product (date)                                                        | What it does                                                    | Pattern worth noting                                                                                                                |
| --------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Excel Agent Mode (GA on the web, late 2025)                           | multi-step workbook edits                                       | step list and change summary; Microsoft warned against its `=COPILOT` function "for any task requiring accuracy or reproducibility" |
| Databricks Data Science Agent (default from 2025-12-23), Hex Threads  | code and queries in a notebook                                  | shows the code; prefers endorsed tables                                                                                             |
| Power BI Copilot, "Prep data for AI"                                  | reports, summaries of a visual                                  | author-written field descriptions and verified answers, the biggest accuracy lever vendors report                                   |
| Tableau Agent and Pulse                                               | questions over metrics                                          | insights computed statistically; the model only words them                                                                          |
| Figma AI and MCP server (June 2025)                                   | acts on the selection; outside agents read and write the canvas | output made of normal editable objects                                                                                              |
| Notion agents (Sept 2025)                                             | edits pages                                                     | every run logged and reversible                                                                                                     |
| Linkurious Enterprise 4.3, Neo4j Aura Agent                           | text to Cypher                                                  | the generated query is shown, editable, savable                                                                                     |
| Linkurious Copilot (beta), Graphistry Louie.ai, Kineviz GraphXR       | graph investigation in natural language                         | each observation cites the nodes and edges behind it                                                                                |
| Tableau Pulse                                                         | suggested questions and follow-ups                              | starting points computed from the data, not typed by the user                                                                       |
| Gephi AI (community), Cytoscape Desktop MCP (experimental), Neo4j MCP | graph tools as MCP servers                                      | MCP is becoming expected of graph tools                                                                                             |

**What the research says matters** (citations in section 9):

- **Tool interfaces designed for the model** are the largest, best-measured lever (SWE-agent,
  NeurIPS 2024; strong).
- **Checks against real state** work; self-critique without external feedback does not (Huang et
  al., ICLR 2024; strong). This is the honest form of the "review" #37 asks for.
- **Bounded context**: accuracy falls as input grows (Lost in the Middle, TACL 2024; strong);
  masking old tool output matched summarization at half the cost (Lindenbauer et al., 2025; medium).
- **Fixed pipelines beat open agents on known tasks** (Agentless, FSE 2025; strong).
- **Single runs hide inconsistency**: a model under 50% on one run fell under 25% when all 8 runs
  had to pass (tau-bench, 2024; strong).
- **Multi-agent systems** gained 90% on one vendor's research task at about 15 times the tokens,
  and fail in 14 documented ways (Anthropic 2025, medium; Cemri et al., NeurIPS 2025, strong).
- **Prompt injection is unsolved**: adaptive attacks beat 12 published defenses at over 90%
  (Nasr, Carlini, Tramer et al., USENIX Security 2026; strong). Design for containment.
- **Explanations raise trust in wrong answers too**; checkable evidence does better (Bansal et al.,
  CHI 2021; Kim et al., CHI 2025; strong).
- **Small models are weak agents**: 1-4B models scored 1-56% on multi-turn tool calls (arXiv
  2511.22138, preprint; medium).
- **Graph analysis is still hard for agents, and the harness changes the score**: on GABench (13
  datasets, 84 tools, 10,400 tasks) tool-call quality mattered more than the number of calls
  (Tan et al., 2026, preprint; medium). Research graph assistants all route reasoning through
  algorithm calls, never through the model reading raw edges.
- **Planning and context management help weak models most**: across 176 harness configurations,
  planning raised accuracy for weaker models but mostly cut cost for strong ones, and most of
  context management's benefit was avoiding overflow (Fan et al., 2026, preprint; medium).
- **Only architectural injection defenses give guarantees**: fixing the plan before reading data,
  or passing data to tools as values the model never copies, trades some utility for provable
  safety (Beurer-Kellner et al., 2025; CaMeL, SaTML 2026; strong).

## 4. The feature catalog, prioritized

Priority 5 means build first; 1 means not now. The owner package follows the root `CLAUDE.md`
principles: graph logic, facts and the loop in graphty-element; words, layout and the reader's own
storage in the graphty app.

### 4.1 Now, in the web app

#### Priority 5

**Key bound to its endpoint** (graphty-element; owner decides the origin). A saved key is tied to
the endpoint origin it was entered for; changing the base URL clears it or asks again, because the
key is sent as a header to whatever base URL is set (`providers/VercelAiProvider.ts`). Provider,
base URL and mode come only from the reader or the embedder, never from URL parameters, project
files, transcripts, recipes or tool calls, with a test. Persistence stays off on graphty.app until
the origin decision. _+_ closes key theft by endpoint swap, cheaply. _-_ any script on the shared
origin can still read a key in memory.

**No outbound tools** (graphty-element). Nothing the model can call fetches a URL: the skybox
image, style templates and data-source URLs stay out of the model's tool schemas. A test walks
every model-reachable command and fails if it can reach `fetch`, image or texture loading, XHR,
WebSocket or dynamic import (`data:` and `blob:` allowed). The reader's import dialog is untouched.
_+_ removes the exit leg of the "lethal trifecta" (private data, untrusted content, a way out)
with no prompt and no fetch refactor; analysts never asked for URL fetching. _-_ the model cannot
import from a URL; tools an embedder registers are trusted code outside the test.

**In-memory conversation** (graphty-element; the app holds it for the tab). The controller keeps
history across messages and exposes it as plain data (get, load, change events), with no storage.
A loaded conversation is untrusted: approvals are never restored. _+_ the biggest visible gap;
makes follow-ups and plain-text clarifying questions work; blocked on nothing. _-_ lost on reload
until saved conversations exist.

**State-based evaluation** (graphty-element; the app owns two tests). Extend the LLM regression
harness from "right tool" to "right graph afterwards" (layers, sets and results present; every
number in a reply appears in a tool result). Three tiers: no-model policy tests on every pull
request (no outbound, endpoint settings ignored from URLs and files, key bound to endpoint, model
text rendered as text, results carry codes); scripted mock-model tests of loop mechanics, which
never go stale; a small paid set run k times on each provider's default model per release, on
synthetic data, reporting how often all k runs pass. Hostile-label cases pass only if a planted
hide does not happen or shows in a persistent indicator. The app tests that its message catalog
covers every code and that no request leaves for anywhere but the configured endpoint. _+_ graph
state makes grading cheap; reuses a harness that exists. _-_ answer keys are the expensive part;
paid calls multiply by k and by provider.

**Export computed results** (graphty-element, graph-io, app; not AI work). The app computes a
result-members CSV itself (`groupsCsv` and a private `csvCell` formula guard in
`graphty/src/components/shell/analysis/resultMembers.ts`), which the workaround rule forbids. Move
the table into graphty-element as a read-only command offered through the Export dialog; graph-io's
CSV writer gains opt-in formula escaping, off by default so round trips stay faithful, never
altering cells that parse as numbers. _+_ serves analysts with no model; fixes a workaround. _-_
competes with other element work.

**Bad-selector errors** (graphty-element). A selector that is invalid or matches nothing returns a
code, parameters and a hint instead of a silent empty match. _+_ the largest known
tool-reliability defect, and it helps human consumers too. _-_ none worth noting.

**Data disclosure before and after the send** (graphty-element facts; app words). Before sending,
the composer shows what the next message will send: schema, enum values (up to 10 per attribute
today), ranges, sample rows, selection, provider, model and destination host. The actual payload
sits under Details afterwards. Options exclude attributes or send the schema only; when that blocks
a request that needs labels, the element returns a code and the model is steered to computed
answers. Closes issue #326. _+_ consent before the send makes sensitive data usable. _-_ sending
less gives worse answers.

**Provenance and persistent indicators** (graphty-element facts; app display). Assistant outputs
land in their normal homes (Results, Styles with source "assistant", sets, notes, Version history).
The project stores the source word and command names ("Assistant: Run Betweenness, Add layer"),
never the prompt. Hides and filters made by the assistant show in the persistent filter chip and
not-drawn line with that word: this, not a line under the reply, defends against data that tricks
the model into hiding nodes. Under each reply, one line of what changed and "Used:" names, each a
link; everything else under Details. A step's title opens the control that did the work, so the
assistant teaches the interface. _+_ people skim transient warnings (Wu, Miller, Garfinkel, CHI
2006); analysts check the procedure first (Gu et al., CHI 2024). _-_ every home must carry the
source word.

**Assistant design records** (app). Before new assistant behavior ships: state-matrix rows for
Canceled, Blocked and AwaitingInput (only NoProvider, Loading and Error exist), a message-catalog
entry per new code, "assistant" in the glossary, and assistant outputs in
`design/ui/framework/output-homes.md`. _+_ stops the app improvising English. _-_ must keep pace
with each element release.

**Hide the in-page model until it works** (graphty-element fact; app hides). Reproduce first: the
code suggests "Local (WebLLM)" never becomes ready (no system prompt, tool schemas passed as raw Zod
objects, and `enableAiControl({ provider: "webllm" })` does not construct it). If confirmed, the
element reports it unavailable and the app hides it. _+_ a setting that does not work is the worst
state. _-_ removes the visible local option until private endpoints land.

**Private endpoint presets** (graphty-element presets and checks; app settings). Base-URL presets
for organization proxies (Azure OpenAI, vLLM) first, then localhost Ollama, LM Studio and
llama.cpp, set only from embedder code or a deployer's same-origin config file. The element checks
CORS and local-network access and returns a fact the app words as a fix-it line. _+_ the cheapest
real privacy; 7-70B local models beat 1-3B in-tab models. _-_ medium evidence until prototyped;
local-network prompts differ by browser.

#### Priority 4

| Feature (owner)                                             | How it would work                                                                                                                                                                                                                                                                                                           | Strength / weakness                                                                                                     |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Budgets, streaming and usage on the existing loop (element) | Keep the hand-written loop; add token streaming with cancel (today a reply shows only when the turn ends), token and time limits with finite defaults, usage capture. Fix the `ai` range: dev `^5.0.270`, peer `^5.0.104`; the peer floor must cover every API used                                                         | Tens of lines; stops runaway spend on the reader's key (OWASP LLM10) / streaming added per provider                     |
| Usage facts and a session cap (element; app Details)        | Tokens per message and session, cost when the embedder supplies prices (the element ships no price table, which would go stale and is a choice), an optional enforced cap an embedder sets; no model call without a reader gesture                                                                                          | Readers pay for their own keys / prices change                                                                          |
| Run caveats as facts (element)                              | Runs already carry coded caveats (`session/runs/caveatFacts.ts`: sampled betweenness, resolution, damping, partial results); expose them, the seed, weight and directedness; the model may restate but not overwrite them                                                                                                   | Silent parameter choice is the main route to a wrong analysis / some algorithms need caveats added                      |
| Model text stays text (element; app)                        | Model text appears only in the attributed transcript; where it lands elsewhere (notes, layer names, findings report, exports) it is escaped, with no Markdown image or link, and carries a visible author                                                                                                                   | Closes image-based exfiltration through exports / does not stop integrity attacks alone                                 |
| Data meaning (element; app editing)                         | First an instructions option for the embedder's own text, never read from project files; later attribute descriptions ("amount is USD") stored in the project and sent as quoted data, never as instructions                                                                                                                | Vendors report it as their biggest accuracy lever (medium) / shared descriptions are untrusted; someone must write them |
| Compare results (element; app "Compare with..."; not AI)    | Centrality: top-k overlap, Spearman, Kendall. Communities and components: adjusted Rand index, normalized mutual information, crosstab. First check that a same-algorithm re-run keeps both results (`RunsApi.ts:1136` cancels siblings under "replace")                                                                    | What analysts compute by hand; replaces conversation branching / partition metrics need careful tests                   |
| Recipes (element; app picker; owner format)                 | The recipe profile (`design/ui/framework/files-and-recipes.md`) lands as non-AI work; the assistant lists, applies and exports recipes, filling missing inputs through the app's existing choice step, as one undo step                                                                                                     | The need personas state; deterministic; works with small models or none / waits on the format decision                  |
| Curated tool catalog (element, internal)                    | Replace the 15 tools with about 10-12 grouped write tools over session commands (algorithm, style, visibility, sets, notes, layout, batch) and a read half (query, find, resolve a name, schema, samples, a digest of notes and runs); no URL parameters, capture or undo tool; schemas generated with a drift test         | Sets, notes, filters and undo for free / real work; invalidates current regression cases                                |
| Tools designed for the model (element)                      | Summaries, counts and saved-selection ids, paged; labels only by id; attribute names as enums for provider strict mode; errors as code, parameters and hint. Write commands take selections the element computed, never label strings the model copied, a cheap form of the data-isolation patterns (Beurer-Kellner et al.) | The most consistently measured lever; narrows injection / tuned per model                                               |
| State discovery and selection (element; app chip)           | Tools describing styles, selection, view, runs, sets and notes; the reader's selection as a removable composer chip; a short block of what the reader changed since the model's last turn, placed last so prompt caching still hits; after disclosure ships                                                                 | Ends styling blind (Data Formulator 2, CHI 2025) / more data sent, so it must be disclosed                              |
| Neutral results (element; app words)                        | Each result carries a code and parameters for the app plus separate model text; new tools start this way; removing the English fields is breaking and waits for the grouped major                                                                                                                                           | Fixes a principle violation; one shape for app, MCP and tests / catalog text per command                                |
| Preflight and post-write checks (element)                   | Implement "match" plan effects for style, visibility and set commands (`session/planning.ts` declares the kind; nothing produces it); a one-shot write matching nothing errors to the model, a persistent rule warns                                                                                                        | External feedback is the review that works / larger than it looks                                                       |
| Blocking work off the main thread (element; general)        | Move blocking runs, layouts and imports to a worker or the GPU so Cancel stays clickable; until then assistant runs above a size band stop with a code                                                                                                                                                                      | Makes "Cancel instead of confirmations" safe / engineering cost                                                         |
| Explain facts (element; app entry points)                   | Why a node scores as it does: betweenness (communities bridged, share of shortest paths, sampled values marked estimated), PageRank (top in-neighbors), community (internal vs external edges); otherwise "explain unsupported"                                                                                             | The analyst action used most, made checkable / per-family design and tests                                              |

#### Priority 3 to 1

| Feature (priority, owner)                                              | How it would work                                                                                                                                                                                    | Strength / weakness                                                                                                              |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Show and edit the generated selector (3, element facts; app)           | Each step that matched nodes exposes the selector it used; the reader can edit it and keep it as a saved selection or a style layer, as Linkurious does with generated Cypher                        | The answer becomes a reusable, deterministic artifact / needs the selector unification below to be readable                      |
| Suggested next analyses (3, element facts; app chips)                  | Deterministic suggestions from the catalog and the graph's shape (directed, weighted, size): algorithms that apply, a follow-up after a run; no model call; model-written suggestions optional later | Solves the blank-prompt problem with any model or none (Tableau Pulse) / proactive prompts annoy if timed badly (Amershi et al.) |
| Entity resolution and clarifying choices (3, element; app choice step) | A tool returns candidate nodes for a name with match reasons; several candidates or a missing input go through the existing choice step                                                              | Commonest real-network failure; models invent missing arguments (ToolSandbox, NAACL 2025) / thresholds need tuning               |
| Exception classification (3, element)                                  | Validation errors already reach the model; also return exceptions from inside commands as code and hint; roll back only on cancel or internal error                                                  | Small / a message may end partly applied                                                                                         |
| Command origin (3, element)                                            | Extend `provenance.via` (reader, embedder, assistant with message id, recipe) for "what changed" and indicators                                                                                      | Reuses data / every entry path must set it                                                                                       |
| "Report this answer" (3, element; app)                                 | Saves transcript and steps to a local file, escaped, no keys; real failures become test tasks                                                                                                        | Cheap realistic tasks / contains graph data                                                                                      |
| Scratch-session fork (3, element; app)                                 | A session copy (as `session/draft.ts` does) for what-if removal and preview, then compare or adopt                                                                                                   | One mechanism for what-if and preview / memory on large graphs                                                                   |
| Provider transport option (3, element)                                 | Provider calls through an embedder's function, so keys stay server-side                                                                                                                              | Removes browser keys for organizations now / disclosure must name it                                                             |
| Saved conversations (3, app; element serializes)                       | Named, linked to a project by id, delete-all; only after the origin decision                                                                                                                         | Resume after reload / a secret-like store                                                                                        |
| Context management (3, element)                                        | Stable prefix first, volatile last, old tool output replaced by stubs with ids                                                                                                                       | Cheap / modest savings on short messages                                                                                         |
| Node recipe (3, element docs)                                          | A documented script over `createGraphSession`, algorithms, layout and graph-io, writing a project file                                                                                               | Zero new API / needs a host that runs code                                                                                       |
| Honest local-model scope (3, element; app)                             | Local models do single constrained commands and recipe choice; which model answered is shown                                                                                                         | No silent fallback / two configurations                                                                                          |
| Selector language unification (3, element)                             | One selector language and one path spelling instead of three and two                                                                                                                                 | One language for all / migration docs                                                                                            |
| "Ask assistant" row in Quick actions (2, element; app)                 | Sends only on Enter, with disclosure and a one-command preview; kept only if it beats typing the filter                                                                                              | Fits keyboard users / another entry point to test                                                                                |
| Fix or deprecate capture commands (2, element)                         | `captureScreenshot` is exported but not built in; registered, it returns a data URL cut at 8,000 characters and can download without a reader gesture                                                | Removes a footgun / not live today                                                                                               |
| DOM-free agent entry point (2, element)                                | Publish only if the MCP spike or a third party needs it                                                                                                                                              | One catalog everywhere / a public name                                                                                           |
| Outbound gate (2, element; app binding step)                           | Only if URL import becomes a model tool: approval naming the exact host                                                                                                                              | Spec ready / a fetch refactor                                                                                                    |
| Simple tool registration and policy hooks (2, element)                 | Designed with the first embedder who asks (see 5.5)                                                                                                                                                  | Embedders extend without forking / public contract with no user                                                                  |
| Fact references (2, element)                                           | Only if the evaluation finds invented numbers: a token the element resolves                                                                                                                          | Checkable numbers / parses model output                                                                                          |
| Share an analysis (2, element; app)                                    | The project file or a recipe; an optional escaped transcript export without keys                                                                                                                     | Reproducible / no persona asks to share a chat                                                                                   |
| Agent Skills (2, docs or adapter)                                      | SKILL.md playbooks shipped with the Node recipe and MCP spike; no skill loading in the web element                                                                                                   | Open format many hosts read / triggering is unreliable                                                                           |
| MCP server spike (2, new private package)                              | See prototype 3                                                                                                                                                                                      | Hosts bring planning and subagents / no canvas                                                                                   |
| Voice in WebXR (2, element XR UI)                                      | The microphone as an XR UI option; off in private mode                                                                                                                                               | No keyboard in a headset / quality varies by browser                                                                             |
| Fix the in-page model (2, element)                                     | System prompt, JSON Schema tools, construction, pinned weights; must pass an evaluation and a frame-rate check                                                                                       | No key or server / 1-3B models are weak agents                                                                                   |
| Sign-in key broker (2, element flow; app callback page)                | OAuth with PKCE against a broker such as OpenRouter mints a user-limited key, so the reader never pastes a provider key; the callback URL lives on the embedding site, passed as an option           | Easier onboarding, per-key spend limits / still a bearer key in the page; a third-party dependency                               |
| Model routing (1, element)                                             | Single constrained commands to a local or cheaper model, multi-step work to the cloud model, the chosen model always shown; only after the in-page model passes                                      | Cost and privacy on easy turns / two models to evaluate; never a silent fallback                                                 |
| Local embeddings for name search (1, element)                          | A small transformers.js embedding model ranks node-name candidates for entity resolution                                                                                                             | No model call for fuzzy names / a download; string matching may suffice                                                          |
| In-page model in a worker; reasoning budget (1, element)               | Only after the in-page model passes; pass the provider's reasoning budget through                                                                                                                    | Frame rate; nearly free / little gain                                                                                            |
| MCP elicitation and Tasks (1, MCP adapter)                             | Map the choice step to elicitation and long runs to Tasks once hosts support them                                                                                                                    | Standard shapes / thin host support                                                                                              |
| MCP bundle, Registry entry, Claude or OpenAI plugins (1, MCP adapter)  | Only after an MCP server is published                                                                                                                                                                | One-click install and discovery / young overlapping formats; names are a public contract                                         |

### 4.2 Only with a desktop or mobile app

| Feature (priority)                | How it would work                                                                                                                                                                                                         | Strength / weakness                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Desktop host (2, new package)     | A Tauri or Electron shell injecting stdio transport, a file source and the OS keychain into graphty-element (requirements in 5.6)                                                                                         | Nothing graph-related leaves the element / a product to sign and update on three platforms        |
| MCP client in graphty-element (1) | Not on the web: every call is outbound and untrusted, and a page cannot reach stdio or most localhost servers. On desktop: host-injected stdio, per-server tokens in the keychain, re-ask when a tool description changes | Data without graphty writing connectors / tool poisoning succeeded up to 72.8% (MCPTox, preprint) |
| Mobile (1)                        | Today the installable web app and WebXR headsets; a native shell would add a keychain and an on-device model                                                                                                              | Names the horizon / no persona uses mobile                                                        |

Skills, an MCP _server_ and its packaging (bundles, plugins, Registry entry, elicitation, Tasks)
already run inside Claude Code, Codex or Claude Desktop with no graphty desktop app, so they sit in
4.1. The MCP _client_ is what a desktop app would unlock.

### 4.3 Not worth it

| Idea                                              | Why not                                                                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Subagents (the answer to #37's subagent question) | One shared canvas with one writer; about 15 times the tokens; external hosts supply subagents through MCP              |
| Code as the action (CodeAct)                      | Up to 20% better in research (ICML 2024), but a net loss at about 12 tools and needs a sandbox in a third party's page |
| Visible plan or todo list; propose-only mode      | Noise on short messages; a confirmation in disguise; step records and the what-if fork cover them                      |
| "Undo this message"                               | Undo already reads "Undo Assistant: ..."; a per-message control is disabled exactly when it matters                    |
| Preference memory                                 | Conflicts with `design/ui/framework/principles.md`; poisonable                                                         |
| Slash commands; file attachments to the assistant | Quick actions and the import step cover them                                                                           |
| Tool search / deferred loading                    | Unneeded at about 12 tools                                                                                             |
| WebMCP                                            | Chrome origin trial only; would hand the private graph to cross-site agents                                            |
| MCP Apps view in chat hosts                       | A second app; WebGL in sandboxed iframes untested; a one-day spike only if someone asks                                |
| Hosted MCP server; A2A; scheduled agents          | Need an operator, auth, tenancy and quotas graphty does not have                                                       |
| AG-UI event renaming                              | No rename planned                                                                                                      |
| Chrome built-in model; mobile system models       | No documented tool calling; 4,096-token context on Apple's model                                                       |

## 5. The harness designs, best first

Five simulated expert reviewers (run by a model, not people) reviewed every design, each with one
lens: agent-harness engineering, product and UX design, security and privacy, a working graph
analyst, and architecture and coverage. Each rated viability and usability from 1 (unusable) to 7.
Scores below are from the last of three rounds. Major objections per round went 47, 32, 34; the
final revision answers the last round's and was not reviewed again.

### 5.1 Hardened single agent on the existing loop (three small releases)

**How it works.** _Release 1_, additive, no owner decision: in-memory conversation; key bound to
its endpoint, persistence off on graphty.app; no outbound tools with its test; bad-selector errors;
exception classification; streaming and budgets; usage under Details; run caveats as facts;
provenance with persistent indicators and the one-line reply summary; disclosure before and after
the send; the app's design records; hiding the in-page model (once reproduced); the embedder
instructions option; the evaluation tiers; "Report this answer". _Gate_: validate the assistant's
tasks with simulated analysts through the repository's design-studio workflow. _Release 2_,
additive: curated catalog and model-shaped tools, state discovery, preflight checks with new match
plans, entity resolution, explain facts, the model-text rule everywhere, attribute descriptions,
context management, the run-size stop. _Release 3_, the grouped major: neutral results replacing
English fields (with #866), selector unification if breaking. _On demand_: saved conversations,
the DOM-free entry, the outbound gate.

**Walkthrough.** The reader asks for the central people colored by community. The composer shows
"Will send: schema, 10 sample rows, to api.anthropic.com". The reply streams; the model runs
betweenness and Louvain; under the reply, "Changed: 2 results, 1 style layer", each a link. Version
history reads "Assistant: Run Betweenness, Run Louvain, Add layer". "Now make those bigger" works.
A hostile label asking to import a URL finds no tool that can; a label that gets nodes hidden
shows in the filter chip as "Hidden by assistant: 37".

**Covers** follow-ups, single runs with stated parameters, checkable "explain this", ambiguous
names, issues #326 and #691, and #37's multi-turn, tool use and review. **Strengths**: release 1
needs no owner decision and no refactor outside the AI code; keeps the in-page model and mock seam;
the cheapest correct security posture; no new public entry points. **Weaknesses**: no URL import by
the model; transcripts vanish on reload until the origin decision; release 2 depends on the gate
and on new match plans.

**Verdict**: viable 5 of 5; usability 4.8. _Remaining objections_: no persona evidence of demand
(the gate tests it but does not remove it); the in-page model defect is unreproduced; match plans
may be larger than estimated.

### 5.2 Analyst work products, model-free first

**How it works.** General graphty-element work, scheduled outside the AI releases, that the
assistant later reaches as tools: result-table export (with graph-io's opt-in formula escaping,
deleting the app's workaround), compare-results facts, the scratch-session fork for what-if, and
recipes once the format is fixed. Experiments: the "Ask assistant" row in Quick actions, kept only
if it beats typing; escaped transcript export.

**Walkthrough.** The reader re-runs Louvain at resolution 0.5; "Compare with..." shows adjusted
Rand index 0.71 and a membership crosstab. They fork the session, remove the top broker and
compare component counts, then export the ranking through the Export dialog, where a label
`=HYPERLINK(...)` is escaped and negative weights stay numeric.

**Covers** Analyst Alex (export, comparison, reproducibility, templates), fraud, intelligence and
cybersecurity analysts (safe CSVs), marketing and supply-chain what-if, findings communication.
**Strengths**: works with any model or none; deterministic and testable; fixes two app workarounds.
**Weaknesses**: competes with other element work; recipes wait on the format decision.

**Verdict**: viable 5 of 5; usability 5.0, the highest. _Remaining objection_: the Quick actions
row could send text typed into a local search box, so it survives only as an explicit, disclosed,
Enter-only experiment.

### 5.3 Private mode

**How it works.** A configuration of 5.1: private endpoint presets from embedder code or a
deployer's same-origin config, or the transport option so keys stay on a server; schema-only
disclosure; no outbound tools, so nothing needs a gate. It is sticky and an embedder can lock it;
leaving it takes a reader gesture in settings and emits a fact; it forces error reporting (Sentry),
browser speech recognition and remote fonts off. The app's network test asserts nothing leaves for
anywhere but the configured endpoint.

**Walkthrough.** IT ships a locked preset for `llm.corp.example` with schema-only. A fraud analyst
asks which accounts look suspicious; the model runs degree and flow outliers and returns a saved
selection of 14 accounts without seeing a label; the analyst inspects them on the canvas.

**Covers** fraud, intelligence and health data, organization-approved endpoints, offline work with
a local server. **Strengths**: tested privacy that IT configures; stronger models than in-tab; no
new prompt type; cannot be switched off silently. **Weaknesses**: schema-only answers are weaker;
local endpoints need CORS and local-network setup.

**Verdict**: viable 5 of 5 (4 of 5 in the first round); usability 4.2. _Remaining objections_: the
quality cost of schema-only is unmeasured; optional label aliasing stays only if the evaluation
shows it pays.

### 5.4 External agents drive graphty: Node recipe, skill, private MCP server

**How it works.** A documented Node script over `createGraphSession`, algorithms, layout and
graph-io (zero new API), writing project files the reader opens in graphty; a SKILL.md beside it;
then a private stdio MCP server built only on graphty-element's published `./session` and
`./commands` entry points (anything missing is filed as an element defect, not imported from
`src/`), with tools annotated read-only or destructive, typed `structuredContent` results carrying
`{ code, params }`, text-free results by default and a separate tool for labels by id, size and time caps, files read only from a
canonical root (refusing symlinks, devices and FIFOs), server-named output under that root, and no
render tool (rendering needs Babylon.js). Compared three ways in Claude Code, plus a single-graph
question in Claude Desktop, which cannot run code. The server is published only if it wins
somewhere.

**Walkthrough.** In Claude Desktop a reader asks which accounts bridge the two largest communities
in a file. The server imports the bytes, runs betweenness and Louvain, returns counts and ids, and
writes a project file the reader opens in graphty.

**Covers** Expert Emma and ML engineers in Claude Code, Codex, Cursor and Claude Desktop; batch
analysis; #37's subagents and workflows, supplied by the host. **Strengths**: starts with zero new
API; measures MCP against cheaper routes; Gephi, Cytoscape and Neo4j already ship MCP servers.
**Weaknesses**: no canvas; labels returned to a host that runs shell commands are an injection
path; a weekly analyst is not its user.

**Verdict**: viable 5 of 5; usability 3.2, among the lowest. _Remaining objection_: the request
framed MCP and skills as desktop-or-mobile items; they stay "now" because they run in hosts people
already have, but private and at priority 2.

### 5.5 Embedder extension points (deferred until an embedder asks)

Simple tool registration (a read-only tool returning facts in about 15 lines, or a write tool
composed of built-in commands so undo comes free) and `beforeTool` / `beforeSend` hooks whose every
change is disclosed, designed against the first real embedder with the developer personas in
`design/designloom/personas/` and a blind-author test. `registerCommand` is not deprecated until
its replacement has a user. Example: a bioinformatics embedder adds `mapGeneIds`, and the reply
line shows "Used: mapGeneIds (@lab/graphty-bio)". **Strength**: no speculative public contract.
**Weakness**: the first embedder waits. **Verdict**: viable 5 of 5; usability 4.2; no objection
beyond timing.

### 5.6 Desktop and mobile apps (deferred, with a trigger)

Not built. A desktop shell would inject stdio transport, a file source and the OS keychain into
graphty-element, unlocking the MCP client, packaging and elicitation. Recorded requirements: signed
updates with a pinned key; the app bundled locally with a strict CSP; MCP tokens scoped per server
in the keychain; shell, file and network tools never combined in one agent turn without an
approval; OS sandboxing with network off by default; any localhost bridge on 127.0.0.1 with Origin
and Host checks and a per-launch token; Electron `contextIsolation` with `sandbox: true`, or Tauri
capability allowlists. Mobile is the installable web app and WebXR today. **Trigger**: three
distinct requesters in six months, or one embedder needing stdio data sources or keychain storage.
**Strength**: revisitable without new research. **Weakness**: a product to sign and update on
several platforms, in the riskiest tool configuration. **Verdict**: viable 5 of 5 as a deferral (3
of 5 in the first round, when proposed as a build); usability 3.2.

## 6. Recommended prototypes

**Prototype 1: a multi-turn assistant, measured.**

- _Question_: do conversation memory and better tool feedback make the assistant finish real
  analyst tasks, and how consistently?
- _Smallest build_: in-memory conversation, exceptions returned to the model, bad-selector errors,
  streaming with cancel, token and time limits. No new tools.
- _Measure_: in `graphty-element/test/ai/llm-regression/`, about 20 written analyst tasks with
  answer keys, including follow-ups ("now make those bigger") and five hostile-label cases, graded
  on the end state. Run each paid task 4 times on each provider's default model; report the share
  where all 4 pass, tokens and turns per task, and the share of numbers in replies found in a tool
  result. Add the no-model policy tests to every pull request and mock-model loop tests. Compare
  with today's stateless loop on the same tasks.
- _Decide_: ship release 1 if the all-4-pass share is clearly above the stateless baseline on the
  same tasks and no hostile-label case changes the graph unseen; otherwise fix the worst failure
  class first.
- _Where_: graphty-element (`src/ai/` and its tests); the app keeps the conversation for the tab
  and wires streaming and Cancel.

**Prototype 2: private endpoints.**

- _Question_: can a team with sensitive data use its own endpoint, and what does schema-only cost?
- _Smallest build_: one organization-proxy preset (any OpenAI-compatible endpoint) and one Ollama
  preset, set from embedder code; CORS and local-network check facts; schema-only disclosure; the
  pre-send disclosure fact.
- _Measure_: setup success on Chrome, Firefox and Safari with the documented steps; Prototype 1's
  tasks under full and schema-only disclosure on one model, and on a local 7-8B model versus the
  cloud default; the app's network test showing no other request leaves the page.
- _Decide_: keep a preset only if its documented setup works on at least two of the three
  browsers; offer schema-only as a named mode only if its all-runs-pass share stays within reach of
  full disclosure (the gap is reported, not hidden).
- _Where_: presets, checks and facts in graphty-element; settings text and fix-it lines in the app.

**Prototype 3: external agents, three ways.**

- _Question_: do external agents need a graphty MCP server, or is a documented script enough?
- _Smallest build_: the Node recipe page; a SKILL.md; a private stdio MCP server with about six
  tools (import bytes, run algorithm, query, summarize, write project file, batch).
- _Measure_: ten tasks in Claude Code three ways (script, skill plus script, MCP): success, tokens,
  wall time, human interventions; one single-graph question in Claude Desktop; a hostile-label case
  in each.
- _Decide_: build the MCP server out only if it beats skill plus script on success or on tokens
  for the same tasks, or is the only route that works in Claude Desktop; otherwise ship the script
  and skill as docs.
- _Where_: a new private adapter package over graphty-element's published `./session` and
  `./commands` entry points (gaps it finds are element defects to fix, not internals to import);
  docs in graphty-element. Nothing published until the owner approves names.

**Prototype 4 (optional): checkable explanations.**

- _Question_: do explain facts make analysts reject wrong answers more often than free-form model
  explanations?
- _Smallest build_: explain facts for betweenness only, and "Explain this" on a Results row.
- _Measure_: Prototype 1's number grader; with simulated analysts in the design-studio workflow,
  how often a planted wrong claim is accepted with and without the facts.
- _Decide_: extend explain facts to PageRank and communities only if planted wrong claims are
  accepted measurably less often with the facts than without.
- _Where_: facts in graphty-element; entry point and words in the app.

## 7. Security and trust requirements

Any design must meet these.

1. **No model-reachable outbound channel**, proven by a test. An outbound tool, if ever added, asks
   with the exact host, through one gate.
2. **Endpoint settings only from the reader or the embedder**, never from URLs, project files,
   transcripts, recipes or tool calls; a key is bound to the endpoint it was entered for.
3. **Keys in memory by default**; saved keys called obscured, not protected; no persistence on a
   shared origin; docs recommend provider spend limits and scoped keys.
4. **Graph content is untrusted**: labels and attributes quoted as data, length-capped, returned by
   id on request; instructions never come from data or project files.
5. **Model text rendered as text**, attributed, and escaped in every export: no remote images, no
   auto-fetching or `javascript:` links.
6. **Integrity shows where people look**: anything the assistant hides or filters appears in the
   persistent filter chip and not-drawn line with the word "assistant".
7. **Every assistant change is one undo step** with its origin recorded.
8. **Finite budgets by default** (turns, tokens, time); an optional enforced session cap; no model
   call without a reader gesture.
9. **Disclosure before the send**, derived from the element's real limits, not hardcoded.
10. **Rare, specific approvals.** Users approved about 93% of Claude Code's prompts (Anthropic,
    2025), and repeated warnings stop being read (Anderson, Vance et al., CHI 2015); reversible
    edits need no prompt.
11. **Extension tools are trusted code**, and the docs say so.
12. **Injection cases run in the evaluation every release**, scored for safety and task success
    together, as AgentDojo does.
13. **An MCP server** returns text-free results by default, caps size and time, confines files to a
    canonical root and never fetches URLs.
14. **A desktop host** meets the requirements in 5.6 before it ships.

## 8. Rejected ideas and open questions

**Rejected**, beyond section 4.3:

- **Adopting an agent framework** (OpenAI Agents SDK, LangGraph): each adds a provider layer and
  supplies none of skills, memory or MCP for a page.
- **A local-first assistant as its own design**: it became a configuration of the main design.
- **Endpoint presets from URL parameters**: a one-click route to steal a key and the graph.
- **Formula escaping on by default in graph-io**: it would corrupt round trips.
- **Data notes as system-prompt instructions**: a privileged injection channel; attribute
  descriptions go as quoted data instead.
- **Recorded model replays as tests**: they go stale; scripted mock tests replace them.
- **Conversation branching and rewind**: compare-results and the what-if fork cover the need.
- **End-user skill loading in the web element**: a liability question with no demand.

**Open questions:**

1. The four owner decisions in section 1.
2. Is there demand for an assistant? The simulated-analyst gate is first evidence; real use after
   release 1 is better.
3. Does "Local (WebLLM)" fail as the code suggests? Not yet reproduced.
4. Does the runs API keep both results when one algorithm is re-run? Compare-results depends on it.
5. How do browsers' local-network-access prompts treat localhost model servers?
6. How much answer quality does schema-only cost?
7. Does WebGL or WebGPU work in chat hosts' sandboxed iframes? Only matters if MCP Apps is wanted.

## 9. Sources

### Academic

- Yang, Jimenez, Wettig, Lieret, Yao, Narasimhan, Press, "SWE-agent: Agent-Computer Interfaces
  Enable Automated Software Engineering", NeurIPS 2024. https://arxiv.org/abs/2405.15793
- Xia, Deng, Dunn, Zhang, "Agentless", FSE 2025. https://arxiv.org/abs/2407.01489
- Yao et al., "ReAct", ICLR 2023. https://arxiv.org/abs/2210.03629
- Wang et al., "Executable Code Actions Elicit Better LLM Agents", ICML 2024.
  https://arxiv.org/abs/2402.01030
- Huang et al., "Large Language Models Cannot Self-Correct Reasoning Yet", ICLR 2024.
  https://arxiv.org/abs/2310.01798
- Cemri, Pan, Yang et al., "Why Do Multi-Agent LLM Systems Fail?", NeurIPS 2025 Datasets and
  Benchmarks. https://arxiv.org/abs/2503.13657
- Liu et al., "Lost in the Middle", TACL 2024. https://aclanthology.org/2024.tacl-1.9/
- Lindenbauer et al., "The Complexity Trap: Simple Observation Masking Is as Efficient as LLM
  Summarization", NeurIPS 2025 DL4Code workshop. https://arxiv.org/abs/2508.21433
- Yao, Shinn, Razavi, Narasimhan, "tau-bench", 2024 (ICLR 2025). https://arxiv.org/abs/2406.12045
- Lu et al., "ToolSandbox", Findings of NAACL 2025. https://aclanthology.org/2025.findings-naacl.65/
- Patil et al., "The Berkeley Function Calling Leaderboard", ICML 2025.
  https://openreview.net/forum?id=2GmDdhBdDk
- Debenedetti et al., "AgentDojo", NeurIPS 2024 Datasets and Benchmarks.
  https://arxiv.org/abs/2406.13352 ; "Defeating Prompt Injections by Design" (CaMeL), SaTML 2026.
  https://arxiv.org/abs/2503.18813
- Nasr, Carlini, Tramer et al., "The Attacker Moves Second", USENIX Security 2026.
  https://arxiv.org/abs/2510.09023
- Greshake et al., "Not what you've signed up for", AISec 2023. https://arxiv.org/abs/2302.12173
- Hines et al., spotlighting against indirect prompt injection, 2024 (preprint).
  https://arxiv.org/abs/2403.14720
- Wang et al., "MCPTox", 2025 (preprint). https://arxiv.org/abs/2508.14925
- Hasan et al., "MCP Tool Descriptions Are Smelly!", 2026 (preprint). https://arxiv.org/abs/2602.14878
- "TinyLLM: small language models for agentic tasks on edge devices", 2025 (preprint).
  https://arxiv.org/pdf/2511.22138
- Ruan et al., "WebLLM", 2024 (preprint). https://arxiv.org/abs/2412.15803
- Fan et al., "An Empirical Study of Harness Design for Coding Agents", 2026 (preprint).
  https://arxiv.org/abs/2609.20804
- Tan et al., GABench (graph analysis agents), 2026 (preprint). https://arxiv.org/abs/2608.01684
- Beurer-Kellner, Buesser, ..., Tramer et al., "Design Patterns for Securing LLM Agents against
  Prompt Injections", 2025 (preprint). https://arxiv.org/abs/2506.08837
- Mozannar et al., "Magentic-UI", Microsoft Research, 2025. https://arxiv.org/abs/2507.22358
- Wang, Lee, Drucker, Marshall, Gao, "Data Formulator 2", CHI 2025. https://arxiv.org/abs/2408.16119
- Gu, Shang, Althoff, Wang, Drucker, "How Do Analysts Understand and Verify AI-Assisted Data
  Analyses?", CHI 2024. https://arxiv.org/abs/2309.10947
- Kim et al., "Fostering Appropriate Reliance on Large Language Models", CHI 2025.
  https://dl.acm.org/doi/10.1145/3706598.3714020
- Bansal et al., "Does the Whole Exceed its Parts?", CHI 2021. https://arxiv.org/abs/2006.14779
- Amershi et al., "Guidelines for Human-AI Interaction", CHI 2019.
  https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/
- Wu, Miller, Garfinkel, "Do Security Toolbars Actually Prevent Phishing Attacks?", CHI 2006.
- Anderson, Vance et al., "How Polymorphic Warnings Reduce Habituation in the Brain", CHI 2015.
  https://dl.acm.org/doi/10.1145/2702123.2702322

### Vendor documentation (read 2026-10-08 unless dated)

- Claude Code: https://code.claude.com/docs/en/overview
- OpenAI Codex approvals and security: https://learn.chatgpt.com/docs/agent-approvals-security
- Gemini CLI checkpointing: https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/checkpointing.md
- VS Code agent approvals (dated 2026-10-07): https://code.visualstudio.com/docs/agents/run/approvals
- Cursor agent: https://cursor.com/docs/agent/overview
- Model Context Protocol 2026-07-28 changelog:
  https://modelcontextprotocol.io/specification/2026-07-28/changelog ; security best practices:
  https://modelcontextprotocol.io/specification/draft/basic/security_best_practices
- Agent Skills: https://agentskills.io/specification
- WebMCP origin trial (2026-06-09): https://developer.chrome.com/blog/ai-webmcp-origin-trial
- Chrome Prompt API (updated 2026-08-26): https://developer.chrome.com/docs/ai/prompt-api
- Excel Agent Mode GA: https://techcommunity.microsoft.com/blog/excelblog/agent-mode-in-excel-is-now-generally-available-on-excel-for-web/4476092
- Databricks Data Science Agent: https://www.databricks.com/blog/introducing-databricks-assistant-data-science-agent
- Hex Threads: https://hex.tech/blog/introducing-threads/
- Power BI, prepare data for AI: https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-prepare-data-ai
- Tableau Pulse insight types: https://help.tableau.com/current/online/en-us/pulse_insights_platform_insight_types.htm
- Figma MCP server: https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server
- Notion custom agents: https://www.notion.com/help/custom-agents
- Linkurious Query AI: https://doc.linkurious.com/admin-manual/latest/query-ai/ ; Neo4j MCP:
  https://neo4j.com/docs/mcp/current/ ; Cytoscape Desktop MCP:
  https://github.com/cytoscape/cytoscape-desktop-mcp
- OWASP Top 10 for LLM applications 2025: https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- MCP tools (annotations, structured results, input-required results):
  https://modelcontextprotocol.io/specification/2026-07-28/server/tools ; MCP Registry:
  https://modelcontextprotocol.io/registry/about
- OpenRouter OAuth PKCE: https://openrouter.ai/docs/client-sdks/python/sdks/oauth/README
- Tableau Pulse, explore metrics and suggested questions:
  https://help.tableau.com/current/online/en-us/pulse_explore_metrics.htm
- Graphistry Louie.ai: https://github.com/graphistry/louie.ai-docs ; Kineviz GraphXR natural
  language: https://www.kineviz.com/news/navigate-and-present-3d-graphs-with-natural-language-commands
- transformers.js v3 (WebGPU): https://huggingface.co/posts/Xenova/906785325455792

### Engineering blogs and comparisons

- Anthropic: "Building effective agents" (2024-12-19),
  https://www.anthropic.com/engineering/building-effective-agents ; "Writing effective tools for
  agents" (2025-09-11), https://www.anthropic.com/engineering/writing-tools-for-agents ; "How we
  built our multi-agent research system" (2025-06-13),
  https://www.anthropic.com/engineering/multi-agent-research-system ; "Beyond permission prompts"
  (2025-10-20), https://www.anthropic.com/engineering/claude-code-sandboxing ; "Demystifying evals
  for AI agents" (2026-01-09), https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Cognition, "Don't Build Multi-Agents" (2025): https://cognition.com/blog/dont-build-multi-agents
- Simon Willison, "The lethal trifecta for AI agents" (2025-06-16):
  https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/
- Gephi AI (community MCP server): https://github.com/MattArtzAnthro/gephi-ai
- DeployHQ guide to Cursor (secondary): https://www.deployhq.com/guides/cursor

### graphty documents this builds on

`design/element-api/agent-harness-options.md` (library comparison); `design/ai/` (interface design,
multi-turn, system-state tools, key persistence); `design/ui/framework/` (principles, state matrix,
message catalog, output homes, files and recipes, one-way doors); `design/designloom/` (personas
and workflows).
