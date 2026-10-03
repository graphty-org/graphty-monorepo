# Refined B skeleton: how to build a section

A clickable, layout-only skeleton of refined structure B, version 5
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

**Words.** The product's vocabulary (row, run, set, step, place, Paints, Covers) is defined once in
`design/ui/framework/glossary.md`; this README does not keep its own. Every door to a command uses
its `cmd()` label word for word (below).

**Every count and claim in a message is computed from the state it describes, or the message is
removed.** A number or a fact typed into a string ("64 hidden", "32 rows", "sorted by degree",
"Covered by PageRank", "Paints 10 nodes") goes stale the moment the screen changes, and a line that
disagrees with the screen costs more trust than no line. Read it from the state the line is about
(`AB.paintRows`, `AB.labelStatus`, `covers()`, `AB.projectCounts`), and when nothing on the page
holds that state, leave the line out. One term per concept: the overlap switch is **Show all labels**
everywhere (never "Labels shown anyway" or "show all"), and adding a label line is **Add label line**
everywhere (the Label "+", its heading word, an attribute's menu, Quick actions).

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
View flyout follow it. `own: true` (an overlay only) makes the overlay draw the panels its frame names instead of keeping
the panels behind it, and closes to its left panel: the result of a run or a path, drawn for the
project the reader was on (`AB.route.frame.dataset` while the frame is computed is the screen
before). `filterOn` lists the attributes the project's filter steps read (on or off; the Data
place sets it from its Filters, and a filtered Les Miserables state from its chip); like `chip`, it
follows the left panel, and the field lists tag those fields "Filter step". `dataset` names the fixture the header's project name comes from
(`"lesmis"` by default, `"transactions"`, `"doorEntries"`, `"wide"`, `"nested"`, `"plainJson"`).
The last three come from `kit/wide-nested.json`, generated by `../kit/gen-wide-nested.mjs` (rerun it to
rebuild; it copies the file here): `wide` is an IT estate, 300 hosts with 69 attributes
(`nodeAttributes`, `nodeRows`) and 1,105 connections with 26 (`edgeAttributes`, `edgeRows`);
`nested` is one nested API response (`document`, every path in `paths`, the id links in
`relationshipPaths`); `plainJson` is a 12-node node-link JSON graph that loads in one step.
A frame with one of these three datasets gets `canvas-and-states/hosts`, `inspector-nothing-selected/wide`
and `table-dock/wide` for every region it does not name (the shell's `DATASET_FRAME`); each of those
routes draws the project in `AB.route.frame.dataset`, so the nested and plain JSON projects reuse
them. The rail stays in the project: Graph opens `graph-place/wide`, `graph-place/nested` or
`graph-place/plain-json`, Data opens `data-place/attributes-wide`, `attributes-nested` or
`plain-json`, and Views and Notes open `empty` for all three; a click on empty canvas and Esc to a
place go to the same states (a place's `at-rest` names Les Miserables).
Two graph-file samples open bare, as loaded projects with nothing run: `karate` and `ppi` get
`canvas-and-states/karate` or `/ppi` (the plain drawing, `kit/canvas/karate-plain` or `ppi-plain`),
`inspector-nothing-selected/karate` or `/ppi` (the overview, counts from `AB.projectCounts`) and no
table; the rail's Graph opens `graph-place/karate` or `/ppi` (Selection, Notes and Everything), and
Views and Notes open `empty`. The shell gives the karate club the `frame` (project name, graph row)
its fixture lacks. The nested project is what
the last Load on the Data page left (`AB.nestedLoaded()`; before any Load, the Data page's proposal),
so its Data place, field lists, graph inspector and canvas follow the reader's choices. A fourth
loaded project, `registry` (the package registry `data-page/json-keyed` loads; its dataset entry is
made by `AB.registryDataset()` in `data-page.js`), has its own `canvas-and-states/registry`,
`graph-place/registry`, `data-place/registry` and `inspector-nothing-selected/registry`, and no
table. Every Sources row of these projects opens Edit at its own table (`data-page/edit-*`), and
Apply returns to the Data place; "Open as a new graph" is only for a file not yet loaded. What the field
lists call "in use" is only what the project draws: the roles set at load, plus the row of
`graph-place/wide-sized` (Size by the 46-character attribute) or `graph-place/nested-set` (a kept set). The header reads each dataset's `frame.project`.
Examples: the node inspector wants
`{ left: "graph-place/at-rest" }`; the Data page wants `{ dataset: "doorEntries" }` and sets
`rail: "data"` so the rail lights Data; an attribute inspector wants `{ left: "data-place/attributes" }`.

**The selection bar is raised in one place.** When the frame's `right` is `inspector-node/*`,
`inspector-edge/*` or `inspector-several-elements/*` and the route names no `toolbar`, the shell
sets the toolbar to `selection-bar/one-node`, `selection-bar/one-edge`, or
`selection-bar/two-nodes` (`five-nodes` for the several-elements `style` and `data` states). A
canvas click on a node goes the same way. A section frame never sets `toolbar: "selection-bar/..."`
for a selection its inspector already shows; name a toolbar only for a bar the inspector cannot
imply (`selection-bar/hidden`).

**The canvas walk (Shift+Arrow)** is `canvas-and-states`' (graphty-element's canvas key, the owner's
decision): with focus on the drawing it walks between neighbors, and the section's own pill and
announcement say where it is; the shell has no second walk. A click on the drawing (a hot spot, or
empty canvas, which clears the selection) leaves focus on it, so Shift+Arrow walks from there. The
shell keeps the selection one node makes: `AB.selectNode(dataset, index)` (a canvas hot spot:
Valjean, monitor-prod-iad-03, the first researcher, the first Coauthors node, Ana Ruiz; a row of the
wide or nested table) opens that project's node inspector state (`inspector-node/why-this-look`,
`transfers-node`, `door-ana` or `door-b1`, `wide-data`, `nested-data`, `plain-data`) with the
selection bar and names the node in the inspector header. A click on a node's label drawn on the
canvas selects that node the same way, on every drawing: `AB.drawnLabels(img)` reads the labels an
SVG drawing holds, each `{ name, x, y, w, h }` in page pixels where the img draws it now, and the
shell matches the name against `AB.walkList(dataset)`. `AB.walked` is `{ dataset, index, name,
neighbors, right }` while such a node is on screen, else `null`, and `AB.walkList(dataset)` is the
project's node list in file order. `AB.openField(dataset, name)` (defined by the attribute inspector)
opens any project's attribute from any list (Les Miserables' open
`inspector-attribute-and-filter-step/lesmis-field`; the transfers and door entries keep their own
states). A frame may set `walk: n` to draw the selection on the nth node of that list
(`canvas-and-states/walked` is Les Miserables after two steps: `{ right:
"inspector-node/why-this-look", walk: 2 }`).

**Staying in the project on screen.** A door out of the wide, nested, plain JSON, door-entries or
transfers project must not draw Les Miserables. `AB.placeOf(dataset, "graph" | "data" | "views" |
"notes")` is the state a place opens on for a project (the rail uses it); the selection bar's Create
set, Neighborhood and Hide, the path popover's result, and the edge bar land there. An inspector
whose frame names a dataset and no left panel keeps the left panel and canvas it opened beside
(the transfers' `inspector-node/transfers-node` beside the Data place). Menus that have no state
for another project open in place (the tree's List options, the wide table's Table options), and
an unbound line's bind icon opens `style-pickers/bind-prop`: Binding for that property with no
source yet, over the panels it was clicked in. `AB.projectCounts(dataset)` gives a loaded
project's node and edge counts to Everything, the graph inspector and the table alike (see "A
project's counts" in the helper table).

**The project on screen stays on screen.** From a frame whose `dataset` is not `"lesmis"` (the
door entries, the transfers), the shell carries that project into the next screen when the next
screen names no other one: an overlay (menu, popover, dialog) opens over the panels that were
showing, and Esc goes back to them; a rail place, and an inspector beside the same left place (the
tree's Selection, Notes and Everything rows), keep the project and its left panel. A section that
can show either project reads `AB.route.frame.dataset` (Analyze, the Path popover, Notes, the
project menu, the Everything row). A dock state that names an overlay (the table dock's Columns
popover and Table options) counts as an overlay here, so it keeps the left panel, canvas and styling
it opened over, and Esc returns to that screen. Opening any overlay over the same panels never redraws them, so
what the reader changed there (a label line just added) is still behind the popover.

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
| Tooltip | `tip(el, name, { key, second, label })` | The one tooltip: a light bubble 500 ms after the pointer arrives, at once on keyboard focus (`:focus-visible`), at once for a neighbor within 1 s of the last one hiding; Esc dismisses it; the pointer can rest on it; a 500 ms long press shows it on touch. The bubble is hidden from speech: `name` becomes the control's `aria-label` (unless `label: false`, for a control whose visible text names it, where a tooltip that says more than the text becomes its `aria-description`; a labeled plain icon gets `role="img"`) and `key` its `aria-keyshortcuts`, drawn as a key chip. `second` is a second line, only for a disabled reason or a modifier gesture ("Alt-click: show only this row"). "Undo (Ctrl+Z)" is split into name and key for you. A section may instead write `data-tip`, `data-key` and `data-tip2` attributes; the shell gives such an icon-only control its label after each render |
| Add | `plus({ label: "Add to Line", items, onAdd(item), go, fields })` | The one "+", only in a section or list header (`section({ actions: AB.plus(...) })`). One item: adds it at once. Two to 15: a dark menu. Past 15: the field list at menu size, its find over the items. `fields` (fieldList options) makes it the field list of those fields at any length, `onAdd({ label: name, type, ...field })`. None: returns `null`, so the "+" disappears. `go` sends it to a route instead (a picker section that draws its own menu) |
| Name a new thing | `createThenRename(rowEl, { onSave })` | A new item gets a default name and opens straight into rename, its name selected |
| Edit a value in detail | `popover({ anchor, title, body, foot, width, place, onClose })` | The one light popover (`onClose`, for one opened in place rather than as a route, is what its X does instead of the shell's close): a title and an X; each change applies live; Esc or a click outside closes it; focus starts on the first field and returns to the anchor; the shell keeps the panels as they were (no redraw). Placement is automatic: left of the inspector, level with the anchor, for an anchor in the inspector; directly above the toolbar for an anchor in the toolbar or the selection bar. `foot` only when the popover creates something |
| A field in a popover or a body | `fieldRow(label, control, { popover })` | Label column 88 px in the inspector, 96 px in popovers; 24 px rows; 8 px gap; labels top-aligned. Never set your own label widths |
| Read-only block | `section({ title, collapsible: true, summary, key })` | Collapsible with a chevron and a one-line summary when closed, remembered per KIND in `key` (`why.node`, `data.run.made-with`, `notes.group`) |
| Editable block | `section({ title, editable: true, actions, titleAct })` | Always open: no accordion in anything editable (`editable` refuses `collapsible`). `titleAct: { name, onClick }` makes the heading word the section's own command, with `name` as its tooltip (the Label heading: Add label line) |
| Nothing here | `empty(text, { verb, key, go or onClick })`, `noMatch(q)` | One gray line, the verb a link: "No notes. Add note (N)". A filter with no matches: `No match for "x"`. No icons, buttons or footnotes |
| A notice | `notice(text, { label, go or onClick })` | The one notice slot, owned by the shell: centered 8 px above the lowest bar (the toolbar, or the selection bar when it shows), 6 s, paused while hovered, at most one action. It returns an empty placeholder, so appending the result anywhere is harmless. A started run shows no notice |
| After a delete | `deleted("Louvain and 6 groups", onUndo)` | "Deleted Louvain and 6 groups" with Undo. Deleting never asks first. A count in the text is written with `count()` |
| A row menu's (or an inspector menu's) Delete of a tree row | `deleteRow(name, onUndo)` | Deletes the tree row named `name` exactly as its Delete key does: the row goes, the notice names what went with it from the row's own count ("Deleted Louvain and 6 groups"), Undo puts it back. With no such row on screen it gives `deleted(name, onUndo)`. Never word a row's delete notice yourself |
| The one confirmation | `confirm({ verb, thing, loss, onConfirm })` | Only for what cannot be undone, which today is Forget all keys: "Forget all keys?", one sentence on what is lost, Cancel and the verb |
| A control the skeleton does not model | `flash(text)` | The same notice with no action |
| Needs graphty-element | `needsElement(reason)` | The one design-note chip, placed after the control it qualifies; the reason is its tooltip |
| An open question | `openQuestion(text)` | The same chip, worded "Open question" |
| A menu | `menu({ anchor, place, label, items, back })` | A dark menu. Item: `{ label, shortcut, go or onClick, sub, check, disabled: true or "reason", desc, needs: "reason", toggle: [label when on, label when off], on }`, `{ sep: true }`, `{ heading }`. One line per item: `desc` becomes the item's tooltip; a second line only says why an item is disabled. `needs` draws the item disabled with the chip, the reason in the chip's tooltip; the item is product text, so "Hide design notes" (and the participant view) keeps it, disabled, drops the chip and gives its reason as the disabled second line in plain words ("This version cannot copy a subgraph into a new graph yet", or "Not available in this version" for a fragment). Write `needs` as the reason (a sentence about graphty-element, or a fragment such as "a grouping"), never as "Not available yet". Keyboard: Up, Down, Home, End, typeahead; Right or Enter opens a submenu, Left closes it (goes to `back`); Esc closes one level; hover opens a submenu after 200 ms. Disabled items stay focusable |
| A menu that is not a route | `openMenu(anchor, items)`, `closeMenu()` | A dark menu of 15 items or fewer (it has no find; past 15 it warns). The "+" menu uses this |
| An attribute's menu | `attributeMenu(anchor, dataset, name, { editOn, table, noTable })` | **The one attribute menu**: Data > Attributes' rows, the attribute inspector's More actions (an inspector `menu` may be a function of its button) and a table column's menu. It has no Color by or Size by (painting from an attribute is a bind in a row's Style tab); Add label line and Select where come from `cmd()`; Filter to... is `AB.filterTo` (a step on the attribute in the project's Data place, opened through `AB.openStep`); Select where <attribute> is... (`cmd("select-where-attribute", { attribute })`) is `AB.whereFrom`: the one Select where dialog with that attribute's condition filled in (`select-where/attribute`), which keeps both set kinds (a fixed Create set and Create set from rule); Read as... is `AB.openField` |
| Paint from an attribute | `paintBy(dataset, "Color" or "Size", name, on)`, `paintRow`, `paintOf`, `boundOn(route)`, `painted` | A binding in a loaded project (wide, nested, plain JSON): `on` is `"row"` (a measure row named after the attribute, `graph-place/painted`, `inspector-measure-row/painted-color`) or the inspector route whose line a bind icon bound (Everything's Color). The tree, the canvas and its legend, the field lists' In use and the inspectors read it; a Binding popover that picks a source sets `AB.repaint`, so closing it redraws the panels |
| Find or pick an attribute | `fieldList(o)`, `openFieldList(anchor, o)`, `fieldsOf(dataset)` | **The field list**, every attribute picker and attribute list (below). `openFieldList` opens it at menu size from a control, as `openMenu` does; a section drawing it in its own overlay places it with `position(fieldList(o), anchor, place)`; at panel size append `fieldList({ size: "panel", ... })` |
| What went wrong | `problem({ what, todo, action, level })` | **The problem block**: a red "x" (error) or yellow "!" (`level: "partial"`), the line saying what happened, a second line saying what to do, and at most one action (`{ label, go or onClick }`) under them. The Data page's refusals and partial loads, the Binding popover's and Why this look's unknown path |
| A name that does not fit | `truncMiddle(text, max, ranges)`, `fitMiddle(root)` | The middle ellipsis for attribute names and paths (`cpu_util...p95_pct`): keeps the start and the end within `max` characters, bolds `ranges`, and puts the full text in the tooltip and the accessible name. After every render the shell runs `fitMiddle` over the app: a middle-cut name still wider than its box is cut again from the middle until it fits, so a box's end ellipsis never cuts it a second time (call it yourself on an element drawn later). A legend title "Color: <attribute>" (also Size, Width, Shape, Label) gets the middle ellipsis on its attribute. Field lists, column headers, legends, Why this look. Prose (node, note, source and row names) uses the end ellipsis, `k-ellipsis` |
| Find by word starts | `wordMatch(name, query)` | The one matcher: names split at `_ . - [ ]`, spaces and case changes, and so does what is typed; each typed word starts a word of the name, in order ("vu cr", "cpu p95", "kernel_version", "profile.field"). Returns the matched `[start, end)` ranges for bold, or `null`. Any find over names uses it (the field list, Go to column) |
| A count or a measure | `count(n, noun, { of, plural, version, on, onOf, also })`, `range(lo, hi, column, { on, onOf, also })`, `num(v, digits = 3)` | **The one number formatter.** `count(L.nodes, "node")` is "77 nodes", `count(60, "node", { of: L.nodes })` "60 of 77 nodes", `version` adds the data version in parentheses when it is not what the screen shows ("before the filter"). **The set rule lives only here**: `on` is the size of the set a value was computed over (`onOf` its whole, default the project's nodes), and the set is named only when it is not the graph on screen (the filter chip's count, `AB.route.frame.shown`) or when `also: true` says the same measure appears elsewhere over another set: `count(0.0754, null, { on: 77 })` is "0.0754, on all 77" while the chip reads "60 of 77 nodes" and "0.0754" on the full graph; `count(0.419, null, { on: 60, also: true })` "0.419, on 60 of 77". A range always names its column: `range(0.0033, 0.0754, "PageRank")` "PageRank 0.00330 to 0.0754". `num` writes a whole number with thousands separators and anything else to three significant digits ("0.0868", "0.00101", "0.570", "6.60"). Read the number from `AB.fx` (or `AB.projectCounts`), never type it: `node app-b/study.mjs --counts` fails on a count typed by hand in a section file, also inside `AB.count(...)` |
| Column names | `distinctNames(names, where)` | Two columns never share one display name: every list of column headers (the table, Columns, an export's columns) passes its names through it; a clash is a console error |
| Top 10 | `topN(items, valueOf, n = 10)` | The highest `n` with ties kept whole: every item reaching the nth value, so a tie at the cut is never split. Every Top 10 list uses it |
| A command | `cmd(id, extra?)`, `COMMANDS` | A menu item from the one command table (below) |
| The File list | `fileList()` | **The one File list**: Open project or file..., Save, Export..., Apply recipe or style file..., Version history, as `cmd()` items. The main menu and the project-name menu both append it where their File group goes, so the two show identical words. Never list these commands one by one |
| Clear the selection | `clearSelection()` | **The one way to empty the selection**: the empty canvas and Escape call it. The selection becomes empty and the inspector shows the graph on screen as its subject; the left panel stays the place and the project it was, drawn again so no row stays marked selected. The graph is never put into the selection. It raises the notice "Selection cleared (1 node)" (elements are counted, and so is a row that holds nodes: "Selection cleared (9 nodes)"; a row that holds none, a measure, is named) with **Bring it back**, and arms the selection slot: while it is armed, Ctrl+Z, the header's Undo (named "Undo: restore selection (9 nodes)") and Bring it back restore only that selection, touching no undo or redo step, and the line then reads "Selection restored (9 nodes)". Any new selection (a render) or undoable change (a notice with Undo) empties the slot. It is spoken as "Selection cleared (1 node). Ctrl+Z brings it back" |
| What a row menu acts on | `AB.menuTarget` | `{ name, kind }` of the row whose menu is opening: the tree sets it on right-click and Shift+F10, the inspector frame on its "..." (a `menu` given as `[id, state]`). A row-menu section heads its menu with `AB.menuTarget.name` and acts on it, never on a fixed row |
| Everything's base values | `BASE_STYLE` | **The one base style** (`{ "node.color": "#808080", "edge.width": 8, ... }`): every section that shows Everything or its look reads it. The fill is the gray the drawings paint, so the panel never disagrees with the picture. A local copy is a defect |
| Several choices | `seg([[value, label, extra]], value, onChange, { label })` | A segmented control for 2 to 4 short options: one Tab stop, arrows move and select |
| The canvas toolbar | `toolbarButton(icon, name, { key, popup, pressed, open, disabled, go, onClick, tool })`, `toolbarBar(items, label)`, `mainToolbar()` | 32 px icon buttons, no text. `popup: "dialog"` or `"menu"` sets `aria-haspopup` and `aria-expanded`; `pressed` sets `aria-pressed`. **Blue fill means pressed** (a toggle that is on); **gray fill means open** (its flyout or popover shows; by default when the overlay on screen is the button's `go` target). The bar is one Tab stop; arrows move; Alt+Down, Enter or Space opens a flyout. While a state card shows, a canvas section sets `AB.toolbarDisabled = "Nothing is drawn"` and every button but Quick actions is disabled with that reason. `mainToolbar()` is the standard bar: Analyze, then Layout, View and Legend, then Quick actions |
| A project's counts | `projectCounts(ds)`, `countSource(ds, fn)`, `removeFromData(ds, { nodes, edges })` | **The one reader of a project's node and edge counts**, `{ nodes, edges }` as the data is now: the fixture's counts (or what `countSource` registered for a project a section builds, such as the nested one) minus every Remove from data in this page view. `removeFromData` records what a removal took and returns the Undo that gives it back, so after the table removes Valjean (1 node, 36 edges) the table, Everything and the graph inspector all say 76 nodes. Read counts here, never from `AB.fx` directly where an edit could change them. A section never assigns `AB.projectCounts`: `--counts` fails on it |
| Legend state | `legendOn()`, `setLegend(bool)`, `legendButton()`, `legendCard(parts)` | On by default, remembered per project. The toolbar's Legend button and L are its only doors: nothing else opens or closes it, and the card has no X. `legendCard([{ title: "Color: group", rows: [{ swatch, label, count }], more: "28 more communities" }])` draws the card top left and returns `null` while the legend is off. A part titled after a run ("Color: Betweenness 2") gets the method's one plain sentence under its title (`methodSentence`, placeholder text marked as coming from graphty-element's algorithm catalog), and a "Size: ..." part with no rows gets the bound range, "2 to 12 px", so the legend names every channel in use and what it means. A row's `count` that is a number (or a number already written by `num`) is drawn with its noun by `count()`: `noun` on the row or the part, default "node" ("Community 1  10 nodes", "person  411 nodes"). The card is read-only (the canvas carries no controls; `go` is ignored); `legendCard([])` draws what the field lists say paints, or "Nothing is colored or sized by a row". A pressed Legend button always shows a card: after every render the shell adds `legendCard([])` to a drawn canvas that has none (not while a state card shows) |
| Layout state | `AB.layoutState` ("running", "paused" or "settled"), `setLayout(state)`, `layoutButton()` | The Layout button's icon is always `ICON.layout` (move: arranging, never play or pause, which read as playing an animation; the popover's Motion line says whether it moves) and a click opens the Layout popover (`toolbar/layout-open`: Pause or Resume, then the graph's Layout group), wherever the bar is drawn; `setLayout` swaps the button in place and announces "Layout paused", "Layout running" or "Layout settled" |
| The project's name and Recent | `AB.projectNames[dataset]`, `AB.visit` | A rename or Save as in the project menu sets `projectNames`, which the header reads. `AB.visit.fresh` is set by a first-launch start screen; from then on the start screen's Recent lists only `AB.visit.recents` (what was opened or saved in this page view), never the returning reader's fixture projects |
| A row shown alone | `AB.soloRow` | The name of the row whose eye is soloed (the tree sets it; a tree drawn again clears it). The Les Miserables canvas and its legend paint from it (Louvain by community) |
| What the paint tree paints | `AB.paintRows`, the `ab:paint` event, `moveRowAbove(name, other)` | **The canvas and its legend follow the tree.** `AB.paintRows` is the paint tree's every row in paint order, top first, `{ name, eye, level }` (the tree publishes it whenever it draws; other trees, such as Filter steps, do not). An eye, a solo (Alt-click), a move (Ctrl+] or a drag), a delete or its Undo raises `ab:paint` on the document, and the shell draws the canvas region again at once, before the tree's `onEye` runs; the canvas section reads `AB.paintRows` and `AB.soloRow` to decide what paints and what its legend says. A state bar's Move above calls `moveRowAbove("Betweenness", "PageRank")`, the tree's own move (out of a folder if it has to; a hidden row it moves is shown; same announcement, same repaint), never a move of its own; it returns the move's Undo, which the state bar's notice gives as its Undo. The Les Miserables drawing and its legend read Color from the top shown row that paints Color (PageRank, Louvain, a Betweenness run), and Size from a Size binding (`paintOf`) |
| A run finishing | the shell's `RUN_DONE` (app.js) | A route showing a run in progress (`analyze-popover/running`, `graph-place/running`) moves on to the finished state 0.9 s later ("Under a second"), unless the reader went elsewhere: on Les Miserables `graph-place/finished`, the new row on top, painting, with its legend. A section never starts a timer of its own for this |
| Add a label line | `addLabelLine(field?)`, `labelStatus(ds, field)`, `overlapHidden(ds, names)`, `AB.showAllLabels` | **The one Add label line.** Quick actions, an attribute's menu (with that field), the Label heading and its "+" all add a label line in the project on screen: the Style tab on screen takes it in place, else the project's Everything row opens and takes it; an open menu or dialog closes first. With no field the line starts empty and its field list opens (the owner's rule); no notice and no Undo, since its own "-" removes it. A bound label line states its result under itself from live state, `labelStatus`: "77 names, 64 hidden to avoid overlap" (the field's Name role makes the noun "name"; a project whose rows are a sample gets no line). `overlapHidden` is the one overlap rule (the names graphty-element hides; none while `AB.showAllLabels`, the Show all labels switch, is on): the canvas, Export and the label line read it, so they never disagree |
| The one find | `treebar({ find: { rows(q), notes(q), hide } })`, `findHits(ds, q)` | **The list's box finds everything the project holds**, as one live list under the box (placeholder "Find rows, elements, values"): Rows (the caller's, first), Elements (nodes and edges by name, id or an attribute value, read over the full graph; a hit a filter step leaves out is listed and says "left out by" that step), then one row per matched value, "Select where group is 2 (14 nodes)", which opens the one Select where dialog through `AB.whereFrom`, then Notes (the caller's). `rows` and `notes` return `[{ label, sub, onPick }]`; `hide` is the tree the list stands in for. Each group is a listbox group named by its heading; "No match" is a message, not an option. Focus stays in the box: Down and Up move, Enter picks (the first result when none is marked), Esc clears, then closes and returns focus to the list's current row; the selection changes only on a pick. Picking an element selects and frames it and opens its inspector on Data (`AB.selectNode(ds, i, { at })`). A node or edge whose name is exactly what was typed puts Elements first, so Enter picks it. "/" focuses the box (opening the project's Graph place first), through `AB.focusFind(text?)`, the one door: Quick actions' Find... and its one hand-off, "Find '<text>' in the graph", call it with the text typed. The Notes group reads `AB.notesOf(ds)` (the Notes place's list) |
| A bound size | `SIZE_RANGE`, `sizeRangeText()` | **2 to 12 px**, the skeleton's one size range: a bound Size line (`boundOn`), the Binding popover and the legend all state it. Never type another range |
| A path's route on screen | `AB.pathRouteAt`, `AB.setPathRoute(i)` | Routes that tie: the path popover's result bar and the path inspector step the same index, so they never name different routes |
| One meaning per icon | `ICON` | `view` bookmark, `set` circle-check, `createSet`, `run` layers, `legend` list, `note` message-square, `addNote`, `filter` funnel (data filters only), `options` ellipsis, `swap` arrow-left-right, `mode3d` box, `mode2d` square, `hidden` eye-off, `shown` eye, `layout` move (the Layout button and the Layout command); `play` is only for presenting and media. **A tag** ("Start here", "3D", "auto", "Recommended") is the kit's `k-badge`, 16 px with 11 px text, never a local pill; on a dark menu it takes the menu's inks (`app.css`) |

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
| `dataTab({ Summary, Members, Values, "Made with": { body, provenance }, Notes: { count, target } }, { kind })`, `dataVocab` | a Data tab in the one order (below). Made with's `provenance` (`{ "Created from", Scope, "Data version", Ran }`) is drawn after its settings as read-only rows, always in that order, any missing one left out (give Scope and Data version only when they differ from the graph on screen) |
| `paintsLine("Paints 10 nodes", [id, state])`, `paintOrderLine(text or { row, prop })`, `PAINT_ORDER`, `covers(row, prop, ds?)` | the two lines that open every painting row's Style tab. The paint-order line is drawn as given, in one grammar: "Covered by PageRank for Color on 10 of 10" (a string, or `["Covered by ", link, " for Color on 10 of 10"]`). The Covers form is never typed: `paintOrderLine({ row: "PageRank", prop: "Color" })` reads `PAINT_ORDER` (each project's rows, top of the tree first, and the properties each paints) through `covers()` and writes "Covers Louvain and 5 more for Color", the first row a link and "and 5 more" a popover listing the rest, so it names every covered row |
| `addNote(subject?)`, `noteSubject()` | Add note, the one gesture: every door (N, "+", the selection bar, any menu's Add note, an empty Notes section) calls `addNote()`, which writes about the subject the inspector shows (the graph of the project on screen when nothing is selected) and keeps that inspector, also after Save. Pass `{ targets: [{ label, icon or swatch, go }], right }` only when the subject is not the inspector's (a filter step's row menu). The editor reads `AB.noteDraft` |
| `notesSection(count, [id, state]?, kind)` | the Notes section every inspector ends with: "2 notes -- Open in Notes" (the link opens those notes), or "No notes. Add note (N)". Folders, attributes, sources and saved views have none (it returns `null` for those kinds). Notes saved in this page view live in `AB.sessionNotes` (the Notes place writes them), and the count adds those about the inspector's subject, so a saved note shows the same number everywhere |
| `tree(rows, { label, onEye, go })`, `treeFooter(text or candidates, link)` | the paint tree (below) and the one line under it |
| `styleTab(o)` | the one Style tab (below). A number whose channel has a `unit` (`edge.width`, the arrow sizes: px) shows it after the value ("Width 8 px"), and so does every other reader of the value |
| `whyThisLook(lines, opts)` | the node, edge and several-elements Style body (below) |
| `announce(text)` | a polite screen reader announcement |
| `renameInPlace(nameEl, { onSave, onTab, focusAfter })` | rename in place: Enter or click away saves, Esc cancels, Tab renames the next |
| `mem.get(k)`, `mem.set(k, v)` | this browser's storage, wrapped so a private window just forgets |
| `modal({ title, body, foot, wide })` | a dialog on a dimmed backdrop: export, apply a file, settings, shortcuts. Loading data is not a modal: it is the Data page, a workspace page |
| `pageHead(title, { onCancel, backTip, trail })` | the one workspace-page header (the Data page, version history): a back arrow that cancels (tooltip `backTip`, default "Cancel", key Esc), the title saying the act ("Add to Entries", "Edit: entries"), the Esc hint. Cancel and Esc return to the screen that opened the page (the shell remembers it as `AB.pageOpener`; a direct link falls back to `closeTo`), or call `onCancel` when given |
| `roleTag(word, { go, second })` | the one role tag: a `k-badge` with the role word, its tooltip `word, second` ("Weight, set when loaded -- every run uses it unless the run picks another"). With `go` it is a link. The Data page grid, the Data place's attributes and the attribute inspector all use it; a local copy is a defect |
| `position(el, anchor, place)` | places an overlay element; `place` is `auto` (popovers), `below-start`, `below-end`, `above`, `above-start`, `right-start`, `center`, `above-toolbar` or `left-of-inspector` |
| `dockToggle()` | the table collapse button: put it at the end of your dock's tab strip |
| `drawing(name, alt)` | both theme images of `kit/canvas/<name>-{light,dark}.svg` |
| `placeHead(title, actions?)` | a left panel's 40 px title row |
| `graphHead(place, graphName, { notes, trail })` | the Graph and Data places' title row: a quiet place word, then the graphs switcher (and the graph's note count). Every view of the paint tree uses it |
| `treebar({ placeholder, value, onKey, onInput, menuGo, menuOpen, find })` | the find line under a list: the shared find field and the list options ellipsis (`#ab-list-btn`); with `find`, the one find over the project (see "The one find") |
| `typeGlyph(type)` | the one glyph per attribute type: "Abc" category (and id, text), "#" number, a calendar for time, "T\|F" yes or no, "[ ]" a list, "{ }" a sub-object kept whole. Every list, table header, attribute inspector header and tree row named after an attribute (a Size by or Label by row, a recipe's rows) uses it; never a lucide `hash`, `type`, `list` or `circle-check` for a type (those mean other things). In a kind slot it is drawn at 10 px so it fits the 20 px slot and names line up |
| `renderSection(ref, el)`, `close()` | as on `ctx` |
| `fx` | `kit/fixtures.json`, loaded before any render (`AB.fx.datasets.lesmis`, `.transactions`, `.scenarios`), plus `AB.fx.datasets.doorEntries`, which the shell adds (below), and `wide`, `nested` and `plainJson` from `kit/wide-nested.json` |

### The field list (`fieldList`)

One component in two sizes (spec 2.5), so a picker never changes form when the data grows: on Les
Miserables it is four rows and no find; on the hosts it is 69 rows with Find.

```js
AB.openFieldList(anchor, { kind: "color", element: "node", current: "role", onPick(name, type, field) { ... } });
el.append(AB.fieldList({ size: "panel", element: "node", checkboxes: shownNames, locked: ["id"], onToggle(name, on) { ... } }));
```

| option | what it does |
|---|---|
| `size` | `"menu"` (default): the dark list for bind, the Label "+", Color by, Size by, Width by, a filter step, a link's "by", Go to column, Weight, Insert attribute, a recipe's binding. `"panel"`: the same list inline (Data > Attributes, "N more attributes", the table's Columns) |
| `dataset` | default `AB.route.frame.dataset`: the fields are always the project on screen's, from `fieldsOf(dataset)` (a stand-in for graphty-element's `session.data.attributes()`) |
| `element` | `"node"` or `"edge"` keeps one side; default both |
| `kind` | the picker's type: `"number"` (Size by, Width by, Weight), `"color"` (Color by), `"text"` (Label), or none. Unsuitable fields are listed last, disabled, in one closed folder ("Not a number (45)" for a number picker, "Not usable here (3)" for the others), each with its reason on a second line ("several values") |
| `current` | the field checked (single choice) |
| `checkboxes`, `locked`, `onToggle(name, on)` | panel size with a checkbox per row (the table's Columns); `locked` names cannot be unchecked (the key) |
| `typed` | "Typed text" first (`onPick(null, null)`), for a label |
| `results`, `notes` | the Results group (default on where the project has results) and the Notes group (Note count; Latest note for `kind: "text"`; default on at menu size) |
| `items` | `[{ label, desc, disabled, check, onClick }]` instead of fields: the same list and find over any list past 15 that is not attributes (the "+" menu, Shape's 25 shapes, a node list) |
| `query` | the find's starting text (a route showing a search) |
| `trail(field)` | a node at a row's end (a role tag, a value); its text is also read out as part of the row's accessible name |
| `onPick(name, type, field)`, `onClose()`, `label` | the pick; what Esc does (and Tab at menu size; default `AB.close()`); the listbox's name. At panel size Tab always leaves the list, so never pass an `onClose` that does nothing |

**A node's name** is the Name role, one or more columns joined by a space: read it with
`AB.nameOf(dataset, record)` (the columns are `AB.nameCols(dataset, type)`; the nested project's
come from the last Load), never from a column, so the inspector, the walk, the table, a set's
members and a note's target all say the same Name.

What it draws: one group per table (`hosts`, `connections`; `researchers`, `institutions`, `links`),
open. Inside each, **In use (n)** first, each row tagged with what uses it (`Color (role)`, `Key`,
`Weight`: the element's `usedBy`, typed per sample in `USED_BY` in lib.js until then, plus
`Filter step` on every field a filter step reads, from the frame's `filterOn`), then the
rest, computed first, then by name; a row shows its fill ("84%") when not every element has a
value. Nested data gets folders only from its own nesting: a sub-object's fields under its parent's
full path, as graphty-element reports it (`attributes.profile.contact`), so a search for the stored
name (`attributes.orcid`) finds it; closed unless something inside
is in use; a list (`tags`) and a sub-object kept whole get their own glyphs. Past 15 rows a find
field leads: word-start matching (`wordMatch`), matches in bold, "2 matches" beside it and
announced; focus stays in the find over the listbox (arrows move, Enter picks, Esc clears, then
closes). No match: `No match for "xyz"` and Clear. Every name and path takes the middle ellipsis
(`truncMiddle`). Without a find the listbox itself holds focus (arrows, Home, End, Enter or Space;
Right and Left open and close a folder).

A field is `{ name, label, parent, type: "cat" | "num" | "time" | "bool" | "id" | "text" | "list" |
"whole", fill, usedBy, computed }`; `name` is the stored name or path that a binding writes.

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
`graph-place/door-entries` is its paint tree, and the rail's Graph, Data, Notes
(`notes-place/door-entries`) and Views (`views-place/empty`) stay in this project. By default it is
the worked example's end state: One edge per Pair, unmatched rows left out. Load on the Data page,
and Apply on Edit: entries, record the result in `doorEntries.loaded.per` (`"pair"`, `"row"`, or
`"nodes"` for each entry as a node) and the Add choices in `loaded.add`; Edit: entries opens on
what was loaded. Every view of the loaded graph reads `doorEntries.loadedEdges()`,
`loadedTypes()` (person, building, entry, total) and `loadedWeight()` (Row: 4,180 edges, no
weight; Pair: 1,306 edges, weight count; as nodes: 4,633 nodes and 8,392 link edges, no weight). Load goes through `canvas-and-states/door-entries-loading` to `graph-place/door-entries`;
the transfers go through `canvas-and-states/transfers-loading` to `graph-place/transfers-loaded`.
Each entry as a node draws an entry dot between its person and its building.

The Les Miserables and transfers fixtures are unchanged.

### Counts the shell derives from the fixtures

Some counts follow from the kit's fixtures but are not listed in them. The shell works them out
once at boot (`derivedCounts` in `app.js`), so a section reads them and never types them
(`--counts` fails a hand-typed one):

- `AB.fx.datasets.lesmis.edgeList`: the published 254 edges as `[source, target]` row ids (the
  same edges the canvas drawings use; every row's `degree` matches it).
- `AB.fx.datasets.lesmis.frame.legend.rows[i].edges`: the edges with both ends in that group
  (group 2: 14 nodes, `edges` 28). Write "Group 2" as `AB.count(g.count, "node") + ", " +
  AB.count(g.edges, "edge")`.
- `AB.fx.datasets.nested.derived`: `coauthorItems` (coauthor_ids items, one edge each under
  Several edges per item), `coauthorPairs` (the distinct pairs they name, one edge each per pair),
  `affiliations` (affiliations items) and `linksToResearchers` (links rows whose target is a
  researcher: the only links that make edges while institutions are not loaded).
- The nested project's node count, as loaded, is `AB.projectCounts("nested").nodes`; its whole
  record count is `nested.records`.

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

**The header**, left to right: main menu (a 32 px button), project name (click: its menu; double-click or F2:
rename in place), Undo, Redo, the privacy chip, the filter chip. The privacy chip reads "Local only"
while usage data is off and "Usage data on, content masked" after opt-in, and always opens Settings >
Privacy. Its state is `AB.usageData`; whatever answers the question (Settings > Privacy's switch, the
start screen's card) calls `AB.setUsageData(on)`, which redraws the header (`settings/privacy-on` and
`start-screen/answered` imply it on, `settings/privacy` and `start-screen/declined` off). The filter
chip always shows: "Full graph", or the frame's `chip` ("812 of 3,000 nodes") while a filter step
removes something. It is drawn as a button (a border and a caret), not a label like the privacy
chip, and opens the project's filters (Data > Filters, or the project's Data place when nothing is
filtered). Its tooltip lists the steps that are off ("Filters, off: amount is at least 1,000"), from
the frame's `stepsOff` (the names of the project's steps that are off; the Data place sets it, and
`AB.projectFilter[dataset].stepsOff` carries it to every place of the project). A counted chip has one wording, `AB.count(left, "node", { of: total })`,
with no "Filtered:" before it: the shell rewrites any counted chip a section gives to that wording,
so `AB.route.frame.chip` always reads "60 of 77 nodes". A chip with no count ("Filtered: neighbors
of Ana Ruiz", where the fixtures hold none) is shown as given.

**Text contrast.** A fact the reader acts on is at body-text contrast (`var(--cm-text)`): where the
data is, the filter chip, a count and its scope ("812 of 3,000 nodes (the full graph)"), a source's
counts, a step's result, a row's count, the Paints line, a problem's "what to do", and the "not
drawn" message. Caption gray (`var(--cm-text-secondary)`) is only for a truly secondary note: field
labels in a popover, key chips, role tags, the "Esc" hint, a tooltip's second line. A section's own
line under a row (the Data place's source and step lines) follows the same rule.

**Every region has a heading.** The shell gives the rail, canvas, toolbar, table dock and any left
panel or inspector without one a visually hidden `h2` ("Places", "Graph drawing", "Canvas toolbar",
"Table", "Left panel", "Inspector"), so a screen reader names the region that holds focus.

**The rail**, top to bottom: Graph, Data, Views, Notes (message-square), Assistant. Rail places
have no keys.

**Keys the shell owns** (outside text fields): Ctrl+, Settings; Ctrl+K Quick actions; Shift+A
Analyze; P the Path popover; L the legend; / the Graph place's find box; ? shortcuts; 5 switches 2D and 3D (the mode it picks holds
on every screen until a route that names its own mode opens); Shift+T the table; Esc
closes one level, starting with the innermost (a handler that closes, cancels or clears something
calls `preventDefault()`, and the shell then leaves that press alone), and with nothing open while
design notes are hidden (the participant view too) it shows them again. A menu, popover or dialog
drawn over a selection closes back to that selection (its inspector route), so one Esc never also
clears it. Ctrl+Z and the header's Undo are one action: they restore a cleared selection first (above),
else press the notice's own Undo; Ctrl+Shift+Z, off macOS Ctrl+Y, and the header's Redo press the
notice's Redo. A tree row's Delete is the same from its key, its row menu and its inspector menu
(`deleteRow`); Shift+Arrow on the
drawing walks from node to node (graphty-element's canvas key, above). F2 renames (the tree, the inspector header, the project name). Ctrl+G groups what
is selected: with focus in the tree it is New folder, anywhere else the selection bar's Create set. T is not a key: the time slider opens
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
  reads "Pick an attribute" in gray, its accessible name is "Label, Right: no attribute, draws nothing", and
  it writes nothing. Esc leaves the draft. "+" disappears once every position is used. **Show
  labels** (`node.labelShow`, `edge.labelShow`: graphty-element's label `enabled: false`) is offered
  only where a row beneath this one sets a label (`styleTab({ labelBelow: true })`) and the row has no
  label line of its own. With no label drawn anywhere the "+" holds one item, "label line", so it
  reads "Add label line" and runs at once; the Label heading word runs the same command. A bound line
  states its result under itself (`labelStatus`, "77 names, 64 hidden to avoid overlap"). Bind or a click on a label line's value opens `style-pickers/label-style`. Without
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
  when the row is hidden; a locked row shows its lock until hovered). A row with a `menu` shows a
  "..." on hover, focus and the selected row, in the note slot's place (the inspector's Notes
  section says that count), so it never covers a count and the eye keeps its slot; it opens the same menu as right-click and Shift+F10.
- A number in `count` (also a bare numeric string such as "1") is written with its noun by
  `count()`: `countNoun` (default "node": a set, group, community, path or label row counts nodes),
  or "item" for a row with `countTip`, whose tooltip says in full what it counts. A string `count`
  with its noun ("6 groups") is drawn as given, at body-text contrast. The note slot reads "1 note",
  never a bare number by an icon; a closed row adds its `notesInside` (notes about its children) to
  its own, "3 notes", its tooltip "1 note about Louvain, 2 notes inside; expand to see them". The
  slot is the one place a row counts notes: never draw a second badge beside it.
- `status` ("running", "queued", "partial", "stale", "error", "filtered") replaces the kind icon,
  its sentence (`statusText`) in that icon's tooltip. The only line under a row is a running
  progress bar (`progress` 0 to 1). Counts are blank when empty.
- One Tab stop, roving focus on the selected row; arrows, Home, End; Left and Right collapse and
  expand; Enter opens; Space toggles the eye (Alt-click solos); F2 renames (Tab renames the next);
  Delete deletes with the Undo notice (built-in and pinned rows refuse; a row that holds rows names its count, "Deleted Louvain and 6 groups", so the key and a row menu's Delete, which calls `deleteRow(name)`, are one action with one notice); Shift+F10 opens `menu`;
  Ctrl+] and Ctrl+[, or a drag, move a row among its siblings (a pinned row never moves). One click selects in place and keeps the left
  panel, so a real double-click on the name renames. A row whose `go` replaces the left panel (a
  Sources row opens the Data page) sets `waitDouble: true`: its single click waits out the
  double-click interval (350 ms) before it opens, the Notes place's rule, so a double-click still
  renames; Enter opens at once. Each row carries `data-row`, so focus finds it again after a redraw.
  A table row in the dock is found the same way by its `data-who`: clicking a row that opens its
  inspector keeps focus on that row, so Ctrl+F still searches the table.
- `treeFooter([[text, link], ...])`: one line under the tree; the first (most specific) wins.

## Commands

`AB.COMMANDS` holds every command that has two or more doors (Data page doors: `add-data` opens
`data-page/entries`, `edit-source` and `replace-file` the source row's two; context menus, Quick
actions and the Data place all take them from here): `{ label, shortcut, home: "Place >
Control", disabledReason, go or onClick, more, toggle, on }`. Every door takes its label and key
from `cmd(id)`. A two-state command has `toggle: [label when on, label when off]` and `on()`: Pause
layout / Resume layout, Switch to 2D / Switch to 3D, Hide legend / Show legend, Hide table / Show
table. A label ends in "..." only when the command asks for more input (`more: true`); `cmd()`
warns otherwise. A command's `desc` is its tooltip in every menu (Open project or file...: "A data,
recipe or style file is added to this project; a project file opens in its place."). A label holding
`<attribute>` is filled by `cmd(id, { attribute: name })`: "Select where amount is...". Every door
uses its command's label word for word; a door that rewords it is a second pattern.

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
  `data-needs` on a design-note-only control). "Hide design notes" in the review bar hides every
  chip, every `data-needs` control and every menu item marked `needs`, so the user-test build lists
  only what works. Product text that is not marked is never hidden. The owner reviews with notes
  showing; user tests run with them hidden.
- **A disabled control always says why, to a participant too.** In the participant view every
  tooltip, menu reason and notice that says "needs graphty-element" is rewritten once, in `lib.js`
  (`plainReason`): the reason stays and the library's name goes. "Needs graphty-element: X" reads
  "Not available yet: X", "Rename needs graphty-element: X" reads "This name cannot be changed: X",
  "A needs graphty-element" reads "A is not available in this version", any other "graphty-element"
  in that text reads "this version", and "(filed)" is dropped. Text that names graphty-element on
  purpose ("graphty-element's default") is not touched. Never write "Not available yet" alone.
- **Disabled is grayed.** Every element marked `aria-disabled="true"` is drawn in the disabled text
  color by default (`app.css`); the kit's buttons, menu items and toolbar buttons keep their own
  disabled look, and a section may still style its own. A name that cannot be renamed is content,
  not a control, and is not grayed: the refusal is in its tooltip.
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
- One type scale: 11 px for every control and body line (13 px for a page or project title, 15 px for a
  page heading, mono at 11 px too), weight 450 for text, 550 for emphasis and headings (400 for the kit's
  quiet second line). No 10, 12 or 600; a size or weight off this scale is drift.
- Nothing is dead: every clickable control navigates, opens its popover or menu, or changes
  something visibly in place. A command the skeleton does not model calls `AB.flash(...)`.
- No verbs in inspector bodies: the only button in a body is the state bar.
- Styling is left to the user: the app adds no look of its own (no built-in dimming, no default
  note color). A style comes from a row or from graphty-element's defaults.
- Screen text is for a stranger: no internal ids, no process narration, no "studio decision"
  labels on the product surface.
- The review bar (pink) is not the product. Do not put product controls in it. Its "Hide design
  notes" switch comes first after the title, so a narrow window never pushes it off screen. While
  notes are hidden, the review bar is hidden too (no section or state names, no state switchers),
  and a small quiet "Review" button in the bottom left corner (`#ab-leave-study`) and Esc with
  nothing open bring both back, so the view is never a trap, on a touch screen too. The participant
  view that study.mjs opens (`ab.designNotes` set to `participant`) is the same view and leaves the
  same two ways, except that the Review button is invisible there until hovered or focused.
- Check your section at 1440 x 900, 1366 x 768 and 1024 x 768, light and dark, with no
  horizontal page scroll and no console errors.

## Shared interaction rules

Rules 1, 2, 4, 6, 7 and 8 live in shared code, so every section gets them; every section keeps 3, 5 and 9.

1. A menu acts on what it was opened on. A row's "...", its right-click and Shift+F10 name the row
   (`AB.menuTarget`); no menu acts on a fixed row.
2. When nothing is selected, the selection is empty and the inspector shows the graph on screen as
   its subject. Escape closes the innermost open thing first, then clears the selection
   (`clearSelection()`) and leaves the graph's panel open.
3. Moving focus never changes the selection or what is painted: opening a note box, a popover or a
   menu leaves every row's paint as it was.
4. An inspector keeps the tab the reader chose while its subject changes to another of the same
   kind (a Shift+Arrow walk step): `inspector()` remembers it per kind.
5. A read-only link does one thing: it opens what it names, never a menu or another command.
6. Every route draws one project (`frame.dataset`), and every door out of it stays in it: an
   overlay keeps the panels, an inspector keeps the place, and a link to a place's default state
   opens the project's own state of that place, as the rail does.
7. Every count is written by `count()`: it names its unit and, as a part, its whole.
8. Every door to a command uses its one `cmd()` label and key, word for word.
9. A row click opens that row's own panel.

## Checking routes (`study.mjs`, run from `design/ui/prototype/`)

- `node app-b/study.mjs --check <route> ...`: each route renders with no stub, no failure, no
  script error, no 404 and no reviewer word ("skeleton", "not wired", "not modeled", "stand-in")
  in visible text or a tooltip outside a design note. A route may end in `@1024` (in `--check`, `--shoot`, `--try` and
  `--matrix`): it opens in a 1024 x 768 window instead of 1440 x 900.
- `node app-b/study.mjs --counts`: fails on every fixture count (a dataset's node, edge or record
  count) typed by hand in a section file, outside comments, before any counted noun (nodes, edges, accounts,
  proteins, patents, researchers ...): "77 nodes", "124,318 patents", "of 254", `count: 77`; on any
  count found anywhere in the fixtures (a nested document's record arrays and relationship counts,
  a list's length, and the nested counts the shell derives in `nested.derived`) typed inside the
  formatter (`AB.count(242, "row")`, `AB.count(x ? 242 : 0, ...)`, `{ of: 254 }`) or picked by
  either branch of a ternary (`x ? 514 : 510` fails on both; a duration or size such as `loadMs` is
  not a count); on a
  part of a whole written another way than `AB.count(n, noun, { of })` ("Filtered: " before a
  count, "3,000 to 812 nodes", "3,000 -> 812", two numbers around an arrow icon); on a
  delete notice worded its own way (`deleted("Louvain and " + n + " communities")`, ", its 6
  communities and ...": a tree row's Delete is `AB.deleteRow(name)`, and any other count in a notice
  goes through `AB.count`); and on a banned scope string anywhere in the skeleton ("within 1%", "near #", "not used yet", "Change..."); and on
  a section that assigns `AB.projectCounts` (it registers a project's counts with `AB.countSource`);
  and on a string a participant can read (a notice, a tooltip, a label) holding a reviewer word,
  "skeleton", "not wired", "not modeled" or "stand-in". Say what the product would do, or "(not
  available yet)"; a design note (`openQuestion`, `needsElement`) is review-only and may keep them,
  but only when the text is written inside the call.
- `node app-b/study.mjs --fixes`: the defects that decided round 8's tier 1 tasks, each a participant's
  click-through with `--expect`: a Betweenness run finishes and lands listed and painting; hiding,
  showing alone and Move above change the legend; a size choice on Les Miserables is drawn with its
  range; Add on the add-rows page keeps the layers and the filter; Quick actions' Add label line adds
  a line in the project on screen; the Label "+" adds a line with no Show labels. Run it before a
  round's sessions: until every line is ok, those tasks measure the prototype.
- `node app-b/study.mjs --prove`: proves `--check` fails on an unknown section, an unknown state and
  a stub (a section with no render, planted for the run), and passes a good route; and proves `--try`:
  `--type` types into a focused box and exits 1 with nothing focused, `--shift-click` and
  `--ctrl-click` leave two rows selected where a plain click leaves one (in the table and in the
  paint tree), a canvas label (Javert) is clicked and opens its node, a shared name (Louvain) prints
  `ambiguous`, `Louvain#99` misses with "only N controls", `role=treeitem:Louvain` opens the run's
  inspector, a hover by name prints the tooltip, a reviewer word is caught, and an unknown step
  exits 2.
- `node app-b/study.mjs --task <id> <route> ...`: a task's participant shots, `01.png` on. Every route
  must draw the same project (`frame.dataset`); a mix exits 1 and writes no `routes.json`.
- `node app-b/study.mjs --matrix`: checks `../study/structure-comparison/state-matrix.md`. It fails
  on a blank cell, an `N/A` with no reason, a `BUILD` left in a cell or in the prose's backticks, a
  section of `--list` that no table row names, a route that is unknown or fails `--check`, and a
  route that opens a menu, popover or dialog and leaves focus on the page body.
- `node app-b/study.mjs --try <out.png> <route> --key Shift+ArrowRight ...`: a click-through. Steps:
  `--click`, `--rclick`, `--dblclick` (rename), `--shift-click`, `--ctrl-click`, `--alt-click` (add
  to the selection, solo a row), `--hover` (a name), `--key` (a key), `--type` (text, typed a key at
  a time into what has focus; exits 1, typing nothing, when nothing that takes text has focus),
  `--wait` (milliseconds, for what the app does on its own: a run finishing, a load landing),
  `--expect` and `--expect-not` (text on screen; `role=menu` for a role; `selected=2` for exactly two
  selected rows), `--hover-at x,y` and `--hover-icon n` (hover a point, or the nth icon-only control
  in page order, to read a tooltip whose name is unknown). Every hover prints the tooltip. A name
  several controls share prints `ambiguous: "<name>" matches N controls (...)` and clicks the first;
  `"<name>#2"` picks the second and `"role=treeitem:<name>"` only that role. A name no control has
falls back to a node's label drawn on the canvas (exact, then partial; `AB.drawnLabels`), clicked or
hovered at the center of its box. Type text with one `--type "<text>"`, never `--key` per
character: single keys are app shortcuts. A script error, a 404
  or a reviewer word on screen exits 1. An unknown step is refused (exit 2) before the browser opens.
- Every page a run opens starts from an empty browser store (only the participant view and the
  theme set), so a state one route remembers, such as the legend turned off, never carries into the
  next route.
- Every run holds one shared browser slot (`../kit/with-browser.sh`), runs one browser, gives every
  25 routes a fresh context and closes it.
