# Refined B skeleton: how to build a section

A clickable, layout-only skeleton of refined structure B
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
| `workspace` | replaces left panel, canvas and inspector; top bar and rail stay (version history, comparison) | none |
| `full` | replaces everything under the review bar (the start screen) | none |

**frame**: an object, or a function of the state returning one, naming what each other region
shows: `"<section-id>/<state>"`, or `false` to close that region (`left`, `right`, `dock`), or
`top: false` / `rail: false` to drop the top bar or rail. Regions you do not name show their
default section. `mode` is the graph's view mode, `"3d"` by default (graphty-element's default);
set `mode: "2d"` for a 2D state. Read it as `AB.route.frame.mode`: the toolbar face and the
Camera menu follow it. Examples: the node inspector wants `{ left: "graph-place/at-rest" }`; the load
step wants `{ full: "start-screen/returning" }`; an attribute inspector wants
`{ left: "data-place/attributes" }`.

**ctx**: `{ state, region, section, fx, renderSection(ref, el), close() }`.
`ctx.renderSection("toolbar/at-rest", el)` draws another section inside yours (the selection bar
draws itself, then the toolbar under it). `ctx.close()` goes to `closeTo`.

**Stubs.** A section with no `render` is "not built yet". Where it is also a region's default
(`graph-place`, `inspector-nothing-selected`, `canvas-and-states`, `toolbar`, `table-dock`) the
shell draws its frame-at-rest baseline in `app.js` with a pink "Not built yet" banner; everywhere
else a placeholder card. Once your file has a `render`, it replaces the baseline everywhere. The
baseline is a starting point: read it in `app.js` (`baseline.left`, `.right`, ...) and outdo it.

## Helpers (`window.AB`; `h`, `icon`, `link` and `registerSection` are also globals)

| helper | returns |
|---|---|
| `h(tag, attrs?, ...children)` | an element. `attrs.class`, `attrs.style`, `attrs.on = { click: fn }`, any `aria-*` or `data-*`. Children: strings, nodes, arrays; `null` and `false` are skipped |
| `icon(name, size?)` | a sprite icon; `size` "sm" (12) or "lg" (24). Names: `kit/icons.svg` (lucide) |
| `link(id, state, label, attrs?)` | an `<a>` that navigates |
| `go(id, state)`, `href(id, state)` | navigate; the hash |
| `nav(el, id, state)` | makes any element navigate on click and Enter |
| `act({ go: [id, state] })` or `act({ onClick })` | attrs for `h()` that make an element act |
| `button(label, { kind: "secondary" or "ghost", icon, go, onClick, disabled, block })` | a `k-btn` |
| `iconButton(icon, label, { go, onClick, pressed })` | a `k-icon-btn` with a label for screen readers |
| `field(value, { icon, caret, go, onClick })` | a `k-field` (an input or select look) |
| `chit(color, round?)`, `ramp(from?, to?)` | a color swatch; a sequential ramp swatch |
| `section(title or { title, count, actions, collapsed }, ...children)` | a `k-section` with its head |
| `data(name, value, { go }?)` | a name and value row; with `go` the value is a link |
| `row({ icon, swatch, label, trail, selected, go, onClick })` | a `k-row` |
| `tabs(names, active, onChange)` | a tab list that switches in place |
| `inspector({ icon, title, kind, meta, provenance, menu, stateBar, changed, builtin, renameDisabled, onRename, tabs, tab, body })` | the one inspector frame (below) |
| `section({ title, count, actions, collapsible, collapsed, summary, key, remember }, ...children)` | with `collapsible` the head opens and closes the body in place; closed, `summary` shows as one line; the choice is remembered per `key` in this browser |
| `notesSection(count, [id, state]?)` | the Notes section every inspector ends with: a count and "Open in Notes" |
| `tree(rows, { label, onEye })` | the paint tree. A row: `{ id, name, kindIcon (icon name or node), swatch, count, notes, notesInside, eye (true, false, or null for no eye), locked, pinned, dim, open, children, selected, go: [id, state], menu: [id, state], builtin, renameDisabled: "reason", onRename(name), queued, partial, progress }`. The eye toggles in place, Alt-click solos, the triangle opens and closes, right-click goes to `menu`. One click selects the row in place and sets `AB.keepLeft`, so the shell does not redraw the left panel and a real `dblclick` on the name renames. Rename below. `progress` is 0 to 1 (a bar) or text; `queued` and `partial` are text or `true` |
| `styleTab({ kinds, set, bound, inherited, openSection, collapseAll, error, kind })` | the one Style tab, for every row that paints (below) |
| `whyThisLook(lines, { coverage, coverageReason })` | the node, edge and several-elements Style body (below) |
| `needsElement(reason)` | the one "needs graphty-element" mark: tertiary text, dotted underline, the reason as its tooltip and accessible text |
| `cmd(id, extra?)`, `COMMANDS` | a menu item from the one command table (below) |
| `cameraFace({ view, moved, zoom, mode })` | the Camera menu face (`#ab-zoom`): camera icon, view name, "moved", 2D zoom, caret |
| `layoutChip("running" or "paused" or "settled")` | the layout chip (`#ab-layout-chip`); Pause and Resume swap it in place |
| `legendClose(card)` | a legend card's close button; closing leaves a "Legend" chip that brings it back |
| `announce(text)` | a polite screen reader announcement |
| `mem.get(k)`, `mem.set(k, v)` | this browser's storage, wrapped so a private window just forgets |
| `menu({ anchor, place, items })` | a dark `k-menu`. Item: `{ label, shortcut, go, onClick, sub, check, disabled, desc }`, `{ sep: true }`, `{ heading }`. An item with no target flashes "not wired" |
| `popover({ anchor, place, title, body, foot, width })` | a `k-popover` with a close button |
| `modal({ title, body, foot, wide })` | a dialog on a dimmed backdrop |
| `position(el, anchor, place)` | places an overlay element; `place` is `below-start`, `below-end`, `above`, `above-start`, `right-start` or `center` |
| `notice(text, { label, go or onClick })` | a dark notice (toast) |
| `dockToggle()` | the table collapse button: put it at the end of your dock's tab strip |
| `drawing(name, alt)` | both theme images of `kit/canvas/<name>-{light,dark}.svg` |
| `placeHead(title, actions?)` | a left panel's 40 px title row |
| `flash(text)` | a short-lived notice, for a control the skeleton does not wire |
| `renderSection(ref, el)`, `close()` | as on `ctx` |
| `fx` | `kit/fixtures.json`, loaded before any render (`AB.fx.datasets.lesmis`, `.transactions`, `.scenarios`) |

Anchors for overlays: `#ab-project` (project name), `#ab-filter` (filter chip), `#ab-zoom` (the
Camera menu face; the id is kept from version 1), `#ab-layout-chip` (the layout chip beside it),
`#ab-rail-menu` (main menu), `[data-place=graph]`, `[data-place=views]` and the other rail
buttons, `[data-tool=Select]`, `[data-tool=Analyze]`, `[data-tool="Quick actions"]` and
`[data-tool="View mode"]` on the toolbar.

The rail, top to bottom: Main menu, Graph, Data, Views, Notes, Assistant. Rail places have no keys.

Keys the shell owns (outside text fields): Ctrl+, Settings; Ctrl+K Quick actions; Shift+A
Analyze; P the path pick mode; ? shortcuts; 5 the view mode; Shift+T the table; Esc closes.
F2 renames (the tree and the inspector header). Never bind W, A, S, D, Q, E, the arrows, = or -:
they are graphty-element's canvas keys.

The canvas has no 3D drawing: every state keeps the Les Miserables art, and only the toolbar
face ("3D") and the Camera menu say which mode is on. Do not draw new canvas SVGs for 3D.

## The inspector frame (every right-side section)

One frame for every kind of selected thing, so every inspector reads the same way:

- **Header line 1** (24 px): the icon and the name. Double-clicking the name (or F2 on it; the
  name takes focus) renames it, unless
  `builtin` (flashes "Built-in rows keep their names") or `renameDisabled: "reason"` (flashes
  the graphty-element reason). No eye in the header: visibility lives in the tree.
- **Header line 2** (20 px): `kind`, the `provenance` link (`[label, id, state]`, for example
  "from Louvain, Sep 28") and "..." (`menu: [id, state]`, that kind's `context-menus` state: the
  "..." menu is the right-click menu, word for word).
- **`meta`** is a status sentence ("Finished: 6 communities..."): it opens the body on every
  tab, never a third header line, so the tab strip sits at the same height for every kind.
- **State bar** (`stateBar: { text, actions: [{ label, go or onClick }] }`): one line under the
  header, on every tab, with a changed mark in the header. Only for a costly commit ("Settings
  changed since the run -- Rerun | Run as copy | Revert").
- **Tabs**: Style, then Data. The strip shows only with two or more tabs; one tab or `body` gets
  a 32 px spacer so the body starts at the same height and nothing jumps.
- **Bodies**: `section({ collapsible: true, summary })` blocks, 24 px data rows, counts as links
  that select what they count, and `notesSection()` last.

**No verbs in inspector bodies.** A body shows and edits properties. The only button in a body
is the state bar. Every command (Rerun, Keep as set, Show in table, Select members, Compare...)
goes in the "..." menu, which is the kind's context menu. No "+ Add note" buttons.

## The Style tab

`styleTab(o)` is built from `AB.CHANNELS`, a stand-in for graphty-element's `channelsFor()`
descriptor list (14 node properties, 13 drawn; 21 edge properties). `set`, `bound`, `inherited`
and `error` are keyed by the element's channel id (`"node.color"`, `"edge.arrowHeadSize"`).

- A Nodes | Edges switch with counts of what the row sets, or none when `kinds` has one entry.
- Sections in a fixed order: Nodes Fill, Shape, Effects, Label, Tooltip, More; Edges Line,
  Arrow head, Arrow tail, Label, More. Only set (or bound, or inherited) properties show; an
  empty section is a header with "+" (`style-pickers/plus-menu`); a closed section shows a
  one-line summary. `openSection` opens one section; `collapseAll` closes them all (Everything).
- A line: name, value (opens `style-pickers/color`, `choice`, `label-style` or `token-edit`; a
  boolean is a switch), bind (`style-pickers/bind`), and "-" (removes it in place). Inherited
  values are secondary text with a link glyph naming the source row. `error` shows on the line.
- The search icon in the tab header opens a filter over set and unset properties.

## Why this look

`whyThisLook(lines, opts)`: one 24 px line per layer that wins at least one property, top
first: a 12 px swatch (`swatch`: a color or a node such as `ramp()`), the name (a link to `go`)
and one token per property in `wins` (opens `style-pickers/token-edit`; `values[prop]` is its
tooltip). Lines with no `wins` fold into "N more rows match but are covered". `locked` marks an
element-owned layer. `opts.coverage` adds the per-line `coverage` counts and the needs mark.

## Commands

`AB.COMMANDS` holds every command that has two or more doors: `{ label, shortcut, home,
disabledReason, go }`. The main menu, context menus, Quick actions, the selection bar and the
toolbar take labels and keys from `cmd(id)`, so every door says the same thing. Quick actions
shows each entry's `home` ("Toolbar > View mode"). Add a command here rather than typing its
label in a section.

## Rules

- Plain ASCII, American spelling (color, gray, behavior, center, analyze).
- Real content only: numbers and names from `kit/fixtures.json` (Les Miserables for the graph,
  transfers for Data and Path). Never lorem ipsum, never an invented count; if a number is not in
  the fixtures, word the state so it needs none.
- Chrome colors only from `var(--cm-*)` and the kit's `--k-*` roles; data colors from the
  fixtures. Every class in `kit/kit.css` is documented in `../kit/README.md`.
- Nothing is dead: every clickable control navigates, opens its popover or menu, or changes
  something visibly in place (an eye, a tab, a disclosure). A command the skeleton does not model
  calls `AB.flash("... (not wired in the skeleton)")`.
- Every control graphty-element cannot back yet is drawn disabled with `AB.needsElement(reason)`,
  so the mark looks the same everywhere.
- No verbs in inspector bodies (above): the only button in a body is the state bar.
- Styling is left to the user: the app adds no look of its own (no built-in dimming, no
  default note color). A style comes from a row or from graphty-element's defaults.
- Screen text is for a stranger: no internal ids, no process narration, no "studio decision"
  labels on the product surface. Label a studio decision only in design notes, never in the UI.
- The review bar (pink) is not the product. Do not put product controls in it.
- Check your section at 1440 x 900, 1366 x 768 and 1024 x 768, light and dark, with no
  horizontal page scroll and no console errors.
