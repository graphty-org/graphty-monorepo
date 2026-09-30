# The owner's review of the refined B skeleton: the studio's answers

The owner reviewed the clickable refined B skeleton on 2026-09-30 and asked eleven questions
(recorded verbatim in `../../owner-feedback.md`). This page answers them in the owner's order.
The full specification they change is `structure-b-refined.md`, now version 2.

How to read the labels:

- **Owner** -- a decision recorded in `owner-feedback.md`. The studio does not reopen it.
- **Studio decision** -- decided by the design studio, reversible with an edit, with its reason.
- **Open for the owner** -- something only the owner can decide, usually because it is a one-way
  door (a public graphty-element API, a data format).
- **Needs graphty-element** -- a capability the design depends on that graphty-element does not
  have yet. The project rules forbid building it in the app, so it is filed as an element issue
  and the skeleton draws it disabled with that mark. Section 19 of the spec lists every one.

One rule of the owner's, stated in this review, runs through several answers: **styling should be
unopinionated and left to the user.** The studio reads it as: the app adds no look of its own.
Every paint on the canvas is either a row in the tree the user can see, restyle, hide or delete,
or an element setting the user can change. The only looks that arrive without the user asking
are the element's own defaults (shown and editable as the Everything row) and a run's suggested
style (the owner decided runs paint when they finish).

---

## 1. "When I click on the 'Everything' layer, it only has some of the styling options"

**Studio decision: every row that paints gets one Style tab, generated from graphty-element's
own list of paintable properties. A row shows only the properties it sets; every other property
is one click away behind a "+" on its section. Complex values open in popovers, so no row is ever
longer than one line per property it sets.**

What the element offers: 35 style properties (13 for nodes, 22 for edges), published with a plain
name, a value type, a range and allowed values (`channelsFor('node' | 'edge')`). Every label-like
property also takes a 47-field label style. The skeleton hand-typed 7 of the 35 on Everything, a
different 7 on a group row and 6 on the node inspector, and three of the values it showed are not
element values ("Circle" as a shape, arrows locked off on an undirected graph, a "label count"
budget).

How the Style tab is organized (the same component on every painting row):

1. **Nodes | Edges switch** at the top, each side with a count of what it sets ("Nodes 3 |
   Edges 1"). An element style layer targets nodes or edges, never both, so the switch mirrors
   the model and halves the list. A row that paints only edges shows no switch.
2. **Sections in a fixed order.** Nodes: Fill, Shape, Effects (outline, glow, wireframe, flat
   shading), Label, Tooltip. Edges: Line (color, width, opacity, pattern, pattern count, curve,
   flow speed), Arrow head, Arrow tail, Label. A section with nothing set collapses to its header
   and a "+". A collapsed section that holds values shows them as a one-line summary ("Dash,
   2 px, curved").
3. **One line per property**, 24 px high: name, value control, a **bind** button (Figma's
   variable-binding icon), and "-" to remove it. Bind turns the value into an attribute or run
   result, and the line expands in place to scale, domain, palette and "no value". Any property
   can be bound, not only color and size. A measure row is then just a row whose Color line is
   bound; its separate encoding panel goes.
4. **Unset properties show what they inherit**, in secondary text with a small link glyph whose
   tooltip names the row it comes from ("icosphere, from Everything"). Removing a property
   returns it to inherited.
5. **The 47 label-style fields open in a popover** from the Label line's "Aa" swatch (drawn with
   the label's own font and panel), with tabs Text, Panel, Placement, Pointer, Effects, Badge.
   One popover serves node label, node tooltip, edge label and both arrow captions.
6. **Search**: a search icon in the Style tab header opens a filter field that finds properties
   set or unset; each "+" menu also filters as you type. There is no always-visible search line,
   because the tab is mostly empty by design.
7. **Enum pickers use the element's lists** with small preview glyphs: 25 node shapes (names in
   the field, 32 px thumbnails in the open list), 14 arrow types, 9 line patterns.

**The Everything row itself.** The owner decided that Everything "draws the default style;
hiding it shows only what other layers show". The element's defaults live in two locked element
layers ("Node defaults", "Edge defaults"). So Everything **is** those two layers shown as one
row, not a user layer stacked above them: a user layer above them could be hidden and the
defaults would still paint, which breaks the owner's decision. Its Style tab shows every property
the defaults set, with all sections collapsed to their summaries. Editing and hiding it needs
graphty-element to let a consumer edit and switch off its base layers (the element parses an
`addDefaultStyle` flag and never reads it). Until then the row is drawn with a "needs
graphty-element" mark. Copying the default values into an app layer is forbidden (it copies
element constants).

**Removed, because the element cannot draw them or the app invented them:**
"Circle" (the list comes from the element; the default is icosphere); the "up to N names in
view" label budget (replaced by the element's label declutter switch, a setting in the graph's Canvas section,
section 5.3 of the spec); arrows disabled on undirected graphs (the element draws arrows on any
graph); opacity on a whole layer (a layer has none; node and edge opacity are properties); the
app's grayscale computation for the Print look (the Print look itself stays, see below); the
Selection row's outline width, two-color bands and "Dim everything else".

**Also moved off the Everything row:** the canvas background (color or 360-degree skybox). It is
element configuration, not a layer, so it goes to the graph's own inspector (nothing selected),
in a **Canvas** section, with label declutter and "reframe when data changes". This is where
Figma shows page color.

**The Print look stays (owner decision: the Print look keeps a grayscale check).** It becomes a
style document the user applies, and it needs graphty-element: the element has no shipped looks
(issue #331) and no grayscale or color-blind check. The skeleton shows Look on the Everything
row with that mark.

Precedents: Figma's Fill, Stroke and Effects sections with "+"; Figma's variable binding;
Tableau's Marks card (any field onto any channel); Cytoscape's Style panel is the counter-example
(complete, but every property always listed as a long table).

Needs graphty-element: a `section` and `order` field on each property descriptor (the app would
otherwise hard-code the section list; until the issue lands, the list carries a comment naming it
and a "More" section catches any property it does not know); full descriptors for the 47 label
fields (today only their names are published); editable and hideable base layers.

---

## 2. "Renaming a row should be double clicking on it, like in figma"

**Studio decision: yes, exactly as Figma's layers panel does it, and everywhere a name appears.**

- The first click selects the row and shows it in the inspector. Double-clicking the **name**
  turns it into a text field with the text selected. Enter or clicking away saves, Esc cancels,
  an empty name puts the old one back. **Tab** saves and moves to renaming the next row (Shift+Tab
  the previous), so twelve communities can be named in one pass. Each rename is one undo step.
- **F2** renames the focused row from the keyboard. Figma's Cmd+R is not used: Ctrl+R reloads a
  browser tab. Enter still opens the inspector.
- Double-clicking the eye, the disclosure arrow, the swatch, the count or the note badge does
  what a single click there does.
- Selecting a row never moves keyboard focus into the inspector, so the second click and F2 land
  on the row. After a rename, focus returns to the row and a screen reader hears "Renamed to X".
- Touch: double-tap renames, long-press opens the row menu.
- Duplicate names are allowed. Names are labels; the element keys rows by id.
- **Right-click > Rename stays** as the discoverable and screen-reader route to the same command.
  It is a door, not a second home (see answer 9).
- The same gesture renames the project name in the top bar, graphs in the Graphs switcher (its
  pencil buttons go), folders and a Combine result (its Rename button goes); saved views take it
  once graphty-element can rename a camera preset. A
  measure row's separate "Legend label" field goes: the row's name is its legend title.
- Everything, Selection and Notes are built in and keep their names. Double-click does nothing
  there; F2 announces "Built-in rows keep their names".

What each rename writes: a style layer's name (`styles.update(id, {name})`) and a set's name
(`sets.rename`) exist today. **Needs graphty-element:** renaming a run (no rename verb; `label`
is read-only), naming one group of a run such as "Community 3" in a way that survives a rerun
(the element renumbers groups and stores no per-group label), and a display name for an
attribute. Until those land, a run's rename is shown disabled with the reason, and double-clicking
a group of a run offers "Keep as a set to name it". The app keeps no name table of its own.

---

## 3. "Shouldn't Add data and Paste data be under the data tab? ... should the data nav link become the equivalent of Tableau's 'Data Sources'?"

**Studio decision: yes to both, within what graphty-element can do. Data > Sources becomes the
one home for bringing data into a graph. It takes Tableau's data-source model where the element
backs it and shows the rest as element gaps.**

What changes:

- **File loses Add data and Paste data.** File keeps project verbs only: New project, Open...,
  Open recent, Save, Save as..., Export..., Apply recipe or style file....
- **The Data header names its graph** ("Data: Co-appearances"), because filters, attributes and
  sources belong to one graph.
- **Sources header "+" menu:** File... (one file, or a node file and an edge file together, which
  the element loads as one paired load), From a URL... (the element's `loadFromUrl`, with
  retries; the skeleton had no URL door at all), Paste... (the element parses text and detects
  its format), and **Table matched by key...** drawn with "needs graphty-element" (the element
  has no join).
- **The load dialog ends with one question: "Load into: this graph (add) / replace this graph /
  a new graph".** The first two are the element's `replace` flag; the third creates another
  element instance, which is app chrome. It defaults to the door it was opened from, and asks when
  the entry was a drop or Ctrl+V (Gephi's import ends the same way). "Add as another graph..."
  leaves the Graphs switcher.
- **Each source row's menu:** Replace data... (a file source) or Refresh (a URL source), both the
  element's atomic replace, which leaves the graph untouched if the new file fails; Re-map
  columns...; Show import report (the report the element handed over when that load finished,
  kept per source). "Update with new data" is removed: the element can only add or replace.
- **Sources header menu:** Clear graph data... (the element's `clearData`, with a confirmation
  that it clears every source). There is no per-source Remove: the element does not record which
  source a record came from (needs graphty-element).
- **Extract versus live:** no toggle. The project always keeps a copy of each source (its bytes or
  URL plus the read options) and replays the same load on open; a URL source shows when it was
  read, and its fingerprint, and says so if the data at the URL changed. Live connections
  (databases, Neo4j) need graphty-element and are not drawn.
- **The load dialog is generated from the element's format catalog**: all seven formats (GML,
  DOT and Pajek were missing), each format's options (JSON array paths, the seven CSV shapes, the
  pipe delimiter), a label column, an edge id column, position scale, all seven repeated-edge
  policies, and "Direction: as the file says". It gains states for every typed refusal (empty
  file, parse failed with line numbers and the element's suggested fix, unknown or ambiguous
  format, no endpoint columns found, fetch failed, too large).
- **A graph too large to draw is refused**, as the element does (nothing is held), with "Filter
  at import" drawn as needing graphty-element. The skeleton's "loaded but not drawn" state
  contradicted the element and is replaced.
- **Two files dropped at once** are offered as a paired load when they are a node and an edge
  CSV; otherwise the second is refused with "One source at a time: the first is still reading".
  The element rejects an overtaken load, and the app may not queue loads around that.
- **"New graph from" stays in the Graphs switcher**, the one place graphs are listed. Projection,
  quotient, extract, combine and sample derive a graph from a graph; they are not sources. Every
  item is marked "needs graphty-element" (no transform API). The copies in the main menu's
  Analyze and in the Analyze popover are removed. A derived graph's Sources section shows a
  read-only origin line ("Derived from Transfers: bipartite projection on kind").
- **Doors that remain are shortcuts into Sources, not homes:** the start screen (no project
  exists yet; its "Connect to a data source..." becomes "Open from URL..."), the empty-canvas
  card, Ctrl+V with text on the clipboard, Quick actions.

The Tableau mapping behind it: a Tableau workbook holds many data sources; a graphty project
holds many graphs. The tables inside one Tableau source are the files that build one graph. So
"several sources in one list" is several loads feeding one graph, and "a new data source" is a
new graph -- the same dialog with a different destination.

Needs graphty-element: join by key, recording which source each record came from (and removing
one), live connectors, filter at import, queuing additive loads, a per-load cancel, data diffs
between versions, derived-graph transforms, graph data export, OR and NOT between filter steps,
and defining what a replacing load does to runs and the layers bound to them.

---

## 4. "Maybe notes should have a style layer rather than being a callout"

**Studio decision: yes. A note's words stay a note; how noted elements look on the canvas becomes
one built-in "Notes" row in the tree, pinned directly under Selection.**

- **One row, not one per note.** Individual notes still do not become rows: one note has many
  targets and most targets are nodes. The earlier reason "a note cannot paint" no longer holds,
  so this reverses part of the round 6 decision.
- **It paints only the nodes and edges that notes are about**, following the rule that a layer
  paints only its own results. Notes about a row or about the whole graph paint nothing; they
  keep their counts on the row and in the Graphs switcher.
- **Its Style tab is the same component as every row** (answer 1). The user decides: an outline,
  a glow, a color, the note's first line as a label with a speech-bubble pointer, or nothing.
- **Its default look is graphty-element's, not the app's.** Once the element produces its
  reserved notes layer, it ships a default as it does for nodes and edges; the element issue
  proposes an outline (`node.outline`), which collides with nothing (a count badge would
  overwrite the node's one label slot until `node.marker` draws). Until then the row starts
  with nothing set and reads "Not marked -- + to add a look": the app adds no look of its own.
- **Its eye is the only switch for note markers.** The zoom menu toggle, the View menu toggle,
  Shift+N, the eye in the Notes place header and the headset hand-menu switch all go.
- **The app's HTML note markers are deleted.** They were painted outside the layer system, so
  they could not be restyled, reordered, captured in a screenshot or seen in a headset.
- Clicking a noted node selects it and keeps the current inspector tab; the Data tab shows its
  note count.

Needs graphty-element: a drawable `node.marker`; the element's reserved notes layer
(`source: {by: 'element', reason: 'notes'}` exists in its types, nothing produces it); a pick
event for labels and badges. Until notes live in the element, the real app may paint the Notes row
with a temporary user layer that selects the noted ids, marked temporary and linked to its issue
(the project rules allow a labeled temporary workaround). The skeleton draws the target design.

**The general rule** (studio decision, from the owner's principle): the app adds no look of its
own. The element's defaults are visible and editable as Everything; a run's suggested style
stays (owner decision) and is an ordinary row; everything else is a row the user made. Dimming
what is not selected is a layer the reader adds, never a built-in control.

**Open for the owner (one-way door):** should notes become part of graphty-element's session API,
so a Notes style layer can select the elements notes are about? This adds public element API. The
design works either way in the skeleton; the real app's interim depends on the answer.

---

## 5. "'Why this look' has a lot of layers and uses a lot of real estate. maybe it should just list the active layers"

**Studio decision: yes. "Why this look" becomes one line per layer that is painting this element,
highest first, with the properties it wins as small tokens. Everything else collapses.**

```
[ramp]   PageRank     color
[gray]   Degree       size
[halo]   Selection    highlight
[square] Everything   shape, label, opacity
3 more rows match but are covered   (open)
```

- Only layers that win at least one property are listed. Layers that match but lose collapse to
  one closed line. Layers whose eye is off are not listed at all.
- Clicking a layer name selects that row. Clicking a property token opens that value's popover
  anchored to the token; an edit writes to the Overrides row and the selection stays on the node.
  There is no second editing form in the inspector.
- Several elements get the same list with coverage ("Louvain: color, 14 of 20"). This needs
  graphty-element: `explain()` answers for one element, and counting across twenty would be the
  app aggregating over the graph, so an `explain` over a set is filed and the list is drawn with
  that mark until it lands.
- The list comes whole from graphty-element's `session.styles.explain()`; the app computes
  nothing. It covers every property a layer painted, not the six the skeleton hand-picked. The
  Selection line is the exception: selection is element configuration, not a style layer, so it
  is read from the element's selection state and shown only while the element is selected.
- Valjean's inspector drops from about 20 lines to 4 or 5.

Precedents: the Computed pane in browser developer tools (overridden rules hidden until you ask);
Figma's Selection colors (what is in use, not what was overridden). Grouping by layer was chosen
over grouping by property because it grows with the number of layers painting the element (two
to five), not with the number of properties (up to 35).

---

## 6. "Consider whether the toolbar should move to the left-hand side ... would we add more tools? ... why path is a top level item -- maybe it should be under select?"

**Studio decision: the toolbar stays a fixed bar at the bottom center, its labels can be hidden,
space is not what limits it, and Path leaves the toolbar -- but not into Select.**

**Position.** The left edge already holds two vertical strips, the nav rail and the tree; a third
would make places and tools read as one column. The selection bar, the Path bar and every flyout
attach directly above the toolbar, and the headset hand menu mirrors its order, so a movable
toolbar would multiply every one of those. Figma moved its tools to a fixed bottom bar in 2024
for the same reason; Blender and Photoshop put tools on the left because nothing else lives
there.

**Labels.** Settings > Appearance > **Toolbar labels: Auto / Always / Never**. Auto drops the
text, keeping icons, tooltips and key hints, when the labeled bar would take more than about 60%
of the canvas width (about 650 px of canvas for the new four-control bar).

**More space would not add tools.** A control belongs on the toolbar only if it changes what the
next click or drag on the canvas does, or starts from the canvas and adds a row. The studio checked
all 349 graphty-element capabilities against that rule: camera jumps, capture, layout, pinning and
notes all fail it. The rule limits the toolbar, not its width.

**Path.** Path is a one-shot question that adds a row, not a mode you stay in, so putting it in
Select's flyout would teach the wrong model of that slot and hide it behind a caret -- the round 6
failure, where five participants missed the unlabeled Path icon. Instead:
- With two nodes selected, the selection bar offers **Shortest path, Most flow, Weakest cut**,
  showing direction and weight before it runs. With one node selected, it offers **Steps away**.
- With nothing suitable selected, **Analyze > Find paths** or the **P** key arms the
  click-From-then-To pick mode.
- The flyout's "All shortest paths" and "K shortest paths" are deleted: graphty-element has
  neither.

**The toolbar becomes four controls:** Select (with Lasso), Analyze, Quick actions, View mode.
- **Hand is dropped**: a plain drag already pans in 2D and orbits in 3D, and the element has no
  pointer-mode API, so Hand did nothing.
- **Lasso stays, marked "needs graphty-element"** (the element has no area selection) and
  disabled with a tooltip in the study build, with no key until it works.
- **Keys move off the element's.** On a focused canvas graphty-element uses W, A, S, D, Q, E and
  the arrows. Analyze moves from A to **Shift+A**, Lasso loses Q, and Expand is withdrawn: on
  loaded data it was Neighborhood at one hop under a second name, and fetching unloaded neighbors
  needs a connector graphty-element does not have. The
  shortcuts panel gains a "Canvas (graphty-element)" group listing the element's real keys.

Round 7 keeps the "how is A connected to B?" first-click task, worded without screen words. If
fewer than about half of first clicks land on the selection bar or Analyze, the Path button comes
back.

---

## 7. "I don't think the design takes all of graphty-element's functionality into account ... camera views ... export images and videos"

**Studio decision: every one of the 349 capabilities in the audit now has exactly one
disposition, recorded in the spec's capability register (section 18):**

1. **A home in the UI**, with its states drawn;
2. **Generated from the element's catalog** rather than typed by hand: style properties,
   palettes (all 18, with their color-blind and capacity data), scales (all 9), formats,
   algorithms, layouts, camera views, acceleration policies;
3. **Plumbing with no UI**, with the reason (events, batching, accelerator injection, the no-op
   render settings, the deprecated `layout-2d` flag);
4. **Needs graphty-element**, filed and drawn disabled.

The biggest additions:

- **Saved camera views** get a place on the rail (answer 8).
- **Image export**: PNG, JPEG or WebP; a size multiplier or exact pixels, with a print-width
  helper ("174 mm at 300 dpi" fills in the pixels); transparent background (PNG only); smooth
  edges; the element's four presets; download or copy to the clipboard, with the element's reason
  when the clipboard refuses; shot from any view without moving the reader's camera; sizes the
  element's pre-check refuses shown disabled with its reason and memory estimate; a "waiting for
  the layout to settle" state; a failure state per element error code.
- **Video export**: the live canvas with a still camera, or a tour flying through saved views;
  format, frame rate, bitrate and size; the element's estimate first, and when it predicts dropped
  frames the button reads "Record at 24 fps (recommended)"; progress with Cancel; a dropped-frames
  report after.
- **The SVG figure stays** (owner decision: the element publishes SVG figure export now, PDF
  later). graphty-element produces raster images only today, so Figure (SVG) is drawn with "needs
  graphty-element", and so is a legend drawn into an exported image.
- **Graph data export** (GraphML, GEXF and the rest) is drawn disabled: every format the element
  lists reports that it cannot export.
- **The Analyze catalog is generated from the element**: it gains Katz, HITS, Girvan-Newman,
  breadth-first levels, depth-first order, Prim, bipartite matching, min-cut and all-pairs
  distance, and loses the entries the element does not have (edge betweenness, clustering
  coefficient, all shortest paths, K shortest paths, graph statistics as a run, modularity of a
  grouping, assortativity, node similarity).
- **Layout**: pause and resume (a canvas status chip), pin and unpin, unpin all, pin on drag, the
  layout catalog with its options, pacing under Advanced, and "reframe when data changes".
- **Settings** gains the missing element settings (answer 10).
- **Contradictions fixed**: the skeleton opens in 3D, the element's default; the edge inspector is
  reached from the table or a row, never by clicking an edge (the element cannot pick edges); the
  too-large state shows a refused load.

---

## 8. "Maybe we should bring back 'views' or 'present' or 'export' to the nav rail? maybe setting or jumping to cameras should be a tool? or maybe camera management is already at the bottom of the graph and it's just not explained well?"

**Studio decision: Views comes back as a rail place. Present and Export do not; they are verbs.
Jumping to a camera is not a tool. And yes, camera management was already there, folded at the
foot of the Graph place and behind a chip reading "100%", which explained nothing.**

**The rail becomes Graph, Data, Views, Notes, Assistant.** A rail button names a collection, never
an activity. Saved views are a collection: named, ordered, and each the input to an image, a
video tour or a presentation. A view belongs to the project and can span graphs, so it does not
belong inside one graph's paint tree. Views sits after Data (a view is made from the graph and
its data) and before Notes (notes can cite views).

**The Views place:**
- **Only saved views.** The built-in views (Fit, Front, Side, Top, Isometric, which was missing,
  and any a plugin registers) are camera commands, so their one home is the Camera menu below.
- **Saved views**, in an order the user drags. That order is the findings report's page order,
  the presentation order and the tour order. Each row has a thumbnail (the element's thumbnail
  capture, taken on save and on update, never live) and an "In tour" checkbox.
- **Header:** Save view (+), Present, Record tour....
- **Row menu:** Update to current camera (works: re-saving a name overwrites it), Export image of
  this view..., Rename and Delete (drawn, "needs graphty-element": the element has no remove or
  rename for a camera preset).
- **The view's inspector is read-only**: its mode, the camera, the thumbnail, the caption, and
  what it keeps. Today it keeps **the camera only**, which the inspector says; "which layers are
  on", "filter steps" and "node positions" are listed disabled with "needs graphty-element: a
  view snapshot". The app assembling that snapshot itself would be the forbidden workaround.
- **Present** is a full-canvas mode that steps through the views with the arrow keys. A "Lock the
  canvas" switch (the element's `setInputEnabled(false)`) is off by default, because an audience
  asks to turn the graph around.
- **Record tour** opens Export > Video with the checked views as the flight path. It is disabled
  in 2D until the element accepts 2D waypoints (to be confirmed).

**The camera chip becomes a Camera menu.** Its face shows a camera icon and the current view's
name, with "moved" after it once the reader navigates ("Front, moved"); a zoom percentage appears
only in 2D, where the element has one. The menu holds Fit (0), Frame selection (F; also frames a
selected row's members), Reset (Shift+0), the built-in views (Front 1, Side 3, Top 7), the saved
views as a jump list, and Save view.... It holds no display toggles.

**Why not a tool:** jumping the camera does not change what the next click does, which is the
toolbar's rule. Blender keeps viewpoints on the numpad and in the View menu, not on its tool
shelf; Figma keeps zoom in a canvas-corner menu.

**Why not Export or Present on the rail:** both are activities. Export stays in the project-name
menu (owner decision); a view row's "Export image..." opens the same Export dialog with that view
filled in.

---

## 9. "Every element has one home ... 'View' ... is duplicative of what is in the toolbar. review the app for duplicative locations"

**Studio decision: the rule is kept and made enforceable, and the main menu shrinks to what has no
other home.**

The rule (written into the spec, section 17):

> Every object and every piece of state has one home, where it is read and changed. Commands have
> no home; they have doors: keys, Quick actions, context menus scoped to the clicked object, the
> selection bar, and links from reasons and empty states. A door never shows or holds state. Every
> door is drawn from one command record, so its label, key and disabled reason match the home,
> and the disabled reason is read from graphty-element. A second place that shows or edits the
> same value is a defect.

The test: if deleting a route leaves nothing unreachable and nothing unconfigurable, it was a door.

The skeleton had already drifted in three places, which is the evidence: Enter VR enabled in the
main menu but disabled with a reason on the toolbar; key 5 shown on both 2D and 3D; Edit > Show
all opening hidden rows, a different thing from elements hidden on the canvas.

The main changes:

- **Main menu: File, Edit, Settings, Help.** The View, Analyze and Recipes submenus go; Quick
  actions is the complete index of commands, each entry naming its home ("Toolbar > View mode").
- **View mode** (2D, 3D, VR, AR): toolbar only; key 5 and Quick actions are doors. The inspector's
  Dimension field is deleted.
- **Labels and Arrows** stop being display toggles: they are style properties on rows. **Minimap**
  is dropped (the element has none; filed). **Legend**: its own card closes it, a small Legend chip
  brings it back, L toggles. **Note markers**: the Notes row's eye.
- **Saved views**: the Views place only; the Graph place footer and the zoom menu list go.
- **Add data, Paste data**: Data > Sources (answer 3).
- **Export**: the Export dialog is the home; the project-name menu's Export... (owner decision)
  and File > Export... are its doors, and each output format lives only in the dialog. Save as
  recipe and Export style open the dialog with that format chosen.
- **Undo history and Version history** become one screen named Version history, in the
  project-name menu.
- **AI provider**: Settings > Assistant; the Assistant's no-provider state links there one way.
- **Author**: Settings only; the project-name menu's Author... goes.
- **Show all** splits into "Show hidden elements" (canvas) and "Show hidden rows" (tree list).
- **Mod+G** means "group what is selected": selected rows make a folder, selected elements make a
  set. It no longer names two commands.
- **Notes "+" buttons in ten inspectors** become a note count and "Open in Notes"; adding a note
  stays on N, the context menu and the selection bar.
- **The Analyze icons** in the tree bar and the graph overview go; the toolbar is Analyze's home.
- **The Everything row's Data tab** stops repeating the graph overview; the overview lives only
  in the nothing-selected inspector.
- **Version history** leaves the Graphs switcher's menu (the project-name menu is its home).
- **Duplicate** leaves the project-name menu: it made the same copy as File > Save as....
- **Load set collection...** leaves the tree's list menu: bringing a file in is Data > Sources
  ("+" > Set collection...), and the sets land in the tree as a folder.
- **A hierarchy's Level** is chosen on the run's Style tab only; the row menu no longer repeats it.
- **Move above** leaves the Style tab's "covered by" line: the covering row's name is a link, and
  paint order changes only by dragging in the tree.
- **Show all** on the canvas's "not drawn" line is renamed Show hidden elements, the same command
  and label as the Edit menu's.

The full table of every feature, its one home and its allowed doors is section 17 of the spec.

---

## 10. "Is the 'preferences' window the same as 'settings' in most apps? is it complete?"

**Studio decision: yes, it is the same thing, and it is renamed Settings (Ctrl+, stays). It was
not complete, and it now holds only what belongs to the person, never what belongs to the
project.**

Apple renamed Preferences to Settings in macOS 13; Windows, Chrome and VS Code say Settings. The
bigger problem was scope: the dialog mixed per-person choices with things that change what a
colleague sees, and left out whatever had no home. The rule now: a setting about you or your
machine lives in Settings and is kept in this browser; anything the project carries lives on the
object it configures (the graph, a row, a source); anything that paints is a row.

**Settings** is one dialog with a section list down the left and a search field that announces
its result count:

- **You**: your name (stamped on each note and recipe you write).
- **Privacy**: Usage data (the owner's opt-in, unchanged).
- **Appearance**: Theme, Number format (defaults to the system locale), Toolbar labels.
- **Accessibility**: Reduced motion (needs graphty-element to reach every animation; today only
  the app's own camera moves), **Single-key shortcuts: On / Off** (WCAG 2.1.4 requires it for the
  app's single-letter keys), **My selection look on this device** (the Selection row's three
  fields, with values the person chooses; the app ships none of its own).
- **Canvas input**: Pin a node when I drag it (the element's pin-on-drag).
- **Performance**: GPU use -- When available / Never / Required, read from the element's list of
  policies (Required was missing); an advanced "Use the GPU from N nodes"; a live status line with
  the device name, or the element's reason when the GPU is not used (replacing the static "Engine
  now: WebGPU", which also confused computing with drawing, which is always WebGL); the element's
  drawing limits, read-only.
- **Assistant**: provider (OpenAI, Anthropic, Google, or a model that runs in the browser and needs
  no key), model, a key per provider, "Remember keys on this device", Forget all keys, voice input
  language.
- **Headset**: always shown, with a status line ("No headset connected; these apply when one is"):
  hand tracking, controllers, teleport, seated or room-scale, depth boost when dragging. The
  element's own Enter VR/AR buttons are always off, because the toolbar is their home.
- **Keyboard**: opens the shortcuts panel, which lists the element's canvas keys first.
- **Projects**: the default overview for new projects (yours, so it lives here; the graph
  overview's "Use for new projects" is a door).
- **Diagnostics** (collapsed): logging on or off with level and modules, detailed profiling, a
  frame-rate readout.

Left out on purpose: export defaults (the Export dialog remembers the last choices, as Figma's
does); the project's opening view mode (a project reopens as it was saved); the canvas background,
label declutter and "reframe when data changes" (the graph's Canvas section); runs on open (the
graph overview's recipe, which maps to the element's algorithms-on-load); layout pacing (the
graph's Layout section).

Dialog fixes: `aria-modal`, section titles as real headings, each segmented control one Tab stop
with arrow keys inside it.

**Open for the owner:** your authorship decision says names come from "the project's author
setting". The skeleton keeps the name per person, in Settings, and stamps it on each note and
recipe when written -- the only reading under which one project can hold several authors, which
the same decision expects. Confirm this reading, or the name moves into the project.

---

## 11. "The right sidebars are getting cluttered ... we need common interaction patterns ... one well thought out right sidebar per layer type ... what belongs in the right-hand side ... 're-run layout' is an action"

**Studio decision: one frame for every kind of selected thing, and one rule for what it holds:
the right side shows the properties of the selected thing, read and edited in place. It holds no
verbs.**

The old rule, "the right side is for reading", was too strict: a style is a property and must be
editable where it is read. The line is between a property and a verb.

**The frame, identical for every kind:**
1. **Header, two lines.** Line 1: type icon and name (double-click renames). Line 2: the kind word,
   a provenance link ("from Louvain, Sep 28") and "...". The "..." menu is word for word the row's
   right-click menu, so each kind has one verb list reached two ways (Shift+F10 opens it from the
   keyboard). No eye in the header: visibility's home is the tree.
2. **The state bar**, only when a thing's properties have changed and need a costly commit: one
   line directly under the header, "Settings changed since the run -- Rerun | Revert"
   (Mod+Enter, Esc). It is visible on both tabs. It is the only button in any body. The graph uses
   the same bar for "4 readings not computed -- Compute".
3. **Tabs: Style, then Data.** A kind with nothing to paint (the graph, an attribute, a filter
   step, a folder, a readings-only run, a saved view) has no tab strip; its body starts at the same
   height. The tab you last chose stays chosen as the selection changes.
4. **Style tab**: a "Paints" line saying in plain words what the layer's selector covers, with a
   count link ("Members of Community 3: 25 nodes, 44 edges"), then the generated property sections
   (answer 1), then a paint-order line ("Covered by PageRank for color"), a link that selects that
   row; reordering is dragging in the tree.
5. **Data tab, always in this order, any empty section left out:** Summary (readings, never
   editable), Members or Values (distribution, top 10), **Made with** (settings and provenance
   merged, so scope, direction, weight and seed appear once; editable only on runs and layout,
   generated from the element's option schema), Notes (a count and Open in Notes).

**What differs by kind is only what fills a property's value:** a fixed value (Everything, group,
set, path, Overrides, Notes); a binding (a measure row); a palette shared by children with
per-child exceptions (a run); the combined result, read through "Why this look" (a node, an edge,
several elements); "Mixed" (several rows); the element's three selection-highlight fields
(Selection). The per-kind table is section 5 of the spec.

**Where the verbs went:** Keep as set, Compare with..., Check, Restore an earlier result, Run again
as copy, Lay out members, Show in table and Select members move to the "..." menu. Counts are links
that select what they count, and the table follows the selection if it is open.

**Layout, the owner's example:**
- Method, options, scope and seed are properties of the graph, in its Layout section. Changing one
  lays the graph out again at once (the element's `setLayout` does that). When the element's own
  cost estimate says the change will block the frame, a small confirmation anchored to the field
  asks first. The seed field has a dice icon to reshuffle, which is an edit to the field.
- **Pause and resume** is a status chip on the canvas beside the camera chip, shown while a live
  layout runs ("Laying out... Pause", "Settled"). It reads the element's running and settled state
  and is visible whatever is selected -- when a node is sliding under the pointer, a node is
  selected, so a switch in the graph's inspector would be out of reach.
- **Re-run layout** has no inspector button. It is a command in the canvas right-click menu and
  Quick actions.

**Edges:** graphty-element cannot pick edges on the canvas, so the edge inspector opens from the
table, from a row, or by Tab through a node's edges on its Data tab.

Precedents: Figma's Design panel (properties only; verbs in menus and Actions); Blender's
Properties editor (operators live in menus and F3 search); Tableau's slow-filter Apply as the model
for the state bar; Gephi's layout panel as the counter-example (parameters that do nothing until
you remember Run).

Round 7 checks: first click for "keep this community as a set" (header "..." or the right-click
menu, not the body); "rerun Louvain with resolution 1.2" found through the state bar; pausing the
layout while a node is selected; a keyboard-only walk (select a community, change its color, rerun
with a new resolution, revert).

---

## What only the owner can decide

1. **Notes in graphty-element's session API** (one-way: public element API). The Notes row's
   selector depends on it; the skeleton works either way.
2. **Author per person or per project.** Your decision says "the project's author setting"; the
   skeleton reads it as a per-person name stamped on each note. Confirm or correct.

Everything else above is a studio decision and can be changed with an edit.
