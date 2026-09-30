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
    rail: "graph",                   // optional: which rail place is lit (graph, data, notes, assistant)
    frame: { left: "graph-place/at-rest", dock: false },  // optional: what the other regions show
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
default section. Examples: the node inspector wants `{ left: "graph-place/at-rest" }`; the load
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
| `inspector({ icon, title, kind, meta, tabs: { Style: fn, Data: fn }, tab, body })` | the inspector: header, then tabs (each a function called when shown; the last tab per kind is remembered) or `body` |
| `tree(rows, { label, onEye })` | the paint tree. A row: `{ name, kindIcon (icon name or node), swatch, count, notes, notesInside, eye (true, false, or null for no eye), locked, pinned, dim, open, children, selected, go: [id, state], menu: [id, state] }`. The eye toggles in place, Alt-click solos, the triangle opens and closes, right-click goes to `menu` |
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

Anchors for overlays: `#ab-project` (project name), `#ab-filter` (filter chip), `#ab-zoom` (zoom
and view button), `#ab-rail-menu` (main menu), `[data-place=graph]` (rail buttons),
`[data-tool=Analyze]` and the other toolbar buttons by label.

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
- Screen text is for a stranger: no internal ids, no process narration, no "studio decision"
  labels on the product surface. Label a studio decision only in design notes, never in the UI.
- The review bar (pink) is not the product. Do not put product controls in it.
- Check your section at 1440 x 900, 1366 x 768 and 1024 x 768, light and dark, with no
  horizontal page scroll and no console errors.
