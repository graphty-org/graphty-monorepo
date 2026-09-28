# The simple tier

Status: proposed, against graphty-element 2.6.1. The owner decided on 2026-09-28 that every
extension point has a simple tier ("easy things easy, hard things possible"); the names and shapes
below are the recommendation of `README.md` section 12, item 33. Normative shapes:
`simple.d.ts`. The budget every simple tier is held to: `README.md` section 8.1. The measurements
that motivate it: `complexity-review.md`.

## 1. What the simple tier is

Every extension point has two tiers.

- **The simple tier** is one function per point, `define<Point>`, exported from
  `@graphty/graphty-element/extend`. It takes a plain object: an id and one or two functions that
  hold the author's own logic. The element fills in everything else.
- **The advanced tier** is the contract each point's specification has always described: the
  descriptor, the base class or registration object, snapshot rows, masks, cost units, cooperative
  yielding. It is unchanged. It is where an author goes for performance, for a result shape the
  simple tier does not produce, or for full control.

The rule that ties them together: **a simple-tier extension IS an advanced-tier extension.** Each
`define*` function builds an ordinary advanced registration from the definition and files it
through the point's published registration verb. There is no second registry, no private path and
no capability that only one tier reaches. So everything the parity rule (`README.md` section 8)
promises for an advanced extension -- catalogue entry, every route by which a built-in is reached,
progress and cancellation, options, coded errors, typing -- holds for a simple one by construction,
and the conformance kit checks both with the same checks.

| Point       | Simple tier                                                            | The first plugin                              | Advanced tier                                                       |
| ----------- | ---------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| Algorithm   | `defineAlgorithm({ id, node \| edge \| nodes \| groups })`             | a score per node or per edge, or a clustering | `DeclaredAlgorithm` subclass (`algorithm.md`)                       |
| Layout      | `defineLayout({ id, place })`                                          | a map from node id to `[x, y]` or `[x, y, z]` | snapshot layout registration (`layout.md`)                          |
| File format | `defineFormat({ id, extensions, read, write })`                        | text to records, records to text              | `DataSource` subclass and `registerFormatWriter` (`file-format.md`) |
| Data source | `defineDataSource({ id, hosts, load })`                                | a function that fetches pages of records      | the full source descriptor (`candidates.md` section 1)              |
| Palette     | `definePalette(id, kind, colors)`                                      | a name, a kind and a list of colours          | `registerPalette(descriptor)` (`palette.md`)                        |
| Camera      | `defineCameraView({ id, view })`, `defineCameraMotion({ id, motion })` | a still framing, or a framing over time       | `registerCameraView({ descriptor, compute })` (`camera.md`)         |
| Logging     | `defineLogDestination({ id, write })`                                  | a function that receives each record          | `Sink` and `registerLogSink` (`logging.md`)                         |

## 2. Conventions every point shares

### 2.1 The definition object

1. `id` is the only member every definition requires. It follows `README.md` section 4.3: a
   permanent, vendor-prefixed, lower-case, hyphenated string. The id is what saved documents,
   result paths and configurations record, and it is the thing that does NOT change when an
   extension graduates to the advanced tier (section 5).
2. `name` is what pickers show. Default: the id in sentence case, with a vendor prefix kept
   (`acme-hop-reach` reads "Acme hop reach").
3. `description` defaults to the empty string.
4. `options` is the options map of section 2.2. Default: none.
5. `version` is the extension's own semver version, recorded as provenance. Default: absent.
6. The functions a definition carries receive the resolved options already validated and
   defaulted, typed from the declaration: the author writes no generic, no interface and no
   `?? default`.
7. Every `define*` function is synchronous, validates the whole definition before it registers
   anything, and takes the same optional `RegisterOptions` as the advanced verbs.

### 2.2 Options in short form

An option is declared once, as a key in `options`:

| Written                                                                | Means                                                            |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `spacing: 1`                                                           | a number option, default 1                                       |
| `label: "name"`                                                        | a string option, default "name"                                  |
| `weighted: false`                                                      | a boolean option, default false                                  |
| `tier: { type: "attribute", default: "tier" }`                         | the name of a node attribute the reader may change               |
| `confidence: { type: "attribute", on: "edge", default: "confidence" }` | the name of an EDGE attribute                                    |
| `hops: { type: "integer", default: 2, min: 1, max: 5 }`                | any member of `OptionDescriptor`, with `name` taken from the key |

The element expands each entry into a full `OptionDescriptor` (`plainName` from the key in
sentence case: `secondsPerTurn` reads "Seconds per turn"), so the reader's form, validation,
defaults, the `E_UNKNOWN_OPTION` and `E_OPTION_RANGE` refusals and the run or load record all work
exactly as for an advanced extension. The key order is the order a form shows. An "attribute"
option's value is an attribute NAME: the author passes it to `attr()` or `number()` (section 2.3),
and the reader can rebind it without touching the code.

### 2.3 The graph view

Algorithms and layouts receive the graph as a `GraphView` (`simple.d.ts`): nodes and edges with
their real ids, and methods a newcomer can guess.

| Member                                                            | What it gives                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `graph.nodes()`, `graph.edges()`                                  | every node and every edge; parallel edges are separate edges with their own ids      |
| `graph.node(id)`, `graph.edge(id)`                                | one node or edge by id, or undefined                                                 |
| `node.id`, `node.degree`                                          | the id as the data spelled it; the number of edges touching the node                 |
| `node.neighbors()`, `node.edges()`                                | adjacent nodes (each once) and touching edges                                        |
| `node.outNeighbors()`, `inNeighbors()`, `outEdges()`, `inEdges()` | the directed forms; in an undirected view they equal the plain forms                 |
| `edge.id`, `edge.source`, `edge.target`                           | the element's edge id and its two end nodes                                          |
| `node.attr(path)`, `edge.attr(path)`                              | an attribute or a published result, resolved exactly as a style selector resolves it |
| `node.number(path)`, `edge.number(path)`                          | the same, when it is a finite number; undefined otherwise                            |

Rules:

1. The element builds the view from the snapshot the advanced tier reads. The author never sees a
   row, a mask, a typed array or a compressed adjacency; ids are real node ids and real `Edge.id`s.
2. Iteration order is stable (nodes by id, edges by id), so a result never depends on the order
   the records were loaded in.
3. `attr` resolves paths (`location.lat`) and result paths (`results.clusters.group`) through the
   same resolver as styles and filters. Reading an earlier run's result is therefore the decided
   "results as columns" capability, with no new concept.
4. The view is read-only. Nothing an author does to it changes the graph.
5. The view is built once per run and shared by every call in that run.

### 2.4 Errors a beginner reads

A person following the guide reads the first line of an error and searches for it. So:

1. Every error a simple-tier extension causes is a `GraphtyError` with a code from the published
   list, exactly as for the advanced tier, and its message starts with the extension's id and the
   member at fault.
2. A malformed definition is refused synchronously by the `define*` call, with `E_BAD_COMMAND`,
   `details.field` naming the member, and a message that says what was expected:
   `defineLayout("acme-tiers"): "place" must be a function; got undefined.`
3. A throw from the author's function is wrapped with the code its point uses for a failed run,
   load or write (`E_INTERNAL` for an algorithm or layout, `E_PARSE_FAILED` for a reader,
   `E_FETCH_FAILED` or `E_PARSE_FAILED` for a data source), the original error kept as `cause`,
   and a message that names the element being processed:
   `acme-confidence-share: edge() threw for edge "e17" (TypeError: Cannot read properties of undefined).`
   A reader's error names the line when the thrown value carries a numeric `line` property.
4. A value the element cannot use is named with the element and the rule:
   `acme-tiers: place() returned [1, NaN] for node 42. A position is two or three finite numbers;
leave the node out to leave it unplaced.` A score that is not a finite number is not an error:
   it means "not measured" (section 4.1).
5. No message names an internal concept (`README.md` section 8.1 lists them). A beginner is told
   what THEY wrote wrong, in the terms of the definition they wrote.
6. The TypeScript types are written so that a mistake is reported against the member the author
   wrote (a function where a number was expected), not as a failure to infer a generic.

### 2.5 Testing a simple extension

The functions in a definition are plain functions. A layout's `place` or an algorithm's
`node` can be called in a unit test with a hand-built graph view; the conformance kit
(`README.md` section 11.2) publishes `graphView({ nodes, edges })` for that, and every `check*`
function accepts the id of a registered extension, so a simple extension is checked by the same
checks as an advanced one.

## 3. How the simple tier wraps the advanced tier

For every point:

1. `define<Point>(definition)` validates the definition (section 2.4), expands the options
   (section 2.2), builds the advanced registration the point's specification describes, and calls
   that point's PUBLISHED registration verb with it. The generated registration is an ordinary
   one; the registry cannot tell which tier produced it.
2. Everything the element derives for an advanced extension -- the catalogue entry, the reserved-id
   check, re-registration and replacement rules, option validation, the run or load record,
   derived rankings and styles, progress, cancellation, coded errors -- it derives the same way.
3. Registering the same definition object again is a no-op (the sameness rule of `README.md`
   section 4.2 item 4 compares the definition's functions, as it compares `compute` and `create`).
4. **Parity in both directions.** A simple extension reaches every route a built-in of its kind
   reaches, because it is registered through the same verb. The advanced tier stays able to do
   everything a built-in does, because it is unchanged. The simple tier never gains a capability
   the advanced tier lacks: when a simple-tier feature needs something from the advanced contract,
   that something is added to the advanced contract first (section 6) and the simple tier calls it.
5. **Dogfood.** The element SHOULD build some of its own built-ins on the simple tier: degree and
   weighted degree on `defineAlgorithm`, the grid, circular, random and shell layouts on
   `defineLayout`, every built-in palette on `definePalette`, the "orbit" motion on
   `defineCameraMotion`. A built-in on the simple tier is the proof that the tier loses nothing,
   exactly as the parity suite is for the advanced tier.

## 4. Each point

### 4.1 Algorithm

**The first plugin.** A node score, then an edge score that reads the same attribute:

```ts
import { defineAlgorithm, type NodeView } from "@graphty/graphty-element/extend";

// The sum of the confidence of every edge touching a node.
const weightedDegree = (node: NodeView, attribute: string) =>
    node.edges().reduce((sum, edge) => sum + (edge.number(attribute) ?? 0), 0);

defineAlgorithm({
    id: "acme-confidence-degree",
    options: { confidence: { type: "attribute", on: "edge", default: "confidence" } },
    node: (node, { options }) => weightedDegree(node, options.confidence),
});

defineAlgorithm({
    id: "acme-confidence-share",
    options: { confidence: { type: "attribute", on: "edge", default: "confidence" } },
    edge: (edge, { options }) =>
        (edge.number(options.confidence) ?? 0) /
        Math.sqrt(weightedDegree(edge.source, options.confidence) * weightedDegree(edge.target, options.confidence)),
});
```

A definition carries exactly one of four functions, and the function decides the result:

| Function                 | Called                 | Publishes                                                    |
| ------------------------ | ---------------------- | ------------------------------------------------------------ |
| `node(node, context)`    | once per node in scope | a `node-metric` result, field `value`                        |
| `edge(edge, context)`    | once per edge in scope | an `edge-metric` result, field `value`                       |
| `nodes(graph, context)`  | once, may be async     | a `node-metric` result from a `Map<id, number>`              |
| `groups(graph, context)` | once, may be async     | a `community` result, field `group`, from a `Map<id, label>` |

`context` holds `options`, `graph` (the whole graph view), `signal` and `progress(fraction)`.
The per-element forms never need the last two: the element owns the loop.

**What the element fills in.**

| Advanced-tier member                         | Simple-tier value                                                                                                                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `static type`, `descriptor.key`, `namespace` | the id; the legacy `namespace:type` address is `<id>:<id>`                                                                                                                                |
| `plainName`, `technicalName`                 | `name` for both                                                                                                                                                                           |
| `description`                                | `description`, or ""                                                                                                                                                                      |
| `category`                                   | `"custom"` (an open-union value)                                                                                                                                                          |
| `shape`, `fields`                            | from the function (table above), built with `nodeMetricFields`, `edgeMetricFields` or the community builder, so the descriptor's fields and the output's field specs come from one source |
| `options`                                    | the expanded short form                                                                                                                                                                   |
| orientation and parallel edges               | `context.input("undirected")`, or `"declared"` when `direction: "directed"`; `simplify: "none"`, so every parallel edge keeps its own id                                                  |
| attribute reads                              | `attr` and `number` read through `input.column` and the result-path resolver                                                                                                              |
| iteration, yielding, progress, abort         | the per-element forms run through `forEachChunked` over the scope, reporting the phase as `name`; the whole-graph forms are awaited and the signal is handed over                         |
| ids                                          | node rows through `ids.idOf`, edge rows through `input.edgeId`                                                                                                                            |
| the output                                   | `AlgorithmOutput` with `shape`, `fields`, `nodes` or `edges`, and `graph.normalization: "none"`                                                                                           |
| unmeasured values                            | a return of `undefined`, `null`, `NaN` or an infinity publishes nothing for that element, which is the measured-only and finite-number rules by construction                              |
| empty scope                                  | `null` (the element's empty-scope handling)                                                                                                                                               |
| caveats                                      | `declaredCaveats({ method: name, direction })`; exact, double precision                                                                                                                   |
| cost                                         | per-element forms: `costClass: "instant"`, `costUnits` n + 2m; whole-graph forms: `"iterative"`, n + m; `complexity` "O(n + m)"                                                           |
| scope                                        | the whole graph is computed; values are kept for the scope (the element's default)                                                                                                        |
| registration                                 | `DeclaredAlgorithm.register` on the generated class                                                                                                                                       |

**Ceiling.** Move to the advanced tier when the algorithm needs: a result shape other than the
four above (a path, a node set, a pair list, a temporal or category table); several fields in one
result; per-element work that grows faster than the degree (the per-element cost estimate would
then under-state it); control over parallel-edge merging or weights meaning ("distance" or
"strength" in the caveats); a seed, sampling or an approximation; chunking inside a whole-graph
function on a graph large enough to stall a frame; or reading the graph as typed arrays for speed.

### 4.2 Layout

**The first plugin.** Rows by a tier attribute:

```ts
import { defineLayout } from "@graphty/graphty-element/extend";

defineLayout({
    id: "acme-tiers",
    dimensions: 2,
    options: { tier: { type: "attribute", attributeType: "integer", default: "tier" }, spacing: 1 },
    place(graph, { options }) {
        const used = new Map<number, number>();
        return new Map(
            graph.nodes().map((node) => {
                const tier = node.number(options.tier) ?? -1; // no tier: a row of its own below tier 0
                const column = used.get(tier) ?? 0;
                used.set(tier, column + 1);
                return [node.id, [column * options.spacing, tier * options.spacing]] as const;
            }),
        );
    },
});
```

**What the element fills in.**

| Advanced-tier member                               | Simple-tier value                                                                                                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `descriptor.id`, `engine`                          | the id                                                                                                                                                                      |
| `plainName`, `technicalName`, `description`        | `name` for both names; `description` or ""                                                                                                                                  |
| `family`, `kind`, `sizeRating`, `structuralInputs` | `"custom"`, `"batch"`, `"any"`, derived from the option types                                                                                                               |
| `maxDimensions`                                    | `dimensions`, default 3                                                                                                                                                     |
| `honoursWeights`, `scoped`                         | false, true                                                                                                                                                                 |
| input                                              | the graph view over the whole graph; the view dimension is `context.dimensions`, never an undeclared key                                                                    |
| output                                             | a `Float32Array` of `nodeCount * dimensions`, NaN everywhere, each returned position written at its node's row; a 2D position in 3D gets z = 0, a 3D position in 2D loses z |
| pinned and held nodes                              | the element copies `fixed.positions` over them after `place` returns; `context.fixed(id)` lets an author arrange around them                                                |
| unplaced nodes                                     | a node missing from the map, or given null or a non-finite number, is left unplaced and listed in the settled report                                                        |
| units                                              | scene units; no hidden multiplier                                                                                                                                           |
| randomness                                         | `context.random()` is seeded; with `random: true` the element declares a seed option, draws and records the seed                                                            |
| abort, progress, errors                            | the element checks the signal before and after `place`, reports 0 and 1, and wraps a throw as `E_INTERNAL`, source "layout"                                                 |
| registration                                       | the snapshot layout registration of `layout.md` (`SnapshotLayoutRegistration`)                                                                                              |

**No plugin at all, where a built-in should do it.** Placing nodes at coordinates their data
already carries is the most common layout request. It is a built-in's job: the element's `fixed`
layout SHOULD take `x`, `y` and `z` attribute options (defaulting to today's `position.x`, `.y`
and `.z`) and leave a node without coordinates unplaced instead of placing it at the origin. With
that, the task is `graph.setLayout("fixed", { x: "lon", y: "lat" })` and no extension.

**Ceiling.** Move to the advanced tier for a live layout (a simulation stepped frame by frame),
for writing coordinates directly into a typed array on very large graphs, for work in a worker or
on the GPU, for weights read in bulk, or for chunking inside `place`. A live simple form (a
`tick(nodes, alpha)` function in the style of d3-force) is not proposed until a plugin needs it.

### 4.3 File format

**The first plugin.** A tab-separated edge list, read and written:

```ts
import { defineFormat } from "@graphty/graphty-element/extend";

defineFormat({
    id: "acme-tsv",
    name: "Tab-separated edge list",
    extensions: [".tsv"],
    read(text) {
        const [header = "", ...rows] = text.split(/\r?\n/).filter((line) => line !== "");
        const columns = header.split("\t");
        if (!columns.includes("source") || !columns.includes("target")) {
            throw new Error("the first line must name a source and a target column");
        }
        return { edges: rows.map((row) => Object.fromEntries(row.split("\t").map((cell, i) => [columns[i], cell]))) };
    },
    write({ edges, edgeColumns }) {
        const header = ["source", "target", ...edgeColumns];
        const lines = [header, ...edges.map((edge) => header.map((column) => String(edge[column] ?? "")))];
        return lines.map((cells) => cells.join("\t")).join("\n") + "\n";
    },
});
```

`read` receives the whole input as text and returns plain records (`{ nodes?, edges?, directed? }`),
or a promise of them, or an async iterable of batches for a large file. `write` receives plain
records and returns text. Either may be omitted, making the format read-only or write-only.

**What the element fills in.**

| Advanced-tier member | Simple-tier value                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FormatDescriptor`   | `id`; `plainName` from `name`; `extensions`; `mimeTypes` from `mediaTypes`, else looked up from the extensions, else `text/plain`; `canImport` and `canExport` from whether `read` and `write` exist; `options` expanded                                                                                                                                                                                                                                  |
| catalogue            | one entry, whether the format has a reader, a writer or both                                                                                                                                                                                                                                                                                                                                                                                              |
| the reader class     | a generated `DataSource` subclass: constructor, `getConfig`, `resolveOptions`, `sourceFetchData` = read the input (string, `File` or URL, with the element's retry and size limits) -> `read` -> records -> chunks; registered with `DataSource.register`                                                                                                                                                                                                 |
| records              | plain objects; the element applies the record conventions (`id`, `source` and `target`) and the brand. Ids stay as the file spells them, as strings, unless `read` returns numbers on purpose                                                                                                                                                                                                                                                             |
| direction            | `directed` in the returned records becomes `declareDirection`                                                                                                                                                                                                                                                                                                                                                                                             |
| per-record problems  | `context.warn(message, line)` reaches the error aggregator and the load report                                                                                                                                                                                                                                                                                                                                                                            |
| errors               | a throw from `read` becomes `E_PARSE_FAILED` with `details.format`, and `details.line` when the error carries `line`                                                                                                                                                                                                                                                                                                                                      |
| detection            | by extension; `detect(sample)` when given                                                                                                                                                                                                                                                                                                                                                                                                                 |
| the writer           | a generated `GraphExporter` registered with `registerFormatWriter`. Its `export` resolves the snapshot into records -- node ids and edge endpoints resolved, mixed-direction pairs folded, the element's internal columns removed, unmeasured values left out, algorithm results included as attribute columns under their export names -- neutralises spreadsheet formulas in string values by column type, calls `write`, and encodes the text as UTF-8 |
| loss notes           | the `ExportCapabilities` table is derived from `keeps` (default: every attribute and isolated nodes, no positions, no style), so `check()` is truthful by construction                                                                                                                                                                                                                                                                                    |

**Ceiling.** Move to the advanced tier for a binary format, streaming bytes in or out without
holding the whole text, a declared schema of attribute types, a format with a place for style or
hierarchy, custom loss notes, or content detection that needs bytes rather than text.

### 4.4 Data source

**The first plugin.** A paged, authenticated REST API:

```ts
import { defineDataSource } from "@graphty/graphty-element/extend";

defineDataSource({
    id: "acme-api",
    name: "Acme graph API",
    hosts: ["https://api.acme.example"],
    credential: { name: "API token" },
    options: { endpoint: "https://api.acme.example/graph" },
    async *load({ options, fetch }) {
        for (let url: string | null = options.endpoint; url !== null; ) {
            const page = (await (await fetch(url)).json()) as {
                nodes: Record<string, unknown>[];
                edges: Record<string, unknown>[];
                next?: string;
            };
            yield { nodes: page.nodes, edges: page.edges };
            url = page.next ?? null;
        }
    },
});
```

The data source point was decided on 2026-09-28 and has no built contract yet, so the simple
form above is the first form of its contract, and every advanced member (`candidates.md` section 1,
"Shape if promoted") is an OPTIONAL member of the same definition object. A simple source grows
into an advanced one by adding members, never by being rewritten into a class.

**What the element fills in.**

- **The descriptor.** A data source is its own catalogue kind (`session.catalog.sources()`), not a
  file format, so it has no invented extension or media type and does not take part in file
  detection.
- **The fetch it hands over.** Checks every URL against `hosts` and the embedder's allowlist;
  asks the reader to confirm a host on first use; attaches the credential as
  `Authorization: Bearer <secret>` (or the declared header and scheme); retries with backoff; applies
  the timeout, the rate limit and the abort signal; turns a failed response into `E_FETCH_FAILED`
  with the URL and status.
- **The credential.** Asked for in a masked field, kept by the element, never logged, never
  published in the catalogue, never saved in a configuration, never visible to `load`.
- **Ingestion.** The same record conventions, chunking, per-record validation, error aggregation
  and progress events as a file load.
- **Provenance.** The source id and version, the options with the credential removed, the time of
  the query and the page count, recorded in the load report.
- **Cancellation.** The signal aborts on a new load, on removal of the element and on a cancel
  call; `load` needs to do nothing for it because the handed-over `fetch` honours it.
- **Errors.** A throw from `load` that is not a `GraphtyError` becomes `E_FETCH_FAILED` (or
  `E_PARSE_FAILED` for a body that is not what the source expected), `details.source` = the id.
- **Reach.** `addDataFromSource("acme-api", { endpoint })`, the element attribute, and the catalogue
  for an import dialog's service tab -- the routes a built-in source uses.

**Ceiling, which is additive here.** Refresh modes (manual, interval, stream), a pinned service
release, retention windows and removal records, the found, not-found and ambiguous identifier
report, handing a response body to a registered reader by media type, lazy expansion
(`expand({ node, fetch, signal })`, which replaces the `layoutBehavior.fetchNodes` callbacks) and
the publish direction are members added to the same object.

### 4.5 Palette

**The first plugin.**

```ts
import { definePalette } from "@graphty/graphty-element/extend";

definePalette("acme-brand", "categorical", ["#0B1D51", "#1B7F79", "#F2A65A", "#E07A1F", "#7A3E9D"]);
definePalette("acme-brand-ramp", "sequential", ["#E8F1FA", "#1B7F79", "#0B1D51"]);
```

**What the element fills in.** `plainName` from the id (or `extra.name`); `capacity`, which it
already derives; `colorblindSafe` as `[]` (no claim) unless `extra.colorblindSafe` makes one;
normalisation of every colour to six-digit hex. `definePalette` builds a `PaletteRegistration` and
calls `registerPalette`, so there is one validation path and one registry.

**Two changes the palette point needs besides the function.** (1) The published parameter type of
`registerPalette` narrows from `PaletteDescriptor` to `PaletteRegistration`, which `palette.d.ts`
already declares, so the advanced form stops requiring `capacity` and `colorblindSafe` too. (2) A
brand palette is meant to be used everywhere, so the element gets an element-scoped default:
`session.styles.setDefaultPalettes({ categorical: "acme-brand", continuous: "acme-brand-ramp" })`.
It is resolved when a layer is WRITTEN -- a binding with no palette records the resolved id -- so
saved documents always name a concrete palette and keep their meaning, which is the reason the
guide gives today for keeping the defaults fixed (README section 12, item 35).

**Ceiling.** There is almost none: a description and a colour-vision claim go in `extra`. The
descriptor form remains for authors who build palettes as data.

### 4.6 Camera

**The first plugin.** Most "custom camera" requests are a slow orbit. That needs no plugin:

```text
element.playCameraMotion("orbit");   // built in; pauses on input, resumes 3 s after it ends
```

A custom motion, and a still view, in the simple tier:

```ts
import { defineCameraMotion, defineCameraView } from "@graphty/graphty-element/extend";

defineCameraMotion({
    id: "acme-slow-orbit",
    options: { secondsPerTurn: 60 },
    motion: (t, { center: c, fitDistance: d }, { secondsPerTurn }) => {
        const angle = (t / 1000 / secondsPerTurn) * 2 * Math.PI;
        return { position: { x: c.x + d * Math.sin(angle), y: c.y, z: c.z + d * Math.cos(angle) }, target: { ...c } };
    },
});

defineCameraView({
    id: "acme-corner",
    view: ({ center: c, fitDistance: d }) => ({
        position: { x: c.x + d / Math.sqrt(3), y: c.y + d / Math.sqrt(3), z: c.z + d / Math.sqrt(3) },
        target: { ...c },
    }),
});
```

A view is a still framing; a motion is a view with time as one more input. Both stay pure: a
motion depends on `t`, the frame and its options, never on a clock, so the element can sample it
at exact times for a screenshot or a recorded video.

**What the element fills in.**

- **The frame.** `ViewFrame` gives the centre, the size, the radius and `fitDistance`, the distance
  at which the box fills the view, so an author never works out field-of-view geometry.
- **The descriptor.** `plainName` from the id, `description` "", `modes` default `["3d"]`, the
  expanded options. `defineCameraView` calls `registerCameraView` with a `compute` that builds the
  frame from `CameraViewInput` and calls `view`.
- **The motion loop.** `playCameraMotion(id)` runs the motion on the element's own frame loop:
  it pauses on any input the element owns (pointer, wheel, keyboard, touch, XR) and resumes three
  seconds after the input ends; it stops on disconnection, a dataset change or a change of drawing
  mode; it respects `prefers-reduced-motion` (it does not start); it re-measures the frame when
  the layout settles rather than every frame; and it throttles the camera-state event instead of
  firing it every frame. `captureAnimation` can record a registered motion by id.
- **The built-in orbit.** "orbit" is a reserved motion id, registered through the same path, so a
  third-party motion reaches every route it does.

**How it wraps the advanced tier.** A motion registers as a camera view whose input gains
`elapsedMs`; the advanced registration for it is `registerCameraView` with a descriptor that
declares it is a motion. That addition to the advanced contract is part of README section 12,
item 36.

**Ceiling.** A new controller or input model stays internal (`camera.md` section 1). Anything
that needs the full `CameraViewInput` (the viewport in pixels, the current state for a relative
move) uses the advanced form.

### 4.7 Logging

**The first plugin.** Errors sent to a telemetry endpoint:

```ts
import { defineLogDestination } from "@graphty/graphty-element/extend";

defineLogDestination({
    id: "acme-telemetry",
    level: "error",
    write: (record) =>
        fetch("https://telemetry.acme.example/v1/errors", {
            method: "POST",
            body: JSON.stringify({ time: record.time, source: record.category, message: record.message }),
        }),
});
```

**What the element fills in.**

- **Delivery.** A destination defined this way is attached immediately (unless `attach: false`)
  and receives records at its own `level` whether or not the logger's global `enabled` flag is
  set; the global flag and level then govern the console only. So the author never meets the
  two gates, and turning on telemetry does not flood the developer console. The rule that a
  destination's level can only narrow the global level stays in force for configurations read
  back from storage or a URL, which is its security reason (README section 12, item 34).
- **The record.** `PlainLogRecord`: the time, the level as a word, the category as one dotted
  string, the message, and `error`, after the element's redaction (`logging.md` section 7).
- **Asynchronous writes.** When `write` returns a promise, the element queues records, sends
  them in order, catches a rejection and reports it on the console (never through the logger,
  which would recurse), retries a bounded number of times, and gives up. `flush` awaits the queue;
  `dispose` drains it with a timeout; every destination is flushed on `pagehide`. This is the
  batching the built-in `remote` destination already has, now given to everyone, and it replaces
  the rule that a network destination must buffer in `write` and send in `flush`.
- **The registration.** A `LogSinkRegistration` with `descriptor = { id, plainName: name,
description, options: [] }` and a `create` that returns the wrapped `Sink`, registered with
  `registerLogSink`, so a stored configuration can also turn it on by id (`{ use: "acme-telemetry" }`).
- **Detaching.** `defineLogDestination` returns a function that detaches it.

**Ceiling.** Declared options for a destination a configuration builds by name, a custom
`flush` or `dispose`, a hand-written synchronous `write` with its own buffering, or the full
`LogRecord` with the numeric level and category array.

## 5. Graduating without renaming

An extension outgrows the simple tier by being rewritten against the advanced contract UNDER THE
SAME ID. Nothing a consumer saved breaks, because:

1. The id is the same, so documents, configurations and run records still resolve.
2. The generated descriptor is public: `session.catalog.<kind>()` publishes it, and the advanced
   version copies it as its starting point, so names, options and their defaults stay the same.
3. Result field names are the advanced tier's own (`value` for a metric, `group` for a community),
   so a style layer bound to `results.<run>.value` keeps working.
4. Option names are the short-form keys, so a saved option set still validates.

The author deletes the `define*` call and registers the advanced form under the same id. Loading
both at once replaces the first with the second (with the element's one warning per id), which
is the registry's normal rule; `{ strict: true }` turns that into an error for an author who wants
to be sure only one exists.

## 6. What the simple tier needs from the advanced tier

Each item is additive to a published contract and is also useful to advanced authors:

1. **An element domain on "attribute" and "partition" options** (`on: "node" | "edge"`,
   `OptionDescriptorDomain` in `simple.d.ts`). Without it, neither tier can say whether an option
   names a node or an edge attribute, and `input.column` cannot know which table to read.
2. **`edgeMetricFields`** beside `nodeMetricFields`, so no author of either tier writes the ten
   required fields of an edge metric by hand.
3. **A community field builder** for the `groups` form, for the same reason.
4. **The snapshot layout contract, `input.column`, `input.edgeId` and `registerFormatWriter`**,
   all decided on 2026-09-28. The simple tier is built on them and cannot ship before them.
5. **Camera motions** as a declared kind of camera view (README section 12, item 36).

## 7. Open decisions

The owner decided to HAVE a simple tier. The names and shapes above are recommendations recorded
in `README.md` section 12:

- item 33: the names and shapes of the simple-tier exports;
- item 34: delivery to a log destination attached in code, whatever the global `enabled` flag;
- item 35: element-scoped default palettes, resolved when a layer is written;
- item 36: camera motions, the element's `playCameraMotion` and `stopCameraMotion`, and the
  reserved motion id "orbit".
