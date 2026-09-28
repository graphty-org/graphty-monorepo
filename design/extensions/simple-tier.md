# The simple tier

Status: proposed, against graphty-element 2.6.1. The owner decided on 2026-09-28 that every
extension point has a simple tier ("easy things easy, hard things possible"); the names and shapes
below are the recommendation of `README.md` section 12, item 33. Normative shapes:
`simple.d.ts`. The budget every simple tier is held to: `README.md` section 8.1. The measurements
that motivate it: `complexity-review.md`.

**Nothing in this document runs in graphty-element 2.6.1.** Every `define*` function, the graph
view and the consumer calls marked "proposed" below are design; an example here type-checks
against `simple.d.ts` and fails at run time against 2.6.1 with "defineX is not a function". The
release rule: a guide page under `graphty-element/docs/guide/extending/` leads with a simple-tier
example only in the release that ships it, and its first line names that release ("Available from
graphty-element 2.7"). Until then the guides lead with the advanced tier they describe today, and
an author who must ship on 2.6.1 uses the form in the last column of the table in section 1:
palettes, camera views, log destinations and algorithms already register there.

Before release, the simple tier is exercised in a playground: a graphty-element Storybook story
that implements each `define*` function over the advanced verbs 2.6.1 already has (section 3 item
6). The blind-author check (`README.md` section 8.1 item 6) runs against it, so an author runs the
plugin and reads the real error messages instead of only type-checking.

**Start here.** Your first plugin is one example below; copy it, change the parts that are yours,
and paste its "use it" line into the page of section 2.7.

| I want to...                                        | Section |
| --------------------------------------------------- | ------- |
| compute a score per node or per edge, or a grouping | 4.1     |
| place nodes (rows by a value, preset coordinates)   | 4.2     |
| read or write a file format                         | 4.3     |
| load a graph from a web API                         | 4.4     |
| add brand colours                                   | 4.5     |
| move or aim the camera                              | 4.6     |
| send log records somewhere                          | 4.7     |

Sections 2 and 3 are the reference: read them when an example leaves a question open.

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
| Palette     | `definePalette({ id, kind, colors })`                                  | a name, a kind and a list of colours          | `registerPalette(descriptor)` (`palette.md`)                        |
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
7. Every `define*` function takes one definition object (so learning one means guessing the
   rest), is synchronous, validates the whole definition before it registers anything, and takes
   the same optional `RegisterOptions` as the advanced verbs. Two differences are deliberate:
   `defineLogDestination` returns a function that detaches the destination, because a destination
   is the one extension that starts working the moment it is defined; and a data source's
   `progress(done, total?)` takes a count, because a pager rarely knows its total, where a run's or
   a layout's `progress(fraction)` takes the share done and is awaited.
8. Registrations are page-wide, as in the advanced tier. A `define*` call may run before or after
   an element is on the page; an element sees the extension from its next run, layout, load or
   picker. No registration is scoped to one element.

### 2.2 Options in short form

An option is declared once, as a key in `options`:

| Written                                                                | Means                                                           |
| ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| `tier: { type: "attribute", default: "tier" }`                         | the name of a node attribute the reader may change              |
| `confidence: { type: "attribute", on: "edge", default: "confidence" }` | the name of an EDGE attribute                                   |
| `spacing: 1`                                                           | a number option, default 1                                      |
| `label: "name"`                                                        | a string option, default "name" (NOT an attribute; see below)   |
| `weighted: false`                                                      | a boolean option, default false                                 |
| `alpha: { type: "number", default: 0.5, min: 0, max: 1 }`              | a bounded decimal                                               |
| `hops: { type: "integer", default: 2, min: 1, max: 5 }`                | a bounded whole number                                          |
| `weight: { type: "attribute", on: "edge", default: null }`             | an OPTIONAL edge attribute: unbound unless the reader picks one |
| `seeds: { type: "node-set" }`                                          | nodes the reader picks; no default, so the value may be absent  |

The element expands each entry into a full `OptionDescriptor` (`plainName` from the key in
sentence case: `secondsPerTurn` reads "Seconds per turn"), so the reader's form, validation,
defaults, the `E_UNKNOWN_OPTION` and `E_OPTION_RANGE` refusals and the run or load record all work
exactly as for an advanced extension. The key order is the order a form shows. An "attribute"
option's value is an attribute NAME: the author passes it to `attr()` or `number()` (section 2.3),
and the reader can rebind it without touching the code. An option that names an attribute MUST use
the object form with `type: "attribute"`: a bare string is a plain text option, which gets a text
box instead of an attribute picker and loses the check below. `attributeType` narrows the picker
(`"number"`, `"integer"`, `"string"`, `"boolean"`, `"time"`, `"category"`, `"mixed"`). Any other
member of `OptionDescriptor` may be written in the object form, with `name` taken from the key.

**Attribute options are checked before the author's code runs.** At the start of a run or layout,
the element resolves every "attribute" option against the attributes the graph's nodes (or, with
`on: "edge"`, edges) actually carry, and refuses a name nothing carries with `E_OPTION_RANGE`:
`acme-confidence-degree: option "confidence" names edge attribute "confidance", which no edge
carries; edges carry: confidence, weight.` A misspelt attribute therefore fails loudly instead of
reading as `undefined` everywhere. The same check applies to the advanced tier's `input.column`,
which already refuses a name that resolves to nothing.

**An optional attribute** is an "attribute" option with `default: null` (or no default). It is
NOT BOUND until the reader picks an attribute: the check above skips it, its value is `undefined`,
and `attr(undefined)` and `number(undefined)` return `undefined`, so no guard is needed. This is
NetworkX's `weight=None`: an edge weight that an unweighted graph simply lacks, or a `z`
coordinate that a 2D dataset lacks. `node.weightTo(other, options.weight)` counts each edge as 1
when the option is unbound, so one call serves both kinds of graph. Use `default: "weight"` only
when the plugin makes no sense without the attribute: then a graph without it is refused, loudly.

### 2.3 The graph view

Algorithms and layouts receive the graph as a `GraphView` (`simple.d.ts`): nodes and edges with
their real ids, and methods a newcomer can guess.

| Member                                                            | What it gives                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `graph.nodes()`, `graph.edges()`                                  | every node and every edge; parallel edges are separate edges with their own ids      |
| `graph.node(id)`, `graph.edge(id)`                                | one node or edge by id, or undefined                                                 |
| `node.id`, `node.degree`                                          | the id as the data spelled it; the number of edges touching the node                 |
| `node.neighbors()`, `node.edges()`                                | adjacent nodes (each once) and touching edges                                        |
| `node.outNeighbors()`, `inNeighbors()`, `outEdges()`, `inEdges()` | the directed forms; only with `direction: "directed"` in the definition              |
| `edge.id`, `edge.source`, `edge.target`                           | the element's edge id and its two ends as the data stored them                       |
| `edge.other(node)`                                                | the far end, seen from `node` -- the way to walk from a node along its edges         |
| `node.edgesTo(other)`, `node.weightTo(other, path)`               | the edges between two nodes, and their summed weight (w_ij); parallel edges added    |
| `node.attr(path)`, `edge.attr(path)`                              | an attribute or a published result, resolved exactly as a style selector resolves it |
| `node.number(path)`, `edge.number(path)`                          | the same, when it is a finite number; undefined otherwise                            |

Rules:

1. The element builds the view from the snapshot the advanced tier reads. The author never sees a
   row, a mask, a typed array or a compressed adjacency; ids are real node ids and real `Edge.id`s.
2. Iteration order is stable -- numeric ids ascending, then string ids in code-unit order; edges
   the same by edge id -- so a result never depends on the order the records were loaded in. It
   is not alphabetical by label: sort the keys yourself when a reader will see the order.
3. `attr` resolves paths (`location.lat`) and result paths (`results.clusters.group`) through the
   same resolver as styles and filters. Reading an earlier run's result is therefore the decided
   "results as columns" capability, with no new concept.
4. The view is read-only. Nothing an author does to it changes the graph.
5. The view is built once per run and shared by every call in that run. Every array it hands
   back is frozen, built once and cached, so `node.neighbors()` inside a loop costs nothing.
6. **Direction is never guessed.** A definition that does not declare `direction: "directed"`
   gets an undirected view, and there `outEdges()`, `inEdges()`, `outNeighbors()` and
   `inNeighbors()` THROW (`acme-pr: outEdges() needs direction: "directed" in the definition`),
   so a plugin cannot read direction the view was built without and return plausible wrong
   numbers. With `direction: "directed"`, an undirected edge in the data counts both ways.
7. **Walk edges with `other`.** In an undirected view, `edge.source` is whichever end the data
   named first, NOT the node the edge was reached from. From a node, the neighbour along an edge
   is `edge.other(node)`:
   `for (const edge of node.edges()) sum += rank.get(edge.other(node).id) ?? 0;`
8. `neighbors()` never includes the node itself; a self-loop is in `edges()` and in
   `node.edgesTo(node)`. `weightTo` returns `undefined` when there is no edge, which is different
   from a weight of 0.
9. The types are exported for helpers: `NodeId`, `NodeView`, `EdgeView`, `GraphView` and `Point`
   (`import type { EdgeView, NodeId } from "@graphty/graphty-element/extend"`), and
   `compareNodeIds(a, b)` is the view's own order, for sorting ids the same way.

### 2.4 Errors a beginner reads

A person following the guide reads the first line of an error and searches for it. So:

1. Every error a simple-tier extension causes is a `GraphtyError` with a code from the published
   list, exactly as for the advanced tier, and its message starts with the extension's id and the
   member at fault.
2. A malformed definition is refused synchronously by the `define*` call, with `E_BAD_COMMAND`
   (the published code for "a malformed call or definition"), `details.field` naming the member,
   and a message that says what was expected:
   `defineLayout("acme-tiers"): "place" must be a function; got undefined.`
3. A throw from the author's own function is `E_EXTENSION_FAILED` (README section 12, item 37),
   with `details.extension` = the id, `details.member` = the function, the original error kept as
   `cause`, and a message that names the extension and the element being processed:
   `acme-confidence-share: edge() threw for edge "e17" (TypeError: Cannot read properties of undefined).`
   It never says `E_INTERNAL`, which means a defect in graphty-element and asks the reader to file
   an issue against it. A reader's throw is `E_PARSE_FAILED` naming the format, and the line when
   the thrown value carries a numeric `line` property. A data source's own throw from `load` is
   `E_PARSE_FAILED` naming the source: the author throws because a body was not what the source
   expected. `E_FETCH_FAILED` comes only from the element's own `fetch` (the network, an HTTP
   status, a repeated URL, too many requests). The same codes apply to the advanced tier.
4. A value the element cannot use is named with the element and the rule:
   `acme-tiers: place() returned [1, NaN] for node 42. A position is two or three finite numbers;
leave the node out to leave it unplaced.` A score that is not a finite number is not an error:
   it means "not measured" (section 4.1).
5. No message names an internal concept (`README.md` section 8.1 lists them). A beginner is told
   what THEY wrote wrong, in the terms of the definition they wrote.
6. The TypeScript types report a mistake against the member the author wrote. Because the option
   values are typed from the declaration, the FIRST line of a type error spells out the options
   type, and the type shows each default as written (`60`, not `number`); **read the LAST line**,
   which names the mismatch. A misspelt option, as the compiler prints it:

    ```text
    error TS2551: Property 'confidance' does not exist on type
      'OptionValuesOf<{ readonly confidence: { readonly type: "attribute"; ... } }>'.
      Did you mean 'confidence'?
    ```

    Every guide page shows this error beside its first example.

7. **Nothing fails silently where the element can tell.** Beyond the attribute check of section
   2.2: a run whose every value came back "not measured" completes with a warning in its run
   record (`acme-confidence-share: no edge was measured -- did the function return NaN or
undefined for every edge?`); a simple extension whose function blocks the page for more than
   200 ms at a time gets a warning in its run or layout record AND on the console, once per
   extension id, saying to `await context.progress(i / n)` in its loop; and a reader row with the
   wrong number of cells is the author's to report with `context.warn`, which the first-plugin
   example does.
8. **A map keyed by the wrong kind of id is refused.** When `place`, `nodes` or `groups` returns a
   map with entries but no key matches a node, the element refuses with `E_EXTENSION_FAILED`,
   naming a sample key and the kind of id the data has: `acme-tiers: place() returned 34
positions but no key matches a node id (got "1"; node ids here are numbers)`. When only some keys
   match, the run or layout completes with a warning listing up to five unknown keys. `String(id)`
   against numeric ids is the most common way a map-returning plugin silently does nothing.
9. **A synchronous whole-graph function cannot be interrupted.** The element owns the loop of
   `node` and `edge`, so those never freeze the page. A `nodes`, `groups` or `place` function that
   loops without awaiting `context.progress(...)` runs to completion before anything else happens,
   and cannot be cancelled; an endless loop hangs the tab. Prefer the per-element forms wherever
   the method fits them.

### 2.5 Testing a simple extension

The functions in a definition are plain functions. A layout's `place` or an algorithm's
`node` can be called in a unit test with a hand-built graph view; the conformance kit
(`README.md` section 11.2, `conformance.d.ts`) publishes `graphView({ nodes, edges })` for that
and `loadContext({ options, responses })`, a load context with a stub fetch, for a data source's
`load`. Every `check*` function accepts the id of a registered extension, so a simple extension
is checked by the same checks as an advanced one.

### 2.6 Records, and how their values are typed

A file reader and a data source both hand the element plain records:

- a node record is `{ id, ...attributes }`; an edge record is `{ source, target, ...attributes }`,
  with an optional `id` for the edge's own id;
- `weight` on an edge is the strength algorithms and styles read by default; `position`
  (`{ x, y, z }`) on a node places it;
- `src`/`dst` and `from`/`to` are read as endpoints, and every key beginning with `graphty` is
  reserved, so none of them is an ordinary attribute;
- an edge may name a node no record declared; the element creates it.

**Values are typed on load.** A text reader naturally returns every cell as a string. For records
from a simple-tier reader or source, the element types each attribute column once, after the load:
a column whose every present value is written as a JSON number becomes a number column, and
`"true"`/`"false"` columns become booleans. The JSON number grammar (`-2.31`, `0.93`, `3.2e-08`)
has no leading zeros and no `+` sign, so a column holding `"00501"`, `"007"` or `"+1 555 0100"`
anywhere stays text, whole -- a zip code, an accession number or a phone number is never turned
into a number that has lost its zeros. Ids and endpoints are never converted. A definition
overrides the check per column with `columns: { version: "string" }` (a column of `"1.10"`, which
is a valid number, is otherwise read as 1.1). A reader that returns numbers on purpose is
unaffected. This is why `number()` itself never parses strings: both tiers see the same typed
columns, and a fold change of `-2.31` read from a TSV file is the number -2.31, never text.

**Endpoints are checked, not assumed.** An edge record with none of `source`/`target`,
`src`/`dst` or `from`/`to` is not loaded and is counted in the load report; when NO edge record
has endpoints, the load fails with `E_PARSE_FAILED` naming the keys the records do carry
(`acme-tsv: no edge record names a source and a target; records carry: bait, prey, score`). So a
reader need not check its header for endpoint columns, and a file whose endpoint columns have
other names fails with the fix in its message: rename them in `read`
(`{ ...row, source: row.bait, target: row.prey }`).

**Labels.** No attribute is drawn as a label by default: a label is the `node.label` channel of a
style layer (`graphty-element/docs/guide/styling.md`). Keep a readable name in an attribute
(`name`) so a reader can bind it.

### 2.7 From an empty page to a result

Every `define*` function is exported from `@graphty/graphty-element/extend` and, for a page with
no build step, from the self-contained bundle (`dist/graphty.bundle.js`) that already exports the
advanced registration verbs. The whole of a working page:

```html
<graphty-element id="graph" sample="karate"></graphty-element>
<script type="module">
    import { defineAlgorithm } from "https://cdn.jsdelivr.net/npm/@graphty/graphty-element/dist/graphty.bundle.js";

    defineAlgorithm({ id: "acme-degree", node: (node) => node.degree });
    document.getElementById("graph").run("acme-degree", {}, { as: "degree" });
</script>
```

Every example in section 4 runs in this page: import its `define*` name from the bundle URL
instead of `@graphty/graphty-element/extend`, and replace the two lines of the script with the
example and its "use it" lines, where `element` is `document.getElementById("graph")`. With a
bundler, the `@graphty/graphty-element/extend` import needs no configuration: the simple tier's
types come with the element, and a type check is optional.

A run paints the graph on its first completion (the element's automatic style: a node score
becomes a colour ramp over the nodes it measured), so this page shows coloured nodes with no
style code. A reader's own style layer reaches the values at `results.degree.value` -- the path is
`results.<as name>.value`, which is why every example below names its run with `as`.

Each point's section ends with its "use it" lines; they count toward the budget (`README.md`
section 8.1 item 1).

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
5. **Dogfood.** The element MUST build at least one built-in per point on the simple tier, and
   SHOULD build more: degree and weighted degree on `defineAlgorithm`, the shell layout (and the
   grid, circular and random layouts) on `defineLayout`, every built-in palette on
   `definePalette`, the "orbit" motion on `defineCameraMotion`, the console destination on
   `defineLogDestination`, the JSON reader on `defineFormat`. A built-in on the simple tier is the
   proof that the tier loses nothing, exactly as the parity suite is for the advanced tier, and its
   benchmarks replace the estimated ceilings in section 4 with measured ones.
6. **The playground.** Until a release ships the simple tier, a graphty-element Storybook story
   ("Extending / Simple tier playground") implements each `define*` function over the advanced
   verbs 2.6.1 already publishes -- `DeclaredAlgorithm.register`, `registerPalette`,
   `registerCameraView`, `registerLogSink`, the layout and data-source registrations -- and exposes
   a page like section 2.7's in which an author pastes a plugin and runs it. What 2.6.1 cannot do
   yet (the up-front attribute check, typing on load) the playground does in the story, so the
   error messages of section 2.4 are real. It is how the blind-author check runs the plugin.

## 4. Each point

### 4.1 Algorithm

**The first plugin.** A node score, then an edge score that reads the node score's result:

```ts
import { defineAlgorithm } from "@graphty/graphty-element/extend";

// The sum of the confidence of every edge touching a node. An edge with no confidence adds 0;
// return undefined instead to leave such a node unmeasured.
defineAlgorithm({
    id: "acme-confidence-degree",
    options: { confidence: { type: "attribute", on: "edge", default: "confidence" } },
    node: (node, { options }) => node.edges().reduce((sum, edge) => sum + (edge.number(options.confidence) ?? 0), 0),
});

// An edge's confidence relative to the confidence-weighted degrees of its two ends.
defineAlgorithm({
    id: "acme-confidence-share",
    options: {
        confidence: { type: "attribute", on: "edge", default: "confidence" },
        strength: { type: "attribute", default: "results.strength.value" },
    },
    edge: (edge, { options }) => {
        const c = edge.number(options.confidence);
        const a = edge.source.number(options.strength);
        const b = edge.target.number(options.strength);
        return c === undefined || !a || !b ? undefined : c / Math.sqrt(a * b);
    },
});
```

**Use it:**

```ts
await element.run("acme-confidence-degree", {}, { as: "strength" }); // colours the nodes
element.run("acme-confidence-share"); // colours the edges
```

The middle `{}` is the run's options (none here); `{ as: "strength" }` names the result
`results.strength`. The first run is awaited because the second reads its result; the second need
not be. **Order and name are a contract:** the edge score's `strength` option names
`results.strength.value`, so it needs the node score run first, under exactly that name. The edge
score reads the node score through its result path, so each degree is computed once, not once per
edge. The edge score is symmetric in its two ends, so it may read `edge.source` and `edge.target`
freely; an asymmetric score in an undirected view must not (section 2.3 rule 7). Run first without the node score and the edge run is refused before any code
runs, because the `strength` option names `results.strength.value`, which no node carries yet
(section 2.2). A misspelt `confidence` is refused the same way. Returning `undefined` leaves an
element "not measured", which is different from a score of 0.

**An optional weight, and the weight between two nodes.** A score from a paper usually needs
w_ij, the weight between two nodes, and should also run on an unweighted graph:

```ts
import { defineAlgorithm } from "@graphty/graphty-element/extend";

// Node strength: the summed weight to each neighbour. With no weight attribute picked, every
// edge counts 1, which makes it the degree.
defineAlgorithm({
    id: "acme-strength",
    options: { weight: { type: "attribute", on: "edge", default: null } },
    node: (node, { options }) =>
        node.neighbors().reduce((sum, other) => sum + (node.weightTo(other, options.weight) ?? 0), 0),
});
```

A definition carries exactly one of four functions, and the function decides the result:

| Function                 | Called                 | Publishes                                                    |
| ------------------------ | ---------------------- | ------------------------------------------------------------ |
| `node(node, context)`    | once per node in scope | a `node-metric` result, field `value`                        |
| `edge(edge, context)`    | once per edge in scope | an `edge-metric` result, field `value`                       |
| `nodes(graph, context)`  | once, may be async     | a `node-metric` result from a `Map<id, number>`              |
| `groups(graph, context)` | once, may be async     | a `community` result, field `group`, from a `Map<id, label>` |

`context` holds `options`, `graph` (the whole graph view), `signal`, `progress(fraction)`,
`note(text)` and `converged(done, iterations)`. The per-element forms never need anything but
`options` and `graph`: the element owns the loop. A whole-graph function that loops MUST
`await context.progress(done / total)` once per pass: the promise yields to the page when the
frame's time is spent and rejects when the run is cancelled, so it is the whole of keeping the
page responsive (`await Promise.resolve()` is not: it lets no frame draw). A whole-graph function
that never awaits it runs to completion and cannot be cancelled (section 2.4 item 9); the element
warns on the console when it blocks the page. An iterative method
reports how it ended with `context.converged(false, iterations)`, which the run record's caveats
carry, and states a method detail with `context.note(...)`. A definition may name the edge option
that holds weights and what they mean (`weights: { option: "weight", meaning: "strength" }`) and
the integer option that caps its passes (`passes: "maxIterations"`), which multiplies the cost
estimate.

**What the element fills in.**

| Advanced-tier member                         | Simple-tier value                                                                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `static type`, `descriptor.key`, `namespace` | the id; the legacy `namespace:type` address is `<id>:<id>`                                                                                                                                  |
| `plainName`, `technicalName`                 | `name` for both                                                                                                                                                                             |
| `description`                                | `description`, or ""                                                                                                                                                                        |
| `category`                                   | `"custom"` (an open-union value)                                                                                                                                                            |
| `shape`, `fields`                            | from the function (table above), built with `nodeMetricFields`, `edgeMetricFields` or the community builder, so the descriptor's fields and the output's field specs come from one source   |
| `options`                                    | the expanded short form                                                                                                                                                                     |
| orientation and parallel edges               | `context.input("undirected")`, or `"declared"` when `direction: "directed"`; `simplify: "none"`, so every parallel edge keeps its own id                                                    |
| attribute reads                              | "attribute" options resolved up front through `input.column` (section 2.2); `attr` and `number` read through it and the result-path resolver                                                |
| iteration, yielding, progress, abort         | the per-element forms run through `forEachChunked` over the scope, reporting the phase as `name`; the whole-graph forms get `progress`, which reports and awaits `yieldNow`, and the signal |
| ids                                          | node rows through `ids.idOf`, edge rows through `input.edgeId`                                                                                                                              |
| the output                                   | `AlgorithmOutput` with `shape`, `fields`, `nodes` or `edges`, and `graph.normalization: "none"`                                                                                             |
| unmeasured values                            | a return of `undefined`, `null`, `NaN` or an infinity publishes nothing for that element, which is the measured-only and finite-number rules by construction                                |
| empty scope                                  | `null` (the element's empty-scope handling)                                                                                                                                                 |
| caveats                                      | `declaredCaveats({ method: name, direction, weight, converged, iterations, notes })` from the definition and the context; exact, double precision                                           |
| cost                                         | per-element forms: `costClass: "instant"`, `costUnits` n + 2m; whole-graph forms: `"iterative"`, n + m times the `passes` option's value; `complexity` "O(n + m)"                           |
| scope                                        | the whole graph is computed; values are kept for the scope (the element's default)                                                                                                          |
| errors                                       | a throw from the author's function is `E_EXTENSION_FAILED` naming the element (section 2.4)                                                                                                 |
| registration                                 | `DeclaredAlgorithm.register` on the generated class                                                                                                                                         |

**Ceiling.** Move to the advanced tier when the algorithm needs: a result shape other than the
four above (a path, a node set, a pair list, a temporal or category table); several fields in one
result; control over parallel-edge merging; a seed, sampling or an approximation; or speed on
large graphs. Per-element work that grows faster than the degree -- a clustering coefficient
walks neighbour PAIRS -- still works in the `node` form and gives the right numbers; only the
element's cost estimate is low, so a very large graph may run longer than its warning said. The
view's arrays are cached, but every node and edge is still an object: an iterative whole-graph
method over about 100,000 nodes or more is slow on the view, so **an author who starts with that
task starts at the advanced tier** (`algorithm.md`), which reads the graph as typed arrays. This
ceiling is an estimate until the dogfood built-ins (section 3 item 5) measure it.

### 4.2 Layout

**The first plugin.** Rows by a tier attribute:

```ts
import { defineLayout } from "@graphty/graphty-element/extend";

defineLayout({
    id: "acme-tiers",
    dimensions: 2,
    options: { tier: { type: "attribute", default: "tier" }, spacing: 2 },
    place(graph, { options }) {
        const positions = new Map();
        const used = new Map();
        for (const node of graph.nodes()) {
            const tier = node.number(options.tier);
            if (tier === undefined) continue; // no tier: left unplaced, and listed as such
            const column = used.get(tier) ?? 0;
            used.set(tier, column + 1);
            positions.set(node.id, [column * options.spacing, tier * options.spacing]);
        }
        return positions;
    },
});
```

**Use it:**

```ts
await element.setLayout("acme-tiers", { spacing: 3 });
```

Positions are in scene units, the units the camera and the node sizes use: a node at the default
size is 1 unit across, so a spacing of 2 leaves a node's width between neighbours. A node left out
of the map is not placed, and the layout's list of unplaced nodes names it.

**Rows by a text category** -- the more common request -- with a node that has no category left
unplaced, and categories in a readable order (`numeric: true` puts "2" before "10"):

```ts
import { defineLayout, type NodeId } from "@graphty/graphty-element/extend";

defineLayout({
    id: "acme-category-rows",
    dimensions: 2,
    options: { category: { type: "attribute", default: "category" }, spacing: 2 },
    place(graph, { options }) {
        const rows = new Map<string, NodeId[]>();
        for (const node of graph.nodes()) {
            const value = node.attr(options.category);
            if (value === undefined || value === null) continue;
            if (!rows.has(String(value))) rows.set(String(value), []);
            rows.get(String(value))!.push(node.id);
        }
        const positions = new Map();
        const keys = [...rows.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        keys.forEach((key, row) =>
            rows
                .get(key)!
                .forEach((id, column) => positions.set(id, [column * options.spacing, row * options.spacing])),
        );
        return positions;
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
| unplaced nodes                                     | a node missing from the map, or given null or a non-finite number, is left unplaced and listed in the layout's list of unplaced nodes (the settled report)                  |
| units                                              | scene units; no hidden multiplier                                                                                                                                           |
| randomness                                         | `context.random()` is seeded; with `random: true` the element declares a seed option, draws and records the seed                                                            |
| abort, progress, errors                            | the element checks the signal before and after `place`, reports 0 and 1, and wraps a throw as `E_EXTENSION_FAILED`, source "layout" (section 2.4)                           |
| registration                                       | the snapshot layout registration of `layout.md` (`SnapshotLayoutRegistration`)                                                                                              |

**No plugin at all, where a built-in should do it.** Placing nodes at coordinates their data
already carries is the most common layout request. It is a built-in's job: the element's `fixed`
layout SHOULD take `x`, `y` and `z` attribute options (defaulting to today's `position.x`, `.y`
and `.z`) and leave a node without coordinates unplaced instead of placing it at the origin. With
that, the task is `element.setLayout("fixed", { x: "lon", y: "lat" })` and no extension. This is
proposed, not in 2.6.1, whose `fixed` layout reads only `position.x`, `.y` and `.z`; until the
release that has it, this does it, with `z` an optional attribute so a 2D dataset is not
refused:

```ts
import { defineLayout } from "@graphty/graphty-element/extend";

defineLayout({
    id: "acme-precomputed",
    options: {
        x: { type: "attribute", default: "x" },
        y: { type: "attribute", default: "y" },
        z: { type: "attribute", default: null },
    },
    place(graph, { options }) {
        const positions = new Map();
        for (const node of graph.nodes()) {
            const x = node.number(options.x);
            const y = node.number(options.y);
            if (x !== undefined && y !== undefined) positions.set(node.id, [x, y, node.number(options.z) ?? 0]);
        }
        return positions;
    },
});
```

**Ceiling.** Move to the advanced tier for a live layout (a simulation stepped frame by frame),
for writing coordinates directly into a typed array on very large graphs, for work in a worker or
on the GPU, or for weights read in bulk. A long `place` stays responsive by awaiting
`context.progress(...)` in its loop, as a whole-graph algorithm does. A live simple form (a
`tick(nodes, alpha)` function in the style of d3-force) is not proposed until a plugin needs it.

### 4.3 File format

**The first plugin.** A tab-separated edge list, read and written:

```ts
import { defineFormat } from "@graphty/graphty-element/extend";

defineFormat({
    id: "acme-tsv",
    extensions: [".tsv"],
    read(text, { warn }) {
        const [header, ...rows] = text.split(/\r?\n/).map((line) => line.split("\t"));
        const edges = rows.flatMap((cells, i) => {
            if (cells.length === 1 && cells[0] === "") return []; // a blank line
            if (cells.length !== header.length) warn(`expected ${header.length} cells, found ${cells.length}`, i + 2);
            return [Object.fromEntries(cells.map((cell, c) => [header[c], cell]))];
        });
        return { edges };
    },
    write({ edges, edgeColumns }) {
        const header = ["source", "target", ...edgeColumns];
        const lines = [header, ...edges.map((edge) => header.map((column) => String(edge[column] ?? "")))];
        return lines.map((cells) => cells.join("\t")).join("\n") + "\n";
    },
});
```

**Use it:**

```ts
await element.loadFromUrl("data/interactions.tsv"); // or loadFromFile(file), or a dropped file
```

The format is chosen by the file's extension; `{ format: "acme-tsv" }` names it explicitly.

The reader as one HTML file with no build step (the writer is added the same way):

```html
<graphty-element id="graph"></graphty-element>
<script type="module">
    import { defineFormat } from "https://cdn.jsdelivr.net/npm/@graphty/graphty-element/dist/graphty.bundle.js";

    defineFormat({
        id: "acme-tsv",
        extensions: [".tsv"],
        read(text, { warn }) {
            const [header, ...rows] = text.split(/\r?\n/).map((line) => line.split("\t"));
            const edges = rows.flatMap((cells, i) => {
                if (cells.length === 1 && cells[0] === "") return [];
                if (cells.length !== header.length)
                    warn(`expected ${header.length} cells, found ${cells.length}`, i + 2);
                return [Object.fromEntries(cells.map((cell, c) => [header[c], cell]))];
            });
            return { edges };
        },
    });
    document.getElementById("graph").loadFromUrl("data/interactions.tsv");
</script>
```

The reader does not check its header for endpoint columns: the element does (section 2.6), and a
file whose endpoints are `bait` and `prey` is refused with a message naming them; rename them in
the returned record (`{ ...row, source: row.bait, target: row.prey }`). A blank line is skipped
and every warning keeps the file's own line number, because the text is split without trimming.

`read` receives the whole input as text and returns plain records (`{ nodes?, edges?, directed? }`,
section 2.6), or a promise of them, or an async iterable of batches for a large file. Every cell is
a string when `read` returns it; the element types number columns on load (section 2.6), so a
`confidence` column of `0.93` is a number to every algorithm. A row with the wrong number of cells
is kept and reported with `warn(message, line)`, which reaches the load report with its line
number. `write` receives plain records and returns text; `edgeColumns` never includes `id`,
`source` or `target`. Either function may be omitted, making the format read-only or write-only.
For a tab-separated format (an extension `.tsv` or the media type `text/tab-separated-values`,
whose registration forbids a tab or a line break inside a field) the element refuses to export a
string cell holding one, with `E_UNSUPPORTED` naming the column and the id, instead of letting the
file silently gain a column or a row.

**Ceiling.** Move to the advanced tier for a binary format, streaming bytes in or out without
holding the whole text, a declared schema of attribute types, a format with a place for style or
hierarchy, custom loss notes, or content detection that needs bytes rather than text.

**What the element fills in.**

| Advanced-tier member | Simple-tier value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FormatDescriptor`   | `id`; `plainName` from `name`; `extensions`; `mimeTypes` from `mediaTypes`, else looked up from the extensions, else `text/plain`; `canImport` and `canExport` from whether `read` and `write` exist; `options` expanded                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| catalogue            | one entry, whether the format has a reader, a writer or both                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| the reader class     | a generated `DataSource` subclass: constructor, `getConfig`, `resolveOptions`, `sourceFetchData` = read the input (string, `File` or URL, with the element's retry and size limits) -> `read` -> records -> chunks; registered with `DataSource.register`                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| records              | plain objects; the element applies the record conventions (section 2.6) and the brand, and types number and boolean columns on load. Ids stay as the file spells them, as strings, unless `read` returns numbers on purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| direction            | `directed` in the returned records becomes `declareDirection`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| per-record problems  | `context.warn(message, line)` reaches the error aggregator and the load report                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| errors               | a throw from `read` becomes `E_PARSE_FAILED` with `details.format`, and `details.line` when the error carries `line`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| detection            | by extension; `detect(sample)` when given                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| the writer           | a generated `GraphExporter` registered with `registerFormatWriter`. Its `export` resolves the snapshot into records -- node ids and edge endpoints resolved, mixed-direction pairs folded, the element's internal columns removed, unmeasured values left out, algorithm results included as attribute columns under their export names -- calls `write`, and encodes the text as UTF-8. When the format is a spreadsheet format (an extension `.csv` or `.tsv`, or a media type `text/csv` or `text/tab-separated-values`), string cells that begin with `=`, `+`, `-`, `@`, tab or carriage return are neutralised first; number columns never are, so `-2.31` round-trips. Other text formats are written as `write` returns them |
| loss notes           | the `ExportCapabilities` table is derived from `keeps` (default: edge attributes only, which is what an edge list provably carries; no node attributes, isolated nodes, positions or style unless declared). The conformance kit checks the claim by reading, writing and reading again a file with negative numbers, a leading-zero column, a value holding a tab and an isolated node                                                                                                                                                                                                                                                                                                                                              |

### 4.4 Data source

**The first plugin.** A paged, authenticated REST API:

```ts
import { defineDataSource } from "@graphty/graphty-element/extend";

defineDataSource({
    id: "acme-api",
    hosts: ["https://api.acme.example"],
    credential: { name: "API token" },
    options: { endpoint: "https://api.acme.example/graph" },
    async *load({ options, fetch }) {
        for (let url = options.endpoint; url; ) {
            const page = await (await fetch(url)).json();
            if (!Array.isArray(page.nodes) || !Array.isArray(page.edges)) {
                throw new Error(`${url} did not return nodes and edges arrays`);
            }
            yield { nodes: page.nodes, edges: page.edges };
            url = page.next;
        }
    },
});
```

**Use it:**

```ts
await element.addDataFromSource("acme-api", { endpoint: "https://api.acme.example/graph?team=7" });
```

The simplest source -- one request, no key, no paging -- is shorter still:

```ts
import { defineDataSource } from "@graphty/graphty-element/extend";

defineDataSource({
    id: "acme-open-data",
    hosts: ["https://data.acme.example"],
    options: { genes: "TP53, MDM2" },
    load: async ({ options, fetch }) =>
        (await fetch(`https://data.acme.example/network?genes=${encodeURIComponent(options.genes)}`)).json(),
});
```

A list of identifiers (a gene list) is a text option the source splits itself, as here, which
keeps the reader's form a single box that accepts pasted text.

`load` returns the records of section 2.6 -- a node needs `id`, an edge `source` and `target`. An
API that spells them differently (`from`/`to` are read as endpoints already; `key` is not) renames
them in `load`: `nodes: page.nodes.map(({ key, ...rest }) => ({ id: key, ...rest }))`. A throw from
`load` becomes `E_PARSE_FAILED` with the message and `details.source` = the id, so the shape check
above is how a source says "this body is not what I expected"; `E_FETCH_FAILED` comes only from
the element's `fetch`. An option default that is a URL off `hosts` is refused when the source is
defined, so `hosts` and the endpoint cannot drift apart. `progress(done, total)` takes any unit: the element shows the
ratio, or a count without a total.

The data source point was decided on 2026-09-28 and has no built contract yet, so the simple
form above is the first form of its contract, and every advanced member (`candidates.md` section 1,
"Shape if promoted") is an OPTIONAL member of the same definition object. A simple source grows
into an advanced one by adding members, never by being rewritten into a class.

**What the element fills in.**

- **The descriptor.** A data source is its own catalogue kind (`session.catalog.sources()`), not a
  file format, so it has no invented extension or media type and does not take part in file
  detection.
- **The fetch it hands over.** A URL on `hosts` is fetched without a prompt: the embedder chose
  the source when it installed it, so the reader is never asked about the embedder's own API. A
  URL off `hosts` -- from an option the reader edited -- is fetched only after the reader confirms
  its origin, or when the embedder allowed it with `element.allowSourceHosts(id, origins)`
  (proposed); with no reader to ask (a headless or scripted load) it is refused. The fetch
  attaches the credential as `Authorization: Bearer <secret>` (or the declared header and scheme)
  to a URL on `hosts` ONLY -- never to a reader-confirmed or `allowSourceHosts` origin, and never
  across a redirect to another origin, so a reader-edited endpoint cannot collect the embedder's
  token; it passes the URL through unchanged;
  retries with backoff; applies the timeout, the rate limit and the abort signal; turns a failed
  response into `E_FETCH_FAILED` with the URL and status; and stops a runaway pager, refusing the
  same URL twice in one load and more than `maxRequests` (default 1000) requests.
- **The credential.** Asked for in a masked field -- or supplied in code by an embedder that
  already holds one, with `element.setSourceCredential(id, secret)` (proposed) -- kept by the
  element, never logged, never published in the catalogue, never saved in a configuration, never
  visible to `load`.
- **Ingestion.** The same record conventions, chunking, per-record validation, error aggregation
  and progress events as a file load.
- **Provenance.** The source id and version, the options with the credential removed, the time of
  the query and the page count, recorded in the load report.
- **Cancellation.** The signal aborts on a new load, on removal of the element and on a cancel
  call; `load` needs to do nothing for it because the handed-over `fetch` honours it.
- **Errors.** A throw from `load` that is not a `GraphtyError` becomes `E_PARSE_FAILED`,
  `details.source` = the id. `E_FETCH_FAILED` is raised only by the handed-over `fetch`.
- **Reach.** `element.addDataFromSource("acme-api", { endpoint })`, the element attribute, and the
  catalogue for an import dialog's service tab -- the routes a built-in source uses.

**Ceiling, which is additive here.** Refresh modes (manual, interval, stream), a pinned service
release, retention windows and removal records, the found, not-found and ambiguous identifier
report, handing a response body to a registered reader by media type, lazy expansion
(`expand({ node, fetch, signal })`, which replaces the `layoutBehavior.fetchNodes` callbacks) and
the publish direction are members added to the same object. No columnar (typed-array) batch is
planned for a source: a source whose API returns a bulk file hands the body to a registered reader
by media type, and the reader's advanced tier takes columns.

### 4.5 Palette

**The first plugin.**

```ts
import { definePalette } from "@graphty/graphty-element/extend";

definePalette({
    id: "acme-brand",
    kind: "categorical",
    colors: ["#0B1D51", "#1B7F79", "#F2A65A", "#E07A1F", "#7A3E9D"],
});
definePalette({ id: "acme-brand-ramp", kind: "sequential", colors: ["#E8F1FA", "#1B7F79", "#0B1D51"] });
```

**Use it** -- make them the colours every binding uses when it names none:

```ts
element.setDefaultPalettes({ categorical: "acme-brand", sequential: "acme-brand-ramp" });
```

Call both before loading data: a default is resolved when a style layer is written, so a layer
written before the call keeps the palette it was written with.

`setDefaultPalettes` (proposed; also on `session.styles`) has one slot per palette kind:
`categorical`, `sequential` and `diverging`. Colours are any CSS colour except `var(...)`, which is
not resolved: read a design token first with
`getComputedStyle(document.documentElement).getPropertyValue("--brand-navy")`. A categorical
palette has one colour per group and the element never wraps: when a clustering yields more groups
than colours, the extra groups keep the base colour and the element reports `E_CAP_EXCEEDED`, so
give a brand palette as many colours as the clusterings it will colour, or set `overflow` on the
binding: `{ by: "results.clusters.group", palette: "acme-brand", overflow: "other" }` paints the
largest groups in the brand colours and the rest one grey (`"extend"` gives every group a colour).

**What the element fills in.** `plainName` from the id (or `name`); `capacity`, which it already
derives; `colorblindSafe` as `[]` (no claim) unless the definition makes one; normalisation of
every colour to six-digit hex. `definePalette` builds a `PaletteRegistration` and calls
`registerPalette`, so there is one validation path and one registry.

**Two changes the palette point needs besides the function.** (1) The published parameter type of
`registerPalette` narrows from `PaletteDescriptor` to `PaletteRegistration`, which `palette.d.ts`
already declares, so the advanced form stops requiring `capacity` and `colorblindSafe` too. (2)
The element-scoped default above, resolved when a layer is WRITTEN -- a binding with no palette
records the resolved id -- so saved documents always name a concrete palette and keep their
meaning, which is the reason the guide gives today for keeping the defaults fixed (README section
12, item 35).

**Ceiling.** There is almost none: a description and a colour-vision claim are members of the
definition. The descriptor form remains for authors who build palettes as data.

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
    motion: (t, frame, { options }) => frame.orbit(frame.azimuth + (t / 1000 / options.secondsPerTurn) * 2 * Math.PI),
});

// Looking down on the graph from 45 degrees round and 35 degrees up.
defineCameraView({ id: "acme-corner", view: (frame) => frame.orbit(Math.PI / 4, (35 * Math.PI) / 180) });
```

**Use it** (the element is typed: `document.querySelector("graphty-element")` needs no cast,
because the element class implements `SimpleTierElementControls`):

```ts
document.querySelector("graphty-element")?.playCameraMotion("acme-slow-orbit", { secondsPerTurn: 90 });
```

A view is a still framing; a motion is a view with time as one more input. Both stay pure: a
motion depends on `t`, the frame and its options, never on a clock, so the element can sample it
at exact times for a screenshot or a recorded video. `frame.orbit(azimuth, elevation?)` places the
camera on the sphere at which the graph fills the view, turned round the scene's up axis, so an
author never picks axes or works out field-of-view geometry. When a motion resumes after the reader
moved the camera, `t` starts again at 0 and the frame is measured afresh, so a motion written from
`frame.azimuth` carries on from where the reader left the camera instead of jumping back. While
the motion plays, `frame.azimuth`, `frame.elevation` and `frame.current` stay as they were when it
started or resumed; a re-measure when the layout settles refreshes only the centre, the size, the
radius and `fitDistance`, so an angle added to `frame.azimuth` is never counted twice. An
option the motion does not declare rejects `playCameraMotion` at once with `E_UNKNOWN_OPTION`; a
motion whose `modes` exclude the current drawing mode (the default is 3D only) rejects with
`E_UNSUPPORTED`.

**What the element fills in.**

- **The frame.** `ViewFrame` gives the centre, the size, the radius, `fitDistance` (the distance
  at which the box fills the view), the scene's `up` direction, the current camera's `azimuth`
  and `elevation`, and `orbit(azimuth, elevation?)`, so an author never works out field-of-view
  geometry or the axis convention.
- **The descriptor.** `plainName` from the id, `description` "", `modes` default `["3d"]`, the
  expanded options. `defineCameraView` calls `registerCameraView` with a `compute` that builds the
  frame from `CameraViewInput` and calls `view`.
- **The motion loop.** `playCameraMotion(id)` runs the motion on the element's own frame loop:
  it pauses on any input the element owns (pointer, wheel, keyboard, touch, XR) and resumes three
  seconds after the input ends, from the camera's new position (`t` restarts at 0); it stops on disconnection, a dataset change or a change of drawing
  mode; it respects `prefers-reduced-motion` (it does not start, resolves at once and writes one
  console line saying why); it re-measures the frame when
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(record),
        }),
});
```

**Use it:** nothing more -- the destination is attached when it is defined. Context the page owns
(a session or user id) comes from the author's own variables:
`body: JSON.stringify({ ...record, session: mySessionId })`. The record's `error` is plain data
(`{ name, message, stack }`), so `JSON.stringify` keeps it. A response that is not `ok` (an HTTP 500) counts as a failed send and is retried, exactly as a rejected fetch is.

**What the element fills in.**

- **Delivery.** A destination defined this way is attached immediately (unless `attach: false`)
  and receives records at its own `level` whether or not the logger's global `enabled` flag is
  set; the global flag and level then govern the console only. So the author never meets the
  two gates, and turning on telemetry does not flood the developer console. The rule that a
  destination's level can only narrow the global level stays in force for configurations read
  back from storage or a URL, which is its security reason (README section 12, item 34).
- **The record.** `PlainLogRecord`: the time, the level as a word, the category as one dotted
  string, the message, and `error` as `{ name, message, stack }`, after the element's redaction
  (`logging.md` section 7). A destination is page-wide: records name the subsystem in `category`,
  not the element instance.
- **Asynchronous writes.** When `write` returns a promise, the element queues records, sends
  them in order, treats a rejection or a resolved `Response` whose `ok` is false as a failure,
  reports it on the console (never through the logger, which would recurse), retries three times
  after 1, 2 and 4 seconds (never a 4xx other than 408 or 429), and gives up. The queue holds at
  most 1000 records; past that the oldest is dropped and the next send starts with one record
  saying how many were, so an error storm against a slow endpoint cannot grow memory without
  limit. `time` serialises as an ISO string. `flush` awaits the queue;
  `dispose` drains it with a timeout; every destination is flushed on `pagehide`. This is the
  batching the built-in `remote` destination already has, now given to everyone -- in both tiers:
  the advanced `Sink.write` may return a promise too (`logging.md` section 4), and that replaces
  the rule that a network destination must buffer in `write` and send in `flush`.
- **The registration.** A `LogSinkRegistration` with `descriptor = { id, plainName: name,
description, options: [] }` and a `create` that returns the wrapped `Sink`, registered with
  `registerLogSink`, so a stored configuration can also turn it on by id (`{ use: "acme-telemetry" }`).
- **Detaching.** `defineLogDestination` returns a function that detaches it.

**Testing.** `write` is a plain function: call it in a unit test with the conformance kit's
`logRecord({ level: "error", message: "..." })` and a stubbed `fetch`.

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

5. The legacy algorithm address of a simple algorithm is `<id>:<id>`, so a graduated class keeps
   it by declaring `static namespace` equal to its id, not its vendor prefix.

**Same id means same method.** Graduation keeps the id when the method is the same and only the
implementation changes. A different method (label propagation replaced by Louvain) is a new
extension with a new id, because documents that saved the old id meant the old method; the
`version` records output changes within one method.

**Same numbers.** The catalogue descriptor of a simple extension publishes the input policy the
element generated for it -- orientation, `simplify: "none"` (every parallel edge its own edge),
and typed columns without string coercion -- and a graduated version MUST read its input the same
way, or the same id gives different values. The conformance kit's
`checkSameResults(id, AdvancedClass)` runs both over the kit's graphs and lists every element
whose value differs, before the simple form is deleted. A method whose result depends on visit
order or tie-breaking (label propagation, a greedy colouring) visits nodes in the view's order in
the simple tier, so its graduated version MUST do the same: sort the rows with `compareNodeIds`
over their ids, and break ties by that order.

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
3. **`communityFields` and `communityFieldSpecs`**, the community builders for the `groups` form,
   declared in `algorithm.d.ts` beside the metric builders, so an advanced community algorithm
   does not hand-write five fields and three exclusions either. They ship before or with
   `defineAlgorithm`, never after it.
4. **The snapshot layout contract, `input.column`, `input.edgeId` and `registerFormatWriter`**,
   all decided on 2026-09-28. The simple tier is built on them and cannot ship before them.
5. **Camera motions** as a declared kind of camera view (README section 12, item 36).
6. **`E_EXTENSION_FAILED`**, a published code for a failure in an extension's own code, used by
   both tiers wherever they wrapped a plugin's throw as `E_INTERNAL` (README section 12, item 37).
7. **The up-front check of "attribute" options**, in `input.column`'s resolution at run start, and
   the all-unmeasured and long-task warnings in the run record (section 2.4 item 7).
8. **A promise-returning `Sink.write`**, with element-owned queueing, retry and flush (`logging.md`
   section 4).
9. **`progress` that yields**: the whole-graph and layout contexts' `progress` is the advanced
   `report` plus `yieldNow`, so it adds nothing the advanced tier lacks.
10. **Typing of simple-tier records on load** (section 2.6), which an advanced reader asks for by
    returning records through the same ingestion option, with the same `columns` override.
11. **A cost model that sees the options**: `costUnits(n, m, options)` on the advanced tier (README
    open decision 16). The simple tier's `passes` multiplies the estimate by an option's value;
    without this, a graduated algorithm's estimate is worse than the simple one's.
12. **`compareNodeIds`**, the view's order, published for the advanced tier (section 5).

## 7. Open decisions

The owner decided to HAVE a simple tier. The names and shapes above are recommendations recorded
in `README.md` section 12:

- item 33: the names and shapes of the simple-tier exports;
- item 34: delivery to a log destination attached in code, whatever the global `enabled` flag;
- item 35: element-scoped default palettes, resolved when a layer is written;
- item 36: camera motions, the element's `playCameraMotion` and `stopCameraMotion`, and the
  reserved motion id "orbit";
- item 37: the `E_EXTENSION_FAILED` error code;
- item 38: the up-front check of "attribute" options, which changes what a 2.6.1 run with a
  misspelt attribute does (it now refuses instead of computing zeros).
