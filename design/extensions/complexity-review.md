# Complexity review of the extension points

Status: review of graphty-element 2.6.1, its shipped guides (`graphty-element/docs/guide/extending/`)
and the contracts in this directory, 2026-09-28. Informative. The budget this review measures
against is normative in `README.md` section 8.1; the remedy is `simple-tier.md`.

## What was measured

For each extension point, the most common real first plugin (the task table in `README.md`
section 8.1 item 5) was written three ways:

1. **Today**: against the contract as specified, using only what graphty-element 2.6.1 publishes
   or the owner has decided.
2. **Simple tier**: against `simple.d.ts`, with the example type-checked by `check-examples.mjs`.
3. **Prior art**: the same task in NetworkX, graphology, Cytoscape.js, d3, Gephi and other
   comparable systems, from their documentation.

"Lines" are author lines: non-blank, non-comment, excluding `import` lines. "Internal concepts"
are things the author must learn that belong to graphty-element's implementation rather than to
the task (`README.md` section 8.1 item 4 lists them); "domain concepts" are the task's own
(a formula, a file layout, a colour, an endpoint).

## Summary

"Simple tier, end to end" is the current `simple-tier.md` example plus its "use it" lines, with
the input checks the task needs (`README.md` section 8.1 item 1); the first simple-tier draft's
count, which left both out, is in brackets.

| Point       | Task                                          | Today: lines                                                           | Today: internal / domain concepts | Simple tier, end to end: lines                                                                        | Simple tier: internal concepts | Prior art: lines           |
| ----------- | --------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------- |
| Algorithm   | confidence-weighted degree and its edge share | 111                                                                    | 29 / 7                            | 20 (14)                                                                                               | 0                              | 3 to 15 (Gephi about 120)  |
| Layout      | rows by a tier attribute; preset coordinates  | 94 (42 + 48)                                                           | 17 / 4                            | 19 (16); 19 for rows by a category; 17 for preset coordinates, 1 once `fixed` takes attribute options | 0                              | 1 to 10 (Gephi 150 to 200) |
| File format | tab-separated edge list, read and write       | 114                                                                    | 26 / 5                            | 19 (18, with no check of a malformed row)                                                             | 0                              | 4 to 16 (Gephi about 180)  |
| Data source | paged REST API with a bearer token            | 75, and still no cancellation, retries, host check or credential store | 16 / 4                            | 17 (14, with no check of the response body)                                                           | 0                              | 8 to 40                    |
| Palette     | brand categorical and sequential colours      | 17 (13 without types)                                                  | 9 / 5                             | 3, with the default-palette call (2)                                                                  | 0                              | 1 to 4                     |
| Camera      | slow orbit; a corner view                     | 34, outside the extension point (the orbit cannot be an extension)     | 11 / 4                            | 1 for the built-in orbit; 5 for a custom motion (8) and 1 for the view (7), plus 1 to play            | 0                              | 1 to 9                     |
| Logging     | errors to a telemetry endpoint                | 58 (20 for a shorter form that breaks the spec)                        | 17 / 4                            | 10 (9, which lost the error and ignored an HTTP 500)                                                  | 0                              | 2 to 10                    |

Every point except palettes cost five to ten times what the same task costs in the libraries a
plugin author is coming from, and the excess was almost entirely internal concepts. The simple
tier brings every task inside the budget of about 15 lines with no internal concept, without
removing anything from the advanced tier.

## Algorithm

**Today, 111 lines.** Six of them are the author's arithmetic. The rest:

- One idea becomes two classes. A result has one shape, and a node score and an edge score are
  different shapes, so the task needs two `DeclaredAlgorithm` subclasses with two descriptors, and
  the shared pass is computed twice.
- Fields are declared twice in two types (`FieldDescriptor` in the descriptor, `ResultFieldSpec` in
  the output), and the shape is repeated in both. The shape contract makes the author declare
  nine derived fields (rank, percentile, min, max, median, mean, measured, normalization,
  tiedAtMin) and then forbids publishing them. There was no field builder for an edge metric, so
  those ten fields were written by hand.
- Reading an edge attribute takes `input.column`, which returns graph-format's ten-member column
  union, and an "attribute" option cannot say whether it names a node or an edge attribute.
- Rows against ids, orientation, the parallel-edge merge policy, cost classes in class-specific
  units, cooperative yielding, caveat minimums, the measured-only rule and which statics take
  `override` were all required knowledge; most are prose rules the compiler does not check.
- Under 2.6.1 the task cannot be written conformingly at all: attribute columns and edge ids
  reach a plugin only through the decided but unbuilt accessors.

**Guide.** `custom-algorithms.md` opens with a 115-line example that reads input through the
deprecated `algorithmGraph()`, never shows reading an attribute, and computes "nodes within N
hops" as the neighbour count times the hop count, which is wrong arithmetic a reader will copy.

**Prior art.** NetworkX: `dict(G.degree(weight="confidence"))`, one line, and the edge score a
two-line comprehension
(https://networkx.org/documentation/stable/reference/classes/generated/networkx.Graph.degree.html).
graphology: `weightedDegree(graph, node, "confidence")` and `forEachEdge`, about 6 to 8 lines
(https://graphology.github.io/standard-library/metrics.html). Cytoscape.js: one registration call
and about 11 lines (https://js.cytoscape.org/#extensions/api). Gephi's statistics plugin, the
closest analogue with a catalogue and a results table, costs about 120 lines but never exposes
storage (https://github.com/gephi/gephi-plugins-bootcamp). NetworkX keeps a simple function as
the public face and an optional backend for speed, the tiering adopted here.

**Simple tier, 20 lines end to end** (`simple-tier.md` section 4.1): two `defineAlgorithm` calls,
each with one function over the graph view, the edge score reading the node score's result, and
the two `run` calls that colour the graph.

## Layout

**Today, 94 lines for two layouts** whose placement logic is 7 and 5 lines:

- A ten-member descriptor with no defaults; the id written three times (`static type`,
  `descriptor.id`, `descriptor.engine`) and the dimension twice, with mismatches accepted
  silently.
- Options declared three times: the descriptor, a TypeScript interface and constructor defaults,
  plus a constructor-typing trap the spec and the guide solve with two different incantations.
- A hidden multiply by 100 (`scalingFactor`) that a preset-coordinates layout must know to undo
  and must declare, or a consumer passing it is refused.
- The view dimension arrives as an undeclared `dim` key; positions are an object keyed by id, so
  `1001` and `"1001"` collide.
- The decided snapshot contract is the right advanced tier but makes these tasks harder: rows,
  interleaved typed arrays, mask bit arithmetic, fixed-row copying.
- The built-in `fixed` layout, the natural home of "place nodes at their data's coordinates",
  hard-codes `position.x/y/z`, writes meshes directly and puts a node with no position at the
  origin, so the most common layout request needs a plugin at all.

**Guide.** `custom-layouts.md` opens with a 75-line grid layout for a one-line formula; it types
its descriptor as `LayoutDescriptor` while omitting that type's required members, reads
`e.srcNode` (which the contract forbids) and suggests a session call an engine is never given.
There is no attribute-driven example and none for preset coordinates.

**Prior art.** NetworkX `multipartite_layout(G, subset_key="tier")`, one line, and preset
coordinates in one or two
(https://networkx.org/documentation/stable/reference/generated/networkx.drawing.layout.multipartite_layout.html).
graphology: a layout is a function assigning `x` and `y`, about 6 lines, and preset coordinates
need none (https://graphology.github.io/standard-library/layout.html). Cytoscape.js `preset` takes
a positions function, 1 to 3 lines, and a registered layout is a `run()` that calls
`layoutPositions`, which supplies locking, animation and events
(https://js.cytoscape.org/#layouts/preset). d3-force: tiers are one `forceY`
(https://d3js.org/d3-force/position). Gephi's `Layout` and `LayoutBuilder` pair costs 150 to 200
lines (https://gephi.org/gephi/0.9.2/apidocs/org/gephi/layout/spi/Layout.html); today's contract
sat closer to Gephi than to Cytoscape.js.

**Simple tier, 18 and about 8 lines end to end** (`simple-tier.md` section 4.2): `defineLayout` with a `place`
function returning a map from id to position; the preset task drops to a built-in call once
`fixed` takes attribute options.

## File format

**Today, 114 lines**, of which about 15 are splitting and joining tab-separated text:

- The reader and the writer have unrelated shapes: an abstract class with statics, a constructor
  forwarding `errorLimit` and `chunkSize`, a `getConfig` that returns what it was given, a
  mandatory `resolveOptions` call and an async generator on one side; a graph-io object literal
  over a compressed snapshot on the other.
- The writer is handed the element's storage: typed arrays of node indices, logical edges against
  arcs, role columns and expanded mixed-direction pairs.
- Correctness rules the element could apply fall on the author: skip internal columns, write an
  unmeasured value as absent, neutralise spreadsheet formulas by column type, fill a 16-field
  capability table truthfully and fold mixed-direction pairs, or fail conformance.
- Two descriptors per format that must agree on everything but two flags; two helper values that
  come only from `@graphty/graph-io`, which brings a second copy of graph-format.
- A tab-separated plugin cannot be reached by content detection, because the built-in CSV sniffer
  claims every tab-separated file first.

**Guide.** `custom-data-sources.md` covers the reader only, with a 100-line first example. It says
a writer "will be carried by the same class", which contradicts the owner's decision for
`registerFormatWriter`, so a reader of the guide cannot write the writer half at all.

**Prior art.** NetworkX `read_edgelist` and `write_edgelist`, and a hand-written reader of about 8
lines
(https://networkx.org/documentation/stable/reference/readwrite/generated/networkx.readwrite.edgelist.read_edgelist.html).
graphology: `parse` and `write` per format, about 10 and 6 lines; even its 638-line GEXF writer
sees only ids and attribute objects (https://graphology.github.io/standard-library/gexf.html).
d3-dsv: `tsvParse` and `tsvFormat`, 2 to 3 lines each way (https://d3js.org/d3-dsv). Gephi, the
only prior art with a registered, detected format, costs about 180 lines but gives the author
node and edge drafts by id, never storage
(https://github.com/gephi/gephi/tree/master/modules/ImportPlugin). Every system gives a reader
text and takes ids and attributes, and gives a writer ids and attributes and takes text.

**Simple tier, 18 lines end to end** (`simple-tier.md` section 4.3): `defineFormat` with
`read(text)`, which warns about a malformed row, and `write(graph)` over plain records, and the
load call.

## Data source

**Today, 75 lines, and still incomplete.** There was no data-source point in the code, so a REST
loader had to be disguised as a file-format reader:

- Registration refuses a descriptor without a file extension and a media type, so the author
  invents both, and the source then shows up among file formats and in file detection.
- The inherited network helper takes only a URL, so an API with a token, pagination or a POST
  body calls `fetch` directly and loses the inherited retries, timeout and error mapping.
- No cancellation, no host check or confirmation, no credential store (the token is an ordinary
  option the catalogue publishes), no provenance.
- The spec side described only the advanced surface -- hosts, refresh modes, retention, releases,
  identifier reports, publish -- about 12 concepts before a first page loads.

**Guide.** No service guide exists; the only example is a 100-line file reader, and the extension
index still says six points.

**Prior art.** Apollo Server `RESTDataSource`, about 15 lines, with the base class supplying
caching, deduplication and errors (https://www.apollographql.com/docs/apollo-server/data/fetching-rest).
Grafana's data-source plugin, 30 to 40 lines, with the host owning credentials, proxying and
cancellation (https://grafana.com/developers/plugin-tools/tutorials/build-a-data-source-plugin).
graphology, Cytoscape.js, NetworkX and d3: a fetch loop and an add call, 8 to 12 lines, with no
registration.

**Simple tier, 17 lines end to end** (`simple-tier.md` section 4.4): `defineDataSource` with `load`, where the
element's own `fetch` carries the host check, the credential, retries and cancellation.

## Palette

**Today, 17 lines, the lightest point.** No storage, scheduling or cost concepts. The costs:

- The published parameter type requires `capacity` and `colorblindSafe`, which the run time
  derives and defaults, and a wrong `capacity` is refused.
- A brand needs two registrations (categorical and sequential), and every binding must name the
  palette, because the element's default palettes cannot be changed.
- A short brand palette meets `E_CAP_EXCEEDED` first on a clustering, and `./session` does not
  publish that error, so groups are silently left unpainted.

**Guide.** `custom-palettes.md` imports the descriptor type, forcing the bookkeeping, and its
first example claims colour-vision safety for an invented palette.

**Prior art.** Vega `vega.scheme("basic", [...])`, one line (https://vega.github.io/vega/docs/schemes/).
matplotlib `ListedColormap` and `LinearSegmentedColormap.from_list`, about 4 lines for both
(https://matplotlib.org/stable/users/explain/colors/colormap-manipulation.html). d3
`scaleOrdinal(colors)`, one line (https://github.com/d3/d3-scale). ECharts `registerTheme` makes
brand colours the default for a chart, the missing hook (https://echarts.apache.org/en/api.html#echarts.registerTheme;
from memory, not re-checked).

**Simple tier, 3 lines** (`simple-tier.md` section 4.5): two palettes and the element-scoped
default that makes them the brand's colours everywhere.

## Camera

**Today, 34 lines, outside the extension point.** A camera extension is a pure, clock-free view,
and controllers are internal, so the most common request -- a turntable orbit -- cannot be an
extension at all. The workaround declares the changing angle as a ranged option and drives it from
a frame loop the consumer writes, with its own timing, teardown, input handling and 2D errors;
each call re-measures the bounds over every node and fires the camera event 60 times a second;
it cannot resume after the user lets go, and `captureAnimation` cannot record it. The descriptor
requires `description: ""` and `options: []` even when empty.

**Guide.** `custom-cameras.md` never mentions movement; it states `viewport` in device pixels and
a meaning for an empty box, both of which the spec contradicts.

**Prior art.** three.js `controls.autoRotate = true`, two lines
(https://threejs.org/docs/#examples/en/controls/OrbitControls.autoRotate). Babylon.js, the
element's own renderer, `camera.useAutoRotationBehavior = true`, one line, with pause and resume
built in (https://doc.babylonjs.com/features/featuresDeepDive/behaviors/cameraBehaviors). Google
model-viewer, an `auto-rotate` attribute (https://modelviewer.dev/docs/#entrydocs-stagingandcameras-attributes-autoRotate).
3d-force-graph, the closest peer, does it in 9 lines of user code with no registration
(https://github.com/vasturiano/3d-force-graph/blob/master/example/camera-auto-orbit/index.html).

**Simple tier** (`simple-tier.md` section 4.6): the built-in orbit is one call; a custom motion is
5 lines and a still view 1, through `frame.orbit`, plus the call that plays it.

## Logging

**Today, 58 lines.** The destination code is short; the cost is in rules nobody states:

- The logger ships disabled. A destination that is registered and attached receives nothing,
  not even errors, until something calls `configure({ enabled: true })`, and no document says so.
- Turning logging on also turns on the console at the global level, which also caps every
  destination, so sending errors to telemetry means choosing what developers see in devtools.
- The spec required a network destination to buffer in `write` and send in `flush`, which forces
  a timer, a `pagehide` listener, `flush` and `dispose` -- about 25 of the 58 lines -- and the
  element never flushes on page unload itself. The built-in `remote` destination gets batching and
  retry from the element; a third party gets none of it.
- Registration and attachment are two steps across two entry points, and a descriptor is required
  even with no options.

**Guide.** `custom-log-destinations.md`'s shortest example receives nothing on the shipped
defaults; its record reference gives `timestamp: number` for a `Date`; its named example shares
one buffer across every `create()` call; and the extension index says a registered destination
"starts receiving records immediately", which is false.

**Prior art.** Python `logging.handlers.HTTPHandler`, two lines, and a custom handler about 5
(https://docs.python.org/3/library/logging.handlers.html#httphandler). LogTape: a sink is one
function, with an adapter for async sinks (https://logtape.org/manual/sinks). VS Code's
`TelemetrySender`, about 8 lines, with the host owning enablement and redaction
(https://code.visualstudio.com/api/references/vscode-api#TelemetrySender).

**Simple tier, 10 lines** (`simple-tier.md` section 4.7): `defineLogDestination` with a `write`
that may return a promise.

## The first blind-author round

Twelve blind authors -- the four plugin-author personas, and three workflow personas (an expert
analyst, a business analyst and a bioinformatics researcher) -- each wrote a plugin for a task of
their own from `simple-tier.md` and `simple.d.ts` alone, and type-checked it. All twelve succeeded
on the simple tier, and the graph library author graduated one plugin to the advanced tier.

| Persona                   | Point       | Task                                            | Author lines | Worst stuck point                                             |
| ------------------------- | ----------- | ----------------------------------------------- | ------------ | ------------------------------------------------------------- |
| data scientist            | algorithm   | confidence-weighted degree and edge share       | 15           | declarations needed lib ES2024 and a path to graph-format     |
| data scientist            | layout      | tiers by a number; preset coordinates           | 37 (two)     | not released; unsure whether the built-in `fixed` does it     |
| front-end developer       | palette     | brand categorical and sequential                | 12           | making the palette the default was prose, in no declaration   |
| front-end developer       | camera      | slow orbit                                      | 15           | not released; the camera would jump back after a drag         |
| front-end developer       | logging     | errors to telemetry                             | 17           | declarations needed lib ES2024; an `Error` serialises to {}   |
| domain researcher         | file format | tab-separated edge list, read and write         | 26           | not released; nothing showed how to open the file             |
| domain researcher         | algorithm   | a score from a paper, over edge confidence      | 19           | nothing showed how to run it and see the colour               |
| graph library author      | algorithm   | community detection at 100,000 nodes (advanced) | 28, then 154 | no way to yield in the simple tier; community fields by hand  |
| graph library author      | data source | a paged REST API                                | 23           | not released; record conventions only in a comment            |
| expert analyst            | algorithm   | personalised PageRank                           | 46           | `edge.source` in an undirected view gave silently wrong ranks |
| business analyst          | layout      | rows by a category column                       | 21           | not released; declarations needed lib ES2024                  |
| bioinformatics researcher | data source | a STRING-style interaction service              | 56           | not released; record conventions only in an advanced document |

What they met, by kind:

1. **Nothing runs yet.** Seven of the twelve stopped, or would have in real life, at "proposed:
   nothing here is built in 2.6.1". This is the release state, not a document defect; the guide
   rule is now that a page leads with a simple-tier example only in the release that ships it.
2. **Setup that is not the task.** Five authors needed `lib` ES2024 and a path mapping to
   graph-format, a package they had never heard of, because one import pulled the advanced
   declarations into the simple ones. `simple.d.ts` is now self-contained and `extend.d.ts` covers
   the whole entry point with one path.
3. **No way to see the result.** Seven authors registered an extension and could not find how to
   run it, apply it, open a file with it or make it the default. The worst case was the researcher
   whose whole goal was a coloured network. Every example now ends with its "use it" lines, and a
   one-page example goes from an empty page to a coloured graph.
4. **Silent wrong results.** The examples taught `?? 0` (a misspelt attribute gives zero
   everywhere, then NaN, then nothing published); `edge.source` in an undirected view is not the
   node an edge was reached from; a text reader's numbers stayed strings, so a writer would have
   turned `-2.31` into text; `JSON.stringify` of an `Error` is `{}`; a fetch that returns HTTP 500
   resolves, so "retry" never ran; an undeclared `direction` made `outEdges()` return every edge.
   Each is now caught by the element: attribute options are checked before a run, directed
   accessors throw unless declared, `edge.other(node)` exists, columns are typed on load, the
   record's error is plain data, and a response that is not `ok` counts as a failure.
5. **No path for heavy work.** Two authors with iterative methods had no way to yield, and one
   improvised `await Promise.resolve()`, which lets no frame draw. `progress()` now returns a
   promise that yields.
6. **Blame in the wrong place.** A plugin's own exception was reported as `E_INTERNAL`, "a bug in
   graphty-element". It is now `E_EXTENSION_FAILED`, naming the plugin and the function.

## The second blind-author round

The same twelve authors wrote a plugin again from the revised `simple-tier.md` and `simple.d.ts`.
**Every run is "type-checked only"**: no `define*` function exists at run time in 2.6.1, so no
author ran a plugin, read a real error message or saw a result. The error messages of
`simple-tier.md` section 2.4, the attribute check, the long-task warning, the unplaced-node list
and the colour on first run are therefore still untested. The playground (`simple-tier.md`
section 3 item 6) exists so the next round can run them.

A run over 20 author lines is a FAILURE of the budget even though the plugin compiled (`README.md`
section 8.1 item 6). "Named task" marks a run of a first-plugin task the budget is defined on;
the other runs are the persona's own, harder task, where the count is informative and the cause
still gets a fix.

| Persona                   | Point       | Task                                      | Named task | Author lines           | Result          | Cause of the excess, and the fix                                                                                                                                                                          |
| ------------------------- | ----------- | ----------------------------------------- | ---------- | ---------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| data scientist            | algorithm   | confidence-weighted degree and edge share | yes        | 25                     | FAIL (over)     | the reference sat at exactly 20, so writing the node score as a loop instead of `reduce` cost 5 lines; the order-and-name contract of the two runs is now stated next to the example                      |
| data scientist            | layout      | tiers by a number; preset coordinates     | yes        | 38 for two layouts     | pass per layout | the optional `z` needed a guard; `default: null` now makes an attribute optional. The preset task becomes one line once the built-in `fixed` takes attribute options                                      |
| front-end developer       | palette     | brand categorical and sequential          | yes        | 20                     | pass            | --                                                                                                                                                                                                        |
| front-end developer       | camera      | slow orbit                                | yes        | 6                      | pass            | the frame's `azimuth` during a re-measure was unstated; it is now captured once per start or resume                                                                                                       |
| front-end developer       | logging     | errors to telemetry                       | yes        | 10                     | pass            | retry count, backoff and queue cap were unstated; now specified                                                                                                                                           |
| domain researcher         | file format | tab-separated edge list, read and write   | yes        | 20                     | pass            | the reference reader refused `src`/`dst` headers, shifted line numbers on a leading blank line and did not escape a tab; the element now checks endpoints and refuses a tab in a `.tsv` cell              |
| domain researcher         | algorithm   | Barrat weighted clustering                | no         | 27                     | FAIL (over)     | no way to get w_ij between two nodes: the author built a neighbour-to-weight map and handled parallel edges and self-loops by hand. `node.weightTo(other, path)` now does it                              |
| graph library author      | algorithm   | label propagation at 100,000 nodes        | no         | 43 simple, 81 advanced | informative     | the task starts at the advanced tier (the guide says so); graduation parity needed the view's order, now `compareNodeIds`, and a cost model that sees options (section 6 of `simple-tier.md`)             |
| graph library author      | data source | a paged REST API                          | yes        | 18                     | pass            | two passages disagreed on the error code of a throw from `load`; now one rule                                                                                                                             |
| expert analyst            | algorithm   | personalised PageRank                     | no         | 51                     | FAIL (over)     | an optional edge weight was refused on every unweighted graph; `default: null` fixes that. The rest is a whole-graph iterative method, beyond a first plugin                                              |
| business analyst          | layout      | rows by a category column                 | yes (now)  | 23                     | FAIL (over)     | the guide showed only the numeric version and described the category one in prose that turned a missing value into the row "undefined"; the category layout is now a named task with an 18-line reference |
| bioinformatics researcher | data source | a STRING-style interaction service        | no         | 32                     | FAIL (over)     | mostly the service's own row format (a domain cost); the guide had no single-request example and no answer on labels or URL encoding, now added                                                           |

Named-task results: seven of nine passed on line count, two failed. Five runs of the twelve were
over 20 lines. Every blocker reported was the release state ("defineX is not a function").

What they met, beyond the release state:

1. **An optional attribute could not be said.** The up-front attribute check refused an edge
   weight on every unweighted graph and a `z` coordinate on every 2D dataset; the workarounds were
   a guard or a silent `?? 1`. Now `default: null` means "not bound".
2. **The weight between two nodes had to be built by hand.** Now `edgesTo` and `weightTo`.
3. **The spec contradicted itself** on what a data source's throw becomes. Now one rule.
4. **Traps the element could absorb**: a numeric-looking column with leading zeros would have
   lost them (now the JSON number grammar decides), a reader-edited endpoint would have received
   the embedder's token (now the credential goes to `hosts` only), a map keyed by `String(id)`
   over numeric ids would have placed nothing (now refused with the key and the id kind), and a
   camera orbit could have jumped on a re-measure (now the frame's angles are fixed per start).
5. **Finding the start.** No file said "start here"; the README and `simple-tier.md` now do, and
   every example is shown to run in the one-page example with no build step.

## Why the specifications missed it

The complexity did not arrive in one step. It accumulated through a review process that measured
everything except what a first plugin costs:

1. **Every review asked the parity question.** "Can a plugin do everything a built-in does?" was
   checked point by point, three review rounds deep. Every finding it produced made the contract
   more capable and therefore larger. No review asked the opposite question -- how much must a
   newcomer learn to do the simplest real thing -- so nothing pushed back.
2. **The personas were the most demanding users.** Persona reviews used the SIEM analyst, the
   STRING and NDEx workflows and the knowledge engineer: people whose needs define the ceiling. No
   persona was a first-time plugin author with an afternoon to spare. The four plugin-author
   personas in `design/designloom/personas/` (a data scientist porting a metric, a researcher
   writing a one-off reader, a front-end developer integrating the element, a library author
   porting a layout at scale) now fill that gap.
3. **Findings were fixed by adding author obligations.** A reviewer found a real hazard (formula
   injection, an unmeasured value exported as zero, parallel edges merged silently) and the fix
   was a MUST on the author rather than work moved into the element. The file-format contract
   ended with about 40 MUST and SHOULD rules on the plugin author; each one was correct.
4. **The worked examples were chosen to exercise the contract.** The algorithm example is a hub
   score over compressed adjacency with a hand-derived worst-case cost; the file-format example is
   a SIF reader under a vendor id. They prove the contract works; they are nobody's first plugin,
   and no line or concept count was ever recorded.
5. **Adoption defects were filed as correctness gaps.** "`capacity` is required by the type" and
   "the logger is disabled by default" were known and listed as known gaps, framed as accuracy
   problems to fix later rather than as reasons a newcomer gives up.
6. **Every automated check tests correctness, none tests size.** The example checker proves an
   example compiles; the parity suite proves a capability exists; the conformance kit proves an
   extension behaves. None fails when the easy case becomes hard.
7. **Nobody wrote a plugin from the published guide alone.** Every example was written by someone
   who had read the specification and the source. The guides drifted from the specification in
   five of the seven points without anyone noticing, because nobody used them as their only
   source.

The first simple tier then repeated three of these mistakes in a smaller form, which the blind
round above found:

8. **The budget counted the example, not the task.** Lines were counted from the `define*` call
   to its closing bracket. So the examples fitted by leaving out what the task needs -- the
   malformed-row warning, the response check, the call that shows the result -- and the authors
   who put those back ran over. Setup (the `tsconfig`, loading without a bundler) was not counted
   at all, and that is where five authors got stuck.
9. **Type-checking stood in for running.** The examples were checked by the compiler, and the
   first blind round could only type-check, because nothing is built. A compiler cannot see a
   silent wrong answer: every trap in item 4 above compiles cleanly. No error message was ever
   read by an author.
10. **Nobody looked for wrong answers, only for long ones.** The review asked "how short is it?"
    and never "where does it give a plausible wrong answer with no error?". Defaults that hide a
    mistake (`?? 0`, direction defaulted to undirected, text where numbers were meant) are the
    cheapest thing to write and the most expensive thing to debug.

The second round found three more, all about how the budget was enforced rather than designed:

11. **Compiling was recorded as succeeding.** Every run of the second round reported
    "succeeded" because the plugin type-checked, although the budget's own rule says a type-check
    is not a pass. A result column that can only say yes hides that the half of the design a
    compiler cannot see -- error messages, warnings, wrong answers -- was never exercised.
12. **The budget was checked on the reference, not on the authors.** The reference examples were
    held to 20 lines; five of the twelve authors' plugins were over and were still reported as
    successes. A reference at exactly the ceiling leaves no room for an ordinary author's style,
    and the most common layout request (rows by a category) was not a named task at all, so no
    reference existed for it.
13. **Checks on the easy path lived in prose.** The rule that setup is part of the budget, the
    line ceiling and the internal-term list were all written down, and the only automated check
    compiled examples with the very settings (`lib` ES2024, path mappings) the rules forbid.

## What changes

1. **The adoption budget is normative** (`README.md` section 8.1): about 15 author lines, at most
   20, and no internal concept, for a named first-plugin task per point.
2. **Every point has a simple tier**, specified before its advanced contract, and a new point is
   not accepted without one (`simple-tier.md`).
3. **The blind-author check** runs the four plugin-author personas against the published guide
   only, on every change to a guide, to `./extend` or to a specification, and before every
   release; its results replace the table above. It runs the plugin (a playground story before
   release), counts a silent wrong result on the kit's trap fixtures as a failure of its own, and
   is not finished until the author sees the result (`README.md` section 8.1 item 6).
4. **The budget is end to end** (`README.md` section 8.1 items 1 and 2): the "use it" lines, the
   input checks the task needs and the setup all count, and the simple-tier declarations must
   compile with the element installed and nothing else.
5. **A static CI check** fails a guide page whose first example is over budget or names an
   internal concept.
6. **Review rule**: a change that adds an author obligation states which tier carries it; one that
   lands on the simple tier fails review unless the element absorbs it.
7. **Adversarial review of the easy path**: every review round has one reviewer who looks only for
   plausible wrong answers with no error, and each is fixed in the element or recorded with the
   reason (`README.md` section 8.1 item 9).
8. **Dogfood**: some built-ins are built on the simple tier, so the tier is exercised by the
   element's own code and cannot quietly lose capability.
9. **The guide defects above are corrections** listed in `README.md` section 13.
10. **Over budget is a failure, and so is "compiled only".** A blind run records "type-checked
    only" when it could not run the plugin, and FAIL when a named task is over 20 lines, with the
    cause and the element-side fix (`README.md` section 8.1 item 6).
11. **A playground runs the plugin before release** (`simple-tier.md` section 3 item 6), and at
    least one built-in per point is built on the simple tier (item 5 there), which also gives the
    ceilings measured numbers.
12. **The checker enforces the budget.** `check-examples.mjs` now compiles the simple-tier
    examples against `simple.d.ts` alone under `lib` ES2020, type-checks every "use it" line
    against the element class, and fails a point's first example over 20 lines or naming an
    internal term.
