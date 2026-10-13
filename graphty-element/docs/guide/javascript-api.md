# JavaScript API

Complete reference for programmatic control via the `Graph` class.

## Overview

The JavaScript API provides full programmatic control over graph visualizations through the `Graph` class. This is separate from the [Web Component API](./web-component), which provides declarative configuration via HTML attributes.

**Use the JavaScript API when you need:**

- Dynamic data manipulation (add/remove nodes at runtime)
- Algorithm execution and result handling
- Camera control and animation
- Custom style layers
- Screenshot and video capture
- Event-driven interactions

**Use the [Web Component API](./web-component) instead for:**

- Declarative HTML configuration
- Framework property binding
- Simple static graphs

## Accessing the Graph Instance

The `Graph` class is accessed via the `.graph` property on the `<graphty-element>`:

```typescript
const element = document.querySelector("graphty-element");
const graph = element.graph;
```

In TypeScript, no cast is needed. Importing the package declares the tag, so
`document.querySelector("graphty-element")` and `document.createElement("graphty-element")` both
answer the element's own type:

```typescript
import "@graphty/graphty-element";
import type { Graph } from "@graphty/graphty-element";

const element = document.querySelector("graphty-element");
const graph: Graph | undefined = element?.graph;
```

::: tip
The Web Component handles initialization. Access `.graph` after the element is connected to the DOM, or use the `graph-ready` event.
:::

## Core Methods

### Data Management

**Adding Nodes:**

```typescript
// Add single node
await graph.addNode({ id: "node1", label: "First" });

// Add multiple nodes
await graph.addNodes([
    { id: "node1", label: "First" },
    { id: "node2", label: "Second" },
]);
```

**Adding Edges:**

```typescript
// Add single edge
await graph.addEdge({ source: "node1", target: "node2" });

// Add multiple edges
await graph.addEdges([
    { source: "node1", target: "node2", weight: 1.5 },
    { source: "node2", target: "node3" },
]);
```

**Removing Elements:**

```typescript
// Remove nodes. The edges attached to them go too.
await graph.removeNodes(["node1"]);
await graph.removeNodes(["node1", "node2"]);
```

One `elements-removed` event follows each call, naming the node ids you asked for and every edge
id that went with them -- including edges you never mentioned:

```typescript
graph.on("elements-removed", ({ nodes, edges }) => {
    console.log(`${nodes.length} nodes and ${edges.length} edges left the graph`);
});
```

In 1.x the edges stayed behind: lines drawn to a node that no longer existed, which a filter could
not reach and nothing could hide.

**Bulk Data Loading:**

```typescript
// Load nodes and edges in one call
graph.setData({
    nodes: [
        { id: "node1", label: "First" },
        { id: "node2", label: "Second" },
    ],
    edges: [{ source: "node1", target: "node2" }],
});
```

**Updating Data:**

```typescript
// Update node properties
await graph.updateNodes([{ id: "node1", label: "Updated Label" }]);

// Update multiple nodes
await graph.updateNodes([
    { id: "node1", label: "Updated 1" },
    { id: "node2", label: "Updated 2" },
]);
```

**Accessing Data:**

```typescript
// Get a single node by ID
const node = graph.getNode("node1");

// Get all nodes
const allNodes = graph.getNodes();

// Get counts
const nodeCount = graph.getNodeCount();
const edgeCount = graph.getEdgeCount();
```

Records are read through the session: one at a time by id, or every one at once.

```typescript
const session = element.session;
const { nodes, edges } = await session.scope.resolve("graph");

const record = session.data.edge(id); // { id, source, target, ...the file's own keys }
const everyNode = session.data.nodes(); // [{ id, ...the file's own keys }, ...]
const everyEdge = session.data.edges(); // [{ id, source, target, ... }, ...]
```

`nodes()` and `edges()` walk the whole graph on each call, so read them when the graph changes
rather than every frame. Every record is read-only; change the graph through `session.data`'s
verbs, each of which is one undoable step.

### Reading records a page at a time

A table that shows thirty rows of a 100,000-node graph should read thirty records, not copy the
graph. `nodePage` and `edgePage` answer one window of the records, the total, and a revision:

```typescript
const page = session.data.nodePage({ offset: 0, limit: 30 });
page.records; // the 30 records, read-only
page.total; // how many there are in all, for the scrollbar
page.revision; // changes whenever any record, the selection or a set changes

// Sorted by an attribute, over any scope:
session.data.nodePage({ offset: 30, limit: 30, sort: { key: "weight", descending: true } });
session.data.nodePage({ scope: "selection" });

// The edges at one node:
session.data.edgePage({ touching: "alice", limit: Infinity });

// Only the records matching typed text, as a table's search box narrows it (selects nothing):
session.data.nodePage({ matching: { text: "jav" }, sort: { key: "name" } });
session.data.edgePage({ matching: { text: "kind:robs" } }); // the same modes as selection.apply({ text })

// The nodes joined to one node, one row each, strongest first (see the Neighbors guide):
session.data.neighbors("alice");

// Read the page again when the graph changes (and, for a "selection" scope, the selection;
// for result columns, the runs -- run:changed also fires on progress ticks, which the
// revision check skips). The revision is the session's, so a { limit: 0 } read compares with
// any page, and session.on() returns the function that removes the listener:
const reread = () => {
    if (session.data.nodePage({ limit: 0 }).revision !== page.revision) {
        // read the page again and redraw
    }
};
session.on("project:changed", reread);
session.on("selection:changed", reread);
session.on("run:changed", reread);
```

Every option is optional: `offset` defaults to 0, `limit` to 100 (`Infinity` reads to the end),
`scope` to `"graph"`. `matching` keeps the records whose id or a value contains the text, ignoring
case -- an edge also matches by its endpoints' ids -- or, with a `mode` or an `exact:`, `regex:` or
`<attribute>:` prefix, matches it the way `selection.apply({ text, mode })` does; `total` then
counts the matches. Without `sort`, records come in the order they were added, and an edit
never reorders them: an updated record stays where it was, a removed one leaves a gap that
closes, an added one goes last. With `sort`, numbers come before text, text sorts naturally
("2" before "10"), a record without the key comes last either way, and records that sort equal
keep the order they were added in. The order is computed once per revision, so paging through
it costs only the records on each page.

"The edge between two nodes" is plural, because a graph may hold more than one:

```typescript
const between = graph.getDataManager().getEdgesBetween("node1", "node2"); // readonly Edge[]
```

In 1.x this was `getEdgeBetween`, singular, and an edge's id was its two endpoints joined with a
colon. Neither could represent a graph that holds two edges between one pair -- see
[Data Sources](./data-sources#two-edges-between-the-same-pair).

### Describing the data

`session.data.statistics()` answers the graph's shape -- counts, density, direction, components --
and the distribution of the node degrees, ready to draw as a histogram. It is computed once per
change to the graph, so reading it on every render costs nothing:

```typescript
const stats = session.data.statistics();
stats.degreeRange; // [smallest, largest]
stats.meanDegree;
for (const bin of stats.degreeHistogram?.bins ?? []) {
    // one bar: degrees bin.from to bin.to, bin.count nodes
}
```

`degreeHistogram` has the shape `RunResult.histogram()` returns: one bar per degree when there are
few distinct degrees (`binning: "per-value"`), whole-number bands otherwise (`"banded"`). The bars
add up to `stats.nodeCount`.

One attribute's distribution comes from `session.data.histogram(column)`. A column of amounts is
binned the same way; any other column is counted by value, commonest first:

```typescript
const age = session.data.histogram({ kind: "node", name: "age" });
if (age.kind === "numeric") {
    age.bins; // [{ from, to, count }, ...]
} else {
    age.values; // [{ value: "red", count: 40 }, ...], at most 20 unless you pass { bins }
    age.otherCount; // elements whose value did not make the list
}
```

`session.data.attributes()` lists every column with its type, what it measures, how complete it is
and a few sample values. A column that does a job for the graph says so in `roles`:

```typescript
const columns = session.data.attributes();
columns.find((a) => a.roles?.includes("key")); // the node ids were read from it
columns.find((a) => a.roles?.includes("label")); // nodes are named by it
columns.find((a) => a.roles?.includes("weight")); // edge weights were read from it
```

The roles are `"key"`, `"label"`, `"weight"`, `"source"`, `"target"`, `"time"` and `"edgeId"`, read
from `data.knownFields` and the last load, and `roles` is absent on a column that plays none.
`usedBy` says what reads a column now: each style layer whose selector or bindings read it
(`{ kind: "layer", id }`), then each finished run that weighed its edges by it
(`{ kind: "run", id }`). It is absent when nothing does. A table that opens on "the attributes in
use" shows the columns with a role or a use:

```typescript
const inUse = session.data.attributes().filter((a) => a.roles !== undefined || a.usedBy !== undefined);
```

`attributes()` hands back the same array until a column, a declaration, a role or a use changes, so
it is safe to compare by identity.

Which way a column is read follows what it measures (`attributes()`'s `measurement`): declare a
column of number codes categorical with `session.data.declare` and it is counted by value.
Elements with no value in the column are not counted. An unknown column throws
`E_UNKNOWN_ATTRIBUTE`.

### Result values as table columns

A page can carry an algorithm run's values as a column and sort by them -- see
[Result Columns](./result-columns).

### Selection

```typescript
// Select a node
graph.selectNode("node1");

// Deselect
graph.deselectNode();

// Get currently selected node
const selected = graph.getSelectedNode();
if (selected) {
    console.log("Selected:", selected.id);
}
```

`session.selection.origin` says what the selection was made from, so a panel that did not make the
call can still tell what it is looking at. It holds a frozen copy of the target passed to `apply`
while the selection is exactly that target. It is `null` after an `apply` that adds, removes,
toggles or intersects, after a replace the selection cap cut short, and once anything else changes
the selection or the graph: a click, an undo or redo, `clear()`, or any edit to nodes, edges or
data, since the same target could name something different in the edited graph.

```typescript
await session.selection.apply({ neighborsOf: ["Javert"] }); // say, from a toolbar
// ... elsewhere, on selection:changed:
const origin = session.selection.origin; // { neighborsOf: ["Javert"] }
if (origin !== null && "neighborsOf" in origin && origin.neighborsOf?.length === 1) {
    session.data.neighbors(origin.neighborsOf[0]); // list the center's connections
}
```

### Layout Control

```typescript
// Set layout algorithm
graph.setLayout("ngraph");

// With options
graph.setLayout("ngraph", {
    springLength: 100,
    springCoefficient: 0.0008,
    gravity: -1.2,
    dimensions: 3,
});

// Wait for the picture to stop changing: the layout converged, the camera framed it,
// and a frame was drawn showing that
await graph.waitForStableFrame();
```

### Algorithms

```typescript
// Run an algorithm. The run hands back its own result.
const run = await graph.run("degree");

// One element's value
const degree = run.node("node1")?.value;

// Put the algorithm's own suggested picture back, after a reader cleared it
graph.applySuggestedStyles("degree");
```

### Sets

A set is a named group of nodes and edges that a run, a layout, a style layer, the visibility
filter, the selection and the camera all accept as their `scope`. See [Sets](./sets).

```typescript
const team = element.session.sets.create(
    { kind: "fixed", nodes: ["a", "b", "c"], reading: "induced" },
    { name: "Team" },
);

await element.run("degree", {}, { scope: { set: team } });
await element.setLayout("ngraph", {}, { scope: { set: team } });

const { nodes, edges } = await element.session.scope.count({ set: team });
```

### Camera Control

```typescript
// Fit all nodes in view
graph.zoomToFit();

// Get current camera state
const state = graph.getCameraState();
// { position: {x, y, z}, target: {x, y, z}, up: {x, y, z} }

// Set camera position
graph.setCameraPosition({ x: 0, y: 0, z: 100 });
graph.setCameraTarget({ x: 0, y: 0, z: 0 });

// Animate camera
graph.setCameraState(newState, {
    animate: true,
    duration: 1000,
});
```

### Managers

Access internal managers for advanced control:

```typescript
// Data management
const dataManager = graph.getDataManager();

// Layout control
const layoutManager = graph.getLayoutManager();

// Event handling
const eventManager = graph.getEventManager();

// Selection state
const selectionManager = graph.getSelectionManager();

// Performance statistics
const statsManager = graph.getStatsManager();
```

### Selecting by search or by expression

`element.session.selection.apply()` takes a target. Two of them search the graph:

To list what text matches as the reader types, without selecting anything, use
`session.find(text)`; see [Finding](./find). The text target below searches nodes only.

```typescript
const { selection } = element.session;

// Text: a case-insensitive substring of a node's id or any of its attribute values.
await selection.apply({ text: "alpha" });

// The text may carry a prefix that says how to match:
await selection.apply({ text: "exact:Alpha" }); // the id or a value is exactly this
await selection.apply({ text: "regex:^A[0-9]+$" }); // a regular expression
await selection.apply({ text: "id:a17" }); // this id, ignoring case
await selection.apply({ text: "type:person" }); // data.type is "person", ignoring case
await selection.apply({ text: "=data.weight > `5`" }); // a leading = is an expression, as below

// An expression, in the same language a style layer selector uses. It selects edges as well
// as nodes, and reports on `unresolvedPaths` any path nothing in the graph answers.
const delta = await selection.apply({ where: "data.type == 'server'" });

// Either one can be narrowed to a scope, such as what is currently visible.
await selection.apply({ text: "alpha", scope: "visible" });
```

A prefix that names no attribute is searched as plain text, so `http://example.com` still finds
the node that carries it. An invalid regular expression is refused with `E_BAD_COMMAND`, and an
expression that does not parse with `E_BAD_SELECTOR`.

### Screenshot and Video Capture

```typescript
// Take a screenshot
const result = await graph.captureScreenshot({
    width: 1920,
    height: 1080,
    format: "png",
});

// Copy to clipboard
await graph.captureScreenshot({ destination: { clipboard: true } });

// Capture video animation
const video = await graph.captureAnimation({
    duration: 5000,
    fps: 30,
});
```

### AI Control

Enable AI-powered natural language commands:

```typescript
import type { AiManagerConfig } from "@graphty/graphty-element";

// Enable AI control
await graph.enableAiControl({
    provider: "anthropic",
    apiKey: "your-api-key",
});

// Execute natural language commands
const result = await graph.aiCommand("Select the node with the highest degree");

// Check AI status
const status = graph.getAiStatus();

// Listen for status changes
const unsubscribe = graph.onAiStatusChange((status) => {
    console.log("AI status:", status.stage);
});

// Disable AI control
graph.disableAiControl();
```

The assistant's events (`ai-status-change`, `ai-command-complete` and the others in `AiEvent`) are
an open union: a later minor release may add events. A listener subscribed by name receives only
the event it named; code that switches over `AiEvent["type"]` needs a `default`.

One message is one undoable step. A command you register with
`graph.getAiManager()?.registerCommand(...)` joins that step only through `ctx.tx`; see
[Undo and History](./undo#commands-you-register-with-the-ai-assistant).

`ai-stream-chunk` is sent once for each piece of text the provider streams: `text` is that piece
and `accumulated` is the message's text so far. OpenAI and Anthropic stream in small pieces, so a
long answer sends many of these events, each with an `ai-status-change`; render on
`accumulated`, and throttle your own rendering if you need to.

An answer the provider cuts off at its output limit (`maxTokens`, or a thinking model's own
limit) still ends as `AI_COMPLETED`, with the text it had and the tool calls it finished. A tool
call whose arguments were cut off, or are not valid JSON, does not run: it ends as
`AI_TOOL_INVALID_ARGUMENTS`, and the model is told why.

#### What the built-in providers broadcast on the page

The OpenAI, Anthropic and Google providers run on TanStack AI, which graphty-element builds in.
On every model turn TanStack AI broadcasts the turn as `tanstack-dispatch-event` events on
`window`: the system prompt (which describes your graph's columns), every message of the
conversation, the tool calls and their arguments, the tool results (which hold graph data), the
streamed text and the model options. The API key is not in them. A script on the page receives
them after answering TanStack's `tanstack-connect` handshake, which TanStack Devtools does: an app
that ships TanStack Devtools shows the assistant's conversation in its AI panel. graphty-element
cannot turn this off.

TanStack AI also stores its event client on `globalThis` (under
`Symbol.for("tanstack.ai.devtools.eventClient")`) when it loads: on the first turn, or when the
page loads with the single-file `./bundle`, which carries TanStack AI and the three provider SDKs
inline. On the first turn, when nothing answers the handshake, it asks five times, 300 ms apart,
and then stops for the life of the page. That timer is TanStack's and is not stopped by
`disableAiControl()`. WebLLM and your own `LlmProvider` do not run on TanStack AI and broadcast
nothing.

### Building an AI Settings Screen

`@graphty/graphty-element/catalog` describes the providers as plain data, without loading an LLM
SDK, so a settings screen (or a Node script) can be built from it:

```typescript
import { AI_PROVIDER_DESCRIPTORS, AI_STAGES, checkApiKeyShape } from "@graphty/graphty-element/catalog";

for (const provider of AI_PROVIDER_DESCRIPTORS) {
    if (provider.testOnly) continue;
    // provider.id, provider.plainName, provider.requiresKey, provider.keyShape?.prefix,
    // provider.defaultModel, provider.models[i].supportsTools
}

const check = checkApiKeyShape("openai", typedKey);
if (!check.valid) {
    // check.code is "E_KEY_EMPTY", "E_KEY_PREFIX" (check.params.prefix) or
    // "E_KEY_TOO_SHORT" (check.params.minLength); the words are yours.
}
```

`AI_STATES`, `AI_STAGES` and `AI_TOOL_CALL_STATUSES` list every value `status.state`,
`status.stage` and a tool call's `status` can take, for a status display keyed by value. The
catalogue holds no labels and no order: choose your own.

Every result of `aiCommand()` carries a `code` and its `params`, so you can tell a missing key
from a cancelled command or a failed tool without reading `result.message`, which is English
for a log and may change. `AI_RESULT_CODES` lists every code this release has. `AiResultCode` is
an open union: a later minor release may add codes, so handle an unknown code (by `success` alone,
for example):

```typescript
import type { AiResultCode } from "@graphty/graphty-element/catalog";

// Your words, keyed by code; AI_RESULT_CODES lists every code to fill in.
const words: Partial<Record<AiResultCode, string>> = {
    AI_KEY_MISSING: "Add an API key in Settings first.",
    AI_CANCELLED: "Stopped.",
};

const result = await graph.aiCommand(text);
show(result.success ? (result.llmText ?? "Done.") : (words[result.code] ?? "Something went wrong."));
```

| Code                        | `success` | `params`              | When                                                     |
| --------------------------- | --------- | --------------------- | -------------------------------------------------------- |
| `AI_COMPLETED`              | true      | `toolCalls`           | The model answered, running every tool it called         |
| `AI_NO_RESPONSE`            | true      |                       | The model wrote nothing and called no tool               |
| `AI_NOT_ENABLED`            | false     |                       | `enableAiControl()` was not called                       |
| `AI_DISPOSED`               | false     |                       | The assistant was shut down                              |
| `AI_KEY_MISSING`            | false     | `provider`            | The provider needs an API key and has none               |
| `AI_KEY_REJECTED`           | false     | `provider`, `status`  | The provider refused the key (HTTP 401, 403; Google 400) |
| `AI_PROVIDER_ERROR`         | false     | `provider`, `status`? | The provider or the network failed                       |
| `AI_CANCELLED`              | false     |                       | `cancelAiCommand()` ended it; its changes are taken back |
| `AI_UNDONE`                 | false     |                       | It was undone while it ran; its changes are taken back   |
| `AI_TOOL_UNKNOWN`           | false     | `tool`                | The model called a tool that does not exist              |
| `AI_TOOL_INVALID_ARGUMENTS` | false     | `tool`                | The model called a tool with arguments it refused        |
| `AI_TOOL_FAILED`            | false     | `tool`                | A tool ran and reported failure                          |
| `AI_TOOL_THREW`             | false     | `tool`                | A tool threw; the command's changes are taken back       |
| `AI_FAILED`                 | false     |                       | Anything else went wrong                                 |
| `AI_CONFIRMATION_NEEDED`    | true      | `gate`, `request`     | A change waits for the reader's approval (see below)     |
| `AI_ROLLBACK_PARTIAL`       | false     | `steps`               | Taking a failed message back stopped at your own edit    |
| `AI_APPROVAL_STALE`         | false     | `request`             | An approval came after the graph changed, or expired     |
| `AI_APPROVAL_DENIED`        | true      | `request`             | The reader declined a held change                        |

`resolveAiApproval` answers with the approved batch's own result: `AI_COMPLETED`, a failure code
(with `request`), or `AI_CONFIRMATION_NEEDED` when the batch is held again for another reason.

`AI_TOOL_FAILED` also carries `cause`, the failed tool's own code (one of `AI_TOOL_CAUSE_CODES`
from `@graphty/graphty-element/catalog`, or an `E_*` error code), and `rolledBack`, how many of the
message's earlier changes were taken back with it.

### What the assistant can do

The assistant reaches everything the element can do: every algorithm, layout, file format,
palette, scale, style channel and camera view in the catalog, the ones a plugin registers included.
It does not get one tool per method. It gets eleven tools, each a family of actions, and finds the
rest by searching the catalog:

| Tool            | What it does                                                                   |
| --------------- | ------------------------------------------------------------------------------ |
| `catalog`       | Finds and describes algorithms, layouts, formats, palettes, channels and tools |
| `query`         | Reads the data: counts, records, neighbors, attributes, distributions, paged   |
| `select`        | Changes the selection                                                          |
| `run_algorithm` | Runs any algorithm in the catalog, its options checked against the catalog     |
| `results`       | Reads, reruns, cancels and removes runs                                        |
| `style`         | Paints values on a target, colors or sizes by data, clears its own layers      |
| `filter`        | Shows and hides elements without deleting them                                 |
| `layout`        | Lays the graph out, pins nodes, places them                                    |
| `view`          | The camera, 2D or 3D, saved views                                              |
| `edit_data`     | Adds, changes and removes nodes and edges                                      |
| `undo`          | Undoes or redoes its own last change, never the reader's                       |

Seven more are offered once a catalog search names them: `sets`, `notes`, `import_data`,
`export_graph`, `project`, `capture` and `immersive`. `ASSISTANT_TOOLS` in
`@graphty/graphty-element/catalog` lists every tool and its actions, for a transcript that names
them in your own words.

A model that cannot hold eleven tools -- a small model running in the browser -- gets four
instead (`catalog`, `query`, `undo`, and `call`, which calls any other tool by name). That is the
default for WebLLM; choose it for any provider with `toolProfile`:

```typescript
await graph.enableAiControl({ provider: "google", apiKey, toolProfile: "small" }); // "standard", "small", or "auto"
```

Every call is checked before it runs, the calls the model makes at once run together or not at
all, and one message is one undo step. What the model reads back is a code and its facts, never
the element's English: a large answer comes in pages, and a run's result is summarized.
Messages run one at a time, in the order they were sent; `cancelAiCommand()` ends the one running
and every one waiting. While a run the assistant started computes, your own edits go through, and
cancelling stops the run.

#### Changes that wait for the reader

A change the reader might not want is held, not made: removing many nodes or edges, changing many
values, a run estimated to be slow, emptying or replacing the graph, cancelling a run the reader
started, or loading a URL the reader did not type. The element asks your page, and only your page
can say yes; the model cannot approve anything.

```typescript
graph.on("ai-approval-requested", async ({ request }) => {
    // request.gate says why ("large", "slow", "replaces", "irreversible", "network");
    // request.preview holds the counts, the seconds and the first affected ids.
    const approve = window.confirm(`Apply this change? (${request.gate})`);
    await graph.resolveAiApproval(request.id, { approve });
});

await graph.enableAiControl({
    provider: "anthropic",
    apiKey,
    gate: { removeNodes: 200 }, // hold a message that removes 200 or more nodes
    allowImportUrl: (url) => url.origin === location.origin, // URLs the reader did not type, still asked about
});
```

The message itself ends with `AI_CONFIRMATION_NEEDED`, and the assistant changes nothing more in
it. An approval answered from inside the listener waits for the message to end, then runs. An
approved change becomes part of the message's undo step; a request expires when the reader sends
the next message. Approving lets through only the hold the reader saw: a batch that is also over
another limit is held again, and `resolveAiApproval` returns `AI_CONFIRMATION_NEEDED` with the new
request. `gate: false` runs every change without asking, for a page with no way to ask.
`DEFAULT_ASSISTANT_GATE_LIMITS` from `@graphty/graphty-element/ai` holds the defaults.

#### Exports and pictures go to your page

When the reader asks for a file or a picture, the assistant writes it and hands it to your page in
`ai-export-ready`, once the change it was part of has been kept; the model is told only its size.
Save it or show it as you like:

```typescript
graph.on("ai-export-ready", ({ format, data }) => {
    const blob = typeof data === "string" ? new Blob([data]) : data;
    download(blob, `graph.${format}`);
});
```

#### Your own commands

A command you register is offered beside the built-in tools. Say what it does to the project and
how the model finds it, and return a code rather than a sentence:

```typescript
import { z } from "zod";

graph.getAiManager()?.registerCommand({
    name: "tag_nodes",
    description: "Sets the attribute 'tag' on the given nodes. Use for 'mark these as hubs'.",
    parameters: z.object({ ids: z.array(z.string()).max(500), tag: z.string().max(100) }),
    examples: [],
    effect: "write", // the default; "read" adds no undo step and is never held
    load: "on-demand", // offered once a catalog search finds it, instead of on every turn
    keywords: ["mark", "label"],
    async execute(_graph, params, ctx) {
        const { ids, tag } = params as { ids: string[]; tag: string };
        await ctx!.tx.data.updateNodes(ids.map((id) => ({ id, values: { tag } })));
        return { success: true, message: "", code: "acme.tagged", params: { nodes: ids.length } };
    },
});
```

The model reads `{ code, params }`; a command that sets no `code` still has its `message` read, as
`params.message`. A command named like one of the built-in tools (`ASSISTANT_TOOLS`, which may
grow in a minor release) keeps working: the model is offered it as `app_<name>`.
`assistantReach()` from `@graphty/graphty-element/extend` tells a plugin's own test whether what it
registered reaches the assistant: an option no schema can carry, an entry with no description, an
algorithm class with no descriptor, a command named like a built-in tool.

The commands earlier releases registered by default (`queryGraph`, `setLayout`,
`findAndStyleNodes` and the rest) are still exported and still work when you register them
yourself; they are deprecated and are removed in the next major release.

### Remembering API Keys

`ApiKeyManager` from `@graphty/graphty-element/ai` holds the reader's provider keys. It
restores itself after a reload: a new manager finds the keys an earlier page saved and turns
remembering back on, so the host only enables, disables and sets keys.

```typescript
import { ApiKeyManager } from "@graphty/graphty-element/ai";

const keys = new ApiKeyManager(); // restores keys saved by an earlier page

keys.enablePersistence(); // save keys in localStorage, obscured (see below), from now on
keys.setKey("anthropic", apiKey);
keys.setDefaultProvider("anthropic"); // saved with the keys

const provider = keys.getDefaultProvider() ?? keys.getConfiguredProviders()[0];

keys.disablePersistence(); // forget them on the next load (they stay in memory)
```

With no argument, `enablePersistence()` uses a built-in key, and that key is public in the
package's source. **Keys saved that way are obscured, not encrypted**: they are not in plain
text, but anyone with access to the page or the browser profile can decrypt them.

To protect them, ask the reader for a passphrase and turn remembering on with it; the key is
derived with PBKDF2 in WebCrypto, so you write no crypto yourself:

```typescript
import { ApiKeyManager } from "@graphty/graphty-element/ai";

const keys = new ApiKeyManager();
await keys.enablePersistenceWithPassphrase(passphrase, { salt: userId });
```

The salt is not secret, but one per reader (an account id, or random bytes you keep) means a
guessed passphrase cannot be tried against every reader at once; it defaults to a fixed salt.
The same passphrase and salt unlock the same keys on every page, and a wrong passphrase loads
no keys and leaves the saved ones as they were. The key derived from the passphrase is kept in
memory only, so nothing restores itself after a reload: ask for the passphrase again and call
`enablePersistenceWithPassphrase` again.

`enablePersistence({ encryptionKey })` (at least 10 characters) uses a key you supply instead.
The manager remembers that key in clear text in `sessionStorage`, so a reload in the same tab
restores the keys and closing the tab ends it; after that, call
`enablePersistence({ encryptionKey })` again to unlock them. While the tab is open, anyone with
access to the page can read the key there, which is why a passphrase goes through
`enablePersistenceWithPassphrase` instead.
`new ApiKeyManager({ storage, prefix })` changes where the keys are kept (default
`localStorage` and `"@graphty-ai-keys"`).

### The In-Browser Model (WebLLM)

With the optional `@mlc-ai/web-llm` package installed, the assistant can run a model in the
reader's browser over WebGPU, with no key. Only some models can call the assistant's tools --
select nodes, run a layout, zoom -- because WebLLM accepts tools only for its Hermes models.
Every other model answers in text only: it can describe and explain, but it changes nothing.

```typescript
import { isGraphtyError } from "@graphty/graphty-element";

try {
    await graph.enableAiControl({ provider: "webllm", model: "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC" });
} catch (err) {
    if (isGraphtyError(err) && err.code === "E_MISSING_PACKAGE") {
        // err.details.package is the package to install: "@mlc-ai/web-llm"
    }
}
```

The model downloads on the first command. To choose a model from the list, or to show the
download's progress before the first command, build the provider yourself and pass it in:

```typescript
import { getWebLlmProviderClass } from "@graphty/graphty-element/ai";

const WebLlmProvider = await getWebLlmProviderClass();
for (const m of WebLlmProvider.getAvailableModels()) {
    console.log(m.id, m.supportsTools, m.downloadMB); // capability and approximate download, in MB
}

const provider = new WebLlmProvider();
provider.configure({ model: "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC" }); // can call tools
await provider.initialize(); // downloads the model the first time; onProgress() reports it
console.log(provider.modelSupportsTools); // true

await graph.enableAiControl({ provider: "webllm", providerInstance: provider });
```

The trade-off is the download. The default model, Llama 3.2 1B, is about 500 MB and answers in
text only; the Hermes models that can call tools are about 4 to 4.5 GB and need a GPU with
roughly 4 to 5 GB of memory. The browser caches a model after its first download.
`modelSupportsTools` tells you which kind the provider has, so you can say so to the reader;
the provider never sends tools to a model that would refuse them.

### Voice Input

Enable voice commands:

```typescript
// Get voice adapter
const voiceAdapter = graph.getVoiceAdapter();

// Start listening
const started = graph.startVoiceInput({
    language: "en-US",
    continuous: false,
});

// Check if active
if (graph.isVoiceActive()) {
    console.log("Listening...");
}

// Stop listening
graph.stopVoiceInput();
```

## Async Operations

Graph operations are queued and executed in order. Use `await` for operations that need to complete before continuing:

```typescript
// These execute in order
await graph.addNodes(nodes);
await graph.addEdges(edges);
await graph.waitForSettled();
graph.zoomToFit();
```

## Batch Operations

To make several changes one undoable step, make them through the `tx` the callback receives:

```typescript
await graph.batchOperations(async (tx) => {
    await tx.data.addNodes(manyNodes);
    await tx.data.addEdges(manyEdges);
    await tx.layout.set("circular");
});
```

One undo takes the whole batch back, and a throw inside the callback rolls it back. A call on
`graph` itself during the callback is a step of its own, and logs a warning naming the `tx` verb
to use instead.

## Undo and Redo

Every change a project saves is one undoable step, and the session keeps the history:

```typescript
const session = graph.getSession();

await session.undo();
await session.redo();
session.canUndo; // whether undo() would do anything
session.history.steps; // [{ fact: { code: "data.add-nodes", params: { count: 3 } }, ... }, ...]

// Several changes as one step, through the tx the callback receives
await session.transaction("Recolor", async (tx) => {
    await tx.styles.add(spec);
    await tx.layout.set("circular");
});

// Any command in the vocabulary, as data
await session.execute({ op: "visibility.context", show: false });
```

Each step's `fact` is a code and its values, for your application to word; `step.label`, an
English sentence, is deprecated. See [Undo and History](./undo) for the codes, what is and is not
undoable, transactions, work still running, events and the memory budget.

## Event Handling

Subscribe to events using `on()`:

```typescript
// Graph events
graph.on("graph-settled", () => {
    console.log("Layout complete!");
    graph.zoomToFit();
});

// Node events
graph.on("node-click", ({ node }) => {
    console.log("Clicked:", node.id);
    graph.selectNode(node.id);
});

graph.on("node-hover", ({ node }) => {
    console.log("Hovering:", node.id);
});

// Data events
graph.on("data-loaded", ({ nodeCount, edgeCount }) => {
    console.log(`Loaded ${nodeCount} nodes, ${edgeCount} edges`);
});
```

**Removing Listeners:**

```typescript
const stop = graph.on("graph-settled", () => console.log("Settled"));

// Later, remove the listener
stop();
```

## Complete Example

```typescript
import "@graphty/graphty-element";
import type { Graph } from "@graphty/graphty-element";

async function initGraph() {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return;
    }

    const graph: Graph = element.graph;

    // Load data
    await graph.addNodes([
        { id: "a", label: "Node A" },
        { id: "b", label: "Node B" },
        { id: "c", label: "Node C" },
    ]);

    await graph.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "c", target: "a" },
    ]);

    // Wait for the queued operations to finish
    await graph.waitForSettled();

    // Run algorithm
    const run = await graph.run("degree");

    // Fit view
    graph.zoomToFit();

    // Set up interaction
    graph.on("node-click", ({ node }) => {
        console.log(`Clicked ${node.id} (degree: ${String(run.node(node.id)?.value)})`);
        graph.selectNode(node.id);
    });
}

initGraph();
```

## Related Guides

- [Web Component API](./web-component) - Declarative configuration via HTML attributes
- [Styling](./styling) - Style layers and selectors
- [Algorithms](./algorithms) - Available graph algorithms
- [Camera](./camera) - Camera control and animation
- [Events](./events) - Complete event reference

## Interactive Examples

- [Data Loading](https://graphty.app/storybook/graphty-element/?path=/story/data--basic) - Data management
- [Selection](https://graphty.app/storybook/graphty-element/?path=/story/selection--mode-3-d) - Selection handling
- [Algorithms](https://graphty.app/storybook/graphty-element/?path=/story/algorithms-centrality--degree) - Algorithm execution
- [Camera](https://graphty.app/storybook/graphty-element/?path=/story/camera-controls--three-d) - Camera control
