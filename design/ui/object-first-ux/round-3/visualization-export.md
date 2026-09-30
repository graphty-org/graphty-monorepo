# Layout, styling, export and presentation: the drawn design

This document resolves the nineteen gaps of the "Layout, styling, export and presentation"
cluster in the gap register (`design/ui/object-first-ux/round-3/gaps.md`). Each gap is a function
the app needs, for which the round-2 object-first design (`round-2/revision.md` and the mocks in
`mocks/v2/`) had no drawn way in, or no drawn state once there. For each one this document gives
the design (where the reader starts it, what they see, the rows, the keys, what happens when it
goes wrong), what graphty-element must provide for it, and which mock now draws it. The mocks
are screens 83 to 100 in `design/ui/object-first-ux/mocks/v2/`, built from the specs in
`tmp/object-first/gen/screens/screen-83.mjs` to `screen-100.mjs`.

It is written for an engineer who is not a designer. Paths are under
`/home/apowers/Projects/graphty-monorepo/`. `#NNN` is an open issue in
graphty-org/graphty-monorepo. `session.xxx` is a member of graphty-element's session API in
`graphty-element/src/session/`.

## Words used here

The round-2 terms (`round-2/revision.md` section 0) apply; the ones this document leans on:

- **Object**: a row in the left panel's tree, made from the data (a Set, a Measure, a Grouping,
  a Group) or the data itself (the Dataset). **Set**: a list of nodes or edges painted with one
  look. **Measure**: one number per node or edge. **Grouping**: a label per node, and a folder
  of **Group** rows, one per label.
- **Inspector**: the right panel. It shows what was selected last, or the Dataset when nothing
  is. Its top is a fixed **header block** (kind, name, a one-line summary, a one-sentence
  reading); under it a row of **tabs**.
- **Popover**: a 240 px light panel that floats over the canvas beside the control that opened
  it. **Menu**: a list of commands that opens from a button and closes on a choice.
- **Secondary bar**: the dark one-line prompt above the toolbar while a tool waits for a click
  on the canvas.
- **Mask** (what is **showing**): the one visibility filter; elements outside it are not drawn.
  **Focus** sets the mask to one object's members.
- **Channel**: one visual property a Style can write (node colour, node size, edge width...).
  **Encoding**: a channel bound to values through a scale and a palette.
- **Status bar**: the 24 px line at the bottom; its **computing chip** shows a running job with
  Cancel, its **layout chip** the state of the layout.
- **Sheet**: a panel that takes the whole right panel's place for one job and gives it back when
  the job is done or cancelled. This document adds one: the Export sheet (section 4.0).

### How the mocks draw a menu and its result together

Several functions start from a menu (Export, a column's menu, a channel "+"). Where the menu
itself was never drawn, the mock draws the dark menu at its control with the chosen row
highlighted and a tag, "A moment before", **beside the state that choice leads to**. In the app
the menu closes on the choice.

## Summary

| Gap | Resolution in one line | Screen | Element work |
|---|---|---|---|
| Dataset Layout tab | Layout select listing the catalogue with the recommendation first; Pause, Step, Re-run with the same or a new seed; Apply to; Dimensions; where it runs | 83 | a public layout controller on the session (medium, #144) |
| Layouts that need an input | the input's row appears under Layout (Root, Group by, Order by); the root is picked on the canvas or typed; cross-links counted | 84 | a direction option on Tree (tiny); radial served (per issue) |
| Lay out only part of the graph | "Arrange only these..." on any Set, Group or selection; Layout tab's Apply to; Back to whole graph | 85 | layout over a scope, the rest fixed (medium, #144) |
| Drag, pin, unpin | a drag pins; a pin marker; a system Set "Pinned"; Unpin all on the Layout tab and on the Set | 86 | pinned list, unpin all, a pins event, the marker (small) |
| Dataset Canvas tab | eleven rows: background, look, labels, edge labels, tooltip, legend and minimap, note markers, show hidden faintly, default look | 87 | looks (medium, #331); background (#291); legend (#292); minimap (#293) |
| Show hidden faintly | a switch on the Canvas tab; outside the mask at about 15 percent | 87 | exists (`visibility.showContext`) |
| Label control | Labels row plus a Labels popover: which nodes, text from, text style, place, wrap, face the camera, fade, avoid overlaps; Edge labels row | 88 | top-N scope as a layer selector (small); wrap (#294); overlaps (#5) |
| Hover tooltip and neighbours | tooltip with label and three values; neighbours lit, rest dimmed; tree rows in hover fill | 89 | the hover-highlight layer (small); `session.data.neighbours` (small) |
| Diverging palette | the picker groups palettes by kind; a diverging palette adds Midpoint and Symmetric; missing values grey with a count | 90 | a symmetric flag (tiny); midpoint and diverging palettes exist |
| Edge width or colour by an edge column | the column's menu on the Data tab and the table; an edge Measure with EDGES > Width | 91 | `encodeAttribute` on edges (small); a width block in the legend (small) |
| Node shape and the channel menus | NODES "+" and EDGES "+" menus listing every channel; a Shape block per group | 92 | shape palette and legend shape column (small) |
| Style one node | "Style this node..." makes a one-node Set at the top; its Style tab lists every inherited channel as a clickable row | 93 | exists over the objects API; `styles.explain` for the inherited rows |
| Save, apply, import, export styles | a Saved style section on every Style tab; Import styles dialog; Export styles | 94 | saved style as a selector-free template (small); an "add" mode for templates (medium, #331) |
| Export menu and image | Export menu in two groups; the Export sheet's Image tab; Copy image | 95 | legend in captures (#292); framing by a View (small) |
| Export data | the Export sheet's Data tab: writable formats, scope, positions, object columns | 96 | wire graph-io's exporters and a `session.data.export` (medium) |
| Export report and bundle | the Report tab: objects and sections checklist, format; the bundle as a format | 97 | a report builder (medium, #187); a bundle once the project file exists (#301) |
| Export video | the Video tab: camera along the saved views, sources, format, progress | 98 | views as waypoints (small); layout and time sources (medium, #144, #300) |
| Present mode | File > Present (Shift+\): chrome hidden, a pill steps through the saved views | 99 | a view that carries its mask (small); the rest is app chrome |
| Enter and leave VR or AR | right-click on the segment picks what to take in; the desk during a session; the return notice | 100 | enter with a scope (small); the headset's node limit published (tiny) |

---

## 1. Layout

The layout is a property of the Dataset (round-2 decided it is not a panel), so its home is the
Dataset's **Layout** tab. The reader reaches it by clicking empty canvas (nothing selected shows
the Dataset) and the Layout tab, or in one click from the status bar's layout chip ("Spread out:
settling 62%"), which opens the Dataset on Layout wherever the reader is.

### 1.1 Choosing and controlling the layout (screen 83)

**Rows**, top to bottom (11 at most, within the 14-row budget):

| Row | Control | Notes |
|---|---|---|
| Layout | [Spread out v] and a gear | the list is `catalog.layouts()` in plain names (below); the gear opens the engine popover |
| Progress | "Settling 62%" [Pause] [Step] | "Settled" when done; Pause becomes Resume; Step advances one tick while paused. A batch layout (Ring, Tree) shows "Placed" and no Pause |
| Re-run | [Same seed] [New seed] | re-runs from scratch; New seed gives a different arrangement of the same kind; Undo returns the old positions |
| Input rows (cond) | Root, Group by, Order by | only for a layout that needs one (1.2) |
| Apply to | [Whole graph v] | Whole graph, Selection (cond), then every Set and Group; not whole graph starts 1.3 |
| Pinned (cond) | "Pinned 2 [Unpin all]" | when any node is pinned (1.4) |
| Positions from file (cond) | "34 of 34 [Keep positions]" | when the file carried coordinates; Keep positions switches to the fixed layout |
| Dimensions | "2D, follows the view" | read-only; "2D only, flat in 3D" for a flat layout |
| Runs on | "CPU (GPU above 5,000)" or "GPU (NVIDIA T4)" | secondary text, from the element's acceleration state |

**The layout list** (the select, drawn open on screen 83): "Recommended  Spread out" first, with
the element's reason under it ("34 nodes in one part: any layout is quick"); then the served
layouts grouped by family with the current one tinted: Spread out, Spread out flat, Natural
grouping, No crossings; Ring, Concentric rings, Spiral, Scattered; Tree, Two columns, Columns by
group; Keep positions. A layout that needs an input says which ("needs a root", "needs groups",
"needs a Set"). Keep positions is greyed with "file has none" when the data carried no
coordinates. Radial and Grid appear when an engine serves them (the catalogue lists them as
unserved today). A plugin layout appears by its catalogue entry.

**The gear popover** (not drawn; its rows are all select or number rows): Engine [NGraph v]
listing the engines that draw this layout (for Spread out: NGraph, D3, ForceAtlas2, Spring,
Kamada-Kawai); the engine's own options from its option descriptors (repulsion, link distance,
gravity...); Weights [switch] with "from [weight v]" when the engine honours weights, or the line
"This engine ignores weights"; Seed [42] [dice]; a Pace section: Pre-steps, Steps per frame,
Stop when movement is below; [Reset to defaults].

**Keys**: no single letter (every free letter near the hand is a tool). The command palette
(Ctrl+K) has "Layout: pause", "Layout: re-run", "Layout: re-run with a new seed".

**Errors**: a layout rated below this graph's size is listed with its cost ("about 3 min") and
runs only after the cost gate asks; a failed run reads "Failed: <reason> [Retry] [Run on the
CPU]" in the Progress row and the layout chip turns red; a GPU failure never finishes quietly on
the CPU. A layout that needs an input and has none does not run: its input row is armed (1.2).

**Element**: `catalog.layouts()` (plain names, families, size ratings, `structuralInputs`) and
`recommendLayout` exist. Missing: a **public layout controller on the session**: set a layout
with options and inputs, pause, resume, step, re-run with a seed, a progress and settled event,
and which backend ran it. Today stepping lives on the internal `LayoutManager` and the element
exposes only `setLayout`. Medium; #144 (the positions and layout-event work).

### 1.2 Layouts that need an input (screen 84)

The catalogue declares three kinds of input: a **node** (Tree; Radial once served), a
**partition** (Concentric rings, Two columns, Columns by group) and an **ordering** (Ring and
Spiral, optional). Choosing such a layout inserts its input row directly under Layout:

- **Root** [node 1] [pick]: filled from the selected node if one is selected, else armed. The
  pick button arms the canvas: the secondary bar reads "Click the new root node, or type a
  name [node 34 v] [Cancel]" (the field is the same node lookup as Ctrl+F), the status bar
  reads "Layout: pick the root", and a click on a node sets it and re-runs. Esc cancels and
  keeps the old root.
- **Direction** [Down v] (Down, Up, Left, Right) for Tree.
- **Group by** [Communities v] lists the Groupings in the tree (and "a column..."); Two
  columns asks for a **Set** instead ("Left column [Degree > 8 v]").
- **Order by** [Load order v] lists Load order, then every Measure (Ring by Connections).

**States**: screen 84 draws Karate Club as a Tree from node 1 with the root being re-picked.
Edges that are not parent links stay drawn, faint, as cross-links, and the tab says "Cross-links
45 [Make a set]" so they can be inspected or styled.

**Errors**: nodes the root cannot reach are placed in a row under the tree and counted
("12 unreachable [Make a set]"); a partition with one group falls back to a single ring and
says so; a Grouping deleted while in use leaves the row empty and the layout stale ("Group by:
Communities was deleted [Choose]").

**Element**: the inputs and the Tree engine exist; missing are a Direction option on Tree (tiny),
the unreachable count and the cross-link list in the layout's result (small), and a Radial
engine (per issue; listed unserved today).

### 1.3 Arranging only part of the graph (screen 85)

**Entry points**, all the same verb: "Arrange only these..." on any Set's or Group's row menu,
on the several-elements inspector (a marquee selection), and on the canvas right-click menu of
a selection; and on the Layout tab, Apply to [Group 2 v]. The verb selects the Dataset, opens
its Layout tab with Apply to set, and runs the layout the list suggests for a subset (Ring for
a Group, Spread out for a selection).

**Behaviour**: only the members move, placed in the chosen shape around where they were; every
other node keeps its place (it is held for this run, not pinned). It is one undo step. The rows:
Apply to [Group 2], Layout [Ring], Order by, "Placed 11 of 34 [Re-run]", "The rest: Spread out,
kept", [Back to whole graph] (re-runs the whole-graph layout, which moves everything). The
layout chip reads "Ring on Group 2".

**Errors**: a subset with fewer than three members has no ring or tree ("Needs 3 or more");
arranging a Set whose members are hidden by the mask arranges only the showing ones and says
"8 of 11 showing".

**Element**: layout over a scope with the rest fixed. Medium, #144. The objects API resolves a
Group to its members.

### 1.4 Dragging and pinning (screen 86)

**Behaviour**: with Select, dragging a node moves it and pins it (the element already pins on
drag). Alt while dragging moves without pinning. A pinned node carries a small pin marker.
The tree gains a system Set **"Pinned"** (created by the first pin, removed by the last unpin):
its members are the pinned nodes and its Style is the marker, so its eye hides the markers,
Focus shows only pinned nodes, and deleting it unpins all. Re-running any layout moves every
node except the pinned ones.

**Unpinning**: Layout tab "Pinned 2 [Unpin all]"; the Pinned Set's menu "Unpin all"; one node's
Pin toggle (the pin beside Locate in the node inspector's header, drawn on screen 9) or its
right-click "Unpin". Every pin and unpin is undoable.

**Errors**: none new: the element refuses a layout step onto a pinned node whichever engine
runs, so a pin cannot be silently ignored.

**Element**: `Node.pin()`, `unpin()` and `isPinned()` exist. Missing: a session-level list of
pinned nodes, unpin by ids or all, a pins-changed event, a pinned scope the objects API can
show as a Set, a pin-on-drag switch, and the marker drawn by the element. Small.

## 2. The whole-graph look

### 2.1 The Dataset's Canvas tab (screen 87)

The rows that change the whole picture, not one object's (11 at most):

| Row | Control | Notes |
|---|---|---|
| Background | [chit] "Follow theme" | Follow theme first, then a colour, then "Image..." for a sky box (#291) |
| Look | [Default v] | the base looks (below) |
| Labels | [Top 6 by Connections v] and a gear | section 2.3 |
| Edge labels | [None v] | None, or any edge column |
| Tooltip | [Label + 3 values v] and a gear | section 2.4 |
| Arrows (cond) | [switch] | directed data only; writes the default layer |
| Legend \| Minimap | two switches | keys L and M; the minimap is #293 |
| Note markers | [switch] | Shift+N; #295 |
| Show hidden faintly | [switch] with a caption | section 2.2 |
| DEFAULT LOOK | header with "+"; Node [chit] 6 px; Edge [chit] 1 px | the defaults under every object; "+" adds a whole-graph channel |

**The Look list** (drawn open on screen 87): Default, Presentation (bigger nodes, labels and
edges), Print (grey categorical palette, patterned edges), Colour-blind safe, High contrast,
Dark, and "Save current as look...", with the reminder "A look sets defaults, never an
object's Style". A look changes the default look, the label style, the background and the
default palette per kind; it never rewrites a row an object owns.

**Errors**: a background image that fails to load reverts to Follow theme with the reason in the
row's tooltip; "Save current as look..." with an existing name asks to replace or rename.

**Element**: looks are #331, and they need the element's templates restricted to
match-everything layers first, because `applyTemplate` replaces the whole style stack today
(medium). Background (#291), an element-drawn legend (#292), minimap (#293) and note markers
(#295) are their own issues.

### 2.2 Show hidden faintly (screen 87)

A switch on the Canvas tab. Off (the default), elements outside the mask are absent. On, they
are drawn at about 15 percent opacity in their own colours and are not pickable, so a Focus or a
filter keeps its context. The status bar's mask text is unchanged. The element has it today as
`session.visibility.showContext`; no work.

### 2.3 Labels (screen 88)

**Entry**: the Canvas tab's Labels select (the quick choice) and its gear (the Labels popover).
Any object's Style tab can also add a Label row, which wins on that object's members (a Path
labelled by hop order).

**The Labels popover**, drawn on screen 88:

| Row | Control |
|---|---|
| Show | [Top N by a value v]: None, All, Selected only, Top N by a value, Members of a Set |
| By | [Bridges v] "top 6" (cond: Top N or Members of) |
| Text from | [label v]: any node column, or the id |
| TEXT | Size [11 px]; Colour [chit] Theme ink; Backing [chit] 4 px, 80% |
| Place | [Right of node v]: right, below, centre |
| Wrap at \| Lines | [20] characters \| [2]; longer text is cut with an ellipsis |
| Face the camera | [switch] (billboarding, for 3D) |
| Fade with distance | [switch] |
| Avoid overlaps | [switch], caption "where two collide, the lower-ranked hides" |

**Rules**: a node under the pointer, and a selected node, always shows its label whatever the
budget. If the Measure behind "Top N" is deleted, Labels falls back to None and the row says why.

**Errors**: a Text-from column with gaps shows the id for those nodes and says "12 nodes have no
label: showing the id".

**Element**: the label style catalogue exists (`catalog/label-style.ts`). Missing: a top-N scope
usable as a layer selector (small); text from a column (`encodeAttribute`, small); wrap to a
width (#294); overlap avoidance (#5).

### 2.4 Hovering a node (screen 89)

**Behaviour**: resting the pointer on a node shows a tooltip at once with the node's label and
the values the Tooltip row chooses ("Label + 3 values": by default the first attribute and the
first two objects covering the node, each with its rank where it has one). With "Highlight
neighbours on hover" on (Settings > Canvas: Off, Neighbours, 2 steps), the node's neighbours and
the edges to them stay at full strength with their labels, the rest dims to about 20 percent.
The tree rows of the objects the node belongs to take the hover fill. Nothing is selected or
written; moving off restores the picture. Keyboard focus on a node shows the same tooltip.

**The Tooltip gear** (not drawn; rows): Show [Label + 3 values v] (Label only, Label + 3 values,
All attributes, a column list); a checklist of columns and objects in order; Delay [0 ms]
(Settings > Canvas holds the app-wide delay).

**Errors and limits**: above the large-graph ceiling hover highlighting is off and the tooltip
opens on click instead (the large-graph state belongs to the "getting data in" cluster).

**Element**: the hover event and the `node.tooltip` channel exist. Missing: the hover-highlight
layer (the element reserves a "hover" layer source, unbuilt; small) and
`session.data.neighbours(id)` (small). Highlighting on hover is allowed to dim because it is the
reader's setting and transient, not an algorithm's style.

## 3. Styling by values

### 3.1 A signed value on a diverging palette (screen 90)

**Entry**: any Measure's Style tab, Colour block, Palette row. The picker (drawn open on screen
90) groups palettes by kind: when the values cross zero, **Diverging** comes first (Red-blue,
Purple-green, Blue-orange, the element's three), then Sequential, Categorical and Highlight
folded; Categorical is not offered for numbers. A click applies at once and the picker stays
open for comparison; arrow keys move, Enter applies, Esc closes. "Add palette..." takes a list of
hex values.

**Rows a diverging palette adds** to the Colour block: Midpoint [0] (any number; the value that
gets the neutral centre colour) and Symmetric [checkbox]. Symmetric on: one scale for both sides,
so a side with smaller values is paler (honest magnitude). Off: each side stretches to its own
end (full colour on both sides). Missing [chit] "12 nodes" counts elements with no value. The
legend's ramp block notes "0 at the centre; grey: no value (12)".

Screen 90 uses a formula Measure "Bridges per link" (the log2 of a node's share of betweenness
over its share of connections), -4.85 to +1.51, with 12 nodes that have no finite value.

**Errors**: a Midpoint outside the values' range warns "Midpoint is outside the values: one side
is empty"; a log scale is not offered for values that include zero or negatives.

**Element**: the encoding's `midpoint` and the three diverging palettes exist, and palettes carry
their kind. Missing: a symmetric flag (tiny) and the missing count in the legend block (tiny).

### 3.2 Edge width or colour by an edge column (screen 91)

**Entry**: the column's menu, which is the same menu in two places: the "..." on the column's row
of the Dataset's Data tab, and the column header of the table dock's Edges tab (drawn open on
screen 91). For an edge column it lists: Width by, Colour by, Opacity by, Label by, Filter by...,
then Set as weight, Set as time (greyed with the reason for a non-date column), then Sort and Hide
column. A node column's menu keeps its node verbs (Colour by, Size by, Shape by...).

**Result**: an edge Measure named after the column, a line chip in the tree and in the table's
column header, and its Style tab's EDGES section with the Width block open: Scale [By order of
magnitude v], Values from 1 to 2,400 (KB), Widths from 0.4 to 4 px, Missing 1 px, and a
three-step width legend. The legend card gets a width block (three lines and their values).

**Errors**: Width by and Opacity by are greyed on a text column ("not a number"); Colour by on a
text column makes a categorical encoding instead.

**Element**: encoding an edge column directly (`encodeAttribute` with an edge target, small);
the legend block carrying widths (small; also needed for Paths).

### 3.3 The channel menus and a Shape block (screen 92)

**The NODES "+" menu** on any Style tab (drawn open): Colour, Opacity, Size, Shape, Outline,
Glow, Label, Tooltip, Marker, Animation, More... (wireframe, flat, glow strength). A channel this
object already writes is greyed ("in use"). **The EDGES "+" menu**: Colour, Opacity, Width,
Pattern, Curve, Arrows, Animation, Label (named in the drawn menu's footnote).

**A Shape block** on a Grouping: one row per group with its mesh [Sphere v] (the element's 25
node shapes), five rows then "and 3 more", Other, and Overflow [Repeat shapes v]. The legend adds
a shape column beside the swatches. In 2D the shapes are drawn as their flat silhouettes.

**Errors**: more groups than shapes follows Overflow (Other, or repeat with a second channel).

**Element**: the `node.shape` channel and the "shape" overflow policy exist. Missing: a shape
list published like a palette, so a Shape block can assign one per group (small), and the
legend's shape column (small).

### 3.4 Styling one node (screen 93)

**Entry**: the node inspector's Look section "+" > "Style this node..." (screen 9 draws the Look
row), and the node's right-click menu. It creates a one-node Set named after the node at the
**top** of the tree (so it paints above everything), selects it and opens its Style tab.

**The Style tab of the one-node Set** lists the node's whole look channel by channel: the
overrides the reader has made (Colour, magenta, with eye and minus) above the channels it
inherits, as locked rows naming their source ("Colour From Conference", "Size From Bridges",
"Outline From Top 10"). Clicking an inherited chit creates the override. The Set's legend block
is one row. Deleting the Set, or removing its last override, returns the node to its objects'
look. Running it again on the same node reopens the existing Set.

**Element**: nothing new: a one-node Set is a scope with one id and a layer through the objects
API; the inherited rows come from `session.styles.explain`.

### 3.5 Saving, applying, importing and exporting styles (screen 94)

Round 2 put Save style and Apply style in each Style tab's "..." menu, where nothing drew them.
They move onto the tab: **every Style tab ends with a SAVED STYLE section** of two rows, which
fits the 14-row budget on every kind:

- Apply [Orange outline v] "3 fit": the saved styles that fit this kind of object, each with a
  preview chip; one that does not fit is listed greyed with what it fits ("fits edge Sets").
- [Save this style...] (asks for a name, stored in the project file) and [Reset] (returns the
  object to its default look).

**Importing**: File menu > "Import styles...", or dropping a style file on the app, opens the
Import styles dialog (drawn on screen 94): what the file holds; a table of its items with their
kind and what each fits; Import as [Add to mine | Replace all]; what each choice does ("Replace
all also resets every object's Style and the Dataset's look; objects keep their members; one undo
restores it"); the name-clash rule ("Orange outline 2"); Cancel and Import. **Exporting**:
Export > "Export styles..." writes the same file (every saved style, the current look and the
custom palettes).

**Errors**: a file that is not a style document says why in the dialog (from the element's
validator) and offers only Cancel.

**Element**: the style document (`toDocument`, `applyTemplate`) and its validator exist. Missing:
a saved style as a template without a selector, stored with the objects (small); an "add" mode
for importing a template beside the current stack, which is the same precondition as looks (#331,
medium).

## 4. Getting pictures and data out

### 4.0 Why a new surface: the Export sheet

Round 2 made each export a 240 px popover under the Export button. Drawn, that does not work:
Export image has ten rows and must leave the canvas visible and movable, because the reader frames
the picture while choosing; Export report is a checklist as long as the tree; Export video lists
the saved views. A popover over the canvas hides what is being exported, and a modal dialog
freezes the camera.

So the four exports that have settings share one **Export sheet**, which takes the right panel's
place (the inspector comes back on Esc, on the sheet's close button, or after Export). Its header
block is the inspector's: kind "Export", the export's name, a summary row with the output's size
and weight ("2400 x 1600 PNG, about 1.2 MB"), a reading, and four tabs: **Image, Data, Report,
Video** (20 characters, within the tab rule). Each menu row opens the sheet on its tab. The canvas
stays live: the camera moves, the mask can change, and the summary updates.

The one-shot exports need no sheet: Copy image (uses the Image tab's last settings), Export
styles..., Export recipe..., Copy methods text. Export bundle... opens the Report tab with the
bundle chosen.

### 4.1 The Export menu and Export image (screen 95)

**The Export menu** (the one filled button, top right; drawn open): in two groups, the picture
first: Export image..., Copy image (Ctrl+Shift+C); then Export data..., Export report..., Export
video..., Export styles..., Export bundle..., Export recipe..., Copy methods text. A row appears
only when the element can do it (data exporters are missing today, 4.2).

**The Image tab**: Preset [Web v] (Print, Web, Thumbnail, Documentation: the element's screenshot
presets, and Custom once a row is changed); Format [PNG v] (only what the browser can write: PNG,
JPEG, WebP; SVG and PDF when the element can capture them); Scale [2x v] "2400 x 1600"; Framing
[Current view v] (Current view, Fit everything, What is showing, any saved View); Transparent
background; Legend in picture (on); Notes in picture; Quality (folded: supersampling, smoothing);
[Copy] [Export].

**Keys**: Ctrl+Shift+C copies an image with the last settings from anywhere; Esc closes the
sheet. **Feedback**: the status bar's computing chip reads "Image copied to the clipboard" for a
few seconds, or "Exporting image 40% [Cancel]" for a large one.

**Errors**: a size above the browser's canvas limit says so beside Scale and offers the largest
that fits; a refused clipboard says "The browser refused the clipboard [Export instead]".

**Element**: capture with presets, formats and the clipboard exists
(`graphty-element/src/screenshot/`). Missing: the legend drawn into captures (#292), notes in
captures (#295), framing by a saved View (small).

### 4.2 Export data (screen 96)

**The Data tab**: Format [GraphML v] (drawn open: each format says what it holds: GraphML columns
and positions; GEXF columns and time; GML columns; JSON columns and positions; CSV two files;
DOT labels only; Pajek no columns; and the reminder "The project file keeps everything:
Ctrl+S"); Scope [Everything | Showing] with the other scope's counts under it; Include positions;
Include object columns, with one tick per object in tree order (a Measure as a number, a Grouping
as the group's name, a Set as true or false); rows the format cannot hold are drawn disabled with
the reason ("Include styles (GraphML cannot hold them)"); [Export]. The summary row reads the
counts and the size ("11 nodes  23 edges, about 6 KB").

**Errors**: a write that fails turns the computing chip red with the reason and [Retry].

**Element**: every format descriptor says `canExport: false` today: the element registers seven
importers and no exporter, while graph-io has the exporters. Missing: graph-io's exporters wired
into `catalog.formats()`, and one call that writes a scope with positions and chosen object
columns (`session.data.export`). Medium. The app never serialises a graph itself.

### 4.3 Export a report or an evidence bundle (screen 97)

**The Report tab**: OBJECTS, one tick per tree row in tree order (each becomes a section with its
reading, its values or members, and its Record: method, parameters, scope, engine, time);
SECTIONS: Statistics (the Dataset's Overview facts), Image, Legend, Methods (the methods text of
every ticked object), Notes (greyed "none yet" when there are none); Format [HTML v] (drawn open:
HTML one file, Markdown a ZIP with images, PDF for print, Evidence bundle a ZIP); Image [As Export
image v] (reuses the Image tab's settings); [Export].

**The evidence bundle** is one ZIP of the report, the project file, the data as loaded and the
images; choosing it replaces the Image row with two switches: "Include the original data file"
(on) and "Images at print size" (off).

**Errors**: PDF is greyed where the browser cannot print to PDF headlessly, with the reason; the
bundle is greyed until the project file exists (#301).

**Element**: the readings, the records and the methods text are the element's, so the report is
built by the element from the chosen objects (#187, medium); the bundle adds the project file
(#301) and the data export (4.2).

### 4.4 Export a video (screen 98)

**The Video tab**: Camera [Along views v] (Hold still, Orbit, Along views); with Along views, a
table of the saved Views in the Views list's order with seconds each, so the Views list is the
storyboard; Duration | Rate (fps); Format [WebM | MP4] (MP4 greyed where the browser cannot record
it); While the layout settles; While the time window plays (greyed with the reason on data with
no time column); Transparent background; [Export]. The summary row has the size estimate. While
writing, the tab's last row is a progress bar with Cancel, mirrored by the status bar's
"Exporting video 30% [Cancel]", so the sheet can be closed.

**Errors**: the browser pauses recording in a hidden tab, so the chip says "Keep this tab visible
while recording"; Cancel keeps nothing; a failure turns the chip red with the reason.

**Element**: `captureAnimation` and `estimateAnimationCapture` exist with a stationary or animated
camera. Missing: saved Views accepted as waypoints (small); the layout settling and the time window
playing as capture sources (medium; #144 and #300); which formats this browser records, published
in the capture capabilities (tiny).

## 5. Presenting and immersive viewing

### 5.1 Present mode (screen 99)

**Entry**: File menu > Present (Shift+\), and the Views header's "..." > "Present from here".

**The state**: both panels, the toolbar, the status bar and the dock are hidden; the canvas fills
the window. The one control is a dark pill at the bottom centre: "Group 2 close-up -- 2 of 5
[Previous] [Next] [Exit (Esc)]". The legend and the time transport bar stay, because they are part
of the picture. Left and Right arrows, Page Up and Page Down step through the saved Views in the
list's order (each applies with its animation, mode and mask); Home returns to the first; Esc
leaves and restores the panels and the reader's own view. With no saved Views the pill reads "No
saved views [Exit]" and Present shows the current view full-window.

**Element**: applying a View exists (camera presets). Missing: a View that carries its mode and
mask (small; already on the round-2 list). Hiding the chrome is the app's own presentation.

### 5.2 Entering and leaving VR or AR (screen 100)

**Entry**: a plain click on the VR (or AR) segment of the mode switch takes what is showing into
the headset. A right-click or long press on the segment opens "Enter VR showing" (drawn open):
Everything with its count, then every Set and Group with theirs; choosing one focuses it and
enters. Above the headset's node limit (10,000 today) Everything is greyed with the limit in its
tooltip, and so is any Set above it.

**During the session**: both panels minimise; the status bar reads "Focused on Group 2: 11 of 34
[Exit]  VR [Exit]"; Esc or either Exit ends it. What the reader does in the headset (grab a node,
which pins it; ask by voice) lands in the tree.

**On return**: the desk camera is restored; objects made in the headset sit at the top of the tree
marked new (the paler fill) until the next click; the status bar says "Back from VR: 2 objects
added" for a few seconds. A session that ends unexpectedly says "VR ended: the headset
disconnected".

**Errors**: a browser without support draws the segment disabled with the reason and the fix in
its tooltip.

**Element**: entering and leaving XR exist. Missing: enter with a scope, so Focus and enter are
one step (small); the headset's node limit published in the capabilities (tiny). The objects made
in the headset reach the tree through the objects API's change event.

---

## What this changes in the round-2 documents

These are amendments for whoever merges the round-3 clusters; the round-2 files are not edited
here.

- `round-2/revision.md` 2.4, Dataset > Layout: the rows of section 1.1 above replace the Layout
  row list; "Apply to" is new; the transport row becomes Progress and Re-run rows.
- `round-2/revision.md` 2.4, Dataset > Canvas: unchanged in content; "Show hidden faintly" is its
  own row with a caption, and Note markers stands alone.
- `round-2/revision.md` 2.4, every Style tab: ends with the SAVED STYLE section (3.5); the Style
  tab's "..." keeps only Reset style.
- `round-2/revision.md` 5.6: the saved style's home is that section, and importing styles is the
  Import styles dialog.
- `round-2/revision.md` 6.3 and 6.8: each export with settings is a tab of the Export sheet
  (4.0), not a popover.
- `round-2/revision.md` 6.4: Everything is greyed above the headset's limit; the return marks new
  rows.
- `round-2/revision.md` 6.9: the Labels popover holds which nodes and the text source as well as
  the style.
- `round-2/screens.md`: screens 83 to 100 as listed in the gap register.
- `round-2/coverage.md`, the Screen column: Data export 96; layout over a scope 85; drag a node
  86; recommend a layout 83; `radial` 84; layout dimension 83; GPU layout 83; style templates 94;
  style presets 87; `node.shape` 92; `node.tooltip` 89; `edge.label` 87; hover 89; the Labels rows
  (rich text, placement, billboarding, depth fade, wrap, overlaps) 88; enter VR or AR 100;
  `animation-progress` 98.

## Rows other clusters' screens must carry

- The file menu (screen 16): "Present  Shift+\" and "Import styles...".
- A Set's or Group's row menu (screen 44) and the canvas right-click menu (screen 49): "Arrange
  only these..."; on a node, "Pin" or "Unpin" and "Style this node...".
- The several-elements inspector (screen 55): "Arrange only these...".
- Settings > Canvas (screen 13): "Highlight neighbours on hover [Off | Neighbours | 2 steps]"
  with "dim the rest", the tooltip delay, and "Pin nodes I drag [switch]".
- A file dropped on a loaded graph (screen 26): a style file opens the Import styles dialog.
- The Views header "..." (screen 53): "Present from here".

## Element work, smallest first

| Item | Size | For |
|---|---|---|
| A symmetric flag on a diverging encoding; the missing count in the legend | tiny | 3.1 |
| Direction option on the Tree layout | tiny | 1.2 |
| The formats this browser records, in the capture capabilities | tiny | 4.4 |
| The headset's node limit in the capabilities | tiny | 5.2 |
| Pinned list, unpin by ids or all, a pins event, a pinned scope, pin-on-drag switch, the marker | small | 1.4 |
| The Tree's unreachable count and cross-link list in its result | small | 1.2 |
| A top-N scope as a layer selector; label text from a column | small | 2.3 |
| The hover-highlight layer; `session.data.neighbours(id)` | small | 2.4 |
| Encoding an edge column; a width block in the legend | small | 3.2 |
| A shape list published like a palette; a legend shape column | small | 3.3 |
| A saved style as a template without a selector | small | 3.5 |
| Framing a capture by a saved View | small | 4.1 |
| Saved Views as video waypoints | small | 4.4 |
| A View that carries its mode and mask | small | 5.1 |
| Enter XR with a scope | small | 5.2 |
| A public layout controller on the session (set with options and inputs, pause, resume, step, re-run with a seed, progress, backend) | medium, #144 | 1.1 |
| Layout over a scope with the rest fixed | medium, #144 | 1.3 |
| Looks and an "add" import mode (templates restricted to match-everything layers) | medium, #331 | 2.1, 3.5 |
| graph-io's exporters wired into the format catalogue; `session.data.export` | medium | 4.2 |
| A report built from chosen objects | medium, #187 | 4.3 |
| Layout settling and time playing as capture sources | medium, #144, #300 | 4.4 |
| The legend drawn by the element and in captures | medium, #292 | 2.1, 4.1 |
| Background follow theme (#291), minimap (#293), note markers (#295), label wrap (#294), overlap avoidance (#5), a Radial engine | per issue | 2.1, 2.3, 1.2 |

Nothing here asks the app to compute over nodes and edges, serialise a graph, build a report from
results or detect a capability: every list a row draws is a catalogue or a session call, and every
paint is a layer on an object the element owns.

## What the mocks draw

All of these are now drawn: the screen generator was extended once for every cluster (dark menus anchored to any control, insets for a second moment, text fields, radios, charts, the History and Assistant docks, coloured status chips, canvas marks, a split canvas, Present mode). A dark tag above a card or a menu marks a second moment on the same screen. The generator's spec keys are listed in `tmp/object-first/gen/README.md`, "Round 3 additions".

Menus are dark menus anchored to their control; a menu that leads to the state drawn beside it carries a "A moment before" tag. Screens 84 to 86 move nodes with `canvas.positions`; 86 draws pin marks; 89 the dark tooltip; 91 the legend's width block; 92 node shapes and the legend's shape column; 90 the midpoint mark on the ramp; 95 and 98 the dashed export frame; 95 to 98 the Export sheet's footer; 99 Present mode without panels; 100 the "new" badge and the return notice.
