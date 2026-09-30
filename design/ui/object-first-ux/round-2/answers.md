# Round 2: answers to the owner's feedback

Each of the owner's points is quoted, then answered with the decision taken, the evidence for
it, and the mock that shows it. The mocks are `../mocks/v2/screen-1.png` to `screen-15.png`
(gallery: `../mocks/v2/index.html`); the design is `revision.md`, the screen specs
`screens.md`, the decisions with their reasons `decisions.md`, all beside this file. Paths are
under `/home/apowers/Projects/graphty-monorepo/design/ui/object-first-ux/`.

A few words used below, defined once. An **object** is a row of the left panel's tree: a
**Set** (a list of nodes or edges with one look: a path, a filter result), a **Measure** (one
number per node: a centrality), a **Grouping** (one label per node: communities) with a
**Group** row per label, or the **Dataset** (the root row). The **inspector** is the right
panel. A **tool** is a toolbar verb that makes an object; **arming** a tool turns it blue and
opens a one-line dark **secondary bar** above the toolbar that says what will happen, on what,
at what cost, with the one button that does it. A **channel** is one visual property (node
colour, edge width); a **style layer** is one rule in graphty-element's style stack; an
**encoding** binds a value to a channel through a scale and a palette. The **mask** is what is
showing; **Focus** masks to one object's members; a **time window** masks to a span of a time
column.

---

### 1. "the mocks are inconsistent -- some have a hamburger menu, and some have a left rail"

**Decision: no rail, and no hamburger.** One frame: two 240 px panels, the dataset name with
a chevron as the file menu (Figma's file header), the Views list above the tree, one bottom
dock (Table, Assistant, History) whose tab strip stays as a 32 px handle when closed, a "?"
ghost button at the right end of the status bar for Help.

**Evidence.** The round-1 mocks did not disagree with each other; all eight drew a hamburger
glyph and no rail. They disagreed with their two references: the Figma study has a 56 px rail
and the current app has a six-activity rail (`revision.md` 1.1). Both frames were then argued
(1.2 to 1.5): of eleven candidates for rail items, only the tree is a panel that replaces
nothing; Table, Assistant and History need the tree beside them, so they are docks under
either frame; everything else is rows of the Dataset's inspector or a menu. A rail would be 56
px for one permanently pressed button, and at the 1280 px window the 725 px toolbar fits the
800 px canvas only without a rail.

**Where to look.** Every app screen, 1 to 10 and 12 to 15, has the identical chrome: the
measured audit finds the file header, the section headers, the framing pill, Export, the
toolbar, the dock handle and the status bar at the same box on all of them, because one
generator (`/home/apowers/Projects/graphty-monorepo/tmp/object-first/gen/render.mjs`) draws
every screen from one spec.

### 2. "if using the left rail, do layout, camera, etc. actually have enough content to fill out a panel?"

**Decision: no, and that is the strongest reason there is no rail.** Layout is five to eleven
rows and is a property of the Dataset (one arrangement is in force for the whole graph), so
it is the Dataset's **Layout** tab. Camera is nine commands (zoom in, out, fit, to selection,
four framings, reset, save view), none with state to edit, so it is the framing pill's menu,
the mode switch, the keys and the short Views list.

**Evidence.** The table in `revision.md` 1.2 lists every rail candidate with the rows it
would actually hold and whether that is a panel. Layout's rows are itemised in 2.4 (Layout
tab, 11 rows at most); camera's in 6.2 (Views).

**Where to look.** Screen 2 shows the Dataset's tab strip (Overview, Layout, Canvas, Data);
the framing pill and its readout are on every screen's right header and status bar.

### 3. "if using the left rail, why are 'data' and 'table' different?"

**Decision: they are not two things.** "Data" is the Dataset object: the root row of the
tree and its inspector (Overview, Layout, Canvas, Data tabs). "Table" is the same material at
full resolution: the bottom dock's Table tab, one row per node or edge, with a column per
attribute and per object. One object, two views of it; neither gets a rail item.

**Evidence.** The current app's split came from a task-first rail ("Data" was the import
activity) (`revision.md` 1.2, "Why Data and Table were two things"). The comparison document
counted duplicate homes against the current app; a rail item for either would be one.

**Where to look.** Screen 10 (the Dataset on its Data tab: the attribute catalogue, the Time
role) and screen 9 (the Table dock open under the canvas, the selected node's row tinted,
object columns headed by their style chips).

### 4. "what would running algorithms look like?"

**Decision: every creation tool works one way.** Press the key or the button: the tool arms,
the secondary bar reads "Rank by [Bridges v] on what is showing, 115 nodes, about 2 s
[Options] [Run] Cancel". Choose the variant in the bar's select or the flyout; optionally open
the parameters popover (scope line, Weights and Direction, Exact, the cost line, Run). Run, or
Enter. The row appears in the tree at once: computing (a progress ring in its count slot) when
under the cost gate, waiting (a hollow circle and a small "Run (4 min)" button) when over it.
When it ends the row has its count and chip, the inspector opens on Values (what did I get),
the reading sentence sits in the header ("Node 34 has the most influence; the top three hold a
third of it"), and the element's suggested paint takes the first free channel. Editing a
parameter re-runs at once when cheap and marks the row stale (amber dot, old paint kept, a
Re-run button with the cost) when not. A GPU failure is a failed row with Retry and an
explicit "Retry on the CPU", never a silent fallback. Six states, one glyph each, are drawn in
the tree, the inspector summary row and the status bar.

**Evidence.** `revision.md` section 4 walks the fourteen steps with what appears where, and
the state table after it. Pass 3 (section 9.1) added: a suggestion row under a fresh Dataset
runs at once instead of arming; the bar's Run dims while the popover is open; a flyout row's
tooltip says a click runs.

**Where to look.** Screen 4 (Rank armed: the bar, the flyout with the Measure icon on every
row and the cost at the right, the parameters popover), screen 5 (the same run computing at
42 percent beside a waiting object with its Run button; the status bar's computing chip),
screen 11 (every button, every flyout, every bar sentence on one sheet).

### 5. "'highlights are exclusive' -- paths are just edge styles, they should layer just like node styles..."

**Decision: adopted, and it is the design's rule for every Set.** A Path is an edge Set whose
Style tab has an EDGES section (Colour, Width, Pattern, Arrows, Animation, Opacity, Curve,
Label) and a NODES section (an Outline in the path's colour by default, not a fill, so the
community colour under it stays visible). Every Set is its own row, its own layer, its own
colour from a highlight palette the element ships disjoint from every categorical palette.
Where two paths share an edge the per-channel rule decides: the higher row's Colour wins, but
the lower row's Width or Pattern still shows if the higher row does not write it. The
element's "a highlight is exclusive" rule is retired (the objects API passes `exclusive:
false`); a run-backed Set's selector is the value test `results.<run>.onPath == true`, never
a presence test, because the membership column carries false for every node the run looked
at and did not choose.

**Evidence.** `revision.md` 5.4 and the settled-decisions block; the element work is four
small items (5.7). Dimming what a path did not select stays the reader's choice (a "Dim the
rest" verb that makes a visible, movable Set), never a suggested style, per the root
`CLAUDE.md`.

**Where to look.** Screen 8: two Paths in the tree, 12 -> 30 in 3 px dashed purple and
1 -> 34 in 5 px solid magenta with arrowheads, the shared edge purple and dashed with the lower
route's arrowhead still showing, every node keeping its community colour, the legend listing
both routes with their line swatches, and the selected Path's Style tab with NODES (Outline 2
px) and EDGES (Colour, Width, Pattern) and the sentence "Shares 1 edge with Path: 1 -> 34;
this path wins Colour, Width and Pattern on it".

### 6. "'Does the element own the tree' -- yes"

**Taken as given.** The objects API lives on graphty-element's session (list, create, move,
rename, set visible, set locked, set scope, re-run, remove, focus, membership lookup, coverage,
an objects-changed event), built over the runs, saved scopes and layers it already has; its
saved shape is the project file (#301). The app draws the tree and nothing more. Undo goes
with it: the objects API keeps the journal (#145) and exposes undo and redo, because the state
an undo restores (a replaced run's result, a removed row's layers) is held only by the
element. Pass 3 adds two behaviours to the same API: a reload that keeps the objects by
replaying their definitions (screen 15), and naming a repeated run by what differs.

**Where to look.** `revision.md` settled decision 1; `decisions.md` S1. Screen 15 shows the
reload dialog that the API's replay makes safe.

### 7. "'Do we change the published session contract to one set vocabulary?' -- yes"

**Taken as given, with two additions the decision as first written did not cover.** The scope
type gains filters, top-N, above-threshold, a group and the combinators; the filter type gains
a scope and is evaluated within it; a layer selector accepts a scope; an edge target resolves
to the induced edges of a node scope. The additions: an **edge list** scope (`{edges:
EdgeId[]}`) and a **run-result set** (the members a run chose, such as a path), because today
`Scope` has only `{nodes}` and an edge Set could otherwise not be saved, scoped to or combined.
Filter sets, scoped runs, Combine, Focus and every Set's Style become one mechanism.

**Where to look.** `revision.md` settled decision 2; `decisions.md` S2 (one-way once built,
which is why it is recorded here rather than assumed).

### 8. "the right panel has too much content ... maybe tabs for 'data', 'node style', 'edge style', 'group style', 'overview'... I dunno, that's a lot too"

**Decision: a fixed header block, then three or four tabs per object kind, never five, and a
14-row budget per tab.** The header block (144 px, never scrolls) holds the kind and name, the
style chip and count and state, the one-sentence reading with its "?", and the tab strip. The
tabs are jobs, as Figma's Design and Prototype are: Dataset: Overview, Layout, Canvas, Data;
Set: Define, Members, Style, Record; Group: Members, Style, Define, Record; Measure: Values,
Define, Style, Record; Grouping: Groups, Define, Style, Record; Node: About, Attributes, Links.
No tab exceeds 14 rows with every conditional row drawn (what fits a 1366 x 768 laptop under
the header); overflow goes to a disclosure (a collapsed section whose header carries its
one-line summary), an "and N more" row, or "See all in table", never a longer scroll. The
strip remembers the last tab per kind, and four events override it (a finished run opens
Values or Members; a waiting or failed object opens Define; a chip click opens Style).

**On the five-tab suggestion.** The instinct is right and one thing is trimmed: node style,
edge style and group style are three views of one job (how does it look), and splitting them
would put a Path's edge rows one tab away from its node rows. They are the NODES and EDGES
sections inside one **Style** tab on every kind, and a Group's style is the same tab with the
inherited row and the override above it. Four names must also fit 216 px at 11 px: at most 27
characters in total, which every set above meets and five did not (`revision.md` 2.3; the
check is `tmp/object-first/tab-width-check.mjs`).

**Evidence.** `revision.md` section 2 (2.1 counts round 1's 31- and 34-row panels; 2.4 lists
every tab's rows with its maximum). Round 1's Time tab became the transport bar's gear. Pass 3
reordered a Group's tabs so its first click lands on Members.

**Where to look.** Screens 2 (Dataset, Overview), 3 (Group, Style), 5 (Measure, Define while
computing), 6 (Measure, Style), 7 (Grouping, Style), 8 (Set, Style), 9 (Node, About), 10
(Dataset, Data). Each shows the header block, the strip, and white space under the rows.

### 9. "what are all the buttons in the toolbar?"

**Decision: nine tool buttons and the mode switch, six flyouts, every item with its icon,
label, key, what it does and whether it exists today.** Left to right: Select (V) with a
flyout (Select, Lasso, Front only); Hand (H, or Space held); a divider; Filter (F: By values,
By range, By connections, By rule, By id list, Largest connected part, Pattern; Target Nodes
or Edges); Neighbours (E); Path (P: Shortest route, All routes, Most that can flow, Weakest
link between two, Weakest link anywhere, Best pairing); Groups (G: Communities and its
variants, Steps away from a node, By attribute..., Several..., Sweep...); Rank (R:
Connections, Bridges, Reach, Influence, Influence by association, Influence at a distance,
Hubs and authorities, Clustering, Bridges (edges), Unusual nodes, Exploration order,
Several...); Structure (S: Separate pieces, Densest shells, Bridge edges and cut points,
Cheapest connecting network, Cheapest network from a node, How far from everything, Distances,
Likely missing links); a divider; Note (N); Ask (backtick); a divider; the 2D | 3D | VR | AR
mode switch (5 toggles 2D and 3D; VR and AR drawn only when the browser reports support). The
bar is 725 px, 56 px tall, with 40 px labelled buttons (Select and Hand 32 px, unlabelled), so
it fits the 800 px canvas of a 1280 px window with 37 px to spare each side. Every flyout row's
left icon is the kind of tree row it will make; the bold row is the face a plain click runs;
the cost from the element's estimate sits at the right; a proposed row is absent from the app
until its capability is registered. The placement rule: the flyout is chosen by the question
the algorithm answers (who matters, what groups, how are A and B joined, what is the
skeleton); the result shape decides what it hands back; a plugin lands by its catalogue
category.

**Evidence.** `revision.md` 3.3 (the button table), 3.4 (every flyout with each row's
status), 3.5 (the secondary bar's sentence per tool), 3.6 (the placement rule and what moved
from round 1). What is not on the toolbar and where it went: zoom, legend, minimap, undo,
export, Combine, search, layout, comments as a mode.

**Where to look.** Screen 11, the toolbar reference sheet: the bar at 1:1 with a callout per
button, the fit at 1280, every flyout open in a column with proposed rows at 50 percent and
their issue numbers, the bar sentences and the parameters popover. Screen 4 shows one flyout
in the app frame.

### 10. "how does styling of continuous and group values work?"

**Decision: one grammar on every Style tab, with two row shapes inside it.** Every Style tab
has NODES and EDGES sections, each with a "+" listing the channels it can add, and every row
begins with its channel name.

A **continuous value** (a Measure) paints through an **encoding block** per channel, drawn as
an accordion (one open at a time): the header "Colour v [ramp]" with an eye and a minus; Scale
[Even steps v] (the catalogue's nine scales by plain name: Even steps, By order of magnitude,
By significance, By area, Curved, Equal ranges, Equal counts, One colour per value, Use the
value as it is; only the scales that suit the value's kind are offered); Palette (the ramp
itself as the select's face); Values from | to (the bounds the scale maps, scrubbable);
Reset, Reverse, Clamp outliers (cuts at the 2nd and 98th percentiles and says so in the
legend); Midpoint when the palette is diverging; Missing (the colour for an element with no
value); Sizes from | to instead of a palette on a size, width or opacity channel; a legend
preview. "Colour and size" in the "+" adds both blocks in one click.

A **group value** (a Grouping) paints through a Colour block whose rows are the palette
(categorical: Okabe-Ito, Tol, Pastel, Carbon, custom, each with its capacity and a
colour-blind-safe mark), one swatch row per Group in size order (five, then "and N more"),
Other (the overflow colour), Overflow (Other, Shape, Extend) and Largest (how many Groups get
their own colour and their own tree row; the rest collapse to one "Other" row in the tree and
the legend). Clicking a Group's swatch writes an **override** on that Group: a layer inserted
directly above the Grouping's in the element's stack, marked by a dot on the chip, removable
with its minus; a Group's own Style tab shows the override row above the inherited row "Colour
[chit] From Communities". Children paint above their parent, so an override wins on that
group's members and nowhere else. Precedence between objects is the tree order per channel;
a covered object's Style tab says "Covered by Influence on 12 of 12 members".

The first paint is the element's suggestion and takes the first free channel in a per-kind
order (Measure: Colour, Size, Opacity; Grouping: Colour, Outline, Shape; Set: Outline, Colour,
Glow), and since pass 3 a Grouping created while a Measure holds Colour takes Colour and moves
the Measure to Size, so the picture no longer depends on which button was pressed first.

**Evidence.** `revision.md` 5.1 to 5.7; the element work is listed in 5.7 (eleven items, ten
small). Looks (base presets), saved styles (an object's rows as a preset) and palettes are
three different things with one home each (5.6).

**Where to look.** Screen 6 (Influence on the viridis ramp: the open Colour block, Values
from and to, Clamp and Reverse, Missing, the legend preview, Size collapsed to its header),
screen 7 (Conference: the nine-colour palette as the select's face, five swatch rows with
conference 4's override dot, Other, Overflow, Largest), screen 3 (Group 2's override row above
its inherited row).

### 11. "again, make sure that all current and proposed graphty-element features are considered. e.g. how would a timeline work?"

**Decision on the timeline.** A time window is a mask, like Focus, and the two compose. Its
surface is a 40 px **transport bar** across the canvas above the dock handle, drawn while a
window is on: the window readout, step back, play, step forward, speed, a slider over the full
range with the window as a translucent band whose handles snap to whole steps, tick marks
where the per-step change count is high, the in-window counts, a gear and a close. The gear's
popover holds what round 1 had nowhere: the time attribute (or From and To for interval data
such as GEXF spells), the unit, the window bounds, Sliding or Cumulative, the step, the speed,
"Re-run objects while playing" (off by default), "Re-run layout per step", the per-step change
counts, and Over time (the temporal result, #300). Three doors: a Findings row "Time column:
sent, 2019-01 to 2019-12 [Show over time]" on the Overview while a time-typed column has no
role, the Data tab's "Time [sent v]" row, and (pass 3) a time glyph in the status bar's
counts. A window never marks an object stale: a Measure keeps its whole-year values with the
caveat "computed on 2019-01 to 2019-12" in its legend block and summary row, and "Re-run
objects while playing" is the explicit opt-in. Nodes follow their edges (a node with no time
value of its own is inside the window when one of its edges is), which is a doctrine change in
the element without which an edge-dated email network hides no node at all. A View saves the
window; video export can record while it plays; Compare can put two Views side by side (pass 3).

**Coverage of everything else.** `coverage.md` places every row of the capability inventory
(`../inventory/element-capabilities.md`): 341 rows, of which 312 fit naturally, 22 are
awkward (16 distinct capabilities, each with a proposed repair in its section 13), 2 do not
fit (progressive loading, the edge tooltip until edge picking exists) and 5 were unplaced and
now have a proposed home. `revision.md` 6.2 to 6.12 give one paragraph each to saved Views,
video export with camera paths, XR entry, the assistant creating objects, notes and
annotations, comparing two objects, screenshots and export, labels and declutter, palettes and
legends, acceleration status, and a Settings sheet (screen 13, specified) for the eleven
capabilities that are preferences.

**Where to look.** Screen 10: the Email network with the window 2019-03 to 2019-05, the
transport bar, the gear popover open, the whole-year communities keeping their colours, the
Data tab with the time role on `sent`, and the status bar's window mask. Screen 11 for the
algorithm catalogue; `coverage.md` for the table.

---

## What is still open for the owner

Three of the pass-3 choices are recorded as open in `decisions.md` because they touch the
element's published behaviour or a measured trade-off, and each has a recommendation:

1. **Tool labels: 8 px at 40 px buttons (as drawn) or 9 px at 44 px (a 750 px bar).** The 8
   px labels are below the kit's own 11 px minimum; the 0 ms tooltip is the readable form. The
   recommendation is to keep 40 px and test both with two readers, since 44 px still fits the
   1280 px canvas.
2. **The first-paint rule as element behaviour** ("first free channel in a per-kind order,
   categorical wins Colour, never drops itself") replaces the element's auto-apply rule that
   drops a suggestion when an authored layer holds the channel. A consumer relying on that rule
   would notice. Recommendation: yes; without it the second algorithm never paints once the
   objects API creates every layer as authored.
3. **Nodes follow their edges under a time window**, a change to the element's "no value means
   inside" doctrine that a consumer windowing an edge-only column would notice (fewer nodes
   drawn). Recommendation: yes; the alternative excludes the commonest temporal data, an edge
   list with dates.
