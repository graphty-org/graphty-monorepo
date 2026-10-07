# Decisions waiting for the owner

Changes made locally on the studio branch that add to or change graphty-element's public API. Each
one is a contract with third-party consumers once it is published, so each needs the owner's yes
before it lands on master. Newest first.

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

## 2026-10-07 -- The legend leaves out a layer painted over on every element it reaches

**What.** `styles.legend()` in graphty-element no longer returns a block for a channel that a
higher, enabled layer of the same target paints on every element the lower layer reaches. Before,
it returned the block and added the English sentence `painted over by "<layer name>"` to its
`departures`. That sentence is gone. A layer covered on only some of its elements keeps its block,
as before. No exported name or type changes; this is a change in what the existing call returns.

Example: run Degree, then Louvain, on a graph where both measure every node. Both runs' suggested
layers color nodes, and the Louvain layer is on top, so every node shows its group color. The
legend used to list "Connections" (with the departure) and "Communities"; it now lists only
"Communities". The exported picture's key follows, since it is drawn from `legend()`.

**Why.** The key and the exported image kept a "Color: Connections" ramp that no node showed. The
element already detected the cover, but reported it only as an English sentence; the graphty app
(correctly) prints none of the element's English, so the reader saw a false key. A legend row for
paint nobody can see is the false claim the legend exists to prevent, and leaving it out needs no
new API.

**Alternatives considered.**

- A neutral field on the block, such as `coveredBy: LayerId`, and every consumer filters. New
  public API, and every consumer has to know to filter or it shows a false key; the one consumer
  today would always drop the block anyway.
- Keep the English departure and have the app parse it. Breaks the rule that the element returns
  neutral facts, and an app that parses element English is a workaround.
- Build the key in the app from the live stack. Graph logic in the app; every other consumer would
  repeat it.

**Open points for the owner.** A consumer that wants to list hidden layers (for example, a layer
panel that greys a covered layer) now reads `styles.list()` and has no cover fact for it. If that is
needed, a neutral cover fact can be added later without undoing this.
