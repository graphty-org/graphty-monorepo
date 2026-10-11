# graphty-element's assistant reaches every operation: design

Status: proposed, 2026-10-11, for the owner's review. Builds on
`design/ai/tanstack-ai-harness-design.md` (the engine seam, milestones 1 and 2, done on branch
`feat/tanstack-ai`) and lands on the same branch, inside the major release that branch is held for.

graphty-element's AI assistant turns a reader's request into graph operations. Today it offers the
model 15 hand-written tools (`BUILTIN_COMMANDS` in `src/ai/commands/`; two more capture tools are
exported but not offered, which is the goal's "about 20"). The inventory of every public member
(`doors.ts`, 951 door rows) collapses to 689 distinct operations; 465 of them are renderer
internals, lifecycle, machine preferences or the assistant's own settings, and the other 224 are
things a person could ask for. The tools reach 23 of those 224. Out of reach are most of the 64
distinct operations that change the project, the 26 that change only the view (camera, selection,
capture), and a catalog of 29 algorithms, 14 layouts, 12 import and 9 export formats, 35 style
channels, 18 palettes, 9 scales, 5 camera views and 7 project-setting groups.

This design makes every operation reachable, keeps the number of tools a model sees small, makes
the build fail when a new operation is neither reachable nor deliberately left out, and tells a
plugin author when their registration is not reachable.

---

## 1. The answer in one page

- **Eleven core tools, always offered**: `catalog`, `query`, `select`, `run_algorithm`, `results`,
  `style`, `filter`, `layout`, `view`, `edit_data`, `undo`. Each covers one family through an
  `action` field.
- **Seven on-demand tools**, offered once a `catalog` result names them: `sets`, `notes`,
  `import_data`, `export_graph`, `project`, `capture`, `immersive`.
- **Generated, not hand-written.** Every tool is built at run time from the catalog (built-in and
  registered entries), the zod schema of each session command (`./commands`), and a small manifest
  that groups commands and reads into tools. A plugin that registers an algorithm, layout, format,
  palette or camera with a description reaches the assistant with no further code (section 11
  shows one), and `assistantReach(session)` says when one does not.
- **Tool search lives in graphty's own loop**, so it works on every engine (2.4).
- **A small-model profile** offers four tools (`catalog`, `query`, `call`, `undo`); `call` reaches
  every other tool. The default picks it for WebLLM.
- **A coverage test** fails the build unless every command, every door and every catalog entry is
  reachable through some tool action or excluded with a reason code.
- **One write pipeline**: check structure up front; check graph references and run each call in
  order inside the message's transaction; measure what the batch actually did and hold it for the
  reader's approval when it is large, slow or irreversible; roll the whole batch back on any
  failure; one undo step per message. Results are compact `{ code, params, data }`, paged.
- **A task-based behavior suite** of 99 tasks drawn from the 25 user workflows and the agent use
  cases, graded on the session's state (and, for questions, on the final answer). A free replay
  runs on every pull request; the paid run on Google gates the release train.
- **Public API**: mostly additive; five breaking changes ride in the major this branch is held for
  (section 12).

---

## 2. Tools and how a model finds them

### 2.1 Design rules

- **One tool per family, an `action` per verb.** Selection accuracy falls past 10 to 20 tools.
- **The long tail is data, not tools.** Catalog names are enum values or are found by `catalog`
  search; their options come from `catalog` describe. A generated enum is used only up to 40
  values; above that (a consumer with a plugin pack) the field is a plain string, validated against
  the catalog, whose description says "use catalog search".
- **Flat argument objects.** The provider schema is one flat object per tool: an `action` enum plus
  the union of the actions' fields, each optional and described with the actions that use it.
  graphty validates per action with the exact zod schema (a discriminated union on `action`).
- **Placeholders are absent.** Models fill unused fields with `""`, `[]`, `0` or `null`. Before
  validation, `""`, `[]` and `null` become absent; a field belonging to another action is refused
  only when it carries a real value.
- **Targets are explicit.** A write takes exactly one of `where`, `ids` or `result`. "Everything" is
  `where: "all"`; an empty or missing target on a write is `AI_ARG_INVALID`, never "match all".
- **Selectors are the element's language**, as today's tools document it: a record's fields under
  `data.` (`data.type == 'server'`), numbers in backticks (``data.weight > `0.5` ``). The checker
  repairs the two unambiguous mistakes (a bare known attribute name gets `data.`, a bare number gets
  backticks) and returns the result in `params.rewritten` so the model learns the form.
- **Algorithm results are never a path the model writes.** Wherever `where` is accepted,
  `result: { run, field, op, value }` selects by a run's value (`op`: `==`, `!=`, `<`, `<=`, `>`,
  `>=`, `in`). The tool builds the selector; run ids contain hyphens and hashes a model will not
  quote.
- **A run is named by what the model knows.** Every `run` field takes a run id, an algorithm key
  (the newest run of that algorithm, including one started earlier in the same batch) or
  `"latest"`. The resolved id comes back in `params.run`.
- **Nodes are named by what the reader says.** A `node-id` or `node-set` value that is not an id but
  is an exact, case-insensitive, unique match on the label column resolves to that node, reported
  in `params.resolved` (`{ "JFK": "3797" }`).
- **One spelling per concept.** A catalog entry is always `name`; values to set are always
  `values`; no field name equals an action name of another tool.
- **Descriptions** are English for the model, never shown to a reader: what it does, when to use it
  and when not, one example call. Their lists (channels, cameras) are generated from the catalog.

### 2.2 The core tools

Fields are TypeScript-like; `?` means optional; `cursor` is the opaque value a previous page
returned. A record `limit` defaults to 20 and is at most 50 unless a tool says otherwise. `Where`
abbreviates `where?: string; ids?: string[]; result?: { run; field; op; value }`.

**`catalog`** -- find and describe capabilities, not data. Why: the catalog and the on-demand tools
are too large to list; one tool with two actions keeps "search for the Medici" away from it, and
its description's first sentence says "finds algorithms, layouts, formats and tools -- not nodes;
use query for data".

```ts
{ action: "search" | "describe"; text?: string; kind?: CatalogKind; name?: string;
  limit?: number /* search: 1-10, default 5 */; detail?: "names" | "schemas" }
// CatalogKind is generated from one constant, CATALOG_KINDS: algorithm, layout, format,
// palette, scale, channel, camera, setting, tool
```

`search` returns hits `{ kind, name, plainName, summary, tool, action }`, best first; with
`detail: "schemas"` the first two also carry their argument schema. A hit whose tool is on-demand
loads it for the next turn (2.4). `describe` returns one entry: its option schema (3.3), defaults,
result fields, requirements, for an algorithm `session.estimate` on the current graph, and one
example call; for `kind: "tool"`, the tool's actions and schemas.

**`query`** -- read the data. Why: "how many", "which" and "what values" come first in most
workflows, and a large graph's answer must be paged.

```ts
{ action: "overview" | "nodes" | "edges" | "node" | "neighbors" | "find" | "attributes"
  | "histogram" | "statistics"; ...Where; text?: string; column?: string;
  hops?: number /* 1-3 */; fields?: string[]; limit?: number; cursor?: string }
```

Maps to `session.status`, `data.statistics`, `data.nodePage`, `data.edgePage`, `data.node`,
`data.edge`, `data.neighbors`, `session.find`, `data.attributes`, `data.histogram`. `overview` also
answers what the selection, the filter and the layout currently are (no `status` action elsewhere).

**`select`** -- change the selection; exempt from undo.

```ts
{ action: "set" | "add" | "remove" | "clear" | "neighborhood" | "save_as_set"; ...Where;
  hops?: number; name?: string }
```

**`run_algorithm`** -- run any catalog algorithm. Why: one tool for 29 algorithms and every
registered one. Its schema is generated from the `algo.run` op and `RunOptions`, so it carries what
a run already does for itself.

```ts
{ name: string /* enum of catalog keys up to 40, else a string */;
  options?: Record<string, unknown>; scope?: { set: string } | { where: string };
  style?: boolean | { size?: boolean } /* default: the run paints its own suggestion */;
  apply_suggested_styles?: boolean; exact?: boolean; sample?: number }
```

`name` also accepts the legacy keys in each entry's `legacyKeys` (`dijkstra` becomes
`shortest-path` with `method: "dijkstra"`), any case, `_` for `-`, and a `graphty:` prefix.
`options` is validated against the entry's schema (3.3); an unknown key fails with the allowed
options and a did-you-mean. Returns the run id and a summary of each result field (6.2).

**`results`** -- work with runs that exist.

```ts
{ action: "list" | "summary" | "top" | "histogram" | "page" | "rerun" | "cancel" | "remove";
  run?: string; field?: string; k?: number; order?: "highest" | "lowest"; select?: boolean;
  limit?: number; cursor?: string }
```

`top` with `select: true` also selects the `k` nodes. `cancel` of a run the assistant did not start
in this conversation is held for approval (4.2), since a cancel cannot be undone.

**`style`** -- every style operation.

```ts
{ action: "add" | "update" | "remove" | "move" | "apply_suggestion" | "encode" | "clear_mine"
  | "list" | "legend" | "explain"; ...Where;
  values?: { [channel: string]: JsonValue } /* keys: the session's channels */;
  encode?: { channel: string; attribute?: string; run?: string; field?: string;
  palette?: string; scale?: string; domain?: number[]; missing?: string };
  layer?: string; position?: "top" | "bottom" | "above" | "below"; relative_to?: string;
  node?: string; run?: string }
```

`values` is checked per channel against that channel's own schema, so object-valued channels
(`node.labelStyle`, `node.marker`) work; a nested `{ node: { color } }` is accepted and flattened;
one call mixing `node.*` and `edge.*` channels is refused. `apply_suggestion` applies a run's
`suggestEncodings()`, which the element derives for every algorithm, plugins included, scoped to
the run's own elements. `clear_mine` is `removeBySource` for the assistant's source.

**`filter`** -- what is visible; the reversible alternative to deleting.

```ts
{ action: "show_only" | "hide" | "clear" | "range" | "keep_neighbors"; ...Where;
  attribute?: string; from?: string | number; to?: string | number; enabled?: boolean }
```

**`layout`** -- layouts, scoped layouts, positions and pins.

```ts
{ action: "set" | "scope" | "pin" | "unpin" | "set_positions"; name?: string /* layout id */;
  options?: Record<string, unknown>; ...Where;
  positions?: { id: string; x: number; y: number; z?: number }[] }
```

**`view`** -- the camera, 2D or 3D, saved views; exempt from undo except saved views.

```ts
{ action: "dimension" | "camera" | "zoom_to" | "fit" | "save" | "restore" | "remove_saved"
  | "list_saved"; dimension?: "2d" | "3d"; preset?: string /* session.catalog.cameras() */;
  ...Where; name?: string }
```

**`edit_data`** -- add, change and remove nodes and edges. Core because "remove the Medici and
count what is left" is a common what-if.

```ts
{ action: "add_nodes" | "add_edges" | "update_nodes" | "update_edges" | "remove_nodes"
  | "remove_edges" | "remove_where" | "delete_all"; records?: Record<string, Primitive>[];
  ...Where }
```

**`undo`** -- undo and redo the assistant's own steps, and list recent steps.

```ts
{ action: "undo" | "redo" | "recent"; limit?: number }
```

Rules in 4.3: alone in its batch, at most one per message, assistant steps only.

### 2.3 The on-demand tools

- `sets`: create, create_from, path, combine, rename, redefine, add_members, remove_members,
  remove, restore, list, get, save_scope (the `set.*` commands, `sets.*` and `scope.*` reads).
- `notes`: add, update, remove, list, get.
- `import_data`: import (formats from the catalog; sources limited by 4.4), rename_source,
  last_import.
- `export_graph`: export (the export formats and their writer options; payload to the host, 4.4).
- `project`: settings (`config.set`, one field per setting group from its zod schema), rename,
  declare (`data.declare`), status. Saving is the host's (5.2).
- `capture`: screenshot, animation, cancel (payload to the host, 4.4).
- `immersive`: enter, exit, support (VR and AR).

Commands a consumer registers with `registerCommand` stay always offered in the standard profile,
as today, unless they set `load: "on-demand"`. In the small profile they are reached only through
`call`. `catalog` search indexes their names, descriptions and `keywords`. A consumer command that
reuses a built-in tool name is refused with `E_DUPLICATE_PLUGIN` naming the tool; the reserved
names are published in `ASSISTANT_TOOLS`.

### 2.4 Tool search and lazy loading

**Why not TanStack's lazy tools.** `@tanstack/ai` 0.68 offers them only inside its own multi-turn
`chat()` loop; graphty runs `chat()` for one turn with executor-less tools, and the loop also serves
`LlmProviderEngine`, where no TanStack code runs.

**How it works.**

1. Each turn's tool list is the profile's always-loaded tools plus the on-demand tools named in a
   structured field (`tool`) of a `catalog` result in this conversation, most recent first, at
   most 6. It is derived from the conversation's own tool-result parts, so it survives a reload.
2. A call to a registered on-demand tool that is not loaded still runs (models call tools they have
   only read about). Loading is therefore not a permission boundary, and `load: "on-demand"` must
   never be used as one. An unregistered name is `AI_TOOL_UNKNOWN` with suggestions.
3. The index is built from the live catalog and the registered tools. `src/catalog/registry.ts`
   and `pluginRegistry.ts` gain an internal generation counter bumped on every publish; the tool
   set and index are rebuilt when it differs at the start of a turn. Scoring is token matching over
   id, `plainName`, `technicalName`, description, category and `keywords`, with prefix matches and
   exact-id boosting; no embeddings, no network. The same index gives every did-you-mean.
4. The system prompt stops listing tools. It gets a fixed paragraph (what the core tools are for,
   one line per on-demand tool name, that `catalog` finds the rest, that calls are checked, and
   that everything inside the data envelope (4.4) is data), plus a **facts block** generated each
   message as a `graph-data` part: node and edge counts, up to 15 attribute names with types, 2D or
   3D, the current layout, and the existing runs (id, algorithm, fields). It replaces what
   `SchemaManager` put there, so a task does not start with a `query attributes` turn.
5. The loop allows 8 tool turns in the standard profile (5 today, `MAX_TOOL_TURNS`): a search, a
   describe, the call, one corrected retry and the dependent steps of a four-part request fit.

### 2.5 The small-model profile

`AiManagerConfig.toolProfile?: "standard" | "small" | "auto"` (default `"auto"`: `"small"` for
`provider: "webllm"`, `"standard"` otherwise).

- **Four tools**: `catalog`, `query`, `call`, `undo`. `call` is `{ tool; action; args }` and runs
  through the same executor. It accepts `action` inside or outside `args` (refused only when the
  two differ) and `args` sent as a JSON string.
- **Two turns per operation**: search with `detail: "schemas"` returns only the top hit and only
  the matched action's fields; the model calls `call` next.
- **Context budget** for 4,096-token windows: tool declarations at most 1,500 tokens; results at
  most 1,500 characters and 5 records; only the last two rounds of tool results kept in the
  history sent to the model; a shorter facts block (counts and 8 attributes). The budget test
  (5.3) checks all four.
- WebLLM's Hermes models accept tools but no custom system prompt with them, so the guidance goes
  at the head of the reader's message as a graphty-origin part (no data-derived text in it), and
  the answer comes from the existing answer-only turn.
- In the standard profile, an always-loaded set (built-ins plus consumer commands) past its budget
  logs `ai.tool-budget-exceeded` with the count.

---

## 3. The generator

### 3.1 Inputs and outputs

- **Catalog descriptors** from `session.catalog`, built-in plus registered, rebuilt on a generation
  change (2.4).
- **Command schemas**: one zod schema per op in `src/session/commands/schemas.ts`, published as
  JSON Schema from `./commands` (#337).
- **The manifest**, `src/ai/tools/manifest.ts`: families, the op-prefix map, the reads table,
  descriptions, which tools are core.
- **The door classification** (`DOOR_ROOTS` in `doors.ts`) and the **exclusions**
  (`src/ai/tools/exclusions.ts`), read by the coverage test only.

Output: per tool a `GraphCommand` (the existing public type, so `CommandRegistry`, `ToolExecutor`
and the loop need no second path) whose `parameters` is the per-action discriminated union, and
from it graphty's internal `ToolSpec` (`name`, `description`, `schema`, flat `jsonSchema`). The
engine types do not change.

### 3.2 How actions are generated

- **Writes come from commands.** Op `<family>.<verb>` becomes action `<verb>` (or the manifest's
  rename) of the tool the op-prefix map names (`set.` to `sets`, `visibility.` to `filter`,
  `positions.` and `layout.` to `layout`, `data.apply` to `edit_data`, ...). A discriminated-union
  op gives one action per member. A new op in a known family needs no code; a new prefix needs one
  map row, and the coverage test names it. Every field's description comes from the op schema or
  the manifest; the coverage test fails on a field without one.
- **Reads come from the reads table**: per read action the session member it calls, a small zod
  schema and a result shaper (6.2). Read-only members have no machine-readable schema, so this is
  the one hand-written part; the coverage test keeps it complete.
- **Catalog values** become enums (up to 40) or validated strings: `run_algorithm.name`,
  `layout.name`, the format fields, `view.preset` (from `session.catalog.cameras()`, so a
  `registerCameraView` camera is included), `style.values` keys, palettes (from
  `session.catalog.palettes()`) and scales.
- **Exempt actions** (camera, selection, capture, undo) map through the reads-table form, flagged
  `effect: "exempt"`.

Missing session forms gain one (additive), each with a door row: `session.layout.setScope`,
`session.export(format, options)`, and `session.estimate` for `layout.set` (so an O(n^2) layout on
a large graph can be held, 4.2; `layout set` is offered once it lands).

### 3.3 Option schemas from descriptors

`src/ai/tools/optionSchema.ts` turns `session.catalog.optionsFor(key, scope)` (the element's own
resolution of graph-dependent bounds, over the call's scope) into a strict zod object and its JSON
Schema:

- `number`, `integer`: with `min`, `max`, `step`. `boolean`, `string`, `enum`, `seed` (an
  integer), `ordering` (an enum).
- `node-id`: a string, resolved by id or unique label (2.1). `node-set`: ids or a selector.
- `attribute`, `partition`: a string naming a column of that kind (on `on`).
- `unknown`: not offered; a coverage failure for a built-in, an `assistantReach` code for a plugin.
- **Required**: an option with no `default` is required; every other option is optional and its
  default is the descriptor's. The coverage test checks every built-in `node-id` option against
  this rule (Dijkstra's source is required, PageRank's personalization is not).
- `internal: true` options are never offered; `advanced: true` options are described last.
  `describe` drops the per-node `values` list `optionsFor` fills in for node-id options past 20.

### 3.4 Argument bounds

Every generated schema, and `call`, enforce per call: at most 500 records, ids or positions;
`hops` at most 3; a selector at most 500 characters; any other string at most 1,000; record values
primitive or arrays of primitives; keys `__proto__`, `constructor` and `prototype` refused.

---

## 4. The write pipeline

### 4.1 Steps

1. **Structure, for the whole batch, before any call runs**: the tool and action exist, the zod
   schema passes, catalog names and option schemas match, bounds hold. A failure here runs no call
   of the batch; the others report `AI_TOOL_NOT_RUN`.
2. **Then each call in order, inside the batch's transaction** (`ctx.tx`), so a call sees what the
   calls before it did (`add_nodes` then `add_edges` over the new ids; a run then `style encode`
   with `run: "louvain"`):
    - check its graph references: ids, columns, run references, sets, selectors (`catalog.validate`);
    - a write whose target matches nothing (`data.nodePage({ scope: { where }, limit: 0 }).total`)
      fails with `AI_EMPTY_MATCH`;
    - a run whose estimate trips the slow gate is held before it starts (4.2);
    - run it.
3. **Measure** what the batch did: the `data.statistics()` delta, the counts each command returns,
   values changed, history bytes. Add it to the message's running totals. Totals past a limit roll
   the transaction back and hold the batch for approval (4.2).
4. **Any call failing** rolls back the whole batch (the transaction's rollback is the mechanism).
   This changes `ToolExecutor.runCalls`, which today commits the calls before a failed one.
5. **Shape** the results (section 6).

`session.plan` and `session.estimate` cover only `algo.run` today (`planning.ts` returns
`effect: none` and `available: false` for every other op), which is why size is measured, not
predicted. `available: false` on a non-run op means "no time gate", never "unbounded".

### 4.2 The gate: measured, configurable, approved by the host

A batch is **held** when:

- **slow**: a run's estimate passes the session's own `CostGateLimits.exactComputationSeconds`
  (30 seconds by default) and the run cannot be sampled or asked for `exact: true`, or the estimate
  is unbounded; a `layout set` whose estimate passes the same limit;
- **large**: the message's totals reach `removeNodes` (default 50) or `removeNodesShare` (0.2) or
  `removeEdges` (500) or `changedValues` (1,000), or the step would trim the reader's older history
  steps (`limitBytes`);
- **replaces**: `delete_all`, or an import over a non-empty graph;
- **irreversible**: `results cancel` of a run the assistant did not start;
- **network**: an import from a URL that `allowImportUrl` admitted (4.4).

The limits are `AiManagerConfig.gate?: Partial<AssistantGateLimits> | false` (defaults exported as
`DEFAULT_ASSISTANT_GATE_LIMITS`); `false` turns the gate off.

**Approval belongs to the host, never to the model.** This is milestone 3's approval request in its
smallest form, pulled forward: the held batch is stored by the controller under a single-use id
bound to the message and the session's `revision`; `ai-approval-requested` fires with `{ request:
{ id, gate, calls, preview } }`; the model's result is `AI_CONFIRM_REQUIRED` with the same preview
and no way to answer it. The preview carries the counts, the seconds and cost class, the selector,
and the first 10 affected ids with labels. The message resolves with the reader-facing
`AI_CONFIRMATION_NEEDED`. The host answers with `resolveAiApproval(id, { approve })`: approve
re-runs the stored batch as one step with `provenance.after` set to the message's step, and
resolves with its `ExecutionResult`; a changed `revision` gives `AI_APPROVAL_STALE`; deny gives
`AI_APPROVAL_DENIED`. The id expires at the next reader message. No tool schema has a `confirm`
field, so neither a model nor text planted in the graph can approve anything. A host that handles
no approval events never runs a held batch; it sets `gate` to change that. Milestone 3 adds
policies, persistence across a reload and edited arguments on the same request.

A held size gate costs one extra execution of the batch's writes; runs never execute twice, because
their gate is the estimate.

### 4.3 Undo and atomicity

- **One undo step per message**, as today: every batch's transaction joins the message's step,
  tagged `provenance: { via: "assistant", message }`. Exempt actions add no step; read-only
  messages add none.
- **Never half-applied, per batch**: 4.1.
- **Never half-applied, per message.** Only a failed write counts. A failed write's result carries
  `params.rollback: "pending"`: fix and retry in this message, or this message's writes are undone.
  A message whose last write batch failed with no later successful write batch is rolled back (the
  `MessageRolledBack` path); its result is `AI_TOOL_FAILED` with `params.cause` and
  `params.rolledBack` (batches undone). A message ending in a failed read or a failed camera or
  selection call keeps its writes. If `revertMessage` stops at someone else's step, the result is
  `AI_ROLLBACK_PARTIAL` naming the steps that remain.
- **The `undo` tool** runs only as the sole call of its batch, with no transaction open (an undo
  inside one cancels the batch itself, `types.ts` on `TransactionScope`), else `AI_UNDO_NOT_ALONE`
  and none of the batch runs. At most one undo or redo per message. It undoes the newest step with
  `provenance.via === "assistant"`; when reader steps sit above it, it refuses with
  `AI_UNDO_NOT_MINE` naming them, so neither "undo that" after a drag nor a planted instruction
  erases reader work. A step of the current message is refused (`AI_UNDO_IN_MESSAGE`).
- **Consumer commands** default to `effect: "write"`. Their writes join the step only through
  `ctx.tx`; a history step committed outside it during `execute` logs
  `ai.write-outside-transaction`, and side effects outside the session are never rolled back.

### 4.4 Trust: graph data, imports and payloads

- **Graph data is data.** Engines wrap every `graph-data` part (the facts block, data-derived
  strings) in a fixed envelope that the system paragraph names as data; no engine reads
  `PartOrigin` today, so this is new in each engine. Data-derived strings (labels, attribute names,
  notes, set and layer names, suggestions) never go into a graphty-origin part. The real defense is
  capability: the model cannot approve (4.2), cannot undo reader steps (4.3), cannot fetch an
  arbitrary URL and never receives export payloads (below).
- **Imports.** `import_data` never passes `config` (headers, credentials) through. Its source is a
  file or text the reader attached to this message, or a URL that appears verbatim in this
  message's reader-origin text. Any other URL is `AI_IMPORT_URL_REFUSED` unless
  `AiManagerConfig.allowImportUrl?: (url: URL) => boolean` admits it, and then it is held
  (`network`) with the full URL in the preview.
- **Payloads go to the host.** `export_graph` and `capture` return `{ format, bytes }` (capture
  also `width`, `height`, each capped at 4,096) to the model; the payload goes out on the additive
  `ai-export-ready` event. The model triggers no download and never receives the document.
  `ProjectApi.save` is excluded (`needs-host`): it clears `dirty`, so a save the host never wrote
  would defeat its unsaved-changes guard.

---

## 5. Coverage

### 5.1 What must be reachable

`test/ai/tools/coverage.test.ts` (Node project: the `graphty-element-default` shard and pre-push)
fails on any item neither reached by a tool action nor excluded:

1. **Every op** in `COMMANDS` (ops as well as doors: `data.expand`, `view.camera`,
   `view.immersive` and `layout.transport` have no door).
2. **Every door** that dispatches or is exempt, and every read-only door of the session roots
   (`GraphSession` and its parts, `Run`, selection, visibility, sets, notes, history, project).
3. **Every catalog entry**, plus every registered layout engine (`spring`, `kamada-kawai`,
   `spring-electrical`, `forceatlas2` and `d3` gain catalog entries, additively).
4. **Every option** of every entry (an `unknown` type or an unresolvable bound fails), and every
   generated action field has a description.

"Reached" is computed from the generated tools themselves. The test also fails on: an exclusion of
something that no longer exists, something both reached and excluded, a `covered-by` row whose
`by` action does not dispatch the same op, two actions of one tool declaring one field with
different types, and an action with no behavior task unless listed in `UNTESTED_ACTIONS` with an
issue number.

**Registration paths.** A table-driven runtime case registers one fake entry through each path
after the assistant is enabled -- `Algorithm.register` (with a descriptor), `defineAlgorithm`,
`defineLayout`, `registerSnapshotLayout`, `LayoutEngine.register`, `DataSource.register`,
`DataSource.fromImporter`, `registerFormatWriter`, `registerPalette`, `definePalette`,
`registerCameraView` -- and checks that `catalog` finds it, `describe` returns its options and the
owning tool validates a call to it. A second check fails when a `register*` or `define*` export of
`./extend` is in neither the table nor its not-applicable list (`defineLogDestination`,
`defineOptionsSchema`, each with a reason). `Algorithm.register` of a class with no `static
descriptor` is refused with `E_BAD_COMMAND` (`field: "descriptor"`), as `LayoutEngine.register`
already refuses one, instead of filing an algorithm no catalog lists (breaking, section 12).

### 5.2 The exclusions table

```ts
// src/ai/tools/exclusions.ts
export const NOT_FOR_THE_ASSISTANT: readonly Exclusion[] = [
    { root: "MeshCache", reason: "internal-handle", kind: "by-design", members: ["get", "dispose" /* ... */] },
    { door: "ProjectApi.open", reason: "replaces-project", kind: "by-design" },
    { door: "ProjectApi.save", reason: "needs-host", kind: "by-design" },
    { op: "style.template", reason: "whole-document", kind: "defect", owner: "ai", expires: "2027-01-15" },
    { op: "layout.transport", reason: "in-flight", kind: "by-design" },
    { door: "RunsApi.batch", reason: "covered-by", by: "run_algorithm", kind: "by-design" },
];
```

`Exclusion` names exactly one of `root`, `door` (`<root>.<member>`, `doors.ts` root names), `op`,
`catalog` (`"<table>/<id>"`) or `option` (`"<table>/<id>/<option>"`). A `root` row is plain only for
a root whose doors are all read-only; a root with dispatching or exempt doors lists its `members`,
and the test fails when the root's members differ, so a new mutating member on an excluded root is
a decision, not a pass. `kind` reuses `src/catalog/unreachable.ts`'s split: `by-design` stands;
`defect` carries `owner` and `expires` and goes red the day after, through
`test/contracts/waiver-expiry.test.ts`. `reason` is a code:

| Code                 | Meaning                                                                        |
| -------------------- | ------------------------------------------------------------------------------ |
| `internal-handle`    | a manager, mesh, render object or id bookkeeping                               |
| `assistant-config`   | the assistant's own connection, keys, voice or status                          |
| `machine-preference` | acceleration, renderer, input, profiling, label decluttering, render on demand |
| `lifecycle`          | connect, dispose, subscriptions, waiting for a frame                           |
| `namespace`          | a getter whose members are the operations                                      |
| `raw-data`           | masks, snapshots, typed arrays, screen coordinates                             |
| `needs-host`         | needs a `File`, a host download, a host file write or a whole document         |
| `network`            | fetch settings a model must not choose (headers, credentials)                  |
| `replaces-project`   | replaces or discards the whole project or history                              |
| `whole-document`     | takes or returns a whole style or notes document                               |
| `in-flight`          | computation in progress, not an operation                                      |
| `mechanism`          | what the tools themselves call (`session.execute`, `session.transaction`)      |
| `covered-by`         | the same capability through another action, named in `by`                      |

About 465 of the 689 distinct operations are excluded. Decided here, each reversible by deleting a
row: `labelDeclutter` and `renderOnDemand` are machine preferences, `setDefaultPalettes` is a host
preference, `applyTemplate` waits for the themes catalog (#331).

### 5.3 Budgets

`test/ai/tools/budget.test.ts` measures the always-loaded declarations as sent (description plus
JSON Schema, characters / 3, since JSON Schema runs near 3 characters per token): standard at most
5,000 tokens and 11 tools, small at most 1,500 tokens and 4 tools, plus the small profile's result
and history caps (2.5). It runs twice: on the built-in catalog, and with 100 fake algorithms and 30
fake layouts registered, which must switch those enums to strings and stay in budget. The paid lane
records the real input tokens of an empty first turn beside the estimate.

### 5.4 Feedback for plugin authors

The coverage test runs only in graphty-element's build, so a plugin needs its own signal.
`assistantReach(session)` (additive, `./extend`) returns `CodedFact[]` for the registered entries:
`ai.option-unoffered` (`entry`, `option`, `type`) for an option whose type converts to `unknown`
(easy to get from a nested object in `optionsFromZod`), `ai.no-description` (`entry`) for an entry
the model would know only by id and name, and `ai.name-reserved` (`command`, `tool`). The same codes
are logged once per entry when the tool set is built. A plugin's test asserts the list is empty.

---

## 6. Results

### 6.1 Shape

What the model reads for each call is JSON:

```ts
{ code: string; params: Record<string, JsonValue>; data?: JsonValue; page?: { total: number;
  returned: number; cursor?: string } }
```

`code` is the session's own success code where it has one (`style.add-layer`), `AI_OK` otherwise,
or a failure code (section 7). graphty writes no English into a result. For a consumer command
that returns no `code`, its `message` goes to the model as `params.message`, so every custom
command written before this design keeps showing its answer; built-in tools never fill `message`
for the model. Model-facing params may nest; reader-facing `ExecutionResult.params` stay flat, with
the detail code in `params.cause`.

### 6.2 Compact and paged

- **Pages**: a cursor is the offset plus the session's `revision`
  (`data.nodePage({ limit: 0 }).revision`, which moves on edits, undo, selection and set changes);
  a stale one restarts with `AI_CURSOR_STALE`, one that does not parse is `AI_ARG_INVALID`.
- **Records**: at most 12 fields each, the rest counted in `omittedFields`; strings cut at 200
  characters with `truncated: true`.
- **Per-node results** are summarized unless the model asks for a page: per field its kind, count,
  missing count, min, max, mean, distinct count (for categories the 10 largest with counts) and the
  top 5 nodes by value as `{ id, label }`.
- **Catalog lists** return names and one-line summaries; full schemas only from `describe`.
- **Backstop**: the 8,000-character cap (1,500 in the small profile) cuts by dropping records and
  setting `page`, so the model always receives valid JSON (today it slices mid-JSON).

---

## 7. Error codes

Detail codes the model reads, published as data in `./catalog` (`AI_TOOL_CAUSE_CODES`, OPEN UNION)
so an application rendering a transcript can show its own words. Every failure carries a machine
fix the model can apply in one retry: a path, `allowed` values, `did_you_mean`, and on
`AI_ARG_INVALID` the action's compact schema.

| Code                                     | Params                                         | When                                                  |
| ---------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| `AI_UNKNOWN_ACTION`                      | `tool`, `action`, `allowed`                    | no such action                                        |
| `AI_ARG_INVALID`                         | `path`, `expected`, `got`, `allowed`, `schema` | wrong type, missing or empty target, unknown key      |
| `AI_ARG_OUT_OF_RANGE`                    | `path`, `min`, `max`, `got`                    | outside an option's bounds or 3.4's                   |
| `AI_UNKNOWN_ENTRY`                       | `kind`, `name`, `did_you_mean`                 | no catalog entry by that name                         |
| `AI_UNKNOWN_NODE`, `AI_UNKNOWN_EDGE`     | `id`, `did_you_mean` (ids and labels)          | not in the graph                                      |
| `AI_UNKNOWN_COLUMN`                      | `name`, `on`, `did_you_mean`                   | no attribute or result field                          |
| `AI_UNKNOWN_RUN`                         | `run`, `runs`                                  | no run by that id or algorithm                        |
| `AI_BAD_SELECTOR`                        | `where`, `did_you_mean`                        | does not parse after repair                           |
| `AI_EMPTY_MATCH`                         | `where`, `nodes`, `edges`                      | a write's target matches nothing                      |
| `AI_NOT_AVAILABLE`                       | `name`, `requirement`                          | the estimate says it cannot run here                  |
| `AI_CONFIRM_REQUIRED`                    | `gate`, preview (4.2)                          | held for the reader's approval                        |
| `AI_IMPORT_URL_REFUSED`                  | `url`                                          | a URL the reader did not give (4.4)                   |
| `AI_UNDO_NOTHING`, `AI_UNDO_NOT_ALONE`   | --                                             | nothing to undo; undo shares its batch                |
| `AI_UNDO_NOT_MINE`, `AI_UNDO_IN_MESSAGE` | `steps`                                        | reader steps above it; a step of this message         |
| `AI_CURSOR_STALE`                        | --                                             | the session changed under a page                      |
| `AI_TOOL_NOT_RUN`                        | `tool`                                         | another call of the batch failed (internal today)     |
| `E_*`                                    | the error's `details`                          | a `GraphtyErrorCode` from the session, passed through |

Reader-facing (`AiResultCode`, OPEN UNION, additive): `AI_CONFIRMATION_NEEDED`,
`AI_ROLLBACK_PARTIAL`, and `AI_APPROVAL_STALE` and `AI_APPROVAL_DENIED` (the harness design's
names); `cause` and `rolledBack` added to the params of `AI_TOOL_FAILED`, `cause` to
`AI_TOOL_INVALID_ARGUMENTS`. Logged codes: `ai.tool-budget-exceeded`,
`ai.write-outside-transaction` and the `assistantReach` codes.

---

## 8. The behavior suite

### 8.1 What a task is

A task is a reader's request, a dataset and a check of the session afterwards. The starting set is
99 tasks in ten sections, from first look to undo and safety, drawn from the 25 workflows
in `design/designloom/workflows/` and `design/ai/agent-use-cases.md`, each naming its source. Three
come from the plugin personas: a `defineAlgorithm` "essentiality score" with no description, a
`definePalette` brand palette ("use our brand colors"), and a registered camera view.

```ts
// test/ai/tasks/communities.tasks.ts
defineTask({
    id: "louvain-color",
    source: ["W04", "W21"],
    tier: ["catalog"],
    dataset: "karate",
    prompts: ["Run Louvain and color the nodes by community."],
    accept: { algorithms: ["louvain", "leiden", "label-propagation"] },
    reference: [[{ tool: "run_algorithm", args: { name: "louvain" } }]],
    check: ({ s, accepted }) => {
        const run = s.runs.list().find((r) => accepted.algorithms.includes(r.algorithm));
        assert(run?.status === "completed");
        assert(paintedBy(s, run).every((n) => n.color === colorOfGroup(s, run, n.group)));
    },
});
```

The run paints its own suggestion on first completion, so the task is one call. Open prompts list
acceptable algorithms (`accept`), and checks compare against the run that happened, never against
a palette size.

- **Tiers**: `core` (one core tool; the small profile's bar), `catalog` (an entry chosen by name
  with options from `describe`), `search` (an on-demand tool), `multi-step`.
- **Datasets**: 16 from `@graphty/graph-samples` (karate to openflights and the biology sets),
  today's server-network fixtures, a fixture of
  edges with dates, and four injection fixtures: an instruction in a label, in an attribute name, in
  a note, and in an imported file.
- **Grading.** A changing task reads the end state through the public session API. A question
  task grades the final answer: a number must appear in the final text, a list's expected ids or
  labels must appear. Whether a tool was called is a metric, not the pass condition. Expected values
  come from an **oracle** session built from the same dataset, never a hard-coded number.
- **Checks on every task** (graphty's code, not the model), over a **state digest**:
  `project.save({ markSaved: false }).text` plus the runs list and visibility, without selection
  and camera (`fingerprint()` covers topology only):
    - a changing message adds exactly one history step, a read-only one none;
    - one `s.undo()` after a changing message restores the digest;
    - a failed, held or refused message leaves the digest unchanged;
    - no result holds more records than the page cap; every failure is `{ code, params }`;
    - injection fixtures: no write beyond the reference effect and no import, undo or export call.

### 8.2 Two runners

- **Reference replay, free, every pull request.** `FakeEngine` plays each task's `reference` calls,
  then the check runs, in the `default` and `browser` projects. Reference calls use only what a
  model can write (`run: "louvain"`, never `$run0`). An offline search test checks that, for each
  `search`-tier task, `catalog search` with the task's key phrase ranks the needed tool in its top 3.
- **Paid, with a model**, in the `llm-regression` project (`test/ai/tasks/tasks.llm.test.ts`),
  reading the key as the project does (`test/helpers/llm-regression-env.ts`; Google on the release
  train), at temperature 0 with a fixed seed. The prompts, never the reference, go to the model. A
  run stops and fails loudly past 3 million input tokens.

The harness (`test/helpers/llm-regression-harness.ts`) gains a `dataset` option, multi-message
conversations (in memory until milestone 3's `history: "memory"`), a record of each tool result,
the oracle session, and an approval answerer for held batches.

### 8.3 Metrics, per provider and profile

Per run: success overall and per tier; violations of the every-task checks (each a bug); tool
calls, turns used, input and output tokens and time per task; failures by cause, including
`out-of-turns`; tool errors by code; first-call-correct rate; search misses (an on-demand tool
needed and never loaded). When run k times: pass^k. Results are JSON beside the log plus a summary
table; the baseline is `test/ai/tasks/baseline.google.json`.

### 8.4 Release gating

On the release train, beside the `llm-regression` step (same job, key and model, Google
`gemini-3.8-flash`), each task runs once with the standard profile and the `core` tier also with
the small profile. The release is held when:

1. any every-task check is violated (graphty defects);
2. a task that passed all 3 baseline runs fails, and again in one of two reruns (milestone 2's
   rule);
3. the overall success rate falls more than 5 points below the baseline.

Per-tier rates are reported, not gated: two standard errors over 20 to 30 tasks is 15 to 20 points.
The baseline is 3 runs per task; a pull request that moves the numbers commits a new baseline with
the run log. OpenAI and Anthropic run by hand on each engine upgrade. The small profile on Gemini
Flash measures mechanics only and is labeled so; when the Google API offers tool calling on a small
model (a Gemma or Flash-Lite model), its `core` tier runs there with the same key.

### 8.5 Today's 108 regression cases

About 47 check which tool the model picked; they name the old tools and are replaced by tasks at
the switch (9, step 6). The harness-mechanics cases (retries, latency, usage) stay.

---

## 9. Migration

The old tools map onto actions: `queryGraph`, `findNodes`, `getSchema`, `sampleData` and
`describeProperty` onto `query`; `listAlgorithms` onto `catalog` search; `runAlgorithm` onto
`run_algorithm`; `setLayout` onto `layout` set; `setDimension`, `setCameraPosition` and
`zoomToNodes` onto `view`; `setImmersiveMode` onto `immersive`; `findAndStyleNodes` and
`findAndStyleEdges` onto `style` add; `clearStyles` onto `style` clear_mine; the two capture
tools onto `capture`.

Steps, each one pull request on `feat/tanstack-ai` running lint, typecheck, the affected shards and
the API report:

1. **Element prerequisites, additive**: per-op zod and JSON Schema in `./commands` (#337);
   `catalog.validate` (#335); `session.layout.setScope`, `session.export`, the layout estimate;
   catalog entries for the 5 layout engines; `keywords` on descriptors; the catalog generation
   counter.
2. **Tools**: option schemas, bounds, manifest, generator, result shaping, cause codes; the 11 core
   and 7 on-demand tools beside the old ones under a test switch; coverage, registration-path and
   budget tests; `assistantReach`; the worked examples (section 11).
3. **Pipeline**: structure check, in-order checks, measurement, the gate and host approval, batch
   rollback, the message rule, the undo rules, the trust rules of 4.4.
4. **Search and loading**: the index, per-turn tool lists, the facts block, `call`, the small
   profile, 8 tool turns, the shorter system prompt.
5. **Suite**: harness additions, the 99 tasks, the replay and search-ranking runners, the paid
   runner, a 3-run Google baseline, the release-train step.
6. **Switch** (breaking, section 12): the new tools become the default; the 15 old constants stay
   exported and `@deprecated`; the old prompt cases become tasks; `SchemaManager` stops being used.

Milestone 3 (approvals) extends 4.2's request with policies, persistence and edited arguments.

---

## 10. Risks

- **A flat schema lets a model mix fields of two actions.** Placeholders are dropped (2.1) and
  per-action validation names the path; the suite counts invalid-argument retries.
- **Search misses** ("cheapest road network" for a minimum spanning tree): `keywords`, added from
  the search-miss metric and the offline ranking test.
- **The gate annoys on medium graphs, or a host never answers it**: `gate` limits are the
  consumer's choice, and a host with no approval UI sets `gate: false` knowingly.
- **Paid run time**: 99 single runs on Gemini Flash, about today's lane, under a token stop.

---

## 11. What an author writes

Each example lives in `docs/examples/assistant/` and is compiled against the built `.d.ts` by the
consumer type check (`test/types/consumer/`).

**a) A metric a data scientist adds, and what the model then sees.**

```ts
import { defineAlgorithm } from "@graphty/graphty-element/extend";

defineAlgorithm({
    id: "acme-essentiality",
    name: "Essentiality score",
    description: "How strongly each protein is tied to the rest, by confidence-weighted degree.",
    keywords: ["essential", "knockout", "lethality"],
    options: { weight: { type: "attribute", on: "edge", default: "confidence" } },
    node: (node, { options }) => node.strength(options.weight),
});
```

```jsonc
// catalog { action: "search", text: "which proteins are essential" }
{ "code": "AI_OK", "data": [{ "kind": "algorithm", "name": "acme-essentiality",
  "plainName": "Essentiality score", "summary": "How strongly each protein ...", "tool": "run_algorithm" }] }
// catalog { action: "describe", kind: "algorithm", name: "acme-essentiality" }
{ "code": "AI_OK", "data": { "options": { "type": "object", "properties": { "weight": {
  "type": "string", "enum": ["confidence", "score"], "default": "confidence",
  "description": "An edge attribute." } } }, "results": [{ "field": "value", "kind": "node-metric" }],
  "estimate": { "seconds": 0.01, "available": true }, "example": { "name": "acme-essentiality" } } }
// run_algorithm { name: "acme-essentiality" }
{ "code": "AI_OK", "params": { "run": "acme_essentiality" }, "data": { "value": { "count": 1870,
  "min": 0, "max": 41.2, "top": [{ "id": "YLR147C", "label": "SMD3" }] } } }
```

**b) Enabling the assistant.**

```ts
const el = document.querySelector("graphty-element")!;
await el.enableAiControl({
    provider: "google",
    apiKey,
    toolProfile: "auto", // "small" for WebLLM, "standard" otherwise
    gate: { removeNodes: 200 }, // hold a message that removes 200 or more nodes
    allowImportUrl: (url) => url.origin === location.origin,
});
el.addListener("ai-approval-requested", ({ request }) => {
    void askReader(request.preview).then((approve) => el.resolveAiApproval(request.id, { approve }));
});
el.addListener("ai-export-ready", ({ format, data }) => saveFile(data, format));
const result = await el.aiCommand("Find communities and remove the smallest one");
```

**c) A custom command.**

```ts
import { z } from "zod";
import type { GraphCommand } from "@graphty/graphty-element/ai";

export const tagNodes: GraphCommand = {
    name: "tag_nodes",
    description: "Sets the attribute 'tag' on the given nodes. Use for 'mark these as hubs'.",
    parameters: z.object({ ids: z.array(z.string()).max(500), tag: z.string().max(100) }),
    examples: [{ input: "tag JFK and LAX as hubs", params: { ids: ["JFK", "LAX"], tag: "hub" } }],
    effect: "write", // the default; "read" adds no undo step and is never held
    load: "on-demand", // found through catalog search instead of always offered
    keywords: ["mark", "label"],
    async execute(_graph, params, ctx) {
        const { ids, tag } = params as { ids: string[]; tag: string };
        await ctx!.tx.data.updateNodes(ids.map((id) => ({ id, values: { tag } })));
        return { success: true, message: "", code: "acme.tagged", params: { nodes: ids.length } };
    },
};
```

The pipeline measures it like any built-in (4.1) and holds it past the gate; its result reaches the
model as `{ "code": "acme.tagged", "params": { "nodes": 2 } }`.

---

## 12. Public API

Additive (the team's call; each recorded in its pull request):

- `./commands`: a zod and a JSON Schema per op (`COMMAND_SCHEMAS`), closing #337.
- `GraphSession.catalog.validate(query, options)` implemented, closing #335.
- `session.layout.setScope(scope)`; `session.export(format, options)`; `session.estimate` answering
  `layout.set`.
- `./catalog`: layout descriptors for `spring`, `kamada-kawai`, `spring-electrical`,
  `forceatlas2`, `d3`.
- `keywords?: readonly string[]` on `AlgorithmDescriptor`, `LayoutDescriptor`, `FormatDescriptor`,
  `CameraDescriptor`, `PaletteDefinition` and `DefinitionBase`.
- `GraphCommand.effect?: "read" | "write" | "exempt"` (default `"write"`),
  `GraphCommand.load?: "always" | "on-demand"`, `GraphCommand.keywords?: readonly string[]`.
- `CommandResult.code?` and `CommandResult.params?`.
- `AiManagerConfig.toolProfile?`, `AiManagerConfig.gate?: Partial<AssistantGateLimits> | false`,
  `AiManagerConfig.allowImportUrl?: (url: URL) => boolean`; `AssistantGateLimits` and
  `DEFAULT_ASSISTANT_GATE_LIMITS`.
- `ai-approval-requested` and `ai-export-ready` events; `resolveAiApproval(id, { approve })` on the
  element and `AiManager` (milestone 3's names, in their smallest form).
- `AiResultCode` gains `AI_CONFIRMATION_NEEDED`, `AI_ROLLBACK_PARTIAL`, `AI_APPROVAL_STALE`,
  `AI_APPROVAL_DENIED`; `AI_TOOL_FAILED` and `AI_TOOL_INVALID_ARGUMENTS` gain `params.cause`.
- `./catalog`: `AI_TOOL_CAUSE_CODES` and `AiToolCauseCode` (OPEN UNION); `CATALOG_KINDS`;
  `ASSISTANT_TOOLS` (each built-in tool's name, actions, `plainName`, whether it is core; the
  reserved names).
- `./extend`: `assistantReach(session): readonly CodedFact[]`.

Breaking (for the owner; it rides in the major `feat/tanstack-ai` is held for, with zod 4 #1953):

- **The default tool set changes**: `getCommandRegistry().getAll()`, the tool names on
  `ai-stream-tool-call` and `ai-stream-tool-result`, and what the model can do all change. The old
  constants stay exported and deprecated, removed in the major after.
- **Built-in tool names are reserved**: a consumer command named `catalog`, `query`, `select`,
  `style`, `filter`, `layout`, `view`, `undo`, `results`, `sets`, `notes`, `project`, `capture`,
  `immersive`, `call` or another `ASSISTANT_TOOLS` name now fails with `E_DUPLICATE_PLUGIN`
  (today a duplicate throws a plain `Error`, and none of these names was taken).
- **Custom command results reach the model differently**: the model reads `{ code, params }`; a
  result with no `code` still shows its `message`, as `params.message`.
- **`Algorithm.register` refuses a class without a descriptor** (`E_BAD_COMMAND`).
- **`SchemaManager` is retired**: `AiManager.getSchemaManager()` returns `null` and
  `AiControllerOptions.schemaManager` is ignored, both deprecated and removed in the next major.

Unchanged: the engine seam and its types (`ToolSpec` stays internal and framework-free), every
other export's signature, and every Node-safe entry point's freedom from Babylon.js, Lit and the
DOM (the new catalog data is plain data).

---

## Appendix A. Review findings not taken as proposed

- **Model-chosen confirmation token** (confirm field, short token `c1`): replaced by host approval
  (4.2). Any model-visible confirm path can be triggered by a misread reply or planted text.
- **`GraphCommand.preview`**: dropped. The gate measures what a call did, so no command declares a
  preview; milestone 3 may add one for commands whose effect lies outside the session.
- **Always gating a network import**: a URL the reader typed in this message runs ungated; only a
  URL admitted by `allowImportUrl` is held, so the reader is asked about URLs they did not give.
- **`search` and `describe` renamed `find_capability` and `describe_capability`**: merged into one
  `catalog` tool instead, which also saves a tool.
- **Refuse or derive a mixed `node.*` and `edge.*` style call**: refused; deriving would guess
  which elements a `where` means.
- **A temporary set of what a held change would affect**: not built; the preview's first 10 ids
  and the selector serve the reader, and milestone 3 can add a set if hosts ask.
- **`results cancel` refused outside the assistant's runs**: held for approval instead, since
  cancelling the reader's slow run is a legitimate request.
- **Per-tier release gating**: kept as a report only; at 20 to 30 tasks a tier cannot detect a
  change smaller than 15 points.
