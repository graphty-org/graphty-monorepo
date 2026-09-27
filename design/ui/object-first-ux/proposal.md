# Proposal: an object-first graphty

The recommended UX in one page, the decisions only the owner can make, what to prototype
first, and the risks. The reasoning behind every line is in `analysis.md` in this folder; the
row-by-row model is `object-model.md`; the pictures are `mocks/index.html`. Files are under
`/home/apowers/Projects/graphty-monorepo/`. Nothing here changes code, and there is no schedule.

## 1. The recommended UX

**Organise the app around what the reader has made, not around activities.** The things a
reader makes from a graph are groups, paths, rankings and filtered sets. Make those the
objects: a **Set** (a collection of elements with one look), a **Group** (one label of a
grouping), a **Measure** (one value per element, painted with a scale) and a **Grouping** (one
label per element, which is also a folder of Groups), with the **Dataset** at the root. Nodes
and edges are the material: they can be clicked and read, never painted directly.

**The frame is Figma's UI3 frame with Figma's measurements.** Two 240 px panels, no top bar, no
activity rail. The left panel is the **tree** of objects (with a short Views list above it);
the right panel is the **inspector** of whatever is selected, or the Dataset when nothing is;
a 48 px floating toolbar at the bottom centre holds the tools; a 24 px status bar holds the
counts, the layout chip, the computing chip, the selection count and the zoom. One body size
(11 px at weights 450 and 550), 32 px rows, 24 px controls, borderless grey fields, one accent
blue that means "the live or chosen UI state", one filled button per screen, dark menus in
both themes.

**Creating an object is a tool, like drawing a shape.** Filter, Neighbours, Path, Groups and
Rank sit in the toolbar; a tool asks for exactly what it needs on the canvas (a pick, a rule in
a popover), never in a dialog; the row appears in the tree the instant the tool finishes, or
in a waiting state with "Run (about 4 min)" when the element's cost estimate says the run
would take too long to start unasked. Parameters are rows in the new object's inspector,
editable afterwards. Every algorithm has exactly one flyout, chosen by its result shape, so a
plugin lands in the right place with no app change.

**Appearance is a property of the object.** Select a row and its **Fill** is a section of the
inspector: paint rows for a Set, an encoding (channel, scale, palette, domain) for a Measure.
The colour is still stored as a style layer in graphty-element; the reader sets it on the
object. The tree order is the paint order, per channel: the visible object nearest the top
whose Fill writes a channel wins it on the elements it contains; children paint above their
parent; the eye stops an object painting and never hides members; **Focus** is the separate
verb that hides everything but one object's members and scopes the tools to it. Where objects
overlap the inspector says so ("Covered by Influence on 34 of 34 members") and the fix is
Figma's: drag the row.

**Objects are live.** Six states (current, computing, waiting, stale, failed, frozen), each one
glyph in the row; a stale object keeps painting its old values with its name dimmed; whether
an edit re-runs at once or marks stale is decided by cost, not by kind. Every object carries
its own record (Made by) and a plain-language reading on request, and the tree in order is the
report, the methods text and the recipe.

**Restraint is a set of rules, not a mood.** One home per capability; one primary button; no
app-authored text at rest; disclosure on request (an empty section is its header with a "+");
never act unasked (after a load the app draws the graph and stops); one row shape; one meaning
for the accent; one word for one thing. The rules are the acceptance test for every screen,
and a measured audit (`critique/consistency-audit.md`) checks them from the DOM.

**graphty-element owns the tree.** Nesting, order, names, states, links and locks are an
objects API on the element's session, built over the runs, saved scopes and layers it already
has, so that a third-party consumer gets the same tree and a project file can save it. The
app draws it and nothing more. Three element changes come before any app work: attaching the
query engine, unifying the three spellings of "a set", and the objects API itself.

## 2. Decisions the owner must make

Each is a question with the options and a recommendation. The first three are one-way doors
(a published contract or a saved format); the rest are reversible and are listed because they
change what the next round of mocks draws.

**1. Does the element own the tree, and is its saved shape the project file?**
Options: (a) the objects API on the session, and the tree's shape in the project file
(graphty-element issue #301, "no project file to save and reopen a whole session") is the
element's document; (b) the app keeps the tree in its own state as a tracked workaround until
the element catches up; (c) the app keeps the tree for good.
Recommendation: (a). (b) is the workaround the root `CLAUDE.md` forbids, and once a tree has
been saved by the app its shape is public API in the wrong package. This is the one true
one-way door in the proposal; everything else can be redrawn.

**2. Do we change the published session contract to one set vocabulary?**
The scope type, the selection target and the visibility filter each spell "a set" their own
way. Options: (a) unify them in one release (the scope gains filters, top-N, above-threshold,
group and combinators; the filter gains a scope; a layer selector gains a scope with induced
edges for an edge target); (b) leave the three and have the app translate between them.
Recommendation: (a). (b) is the app translating between two spellings the element never
settled, which the root rule names as a workaround, and it leaves Focus on a fixed Set, a
Group's halo and a linked Top N with no element path.

**3. When a Measure's parameter is edited in place, does the run keep its id?**
Run ids are derived from the algorithm, its canonical parameters and the scope, so an edit is
a different run. Options: (a) a restart verb that keeps the id, so ids stop being a pure
function of the parameters; (b) the objects API re-binds the object's layers, name and links to
the new run and removes the old one, and run ids stay deterministic.
Recommendation: (b). The object's id is what the reader sees and it stays stable; the run
contract stays as documented; and the old result can be kept for undo.

**4. How are two results compared side by side?**
Options: (a) a View may carry eye states, applied visibly when clicked; (b) Compare takes two
objects instead of two Views and each canvas shows only that object's Fill; (c) no side by
side; blink-compare with the eye.
Recommendation: (b), plus a "Difference" between two Measures and an agreement number between
two Groupings as objects and Findings. (a) makes a View toggle the tree behind the reader's
back; (c) is the analyst persona's largest complaint. (b) needs the same element work as
Compare at all (a second renderer on one session, app issue #186).

**5. Is a Measure's appearance called "Fill" or "Encoding"?**
Options: (a) "Fill" everywhere, three row shapes under one word; (b) "Fill" on a Set or Group,
"Encoding" on a Measure or Grouping.
Recommendation: (b). It names the owner's own split at the one place it matters, and it is the
element's own word. Reversible by a string change.

**6. Does every new Measure paint?**
Options: (a) always, on the first free channel (Colour, Size, Outline), which gives a
five-ranking comparison three pictures and two "no fill" rows; (b) a single run paints, and
members of a batch after the first are created with their Encoding present and the eye off;
(c) a Measure never paints until asked, as Gephi's statistics.
Recommendation: (b). (c) throws away the two-click picture that is graphty at its best; (a)
makes rows with no picture, which breaks the eye.

**7. Do the tools have labels?**
Figma's toolbar is icon-only because its icons are thirty years old. "Neighbours", "Groups" and
"Rank" have no icon. Options: (a) icons with a one-second tooltip, as drawn; (b) icons with no
tooltip delay on the toolbar only; (c) a 9 px label under each tool icon (the toolbar grows to
about 56 px).
Recommendation: (c), tested against (b) with two or three readers. The novice walkthrough
found the toolbar the one place a first-time reader might quit.

**8. Is the primary button "Share" or "Export"?**
Its menu is entirely exports. Options: (a) "Share", keeping Figma's word, on the bet that link
sharing arrives; (b) "Export".
Recommendation: (b) unless link sharing is planned; a "Copy link" row with no server behind it
would be the "Coming" tag by another name. Reversible.

**9. Does a filter hide?**
Options: (a) Create makes a painted Set and Focus is a second click, as drawn; (b) a third
popover button "Create and focus", a shortcut to two commands.
Recommendation: (b). The eye keeps its single meaning and the Gephi habit is one click.

**10. Who is the first release for?**
Options: (a) the novice (the first ten minutes: labels, the reading on the surface, the
legend on by default, hover labels); (b) the weekly analyst (the objects API and the project
file first, "Set as weight" without a re-import, the "keep the objects" checkbox on Replace,
parameters before the first run, a threshold on a result inside the Filter tool).
Recommendation: build order follows (b), because an analyst who loses everything on reload
does not come back, while (a)'s items are each a row or a label and can ride along.

**11. Are nodes material with no Fill of their own?**
Options: (a) yes: a node's inspector is a report plus doors, and painting one node makes a
one-node Set (as drawn), with the paint door moved to the top of Look and named "Fill...", a
second door "Colour its group...", and "Add to [set v]" so recolours can share a Set; (b) a
real Fill section on the node that writes to the smallest Set containing it.
Recommendation: (a). (b) paints one of three Sets by accident and hides where the paint went.

**12. What does a headset get in this phase?**
Options: (a) a viewer: the picture as painted at entry, voice-created objects excepted; (b) an
element-drawn in-headset object list with eyes and Focus, once the objects API exists.
Recommendation: (a) now, stated plainly, with a pre-entry "Enter VR showing [Set v]"; (b) as the
target, and one more reason the objects API must be the element's.

**13. Group identity across re-runs.**
The model promises names, notes and overrides follow a group by largest-overlap matching; the
element matches by label, and community labels are not stable across seeds. Options: (a) ship
label matching and say so in Made by ("groups matched by label; names and overrides may not
follow"); (b) build overlap matching first (graphty-element issue #191, "community groups have
numbers but no names", is names only).
Recommendation: (a) now, (b) as element work, and never promise (b) in the UI until it exists.

## 3. What to prototype first, and why

In order. The first three cost no UI and each answers a question the design cannot answer on
paper; the rest are static mocks in the existing kit, or a thin clickable prototype.

1. **A headless-session staleness test.** Create a rule Set, a Grouping within it and a linked
   Top 10; apply Add data, a parameter edit and a scope edit; print what the hash rule marks
   stale. This is the objects API's first acceptance test, and live objects are the first place
   the design departs from Figma.
2. **A headless-session undo test.** Run Bridges, cut Top 10, re-run Bridges with a new seed,
   apply the inverse; the Top 10 must come back with its old members. Undo is the safety net
   that makes exploring cheap, and it is the one behaviour that cannot be judged from a mock.
3. **A 20,000-node Storybook story** (served through servherd) with a Components run that
   yields 300 groups, measuring hover-outline time over 10,000 members, selection statistics
   over 12,000, and frame rate during a colour repaint. Those three numbers decide whether the
   tree's Figma borrowings (row hover, click-to-halo, "Covered by") survive scale or need
   mask-based paths in the element first.
4. **An objects API spike on the session**: list, create, move, rename, set visible, focus over
   the existing runs, scopes and layers, with the set-vocabulary change underneath, on Karate
   Club. It proves the tree can be the layer stack linearised without duplicating state, and
   it is the thing the app cannot start without.
5. **A clickable tree-and-inspector prototype** against the real element for the parts that
   work today (encode, highlight, layer order, explain): the three-click recolour, the Path
   tool's pick-pick flow, dragging a row to change precedence. This is the paradigm's promise
   in the hand, and the first thing to put in front of a novice and an analyst.
6. **Static mocks that close the open questions**: screen 3 with a Path partly covering Group
   2 (the half-covered chip, the "Covered by" line, the legend departure) and a spanning-tree
   edge Set with a line icon; screen 4 with the paint door at the top of Look; six Measures in
   five states with the "Computing 1 of 6" chip; an assistant turn that made three objects as
   one undo step; screen 3 in 3D with the framing name in the header and a Shift-marquee; and
   the toolbar with labels beside the toolbar without.

## 4. Risks

- **The element is the critical path, and the temptation is to start in the app.** Three
  element changes come first: the query engine (large; graphty-element issue #149), the set
  vocabulary (a contract change on a published entry point), and the objects API (medium to
  large). Two element policies (exclusive highlights, "an authored layer wins") must change
  before a second object can exist. An app-owned tree "for now" is the exact workaround the
  root rule forbids, and its saved shape would become public API in the wrong package.
- **The saved tree is a one-way door.** Once a project file exists its shape is a contract with
  every reader's saved work. Decide it once, in the element, with the objects API.
- **Scale is unmeasured.** Every mock is 34 or 115 nodes. Row hover over 10,000 members, a halo
  above the 5,000 selection cap, 200 Group rows and per-member coverage counts are all known
  cliffs; the prototypes in section 3 measure them before the tree depends on them.
- **Live objects are new UX.** Stale-but-still-painting, the waiting state's second click, and
  a partial refresh after Add data (new communities beside last week's sizes) are honest and
  unfamiliar; the cost threshold that decides "live" versus "stale" is a shipped default, not a
  measurement, until the element can calibrate.
- **Two selections, one inspector.** Delete acts on what the inspector shows, which flips
  between "delete the object" and "remove this node from the data" one click apart. The
  confirm on the data edit and matching menu words are the mitigation, not a cure.
- **The novice's first ten minutes hinge on the toolbar.** Icon-only tools with a tooltip delay
  scored 2 of 5 on discoverability; nodes without labels until a Measure exists make picking
  blind; the reading is two clicks deep. Each fix is small; none is in the mocks yet.
- **Comparison has no answer until a decision is made** (section 2, question 4), and it is the
  analyst persona's validation habit.
- **Edges are second-class** until picking lands and a node Set can paint its inside edges;
  the community-structure styling every persona wants next has no control.
- **Undo can cost minutes** unless the element keeps replaced results, and cause-grouping is
  not yet a rule of the journal that does not yet exist.
- **The assistant's tools are a published contract** for prompts and their tests; rewriting
  them as session commands is a medium element change plus a rewrite of the prompt tests.
- **The mocks are stills with plausible values**, light-theme except one, and still carry the
  audit's majors (five count formats, per-screen legend and mode-switch copies). They show the
  paradigm; they are not pixel truth.
- **Restraint hides unbuilt features by design.** Thirteen "Coming" tags disappear because the
  model draws a row only when the capability exists. That is a promise that every row drawn is
  backed by the element; the feature-fit tables are where each row's backing is recorded, and
  the two Export rows drawn on screens 2 and 6 without an exporter behind them are the first
  places the promise is not yet kept.

## 5. Round 2

Round 1 above is kept as written. The owner's feedback on it produced a second round, which
lives in `round-2/` (the design `revision.md`, the screen specs `screens.md`, the choices
`decisions.md`, the capability coverage `coverage.md`, the owner's points answered one by one
in `answers.md`, and the two critiques and two audits that shaped it). The current mocks are
`mocks/v2/` (fifteen screens); `mocks/` holds round 1 for history.

### What changed, and why

- **One frame, no rail, no hamburger.** The round-1 mocks borrowed Figma's editor and silently
  dropped its rail while keeping a hamburger glyph; both were frame decisions never argued.
  Every rail candidate was weighed by the rows it would hold: only the tree is a panel that
  replaces nothing, so the frame is two 240 px panels, the dataset name as the file menu, the
  Views list above the tree, a bottom dock (Table, Assistant, History) with a 32 px handle when
  closed, and a "?" button in the status bar. Layout is the Dataset's Layout tab; camera is
  the framing pill, the mode switch, the keys and the Views list; "Data" and "Table" are one
  object seen two ways.
- **The inspector is a fixed header block and three or four tabs per kind, never five, at 14
  rows each.** Round 1's Dataset panel was 31 rows and its Measure 34. The tabs are jobs
  (Values, Define, Style, Record); the header (name, chip, count, state, reading, tabs) never
  scrolls; overflow goes to a disclosure or "See all in table". Node style, edge style and
  group style are the NODES and EDGES sections of one Style tab on every kind.
- **Every creation tool arms and shows a secondary bar** stating what will run, on what, at
  what cost, with one Run; a parameters popover before the first run; the row appears at once
  in one of six states. A new Structure tool holds the skeleton algorithms; the flyout is
  chosen by the question the algorithm answers.
- **Highlights are not exclusive.** A Path is an edge style layer that stacks like node
  layers; several show at once, told apart by colour, width, pattern and arrows, with a
  per-channel rule on shared edges and a highlight palette disjoint from the categorical ones.
- **Styling has one grammar**: NODES and EDGES sections with a "+" each, every row led by its
  channel name; an encoding block (scale, palette, values from and to, clamp, missing, legend)
  for a continuous value; a palette with per-Group overrides and a Largest rule for a group
  value.
- **The timeline is a transport bar** under the canvas with its settings in a gear, three doors
  to it, a window that masks and never stales, and an interval model for GEXF data. Every
  remaining capability of the inventory is placed (`round-2/coverage.md`: 341 rows, 312
  natural, 22 awkward with repairs, 2 do not fit, 5 unplaced with proposed homes), eleven of
  them in a Settings sheet.
- **Two dialogs exist on paper**: the Import dialog with a preview and column roles as selects
  (screen 14), and a reload that keeps the objects when a column role is changed after the
  first runs (screen 15).
- **The mocks are generated**, so the chrome is identical on every screen, and the measured
  audit's blocker (primary-button text rendering dark) and majors (three label grids, three
  pill tabs, two framing readouts, five count spellings) are fixed in the kit and the
  generator, not by hand.

### Settled

The three the owner settled: graphty-element owns the tree (and undo goes with it); the
session contract moves to one set vocabulary (plus an edge-list scope and a run-result set);
highlights are not exclusive. Of round 1's thirteen questions, 3 (edited runs keep the object
id and replace the run), 4 (Compare takes two objects), 5 (the word is "Style" on every kind),
6 (batch members after the first are created with the eye off), 7 (labelled tools), 8
("Export"), 9 ("Create and focus"), 10 (build order follows the analyst), 11 (nodes are
material), 12 (a headset is a viewer this phase) and 13 (label matching now, overlap matching
as element work) are decided in `round-2/decisions.md` with their reasons; each is reversible
except where it names an API member.

### Open, with recommendations

Each is one-way once built (a published behaviour or API shape) or a measured trade-off, so
the owner should confirm before element work starts. Full reasons: `round-2/decisions.md`.

1. **The first-paint rule as element behaviour**: first free channel in a per-kind order,
   categorical wins Colour, never drops itself. Replaces the auto-apply rule that drops a
   suggestion under an authored layer. Recommend yes; otherwise the second algorithm never
   paints once the objects API authors every layer.
2. **Nodes follow their edges under a time window** (a node with no time value is inside when
   one of its edges is). Recommend yes; the alternative excludes edge lists with dates.
3. **The window never marks an object stale**; its bounds go into the run's caveats instead.
   Recommend yes; Focus never stales either.
4. **Batch members after the first are created with the eye off**, replacing the element's
   coalescing of a batch to one layer per channel. Recommend yes; every object stays editable.
5. **New API members**: `Scope` gains `{edges}` and a run-result kind; `data.neighbours`,
   `data.peek`, `statistics().reading()`, `scope.statistics`, a `{between}` selection target,
   a `backend` field on runs and estimates with a per-start override, the interval window
   shape, `LegendBlock` width and pattern, undo and redo on the objects API. Recommend all;
   each is small and each has one surface that cannot be drawn without it.
6. **A "defined, not started" object, and a parameter edit that starts a new run replacing the
   old under the same id with the old result kept in the journal.** Recommend yes; it is the
   waiting state and undo after a re-run.
7. **Tool labels**: 8 px at 40 px buttons as drawn, or 9 px at 44 px (a 750 px bar, still inside
   the 1280 px canvas). Recommend keeping 40 px and testing both with two readers.

### The element work, sized

Small is a day or two in one module; medium a week across modules and tests; large a subsystem
or a published-contract change. Section 7 of `analysis.md` sizes round 1's list; this is what
round 2 adds or changes, from `round-2/revision.md` sections 5.7, 8 and 9.3.

| Item                                                                                                                                                                          | Size                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| The query engine attached (#149), which the Path bar's name field and every rule Set need                                                                                     | large (unchanged)    |
| One set vocabulary with the edge-list and run-result kinds; filters evaluated within a scope                                                                                  | medium               |
| The objects API with undo and redo, repeat naming, reload-with-replay                                                                                                         | medium to large      |
| Exclusive highlights opt-in; the disjoint highlight palette; a layer selector by scope with induced edges; a top-N selector; legend width and pattern                         | small each           |
| The first-paint rule (per-kind order, categorical wins Colour, never drops); batch eye-off; coverage from member masks; `encodeAttribute`; saved styles                       | small each           |
| Themes restricted to match-everything layers with an unlocked dataset-default layer                                                                                           | medium               |
| The legend drawn by the element and into captures (#292)                                                                                                                      | medium               |
| `data.peek`, `data.neighbours`, `statistics().reading()`, `scope.statistics`, `{between}`, `backend` and the per-start override, partial results on cancel, the waiting state | small each           |
| The window: nodes follow edges; excluded from the staleness digest with bounds in caveats; the interval form and a pair or spells column as the time role                     | small, small, medium |
| Per-step summaries and change counts (#300)                                                                                                                                   | medium               |
| A second renderer with a per-canvas mask (#186); an agreement statistic and a Difference                                                                                      | large; small         |
| Re-mapping weight, label and direction without a re-import                                                                                                                    | medium               |
| A parameters form from option descriptors (#336); registration of k-core, link prediction, #310, #311, #329, #330, #55, #192                                                  | small; per issue     |

### Rough edges that remain

- The 8 px tool labels are below the kit's minimum; the tooltip carries the name until the
  owner picks a size.
- Compare's second mask and the Import preview are drawn but rest on the largest element items
  (the second renderer, the query engine).
- Group identity across re-runs is by label until overlap matching exists; the Record tab says
  so.
- Scale is still unmeasured: every mock is 34, 115 or 412 nodes. The round-1 prototypes
  (section 3) still come first.
- The group-swatch rows keep their chit at the label's x, the one row shape that is not on the
  68 px grid; the secondary bar's shadow and the flyout's 8 px offset from its chevron are
  recorded and not changed.

## 6. Round 3: the key functions

**What was missing.** Round 2 drew the frame and the object model, but 99 functions the app
needs, or a reader needs for analysis and drawing, had no drawn way in. The plainest: after the
first load, no screen showed how to open another file; the file menu was described in words and
always drawn closed. The others fell in eight areas: files and projects (8, among them save and
reopen, unsaved-work warnings, recovery after a closed tab), getting data in (14: a drop on a
loaded graph, paste, a URL, a database, failures, progress, files too large to draw), editing
data (11), undo and errors (6), finding and selecting (15), filters and sets (10), analysis
results (16) and layout, look, export and presentation (19).

**What resolves it.** Screens 16 to 102, and screens 1, 13 and 14 redrawn, give each function
its entry point and its main state. Every way in opens one Import dialog; the file menu is drawn
open; a project file, autosave and a Recent list keep work; undo has a History dock; a failed
run offers Retry and, separately, a CPU retry with its cost; Find, right-click menus, box
selection and Focus are drawn; the Export button opens an Export sheet for images, data,
reports and video. Only a few surfaces are new (the Export sheet, a scatter-plot panel, the
minimap card, the table's Rejected and Findings tabs, a second Dataset root, two canvas panes).
The design is `round-3/revision-round-3.md`; each area has its own document in `round-3/`.

**New graphty-element work, by size.** Large: the project document (#301), several datasets in
one session, collapsed group rendering, a second renderer for comparison (#186), pattern
matching, subset loading. Medium: a staging load that never damages the open graph, autosave,
recipes, the render ceiling (#302), Neo4j and STRING readers, column commands, join (#298),
merge, formulas, the history journal (#145), text search (#149), box selection, the minimap
(#293), edge picking (#319), keyboard navigation, sweeps (#194), per-step time runs (#300), a
public layout controller (#144), looks (#331), data export through graph-io, reports (#187).
About forty small items complete it; `round-3/revision-round-3.md` section 6 lists them.

**Decisions for the owner.**

| Question                                                                                                   | Recommendation                                                                                                   | Door                       |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------- |
| The project file's format                                                                                  | the objects API's saved form plus Views, notes and positions, data embedded or linked by fingerprint, `.graphty` | one-way (published format) |
| The recipe file's format                                                                                   | the project document's steps without data or positions, `.recipe.json`                                           | one-way (published format) |
| About thirty new public session calls (`data.find`, `data.distribution`, `data.join`, `data.compute`, ...) | review all names and shapes in one pass before the first is built                                                | one-way (published API)    |
| Two live datasets in one session                                                                           | build "combine two files into a new graph" first; decide on two live roots after use                             | costly to undo             |
| Autosave keeps data files up to 50 MB in the browser                                                       | keep it, the limit in Settings, a line in Recent when a file was too large                                       | two-way                    |
