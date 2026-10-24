# Timeline attribute: design

Status: proposed, 2026-10-22. Tracking issue: #300 ("graphty-element: no time-series playback
over a time attribute").

## 1. Summary

A **timeline attribute** is a field on nodes, on edges, or on both, that says when each element
exists. The first release reads a single moment per element (an email's `sent` time); a start and
an end (an employee's tenure) follows in phase 4, and until then interval data is read by its
start alone. The reader designates the field once, the same way they designate an edge weight
today, and graphty then lets them:

- see how the graph's activity is spread over time, as a histogram under the canvas;
- keep only one stretch of time visible (a **time window**) and drag it along the timeline;
- play the window forward, step it, pause it, and choose between a window that slides and one
  that grows from the start (cumulative);
- see what entered and left at each step, list those elements, see when the selected elements
  were active, and run an algorithm or a summary statistic over every window.

The recommendation:

1. **graphty-element owns all of it.** The element already has a time window
   (`session.visibility.setWindow`). This design makes the designated time field drive it, adds a
   `session.time` surface (extent, histogram bins, a playback transport, a per-window series) and
   makes it fast. The graphty app only draws a dock and a settings card around it.
2. **No database engine.** Cosmograph does use DuckDB compiled to WebAssembly (DuckDB-WASM), for
   general SQL cross-filtering over tens of millions of rows. A timeline over one field needs one
   sorted index per time column: 12 bytes per element, built in about 93 ms at 1 million edges,
   after which locating any window costs 0.36 ms and one playback step 0.17 ms (measured on the
   data structure alone, section 5.4). A database would put an asynchronous worker round trip on
   every step and hold the data twice.
3. **The renderer is the real bottleneck.** Today every visibility change re-evaluates every
   element, walks every node and edge object, and re-uploads the whole edge buffer. The plan
   makes visibility incremental (section 5.3) and, for large graphs, moves the window into the
   edge shader (section 5.5), so playback cost follows what changed and what is visible, not the
   size of the graph.
4. **UI: a histogram dock under the canvas for scrubbing and playback, with the settings on a
   "Time" card among the filters.** The layout never re-runs on a window change, so node positions
   stay put while time moves.

The first useful release (phases 1 to 3 in section 9) is: designate a time field on nodes or
edges (instants), histogram with the selection's activity over it, sliding and cumulative
playback, nodes that follow their edges, the dock and the card. It plays smoothly on graphs up to
about 80,000 edges; larger graphs scrub and step correctly but each step costs a whole-graph frame
until phase 4 (section 5.2).

## 2. The consumer API in graphty-element

### 2.1 What exists today

graphty-element's session (the element's `session` property, a `GraphSession`) already has:

- `session.visibility.setWindow(window | null, options?)`, returning a `Run<FilterResult>`. A
  `TimeWindow` is `{ attribute, from, to, step? }`: the path of the attribute holding the instant
  (such as `data.sent`), a half-open range `from <= t < to` given as epoch milliseconds or a
  string `Date.parse` understands, and a step size (`number` of milliseconds, or `"hour"`,
  `"day"`, `"week"`, `"month"`, `"quarter"`, `"year"`) that is stored but never applied.
- The window and the filter write the same visibility masks and combine with AND. An edge whose
  endpoint is hidden is hidden. Moving the window never re-runs the layout.
- Each `setWindow` is one undoable command (`visibility.window`, `visibility.clear-window`), and
  the window is saved in the project file.
- The data configuration already stores a designated time field per table,
  `knownFields.nodeTimePath` and `knownFields.edgeTimePath`, written by the import plan when the
  reader gives a column the `time` role. `data.ts` `columnRoles()` reads them to report the column
  role, but **the window does not**: `setWindow` needs its `attribute` passed by hand every time.
- `session.data.declare(column, { measurement: "time" })` records what a column measures
  (`Measurement`, with a `MeasurementSource` of declared, file or inferred), and an `ordinal`
  declaration carries its `order`.
- `session.on(event, handler)` with a typed `SessionEventMap` (`visibility:changed`,
  `selection:changed`, ...) returns an unsubscribe function.

Issue #300 asks for `steps()` (a precomputed series of windows) and a play, pause and step
transport. The name `steps` is already taken on `session.visibility` (`steps`, `setSteps`,
`previewSteps` are filter steps, an ordered list of rules), so the timeline gets its own
namespace, `session.time`.

### 2.2 The simple path: the first example

```html
<graphty-element
    id="g"
    data-source="url"
    data-source-config='{"url": "emails.csv"}'
    edge-time-path="data.sent"
></graphty-element>
<button id="play">Play</button>
<script type="module">
    import "@graphty/graphty-element";
    const g = document.querySelector("#g");
    await new Promise((r) => g.addEventListener("data-loaded", r, { once: true }));
    const time = g.session.time;
    await time.ready; // the time field is indexed
    const { from } = time.extent(); // first instant in the data, epoch ms
    await time.window({ from, to: from + 7 * 864e5, step: "day" }); // one week
    document.querySelector("#play").onclick = () => (time.playing ? time.pause() : time.play());
    g.session.on("time:step", (s) => console.log(s.from, s.to, s.entered.edges));
</script>
```

Eighteen lines, and the author names one field. No index, mask, column, unit or bookkeeping
appears. This example must compile against the published types, with `session.time` added,
before the API is reviewed (repository rule); phase 1 adds it as a type test.

What the element does behind it:

- `edge-time-path` (a new attribute and property, the twin of today's `edge-weight-path`) writes
  `knownFields.edgeTimePath`, the value the import plan already writes, and declares the column's
  measurement as `time` (section 2.3, "Designation").
- `time.ready` resolves once the designated field is indexed (section 5.7).
- `time.window(...)` is `visibility.setWindow` with `attribute` filled in from the designated
  field. Edges carry the time here, so nodes follow their edges (section 2.4, "nodes").
- `time.play()` advances the window by its `step` on a timer until the end of the data, then
  publishes `time:end` and pauses.

### 2.3 The `session.time` surface

All of these are additive. They read the designated field unless an `attribute` is passed.

**Designation**

- `time.field` (`TimeField | null`): `{ nodes?: TimeSource, edges?: TimeSource }`. Null when nothing is designated.
- `time.setField(field)` (`Run<TimeFieldResult>`): Designate or clear, one undoable step.
- **element attributes** (`node-time-path`, `edge-time-path`, `node-time-end-path`, `edge-time-end-path`, `node-time-unit`, `edge-time-unit`): The declarative twins, one unit per table.

```ts
interface TimeSource {
    readonly start: Path; // the instant, or the start of an interval
    readonly end?: Path; // phase 4
    readonly unit?: TimeUnit; // numbers only; default "ms"
    readonly parseZone?: string; // IANA zone for date-times with no offset; default "UTC"
    readonly nodes?: "all" | "ends" | "none"; // edges only; see section 2.4
}
type TimeUnit = "ms" | "s" | "year" | "ordinal"; // "year" and inference added 2026-10-22 (decisions TL-27)
interface TimeFieldResult {
    readonly field: TimeField | null;
    readonly nodes?: { readonly timed: number; readonly untimed: number; readonly unparsed: number };
    readonly edges?: { readonly timed: number; readonly untimed: number; readonly unparsed: number };
}
```

`TimeUnit` says how numbers are read: epoch milliseconds (today's only reading), epoch seconds,
or plain ordered numbers with no calendar (a year column such as `1850`, a simulation step).
Strings and dates ignore it, which is why it is optional.

**Designation and `data.declare` are one fact.** Designating a column declares its measurement
`time` (unless the reader declared something else, which is refused with `E_BAD_COMMAND`, reason
`"declared-not-time"`), and `unit` and `parseZone` are stored on that declaration: the time variant
of `MeasurementDeclaration` gains optional `unit` and `zone`. `time.field` then reads which
column is designated from `knownFields` and how to read it from the declaration, so there is one
place that says "this column is time" and one that says "this is the timeline". A column declared
`ordinal` with an `order` (release names, phases) can be designated too: each value reads as its
position in `order`, with `unit: "ordinal"` (feature 34).

**Facts for drawing.** Before `time.ready` resolves these return `null`; after it they are
synchronous and cheap (section 5.2).

- `time.ready` (`Promise<void>`): Resolves when the designated field's index is built; replaced by a new promise when the field or the data changes. `time:ready` is published too.
- `time.extent()` (`TimeExtent | null`): `{ from, to, nodes: { timed, untimed, unparsed }, edges: {...} }`. `to` is just past the last instant (half-open). Numbers only.
- `time.bins({ count?, step?, from?, to?, timeZone? })` (`TimeBin[] | null`): The histogram. Each bin is `{ start, end, nodes, edges }`. `count` (default 100) or `step` (a `TimeStep`); calendar steps use `timeZone` (default: the current window's, else `"UTC"`).
- `time.bins({ ..., scope: "visible" })` (same): Counting only elements that pass the other filters.
- `time.bins({ ..., of: { nodes?, edges? } })` (same): Counting only the given `NodeId[]` and `EdgeId[]`: the selection profile drawn over the histogram.
- `time.spanOf({ nodes?, edges? })` (`{ from, to } | null`): The time span of the given elements, for "jump the window to the selection".
- `time.changes()` (`{ entered: { nodes, edges }, left: { nodes, edges } }`): The ids that entered and left on the last step (arrays of `NodeId` and `EdgeId`), for "which hosts first appeared".

**The window and the transport**

- `time.window(w | null, options?)`: Set or clear the window. `w` is a `TimeWindow` whose `attribute` is optional. It IS the `visibility.setWindow` command: same masks, undo and persistence.
- `time.current`: The window on screen: the playback cursor while one is active, else the committed window.
- `time.committed`: The window history and the project file hold (equal to `visibility.window`).
- `time.play(options?)`: Start advancing. Options: `step`, `mode: "sliding" | "cumulative"`, `interval` (ms between steps, default 1000), `loop` (default false), `rerun` (re-run stale runs each step, default false), `waitForRender` (default true), `timeZone`.
- `time.pause()`: Stop advancing and commit the cursor (one history step).
- `time.stepBy(n)`: Move by `n` steps (negative goes back); commits.
- `time.seek(instant, { commit? })`: Move the window so it starts (sliding) or ends (cumulative) at `instant`. Without `commit` it moves only the cursor.
- `time.commit()`: Record the cursor as one history step. The dock calls it on pointer-up and key-up.
- `time.playing`, `time.mode`, `time.interval`: Read state.
- `time.transition`: Read and write: `{ fadeMs: number }`, default `{ fadeMs: 0 }` (phase 5).

**Events** join `SessionEventMap`, so `session.on` autocompletes them: `time:step`, `time:play`,
`time:pause`, `time:end`, `time:field`, `time:ready`. `time:step` carries numbers only:

```ts
interface TimeStepEvent {
    readonly index: number; // step number from the start of the data
    readonly from: number; // epoch ms (or ordinal value)
    readonly to: number;
    readonly visible: { nodes: number; edges: number };
    readonly entered: { nodes: number; edges: number };
    readonly left: { nodes: number; edges: number };
    readonly cause: "play" | "step" | "seek" | "window";
}
```

The app writes the readout and the counts from these; the element never writes words.

**Series (the precomputed list issue #300 calls `steps()`)**

`time.series({ step, mode?, from?, to?, timeZone?, measures? })` returns a `Run<TimeSeries>`:

```ts
interface TimeSeries {
    readonly rows: readonly {
        readonly from: number;
        readonly to: number;
        readonly visible: { nodes: number; edges: number };
        readonly entered: { nodes: number; edges: number };
        readonly left: { nodes: number; edges: number };
        readonly values: Readonly<Record<string, number | null>>; // one per measure, keyed by its id
    }[];
}
type TimeMeasure =
    | "nodes"
    | "edges"
    | "density" // free from the step
    | { id: string; kind: "components" } // a pass per window, priced
    | { id: string; algorithm: AlgorithmId; result: string; aggregate?: "mean" | "max" | "min" | "sum" | "count" };
```

`{ id: "deg", algorithm: "graphty:degree", result: "degree", aggregate: "mean" }` runs degree on
each window and reduces the per-node values with `aggregate`; a scalar result needs none. Counts
and density come from the incremental step. Component count needs an O(n+m) pass per window (tens
of milliseconds at 1M edges), so it and algorithm measures go through the runs queue and its cost
gate. The run reports progress and is cancelable like every `Run`.

**Errors and notices**, always `{ code, params }`:

- `E_NO_TIME_FIELD` (`{}`): `time.window`, `play` or `bins` without an attribute and with nothing designated.
- `E_BAD_COMMAND` (`{ field, reason }`): Existing. New reasons: `"calendar-step-on-ordinal"`, `"declared-not-time"`.
- **notice `time.unparsed`** (`{ path, count, examples }`): Values that would not parse; up to three raw examples.
- **notice `time.parsed-loosely`** (`{ path, count }`): Values that only parsed through `Date.parse` (section 3.3).
- **notice `time.unit-suspect`** (`{ path, suggested: "s" }`): Numbers read as milliseconds that all sit between 1e8 and 1e10 (epoch seconds land in 1970 otherwise). Suggested, never applied.

### 2.4 The advanced path: options on the window

`TimeWindow` gains optional fields. Each default keeps `visibility.setWindow` as it is today.

- `attribute` (`Path`; the designated field): Now optional.
- `end` (`Path`; the designated end path): Phase 4. Inside when `start < to` and `end > from`; a missing end is open.
- `spells` (`Path`; none): Phase 4. A list of `[start, end]` pairs; inside when any overlaps.
- `nodes` (`"all" | "ends" | "none"`; see below): The `AttributeLeafNodes` choice the `range` and `categories` leaves already offer.
- `missing` (`"inside" | "outside"`; `"inside"`): Whether an element with no usable time is kept.
- `timeZone` (IANA zone name; `"UTC"`): Where calendar steps begin a day or a month.

Unit and parse zone are not window options: they belong to the field (section 2.3), because a
different unit or zone needs a different index.

**The `nodes` rule, one meaning.** With `"ends"`, a node is visible when it passes its own tests
(the filter, and its own time if nodes are timed) and at least one incident edge passes the edge's
own tests (the filter AND the window). The endpoint rule then hides edges whose other end is
hidden. So a node can stay visible when its only counted edge is hidden by the other endpoint;
this is accepted, because the alternative is a fixed-point iteration. The incremental counter
(section 5.3) and the brute-force property test both use this definition. An untimed edge passes
the window under `missing: "inside"` and so keeps its endpoints; under `"outside"` it does not.
This differs from the existing `"ends"` on a value leaf, which looks only at that leaf.

**The `nodes` default.** `visibility.setWindow` keeps `"all"`, so nothing changes for existing
callers. `time.window` (new) takes it from the field's `TimeSource.nodes`, which defaults to
`"ends"` for an edge field when nodes carry no time and `"all"` otherwise. So the same
`time.window` call behaves the same whether `attribute` was written out or not.

**Transition.** `time.transition` fades elements in and out. An instant change is the neutral
behavior; a fade is the consumer's choice. `prefers-reduced-motion` forces 0.

**Per-element facts for style layers** (phase 5). Each timed node and edge exposes:

- `timeline.time`: the element's instant as epoch ms, so a selector compares numbers (JMESPath
  cannot compare ISO date strings). It never changes during playback.
- `timeline.entered`: true when the element became visible on the last step. It is a value
  source whose change set is the step's entered rows plus the previous step's, so the repaint
  visits only those (section 5.5).

"Fade by age" (`timeline.age`) is not a per-element fact: it would change on every visible element
every step and force a whole repaint. It arrives with the shader-side window, as a uniform
(section 5.5). "Highlight what is new" is two ordinary layers:

```js
const where = "timeline.entered == `true`";
await g.session.styles.add({
    name: "New nodes",
    target: "node",
    selector: { match: "expression", where },
    set: { "node.color": "#e8590c" },
});
await g.session.styles.add({
    name: "New edges",
    target: "edge",
    selector: { match: "expression", where },
    set: { "edge.color": "#e8590c" },
});
```

Nothing paints by hand, and a layer that matches only entered elements leaves everything else as
the layers beneath it painted it.

**Context.** The existing `visibility.showContext` flag (draw hidden elements faintly) gives "dim
instead of hide"; it already applies to windowed-out elements.

### 2.5 History, undo, runs and autosave

- **The cursor.** `play`, `seek` without `commit`, and dragging move a cursor window held in a
  non-history slot of the session state, `visibility.cursor`. The mask tag (`wantedTag()`)
  includes the cursor, so mask copies, run identity and what is on screen agree. Playback writes
  the masks directly through the incremental path (section 5.3), not through a command and a
  `ManagedRun`, so a step pays no command overhead.
- **Commit.** `pause`, `time:end`, `stepBy`, `seek(..., { commit: true })` and `time.commit()`
  record one `visibility.window` command holding the cursor and clear it. The dock commits on
  pointer-up and key-up: one gesture, one history step, no timer. Undo after a 50-step play
  returns to the window before playback.
- **Autosave and the project file** hold the committed window; a reload during playback opens at
  the last commit, paused.
- **Events.** `visibility:changed` fires once per cursor move, like a window change, and
  `time:step` carries the counts.
- **Runs.** Run identity includes the window, and each cursor move marks runs over the visible
  graph stale (a flag flip, not a re-run). `Caveats.window` records `{ attribute, from, to }`
  (today only `windowScope: true`), so an app can say which window a result came from.
  `play({ rerun: true })` re-runs stale runs each step and waits for them. Whether moving the
  window should stop marking runs stale is left to the owner (section 8).

## 3. Time data model

### 3.1 Points and intervals

| Kind          | Example                    | Inside a window `[from, to)` when | Release |
| ------------- | -------------------------- | --------------------------------- | ------- |
| Instant       | an email's `sent`          | `from <= t < to`                  | 1       |
| Interval      | a tenure `start` / `end`   | `start < to` and `end > from`     | phase 4 |
| Open interval | `start` set, `end` missing | `start < to`                      | phase 4 |
| Spells        | several disjoint lifetimes | any spell overlaps                | phase 4 |
| Instant list  | GEXF 1.3 `timestamps`      | any instant inside                | phase 4 |

Until phase 4, a field with an end path reads its start as an instant, and the designation result
says so with a notice (`time.end-ignored`). Cumulative mode is a window whose `from` is
`-Infinity`.

Values that change over time (an edge weight per period, GEXF dynamic attributes) are not
visibility. graph-format already stores them as extension tables `temporal:<node|edge>:<name>`
with `element`, `start`, `end`, `value` columns. A later phase reads them "as of the window's end"
for styling; the first release does not.

### 3.2 Nodes, edges, and both

- **Edge-timed** (emails, transactions, calls; the common case): nodes follow their edges
  (`nodes: "ends"`, section 2.4).
- **Node-timed** (papers by year, accounts by creation date): an edge is visible when both ends
  are, by the existing endpoint rule.
- **Both**: each element is tested against its own field; the endpoint rule then hides edges of
  hidden nodes, and with `"ends"` a node also needs a counted edge.

### 3.3 Parsing and detection

**Where values come from.** graph-io and graph-format already normalize time for the formats that
type it: GEXF `date` and `dateTime`, Neo4j temporal types and declared GraphML dates become `f64`
epoch-millisecond columns, a missing end is `+Infinity`, and the original text is kept in a
`<col>.text` column when it cannot be reproduced. CSV and JSON have no date type: dates arrive as
strings and epochs as plain numbers.

**Parse once, not per window.** Today `setWindow` calls `Date.parse` on every element on every
call. The index parses a column once when it is built:

1. A number: read by the field's unit.
2. A `Date`: its time value.
3. A string matching strict ISO 8601: `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, a date-time with an optional
   offset or `Z`, and the expanded signed year form (`-000500`, `+012000`, with `-MM-DD` optional)
   for years before 1000 CE and BCE dates. A date-time with no offset is read in the field's
   `parseZone`. JavaScript dates span about 275,000 years either side of 1970 on the proleptic
   Gregorian calendar, which covers historical data.
4. Anything else: `Date.parse` as a last resort, counted in `time.parsed-loosely`. V8 accepts
   strings such as `"1.10"` as dates, which is why the count is surfaced.
5. Nothing parses: the value is missing, counted in `time.unparsed`.

**Partial dates.** `2019` and `2019-03` read as the start of that year or month; in interval mode
with no end, as the whole period. "circa 1850", "1850s" and other free text are missing values;
the AI agent's date-normalization use case (`design/ai/agent-use-cases.md`) writes a clean column
the reader then designates.

**Historical years as numbers.** A year column (`1850`, `-500`) designated with `unit: "ordinal"`
works at any range. Calendar steps are refused on it; numeric steps of 10 and 100 are its decades
and centuries. The app formats ordinal values as plain numbers, never as dates.

**Detection at load.** The element never re-types a string column as time
(`session/attributes.ts`: "a guess that turns a version number into a timestamp is worse than no
answer"). Detection only **suggests**: the import draft marks a column `DraftColumn.suggested:
"time"` when every sampled non-empty value parses under step 3, or when it is numeric, its name
matches `date|time|timestamp|year|start|end|created|sent`, and its values fit a plausible epoch or
year range. The reader confirms the role on the import screen. The draft also reports a
`{ code: "time.found", params: { table, column, from, to } }` finding.

### 3.4 Time zones

Every instant is stored as UTC epoch milliseconds. A zone matters in exactly two places:

- reading a date-time string with no offset: the field's `parseZone`, default UTC;
- calendar steps and calendar-aligned bins: the `timeZone` of the window, `bins`, `play` and
  `series`, each defaulting to the current window's, else UTC.

The graphty app passes the reader's zone to the window, so its "day" bins start at local
midnight and agree with the local dates it labels them with. Calendar arithmetic (adding a month
to Jan 31) uses `Intl.DateTimeFormat` with the zone and clamps to the month's last day; no
dependency is added.

### 3.5 Missing values

An element whose time is missing or unparsable is kept visible in every window by default
(today's rule). `missing: "outside"` hides it. The counts appear in `time.extent()` and the series
rows, so the app can show a count chip (`No time 120`) rather than a silently incomplete picture.

### 3.6 How the importers carry time

Each line is format (what arrives): what the reader designates.

- **CSV, JSON** (strings or numbers): the column, plus a unit for numbers
- **GEXF** (`start`, `end`, `timestamp` (f64), `spells`, `timestamps`, open-bound flags, `temporal:*` tables): a GEXF graph with `mode="dynamic"` sets the time field on load, since the file declares it
- **GraphML** (declared `date` or `dateTime` as f64; otherwise strings): the column
- **Neo4j CSV** (temporal types as f64): the column
- **XGMML (Cytoscape DynNetwork)** (`start` and `end` attributes): auto-designated like GEXF when both are present

graphty-element's `GEXFDataSource` flattens GEXF times into ISO text keys on each record, which
the index would re-parse. The index reads the snapshot's f64 column when the path names one, and
record values only when it does not.

## 4. Competing products and the feature list

### 4.1 What the others do

- **Gephi** (desktop): instants or intervals (not both), GEXF spells, values that change per
  period. A timeline bar under the canvas with two bounds, play delay, step and mode, and a
  sparkline of a graph metric behind it. Dynamic statistics are written back as dynamic
  attributes. One global layout; filtered elements disappear.
- **Cosmograph** (web, GPU): one time column on points or on links. A histogram bar (250 bars by
  default) with a brush, an animation button that slides the brush, quantile-trimmed extent, and
  `onSelection` / `onAnimationTick` callbacks. Layout is global; the timeline filters.
- **Graphistry**: no dedicated time bar; histograms on any column filter by brushing, temporal
  predicates in its GFQL query language, and a "time ring" layout by timestamp.
- **kepler.gl / Foursquare Studio** (maps): a bottom histogram, a moving or incremental
  (cumulative) window, 1x / 2x / 4x speed, and video export.
- **Linkurious Enterprise and Ogma**: date properties declared in the schema, histograms with a
  zoomable bin step, and node and edge lifespans. Ogma's plugin hands the filtered ids to the host
  app, which re-applies a filter on every change; graphty's principles forbid that shape.
- **KeyLines, ReGraph, KronoGraph** (Cambridge Intelligence): items with instants or periods,
  optionally a value per event so bars can sum amounts. A time bar with a stacked histogram, range
  sliders, play and an "extend" (cumulative) play, and up to three "selection lines" showing the
  selected items' activity. Selecting on the chart shows activity on the bar. KronoGraph is a
  separate lane timeline.
- **Others.** Neo4j Bloom's Slicer has up to five stacked ranges and sliding, cumulative and
  shrinking play. Cytoscape's DynNetwork animates time-stamped XGMML; DyNet rejects animation for
  large networks and shows states side by side. Palantir Foundry Vertex fades non-matching nodes
  and plays 1x to 100x. i2 Analyst's Notebook and KronoGraph use time as the layout (entity
  lanes). KML shows spans while they overlap the window. Tableau and Power BI play axes leave
  trails of earlier frames.

The pattern every product converges on: a histogram along the bottom with a two-handle brush and
transport buttons; sliding and cumulative play; hide or dim; one stable global layout.

Research on layout stability supports the default: the survey by Beck et al. separates animation
from timeline (small multiples) views, with mental-map stability the main concern for animation;
a Monash study found fully fixed and fully re-laid-out layouts both beat the middle ground; and
Archambault et al. found small multiples better than animation for comparison tasks.

### 4.2 Feature list

Each item is `feature [value/cost, release]`: value and cost H high, M medium, L low; release **1** =
first release (phases 1 to 3), **L** = later phase, **R** = rejected.

1. Designate a time field on nodes and/or edges (instant) [H/L, 1]. The entry point; the config already stores it.
2. Interval time (start and end fields) [H/M, L (phase 4)]. Needs the interval index (section 5.3); start read as an instant until then.
3. Open-ended intervals [M/L, L (phase 4)]. Comes with 2.
4. Spells and instant lists [M/M, L (phase 4)]. GEXF fidelity; comes after 2.
5. Values that change per period, read "as of" the window [M/H, L (phase 6)]. Styling over time; not visibility.
6. Histogram time bar with a range brush [H/M, 1]. The feature every product has.
7. Automatic bins, zoom changes the bin step, snap to bins [H/L, 1]. Bins from the index cost 0.06 ms.
8. Outlier-trimmed default extent (quantiles) [M/L, L]. An option on `extent()`, default off.
9. Play, pause, step, speed, loop [H/L, 1]. Issue #300.
10. Sliding and cumulative modes [H/L, 1]. Both are window shapes.
11. Hide or dim out-of-range elements [H/L, 1]. Dim is the existing context flag.
12. Nodes follow their edges [H/M, 1]. Without it, edge time hides no nodes.
13. Histogram stacked by a category [M/L, L]. `bins({ groupBy })`.
14. Bar height as a sum of a value [M/L, L]. `bins({ sum: path })`.
15. Selection profile on the histogram [H/L, 1]. `bins({ of })`; the threat hunter's core move (place a pivot in time).
16. Jump the window to the selection's span [H/L, 1]. `time.spanOf`.
17. List what entered and left in a step [H/L, 1]. `time.changes()`; new and departed entities per period.
18. Stable global layout while scrubbing [H/L, 1]. Already true.
19. Re-layout per window with low movement [M/H, L]. Once layouts can warm-start.
20. Time as a layout axis (rings, lanes) [M/M, L]. A registered layout over the time column.
21. Metric sparkline behind the bar [H/M, L (phase 5)]. `time.series` with counts.
22. Metrics over time as results (degree per window) [M/H, L (phase 5)]. `time.series` with algorithm measures.
23. Run an algorithm on the current window [H/M, 1]. Already true: runs default to the visible graph.
24. Time predicates in selectors [M/L, L (phase 5)]. `timeline.time`.
25. Time zone handling [M/L, 1]. UTC storage, zone options.
26. Saved and restored window [M/L, 1]. Already persisted.
27. Two windows side by side, or a diff [M/H, L (phase 7)]. Small multiples.
28. Trails: fade by age [M/M, L (phase 4+)]. Needs the shader-side window (section 5.5).
29. Export playback as video [M/M, L]. The capture path, stepping the transport.
30. Several stacked ranges on different properties [L/M, R]. Filter steps already combine range rules with the window.
31. Saved time stops for a presentation [L/L, L]. Saved views hold the window.
32. Import of dynamic formats (GEXF, XGMML) [H/M, 1 (instants), L]. graph-io already parses them.
33. A SQL or columnar engine for cross-filtering [L/H, R]. Section 5.6.
34. Ordered categories as time (release names) [M/M, L]. A column declared `ordinal` with its `order`.
35. Community evolution (merges, splits per step) [M/H, L]. Over `time.series` with a community measure.

## 5. Performance requirements and data management

### 5.1 Target sizes

graphty-element enforces a render ceiling of 100,000 nodes and 1,000,000 drawn edges
(`session/limits.ts`, `E_TOO_LARGE`). Measured on 2026-09-26 (RTX 4070 SUPER, headless
Chromium, 10 edges per node): 100k nodes and 1M edges use about 2 GB of heap and draw a frame in
about 1.1 s; 60 frames a second holds to about 40,000 drawn edges and 30 to about 80,000.

Targets:

- **Data side** (window, step, histogram, masks): under the budgets below at the full ceiling,
  with headroom to 10M edges.
- **Render side**: each step costs what is visible plus what changed, never the whole graph. This
  is the phase 4 target; section 5.2 says what the first release delivers.

### 5.2 Budgets

Data side, at 1M edges, including the element's real visibility pipeline (section 5.3). Each
line is operation (budget): measured cost of the data structure alone (section 5.4).

- **Build the index for one time column** (150 ms, time-sliced): 93 ms
- **Jump the window anywhere (index, masks, endpoint rule)** (10 ms): 0.36 ms to locate; mask writes not yet measured
- **One playback step (instants)** (2 ms, worst case over node-timed and Zipf data): 0.17 ms uniform edge instants
- **Histogram of 100 to 500 bins** (1 ms): 0.06 ms
- **Histogram of what passes the other filters** (5 ms, on filter change only): 1.7 ms
- **Series of 100 windows, counts and density** (100 ms): about 20 ms
- **Series with components or an algorithm** (the cost gate's estimate): priced per run
- **Extra memory** (24 bytes per timed element, plus 1 byte per element for the cached filter mask): section 5.3

The measured column covers the index alone, in a standalone script. Phase 1's acceptance is the
same benchmark run inside the element through the real `evaluate` and `ElementMask`, with
node-timed and Zipf-distributed (bursty, hub-heavy) cases, reporting the worst case. No budget
counts as met until that run.

Render side, by visible edges (the measured renderer: 60 fps to about 40k drawn edges):

| Visible edges in the window           | First release (phases 1 to 3)             | After phase 4                           |
| ------------------------------------- | ----------------------------------------- | --------------------------------------- |
| under 40k, graph under 80k edges      | smooth playback                           | smooth playback                         |
| under 40k, graph of 1M edges          | about 1 fps: hidden edges are still drawn | smooth playback                         |
| 1M (a wide or late cumulative window) | about 1 fps                               | about 1 fps; the renderer's own ceiling |

So the first release targets playback on graphs up to about 80k edges. Above that, scrubbing and
stepping are correct and the data side is fast, but each frame costs a whole-graph draw. No
budget promises smooth playback of a window that is itself near the edge ceiling.

### 5.3 Index structures and the incremental mask pipeline

All of these live in graphty-element's session layer beside `session/visibility/filter.ts`,
created lazily and cached per (snapshot token, path, unit, parseZone).

**Instant index:**

- `sorted: Float64Array(k)`, the k non-missing instants ascending;
- `perm: Uint32Array(k)`, the element row of each sorted entry;
- `unset: Uint32Array`, rows with no usable time.

Built by reading the f64 column directly, or parsing strings once, then a least-significant-digit
radix argsort over the float's bits (four 16-bit passes), five times faster than a comparator sort.
A window `[from, to)` is two binary searches giving `[lo, hi)`.

**Data that changes or arrives in pieces.** A new snapshot from an append keeps the index: the k
new rows are parsed and sorted (O(k log k)) and merged into `sorted` and `perm` (O(n)). A
streaming load does not rebuild per chunk; the build waits until the load settles. While no index
is ready, `time.ready` is pending, `extent()` and `bins()` return `null`, and a window is answered
by a full-column scan (about 5 ms at 1M edges on an f64 column, about 155 ms when strings must be
parsed with today's pass shape).

**The mask pipeline.** Today `VisibilityApi.evaluate` clears both masks, recompiles the filter and
the window together (some leaves, such as degree, neighborhood and `nodes: "ends"`, cost O(n+m)
to compile), and runs a pass over every element through per-element closures. The timeline keeps
three separate pieces instead:

1. **A cached filter mask** for nodes and edges: what passes every filter step except the window.
   Recomputed only when the filter or the data changes. It is also the input of
   `bins({ scope: "visible" })`.
2. **A window mask** maintained from index deltas. A step from `[a, b)` to `[a', b')` enters
   `perm[idx(b)..idx(b'))` and leaves `perm[idx(a)..idx(a'))`.
3. **Visible = filter AND window AND the nodes and endpoint rules**, evaluated only for changed
   rows and the elements they reach: a changed edge updates its endpoints' counters (an
   `Int32Array(nodeCount)` of incident edges passing filter AND window); a node whose counter
   crosses 0 and 1, or whose own time changed, re-tests its incident edges through the endpoint
   rule.

The mask version records the changed rows, which the renderer and the style repaint consume. A
filter change recomputes (1) and then visible in full, as today.

**Step cost and its fallback.** With edge time, a step touches the changed edges plus their
endpoints. With node time, hiding a node re-tests all its incident edges, so the cost is the sum
of the degrees of the changed nodes, which on hubs and bursty data approaches m. The step
therefore estimates its work as changed edges plus the summed degree of changed nodes (degrees are
in the snapshot's CSR offsets) and falls back to a full evaluation when that exceeds about
(n + m) / 8.

**Interval index (phase 4).** A start index with the maximum duration as a bound: a window
`[from, to)` takes starts in `[from - maxDuration, to)` and tests their ends. For data whose
durations vary widely (tenures beside one-day events) the bound is loose, so durations are
bucketed by powers of two, each bucket with its own start index and bound, and a jump queries each
bucket. If measurement shows that long-lived intervals still cost more than the 10 ms jump
budget, the stated fallback is the two-column scan, 6.1 ms at 1M. A step re-tests rows whose start
crossed `to` or whose end crossed `from`, from a second index on ends. Spells expand to one row
per spell with an owner array; an element is visible while its count of overlapping spells is
above zero.

**Histograms** come from the index: one binary search per bin edge. A histogram over the filter
mask, or of a selection, is one pass over those rows.

**Memory:**

| Structure                                  | Bytes                                                  | 1M edges                        | 10M edges            |
| ------------------------------------------ | ------------------------------------------------------ | ------------------------------- | -------------------- |
| Instant index                              | 12 per element                                         | 12 MB                           | 120 MB               |
| Interval index (start and end, bucket ids) | 25 per element                                         | 25 MB                           | 250 MB               |
| Spells                                     | 20 per spell (two f64 and an owner row) plus the index | 32 MB at 1.6 spells per element | 320 MB               |
| Cached filter mask                         | 1 per element                                          | 1.1 MB                          | 11 MB                |
| Node edge counts                           | 4 per node                                             | 0.4 MB                          | 4 MB                 |
| Row-to-object arrays (section 5.5)         | 8 per element                                          | 9 MB                            | n/a (render ceiling) |
| Changed-row list                           | 4 per changed row                                      | under 0.1 MB                    | about 0.1 MB         |

At 1M edges the instant-time structures are about 1% of the renderer's 2 GB.

### 5.4 Measured costs

A benchmark script built the index over uniform edge instants spread over five years, a window
30 days wide moved one day per step, nodes = edges / 10 (Node 22, Intel i9-14900, one thread,
median of 7 runs, 3 at 10M). It writes a bare `Uint8Array`: no filter AND, no endpoint rule, no
`ElementMask`, no command. These are the data structure's costs, a floor for the pipeline above.

| Operation                                                                  | 100k edges | 1M edges      | 10M edges       |
| -------------------------------------------------------------------------- | ---------- | ------------- | --------------- |
| Today's pass shape: path read and `Date.parse` per element (a lower bound) | 23.5 ms    | 155 ms        | n/a             |
| Full scan of an f64 column, no index                                       | 0.55 ms    | 4.9 ms        | 63 ms           |
| Index build, radix argsort                                                 | 7.9 ms     | 93 ms         | 857 ms          |
| Index build, comparator sort                                               | 26 ms      | 466 ms        | n/a             |
| Locate any window                                                          | 0.05 ms    | 0.36 ms       | 1.1 ms          |
| Rows in the window                                                         | 1,576      | 16,462        | 164,589         |
| One play step, incremental, with node counts                               | 0.02 ms    | 0.17 ms       | 0.79 ms         |
| Edges / nodes changed per step                                             | 101 / 155  | 1,066 / 1,534 | 10,822 / 15,509 |
| Histogram, 500 bins, from the index                                        | 0.08 ms    | 0.06 ms       | 1.2 ms          |
| Histogram, 500 bins, full pass                                             | 0.22 ms    | 1.7 ms        | 22.6 ms         |
| Interval full scan                                                         | 0.70 ms    | 6.1 ms        | 51 ms           |

Today's code makes playback impossible at 1M edges (155 ms or more per step before rendering) and
too slow at 100k. The script and its output are on the design machine at
`tmp/timeline-research/bench/` (not committed); phase 1 moves it into graphty-element's
benchmarks with the node-timed and Zipf cases.

### 5.5 Rendering cost of visibility changes

Today, on any mask change:

1. `UpdateManager.syncViewMasks` walks every Node and Edge object (1.1M at the ceiling).
2. A hidden edge is a zero-length instance that is still drawn: `EdgeLineBatch.setDrawn` zeroes
   its 14 floats but keeps it in the instance count.
3. `EdgeLineBatch.flush` uploads the whole slot buffer, 56 bytes per edge: about 56 MB per changed
   frame at 1M edges.
4. A style layer that reads a changing value repaints every element (`sources.ts`), unless it is
   bound to a run.

The fixes, in order:

1. **Row-to-object arrays and the changed-row list** (phase 2). The data manager keeps a
   `Node[]` and an `Edge[]` indexed by snapshot row, updated when records are added and removed,
   so `syncViewMasks` reaches the about 2,600 changed objects per step at 1M edges in
   O(changed), not 1.1M.
2. **Partial uploads** (phase 2). `flush` uploads only dirty slot ranges. An edge owns several
   slots across several `EdgeLineBatch` instances (curve pieces, outline, halo bands, gradient
   pieces, `Edge.ts` around line 338), and each one marks its range dirty.
3. **Changed-rows repaint** (phase 5, with `timeline.entered`). A layer reading a `timeline.*`
   value source repaints only the rows in that source's change set.
4. **The window inside the shader** (phase 4), the scalable path. Each edge's instant (or start
   and end) goes into its instance data in every batch it owns, the window is a uniform, and the
   vertex shader collapses instances outside it. A scrub then costs zero CPU and zero upload on
   the render side, and fade and age become uniforms. The session masks are still computed,
   because algorithms, counts and selection read the data scope. Instances outside the window are
   still vertex-processed but produce no fragments; whether that reaches the phase 4 targets at
   1M edges is phase 4's first measurement.

Compacting visible slots (swapping a hidden edge's slot with the last live one) is rejected:
multi-slot edges cache their slot indexes, tests read geometry by slot, and the bookkeeping across
every batch is larger than the shader-side window, which also handles fades.

Nodes stay instanced meshes toggled with `setEnabled`; with the changed-row list only about 1,500
change per step at 1M edges.

### 5.6 Do we need DuckDB-WASM like Cosmograph?

**No, not at our sizes.**

What Cosmograph uses, verified: `npm view @cosmograph/cosmograph@2.5.1 dependencies` lists
`@duckdb/duckdb-wasm` 1.32.0, `apache-arrow` 17.0.0 and the Mosaic packages (`@uwdata/mosaic-core`,
`mosaic-sql`, `mosaic-plot`, `vgplot`). Version 1.4.2 used `crossfilter2`, an in-memory JavaScript
library, and no DuckDB. Cosmograph's concept page calls DuckDB-WASM "the backend for
lightning-fast data operations" and Mosaic's indexing support for "real-time interaction with
billion+ element databases"; its upgrade guide credits Arrow plus DuckDB with "handling tens of
millions of points". Mosaic gets its speed from pre-aggregated, pixel-binned tables kept as
materialized views inside the database. So the recollection is right: Cosmograph 2.0 adopted
DuckDB-WASM and Mosaic, aimed at tens of millions of rows and SQL data preparation, of which the
timeline is one consumer.

Why graphty does not need it:

1. **Every query is an asynchronous round trip to a worker** that returns Arrow, which the
   element would then turn into its masks. A step must be synchronous so the masks and the screen
   never disagree, and the index answers a step in 0.17 ms on the main thread.
2. **The data would live twice**, once in the graph-format snapshot the renderer, algorithms and
   styles read, and once in the DuckDB table, kept in sync on every edit.
3. Download size matters less: as an optional peer dependency it would load only for consumers
   who opt in. For scale, `duckdb-eh.wasm` 1.32.0 is 34.2 MB raw, 7.6 MB gzipped, plus a 0.77 MB
   worker (measured from jsDelivr).

Apache Arrow JS (46 KB gzipped) is a smaller question: graph-format's columns already follow
Arrow's layouts, so Arrow belongs in graph-io as an **import format** (Arrow IPC, and Parquet
through it), not as a runtime index.

**When something heavier would pay off.** Revisit when any one of these is true:

1. The time-indexed element ceiling rises past about **10M rows**, where the index build nears a
   second and an O(n) filtered histogram about 23 ms.
2. The product wants **free-form multi-column cross-filtering**: several linked histograms,
   group-bys and joins readers compose themselves.
3. Data arrives as **Parquet or gigabyte-scale files** that should be queried without building a
   full snapshot.

If one does, the engine sits behind graphty-element's session API as an optional peer dependency
the element detects, the same model as `@graphty/webgpu-graph-algorithms`.

### 5.7 Where the work runs

- **Main thread, synchronous:** window queries, steps and histograms once the index is ready.
- **Main thread, time-sliced:** the index build, with the existing `runPassInSlices` pattern
  (yield every 8 ms), progress and an abort signal, when the field is designated or a load
  settles. `time.ready` resolves when it finishes; until then windows use the full scan (section
  5.3).
- **Worker:** not needed under 10M edges. Snapshot columns are transferable, but a worker adds a
  copy or requires cross-origin isolation for shared memory.
- **GPU compute:** not worth it for masks: the work is memory-bound and under 1 ms, and one GPU
  submit and readback costs 0.4 to 0.6 ms. The GPU's role is the shader-side window.
- **Series:** one incremental step per window; counts are free, components and algorithms are
  priced runs.

## 6. UI options

Places named below are from the graphty app's shell design
(`design/ui/app-shell-progressive-disclosure-design.md`): the **rail** is the narrow icon column on
the left; the **Data place** is the side panel it opens for data, with its Attributes and Filters
sections; the **import screen** is where a file's columns get roles at load; the **inspector** is
the right panel for the selection; the **status bar** runs along the bottom and gains a
**Viewing** slot that names what the canvas is limited to.

All options share the following.

**Designating the field.** On the import screen the column role menu already offers "Time" for
node and edge tables, beside "Weight". After load, the Data place's Attributes section shows a
`Time` row per table (`Time [sent v]`), and a column's "..." menu gets "Set as time". A unit
control (Date, Seconds, Number) appears only for numeric columns, and "End" appears in phase 4.

**Keyboard.** Comma and period step back and forward; Shift with them jumps to the start or end;
Space plays and pauses while focus is in the dock; T shows or hides the dock. Comma, period and T
are registered as single-key commands in the app's key registry (`graphty/src/workspace/keys/
keys.ts`), so the reader can switch them off (WCAG 2.1.4); they act when focus is on the canvas or
the dock, never in a text field.

**Screen reader.** The brush is two `role="slider"` thumbs and a third slider for the brush body.
`aria-valuetext` gives the window with an inclusive end ("Jan 5 to Feb 3, 2026"). One polite live
region announces the window and the entered and left counts on a step and on pause, never on
every playback frame. The histogram has a text alternative: its label names the busiest bin and
the total, and arrow keys move through the bars, each announcing its range and its node and edge
counts. Play always shows a visible pause (WCAG 2.2.2), and `prefers-reduced-motion` turns off
fades and auto-advance animation while stepping still works.

**Reading the end of the window.** Windows are half-open, so every readout shows `to` minus one
unit of the window's step as the last included date: a 30-day window from Jan 5 reads "Jan 5 to
Feb 3". With a sub-day or numeric step the readout shows both bounds and marks the end as
excluded, in wording the app owns.

**Nodes and edges in the bars.** Stacked bars differ by fill pattern as well as color (edges
solid, nodes hatched), so the split does not rely on color.

### 6.1 Option A: a docked histogram time bar

```
+----+-----------+---------------------------------------------+-----------+
|rail| Data place|                  canvas                     | inspector |
|    |           |                                             |           |
|    |           +---------------------------------------------+           |
|    |           | [|<][>][>|] 1x   sent  Jan 5 - Feb 3  [Sl|Cu] [x]       |
|    |           |  .:|||:..   ..:||||||:.   [=======]   ..:|:.   ...      |
|    |           |  Jan        Feb         Mar         Apr        May      |
|    |           +---------------------------------------------+           |
|    |           |  table drawer (when open)                   |           |
+----+-----------+---------------------------------------------+-----------+
```

- A dock at the foot of the canvas, above the table drawer: about 64 px tall with a pointer,
  about 112 px on touch (a 44 px transport row, a 48 px histogram, axis labels). It resizes the
  canvas, so it never covers nodes.
- Drag the brush body to move the window, drag an edge to resize it. A tap or click on a bar
  outside the brush jumps the window there; inside the brush it does nothing; movement past 8 px
  makes it a drag. Wheel or pinch over the bars zooms the time axis and the bins are fetched again
  at the finer step; a pinch is the dock's only when it starts over the dock.
- With a selection, a line over the bars shows the selection's own activity, and a button jumps
  the window to its span.
- **Phone:** one 44 px row (transport, readout) over a 16 px activity sparkline with the brush on
  it; tapping the readout opens a bottom sheet with the full bar. **iPad:** the 112 px touch dock.
- **App cost:** about 5 days.
- **Best for** the cybersecurity analyst: bursts are visible, the selection's line places a
  pivot in time, and a short sliding window walks through an incident.

### 6.2 Option B: a header chip that expands

```
header: [file] ........ [Filter 9/22] [> Jan 5 - Feb 3 v] ........
                                           |
                     +---------------------v-----------------+
                     | [|<][>][>|] 1x   [Sl|Cu]   Step 7 d   |
                     | .:|||:..  ..:||||||:.  [====]  ..:.   |
                     +---------------------------------------+
```

- A time chip beside the filter chip holds play and the readout; its caret opens the histogram.
- **Phone:** the best fit; the popover becomes a sheet.
- **App cost:** about 3 days, the cheapest.
- **Weakness:** the histogram is hidden while the reader watches the canvas, so they play blind
  and miss bursts; scrubbing in a popover covers the canvas.

### 6.3 Option C: a time card in Filters, plus a thin scrubber

```
Data place                          canvas foot
Filters                    [+]      +---------------------------------+
 [x] type is host                   | [<] [>] [>|]   Jan 5 - Feb 3    |
 [x] Time  sent          v          |  =======[#####]===============  |
     +--------------------------+   +---------------------------------+
     | Field   sent             |
     | From    [Jan 5 ]         |
     | Window  30 d   Step 7 d  |
     | Mode    [Sliding|Cumul.] |
     | Speed   1x               |
     | Nodes   [Follow edges]   |
     | .:|||:.. ..:||||[==]:.   |
     +--------------------------+
```

- A "Time" card joins the Filters section's cards. Field, window, step, mode, speed and the nodes
  rule are compact rows on it.
- A thin scrubber (track, brush, transport, no histogram) docks at the canvas foot while the card
  is on.
- Undo, the header filter chip and switching the card off behave as for every other filter.
- **App cost:** about 4 days.
- **Best for** the fraud analyst's transaction investigation (workflow W06), which combines
  "transfers over 10k AND in March" and saves it with the project.

### 6.4 Option D: small multiples beside the graph

```
+-----------------------------+---------------------------------------+
| live canvas (current window)|  Jan      Feb       Mar       Apr     |
|                             |  [o-o ]   [o-o-o]   [o<o>o]   [o o ]  |
|                             |  12/9     20/31     41/77     18/22   |
|                             |  ---- nodes ---- edges (sparkline) ---|
+-----------------------------+---------------------------------------+
```

- A split beside the canvas showing one thumbnail per window at the same frozen positions, new
  edges in an accent layer, and a sparkline row of per-window metrics. Clicking a thumbnail sets
  the live window.
- **Phone:** does not fit; a sideways-scrolling row. **XR:** the strongest, windows stacked in
  depth as a space-time cube.
- **Cost:** element 8 to 12 days extra (offscreen renders of N masked views), app 4.
- **Best for** network-evolution research, where comparing whole windows beats animation.

### 6.5 Comparison

The element work of phases 1 and 2 (about 8 to 10 days) is the same under every option; the
table counts only what each option adds.

|                            | A dock        | B header chip   | C card + strip    | D small multiples      |
| -------------------------- | ------------- | --------------- | ----------------- | ---------------------- |
| Sees bursts while watching | yes           | no              | in the panel only | yes                    |
| Settings in the Data place | no            | no              | yes               | no                     |
| Reuses existing patterns   | the dock slot | the header chip | filter cards      | a canvas split         |
| Phone                      | good          | best            | good              | poor                   |
| XR                         | good          | fair            | good              | best                   |
| Added cost                 | app 5 d       | app 3 d         | app 4 d           | element 10 d + app 4 d |

### 6.6 Recommendation: A's dock with C's card

Build **the histogram dock (A) for scrubbing and playback, and put its settings on the Time card
in Filters (C)**. Adding the card to the dock costs about 2 more app days than A alone.

- The histogram is the feature. Every product that does this well puts the distribution under
  the brush; without it readers miss bursts, which is the cybersecurity analyst's whole task.
  The phone keeps it as a sparkline.
- Configuration lives in the Data place in the owner's data UI rules, and the card gives the
  window the filter section's undo, persistence and header chip.
- **One window, one owner.** The card and the dock both drive `session.time`; the card is not a
  second window. The Filters list shows the window as a row because it is a visibility producer,
  but it is the same element state.
- D is deferred, not dropped: its per-window metrics are the `time.series` result.

**Dock contents, left to right:** step back, play/pause, step forward, speed (1x, 2x, 4x), the
field name, the window readout (the only text the dock writes, from the element's numbers and the
field's unit), Sliding/Cumulative, and a close button that clears the window. The histogram fills
the second row with the brush over it.

**XR.** graphty-element hosts its own XR UI, so the time panel is the element's: a small panel on
the off-hand controller with the histogram, the brush and play. The trigger plays or pauses; the
thumbstick steps. Because the element draws it, the readout's text comes from a consumer-supplied
formatter, `xr.timeFormat: (ms: number, unit: TimeUnit) => string`, defaulting to an ISO 8601
date (or the plain number for ordinal), so the element writes no locale text of its own.

**Status bar.** The Viewing slot shows the window while one is on, and the visible counts the
status bar already shows follow it.

## 7. Integration with existing UI and code

**Data loading and the data panel.**

- The import plan's `TableMapping.time` already writes `nodeTimePath` and `edgeTimePath`. It
  gains `timeEnd` and `timeUnit` and declares the measurement (section 2.3); the draft gains
  suggested time roles and the `time.found` finding.
- The import screen offers Time in the role menu (the app's `ROLES_BY_KIND` copy of the element's
  roles is a known workaround, issue #926; the element should export the roles so the copy can be
  deleted). After load, `Time` rows in the Attributes section call `time.setField`.
- A GEXF or XGMML file that declares dynamic time designates it on load.

**Filters.** The time card sits in the Filters section beside the rule steps. The header filter
chip counts it like any filter, and switching the card off clears the window. Filter steps and the
window keep combining with AND.

**Status bar.** The Viewing slot shows the window; counts are `FilterResult`'s visible counts,
which already reflect the window.

**Insights and the Overview.** The `time.found` finding becomes an Overview row with a button
that designates the field and opens the dock. Unparsed and untimed counts appear as count chips.

**Analyze and time-series charts.** `time.series` with measures is the "over time" result. The
app draws it as a line chart in the Analyze result body and as a sparkline behind the histogram
(phase 5). Arrival and departure rates are the series' `entered` and `left`. Change points (a
step more than 20% from the last) and a linear trend with its R squared, which the temporal
analysis requirements ask for (`design/designloom/capabilities/temporal-analysis.yaml`), are
computations over the series, so they are element series options returning numbers. CSV export of
`period_start, period_end, metric_name, value` is the existing export path over those rows.

**Style layers, layouts and runs** are as in sections 2.4 and 2.5: `timeline.*` facts make "new
this step" an ordinary layer; windows never re-run the layout; runs default to the visible graph,
so "run PageRank on this window" works today. Today `EncodingSpec` refuses a time column on every
channel; a continuous color or size by `timeline.time` reads the indexed numbers (phase 5).

**Project file.** The committed window is already saved. Added: the end paths and units
(`knownFields` and the declarations) and `visibility.playback` holding `{ mode, step, interval,
loop, timeZone }`. `nodes` and `missing` travel in the saved window. A project opens paused.

**Undo.** The app's history list words the `visibility.window`, `visibility.clear-window`,
`time.field` and `time.clear-field` codes.

**AI agent.** The agent uses the same API: designate, window, series, `time.changes()`. The
"investigation timeline replay" use case is `time.play` with the step events the agent narrates.

## 8. Decisions

### 8.1 Decided here

Each is argued where it appears; listed here so the choices can be found in one place.

- `session.time`, not `visibility.steps()` (taken); `time.window` IS `visibility.setWindow`.
- Designation declares the measurement; unit and parse zone live on the declaration and key the
  index. Events go through `session.on`. `time.ready` gates the synchronous facts.
- A cursor in non-history state committed by an explicit call, not a 400 ms idle timer.
- One meaning of `"ends"` (section 2.4); `time.window` takes `nodes` from the field, which is new
  API and so additive.
- Incremental mask pipeline; the shader-side window as the scalable render path, slot compaction
  rejected; no `timeline.age` per-element fact.
- Components are a priced measure. An incremental union-find for cumulative mode cannot handle
  elements leaving, so it is not designed now.
- No DuckDB-WASM, Mosaic or Arrow runtime; index on the main thread, time-sliced, appends merged.
- UTC epoch ms storage; strict ISO first with signed expanded years; detection only suggests;
  `fadeMs: 0` by default.
- The dock plus the Time card, with the selection profile in the first release; the XR time
  panel is the element's, with a consumer formatter.
- The first release plays smoothly up to about 80k edges; partial uploads move into phase 2.
- **Rejected: measuring a DuckDB-WASM range query plus Arrow-to-mask conversion at 1M rows.** The
  two decisive arguments (an asynchronous round trip on a step that must be synchronous, and the
  data held twice) do not depend on its number, and setting up the engine to measure it is not
  cheap. It is worth measuring if any revisit condition in section 5.6 comes true.
- **Rejected: open-ended intervals in the first release.** The overlap test is cheap, but the jump
  for long-lived intervals is not (section 5.3); instants first keeps the first release's
  performance claims honest, and interval data reads by its start until phase 4.

### 8.2 Owner decisions (2026-10-22)

- **What a window move does to finished runs is an option with three values**: keep the results
  as they are (`"keep"`), mark them out of date (`"stale"`), or run them again (`"rerun"`). It is
  `time.settings.results`, held with the designated field and saved in the project as
  `visibility.playback` (section 8.5 moved it off the window, so "Show all time" keeps it). The
  default is `"stale"`: it is what moving a window did before the option existed, so the default
  changes nothing for an existing consumer. The task that relayed the owner's decision suggested
  `"keep"` as the default; the studio's ruling kept `"stale"` for the reason above, and the owner
  may still pick `"keep"` (one changed constant, `DEFAULT_TIME_SETTINGS` in
  `graphty-element/src/session/time/TimeApi.ts`). `"rerun"` also re-runs runs that went out of
  date before it was chosen, and playback waits for the re-runs before its next step. A re-run
  that fails publishes `time:rerun-failed` with the run's id and the error's `{ code, params }`.
  It replaces the `play({ rerun })` option of section 2.3 and settles item 1 of section 8.4.
- **Designating a column makes it a time column.** The column's measurement reads `"time"`
  (source `"declared"`) while it is the designated field, unless the reader declared it
  something else, which `setField` refuses (`reason: "declared-not-time"`). Its completeness in
  `data.attributes()` counts the values that parse as time, not the values present. This settles
  item 2 of section 8.4.

### 8.3 What the prototype built (branch feat/timeline-prototype)

The element half of phases 1 and 2, kept small. Shipped: `session.time` with `field`, `setField`,
`ready`, `extent`, `bins` (count or step, `scope: "visible"`, `of`), `changes`, `current`,
`window`, `play`, `pause`, `stepBy`, `seek`, `playing`, `mode`, `interval`; the events
`time:step`, `time:play`, `time:pause`, `time:end`, `time:field`, `time:ready`; `E_NO_TIME_FIELD`;
the attributes `node-time-path`, `edge-time-path`, `node-time-unit`, `edge-time-unit`; the
`TimeWindow` options `nodes`, `missing`, `mode`, `results`.

Where it differs from sections 2 to 7:

- The unit is stored in `data.knownFields` (`nodeTimeUnit`, `edgeTimeUnit`) beside the path, not
  on the measurement declaration: designation then works before the data has loaded (an element
  attribute), and the measurement is derived from the designation instead of being written.
- `mode`, `step`, `results` and `missing` are settings held with the field (section 8.5), saved
  and undone; the window carries the step and mode in use. `interval` and `loop` are playback
  options and are not saved.
- No cursor slot: every move is a `visibility.window` command. A play's steps merge into one
  history step (a transaction continuing the play's first step), so one undo returns to the
  window before the play; `stepBy` and `seek` are one step each. `seek` always commits.
- Nodes and edges must name the same column (`reason: "time-paths-differ"`), because a window
  reads one attribute.
- `nodes: "ends"` counts edges inside the window only, not edges that also pass the filter.

Left out, each marked `ponytail:` in the code where it applies: the parse zone (date-times with
no offset read as UTC) and the `timeZone` option (calendar steps and bins align in UTC); the
radix sort and the time-sliced index build; the incremental mask pipeline (a step diffs both
masks in full); `spanOf`, `series`, `transition`, `commit`, the cursor; intervals (phase 4);
the import-screen suggestion and `time.found`; the in-element benchmark.

The app half (graphty app, `graphty/src/workspace/time/`):

- **Dock** under the canvas while a field is designated: step back, play/pause, step forward,
  the window readout (inclusive end, dates in UTC to agree with the element's bins), visible
  counts, the field name and a close button that clears the window; then compact-mantine's
  `HistogramRow` of the field (100 bins, bars in the window drawn in the accent), Mantine's
  `RangeSlider` as the brush (thumbs snap to bins, one undoable step per drag), and a
  `SparklineRow` of the selection's activity while something is selected. 44 px targets under a
  coarse pointer. Space in the dock plays and pauses.
- **Time section** in the Data place, after Filters: Time field (nodes and edges grouped, or
  None), Unit for a number column (Epoch ms, Epoch s, Number), Step, Mode (Sliding,
  Cumulative), Speed (1x, 2x, 4x; the app's preference, not saved) and Results (Mark out of
  date, Keep, Re-run). An attribute's menu also has "Set as time".
- **Header chip** beside the filter chip while a window is on: the tier 3 shell has no status
  bar, so the chip is the Viewing slot. Comma and period step (switchable single keys); "Play or
  pause time" is in Quick actions.

Element additions the app needed: `time.window` takes a window with its bounds left out (they
keep the current window's, or open one step at the start of the data), a first calendar window
starts on the step's boundary, and `bins({ of: { nodes, incident: true } })` counts the edges at
the given nodes, so a node selection over edge time has an activity line.

Not built in the app: dragging the brush body (the thumbs and the track move it), wheel or pinch
zoom of the time axis, a tap on a bar to jump, the T key, "jump to the selection's span"
(`spanOf` is not built), the phone sparkline layout and bottom sheet, the import-screen time
role suggestion and the Overview finding, and Storybook stories for each dock state.

### 8.4 For the owner

Under the repository rule, additive API changes need no owner approval, and everything in
section 2 is additive. These are listed because they become contracts once published, or because
they change existing behavior.

**Changes to existing behavior (need the owner):**

1. **Staleness.** Today moving the window marks runs over the visible graph stale. The
   object-first workspace design (`design/ui/object-first-ux/round-2/revision.md` section 6.1)
   wants window moves not to mark them stale. Recommendation: keep today's behavior and add
   `Caveats.window`; the app decides how loudly to show staleness during playback.
2. **Designating a column declares its measurement `time`.** A column the inference had called
   quantitative (an epoch number) changes measurement when designated. Recommendation: yes; it is
   what the reader said.

**Names that become permanent once released (decided as proposed unless the owner objects):**

3. Namespace and members: `session.time`, `field`, `setField`, `ready`, `extent`, `bins`,
   `spanOf`, `changes`, `window`, `current`, `committed`, `play`, `pause`, `stepBy`, `seek`,
   `commit`, `series`, `transition`; events `time:step`, `time:play`, `time:pause`, `time:end`,
   `time:field`, `time:ready`.
4. Element attributes: `node-time-path`, `edge-time-path`, `node-time-end-path`,
   `edge-time-end-path`, `node-time-unit`, `edge-time-unit`.
5. `TimeWindow` fields `end`, `spells`, `nodes`, `missing`, `timeZone`; `TimeSource`;
   `TimeUnit` values `"ms" | "s" | "ordinal"`; the `unit` and `zone` on the time declaration.
6. Selector fields: `timeline.time`, `timeline.entered`.
7. Codes: `E_NO_TIME_FIELD`, `time.unparsed`, `time.parsed-loosely`, `time.unit-suspect`,
   `time.end-ignored`, `time.found`; reasons `calendar-step-on-ordinal`, `declared-not-time`.
8. Project file keys: `knownFields.nodeTimeEndPath`, `edgeTimeEndPath`, and
   `visibility.playback`.

### 8.5 Studio review rulings, as built (2026-10-22)

The design studio reviewed the prototype; its rulings are in
`design/ui/studio/timeline/decisions.md`. What they changed in the element's API (all additive to
the published element; the prototype's own unreleased API changed where noted):

- **Runs.** A re-run keeps its id after the window moved, named or not (`RunsApi` compares a run's
  identity as spelled, live scope keywords unresolved). A run over the visible graph records the
  window it was computed in: `Caveats.window` and `RunScopeRecord.window`, `{ attribute, from, to,
nodes, edges }`. Staleness compares windows, not only the visible node set: a run computed on
  Jun 3-12 is out of date on May 16-25 even when every node shows in both, with
  `StaleNote.reason: "window-moved"` and `StaleNote.window: { code: "window-moved", params: { from,
to, nodes, edges } }`.
- **Settings.** `time.settings` (`{ results, mode, step, missing }`, every default filled in) and
  `time.setSettings(patch)`, one undoable step (op `visibility.playback`, history code
  `visibility.playback`), saved as `visibility.playback`. `TimeWindow.results` is gone (it was
  never released). `step: "auto"` (the default) picks the calendar step closest to a twentieth of
  the data's span (a 1-2-5 number for ordinal time) and writes the step in use on the window
  (`time.current.step`). A new step snaps a sliding window to one aligned step; with no window it
  is only stored, and the first `stepBy(1)` or play opens the first window. Cumulative windows
  start at the start of the data; switching back to sliding keeps one step ending where the
  cumulative window ended. `missing` hides untimed elements in every window.
- **Designation.** `setField` refuses a column none of whose values reads as time (`reason:
"no-times"`). Clearing or changing the field or its unit clears the window, in the same undoable
  step, whose history code is now `time.field` (`{ column }`) or `time.clear-field`. A column
  designated again without a unit takes the unit it was last given. In a column of mostly date
  text, a bare number counts as unparsed rather than as epoch milliseconds. `time.unit-suspect`
  also suggests `"ordinal"` when every number is a whole number from -5000 to 3000.
  `time.notices()` returns the same notices for a field designated by an import or an attribute,
  and the import mapping takes `TableMapping.timeUnit`.
- **New facts.** `time.candidates()` (the columns that read as time, most first, with a suggested
  unit for numbers); `time.parse(text)` (typed dates, no zone read as UTC); `time.seek("start" |
"end")`; `time.atStart`, `time.atEnd`, and `atStart`, `atEnd` and `untimed` counts on
  `time:step`; `bins({ maxCount })` (whole calendar or 1-2-5 steps covering the data exactly, each
  bin carrying its `step`); `data.statistics({ scope: "visible" })`.
- **Transport.** Stepping and playback stop at the window that reaches the end of the data
  (`time:end`), and stepping back stops at the first; play at the end starts again from the
  first window. Autosave holds its writes while time plays and writes once on pause.

Left as decided against, with reasons, in the rulings file: a pre-set field on the timeline
samples, a time chip on sample cards, applying a suggested unit by itself, relabeling Results,
leaving untimed elements out of the counts, not counting a window move as unsaved, a T key, an
outlier notice, an "entered this step" layer (phase 5) and the reader's time zone (UTC is named on
readouts finer than a day instead).

## 9. Phased implementation plan

Each phase lands on its own and leaves the product working.

**Phase 1: the designated field drives a fast window (element).**

- Element attributes, `time.field` / `time.setField`, designation declaring the measurement with
  unit and zone; `time.ready` and `time:ready`.
- `time.window` with `attribute` optional and `nodes` from the field; `E_NO_TIME_FIELD`.
- The cached instant index with append merging; the strict parser with the counted fallback.
- The cached filter mask and the index-driven window mask in `evaluate`; `TimeWindow.nodes`,
  `missing`, `timeZone`; `extent`, `bins` (with `of` and `scope`), `spanOf`.
- Tests: the section 2.2 example compiles against the built types and runs in a browser test;
  a window over a designated edge field hides nodes without counted edges; a window passed by hand
  behaves exactly as before; epoch seconds; a zone-less date-time reads in the parse zone;
  `-000500` parses; missing values kept, counted, and hidden with `"outside"`; bins sum to the
  timed total; index results equal a brute-force scan of the section 2.4 definition on seeded
  random graphs (a property test); a counted-work test that a second window parses nothing; the
  in-element benchmark with uniform, node-timed and Zipf cases against the section 5.2 budgets.

**Phase 2: transport, series and changed rows (element).**

- `play`, `pause`, `stepBy`, `seek`, `commit`, sliding and cumulative modes, calendar steps in a
  zone, loop, `waitForRender`, events; the cursor slot in the mask tag; `time.changes()`.
- Incremental steps with node edge counts and the degree-aware fallback; the changed-row list on
  the mask; row-to-object arrays; `syncViewMasks` touches only changed rows; partial slot uploads.
- `time.series` with counts and density; `Caveats.window`; `play({ rerun })`.
- Tests: "month" across a short month in a named zone; pause stops events; one undo after a
  50-step play returns to the start, and history holds one entry; entered and left counts and
  `changes()` match a brute-force diff; a counted-work test that a step touches only changed Node
  and Edge objects and uploads only dirty ranges; a per-step budget test at 1M edges for the data
  side; a real-input test that pressing play on a story advances the visible count. Closes issue
  #300's element half.

**Phase 3: the app's dock and card (graphty app).**

- Time rows in Attributes and "Set as time"; the Time card in Filters; the dock with histogram,
  brush, transport, selection profile and "jump to selection"; switchable keys; the histogram's
  text alternative; live region; the Viewing slot; the Overview finding; phone and iPad layouts.
- Tests (`*.real-element.test.tsx`, real input): dragging the brush moves the window and records
  one history step on release; a tap outside the brush jumps; comma and period step and can be
  switched off; Space plays and pauses; the readout's inclusive end; the card's switch clears the
  window; reload restores the window and settings. Stories for every dock state, captured by
  visual review. Closes issue #300.

**Phase 4: intervals, spells, and a renderer that scales (element).**

- Interval index with duration buckets, open ends, spells and instant lists; GEXF and XGMML
  auto-designation; read the f64 columns directly.
- The shader-side window in every edge batch, with fade and age as uniforms.
- Tests: overlap at the half-open boundaries; GEXF fixtures with spells and open bounds; a jump
  over long-lived intervals within budget; frame time at 1M edges with a 2% window.

**Phase 5: analysis and style over time.**

- `timeline.*` value sources with a changed-rows repaint, `transition.fadeMs`, time encodings;
  series measures with components and algorithm runs, aggregates, change points and trend; the
  Analyze over-time chart and the sparkline behind the histogram.
- Tests: a "new" layer paints only entered elements, leaves others as painted beneath, and
  repaints only the change set; degree-mean per window equals per-window runs; reduced motion
  disables fades.

**Phase 6: XR panel and dynamic attribute values.**

- The element's XR time panel with the consumer formatter (emulated-headset tests in the `xr`
  project); reading `temporal:*` tables "as of" the window for styling.

**Phase 7: comparison views.** Small multiples and a two-window diff, when a measured need
appears.

## 10. Sources

Competing products:

- Gephi, importing dynamic data: https://docs.gephi.org/desktop/User_Manual/Import_Dynamic_Data/
- GEXF dynamics: https://gephi.org/gexf/dynamics.html
- Gephi TimelineController: https://gephi.org/javadoc/0.9.3/org/gephi/timeline/api/TimelineController.html
- Cosmograph timeline config: https://cosmograph.app/docs-lib/api/interfaces/CosmographTimelineConfig/
- Cosmograph timeline class: https://cosmograph.app/docs-lib/api/classes/CosmographTimeline/
- Cosmograph what's new (v2): https://cosmograph.app/docs-general/whats-new/
- Cosmograph crossfilter: https://cosmograph.app/docs-lib/api/internal/interfaces/Crossfilter
- Cosmograph supported formats: https://cosmograph.app/docs-lib/data-requirements/supported-formats/
- Cosmograph concepts: https://next.cosmograph.app/docs/concept/
- Cosmograph upgrade guide: https://cosmograph.app/docs-lib/upgrade/
- Cosmograph package (dependencies of 2.5.1 and 1.4.2): https://www.npmjs.com/package/@cosmograph/cosmograph
- Mosaic: https://idl.uw.edu/mosaic/what-is-mosaic
- DuckDB-WASM 1.32.0 files (sizes measured): https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.32.0/dist/
- Apache Arrow JS 17.0.0 (size measured): https://cdn.jsdelivr.net/npm/apache-arrow@17.0.0/Arrow.es2015.min.js
- Graphistry histograms: https://graphistry.infra-prod.blackbird.ai/docs/ui/histograms
- Graphistry GFQL datetime filtering: https://pygraphistry.readthedocs.io/en/latest/gfql/datetime_filtering.html
- Graphistry ring layout: https://pygraphistry.readthedocs.io/en/latest/api/layout/ring.html
- kepler.gl playback: https://docs.kepler.gl/docs/user-guides/h-playback
- Foursquare Studio time filters: https://docs.foursquare.com/studio/docs/filters-time
- Linkurious timeline: https://doc.linkurious.com/user-manual/3.1/timeline
- Ogma timeline lifespan example: https://doc.linkurious.com/ogma/5.2/examples/timeline-lifespan.html
- Ogma timeline plugin: https://linkurious.github.io/ogma-timeline-plugin/
- KeyLines time bar: https://developers.cambridge-intelligence.com/docs/keylines/time-bar
- KeyLines time bar API: https://developers.cambridge-intelligence.com/api/keylines/time-bar
- Cambridge Intelligence on time-based visualization: https://cambridge-intelligence.com/time-based-data-visualization/
- Neo4j Bloom Slicer: https://neo4j.com/docs/bloom-user-guide/current/bloom-tutorial/slicer/
- Neo4j Bloom 2.1 time travel: https://neo4j.com/developer-blog/time-travel-with-neo4j-bloom-2-1
- Cytoscape DynNetwork: https://apps.cytoscape.org/apps/dynnetwork
- DyNet: https://pmc.ncbi.nlm.nih.gov/articles/PMC5013899
- Palantir Foundry Vertex timeline: https://palantir.com/docs/foundry/vertex/timeline/
- i2 timeline charts: https://docs.i2group.com/ibase/10.0.1/creating_timeline_charts.html
- i2 Timeline Assistant: https://docs.i2group.com/ibase/10.0.0/using_the_timeline_assistant.html
- KML time: https://developers.google.com/kml/documentation/time
- Siren timebar: https://docs.siren.io/siren-platform-user-guide/15.1/graph-browser/t_timebar.html
- Tableau Pages shelf: https://playfairdata.com/video/an-introduction-to-the-tableau-pages-shelf/
- Power BI play axis: https://inforiver.com/blog/inforiver-super-filter/power-bi-play-axis-animation
- Flourish network charts: https://flourish.studio/visualisations/network-charts/
- JavaScript Date range and expanded years: https://tc39.es/ecma262/#sec-time-values-and-time-range

Research:

- Beck et al., a taxonomy and survey of dynamic graph visualization: https://doi.org/10.1111/cgf.12791
- Archambault, Purchase and Pinaud, animation, small multiples and the effect of mental map
  preservation in dynamic graphs: https://doi.org/10.1109/TVCG.2010.78
- Diehl and Gorg, foresighted layout: https://www.st.uni-trier.de/diehl/pubs/GD02_LNCS.pdf
- Frishman and Tal, online dynamic graph drawing: https://www.ee.technion.ac.il/~ayellet/Ps/OnlineGD.pdf
- Extremes are better (Monash): https://research.monash.edu/en/publications/extremes-are-better-investigating-mental-map-preservation-in-dyna/

Repository:

- `graphty-element/src/session/visibility/VisibilityApi.ts`, `filter.ts`: the time window today.
- `graphty-element/src/config/DataConfig.ts`, `session/draft.ts`, `session/data.ts`: the stored
  time role and `data.declare`.
- `graphty-element/src/catalog/types.ts`: `Measurement`, `MeasurementDeclaration`, `LayerSpec`.
- `graphty-element/src/session/types.ts`: `SessionEventMap`.
- `graphty-element/src/session/limits.ts`: render ceiling and measured frame costs.
- `graphty-element/src/managers/UpdateManager.ts`, `src/Edge.ts` and the edge line batch:
  visibility rendering.
- `graphty-element/src/session/styles/sources.ts`, `predicate.ts`: style repaint.
- `design/graph-format/graph-format-design.md` sections 5.1 and 5.10: time columns.
- `graph-io/src/formats/gexf/schema.ts`: GEXF time columns.
- `design/ui/app-shell-progressive-disclosure-design.md`: the shell's places.
- `design/designloom/capabilities/temporal-navigation.yaml`, `temporal-analysis.yaml`, and
  `design/designloom/personas/`: requirements and personas.
- `design/ai/agent-use-cases.md`: date normalization and investigation replay.
