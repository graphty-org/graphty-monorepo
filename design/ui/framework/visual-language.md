# Visual language

**Job.** What the chrome graphty's app draws looks like, as roles and rules over compact-mantine.
**Split rule:** what graphty-element draws (the canvas, its marks, the legend, labels, figures, 3D
and XR) split out to `canvas-drawing.md`, because its reader builds the element; a rule that
belongs to both is written in the element's document and cited here. **Not here:** token values (figma-spec 2); component jobs (`interface-specification.md`);
behavior and thresholds by graph size (`state-matrix.md`); what a legend lists, encoding kinds,
scales and the categorical ceiling (`options-and-encodings.md` 5, 6); interaction, placement that
moves and timing (`interaction-patterns.md`); element properties and their detection
(`element-contract.md`); wording (`content-design.md`); departures from Figma
(`figma-crosswalk.md` 4, the one ledger). **Owner:** visual designer. **Ceiling:** the README's
table. **Validated by:** "Verification".

**Values live in the library that draws them; roles and rules live here.** Every chrome color,
size, radius, shadow, duration and row height is a compact-mantine `--cm-*` token, with its light,
dark and Figma values in compact-mantine `design/figma-spec.md` section 2, whose table 2.1 maps each
token to its Figma variable. A value copied here drifts the first time the library changes, so the
only numbers below are provisional limits, each marked.

**Thesis: hue on the canvas belongs to data.** Hue and luminance are a display's strongest channels
(Munzner, ch. 5), and Tufte's data-ink argument gives them to the data. Figma's chrome is neutral
gray with one saturated role; graphty keeps that and goes one step further on the canvas: Figma's
canvas marks are blue, graphty's are neutral, because any hue a mark spends a reader may take for
data. **Visual hierarchy**, highest first: marked elements over unmarked ones, nodes over edges,
data over chrome. Most rules below are one layer of that ranking.

## The chrome rules

**A1. The hue budget.** Chrome is achromatic except:

- the **accent family**, every token of it (`--cm-bg-brand`, `--cm-bg-selected`,
  `--cm-bg-selected-secondary`, `--cm-border-selected`, `--cm-border-selected-strong`,
  `--cm-text-brand`, `--cm-icon-brand`): the live or chosen state (selected,
  focused, armed, open) or a surface's one primary action; never data, a heading, a count or a
  resting icon. **The allow-list** is closed: a selected row, a row whose element is a member of
  the selected set, group or path (`--cm-bg-selected-secondary`, A5), a focused control, a
  surface's primary action button, an armed tool, an open trigger. **Never on the canvas**: the
  file-drop target is chrome drawn over the canvas region, a 1 CSS px `--cm-border-selected` edge
  with no fill tint over the data, and the one candidate exception, an
  accent third band outside the selection pair, waits on the first-click study (`canvas-drawing.md` 2);
- **danger**: error ink only; graphty draws no confirm dialog of its own (the browser's save picker
  asks about overwriting), and every project change is undoable, so a red button inside the project
  is a defect;
- **warning**: the warning glyph, a yellow fill (`--cm-bg-warning`) with a dark ink mark inside, as
  Figma draws it; the dark mark carries the 3:1 contrast;
- **data paint** where A2 and A10 allow it.

Figma's success green and component purple are not used. **Purple is rejected, not deferred**:
recipe-origin and automatic layers exist, which is Figma's "applied from a shared definition", but a
second saturated chrome hue would sit in the same row as data chits and compete with them. The
origin is a word in secondary text (A7); the rejection is a row in `figma-crosswalk.md` 4.3.

**Enforcement.** The gate is a lint that fails on any color literal, palette prop or
`--mantine-color-*` in `graphty/src` outside tests; on any accent-family token referenced outside
the allow-list above, whether by its `--cm-*` name or by a `PANEL_INK` key that resolves to one
(`ACCENT`, `SELECTED`, `ON_SELECTED`, `FOCUS`, `BRAND_TEXT`, `SELECTED_SECONDARY`); and on any use
at all of the tokens this rule says are never used: success (`--cm-bg-success`, `PANEL_INK`
`SUCCESS`), component (`--cm-text-component`, `--cm-bg-component-tertiary`, `PANEL_INK`
`COMPONENT`) and the hint banner (`--cm-bg-info`), because graphty draws no banner
(`state-matrix.md` 2). The lint is filed in slice 0 (`implementation-mapping.md` 10.1) and keeps its
own list in `graphty`. The semantic rule (never data, a heading, a count or a
resting icon) cannot be linted; the story audit checks it. A screenshot audit that masks the canvas
and counts saturated chrome pixels outside the allow-list is an audit only, with its anti-aliasing
tolerance set once and cited, because focus rings and swatches make that tolerance a judgment.

**A2. Chrome never borrows a data color.** A chip, swatch or paint row shows one; nothing around it
takes it: no tinted row, no colored name, no colored count. Swatches read the element's resolved
value (`canvas-drawing.md` 7); the app keeps no copy of a palette (root `CLAUDE.md`). **A set's swatch** in Sets and
paths draws what graphty-element returns for that set's paint: a constant chit, a strip when the
layer binds a scale, or nothing. The element resolves it from the highest enabled layer whose
selector references the set by id (`element-needs.md`, "A set's paint"); the app computes nothing.
A set with no such layer has no color, never a gray.

**A3. Color is never the only signal** (WCAG 1.4.1). A stale set, an invalid field and a failed run
each carry a glyph or a word in secondary ink; a tint on a set's row would collide with its chip. A
channel row whose value cannot be read at this size keeps normal ink and adds "zoom to read" in
secondary ink, never dimmed, because disabled ink reads as unavailable and fails 1.4.3.

**A4. Type.** figma-spec 2.3's roles; emphasis by weight, never size or color; nothing uppercase.
Three roles beyond Figma's defaults, each a compact-mantine type role in the foundation slice
(`implementation-mapping.md` 10.1), because setting them in the app would be the workaround the
root `CLAUDE.md` forbids:

- **Tabular figures** on every number in a column or changing while watched (table cells, counts,
  legend ticks, readings, progress): proportional figures misalign a column and make live counts
  jitter. Figma needs no such rule because its numbers are single field values.
- **Identifiers** (id cells, inspector titles of nodes and edges, search hits) turn on Inter's
  disambiguation forms: a slashed zero and a distinct l and I (`ss02`, or `zero`, `cv05` and
  `cv08`; the tags are checked against the shipped Inter version). An account id, a host name or a
  gene symbol such as IL1B misread sends the analyst to the wrong entity; tabular figures only align
  digits.
- **Code** (rule and selector expressions, calculated-style expressions, copied methods text) takes
  Figma's mono role (`--text-mono-*`, Roboto Mono; figma-spec 2.3 lists the family, not bundled),
  as Figma sets code in Dev Mode: code is retyped exactly, and an expression field keeps its typed
  text (`figma-crosswalk.md` 4.2).

**A5. One density and one spatial system, at every graph size.** Figma's control height and row
pitch everywhere, the data table included (figma-spec 10.6); spacing, radius and icon-size roles
are figma-spec 2.4, 2.5, 4.3 and 4.4, unchanged. No compact mode: each density multiplies the states
to test, Figma has none, and no persona evidence asks for one. **Density never tightens under
load**, because a layout that changes with scale reads as a different app. Table rules Figma lacks: numbers right, text left, divider
grid lines, no zebra (stripes compete with swatches), no row tint from data, chits as `canvas-drawing.md` 7 draws
them. A row takes the hover-background role under the pointer and when linked hover lands on it, as
Figma's layer rows do (a `DataTable` variant, `implementation-mapping.md` 10.1). **Member rows**: in the object list and the
table, a row whose element is a member of the selected set, group or path takes
`--cm-bg-selected-secondary`, as Figma tints the children of a selected frame
(`design/ui/figma/left-sidebar/README.md`), so the list mirrors the member ring of `canvas-drawing.md` 6; over the
selection cap only the set's own row is selected, as on the canvas.

**A6. Elevation and stacking are two rules.** Panels have no shadow and are split by a hairline;
nothing inside a panel is boxed. **The shadow follows persistence**: a persistent floating surface
the app draws (toolbar, quick actions, Help) takes figma-spec 2.6's level 200, a tooltip 300, a menu
or popover 400, a dialog 500. Those levels are shadow recipes, not a z-order. **Stacking** is its
own order, bottom to top: the canvas region (everything graphty-element draws, its legend,
not-drawn line and node tooltip included), persistent floating surfaces, the notice, menus and
popovers, dialogs, and **the tooltip always on top**, so a tooltip on a menu item or a popover
control is never hidden. Menus, tooltips and the toast are dark in both themes; the element's node
tooltip matches (`canvas-drawing.md` 8), so hovering a node and hovering a button give one tooltip.
**The canvas stays mostly clear.** At the Laptop window class, the furniture floating over the
canvas together (the legend with its not-drawn line, the minimap, the floating toolbar with its
secondary bar, the notice and Help) covers at most a fifth of the canvas region (proposed). Past
that, the minimap yields first and then the legend folds behind "N more"; the fixture is
`state-matrix.md` 8, the Laptop cell.

**A7. One glyph per object type.** Each type in `conceptual-model.md` 1.3's object map resolves to
one glyph, the same on every surface that shows a type. A type with its own row and verbs has its
own glyph (a text-style glyph is reserved for named text styles, `decided-doors.md`, "Named text styles"). A record or container borrows: a run and a
comparison take the result glyph, a data version and layout settings the graph's, a set collection
the set glyph, a Catalog entry its family's; the project and the Look have none. A found path is the
path glyph drawn open and a pair the edge glyph dashed, variants of what each may become; a path is
the set glyph plus an arrow, as the element stores it. A missing type is fixed in the object map.

**Every row has one leading mark, in Figma's one icon slot**, and which mark follows from what
identifies the object. A style layer is its paint, so **a style-layer row leads with its chip**, as
Figma's local-styles list puts the style's swatch in the icon slot: the chip (`canvas-drawing.md` 3), the name, the
origin word (made here, run, recipe) in secondary text, and the eye in Figma's three states: at
rest it shows only when the layer is off; an off layer draws its name and chip in tertiary ink with
the closed eye pinned; an unbound layer carries a glyph and a word (A3). The eye, Select painted,
the channels it writes and the count it paints sit in the hover and focus trailing slot, the last
two folding into the row's tooltip when `PANEL_GRID.CONTENT` cannot hold them. The style-layer glyph appears only where no chip exists: menus, the palette,
search results and undo labels. A set, path or group is its membership, so **its row leads with its
glyph**, as Figma's layer row leads with the layer type: the glyph, the name, the kind word (fixed,
rule) in secondary text, then **a fixed paint slot** holding the set's paint (A2) before the count.
The slot is empty, never gray, when no layer paints the set, so names stay aligned. A corner
modifier on the set glyph waits for the recognition test (`research/study-schedule.md`, "Visual language").

**The register belongs to graphty-element**, exported from its `./catalog` entry point, free of
Babylon.js, Lit and the DOM: the element draws its badges and legend mark entries from it, and the
app imports it, so one drawing serves both and compact-mantine stays free of graph concepts
(`element-needs.md`, "The object-type glyphs"). An app-owned register would force a second copy in
the element.

**Icons.** UI icons and object glyphs are lucide, drawn in `currentColor` at a 1 CSS px stroke at
every size (lucide's `absoluteStrokeWidth`; compact-mantine's `strokeFor` is private, so it is not
cited as an entry point), on Figma's 16 px icon box
inside a 24 px target (figma-spec 4.3, 4.4), and checked side by side against the captures in
`design/ui/figma/left-sidebar`. Figma's own icon set is proprietary and not licensed for reuse, so
fidelity is kept by grid, size and stroke, not by drawing. An icon stands alone only with a tooltip.

**Imagery: none.** No illustrations, photographs or decorative art, empty states included: the
graph is the only picture on screen, and an empty state is text with its one action
(`content-design.md`). The one image allowed is a sample's thumbnail on the start screen, the
element's own export of that graph (`captureScreenshot`), so it is still the graph.

**A8. The chrome meets WCAG 2.2 AA by default.** The app always builds its theme with
compact-mantine's `createCompactTheme({ highContrast: true })` (figma-spec 2.9, 3.1), a call the app
makes from slice 0 (`implementation-mapping.md` 10.1, which states where it stands); with it off,
the focus ring and white text on the brand fill measure 2.99:1 and placeholders 2.3:1. That adds a
3:1 field edge and 55% secondary ink where Figma has none and 50%, a departure recorded in
`figma-crosswalk.md` 4.3. **The fidelity baseline** reviewers compare against is Figma's layout,
type and behavior; color follows figma-spec 2.9's accessible column. There is no contrast
preference, and the Look named High contrast shares no word with any control. **The claim depends
on token overrides** compact-mantine marks as awaiting the owner's approval (the focus ring, the
brand fill, placeholders and danger; figma-spec 2.9); approving or vetoing them is a token
change, not a door. **Beyond contrast**: text resizes to 200% (1.4.4) and reflows at 320 CSS px
(1.4.10), the canvas and the table claiming the two-dimensional exception and the panels
collapsing to the rail; text spacing overrides (1.4.12) never clip a row; under forced colors the
chrome uses system colors, and the DOM legend and not-drawn line keep their marks as forms, never
as color alone. The cases are fixtures of `state-matrix.md` 8, "Display preferences".

**A9. Chrome motion** is figma-spec 2.8's list only; overlays open and close in one frame, and the
chrome otherwise stays still, so large motion always means the data or the view changed.

**A10. Charts in the chrome.** Neutral bars, the accent only on a selected bin; data paint only
when a chart draws a layer's own scale, and then a selected band is a bracket, not the accent. Axis
figures are tabular. **The table's Scatter view** draws what graphty-element returns: points, or
past the element's binning threshold (`element-needs.md`, "Two-column binned density") binned density (hexbins) in neutral steps with the selection
drawn over it as points; the axes follow the heavy-tail rule of `options-and-encodings.md` 5, and
the statistic printed is the element's (`element-needs.md`, "Two-column binned density").

**A11. A control shows its value as the canvas draws it.** A constant color is a chit, a shape its
glyph in the select, as Figma shows a value in a field. **A channel bound to an attribute is
Figma's variable pill** (compact-mantine `VariablePill`, figma-spec 6.6) naming the attribute, with
a chit for a constant or categorical encoding and a strip for a ramp; the strip form of the pill's
swatch is a `VariablePill` variant (`implementation-mapping.md` 10.1), since its `swatch` takes one
color. Unbound width and dash
keep Figma's field, a leading icon and a value; a dash select draws each option's dash, as Figma's
stroke selects show theirs. All drawings read the element's resolved value (`canvas-drawing.md` 7). Which channels
show, and behind which disclosure, is `options-and-encodings.md` 3.

**What graphty-element draws** -- the canvas, its marks, the legend, labels, exported figures, 3D and
XR -- is `canvas-drawing.md`.

## Verification

The checks and measurements that can fail each rule, with who judges them and their status,
are `research/study-schedule.md`, "Visual language": its rule table and its open measurements.
A screenshot is never judged by the image model, which only transcribes what it sees.

## One-way doors

Recommended, not decided (`one-way-doors.md`): 48, How the element learns theme and motion. The
canvas's doors are `canvas-drawing.md`'s.

## Sources

- compact-mantine `design/figma-spec.md` 2.1 to 2.9, 3.1, 4.3, 4.4, 6.6, 10.6; `DataTable.tsx`,
  `package.json` (lucide) (worktree `.worktrees/compact-mantine-figma` at `a6b63bf6`)
- `design/ui/figma/tokens/README.md`; `dark-theme/README.md`; `left-sidebar/README.md`
- `conceptual-model.md` 1.3; `options-and-encodings.md` 3, 5; `state-matrix.md` 2, 8;
  `figma-crosswalk.md` 4.2, 4.3; `canvas-drawing.md`
- W3C WCAG 2.2: 1.4.1, 1.4.3, 1.4.4, 1.4.10, 1.4.11, 1.4.12, 2.4.7
- Munzner, *Visualization Analysis and Design*, 2014, ch. 5; Tufte 1983
