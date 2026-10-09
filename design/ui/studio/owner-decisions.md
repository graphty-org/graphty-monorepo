# Decisions waiting for the owner

Changes made locally on the studio branch that add to or change graphty-element's public API. Each
one is a contract with third-party consumers once it is published, so each needs the owner's yes
before it lands on master. Newest first.

## 2026-10-08 -- Decided by the team: a layer update's history step names the channels it changed (`channels`)

**What.** The fact of a `style.update-layer` history step gains one param, `channels`: the
channels whose set value or binding the update changed, in the order the layer and the update
name them, and empty when only another key changed (a rename, a selector, turning the layer off).
Additive: `layer` is still there and means the same; the fact's code is unchanged.

**Why.** Undo and Redo now name the step they take back, in their tooltip and in the status line
after they run. Binding Size to a result in the Style tab is an update of the result's layer, and
the fact said only which layer, so the best the app could say was "Undo changing PageRank" while
the drawing lost every node's size. With the channels the app says "Undo changing Size on
PageRank". The step keeps no payload, so the app could not find this out after the fact.

**Alternatives.** Keep the update payload on the step (every step would retain it, and the
history's byte budget counts it); a code per channel kind (many codes for one op); the app reading
the layer before and after the undo and diffing it (computing what the element already knows, and
impossible for a step further back than the next one).

**Built.** `graphty-element/src/session/commands/style.ts` (`changedChannels`), the code table in
`HistoryCode`'s comment. The public API report is unchanged (the params are documented, not
typed). Test in `graphty-element/test/session/history/step-facts.test.ts`, "names the channels a
layer update changes": a layer given Size reports `["node.size"]`, a rename reports `[]`.

## 2026-10-08 -- Decided by the team: a shortest path can follow edges one way (`direction`)

**What.** graphty-element's shortest-path algorithms (Dijkstra and Bellman-Ford, the two a path
run left to choose its method picks between) gain one optional option, `direction: "out" | "in" |
"all"`, the same values as the neighborhood's `SelectionDirection`. `"all"`, the default, is
today's behavior: an edge may be crossed either way. `"out"` crosses an edge only from its source
to its target, `"in"` only from target to source; on an undirected graph every value acts as
`"all"`. The run records the value it used, like every option. Additive: a run that does not set
it behaves exactly as before.

**Why.** The tier 2 design gives the app's path form a "Follow: Out | All" choice on a directed
graph, and it was never built: the element's search always ignores direction, so there was
nothing to bind it to. In the fourth dry run a path on the friends network ran against two of the
drawn arrows and nothing on screen said a path counts ties either way. With the option, the form
shows "Follow: All" and Made with records it.

**Alternatives.** Follow the graph's own direction by default (changes what every existing path
run returns: breaking, and an opinionated default); a boolean `directed` (cannot say "in", which
the neighborhood already offers); the app reversing or filtering edges itself (computing over the
graph outside the element).

**Built.** `"out"` searches the graph as declared, `"in"` searches its transpose (same node and
edge spaces, released from the accelerator after the run), and the run's `caveats.direction` reads
"directed" when either was used. The path run's catalog entry picks the option up from Dijkstra,
so a generic options view (the app's Made with "Advanced run settings") shows "Follow Edges: All"
with no app change. The public API report is unchanged: the options interfaces are not exported.
Tests in `graphty-element/test/algorithms/pathfinding/path-direction.test.ts`, for each of
Dijkstra and Bellman-Ford on the chain a -> b -> c, path c to a: "defaults to all", "all crosses
edges either way on a directed chain", "the default finds the same route as all", "out follows
edges only source to target", "in follows edges only target to source", "an undirected graph is
read either way whatever the value".

## 2026-10-08 -- Decided by the team: find counts its hits by kind (`FindResult.totals`)

**What.** graphty-element's `FindResult` gains `totals: { node: number; edge: number }`: how many
of the hits are nodes and how many are edges, in all, past the window (they add up to `total`).
compact-mantine also exports `EllipsizedName`, the name that ellipsizes and shows its whole text
as a tooltip only while it is cut short (already used inside its Tree and DataRow).

**Why.** The graphty app lists node and edge hits under their own headings, and a heading that
says "Edges 17" while six rows show tells a reader more ties are below. Only `total` came back,
and counting the listed rows gives the window's size, not the number of matches; counting the
graph again in the app would be computing over the graph outside the element. The Graph place's
title used a plain tooltip that repeated its own whole text; the shared component already does
the right thing and was not exported. Tests: `graphty-element/test/session/find.test.ts` ("counts
the hits of each kind in all, past the window"), `compact-mantine/tests/exports.test.ts`.

**Alternatives.** A `kinds` filter call per kind with `limit: 0` (two finds per keystroke, and the
app adding them up); an optional field (every consumer then handles a missing count the element
always has).

## 2026-10-08 -- For the owner: should a project file keep where the camera was looking?

**What.** Not done; a question. Today a project file saves no camera (the rule: the camera is view
state, not saved), so a reopened project is framed afresh from the saved positions. The proposal
is to save the camera beside the selection in the `graphty-view-state` member, which is already
view state that a file carries and never needs to open, and to place the camera there on open
instead of framing. An older file without it would open as today.

**Why.** A fresh framing can only match the saved picture when that picture was itself a fresh
framing of the final state. It often is not: with the Florentine families sample, the legend card
first appeared over a node, so the graph was framed clear of the card as it was then (one section
tall); the card then grew a section and hid nothing, so nothing moved. Reopened, the graph is
framed clear of the taller card, about 60 px lower and smaller than when it was saved. The app now
holds its legend card's margin until the element's first framing of an opening has landed, which
fixes the common case (the friends file reopens within 10 px), but this case needs the saved
camera. Evidence: `tmp/r1-dry4-reopen-framing/` (`fixed-florentine/`, `T19B/02.png` against
`T19B/05.png`).

## 2026-10-08 -- For the owner: a compact-mantine fold's content is no longer a named region

**What.** compact-mantine's `ControlSubGroup` drops `role="region"` and `aria-labelledby` from the
content it opens. The header button keeps `aria-expanded` and `aria-controls` pointing at the
content, so the APG accordion pattern holds (the pattern makes the region optional). No prop
changes; what changes is the accessibility tree every caller exposes, so it is listed here as a
change in behavior. Done on the studio branch; undoing it is a two-line revert.

**Why.** Named by its button, the content took the button's name ("Collapse Advanced run
settings"), so the word "Advanced" named two reachable things: a screen reader's landmark list and
the study tool both found the fold twice, and a panel of folds became a list of landmarks. Test:
`compact-mantine/tests/components/ControlSubGroup.test.tsx` ("follows the accordion pattern: an
expanded button pointing at its content, the only thing of that name").

## 2026-10-08 -- Decided by the team: a tree can leave a selected parent's children unbanded (`childBand`)

**What.** compact-mantine's `Tree` gains an optional `childBand?: boolean`, default `true`. True is
today's look: a selected, open parent draws a band behind its visible children (Figma's layer
list). False draws a selected parent like any other selected row and leaves its children plain.
The graphty app passes `false` on the Sources tree and the paint tree. Additive: the default keeps
every other caller's look.

**Why.** In Figma, selecting a frame selects its contents, so the band is true. In the app,
selecting a source or a paint row never selects its children, yet the band painted the three
rows under "people.csv and messages.csv" so that four rows read as selected; a stronger parent
tint did not separate them. Test: `compact-mantine/tests/components/tree/Tree.browser.test.tsx`
("childBand={false}") and `treeModel.test.ts`.

**Alternatives.** Dropping the band for every tree, which changes the look of trees whose parents
do select their children; a weaker band, already tried.

**Also changed in compact-mantine, with no API change.** A tree's type-ahead takes letters and
digits only, so "/" on a focused row reaches the page's Find shortcut. The Escape that closes a
menu is marked as used (`preventDefault`), so the page's "Escape clears the selection" skips it
and the selection stays; the next Escape clears. A disabled menu row (focusable, with its reason)
never takes the highlight, and a menu that opens with one first focuses the first enabled row. A
segmented control's chosen label is drawn at weight 600 (the unchosen stay 450, in the body color).

## 2026-10-08 -- Decided by the team: a tree row can show its description as a second line (`descriptionVisible`)

**What.** compact-mantine's `TreeNodeData` (and `TreeItem`) gains an optional `descriptionVisible`
flag. Set, the row draws its `description` as a second 16px line under the name, in the secondary
ink, and the row grows from 32 to 44 (its hover pill and focus ring from 24 to 36). Unset, the
description is only read by a screen reader, as before. Additive: no prop changes meaning and no
default changes.

**Why.** A filter step's row must show both the condition the reader set ("shared_chapters is at
least 5") and what it keeps ("77 to 26 nodes", or "off"). In the 240-wide Data list the condition
alone fills the row, so the outcome in the row's count slot cut the condition to "weight is at
least..." and the outcome to "20 to ...". A second line keeps both whole; the screen reader hears
the same words through the row's existing description. Test:
`compact-mantine/tests/components/tree/Tree.browser.test.tsx` ("draws a visible description as a
whole second line under a long name").

## 2026-10-08 -- Decided by the team: a load says what each of its tables held (`LoadedSource.tableRows`)

**What.** graphty-element adds one optional field, additive: `LoadedSource.tableRows?: readonly
("nodes" | "edges")[]`, in the same order as `tables`: whether each table the load read held node
rows or edge rows, as the load read them. It is kept with the load in `data.sources()` and saved
with the project; it is absent for a graph file (its one name holds both kinds), for a load that
read no table by name, and in a project saved before it was kept. The graphty app draws each table
under a two-file source as a node or an edge table, and a click on one opens that table in the
table dock and shows only what that table added.

**Why.** Under "people.csv and messages.csv" the Sources list showed people.csv and messages.csv,
and a click on either showed the whole load: the app could not tell which file had become nodes
and which edges, because the element knew it while loading and then dropped it. Guessing from the
order the files were added would be wrong whenever a reader adds the edge file first or flips
"Each row is". Not breaking: a new optional field. Test:
`graphty-element/test/session/data-sources.test.ts` (kept through save and reopen; absent for a
graph file).

**Alternatives.** A record keyed by table name, which two files of the same name would collide in
just as `tables` does; the full mapping each table was read with, which is far more than any
consumer asked for.

**Also fixed in the element, with no API change.** A replacing load under a seeded layout now draws
the new data exactly as opening that data draws it. The layout's rule "a seeded layout starts over
when data arrives, unless another graph write is still to come" counted the import being placed as
one of the writes still to come, so a replace never started over: the new graph was laid out from
where the old one had got to, came out deep along the line of sight, and was framed small in the
middle of the canvas. Only commands that have not started now count. Test:
`graphty-element/test/browser/replace-load-frames.test.ts`.

**Also fixed in compact-mantine, with no API change.** `Anchor`'s `size` prop was ignored (every
link was drawn at the 11px body size), so a link in a 9px caption stood out larger than its
sentence. A link now takes its size's type; the default, `sm`, is unchanged. Callers that pass
`size="xs"` (the import grid's caption, the inspector's "from" line, the usage-data card) now draw
it at the caption size they asked for.

## 2026-10-08 -- Decided by the team: a selection made by a rule says which columns the rule tested (`selection.originPaths`)

**What.** graphty-element adds one read-only property, additive: `SelectionApi.originPaths: readonly
Path[]`. While the selection is still exactly a rule (`selection.origin` is `{ where }`, or `{ text }`
starting with "="), it lists the columns that rule tests, as the attribute paths
`data.attributes()` publishes (`["data.minutes"]` for the rule ``minutes >= `10` ``); otherwise it is
empty. The graphty app lists each selected edge in the inspector by its two ends' names with the
value of each tested column under that column's name ("School -> Harbor 12").

**Why.** After a rule selected 3 slow bus links, the inspector said only "Edges 3": a reader could
not tell which links, or check them against the rule. The element already knows which columns a
rule reads (its query engine keeps them to key its cache), and the rule's own text is the only other
source; the app would have had to parse the rule to find the column, which is reimplementing the
element's parser. A bare column name in a rule is published as its attribute path, so a consumer
looks it up in `data.attributes()` without knowing that a rule may leave out `data.`. Not breaking:
a new property. Test: `graphty-element/test/session/selection-origin.test.ts`.

**Alternatives.** The paths on the `selection:changed` delta, which a panel that did not make the
call never sees and which would go stale with no change event; a general `scope.pathsOf(where)`,
which is the same fact one step further from where a panel needs it.

## 2026-10-08 -- Decided by the team: which end of a left-out row has no node (`missingEnds`)

**What.** graphty-element adds a type, `EdgeEnd = "source" | "target"`, and one optional field in
two places, additive: `LeftOutEdge.missingEnds?: readonly EdgeEnd[]` (kept with each left-out row,
saved with the project; a project saved before it still opens, with the field absent) and
`DraftRow.missingEnds?: readonly EdgeEnd[]` (present only on the rows `draft.rows(table, { only:
"unmatched" })` returns). Each lists the ends that name a node no node row holds: one end or both.
The graphty app marks that cell in the import page's unmatched grid ("s11 (no node row)", with a
warning glyph), says it in the grid's caption ("1 unmatched row: s11 has no node row"), and leads the
inspector's left-out line with it ("Line 17: s11 has no node row; from s04, to s11, passes 3").

**Why.** An unmatched row showed "s04, s11, 3" and the reader could not tell which name was the
missing one: "s11" looks like "s04". The element decides which end is missing while it reads the
rows and then dropped that fact; another consumer could only recompute it by matching ids against
the node rows itself. The ends are named, not the values, so a row whose two ends hold the same
value is still exact, and the app finds the column through the roles it already reads
(`draft.resolve`, `LoadedSource.leftOut.endColumns`). Not breaking: new optional fields and a new
type. Tests: `graphty-element/test/session/load-draft.test.ts` (source missing, target missing,
both; absent without the filter), `graphty-element/test/session/data-sources.test.ts` (kept through
undo, redo, save and reopen).

**Alternatives.** The missing values themselves (`missing: ["s11"]`), which loses which column they
came from when both ends hold the same text; the missing column names on `DraftRow`, which a
`LeftOutEdge` cannot carry the same way (its ends are not columns when read by an expression).

## 2026-10-08 -- Decided by the team: a shortest path left to choose its method says which it used, and a choice can carry its own name

**What.** Three changes in graphty-element. (1) The shortest path's `method` option, left unset,
now does what its description always said: Dijkstra when every weight the run reads is zero or
above, Bellman-Ford when one is negative. Before, an unset method always ran Dijkstra. (2) The
method that ran is the run's existing `caveats.method` ("dijkstra" or "bellman-ford"); no new field.
(3) An option's UI metadata (`defineOptions` meta) gains `choiceLabels?: Record<string, string>`,
the name of each choice by value, read into the catalog's `OptionDescriptor.values[].label`; the
method option sets "Bellman-Ford", which the catalog spelled "Bellman Ford" (the value made
readable). The graphty app shows an unset method in Made with as "Dijkstra, chosen automatically"
(the run's `caveats.method` under the app's words) and, before a run, as "Chosen automatically".

**Why.** A finished path showed an empty Method box, so a reader could not tell which method made
the result. The record already existed in `caveats.method`; what was missing was the switch the
description promised, and without it an unset method over a negative weight ran Dijkstra, whose
relaxation never ends on an undirected negative edge and froze the page. Not breaking: the switch
makes documented behavior true and only changes runs that froze before; `choiceLabels` is a new
optional field whose absence keeps today's labels, and it is not in the public API report (the
option metadata type is internal). Tests: `graphty-element/test/browser/shortest-path-method.test.ts`,
`graphty-element/test/catalog/algorithms.test.ts` ("Bellman-Ford"),
`graphty/src/workspace/analyze/__tests__/words.test.ts`.

**Alternatives.** A new `resolvedParams` record on the run (a second place for a fact
`caveats.method` already states); writing the resolved method back into the run's params (a rerun
would then pin it, and the reader's "left unset" would be lost); fixing the spelling in the app's
words only (every other consumer would still read "Bellman Ford").

## 2026-10-08 -- Decided by the team: a label can be drawn over the graph (`LabelStyle.onTop`)

**What.** graphty-element's label style (`node.labelStyle`, `edge.labelStyle`, the `LabelStyle`
type) gains `onTop?: boolean`, and the renderer's schema `RichTextStyle` gains the same optional
field. Unset or false, a label sorts by depth with the nodes and edges, exactly as before. True, the
label is drawn after the graph with the depth buffer cleared (the way a tooltip already is), so no
node, edge or selected edge's band covers it. The graphty app's label look (`appLabelLook`, written
on every label line the app adds) sets it on.

**Why.** On a drawing with names on, a nearer node's sphere hid the name of the node behind it
("Hana" read "H..a" under Ivan), and a selected tie's blue band cut "Stadium" to "Stadi m". Whether
a name may be covered is a reader's choice: a dense 3D scene may want depth cues, a reading app wants
every name whole, so it is an option with the neutral default (depth sorted, today's behavior). Not
breaking: a new optional field whose default keeps today's drawing. Named `onTop` after the
renderer's existing tooltip option, short and plain. Tests:
`graphty-element/test/browser/label-drawn-over-edges.test.ts` (a nearer edge crosses a default
label and does not cross an `onTop` one; an edge label moves to the top group only with the
option), `graphty-element/test/session/styles/label-style.test.ts`, story `Styles/Label OnTop`.

**Alternatives.** Labels always on top (changes every consumer's drawing, an opinion as a default);
an element-wide switch instead of a style field (cannot differ per layer, so a reader could not put
only some names on top); a depth offset toward the camera (still cut by any node nearer than the
offset).

## 2026-10-08 -- Decided by the team: view insets never move the drawing, and `nodesInRect` says what an overlay hides

**What.** Setting graphty-element's `viewInsets` (and `Graph.setViewInsets`) no longer moves the
camera: every node stays where it is drawn, and the next fit keeps clear of the new margins. Before,
the element framed the graph again on every change while `autoFrame` was on, and the 3D camera also
re-centered on the new free area at once. The element also gains `nodesInRect({ x, y, width,
height })`: the ids of the nodes drawn, even in part, inside a rectangle of the element, in CSS
pixels from its top-left corner. The graphty app's legend card sets its inset and calls
`zoomToFit()` only when `nodesInRect` of its own box is not empty.

**Why.** Running an analysis grows the legend card; the app reported the bigger card as a new top
margin, and the element re-framed and re-centered the whole drawing, so every node moved and shrank
after each run although the card hid none of them. A margin is a band across the canvas, and a card
in a corner covers far less than its band, so "a node lies under the margins" is the wrong test for
moving the drawing; only the consumer knows the shape of what it laid over the canvas. Not breaking:
`viewInsets` and its framing are new on this branch and not in any published release (master's
graphty-element has no `viewInsets`). `nodesInRect` is additive. Tests:
`graphty-element/test/browser/camera/view-insets.test.ts` ("changing the insets leaves every node
where it was drawn until the next fit"), `graphty/src/workspace/canvas/__tests__/CanvasOverlays.test.tsx`
("frames the graph again when the card lands on a node").

**Alternatives.** Keep the re-framing and re-frame only when a node lies under the new bands (moved
the drawing whenever a corner card's band reached a node the card did not cover); an option to turn
the re-framing off (a second switch beside `autoFrame` for behavior nobody wants by default);
rectangles instead of bands for fitting (a fit around a corner cut-out is a much larger change).

## 2026-10-08 -- Decided by the team: find an edge by its name (`FindOptions.edgeNameJoiner`)

**What.** graphty-element's `FindOptions` gains an optional `edgeNameJoiner?: string`. Set, `find`
also matches each edge against its name: its source's name, the joiner, its target's name (with
`" -> "`, "Station -> Stadium"). The name ranks with node names, so typing the whole name or either
end's name lists the edge, after the node itself; the hit's `match.path` is then `"ends"`. Absent
(the default), an edge is found by its own attribute values only, exactly as before. The graphty
app passes the same joiner its inspector titles an edge with (`edgeJoiner` in
`graphty/src/workspace/inspector/words.ts`).

**Why.** A reader who read "Station -> Stadium" at the top of the inspector, or who knew the two
stops, typed that into Find and got "No match": an edge was findable only by its own columns. The
words between the names are the application's, so the element takes them from the caller instead
of choosing an arrow; the matching over the graph is the element's. Test:
`graphty-element/test/session/find.test.ts` ("finds an edge by its name ...").

**Alternatives.** Matching ends by default (changes what `find` returns for existing calls:
breaking); the app splitting its own title and searching twice (computing over the graph in the
app); a structured `{ source, target }` query (a second way in for a typed box that has only text).

## 2026-10-08 -- Decided by the team: a run says when it assumed its weight's meaning (`WeightMeaning.assumed`)

**What.** graphty-element's `WeightMeaning` gains an optional `assumed?: true`. A run's
`caveats.weight` carries it when the loaded weight had no stated meaning and the run read it as the
meaning its algorithm reads (a strength reader reads an unstated weight as a strength). Absent when
the meaning was stated, at load or in the run's `weight` option. Nothing else changes: `attribute`
and `meaning` are what they were, and a run that read no weight still has `null`.

**Why.** A run read a weight nobody gave a meaning as "closer", and the run's own record could not
say so: `caveats.weight` looked exactly like a weight declared "closer". So the right panel said
"Weight: weight (closer)" while the Data page said "Higher means: Not set" for the same column --
two answers to one question. The only other source, the current `data.loadedWeight()`, describes the
data as it is now, not the run, and is wrong for a run made before a Replace. The fact belongs to the
run, so it is in the run's caveats. Tests: `graphty-element/test/browser/runs-loaded-weight.test.ts`,
`graphty-element/test/algorithms/metrics/metric-results.test.ts`.

**Alternatives.** A separate `caveats.weightAssumed` flag (two places to read one fact); the
declared meaning (`null`) in `meaning` itself (changes what an existing field returns: breaking).

## 2026-10-08 -- Decided by the team: a number box can be empty with words, and a table header opens its menu on a right-click

**What.** compact-mantine's `StyleNumberInput` gains an optional `emptyText` prop: while the reader
has entered nothing, the box is empty and shows these words as its placeholder instead of
`defaultValue`. Unset, nothing changes. `DataTable` now opens a column's header menu on a
right-click (the same menu the caret and the context-menu key already open), and only the primary
button sorts. A header without a menu still leaves the right-click to the browser. No prop, type
or default changes meaning.

**Why.** A sampled analysis's sample size has no default number (empty means the exact run from
every node), but the box drew "0", which a participant read as a sample of nothing. In the same
round a participant right-clicked a column header looking for its options, saw the menu caret
appear on hover and took it for a sort; the right-click did nothing. Tests:
`compact-mantine/tests/components/StyleNumberInput.test.tsx`,
`compact-mantine/tests/components/DataTable/DataTable.header.browser.test.tsx`.

**Alternatives.** A `defaultValue` of `null` (changes the type every caller reads); a separate
"Exact" checkbox beside the box (two controls for one setting).

## 2026-10-08 -- Decided by the team: StyleSelect takes an `aria-label`, and every reset button has a tooltip

**What.** compact-mantine's `StyleSelect` gains an optional `aria-label` prop, forwarded to the
field. Unset, the visible label is still the only name, as before. The reset button beside a
`StyleSelect`, `StyleNumberInput` or `CompactColorInput` now shows its name ("Reset km to
default") as a tooltip on hover. Additive: no prop changes meaning and no default changes.

**Why.** On the import page each column's role box is labeled with the column's own name, "km",
which says nothing about what the box sets and collides with the grid's "km" header; the page now
names it "Role of km", which still holds the visible word (WCAG 2.5.3). The reset is an icon-only
button, and an icon-only button must say what it does to a pointer user too, so the fix is in the
shared controls rather than one page. Tests: `compact-mantine/tests/components/StyleSelect.test.tsx`,
`compact-mantine/tests/components/ResetTooltip.browser.test.tsx`.

## 2026-10-08 -- For the owner: a compact-mantine stat row grows instead of cutting its reading

**What.** In `@graphty/compact-mantine`, a `DataRow` with `stat` whose reading does not fit beside
its name now wraps the reading onto more 16px lines and the row grows past 32px; before, the
reading was cut with an ellipsis and a tooltip. A `PageList` row's second line (`description`)
also wraps instead of cutting. A `Tree` row's `count` stays whole until it would take more than
half the row, then ellipsizes at half, and while the name or the count is cut, the name's tooltip
shows both. No prop, type or export changes, but a consumer that assumed every stat row is 32px
tall (a fixed-height virtual list) sees taller rows, so it is listed here as possibly breaking.

**Why.** At 1440 x 900 with default panel widths the inspector's Overview cut "3 to 6, mean
3.667" to "3 to 6, mean 3...." and "Undirected, set in the project" to "Undirected, set in the...",
Recent projects cut the save time, and a cut Sources row's tooltip named the file but not its
counts. A stat's reading is the half the reader came for; a tooltip is not a reading.

**Alternatives.** Cutting the name instead of the reading (a stat label cut to "Edges per n..." is
no better); trimming row padding (gains 8px, enough for one case, not for a phrase).

## 2026-10-08 -- For the owner: a ranking's histogram bins continuous values into bands

**What.** `RunResult.histogram()` (and `data.histogram()`, which shares `buildHistogram`) gives one
bar per distinct value whenever a field has no more distinct values than bins. For a field that
counts things that is the readable shape; for a continuous field such as PageRank on a 20-node
graph it gives 20 bars of height 1, which says nothing about the spread. The fix keeps one bar per
value only for integer-valued fields, or when values repeat, and bands every other field. It
changes what an existing method returns for small continuous fields, so it is listed here as
possibly breaking; it is built on the studio branch so the study does not run on equal bars.

**Why.** The tier 2 dry run drew 20, 12 and 14 equal bars on the PageRank Values chart, whose
values cluster (five between 0.11 and 0.13, the rest between 0.02 and 0.07). The function's own
documentation says the per-value shape exists "for a count metric".

**Alternatives.** An option `binning: "bands"` the app passes (additive, but every consumer meets
the same useless default first); leaving it (the chart stays on screen and misleads).

**Built rule.** One bar per value when the field is integer-typed, when every value is a whole
number, when there is only one value, or when values repeat (at least two elements per distinct
value on average); otherwise bands. In `buildHistogram`, so `RunResult.histogram()`,
`groupSizes()` and `data.histogram()` all follow it. Visible change: a decimal column with one
value per element (`data.histogram` on a five-row `score` of 0, 0.5, ... 2) now reports
`binning: "banded"` where it reported `"per-value"`.

## 2026-10-08 -- Decided by the owner: the element's highlight stays indigo; the app picks its own route color

**Decision.** The owner decided on 2026-10-08: graphty-element's default highlight color stays Paul
Tol's indigo `#332288`, and the graphty app chooses its own highlight color. An earlier studio
commit (5a7d22fd1) had changed the element default to black; that change is undone.

**Why.** Changing an existing default changes what every consumer's drawings look like, which is a
breaking change, and the element's defaults are the neutral choice while consumers make their own
(root CLAUDE.md, "graphty-element offers choices; consumers make them"). The problem the black
default fixed is real but is the app's: on the app's unranked drawings, an indigo route's nodes
measured Delta E 19.5 and 2.1:1 from the default nodes as lit spheres, and study pilots read them
as ordinary nodes (T20A). Another consumer may want a different route color, so it is a choice,
not a default.

**Built.** graphty-element adds one additive method, `session.styles.setHighlightColor(color |
undefined)`: the color every highlight that names no style of its own is painted in (a route or
chosen set a finished run paints by itself, and `styles.highlight()` without `set`); undefined goes
back to indigo. A view setting: no history step, not saved, applies to highlights painted after
the call; it refuses a color a layer would not accept with `E_BAD_COMMAND`. The app sets black
(`APP_HIGHLIGHT_COLOR` in `graphty/src/constants/highlight.ts`) on the session in both element hosts
(`workspace/frame/ElementHost.tsx` and `components/Graphty.tsx`). Black measured on the app's
screenshots: route nodes Delta E 50 and 3.0:1 from the default nodes unranked, 44 to 50 over
PageRank; its cost is that black is also the seventh default group color. Tests: the element
default and `setHighlightColor` in `graphty-element/test/session/styles/StylesApi.test.ts`; the
app's route color on the real element in
`graphty/src/workspace/frame/__tests__/Workspace.real-element.test.tsx`. Checked on a fresh build
with the study tool: the T20A bus-stops route draws black and stands out
(`design/ui/studio/tmp/highlight-owner-decision/T20A/14.png`).

## 2026-10-08 -- For the owner: a selected edge is drawn with a solid blue band behind it

**What.** A selected edge used to be drawn with the node halo's settings: a gold band at 0.4
opacity, 2.9 line widths wide, over the line. It is now drawn with a solid band of Paul Tol's
blue `#0077BB`, five line widths wide, BEHIND the line, so the line keeps its own paint down the
middle and the band shows on both sides. A changed default appearance, so listed here; built on
the studio branch.

**Why.** On the dense Les Miserables drawing the 13 marked ties of the tier 2 study were thin
pale-gold lines that could not be told from the gray edges around them. Gold at 0.4 over the
background is 1.15:1; gold itself is 1.3:1 and sits next to the oranges of the default
measurement palette.

**Alternatives.** A new shared selection color for nodes and edges (changes every selected
node's halo too, and a blue halo is too close to the default indigo node); darkening the line
itself (tried before: it turned the configured gold into an olive nobody chose).

## 2026-10-08 -- Decided by the team: three edge settings on the selection style

`GraphSelectionStyle` gains `edgeColor` (default `#0077BB`), `edgeScale` (default 2.5: the band
is that many times twice the line width) and `edgeOpacity` (default 1), beside the node halo's
`color`, `scale` and `opacity`. Additive: optional fields with defaults, so every existing
selection style still parses. Flat rather than a nested `edge` object because
`graph.setSelectionStyle` merges one level deep, so a flat field set alone keeps the others.
Reason for separate settings: a see-through ring reads around a ball but vanishes beside a
one-pixel line, so one set of values cannot serve both. The graphty app's Highlight color control
still writes only the node halo's `color`; whether it should also write `edgeColor` is the app's
choice. Test: `test/browser/element-at.test.ts` (the band is solid, beside the line, and the line
keeps its paint), `test/catalog/default-palette-quality.test.ts`.

## 2026-10-08 -- Decided by the team: a left-out row's file line and end columns

**What.** Two optional fields, additive: `LeftOutEdge.line?: number`, the row's line in the file,
numbered as the import page already numbers it, and
`LoadedSource.leftOut.endColumns?: { source: string; target: string }`, the names of the columns
the load read the ends from. A project saved without them still opens.

**Why.** After Load the app showed a left-out row as "p11, p13, 6" with no column names and no
line, though the import page had shown "Line 24, from, to, emails" a moment before. The facts
existed during the load and were dropped; only the element has them.

## 2026-10-08 -- The left-out rows themselves: `LoadedSource.leftOut.edges` and `LeftOutEdge`

**What.** One optional field on `LoadedSource.leftOut`: `edges?: readonly LeftOutEdge[]`, the
first 100 edge rows the load left out, each as `{ source, target, values }` -- its two ends as the
load read them, and its other values by column (the end columns left out when they are plain
column names). `LeftOutEdge` is a new exported type of `./session`. Kept with the load, so it is
saved in the project file and moves with undo and redo; a project saved before has no `edges`
and still opens. Additive, not breaking.

Also, a behavior fix with no API change: a draft load whose mapping names its end columns
(`from`, `to`) now reports them as the load's endpoints (`LoadReport.endpoints`, `resolvedFrom:
"declared"`), so `attributes()` no longer lists those columns as edge attributes, as it never
listed `source` and `target`.

**Why.** The tier 2 pilots found that after Load the count of left-out rows was kept but the rows
were not: a reader who wanted to know which pass did not fit had to reopen the source file, which
an application can do only while it still holds the file (never after a save and reopen). With
the rows kept, the app lists "s04, s11, 3" under the source at any time. The end columns appeared
twice in an edge's values ("From Station" and "from Station") because the report named the
configured defaults instead of the columns the load read.

**Alternatives.** Keep every left-out row (unbounded growth of the saved file for a file that
mostly does not fit; 100 is enough to show and count). Keep the row as one record with its
original keys (the app could not tell which values are the ends, and their order is not the
file's). Leave the end columns as attributes and have the app hide columns whose role is source
or target (it would hide the defect: the element's report was wrong, and every consumer reading
`lastImport()` or `attributes()` would meet it).

## 2026-10-08 -- Export variants and the Graphty JSON format in the format catalog

**What.** Four additions to the format catalog (the `./catalog` and `./extend` entry points):

- `FormatDescriptor.exportVariants`, a new optional list of `FormatExportVariant` (`id`,
  `plainName`, `extensions`, `mimeTypes`, `preset`, `options`): one entry per kind of file a
  writer produces. `json` lists seven (Node-link JSON (NetworkX), Cytoscape.js JSON, JSON Graph
  Format, graphology JSON, vis.js JSON, d3 JSON, OBO Graphs JSON); `csv` lists three (CSV, Gephi
  CSV, Neo4j CSV). `preset` is the writer options that make that kind of file, passed to
  `exportGraph` unchanged; `options` is the writer options that still apply to it. Also a new
  optional `FormatDescriptor.description`.
- A new export-only format id, `graphty` (Graphty JSON, `.graphty.json`), added to
  `KNOWN_FORMAT_IDS`. `exportGraph("graphty")` writes the document `session.project.save()`
  produces without marking the project saved; it takes no options and loses nothing.
  `session.data.import` refuses it with `E_UNKNOWN_FORMAT`, and format detection never returns
  it: the file is read back by `session.project.open`.
- Writer enum choices carry real labels ("Cytoscape.js JSON", "Gephi (Source, Target, Type,
  Weight)", "Nodes and Relationships") instead of their raw values, and the CSV and Neo4j writer
  options state the defaults the writer applies (separator, line ending, header row, list
  separator).
- Every writer option except CSV's `table` and Neo4j's `part` is marked `advanced`, so a picker
  can fold it away. "Neutralise Formulas" reads "Neutralize Formulas".

Nothing is removed or renamed; the change is additive.

**Why.** A reader choosing how to save thinks in kinds of file ("a Cytoscape.js file", "a Gephi
CSV"), not in a format id plus a dialect option. Without variants, every consumer that offers an
export list has to know which dialect values exist, what to call them and which file ending each
one gets -- knowledge that lives in graph-io and belongs to the element, not to each app. Without
the `graphty` format, the one export that reads back exactly (styles, results, layout, notes)
could not be offered in the same list as the others.

**Alternatives.** Make each variant its own format id (`json-cytoscape`, `csv-gephi`): a flatter
list, but it multiplies ids that all share one writer and one reader, and import detection would
have to choose among them. Leave variants to the app: every consumer rebuilds the same table.
Make `graphty` importable through `data.import`: a project file holds far more than a graph, and
loading it as data would silently drop its styles and results. Leave the advanced flag off: a
form shows a dozen options for a simple save.

**Owner question.** Is `graphty` the right public id for the project file in the format list,
given that `data.import` refuses it? And should `KNOWN_FORMAT_IDS` hold an id that cannot be
imported, or should export-only ids be listed separately?

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
