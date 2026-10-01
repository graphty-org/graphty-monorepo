# The object-first screen generator

One generator draws every mock of the object-first design, so all the mocks share one chrome.
Since round 4 that chrome is the frame of `design/ui/object-first-ux/round-4/revision-round-4.md`
(the rail, the icon-only toolbar, the view-mode button, the command palette), measured against
`design/ui/object-first-ux/visual-language.md`; the round-2 and round-3 documents
(`round-2/revision.md`, `round-2/screens.md`, `round-3/revision-round-3.md`) describe everything
else. A screen is a plain JavaScript object (a spec) in `screens/screen-N.mjs`;
`render.mjs` turns it into HTML; `build.mjs` writes the HTML and a screenshot for each spec to
`design/ui/object-first-ux/mocks/v2/`, plus the gallery (`index.html`). Screen 11 is the toolbar
reference sheet (`page: "reference"`). Screens 14 and 15 are the two dialogs (`overlays.dialog`).

Every shared part of the chrome is drawn by exactly one function in `render.mjs`: the file
header, the rail, each rail panel, tree rows, the count text, state glyphs, Style chips, the canvas, the
toolbar, a flyout, the secondary bar, a popover, the legend card, the dock, the transport bar, the
inspector header block, the tab strip, each row type, the status bar and the caption. The
toolbar is drawn from the one definition in `toolbar.mjs`. Three drawings are baked once and
shared: `karate.mjs` (34 nodes, 78 edges, with DEGREE, BETWEENNESS, PAGERANK and the four
Louvain groups), `football.mjs` (115 teams, 613 games, conferences, betweenness) and `email.mjs`
(the invented Email network's in-window slice: 412 nodes, 1,910 edges, nine communities); the
last two are written by `make-graphs.mjs`. Palettes live in `palettes.mjs`; what the College
football screens share (the Conference grouping, its legend, the Dataset inspector) in
`football-state.mjs`. All CSS is `design/ui/object-first-ux/mocks/kit.css` (the round-1 kit,
extended at the end under "Round-2 additions" and "Round-2, pass 2"); the icon sprite is read
from `mocks/kit.html` at render time. A screen contains no `<style>` element.

## Files

| File | What it is |
|---|---|
| `render.mjs` | `render(spec) -> html`, `renderToolbarReference(spec) -> html`, and the part functions |
| `toolbar.mjs` | `TOOLS` (every control, its chevron, key, tooltip name and sentence, flyout rows, dividers, the Time and Actions buttons, the mode button), `MOVED` (tools that left the bar and their new home), `SECONDARY` (the trimmed bar per tool), `FACES`, `geometry({ time })` (each control's x offset; the bar is 465 px, 505 with Time) |
| `karate.mjs`, `football.mjs`, `email.mjs` | a drawing each: `NODES` (id, x, y, label?) in a 1000 x 760 box, `EDGES`, `DEGREE`, `COMMUNITIES`, `BOX`, plus value maps |
| `make-graphs.mjs` | writes `football.mjs` (from `design/ui/object-first-ux/gen/football.json`) and `email.mjs` (seeded generator) |
| `palettes.mjs` | `OKABE_4`, `OKABE_8`, `TOL_MUTED`, `VIRIDIS`, `TWELVE`, `HIGHLIGHT`, `OVERRIDE`, `OTHER` |
| `football-state.mjs` | the Conference grouping's fills, tree row, legend block and strip chip; the Dataset row and inspector |
| `build.mjs` | writes `mocks/v2/screen-N.html`, screenshots `screen-N.png` (the frame plus the 60 px caption; a reference page full-page), writes `index.html` |
| `screens/screen-14.mjs`, `screen-15.mjs` | the Import dialog and the reload dialog: `overlays.dialog: { title, rows, footer }`, the kit's 480 px dialog centred over a scrim, rows from the row vocabulary |
| `screens/screen-N.mjs` | one spec per screen, `export default {...}`; screen 3 also exports its `STATE` for screen 12 |

Build everything: `node design/ui/object-first-ux/gen/build.mjs`. Build one screen: `node
design/ui/object-first-ux/gen/build.mjs 2`. Playwright is loaded from the repo's `node_modules`
(Chromium headless with `--use-angle=swiftshader`); no other dependency.

The committed `mocks/v2/*.html` are this generator's output: after a full build, `git status
design/ui/object-first-ux/mocks/v2` shows no changed HTML unless a spec or `render.mjs` changed.
Run `make-graphs.mjs` before `build.mjs` only when `football.json` or the email seed changes.

## The frame

1440 x 900 by default (`frame: { w, h }` on a spec changes it): the rail 56 plus its 1 px edge
(57), the left panel 240, the canvas 902, the inspector 240 plus its 1 px edge (241), the status
bar 24 across the bottom. The canvas column is the stage
(the graph and its overlays), then an optional transport bar (40) and an optional open dock,
then the dock handle (32); the graph is fitted to whatever stage height is left. The toolbar
(48 tall) floats 12 px above whatever is under the stage; the secondary bar, a flyout and the command
palette sit 8 px above it. Below the frame, a 60 px caption bar. The theme
is set on `<html data-theme>`; the canvas greys, ink and halo are CSS variables, so one HTML
serves both themes, and a colour given as `"ink"` anywhere (a chip, an outline, a legend line)
is the theme's outline colour (#1e1e1e light, #ffffff dark).

## The spec, key by key

```js
export default {
  id: 2,                         // -> screen-2.html / screen-2.png
  title: "Loaded, nothing selected",
  theme: "light",                // "light" | "dark"
  file: "Karate Club",           // the dataset name in the left header; null -> "graphty" (nothing loaded)
  frame: { w: 1440, h: 900 },    // optional

  rail: { dots: ["objects"], hover: "data", open: "help", tip: "data" },   // optional, see "Round 4"
  left: {
    panel: "objects",            // "objects" (default) | "data" | "styles" | "views" | "ai": the active rail item
    objects: { disabled: false, rows: [ /* tree rows, see below */ ] },
    views: { rows: [{ name: "Overview", current: true, drift: false }] },  // drawn only when panel is "views"
    data: { rows: [ /* row types */ ], foot: [{ label: "Open table", key: "Shift+T" }] },
    styles: { rows: [ /* row types */ ] },
    ai: { scope, turns, composer, privacy },
  },

  canvas: {
    graph: "karate",             // "karate" (default) | "football" | "email"; false -> no graph SVG (screen 1)
    nodes: {
      default: { fill: "#e69f00" },      // omitted -> the theme's node grey
      sizeBy: "degree",                  // or { values: {id: number}, from: 0.8, to: 2.4 } (multiples of the 6 px base)
      colorBy: { values: PAGERANK, colors: VIRIDIS },   // a ramp over a value map
      byId: { 34: { fill: "#d55e00", r: 9, halo: true, label: true,
                    outline: { color: "ink", width: 2 } } },   // outline may be a list, outermost last
    },
    edges: {
      default: { width: 1 },
      byPair: { "3-33": { stroke: "#7b3294", width: 3, dash: "6 4", arrow: true, opacity: 1 } },  // "a-b", a < b; an arrow stops at the target's edge
    },
    labels: [34, 1, 33],         // node ids that carry a label (the module's label, else the id)
    overlays: {
      welcome: { heading, samples: [{ name, size }], recent },
      legend: { blocks: [{ title, note, rows: [{ chip, label, count } | { line: {color,width,dash}, label, count } | { more: "and 4 more" }],
                          ramp: { colors, from, to }, size: { from, to } }] },
      marquee: { x, y, w, h },
      cursor: { x, y, icon },
      popover: { title, rows: [ /* row types */ ], footer: [{ label, primary }],
                 left|right, top|bottom, caret: "bottom" | "left" | "right", caretAt,
                 anchorRow: "Bridges" },   // or: open beside that row of the open flyout (to its left, caret on the row)
      transport: { window, playing, speed, from, to, ticks: [0..1], changes: [0..1], band: [0..1, 0..1], counts, gearPressed },
      dock: { open: false, disabled: false, tab: "Table", height: 320,
              table: { tabs: [{ label, selected }], showing, columns: [{ label, width, sorted, chip }], rows: [[...]], selectedRow, scrolled: 0..1 } },
    },
  },

  toolbar: {
    active: "select",            // the pressed tool when nothing is armed
    armed: "rank",               // the armed tool (brand fill); implies a secondary bar
    disabled: false,             // true -> every tool but Select at 30 percent
    mode: "2D", xr: true,        // the view-mode button's face; xr: false leaves VR and AR out of its menu
    modeMenu: true,              // the view-mode menu open above the button
    time: true,                  // the Time button: false | true | "on" | { on, columns, say }; default: "on" with a transport bar, shown for "Email network"
    palette: { query, scope, sections: [{ title, rows: [{ icon, label, note, key, active }] }] },  // the command palette open (Actions blue)
    tip: "rank",                 // that control's tooltip (name, key, sentence) drawn above it
    openFlyout: "rank", flyoutPressed: "Bridges",      // the open flyout and the row whose "..." is pressed
    faces: { rank: "Bridges" },  // per-tool face overrides (fresh-session faces are in toolbar.mjs)
    costs: { Bridges: "about 2 s" },                    // per-row cost overrides
    secondary: { tool: "rank", variant: "Bridges", scope: "what is showing", count: "115", cost: "about 2 s" },
  },

  inspector: {                   // or { empty: "Nothing loaded" }
    kind: "Dataset", name: "Karate Club", sub: "id 1",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],   // default: eye (on), lock, more
    chip: { type: "locked" },
    summary: "karate.gml, GML",  // or { text: "Computing 42%", cancel: true, note: "sampling" }
    reading: "34 nodes joined by 78 edges in one connected part",       // null -> the row is left empty
    tabs: ["Overview", "Layout"], tab: "Overview",
    framing: "100%",             // the pill: the framing name in 3D, the percentage in 2D; the status bar mirrors it (default "100%")
    rows: [ /* row types */ ],
  },

  status: { counts: { nodes: 34, edges: 78 }, mask: { text, exit: true }, computing: { text, cancel, gpu },
            stale: "3 stale", layout: "Spread out: settled", tool: "Rank: Bridges", selection: "11 selected",
            xr: "VR", zoom: "100%" },

  caption: { title: "Screen 2 of 13: loaded, nothing selected.", text: "Look at: ..." },
};
```

A reference page: `{ id: 11, page: "reference", title, heading, intro, fit: { width: 1280,
text, legend }, stripsText, strips: [secondary specs], popover: {...}, foot, caption }`.

### Rules the chrome applies on its own

- **The legend hides while a flyout or a popover is open** on the stage (a transient overlay
  wins the corner) and lifts 48 px while the secondary bar shows. With a legend on, the graph is
  fitted to the left of the card, so no node sits under it.
- **A flyout in the app frame draws only registered rows**; proposed rows (at 50 percent, with
  their issue number) appear on the reference page only. A `{ divider: true }` entry is a rule.
- **A name "Communities (Louvain)" is a plain name and a technical name.** The tree row draws
  the technical part in secondary text after the plain name, when it fits; the inspector header
  puts it on the kind line ("Measure  Betweenness" over "Bridges"). `tech` on a row or the
  header overrides the split.

### Tree rows (`left.objects.rows`)

```js
{ kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" },
  expanded: true, children: [ ... ] }
{ kind: "set", name: "Degree > 8", nodes: 5, chip: { type: "ring", color: "ink" } }
{ kind: "path", name: "Path: 12 -> 30", nodes: 6, edges: 5, chip: { type: "line", color: "#7b3294", width: 3, dash: "3 2" }, selected: true }
{ kind: "measure", name: "Connections (Degree)", values: 34, chip: { type: "size" } }
{ kind: "measure", name: "Bridges (Betweenness)", state: "computing", progress: 42, selected: true }
{ kind: "measure", name: "How far from everything", state: "waiting", runLabel: "Run (4 min)" }
{ kind: "grouping", name: "Communities (Louvain)", groups: 4, chip: { type: "strip", colors: [...] }, expanded: true,
  children: [ { kind: "group", name: "Group 2", members: 11, chip: { type: "swatch", color: "#d55e00", override: true }, selected: true } ] }
{ kind: "more", name: "4 more (Other)", members: 36, chip: { type: "swatch", color: "#b3b3b3" } }   // collapsed, with a caret
{ kind: "suggestion", name: "Find groups", key: "G", icon: "group" }   // the three rows under a fresh Dataset
{ kind: "verb", name: "Open a file..." }                                // the rows before a load
```

Row flags: `selected`, `childSelected` (the paler fill; set automatically on children of a
selected row), `hover`, `eye: false` (hidden), `locked`, `state` (`current` | `computing` |
`waiting` | `stale` | `failed` | `frozen`), `progress`, `queued`, `runLabel`, `approximate`,
`tech`.

The count is formatted by one function from the kind: the Dataset row carries no count (the
status bar and the welcome list draw "34 nodes  78 edges" through the same function); a node
Set "5 nodes"; a Path "4 edges" (an edge Set counts its edges); a Measure "34 values"; a
Grouping "4 groups"; a Group "12". Thousands get a comma. The technical name is never drawn in
the tree; it is the row's `title` tooltip and the inspector's kind line. The state glyph is one function too: a progress ring in the count slot
(computing), a hollow circle and a small Run button (waiting), an amber dot after the name and the
name at 50 percent (stale), a red dot (failed), a snowflake (frozen).

**At 240 px a row's parts yield in a fixed order** (kit.css, "Tree rows at 240 px"): the
technical name drops first, then the count drops its parts from the right ("1,204 nodes  5,830
edges" becomes "1,204 nodes"), and only then does the plain name get an ellipsis. A part is shown
whole or not at all. The count sits at the right, against the chip. The eye and the lock appear
on hover (`hover: true`) and when they carry state (hidden, locked), never merely because the
row is selected; the inspector header carries the same two buttons.

### Chips

`{ type: "swatch", color }`, `{ type: "ring", color }` (white with a 2 px ring), `{ type: "locked" }`
(grey with a lock), `{ type: "ramp", colors: [...] }`, `{ type: "strip", colors: [...] }` (hard
bands), `{ type: "size" }` (small-to-large dots), `{ type: "line", color, width, dash }`. Flags:
`override: true` (a small dot), `faded: true` (50 percent, a covered object). A colour may be
`"ink"`.

### The row-type vocabulary (`inspector.rows`, `popover.rows`)

Every row is 32 px unless noted. A screen composes a tab from these and nothing else. Rows with
a label use the 68 / 140 grid; `wideLabel: true` makes it 96 / 112 ("Show the largest"); on a
`switch`, `wide: true` gives the label the whole row with the switch at the right.

| Type | Keys | Draws |
|---|---|---|
| `keyValue` | `pairs: [{ label, value, note, action, info, chevron, secondary, wide }]` | one or two label/value pairs in the 88 / 88 columns; a pair with an `action` link, a `note` ("rank 3 of 34"), a `chevron` (navigates) or `wide` spans the row; `info` adds the (i) glyph; `secondary` draws the whole pair in secondary text |
| `select` | `label, value, ramp \| strip: [colors], note, gear, disabled, actions, wideLabel` | a label and an outlined select; `ramp`/`strip` draws the palette itself as the select's face (the name in its tooltip); `note` puts secondary text after it; `gear` adds a settings button; `actions: ["eye","minus"]` puts row actions after the control |
| `number` | `label, fields: [{ caption, value, suffix, disabled, button }], actions, wideLabel` | one or two inputs that share the control column; with captions and no label the row is the kit's 50 px two-column row ("Values from [0.010] \| to [0.101]"); a field's `button: "dice"` adds an icon button after it |
| `swatchHex` | `label, color, hex, opacity, override, actions` / `label, color, value` / `label, color, inherited: "Communities", lock` | a paint row led by its channel name: with `hex`, the chit, hex and opacity field; without, the chit alone ("Missing [chit]") or with a `value` ("Outline [chit] 2 px"); `inherited` is the read-only "From Communities" row |
| `groupSwatch` | `name, count, color, override` | "[chit] 4  12": the group's chit (with the override dot), name, count |
| `attribute` | `dtype: "text" \| "number" \| "time", name, filled, role` | "[type glyph] sent  100%  ..."; the time glyph is filled when the column carries the role |
| `block` | `label, chip, summary, open, actions` | an encoding block header ("Colour [ramp] ... v"; "Size  0.8x to 2.2x  >") |
| `segmented` | `label, options, value` | a label and a segmented control filling the row |
| `checkbox` | `items: [{ label, checked }], button` | one row of checkboxes and an optional text button (drawn as link text) |
| `switch` | `label, on, note, wide, caption, second: { label, on } \| { label, select }` | a switch; two switches on one row with `second: { label, on }`; a switch beside a select (`second: { label, select }`) is the 50 px captioned two-column row; `caption` adds a wrapping secondary line under the row |
| `button` | `label, buttons: [{ label, primary, ghost, focus }]` | secondary buttons by default; `primary` is filled |
| `link` | `text, chevron, secondary` | a navigation row with a chevron-right ("All 23 attributes >") |
| `table` | `columns: ["1fr", "40px"], head, rows: [[...]], selected` | compact ranked rows; `selected` tints one |
| `emptyPlus` | `title, summary` | a 40 px section header whose only action is "+" (an empty Findings or Notes section) |
| `section` | `title, count, plus, actions` | a 40 px section header ("Nodes", "Edges") with an optional "+" |
| `disclosure` | `title, summary, open` | a collapsed section: the title, its one-line summary in secondary text, a chevron |
| `text` | `text, secondary` | one 32 px line of secondary text ("Covered by nothing") |
| `note` | `text` | a wrapping paragraph of secondary text (16 px lines, 8 px padding) |
| `progress` | `label, value, cancel` | a label, a 4 px bar and Cancel |
| `legend` | `label, colors, from, to` | a 208 x 14 preview strip with end labels (about 1.5 rows) |
| `histogram` | `bars: [0..1], scale` | a 208 x 40 bar chart with a lin/log switch (two rows) |
| `chips` | `title, chips: [{ chip, label }]` | a header row carrying chips inline ("Member of") |

### The toolbar (`toolbar.mjs`)

`TOOLS` is the bar left to right: `{ id, icon, key, chevron, tip (the name), say (the tooltip's
sentence), menuTip (the chevron's tooltip), flyout, target, foot, timeOnly }`, with `{ divider:
true }` and `{ mode: true }` entries. Every tool is 32 x 32 with no label; a chevron is 16 x 32,
1 px after it. A flyout row: `{ name, tech, kind ("set" | "measure" | "grouping" | "finding"),
cost, key, icon, face, dots, proposed, issue, check }` or `{ divider: true }`; flyout rows are 24
px. `SECONDARY[tool](o)` returns the trimmed bar (round-4 section 3.5) as parts: strings, `{ select
}`, `{ gear: true }`, `{ ghost }`, `{ button }`, `{ split }` (Create with its caret), `{ cancel:
true }` (the X). In a spec's own `parts`, `{ ghost: "Options" }` is drawn as the gear and `{ ghost:
"Create and focus" }` folds into the Create split button. `geometry({ time })` gives every
control's x offset and the bar's width (465, or 505 with Time). A spec naming a tool that left
the bar (`hand`, `neighbours`, `note`, `ask`) is drawn with its new home (`MOVED`): Hand is
Select's variant (Select's face shows the hand), Neighbours is Filter's "Around a node". The
reference page (screen 11) draws all of this from the same definition.

## Adding a screen

1. Copy `screens/screen-2.mjs` to `screens/screen-N.mjs` and set `id`, `title`, `caption`.
2. Describe the state from `round-2/screens.md`: the drawing (`canvas.graph`), the tree rows,
   the canvas paint (per node and per edge pair, or a value map), the overlays, the toolbar
   state, the inspector's header block and its rows from the vocabulary above, the status
   items. Colours and words come from the screen entry; positions come from the graph module
   and are never set by a screen.
3. `node design/ui/object-first-ux/gen/build.mjs N`, then look at `mocks/v2/screen-N.png`.
4. If a part is missing from the chrome, add it to `render.mjs` as one function and its CSS to
   the round-2 section of `kit.css`; never to the screen.

## Deviations from screens.md, on purpose

- The frame is 1440 x 900, as `screens.md` now says; the inspector has 18 rows of room under
  its header block.
- Screen 2's Direction row reads "Undirected (file)" rather than "Undirected, from file": with
  the label and "Change..." the longer text is 225 px in a 216 px row at 11 px.
- The inherited paint row reads "From Communities", not "Inherited from Communities" (151 px in
  a 122 px slot).
- Screen 7 uses the element's real nine-colour palette ("Nine Soft Colours", tol-muted) with
  "Show the largest" 8, because the doc's Tol vibrant has seven colours and cannot show eight
  groups; the overridden conference is 4, the fifth swatch row.
- Screen 9 selects BrighamYoung, not FloridaState: by the real betweenness of football.gml
  FloridaState ranks 25th and is not in the top-ten Set the screen shows it in.
- The "Weights | Direction" pair (a switch beside a select, 244 px on one line) is the kit's
  50 px captioned two-column row.
- The waiting row's button reads "Run (4 min)": beside a 132 px name, "Run (about 4 min)" left
  the name unreadable; the name still gets an ellipsis, which is the 240 px panel's limit.

## Round 3 additions (screens 16 to 102)

Everything below is drawn by `render.mjs` with its CSS in the "Round 3" section at the end of
`mocks/kit.css`. `nav-place.mjs` and screen 83's light-menu helpers are gone: menus are dark
menus, and node positions come from `render.mjs`.

**Frame layer (above panels, dialogs and scrims), top-level spec keys:**

- `menus: [{ anchor | left/top, width, tag, rows, submenu }]` -- Figma's dark menu. Rows:
  `{ label, key, note, disabled, reason, danger, checked, sub, highlighted, icon }`,
  `{ divider: true }`, `{ heading }`. `submenu: { of: "<row label>", rows }` opens beside that row.
  `tag` draws a small dark label above the menu ("A moment before: ...").
- `insets: [{ tag, title, rows, footer, left, top, width }]` -- a second state of the same screen,
  drawn at full strength. Insets at the stage's left push the drawing right (like the legend) and,
  with a dialog open, move the dialog right of them.
- `tooltips: [{ lines | text, anchor }]` -- the kit's dark tooltip.
- **Anchors** (`anchor` on a menu, inset, tooltip or popover): `{ el: "file" | "pill" | "export" |
  "viewsMore" | "objectsMore" | "inspectorMore" | "mode-VR" | "tool-<id>" }`, `{ row: "<tree row
  name>" }`, `{ node: id }`, `{ inspectorRow: n }`, `{ dialogRow: n }`, `{ column: "<dock column>" }`,
  `{ sel: "<css selector>" }`, with `side` (below, above, left, right), `align` (start, center, end),
  `dx`, `dy`. A script at the page's foot places each float and points its caret.

**Chrome:** `fileState: { unsaved, menuOpen, loading }`; `pillOpen`, `exportOpen`;
`inspector.framing: { text, close }`; `inspector.tabsDisabled`; `inspector.footer` (a sheet's
footer bar) and `footerNote`; `summary: { tone: "failed" | "stale", action }`; `present: { pill }`
(Present mode: canvas only, the legend and the pill). Status bar: `limit` (amber), `error` (red),
`notice: { text, links, tone }`, `mask.link`, `xr: { text, exit: false }`. Toolbar:
`disabledTools: { VR: "reason" }`, `modePressed`. Secondary bar: `parts` (strings, `{ text,
secondary }`, `{ count }`, `{ select }`, `{ ghost, disabled }`, `{ button, disabled }`, `{ cancel }`,
`{ field, caret, width }`, `{ chip, removable }`), `SECONDARY` rank/groups/structure take
`scopeSelect`, filter takes `unit`, `of`, `createDisabled`; a popover with `carriesPrimary` dims the
bar's light button.

**Tree:** kinds `heading` (`count`, `select`) and `node` (`id`); flags `active`, `rename`,
`dragging`, `insertBefore`, `system`, `glyph` (any icon id, e.g. sparkle, focus, collapse, pin),
`badge`. `left.objects.find: { query, count }` turns the Objects header into the find field; a
Dataset row shows its progress ring while computing. Counts are singular for one.

**Canvas:** `positions: { id: { x, y } }`, `extraNodes: [{ id, x, y, links, label }]`, `camera:
{ zoom, center: id | { x, y }, pitch }`, `panes: [{ title, nodes, edges, labels, legend }]` (split
canvas). Node flags `hidden`, `focus` (keyboard ring), `pin`, `marker` (note), `callout`, `calloutAt`,
`shape` (box, diamond, cone, cylinder). `nodes.meta: [{ members, label, fill, r }]` and
`edges.merged: [{ from, to, width }]` ("m0" is meta node 0) draw a summary graph. Overlays:
`popovers: []`, popover `width`, `anchor`, `keepLegend`, `aboveScrim`, `noClose`; `tooltip`,
`drop`, `stageCard`, `minimap: { viewport, zoom }`, `rubberBand: { from, to }`, `exportFrame`.
Legend blocks take `widths: [{ width, label }]`, rows `shape`, ramps `mid` and `midAt`.
`nodeAt(spec, id)`, `nodesIn(spec, rect)` and `fitOf()` are exported.

**Dialogs:** `size: "sm"`, `tabs`/`tab`, `note` (footer left), footer buttons `{ disabled, danger }`,
`left`/`top`. Label column 112 px.

**Rows:** `field` (label, value, placeholder, suffix, icon, note, error, focus, caret, mono),
`radio` (items with notes), `textarea` (lines, mono, rows, caret, `error: { line, from, to, text }`,
`suggest`), `ruleLine`, `pattern`, `scatter` (points 0..1, brush, axis ends), histogram `band` and
`ends`, keyValue pair `was` and `tone`, `text`/`note` `tone` (error, warning, success),
`segmented` `fill`, `button` rows wrap when they would overflow, table cells may be objects
`{ text, link, icon, chip, buttons, secondary, tone }`, table `muted`, attribute `dtype: "formula"`,
`pressed`, `note`, chips `removable`.

**Dock:** `history: { rows: [{ icon, step, object, by, when, state, actions }], hover, note }`;
`assistant: { scope, turns: [{ who, text, tool, made }], composer, privacy }`; `chart: { type:
"line" | "alluvial", ... }` above the table; `footer: { link, text }`; table `showing: false`,
`search` (text or false), `searchCount`, `editCell: { row, col, value, error }`, column `menuOpen`.

## Round 4 (the rail and the icon-only toolbar)

Everything below is drawn by `render.mjs` with its CSS in the "Round 4" section at the end of
`mocks/kit.css`. It follows `round-4/revision-round-4.md` sections 2 to 5 and the measurements of
`visual-language.md` (sections 2, 5, 6, 7 and the checklist in 12).

**The rail** (`railHtml`): Objects, Data, Styles, Views, a separator, AI; Settings and Help as
32 px icon buttons at the foot. Each item is 56 x 56 with a 32 x 32 pill and a 9 px label; the
active item (`left.panel`) has the selected tint and brand ink. `rail: { dots: [ids] (the 5 px
notification dot), hover, pressed, open: "help" | "settings", tip: id (its tooltip, "Data
Alt+2", drawn to the right) }`. `rail.open: "help"` also draws the Help menu (Search
commands... Ctrl+K, Help, Keyboard shortcuts, Open sample, What's new) beside the button.
Anchors: `rail-<id>` (`rail-data`, `rail-help`).

**Rail panels** (`leftPanel`): the file header stays on top; under it a 40 px title row (the
panel's name, "+" and "..."; anchors `<panel>Plus` and `<panel>More`, so `viewsMore` still
works) and the panel's rows. `left.data.rows`, `left.styles.rows` and `left.views.rows` are
the row vocabulary (every row type above) plus three new ones:

| Type | Keys | Draws |
|---|---|---|
| `dataset` | `name, source, glyph, nodes, edges, hover, menuOpen, selected` | a Data panel dataset: glyph, name, its count (yields like a tree row), Reload and "..." on hover (anchor `datasetMore`), then its source line in secondary text |
| `paintOrder` | `kind, name, chip, channels: ["Colour", { name: "Size", lost: true }], eye, locked, selected, hover` | a Styles panel paint-order row: kind icon, name, the channels it holds (a lost one struck through), chip, eye (or a lock) |
| `view` | `name, current, drift, hover` | a saved view; in `left.views.rows` an entry with no `type` is a view too |

`attribute` rows also take `role: "time"` (a role chip) and `complete: 94` (a completeness bar
and "94%"). `foot: [{ label, key }]` pins a foot bar ("Open table  Shift+T"). `left.ai` is the
old dock Assistant object (`scope`, `turns`, `composer`, `privacy`; `empty: true` before a
provider is set), drawn as the AI panel; a dock with `assistant` is an error now. The dock's tabs
are Table and History.

**Toolbar extras:** `toolbar.modeMenu` draws the view-mode menu (2D and 3D with the 5 key, VR and
AR with "Showing >", a check on the current mode, a mode in `disabledTools` dimmed with its
reason; rows anchor as `mode-2D` ... `mode-AR`, the button as `mode`); `modeSubmenu: [rows]`
opens beside `modePressed`'s row. `toolbar.palette` draws the command palette (QuickActions,
529 x 354) and turns Actions blue. `toolbar.tip` draws one control's tooltip. Anchors:
`tool-<id>` (including `tool-time`, `tool-actions`), `chevron-<id>`, `mode`. A flyout opens
above its tool, left-aligned to it and kept inside the stage by the placing script
(`data-clamp="stage"`); a popover with `anchorRow` anchors to that flyout row.

**Frame coordinates.** Floats in the frame layer (`insets`, `menus`, `tooltips`) with an explicit
`left` under 720 are shifted right by the rail's 57 px (`shiftX`), because every round-2/3 spec
placed them against the old stage's left edge at x 240; anchors are better in new specs. Stage
coordinates (popovers, marquees, cursors) are unchanged; the stage is 902 wide.

**Also changed for the visual language:** the status bar has no "?" (Help is at the rail's
foot); the secondary bar is a light surface with elevation 200 and a filled Run; unselected pill
tabs are 450 and the selected one 550; a tree row's weight comes from its level (the root 600),
not from selection; flyout rows are 24 px; the left panel's edge is the translucent panel edge.

Screens edited for round 4 (they named something that left the frame): 82 (the dock Assistant,
now `left.panel: "ai"`), 64 (armed Neighbours, now Filter > Around a node), 30 and 100 (the VR
segment, now the view-mode menu's VR row), 53 (the Views list's "..." menu, now the Views
panel), 11 (the reference sheet's words).
