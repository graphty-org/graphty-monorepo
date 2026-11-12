# Unified styles: the Design Engineer's answers

Paths under `element/` are `graphty-element/src/` on branch `design/studio-tier3`. "The mock" is
`StylePanelMock.stories.tsx`; "the organization design" is `design/ui/style-panel-organization.md`.
Every element change named here is additive unless it says otherwise.

## 1. Too many "+"

Every property except labels and rings holds 0 or 1 value per layer (organization design 3.8).

- **A. "+" per section (the mock).** Two clicks to set a shape; "+" promises many where one fits.
- **B. Always-present rows.** An empty field means off, its placeholder is the value showing
  through ("Icosphere"), and a clear button turns it off. Figma shows width and height this way.
- **C. A switch plus a value.** Two controls for one fact.

**Recommend B.** "+" stays only for real lists: rings once they stack, labels once they have
slots, value-table entries, "and" conditions. A switch has no "not set" position, so yes-or-no
properties become two-word selects with an empty state: "Straight / Curved", "Shown / Hidden",
"Solid / Wireframe". Head and Tail are always-present `PanelField` selects.
**Element:** nothing new. Rows come from `channelsFor(target)`, placeholders from
`CHANNEL_DESCRIPTORS[c].default`; clearing is `styles.update` without that channel.

## 2. Menus where "+" stays

Figma's fill "+" adds a default paint at once
(https://help.figma.com/hc/en-us/articles/360041003694-Guide-to-fills); its effect "+" adds a
shadow with the type in a select on the row
(https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers).

- **A. A text menu of types (the mock).**
- **B. Figma's direct add.** A default color covers every layer beneath: a surprise repaint.
- **C. A menu with icons, then the color picker opens.**

**Recommend C.** A Mantine `Menu` with a 12 px glyph per item (Outline, Glow, Halo; Label, Caption
at the target end, Tooltip). Picking one adds the row and opens its `CompactColorInput`, since color
is always the next choice; nothing is written until a color is picked. If the dark menu cannot show
a leading glyph, fix compact-mantine's theme.

## 3. A long panel

- **A. Folding sections.** Hides what a layer does (rejected by the organization design).
- **B. Nodes and Edges tabs.** Hides half of a route's layer.
- **C. Paired rows on the 88 | 88 grid,** as Figma pairs width and height: Shape and Size, Color
  and Opacity, Shown and Wireframe; Color and Width, Pattern and Curved, Head and Tail.

**Recommend C** (`FieldRow` with two `PanelField`s). About 13 rows, near 450 px: a layer at rest
fits at 1440 x 900. Measure 900 x 700 in the build; scrolling is allowed there only for a layer
with labels and rings on both kinds.

## 4. A layer with no nodes, or no edges

- **A. Hide the group.** The layout shifts between layers.
- **B. Show it disabled.** Full height for nothing.
- **C. Fold it to one 28 px line with the reason,** "Edges: the rule reads a node value".

**Recommend C:** the order stays fixed and the reader learns why.
**Element:** whether a rule can reach a kind is the element's fact. Add optional
`reach: { node, edge }` counts, with a `{ code, params }` reason for a zero, to `styles.validate`'s
result.

## 5. Vary by, with many fields

- **A. A searchable list (the mock),** unusable fields disabled. With 200 columns they bury the rest.
- **B. A typing field (`ComboInput`) with recent picks first.**
- **C. Start from the data:** "Vary color by this" in a data-table column's menu.

**Recommend A and C.** Usable fields first, each with type glyph, distinct-value count and coverage
(`uniqueCount`, `completeness`, `measurement` on `AttributeDescriptor`); unusable ones behind one
"N more that do not fit" row. The genomics persona names "30 columns crammed into a preview of five
rows" as a frustration.
**Element:** nothing new. `styles.proposeEncoding` already answers fit with a refusal code and is
documented as cheap enough for every column on every render.

## 6. A visual gradient for degree

- **A. Keep the text fields; show palettes as ramp swatches.**
- **B. compact-mantine's `GradientEditor` (Figma stops).** Its stops sit on a color axis, not the
  data, so it cannot show where values fall.
- **C. The histogram with the ramp on the same axis.** Handles drag the range's ends (into a tail
  shows "14 outside"); a midpoint handle for diverging palettes; step ticks when stepped; scale
  glyphs re-draw the axis; palettes as a swatch grid beside Reverse; exact numbers one disclosure
  away.

**Recommend C,** built in compact-mantine as a generic ramp editor (`HistogramRow` with APG slider
handles), never a one-off in the app. It answers the genomics persona's "gradients that clip or
center in the wrong place".
**Element:** `styles.scalePreview(binding)`: bins in the scale's space, step bounds with colors and
counts, counts outside the range, so the app never computes. An inline `palette: { colors }` saved
with the layer, since `definePalette` is global and unsaved.

## 7. The Louvain "folder"

- **A. A split parent is a layer; folders write nothing (the agreed model).**
- **B. A folder that paints its children.** Overwrites their choices; Figma rejects it.
- **C. A split parent that arrives unsplit;** its row's swatches edit categories, and "Split into
  layers" is a command.

**Recommend A, arriving as C:** most category layers never need children, and 500 communities
should not mean 500 rows. A split parent's icon is its binding glyph, never a folder. Folders stay
pure organization: eye, lock, move, no Style tab.
**Element:** folders, pins, split by value with stored overrides, alignment across re-runs (model
section 3).

## 8. Which elements

- **A. One rule at the top (the mock).** "Where group is 3" leaves edges a guess.
- **B. A rule per kind's group.** Twice the work for a route.
- **C. One rule at the top, starting with a Nodes / Edges / Both `SegmentedControl`.** "Both" asks
  whether edges are those between matched nodes or those matching themselves (`EdgeReading`
  `induced` or `listed`).

**Recommend C.** One layer painting both kinds is breaking (model section 10, item 7).
**Element, now:** `styles.addPair(spec)`: a node layer and an edge layer sharing one rule
(`member` of `{ define: rule }`), moved, hidden and removed together, shown as one row; deleted
when the planned major ships.

## 9. Does the mock cover every style?

No. Missing: the lighting choice (studio, headlight, matte, flat; `element/config/Lighting.ts`) in
Graph settings; markup in label words (bold, italic, color, size, font, background; catalog 5.5);
the edge selection band (`edgeColor`, `edgeScale`, `edgeOpacity`); the highlight color setter.
Rightly left out: `node.flat`, `node.marker` (nothing draws them), the context point, label fields
no channel reaches.
**Engineering:** a test that fails when `channelsFor()` or `LABEL_STYLE_FIELDS` gains an entry the
panel lacks, as `test/demo-catalog.test.ts` does for cytoscape-extensions.

## 10. Text labels

`LabelStyle` has 49 fields.

- **A. A pop-out with grouped sections (the mock).**
- **B. Presets,** like Figma's text styles
  (https://help.figma.com/hc/en-us/articles/360039957034-Create-and-apply-text-styles).
- **C. Every field inline.**

**Recommend A and B.** The row shows source, size, position and a "Look" select with previews: the
element's 9 badges, a few shipped looks, the reader's saved looks. Editing a field makes it
"Custom", as Figma's detach does. The pop-out keeps every field. Typed words get Bold and Italic
buttons that write the markup.
**Element:** `catalog.labelLooks()` (named `LabelStyle`s with `plainName`); saved looks in the
project file.

## 11. Picking nodes generically

- **A. A rule builder:** field, comparison, value; ranges, categories, neighbors (`RuleTree`).
- **B. Selection first:** click, lasso or find, then "New layer from selection".
- **C. A typed rule** in the element's JMESPath subset, as the find box's "=" accepts.

**Recommend all three as one ladder** in "Which elements": rule rows first; "Use the current
selection" keeps the selection's rule when it has one (`selection.originPaths`), else names ids;
an "Expression" view shows the same rule as text both ways, for the expert persona.
No layer rule can say "name contains Bob" or "odd ids" today: functions are refused, and rule trees
have no text test.
**Element:** a `RuleTree` leaf `{ kind: "text", attribute | "id", mode: substring | prefix | exact
| regex, text }` reusing `textTest` (`element/session/query.ts`); a regular expression covers odd
ids (`[13579]$`). `contains()` and `starts_with()` in the expression subset (refused by name today).

## 12. Which properties can vary

The element binds 29 of 35 channels today: every color, number, enum, text and yes-or-no channel
(catalog 9.3), not the 5 whole-look label channels or `node.marker`.

- **A. A vary glyph on every field (the mock).**
- **B. Only color and size.**
- **C. A separate "mappings" section,** Cytoscape's way.

**Recommend A.** The menu follows the field: number to a range, color to a palette, shape, pattern
and arrow kind to a scheme, text to pass-through or a value table, yes-or-no to a value table
(the element binds it; this differs from organization design 3.1).
**Element:** named shape schemes, distinct shapes first; label size, text color and background as
their own bindable channels; a number format on text bindings.
