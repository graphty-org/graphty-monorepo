# Agent harness options for graphty-element

What it would take to replace graphty-element's home-grown AI layer with a more capable agent
harness, given that the component ships as a library into a third party's page and has no server.

Written 2026-09-21. Every runtime claim below comes from npm registry metadata, from reading the
JavaScript inside a published package, from building a candidate with a real browser-targeted
bundler, or from a live request made from a browser page. Sources older than six months are
flagged where they appear.

---

## The short answer

**Nothing on the market meets the requirements, and the closest thing to a fit is a dependency
graphty-element already ships.** There is no in-browser equivalent of Claude Code, Codex or Cline.
Every harness that offers planning, sub-agents, skills, memory and MCP together keeps those parts
on the Node side of its own package split and says so in its own source comments. What does run in
a page, cleanly and today, is a tool-calling loop: a few hundred kilobytes of provider-agnostic
code that calls a model, runs tools you supply, feeds the results back, and stops on a condition
you set.

The Vercel AI SDK -- the npm package named `ai`, which graphty-element already depends on and
already ships into the browser at version 5.0.116 -- is that loop. Version 7 adds a multi-turn
agent class, programmable stop conditions, a per-step reconfiguration hook, signed tool-call
approvals, context pruning and tool search. **The single-turn limitation the owner wants fixed is a
usage gap, not a dependency gap:** `VercelAiProvider.generate` calls `generateText(...)` without
the `stopWhen` option, and that omission is the entire reason the agent takes exactly one step.

So the recommendation is: **extend what exists, on a bigger substrate that is already installed.**
Upgrade `ai` from 5 to 7, delete the hand-written controller and provider layer (about 1,850 lines)
in favour of the SDK's agent loop (about 700 lines of new host code), and keep the 5,400 lines that
actually know about graphs. Then build MCP, skills and memory on top -- because no candidate
supplies them for a page, so they cost the same no matter which harness sits underneath.

Two findings make this materially cheaper than expected. Upgrading `ai` to version 7 does **not**
force a zod major version: `ai@7` imports from `zod/v4`, and zod 3.25.76 -- the exact version
installed in this repository -- already exports that subpath. Measured, minified, tree-shaken and
browser-targeted, `ai@7` plus the Anthropic provider against the existing zod is 172 kB gzipped,
which is *smaller* than the same build against zod 4.

The two alternatives worth taking seriously, OpenAI's Agents SDK and LangChain's LangGraph, both
bundle for a browser and both cost more for capabilities that are not the ones being asked for.
Details in section 3.

---

## 1. What a modern agent harness does

This is the vocabulary the comparison scores against. It is also the answer to "there might be
other features from modern agentic harnesses that would be helpful too" -- the items below that
graphty-element has never had are marked.

### The loop, and tool calling

Call the model with a catalog of tools; if it returns tool calls, run them, append the results as
messages, call again; repeat until it stops calling tools or a limit trips. Everything else on this
list is a refinement of that loop. It is the difference between "the model tells you what to do"
and "the model does it and then sees whether it worked". Universal in 2026; table stakes.

*graphty-element has one model call per user input and never returns tool results to the model.
This is the capability being asked for.*

### Loop control: stop conditions and per-step reconfiguration

Programmatic control over when the loop ends and what each iteration looks like. The AI SDK
expresses this as two options: `stopWhen`, which takes composable predicates (a step count, "stop
once this specific tool has been called", a custom function that sees the whole step history), and
`prepareStep`, a hook that runs before each iteration and can swap the model, restrict which tools
are legal at this phase, force a tool choice, or rewrite the message array.

This matters more than it sounds, because several other capabilities are implemented *through* it
rather than bolted on beside it: context compaction, routing easy steps to a cheap model, and
"during planning only read-only tools exist" are all `prepareStep` return values.

### Planning, or plan-then-act

A distinct phase in which the agent explores and proposes an approach before it is allowed to
change anything, usually with a restricted tool set. Cline names the two modes directly: plan mode
can read and search but cannot modify; act mode runs the plan with the planning context carried
over. Claude Code implements the same thing as a permission mode. It is the cheapest error
correction available -- a wrong direction caught while planning costs one turn, caught after
execution it costs the whole rework.

Products ship this; libraries do not. In every library candidate you build it yourself out of the
loop-control hook and a restricted tool list. For graphty-element the restricted set is obvious and
already exists: `queryGraph`, `findNodes`, `getSchema`, `sampleData` and `describeProperty` are
read-only; everything in the style, layout, camera and mode families mutates the view.

### Self-verification and critique

The agent checks its own output before declaring itself done -- reads back what it wrote, runs the
test, or hands the result to a critic. This is the capability the owner asked for by name, and the
honest finding is that **nobody ships it as a first-class primitive.** What harnesses ship is the
substrate: the multi-turn loop that lets a verification tool's output reach the model, plus
guardrails that can trip on a bad final answer. The verification itself is a prompt and a tool you
write.

For this component the verification loop is unusually clean, and worth flagging as an argument for
doing it at all: the element already has a screenshot command and a graph-query command. **An agent
that styles a graph can look at the graph it just styled.** Nothing else in this survey has an
equivalent, because nothing else renders anything.

### Sub-agents and delegation

Spawn a child agent with its own context window, its own system prompt and a restricted tool set;
it works independently and returns a summary instead of its whole transcript. Two separate wins:
context hygiene (a search that returns forty results pollutes the child's window, not yours) and
enforceable constraint (a read-only reviewer cannot write, by construction). Anthropic's own
guidance notes the cost: agent teams run roughly seven times the tokens of a single session.

Table stakes at the top of the market, genuinely rare below it. Probably not load-bearing for a
graph component's eight command families, and the token multiple is a poor fit for a
bring-your-own-key consumer paying per request.

### Permission and approval gates

A tool call pauses for a human decision before it runs. **For a library dropped into a third
party's page this is not a nicety, it is the security boundary** -- every tool the agent can call
is an action taken inside somebody else's application, and the consumer needs to be able to say
which ones need a click.

This became table stakes in the current generation. The AI SDK mentions approval 74 times in its
public types, including a signature error type, which means approvals are signed and a forged
approval in a serialized state is detectable. OpenAI's Agents SDK models it as an interruption you
can inspect, approve or reject.

*graphty-element has none. Every registered command runs the moment the model asks for it.*

### Context management and compaction

Keeping the conversation inside the window by summarizing or dropping old material rather than
failing. A multi-turn agent with tool results is a token firehose; without compaction the loop has
a hard ceiling measured in turns. Three layers exist now. The AI SDK exports a message-pruning
function documented for use inside the per-step hook. OpenAI's SDK models it as a session concern.
And the Anthropic API now takes a context-management request field that clears old tool results,
clears old thinking blocks, or compacts the conversation server-side.

The provider-side form is the one that matters for a page: it arrives over plain HTTPS, so a
browser gets it by setting a request field, with no local tokenizer, no summarizer model and no
storage. Worth knowing why that matters: the standard pure-JavaScript tokenizer for counting tokens
before a request, `js-tiktoken`, is 22 MB unpacked (last published 2025-08-09, thirteen months old)
-- disqualifying for a library, which argues for reporting usage after the fact rather than
counting before.

### Memory across sessions

State that outlives one conversation: user preferences, learned facts, conventions. This is the
owner's ask -- "perform the same actions or follow user preferences with minimal interaction."
Three designs exist and they are not interchangeable. A file the agent reads at startup (simple,
fully visible to the user, and paid for in tokens on every single request). A tool the model calls
(Anthropic's memory tool: six commands -- view, create, str_replace, insert, delete, rename -- over
a virtual path namespace, where the storage backend is entirely yours). And a store separate from
the thread, as LangGraph does, distinct from its per-thread checkpointer.

Still differentiating rather than table stakes. **No candidate ships a browser-persistent memory
implementation. Every one of them ships a pluggable interface that a browser implementation could
satisfy.** Section 4 covers what satisfying it costs.

### Skills

A named, reusable instruction pack the agent loads on demand: a directory containing `SKILL.md`
(YAML frontmatter over a Markdown body) and optionally reference files and scripts. What makes it
more than a saved prompt is progressive disclosure in three levels -- roughly 100 tokens of
metadata per skill always present in the system prompt, the body (recommended under 5,000 tokens)
loaded only when the description matches, and bundled files costing nothing until read. That is
what makes it possible to install dozens of skills without paying for them.

**This is no longer one vendor's idea.** Anthropic's own skills repository now contains a spec
directory holding one 87-byte file that says the specification has moved to `agentskills.io`. The
standard is governed at `github.com/agentskills/agentskills` (Apache-2.0 for code, CC-BY-4.0 for
the docs) and the adopter list includes Cursor, GitHub Copilot, VS Code, Codex, Gemini CLI, Goose,
OpenCode, Letta, Spring AI and Claude Code. OpenAI's own documentation says skills "build on the
open agent skills standard" and links that specification.

The format is small: `name` (64 chars, lowercase letters, digits and hyphens, matching the
directory name) and `description` (1,024 chars) are required; `license`, `compatibility`,
`metadata` and an experimental `allowed-tools` are optional; the body is free Markdown. A parser is
an afternoon's work.

The *execution model* is what a page breaks, and section 4 answers it.

### MCP

The Model Context Protocol: an open protocol for exposing tools, resources and prompts to any
client. This is the owner's "load data and turn it into a graph via an MCP" ask -- a graph
component that speaks MCP can ingest from any MCP server anybody writes, without graphty-element
knowing those formats.

Table stakes everywhere. Absent from graphty-element entirely: the strings "MCP" and "Model Context
Protocol" do not appear anywhere under `src/ai/`.

The current protocol revision is 2026-07-28, and its changes all happen to make a browser client
easier: no handshake round trip, no standalone server-push stream, no protocol-level sessions, and
server-to-client requests folded into ordinary request/response round trips. Every message is now a
POST to one endpoint. Section 4 covers what a page can actually reach.

### Tool search and deferred tool definitions

When the catalog is large, do not put every tool schema in the prompt -- put the names and let the
model search for the rest. Anthropic's guidance notes that MCP tool definitions are deferred by
default, so only names and server instructions enter the context until a specific tool is used.
New, late 2025 into 2026, and still rare.

Not load-bearing for graphty-element's own seventeen commands. It becomes load-bearing the moment a
user attaches MCP servers, because a real MCP setup is dozens of servers and hundreds of tools
whose schemas alone can exceed the context budget.

### Streaming and interruption

Tokens surface as they arrive and the user can stop mid-flight. Purely a UX floor now: an agent
that runs eight turns silently is unusable in a page.

*graphty-element implements streaming on all three providers and never calls it.* The status value
named "streaming" and the stream-chunk event both fire exactly once, after the entire response has
already arrived. The status vocabulary describes behaviour the code does not have.

### Checkpoint and resume

Serialize the run so it can be stored and picked up later -- after a page reload, or after a human
answers an approval. This is what makes approval gates practical rather than merely blocking, and
it is what lets a browser agent survive a refresh. OpenAI's Agents SDK has the cleanest version: a
run state object with a JSON round trip, carrying the pending approvals on the same object.
LangGraph builds its whole persistence model on it, including rewinding to an earlier snapshot.

Rare in libraries, common in products, and it maps directly onto IndexedDB in a page.

### Structured output

Constrain the model to a schema. Universal; table stakes. One detail relevant to a library: the AI
SDK now speaks Standard Schema, an interface several validation libraries implement, so Zod is no
longer mandatory. That matters for a package that would otherwise force its Zod major version on
every consumer.

### Multi-provider support

Required here, and the breadth gap between candidates is real. The AI SDK has a provider registry,
a custom-provider wrapper, a middleware chain, and an OpenAI-compatible adapter that covers
anything speaking the OpenAI wire format -- which is the practical route to local, self-hosted and
gateway models. OpenAI's Agents SDK has a provider interface, but its default path is OpenAI and
its model layer is OpenAI's own client.

### Cost and token accounting

Report what the request actually consumed, and ideally attribute it. Crude accounting is table
stakes -- every SDK surfaces the usage numbers the API returned, and the AI SDK reports per-step as
well as total. Useful accounting -- attributing spend to a skill, a subagent or an individual MCP
server, and acting on it -- is rare. For a bring-your-own-key consumer, showing the user what a
question cost is a real feature, and it needs nothing but the usage field.

### Observability

Traces and spans routed to a collector. Table stakes in frameworks; the AI SDK registers telemetry,
OpenAI's SDK has tracing on by default. **Every implementation assumes a collector endpoint, which
a library with no backend does not have.** The browser-appropriate form is an event stream the
consumer can subscribe to and forward wherever they already send telemetry -- which is a small
interface, not a dependency.

### Two more that are specific to a visualization component

**Server-supplied UI.** MCP servers can now ship their own interface: a sandboxed HTML resource the
host renders, with a message bridge back to the host. The AI SDK's MCP package carries the resource
type, its content-type, a security-policy type and drift detection for it. For a component whose
whole job is rendering, this is either an opportunity or a scope question, and it should be a
deliberate decision rather than an accident.

**Publishing the graph's own tools to the page.** The inverse of consuming MCP servers: a proposed
web platform API by which a page registers its own tools for a browser-resident agent to call. It
is a Web Machine Learning Community Group draft, not standardized and not shipped in any browser,
but a polyfill exists and bundles cleanly at 34 kB gzipped. Publishing "load this graph, run this
algorithm, frame this camera" as browser-native tools is a genuinely good fit for this component.
It is a different feature from consuming MCP servers and the two should never be blurred.

---

## 2. The comparison

Three tables, two halves of one comparison plus the building blocks. Every cell is marked from
evidence; a cell that needs a caveat carries a footnote rather than a flattened tick.

Sizes are **minified, tree-shaken, gzipped**, produced by bundling each candidate's real install
with a browser-targeted bundler. Unpacked npm sizes are useless for this decision -- they include
sourcemaps, source trees and dual module formats -- so they are not quoted.

### Table A -- can it be used here at all

| Candidate | Runs the loop in a page | Multi-LLM | License | Bundle (gzip) | Maintained | Library or application |
|---|---|---|---|---|---|---|
| `ai` v7 (Vercel AI SDK) | **yes**, built and verified [1] | **yes**, broad [2] | Apache-2.0 | 107 kB alone; 250 kB with 2 providers; **172 kB with Anthropic on the existing zod 3** [3] | 7.0.108, 2026-09-21 | library |
| `@openai/agents-core` | **yes**, built | partial [4] | MIT | 331 kB; 332 kB with its MCP transports | 0.18.0, 2026-09-10 | library |
| `@langchain/langgraph` | **yes**, built | yes, via separate packages [5] | MIT | 335 kB | 1.4.17, 2026-09-21 | library |
| `@tanstack/ai` + `ai-skills` | **unverified** [6] | yes | MIT | 133 kB | 0.58.0 / 0.1.7, 2026-09-21 | library |
| `@cline/agents` (+ `@cline/llms`) | **no -- fails to build** [7] | yes, ~25 providers | Apache-2.0 on the loop; **no license declared** on the model layer [8] | n/a | 0.0.83, 2026-09-15 | library, in principle |
| `@anthropic-ai/claude-agent-sdk` browser entry | **no** -- transport to a remote session [9] | no, Anthropic | proprietary | n/a | 0.3.278, 2026-09-19 | application |
| Pi (`@earendil-works/pi-agent-core`) | **no** -- Node HTTP stack [10] | yes | not declared | n/a | 0.87.0, 2026-09-21 | application |
| Mastra, VoltAgent, Cloudflare `agents`, Inngest AgentKit, LlamaIndex.TS | **no** [11] | yes | mixed | n/a | mixed | application |
| Goose, Cline (the product), smolagents, pydantic-ai | **no** -- wrong runtime [12] | yes | Apache-2.0 / MIT | n/a | active | application |
| **The incumbent, as it stands** | yes | yes, 3 cloud + 1 in-page | -- | already shipped | -- | library |

Footnotes to Table A:

1. `ai@7.0.108` is ESM-only; its single dist file does contain the strings `node:async_hooks` and
   `node:diagnostics_channel`, but every occurrence is a string argument to a loader that reaches
   the builtin through `globalThis.process?.getBuiltinModule?.(id)` inside a try/catch, and every
   call site is gated on a runtime check that returns early when not in Node. No bundler resolves
   them. Confirmed by a clean browser build. Version 5 of the same package ships into the browser
   from this repository today, which settles the question empirically as well.
2. Provider packages for OpenAI, Anthropic and Google, plus an OpenAI-compatible adapter that
   covers anything speaking that wire format, plus a provider registry and middleware.
3. `ai@7` imports from `zod/v4`, and zod 3.25.76 already exports that subpath. Installing `ai@7`,
   the Anthropic provider and zod 3.25.76 together builds with one copy of zod at 172 kB gzipped;
   the same build against zod 4.6.5 is 204 kB. The old zod is smaller.
4. Its model layer is OpenAI's own client. Other providers require writing a provider adapter, and
   an in-process engine such as an in-page model is not something it expects at all.
5. Chat models come from separate packages per provider, so you inherit a second provider
   abstraction alongside the one already in this repository.
6. Zero Node-only dependencies and no Node imports anywhere in its dist, but its
   bring-your-own-key design is a relay: it forwards a user's key to a server as an HTTP header,
   its companion package is described as a headless client, and it has a server subpath. Whether a
   page can drive a provider directly with it was not established. Its skills package, separately,
   is unambiguously browser-runnable -- see section 3.
7. Its npm description says "Browser-safe agent runtime" and its exports map declares a browser
   condition, and it still does not build: its loop imports three symbols from its companion model
   package (a gateway constructor and two error classifiers) that exist only in that package's Node
   build. The same entry builds fine targeting Node. Metadata alone would never have found this.
8. The loop package is Apache-2.0. The model, core and shared packages all report no license on the
   npm registry and none in the repository manifest. For a package you intend to publish, that is a
   due-diligence blocker regardless of the build failure.
9. It is a real, shipped browser entry point, and it is a transport. Its own types require either a
   WebSocket URL or a streaming-plus-send URL pair with a session id; its documented example points
   at a hosted session-events endpoint with a bearer token. The agent loop runs on the remote
   worker. The endpoints also read as first-party plumbing rather than a public API.
10. The project moved scope and is actively published -- both packages were released 2026-09-21, so
    it is not stale. What kills it is its dependency list: a Node HTTP request handler, two proxy
    agents, the AWS Bedrock client, and no browser field or condition. Confirming the diagnosis: a
    sibling package exists whose stated purpose is to be a CORS and authentication proxy for it.
11. Decisive dependencies, not judgement: a process spawner and a WebSocket library (Mastra, 31
    direct dependencies); Node-specific tracing and a file globber (VoltAgent, 44); a Durable Object
    backend (Cloudflare); an HTTP server framework and a hosted durable-execution platform (Inngest
    AgentKit, last published 2025-11-13 and ten months stale); Node type packages and a Node parser
    with no browser condition (LlamaIndex.TS, last published 2025-12-02 and nine months stale).
12. Goose is Rust, shipped as a desktop app and a CLI. Cline is a VS Code and JetBrains extension
    plus a CLI. smolagents and pydantic-ai are Python, both requiring Python 3.10 or later.

### Table B -- core loop capabilities

| Candidate | Multi-turn loop | Loop control | Planning | Self-verification | Approvals | Context compaction | Streaming + abort | Structured output |
|---|---|---|---|---|---|---|---|---|
| `ai` v7 | yes | **yes, best in class** [13] | build it [14] | substrate only [15] | **yes, signed** | yes, message pruning [16] | yes | yes |
| `@openai/agents-core` | yes | yes, turn cap + input filter | build it [14] | **yes, guardrails** [17] | yes, inspectable | yes, session-level | yes | yes |
| `@langchain/langgraph` | yes | yes, graph edges | build it as a graph | build it | yes, via interrupt | via its own state model | yes | yes |
| `@tanstack/ai` | yes | yes | build it | build it | build it | build it | yes | yes |
| **The incumbent** | **no** [18] | no | no | no | no | no | **implemented, never called** | via Zod parse |

Footnotes to Table B:

13. Composable stop predicates, plus a hook that can change model, tool set, tool choice, sampling
    settings or the whole message array before each step. This is the column where it is clearly
    ahead.
14. No library candidate ships a plan-then-act mode. In the AI SDK you build it from the per-step
    hook plus an active-tool list; in OpenAI's SDK from a planner agent plus handoff.
15. Nobody ships self-verification as a primitive. The AI SDK exports an evaluation helper and tool
    drift detection; the verification prompt and the verify tool are yours.
16. A prune function documented for use inside the per-step hook once token use crosses a
    threshold. Note that Anthropic's own API also offers server-side compaction as a request field,
    which any HTTPS client can use, including a page.
17. Guardrails on the final output *and* on tool inputs and outputs, each able to trip and abort.
    The closest thing to a verification mechanism in any candidate.
18. One model call per user input. Tool results are collected and returned to the caller; they are
    never appended to a message history and sent back. There is no history parameter to send them
    into, and no loop. A design document for the fix exists in this repository at
    `design/ai/ai-multi-turn.md` (506 lines, specifying a five-iteration tool loop) and no
    corresponding code exists.

### Table C -- extension capabilities

| Candidate | Sub-agents | MCP | Skills | Cross-session memory | Tool search | Checkpoint / resume | Cost accounting | Observability |
|---|---|---|---|---|---|---|---|---|
| `ai` v7 | no | **separate package** [19] | provider-hosted only [20] | **no** | yes | no | yes, per step and total | yes, needs a collector |
| `@openai/agents-core` | **yes**, handoffs + agent-as-tool | yes, in-house client, 3 transports [21] | types only, shell-bound [22] | transcript sessions only [23] | yes | **yes, JSON round trip** | yes | yes, on by default |
| `@langchain/langgraph` | yes, sub-graphs | via separate packages | no | **interface only** [24] | no | **yes, its core model** | via its tracing platform | yes, needs a collector |
| `@tanstack/ai` + `ai-skills` | no | no | **yes, and browser-shaped** [25] | **no, none at all** | no | no | usage middleware | tracing middleware |
| **The incumbent** | no | **no** | **no** | **no** | no | no | no | status events only |

Footnotes to Table C:

19. `ai@7` has no MCP client -- the type declarations of both the installed version 5 and the
    current version 7 contain zero MCP exports, and the one occurrence of the string in version 7
    is a comment about tool-definition drift. MCP comes from `@ai-sdk/mcp` (whose root entry builds
    for a browser at 121 kB gzipped, with its process spawner reachable only from a separate
    stdio subpath) or from the reference client (85 kB gzipped -- see Table D).
20. `ai@7` exports a skill-upload function, which sends skill files to the model provider where
    they run in the provider's own container. That is an HTTP call a page can make, and it is not
    running a local skill against local tools.
21. Streamable-HTTP, server-sent-events and stdio transports, written in-house rather than on the
    reference SDK: its MCP module is 32 kB with only relative imports. The first two are
    fetch-shaped and would work in a page. It also declares the reference MCP client as an optional
    dependency, reachable only from a Node shim the browser path never touches.
22. Its public tool types include local, container, inline and reference skill shapes, and they are
    bound to its shell tool and container environments. Not usable in a page.
23. Its memory modules are session transcript persistence -- get the session id, get the items,
    rewrite history. There is no durable knowledge, preference extraction or semantic recall.
24. A per-thread checkpointer and a cross-thread store, both abstract base classes with in-memory
    implementations. The documentation states the in-memory saver does not persist between
    restarts; the persistent implementations named are Postgres and SQLite. A browser deployment
    means writing an IndexedDB implementation yourself.
25. The one genuinely browser-shaped skills implementation found anywhere. Its central abstraction
    is documented as bytes only, with no filesystem assumption, and its own header explains that a
    path field was deliberately omitted so that future script execution cannot be coupled to
    filesystem-backed sources. See section 4.

### Table D -- the pieces, which are not harnesses

These are not candidates to replace the AI layer. They are the components any answer is assembled
from, and each earns its place in the recommendation.

| Piece | What it gives | Runs in a page | Bundle (gzip) | License | Maintained |
|---|---|---|---|---|---|
| `@modelcontextprotocol/client` 2.0 | MCP client, current protocol revision, full OAuth with PKCE | **yes, verified live against a public server** [26] | 85 kB | MIT | 2.0.0, 2026-07-27; only stable release, no patch in 56 days |
| `@modelcontextprotocol/sdk` 1.x | the older monolithic SDK, browser-usable by deep import | partial [27] | 89 kB | MIT | 1.30.0, 2026-07-27 |
| `@anthropic-ai/sdk` memory tool | the six-command memory contract, storage-agnostic | **yes** [28] | 50 kB with the tool | MIT | 0.127.0, 2026-09-18 |
| `@tanstack/ai-skills` | the browser-viable skills pattern: a bytes-only source interface plus two tools that replace the shell | yes, root entry is filesystem-free | part of the 133 kB above | MIT | 0.1.7, 2026-09-21 |
| `@mlc-ai/web-llm` | a model running in the page on WebGPU, no key, no network | yes, already an optional peer here | 14 MB of library plus a 200 MB - 2 GB model download | Apache-2.0 | 0.2.85, 2026-09-08 [29] |
| `@browser-ai/core` | Chrome and Edge's built-in on-device model, wrapped as an AI SDK provider | yes, built | **28 kB** | Apache-2.0 | 3.0.3, 2026-09-08 [30] |
| `@mcp-b/transports` | the page publishing its own tools to a browser agent | yes, built | 34 kB | MIT | 5.1.0, 2026-08-31 |
| `oauth4webapi` | low-level OAuth 2 and OpenID Connect for a browser, zero dependencies | yes | small | MIT | 3.8.8, 2026-09-05 |
| `@orama/orama` | in-page full-text and vector search | yes, built | 22 kB | Apache-2.0 | **3.1.18, 2025-12-19 -- 9 months old** |

Footnotes to Table D:

26. Bundled with browser conditions and run in Chrome 145: a page connected to a live public MCP
    server on the open internet and listed its three real tools with no backend anywhere in the
    path. Separately, a full current-revision handshake was completed against a local server --
    three POSTs, no server-push stream, no session id. Its browser support is deliberate rather
    than accidental: its exports map declares a browser condition whose shim swaps the JSON Schema
    validator for one that does not compile with `new Function` (so a strict Content Security
    Policy does not break it) and sets a flag marking CORS failures as possible; the client carries
    a retry helper that reasons explicitly about browser preflight. The catch: it depends on zod
    version 4, which clashes with this repository's zod 3 -- see section 4.
27. Its package-level dependencies are a Node server stack -- two HTTP frameworks, a Node server
    adapter, a process spawner -- but its client modules are clean and build for a browser by deep
    import. It works in a page by accident, not design; its README mentions neither browser nor
    CORS. It is also a protocol era behind: its latest supported revision is 2025-11-25, where the
    current revision is 2026-07-28.
28. The package's browser field swaps three modules for browser variants. The memory stub's own
    header says the memory tool itself is runtime-agnostic and is re-exported for real, and that
    only the filesystem-backed handlers throw. So the protocol works in a page today and you supply
    six functions over IndexedDB or the origin private file system.
29. Actively maintained but the cadence is slowing (releases in April, May and September 2026), and
    its README still lists function calling as work in progress with preliminary support. Tool
    calling is load-bearing for every capability on the list in section 1, so this needs a spike
    before the no-key path is described as agentic. See section 6.
30. A real AI SDK language-model provider wrapping the browser's built-in model session API, with
    tool-call plumbing in the shipped bundle. It is the cheapest keyless in-page path by three
    orders of magnitude against an in-page model download, and it also ships an embedding model,
    which is relevant to semantic memory. Chromium-only. Nobody has run it here; it is worth an
    afternoon.

---

## 3. Strengths and weaknesses, candidate by candidate

### `ai` v7, the Vercel AI SDK -- the incumbent's own dependency, two majors on

**Strengths.** It is the best loop-control surface of anything examined, and loop control is where
planning, compaction and per-phase tool restriction are actually implemented. Multi-provider
breadth is the widest: three first-party providers plus an OpenAI-compatible adapter that reaches
local and self-hosted models, plus a registry and a middleware chain for wrapping any of them.
Approvals are first class and signed, so a forged approval inside a serialized state is detectable
-- which matters for a component embedded in someone else's page. It is the smallest serious
candidate by a wide margin, and the part of it that runs the loop is already installed, already
shipped into a browser, and already published from a separate entry point so that a consumer who
only draws a graph pays nothing. And the upgrade does not force a zod major, which was the expected
blocker and is not one.

**Weaknesses.** It gives you the loop and very little else. No memory, no session store, no MCP
client (that is a separate package), no planning scaffolding, no sub-agents, no checkpointing. Its
skills support is an upload to the provider's container, not a local skill run against local tools.
Anything above the loop, you build.

One structural caveat worth recording rather than discovering later. `ai@7`'s browser safety is not
a property of `ai` itself. It statically imports a gateway package, which statically imports a
Vercel identity-token package, whose own dependency tree reaches a process-spawning library two
hops further down. It does not reach a page, because that identity package declares a browser
condition in its own exports map and a browser-targeted bundler honours it -- verified in the build
metafile, and the spawner is never even installed. Vite honours that condition for client builds.
A bundler configured otherwise would pull a process spawner into a page. This deserves a build
assertion in the test suite, and the repository already has the right precedent: a test that fails
the build if any of five entry points stops being free of Babylon.js, Lit and the DOM.

A smaller detail nobody should be surprised by later: the shared transport package under the v7
providers has a static, unguarded import of a serialization helper (`@workflow/serde`, Apache-2.0,
zero dependencies, published 2026-06-11). It is benign, and it is new with the v7 line, and it is
not behind the runtime guard that the more-discussed Node fetch path sits behind.

### `@openai/agents-core` -- the most capable thing that runs in a page, aimed elsewhere

**Strengths.** The richest feature set of any browser-viable candidate, and several of its
capabilities are the ones nobody else has. Sub-agents as both control transfer and agent-as-tool.
Guardrails on final output *and* on tool inputs and outputs, each able to trip and abort -- the
closest thing in this survey to a verification mechanism. A run state with a JSON round trip that
carries pending approvals on the same object, so you serialize at an interruption, store it,
rehydrate and resume: exactly what makes an approval gate survive a page reload. Three MCP
transports written in-house rather than on the reference SDK, with the whole MCP module at 32 kB
and only relative imports. Tracing on by default. Its browser support is deliberate, not tolerated
-- its browser shim is a purpose-built event emitter over the DOM event system, not a throwing
stub, and every Node builtin in the package sits under an opt-in sandbox subpath or a Node shim the
main barrel never imports. Verified: the main entry builds for a browser, and the local sandbox
subpath correctly fails to.

**Weaknesses.** Its model layer is OpenAI's own client, which is OpenAI-shaped, needs an explicit
browser opt-in flag, and is 19.6 MB unpacked. Using it for Anthropic and Google means a second
adapter layer on top of one this repository already has and already uses. It is 331 kB gzipped
against 250 kB for the AI SDK with two providers -- and that comparison is generous to it, because
the AI SDK figure already includes both non-OpenAI providers while this figure does not.

The decisive problem is narrower than bundle size and harder to work around. graphty-element's
in-page model provider is **not a network client**. It is an engine object with a local
OpenAI-shaped API, a model download with progress events, a WebGPU device, a disposal path, and a
documented inability to accept a system prompt alongside tool definitions. Every harness in this
survey assumes an HTTP endpoint. Hosting an in-process engine inside OpenAI's SDK means writing its
provider interface yourself -- which is possible, and is work the AI SDK route does not require,
because the element already has a working provider abstraction with an in-page implementation
behind it.

Its skills story does not help either: the skill shapes in its public types are bound to its shell
tool and container environments, and a page has neither. Its memory is transcript persistence, not
durable knowledge.

### `@langchain/langgraph` -- the best durable-state story, the wrong shape for the ask

**Strengths.** The cleanest browser build of anything examined: across its entire ESM
distribution there is exactly one Node import, in a Node-only entry that installs an async-context
singleton, and the web entry and the Node entry otherwise have byte-identical import lists. Its
exports map declares the web build, so a bundler picks it automatically. It is the only candidate
whose core model is durable state: a per-thread checkpointer so a run can be interrupted,
inspected, rewound and resumed, plus a cross-thread store for long-term memory, plus an
interrupt-and-resume model that human approval is naturally built on. If checkpointing and time
travel were the requirement, this would be the answer.

**Weaknesses.** Chat models come from separate per-provider packages, so adopting it means
inheriting a second provider abstraction beside the one already here -- and one of those packages
pulls the 22 MB tokenizer. Its durable layer is RAM-only in a browser: the documentation states the
in-memory saver does not persist between restarts, and the persistent implementations shipped are
Postgres and SQLite, so a page means writing an IndexedDB checkpointer yourself. Nothing about
skills. And the conceptual surface is large -- you express the agent as a graph of nodes and
conditional edges, which is a lot of framework to adopt for what is, in the end, a loop with a stop
condition.

Worth naming to prevent a wrong turn: LangChain's higher-level agent library built on LangGraph
declares both a browser subpath and a browser condition, and **neither builds** -- it reaches a
path module through a glob matcher and two Node filesystem imports through a newer, unmapped part
of the LangSmith tracing client. LangGraph itself is unaffected.

### `@tanstack/ai` and `@tanstack/ai-skills` -- copy the skills design, do not adopt the harness

**Strengths.** Its skills package is the most useful single artifact in this entire survey, and it
is useful even if nothing is adopted from it. It is a complete implementation of the open Agent
Skills format with the filesystem assumption deliberately designed out. Its central abstraction is
a source interface of six methods -- list the catalog, load one skill's Markdown, list and read its
resources, list and read its scripts -- specified as bytes only, with its own header explaining
that a path field was omitted on purpose so that script execution can never be coupled to
filesystem-backed sources. It ships two sources that need no filesystem at all: a build-time
catalog object, and a single skill defined next to application code with lazily evaluated
resources. Verified: its Node-backed directory source is quarantined behind a separate subpath,
which correctly fails to build for a browser while the root entry builds fine.

And it replaces the shell with two tools. Progressive disclosure becomes function calls: the
catalog of names and descriptions goes in the system prompt, and the model asks for a skill by name
through an ordinary tool call whose handler returns a string. Its middleware options read as a
design checklist worth copying wholesale -- a catalog token cap with a policy for exceeding it,
catalog placement in the system prompt or in a tool description, and per-vendor catalog rendering.

**Weaknesses.** Whether its own chat loop can run in a page with a raw key was not established. Its
bring-your-own-key design is a relay: it forwards the key to a server as a header, its own
documentation describes environment variable names the relay may read, and it has a server subpath.
Its two skill tools are both registered through a server-side registration call whose meaning --
hard network boundary, or just "wherever the loop runs" -- could not be resolved from its
documentation. And it has no memory primitive at all: there is no memory, store, history or
persistence module anywhere in its distribution. Skills and memory do not come in the same box
here.

Read it, copy its interface, do not take the dependency until someone has watched its network tab.

### `@cline/agents` -- the near miss, and the reason metadata alone is not enough

It deserves a paragraph because on paper it is the best fit in the survey and it fails. Its README
describes it as the runtime-agnostic agent loop extracted from the Cline CLI, and what it offers is
closer to "sophisticated harness" than anything else that claims to run in a page: an agent with
run, continue, abort, snapshot and restore; seven lifecycle hooks where any hook can halt the run;
a plugin interface that contributes tools and hooks at setup; an event stream; and a per-turn
request rewriter that does not rewrite saved history. Its exports map declares a browser condition
and its distribution has no Node imports. Both of those are true and neither matters.

It does not build. Its loop imports exactly three symbols from its companion model package -- a
gateway constructor and two error classifiers -- and all three exist only in that package's Node
build, not its browser build. The same entry builds fine targeting Node. Beyond that: its own
README states plainly that filesystem access, shell execution, web fetching, session persistence,
transport and sub-agent coordination all live in its core package, which has no browser condition
and depends on a WebSocket library, a git wrapper, a machine-id reader and Node-specific tracing.
So every capability that would have made it worth adopting is on the Node side of its own split.
And its model, core and shared packages all declare no license.

### `@anthropic-ai/claude-agent-sdk` -- named so it can be set aside

Its browser entry point is real, shipped, 1.4 MB, and genuinely free of static Node imports. It is
a transport. Its own types require either a WebSocket URL or a streaming-plus-send URL pair with a
session id and headers; its accessors are sequence numbers and drop counts; its documented example
points at a hosted session-events endpoint with a bearer token. The agent loop runs on a remote
worker that Anthropic operates, the endpoints read as first-party plumbing rather than a public
API, and the package is proprietary. A browser client for a loop that runs elsewhere is not an
option for a component with no server.

---

## 4. The three hard constraints

### Can the agent loop run in a page with no server?

**Yes, and four candidates do it.** Verified by building each one with a browser-targeted bundler
against a real install, which is the step that separates a working candidate from a plausible one:
`ai` v7, OpenAI's Agents SDK, LangGraph, and TanStack AI's skills layer all produce a working
browser bundle. Two candidates whose own metadata says they are browser-safe do not: Cline's agent
loop and LangChain's higher-level agent library.

**What it costs**, minified, tree-shaken and gzipped:

- `ai` v7 alone: 107 kB
- `ai` v7 plus Anthropic, against the zod already installed here: 172 kB
- `ai` v7 plus Anthropic plus OpenAI: 250 kB
- `ai` v7 plus two providers plus an MCP client: 304 kB
- OpenAI's Agents SDK: 331 kB (its model layer is OpenAI's client; other providers cost more)
- LangGraph: 335 kB (plus a per-provider chat package each)

For scale, the element's root entry point is 399 kB unminified today. None of these is free, and
all of them are already behind the separate `./ai` entry point, so a consumer who only draws a
graph pays nothing for any of them. That is the single most important structural fact about this
decision, and it is already true.

One real cost that is **not** behind that entry point and should be fixed: the encrypted key store
is imported statically by `Graph.ts`, so the root bundle statically pulls in the encryption library.
The `./ai` entry's own file comment claims a consumer who never imports it pays nothing. That is
true of the three LLM SDKs and false of the key store. Separately, the four AI SDK packages sit in
`dependencies` rather than `peerDependencies`, so roughly 7 MB installs for every consumer whether
or not they ever import `./ai`.

### Can MCP work from a page?

**Yes, and it was verified live:** a browser page connected to a public MCP server on the open
internet, listed its real tools, and called one -- with no backend anywhere in the path. Separately,
a full current-revision handshake was completed against a local server: three POSTs, no server-push
stream, no session id. The current protocol revision, 2026-07-28, is friendlier to a page than the
one it replaced, because every message is now a plain POST to one endpoint.

**What can be reached.** Remote, HTTPS, CORS-enabled servers. Of fourteen hosted public endpoints
probed with a full MCP preflight, eleven pass: DeepWiki, Context7, Cloudflare's docs server, GitHub
Copilot, Linear, Notion, Asana, PayPal, Atlassian, Hugging Face and gitmcp.io. **Three are
hard-blocked for a page** -- Stripe, Sentry and Semgrep send no cross-origin header on the
preflight or on a real request, and nothing a client can do fixes that. So "the commercial remote
MCP world is browser-ready" would be an overstatement; roughly four fifths of it is.

There is a structural reason this is a per-server lottery rather than a protocol guarantee. The
transport specification requires servers to validate the Origin header and return 403 on an invalid
one, to prevent DNS rebinding. **It says nothing about cross-origin response headers at all.** And
every MCP POST must carry protocol-version, method and name headers, all of which are non-simple,
so **every single MCP call from a page triggers a CORS preflight** that the server must explicitly
permit. There is no way to make an MCP request simple.

The current revision adds a new hazard worth knowing before it bites: a server can annotate a tool
parameter so that conforming clients must mirror its value into an HTTP header whose name is
arbitrary and per-tool. That means a page's preflight needs a wildcard allow-headers or a
reflector. Most of the passing servers use a wildcard or reflect; **Context7 returns a fixed list
that does not include those headers**, so a Context7 tool using that feature would work everywhere
except a browser.

**What cannot be reached, and this is the important part.**

*Every stdio server.* A page has no subprocess and there is no in-page workaround. This is not a
marginal exclusion -- stdio is what nearly everyone actually runs: filesystem, git, SQLite, and
every server launched with `npx`. The standard bridge that lets a stdio client reach a remote HTTP
server runs as a Node process on the user's machine and is the opposite plumbing; it cannot help a
page.

*The user's own localhost servers, from a public site.* Verified as blocked: a real Chrome 145
session on a public origin fetching a CORS-enabled local MCP server failed with a console message
stating that permission was denied for the request to access the loopback address space. This is
not a mixed-content problem -- loopback is treated as a secure origin -- it is Chrome's Local
Network Access check, whose permission prompt launched in Chrome 142. Setting the explicit local
address-space hint did not change the outcome. So a consumer's site cannot silently reach the
user's local MCP servers; best case the user sees a browser prompt about connecting to devices on
their local network, and the local server still has to speak HTTP with CORS enabled, which almost
none do.

**What a user would have to do.** Supply a remote, HTTPS, CORS-enabled MCP server URL. If it needs
authentication, complete an OAuth redirect that navigates away from the page and back -- which
means **the embedding site has to host a callback route on its own origin**, a meaningful ask for a
drop-in web component. One mitigation is worth knowing: dynamic client registration is now
deprecated in favour of hosting a static metadata document at an HTTPS URL and using that URL as
the client id, which removes registration and client secrets entirely and is the difference between
workable and not for a library distributed to many origins.

One discovery detail that looked like a blocker and is not. Only one of the servers tested exposes
the authentication challenge header to a page, so a page's fetch cannot read the 401 challenge on
most of them. It turns out not to matter: the well-known protected-resource metadata path is
CORS-enabled everywhere tested -- including on Stripe and Sentry, whose actual MCP endpoint is
blocked -- and the reference client ships a retry that falls through to it. So OAuth discovery from
a page works regardless; what fails on those three servers is the MCP POST itself.

**Framed honestly for the owner's actual question.** MCP in the browser buys graphty-element access
to a growing set of *hosted SaaS* tools -- issue trackers, documentation, code search. It does not
buy "point it at your data and get a graph", because **the data-loading half of the MCP ecosystem
is local-first and structurally out of reach.** The servers that read a CSV, a SQLite file or a
local database are exactly the stdio ones a page cannot touch. Shipping MCP and describing it as a
data-loading feature would be a promise the transport cannot keep.

**Cost.** The reference client at 85 kB gzipped, and one integration problem: it depends on zod
version 4 while this repository pins zod 3. That is a dependency, not a peer, so it installs its
own copy -- and measured, installing it alongside the existing zod produces **three** copies of zod
(the root one at 3.25.76, plus one each inside the MCP client and its core package). The marginal
cost of adding MCP on top of `ai@7` and two providers, duplicate zod included, is about 100 kB
gzipped. Migrating graphty-element to zod 4 would roughly halve that, and is worth doing on its own
terms, but it is not a prerequisite.

### Can skills and memory work in a page?

#### Skills

A skill is normally a folder: `SKILL.md` plus optional reference files and scripts. **The format
ports to a page completely. The execution model does not, and the part that does not port is
scripts.**

Anthropic's own architecture documentation is blunt about it: skills run in a code-execution
environment with filesystem access and bash, and when a skill is triggered the model uses bash to
read `SKILL.md` from the filesystem. Its reference implementation downloads skill archives and
shells out to unzip or tar. Every shipped skills implementation assumes a POSIX filesystem and a
shell. The two npm packages that load skills are both Node command-line tools.

**The browser equivalent, and it is a good one.** Two of the three levels of progressive disclosure
port cleanly and the third has an honest answer.

- **Level 1, the catalog.** Names and descriptions in the system prompt, about 100 tokens each.
  Identical in a page.
- **Level 2, the body.** Replace bash with a tool call. Define a `load_skill` tool that takes a
  name and returns the Markdown body plus a list of the skill's resources and scripts. The model
  asks for a skill the same way it asks for anything else. Identical behaviour, no shell.
- **Level 3a, reference files.** A second tool, `read_skill_resource`, over a source interface
  specified as bytes rather than paths -- so the backing store can be a bundled object, an
  IndexedDB row, a fetched URL or a database, and none of them need to look like a filesystem.
- **Level 3b, scripts.** **These cannot run, and the right move is to refuse them explicitly rather
  than ignore them.** Report each script to the model as present and not executable, with a reason.
  This is not a graphty-element limitation: the one browser-shaped skills implementation found,
  published yesterday and Node-capable, types scripts as non-executable with the reason "no
  runtime" and a comment that a later phase will change it. Nobody has shipped skill-script
  execution outside a virtual machine.

  For completeness, the one thing that *would* provide bash and a filesystem in a page is
  disqualifying for this component. It requires cross-origin isolation, which is a header change on
  the **consumer's own page** that breaks most third-party embeds, and its own documentation says
  the required isolation mode is Chromium-only. A drop-in web component cannot impose that. Its
  last stable release was 2026-04-14, five months ago.

**What graphty-element could offer, in ascending cost.**

1. **Bundled skills.** Ship graph-domain skills as an object literal inside the `./ai` entry: how to
   compare two centrality measures, how to style a path result without clobbering the layers
   beneath it, how to pick a layout for a given density. Zero new dependency, zero runtime cost
   beyond the catalog tokens. A straight win.
2. **Consumer-provided skills at construction.** The consumer passes an array of name, description,
   body and resources when configuring the element. They can fetch them, import them from their
   bundler, or type them inline. No filesystem, no permission prompt, no trust problem beyond what
   the consumer already owns.
3. **End-user-loaded skills at run time.** This is a separate product decision, not an
   implementation detail, and it should be decided rather than assumed. The portable delivery
   mechanism is a zip upload -- the folder picker that would let a user hand over a real directory
   is Chromium-only, with the relevant Firefox and Safari compatibility entries recording no support
   at all. Unzipping in a page is solved by a zero-dependency 8 kB library. But it means a component
   embedded in somebody else's page ingesting arbitrary model-directed instructions from that page's
   visitors. The specification's own security section -- use skills only from trusted sources, a
   malicious skill can direct the agent to invoke tools in ways that do not match its stated
   purpose -- was written for a developer installing onto their own machine, which is a different and
   much kinder threat model. That somebody already publishes a tool whose stated purpose is scanning
   skills for prompt injection before an agent reads them suggests the answer is not obviously yes.

Recommended: (1) and (2) together, because (1) alone is a closed system and (2) alone means a
consumer starts from nothing. (3) deferred, and documented as deferred.

**And say which one the documentation claims.** "Supports skills" without qualification would be
false: a browser harness can honestly claim skills-as-instructions and cannot claim skills-as-code.
That distinction belongs in the docs, not in a footnote nobody reads.

#### Memory

**Nothing off the shelf does this in a browser.** The named memory products are all server-side: one
depends on a Node HTTP client and peer-depends on Postgres, Redis, MySQL, MongoDB, SQLite, Oracle
and a rack of vector databases, with its hosted client meaning your users' conversation content
goes to a third party; another requires Node 22 and states outright that memory requires a storage
provider to persist history; a third is a platform. LangGraph has the right interfaces and no
browser implementation of them. TanStack AI has no memory module at all.

**What does port is the contract.** Anthropic's memory tool is six string-in, string-out commands
over a virtual path namespace -- view, create, str_replace, insert, delete, rename -- and its
documentation is explicit that the tool operates client-side, that the application executes the
file operations, and that the namespace prefix is one your handler maps onto whatever real storage
you like. Its SDK's browser build re-exports the tool and its command dispatch for real and stubs
only the filesystem-backed handlers. So the protocol works in a page today and you supply six
functions. Those six functions are ordinary and portable: the same shape defined as a plain
function tool works for every provider, losing only the automatic system-prompt instruction that
Anthropic injects, which you would write yourself.

**What the browser gives you to store it in.** The origin private file system is available in
Chrome 86, Firefox 111 and Safari 15.2 and later -- genuinely universal -- and is already a file
hierarchy, which makes it the natural backing for a memory tree. IndexedDB is the alternative and a
simple path-to-contents map is all the resource reader needs. Synchronous local storage is capped
at 10 MiB and is the wrong tool. Quotas are generous: up to 60% of disk in Chromium, the smaller of
10% or 10 GiB best-effort in Firefox, around 60% in Safari for a browser app.

**What it gives up, and this needs to be in the documentation rather than discovered.** Default
storage is best-effort and evicted least-recently-used under disk pressure, and when an origin is
evicted everything goes together -- IndexedDB, caches and the file system, never partially. A
persistence request opts out of that (Firefox prompts; Chrome, Edge and Safari decide silently from
interaction history). And the one no engineering fixes: **Safari deletes script-created data for
any origin with no user interaction for seven days.** A user who visits a consumer's graph page
monthly has no memory in Safari, full stop. Also relevant if the element ever ends up in an iframe:
Safari gives a cross-origin frame roughly a tenth of its parent's quota.

**Three tiers, in value-to-cost order.**

1. **Preferences as a small, named, human-readable store.** Not embeddings and not summarization: a
   handful of keys the agent may read and write. "Prefer 2D over 3D." "Always use the
   colourblind-safe palette." "When I say important nodes I mean betweenness centrality." This is
   the requirement as the owner stated it, it needs no new dependency, and the store is small enough
   to load wholesale into the system prompt every turn. It is also the tier where an end user can
   *see* the entire memory in a settings panel, which resolves most of the privacy question by
   construction.
2. **The six-command memory tool over the origin private file system**, exposed as a plain function
   tool to every provider. This is the tier that makes "verify its own work across multiple turns"
   durable at all, because the model needs somewhere to record progress that survives a context
   reset. The return string formats are fully specified in the documentation, so there is nothing to
   invent.
3. **Semantic recall.** Only if an in-page model is already loaded, using its existing embedding
   pipeline and a brute-force cosine scan over a typed array. For the scale a graph component's
   memory reaches -- tens to low hundreds of entries -- that beats any vector-store dependency on
   both correctness and size. Adding a general-purpose in-page embedding library costs a 23 MB model
   download and drags native binaries into every consumer's install unless it is an optional peer.
   Do not build this tier until the first two are in use and something concrete demands it.

**Four things a library must get right before it stores anything**, because this data belongs to the
consumer's users, sits under the consumer's origin, and falls under the consumer's privacy policy --
written by somebody who did not write the code that wrote it.

- **Off by default, enabled by an explicit named call.** The existing key manager already sets this
  precedent in this repository: persistence is opt-in and the caller supplies the encryption key.
- **Listable and deletable through public API** -- list, read, delete one, delete all. The embedder
  will be asked for a deletion and cannot honour it through an API that does not exist. It is also
  just the obvious behaviour: a user who says "forget that" must be able to make it true.
- **Encryption at rest is mostly theatre and should be described as such.** Anything the page can
  decrypt, script on that origin can decrypt. It defends against a shared machine and casual
  inspection, not against cross-site scripting. Related and worth doing anyway: the pinned
  encryption library is at 2.14.7 (published 2025-07-08, fourteen months old) over an older crypto
  library; its 3.x line replaced that with modern audited primitives.
- **A memory store is a persistent prompt-injection surface.** The agent reads node and edge
  attributes from user-supplied datasets -- that is the entire point of this component -- and if it
  can also write to memory, a crafted dataset can plant an instruction that survives into every
  future session. That risk is specific to this component and does not exist for a coding agent
  reading its own repository.

---

## 5. What the existing AI layer already does, and what a replacement still has to write

`graphty-element/src/ai/` is 7,363 lines across 33 files, with 8,266 lines of tests behind it. It
ships from its own entry point, `@graphty/graphty-element/ai`, and is reached from the root entry
through a dynamic import, so it is dynamically loaded even when the root barrel is used.

| Area | Lines |
|---|---|
| Commands: 11 files, 17 verbs | 2,651 |
| Providers: in-page WebGPU model 674, AI SDK wrapper 344, mock 247, interface and index 219 | 1,484 |
| Core: controller 510, manager 408, status 291, index 93 | 1,302 |
| Schema extraction and formatting | 1,086 |
| Input adapters: voice 239, text 84, types and index 60 | 383 |
| System prompt builder (unused -- see below) | 240 |
| Encrypted API key store | 217 |

### What it does well, and none of it comes from a harness

**Schema extraction, 1,086 lines.** It samples up to 1,000 node and edge attribute objects, evenly
spaced, and runs two analyses over them. One infers type, string format and numeric range. The other
decides whether a string field is categorical, using a published dual-threshold rule the code cites
by name: at most ten distinct values *or* a distinct ratio of at most 0.2, with every value at most
64 characters and at least 25 samples. Results merge into a per-property summary, recursing three
levels deep with dotted names, and render as Markdown for the prompt with enum values truncated at
ten. It re-extracts on new data behind a 300 ms debounce.

This is the difference between a model guessing that a node type might be "server" and knowing that
the field takes exactly the five values the loaded data contains. **No general-purpose harness gives
you this, because no general-purpose harness knows what a graph node is.**

**Commands that write through the element's own contracts, 2,651 lines.** The element knowledge
inside them is the expensive part and it does not transfer:

- The style commands validate a selector through the element's own validator *before* adding a
  layer, so a malformed selector is refused with every problem at once including a character offset.
  The file's header comment records why: the previous version ran the selector per element and
  turned an unparseable selector into an empty result, which reached the reader as "no nodes
  matched" -- the same words a correct answer of zero uses.
- Layers are tagged with a source and swept by source predicate rather than by a list that goes
  stale.
- Requested style properties that have no channel are *reported back* rather than silently dropped.
- The camera command's description is a **getter**, not a string, so it is evaluated each time the
  prompt is built and a camera view registered by a third party at run time is named to the model.
  Its parameter is deliberately a free string rather than an enum for the same reason.
- The dimension command passes 2D and 3D as strings, with a comment recording that one provider
  rejects non-string enum values.

Every one of those exists because somebody hit the bug.

**A real regression suite against live models.** A test harness subclasses the provider to capture
tool calls and token usage, runs against a live model at zero temperature, and supports flexible
expectations and a retry policy, across nine test files.

**Bring-your-own-key storage.** A browser-only library has no server to hold a key, so this stays
its problem whatever runs the loop.

### What it does not do

Against the owner's five requirements: **no planning** (nothing sits between user text and one model
call); **no multiple turns** (one provider call per input, and tool results are never returned to the
model -- the only loop in the controller iterates the tool calls from a single response); **no
self-verification** (the first failing tool breaks the loop and the failure text goes to the human,
not the model, so it cannot retry with different arguments; the retry method replays the original
user string verbatim); **no MCP** (zero occurrences in `src/ai/`); **no skills** (zero); **no
memory** (the message array is rebuilt from scratch as system-plus-user on every call, and nothing
survives a command except the last input and last error). Multiple LLMs entirely in-browser is the
one requirement already met -- genuinely, today, with three cloud providers and one in-page model --
and it must not be regressed.

### Defects worth fixing regardless of what is adopted

- **The richer system prompt builder is dead code.** 240 lines that assemble live node and edge
  counts, the current layout, the schema, per-command descriptions **with two worked examples each**,
  and eight numbered instructions. Nothing in the source constructs it; it is reachable only as a
  re-export. The prompt that actually ships is four lines inlined in the controller. A second
  consequence: every command carries three to seven examples, and **those examples reach the model
  through no path at all**, because only the dead builder reads them.
- **Four commands are exported and never registered**, so out of the box the agent cannot run
  PageRank or take a screenshot: running an algorithm, listing algorithms, capturing a screenshot
  and capturing video. And **one command is registered but exported nowhere** -- the schema query --
  so a consumer building a custom registry cannot obtain it.
- **Three selector languages in one command set, with two spellings of the same path.** The node
  search uses a hand-rolled regular expression supporting exactly two patterns and spells the path
  `type`; the style commands use the element's declared selector subset and spell it `data.type`;
  the camera zoom runs a raw selector library per node and spells it `type`. Two of the three turn
  an unparseable selector into a silent empty result. A model that learns `data.type` from the style
  tool gets zero matches from the search tool. This is the worst structural problem in the layer,
  and **a harness will inherit whichever spellings survive**, so it should be fixed before a
  migration rather than after.
- **Two silent stubs.** Video capture returns success and does nothing, its own note saying it needs
  canvas-level work. The camera zoom declares a padding parameter, casts it, and never passes it on
  -- the model can set it and it vanishes.
- **The in-page model receives no system prompt at all**, because it declares that it cannot take a
  system prompt alongside tool definitions and the controller therefore skips the entire system
  message -- which means it skips the command list *and the extracted schema*. All 1,086 lines of
  schema work are discarded on exactly the path that needs them most, since a one-billion-parameter
  local model has the least prior knowledge.
- **The tool schemas sent to the in-page model carry no parameter names.** Its tool conversion puts
  the raw Zod object where JSON Schema is expected. Serialized with the installed Zod, that produces
  an internal-definition blob with no property names, no types and no descriptions. The AI SDK path
  is unaffected because the SDK converts Zod itself. Whether the in-page tool path has ever worked
  is an open question and the first thing to test.
- **The app duck-types the element's AI types and the duck type has drifted.** The app's own header
  comment says the shapes are its own duck types kept for now and that the real ones are exported by
  the element's AI entry point. They no longer match: the app declares a status with one field of six
  values; the element's real status has a differently named field of five values plus a separate
  stage field of three. Per this repository's architectural rules, that header comment is a bug
  report that was never filed.
- **Dependency age.** Two dependencies in the AI path are effectively abandoned and both are
  load-bearing: the schema inference library was last published 2023-05-23 (over three years) and the
  entire type, format and range half of schema extraction rests on it; the selector library was last
  published 2022-01-19 (over four years).

### The arithmetic of a replacement

**Replaced by any competent harness -- 1,851 lines, 25%:**

| Piece | Lines | Why it goes |
|---|---|---|
| Controller | 510 | the single-turn flow being replaced; also the smallest piece |
| Provider interface, AI SDK wrapper, mock, index | 810 | every harness brings its own model abstraction |
| Status | 291 | replaced by the harness's step and event stream |
| System prompt builder | 240 | already dead; delete it either way |

**Rewritten on top, or kept -- 5,512 lines, 75%:** the 2,651 lines of commands (a harness gives you
a tool *registration* mechanism; it never gives you the verbs), the 1,086 lines of schema
extraction, the 674-line in-page model provider unless the new harness ships its own in-page model
adapter -- none do -- the 217-line key store, the 383 lines of input adapters, and most of the
408-line manager.

**So the comparison turns on a narrow question, not a broad one, and the replaceable quarter is the
cheapest quarter to write.** What a candidate must actually be judged on is: whether the existing
command shape -- name, description, Zod schema, examples, and an async execute taking the graph, the
parsed parameters and a context -- survives translation into its tool format, specifically the abort
signal, the parse-and-transform boundary where colour names become hex and defaults land, and the
description-as-getter trick; whether it can host an in-process engine rather than only HTTP
endpoints; and what it adds beyond a stop condition, which delivers the multi-turn requirement by
itself.

---

## 6. The recommendation

**Extend what exists, on the substrate that is already installed. Do not adopt a second framework.**

Concretely, in four phases. Effort figures distinguish measured line counts (what gets deleted) from
estimates (what gets written), and the estimates are for implementation plus tests.

### Phase 1 -- the multi-turn loop. This is the whole of the original ask.

Upgrade `ai` from the pinned 5.0.104 line to 7, and rebuild the controller as a thin host over the
SDK's agent loop with a stop condition, a per-step hook, approvals and message pruning.

- **Deleted: 1,851 measured lines** (controller, provider interface and wrapper, mock, status, the
  dead prompt builder).
- **Written: 600 to 900 estimated lines** -- agent construction, a tool adapter from the existing
  command shape, status and event mapping for the app and stories, and an in-page-model adapter that
  presents the existing WebGPU engine to the SDK as a language model.
- **Kept and re-pointed: 5,512 lines**, of which the commands need a mechanical adaptation (their
  shape already matches: name, description, Zod schema, execute) and the schema extraction needs none
  at all.
- **Bundle: 172 kB gzipped** for the loop plus Anthropic against the existing zod; 250 kB with a
  second provider. All behind the `./ai` entry, so a graph-only consumer pays nothing.
- **No zod major.** `ai@7` imports from `zod/v4` and the installed zod 3.25.76 already exports that
  subpath, verified by building it. Measured, the build against the old zod is *smaller* than against
  zod 4.

Net effect: the line count goes **down** by roughly a thousand, and the layer gains multi-turn tool
execution, programmable stop conditions, per-step tool restriction (which is how plan-then-act gets
built), signed tool approvals, context pruning, real streaming, tool-call repair, per-step usage
accounting and a telemetry hook. That is eight items from section 1 for a net deletion.

The self-verification loop then becomes available for free and is worth building immediately, because
this component can do something none of the candidates can: the agent styles the graph, calls the
screenshot command, and looks at what it did. Register the four unregistered commands as part of this
phase and that loop exists.

Also in this phase, because a harness will inherit them: **collapse the three selector languages into
one** with one path spelling, fix the in-page model's missing system prompt and its Zod-instead-of-
JSON-Schema tool conversion, export the schema command, and replace the app's drifted duck type with
the element's real exported one. Roughly 100 lines changed across six files, minus about 300 deleted
with the two redundant selector engines.

Add a build assertion, in the style of the existing test that keeps five entry points free of
Babylon.js, Lit and the DOM: **a test that fails if the AI entry point stops producing a working
browser bundle.** `ai@7`'s browser safety depends on a browser condition three dependency hops away
in a package that is not Vercel's AI SDK at all, and on the bundler honouring it. That is fine and it
should not be a silent assumption.

### Phase 2 -- skills, instructions only

Implement the open Agent Skills format with a bytes-only source interface, and replace the shell with
two tools: load a skill by name, and read one of its resources. Ship graph-domain skills bundled, and
accept consumer-provided skills at construction. Report scripts as present and not executable with a
stated reason.

- **Written: 400 to 500 estimated lines.** No new dependency -- the frontmatter subset is small
  enough to parse by hand, and if a YAML library is preferred, the obvious one ships a dedicated
  browser build.
- **Not in scope: end-user-loaded skills.** That is a liability decision, not an implementation
  detail, and it is the one thing on this list that should come back as a question rather than a
  plan.
- **Documentation must say "skills as instructions".** Claiming the word unqualified would be false.

### Phase 3 -- memory, preferences first

Tier one: a small named preference store the agent may read and write, visible and deletable in the
settings UI, loaded wholesale into the system prompt. Off by default, enabled by an explicit call,
with list, read, delete-one and delete-all on the public API.

- **Written: 200 to 300 estimated lines.** No new dependency.

Tier two, if tier one proves itself: the six-command memory contract over the origin private file
system, exposed as a plain function tool to every provider.

- **Written: 400 to 500 estimated lines.** No new dependency; the contract's string formats are
  fully specified.
- **Document the limits, including Safari's seven-day deletion of data for origins with no
  interaction.** A memory feature that silently evaporates is worse than one that says it might.

Skip semantic recall until something demands it.

### Phase 4 -- MCP, scoped honestly

Add the reference MCP client as an **optional peer dependency**, exactly as the in-page model and the
WebGPU algorithms package already are, so a consumer who does not want it pays nothing. Bridge its
tool list into the agent's tool set. Handle the OAuth redirect, using the static client-metadata
document approach so no registration or client secret is needed.

- **Written: 400 to 600 estimated lines**, plus the consumer-facing callback-route requirement, which
  is a documentation and API-design problem as much as a coding one.
- **Bundle: about 100 kB gzipped marginal**, including three copies of zod. Migrating graphty-element
  to zod 4 roughly halves that and is worth doing on its own terms.
- **Describe it accurately.** "Connect to a remote, CORS-enabled MCP server" -- not "load your data
  via MCP". Roughly four fifths of hosted public servers are reachable; local servers, which is what
  nearly everyone runs and where the data actually lives, are not reachable at all.

### Why not adopt OpenAI's Agents SDK or LangGraph

Because with either one you still write phases 2, 3 and 4 -- neither ships browser skills, neither
ships browser-persistent memory -- **and you add work that the AI SDK route does not require.**

With OpenAI's SDK: write a provider adapter for Anthropic and Google, whose AI SDK equivalents exist
and are already in use here; write a provider implementation to host the in-page WebGPU engine, which
is not an HTTP endpoint and which no harness expects; re-point 2,651 lines of commands at a different
tool shape; and ship 331 kB gzipped instead of 250, before the non-OpenAI providers are counted. What
you get uniquely is sub-agents, tool-level guardrails and a serializable run state. Those are real
capabilities and they are not the ones being asked for.

With LangGraph: inherit a second provider abstraction beside the one already here, one of whose
packages pulls a 22 MB tokenizer; write an IndexedDB checkpointer because the shipped ones are
in-memory, Postgres and SQLite; and adopt a graph-of-nodes programming model for what is a loop with
a stop condition. What you get uniquely is the best durable-state and time-travel story in the
survey. If checkpoint and rewind were the requirement, this would be the answer. They are not on the
owner's list.

And read TanStack AI's skills package before writing phase 2. Do not take the dependency -- whether
its own loop runs in a page is unresolved and its key handling is a server relay -- but its source
interface and its middleware options are the right design and were arrived at by someone solving
exactly this problem.

### What would change the answer

- **If the in-page model cannot do tool calling well enough to drive a loop.** Its README still calls
  function calling preliminary work-in-progress; the types are real, and nobody has run it. This is
  the first thing to test, because if it cannot, then "runs entirely in-browser with no API key" is
  text-only today and the statement needs qualifying. **The cheap fallback found in this survey is
  worth an afternoon regardless:** a published AI SDK provider that wraps Chrome and Edge's built-in
  on-device model, with tool-call plumbing in its shipped bundle, which bundles at **28 kB** against
  14 MB of library and a multi-hundred-megabyte model download. Chromium-only, and it would make the
  keyless path nearly free where it works.
- **If sub-agents, handoffs or a serializable resumable run state become requirements.** Then OpenAI's
  Agents SDK earns its extra 80 kB and its provider work, and the decision should be revisited.
- **If a server ever becomes acceptable.** The entire analysis inverts. Claude Code as a remote
  session, hosted memory products, full stdio MCP through a gateway, and skills-as-code in a real
  sandbox all become available immediately. Every one of them is excluded here by the no-server
  constraint alone, not by quality. Worth stating so the constraint is a decision rather than an
  assumption.
- **If graphty-element migrates to zod 4.** The marginal cost of MCP roughly halves. Independently
  worth doing; not a prerequisite for anything above.
- **If skills-as-code is genuinely wanted in a page.** The only mechanism that provides bash and a
  filesystem requires a cross-origin isolation header on the consumer's own page, is Chromium-only
  by its own documentation, and breaks most third-party embeds. For a drop-in web component that is a
  no, and it will stay a no until the platform changes.

### What this does not deliver, stated plainly

No sub-agents. No serializable run state surviving a page reload (phase 1 could add one against
IndexedDB later; it is not in the plan). No skill scripts. No MCP access to the local stdio servers
where most data-loading servers live. No observability beyond an event stream the consumer forwards
themselves, because there is no collector to send traces to. Each of those is either a deliberate
scope decision or a platform limit, and none is a consequence of choosing the AI SDK over its rivals
-- every candidate is in the same position on all six.

---

## Appendix A -- how the numbers were produced

Runtime claims rest on four kinds of evidence, in descending order of how often they disagreed with a
project's own front page.

1. **A real browser-targeted build.** Every candidate was installed and bundled with browser
   conditions. This is the step that separates working from plausible, and it is where two candidates
   whose own npm descriptions say "browser-safe" died. Every size in this document is minified,
   tree-shaken and gzipped from such a build. Unpacked npm sizes are not quoted anywhere, because
   they include sourcemaps, source trees and dual module formats and are useless for this decision.
2. **Reading the JavaScript inside the published package.** Which modules reference Node builtins, and
   crucially *where in the exports map* they sit. The reliable pattern across all three strong
   candidates is identical: the main entry is transport-agnostic and pure, and everything that spawns
   a process lives behind a separate subpath a browser never imports. Verified in each case by
   confirming the quarantined subpath correctly fails to build.
3. **Registry metadata.** Useful for licenses, dependency graphs and publish dates. Two cautions
   learned here. A declared Node engine range is an install hint, not a runtime gate -- every package
   in the AI SDK family carries one and the SDK demonstrably runs in this repository's browser bundle
   today. And a Node-looking dependency is not conclusive: the one that looks worst in the AI SDK's
   transport package is reached only through a dynamic require inside a function guarded by a runtime
   check that is false in a page.
4. **Live requests from a real browser.** Used for the MCP conclusions: connecting to public servers,
   probing fourteen hosted endpoints with full MCP preflights, and confirming that a public origin
   cannot reach a local server.

Where a project is not on npm, its source was read for the same signals.

## Appendix B -- named so they can be set aside

**Agents that drive a browser from Node.** Most search results for "browser agent" are this, and it
is the opposite of what is wanted: a Node process controlling Chrome. Both major SDKs ship a computer
or browser tool, and one provider's API has around thirty configuration types for it. Not relevant.

**Browser clients for a loop that runs elsewhere.** The trap this survey exists to avoid. The
category includes Claude Code's browser entry point, TanStack AI's key-relay design, DeepSeek's
harness (whose loop has a static unguarded Node crypto import on line 2 while its web packages are a
user interface), Cline's board, and Goose's desktop app. **The official MCP Inspector belongs here
too and should never be cited as precedent:** its own documentation describes it as a single-page app
backed by a small Node server that owns the MCP connections, and says that server exists because it
can spawn processes on your machine. Even the official MCP web tool does not run MCP in the page.

**Things that are stale enough to matter.** Flagged where they appear: a vector search engine at nine
months, a React hook widely cited as *the* browser MCP library that is fourteen months old with no
license field and predates both the SDK split and the current protocol revision, two abandoned
vector search packages at three years each, and the incumbent's own schema inference library at over
three years and selector library at over four.

**One correction to a claim that will otherwise resurface.** Pi -- the harness that prompted this
question -- is *not* stale. Its packages moved scope and were published 2026-09-21. It is excluded
for its dependency graph: a Node HTTP request handler, two proxy agents and the AWS Bedrock client,
with no browser field or condition. The confirming detail is a sibling package whose stated purpose
is being a CORS and authentication proxy for it -- the project conceding that its provider layer
cannot be called from a page.
