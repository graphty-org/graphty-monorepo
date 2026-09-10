# Graphty App Shell and Progressive Disclosure Design

Status: draft 1.9, validated, the always-expands section rule applied
Date: 2026-09-08
Scope: the graphty React application (`graphty/`), not graphty-element

## 1. Purpose

Graphty must serve a novice who has never heard the term "centrality" and an
expert who wants all 61 capabilities within two clicks, in the same interface,
without a skill-level switch. This document defines the framework that makes
that possible: the shell, the rules that decide what is visible, and the
mechanisms that guide a novice toward a first result. It is the source of
truth for the mockups and for the validation pass against the personas and
workflows in `design/designloom/`.

The framework is designed to be expanded over time. Section 8 defines the
six-field rule for placing any new capability.

## 2. Inputs

- Personas: `design/designloom/personas/` (12 personas: 1 novice, 6
  intermediate, 5 expert; `genomics-cytoscape-user.yaml` adopted
  2026-09-04).
- Workflows: `design/designloom/workflows/` (25 workflows, W01 through W25;
  `W20.yaml` to `W25.yaml` adopted 2026-09-04: W20 Gene list to interaction
  network with expression overlay, W21 Cluster and functionally annotate,
  W22 Enrichment map, W23 Hub gene ranking, W24 Condition comparison, W25
  Reproducible session and publication). Adoption caveats: W22 is adopted
  as a data-only case and asks for no new UI; W24's multi-network phases
  are blocked on network collections and W25's session-file phase on
  project files, both next-phase work (section 11).
- Capabilities: `design/designloom/capabilities/` (61 capabilities).
- Design tokens: `design/designloom/tokens/default-theme.yaml` (dark-first,
  compact Mantine).
- Existing shell: `graphty/src/components/layout/` (TopMenuBar, LeftSidebar,
  RightSidebar, BottomToolbar, AppLayout) and `graphty/src/components/sidebar/`
  (style layer controls).
- Existing data view: `graphty/src/components/data-view/` (ViewDataModal,
  DataGrid, DataAccordion, pathUtils) and
  `design/ui/data-view-feature-design.md`. The Data table and the inspector
  attributes table build on these components. Schema inference:
  `graphty-element/src/ai/schema/` (SchemaExtractor, SchemaManager).
- Prior research: `design/ui/progressive-disclosure-design.md`,
  `design/ui/figma-style-sidebar.md`, `design/ui/compact-ui-design.md`.

## 3. Decisions already made

| Decision | Choice |
|---|---|
| Design family | Figma-style shell: rail, panels, canvas, inspector |
| Existing shell | Keep the idea, not the layout. The style layers panel survives as one activity. |
| Skill modes | None. Disclosure is by state, tier, and remembered expansion. |
| AI role | Power feature. Placed in the shell, but the novice path works without it. |
| Platform | Desktop first. Must work on an iPad with Magic Keyboard (about 1180 by 820 points). Touch is secondary; controls keep desktop density. |
| Component library | Mantine, with the compact sizing already in the app. |
| Sample data for mockups | The cat social network dataset already in `AppLayout.tsx` (20 nodes, 29 edges). |
| Report Builder view | Folded into the Present panel. Not a separate screen. |
| Onboarding wizard | Dropped. Replaced by the Insights strip and plain-language readings. |
| Project save | Not in this pass. The top bar carries no dirty indicator, and adding save verbs to the individual saved things (5.3, Saved things) does not add one: a style template is how to draw a graph, a project file is the graph. See sections 11 and 12. |
| Data export | One home: Present. Data holds import only. This rule is about the graph. Export of a saved thing -- a style, a recipe, a filter, a set, a subgraph, a bookmark, a report configuration, an import mapping -- is export of settings that name attributes, and it travels with its kind's own library section (5.3, Saved things). |
| Selection model | Multi-select, one set for nodes and one for edges. Click selects one, Shift+click adds, Cmd/Ctrl+click toggles, Alt+click removes, Shift+drag on empty canvas draws a marquee, click on empty canvas or Escape clears. Edges are selectable. Bindings are owned by section 5.6. Requires a graphty-element change (section 5.8). |
| Undo | Application-level history, one store, 50 deep, scope defined in 5.1. Not in graphty-element. |
| Expression language | JMESPath for anything that selects nodes or edges. Computed-attribute formulas keep the [name] grammar and resolve names against the same paths (section 6.6). |
| Data table drawer | A canvas bottom drawer with home Data (section 5.3, Data). Not a modal and not a panel section. Row selection is the canvas selection. |
| Second file while data is loaded | The Import options dialog offers Replace current graph, Add to current graph, Add attributes from a table, or Compare with current graph. No collections, workspaces or project files. |
| Data cleaning record | Every data-changing operation is an entry in the one history store; Data tier 2 shows them as Cleaning steps. Undo walks the same list. |
| Annotations | Two capabilities. Notes (text on a node, edge, node set or the graph, with author and time) live in Explore and are in this pass. Callouts (text, arrows, highlight shapes drawn over a fixed view) live in Present and are deferred. See sections 5.7 and 11. |
| View mode | 2D, 3D, VR and AR are cross-cutting camera modes homed in the canvas toolbar (section 5.6), not in a panel. |
| Console | A provider-free command console lives in the AI panel (section 5.3, AI). It is the free-form route when no AI provider is configured. |
| Large graphs | Warn and allow. Nothing is refused on size; the safe option is the default and the user can continue past any warning, which states the estimate and the consequence. |
| Sequencing | The UX drives the engine. Features the design needs are specified here and tagged Coming in 5.8; the element and algorithms work runs in parallel with the UI, not before it. |
| Label order | A remembered Settings > Appearance preference: Plain first by default, Technical first available; both names always rendered. Principle 4 says "by default" for this reason. |
| Recipes | In scope. A recipe stores steps, not data, so it does not conflict with the project-file exclusion. |
| Repeated edges | Default policy: combine into one, count the repeats, sum the weight. Keeping all as parallel edges is a future phase (section 11). |
| Network collections | Next phase. One graph per session in this pass; the "Compare with current graph" second source is the ceiling. |
| Domain vocabulary | No domain-specific wording (genes, proteins, pathways, enrichment) on tier 1 or on generic labels; domain examples live in tooltips and descriptions, and known export formats are recognised by auto-detection, never offered as a preset list. |
| XR shell | A rail-and-panels shell does not transfer to a headset. VR and AR are a viewing mode for a graph built at the desk, not a second shell: no rail, no activity panel, no 280 px inspector, no status bar, no dialogs. The two in-session surfaces are a wrist panel and a follow card. Scope, bindings, comfort and the return contract are owned by section 5.9. |

## 4. Principles

1. Guidance is added, never carved out. The novice sees the expert UI plus
   help, not a reduced UI.
2. Every capability has exactly one home. The activity rail is the map.
3. Every capability is reachable three ways: its home panel, the command
   palette, and the AI assistant (or the console when no provider is
   configured).
4. Labels lead with plain language by default and carry the technical term
   second. Both names are always rendered; Settings > Appearance can swap
   which is primary (section 6.3).
5. The UI remembers what a user has expanded. That memory replaces modes.
6. Nothing expensive runs without the user asking, and anything that runs
   shows progress and can be cancelled.

## 5. Shell

### 5.1 Layout

```
Desktop (>= 1280 px wide)
+----+----------------+------------------------------+----------------+
| R  |  top bar: dataset name | undo redo | cmd-K | export v | compare | share |
| A  +----------------+------------------------------+----------------+
| I  |  Activity      |                              |  Inspector     |
| L  |  panel         |         canvas               |                |
|    |  (one of Data, |                              |  (selection-   |
| D  |   Explore,     |   [insights strip]           |   driven)      |
| E  |   Analyze,     |                              |                |
| A  |   Style,       |                              |                |
| S  |   Present,     | [minimap] [toolbar] [legend] |                |
| P  |   AI)          |   [time slider, if timed]    |                |
| AI |                |   [data table drawer, if on] |                |
| .. |                |                              |                |
| *  |                |                              |                |
| ?  |                |                              |                |
+----+----------------+------------------------------+----------------+
|  status bar: counts | zoom | mode | layout | running | viewing | issues | AI |
+---------------------------------------------------------------------+
```

Regions:

- Activity rail. Fixed 48 px column on the left edge. Icons top to bottom:
  Data, Explore, Analyze, Style, Present, AI. Pinned at the bottom: Settings,
  Help. One activity is active at a time. Clicking the active icon closes its
  panel. The Data icon carries an unnumbered warning dot when the validation
  report has warnings; the count belongs to the status bar chip, which owns it
  (One fact, one region, below; section 5.3, Data). The Present icon carries a
  badge counting pinned items plus unresolved notes.
- Activity panel. 280 px wide, opens to the right of the rail. Content depends
  on the active activity (section 5.3). Resizable on desktop. Activity panels
  never float; the only remembered layout state is widths and collapse. Each
  panel header's overflow menu offers "Expand all sections" and "Collapse all
  sections"; alt-click on any section or card header applies the toggle to
  every sibling in that panel.
- Canvas. Fills the remaining space. Hosts graphty-element. Overlays: the
  Insights strip (top center, dismissible), the canvas toolbar (section 5.6;
  bottom centre of the live canvas rect, 246 x 36 on desktop), the minimap
  (bottom left), the legend (bottom right), the time slider (full width along
  the bottom edge, 70 px, only when a Time role is assigned and the slider is
  on), note markers (a small
  glyph on a noted node, at the midpoint of a noted edge, or at the on-screen
  centroid of a noted node set; section 5.7), and a hover card showing the
  newest note on the element under the pointer. A filter status strip appears
  under the Insights strip while a filter or time window is active. It carries
  the active chips and nothing else: shown of loaded of total is the status
  bar's (One fact, one region, below), and the strip drops its time chip while
  the time slider is docked, because the slider readout and the status bar
  Viewing slot already print the window. Overlays never block the inspector or the
  panel. The canvas also hosts two optional docks that are closed by default:
  the Data table drawer along the bottom edge (section 5.3, Data) and the
  Compare split (section 5.3, Analyze). Docks resize the canvas; overlays do
  not.
  - The minimap is bottom left by design; the legend owns bottom right; the
    toolbar owns the optical centre of the same baseline, which is why moving
    it off the left edge is a pure gain of canvas rather than a trade. Panel
    and inspector drags are clamped so the canvas never goes below 520 px, and
    below 622 px of canvas (650 for the narrow toolbar) the minimap and legend
    rise 48 px onto a second line rather than either of them being hidden
    (5.6). In 3D
    the minimap projects the graph along the current view direction so it
    turns with the orbit, and its viewport rectangle is the frustum at the
    graph center depth. Click centers the view; drag scrubs it. Below 10,000
    nodes it is a scaled drawing of nodes without edges; above it a
    node-density heatmap on a 64 x 32 grid, log-scaled, rebuilt on layout
    settle, filter change and time-window step (throttled to 500 ms), with
    only the viewport rectangle updated per frame; hidden by default on iPad
    above the threshold.
  - The Data table drawer (Data panel, tier 1 toggle) docks along the bottom
    edge of the canvas, default height 260 px, drag to resize, remembered per
    6.5. While it is open the minimap hides and the legend compacts rather
    than hiding, because an encoded channel always needs its legend line
    (floor item 5, 6.10). The compact form is not a third legend component: it
    is one subtraction from the reading legend -- drop the swatch rows and the
    ramps, keep the header lines -- so it reads "Color: groups, categorical",
    "Size: most connected, sqrt", one line per encoded channel, at the same
    256 px width and the same right edge, and it does not scroll at this size.
    It keeps the bottom-right corner above the drawer and returns to the full
    form the moment the drawer closes. An export is unaffected either way: the
    exported legend is composed from the encoding model, never captured from
    whatever the overlay is drawing at the time.
    The time slider docks to the top edge of the drawer, and the canvas
    toolbar rides 12 px above whichever of the two is uppermost (5.6's four
    offsets: 12, 82, 272, 342). A Graph / Table segmented control at
    the top center of the canvas, shown only while the drawer is open,
    maximizes the drawer to the full canvas height and back. The drawer never
    covers the panel or the inspector.
  - In Compare mode the canvas hosts two graphty-element views of the same
    dataset, or of the dataset and one second file (section 5.3, Analyze,
    Compare over a second file), and the status bar layout slot reads
    "Comparing: A | B" with the counts reading "A 200 | B 412 nodes".
  - Above the large-graph threshold the canvas draws a render set, not every
    node: the subset chosen at import, narrowed by filters, time window and
    search, plus expansions, selection and path results. When the render set
    exceeds the edge cap the filter strip reads "Drawing 500,000 of 3,100,000
    edges (highest weight first). Show all". The filter strip uses the same
    compact numbers as the status bar; chips beyond two collapse into one "3
    filters" chip that opens Explore.
  - Legend, in two obligations, because two different readers need it and
    only one of them is looking at a screen (6.10 item 5). The canvas keeps a
    READING legend; the export gets a COMPLETE legend, composed into the
    image.
    - On canvas: one block per encoded channel with the attribute's plain and
      technical name on one line (6.3), the domain endpoints with the median
      or midpoint, the scale in words -- always, even where it is the default,
      because the scale word is the one line on the legend that nothing else
      on the screen says -- and every departure line, including the clamp line
      and "not measured (N nodes)". Categorical legends on canvas show the
      five largest categories by member count and then one Other row in the
      neutral the canvas paints for the same nodes, reading "Other (3,388
      groups, 43% of nodes)"; clicking Other opens the groups table. The
      coverage footer is not a separate line: the Other row carries it. The
      canvas legend draws no category counts and no state rows. Quantitative
      legends show min, median and max with the scale named ("Size: most
      connected (degree), sqrt scale").
    - In an exported image: the legend composed from the encoding model at the
      export's own scale, carrying every encoded channel with its channel
      word, attribute, domain endpoints, median or midpoint and the scale in
      words; the twelve largest categories with their counts and the coverage
      footer; every departure line; and one row per state drawn in the frame,
      because a static figure has no filter strip, no status bar and no result
      card to name them. It is not captured from the canvas overlay, which a
      Babylon scene capture cannot see (5.3 Present, 5.8).
    - Height: the canvas legend caps at 240 px, above which categorical blocks
      shorten one row at a time from the smallest channel upward and a block
      is never dropped, only shortened; the exported legend has no cap. The
      cap binds nothing today -- the tallest all-floor legend in the set
      measures 240 with three channels, no counts and no state rows -- and it
      forbids regrowth. Width stays 256 px on every board, so 5.6's two-line
      reflow arithmetic and the bottom stack's offsets are untouched. On iPad
      with an overlay open it shifts inside the remaining canvas width.
  - Legend hygiene. The legend names itself, so it carries no "Legend"
    caption and the minimap beside it carries none either; the heatmap form
    of the minimap above 10,000 nodes keeps its caption, because that picture
    is not self-describing. A channel with no encoding renders no block, and
    with nothing encoded the legend does not render. The palette name lives on
    Style's Palette select and in the legend's overflow menu, never in the
    legend body. The coverage footer is not a line of its own: on canvas the Other
    row carries it ("Other (3,388 groups, 43% of nodes)"), and in the exported
    legend it renders under the twelve category rows and only when categories
    were dropped ("Top 12 of 3,412 colored"). A range caption renders only the
    scale word once tick values are drawn. The state-row block (Selected, Linked to
    the selection, Matches filter, Filtered out, Not on path, Outside window,
    Open notes) does not render on canvas at all. Those are app chrome rather
    than encoded channels: constant across every dataset, learned once, and
    caused by an action the reader just performed. One fact, one region below
    already assigns each of them to the region that owns it -- the filter
    strip names the active filter, the status bar reads "120 of 200 nodes",
    the time bar's Viewing readout and the status bar Viewing slot name the
    window, the path result card names the path, the inspector header names
    the selection. They render in the exported legend, which has none of those
    regions, and in Help's "What the marks mean". The note marker row carries
    no count and layer counts do not render. No category counts render on
    canvas under any condition: the count belongs to the groups table, the
    result card, the Schema table and the exported legend. That is one
    unconditional rule in place of three conditional ones, and it makes the
    canvas legend scrub-invariant, so the per-step time summary (5.3 Explore)
    stops recomputing legend counts on every step.
    On a Compare split each half draws only the channels whose encoding
    differs between the halves. A channel encoded identically in both is drawn
    once, in a shared strip that rides 12 px above the canvas toolbar on the
    toolbar's own offset ladder; the toolbar does not move. The diff key lives
    on the Difference chip and is not repeated in either legend. The "Legend,
    view B (size as A)" header and the Compare counts exception are both
    deleted, which is safe only because side B's group sizes are reachable in
    the Data table drawer and on each result card's "See all N groups"; if
    that turns out false in drafting the counts exception returns for Compare
    and nowhere else. The exported image of a Compare view carries one
    composed legend that names both halves and carries the diff key.
  - The app disables graphty-element's built-in XR buttons (xr.ui.enabled
    false) so the legend owns the bottom-right corner and the shell owns VR
    and AR entry (section 5.6).
- Inspector. 280 px wide, right edge. Content depends on selection
  (section 5.4). Collapsible.
- Top bar. 40 px. Left: dataset name. Center: undo, redo, command palette
  trigger. Right: an Export button that opens a two-item menu (Image, Data,
  both landing in the Present panel), a Compare toggle next to the inspector
  toggle (enters Compare mode, section 5.3, Analyze), a Share button that
  opens a menu (Export data with a CX2 or GraphML preset, Copy image, both
  landing in Present; its tooltip names NDEx upload as a later phase, section
  11; the button is never drawn without this menu), inspector toggle.
  There is no saved or unsaved indicator, because there is no project save in
  this pass. The hamburger menu in the current TopMenuBar is removed. File
  actions move to the Data panel, view toggles to the canvas toolbar
  (section 5.6), AI settings to Settings.
  - Undo scope. One history store for the whole application. Undoable: data
    mutations (imports and their policies, table joins, identifier mappings,
    node merges, column operations, cell edits, row deletions, Auto-fix,
    computed attribute add, edit and remove, re-applied import options),
    filter and time window changes, style layer and encoding changes, preset
    application, layout switches, algorithm result add and remove, note
    edits, recipe steps. Not undoable: camera moves, selection, panel and
    tier state, Settings, AI chat. Depth 50. A new action clears the redo
    stack. Undo is a split button: the main half undoes, and a
    caret opens the History list (section 5.3, Analyze) as a popover with the
    current position marked, so History has a visible front door; clicking an
    entry restores that point. The caret's tooltip reads "History" and carries
    no binding. Right-click and long-press on Undo open the same popover. The same store has two filtered views: Data
    tier 2 "Cleaning steps" (data mutations only) and Analyze tier 2
    "History" (every entry with run records). Undo and redo walk the single
    store; the analysis recipe export (section 5.3, Present) serializes it.
  - Any action that is undoable from the top bar gets no confirmation dialog,
    only a toast with Undo (delete, merge, remove result). Confirmations
    remain for irreversible actions (Clear history, Remove key, Close
    dataset) and for the large-expansion prompt above the threshold in
    Settings > Performance.
- Status bar. 24 px, left to right: node and edge counts (shown as "120 of
  200 nodes" while a filter or time window is active; clicking them opens the
  Data table drawer), zoom percentage, a mode chip that renders only while an
  XR session is active (reading VR or AR with an Exit button; there is no 3D
  chip, because the canvas 2D/3D control is always visible, section 5.6), one
  layout chip carrying the engine name and the running state with no "Layout:"
  label ("Force directed - settled", "Force directed - step 120 of 1,000,
  Stop", "Positions from file", "Quick grid (Performance mode)", "Radial on 37
  of 200 nodes", "Computing Kamada-Kawai... Cancel") and a caret opening the
  layout menu below, algorithm progress while one runs (mirrors the Analyze
  card's progress row, with Cancel; until algorithms report progress the slot
  shows elapsed time and an indeterminate spinner, never a percentage, and
  Cancel is disabled with the tooltip "Cannot cancel this run"; while the
  Analyze panel is open with the running card in view the slot shows the
  spinner and the percentage only, so one Cancel is on screen per run, and the
  full slot returns when the card scrolls away), "Viewing:" date, window or
  step while the time slider is on (in the Time role's own units, 5.3 Data),
  a clickable "4 issue types (27)" chip when validation produced warnings --
  the chip names and counts the same noun, and the parenthesis carries the
  instance total -- whose tooltip reads "4 issue types, 27 issues" and whose
  click opens the validation report, a clickable "N notes" chip when the dataset has
  unresolved notes, which opens Explore with the Notes section expanded (reads
  "N of M notes" while a filter or time window hides some targets, and is
  hidden while Explore is open with the Notes section expanded), a
  "Performance mode" chip when the graph is above the large-graph threshold,
  naming the label cap only with the full rule list in its tooltip and in
  Settings, AI status, rendered only when a provider is configured or a call
  is in flight, and selection count when non-zero, showing the last set
  operation ("12 selected (+8)").
  - Layout menu. The layout chip's caret opens a menu mirroring Style's four
    quick picks (section 5.3, Style, Layouts) with their size estimates and
    disabled reasons and the active engine checked, then Re-run, Stop and
    "Layout settings...", which opens Style with the list focused. It carries
    no parameters and no All layouts list, and asks once above the large-graph
    threshold exactly as Style does; Style remains the home.
  - Loading has three phases and the layout slot names the current one:
    "Reading fraud.csv, 48 MB of 210 MB" (bytes, always known), "Parsing..."
    (indeterminate, whole-file formats only), "Building graph: 12,400 of
    51,000 nodes (24%), about 8 s left" (the count form appears only when the
    total is known, estimated from file size or Content-Length, never by
    bytes; otherwise "Building graph: 12,400 nodes, 98,000 edges so far" with
    no percentage or estimate). Cancel is present in every phase, stops
    within 1 s, and leaves "Cancelled at 24%" for a few seconds. Then "Loaded
    51,000 nodes and 212,000 edges in 34 s. Details" for a few seconds, where
    Details opens Data with the Loaded data section expanded, scrolled to the
    mapping line and highlighting it for two seconds; the highlight reveals
    that row's hover affordances for its duration. When the import assigned
    any role that was guessed or changed in the Import options dialog the
    toast adds a clause naming them: "Loaded 200 nodes and 612 edges in 1 s.
    Mapped amount to weight, ts to time.  Details". On the session's first
    load the panel switches to Explore, so the search field faces a user who
    has just seen their graph, and the toast is the route back to Data; this
    is the one exception to 6.5's last-active-activity memory.
  - Counts use thousands separators up to 99,999 and compact form above
    ("412k of 1.0M nodes, 3.1M of 10M edges"), exact values in the tooltip
    and in the inspector Counts section. A count reads "120,418" rather than
    "120,418 of 120,418" whenever shown, loaded and total are equal; the
    N-of-N form returns the moment a filter, window or subset makes them
    differ. The Performance mode chip's tooltip lists the rules in force
    ("sample 50k, labels off, hover off") and clicking it opens Settings >
    Performance. The layout chip has five states: "Positions from file",
    "Quick grid (Performance mode)" (or "Random (seeded)" when the quick grid
    fell back, section 7.2), "Force directed - step 120 of 1,000, Stop",
    "Force directed - settled", "Force directed - stopped after 1,000 steps";
    settled is never shown when the step cap, not convergence, stopped the
    layout. When the bar overflows, slots drop from right to left
    in this order: AI status, layout name, zoom, Viewing; counts, progress
    with Cancel, the issues chip and the Performance mode chip never drop.
    Zoom moved one place later now that it is the only camera fact in the bar
    and the toolbar shows four zoom controls with no readout of their own.

One fact, one region. A fact rendered in its owning region is not repeated in
a second region on the same screen. This is a rendering rule, not a data rule:
every fact still exists, and every dropped copy is still reachable in the
region that owns it.

| Fact | Owning region | Not repeated in |
|---|---|---|
| Node and edge counts | status bar | the Loaded data header, the Analyze panel header, the inspector line above the reading |
| Shown of loaded of total | status bar | the filter strip, which keeps the chips only |
| Active filter chips | the filter strip when Explore is closed; the Explore panel when it is open | the other one |
| Time window | the time slider readout and the status bar Viewing slot | the filter strip's time chip, and the Explore chip's value while the slider is on |
| Selection size | the status bar and the inspector header | the canvas marquee caption, the reading's opening restatement |
| Zoom percentage | the status bar | the canvas toolbar |
| Cost estimate | the card's Run row (5.3 Analyze) | the scope line, a card title pill, the warning line |
| Scope | the panel's sticky scope line | every card whose scope matches it |
| Run parameters | the collapsed run record (7.5) | the caveats line, the card body |
| A group's member count | the groups table, the result card and the exported legend | the canvas legend |
| Note count | the inspector, selection-scoped, and the status bar chip, dataset-scoped | the legend, which keys the marker without a count |
| Validation issue counts | the status bar chip | the rail badge, which is an unnumbered warning dot |
| Palette name | Style's Palette select and the legend's overflow menu | the legend body |
| File name | the top bar | the Loaded data first row |
| Mapping | one Loaded data line with one Change | a second mapping line and its duplicate Change |

### 5.2 Narrow screens (iPad with Magic Keyboard)

Breakpoint: below 1280 px.

- The rail and canvas are always visible.
- The activity panel overlays the canvas from the left. The inspector overlays
  from the right. Only one overlay is open at a time. Opening one closes the
  other. The Data table drawer overlays the canvas from the bottom, coexists
  with the inspector, and closes the activity panel.
- Overlays close on Escape, on tapping the canvas, or on clicking the active
  rail icon. Tapping the canvas toolbar is not tapping the canvas: the toolbar
  is drawn inside the canvas element, and without this clause a tap on Zoom to
  fit would dismiss the panel the user is working in.
- A pop-out (6.11) is a second sheet over its panel at full panel width with a
  back chevron in its header, so the one-overlay-at-a-time rule holds. The
  anchor rule of 6.11 does not apply below 1280 px and is not approximated: a
  sheet has no gap axis and no shared edge line, and its opener is not on
  screen behind it, so the back chevron and the header title carry the whole
  relationship. What does carry over is the opener's identity -- the header
  names the opener exactly as the desktop pop-out's title does, the opener is
  lit again when the sheet is dismissed, and the sheet closes on the same
  events as the pop-out (Escape, the opener's section collapsing, the region
  changing activity). A confirm or a cost gate is a sheet here too, never a
  floating card over the canvas.
- Overlays are the same width as on desktop (280 px). The canvas is not
  resized under them.
- The status bar and top bar persist. The Insights strip narrows to a single
  row of chips. The time slider keeps full width.
- Touch targets are not enlarged. Trackpad and keyboard are the primary
  inputs. Touch works but is secondary. Touch gestures are listed in 5.6.
- The iPad render ceiling (Settings > Performance) is lower than desktop.
  Above it the Import options dialog defaults to a subset load and warns:
  "This file has 1,000,000 nodes. On iPad, graphty can show about 50,000 of
  them smoothly and may run out of memory with more. Open it on a desktop
  for the full graph, or continue anyway." The Insights strip chip row above
  the threshold is the fixed cheap set (7.3). The canvas toolbar's Zoom
  to selection button is enabled while a selection exists, so the action is
  reachable with the inspector open.
- The canvas toolbar needs no special case here, which is the best evidence
  its placement is right: overlays do not resize the canvas, so the rect stays
  1132 px wide and the bar centres on it. At its 274 px narrow width its edges
  land 149 px clear of a 280 px panel overlay on the left and 149 px clear of
  a 280 px inspector overlay on the right, with either overlay open or both
  closed. Its lower edge sits 36 px above the window bottom, above the status
  bar and clear of the iPadOS home indicator.
- Below 1280 px a pinned inspector card (section 5.4) is a second tab of the
  inspector overlay.
- Below 1280 px, activating a row whose defined behaviour is "selects and
  centers the target and shows it in the inspector" -- a search result, a
  result-table row, a path step, a note row, a Matches row -- closes the panel
  overlay and opens the inspector overlay on that target. A back affordance in
  the inspector header returns to the panel with its list state and scroll
  position intact. Without this the one path the row exists for costs an extra
  interaction, because the inspector the row points at is not on screen.

### 5.3 Activities and capability homes

Each of the 61 designloom capabilities belongs to exactly one activity or is
cross-cutting. Panel contents are listed in tier order (section 6.2). A
control whose implementation status in 5.8 is not "shipped" carries a muted
"Coming" tag in the mockups.

Every row of every panel below is one of the ten row types of 6.9, routed by
the twelve rules there and vetoed by the floor in 6.10. Three consequences run
through all eight activities and are not repeated under each: the label of a
changeable value sits inside its field as a glyph rather than on a line above
it (Rule 3), a unit is a dimmed suffix inside that same field and never a
label or a parenthetical (Rule 5), and a control sitting at its default is not
drawn at all -- only the deviation is, with a reset x in the trailing slot
(Rule 7).

Saved things. Ten kinds of thing a user makes are worth keeping -- a style
template, a saved filter, a saved subgraph, a selection set, a view bookmark,
an analysis recipe, a search pattern, a computed-attribute formula, a report
configuration and an import mapping -- and every one of them gets the same
treatment, in the panel that owns the kind, so a user learns the convention
once.

- The library section. A resident RT-8 section named for the kind, whose rows
  are RT-6 and carry the user's own names. Clicking a row applies the entry.
  That is load, and it takes no verb, which is what keeps every panel from
  growing an Apply button per row.
- Three verbs, one destination each. `Save as <kind>...` creates a named entry
  in that kind's library; it is a resident 24 px plus in the section header's
  trailing slot. `Import <kind>...` reads a JSON file into the library and
  `Export <kind> (JSON)` writes one entry to a file; both are text items in
  the section's hover overflow. The ellipsis is load-bearing: it means a
  dialog that will ask for a name.
- `Load` is retired from this vocabulary. The word is spent on data -- "Load
  data first" is the disabled string on four rail items, "Loaded data" is a
  section name, Loading is a state in 6.1 -- and a Load button beside a style
  would teach the wrong noun for the one thing that really does load.
- Frequency decides the shape. Across one session an analyst saves at most one
  style and one recipe and applies a bookmark, a set or a filter dozens of
  times, so the resident pixels belong to the list and the rare verb gets one
  glyph on that list's header. No saved-thing verb lives in a panel header or
  its overflow.
- An empty library is 33 px, not 165: Rule 7c's one-row form already applies
  -- dimmed name, one plus, no content rows, no "Not set", no empty-state
  sentence. That is what makes the sections affordable on panels that have
  just been compacted.
- Say where a save goes. Every `Save as <kind>...` dialog carries a
  destination line under the name field, 11 px dimmed: "Saved in this browser
  on this computer. Export a file to move it." Every library section header's
  info circle carries the same sentence as its first line. This is floor item
  4 -- a control states what it will do before it does it -- applied to the
  word Save, and it is what prevents a reader from inferring a document model.
  The top bar is unchanged: no dirty indicator, no saved or unsaved state.
- Overwrite is never implicit. `Save as <kind>...` always creates a new entry.
  Replacing is `Update from current` on that specific row, so the user points
  at what will be lost; typing an existing name into the Save dialog relabels
  the primary to `Replace "Publication style"` and shows that row's date
  beside it. Row hover reveals the fixed application-wide triple (rename,
  empty, delete) and the row's context menu -- which is also the touch twin --
  holds Rename, Duplicate, Update from current, Export JSON and Delete.
  Delete raises a toast with Undo for 10 seconds and no confirmation dialog;
  that undo is toast-local and is not an entry in the fifty-deep history
  store, which is the one stated exception to 5.1's rule and does not grow
  5.1's undo scope.
- Applying reports what did not bind, always: "Applied Publication style. 2 of
  5 layers matched nothing: they need logFC and padj." That is floor item 2 on
  the apply path, and it draws nothing when everything bound.
- Portable versus bound. Portable to any dataset: style, recipe, pattern,
  formula, report configuration, import mapping. Bound to the dataset that
  produced it, because it names ids or a camera: saved subgraph, selection
  set, view bookmark, and any saved filter stored as an explicit member list.
  A bound row for a dataset that is not open renders dimmed with its reason in
  its title, never absent (6.9, Rule 7c's carve-out).
- Two lists, two jobs. The panel section is the working list: one kind, in the
  context where it is used, with apply, save, rename, update and delete. The
  Settings > Data management > Saved items list is the housekeeping list:
  every kind at once, with storage used, a per-row origin, a dimmed "For
  graphs you do not have open" group with its count, and bulk delete. Both act
  on the same entries.
- The one exception, named so it is not re-litigated: `Run a recipe...` stays
  in Data tier 1 and on Welcome. It is not a save-or-load verb, it is the
  front door of an empty app, and it is the one place where the list is not on
  screen, so a verb is needed to open it.

Data

- Tier 1: Open file (drop zone and button, listing "JSON, CSV or TSV,
  GraphML, GEXF, GML, DOT, Pajek, SIF, CX2"; accepted extensions include .tsv
  and .txt; accepts one file, or a nodes file and an edges file together), a
  secondary row under it with "Open from URL", "Paste data" and "Run a
  recipe..." (the drop zone also accepts cmd-V; a month-old analysis reruns on
  a new file from a cold start, so the recipe entry belongs beside the other
  ways in, not two tiers down), sample datasets, recent files, and a "Loaded data"
  section. In the Loaded state the drop zone relabels to "Add data" and the
  secondary row gains "Add attributes from a table" (technical: "Table join";
  enabled only in the Loaded state) and "Open from <name>..." for every data
  source registered by an extension (section 8). A "Data table" row
  (technical: "Node and edge table") beside the Loaded data section, with a
  "Show data table" switch, opens the Data table drawer (below). Loaded data
  shows node and edge counts, the detected format, direction and where it
  came from (file, column, or assumed), the identifier system ("ids: account id"), the
  Weight, Time, Label and Type columns ("Type: entity_type. Change"; the
  Schema section, legend, summary readings and the bipartite checkbox read
  the Type column), joined tables ("Attributes: 8 imported, 4
  joined from expression.tsv"), the applied import policies (repeated edges,
  unknown nodes, self-loops), each as one line with Change. Example: "Mapped
  user_id to source, item_id to target, ts to time. Change". The four mapping
  fields -- weight, time, label and ids -- render as RT-1 select fields rather
  than as flat dimmed text: each carries the 12 px chevron inside the box
  after its value, which is the register's existing mark for "this field opens
  something", and each field's title names its target verbatim ("Weight
  column: amount. Change in Import options"). That chevron is reopen path 1
  and carries its own scroll target; the Import settings gear on the section
  header stays as the general door, because a gear on a header cannot scroll
  to the weight column. The Time column
  chosen here is the one the Explore time slider, the Insights time card and
  Analyze temporal analysis use; the Weight column is the Analyze weight
  default; the Label column is the default label. "Close dataset" (technical:
  "New session") ends the section; it returns to Welcome after a confirmation
  that lists what is lost ("3 results, 2 saved filters, 1 custom score").
  Sample datasets: each row carries small tags (Directed, Timed, Types,
  Weighted) and a one-line source credit link; the list includes Karate Club,
  the timed synthetic fraud ring (Directed, Timed, Weighted), one with
  categorical node types, a biology sample ("Ovarian cancer DE genes. 150
  proteins, STRING edges at 0.4 confidence, logFC and padj columns. Try
  coloring by logFC and finding the groups."), and one large sample (50,000
  to 100,000 nodes, positions precomputed in the file, open license) after the
  small samples, each blurb's closing imperative a link that loads and runs
  (7.1 item 2), carrying a Large badge, size in MB, "Opens in Performance
  mode, about 20 s", and the hint "Try finding connected parts, or search for
  a node." A sample or recent row shows its size only when the size is the
  decision -- above the large-graph threshold, where it accompanies the Large
  badge and the "Opens in Performance mode" line. Small samples show counts
  alone. Recent rows above the threshold carry the Large badge, compact counts
  ("1.0M nodes, 10M edges") and "loaded as a subset of 50,000" when that was
  the last choice.
- Tier 2: Validation report; Columns (node attributes, then edge attributes;
  each row shows name, type icon, completeness such as "92% filled", a
  computed tag where it is a computed attribute, and a menu opening with Color
  by this, Size by this (numeric only) and Filter by this above the column
  operations -- the same three verbs the Data table column header and the
  inspector attribute rows open with, all three writing into the selected
  style layer or the base layer and then opening Style with that layer
  selected and the changed row highlighted -- then Rename, Change
  type, Fill empty values with..., Hide from table, Delete, More); "Add
  computed attribute" as the last row of Columns; Cleaning steps (a filtered
  view of the one history store defined in 5.1, listing every data-changing
  operation with time, one-line description and counts, such as "Merged 3
  nodes into acct-4471"; it is a view of the same list Analyze shows as
  History). The first-rows preview is removed; the Data table drawer replaces
  it.
- Tier 3: Import options dialog (also used in Add, Attach and Compare modes),
  Table join dialog, Map identifiers dialog, node merging dialog, computed
  attribute formula dialog, column dialogs (Search and replace, Merge
  columns, Split column, Change type preview), Run a recipe dialog.
- Capabilities: data-import, sample-datasets, data-preview (the Data table
  drawer and the inspector attributes table), data-validation,
  progressive-loading, computed-attributes, node-merging. The drawer is also
  a second surface for node-selection and for details-on-demand's neighbor
  list.

Resting state and doors in Data (6.11). Data is a section you operate, not one
you configure once and read out of, and it is the panel the door test moves
least: of the twelve content rows in the Loaded state, eight are 6.10 floor
items and three are the front door. The Loaded state rests at 17 rows rather
than 19, and both removals are verbs going to menus rather than controls going
behind doors -- "Close dataset" to the panel header's overflow, "Find and merge
duplicates" to the Cleaning steps header's overflow. Opened, the validation
report adds four rows and the Loaded state draws 21; the resting 17 is
unchanged, because that section still defaults closed and nothing about which
sections default open or closed changed, which is what pays for the rows
coming back. Columns caps at 8 rows
with "Show all 12" opening the Data table drawer. The Empty state stays at 7
rows, and the import gear is deleted from it, because a general import door
reaches nothing when nothing is loaded.

One general import door, one glyph, one title, one home: the gear on the Loaded
data section header, titled "Import options". The three shapes the Data panel
was drawn in -- a segmented trio with an "Import settings" gear on Open file, a
drop zone with the import door as a pencil on Loaded data, and a label-value
list with a prose mapping sentence -- collapse to that one. The four mapping
fields keep their own in-field chevrons, which is reopen path 1 and a door at
field scale (6.9, RT-1).

The pop-over inventory for Data and its dialogs:

- Column role parameters, 280, from a column's Role chip inside the Import
  options dialog, titled with the column's own name. Weight holds Treat as,
  Normalize to 0-1 and the Divide by 1000 offer; Time holds Kind, Measured in
  and the family-dependent third field; Node id holds Identifier system. The
  chip is the stub and keeps the chosen setting as a dimmed suffix -- "Weight
  strength", "Time ISO 8601", "Node id gene symbol" -- so what the control will
  do stays on screen and only the editing moves. That suffix is what clears
  6.10a: the value is not silent. This replaces the three shapes the same three
  role parameter sets were drawn in across the Import boards -- a tag crammed
  into the amount column, two dimmed sub-lines under a column name, a four-row
  block plus a top-level select, and a prose sentence.
- Join options, from the Conflicts field's own 12 px in-field chevron in the
  Table join dialog: the conflict rule, Prefix and Case-sensitive. This is
  RT-1's door rule at field scale and needs no new glyph and no new lane, and
  Prefix and Case-sensitive at their defaults are not drawn at all (Rule 7a).
  "Color nodes by <column> after joining" stays resident: it is a whole
  workflow step collapsed into one checkbox, and hiding a one-click
  accelerator behind a door is the opposite of accelerating.
- Table columns, 280, anchored to the Data table drawer's Columns chip: a
  search box, a checkbox row per column with a drag handle, Show all, Hide all,
  and "Add column..." at its foot. Show, hide AND REORDER over the 10 to 40
  columns these files carry is not a menu, and drag-reorder inside a menu is
  not a menu at all; this also gives "Add column" a home instead of a ninth
  toolbar control. The column HEADER menu is unchanged and stays a menu.
- The recognition banner's full per-column record, behind its Details chevron,
  which floor item 3 names by hand; and the item-3 picker's per-option
  settings, anchored to the chosen card.

Refused doors in Data, recorded so they are not re-proposed: Cleaning steps and
the Columns list (scan surfaces, floor item 7); the Loaded data mapping lines
(floor items 2, 4 and 6, and each field is already its own door); the Parsing
group (every change in it re-parses the preview grid a pop-over would cover);
the Load control (floor item 4 binds the cost estimate to its control and
6.11's second clause forbids a door between them); the Table join match reports;
"Run a recipe...", which this section names as the one exception; and the import
policies, whose home is a dialog and which may not acquire a second home. The
larger saving in the dialog is not a door at all but Rule 7a, which is not
being enforced there: three policies drawn at their defaults with the counts
"0 0 0" beside them, and "Load: Everything", are Rule 7a's own named examples,
and deleting them removes more rows than any door proposed here. Resting rows
outside the preview grid: the recognised-export state 7 rather than 15, the
guessed-column state 9 rather than 12, the above-ceiling state 10 rather than
13, the parse-error state 9 rather than 10; Table join's four settings controls
become one.

Import flow. Files whose format and mapping are unambiguous (JSON node-link,
GraphML, GEXF, GML, samples, recent files) load immediately with default
policies (repeated edges combined into one with a repeat count and summed
weight, unknown nodes created, self-loops kept) and the Loaded data section
shows what was applied. Mappings are remembered per header signature (sorted
column names plus delimiter); a file with a known signature loads immediately
with the "Mapped as before ... Change" line and a status bar toast.

The import flow is a state machine, and the Import options dialog is one
dialog in seven entry states, not four dialogs. Two tables decide every
rendering in it, and nothing else in this document may contradict them.
Table A is the input set -- everything the machine reads:

| Input | Values |
|---|---|
| Graph already loaded | no / yes |
| Format class | unambiguous / delimited / unreadable |
| Header signature | unknown / remembered / matches a known export |
| Anything guessed | no / yes |
| Estimated size | below the large-graph threshold / between the two numbers / above the render ceiling |
| Always show import options (Settings > Data management) | off / on |

Table B is the decision table: one row per combination that behaves
differently.

| # | Inputs | Dialog opens | Winning clause | Item 2 banner | Item 3 picker | Item 6 Load default | Primary button |
|---|---|---|---|---|---|---|---|
| 1 | unambiguous, below the threshold, nothing guessed, setting off | no | none | no | no | Everything | none |
| 2 | as row 1, setting on | yes | always show import options is on | no | no | Everything | Import |
| 3 | delimited, below the threshold, nothing guessed | yes | delimited file | no | no | Everything | Import |
| 4 | delimited or unambiguous, below the threshold, something guessed | yes | guessed column | no | no | Everything | Import |
| 5 | signature matches a known export | yes | delimited file | yes | no | Everything | Import |
| 6 | any row is unreadable | yes | parse error | no | no | Everything | Import, disabled, with "Skip N rows and import" beside it |
| 7 | between the two numbers | yes | above the large-graph threshold | as its other inputs decide | as its other inputs decide | Everything | Import |
| 8 | above the render ceiling | yes | above the render ceiling | as its other inputs decide | as its other inputs decide | Busiest nodes 50,000 | Import, or Import everything anyway when Everything is chosen |
| 9 | a graph is already loaded | yes, opening at item 3 | second file, data already loaded | as its other inputs decide | yes | as its other inputs decide | Add / Replace current graph / Add attributes / Open comparison |

Three sentences of composition law, because the tables cannot carry them.
Conditions combine and do not exclude one another: a row above is not a state
the file is in, it is a fact the file has, and one file has several. A
recognised export above the render ceiling draws the banner and the warning
and the pre-selected subset and takes the ceiling's clause, because the clause
names the trigger and not the contents. Only five of the seven clauses are
drawn as artboards (section 9), and those boards are samples of this table,
never a second specification of it.

The two numbers divide the labour, stated here once because they are otherwise
1,500 lines apart. Crossing the large-graph threshold opens the dialog and
turns on Performance mode after import. Crossing the render ceiling
additionally pre-selects a subset, draws the departure line and relabels the
primary button when Everything is chosen. Between the two numbers the dialog
opens with no warning and no subset, which is the case the artboards do not
draw. The threshold check wins over the immediate-load rule: a recent file,
sample or unambiguous format above the large-graph threshold still opens the
dialog, pre-filled with the previous mapping and subset choice.

`ImportFlow` (section 9) draws this machine as one picture -- the seven ways
in with their clauses in precedence order, the nine items with their render
conditions, the ways out, and the ways back in -- because the relationship
between the import boards is not visible from inside any one of them.

It reopens on the loaded file from seven places, each with its own scroll
target, because a door that reopens the dialog at the top has not reopened the
control the user pointed at:

| Reopen path | Scroll target |
|---|---|
| A mapping field on a Loaded data line | that role's column header, its Role chip focused |
| The "Mapped as before" toast | the grid, top |
| The Data tier 3 list | the dialog top |
| The Insights strip card "Load the full graph" | the Load control, Everything focused |
| The step 3 choice "Compare with current graph" | the picker, Compare selected |
| Import as "Add attributes from a table" | the picker, Attach selected |
| The command palette | "Import options" at the top; "Change the column mapping" scrolled to the grid |

Reopening never re-reads the file. That sentence is about parsing, not about
edits: an edit made in a reopened dialog and then abandoned is governed by the
Cancel paragraph after item 9.

The dialog, top to bottom:

0. The entry clause. The title row says why the dialog appeared, which for a
   dialog that opens unbidden is the first question a user has. The clause is
   the dialog's name for that state, not an explanation of its contents, and
   it is protected by floor item 6, names. One of seven fixed forms follows
   the file name and size: "delimited file", "guessed column", "parse error",
   "second file, data already loaded", "above the large-graph threshold",
   "above the render ceiling", "always show import options is on". Evaluate
   the list from the end; the first match wins. There is no default entry
   state -- every clause names a condition that is a departure from "the file
   simply loaded" -- so Rule 7a has nothing to delete here.

1. The file's identity appears once, in the title row: "Import options" then,
   dimmed, "<file name>, <size>" followed by the entry clause of item 0. The
   body opens with the summary and nothing else: "200 nodes, 612 edges,
   directed, weighted by amount, timed by ts". For a large file the dialog
   reads only the first 256 KB for format, confidence, mapping and first rows,
   and the summary reads "Estimated 1.0M nodes, 10M edges (from the first
   256 KB)"; parsing starts on Import. Sizes read KB below 1 MB, MB below
   1,000 MB, GB above. The summary never repeats the file name, never carries
   a Large badge -- a badge separates one row from its neighbours in a list,
   and a dialog is about one file -- and never states a limit that the warning
   line below it states. Each fact appears once in the dialog: counts in this
   summary, the render ceiling in the warning line, and every Load option's
   own arithmetic and cost inside that option -- the chosen one and the ones
   not chosen alike.
   When any role or type was guessed the summary carries a third line, "1
   column was guessed.  Review", where Review scrolls the first guessed column
   into view, focuses its Role chip, and steps to the next on each press.
2. Detected format with confidence, Import as (Edge list / Node list /
   Adjacency list / Matrix, pre-detected), Direction (Directed / Undirected,
   from the file where the format carries it), and, where a known export is
   recognised, a one-line run record naming what the recognition did:
   "Recognized a STRING export -- 12 columns mapped, combined_score as weight,
   1 saved filter installed", with a Details chevron opening the full
   per-column record and the text button "Map it myself". The banner is a
   floor item 3 run record, not a nine-word notice: a recognition is an
   automatic edit to the user's mapping -- column roles, the weight, the
   identifier system, a named saved filter -- and it is reported like any
   other automatic action, at the point it happened, so Rule 9 resolves in the
   banner's favour and the saved-filter consequence line at the foot of the
   dialog is deleted where it stands. "Map it myself" clears every
   pre-assignment, leaves detection-only guesses, and flips the row to "STRING
   mapping cleared -- 4 columns guessed. Review" with "Use the STRING mapping"
   in place of "Map it myself", so the move is reversible in both directions
   without a confirmation and without leaving the dialog. Auto-detection replaces any preset list: when a file's
   column signature matches a known export (a Gephi export; a STRING export
   by its node1/node2 or stringId_A/stringId_B and combined_score columns; a
   BioGRID TAB3 export by its Official Symbol Interactor A/B and Experimental
   System Type columns) the dialog silently pre-assigns roles, sets the
   weight, marks numeric channel columns, sets the edge type column, and
   installs saved filters named for the file ("High confidence (0.7)",
   "Physical interactions only"). The banner is the only visible trace;
   nothing in the dialog names a format the user did not load. When the file carries positions (GraphML geometry,
   GEXF viz:position, CX2 x, y, z) the dialog offers "Use positions from
   file", on by default above the large-graph threshold, off below; on
   selects the Fixed layout.
3. When data is already loaded, "What to do with this file": Replace current
   graph / Add to current graph (nodes matched by id; "When an id already
   exists": Update its attributes / Keep both / Skip; a per-source attribute
   is written and a validation info line reads "Matched 143 existing nodes,
   added 57") / Add attributes from a table (Attach mode, below) / Compare
   with current graph (enters Compare mode, section 5.3, Analyze; the only
   place a second graph appears, and the ceiling for this pass: network
   collections are next-phase work, section 11).
4. The preview grid of the first rows, which is the mapping surface: each
   column header carries a Role chip and a Type chip pre-filled from
   detection with a confidence tint and marked "guessed" where guessed. The
   chip is itself the control: clicking the Role chip opens the role menu
   (Source, Target, Node id, Label, Node type, Weight, Time, Edge type, Edge
   attribute, Source node attribute, Target node attribute, Source node type,
   Target node type, Node attribute, Skip) and choosing a role applies it and
   closes the menu, so correcting one wrong column costs one interaction, not
   four; the Type chip behaves the same way (Text, Whole number, Decimal,
   Yes/No, Date-time, List of text with separator, each showing the count of
   values that would not convert). Rename and Skip this column move to the
   header's overflow; skipped columns dim. Keyboard: Tab and Shift+Tab move
   between column headers, Enter opens the focused chip's menu, arrows move
   within it, and Escape closes the menu without closing the dialog. The Node id role carries an Identifier system (auto-detected
   from patterns, "other" by default, shown later in the Loaded data mapping
   line; the tooltip gives examples: account or device ids for transaction
   data, gene symbol, Entrez, Ensembl, STRING or UniProt for biology). A Time role takes three fields: Kind (a
   single moment / a start and end pair, which asks for the second column);
   "Measured in" (Date and time / Number / Ordered category); and a third
   field that depends on the family -- Format and resolution for Date and time
   (auto-detected: ISO date-time, date, Unix seconds, Unix milliseconds, with
   a sample value shown), Unit name singular and plural plus Decimals for
   Number, Order and Unit name for Ordered category. Detection: an ISO-shaped
   string, a 10-digit integer or a 13-digit integer gives Date and time; any
   other numeric column gives Number with the default unit "step"; a
   low-cardinality text column given a Time role gives Ordered category; an
   ambiguous guess is marked "guessed" like any other. Every downstream time
   string reads from these fields (Time role and units, below). A Weight role carries "Treat
   as: strength (higher is closer) or distance (lower is closer)" and
   "Normalize to 0-1"; when the column is all integers with a maximum between
   150 and 1000 the dialog offers "Looks like a score scaled by 1000. Divide by
   1000?" (the tooltip names STRING exports as the common source). The Treat as choice defaults the Analyze panel-level weight
   control and is echoed in caveats lines ("weighted by amount as strength").
   Node types: "Treat source and target as different node types (bipartite)",
   auto-checked when the id sets are disjoint. The Node type role is
   auto-detected as the lowest-cardinality text column named type, kind,
   class or category (Source and Target node type for edge lists); when no
   column qualifies the type is "node" and the Schema section says so.
5. Policies, in plain language: Repeated edges between the same two nodes:
   Combine into one, count the repeats and sum the weight (default; writes a
   repeat-count attribute so nothing is lost and the Analyze parallel-edge
   statistic is non-zero) / average the weight / keep the first / keep the
   last / keep a list of an attribute (keeping all as parallel edges is a
   future phase, section 11); Edges that mention
   unknown nodes: Create the node (default when no nodes table was given) /
   Drop the edge (default when a nodes table was given); Edges from a node
   to itself: Keep / Drop (default Keep). The validation report states "N
   rows collapsed into M edges".
6. Load (technical: subset load). Options: Everything (default below the
   render ceiling), Busiest nodes N (top N by degree with the edges between
   them, default 50,000), Largest connected part, Neighborhood of an id with
   depth, Nodes matching a filter or pattern, Only a time window (when a Time
   role is assigned; its helper line reads from the role's units -- "ts runs
   from A to B; pick a start and end", "step runs from 0 to 5,000", "release
   runs from v1.0 to v2.3"), Everything for analysis and draw nothing until
   filtered. Above the render ceiling (Settings > Performance) the dialog
   opens with the subset default pre-selected, and every Load option carries
   its own arithmetic and its own cost, at the same indent and in the same
   colour, the chosen option and the rejected one alike: "Draws 1.0M nodes and
   10M edges. Edges beyond 500,000 are hidden until zoomed in." and, with the
   warning glyph, "About 2.4 GB. May be slow or run out of memory." An option
   the user is being steered away from is exactly the one whose cost must be
   legible, which is floor item 4 doing its job. The warning line names the
   ceiling and the consequence and carries no figure of its own: "Above the
   render ceiling -- about 200,000 nodes on this machine. Busiest nodes is
   selected below; the whole file still loads." The Everything path is offered
   once, as the Everything option; the primary button follows the selection
   and reads "Import everything anyway" when Everything is chosen. No inline
   link and no second button duplicates it. The status bar carries the
   Performance mode chip afterwards.
   Everything downstream reads shown of loaded of total: the status bar
   counts, the filter strip ("Showing a sample: 50,000 of 1,000,000 nodes.
   Change"), every Analyze scope line ("on a sample of 50,000 of 1,000,000
   nodes") and the graph summary reading, which opens with "Showing a
   sample."
7. A collapsed Parsing group for CSV, TSV and pasted text: Separator
   (auto-detected value shown; comma, tab, semicolon, pipe, space, other),
   Quote character, First row is a header (on), Start at row, Skip lines
   starting with (#), List separator (|), Encoding (auto-detected; UTF-8,
   UTF-16, Latin-1); JSON nodes path and edges path (JMESPath); every change
   re-parses the preview. Its open state is remembered per 6.5.
8. The error block, drawn when the file has rows that cannot be read. It
   holds the plain-language statement, the offending line quoted in the
   monospace face with its line number, and the count: "Row 1,284 has 7 values
   where the header has 5. 3 more rows like this." The grid renders as far as
   it parsed, with the offending row in the warning colour and a "Show the 4
   bad rows" action. The parse-error state draws the Parsing group open with
   Separator focused, overriding that group's remembered open state for this
   one opening without overwriting it, because the separator and the quote
   character are what fix this class of file and a user who once collapsed
   Parsing would otherwise never see the control that fixes theirs. The footer
   note slot carries the reason the primary is disabled, in full ("4 rows
   cannot be read. Fix the separator or skip them."), and a secondary text
   button "Skip 4 rows and import" sits beside the disabled primary. Nothing
   in this block is iconified and the error text is never moved behind an info
   circle.
   Every role, policy and load control in this dialog carries an info circle
   (6.7) holding the sentence the design otherwise left in a hover-only
   tooltip: Identifier system, Treat as, Repeated edges, Edges that mention
   unknown nodes, Edges from a node to itself, Load, Parsing and the bipartite
   checkbox. What stays inline is what reports this file: the detection
   summary, the per-column type and completeness, the row count, the
   validation issues, the memory estimate and every warning that gates the
   Import button. This is the one screen where a novice makes the decisions
   with the longest consequences, so the dialog loses chrome (item 1) and
   gains guidance in the same revision.
9. Cancel at the left, then the note slot, then the primary. There is no
   second import verb beside the primary: "Load a subset" is deleted, because
   item 6's Load control four rows above it is where a subset is chosen.

Cancel, and every route out. Cancel, Escape and the title-row X are one
action, and a menu open inside the dialog takes Escape first. When nothing was
loaded, Cancel abandons the file: the shell returns to Empty, the status bar
reading line clears, and the file does not enter Recent, because a file the
user declined is not a file they opened -- 7.1's Recent list and Settings >
Data management follow this rule rather than restating it. When a graph is
loaded, Cancel closes and changes nothing: no re-apply, no re-parse, no
re-run, no new Cleaning step, no history entry. On a reopen where the user
changed a role, a type, a policy or a Load option without pressing the
primary, Cancel confirms once -- "Discard the changes to the mapping?" with
Discard and Keep editing -- because the dialog is showing the mapping of a
graph already on screen and a silent discard is indistinguishable from a
silent apply. That confirmation is about in-dialog edits and not about
re-parsing, so "Reopening never re-reads the file" is unaffected. On a parse
error Cancel is the only exit and is never disabled.

The primary follows the branch: Import, or Import everything anyway, when
nothing is loaded; Add, Replace current graph, Add attributes or Open
comparison following the item 3 picker when a graph is. Replace keeps its full
text as a destructive verb (6.8's never list).

Row types in Data and its dialogs (6.9). The Role and Type chips repeat down
the preview grid, so their repeated words rise to one legend on the column
header and the chips themselves become a glyph column (Rule 9): "Edge
attribute" seven times, "Text" four times and "Not set" four times are drawn
once each. A policy is a noun and a value in one field, not a sentence above a
radio stack -- "Repeats" holding "Combine + sum", with the full sentence in
its info circle (Rules 3 and 8). A placeholder whose only content is "the
default is in force" is not drawn: "engine default", "Not set" on an
unassigned role, an untouched Parsing override (Rule 7a). Validation cards
state their issue once and hover-reveal Change, Show rows and Ignore instead
of printing the triple on every card (Rule 7b, 6.8), and the summary lines
that restate those cards further down the same screen are deleted (Rule 8).
Column names, file names, cell values and the counts that gate Import are
floor items 4 and 7 and keep their words at every density, which is why the
import screens are the largest boards in the set and take the smallest cuts.

Two CSV or TSV files dropped together open the dialog with a Nodes file tab
and an Edges file tab, each with its own grid, and the note "Node file joins
on <key>". A one-column file loads as a nodes-only graph. Errors keep Import
disabled. Parse errors that cannot be resolved appear inline in the drop zone
with the supported formats list. Paste data above the large-graph
threshold warns with an inline message pointing to Open file and imports
anyway. Every import,
addition and attachment is a Cleaning step. Dropping a file on the canvas
while data is loaded opens the dialog at step 3.

Time role and units. The Time role's "Measured in" field is authoritative for
every time string in the application. A simulation step counter, an ontology
version sequence, a training epoch and an experiment round all satisfy the
Time role, and none of them is a date; no surface writes days or dates of its
own. One substitution table drives them all:

| Surface | Date and time | Number, unit "step" | Ordered category, unit "release" |
|---|---|---|---|
| Window size control | 30 with a unit select | 50 with a static label "steps" | 3 with a static label "releases" |
| Step control | 7 days | 10 steps | 1 release |
| Overlay readout | Viewing: 2026-01-05 to 2026-02-04 | Viewing: steps 1,200 to 1,250 | Viewing: v1.2 to v1.4 |
| Cumulative form | Viewing: up to 2026-02-04 | Viewing: up to step 1,250 | Viewing: up to v1.4 |
| Status bar Viewing slot | the same string | the same string | the same string |
| Filter chip | Time: 2026-01-05 to 2026-02-04 | Time: steps 1,200 to 1,250 | Time: v1.2 to v1.4 |
| Track ticks | month or day labels by span | round numbers at the fitted interval | category names, evenly spaced |
| Step tooltip | Step forward 7 days (.) | Step forward 10 steps (.) | Step forward 1 release (.) |
| Playback speed | 1x (one window per second) | 1x (one window per second) | 1x (one window per second) |
| Load window option | ts runs from A to B; pick a start and end | step runs from 0 to 5,000 | release runs from v1.0 to v2.3 |

The unit select renders only in the Date and time case; the other two families
print a static unit label. Ordered category has no arithmetic: window and step
are counts of categories, the track is evenly spaced, and the density
sparkline is one bar per category. The surfaces that read from this table are
the Explore time slider and its settings section, the 5.1 status bar Viewing
slot and filter strip, the 5.4 Temporal result body, the 7.3 time card, the
attribute select groups, and the Load control's window option.

Attach mode (Table join). Plain name "Add attributes from a table", technical
name "Table join". Reached from the Data tier 1 row, from "What to do with
this file", or by dropping a file on the canvas while data is loaded. Fields:
file or paste, Apply to (Nodes / Edges / Groups of a result), Key column in
file (default first column), Match on (id or any existing attribute,
defaulted to the candidate with the highest match rate against the key column
computed on the first 1,000 rows, each candidate's rate shown in the select
and the winner named in a helper line, "Best match: preferredName, 92%";
below 5% the field opens empty with "No column in the graph matches these
values. Try Map identifiers." and Join disabled, because a gene-symbol table
against a protein network otherwise reads "Matched 0 of 340 rows" with no
hint where the symbols live), Case-sensitive match (off), conflict rule (keep existing, overwrite, prefix
with table name), per-column type chips, grid roles limited to Attribute /
Skip, optional "Prefix column names with", and a "Color nodes by <column> after
joining" checkbox. A live line reads "Matched 1,102
of 1,133 nodes. 31 file rows have no node: ignore, add as new nodes, or
show". Unmatched rows are listed and exportable and become a validation info
line with "Map identifiers" as the fix. Joined columns are immediately
available to Explore filters, Style By attribute, Custom score and Export
data. Every join is a history entry with its key column and match counts.
Expansion fields (section 8): activity Data; tier 1 row and tier 3 dialog;
names "Add attributes from a table" / "Table join"; no insight card.

Map identifiers dialog (reached from a validation fix or Loaded data).
Fields: species, from type, to type, source (uploaded dictionary table, or a
registered mapping extension). Writes a new attribute and can re-key the
graph; shows the match count before applying. Expansion fields: Data; tier
3; "Map identifiers" / "Identifier mapping"; no insight card.

Validation. Issues have three severities: error (import cannot proceed, for
example unreadable file or no edge columns), warning (import proceeds but
something is wrong, for example edges to unknown nodes, repeated edges,
self-loops, missing values, mixed types in one column, isolated nodes), info
(facts worth knowing, for example component count, directedness assumed,
policies applied, "N rows collapsed into M edges", "Two organism ids present
(9606, 10090)" with a one-click filter to one species when an organism
column was mapped). Identifier warnings: "N ids look like dates (2-Sep,
1-Mar)" with Auto-fix restoring SEPTIN2 / MARCHF1 forms and a per-row list;
"ids mix number and text forms" with Auto-fix "treat all ids as text"; "ids
look like mixed namespaces". Errors stop the import in the Import options
dialog with Import disabled. Warnings load the data, put the issue-type badge
on the Data rail icon, show the "N data issues" chip in the status bar, and
add an Insights card (section 7.3). The validation report groups issues by
type. Each type shows a count, severity, one plain-language fix
recommendation and the policy or fix that applies, such as "7 edges
referenced unknown ids; nodes were created. Change", an Auto-fix for that
type where one exists (one click, one Cleaning step, a toast with Undo and no
confirmation, per 5.1's rule that anything undoable from the top bar is not
confirmed; its before/after preview is a separate Preview link beside it,
showing the same filtered table with the proposed change as a diff column),
Show rows (opens the Data table drawer filtered to the affected rows,
offending cells outlined in the warning color, with a one-line hint bar naming
the issue, the column and the two fixes, dismissed on the first successful
cell edit and never shown alongside the performance hint), Ignore, and the first 20 examples with Show more; the full
list exports as CSV from Present. Warning counts are unbounded; only errors
stop the import. Validation re-runs after every Cleaning step; fixed issues
read "Fixed by step 4" and the Data rail badge and the status chip update.

In the Data panel the report is a section that expands in place (6.11). Open,
it draws the issue rows themselves, one line each -- severity glyph, count,
name and that type's primary verb, as in "No amount, 14 edges  Auto-fix" --
errors first, then the two or three amber warnings, with the green "Fixed by
step 2" line beside them: those rows are what a reader opens the report to
read. Closed, its 32 px RT-8 header carries the highest severity's glyph and
the count "4 types" as its state mark, the name primary while any issue is
open and dimmed once all are fixed or ignored. The gear in that header takes
the report DETAIL and its policy -- the per-type consequence sentence, the
first examples of the user's own ids with Show more, the collapsed Info group,
the Ignore list, and "Re-ran after step 2" -- into a 360 pop-out at the panel's
right edge headed "Validation report", whose actions are resident rather than
hover-revealed, because at 360 there is room and floor item 4 wants their full
text. 360 rather than 280 because the consequence sentence and the line of
user ids are floor items 4 and 7 and cannot be shortened. That pop-out is the
case that decides tier 3a against 3b: every issue's Show rows opens the Data
table drawer along the canvas bottom, a dialog would have to close to let that
happen, and the user would lose the issue text at the moment they need to
compare it against the rows. The header's count is not a repeat of the status
bar's "4 issue types (27)": the chip is a global alarm and the header is the
section's own state mark, and 6.9 licenses a count on a collapsed header. The
resident form comes in near four rows, not near the 282 px this section
measured before it was cut to a door, which is why the consequence sentences
go behind the gear rather than staying beside their rows. Inside the Import
options dialog the issues stay inline, because 6.11 forbids a pop-out opening
from inside a dialog and because errors there gate the Import button.
Per-column completeness comes from the same pass and appears in Columns and
in the table header tooltip. The report and the Cleaning steps can be
exported (JSON or CSV) from the Present report checklist.

Data table drawer. Plain name "Data table", technical name "Node and edge
table". A canvas bottom drawer (5.1), home Data, opened from the Data tier 1
row and "Show data table" switch, the status bar counts, the command palette
("Data table"), every validation issue's Show rows, every result card's "See
all N ranked" and "See all N groups" (which open it sorted on that metric or
by group), Community "Select members", the inspector's "Show in table", and
the Shift+T key (5.6). It is a drawer, not a dialog, because the user sorts
it while watching the canvas, the same overlay family as the time slider.
Tabs: Nodes | Edges, with counts reading "Showing 120 of 200 nodes" and
following the active filter and time window. Toolbar: search (matches
visible columns, debounced), Show (All / Selected / Hidden too), a "Rows with
issues" toggle with an issue-type picker, Columns menu (show, hide, reorder),
Add column (name, type, default value; or opens the Custom score dialog),
"Top N by each metric" (plain name "Compare measures"; when two or more
metric results exist: highlights rows in the top N of k or more metrics and
writes a summary line "TP53, MYC, EGFR are in the top 10 of all 4 methods"
with Select agreement set; it reads the same N and k as the Rankings summary
card of 5.3 Analyze, and is indexed by the palette, disabled with its reason
until two ranking results exist), and
"Export this table", which opens Present with Export data preset to this
tab, CSV, visible rows and visible columns; export stays in Present. Columns:
every imported attribute, every computed metric with a Rank column, every
computed attribute, every group or component id, and every selection set.
Rows are virtualized at the 28 px list-row height, 100 per page. Column
headers sort on click (single column, stable; Shift for multi-column; a
"Sorted by degree, high to low" chip; sorts over 300 ms show progress in the
status bar with Cancel); the header menu opens with Color by this, Size by this (numeric
columns only) and Filter by this above the column operations -- all three
write into the selected style layer, or the base layer, and then open Style
with that layer selected and the changed row highlighted, so the encoding's
home is still where the user is taken -- then Sort, Rename, Change type
(with "N values cannot convert and will become empty"), Fill empty values
with..., Hide, Delete ("Deletes the attribute from every node, not just this
view"), and More (Search and replace: this column or all, plain text or
regular expression, preview of the first five changes; Merge columns: join
with a separator, start and end into a time span, sum, average; Split
column). The header tooltip shows type, completeness ("83% filled") and
distinct count from the validation pass. A quick filter box writes the same
chips as the Explore filter builder. Cells: double-click or Enter edits, Esc
cancels, Enter or Tab commits; id is read-only; computed attribute cells show
an fx badge and open the formula dialog; Shift+click on a cell copies its
path in the form the target field expects (section 6.6). Row selection is
the canvas selection (6.1): row click selects and centers, Shift+click
extends a range, Cmd/Ctrl+click toggles, marquee over rows extends the
selection, "Select all rows" equals Select all visible. Copy column, Copy
selection, Copy visible rows as TSV at full precision. The Edges tab shows
source and target labels with a jump to each endpoint. Row menu: Show on
graph (centers, switches to Graph when maximized), Select neighbors, Merge
selected, Delete, Delete with connected edges. Every edit, column operation
and row deletion is a Cleaning step. Above the large-graph threshold the
drawer opens in Show: Selected with the hint "Showing selected rows first for
performance. Show all"; during progressive loading rows append as chunks
arrive and the header carries the same "Partial data" note as Analyze cards.

Computed attributes. Plain name "Custom score", technical name "Computed
attribute". The formula dialog takes a name and an expression in the [name]
grammar, such as `[betweenness] * 0.6 + normalize([degree]) * 0.4`, where a
bracketed name resolves to an imported attribute, a computed attribute, or a
result metric by the rule in section 6.6. The dialog offers a path picker
listing the same names the Explore filter builder lists, validates inline,
and previews the top values. Every algorithm result card also offers
"Combine into a score", which opens this dialog pre-filled with that metric.
Data remains the home.

A `Formulas` library section (5.3, Saved things) sits under Columns, below
"Add computed attribute": rows show the formula name and its expression
truncated at 11 px dimmed, a row click adds the computed column to the current
dataset, the plus reads "Save as formula...", and the overflow holds "Import
formula..." and "Export formula (JSON)". A formula carries its name, its
[name]-grammar expression, its output type and its fill policy; not the
computed values, which are recomputed on apply. Without it an expression that
took ten minutes to get right is gone the moment the dataset closes, and the
only way to carry it forward is to save an entire recipe. That the recipe also
serialises formulas is an accepted overlap, not a duplicate home: the recipe
is the whole session as steps and applies formulas as part of a replay, the
Formulas library is one reusable expression applied on demand.

Node merging. The dialog opens pre-filled from the current selection when
reached through the inspector's "Merge selected nodes" action, and has a
batch mode: top, "Match nodes by" attribute select with case-insensitive and
trim options, similarity threshold and same-type constraint; bottom, a
per-attribute conflict table (Keep first, Keep last, Join with ';', Sum,
Average), a candidate-pair list with score and side-by-side attributes,
keyboard review (Down, Up, Enter accept, X reject, A accept all above
threshold), a preview of the first three merge groups, and "Merge accepted
(N)" as one undoable batch with a toast instead of a confirmation and an
exportable merge log. A merge retargets notes to the surviving node (5.7). With two to five nodes
selected the merge does not need the dialog: the inspector shows "Merge N
nodes" naming the survivor, which merges immediately with the default conflict
rules, writes one Cleaning step, and raises "Merged 2 nodes into acct-4471.
Undo | Review conflicts"; the dialog stays the home for batch matching and for
more than five nodes.
Batch matching has a cost class like every Analyze card (section 8):
instant for exact matches through the attribute index, heavy for similarity
matching. Above the large-graph threshold it requires a blocking key (an
attribute both candidates must share) or the same-type constraint, shows an
estimate beside "Find candidates", runs off the main thread with the
standard progress row and Cancel, and caps candidate pairs at 1,000 (5,000
with "See all in data table"); principle 6 applies to it as to any run.

Import mappings. The mappings the app already remembers per header signature
get a library section at the end of Data tier 2, after Cleaning steps, because
the app is otherwise saving something on the user's behalf, into the same
storage as everything else, with no list, no name, no delete and no export.
One row per remembered signature, named by the file that created it
("expression.tsv columns"), with the column count in the trailing slot and the
mapping summary in the title. Row hover gives rename and delete; the row menu
adds "Apply to current file" and "Export mapping (JSON)"; the section overflow
holds "Import mapping...". There is no plus on this header, because the entry
is created by the import and creation stays implicit; instead the header's
info circle reads "Mappings are remembered when you import a file whose
columns graphty has seen before." The "Mapped as before... Change" line's
mapping name is a link into this row. Naming a mapping after its originating
file is also what makes a header-signature collision visible rather than
silent (section 12).

Cleaning steps and undo. Every data-changing operation is a Cleaning step:
import policies applied, an added or attached file, identifier mapping,
Auto-fix, node merge, batch merge, column rename, type change, fill, delete,
merge or split, search and replace, cell edit, row delete. The tier 2 list
shows each step with time, a one-line description and counts; selecting a
step shows its before and after in the inspector. The top bar undo and redo
walk the one history store (5.1) together with style, layout and analysis
actions, so undoing a merge removes its step. Result cards computed before a
data-changing step carry "Data changed since this ran. Re-run" instead of
being removed. Steps export with the validation report from the Present
report checklist and appear under "Data changes" in the generated report,
which is the session-level record W09 asks for until project files exist.

Run a recipe. The dialog takes a recipe file (section 5.3, Present), lists
each step with its scope and parameters, marks steps whose attributes are
missing in the loaded data with the reason and skips them, and applies the
rest in order. Each applied step enters History and is undoable.

One graph. Graphty holds one graph per session. Filters, time windows, ego
views, saved subgraphs and pattern matches are views of it, not subnetworks.
Opening a second file offers Replace, Add to current graph, Add attributes
from a table, or Compare with current graph. Compare mode (Analyze) is the
only place a second graph appears; it loads through the same Import options
dialog.

Schema. Attribute types, ranges, category counts, percentiles and
completeness come from graphty-element's schema extraction (SchemaExtractor,
cached by SchemaManager, invalidated on every Cleaning step) and one
attribute index computed in the background at load. The Import options grid,
Columns, the table header tooltips, the inspector attribute summary, the
Present attribute lines, the legend, the Analyze histograms and the Explore
filter builder all read it; nothing infers types twice; controls show
"measuring..." until it is ready. The engine contract this design needs
from graphty-element is recorded in 5.8.

Explore

- Tier 1: Search input with a results list capped at 100 rows in a bounded
  scroll region, header "40,230 match. Showing 100 by connections. Narrow
  with attribute:value or Filter to matches", a scope toggle (All nodes /
  Visible nodes), and two list actions: Filter to matches (adds a filter
  chip) and Select all matches (subject to the selection cap). The field
  accepts id:, type:, exact:, regex: and a leading = for an expression; that
  sentence is the info circle on the Search label (6.7) and also shows on
  field focus. It is taught text, so it is never retired by usage (6.5).
  Canvas highlighting applies only when matches are 1,000 or fewer. Above
  the threshold search covers id and label by default from an index built at
  load; all-attribute search is a tier 2 checkbox. Exact id match always
  sorts first. Then: active filter chips (including an active pattern chip
  when a pattern search is live; when the weight attribute is a 0-1
  confidence, a "Minimum confidence" chip with ticks at 0.15, 0.4, 0.7 and
  0.9 that writes an ordinary edge filter). Every chip carries an X that
  removes that filter, and from two chips a "Clear all" removes them all;
  Cmd+Z is not the substitute, because checking a filter puts entries on top
  of it in the one shared history store (5.1). While the time slider is
  docked the chips carry no time chip, and the Explore chip names the filter
  rather than repeating its value (5.1, One fact, one region). Zoom to
  selection is not repeated here: 5.4 makes the inspector the home for
  selection-scoped actions, and F, the context menu and the palette are
  unchanged. Then Select all visible (confirms above the
  selection cap: "Select 412,000 nodes? The inspector will show totals
  only."), a Select split button (Invert, Neighbors of selection (depth 1 to
  3, adds to the selection), Same group as selection, From list (paste ids
  one per line, reports unmatched ids), By expression; Save selection as
  set...), and, only when a Time role is assigned (Import options dialog or
  Loaded data), a "Step through time" row that toggles the time slider
  overlay.
- Tier 2: Filter builder with two tabs. Builder (default): Nodes or Edges
  scope toggle, then attribute, operator, value rows; a NOT checkbox per row;
  once two rows exist, "Joined with AND" becomes a Match all / Match any
  select with one level of grouping; the attribute list groups node
  attributes, edge attributes, computed metrics, group size (a derived field
  per grouping result, also a Data table column and the basis of the legend
  Other row) and selection sets ("In set:
  name" with operators in and not in) with plain names such as "Most
  connected (degree)", grouped by "::" namespace or by source table
  (identically in the Style By attribute select and the inspector), and
  matches typed text against both names. The list ends with a "Not computed
  yet" group holding the node metrics this graph supports that have not been
  run (Not computed yet, in 5.4 Style layer), so the list is a menu of what
  you could do and not only a record of what you have done. Operators by type: number: <, <=,
  >, >=, between, abs() >, is missing, is not missing; text: is, is not,
  contains, is one of, is missing; list: contains (whole-element match, so
  TP53 does not match TP53BP1) and contains text (substring); "exact:" in
  search applies per element on lists, and attribute:value search follows
  the same whole-element rule. "between" renders a
  dual-handle quantile slider over the attribute's histogram, on a log axis
  when values span more than three orders of magnitude; while dragging, the
  match count is estimated from a 10,000-node sample ("about 412k would
  match") and replaced by the exact count on release. Categorical values
  with more than 50 distinct entries switch from a checkbox list to a
  typeahead listing the top values by frequency with counts. A filter set has
  an "Also include neighbors (1 step)" checkbox. A Result toggle at the top
  of the section reads Hide others (default) / Select matches; under Select
  matches chips read "Selected: betweenness >= 0.3" and the inspector shows
  selection statistics. The resident builder is the scope toggle, the Result
  toggle, the Match all or Match any select, one 32 px row per rule reading
  the rule back in plain form with its own match count in the trailing slot
  and an X to remove it, the neighbors checkbox, "+ Rule" and the live "38 of
  318 would match" line. Each rule's editing controls live in a 360 pop-out
  anchored to that rule row and titled with the rule read back: the attribute
  picker with its search field and groups (drawn as a menu, never as a second
  pop-out), NOT, the operator select, and the dual-handle quantile slider over
  a full-width histogram with both endpoints legible, which 224 px cannot
  hold. The per-rule match count stays on the rule row and does not travel
  into the pop-out, because floor item 4 puts a count at the control it acts
  on and the rule row is the control. Expression tab: a single field in the same JMESPath
  dialect the Style layer selector uses (6.6), with attribute autocompletion,
  inline validation and the same live "N of M would match" readout; builder
  rows convert to an expression on switching, and switching back is possible
  only while the expression is form-representable. Chips render either form;
  saved filters store either form. Each chip's menu offers Hide (default) or
  Dim, Invert, Save as style layer; a style layer's selector offers Use as
  filter. Above the large-graph threshold the builder shows Apply with
  progress instead of auto-apply. Then: Saved filters, a library section (5.3, Saved things) whose plus reads
  "Save as filter..." and whose overflow holds "Import filter..." and "Export
  filter (JSON)"; a saved filter may be an explicit member list, technical
  "subgraph", and saved subgraphs are their own library section with "Save as
  subgraph..." and apply like any filter. Selection sets, a library section
  with counts, whose plus reads "Save selection as set..." -- the longer form
  stays, because "selection" names the source and the floor's scope clause
  wants it. Clicking a set name replaces the selection, because that is the
  apply gesture and Union onto an emptied selection is never the documented
  way to load a set; selection is not undoable, so a replacement writes a
  status bar note naming the previous selection size. The five set verbs --
  Replace, Union, Intersect, Subtract, Filter to set -- are the row's context
  menu rather than five buttons on one row, matching the row treatment every
  library row gets, and a menu is what a list of verbs is; the menu is
  resident on a touch pointer. Sets appear in the filter builder, in Analyze
  scope ("on set Disease module"), in the Data table as a column, and in
  Present export scope; the Select split button's own menu, which carries what
  was a Selection actions section (Invert selection; Select neighbors of
  selection (depth); Select matching filter; Select edges between selected;
  Select largest connected part; the Nodes or Edges scope toggle of the filter
  builder also scopes these) -- a list of verbs is a menu (6.11), and the
  section duplicated the split button two rows above it and reprinted a
  selection size the inspector header and the status bar each already print;
  neighborhood expansion, which is a section that expands in place onto the two
  facts its state mark used to summarise -- a Hops field reading "2 steps" and
  a type-filter field reading "3 types" -- so that 5.4's remembered last node
  and edge type filter is readable before it acts, which is floor item 4 drawn
  rather than summarised; the mark "2 steps, 3 types" survives only while the
  section is closed, and drawing the fields retires the 11 px section name two
  boards had to invent to fit a name and a stub into 255 px (6.11). Its gear
  opens a 280 pop-out holding direction, the max-nodes cap and the node and
  edge type checkboxes with counts such as
  "process (11,900), user (80)"; the preview from a bounded traversal that
  stops at 2,001 nodes reading "Adds about 37 nodes", "Large expansion
  (1,240 nodes). Continue?" above 500, or "More than 2,000 nodes: the canvas may
  slow down. Filter by type first, or expand anyway" above 2,000 stays resident
  beside the control it spends, because floor item 4 binds an estimate to that
  control; depth 2 warns the same way when depth 1 exceeds 1,000, and Collapse
  last and Collapse
  all; a Views library section for bookmarks (newest first; the plus reads "Save as
  view...", the row menu holds Rename, Duplicate, Update from current, Compare
  with current, Export JSON and Delete, and the section overflow holds "Import
  view..." and "Export view (JSON)"; a bookmark
  stores camera state, view mode, active filter, time window and selection;
  restoring switches view mode if needed and animates the camera over 500 ms;
  20 per dataset with a warning at 18; created from "Save as view..." in the
  Views
  menu or the palette); "Find a pattern (subgraph search)" listing saved and
  pre-built patterns (including "Directed cycle (3 to 6 nodes)" and "Fan-in /
  fan-out star") with a New pattern button, a one-line text form of the
  pattern in the expression dialect, e.g. (user)-[logon]->(host)-[logon]->
  (host2) where host != host2, Run on Enter, Seeds: selection, a Similarity
  slider (Exact, 0.9, 0.8; approximate matches name the value in the
  caveats line and the match list shows each match's score), the library
  treatment on the saved-pattern list -- a plus reading "Save as pattern...",
  a section overflow holding "Import pattern..." and "Export pattern (JSON)"
  -- and a Matches list once a pattern has
  run (count, rank score, click to center; Up, Down and Enter step the list;
  50 rows at a time with Show more, bounded by the 30 s time box, and "See
  all in data table");
  one "Step through time" section, which is the slider's only settings home and
  expands in place: name, dimmed technical name, the On switch resident in the
  trailing slot in both states, because it is the section's own master control
  and not a precis of the rows below it (6.11), and, when the section is open,
  the window size and step in the Time role's units as one pair row and the
  Cumulative or Sliding track -- the three things a reader who opens this
  section came to change, drawn at their defaults under Rule 7a's carve-out.
  Its gear opens a 280 pop-out with the rare remainder (the time attribute
  select, fixed at import on most graphs, playback speed, "Recompute
  results on each step", off by default, offered only when the last run took
  under the estimate threshold, writing one history entry per step, and
  "Compare with another window"). The gear on the slider bar opens the same
  pop-out, 8 px above the bar with right edges aligned, rather than switching
  the panel to Explore and scrolling it, because changing a number that
  immediately re-renders the canvas should not take the user off the canvas.
  The section renders only when a Time role is assigned; and a Notes section
  with a
  count in its header ("Notes 14", or "8 of 14 visible" under a filter or
  window): a search input over note text, author and tags, resident; the filter chips
  Open (default), Done, Mine and Assistant, the tag picker and the sort
  control collapsed into one filter door in the section header opening a 280
  pop-out, with the header reading "Notes 14" or "8 of 14 visible"; one row
  per note showing target label, author, relative time, color chip and the
  first two lines of text, unchanged and inline, because note text is the
  user's own data and the list exists to be scanned -- fourteen doors to find
  the note you half remember is the case 6.11 refuses, and size alone is never
  a trigger; a row's edit glyph opens a 280 note editor pop-out anchored to
  the row rather than growing the row in place; clicking a row selects and
  centers the target and opens the inspector Notes section; row hover or
  focus reveals the fixed row triple (edit, visibility where applicable,
  delete) plus Done and "Pin to report", each with its non-hover twin in the
  row's context menu (6.8). Header: a "Show notes" switch and a More menu with Export
  notes (JSON, CSV), Import notes (JSON), Mark all done, Delete done. Notes
  whose target is not in the current graph are kept and grouped under
  "Target not in graph". Empty state: "No notes yet. Select a node or edge
  and press N."
- Tier 3: Pattern editor as a non-modal 360 pop-out in the activity-panel
  lane, anchored to the pattern row, so the Matches list and the highlight stay
  live while editing. It is not anchored over the canvas: that is the preview's
  one fixed home and two surfaces arriving in the same place teach the wrong
  lesson (6.11), and a 3a pop-out already leaves the canvas live, so the canvas
  position buys nothing and costs the anchor. Ego network is a 280 pop-over on
  the inspector's Ego network action rather than a dialog (Hops 1 to 5, default
  1; Max nodes, default 1,000; with a size preview): 6.11's first question is a
  no, nothing commits, and the canvas must stay touchable for the size preview
  and the ring chip to be worth drawing.
- Capabilities: search, filtering, saved-filters, pattern-search,
  neighborhood-expansion, ego-network, node-selection, selection-statistics,
  view-bookmarks, temporal-navigation, notes (section 5.7).
- Status note: filters, saved filters, neighborhood expansion, ego network,
  Select all visible and the time slider require the node and edge
  visibility layer and the time attribute detection listed in 5.8; the
  controls are designed here and marked "Coming" in mockups until they ship.

Resting state and doors in Explore (6.11). Explore's surplus is verbs, not
parameters, and about half of it is not a disclosure problem at all: 6.11
already routes verbs to menus and Rules 7a and 7c already delete rows that say
nothing. Eight sections in one fixed order, on every board and in every state:
Filter builder, Filters, Sets, Views, Find a pattern, Neighborhood expansion,
Step through time (only when a Time role exists), Notes. Eight collapsed
sections are 264 px and never scroll (6.9), and that skyline is the target the
panel is measured against. At rest the panel is 10 rows on the first-load
screen, 20 with filters, sets, views and notes in play, 13 on a multi-selection
and 11 with the time slider docked; the selection inspector is 24 rows on one
node and 16 on a multi-selection. Those resting counts stand, because no
section's default open-or-closed state changed and that is what pays for the
rows coming back: Neighborhood expansion draws two more when it is opened,
Step through time two, Find a pattern two once it ships, and Selection
statistics three in the inspector -- four rows on the panel and three on the
inspector, none of them at rest.

What leaves without a door. The Selection actions section, whose five verbs
join the Select split button's menu. The inspector's action block, which caps
at four rows in every selection state with the remainder in the block's More
menu, each verb keeping its full text -- what may never move into that More
menu is the split button's cost estimate and its "All 12,412 may slow the
canvas down. Expand all anyway", because floor item 4 binds an estimate to the
control that spends it, and every departure line. "Around the selection" stops
being an Explore section, because 5.4 already assigns selection-scoped actions
to the inspector. And the "More..." text row is retired from the panel
vocabulary outright: a text row that hides two sections is a third disclosure
mechanism doing the job of the other two. At zero rules the Filter builder is
one 32 px row with a plus and NO chevron, because "Match all" at zero rules is
a default, "20 of 20 nodes would match" is the null statement 6.2 forbids, and
a chevron over nothing is what 6.11 forbids -- the rule does not require rows
to be invented so that one can be drawn; with rules it draws them and takes
the expression door above. And the filter
strip carries no time chip while the slider is docked, which 5.1 already
forbids and which printed the window a third time.

The pop-over inventory for Explore and the selection inspector:

- One filter rule, 360, from the rule row, titled with the rule read back.
- Filter expression, 360, from the section header's Builder and Expression
  door.
- Neighborhood expansion, 280, from the gear on its expanded section:
  direction, the max-nodes cap and the per-type checkbox list.
- Ego network, 280, from the inspector's Ego network action.
- Pattern editor, 360, panel lane, anchored to the pattern row.
- Time slider settings, 280, from either the panel gear or the bar gear,
  anchored to whichever one was used (6.11). The bar gear does not move to the
  bar's left end to buy a right-aligned pop-out clearance from a right-aligned
  legend: under the anchor rule the pop-out slides along the bar instead, so
  the gear stays where users have learned it and the fix costs no control move.
- The Notes header filter door, 280, collapsing the four filter chips, the tag
  picker and the sort control; and the note editor, 280, anchored to the row it
  edits.

Refused doors in Explore: the notes list itself, which stays inline on floor
item 7 and the scan argument -- fourteen doors to find the note you half
remember is the case 6.11 refuses, and size alone is never a trigger -- the
search results list, and the neighbour list.

Row types in Explore (6.9). The Search label becomes the field's own
placeholder and its syntax sentence stays on the info circle (Rules 3 and 8).
The filter builder's attribute, operator and value are one thing, so they are
one RT-2 compound box divided by hairlines rather than three labelled stacks,
and they live in that rule's pop-out (6.11); the Builder and Expression switch
is a trailing door on the section header rather than a resident tab pair --
a door on a section that draws its own rule rows, and so a door on resident
content rather than the section itself (6.11) -- opening a separate 360 pop-out
for the JMESPath field. Depth, hop and cap numbers are
field rows whose units ride as dimmed suffixes -- 2 steps, 500 nodes, 3 hops
-- never as labels and never as parentheticals (Rule 5). Note rows, saved
filters, selection sets, bookmarks and match lists are RT-6: they carry the
user's own strings, so they keep their left-hand text column (floor item 7),
with the unit word repeated down the column rising to its header (Rule 9). A
section the data cannot support does not render at all rather than rendering
disabled -- "Step through time" is absent until a Time role exists -- and a
section the data supports but that holds nothing is one 32 px row: dimmed
name, one + in the trailing slot, no empty-state sentence (Rule 7c, RT-8).

Filter semantics. A filter defines the render set. Above the threshold
filtered-out nodes are hidden, not dimmed, and their edges dropped; a "Show
context" toggle on the filter strip draws them as a low-alpha point layer
only when their count is under the render ceiling. While a filter applies
the status bar reads "Applying filter... 40%  Cancel".

Time slider. A canvas overlay along the bottom edge, 70 px tall, carrying the
transport (play, pause, step, scrub), the track with its tick marks and
timestamp density sparkline, the playhead, the Viewing readout, the time
attribute name, and a gear that opens the "Step through time" pop-out (6.11,
5.3 Explore), and nothing else: the Window, Step, Cumulative, Sliding and
Speed row leaves the bar, because one behaviour has one home. The gear's title
is "Time slider settings" with no key chip, because 5.6 binds T to toggling
the slider and a control may not print a binding it does not own. Keyboard stepping (comma and period step back and forward from
anywhere, Shift+comma and Shift+period jump to the start and end; Space
(play, pause) and arrow keys act on the slider only while it has keyboard
focus), tick marks and a density sparkline of timestamps behind the track.
The step button reads "Step forward" with the size in its tooltip, in the
Time role's units. The window is printed twice and not four times: on the
slider bar and in the status bar Viewing slot. The time attribute
select lists node and edge date attributes in two groups; with an edge
attribute the window filters edges and hides nodes with no visible edge. A
"Compare with another window" action enters Compare mode. While a window is
active every count reads as visible of total. The window is a visibility
mask on the loaded graph; it never re-layouts, rebuilds or removes data.
Above the threshold out-of-window elements are hidden, not dimmed. When the
slider is switched on, a per-step summary table (visible counts, per-type
counts, top 5 by in-window degree, largest-part share) is computed in the
background with "Preparing 26 time steps... 12 of 26" in the status bar; the
Viewing readout, counts, legend and inspector summary read from it, so
scrubbing is instant. Playback advances only when the previous step has
rendered. Closing the slider restores the full graph.

Ego network. At every size Ego network filters the canvas to the N-hop
subgraph and shows a canvas chip "Around acct-4471, 2 hops" with + and -
steppers that change the depth in place (1 to 5); Radial's Max rings follows
the hop count. Above the threshold it applies the radial layout to that
subgraph only; ring members beyond 200 aggregate into labelled arcs.

Pattern search. Closing the pattern editor keeps the Matches list and the
canvas highlight. A pattern run shows progress in the status bar, times out
after 30 seconds with partial results, and adds a history entry. Above the
threshold the pattern runs on the visible graph, requires at least one
anchored type or attribute constraint, shows the anchor candidate count
before Run ("anchors on 8,400 process nodes"), reports "scanned 31% of
anchors" in the status bar, and on timeout offers Continue; the history
entry records the scanned fraction so a timed-out hunt is never read as a
negative result. The Matches list shows 50 rows at a time with Show more
and "See all in data table"; the time box, not the list, bounds the search.

Analyze

- Tier 1: Two sub-tabs at the top of the panel, Run and Results (N),
  remembered; an insight card opens Run, then switches to Results on
  completion. The panel title row has a view toggle, Cards (default) or List,
  remembered, which governs the result cards in Results.

  The resting Run tab is four things and nothing else, in this order:

  1. the scope line, drawn only when the scope is not the whole visible graph
     (Rule 7a). When it is drawn it is the sticky panel header's, stating the
     scope once for every card ("Scope: all 20 visible nodes. Change", or "On
     a sample of 50,000 of 1,000,000 nodes", the Change link opening Explore),
     and a card carries its own scope line only when its scope differs from
     the panel's;
  2. the result cards already run;
  3. a Suggested group of three to five cards, chosen by graph shape
     (directed, weighted, timed, bipartite), by the current selection, and by
     what has already been run;
  4. one "+ Analysis" action row.

  That list is unchanged by this revision except for one subtraction: a card whose run painted loses its encoding controls to the
  resident swatch and the "Change encoding" link. One addition was considered
  and refused, on the record: naming the channel a suggested card will paint
  ("Groups -> colors") is a fact about what a control will do and would be
  floor item 4, but the reading's closing clause already states it at the only
  moment it can be checked ("Colors now show groups"), and a channel word on
  five resting cards is Rule 8's explanation of a thing the next click
  demonstrates. Run is what to compute, Results is what has been computed, and
  neither is where a picture is edited; that is the sentence that keeps Analyze
  from growing a style panel inside it.

  On a fresh graph that is a Suggested group and one row. The catalogue of
  every card and every method lives one click behind "+ Analysis", in a picker
  whose first row is a search field and whose body is the seven question rows
  -- Find groups, Find important nodes, Find weak points, Find paths, Find
  unusual things, Predict, Advanced -- each expanding to its methods. The
  one-line description is the most valuable text about a card, because "what
  is Bridges?" is the question it answers, and it renders in full, as a
  sentence, on the picker row, which is the one moment it answers that
  question; on a card at rest it is the info circle (6.7, Rule 8). This
  reverses the earlier rule that put the description inline under every
  resting card, deliberately: 26 descriptions in a 280 px column is 3,060 px
  of scroll in a 518 px window, and a description on the row you are choosing
  from costs seven reads. The panel is an index of the graph in front of you;
  the picker is the index of the product.

  Card names and descriptions stay canonical and domain-neutral: the Groups
  picker row reads "Cluster nodes that interact more with each other than with
  the rest" on every screen, and only readings substitute the detected
  node-type noun. The pair of names renders on one line or the technical name
  goes to that row's info circle; it never wraps to a line of its own (6.3).
  Each question row in the picker carries "Run all (N)" in its overflow, which
  queues every card in that group with current parameters and lands the
  results as ordinary result cards. Results holds one card per run, each
  collapsing to a one-line header, and the tab badge reads "N stale" when
  results are out of scope; an empty Results tab is a dimmed tab name with no
  count and no "No results yet" sentence (Rule 7a, RT-8). On desktop the panel
  header carries the scope line and the weight row and nothing else: the graph
  statistics block is not drawn there, because it is a character-for-character
  copy of the inspector Counts section rendered at the same moment 900 px to
  the right. On iPad the block stays, since 5.2 allows one overlay at a time.
  - Graph statistics summary, two groups. Instant rows (from the loader or
    one background pass after load): nodes, edges, direction, weighted with
    the weight attribute name, average links per node (technical: mean
    degree), density, connected parts as "3,412 (largest holds 91%)",
    self-loops and parallel edges when non-zero (repeated edges are counted,
    never dropped; the count reflects the import policy), shown as visible
    of total while a filter or window is active. Density below 0.001 reads
    as a ratio, "1 in 50,000 possible links exist (2.0e-5)", and average
    links per node leads. On request rows live in tier 2 All statistics.
- Tier 2: Panel-level settings shared by every card, drawn as two rows and
  not five. The weight attribute (every numeric edge attribute, so a STRING
  evidence channel can be chosen directly; defaulted from the Weight role in
  Loaded data; "None" for unweighted) and the way it is read share one RT-2
  compound box divided by a hairline (6.9), because an attribute and its
  treatment are one thing; the words "Treat as" go, since "Strength" and
  "Distance" name the treatment on their own, and the note "confidence scores
  are strengths; travel times are distances" is the box's info circle. The
  word "Weight" stays as a word: Rule 4 gives an in-field glyph only to a
  control that scrubs or to a verb, and this one is a select. On directed
  graphs a Direction row follows, an RT-3 group of two drawable buttons,
  follow edges and ignore direction. A per-card override of either appears
  only when a card's value differs from the panel default, which is Rule 7a
  in its ordinary form. Per-card
  parameters with defaults, and a "Method" select where more than one
  algorithm answers the same question (a variant is always a Method on the
  existing card, never a new card; the technical name and the result card
  title echo the choice, "Communities (Leiden)"). The caveats line names the
  effective settings: "Directed, weighted by amount as strength" or
  "Unweighted, direction ignored". Cards whose algorithm has its own
  direction mode (Most connected: Incoming, Outgoing, Both; Well-connected
  neighbors, Hubs and authorities, Attenuated influence: in, out, total) show
  that control instead of the panel-level one. On stochastic or sampled
  cards (Groups with Louvain, Leiden or Label propagation; Bridges and
  Closest to everyone when sampled): Random seed and Sample size, printed in
  the caveats line ("Approximate, k=100, seed 42"); these fields render only
  on cards whose engine accepts them (5.8), and the caveats line never says
  Approximate for an exact run. Every card has a Scope control: Visible
  (default), Selection (N), Set..., Whole graph, Largest component; disabled
  choices carry a tooltip. Also: All statistics, a section that expands in
  place onto the three figures a reader opens it for -- how tightly linked
  (density) 0.031, the longest shortest path (diameter) 5, the typical
  distance (average path length) 2.99 -- each carrying its own "Computing..."
  on its own row until its pass finishes, which is what retires the stub's
  "Computing 3 of 7" contortion; its header's trailing slot
  reports state while the section is CLOSED -- the progress string while the
  passes run, the count when idle, the name primary once values exist -- and
  that progress string is the one mark that survives the section being opened,
  because each resident row reports only itself (6.11); its gear opens a 360
  pop-out holding the long tail and the policy (graph
  type, giant component share and isolated node count, the degree distribution
  summary, clustering, Recompute, "Recompute on every filter change", Copy
  values and Export CSV); below the threshold every figure
  computes on opening the section, above it each shows "Not computed"
  with "Estimate (100 sampled sources, about 8 s)" and the result carries
  the caveats line "estimated from 100 samples" or a lower bound "at least
  14 (two sweeps)"; diameter and average path length are exact below the
  exact-computation cap and BFS-sampled above it; rows are recomputed on
  filter change only below
  the threshold, otherwise they read as totals with the caveat "for the full
  graph"; the footer reads "Instant rows follow the data. Computed rows: [time]" and
  nothing else, because Copy, Export CSV and Recompute are hover-revealed
  icons on the section header they act on (6.8), each with a full-text twin in
  the section's overflow menu; and the per-row caveats travel with their rows,
  resident or behind the gear; histograms of computed metrics, whose attribute picker
  ends with the "Not computed yet" group (5.4, Style layer) so a metric can be
  chosen before it has been run, with "Compare two
  metrics" (an X and Y scatter with a log toggle in a 480 pop-out; brushing
  selects nodes against the live canvas, which is why it is tier 3a and not a
  dialog, and feeds "Combine into a score"); the group header action "Run all node
  rankings" (technical: "All centralities") on Find important nodes, which
  queues Degree, Betweenness, Closeness, PageRank, Eigenvector and
  Clustering coefficient with size-aware defaults and shows the summed
  estimate above the threshold; and History: the full view of the one
  history store (5.1), one row per undoable action and per algorithm run,
  newest first, each with plain name, technical name and method, parameter
  summary (the same command vocabulary as AI tool calls: name, parameters,
  weight attribute, scope, timestamp, result summary; imports, table joins
  and identifier mappings carry their key column and match counts), scope,
  duration, timestamp and a current-position marker. The row title is a link
  that does what an Insights card click does (7.3 item 2): it opens the step's
  home panel, scrolls to the control or result the step produced and
  highlights it for two seconds, and never re-runs anything; the title is
  visually distinct from the row body, which keeps click-to-preview and
  double-click-to-restore. Per-row actions Re-run, "Re-run with changes" and
  one copy control (6.8) whose menu holds Copy as JSON and Copy as command;
  section actions Replay all on current data, Export history (JSON), Export as
  script (console text, section 5.3, AI), Copy as commands, Copy as methods
  text (a generated paragraph) and Clear history (asks for confirmation);
  and, directly under History, a `Recipes` library section (5.3, Saved
  things), because creation belongs where the steps are: an RT-8 header with
  the count and a plus titled "Save as recipe...", rows carrying the recipe
  name, its step count and its date, a row click replaying it on the current
  data, and an overflow holding "Import recipe..." and "Export recipe (JSON)".
  History's own actions therefore no longer carry "Save as recipe..." (it is
  the plus one section down) or "Import and replay" (it is "Import
  recipe..."), and mid-session there is at last somewhere to see the recipes
  you have saved. The
  Data panel's Cleaning steps is a filtered view of this list. Memory:
  parameter section open state is per card and global across datasets.
- Tier 3: the per-card gear opening the Advanced block as a 280 tier 3a
  pop-out anchored to the parameters row (6.11), holding tolerance, max
  iterations, endpoint inclusion, any option flagged advanced in the
  algorithm's option schema, and "Run as sweep..." (below), so Advanced stops
  pushing Run below the fold. The gear draws in the primary colour rather than
  dimmed whenever any hidden option deviates from its default, which is
  6.11's stub obligation. Any Advanced field can be pinned into the tier 2
  body; a pinned field renders inline and does not render in the pop-out, and
  pins are remembered per card. A panel-level More MENU, not a section: one
  overflow glyph carrying Compare (below), the "Track changes over time"
  (temporal analysis) dialog and the batch removal scenario dialog, each row
  keeping the verb's full text. A header plus three verbs that each enter a
  mode or open a dialog is five rows spent on one glyph, 6.11 already routes
  verbs to menus, and Compare has six other entry points, so this row is
  nobody's first route.
- Capabilities: basic-statistics, statistics-panel, metric-histograms,
  degree-analysis, centrality-degree, centrality-betweenness,
  centrality-closeness, centrality-eigenvector, centrality-pagerank,
  clustering-coefficient, community-detection, community-profiling,
  component-analysis, shortest-path, all-paths-finding, path-highlighting,
  link-prediction, anomaly-detection, removal-impact-analysis,
  temporal-analysis, comparison-view, analysis-history, algorithm-progress.

Resting state and doors in Analyze (6.11). Analyze already obeys the rule the
rest of this revision applies, and that is recorded here so a later compaction
pass does not "improve" it. Confirmed as drawn and not to be moved: Metric
histograms stays inline, because a reader comparing five distributions cannot
open five doors; History stays inline, a scan list 6.11 refuses by name; the
per-card Advanced gear with its pinnable fields is the pattern every other gear
in the product copies, and Style now copies it verbatim; and the picker's suggested-method
scan list stays resident with Run in full text on every card.

One entry on that list is corrected rather than confirmed. All statistics was
written down as staying a door with its "Computing 3 of 7" stub; it is now a
section that expands onto density, diameter and average path length with the
long tail behind a gear, and the stub string survives as the mark its header
carries while it is closed (above, and 6.11). The per-card Advanced gear gains
the one parameter a reader of that method actually turns -- Resolution on a
community method, Damping on PageRank -- as a resident row on the card, so the
gear is an addition to content rather than the card's only route in. The Run
tab rests at 14 rows rather than 18, and draws three more with All statistics
open and four more with the sweep's Runs section open; the resting count is
unchanged, because both sections still default closed, which is what pays for
the rows coming back.

Two corrections. The panel-level More row becomes a menu (above). And the sweep
run table renders twice rather than three times -- on the panel card and in the
inspector, which is one control at two scopes -- instead of a third time as a
set of agreement bars; three renders break "One result body renders on screen
at a time", and the room test decides it independently, because the panel copy
has had to drop the modularity column to fit and that is how a squeezed table
announces itself. The rendering that leaves is the agreement block, which
becomes the contents of a gear on the Runs section rather than the section
itself. The sweep's panel card keeps its title, its reading, a one-line run
record with its Details chevron and the applied action row, and its Runs
section expands in place onto the caption row "resolution | groups" and one row
per run -- 0.5 / 4, 1.0 / 7 carrying the mark that says which run the canvas is
reading, 1.5 / 11 -- with "Runs 3" as the mark its header carries while it is
closed.

Rule 7a is enforced on the cards, which it was not. A Method select reading
"PageRank" under a card titled "Influence PageRank", and "Louvain | Visible
(200)" under a card titled "Groups Communities (Louvain)", are defaults
restated by the title on the same screen, and Rule 7a and Rule 8 each delete
them independently. Method returns as a top-level control the moment it
deviates, because which community algorithm ran is a decision point in the
workflows; this is a rendering rule, not a tier change.

The pop-over inventory for Analyze: Advanced parameters, 280, from the gear on
a card that draws its own commonly adjusted parameter; the All statistics long
tail, 360, from the gear on that expanded section; Run record Details, 360,
from the Details chevron, which appears on eleven boards and must open
somewhere; the sweep's agreement block, 480, from the gear on the expanded Runs
section; Compare two metrics, 480; and one group's profile, 360, from the
clicked table row.

Two refusals with reasons. Recipes stays a collapsed library section rather
than becoming a door: it buys none of the three things a door must buy (6.11),
its RT-8 trailing slot carries the recipe count, and its plus stays resident
under Rule 7b's carve-out. And the "+ Analysis" catalogue is not an anchored
pop-over. This is the one place in the revision where anchoring a surface to
its parent and 6.11's own geometry point in opposite directions, and the
geometry wins for two reasons, the second measurable. It is not one member of a
list and not a report read once; it is the index of the product, seven groups
and twenty-six cards. And with the panel open the canvas band runs x 328 to
1160, so the preview's fixed centred home occupies x 604 to 884, while a 360
pop-out at x 336 runs to 696 and a 280 one to 616: every rung of the width
ladder collides with the preview, and 6.11's own remedy -- where the centred
fallback is in play the preview does not open -- would cost the picker the one
thing it has that a list of names does not. The picker is therefore the
product's one panel-scale drill-down, and this document stops calling it a
popover.

Question groups are the picker's seven rows, not the panel's. Each is a
collapsible header inside the panel-scale drill-down "+ Analysis" opens; it is
not a popover and 6.11 records why. An open header shows
the group name alone. A collapsed header shows the group name and the card
count as a dimmed trailing number ("Find groups  4"), because the count is the
only thing a collapsed group can tell you; its tooltip reads "4 questions in
this group". An expanded but truncated section carries its count for the same
reason; an expanded and complete one does not, and no header carries a key
chip (5.6). Seven headers are sixteen words and about 196 px, which is the
whole catalogue's resting cost. A card promoted into Suggested, or already
run, keeps its place in its group and is marked there as run, so the picker
stays the one complete map of what this product can compute.

Row types and routes in Analyze (6.9, 6.4). Every parameter that used to be
an 11 px label line above a 24 px input is a field row whose label is the
glyph in its slot: Method and Damping on one pair row, Tolerance and Max
iterations on the next, sample size and seed behind the Advanced door. The
word "Parameters" is a 12 px chevron on the card's action row, and the card's
second-visit verbs hide until the row is hovered -- except Run in every form
and Cancel, which are floor item 4 and keep their full text always, because a
play triangle on a card holding Method, Scope and Advanced reads as preview
rather than as spend forty seconds. A caveats line is drawn only when there is
a departure to name (Rule 7's corollary), so three identical "Exact. Directed,
weighted by amount as strength" lines on one screen collapse to none, and
"Approximate (sample of 200)" is loud again. Summary statistics over a
distribution are drawn as an RT-9 chart row with its two axis ends labelled,
not printed as four numbers and a sentence. The three routes 6.4 requires for
a catalogue that no longer rests in the panel are named here: the picker
behind "+ Analysis" is the home-panel route; the command palette is the
second, indexing every card and method by both names, plus question phrasings,
outcome words and the filter tokens of 5.5; and the Insights strip (7.3) is
the third, surfacing three to five runnable cards on load, exempt from the
icon rule and keeping its sentences. The AI panel and the console remain
principle 3's free-form route. Nothing leaves the palette index because it
left the resting panel.

Cost classes are an internal cost model: they select each card's estimate and
its ask, warn, sampling and time-box behaviour, and they gate which cards the
Insights strip may offer (7.3). No class name ever appears in the interface:
not on a group header, not on a card, not in a tooltip, not in the palette,
not in a caveats line. A group's class is a range in any case, so "3 cards,
instant to cubic" says nothing, and every heavy card finishes instantly at
twenty nodes. What the user sees of cost is an estimate in units of time, and
a warning when it is large. The Cost class column in the table below is
engineering reference, not label text. Status tags refer to 5.8.

| Group | Cards | Cost class (internal) |
|---|---|---|
| Find groups | Groups (Communities; Method: Louvain default, Leiden, Label propagation, Girvan-Newman on graphs under 500 nodes, Tight clusters (Markov clustering, MCL; Granularity 1.2 to 5, default 2.5) [wrapper needed], and once wrapped Spectral, Hierarchical (with a level slider)); Connected parts (Components; on directed graphs Method: Ignore direction (weakly connected), Follow direction (strongly connected)); Core layers (k-core; Layered grouping shape; minimum core number at tier 2) [wrapper needed]; Tight-knit neighborhoods (Clustering coefficient) [new work] | heavy (Louvain, Leiden); iterative (Label propagation); instant (Components, Core layers); unbounded (Girvan-Newman) |
| Find important nodes | Most connected (Degree; Incoming, Outgoing, Both on directed graphs); Influence (PageRank; Method: PageRank default, Katz (Attenuated influence); tier 2 "Relative to selection" node set for personalized PageRank [wrapper needed]); Closest to everyone (Closeness); Well-connected neighbors (Eigenvector) | instant (Degree); iterative (PageRank, Katz, Eigenvector); sampled above the threshold (Closeness) |
| Find weak points | Bridges (Betweenness); Bridge edges (Edge betweenness) [wrapper needed]; What breaks if removed (Removal impact) [new work]; Bottleneck capacity (Max flow and Min cut; From and To pickers, Capacity attribute, global cut when both empty; Method: Between two nodes, Global (Stoer-Wagner), Global randomized (Karger)) | sampled above the threshold (Bridges, Bridge edges); instant (one-node Removal impact); unbounded (batch Removal impact); heavy (Bottleneck capacity) |
| Find paths | Find a path (Shortest path; Method: Auto, BFS when unweighted, Dijkstra when weighted, Bellman-Ford shown only when a negative weight exists); Distance from here (BFS levels, Dijkstra when weighted; one From picker; Node metric shape with the field "Steps from <root>", technical bfs level, so Encode as style, Filter above threshold, Custom score and the table column apply; a clicked target shows its step list); Every route (All simple paths) [new work] | instant (Find a path, Distance from here); seed suggested above the threshold and unbounded (Every route) |
| Find unusual things | Unusual nodes (Anomaly detection) [new work] | iterative |
| Predict | Likely missing links (Link prediction) [wrapper needed]; Project to one node type (Bipartite projection) [new work], a tier 1 card shown only when the graph is bipartite, Edge set shape with Add as edges, Replace graph with projection (an undoable Cleaning step) and Export CSV, no insight card; Score against held-out links (Hold-out evaluation) [new work], a tier 2 block on Likely missing links (hold-out fraction, default 10%, seed; results precision at K, recall, coverage; Export CSV), no insight card | heavy; seed suggested above the threshold (Likely missing links); light (Bipartite projection); heavy (Hold-out evaluation) |
| Advanced (collapsed by default, expansion remembered per 6.5, never in the Insights strip, always indexed by the palette and the AI) | Hubs and authorities (HITS; directed graphs only); Backbone (Minimum spanning tree; Method: Kruskal default, Prim from a start node); Best pairing (Bipartite matching; shown only when the graph is bipartite); Farthest apart (Eccentricity and diameter; Floyd-Warshall); Walk from here (DFS discovery order; From picker) | iterative (HITS); instant (Backbone, Walk from here); heavy (Best pairing); cubic (Farthest apart) |

Cost classes: instant (Most connected, Connected parts, Find a path,
Distance from here, one-node What breaks if removed), iterative (Influence,
Well-connected neighbors, Tight-knit neighborhoods, Unusual nodes, Groups by
label propagation, HITS), heavy (Groups by Louvain or Leiden, Bridges,
Closest to everyone, Bridge edges, Bottleneck capacity, Likely missing
links), sampled above the threshold (Bridges, Closest to everyone, Bridge
edges), seed suggested above the threshold (Likely missing links, Every
route: a seed or the selection is pre-selected; clearing it warns with the
estimate and confirms, never disables Run), cubic (Farthest apart, All
statistics diameter and average path length, Spectral, Hierarchical),
unbounded (Find a pattern, Every route, Girvan-Newman, batch What breaks if
removed), windowed (Track changes over time: the tracked-metric estimate
times the window count, subject to the ask and warn limits; the windows run
through the sweep queue as one cancellable unit, and on cancel the completed
windows are kept with the caveat "Stopped after 12 of 26 windows"). Above
the threshold: Groups
defaults to Label propagation with Louvain as a tier 2 choice showing its
estimate; Bridges and Closest to everyone add a tier 2 "Sample sources"
field (default 100, seed at tier 3) and their caveats line reads
"Approximate (100 of 1,000,000 sources, seed 4171). Ranks near the top are
reliable; small values are noise."; Likely missing links pre-selects a seed
node or the selection at tier 1 (all-pairs scoring is quadratic) but Run
stays enabled: clearing the seed shows the estimate and confirms, "All
pairs of type user to item, top 50 per source, about 40 min. Run anyway";
"Around the selection" also accepts a named set for a batch over all its
members, and Top N and Top K per source remain the limiters; Every
route has tier 1 Max steps (default 4, 3 above 1M edges) and Max routes
(default 100); batch What breaks if removed is capped at 20 scenarios per
batch, each scenario any node set within the selection cap, and Simulate
removing (N) above the selection cap warns and runs as one scenario. Sampling
applies only above the large-graph threshold; the expert artboard at 200
nodes runs exact. Any card whose estimate exceeds the warn limit in
Settings > Performance shows a warning under Run, "About 3 h at this size.
Filter to a part, or run the sampled version", and Run reads "Run anyway
(about 3 h)" and confirms once. Cubic cards above the exact-computation cap
(Settings > Performance, default 2,000 nodes) warn "Exact computation at
this size may take hours; Find a path answers one pair instantly" and keep
Run anyway; they are never Insights cards. Unbounded cards always run time-boxed
(5 s for Every route, 30 s for patterns) with a max-length or max-results
parameter at tier 1 and the caveat "Stopped after N s, showing partial
results". The result card names the method in its technical label and
caveats line. The palette indexes every method name; "Modules" is an
accepted synonym for Groups in the palette index. The fraud sample blurb
points at Connected parts (Follow direction) rather than bridges.

Path cards have From and To node pickers at tier 1 (typeahead over ids and
labels from a prefix index built at load, capped at 20 suggestions, plus
"Use selected": one selected node fills From, two fill both; To also accepts
"Any node in set or filter", returning one row per reachable target). Run is
disabled until required pickers are filled; the precondition is stated once,
by the disabled Run button's tooltip ("Pick a node first"), with the empty
From and To fields carrying it visually. It is not repeated as body text on
the card. "Leave both empty for the global cut" is the one such line that adds
a fact rather than restating a control, so it moves to an info circle on the
From and To pair (6.7).

Option kinds. Every card control is one of: node picker (tier 1 on the card,
the Use selected rule applies); node set (tier 2, "Use selection (N nodes)"
button); attribute picker (tier 2, lists edge or node attributes of the
required type, defaults from Import); method select (tier 2, exactly one
choice, replacing any pair of exclusive booleans); bounded integer (tier 2,
bounds computed from the data, for example k up to the maximum core); seed,
tolerance, max iterations, endpoint inclusion, iteration counts and any
option flagged advanced in the algorithm's option schema (tier 3 Advanced
block). Implementation toggles (optimized, delta, bidirectional, recursive)
are never shown; the size-aware rule sets them. The option schema's advanced
flag means tier 3 and its group names the tier 2 section, so the tier for an
option is derived, not chosen (6.2).

Link prediction tier 2 parameters: Method (Common neighbors, Adamic-Adar,
Jaccard, Preferential attachment, Resource allocation; the last three carry
the Coming tag, 5.8), Top N (default 50), Around the
selection (node set), node-type pair and hops from seed (new work, 5.8), and
the "Score against held-out links" block (technical: hold-out evaluation;
Coming, 5.8): hold-out fraction (default 10%), seed, then precision at K,
recall and coverage against the held-out set, with Export CSV; its run
lands in History with the fraction and seed in the run record.

Running and scope. Analyze runs on the visible graph (active filters, time
window and subset) by default; "visible" means the data scope, never the
render set. The scope is printed in the run record. When the visible set
changes after a run, the result card and its inspector view show a muted
line "Scope changed: computed on 200 of 200, now showing 120" with Re-run,
and the Results tab badge reads "N stale". Runs execute off the main thread
on a compact adjacency built once per load and per window; a card's Run
becomes the progress row "Computing Bridges (betweenness)... 42%  1.8 s
Cancel" when the algorithm reports progress, or "Computing Bridges
(betweenness)... 1.8 s  Cancel" with an indeterminate bar when it cannot;
"Queued (2 of 3)" when several are queued. The status bar mirrors the active
row and "and 2 queued". Cancel takes effect within 1 s. On completion a
result card replaces the row. The estimate appears exactly once per card, in three bands: under 2 s nothing
at all; from 2 s to the ask limit an 11 px dimmed estimate immediately left of
Run; above the ask limit the estimate moves onto the button ("Run (about
40 s)") and Run confirms once; above the warn limit the card carries the
section 3 warning line and the button reads "Run anyway (about 3 h)".
Estimates round to one significant figure and are written with the words
about, s, min and h; never a tilde. The estimate never appears twice on one
card, and the scope line never carries it. The picker row and the List view row
carry the estimate in the same bands, so neither is the cheaper way to hide
cost.
The estimate itself ("about 40 s") comes
from a per-card cost model in nodes and edges (Bridges, Every route and
Likely missing links as a function of edges; Every route warns above the
threshold with "Slow at this size; filter to a subnetwork first" and keeps
Run anyway), calibrated once per device
by a short probe run and stored; above the ask limit (Settings > Performance,
default 10 s) Run reads "Run (about 4 min)" and confirms; above the warn
limit the card warns and confirms as in the question groups table. Instant and
iterative classes run at once, the caveats line saying converged or not. A
time-capped run reports "Stopped after 60 s at pass 4; result is partial" in
its caveats line. The caveats line drops its scope clause when the scope is
the whole graph, and keeps it verbatim whenever the run was sampled,
restricted to a component, filtered or windowed; sample size and seed are
stated once on the card, not once per line. While a load is in progress the
partial-data caveat is carried by the sticky panel scope line, not repeated on
every card. A control is never shown that does nothing: if a run
cannot be cancelled in this build, Cancel is hidden and the row says the app
will pause. Sampled betweenness and the Louvain seed are new work
(5.8); the mockups draw them with the Coming tag, and until they ship the
size-aware default for Bridges is the estimate-and-confirm path and the
"Approximate (sample of N)" caveat does not appear.

Rankings summary (technical: consensus of node metrics). A batch of two or
more node-metric results -- "Run all node rankings", a group's "Run all (N)",
or any two runs the user asks to compare -- emits one Rankings summary card in
addition to the individual cards: the union of the top N across methods, one
rank column per method, an agreement column ("top 10 in 5 of 6"), the pairwise
Spearman rank correlation of the top 20, the agreement sentence as its
reading, and the actions Select agreement set, Combine into a score, Encode as
style, Export CSV and See all in data table. The Data table drawer's "Compare
measures" control reads the same N and k. A node-metric reading gains the
follow-up "Check this against other measures", gated by the summed estimate
against the ask limit. The card is emitted only from a batch of two or more,
never from a single run, so the novice single-card path is untouched.

Run as sweep. In the Advanced block: pick one numeric parameter (resolution,
damping, sample size, seed, top N), give a value list or a range (from, to,
step); runs are queued through the existing progress row ("Queued (k of
n)", cancellable as one unit) and produce one result card per value
labelled with the value ("Groups (resolution 0.5)") plus one Sweep summary
card. The run table (value, headline statistic such as group count and
modularity or top node and score, duration) is the Runs section's own resident
content, a caption row over one row per run, and it draws in that form both on
the Sweep summary card and in the inspector, which is one control at two scopes
rather than one fact twice in one region (6.11); Keep per row stays on the run
row it materializes into a normal result card. Its sparkline and the pairwise
agreement between partition runs (NMI) or the rank correlation of the top 20
for node metrics live behind the gear on that section, in a 480 pop-out,
because a pairwise comparison of three runs is a matrix and cannot be drawn
honestly in a 256 px band; Compare opens Compare mode with two rows and Export
CSV writes the table from there. The panel's Sweep summary card carries the
headline plus Keep, Compare and Export CSV, so the comparison apparatus renders
once even where the run rows render at both scopes. Each run
lands in History.

Compare. Plain name "Compare", technical name "Comparison view". A canvas
mode, not a dialog (6.2 test). Compare splits the canvas vertically (default
50/50, draggable from 30/70 to 70/30); each half carries a label chip and a
source picker (an algorithm result from the Results section, a saved filter,
a time window from the time slider, a bookmark, the current view, or a
second file opened through the Import options dialog's "Compare with current
graph"); pan and zoom are linked by default with a "Link views" toggle;
Swap; a diff legend (only in A, only in B, changed); nodes present in only
one half or with differing group membership are outlined; the inspector
shows the selected node's metrics from both halves side by side with a
delta column. Entry points: the top bar Compare toggle, each result card's
"Compare with..." (tier 2), a bookmark row's Compare with current, the time
slider's Compare with another window, the Sweep card, and the Analyze More
row (tier 3). Esc or a Single view chip exits and keeps both results. The
picker is the only dialog. Above the large-graph threshold Compare halves
the render ceiling and, above it, both halves draw the same subset with the
diff overlay only and warns "Above the ceiling: both views draw a subset.
Filter to under N nodes for the full diff"; Compare stays available. Compare holds at most one second source.

Compare over a second file. Nodes are matched by id, or by the Match on
attribute chosen in the Import options dialog; the label chips read "A:
tumor.tsv" and "B: normal.tsv" with a one-line summary under each (nodes,
edges, groups). Positions: matched nodes take A's positions; unmatched B
nodes get a short force pass pinned to their matched neighbours; a "Same
positions" toggle sits beside Link views, and Swap's menu offers "Copy
positions A to B". In Compare mode every Analyze card gains "Run on: A / B /
both" at tier 2 (default both), recorded in the run record; results are
namespaced algorithmResults.A.<type>.<field> and algorithmResults.B.<type>.
<field>, the Custom score picker lists "Bridges in A" and "Bridges in B" so
[betweenness.B] - [betweenness.A] is unambiguous (6.6), and side B metrics
appear as columns in the Data table drawer. Every paired result carries a
"Biggest differences" block (node, A, B, delta, the Temporal shape's Biggest
movers form) with Select top N, Filter above threshold, Encode as style and
Export CSV; it writes the delta as a computed attribute. The Graph
statistics summary and the inspector Counts render as A / B / Delta columns
plus the group count per half; the status bar counts read "A 200 | B 412
nodes". Edge membership (in A only, in B only, both) as an attribute is
next-phase work with network collections (section 11); the diff legend and
outlines cover it visually in this pass.

The run is the object; the result and the style layer are two faces of it. A
run is what the run record already describes: an algorithm, its parameters, its
seed, its scope, its timestamp and duration, the engine version, and the fields
it wrote into `algorithmResults.<namespace>.<type>.<field>`. Every route makes
one and only one, and History has held one row per run since 5.1. This revision
makes the run addressable and gives it two faces.

- The result face is the evidence: the reading, the caveats line, the one-line
  run record and the shape body, in the Results tab and in the inspector's
  Algorithm result view.
- The style face is the picture: one style layer whose encoding rows read the
  run's fields, in Style's Layers list and in the Style layer inspector (5.3,
  Style, Analysis-backed layers).

Neither face owns the run. Selecting either selects the run, and Pin to report,
Compare with..., Copy as command, Copy methods text, the Data table column, the
Explore attribute entry and the History row all address the run rather than a
face. Three lists ask three questions with no overlap: Analyze Run is what to
compute, Analyze Results is what has been computed, Style Layers is what is
drawn. This is needed because a layer's binding reads a path that names the
algorithm but not its parameters, its seed or its scope, so MCL at granularity
2.5 and MCL at 3.0 are the same path today and the layer cannot say which one
it is drawing.

One string names a run everywhere -- result card title, layer row, legend
block, History row, Compare label chip, and every string that leaves the app.
It is the card's plain name alone while it is the only run of that card, and
gains the differing parameter in parentheses as soon as a sibling exists:
"Groups", then "Groups (granularity 2.5)". A name a person typed is floor item
7 and never re-derives.

One reading and one run record per run per screen: where both faces could
render them the inspector renders them in full and the panel card collapses to
title, state and headline, which is the rule 1.5 already set. The History row's
"opens the step's home panel" now has two candidate homes -- a run opens Analyze
at its card, an encoding change opens Style with its layer selected -- and it
still never re-runs anything.

The Results tab stays and narrows to two jobs: the list of runs, and the home
of the evidence. What leaves it is the encoding controls, because encoding has
one home and that home is Style (principle 2). A tab that disappeared would
strand the seven shapes that never produce an encoding layer, and strand floor
items 1, 2 and 3 with them.

Result shapes. Every result card and inspector view opens with the
plain-language reading, then a caveats line in muted text (exact or
approximate with sample size, converged or not, giant component only,
filter and window scope, method, weight and direction), then the run record,
collapsed to one line in muted text: method, the parameters that were not
defaults, and scope. A Details chevron opens the full record as a 360 pop-out headed with the
result's own title -- weight attribute and its meaning, direction, every
parameter including seed and sample size, scope with counts, timestamp,
duration and the algorithms package version -- and its position is remembered
per pop-out type under 6.5. Nothing is removed from the panel by this; what
changes is that opening Details no longer pushes the shape body and the action
block off screen. The run record is provenance, not help: it is never placed
behind an info circle, because it reports what was done rather than what a
thing means (6.7). A pop-out is disclosure by tier and a circle is disclosure
by explanation, and that distinction is what makes the Details chevron legal
where the circle is not. Copy as
JSON, Copy as command and Copy methods text live inside the opened Details
block, under the card header's one copy control (6.8).

Cards that belong to one run family -- a sweep, the two halves of a Compare --
render the shared fields once, on the family's summary card or header strip,
and each member's line carries only what differs plus timestamp and duration.

One result body renders on screen at a time. A result open in the inspector
renders its Results-list card collapsed to title, state and headline plus the
primary action; expanding the card restores the full body, and the card
returns to full when the inspector shows something else. Reading, caveats
line, run record and shape body each render exactly once on screen. A pop-out
opened from that body -- a group's profile, the full run record -- is part of
the one shape body and not a second one, which is why both are inspector
pop-outs and opening either closes the other: both are about the same result. A Done
state chip is not drawn: state chips are for Running, Queued, Failed and
Stale. On its first completion a run applies the primary action of its shape as a
style layer automatically, and identically from every route: an Insights strip
card, the panel's Run, the palette's Enter or Cmd+Enter, the console, an AI
tool call, and the attribute-list route of the Not computed yet group. One
capability must not produce two pictures depending on which of principle 3's
routes the user took. Three limits bound it, and there is no preference for
turning it off: a switch would ship two products with two pictures, and the
escape already exists twice, since the application is one undoable step
separate from the result and the layer can be deleted while the run stays.

1. Once. On first completion and never again. A card re-opened, re-selected,
   expanded from its collapsed form or restored from a History position does
   not repaint.
2. Not over a hand. Suppressed when a user-authored layer already drives the
   channel, and suppressed for the same reason once the user has re-bound that
   channel by hand. In the suppressed case the card shows the un-applied
   primary action, its title names the layer that holds the channel, and the
   reading omits its closing clause.
3. One per batch. A batch that emits several runs into one channel -- Run all
   node rankings, a group's Run all (N), a sweep, Replay all -- applies the
   first and lands the rest un-applied; the batch's own summary card carries
   the Encode as style that replaces. Six runs never paint six times.

The applied form of a card's action row is the resident state swatch, the layer
name, and "Change encoding", which opens Style with that layer selected; the
un-applied form keeps the full "Encode as style" button. No result card holds a
palette, a scale or a domain. "Change encoding" is a cross-panel link and is
the first time a result card sends the user to another activity to finish an
act it started, which is deliberate: encoding has one home. The legend updates,
the reading's last clause names the change, and the application is one undoable
step separate from the result.

Two delete verbs, both stated, both undoable, both by toast. "Delete layer"
removes the picture and leaves the run, and the card reverts to its un-applied
form. "Remove result" deletes the run and every layer that reads it, and names
the count before the act -- "Removed Groups (granularity 2.5). Removes 1 style
layer. Undo" -- which is floor item 4. A layer that reads two runs survives the
removal of one, with that binding's Source entry replaced by the row's disabled
form and its reason.

The floor holds across both faces, and the table is here so a later pass cannot
lose half of it:

| Floor item | Result face | Style face |
|---|---|---|
| 1, the reading | always, first, in full | always, first, in full, on an analysis-backed layer |
| 2, every departure named | whenever there is one | whenever there is one; a sampled or partial run that drives a channel says so where the channel is edited |
| 3, the one-line run record | always, with Details | always, with Details |
| 4, before it does it | Run's three estimate bands | Re-run's three estimate bands; the layer count inside Remove result |
| 5, the legend line | not applicable | unchanged; the block title is the run name |
| 6, names | both names per 6.3 | the run name, or the typed name once renamed |
| 7, the user's own data | ids, labels, values | a renamed layer never re-derives |

A rerun
with the same parameters replaces the card; a rerun with different
parameters adds a new card whose title carries the differing parameter
("Groups, resolution 1.5"). Every result card offers "Run again with changes" as a split action whose
secondary item "Run and compare" enters Compare mode with A set to this card
and B to the new run, skipping the source picker; then
Compare with..., Pin to report (section 5.3, Present), Combine into a score,
and a single copy control in the card header (6.8) whose menu carries Copy as
JSON, Copy as command, Copy methods text, Copy as TSV at full stored precision
and, where the shape has members, Copy member ids; display rounds to the Settings >
Defaults decimal places (default 2), and hover on any rounded value shows
the stored value with a copy icon. Then the shape-specific body:

Each shape declares what it writes onto the drawn graph, and that declaration
-- not the shape's name and not a drafter's taste -- decides whether a run
paints and what kind of layer it makes. A run paints when its result is a
property of the elements that are drawn, and what it writes decides which kind
of layer. Six of the thirteen shapes write a value per node or per edge and
make an encoding layer; four write a set and make a highlight layer, exclusive
and above the stack; three write nothing on the drawn graph and make no layer
at all. So three of thirteen write nothing and four write a set rather than a
value, and seven of thirteen never produce an encoding layer. A pair list
scores pairs that are not edges, a fact is one scalar about the whole graph,
and a time series is about time, so none of the three has anything to bind a
channel to; "Show as dashed edges" on a pair list stays a canvas overlay and
"Add as edges" stays an undoable Cleaning step, after which ordinary styling
applies to real edges.

Highlight layers are named as layers because they already behave as layers: a
path highlight persists, dims the rest and renders its own legend block.
Naming it puts its off switch in one place, gives it the run name every other
run has, and lets floor item 5 hold for it. Exactly one highlight layer exists
at a time; a second path or edge-set result replaces the first, which is what
that shape's existing Clear already implies, and Edge set's "Dim the rest"
becomes a property of the highlight layer rather than a separate verb. Two
claimants for the top of the stack are decided here: Compare mode's diff
overlay wins, and the highlight layer is disabled with its reason shown. The
element agrees by construction -- `SuggestedStyles` carries a category enum
(node-metric, edge-metric, grouping, path, hierarchy) which is the same split,
and an algorithm whose result paints nothing simply has no suggestedStyles
method -- and the category is descriptive of what a shape writes, not the
other way round.

| Shape | Used by | Body | Primary action | Writes | Layer |
|---|---|---|---|---|---|
| Node metric | Degree, Betweenness, Closeness, PageRank, Katz, Eigenvector, Clustering coefficient, Anomaly, Distance from here (field "Steps from <root>", technical bfs level) | Top 3 nodes with "See all N ranked" opening the Data table drawer sorted by this metric (virtualized, 100 rows per page, sorted once per column in the background, search over ids and labels, default scope Top 1,000 with Show all behind a confirm above 50,000 rows), with Select top N (capped at the selection cap; "Filter above threshold" as the fallback), Add top N to selection, Filter above threshold, Copy as TSV, Export ranked list (CSV); histogram defaults to log x when max/median exceeds 100 and log y when the tallest bin exceeds 100x the median bin, states the scale in its caption, shows min, median, mean, max and p99 as text, and a line "Zero or near-zero: 912,400 nodes (91%)" when more than 10% tie at the minimum; clicking a bin holding more than the selection cap offers "Filter to this range" instead of selecting. Dual variant for Hubs and authorities and for Incoming/Outgoing: two ranked columns and a toggle for which drives the histogram and Encode as style | Encode as style | a value per node | encoding layer |
| Community | Groups, Components | Top 10 groups by size, then one aggregate row "3,402 smaller groups (2 to 15 members)", then "See all N groups" opening the Data table drawer grouped and sortable with a search box; clicking a row opens that group's profile as a 360 pop-out anchored to the clicked row and headed with the group's own name (computed lazily): top categorical attributes, an "Over-represented values" four-column table for every categorical or list column (count in group versus expected, hypergeometric p), top 3 internal hubs as RT-6 rows, edges to each other group as RT-9 micro-bars per neighbouring group rather than three bare numbers, and the group-scoped actions. The clicked row carries the selected-row fill so the tether is visible, and Up and Down on the table re-target the pop-out rather than closing it, which turns a block fixed to one group into a detail view over every group; "Label group by top value" writing a group label used by the legend; "Compare categories" (technical: enrichment), disabled with "Import a category table (Data > Add attributes from a table, Apply to: Groups) or enable a provider in Settings > Extensions"; Select members (confirms above the selection cap), Filter to this group (primary above the threshold), "Hide groups under N members" (writes an ordinary filter chip "group size >= 4" on the derived group-size field), Copy member ids; the per-group density column reads "links inside", and every modularity value carries the band tooltip from 7.5; Export groups (CSV) at tier 2; when groups exceed 12 the histogram is a group-size distribution on log bins and clicking a bar selects the groups in that size range; histogram bars and legend swatches select that group. Encode as style colors the 11 largest groups and paints the rest the neutral Other color; the button reads "Encode as style (11 of 3,412 groups)". Components leads with "Largest part holds 91% of nodes; 40,312 parts in total, 39,900 under 5 nodes" and offers "Filter to the largest part" | Encode as style | a value per node | encoding layer |
| Layered grouping | Core layers, Hierarchical groups, Girvan-Newman levels | A level control (k slider, number of groups, or step) above the Community body for the chosen level; caveats line names the level; Community actions plus Select this layer and above | Encode as style | a value per node | encoding layer |
| Path | Find a path, Every route, a clicked target of Distance from here | When no path exists the card and inspector show the not-connected result: reading "No path from ph-1140 to merch-88: they are in different connected parts" (naming the parts when a Components result exists), on directed graphs "No path following edge direction" with a one-click "Try ignoring direction" re-run, and for Every route "None within Max steps" kept distinct from "Not connected"; the canvas chip reads "No path"; the caveats and run record lines stay so the negative is citable. Otherwise an ordered step list (node with its type beside the id, then edge type and weight to the next node, a time column per step when edges are timed); clicking a step selects and centers that node, the path highlight persists and the inspector shows the node, matching Notes rows and search results; the step list caps at 8 rows with "and 22 more steps" expanding in place; on the canvas only endpoints and every fifth step are numbered above 10 steps; for Every route a ranked list by length with common intermediates flagged; Highlight this path, Expand around path, Bookmark this path, Copy steps, Export CSV, Clear | Highlight this path | a set of nodes | highlight layer |
| Edge set | Backbone, Best pairing, Bottleneck capacity (cut edges), path edges, Bipartite projection | Headline (edge count and total weight, cut value, or matching size), member edge list (source, target, weight) sortable, click to center; Highlight these edges, Dim the rest, Filter to these edges, Export edges (CSV); for Bipartite projection also Add as edges and Replace graph with projection (an undoable Cleaning step) | Highlight these edges | a set of edges | highlight layer |
| Edge metric | Bottleneck capacity (flow, utilization), Bridge edges | Top 3 edges, See all N ranked (source, target, value) in the Data table drawer Edges tab, histogram, Filter above threshold | Encode as style (line width) | a value per edge | encoding layer |
| Pair list | Likely missing links | Sortable table of source, target, score, common neighbors; Group by source (top K per node); Highlight pair shows the two nodes and their common neighbors; Show as dashed edges; Add as edges; on a bipartite graph the Method select offers path-3 count, projected common neighbors and personalized PageRank, and a caveat warns that common neighbors is always 0 across two node types | Export predictions (CSV) | nothing on the drawn graph | none |
| Removal impact | What breaks if removed | Components before and after, nodes disconnected, largest component change, all computed with the panel Direction setting; a direction-aware "Nodes that lose every path from <root or selection>" count and list (Select, Filter to, Export CSV); a "Broken pairs" row when From/To pairs or a path result exist; severity considers the components delta, the lose-every-path count and broken pairs; Simulate another node; the single-node result appends a row to the Scenarios card | Highlight affected nodes | a set of nodes | highlight layer |
| Scenarios | What breaks if removed (batch; 20 scenarios per batch, each any node set within the selection cap) | One row per scenario (name, removed nodes or edges, components delta, disconnected count, nodes losing every path, broken pairs, giant component delta, diameter delta, severity); Add scenario from selection, check two rows to compare in Compare mode, Reset, Export CSV or JSON | Highlight affected nodes | a set of nodes | highlight layer |
| Anomaly | Unusual nodes | Threshold slider updating "N above threshold", ranked table with Type (degree outlier, structural, attribute) and a Why expander listing factors with z-scores against the baseline; Filter above threshold, Select above threshold, Save as attribute (anomaly_score, anomaly_type) | Encode as style | a value per node | encoding layer |
| Temporal | Temporal analysis | Small time series chart, change-event list with timestamps, metric and magnitude, "Go to this time" per event moving the time slider; Track nodes (typeahead or Use selected) overlays their series; Biggest movers table (node, first, last, delta) with Select and Export CSV; Export time series (CSV) | Go to this time | nothing on the drawn graph | none |
| Category table (technical: term enrichment table) | Category-score tables imported through Table join with Apply to: Groups or Selection: any table of category, score and member ids; in biology these are enrichment results (GO, KEGG or Reactome terms with FDR), described that way only in the tooltip | Sortable rows of category, group, score, member count, members; Remove redundant categories (Jaccard on member sets, threshold 0.5); Select members, Filter to members, Encode as style (membership in the chosen category), Export CSV | Encode as style | a value per node | encoding layer |
| Fact | Farthest apart, negative-cycle check, bipartite check, connectivity, All statistics | One headline value or verdict with a supporting node or edge list when one exists (center nodes, cycle nodes) | Select supporting nodes | nothing on the drawn graph | none |

A drawable default threshold. "Filter above threshold", on every shape that
offers it, opens at the lowest threshold whose match count falls under the
render ceiling, stated as a drawability sentence and never as an analytical
recommendation ("Starting where the result is drawable: 4,120 of 1,000,000
nodes"), with a live count as the handle moves and a warning-coloured "still
above the render ceiling" when it is. Community results carry the same rule as
"Filter to the top N groups".

Each shape declares its required result fields (Node metric: one metric
field, or two; Community: group id per node, group count, modularity; Edge
set: membership per edge plus one headline scalar; Layered grouping: a level
per node) and the plain name under which the app exposes that field in the
filter builder, histogram picker, formula dialog and inspector, with the
technical field name in muted text. Distance matrices are not a shape; they
are reached through Find a path with a From and To lookup. Connected parts
writes giant component share and isolated node count so the reading can say
"One big part holds 94% of nodes; 6 nodes are isolated".

Style

- Tier 1: Style layers list (the existing LeftSidebar content), the layout
  selector (see Layouts below), a `Styles` library section (technical: style
  templates; 5.3, Saved things) replacing the preset chip row: an RT-8 header
  with the name, the count, an info circle carrying the destination line, and
  a resident plus titled "Save as style...", over RT-6 rows at 28 px -- the
  five built-ins first (Default, High contrast, Print, Colorblind safe,
  Presentation), dimmed, each with a "built-in" trailing word, then the user's
  own with a relative date in the trailing slot, the active one carrying the
  selected background. A row click applies the style; row hover reveals rename
  and delete on user rows only; the section overflow holds "Import style...",
  "Export style (JSON)" and "Reset styles to defaults". Styles never change
  the label visibility rule, the 7.2 label cap applies inside every one, so
  Presentation changes label size and node scale only; above the threshold a
  row applies on click, not on hover preview. Then the Show legend switch. The view mode
  control is not here; it lives in the canvas toolbar (section 5.6). Style keeps the layout-driven rules: selecting a 2D-only layout while
  in 3D switches the view to 2D with the status bar note "Switched to 2D for
  Hierarchical"; switching back to 3D while a 2D-only layout is active falls
  back to the last 3D-capable layout.
- Tier 2: Layout parameters and the All layouts list (see Layouts below),
  preset details, Canvas: Background color (defaults to the theme canvas
  token). Per-layer node and edge encoding is not in this panel: selecting a
  layer shows its properties in the inspector (section 5.4), which keeps the
  existing StyleLayerPropertiesPanel structure and adds a "By attribute" mode
  to Node color, Node size, Node shape and Node label, and to Edge width,
  Edge color, Line style and Edge opacity. The sub-mode follows the
  attribute type. Categories: a "Values (N)" SECTION nested in the Color or
  Outline section, expanding in place onto the value rows themselves -- swatch,
  value name, count -- capped at five with an "N more" row, which is the cap
  the canvas legend already takes, with Assign palette and the per-row
  overrides on the rows they act on and the palette-level controls behind its
  gear: palette family and Reverse, value ordering, the "Other" roll-up
  threshold, and Reset per-value overrides. Its header count is dimmed while
  every value is at its default and primary once any value is overridden
  (6.11). Range:
  a door rather than a section, a 280 pop-out from the RT-4 trailing glyph
  titled with the channel and its attribute, holding Scale (linear, log,
  -log10, square root), Palette family (sequential, diverging, categorical)
  with a Reverse toggle, Midpoint (shown for diverging; default 0), Domain
  (auto min and max, editable, with "Clamp outliers at 2nd and 98th
  percentile") over the inline histogram with its live match count, Missing
  value (a color, size or shape for nodes without the attribute; default
  neutral gray), "Use values as-is" (passthrough), which appears only when the
  values parse as colors, sizes or shape names, and gradient handle editing as
  a SECTION of this pop-out rather than a pop-out of its own, because 6.11's
  nesting limit forbids the second surface and its depth obligation states the
  reader-facing consequence. Three things the floor keeps resident beside the
  door rather than inside it: the Palette select, because the palette name's
  only homes are this select and the legend's overflow menu (5.1); the clamp
  departure line ("clamped at -4.2 and 3.8; 12 nodes beyond the ends"), because
  6.10 binds a departure to the channel it describes; and the attribute chip,
  because Rule 6 makes the mode what the field contains. Every one of these
  controls is a field row or a ramp row on the 32 px pitch (6.9): Scale and
  Palette family pair on one row, Domain's two ends share one compound box,
  and a control still at its default is not drawn. A row with no attribute
  bound holds a literal, which is what "fixed" now means; a line style still
  at Solid draws nothing at all. Layer rows show their match count in compact form and hide it
  for the base layer when it equals the total. Above the threshold style
  edits in the inspector are batched behind an Apply button and the status
  bar reads "Restyling 1,000,000 nodes... 38%  Cancel". Undo of a style
  operation restores the previous per-node style ids rather than recomputing
  selectors, and is disabled while a restyle runs.
- Tier 3: Layout gear (advanced options from the schema), animation settings
  (layout transition duration, camera transition duration; above the
  threshold the row reads "Animation: off (Performance mode)" with a "Turn
  on anyway" switch in its dialog), Skybox image. Style's panel header
  overflow holds only Expand all sections, Collapse all sections and Reset;
  the style verbs live on the Styles section, because a saved-thing verb never
  lives in a panel header (6.8). The rich text label editor, gradient editor and color picker
  remain popouts from the inspector's layer properties; each carries a pin
  toggle in the popout header; a pinned popout ignores click-outside,
  survives selection changes while the same layer stays selected, and its
  dragged position is remembered per pop-out type under 6.5; Escape closes
  it, and all four now inherit 6.11's shell, pin and nesting rules -- the
  pattern editor is the precedent 6.11 generalises. GraphEffects (motion blur, depth of field, reflections) and node
  texture image and icon are schema-only and get no control. Annotation
  tools are not here: notes live in Explore (5.7) and callouts, deferred,
  in Present.
- Capabilities: visual-encoding-nodes, visual-encoding-edges, style-presets,
  layout-force-directed, layout-hierarchical, layout-radial,
  animated-transitions, legend-display (toggle lives here, the legend itself
  is a canvas overlay). View mode (2D, 3D, VR, AR) is cross-cutting (5.6).
  The former `annotation` capability is split into notes (Explore) and
  callouts (Present); see section 8.

Resting state and doors in Style (6.11). The sharpest inconsistency in the set
was inside one row. The CATEGORICAL sub-mode of an encodable row already left
the panel as a "Values (N)" table in a 280 pop-out, while the NUMERIC sub-mode,
in the same slot on the same kind of row, was told to render inline over a
histogram: two sub-modes of one row, two different disclosures, and Color
costing six pitches where the categorical case costs three. 6.9's RT-1 door
rule already named the domain pair on a Scale field among the doors of the
product, and the room test decides it independently, because the histogram is
the only control in the section that cannot be drawn at 32 px. The NUMERIC
sub-mode keeps that door, on a row that is itself resident, which the
always-expands rule does not reach; its categorical twin was hiding a list
rather than a histogram, so it becomes a section that draws its value rows and
puts the palette-level controls behind a gear (above). The panel rests at 14
rows rather than 24, with one row-level door and three section gears across its
seven sections, and Show legend -- tier 1 in this section and drawn on no
board -- comes back as one of the fourteen.
Opened, the three sections this revision reopens add ten rows to this one
panel -- Parameters three, Animation two, Values five -- and the resting
fourteen is unchanged, because all three still default closed, which is what
pays for them.

The pop-over inventory for Style: Ramp options, 280, from the RT-4 trailing
glyph; the palette-level controls of a Values section, 280, from that section's
gear; the six layout engine internals, 280, from the gear on the expanded
Parameters section; Easing and the per-channel transition overrides, 280, from
the gear on the expanded Animation section; and the rich text label editor and
the colour picker, unchanged, both keeping their pins because they
are two of the four comparative surfaces that earn one (6.11).

Layout parameters use the gear that already exists, which is the Analyze card
gear verbatim: two gears in the product, one behaviour. What that gear takes is
the rare remainder, never the section. Edge length 30, Pull to centre -1.2 and
the Edge weight attribute are the three dials a reader opens the Layout section
for -- nobody opens it to do nothing; they open it because the arrangement is
wrong -- so all three render, at their schema defaults, under Rule 7a's one
carve-out: the engine declares springLength 30 and gravity -1.2 and Edge weight
defaults to the import Weight column, so 7a on its own would delete every row
in the section and leave a chevron opening onto nothing, which 6.11 forbids.
Behind the gear go the six engine internals 6.2's arithmetic always meant it to
hold, in a 3a pop-out from the gear on the section header: Start from current
arrangement, Stiffness (spring coefficient), Speed vs accuracy (theta), Damping
(drag coefficient), Time step and Random seed. Six rows became one in the
previous revision; three come back, and the six stay where they were sent.

Two refusals. The Styles library stays a collapsed section rather than becoming
a door: it buys none of the three things a door must buy, and its RT-8 header's
trailing slot carries the active style's own name, which is strictly more
information than a selected background on a row the reader may have scrolled
past. The departure line an applied style creates ("Applied Publication style.
2 of 5 layers matched nothing: they need logFC and padj.") is floor item 2 and
stays resident under that header. And Source keeps all of its rows at any
density -- the reading, the run record, the deviating Granularity field, the
cost gate and Open result -- with only the MCL engine internals behind a dimmed
Advanced parameters gear. No section may become a door now (6.11), and this one
may not be given a chevron either: 6.10's separation clause binds the reading to
the run, the departure to the channel, the run record to the run and the cost
estimate to the control,
and all four live inside that one section, so either move stops the layer
saying what it is drawing at the exact moment its parameter is being
turned. That is written down because the section measures 164 px and someone
will try.

Two rendering corrections. "Which nodes" does not render at its default: four
rows for a selector that matches every node is Rule 7a's own case, and the
analysis-backed layer boards already get this right on the same dataset. And
the cost gate is never a pop-over in either activity: it is inline on the
control that spends the cost (floor item 4 and 6.11's second clause), never a
floating card over the canvas with a pin toggle and a close X. Keep this
arrangement, Reset to defaults and Start from current arrangement move to the
Arrangement header's overflow.

Row types in Style (6.9). Style is the surface the row system changes most.
The Fixed and By attribute segmented pair is deleted from every encodable row:
the mode is what the field contains (Rule 6). A literal in the field means
fixed and draws a hollow slot glyph; an attribute chip in the field means
bound and draws a filled one; a multi-selection that disagrees shows the
literal word "Mixed" at value colour, with no badge and no asterisk, still
editable. That is five segmented pairs and about 100 px recovered on this
panel alone, and thirteen across the Style boards. Colour and opacity are one
RT-2 compound box -- swatch, hex, hairline, percentage -- not a four-part
labelled row. A numeric encoding is an RT-4 ramp row: the colour bar or the
size wedge is drawn at row size with its two domain ends as the only text, and
the scale-curve glyph in the trailing slot opens the RT-3 group of three,
which deletes "Age 45 to 68 maps to sizes 1.0 to 2.0, square root scale" from
the panel. The canvas legend keeps that sentence in words, because the legend
travels inside an exported image where no one can hover a glyph (floor item
5). Effects are one RT-3 group of four drawable buttons rather than four
checkbox rows; "Skybox: None" is an empty swatch rather than a word; a metric
that has not been run is marked rather than worded; and a section the data
cannot support -- edge properties on a node-only layer, Midpoint on a
sequential palette -- does not render at all rather than rendering disabled
(Rule 7c). Layer rows stay RT-6: a layer name is the user's own string.

Analysis-backed layers. A style layer created by a run (5.3, Analyze) is an
ordinary style layer with one section more, `Source`, at tier 1 between the
header and the encoding rows, in this fixed order:

- the reading, RT-10, resident and in full. Floor item 1, and it may not move
  into a collapsible section: the layer is where a parameter is turned, so the
  sentence that changes when it is turned is on screen where it turns;
- the caveats line, RT-10, drawn only when there is a departure to name;
- the run record, one dimmed line with its Details chevron, which opens the
  360 pop-out of 6.11;
- the deviating parameters only, as live RT-1 rows. Rule 7a already decides
  this: a parameter at its default is not drawn, so the resident rows are the
  ones that deviate -- typically the one the run name carries -- and every
  other parameter lives behind the layer row's gear as the 280 pop-out of
  6.11, with the gear drawn in the primary colour whenever a hidden parameter
  deviates;
- `Open result`, a link that selects the run's result face.

At a 280 px column that section measures 164 px: a 33 px RT-8 header plus a
131 px body. Rendering the whole parameter set inline instead would add 32 px
per further row, so an algorithm exposing five parameters would have cost 292.
Source is the one tier 1 section in the layer inspector that cannot follow
6.5's remembered-expansion memory, because floor item 1 forbids it being
collapsed by default.

The layer row is RT-6 at 28 px: the analyze glyph in the type slot, whose
title reads "From Groups (Markov clustering). Open the result"; the run name;
and, in the trailing value, the run's headline in place of the match count
wherever the selector matches everything -- "6" for a Community run, "0 to
0.41" for a node metric. State reports are resident under RT-7's hover split,
so Stale, Running and Failed draw without hover. A layer later bound to a
second run carries a second Source entry in binding order, and the glyph on
the row means at least one binding is analysis-backed. Renaming the layer
replaces the layer's copy of the run name and only the layer's copy.

Worked example, MCL at granularity 2.5 on the 318-node ovarian dataset. Layer
row: "Groups (granularity 2.5)" with "6" in the trailing value. Inspector: the
name; "Markov clustering (MCL)" dimmed beside it; "6 groups found. The largest
has 118 members. Colors show groups."; no caveats line, because the run was
exact, unfiltered and on the whole visible graph; "MCL, granularity 2.5" with
its Details chevron; one Granularity slider at 2.5; "Open result"; then Color
holding the filled "Groups" chip and the Okabe-Ito palette, with "Values (6)"
collapsed behind its own 280 pop-out. No "Which nodes" row, because the
selector is every node and Rule 7a deletes a control at its default.

Highlight layers appear in the Layers list too, one at a time, carrying the
run name and an off switch (5.3, Analyze, what a shape writes).

Re-running from a layer. A parameter row in a layer's Source is live: changing
it re-runs the algorithm and repaints this layer, on the same off-thread
queue, with the same progress row, the same history entry and the same cost
model as a run started in Analyze. Only the entry point differs. A scrub does
not run; on release, on Enter or on blur the layer goes dirty, the canvas keeps
the completed run's picture, the field shows the new value at value colour with
a 12 px reset x, and the gate appears beneath. Nothing on the canvas ever shows
a half-computed state.

The gate is Analyze's, in the same three bands, because it is the same run.
Under 2 s it starts on release with no button and no confirmation, which is
what lets a granularity be turned rather than submitted. From 2 s to the ask
limit it is one line and two verbs -- "Granularity 3.0 takes about 8 s. Colors
still show granularity 2.5. Run and use it / Cancel" -- which is the same
construction this panel already draws for a metric chosen before it has been
run ("Bridges takes about 40 s. Size still shows Significance (padj)."), so one
gate has one form wherever a style edit implies a computation. Above the ask
limit the estimate moves onto the verb; above the warn limit the section
carries the section 3 warning line. Above the large-graph threshold, where
inspector style edits already batch behind an Apply button, the Apply button
and "Run and use it" are one gate on that path, never two buttons in sequence.
While it runs, Source shows "Computing Groups (Markov clustering)... 42%
Cancel", the layer row shows Running resident, the canvas keeps the previous
colours, and the status bar mirrors the run and then the restyle -- two phases,
two strings, both already specified, and never a third.

A re-run from a Source row replaces this run and repaints this layer: same
stack position, same palette, same identity, the run name re-derived unless it
was renamed, the result card replaced rather than added, and one history entry
("Changed Groups granularity 2.5 to 3.0"). That deliberately inverts the
Analyze rule that a rerun with different parameters adds a card, and the
inversion is the exception rather than a contradiction: a parameter row inside
an object edits that object, while Run and "Run again with changes" are the
verbs that make a new one, and Run as sweep exists for holding 2.5 and 3.0 side
by side. Two consequences are stated rather than absorbed: per-value colour
overrides are dropped when a re-run changes the value set, because a group id
is not stable across granularities, and the toast says so with Undo restoring
them; and consecutive re-runs of the same parameter on the same layer coalesce
into one history entry while that layer stays selected and nothing else
intervenes, so turning a slider through five values does not evict a data
mutation from a fifty-deep store.

What this changes about a style layer, and how each break is closed. A style
layer has meant one thing since revision 1.0 -- a selector plus encodings,
authored by a person, portable -- and some layers now carry a run.

1. Export stops round-tripping, and already fails today: a calculatedStyle's
   inputs name `algorithmResults.<ns>.<type>.<field>` and carry no parameters,
   so an exported analysis-backed layer imported onto another dataset binds to
   whatever run shares that path, or to nothing, and paints silently wrong
   either way. The fix is a `source` object -- algorithm key, parameters, seed,
   scope descriptor -- carried under `metadata.source` on the layer, because
   `StyleLayer` is a strict object an older element would reject outright while
   `StyleLayerMetadata` is loose and passes unknown keys through, and
   `TemplateMetadata` is strict too, so a template-level source is not an
   option. Import has three defined outcomes: the run exists and the layer
   binds; the run does not exist but can be run, and the layer imports with its
   Source gate showing the estimate under the same three bands; it cannot run
   on this data, and the layer imports disabled with the reason in its tooltip
   rather than being dropped, because a silently missing layer is worse than a
   disabled one.
2. Order no longer fully determines the picture, since a layer can be stale,
   running or failed. State reports are resident on the layer row and the
   canvas holds the last good picture until a re-run completes.
3. Delete has two meanings: the two verbs of 5.3 Analyze.
4. Undo depth: the coalescing rule above.
5. Two claimants for a re-run. Analyze's "Run again with changes" and Style's
   Source rows both re-run one algorithm, which reads as a principle 2
   violation and is not one: the parameters of a run have one home, the run's
   Source, and it renders on whichever face is on screen -- the way Cleaning
   steps and History are two filtered views of one store. The verbs stay
   distinguished by scope: Source edits this run, "Run again with changes"
   makes a new one.
6. A generated name over a typed one: a renamed layer never re-derives, and the
   run name then survives in the run record line, which is where floor item 3
   puts it.
7. Compare. Runs in Compare are namespaced `algorithmResults.A.*` and
   `algorithmResults.B.*`; a layer whose source is one half carries the half in
   its name ("Groups (A)") and, when Compare exits, is disabled with its reason
   rather than repainting the merged view.

What a style carries, and what it deliberately does not. The app writes and
reads a named subset of graphty-element's `StyleTemplate` rather than
round-tripping the element's format whole, because a naive round trip would
let applying a colleague's style silently rewrite this graph's column roles
(`DataConfig.knownFields`), spend compute without an ask against principle 6
(`DataConfig.algorithms`), override a view mode section 3 made cross-cutting
and canvas-owned (`GraphStyle.viewMode`), and ship a multi-megabyte image
inside a settings file (the skybox member's inline `ImageData`). The two
genuinely useful cross-cutting blocks become explicit checkboxes in the Save
dialog, both off by default, each with its consequence in an info circle:
"Also save the column roles (id, source, target, weight, time)" and "Also save
which analyses to run on open". The skybox field is dropped on write with a
one-line note. On apply, an unticked `knownFields` or `algorithms` block in an
imported file is ignored and reported. A style template is how to draw a
graph; it holds no nodes, no edges, no attribute values, no computed results
and no positions (section 11).

Legend (legend-display). The canvas legend renders one block per encoded
channel with the attribute's plain and technical name: a gradient bar with
min, midpoint and max ticks for numeric color (diverging bars center on the
midpoint); a size ramp with min and max; an edge width ramp with min and
max; categorical swatches with counts, capped at 12 with "and N more"; group
labels from a Community result; the palette in use; and a "not measured"
swatch whenever any node lacks the encoded attribute. Until the background
degree pass finishes it reads "Size: uniform (measuring)". The exported
image includes these blocks when Include legend is on. Large-graph legend
rules are in 5.1.

Layouts

Plain name "Arrangement", technical name "Layout". Every layout engine
registered in graphty-element's LayoutEngine registry has a home here on the
day it is registered; extensions append to the same list (section 8). The
mockups draw the target state; status per engine is in 5.8.

Tier 1, quick picks. A selector with four segments: Force directed (ngraph),
Hierarchical, Radial, More. More reads the active layout's name when a
layout from the full list is active, and "From file" when Fixed is active
(enabled as a direct pick when numeric coordinate attributes such as x/y or
lat/lon are detected). Under the selector, a run row: for live layouts
(ngraph, d3) Play/Pause, Step, Settle (runs without rendering until settled,
progress and Cancel in the status bar), Re-run, Pin selected, Unpin all; for
batch layouts Apply and Re-run with new seed. Radial is the ego-centric
radial engine (Coming, 5.8): concentric rings by graph distance from a focus
node (ring 0 the focus, ring 1 its neighbors), with Focus node (defaulting
to the current selection), Max rings (2 to 10, default 5) and Ring spacing;
nodes beyond the rings or outside the focus component are hidden. Interim
fallback until it ships: the Shells engine keyed by BFS depth from the
focus; the mockups draw the target engine. Hierarchical is Sugiyama layering
(Coming, 5.8): layers by longest path from an automatic root (current
selection, else a zero in-degree node on directed graphs, else the highest
degree node), crossing minimisation, each connected part laid out side by
side, Orientation top-down or left-right, Layer by attribute (pick tier) or
distance from a root (pick root), layer and node spacing, and a "Contains N
cycles" note with Hide back-edges. Interim fallback until it ships: the bfs
engine with the same automatic root and no crossing minimisation. The
status bar layout slot names the engine and is clickable to re-run it.

Tier 2, All layouts. A searchable list of every registered engine, plain
name first, technical id second, one-line hint and badges (2D only, Needs a
root, Needs a partition, Needs an ordering, Live or Batch, size rating).
Grouped by family:

| Family | Plain name (technical id) | Kind | Inputs | Options from the schema (tier 2 inline; advanced in the tier 3 gear) |
|---|---|---|---|---|
| Force directed | Force directed (ngraph) | Live, 2D and 3D | none | Edge length (springLength), Pull to center (gravity); advanced: Stiffness (springCoefficient), Speed vs accuracy (theta), Damping (dragCoefficient), Time step (timeStep), Random seed (seed) |
| Force directed | Force directed, d3 (d3) | Live, 2D and 3D | none | Damping (velocityDecay); advanced: alphaMin, alphaTarget, alphaDecay |
| Force directed | ForceAtlas2 (forceatlas2) | Batch, 2D and 3D | none | Spread (scalingFactor), Iterations (maxIter), Scaling ratio (scalingRatio), Pull to center (gravity); advanced: jitterTolerance, distributedAction, strongGravity, dissuadeHubs, linlog, Random seed (seed) |
| Force directed | Spring (spring) | Batch, 2D and 3D | none | Spread (scalingFactor), Iterations (iterations), Scale (scale); advanced: Optimal distance (k, Auto when null), Random seed (seed) |
| Force directed | Kamada-Kawai (kamada-kawai) | Batch, 2D and 3D, size rating 2k | none | Spread (scalingFactor), Scale (scale); advanced: Edge weight attribute (weightProperty, an edge attribute select defaulting to the import Weight column) |
| Force directed | ARF (arf) | Batch, 2D only | none | Spread (scalingFactor), Scaling (scaling), Iterations (maxIter); advanced: Attraction ratio (a), Random seed (seed) |
| Rings and shapes | Circle (circular) | Batch, 2D and 3D | Order by (optional ordering: attribute or metric) | Spread (scalingFactor), Radius (scale) |
| Rings and shapes | Shells (shell) | Batch, 2D only | Shells (ordering: Group by categorical attribute, completed group result, or degree bands, one ring per value; nlist) | Spread (scalingFactor), Radius (scale) |
| Rings and shapes | Spiral (spiral) | Batch, 2D only | Order by (optional ordering) | Spread (scalingFactor), Scale (scale); advanced: Turn spacing (resolution), Equal spacing (equidistant) |
| Rings and shapes | Random (random) | Batch, 2D and 3D, any size | none | Spread (scalingFactor); advanced: Random seed (seed, with Auto and Randomize) |
| Rings and shapes | Rings around a node (radial, ego-centric) | Batch, 2D and 3D | Focus node (root) | Max rings, Ring spacing (Coming, 5.8; interim fallback: Shells keyed by BFS depth from the focus) |
| Layers | Layers from a root (bfs) | Batch, 2D only | Root (start; node picker with Use selected) | Spread (scalingFactor), Orientation (align: vertical or horizontal), Scale (scale) |
| Layers | Layered (sugiyama) | Batch, 2D only | Root (automatic; pick to override) | Orientation, Layer by, Layer spacing, Node spacing, Hide back-edges (Coming, 5.8; interim fallback: Layers from a root with the automatic root) |
| Layers | Two sides (bipartite) | Batch, 2D only | Group by (partition with exactly 2 values: a categorical attribute or the bipartite check; nodes) | Spread (scalingFactor), Orientation (align), Scale (scale), Aspect ratio (aspectRatio) |
| Layers | Layers by attribute (multipartite) | Batch, 2D only | Group by (partition with 2 to 10 values: categorical attribute, completed group or component result, or Core layers; subsetKey) | Spread (scalingFactor), Orientation (align), Scale (scale) |
| Structure | Spectral (spectral) | Batch, 2D only, size rating 2k | none | Spread (scalingFactor), Scale (scale) |
| Structure | Planar (planar) | Batch, 2D only, planar graphs only (a non-planar graph disables the entry with the reason) | none | Spread (scalingFactor), Scale (scale); advanced: Random seed (seed) |
| From data | From file (fixed) | Batch, 2D and 3D, any size | Position attributes (x, y, z or lat, lon; detected) | none (the dimension follows the view mode) |

The dimension option (dim) of every engine is never a raw field: it follows
the view mode control (5.6), and 2D-only engines carry the 2D only badge and
the switch rule above. Option rendering is generated from the active
engine's option schema: options not flagged advanced render inline here,
advanced options behind the tier 3 gear; a number with bounds is a slider,
an unbounded number a field, a boolean a switch, an enum a segmented
control, a nullable seed a field with Auto and Randomize, a weight property
an edge attribute select; dim and structured inputs never render as raw
fields. Layout parameters also carry "Edge weight attribute" (defaults to the
import Weight column) wherever the engine accepts one.

Structural inputs. A node input (root, focus, start) uses the Analyze node
picker with Use selected, and the inspector's "Use as root or focus" fills
it; a partition input is a "Group by" select over categorical attributes and
completed group, component or core-layer results (Two sides needs exactly 2
values, Layers by attribute 2 to 10) with a preview line ("4 layers: 12,
30, 51, 107 nodes"); an ordering input is "Order by" attribute or metric,
ascending or descending. Apply is disabled with an inline reason ("Pick a
root node") until required inputs are filled.

Live stepping. Live engines (ngraph, d3) expose the run row above: Play,
Pause, Step (one tick), Settle (headless until converged, with progress and
Cancel in the status bar), Re-run, and Stop keeping current positions. The
status bar layout slot reads "Force-directed: step 120 of 1,000, Stop",
"Settled" or "Stopped after 1,000 steps" (5.1). Dragging a node pins it (a
pin glyph marks pinned nodes; Settings > Defaults "Pin nodes when dragged");
Pin selected, Unpin selected and Unpin all live in Layout parameters and the
inspector. Batch engines show "Computing Kamada-Kawai..." with Cancel and
apply with an animated transition (duration from tier 3 animation settings,
Reduce motion honored, instant above the large-graph threshold).

Layout on selection only. Apply to: All visible (default, honors filters and
window) or Selection only (technical: selection-scoped layout, new work,
5.8); with Selection only the rest of the graph keeps its positions and the
status bar reads "Layout: Radial on 37 of 200 nodes". Dragging a multi-node
selection moves the group; "Pin selected positions" and "Layout selected
nodes only" are also multi-node inspector actions (5.4). Start from current
arrangement switch (default on for force layouts). Keep this arrangement
(Fixed): writes current positions into the data and selects From file;
undoable. Reset to defaults.

Large-graph rule. Above the large-graph threshold the selector gains a
fourth, default segment "As loaded" (positions from file when every node
has one, else Quick grid: connected parts sorted by size, each on a grid
cell, with the seeded Random layout as the fallback when parts are not yet
computed at draw time; 7.2), and the other segments show an estimate under
their label ("about 4 min, runs in the background"; "needs a tree: 1.2M
back-edges"). Choosing Force directed above the threshold asks once and
runs ngraph in Settle mode with "Force-directed: step 120 of 1,000, Stop" in
the status bar; above the render ceiling it warns "A force layout on 1.2M
nodes may take an hour and freeze the tab; filter to under 200,000 nodes
first" and offers "Run anyway in the background". In the All layouts list
an engine above its size rating (any size, 10k, 2k, 500; benchmarked before
they drive the warnings, section 12) stays selectable and warns "Slow above
2,000 nodes: 51,000 nodes may take 20 min. Filter first, or apply anyway.";
Apply reads "Apply anyway". Between a few seconds and the limit an estimate
appears beside Apply. Layout parameters above the threshold apply
behind an Apply button, not live. Radial requires a Focus node and caps
rings per the ego rule ("showing 3 rings; 41,200 nodes beyond are
collapsed"). Settings > Defaults > Initial layout picks from the full list
with ngraph preselected; above the threshold the default is From file when
positions exist, else Quick grid.

Every layout name, plain and technical, is indexed in the command palette
(opens Style with the list focused).

Present

- Tier 1: Export image (Format select: PNG, JPEG, WebP, SVG, PDF; SVG and
  PDF (vector, from the SVG path) carry the Coming tag, 5.8;
  current view) with a secondary Copy to clipboard button; Export data
  (Format select: JSON, CSV, GraphML, GEXF, CX2, so attributes, computed
  metrics and the current encoding round-trip to Cytoscape; GraphML, GEXF and
  CX2 writers are new work in 5.8; Scope: Whole graph, Visible (N),
  Selection (N, when one exists), Set..., Top N by [metric] (default 500,
  appears once a node-metric result exists), or "Data table rows (N)" when
  opened from the drawer's "Export this table", which presets the tab, CSV,
  visible rows and visible columns; nodes and edges including computed
  metrics and merged nodes; positions (x, y, z) included by default for JSON
  so hand-arranged layouts survive export; an "Include notes" checkbox,
  default on when any notes exist: JSON node-link adds a top-level `notes`
  array, CSV adds a `notes` column with notes joined by " | ", GraphML adds a
  `note` data key; notes never modify imported attributes; plus "Analysis
  results as CSV" for pair lists, paths and time series and "Notes as
  CSV"); "Copy node ids" beside Export data. Export data shows the estimated
  size before writing ("about 640 MB"), writes through a chunked or streamed
  file (never one string), and above 100 MB becomes the inline progress row
  "Writing 2.1M of 10M edges... Cancel" mirrored in the status bar; above
  1M edges the Format select defaults to CSV and labels JSON with its size.
  Pin to report on every result card, path result, pattern match, bookmark,
  note row and the multi-node inspector; pinned items appear as ordered rows in
  the report sections checklist with a free-text note each; Generate report and
  Export evidence bundle (ZIP of CSVs, image, history JSON) consume them. The
  Present rail icon carries a badge counting pinned items plus unresolved
  notes (5.1). Present no longer carries its own "Save as recipe..." row: a
  recipe is created on the Recipes section under History (5.3, Analyze), and
  what stays here is the file export, "Export recipe (JSON)". "Export
  selection..." lands
  here with Scope preset to Selection; it is reached from the multi-selection
  context menu, the inspector More list and the palette, because export has
  one home (section 3).
- Tier 2: Image export options, which are the CONTENTS of the 280 Image
  options pop-over the Export image gear opens and are never drawn beside that
  gear (Scope: Current view, Entire graph, Current
  filter (66 of 200), Selection (12); default current filter; Scale: 1x,
  2x, 4x with the resulting pixel size shown, replaced for Entire graph by
  Longest side (2048, 4096, 8192, 16384 px) with "about 0.02 px per node;
  nodes will merge into density at this size" above 50,000 nodes and a
  density-map image as the alternative; View angle: Current, Top, Side,
  Front, Isometric (3D only; Entire graph scope uses the fit-to-graph
  camera); Background: dark, light, transparent; Include legend, default on,
  whose exported legend is composed from the encoding model and does not depend
  on the canvas legend's visibility (below); Include
  note markers (default on; draws markers for unresolved notes on visible
  elements, in the scene, so they appear in every format); a "Publication
  ready" switch that hides node labels except pinned ones; the export frame
  hint, which is resident on the canvas and not inside the pop-over, reads
  "current view, 832 x 836, about 2,140 nodes in frame; legend: 2 channels",
  and reads "legend: off" when Include legend is turned off; SVG,
  when shipped, warns above 10,000 elements in scope with "SVG with 1.2M
  elements will be very large and slow to open. Export PNG or filter first,
  or export anyway"; above the
  threshold the button shows an estimate, exports the current positions
  without waiting for layout to settle ("Layout still running; export uses
  current positions"), and the Output readout gives an upper bound ("up to
  28 MB")). Data export options, likewise the contents of the 280 Data options
  pop-over the Export data gear opens (Columns: a picker listing attributes and
  each metric with the run that produced it, defaulting to all columns with
  hidden table columns excluded; Separator: comma, tab, semicolon, pipe;
  BOM; precision (default 6); Include computed metrics; Copy as TSV; Top K
  per source node for predictions (no upper cap); Analysis history (JSON);
  Selection statistics (CSV); Removal scenarios (CSV or JSON); every export
  writes a run manifest (the run records) as a sidecar or header block).
  "Export recipe (JSON)": the ordered History (section 5.3,
  Analyze) as steps with parameters, plus the import options and column
  mapping, computed-attribute formulas, saved filters and selection sets,
  style encodings and preset, bookmarks, and the engine version; no node or
  edge data; the canonical replayable artifact, consumed by Data > Run a
  recipe; "Export as script" emits the same steps as console text (section
  5.3, AI) as a secondary format. A collapsed "Export video" section:
  Duration, Camera (Hold still, Orbit once), Format (WebM; MP4 when
  supported), Record showing the estimated time; progress and Cancel
  mirrored in the status bar like algorithm runs. A `Reports` library section
  (5.3, Saved things) in the panel's resting top level, which is where the
  report sections checklist used to sit: its plus reads "Save as report...", a
  row click loads that configuration into the report editor, and its overflow
  holds "Import report..." and "Export report (JSON)". A report configuration carries the
  sections checklist and its per-section options, the title, the row cap, the
  Include done notes switch, the image export options and the pinned-item
  slots by kind -- not the pinned items themselves, the notes, the results,
  the image or the graph -- so loading one onto a different graph produces the
  same report shape over that graph's content and reports what it could not
  fill. Report sections checklist, which renders inside the report editor drawer
  and not in the panel, because a control whose home is one surface may not
  acquire a second. A section is checked by default whenever its
  content is non-empty -- Notes, Pinned items, Validation report, Data changes
  -- and each shows its item count; Data tables are the exception and default
  to unchecked, because they are the one section whose size is unbounded. The
  sections:
  the validation report (grouped form) and the Cleaning steps, "Data changes",
  Methods and Methodology (the analysis history with parameters, generated
  from the run records, auto-filled and editable in the report dialog with
  algorithm, parameters, scope and a caveats line; records layout name,
  options and seed), "Analysis steps" (the same history list), Notes
  (evidence log): a table of target, author, timestamp, tags, done, text in
  creation order, plus numbered footnotes under the embedded image for each
  visible marker; Data tables (first 100 rows each; full data attached as
  CSV) with the row cap as a field in the report dialog; pinned items.
  Callouts (deferred, section 11): a Callouts toolbar row with Text, Arrow,
  Highlight; tier 3 gear for font, fill and z-order. Callouts are stored
  inside the view bookmark they were drawn against and drawn only while that
  bookmark's camera is active; "Anchor to node" leader lines resolve from
  node ids like note markers. Limits: 50 per view, 500 characters.
- Tier 3: the report editor, a non-modal bottom drawer beside the Data table
  drawer, titled with the report's own name and holding the sections checklist
  as a packed RT-5 block with per-section counts, Title, Row cap, an "Include
  done notes" switch (default off), the ordered pinned-item rows, Generate
  report with the same progress row, and Export evidence bundle. It is neither
  a dialog nor a pop-out, and the resting-state paragraph below and 6.11 both
  say why. Image quality (Supersample, Anti-aliasing, JPEG or WebP quality) is
  a collapsed group inside the Image options pop-over. Camera path (waypoints,
  easing) for video stays a dialog.
- Capabilities: export-image, report-generation, data-export, export-video
  (new capability id), callouts (deferred).

Resting state and doors in Present (6.11). Present is the largest change in
this revision by a wide margin, and the only panel where more than half the
resident rows move: 28 resident rows filling 795 px of a 795 px content area,
on a 20-node fixture with no saved reports, become 10 rows and about 330 px at
rest, and 13 rows with Export video open. The resting ten is what the split
bought and it stands, because that section still defaults closed, which is what
pays for the three rows coming back into it.
The finding was not that too much is visible. It is that the doors were already
drawn and nothing had gone behind them -- two gears titled "Image export
options" and "Data export options", with eleven of those options rendering as
resident rows beside them. A gear that opens a pop-over and a panel that draws
the pop-over's rows beside it teaches that the gear is decorative and doubles
the panel height for nothing. Present is also the terminal act of a session
rather than a working panel: nothing in it is scrubbed while watching the
canvas, which is 6.2's one protection against tier 3, so the frequency test
applies at full strength.

The resting top level, ten rows:

1. RT-8 Export image, with the gear that opens Image options.
2. An RT-1 pair, Format PNG | Scale 2x. These stay out because they are the two
   inputs of the resident estimate below them, and a cost with both of its
   inputs hidden is a number no one can steer.
3. The floor line, "1664 x 1672, about 420 KB", which becomes the streaming
   progress row with Cancel above 100 MB.
4. RT-7: Copy to clipboard | Export image.
5. RT-6: the last export's filename.
6. RT-8 Export data, with its gear and its recipe overflow.
7. An RT-1 pair, Format JSON | Scope Whole graph, with "about 6 KB" as the
   dimmed suffix inside the scope field.
8. RT-7: Copy node ids | Export data.
9. RT-8 Export video, a section that expands in place onto three rows --
   Duration | Camera as one RT-1 pair, Video format, and the estimate row with
   Record beside it -- and whose header carries "10 s, Orbit once, WebM" as its
   state mark while it is closed. It carries no gear at all unless the video
   twin of the Image quality group ships, which the rule permits: a gear is an
   addition, not an obligation (6.11).
10. RT-8 Reports, a library section with its resident plus and RT-6 rows
    carrying each saved report's own name, plus the pinned-items RT-6 list when
    it is non-empty.

Plus, conditionally and under floor item 2 only, a resident departure line
under the section whose hidden option created it: Publication ready on prints
"hides all 20 labels"; Include legend off is named in full.

The pop-over inventory for Present:

- Image options, 280, from the Export image gear: Scope; Scale, replaced by
  Longest side when the scope is Entire graph, with the "about 0.02 px per
  node" warning above 50,000 nodes; View angle as an RT-3 group; Background as
  an RT-3 group; Include legend and Include note markers as an RT-5 pair;
  Publication ready; a collapsed Image quality group (Supersample,
  Anti-aliasing, JPEG or WebP quality); and the SVG element-count warning.
- Data options, 280, from the Export data gear: the Columns picker, Separator,
  BOM, precision, Include computed metrics, Positions, Include notes, Top K per
  source node, Copy as TSV, and an "Other exports" group that renders only when
  it is non-empty.
- Export video has no pop-over. Duration, Camera, Format, the estimated time
  and Record are the section's own resident rows -- the estimate and Record's
  full text are floor item 4 twice over -- with progress and Cancel mirrored in
  the status bar. A 280 gear appears there only if the video twin of the Image
  quality group ever ships: scope, background, resolution and frame rate.
- A menu, not a pop-over: Export recipe (JSON) and Export as script, on the
  Export data header's overflow.

Rule 7a removes two rows before any pop-over fires: Include legend and Include
note markers are both at their default of on, and "Include notes. This graph
has none yet" is content the data cannot support, which Rule 7c deletes rather
than dims.

What stays resident at every density, and why: the size estimate before writing
and the Format and Scale that feed it (floor item 4); every ceiling and size
warning; the full text of every export verb (floor item 4); the last export's
filename and the pinned-items list (floor item 7); and any departure a hidden
option creates (floor item 2) -- which at the defaults is nothing at all, and
that silence is Rule 7's corollary working.

Two surface classes change with the split. The report sections checklist leaves
the panel, because a control whose home is another surface may not acquire a
second home, and its home is the report editor. And the report editor is a
non-modal bottom drawer rather than a dialog or a pop-out. It cannot be a
dialog: 6.11's first question is exclusive and its list is closed, and report
generation is not on it. It cannot be a pop-out: the report-generation
capability requires an editable description of up to 2,000 characters plus
editable methodology and findings sections, which the 480 ceiling cannot hold,
and 6.11 says what that means -- anything wider is a drawer or the Data table.
Non-modal is not a nicety: designing the picture and writing the description of
it interleave, and a modal forces you to close the editor to fix the picture
you are describing. This resolves a standing contradiction between this section
and 6.11.

The More section -- a header plus four dimmed rows -- becomes a menu, and a
menu row keeps the verb's full text and its Coming tag, so nothing is un-named.
Export recipe (JSON) and Export as script go to the Export data header's
overflow; Generate report and Export evidence bundle go into the report editor.

Export and the legend. Every exported image carries a legend, at every scope,
composed from the encoding model at the export's own scale (5.1 Legend, 6.10
item 5). It is not captured from the canvas overlay: the export path is a
Babylon scene capture of the canvas, and the legend is a DOM overlay in the
shell, outside that canvas, so an exported image contains no legend today and
physically cannot contain the DOM one. "Include legend" is on by default and
lives behind the Image options door; it does not depend on the canvas legend's
visibility, so hiding the legend with L or with Style's Show legend switch does
not remove it from an export. In the SVG and PDF paths it is emitted as vector
text, because rebuilding a legend in a drawing program is exactly the work the
export exists to remove. Composing that block at export scale into the existing
2D-canvas stage of the screenshot path, in the PNG, JPEG, WebP, SVG and PDF
paths, is new implementation work and is recorded in 5.8.

The promise stays visible without an exception to Rule 7a. "Include legend" at
its default would not render, and the one persona frustration in the whole set
about legends would be answered by a control the user never sees. The control
goes behind the door and the report comes to the canvas instead, by extending
the export frame hint: "Export frame: current view, 832 x 836, about 20 nodes
in frame; legend: 2 channels". That hint is resident, it is floor item 4 --
what a control will do, before it does it -- it reads "legend: off" when the
option is turned off, and the Image options gear draws in the primary ink in
that case. This is the resolution of the one direct conflict between the
Present split and the legend decision: the control moves, the report does not.

Row types in Present (6.9). Format, Scope, Scale and precision are field rows
at one pitch each, their labels in the glyph slot and their units as dimmed
suffixes ("4x", "8192", "about 640 MB"); the words Format, Scope and Scale
leave the panel and live in each field's title. An option still at its default
is not drawn, so an export at current view, PNG, 1x is three rows and not
nine, and each deviation draws with a reset x in its trailing slot (Rule 7a).
The report sections checklist, which renders inside the report editor drawer
rather than in the panel, is a packed RT-5 toggle block with the verbs
stripped from its labels -- Notes, Pinned items, Validation report, Data
changes, Methods, Analysis steps, Data tables -- each carrying its item count
as a trailing value, and the repeated word "Include" rises out of every one of
them (RT-5's verbs-out sub-rule and Rule 9). Pinned items, notes and bookmarks are RT-6 rows. What
does not compact, at any density: the estimated size before writing, every
ceiling and size warning, and the full text of every export and destructive
verb, which are floor item 4.

AI

- Tier 1: Chat input, message history, per-step list showing each tool call
  and the panel it belongs to; a microphone button at the right of the
  input, shown only when speech recognition is available, with a listening
  state (in an XR session it becomes push-to-talk, held rather than toggled,
  5.9); Cancel on the in-flight message; Retry on a failed message. Tool
  results shown in the step list and returned to the assistant are
  summaries, never lists: a result summary carries the same fields as the
  result card reading (top 10 with scores, count, mean and median, group
  count and largest sizes, sample size, duration); node lookups are capped
  at 100 with "and N more"; canvas highlighting of affected nodes is capped
  at 1,000. Each step row carries a second muted line with scope and method
  ("on 100,000 nodes, 100 sampled sources, 38 s"), matching the card's
  scope line. The step row's title is a link: it opens the step's home panel,
  scrolls to the control or result the step produced and highlights it for two
  seconds, and never re-runs anything (7.4). A step taken by voice in a headset
  carries "by voice, in VR" on that second line (5.9). Style-application steps show the restyle progress row. During
  Loading the input is enabled but every step and reading carries "Partial
  data (24% loaded)". The assistant receives the graph-level note and up to
  50 most recent open notes as context, can search notes with a findNotes
  tool, and can add a note with an addNote tool. AI-authored notes carry
  author "Assistant", a distinct marker glyph, and appear in the step list
  as "Added a note on acct-4471 (Explore)". The assistant never edits, marks
  done, or deletes a note; it may propose "Mark this note done?" as a step
  the user confirms. Follow-up action chips under an answer are limited to
  actions with a backing tool; Select node, Undo, Filter and Expand are
  listed in 5.8 as new AI tools and do not appear until built.
- Tier 2: Provider status and model selector; Voice input switch (also used
  for push-to-talk in VR and AR, 5.9); Console:
  a one-line input over the same command registry the assistant calls
  (runAlgorithm, findNodes, findAndStyleNodes, setLayout, zoomToNodes,
  captureScreenshot, select, export), with completion and inline help, a
  transcript, Up-arrow history, and Run script for a pasted block. It works
  with no provider configured; the setup prompt stays above it. Every AI
  step row and every card gear offers Copy as command; the console
  transcript, the AI step list and the History all export the same script
  text. The console is the provider-free form of the assistant route in
  principle 3; the backtick key focuses it (5.6).
- Tier 3: Provider keys and settings (opens Settings > AI).
- Without a configured provider the panel shows a one-line setup prompt with a
  link to Settings and a note that all features work without AI. The link opens
  Settings > AI providers with a "Save and return" button; saving a key closes
  Settings, reopens the AI panel and focuses its input, so the setup detour
  ends where it started. The backtick key focuses this panel's input when a
  provider is configured and the console otherwise; Shift+backtick always
  focuses the console, so an expert who learned backtick as the console keeps
  it (5.6).

Resting state and doors in AI (6.11). The AI panel is inverted. The
conversation occupies about 280 px while Provider and Console occupy about 445,
so 56 per cent of the panel is supporting machinery and 35 per cent is the
thing the panel is for. Two sections fix it, each keeping the two things a
reader of that section touches and putting the rare remainder behind a gear,
and after them nothing else in the panel is a candidate, because a transcript
has no doors.

- Provider is a section with two resident rows: the RT-1 model field
  ("claude-sonnet-5") and the RT-5 Voice input switch, whose full title reads
  "Voice input. Also used for push-to-talk in VR and AR" and which is floor
  item 6. Of the readers who open Provider, the model and the microphone are
  what they touch. Its gear takes the provider select and its keys -- the API
  key, and the Base URL, max tokens and temperature trio that Settings > AI
  already files under an Advanced row in the same provider accordion, which is
  one destination and not two (Rule 9). The status is already resident in the
  status bar ("AI: Anthropic ready"), so Rule 8 deletes the panel's copy of it;
  what the status bar does not carry is the model, which is the fact the
  header's trailing slot reports while the section is closed and the resident
  row prints once it is open. The Connected dot stays in that slot in both
  states, because it is the section's own state and not a precis of the rows
  below it.
- Console is resident and expanded whether or not a provider is configured
  (6.1's state axis), with the setup prompt replacing the chat
  input in the no-provider state. It is a working surface and not a settings
  set: the one-line input with its completion hint and Run script, and the last
  two transcript lines, are what it draws, and only its preferences -- clear
  transcript, copy transcript, transcript length and the completion-hint
  toggle -- go behind a gear. Two input surfaces for one job, stacked, and at
  most one of them is this user's route. Width is not the argument and was
  checked: the
  widest console line measures 219 px inside the 256 px band. The Console keeps
  its pin, because it is one of the four comparative surfaces that earn one
  (6.11), and Shift+backtick already opens and focuses it, so the keyboard
  obligation is met by a binding that already exists.

Six supporting blocks of about 445 px become about 130 -- a collapsed Provider
header, and a Console drawing its input and its last two transcript lines --
and the conversation goes from about 280 px to about 595. Provider adds two
rows when it is opened and that arithmetic is unchanged, because it still
defaults closed, which is what pays for them. This is the one place in the
revision where 6.2's frequency override does the whole job: 6.11 question 3
would send the Console inline and 6.2 moves it, and that is the intended
mechanism rather than an exception for a later reader to rediscover. What the
override can move under the always-expands rule is a section's CONTENTS behind
a gear and never the section itself, so the console's preferences leave and the
console does not.

One floor item is restored rather than hidden: each step row's second muted
line ("on 100,000 nodes, 100 sampled sources, 38 s") is floor item 3 and is
resident. Only the full record goes behind the Details chevron, which 6.10
explicitly licenses.

Settings (rail, bottom)

- Full-panel overlay, not a route. Sections:
  - Appearance: theme; density (Comfortable or Compact; Compact uses the
    Mantine xs row scale and tightens caveats spacing, and changes row height
    only -- it never changes which explanations are visible, because one
    behaviour has one owner); Label order: Plain first (default) or Technical
    first (swaps which name of every canonical pair is primary and which is
    muted; both names are always rendered, on cards, chips, legend, statistics
    rows, inspector metric rows, status bar and palette rows; an info circle
    always follows the complete pair and never sits between the two names);
    "Show help text in place" (default off: every taught sentence sits behind
    its info circle, one hover, focus or tap away, and is still the control's
    accessible description. On: every info circle in the application draws its
    sentence inline under its control and the circle is hidden. The switch
    changes where a sentence is read, never whether it exists, 6.7; the
    sub-line reads "Off keeps every explanation one hover or tap away on the
    i."); "Show labels on controls" (default off: every in-field label of 6.9
    is a glyph alone, with its word in the field's title, one hover, focus or
    tap away. On: every in-field glyph draws its word beside it, RT-1 pair
    rows become single 224 px rows, and a panel roughly doubles in height,
    which every layout must survive rather than break. It is the escape hatch
    that makes an icon-first panel defensible to a first-time user, so it
    ships in the same revision as the glyphs and not after, and it is
    remembered per 6.5; the sub-line reads "Off keeps each control's word in
    its tooltip."); "Keep advanced sections open" (default off: this is the
    second escape hatch of 6.9's Rule 11. On, every gear pop-out's contents
    render as inline rows in that pop-out's own section instead, in the same
    order and at the same 32 px pitch, and the panel may scroll, which is the
    cost the reader accepted by turning it on. Two constraints: it affects only
    pop-outs whose contents are field rows at 280, because reports and matrices
    at 360 and 480 do not fit the 256 px band and have no honest inline form;
    and it ships in the same revision as the doors, for the same reason the
    first hatch ships with the glyphs. Remembered per 6.5; the sub-line reads
    "Off keeps advanced options one click away on the gear."); its tooltip."); there is no usage-based retirement of helper text (6.5);
    Your name (used on notes; default "You").
  - Defaults: initial layout from the full list (ngraph preselected),
    initial view 3D or 2D, initial encoding, Run on load algorithm list,
    scroll wheel zooms or pans, allow rotating the 2D view, Pin nodes when
    dragged, Decimal places (default 2; copies and exports always use the
    stored precision), Show AI status in the status bar (default on until
    the AI panel has been opened once without configuring a provider, then
    off).
  - Keyboard shortcuts: the full table from 5.6, grouped, Reset to defaults,
    and a read-only XR group. Rebinding has no button: the key chip is the
    click target, the row reveals a pencil on hover or focus, a customised row
    also reveals a refresh icon that restores the default, and the section
    header reads "Click a key to rebind it." Clicking the chip opens a 280
    pop-over anchored to that chip and titled with the action's own name, not
    an in-place capture: capturing in place inserts a conflict warning that
    pushes the remaining rows of a roughly 60-row table down while the reader
    is staring at a key chip, and leaving the rows below operable while the
    surface is open is the third thing a door is allowed to buy (6.11). This section renders the full
    table including the rows whose action has not shipped, with their Coming
    tags, and is the surface where the unshipped bindings are learned; the ?
    dialog renders only bindings whose action has shipped (5.6). The XR group
    is twelve read-only rows with two binding columns, Controller and Hands,
    headed "Read-only. Learn these before you put the headset on -- Settings
    is not reachable in a session" (5.9).
  - Performance: a readout at the top, "This graph: 1,000,000 nodes,
    10,000,000 edges. Performance mode is on because the graph is above
    10,000 nodes." followed by the list of rules in force, then the defaults
    table below. Controls that require reprocessing carry "Applies on next
    load" or "Apply now (about N s)", stated once on the column header rather
    than on each row. Both thresholds are evaluated on the counts after any
    subset load.
    - Machine calibration. The large-graph threshold and the render ceiling
      are properties of this machine, not of the graph or of taste, so they
      are measured rather than typed. A first-run offscreen probe reads the
      browser's facts (device memory, hardware concurrency, WebGL renderer
      string, device pixel ratio) and runs a 512 by 512 instanced render at
      1,000, 8,000 and 64,000 nodes, hard-capped at 2.5 s in total and
      abandoned the moment a file is opened. A line is fitted through the
      three frame times: the large-graph threshold is the node count at 16.7
      ms per frame, floored at 2,000 and capped at 100,000; the render ceiling
      is the lesser of the count at 100 ms per frame and 60 per cent of the
      memory budget. Both round down to one significant figure, which is what
      stops thermal jitter from changing the displayed value between runs. The
      result is stored with a machine fingerprint and shared with the Analyze
      estimate probe -- one record, two consumers. An iPad produces its own
      numbers from the same probe, so there is no separate iPad ceiling. The
      probe re-runs on Recalibrate and whenever the machine fingerprint
      changes. If it fails for any reason the built-in defaults apply
      silently: never a modal, never a blocked start.
    - What Settings shows. One detected block replaces the threshold and
      ceiling rows: a headline sentence ("This machine draws about 40,000
      nodes smoothly and about 200,000 at all"), the measurement provenance
      ("Measured on 4 September, Apple M2, 8 GB reported"), the consequence
      sentence ("Above 40,000 nodes graphty turns on Performance mode; above
      200,000 the Import options dialog offers a subset"), and two actions,
      Recalibrate and Change. The consequence sentence is what makes the
      number legible and is never trimmed. Change discloses the four numeric
      fields pre-filled with the detected values and stamps the block "Set by
      you.  Use detected values".
    - Explanations. Each defaults-table row carries its explanation in an info
      circle on the row label (6.7). What stays inline is what reports this
      graph: the readout at the top, the list of rules in force, the "Turn off
      anyway" warning with its memory and frame-rate estimate, and any clause
      naming the current dataset ("This graph: 1.1M", "Off for this graph").
      Rows whose control spends more than the ask limit keep their sentence
      inline under the three carve-outs of 6.7.
    - Config keys. The storage keys behind these controls (largeThreshold,
      ceiling.desktop, exactCap, labelCap, preSteps and the rest) are hidden
      behind one header switch, "Show config keys", off by default and
      remembered under 6.5; on, every key returns in place. The exported
      configuration file always carries them. A storage key is not a
      vocabulary pair (6.3); the eight layout engine names on this screen are,
      and stay visible.
  - AI providers and keys; two switches, "Assistant can read notes" and
    "Assistant can add notes", both default on and both disabled when no
    provider is configured.
  - Data management: recent files (persisted in local storage; Clear),
    storage, Always show import options (default off), On start: show
    Welcome or reopen last file, and Saved items, the housekeeping list (5.3,
    Saved things): every kind at once -- style templates including the
    built-ins, saved filters and subgraphs, selection sets, patterns, view
    bookmarks, formulas, recipes, report configurations and import mappings --
    each with a storage line, a per-row origin, rename, export and delete,
    bulk delete, and a dimmed "For graphs you do not have open" group with its
    count holding the bound kinds whose dataset is not loaded. There is no
    whole-library bundle export: an artifact carrying every saved thing at
    once is one step from the project file section 11 defers, and it is
    recorded as an input to that question in section 12 rather than shipped
    here.
  - Extensions (tier 3): load an ES module by URL or file; the module
    registers through the graphty-element registries (layouts, algorithms,
    data sources, identifier mappers, enrichment providers, AI tool packs);
    each loaded extension is listed with name, version, what it registered,
    enable, disable and remove; stored in local storage. Extensions never
    add rail activities or panels (section 8).
- Performance defaults, each with plain name and technical term:

| Control | Default | Effect |
|---|---|---|
| Large-graph threshold | measured on this machine; 10,000 nodes or 50,000 edges, whichever is crossed first, as the fallback | Above it: Performance mode, size-aware algorithm defaults, label cap, hover and tooltips off |
| Render ceiling | measured on this machine; 200,000 nodes or 1,000,000 edges as the fallback | Above it the Import options dialog defaults to a subset load and warns; Import everything anyway stays available (5.3 Data). Compare mode halves the ceiling |
| Exact-computation cap | 2,000 nodes | Above it cubic cards and cubic layouts warn and confirm (5.3 Analyze, Layouts) |
| Layout size ratings | any size, 10k, 2k, 500 per engine | Drive the warnings in the All layouts list; benchmarked before release |
| Performance mode | Auto, Always on, Off | Checklist of what it changes: labels capped at 20, uniform node size, edges as 1 px lines, edges hidden above the edge cap until zoomed, hover and tooltips off, animation off, force layout not started, note markers clustered (5.7); and it is always on in a headset regardless of this setting (5.9) |
| Labels on canvas | 50 below the threshold, 20 in Performance mode, max 500 | Label cap; the readout, the Performance mode chip and the status bar show the value in force (7.2) |
| Edges drawn | 500,000 | Beyond it edges are hidden until the view narrows |
| Subset load default | Busiest nodes, 50,000 | Pre-selected Load control choice |
| Sample sources for Bridges and Closest to everyone | 100 | Sampled centrality |
| Ask before runs estimated over | 10 s | Confirm prompt |
| Warn on exact runs estimated over | 30 min | Card warns; Run reads "Run anyway" and confirms once |
| Selection cap | 5,000 | Inspector switches to summary form; Select actions confirm |
| Expansion cap | 500 warn, 2,000 warn and confirm | Neighborhood expansion |
| Effects cap | 5,000 nodes | Glow and Outline available below it |
| Progressive loading | chunk size, error limit | Loader |
| Force layout above threshold | ask / settle in background / never | Layout start |
| Layout pre-steps, step multiplier, settle threshold | engine defaults | Live layouts |
| Hover and tooltips | on below the threshold, off above | Cross-cutting |
| Show performance overlay | off | Debug readout |
| *XR* | | *The four rows below apply to a VR or AR session (5.9)* |
| XR entry ceiling | 10,000 visible nodes or 50,000 visible edges | The desktop large-graph threshold, not the render ceiling; above it the Views menu offers a visible subset, and above 50,000 visible nodes it disables entry with the reason on the row |
| XR frame floor | 72 Hz | Below it detail reduces automatically with "Reduced detail to keep the view smooth" |
| XR run estimate cap | 5 s, 1 s until algorithms run off the main thread | A run above it is refused in place with "run this at the desk", because a stalled frame in a headset is a comfort problem |
| XR comfort | snap turn 30 degrees; vignette on continuous turn | No camera acceleration ever; the user never moves, the graph does |

- Capabilities: keyboard-shortcuts (the shortcuts reference), large-graph-
  rendering settings.

Resting state and doors in Settings (6.11). Settings is a full-panel overlay
and therefore has no region boundary for a pop-out to sit clear of, so a
pop-over inside it would have nothing to point at. The mechanism is already
applied here at the right scale: the nav item is the door and the pane is what
is behind it. That is a PICKER and not a section, which is why the
always-expands rule does not reach it -- a nav row carries no chevron, opens a
full pane rather than a transient, and is one of seven mutually exclusive
destinations rather than a disclosure of its own row's content (6.11). The
extension of RT-1's door rule to section scale that this used to cite is
withdrawn, and the arrangement it justified stands on the picker clause
instead. That is written down so a later pass does not "fix" Settings with
pop-overs.

Refused, with reasons. Saved items is 26 user-named rows across 8 kinds on one
screen, which is floor item 7 and 6.11's own refused example, and its per-row
verbs are correctly hover-revealed under RT-7's hover split. The provider cards
are an accordion, which already anchors each key and model inside that
provider's own row at full width. Detected > Change discloses four numeric
fields, which is exactly 6.2's inline threshold. And the four XR rows stay
resident because 5.9 requires them learnable before the headset goes on, so
Rule 7c does not fire.

Two exceptions, and the Performance pane rests at about 25 control rows rather
than about 33 -- a count the always-expands rule leaves standing, because both
exceptions are gears on rows that are themselves resident and no section in
this pane was ever emptied into a door.

- Layout size ratings, 360, from a gear on the row it belongs to. A header plus
  nine engine rows of constants that are benchmarked before release sits 35 px
  above Layout stepping, which collapses three settings into one row reading
  "engine default": same pane, same content class, two treatments. 6.2's
  arithmetic settles it -- a schema group of more than four rows becomes a 3a
  pop-out from a gear on the row it belongs to -- and 6.11 assigns the 360 rung
  to a three- or four-column table.
- Rebind a shortcut, 280, anchored to the key chip that was clicked (above).

Appearance carries the second escape hatch of 6.9's Rule 11, "Keep advanced
sections open", default off, which ships in the same revision as the doors.

Help (rail, bottom)

- Menu, in this order: Keyboard shortcuts (?), "Show suggestions" (restores a
  dismissed Insights strip at any later time), "More suggestions (N)" listing
  the insight cards dropped by the four-card cap (7.3), "Already run (N)" -- a
  flat list of retired card names, each re-runnable, with no estimates and no
  return to the strip -- Documentation, Send feedback. The two count-bearing
  rows are SUBMENUS, because their members are verbs too and 6.11 routes verbs
  to menus. Every one of these rows is indexed by the command palette, so the
  Help menu is never the only route to any of them. Help draws four rows, all
  verbs, and is already at its floor: nothing here is hidden, and saying so is
  part of doing the disclosure review honestly.
- Also in the menu: "What the marks mean", a plain reference for the
  state marks the canvas legend no longer draws (5.1 Legend hygiene) -- what
  Selected, Linked to the selection, Matches filter, Filtered out, Not on path,
  Outside window and the note marker look like on the canvas. It is app chrome,
  learned once, constant across every dataset, and this is where it is learned.
- The ? reference is a non-modal OVERLAY, not a dialog: same content, no scrim,
  no focus trap, the canvas keeping pointer and keyboard, Escape closes. 6.11's
  first question is exclusive and its list is closed, so a shortcuts table is
  never a dialog; it is not a legal pop-out either, since 740 px is over the
  480 ceiling; and the modality defeats the use, because you read a binding in
  order to press it and a frozen canvas forbids exactly that. The
  keyboard-shortcuts capability asks for an overlay in its own words. This is
  the same closed-list conflict the report editor hits in Present, and both are
  resolved in one edit.
- Capabilities: guided-onboarding (the re-show action), keyboard-shortcuts.

Cross-cutting (no panel)

- graph-rendering; zoom-pan (the canvas toolbar overlay, the pointer and
  keyboard bindings in 5.6, and the zoom percentage in the status bar);
  view modes 2D, 3D, VR and AR (section 5.6); hover-highlight and
  tooltip-display (on below the large-graph threshold and off above it, with
  the switch in Settings > Performance and the Performance mode chip listing
  the state; click selection always works; above the threshold hover, when
  enabled, highlights only incident edges whose other endpoint is in the
  viewport, capped at 500, and dims nothing; tooltips appear on a 150 ms
  dwell and read the degree from the cached adjacency count; drag-to-move is
  off above the threshold); overview-minimap; details-on-demand (the
  inspector and the canvas context menu); keyboard-shortcuts (the bindings
  themselves, defined in 5.6; every tooltip ends with its binding as a kbd
  chip, which with menus, the palette and the shortcuts table is the only
  place a binding appears).

### 5.4 Inspector contents by selection

Header: a pin icon appears whenever a node, edge, selection or result is
shown. Pinning freezes a copy of the current content as card A above the
live content; the live content continues to follow the selection and its
numeric rows show a delta against A. One pin at a time; unpin from the card
or on data reload. Below 1280 px the pinned card is a second tab of the
inspector overlay.

| Selection | Inspector shows |
|---|---|
| Nothing | Graph summary: the plain-language reading (section 7.5) first, with Copy reading in its header row, which copies the reading plus the caveats line plus the Counts rows plus the legend's channel lines, so one click produces a paragraph a user can paste to a colleague. No count line sits above the reading; the status bar owns node and edge totals (5.1). Then Counts as a tier 2 section, collapsed by default and remembered per 6.5, holding one Type row ("Directed (from file), weighted (amount), timed (opened)"), average links per node, density in its plain form with the scientific notation on hover, connected parts as "3,412", and self-loops and parallel edges when non-zero; isolated nodes and the largest part's share are in the reading and are not repeated as rows. Most connected: top 5 by degree with "See all N ranked" opening the Data table drawer, the repeated unit word on the column header rather than on every row, and a hover-revealed download icon on the section header whose menu holds "Export top 20 (CSV)" and "Export ranked list (CSV)"; plus a 50 px degree histogram (log scale above the threshold). Schema section, which expands in place: open, it draws the node-type rows with their counts and the edge-type rows with their counts as the short two-column tables, capped at five with an "N more" row, and Filter to type / Select all of type as one RT-7 verb row beneath them, because of the readers who open Schema the type names and their counts are what they came for (6.11); closed, the header keeps its summary ("4 node types, 3 edge types") as its state mark and carries "measuring..." until SchemaExtractor is ready, and that summary is deleted the moment the type rows are drawn, because the rows say it. Its gear takes the rare remainder into a 480 pop-out to the left of the inspector: per-type completeness, and the type-pair list drawn as a matrix with node types on both axes and edge counts in the cells. Export schema JSON stays in the trailing slot. The matrix is a two-dimensional relationship and is drawn honestly only as a matrix, which is the width-driven case that justifies having 480 in 6.11's ladder, and it is now opened from a gear on an expanded section rather than being the section. One collapsed Attributes section with Nodes and Edges tabs (the first 20 with a filter box and "N more", distinct counts computed lazily on expansion from a 50,000-row sample above the threshold, the sampling caveat stated once inside the section rather than on both tabs, capped at "1,000+ values", id-like attributes marked "unique"). Case notes render as one affordance: "Add a case note" at zero, "N case notes" above it. One link, "More in Analyze", replaces the several pointers into that panel. Diameter and average path length are not in the inspector; they live in Analyze tier 2. Counts read as shown of loaded of total while a filter, window or subset is active, and as a plain number when shown, loaded and total are equal. Rows show "Computing..." until their background pass finishes. |
| One node | Label with a copy-id icon and a Locate icon (centers and zooms to the node at a scale where its neighbors resolve), a Pinned badge with Unpin when the node has been dragged, subtitle "Selected 1 of 120,000 visible (1,000,000 total)" while a filter, window or subset is active; attributes section (the existing DataAccordion grid: per-cell Copy value and Copy path, where the path is the JMESPath the Style By attribute select and the Explore filter builder accept, or a [name] token for formulas, chosen from a two-item menu; Copy all; a filter box above 10 attributes; collapsible groups from the "::" namespace prefix or the source table ("Joined from expression.tsv"); a pinned group of the attributes currently encoded or filtered, separated from the rest by a hairline rule rather than by a "Key attributes" sub-header inside a section already titled Attributes; the node's type is not repeated as a row when the header badge shows it, the id row is dropped when the displayed label equals the id (the id-type annotation moving to the copy-id tooltip), and a long text value renders as its shape ("sequence  393 aa, MEEPQSDPSV...") with a copy icon rather than 390 inline characters; the first 10 rows (label, type, then alphabetical) with the count on the link and not on the header ("Attributes" plus "Show all 52"); numeric formatting of 3 significant digits with scientific notation below 1e-3; a small type glyph; list values as chips; text over 100 characters truncated with Show more; "Not set" for missing values; cells edit on double-click, undoable); computed metrics (any results that include this node, each under its plain name with the technical field name muted, dual results showing both columns, the raw value and a percentile "4,212, top 0.4%" with the normalized value in the tooltip, and no rank sub-row where the reading already states the rank; the percentile row carries its explanation in an info circle, 6.7); notes: an "Add a note..." input (one line, grows to a text area on focus; cmd-Enter saves, Escape cancels), then existing notes newest first, each with author, relative time (full timestamp on hover), color chip, tag chips, text and a Done checkbox; hover shows Edit and Delete; done notes collapse under "N done"; neighbors: the count with a breakdown by edge type capped at the top 5 types plus "N more types" ("12,412: 9,100 logon, 3,380 process") and, when a Groups result exists, a per-group breakdown beside it ("in 4 groups: group 3 holds 71%"), a sortable list (neighbor, edge type, weight, recency) with the per-type counts as filter chips, In, Out and All tabs on directed graphs, which carry their own counts, so there is no separate directional degree breakdown row and no "Both N" line duplicating the section header count; the neighbour-type prose line is dropped wherever the type filter chips already carry the same numbers, and Neighbors-in-group and Share-of-neighbors render as one row, the top 10 by edge weight then neighbor degree, 20 rows then "Show all in data table" and Select these, "See all 12,412" opening a virtualized list paged at 100 with a filter box, and per neighbor row "Note this relationship" (a stopgap until edge selection ships, 5.8); actions: Expand neighbors as a split button (main action uses the last node and edge type filter, the arrow opens the type checkboxes, each carrying the "Adds about N" that box alone would add; reads "Expand 37 neighbors" below 500, "Expand top 50 of 12,412 by weight (Choose which)" above 500 where Choose which opens the Explore expansion section. Every estimate binds to the path that spends it and never to the capped default, which is floor item 4 read forwards -- the cost estimate goes with its control: the line under the button opens with that button's own cost, "Adds 50 nodes", and the warning, its consequence and its "anyway" belong to expanding all of them, "All 12,412 may slow the canvas down. Expand all anyway". A capped default is never warned about a cost it does not incur; pairing "Expand top 50" with "Adds about 12,412 nodes" made one control quote two sizes for one tap, and on a touch screen there is no hover to tell a reader which of them it meant), Select neighbors (same depth control; confirms above the selection cap), Ego network (applies the radial layout with this node as focus; Hops 1 to 5 beside Max nodes, default 1, changeable from the canvas chip's steppers), Frame this node (camera only), Radial layout around this node, Use as root or focus (fills the active layout's node input), Pin or Unpin (live layouts), Find path from here (opens Analyze > Find a path with From filled and focus in To; a canvas click also fills To), Distance from here (opens Analyze > Distance from here with From filled), Likely missing links from here, Simulate removing, Merge with..., Tag... (writes a multi-value tags attribute; tags are data, notes are not), Bookmark this node, Show in table (opens the Data table drawer on this row), and under More: Copy as JSON (attributes and metrics only), Copy neighbor ids (warns above 1,000). Computed metrics, neighbors and the actions block never move below the first screen of the inspector; the content scrolls and the action block is pinned at the bottom. |
| One edge | Endpoints as "source -> target" (each a link that selects that node), attributes table as for a node, weight and time when present, notes (as for a node); actions: Select endpoints, Simulate removing this edge, Filter to this edge type, Find alternate route (Every route with this edge excluded), Show in table, Delete edge (undoable), Copy as JSON. |
| Multiple nodes and edges | Count reads "3 nodes, 2 edges"; the status bar shows N selected. Selection statistics: count, shared attributes (above 10 selected nodes an Attribute profile: top three values per categorical attribute with percentages, five attributes shown, "Show all" -- inline at every density, because nine rows of the user's own attribute names and top values is a scan surface made of floor-7 data and a reader comparing five attributes cannot open five doors), and each aggregate beside its whole-graph value with an above or below marker; the section expands in place onto the two-column Selection and Graph form -- Nodes 7 against 200, Edges 4 against 612, Average links per node 9.4 against 6.1 -- which the Data table drawer already draws at four rows and the Explore panel at seven in the same 256 px band, and both regions that draw this section take that same resident form; when a pin is active or above the selection cap the third column (A, B, Graph and Delta) does not fit the band, so a gear on that section opens a 360 pop-out carrying the three columns, the "inside the selection" split, the per-attribute means and the Export CSV of attribute, A, B, graph and difference, and only the pinned-A case needs the 360; notes: "Add a note to these N nodes" creates one note targeting the set; notes on any member are listed grouped by target with a "Show on canvas" link. Actions: Zoom to selection (becomes "Filter to selection" when the selection's bounding box covers more than 60% of the graph), Filter to selection, Save as subgraph (name, counts; "Disease module, 66 nodes"; appears in Explore > Saved filters), Save as set, Style selection (creates a layer selecting on a per-node flag, not an id list), Select neighbors (depth), Expand neighbors of all, Invert, Copy ids, Pin as A (the next selection shows as B beside A and the whole-graph column, with Export CSV of attribute, A, B, graph, difference), "Merge N nodes" with two to five selected, naming the survivor and merging immediately with the default conflict rules (one Cleaning step, and the toast "Merged 2 nodes into acct-4471" with Undo and Review conflicts beside it), and "Merge selected nodes" above five, which opens the Data merge dialog pre-filled (warns above 100 with the reason shown and confirms), "Export selection..." (lands in Present with Scope preset), Find path between (exactly two nodes), Simulate removing (N) (one scenario; warns above the selection cap and runs anyway), Remove selected (undoable, toast with Undo), Tag..., Set attribute on selection..., Pin selected positions, Layout selected nodes only, Pin to report, Show in table (opens the drawer in Show: Selected), Clear selection. Above the selection cap (default 5,000) the inspector switches to summary form: count, type breakdown, a categorical profile (the top three values of the group id and of up to five categorical attributes, with percentages, from the attribute index, so joined demographic columns and group membership survive the cap), and the five numeric attributes with the largest difference from the whole-graph value, then "Show all 38"; whole-graph aggregates come from the attribute index, selection aggregates are computed in the background behind a "Computing..." skeleton. |
| Style layer | The existing StyleLayerPropertiesPanel, plus the Source section at tier 1 when the layer was created by a run (5.3, Style, Analysis-backed layers): the reading in full, the caveats line when there is a departure, the one-line run record with its Details chevron, the deviating parameters as live rows whose change re-runs the algorithm under Analyze's three cost bands, and "Open result". Then: Which nodes or Which edges: the Explore attribute, operator, value builder compiling to JMESPath (6.6), with a tier 3 Expression toggle showing the raw string; the selector applies on Enter or blur, not per keystroke; the helper line reads "Matches 41,200 nodes" (names only when 5 or fewer match) and "Matches about 41k (sampled), counting..." above the threshold until the exact pass finishes, with a Preview matches link that selects them on the canvas; Use as filter. Every encodable row -- Color, Size, Opacity, Shape, Label text, Edge width, Edge color, Line style, Edge opacity -- is one field row whose mode is what the field contains (Rule 6, 6.9); there is no Fixed / By attribute segmented pair, because binding a row is choosing an attribute in it, from a select whose last group is "Not computed yet": the node metrics this graph supports that have not been run, each a 12 px play glyph, the plain name, the technical name dimmed, and a trailing hint reading "not run" under 2 s and the estimate otherwise. A metric that has not been computed is still an encoding you can pick: choosing one runs it and applies the selection the user was making, as one undoable pair, under the same estimate-and-confirm gate the Insights strip and the palette use. The row shows a spinner while it runs, the type-default scale or palette is already editable, and a helper line reads "Computing Bridges (betweenness)... 42%  Cancel", mirrored in the status bar. On completion: one result card in Analyze, one Data table column, one entry in Explore's attribute list and no duplicate; the encoding applies; the legend updates; and one history entry, "Ran Bridges (betweenness) and encoded it as node size", which one undo takes back in full. Metrics that cannot run on this graph are listed disabled with the reason in the tooltip; cubic and unbounded metrics are never listed. The search input at the top of the popover is required, not optional, and not-run metrics sort last inside Metrics, never above a file attribute. Analyze's "Encode as style" is unchanged and remains the other way in; a run started from an attribute list is an ordinary run with the same queue, progress row, result card and history entry. The select also shows the distinct-value count beside each categorical attribute; above the palette size the top values by frequency are colored and the rest painted Other, and the helper says "Top 9 of 3,412 values colored"), a Palette select for color (grouped Categorical, Sequential, Diverging with swatches, defaulting by attribute type: text to Okabe-Ito, number to Viridis, signed number to Blue-Orange) or a Scale select for numbers (Linear, Square root default, Log, -log10, Bins, Five tiers) with min and max clipped at the 99th percentile by default ("Degree 1 to 812 (99th percentile) maps to sizes 1.0 to 2.0; 1,040 nodes above are capped. Change"), the Range and Categories sub-modes of 5.3 Style; a tier 3 Expression mode per row exposes inputs and expression with inline validation. Effects: Glow with Color and Strength when on, Outline with Color and Width, Wireframe, Flat shaded; Glow and Outline warn for layers matching more than the effects cap (default 5,000 nodes) with "Effects on 41,200 nodes will slow rendering. Narrow the selector, or turn on anyway" and stay available Label adds a "Show on" control (All matched, Top N by degree with N default 50, Selected only, Hovered only) whose default above the threshold is Top N. Edge properties (shown when the layer has an edge selector): Line (Type across the 9 patterns, Width, Color, Opacity, Curved), Arrow head (Type with icons, Size, Color), Arrow tail under More, Label and Tooltip popouts, Animation speed under More; above the threshold Color, Width and Opacity only, with dashed, dotted and arrow styles off by default with the note "Line styles are off in Performance mode. Turn on anyway" and a switch to enable them. Rich text popout tiers: text source, font, size, color, location inline; background, outline and shadow, depth fade as sections; badge, pointer callout, borders, margins, billboard and resolution under Advanced. The legend names the palette in use. Attribute ranges, percentiles and distinct counts come from the one attribute index (5.3 Data, Schema); controls show "measuring..." until it is ready. |
| Algorithm result | Reading, caveats line, the one-line run record with its Details chevron (section 5.3, Result shapes), then the body for its shape, then the resident state swatch and layer name with "Change encoding" where the run painted, "Delete layer" and "Remove result" (both undoable by toast; Remove result names the layer count before it acts). The card in the Analyze Results list is collapsed to title, state and headline while this view is open, so one body is on screen at a time. |
| Pattern match | Match count, the ranked match list, the matched nodes of the current match, Center on match, Select match. |
| Cleaning step | Before and after of the selected step (section 5.3, Data). |

Row types in the inspector (6.9). The inspector is the same 280 px column as
an activity panel and takes the same grid, the same 24 px field and the same
32 px pitch. Three moves carry it. A metric row is one RT-6 row and not two
lines: plain name, technical name dimmed beside it, then a rank chip and a
micro-bar for the percentile, because a percentile and a rank are the same
fact in two units. A distribution is drawn rather than summarised: the degree
histogram is an RT-9 chart row with its two axis ends labelled, which deletes
"min 2, median 3, max 4, std dev 0.62" and the three-row "2 links: 5 / 3
links: 12" list beneath it; the exact figures stay one click away in Copy
methods text and in the export, which is what keeps floor item 3 honest. A
word repeated down three or more rows of one list rises to the column or
section header and is deleted from every row -- links, members, Text, Not set
(Rule 9) -- and a sentence explaining an affordance the rows already
demonstrate, such as "Arrows show above or below the graph average", is
deleted outright (Rule 8). Attribute rows keep their left-hand text labels at
every density: they are the user's own strings, floor item 7. The reading
stays first and in full, never circled and never shortened (floor item 1).

Edge and multi-selection do not exist in graphty-element yet (SelectionManager
is single-node; 5.8); until they do, the neighbor row's "Note this
relationship" keeps per-link evidence from being blocked, and mockups mark
edge and multi-selection controls "Coming".

The same actions are available from a canvas context menu (right-click,
long-press or two-finger tap on iPad, Shift+F10) on nodes, edges,
multi-selections and empty canvas, each item showing its binding (5.6). The
menu is a shortcut, never a home.

### 5.5 Command palette

Opened by cmd-K or ctrl-K, or the top bar button (its pill reads "Search
commands, nodes and edges" on every screen). Fuzzy search over every
capability by both plain-language and technical names (including every
Method name, every Advanced-group card, and "Modules" as a synonym for
Groups), plus sample datasets, recent files, bookmarks, view actions (Zoom
to fit, Zoom to selection, Zoom in, Zoom out, Reset view, Switch to 2D
view, Switch to 3D view, Top view, Front view, Side view, Isometric view,
Follow selection, Save current view, Toggle minimap, Toggle legend, Enter
VR, Enter AR, Exit VR or AR, Keyboard shortcuts), every layout by plain and
technical name (opens Style with the list focused), every palette, Open
from URL, Paste data, Data table, Compare, History entries, recipes, saved
filters and subgraphs, saved patterns, selection sets, notes (each note is
searchable by text, target, author and tag; selecting one centers its
target and opens the inspector Notes section), the actions "Add a note to
selection", "Show notes", "Find a note", Export video, Copy image to
clipboard, settings sections, and every item registered by an extension. The
index also carries, because 6.4 requires a palette route for every capability
and these were the holes on the longest paths: Open file; "Import options"
(technical: import mapping), enabled only when a file is loaded; "Change the
column mapping"; "Ask the assistant..."; Console; "Show suggestions"; "More
suggestions (N)"; "Already run (N)"; "Copy the graph summary"; the Help menu's
documentation and feedback items; every question-group batch action ("Run all
node rankings" / "All centralities", and each group's "Run all (N)"); the Data
table drawer's "Compare measures" / "Top N by each metric", disabled with its
reason until two ranking results exist; "Export selection..."; one row per
pop-out, which is 6.11's second required route (Time slider settings,
Validation report, Group profile, Run record, Schema, All statistics, Filter
expression); one `Save as <kind>...` row per saveable kind and one `Apply
<kind>: <name>` row per saved entry, with kinds that cannot apply right now
dimmed and reasoned, which is what Cmd/Ctrl+S opens the palette scoped to
(5.6); "Show canvas toolbar", which is the only way back once the toolbar is
hidden (5.6); and "Select a region", the one-shot marquee verb.

Because the Analyze catalogue no longer rests in its panel (5.3 Analyze), the
index also carries the question phrasings and outcome words a user can produce
when they cannot produce a method name -- "which nodes matter", "what holds
this together", "weak points", "modules", "clusters" -- each landing on the
card that answers it, and the filter tokens @run, @selection, @weighted,
@directed and @fast. The palette is one of the three routes 6.4 is satisfied
by there, so it grows in this revision while the panel shrinks, which is the
correct direction for a retrieval surface.

An Attributes group indexes the objects capabilities act on, not only the
capabilities: every node and edge attribute, computed attribute and result
metric by both names, with its type and range and four actions -- Color by,
Size by, Filter by, Show in table -- chosen with Left and Right and run with
Enter. Without it "color by an attribute" had no keyboard route at all.
Commands always rank above Attributes, the Attributes group caps at five rows
with "and N more", and it appears only after three typed characters.
Rows show their key chip on the right and, for algorithms, the estimate as
secondary text ("Tight-knit neighborhoods  Clustering coefficient  about 4
min on 1,000,000 nodes") with a muted summary of the remembered parameters.

Enter opens the item's home panel with the control focused and, for a
parameterized algorithm, its parameters expanded and the estimate visible.
Enter runs an item directly only when it has no parameters and its estimated
cost on the current visible graph is under 2 s; Cmd-Enter runs a
parameterized algorithm immediately with its last-used parameters (defaults
on first use) on the current scope, subject to the same 2 s gate (above it
Cmd-Enter opens the card with Run focused); the right-hand hint reads "Enter
to open, Cmd-Enter to run" or "Enter to open" accordingly. That split applies
to capability rows only; on every other row -- a sample dataset, a recent
file, a bookmark, a view action, a Help item, an attribute action -- Enter
performs the row's action directly. Running a sample dataset row from the
palette can replace the loaded graph, so it passes through the same guard the
Import options dialog's "What to do with this file" step applies to a second
file. Rows sort with an exact id or label match first, matching the Explore
search rule. The palette also accepts "@a > @b" and offers one "Find a path"
row whose Enter runs it under the same 2 s gate. The empty palette
opens with a Recent runs group listing the last five History entries with
their parameter summary. Prefixes: a leading @ searches node ids and labels
(Enter selects and centers, Shift-Enter adds to the selection, Cmd-Enter
opens Find a path with From filled); above the large-graph threshold the
palette does not index nodes and an @ query or any query matching data shows
one delegating row per type under a Data group ("Nodes matching 'bridge'
12,408  Open in Explore", count from the search index, shown as "10,000+"
above that) whose Enter opens Explore with the query filled; a leading =
runs an expression filter; a leading > sends the rest of the line to the
console. Select all visible confirms above the selection cap.

### 5.6 Navigation and input

This section is the single owner of every binding. Settings > Keyboard
shortcuts, the Help dialog (?), tooltip chips and palette rows all render
this one table from one dispatcher in the shell. A new binding is added
here, never to a panel.

View modes. The canvas is 3D by default (Settings > Defaults, Initial view).
A [2D | 3D] segmented control is the first item of the canvas toolbar;
5 toggles it. Switching re-fits the graph. VR and AR are entered from the
Views menu and appear only when the browser reports session support;
graphty-element's own VR and AR buttons are off (xr.ui.enabled false) so
the shell owns entry. Both rows carry the 5.9 entry gate: under the XR entry
ceiling the row reads "Enter VR"; between the ceiling and 50,000 visible nodes
it reads "Enter VR (visible subset)", with the subset named in the entry
sheet; above 50,000 visible nodes it is disabled with the reason on the row.
Only "Enter VR" carries a second line, the readiness count; "Enter AR" carries
none, because two second lines would make the XR pair the visually heaviest
item in a menu whose real job is Reset view. Choosing either row opens the flat
entry sheet of 5.9, never the session directly. The AI setImmersiveMode tool is
subject to the same gate. While a session is active the status bar mode chip
reads VR or AR with an Exit button and the palette offers Exit VR or AR;
Escape never leaves XR. The AI setImmersiveMode tool enters the same modes.

Canvas toolbar. One horizontal floating bar, centred on the live canvas rect
and riding above its bottom edge. Order, left to right, by how long the effect
lasts: the [2D | 3D] segmented control (5 toggles it); a divider; Zoom out
(-), Zoom in (=), Zoom to fit (0, Home), Zoom to selection (F); a divider;
Views (a cube with an up-caret, opening the menu upward). Zoom out precedes
Zoom in because magnitude increases rightward on a horizontal bar, where
in-above-out was already correct vertically.

The item set is fixed. Nothing appears or disappears with selection or state,
because a centred container that changes width moves every item under the
pointer. Zoom to selection is therefore permanently drawn and merely disables,
carrying the register's exact disabled title "Zoom to selection (F). Select
something first", which is floor item 4's reason-a-control-is-disabled. The
Graph / Table segmented control stays at the top centre of the canvas and never
enters the bar, for the same reason. Tooltips open upward.

Geometry, every number derived from a token the shell already owns. Items are
28 x 28 with the register's fixed 14 px glyph, giving 7 px clear space against
6.8's 24 x 24 hit area with 4 px clear. Height 36 sits between the shell's
24 px row and its 40 px top bar. Padding 3 with a 4 px item radius makes the
container radius concentric at 7. The width follows:

```
3 + 60 + 12 + (28*4 + 2*3) + 12 + 36 + 3 + 2 borders = 246
pad  seg  div     zoom group    div  views pad
```

Below 1280 px, 6.8 point 3 already mandates the larger form for any icon that
is the sole path to a capability, so the responsive rule falls out of the icon
rule rather than being invented here: items 32, segmented 68, Views 40,
dividers and gaps unchanged, giving 3 + 68 + 12 + (32*4 + 2*3) + 12 + 40 + 3 +
2 = 274 at height 40. Nothing else changes between the two sizes. The bar
carries the existing tooltip shadow token and is the only canvas overlay that
does; lift is what makes it read as an instrument, and the minimap and legend
stay flat, which correctly sorts them as content boxes. The 7 px radius and
the shadow are a deliberate two-value exception and are recorded as such
rather than left to drift into a general "floating" style.

The bottom stack, bottom to top: the canvas rect; the Data table drawer, which
is a dock and therefore shortens the rect; the time slider, an overlay on the
bottom edge of whatever rect remains; the toolbar, an overlay riding 12 px
above whichever of those is beneath it. The minimap and the legend share the
toolbar's baseline wherever 5.1 draws them. Nothing new is invented -- 5.1
already says docks resize the canvas while overlays do not, and already docks
the slider to the top edge of the drawer -- so the four offsets fall out with
no new arithmetic:

| State | Toolbar bottom offset |
|---|---|
| nothing else on | 12 |
| time slider on (70 px) | 82 |
| drawer open (260 px) | 272 |
| drawer open with the slider docked to it | 342 |

The toolbar is not merged into the time slider bar: the slider exists only
when a Time role is assigned, so a merged bar would change size and position
the moment a user maps a timestamp column, and the toolbar would inherit the
slider's conditional life. Two objects, 12 px apart. When the Graph / Table
control maximises the drawer to the full canvas height there is no canvas left
to navigate, so the whole bar leaves with the minimap and legend and returns
when the drawer is restored; Graph / Table is the way back. That is the only
condition under which the toolbar is not drawn, and it reads as "there is no
canvas" rather than as an item vanishing.

Horizontal clearance. The minimap, the toolbar and the legend share one 12 px
baseline with 16 px minimum clearance, so the two-line rule fires below 172 +
16 + 246 + 16 + 172 = 622 px of canvas, and 650 px for the narrow variant. At
1280 with the panel and the inspector both open the canvas is 672 px and the
clearance is 41 px a side, so nothing reflows at any standard desktop size.
When it does fire, the minimap and legend rise 48 px onto a second line using
the panel's own transition and the bottom band belongs to the toolbar alone;
they are never hidden, because the legend is floor item 5 and a hidden minimap
would leave its M toggle and its Views menu checkmark describing a state the
user cannot see, and the legend's 40 per cent height cap is measured from its
raised bottom. Panel and inspector widths are resizable, so drags are clamped
so the canvas never goes below 520 px; between 520 and 622 the two-line rule
handles it and there is no third step.

The bar can be turned off. A checked `Toolbar` row joins the Views menu's Show
group between Minimap and Legend, and 6.5's memory of minimap and legend
visibility grows to hold it. Hiding the toolbar hides its own Views menu, so
the way back is the command palette row "Show canvas toolbar", always
available on Cmd+K; the toolbar takes no key binding of its own, because M and
L are taken and it is the only one of the three canvas overlays whose toggle
can hide its own front door. The toolbar is never on the Escape ladder.

Views menu. Reset view (Shift+0), Top (7), Front (1), Side (3), Isometric (3D
only), Follow selection (toggle), Save as view..., Show minimap (M), Show
toolbar, Show legend (L), Enter VR, Enter AR (when supported). It opens
upward, its bottom edge 4 px above the toolbar's top edge, centred on the
Views button, clamped 12 px inside the canvas's left, right and top edges and
scrolling internally if the stack pushes it up -- the clamp is real rather
than theoretical, because on iPad with the drawer and the slider open the
menu's top would otherwise land 3 px above the canvas top. The trigger's caret
points up. Tooltips carry the key chip.

There are no persistent tool modes; the pointer, hand and zoom tool toggles of
the current BottomToolbar are removed, and no Select or Pan mode replaces
them. A mode would add a concept in a revision whose direction is subtraction,
would need two new glyphs in a closed register, and would break 3D orbit on a
bare-touch iPad. The gap that proposal identified is real and is closed by a
verb instead: see the touch paragraph below.

Zoom percentage. Fit extent divided by current extent: 100% means the whole
graph fits the viewport, 200% means half of it does. In 3D: fit distance
divided by camera distance. Range 10% to 1000%. The status bar reads "Zoom
100%" and clicking it opens Fit, Zoom to selection, 50%, 100%, 200%.
Updates on every camera change including inertia. It does not enter the
toolbar, and "One fact, one region" gains the row that says so, for three
reasons recorded because this is the decision most likely to be reopened. The
percentage is already adjacent: with the toolbar at bottom offset 12 and the
status bar 24 px directly beneath, it renders about 12 px below Zoom in and
Zoom out, grouped by proximity at zero cost. A numeric readout would change
the bar's width as the graph is zoomed from 10% to 1000%, which is precisely
the width instability a centred bar cannot tolerate. And peer tools that moved
every tool to a bottom bar left the percentage elsewhere in the shell.

Pointer bindings, desktop mouse, 2D then 3D:

| Gesture | 2D | 3D |
|---|---|---|
| Left-drag on empty | Pan | Orbit |
| Left-drag on a node | Move node (pins it) | same |
| Left-drag on a multi-node selection | Move the group (pins them) | same |
| Middle-drag, Space+drag | Pan | Pan |
| Shift+drag on empty | Marquee select | Marquee select (screen space) |
| Wheel | Zoom at cursor, 10% per notch | Zoom at cursor along the cursor ray, 10% per notch |
| Ctrl or Cmd+wheel, trackpad pinch | Zoom at cursor | same |
| Shift+wheel | Pan horizontally | same |
| Right-click | Context menu | same |
| Double-click a node | Frame the node | same |
| Double-click empty | Fit | Fit |
| Click empty | Clear selection | same |

Right-drag is never bound: on iPad the two-finger tap is the secondary
click. Trackpad and iPad: Settings > Defaults "Scroll wheel: zooms / pans",
default zooms on desktop and pans on iPadOS (Mac platform with more than
one touch point). In pans mode two-finger scroll pans in both views; pinch
and Ctrl or Cmd+wheel always zoom, with the page zoom suppressed. The
cluster buttons and the = and - keys remain guaranteed zoom paths on every
platform. Touch: one-finger drag pans (2D) or orbits (3D), two-finger drag
pans, pinch zooms, two-finger twist rolls the 3D view only (2D rotation is
off unless Settings > Defaults enables it, and Fit and Reset view restore
it to zero), a 500 ms long-press or two-finger tap opens the context menu,
double-tap frames a node or fits. Box select needs Shift+drag and there is no
Shift in the touch list, so marquee selection would otherwise be unreachable
on a bare-touch iPad -- which gates "N selected", Filter to selection, Save as
set and the whole multi-node inspector. The fix is a verb, not a mode: "Select
a region" joins the canvas context menu and the command palette, arms the next
drag on empty canvas as a marquee, and disarms on release. One shot, no
persistent state, no status chip, no register addition, and no effect on any
existing gesture; on desktop it is a second route to a binding that already
works, which 6.4 wants anyway.

Selection. Click selects one node or edge and replaces the selection;
Shift+click adds; Cmd or Ctrl+click toggles; Alt+click removes;
Shift+Alt+click intersects (tier 3 refinement); Shift+drag on empty is a
marquee; Cmd or Ctrl+A selects all visible; Escape clears (see the ladder);
Enter opens the inspector on the selection. The selection is a set, one for
nodes and one for edges, shared by the canvas, the Data table drawer, the
inspector, Explore and Analyze. The status bar shows "N selected".

Keyboard. Bindings fire only when focus is outside a text field or
contenteditable and no modal is open. Cmd and Ctrl are interchangeable.
Browser shortcuts are never overridden.

| Group | Binding | Action |
|---|---|---|
| Navigation | = or +; - | Zoom in; zoom out |
| Navigation | 0 or Home | Zoom to fit |
| Navigation | F | Zoom to selection |
| Navigation | Shift+0 | Reset view |
| Navigation | Arrows | Pan (2D) or orbit (3D); Shift+arrows pan in 3D. Settings > Keyboard shortcuts offers the alternative "Arrows walk the selection to the nearest neighbor" (Coming, 5.8) |
| Navigation | 1, 3, 7 | Front, side, top (3D) |
| Navigation | 5 | Toggle 2D and 3D |
| Navigation | Space (held) | Turns a left-drag into a pan |
| Selection | Cmd/Ctrl+A | Select all visible |
| Selection | I | Invert selection |
| Selection | E; Shift+E | Expand neighbors of the selection by one hop; select neighbors of the selection |
| Selection | G | Ego network of the selection |
| Selection | P | Find path between two selected nodes |
| Selection | Enter | Inspect the selection |
| Selection | Delete, Backspace | Remove selected nodes or edges after a confirmation naming the counts (a Cleaning step; undoable, toast with Undo; Coming, 5.8) |
| Selection | Escape | The ladder below |
| Panels | Cmd/Ctrl+K | Command palette |
| Panels | / | Focus Explore search |
| Panels | Cmd/Ctrl+B | Toggle the activity panel |
| Panels | D | Toggle inspector |
| Panels | M; L | Toggle minimap; toggle legend |
| Panels | T | Toggle the time slider (when a Time role is assigned) |
| Panels | Shift+T | Toggle the Data table drawer |
| Panels | Backtick (`) | Focus the assistant input when a provider is configured, the console otherwise |
| Panels | Shift+backtick | Focus the console (AI panel), always |
| Panels | ? | Keyboard shortcuts dialog |
| Panels | F6; Shift+F6 | Cycle regions (rail, panel, canvas, inspector, status bar, the Insights strip when it is shown, then docks when open, with an open pop-out cycled immediately after the region that owns it); reverse. Within the strip, Left and Right move between cards, Enter activates and Delete dismisses |
| Panels | Shift+F10 | Context menu on the focused element |
| Notes | N; Shift+N | Add a note to the selection (focuses the inspector input; on iPad opens the inspector overlay; with nothing selected opens the case note); toggle the notes layer |
| Edit and files | Cmd/Ctrl+Z; Shift+Cmd/Ctrl+Z, Ctrl+Y on Windows and Linux | Undo; redo |
| Edit and files | Cmd/Ctrl+S | Open the command palette scoped to Save, listing one `Save as <kind>...` row per saveable kind, with kinds that cannot apply right now dimmed and reasoned. The browser default is intercepted deliberately: every user who wants to keep a style will press it, and the honest answer is that there is no one thing to save (5.3, Saved things) |
| Edit and files | Cmd/Ctrl+O | Open file |
| Edit and files | Cmd/Ctrl+V | Paste data while the canvas or the drop zone has focus |
| Time slider | Comma; period | Step back; step forward (from anywhere) |
| Time slider | Shift+comma; Shift+period | Jump to start; jump to end |
| Time slider | Space; arrows | Play or pause; step, only while the slider has focus |
| In a panel | Up, Down | Move between cards, rows and result rows; Enter on a result row or a path step selects and centers the node |
| In a panel | Enter; Cmd/Ctrl+Enter | Run the focused card with current parameters; open its parameters |
| In a panel | Tab | Follows tier order |
| Inspector notes | Cmd/Ctrl+Enter; Escape | Save the note; cancel |

Rail activities have no hotkeys: no digit modifier is collision-free
(section 12); the palette is the keyboard path to a panel. Never bound: Cmd
or Ctrl with T, W, N, Q, H, M, L, D, F, P, R, +, -, 0, 1 to 9, comma,
Shift+I, Shift+T; Alt with digits, D, F, Home. Every tooltip shows its
binding. All bindings are listed and rebindable in Settings > Keyboard
shortcuts. None of this is visible at tier 1. Every capability is reachable
by keyboard alone through this model (6.4).

Escape ladder. One rung per press, first match wins: 1 cancel an
in-progress node drag (restore position, do not pin) or marquee; 2 close
the topmost transient: context menu, popover, pinned or unpinned pop-out,
palette, dialog, returning focus to the opener that produced it; 3 on narrow screens close the overlay panel or inspector;
4 pause time slider playback; 5 clear the selection and the selected style
layer; 6 nothing. Escape never closes the desktop activity panel and never
leaves XR.

Context menu. Opened by right-click, two-finger tap, long-press or
Shift+F10. On a node: Frame this node, Expand neighbors, Select neighbors,
Find path from here, Radial layout around this node, Pin or Unpin, Add a
note, Merge with..., Copy id. On an edge: Inspect, Select endpoints, Add a
note. On a multi-selection: Zoom to selection, Filter to selection, Save as
set, Invert, "Export selection..." (lands in Present with Scope preset),
Remove selected. On empty canvas: Fit, Reset view, Select a
region, Select all visible, Paste data, Switch to 2D or 3D. Items carry key chips. Every item
is also reachable from its home panel or the inspector; the menu is a
shortcut, never a home.

Where a binding appears. A key binding is shown in exactly four places: the
control's tooltip, as the last element of the tooltip sentence after a 6 px
gap; a dropdown, context or row menu item, right-aligned in the item's
trailing column; a command palette row, in its last cell; and the shortcuts
table (the ? dialog and Settings > Keyboard shortcuts). Nowhere else. A
binding never appears inside a button, never in the trailing column of a panel
action row, a switch row or a section header, and never in any trailing column
that also carries data on other rows: a trailing column means one thing per
list. Two chips are not bindings in disguise and stay: the top bar search
pill's Cmd+K and the / hint inside a search input, both printed inside a real
input where a hint belongs. The ? dialog renders only bindings whose action has
shipped; Settings > Keyboard shortcuts renders the full table with its Coming
tags and is where the unshipped ones are learned. An unshipped row carries no
key chip anywhere, because a binding that does nothing is worse than no chip.

Action shapes. A panel action that is not its section's primary action is a
subtle action row: transparent at rest, no border, 24 px tall, full panel
width, 4 px radius, a 14 px leading icon in the dimmed colour, an 11 px label
at weight 500, hover as its only chrome, with the hover fill one step lighter
than the panel so the row is obviously clickable. Its trailing slot carries
data about the action or nothing -- never its key. An action drawn as a
bordered box with a trailing chip reads as a text field with a suffix and is
never used; bordered and filled boxes inside a panel are reserved for inputs,
selects and the section's primary button. The leading icon is mandatory,
because a transparent row is otherwise not obviously clickable. The binding a
user loses from the row's face is on the tooltip, in the context menu, in the
palette and in the ? dialog.

Follow selection. While on and exactly one node is selected, the camera
target tracks that node each frame without changing distance or
orientation. Any manual pan or a cleared selection turns it off.

Element dependencies for this section are listed in 5.8.

### 5.7 Notes

A note is text attached to a node, an edge, a set of nodes, or the whole
graph. Notes are the evidence log for W06 and W09 and the "annotate
findings" need of the intelligence analyst. Plain name Notes, technical name
Annotations. Home: Explore (the Notes section, 5.3) with the input in the
inspector (5.4).

Fields: id; target, one of node (id), edge (source, target, edge id when
present), nodes (id list), graph; text, plain text with line breaks, at most
2000 characters; author name and kind (user, ai, import); createdAt and
updatedAt as ISO 8601; optional color from six named tokens; optional tags,
at most 10; done flag with doneAt. No rich text. Limit 1000 notes per
dataset, warning at 900.

Anchoring: a note stores element ids only, never coordinates. Markers are
placed at render time from the element's current position, so notes survive
re-layout, camera moves and 2D/3D switches. The nodes target replaces free
canvas placement and is what a multi-selection produces; its marker sits at
the on-screen centroid of the members.

Storage: notes are an app-level collection, a sibling of bookmarks, filters
and results, and never live in imported attributes, a style layer or a
template (the inspector's Tag... action is different: tags are data written
to an attribute). Until project files exist they persist in browser local
storage keyed by a dataset fingerprint (file name, node and edge counts,
hash of the first 100 ids), as bookmarks do, with Export notes and Import
notes (JSON) in the Explore Notes section for hand-off. Add, edit, done and
delete are entries in the top bar undo stack. A node merge (5.3 Data)
retargets notes to the surviving node and adds the tag "merged from <id>"
in the same undo entry. A note whose target is missing after a removal or
re-import is kept and listed under "Target not in graph"; notes are never
dropped silently.

Canvas: a marker glyph on each element with an open note, tinted by the note
color; hovering shows the newest note and "N more"; clicking the marker
selects the element and scrolls the inspector to Notes. A "Show notes"
switch (Explore Notes header, Shift+N) hides the layer. Markers are not
affected by style layers, and the selection style never hides them. Markers
draw only for elements on screen plus every selected element; above 200
visible markers, or whenever the Performance mode chip is on, markers
collapse into screen-space clusters on a 64 px grid reading "12 notes", and
clicking a cluster zooms to its bounds. Done notes never draw markers. Hover
previews are off while a layout is running. Under a filter or time window,
markers follow visibility and the Notes header reads "Notes: 8 of 14 on
visible nodes".

Keyboard: N adds a note to the current selection (focuses the inspector
input; on iPad opens the inspector overlay; with nothing selected opens the
case note). Shift+N toggles the notes layer. Cmd-Enter saves, Escape
cancels. Both are rows of the 5.6 table.

Dictated notes. A note dictated in a headset (5.9) is an ordinary note with
one extra mark: a "Dictated" chip beside the time in the inspector, in the
Explore notes list and on the notes hover card, so a transcript is re-read
before it is relied on. The export prints the Dictated mark whether or not the
chip is drawn. "Flag this" writes a note with empty text whose body reads
"Flagged in VR 14:32" in the placeholder style. Notes are append-only in a
session: Edit, Delete and Done do not exist there, and all three work normally
at the desk.

Implementation dependencies on graphty-element, recorded in 5.8 so the
mockups do not assume them: edge selection and multi-selection; a reserved,
non-deletable style layer whose selector reads a synthetic per-node note
count written through Graph.updateNodes, driving the existing badge support
so markers are in-scene and appear in screenshots; the hover card is DOM
positioned with worldToScreen because the element's tooltip style is not
rendered.

### 5.8 Implementation status

Mockups show only what the packages can do or what is marked here. Status
values: shipped; wrapper needed (exists in @graphty/algorithms or
@graphty/layout, not registered in graphty-element); new work (exists
nowhere). A control whose status is not shipped carries a muted "Coming" tag
in the mockup and no reading template asserts its output. Where three or more
contiguous rows in one list, menu or section share that status, the tag is
rendered once on the group header or divider and the rows are dimmed and
disabled instead of tagged individually, with one info circle on the panel
reading "Dimmed rows are not built yet."; isolated unshipped rows keep the
per-row tag. At the density of sixty-odd tags the tag stops reading as status
and starts reading as texture, and a menu that reads as mostly broken costs
confidence, which is a W14 criterion. An unshipped row carries no key chip
(5.6). A control that section 5.1 or principle 6 requires -- Cancel during
loading is the case -- is never tagged Coming: if its path has not shipped it
is drawn disabled with its reason in the tooltip. Until each item
exists, the corresponding control degrades as its section states
(indeterminate progress, hidden Cancel, a warning with Continue anyway, a
subset default) rather
than showing a control that does nothing. The mockups draw the target state.
This is the one dependency register; section 11 points here.

| Feature | Status | Depended on by |
|---|---|---|
| k-core, link prediction (common neighbors, Adamic-Adar), edge betweenness, personalized PageRank, weakly connected components, bipartite check, hierarchical, spectral and Markov clustering | wrapper needed | 5.3 Analyze question groups |
| Clustering coefficient, all simple paths, anomaly detection, removal impact, temporal analysis, subgraph search (the package has whole-graph isomorphism only), Jaccard, preferential attachment and resource allocation scorers, node-type pair and hops-from-seed options, bipartite projection, hold-out evaluation UI over the existing evaluate functions | new work, algorithms | 5.3 Analyze, Explore |
| Sampled betweenness and closeness (k sources with a seed), Louvain seed (betweenness.ts options are normalized, endpoints, optimized; louvain.ts has no seed; leiden.ts has one), label propagation as the large-graph Groups default | new work, algorithms | 5.3 Analyze seed and sample fields, caveats line |
| Weight attribute and direction on every algorithm (knownFields.edgeWeightPath must feed toAlgorithmGraph; only PageRank has a weight option today), articulation points and bridges, progress and cancellation per run, algorithms hosted off the main thread | new work, algorithms and element | 5.3 Analyze running and scope, 7.5 |
| Ego-centric radial engine, Sugiyama hierarchical, selection-scoped layout, pinned-node state, disconnected-graph handling in bfs, attribute-driven multipartite, a layout host off the main thread | new work, layouts | 5.3 Style, Layouts |
| Node and edge visibility layer (id-set visibility mask), time attribute detection, Weight, Time and Label roles (knownFields) honoured by the time slider, Analyze defaults and labels | new work, element | 5.3 Explore, Data |
| Multi-select and edge selection (a selection set with Shift and Cmd/Ctrl semantics and marquee; SelectionManager is single-node today), node, edge and canvas contextmenu and dblclick events with the browser menu suppressed, Cmd handling in InputManager, removal of the built-in W/A/S/D and Q/E keys and of canvas focus on camera enable, keyboard event emission beyond ctrl-z, ctrl-y and ctrl-a | new work, element | 3, 5.4, 5.6 |
| Wheel zoom and pan in 3D, cursor-anchored zoom in both views, a zoomToNodes(ids) API (used by the cluster, Explore, the inspector, double-click and the AI zoomToNodes tool), honoring the 2D rotationEnabled flag, a zoom percentage on camera-state-changed, a followNode(id) helper, Views menu presets from the existing built-in camera presets | new work, element | 5.6 |
| Streaming parsers with edges chunked alongside their nodes, a yield to the render loop between chunks, an AbortSignal through data loading, loads through the operation queue so Cancel works and progress is by node count | new work, element | 5.1 status bar, 6.1 Loading |
| Count repeated edges at import so the combine policy and the validation report see them (storing them as parallel edges is a future phase, section 11), report edges whose endpoints are unknown at the end of a load instead of buffering them silently, count self-loops and isolated nodes | new work, element | 5.3 Data import policies and validation |
| A mutation API (update attributes, remove node with its edges, merge nodes, column operations) that returns an inverse for undo | new work, element | 5.3 Data Cleaning steps, 5.1 undo |
| Bulk style write (per-instance color and scale) instead of per-node mesh recreation, thin-instance or point rendering for nodes, one batched line buffer for edges, a single scene-level pick per pointer move, viewport culling and a label budget, a bulk positions buffer and an in/out adjacency index | new work, element | 5.1 canvas, 7.2, Settings > Performance |
| A reserved note-marker style layer driven by a synthetic note count through Graph.updateNodes; a DOM hover card positioned with worldToScreen | new work, element | 5.7 |
| SVG and PDF export, GraphML, GEXF and CX2 writers, SIF and CX2 parsers (CX2 flattens v.* into node attributes, uses v.name as the label and keeps x, y, z as initial positions), DOT and Pajek parsers where missing | new work, element | 5.3 Data, Present |
| A composed legend block written into the export at export scale, in the PNG, JPEG, WebP, SVG and PDF paths, emitted as vector text in the SVG and PDF ones. The export path is `CreateScreenshotAsync` over the Babylon scene and the legend is a DOM overlay in the shell, outside that scene, so an exported image carries no legend today and cannot carry the DOM one; the block is composed from the encoding model and written into the existing 2D-canvas stage of `ScreenshotCapture.ts` | new work, element | 5.1 Legend, 5.3 Present, 6.10 item 5 |
| The layer source binding and its Source section, `metadata.source` in StyleTemplate v1 with the three import outcomes, re-run from a layer under the shared cost gate, highlight layers in the Layers list, and the FloydWarshall category mismatch (it declares category `path` while colouring a per-node eccentricity, against a spec shape of Fact: Farthest apart stays a Fact whose supporting nodes are the centers, and the per-node eccentricity is exposed as an ordinary node metric in the Not computed yet group) | new work, app and element | 5.3 Analyze, 5.3 Style, 5.4 |
| A documented app subset of `StyleTemplate` with a strict-mode-safe partial read, and the two off-by-default Save dialog checkboxes over `knownFields` and `algorithms` | new work, app and element | 5.3 Style |
| Library storage for every saved kind (5.3, Saved things) with per-kind import and export, the dimmed unbindable-row state, and Settings > Data management > Saved items over the same entries | new work, app | 5.3, 5.6 |
| Tier 3a pop-out surfaces (6.11): the shell, the pin, the anchor and flip rules, the one-per-region limit and the narrow-screen sheet form | new work, app | 6.11, 5.2, 5.3, 5.4 |
| The canvas toolbar (5.6): the bar at both sizes, the four bottom offsets, the two-line minimap and legend state, the 520 px canvas clamp, and the Views menu opening upward | new work, app | 5.1, 5.2, 5.6 |
| A column data table component (the current DataGrid is a JSON tree grid), undo and redo, legend, minimap, search outside the AI, bookmarks, computed attributes, node merging, data export, report generation, style presets, recipes, console, AI tools for select, undo, filter, expand, findNotes and addNote | new work, app | 5.3, 5.4, 5.5 |
| Arrow-key walking of the selection to the nearest neighbor (keyboard-shortcuts capability), offered as an alternative arrow binding in Settings > Keyboard shortcuts; pan and orbit stay the default | new work, app | 5.6 |
| Delete selected nodes and edges with confirmation, as a data mutation with an inverse in the Cleaning steps store | new work, element and app | 5.3 Data, 5.4, 5.6 |
| Table join (Attach mode), Map identifiers and identifier-system detection, built on the mutation API; the Data tier 1 row, the Import options "Add attributes from a table" choice and both dialogs carry the Coming tag on every artboard until it ships | new work, app | 5.3 Data |
| Bipartite projection card and hold-out evaluation block (Coming on the Predict group), Compare over a second file (Run on A/B/both, namespaced results, Biggest differences, position matching), ego network hops from the canvas chip, direction-aware removal impact, batch merge cost model and progress | new work, app and algorithms | 5.3 Analyze, Explore, Data |
| WebXR session lifecycle owned by the app: immersive-vr and immersive-ar session request, end, and unexpected-end events, with graphty-element's own XR buttons off | new work, element | 5.9, 5.6 |
| An in-headset world-space UI layer with forearm anchoring and an arcmin-based text scale. This exists in no form today and is the largest single XR dependency | new work, element | 5.9 wrist panel and follow card |
| Grab-the-world on empty space with a scale clamp and a scale-changed event. Also exists in no form today | new work, element | 5.9 navigation |
| Ray-plus-trigger and pinch selection feeding the same selection set as the flat shell, with an Add toggle and a 200 cap | new work, element | 5.9 selection |
| Gaze-plus-pinch substituted automatically where the session reports eye tracking | new work, element | 5.9 selection |
| Snap turn with a vignette on continuous turn, and no camera acceleration in any XR path | new work, element | 5.9 comfort |
| Automatic detail reduction below a frame floor, with the reason surfaced to the app so it can be stated on the wrist panel | new work, element | 5.9 comfort and size |
| Passthrough framing captured by Capture view in AR | new work, element and app | 5.9 AR |
| Push-to-talk speech capture inside an immersive session, with a capability probe so the dictation route can be hidden rather than disabled | new work, app | 5.9 running and notes, 5.3 AI |

### 5.9 XR (VR and AR)

VR and AR are a viewing mode for a graph built at the desk, not a second
shell. A rail-and-panels shell does not transfer to a headset: there is no
rail, no activity panel, no 280 px inspector, no status bar and no dialogs in
a session. Nothing in designloom asks for XR -- no persona, no workflow, none
of the 61 capabilities -- so it earns its place as a viewing mode written as
an honest degrade, and it costs the flat shell no artboards and no
capabilities. Everything below is the complete contract.

Scope, in one sentence. In XR you look, select, inspect, expand, ask and note;
everything that authors data, filters, encodings or exports stays flat.

Two surfaces and no others.

- The wrist panel, anchored to the left forearm at a 0.6 m stand-off, 0.24 by
  0.32 m: a header, at most eight content rows, and one row of four large
  actions. Three type sizes: title 45 arcmin, body 30, label 24.
- The follow card, billboarded beside the selected node at the node's depth,
  0.30 by 0.18 m at 1 m: five rows, two type sizes.

Neither surface uses a smaller size, a table, a monospace id by default, or an
ellipsis. A value that does not fit is replaced by its shape and the row
offers "Read at the desk".

What works, what is read-only, what is unavailable:

| Activity | In a headset |
|---|---|
| Data | Unavailable. Nothing authors data in XR. |
| Explore | Read-only, plus "Expand one hop" and voice search. Filters, the filter builder and saved sets are read-only. |
| Analyze | Results are readable as their plain-language reading. At most eight parameter-free runs can be started; everything else is read-only. |
| Style | Read-only. No layout switching: a relayout in a headset is a moving world. |
| Present | Capture view only. |
| AI | Yes, and it is the primary text route in a session. |
| Settings | Comfort only. |

Entry. A flat sheet on the desktop screen before the session starts, carrying
a readiness line (headset, controllers, visible node count against the entry
ceiling), an "In VR you can" list, a "Do these at the desk" list, the Comfort
row, "Don't show this again", Cancel and Enter VR. Suppressing the sheet never
suppresses the readiness warning.

Navigation. The user never moves; the graph does. Grab-the-world is the whole
model. Snap turn 30 degrees by default, with a vignette on continuous turn.
Fit means fit and recenter. The Views presets turn the graph, not the head.
There is no teleport in phase one. World scale is clamped so the graph never
subtends more than 120 degrees and never shrinks below 0.1 m.

Selection. Ray plus trigger, or pinch; gaze plus pinch is substituted
automatically where the session reports eye tracking. No marquee. An Add
toggle replaces Shift. The selection cap in a session is 200, well under the
flat cap, because a selection you cannot read is not a selection.

Running. Voice is the primary route and the Run list of eight parameter-free
runs is the guaranteed one. A run whose estimate exceeds the XR run estimate
cap is refused in place -- "About 40 s -- run this at the desk" -- because a
stalled frame in a headset is a comfort problem, not a wait. Until algorithms
run off the main thread (5.8) the cap is 1 s and the list says so.

The assistant in a session. The microphone becomes push-to-talk on the
controller's B or Y and on the wrist panel's microphone target, held rather
than toggled, with the transcript on the wrist panel and two large targets,
Send and Discard. Answers in session are the same readings shortened to two
lines plus "Read the rest at the desk". Where the headset browser has no
speech recognition the microphone and the whole dictation route are hidden
rather than disabled, and the Run list and "Flag this" are the guaranteed
paths. The console has no XR form.

Notes. Readable and addable, append-only in session: no Edit, Delete or Done.
Dictated by voice with Save and Discard, marked "Dictated" (5.7), with "Flag
this" as the provider-free and speech-free fallback.

Entering and leaving. Entry carries in the selection, filters, time window,
style layers, results and notes, and places the graph at 0.8 m at arm's length
rather than inheriting the flat camera; the time slider is frozen for the
session. Leaving carries out everything the session changed plus one XR
viewpoint bookmark, and restores the flat camera; an unexpected end takes the
same path. On return the shell shows "Back from VR" with one summary line
naming what changed and Undo for the expansion only; no toast appears when the
session changed nothing. History records the session as one collapsible group,
"VR session 14:21 - 14:39", whose voice-taken steps carry "by voice, in VR" on
their second line, so the exported recipe and the analysis log say where each
step came from. Exiting is not itself a step and is not undoable. While a
session runs the status bar mode chip reads VR or AR with an Exit button and
the flat shell stays interactive as a mirror; Escape never leaves XR (5.6).

Comfort and size. The XR entry ceiling is 10,000 visible nodes or 50,000
visible edges -- the desktop large-graph threshold, not the render ceiling --
because the budget is two eyes in 13.8 ms. Labels are capped at 20 at every
size. Performance mode is always on in a headset regardless of the Settings
value. Below the XR frame floor detail reduces automatically with "Reduced
detail to keep the view smooth". There is no camera acceleration, ever.

AR differs in three ways only: the graph floats at table height in
passthrough, Capture view records the passthrough framing, and hand tracking
is unavailable, so AR is controller-first.

The element work XR rests on is in 5.8, the six things it refuses are in
section 11, and the five things it has reasoned rather than measured are in
section 12. Those three are mandatory companions to this section: without them
the numbers above read as benchmarked.

## 6. Disclosure rules

Two independent axes. State decides what exists. Tier decides how visible it
is within a panel.

### 6.1 State axis

| State | Trigger | What appears |
|---|---|---|
| Empty | No data loaded | Welcome in the canvas area (section 7.1). Rail shows Data, AI, Settings, Help enabled. Explore, Analyze, Style, Present are visible but disabled with a tooltip "Load data first". Inspector hidden. Failed load is a sub-state of Empty: the error appears inline in the drop zone, or the Import options dialog stays open with the issues listed. |
| Loading | A large file is being loaded progressively | Rail as Loaded, except that Analyze cards in the heavy, sampled, cubic and unbounded cost classes are disabled with "Available when loading finishes"; instant cards carry a "Partial data (24% loaded)" note. Status bar shows the three loading phases with Cancel. The canvas shows loaded nodes at their file positions or on the quick grid; no force layout runs. The Data table drawer appends rows as chunks arrive. The Insights strip appears on load complete, on "Cancelled at 24%" and on subset loaded alike, with the subset caveat on its readings. |
| Loaded | Data loaded | Full rail enabled. Canvas renders the graph with default styling (7.2). Inspector shows graph summary. Insights strip appears (7.3). If validation produced warnings, the Data rail icon carries the issue-type badge and the status bar shows the "N data issues" chip, which opens Data with the validation report expanded. If the dataset has open notes, the status bar shows the "N notes" chip, which opens Explore with the Notes section expanded. The Loaded data section lists the applied import policies. The completion toast names any role that was guessed or changed and its Details link opens Data with the mapping line highlighted for two seconds; on the session's first load the panel switches to Explore, the one exception to 6.5's last-active-activity memory (5.1). The Data table drawer is available from this state on. |
| Loaded, subset | Loaded with a subset drawn | The filter strip reads "Showing a sample: 50,000 of 1,000,000 nodes. Change", the status bar carries "Sample: 50,000 of 1,000,000", every scope line names the sample, and the graph summary reading opens with "Showing a sample." |
| Selected | Selection says something on the canvas, not only in the inspector: a single-node selection draws its incident edges in the selection colour at full opacity and outlines its immediate neighbours, and nothing is dimmed. Below the large-graph threshold every incident edge is drawn and the top ten neighbours by weight are labelled regardless of the label cap, capped further where one node's degree alone would exceed the hover-highlight cap of 500; above the threshold the rule matches hover-highlight exactly. A multi-node selection highlights edges between selected nodes only. One or more nodes or edges selected. Click selects one, Shift+click adds, Cmd/Ctrl+click toggles, Alt+click removes, Shift+drag on empty canvas draws a marquee, click on empty canvas or Escape clears; the Data table drawer and result tables select the same way (5.6). | Inspector switches to the selection and shows the Notes section for it with an "Add a note" input; N focuses it. Status bar shows "3 nodes, 2 edges selected". Explore and Analyze panels add selection-scoped actions (ego network, paths from here, filter to selection, select neighbors of selection, save as set, merge selected). Exactly two selected nodes add Find path between. Selection is one store for nodes and one for edges, shared by the canvas, the Data table drawer, the inspector, Explore's Select all visible and Analyze's Select top N; the table keeps no selection of its own. Rules: a row click selects that node or edge and the inspector shows it; Shift+click extends a range; Cmd/Ctrl+click toggles; Cmd/Ctrl+A in the table equals Select all visible; canvas selection highlights the matching rows and, in Show: All, scrolls the first one into view; Show: Selected filters the table to the selection and is the mode the drawer opens in when the selection count is non-zero; Escape clears the selection everywhere; the Nodes tab and the Edges tab selections are independent. Multi-select in graphty-element's SelectionManager is an implementation dependency (5.8). |
| Result | An algorithm has completed | Analyze panel shows a result card in the Results tab. Inspector offers the result when clicked. On first completion the result applies its shape's primary action as a style layer automatically, identically from every route (5.3 Analyze, Result shapes), unless a user-authored style layer already drives that channel; the legend updates and the application is one undoable step separate from the result. While an algorithm is still running, its card shows the progress row and the status bar mirrors it. |

States are cumulative. Selected implies Loaded. Result implies Loaded.

### 6.2 Tier axis

Every control in a panel is assigned one tier.

- Tier 1, inline. Always visible when the panel is open. What an intermediate
  user needs for the common case.
- Tier 2, collapsed section. One click to open. Parameters with defaults,
  secondary lists. The open or closed state is remembered per section in
  local storage. An expert who expands parameters keeps them expanded.
- Tier 3a, pop-out. Reached by a gear icon, a trailing chevron or a "More"
  affordance. No scrim and no focus trap: the canvas keeps pointer and
  keyboard, selection keeps flowing, every change previews live, Escape
  closes, and at most one is open per region. Rarely changed settings, one
  member of a list, or a report read once. Section 6.11 owns the rule.
- Tier 3b, dialog. Scrim, focus trap, canvas frozen, one commit point. Only
  for a commit the canvas must wait on.

Tier assignment test: if fewer than half of the intermediate personas would
touch the control in the workflow's common phase, it is not tier 1. If it is
changed less than once per session, it is tier 3. A control the user scrubs
or steps repeatedly while watching the canvas (the time slider, a match list,
the Data table drawer, Compare) is never a dialog; it is an overlay or a tier
2 section. A control the user scrubs while watching the canvas is never 3a and
never 3b, but its settings may be 3a and may never be 3b. That is what lets
the time slider keep its transport, track, sparkline, playhead and Viewing
readout on the canvas while its settings move into a pop-out, and it is why a
pop-out may itself contain a scrub control such as the filter builder's
dual-handle quantile slider.

Zero, null and default rows are not drawn. A row, chip, caption or clause
whose content is "nothing here" or "the default is in force" is not rendered:
legend blocks for unencoded channels and the whole legend when nothing is
encoded; "Isolated nodes 0" and "(largest holds 100%)" when there is one
connected part; section header counts of 0 or 1; "None active", "None yet",
"Not computed" beside a Coming tag; "100% filled" on a complete column;
"Nothing was guessed" as a standalone line; "Below the render ceiling"; the
word "Skipped" beside a Skip role chip; a default axis scale named in a
caption, so only a non-default scale prints its name; "Yes" before a value
that answers its own row ("Weighted | amount (strength)"); and the zero half
of a selection count ("3 nodes", not "3 nodes, 0 edges"). Absence is already
legible, and more legible once the zeros stop competing with the values. Rows
that are still computing read "Computing...", so an absent row unambiguously
means zero.

A count on a header only when the section is collapsed or truncated. A group
or section header shows a count only when the count says something the reader
cannot see: the section is collapsed, or it is expanded but truncated.
"Attributes 34" with "Show all" keeps its count; "Computed metrics 2" above
two visible rows does not. Catalogue counts -- "4 cards", "5 actions", "18
engines, 5 families", "4 results", "2 views", "2 saved", "Actions 20" -- are
not drawn at all. A header count never carries a unit word the section name
already supplies.

For controls generated from an option schema the tier is derived: options
not flagged advanced are tier 2 inline under the card or layout, options
flagged advanced are tier 3 behind the gear, and the schema group names the
tier 2 section. A schema group of more than four rows renders as a 3a pop-out
opened from a gear on the row it belongs to; four rows or fewer render inline.
Force directed's three visible parameters therefore stay inline and the rule
visibly does not fire, which is the point of stating it as a number rather
than as a judgement. Structured inputs (node, node set, partition, ordering)
follow the option-kind rules in 5.3 Analyze and the Layouts subsection of
5.3 Style. The tier test in this section applies to hand-placed controls
only.

### 6.3 Vocabulary rule

Labels lead with plain language and carry the technical term second, in
muted text or parentheses. The pair is rendered on one line; the technical
name never occupies a line of its own, and mode or invocation detail is not
part of the pair ("Node merging", not "Node merging, batch mode"). At narrow
widths the technical half truncates with a tooltip; the plain half never does.
Both names are still rendered, so principle 4 holds; only the layout changes,
and that recovers the space that would otherwise be found by dropping a
technical name into a tooltip -- which this document refuses on cards, in
dense statistics tables, on segmented layout controls and in the status bar
alike. The canonical pair may be rendered in either
order per the Settings > Appearance label order preference; both names
always appear.

One drawing, and one case. The pair is rendered as the plain name, a space,
then the technical name in parentheses in muted ink, inside one label: `Most
connected (Degree centrality)`. Muted text without parentheses is not a second
allowed rendering, and neither is a right-aligned second column, because a
reader cannot tell a right-aligned second name from a right-aligned value. A
technical name that already carries a parenthesis flattens to a comma:
`Find groups (Communities, Louvain)`, never a nested pair of brackets. The
technical half is written in sentence case -- a capital on its first word,
proper nouns keeping theirs -- except where the parenthetical names a number
the row reports rather than a method the user runs, which keeps the attribute's
own lowercase spelling: `Connected parts (components)` in a counts table
against `Find connected parts (Components)` on a card. The test is one
question: does the string answer "what method?" or "what column?". Where the
pair will not fit, the technical half truncates with a tooltip and the plain
half never does; where a row has no room for even a truncated parenthetical,
the technical name goes to the row's info circle, or, on a row that may carry
no icon-only control, to the row's own title. Canonical pairs:

| Plain | Technical |
|---|---|
| Groups | Communities (Louvain) |
| Groups | Communities (Leiden) |
| Groups | Communities (Label propagation) |
| Groups | Communities (Girvan-Newman) |
| Tight clusters | Markov clustering (MCL) |
| Connected parts | Components |
| Following direction, Ignoring direction | Strongly, weakly connected components |
| Core layers | k-core decomposition |
| Tight-knit neighborhoods | Clustering coefficient |
| Most connected | Degree centrality |
| Incoming, Outgoing, Both | In-degree, out-degree, total degree |
| Average links per node | Mean degree |
| Influence | PageRank |
| Attenuated influence | Katz centrality |
| Hubs and authorities | HITS |
| Closest to everyone | Closeness centrality |
| Well-connected neighbors | Eigenvector centrality |
| Bridges | Betweenness centrality |
| Bridge edges | Edge betweenness |
| What breaks if removed | Removal impact analysis |
| Bottleneck capacity | Max flow, Min cut |
| Backbone | Minimum spanning tree (Kruskal, Prim) |
| Best pairing | Bipartite matching |
| Farthest apart | Eccentricity, diameter (Floyd-Warshall) |
| Find a path | Shortest path (BFS, Dijkstra when weighted, Bellman-Ford with negative weights) |
| Distance from here | BFS levels |
| Walk from here | Depth-first search |
| Every route | All simple paths |
| Unusual nodes | Anomaly detection |
| Likely missing links | Link prediction |
| Which categories stand out | Category table (term enrichment table) |
| Custom score | Computed attribute |
| Find a pattern | Subgraph search |
| Around the selection | Ego network |
| Step through time | Temporal navigation |
| Track changes over time | Temporal analysis |
| How tightly linked | Density |
| How separate the groups are | Modularity |
| Links inside | Internal density (of a group) |
| Steps from here | BFS level |
| Project to one node type | Bipartite projection |
| Score against held-out links | Hold-out evaluation |
| Compare | Comparison view |
| Data table | Node and edge table |
| Add attributes from a table | Table join |
| Map identifiers | Identifier mapping |
| Close dataset | New session |
| Notes | Annotations |
| Case note | Graph-level annotation |
| Done | Resolved |
| Callouts | Visual annotations (text, arrows, shapes) |
| Arrangement | Layout |
| Force directed | ngraph |
| Layers from a root | bfs |
| Rings around a node | radial (ego-centric) |
| Layered | sugiyama |
| Circle | circular |
| Shells | shell |
| Layers by attribute | multipartite |
| Two sides | bipartite |
| From file | fixed |
| Edge length | springLength |
| Pull to center | gravity |
| Stiffness | springCoefficient |
| Damping | dragCoefficient, velocityDecay |
| Speed vs accuracy | theta |
| Spread | scalingFactor |
| Iterations | maxIter, iterations |
| Random seed | seed |

Where both names render, and which rule governs. The 1.6 compaction system
proposes the pair on first mention per surface and on every string that leaves
the app. That is not a competing rule; it is this one read at surface
granularity, and this section governs. A surface is one scroll container with
one header: the activity panel, the inspector, one dialog, one drawer, one
menu, the canvas legend, the status bar. Both names render on the first
occurrence of a concept within a surface; on anything typed into or searched
(the filter builder, the Style attribute select, the palette index); on any
string that leaves the app (the run record, Copy reading, Copy methods text,
exported CSV and JSON headers, Present captions, and the canvas legend, which
travels inside an exported image); and always on the Insights strip and the
Welcome screen, which are where a first-time user binds the pair and which 6.8
already exempts. On a repeat occurrence inside the same surface, and on any row
whose section header already carries the pair, the primary name renders alone
and the secondary name stays on that row's info circle, in the control's title
and in the palette index, so 6.4 holds. Principle 4 therefore holds at surface
granularity rather than at occurrence granularity: the pair still binds once
wherever a reader arrives, and which name is primary is still the user's, under
Settings > Appearance, so the same rule shows a novice "Bridges" and an expert
"Betweenness". Two limits are hard. The technical name never occupies a line of
its own, so where the pair will not fit on one line at 280 px the technical
name goes to the info circle for that occurrence, first mention included --
which replaces the earlier allowance that let it wrap under 320 px. And the
pair never renders inside a 24 px field: a field holds the value, not the
concept's second name. The saving is on result screens, where one concept
renders four times within 900 px of travel, and it removes the 237
parentheticals across the artboard set; in a catalogue of 26 different
concepts, 26 first mentions save nothing, which is why the catalogue is
Decision A's problem and not this rule's.

The vocabulary rule covers user-facing concepts: algorithms, metrics,
layouts, attributes, panel and section labels. Settings storage keys are not
vocabulary pairs. A JSON key is not a synonym for a plain label; it is an
implementation address, useful to the small audience hand-editing a config or
writing a script. Configuration pages render them only when "Show config keys"
is on (remembered per 6.5), and the exported configuration file always carries
them. Layout engine names are exempt and stay visible: they are genuine pairs.

Section and panel labels use Notes; the command palette indexes both note
and annotation. The Present image option reads "Include note markers".
"Modules" is an accepted synonym for Groups in the command palette index.
"Followers, Following, Both" is retired because it is wrong on non-social
graphs. "2D" and "3D" are plain enough and carry no pair. The word "reach"
is reserved and never used as a plain name, because in marketing it means
audience size. Every explanatory tooltip in this document is an info circle (6.7): one
sentence, at most one docs link, with a visible 12 px affordance, so it is
reachable by pointer, keyboard and touch alike. Circles are added wherever the
design previously said "in the tooltip" for an explanation: the modularity
value, the Category table title, the percentile row in Computed metrics, the
Data table column headers, the "Treat as" control, the search-syntax hint and
the presets caveat. Tooltips without a circle are limited to reported text --
an unavailable reason, a truncated value's full text, a control's binding, an
exact count behind a rounded one. A dozen explanations with no on-screen
affordance do not exist on iPad, do not exist by keyboard, and do not exist
for a novice who does not think to hover, which is a reachability gap against
6.4. "Opens a dialog" is rendered as an ellipsis on the row label. Every technical name is
searchable wherever an attribute or capability list is typed into (filter
builder, style layer attribute select, palette). The command palette indexes
both names. The same input produces the same label, reading, and legend
text on every screen. A per-dataset domain hint (detected from attribute
names such as combined_score, logFC, gene, or set in Import options) swaps
only the example sentence in tooltips and readings ("Bridges (betweenness):
proteins that connect otherwise separate complexes"); labels, legend text
and reading templates are unchanged.

Saved-thing verbs. One vocabulary across every kind a user creates (5.3,
Saved things): `Save as <kind>...`, `Import <kind>...`, `Export <kind>
(JSON)`, and apply as the row click. `Load` is not in it. Every one of these
keeps its text label wherever it is a menu row, because the icon register
carries no save glyph and no import glyph; on a library section header the
verb is the resident plus, which is that list's add glyph and not a save
glyph (REGISTER 10.6). The kind nouns are register entries in their own right
and are used verbatim wherever the verb appears: style, filter, subgraph, set,
view, recipe, pattern, formula, report, mapping. The plus, not the bookmark,
is the glyph `Save as style...` is drawn with, because the plus is the add
glyph of the list the Styles header owns; that is what the artboards draw on
every library header across all ten kinds, and the plus serving two verbs on
one board -- `Add a style layer` on the Layers header, `Save as style...` on
the Styles header -- is a documented reuse in the icon register (REGISTER
section 8), not a new glyph. The plus is also what `Save selection as set...`
is drawn with, in the selection action cluster as well as on the Sets header.
The earlier allowance that let the bookmark keep the inline case, with no list
under it, is withdrawn: it left one verb with two drawings on one board, which
is the defect the icon register's section 9 names, and a reader who has learned
the plus on ten library headers has no reason to read a bookmark two rows below
one of them as the same verb. The bookmark is not extended and keeps the work a
text label carries beside it: the leading glyph on the `Save as view...` and
`Save as subgraph...` menu rows, and on a history entry recording a saved view.

### 6.4 Reachability rule

Every capability is reachable from its home panel, the command palette, and
the AI assistant (or the console). No capability is reachable only by
discovery. Every capability is also reachable by keyboard alone through the
model in section 5.6, and selection-scoped actions are additionally
reachable from the context menu.

Where a catalogue leaves a panel's resting state, this rule is satisfied by
three named routes and is audited against them. For the 26 Analyze cards (5.3
Analyze) they are the picker that "+ Analysis" opens, which is the home-panel
route; the command palette, which indexes every card and method by both names
plus question phrasings, outcome words and filter tokens (5.5); and the
Insights strip, which surfaces three to five runnable cards on load and keeps
its sentences (7.3). The AI panel and the console are unchanged as principle
3's free-form route. A capability that leaves a resting panel never leaves the
palette index, and Rule 7 of 6.9 may not hide a capability's only route.

A fourth route family joins the audit in this revision: everything behind a
pop-out (6.11). Each pop-out is reachable from a focusable opener in its
panel's tab order, from a command palette row indexed by both names, and from
its home panel row -- Time slider settings, Validation report, Group profile,
Run record, Schema, All statistics and Filter expression each have all three.
No keyboard binding is added for any of them, because the opener is in the tab
order and the palette indexes them.

About 25 rows move behind doors in revision 1.8, which makes this rule
load-bearing rather than a formality, so the audit gets a list rather than a
principle. Every door in the product joins the palette index by both names:
Image options, Data options, Export video, Report editor, Layout parameters,
Ramp options, Values table, Column role parameters, Join options, Table
columns, Provider, Console, Layout size ratings, Rebind a shortcut,
Neighborhood expansion, Ego network, Advanced parameters, Sweep runs, Filter
expression, Note editor, All statistics, Run record. Three further measures
ship in the same revision as the doors, not after them: the depth obligation of
6.11, which makes "one click" measurable and forbids a door behind a door; the
stub drawn in the primary ink whenever anything behind it deviates (6.11), so
that hiding never hides a deviation; and the second escape hatch of 6.9's Rule
11, Settings > Appearance > "Keep advanced sections open", which renders every
280 gear pop-out's contents inline.

### 6.5 Memory rule

Remembered per user in local storage: tier 2 section open states, Analyze
question group open states (including Advanced), last active activity,
panel widths, inspector collapsed state, time slider on or off, dismissed
Insights strip (global across datasets, restored only from Help), retired
insight cards, Data table drawer open state and height, Show mode, hidden
table columns (per dataset name), Compare split ratio and Link views,
density, label order, decimal places, pinned pop-out positions per pop-out
type, canvas toolbar visibility beside minimap and legend visibility, the
expand-all state of each panel (stored as the individual section states it
sets, so no new mode exists), reading collapsed state per view kind, run record open
state per view kind, the "Show config keys" switch, the "Show labels on
controls" switch (6.9, Rule 11), the Analyze picker's question-group open
states and its last search string, Analyze
card view (Cards or List), Analyze Run or Results tab, per-card Advanced
pins, per-header-signature import mappings, the Parsing group open state in
the Import options dialog, minimap and legend visibility, view bookmarks per
dataset, notes layer visibility, Notes section filter chips, the author
name. Nothing else adapts to the user. There is no inferred skill level and
no usage-based retirement of helper text; the only sanctioned usage-based
rule is insight card retirement. Notes themselves are project data, not
memory; they are stored with the dataset, not with the user.

### 6.6 Expression rule

JMESPath is the one query language for anything that selects nodes or
edges: style layer selectors, filter Expression mode, select-by-expression,
pattern node constraints, the palette's = prefix. All of them evaluate
against the same root: data.<attribute> for imported, joined and computed
attributes, algorithmResults.<namespace>.<type>.<field> for result metrics.
Computed-attribute formulas use the [name] grammar required by the
computed-attributes capability; a bracketed name resolves first to
data.<name>, then to the result metric whose technical name matches. In
Compare mode results carry the A or B namespace (algorithmResults.A.*,
algorithmResults.B.*) and formulas address them as [name.A] and [name.B];
an unqualified [name] resolves to side A. Copy-path actions (data table cells, inspector rows) copy the form the
destination expects: a JMESPath path for selectors and filters, a [name]
token for formulas, chosen from a two-item menu. The cell renders one copy
control carrying that menu, not a copy control beside a separate chain
control (6.8), which frees the chain glyph for the Compare split's "Link
views" toggle. The calculatedStyle expr of
graphty-element is not a user-facing language and never appears in the UI.
The console (5.3, AI) is the scripting route; the AI panel is the free-form
route.

### 6.7 Explanation rule

Explanatory text either teaches or reports. The test: read the sentence with
the data taken away. If it survives word for word it teaches, and it may go
behind an info circle. If any part of it changes or disappears, that part
reports, and it stays on screen. A sentence that mixes the two is split at the
boundary.

Taught text goes behind an info circle. Reported text is inline, and no
Settings value, density value or screen width may move it behind a circle.
Reported text includes, and is not limited to: plain-language readings (7.5),
caveats lines, run record lines, scope lines, estimates and cost warnings,
match counts and result counts, validation and error messages, empty states,
insight card bodies (7.3), and the reason a control is unavailable.

Three kinds of taught text stay inline anyway, because reading them late is
worse than reading them never: text on a control that changes or deletes data,
text on a control that spends more than the ask limit, and text that says
where the user's data or credentials go.

An info circle is never the only route to its sentence. The same string is the
control's accessible description, so a screen reader reads it on focus whether
or not it is drawn; it is indexed by the command palette with its control; and
Settings > Appearance draws every one of them inline at once. A circle changes
when a sentence is read, never whether it exists, so principle 1 holds:
guidance is on screen, one hover, focus or tap away, and still reachable.
Principle 1 is broken only when guidance stops existing or stops being
reachable. Disclosure is not vocabulary: the same string appears verbatim
wherever it appears, circled in one place and inline in another, and 6.3's
same-input-same-text rule is about the string, not its disclosure.

The control. A 12 px circled "i" in a 14 px box, stroke 1.5, in the dimmed
text colour at rest and the primary text colour on hover, focus or open, with
a 24 px hit area achieved through padding and negative margin so no row grows.
It sits immediately after the last name of the canonical pair it explains and
before any status pill, so the label order preference never moves it and it
never lands between the two names. It opens on a 150 ms hover dwell, on a
150 ms keyboard-focus dwell of the control it belongs to, and on tap; a click
pins it until Escape, an outside click or a second click. A circle attached to
a focusable control is not itself a tab stop; one attached to static text is,
with role button and aria-expanded. The popover is the tooltip bubble at
250 px: at most two sentences and 220 characters, then at most one "Learn
more" link, then the binding as a key chip when one exists. A sentence that
will not fit is not a circle. Below 1280 px and on any touch pointer, tap is
the only open gesture and the popover opens pinned. Info circles are chrome:
Performance mode and the "Hover and tooltips" switch govern canvas tooltips
only and never turn a circle off, so the densest screens keep their
explanations.

The master control is one switch, "Show help text in place" in Settings >
Appearance, default off (5.3). Density governs row scale only and never which
explanations are visible; one behaviour has one owner.

Deleted or disclosed, never both. A helper sentence is deleted only when it
restates a control, a value or a list visible on the same screen -- the rules
list above the checkbox that renders the same rules, the format list beside a
Format select that lists them, a menu's contents printed under the button that
opens it. Everything else that teaches moves behind its circle. One string is
either deleted as a duplicate or disclosed; it is never deleted in one pass
and re-homed in another. A sentence repeated on five rows in one column moves
to the column header's circle rather than to five circles.

Three things are pinned inline by name, because the rest of this document
depends on them:

- A plain-language reading is never placed behind a circle, at any density, on
  any screen width, under any Settings value. It is the mechanism for the W14
  comprehension criterion (7.6) and the first thing the inspector shows.
- The run record is never placed behind a circle. It reports what was done,
  not what a thing means. The right instrument for its length is the tier
  axis, and it collapses to one line with a Details chevron (7.5).
- The reason a control is unavailable is reported text. It is the disabled
  control's own tooltip, which opens on hover, on keyboard focus and on tap,
  names the one action that would enable the control, and is never repeated as
  body text in a panel or a result card.

### 6.8 Icon rule

Write the label first, then apply this test.

- Icon only, when all four hold: the label is one verb from the icon register;
  the control repeats, on peer rows, peer sections, or in a cluster of three
  or more peers that exist now; one undo, or doing it again, restores the
  prior state; and it acts on the object it sits inside, so the target is
  unambiguous from position.
- Icon plus text, when the label is one register verb but the control is the
  action the surface exists for -- the destination action of a panel, card,
  dialog or drawer. Present's Export image, Export data and Copy to clipboard;
  the Import dialog's Import; Table join's Join; Data's Open file.
- Text only, no icon, otherwise: the label is more than one word; it carries a
  count, format or scope; the control carries a Coming tag; or the step is one
  undo cannot take back.

Collapse clause. Three or more siblings sharing one register verb and
differing only in the object collapse into one icon of that verb whose click
opens a menu carrying the full labels. The icon replaces the group, never a
member. This is what turns a stack of copy links on a result card into one
copy control in the card header.

An icon-only control renders neither name, so this section is a bounded
exception to principle 4, bounded by the tooltip: every icon-only control has
a tooltip carrying the plain name, the technical name where 6.3 requires it,
and the key chip where one is bound.

Four things every icon-only control carries:

1. An aria-label equal to the tooltip text with the key chip removed; the
   glyph is aria-hidden; a toggle keeps one name and expresses state with
   aria-pressed.
2. A tooltip: the verb, then the object when the icon does not sit on its
   object, then the key chip; 150 ms delay; never suppressed in Performance
   mode, which governs canvas elements only.
3. A 24 by 24 CSS px hit area with 4 px clear space, growing to 32 by 32 with
   a 16 px glyph below 1280 px for any icon that is the sole path to a
   capability; a delete icon is always last in its cluster with 8 px of
   separation.
4. A non-hover twin: every hover-revealed icon repeats as a full-text item in
   that surface's overflow, context or long-press menu. An icon-only control
   never carries a Coming tag; a verb that has not shipped keeps its text and
   its tag.

Point 1 is a production requirement, not a drawing instruction: the static
design mockups carry a native `title` on every icon-only control, which serves
as both the tooltip and the accessible name there, and the `aria-label`,
`aria-hidden` and `aria-pressed` attributes are added when the control is
built.

One verb, one drawing. The icon register is closed and lives in the mockup
vocabulary document. A glyph in the register is copied verbatim; a verb absent
from it keeps its text label; the register grows by editing the vocabulary,
never by drawing a glyph in one screen. The moment the text goes, the glyph is
the only name the control has, so ten drifted pushpins become ten unrelated
controls; consolidation is a prerequisite, not a tidy-up.

Five homes, and one takes no icons:

| Home | Visibility | Max | Order | Acts on |
|---|---|---|---|---|
| Panel header | always | 3 plus overflow | view toggles, pin, overflow, close | the panel; no saved-thing verb may live here or in its overflow -- it lives on the section that lists the kind (5.3, Saved things) |
| Section header | on section hover or focus | 2 plus overflow | verbs by frequency, then overflow | the section's content |
| Row | on row hover or focus | 3 | edit, visibility, delete | that row |
| Toolbar | always | none | as laid out | the surface |
| Footer or action bar | n/a | 0 | n/a | n/a |

The row order is fixed application-wide so position teaches the verb; a fourth
row verb goes in the row's context menu. The pinned inspector action block and
dialog button rows take no icon-only controls, because that is where the
destination and destructive actions live. Toolbar icons are always visible and
never hover-revealed. Hover-revealed icons are permitted only for second-visit
verbs -- copy, export, recompute, edit, visibility, delete -- and a control
that a traced novice or analyst path enters through keeps its text label. The
"Change" links on Loaded data and Import mapping rows are the named case: they
are a documented reopen path for the Import options dialog (5.3 Data) and are
read within seconds of a load, so they keep their text.

The never list. These keep their text no matter how often they repeat: Run in
every form (Run all node rankings, Run as sweep, Run anyway, Re-run, Run again
with changes) -- a play triangle on a card holding Method, Scope and Advanced
reads as "preview", not as "spend 40 seconds", and principle 6 requires a
deliberate ask; Cancel; every label ending in "anyway"; every destructive verb
(Close dataset, Remove key, Clear history..., Remove result, Reset to
defaults); every selection and filter verb (Encode as style, Select members,
Filter to type...); Try it; Open File, Open from URL, Paste data; Union,
Intersect, Subtract; Test connection.

This section does not apply at all to the Empty state (7.1), the Insights
strip (7.3), the Import options dialog or the command palette. A first-time
user has not learned the register yet; it is taught in the panels on the
second visit, never on the first screen. The inspector action block, Present's
exports and the context menu are exempt by construction: every one of their
labels is a verb plus the object the user is checking before the click, and
the context menu is the non-hover twin that makes row icons reachable on
touch.

### 6.9 Row types and routing

State decides what exists (6.1) and tier decides how visible it is (6.2). This
section decides what the visible thing looks like. Every row in every panel,
inspector, dialog, drawer and pop-out is one of ten shapes, and the twelve
rules below
route any piece of information to exactly one of them. A drafter who cannot
place something has found either a floor item (6.10) or a design error; there
is no eleventh shape. The rules exist because five copy-editing passes cut
sentences and none changed the shape of a row: a label line above a 24 px
input costs 38 px of height for one value, where a field whose label lives
inside it costs 32 px for two.

The grid. One arithmetic identity, solved for the 280 px column of 5.1:

```
16  +  108  +  8  +  108  +  8  +  24  +  8  =  280
pad    field  gut  field   gap  trail  pad
```

The content band runs x = 16 to x = 272, 256 px, and every row spans exactly
it. A control that fills the row and still leaves a trailing slot is 224 px; a
pair is 108 + 8 + 108; a triple of segmented buttons is 72 + 4 + 72 + 4 + 72.
The trailing slot is 24 px at the same x on every row, and a row with nothing
to put there leaves it empty. Right padding is 8 px against the left's 16 px
on purpose: the trailing slot is an icon button whose glyph is optically
inset.

The field is 24 px high, which is the compact control height the app already
uses, and the row pitch is 32 px, which centres a 24 px control and leaves
8 px between consecutive controls. A section is a 1 px divider, a 32 px
header, n content rows at 32 px, then 8 px of bottom padding. Eight collapsed
sections are therefore 264 px and never scroll, and that skyline is the point:
closed sections are a legible inventory of what has not been done yet.

The field atom, left to right: 8 px padding, a 16 px glyph slot, the value,
the unit, 8 px padding. The label of a changeable value is a 14 px stroke
glyph in that slot, or one capital letter at 11 px from the closed set N
(nodes), E (edges), W (weight), D (depth), K (k), so value ink begins exactly
24 px from the field's left edge and the remaining value width is 76 px in a
108 px field and 192 px in a 224 px one. The glyph slot is the scrub handle:
cursor ew-resize, and pointerdown-and-drag changes the value, left down and
right up. That is what earns the right to drop the word, so the glyph never
ships ahead of the scrub; on a touch pointer the glyph opens a three-row
stepper popover instead. Every field carries a title equal to the word the
glyph replaced. Hierarchy is colour, not size: the value and its label are
both 11 px, the value in the primary text colour, the glyph label and the unit
suffix in the dimmed one, so dimmed unambiguously means "not the answer".

The ten row types.

| Type | What it holds | Anatomy |
|---|---|---|
| RT-1 Field row | one or two changeable values -- the workhorse | 24 px control on a 32 px pitch; pair 16/108/8/108/8/24/8, single 16/224/8/24/8. A select is a field row whose 12 px chevron sits inside the box after the value, not in the trailing slot |
| RT-2 Compound row | two or three values that belong to one thing | one 224 px or 108 px box whose sub-fields are divided by a 1 px hairline of panel background, so they read as one control; the leading sub-field's slot holds the swatch, ramp chip or glyph. Never two unrelated values |
| RT-3 Icon group row | a closed set of 2 to 6 mutually exclusive options whose difference can be drawn | a 108 px track (max 3 buttons) or 224 px track (max 6) of 22 px buttons at radius 3; 14 px glyphs, dimmed inactive, primary on the active button |
| RT-4 Ramp row | a colour ramp or a size wedge with its domain ends | 14 px ramp centred in a 24 px box: min, ramp, max, then the scale-curve glyph in the trailing slot, which opens the RT-3 group of three. The transform's curve is visible in the wedge, which a sentence can only name |
| RT-5 Toggle row | a boolean whose concept has no glyph in the icon register | 24 px on a 24 px pitch, the one type that packs tighter; a 16 px checkbox or a 28 by 16 switch, then a one- to three-word label |
| RT-6 Data row | the user's own strings: an id, label, attribute name, filename, list member | 28 px on a 28 px pitch; an optional 16 px type icon, the name at 12 px, a trailing value at 11 px dimmed. The one place a left-hand text label column is correct |
| RT-7 Action row | state on the left, verbs on the right | 24 px on a 32 px pitch; resident state, then right-aligned 24 px actions at a 4 px gap, each carrying its register title; text buttons for the verbs that keep their words |
| RT-8 Section header | the name of a place you navigate to | 32 px preceded by a 1 px divider: chevron, name, info circle, then actions ending at x = 272. The name is primary when the section holds a value and dimmed when it holds none. Every section expands in place: the chevron renders the open form when the section is open and the closed form when it is closed, there is no permanently-closed form, and a chevron is drawn only where it opens onto resident rows (6.11). The two or three locally common rows that 6.11's door test keeps resident render whether or not they deviate, which is the one carve-out from Rule 7a below; everything behind the section's gear, and every resident row that is not locally common, is still governed by 7a. The trailing slot carries a state mark when the section is CLOSED -- a count, the highest severity glyph, an On switch, a progress string, the active member's own name -- and the section's own verbs and its gear when it is OPEN, with the exception of a mark the resident rows do not repeat, which survives the changeover (6.11). A section the data could support but that holds nothing is not a door: it takes the empty form of Rule 7c below, a dimmed name and one 24 px plus, and draws no chevron, because there is nothing for a chevron to open |
| RT-9 Chart row | a distribution, or the summary statistics over one | one pitch (a 32 px sparkline or micro-bar) or two (a 64 px histogram), never another height; the two axis-end values are the only text, and they are always drawn |
| RT-10 Prose block | the reading, a departure line, the run record | auto height across the full 256 px band; the reading at 12 px over 1.5, at most two sentences and 220 characters; the departure line carries a 14 px warning glyph; the run record is one dimmed line with a chevron to Details |

Four sub-rules the types depend on. RT-1's door rule: a control used by a
minority of selections never gets a resident row, it gets a 24 px trailing
glyph that opens a popover -- the Builder and Expression switch, the domain
pair on a Scale field, edge-property overrides, tooltip configuration and the
Advanced parameter block are all doors, each of them on a row that is itself
resident. The rule stops at field scale. A section consulted rather than
operated does not get the same treatment at section scale: it expands like
every other section and puts its rare remainder behind a gear, with 6.11
deciding which controls those are. The extension of this rule to section scale
is withdrawn, because a denominator that is the same for every row of a section
cannot split the section and empties it instead. A control may also have two
HOMES when it applies at two scopes: per-selection or per-graph it is resident,
and per-member of a list the surface already shows it sits behind that member's
own door, repeated there rather than moved there. A duplicate at two scopes is
not a hygiene failure and must not be deduplicated by a later compaction pass:
5.1's One fact, one region forbids the same FACT in two regions, and this
licenses the same CONTROL at two scopes, where the facts are different facts.
Three cases in this product are licensed by it: the scale curve is per-channel
and belongs in the channel's RT-4 trailing glyph, while a graph-level scale
family, if one is ever added, would be resident; a per-layer "Which nodes" rule
stays resident on the layer while a per-rule match count stays in the rule row;
and opacity, where it exists, is resident on the row it modifies and repeated
inside any picker that row opens. RT-3's threshold: 2 to 6 drawable
options become an icon group, more than 6 or a difference that is conceptual
rather than visual stays a select in RT-1, and the hybrid form -- a glyph on
every button and the word on the active button only -- is what keeps a layout
or scale name legible in a single row. RT-5's two hard clauses: never alone (a
lone boolean between field rows becomes the trailing slot of the row it
modifies, or a member of an RT-3 group), and verbs out (Show labels becomes
Labels, Animate transitions becomes Transitions). RT-7's hover split: an
affordance that acts hides until row hover, and anything that reports state is
resident, always, so a hidden layer shows its closed eye without being
hovered; on a touch pointer every hover-revealed glyph is resident and its
title is reachable by long press.

The twelve rules. Apply in order; the first that matches decides. Two drafters
running this list over the same content land on the same row type.

Rule 0, the floor vetoes. If the content is on the floor list in 6.10, render
it as 6.10 specifies. No rule below may shorten, hide, iconify or circle it.
Stop.

Rule 1, the word gate. A word may be printed only if it passes one of four
gates: it names a place you navigate to (RT-8); it is a value or the user's
own data (RT-1, RT-6); it is a concept or boolean with no glyph in the closed
icon register of 6.8, which may not be extended to pass this gate; or it is on
the floor. Every other word is a glyph, a suffix, or deleted.

Rule 2, routing. Ask these in order and stop at the first yes.

| # | Question | Row type |
|---|---|---|
| 1 | Is it the reading, a departure from exact and complete, or the run record? | RT-10 |
| 2 | Is it a section name? | RT-8 |
| 3 | Is it the user's own string -- an id, label, attribute name, value, filename? | RT-6 |
| 4 | Is it a distribution, or a set of summary statistics over one? | RT-9 |
| 5 | Is it a colour, a gradient, or a numeric range with a transform? | RT-4, or RT-2 when it always travels with an opacity |
| 6 | Is it a closed set of 2 to 6 options whose difference can be drawn? | RT-3 |
| 7 | Is it a boolean? | glyph in the register: an RT-3 member or the trailing slot of the row it modifies; no glyph: RT-5, never alone |
| 8 | Is it a verb? | RT-7: an icon when the verb is in the register, hover-revealed if it acts and resident if it reports; a text button when it is not, or when 6.8's never list covers it |
| 9 | Is it two or three values belonging to one thing? | RT-2 |
| 10 | Is it any other changeable value? | RT-1, paired with its natural partner |
| 11 | Is it an explanation? | not a row at all: delete it or circle it (Rule 8, 6.7) |

Rule 3, the label is inside the field. Zero horizontal pixels are spent on a
label column. Every label of a changeable value becomes a 14 px glyph in its
field's 16 px slot and the value begins 24 px from the field's left edge. The
one exception is RT-6, where the user's own string is the label. An 11 px
label on its own line above a 24 px input is a broken row.

Rule 4, glyph or word, decided by two tests. An in-field glyph or an icon
button is allowed only if both hold: the glyph is in the register (6.8), and
the control either scrubs (a field) or is a verb (a button whose title names
it). Fail either test and the word stays. A concept -- betweenness, PageRank,
k-core, modularity, weight-as-strength-versus-cost, a caveat class -- never
becomes a glyph, because an arbitrary symbol is learnable only by someone who
already knows the concept.

Rule 5, the unit is a suffix, never a label. Right-aligned, dimmed, inside the
field. Pixels are implied and never written (2, not 2 px). Spell only the
units the graph data has: links, steps, hops, nodes, %, s, ms, MB. Never a
parenthetical "(degrees)", and never "deg", which collides with degree
centrality.

Rule 6, the mode is what the field contains, not a control above it. A literal
in the field means fixed and draws a hollow slot glyph; an attribute chip
means data-driven and draws a filled one; disagreement across a multi-selection
is the literal word "Mixed" in the value position, at value colour, with no
badge and no asterisk, still editable. A mode word that must stay visible
(Hug, Fill, Auto) is a dimmed right-aligned word inside the same field, beside
the number.

Rule 7, the default does not render. Three clauses. (a) A control sitting at
its default is not drawn; only the deviation is, inline, with a 12 px reset x
in the trailing slot. This clause has one carve-out and it is 6.11's: it does
not reach the two or three locally common rows that 6.11's door test keeps
resident in a section. Those render at their defaults, with the value in the
field and no reset x -- there is nothing to reset -- and they gain the reset x
the moment they deviate. The reason is arithmetic rather than taste: a section
whose every row is deleted by this clause is a chevron that opens onto nothing,
which 6.11 forbids, and it forbids it in exactly the state a first-time reader
arrives in, since a fresh graph is all defaults. Everything behind a gear is
still governed here, and so is every resident row that is not locally common.
(b) An affordance that acts hides until row hover;
anything that reports state is resident. One carve-out, and only one: the plus
that adds to a library section (5.3, Saved things) is resident whether the
section is empty or full, because saving your first style is a first-visit
verb and 6.8 already keeps the visible form of a control a traced novice path
enters through. Every other affordance still hides until hover. (c) A section the data cannot support
does not render at all -- not collapsed, not dimmed, not with a plus: temporal
sections on an untimed graph, bipartite cards on a non-bipartite graph,
directed methods on an undirected graph, Weight and Treat as on an unweighted
one. A section the data could support but that holds nothing is one 32 px row:
dimmed name, one 24 px plus in the trailing slot committing to a sensible
default, no content rows and no empty-state sentence. One carve-out, narrow
and written down: a library row for a saved thing that cannot apply to the
current dataset renders dimmed with its reason in its title, never absent,
because floor item 7 wins over 7c wherever the row carries a name the user
typed. The carve-out reaches nothing but user-named library rows. Sections keep a fixed
order whether or not their members render. The corollary is the point of the
rule: an exact, complete, unfiltered run draws no departure line at all, which
is what makes "Approximate (sample of 200)" loud again.

Rule 8, explanation is deleted or circled, never both and never resident.
Delete it where it restates a control, a value or a list visible on the same
screen (6.7 already licenses this). A trigger is not an explanation: naming
the condition that caused a surface to appear does not restate the controls it
contains, even when the two share a word -- "delimited file" is why this
dialog opened, "CSV, 98% confidence" is what the parser found, and deleting
the first because the second is on screen removes the answer to the user's
first question. Otherwise it goes in the info circle,
which keeps it as the control's accessible description, in the palette index,
and one hover, focus or tap away. Where a list of unfamiliar things must be
browsed, the sentence lives on the picker row at the moment of choosing, not
on the resting card.

Rule 9, repetition rises. A word appearing on three or more rows of one list
moves to the column header or the section header and is deleted from every
row. A question asked once per property rises to the section, or becomes a
per-row glyph under Rule 6. Rule 9 raises a repeated word to a header; it does
not raise a repeated affordance. Where each row's copy of a verb acted on that
row, one copy on the header is a different and weaker control, and the rows
keep their own doors -- as the field's own chevron where the field is the
door, never as a bare text row that happens to be clickable.

Rule 10, the pair rule. Where both the plain and the technical name render is
decided by 6.3, which governs: both on first mention per surface and on every
string that leaves the app, the primary name alone on repeats.

Rule 11, the escape hatch is mandatory. Settings > Appearance > "Show labels
on controls", default off, turns every in-field glyph into a glyph plus its
word (5.3 Settings, 6.5). In that mode RT-1 pair rows become single 224 px
rows and a panel roughly doubles in height; every layout must survive that
rather than break, and an RT-1 pair degrades to two RT-1 singles, never to a
two-line stack. It ships in the same revision as the glyphs, because it is
what makes Rules 1 through 6 defensible to a first-time user rather than
merely terse.

A second hatch ships beside it, for the same reason and under the same rule.
Settings > Appearance > "Keep advanced sections open", default off, renders
every gear pop-out's contents (6.11) as inline rows in that pop-out's own
section instead, in the same order and at the same 32 px pitch. Two
constraints: it affects only pop-outs whose contents are field rows at 280,
because a report or a matrix at 360 or 480 does not fit the 256 px band and has
no honest inline form and stays a door at every setting; and a panel in this
mode may scroll, which is the cost the user accepted by turning it on. That
deliberately breaks 6.9's own promise that eight collapsed sections are 264 px
and never scroll, exactly as the first hatch breaks the 280 px pair-row layout,
and only when the user asks for it. Both breakages are what make the terse
default defensible rather than merely terse.

### 6.10 The floor

Seven items, and seven is the count. Revision 1.7 clarified two of them and
added none; revision 1.8 splits item 5 into an export obligation and a screen
obligation without making it an eighth, and adds one subsection after the list
-- 6.10a, the class of control that stays resident however rarely it is used,
which is a veto on 6.11's door test and not a floor item. This is the veto on 6.9: no rule in the section above may shorten,
hide, iconify, circle or default away anything on this list, at any density,
at any width, under any Settings value. Nor may a door separate a floor item
from the thing it qualifies (6.11): the reading travels with its result, the
departure with the channel it describes, the run record with its run, the cost
estimate with its control, the legend with the canvas. Each traces to a persona
failing a workflow step, not to taste.

1. The reading. Every graph summary and every result opens with its
   plain-language sentence (7.5), on screen, in full, never behind an info
   circle. It is the mechanism assigned to W14's comprehension criterion
   (7.6).
2. Every departure from exact and complete, named: approximate with its
   sample size, partial or timed out, subset drawn, largest component only,
   filter or time window active; and, when a saved thing is applied, what in
   it did not bind -- the layers, rows, columns or ids that found nothing,
   named. Prune the duplicates -- Rule 7's corollary makes the line rare --
   but never the departure itself.
3. The one-line run record: method, the parameters that were not defaults, and
   scope, with the full record behind its Details chevron.
4. What a control will do, before it does it: the scope or match count it acts
   on, the cost estimate above the ask limit, the reason a disabled control is
   disabled, and the full text of Run in every form, Cancel, every label
   ending in "anyway", and every destructive verb (6.8's never list).
5. The legend line for every encoded channel, in two obligations, because the
   justification of this item is the exported image and it was being enforced
   on the screen, where the reader can hover and where the panel beside it
   often prints the same thing.

   Export, absolute. Every exported image, at every scope, carries a legend
   composed from the encoding model: every encoded channel with its channel
   word, attribute, domain endpoints, median or midpoint and the scale in
   words; the twelve largest categories with their counts and the coverage
   footer; every departure line, including the clamp line and "not measured (N
   nodes)"; and one row per state drawn in the exported frame, because a static
   figure has no filter strip, no status bar and no result card to name them.
   No compaction, no user setting and no visibility toggle reduces it, and it
   is composed rather than captured (5.3 Present, 5.8).

   Screen. The canvas legend carries one block per encoded channel: channel,
   attribute, domain endpoints with the median or midpoint, the scale in words
   -- printed even where it is the default, because it is the one line on the
   legend that nothing else on the screen says -- and every departure line.
   RT-4 may reduce a scale to a trailing glyph in a panel; it may not in the
   legend. Category counts, category rows past the canvas cap of five plus
   Other, and the state rows are not floor items, and 5.1 names their homes.
6. Names: the eight rail labels, every capability's plain name, and the entry
   state of a dialog that opens unbidden, which is the dialog's name for that
   state and not an explanation of its contents. Dropping
   the rail labels frees no horizontal pixels, since the rail is frozen at
   48 px, and deletes the map 7.1 uses instead of a tour.
7. The user's own data: ids, labels, attribute names, values and filenames.
   Data cannot be given a glyph, which is why RT-6 keeps its text column.

6.10a. What stays resident though it is rarely used.

A control whose wrong value is invisible until it does damage stays resident
however rarely it is touched, and may not become gear contents at any density.
This is the one class 6.11's door test cannot see: such a control passes the
default clause perfectly and fails nothing the test asks, and the failure only
appears later. The precedent is Figma's, which hid Constraints behind a button
in the Position section in UI3, met the complaint that a quick glance at
Constraints no longer works, and shipped the inline toggle instead. A wrong
constraint is invisible until the frame is resized.

In this product that class is: the export Scope select, since a wrong scope
silently exports the wrong graph -- with one exception, that the canvas export
frame hint carries the report instead, which makes the select legally a door
(5.3 Present); the Weight and Treat as pair in Analyze, since a wrong weight
sense silently inverts every path result; and the import Positions checkbox.
The same Weight and Treat as pair IS legal behind a column's Role chip inside
the Import options dialog, because the chip prints the value as a dimmed suffix
("Weight strength"): the value stays visible and only the editing moves, which
is what makes it not-silent.

Three further classes were proposed as vetoes and are refused, because 6.11's
door test already stops them at its first clause and a rule that restates
another rule drifts away from it: a report of what is currently true has no
default; a scan surface of the user's own strings has no default; and the entry
to a capability is the section header itself, which expands in place and which
the stub obligation already keeps reporting. They are recorded so a later pass sees they were considered.

The floor on the first-load screen is about 49 words. A compaction pass works
in the band above that number; below it, the pass is removing the product.

### 6.11 The pop-out rule

A pop-out is a surface, in the same family as the panel, the inspector, the
dialog, the drawer and the preview below. It is not an eleventh row type: its
rows are the same ten of 6.9, and the closed set stays closed.

The rule in one sentence: a pop-out is for one member of a list, or for a
report you read once; an inline section is for the job the panel is open to
do; a dialog is only for a commit the canvas must wait on.

The governing test, applied before anything below, because it is the one a
drafter reaches for most and the one two drafters must not split differently.
It decides a single control rather than a surface.

Of the readers who open THIS section, is this among the two or three things
they commonly adjust or consult, AND can the row it leaves behind still report
whether THIS instance left the default? Not among them and the report survives:
it goes behind that section's gear. Either clause fails: it stays resident.

The denominator is local, and moving it there is the whole of what revision 1.9
changed in this test. The earlier form asked whether a control sits at a default
that most instances of the product never leave, which is the right question
asked of the wrong population. It was written to decide one control against its
siblings -- layer opacity against font size, a dash style against a stroke
colour -- and applied that way it discriminates, because the siblings share the
denominator. Applied to a whole section it stops discriminating, because every
row of the section shares it too: for any section below the first screen the
global denominator says "most instances never leave the default" of every row
at once, the whole section departs, and what is left is a chevron over nothing.
Nobody opens the Layout section to do nothing. They open it because the
arrangement is wrong, and edge length is rare across the product and common
inside the section that owns it, so it is the section's own population that
decides. "Commonly adjusted" reads as "commonly adjusted or commonly
consulted", because five sections in this product hide readouts rather than
controls -- Schema, All statistics, Categories, the sweep's runs and the
validation report -- and a clause that sees only controls resolves each of them
to "nothing resident, therefore a door", which is the same defect by another
route. Those five resolve on what a reader came to READ.

Every section expands in place. A chevron renders only where it opens onto
resident rows, and no section's content lives entirely behind a door. A gear or
a trailing door is an ADDITION to a section that already draws content; it is
never the section itself, and the test above decides only which controls are
the addition. Three consequences a drafter checks on every section. A section
with no resident rows and no gear contents is not a section: it is either Rule
7c's empty form -- dimmed name, one 24 px plus in the trailing slot, no chevron
-- or, where the data cannot support it, it does not render at all. A gear is
optional, and a section may be entirely resident and carry none; a gear with no
resident section above it is the shape this paragraph exists to forbid. And the
24 px trailing door on a ROW is untouched, because RT-1's door rule operates at
field scale on a row that is itself resident. What is withdrawn is the
extension of that rule to section scale, and with it the sentence in RT-8 that
let a section keep its chevron in the closed form permanently and never open. A
chevron that reveals nothing is a defect.

The second clause is the stub obligation below, stated as half of the test so
that the test and the obligation cannot drift apart. The three questions that
follow decide what SURFACE a group of controls gets once the test has said
which controls belong behind a door; Rule 7a of 6.9 decides, separately,
whether a row renders at all -- except for the two or three locally common rows
this test keeps resident, which render whether or not they deviate, since a
section whose every row is deleted by 7a is a chevron that opens onto nothing.
Everywhere else 7a still wins where a control is both defaulted and
non-deviating, and the gear exists so a reader can reach the control in order to
CREATE the deviation, which 7a alone leaves unreachable.

The line is drawn by a conjunction, and every single-property version of it was
tried and refuted. They are recorded so they are not re-derived. Frequency
alone: layer opacity is rarely touched and stays resident, while font size is
touched constantly and is also resident. Room alone: a one-checkbox option sits
inside a popover while a 224 px row stays out. Per-item-ness alone: export
configurations are per-item and their scale and suffix stay resident. What
survives every case is the conjunction. Everything behind a gear in a mature
peer tool passes both clauses -- constraints default to top and left,
decoration to none, letter case to as-typed, dash to solid, and the row each
leaves behind still reports the deviation, because a dashed stroke looks dashed
on the stroke swatch and an uppercase run looks uppercase in the layer.
Everything kept resident fails one or both: the fill colour, the font size, the
gap and the export scale have no default worth speaking of, and the panel row
IS the report.

The three refutations survive the move to a local denominator, because what
they refuted was the conjunction and only the first clause's population has
moved. Layer opacity is still resident because clause (b) fails and no row
behind it reports the value, not because of any frequency, global or local;
room was never a clause at all; and an export configuration's scale and suffix
are locally common to the configuration that owns them, so the local
denominator agrees with the global one exactly where the global one was right.
A drafter who finds the two denominators disagreeing is looking at a whole
section, which is the case the global one could not see.

One class vetoes the test whatever it says, and it is 6.10a: a control whose
wrong value is invisible until it does damage stays resident however rarely it
is used.

Applied then as four questions. The first yes decides, and question 4 fires
only where question 3 has.

1. Must the graph stop being touchable until this is answered? Yes: tier 3b
   dialog. That is true only where a commit changes the data before anything
   else can proceed -- Import options, Table join, Map identifiers, node
   merging, the computed attribute formula, Run a recipe. If no, it is never a
   dialog.
2. Is it about one member of a list this surface already shows, or is it a
   report read once and not returned to? Yes: tier 3a pop-out, anchored to
   that member's row and titled with that member's own name.
3. Otherwise it is an inline section at the tier 6.2 assigns.
4. Where question 3 sends content inline, one further question decides which
   of that content, if any, goes behind a gear, because the three questions
   above never decided it and four mechanisms were running for one job. It is
   asked about a GEAR's contents now and never about a whole section, because a
   whole section no longer has the option of leaving. Does a door buy width
   beyond the 256 px band, survival across a selection change, or leaving the
   rows below operable while it is open? None of the three: the content stays
   in the section, whose RT-8 header carries in its trailing slot, while it is
   closed, the one fact a door stub would have carried. A closed section and a
   door cost the same single row, so a door that buys none of the three adds a
   click for nothing. Worked in both directions: Schema's edges-by-type-pair
   matrix buys a 480 gear, because a two-dimensional table cannot be drawn
   honestly at 256, while the type rows and counts that Schema is opened FOR
   stay in the section; Counts is a section, because it is consulted rather
   than operated; the Selection statistics third column buys a 360 gear,
   because an A / B / Graph / Delta table does not fit 256, while the
   two-column Selection and Graph rows stay resident; Metric histograms is a
   section, because a reader comparing five distributions cannot open five
   doors. This question is what keeps the Recipes library and
   the Styles library collapsed sections rather than doors, against two
   independent proposals that they become doors because they grow without
   bound, and it retires the two informal mechanisms the boards had grown: a
   plain "More..." text row hiding two sections, and a resident stack of verbs
   where a menu belongs.

6.2's frequency test overrides in both directions and is unchanged. Where it
fires, say so out loud rather than leaving a later reader to rediscover it: the
AI Console is the case, where question 3 would send it inline and 6.2 moves it
(5.3 AI).

Four obligations make a pop-out legal.

- The stub. What leaves is the RARE REMAINDER, never the section. The section
  keeps its two or three locally common rows and the remainder goes behind a
  gear in that section's own header, so what the reader is left with is not a
  stub standing in for a section but the section itself with one glyph added.
  Whatever leaves still leaves something resident that names it and reports its
  state: the count, the highest severity glyph, the On switch, the progress
  string, the active member's own name. RT-8's own rule -- the name is primary
  when the section holds a value and dimmed when it holds none -- is how a
  header marks that something hidden is not at its default. A gear over lazily
  computed content reports the computation, so 6.2's guarantee that a row still
  computing reads "Computing..." survives behind it. The stub is drawable and
  must be drawn: the gear or door glyph renders in the dimmed ink when
  everything behind it is at its default and in the primary ink when anything
  behind it is not, at every density, and no board may omit it, because it is
  the only signal a reader has that a closed surface hides a non-default. The
  two inks now mark a gear on an expanded section rather than a section that
  has become a door, and that is the only thing about this obligation revision
  1.9 changed. Where a hidden option creates a departure that 6.10 item 2
  requires be named, the departure line renders resident under the section that
  owns the gear, not inside it.
- The keyboard. Hover never opens a pop-out (a preview is not a pop-out: see
  the sixth surface below); hover only reveals the opener, which RT-7's hover
  split already permits and already makes resident on a touch pointer. Every
  pop-out has the three routes 6.4 requires: a focusable opener in the panel's
  tab order whether or not it is hovered, opening on Enter or Space; a command
  palette row indexed by both names; and its home panel row. Escape closes it
  and returns focus to the opener. F6 cycles an open pop-out immediately after
  the region that owns it, and Up and Down on a driving list re-target an open
  pop-out rather than closing it.
- The nesting limit. A pop-out may open a menu, an info circle, a colour or
  gradient picker, or a 3b dialog which replaces and closes it. A pop-out may
  never open a second pop-out.
- The depth. Exactly one click from the row that owns the property. A door may
  not sit behind another door, and no pop-out may be reached only through a
  second pop-out -- the nesting limit already forbids a pop-out opening a
  pop-out, and this states the reader-facing consequence. Where the owning row
  does not exist yet, the create click is charged to 6.1's state axis and not
  to this obligation: a panel is not in breach because an unadded export
  configuration costs a plus first. Audit every door by walking from the row
  that owns the property, with the owning thing present. Forbidden by name from
  this revision forward: an Advanced parameter block behind a History door, the
  export options behind a Reports door, and gradient handle editing as its own
  pop-out opened from the ramp pop-out -- which becomes a section of that
  pop-out instead (5.3 Style).

The trailing slot of a section header, by state. A closed section SUMMARISES
and an open section OPERATES. Closed, the slot carries the one fact that says
what is inside without opening it, from the stub vocabulary above: a count, the
highest severity glyph, an On switch, a progress string, the active member's
own name. Open, it carries the section's verbs and its gear, on the 28 px pitch
RT-8 already specifies, ending at x = 272. The changeover is Rule 8 of 6.9
doing its ordinary work, and it is where the pixels are, because it governs
every section on every board that draws one. A mark that restates something now
visible on the same screen is an explanation of the rows beneath it, so it is
deleted the moment those rows are drawn: Schema's "3 node types, 7 edge types"
when the type rows render, Categories' "41 rows" when the footer reads "6 of 41
rows", Neighborhood expansion's "2 steps, 3 types" when the Hops and
type-filter fields render. A mark that says something the rows do not stays
when the section is open: All statistics' "Computing 3 of 7" for as long as
anything is still running, because each resident row reports only itself; Step
through time's On switch, because it is the section's own master control and
not a precis of the rows below it; the Provider section's Connected dot, for
the same reason, while its model name goes because the resident model row
prints it. The rule generalises in one sentence: the mark survives if it is the
section's own control or the section's own state, and dies if it is a precis of
rows now on screen.

Five doors in the current set survive the always-expands rule -- each sits on a
section or a control that already has resident content -- and fail the stub
obligation instead, printing nothing about what they hide. They are named
together because the fix is the same edit, and because a door that reports
nothing is the failure the two inks were made drawable to prevent. Import
settings on the Open file header is deleted outright: it reports nothing, it
duplicates the Loaded data door, and one general import door already exists as
the gear on the Loaded data header. The Data table drawer's Columns chip owes a
count, "9 of 12". The Parsing gear on a large import keeps its five values in a
title and owes the separator and the header-row state as its mark, and a
keyboard route it does not have today. Settings' Advanced and Encryption
password rows draw no state at all and owe, respectively, whether Base URL, max
tokens or temperature deviate, and set or not set. And the Expand-neighbors
caret prints a count and never the depth and type filter its Explore twin
carries, so a reader cannot see what the button will do before pressing it,
which is floor item 4 and not a matter of polish.

Anatomy. Widths are a ladder of three, taken from the 5.1 grid and never
invented per case. 280 reuses the panel identity 16 + 108 + 8 + 108 + 8 + 24 +
8 and is for field rows. 360 gives a 336 px content band and is for a
sentence-plus-user-ids report or a three- or four-column numeric table. 480 is
the ceiling and is only for a two-dimensional matrix or a plot, because at
1440 the canvas band is 832 px and a 480 pop-out still leaves 344 px of graph.
Anything wider is a drawer or the Data table, not a pop-out. Height is capped
at the owning region's height minus 32, with the pop-out's own scroll region;
a pop-out never scrolls the panel behind it.

Anchor. A transient surface never chooses its own position; it inherits one
from its opener on both axes. One axis carries the GAP: 8 px clear of the
opener on the side the surface opens from, or 12 px when the surface floats in
the canvas overlay layer. The other axis carries a SHARED EDGE LINE with the
opener's anchor box: top edge to top edge for a surface that opens sideways,
near side edge to near side edge for one that opens up or down. When the
surface will not fit, the gap to the opener is the LAST thing surrendered and
the shared edge line is the FIRST. Buy clearance by sliding along the
shared-edge axis; then by flipping the edge line to its opposite pair, so that
top-to-top becomes bottom-to-bottom; then by dropping a rung of the width
ladder; and only then by opening centred over the canvas with "from <opener
name>" in the header. A surface whose edge line ends more than 32 px -- one
header height -- from its opener's anchor box after all of that is not
anchored, and must take the centred form and say so. The invariant in one
sentence: the surface preserves whichever relationship to its opener carries
the meaning, and spends the other one.

This subsumes and replaces the earlier rule that pop-outs flip vertically and
never horizontally. For a vertical-strip opener -- an activity panel, the
inspector -- the gap axis is horizontal, so horizontal is preserved and
vertical is spent, which is what the earlier rule said and what the Schema
pop-out already does. For a horizontal-overlay opener -- the time bar, the
canvas toolbar -- the gap axis is vertical, so the 12 px gap above the bar is
preserved and HORIZONTAL is spent. On a horizontal bar the vertical gap is what
says "this bar's" and the horizontal position says nothing, which is why rising
to clear the legend is the one move that destroys the tether.

The anchor box is the opener's smallest focusable ancestor that draws as one
control: for a split button that is the whole button and not the caret half. A
pop-out is never taller than half its owning region, so the flip is always
available; that cap sits alongside the cap of the region height minus 32, and
the smaller of the two binds. A surface narrower than 280 px carries an 8 px
caret at the anchored edge instead of an edge line, because nothing aligns
meaningfully to a 14 px control.

Seven families, so that no family is placed by taste.

| Family | Lane | Gap axis and size | Shared edge line |
|---|---|---|---|
| Top bar | opens down, top = 40, the top bar's own bottom edge | vertical, 8 | opener anchor box left edge |
| Activity rail | opens right, left = 56 | horizontal, 8 | button bottom to menu bottom |
| Activity panel | opens right, left = 336 | horizontal, 8 | row top to pop-out top |
| Inspector | opens left, right = 1152 | horizontal, 8 | row top to pop-out top |
| Canvas overlay | opens away from its overlay | 12 | the overlay's near end aligned to the opener |
| Dock (the Data table drawer, the report editor) | opens up inside the dock | vertical, 8 | column or row edge; caret required |
| Dialog | opens beside its opener inside the dialog rect | 8 | row top to pop-out top |

Two exceptions take no lane: a context menu takes the pointer, and a preview
takes the centred home this section already gives it.

The two gap constants, and which applies. 8 px is the gap between a pop-out and
the shell region boundary it sits beside: left edge 336 beside the panel, right
edge 1152 beside the inspector. 12 px is the inset used by anything that floats
in the canvas overlay layer, matching the legend, the minimap, the toolbar and
the time bar, all of which sit 12 px in from the canvas rect. A pop-out that
sits in the overlay layer -- canvas-anchored, or a panel or inspector pop-out
that has slid over the canvas -- takes 12. That is what stops a stacked pop-out
sitting 4 px out of line with the legend beneath it.

The caret. A pop-out carries a 6 px caret on its leading edge -- the left edge
for an inspector pop-out, the right edge for an activity-panel one --
positioned at the vertical centre of its opener's row and clamped 12 px inside
the pop-out's own corners. A surface narrower than 280 px carries the 8 px
caret described above instead of an edge line. The caret ships with the pop-out
shell, not per case. Without it, a pop-out in a lane that also serves four
other section headers has nothing but a lit opener to say which one raised it,
and that lit opener may be 362 px away.

Scroll. A pop-out follows its opener while the opener is in the region. When
the opener scrolls out, the pop-out docks to the edge it left through, keeps
the opener lit, drops its caret, and grows a 20 px return strip in its header
naming the opener with a chevron that scrolls it back. When the opener's
section collapses, or the region changes activity, the pop-out closes. This
replaces the earlier rule that a pop-out stays open at its last position with
the opener still lit on the ground that the title is the anchor and not the
pixel: a pop-out frozen at a pixel while its row is gone is a detached surface,
and that sentence rationalised the failure rather than ruling on it.

The legend clearance clause survives and is paid differently. Between a pop-out
and the legend the pop-out is what moves, because the pop-out is dismissible
and the legend is not, and floor item 5 with this section's own second clause
forbids separating the legend from the canvas it keys. But it buys that
clearance by SLIDING along its shared-edge axis, not by rising, and it opens
centred over the canvas only when no position at any rung of the width ladder
clears the legend, which after 6.10 item 5's screen obligation is rare. A
canvas pop-out may cover the toolbar and the minimap, which are dismissible
chrome; only the legend is floor item 5.

A pop-out reachable from more than one opener is anchored to the opener that
was used, and its lane follows that opener's region -- the time slider settings
pop-out has two openers, a panel gear and a bar gear, and is anchored to
neither in general and to the used one in particular. A palette route, which
has no on-screen opener, opens the pop-out in its home panel's lane and lights
that row. 6.5's remembered pinned position is stored per opener, not per
pop-out type.

Five anchors in the current set are already exactly right, and are cited by
pixel so that a later pass has something to measure against and does not undo
them: Schema at [672,473 480x295] from an inspector row at [1177,473 255x32],
top 473 on 473 with its right edge on 1152; the group profile at [792,226
360x479] from a row at [1177,226]; Categories at [792,300 360x260] from a row
at [1177,300]; the filter rule editor at [336,277 360x217] from a rule row at
[64,277] in the panel lane at 336; and the Analyze method preview at [604,376
280x163], correctly centred on the canvas band's centre and correctly
unanchored, because a preview takes no lane.

None of this applies below 1280 px and none of it is approximated there: a
pop-out is a second sheet over its panel (5.2), a sheet has no gap axis and no
shared edge line, and the back chevron and the header title carry the whole
relationship to an opener that is not on screen behind it.

Header. 32 px: the member's own name, the technical name dimmed beside it
(6.3), the register's close X titled "Close (Esc)", and a pin toggle only where
one is earned. A pinned pop-out ignores click-outside, survives a selection
change, and its dragged position is remembered per opener under 6.5.

The pin is narrow on purpose and its set is closed at four: the colour and
gradient picker, Selection statistics with a pin active, the group profile, and
the AI console. A pin toggle renders only on a pop-out whose content is
comparative across selections; every other pop-out loses its pin glyph, which
also removes it from the 32 px header of pop-outs that never needed one. Pin
exists to let a reader hold one report still while changing what it describes,
and a pop-out whose content is the parameters of the row that opened it has
nothing to hold still: pinning it produces a stale panel that lies. This
withdraws the earlier generalisation of pin from the Style popouts to every
pop-out and keeps the originals. A pinned pop-out that survives a selection
change is a second inspector, which is the panel this section exists to
split.

Multiplicity. At most one per region, and the regions are five: the activity
panel, the inspector, the canvas overlay, a dialog for as long as it is open,
and a dock. Opening a second in the same region closes the first, which is
correct where both describe the same object and is recorded here because it is
otherwise discovered by frustration. Two clauses make the limit non-arbitrary
rather than merely restrictive. The region is the OPENER's region, not the
surface's screen position: a panel pop-out that has slid over the canvas still
counts against the panel, and without that clause a time-bar pop-out sliding
along its bar would silently consume the canvas-overlay slot. And a dock is a
region as a dialog is: a pop-out opened from the Data table drawer or from the
report editor drawer counts against that dock, which is what lets the drawer's
Columns pop-over and a time slider settings pop-out live independently without
loosening the rule anywhere else.

A 3b dialog is the fourth region and may open one pop-out; that pop-out may not
open a second, it closes with the dialog, and Escape closes the pop-out before
the dialog. An earlier reading that a dialog may not host a pop-out at all was
a reading of this section's silence rather than of its text, and it blocked
every anchored pop-over in the largest surface in the Data track; the actual
constraint is the nesting limit above plus a lane table that had not been
written for dialogs. Validation issues stay inline inside Import options
because errors there gate the Import button and because the issue list is a
scan surface of floor-7 ids -- not because a dialog cannot host a pop-out.

No artboard may show two transients of different classes open at once. A dialog
replaces and closes any open menu or pop-out in the same region rather than
dimming it behind its scrim, which the Escape ladder already implies.

Below 1280 px and on iPad a pop-out is a second sheet over its panel at full
panel width with a back chevron, honouring 5.2's one-overlay-at-a-time rule.

The preview, the sixth surface. Everything above governs a pop-out; a preview is
not one, and it is written down here because it was drawn on an artboard first
and would otherwise read as a pop-out that broke four of the rules above. A
preview is a picture of what a choice will do, shown while the reader is
choosing and gone the moment they stop: two thumbnails of the same graph with
the node each method picks drawn in the accent, on the Analyze picker's method
rows, and the same shape on the Style attribute list's scale and ramp rows and
on the palette's method rows. It exists because a sentence cannot separate two
similar methods -- Bridges from Most connected, a log ramp from a linear one --
and a picture does it in one read. Six clauses, and a surface that misses any of
them is a pop-out and is governed as one.

- It holds no controls: no pin, no close X, no header verb, no link. A control
  in a preview makes it a pop-out that opened on hover, which is the thing this
  section forbids.
- It never takes focus. Focus stays on the row that opened it and the preview is
  never in the tab order, so it needs none of the three routes 6.4 requires of a
  pop-out: it is never a destination, only a picture of one.
- It opens on hover, or on focus dwell when the row is reached by keyboard, and
  it closes when the pointer or the focus leaves the row, or on Escape. No click
  opens it and no gesture keeps it. On a touch pointer, where hover does not
  exist, a preview does not open at all and the row's own sentence carries the
  explanation alone -- which is why the sentence may never move into it.
- One width from the same ladder, fixed per kind of preview and never chosen per
  case: 280 for a pair of thumbnails, 360 for a wider strip. A preview never
  reaches 480.
- It is not anchored. A pop-out is anchored to its opener's row and sits in its
  region's lane -- x = 336 for the activity panel, right edge 8 px clear of the
  inspector. A preview has one fixed home per region, centred over the canvas,
  and takes neither lane, because two surfaces arriving in the same place teach
  a reader that a hovered thing can be clicked, pinned and focused, and one of
  the two cannot. The one position a pop-out can share with it is the centred
  fallback above; where that fallback is in play, the preview does not open. A
  fixed home is also what keeps a preview from becoming a slot that follows the
  pointer, which no peer tool does.
- It carries the name of the thing it previews, plain then technical (6.3), as
  a caption and not a header, because it does not sit beside the row that names
  it. And it carries no floor item alone: the reading, the departure line, the
  match count and the cost estimate stay on the row whether or not the preview
  is open (6.10).

The floor is not suspended by a door. Two clauses decide every case. A door is
not a deletion; a circle is: 6.10 forbids putting a reading behind an info
circle and explicitly licenses putting the full run record behind a Details
chevron, so disclosure by tier is legal and disclosure by explanation is not.
And a floor item may not be separated from the thing it qualifies: the reading
travels with its result, the departure with the channel it describes, the run
record with its run, the cost estimate with its control, the match count with
the rule row that is the control, the legend with the canvas.

A cost estimate, a cap warning or a destructive confirm is a governed surface
too: a pop-out with two verbs, not a floating card. It takes its region's lane
and its opener row's shared edge line, its width comes from the same ladder --
280 for a sentence and two buttons -- and Escape cancels and returns focus to
the opener. It carries no close X, because a dismissible warning about spending
forty seconds is not a warning. A cost GATE, as distinct from a confirm, is not
a pop-out at all: it is inline on the control that spends the cost, because
floor item 4 binds an estimate to that control.

One clause joins the artboard review pass: every pop-out's shared edge line is
within 8 px of its opener's anchor box unless a named obstruction is recorded
in that board's own comment.

Worked examples, so a later pass does not re-derive them one at a time. The
verdicts belong to classes, and the classes are not interchangeable, so each
one is said here rather than inferred from the table. A GEAR ON AN EXPANDED
SECTION is a section that draws its two or three locally common rows and puts
the rare remainder behind a gear in its own header; it is what every verdict
that used to read "this section becomes a door" now says, and the resident rows
are named in each case so the claim is checkable rather than asserted. A
POP-OUT is one member of a list, a report read once and not returned to, or a
door at field scale on a row that is itself resident: none of the three is a
section, and the always-expands rule does not reach them. A MENU, a DIALOG, a
PREVIEW and a DRAWER are the other surfaces this section governs, decided by
questions 1 to 3. A PICKER is none of the above and is also untouched -- the
"+ Analysis" catalogue, the Settings nav list, the attribute and encoding
pickers -- because a nav row carries no chevron, opens a full pane rather than
a transient, and is one of several mutually exclusive destinations rather than
a disclosure of its own row's content. And INLINE, REFUSED is a group of
controls that gets no second surface at all. Where a gear buys width beyond the
256 px band, the width belongs to the gear's CONTENTS; the section above it
stays in the band.

| Candidate | Verdict | Why |
|---|---|---|
| Time slider settings | a gear on an expanded Step through time section, 280 | Window 30 days with Step 7 days as one pair, and the Cumulative / Sliding track, are the three things a reader opens this section to change, so they stay resident at their defaults; the time attribute (fixed at import on most graphs), Speed, "Recompute results on each step" and "Compare with another window" go behind the gear. The scrubbed controls stay on the bar, and the bar's own gear opens the same gear contents, so there is still one destination and one set of hidden controls |
| One filter rule | pop-out, 360, from the rule row | The builder is the job the panel is open to do; the rule is one member. The per-rule match count stays in the rule row's trailing slot |
| Filter expression | pop-out, 360, from the section header | The Builder and Expression door rises to the section once the rule row it sat on is gone, and it opens from a section that draws its own rule rows, so it is a door on resident content and not the section itself |
| The Filter builder at zero rules | no chevron; refused as a door and refused as invented rows | With rules it draws them and takes the expression door above; with none there is nothing to open, so it takes Rule 7c's empty form -- dimmed name, one plus, no chevron. The rule forbids a chevron over nothing; it does not require rows to be invented so that one can be drawn, and "Match all" at zero rules and "20 of 20 nodes would match" are exactly the null statements 6.2 forbids |
| Validation report | a gear on an expanded section, 360 for the detail | The issue rows themselves are what a reader came to read -- severity glyph, count, name and the primary verb, one line each -- with the green "Fixed by step 2" line beside them; the per-card consequence sentences, the example ids and Show more, the Info (3) group, the Ignore list and "Re-ran after step 2" go behind the gear, which keeps 360 where the example ids need it. Its Show rows opens the bottom drawer, and a dialog would have to close to let that happen. The resident form must come in near four rows, not near the 282 px the pre-door section measured, which is why the consequence sentences leave with the gear |
| One group's profile | pop-out, 360, from the clicked table row | Fixed to one group inline; anchored to a row it becomes a detail view over every group |
| Advanced parameters | a gear on a card that draws its commonly adjusted parameter, 280 | More than four schema rows (6.2), and the gear draws primary whenever a hidden option deviates; but the one parameter a reader of that method actually turns -- Resolution on a community method, Damping on PageRank -- is promoted to a resident row on the card, so the gear is an addition to content rather than the card's only route in |
| The layout Parameters block | a gear on an expanded section, 280 | Edge length 30, Pull to centre -1.2 and the Edge weight attribute are the three dials a reader opens the Layout section for, and they render at their defaults under Rule 7a's carve-out; Start from current arrangement, Stiffness (spring coefficient), Speed vs accuracy (theta), Damping (drag coefficient), Time step and Random seed are the six engine internals the gear was built for. A couple of common parameters and an advanced gear for the rest, which is the shape the whole rule was written from |
| Animation | a gear on an expanded section, 280 | Transitions 300 ms and Reduce motion are two RT-5 toggles packed together, resident at their defaults, and Reduce motion argues for residence on accessibility grounds independently of this test; Easing and any per-channel transition overrides go behind the gear. Drawn as a bare gear it is a header that is neither a section nor a door, which is the purest form of the defect this rule removes |
| Schema | a gear on an expanded section, 480 for the matrix | The node-type rows and the edge-type rows with their counts, capped at five with an "N more" row, are what a reader opens Schema to read, and Filter to type / Select all of type is already an RT-7 verb row beneath them; per-type completeness and the edges-by-type-pair matrix go behind the gear, and the matrix keeps the 480 because a two-dimensional table cannot be drawn honestly in a 256 px band. Export schema JSON stays in the trailing slot |
| Run record Details | pop-out, 360, from the Details chevron | Floor item 3 names the chevron itself |
| All statistics | a gear on an expanded section, 360 | Density 0.031, the diameter 5 and the average path length 2.99 are the three a reader came for, each carrying its own "Computing..." state on its own row, which is what retires the stub's "Computing 3 of 7" contortion; graph type and the multigraph note, the degree distribution, the two unshipped rows, Recompute, "Recompute on every filter change", Copy values and Export CSV go behind the gear. The progress string stays in the header even when the section is open, because each resident row reports only itself, and 6.2's guarantee survives either way |
| Selection statistics, third column | a gear on an expanded section, 360 when a pin is active | Nodes 7 against 200, Edges 4 against 612 and Average links per node 9.4 against 6.1 fit the 256 px band -- the Data table drawer draws four such rows and the Explore panel seven, in the band this pop-out claimed was too narrow for them -- so the section is resident in both regions that draw it; only the A / B / Graph / Delta table, the "inside the selection" split, the per-attribute means and Export CSV need the 360 |
| Categories | a gear on an expanded section, and the full table in the Data table drawer | The top three categories as two-column rows, name and adjusted p with the source demoted to the row title, plus the "6 of 41 rows" footer that opens the full table; which adjusted-p column, which members column, sort by members, the Jaccard >= 0.5 redundancy rule, the source filter and Export categories go behind the gear. Most connected already draws five ranked rows and a distribution chart in the same band on about twenty boards |
| The sweep's runs | a gear on an expanded section, 480 for the agreement block | The caption row and the three run rows with their resolution and group count, including the mark that says which run the canvas is reading; the "Agreement between runs (NMI)" block, the sparkline, Compare and Export CSV go behind the gear, and the NMI block keeps its 480 because a pairwise comparison of three runs is a matrix. The panel card and the inspector take the same resident form: that is A5's one control at two scopes, and the third rendering, which One fact one region refused, is the agreement block, now gear contents in one place |
| Neighborhood expansion | a gear on an expanded section, 280 | The two facts the stub already printed become the two fields -- Hops reading "2 steps" and a type filter reading "3 types" -- which is floor item 4 drawn instead of summarised, since it is what a reader must know before pressing expand; direction, the max-nodes cap and the per-type checkbox list go behind the gear. Drawing them retires the 11 px section name two boards had to invent to fit a name and a stub into 255 px |
| Provider | a gear on an expanded section, 280 | The model field and the Voice input switch are what a reader opens Provider to touch, and Voice input is floor item 6; the provider select, the API key and the Base URL, max tokens and temperature trio go behind the gear, into the one destination Settings > AI already gives them (Rule 9). The Connected dot stays in the trailing slot when the section is open because it is the section's own state; the model name goes, because the resident row prints it |
| Console | resident and expanded, with a gear for its preferences | It is a working surface and not a settings set: the one-line input with its completion hint and Run script, and the last two transcript lines, all inside the 256 px band that the widest console line measures 219 px against. Clear transcript, copy transcript, transcript length and the completion-hint toggle go behind the gear. The pin stays, Shift+backtick still opens and focuses it, and 6.2's frequency override on the AI Console is unchanged |
| Export video | an expanded section with no gear at all | Duration and Camera as one pair, Video format, and the estimate-plus-Record row, which floor item 4 keeps resident twice over -- the estimate and Record's full text. If the video twin of the Image quality group never ships, this section carries no gear, which the rule permits: a gear is an addition, not an obligation |
| Values, the categorical table | a gear on an expanded section, 280 | The value rows themselves -- swatch, value name, count -- capped at five with an "N more" row, which is the same cap the canvas legend takes; palette family and Reverse, value ordering, the "Other" roll-up threshold and Reset per-value overrides go behind the gear. The count in the header is dimmed while every value is at its default and primary once any is overridden |
| The attribute profile | inline, refused | Floor 7. Nine rows of the user's own attribute names and top values is a scan surface, and a reader comparing five attributes cannot open five doors |
| The notes list | inline, refused | Floor 7 and the same scan argument. Size alone is never a trigger. Its header filter chips and its row editor do pop out |
| Selection-set verbs | a menu, refused | A pop-out is for parameters and reports; a menu is for verbs |
| Import policies | inline, and two resident rows | A control whose home is a dialog may not acquire a second home as a pop-out, and the fix is still Rule 3's noun-and-value field: "Repeats: Combine + sum" and "Self-loops: Keep" render at their defaults, and the rarer merge detail -- which attribute wins on a combine, the name of the repeat-count column -- goes behind a gear, or the chevron is deleted rather than left decorative if neither ships. Where the file has no repeats and no self-loops the rows do not render and neither does the section, which is Rule 7c and a different clause from the one the carve-out amends |
| Cleaning steps, History, the Insights strip | inline, refused | Scan lists and the novice route. A reader comparing five distributions or scanning fourteen of their own strings cannot open five doors |
| The canvas legend | inline, refused | Floor item 5, whose justification is the exported image. A pop-out is dismissible and a legend is not; a panel is not exported and a legend is; and the panel that would hold it, the Style layer inspector, already exists and only fills when a layer is selected in Style. The size complaint is answered by the two obligations of 6.10 item 5, not by a new surface |
| The legend's state-row block | delete, not move | App chrome, not an encoded channel. Every state is already named by the region that owns it (5.1), and the exported legend carries them because a static figure has no such region |
| The Data table column menu, the History row menu, the Role and Type chip menus, the Views menu | menus | One choice from a closed list is a menu |
| Two methods drawn side by side while choosing | preview, 280, unanchored | A picture separates Bridges from Most connected where a sentence cannot; it holds no controls and takes no focus, so it is not a pop-out |
| Save as style | pop-out, 280, from the Styles header bookmark button | It names one member of a list and commits nothing the canvas must wait on, so it is not a dialog and needs no scrim |
| The numeric ramp of an encodable row | pop-out, 280, from the RT-4 trailing glyph | A trailing glyph on a row that is itself resident, which the always-expands rule does not reach: the histogram is the one control in the section that cannot be drawn at 32 px. Its categorical twin, the "Values (N)" table, was hiding a list rather than a histogram and becomes an expanded section instead (above). Gradient handles are a section of this pop-out, never a second one |
| A column's role parameters | pop-out, 280, from the Role chip inside the Import options dialog | Per-item parameters of one column; the chip prints the chosen value as a dimmed suffix, which is what keeps them clear of 6.10a |
| The Data table drawer's column list | pop-out, 280, from the Columns chip | Show, hide and reorder over 10 to 40 columns is not a menu, and drag-reorder inside a menu is not a menu at all |
| Rebind a shortcut | pop-out, 280, from the key chip | It buys the third thing a door can buy: the roughly 60 rows below stay operable instead of reflowing under a conflict warning |
| Layout size ratings | pop-out, 360, from a gear on its row | Nine engine rows of release constants: more than four schema rows (6.2), and 360 is the rung for a three- or four-column table |
| The report editor | a non-modal bottom drawer, refused as both | Not on question 1's closed list, so never a dialog; and 2,000 characters of editable description do not fit the 480 ceiling, so never a pop-out |
| The ? shortcuts reference | a non-modal overlay, refused as both | 740 px is over the ceiling, question 1's list is closed, and you read a binding in order to press it, which a frozen canvas forbids |
| The "+ Analysis" catalogue | the one panel-scale drill-down, refused | Not one member and not a report read once; and every rung of the width ladder collides with the preview's fixed centred home, measured (preview x 604 to 884; a 360 pop-out at 336 runs to 696, a 280 one to 616) |
| The Recipes library, the Styles library | collapsed sections, refused | Both fail question 4 on all three counts. A closed section and a door cost the same row; the RT-8 trailing slot carries the recipe count or the active style's own name |
| A cost estimate, a cap warning, a destructive confirm | pop-out, 280, two verbs, no close X | It is a governed surface, not a floating card. A cost gate, which is not a confirm, stays inline on the control that spends the cost |

## 7. Novice path

### 7.1 Welcome (Empty state)

Centered in the canvas area, maximum width 600 px:

1. Drop zone with an Open File button, copy "Drop a graph file (or a nodes
   file and an edges file) here". Accepted formats listed under it ("JSON,
   CSV or TSV, GraphML, GEXF, GML, DOT, Pajek, SIF, CX2"), and a one-line
   link "or paste data / open from URL".
2. Sample datasets as a short list. Each shows a name, size, and one-line
   description of what is interesting in it, for example "Cat social
   network. 20 nodes. Small enough to see every relationship. Try finding
   the groups." The closing imperative is a link, not decoration: clicking
   the row loads the sample and stops; clicking the hint loads it and then
   runs the manifest's "suggested first card" exactly as an Insights card
   click would (7.3 item 2) -- size-aware defaults, the home panel opened
   with the control highlighted for two seconds, the primary encoding
   applied, the reading written into the inspector, one undoable history
   entry, that card retired. Cold start to a coloured graph is then one
   interaction, not two, without a wizard, which principle 1 forbids. A
   sample with no suggested card renders its blurb as plain text. Above the
   large-graph threshold the suggested card must be one of the
   above-threshold set (Connected parts, not Groups). Each sample row carries small tags: Directed, Timed, Types,
   Weighted, and a one-line source credit link. The list includes Karate
   Club, one timed dataset (the synthetic fraud ring: Directed, Timed,
   Weighted), one with categorical node types, the biology sample (5.3
   Data), and one large sample with a Large badge, size in MB, "Opens in
   Performance mode, about 20 s" and a size-appropriate hint. The same size
   string ("20 nodes, 29 edges") appears in the panel and the canvas.
   Samples come from a manifest (name, file, counts, size, description, tags,
   suggested first card, credit) seeded from the test corpus (karate.net,
   dolphins.net, football.net, lesmiserables.gexf, got-network.graphml,
   airlines-sample.gexf) plus the fraud ring.
3. Recent files, when any exist. Recents persist in local storage (name,
   format, counts, time, URL where there was one) and can be cleared from
   Settings > Data management.
4. Saved recipes, shown only when one exists. Each row names the recipe and
   its step count and opens a file picker, so a month-old analysis reruns on
   a new file from a cold start. Recipes are stored under Settings > Data
   management, Saved items, listed mid-session in the Recipes library section
   under Analyze's History, and created by that section's plus (5.3, Saved
   things). Present writes the file with "Export recipe (JSON)".

No tour, no wizard, no modal. The rail is visible so the shape of the tool is
learned by seeing it.

### 7.2 Defaults on load

Below the large-graph threshold: force-directed layout (ngraph), node size
by degree on a square-root scale with the largest node at most 4x the base
size, labels on the top clamp(round(sqrt(n)), 5, 50) nodes by degree using
the label top-N style helper, a single neutral node color. Nothing else
runs, except the Run on load list in Settings > Defaults when the user has
set one.

Above the threshold (Settings > Performance): the Fixed layout when the file
carries positions for every node, otherwise Quick grid (connected parts
sorted by size, each laid out on a grid cell; deterministic and linear), with
the Random layout with a fixed seed as the fallback when parts are not yet
computed at draw time; force-directed (ngraph, Settle mode) available on
request from Style and never started automatically; uniform node size until
a degree pass finishes; at most 20 labels (top by degree; the Performance
mode value, against the below-threshold default of 50 in Settings >
Performance) plus the selected,
hovered and search-hit nodes, none while a layout is running, with labels
drawn as one screen-space layer; edges as 1 px lines hidden above the edge
cap until the view narrows; hover, tooltips and animation off; note markers
follow the clustering rule in 5.7; the status bar shows the Performance mode
chip. Above the render ceiling the Import options dialog has already chosen
a subset (5.3 Data), and the same defaults apply to the drawn subset. The
degree pass used for size and labels runs in the background at import; until
it finishes the legend reads "Size: uniform (measuring)".

### 7.3 Insights strip

Appears in the Loaded state above the canvas. Up to four cards chosen by a
rule table from the data's shape, in priority order, with Search always last.
Dismissible with a single strip-level X. Dismissal is global across every
dataset, which makes it the one gesture that can silently remove the whole
novice guidance layer, so it is not silent: the X raises a toast, "Suggestions
hidden on every dataset.  Undo", for eight seconds, and is reversible at any
later time from Help > "Show suggestions" and from the command palette. Undo
does not catch it, because panel state is not undoable (5.1). Each card has a
visible "Try it" affordance and the whole card is clickable. Cards dropped by
the cap survive: the strip's trailing line reads "N more in Help" and is a
link that opens the Help menu with "More suggestions (N)" expanded. The strip
is a region in the F6 ring whenever it is shown, with Left and Right between
cards, Enter to activate and Delete to dismiss (5.6); a card's
run-plus-open-plus-read behaviour is not equivalent to running the same
capability from the palette, so leaving it out of the ring would be a flat 6.4
violation.

Rule table, in priority order:

| Priority | Condition | Card | Capability |
|---|---|---|---|
| 1 | Validation warnings > 0 | Check N data issues | data-validation |
| 2 | Always | Find groups | community-detection |
| 3 | Directed | Who has influence | centrality-pagerank |
| 4 | Not directed, or Influence not shown | Who is most connected | centrality-degree |
| 5 | Nodes > 20 and below the large-graph threshold | Find the bridges | centrality-betweenness |
| 6 | Time role assigned | See how it changed over time | temporal-navigation |
| 7 | Above the large-graph threshold | Find connected parts | component-analysis |
| last | Always | Search for something you know | search |

Above the large-graph threshold the strip is deterministic: Check N data
issues (when warnings), Narrow the view (description: "Filter by type,
attribute, or a result you have already run."; opens the Explore filter
builder with "Try it" preselecting the most recent completed result from the
current data version; shown when nodes exceed 50,000), Find connected parts, Who is most connected
(degree), then Search. Find groups and Find the bridges are not offered as
cards above the threshold; they stay in Analyze with their estimates.
Between the threshold and 1M nodes Find groups may appear as a fourth card
only when its label-propagation estimate is under 60 s, with a muted third
line "about 25 s, label propagation, on 100,000 nodes" (tooltip only in the
iPad chip form). The strip never offers a card whose estimate exceeds 60 s.
Cards in the Advanced question group and cards whose cost class is cubic or
unbounded never appear in the strip. Above the render ceiling a card "Load
the full graph" links to the Import options dialog. The Search card's
example is the highest-degree node that has a label attribute, and above
the threshold adds "Exact ids are fastest."

Clicking a card does three things at once:

1. Runs the capability with size-aware defaults when its estimate is under
   5 s; otherwise opens its panel, highlights the card and shows Run with
   the estimate without running.
2. Opens its home panel, scrolls to the control, highlights it for two
   seconds, and opens its tier 2 parameters.
3. Writes a plain-language reading into the inspector (7.5).

The time card toggles the time slider instead of running anything. A card
retires once its capability has been run directly from its panel. Card
retirement is stored in local storage.

### 7.4 AI as free-form guidance

A typed question goes through the same routing as a card. Each tool call the
assistant makes is listed as a step in the AI panel with the name of the panel
that owns it, and that panel opens or flashes. The step row's title is a link
and does what an Insights card click does in 7.3 item 2: it opens the step's
home panel, scrolls to the control or result the step produced and highlights
it for two seconds, and never re-runs anything. Printing the owning panel name
without making it a link left the user clicking a rail icon and hunting the
Results tab after every answer. Without a configured provider,
the AI panel shows a one-line setup prompt; the console (5.3, AI) is the
provider-free form of the assistant route in principle 3. The rest of the
application does not depend on AI.

Tool to home: setLayout, setDimension, setImmersiveMode, findAndStyleNodes,
findAndStyleEdges, clearStyles -> Style (setDimension and setImmersiveMode
flash the canvas toolbar); runAlgorithm, listAlgorithms -> Analyze;
queryGraph, findNodes -> Explore; getSchema, sampleData, describeProperty ->
Data (the Data table drawer); findNotes, addNote -> Explore (Notes);
captureScreenshot, captureVideo -> Present; setCameraPosition, zoomToNodes
-> canvas (the canvas toolbar flashes). The step list shows Cancel while
a call is in flight and Retry after a failure. New tools are added to this
table when built (5.8). Registered extension algorithms are available
through CommandRegistry.

Every tool call that maps to an Analyze card passes through the card's cost
gate: above the ask limit the step renders as a pending row "Bridges
(betweenness) on 100,000 nodes: about 40 s with 100 sample sources. Run /
Skip" and the assistant waits; the assistant's context includes the size
band and the per-card estimates so it proposes sampled runs. The
assistant's schema context is built from a 1,000-node sample and the panel
says so.

The agent loop (multi-step tool use with results fed back) is a separate task.
The AI panel design reserves the step list for it.

### 7.5 Plain-language readings

Every graph summary and algorithm result in the inspector opens with one or
two sentences a novice can repeat back, then the caveats line, then the run
record line, then the numbers. Each reading is a collapsible row, open by
default. Collapsed it shows the first clause and the headline number on one
line ("Main bridge: acct-4471 (0.41)"). The collapsed state is remembered per
view kind (graph summary, node, selection, result) under 6.5. The caveats line
stays visible in both states. The run record collapses to one line -- method,
the parameters that were not defaults, and scope -- with a Details chevron
opening the full record, and its open state is remembered per view kind under
6.5; it is never placed behind an info circle, because it reports what was
done, not what a thing means (6.7). A reading is never placed behind an info
circle either, at any density, on any screen width, under any Settings value:
it is the mechanism for the W14 comprehension criterion (7.6) and the first
thing the inspector shows.

Every reading renders Copy reading in its header row, the graph summary
included; on the graph summary it copies the reading plus the caveats line
plus the Counts rows plus the legend's channel lines, so one click produces a
paragraph a user can paste to a colleague. A node-metric reading also offers
the follow-up "Check this against other measures", which runs the remaining
node rankings as a batch and emits the Rankings summary card (5.3 Analyze),
gated by the summed estimate against the ask limit.
Examples:

- Graph summary: "17 cats, 1 dog and 2 humans, connected by 29
  relationships. Everyone is connected to everyone else through at most 5
  steps."
- Community result: "4 groups found. The largest has 7 members. The groups
  are clearly separated (modularity 0.54). Colors now show groups." The
  modularity clause is banded: above 0.3 "clearly separated", 0.1 to 0.3
  "weakly separated; treat with caution", below 0.1 "barely separated; the
  grouping may not be meaningful". The band scale is identical on every graph
  while the number and the band word are not, so the scale is the info circle
  on every modularity value -- in the reading and in the result body alike --
  and is no longer repeated inside the sentence (6.7). The per-group density
  column is labelled "links inside".
- Betweenness result: "Mr_Whiskers is the main bridge. It sits on 41% of the
  shortest paths between other nodes." The second sentence becomes "Removing
  it would split the network into 2 parts" only when an articulation-point
  check confirms it; otherwise the reading offers "Simulate removing
  Mr_Whiskers to see what breaks", which opens What breaks if removed on that
  node. The articulation-point check is new work (5.8); until it ships the
  template always uses the "Simulate removing" sentence.
- Dual-score reading: "X is the top authority (most pointed to by
  well-connected nodes); Y is the top hub."
- Caveats line under a sampled run: "Approximate (sample of 200). Computed on
  the largest component (188 of 200 nodes)."

Community readings are method-independent and require group count and
modularity from every grouping method.

Templates are size-aware. A template never schedules a computation above
O(n+m) on its own; anything more expensive is offered as an action. Graph
summary above the threshold: "612,000 users, 388,000 devices and 41,000
domains, and 37 other types, connected by 10,000,000 relationships. One
connected part holds 91% of nodes; 48,000 small parts (mostly single nodes)
hold the rest." The "at most N steps" sentence appears only when an exact
diameter result exists; after a sampled estimate it reads "A typical pair is
about 6 steps apart (estimated from 100 samples)". Type lists name at most
three types, largest first, then "and N other types"; counts above 100,000
round to three significant figures in prose and stay exact in the Counts
rows. Community above 12 groups: "3,412 groups found. The 11 largest hold
62% of nodes; the largest has 61,208 members. Colors show the 11 largest;
other nodes are gray." with the caveats line "Label propagation, stopped
after 60 s (partial). Computed on the largest part (912,000 of 1,000,000
nodes). Showing a sample of 50,000." Betweenness above 10,000 nodes uses
relative phrasing: "acct-4471 is among the strongest bridges (approximate,
100 sampled sources); it sits on about 40 times more shortest paths than a
typical node." The articulation-point sentence is offered only through
Simulate removing. Node reading: degree with percentile and the rank in each
result that includes the node ("Linked to 12,041 others, more than 99.99%
of nodes. Rank 3 of 1,000,000 by Influence"), never a structural claim.
Selection readings above 5 nodes use counts only ("41,230 nodes selected.
They connect to 612,000 other nodes and average 14.8 links against 9.1 for
the graph.").

Readings are generated from result statistics by templates, not by AI. A
template never asserts a structural outcome it has not computed.

### 7.6 Mapping to W14 success criteria

| Criterion | Target | Mechanism |
|---|---|---|
| Time to first visualization | Under 2 minutes | Welcome plus sample datasets plus defaults on load |
| Comprehension | User can describe what they see | Plain-language readings |
| Confidence | User feels capable of exploring further | Cards cannot break anything; undo is in the top bar; Zoom to fit is always one click away |
| Activation | User runs at least one analysis | First card click |

## 8. Expansion rule

Adding a capability means filling six fields:

1. Activity: Data, Explore, Analyze, Style, Present, AI, Settings, or
   cross-cutting.
2. Tier: 1, 2, or 3, using the test in 6.2 (derived from the option schema
   for generated controls).
3. Names: plain-language name and technical name.
4. Insight card: none, or a rule table row.
5. Cost class: instant, iterative, heavy, cubic, or unbounded, which selects
   the size-aware behavior in 5.3 Analyze; and any engine option the design
   relies on that does not exist yet (code dependency). The class name is
   internal: it never appears in the interface, on a card, a group header, a
   tooltip, a palette row or a caveats line. What the user sees of cost is an
   estimate in units of time and a warning when it is large.
6. Status: shipped, wrapper needed, or new work, recorded in 5.8.

Worked example, computed-attributes: activity Data; tier 2 for the list and
tier 3 for the formula dialog; names "Custom score" and "Computed attribute";
no insight card; cost instant; status new work, app. Result-producing
capabilities also name their result shape from the table in 5.3, or add a
row to it, and declare the shape's required result fields and the plain
name of its primary metric.

Worked example, notes: activity Explore; tier 1 for the inspector input,
tier 2 for the Notes list; names "Notes" and "Annotations"; no insight card;
not result-producing; cost instant; status new work, app. The original
`annotation` capability failed the one-home test because it bundled notes
(Explore) with callouts (Present); the fix was to split the capability, not
to add an activity.

An algorithm variant is a Method parameter on the existing card, not a new
card. Every algorithm the element registers and every layout it registers
has a home on the day it is registered: the matching card's Method select,
the Advanced question group, or the Style All layouts list.

View modes and input bindings are cross-cutting and live in 5.6. A new
binding is added to the 5.6 table and to Settings > Keyboard shortcuts,
never to a panel. VR and AR are cross-cutting view modes, not capabilities;
they are reached from the Views menu, the palette, and the AI
setImmersiveMode tool.

Extensions. An extension registered through LayoutRegistry,
AlgorithmRegistry, DataSourceRegistry or a mapping or enrichment provider
must supply the six fields and lands in an existing panel. An algorithm
supplies a result shape from the 5.3 table; activity is fixed to Analyze;
without the fields it appears under a "Custom" question group with its
technical name only and the Node metric shape. A registered layout appears
in the Style All layouts list (section 5.3, Layouts); a registered data
source appears in Data's secondary row as "Open from <name>..." and in the
palette, or in a future public-data section; a mapping provider appears in
the Map identifiers dialog; an enrichment provider enables "Compare categories"
on Community cards. Registered algorithms are available to the AI panel and
the console through CommandRegistry, to recipes, and to the palette, which
satisfies 6.4. Extensions never add rail activities or panels.

If a capability does not fit one activity, the activity list is wrong, not
the capability. Changing the activity list is a design change to this
document.

## 9. Mockup scope

Artboards to produce, all at 1440 by 900 unless noted, matching the app's
existing Mantine dark theme and compact sizing. Existing artboards change
per this revision: every panel action that is not its section's primary action
becomes a subtle action row with no key chip (5.6); every stack of copy links
becomes one copy control with a menu, and every run record is one line with a
Details chevron, with one card per canvas drawn expanded so the full record is
visible somewhere; every explanatory tooltip gains a visible info circle
(6.7); the status bar drops its 3D chip and merges the layout name and state
into one chip with a caret; StylePanel loses the Annotation tools row and
gains the four-segment layout selector and run row, and draws its Size row
select open on the "Not computed yet" group; PresentPanel's "Annotation tools
(Style)" link is removed and "Include note markers" added; ExplorerExpert
runs Bridges exact on 200 nodes, shows the run record line under every
result card, has the Results tab selected, shows the node inspector's
neighbor list and note markers; ExplorePanel gains the Notes section and the
Select split button; IpadInspector shows a hub node with 12,412 neighbors
showing the capped neighbor section, actions that warn and confirm, and the Notes section;
every existing artboard shows the canvas toolbar with the 2D/3D toggle
and the status bar mode chip.

Revision 1.9 changes one thing across the set, and every board is read against
it. Every section drawn with a gear is a section with resident rows above that
gear: no board draws a chevron over nothing, and no board draws a section whose
whole content sits behind a door. Because the rule is about what a chevron
opens ONTO, it cannot be validated from a set of closed headers -- a closed
header looks the same either way -- so for every section that carries a gear,
at least one artboard in the set draws that section EXPANDED, with its resident
rows and its gear glyph both visible in the same picture. A section that
appears only as a closed header across all 48 boards has been asserted and not
drawn. A board whose premise is a resting panel keeps that premise and
discharges the obligation through the board that draws the same section open,
which is what re-scopes the eight boards whose only premise was a door drawn
open: none is deleted, each becomes the drawing of the expanded section with
its gear pop-out beside it where one still exists. Three measurements are drawn
rather than asserted, because they are where the arithmetic is closest -- the
main inspector with Schema open, StylePanel with Parameters, Animation and the
Color section's Values all open, and the Data panel with the validation report
open -- and any board that overflows its region names the section and the
overflow in pixels in its own comment.

Revision 1.8 changes two things across the set, and every board is read against
them.

First, the pop-over decisions. Every board that draws a transient surface draws
it on the anchor rule of 6.11 -- one axis carrying the gap, the other a shared
edge line with the opener's anchor box, a 6 px caret on the leading edge, and
the opener lit -- and every board that draws a gear or a door draws the stub in
the primary ink when anything behind it deviates. Ten drawn surfaces are
corrected against measurement rather than taste, and they are named because
they are the audit: the time slider settings pop-out slides along the bar
instead of rising over the legend, keeping its 12 px gap to the bar; the
validation pop-out flips its edge line to bottom-to-bottom and takes its own
scroll region rather than sitting 362 px above its row; the multi-selection
pop-out returns to its opener's top, with nothing having forced it down; the
History popover anchors to the whole split button at an 8 px gap rather than to
the Undo half at 12; the Views menu right-aligns to its opener instead of
overhanging it by 106 px; the Style diverging confirm sits on the row that
raised it and stops being a floating card with a pin and a close X; the iPad
confirm names its opener and takes the 8 px panel-boundary constant; Save as
style loses its full-screen scrim and becomes a panel-lane pop-out, and the
section overflow drawn open beneath it closes; the data table info bubble
anchors to its column's info circle with a caret and flips above the header row
rather than covering that column's own cells; the rail Help menu takes the rail
lane and its button's own bottom edge; and the group profile takes the 12 px
overlay inset rather than a 4 px gap to the legend. Six of 6.11's twelve worked
examples were never drawn open on any board, so their anchors were untested,
and four of the twelve that were drawn were wrong: the undrawn six are not safe
by default. Every row of 6.11's worked-example table is therefore drawn open on
at least one artboard, with its opener lit, before the anchor rule is called
validated.

Second, the legend decisions. Every board that draws a legend drops its
state-row block and its category counts, caps its categorical block at five
rows plus Other with the coverage footer riding on the Other row, and prints
the scale word on every channel whether or not it is the default. The Compare
board draws its shared channels once, in a strip 12 px above the canvas
toolbar, and the toolbar does not move. One new board draws the composed export
legend, which is the half of floor item 5 that has never existed.

Revision 1.7 changes five things across the set, and the changes are stated
here so a board is read against them. Every Import board names its entry state
in the title row again and replaces its copy-pasted reopen paragraph with an
IN / REOPENS AS / OUT / CANCEL form for its own state. Every board that draws a
CLOSED section draws the 32 px header with its state mark rather than the
section body -- which is the surviving half of a 1.7 instruction whose other
half, licensing a section to have become a door, is withdrawn (6.11). Every
panel that owns a saved kind draws that kind's library section with its
resident plus. Every result card whose run
painted draws the resident swatch, the layer name and "Change encoding" in
place of an encoding control. And every board that drew the vertical navigation
cluster at the canvas's left edge draws the bottom-centre canvas toolbar
instead, with the freed 56 px column returned to the canvas.

Revision 1.6 rebuilds every panel and inspector on the ten row types of 6.9:
label lines move into their fields, units become dimmed suffixes, controls at
their defaults and sections the data cannot support stop rendering, repeated
words rise to their headers, and the Analyze catalogue moves into the picker.
Three boards are rebuilt and accepted as the prototypes of the system --
StylePanel, AnalyzePanel and ExplorerExpert -- and the rest follow their moves
in groups: the catalogue panels, the result screens, the Style surfaces, the
inspector-led screens, import and data, settings and reference, menus and
popovers. Two boards are deliberately almost untouched: the Insights strip is
the mitigation that makes Decision A survivable, and a shortcuts table is a
list of capability names and their keys, which is floor items 4 and 6. A small
cut on those two is the sign the rules are working, not failing. The measures
the revision is held to, in this order: panel scroll height, words per 100 px
of a 280 px column, then total visible words.

| Artboard | State | Purpose |
|---|---|---|
| Welcome | Empty | Section 7.1 |
| Explorer, first load | Loaded | Cat dataset, defaults on load, Insights strip with the focus ring on the first card, graph summary in inspector with Copy reading in its header, the Help menu drawn open, and a comment recording the "Back from VR" toast rather than drawing it |
| Explorer, after card | Result | "Find groups" clicked: Analyze panel open with the control highlighted, colors encoded, reading in inspector |
| Explorer, expert | Result plus Selected | Larger dataset, Analyze panel with parameters expanded, betweenness result card with run record, one node selected in inspector with the neighbor list |
| Style panel | Loaded | Layers list, layout selector and run row, a layer selected so the inspector shows layer properties |
| Explore panel | Selected | Search results, filter chips, filter builder open, Notes section |
| Analyze panel detail | Loaded | The resting panel under Decision A (5.3 Analyze): no scope line, because the scope is the whole visible graph; the weight compound row; an empty Results tab drawn as a dimmed tab with no count; a Suggested group of four cards; one "+ Analysis" row; and one Suggested card pointed at, with its parameters open as field-row pairs and its Advanced door. No cost-class word anywhere, and the three estimate bands visible across the Suggested cards |
| Analyze picker (added by revision 1.6) | Loaded | The popover "+ Analysis" opens: the search field, the seven question rows with their counts, one row expanded to its methods, an already-run card marked as run, and the one-line description rendering in full on the picker row it belongs to. This is the surface that now holds the 26-card catalogue, and the board that proves Decision A relocated it rather than deleting it |
| AI panel | Result | A question answered with a step list naming panels; the console row |
| Present panel | Loaded | Export image with tier 2 options open |
| Settings | Any | The overlay with its sections, one section active |
| Command palette | Loaded | Open over the Explorer with a query typed, showing the Attributes group under the Commands rows, one Actions row, and the "@a > @b" path hint row |
| iPad, panel open | Loaded | 1180 by 820. Activity panel overlaying the canvas |
| iPad, inspector open | Selected | 1180 by 820. Inspector overlaying the canvas; a hub node with 12,412 neighbors showing the capped neighbor section and actions that warn and confirm |
| Explorer, time slider (added by validation) | Loaded | Timed fraud dataset with the time slider overlay on, a window active, counts as visible of total, "Viewing:" in the status bar. The bar carries the transport, the readout and a gear only; every unit-bearing string is marked as derived from the Time role's units, and the unit select renders only because this dataset is dated |
| Explorer, widest Insights strip (added by validation) | Loaded | Directed, timed graph above 20 nodes with warnings: the four-card cap and priority order, plus the data issues chip |
| Data table drawer (added by analysis 2) | Result plus Selected | Fraud dataset, drawer open on the Nodes tab sorted by betweenness, "Rows with issues" on, "Top N by each metric" agreement line, "Only selected" on, three rows selected and highlighted on the canvas and mirrored in the inspector, time slider docked above the drawer |
| Explorer, compare split (added by analysis 2) | Result | Two halves labelled "Groups (resolution 0.5)" and "Groups (resolution 1.5)", Link views on, differing nodes outlined, diff legend, inspector with side-by-side metrics |
| Explorer, multi-selection (added by analysis 2) | Selected | Shift+drag marquee just completed over the fraud dataset, seven nodes and four edges selected, Explore Selection section open, inspector showing "7 nodes, 4 edges" with a pinned card A above, "N selected" in the status bar |
| Explorer, history popover (added by analysis 2) | Result | The Undo split button's caret opened, History list open with current position marked, one entry previewed, row titles drawn as links, and one collapsed "VR session 14:21 - 14:39" group whose voice-taken steps read "by voice, in VR" |
| Analyze panel, sweep (added by analysis 2) | Result | "Run as sweep" Advanced block and the resulting three Groups cards plus the Sweep summary card |
| Settings, keyboard shortcuts (added by analysis 2) | Any | The Keyboard shortcuts section active with the grouped 5.6 table, no Rebind buttons (the key chip is the target, a row-hover pencil and a refresh on customised rows), one rebind in progress, Reset to defaults, and the twelve-row read-only XR group with its Controller and Hands columns |
| Keyboard shortcuts dialog (added by analysis 2) | Loaded | The ? dialog over the Explorer, read-only table, listing shipped bindings only; the panel and editor focus-movement groups stay, because a keyboard-only user is who opens it |
| Explorer, Views menu (added by analysis 2) | Loaded | 3D, the canvas toolbar with the 2D/3D toggle and the Views menu open upward with its Toolbar row, zoom menu in the status bar. Enter VR carries one second line, the readiness count; Enter AR carries none; a comment records the three gate states so the disabled form is documented without a second artboard |
| Explorer, context menu (added by analysis 2) | Selected | Fraud dataset, right-click menu open on a node with key chips |
| Explorer, notes (added by analysis 2) | Selected | Fraud dataset; one node selected; inspector Notes section with one user note and one Assistant note; note markers on three nodes and one edge; "N notes" chip in the status bar |
| Explore panel, notes list (added by analysis 2) | Loaded | Explore with the Notes section expanded: filter chips, four rows, one group "Target not in graph", Show notes switch |
| Import options -- guessed column, nothing loaded | Empty to Loaded | The five Import rows in this table are one dialog in five of its seven entry states, not five dialogs; each names its state in the title row's entry clause (5.3 Data, item 0) and each replaces its copy-pasted reopen paragraph with an IN / REOPENS AS / OUT / CANCEL form for its own state. This board's file has a guessed type column, and "guessed column" sits later than "delimited file" in the trigger list, so the tie-break gives it that clause. This state: a fraud-ring CSV with the role and type grid, the Role chip drawn open as the menu it is, the guessed-count line with Review, a Time role with Kind, Measured in and Format, the Policies rows with their info circles, the Load control, and the Parsing group collapsed |
| Import options -- delimited file (recognised export), nothing loaded | Empty | A tab-separated export recognised by auto-detection: the banner as a one-line run record with Details and "Map it myself", roles pre-assigned, the score column as weight with the divide-by-1000 offer, the installed saved filters |
| Import options -- above the render ceiling, nothing loaded | Empty | The dialog for a 1,000,000-node file: the file name and size once in the title row, the counts once in the summary, the memory estimate and the ceiling once in the warning line, the subset arithmetic once inside the chosen Load option, no Large badge, Import enabled with "Import everything anyway" as the alternative |
| Import options -- second file, data already loaded | Loaded | The dialog opening at the "What to do with this file" choice, with the Attach match preview line and the auto-picked Match on field |
| Table join dialog (added by analysis 2) | Loaded | Add attributes from a table with Apply to: Nodes, key mapping, the live match line and unmatched rows |
| Data panel, loaded (added by analysis 2) | Loaded | Data panel with Loaded data policies and joined tables, Columns, Validation report with Show rows, and Cleaning steps after one merge and one Auto-fix |
| Style, diverging encoding (added by analysis 2) | Loaded | A layer with Color by logFC: diverging palette, midpoint 0, histogram domain, missing-value swatch, and the matching legend block |
| Inspector, genomics node (added by analysis 2) | Selected | The biology sample; attribute groups from the joined table, Key attributes pinned, metrics with percentiles, Notes |
| Category table result (added by analysis 2) | Result | A category-score table joined onto Groups: sortable categories, Remove redundant categories, Select members. The inspector's Categories section is drawn EXPANDED -- the top three categories as two-column rows, name and adjusted p, with the "6 of 41 rows" footer -- its parameters behind a gear and the full table in the Data table drawer |
| Filter builder, expert (added by analysis 2) | Selected | Builder tab with a between slider over a log histogram, Match any grouping, the Expression tab preview, Select matches result mode |
| Explorer, loading (added by analysis 2) | Loading | A 120,000-node file mid-load: status bar in the Building phase with Cancel, quick-grid canvas filling in, heavy Analyze cards disabled, Insights strip absent |
| Explorer, large graph, Performance mode (added by analysis 2) | Loaded plus Result | 120,000-node security graph: point-and-line canvas with 20 labels, density-heatmap minimap, legend with 11 groups plus Other, status bar with compact counts, "Positions from file" and the Performance mode chip, above-threshold Insights cards, Analyze panel with cost classes, a sampled Bridges card with its estimate and one card warning "Run anyway (about 3 h)", inspector graph summary without diameter |
| Explorer, loaded subset (added by revision 1.5) | Loaded, subset | 6.1 defines a Loaded-subset state that no artboard drew, and it is where the large-file path ends -- the most intimidating arrival in the product. It continues the large-file import: 50,000 of 1,000,000 nodes and 410,000 of 10,000,000 edges on the quick grid in Performance mode, drawn honestly as a bounded field of small uniform dots with the 20-label cap; the filter strip's two sample lines; the compact status bar counts and the Performance mode chip; the Insights strip carrying "Load the full graph" and "Narrow the view"; and the graph summary opening "Showing a sample." with every count reading shown of loaded of total |
| Import flow (added by revision 1.7) | Any | The whole machine as one picture: the seven ways in with their clauses in precedence order and the note that the list is evaluated from the end; the dialog's nine items as bands, the five always-present ones solid and the four conditional ones tinted with their render conditions on leader lines; the ways out with their destination states, Cancel with its two behaviours, and Esc and the title-row X noted as the same action; the seven ways back in with their scroll targets; and the decision table beneath at 11 px with eight example files, including the two rows no board draws. The only board in the set that draws a transition rather than a resting state, and the relationship between the Import boards is not visible from inside any of them |
| Import options -- parse error (added by revision 1.7) | Empty | The one entry state where the primary is disabled: the error block with the offending line quoted and its count, the grid rendered as far as it parsed with the bad row in the warning colour, the Parsing group drawn open with Separator focused, Cancel never disabled, the footer note carrying the reason in full, and "Skip 4 rows and import" beside the disabled Import. No board exercised floor item 4's disabled-reason clause on the highest-stakes disabled button in the app |
| Validation report pop-out (added by revision 1.7) | Loaded | The Validation report drawn EXPANDED in the Data panel -- its issue rows with their counts and primary verbs and the green "Fixed by step 2" line -- with the detail gear's 360 activity-panel pop-out beside it and the Data table drawer open beneath. The coexistence of a left pop-out and a bottom drawer is the whole argument for tier 3a over 3b and cannot be drawn on one surface. It draws no pin, which the closed pin set already forbids |
| Group profile pop-out (added by revision 1.7) | Result | A 360 inspector pop-out anchored to a row of the Groups by size table, opening left, with the selected-row fill showing the tether and a comment recording that Up and Down re-target it. The browsable-detail case and the left-opening anchor |
| Style library (added by revision 1.7) | Loaded | The Styles section at rest and hovered, its overflow drawn open -- the only place a section overflow is drawn open in the set -- plus the Save as style dialog with its destination line and its two off-by-default checkboxes over the column roles and the analyses to run on open |
| Saved items (added by revision 1.7) | Any | Settings > Data management with every saved kind grouped, storage used, per-row origins, and the dimmed "For graphs you do not have open" group with its count. The housekeeping list is a different job from the working lists and must be seen to be different |
| Style from analysis (added by revision 1.7) | Result | MCL at granularity 2.5 on the 318-node ovarian dataset: the layer row reading "Groups (granularity 2.5)" with 6 in its trailing value, the Source section with the reading, the run record and the one deviating parameter, "Open result", and the granularity mid-edit showing the cost gate while the canvas still holds the 2.5 colours. The whole of the analysis-as-style change in one picture |
| Canvas toolbar (added by revision 1.7) | Loaded | The bar at both sizes (246 x 36 and 274 x 40), the three-way bottom stack as a labelled slice with its four offsets, and the two-line minimap and legend state drawn on a 600-wide canvas slice. A new component with a shadow, a concentric radius and four vertical offsets |
| Settings, Performance (added by analysis 2) | Any | The Settings overlay with the Performance section active: the readout, the detected block replacing the threshold and ceiling rows (headline, provenance, consequence, Recalibrate and Change), each remaining row's explanation behind an info circle on its label, "Show config keys" off so the storage keys are hidden, and the four XR rows under their sub-header |
| Present, compact (added by revision 1.8) | Loaded | The re-cut Present panel at rest, both gears closed, ten rows: the two RT-1 input pairs beside their resident estimates, the last export's filename, the Export video section closed with "10 s, Orbit once, WebM" as its header's state mark, and the Reports library section. The proof that the largest split in the revision lands |
| Image options pop-out (added by revision 1.8) | Loaded | The Image options gear pop-out at 280 in the panel lane, its gear drawn primary, with the canvas export frame hint reading "current view, 832 x 836, about 20 nodes in frame; legend: 2 channels". The board that proves a resident floor-4 report can carry the promise a hidden control makes |
| Exported legend (added by revision 1.8) | Loaded | The composed export legend drawn as an exported PNG at 2x: full blocks, twelve categories with counts, the coverage footer, the clamp line and one row per state drawn in the frame. Makes the export half of floor item 5 drawable and checkable rather than aspirational, and it is the only board in the set that is a picture of an output file rather than of the app |
| Ramp pop-out (added by revision 1.8) | Loaded | The numeric ramp door on its own resident RT-4 row, with gradient handle editing as a section of the ramp pop-out and not a second surface, and the Palette select, the clamp line and the attribute chip resident beside it. Its categorical twin is no longer a door: the same board draws the Values, Parameters and Animation sections all EXPANDED with their gears, which is three of the seventeen fixes on one board and the panel this revision measures first |
| All statistics pop-out (added by revision 1.8) | Loaded | All statistics drawn EXPANDED -- density 0.031, diameter 5 and average path length 2.99, each with its own "Computing..." state -- with the long-tail gear's 360 pop-out beside it and the header still reading "Computing 3 of 7" while any pass runs, which is the mark that survives the section being open |
| Run record pop-out (added by revision 1.8) | Result | 360, from a run-record Details chevron. The chevron appears on eleven boards and opens nowhere |
| Analyze parameters pop-out (added by revision 1.8) | Loaded | 280, from the parameters row gear, panel lane, top on the row, the gear drawn primary because a hidden option deviates, one field pinned inline to show the pin path, and the card's own commonly adjusted parameter -- Resolution here -- drawn as a resident row above the gear, so the board shows a gear that is an addition to content rather than a card's only route in |
| Column role pop-out (added by revision 1.8) | Empty to Loaded | A column's role parameters from the Role chip inside the Import options dialog, the chip carrying "Weight strength" as its dimmed suffix. The one board that exercises the dialog lane, and the one that shows why the value stays visible while the editing moves |
| Report editor drawer (added by revision 1.8) | Result | The report editor as a non-modal bottom drawer with the sections checklist inside it, the canvas live above it, and the Present panel behind showing no checklist. The board that settles a dialog-versus-drawer contradiction two sections had carried |
| AI panel, compact (added by revision 1.8) | Result | Provider and Console both drawn EXPANDED with their gears -- the model field and the Voice input switch under Provider, the console input and its last two transcript lines under Console -- plus the no-provider state where the setup prompt replaces the chat input |
| Note editor pop-out (added by revision 1.8) | Selected | 280, from a note row's edit glyph, with the notes list still inline behind it, because the list is refused a door and the row editor is not |
| Filter expression pop-out (added by revision 1.8) | Selected | 360, from the filter section header's Builder and Expression door, with the resident builder reduced to one row and a plus behind it |
| Shortcuts overlay (added by revision 1.8) | Loaded | The ? reference non-modal, replacing the scrimmed and focus-trapped dialog, with the canvas keeping pointer and keyboard behind it |
| Keep advanced sections open (added by revision 1.8) | Any | Settings > Appearance showing the second escape hatch, with one panel drawn in that mode so the scroll cost of turning it on is visible rather than asserted |

## 10. Validation plan

Each of the 25 workflows is walked phase by phase against the mockups and
this document by an independent reviewer answering: can the persona find the
control, does the vocabulary make sense to them, is anything required by the
workflow missing from its home panel, and does the state and tier assignment
match the workflow's common phase. Each of the 12 personas is reviewed
against their motivations and frustrations. Findings are verified
adversarially before being acted on. Findings that survive change the
artboards and this document. The next validation pass walks W20 through W25
and the genomics-cytoscape-user persona (adopted, section 2) in
particular, scoring W24's and W25's blocked phases as blocked, not failed.

Third pass (2026-09-04), against the 39 artboards of section 9 and this
document at revision 1.3: 37 reviewers (25 workflow walkthroughs, 12
persona reviews), 290 raw findings, 168 after merge, 70 confirmed by two
skeptics each (24 against this document, 46 against artboards). 23 of 25
workflows completable; W24 and W25 blocked only on their next-phase phases
(network collections, project files and NDEx upload). 12 of 12 personas
would adopt the tool; remedial-ness grade 2 of 5 for every persona (1 is a
pro tool, 5 a tutorial), down from an average of 2.8 in the second pass.

## 11. Out of scope

- Implementation. This document produces mockups and a framework, not code.
  The graphty-element and algorithms package work this design depends on is
  registered once, in 5.8 Implementation status; until each item lands the
  corresponding control degrades as its section states rather than showing
  a control that does nothing. Multi-node selection, lasso and edge
  selection in graphty-element, and application-level undo, are
  implementation tasks tracked there; this document assumes them, and per
  the sequencing decision (section 3) that work runs in parallel with the
  UI.
- The AI agent loop.
- Mobile phone layouts.
- Touch-optimized control sizes.
- Collaboration and sharing features beyond the existing share button.
- A separate Report Builder screen.
- Project files (saving layers, results, filters, bookmarks, notes and
  callouts as one file). Until this exists, W09's chain-of-custody criterion
  is met only at session level by the Cleaning steps export and the analysis
  recipe; notes already carry author and timestamps for it and persist in
  local storage in the meantime (5.7).
- Database and online sources as data sources. Attaching an attribute
  table from a file by key is in scope (Data, Table join). Lazy neighbor
  fetching (fetchNodes, fetchEdges) stays with database connections; the app
  leaves them unset so a click only selects.
- Public database queries (STRING REST, NDEx and the like): future phase,
  decided 2026-09-04. When added they live in Data at tier 2 as an "Online
  sources" list, one row per registered remote data source, each opening the
  Import options dialog with a source-specific query form above the grid;
  plain name "Public database import"; no insight card; NDEx is also a
  future export target (CX2 plus a metadata form).
- RDF import (Turtle, N-Triples, JSON-LD): future phase, decided 2026-09-04.
  The knowledge engineer's stated frustration; outside the 61 capabilities.
- Network collections (several networks per session with a top-bar
  switcher, per-network layout, style and results, node attributes shared by
  id, and network set operations: union, shared only, only in A, only in B,
  with an "in" attribute on nodes and edges): next phase, decided
  2026-09-04. Requested by W20, W21, W22 and W24. Saved subgraphs, "Add to
  current graph" (the interim union) and the Present Scope select are the
  interim answer; W24's multi-network phases are blocked on this.
- Parallel edges stored as separate edges (the "Keep all" import policy;
  EdgeMap parallel-edge support): future phase, decided 2026-09-04. The
  combine-and-count default loses nothing.
- Callouts (visual annotations drawn over a fixed view). Designed to a home
  (Present tier 2, section 5.3) but deferred; notes ship first.
- Multi-user note threads, mentions and assignment. Notes have one author
  field and a done flag only.
- Multi-graph workspaces (tabs of independent graphs). Compare holds at most
  one second source.
- Recipe export as an executable program; recipes are JSON, with console
  text as a secondary, replayable script format.
- Column operations beyond rename, change type, fill, hide and delete
  (merge, split, search and replace) are specified but may ship after the
  mutation API.
- A first-person fly-through camera.
- Authoring in XR (section 5.9): the data table, the filter builder, the style
  editor, the layout list, export, and Present in any headset form. XR is a
  viewing mode; everything that authors data, filters, encodings or exports
  stays flat.
- Teleport and walk-in room scale in XR: deferred. Grab-the-world plus snap
  turn is the whole navigation model in phase one.
- Time scrubbing inside an XR session. The time slider is frozen for the
  session and the window is carried in and out unchanged.
- Two-hand node manipulation in XR (grab a node with each hand to stretch or
  pin the graph).
- Collaborative XR: two headsets in one graph. Notes have one author field and
  no presence model.
- AR hit-testing (placing the graph on a detected real surface). The graph
  floats at table height in passthrough.
- Graph isomorphism (two-graph input; belongs to a future comparison view),
  A* (needs a spatial heuristic), the research clusterers (SynC, TeraHAC,
  GRSBM), transitive closure, condensation graph, topological sort.
- A project file. A style template is how to draw a graph; a project file is
  the graph. Every kind under Saved things (5.3) stores settings that name
  attributes -- selectors, expressions, column names, algorithm names,
  parameters, checklists -- and none stores nodes, edges, attribute values,
  computed results or node positions. Two carry names of data without carrying
  data, and are stated honestly rather than hidden: a saved subgraph and a
  selection set hold node ids, and a view bookmark holds a camera; all three
  are bound to the dataset that produced them and none can reconstruct a
  graph. The style template the app writes is a documented subset of the
  element's style format (5.3, Style), not the project file deferred above.

## 12. Open questions

- The expert-state mockups use the synthetic 200-node fraud network (612
  edges); the large-graph mockups use a 120,000-node synthetic security
  event graph. Which open dataset (50,000 to 100,000 nodes, redistributable)
  ships as the Welcome large sample?
- Should retired insight cards come back after a long absence? Default: no,
  they return only through Help.
- Panel width on desktop: 280 px is the default, matching the existing
  sidebar spec. Confirm during mockup review.
- Project files are the likely next capability after this pass; they would
  live in Data tier 1 as Save project and Save as, would bring back a dirty
  indicator in the top bar, and would carry the notes collection and the
  per-bookmark callouts. The genomics persona raises project files from
  "likely next" to "required for W25"; the file must carry the network,
  joined tables and their keys, style layers, results, filters, saved
  subgraphs, bookmarks and annotations, and a methods text. Project files
  and network collections (section 11) are designed together in the next
  phase; the top bar dataset name becomes a switcher when more than one
  network exists.
- Dataset fingerprint for local-storage notes: file name plus counts plus a
  hash of the first 100 ids is the default; confirm it distinguishes
  re-exports of the same dataset.
- Whether computed-attribute formulas should eventually drop the [name]
  grammar for the same JMESPath paths used elsewhere. The capability
  requires [name] today, so 6.6 maps rather than replaces.
- The large-graph threshold and the render ceiling are no longer open: they
  are measured on the machine by the first-run probe in 5.3 Settings >
  Performance, and the numbers in the defaults table are the fallback for a
  failed probe. What still needs a benchmark story is the exact-computation
  cap (2,000 nodes) and the layout size ratings (any size, 10k, 2k, 500),
  both taken from large-graph-rendering.yaml and package estimates. Who
  benchmarks the layout size ratings before they gate the list?
- XR entry ceiling and frame floor (10,000 visible nodes, 72 Hz) are reasoned
  from a two-eye frame budget, not measured on a headset. When is that probe
  run, and does it share the machine calibration record?
- Is speech recognition available inside an immersive session on the target
  headset browsers? 5.9 hides the whole dictation route where it is not, and
  the Run list and "Flag this" carry the session; that fallback has not been
  tried on hardware.
- Is the 0.6 m forearm stand-off right for the wrist panel, or should the
  panel be placeable and remembered per user?
- Is the 200-node XR selection cap right? It is set well under the flat cap
  on the argument that a selection you cannot read is not a selection.
- Is AR worth shipping without hand tracking, given that it makes AR
  controller-first while the graph floats in passthrough?
- Rail activity hotkeys: no digit modifier is collision-free (Alt+digit
  switches tabs in Chrome and Firefox on Linux; Cmd+Shift+3, 4, 5 are macOS
  screenshots). Default: none; the palette is the keyboard path to a panel.
- Is a screen-space marquee acceptable in 3D, or is marquee 2D only?
- The 10% to 1000% zoom range maps onto minZoomDistance 2 and
  maxZoomDistance 2000 in RenderManager.ts:247-248; confirm the mapping
  against the fit distance for the 200-node dataset.
- Hubs and authorities: Advanced group (default, adopted in this revision)
  or Find important nodes on directed graphs?
- Is `metadata.source` on a style layer the right home for a run, or is an
  analysis-backed layer a one-step recipe wearing a style's clothes? A layer
  that carries an algorithm and its parameters and a recipe that carries an
  ordered history are now two artifacts holding the same kind of thing, and
  the next phase's project file carries both. Default: keep source as an
  optional metadata block on the layer, and let the recipe stay the
  ordered-history artifact.
- A whole-library bundle -- "Export all saved items (JSON)" with its
  collision-resolution UI -- was declined for this revision as one step from a
  project file. It is recorded here as an input to the project-file question
  above, not as a separate question.
- A saved formula makes the [name] grammar an exported artifact, which raises
  the cost of the JMESPath-versus-[name] decision still open above.
- The header signature (sorted column names plus delimiter) is a weaker key
  than the notes fingerprint, and two unrelated exports with identical column
  names collide into one import mapping. Naming the mapping after its
  originating file makes the collision visible instead of silent; whether the
  signature itself needs strengthening belongs beside the fingerprint question
  above.

Open risks carried by the 1.6 compaction system (6.9, 6.10). These are risks,
not questions: each has a stated mitigation and a check that decides whether
the mitigation held.

- Glyph literacy. A graph app carries more arbitrary glyphs than a drawing
  app; six of the eight rail glyphs are arbitrary rather than resemblance
  icons. Mitigations: Rule 11's labels switch shipped in the same revision as
  the glyphs, a register title on every icon-only control, and a register that
  stays closed. Check: any glyph a first-time user must decode to complete W14
  has a resident text twin.
- The scrub affordance is invisible in a static mockup and awkward on touch.
  An in-field glyph earns the right to drop its word because it scrubs;
  shipped without the scrub it is a riddle, and on iPad there is no hover
  while a drag competes with canvas pan. The artboards draw cursor ew-resize
  and a title, and a touch pointer gets a stepper popover instead, but the
  interaction must not lag the glyph into the build.
- Discovery loss in Analyze. A user who does not know betweenness exists no
  longer sees the word Bridges anywhere in the resting panel. The four
  mitigations are the Insights strip, the visible "+ Analysis" affordance,
  a picker that opens on seven questions rather than 26 names, and a palette
  indexed by question phrasing. Incidental discovery -- scrolling past Core
  layers and getting curious -- is not mitigated and is accepted. Check: a
  first-session user reaches an algorithm they could not have named within
  three clicks. If they cannot, the Suggested group is wrong, not Decision A.
- Hover-only actions strand keyboard and touch users. 6.8's full-text twin in
  the overflow or context menu is mandatory, not optional, and on a touch
  pointer every hover-revealed glyph is resident. Two of the 48 artboards are
  iPad boards, so the rule is not optional there.
- Tooltip dumping. Moving 18 card descriptions into 18 tooltips would put the
  wall of text behind a hover and make it worse for touch and keyboard, so the
  description lives on the picker row instead, at the moment of choosing. One
  description slot in the panel that follows focus or hover is a candidate,
  but it is a synthesis observed in none of the ten peer tools; validate it
  before committing.
- A chart loses the exact number a methods section needs. RT-9 always labels
  its two axis ends, and the full statistics stay in Copy methods text and in
  the export. Check: every chart row that replaced numbers has a path to those
  numbers within one click.
- Default-hidden panels differ between sessions, users and graphs, so a
  colleague's screenshot does not match your screen. A section the data could
  support but that is unset still draws its dimmed name and its plus; only a
  section the data cannot support vanishes; section order is fixed whatever
  renders; and the palette reaches every capability whatever the panel shows.
- Rule 6 can lie. A field showing a literal when the property was bound
  earlier and is currently overridden reads as never configured. Candidate
  fix: a 4 px corner square in the glyph slot meaning "set earlier, not in
  effect".
- A word cut alone does not answer the complaint. Every deletion is local; the
  density win is the row anatomy. Check the pixel measures before the word
  count: a panel that hits its word target with 38 px label-above-field stacks
  still standing has not done the job.

Open risks carried by revision 1.7. Same form: each has a stated mitigation and
a check that decides whether the mitigation held.

- The word count rises while the pixel count falls. Three of this revision's
  five changes add controls back to panels that revision 1.6 had just cut, so a
  reviewer measuring only words will read 1.7 as a regression. Every added word
  traces to a floor item or a name in 6.10. Check: any added word a later pass
  finds that does not so trace is a defect, not a precedent.
- The Source section is the single biggest addition and it lands on Style. At
  164 px per analysis-backed layer, a user with three of them pays nearly 500
  px on a 280 px column -- more than half a panel. Rule 7a deciding which
  parameters render is what keeps it affordable. Check: measure the
  three-stacked-layer case against 1.6's scroll-height target rather than
  waving it through; if it fails, the next lever is collapsing the run record
  line into the layer row's title, which floor item 3 permits only if the
  Details chevron survives.
- Library sections could become a habit. The treatment in 5.3, Saved things is
  a treatment, not a licence, and the guard is 6.11's refusal of a second home
  for a control whose home is a dialog. Check: a sixth library section is
  proposed only after its kind is checked against 6.11's worked examples.
- One pop-out per region will surprise someone. Opening a run record's Details
  closes an open group profile. That is correct, because both are about the
  same result, but it is the kind of rule discovered by frustration rather than
  by reading. Check: the two are drawn on boards that make the exclusivity
  visible.
- Discovery loss in Analyze is unchanged and now has one more reason to fire. A
  novice who finds the picture in Style has one less reason to open the Analyze
  catalogue. The mitigations are unchanged and the existing check above still
  applies as written; this revision does not improve it.
- The toolbar occludes the canvas bottom centre and always will. The Views
  menu's Toolbar row is the escape, and its way back is a palette row a user
  must know exists. That is a real, small, permanent cost, accepted knowingly.
  Check: the palette row is indexed under both "toolbar" and "show".
- `metadata.source` is a forward-compatibility bet. It is verified against the
  current schema -- `StyleLayer` is strict and `StyleLayerMetadata` is loose --
  but a future tightening of that metadata object would break every exported
  analysis-backed layer. 5.8 records the dependency, not just the feature.
- Making the import mappings visible makes their collisions visible too. That
  is the point, but it converts a silent wrong mapping into a user-facing
  question the app cannot yet answer; the open question above is where it is
  answered.
- Two spec numbers now do similar work. 6.9's RT-1 door rule and 6.11's
  section-scale door rule are one mechanism at two scales, and 6.9 says so
  explicitly. Check: if a later pass lets them drift into two concepts, the
  closed row set stops being closed.

Open risks carried by revision 1.8. Same form: each has a stated mitigation and
a check that decides whether the mitigation held.

- About 25 rows move behind doors in one revision, which is the largest single
  transfer this document has made. The mitigations are named in 6.4 and all
  four ship together: the palette index by both names for every door, the depth
  obligation that forbids a door behind a door, the stub drawn primary so
  hiding never hides a deviation, and the second escape hatch in Settings >
  Appearance. Check: walk every door in 6.4's list from the row that owns the
  property, with the owning thing present, and count the clicks. Any door that
  costs two is a defect.
- The exported legend does not exist in code, and this revision now promises
  one in every exported image at every scope. The screen legend gives up its
  counts and its state rows in the same edit, so if the export half slips the
  product is left with strictly less than it had. Mitigation: 5.8 carries the
  dependency as its own row rather than as a clause on the SVG row, and the
  ExportLegend artboard makes the target drawable. Check: the composed legend
  ships in the same release as the canvas cuts, or the cuts wait.
- The canvas legend's cuts are unconditional, which is the point and also the
  risk: a reader who used the legend to read group sizes now has to open the
  groups table. The argument is that 61.3 per cent of the legend's lines appear
  nowhere else and none of the cut lines are among them, and that the three
  conditional rules being replaced are what produced 0 to 86 per cent
  duplication across the boards. Check: the counts are one click away from the
  Other row on every board that had them, and a walkthrough that needed a count
  finds it there.
- The anchor rule is stated in pixels and the boards are drawn by hand. A rule
  with geometry attached is checkable, but it is also newly falsifiable on 48
  boards at once. Mitigation: five correct anchors are cited by pixel in 6.11
  so a later pass has a reference, and one review clause is added to the
  artboard pass. Check: every pop-out's shared edge line is within 8 px of its
  opener's anchor box, or the board's own comment names the obstruction.
- Narrowing the pin to four surfaces removes a control from three pop-outs that
  currently draw one. Someone has pinned one of those and will notice. The
  argument is that a pinned pop-out surviving a selection change is a second
  inspector, which is the panel 6.11 exists to split, and that the three losing
  it hold parameters rather than reports. Check: the four that keep it are all
  comparative across selections; a fifth request is a request for a report, not
  for a pin.
- Present gains a second dock. The report editor is a new surface class in a
  document whose surface list was closed, and two docks can want the bottom
  edge at once. Mitigation: 6.11 now counts a dock as a region, so each dock
  owns its own pop-out slot, and the report editor is non-modal precisely so
  the canvas above it stays editable. Check: the drawer and the editor are
  drawn together at least once before the class is called settled.
- The second escape hatch breaks a promise this document makes elsewhere. Eight
  collapsed sections are 264 px and never scroll, and a panel in "Keep advanced
  sections open" may scroll. That is deliberate and it is the same trade Rule
  11's first hatch already makes. Check: the KeepAdvancedOpen board draws the
  scroll cost rather than describing it, so the trade is visible before it is
  accepted.
- The picker is the one place a stated instinct is refused. Anchoring pop-overs
  to their parents is the rule this revision applies everywhere else, and the
  "+ Analysis" catalogue is told no on measured grounds -- every rung of the
  width ladder collides with the preview's fixed centred home. Check: if the
  preview's home ever moves, the refusal is re-derived rather than inherited.
- One pop-out per region now counts five regions rather than three, which makes
  the rule more permissive in exactly the places it was blocking real work, and
  a reader who learned the old count will be surprised twice: once when a
  dialog hosts a pop-out, once when a dock keeps its own. Check: the two are
  drawn on boards that make the independence visible, as 1.7's risk entry
  already asks for the exclusivity case.

Open risks carried by revision 1.9. Same form: a stated mitigation and a check
that decides whether the mitigation held. One risk, and it is the price of the
rule rather than an accident of it.

- Resident rows come back into a set that spent revision 1.6 removing them.
  1.6 cut 3,648 words and set the worst-case panel scroll target under 1,040 px
  against a measured 3,060; 1.8 took the six activity panels from about 116
  resident rows to about 80; the seventeen sections this revision reopens gain
  about 54 rows between them, and about a dozen of those are drawn only because
  Rule 7a's new carve-out renders a locally common row sitting at its shipped
  default -- Edge length 30, Window 30 days, Transitions 300 ms. A reviewer
  counting rows will read 1.9 as a regression against both revisions, and the
  count will be right. What pays for it is the decision that no section's
  default open-or-closed state changes: none of the 54 is drawn at rest, every
  one is behind a chevron that still defaults closed, the skyline of eight
  collapsed sections is still 8 x 33 = 264 px and still never scrolls, and the
  resting counts published in 1.8 stand, with the single exception of Present,
  which is 10 rows at rest and 13 with Export video open. What changed is the
  cost of an OPEN section, and that cost is paid only by a reader who chose to
  open it, which is the whole difference between disclosure and deletion.
  Check: every newly inlined section is measured against the panel's 800 px
  scroll region on the board that draws it, and against the inspector's own
  region on the boards that draw it there, with the sections the board's own
  comment says are open -- one section at a time is not a rule and must not be
  assumed. Any board that overflows names the section and the overflow in
  pixels in its own comment, in the form the two pre-existing overflows already
  use; a board that overflows silently has not been measured. Three cases are
  named in advance because they are where the arithmetic is closest: the main
  inspector with Schema open, twelve rows at the 32 px pitch on an inspector
  1.8 already projects at 24 resident rows, where the five-row cap and the
  "N more" row are the mitigation and must be drawn rather than assumed;
  StylePanel with Parameters, Animation and the Color section's Values all open,
  three of the seventeen fixes on one panel, ten rows on top of the fourteen
  1.8 leaves resident; and DataPanelLoaded with the validation report open, the
  section this set already cut from 282 px to a 32 px door once, where four rows
  is the budget and anything approaching 282 means the consequence sentences did
  not go behind the gear. Measure each of the three twice, because "Keep
  advanced sections open" inlines every gear's contents as well, and that mode
  is allowed to scroll where the default mode is not.

This revision also closes a risk carried since 1.7. 6.9's RT-1 door rule and
6.11's section-scale door rule no longer do similar work, because the
section-scale form is withdrawn: the door survives only at field scale, on a
row that is itself resident, so there is one mechanism at one scale and nothing
left to drift.

## 13. Revision history

- 1.9 (2026-09-08): three changes, applied against revision 1.8. (1) A section
  always expands. The rule, stated once: every section expands in place, a
  chevron is drawn only where it opens onto real rows, no section's content
  lives entirely behind a door, and a gear is an ADDITION to a section that
  already has resident content rather than a section's only content. Two things
  in 6.11 change and only two. The governing test keeps its conjunction, its
  stub clause and 6.10a's veto, and moves the denominator of its first clause
  from "sits at a default that most instances never leave" to "of the readers
  who open THIS section, is this among the two or three things they commonly
  adjust or consult" -- with "adjusted" reading as "adjusted or consulted", so
  the five sections that hide readouts rather than controls (Schema, All
  statistics, Categories, the sweep's runs, the validation report) resolve on
  what a reader came to read instead of resolving to "no controls, therefore a
  door". The global denominator was the same denominator for every row of one
  section, so it could not tell them apart and emptied sections rather than
  splitting them; seventeen sections in the drawn set had become a chevron over
  nothing, which is the test returning the answer it was asked for rather than
  a drafter's error repeated seventeen times. And the licence for a section that
  is only a door is withdrawn: RT-8's sentence permitting a permanently closed
  chevron, and 6.9's extension of RT-1's door rule to section scale, both go.
  The three refuted single-property tests survive unchanged and 6.11 now says
  why -- what they refuted is the conjunction, and only the first clause's
  population moved. Rule 7a gains its one carve-out: the two or three locally
  common rows render whether or not they deviate, which puts Edge length 30,
  Window 30 days and Transitions 300 ms back on screen and leaves 7a governing
  gear contents and every other row, while Rule 7c is untouched -- an empty
  section is not a door, and a section the data cannot support still does not
  render. RT-8's trailing slot splits by state: a state mark when the section is
  closed (a count, the highest severity glyph, an On switch, a progress string,
  the active member's own name) and the section's verbs and its gear when it is
  open, with Rule 8 deleting every mark the resident rows now repeat and keeping
  the ones they do not -- All statistics' "Computing 3 of 7", Step through
  time's On switch, Provider's Connected dot, against Schema's type counts,
  Categories' "41 rows" and Neighborhood expansion's "2 steps, 3 types", which
  go. Two artefacts keep a 480 pop-out and are opened from a gear on an expanded
  section instead of being the section: Schema's edges-by-type-pair matrix and
  the sweep's NMI agreement block. Question 4 is re-aimed at a gear's contents
  rather than at a whole section; the stub obligation is rewritten so that what
  leaves is the rare remainder and the two inks mark a gear rather than a
  section that has left; five stub-silent doors are swept in the same pass
  (Import settings on the Open file header, deleted outright as a duplicate of
  the Loaded data gear; the Columns chip's "9 of 12"; the Parsing gear's
  separator and header-row state, plus a keyboard route; Settings' Advanced and
  Encryption password rows; and the Expand-neighbors caret's depth and type
  filter, which is floor item 4); and the worked-examples table is rewritten
  with its verdict classes named above it and fifteen verdicts moved to the
  expanded form -- twelve a gear on an expanded section, one a gear on a card
  that draws its commonly adjusted parameter, one resident and expanded with a
  gear for its preferences, and Export video an expanded section with no gear at
  all -- each naming its resident rows, ten of them written as new rows, taking
  the table from 30 candidates to 40; every verdict that was already right --
  one member of a list, a report read once, a picker, a menu, a dialog, a
  preview -- is kept and marked as out of the rule's reach, so a later pass does
  not over-apply it. Nothing about which sections default open
  or closed changes, which is what pays for the roughly 54 rows the seventeen
  sections gain: none is drawn at rest, and 6.9's promise that eight collapsed
  sections are 264 px and never scroll survives intact. Settings navigation
  stays out of scope (a nav list is a picker), and "Keep advanced sections
  open" survives as a separate preference, because it governs what is behind
  the GEAR while the new rule governs what is behind the CHEVRON. The rule is
  then applied where the file still contradicted it: 5.3's Data, Explore,
  Analyze, Style, Present, AI and Settings passages, 5.4's Schema and Selection
  statistics rows, and section 9's artboard brief, which gains the obligation
  that every section carrying a gear is drawn EXPANDED on at least one board so
  the pattern is visible rather than asserted. (2) Floor
  content is drawn, not hovered. A floor item is drawn in the words the reader
  needs, on the surface, at the size the surface has; a title attribute, an HTML
  comment and the far side of a door are the same place, which is not on screen.
  When the room is short what gives is emphasis -- an adverb, a determiner, a
  longer spelling of the same fact, or the line count -- never the fact itself,
  and inside one line scope ranks above parameters and both above emphasis. All
  48 boards were rendered and read out of the DOM rather than grepped: about
  2,500 titled elements, 1,600 of them with no visible text of their own, some
  380 distinct title strings, each tested against the seven floor items. Four
  fixes on seven boards. The sweep run record regains its pass cap as "Louvain,
  seed 42, 20 pass cap, 200 nodes" at 231.3 px, one line in the inspector's
  235 px band and two in the panel card's 217, chosen over "20 passes" because
  a cap is not a count. "Selection only" is drawn in words on four Style boards
  at 109.5 px a segment, ending a segmented control in which the shipped choice
  had a name and the unshipped one did not. The lone unshipped "Select all
  visible" on the time-slider board keeps its text and its tag. And the path
  block joins the legend's five channel words as "Outline: Find a path (shortest
  path)" and draws its domain as four numbered stops with "Path order source to
  target", retiring the last two-endpoint domain string in the set. One
  corollary is added from 6.8: an unshipped control is never icon-only when it
  stands alone or when its siblings in the same segmented control carry words.
  Four residuals are recorded rather than half-fixed, led by the Arrangement
  quick-pick, whose three capability names need 232.1 px inside a 217 px track.
  (3) One inspector title row, decided once and applied to all 40 boards that
  draw an inspector. Measured first, and the defect was drift rather than
  clipping: seven trailing-cluster inventories, two right paddings, three
  left-group gaps, two cluster gaps, five leading glyphs and six name bands
  (141, 145, 169, 173, 195, 197), with exactly one board actually rendering
  truncated. The row is 36 px with right padding 8, so its cluster ends at
  x = 272 where every section header's trailing glyph already ends. The left
  group is the kind at 12 px 500, which never truncates, then the identity at
  11 px, which is the half that gives, with 6.3's ladder installed as a
  mechanism rather than a patch (min-width 0, ellipsis, the full string in the
  title). The leading glyph is deleted, and that deletion is what buys the fit:
  it had five spellings and no rule saying which kind gets which, on three
  boards it was the register's pin verb drawn non-interactively in the same row
  as the real Pin as A, on 32 it was the top bar's own inspector rect drawn grey
  and unclickable 900 px from the blue one, and it cost the 22 px that make all
  40 name pairs fit. The trailing cluster is three slots in one order -- Copy
  reading, Pin as A, Toggle inspector (D), with Close (Esc) instead of the third
  on the iPad overlay -- and nothing else is ever in that row: no overflow
  kebab, because four icons is 108 px of cluster and 139 px of name, and no
  Coming tag, because one tag belongs to one control and a surface header is not
  one. Three name bands remain (167, 195, 223), each decided by the row's own
  state, and 0 of 40 clip. Copy reading moved up into the title row on nine
  boards and was added new to seven, Pin as A was added to the data table
  drawer, Toggle inspector to the multi-selection board, and one verb drawing --
  the 12 px closed disclosure caret the row actually uses, against the register's
  rect -- is registered as its own row, one verb in two positions on one
  binding. Four residuals are recorded, including the two title-row questions
  that belong to the vocabulary and to the result shape rather than to this row.
  Section 12 gains one risk and loses none of its questions, since this revision
  answers none of them, and it closes 1.7's risk that two spec numbers were
  doing similar work. 21 changes.
- 1.8 (2026-09-07): two changes, applied against revision 1.7. (1) The pop-over
  decisions. 6.11 gains a governing test that decides a single control rather
  than a surface and is applied before the three questions -- a control goes
  behind a door when it sits at a default most instances never leave AND the
  row it leaves behind can still report whether this instance left it, both
  clauses or neither -- with the three refuted single-property versions
  recorded so they are not re-derived, and with one veto written as a new
  subsection 6.10a for the class of control whose wrong value is invisible
  until it does damage. A fourth question separates a pop-out from a collapsed
  section by what a door buys that a section cannot, a fourth obligation fixes
  the depth at exactly one click from the row that owns the property, and the
  stub becomes drawable in two inks. The Anchor paragraph is replaced by one
  rule for every transient surface -- one axis carries the gap, the other a
  shared edge line with the opener's anchor box, and clearance is bought by
  sliding before flipping before dropping a width rung before going centred --
  with seven families, two gap constants (8 beside a shell boundary, 12 in the
  canvas overlay), a 6 px caret, a scroll rule that docks and offers a way back
  instead of freezing at a pixel, five correct anchors cited by pixel, and the
  iPad's sheet named as the place the rule does not apply. Regions become five,
  a dialog and a dock among them; the pin narrows to four comparative surfaces;
  a confirm becomes a governed surface and a cost gate stays inline. Each
  activity's resting state in 5.3 is rewritten to the accepted split with its
  pop-over inventory named -- Present 28 rows to 10, Style 24 to 14, Analyze 18
  to 14, Explore 14/23/17/14 to 10/20/13/11, Data 19 to 17, AI six supporting
  blocks to two door rows, Settings > Performance about 33 to about 25 -- with
  the refusals argued rather than asserted, including the "+ Analysis"
  catalogue, which stops being called a popover. The report editor becomes a
  non-modal bottom drawer and the ? reference a non-modal overlay, resolving a
  standing dialog conflict; 6.4 gains the door index and 6.9's Rule 11 a second
  escape hatch. (2) The legend decisions. Floor item 5 splits into an export
  obligation and a screen obligation, without becoming an eighth item: every
  exported image carries a legend composed from the encoding model at export
  scale, and the canvas legend carries channel, attribute, endpoints, median or
  midpoint, the scale in words and every departure line. Three unconditional
  cuts replace three conditional rules -- the state-row block leaves the canvas
  for the exported legend and Help, category counts leave for the groups table
  and the export, and the canvas categorical block caps at five plus Other with
  the coverage footer on the Other row -- the on-screen cap goes 334 to 240,
  Compare draws shared channels once, and the compact drawer form stops being a
  separately specified component. The deciding fact is checked in the code and
  recorded in 5.8: the export is a Babylon scene capture and the legend is a
  DOM overlay outside it, so no exported image carries a legend today and none
  can carry the DOM one. Section 9 gains fourteen artboards (PresentCompact,
  ImageOptionsPopout, ExportLegend, RampPopout, AllStatistics, RunRecordPopout,
  AnalyzeParameters, ColumnRolePopout, ReportEditorDrawer, AiPanelCompact,
  NoteEditorPopout, FilterExpression, ShortcutsOverlay, KeepAdvancedOpen),
  taking the set from 48 to 62, and one clause requiring every worked example
  to be drawn open before the anchor rule is called validated; section 12 gains
  nine risks; the floor stays seven items with one split in two and one
  subsection added. 52 changes.- 1.7 (2026-09-06): five changes, applied against revision 1.6 and its
  compaction system. (1) The import flow becomes a stated state machine in 5.3
  Data: two decision tables before item 0, the seven-clause entry list restored
  to the title row with "evaluate from the end, first match wins", the two
  numbers' division of labour stated in one place, the recognition banner
  rewritten as a floor item 3 run record with Details and a reversible "Map it
  myself", symmetric arithmetic on every Load option, item 8 expanded into the
  parse-error state, and one paragraph defining Cancel, the primary button and
  the seven reopen paths with their scroll targets. 6.9's Rule 8 is closed
  against the reasoning that deleted the clause: a trigger is not an
  explanation. (2) Pop-outs get section 6.11 and a place in section 6: 6.2's
  tier 3 splits into 3a pop-out and 3b dialog, the ten row types of 6.9 gain a
  pop-out to render in and no eleventh shape, RT-8 gains the door form, the
  width ladder is 280 / 360 / 480, and eleven candidates are decided in a
  worked-examples table -- including two refusals, the attribute profile and
  the notes list, both on floor item 7, and one reclassification of five verbs
  into a menu. (3) Save and load get one convention across ten kinds in a new
  "Saved things" paragraph in 5.3: a library section per kind whose row click
  applies, a resident plus for `Save as <kind>...`, Import and Export in the
  section overflow, `Load` retired, a destination line on every Save dialog,
  overwrite never implicit, and Settings > Data management as the housekeeping
  list -- with section 3's Present rule and section 11's project-file deferral
  both left standing and sharpened rather than reopened. (4) Analysis as style,
  the largest change: the run becomes the object and the result card and the
  style layer become two faces of it, 5.3 Analyze and 5.3 Style are rewritten
  to agree, the result shapes table gains Writes and Layer columns showing that
  six of thirteen make an encoding layer, four make a highlight layer and three
  make none, the run record and caveats and reading travel with whichever face
  is on screen, and a layer's Source parameters are live with Analyze's own
  three cost bands as the gate. (5) The navigation cluster becomes a
  bottom-centre canvas toolbar in 5.6, 246 x 36 desktop and 274 x 40 below 1280
  px, with the collision against the time slider and the data table drawer
  resolved as four offsets (12 / 82 / 272 / 342), a 520 px canvas clamp, a
  two-line minimap and legend state below 622 px, and no pointer modes -- the
  touch marquee gap is closed by the one-shot verb "Select a region" instead.
  Section 9 gains eight artboards (ImportFlow, ImportParseError,
  ValidationPopout, GroupProfilePopout, StyleLibrary, SavedItems,
  StyleFromAnalysis, CanvasToolbar), taking the set from 40 to 48; section 12
  gains five open questions and nine risks; the floor in 6.10 stays seven items
  with two of them clarified. 108 changes.
- 1.6 (2026-09-05): the compaction system applied. Revision 1.5 was
  text-heavy after five passes because every pass cut sentences and none
  changed the shape of a row, so 1.6 replaces the anatomy rather than the
  copy. New sections: 6.9, the ten row types, the 16 + 108 + 8 + 108 + 8 + 24
  + 8 = 280 grid, the 24 px field, the 32 px pitch, the 14 px in-field glyph
  slot and its scrub, and the twelve rules that route any piece of information
  to exactly one row type; and 6.10, the seven-item floor that vetoes all
  twelve. Two decisions were taken explicitly. Decision A: the Analyze panel
  stops being an index of the product and becomes an index of the graph in
  front of you -- results, a Suggested group of three to five, and one "+
  Analysis" row, with the 26-card catalogue one click behind it in a
  question-first picker whose rows carry the full one-line description, and
  with 6.4 satisfied by three named routes (the picker, the palette, the
  Insights strip). Decision B: both names render on first mention per surface
  and on every string that leaves the app, the primary name alone on repeats;
  6.3 governs and states it, and the earlier allowance letting a technical
  name wrap under 320 px is replaced by the info circle. Rules 3 and 5 rewrote
  the labelled rows of 5.3 and 5.4; Rules 6, 7 and 9 rewrote what Analyze,
  Style, Explore, Data and Present show at rest; Rule 11 added Settings >
  Appearance > "Show labels on controls", default off, recorded in 5.3
  Settings and in the memory rule. Section 9 gains the Analyze picker
  artboard and rewrites the Analyze panel detail board; section 12 gains the
  nine open risks the system carries, led by glyph literacy, the invisible
  scrub affordance, discovery loss in Analyze, and hover-only actions
  stranding keyboard and touch users. Three artboards were rebuilt first as
  prototypes of the system and are accepted: StylePanel, whose visible word
  count fell 74 per cent; AnalyzePanel, 77 per cent; and ExplorerExpert, 52
  per cent -- the smallest of the three because it is a result screen, where
  the floor bites hardest and the cut is anatomy rather than copy. 25 changes.
- 1.5 (2026-09-05): the ratified outcome of nine design passes against
  revision 1.4 -- eight defect fixes, XR, info circles, compact icons, four
  minimalization passes (core, data, expert and navigation screens) and three
  navigation-path passes (novice, analyst, data). 118 changes.
  The eight defect fixes: one treatment for a subtle panel action, with the
  binding in the tooltip and in exactly three other places (5.6); cost classes
  made internal, with the estimate in three bands beside Run (5.3 Analyze,
  section 8); each fact once in the Import options dialog (5.3 Data); a unit
  family on the Time role, with one substitution table driving every time
  string (5.3 Data, Explore, 5.1, 5.4); one import dialog in four states whose
  title row says why it opened, with six triggers and seven reopen paths (5.3
  Data, 5.5); render thresholds measured by a first-run probe rather than
  typed (5.3 Settings, section 12); a metric that has not been computed made a
  pickable encoding in every attribute list (5.4, 5.3 Explore and Analyze);
  and two duplicate controls resolved -- Zoom to selection leaves Explore for
  the inspector, and Cancel during loading is never tagged Coming (5.3
  Explore, 5.8).
  New sections: 5.9 XR, a viewing mode with its scope table, entry sheet,
  navigation and selection model, comfort budget and return contract, with its
  element dependencies in 5.8, six refusals in section 11 and five open
  questions in section 12; 6.7 the Explanation rule, where taught text may go
  behind an info circle and reported text may not, with the circle defined as
  a control and Settings > Appearance's "Show help text in place" as its one
  master switch, default off; 6.8 the Icon rule, with the label-first test,
  the four things every icon-only control carries, five homes, the never list
  and the novice exemptions.
  Minimalization: one fact, one region (5.1); zero, null and default rows not
  drawn, and header counts only when a section is collapsed or truncated
  (6.2); legend and status bar hygiene (5.1); the inspector graph summary and
  node inspector stating each fact once (5.4); the run record collapsed to one
  line with a Details chevron (7.5); one result body on screen at a time (5.3
  Analyze); config keys behind a switch and the canonical pair rendered on one
  line (6.3); and the time slider with one settings home (5.3 Explore).
  Navigation: the sample blurb's closing hint loads and runs (7.1); a result
  applies its own primary encoding from every route (5.3 Analyze, 6.1, 7.3);
  the palette's index holes closed and an Attributes group added (5.5); step
  and History row titles made links, with Undo a split button (7.4, 5.1); the
  Insights strip made recoverable and added to the F6 ring (7.3, 5.6);
  Shift+backtick added and backtick made provider-aware (5.6, 5.3 AI); a
  Rankings summary card, Save as recipe, set replacement and report defaults
  (5.3 Analyze, Present, Explore, 7.1); and the data worker's five moves,
  including the status bar layout menu and the auto-picked join key (5.1, 5.3
  Data). Section 9 gains one artboard, Explorer loaded subset, and records the
  four import rows as four states of one dialog.
- 1.4 (2026-09-04): third validation pass against 39 artboards, 25 workflows
  and 12 personas. 24 spec changes: Compare mode over a second file (Run on
  A/B/both, namespaced results, Biggest differences, positions rule),
  not-connected path result, node type role, ego network hops, bipartite
  projection and hold-out evaluation homed, removal impact direction-aware,
  node merging cost class, temporal analysis cost, share menu, Help more
  suggestions, label cap reconciled.
- 1.3 (2026-09-04): decisions applied from the analysis 2 review: Cytoscape
  persona and workflows adopted; large graphs warn and allow; Coming tags
  with parallel engine work; collections, parallel edges, RDF and public
  database queries deferred to later phases; label order, drawer, and
  recipes confirmed; domain vocabulary generalized.
- 1.2 (2026-09-04): analysis pass 2 (scale, experts, Cytoscape genomics,
  navigation, package gaps, annotations, data cleaning, expert layouts and
  paths). 212 changes. Includes the package gap pass: view mode homed in the
  navigation cluster, layout selector rebuilt on registered engines, edge
  properties restored, Analyze Method selects and Advanced group, new result
  shapes, option-kind and cost-class rules, implementation status section
  5.8; and 21 cross-track contradictions resolved as recorded in sections 3,
  5.6 and 5.8.
- 1.1 (2026-09-04): 27 changes from the validation pass against 19 workflows
  and 11 personas. Finding ids F03..F88 in the workflow result.
- 1.0 (2026-09-04): first draft.
