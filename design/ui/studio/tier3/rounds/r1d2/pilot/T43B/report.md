# Pilot T43B: each source bigger the more they gave (sources.graphml)

Build: 758b8e8081 (frozen, served from `.study-builds/tier3-r1d2-758b8e8081`). This is a targeted
re-walk: the success path by pointer, and each route the last fixes touched that this task can
take, each its own session in a `758-` folder. Every session started on the empty start page with
clean storage and reached the file through the file chooser, never a URL. The data stayed the
sources file throughout: 24 nodes, 59 edges, `donations` 0 to 250,000; the answer read was s01
Harlan Development, 250,000.

The folders `pointer/`, `detours/` and `keyboard/` beside these are from an earlier build
(6dd0b00bd7) and are not part of this report.

Result: **reached** by pointer.

## The success path by pointer (`758-pointer/`)

| Step | Action | Screen | Shot |
| ---- | ------ | ------ | ---- |
| 1 | No thanks | start page: Open a file, Open network data, Samples, New project | 02.png |
| 2 | Open a file, sources.graphml | "Open as a new graph": "sources: 24 nodes, 59 edges"; Harlan Development 250000 on line 1 | 03.png |
| 3 | Load | drawing | 04.png |
| 4 | Everything | Style > Node: Shape (Icosphere), Size 1, Shape "+" dimmed, "Edges: 4 styles, Edit edges"; a notice "This looks like a private window: your work is gone when it closes. Save a copy to a file to keep it." with Save | 05.png |
| -- | hover the link icon beside Size | tooltip "Node size by attribute" | 06.png |
| 5 | the link icon | popover "Node size by attribute": Find an attribute, Fixed size, Data: donations "0 to 250,000", Does not fit: "5 attributes, Show why" | 07.png |
| 6 | donations | popover closes; Size shows "donations", "From 1 to 3"; key "Size: donations" 0 to 250,000; the drawing stays put; one dot plainly biggest | 08.png |
| 7 | click the biggest dot | inspector `s01`: name Harlan Development, donations 250,000; selection ring drawn | 09.png |

`758-pointer/styles.json`: Everything carries `node.size` by `data.donations`, range 1 to 3,
linear, painted on 24 of 24.

## The changed routes, each its own session

| Route | Session | What happened | Shots |
| ----- | ------- | ------------- | ----- |
| Find-box layer sized by donations, Control+O > Replace, Control+Z twice, then a look on Everything | `758-find-replace-undo/` | Find `donations`, Enter: 24 selected. Style, Shape "+" > Size: the unset line at 1, "Not set yet". The link icon, donations: layer "donations: has a value", 24 nodes, notice "Made layer donations: has a value for 24 nodes", key "Size: donations". Control+O, sources.graphml: "Add to sources" with "Replace sources.graphml" first and the duplicate-edges warning; Replace, then Replace on "Replace: sources.graphml, Was 24 nodes, 59 edges; now 24, 59". The layer stays, sizes still follow donations. Control+Z: "Undid changing settings and importing data." Control+Z: "Undid adding the layer donations: has a value."; the layer, the key and the varied sizes go. Then Everything > the link icon > donations: every dot sized again, key back, `styles.json` binds Everything by `data.donations` | 05-19.png |
| First find-box pick after Replace (selection ring) | `758-replace-first-pick/` | Everything bound to donations, Control+O > Replace > Replace. Find `Harlan`, pick s01: inspector s01, ring drawn at once (still there after 3 s). A click on another dot (s04) draws its ring too | 07-14.png |
| Find-box layer whose condition is edited before its look | `758-find-layer-condition/` | Find `donations`, Enter; right-click a dot > New layer from selection: layer "donations: has a value", 24, no look. Which nodes: switching "Has a value" to Between is written at once (layer renamed "donations 0 to 250000"); from box 1 and Enter commits it and closes the card: "donations 1 to 250000, 16 nodes". Shape "+" > Size, the link icon, donations: the 16 sized, key "Size: donations" with the line "donations 1 to 250000: 16 of 24 nodes" | 06-15.png |

Not walked: the routes on the list that belong to other tasks' files and looks (T41 on email or
phone with Fill red, T41A's "+" both-kinds row, T44B's label layer, T45A's edge layer on
neighbors.csv); this task never reaches them.

## Where the answer key and the screen differ (success path)

- After Load and on Everything, a notice "This looks like a private window: your work is gone when
  it closes. Save a copy to a file to keep it." with a Save button sits over the bottom of the
  drawing (758-pointer/05.png); the key does not mention it. It is gone by the next step.

## Defects

| # | Route | What a participant meets | Shot |
| - | ----- | ------------------------ | ---- |
| 1 | find-box selection, then a size bound on its layer (both find-box routes) | Binding size on a layer made from a selection moves the drawing about 135 px right and puts the right-hand group under the inspector. `decided.md` says the drawing moves only when the reader asks. Still here after the fix pass | 758-find-replace-undo/11.png, 758-find-layer-condition/15.png |
| 2 | find box, Enter (select all 24) | Enter in the find box moves the drawing too: the selection is drawn about 40 px right and a little lower, and the top-right dot goes under the inspector's edge | 758-find-replace-undo/05.png against 06.png |
| 3 | Control+O > Replace with the same file | After Replace the drawing is framed smaller and off center to the right, leaving the left third of the canvas empty, with the far-right dot against the inspector; it stays so after both Undos | 758-replace-first-pick/07.png against 10.png; 758-find-replace-undo/14.png |
| 4 | every walk | The start page asks graphty.app for its sample thumbnails and the browser blocks each request (net::ERR_BLOCKED_BY_ORB) | 758-pointer/02.png |

Fixed since the last walk, seen here: after Control+O > Replace a picked node gets its selection
ring at once, from the find box and from a click; a find-box layer takes a new condition before it
has a look, and Enter in its box commits it; Undo after Replace removes the find-box layer and its
look, and a size bound afterwards on Everything is drawn on every node.
