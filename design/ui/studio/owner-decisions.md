# Decisions waiting for the owner

Changes made locally on the studio branch that add to or change graphty-element's public API. Each
one is a contract with third-party consumers once it is published, so each needs the owner's yes
before it lands on master. Newest first.

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
