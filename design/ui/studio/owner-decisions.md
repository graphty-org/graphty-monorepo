# Decisions waiting for the owner

Changes made locally on the studio branch that add to or change graphty-element's public API. Each
one is a contract with third-party consumers once it is published, so each needs the owner's yes
before it lands on master. Newest first.

## 2026-10-07 -- Why a selector was refused, as a code: `E_BAD_SELECTOR` `details.reason`

**What.** Every `E_BAD_SELECTOR` refusal now carries `details.reason`, a stable code, beside the
existing `details.position` and the other details. An expression selector (also what
`select({ where })` and Find's `=` queries use) gives one of `unclosed-quote`,
`bare-word-needs-quotes`, `bad-quoted-name`, `unsupported-syntax`, `pipe-not-supported`,
`expression-reference-not-supported`, `number-needs-backticks`, `bad-character`, `dot-needs-name`,
`name-contains-dot`, `function-not-supported`, `unclosed-parenthesis`, `missing-operand`,
`not-needs-parentheses`, `trailing-input`, `quoted-whole-expression` or `reads-no-attribute`. A
selector of the wrong shape gives `bare-string`, `not-a-selector`, `where-missing`,
`has-path-missing`, `ids-not-a-list`, `not-an-id`, `top-path-not-a-result`, `top-n-not-whole`,
`bad-member-scope` or `unknown-kind`. One existing detail moves: a refused `member` selector used to
put the scope parser's own details under `details.reason`; they are now under `details.scope`. The
query language itself is unchanged. `weight > 3` is refused with `reason: "number-needs-backticks"`,
`position: 9`. The codes are documented on the error code and in the source, not exported as a type.

**Why.** The element returns facts and the app writes the words. Until now the only way for a
consumer to tell a reader what was wrong with a query was to parse the English message. The app's
Find box shows nothing at all for `=weight > 3` today (the refusal escapes as an uncaught error);
with a code it can say "put the 3 in backticks" in its own words.

**Alternatives.** Export the codes as a union type: a stronger contract, but every new refusal
would then be a type change; easy to add later. Keep only the message: every consumer parses
English. Use a separate error code per mistake: too many top-level codes for one kind of failure.

**Owner question.** Should the query language accept a bare number (`weight > 3`) instead of
refusing it and asking for backticks (`` weight > `3` ``)? JMESPath, which the language is a subset
of, does not, so accepting it would make an accepted selector mean something JMESPath would refuse;
but nearly every person who types a comparison writes the bare number first.

## 2026-10-07 -- Every run reads the loaded weight: `descriptor.weightMeaning` and one `weight` option

**What.** Every algorithm with a weighted form now reads the weight the graph was loaded with, unless
its run says otherwise. The catalog states, per algorithm, which meaning of weight it reads: new
field `AlgorithmDescriptor.weightMeaning`, `"strength"` (PageRank, Louvain, Leiden, label
propagation, Girvan-Newman, Markov and spectral clustering, min cut), `"distance"` (shortest path,
A*, all-pairs distance, Kruskal, Prim), `"capacity"` (max flow), or `null` (degree and every other
algorithm with no weighted form). Each algorithm that reads one takes one uniform `weight` option
(it appears in `descriptor.options`, type `attribute`, on edges): absent means the loaded weight,
`null` means unweighted, a column name or `{ attribute, meaning }` overrides it for that run.
A strength reader reads a strength or a weight nobody gave a meaning; a distance reader reads only
a distance; a capacity reader only a capacity. A weight of another meaning is left unread -- the run
counts edges -- and the run says so in a new caveat `caveats.weightSkipped`, a coded fact (new
exported type `WeightSkip`): `{ code: "weight.meaning-mismatch", params: { attribute, meaning,
reads } }`, where `meaning` is null when nobody said. `caveats.weight` now names the column the run
actually read (it was a hardcoded `"weight"` on thirteen algorithms, and `"capacity"` read as a
strength on max flow), or null. Breaking for PageRank: its default changes from unweighted to the
loaded weight, and its old `weight` option (a string, default null) becomes the uniform one, moved
to the end of its options. `WeightMeaning.meaning` gains `"capacity"` (recorded with the weight
meaning at load). On messages.csv (weight column `emails`, no meaning): PageRank and Louvain read
`emails` as a strength with no option; shortest path counts hops and reports
`weight.meaning-mismatch` naming `emails`; told `{ attribute: "emails", meaning: "distance" }`,
or loaded with that meaning, it reads it (p01 to p12 costs 6, not 1 hop).

**Why.** The owner's rule: every run uses the weight chosen at load. Before, community and path runs
read the loaded weights silently, PageRank ignored them unless told, and the same column was a
strength to Louvain and a distance to Dijkstra -- a graph fact the app would otherwise have to
decide per algorithm. Reading a similarity as a distance gives a wrong path, not a worse one, so the
element refuses that reading and says so instead of guessing.

**Alternatives.** Keep per-algorithm weight options: every consumer must learn which algorithm
takes which name. Convert a strength into a distance automatically: see the question below.
Refuse the run instead of counting hops: a reader asking "shortest path" on an email graph gets
nothing, where hops are a true answer the caveat qualifies. A plugin's descriptor states no
`weightMeaning` yet (its own `weights` declaration still applies); extending `defineAlgorithm` is
left for when a plugin needs the uniform option.

**Owner question.** A distance reader given a strength (emails, friendship strength) counts hops
today. Should it convert instead -- `1/w`, `1 - w` (for a weight in 0..1), or `-log w` (for a
probability) -- and if so, which, chosen by whom? This build counts hops and says so, because
any conversion silently picks one of three different answers.

## 2026-10-07 -- A filter on an edge attribute narrows the edges: `nodes: "all" | "ends"`

**What.** A `range` or `categories` rule (in `visibility.set`, a rule set or any rule tree) now
speaks about each half whose elements carry the attribute. Before, both always read nodes only, so
a rule on an edge column such as `{ kind: "range", attribute: "data.weight", min: 4 }` found no
node with a weight, hid every node, and with them every edge: 0 nodes and 0 edges. Now that rule
keeps the edges of weight 4 or more. Both leaves gain an optional field `nodes` (new exported type
`AttributeLeafNodes`): `"all"`, the default, says nothing about nodes, so every node stays (on the
friends sample: 20 nodes, 12 edges); `"ends"` keeps only the nodes at the ends of a kept edge (19
nodes, 12 edges). A rule on a column both halves carry narrows both; with `"ends"` a node must pass
and be an end. A column neither half carries still holds no node and is reported in
`unresolvedPaths`, as before. The value source a session builds gains an optional `halvesOf(path)`
on the exported `FilterValueSource`, so a rule asked about one element still reads one element.

**Why.** "Show only the strong friendships" is a tier 2 task, and the element's documented rule
model (each leaf speaks nodes, edges or both, and is silent about the rest) already covers it; the
two attribute leaves simply ignored the edge half. Readers ask two different questions of an edge
filter -- "which ties are strong, among everyone" and "who has a strong tie" -- and the second
cannot be built from the first without a neighborhood walk the app must not do, hence the option.

**Alternatives.** A new leaf kind (`edge-range`): a second spelling of the same rule, and every
consumer must pick the right one by knowing where a column lives. A required `on: "nodes" |
"edges"` field: explicit, but it breaks every stored rule and asks the consumer for a fact the
element already knows. Defaulting to `"ends"`: matches some readers' first guess, but contradicts
the documented silent-half rule and makes `any` / `all` groups with node leaves behave
surprisingly. Expressing "ends" as `{ any: [...] }` of an `edges` leaf and a neighborhood: not
possible today without listing seed nodes.

## 2026-10-07 -- A run goes out of date when its data changes, and says why: `StaleNote.reason`

**What.** `run.stale` (and `run.record.stale`) is no longer null after a load or an edit changes
the data the run read while its scope still holds the same nodes and edges. The note gains
`reason: "data-changed" | "scope-changed"` (new exported type `StaleReason`): `data-changed` when
the graph's node and edge records, endpoints or weights differ from when the run started (a
reload of the same people with new weights), `scope-changed` when the same data resolves to other
elements (a filter, the selection or a set changed). Data wins when both happened. The run record
carries the digest it compares, as a new optional field `scope.data` on `RunScopeRecord`, so a
saved project keeps it; a record without it (an older file) compares scopes only, as before.
Starting a run again under an id whose data changed now re-runs it instead of returning the old
result. A replacing load keeps runs, style layers and notes (checked; no change needed).

**Why.** Staleness compared the scope's membership only, so replacing a file with one holding the
same nodes and new weights left every PageRank, community and path run looking current while its
numbers described the old data. The tier 2 design shows such a run as out of date with a reason
the reader can act on ("the data changed" means re-run; "the filter changed" may be intended), and
the app must not compute that itself.

**Alternatives.** Compare an input counter instead of a content digest: cheaper, but reloading the
same file would mark every run out of date. Track only the columns a run read: exact, but the
element does not yet record which attributes an algorithm read (weight, node weight). Put the
digest inside the scope digest: the scope digest is documented as membership only, and merging
them loses the reason. Edge ids are left out of the digest, because the element assigns them per
load; an edge-metric run's values after a reload of the same file are therefore not flagged even
though they are keyed by the old edge ids (open).

## 2026-10-07 -- Filter steps: `visibility.steps` and `visibility.setSteps()`

**What.** The visibility filter can be an ordered list of steps `{ id, on, rule }` (new exported
type `FilterStep`; `rule` is the existing `RuleTree`). The steps that are on combine with AND, in
order, and with the existing single filter (`visibility.set`), which keeps working unchanged.
`session.visibility.steps` reads the list; `session.visibility.setSteps(steps)` replaces it and is
one undoable step (new op `visibility.steps` in `COMMANDS`). The step's history fact names what
changed by diffing the list: `visibility.step-add`, `-edit`, `-on`, `-off`, `-remove` with
`{ id }`, or `visibility.steps` with no params for a reorder or several changes at once.
`plan({ op: "visibility.steps", steps })` returns a new `PlanEffect` kind `"steps"`:
`{ start: { nodes, edges }, steps: [{ id, nodes, edges }] }`, the counts before the first step
and after each step that is on. The project file's `graphty-session` member saves `steps` beside
`filter` only when there are some, so a project without steps saves exactly as before; a step
that is off is saved and reopened off.

**Why.** The tier 2 design shows a filter as a list of steps a reader ticks on and off, each with
its own "n left" count. The element had one filter value: the app would have had to combine
rules itself, keep the unticked ones in its own state (lost on undo and on reopen) and count each
prefix itself, which is graph computation in the app.

**Alternatives.** Four verbs (`addStep`, `editStep`, `toggleStep`, `removeStep`): more surface for
the same thing, and a consumer editing a list in a form already holds the whole list. Fold steps
into the single filter as `{ kind: "all", of: [...] }`: loses which rules are off. Per-step counts
on `visibility.summary` (live, always computed): a pass per step on every change, paid by every
consumer; `plan` computes them only when asked. Not decided by the design and not built: OR or NOT
between steps (only AND), and merging a dragged step's edits into one history step (every call
is its own step; a consumer dragging a slider can wrap the drag in a transaction).

## 2026-10-07 -- Every load is kept as a source: `data.sources()`

**What.** `session.data.sources()` returns one entry per load still in the graph, oldest first:
the `DataSourceDescriptor` fields (`type`, `name`, `size`, `config`) plus `tables` (the names of
the tables the load read) and `added` (`{ nodes, edges }` it added). A replacing load resets the
list to itself; a `{ mode: "merge" }` load appends. The list is a graph value, so undo and redo
move it, and the project file's `graphty-data` member saves it as `sources` beside `source`
(an older file without it opens with an empty list). `data.source()` is unchanged and still
describes the last load; `renameSource` also renames the last entry. New exported type
`LoadedSource`; `data.import` commands carry an optional `tables`, `data.setSource` an optional
`sources`.

**Why.** Each load overwrote the graph's one source descriptor, so after adding messages.csv to
friends.csv the app could list only the last file (Sources showed one row, the header named the
last file). A consumer cannot rebuild the list itself without recounting what each load added.

**Alternatives.** Keep only `source()` and let the app keep its own list (state the app would
own, lost on undo and on reopen). Make `source()` return an array (breaking). Record the list in
the load report (`lastImport()` describes only the last load, and is not saved).

## 2026-10-07 -- Focusing the element focuses its drawing (`delegatesFocus`)

**What.** `<graphty-element>`'s shadow root is now opened with `delegatesFocus: true`, so
`element.focus()` puts keyboard focus on the canvas inside it, and a dialog or menu that returns
focus to the element (as Mantine's do, to whatever had focus when they opened) lands on the
drawing. The API report gains `static shadowRootOptions: ShadowRootInit` on `Graphty`. With it,
`render()` now returns nothing instead of the graph container (`render(): unknown`, was
`render(): Element`): the container is already in the shadow root from `connectedCallback`, and
returning it made Lit move it on the first update, which took focus off the canvas when a page
focused the drawing as it mounted the element.

**Why.** The drawing stopped taking focus on its own (the canvas has no `autofocus`), so a page
must be able to hand focus to it after a graph opens, and a dialog opened from the drawing must be
able to give focus back. Without this, both dropped focus to the page body (WCAG 2.4.3): the host
has no tab stop of its own, so focusing it did nothing. A consumer cannot reach the canvas without
reaching into the shadow root.

**Alternatives.** A public `focusDrawing()` method (a second way to say `focus()`). Making the
host itself focusable with `tabindex` (two tab stops for one drawing, and the host is not what
takes keys). Leaving `render()` as it was and asking pages to wait for `updateComplete` before
focusing (every consumer would have to know about Lit's first update).

## 2026-10-07 -- A 2D camera's `zoom` is documented as relative to a half-width of 5 units

**What.** `CameraState.zoom` (2D) now has a doc comment: zoom 1 shows 5 world units either side
of `pan` across, zoom 2 shows half that, so a half-width of `h` units is `5 / h`. That is how
`setCameraState`, `getCameraState`, `setCameraZoom` and `zoomStep` have always read it. The
built-in `fitToGraph` view now answers in that unit too; it used to answer in pixels per world
unit, with the aspect ratio inverted, so in 2D Fit, Frame selection and `zoomToNodes` zoomed into
a single edge on any graph more than a few units across. The custom-cameras guide's 2D example
used the same wrong unit and is corrected. No exported name or type changes.

**Why.** The camera and the view disagreed about what the number meant, and nothing said which
was right. A third party writing a 2D camera view needs to know the unit.

**Alternatives.** Redefine `zoom` as pixels per world unit (changes what every saved camera
state and every `setCameraZoom` call means; a breaking change). Pass the half-width at zoom 1 to
a view in `CameraViewInput` (a new field for a number that never changes). Let a 2D view answer
with `orthoLeft`/`orthoRight` instead of a zoom (two ways to say one thing).

## 2026-10-07 -- The element's `aria-label` names its canvas

**What.** `<graphty-element>` now watches its own standard `aria-label` attribute and copies it onto
the canvas inside its shadow root, the one part of the element that takes keyboard focus; changing
or removing the attribute changes or removes the canvas's name. The attribute is a new entry in
`observedAttributes`, so the API report lists `observedAttributes` and `attributeChangedCallback`
on `Graphty`, and the generated JSX props gain `"aria-label"`. Two behavior changes ship with it
and add no API: the canvas no longer carries `autofocus`, so mounting the element never pulls the
page's focus into the drawing, and the browser's own focus ring is drawn just inside the canvas
(`outline-offset: -2px`), so a page that clips the box the element fills no longer hides it.

**Why.** The canvas is in every keyboard walk through a page, and a screen reader announced it as
"Canvas" with no name (WCAG 4.1.2); its focus ring was drawn outside its box and cut off by the
app's clipped canvas panel (WCAG 2.4.7). A consumer cannot reach into the shadow root to fix
either, and the words belong to the page, so the page's standard attribute is the door.

**Alternatives.** A new `canvas-label` attribute or property (a second, element-specific name for
what `aria-label` already means). `role="img"` plus a label on the host with the canvas taken out
of the tab order (the canvas's keyboard camera controls need focus). A built-in English default
name (the element would be writing words; the app owns them). A themable focus-ring color (a new
CSS variable; the browser's ring already meets the need).

## 2026-10-07 -- `catalog.optionsFor` lists the columns a grouping layout can group by

**What.** `session.catalog.optionsFor(key)` now fills `values` on a "partition" option on nodes
(the `groupBy` of the Rings by group, Two columns and Columns by group layouts: catalog ids
`shell`, `bipartite`, `layers`), as it already did for "node-id" and "node-set" options. There is
one choice per column that can group the nodes: each categorical node attribute (value: its
name, label: its `plainName`), then each finished run's categorical node field (value: its
`results.<run>.<field>` path, label: the run's label). Key and label columns, and any column with
a value per node, are left out. No exported name or type changes; a partition option that used to
come back without `values` now comes back with them. `layout.set` already accepted a run's path as
`groupBy`, so nothing else changed.

**Why.** After a community run, the graphty app kept the grouping layouts disabled with "Needs a
node attribute to group by", because the app decided which columns can group by reading only the
graph's attributes. Which columns can group a layout is a fact about the data, so the element
answers it, run results included, and the app shows the element's list.

**Alternatives.** A new method such as `data.groupings()` (a new exported name for one question
`optionsFor` already exists to answer). Leave the decision in the app and add run results there
(graph logic in the app, which a third-party consumer would have to rewrite). Fill `values` for
every "attribute" option too (no consumer needs it yet).

## 2026-10-06 -- An export writes a partition's group as its rank, not the algorithm's group id

**What.** When a community-detection result (Louvain, label propagation, connected components and
the other "community"-shaped results) is exported, the `results.<run>.group` column now holds the
group's rank by size -- 1 for the largest group, ties ordered by group id -- instead of the
algorithm's own group id, and the graph-level `results.<run>.sizes` table's `group` values are
the same ranks. Every export format gets this, CSV first among them. No exported name or type
changes, and the live result (`session.results.get(run)`) still carries the algorithm's ids;
only what a file holds changes. Files exported earlier keep their old numbers, so a reader who
compares an old file with a new one sees different group numbers for the same partition.

**Why.** The run summary, the legend and the data page all name a group by this rank ("Group 2,
17 members"), while the CSV wrote the raw id ("5"). A report writer could not join the exported
table to the picture or the legend. The algorithm's ids carry no meaning of their own, so the rank
loses nothing a reader could use.

**Alternatives.** Keep the raw id and add a second column, `results.<run>.groupRank` (two
numbers for one group, and the one a reader sees first is still the wrong one). Write the
app's words ("Group 2") into the cell (the element would be writing English; the app owns the
words). Leave the file alone and have the app relabel the legend with raw ids (the summary's
largest-first numbering is what makes "Group 1" mean something).

## 2026-10-06 -- The force layout's seed default is `null` again (no change from master)

**What.** The studio branch had changed the published default of the default force layout's
`seed` option (`ngraph`, catalog id `force`) from `null` to `1`, and seeded that layout by default
on both of its drivers (the processor and an attached accelerator). That change is undone: the
option's default is `null` again, the default force layout starts from ngraph's own placement, and
the element exports no default-seed constant. The published contract is master's again, so there
is nothing to approve; it is listed because the held pull request that seeded the default (issue
#801) must not land as it stands. The random layout keeps the default seed of `1` it already had on
master.

**Why.** The owner decided on 2026-10-06 that graphty-element imposes no default layout seed: a
consumer that wants the same drawing every load passes a seed. The graphty app does so: it
declares the force layout with seed 1 on the element's tag, so every project starts seeded (as
where the project starts, not an undoable step), and it passes the same seed with every method the
reader picks in the Layout group.

**Alternatives.** Keep the element's default seed (the reverted change; overruled by the owner).
Give the random layout no default seed either (would make the element's own "same every time"
recommendation for large graphs untrue unless a consumer passes a seed; not asked for).

## 2026-10-06 -- `captureScreenshot({ legend })`: a key drawn into the exported image

**What.** `ScreenshotOptions` gains one optional field, `legend?: readonly
ScreenshotLegendSection[]`, and the root entry point exports one new type:

```ts
interface ScreenshotLegendSection {
    title: string;
    rows?: readonly { label: string; color?: string; value?: string }[];
    ramp?: { min: string; max: string; colors?: readonly string[] }; // no colors: a size wedge
    note?: string;
}
```

When the field holds sections, the element draws them as a light card at the image's top left,
sized as it would be on the canvas (it scales with the 2x and 4x sizes), after any supersampling
and before the download or the clipboard write. Absent or empty, nothing changes. Not breaking.

**Why.** An exported picture had no key, so a reader of the report could not tell what the colors
or sizes meant (issue #133). The image is drawn by the element, and the clipboard copy has to be
started from the element's own capture, so only the element can put the key into the file. The
element draws exactly the words it is given: the app builds the sections from the same
`styles.legend()` blocks and the same words as its legend card, and passes them only while the
card is shown, so there is one legend switch and no export-only option.

**Alternatives considered.**

- `legend: true`, with the element writing the section titles itself from `styles.legend()`.
  Simpler for a consumer, but the element would write reader-facing words ("Color: PageRank"),
  which the presentation-neutral rule forbids.
- The app composites its own card onto the returned image. Breaks the clipboard path (the copy
  must start inside the capture to keep the browser's user gesture) and leaves every other
  consumer without a key.
- Accept a rendered image (a canvas or bitmap of the consumer's own legend) and only place it.
  Most flexible, but a consumer must render HTML to a bitmap, which browsers do not offer simply.

**Open points for the owner.** The field and type names; whether the card's place (top left) or
its look (light card, system font) should be options -- today they are fixed.

## 2026-10-06 -- An undirected graph draws its edges without arrowheads

**What.** graphty-element's default edge look now depends on the graph: an edge of a directed graph
draws a `normal` arrowhead as before, and an edge of an undirected graph draws none. A style layer
that sets the arrowhead type still wins either way (a reader can put arrows on an undirected graph,
or take them off a directed one). The exported `defaultEdgeStyle` object no longer carries an
`arrowHead` entry (its type is unchanged), and the `edge.arrowHead` channel descriptor's default is
stated as `"normal"`, the head a directed graph draws. The element's own "Edge defaults" layer no
longer writes the arrowhead type; the renderer adds the head when the graph is directed. Not a type
change; a change to the default picture. One new public read: `DataManager.directed` (a boolean
getter) that the renderer uses to decide; it is in the graphty-element API report.

**Why.** Every sample in the app is undirected (marriages, shared chapters, club ties, games) and
was drawn with arrows while the Graph panel said "Undirected". Arrows on a graph whose ties have no
direction invite a wrong reading: asked whether one node can reach another, a reader follows the
arrows and answers "no".

**Alternatives considered.**

- Leave the default and have the app add a "no arrows" layer on undirected graphs. An app
  workaround: every other consumer would still draw arrows on undirected graphs, and the layer
  would sit in the reader's layer list as something they did not add.
- Keep the arrowhead in the element's "Edge defaults" layer and rewrite that layer whenever the
  graph's direction changes. The layer is part of the undo baseline, so undo would bring back the
  old direction's arrows.
- A new arrow type such as `"auto"`. Adds a public enum value that every style editor and every
  saved style would have to understand.

**Open points for the owner.** Whether `explain()` and the layer list should name the arrowhead a
directed graph draws (today they do not list it, since no layer writes it).

## 2026-10-07 -- A covered legend block is left out by the app (no change from master)

**What.** The studio branch had changed `styles.legend()` to stop returning a block whose channel
a higher, enabled layer paints on every element the block's layer reaches. That change is undone:
the element returns master's contract again, where such a block is still returned and carries the
neutral fact `{ code: "legend.painted-over", params: { layerId, name } }` in `facts`. The graphty
app leaves every block carrying that fact out of its legend card and out of the key drawn into an
exported image. The published contract is master's, so there is nothing to approve.

**Why.** After Degree and then Louvain, every node shows its group color, and a "Color:
Connections" key for paint no node shows is a false claim. Master now reports the cover as a coded
fact, which is the option this entry used to list as the alternative: the element states the fact,
and each consumer decides what to show. A layer panel that wants to grey a covered layer can read
the same fact.

**Alternatives.** Keep the branch's element change and drop covered blocks inside the element
(changes what an existing call returns, and hides the fact from a consumer that wants to show it).

## 2026-10-07 -- A history code for moving a run's layers: `algo.move`

**What.** `HistoryCode` gains one member, `"algo.move"`, with the params `run` (the run's id) and
`algorithm` (its algorithm, or null when unknown) -- the same params as `algo.remove`. It is the
fact on the history step the `algo.move` command records (`session.runs.move(id, before)`, which
moves a run's style layers in the stack). Not breaking: the type documents that new codes may be
added in a minor release.

**Why.** Every history step now carries a coded fact, and the app words each code itself. The
studio branch's `algo.move` command predates that rule and had no code; without one the step
could only be worded from a generic code.

**Alternatives.** Record it as `style.move-layer` (that code names one layer, and a run moves
several); record it as the generic `transaction` (the app could not say what moved).

## 2026-10-07 -- A GraphML or GEXF file that breaks off is refused, not loaded in part

**What.** Master (issue #1218) and the studio branch settled the same defect two opposite ways. On
master, a recognisable GraphML or GEXF file that breaks off -- a stray end tag, a tag or quote left
open, garbage after the last tag, a file cut off mid-tag -- keeps every node and edge read before
the break, and `LoadReport.errors` gets a `"parse-error"` entry with the line. On the studio branch
the load is refused with `E_PARSE_FAILED`, with the line in `details.line`, and nothing is added.
The merged branch keeps the refusal. `LoadReport.errors` stays as master built it for everything
else (a CSV row a reader skipped, a refused row); a broken GraphML or GEXF file just never reaches
it. The data sources and load preview guides and the `LoadReport` documentation say so. No type
changes; a change in what an existing call does compared with master.

**Why.** A graph built from part of a file looks like a whole one. In the study, a reader handed
a GraphML file cut at 55% saw 5 nodes and 0 edges and no sign of trouble; with the refusal, the
broken-file task passed in every round. Master's report entry only helps a consumer that knows to
read `lastImport().errors` after a load that appeared to succeed, and the graphty app does not read
it today. GML, DOT and Pajek already refuse a file that cannot be read whole, so the refusal also
makes every graph format behave the same way.

**Alternatives.** Keep master's partial load and have the app read `lastImport().errors` and warn
(every other consumer still gets a partial graph by default). Add a load option such as
`partial: "keep" | "refuse"` (new public API; the default still has to be chosen).

## 2026-10-07 -- "Fit to graph" can keep the current angle: `keepAngle`

**What.** The built-in camera view `fitToGraph` declares one option, `keepAngle` (boolean, default
false), in its catalog descriptor. With it on, in 3D the view frames every node from the direction
the camera looks from now -- the pivot rotation, roll included, is kept and only the target and the
distance change -- instead of jumping to the fixed diagonal. It has no effect in 2D. The screenshot
option `camera` also accepts `{ preset, params }`, so a capture can pass a named view's options:
`captureScreenshot({ camera: { preset: "fitToGraph", params: { keepAngle: true } } })`. The graphty
app asks for it when the Export dialog's View is "Whole graph". The distance puts every corner of the
graph's box, padded 10 percent, inside the narrower field of view, so every node is in shot from
any angle. Without the option every number is unchanged to the digit, so no saved picture moves.

**Why.** "Whole graph" in 3D exported a picture turned to an angle the reader never chose, with a
quarter of it empty: the drawing on screen and the drawing in the file did not match. A third-party
consumer exporting "everything, as I see it" had no way to ask for it except computing the camera
itself, which is graph functionality the element owns.

**Alternatives.** A new built-in view, such as `fitFromHere` (a second name for nearly the same
rule, and one more entry in every picker). Change `fitToGraph` to always keep the angle (moves every
saved picture and every "Fit" press). Have the app compute the camera from the bounds (a workaround
of exactly the kind the repository forbids). Name the option differently (`fromCurrent`,
`preserveDirection`).

## 2026-10-07 -- A capture can leave the selection highlight out: `showSelection`

**What.** `ScreenshotOptions` gains `showSelection?: boolean`, default `true` (the image shows what
the canvas shows, as before). With `false`, the selection halo is left out of that one capture
only: the selection itself does not change, no `selection-changed` event fires, and the halo is
drawn again when the capture ends, whether it succeeded or failed. `UpdateManager` (exported from
the main entry) also gains `meshesShownOrHidden()`, which tells the next frame to re-read what is
drawn instead of drawing its frozen list; the capture needs it, because a hidden halo otherwise
stays on screen. The graphty app passes `false`
for every image export and its preview; the Export dialog gets no new control.

**Why.** A node selected before exporting kept its yellow ring in the file, and the ring tinted the
node off its key color, so the picture said something the data did not. Whether a picture shows
the selection is a consumer's choice, so it is an option with a neutral default rather than a
change of behavior. Clearing the selection around the capture would have fired two selection
events and made every consumer restore it.

**Alternatives.** Change the default to leave the selection out (moves every existing caller's
picture). A broader option such as `overlays: false` that also hides context points (nothing asks
for that yet). Name it `hideSelection` or `selection` (`selection: false` reads as "no selection",
not "not drawn"). Have the app deselect and reselect around the export (a workaround that fires
events and loses a multi-node selection).

## 2026-10-07 -- Margins a fit keeps clear: `viewInsets`

**What.** `<graphty-element>` gains a property `viewInsets` (`{ top?, right?, bottom?, left? }` in
CSS pixels, type `ViewInsets`, exported from the root and from `./extend`): the margins of the
canvas that something laid over it covers, such as a key or a toolbar. Every fit keeps the nodes
out of them -- the element's own framing after a load or a layout change, `zoomToFit()`, and the
built-in `fitToGraph` view (so Fit, Frame selection and `zoomToNodes` too). In 3D the camera is
also shifted sideways so the point it orbits sits at the center of the free part, and stays there
while the reader turns and zooms. Changing the insets refits when `autoFrame` is on. A side left
out, negative or not finite is 0; the getter returns every side. `Graph` gains `getViewInsets()`
and `setViewInsets()`, and `CameraViewInput` gains `insets` (the same margins in device pixels,
like `viewport`), so a third-party camera view can honor them too. A capture that draws a key
(`captureScreenshot({ legend, camera: { preset } })`) reserves the key's own measured box on top
of the screen's insets, on the side that costs less, and gives the screen its insets back after.
A preference of the view: not saved in a project file, records no undo step. With no insets
every number is unchanged, so no saved picture moves.

The graphty app's legend card reports its own box (to the right of a tall card, below a wide one,
plus a 12 px gap) on mount, on every resize of the card or the canvas, and clears it when the card
goes.

**Why.** The key card covered the Pazzi family completely on Florentine families after any run,
and the camera never refit around it; the same card was drawn into exported pictures. Where a
node lands on screen is the element's to decide, and an app cannot keep a node out from under its
own chrome without computing the camera itself.

**Alternatives.** Grow an existing option: none takes a margin (`autoFrame` is a boolean,
`startingCameraDistance` a distance), and a padding percentage on the fit cannot be one-sided. A
rectangle to avoid instead of per-side margins (the element would have to choose a side; margins
are the shape map libraries use for the same job). Move the card (the canvas has no free corner on
a graph that fills it). Shrink the graph symmetrically in 3D instead of shifting the camera (wastes
the free side; no new behavior to explain). Name it `fitPadding` or `padding`.

**Known limit.** A "Current view" export keeps the screen's camera, so it is protected by the
screen's insets only; the exported key is drawn at the top left in its own size, which is smaller
than the app's card in practice but is not checked.

## 2026-10-07 -- Why something cannot run, as a code: `CostEstimate.refusal`

**What.** `CostEstimate` (what `session.estimate()` returns, and the `cost` of a plan) gains
`refusal?: CodedFact<EstimateRefusalCode>`, present exactly when `available` is false: a code and
its values, with no words. `EstimateRefusalCode` is a new exported type in `./session`, a union of
16 codes: `layout.not-planar`, `layout.needs-node`, `layout.node-missing`,
`layout.needs-grouping`, `layout.grouping-absent`, `layout.needs-two-groups`, `layout.unknown`,
`layout.needs-accelerator`, `algorithm.unknown`, `algorithm.needs-directed`,
`algorithm.needs-undirected`, `algorithm.needs-weighted`, `algorithm.needs-connected`,
`algorithm.needs-accelerator`, `estimate.not-costed` and `estimate.scope-unresolved`. Each
code's values are documented on the type: the layout id, the option name, the node, the grouping
attribute, the run that made that attribute (its run id, or null for a data column), the number
of groups or pieces, the engine. `reason` keeps its English sentence unchanged and is marked
`@deprecated` (removed at the next major). The graphty app now words every layout refusal itself
(`graphty/src/workspace/layout/refusalWords.ts`), naming a run's grouping by the run's name and
the community algorithm by the app's name for it.

**Why.** Refused layouts reached the screen in the element's English: 'the layout "planar" cannot
draw this graph without crossings: G is not planar.', and a raw field path such as
`results.louvain.group` for Two columns after a community run. The element must return neutral
facts and the app must write the words; the app cannot reword a sentence without parsing it.

**Alternatives.** A code on layout estimates only, named `LayoutRefusalCode` (but `CostEstimate`
is shared with algorithm runs, whose refusals are English too, and one field with two meanings is
harder to document). The `GraphtyErrorCode` already on a plan's `blocked` (too coarse: every
layout refusal is `E_OPTION_RANGE`). Codes without a namespace prefix (the legend facts use
`legend.*`, so this follows them). Removing `reason` now (a breaking change; it waits for the next
major).

**Known limits.** `MetricAvailability.reason` (from `catalog.metrics()`) still passes the English
sentence on; it has no coded refusal yet. The app's Analyze popover still shows algorithm
refusals in the element's words: the codes exist now, the app's words for them do not. The
inspector's Method select disables a layout that cannot run but does not say why (the Layout
popover does).

## 2026-10-07 -- Node size that ignores depth: `layoutBehavior.node.depthIndependentSize`

**What.** A new optional field in graphty-element's layout behavior (the `layoutBehavior`
property, `GraphBehaviorConfig`): `node.depthIndependentSize`, a boolean, unset (off) by default.
On, in the 3D orbit view, every node is drawn at the size it would have at the depth of the point
the camera turns about, so two drawn sizes compare as the two sizes the style gave them, at any
angle. Zooming still scales everything; the 2D view and an XR session ignore it. Edges and arrows
stop at the redrawn surfaces, and labels follow their node. The graphty app turns it on while a
node size is bound to data (a `node.size` legend block that reads a field) and off otherwise.

**Why.** On the running club with size bound to PageRank, Ava (0.06423) was drawn larger than
Farah (0.06608) in the default 3D view, and a study participant named Ava the most influential
person. The style sizes were right for every pair; the perspective camera divided each by its
depth, Farah sat 16% deeper while her size was only 6% larger, and 20 of 190 pairs were drawn in
the wrong order (trace: `design/ui/studio/next-steps/traces/3d-size.md`). With the option on,
0 of 190 pairs are inverted at both orbit angles and Farah is drawn larger on screen and in the
exported picture.

**Alternatives.** On by default (it changes every existing 3D picture, and a reader exploring a
space expects nearer things to look bigger: a consumer's choice, so off). Turning it on inside the
element whenever a size is bound (an opinion about presentation the element should not hold). A
camera option instead of a node behavior (the effect is on node meshes, not the view). A fixed
pixel size that ignores zoom too (loses zoom). Pushing the camera back (only shrinks the error),
hiding sizes in 3D, or a warning in the app (rejected by the studio).

**Known limits.** It costs a pass over the nodes on every frame while on, and re-trims every edge
whenever a node's scale changes (each orbit drag), which may show on very large graphs.

## 2026-10-07 -- A weight's meaning chosen at load: `TableMapping.weightMeaning` and `loadedWeight()`

**What.** Four additions to graphty-element's public API, none breaking:

- `TableMapping.weightMeaning` (the load mapping an edge table takes in `session.data.import` and
  `LoadDraft.load`): `"strength"`, `"distance"`, `"capacity"` or `null`. Refused on a node table
  or for any other word (`E_BAD_COMMAND`).
- `data.knownFields.edgeWeightMeaning` in the config, default `null`, written by a load that names
  a weight or a meaning. Being config, it is saved in the project file and undo and redo move it.
  A load that names a weight but no meaning writes `null`, so an earlier file's meaning never
  describes a new weight.
- `WeightMeaning.meaning` (the caveat on a run and a neighbor page) grows from
  `"distance" | "strength"` to also take `"capacity"`. Marked as an open union.
- `session.data.loadedWeight()`: `{ attribute, meaning }` for the weight the last load read
  (`meaning` null when none was chosen), or `null` when the last load read no weight. New type
  `LoadedWeight`.

**Why.** One weight column is read as "strength" by community detection and as "distance" by
shortest paths (tier 2 audit), because nothing records what the number means. Tier 2 lets the
reader say it once, when loading, and every run and every screen has to read the same answer.
This change records the answer and exposes it; making each run use it is separate work.

**Alternatives.** A `{ column, meaning }` object as the `weight` role, like `source` and
`target` take `{ column }` (every reader of `weight` as a string would change). Keeping the
meaning in the load report (not certainly saved or undone the way config is). A separate graph
value (a new command and save format for one field). Renaming `WeightMeaning` (asked not to).

**Known limits.** A load with no mapping at all leaves the last meaning in place; the attribute
comes from the last load's report, so the pair can only disagree if a load without a mapping
reads a different weight column. Runs still choose their own meaning.

## 2026-10-07 -- Each load keeps the edge rows it left out: `LoadedSource.leftOut`

**What.** One optional field on `LoadedSource`, the entry `session.data.sources()` returns for
each load still in the graph: `leftOut?: { rows, values }`. `rows` is how many edge rows the load
left out because they named a node no node row held (`unmatched: "leave-out"`), and `values` how
many distinct such names, counted exactly as `LoadReport.unmatched`. Present only when the load
left at least one row out; a load that left nothing out, or that added unmatched rows as new
nodes, has no such field. It is part of the entry, so it is saved in the project file and undo and
redo move it with the load. Additive, not breaking.

**Why.** After a load that leaves rows out, nothing says so once the load report closes:
`sources()` holds only names, tables and added counts, and `lastImport()` is replaced by the next
load. A tier 2 participant who loaded players.csv and passes.csv could name the left-out pass
(line 17, a player not in players.csv) only by comparing 17 edges with the file's 18 rows. With
the count kept on the source, the app can say "1 row left out" under that source at any time.

**Alternatives.** Keep the whole `LoadReport` on each source (much larger, and most of it, such as
repeated-edge counts and errors, has no reader after the load; it would also freeze the report's
shape into the project file format). Keep the left-out rows themselves, with their lines and
values (the reader could see which row, not just how many, but it grows the saved file with data
the graph does not hold; can be added later as a separate field). Always present with zeros
(every saved source would carry a field that is almost always empty). Name it `unmatched` like
the report (it would then suggest rows that were added, which this does not count).
