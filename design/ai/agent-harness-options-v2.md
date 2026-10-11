# An agent harness for graphty: options, priorities and prototypes

Written 2026-10-09 against master f9f53fa6c. This report answers issue #37
(https://github.com/graphty-org/graphty-monorepo/issues/37, "research a browser-based AI agent
harness"). It is written for someone who has not seen the study behind it.

An **agent harness** is everything around a language model that lets it do work in a product: the
loop that sends a request to a model and runs the tools the model asks for, the tools themselves,
what the model is told and remembers, the limits and approvals, the events a user interface shows,
and the tests that say whether any of it works. Claude Code, OpenAI Codex and Gemini CLI are
harnesses around coding models. graphty already has a small one, described in section 4.

Contents:

1. Summary
2. Method and its limits
3. Success criteria
4. What graphty has today, and what users would need
5. How modern harnesses compare
6. The feature catalog, prioritized
7. The harness designs, best first
8. Prototypes
9. Security and trust requirements
10. Rejected ideas and open questions
11. Sources
12. How this differs from the earlier reports

---

## 1. Summary

### Recommended direction

**Keep graphty's own loop inside graphty-element and grow it; do not adopt an agent framework.**
Most frameworks (CrewAI, Pydantic AI, AG2, the Microsoft Agent Framework) are Python or .NET or
need a server, and Mastra needs a server for agents and memory. The two that do bundle for a
browser, OpenAI's Agents SDK and LangGraph.js, were built for a page in the September study
(`design/element-api/agent-harness-options.md`): each adds a second provider layer and supplies no
browser skills, memory or MCP. More importantly, none of
the harnesses or frameworks surveyed ties an agent's turn to the host application's undo. graphty
already does: one assistant message is one undo step, cancel reaches every tool, and every tool
argument is schema-checked. That is the hardest part of a safe in-product agent, and a framework's
loop would replace it with something weaker. The Vercel AI SDK that graphty already uses supplies
the loop primitives (stop conditions, per-step hooks, tool approval in newer versions), so the
hand-written parts can shrink without giving up control.

**Most of the value needs no new agent technology.** Of the 40 most valuable use cases chosen from
a 507-idea brainstorm, 34 need the model to reach more of graphty-element than it can today: the
assistant exposes 15 tools, about a third of the element's own command vocabulary. The next tier
is ordinary harness machinery: conversation memory (today every message starts from nothing),
showing what the assistant did, honest limits and stop reasons, approvals for the few actions undo
cannot reverse, and the current selection and viewport in the model's context.

**The recommended assistant is a canvas copilot: the person drives, the agent assists.** It answers
about what is on screen, makes small reversible changes at once with undo, and previews only the
changes undo does not cover. Multi-step "plan, preview, approve" work comes later, after a study
with real analysts, because people approve plausible wrong plans. Model-free pipelines and seeded
robustness sweeps (run the same algorithm 20 times with recorded seeds and report how stable each
result is) are the best value for their cost and work with no model and no key.

**Fix four live defects first.** The study found them in today's code (all re-checked on f9f53fa6c):

1. Each message runs the whole model conversation inside one session transaction
   (`graphty-element/src/ai/AiController.ts` around line 175), so while the model is thinking, the
   person's own edits to anything the message touched fail with `E_HELD_BY_TRANSACTION` (issue #1721).
2. The app says "Keys are encrypted and stored in this browser only"
   (`graphty/src/components/ai/AiProviderSettings.tsx:720`), but the encryption key is a constant
   in the published source (`ApiKeyManager.ts:47`, "graphty-default-key"; the file itself says it
   "is not a secret"). It is obfuscation and must be described as such (issue #691; pull request
   #1715 fixes the wording, and the Web Crypto change in #1677 keeps the built-in key).
3. The app keeps its own copies of element AI types (`graphty/src/types/ai.ts` redeclares the
   status with a different stage set; the provider list is hard-coded in the settings pane). Under
   the repository's rule against working around graphty-element, these are unfiled element defects.
   The same rule covers the app's own result-member CSV builder with a private formula guard
   (`graphty/src/components/shell/analysis/resultMembers.ts`), which an agent export tool would
   otherwise have to reimplement (issue #1722 covers the types and provider list).
4. The app's error telemetry (Sentry, active only after the reader opts in to usage data) has no
   scrubber, and the AI SDK's provider error objects carry the request and response bodies. Whether
   Sentry's current integrations serialize those fields is untested; a scrubber with a test closes
   the question either way (issue #1723).

Separately, the "Local (WebLLM)" option in Settings cannot start in the app (the element's
synchronous provider factory throws by design for WebLLM, and the app aliases the library to a stub
that throws); a consumer must construct the provider itself and pass it in, which the
self-sufficiency rule counts as an element defect (issue #1724; the app's stub is issue #1694). Since pull request #1693 (merged on master
before f9f53fa6c, closing issue #1681), the element offers seven in-browser models: the five small
ones (360M to 3.8B) are text-only, and two Hermes models (7B and 8B, about 4 to 4.5 GB downloads,
roughly 4 to 5 GB of GPU memory) can call tools. How well they call graphty's tools is unmeasured.

**Desktop and mobile: build nothing specific now.** Their real unlocks (local MCP servers, the OS
keychain, unattended scheduled runs, web fetch without browser cross-origin limits, native models
and code sandboxes) matter for use cases outside the current top 40. Section 7 names measurable
triggers for revisiting. Note that graphty as an MCP server for other assistants does NOT need a
desktop app: it is a small Node process over the element's browser-free session entry.

### Top prototypes (section 8)

1. **Reliability baseline**: a public element state snapshot and diff, and the LLM regression tests
   extended to repeated runs graded on end state. Everything else is measured with it, and it
   settles the AI SDK v5 versus v7 question by measurement.
2. **Graph-native advantage experiment**: the same tasks through graphty's own harness and through a
   general assistant driving the same commands over MCP. Its result decides how much to invest in
   graphty's own harness versus an MCP server.
3. **Copilot core**: memory, view context, streaming, a visible trace and change summary, enforced
   limits and short transactions, against today's assistant on the same suite.
4. **Model-free pipelines and seeded sweeps**: fixed pipelines against the free loop on known task
   shapes, for cost, reliability and the keyless path.
5. **Local model tier**: a localhost model server and an in-browser model with constrained tool
   calls, measured into a per-model capability table before any is offered.

### Decisions only the owner can make (one-way doors)

Each of these is a published contract or a persisted format. Everything else in this report is a
two-way door the team can decide.

| Decision                                                                                                                                                                               | Why it is a one-way door                                                                                                                                                              | Recommendation                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The `ai` peer-dependency range: AI SDK 5 or 7                                                                                                                                          | Changing it breaks consumers' installs                                                                                                                                                | Decide with prototype 1's measurement; ship any change in one grouped graphty-element major                                                                                                                          |
| Removing the Graph-bound tool API from `@graphty/graphty-element/ai` (`execute(graph, ...)`, `registerCommand`, `CommandResult.message`, published in `graphty-element/api/ai.api.md`) | Breaking public API                                                                                                                                                                   | Port the tools additively now, deprecate the old API, remove it in the same major as the peer-range change                                                                                                           |
| The undo contract: one assistant message is one undo step                                                                                                                              | Public behavior consumers rely on                                                                                                                                                     | Keep it, and document it; implement it by grouping short transactions rather than one long one                                                                                                                       |
| Persisted formats: agent provenance in project files, saved conversation history (default off), saved-view sequences (tours, slides), recipes, the decision-log export                 | Data formats are permanent once files exist                                                                                                                                           | Keep each in memory or as an explicitly experimental download until two real users ask; then decide one at a time. The decision-log export is wanted soonest (legal review of "who merged these two people and why") |
| Publishing an MCP server: its package name and tool descriptor set                                                                                                                     | A published tool contract other agents depend on                                                                                                                                      | Decide after prototype 2                                                                                                                                                                                             |
| An xlsx importer in graph-io                                                                                                                                                           | A new parser dependency (SheetJS left npm; its last npm version, 0.18.5, is affected by CVE-2023-30533, fixed in 0.19.3 outside npm)                                                  | Defer; joins take CSV and graph-io formats until asked                                                                                                                                                               |
| Where saved keys may live on graphty.app                                                                                                                                               | graphty.app serves the app, the docs and seven Storybooks from one origin, so any story or docs script can read a key the app saved; moving the app to its own origin changes its URL | Keep key persistence off on graphty.app until decided; then a separate origin for the app, or a key-vault iframe on its own origin (issue #691)                                                                      |

### How far the review got

Six simulated expert reviewers (section 2) reviewed the designs in three rounds. For the last two
rounds every reviewer rated every remaining design viable or viable with changes, and all six
agreed on the order above. The details did not converge: the last round found nine new problems,
four of them major (the transaction defect above, three element capabilities the designs had
assumed but that do not exist, a batch-apply scheme that could never have worked, and the
telemetry path). Their fixes are in this report but have not been re-reviewed. Section 7 lists the
objections still open.

---

## 2. Method and its limits

The study read the assistant's code, tests and design documents on master; chose 40 use cases from
an AI-generated 507-idea brainstorm (`design/ai/agent-use-cases.md`); surveyed six areas in
parallel (coding-agent harnesses, agent frameworks and SDKs, in-app and consumer agents, academic
research, protocols and extension mechanisms, and runtimes from browser to desktop and mobile);
wrote success criteria, had them reviewed by three simulated reviewers (an engineer who has shipped
a harness, a security reviewer, an analytics product designer) and froze the revised version;
merged the surveys into a catalog of 162 features with how each would work in graphty; composed 16
harness designs from the catalog; and put the designs through three rounds of adversarial review by
six simulated lenses (a criteria scorer, a harness engineer, a product and UX reviewer, a security
and privacy reviewer, a working analyst and journalist, and an architecture and coverage reviewer),
revising, merging and dropping designs after each round. Code facts the reviewers relied on were
re-read in the source.

Limits, stated plainly:

- **The reviewers were simulated**, all played by the same model family. They disagreed with each
  other and found real defects in the code, but they share blind spots, and their agreement is not
  the agreement of human experts. Treat "every lens rated it viable" as a structured second opinion,
  not a verdict.
- **Nothing was built or run.** No prototype exists; every score is a judgment on paper. Prototype
  results should override anything here.
- **The demand side is a brainstorm, not user research.** No interviews, telemetry or support data
  stand behind the 40 use cases, and none of the 16 personas or 25 workflows in
  `design/designloom/` asks for an in-product assistant; they ask for things an assistant could
  reach (reproducible analyses, saved analysis patterns, evidence trails).
- **Most harness evidence is vendor documentation.** It shows a feature exists, not that it helps.
  Measured evidence exists for a handful of patterns (tool design, tool retrieval, code actions,
  plan visibility in user studies, tool-grounded verification, reliability metrics, injection
  defenses, constrained decoding for small models) and is graded in section 11.
- **No benchmark covers an agent working on an interactive graph visualization** alongside a person.
  Every pass bar below is a starting point for calibration, not a known threshold.

---

## 3. Success criteria (frozen)

Frozen on 2026-10-08 as version 2, after three reviews of version 1 found that hard pass bars on
guessed rates rejected every prototype and that several security claims rested on prompt text.

### How they are applied

| Tier                 | Criteria | Weight                                                   | How it is used                                                                                                     |
| -------------------- | -------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Prerequisite         | 1 to 3   | not scored                                               | Built before any prototype is compared                                                                             |
| Strategic experiment | 4        | not scored                                               | Run once, early; its result is a product decision, not a pass bar                                                  |
| Gate                 | 5 to 12  | must hold exactly (x3 in the review's convenience total) | Invariants tested by construction; a prototype that fails one is out                                               |
| Release-critical     | 13 to 18 | x3                                                       | Reported with confidence intervals against today's assistant; pass bars applied only at release, after calibration |
| Important            | 19 to 33 | x2                                                       | Expected before a public release                                                                                   |
| Nice                 | 34 to 38 | x1                                                       | Worth measuring; skipping one is not wrong                                                                         |

There is deliberately no point total in the criteria themselves: prototypes are compared as a
profile, one column per criterion. The reviewers' weighted total (gates and release-critical x3,
important x2, nice x1, normalized to 100) is reported in section 7 only as a convenience.

Statistics rules for every rate: 95% Wilson intervals; paired comparisons on the same tasks (count
tasks where one passes and the other fails), never subtracted averages; the suite prints its own
minimum detectable difference and no bar is set tighter; safety rates use at least 5 runs per case,
and safety claims come from gates, because zero failures in n runs only shows the true rate is below
about 3/n; every run records pinned model ids, temperature, seed, prompt version and SDK version.

### The criteria

| #   | Criterion                                                                  | Tier             | Measure (starting bar where one is set)                                                                                                                                                                |
| --- | -------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Repeated-run eval suite with a baseline, a held-out set and measured noise | Prerequisite     | One command runs it on any provider; prints pass^k per task with intervals, noise and minimum detectable difference; a deliberately broken prompt drops the score by more than the noise               |
| 2   | Element state snapshot and diff with a documented scope                    | Prerequisite     | Public `snapshot()` and `diff()` over data, style layers, algorithm results, selection, camera, layout and positions, immersive mode; snapshot, mutate, restore, diff is empty for every agent command |
| 3   | A written threat model                                                     | Prerequisite     | Names the attackers (dataset or recipe author, remote tool source, compromised dependency, model provider, embedding page) and the boundary each gate protects                                         |
| 4   | Graph-native advantage over a general assistant using MCP                  | Strategic        | Same 10 live-view tasks both ways; the gap decides investment                                                                                                                                          |
| 5   | Undo restores the prior state exactly                                      | Gate             | For every task: snapshot, run, undo, diff is empty; cancel at each tool boundary gives the documented outcome                                                                                          |
| 6   | Effects, exposure, approvals and caps enforced in code                     | Gate             | Every tool declares a mutation class and what it discloses; approval only by an API call with the pending call id; injected "the user approved" leaves the call pending                                |
| 7   | Injected data cannot cause an outbound or irreversible action              | Gate             | With a canary outbound tool present, every outbound call stays pending across the injection set; the network log shows only the provider host                                                          |
| 8   | Requests and secrets go only where the user chose                          | Gate             | Network log; endpoint never settable from data; key not persisted by default; egress report matches request bodies; no key or graph value in thrown errors                                             |
| 9   | Context is current, memory is controlled                                   | Gate             | A manual edit, an undo and a dataset reload each appear in the next request; clear really clears; no memory carried into a new dataset by default                                                      |
| 10  | Headless in the element, neutral harness output                            | Gate             | No model calls or prompts in the app; every harness event and result is `{ code, params }`; a fake UI renders the whole stream including approvals                                                     |
| 11  | An offered on-device mode is honest about egress                           | Gate             | Whole-session network log shows only the declared model download hosts, with pinned hashes                                                                                                             |
| 12  | The app renders model output inert                                         | Gate (app)       | A reply with a markdown image and a data-carrying link causes zero requests when rendered                                                                                                              |
| 13  | Core task success                                                          | Release-critical | About 30 core tasks plus 3 to 5 data-changing tasks, graded on state diff or answer keys; some prompts not in English; pass^3 on 80% of held-out tasks with the default model                          |
| 14  | Follow-ups and corrections across messages                                 | Release-critical | 15 scripted 2 to 3 message conversations; multi-turn pass^3 within 15 points of the single-message rate                                                                                                |
| 15  | Grounded answers and an honest "cannot"                                    | Release-critical | Numbers and names trace to tool output; 10 underspecified and 10 impossible prompts change nothing; pass^3 on 80% of abstention cases                                                                  |
| 16  | Analytic soundness                                                         | Release-critical | Method fits the data (directed or not, weighted or not, disconnected); limits stated; no causal claims from structure; rubric set at calibration                                                       |
| 17  | Injection resistance inside the graph                                      | Release-critical | At least 40 poisoned datasets (values, property keys, column names, schema text, multi-turn, adaptive attackers), at least 5 runs each; unrequested-change rate upper bound under 5%                   |
| 18  | Real users succeed and calibrate their trust                               | Release-critical | Moderated study of 5 to 8 tasks, agent versus manual UI: success, time, catch rate of a planted wrong answer, discovery                                                                                |
| 19  | The reading of a request is shown and editable                             | Important        | On ambiguous prompts the reading is present 100% of the time and editing it reaches the corrected state                                                                                                |
| 20  | Tools stay accurate at realistic tool counts                               | Important        | Core tasks with today's 15 tools versus about 40; paired difference and tool-definition tokens                                                                                                         |
| 21  | The loop is bounded and stops honestly                                     | Important        | Fault injection: budget never exceeded, stops after a second identical failure, final event names what did not happen                                                                                  |
| 22  | Actions visible, attributed, summarized, removable, replayable             | Important        | 100% of agent-made layers and results attributed; removing one message's work leaves the rest; replay reaches the same state                                                                           |
| 23  | Configurable limits, hooks and autonomy level                              | Important        | Each control set from the docs blocks the matching prompt and reports it                                                                                                                               |
| 24  | Budgets, cost reporting and context growth                                 | Important        | Median input under 15,000 tokens per core task, flat from 100 to 10,000 nodes; a 30-message session stays within the compaction policy                                                                 |
| 25  | The page stays responsive and rendering is unharmed                        | Important        | First harness event within 1 s; no main-thread task over about 200 ms on a 10,000-node graph; cancel within 1 s                                                                                        |
| 26  | Any model works, with a measured capability table                          | Important        | Per-model measured table in the docs; on-device exploratory bar pass^3 on 50% of read-and-style tasks                                                                                                  |
| 27  | Consumers extend the agent through the built-ins' API                      | Important        | One tool and one skill written from the docs alone, each about 15 lines, undo in one step and are attributed                                                                                           |
| 28  | Selection and viewport in the agent's context                              | Important        | 10 tasks that need them; pass^3 against the baseline                                                                                                                                                   |
| 29  | User and agent working at the same time                                    | Important        | One scripted test per case (drag during a run, queued messages, several elements per page)                                                                                                             |
| 30  | A redacted, replayable trace for bug reports                               | Important        | An exported trace replays in the suite and holds no key or never-send value                                                                                                                            |
| 31  | Accessible agent interaction                                               | Important        | Keyboard and screen-reader walkthrough of approve, deny, cancel and undo passes                                                                                                                        |
| 32  | The simple path fits in about 15 lines from the published docs             | Important        | Blind-author test: line count and internal names used                                                                                                                                                  |
| 33  | Saving conversation history is an explicit option                          | Important        | A project saved with the default holds no history                                                                                                                                                      |
| 34  | Visual self-check                                                          | Nice             | 10 visual tasks, paired difference with the check on and off                                                                                                                                           |
| 35  | MCP and WebMCP adapters; core free of browser APIs                         | Nice             | The MCP adapter passes core tasks from an outside client with no change to the core loop                                                                                                               |
| 36  | Checkable plans and replayable recipes                                     | Nice             | Plan matches executed calls; a recipe replays to the same state; a planted bad plan is caught, or plan mode is judged harmful                                                                          |
| 37  | No agent code loads unless the agent is enabled                            | Nice             | Bundle analysis of a page that does not enable it (met today)                                                                                                                                          |
| 38  | Maintainability of the harness                                             | Nice             | Lines of harness code and provider-specific branches, compared across options                                                                                                                          |

Security defaults are not "neutral defaults". The repository's rule that graphty-element's defaults
stay neutral (no default seed, no default palette) is about consumer preferences. For key
persistence, approval of outbound and irreversible actions, and saving history, the default is the
safe one, and the consumer may change it.

---

## 4. What graphty has today, and what users would need

### Today's assistant

- **Shape.** `@graphty/graphty-element/ai`, loaded on demand so a page that only draws a graph never
  loads the model SDKs. A consumer calls `element.enableAiControl({ provider, apiKey, model })`,
  then `element.aiCommand("...")`. About 7,900 lines in `graphty-element/src/ai`.
- **Loop.** Hand-written (`AiController`) over the Vercel AI SDK 5: up to 5 tool rounds, then a
  forced text answer; tools run one after another and stop at the first failure; a throwing tool
  rolls back the whole message; results cut at 8,000 characters. No token streaming (one chunk per
  round). Token usage is returned by providers and dropped. The model is never told its round limit.
- **Memory.** None. Each message sends only a system prompt and the current input.
- **Tools.** 15: graph queries, schema and samples, property distribution, algorithm list and run,
  layout and 2D/3D, immersive mode, styling nodes and edges, clearing styles, camera. Not reached:
  notes, named sets, selection, visibility filters, data import and edits, saved views, project
  save and export, history, and the element's own dry-run `plan()` and cost `estimate()`. The
  session's command vocabulary (about 37 serializable commands plus batch) already runs in Node
  without Babylon or the DOM.
- **Undo.** One message is one transaction, tagged as the assistant's in history; cancel, or an undo
  during a run, aborts the model and every tool.
- **Providers.** OpenAI, Anthropic, Google (direct from the browser with the user's own key), an
  in-browser WebLLM provider (seven models; only the two 7B and 8B Hermes models can call tools,
  and the element sends tools to no other), and a mock.
- **Keys.** In page memory, or persisted to browser storage under the obfuscation described in
  section 1.
- **Voice.** Speech input through the browser's Web Speech API (server-based in Chrome, so it is a
  data channel); no speech output.
- **App.** A settings pane and a chat panel. The panel already declares props for per-tool records,
  follow-ups, retry and dictation, but the shell does not pass them, so readers cannot see which
  tools ran. The transcript is React state only.
- **Tests.** 79 paid regression cases, each run once against one model (Google by default), mostly
  checking which tool was called; run only on the release train.
- **Earlier designs in `design/ai/`** that this report builds on rather than replaces:
  `ai-multi-turn.md` (the tool-result loop, now implemented as the 5-round loop),
  `ai-key-persistence-api.md` (the public `keyPersistence` option, implemented; section 9 keeps it
  but changes its default wording and binds keys to their endpoint), `ai-tool-system-state-design.md`
  (tools that describe styles, camera, selection and algorithm state, not yet built; it is the
  starting design for the selection and viewport row in section 6.1) and
  `ai-tools-additional-webllm-models.md` (prompt-based tool calls for models WebLLM refuses tools
  for; the starting design for the constrained in-browser tool calls in section 6.1).
- **AI SDK study** (`design/ai/ai-sdk-v5-vs-v7.md`, 2026-10-08): moving to v7 adds per-call tool
  approval, tool search and a maintained in-browser provider that does prompt-based tool calling, at
  48 to 102 kB gzip more in the lazily loaded entry; it recommends keeping graphty's own loop.

### What the use cases demand

The 40 use cases were chosen for using graphty's own graph functions, serving many kinds of users,
being buildable for today's browser product, and unlocking other ideas. Short names used in the
rest of this report:

- **Asking the graph questions:** explain this graph; who matters most; plain-language selections
  and filters; multi-step analysis from one prompt; algorithm advisor and pre-flight check; name the
  communities; why is this node ranked high; self-correcting analysis; say when the graph cannot
  answer; compare two network versions.
- **Rigor and what-if:** resilience (what breaks if we lose this); parameter sweep; null-model
  significance testing; red-team my analysis.
- **Seeing and styling:** style by description; style layer debugger; what am I looking at; layout
  bake-off.
- **Getting data in:** find me a graph about X; Wikipedia or plain-English SPARQL to graph;
  literature map from seed papers; schema inference for unknown files; repair a file that will not
  load; data quality report and junk-hub detection; duplicate detection and merging; cleaning loop
  that becomes a replayable recipe; fuzzy-key join with a spreadsheet; documents to a sourced entity
  graph; photo or whiteboard to graph; provenance on every node and edge.
- **Getting results out:** slide deck; methods section and reproducibility package; journal figure
  package with a color-blind audit; standalone interactive page; eyes-free and hands-free use.
- **Help and automation:** help desk from the docs; bug report with a reproduction; record a session
  as a recipe; nightly refresh and digest; graphty as an MCP server for other agents.

Capabilities they need (counts over the 40):

| Capability                                       | Required by | Today                                               | In a browser now?                          |
| ------------------------------------------------ | ----------- | --------------------------------------------------- | ------------------------------------------ |
| Wider graph tools and state description          | 34          | 15 tools, about a third of the command surface      | Yes                                        |
| Reading files and writing artifacts              | 10          | The element loads graph files; the agent reads none | Yes (pickers, drag and drop, downloads)    |
| Longer, plannable loop with budgets              | 9           | 5 rounds, stop on first failure                     | Yes                                        |
| Previews, approvals and cost gates               | 9           | None; `plan()` and `estimate()` exist unused        | Yes                                        |
| Conversation memory within a session             | 6           | None                                                | Yes                                        |
| Undo, checkpoints and provenance                 | 6           | One message, one undo step                          | Yes                                        |
| Guards: injection, data-flow ledger, local model | 6           | None; local model broken                            | Partly                                     |
| Document and media generation                    | 4           | Capture exists, unregistered                        | Yes                                        |
| Vision (screenshots, user photos)                | 3           | Text-only messages                                  | Yes, on cloud vision models                |
| Web search and fetch                             | 3           | None                                                | Limited by browser cross-origin rules      |
| Skills and know-how packs                        | 3           | Schema in the prompt only                           | Yes                                        |
| Replayable recipes                               | 3           | Commands are data; no recipe API                    | Yes                                        |
| Sandboxed code                                   | 2           | None                                                | In a worker, unproven                      |
| Sub-agents and review passes                     | 2           | None                                                | Yes, at many times the cost                |
| Connectors and an MCP client                     | 2           | None                                                | Remote servers only                        |
| Scheduling and unattended runs                   | 1           | None                                                | No (needs a process that outlives the tab) |
| graphty as a tool server                         | 1           | None                                                | No (a page cannot be a server)             |

Reading this table: the graph tool surface dominates; the agent's own machinery (memory, approvals,
budgets, provenance, guards) comes next and can be built on primitives the session already has; and
only scheduling and serving other agents truly need a process outside the browser tab.

---

## 5. How modern harnesses compare

Access dates 2026-10-08 and 2026-10-09. "Yes" means the vendor documents the feature; it says
nothing about how well it works. "?" means the study found no documentation either way. Evidence
for this table is documentation (moderate for existence, silent on benefit) unless marked.

### Coding-agent harnesses

| Feature                                       | Claude Code                               | OpenAI Codex                                                     | Gemini CLI                                      | GitHub Copilot agent                      | Cursor                                     | graphty today                                                  |
| --------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| Bounded loop, interrupt                       | Yes                                       | Yes                                                              | Yes                                             | Yes                                       | Yes                                        | Yes (5 rounds, cancel)                                         |
| Mid-turn steering                             | Yes (read after current tool calls)       | ?                                                                | ?                                               | ?                                         | ?                                          | No                                                             |
| Plan mode                                     | Yes (edits blocked until approved)        | Plans as checklists                                              | ?                                               | ?                                         | Yes (asks questions first; parallel plans) | No                                                             |
| Visible task list                             | Yes                                       | Yes                                                              | ?                                               | ?                                         | Yes                                        | No                                                             |
| Sub-agents with isolated context              | Yes (nest 3 deep, background, resumable)  | Yes                                                              | Yes (incl. remote)                              | ?                                         | Yes (CLI, 2026-03)                         | No                                                             |
| Skills (open Agent Skills format, 2025-12-18) | Yes                                       | Yes                                                              | Yes                                             | Yes                                       | Yes                                        | No                                                             |
| Project instruction files                     | CLAUDE.md, reads AGENTS.md                | AGENTS.md (origin)                                               | GEMINI.md, hierarchical                         | copilot-instructions.md, path-specific    | .cursor/rules, nested                      | No                                                             |
| Lifecycle hooks                               | Yes (about 30 events)                     | ?                                                                | Yes                                             | Yes                                       | Yes                                        | No                                                             |
| Permission modes, allow/ask/deny              | Six modes incl. a classifier (2026-03-25) | Approval policy (always, on request, never)                      | Policy engine, trusted folders                  | ?                                         | ?                                          | No                                                             |
| Sandbox as a separate dial                    | Bash sandbox, network allowlists          | Read-only, workspace-write, full; cloud tasks offline by default | Seatbelt, Docker, Podman, Windows               | ?                                         | ?                                          | The browser itself                                             |
| Checkpoints and rewind                        | Per prompt; code, conversation or both    | ?                                                                | Before each file-changing tool (off by default) | ?                                         | Per step; files, not conversation          | One undo per message, covering every in-graph change           |
| Persistent memory                             | Auto memory (index plus topic files)      | Yes (preview, 2026-04)                                           | ?                                               | ?                                         | ?                                          | No                                                             |
| Compaction                                    | Automatic, with a focus                   | Yes                                                              | ?                                               | ?                                         | ?                                          | Not needed yet (no memory)                                     |
| MCP client                                    | Yes                                       | Yes                                                              | Yes                                             | Yes                                       | Yes                                        | No                                                             |
| Plugins or extensions                         | Plugins and marketplaces                  | Skills and plugins                                               | Extensions                                      | ?                                         | ?                                          | Element extension points for algorithms, layouts, data sources |
| Headless mode and SDK                         | `claude -p`, Agent SDK                    | `codex exec`, Codex SDK                                          | Headless mode                                   | ?                                         | CLI                                        | No (loop needs the DOM)                                        |
| Background, scheduled runs                    | Routines, scheduled tasks                 | Automations, cloud tasks                                         | ?                                               | Coding agent: issue to draft pull request | Background agents                          | No                                                             |
| Parallel attempts (best-of-N)                 | ?                                         | Cloud, 2 to 4 attempts                                           | ?                                               | ?                                         | Up to 8 agents                             | No                                                             |
| Second reviewing pass                         | Yes                                       | Yes                                                              | ?                                               | Pull request review                       | Yes                                        | No                                                             |
| Cost and context visibility                   | Yes                                       | Yes                                                              | ?                                               | ?                                         | Yes                                        | No (usage dropped)                                             |

Measured results across these products are rare. What exists: tool interface design matters a lot
(SWE-agent, NeurIPS 2024, strong); code-as-action beats JSON tool calls by up to 20% on multi-step
work (CodeAct, ICML 2024, strong); retrieval over a large tool list roughly triples selection
accuracy (RAG-MCP, May 2025, moderate); project instruction files do not raise task success on
average and cost over 20% more, while specific rules are followed (ETH Zurich, February 2026,
moderate); multi-agent systems spend about 15 times the tokens of a chat (Anthropic, June 2025,
vendor figure). Terminal-Bench rankings seen in comparison blogs could not be traced to a primary
source and are not used.

What transfers to graphty and what does not: coding harnesses are built around files, a shell and
git. graphty's equivalents are the graph and its command API (the workspace), the transaction log
and undo (git), and a sandboxed script runner if one is ever added (the shell). Most coding-harness
safety machinery (checkpoints, permission prompts for edits) exists to approximate what graphty's
transactional command API already gives it. What graphty lacks is the rest: memory, visibility,
budgets, hooks, approvals at the edge of undo, and evaluation.

### Agent frameworks and SDKs

| Framework                                      | Runs in a browser page?                                                   | Status (2026-10)                                                                                                  | Patterns worth copying                                                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel AI SDK 6 and 7                          | Yes (already used)                                                        | 6.0 on 2025-12-22; 7 current                                                                                      | Stop conditions, per-step hook, tool approval (v7 per-call policies), tool search (v7), MCP client, OpenTelemetry hooks, a durable workflow agent |
| OpenAI Agents SDK (TypeScript)                 | Yes                                                                       | Active                                                                                                            | Pause and resume with serializable run state, input and output guardrails, sessions, tracing (sent to OpenAI by default), realtime voice          |
| LangGraph                                      | Python; LangGraph.js in Node, browser through a `/web` entry with caveats | 1.x                                                                                                               | Interrupts, checkpointers, time travel over agent state                                                                                           |
| Mastra                                         | Server needed for agents and memory                                       | Active                                                                                                            | Workflows with typed suspend and resume, working memory, evals in Vitest                                                                          |
| Google ADK                                     | Python, Java, Go; adk-js unverified in a browser                          | adk-js 2.2.1 on 2026-10-06                                                                                        | Before and after callbacks at agent, model and tool; eval sets with trajectory scoring                                                            |
| Pydantic AI                                    | Python                                                                    | Active                                                                                                            | Typed output with validation retries, deferred tools, durable runs on Temporal                                                                    |
| CrewAI, AutoGen/AG2, Microsoft Agent Framework | Python or .NET                                                            | AutoGen in maintenance since 2025-10; Agent Framework 1.0 GA 2026-04-03 (both dates from secondary sources, weak) | Role crews, group chat, manager agents (not recommended for graphty)                                                                              |
| Letta, DSPy, smolagents                        | Python                                                                    | Active                                                                                                            | Editable memory blocks; prompt optimization against a metric; code actions                                                                        |

The frameworks converge on the same features (loop, approval with resume, hooks, sessions, tracing,
evals). None models the host application's state as transactional: "time travel" in LangGraph and
Mastra rewinds the agent's state, not the application's.

### In-app and graph-tool copilots

| Pattern                                      | Who has it (date)                                                                             | graphty today                          |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------- |
| Preview card, apply, then undo               | Gemini in Sheets (2025-10), Notion, Copilot in Excel                                          | Undo yes, preview no                   |
| Visible, editable plan                       | Excel Agent Mode (2025-09), Linear                                                            | No                                     |
| Show the work (code, query or command trace) | ChatGPT data analysis, Julius, Hex, Neo4j copilot                                             | Tool calls recorded, not shown         |
| The agent looks at its own output            | Kineviz Agent (v0.20.0, 2026-09-23), Excel Agent Mode                                         | No                                     |
| AI output placed beside the user's work      | Observable Canvases, Hex                                                                      | Agent style layers tagged, not grouped |
| Author-curated grounding, verified answers   | Power BI "prep data for AI", Tableau Semantics                                                | Schema tool only                       |
| Fixed query templates beside free text       | Neo4j Aura Agent (Cypher templates)                                                           | No                                     |
| Evidence-backed findings                     | Linkurious Copilot, Perplexity, Graphistry Louie                                              | No                                     |
| Graph built from a file or a prompt          | Kineviz, Neo4j LLM Graph Builder                                                              | No                                     |
| Graded permission modes                      | Claude in Chrome (three modes; 11.2% of injections still succeeded with mitigations, 2025-08) | No                                     |
| The product as a tool inside other agents    | Figma (2026-03), Neo4j Aura Agent, Louie, MCP Apps in Claude, ChatGPT, VS Code (2026-01-26)   | No                                     |
| Restricting which tools an agent may use     | Kineviz agent runs, Claude in Chrome blocked actions                                          | No                                     |

Two cautions from this group. Excel Agent Mode scored 57.2% on SpreadsheetBench against 71.3% for
people (Microsoft's own figure): even the best-funded in-app agents get a large share of tasks
wrong, so checking must be cheap. And adoption is not function: Tableau retired its natural-language
Ask Data in February 2024, and OpenAI shut its Atlas agent browser on 2026-08-09, 292 days after
launch, folding the agent into the apps people already use.

---

## 6. The feature catalog, prioritized

Each feature names who owns it under the repository's rules: graphty-element owns every capability
a third-party embedder would also need and returns neutral `{ code, params }` facts; the graphty app
only renders, words and arranges; a new package appears only where a separate process is involved.
"Use cases" uses the short names from section 4.

### 6.1 Now, in the web app

#### Priority 0: prerequisites and fixes before any new harness work

| Feature                                             | How it works in graphty                                                                                                                                                                                                             | Owner                                        | Use cases                             | Strengths                                                                                                               | Weaknesses                                              |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Repeated-run eval suite                             | Extend the 79 regression cases: run each k times per model, grade on end state and answer keys, keep a held-out set, add multi-message, approval and injection cases; a record-and-replay provider for cheap runs between paid ones | Repo tooling in graphty-element tests        | All; say when the graph cannot answer | The only way to tell better from worse; settles the SDK question (strong evidence: tau-bench shows single runs mislead) | k times the paid cost; good tasks are real work         |
| State snapshot and diff                             | Public element API over data, layers, results, selection, camera, layout and positions                                                                                                                                              | graphty-element                              | All (it grades them)                  | Consumers want it for their own tests; makes undo testable                                                              | The session's `snapshot()` covers graph data only today |
| Threat model                                        | A short document naming attackers and the boundary each gate protects                                                                                                                                                               | Design docs                                  | All                                   | Makes every security claim testable                                                                                     | None                                                    |
| Tool port and a browser-free core                   | Re-express each assistant tool as a session command returning codes; split the loop out of the Babylon-bound controller, additively                                                                                                 | graphty-element                              | 34 of 40                              | Unlocks wider tools, headless runs, the MCP server and evals                                                            | Touches a published entry point (see owner decisions)   |
| Short transactions per tool batch                   | Each batch of tool calls is its own short transaction; History groups a message's batches into one undo step; nothing is held while the model thinks                                                                                | graphty-element                              | Every interactive use                 | Fixes a live defect; keeps the undo contract                                                                            | New History grouping work, effort medium to high        |
| Telemetry scrubber                                  | An allowlist scrubber (code, message, stack only) with a test that throws a provider error                                                                                                                                          | The app (and the element for its own traces) | All                                   | Closes a likely prompt leak                                                                                             | None                                                    |
| Honest key wording                                  | Describe stored keys as obfuscated, readable by any script on the page                                                                                                                                                              | The app                                      | All                                   | A wording fix                                                                                                           | None                                                    |
| Key bound to its endpoint                           | A saved key is tied to the endpoint origin it was entered for; changing the base URL clears it or asks again, because the key travels as a header to whatever base URL is set                                                       | graphty-element                              | All                                   | Closes key theft by endpoint swap cheaply                                                                               | Does not protect a key in memory from page script       |
| No key persistence on the shared graphty.app origin | Until the origin decision in section 1, the app does not offer "remember this key" on graphty.app                                                                                                                                   | The app (its own choice as a consumer)       | All                                   | Removes the easiest theft path today                                                                                    | Re-pasting keys each visit                              |
| AI catalog and code export                          | Provider and model catalog, status enums and every AI result code from a browser-free entry; delete the app's copies                                                                                                                | graphty-element; app words                   | All                                   | Removes element defects hidden in the app                                                                               | Small new export                                        |
| WebLLM can start                                    | Async provider creation inside `enableAiControl`; delete the app's stub alias, keep the dynamic import                                                                                                                              | graphty-element                              | Keyless and local-only use            | Unblocks the local path                                                                                                 | Still cannot call tools until the local tier work       |

#### Priority 1: the copilot core (makes today's assistant conversational, visible and bounded)

| Feature                                                      | How it works in graphty                                                                                                                                                                                                                                                                                                                                       | Owner                            | Use cases                                                          | Strengths                                                                                                                                                                                                                     | Weaknesses                                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Conversation memory within a session                         | Send earlier messages, tool calls and results; reset at a dataset boundary; a working clear; not saved by default                                                                                                                                                                                                                                             | graphty-element                  | Who matters most; selections; cleaning loop; follow-ups everywhere | The largest everyday usability gap; the SDK handles message arrays                                                                                                                                                            | Context and cost grow; stale facts after undo; earlier untrusted content stays in context |
| Telling the agent what the person did                        | Facts from the journal: manual edits, undos, reloads, and "message 3 was undone"                                                                                                                                                                                                                                                                              | graphty-element                  | Selections; multi-step analysis; photo to graph corrections        | Exact, because the journal knows; agents score about 20 points lower when people act on shared state (tau2-bench, moderate)                                                                                                   | More context per message                                                                  |
| Selection, viewport and layers in context, plus a scope fact | "These" resolves without a query; every answer says what it covered and how many hidden nodes match                                                                                                                                                                                                                                                           | graphty-element                  | Who matters most; what am I looking at; selections                 | Cheap; graph-native                                                                                                                                                                                                           | More data sent to the provider                                                            |
| Real token streaming                                         | Call the provider's existing streaming path                                                                                                                                                                                                                                                                                                                   | graphty-element                  | Explain this graph; eyes-free use                                  | Code path exists                                                                                                                                                                                                              | App must render partial text inert                                                        |
| Per-message trace and change summary                         | Each message's command list as data, and counts of nodes and edges whose visibility, style or data changed; wire the panel props that already exist; nodes the agent hid or filtered also carry an "assistant" attribution fact the app shows in its persistent filter indicator, not only under the reply                                                    | graphty-element; app display     | Multi-step analysis; provenance; methods package                   | Answers "what did the AI do" (Gu et al., CHI 2024, strong); the summary and the persistent indicator expose injected hide or recolor attacks, and people skim transient warnings (Wu, Miller and Garfinkel, CHI 2006, strong) | Traces raise confidence more than accuracy, so show them on the canvas, not as logs       |
| Usage facts                                                  | Tokens per message and per session as facts (providers return them; today they are dropped); cost only when the embedder supplies prices, since a shipped price table goes stale and is a choice                                                                                                                                                              | graphty-element; app display     | All                                                                | The reader pays for their own key and should see what a question cost                                                                                                                                                         | Prices change                                                                             |
| Undo order and an undone fact                                | Newest first; an older message only when nothing depends on it, else a conflict fact; the model is told what was undone                                                                                                                                                                                                                                       | graphty-element                  | Self-correcting analysis; duplicate merging                        | Keeps history and the undo stack consistent                                                                                                                                                                                   | Nested step undo needs per-step patches (later)                                           |
| Exposure and mutation classes on every tool                  | Each tool declares read-only, reversible, outbound or irreversible, and what its result discloses; enforced before a tool runs                                                                                                                                                                                                                                | graphty-element                  | All                                                                | Turns approvals and never-send into code, not prompt text                                                                                                                                                                     | Classes become public API                                                                 |
| Person-only calls                                            | A tested list of calls the model can never make: apply a preview, approve, leave local-only, widen limits, undo person-made work                                                                                                                                                                                                                              | graphty-element                  | All                                                                | Closes the "the user approved this" class of attack                                                                                                                                                                           | None                                                                                      |
| Caps, stop codes, loop detection, paging                     | Round and token caps as consumer options with finite defaults; an identical repeated call stops the loop; truncation reported with a paging handle                                                                                                                                                                                                            | graphty-element                  | Multi-step analysis; cleaning loop; sweeps                         | Protects the user's money (OWASP unbounded consumption, strong)                                                                                                                                                               | A cap set too low cuts real work short                                                    |
| Compaction policy                                            | Drop old tool results past a token budget first, keep the person's messages and answers, report a compacted fact; order every request as a stable prefix (instructions, tool definitions) then volatile facts last so provider prompt caches hit; use a provider's own context-editing field where one exists (Anthropic clears old tool results server-side) | graphty-element                  | Long sessions                                                      | Safe, because graph facts can be re-queried; masking old tool output matched summarization at about half the cost (Lindenbauer et al., 2025, moderate)                                                                        | Summaries can drop stated boundaries; provider fields differ                              |
| Algorithm-cost approval                                      | When `estimate()` passes a consumer threshold, the message ends with a pending approval; the approved run is a new linked message                                                                                                                                                                                                                             | graphty-element; app dialog      | Algorithm advisor; parameter sweep                                 | Uses an estimate the element already has                                                                                                                                                                                      | One more round trip on big graphs                                                         |
| Never-send columns on every channel                          | A column marked never-send is withheld from prompts, tool results, labels, tooltips, captures, exports and voice input; a likely-sensitive-column fact helps consumers mark them                                                                                                                                                                              | graphty-element                  | Standalone page; bug report; any sensitive data                    | Concrete privacy control in a product that sends data out by design                                                                                                                                                           | Derived results can still leak (a community named after a salary band); say so            |
| First-send disclosure                                        | Before the first cloud request and whenever destination or columns change: exact host, data categories, key storage, measured model capability                                                                                                                                                                                                                | graphty-element facts; app words | All                                                                | Required for honest bring-your-own-key                                                                                                                                                                                        | Repeated disclosures are ignored, so only on change                                       |
| Injection hygiene                                            | Loaded values never in instruction text, delimited as data; invisible tag and bidi characters removed in the model's copy only (emoji joiners and Persian or Indic joiners kept)                                                                                                                                                                              | graphty-element                  | All                                                                | Required by the injection gate                                                                                                                                                                                                | Bounds damage; does not stop a fooled model                                               |
| No auto-run                                                  | Opening a project, link or URL parameter never triggers a model call, recipe or fetch                                                                                                                                                                                                                                                                         | graphty-element and app          | All                                                                | Blocks link-driven cost abuse on a stored key                                                                                                                                                                                 | None                                                                                      |
| No-model answers and starter prompts                         | Counts, "why is this red" (the element's existing style explainer), path between two entities, neighborhood within n hops answered by session calls; example questions from the loaded schema                                                                                                                                                                 | graphty-element; app words       | Style layer debugger; what am I looking at; who matters most       | Value with no key; the empty box is the main first-run barrier (Amershi et al., CHI 2019, strong)                                                                                                                             | A matcher misses vague requests                                                           |
| Feedback capture                                             | Thumbs and corrections stored locally as candidate eval cases                                                                                                                                                                                                                                                                                                 | graphty-element; app controls    | All                                                                | Feeds the suite                                                                                                                                                                                                               | Needs triage                                                                              |

#### Priority 2: before a public release

| Feature                                             | How it works in graphty                                                                                                                                                                                               | Owner                           | Use cases                                                                          | Strengths                                                                                                                                    | Weaknesses                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Typed claims with recomputed numbers                | The model emits claims tied to tool calls; the element re-runs them and tags each as computed, model or vision; built on session notes, whose cites already track current, earlier-run or missing                     | graphty-element                 | Who matters most; why ranked high; name the communities; say when it cannot answer | In a graph product the natural citation is a selection, cheap to check (Bansal et al., CHI 2021; Vasconcelos et al., CSCW 2023; both strong) | Only on models that can emit structured output; interpretive prose stays unbound |
| Measure-definition and algorithm assumption facts   | Each algorithm states what it counts and how it treats direction, weights and disconnected graphs                                                                                                                     | graphty-element                 | Who matters most; analytic soundness                                               | Stops "these 8 bridge departments" built on betweenness                                                                                      | Descriptor work across 60+ algorithms                                            |
| Egress ledger view                                  | Per-session record of what went where, actionable (mark a column never-send from it)                                                                                                                                  | graphty-element; app view       | Bug report; sensitive data                                                         | Shows exactly what left the device                                                                                                           | Covers only what passes through the element                                      |
| Endpoint options: base URL, headers, fetch override | Passed through to the SDK providers; settable only by embedder code, never by data                                                                                                                                    | graphty-element                 | Gateways, local servers, routers                                                   | Tiny change; the documented proxy path for key protection                                                                                    | A consumer's proxy becomes a data processor                                      |
| Memory-only key default with migration              | Report a key an older version stored; one call keeps or purges it; the app offers this tab, this tab across reloads, or this device                                                                                   | graphty-element; app            | All                                                                                | Honest key handling                                                                                                                          | Re-pasting is friction                                                           |
| Heavy work off the main thread                      | Algorithms and sweeps the agent starts run in a worker or yield, with progress and cancel                                                                                                                             | graphty-element with algorithms | Who matters most on big graphs; sweeps                                             | Keeps the canvas responsive                                                                                                                  | Real work in the algorithm layer                                                 |
| Several elements per page                           | Each element owns its own agent state, keys, budgets, ledger                                                                                                                                                          | graphty-element                 | Dashboards                                                                         | Third-party embedders need it                                                                                                                | None                                                                             |
| Redacted trace export                               | A user-triggered export of one message's trace that the suite can replay                                                                                                                                              | graphty-element                 | Bug report                                                                         | The only route for field failures without telemetry                                                                                          | Traces hold graph data, so opt-in and redacted                                   |
| Consumer tools through the built-ins' API           | A consumer adds a session command with an exposure class and examples, in about 15 lines                                                                                                                              | graphty-element                 | Help desk; domain uses                                                             | Parity with existing extension points                                                                                                        | Shape is hard to change once published                                           |
| Graph description facts                             | A model-free structured summary (size, components, top nodes, style legend, visible channels) and per-focus neighbors                                                                                                 | graphty-element                 | Explain this graph; eyes-free use; alt text                                        | Serves accessibility with no model                                                                                                           | Summaries hide outliers                                                          |
| Captures return handles, never pixels               | The screenshot tool stops putting a base64 image into the tool result and loses its model-settable download flag                                                                                                      | graphty-element                 | Style by description; figure package                                               | Removes a useless egress path                                                                                                                | None                                                                             |
| Codes instead of English in session facts           | Deprecate `PlanBlock.reason` and note-status labels in favor of codes                                                                                                                                                 | graphty-element                 | All                                                                                | Presentation neutrality                                                                                                                      | Removal waits for a grouped major                                                |
| Schema-only data mode                               | A consumer option that sends the schema, counts and computed facts but no labels, values or sample rows; a request that needs labels returns a code and the model is steered to computed answers and saved selections | graphty-element; app words      | Sensitive data; local-only profile                                                 | The strongest data minimization short of a local model                                                                                       | Answers get worse by an unmeasured amount (open question 10)                     |
| Name-to-node resolution                             | A tool returns candidate nodes for a name with match reasons; several candidates go to the structured-question tool instead of a guess                                                                                | graphty-element                 | Who matters most; why ranked high; duplicate merging                               | Models invent missing arguments rather than ask (ToolSandbox, NAACL 2025 Findings, strong)                                                   | Match thresholds need tuning                                                     |
| Attribute descriptions (data meaning)               | Embedder- or author-written descriptions of columns ("amount is USD", "weight is call minutes"), stored with the project and sent as quoted data, never as instructions                                               | graphty-element; app editing    | Analytic soundness; style by description                                           | Vendors report author-curated grounding as their largest accuracy lever (Power BI "prep data for AI", moderate)                              | Someone must write them; shared descriptions are untrusted input                 |
| Harness event stream for embedders' telemetry       | Every harness event (`{ code, params }`, token counts, durations, never prompt or graph text) is subscribable, so an embedder forwards it to its own collector, for example under the OpenTelemetry GenAI conventions | graphty-element                 | Bug report; organizational use                                                     | A library with no backend has no collector; this is the browser-shaped form of tracing                                                       | The embedder must still avoid logging bodies                                     |

#### Priority 3: valuable, built after the core is measured

| Feature                                                              | How it works in graphty                                                                                                                                                                                                             | Owner                                              | Use cases                                                   | Strengths                                                                                               | Weaknesses                                                                                                           |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Preview, apply, undo with named autonomy levels                      | "Suggest" previews everything; "assist" applies reversible style, selection and visibility at once and previews structural, bulk or person-made changes; a preview records exact commands and seeds and replays them                | graphty-element; app card                          | Duplicate merging; cleaning loop; selections                | Familiar; the element's `plan()` makes it cheap; best shown on the canvas                               | Merges and deletes need a merge command and ghost previews that do not exist yet                                     |
| Model-free pipelines                                                 | "Explain this graph", "data quality report", "compare two versions" as fixed command sequences; the model only words the result                                                                                                     | graphty-element                                    | Explain this graph; data quality report; methods package    | Predictable, cheap, testable with the mock, works on small models (Agentless, strong for its benchmark) | Brittle outside its shape                                                                                            |
| Seeded robustness sweeps                                             | Run an algorithm N times over drawn and recorded seeds, resolutions or edge drops; report spread (best-match Jaccard per community, NMI overall); "fragile" is the consumer's threshold                                             | algorithms (primitives), graphty-element (wrapper) | Parameter sweep; red-team my analysis; name the communities | The rigor feature analysts ask for first; no model                                                      | Compute heavy; needs workers                                                                                         |
| Plan mode, staged                                                    | Read-only understanding, a reading shown on the canvas, a plan of session commands, one transaction to execute; dry run inside a rolled-back transaction; risky steps start expanded                                                | graphty-element; app plan view                     | Multi-step analysis; fuzzy-key join; cleaning loop          | Best-evidenced pattern for multi-step work (Kazemitabaar et al., UIST 2024, strong)                     | People approve plausible wrong plans (He et al., CHI 2025, moderate); unusable on small models                       |
| Merge and join command                                               | A new element command with matching in the element or algorithms, parsing from graph-io, review grouped by confidence band                                                                                                          | graphty-element, algorithms, graph-io              | Duplicate merging; fuzzy-key join                           | Usable with or without the agent                                                                        | High effort; its own reviewed proposal                                                                               |
| Agent may edit only its own work                                     | Option: the agent changes person-made layers and data only through a proposal; an identity callback says who decided; an in-memory decision log                                                                                     | graphty-element                                    | Investigations; cleaning loop                               | Mirrors the rule that algorithm styles write only to their own results                                  | The log's export format is an owner decision                                                                         |
| User-stated constraints                                              | "Never touch the Region column" held as enforced state, not prompt text                                                                                                                                                             | graphty-element                                    | Cleaning loop; joins                                        | Prompt rules get broken (the Replit incident, 2025-07)                                                  | One more state to show                                                                                               |
| Structured questions                                                 | An ask-the-person tool with a flat form schema, asked only in the read-only phase; no secret-shaped fields                                                                                                                          | graphty-element; app form                          | Schema inference; duplicate merging                         | Clarifying beats guessing                                                                               | Over-asking annoys                                                                                                   |
| Vision on the canvas                                                 | Image parts in messages; capture refused while a never-send column drives any visible channel; images paired with exact facts                                                                                                       | graphty-element                                    | Style by description; photo to graph                        | Valuable for a visual product                                                                           | Many tokens per image; a picture can look right while the data is wrong                                              |
| Saved-view sequences                                                 | One format for tours, slides and embed presets, built on the existing saved-view commands; view operations only; plays with no model                                                                                                | graphty-element                                    | Slide deck; standalone page; eyes-free use                  | Mostly wiring; no model needed                                                                          | The format is a one-way door once published                                                                          |
| Fact-check sheet, figure export, color-blind audit, export allowlist | Bound claims re-run before export with unbound sentences counted; raster at set DPI and vector export; palette check; exports carry only visible, non-excluded data with formula cells escaped                                      | graphty-element, graph-io                          | Journal figure package; standalone page; methods package    | Rechecks published claims against live data                                                             | Most interpretive sentences stay unbound                                                                             |
| Localhost model server                                               | Base URL to Ollama or LM Studio; a setup check reports wildcard origins, Chrome's local-network permission (Chrome 142, 2025-10-28) and the server version                                                                          | graphty-element facts; app guide                   | Local-only uses                                             | Today's most capable private option with real tool calls                                                | Setup friction; not on phones                                                                                        |
| In-browser model with constrained tool calls                         | The two Hermes models already take tools through WebLLM's own function calling; for the text-only models, tools in the prompt, output forced to a JSON schema, a short tool list; a worker engine for both; results in suggest mode | graphty-element                                    | Keyless single commands                                     | Small models went from 79-93% to 100% valid output under constraints (arXiv 2609.23742, moderate)       | Fixes syntax, not understanding; 4 to 4.5 GB downloads for the tool-capable models; shares the GPU with the renderer |
| Measured capability table                                            | Per-model results from the suite: tool calling, images, structured claims; a mode the model cannot do is refused, not offered degraded                                                                                              | graphty-element                                    | All                                                         | Honest model offering (the gap behind issue #1681)                                                      | Upkeep with every model release                                                                                      |
| MCP server adapter (unpublished)                                     | Command descriptors as MCP tools from the browser-free core; a small Node package serves them; one call is one transaction                                                                                                          | graphty-element (adapter); new private package     | graphty as an MCP server; standalone page                   | Reach without a key or a model; answers the strategic question                                          | Graphty labels become an injection source into hosts with shell and mail tools                                       |
| Typed open-data connector (one)                                      | Wikidata entity search plus id lookup, as an optional package the element loads; the model fills validated slots and never builds URLs; a local watchlist matcher needs no network                                                  | Optional package; graphty-element                  | Wikipedia or SPARQL to graph; literature map                | Containment by argument validation (CaMeL, strong)                                                      | The sources analysts need most are keyed or licensed; each source needs upkeep                                       |
| Skills (instructions only)                                           | A registry of instruction packs whose descriptions sit in context and bodies load on demand; a docs pack ships with the element                                                                                                     | graphty-element                                    | Help desk; algorithm advisor                                | Open format with broad adoption; cheap                                                                  | Low value until the tool count outgrows the context                                                                  |
| Tool search                                                          | Search over the element's catalogs, activating a short tool list per request; core tools always loaded                                                                                                                              | graphty-element                                    | All, once tools roughly double                              | Large accuracy gains at big catalogs (RAG-MCP, moderate)                                                | An extra round trip                                                                                                  |
| Lifecycle hooks (allow or deny)                                      | Before model and tool calls, with reason codes; also checked at plan time                                                                                                                                                           | graphty-element                                    | Governance; purpose checks by embedders                     | Deterministic enforcement for third parties                                                             | Defer until one real embedder asks; hooks limit the model, not the user                                              |
| Null models and removal curves                                       | Degree-preserving rewiring and node-removal curves as new algorithms                                                                                                                                                                | algorithms                                         | Null-model testing; resilience                              | Covers rigor cases with no code sandbox                                                                 | New algorithm work, effort high                                                                                      |
| Investigation helpers                                                | Shared-attribute link inference (the core move in the Panama Papers work), an "as of" date view, an edge status role (alleged, confirmed) the agent may never upgrade, a per-edge source view                                       | graphty-element over algorithms                    | Provenance; documents to graph; investigations              | Analyst demand                                                                                          | Several new element features                                                                                         |
| WebMCP registration (spike)                                          | Register the command descriptors with the browser's agent API, off by default, read-only                                                                                                                                            | graphty-element                                    | graphty inside other agents                                 | No server, no key                                                                                       | One browser, origin trial, renamed within a year                                                                     |
| Remote MCP client (read-only)                                        | Servers the embedder configures, with pinned definitions and untrusted results                                                                                                                                                      | graphty-element                                    | Literature map; bug report                                  | One integration reaches many services                                                                   | Browser cross-origin rules; each server is an injection channel; wait for the injection gate                         |
| Queued and mid-turn messages                                         | A message sent during a run is queued and handed to the model at the next tool boundary (Claude Code's steering), or held until the run ends, as a consumer option                                                                  | graphty-element                                    | Selections; self-correcting analysis                        | Lets the person redirect without cancelling and losing the work                                         | A correction can arrive after the step it was meant to stop                                                          |
| Sign-in key broker                                                   | OAuth with PKCE against a broker such as OpenRouter mints a spend-limited key, so the reader never pastes a provider key; the callback page is the embedder's, passed as an option                                                  | graphty-element flow; app callback page            | All, for readers without a provider account                 | Easier first run; per-key spend limits                                                                  | Still a bearer key in the page; a third-party dependency and data processor                                          |
| Reasoning effort pass-through                                        | The provider's reasoning or thinking budget as a consumer option whose default is the provider's own                                                                                                                                | graphty-element                                    | Multi-step analysis                                         | Nearly free to add                                                                                      | Little measured gain on short graph commands; more tokens                                                            |
| Voice in immersive mode                                              | Speech input offered in the element's VR and AR user interface, where there is no keyboard; refused in local-only mode because browser speech recognition is server-based in Chrome                                                 | graphty-element XR UI                              | Eyes-free and hands-free use                                | The only practical text entry in a headset                                                              | Recognition quality varies by browser and headset                                                                    |

### 6.2 With a desktop or mobile app

| Feature                                                      | How it would work                                                                                                                                                    | Owner                                                                                                                                                                                                                              | Use cases                                   | Strengths                                         | Weaknesses                                                                                                                                                                       |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local MCP servers and one-click bundles                      | The shell supplies a stdio transport to the element's MCP client; servers off by default, pinned by hash                                                             | Desktop shell; element plug point                                                                                                                                                                                                  | Literature map; bug report; nightly refresh | The largest unlock for outside-world capabilities | Servers run with full user privileges (supply chain)                                                                                                                             |
| OS keychain key storage                                      | The element's key-provider callback backed by the keychain                                                                                                           | Desktop shell                                                                                                                                                                                                                      | All                                         | Fixes the weakest point of web key handling       | Electron on Linux without a secret service falls back to a hard-coded password; refuse to persist then                                                                           |
| Unattended scheduled runs and monitoring                     | A recipe replayed against re-imported data, alerting only; outbound payloads limited to fixed templates; standing approvals expire                                   | New package or shell; element supplies replay and diff                                                                                                                                                                             | Nightly refresh and digest                  | Unattended value                                  | Alert fatigue; spends tokens while the user is away; iOS forbids unattended background work                                                                                      |
| Durable execution                                            | Long runs survive restarts by replaying a log (the element's journal)                                                                                                | Shell or package                                                                                                                                                                                                                   | Nightly refresh                             | Robust long runs                                  | Infrastructure; idempotent tools                                                                                                                                                 |
| Web fetch and account connectors without cross-origin limits | Generic fetch and OAuth connectors with tokens in the keychain                                                                                                       | Connectors that turn outside data into graphs are optional element packages, as the typed open-data connector is; the shell supplies only the transport and the keychain; the element owns the policy                              | Find me a graph; literature map; bug report | Removes the browser's biggest block               | Completes the lethal trifecta; needs the taint rule and approvals                                                                                                                |
| Native local models and code sandbox                         | Bigger local models; Python with graph libraries under an OS sandbox                                                                                                 | Shell; element plug points                                                                                                                                                                                                         | Null models; repair a file                  | No browser limits                                 | Large standing maintenance cost                                                                                                                                                  |
| Skills with scripts, plugins and marketplaces                | Bundles that carry code, run sandboxed                                                                                                                               | Shell for distribution and the sandbox; what a plugin adds to the graph (algorithms, layouts, data sources, agent tools) registers through graphty-element's existing extension points, so a web consumer can load the same plugin | Domain uses                                 | Distribution and reuse                            | Code with the user's authority; no signing or revocation                                                                                                                         |
| Watched folders and folder access everywhere                 | File access on every engine, not only Chromium                                                                                                                       | Shell                                                                                                                                                                                                                              | Batch runs; recipes                         | Local data stays local                            | None beyond the shell                                                                                                                                                            |
| Synced memory across devices                                 | A store the shell or an account supplies                                                                                                                             | Shell                                                                                                                                                                                                                              | Long-running projects                       | Fewer repeated corrections                        | A privacy store that erasure must reach                                                                                                                                          |
| Mobile: platform on-device models                            | Apple Foundation Models (8K context on device, free 32K Private Cloud Compute model with tool calling, WWDC26) or Android's ML Kit Prompt API, bridged as a provider | Native shell; element provider interface                                                                                                                                                                                           | Photo to graph; eyes-free use               | Free, private, keyless on recent phones           | Native-only; Android tool calling unconfirmed; Private Cloud Compute is off-device                                                                                               |
| Mobile: camera capture and voice                             | Note: the phone browser already takes photos and speech, so these do not need a native app                                                                           | graphty-element in mobile web                                                                                                                                                                                                      | Photo to graph                              | No native work                                    | Vision models are weak at arrow direction                                                                                                                                        |
| MCP resources and prompts                                    | With the MCP server: current graph, schema and selection as resources                                                                                                | MCP package                                                                                                                                                                                                                        | graphty as an MCP server                    | Richer integration                                | Client support looks low: a search summary put it at about 38-39% of clients, but the figure is unsourced (the tracker it came from could not be opened to check it); spec churn |

Revisit triggers (measured, not dated): the share of people in the MCP experiment who would use
graphty through a desktop assistant; recipe downloads replayed per user; and for mobile, a one-day
test of 20 real whiteboard and org-chart photos through two frontier vision models, scored for
nodes and edge direction against hand labels. When a trigger fires, the lead desktop case is
watchlist monitoring that only alerts, and the shell choice (Electron versus Tauri) is measured on
graphty's real scenes first, because Tauri on Linux renders through WebKitGTK.

### 6.3 Not worth it

| Feature                                                                     | Reason                                                                                                                                                                                           |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Model best-of-N (run the same request several times and pick)               | N times the user's money for a canvas they can undo; the deterministic layout bake-off covers the visual case                                                                                    |
| Script-held multi-agent orchestration, handoffs, group chat, manager agents | Graph editing is shared state; MAST attributes 41-87% failure rates to multi-agent systems, mostly specification and coordination failures (arXiv 2503.13657, strong); AutoGen is in maintenance |
| Sub-agents by default                                                       | About 15 times the tokens of a chat on the user's key (vendor figure); parallel writers conflict; revisit only when graphty's own evals show a gain on read-only research                        |
| Tree search over plans                                                      | Many times the cost; not an interactive pattern                                                                                                                                                  |
| A same-model self-review pass                                               | Self-correction without new evidence does not help reasoning (Huang et al., ICLR 2024, strong); seeded sweeps and recomputed claims are the better check                                         |
| A risk classifier instead of approvals                                      | Approvals are rare because undo covers graph edits; a second paid call to save a few clicks; self-rated risk is weak. Reconsider only for unattended desktop runs                                |
| Sleep-time memory agents                                                    | Spend tokens while the user is away; vendor-only quality claims                                                                                                                                  |
| Cross-project user memory (in the web app)                                  | An injection target that steers every later turn; project memory is enough now                                                                                                                   |
| Project instruction files as a separate feature                             | Overviews do not raise success and cost over 20% more (ETH Zurich, moderate); specific rules belong in enforced settings                                                                         |
| Personas and output styles                                                  | Overtrust risk with identities (Lee and See, 2004, strong); only the tool-set half is enforceable                                                                                                |
| Provider-hosted web search, fetch and code while graph data is in context   | Runs on the provider's servers, so it cannot be held for approval; a URL planted in a dataset value becomes fetchable                                                                            |
| A generic fetch-any-URL tool in the browser                                 | Completes the lethal trifecta; typed connectors with fixed origins do the job                                                                                                                    |
| A code sandbox in the browser (now)                                         | The largest security surface; QuickJS has no graph libraries and removing Pyodide's network access is unverified; the element already computes the statistics                                    |
| A2A, AG-UI, ACP                                                             | Need an endpoint or a server-side loop; none of the 40 use cases needs them                                                                                                                      |
| MCP sampling, roots and logging                                             | Deprecated in the 2026-07-28 MCP release                                                                                                                                                         |
| MCP Tasks                                                                   | Wire format changed twice in eight months                                                                                                                                                        |
| Realtime voice agents                                                       | One vendor, a separate loop; speech in and out through the browser covers accessibility                                                                                                          |
| A graphty-run token server                                                  | graphty runs no server; the endpoint options cover gateways                                                                                                                                      |
| Chrome's built-in model, small helper models (now)                          | Experimental, one browser, Nano-class quality; local embeddings help only duplicate matching. Low priority, not rejected                                                                         |
| Slide and document generators                                               | Low value for analysts; slides come from saved-view sequences                                                                                                                                    |
| Slash commands and saved prompt templates                                   | Starter prompts, recipes and the app's quick actions cover the need; for outside agents, MCP prompts and skills do                                                                               |
| Preference memory the model writes                                          | Text in a loaded dataset can persuade the model to save it, steering every later session; the repository's UI principles leave what persists to the reader, not the assistant                    |

---

## 7. The harness designs, best first

The designs are not mutually exclusive. Three of them form an autonomy ladder on one shared core
(the person drives; the agent drives within a plan; programs drive), two are deployment profiles
(where the model runs), and three are platforms. The ranking combines the reviewers' scores, their
votes, and each design's role in the build order.

Scores: the criteria scorer's weighted total (out of 100, a convenience only) and per-tier averages
on a 0 to 10 scale where 5 is today's assistant; then the five other lenses out of 10 (harness
engineer, product and UX, security and privacy, analyst user, architecture). Votes: Y viable, C
viable with changes, N not viable, in the order criteria scorer, harness engineer, product and UX,
security, analyst, architecture. All scores are from the last review round, on the version before
that round's changes. "Real users succeed" is 5 for every design because no design has been tested
with people.

### 7.1 Canvas copilot on a hardened shared core (recommended first build)

**Concept.** The person explores; the agent answers about what is on screen and makes or proposes
small changes. It runs on a shared core that every other design also needs: the loop, tools,
memory, limits, approvals and events, all inside graphty-element, reaching only the loaded graph
and sending data only to the chosen provider.

**How it works.** Each batch of tool calls runs in a short transaction and History groups a
message's batches into one undo step, so the person can keep editing while the model thinks. At
the default "assist" level, reversible style, selection and visibility changes apply at once and
show in the change summary with an undo; anything structural, bulk, destructive or touching work
the person made ends the message with a preview built from `plan()`. Applying is the person's action
only, through a single-use id bound to the message and a hash of the command list; the element
replays the recorded commands exactly. Panning, selecting and read-only follow-ups leave a pending
preview alive; data changes make it stale. A recoverable error returns a code and the loop
continues; a throw rolls back the batches already applied and says how many. An algorithm whose
cost estimate passes the consumer's threshold ends the message with an approval.

**Walkthrough** (numbers illustrative). A procurement analyst lassoes 30 suppliers. On her first
send, the disclosure names the provider host and the columns sent; bank details are marked
never-send and filtered from everything, including labels. The answer cites supplier ids and
states its scope, including 3 matching suppliers her filter hides. "Why does Kestrel rank so high"
highlights 20 of 1,140 supporting paths; dismissing restores her view. "Color these by country"
applies at once with an undo. "Turn my risk layer red where spend is over 1M" touches a layer she
made, so it previews; she asks a follow-up question, the preview stays, and she applies 12 of the 14. She undoes a message; it stays in her transcript marked undone, and the model is told.

**Features.** Priority 0 and 1 of section 6.1 in full; previews with autonomy levels, batch apply in
one transaction with every revision checked first, path citations capped with totals, neighborhood
expansion and "what changed since I last looked" from priority 3.

**Coverage.** Who matters most; plain-language selections; why ranked high; style layer debugger;
what am I looking at; schema inference; duplicate detection (until merges, as review only); name
the communities; self-correcting analysis; partly explain this graph, style by description,
fuzzy-key join, eyes-free use.

**Scores.** Copilot: total 74.8; gates 8.2, release-critical 7.2, important 7.3, nice 6.2;
lenses 8, 8, 8, 8, 8. Shared core alone: 72.9; lenses 7, 7, 8, 7, 8.

**Verdicts.** Copilot C C C C Y C; core C C C C C C. The strongest mixed-initiative fit in the set
(Horvitz, CHI 1999; Amershi et al., CHI 2019; both strong).

**Remaining objections.** No multi-step analysis from one prompt (that is plan mode's job). Merges
wait for an element merge command. The "assist" level trusts undo, so the change summary must make
every change visible. The core's first slice still has about 25 items, of which six are new
mechanisms. The short-transaction fix needs new History grouping and has not been re-reviewed
against the History code.

### 7.2 Model-free pipelines and seeded sweeps (with recipes as an experiment)

**Concept.** The "programs drive" rung. Built-in pipelines (quality report, version comparison,
methods facts) and seeded robustness sweeps ship as buttons that also work as tools; the model only
routes, fills parameters, names and summarizes. Replayable recipes are a second, experimental part.

**How it works.** A pipeline is a fixed command sequence in one transaction. A sweep runs the same
algorithm N times off the main thread, records every seed, and reports the spread of each result.
A recipe replay is one transaction, each step checked with `plan()` and a data fingerprint; a
missing column or type change stops it, while drift in meaning only warns until false positives are
measured on real monthly data. A recipe someone else wrote shows its full command list, can only
narrow limits, and cannot add outbound or export steps. Model output never fills a URL or free
argument.

**Walkthrough** (numbers illustrative). A nonprofit data lead runs the quality report: 212
duplicate-looking names (handed to the copilot's preview) and 3% of donors with no program. A
20-seed Louvain sweep reports each community's best-match Jaccard spread; her app's threshold
labels two of them fragile, and the label follows them into any claim citing them. Communities are
labeled by attribute evidence ("62% Midwest, 30% monthly givers"). She downloads "Monthly donor
cleanup" as an experimental recipe; next month a renamed column stops the run as a schema break,
she maps it, and the run is one undo step.

**Coverage.** Algorithm advisor; say when the graph cannot answer; resilience and null models (with
the new algorithms); layout bake-off; data quality report; cleaning loop as a recipe; methods
package; help desk; record a session as a recipe; parameter sweep; partly explain this graph,
compare versions, slide deck, figure package, bug report; nightly refresh once headless.

**Scores.** 75.8 (highest); gates 8.2, release-critical 7.5, important 7.2, nice 7.0; lenses 8, 7,
8, 8, 8. **Verdicts.** C C Y Y C C.

**Remaining objections.** Brittle outside known task shapes. People who do not program rarely adopt
macros (Mackay, CHI 1991, moderate), so recipes stay experimental and their format internal.
Null-model rewiring and workers are real new work.

### 7.3 Hosted model profile: your own key, or your organization's gateway

**Concept.** The default deployment. The browser calls a hosted model either with the user's own key
or through an organization's gateway. There is no graphty server.

**How it works.** Keys are held in memory by default, with a key-provider callback; the app offers
three persistence choices at paste time, worded honestly, and keys an older version stored are
reported once for keeping or purging. A gateway is reached through base URL, headers and a fetch
override that only embedder code may set; short-lived tokens come through the fetch override, and
no key reaches the page. Free Gemini keys may train on inputs and the key does not reveal its tier,
so on projects marked confidential the first send waits for the person to confirm their tier. The
docs' example proxy is authenticated, forwards only to a fixed upstream, applies per-user quotas
and logs no prompt bodies. A strict Content-Security-Policy and Trusted Types are a release gate.

**Walkthrough.** A research-office analyst pastes a key and picks "this tab across reloads"; the
disclosure names the host and the data sent; an older stored key is found and she purges it. At an
insurer, the same element points at the company gateway; `ssn` and `bank_account` are never-send;
no key reaches the page.

**Scores.** Own key 74.4, lenses 8, 7, 7, 6, 8; organization endpoint 74.2, lenses 7, 6, 8, 5, 7.
**Verdicts.** C C C C Y Y and Y C Y C Y C.

**Remaining objections.** Re-entering keys is friction; the user pays; data goes to a third party;
a compromised dependency can still read a key held in the page, which only the gateway path
removes; organizational demand is hypothetical.

### 7.4 graphty inside someone else's agent (the first experiment)

**Concept.** No loop of its own: another assistant drives graphty over MCP. Its first job is the
strategic experiment of section 3: on the same tasks and model, does graphty's own harness beat a
general assistant using the same commands?

**How it works.** After the tool port, a small unpublished Node package bridges an MCP server to a
live element in one long-lived headless browser, so selection, viewport and capture are real on
both arms. Each connection gets its own session; each call is one transaction attributed to the
client, and undo tokens undo only that connection's calls. The scored arm is a minimal MCP client
loop under the team's control with the same model; Claude Desktop is an unscored observation because
its prompts cannot be controlled. Grading uses state diffs and fixed answer keys; refusals are
scored separately. The bridged browser blocks every request except the bridge; only public or
synthetic data; read and analyze tools only until the injection set passes on two hosts; file access
through a configured directory allowlist, opened once and read from the handle. Graph text goes to
the host as structured content marked untrusted.

**Walkthrough.** On a synthetic airline graph, the client arm runs betweenness, Louvain and a style
as three calls, three undo steps. An injected airport label arrives as an untrusted value. An export
request is refused, naming "open in graphty", and scored as a refusal. The same tasks run through
graphty's harness; the state diffs decide.

**Coverage.** Directly: graphty as an MCP server, standalone page, record a session; through hosts,
most analysis cases, at the host's quality.

**Scores.** 59.1 (the criteria were written for an in-element harness, so this design scores low by
construction); lenses 8, 6, 6, 5, 8. **Verdicts.** C C Y C Y C.

**Remaining objections.** graphty becomes an injection source into hosts that have shell and mail
tools (MCPTox reports tool poisoning succeeding up to 72.8% of the time with refusal under 3%,
arXiv 2508.14925, moderate). Provenance display and undo belong to the host. A host win on task
success does not settle the question unless it also wins on catching errors. Newsroom and
enterprise IT often block local MCP servers.

### 7.5 Plan, preview and approve (multi-step, staged)

**Concept.** For multi-step or destructive work: the agent understands with read-only tools, shows
its reading on the canvas, proposes a plan of ordinary session commands, and runs it in one
transaction that never pauses.

**How it works.** Three stages, because three capabilities it assumed do not exist yet. Stage 1:
plans over existing commands, with counts for independent steps and dependent steps marked "count
after step N". Stage 2: a dry run inside a transaction that rolls back, rendering suppressed, with
progress and cancel and a capped fact when the estimate refuses it. Stage 3: joins and merges
through a new element command. Questions are asked only in the read-only phase, with answer options
taken from the data and none preselected. Steps with consequences start expanded and Approve waits
until they are opened (a consumer option; Bucinca et al., CSCW 2021, strong). Drift during execution
rolls back and returns "replan needed" with what was expected and found. Undo is the whole message;
"undo and replan from step N" comes before nested step undo. Ships only on models the capability
table shows can plan.

**Walkthrough** (numbers illustrative). A buyer joins a contracts CSV to a supplier graph and says
not to touch the Region column. One batched question, with the two "Smith Logistics" records as the
options, keeps them separate. The dry run gives counts: 1,141 exact matches, 52 normalized-name
matches, 9 low-score matches reviewed one by one, 73 unmatched, 23 merge clusters. One cluster
would merge two people with no shared id, so it stays a proposal. She removes the style step and
approves. A 20-seed sweep shows 8 of the 9 cited single points of failure in every run.

**Coverage.** Multi-step analysis; compare versions; provenance; repair a file; duplicate merging;
cleaning loop; fuzzy-key join; record a session (joins from stage 3).

**Scores.** 74.9; gates 8.1, release-critical 7.5, important 7.1, nice 7.0; lenses 6, 7, 7, 6, 7.
**Verdicts.** C C C C C C.

**Remaining objections.** People still approve plausible wrong plans (He et al., CHI 2025,
moderate; Parasuraman and Manzey, 2010, strong), so a 5 to 8 analyst study measuring acceptance of
both correct and wrong plans gates it. The largest API surface and app UI. Joins are high-effort
new element API. Unusable on today's in-browser models.

### 7.6 Author and present: checked claims, exports and saved views

**Concept.** Publishing and the "view-only" rung for readers who did not build the graph: a saved
sequence of views whose claims recheck against the live graph, serving tours, slides and embed
presets, plus a fact-check sheet, checked figures and standalone pages.

**How it works.** The element owns sequences, claims, re-runs, stale facts and the export payload;
the app or a package arranges and words them. A sequence may hold only view operations. Before an
export or on page load each bound claim re-runs once per algorithm and seed. The fact-check sheet is
a copyable list of bound claims with current values and a prominent count of unbound sentences, so
"bound" is never read as "verified". An author-set edge status (alleged, confirmed) the agent may
never upgrade feeds person review and exports. Exported pages escape text themselves, with CSP as a
second layer, and never embed a key.

**Walkthrough** (numbers illustrative). A reporter saves five views of her company-and-officer
graph and attaches notes citing the runs behind each number. The sheet shows 14 claims current, 1
stale after a colleague's correction, 6 sentences unbound. Two edges are marked alleged and the
export says so. The figure passes the color-blind audit, and the page plays the sequence with no
model or key. A blind colleague moves through each stop's list of nodes and neighbors by keyboard.

**Coverage.** What am I looking at; data quality report; slide deck; methods package; figure
package; standalone page; eyes-free use (text alternatives); strengthened compare versions,
provenance, help desk.

**Scores.** 73.5; lenses 6, 6, 7, 7, 6 (the guide design merged into it scored 67.9). **Verdicts.**
C C C Y C C.

**Remaining objections.** Most interpretive sentences stay unbound. The sequence format is a one-way
door once published. Demand concentrates in reporters and presenters.

### 7.7 Local-only profile: no graph data leaves this device

**Concept.** A deployment mode of the core. The shipped promise is that graphty works fully without
a model, and a localhost model server adds language: "No graph data leaves the device; model weights
are downloaded once." Never "nothing leaves".

**How it works.** No-model answers, paths, neighborhoods, pipelines, sweeps and local watchlist
matching all work with no model. A `localOnly` option is enforced in the element's transport: it
refuses non-loopback hosts, provider-hosted tools and server-based voice input. Telemetry is the
consumer's assertion, proved by a whole-app no-request test that forces an error. The setup check
reports wildcard origins, a denied local-network permission and the server version (with a
consumer option to refuse versions below a documented minimum; Ollama's remote-code-execution flaw
CVE-2024-37032 was fixed in 0.1.34). Requests beyond the model return a code naming the model-free
alternative. The in-browser tier follows later, with weights, model WASM and tokenizer pinned and
hashed.

**Walkthrough** (numbers illustrative). A shelter coordinator opens a confidential case graph. Fuzzy
matching proposes 14 merges and articulation points run with no model. Her IT contact's Ollama
answers with a wildcard origin; the setup check reports it and shows the exact origin to set;
Chrome then asks her to allow local network access.

**Scores.** 74.3; gates 8.6 (minimum 8, the highest floor); lenses 6, 6, 7, 6, 6. **Verdicts.** C C C
C C C.

**Remaining objections.** The people who most need it can least easily run a server. Small models
call tools unreliably (Berkeley Function Calling Leaderboard, strong as measurement).

### 7.8 Open-data scout: the graph plus typed public sources

**Concept.** Build or enrich graphs from public data only through typed connectors with fixed
origins; the model fills validated slots and never builds URLs or queries. One connector first, plus
a no-network path for investigators: matching the graph against a list the person supplies.

**How it works.** A request for outside data becomes a plan of exact connector calls. A call runs
without asking only when every slot is a constant, text the person typed or an id the person picked
from a search list, and no graph or fetched data is in the model's context; otherwise it waits for
approval, which shows the computed id set and the destination and says the import can be undone but
the request cannot. Fetched strings are stored with "fetched" provenance, stripped and capped.

**Walkthrough** (numbers illustrative). A teacher picks the starter prompt "Nobel laureates and
their supervisors", types "Nobel Prize in Physics", picks the prize from the results, and the lookup
runs without asking: 228 laureates, 391 links, 31% missing, CC0. Separately, an investigator matches
a sanctions list she licensed against her company graph on the device: 4 exact and 7 fuzzy matches
go to review, and nothing leaves the page.

**Scores.** 70.8; lenses 6, 6, 5, 5, 6. **Verdicts.** C C C C C C.

**Remaining objections.** The sources analysts need (GLEIF, OpenCorporates, OpenSanctions, EDGAR)
are keyed, licensed or unmeasured for browser access; each source carries upkeep; the third party
still logs whatever is sent to it.

### 7.9 Desktop app (later, on triggers)

**Concept.** Local tools, accounts and unattended runs. Nothing desktop-specific is built now; the
plug points it would need (a key-provider callback, endpoint options, the browser-free core) are
needed by other designs anyway.

**How it would work.** The shell hosts graphty-element unchanged and adds no graph logic. A
scheduled job is a recipe; drift stops it before any outbound step and queues a question. Local MCP
servers off by default and pinned by hash; no session holds both an outbound server and a
local-data server without per-call approval; Electron with context isolation, sandboxing, no Node
integration and signed updates.

**Walkthrough.** If revisited: a nightly watchlist of 60 company nodes runs against a list the
analyst supplied; two new matches produce an alert showing which attributes matched and how
confidently; she opens them in review. Nothing is posted.

**Scores.** 70.6; lenses 5, 5, 5, 4, 6. **Verdicts.** Y Y C C Y C.

**Remaining objections.** The largest standing maintenance cost and attack surface, and no demand
signal yet.

### 7.10 Mobile (measure first)

**Concept.** The one strongly mobile use case, photo to graph, is an import that also works in the
phone browser. Nothing is built until a one-day measurement says extraction is good enough.

**How it would work.** Step 1: 20 real whiteboard and org-chart photos through two frontier vision
models, scored for nodes and edge direction. Step 2, on desktop web: a 5-person correction test
measuring missed errors as well as time. Photo and extracted graph side by side, low-confidence
edges linked to their spot in the photo; EXIF stripped and a crop step shown by default; every
extracted edge marked unverified.

**Scores.** 70.1; lenses 4, 5, 7, 3, 5. **Verdicts.** C C C Y C C. (A native mobile companion was
dropped in an earlier round, four of six lenses rating it not viable.)

**Remaining objections.** Vision models are weak at arrow direction; bystanders appear in photos;
analysis is cramped on a phone. Two lenses would fold this design into the document-extraction
package entirely.

### Disagreements still open across the designs

- Whether the decision-log export is needed before plan mode ships (the analyst lens: yes, for legal
  review) or after.
- Whether document confidentiality should switch on by default for any project with a column marked
  as people (the analyst lens) or stay the consumer's choice (the neutral-default rule). Kept a
  consumer choice; the element reports that person data is present.
- Whether mobile should stay a separate design.
- None of the last round's fixes (short transactions, rolled-back dry runs instead of a session
  fork, one-transaction batch apply, the telemetry scrubber) has been re-reviewed.

---

## 8. Prototypes

All five extend the existing LLM regression project (`graphty-element/test/ai/llm-regression/`) and
grade end state over repeated runs, under section 3's statistics rules. Paid model runs stay on the
release train; record-and-replay runs are cheap enough for pull requests. Each prototype is built in
its own worktree and lands additively.

### Prototype 1: Reliability baseline

- **Question.** How reliable is today's assistant, how noisy is a measurement, and does AI SDK 7
  change anything?
- **Smallest build.** A public `snapshot()` and `diff()` on the element over the documented scope
  (data, style layers and their order, algorithm results, selection, camera, layout choice and node
  positions, immersive mode). The regression project gains: k runs per case (3 for quality, at
  least 5 for safety); grading by state diff for changing tasks and by required and forbidden facts
  for answers; a held-out third of tasks written by someone outside the prototype team; a check that
  each task fails a do-nothing agent; a record-and-replay provider; 10 injection cases with a canary
  outbound tool; a report of pass^k with Wilson intervals, tokens and seconds per task and model,
  run-to-run noise and the minimum detectable difference. The system prompt moves to one source.
- **Measures.** Per task and model: pass^3, tokens, latency; suite noise; minimum detectable
  difference.
- **Decision rule.** The suite is fit for use when a deliberately broken prompt drops the score by
  more than the measured noise. Then run AI SDK 5 against 7 on it: recommend 7 (in the grouped
  major) if no task regresses beyond the noise in a paired comparison and the extra 48 to 102 kB
  gzip in the lazy entry is accepted; otherwise stay on 5.
- **Where.** graphty-element (snapshot and diff as public API, additive) and its llm-regression
  tests.

### Prototype 2: Graph-native advantage experiment

- **Question.** Does graphty's own harness do measurably better than a general assistant driving the
  same element commands over MCP?
- **Smallest build.** The additive tool port of today's 15 tools onto session commands. An
  unpublished private Node package exposing them as a stdio MCP server, bridged to one live element
  in a headless browser with network blocked except the bridge. A minimal MCP client loop the team
  controls (the AI SDK's MCP client) using the same model, prompt budget and tasks as graphty's
  harness. A third, cheaper arm with zero new API: a documented Node script over the element's
  browser-free `./session` entry, plus a SKILL.md that teaches a coding agent to use it, run in
  Claude Code on the tasks that need no live view.
- **Tasks.** The 10 tasks that need the live view (selection, viewport, layer stack, cost estimates,
  a visual check) plus prototype 1's core tasks; public or synthetic datasets only.
- **Measures.** Paired pass^3 per task, tokens and cost per task, refusals counted separately, and
  for a later human pass, the catch rate of one planted wrong number on each arm. For the script
  arm, the same measures on the no-live-view tasks plus human interventions per task.
- **Decision rule.** If graphty's harness beats the MCP arm by more than the minimum detectable
  difference: invest in the copilot core first (prototype 3). If the gap is within the noise: build
  the MCP server adapter first and bring its package name and tool descriptors to the owner. If the
  MCP arm wins: keep graphty's harness thin and make the server the main path. Separately, if the
  script-and-skill arm comes within the minimum detectable difference of the MCP arm on the tasks
  both can run, ship the script and skill as documentation and build an MCP server only for the
  live-view tasks or for hosts that cannot run code (Claude Desktop). The safety work in section 9
  proceeds in every case.
- **Where.** The adapter in graphty-element's browser-free core; the server as a new private,
  unpublished package.

### Prototype 3: Copilot core

- **Question.** Do conversation memory, view context and an honest, bounded loop make the assistant
  measurably better without ever blocking the person?
- **Smallest build.** Short transactions per tool batch grouped into one undo step; memory within a
  session with "what the person did" and "message undone" facts; selection, viewport and layers in
  context with a scope fact; real streaming; per-message trace and change summary, with the app
  panel's existing props wired and grouped by message; exposure and mutation classes; person-only
  calls; caps, stop codes, loop detection and a compaction policy; never-send enforcement including
  voice input; first-send disclosure; algorithm-cost approval that ends the message.
- **Measures.** On the prototype 1 suite against today's assistant: core task pass^3 (paired); 15
  scripted multi-message conversations including stale-context cases; 10 selection and viewport
  tasks; time a person's edit is blocked during a message (only during a tool batch); first harness
  event under 1 s; the injection set's unrequested-change rate (at least 5 runs per case); request
  bodies captured to check the memory, clear and never-send gates by construction.
- **Decision rule.** Proceed to a release candidate behind an option if every gate test passes,
  core tasks do not regress beyond the noise, and the multi-message and view-context tasks improve
  beyond the minimum detectable difference. If the multi-message rate is more than 15 points below
  the single-message rate, improve context facts and compaction before shipping. Before a public
  release, the repository's simulated-user design studio runs first (labeled weaker evidence), then
  a 5 to 8 person moderated study of agent versus manual UI.
- **Where.** graphty-element `./ai`; the graphty app's AI panel for wiring only.

### Prototype 4: Model-free pipelines and seeded sweeps

- **Question.** On known task shapes, do fixed pipelines match or beat the free loop at a fraction of
  the cost, and are seeded sweeps reproducible without freezing the page?
- **Smallest build.** "Explain this graph" and "data quality report" as fixed command sequences
  returning structured facts (components, degree, communities labeled by attribute evidence, missing
  values, junk hubs), with one optional model call to word the result. A 20-seed Louvain sweep in a
  worker reporting best-match Jaccard per community and NMI overall, with progress and cancel.
- **Measures.** pass^3 against the free loop on the same tasks and model; tokens and latency; with
  no model, the share of required facts produced; sweep reproducibility (the same seeds give the same
  spreads); longest main-thread task and frame rate during a sweep on a 10,000-node graph.
- **Decision rule.** If a pipeline's pass^3 is at least the free loop's and it costs at most a third
  of the tokens, route those task shapes to it by default and offer it with no key. Ship sweeps if
  they are reproducible and no main-thread task exceeds about 200 ms.
- **Where.** @graphty/algorithms (the stability primitives, usable by Node and Cytoscape users too)
  and graphty-element (pipelines, wrapper, worker).

### Prototype 5: Local model tier

- **Question.** Can a model with no cloud key call graphty's tools well enough to be offered, and on
  which tier: a localhost server or an in-browser model?
- **Smallest build.** Base URL and headers reachable through `enableAiControl`; the localhost setup
  check (origin, Chrome's local-network permission, server version); asynchronous WebLLM creation
  inside the element and the app's stub alias removed (bundle checked); the two tool-capable
  Hermes models measured first on WebLLM's own function calling; then prompt-based tool calls with
  JSON-schema constrained output over a 6-tool subset for one text-only model; WebLLM's worker
  engine.
- **Measures.** pass^3 per model on the read-and-style tasks; valid tool-call rate; frame rate during
  inference; download time and GPU memory against the device classes readers use; the network log
  of a whole session (only declared hosts).
- **Decision rule.** Offer a model only if it reaches pass^3 on at least half of the read-and-style
  tasks, and label it with its measured limits; below that, offer it in suggest mode only or not at
  all. If no in-browser model reaches the bar, the in-browser tier is offered as text-only answers
  and the localhost server is the only local path with tools. Ship the local-only mode only when the
  whole-app no-request test passes.
- **Where.** graphty-element providers; the app's settings pane for the setup guide.

Order: prototype 1 first; prototypes 2 and 5 can start once the tool port lands; prototype 3 after
prototype 2's result; prototype 4 can run in parallel with 3, since it needs no model.

---

## 9. Security and trust requirements any design must meet

These hold for every design, whichever is built. They come from the gates of section 3, the
security reviews, and the threat model they require.

**Threat model.** The attackers are: the author of a loaded dataset, shared project, recipe or
skill; a remote MCP server or other outside tool source; a compromised npm dependency or other
script on the same page; the model provider, which receives everything the agent sends (today the
"lethal trifecta" of private data, untrusted content and an outbound channel is already complete
toward the provider); and a malicious or careless embedding page. graphty-element cannot protect a
user from the page that embeds it, and the documentation must say so.

**Enforcement in code, never in prompt text.**

1. Every tool declares its mutation class (read-only, reversible, outbound, irreversible) and its
   exposure (what its result discloses). Any argument that can cause a network request makes the
   tool outbound.
2. Outbound and irreversible calls wait for approval by default (a security default, not a neutral
   one); the embedder may change the policy.
3. Approval arrives only as an element API call carrying the pending call's id. Chat text and model
   output never approve. What is shown for approval is the structured call, never the model's
   summary of it ("Lies-in-the-Loop", OWASP community page, moderate).
4. A tested list of person-only calls the model can never make: applying a preview, approving,
   leaving local-only, widening limits, undoing person-made work.
5. Limits, allowlists, autonomy level, endpoint, headers and keys can be widened only by the
   embedder's code; project files, recipes, skills, memory, URL parameters and the model can only
   narrow them.
6. Taint rule: once graph or fetched data is in the model's context (in graphty, from the first
   turn), every outbound call waits for the person. Format checks are not provenance: a valid-looking
   id the model chose after seeing data is tainted.
7. No person ever waits inside a transaction: an approval or question ends the message and the
   approved action runs as a new linked message.
8. Until the first outbound tool lands with a per-host approval, no tool the model can call reaches
   the network at all, proved by a test. Today no tool is outbound, so this test is a simpler and
   stronger guarantee than any approval gate, and it stays until a typed connector or an MCP client
   replaces it with rules 1 to 6 (section 12, "Approvals and outbound actions").

**Data and keys.**

9. Requests go only to the chosen provider's host; model weight downloads are declared separately.
10. Never-send columns are enforced on every channel: prompts, tool results, style labels and
    tooltips, captures (refused while such a column drives any visible channel), exports, voice input
    and telemetry. The documentation states that derived results can still leak.
11. A disclosure of host and data categories before the first send and whenever either changes.
12. Keys are memory-only by default; persistence is an explicit, honestly worded choice; only a
    proxy or gateway protects a key from hostile page script. A saved key is bound to the endpoint
    origin it was entered for, and no key is persisted on an origin shared with other content
    (today graphty.app serves the app, docs and Storybooks from one origin).
13. No key, prompt, graph value or tool result in thrown errors, traces, telemetry or eval
    artifacts, proved by canary tests: a sentinel key and a never-send canary value must never appear
    in any request body, fact, trace, event or export.
14. Conversation history is not saved in projects by default; clearing it really clears it; memory
    does not cross a dataset boundary by default.

**Untrusted content.**

15. Loaded values never appear in the system prompt's instruction text and are delimited as data.
    Today the schema formatter writes sample values into the system prompt; that moves.
16. Invisible tag and bidirectional-override characters are removed in the copy sent to the model
    and in everything the agent writes into the graph, while legitimate joiners (emoji, Persian and
    Indic scripts) round-trip unchanged.
17. Model text is rendered inert by the app: no auto-loading images, no HTML, links shown in full
    (EchoLeak, CVE-2025-32711, strong). The app ships a strict Content-Security-Policy with
    `connect-src` limited to the providers in use, and Trusted Types.
18. Opening a project, link or URL parameter never runs a model call, recipe or fetch.
19. An injection regression set (values, property keys, column names, schema text, multi-turn and
    adaptive attacks, injection-shaped plans) is a release gate, with tokens spent per injected task
    tracked as a cost-abuse signal.

**Outside tool sources (when any exist).** Remote tool definitions are pinned at approval and need
re-approval when they change; remote tools are classed by the embedder's configuration, never by
their own description; an MCP server graphty exposes returns graph text as untrusted structured
content and never lets the host's model approve its own irreversible call.

**Trust calibration.** Every change comes with a summary with counts; every answer states its scope;
claims carry their source (computed, model, vision) and failed recomputations are shown, never
silently corrected; previews show the change on the canvas, not in prose; uncertainty, ambiguity and
coverage are reported as facts. Explanations reduce over-reliance only when checking is cheaper than
doing the task (Vasconcelos et al., CSCW 2023, moderate), which is why citations are selections.

---

## 10. Rejected ideas and open questions

### Rejected or merged designs

- **Autonomous analyst with a skeptic reviewer.** Dropped (four of six lenses: not viable). It rested
  on multi-agent orchestration and a risk classifier, both judged not worth it, and on unattended
  posting from untrusted inputs. Its valuable parts need no model (seeded sweeps, now in the
  pipelines design) or no autonomy (an on-demand check with fresh evidence, now in plan mode).
- **Native mobile companion.** Dropped (four of six: not viable): unconfirmed Android tool calling,
  an 8K on-device context, two native bridges for one use case the phone browser already serves.
- **Agent as a teammate.** Folded into the core as the "agent may edit only its own work" option and
  a decision log; the "teammate with an identity" framing was dropped as an over-trust risk.
- **Connected workbench.** Split: its files half went into plan mode; its accounts half (OAuth
  connectors, write-back) went to the desktop design, where tokens can live in the OS keychain.
- **Guide (saved tours) and organization endpoint.** Merged into "author and present" and the hosted
  model profile respectively, where several lenses independently found the same mechanism.
- **Adopting an agent framework's loop.** Rejected: the browser rules out most frameworks, and none
  ties an agent turn to the host's undo.
- **Matching a coding agent's feature list.** Rejected as a goal: much of the behavior evidence comes
  from developers in a terminal (for example, users approved about 93% of Claude Code permission
  prompts, Anthropic's own figure in "Beyond permission prompts", 2025-10-20, weak for graphty),
  which supports "ask rarely" but not any rate graphty should expect.
- Features judged not worth it are in section 6.3.

### Open questions

1. Can History group several short transactions into one undo step at acceptable cost? The copilot
   and plan designs depend on it; the fallback is a lazily opened transaction holding only touched
   keys.
2. Does Sentry, with its current integrations, actually serialize the AI SDK error bodies? (The
   scrubber is needed either way.)
3. Do direct browser calls to OpenAI's API work with the user's key? Research found reports both
   ways; Anthropic (with its browser-access header) and Google accept them.
4. How do Safari and Firefox treat a public page calling a localhost model server?
5. Can the two tool-capable Hermes models, or any small in-browser model with constrained output,
   pick the right tool and arguments reliably? Constrained decoding fixes syntax, not
   understanding; graphty's tasks were never measured on any in-browser model.
6. Do WebGL and WebGPU work inside the sandboxed iframes that Claude and ChatGPT use for MCP Apps?
   A one-day spike decides whether a live graphty view can appear inside other assistants.
7. Will people use it? A working natural-language interface is not an adopted one. Only a study with
   real users answers this, and the success criteria require one before release.
8. Which browser-reachable open-data sources (cross-origin rules, rate limits, terms) are usable,
   measured and dated per source?
9. How often do recipe drift warnings fire falsely on real monthly data?
10. How much answer quality does the schema-only mode cost against full disclosure? Prototype 3's
    suite can measure it with one extra arm.
11. Where may saved keys live on graphty.app (an owner decision, section 1)?

---

## 11. Sources

Strength grades: **strong** (peer-reviewed, replicated, or several independent sources), **moderate**
(one solid study, or a primary vendor document describing its own product), **weak** (vendor
performance claims, secondary blogs, search summaries). Web pages accessed 2026-10-08 or 2026-10-09
unless dated otherwise.

### Repository

- Issue #37, https://github.com/graphty-org/graphty-monorepo/issues/37 (opened 2026-09-24)
- Issue #1681, https://github.com/graphty-org/graphty-monorepo/issues/1681 (opened 2026-10-09)
- `design/ai/agent-use-cases.md` (the 507-idea brainstorm, 2026-10)
- `design/ai/ai-sdk-v5-vs-v7.md` (AI SDK version study, 2026-10-08)
- Earlier reports on issue #37: `design/element-api/agent-harness-options.md` (2026-09-21, which agent library can run the loop in a page, settled by building each one) and the 2026-10-08 feature report `design/ai/agent-harness-options.md` (pull request #1671)
- Pull request #1693, "send tools only to in-browser models that accept them" (merged 2026-10-09, closes issue #1681), commit 56e955e6a
- `design/designloom/` (16 personas, 25 workflows); `design/ui/framework/principles.md`; `tools/assemble-pages-site.sh` (what graphty.app serves from one origin); issue #691 (saved keys only obscured) and issue #326 (the AI panel does not say what it sends)
- Code read on master: `graphty-element/src/ai/` (AiController.ts, keys/ApiKeyManager.ts,
  providers/, input/VoiceInputAdapter.ts, commands/), `graphty-element/src/session/` (types.ts,
  planning.ts, notes/types.ts, project/History.ts, project/Dispatcher.ts),
  `graphty-element/api/ai.api.md`, `graphty/src/lib/sentry.ts`, `graphty/src/types/ai.ts`,
  `graphty/vite.aliases.ts`, the app's AiPanel and AiProviderSettings components

### Academic research

- Yao et al., tau-bench, arXiv 2406.12045 (2024-06), https://arxiv.org/abs/2406.12045 -- strong
- Zhu et al., Agentic Benchmark Checklist, arXiv 2507.02825 (2025-07), https://arxiv.org/abs/2507.02825 -- moderate
- Kapoor et al., AI Agents That Matter, arXiv 2407.01502 (2024-07) -- strong
- Trivedi et al., AppWorld, arXiv 2407.18901 (2024-07), https://arxiv.org/abs/2407.18901 -- strong
- Lu et al., ToolSandbox, arXiv 2408.04682 (2024-08), https://arxiv.org/abs/2408.04682 -- strong
- Yao et al., ReAct, arXiv 2210.03629 (2022-10) -- strong
- Yang et al., SWE-agent, NeurIPS 2024, arXiv 2405.15793, https://arxiv.org/pdf/2405.15793 -- strong
- Xia et al., Agentless, arXiv 2407.01489 (2024-07) -- strong for its benchmark
- Wang et al., CodeAct, ICML 2024, https://proceedings.mlr.press/v235/wang24h.html -- strong
- Gou et al., CRITIC, arXiv 2305.11738 (2023-05) -- strong
- Huang et al., Large language models cannot self-correct reasoning yet, arXiv 2310.01798 (2023-10; ICLR 2024) -- strong
- Shinn et al., Reflexion, arXiv 2303.11366 (2023-03) -- strong for coding tasks
- Kim et al., LLMCompiler, arXiv 2312.04511 (2023-12) -- moderate
- Gan et al., RAG-MCP, arXiv 2505.03275 (2025-05), https://arxiv.org/html/2505.03275v1 -- moderate
- Cemri et al., Why do multi-agent LLM systems fail? (MAST), arXiv 2503.13657 (2025-03), https://arxiv.org/abs/2503.13657 -- strong
- Debenedetti et al., Defeating prompt injections by design (CaMeL), arXiv 2503.18813 (2025-03), https://arxiv.org/abs/2503.18813 -- strong
- Beurer-Kellner et al., Design patterns for securing LLM agents against prompt injections, arXiv 2506.08837 (2025-06), https://arxiv.org/abs/2506.08837 -- strong
- Debenedetti et al., AgentDojo, arXiv 2406.13352 (2024-06), https://arxiv.org/abs/2406.13352 -- strong
- MCPTox, arXiv 2508.14925 (2025-08) -- moderate
- Laban et al., LLMs get lost in multi-turn conversation, arXiv 2505.06120 (2025-05), https://arxiv.org/abs/2505.06120 -- strong
- Wu et al., LongMemEval, arXiv 2410.10813 (2024-10) -- strong
- Liu et al., Lost in the middle, arXiv 2307.03172 (2023-07) -- strong
- Lindenbauer et al., The complexity trap: simple observation masking is as efficient as LLM summarization, NeurIPS 2025 DL4Code workshop, https://arxiv.org/abs/2508.21433 -- moderate
- Chroma, Context rot, https://research.trychroma.com/context-rot (2025-07) -- moderate
- tau2-bench, arXiv 2506.07982 (2025-06) -- moderate
- Patil et al., GoEX, arXiv 2404.06921 (2024-04) -- moderate
- Magentic-UI, arXiv 2507.22358 (2025-07) -- moderate
- Kazemitabaar et al., Improving steering and verification in AI-assisted data analysis, UIST 2024, https://austinhenley.com/pubs/Kazemitabaar2024UIST_LLMSteering.pdf -- strong
- He, Demartini and Gadiraju, plan-then-execute trust study, CHI 2025 (N=248), https://dl.acm.org/doi/10.1145/3706598.3713218 -- moderate
- Gu et al., How do analysts understand and verify AI-assisted data analyses, CHI 2024 -- strong
- Bansal et al., Does the whole exceed its parts?, CHI 2021, arXiv 2006.14779 -- strong
- Vasconcelos et al., Explanations can reduce overreliance, CSCW 2023, https://hci.stanford.edu/publications/2023/xai-cscw-2023.pdf -- moderate to strong
- Bucinca et al., To trust or to think (cognitive forcing functions), CSCW 2021 -- strong
- Kim et al., uncertainty expressions and reliance, FAccT 2024 (N=404), https://arxiv.org/abs/2405.00623 -- moderate
- Amershi et al., Guidelines for human-AI interaction, CHI 2019, https://www.microsoft.com/en-us/research/wp-content/uploads/2019/01/Guidelines-for-Human-AI-Interaction-camera-ready.pdf -- strong
- Horvitz, Principles of mixed-initiative user interfaces, CHI 1999 -- strong
- Lee and See, Trust in automation, Human Factors 2004, https://doi.org/10.1518/hfes.46.1.50_30392 -- strong
- Parasuraman and Manzey, Complacency and bias in human use of automation, 2010 -- strong
- Bainbridge, Ironies of automation, 1983, https://doi.org/10.1016/0005-1098(83)90046-8 -- strong
- Shneiderman, Human-centered AI, arXiv 2002.04087 (2020-02) -- strong for the principle
- Anderson et al., habituation to security warnings, CHI 2015; Akhawe and Felt, USENIX Security 2013 -- strong
- Wu, Miller and Garfinkel, Do security toolbars actually prevent phishing attacks?, CHI 2006 -- strong
- Mackay, Triggers and barriers to customizing software, CHI 1991 -- moderate
- Gao et al., DataTone, UIST 2015, https://doi.org/10.1145/2807442.2807478; Setlur et al., Eviza, UIST 2016 -- moderate
- Fatemi et al., Talk like a graph, arXiv 2310.04560 (2023-10); Wang et al., NLGraph, arXiv 2305.10037 -- strong
- Gloaguen et al., Evaluating AGENTS.md, arXiv 2602.11988 (2026-02) -- moderate
- McMillan, Instruction adherence in coding agent configuration files, arXiv 2605.10039 (2026-05) -- moderate
- Agrawal et al., GEPA, arXiv 2507.19457 (2025-07) -- moderate
- Constrained decoding for small tool callers, arXiv 2609.23742 (2026-09-20) and arXiv 2609.07370 (2026-09-07) -- moderate
- Ruan et al., WebLLM, arXiv 2412.15803 (2024-12), https://arxiv.org/abs/2412.15803 -- strong for feasibility
- Berkeley Function Calling Leaderboard, https://gorilla.cs.berkeley.edu/leaderboard.html (living page) -- strong as measurement
- Feng, McDonald and Zhang, levels of autonomy, arXiv 2506.12469 (2025-06) -- moderate
- Pista, arXiv 2604.20070 (2026-04, N=8 and N=16) -- weak

### Coding-agent harnesses (vendor documentation, moderate for existence)

- Claude Code: How it works https://code.claude.com/docs/en/how-claude-code-works ; hooks https://code.claude.com/docs/en/hooks ; sub-agents https://code.claude.com/docs/en/sub-agents ; checkpointing https://code.claude.com/docs/en/checkpointing ; permission modes https://code.claude.com/docs/en/permission-modes ; memory https://code.claude.com/docs/en/memory ; workflows https://code.claude.com/docs/en/workflows ; scheduled tasks https://code.claude.com/docs/en/scheduled-tasks ; plugins https://code.claude.com/docs/en/plugins ; Agent SDK https://code.claude.com/docs/en/agent-sdk/overview
- Anthropic, Claude Code auto mode (2026-03-25), https://anthropic.com/engineering/claude-code-auto-mode -- weak for graphty (developers in a terminal)
- Anthropic, Beyond permission prompts (2025-10-20, the 93% approval figure), https://www.anthropic.com/engineering/claude-code-sandboxing -- vendor figure, weak for graphty
- OpenAI Codex docs, https://learn.chatgpt.com/docs ; Codex for (almost) everything (2026-04-16), https://openai.com/index/codex-for-almost-everything/
- InfoQ, OpenAI's Codex app server (2026-02), https://www.infoq.com/news/2026/02/opanai-codex-app-server/
- Gemini CLI: https://geminicli.com/docs/ ; checkpointing https://github.com/google-gemini/gemini-cli/blob/HEAD/docs/cli/checkpointing.md ; headless trust advisory GHSA-wpqr-6v78-jr5g, https://github.com/google-github-actions/run-gemini-cli/security/advisories/GHSA-wpqr-6v78-jr5g
- GitHub Copilot custom instructions, https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot
- Cursor checkpoints https://cursor.com/docs/agent/chat/checkpoints ; Cursor 2.0 (2025-10) https://cursor.com/changelog/2-0 ; CLI changelog https://cursor.com/docs/cli/changelog
- Windsurf memories, https://docs.windsurf.com/windsurf/cascade/memories ; Cline Plan and Act, https://docs.cline.bot/core-workflows/plan-and-act ; Roo modes, https://docs.roocode.com/basic-usage/using-modes ; Amp, https://ampcode.com/manual/switch-from ; OpenHands security, https://docs.openhands.dev/sdk/guides/security ; OpenHands analyzer issue, https://github.com/OpenHands/software-agent-sdk/issues/4157 ; Goose recipes, https://goose-docs.ai/docs/guides/recipes/recipe-reference/ ; Zed ACP, https://zed.dev/acp ; Pi, https://www.npmjs.com/package/@mariozechner/pi-coding-agent
- Secondary comparisons (weak, used only for coverage): https://www.requesty.ai/blog/agentic-coding-tools-compared-2026-claude-code-cursor-codex-aider ; https://www.morphllm.com/ai-coding-agent

### Frameworks and SDKs (primary documentation, moderate)

- Vercel AI SDK 6 (2025-12-22), https://vercel.com/blog/ai-sdk-6 ; AI SDK 7, https://vercel.com/changelog/ai-sdk-7 ; MCP tools, https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools
- OpenAI Agents SDK, https://openai.github.io/openai-agents-python/ ; JS human-in-the-loop, https://openai.github.io/openai-agents-js/guides/human-in-the-loop/ ; tracing, https://openai.github.io/openai-agents-python/tracing/
- LangGraph interrupts, https://docs.langchain.com/oss/python/langgraph/interrupts ; time travel, https://docs.langchain.com/oss/python/langgraph/use-time-travel
- Mastra, https://mastra.ai/ai-agent-framework ; Google ADK callbacks, https://google.github.io/adk-docs/callbacks/ ; adk-js releases, https://github.com/google/adk-js/releases
- Pydantic AI retries, https://pydantic.dev/docs/ai/core-concepts/retries/ ; Temporal, https://temporal.io/blog/build-durable-ai-agents-pydantic-ai-and-temporal
- Letta memory blocks, https://www.letta.com/blog/memory-blocks/ ; sleep-time compute, https://www.letta.com/blog/sleep-time-compute/ (weak for its claims)
- Framework status dates (secondary, weak): AG2 versus AutoGen, https://www.ag2.ai/compare/autogen ; Microsoft Agent Framework overview, https://atlan.com/know/ai-agent/microsoft/agent-framework/
- Anthropic context editing (server-side clearing of old tool results), https://platform.claude.com/docs/en/build-with-claude/context-editing (the `clear_tool_uses_20250919` strategy; checked 2026-10-09) -- strong
- Anthropic, Building effective agents (2024-12), https://www.anthropic.com/engineering/building-effective-agents ; Effective context engineering (2025-09-29), https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents ; Writing tools for agents (2025-09), https://www.anthropic.com/engineering/writing-tools-for-agents ; Advanced tool use (2025-11), https://www.anthropic.com/engineering/advanced-tool-use (vendor figures, weak) ; Code execution with MCP (2025-11-04), https://www.anthropic.com/engineering/code-execution-with-mcp (weak) ; Multi-agent research system (2025-06), https://www.anthropic.com/engineering/multi-agent-research-system (weak for the gain) ; Demystifying evals for AI agents (2026), https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Cognition, Don't build multi-agents (2025-06-12), https://cognition.com/blog/dont-build-multi-agents -- moderate argument
- Manus, context engineering (2025-07), https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus -- weak
- OpenAI, A practical guide to building agents (2025), https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf -- moderate

### In-app and graph-tool agents

- Gemini in Sheets (2025-10), https://workspaceupdates.googleblog.com/2025/10/expanded-editing-capabilities-gemini-in-google-sheets.html -- moderate
- Power BI verified answers, https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-prepare-data-ai-verified-answers -- moderate
- Tableau Ask Data retirement, https://help.tableau.com/current/server/en-us/adminview_ask_data_usage.htm -- moderate (adoption; no cause given)
- Excel Agent Mode SpreadsheetBench figure, via https://futurumgroup.com/insights/is-microsoft-365-copilot-agent-mode-ready-to-rival-human-accuracy/ -- moderate (vendor figure)
- Observable Canvases AI, https://observablehq.com/documentation/canvases/ai ; Linear agent interaction, https://linear.app/developers/agent-interaction -- moderate
- Neo4j Aura Agent, https://neo4j.com/docs/aura/aura-agent/ ; LLM Graph Builder, https://neo4j.com/labs/genai-ecosystem/llm-graph-builder/ ; Linkurious Enterprise 4.3, https://linkurious.com/blog/linkurious-enterprise-4-3/ ; Kineviz Desktop v0.20.0 (2026-09-23), https://github.com/Kineviz/kineviz-desktop/releases/tag/v0.20.0 ; Graphistry agentic timelining, https://www.graphistry.com/blog/agentic-timelining (weak) -- moderate unless marked
- Figma, The canvas is now open to agents (2026-03), https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/ -- moderate
- Claude for Chrome (2025-08, 11.2% injection success with mitigations), https://www.claude.com/blog/claude-for-chrome -- moderate (vendor figure, different surface)
- ChatGPT Atlas shutdown (2026-08-09), https://www.techrepublic.com/article/news-chatgpt-atlas-shutdown-migration/ -- moderate
- OpenAI Computer-Using Agent (2025-01), https://openai.com/index/computer-using-agent/ -- strong for its figures
- Replit agent incident (2025-07), https://www.fastcompany.com/91372483/replit-ceo-what-really-happened-when-ai-agent-wiped-jason-lemkins-database-exclusive -- weak (one incident)
- Panama Papers and graph visualization (2016), https://www.computerweekly.com/news/450280758/Panama-Papers-revealed-by-graph-database-visualisation-software -- moderate
- GIJN tour of Aleph, https://gijn.org/resource/a-tour-of-aleph-a-data-search-tool-for-reporters -- moderate

### Protocols and extension

- MCP 2026-07-28 release candidate, https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/ ; changelog, https://modelcontextprotocol.io/specification/2026-07-28/changelog -- moderate (primary spec)
- MCP Apps (2026-01-26), https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/ ; SEP-1865, https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp
- MCP elicitation (2025-11-25), https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation ; security best practices, https://modelcontextprotocol.io/specification/draft/basic/security_best_practices ; registry, https://modelcontextprotocol.io/registry/about ; MCPB, https://github.com/modelcontextprotocol/mcpb
- Agent Skills specification (2025-12-18), https://agentskills.io/specification -- moderate
- WebMCP draft, https://webmachinelearning.github.io/webmcp/ ; Chrome docs, https://developer.chrome.com/docs/ai/webmcp -- moderate; shipping status from secondary sources, weak
- A2A v1.0 (2026-01), https://a2a-protocol.org/v1.0.0/specification/ -- moderate
- OpenTelemetry GenAI conventions explained, https://www.dash0.com/knowledge/opentelemetry-genai-semantic-conventions-explained -- moderate

### Security

- OWASP Top 10 for LLM applications 2025: LLM01 prompt injection, https://genai.owasp.org/llmrisk/llm01-prompt-injection/ ; LLM06 excessive agency, https://genai.owasp.org/llmrisk/llm062025-excessive-agency/ ; LLM10 unbounded consumption, https://genai.owasp.org/llmrisk/llm102025-unbounded-consumption/ -- strong
- Willison, The lethal trifecta (2025-06-16), https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/ -- strong as synthesis
- Lies-in-the-Loop (Checkmarx Zero, 2025), https://owasp.org/www-community/attacks/Lies_in_the_Loop ; coverage, https://www.csoonline.com/article/4108592/human-in-the-loop-isnt-enough-new-attack-turns-ai-safeguards-into-exploits.html -- moderate
- NIST, Strengthening AI agent hijacking evaluations (2025-01), https://www.nist.gov/news-events/news/2025/01/technical-blog-strengthening-ai-agent-hijacking-evaluations -- strong
- Invariant Labs, GitHub MCP exploit (2025-05), https://invariantlabs.ai/blog/mcp-github-vulnerability -- moderate
- Rehberger, ASCII smuggling (2024), https://embracethered.com/blog/posts/2024/ascii-smuggling-and-hidden-prompt-instructions/ -- moderate to strong
- OWASP HTML5 security cheat sheet, https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html -- strong
- Vercel, npm supply-chain attack response (2025-09-08), https://vercel.com/blog/critical-npm-supply-chain-attack-response-september-8-2025 -- strong
- Sysdig, LLMjacking (2024-05), https://www.sysdig.com/blog/llmjacking-stolen-cloud-credentials-used-in-new-ai-attack -- context only (worst-case estimate)
- Gemini API terms (free-tier training), https://ai.google.dev/gemini-api/terms (living page) -- strong
- Ollama CVE-2024-37032, https://www.wiz.io/vulnerability-database/cve/cve-2024-37032 -- strong
- SheetJS CVE-2023-30533, https://nvd.nist.gov/vuln/detail/CVE-2023-30533 and https://github.com/advisories/GHSA-4r6h-8v6p-xvw6 (every version through 0.19.2 affected, fixed in 0.19.3 from cdn.sheetjs.com only; npm's `xlsx` latest is still 0.18.5, checked 2026-10-09) -- strong

### Runtimes and platforms

- Chrome Local Network Access (enforced from Chrome 142, 2025-10-28), https://developer.chrome.com/blog/local-network-access -- strong
- WebLLM, https://github.com/mlc-ai/web-llm -- moderate
- Chrome Prompt API, https://developer.chrome.com/docs/ai/prompt-api -- moderate
- transformers.js v4, https://huggingface.co/blog/transformersjs-v4 -- moderate
- File System Access, https://developer.chrome.com/docs/capabilities/web-apis/file-system-access -- moderate
- Web Speech API, https://webaudio.github.io/web-speech-api/ ; https://caniuse.com/speech-recognition -- moderate
- Anthropic desktop extensions, https://www.anthropic.com/engineering/desktop-extensions ; Tauri Linux graphics, https://v2.tauri.app/develop/debug/linux-graphics/ ; Electron safeStorage, https://www.electronjs.org/docs/latest/api/safe-storage -- moderate
- Apple WWDC26 session 241 (Foundation Models), https://developer.apple.com/videos/play/wwdc2026/241/ ; WWDC25 session 227 (background tasks), https://developer.apple.com/videos/play/wwdc2025/227/ -- moderate
- Android ML Kit GenAI Prompt API (2025-10), https://android-developers.googleblog.com/2025/10/ml-kit-genai-prompt-api-alpha-release.html -- moderate
- Cloudflare AI Gateway, https://developers.cloudflare.com/ai-gateway/configuration/bring-your-own-keys/ ; OpenRouter, https://openrouter.dev/docs -- moderate
- OpenRouter OAuth PKCE, https://openrouter.ai/docs/client-sdks/python/sdks/oauth/README -- moderate

---

## 12. How this differs from the earlier reports

Two earlier reports answered parts of issue #37. The **September library study**
(`design/element-api/agent-harness-options.md`, 2026-09-21) asked which JavaScript agent library
could run the loop inside a page and settled it by building each candidate for a browser. The
**October feature report** (`design/ai/agent-harness-options.md`, 2026-10-08) compared harness
features, as this one does, against the 16 personas rather than a use-case brainstorm. All three
agree on the core: keep one agent, do not adopt a framework's loop, no sub-agents, grade on end
state over repeated runs, and put graph logic in graphty-element.

### Recommendations that changed

| Topic                          | September study                                                                                                 | October report                                                                                     | This report                                                                                                                                                                                                                               | Why it changed                                                                                                                                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI SDK version                 | Upgrade `ai` to 7 and replace the hand-written controller with the SDK's agent loop (about 1,850 lines deleted) | Stay on 5; it already has stop conditions and the per-step hook                                    | Decide by measurement (prototype 1: no task regresses beyond the noise on 7, and the extra 48 to 102 kB gzip is accepted); ship any peer-range change in one grouped major                                                                | A dedicated version study followed (`ai-sdk-v5-vs-v7.md`); neither earlier report could measure the difference, and the peer range is a published contract                                                                    |
| Who owns the loop              | The SDK's agent loop                                                                                            | graphty's own loop                                                                                 | graphty's own loop, shrunk onto SDK primitives                                                                                                                                                                                            | One assistant message as one undo step, with cancel reaching every tool, is the part no library supplies                                                                                                                      |
| Transactions during a message  | Not examined                                                                                                    | Not examined                                                                                       | Fix first: one transaction per tool batch, grouped into one undo step                                                                                                                                                                     | The code holds one session transaction for the whole model conversation, so the person's own edits fail while the model thinks; found in this study                                                                           |
| Memory within a session        | A multi-turn loop (since built)                                                                                 | Conversation memory within the tab                                                                 | The same, plus facts about what the person did, which messages were undone, and a reset at a dataset boundary                                                                                                                             | Agents score about 20 points lower when a person acts on shared state (tau2-bench), and undo must stay consistent with what the model believes                                                                                |
| Memory across sessions         | A preference store the model reads and writes, then a memory tool over browser file storage                     | Rejected                                                                                           | Rejected in the web app; saving conversation history is an explicit, default-off option whose format is an owner decision                                                                                                                 | Text in a loaded dataset can persuade a model to save it; the UI principles leave persistence to the reader                                                                                                                   |
| Skills                         | Load skills in the element, bundled and consumer-supplied, as instructions                                      | No skill loading in the element; a SKILL.md for outside agents                                     | Instructions-only skills at priority 3, deferred until the tool count outgrows the context; a SKILL.md as the cheap arm of prototype 2                                                                                                    | Skills pay off through progressive disclosure, which matters only once the tool port roughly doubles the catalog; outside agents can use them now                                                                             |
| MCP client                     | An optional peer dependency in the page for remote, CORS-enabled servers                                        | None in the web app; desktop only                                                                  | A read-only client for servers the embedder configures, with pinned definitions, at priority 3 and only after the injection gate passes                                                                                                   | An embedder choosing known servers is a smaller risk than readers adding servers, but tool poisoning (MCPTox) still argues for waiting on the gate                                                                            |
| graphty as an MCP server       | Not covered                                                                                                     | A private server at priority 2, compared with a Node script and a skill; published only if it wins | Prototype 2: a strategic experiment, bridged to a live element so view-dependent tasks count, that decides how to split investment between graphty's own harness and the server; the script-and-skill arm kept as the cheaper alternative | Neither earlier report asked whether graphty's own harness beats a general assistant using the same commands; that answer changes what to build first                                                                         |
| Plans and plan mode            | Plan-then-act built from the per-step hook                                                                      | Rejected (noise on short messages, a confirmation in disguise)                                     | Staged plan mode at priority 3 for multi-step and destructive work only, gated on a 5 to 8 analyst study that measures acceptance of wrong plans; the copilot stays the default                                                           | Visible plans help multi-step analysis (Kazemitabaar et al., UIST 2024), but people approve plausible wrong plans (He et al., CHI 2025); both findings hold, so plans are limited and tested                                  |
| Approvals and outbound actions | Approval gates on tool calls as the security boundary                                                           | No model-reachable outbound tool at all, proved by a test; approvals rare                          | Every tool declares a mutation and exposure class; outbound and irreversible calls wait for an approval made only through an API call; a taint rule once graph data is in context                                                         | Typed connectors and an MCP client are now on the list and need a gate; until the first outbound tool lands, the October report's no-outbound test is the simpler guarantee and should stay                                   |
| Self-verification              | Have the agent screenshot and look at its own render, built immediately                                         | Check against real graph state instead                                                             | State diffs and recomputed claims are the check; a visual self-check is a "nice" criterion measured on 10 tasks; captures return handles, never base64 pixels                                                                             | Self-correction without new evidence does not help (Huang et al., ICLR 2024); graph state is cheap to check; the existing capture command, if registered, would put a base64 image into a tool result cut at 8,000 characters |
| Tool catalog shape             | Keep the 17 command verbs                                                                                       | About 10 to 12 grouped tools over session commands                                                 | Port each tool onto session commands, heading toward about 40, and measure accuracy at 15 against 40 (criterion 20) with tool search held in reserve                                                                                      | 34 of the 40 chosen use cases need more of the element than grouped tools expose; whether a larger list hurts is measured rather than assumed                                                                                 |
| Tool search                    | Not needed for the element's own commands                                                                       | Not worth it at about 12 tools                                                                     | Priority 3, once the catalog roughly doubles                                                                                                                                                                                              | Follows from the larger catalog                                                                                                                                                                                               |
| WebMCP                         | A good fit for the element                                                                                      | Not worth it (one browser, origin trial)                                                           | An off-by-default, read-only spike at priority 3                                                                                                                                                                                          | Cheap to try once the browser-free core exists; still one browser                                                                                                                                                             |
| Evaluation replays             | Not covered                                                                                                     | Recorded model replays rejected as going stale; scripted mock tests instead                        | A record-and-replay provider for cheap pull-request runs, with paid runs on the release train, under explicit statistics rules (Wilson intervals, paired comparisons, a minimum detectable difference)                                    | Staleness is bounded by the paid runs; without cheap runs between releases no prototype comparison is affordable                                                                                                              |
| What-if previews               | Not covered                                                                                                     | A scratch-session fork                                                                             | A dry run inside a transaction that rolls back                                                                                                                                                                                            | Builds on the session's own rollback instead of copying the session; rendering suppression during the dry run does not exist yet, and the scheme is not yet reviewed against the History code                                 |
| Model-free work                | Not covered                                                                                                     | Analyst work products: result export, compare results, the fork, recipes                           | Model-free pipelines and seeded robustness sweeps as the "programs drive" design, with recipes experimental                                                                                                                               | The use-case brainstorm puts rigor (stability, null models) ahead of export; sweeps also cover result comparison                                                                                                              |
| Local models                   | Test whether the in-page model can call tools at all; try Chrome's built-in model                               | Hide the in-page model until it works; private endpoint presets as a prototype                     | A local model tier prototype with a measured capability table, a local-only profile, and Chrome's built-in model at low priority                                                                                                          | Two tool-capable in-page models now exist (pull request #1693), so the question moved from "does it work" to "is it good enough to offer"                                                                                     |
| Desktop and mobile triggers    | Not covered                                                                                                     | Three distinct requesters in six months, or one embedder needing stdio servers or the keychain     | Measured triggers: the share of people in the MCP experiment who would use graphty through a desktop assistant, recipe replays per user, and a one-day photo-to-graph test                                                                | Triggers tied to measurements the prototypes already produce                                                                                                                                                                  |
| Owner decisions                | None listed                                                                                                     | Key origin on graphty.app, recipe format, one grouped major for English removal, MCP names         | The AI SDK peer range, removing the Graph-bound tool API, the undo contract, persisted formats (recipes among them), MCP names, an xlsx importer, and key origin on graphty.app                                                           | The key-origin decision carries over from the October report; the rest follow from the designs in section 7                                                                                                                   |

### Facts that changed after the earlier reports

- The loop now makes up to 5 model calls per message (the September study's "exactly one step" no
  longer holds).
- Command examples now reach the model through the prompt the controller builds, and a selector
  that matches nothing returns a hint to the model (`graphty-element/src/ai/commands/selectors.ts`);
  both were defects in the September study, and the second was the October report's top
  tool-reliability item.
- Pull request #1693 (2026-10-09) sends tools only to WebLLM models that accept them, sends JSON
  Schema instead of a Zod object, puts instructions into the user turn when a model refuses a
  system prompt with tools, and lists two tool-capable Hermes models. The September study's two
  WebLLM defects and the October report's "probably cannot be turned on" are therefore partly
  resolved; the provider still cannot be started through `enableAiControl` alone.
- Issue #866 (English in result APIs) is closed; `CommandResult.message` remains and is listed in
  this report's owner decisions.
- Apple's on-device model context: the October report cited 4,096 tokens (WWDC25); this report
  cites 8K on device plus a 32K Private Cloud Compute model (WWDC26 session 241). Use the later
  figure.

### Earlier findings carried forward

These findings from the earlier reports appear in this report: binding a saved key to its endpoint and keeping key persistence off on the shared graphty.app
origin; schema-only data mode; name-to-node resolution; attribute descriptions sent as quoted data;
usage facts; prompt-cache-friendly request order; a persistent "assistant" indicator for hides and
filters; a sign-in key broker; voice in immersive mode; the app's result-member CSV workaround; and
the absence of any assistant request in the personas.
