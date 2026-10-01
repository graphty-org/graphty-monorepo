# The owner's third review of the refined B skeleton: the studio's answers

The owner reviewed the refined B skeleton again on 2026-09-30, asked ten questions and set the
primary focus of this round: go through every screen, component and interaction, and simplify,
refine, polish and make interaction patterns the same (recorded verbatim in
`../../owner-feedback.md`). This page answers the ten questions in the owner's order. The full
specification they change is `structure-b-refined.md`, now version 3. Every change the
streamlining pass adopted is listed, by screen, in `streamline-3.md`.

How to read the labels:

- **Owner** -- a decision recorded in `owner-feedback.md`. The studio does not reopen it. Two
  were stated in this review: the toolbar carries icons only, with tooltips after a hover delay;
  and "Why this look" is collapsible.
- **Studio decision** -- decided by the design studio, reversible with an edit, with its reason.
- **Open for the owner** -- only the owner can decide it, because it is a one-way door.
- **Needs graphty-element** -- the design depends on something graphty-element does not have yet.
  The project rules forbid building it in the app, so it is filed as an element issue and drawn
  disabled with that mark (spec section 19).

---

## 1. "Why does the edge styling say 'Line 5', 'Arrow head 4'? What do the numbers mean?"

The number counted how many properties in that section the row sets. "Line 5" meant "this row
sets 5 of the Line properties". Nothing on screen said so: the word "properties" existed only in
the screen-reader label. Worse, on the Everything row the same number meant something else, "5
properties not at their default". The Nodes | Edges switch carried the same kind of number
("Nodes 13"), right under a line that counts actual nodes and edges ("77 nodes, 254 edges"), so
it read as 13 nodes.

**Studio decision: every count of properties is removed** -- from section headers, from the
Nodes | Edges switch, and from the Selection row's "Highlight 3". Reason: under the new pattern
(answer 2) a section shows its set properties as lines, so the count only repeated what is
visible, and a bare number beside a noun reads as a quantity. A side of the Nodes | Edges switch
that sets something gets a small dot instead (tooltip "This row sets edge properties"), so a row
that paints only edges is not mistaken for empty. App-wide rule: a bare number counts members or
results, never properties. Figma's Fill, Stroke and Effects headers carry no counts.

## 2. "Many of the values in styling nodes and edges are going to be empty / unset. What's the interaction pattern for that? '+' to add a row, or popovers like Figma?"

Both, each with one job, and no accordions in anything you edit.

graphty-element settles the model: a style layer lists only the properties it sets, and a
property it leaves out means "this layer does not paint it" -- there is no "unset" value to show.
A form full of empty fields would draw a state the element does not have. So **a row lists only
what it sets**.

**Studio decision, the one pattern for the Style tab:**

1. **Sections are always shown and never collapse** (Fill, Shape, Effects, Label, Tooltip on
   nodes; Line, Arrows, Label on edges). A section with nothing set is just its header and a
   **"+"** -- the header is the empty state.
2. **"+" adds a property, even when only one can be added.** If one property is left, "+" adds it
   directly; if several, it opens a short dark menu of them (at most seven, so no search); when
   none are left, the "+" disappears. The new line arrives with its value focused. Reason: one
   gesture for "make this present", the same as Figma's Fill, Stroke and Effects "+".
3. **A set property is one line: name, then value.** Numbers and text are edited in the field
   (drag the name to scrub a number). Colors and choices open their picker. On hover or focus two
   icons appear: **bind** (take the value from data) and **"-"** (remove, with Undo). A bound
   line keeps its bind icon visible, because being bound is its state.
4. **Detail lives in popovers (the owner's lean, and Figma's pattern).** Clicking a value opens
   everything about that value in one light popover beside the inspector: the color popover holds
   hex and opacity as a percent (the separate Opacity lines go); Glow's popover holds its
   strength; Pattern's holds its count, only for patterns that use one; each arrow end's popover
   holds type, size, color and caption. Arrow head and Arrow tail merge into one **Arrows**
   section with two lines, Head and Tail. The label style is one popover from the Label line's
   "Aa" swatch that uses the same rule inside: a preview, the fields this row sets, and a "+"
   (its six tabs go). Turning labels off is a value, not a removal: "-" only stops this row
   supplying words, so labels from a row beneath would still show; Label's "+" offers **Show**, a
   checkbox line that writes graphty-element's "label off" (`enabled: false`) for this row's
   members. Binding opens one **Binding** popover (source,
   scale, palette, values range, "no value", and **Detach**, which keeps the current values as
   fixed ones); the inline binding block that pushed the tab down goes.
5. **Inside a popover only**, an unset field shows its effective value in gray, with its source in
   the tooltip ("Verdana, graphty-element default"); typing sets it.
6. **Popovers apply each change live**; Esc or a click outside closes them and Ctrl+Z undoes. A
   footer button appears only on a popover that creates something (Add palette).
7. **Collapsing is kept only for read-only blocks** ("Why this look", Data tab sections, Notes).

Removed by this: the section counts, accordions in the Style tab, the Style tab's search icon,
the gray inherited lines and their own "+", the always-visible bind button, the inline binding
block and the unbind dialog, the separate Opacity, Glow strength and Pattern count lines, the
second arrow section, and the label popover's tabs. On Everything's edge side, about 20 lines
become 4 section headers and their set lines.

## 3. "The 'Everything' right-hand panel styling is different than 'For the report', even though they are styling the same things?"

You were right: the difference was a code path, not the data. The Style tab had a separate mode
for Everything that filled every property with invented "None" and "Off", collapsed every section
to a summary, dropped the "+" and grayed the whole body.

**Studio decision: that mode is deleted. Everything uses exactly the same Style tab as every
other row.** Its lines are graphty-element's real base style (nodes: shape icosphere, size 1,
color #6366F1; edges: solid line, default width, darkgrey, arrow head normal), drawn as ordinary
set lines; every other property sits behind "+". **And it is editable today.** graphty-element
locks its own default layers on purpose, and its intended way to restyle every node or edge is an
ordinary layer that matches everything. So Everything is the element's defaults plus one such
layer, kept just under every other row: changing a line, or adding one with "+", writes only that
value; "-" on a changed line brings the element's default back. A line still at the element's
default has no "-" (its tooltip says why). So "make every edge thinner" or "label every node" is
done on Everything, as you would expect. The one thing still waiting on graphty-element is
Everything's eye (switching the element's defaults off). No lock icon and no grayed body.

One more thing you saw: "For the report" is a **folder**, and a folder paints nothing itself. Its
inspector now opens with the same Paints line as every row ("Paints nothing itself; each row
inside paints its own members") and lists those rows. The rows inside it (Group 2, Group 8) use
the same Style tab as Everything. The next skeleton draws Everything and Group 2 side by side so
you can check they are one panel.

## 4. "Why add 'show legend' and the camera controls as their own buttons in the top left and top right of the canvas? Why not use the toolbar?"

Version 2's rule let a control onto the toolbar only if it changed what the next canvas click
does. Camera, legend and layout failed that test, so each was given a corner of the canvas. The
rule served the spec, not the reader: the canvas ended up with four floating controls (the Legend
chip, the Camera menu, the layout chip, a "?" button), each drawn differently.

**Studio decision: the canvas carries no controls. The toolbar holds every command that acts on
the canvas as a whole.** The canvas keeps only the drawing, the legend card and state cards.

The toolbar becomes five icon buttons: **Analyze | Layout, View, Legend | Quick actions.**

| Button | Icon | Click | Tooltip |
|---|---|---|---|
| Analyze | flask | opens the catalog popover | Analyze  Shift+A |
| Layout | pause while running; play when paused or settled | pause or resume | Pause layout / Resume layout |
| View | cube in 3D, square in 2D | opens one flyout: Fit 0, Frame selection F; standard views (3D); your views, Save view; Switch to 2D (or 3D)  5, Enter VR, Enter AR | View, or "View: Front" while on a view |
| Legend | list | shows or hides the legend card (pressed while shown) | Legend  L |
| Quick actions | command | opens the palette | Quick actions  Ctrl+K |

Reasons, one per call:

- **Camera folds into View**: 2D/3D and the camera both answer "how am I looking at it", as in
  Figma's zoom-and-view menu. The flyout lists the frequent camera commands first and the modes
  last, as one "Switch to 2D" / "Switch to 3D" line carrying key 5, which toggles the mode without
  opening the flyout. The button's tooltip carries no key: 5 does not open the flyout.
- **Legend gets its own button**: it is a frequent one-key toggle, and its state must be visible at
  rest, before a screenshot or a presentation. The card loses its own X, so the button is its one
  door and its pressed state is always true. It is open by default, remembered per project, and
  nothing opens or closes it automatically.
- **Layout gets a button whose icon is its state**: pausing is wanted mid-motion, in a fixed place,
  in one click. It replaces the layout chip. Re-run layout stays in the canvas menu and Quick
  actions, because a status icon should only pause and resume, never rearrange (a re-run is
  still one undo step in graphty-element).
- **Select is removed**: it was the only pointer tool, always pressed, so with no label it told
  the reader nothing. It returns, with its caret, when graphty-element supports lasso.
- **The "?" button is removed**: the ? key and Help > Keyboard shortcuts open the same panel.
- Removed from the camera list: Reset (Fit and Front cover it), Export image and Record video
  (Export is their home), the words "moved" and "Unsaved view" (one noun, "view").

Round 7 tests first-click recognition of the Layout and View icons, the cost of going icons-only.

## 5. "The toolbar shouldn't have text on it; it should have tooltips shown after an on-hover delay"

**Owner decision, implemented.** Studio decisions on how:

- **One tooltip component for every icon-only control in the app**, not only the toolbar: rail,
  header undo and redo, tree eye and lock, inspector "...", selection bar. It replaces every
  native `title` attribute (the browser sets their delay, they cannot be styled, and they never
  appear for keyboard users).
- **Timing**: 500 ms of hover before the first one; once one has shown, moving to a neighbor
  shows the next at once, for 1 s after the last one hid (Figma and macOS behavior). On keyboard
  focus it shows immediately. Esc dismisses it; the pointer can move onto it without it closing
  (WCAG 1.4.13).
- **Content**: the name, then the key as a key chip: "Analyze  Shift+A". A second line only for
  a disabled reason or a modifier gesture ("Alt-click: show only this row"). Never a sentence and
  never a list of a menu's contents.
- **Touch**: a tap acts; a long press shows the tooltip without acting, and it stays until the
  next tap.
- **Screen readers**: the name is the button's label and the key its `aria-keyshortcuts`; the
  bubble is hidden from speech so nothing is read twice.
- **Removed**: Settings > Appearance > Toolbar labels, the toolbar's labels-hidden state and its
  CSS. The selection bar sitting just above the toolbar follows the same icons-only rule, so the
  two stacked bars do not contradict each other. The headset hand menu keeps text labels: a
  pointing ray has no reliable hover.
- **Rule that keeps it honest**: nothing needed to finish a task lives only in a tooltip. The
  shortcuts panel (?) and Quick actions list every icon by name, so a touch user can find any
  command by its word.

## 6. "The data sidebar is getting rather complex. Are we trying to do too much in too small a space?"

Yes. The 240 px column held five sections (Sources, Filters, Attributes, Versions, Sent and
saved); a source row wrapped to four lines; an attribute row carried six marks and a truncated
second line; and how a column is read could be changed in four places.

**Studio decision: the Data place keeps three sections -- Sources, Filters, Attributes -- one
line per row, and each section adds with a "+" in its header.**

- **Versions leaves**: Version history (project menu) is its one home; a source's inspector links
  to it.
- **Sent and saved leaves**: the export log becomes "Recent exports" in the Export dialog, and the
  usage-data state lives only in Settings > Privacy.
- **Rows are one line**: a source shows its name and counts with the shared out-of-date mark; an
  attribute shows its type glyph, name and role tag. Sparklines, per-file subheads, the paint dot,
  the table icons, the empty "Expression" subhead and the permanent captions go; details live in
  the inspector.
- **Clear graph data** moves to the graph's own "..." menu (it acts on the graph, not the list).
- **The header** uses the same graph switcher row as the Graph place, so two-graph projects switch
  the same way from either place.
- **Each fact about a column has one home.** Structure (which column is the node id, edge start,
  edge end, edge id, positions) is read at load and belongs to the source: it is changed in the
  load dialog, opened by "Edit source..." (replacing "Re-map columns...") or by "Replace with
  file..." (the file picker first, so reusing an analysis on new data stays three steps: the
  command, the file, Load). Interpretation (an attribute's type, and its role: Name, Time, Position)
  belongs to the attribute, changed in its inspector with no reload. The weight role goes: each
  run asks for its weight, and what it means, in the Analyze popover, where graphty-element
  records it.

## 7. "Research Tableau's data loading, joins, etc. Determine how much of their functionality we should copy."

The full research is summarized in spec section 2.4. The key finding: **a graph source already is
a Tableau relationship** -- edge ends point at node ids, fixed by the file format -- so there is
nothing for a reader to model.

| Tableau | Call | Reason |
|---|---|---|
| Data Source page | Adapt, as our one load dialog, for now | Its value is building joins, which graphty-element cannot do; without them a page would hold a dialog's content plus a second copy of Attributes. The dialog grows into a page, by moving its content, on the day the element ships a join. |
| Connect pane (File, URL, Paste) | Copy | the load dialog's three source choices; the start screen's separate URL dialog goes |
| Column roles in the data grid | Copy | the role is chosen under each sample column's header (Cytoscape does the same); six mapping dropdowns go |
| Typed fields | Copy | one glyph and one word per type everywhere: Abc Category, stepped Ordered, # Number, calendar Time |
| Data source filters | Copy (already ours) | they run before anything is computed; the eye is the drawing-only hide |
| Filter written as a sentence | Copy | a step reads [amount] [is at least] [1,000] |
| Refresh, with a warning about lost fields | Copy | before Apply: "region is gone; Community 3 colors from it" |
| Calculated fields | Copy, needs graphty-element | "+" on Attributes; the element removed its expression evaluator on purpose |
| Data Interpreter | Adapt (mostly exists) | graph-io's detection plus the import report; we copy the "Review the results" wording |
| Joins | Adapt to one case, later | "Add columns by key": keep every node, one key, report "matched 2,811 of 3,000". Designed in the spec, needs graphty-element, hidden from the user-test build. Inner joins are filters; full outer joins would create nodes from a non-graph table |
| Relationships (the drawn noodles) | Skip the drawing | replaced by one match line: "9,113 edges; 0 with an unknown end" |
| Unions | Skip as a feature | "Add to this graph" already appends; "only March" is a time filter |
| Dimension and measure | Skip | that split is about aggregation, which a node-link drawing does not do, and "measure" already names a paint row; graph roles replace it |
| Blending, live vs extract, extract filters, pivot, split | Skip | one graph per view; the project always keeps a copy; one filter home; no task asks for them |

Round 7 checks, worded without "join", "source" or "attribute": "make the account names come from
the second file", "amount looks wrong", "only March".

## 8. "How do users set a label on a node to be a field from that node's data source? Can they also set it to be the content of a note or the number of notes?"

**A label from a field works today; it is the ordinary bind gesture.** On any row's Style tab,
Label "+" adds the Text line, already bound to the attribute whose role is **Name** (so labels by
name take one click). Its bind icon opens the From data list: the element's own attributes, then
run results (PageRank, Community), with a filter field. graphty-element supports exactly this
(`node.label` or `edge.label` bound to `data.<field>` or `results.<run>.<field>`). On a "Top 10
by PageRank" set row it labels only the hubs; on the Everything row it labels every node (works
today, see answer 3). The attribute menu also gains **Label by**, beside Color by and Size by,
which adds a row of its own painting every node with a value.

Studio decisions around it:

- The attribute role that was called "label" is renamed **Name**. It is what the app calls a node
  (inspector title, table, search, path results), not text drawn on the canvas; with both called
  "label", people set the role and wait for labels that never appear. Loading a file sets Name and
  draws nothing (styling is left to the user).
- A label shows **one field**. "Name (degree)" needs label templates in graphty-element (filed,
  low priority). A number bound to a label shows unformatted ("0.07541238") until the element can
  format text bindings (filed, higher priority).

**A note's text or note count in a label: designed, not possible today.** graphty-element has no
notes, and a binding can read only an element's data and run results. The From data list ends
with a **Notes** group -- "Note count" (counting notes about that element itself, the same rule as
row note counts) and "Latest note" (first line) -- drawn disabled with one needs-graphty-element
mark. Note count is a number, so it can also drive size or color ("make heavily discussed nodes
bigger"). The app must not copy notes into the element's data to fake it; the element request is
a notes store with a readable `notes.*` path.

## 9. "Can users set notes on edges?"

**Yes.** A note can be about any node, edge, row (group, set, path, measure, run, or another
style-layer row), filter step, or the whole graph -- the targets the conceptual model already
lists. Not note targets: a saved view (its Caption is its note), a folder (app organization, not
a model object -- note the rows inside it), and an attribute or source (a note about what a column
means is a note about the graph).

**Studio decision: one gesture for every target.** Add note (N, or the selection bar, or any
menu) writes about the thing the inspector is showing; with nothing selected, the graph. The note
editor shows the targets as chips with an x to remove one.

Edges cannot be picked on the canvas yet (needs graphty-element), so today an edge is selected
from the table's Edges tab, a path's members, or a node's inspector, and noted from there. To make
the answer visible, one note in the skeleton's Notes place is about the edge "Valjean - Javert",
and every inspector's empty Notes section reads "No notes. Add note (N)".

## 10. "'Why this look' should be collapsible"

**Owner decision, implemented** with the shared collapsible section: the same chevron as every
read-only section, open or closed remembered per kind, and a one-line summary when closed
("PageRank, Degree, Selection, Everything").

Studio decisions with it:

- It lists only the rows that win a property. The inner "3 more rows match but are covered" fold
  is deleted: those rows are exactly the Data tab's Memberships list, which is their one home.
  That keeps one level of disclosure.
- Its tokens use the Style tab's property names (Color, Size, Shape, Width); the Selection line
  shows Color, Size and Opacity instead of "highlight".
- A token opens the same popover its property opens on a Style tab, applied live, headed
  "Valjean only -- writes to Overrides"; the separate token editor with Apply and Cancel goes. An
  Overrides line gets "-" on hover, so a hand edit can be cleared.
- A hidden row shows the tree's eye-off glyph, not the words "hidden row".

---

## The primary focus: simplify, refine, polish, and make patterns the same

Every adopted change is in `streamline-3.md`, grouped by screen with its reason. In short, each
job now has one pattern:

| Job | The one pattern |
|---|---|
| Unset values | a property not set is not drawn; its section's "+" adds it; inside popovers, an unset field shows its effective value in gray |
| Adding | "+" in the header of the list or section it adds to; a new thing gets a default name and opens straight into rename |
| Advanced options | a popover opened from the value; never an accordion in something you edit |
| Read-only blocks | collapsible, with a one-line summary when closed, remembered per kind |
| Editing | numbers and text in the field; colors and choices in a light popover that applies live |
| Commands | dark menus, one line per item; a second line only for why an item is disabled |
| Tooltips | one component: name and key, 500 ms, immediate on focus |
| Rename | double-click or F2 everywhere; a name that cannot change does nothing and says why in its tooltip |
| Delete | acts at once with an Undo notice; only what cannot be undone asks first |
| On and off | the eye means "drawn"; a checkbox means "applies" or membership; switches only in Settings |
| Notices | one notice slot above the lowest bar, one action, gone after 6 s |
| Empty states | one gray line naming what goes here, with the add verb as a link |
| Disabled | grayed, still focusable, reason in the tooltip |
| Design notes | one annotation style, hidden all together for the user-test build |

Roughly 60 controls, states and screens are removed (four canvas controls, path pick mode and its
six states, the All algorithms sheet, five confirmation dialogs, three naming popovers, two Data
sections, five Settings sections, half the export outputs), and nothing is added except the
Layout, View and Legend toolbar buttons, which replace what left the canvas.

---

## Open for the owner

Nothing in this review needs an owner decision. Two items carried from version 2 remain open,
both one-way doors:

1. **Whether notes become part of graphty-element's public session API.** Every note answer above
   (notes in labels, the Notes row's selector, notes on edges persisting in the element) waits on
   it. The studio recommends yes, with one target type covering nodes, edges, sets, runs, filter
   steps and the graph, and a `notes.*` path a style binding can read.
2. **Whether "your name" is per person or per project** (Settings > General), as worded in version 2.

The conceptual model (`../../../framework/conceptual-model.md`, outside the studio's write area)
needs two recorded edits: a saved view's Caption is its note (saved views are not note targets),
and the attribute role "label" is named Name on screen.
