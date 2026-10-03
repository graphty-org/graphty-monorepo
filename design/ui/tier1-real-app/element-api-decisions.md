# graphty-element: the new public API the tier 1 app needs (second version)

The graphty app's tier 1 build (a first-time reader's whole path: open a file, read it, rank and
group, color and size, labels, find a node and its neighbors, export, save and reopen) needs
eleven additions to graphty-element. Every name and shape here becomes published API, so each is
a one-way door once it releases.

The first version of this page recommended a shape for each item and asked for approval as
written. An adversarial review rejected all eleven: nine need a redesign, one (neighbors) needs
changes, and one (readable run names) is already merged and must be reworked before it is
released. This version gives each item its revised shape, the canonical example that now
compiles, what cannot be undone, how confident the review is, and what is still at risk.

**Status: nothing on this page is approvable as final yet.** The project's rule (CLAUDE.md, "Easy
things easy") is that a public API is not reviewed until an author who has seen only the published
docs writes its canonical example and compiles it. The blind authors wrote against the first
version. The revised shapes were compiled only by reviewers who had read the source, against stubs
they wrote. Each item therefore needs its docs page and a second blind author before it merges.
What the owner can decide now is the direction and the one-way doors listed below.

The full revised shapes, their TSDoc rules and the evidence behind each verdict are in
`review/item-<n>.md` beside this page.

| #   | Item                                        | Verdict                      | Confidence | Decision asked                                                                                   |
| --- | ------------------------------------------- | ---------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| --  | Rules shared by every item                  | new                          | medium     | Approve the column, group, search, text, error-code, progress and legend rules                   |
| 1   | Load preview and column mapping (#781)      | redesign                     | low        | Approve `prepare()` and a held draft; joins on any column stay additive                          |
| 2   | What a column measures; the legend's Other  | redesign                     | low        | Approve `measurement` (four values, open) and "decide the default once, store it in the layer"  |
| 3   | Find without selecting (#783)               | redesign                     | low        | Approve `session.find`, synchronous, after the index is measured                                 |
| 4   | A node's neighbors with weights (#784)      | approve with changes         | medium     | Approve `data.neighbors` with the run's weight rules                                             |
| 5   | Result values as table columns (#785)       | redesign                     | medium     | Approve run-addressed columns (`{ run, field? }`), never paths                                   |
| 6   | What Analyze shows per algorithm (#786)     | redesign                     | low        | Approve groups derived from result shape; the group ids                                          |
| 7   | Labels the overlap rule hid (#787)          | redesign                     | medium     | Approve a read on the element (not the session); keep the existing switch                        |
| 8   | What a run's suggested style did (#788)     | redesign                     | medium     | Approve `runs.painting(id)`; decide whether runs land above a layer that colors everything       |
| 9   | Style channel sections (#789)               | redesign                     | medium     | Approve one derived group list; Size stays under Shape for tier 1                                |
| 10  | The project file (#301)                     | redesign                     | low        | Approve "a project is a graphty document"; decide edge identity and the size limit             |
| 11  | Readable run names (PR #726, merged)        | redesign before 3.6.0        | medium     | Hold the element release; approve "no setting value in an id" and `separate: true`               |

---

## The owner decisions, in one sitting

These are the one-way doors. Everything else on this page is decided here and can be changed with
an edit or a later minor release.

1. **Hold graphty-element releases until the run-name rework (item 11) merges.** PR #726 is on
   master but not released: 3.5.6 was published from a commit before it, and the next release
   would publish it as 3.6.0. After that, every part of it costs a deprecation.
2. **Release the tier 1 element work as one minor, not eleven.** Each item merges into one
   integration branch that the app packages build against through `workspace:*`; the branch merges
   to master once its first consumer, the tier 1 app, passes its task tests. Otherwise every item
   publishes to npm the day it merges, before anything has used it.
3. **Whether graphty-element ships English text at all** (issue #803). The recommendation: every
   piece of element text is `{ code, params, text }`, where `text` is the default English and a
   consumer may replace it by code. Items 2, 6, 8, 9, 10 and 11 all produce reader-facing text.
4. **Whether a run's suggested style lands above a hand-written layer that colors everything**
   (item 8). Today it is suppressed. Either the app stops creating such layers, or every
   graphty-element consumer's drawing changes. This is the real cause of the round 8 failure where
   the communities never appeared.
5. **The project file is a graphty document** (item 10), the format the owner decided on
   2026-09-28, with three new member kinds. Decide with it: how an edge is identified in a saved
   file, the default size limit for opening a project, whether one project holds one session or
   several graphs (issue #828), and what "unsaved changes" means once autosave exists (#818).
6. **The measurement names** (item 2): `categorical`, `ordinal`, `quantitative`, `time`, an open
   set. The spelling comes from the UX worktree's one-way-doors list, which is not merged.
7. **The algorithm group ids and which result shapes fall in each** (item 6). Two built-ins land
   where the design does not put them (depth-first search and all-pairs distance under Rank).
8. **The next major's contents** (below): the breaking changes this work defers.
9. **Whether the project file saves the selection.** The design recorded this as the owner's
   decision; it was decided on the owner's behalf. The recommendation keeps it as an optional view
   member that never marks the project unsaved.

---

## Rules every item follows

The items were reviewed one at a time, and together they named a column five ways, grouped
catalog entries two ways, searched text two ways and produced English four ways. These rules fix
that. A first element pull request adds the shared types with no behavior, so the items can then
run in parallel without each inventing its own.

- **A column is named literally, as `ColumnRef = { kind: "node" | "edge"; name: string }`.** It
  is never a JMESPath expression. An `AttributeDescriptor` from `data.attributes()` already has
  both fields, so it can be passed as is. Item 4's `WeightMeaning.attribute` is the same literal
  name. Where the element must store a column in config that is read as an expression
  (`data.knownFields`), it writes the name quoted as one segment, so a column named
  `shared chapters` or `a.b` reads back as itself. The same fix applies to the attribute walk,
  which builds `path` today without quoting (`session/attributes.ts:154`).
- **A run's result is `{ run: RunRef; field?: string }`**, with the field defaulting to the
  result's primary field everywhere, including the existing `{ top }` and `{ above }` selection
  targets, where `field` becomes optional (an additive change).
- **A selection accepts every id the element hands out.** The `{ ids }` target widens from
  `string[]` to `NodeId[]` (additive), so a neighbor or a table record can be selected without a
  cast; today a numeric id compiles to an error and throws at runtime.
- **One group shape**: `CatalogGroup<T> = { id; plainName; members: readonly T[]; startHere? }`,
  reached as a method on `session.catalog`. Item 6 uses it for algorithms, item 9 for style
  channels, and the later layout groups and label-style sections reuse it.
- **One text matcher.** Find (item 3) and the Analyze filter (item 6) share one normalizer and one
  rule: case-folded, matching a whole value first, then the start of a word, then anywhere. A
  reader who types "brokers" in either box gets the same answer. The two result fields that
  explain a match are named differently (`match` for find, `matchedOn` for the catalog).
- **Reader-facing text** is `{ code, params, text }` (owner decision 3). Composed sentences, such
  as the legend's reading or a run's qualifier, also carry their parts.
- **Error codes reuse what exists.** An unknown column or field is `E_UNKNOWN_ATTRIBUTE` with
  candidates (`errors/codes.ts:92`), as `styles.encode` already throws for an unknown run field.
  `E_OPTION_RANGE` stays "a known option with a value out of range". An unknown element id gets
  one new code, `E_UNKNOWN_ELEMENT`. The size refusal keeps today's `E_TOO_LARGE` details
  (`limit`, `count`, `of`, `graph`), with `of` widened to include `"bytes"` for a file. Item 10's
  warnings for a missing algorithm or layout reuse `E_UNKNOWN_ALGORITHM` and `E_UNKNOWN_LAYOUT`
  as problem codes rather than adding warning twins.
- **Events follow the existing pattern**: a session event `noun:changed`, mirrored to the DOM as
  `graphty-noun-change` (`graphty-element.ts:248-307`). One new session event,
  `progress:changed`, carries progress for a load, a prepare, a project open and a run, so a
  session with no renderer (in Node) reports progress too. Today the only progress hook is a no-op
  without a renderer (`session/data.ts:901`).
- **The legend is one item.** Items 2, 6 and 8 each change `LegendBlock`; they are built as one
  change with one owner, together with issue #790's per-channel painted counts, so that "covered
  by" and "how many it paints" are computed one way.
- **Reads are synchronous up to the element's load limit** (50,000 nodes, 100,000 edges,
  `session/limits.ts:74-84`). Any read that may need more later reserves an `...Async` twin name
  now. The per-revision caches that items 2 to 5 add (the find index, the name rank, the sort
  cache, the attribute cache) are built once, in the shared first pull request, keyed on the
  input revision.

### Breaking changes this work defers to the next major

Every item below is additive, so it releases as a minor. These changes are not, and wait for the
next grouped major with the held pull requests #676 and #702:

- A layer written with `styles.add()` and no scale gets its default from the column's
  measurement (item 2). Until then, hand-written layers stay linear.
- `ChannelDescriptor.group` is removed, replaced by the channel groups (item 9).
- The `"category"` and `"time"` values of `AttributeDescriptor.type` give way to `measurement`
  (item 2).
- The CSV source's `idColumn`, `edgeSource` and `edgeTarget` options give way to the load mapping
  (item 1).
- If the shared matcher changes what `selection.apply({ text })` selects for a 2.x caller (item 3),
  that change waits here; a test proves the results are unchanged before item 3 merges.

---

## 1. Load preview and column mapping (#781)

**Verdict: redesign. Confidence: low.**

The Data page must show, before anything loads, which rows are nodes, which column is the key and
the weight, and what the load will produce. The first version's flat mapping (`id`, `source`,
`target` at the top level) could not say which table a column belongs to, so joining door entries
to people and buildings on `badge_id` and `building_id`, which the owner wants, could only come
later as a breaking reshape. Its stateless `preview()` re-read the whole file on every menu change
(about 1 s at the load limit), and it changed the published `E_TOO_LARGE` details.

**Shape.** `session.data.prepare(source)` reads the source once and returns a `LoadDraft` that
holds the rows: its `tables` (element-assigned ids, file names, every column described as
`data.attributes()` will describe it after the load), the element's guessed `mapping`,
`report(choices)` (the counts the load would produce, recomputed on the held rows with no I/O),
`rows(table, { only: "unmatched" | "rejected" })` as a `RecordPage`, `load(choices)` and
`dispose()`. A mapping is per table: `rowsAre`, `key`, `label`, `source`, `target`, `weight`,
`time`, `edgeId`, and `measurement` for each column (item 2). Its values are literal column names.
`import(source, { mapping })` stays the one-call path.

```ts
// Easy path: one call, no draft.
await element.session.data.import({ config: { file } }, { mapping: { source: "from", target: "to", weight: "trips" } });

// The Data page: read once, show rows and counts, then load.
const draft = await element.session.data.prepare({ config: { file } });
const report = await draft.report();
console.table((await draft.rows(draft.tables[0].id, { limit: 20 })).records.map((r) => r.values));
console.log(`${report.counts.nodes} nodes, ${report.counts.edges} edges, ${report.unmatched.rows} unmatched rows`);
if (report.tooLarge) draft.dispose();
else await draft.load();
```

Compiled, with `element` and `file` declared as in the full program
(`tmp/api-review/item-1/architect-variant.ts`), with strict settings and library checks on, against
the built types plus a stub; a negative case (`{ from: "a" }`) is refused. A join is designed to arrive as optional fields
(`Endpoint.to` and `Endpoint.on`, a node type per table, several sources), which adds to the read
shape without breaking it; this was checked on paper only.

**Changed by the cross-item review.**

- The load used to write the confirmed roles into `data.knownFields`, which are read as
  expressions, so `shared chapters` would have broken again. They are now written quoted (shared
  column rule).
- The draft is what `project.open()` returns for a data file (item 10), so the app has one intake
  verb and never decides by itself which verb a file needs.
- Table ids are unique within a draft only ("rows", "nodes", "edges"). The provenance issue #833
  needs a source id that is unique in the project, and the draft should mint it now. Issue #802's
  rejected rows reuse `DraftRow` plus a reason code.

**One-way doors.** The names `prepare`, `LoadDraft` and the mapping types with every key. The
column roles. `rowsAre` being exactly nodes or edges. The table-id scheme. "Values are literal
names". Absent means "the element's guess" and null means "none". The `unmatched` default `"add"`
(today's behavior).

**Residual risks.**

- Three bugs make any Data page lie today, and must be fixed first:
  - naming the endpoint columns loads 0 edges and reports success;
  - past about 125,000 edges a load fails with an uncoded `RangeError` instead of `E_TOO_LARGE`;
  - a session with no renderer refuses half the load limit.
- A draft holds the parsed file until `load()` or `dispose()`, as much as 860 MB for a 106 MB CSV.
  The element must drop it on the next `prepare` or any load.
- Parsing still freezes the page (162 ms at the load limit, 964 ms at a million edges) until
  PR #770's byte reading lands; item 1 should build on #770 if it is green, to avoid writing the
  read path twice.

---

## 2. What a column measures, and the legend's Other row (#782)

**Verdict: redesign. Confidence: low.**

A bound column of group codes must draw one color per group, not a ramp. The first version added
a five-value `level` that duplicated the existing `type`, had no ordered level (Low, Medium, High
would be colored by group size), resolved the default each time a layer painted (so a saved layer
could change when next month's file crossed a threshold), sized nodes in pixels the element does
not use, and put a second category cap on the legend.

**Shape.** `AttributeDescriptor.measurement` and `FieldDescriptor.measurement`
(`"categorical" | "ordinal" | "quantitative" | "time"`, open), with `measurementSource`
(declared, catalog, file, inferred). Strings and booleans infer categorical, numbers infer
quantitative, time is never inferred. `data.declare(column, declaration)` is one undoable step;
an ordinal declaration carries its `order`. `styles.encode({ column, channel })` colors or sizes by
a plain column in one call. The default scale, palette, range and overflow are decided when the
layer is created and written into it, so later changes never repaint saved work.
`styles.proposeEncoding(spec)` answers whether a column can go on a channel without storing
anything. The legend's existing Other swatch gains `role: "other"` and its count, and is exempt
from the row cap; the legend takes no cap argument.

```ts
import "@graphty/graphty-element";

const { session } = document.querySelector("graphty-element")!;
const department = session.data.attributes().find((a) => a.kind === "node" && a.name === "department")!;

// Codes 1..14 are groups, not amounts. Numbers are drawn as a ramp unless you say so.
await session.data.declare(department, { measurement: "categorical" });
await session.styles.encode({ column: department, channel: "node.color" });

for (const block of session.styles.legend()) {
    for (const s of block.swatches) console.log(s.label, s.color, s.count);
}
```

Compiled (`tmp/api-review/architect/ex-2.ts`); it fails without the new shapes, on exactly
`declare` and `column`.

**Changed by the cross-item review.** The item review used a JMESPath `path`
(`encode({ path: "data.department" })`). That cannot tell a node column from an edge column of the
same name, and `"data.shared chapters"` throws. It now takes a `ColumnRef`. The refusal codes
from `proposeEncoding` follow the shared text and error-code rules, not a kebab-case list of their
own. The legend changes are built with items 6 and 8.

**One-way doors.** The name `measurement`, its four values and that it is open. The
`measurementSource` values. `declare`, its declaration shape and that it refuses result columns.
The `column` key on `encode`. `proposeEncoding` and its result. `LegendSwatch.role`. "Decided once
and stored": a stored layer always draws what it says.

**Residual risks.**

- Writing a palette at creation is safe for a column, whose values are known then. For a run, it
  is safe only if the run has finished.
- A number column of codes that nobody declares still draws a ramp. That is now deliberate and
  documented, and the Data page is where the reader is offered the fix.
- Three bugs ship in the same change:
  - the attribute cache goes stale after attribute writes;
  - the legend orders categories by size, which would break an ordinal order;
  - the 12-row cap can drop the Other row.
- A layer with a huge `bins` value hangs `legend()` (9.3 s and 2.5 GB at `bins: 1e7`). This bug
  exists on master today and is not yet filed. Because opening a project replays layers, it must
  be fixed before item 10 opens other people's files.

---

## 3. Find without selecting (#783)

**Verdict: redesign. Confidence: low.**

The find box lists matches while the reader types, and the selection changes only on a pick. The
first version's own three-line example failed to compile (a numeric id into the `ids` target), and
in plain JavaScript it threw on karate, whose ids are numbers. It would also have published a
second search engine that disagreed with the existing text selection.

**Shape.** `session.find(text, options)` (on the session, not `session.data`, because runs,
layers and notes will be searchable too). It is synchronous and reads a per-revision index. It
returns the `RecordPage` shape (`records`, `offset`, `total`, `revision`) plus at most three value
rows. Each hit is a discriminated union on `kind` (open), carrying `name` (the label column's
value, else the id), `match: { path, value }`, `excludedBy` when a filter hides it, and a ready
selection `target`. Matching follows the shared matcher and the existing prefix grammar
(`exact:`, `<attribute>:`). `regex:` and `=` are refused while typing and still work in
`selection.apply`.

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const box = document.querySelector<HTMLInputElement>("#find")!;
const list = document.querySelector<HTMLUListElement>("#hits")!;

box.addEventListener("input", () => {
    const found = element.session.find(box.value, { limit: 10 });
    list.replaceChildren(...found.records.map((hit) => {
        const li = document.createElement("li");
        li.textContent = `${hit.name} (${hit.match.path}: ${String(hit.match.value)})`;
        li.onclick = async () => {
            await element.session.selection.apply(hit.target);
            await element.zoomToSelection();
        };
        return li;
    }));
});
```

Compiled with `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` against the
built types plus a stub. `zoomToSelection` must also frame selected edges, which it does not
today.

**Changed by the cross-item review.** Find and the Analyze filter share one matcher. Confidence
drops from medium to low: no developer-persona review was run on this item, and its synchronous
promise rests on an index whose build time and memory at the load limit with 69 attributes were
never measured.

**One-way doors.** `session.find`; the hit fields and the open `kind`; the result keys; the
defaults (whole graph, nodes and edges, 20, at most three value rows); what is searched for each
kind (an edge is never found by its id or endpoints); the partial ranking promise; that it is
synchronous.

**Residual risks.** Measure the index (budget: under 8 ms per call after the build) before the
signature is frozen. Moving `selection.apply({ text })` onto the shared engine may change results
for 2.x callers; if so, that part waits for the major. On karate, with no label column set, every
name is the id, so the T12 test ("type a label that differs from the id") passes only if the
sample sets its Name role. Tier 1 drops the find box's "Rows" group (runs, groups, layers) until
those kinds exist.

---

## 4. A node's neighbors with their weights (#784)

**Verdict: approve with changes. Confidence: medium.**

The inspector lists "Javert's 17 connections", strongest first. The first version invented a
fourth vocabulary for a neighbor walk: `"both"` where the element says `"all"`, a bare-string sort,
a free JMESPath weight, and the word "tie".

**Shape.** `session.data.neighbors(id, options)`, synchronous, one walk of the node's rows.
Options: `direction` (the existing `SelectionDirection`, default `"all"`), `weight` (the
`WeightMeaning | null` that runs take; absent means the weight the graph was loaded with), `scope`,
`sort: { by: "weight" | "name"; descending? }`, `offset`, `limit`. Each row: `node`, `name`,
`weight`, `edgeCount`, `excludedBy`. The page adds `measuredBy` (the weight it used, or null when
rows count edges) and `missing`. A neighbor is exactly what the Neighborhood selection selects,
minus the node itself; a missing weight weighs 1, as in a run.

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const list = document.querySelector("#neighbors")!;

element.addEventListener("graphty-node-click", (e) => {
    const page = element.session.data.neighbors(e.detail.nodeId, { limit: 10 });
    list.replaceChildren(...page.records.map((n) => {
        const li = document.createElement("li");
        li.textContent = page.measuredBy ? `${n.name}: ${n.weight}` : n.name;
        return li;
    }));
    list.setAttribute("aria-label", `${page.total} connections`);
});
```

Compiled (`tmp/api-review/architect/ex-4.ts`). It needs one element fix that ships with this item:
the `graphty-*` DOM events are not typed for `addEventListener` today, so `e.detail` fails to
compile.

**Changed by the cross-item review.** The sort was `{ key: "weight" | "name" }`, closed, with a
plan to widen it to attribute names later, which would have brought back the collision the closed
key avoids. It is now `{ by }`, and attribute or result sorts arrive later as `RecordSort` or
`ResultSort` beside it. The page's `weight` became `measuredBy`, because "weight" already meant a
column, an option, a number and a page field. An unknown node id throws the new
`E_UNKNOWN_ELEMENT`, not `E_OPTION_RANGE`.

**One-way doors.** The method and its positional id. The field names. `weight` is always a number,
which rules out a multi-hop row without a new rule. The defaults (all directions, the loaded weight
read as a strength, whole graph, strongest first falling back to name, 100). The semantics (missing
weighs 1, distinct-neighbor total, no self-loops, reciprocal edges merged, equals the Neighborhood
selection). That it is synchronous.

**Residual risks.** An edited weight does not reach the store, so the default weight is the loaded
value; runs share this bug. The element has three rules for a missing weight (store and runs, the
extension view, and multi-table projects later); neighbors follows runs. The "17 connections" chip
must read `neighbors(id).total`, not the degree, or the two disagree on every graph with repeated
edges.

---

## 5. Result values as table columns (#785)

**Verdict: redesign. Confidence: medium.**

The table shows a column for PageRank and sorts by it in the element. The first version addressed
the column by a hand-written path (`"results.pagerank.value"`) naming a run id nobody can know in
advance, assumed every primary field is `value`, and mixed result paths and attribute names in one
sort key, so a CSV column literally named like a result path could pose as one.

**Shape.** `nodePage` and `edgePage` take `columns: readonly ResultColumn[]` (a run, or
`{ run, field? }`) and `sort: RecordSort | ResultSort` (`{ run, field?, descending? }`;
`RecordSort` is unchanged). The page gains `columns?: readonly PageColumn[]`, in request order and
present only when asked: each has `run`, `field`, `path`, `label` (the run's live name), `type`,
`pending` and `values` aligned with the records.

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const run = await element.run("pagerank");

const page = element.session.data.nodePage({ columns: [run], sort: { run, descending: true }, limit: 10 });
const [rank] = page.columns ?? [];

console.log(rank?.label);
page.records.forEach((node, i) => console.log(node.id, rank?.values[i]));
```

Compiled under plain strict and `noUncheckedIndexedAccess` against the built types plus a stub.

**Changed by the cross-item and plan reviews.** The item review said no element API writes result
columns into a CSV, so Export > Data would need a new item. That is wrong: `data/export.ts:470-477`
already writes each run's fields as columns named by `results.path()`. Export needs nothing new
here, but its headers follow the run ids, so they depend on item 11. Confidence drops from
medium-high to medium because `label`, `type` and `pending` were designed from the table's needs,
not from a built table.

**One-way doors.** The three exported types and their member names. `sort` widening to a union
(code that reads `options.sort.key` must narrow first). `columns` as an optional array in request
order. The documented order (ranking order, unmeasured last, ties in graph order, a grouping field
sorted by group size). `undefined` meaning "no value for this element".

**Residual risks.** A community column shows raw group ids while the legend says "Group 1", until
`PageColumn` gains display names. A string in `columns` is a run id, never a path, and `RunId` is a
plain string, so `"data.weight"` fails only at runtime; the error must list candidates. Any run of
any algorithm re-sorts a sorted table, because the sort cache keys on the session-wide tick.

---

## 6. What Analyze shows about each algorithm (#786)

**Verdict: redesign. Confidence: low.**

The Analyze popover needs headings, a filter that finds Betweenness when the reader types
"brokers", a short form of each algorithm's options, and a legend sentence about what a value
means. The first version's category headings could not produce the design's grouping (Components
is "structure" but finds groups), its fixed "darker = more central" is false on a size channel and
on several palettes, its two required fields would break every published plugin, and its
`essential` flag duplicated the existing `advanced`.

**Shape.**

- `session.catalog.algorithmGroups()` returns `CatalogGroup<AlgorithmKey>[]`, derived from each
  algorithm's result shape, so a plugin is grouped with nothing to write. The groups are `rank`,
  `groups`, `paths` and `measure`, an open set.
- `session.catalog.searchAlgorithms(text)` searches with the shared matcher. It returns each key
  with `matchedOn: { source, text, option? }`, so "Adamic-Adar" finds link prediction and
  preselects that method.
- `AlgorithmDescriptor.searchTerms?` and `FieldDescriptor.higherMeans?` ("more central", never a
  channel word) are optional for plugin authors.
- `LegendBlock.reading` is composed by the legend from the channel, the palette's measured
  lightness and `higherMeans`.
- The short form of an algorithm's options is `!advanced && !internal`, which already exists.
  PageRank's weight drops `advanced`, and weight options are typed as numeric edge attributes.

```ts
import "@graphty/graphty-element";

const { catalog } = document.querySelector("graphty-element")!.session;
const panel = document.querySelector("#panel")!;

function section(title: string, items: readonly string[]): void {
    const heading = document.createElement("h3");
    heading.textContent = title;
    panel.append(heading, ...items.map((text) => Object.assign(document.createElement("div"), { textContent: text })));
}

for (const group of catalog.algorithmGroups()) section(group.plainName, group.members);
for (const group of catalog.channelGroups("node")) {
    section(group.plainName, group.members.map((channel) => channel.shortName));
}
```

Compiled together with item 9 (`tmp/api-review/architect/ex-6-9.ts`). The first try used a
generic `startHere?: T` and failed to compile when a channel group was reshaped for display, so
`startHere` is now the key of a member.

**Changed by the cross-item review.** The groups use the shared `CatalogGroup` (the item review had
its own `{ id, plainName, keys }`). The legend reading is `{ code, params, text }`, where
`params` names the channel, the direction and the field. Whether a block can state a reading at
all comes from item 2's `measurement`, not a separate heuristic. The match field is renamed
`matchedOn` so it is not confused with find's `match`. Confidence drops to low, because the
design's popover and the derived groups disagree and the reading's lightness test is not built.

**One-way doors.** `algorithmGroups`, `searchAlgorithms`, the group ids, the `matchedOn` fields and
source ids, `higherMeans`, `searchTerms`, `LegendBlock.reading`, the rule that `higherMeans` never
names a channel, and which shapes fall in which group.

**Residual risks.** Depth-first search (a node metric, visit order) and all-pairs distance land
under Rank, where the design puts them elsewhere. "Measure the graph" is empty until an algorithm
with a graph-level result ships, so the app hides that heading in tier 1. Issue #786 still asks for
the first version and must be rewritten before anyone builds from it.

---

## 7. How many labels the overlap rule hid (#787)

**Verdict: redesign. Confidence: medium.**

The label line says "77 labels, 64 hidden to avoid overlap" and offers Show all labels. The first
version added a second switch with the opposite polarity beside the existing
`layoutBehavior.labels.declutter`, made it an undoable project setting (the element documents it as
a view preference), returned an algorithm-run handle from a setter, put a renderer read on the
session type that also runs in Node, and published counts that did not add up.

**Shape.** One read and one DOM event on the element, because only the element draws:
`element.nodeLabelCounts: { labeled, nodeHidden, hiddenByOverlap }` and `graphty-label-change`,
which fires once the view has stopped changing, never during a gesture. The switch stays
`layoutBehavior.labels.declutter`, off by default, a preference of the view that is not saved in
a project.

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const status = document.querySelector<HTMLElement>("#label-status")!;
const showAll = document.querySelector<HTMLInputElement>("#show-all-labels")!;

function render(): void {
    const { labeled, hiddenByOverlap } = element.nodeLabelCounts;
    status.textContent = `${labeled} labels, ${hiddenByOverlap} hidden to avoid overlap`;
}

render();
element.addEventListener("graphty-label-change", render);
showAll.onchange = () => {
    element.layoutBehavior = { labels: { declutter: !showAll.checked } };
};
```

Compiled with `strict` and `exactOptionalPropertyTypes` against the built declarations plus a
stub. It fails without the stub.

**One-way doors.** `nodeLabelCounts`, `NodeLabelCounts` and the three fields, in particular that a
label outside the view is never counted as hidden. The event name and its cadence.

**Residual risks.** The inspector's "label hidden" note and Export's hidden-label warning are
dropped: a selected node's label is always drawn, so the note never shows, and an exported image
renders at another size, so the on-screen count would not describe it. Whether the reader's Show
all labels choice should travel with a project is the owner's (decision list); moving it into the
project later is additive. PR #676 changes the same label code, and its fate is decided first.

---

## 8. What a run's suggested style did (#788)

**Verdict: redesign. Confidence: medium.**

When a reader runs Louvain, something must say whether its colors painted. The first version said
a run's layers "land on top (today's behavior)". They do not: a suggestion goes beneath a
hand-written layer that drives the same channel, and is dropped when that layer covers every
element (`autoApply.ts:16-22`, `199-215`). It also blamed round 8 on an earlier run covering
color, but a run's layer never holds back a later run. The cause is the app's New Layer button,
which writes a hand-written layer that colors everything; after one press no run colors anything,
silently.

**Shape.** `session.runs.painting(runId)` returns `RunPainting`: a `state` (decided, pending,
opted-out, not-succeeded, no-styles, restored; open) and one outcome per suggestion (`painted`
with its `layerId`, `suppressed` with `byLayerId`, `merged` into a batch sibling, `refused` with
its code; open). It is stored on the run's record, so undo and redo carry it, and it is readable
as soon as `await run` returns. `LegendBlock.coveredBy` reports, as data, the layer above that
covers a block.

```ts
import "@graphty/graphty-element";
const element = document.querySelector("graphty-element")!;
const { session } = element;
const result = await element.run("louvain");
for (const s of session.runs.painting(result.runId)?.suggestions ?? []) {
    if (s.outcome === "painted") console.log(`Louvain now paints ${s.suggestion.channels.join(", ")}`);
    else if (s.outcome === "suppressed") {
        console.log(`Hidden by your layer "${session.styles.get(s.byLayerId)?.name}"`);
        if (s.suggestion.as === "encoding") await session.styles.encode(s.suggestion.spec); // show anyway
    }
}
```

Compiled with `tsc --strict` against the built types plus a stub
(`tmp/api-review/item-8-synth/architect-variant.ts`). The painted case is five lines;
the suppressed case must name "layer", because a layer is what blocked the run.

**Changed by the cross-item review.** `coveredBy` moves into the shared legend change and becomes
a reading of issue #790's per-channel painted counts, so "covered" can be partial and counted
("Covered by PageRank for Color on 77 of 77") instead of a yes or no. `RunResult` gains `id` and
`label` (additive), so every example can hold a run the same way.

**One-way doors.** `runs.painting`, the state and outcome values (open) and their keys,
`coveredBy`. That the decision is a snapshot taken at first completion, kept in undo and not saved
in a project file.

**Residual risks.** The report makes the trap visible; it does not remove it (owner decision 4).
A partial hand-colored layer that sits below older runs sends a new run beneath those older runs,
against "the newest run wins"; this needs its own element issue. Layer provenance is trusted from
files, so "run X hid run Y" can be forged by a shared file until that is fixed. The guide's
examples that await a run and then read `run.result` do not compile today and are fixed in the
same change.

---

## 9. Style channel sections and their order (#789)

**Verdict: redesign. Confidence: medium.**

The Style tab draws fixed sections. The app copies the element's section order and headings today
(`graphty/src/utils/channelControls.ts:164-176`), which the project rules forbid. The first version
froze a set of section names (with Size as its own section, a change the design marks undecided),
added a fourth source of truth beside the channel table, `group` and the app copy, and sorted
`channelsFor`, whose order also drives the renderer's style keys.

**Shape.** `session.catalog.channelGroups(target)` returns `CatalogGroup<ChannelDescriptor>[]` in
display order, every channel in exactly one group, from one table in `channels.ts`. Group ids are
an open set, stable while the group exists; which group a channel sits in and the order may change
in a minor release. Tier 1 ships nodes: Fill (color, opacity), Shape (shape, size), Effects, Label,
Tooltip; edges: Line, Arrows, Label. `channelsFor` is unchanged. `group` is deprecated, removed in
the next major. The example is item 6's above.

**Changed by the cross-item review.** The item review returned `{ key, title, channels }` from a
free function; it now uses the shared group shape (`id`, `plainName`, `members`) and lives on the
catalog beside `algorithmGroups`.

**One-way doors.** `channelGroups` and its place. The group ids are a soft door: renaming one
breaks consumers that stored it; adding or moving a channel does not.

**Residual risks.** The study evidence for moving Size cannot be traced ("12 of 12" appears in the
plan for three different claims), so the re-test, not this page, decides it. Label-style sections
(issue #834) hold a different descriptor type and will be a second `CatalogGroup` source, not this
one. The British "Node Colour" in a published `plainName` needs its own fix.

---

## 10. The project file: save and reopen a whole session (#301)

**Verdict: redesign. Confidence: low.**

The first version invented a second graphty file format beside the graphty document the owner
decided on 2026-09-28 (`design/decisions/2026-09-28-document-formats-first-version.md`), which
graphty-element already writes for notes and styles (`session/notes/document.ts`). The two
disagreed on the identifying field, the extension, the media type, the third-party slot, the
newer-version error and the version rule; the element's own reader would have refused the new
file. It also re-declared the published `project:changed` event with another payload, stored
results by row order (silently shifting values onto other nodes after a hand edit) and promised
that old files open forever.

**Shape.** A project file is a graphty document (`<name>.graphty.json`) holding every member: the
existing data, style and notes members, plus three new ones. `graphty-session` holds config,
layout, visibility, sets, views, the measurement declarations (item 2) and the load mapping
(item 1). `graphty-arrangement` holds positions and pins keyed by node id. `graphty-results` holds
each completed run's provenance, its minted id with `derived` (item 11), an optional label
override (#829), and its columns keyed by node id, with typed arrays in base64 so `Infinity`
survives. A fourth, `graphty-view-state` (camera, selection), is optional and never required to
open the file. `session.project` has `name`, `dirty`, `rename()`, `save()` (returns the text and
a report of what was written, left out and disclosed; Node-safe) and `open(file)`, which accepts any
graphty document or data file and refuses over unsaved work unless told to discard. The browser
download is `element.downloadProject()`, on the element, because `./session` must stay free of the
DOM.

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { project } = element.session;
document.querySelector("#save")!.addEventListener("click", () => element.downloadProject());
document.querySelector<HTMLInputElement>("#open")!.addEventListener("change", async (e) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file || (project.dirty && !confirm("Discard unsaved changes?"))) return;
    const report = await project.open(file, { discard: true });
    if (report.opened === "graph") await report.draft.load();
    for (const problem of report.problems) console.warn(problem.code, problem.what);
});
element.session.on("document:changed", ({ name, dirty }) => {
    document.title = `${dirty ? "* " : ""}${name ?? "Untitled"}`;
});
```

Compiled with strict settings and library checks on (`tmp/api-review/architect/ex-10.ts`); it
fails without the new shapes on `project`, `downloadProject` and the event.

**Changed by the cross-item and completeness reviews.**

- The member table now maps every published project slice, including item 2's new `attributes`
  slice, and the fields items 1, 2, 8 and 11 rely on. Readers keep unknown keys inside each new
  member, so later issues (#805, #807, #829) add fields without a new version.
- `download()` moved from the session to the element: it would have been the first DOM code in
  the Node-safe `./session` entry.
- `open()` returns a load draft for a data file (`opened: "graph"`), making it the one intake verb
  (item 1). `opened` is an open union whose words match issue #821's `files.kindOf()`.
- The status event is `document:changed` and `graphty-document-change`, following the pattern; the
  item review's `project:status` followed neither half.
- The published rule "everything a project file saves is undoable" (`session/types.ts:771-775`)
  is kept: camera and selection live in the optional view member, which never sets `dirty`, and the
  project's name is part of the document, so a rename is one undoable step that sets `dirty`.

**One-way doors.** The three member kinds with their schemas and keys (the id column, the data
fingerprint, the typed-column encoding). How an edge is keyed: by position in this file's data
member plus a fingerprint, unless stable edge identity is decided first (owner decision 5).
`session.project`, `OpenReport.opened`, `E_UNSAVED_CHANGES`, `document:changed`,
`downloadProject`. What sets `dirty` and what never does.

**Residual risks.**

- The container's open and save verbs are not built, and no code calls `openDocument`. They are
  the long pole of the whole schedule.
- At the load limit with 40 runs, a file is about 84 MB, over the container's 64 MB default; the
  project-open limit needs a measurement before the schemas freeze.
- Opening at the load limit is not fully atomic: a failure during ingest leaves an empty session.
- The style document reader has no caps on layers or expressions, and the `bins` hang (item 2) is
  open. Both must be fixed before `open()` reads strangers' files.
- If issue #828 puts several graphs under one session, `open()` replacing one session cannot
  restore them; decide that before `session.project` freezes.

---

## 11. Readable run names (PR #726, merged, not released)

**Verdict: redesign before 3.6.0 is published. Confidence: medium.**

PR #726 gives an unnamed run a readable id (`pagerank`) instead of a hashed one
(`degree_0bkzd1n0p2dnik`). It also put a setting's value into the id (`louvain_resolution_1_5`),
which has three consequences:

- Tuning a setting starts a new run instead of revising the old one, so ten steps of a resolution
  slider leave ten Louvain runs, each with its own layer. This breaks 3.5's re-run in place, and
  the design's "Rerun revises the same row".
- An id stops describing its run after a retune.
- Values that differ only in sign collide (`katz_alpha_0_05` for both 0.05 and -0.05).

**Shape.** Mostly deletion. The id is the algorithm key with underscores (`pagerank`,
`shortest_path`) and never holds a value. The same computation re-runs in place, as in 3.5. A
different computation under a taken id gets `_2`, `_3`. `start(..., { separate: true })` keeps a
second run side by side. A minted id is written into the stored command and marked `derived`, so
undo, replay and a reopened project reproduce it. `as:` creates, re-runs, or throws
`E_DUPLICATE_ID` when the name holds a different computation. The label is computed live and
qualified by the differing option's plain name. `suggestedName` and `BUILT_IN_SETTINGS` are
removed before release.

```ts
import type { Graphty } from "@graphty/graphty-element";

const element = document.querySelector("graphty-element") as Graphty;

const influence = element.run("pagerank"); // id "pagerank", label "Influence"
await influence;
console.log(influence.id, influence.label);

// Change a setting: the same run re-runs in place, and every layer bound to it repaints.
await element.run("pagerank", { dampingFactor: 0.5 });

// Keep both side by side: its id is "pagerank_2"; both labels gain what tells them apart.
const damped = element.run("pagerank", { dampingFactor: 0.85 }, { separate: true });
await damped;
await element.session.styles.encode({ run: damped, channel: "node.size" });
```

Compiled with `tsc --strict` against the built types; without the stub it fails only on
`separate`.

**Changed by the cross-item review.** The qualifier ("Damping Factor 0.5") is reader text that
becomes legend text and CSV headers, so it follows the shared text rule. `RunResult` gains `id` and
`label`, so the awaited-result style of item 5 and the handle style above both work.

**One-way doors (closing when 3.6.0 publishes).** The default ids. The `_N` suffix and that a
minted id is stored and never reused within a project. `separate`. The `as:` rule.

**Residual risks.** A release before this merges publishes value-bearing ids and the hook, and
saved files holding `louvain_resolution_1_5` must then load forever (owner decision 1). Numbered
ids mean nothing across sessions, so a styles-only document or a recipe must name a run with `as:`.
A run over the visible elements is frozen to the filter in force when it started, so re-analyzing
after a filter change makes `degree_2` rather than revising the row. Nobody has yet checked whether
master or the app already depends on `suggestedName`; that grep comes before the deletion.

---

## How this was reviewed

**Blind authors.** For each item, an author who saw only the published docs and the first version's
API section wrote the canonical example and compiled it against the built types:

| Item | Result against the first version                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------ |
| 1    | Failed: the one-line mapping lacked `tables` (TS2741), and two types had to be invented                            |
| 2    | Compiled with a stub, but the result could not be used as a binding (TS2322)                                       |
| 3    | Failed: a hit's id is not assignable to the `ids` target (TS2322); throws at runtime on numeric ids                |
| 4    | Compiled only with a guessed cast: the click event's `detail` is untyped (TS2339)                                  |
| 5    | Failed under `noUncheckedIndexedAccess` (TS2532); the guide's run-id pattern fails (TS2339)                         |
| 6    | Compiled on the second try; the first failed reading the algorithm from a result (TS2339)                          |
| 7    | Compiled with a stub; a probe showed the setter returned an algorithm-run handle                                   |
| 8    | Compiled, but `landing` also compiled on style writes and batches, where it means nothing                          |
| 9    | Compiled, but needed two entry points and printed raw keys as headings                                             |
| 10   | The example compiled only by ignoring the event payload; the proposed declarations failed against the published types |
| 11   | Failed: `RunResult` has no `id` or `label` (TS2339)                                                                |

**The revised shapes were not given to a blind author.** They were compiled by the reviewers and
the architect, against stubs, with the built types of this worktree. That worktree is 91 commits
behind master, and catalog, run and encoding sources have changed since; items 5, 8 and 10 were
designed before #726 merged. Before re-approval: rebase, rebuild, re-run every check, then a
fresh blind author per item from its new docs page. The architect's merged checks are in
`tmp/api-review/architect/` (`tsc.log` empty: exit 0; `tsc-nostub.log`: the expected failures).

**The lenses.** Each item was read through five lenses: developer experience with the developer
personas, evolution, consistency, security and privacy, and performance and implementability.
Not every lens left a report. The review folder holds persona reports for items 2, 4, 5, 10 and 11,
security reports for items 2, 3, 4, 6 and 10, and one performance report (item 1). Several
verdicts cite evolution and consistency findings whose reports were never written, and item 3 had
no developer-persona pass at all. Those verdicts rest on the synthesizer's summary, and the owner
cannot check them.

**Cross-item review.** All eleven revised items read together. It produced the shared rules above,
the deferred-breaking-change list, and the changes marked in each item.

**Design and plan reviews.** The tier 1 design was checked against the round 7 and 8 study
records and the owner's decisions. The plan was checked against the repository's state today. Their
accepted findings are applied to `tier1-design.md` and `plan.md`, each under "Adversarial review
changes".

**Completeness review.** A last critic asked what every other review missed. It found:

- the missing second blind pass;
- the DOM call in `./session`;
- the missing lens reports;
- no accessibility lens on items 2, 3, 4, 6 and 8, which feed the screen-reader representation
  issue #800;
- two security findings deferred but never filed: the legend `bins` hang, and the Other row
  carrying every lumped category name;
- no check against the designloom workflows, which are the UI requirements.

**Rejected, and why.**

- *Express item 1's mapping as source config plus `knownFields`* (consistency). Neither can say
  which table's column joins to which, and the join is why the item was redesigned.
- *Give `knownFields` a literal-name form* (cross-item). Writing the name quoted, with the rule the
  element already has for result paths, solves it without a second config form.
- *Give every row type its own selection `target`* (cross-item). Widening the `ids` target to every
  id type is one fix for every row type, including future ones.
- *Build the Style tab's sections from the existing `group` field* (design review). `group`
  splits text and color differently from the design, and changing its values is a breaking change;
  the derived group list is additive.
- *Make the project file a zip with binary columns* (evolution). The owner decided "JSON only"; typed
  base64 columns inside JSON recover most of the size.
- *Make find asynchronous now, or default it to visible elements* (security, performance). The load
  limit bounds the worst case, the async name is reserved, and a filter is a view, not access
  control.
- *Ship the legend reading only as finished text* (item 6's own review). Overruled by the shared
  text rule: it carries its parts.
- *Report a suppressed suggestion as a `style:problem`* (consistency). Suppression is the policy
  working, not a failure; under a brand-palette layer it would fire on every run.

**Not yet done.** An accessibility pass on items 2, 3, 4, 6 and 8. A traceability table from the
designloom workflows to the tier 1 tasks and these items. The missing lens reports. A measured find
index and project-open limit. Each is a precondition of re-approval, not of the owner's direction
decisions.

---

## The owner's decisions (2026-10-03)

- **Approved, all items as recommended**, except:
  - **Item 9 (style channel sections) is dropped.** Arranging the Style tab is presentation, which
    the app owns; the app groups channels with the existing `ChannelDescriptor.group`. PR #839 and
    issue #789 are closed.
  - **Item 11 (readable run names, #726) is released as built.** No rework; releases resume.
  - **Item 2:** the minimal inference stays (strings and booleans categorical, numbers
    quantitative, time and ordinal never inferred); a declaration always wins.
- **New rule: graphty-element is neutral about presentation.** Verbatim: "graphty-element MUST be
  neutral about how information is displayed and MUST NOT be opinionated about presentation or
  information structure. the division of labor is that graphty app (or other apps that use
  graphty-element) will make ALL presentation decisions, and all the logic for manging data and
  rendering it lives in graphty-element." Consequences for this page:
  - Reader-facing text (decision 3) becomes `{ code, params }` with no default English; the app
    writes the words.
  - Item 6 reports each algorithm's facts (result shape, options); no `sentence`, `plainName`,
    category headings or "start here" groupings from the element.
  - Item 8 reports what a run's style did as data; no `reason` sentence.
  - The shared `CatalogGroup` shape and its `plainName` are dropped with item 9 and item 6's
    headings.
