# Prior designs: export, timeline, condition cards, table dock, sources

What graphty's earlier designs and the owner's own words already decided about five parts of the
data prototype, where each decision is written down, and what the app on this branch has today.
Paths are relative to the repository root unless they name a branch. Quotes from the owner are
from the session archive `.claudehistory/` (session 3a19 unless noted; fac8 is the September
shell session).

The design history has three generations, and later ones win where they disagree:

1. **The app shell design** (Sept 2026): `design/ui/app-shell-progressive-disclosure-design.md`.
   Activity rail (Data, Explore, Analyze, Style, Present, AI), a Present panel, a top-bar Export
   menu. Its shell was built and then deleted on 2026-10-16 (commit 0895d6670).
2. **Refined structure B** (late Sept / early Oct), the spec the tier 1 app was built from:
   `design/ui/prototype/study/structure-comparison/structure-b-refined.md` on branch
   `ux-storyboards-mocks-and-study` (also in `.worktrees/ux-storyboards-mocks-and-study/`), with
   `design/ui/framework/` (the information architecture, templates and task flows) and
   `design/ui/tier1-real-app/tier1-design.md` (what tier 1 actually built).
3. **The design studio's tier 2 and 3 work** (Oct 12 to 17), on branch `design/studio-tier3`
   only: `design/ui/studio/` (owner decisions, digests of the owner's voice, tier 2 and 3
   designs) and the app code that has the Which picker and the Filters section. **None of it is
   on master or on feat/data-prototype.**

---

## 1. Export

### Decided

- **One Export dialog is the one home of every output.** Image, Video, Report, Recipe (with an
  "Only the style" choice), Data, plus Recent exports under the list. About 760 x 560 so the
  canvas stays visible; a list of outputs on the left (one Tab stop), each output's body is a
  summary line, a settings grid, one status callout, a preview, and the footer note "Saved to
  this computer only; nothing is uploaded". Remembers the last choices per output.
  `structure-b-refined.md` 12.1.
    - Image: Preset (To share PNG 2x; For print PNG 4x sharper; Thumbnail JPEG 400 x 300; For
      documentation PNG 2x transparent; Custom), Size, Format (PNG, JPEG, WebP; SVG drawn disabled
      until the element writes it), View (current camera, a standard view, or a saved view, captured
      without moving the reader's camera), Background, Advanced popover; Copy and Export;
      "waiting for the layout to settle" with Capture now.
    - **Video** (`captureAnimation`): View (same list, plus "Tour of saved views", which lists the
      views checked In tour with a Hold time each; disabled in 2D), Length, Size (1x, 2x, 1080p, 4K,
      Custom), Frame rate (24, 30, 60), Advanced (format Automatic/WebM/MP4, bitrate, transparency,
      easing). The element's estimate warns of dropped frames with a "Use 24 fps" button. Recording
      shows one progress bar and Cancel; done shows "Recorded 8 s; 3 of 480 frames dropped" with
      Record again and Export.
    - Report: one self-contained HTML file, figures from the views in tour order, "Methods text
      only" choice (needs an element methods writer).
    - Recipe: runs and paint rows; "Only the style" writes `styles.toDocument()`.
    - Data: Format list generated from the element's catalog (`catalog.formats()`, every writer
      with `canExport`, CSV first), file written by `exportGraph`; carries every attribute, current
      positions, each run's results as columns, and each element's drawn color and size; the
      format's losses are the warning callout (`lossNotes`). The app writes no format of its own.
- **Doors.** The project-name menu's Export... (owner, 2026-09-28: "Figma's Export... is also
  under the project-name menu"), the main menu's File list, Mod+E, and a row's or the table's menu
  with the target filled in. The top-right Export button was removed ("exports in the top right
  rather than thinking about how we want to structure data management is a miss", 09-28).
  `design/ui/studio/digests/decisions.md` on `design/studio-tier3`, lines 33, 109, 119.
- **Export and present are one thing** (owner 09-26: "export and present seem like the same
  thing. it's unlikely people will present from the browser"). Present survives only as the Views
  place's full-canvas walk through saved views (`structure-b-refined.md` 4.1), and "Export tour
  video..." from Views opens Export > Video on the tour.
- **Saved camera views feed export.** The Views place (`structure-b-refined.md` 4.1): ordered
  saved views with thumbnails and an In tour checkbox; that one order is the report's page order,
  the presentation order and the tour order.
- **The framework's version** (`design/ui/framework/interface-templates.md` 20, the Export...
  row; `information-architecture.md` 4.1 "[Export dialog, a device on every Export: a figure, a
  table, graph data, a recipe, a style file, the project]"; `task-flows.md` 9; `output-homes.md`
  3): one `ControlSection` per exportable kind, each item with a checkbox and its own setting row
  -- figure (current view and each saved view), data (graph-io format and scope), table (the
  dock's tabs), recipe, style, findings report; plus Download project file. "Export table" on a
  table tab is listed as its own command there; the tier 1 build folded it into the one dialog
  (below).
- **Files and profiles** (`design/ui/framework/files-and-recipes.md` 1): one file format with
  optional parts. Project = everything; Recipe = rule sets, data steps, runs, style layers,
  layout settings, views without camera, optionally a data-source query, mapping and joins (no
  data); Style file = a recipe holding only style layers, palettes and the Look; Data file =
  written by graph-io in an interchange format. "Notes travel with what they are about"; no
  notes-only file. The JSON shapes are `design/documents/` (style.md, recipe.md, notes.md,
  container.md, export-mapping.md), status "specified, not yet implemented; recipes need
  graphty-element 3.0.0". Its API is `session.data.saveDocument({ members: [...] })` and
  `openDocument(text)` (`design/documents/README.md`), which are **not** in this branch's
  graphty-element API report.
- **Export everything, and say what is lost** (`design/data/data-management-requirements.md`
  requirement 20 and 35): node and edge tables carry every computed and joined column; any loss
  is stated before writing; "showing 140 of 900" exports 140 nodes when the reader picks "only
  what is shown". Round-2 data mocks' Export was data-only; the owner rejected that: "this is
  still missing other exports: export styles, export recipes, export data, export image, export
  video, etc." (`design/ui/mockups/data/round-2/owner-feedback.md`), and earlier (10-20) "'Take
  the numbers out' -- need common save / export functionality, not something specific to data".
- **Style export must be complete and warn** (owner, 10-11 in the archive): "exporting styles
  should be comprehensive to any extent that the file format supports the styles, and there
  should be warnings from the exporter and the app if any style information will be lost."
- Older and superseded: the app shell's Present panel (Export image with Format and Scale, Export
  data with Scope, a collapsed Export video section with Duration, Camera Hold still / Orbit once,
  Format WebM/MP4 and Record, Export recipe (JSON) and Export as script, Reports library, report
  editor drawer) and a top-bar Export menu (`app-shell-progressive-disclosure-design.md` 5.1 and
  5.3 Present, lines ~2855-3075). The owner's first video question is 09-05 (fac8): "what about
  exporting videos? I think that's a functionality in graphty element?" The scope choices it
  drew (Whole graph, Visible N, Selection N, Set..., Top N) are still a good list for Data.

### What the app has today (feat/data-prototype)

- `graphty/src/workspace/export/ExportDialog.tsx`: the one Export dialog, **Image and Data
  only** (tier 1, `tier1-design.md` T13: "Not in tier 1: Video, Report, Recipe, Recent exports").
  Image goes through `captureScreenshot` (presets, size, format, background, view from
  `catalog.cameras()`); Data through `exportGraph` with `styles: true`, CSV per table; losses
  worded in `lossWords.ts`. `choices.ts` carries a "TEMPORARY copy of graphty-element's
  `SCREENSHOT_PRESETS`" -- an app workaround the architecture rule says to remove.
- Doors: command `file.export` "Export..." in `FILE_LIST` (`commands/registry.ts`), shown in both
  the main menu and the project-name menu (`frame/menus.tsx`).
- graphty-element already has: `captureScreenshot`, `captureAnimation(AnimationOptions)` (camera
  stationary or animated, cameraPath waypoints, duration, fps, format webm/mp4/auto, easing),
  `exportGraph(format, options)`, `catalog.formats()`, `catalog.cameras()`,
  `session.views` (save, remove saved camera views), `styles.toDocument()`,
  `notes.toDocument()` (`graphty-element/api/index.api.md`, `session.api.md`). No recipe
  recording or project-document writer is in this branch's API.

---

## 2. The timeline (time slider)

### Decided

- **A window, not a mode or an object.** Time is a visibility mask on the loaded graph: it never
  re-layouts, rebuilds or removes data, it composes with filters into one mask, and while it is on
  every count reads "visible of total" (`app-shell-progressive-disclosure-design.md` 5.3 Explore,
  "Time slider"; object-first round 2 `design/ui/object-first-ux/round-2/revision.md` 6.1:
  "Time is not an object: it has no members and paints nothing; it is a mask"). Prior art agrees
  (`design/ui/framework/research/graph-tools.md`: Gephi Timeline, KeyLines time bar with
  histogram, Neo4j Bloom slicer, Linkurious timeline, Kumu tagged timeline; "the window is a
  range filter with playback").
- **It lives at the bottom.** Every generation puts it there:
    - app shell: an overlay along the canvas's bottom edge, 70 px, only when a Time role exists;
      it docks to the top of the table drawer when both are open; the toolbar rides 12 px above
      (offsets 12, 82, 272, 342).
    - refined B 6 and framework `interface-templates.md` 16: part of the **bottom dock** -- a
      "time slider strip" pinned above the table's tabs, toggled from the View menu ("Time
      slider"); `information-architecture.md` puts "Bottom dock: the table; the time slider".
    - object-first round 4 (`round-4/revision-round-4.md`, answering the owner's "how do we get to
      the timeline mode?"): **a Time button (a clock) appears on the toolbar whenever the data has a
      time column**; pressing it turns time on or off.
    - The owner now: "timeline should be a tool that appears at the bottom of the screen"
      (`round-2/owner-feedback.md`).
- **Its controls** (the designs agree): play / pause, step back and forward, a track with tick
  marks and a timestamp density sparkline behind it, the window as a draggable band (drag the band
  to move, drag an end to resize, arrow keys step), the window readout ("2019-01 to 2019-03", or
  "up to 2019-03" when cumulative), the visible counts, close. Settings in one gear popover: time
  attribute (node and edge date attributes in two groups; or From / To for interval data),
  unit, window length, step, Sliding or Cumulative, speed, "Compare with previous window".
  Keys: comma and period step, Shift+comma / Shift+period jump to start and end, Space plays while
  the bar has focus (app shell; object-first round 2). Playback is not undoable mid-play: Pause
  commits where it lands, Esc goes back to the window before Play (`framework/interaction-patterns.md`
  3.6, `interaction-pattern-entries.md`).
- **Which elements a window hides** (object-first round 2 decision L3): a node with no time value
  of its own is inside when at least one of its edges is; with an edge-only date column the
  silent nodes disappear. Interval data (start, end, spells, as GEXF holds them) needs an interval
  window (L4). A window never marks results stale (L1); "Run for all windows" is the explicit
  opt-in (`framework/output-homes.md`, `state-matrix.md` Bottom dock rows).
- The owner's own constraints: "timeline mode might use integer steps, not just time" and "how
  does timeline mode interact with styling?" (09-05, fac8); "does the design allow for timestamps
  / steps on nodes and edges" (09-13, fac8); timelines are "key functionality ... features for
  data analysis or visualization (timelines)" (09-26); "Watch over time is a key use case for me,
  but probably not for the average user" (09-26).
- The time role is chosen with the data: the special-field picker's "time" (owner's rule) is the
  column the slider reads (app shell 5.3 Data: "The Time column chosen here is the one the
  Explore time slider ... use").

### What exists

- graphty-element: `session.visibility.setWindow(window)` with `TimeWindow { attribute, from,
to, step? }` and `visibility.window`; one undoable step per change
  (`graphty-element/api/session.api.md` VisibilityApi). Whether nodes follow their edges and
  intervals are supported needs checking in `graphty-element/src/session/visibility/`.
- The app on this branch has **no time slider**. The old shell's
  `graphty/src/components/shell/canvas/TimeSlider.tsx` (290 lines, a placeholder track) and
  `timeSliderGlyphs.tsx` were deleted in 0895d6670; read them with
  `git show 0895d6670^:graphty/src/components/shell/canvas/TimeSlider.tsx`. The framework
  plans a compact-mantine time-window component (`interface-specification.md` 7.3 row 8:
  "Mantine's RangeSlider is not a compact-mantine export").
- Mocks: `design/ui/mockups/artboards/TimeSlider.dc.html`; object-first screen 10
  (`design/ui/object-first-ux/mocks/v2/screen-10.html`); data round 2
  `design/ui/mockups/data/round-2/{A,B,C}/filter-steps-2-time-window.html` (drawn as a filter
  step, which the owner redirected to a bottom tool).

---

## 3. Data cards and condition cards (the Which picker)

### Decided

- **One condition card for every "which elements" question** (`data-management-requirements.md`
  requirement 12 and "The one condition card"): a filter, a style layer's target, a saved set and
  an algorithm's or export's scope are one card of conditions that must all hold, with "X of Y"
  counted by the element, ending in a verb (Select, Hide, Style these, Save as set, Run on these).
  Requirement 3 asks for one element rule shape so the app never translates.
- **The built form is the Style panel's Which picker** (`design/ui/studio/tier3/design.md`,
  "2026-10-16 -- The combined Style panel", on `design/studio-tier3`; commit 30b072fbc spec,
  9af954a58 build, then pilot passes d813c3899, 31e8c2387, 0acc14a7b):
    - Collapsed: a disclosure button "Which nodes, 11 of 77" showing each card as a chip with its own
      count ("Degree 5 to 12, 22"), an unfinished card as a dashed chip; no cards = warning chip
      "All 77 nodes: add a condition to narrow".
    - Expanded: the cards, "+ Add a condition" (a searchable Combobox over
      `data.readableValues()` grouped Data, Results, Structure; one card per field), Done. Cards
      combine with **AND**; each open-and-close is one undo step.
    - Card types by the field's kind: Number (histogram, RangeSlider, two inputs, or "highest /
      lowest N"), Category (checklist by count, search past 8, "(no value)" row), Text (contains,
      starts with, ends with, is exactly, Match case), Yes/no, Name (the id, plus "Use the selected
      nodes"); every card has "Has a value" / "Has no value". Fixed cards: a saved set, Selected or
      Hovered, "A rule set elsewhere". On the Edge tab an Ends card (both ends or either end in the
      layer's nodes).
    - Code: `graphty/src/workspace/style/WhichPicker.tsx` (1,387 lines), `style/cards.ts`,
      `rules/conditions.ts`, `rules/RuleRows.tsx`, tests
      `style/__tests__/ConditionCards.real-element.test.tsx` -- all on `design/studio-tier3`.
- **Filters reuse the same idea** (`design/ui/studio/next-steps/tier2-design.md` 1 on
  `design/studio-tier3`, built as `graphty/src/workspace/data-place/Filters.tsx` there): a
  Filters section in the Data place between Sources and Attributes; a header filter chip ("9 of 22
  nodes") drawn only while a step is on; steps are graphty-element state (`visibility.steps` /
  `setSteps`, each `{ id, on, rule }`, saved in the project, per-step counts from `plan()`); steps
  AND together so there is no reordering; commits 844a29f46 "a filter step is a condition card
  and applies only when added", 9f8c35c76, a18493275. The owner asked "are the data cards like a
  pipeline? does order matter?" (10-16) -- the answer built is AND, order does not matter -- and
  "how does the filter builder relate to our node and edge data cards? should we be using the same
  mechanism in both places?" (10-19), then in round 2 "what happened to using our data cards that
  we already created?"
- **A "data source" condition** when two or more sources are loaded is the owner's new ask
  (`round-2/owner-feedback.md`, under Join). Nothing earlier designed it. graphty-element's
  `RuleTree` leaves today are expression, range, categories, degree, component, neighborhood,
  isolated, self-loop, repeated-edge, edges, member, item -- no source leaf -- and the session
  keeps one `data.source()`; tier 2 proposed `data.sources()` (below). So the source card needs
  per-element source provenance and a rule leaf in graphty-element.

### What the app has today (feat/data-prototype)

None of the above. The Style tab here is the tier 1 one (`graphty/src/workspace/style/StyleTab.tsx`,
`SetLine.tsx`); there is no WhichPicker, no `rules/` directory and no Filters section. To use the
"existing data cards" the prototype must bring `WhichPicker.tsx`, `cards.ts` and `rules/` (and
their element additions: a presence leaf, `data.valueCounts`, `scope.count`, filter steps) over
from `design/studio-tier3`, which is not landed. Check
`git log origin/master..design/studio-tier3` before copying, and prefer merging that branch over
re-drawing the cards.

---

## 4. The table dock and its full-screen mode

### Decided

- **A dock along the bottom of the canvas, not a dialog**, because the reader sorts it while
  watching the canvas; row selection is the canvas selection; Shift+T toggles it (app shell 3 and
  5.3 Data "Data table drawer"; refined B 6; tier 1 2.9).
- **Full screen existed in the app shell**: "A Graph / Table segmented control at the top center
  of the canvas, shown only while the drawer is open, maximizes the drawer to the full canvas
  height and back"; when maximized the toolbar, minimap and legend leave ("there is no canvas"),
  and Graph / Table is the way back (`app-shell-progressive-disclosure-design.md` 5.1 and 5.6, the
  toolbar offsets table). Default height 260 px, drag to resize, remembered.
- **The owner's new shape** (round 2): open the table from the bottom-center toolbar; an "up" or
  "full screen" button takes over the screen **and brings up configuration options**; "minimize"
  returns to the bottom dock.
- **Column configuration lives in the header.** Refined B 6 / tier 1 2.9: one-line headers (type
  glyph, name, sort arrow, menu caret on hover), the column profile ("77 values, 1 to 36") as the
  header tooltip, the column menu is the attribute's one menu, "Columns: 8 of 69" chooser at the
  end of the tab strip ("the only place an attribute can be hidden"), key column frozen. The app
  shell's header menu: Color by, Size by, Filter by, Sort, Rename, Change type (with "N values
  cannot convert"), Fill empty values, Hide, Delete, More. The owner (round 2): "we lost the
  preferred route of how to configure data from the first round -- directly in the header of the
  table" and "maybe warnings could be an icon in the header that shows details on-hover".
- **A conflict to resolve.** On round 1 the owner said "showing the configuration in the data
  visualization table takes up too much space. context menu or back to data configuration panel"
  and "the data table for visualization shouldn't be a point of configuration or data management
  -- it's for data visualization / viewing only" (archive, 10-20 02:37). Round 2 asks for header
  configuration. Read together: configuration is allowed in the header (icons, hover detail,
  context menu) and in full-screen mode, never as blocks in the table body.
- Tabs Nodes, Edges, and one item tab per group run ("Louvain"); "Show members in table" narrows
  Nodes to a group with a removable chip; Ctrl+F searches the table when it has focus; the
  table's Export... opens the one Export dialog on Data with the showing table and its visible
  columns (tier 1 2.9, round 8). Hiding a column is a view choice and never changes data
  (refined B 6).

### What the app has today (feat/data-prototype)

- `graphty/src/workspace/table/TableDock.tsx` with `RecordTable.tsx`, `GroupTable.tsx`,
  `columns.ts`: Nodes / Edges / group tabs, a Columns chooser with a checkbox per column (hide and
  unhide; no "hide others"), sort, members chip, height from workspace state `dockHeight`. **No
  maximize or minimize.**
- Opened by command `table.toggle` "Table" (Shift+T, Quick actions) in `table/commands.ts`.
  **The canvas toolbar has no Table button** (`toolbar/WorkspaceToolbar.tsx`: Analyze, Layout,
  View, Legend, Quick actions, Neighborhood).
- The old shell's `DataTableDrawer.tsx` (with the maximize) was deleted in 0895d6670.

---

## 5. Data sources in the left sidebar

### Decided

- **The Data place is Tableau's "Data Sources"** (owner 09-30: "should the data nav link become
  the equivalent of Tableau's 'Data Sources' where multiple data sources can be loaded, extracted /
  cached, connected to, joined, filtered, etc?"; 10-01: "can't we join graphs on something other
  than node id? ... door entry times that have a person_id and a building_id", "don't worry about
  blending for now, but I do want to load and join multiple data sources", "weight should be a
  field that is defined when the data source is loaded"). Decisions digest: loading several
  sources and joining on any key column is a PRIMARY task; weight is chosen at load.
- **Layout of the Data place** (tier 1 2.6; refined B 7): the graph's name, then **Sources** (one
  row per table with its kind glyph, name and one quiet count line; a graph file expands to its
  node and edge tables; "+" offers File..., From a URL..., Paste...; row menu Rename, Edit
  source..., and in tier 2 Replace with file, Refresh, Remove), then **Filters** (tier 2), then
  **Attributes** (Nodes and Edges subheads, type glyph, role tag Key / Name / Weight, fill
  percent).
- **Every source, not the last** (`tier2-design.md` 4 on `design/studio-tier3`): Sources lists one
  row per load still in the graph; the header reads "From friends.csv" or "From 2 files"; the
  element keeps a `data.sources()` list (name, format, tables, counts added) saved in the project
  and moved by undo, `data.source()` kept for old consumers. Several node types joined on a key
  column was deferred to the owner as a design.
- The owner, round 2: "sources in the left sidebar seems right"; special fields picked in a
  sidebar; "sources, warnings, special types, data types, nodes, edges in one sidebar is a lot to
  comprehend and parse".
- Older: the app shell's Data activity (5.3 Data) had Loaded data lines and "Add attributes from a
  table" (Table join dialog with a Conflicts rule and "Color nodes by <column> after joining"), and
  the second-file choice Replace / Add / Add attributes from a table / Compare. The framework's
  load step (`interface-templates.md` 20a) and the drop choice step (Add data, Add as another
  graph, Replace data, Join) are the later form.

### What the app has today (feat/data-prototype)

- `graphty/src/workspace/data-place/DataPlace.tsx`: the graph's name, **Sources** (rows from
  `sourceRows(session.data.source(), session.data.lastImport())` -- one source; "+" runs
  `data.add-file`, `data.add-url`, `data.add-paste`) and **Attributes**. Its comment says Rename on
  a source (#894) and the role tags Key, Name, Weight (#893) wait for graphty-element.
- The Data page (`workspace/data-page/`) is the full-width load and mapping page every data door
  opens.
- graphty-element on this branch exposes only `data.source(): DataSourceDescriptor | null`
  (`{ config?, name?, size?, type? }`); there is no sources list.

---

## Summary for the prototype

| Topic           | Decided home and shape                                                                                                                                           | On this branch                                              | Gap to fill                                                                                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Export          | One Export dialog: Image, Video, Report, Recipe / Style, Data, Recent exports; doors in the File list (both menus), Mod+E, the table's menu                      | Dialog with Image and Data                                  | Video (`captureAnimation`, already in the element), Style and Recipe (`styles.toDocument()`; recipes and the project document are not in the element yet), scope "only what is shown", Recent exports; drop the copied presets |
| Timeline        | A bottom tool: play, step, a band over a density track, readout, counts, gear; a clock button on the toolbar when a time column exists; nodes follow their edges | Nothing in the app; `visibility.setWindow` in the element   | The strip, the toolbar door, the time role from the special fields, a node-follows-edges rule if the element lacks it                                                                                                          |
| Condition cards | The Which picker: chips with counts, typed cards ANDed, "+ Add a condition"; Filters are steps of cards in the Data place                                        | Not present                                                 | Bring WhichPicker, cards and Filters over from `design/studio-tier3`; add a data-source card (needs element provenance and a rule leaf)                                                                                        |
| Table dock      | Bottom dock, Shift+T; header owns type glyph, sort, hover profile, menu; maximize to full screen and back                                                        | Dock, Columns chooser, sort; no maximize; no toolbar button | A toolbar Table button, maximize with configuration, minimize, header warning icon, hide others                                                                                                                                |
| Sources         | Data place, left sidebar: Sources (every load), Filters, Attributes                                                                                              | Sources (one), Attributes                                   | `data.sources()` in the element; Filters; special-field picker                                                                                                                                                                 |
