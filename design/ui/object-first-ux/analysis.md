# Analysis: an object-first graphty

What a graphty app looks like when it is organised the way Figma is organised, around the
things you have made, and what that costs. The objects are the results a reader makes from the
data (groups, paths, rankings, filtered sets), not the nodes and edges themselves; the left
panel is a tree of them; the toolbar holds the tools that make them; the right panel shows the
selected one, and its appearance is one of its properties. This document gives the taxonomy,
the interaction model, the visual language and the rules that keep the screen quiet, each tied
to the mock that shows it; then the places where the fit is awkward, with options and a
recommendation for each; then a summary of where every current and proposed capability lands;
then the work graphty-element would need, sized.

It is written for an engineer, not a designer. Every design term is defined the first time it
is used. Files are referenced by path under `/home/apowers/Projects/graphty-monorepo/`. Issue
numbers are open issues in graphty-org/graphty-monorepo, given with their titles. Nothing here
changes code.

The mocks are `design/ui/object-first-ux/mocks/screen-1.png` to `screen-8.png`, viewed through
`mocks/index.html`; their spec is `mocks/screens.md`; the model they draw is
`design/ui/object-first-ux/object-model.md`. The Figma measurements come from
`design/ui/figma/components.md` and `design/ui/figma/tokens/tokens.json`.

## 0. Terms

- **Object**: a row in the left-hand tree. Something the reader made from the data, or the
  data itself. Objects are the only things the inspector edits.
- **Element**: one node or one edge. The material. It can be clicked and read, but its
  appearance is never edited directly; it is edited on an object that contains it.
- **Member**: an element that belongs to an object.
- **Tree**: the left panel's ordered, nested list of objects (Figma's Layers panel).
- **Inspector**: the right panel. It shows the properties of the current selection and nothing
  else; with nothing selected it shows the Dataset.
- **Fill**: Figma's word for a shape's paint, used here for an object's whole appearance: the
  style layer (or layers) that paints its members. Colour, size, outline, label, edge width
  are all "Fill".
- **Channel**: one visual property a Fill can write (node colour, node size, edge width). The
  element lists 40 in `graphty-element/src/catalog/types.ts`.
- **Precedence**: when two objects paint the same channel of the same element, which wins.
- **Style layer** (or **layer**): the element's unit of appearance: a selector (which elements)
  plus fixed values or a value-to-channel binding. Layers form a stack; later wins. In this
  design a reader never sees a layer that is not some object's Fill.
- **Scope**: the elements a tool is allowed to look at when it creates an object.
- **The mask** (what is **showing**): the element's one visibility filter. Elements outside it
  are not drawn. **Focus** sets the mask to one object's members.
- **The eye**: the toggle on a row that stops that object painting. It never hides members.
- **State**: whether an object's members and values are up to date (section 2.6).
- **Reading**: the one- or two-sentence plain-language explanation of what an object means,
  which the element already produces per run.
- **Row**: a 32 px line in a panel with one job. **Section**: a titled group of rows with a
  40 px header. **Paint row**: the 32 px row for one fill (a 14 x 14 colour chit, a value, an
  opacity, an eye, a minus).
- **Tool**: a toolbar verb that creates an object; picking one changes what a canvas click
  does until the object exists, then the tool snaps back to Select. **Flyout**: the dark menu
  behind a tool's chevron listing its variants. **Popover**: a 240 px light panel for a
  control that does not fit in a row. **Secondary bar**: the one-line prompt above the toolbar
  while a tool waits for a canvas click.
- **Dock**: a surface that takes space from the canvas (the data table). **Overlay**: a
  surface that floats over it (the toolbar, the legend).
- **Session API**: graphty-element's screen-free API, `graphty-element/src/session/`. Names
  written `session.xxx` are members of it.
- **Persona**: one of the reader profiles in `design/designloom/personas/`. Two are used here:
  Explorer Elena (a curious novice with no graph vocabulary) and Analyst Alex (a weekly analyst
  who knows Gephi and Tableau).

## 1. The objects

### 1.1 The taxonomy

The owner's split is the taxonomy: **sets** (a collection of elements, painted with one look)
and **measures** (one value per element, painted with a scale). Two kinds in each family, the
Dataset at the root, and Views to the side.

| Family  | Kind         | What it is                                                                                                                                                    | Default Fill                                   | Made by                                                                 |
| ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| root    | **Dataset**  | the loaded data: its nodes, edges, attributes, positions, the layout in force and what is showing                                                             | the element's own default look, locked         | a load                                                                  |
| set     | **Set**      | a named collection of elements: a rule, a path, a neighbourhood, a promoted selection, a spanning network, a cut of a measure, a combination of other objects | one colour                                     | the Filter, Neighbours and Path tools; Ctrl+G; Combine; a Measure's "+" |
| set     | **Group**    | one label of a Grouping                                                                                                                                       | inherited from its Grouping, may be overridden | its Grouping, never on its own                                          |
| measure | **Measure**  | one value per element: a centrality, a score, a numeric column, a formula                                                                                     | a colour ramp or a size scale                  | the Rank tool; Attributes > Colour by / Size by                         |
| measure | **Grouping** | one label per element, which is also a family of Groups: communities, components, steps from a node, a category column                                        | one colour per group                           | the Groups tool; Attributes > Group by                                  |
| aside   | **View**     | a saved camera, view mode (2D, 3D, VR, AR) and mask                                                                                                           | none                                           | the Views "+"                                                           |

**Dataset.** The root row and what the inspector shows when nothing is selected. It answers
"what is loaded and how is it arranged": counts, direction, density, the layout and its
transport (pause, step, re-run), what is showing, the canvas settings, the attribute columns,
the load record and the exports. It cannot be deleted; "Close dataset" clears the whole tree.
Screen 2 (`mocks/screen-2.png`) is the resting state: one tree row "Karate Club", three faint
suggestion rows under it, and the Dataset inspector on the right; every node is the default
grey because nothing was computed unasked.

**Set.** A list of node ids and edge ids under a name, with one look. What made it is its
Definition: a rule (screen 3's "Degree > 8", five nodes with a 2 px outline), a path (screen
5's "Path: 1 -> 34", the row that appears the instant the second pick lands), a cut of a
measure (screen 4's "Top 10 by Bridges", ten nodes outlined, sitting immediately above the
Measure it was cut from), a promoted selection (Ctrl+G), or a combination of two objects
(Union, Intersect, Subtract, Exclude, Figma's boolean operations). A Set's inspector shows its
Definition, its Members (counts, inside and cut edges, the first eight members), its Fill as
paint rows, and its Made by record.

**Group.** One label of a Grouping: a Set in every respect except that it cannot be deleted or
re-scoped on its own (hide it instead; a re-run would bring it back). Screen 3 is a Group
selected: "Group 2", eleven members haloed in gold on the canvas, and a Fill section with two
rows, the orange override above the inherited blue, so the reader can see why orange wins.

**Measure.** One value per element, painted with a scale. Screen 6 (`mocks/screen-6.png`) is
"Influence (PageRank)": every node coloured on a ramp and sized by the same value; the
inspector shows the parameters (damping, iterations, exact), the Values (min, max, mean,
median, a histogram, the top ten) and the encoding (channel, scale, palette, domain, missing,
a second channel). A Measure has no member list because its members are its scope. Screen 3's
"Connections (Degree)" is the other case: its Fill is Size, not Colour, because Colour was
already taken by the Grouping beneath it when it was created.

**Grouping.** A measure whose values are labels, and therefore also a folder: one Group row per
label nested under it. Screen 3's "Communities (Louvain)" carries a four-colour strip as its
chip and four Group rows with swatches; screen 4's "Conference" is the same kind made from an
attribute column. Its inspector shows the group count and modularity, the sizes, the palette
as one chip per group, and "Show the largest N, paint the rest as Other".

**View.** A bookmark: where the reader stood (camera), how they looked (2D, 3D, VR, AR) and
what was showing (the mask). It is not a tree row, holds no members and paints nothing. Every
loaded mock shows one, "Overview", written at the first fit. Views also store encodings in the
requirement files; here they deliberately do not (section 4.4 of
`feature-fit/2-selection.md`), because the encodings are the tree.

The element already types results this way (`ResultShape` in `graphty-element/src/catalog/
types.ts`): node-set, edge-set and path are Sets; node-metric and edge-metric are Measures;
community, layered-grouping and category-table are Groupings. The shapes fact, pair-list and
temporal produce no members and make no row: they are a **Findings** section on the object
they were computed on (density, diameter, a link-prediction pair list with "Open in table").

### 1.2 What is deliberately not an object

- **Nodes and edges.** Material. A node has an inspector (screen 4) but no paint rows; painting
  one creates a one-node Set.
- **Style layers.** A layer is an object's Fill. The element's style stack is the tree,
  linearised (section 2.5).
- **Notes.** Text anchored to an element, an object or a point. They live in the Notes section
  of what they annotate and as markers on the canvas; a heavily annotated case would otherwise
  bury the objects.
- **Tables** of results (pair lists, series, sweeps): a Findings row with "Open in table".
- **Layouts.** One arrangement is in force for the dataset; two cannot both be true. It is the
  Arrangement section of the Dataset.
- **Attribute columns.** Material until used: "Colour by", "Size by", "Group by" or "Filter by"
  on a column makes the object, so a wide table does not put a thousand rows in the tree.
- **The selection.** Transient; Ctrl+G promotes it to a Set.
- **The legend.** A picture of the visible Fills.
- **Exports, camera presets, the assistant, settings.** Things you do, not things you made.

### 1.3 What every object has

A name (rename in place), a kind (never editable), members and a count, a Definition (how it is
made: inputs, parameters, the scope it was computed within), a state, a Fill, an eye, a lock
(no rename, re-run, move, delete or Fill edit; members skipped by canvas picking; still
paints), a Made by record (method, parameters, scope size, engine, time, caveats, and a "?"
that reveals the reading), Notes, and a position in the tree. The tree row shows the name, the
count in secondary text, a state glyph when the state is not current, and a 14 x 14 Fill chip
(a swatch for a Set, a ramp for a Measure, a strip for a Grouping).

## 2. The interaction model

### 2.1 Select, then act

Figma's principle: almost everything starts by selecting a thing, and the right panel then
shows what can be done to it. Here the inspector has exactly three identities: the selected
object (screens 3 and 6), the selected element (screen 4), or the Dataset when nothing is
selected (screens 2, 5, 7). It never changes meaning because of which activity the reader is
in, because there are no activities: the six-activity rail of the current app is gone, and
every activity became an object kind or a section of one.

The one exception, as in Figma, is creation: you cannot select what does not exist, so
creating uses tools.

### 2.2 Creating: the tools

The toolbar, left to right: Select (V), Hand (H), a divider, Filter (F), Neighbours (E), Path
(P), Groups (G), Rank (R), a divider, Note (N), a divider, the mode switch [2D | 3D | VR | AR].
Four tools have a flyout of variants (Filter, Path, Groups, Rank); the flyouts are populated
from the element's algorithm catalogue by result shape, so a plugin algorithm appears in the
right flyout with no app change. Every flyout row shows the plain name, the technical name in
secondary text, and the cost at the right ("instant", "about 4 min") from the element's
estimate.

Every tool has the same contract: what it needs from the canvas, what the secondary bar says
while it needs it, and what it hands back. A tool that hands back an object adds the row,
selects it, shows it in the inspector, and returns to Select.

- **Path** (screen 5): press P, click the start node (a blue ring marks it), the bar above the
  toolbar reads "Pick the end node" with the variant select and Cancel, a dashed line follows
  the pointer, click the end node, and "Path: 1 -> 34" appears at the top of the tree with its
  edges thick and blue. No dialog. This is the drawing-tool feel the paradigm promises.
- **Filter** (screen 7): press F, and a 240 px popover opens above the toolbar with the rule
  fields (here "value = 7"), a live count ("Matches 8 nodes"), and two buttons: Select (a
  transient selection) and Create (a Set). The matches preview as dashed rings on the canvas
  and tinted rows in the table before anything exists.
- **Groups** and **Rank** need nothing from the canvas: they run on the click with default
  parameters. Parameters are rows in the new object's Definition, editable afterwards;
  editing re-runs at once when cheap (a live filter) and marks the object stale with a Re-run
  button when not. The one thing asked for before a run is a node pick, and that is asked on
  the canvas.

The **row appears instantly, always**: in the computing state with a progress ring and Cancel,
or, when the element's cost estimate says the run would take too long to start unasked, in
the waiting state with "Run (about 4 min)" in the row. The cost gate never shows a dialog.
Undo after a creation removes the row and cancels its run.

**Scope is what is showing.** A tool looks at the elements inside the mask and nothing else,
and prints that before the click ("Find groups in what is showing (34 nodes)"). To compute
within an object, Focus on it first; the result then nests under it. Scope never follows the
tree selection silently, so a novice with Group 2 selected who presses Rank does not get six
nodes ranked by surprise.

### 2.3 The inspector

The 240 px right panel on Figma's grid: 16 px padding, two 88 px columns with an 8 px gap and a
24 px icon column; 32 px rows; 40 px section headers at 11 px weight 550; an empty section is
its header with a "+". The sections every object shares, in order:

| Section                   | Answers                                                                                                         | Figma's name for it     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Header                    | what is this: kind word, editable name, state badge, eye, lock, overflow                                        | the selection type row  |
| Definition                | how it is made: inputs (clickable rows for linked objects), parameters, "Within" (the scope), Re-run when stale | Position / Layout       |
| Members, Values or Groups | what it contains                                                                                                | (none)                  |
| Fill                      | how it looks: one paint row per channel written; "+" adds a channel                                             | Fill / Stroke / Effects |
| Findings                  | results with no members computed on this object                                                                 | (none)                  |
| Made by                   | collapsed: the record, caveats, the "?" reading, "Copy as methods text"                                         | (none)                  |
| Export                    | export rows                                                                                                     | Export                  |
| Notes                     | note rows, "+"                                                                                                  | Comments                |

The Dataset inspector (screen 2) has its own sections: Summary, Arrangement, Showing, Canvas,
Attributes, Findings, Made by, Export, Notes. A node's inspector (screen 4) is a report plus
doors: its Attributes, its Values from every Measure and Grouping that covers it, the Sets it
is a Member of (chips), its Neighbours, and Look (which object won each channel: "Colour from
Conference", "Size 2.3 from Bridges", each clickable to the object), then one action row,
"Colour this node...", which creates a one-node Set and opens the picker. That is the
three-click colour change, and the colour is still a style layer on an object.

### 2.4 Selection

There are two selections and the inspector shows whichever changed last: the **object
selection** (tree rows) and the **element selection** (nodes and edges, the element's own,
shared with the canvas, the table, a headset and the assistant). One rule ties them: **picking
a Set or Group row selects its members** (screen 3: the eleven gold halos); picking a Measure,
Grouping or Dataset row clears the element selection, because a ramp has no members to halo.
Clicking a node (screen 4) shows the node and tints every tree row that contains it.

The modifier grammar is identical everywhere: plain replaces, Shift adds, Alt subtracts, Ctrl
toggles. A marquee drag selects on empty canvas in the Select tool (Hand or Space pans). Escape
is a ladder, one rung per press: cancel a pick, close the top overlay, clear the element
selection, clear the object selection, exit Focus. Right-click on a node is a dark menu of
verbs only (Select neighbours, Path from here, Note, Pin, Colour this node...). Hovering a tree
row outlines its members on the canvas and hovering a node highlights the rows of the objects
it belongs to: the two-way hover link.

### 2.5 Precedence: which Fill wins where objects overlap

Elements belong to many objects at once, which Figma never has to deal with. The rule is
Figma's paint order applied per channel:

**For each channel of each element, the visible object nearest the top of the tree whose Fill
writes that channel and whose members include the element wins. Children paint above their
parent. Hidden objects (eye off) do not paint. Below everything is the Dataset's default look.**

Screen 3 shows the child case: Group 2's override row sits above its inherited row, so orange
wins on those eleven nodes and blue stays everywhere else. Screen 6 shows the cover case: the
Measure at the top writes Colour on every node, so the Grouping beneath is fully covered; its
chip dims to 50 percent, its legend block disappears, and its Fill section (one click away)
reads "Covered by Influence on 34 of 34 members". The fix is Figma's: drag the Measure down,
or change its channel. Two objects that write different channels never conflict (screen 3:
Communities colours, Connections sizes), and a new Measure's default Fill avoids a channel a
visible object above it already writes.

The element's style stack is exactly this order linearised: its locked defaults at the bottom,
then the tree from bottom to top with each parent's own layer just below its children's. Every
drag in the tree is a layer move. No reader ever sees a layer list.

### 2.6 States

An object is live: it can be re-run and its inputs can change under it. Figma has nothing like
this, so it is the first place the model departs. Six states, one glyph in the row and one word
in the inspector header:

| State     | Meaning                                                                                       | In the tree row                                                                         |
| --------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| current   | members and values reflect the data and the definition                                        | nothing extra                                                                           |
| computing | a run is in progress                                                                          | a 12 px progress ring replaces the count, filling in as progress                        |
| waiting   | created but not run, because the cost gate said it would take too long to start unasked       | a hollow circle; "not run, about 4 min"; Run and "Approximate instead" in the inspector |
| stale     | the data, the scope or a parameter changed since the last run; the old members and paint stay | a small amber dot; the name dims                                                        |
| failed    | the run threw                                                                                 | a red dot; the error and Retry in the inspector                                         |
| frozen    | an input this object referenced was deleted; members kept as a fixed list                     | a grey snowflake                                                                        |

Stale propagates down only (a stale Grouping makes its Groups stale; a stale scope makes
everything nested in it stale; a stale input makes what links to it stale). A stale object
keeps painting its old values so the picture is never blank. Whether an edit re-runs at once
or marks stale is decided by the cost estimate, not by the object's kind: under one second,
re-run; otherwise stale with a Re-run button carrying the estimate. Caveats (approximate,
sampled, not converged) are not states: one line each in Made by and a "~" before the count.

### 2.7 The eye and Focus

The eye means exactly one thing: this object stops painting. Its members stay on the canvas,
painted by whatever is below. Focus is a separate verb on any Set or Group ("Focus on this"):
it sets the element's one mask to that object's members, hides everything else, scopes every
tool to it, and prints "Focused on Degree > 10: 6 of 34 [Exit]" in the status bar. Keeping the
two apart is what stops the eye on a filter meaning the opposite of the eye on a path.

### 2.8 Undo

Ctrl+Z and Ctrl+Shift+Z with no buttons and no popover, as in Figma. Every object creation,
edit, Fill edit, reorder, rename, delete and data load is one step; a drag or a slider sweep
is one step; camera moves and selection are not steps. Delete asks no confirmation because it
is one Ctrl+Z away, except when children go with it. A History dock (opened from the palette)
later lists the steps.

### 2.9 Keyboard

Tools: V H F E P G R N. Tree chords are Figma's: Ctrl+R rename, Ctrl+] and Ctrl+[ move, Ctrl+
Shift+H hide, Ctrl+Shift+L lock, Ctrl+Alt+U / I / S / X combine, Ctrl+G make a Set from the
selection. Ctrl+F turns the tree header into a search field (objects by name, nodes by label);
Ctrl+K is the palette (every command and flyout item under both names; a sentence that matches
nothing becomes "Ask: ..." to the assistant). Ctrl+A selects every shown node, Ctrl+I inverts,
Tab steps through the selected object's members. Camera: 0 fit, Shift+2 to selection, 1 / 3 /
7 the framings, 5 toggles 2D and 3D. Every tooltip ends with its key chip; a binding that does
not exist is not listed.

## 3. The visual language

Every value below is a measured Figma value from `design/ui/figma/` and is a token in
`mocks/kit.css`.

| Rule               | Value                                                                                                                                                                                                                                             | Figma source                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Panels             | 240 px each side, no top bar, no rail                                                                                                                                                                                                             | UI3 layout, `figma/README.md`                  |
| Rows               | 32 px for lists, tree rows and single-control rows; 40 px section headers; 48 px panel title bars; 50 px for a two-column captioned row                                                                                                           | `components.md`                                |
| Controls           | 24 px tall; tool buttons 32 x 32 in a 48 px toolbar                                                                                                                                                                                               | `components.md` sections 8 to 12               |
| Type               | one body size, 11 px / 16 px, at weight 450 (values, rows, buttons) and 550 (section titles, the selected row); 13 / 22 at 550 for a panel title; 15 / 25 for an empty-state heading; 9 / 14 at 500 for a caption above a field; Inter throughout | `tokens.json` type roles                       |
| Ink                | one ink at three strengths: text, secondary (50 percent), tertiary (30 percent)                                                                                                                                                                   | `tokens.json`                                  |
| Fields             | borderless grey fills (#f5f5f5 light, #383838 dark) with a 1 px accent ring on focus; no bordered inputs                                                                                                                                          | `components.md` section 10                     |
| Surfaces           | panels white (#fff) or #2c2c2c; canvas #f5f5f5 or #1e1e1e; dividers #e6e6e6 or #444                                                                                                                                                               | `tokens.json`                                  |
| Menus and tooltips | always dark (#1e1e1e), radius 13, 32 px items, in both themes; tooltips after 1000 ms cold, overlays open instantly                                                                                                                               | `components.md` sections 13 and 14, `flows.md` |
| Radii              | 2 (chits, checkboxes), 5 (every button, input, select, row highlight), 13 (menus, popovers, the toolbar)                                                                                                                                          | `tokens.json`                                  |
| Accent             | one blue, #0d99ff (dark #0c8ce9), meaning exactly one kind of thing: the live or chosen UI state (the active tool, the selected row's tint, a switch that is on, a focus ring, a picked node, a preview ring) and the one primary button          | `components.md`                                |
| Primary button     | one filled accent button per screen: Share when a graph is loaded, "Choose a file" before                                                                                                                                                         | `figma/header-and-modes/README.md`             |
| Spacing            | 4 / 8 / 16, with 12 only at section bottoms; 16 px side padding in panels                                                                                                                                                                         | `components.md`                                |
| Selection          | a gold halo on the canvas (the element's own), a pale blue tint on the row; children of a selected object take a paler tint                                                                                                                       | `components.md` section 6                      |

**Borders versus whitespace.** Figma separates with whitespace and one hairline per section
bottom; it boxes nothing. The current app has 43 border edges when a graph is loaded against
Figma's 26 (the comparison document counted them). Here every field is a filled shape with no
border, every card is gone, and the only lines are section dividers and the panel edges.

**Dark theme** (screen 8, generated from screen 3 so nothing but tokens can differ): panels and
fields take the dark tokens, the accent shifts one step, menus stay the same dark they already
were, and the data colours (community palette, the override, the gold halo) are unchanged. The
element's default greys become #757575 for nodes and #5a5a5a for edges, and an outline Fill
turns white so it stays visible. Only the element can make that last change, because its two
base layers are locked (graphty-element issue #291, "canvas background does not follow light
and dark theme", and #331, "implement session.catalog.themes()").

## 4. How consistency and restraint are achieved

The comparison document found that graphty's difficulty was not the number of controls (about
the same as Figma's) but four things: most words on screen were the app talking; the sidebars
changed meaning; most features had three or four homes; and the parts were not uniform. The
rules below answer those four, and each mock is held to them.

| Rule                             | What it means                                                                                                          | How the mocks obey it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One home per capability**      | every capability lives in exactly one place; anything else is a shortcut to that place, never a second implementation  | Run an algorithm: the toolbar (the palette and the suggestion rows are shortcuts to the same tool). Export: Share for the whole picture, the object's Export section for that object; two homes because they are two capabilities. Layout: the Dataset's Arrangement section (the status-bar chip mirrors it). Search: Ctrl+F for objects and nodes, Ctrl+K for commands. Every algorithm has exactly one flyout, decided by its result shape. The Structure tool, the Insights cards, the Analyze list and the automatic ranking of the current app are gone |
| **One primary button**           | one filled accent button per screen; everything else is secondary (outlined) or ghost (text)                           | Share on every loaded screen; "Choose a file" on screen 1 while Share is disabled; the Filter popover's Select and Create are both secondary (screen 7); a waiting object's Run is secondary                                                                                                                                                                                                                                                                                                                                                                  |
| **No app-authored text at rest** | at rest the words on screen are the reader's own content (names, values) or the data's; explanations appear on request | Screen 2 carries one sentence of prose ("34 nodes joined by 78 edges in one connected part") and no suggestion cards, no "i" icons, no "Coming" tags; the reading of every result sits behind the Made by "?"; tool tooltips carry one sentence each. The current app's resting right panel has 136 words, Figma's 25                                                                                                                                                                                                                                         |
| **Disclosure on request**        | show a section only when it has content or the reader asks; an empty section is its header with a "+"                  | Made by and Notes are one header each on every screen; Attributes is collapsed on screen 2; the Findings section is omitted when empty; the legend and minimap are off until switched on; there is no placeholder for anything unbuilt                                                                                                                                                                                                                                                                                                                        |
| **Never act unasked**            | after a load the app draws the graph and stops; nothing computes, no panel switches, nothing floats                    | Screen 2: grey nodes, one tree row, the Dataset inspector; degree is not run, no cards appear, the legend is off. A run over the cost gate creates a waiting row rather than starting                                                                                                                                                                                                                                                                                                                                                                         |
| **One row shape**                | every row is 32 px with one job; every control 24 px; one label size                                                   | Every tree row, list row and property row measures 32; every select, button, switch and chit is 24 or 14; one body size at two weights (verified from the DOM in `critique/consistency-audit.md` section 2)                                                                                                                                                                                                                                                                                                                                                   |
| **One meaning for the accent**   | blue always means "the live or chosen UI state"                                                                        | The active tool, the selected row, the picked node (screen 5), the preview rings (screen 7), Share. One place breaks it: the Path object's Fill is specified as the accent, which would paint data with the UI colour (section 5.13)                                                                                                                                                                                                                                                                                                                          |
| **One word for one thing**       | a term means the same thing everywhere; two vocabularies are never printed side by side at rest                        | "Views" means saved views only (the camera framings are zoom-menu commands); rows carry the plain name and the technical name is secondary text in the flyout. Two words for appearance survive ("Fill" on objects, "Look" on a node) and are a finding (section 5.4)                                                                                                                                                                                                                                                                                         |

Where the mocks still fall short of their own rules, measured in `critique/consistency-audit.
md`: four blockers (three typefaces, three layouts of one inspector, a dark screen that was not
its light twin, and shared parts drawn per screen) are fixed as of this document (the
revision note in `mocks/screens.md` says what changed); the remaining majors are the tree count
formatted five ways, the legend card, mode switch and status chip drawn differently on screens
1, 4 and 6, and text said twice on screens 5 and 7 (the secondary bar and the status bar both
say "pick the end node"). They are listed so the next round of mocks closes them; none changes
the design.

## 5. The rough edges

Each is a place where the paradigm fits awkwardly or hides a hard problem, gathered from the
four critiques. Each gives the problem with a concrete case, the options, and a recommendation.

### 5.1 Overlapping membership and precedence

**Problem.** In Figma a pixel belongs to one shape; here node 3 can be in a Group (orange), a
Path (blue, thick edges), a rule Set (outline) and have a size from a Measure. The per-channel
rule (section 2.5) is sound, but the reader sees it only when something surprises them: the
tree order has two exceptions (a parent's Fill sits below its children; a derived object sits
above its input); partial cover has no sign in the tree (the dimmed chip handles only full
cover); the legend's ramp does not say "except 10 nodes"; and "Covered by X on N of M" as
specified is an explain call per member, 60,000 calls on a 10,000-node graph with six objects.

**Options.** (A) Keep per-channel precedence and add one row glyph for "some of my members are
painted by something above me on a channel I write", computed from member masks. (B) Forbid
the same channel twice: grey out a taken channel in the Fill "+" with a note. (C) Top row wins
every channel (Figma's literal rule): rejected, it erases stacking, which is the point of the
tree. (D) Blend on conflict: unreadable.

**Recommendation.** A plus the note from B. The coverage glyph and the "Covered by" count must
come from the element intersecting member masks, not from per-node explain calls; the legend's
ramp block gains a departure line ("10 nodes painted by Path") from the same intersection.

### 5.2 Live objects: staleness

**Problem.** The element marks a run stale for one reason only: the visible set's digest
changed. The model needs stale on a data change (Add data), a parameter edit, a linked input's
re-run (Top 10 must go stale when Bridges is re-run) and a parent's re-run, with propagation
down and along links. The app cannot compute that without owning the tree, which the root
architectural rule forbids. Two follow-ons: after Add data the cheap objects re-run and the
expensive ones stay stale, so the canvas mixes new communities with last week's sizes and new
nodes with no value, and the only signals are dimmed names in the tree; and "re-run at once
under one second" rests on shipped default cost numbers rather than a measurement, so a rule
Set may be live on one machine and stale-with-a-button on another with no visible reason.

**Options.** (A) Hash-derived staleness: each object's definition hashes its inputs (scope
digest, data version, parameter values, the result digests of linked inputs); stale is a
hash mismatch; no propagation walk. (B) A tracked dependency graph walked on every change:
more code, and a missed edge is a silent bug. (C) Everything stale on any data change: honest
and annoying.

**Recommendation.** A, the element's existing philosophy extended to objects. Plus three UI
rules: a status-bar chip "3 stale [Re-run all]" when a data change makes several objects
stale; "Re-run all stale" follows the cost gate (rows over the gate go to waiting and the chip
says so); and a "Live" or "Re-run on Enter" word in a rule Set's Definition until the element
can calibrate itself (issue #146, "session.calibrate() is missing"). When Add data lands while
Focus is on, the status line reads "(6 new nodes hidden)".

### 5.3 Long-running creation

**Problem.** Figma's tools finish in a gesture; betweenness on 50,000 nodes takes minutes.
The waiting state and the in-row progress ring are the right answer, but: a run that blocks the
frame cannot animate a ring or take a Cancel click and reads as a hang; queued runs (six
Measures from Rank > Several...) show a ring that is not computing; cancel throws away a usable
partial sample; and a reader who pressed G and got a hollow circle may not know a second click
is needed.

**Recommendation.** Queue position in the row ("queued, 3rd") and a status-bar chip "Computing
1 of 6 [Cancel all]"; a cancelled sampling run keeps what it has as a caveat ("cancelled at 60
percent of the sample") rather than a seventh state; a frame-blocking run is never started
unasked, shows a static working glyph and "the page will pause for about 8 s"; and the waiting
row's count text is the verb itself, "Run (about 4 min)", so the second click lands where the
first did. On a big graph the flyout face says the cost before the click.

### 5.4 A Measure's Fill is not a colour

**Problem.** "Fill" names three row shapes: a Set's paint row, a Measure's six-row encoding
block (screen 6), and a Group's "Inherited from Communities" line with an override. The
uniformity argument the comparison document made for Figma strains on the Measure. Also: a
Measure row click halos nothing while a Set row click halos members; the Fill "+" on a Grouping
means "add a second channel" while on a Group it means "override the colour"; and every Measure
paints by default, so an analyst comparing five rankings gets Colour, Size, Outline and then
"no fill" chips, one eye click per row to quiet (Gephi's statistics add a column and paint
nothing).

**Options.** (A) Keep "Fill" for everything and accept three shapes. (B) Two section names:
"Fill" on a Set or Group (a colour), "Encoding" on a Measure or Grouping (a scale). (C) Fold a
Measure's encoding into one paint row whose chit is the ramp, with the controls in a popover.

**Recommendation.** B, since the owner's own split is sets and measures and "Encoding" is the
element's own word. Give a Measure row click a transient highlight of its top ten (not a
selection). Never create an object with no picture: batch members past the free channels get
their Encoding with the eye off. Add a "Colour and size" preset to the "+" list so the
two-channel state of screen 6 is one click. Put Values before Definition on a Measure, since
the analyst scrolls past six parameter rows to reach the top ten every time.

### 5.5 A node is not an object

**Problem.** The boldest move: a node has an inspector but no Fill (screen 4). The Figma
reflex, click a thing and look for Fill, fails on the material: the paint door is a text
button at the bottom of Look, and the novice walkthrough found it is also the wrong-sized
door: a reader who wants to recolour the group her node is in gets one orange node and a stray
tree row. Ten recolours make ten one-node rows. And with two selections and one inspector, the
Delete key means "delete the object" after clicking a Group row and "remove this node from the
data" one click later, on a haloed member.

**Options.** (A) Keep the report; move the door to the top of Look and call it "Fill...". (B) A
real Fill section on the node that writes to the smallest Set containing it: fast, and paints
one of three Sets by accident. (C) An automatic "Overrides" Set: rejected, the app would be
deciding structure. (D) "Add to [set v]" on the single-node inspector so the second recolour
joins the first's Set.

**Recommendation.** A and D, plus a second door beside "Fill...": "Colour its group..." when
the node belongs to exactly one Group, since that is what a novice wants nine times in ten.
Keep the Delete rule (it acts on what the inspector shows) with the confirm on the data edit,
and add a "Remove from data..." row to the node's overflow so key and menu say the same words.
Make the first click on a Group's locked inherited swatch create the override and open the
picker, instead of doing nothing.

### 5.6 Edges

**Problem.** Half the material and barely mentioned. Edges cannot be picked (graphty app issue
#319, "no right-click context menu on the canvas", covers the pick event); a node Set cannot
paint its inside edges because no selector says "edges whose both ends are members", so the
community-structure styling every persona wants next has no control; edge objects have no
distinct row icon; there is no selected-edge look.

**Recommendation.** Treat edges exactly as nodes as the target (pick, hover, an edge inspector
with Endpoints, marquee includes edges). Now: an edge row icon, "Edges" as a target selector at
the top of the Filter popover, and the induced-edge selector first in the set-vocabulary work
(section 7). State plainly in the model that until picking lands, edges are reached from a
node's Neighbours rows and the table.

### 5.7 Undo across re-runs

**Problem.** The element replaces a run's result on re-run, so the inverse of a re-run has
nothing to restore; redo of a deleted expensive Measure is a four-minute recompute; undoing a
re-run of Bridges must also undo the re-run of "Top 10 by Bridges" that followed it; one
assistant request may create three objects the reader expects one Ctrl+Z to remove.

**Recommendation.** Keep removed and replaced results in memory for the journal's lifetime so
undo and redo are swaps, and make cause-grouping a rule of the journal (issue #145, "the
session has no notes or journal"): one request, one re-run with its dependants, one slider
sweep, one data load with its re-runs, each one undo step. Say in the UI when an undo will
recompute ("Undo (re-runs 2 objects, about 3 s)"). Focus is an undo step (it re-scopes the
tools); camera and selection are not.

### 5.8 Large graphs

**Problem.** Every mock is 34 or 115 nodes. At 10,000 nodes: components can yield 200 Group
rows; hovering a Grouping row outlines 10,000 members per mouse move; picking a Set row above
the element's 5,000-element selection cap halos a lie; "Covered by" is a pass per member; and
most tools produce a waiting row, so the toolbar feels broken until the reader learns the
second click.

**Recommendation.** Bound Group rows by the element's overflow policy (the largest N as rows,
one collapsed "192 more (Other)" row); degrade the row-to-canvas hover above a member threshold
the element publishes (the node-to-rows half stays); make a large-Set click a soft selection
(the inspector shows the Set, the status bar says "12,000 members (not haloed above 5,000)", no
element selection); coverage from member masks. Before the tree is built, measure three things
on a 20,000-node story: hover outline time over 10,000 members, selection statistics over
12,000, and frame rate during a colour repaint.

### 5.9 3D and XR

**Problem.** The tree, the inspector, the eye and Focus are desk furniture. In 3D the Select
tool's marquee drag collides with orbit; a 3D marquee selects hidden depth; "100%" has no 3D
meaning; in a headset nothing in the model works (no tree, no eye, no Focus, no re-run), and
the element's in-headset UI today is a corner enter button.

**Recommendation.** In 3D a plain drag orbits and Shift-drag draws the marquee, with a "front
only" option; the right header shows the framing name ("Isometric", "Fit") in both modes and
the percentage only in the 2D status bar. Say plainly that VR and AR are viewing modes with no
object editing in this phase, voice-created objects excepted; add a pre-entry choice "Enter VR
showing [Set v]"; name an element-drawn in-headset object list (eyes and Focus) as the target
once the objects API is the element's, which is one more reason it must be.

### 5.10 The assistant

**Problem.** Today the assistant's tools write style layers with no rows and its "clear
styles" deletes every layer, both against the rule that every layer belongs to an object. One
request can create several objects with no batch painting, no single undo, no provenance mark,
no cost-gate awareness, and no knowledge of the tree or of Focus.

**Recommendation.** One request is one undo step and one visual batch (one visible Encoding,
the rest eye off); a small assistant glyph on rows it made, the same glyph in Made by; scoped
as the tools are scoped, with the reply saying so; the element's cost estimate in its tool
loop so a waiting row is reported as waiting; rows named by the element's plain name with the
request in Made by. Do not build a "proposed" state with Accept and Discard: a review step on
every answer is a dialog by another name. The tool vocabulary becomes the session's command
vocabulary (issue #337, "publish the command vocabulary in the ./commands entry point").

### 5.11 A filter does not hide

**Problem.** In every graph tool a reader has used, a filter hides. Here the Filter tool's
Create makes a painted Set and hiding is a second step, Focus, because the eye must mean one
thing on every row. The Genomics and Threat Hunting workflows are two steps where the persona
expects one.

**Recommendation.** A third popover button, "Create and focus": a shortcut to two commands, not
a third kind of filter. The eye keeps its one meaning; the Gephi habit is one click.

### 5.12 Comparing two results

**Problem.** The one place the model has no answer. The analyst's validation habit is to look
at two results together: Louvain at two resolutions, or a Grouping beside a Measure. Compare
mode opens two canvases on one tree with the same eye states, and Views deliberately do not
store eyes, so two objects can only be blink-compared by toggling eyes. There is also no
per-node "changed group" or agreement number between two independent runs.

**Options.** (A) A View may carry eye states, applied visibly on click. (B) Compare takes two
objects rather than two Views: each canvas shows only that object's Fill. (C) A "Difference"
operation between two Measures, and an agreement Finding between two Groupings, in the tree.

**Recommendation.** B for the picture and C for the numbers. B keeps the tree as the one place
appearance lives (nothing toggles eyes behind the reader's back) and needs the same element
work Compare needs anyway (a second renderer on one session, app issue #186). This is a
decision for the owner (`proposal.md`).

### 5.13 Where the accent means data

**Problem.** The Path object's default Fill is specified as the UI accent blue, the only place
the accent would mean data rather than UI state; a path would look like a selection or a pick.

**Recommendation.** Sets take the next unused highlight colour from a highlight palette (blue,
green, orange, then the categorical palette), none of which is #0d99ff. Small.

### 5.14 The first ten minutes

**Problem.** The novice reaches every goal but with three wrong turns: the five creation tools
are unlabelled icons with no shared convention and a one-second tooltip delay each (the one
place she might quit); the reading that would tell her what she just made ("4 groups, clearly
separated") is behind a collapsed section and a "?"; "Share" leads to exports and every other
tool uses that word for a link; the legend is off until switched on; nodes have no labels until
a Measure exists, so picking node 1 and node 34 for a path is guesswork; the row she gets is
named "Communities (Louvain)" after clicking "Find groups".

**Recommendation.** Let the toolbar speak: a text label under each tool icon, or no tooltip
delay on the toolbar only (Figma's icons are thirty years old; "Neighbours" and "Rank" have no
icon). Put the reading on the surface as one secondary line under the object's header. A hover
label on any node. The legend switches itself on with the first Grouping or Measure. Name the
row by the verb clicked with the method in secondary text, and auto-suffix a non-default
parameter ("Communities (Louvain, resolution 1.5)") so two runs are told apart. Rename Share to
Export if link sharing is ruled out for good (two-way door).

### 5.15 Combining a Group with a filter

**Problem.** "People in Group 4 who send more than 200 messages" has two routes and both are
ambiguous. Focus on the Group then Filter by connections computes degree within the mask, so
the answer is the induced subgraph's degree, not the global one, and nothing says which. Two
rows and Combine places the result "immediately above its first input", which for a Group is a
row among the Grouping's children, where nesting is defined to mean "computed within". The
one-line answer (a rule "communities == 4 and degree > 200") waits on the query engine.

**Recommendation.** Print the scope in the popover ("Connections inside Group 4" or "in the
whole graph") and record it in the Definition; a linked object whose first input is a Group is
placed above the Grouping, never inside it; the Filter tool's "By range" attribute list
includes every Measure in the tree, so a threshold on a result has one door.

### 5.16 Data in, data changed, nothing survives

**Problem.** The import dialog types column names into text fields because the element's
option descriptors carry no header list, and shows no rows; a field-role mistake (weight,
label) noticed after the first run can only be fixed by a re-import, and a re-import deletes
the tree; the weekly "same objects on a new file" is export recipe, replace, run recipe across
three menus; and until the project file exists nothing survives a reload.

**Recommendation.** The element returns the header row and a sample so the dialog draws
selects and a preview; "Set as weight" and "Set as label" on the Attributes row menu apply the
stale rule instead of a re-import (reserve re-import for identity changes); a "Keep the objects
and re-run them on the new data" checkbox in the Replace dialog; the objects API first in the
build order, because a weekly analyst who loses everything on reload will not come back.

## 6. The feature-fit review, summarised

Every current and proposed capability of graphty-element and the app was placed in the model,
one table per area, in `design/ui/object-first-ux/feature-fit/`. "Fits" means the model has a
slot and it is the obvious one; "awkward" means it has a slot but a rule bends or a note is
needed; "does not fit" means the paradigm has no honest place for it as stated, and the file
says what replaces it.

| Area (file)                                                           | Fits naturally                                                                                                                                                                                                                                  | Awkward                                                                                                                                                                                                                                                                                                                                            | Does not fit                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Data in and out (`1-data.md`, 59 rows)                                | every load path, formats, the import report, direction, attributes, statistics, screenshots, video along the Views, reports, recipes, the project file as a menu item                                                                           | changing import options after a load (a re-import deletes the tree); Replace versus "keep the objects"; direction as an edit of the root that stales every run; server expansion as a data load; computed attributes as a Measure made outside the toolbar; the render ceiling's "loaded but not drawn"; style presets restricted to the base look | removing or merging nodes (rewrites every Set's membership; next phase); video of a process; a preset that restyles objects; analysing a half-loaded graph; a project file before the element owns the tree                                                                    |
| Selection, filters, sets (`2-selection.md`)                           | picking, the modifier grammar, marquee, relational selection, every filter kind as a Set, Combine, promotion, statistics, text search, the table dock, saved views, the time window, hover and tooltips                                         | a filter that does not hide (5.11); saved filters ordered by precedence not recency; comparing two selections as a new inspector section; pattern search needing a template editor and overlapping matches; views that do not store the selection                                                                                                  | an expansion history stack; data edits from a selection; saved filters in browser storage; views that store encodings; nodes in the palette behind "@"                                                                                                                         |
| Algorithms and results (`3-algorithms.md`)                            | 22 shipped entries and 15 proposed ones, each in one flyout by result shape; the run model (start, watch, cancel, cost, caveats, record, read); plugins with no app change                                                                      | one run making several rows (HITS, a pairing, a cut); a batch against the auto-apply policy; a Set as a parameter (personalised PageRank, removal impact); Neighbours and Steps away as two doors to one walk; sweeps and scenarios as tables of runs; a frame-blocking run's progress                                                             | run-on-load as an app behaviour; scenarios and sweeps as tree rows; painting a pair list as dashed edges; replacing the graph with a projection; per-step re-runs as N stale Measures                                                                                          |
| Layouts (`4-layouts.md`)                                              | every arrangement in the Layout select with its inputs as rows; engine options in a gear popover; transport, seed, weights, cost, GPU, pinning, positions                                                                                       | Pinned as a Set whose members are a state; a scoped layout breaking "one arrangement"; three arrangements that depend on a Grouping in the tree (stale and frozen rules apply); Ring and Spiral wanting an ordering from a Measure; a layout that produces a Set; Views that do not save positions; two controls for one 2D/3D property            | comparing two arrangements side by side (two roots); a per-object arrangement that stays in force                                                                                                                                                                              |
| Styling (`5-styling.md`)                                              | every channel as a Fill row; the stack as the tree; encodings, scales, palettes, domain, missing, overflow; labels, declutter, legend, background; multi-object and node-level painting                                                         | a node Set painting its inside edges; batch coalescing; overflow by shape as two rows; every Set the same blue; the label budget linking the root to an object; "label nodes larger than N"; "Dim the rest" as an object; legend shift-click; themes on a populated tree                                                                           | the element's exclusive highlight and "an authored layer wins" policies (must change, section 7); resolve-to-static as a control; previewing a preset on hover; edge bundling and tapering as a Fill                                                                           |
| Camera, 3D, XR, sharing (`6-camera.md`)                               | view modes, orbit and pan, zoom, framings, presets, follow, minimap in 2D, every capture and export, Present mode                                                                                                                               | Hand versus Select on empty canvas; the zoom readout in 3D; the automatic "Overview" view and drift; Compare opened from a View; a minimap in 3D; XR entry without a sheet; coming back from a headset; "Share" that exports                                                                                                                       | two datasets side by side; view bookmarks that snapshot filters, selection and encodings; the object tree inside a headset; link sharing and collaboration; a separate report-builder screen                                                                                   |
| Assistant, commands, notes, undo, keys, events, persistence (`7-.md`) | the assistant through the palette and a dock, every tool as a command, recipes, notes as records on their anchors, undo with cause grouping, the binding table, every event to a surface, preferences local and graph state in the project file | the assistant's tools written for a layer stack; one palette for commands and questions; a note on an object; callouts as expanded markers; undo that costs minutes; Delete meaning two things; style templates as a layer stack without objects                                                                                                   | drawn highlight shapes with resize handles and z-order; annotations per view; per-annotation fonts; previewing a past state; arrow keys to the nearest neighbour; a "toggle detail panel" key; the guided tour; history as a Python script; the old frame's buttons and badges |

What no object model expresses well, and stays next-phase: data edits (merge duplicates,
collapse a group into a node), a group graph and community evolution (a derived graph), external
enrichment services, pattern search with a template editor, set-level labels and hulls on the
canvas, very large graphs above the unenforced render ceiling, two networks and what-if
scenarios, and metrics per time step.

## 7. What the element would need

The premise of every gap: **the app must not own the tree.** If the app kept nesting, order,
names, states, overrides and links in its own state, a third-party consumer of graphty-element
would get none of it and a project file could not save it, which breaks the root architectural
rule in `CLAUDE.md`. So the paradigm depends on three element changes before anything else,
then two policy changes, then a list of sized gaps. Sizes: small is a day or two in one
module; medium is a week across several modules and their tests; large is a new subsystem or a
change to a published contract. The detail, row by row against the code, is
`critique/feasibility.md`.

### 7.1 The three things nothing can be built without

1. **The query engine attached** (issue #149, "{where} queries and text search throw
   E_UNSUPPORTED everywhere"; large). The session's scope, selection and visibility sources
   for expressions are declared and never supplied, so a rule Set ("Degree > 8") can be painted
   (the style engine compiles its own expression subset) but not counted, selected, focused or
   computed within. Screen 3's "5 nodes" and screen 7's "Matches 8 nodes" both depend on it.
   The fastest route is to lift the style engine's evaluator out and hand it to the three
   sources, then grow it for text search.
2. **One set vocabulary** (medium, a contract change on the published `./session` entry
   point). Today "a set" is spelled three ways with no form all three accept: a scope (for runs
   and counting), a selection target, a visibility filter. So a path cannot become the mask, a
   Group's members cannot be selected (no "run field equals value" target), and a Top N cut
   freezes to ids when promoted instead of staying linked to its run. The unification: the
   scope type gains a filter, a top-N, an above-threshold, a group and the combinators; the
   filter type gains a scope; a layer selector gains a scope, resolving an edge target to the
   induced edges of a node scope. Every resolver exists; this is one dispatcher and a type
   change.
3. **An objects API on the session** (medium to large). The tree as data: id, kind, name,
   parent, order, definition, state, member count, layer ids, links, locked, visible; create,
   move, rename, set visible, set locked, set scope, re-run, remove, focus, "which objects
   contain this node", coverage; an objects-changed event. Built over runs, saved scopes and
   layers so nothing is duplicated (a Set is a saved scope plus layers; a Measure is a run plus
   encoding layers; a Group is a group scope). It keeps the layer order equal to the tree order
   and owns the six states, including the two the run model cannot express: waiting (the run
   API gates and starts in one call) and stale on a parameter, scope or data change (the run's
   stale note covers the visible set only). **The shape of this tree in a saved file (issue
   #301, "no project file to save and reopen a whole session") is the one true one-way door in
   the whole proposal.**

### 7.2 Two element policies that contradict the tree

Both are correct for a layer stack and wrong for a tree, both are small, and both must change
before a second object can exist:

- `graphty-element/src/session/styles/StylesApi.ts`: a highlight is exclusive (every other
  highlight layer is removed first) and always blue, so creating the second Path deletes the
  first and two Sets are indistinguishable. Exclusivity becomes optional and off for the
  objects API; the highlight colour cycles per Set.
- `graphty-element/src/session/styles/autoApply.ts`: "a layer somebody wrote by hand wins",
  so a run's suggested Fill is dropped when an authored layer holds the channel, and a new
  Measure would appear with no picture. The suggestion picks the first channel no visible
  object above writes (Colour, then Size, then Outline) and never drops itself.

### 7.3 Everything else, sized

| Gap                                                                                                                                                                                                           | Screens    | Size                    | Issue                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------- | ---------------------------------------------------------------------------- |
| Editing a run's parameters in place: run ids are derived from the parameters, so an edit is a new run whose layers, name and links must be re-bound (or the id stops being a pure function of its parameters) | 6          | medium, a decision      | new                                                                          |
| A per-node neighbour listing with edge records; an edge listing                                                                                                                                               | 4, 7       | small                   | #297 "no getEdges() and no API to update node or edge attributes"            |
| Selection statistics over any scope, not only the live selection (which is capped at 5,000)                                                                                                                   | 3          | small                   | new                                                                          |
| Coverage counts from member masks                                                                                                                                                                             | 3, 4, 6    | small                   | new                                                                          |
| A paged, sorted, filtered row source over a scope with result and membership columns (the table dock at 200,000 rows)                                                                                         | 7          | medium                  | new; app issues #168, #170 are the symptoms                                  |
| Distinct values with counts for a category column                                                                                                                                                             | 7          | small                   | new                                                                          |
| An element-owned hover layer (the two-way hover link)                                                                                                                                                         | 3, 5       | medium                  | new (designloom `hover-highlight`)                                           |
| The layout transport (pause, step, state, a layout-changed event)                                                                                                                                             | 2          | medium                  | #144 "the session has no layout API, no positions verbs and no layout event" |
| Marquee: a screen rectangle or frustum slab to a selection                                                                                                                                                    | all        | medium                  | new                                                                          |
| Canvas picking that skips a lock mask; a context-menu pick event; edge picking                                                                                                                                | 3, 4       | small; small; medium    | new; #319                                                                    |
| A zoom percentage in 2D and "which framing" in 3D on the camera state                                                                                                                                         | 1, 2       | small                   | with #290 "no wheel zoom or pan in 3D"                                       |
| A Dataset reading sentence, to keep one voice with the per-run readings                                                                                                                                       | 2          | small                   | new                                                                          |
| Group names and stable identity across re-runs (largest-overlap matching)                                                                                                                                     | 3          | medium                  | #191 "community groups have numbers but no names"                            |
| Weights and direction as options on every algorithm                                                                                                                                                           | 6          | medium                  | #313                                                                         |
| Option bounds resolved for a form                                                                                                                                                                             | 2, 6       | small                   | #336                                                                         |
| Data exporters behind the catalogue (graph-io has them); run serialisers for methods text                                                                                                                     | 2, 3, 6    | medium; small           | new; app #177                                                                |
| The legend drawn by the element and into captures; a minimap                                                                                                                                                  | 3, 4, 6    | medium each             | #292, #293                                                                   |
| A theme-following background and dark base greys                                                                                                                                                              | 8          | small                   | #291, #331                                                                   |
| Time role, type role, playback                                                                                                                                                                                | 2, 7       | medium                  | #333, #299, #300                                                             |
| Cancellable loads with a real percentage                                                                                                                                                                      | 2          | small                   | #296                                                                         |
| A node marker channel (note markers)                                                                                                                                                                          | 2          | medium                  | #295                                                                         |
| Notes and the journal (undo inverses, recipes, history)                                                                                                                                                       | all        | large                   | #145                                                                         |
| Commands as data (the assistant's tools, recipes, the palette)                                                                                                                                                | all        | large                   | #337                                                                         |
| A second renderer on one session (Compare)                                                                                                                                                                    | none drawn | large                   | app #186                                                                     |
| The project file carrying the tree                                                                                                                                                                            | all        | large, the one-way door | #301                                                                         |

Nothing in the model requires the app to compute over nodes and edges, sniff a format, walk
neighbours, count components, estimate a cost, or copy a catalogue: every list a panel draws is
a catalogue or a session call, and every Fill is a layer. The places where a mock quietly
assumed otherwise (the live match count, the Group halo, the neighbour rows, the coverage
count, the table's sort) are exactly the rows in the table above.

## 8. Round 2

Sections 0 to 7 are round 1 as written; this section records what the second round changed
and why, so a reader of this file alone knows where the design now stands. The round-2
material is in `round-2/`: `revision.md` (the design, point by point), `screens.md` (fifteen
screen specs), `decisions.md` (every choice with its reason and whether it is reversible),
`coverage.md` (every inventory capability placed), `answers.md` (the owner's feedback answered
one by one), `critique-novice.md`, `critique-maintainer.md`, `walkthroughs.md` and
`consistency-audit.md` (the two critiques and the two audits that shaped it). The current
mocks are `mocks/v2/screen-1.png` to `screen-15.png`, generated from one spec per screen by
`tmp/object-first/gen/`; `mocks/screen-1.png` to `screen-8.png` are round 1, kept for history.

### 8.1 What changed, and why

**The frame** (round 1 section 3; `revision.md` section 1). The round-1 mocks drew a hamburger
glyph and no rail while citing a Figma editor that has a rail; the current app has one too.
Both frames were argued from the rows each rail item would hold. Only the tree is a panel that
replaces nothing; Table, Assistant and History need the tree beside them (a table row must halo
its node; a history row must outline its object) so they are docks under either frame; Views
is a short list; Layout is five to eleven rows and a property of the Dataset; camera is nine
commands. So: no rail, the dataset name and chevron as the file menu, the Views list above the
tree, one bottom dock whose tab strip stays as a 32 px handle, a "?" in the status bar, and a
status-bar priority order for the nine items that can be true at once. The word "Fill"
became "Style" (the owner's word), "Definition" became "Define", and "Domain" and "Range"
became "Values from / to" and "Sizes from / to".

**The inspector** (round 1 sections 2.3 and 5.4; `revision.md` section 2). Round 1's Dataset
panel was 31 rows and its Measure 34, with the rarely edited rows above the commonly read
ones. Figma's Design and Prototype pair shows the fix: a tab is a job, the header never
scrolls, and the last tab per kind is remembered. Each kind now has a 144 px header block
(kind, name, chip, count, state, the reading sentence with its "?", the tab strip) and three
or four tabs, never five, whose names total at most 27 characters because that is what fits
216 px at 11 px; no tab exceeds 14 rows, which is what a 1366 x 768 laptop shows under the
header. The five-tab suggestion (data, node style, edge style, group style, overview) is
folded in: node, edge and group style are one Style tab with NODES and EDGES sections on every
kind, so a Path's edge rows are never one tab from its node rows. A node's first tab is about
the node; a Group opens on Members.

**The toolbar and running an algorithm** (round 1 sections 2.2 and 5.3; `revision.md` 3 and
4). Round 1 had Groups, Rank and Structure running on the first click while Path and
Neighbours waited. Now every creation tool arms and shows a secondary bar ("Rank by [Bridges
v] on what is showing, 115 nodes, about 2 s [Options] [Run] Cancel"), so scope and cost are
read before anything runs; the parameters popover opens from Options or a flyout row's "...";
Alt+click is gone. The bar is 725 px with 40 px labelled buttons, which is why it fits the
800 px canvas of a 1280 px window. A Structure tool holds the skeleton algorithms (components,
k-core, bridges, spanning networks, eccentricity, distances, link prediction); the flyout is
chosen by the question the algorithm answers and a plugin lands by its catalogue category.
Section 4 of `revision.md` walks a run through every state with what appears where.

**Styling** (round 1 sections 2.5, 5.1, 5.4, 5.6; `revision.md` 5). One grammar on every
Style tab. A Measure's encoding block is specified row by row (scale by plain name, palette,
values from and to, reset, reverse, clamp at p2 and p98, midpoint, missing, sizes from and
to, legend preview) as an accordion. A Grouping's Colour block holds the palette, the swatch
rows, Other, Overflow and Largest; a Group's override is a layer directly above the
Grouping's, marked by a dot, removable. Paths are edge style layers that stack, with a
per-channel rule on shared edges, a disjoint highlight palette and width and pattern in the
legend. The first paint takes the first free channel in a per-kind order and, since pass 3,
categorical wins Colour, so the picture does not depend on run order. Looks, saved styles and
palettes are three things with one home each.

**Everything round 1 ignored** (`revision.md` 6). The timeline is a transport bar with its
settings in a gear, three doors, a window that masks and never stales, nodes following their
edges, and an interval model for GEXF spells. Saved Views, video export along the Views list,
XR entry from the mode switch, the assistant making objects as one undo step, notes and
markers, Compare taking two objects (each canvas with its own View as mask), the Export menu
in two groups, labels and declutter, palettes and the legend, acceleration status, and a
Settings sheet for the eleven preference capabilities. `coverage.md` places all 341 inventory
rows: 312 natural, 22 awkward with a repair each, 2 that do not fit, 5 unplaced with proposed
homes.

**Two dialogs** (screens 14 and 15). The Import dialog with a five-row preview and column
roles as selects fed by a new `session.data.peek`; and the reload that keeps the objects when
a column role is changed after the first runs, which replays every object's definition under
the stale rule. Both answer blockers the analyst walkthrough found twice (round 1 and round 2).

**The mocks themselves.** Round 1's screens were hand-built and the audit found per-screen
copies of shared parts. Round 2's are generated from one spec per screen by one renderer, so
the file header, the section headers, the framing pill, Export, the toolbar, the dock handle
and the status bar sit at the same pixel on every screen. The measured audit's blocker (the
primary button's text rendering near-black on the brand fill, a CSS specificity fault in the
kit) and its majors (three label grids, three pill-tab variants, two framing readouts, five
spellings of the node-and-edge pair, tree counts that depended on the dataset name's length)
are fixed in the kit and the generator; the audit's probe now reads white text and zero dark
pixels, and every control on a tab starts at one x.

### 8.2 The settled decisions

Given by the owner: the element owns the tree (with undo), one set vocabulary (plus an
edge-list scope and a run-result set), highlights are not exclusive. Decided in
`round-2/decisions.md` with reasons: round 1's questions 3 to 13 (the edited run replaces the
old under the same object id; Compare takes two objects; "Style"; batch members eye-off;
labelled tools; "Export"; "Create and focus"; the analyst's build order; nodes are material; a
headset is a viewer; label matching now), the frame (no rail, the handle, the "?", the status
priority, the legend's place), the inspector (the tab sets and names, the 14-row budget, the
header block, a node's About tab, one Export row per object, the tab memory guard), the
toolbar (arming, initial faces, 40 px buttons, kind icons in flyouts, Structure's contents,
double-click, the per-kind first paint, batch eye-off, a backend field, the waiting state),
styling (one grammar, an outline for path nodes, the disjoint palette, legend width and
pattern, the label budget as a top-N layer, themes restricted to match-everything layers), the
timeline (never stale, two doors, nodes follow edges, the interval form, whole-graph rules say
so, non-overlapping steps), views and the rest (neighbours API, the between target, View
namespacing, Compare, Settings, progressive loading out of scope), and pass 3's eleven
(categorical wins Colour, a Group opens on Members, a Path by name, Compare's second mask, the
Import dialog, the reload that keeps objects, suggestion rows run at once, the small doors,
the count grammar, the one label grid and tab, the tool-label size left open).

### 8.3 The open decisions

Each is one-way once built or a measured trade-off; each has a recommendation in
`proposal.md` section 5: the first-paint rule as element behaviour (yes), nodes follow edges
under a window (yes), the window never stales (yes), batch eye-off replacing coalescing (yes),
the new API members listed in `revision.md` section 8 (yes, each small), the waiting state and
replace-on-edit semantics (yes), and the tool-label size (keep 40 px, test both).

### 8.4 The element work, updated

Section 7 above stands for round 1's list. Round 2 adds, from `revision.md` 5.7, 8 and 9.3:
the edge-list and run-result scope kinds (small); `data.neighbours`, `data.peek`,
`statistics().reading()`, `scope.statistics`, a `{between}` target, a `backend` field with a
per-start override, partial results on cancel, the waiting state and replace-on-edit (small
each); the window's three changes (nodes follow edges, small; excluded from staleness with
bounds in caveats, small; the interval form, medium); filters within a scope (medium); a
top-N selector (small); legend width and pattern (small); undo and redo on the objects API
(with #145); the "Overview" View as a default preset (tiny); saved styles (small); per-step
summaries (medium, #300); a per-canvas mask for Compare (part of #186, large); an agreement
statistic and a Difference (small); registration of k-core and link prediction and the
algorithm issues (per issue); a parameters form from descriptors (small, #336); re-mapping
roles without a re-import (medium); the first-paint rule with categorical wins Colour (small);
batch eye-off (small); coverage from member masks (small); `encodeAttribute` (small); themes
restricted to match-everything layers (medium); the element-drawn legend (medium, #292);
exclusive highlights opt-in and the disjoint highlight palette (small); a layer selector by
scope with induced edges (small to medium). Nothing asks the app to compute over nodes and
edges, sniff a format, resolve a group, estimate a cost or copy a catalogue.

### 8.5 Rough edges that remain

- Tool labels at 8 px are below the kit's 11 px minimum; the 0 ms tooltip is the readable
  label until the size is chosen.
- The Path bar's typed name, the Import preview and Compare's second mask all rest on the
  largest element items (the query engine, the second renderer); they are drawn so the target
  is fixed, not because they are near.
- Group identity across re-runs is by label; overrides and names may not follow, and the
  Record tab says so.
- Two results from one run (Best pairing, Most that can flow) are one object with the second
  shape reachable from it; `coverage.md` section 13 has the shape, and it is not drawn.
- The group-swatch rows are the one inspector row whose chit sits at the label's x; the
  secondary bar's shadow, the flyout's 8 px offset from its chevron and the 9 px legend and
  transport captions are recorded and left.
- Scale is unmeasured (34, 115 and 412 nodes on the mocks); the round-1 prototypes in
  `proposal.md` section 3 still come first.

## 9. Round 3

### 9.1 What was missing

A review of round 2 against everything the app must do to work (data in and out, saving and
reopening, undo, finding, moving around, selecting, settings, errors, large data) and every
analysis and drawing feature found 99 functions with no drawn entry point or no drawn main
state. The count by area: files and projects 8, getting data in 14, editing data 11, history
and errors 6, finding and selecting 15, filters and sets 10, analysis results 16, layout, look,
export and presentation 19. The register, with each gap's source, is `round-3/gaps.md`.

The pattern behind most of them: round 2 drew each object's first state and its tab strip, but
not what a tab, a menu or a failure opens. A tab label, a closed "+" or a menu row named in text
is not a design; the reader cannot find a function whose door is never drawn open.

### 9.2 What resolves it

Screens 16 to 102 draw every gap's entry point and main state, using the homes round 2 already
had wherever they fit: menus drop from their controls, dialogs reuse the one dialog, results
land on their object's tabs, tables and charts wider than the inspector go to the dock. The
model did not change: every new function is a verb on an object that exists (a Dataset, a Set,
a Measure, a Grouping, a node) or a new tab of the table. The new surfaces are few and each has
a reason (`round-3/revision-round-3.md` section 4). Several round-2 conflicts were settled on
the way: one key set (F2 renames, because Ctrl+R reloads the page; Ctrl+I inverts, because
Ctrl+Shift+I opens the browser's tools), one home for over-time charts (the dock), and
right-click showing the same list as the inspector's "...".

### 9.3 Element work

The work is listed by size in `round-3/revision-round-3.md` section 6. The largest items are
the project document (#301), several datasets per session, collapsed group rendering, the
second renderer (#186), pattern matching and subset loading. None of it asks the app to compute
over nodes and edges: every count a dialog shows is a dry run the element answers, every list a
select shows is a catalogue.

### 9.4 Decisions for the owner

Five, in `proposal.md` section 6: the project file format and the recipe format (one-way:
published formats), the new public session calls reviewed in one pass (one-way: published
API), whether two live datasets in one session are built or only combining two files (costly
to undo), and the 50 MB autosave limit (reversible).

### 9.5 Rough edges that remain

- The mocks still draw a second moment of a screen as a tagged inset or menu on the same frame;
  a click-through prototype would show the sequence better.
- Scale is still unmeasured: the largest drawn graph has 1,204 nodes; screens 29 and 30 describe
  the 350,000-node case over a stand-in drawing.
- Several functions depend on element work that has no issue yet (pattern matching, summary
  graphs, a keyboard navigation mode); they are drawn so the target is fixed, not because they
  are near.
