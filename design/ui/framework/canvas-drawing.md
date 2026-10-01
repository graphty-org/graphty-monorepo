# Canvas drawing

**Job.** What graphty-element draws, and how it must look, in the app, in a bare embed, in an
exported figure, in 3D and in XR: the theme defaults, the selection and state forms, the palette
checks, highlights, the legend's look, labels, motion, hulls and notes. **Not here:** the chrome the
app draws over compact-mantine (`visual-language.md`); what a legend lists, encoding kinds and scales
(`options-and-encodings.md` 5, 6); behavior by graph size (`state-matrix.md`); departures from Figma
(`figma-crosswalk.md` 4). **Owner:** visual designer, with the graphty-element API steward, because
every rule here is element work. **Ceiling:** the README's table. **Validated by:** "Verification".

**Thesis: hue on the canvas belongs to data.** Hue and luminance are a display's strongest channels
(Munzner, ch. 5), and Tufte's data-ink argument gives them to the data. Figma's canvas marks are
blue; graphty's are neutral, because any hue a mark spends a reader may take for data.

A bare embed must look right in both themes with zero configuration (root `CLAUDE.md`). The app
never paints the canvas, marks, legend or grays; a defect in them is filed against graphty-element,
and the app never sets a value to hide it.

**Three kinds of drawing, never mixed.** (1) **Data channels**: the drawable style channels
(`options-and-encodings.md` 2), written by style layers and bindable. (2) **Object marks**: drawn
for what the project keeps (highlights, hulls, notes, comparison); a highlight stacks and undoes
like a channel but is never offered for binding. (3) **State marks**: selection, member, hover,
focus, marquee, drawn from element state. No mark writes a data channel (`node.outline`,
`node.wireframe`, `edge.style`) or changes a fill or edge stroke.

**Contrast floors.** 3:1 (WCAG 1.4.11) for everything a reader must find: every band of a mark, the
unstyled grays, and every node silhouette. **Data fills** keep the palette floors of section 4, which are
about telling colors apart; a fill below 3:1 against the canvas is made findable by the fill edge
(section 4), not by recoloring the data. Label text is 4.5:1 against its halo. **One exemption**: past the
edge-overdraw boundary unmarked edges are read as a mass, not one by one, and are exempt from the
per-edge floor (section 1); an edge carrying a state or object mark never is.

**Element roles.** Everything the element draws that is not data (canvas, unstyled grays, fill
edge, label ink, label halo, note ink, legend surface, shadow and ink, badge fill and ink, mark bands,
comparison ink, tooltip surface (with the dark elevation hairline, since the dark canvas candidate
equals the tooltip color) and ink, minimap frame and viewport, the overlay card for first
load, rendering lost and canvas not available, the not-drawn line, and the XR controls' surface,
ink and accent) is a closed set of roles, each with a light and a dark value, in one element module
beside `config/palettes/` and tested there. A bare embed has no `--cm-*` tokens, so this document never
names one: the module holds its own copy of the values it matches. The legend card copies Figma's
floating toolbar card (figma-spec 2.6, level 200): its shadow (`--cm-elevation-200`), radius and
padding, with figma-spec's legend line (11/16) as its row pitch, so a legend fits the canvas of a
laptop. The roles stay internal (`decided-doors.md`, "How the element learns theme and motion"): a published role is a name that can never be removed, and no consumer has asked.

### 1. Theme-following defaults

**Theme-following defaults.** Figma's canvas is the page's own fill, a document property;
graphty's counterpart is `GraphStyle.background`, saved with the graph and winning when set. Only
when it is unset do the element roles follow the host's theme, because a bare embed needs a default.
**A theme change moves the roles, never a data color.** How the element learns the theme, and the
`colorScheme` property that overrides it, are decided (`decided-doors.md`, "How the element learns theme and motion") and specified in
`element-contract.md` 15. In AR there is no background: the roles take the dark values, pending the
passthrough measurement. A Look never sets a background (door 85, what a Look is). The light canvas
is `#F5F5F5` (Figma's light canvas); the dark candidate is below.
Where the element's defaults differ is `element-needs.md`, "Theme-following defaults".
*The node gray:* 3:1 on both canvases and 15 from the Other gray `#505050` in OKLab (x100, the
metric every check here uses): `#808080` (3.62:1 light, 4.22:1 dark, 16.9 apart;
`research/color-checks.md` 3.2). Under color-vision simulation it sits 1.4 from the shipped
`#009988`, so the palette-quality test checks every default categorical palette against it. **A
palette that collides** (within 15, or 6 under simulation, of `#808080` or `#505050`) is found by
the element at registration, never taken from the registrant's word (`element-needs.md`,
"`registerPalette` computing"); while it is bound and any element is unstyled or Other, the legend always lists that
gray with its count, and the Colorblind safe Look (section 4a) never offers it.
*The one colored first render:* a file that brings its own colors (a column with the color role,
`conceptual-model.md` 3.4) is drawn with them through one ordinary passthrough layer, whose legend
entry reads "colors from the file" (`options-and-encodings.md` 10). Every other first render is gray.
*Edges recede.* Lightness cannot separate the unstyled edge from the node: a gray that keeps 3:1 on
the canvas and 15 from `#505050` can sit at most 4.7 closer to the light canvas than `#808080`, and
1.7 on the dark (`research/scripts/edge-gray-headroom.mjs`). So edges recede by width and opacity:
the unstyled edge is the node gray, drawn no wider than the edge-width default, and past the
edge-overdraw boundary (`state-matrix.md` 4.1) **the element fades unstyled edges with a drawn
opacity multiplier**. The multiplier:

- is a function of the overdraw share in the element's edge-overdraw reading, never a pixel
  readback, aimed at composited edge mass at or under 1.5:1 against the canvas while the node gray
  keeps its 3:1; the curve and the 1.5:1 target are provisional until the pointing check
  ("Verification");
- applies only to edges whose color and opacity no layer above Base style writes, and never to an
  edge carrying a state or object mark, which is drawn at full opacity with its casing; so a bound
  edge always matches its legend chit and table swatch (section 7);
- stores nothing: it never writes Base style and never enters the file or the undo history, so a
  saved project does not depend on the zoom it was saved at; a reader's opacity layer ends it;
- is named by the overdraw note in the legend (`element-needs.md`, "The edge-overdraw fade").

Below the boundary one isolated edge keeps 3:1.
*Dark canvas:* candidate `#1E1E1E`, chosen by contrast headroom and menu separation
(`research/color-checks.md` 5); it equals Figma's dark menu and tooltip surface, so both are
separated from it only by their hairline, and if the person review fails it the canvas moves
darker, never lighter.
*First render:* the grays, the label budget and no legend, painted once, because an overview never
paints (`files-and-recipes.md` 2): structure is read from the layout alone, and a color only ever
means something the analyst or a recipe chose. The one-step route to color is `task-flows.md`'s.

### 2. Selection is a neutral two-tone mark

**Selection is a neutral two-tone mark, never a tint, and the element orders its bands by the
canvas.** A node gets a ring behind it, an edge a casing along it, with one dark band (`#1A1A1A`,
provisional: pure black smears on the OLED panels of XR headsets, and the calibration decides) and
one white band. The fill is never changed.

- **Pass condition.** A band marks its element only if it has 3:1 against **both** neighbors: the
  inner band against what touches it from inside, which is the fill edge where section 4 draws one
  and the fill otherwise, and against the other band; the outer band against the other band and the
  canvas. Otherwise the inner band merges with the fill, the outer with the canvas, and the node just
  looks larger. **The rule depends on the fill edge**: with the dark band `#1A1A1A` inside, dark fills
  fail against the band itself (the default slot `#6929C4` about 2.2:1, the Other gray `#505050`
  about 2.2:1, `#882255` about 2:1, `#332288` about 1.4:1, computed from sRGB relative luminance),
  so on those fills the fill edge's canvas-contrast tone is what the inner band is read against. WCAG technique C40 covers a
  band on one solid color, not a band between two.
- **Where the canvas touches a band from inside**, a pair cannot pass: its inner band is the one
  nearest the canvas in luminance (white on `#F5F5F5` is 1.09:1). That happens after a gap (focus),
  across a dash gap, over the open half of the comparison semicircle, inside a hollow ring, and
  around a fill smaller than its ring (section 6, small nodes). There the ring takes **the three-band
  form**: canvas-contrast band, the other, canvas-contrast band. Filling the gap with ink instead
  would erase the gap, which is what tells focus from selection.
- **Band order follows the canvas's own luminance, not the app theme**: the band with more contrast
  against the background goes outside. Measured with pure black, that order failed 0 of 116 shipped
  colors on both canvases, where a fixed white-inside, black-outside ring failed 54 on the dark
  canvas, Okabe-Ito sky blue `#56B4E9` among them, and the reverse 25 on the light
  (`research/color-checks.md` 9.2). **The 0 of 116 is pending**: it is re-run by
  `research/scripts/ring-and-canvas-contrast.ts` with `#1A1A1A`, the new `#6929C4` slot and the fill
  edge included, and until then no document cites it as a pass. A custom background picks its order the same way. **A lone mark on
  a background of unknown luminance** (a skybox, AR passthrough) gets three bands (white, dark,
  white); a stack is checked by the same both-neighbors script and gains a band only where one
  fails.
- **The accent is never a band of the pair**: paired with white it fails every shipped color on the
  light canvas. It is allowed only as an optional third band outside the pair, whatever its
  canvas-set order, where it adds no contrast (1.30 to 1.73:1 against Okabe-Ito's blues, measured on
  both canvases, `research/color-checks.md` 9) and only ties the mark to the chrome; whether the app
  passes it waits on the first-click study.
- **What links a row to its node** is the row and the node changing in the same frame. What the
  inspector and the camera do when the node is off screen is `interaction-patterns.md` 3.1's. A
  selected element that is not drawn is counted in the not-drawn line.
- **A halo tint fails**: the shipped gold measures 1.13:1 on the light canvas and turns Okabe-Ito
  blue green (`research/color-checks.md` 3.1).
- **The published shape** is decided (`decided-doors.md`, "The canvas marks"): a dark band and a light band whose order
  the element resolves, never a fixed outer and inner color.

### 3. The key's shape follows the measurement level

**The key's shape follows the measurement level.** Which level a binding has, and which scales
it is offered, is `options-and-encodings.md` 5; the drawings are these, and the layer chip is the
same drawing at chip size:

| Level | Key drawing | Chip |
|---|---|---|
| Categorical | swatches with counts | two or three stacked chits: the largest categories by count, largest in front; a fourth waits for the 16 px chip check (`research/study-schedule.md`, "Visual language") |
| Ordinal | swatches from a sequential palette, in rank order, with counts; adjacent levels meet the ordered-step floor (section 4) | stacked chits in rank order, lightest first |
| Quantitative | a continuous strip with its domain and scale; a binned channel, one mark per step with its interval; unbinned size and width, 3 to 5 graduated marks | a strip; a graduated glyph for size and width |
| Time | a sequential strip with date ticks and the window's domain | a strip with a tick |
| Constant | one chit | one chit |
| Not a color | the channel's drawing (a shape glyph, a dash) | the channel's glyph |

**Three no-color looks.** **Unstyled** is Base style's gray `#808080`, not a separate state. **No
value** paints nothing, so the layers beneath show through; its legend swatch is the paint beneath,
as the element's legend returns it (`element-needs.md`, "A drawn default legend"): one chit when
every no-value element resolves to one paint, otherwise the stacked-chit form with "varies".
**Other**, the overflow group, is `#505050`, never the unstyled gray, because an Other element has
a value. No gray can be Other and clear 3:1 on both canvases: that floor confines a gray to OKLab
lightness 52 to 65, and the node gray sits at 60, so nothing there is 15 from it. Other is 2.07:1 on
the dark canvas (`research/color-checks.md` 4.2) and relies on the fill edge there (section 4).
The canvas alone
cannot tell no value from unstyled; the inspector's Appearance row and the legend can. An analyst
who wants a distinct no-value look adds a constant layer over the presence rule, where two forms are
offered: on nodes a hollow look through `node.wireframe` in the node gray, on edges a gray dashed
stroke through `edge.style`; an algorithm's layer never adds one. Which entries the legend lists,
and when no value and unstyled share one, is `options-and-encodings.md` 6. A diverging default's
midpoint sits at least 15 from both grays (a decision of this section), so a gray is never read as "no change".
**The shipped red-blue diverging palette fails this rule**: its pale midpoint can read as a gray.
It stays the default only until a replacement is measured (`element-needs.md`, the palette-defects
row); until then its legend names the midpoint in words.

### 4. Every palette is checked against both canvases

**Every palette is checked against both canvases**, in OKLab distance times 100, the metric of
graphty-element's palette-quality test and every kept script. Floors: 2:1 for ramp steps and 1.5:1
for categorical colors against the canvas; every pair of categories at least 15 apart with normal
vision and 6 apart under protan, deutan and tritan simulation (Machado 2009, full severity), which
assume position as a second cue. **Ordered steps** (adjacent ordinal levels, adjacent steps of a
binned color channel) meet a separate floor, 7.5 apart with normal vision and 3 under simulation,
and keep the ramp's lightness order, because rank is also carried by order in the legend; a
palette carries at most as many ordered steps as clear that floor, and a binding with more levels
bins to that count (`options-and-encodings.md` 5). The default ramp's neighbors are 7.8 to 9.6
apart, so it carries five; the floor is provisional until the color-checks script
measures it on both canvases. The element computes the canvases each palette passes on at
registration; the defaults must
pass, except one named slot: Okabe-Ito yellow `#F0E442`, 1.21:1 on the light canvas, is the
default categorical palette's last slot, reached only by an eighth category and kept for its
color-vision distances, and it always carries the fill edge. **Okabe-Ito's black** (1.26:1 on the
dark canvas) is replaced by `#6929C4` in the default palette shipped under new ids
(`decided-doors.md`, "The default palettes on a dark canvas"), so no slot is exempt on the dark
canvas; until the new ids ship, the black slot fails there and carries the fill edge; an explicit palette that fails is not recolored, and the legend says so. A palette that swaps
colors per theme is rejected: the theme would change data.
**The fill edge.** A 1.5:1 fill is below the 3:1 a findable mark needs, and no evidence shows it is
findable at the color-legibility boundary (`scale-levels.md` 1, which already extrapolates Szafir
2018). So whenever any fill a layer can paint is under 3:1 on the current canvas (a palette color,
its overflow gray, or a literal color), the element draws a fill edge on **every** node that layer
fills: 1 CSS px, **one tone** (the canvas-contrast role, 3:1 against the canvas), tight against the
silhouette with no gap. Being one tone with no gap is what tells it from every section 6 ring, all of which
are two- or three-tone, or start after a gap. Drawing it on the whole layer, not per color, keeps
it from sorting nodes into two looks. On the light canvas four of the eight default categorical
colors are under 3:1, so there the fill edge is the normal state of a default categorical layer,
and section 6's fixtures test it everywhere, not as a special case. It is part of the fill's drawing, not a mark and not
`node.outline`: it has no meaning and cannot be bound. **Beside a stroke**: where a layer writes
`node.outline` at 3:1 or more the fill edge is dropped, and otherwise it sits outside the stroke.
**Below the node screen-size boundary** (`element-needs.md`, the readability-level row) the fill
edge is dropped except on marked nodes, because on a node that small a dark 1 px edge covers much
of the color the reader must decode. Both cases
are lone-mark fixtures.
**The trade-off on dark, measured.** A color clears 2:1 on both canvases only between relative
luminances of about 0.076 and 0.432, so any ramp monotone in lightness puts one end near one canvas.
The recommended ramp (`decided-doors.md`, "Decided, and not doors") accepts that its highest
values lose salience on dark, and the legend carries the direction; a cividis-like ramp only moves
the loss to the light canvas. Which shipped palettes fail is `research/color-checks.md` 3.3 and 7.

### 4a. Looks

**Looks** (door 85) substitute palettes and never paint anything else. **Print** swaps in
palettes that pass on the light canvas and keep luminance order in grayscale. **Colorblind safe**
swaps in palettes with every pair of categories at least 12 apart under protan, deutan and tritan
simulation, twice the default floor, and ramps whose luminance only rises. **High contrast** is
defined per canvas: it swaps in palettes that clear 3:1 on the canvas it is chosen for. One palette
for both is not possible in practice, because 3:1 on `#F5F5F5` and on `#1E1E1E` confines a color to
relative luminances of about 0.14 to 0.27, which leaves a ramp almost no lightness range; the
script run is in `research/study-schedule.md`, "Visual language". Literal colors a layer set are kept, and the legend
names them when they fail. High contrast is one Look whose palettes are resolved by the canvas it
is drawn on: the one named exception to the no-theme-swap rule, because it changes contrast, never
which category holds which slot (door 85).

### 5. Highlights never collide with data

**Highlights never collide with data.** A highlight is a style layer of the highlight kind
(`conceptual-model.md` 5.1) that writes the highlight mark (kind 2), outside the published channel
union. Algorithm suggested styles that trace a result (a path, a matched set) are highlight layers;
those that encode a value (a degree color) stay channel layers. The shipped highlight pairs lose
their muted member, which paints elements outside a result (root `CLAUDE.md`, "Algorithm Styles").
Every other way was measured and fails (`research/color-checks.md` 9.5): **a hue** (the shipped
`#0072B2` is Okabe-Ito's fourth category, and lands within 15 of 11 shipped colors); **`node.outline`**
(a data channel that would cover an analyst's encoding, and a blue outline vanishes when the node is
also selected, 85 of 116 colors); **`edge.width` alone** (unseen on every edge color under 3:1, 58
of 116 on light, 32 on dark). The mark is a second neutral pair in **the same band order as the
selection's**, so dark and light alternate; reversing it fuses the two middle bands. Nested this way
it passes on every shipped color on both canvases; whether readers see it as a second mark is the
timed discrimination task.

### 6. The register of canvas forms

**The register of canvas forms.** Every form on the canvas besides a data fill and its fill
edge, each with one meaning. Other documents cite a row and never restate or add one. **No word
names two forms.** Rings are numbered outward from the silhouette; a mark that is absent takes no
width, so a ring's radius is the sum of the rings inside it. `node.outline` and `node.glow` are data
drawn at the silhouette beneath every ring, not rings, and marks begin outside their drawn extent
(`element-needs.md`, "A crisp node outline"). **The ring order**: selection and member innermost, because
they name what the inspector shows; then the object marks (highlights, comparison); then the
transient marks, focus and hover, outermost, so pointer and keyboard motion never move a persistent
ring. Every two-tone band takes section 2's canvas-set order, stacked marks repeat it, and a band with the
canvas inside it takes section 2's three-band form.

**Every form is identifiable alone.** Because an absent mark takes no width, a ring's position is
not a cue: whatever is outermost moves in against the silhouette. So each row below differs from
every other in kind (tone count, gap, dash, hollow), not by a pixel of width: the fill edge is one
tone with no gap (section 4); the member band is two tones with no gap; hover is one tone after a gap it
keeps even alone; focus is three bands after a gap; selected-and-hidden is a hollow ring with
nothing inside. Figma's hover is also one tone (`figma-crosswalk.md` 5).

| Ring | Form | Node | Edge | Meaning | Kind | Band, CSS px (provisional) |
|---|---|---|---|---|---|---|
| -- | unstyled gray `#808080` | fill | stroke | no layer matched | 1 | -- |
| -- | Other gray `#505050` | fill | stroke | the overflow group | 1 | -- |
| 1 | two-tone band, full | ring | casing | selected | 3 | 2 + 2 |
| 1 | two-tone band, thin | ring | casing | member of the selected set, group or path | 3 | 1 + 1 |
| 1 | hollow three-band ring, nothing inside; a casing with no stroke | ring at its position and data radius | casing | selected, and hidden by Hide on canvas | 3 | 1 + 2 + 1 |
| 2a, 2b, 2c | dash in a two-tone band | ring each | casing each | highlight 1, 2, 3: long, short, dot | 2 | 1.5 + 1.5 |
| -- | index badge, dashed pill | on ring 2c | midpoint | highlight 4 on; every index held | 2 | -- |
| -- | end badges; chevrons | start, end glyphs | chevrons | a path's ends and travel, with its mark | 2, 3 | -- |
| 3 | two-tone semicircle; letter badge | screen left or right | "A" or "B" | A only, B only; unmarked is both | 2 | 2 + 2 |
| 4 | three-band ring after a 2 px gap | ring | casing | keyboard focus (WCAG 2.4.7) | 3 | gap 2, then 1 + 2 + 1 |
| 5 | one-tone hairline after a 2 px gap, kept when alone | ring | casing | hover, linked hover | 3 | gap 2, then 1 |
| -- | hull, neutral, no fill | around members | -- | a set or group region | 2 | 1 + 1 |
| -- | hull in the ring-1 band or the ring-5 hairline | around members | -- | selected or hovered set; selection over the cap | 3 | as its ring |
| -- | count badge, solid pill | collapsed set or group | -- | how many it stands for; kept in export | 2 | -- |
| -- | count badge on a hull | selection over the cap | -- | how many are selected | 3 | -- |
| -- | callout, note ink | at targets | at targets | a note | 2 | -- |
| -- | two-tone solid loop, no fill | over all | -- | marquee, Lasso | 3 | 1 + 1 |
| -- | minimap viewport, two-tone frame | on the minimap | -- | the part of the graph in view | 3 | 1 + 1 |

The widths live in the element-roles module, unpublished and provisional; the published mark schema
carries each band's tone and dash only (`decided-doors.md`, "The canvas marks"). Calibration changes numbers,
never the order. **The worst case** is a node selected, in three highlights, compared, focused and
hovered: rings 1, 2a to 2c, 3, 4 and 5, 26 CSS px beyond the silhouette before any band the
three-band rule adds. It is the fixture for section 2, section 5 and section 6, beside **the lone-mark fixture**: each
row above drawn alone on one node and one edge, the fill edge included, on pale and dark fills on
both canvases. **At most three highlight rings**; a fourth highlight goes into the index badge and is
applied, never refused.

**Precedence.** Within ring 1, selection beats member. A selected set, group or path whose hull is
drawn is marked by the hull alone; its members get the member ring only when no hull is drawn. The
element must learn which set, group or path is selected, not only node ids (`decided-doors.md`, "The canvas marks").

**One keeping order, at every size.** The cap applies to persistent rings only: they are capped at
the larger of the node's screen radius and 4 CSS px (one selection mark), and past it are dropped
in this order of keeping: selection, highlight (lowest index first), member, comparison; the kept
rings keep their register order with no empty slots. **Focus and hover are never capped**: they
draw outside whatever persistent rings were kept, so focus is always visible (WCAG 2.4.7) and a
keyboard walk along a highlighted path never erases the highlight on the node it lands on. The cap
is provisional until calibration; which graph sizes reach it is `scale-levels.md` 4. **In 2D,
marked elements stay findable at any scale**: an element carrying a state or object mark is drawn
after unmarked ones; a marked node under the node screen-size boundary (`scale-levels.md` 1) keeps its
data size, and its ring stack's inner radius is raised to half the boundary, so `node.size` is
never altered and the rings take the three-band form across the canvas between; when its rings
drop, a path keeps its casing and chevrons on its edges. 3D is section 14's.
**Badges follow the same rule**: index and letter badges drop below the node screen-size boundary on nodes
and the edge-detail boundary on edges, and their text forms carry them;
a path's end badges and collapsed-set count badges are kept.

**Edges.** Casings stack in the ring order; below the edge-detail boundary one casing is kept, by the
same keeping order. **Draw order**: in a dense drawing the last edge drawn wins each pixel, so bound
edges are drawn over unbound ones and, within a scale, by value (highest last). **Parallel edges**
draw as one line until the element separates them (`element-needs.md`, "parallel edges separated by
`parallelRank`"): a mark on one edge of the group is drawn on the shared line, and its tooltip names
which edge; two paths on one line take parallel casings, told apart by their end badges. **A
self-loop's** casing and chevrons follow its arc.

**Data forms that border the marks.** A data dash (edge line style) is on the stroke itself, a
highlight's dash only inside a two-tone casing; arrowheads show an edge's direction, a path's
chevrons only its direction of travel and only inside its casing. The discrimination fixture
includes glow, outline and arrows.

**Every section 6 form has a text form** (WCAG 1.1.1), placed by `information-architecture.md` 8.1 and
announced by `interaction-pattern-entries.md` 9.4; spoken forms are `content-design.md` 6.

**Highlights and comparison stay marks, not paint.** Drawing only selection, member, focus and hover
on the canvas, as Figma does, and painting highlights through style layers was weighed and
rejected: paint is the collision section 5 measured, a highlight would cover the analyst's encoding, and a
path's order and ends have no paint form (`decided-doors.md`, "The canvas marks").

### 7. One data color, four surfaces

**One data color, four surfaces.** Canvas, legend, table swatch and inspector draw one resolved
value read from the element, never a copy. Where each surface shows it is
`information-architecture.md` 8.1; the forms are these: a column a layer reads carries the
channel's glyph and a strip of its scale in the header; each cell carries one chit per painted
color channel beside the raw value; a bound attribute's row in the inspector carries the same chit.
**Chits are for color channels only**: size, shape, width, dash and opacity show their section 3 glyph in
the header of a column that reads them, never as a chit. **Paint no column reads** (a constant
layer on a set) shows beside the row's name in the table's first column as at most two chits, from
the layers highest in the stack first (a fixed "fill and stroke" would leave an edge-only stack
with one empty slot); the rest are in the inspector's Appearance. A value-beside-color column waits on the
element publishing the resolved value (`element-needs.md`, "The resolved value on each channel
explanation"). No binding writes a channel it does not show.

### 8. Nothing is silently incomplete: the legend's look

**Nothing is silently incomplete: the legend's look.** There is one legend, graphty-element's
(door 58, The legend and not-drawn notice); what it lists and counts is
`options-and-encodings.md` 6, and where it sits is `interface-specification.md` 1.1. **Medium:** the
legend and the not-drawn line are built from one render-independent description (section 3 drawings, mark
drawings and text), which each medium draws: on screen a DOM overlay in the element's shadow root,
because Babylon text cannot use the host's fonts; in an immersive XR session, which composites no
DOM, a panel in the scene (section 14); in a raster export, pixels; in a vector export, when it ships,
vectors, so a figure's legend is never a bitmap pasted into an SVG. **Form:** a card on the legend
surface role with the copied floating-card shadow, radius, padding and row pitch; ink and secondary
ink roles; the legend line's pitch (above); the host's computed `font-family` and `font-size` on the host
element (in the app, figma-spec 2.3's body role), over the element's own default, `:host {
font-family: system-ui, sans-serif; font-size: 12px }`, so a bare embed on a page with no CSS never
draws in the browser's serif default; only a page rule on the host element overrides it (`decided-doors.md`, "How the element learns theme and motion",
which covers what the element inherits from its host),
with tabular figures; each entry is a section 3 drawing or
a mark drawn as on the canvas, then its words. **Its height is capped at a share of the canvas**;
whole blocks that do not fit fold behind one "N more" entry, a row in secondary ink that opens the
full list, and which blocks fold is `options-and-encodings.md` 6's; the share is `state-matrix.md`
7's. The **not-drawn line** is the legend's last line, in the same type, and appears only while
something in scope is not drawn, including, in 3D, marked elements occluded by nearer nodes
(section 14), and elements hidden by Hide on canvas, which it counts with Select and Show all: it is
their home (`output-homes.md` 1), a DOM region in the keyboard's region order
(`interaction-pattern-entries.md` 9.1), never drawn text. **The node tooltip** is chrome in form and
data in content: `node.tooltip` is a channel for what it says, and its surface is the element's
tooltip role, dark in both themes as A6's, so `node.tooltipStyle` renders only its text fields
(`options-and-encodings.md` 3).

### 9. Labels

**Labels**, hull and group labels included, draw in the label-ink role with a halo in the canvas
color, both following the canvas's theme unless a layer's `labelStyle` sets them, with text 4.5:1
against the halo (a box would hide the edges under it), in the host's computed `font-family`, as
section 8 reads it, retiring Verdana (`config/RichTextStyle.ts`). **The label size is an element
role, not the host's body size**: 12 CSS px at zoom 1 (provisional), because the chrome's 11 px
body is tuned for dense panel rows, not for text drawn with a halo over a busy drawing. It grows
with zoom up to twice that size and never shrinks below it, because a label too small to read is
dropped by the label budget (`scale-levels.md` 2) instead; `node.labelStyle`'s `sizePx` overrides
the base. **What hover draws, stated once here**: the ring-5 hairline of section 6; the element's
label, exempt from the label budget and ranked above ordinary node labels, so it is never culled
under the pointer; and, after the tooltip delay, the node tooltip (section 8). **Hull and group labels rank above node labels**,
as the hierarchy ranks grouped structure above single elements: they are placed first and culled
last, and set one weight heavier (A4 allows emphasis by weight only), so a theme name is not read
as a node's label. Labels are drawn into textures, so the element redraws them when
`document.fonts` reports a load. In AR the halo is dark. In an export with a transparent background
the halo takes the light canvas value, which shows as a light rim on a dark page; the export's
background option says so.

### 10. Graph motion honors reduced motion

**Graph motion honors reduced motion** (WCAG 2.3.3): camera moves cut, layouts show settled
positions, collapse jumps, edge flow stops. The element's `reducedMotion` property is decided
(`decided-doors.md`, "How the element learns theme and motion") and specified in `element-contract.md` 15; the app's preference only sets it. Flow animation
has a visible pause (WCAG 2.2.2; the control is `interaction-patterns.md`'s). The size above which
positions jump anyway is `state-matrix.md`'s. Chrome keeps figma-spec 2.8's small transitions.

### 11. Comparison membership is an object mark

**Comparison membership is an object mark** (section 6 ring 3): a semicircle on nodes, a letter badge
on edges, in the comparison ink role, with "in both" unmarked. Fill, stroke and data paint are left
alone, so a data layer still reads on the comparison surface. No hue: none clears every palette
(`research/color-checks.md` 3.1). The comparison also publishes membership as a categorical
attribute that any layer can bind, which is how a figure gets a three-state edge legend
(`options-and-encodings.md` 5); the mark is the default when no layer binds it.

### 12. Hulls, collapsed sets and notes

**Hulls, collapsed sets and notes** (semantics: `conceptual-model.md` 5.1, 6). A hull has no
fill, since alpha fills shift hue and mix where hulls overlap. Hulls counted but not drawn
(`state-matrix.md` 7) appear only in the count badge. A collapsed set is one node filled by the
layers that select its set, with a count badge. A note is a callout in note ink, never a data color.

### 13. Exported figures

**Exported figures.** Background: the view's `GraphStyle.background`, otherwise transparent
(as Figma exports a frame with no fill), with white and the light canvas as options; roles then take
their light values. **Mark bands**: on an opaque background, that background's canvas-set order
(section 2); on a transparent one, whose page is unknown, section 2's three-band form, so a mark passes on a light
page and a dark slide alike. **Scale**: every CSS px width (bands, gaps, fill edge, halo, label
size) scales with the export's pixel ratio, so a 4x figure keeps the screen's proportions. Kept:
object marks. Dropped unless asked: state marks. The legend is drawn in, in full, from section 8's
description. Export options: door 58.

### 14. 3D and XR

**3D and XR.** graphty-element draws 3D as a first-class mode, so every rule above holds there
with these readings:

- **Marks are drawn in screen space** around the node's projected silhouette (a shader outline or a
  camera-facing billboard), never as meshes scaled with the node, so band widths are CSS px at every
  depth; "left" and "right" for the comparison semicircle are the screen's. Labels, badges and
  callouts are billboards **at a constant screen size**, section 9's size at every depth, so a far
  label is as legible as a near one and perspective reads only in the nodes (fixture
  `Scale/Labels/Depth3D`); a hull is drawn in screen space around its projected members.
- **Occlusion is truthful**: a mark is depth-tested with its node, so a nearer node hides a ring
  behind it, because a ring drawn over an occluder misplaces its node in depth. No see-through form
  is drawn: fainter would read as the opacity channel and dashed already means highlight, and
  Figma never draws through geometry either. So section 6's findability promise is 2D's; **in 3D a marked
  element is found by route**, for every mark kind: Zoom to on the selection, a highlight, a path
  or a set, the table and the inspector, and the not-drawn line counting marked elements whose mark
  is fully hidden (`element-needs.md`, "Occluded marks counted").
- **The only depth cue is perspective.** Fog is rejected: it changes a fill's luminance with depth,
  which a ramp reads as value. Perspective already shrinks distant nodes, so size compares only
  nearby nodes (`scale-levels.md` 4).
- **Lighting**: constant fills and the grays are lit by the element's default light; data-bound
  fills are drawn flat while `node.flat` is unset, because shading changes luminance, the channel a
  ramp encodes, and an explicit `false` opts into lit shading, which the legend names: a flat node
  carries a value, a lit one does not (decided, `decided-doors.md`, "Decided, and not doors"). A lit
  fill passes a contrast check only at both its darkest and lightest rendered pixel.
- **Opening mode**: on a flat screen the element opens in 2D, 3D one click away, because 2D finds
  clusters as fast with no perspective distortion (`research/graph-analysis.md` 6.9); a headset
  opens in 3D (decided, `decided-doors.md`, "Decided, and not doors").
- **XR**: CSS px become an angular size at the calibration; the XR controls use the element roles;
  AR takes the dark roles until passthrough is measured. An immersive session composites only the
  WebGL layer (DOM Overlays are device-optional), so the legend, the not-drawn
  line and the node tooltip are drawn in the scene, on the XR controls' surface role, from section 8's
  description, in the host's font drawn into a texture as labels are (section 9).

**The canvas carries no decoration**: no grid, frame or chrome beyond the forms in section 6, the
element's legend and not-drawn line, and the reader's own notes.

**Departures from Figma** in this document are rows of `figma-crosswalk.md` 4.3, and only there.

## Verification

The checks and measurements that can fail each rule, with who judges them and their status,
are `research/study-schedule.md`, "Visual language": its rule table and its open measurements.
A screenshot is never judged by the image model, which only transcribes what it sees.

## One-way doors

Recommended, not decided (`one-way-doors.md`): 47, the canvas marks; 48, how the element learns theme and motion; 58, 84, 85, 86. The look-only defaults this document
decides (the grays, the default palettes, the size scale, the opening mode) are listed there under
`decided-doors.md`.

## Sources

- compact-mantine `design/figma-spec.md` 2.1 to 2.9, 4.3, 4.4, 6.6, 10.6; `DataTable.tsx`,
  `package.json` (lucide) (worktree `.worktrees/compact-mantine-figma`)
- `research/color-checks.md` 3 to 10.1; `research/scripts/ring-and-canvas-contrast.ts`,
  `research/scripts/edge-gray-headroom.mjs`
- `design/ui/figma/canvas-selection/README.md`; `tokens/README.md`
  `dark-theme/README.md`; `left-sidebar/README.md`
- `conceptual-model.md` 1.3, 5.1, 6; `files-and-recipes.md` 1; `options-and-encodings.md` 2, 3, 5, 6; `state-matrix.md`
  4.1, 7; `scale-levels.md` 1, 2, 4; `information-architecture.md` 8.1; `interaction-patterns.md` 3.1; `interaction-pattern-entries.md` 9.4; `figma-crosswalk.md` 4.2, 4.3; `one-way-doors.md` 58, 84 to 86; `decided-doors.md`
- graphty-element `Graph.ts`, `config/` (`GraphStyle.ts`, `NodeStyle.ts`, `RichTextStyle.ts`,
  `palettes/`), `catalog/palettes.ts`, `catalog/label-style.ts`, `session/styles/channels.ts`, `legend.ts`,
  `test/catalog/default-palette-quality.test.ts`
- W3C WCAG 2.2: 1.1.1, 1.4.1, 1.4.3, 1.4.11, 2.2.2, 2.3.3, 2.4.7; technique C40
- Machado, Oliveira and Fernandes 2009; Munzner, *Visualization Analysis and Design*, 2014, ch. 5;
  Szafir 2018; Tufte 1983
- Open decisions cited (`one-way-doors.md`): 84, A category's color fixed at first paint; 86, Whether an element is drawn
