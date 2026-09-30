# Round 2: the revised object-first design

This is the second round of the object-first design for the graphty app. Round 1 lives one
folder up (`design/ui/object-first-ux/`: `proposal.md`, `analysis.md`, `object-model.md`, the
eight mocks in `mocks/`, the critiques in `critique/` and the feature-fit tables in
`feature-fit/`). This file revises it point by point against the owner's feedback, using the
round-1 materials as evidence, and then against the two round-2 critiques beside it
(`critique-novice.md`, `critique-maintainer.md`), whose blockers and majors are all resolved
here. The fifteen screens this design asks to be drawn next are in `screens.md` beside this
file; the choices this round makes, with their reasons, are in `decisions.md`.

It is written for an engineer who is not a designer. Every design word is defined the first
time it is used. Paths are under `/home/apowers/Projects/graphty-monorepo/`. `#NNN` is an open
issue in graphty-org/graphty-monorepo, given with its title the first time. `session.xxx` is a
member of graphty-element's session API in `graphty-element/src/session/`. Nothing here changes
code.

## 0. Terms

- **Object**: a row in the left panel's tree. Something the reader made from the data (a Set,
  a Group, a Measure, a Grouping) or the data itself (the Dataset). Objects are the only things
  the inspector edits.
- **Element**: one node or one edge. The material. Never painted directly.
- **Set**: an object whose members are a list of elements, painted with one look. A path, a
  filter result, a neighbourhood, a promoted selection, a spanning tree and a cut are all Sets.
- **Measure**: an object with one value per element (a centrality, a numeric column), painted
  with a scale (a colour ramp or a size range).
- **Grouping**: a Measure whose values are labels (communities, components, a category column),
  which is also a folder of **Group** objects, one per label.
- **Tree**: the left panel's ordered, nested list of objects. Its order is the paint order.
- **Inspector**: the right panel, showing the properties of what was selected last, or the
  Dataset when nothing is selected.
- **Style**: an object's whole appearance: the style layer or layers that paint its members.
  Round 1 called this "Fill" (Figma's word); this round renames it (section 5.1).
- **Channel**: one visual property a Style can write: node colour, node size, edge width, edge
  pattern and so on. graphty-element has 40 (`Channel` in `graphty-element/src/catalog/types.ts`).
- **Encoding**: a Style that maps a value to a channel through a scale and a palette. A
  Measure's or Grouping's Style is an encoding; a Set's Style is a fixed look.
- **Precedence**: when two objects paint the same channel of the same element, which wins: the
  visible object nearer the top of the tree, per channel.
- **Mask** (what is **showing**): the element's one visibility filter (`session.visibility`).
  Elements outside it are not drawn. **Focus** sets the mask to one object's members. A **time
  window** is the second mask (section 6.1); the two compose.
- **The eye**: the toggle on a row that stops that object painting. It never hides members.
- **State**: whether an object's members are up to date: current, computing, waiting, stale,
  failed, frozen (round 1, `object-model.md` section 5).
- **Rail**: a narrow vertical strip of icons at the window's left edge, each of which opens a
  different panel beside it. Figma's editor has one, 56 px wide, with File, Agents, Assets,
  Tools and Variables (`design/ui/figma/left-sidebar/README.md` section 1). The current graphty
  app has one with six activities.
- **Dock** (or **drawer**): a surface at the bottom of the canvas that takes space from it (the
  data table). An **overlay** floats over the canvas without taking space (the toolbar, the
  legend).
- **Tab** (pill tab): one of a short row of labels at the top of a panel that swap what the panel
  shows without changing what is selected. Figma's "Design" and "Prototype" are a tab pair
  (`design/ui/figma/components.md` section 16: 24 px tall, 11 px text, the selected one bold on
  a grey pill, text plus 8 px of padding each side, 4 px between tabs). This design uses 4 px
  of padding, because 8 px does not fit four tabs in a 240 px panel (section 2.3).
- **Disclosure**: a section that is collapsed to its header, with a one-line summary in the
  header, and expands on click.
- **Tool**: a toolbar verb that creates an object. Picking one **arms** it: the tool takes the
  brand fill and a **secondary bar** (a one-line dark prompt above the toolbar) says what will
  happen and waits for the reader to act, on the canvas or in the bar. When the object exists
  the tool snaps back to Select. A tool's **flyout** is the dark menu behind its chevron listing
  its variants; its **face** is the variant a plain click uses. A **popover** is a 240 px light
  panel for controls that do not fit in a row.
- **Transport**: the play, pause, step and speed controls of a running process; the word a
  video editor uses. Used here for the layout simulation and for time playback.
- **Cost gate**: the element's refusal to start a run unasked above a time budget
  (`session.estimate`, `gateRun` in `graphty-element/src/session/cost/`).
- **Row budget**: how many 32 px rows fit in the inspector below its fixed header before the
  reader must scroll. This design's budget is 14 (section 2.3).

## Answers to the round-2 feedback, in one table

| The owner's point | The answer | Section |
|---|---|---|
| The mocks are inconsistent: some have a hamburger menu, some a left rail | They do not disagree with each other; they disagree with their two references. The eight mocks all draw a hamburger glyph and no rail; the Figma study they cite has a 56 px rail; the current app has a six-activity rail. This round picks one frame: **no rail**, and the hamburger glyph goes too. The file menu is the dataset name with a chevron, exactly Figma's file header | 1 |
| If a rail: do layout, camera and the rest have enough content for a panel? | No. Layout is 5 to 11 rows and is a property of the Dataset; camera is 8 commands and 1 to 5 saved Views; neither is a panel. Only the tree, the data table and the assistant are panel-sized, and the table and the assistant need the tree beside them, so they are bottom docks, not rail panels | 1.2 |
| If a rail: why are "Data" and "Table" different? | They were split by the current app's task-first frame: "Data" is the import activity, "Table" is the drawer. In an object-first frame "Data" is the Dataset object (the root row and its inspector) and "Table" is the same material at full resolution. One object, two views of it; not two homes | 1.2 |
| What would running algorithms look like? | Step by step in section 4, with every state glyph and where it shows. Every creation tool works one way: arm, read the secondary bar (what it will run on and what it will cost), Run, snap back. A parameters popover before the first run, a queue chip in the status bar, and the reading on the surface of the inspector header | 3.5, 4 |
| Highlights are exclusive; paths are just edge styles and should layer | Adopted. A Path (or any edge Set) is an edge style layer; several stack, distinguished by colour, width, pattern, arrows and animation; the element's exclusive-highlight rule is retired | 5.4 |
| Does the element own the tree? Yes | Taken as given. The objects API on the session; its saved shape is the project file (#301). Undo goes with it (settled decision 1) | Settled decisions |
| One set vocabulary in the session contract? Yes | Taken as given. Filter sets, scoped runs, Combine, Focus and set Styles become one mechanism; the vocabulary gains an edge list and a run-result set so a Path is a scope too | Settled decisions |
| The right panel scrolls too much; tabs? | Yes: a header block that never scrolls, then three or four tabs per object kind (never five), each fitting 14 rows on a 1366 x 768 laptop, with disclosures inside a tab. The tab sets are per kind (a Set: Define, Members, Style, Record; a Measure: Values, Define, Style, Record; the Dataset: Overview, Layout, Canvas, Data; a node: About, Attributes, Links) | 2 |
| What are all the buttons in the toolbar? | Section 3 is the complete specification: nine tool buttons and the mode switch, six flyouts, every item with its icon, label, key, what it does, and whether it exists today or is proposed with its issue number | 3 |
| How does styling of continuous and group values work? | Section 5: one grammar on every Style tab (NODES and EDGES sections, every row led by its channel name), the encoding block for a Measure (scale, palette, values from and to, clamp, missing, legend), the Group palette with per-Group overrides, and how several paths layer | 5 |
| Make sure every current and proposed element feature is considered, e.g. a timeline | Section 6: the timeline as a transport bar under the canvas with its settings in a gear popover, two doors to it, and the element's interval model for GEXF data; one paragraph each for saved Views, video, XR, the assistant, notes, comparison, export, labels and declutter, palettes and legends, acceleration; and section 6.12 places every remaining inventory capability, most of them in a Settings sheet that is now screen 13 | 6 |

## Settled decisions (treated as given from here on)

1. **graphty-element owns the tree.** The objects API on the session (list, create, move,
   rename, set visible, set locked, set scope, re-run, remove, focus, membership lookup,
   coverage, an `objects:changed` event) is the element's, built over its runs, saved scopes
   and layers. Its saved shape is the project file (#301, "no project file to save and reopen a
   whole session"). The app draws the tree and nothing more. **Undo goes with the tree**: the
   objects API keeps the history (the journal of #145, "the session has no notes or journal"),
   every verb is recorded with what undoes it, and `session.objects.undo()` / `redo()` pop it.
   The app's Ctrl+Z calls undo; the History dock draws the journal. The reason is that the
   state an undo restores (a replaced run's result, a removed row's layers) is held only by the
   element, so an inverse handed to the app would have to carry a whole run result.
2. **The session contract moves to one set vocabulary.** The scope type gains filters, top-N,
   above-threshold, a group, an **edge list** (`{edges: EdgeId[]}`), a **run-result set** (the
   members a run chose, such as a path) and the combinators; the filter type gains a scope and
   is evaluated within it; a layer selector accepts a scope, and an edge target resolves to the
   induced edges of a node scope. Filter sets, scoped runs, derived sets, Combine, Focus and
   every Set's Style are one mechanism. Today `Scope` has `{nodes: NodeId[]}` and no edge list
   (`graphty-element/src/catalog/types.ts:710-717`), so without the two additions an edge Set
   could not be saved, scoped to or combined.
3. **Highlights are not exclusive.** A Path, a spanning tree, a cut or any other edge Set is an
   edge style layer that stacks exactly as node layers do. Several paths show at once. The
   element's rule "a highlight is exclusive" (`graphty-element/src/session/styles/StylesApi.ts`)
   and "every set is blue-highlight" are retired; the objects API passes `exclusive: false` and
   assigns each Set the next unused colour of a highlight palette. Two invariants of a run-backed
   Set: one tree row maps to one or two layers (the element splits a highlight naming node and
   edge channels into a "(nodes)" and an "(edges)" layer, `StylesApi.ts:1598-1610`), and the
   generated selector is the value test `results.<run>.onPath == true`, never a presence test,
   because the membership column carries `false` for every element the run looked at and did
   not choose, so a presence test would paint the route's whole neighbourhood
   (`StylesApi.ts:1596-1600`).

## 1. The frame

### 1.1 Why the round-1 materials look inconsistent

The eight mocks (`mocks/screen-1.png` to `screen-8.png`) all draw the same left header: a
three-line "hamburger" glyph, the dataset name and a chevron. None draws a rail. The
inconsistency the owner saw is between the mocks and the two things they cite as their
reference:

- the Figma study (`design/ui/figma/overview/editor-default.png`) shows Figma's UI3 editor with
  a 56 px rail on the far left (File, Agents, Assets, Tools, Variables) and the file header
  beside it. `object-model.md` section 1 says "Figma's UI3 layout ... no activity rail", which
  is wrong about Figma and right about what the mocks drew;
- the current app (`tmp/ux-review/g02-loaded-karate-1600.png`) has a 48 px rail with six
  activities, which `inventory/app-today-and-personas.md` section 3.2 documents.

So the round-1 frame quietly dropped Figma's rail while borrowing everything else from Figma,
and kept a hamburger glyph that means "a menu of activities" in every other app. Both are
frame decisions that were never argued. This section argues them.

### 1.2 Option A: a 56 px rail whose items open different left panels

If the rail exists, each of its items must open a panel that earns 240 px of the window. The
test for a panel is: does it hold an open-ended list the reader browses and acts on, and does
it need to replace the tree rather than sit beside it? Every candidate, with the rows it would
actually hold:

| Rail item | Rows it would hold | Enough for a panel? | Verdict |
|---|---|---|---|
| **Objects** | the tree: one row per object, nested; open-ended (a Grouping alone is 5 to 200 rows) | yes | the left panel, always |
| **Table** | one row per node or edge with one column per attribute and one per Measure and Grouping (`feature-fit/2-selection.md` section 2.6) | yes, but not at 240 px: a table needs the canvas's width, and clicking a row must halo the node on the canvas beside it | a bottom dock, not a rail panel |
| **Views** | the saved views: one automatic "Overview" plus what the reader saved, typically 1 to 5 rows (`feature-fit/6-camera.md` section 1.2) | no; Figma keeps Pages as a short list above Layers for the same reason | a short list above the tree, collapsible |
| **Styles** (a library of looks, palettes, saved styles) | the element ships 18 palettes and, once #331 lands ("implement session.catalog.themes()"), a handful of looks; a reader might save 2 to 10 styles | no; and it is a picker, used from the object being styled, not a place to go | pickers opened from the Style tab and the Canvas tab (section 5.6) |
| **Layout** | Layout select, engine gear, transport, Dimensions, Group by or Root or Order by when the layout needs one, Pinned: 5 to 11 rows (`feature-fit/4-layouts.md` section 8) | no; and it is a property of the Dataset, since one arrangement is in force for the whole graph and two cannot both be true | the Dataset's Layout tab |
| **Camera** | zoom in, out, fit, to selection, four framings, reset, save view: 9 commands, all one click each, none with state to edit | no; they are commands, not properties | the zoom menu in the right header, the keys, the mode switch |
| **Data** | the import dialog's fields (before a load) and the attribute catalogue, the import report and exports (after) | after a load, yes (up to 14 rows); before a load, nothing but three verbs | it IS the Dataset object: the root row's inspector, Data tab. A rail item would be a second home for the root row |
| **Assistant** | the transcript, open-ended | yes, but it must not replace the tree: the assistant's whole value is that the row it made appears in the tree while the reply says "Made: Bridges" (`feature-fit/7-.md` section 1) | a bottom dock beside Table |
| **History** | the journal (#145), open-ended | yes, but hovering a history row must outline the object it touched, so the tree stays | a bottom dock beside Assistant |
| **Notes** | every note, grouped by anchor (`feature-fit/7-.md` section 3) | a list, but a note is about a thing and is found from the thing | the Dataset's Overview lists them; markers on the canvas |
| **Settings, Help** | not everyday | no | the file menu and the status bar's "?" |

**Why "Data" and "Table" were two things.** In the current app the left rail is task-first:
"Data" is the activity of getting data in (load, paste, URL, samples, the import report), and
the table is a drawer under the canvas because it does not fit a 280 px panel. The split is a
consequence of the rail being a list of jobs. In the object-first frame the job "get data in"
is a dialog reached from the Dataset's header and the file menu, and everything about the
loaded data (counts, direction, attributes, import report) is the Dataset object's inspector.
The table is the same material at full resolution. One object, two views; giving either a rail
item would be the duplicate-home problem the comparison document counted against the current
app (`tmp/ux-review/graphty-vs-figma-ux.md`, "Where the same function lives in more than one
place").

**What a rail would cost.** Of eleven candidates, one (Objects) is a real left panel, three
(Table, Assistant, History) are docks that need the tree beside them, and the rest are rows of
something else. A rail with one real item is 56 px of window for a button that is always
pressed. Figma's rail exists because Figma has four panel-sized libraries (assets, tools,
variables, agents) that do replace the layer tree; graphty has none.

### 1.3 Option B: no rail

One left panel: the Views list (collapsible, Figma's Pages slot) above the tree. The data table,
the assistant and the history are tabs of one bottom dock (one open at a time, resizable,
Shift+T opens Table, backtick opens Assistant). **When the dock is closed its tab strip stays
as a 24 px handle** along the bottom of the canvas, above the status bar: three pill tabs
(Table, Assistant, History) that open the dock on that tab when clicked, the way a browser's
collapsed developer tools keep a strip. The handle is the "you are here" indicator the frame
would otherwise lose, and it gives History, the design's one visible undo, a door that is one
click away.

The file menu is the dataset name with a chevron (Figma's file header,
`design/ui/figma/left-sidebar/README.md` section 2): no hamburger glyph, no logo button. Its
rows: Open... (Ctrl+O), Open recent, Open sample, Add data..., Open as a second graph...; Save
project (Ctrl+S), Save project as... (Ctrl+Shift+S), Close dataset, Run a recipe..., Present;
Settings... (Ctrl+,), Keyboard shortcuts (Ctrl+/), Help. Round 3 draws it open (screen 16) and
specifies every row, the unsaved marker and the save prompt in
`design/ui/object-first-ux/round-3/file-project.md`. Because a chevron beside a dataset name reads as
"switch dataset", Help has a second, visible door: a **"?" ghost button** at the right end of
the status bar (a ghost button has no fill until hovered), opening Help, Keyboard shortcuts and
the sample list. Figma draws a floating help button for the same reason. One 24 px button, no
new home: every row it opens is also a file-menu row.

### 1.4 The two frames drawn

Option A, the rail (rejected):

```
+----+------------------+--------------------------------------------+------------------+
| Ob |  Karate Club   v |                                            | 100% v   [Export]|
| je |------------------|                                            |------------------|
| ct |  VIEWS        [+]|                                            | HEADER BLOCK     |
| s  |    Overview    * |                                            |  tabs            |
|----|------------------|                 CANVAS                     |  rows of the     |
| Ta |  OBJECTS  [find] |                                            |  selected tab    |
| bl |  v Karate Club   |                                            |                  |
| e  |    Path: 1 -> 34 |                                            |                  |
|----|    Communities   |  [V][H] | [F][E][P][G][R][S] | [N] [Ask] | [2D|3D|VR|AR] |    |
| As |      Group 1     |--------------------------------------------|                  |
| k  |                  |  (the Table rail item would have to open   |                  |
|----|                  |   HERE anyway, because it needs the width) |                  |
| Hi |                  |                                            |                  |
| st |                  |                                            |                  |
+----+------------------+--------------------------------------------+------------------+
| 34 nodes 78 edges   Spread out: settled [||]   Computing 1 of 2 [x]   11 selected  100% |
+---------------------------------------------------------------------------------------+
```

Option B, no rail (recommended):

```
+------------------+--------------------------------------------------+------------------+
| Karate Club    v |                                                  | Fit v   [Export] |
|------------------|                                                  |------------------|
| VIEWS         [+]|                                                  | Group            |
|   Overview     * |                                          [legend]| Group 2   (o)(L) |
|------------------|                     CANVAS                       | [chip] 11 nodes  |
| OBJECTS  [find] .|                                                  | reading ...    ? |
| v Karate Club    |                                                  | Define | Members |
|   Path: 1 -> 34  |                                                  |  Style | Record  |
|   Top 10 Bridges |                                                  |------------------|
|   Bridges        |         Rank by [Bridges v] on 34 nodes, 80 ms [Run] Cancel        |
|   v Communities  |  [V][H] | [F][E][P][G][R][S] | [N] [Ask] | [2D|3D|VR|AR]         |
|       Group 1    |--------------------------------------------------| rows of the tab  |
|       Group 2    | 2019-03 to 2019-05 [<][>][>] ====[band]==== [gear]|  (14 at most)    |
|                  |--------------------------------------------------|                  |
|                  | Table | Assistant | History   (the dock's handle when closed)        |
+------------------+--------------------------------------------------+------------------+
| 34 nodes 78 edges  Spread out: settled [||]  Computing 1 of 2 [x]  11 selected  100%  ? |
+---------------------------------------------------------------------------------------+
```

The secondary bar and the time transport bar are drawn here only to place them; each appears
only while it has something to say (sections 3.5 and 6.1).

### 1.5 Recommendation, and what moves where

**No rail.** Reasons, in order of weight:

1. Only one candidate (the tree) is a panel that replaces nothing; the three others that are
   panel-sized (Table, Assistant, History) need the tree visible beside them, so they must be
   docks whichever frame is chosen. A rail would then have one permanently active button.
2. The round-1 rule "one home per capability" (`analysis.md` section 4) is what the comparison
   document found the current app breaking most. Every rail item other than Objects would be a
   second home for a section of the Dataset's inspector or for a dock.
3. The comparison's headline was that graphty's sidebars "change what they mean". A rail is the
   control that changes what the left panel means. Without one, the left panel always answers
   "what exists" and the right panel "what is this and how do I change it".
4. 56 px of width matters at the 1280 px window the owner's laptop test used
   (`tmp/ux-review/g21-loaded-1280.png`): two 240 px panels leave 800 px of canvas; a rail
   leaves 744. The toolbar of section 3.1 is 725 px wide, so at 1280 it fits the canvas with a
   rail's width to spare on each side and would not fit at all beside a rail.

What moves, relative to round 1:

| Round 1 drew | This round | Why |
|---|---|---|
| A hamburger glyph before the dataset name | Gone. The dataset name and its chevron are the file menu, as Figma's file header. The name click renames | a hamburger means "activities"; there are none |
| "Share" as the one filled button | "Export". Its menu is entirely exports and there is no server for a link | round-1 decision 8 recommended this unless link sharing was planned; nothing plans it |
| "100%" zoom pill | the framing name in 3D ("Fit", "Isometric", "Custom") and the percentage in 2D; the percentage also in the status bar | `critique/rough-edges.md` section 9: 100% has no meaning in 3D |
| Table dock (Shift+T) and Assistant dock (backtick) | one bottom dock with three tabs: Table, Assistant, History; its tab strip stays as a 24 px handle when the dock is closed | History needed a home (`feature-fit/7-.md` section 4); the closed dock needed an opener |
| Nothing under the canvas but the toolbar | a 40 px time transport bar above the dock while a time window is on (section 6.1) | the timeline had no home in round 1 |
| Views list always expanded | Views collapsible to one header row showing the current view's name (Figma's collapsed Pages) | on a small window the tree needs the height |
| Objects header "search" glyph | "find" glyph, Ctrl+F, with two sections: Objects (by name) and Nodes (by label or id); and a "..." overflow with "Suggestions" (shows the three suggestion rows again) | naming; a node find had no home; the suggestion rows vanished with no way back (round-1 novice finding 8) |
| Help only in the file menu | plus the "?" ghost button at the right end of the status bar | the stuck novice hunts for "?" |

Layout and camera are confirmed as properties, not panels: layout is the Dataset's Layout tab
(section 2.4); camera is the zoom menu, the mode switch, the keys and the Views list. The
round-1 argument for this (`feature-fit/4-layouts.md` premise; `feature-fit/6-camera.md`
introduction) stands: one arrangement is in force for the whole graph, and a camera is a way of
looking at the objects, not a thing made from the data.

Round 3 amends this section: Find gains a third section, "Values in attributes", and the one key
set for the camera, selection and find (Shift+1 fit, Shift+2 selection, 7 / 1 / 3 / 9 for the
3D framings, Ctrl+I invert, Ctrl+Shift+H hide, F6 between regions) replaces the disagreeing keys
of `object-model.md` and `coverage.md`. The design, with the right-click menus, the minimap,
following a node, hiding nodes, the edge inspector, Focus and keyboard navigation, is
`design/ui/object-first-ux/round-3/navigate-select.md`; it is drawn on screens 49 to 58.

### 1.6 The status bar: what yields

The status bar is 24 px of 11 px text and mirrors state whose home is elsewhere. Up to nine
items can be true at once, so they have a priority, and an item that does not fit collapses to
its glyph with the full text in a tooltip, lowest priority first. From the left, in the order
they are drawn and from highest to lowest priority:

1. the counts ("34 nodes  78 edges"), never collapsed; clicking them opens the Table dock;
2. the mask ("Focused on Group 2: 11 of 34 [Exit]"; a time window's readout, section 6.1);
3. the computing chip ("Computing 1 of 6 [Cancel all]", "Loading 42% [Cancel]", "Exporting
   video 30%", with a GPU glyph while a run is on the GPU); the transient "the page will pause
   for about 8 s" takes this chip's place while it is true;
4. the stale chip ("3 stale [Re-run all]", only when more than one object is stale);
5. the layout chip ("Spread out: settled" with a pause glyph; the first to collapse to its
   glyph);
6. the armed tool ("Rank: Bridges"; collapses to the tool's icon);
7. the selection ("11 selected", "5,000 selected (capped)" when the element's selection cap
   truncated it);
8. the XR state ("VR [Exit]", "Back from VR: 2 objects added" for a few seconds);
9. the framing or zoom readout and the "?" button, at the right, never collapsed.

The kit sheet (`screens.md`, kit additions) draws the busiest state once.

## 2. The inspector

### 2.1 What is wrong with round 1

Counted from the mocks and `object-model.md` section 4: the Dataset inspector on screen 2 is 31
rows (Summary 7, Arrangement 4, Showing 2, Canvas 8, Attributes, Made by, Export 3, Notes,
plus headers), and it is drawn scrolled on screens 6 and 7. A Measure (screen 6) is 34 rows
(Definition 7, Values 12, Fill 11, Made by, Export, Notes) and screen 6 had to be drawn
scrolled past its Definition to show the Values and the Fill at all. The analyst walkthrough
(`critique/analyst-walkthrough.md` F14) found the reader scrolling past six parameter rows to
reach the top 10 every time. The novice walkthrough (finding 4) found the one sentence that
explains a result buried in a collapsed "Made by" behind a "?".

Figma's right panel is long too (a frame with auto layout has about 30 rows), but it is long
in one direction: every row edits the selection, and the first screen's worth is what a reader
edits most. Round 1 put the rarely edited rows (Definition parameters, Made by) above the
commonly read ones (Values, Style).

### 2.2 What Figma's Design / Prototype pair teaches

Figma's two tabs are not two halves of one long panel. They re-skin the same selection for a
different job: Design answers "how does it look", Prototype answers "how does it behave". The
selection, the tree and the canvas do not change; only the questions the panel answers. Three
things carry over:

- a tab is a **job**, not a section: "how is it made", "what is in it", "how does it look";
- the tab strip sits under the header and never scrolls; the header (what is selected) never
  changes with the tab;
- the tab a reader used last is remembered, per kind, so a reader who lives in Values sees
  Values every time they click a Measure (with a guard, section 2.5).

The owner's five-tab suggestion (data, node style, edge style, group style, overview) is the
right instinct with one thing to trim: node style, edge style and group style are three views
of one job (how does it look), and splitting them would put the edge rows of a Path one tab
away from its node rows. They become the NODES and EDGES sections inside one Style tab, on
every kind (section 5).

### 2.3 The design: a fixed header block, tabs per kind, disclosures inside a tab

The inspector has three parts, top to bottom:

**The header block, always visible, never scrolls** (four rows, 144 px):

| Row | Height | Content |
|---|---|---|
| Title | 48 | the kind word in secondary text ("Group", "Measure", "Node", "Dataset") above the name (13 px, weight 550, rename on double-click); at the right the eye, the lock and the overflow "..." (the eye and lock only on objects; a node has Locate and Pin instead) |
| Summary | 32 | the Style chip (a swatch for a Set, a ramp for a Measure, a strip for a Grouping, the first channel's chit for a Group override), then the count and the state: "11 nodes, 32% of the scope", "34 values", "4 groups", "Computing 42% [Cancel]", "Stale: ran on 34, now 40 [Re-run (3 s)]", "Waiting [Run (about 4 min)]" |
| Reading | 32 | one sentence in secondary text: on an object, the element's reading (`RunResult.reading()`): "The groups are clearly separated (modularity 0.36)", "The shortest route has 4 hops"; on the Dataset, from a new `statistics().reading()` (section 8): "34 nodes joined by 78 edges in one connected part"; on a Group, written from the run's fields: "Group 2 of 4 in Communities". Ends with a "?" that opens the longer explanation as a popover, which also defines the words on the surface (Density, Parts, Settled, modularity). Omitted on a node and a View |
| Tabs | 32 | the pill tabs for this kind; the selected tab is bold on a grey pill; Left and Right arrows move between them |

The summary row answers the novice's "what did I just make" on the surface (round-1 finding 4)
and shows the state without opening anything.

**The tabs**: three or four per kind, never five (section 2.4). The strip must fit the 216 px
between the panel's gutters: at 11 px weight 550 (about 6.3 px per character, measured from
Figma's "Design" and "Prototype"), 4 px of padding each side and 4 px between tabs, **four tab
names may total at most 27 characters** (three names, 29). Every set in 2.4 is within it; a
name that would break it is shortened, not squeezed. The check is
`tmp/object-first/tab-width-check.mjs`.

**The row budget**: no tab exceeds **14 rows** with every conditional row drawn and every
disclosure collapsed. Fourteen is what fits on the persona's laptop (a 1366 x 768 screen minus
about 85 px of browser chrome leaves 683 px; minus the 24 px status bar, the 48 px panel header
and the 144 px header block, 467 px, or 14 rows of 32 px). The 1440 x 900 mocks fit 18, so
they show white space under most tabs; that is intended.
Where a kind has more than 14 rows of content, the excess goes into a disclosure, a "and N
more" row that expands in place, or a "See all in table" row, never a longer scroll.

**Disclosures inside a tab**: a collapsed section is its 40 px header with a one-line summary
in secondary text after the title ("Advanced  3 options", "Values 0.010 to 0.101", "Made by
Louvain, 80 ms, seed 42"). Clicking expands it in place. A section that would be empty is its
header with a "+" (Figma's rule, kept). Disclosures are for rows that are read often and edited
rarely; tabs are for jobs.

**What is always visible regardless of tab**: the name, the kind, the state, the reading, the
Style chip, the eye and the lock. The reader never has to change tab to see whether an object
is stale or what colour it is.

### 2.4 The tab set and row budget per kind

Rows are 32 px unless marked. "[x]" is a control. "(cond)" means the row is drawn only when the
condition holds. A section header ("FINDINGS") counts as a row. The count at the end of each
tab is the maximum row count with every conditional row present and every disclosure
collapsed; every count is 14 or under.

**Dataset** (what "nothing selected" shows): Overview | Layout | Canvas | Data (24 characters)

| Tab | Rows | Max |
|---|---|---|
| Overview | Nodes 34 \| Edges 78; Direction "Undirected, from file" (read-only; "Mixed" on #309 data; "Change..." reopens the import options, since re-direction after a load is a re-import today); Density 0.139 \| Mean links 4.6; Parts 1 \| Weighted No; Self-loops (cond, non-zero); Drawing 200,000 of 350,000 (cond, over the render ceiling, #302); "3 objects are stale [Re-run all (about 2 min)]" (cond); Import report (disclosure: read, kept, rejected with "See in table", repeated, weights from); FINDINGS header with "+": up to 3 rows then "and N more" (whole-graph facts: diameter; "likely missing links: 312 pairs, Open in table"; and, when a time-typed column has no time role yet, "Time column: sent, 2019-01 to 2019-12 [Show over time]", the timeline's first door, section 6.1); NOTES header with "+" (disclosure: every note by anchor) | 14 |
| Layout | Layout [Spread out v] with a gear (engine and its options in a popover, including the simulation's pace: pre-steps, steps per frame, stop delta); the select's first row is "Recommended: Spread out (small, one part)" from `recommendLayout`, with the reason, and the list is `catalog.layouts()` filtered on served (radial, grid and Sugiyama appear when served); transport row [Pause] [Step] [Re-run] "Settling 62%" or "Settled" or "Computing 42% [Cancel]" or "Stale: Communities changed [Re-run]" or "Failed: <reason> [Retry] [Run on the CPU]"; Dimensions "3D, follows the view" (read-only; "2D, flat layout: shown in 3D as a plane" for a flat-only layout); Group by [Communities v] (cond: the layout needs a grouping); Root [pick a node] \| Direction [Down v] (cond: a tree layout); Order by [Load order v] (cond: Ring, Spiral); caveat "Contains cycles: 12 edges reversed [Make a set]" (cond); "Ring on 12 of 34 (Group 2)" (cond: the last layout was scoped); "Positions from file: 34 of 34 [Keep positions]" (cond: the file carried positions); Pinned 2 [Unpin all] (cond); acceleration line "Runs on the GPU (NVIDIA T4)" or "CPU: WebGPU unavailable" in secondary text | 11 |
| Canvas | Background [chit] with "Follow theme" first (#291) and "Image..." for a skybox; Look [Default v] (the base looks: Default, Presentation, Print, Colour-blind safe, High contrast; #331); Labels [Top 6 by Connections v] with a gear (the label-style popover: text, background, placement including billboarding, wrap #294, avoid overlaps #5); Edge labels [none v]; Tooltip [Label + 3 attributes v] with a gear; Arrows [switch] (cond: directed data; writes the dataset-default layer below); Legend [switch] (L) \| Minimap [switch] (M, #293) as one two-column row; Note markers [switch] (Shift+N, #295) \| Show hidden faintly [switch] (the element's `visibility.showContext`: elements outside the mask drawn at low opacity instead of absent) as one row; DEFAULT LOOK header with "+": Node [chit] [size], Edge [chit] [width] (an unlocked "dataset default" layer just above the element's locked base layers; the "+" adds a whole-graph channel; the round-1 Dataset Fill) | 11 |
| Data | ATTRIBUTES header with "+" (Join a table... #298, New from formula...): one row per column (type glyph, name, completeness "94%", "..." with Colour by, Size by, Shape by, Filter by, Group by, Label by, Set as weight, Set as label, Set as time, Set as type; Set as weight and Set as label after a load reopen the import options, because they are load-time paths today), up to 10 visible then "See all 40 in table"; Time [sent v] (the second door to the timeline: choosing a column sets the time role and shows the transport bar; "none" clears it); Made by (disclosure: source, format, field mapping with "Change...", direction, time, fetches) | 14 |

Export is not on the Data tab: the Export button in the panel header is its one home (section
6.8). Attributes sit in Data and open expanded for small schemas (analyst finding F10). Where
round 1 had "Showing" and "Show [Everything v]" rows on the Dataset, this round removes them:
what is showing is the status bar's "Focused on X: 6 of 34 [Exit]" line and the focus glyph on
the tree row, and Focus is a verb on the Set. One home.

**Set** (rule, path, neighbourhood, fixed, cut, combination, network, pinned): Define |
Members | Style | Record (24 characters)

| Tab | Rows | Max |
|---|---|---|
| Define | by kind: Rule: expression field (autocomplete #332, validate #335; a layer-spec error from `styles.validate` shows inline today) or Attribute [v] \| Values [tokens] or [attribute v] Min \| Max, "+ Rule" (an AND line), Target [Nodes \| Edges]; a rule over connections reads whole-graph degree (the element's degree filter, `visibility/filter.ts:717-731`) and the tab says so under the field: "Counts every edge, not only what is showing"; Neighbours: Of [node 1] \| Within [2 v], Direction [All v], Edges [All among members v \| To the centre only]; Path: From [node 1] \| To [node 34], Method [Shortest v], Weighted [switch]; Network: Method [Kruskal v], Start [node] (Prim); Flow or cut: Source \| Sink, Capacity from [weight v]; Fixed: "12 nodes, 3 edges, fixed" [Edit members]; Cut: Of [Bridges >] \| Top [10] or Above [0.05]; Combination: [Group 1 >] [and v] [Path >]; Pinned: "Nodes fixed in place" (read-only). Then always: Invert [switch]; Within [Everything v] (read-only once the Set has nested children); Advanced (disclosure: bidirectional, Karger iterations and the like); "Live" or "Re-run on Enter" word in secondary text (the cost rule made visible); [Re-run (about 2 s)] (cond: stale); [Run (about 4 min)] [Approximate instead] (cond: waiting) | 12 |
| Members | Nodes 12 \| Edges 18; Inside edges 18 \| Cut edges 7 \| Density 0.27 (from a new `scope.statistics(spec)`, section 8, so reading them never touches the reader's selection); Hops 4 \| Cost 3.0 (cond: a path); Total weight 41.0 (cond: a network); up to 5 member rows (label, then the hop order or depth in secondary text), "See all 12 in table"; header actions: Select, Focus, Locate | 10 |
| Style | section 5.4: a NODES section and an EDGES section of paint rows, each with a "+"; "Covered by Influence on 12 of 12 members" (cond); overflow: Save style..., Apply style [v], Reset style | 14 |
| Record | MADE BY header; Method "Shortest route (Dijkstra)"; Parameters (disclosure: "weighted, both directions"; one row per parameter as run when open); Scope "What was showing, 115 nodes" or "Within Group 2, 11 nodes"; Engine "algorithms 2.0.1, on the GPU (single precision)" (from the new `backend` field, section 8); Time "80 ms, seed 42"; Caveats (disclosure: "2", one row each when open: "sampled 2,000 of 50,000", "computed on 2019-01 to 2019-12"); "Assistant: <request>" or "Recipe: <name>, step 3" (cond); [Copy as methods text] \| [Copy as command]; Export [Members, CSV v] [Export] (one row; the select lists what this object can export: Members CSV, Subgraph GraphML, Framed image PNG); NOTES header with "+": up to 2 rows then "All N notes" | 14 |

**Group** (one label of a Grouping): Define | Members | Style | Record. Define is three
read-only rows (Of [Communities >]; Label 2; "11 nodes, 32% of the scope") plus Profile
(disclosure, #193: "Mostly conference 7 (83%)" then value, count, expected, adjusted p). Members
and Record are a Set's. Style is section 5.3: the inherited row and the override above it. No
Delete (hide it instead); its overflow has Select members, Focus on this, Locate. A Group's
members are a scope of the group kind (settled decision 2; today a Group has no resolvable
membership, #149 "{where} queries and text search throw E_UNSUPPORTED everywhere").

**Measure** (a centrality, a numeric column, a formula): Values | Define | Style | Record (23
characters)

| Tab | Rows | Max |
|---|---|---|
| Values | Field [value v] (cond: several fields, e.g. hub and authority; in, out and total on Connections, which `degree` publishes today); Min 0.010 \| Max 0.101; Mean 0.029 \| Median 0.022; Widest 5 \| Narrowest 3 (cond: graph fields such as diameter and radius); histogram 208 x 40 (2 rows) with [linear \| log]; TOP header [10 v] with "+" (Top N set..., Above threshold set..., Bottom N set...); five ranked rows (rank, label, value; click selects the node; a drag across the histogram selects a band through a new `{between}` selection target, section 8); "See all in table" | 13 |
| Define | Method "Influence (PageRank)" with an info circle; one row per option from the catalogue's descriptors (Damping [0.85] \| Iterations [100]; Tolerance [1e-6]); Weights [switch] \| Direction [As loaded v] (#313 "weight and direction options are missing on most algorithms"); Exact [switch]; Within [Everything]; Advanced (disclosure); "edited" beside the method name when a parameter differs from its default; [Re-run] (cond: stale) or [Run] [Approximate instead] (cond: waiting) | 10 |
| Style | section 5.2: NODES and EDGES sections; one encoding block per channel, one block open at a time | 12 |
| Record | as a Set's; Export lists Ranked list CSV | 14 |

Values comes first because it is what the reader opens a Measure to read (analyst F14); a
waiting or failed Measure opens on Define instead (section 2.5).

**Grouping** (communities, components, steps away, shells, a category column): Groups |
Define | Style | Record (23 characters)

| Tab | Rows | Max |
|---|---|---|
| Groups | Groups 6 \| Modularity 0.36 (or Parts, Levels, Shells); Sizes "12, 9, 6, 4, 2, 1"; Show the largest [8 v], the rest as Other (this default applies to every Grouping, so 3,000 isolated parts from Separate pieces are eight rows and one "Other"); Names from [none v] (#191 "community groups have numbers but no names"); Sort groups by [size v]; "6 of 6 matched to their predecessors" (cond: after a re-run); the Group rows themselves are the tree's children and are not repeated; FINDINGS header with "+" (per-group profiles #193) | 8 |
| Define | Method; Resolution [1.0] \| Seed [42] [dice]; Iterations [100]; Kind [Weak v] (components on directed data); From [node] and Within [any v] steps (Steps away, #160 "BFS has no maxDepth"); Attribute [value] (read-only, an attribute grouping); Within; Advanced; Re-run or Run | 9 |
| Style | section 5.3: NODES and EDGES sections; the Colour block with the palette, five swatch rows then "and N more", Other, Overflow, Show the largest | 13 |
| Record | as a Set's; Export lists Membership CSV | 14 |

**Node** (a canvas or table click; not an object): About | Attributes | Links (20 characters)

| Tab | Rows | Max |
|---|---|---|
| About | leads with the material, because the novice's two questions are "what is it" and "who does it connect to": the first three attributes as key: value rows; "All 23 attributes >" (to the Attributes tab); "Connected to 17 nodes >" (to the Links tab; "In 9, out 8" on directed data); VALUES header: up to 3 rows, one per Measure and Grouping covering this node ("Bridges 0.031  rank 12 of 115 >", "Communities  Group 3 >", each a link to the object), then "and N more"; MEMBER OF: the header row carries the chips inline, one per Set, clickable (the header alone when empty); LOOK (disclosure, collapsed: its summary is the painted channels "Colour from Conference, Size from Bridges"; open, one row per painted channel from `session.styles.explain`, and its "+" is the door "Style this node..." which creates a one-node Set and opens the picker); NOTES header with "+" then up to 1 row | 14 |
| Attributes | a filter field (cond: more than 10 attributes); key: value rows, up to 12; "Show all 23" (expands in place) | 14 |
| Links | Neighbours 17 (In 9 \| Out 8 on directed data), from a new `session.data.neighbours(id, {direction})` (section 8); up to 10 rows "label, edge label" with a note glyph per row; "See all 17 in table"; header actions: Select, Neighbours tool (E) prefilled | 12 |

The header of a node has Locate and Pin in the eye and lock slots, and its overflow holds Style
its group... (cond: exactly one Group contains it; opens that Group's Style tab), Add to [set],
Copy id, Copy as JSON, Copy position, Expand from server (cond: a fetcher is configured),
Follow, What breaks if removed (#311 "no articulation points, bridges or node-removal impact";
its one home), Remove from data... (confirms; the one data edit). An **edge** has the same
three tabs with Endpoints in place of Links (two element rows and "Select both"); it waits on
edge picking (#319, "no right-click context menu on the canvas").

**Several elements** (marquee, Shift+click): one tab. "Make a set (Ctrl+G)"; "Add to [set v]";
Statistics (Nodes \| Edges, Inside \| Cut, per numeric attribute the selection mean against the
graph mean with an up or down glyph past one standard deviation; `session.selection.statistics()`);
Values per Measure (min to max) and per Grouping ("Mixed" or the one Group); Member of;
"Style these..."; "Merge into one node..." (proposed; the second data edit). The status bar
says "5,000 selected (capped)" when the element's selection cap truncated the selection.
Round 3 puts a SELECT section first (Select all shown, Select none, Invert, Add edges between,
Hide these, with keys), adds the edge inspector (About, Attributes, Endpoints) and the Table's
Edges tab, and draws them on screens 55 and 56 (`../round-3/navigate-select.md` sections 9 to
13).

**Several objects** (tree multi-select): one tab. Combine: four joined icon buttons (Union,
Intersect, Subtract, Exclude; Ctrl+Alt+U / I / S / X), disabled with a reason when a Measure or
Grouping is selected; Compare [switch] (section 6.7); Focus on these (creates the union and
focuses); Style: shared rows or "Mixed"; Hide all, Lock all, Delete (with the count).

**View**: no tabs. Camera "Update to current"; Mode [2D \| 3D \| VR \| AR]; Showing [Everything v]
(the mask it applies); "Export image from this view"; a drift dot after the name when the camera
has moved away from it.

### 2.5 Which tab opens when

Each kind opens on its first tab. The strip remembers the reader's last tab per kind (a
per-viewer convenience, browser storage) only after the reader has changed tab twice in a
session, so a first wander into Record does not make the next Group open on Record. Four
events override the memory, so the panel answers the question the reader just asked:

| Event | Tab that opens |
|---|---|
| a tool finishes and the new object is selected | Members (a Set), Values (a Measure), Groups (a Grouping): "what did I get" |
| a new object lands waiting or failed, or a Define edit marks it stale | Define: the Run or Re-run button and the parameters |
| "Style this node..." or "Style its group..." from a node, or a click on a tree row's chip | Style |
| a click on a "Bridges 0.031 >" Values row on a node's About tab | the object's Values (or Groups) tab, with that node's row highlighted |

### 2.6 The rules

1. The header block (144 px) never scrolls and never changes with the tab.
2. One tab is one job. A kind has three or four tabs, never five, and four names total at most
   27 characters (three names, 29).
3. No tab exceeds 14 rows with every conditional row drawn. Overflow goes to a disclosure, an
   "and N more" row or "See all in table", never to a longer scroll.
4. A disclosure header carries its summary, so a collapsed section still answers the common
   question.
5. The Style tab is one tab on every kind, and on every kind it has a NODES section and an EDGES
   section (section 5). Edge rows and node rows of one object are in the same tab.
6. Record is the last tab on every object and always has the same shape (Made by, one Export
   row, Notes), so the reader learns one place for provenance.
7. The first tab of a node is about the node; sections about objects follow it.

## 3. The toolbar

### 3.1 Shape and labels

A 56 px floating bar at the bottom centre of the canvas (Figma's is 48; the extra 8 px carries
a label under the icon of every tool that has no thirty-year-old icon). Radius 13, the panel
surface, the 200-level shadow. **Tool buttons are 40 x 40 with an 8 px label** under a 16 px
icon; Select and Hand, whose icons every reader knows, are 32 x 32 with no label. A label
longer than 40 px ("Neighbours") may extend 4 px into each neighbouring gap; nothing else is in
a gap. A 16 x 40 chevron follows a tool that has a flyout; groups 8 px apart; 1 px full-height
dividers between the four groups. The active (armed) tool is the brand blue with a white icon;
blue means nothing else on the toolbar. Tooltips carry the sentence and the key chip; the
toolbar's tooltip delay is 0 ms (every other tooltip waits 1000 ms), so a hovering novice reads
the name at once.

The bar is 725 px wide: 8 px padding, Select 32 plus its 16 px chevron, Hand 32, six labelled
tools at 40 (five of them with a 16 px chevron), Note and Ask at 40, the 122 px mode switch,
8 px gaps and three dividers. At the 1280 px window with two 240 px panels the canvas is 800
px, so the bar fits with 37 px to spare each side; below 1280 the bar overlaps the panels
rather than shrinking (Figma's own rule for its toolbar, `components.md` section 40). The
legend card (160 px, bottom right of the canvas) sits above the toolbar's right end, its bottom
edge 12 px above the bar's top, so the two never collide.

Left to right:

```
[Select v][Hand]  |  [Filter v][Neighbours][Path v][Groups v][Rank v][Structure v]  |  [Note][Ask]  |  [2D|3D|VR|AR]
    V       H            F          E         P        G        R         S             N     `
```

The mode switch is Figma's sliding-thumb segmented control (122 x 32; `components.md` section
18). VR and AR are drawn only when `el.isVRSupported()` / `el.isARSupported()` say yes; a
segment that cannot start (no headset, over the entry ceiling) is disabled with the reason and
the fix in its tooltip ("12,400 nodes showing; VR takes up to 10,000. Focus on a smaller set").

### 3.2 One rule for every creation tool

Every tool from Filter to Note **arms**: clicking it or pressing its key gives it the brand
fill and opens the secondary bar (section 3.5), which states what will happen, on what, and
what it will cost, and holds the one control that makes it happen. The reader acts (a canvas
click for the tools that need one; Run or Enter for the tools that do not), the object appears,
and the tool snaps back to Select. Escape cancels. Nothing runs on the first click, so a novice
who presses R sees a blue button and a sentence, never a blue button alone; and the scope and
the cost are read before anything computes, which is what the cost gate (section 4) protects
on the expensive side. The analyst's two-click picture is kept: a click on a flyout row runs
that variant at once with its defaults, because choosing a row is already the second click.

Round 1 and the first draft of this round had Groups, Rank and Structure run on the first
click, which made them commands wearing an armed tool's fill, and made section 4's step 1
contradict section 3. That is gone, and with it the Alt+click convention for the parameters
popover: the popover opens from the secondary bar's "Options" button or a flyout row's "...".

**Initial faces.** The face is the last variant the reader used; on a fresh session each
flyout tool's face is its cheapest, most legible variant: Select for Select, By values for
Filter, Shortest route for Path, Communities for Groups, Connections for Rank, Separate pieces
for Structure.

**Double-click on a node** expands it from the server when a fetcher is configured
(`el.layoutBehavior.fetchNodes`, the shipped gesture, `NodeBehavior.ts:555-565`); otherwise it
selects the node's neighbours. One gesture, one meaning per dataset, and the node's overflow
carries "Expand from server" as the findable door.

### 3.3 Every button

Status words: **today** means the element ships it and the app can wire it now; **proposed**
means element work with the issue number; **new** means new to this round.

| Button | Icon | Label | Key | What it does | Status |
|---|---|---|---|---|---|
| Select | arrow cursor | none | V | click selects a node (Shift adds, Ctrl toggles, Alt subtracts); drag on empty canvas draws a marquee in 2D; in 3D a plain drag orbits and Shift+drag draws the marquee; double-click per 3.2; Tab steps through the selected object's members. Flyout: 3.4 | click today; marquee proposed (element hit-test); lock-aware picking proposed |
| Hand | open hand | none | H, or Space held | drag pans (2D) or orbits (3D); wheel zooms | today (2D pan; wheel zoom about the centre); zoom toward the cursor in 2D, 3D wheel zoom and right-drag pan proposed, #290 "no wheel zoom or pan in 3D, and 2D zoom ignores the cursor" |
| Filter | funnel | Filter | F | arms; the secondary bar reads "Filter by values  [Options]  Matches 8 nodes  [Select] [Create] [Create and focus]  Cancel" and the parameters popover opens at once, because its fields are the whole tool; the live count is a dry run (`session.plan`). Flyout: 3.4 | By values, By range, By connections, Largest part today; By id list creates a Set today (a `{nodes}` scope) and can Focus with decision 2 (the filter type has no ids kind); By rule and Pattern proposed (#149) |
| Neighbours | node with spokes | Neighbours | E | arms; the secondary bar reads "Within [1 v] steps, [All directions v], of node 1  [Create]  Cancel"; a click on a node, or the selection, seeds it; Enter creates a Set "Around node 1" | today (`neighborhood` filter and the `neighborsOf` selection target) |
| Path | two dots joined by a line | Path | P | arms; "Pick the start node", then "Pick the end node  [Shortest route v]  Cancel" with a rubber-band line from A to the pointer; hands back an edge Set (ordered for a route). Flyout: 3.4 | Shortest route today; the rest per 3.4 |
| Groups | three circles in a ring | Groups | G | arms; "Find groups by [Communities v] on what is showing, 34 nodes, about 80 ms  [Options]  [Run]  Cancel"; hands back a Grouping with Group children. Flyout: 3.4 | today |
| Rank | bar chart | Rank | R | arms; "Rank by [Connections v] on what is showing, 115 nodes, instant  [Options]  [Run]  Cancel"; hands back a Measure. Flyout: 3.4 | today |
| Structure | bridge glyph | Structure | S | arms; "Find [Separate pieces v] on what is showing, 115 nodes, instant  [Options]  [Run]  Cancel"; hands back what the algorithm's shape says, shown by the kind icon on each flyout row. Flyout: 3.4 | new grouping; the entries have their own status |
| Note | speech bubble | Note | N | arms; "Click what the note is about"; a click on a node, an edge, a point on the canvas, or a tree row; the note row opens in the anchor's Record tab (a node's About tab) with its text field focused | proposed, #145; a note on an edge also waits on edge picking #319; markers #295 "no node image or icon channel" |
| Ask | sparkle | Ask | backtick | opens the bottom dock on the Assistant tab with the composer focused; a microphone at the right of the composer for voice. Ctrl+K is the keyboard-only palette, where a sentence that matches no command becomes the last row "Ask: <sentence>" | today (`el.aiCommand`); the assistant's tools rewritten as commands proposed, #337 "publish the command vocabulary in the ./commands entry point" |
| 2D / 3D / VR / AR | plane, cube, headset, glasses | (segment labels) | 5 toggles 2D and 3D; no key for VR or AR | switches the view mode; VR and AR enter a headset session at once when they can (no entry sheet); the panels minimise; the status bar reads "VR [Exit]" | today |

Not on the toolbar, and where it went: zoom (the header's zoom menu, which also holds "Reset
view (Home)", and the keys), legend and minimap (the Canvas tab, L and M), undo (Ctrl+Z, and
the History dock), export (the Export button), Combine (the multi-row inspector), search
(Ctrl+F in the tree header), layout (the Layout tab and the status-bar chip), comments as a
mode (Note is a tool, not a mode), "What breaks if removed" (the node's overflow), "Over time"
(the transport bar's gear, section 6.1).

### 3.4 Every flyout

Every flyout is a dark menu (radius 13, 32 px rows). **The left icon of every row is the kind
icon of the tree row it will make** (Set, Measure, Grouping, or a Finding glyph for a row that
lands in the Dataset's Findings), in place of Figma's check glyph, so the flyout shows its
result shape without a word; the face row is marked by its bold name. Every row shows the plain
name, the technical name in secondary text, and at the right the cost from `session.estimate`
("instant", "about 4 min", "at least 4 min" when the confidence is modelled) or "unavailable"
with the reason in the row's tooltip (from `session.catalog.metrics()`: needs weights, needs a
directed graph, needs WebGPU). A row that already ran on this data reads "in tree" in secondary
text; running it again makes a second row. A "..." at the right of a row opens the parameters
popover before running (section 3.5). The flyouts are populated from the algorithm catalogue
(`session.catalog.algorithms()`), so a plugin lands in the right one with no app change; the
rule that places an entry is 3.6.

**Select** (V)

| Item | Technical | Does | Status |
|---|---|---|---|
| Select | | click and marquee | today (click); marquee proposed |
| Lasso | | freehand region | proposed (no issue; element hit-test) |
| Front only (checkbox) | | in 3D, the marquee slab keeps only the nearest hit along each ray | proposed |

**Filter** (F) - every item creates a Set (Create), a transient selection (Select), or both plus
Focus (Create and focus)

| Item | Technical | Does | Status |
|---|---|---|---|
| By values | categories filter | Attribute [v], a value list with checkboxes and counts | today |
| By range | range filter | Attribute or Measure [v], Min \| Max, with the attribute's histogram above the fields; the list includes every Measure in the tree (analyst F7) | today for attributes; Select on a result today (the `{above}` target); Create on a result proposed, #192 "cannot hide small community groups or filter on group size" |
| By connections | degree filter | Min \| Max, Direction [All v]; counts whole-graph edges (section 2.4, Set > Define) | today |
| By rule | expression filter | one expression field with autocompletion and inline validation, "+ Rule" adds an AND line | proposed, #149; #332 "implement session.catalog.functions()"; #335 "implement session.catalog.validate()" |
| By id list | ids target | a text area; "12 of 14 ids found" | Create today; Select and Focus with decision 2 |
| Largest connected part | largest-component scope | no fields | today |
| Pattern | subgraph match (`data.match`) | a list of built-in templates (Triangle, Star of 3, Chain of 3, Square, Clique of 4); a Set of the union of matches with a Findings row "42 matches, Open in table" | proposed (design `data.match`; no issue yet) |
| Target [Nodes \| Edges] | | at the top of every Filter popover; an edge filter makes an edge Set | edges by expression proposed #149; edge categories and ranges proposed (small; no edge filter of those kinds exists) |

**Path** (P) - every item hands back an edge Set (ordered for a route); flow rows land here
because they answer "how are A and B joined"

| Item | Technical | Picks | Status |
|---|---|---|---|
| Shortest route | shortest-path (Dijkstra, Bellman-Ford) | A, B | today |
| All routes | all simple paths | A, B; Max steps, Max routes in the popover | proposed, #329 "implement all simple paths between two nodes" |
| Most that can flow | max-flow | A, B | today (hands back an edge Measure of flow plus the cut, the one Measure from this tool; its Style tab's EDGES section carries the encoding block) |
| Weakest link between two | min-cut (source, sink) | A, B | today |
| Weakest link anywhere | min-cut (global) | none | today |
| Best pairing | bipartite matching | none | today (an edge Set and a two-Group Grouping "Sides") |

The spanning-network tools (Kruskal, Prim) move from Path to Structure (3.6).

**Groups** (G) - every item hands back a Grouping with Group children

| Item | Technical | Picks | Status |
|---|---|---|---|
| Communities | Louvain | none | today |
| Communities, refined | Leiden | none | today |
| Communities, fast | Label propagation | none | today |
| Communities by cutting bridges | Girvan-Newman | none | today (heavy) |
| Communities, Markov / spectral / hierarchical | | none; hierarchical has "Groups [k]" which re-cuts live | proposed, #55 (in `@graphty/algorithms`, not registered) |
| Steps away from a node | BFS levels | one pick | today (#160 for a depth cap) |
| By attribute... | category column | a column select | the paint today in the element (`encode` by data path; no app UI, #190 "no way to colour or size nodes by a data attribute from the UI"); the Group children need a per-value scope: decision 2 or #149 |
| Several... | batch | a checklist popover, one Create | today (`runs.batch`); batch members after the first are created with the eye off (section 5.7, A4), which replaces the element's current rule of coalescing a batch to one layer per channel (`styles/autoApply.ts` rule 3) |
| Sweep... | parameter sweep | a popover: parameter, from, to, steps; a Findings table with "Make an object" per row | proposed, #194 "no parameter sweep for an algorithm" |

**Rank** (R) - every item hands back a Measure

| Item | Technical | Status |
|---|---|---|
| Connections | degree (in, out, total as fields) | today (the fields ship; #161 is only a direction option on the run) |
| Bridges | betweenness | today (heavy; #313) |
| Reach | closeness | today |
| Influence | PageRank | today |
| Influence by association | eigenvector | today |
| Influence at a distance | Katz | today |
| Hubs and authorities | HITS (two Measures from one run) | today |
| Clustering | clustering coefficient | proposed, #330 |
| Bridges (edges) | edge betweenness (an edge Measure) | proposed, #55 |
| Unusual nodes | anomaly score with a per-node "why" | proposed (#312 is the research issue) |
| Exploration order | DFS discovery time | today (last in the list; sorted by cost then name) |
| Several... | batch | today |

**Structure** (S) - new; the algorithms that describe the graph's skeleton rather than rank or
group its nodes; the row icon says what kind of object each hands back. Prediction rows land
here. Eight rows; "Over time" moved to the transport bar's gear (6.1) and "What breaks if
removed" to the node's overflow, because neither is about a skeleton and both made the tree
result unpredictable from the button.

| Item | Technical | Hands back (row icon) | Status |
|---|---|---|---|
| Separate pieces | connected components (weak; strong on directed data) | a Grouping, one Group per part | today |
| Densest shells | k-core decomposition | an ordered Grouping ("Shell 1" ... "Shell 5") with a sequential palette | in `KNOWN_ALGORITHMS`, unregistered; the GPU package has it |
| Bridge edges and cut points | articulation points and bridges | one Set holding both halves (nodes and edges) | proposed, #311 |
| Cheapest connecting network | Kruskal MST | an edge Set | today (needs undirected) |
| Cheapest network from a node | Prim MST | an edge Set; one pick | today |
| How far from everything | eccentricity (all-pairs today, BFS-based per #310) | a Measure, with diameter and radius in its Values header | today (cubic; almost always waiting); #310 "no diameter, eccentricity or average shortest path length" |
| Distances | diameter, radius, average path length | a Finding on the Dataset (no members) | proposed, #310 |
| Likely missing links | link prediction | a Finding "312 pairs, Open in table" | in `KNOWN_ALGORITHMS`, unregistered |

### 3.5 The secondary bar and the parameters popover

The **secondary bar** (Figma's contextual bar: 40 px, dark, above the toolbar) appears the
moment a tool is armed and disappears when the tool snaps back. Its shape is the same for
every tool: what will happen, on what, at what cost, the one control, Cancel:

- Rank: "Rank by [Connections v] on what is showing, 115 nodes, instant  [Options]  [Run]  Cancel"
  (or "on Group 2, 11 nodes" under Focus; "about 2 s" from `session.estimate`);
- Groups: "Find groups by [Communities v] on what is showing, 34 nodes, about 80 ms  [Options]  [Run]  Cancel";
- Structure: "Find [Separate pieces v] on what is showing ...  [Run]  Cancel";
- Path: "Pick the start node", then "Pick the end node  [Shortest route v]  Cancel";
- Neighbours: "Within [1 v] steps, [All directions v], of node 1  [Create]  Cancel";
- Filter: "Filter by values  [Options]  Matches 8 nodes  [Select] [Create] [Create and focus]  Cancel";
- Note: "Click what the note is about".

Enter presses the one control; Escape is Cancel. The variant select in the bar is the flyout's
list, so a reader who armed the tool by its key never needs the chevron.

The **parameters popover** (a 240 px light popover above the toolbar, caret at the tool)
appears when the reader asks for it: the bar's "Options" button, the "..." on a flyout row, or
the Filter tool always (its fields are the whole tool). It holds: the scope line in secondary
text ("On what is showing, 34 nodes" or "In Group 4, 12 nodes"), one row per option descriptor
with the catalogue's bounds (#336 "implement session.catalog.optionsFor()"), Weights \|
Direction (#313), Exact [switch], the cost line ("About 4 min on the GPU", from the new
`CostEstimate.backend`, section 8), and one button: Run (or Create for Filter). It answers
analyst F5 ("Gephi asks first"): a reader who knows the parameter sets it before the first run
instead of re-running.

### 3.6 The placement rule, and what changed from round 1

Round 1 placed every algorithm by its result shape alone (decision 12: node-metric under Rank,
community under Groups, path and edge-set under Path) and rejected a Structure tool as a
duplicate home. That rule put the spanning tree under Path (a tree is not a route), components
under Groups beside Louvain (a part is not a community), and left the no-member results
(distances, link prediction, temporal) with no tool at all, reached from a "+" on the Dataset's
Findings section.

This round's rule: **the flyout is chosen by the question the algorithm answers; the result
shape decides what kind of object it hands back, and the row's icon shows it.** Groups answers
"what groups are there"; Rank answers "who matters most"; Path answers "how are A and B
joined"; Structure answers "what is this graph's skeleton". The catalogue's `category`
(`graphty-element/src/catalog/types.ts:508`: centrality, community, path, flow, structure,
prediction) maps onto the four: centrality to Rank, community to Groups, path and flow to
Path, structure and prediction to Structure. Every algorithm still has exactly one flyout, so
the duplicate-home objection does not apply, and a plugin declares its question in its
catalogue entry. What moved: Kruskal and Prim from Path to Structure; components from Groups
to Structure; k-core, bridges, distances and link prediction from a Findings "+" to Structure;
temporal analysis to the transport bar's gear. The Findings "+" on the Dataset stays as a
shortcut to the same rows.

## 4. Running an algorithm, step by step

The example is Rank > Bridges (betweenness) on a 50,000-node graph, the case where every state
appears. On Karate Club steps 5, 6 and 7 pass in 80 ms and the reader sees only the row appear.

| Step | What the reader does | What appears, and where |
|---|---|---|
| 1 Arm the tool | presses R, or clicks Rank | Rank takes the brand fill and the secondary bar opens: "Rank by [Connections v] on what is showing, 50,000 nodes, instant  [Options]  [Run]  Cancel". The face is the last-used variant (Connections on a fresh session). The status bar's tool item reads "Rank: Connections" |
| 2 Choose the variant | opens the bar's select (or the toolbar chevron; the flyout is the same list) | rows with the Measure icon at the left: "Connections  Degree centrality  instant", "Bridges  Betweenness centrality  about 4 min", ... "Reach  Closeness  unavailable" (tooltip: needs a connected graph). Choosing in the bar updates the sentence: "Rank by [Bridges v] on what is showing, 50,000 nodes, about 4 min". Clicking a flyout row instead runs it at once (step 4). A row's "..." opens the parameters popover |
| 3 Parameters (optional) | presses Options | the popover: "On what is showing, 50,000 nodes"; Weights [switch] \| Direction [As loaded v]; Exact [switch off] "sampled above 2,000"; "About 4 min on the GPU (NVIDIA T4)"; [Run]. Skipping it runs with defaults. The same rows are the object's Define tab afterwards |
| 4 Run | presses Run, or Enter | the tool snaps back to Select; what happens next depends on the cost gate |
| 5 The cost gate | the estimate (4 min) is over the gate (30 s) | the row "Bridges (Betweenness)" appears at the top of the tree at once, selected, in the **waiting** state: a hollow circle glyph, and in the count slot a small secondary button "Run (about 4 min)". The inspector opens on Define with [Run (about 4 min)] and [Approximate instead (about 20 s)] as its first row, Run focused so Enter is the second click. Nothing computes. Under the gate, this step is skipped and the row appears computing. A waiting row is an object with no run yet: "defined, not started", a state the element's run model does not have today (section 8) |
| 6 Computing | presses Run | **computing** state: a 12 px progress ring replaces the count, filling to "42%"; the inspector's summary row reads "Computing 42%, on the GPU [Cancel]" with the phase in secondary text ("sampling 1,200 of 2,000"); the status bar's computing chip reads "Computing 1 of 1 [Cancel]" (with a batch: "Computing 1 of 6 [Cancel all]", and queued rows read "queued, 3rd" in their count slot); the object's chip is empty. A run that blocks the frame (`CostEstimate.blocksFrame`) shows a static working glyph instead of a ring and the status bar says "the page will pause for about 8 s"; its Cancel is not drawn |
| 7 Cancel (optional) | presses Cancel | a cancelled creation removes the row (same as Ctrl+Z); a cancelled re-run returns the row to its previous state; a cancelled sampling run keeps what it has, lands current with the caveat "cancelled at 60% of the sample" and a "~" before its count (partial results on cancel are element work; today a cancelled run has no result) |
| 8 The object appears | the run ends | **current** state: the ring becomes "50,000 values"; the chip becomes a ramp; the summary row reads "50,000 values, ~ sampled"; the reading row reads "Node 812 sits on the most shortest paths; the top 1% carry 40% of them" with a "?"; the inspector switches to the Values tab (top 10, histogram) |
| 9 First paint | nothing | the element's suggested encoding takes the first free channel **in the order for its kind** (section 5.7): a Measure tries Colour, then Size, then Opacity; a Grouping Colour, then Shape, then Outline; a Set Outline, then Colour, then Glow. "Free" means no visible object above writes it; when none is free the first choice is taken anyway and the covered object's Style tab says "Covered by Bridges on 34 of 34 members". So Rank then Groups gives a Measure on Colour and a Grouping on Shape, never four communities as four sizes. The legend switches itself on with the first Grouping or Measure (novice finding 7). The chip and the legend block show the ramp |
| 10 The reading on request | clicks "?" | a popover with the longer explanation (audience "novice"), the caveats ("sampled 2,000 of 50,000, seed 42, on the GPU in single precision") and "Copy as methods text" |
| 11 Edit a parameter | in Define, switches Weights on, presses Enter | the cost rule: under one second the row re-runs at once (a "Live" word in the tab says so); otherwise the row turns **stale**: an amber dot after the name, the name at 50%, the old paint kept, the summary row "Stale: weights changed [Re-run (about 4 min)]". Linked objects (a Top 10 cut) turn stale with it. In the element a changed parameter is a new run that replaces the old one under the same object id (section 8), and the replaced result stays in the journal so undo can restore it |
| 12 Data changes | Add data brings 6,000 nodes | every cheap object re-runs; every expensive one turns stale: "Stale: ran on 50,000 nodes, now 56,000 [Re-run]". The status bar gains "3 stale [Re-run all]"; the Dataset's Overview gains the same line with the total estimate. Re-run all respects the gate: rows over it go to waiting and the chip says "2 waiting". With Focus on, the status line adds "(6,000 new nodes hidden)" |
| 13 Failure | the run throws | **failed** state: a red dot; the summary row shows the message with [Retry] and, for a GPU error, [Retry on the CPU] as an explicit second button (an explicit choice is not a silent fallback; it needs a per-start backend override, section 8). The same state covers the element refusing its own painting (`style:problem`): "Paint refused: <reason> [Reset style]" |
| 14 An input is deleted | the reader deletes Bridges while "Top 10 by Bridges" links to it | the Top 10 turns **frozen**: a grey snowflake, members kept as a fixed list, summary "Frozen: Bridges was deleted [Unfreeze as fixed set]" |

Every state, its glyph, and where each shows:

| State | Tree row | Inspector summary row | Status bar |
|---|---|---|---|
| current | nothing extra; "~" before the count when approximate | the count; "~ sampled" | nothing |
| computing | a progress ring in the count slot, "42%"; "queued, 3rd" when queued | "Computing 42% [Cancel]", phase, "on the GPU" | "Computing 1 of 6 [Cancel all]"; a GPU glyph while a run is on the GPU |
| waiting | a hollow circle; the count slot is a small secondary button "Run (about 4 min)" | "[Run (about 4 min)] [Approximate instead]" | "2 waiting" only inside the computing chip during Re-run all |
| stale | an amber dot after the name; the name at 50%; the old count and paint | "Stale: <why> [Re-run (about 3 s)]" | "3 stale [Re-run all]" when more than one |
| failed | a red dot | the message, [Retry], [Retry on the CPU]; or "Paint refused: <reason>" | nothing (the row carries it) |
| frozen | a grey snowflake; the name in secondary text | "Frozen: 'X' was deleted [Unfreeze as fixed set]" | nothing |

Rules that hold throughout: the row appears instantly, always; no step opens a modal dialog;
Ctrl+Z after a creation removes the row and cancels its run; Ctrl+Z after a re-run restores
the previous result (both are `session.objects.undo()`, settled decision 1); whether an edit
re-runs at once or marks stale is decided by cost, never by kind; a mask (Focus or a time
window) never marks anything stale (section 6.1).

**Why the first-paint change is a precondition, not polish.** The element's auto-apply policy
today drops a suggested encoding when an authored layer already drives the channel
(`graphty-element/src/session/styles/autoApply.ts`, rule 2). Once the objects API creates every
layer as authored (source `user`), that rule would drop every suggestion after the first
object: the second algorithm would never paint. So "the suggested encoding picks the first free
channel in its kind's order and never drops itself" (section 5.7, A3) must land with the
objects API, not after it.

## 5. Styling

### 5.1 One word: Style

Round 1 used "Fill" on objects (Figma's word) and "Look" on a node, and recommended "Encoding"
for a Measure (decision 5). The owner's own words for this round are "node style", "edge
style", "group style", "paths are just edge styles". One word, then: the tab is **Style** on
every kind; a node's section that says which object painted it is **Look** (it is a report, not
a control). Inside a Style tab the rows differ by kind:

- a **Set** or a **Group** has paint rows: fixed values on a channel;
- a **Measure** or a **Grouping** has encoding blocks: a channel bound to its values through a
  scale and a palette.

"Encoding" survives as the word for a bound block (it is the element's own word, `encode()`),
never as a tab name.

**One grammar on every Style tab.** Every kind's Style tab has the same two section headers,
**NODES** and **EDGES**, each with a "+" listing the channels it can add, and every paint row
and every encoding block begins with its channel name: "Colour [chit] D55E00 100%" on a Set,
"Colour [ramp]" as the block header on a Measure, "Width [3]" under EDGES on a Path. The
section says which element kind the row paints; the first word says which channel. "Edge
colour" is no longer a channel name anywhere; an edge Measure's Colour block simply sits under
EDGES. A reader who learned the tab on a Path meets the same layout on a Measure.

### 5.2 Continuous values: a Measure's Style tab

Under NODES (or EDGES, for an edge Measure), one encoding block per channel the Measure writes.
The first block is the one the tool suggested (Colour, or the next free channel in the
Measure's order). Blocks are an accordion: one open at a time, the rest collapsed to their
header ("Size  0.8x to 2.2x  [eye] [-]"), so two channels fit the budget. Rows of an open
block, exactly:

| Row | Control | Notes |
|---|---|---|
| Block header | "Colour [ramp chip]" with an eye and a minus at the right, and a chevron | the channel name leads; the block's eye stops this channel only; the minus removes the block; clicking the name changes the channel among those the section allows |
| Scale | [Even steps v] | the catalogue's nine scales by plain name (`graphty-element/src/catalog/scales.ts`): Even steps (linear), By order of magnitude (log), By significance (neglog10), By area (sqrt), Curved (pow, with an Exponent row), Equal ranges (bins, with a Bins row), Equal counts (quantile, with a Bins row), One colour per value (ordinal), Use the value as it is (passthrough). The list offers only the scales that suit the value's kind (`scalesForDomain`) |
| Palette | a 156 x 14 ramp swatch with a chevron | opens the palette picker (5.6): sequential first for a Measure; diverging when a Midpoint is set |
| Values from \| to | [0.010] \| [0.101] | 9 px captions "from" and "to"; the value bounds the scale maps (the element's `domain`); scrubbable; commit on Enter, Tab or blur |
| Values actions | [Reset] [Reverse checkbox] [Clamp outliers checkbox] | Clamp cuts the bounds at the 2nd and 98th percentiles (the objects API reads them from `RunResult.column()` and sets `EncodingSpec.clamp` to them); the legend's departure line then reads "clamped at p2 and p98" |
| Midpoint | [0] | cond: a diverging palette (log fold change centred on zero) |
| Missing | [chit #b3b3b3] | what an element with no value is painted |
| Sizes from \| to | [0.8] \| [2.2] | cond: a size, width or opacity channel: the output range instead of a palette ("Widths from / to", "Opacity from / to") |
| Legend | a 208 x 14 preview strip of the ramp with the end labels | read-only; the on-canvas legend (L) draws the same block |

The NODES "+" lists Colour, Size, Opacity, Outline width, Glow, Label, and the preset "Colour
and size" that adds Colour and Size in one click (analyst F13); the EDGES "+" lists Width,
Colour, Opacity. Editing any row repaints at once; on a large graph the row shows "Restyling
38%" in its summary row while the repaint runs and a second edit replaces the first in the
queue.

Where the values come from is not a Style question: Values > Field [value v] chooses hub versus
authority or in versus out degree, and the Style follows the field.

### 5.3 Group values: a Grouping's palette and a Group's override

**The Grouping's Style tab**, under NODES:

| Row | Control | Notes |
|---|---|---|
| Block header | "Colour [strip chip]" with eye and minus | the channel name leads; the NODES "+" offers Colour, Shape (one of 25 meshes per group), Outline, Label (the group's name); the EDGES "+" offers Colour (on the inside edges of each group, once the induced-edge selector exists) |
| Palette | [Okabe-Ito v] | a categorical picker: Okabe-Ito, Tol vibrant, Tol muted, Pastel, Carbon, custom; the capacity ("8 colours") beside each; colour-blind-safe marked |
| Group swatches | one row per Group, in group order: [chit] Group 1  12 | five rows, then "and 7 more" which expands in place; a chit click opens the picker and writes an **override** on that Group (below); an overridden chit carries a small dot |
| Other | [chit] | the overflow colour for groups past the palette's capacity (#201 "the legend's Other swatch shows the default node colour") |
| Overflow | [Other v] | Other (paint the largest N, the rest grey), Shape (cycle node shapes past the colours: shown as a second block bound to the same field), Extend (keep inventing colours) |
| Show the largest | [8 v] | mirrored from the Groups tab; decides which Groups get their own colour and their own tree row (the rest collapse to one "Other" row, `critique/rough-edges.md` section 8) |

**A Group's Style tab** has exactly two rows under NODES: the override paint row when one
exists ("Colour [chit #d55e00] D55E00  100%  [eye] [-]"), and under it the inherited row
"Colour [chit #56b4e9] Inherited from Communities" with a lock glyph and no fields. Clicking
the inherited chit creates the override and opens the picker (novice finding 2: the locked
swatch was the natural first click and did nothing). The override is a layer inserted directly
above the Grouping's encoding layer in the element's flat stack (the objects API projects tree
order onto the stack; `Layer` has no parent), which is why it wins; its minus returns the Group
to the inherited colour.

**Precedence between a Group and its Grouping**: children paint above their parent. A Group
with an override beats the Grouping's palette on that group's members and nowhere else. Moving
a Group is not allowed (it is nested), so the only way an override loses is the Group's eye or
an object above the whole Grouping.

**Identity across re-runs**: overrides, names and notes follow a group by label today and by
largest-overlap matching once the element has it (#191). Until then the Record tab says
"groups matched by label; names and overrides may not follow" as a caveat.

### 5.4 Edge styling, edge Sets, and how several paths layer

A Set's Style tab has NODES and EDGES sections of paint rows. A node Set (a rule, a
neighbourhood) draws both once the induced-edge selector exists (its EDGES rows paint the edges
between its members); an edge Set (a path, a network, a cut) draws both too (its NODES rows
paint the endpoints on a path). Each section's "+" lists its channels:

| NODES "+" | EDGES "+" |
|---|---|
| Colour, Opacity, Size, Shape, Outline (width, colour), Glow, Label (attribute, member value such as hop order, or fixed text; a style gear), Tooltip, Marker (#295), Animation (label pulse), More... (Wireframe, Flat, Glow strength) | Colour, Opacity, Width, Pattern [Solid v] (solid, dot, star, box, dash, diamond, dash-dot, sinewave, zigzag; a repeat count in its popover), Curve, Arrows (head [v], tail [v]; size, colour, text in a popover), Animation (flow speed along the edge), Label |

A Path made by the Path tool starts with three rows: EDGES > Colour (the next unused highlight
colour), EDGES > Width 3, NODES > **Outline** 2 px in the same colour. An outline, not a fill,
so the community colour of a node on the path stays visible under it and a route through
same-coloured nodes never vanishes. The reader adds Pattern, Arrows or Animation from the "+".

**The highlight palette.** The objects API assigns every new Set the next unused colour of a
highlight palette that the element ships **disjoint from every categorical palette it ships**
(the element owns both lists, so it can check): no colour of it is within a perceptual
distance of an Okabe-Ito, Tol or Pastel colour, and none is the UI accent. The round-1 cycle
(blue, green, orange, then the categorical palette) collided with the default community
palette. Past the highlight palette's capacity the cycle continues through a darkened copy.

**Several paths at once.** Each Path is its own row, its own edge layer, its own colour. Where
two paths share an edge, the per-channel rule decides: the higher row's Colour wins on that
edge, but the lower row's Width or Pattern still shows if the higher row does not write it. So a
reader who wants three overlapping routes told apart gives them different **patterns** (solid,
dash, dot) or different **widths** (5, 3, 2) as well as colours, and the shared edge shows the
higher route's colour with the pattern of whichever writes Pattern highest. The legend (L)
lists each Path as a block with its swatch, width and pattern. Screen 8 in `screens.md` draws
it. In the element a Path is two layers (nodes and edges; settled decision 3), so "Covered by"
counts are per section.

**What this needs from the element** (`feature-fit/5-styling.md` A1, A2, A6): `highlight()`
loses its exclusivity (or the objects API passes `exclusive: false`); the highlight colour
cycles per Set from the disjoint palette; a layer selector by scope with an edge target
resolving to the induced edges of a node scope; the legend block carries width and pattern.
All four are small.

**Dimming what a path did not select** stays a reader's choice, never a suggested style (the
root `CLAUDE.md`, Algorithm Styles): the Set's overflow "Dim the rest" creates a linked Set
"Not in Path: 1 -> 34" (everything minus the path) with Opacity 0.3 on nodes and 0.2 on edges,
inserted just below the path. It is a row the reader can move, hide or delete.

### 5.5 The precedence rule, restated with the round-2 objects

For each channel of each element, the visible object nearest the top of the tree whose Style
writes that channel and whose members include the element wins. Children paint above their
parent. Hidden objects (eye off) do not paint. Below every object is the Dataset's default
look, then a base look preset. Two things make this visible: a covered object's Style tab
reads "Covered by Influence on 12 of 12 members" (computed by the objects API from member
masks, not from per-node explain calls), and a partly covered row carries a half-filled chip.
The fix is Figma's: drag the row, or change the channel.

### 5.6 Style presets, looks and the palette library

Three different things, each with one home, so that "apply a look" never overwrites an
object's rows (`feature-fit/1-data.md` note L):

| Thing | What it holds | Home | Status |
|---|---|---|---|
| **Look** (a base preset) | the Dataset's default look (node and edge defaults, label style, arrows, background) and the default palette per kind (sequential, categorical, diverging, highlight); never an object's rows | Dataset > Canvas > Look [Default v]: Default, Presentation (bigger labels, nodes, edges), Print (greyscale categorical, pattern edges), Colour-blind safe (Okabe-Ito and viridis defaults), High contrast, Dark; "Save current as look..." | proposed, #331; the row exists only once themes are restricted to match-everything layers (a precondition, because `applyTemplate` replaces the whole stack today) |
| **Saved style** (an object preset) | the paint rows of one object: "thick red dashed" for a path, "outline 2 px" for a Top N | any object's Style tab overflow: "Save style..." names it; "Apply style [v]" lists the saved styles that fit the object's kind (edge styles for an edge Set); stored in the project file | new; the objects API stores it as a layer template without a selector |
| **Palette** | a named list of colours | the palette picker, opened from any Palette row: built-in by kind (7 sequential, 5 categorical, 3 diverging, the highlight palette), then custom; "Add palette..." takes a list of hex values or a name; a saved document carries custom palettes | today (`session.catalog.palettes()`, `registerPalette`, `toDocument()` carries them) |

Exporting the whole stack as a style document (`session.styles.toDocument()`) is Export >
"Export styles..." (it exists today); the reader's way to carry a look plus its objects to
another file is the recipe (Export > Recipe, "Styles only" ticked) or the project file.

### 5.7 Element changes this section needs

| Change | Size | Round-1 reference |
|---|---|---|
| Exclusive highlights become opt-in and off for the objects API | small | `feature-fit/5-styling.md` A2 |
| Highlight colour cycles per Set from a highlight palette disjoint from the shipped categorical palettes | small | A6 |
| A layer selector by scope; an edge target resolves to induced edges | small to medium | A1, settled decision 2 |
| A top-N scope kind usable as a layer selector (the label budget "Top 6 by Connections" is a hidden layer with one) | small | round-1 A8, settled decision 2 |
| Suggested encoding picks the first free channel **in a per-kind order** (Measure: Colour, Size, Opacity; Grouping: Colour, Shape, Outline; Set: Outline, Colour, Glow) and never drops itself; a precondition of the objects API (section 4) | small | A3 |
| Batch members after the first are created with the eye off; replaces the coalescing rule (`autoApply.ts` rule 3) | small | A4 |
| Coverage counts from member masks; a partial-cover flag per row | small | `critique/rough-edges.md` section 1 |
| `encodeAttribute` (or `encode` accepting a data path) | small | `feature-fit/5-styling.md` 2.3 |
| Themes restricted to match-everything layers; a "base and palettes only" template scope; an unlocked dataset-default layer above the base | medium | A12, `feature-fit/1-data.md` note L |
| A saved style: a layer template without a selector, stored with the objects | small | new |
| The legend block publishes the Other colour, group display names, and a highlight block's width and pattern | small | #201, #191 |
| The legend drawn by the element, on canvas and in captures | medium | #292 "no built-in on-canvas legend" |

## 6. The timeline, and every other capability the round-1 mocks ignored

### 6.1 The timeline

**Home.** One surface with its settings behind a gear. The **transport bar** is a 40 px strip
across the canvas's width, directly above the dock's handle and the status bar, drawn only
while a time window is on. Its **gear popover** holds the settings that round 1 had nowhere and
the first draft of this round put in a fifth Dataset tab (which did not fit the panel): Time
attribute [sent v] (or "From [start v] To [end v]" for interval data, below); Unit [Month v];
Window from [2019-03] \| to [2019-05]; Mode [Sliding \| Cumulative]; Step [1 month v]; Speed
[1x v]; "Re-run objects while playing" [switch]; "Re-run layout per step" [switch] (#144 "the
session has no layout API"); CHANGES (disclosure: per-step counts as a small chart, "Go to this
time" per row); OVER TIME (a Findings section: "Over time: Communities, 12 steps" with a series
chart and "Biggest movers", which promotes to a Measure; the temporal result shape, #300 "no
time-series playback over a time attribute"; this is where Structure > Over time went). Time is
not an object: it has no members and paints nothing; it is a mask (what is showing), exactly as
Focus is, and the two compose ("Focused on Group 2, 2019-03: 6 of 34").

**Two doors.** A reader who loads a CSV with a `date` column must find the timeline without
knowing the words. The attribute catalogue already types the column as time
(`session.data.attributes()`), so: (1) while a time-typed column has no time role, the
Dataset's Overview carries a Findings row "Time column: sent, 2019-01 to 2019-12 [Show over
time]", which sets the role (#333 "implement session.catalog.timeAttributes()"), sets a
full-range window and shows the bar; (2) the Data tab has a row "Time [sent v]" that does the
same and also clears it. The column's "..." keeps "Set as time" as a third, for the reader who
is already there.

**Rows of the transport bar**, left to right: the window readout "2019-01 to 2019-03" (or
"up to 2019-03" in cumulative mode); [<] [Play] [>] (comma and period step; Space plays while
the bar has focus); Speed [1x v]; a slider over the full range with the window drawn as a
band, the end labels, and tick marks where the per-step change count is high (from the
per-step summaries, #300); at the right the counts "412 of 1,204 nodes, 1,910 of 5,830 edges
showing", the gear, and a close "x" that clears the window. The band's two handles snap to
whole steps and never overlap consecutive windows, because the element's window is half-open
and per-step change counts are only honest for non-overlapping steps. The status bar's mask
text mirrors the readout.

**Which elements a window hides.** The element's window today reads one attribute path on
nodes and edges, treats an element with no value as inside the window, and hides an edge whose
endpoint is hidden but never the reverse (`graphty-element/src/session/visibility/filter.ts:91-100,
936-942`; `VisibilityApi.ts:27-29`). With an edge-only time column that hides no node at all,
so screen 10 as first drawn was impossible. This design adds one rule to the element's window
(section 8): **a node with no time value of its own is inside the window when at least one of
its edges is; a node with its own time value follows that value; when nothing carries a time
value, everything is inside.** So nodes follow their edges, an email network's silent people
disappear from a month they sent nothing in, and a node table with a `joined` column is
honoured when it exists. The gear shows "Nodes by [joined v]" as a second select when the
catalogue has a node time column.

**Interval data.** graph-io stores a GEXF file's dynamics as `start`, `end` and `spells` (a list
of intervals) role columns (`graph-io/src/formats/gexf/schema.ts:120-128, 169-177`), and the
element's window is one instant per element. This design adds the interval form to the element
(section 8): the window takes either one attribute or a `{start, end}` pair (or a spells
column), and an element is inside when its interval overlaps the window. The gear shows
"From [start v] To [end v]" when `timeAttributes()` reports intervals and "Time attribute
[sent v]" otherwise; the reader never chooses the form.

**What changes over time.** The mask: elements outside the window are not drawn, positions
kept (the element's visibility pass; "Show hidden faintly" on the Canvas tab draws them at low
opacity instead). **A window never marks an object stale**, exactly as Focus never does: a
Measure or Grouping keeps the values it was computed with, its legend block and its summary
row carry the caveat "computed on 2019-01 to 2019-12" (from the window bounds the element now
records in the run's caveats, section 8), and the picture keeps painting those values, which is
honest and visible without turning the tree amber the moment the slider moves. A Set defined by
a rule keeps its members and shows only those inside the window; a rule over connections is a
whole-graph rule (its count does not tick, and its Define tab says so). "Re-run objects while
playing", off by default, is the reader's explicit opt-in: with it on, every object whose scope
is what is showing re-runs at each step under the cost rule (under a second: at once; over it:
kept, with the caveat), so a Measure "Connections" scoped to what is showing and its cut Set
"Above 20" tick with the window, and the Grouping keeps its caveat. Positions are never re-laid
out by playback unless "Re-run layout per step" is on. Explicit re-runs ("Re-run" in a summary
row) always run at the current window. The element work: the window is excluded from the
staleness digest (today a run over "visible" goes stale when the window moves, because
staleness is derived from the resolved scope's digest, `RunsApi.ts:399`), and its bounds
(attribute, from, to) are recorded in `Caveats` and `StaleNote` so the message can be written
from the record.

**Interaction.** The reader takes either door, the bar appears with the full range, and she
scrubs or plays. Escape pauses playback before it does anything else in the ladder. A View
saves the window as part of its mask. Video export (6.3) can record "while the time window
plays".

### 6.2 Saved Views

**Home.** The Views list above the tree (Figma's Pages slot), collapsible. One automatic row,
"Overview", written by the element as a default preset at the first fit after a load (so the
app decides no camera state); the rest are the reader's, from the "+", the zoom menu's "Save
view" or the palette. **Rows.** Each row: the name, a current-view style on the last applied
one, a drift dot when the camera has moved away from it. A View's inspector: Camera "Update to
current"; Mode [2D \| 3D \| VR \| AR]; Showing [Everything v] (the mask it applies, including a
time window); "Export image from this view". A View does not store eyes, encodings, selection
or positions (`feature-fit/2-selection.md` 4.4; `feature-fit/4-layouts.md` 6.6): the tree is
the one place appearance lives. The Views header's overflow has "Export views..." and "Import
views..." (the element's camera-preset export and import). **Interaction.** Click applies with
a 500 ms animation and may enter or leave Focus; double-click renames; drag reorders; Left and
Right arrows step through Views in Present mode (Shift+\ minimises both panels to a pill;
Escape returns). Element gaps: a view preset that carries mode and mask
(`feature-fit/6-camera.md` section 4); and the objects API stores a reader's View under its own
namespace, because `saveCameraPreset` refuses a name that shadows a built-in framing such as
"Fit" (`camera/resolve.ts:66`), so a reader may still call a View "Fit". Round 3 draws the
list, the View inspector and the Views menu on screen 53, with Save view on Ctrl+Alt+V and
PgUp / PgDn stepping views outside Present (`../round-3/navigate-select.md` section 7).

### 6.3 Video export with camera paths

**Home.** Export > "Export video..." (a popover). **Rows.** Camera [Hold \| Orbit \| Along
views v]: "Along views" takes the Views list in its order as the waypoints, each with a seconds
field, so the Views list is the storyboard; Duration; Format [WebM \| MP4]; Frames per second;
"While the layout settles" and "While the time window plays" as two more camera rows (the
layout transport #144 and playback #300); Transparent background; a secondary line with the
estimate from `estimateAnimationCapture` ("about 40 MB, 12 s"); [Export]. **Interaction.**
Progress in the status bar's computing chip with Cancel; the file downloads. Shipped today in
the element (`el.captureAnimation`); no app surface.

### 6.4 XR entry

**Home.** The VR and AR segments of the mode switch, drawn only when the browser reports
support. **Rows.** None on entry: the segment switches at once when it can; when it cannot it
is disabled with the reason and the fix in its tooltip. The pre-entry choice from round 1
("Enter VR showing [Set v]") is a right-click on the segment: a dark menu of "Everything" and
every Set, which is Focus then enter. The headset's input settings (teleportation, hand
tracking, controllers, reference space, z-axis amplification) are Settings > Headset (6.12).
**Interaction.** Entering minimises both panels; the status bar reads "VR [Exit]"; the headset
shows the picture as painted, and the element's own in-headset UI takes over (grab and drag a
node pins it and the Pinned row grows; voice through the assistant creates objects that appear
in the tree on return). On exit the desk camera is restored and the status bar says "Back from
VR: 2 objects added" for a few seconds; no View is written. The in-headset object list (eyes,
Focus) is the stated target once the objects API is the element's (`critique/rough-edges.md`
section 9); it is not this round.

### 6.5 The AI assistant creating objects

**Home.** The Ask button (backtick) opens the bottom dock's Assistant tab; Ctrl+K's last row
"Ask: <sentence>" lands in the same place. **Rows.** Before a provider is set, the tab's first
state is one row, "Choose a provider" (opens Settings > Assistant). Then the transcript: each
turn, and under a turn that made objects a row per object ("Made: Bridges (Betweenness)") that
links to the tree row; each tool call as a collapsed row ("Ran Rank > Bridges", expandable to
the command as JSON, "Copy as command"); a follow-up turn is one request; a composer with a
microphone; one line above it, always, "Questions send a sample of up to 50 nodes and their
attributes to Anthropic" (#326). **Interaction.** One request is one undo step and one visual
batch: the first object it makes paints, the rest are created with the eye off; every row it
made carries a small assistant glyph and its Record tab reads "Assistant: <the request>". The
assistant is scoped as the tools are (to what is showing, or the focused Set) and its reply says
so. It gets `session.estimate`, so a four-minute run is reported as "I set up Bridges; it needs
about four minutes, press Run" and the row lands waiting. Element work: the tool vocabulary
becomes the command vocabulary (#337); `ai-stream-tool-result` carries the object ids;
cancelling the request cancels the run.

### 6.6 Notes and annotations

**Home.** The Note tool (N), the Record tab's Notes section on every object, the About tab's
Notes on a node, and the Dataset's Overview "Notes" disclosure listing every note by anchor.
Markers on the canvas through the element's marker channel (#295), toggled by Canvas > Note
markers (Shift+N). **Rows.** A note row: text, tags, author (when Settings names one), time; an
orphaned note (its anchor left the graph) under "Orphaned" with Reattach and Delete.
**Interaction.** N then click a node, an edge, a point or a tree row; type; Ctrl+Enter saves. A
callout with a leader line is a node note whose marker is expanded (the element draws it).
Drawn highlight shapes are not offered: the region is a Set with an Outline or Glow style, and a
set-level hull channel is the element work that would draw a soft shape around a Set's members
(`feature-fit/7-.md` note D). Notes are session-wide, in the project file; a View remembers
only whether markers were shown. Element work: #145.

### 6.7 Comparing two objects

**Home.** Two ways, both from the tree: select two rows and switch on Compare in the
multi-object inspector, or "Compare with [object v]" in any object's overflow. **Rows.** Compare
opens a second canvas beside the first on the same tree and the same selection; each canvas
shows only that object's Style (the other objects' eyes are not touched; the second canvas is
rendered with a per-canvas visibility of layers, which is the element's second-renderer work,
#186 "the Compare toggle does nothing"); a "Link cameras" switch in the status bar; a Findings
row on the two-row inspector: the agreement between two Groupings ("agree on 28 of 34 nodes,
adjusted Rand 0.71") or, for two Measures, a "Difference" button that creates a linked Measure
of the per-node delta whose Top N cut is the biggest-movers Set. **Interaction.** A click in
either canvas halos in both; Escape or the switch closes the second canvas. This adopts
round-1 decision 4's recommendation (b): Compare takes two objects, not two Views, so nothing
toggles eyes behind the reader's back. It is a reversible choice and is decided here.

### 6.8 Screenshots and export

**Home.** The one filled button, Export, in the right header, is the only home; every object's
Record tab has one Export row for the exports that belong to that object (Members CSV, Ranked
list CSV, Membership CSV, Subgraph GraphML, Framed image). **Rows.** Export's menu: Export
image... (a popover: Preset [Web v] first (print, web-share, thumbnail, documentation; the
element's screenshot presets), Format [PNG v] listing only what `capabilities.capture` can
write, Scale, Framing [Current v], Transparent, Legend in picture (on by default, #292), Notes
in picture, Quality (disclosure: supersample, MSAA, FXAA), a secondary line "2400 x 1600, 34
nodes in frame, about 1.2 MB"), Copy image (Ctrl+Shift+C), Export video..., Export data...
(format, scope Everything or What is showing, Include positions, Include object columns),
Export report... (a checklist of tree rows in tree order plus Statistics, Image, Legend,
Methods, Notes; #187), Export styles..., Export bundle..., Copy methods text, Export recipe.
Rows appear only when an exporter exists (data exporters are proposed; graph-io has them).
**Interaction.** Export downloads; progress in the status bar chip. Save project (Ctrl+S) is in
the file menu, not under Export, because it is the reader's own work (#301). Round 3 specifies
the Save project dialog, the saved state, reopening with missing data, autosave, and the Export
recipe and Run a recipe dialogs (`design/ui/object-first-ux/round-3/file-project.md` sections 4
to 6; screens 18 to 20).

### 6.9 Labels and declutter

**Home.** Dataset > Canvas: Labels [Top 6 by Connections v] (none, all, selected, top N by any
Measure in the tree) with a gear opening the label-style popover; Edge labels; Tooltip. Any
object's Style tab can add a Label row that wins on its members (a Path labelled by hop order).
**Rows.** The label-style popover: Text (font, size, weight, colour, "Wrap at 20 characters, 2
lines" #294 "node labels never wrap to a width", "Cut at 15 characters"), Background (fill,
padding, radius), Placement (attach position, offset, fade with distance, billboarding), Badge
[none v], "Avoid overlaps" [switch] (#5). Settings > Canvas: "Highlight neighbours on hover
[Off \| Neighbours \| 2 steps]" with "dim the rest" (element-owned, transient, allowed to dim
because it is the reader's setting, not an algorithm's style). **Interaction.** The label
budget is a hidden layer whose selector is a top-N scope (5.7); if that Measure is deleted the
row falls back to None and says so. A hover on any node shows its label even when budgeted
(novice finding 5).

### 6.10 Palettes and legends

**Home.** The palette picker from any Palette row (5.6); the legend as a canvas overlay (L)
drawn from `session.styles.legend()` and, once #292 lands, drawn by the element so it reaches
captures. It sits at the bottom right of the canvas, above the toolbar's right end (3.1).
**Rows.** One legend block per visible Measure or Grouping in precedence order (top of the tree
first), one small block per visible Set (its swatch, width and pattern, and its name); a
categorical block's rows ARE the Group rows (same name, chip, order, so #381's numbering
mismatch cannot recur); a ramp block with the end labels and a departure line ("clamped at p2
and p98"; "computed on 2019-01 to 2019-12"; "10 nodes painted by Path: 1 -> 34"); "and N more"
after 8 rows; covered blocks omitted. **Interaction.** Click a swatch selects that Group's row
(its members halo); Shift+click extends the row selection; the overlay's header has a collapse
chevron and a corner menu.

### 6.11 Acceleration status

**Home.** Not on the everyday screen except as facts: the flyout's cost reflects the GPU; the
computing chip shows a GPU glyph while a run is on the GPU; the Layout tab's acceleration line
reads "Runs on the GPU (NVIDIA T4)" or "CPU: WebGPU unavailable, needs a secure context"; every
object's Record tab reads "on the GPU (single precision)" or "on the CPU". All of these read a
`backend` field the element does not record today (section 8); until it lands the words are
not drawn. Settings > Performance holds the policy: Acceleration [Auto v] (Auto, Off,
Required), "Use the GPU above [N] nodes", the state line with the reason (probing, active, idle,
unavailable, error, off), and "Measure this machine (about 10 s)" (#159 "wire calibrateLayout
so the exact-tier ceiling is measured, not fixed"). **Interaction.** A GPU failure mid-run is
the failed state with [Retry] and an explicit [Retry on the CPU]; never a silent finish (the
root `CLAUDE.md`, WebGPU). The element owns detection, construction and device loss; the app
reads `session.capabilities.acceleration` and draws it.

### 6.12 Everything else in the inventory, placed

The maintainer's critique listed twenty-nine capabilities from
`inventory/element-capabilities.md` that neither this file nor `screens.md` named. Each has a
home now; eleven of them are rows of the Settings sheet (File menu > Settings..., Ctrl+,; screen
13 in `screens.md`). Round 3 draws it as the kit's dialog with its eight sections as
disclosures rather than a left list of sections
(`design/ui/object-first-ux/round-3/file-project.md` section 8).

| Capability | Home |
|---|---|
| Mixed direction per edge (#309) | Dataset > Overview: Direction reads "Mixed" |
| Repeated-edge policy; id coercion; endpoint spelling; position scale | Dataset "..." > Import options... (a sheet with those four rows; re-imports on Apply) |
| Position scale and seeded positions | Layout tab: "Positions from file: 34 of 34 [Keep positions]" |
| Load progress and Cancel a load (#296) | the status bar's computing chip: "Loading 42% [Cancel]" |
| List edges (`getEdges`, #297); column to ids (#148) | the table dock's Edges tab and its object columns; noted on screen 9 |
| Node merging | Several elements: "Merge into one node..." (proposed; the second data edit) |
| SIF, CX2, STRING, BioGRID, Neo4j APOC readers | Open... accepts what `catalog.formats()` lists; the dialog is catalogue-driven |
| Progressive / viewport-first loading | out of scope for this design; said here |
| Selection halo style | Settings > Canvas |
| Selection cap 5,000 and `truncated` | status bar: "5,000 selected (capped)" |
| Select by text search (#149) | Ctrl+F's second section, "Nodes" (by label or id) |
| Hover, `node-hover` | the hover label (6.9) and the tooltip channel |
| Run on load (`algorithmsOnLoad`) | Settings > Analysis: "Run when data loads [checklist]" |
| Queue policy (append, replace, now) | internal to the objects API; a Define edit uses "replace" |
| Plan (`session.plan`) | the Filter bar's live "Matches 8 nodes" (a dry run) and the export size line |
| Recommend a layout (`recommendLayout`) | the Layout select's first row "Recommended: Spread out (small, one part)" |
| Pace the simulation (pre-steps, steps per frame, stop delta) | the layout engine's gear popover |
| Animated layout transitions (`transitionMs`) | Settings > Canvas: "Animate layout changes" |
| Radial, grid, Sugiyama layouts | the Layout select lists `catalog.layouts()` filtered on served |
| Validate a layer spec (`styles.validate`) | a rule Set's expression field: the error inline |
| `style:problem` (the element refused its own painting) | the failed state on that object: "Paint refused: <reason>" (section 4) |
| `node.wireframe`, `node.flat`, `node.glowStrength` | the NODES "+" under "More..." |
| Label billboarding | the label-style popover, Placement |
| Reset camera, starting distance | the zoom menu's "Reset view (Home)"; Settings > Camera |
| Skybox background | Canvas > Background: "Image..." |
| XR: teleportation, hand tracking, controllers, reference space, z-axis amplification | Settings > Headset |
| AI: provider, API key persistence, WebLLM in-browser | Settings > Assistant: provider, model, key, "Keep the key [this session \| on this device \| never]"; the Assistant tab's "Choose a provider" first state |
| Multi-turn tool use | the Assistant transcript; a follow-up turn is one request |
| Logging and log sinks | Settings > Advanced |
| Render settings, WebGPU rendering (#36), profiling and frame stats | Settings > Performance, beside the acceleration policy: "Show frame stats" |
| Screenshot presets and quality | Export image...: Preset first, Quality in a disclosure (6.8) |
| SVG and PDF capture | the Format select lists what `capabilities.capture` writes |
| Export and import camera presets | the Views header overflow (6.2) |
| `visibility.showContext` (hidden drawn faintly) | Canvas tab: "Show hidden faintly" |
| Style templates as a file (`toDocument`, `applyTemplate`) | Export > "Export styles..." (6.8) |

## 7. The screens

`screens.md` beside this file specifies fifteen screens to draw in the round-1 kit
(`mocks/kit.css`, `mocks/kit.html`), each with its purpose, exact state, every panel's rows and
the interaction it shows: first run; loaded with the Dataset's tabs; the tree after two runs and
a filter with a Group's Style tab; the Rank tool armed with its secondary bar, flyout and
parameters popover; the same run computing beside a waiting object; a Measure's encoding; a
Grouping's palette with an override; two Paths layered as edge styles with the legend; a node
with the table drawer; the timeline; the toolbar reference sheet at 1600 and 1280; screen 3 in
dark; and the Settings sheet. It also lists the kit additions (the busiest status bar, the dock
handle, the "?" button, the secondary bar, the transport bar).

## 8. What this round adds to the element's list

Beyond `object-model.md` section 11, the feature-fit tables and section 5.7 above, the items
this round depends on, smallest first. "Decision 2" means settled decision 2.

| Item | Size | Needed by |
|---|---|---|
| Double-click expands when a fetcher exists, else selects neighbours | tiny | the Select tool (3.2) |
| `Scope` gains `{edges: EdgeId[]}` and a run-result set kind | small | every edge Set; decision 2 |
| `session.data.neighbours(id, {direction})` returning node ids and edge ids | small | the node's Links tab; the Neighbours bar's count |
| A `{between: {run, field, min, max}}` selection target | small | the histogram band drag (or route it through #192) |
| A `backend` field on `RunRecord` and `CostEstimate` | small | "on the GPU" in Record, the GPU glyph, the popover's cost line |
| A per-start backend override (`backend: "cpu"`) | small | [Retry on the CPU] (4, step 13) |
| A "defined, not started" object; a parameter edit starts a new run that replaces the old under the same object id; the replaced result kept in the journal | small | the waiting state; stale after an edit; undo after a re-run |
| Partial results kept on cancel for sampled runs | small | 4, step 7 |
| `statistics().reading()` on the Dataset; `scope.statistics(spec)` (nodes, edges, inside, cut, density) | small | the Dataset's reading row; a Set's Members rows without touching the selection |
| The window rule for nodes with no time value (inside when an edge is) | small, a doctrine change | 6.1, screen 10 |
| An interval window (`{start, end}` paths or a spells column; overlap test); the time role (#333) names a pair or a spells column | medium | any GEXF dynamic file (6.1) |
| The window excluded from the staleness digest; the window bounds (attribute, from, to) recorded in `Caveats` and `StaleNote` | small | "computed on 2019-01 to 2019-12" as a caveat, never a stale state (6.1) |
| Filters evaluated within a scope | medium | decision 2; until then a rule over connections is a whole-graph rule and says so |
| A top-N scope kind usable as a layer selector | small | the label budget (6.9); decision 2 |
| `LegendBlock` carries width and pattern for a highlight block | small | the legend's Path rows |
| The objects API keeps the history and exposes undo and redo | decision 1; #145 | Ctrl+Z, the History dock |
| The "Overview" View written by the element as a default preset; saved View names namespaced | tiny | 6.2 |
| Saved styles: a layer template without a selector, stored with the objects | small | Style tab overflow (5.6) |
| A `category` (question) on every catalogue entry so a plugin lands in the right flyout | exists (`category`); the mapping is 3.6 | the Structure tool |
| Per-step summaries and change counts for the transport's tick marks | medium | #300 |
| A per-canvas layer visibility for Compare (two renderers, one tree) | large | 6.7, #186 |
| An agreement statistic between two Groupings; a Difference between two Measures | small | 6.7 |
| Registration of k-core and link prediction; #310, #311, #329, #330, #55 | per issue | the Structure and Rank flyouts |
| A parameters form from option descriptors with resolved bounds | small | the parameters popover, #336 |
| Re-mapping weight, label and direction after a load without a re-import | medium | Dataset > Overview and Data (today those rows reopen the import options) |

Nothing in this round asks the app to compute over nodes and edges, sniff a format, resolve a
group into ids, estimate a cost, or copy a catalogue. Every list a panel draws is a catalogue or
a session call; every paint row is a layer on an object the element owns; every "today" word in
section 3 was checked against the element's source by the maintainer's critique and corrected
where it was optimistic.

## 9. Pass 3: what the walkthroughs and the measured audit changed

Two documents beside this one read the round-2 design after it was drawn: `walkthroughs.md`
(a novice's first ten minutes and an analyst's week, click by click, twenty findings) and
`consistency-audit.md` (every mock measured from the DOM against the kit and the Figma study,
thirty findings). This section records what they changed. Each item names the section above it
amends; the mocks in `../mocks/v2/` were regenerated from the amended rules.

### 9.1 Design changes (amend the sections named)

| Change | Amends | Why |
|---|---|---|
| **Categorical wins Colour.** When a Grouping is created while a Measure holds Colour, the Grouping takes Colour and the Measure's Colour block becomes Size (one journal entry, undoable; the Measure's summary row reads "moved to Size for Communities"). A Grouping's own order becomes Colour, Outline, Shape, and a shape encoding says "shape" in the legend | 4 step 9, 5.7 (decision T7) | with the per-kind order alone the picture depended on which of two buttons was pressed first: Groups then Rank gave colours for groups; Rank then Groups gave fourteen communities as fourteen node shapes, which nobody reads as groups |
| **A Group opens on Members.** A Group's tabs are Members, Style, Define, Record (23 characters) | 2.4 Group, 2.5 | the novice's most frequent tree click landed on three read-only rows |
| **A Path can be asked for by name.** The Path bar's "Pick the start node" carries a field ("or type a name") backed by the Ctrl+F node lookup; a selected node pre-fills From, as Neighbours already does; the Set's Define tab "From \| To" fields are the same control. Under Focus the bar states its scope ("among what is showing, 38 nodes") and on no route reads "No route among what is showing  [Search everything]" | 3.3 Path, 3.5 | on a graph larger than the label budget the start node cannot be found by eye; eleven actions per path |
| **Compare's second canvas takes its own mask.** The Compare strip gains "Showing [Same \| a View v]"; a View already stores a time window (6.2), so March beside September is two Views. Nothing toggles eyes; only the mask differs | 6.7 (decision R4 kept) | the temporal question the design's own example asks (workflow W19) could not be drawn under one shared mask |
| **The Import dialog exists on paper**, screen 14: Format detected, a five-row preview, the column roles as selects fed by a new `session.data.peek(file)` (column names, detected types, five rows, the row count) before the load | 2.4 Dataset > Data, 8 | it is the analyst's first minute and the novice's first file, and round 2 had drawn nothing and typed column names by hand |
| **A reload keeps the objects**, screen 15: "Change..." on Direction, "Set as weight" and "Set as label" open a dialog whose default is "Keep and re-run" (the objects API replays every object's definition under the stale rule) and which states what will re-run and the cost; "Remove" is the old behaviour made explicit. When the element re-maps in place (section 8, last row) the dialog loses the reload and keeps the rule | 2.4 Dataset Overview and Data, 8 | a one-word mistake in a column role cost the whole tree, and round 1 had already asked for this twice |
| **A suggestion row runs at once** ("Find groups (G)" under a fresh Dataset), under the cost gate, with the cost in its tooltip; it is a flyout row drawn in the tree | 3.2, screen 2 | a row that names the verb and then asks for Run is a speed bump on the novice's first click |
| **The bar's Run dims while the parameters popover is open**; Enter presses the popover's | 3.5, screen 4 | two live Run buttons at once |
| **A flyout row's tooltip says what a click does** ("Click runs; ... asks first"); a flyout row clicked while the secondary bar is open behaves as the bar's select (chooses, does not run) | 3.2, 3.4 | a novice opening the chevron to look was starting a run |
| **The several-elements tab's first row says what happened** after a double-click: "16 neighbours of node 1 selected" | 2.4 Several elements, 3.2 | the gesture was kept (decision T6); the panel of verbs it opens now explains itself |
| **The Export menu is two groups**: Export image... and Copy image above a divider; data, video, report, styles, bundle, methods text and recipe below | 6.8 | the novice wants one of nine rows |
| **An encoding block's channel name is drawn as a select** with a chevron ("Colour v [ramp]") | 5.2 block header | it was a hidden select, and it is the repair when a channel is taken |
| **The eye's tooltip reads "Stop painting (nothing is hidden)"**, and Set and Group rows carry a Focus glyph beside the eye on hover | 0 (the eye), 2.4 | in the app this frame borrows from, the eye hides; here the verb the novice wants is Focus |
| **The find field's placeholder is "Find an object or a node"** and its second section is headed "Nodes (by label or id)" | 1.5 table (the find glyph) | the magnifier sits in a header that says "Objects" |
| **A time glyph in the status bar's counts** ("2,300 nodes  41,000 edges  over 12 months") opens the transport bar on click, a third door to the timeline | 1.6, 6.1 | the Findings door can sit near the bottom of the Overview tab |
| **Filter > By range on a Measure reads "Create (not yet)"** with #192 in its tooltip while that issue is open; Select works today | 3.4 Filter | a live-drawn button that fails |
| **The objects API names a repeat by what differs**: "Communities (2019-03 to 2019-05)", "Communities (resolution 1.5)", until renamed | 2.4, 6.1 | three rows called "Communities (Louvain)" differing only in Record |
| **Tree multi-select is written down**: Ctrl+click toggles, Shift+click extends, as the legend's swatches already do | 2.4 Several objects | Compare and Combine depended on an unwritten gesture |
| **Tool labels stay 8 px at 40 px buttons**, and the 0 ms tooltip is stated to be the label's readable form; the alternative (9 px at 44 px, a 750 px bar) is recorded as open in `decisions.md` | 3.1 (decision T3) | the labels are below the kit's 11 px minimum and unreadable on a 1366 x 768 laptop at 100 percent; changing the bar's width touches the 1280 fit argument, so it is left as a choice |

### 9.2 Mock and kit changes (the audit's findings, applied in the generator)

| Finding | What was done |
|---|---|
| The primary button's text rendered near-black on the brand fill on every light screen (a kit rule `.k-app button { color: inherit }` outranked `.k-btn`'s white by specificity) | the element-level reset is now `:where(.k-app, .k-ui) :where(button, input)`, which has zero specificity, so every class rule wins; the probe reads white text and zero dark pixels in the Export and Choose a file boxes. The same root cause had made the mode switch's unselected segments primary text; they are secondary now |
| Three label grids in the inspector (52, 68, 96 px labels) | one 68 px label on every paint row, encoding block header, legend preview row and property row; every control on a tab starts at x 1292 (the captioned two-column rows and the chit-led group swatch rows keep their own left edge, as the Figma study's own two-column row does). "Show the largest" became "Largest [8 v]  rest as Other" to fit the grid |
| Tree counts formatted three ways depending on the dataset name's length | the count grammar is one rule (`screens.md` conventions): the root row carries no count, a Set carries one count (nodes for a node Set, edges for an edge Set), a count is never abbreviated, a long name takes the ellipsis, and the technical name is the row's tooltip and the inspector's kind line, never a tree text |
| Three pill-tab variants (inspector strip, dock header, dock handle) | one tab: 24 px tall, 4 px padding, weight 550; the dock handle is a 32 px strip |
| The framing pill said "Fit" on four screens and "100%" on six in the same 2D state, contradicting the status bar | one rule: the pill shows the framing name in 3D and the zoom percentage in 2D, and the status bar's readout mirrors the pill; the generator draws both from one value |
| Five spellings of the node-and-edge pair | "N nodes  M edges" everywhere a pair appears (the welcome list, the summary row, the transport bar), "of" only for a subset; the legend's Path rows carry no counts; screen 7's overflow is "Other" in the tree with "Other (4 more)" as its tooltip and in the legend |
| The frame was 1440 x 900 where the spec said 1600 x 1000 | the spec now says 1440 x 900 and 18 rows of room; 14 remains the budget |
| Screen 1 omitted both left "..." buttons instead of disabling them | drawn disabled; the left panel is one box on all app screens |
| The canvas token was #f0f0f0; the kind line and name were 11/14 and 13/20; the dark selected pill tab was written as #444 | #f5f5f5; 11/16 and 13/22; #383838 |
| `screen-11.html` and `toolbar-reference.html` were byte-identical | the copy is gone; screen 11 is the toolbar reference |
| Values drifted between `screens.md` and the mocks (FloridaState for BrighamYoung, conference 7 for 4, "Tol vibrant 7 colours" for the element's nine-colour palette, "Inherited from" for "From", "Undirected, from file" for "Undirected (file)") | `screens.md` now states the mocks' values, which are the real ones from `football.gml` and the element's palette list |

Not done, and recorded: the group-swatch rows ("[chit] 4  10") keep the chit at the label's
x rather than the control's, because the chit is the row's subject, not its control; the
secondary bar keeps the 300-level shadow; the flyout's left edge is 8 px right of its chevron;
the kit sheet's light `.k-toolbar-secondary` stays because `kit.html` draws it; the 9 px legend
and transport end labels stay (they are captions in the Figma sense, which the kit sets at 9
px); and screen 8's note row is 64 px because the sentence wraps to three lines.

### 9.3 Element work this pass adds (to section 8)

| Item | Size | Needed by |
|---|---|---|
| `session.data.peek(file \| url \| text)`: column names, detected types, five sample rows, the row count, before a load | small | screen 14 |
| A reload that keeps the objects: the objects API records the tree, reloads with the new role and replays every definition under the stale rule, as one undo step | small, on the objects API | screen 15; until in-place re-mapping lands |
| The first-paint rule gains "categorical wins Colour" (a Grouping displaces a Measure's Colour to Size) | small, in the per-kind order rule | 9.1 |
| Repeat naming by what differs (window, parameter) in the objects API | tiny | 9.1 |
| A per-canvas mask for Compare, from a View | part of the second-renderer work (#186, large) | 6.7 |
| Text search for the Path bar's name field | part of the query engine (#149, large) | 9.1 |
| Filter "Create" on a Measure's range | #192 (small) | 9.1 |

## 10. Round 3: the key functions

Round 2 drew the frame and the object model but left many functions the app needs without a
drawn way in. The clearest: after the first load, nothing showed how to open another file.
Round 3 found 99 such gaps (files and projects 8, getting data in 14, editing data 11, history
and errors 6, finding and selecting 15, filters and sets 10, analysis results 16, layout, look,
export and presentation 19) and draws every one: screens 16 to 102, beside screens 1, 13 and 14
redrawn.

The design is `../round-3/revision-round-3.md`, which summarises each area, lists the few new
surfaces (the Export sheet, the scatter-plot panel, the minimap card, the table's Rejected and
Findings tabs, a second Dataset root, two canvas panes), the element work by size and five
decisions for the owner. Its section 5 lists the sections of this file it amends; where they
disagree, round 3 wins. Section 7 above names fifteen screens; the full list is in `screens.md`
under "Round 3".
