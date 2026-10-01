# Refined B skeleton: how to build a section

A clickable, layout-only skeleton of refined structure B, version 4
(`../study/structure-comparison/structure-b-refined.md`). One page, hash routing, and one file per
section. Open it at http://dev.ato.ms:9825/app-b/ (it fetches its fixtures and section files, so
it needs HTTP, not `file://`). `#/map` lists every section and state.

## Files

| File | What it is | Who edits it |
|---|---|---|
| `index.html` | the page: review bar, top bar, rail, left panel, canvas, toolbar, table dock, inspector, overlay layer | the shell only |
| `app.js` | routing, the frame, the frame-at-rest baselines, the review bar ("Where am I"), the site map, the section loader | the shell only |
| `lib.js` | the helpers below (`window.AB`) | the shell only; ask before changing a signature |
| `app.css` | frame layout, tree rows, overlays, review-only styles | the shell only |
| `sections/manifest.json` | the section ids, in load order | the shell only |
| `sections/<id>.js` | one section | its builder, and nobody else |
| `kit/` | copies of the gallery kit: `cm.css` (tokens), `kit.css` (the `k-*` components), `icons.svg`, `fonts/`, `fixtures.json`, and the Les Miserables and transfers drawings in `canvas/` | nobody: copy more drawings from `../kit/canvas/` if you need them |

A section writes only its own file. If you need something shared, write it inside your file
and say so in your report; do not edit `app.js`, `lib.js`, `app.css` or another section.

## Routes

`#/<section-id>/<state-id>`. With no state, the section's first state. `#/map` is the site map.
`#/` opens `graph-place`. States are part of the contract: other sections and the shell link to
the state ids in each stub, so keep them (you may add more), or report the ones you renamed.

## Registering a section

```js
registerSection({
    id: "inspector-node",            // the file name and the route
    title: "Inspector: one node",   // plain words; shown in the review bar and the site map
    region: "right",                 // where render() draws (below)
    rail: "graph",                   // optional: the rail place lit when this section IS the left panel or no left panel shows; otherwise the left panel's place is lit
    frame: { left: "graph-place/at-rest", dock: false, mode: "2d" },  // optional: what the other regions show
    closeTo: "graph-place",          // optional: where Esc and an outside click go (default: the left region's section)
    states: ["why-this-look", "data", { id: "valjean", label: "Valjean" }],
    render(el, state, ctx) {         // el is the region's empty container
        el.append(AB.inspector({ ... }));
    },
});
```

**Regions** (the element `render` receives):

| region | the container | default section |
|---|---|---|
| `left` | the left panel (below the top bar, right of the rail), a flex column | `graph-place` |
| `right` | the inspector column, a flex column | `inspector-nothing-selected` |
| `canvas` | the canvas (`k-canvas`: put the drawing in a `k-stage`) | `canvas-and-states` |
| `toolbar` | the floating toolbar dock at the canvas foot (a column: a bar above, then the toolbar) | `toolbar` |
| `dock` | the table dock | `table-dock` |
| `overlay` | a transparent layer over the whole frame, for menus, popovers and dialogs | none |
| `workspace` | replaces left panel, canvas and inspector; top bar and rail stay (the Data page, version history, comparison). Its header is `pageHead()` | none |
| `full` | replaces everything under the review bar (the start screen) | none |

**frame**: an object, or a function of the state returning one, naming what each other region
shows: `"<section-id>/<state>"`, or `false` to close that region (`left`, `right`, `dock`), or
`top: false` / `rail: false` to drop the top bar or rail. Regions you do not name show their
default section. `mode` is the graph's view mode, `"3d"` by default (graphty-element's default);
set `mode: "2d"` for a 2D state. Read it as `AB.route.frame.mode`: the toolbar's View icon and the
View flyout follow it. `dataset` names the fixture the header's project name comes from
(`"lesmis"` by default, `"transactions"`, `"doorEntries"`). Examples: the node inspector wants
`{ left: "graph-place/at-rest" }`; the Data page wants `{ dataset: "doorEntries" }` and sets
`rail: "data"` so the rail lights Data; an attribute inspector wants `{ left: "data-place/attributes" }`.

**ctx**: `{ state, region, section, fx, renderSection(ref, el), close() }`.
`ctx.renderSection("toolbar/at-rest", el)` draws another section inside yours (the selection bar
draws itself, then the toolbar under it). `ctx.close()` goes to `closeTo`.

**Stubs.** A section with no `render` is "not built yet". Where it is also a region's default
(`graph-place`, `inspector-nothing-selected`, `canvas-and-states`, `toolbar`, `table-dock`) the
shell draws its frame-at-rest baseline in `app.js` with a pink "Not built yet" banner; everywhere
else a placeholder card. Once your file has a `render`, it replaces the baseline everywhere. The
baseline is a starting point: read it in `app.js` (`baseline.left`, `.right`, ...) and outdo it.

## Helpers (`window.AB`; `h`, `icon`, `link` and `registerSection` are also globals)

Version 3 has **one helper per job** (spec section 2.5). If a section needs one of these jobs, it
uses the helper; a section-local copy of any of them is a defect.

### One per job

| job | helper | what it does |
|---|---|---|
| Tooltip | `tip(el, name, { key, second, label })` | The one tooltip: a light bubble 500 ms after the pointer arrives, at once on keyboard focus (`:focus-visible`), at once for a neighbor within 1 s of the last one hiding; Esc dismisses it; the pointer can rest on it; a 500 ms long press shows it on touch. The bubble is hidden from speech: `name` becomes the control's `aria-label` (unless `label: false`, for a control whose visible text names it) and `key` its `aria-keyshortcuts`, drawn as a key chip. `second` is a second line, only for a disabled reason or a modifier gesture ("Alt-click: show only this row"). "Undo (Ctrl+Z)" is split into name and key for you. A section may instead write `data-tip`, `data-key` and `data-tip2` attributes; the shell gives such an icon-only control its label after each render |
| Add | `plus({ label: "Add to Line", items, onAdd(item), go })` | The one "+", only in a section or list header (`section({ actions: AB.plus(...) })`). One item: adds it at once. Two or more: a dark menu, with a filter field past 15. None: returns `null`, so the "+" disappears. `go` sends it to a route instead (a picker section that draws its own menu) |
| Name a new thing | `createThenRename(rowEl, { onSave })` | A new item gets a default name and opens straight into rename, its name selected |
| Edit a value in detail | `popover({ anchor, title, body, foot, width, place })` | The one light popover: a title and an X; each change applies live; Esc or a click outside closes it; focus starts on the first field and returns to the anchor; the shell keeps the panels as they were (no redraw). Placement is automatic: left of the inspector, level with the anchor, for an anchor in the inspector; directly above the toolbar for an anchor in the toolbar or the selection bar. `foot` only when the popover creates something |
| A field in a popover or a body | `fieldRow(label, control, { popover })` | Label column 88 px in the inspector, 96 px in popovers; 24 px rows; 8 px gap; labels top-aligned. Never set your own label widths |
| Read-only block | `section({ title, collapsible: true, summary, key })` | Collapsible with a chevron and a one-line summary when closed, remembered per KIND in `key` (`why.node`, `data.run.made-with`, `notes.group`) |
| Editable block | `section({ title, editable: true, actions })` | Always open: no accordion in anything editable (`editable` refuses `collapsible`) |
| Nothing here | `empty(text, { verb, key, go or onClick })`, `noMatch(q)` | One gray line, the verb a link: "No notes. Add note (N)". A filter with no matches: `No match for "x"`. No icons, buttons or footnotes |
| A notice | `notice(text, { label, go or onClick })` | The one notice slot, owned by the shell: centered 8 px above the lowest bar (the toolbar, or the selection bar when it shows), 6 s, paused while hovered, at most one action. It returns an empty placeholder, so appending the result anywhere is harmless. A started run shows no notice |
| After a delete | `deleted("Louvain and 6 groups", onUndo)` | "Deleted Louvain and 6 groups" with Undo. Deleting never asks first |
| The one confirmation | `confirm({ verb, thing, loss, onConfirm })` | Only for what cannot be undone, which today is Forget all keys: "Forget all keys?", one sentence on what is lost, Cancel and the verb |
| A control the skeleton does not model | `flash(text)` | The same notice with no action |
| Needs graphty-element | `needsElement(reason)` | The one design-note chip, placed after the control it qualifies; the reason is its tooltip |
| An open question | `openQuestion(text)` | The same chip, worded "Open question" |
| A menu | `menu({ anchor, place, label, items, back })` | A dark menu. Item: `{ label, shortcut, go or onClick, sub, check, disabled: true or "reason", desc, needs: "reason", toggle: [label when on, label when off], on }`, `{ sep: true }`, `{ heading }`. One line per item: `desc` becomes the item's tooltip; a second line only says why an item is disabled. `needs` draws the item disabled with the chip, and "Hide design notes" hides it. Keyboard: Up, Down, Home, End, typeahead; Right or Enter opens a submenu, Left closes it (goes to `back`); Esc closes one level; hover opens a submenu after 200 ms. Disabled items stay focusable |
| A menu that is not a route | `openMenu(anchor, items, { search })`, `closeMenu()` | The "+" menu uses this |
| A command | `cmd(id, extra?)`, `COMMANDS` | A menu item from the one command table (below) |
| Several choices | `seg([[value, label, extra]], value, onChange, { label })` | A segmented control for 2 to 4 short options: one Tab stop, arrows move and select |
| The canvas toolbar | `toolbarButton(icon, name, { key, popup, pressed, open, disabled, go, onClick, tool })`, `toolbarBar(items, label)`, `mainToolbar()` | 32 px icon buttons, no text. `popup: "dialog"` or `"menu"` sets `aria-haspopup` and `aria-expanded`; `pressed` sets `aria-pressed`. **Blue fill means pressed** (a toggle that is on); **gray fill means open** (its flyout or popover shows; by default when the overlay on screen is the button's `go` target). The bar is one Tab stop; arrows move; Alt+Down, Enter or Space opens a flyout. While a state card shows, a canvas section sets `AB.toolbarDisabled = "Nothing is drawn"` and every button but Quick actions is disabled with that reason. `mainToolbar()` is the standard bar: Analyze, then Layout, View and Legend, then Quick actions |
| Legend state | `legendOn()`, `setLegend(bool)`, `legendButton()`, `legendCard(parts)` | On by default, remembered per project. The toolbar's Legend button and L are its only doors: nothing else opens or closes it, and the card has no X. `legendCard([{ title: "Color: group", rows: [{ swatch, label, count }], more: "28 more communities" }])` draws the card top left and returns `null` while the legend is off. The card is read-only (the canvas carries no controls; `go` is ignored); `legendCard([])` draws "Nothing is colored or sized by a row", so a pressed Legend button always shows a card |
| Layout state | `AB.layoutState` ("running", "paused" or "settled"), `setLayout(state)`, `layoutButton()` | The Layout button's icon is its state (pause while running, play otherwise); `setLayout` swaps the button in place and announces "Layout paused", "Layout running" or "Layout settled" |
| One meaning per icon | `ICON` | `view` bookmark, `set` circle-check, `createSet`, `run` layers, `legend` list, `note` message-square, `addNote`, `filter` funnel (data filters only), `options` ellipsis, `swap` arrow-left-right, `mode3d` box, `mode2d` square, `hidden` eye-off, `shown` eye |

### Frames and building blocks

| helper | returns |
|---|---|
| `h(tag, attrs?, ...children)` | an element. `attrs.class`, `attrs.style`, `attrs.on = { click: fn }`, any `aria-*` or `data-*`. Children: strings, nodes, arrays; `null` and `false` are skipped (`Node.append(null)` is not: it prints "null") |
| `icon(name, size?)` | a sprite icon; `size` "sm" (12) or "lg" (24). Names: `kit/icons.svg` (lucide) plus the inline extras in lib.js (`circle-plus`, `list`, `command`, `arrow-left-right`, `message-square-plus`, `circle-check+plus`, `square-filled`) |
| `link(id, state, label, attrs?)` | an `<a>` that navigates |
| `go(id, state)`, `href(id, state)` | navigate; the hash |
| `nav(el, id, state)` | makes any element navigate on click and Enter |
| `act({ go: [id, state] })` or `act({ onClick })` | attrs for `h()` that make an element act |
| `button(label, { kind: "secondary", "ghost" or "danger", icon, go, onClick, disabled: true or "reason", tip, key, block })` | a `k-btn` |
| `iconButton(icon, name, { go, onClick, pressed, key, disabled: "reason", second })` | a `k-icon-btn` with its tooltip |
| `field(value, { icon, caret, go, onClick })` | a `k-field` (an input or select look) |
| `chit(color, round?)`, `ramp(from?, to?)` | a color swatch; a sequential ramp swatch |
| `colorField({ name, hex, pct, eff, go })` | the one color field (swatch, hex, percent) in the Style tab and every popover; a click opens the Color popover |
| `plain(family, value)` | the plain name of an element choice value ("icosphere" to "Faceted sphere"; families `shape`, `arrow`, `pattern`, `weight`). A stand-in until the element's descriptors carry a plain name per value |
| `scrub(nameEl, input, { range, onSet })` | drag a number's name to scrub it |
| `data(name, value, { go }?)` | a name and value row; with `go` the value is a link |
| `row({ icon, swatch, label, trail, selected, go, onClick })` | a `k-row` |
| `tabs(names, active, onChange)` | a tab list that switches in place |
| `inspector({ icon, swatch, title, kind, kindKey, locked, provenance, menu, stateBar, changed, builtin, renameDisabled, onRename, tabs, tab, body })` | the one inspector frame (below) |
| `dataTab({ Summary, Members, Values, "Made with", Notes: { count, target } }, { kind })`, `dataVocab` | a Data tab in the one order (below) |
| `paintsLine("Paints 10 nodes", [id, state])`, `paintOrderLine(text)` | the two lines that open every painting row's Style tab |
| `addNote(subject?)`, `noteSubject()` | Add note, the one gesture: every door (N, "+", the selection bar, any menu's Add note, an empty Notes section) calls `addNote()`, which writes about the subject the inspector shows (the graph when nothing is selected) and keeps that inspector. Pass `{ targets: [{ label, icon or swatch, go }], right }` only when the subject is not the inspector's (a filter step's row menu). The editor reads `AB.noteDraft` |
| `notesSection(count, [id, state]?, kind)` | the Notes section every inspector ends with: "2 notes" as one link to those notes, or "No notes. Add note (N)". Folders, attributes, sources and saved views have none (it returns `null` for those kinds). Notes saved in this page view live in `AB.sessionNotes` (the Notes place writes them), and the count adds those about the inspector's subject, so a saved note shows the same number everywhere |
| `tree(rows, { label, onEye, go })`, `treeFooter(text or candidates, link)` | the paint tree (below) and the one line under it |
| `styleTab(o)` | the one Style tab (below) |
| `whyThisLook(lines, opts)` | the node, edge and several-elements Style body (below) |
| `announce(text)` | a polite screen reader announcement |
| `renameInPlace(nameEl, { onSave, onTab, focusAfter })` | rename in place: Enter or click away saves, Esc cancels, Tab renames the next |
| `mem.get(k)`, `mem.set(k, v)` | this browser's storage, wrapped so a private window just forgets |
| `modal({ title, body, foot, wide })` | a dialog on a dimmed backdrop: export, apply a file, settings, shortcuts. Loading data is not a modal: it is the Data page, a workspace page |
| `pageHead(title, { onCancel, backTip, trail })` | the one workspace-page header (the Data page, version history): a back arrow that cancels (tooltip `backTip`, default "Cancel", key Esc), the title saying the act ("Add to Entries", "Edit: entries"), the Esc hint. Cancel and Esc return to the screen that opened the page (the shell remembers it as `AB.pageOpener`; a direct link falls back to `closeTo`), or call `onCancel` when given |
| `roleTag(word, { go, second })` | the one role tag: a `k-badge` with the role word, its tooltip `word, second` ("Weight, set when loaded -- every run uses it unless the run picks another"). With `go` it is a link. The Data page grid, the Data place's attributes and the attribute inspector all use it; a local copy is a defect |
| `fromDataItems(kind, current, onPick(name, type))` | the From data list as menu items for `openMenu`: for `"text"`, Typed text first (`onPick(null, null)`); then Node attributes, Results, Notes (Note count; Latest note when `kind` is `"text"`). The Notes group is enabled: notes are graphty-element API (`notes.count`, `notes.latest`). The Label "+" and a draft label line open it; style-pickers' Text menu is the same list |
| `position(el, anchor, place)` | places an overlay element; `place` is `auto` (popovers), `below-start`, `below-end`, `above`, `above-start`, `right-start`, `center`, `above-toolbar` or `left-of-inspector` |
| `dockToggle()` | the table collapse button: put it at the end of your dock's tab strip |
| `drawing(name, alt)` | both theme images of `kit/canvas/<name>-{light,dark}.svg` |
| `placeHead(title, actions?)` | a left panel's 40 px title row |
| `graphHead(place, graphName, { notes, trail })` | the Graph and Data places' title row: a quiet place word, then the graphs switcher (and the graph's note count). Every view of the paint tree uses it |
| `treebar({ placeholder, value, onKey, onInput, menuGo, menuOpen })` | the find line under a list: the shared find field and the list options ellipsis (`#ab-list-btn`) |
| `typeGlyph(type)` | the one glyph per attribute type: "Abc" category, "#" number, a calendar for time (Data place, table headers) |
| `renderSection(ref, el)`, `close()` | as on `ctx` |
| `fx` | `kit/fixtures.json`, loaded before any render (`AB.fx.datasets.lesmis`, `.transactions`, `.scenarios`), plus `AB.fx.datasets.doorEntries`, which the shell adds (below) |

### The door-entries fixture (`AB.fx.datasets.doorEntries`)

The owner's worked example for the Data page, kept in `app.js` because `kit/` is read-only. The
Data page, the Data place, the attribute inspector and the context menus read this one copy;
never type its counts in a section.

- `tables`: `{ file, name, rows, columns, sample }` for `people.csv` (id, name, dept, badge; 412
  rows), `buildings.csv` (bldg, site, floors; 9 rows) and `entries.csv` (person_id, building_id,
  time; 4,212 rows), 8 sample rows each. The samples include a leading-zero key ("0007" in people,
  7 in entries), a repeated key (1188), a person_id not in people (1530) and a building_id not in
  buildings (B12).
- `report` (stands in for graphty-element's match report object; the app counts nothing):
  `entries` -- 4,212 rows, 4,180 with both ends, 25 person_id and 7 building_id values not
  matched (32 rows), 1,306 person-building edges under Pair, 3 keys that differ only by leading
  zeros; `people` -- 1 repeated key, 14 people with no entries; `buildings` -- 9 rows.
- `model`: the model strip and its tooltip for `row`, `pair` and `entryAsNode`.
- `frame.project`: "Door entries, March 2026", for the header.

**The loaded graph.** A frame with `dataset: "doorEntries"` gets the door-entries canvas, graph
inspector and table for every region it does not name (the shell's `DATASET_FRAME`, as for
`"transactions"`): `canvas-and-states/door-entries` (the joined graph drawn unstyled, generated
from the fixture's counts), `inspector-nothing-selected/door-entries` (421 nodes, 1,306 edges,
weight count) and `table-dock/door-entries` (Edges; `door-entries-nodes` for Nodes).
`graph-place/door-entries` is its paint tree, and the rail's Graph and Data stay in this project.
By default it is the worked example's end state: One edge per Pair, unmatched rows left out. Load
on the Data page records the entries' One edge per in `doorEntries.loaded.per`, and every view of
the loaded graph reads its edge count from `doorEntries.loadedEdges()` (Row: 4,180 edges, no
weight). Load goes through `canvas-and-states/door-entries-loading` to `graph-place/door-entries`;
the transfers go through `canvas-and-states/transfers-loading` to `data-place/empty-filters`.
Each entry as a node is not drawn as a loaded graph.

The Les Miserables and transfers fixtures are unchanged.

Gone in version 3: `cameraFace`, `layoutChip`, `legendClose` (the canvas has no controls),
`inspector({ meta })` (the Paints line takes its place), `styleTab({ inherited, openSection,
collapseAll, all })`, the `queued` and `partial` text in tree rows (status icons instead), the
`toolbarLabels` setting, and the `select` and `view-mode` commands' toolbar buttons.

**Anchors for overlays:** `#ab-project` (project name), `#ab-filter` (filter chip),
`#ab-rail-menu` (the main menu button, now in the header left of the project name; the id is kept
from version 2), `[data-place=graph]`, `[data-place=views]` and the other rail buttons,
`[data-tool=Analyze]`, `[data-tool=Layout]`, `[data-tool=View]`, `[data-tool=Legend]` and
`[data-tool="Quick actions"]` on the toolbar. Old routes keep working: `#/camera-menu/...` goes to
`#/view-flyout/3d`, and any `#/path-tool...` route to `#/path-popover/from-selection`.

**The Data page replaces `load-step` and `inspector-source`** (both are gone from the manifest and their files are deleted).
Their routes redirect:

| old route | goes to |
|---|---|
| `load-step` (no state) | `data-page/entries` |
| `load-step/preview` | `data-page/edge-list` |
| `load-step/checks` | `data-page/entries` |
| `load-step/paired` | `data-page/transfers` |
| `load-step/edit-source-lost-fields` | `data-page/edit-source-lost` |
| `load-step/remap` | `data-page/edit-source` |
| any other `load-step/<state>` (detect-several, detect-none, unsupported-format, url, load-into, edit-source, replace, every refused-*) | `data-page/<state>` |
| `inspector-source/file`, `/paired` (and no state) | `data-page/transfers` |
| `inspector-source/url`, `/url-changed`, `/failed` | `data-page/url` |
| `inspector-source/paste` | `data-page/detect-several` |
| `inspector-source/replaced` | `data-page/replace` |
| `inspector-source/derived` | `data-place/derived` |

**The header**, left to right: main menu, project name (click: its menu; double-click or F2:
rename in place), Undo, Redo, the privacy chip (always Settings > Privacy), the filter chip.

**The rail**, top to bottom: Graph, Data, Views, Notes (message-square), Assistant. Rail places
have no keys.

**Keys the shell owns** (outside text fields): Ctrl+, Settings; Ctrl+K Quick actions; Shift+A
Analyze; P the Path popover; L the legend; ? shortcuts; 5 the view mode; Shift+T the table; Esc
closes one level. F2 renames (the tree, the inspector header, the project name). Ctrl+G (create a
set from what is selected) belongs to the selection bar. T is not a key: the time slider opens
from the table's options. Never bind W, A, S, D, Q, E, the arrows, = or -: they are
graphty-element's canvas keys.

**The canvas** holds only the drawing, the legend card (top left) and state cards. No buttons,
chips or "?". It has no 3D drawing: every state keeps the Les Miserables art, and only the
toolbar's View icon and the View flyout say which mode is on. Do not draw new canvas SVGs for 3D.

## The inspector frame (every right-side section)

- **Header line 1** (24 px) mirrors the thing's tree row: kind icon, `swatch`, the name, and a
  lock when `locked`. Double-clicking the name (or F2 on it) renames it. A name that cannot change
  (`builtin`, or `renameDisabled: "reason"`) ignores the gesture and gives its reason in its
  tooltip. No eye in the header: visibility lives in the tree.
- **Header line 2** (20 px): `kind`, the `provenance` link (`[label, id, state]`, lowercase:
  "from Louvain, Sep 28") and "..." (`menu: [id, state]`, that kind's `context-menus` state: the
  "..." menu is the right-click menu, word for word).
- **State bar** (`stateBar: { text, why, actions }`): one line, at most two buttons, on every tab,
  with a changed mark in the header. Only for a costly commit or a lasting state ("Settings changed
  since the run -- Rerun | Revert"). A long reason goes in `why` (its tooltip).
- **Tabs**: Style, then Data, remembered per kind (`kindKey`, default `kind`). A kind with one body
  has no tab strip, and its body starts right under the header.
- **Style tab** opens with `paintsLine` and `paintOrderLine`, then `styleTab` (or `whyThisLook`
  for elements).
- **Data tab**: `dataTab()`, which keeps the one order -- Summary, Members or Values,
  Sizes, Memberships, Painted by, Made with, Notes -- leaves out what is empty, and makes every
  section collapsible with its state remembered per kind.

**No verbs in inspector bodies.** A body shows and edits properties. The only button in a body is
the state bar. Every command goes in the "..." menu, which is the kind's context menu.

## The Style tab

`styleTab(o)` is built from `AB.CHANNELS`, a stand-in for graphty-element's `channelsFor()`
descriptor list. `set`, `base`, `changed`, `bound`, `mixed` and `error` are keyed by the
element's channel id (`"node.color"`, `"edge.arrowHead"`).

- **Paints line and paint-order line** first (`paints: ["Paints 10 nodes", [id, state]]`,
  `order: "Covered by PageRank for Color on 10 of 10"`).
- **Nodes | Edges** switch with no numbers; a side that sets something carries a dot ("This row
  sets edge properties"). `kinds: ["node"]` drops the switch.
- **Sections** in a fixed order, always open, no counts: Nodes Fill, Shape, Effects, Label,
  Tooltip; Edges Line, Arrows (lines Head and Tail), Label; More only when it holds something. A
  section with nothing set is its header and "+". "+" lists the section's unset properties and
  disappears when none are left; the new line is pre-filled from `base` and focused.
- **Node labels are label lines keyed by position** (`labels: [{ pos: "Above", field: "label",
  type: "cat" }, { pos: "Right", draft: true }]`). The name column is the position word (not a
  control: position moves only in the Label popover's position grid); the value is the type glyph
  and the field. Two exceptions to the rule above, and the only two: **the Label "+" is the one "+"
  that opens a menu after adding** (it adds a line at the first free position -- Above, Below,
  Right, Left, the four corners, Center -- and opens the From data list on it at once, focus on its
  first item), and **a label line is the one new line not pre-filled**: until a field is picked it
  reads "Pick a field" in gray, its accessible name is "Label, Right: no field, draws nothing", and
  it writes nothing. Esc leaves the draft. "+" disappears once every position is used. **Show** is
  offered only while the row has no label line, so with no lines "+" holds two items, Label and
  Show. Bind or a click on a label line's value opens `style-pickers/label-style`. Without
  `labels`, a bound `node.label` draws as one Above line. The position words come from
  `CHANNELS.positions` (graphty-element's TextLocation ids and their plain words; a stand-in, its
  comment names the missing per-position label channels). Edge labels keep their one middle line.
- **A line** is the name (88 px) and the value. Numbers and text are typed in place (drag a
  number's name to scrub it). Colors show a swatch, the hex and the opacity percent (opacity has
  no line of its own). Choices open their picker and show plain names (`AB.plain`). Booleans are checkboxes.
  The Label and Tooltip Text value opens the one Label popover (`style-pickers/label-style`):
  its text source (typed text, a field, a result or a note) on top, its style below. Bind on
  a label line opens the same popover; on any other line it opens the Binding popover.
- **Folded properties** have no line: opacity is in Color's popover, glow strength in Glow's,
  pattern count in Pattern's, an arrow's size, color, opacity and caption in Head's or Tail's.
- **Bind and "-"** show on hover, on focus within the line and on the selected line, floating
  over the value's end. A bound line (`bound: { "node.color": { field, palette: "Orange to Brown",
  ramp: [from, to] } }`) is a chip: the ramp and the palette's name for a color, else the type
  glyph and the field (`{ field, type: "cat" | "num" }`); its bind and "-" follow the same hover rule.
- **Everything** uses the same tab: `base` holds graphty-element's defaults, drawn as lines with
  no "-" (tooltip "graphty-element's default; change it to override"); `changed` lists the lines
  that differ and so get "-" (which puts the default back).
- `mixed: { id: [a, b] }` (several rows) reads "Mixed" with both swatches; `noBind: true`
  (Selection) drops bind, "-" and "+".
- Routes the lines open: `style-pickers/color`, `shape`, `pattern`, `arrow`, `choice`,
  `label-style`, and `bind` for the bind icon and a bound value.

## Why this look

`whyThisLook(lines, { kind, element, coverage, coverageReason, tokenGo })` is a collapsible,
read-only section ("Why this look"), remembered per `kind` (`why.node`, `why.edge`,
`why.several`); closed, it lists its winners in one line. Every line is on one grid: a 12 px
swatch, the name (a link that selects the row), tokens right-aligned, a coverage column when
`coverage` is set. A line with no `wins` is not listed. Tokens use the Style tab's names (Color,
Size, Shape); their tooltip is `values[prop]`; a token opens `tokenGo(prop, line)` (default
`style-pickers/token-edit`, whose popover is headed "Valjean only -- writes to Overrides").
`overrides: true` gives a line "-" on hover; `hiddenRow` shows the eye-off glyph; `locked` the
lock.

## The tree

`tree(rows, opts)`: row = `{ id, kindIcon, swatch, name, count, notes, notesInside, eye, locked,
pinned, builtin, renameDisabled, onRename, onDelete, children, open, selected, dim, go, menu,
status, statusText, progress }`.

- Left to right: disclosure, the kind slot, swatch, name, then fixed slots: count, note count, and
  one slot shared by the lock and the eye (the eye shows on hover, focus, the selected row and
  when the row is hidden; a locked row shows its lock until hovered).
- `status` ("running", "queued", "partial", "stale", "error", "filtered") replaces the kind icon,
  its sentence (`statusText`) in that icon's tooltip. The only line under a row is a running
  progress bar (`progress` 0 to 1). Counts are blank when empty.
- One Tab stop, roving focus on the selected row; arrows, Home, End; Left and Right collapse and
  expand; Enter opens; Space toggles the eye (Alt-click solos); F2 renames (Tab renames the next);
  Delete deletes with the Undo notice (built-in and pinned rows refuse); Shift+F10 opens `menu`;
  Ctrl+] and Ctrl+[ move a row among its siblings. One click selects in place and keeps the left
  panel, so a real double-click on the name renames. A row whose `go` replaces the left panel (a
  Sources row opens the Data page) sets `waitDouble: true`: its single click waits out the
  double-click interval (350 ms) before it opens, the Notes place's rule, so a double-click still
  renames; Enter opens at once. Each row carries `data-row`, so focus finds it again after a redraw.
- `treeFooter([[text, link], ...])`: one line under the tree; the first (most specific) wins.

## Commands

`AB.COMMANDS` holds every command that has two or more doors (Data page doors: `add-data` opens
`data-page/entries`, `edit-source` and `replace-file` the source row's two; context menus, Quick
actions and the Data place all take them from here): `{ label, shortcut, home: "Place >
Control", disabledReason, go or onClick, more, toggle, on }`. Every door takes its label and key
from `cmd(id)`. A two-state command has `toggle: [label when on, label when off]` and `on()`: Pause
layout / Resume layout, Switch to 2D / Switch to 3D, Hide legend / Show legend, Hide table / Show
table. A label ends in "..." only when the command asks for more input (`more: true`); `cmd()`
warns otherwise.

## Rules

- Plain ASCII, American spelling (color, gray, behavior, center, analyze).
- **Never use the `title` attribute.** Use `tip()` or `data-tip`. Nothing needed to finish a task
  lives only in a tooltip.
- **"+" only in a section or list header** (`plus()`), never a "+ Add ..." button at the foot of a
  list or body.
- **No accordions in editable bodies.** Collapsible sections are for read-only content.
- **Three surfaces**: a **dark menu** chooses a command or one item (no title, closes on the
  pick); a **light popover** edits a value (title and X, applies live, `popover()`); a **modal**
  takes over the screen (export, apply a file, settings, shortcuts) or confirms what cannot be
  undone (`confirm()`). Loading data is none of these: it is the Data page, a **workspace page**
  (`pageHead()`), like version history.
- **One empty state** (`empty()`), **one notice** (`notice()`, `deleted()`), **one tooltip**
  (`tip()`), **one design-note chip** (`needsElement()`, `openQuestion()`).
- **Items that need graphty-element** are drawn disabled with the chip (`needs` on a menu item,
  `data-needs` on any other control). "Hide design notes" in the review bar hides them all: the
  owner reviews with notes showing; user tests run with them hidden.
- **Notes are graphty-element API** (the owner's decision): adding, listing, counting and binding
  to notes are enabled everywhere and carry no "needs graphty-element" chip. The one exception is
  noting an edge picked on the canvas, which keeps the chip.
- **Note authors are optional.** The app knows a name only if the reader typed one in Settings,
  so most notes have none: the fixtures show five of seven notes with no author. A note shows its
  author only when the project holds two or more named authors; otherwise a note reads its time
  and its subject (node, edge, group or path), which every note carries.
- Real content only: numbers and names from `kit/fixtures.json` (Les Miserables for the graph,
  transfers for Data and Path). Never lorem ipsum, never an invented count.
- Chrome colors only from `var(--cm-*)` and the kit's `--k-*` roles; data colors from the fixtures.
- Nothing is dead: every clickable control navigates, opens its popover or menu, or changes
  something visibly in place. A command the skeleton does not model calls `AB.flash(...)`.
- No verbs in inspector bodies: the only button in a body is the state bar.
- Styling is left to the user: the app adds no look of its own (no built-in dimming, no default
  note color). A style comes from a row or from graphty-element's defaults.
- Screen text is for a stranger: no internal ids, no process narration, no "studio decision"
  labels on the product surface.
- The review bar (pink) is not the product. Do not put product controls in it.
- Check your section at 1440 x 900, 1366 x 768 and 1024 x 768, light and dark, with no
  horizontal page scroll and no console errors.
