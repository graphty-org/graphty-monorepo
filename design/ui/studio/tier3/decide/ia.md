# Unified styles: the Information Architect's answers

Answers to the owner's twelve open questions for the unified style panel, from information
architecture: where each thing lives, how it is found, what it is called. The settled model is
not reopened.

Sources: the mock and its organization design (pull request #2098), the model (pull request
#2065), `tier3/style-catalog.md`. Element citations are `graphty-element/src/` on this branch.

---

## 1. "+" and cardinality

A property holds at most one value per layer, so "+" should mean "add another item to a list",
never "reveal the one value".

- (a) "+" per section (the mock). A click and a menu per property; in tier 1 round 2, Size
  behind Shape's "+" was found only by guessing (18 of 18).
- (b) Every property always drawn, unset ones showing the value from beneath (Figma's instance
  override pattern). Honest, but 35 rows.
- (c) **Recommended.** Core properties always drawn, unset ones showing the inherited value in
  secondary text (source layer on hover); picking writes; the minus returns to off. Core: Nodes: Shape, Size, Color. Edges: Color, Width, Head. Rare
  single values (opacity, pattern, curved, tail, wireframe, show) sit behind the section's
  `AdvancedButton`, as Figma keeps stroke caps and dashes behind a settings button
  (https://help.figma.com/hc/en-us/articles/360049283914-Apply-and-adjust-stroke-properties).
  A switch (on, off, not written) is a `ToggleRow` dimmed while inherited, plus the minus.

"+" stays only on Text (labels, tooltip, captions), Effects (outline, glow, halo, motion), the
tree header and "and" conditions in Which elements.

Element (additive): per property, what the layers beneath give a layer's elements (one value,
or Mixed with a count). `styles.explain` (`StylesApi.ts:492`) answers only per element.

## 2. Menus where "+" stays

- (a) A text-only `Menu`. Tells nothing apart.
- (b) Figma's way: "+" adds the commonest type at once
  (https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers). Breaks "adding
  never repaints by surprise".
- (c) **Recommended.** A `Menu` with a glyph per item (Outline, Glow, Halo, Motion; Label,
  Tooltip, Caption at each end), unavailable items disabled with the element's reason. The new
  entry focuses its color field with the `ColorPickerPanel` open, because color is the next
  thing anyone sets.

Shape (25), arrow kind (14) and pattern (9) open a `Popout` grid of glyphs, not text lists:
an icon-grid option on compact-mantine's `StyleSelect`. Ids come from `NodeShapes`,
`EdgeArrowTypes`, `EdgeLineTypes`; glyphs are the app's.

## 3. Panel length with nodes and edges

- (a) Two open groups that scroll (the mock).
- (b) Nodes and Edges tabs. Hides half of a route layer.
- (c) **Recommended.** Each kind group is a collapsible `ControlSection` using its existing
  `summary` prop (`ControlSection.tsx:91`), so a closed group still says what it does: "Edges:
  color D55E00, width 24, head arrow". Both start open; state persists for the session; property
  sections never collapse. With answer 1, the route layer must fit 900 px with both open
  (measure in the first build).

## 4. A layer with no edges (or no nodes)

- (a) Show the section disabled. Breaks "no promise without a place": a disabled Edges group
  says this layer could paint edges here.
- (b) **Recommended.** Hide it, as Figma hides Typography on a rectangle. The door to the other
  kind is the kind choice in Which elements (answer 8), so "where is edge color?" has one answer.
- (c) A stub, "Reaches no edges. Reach edges too". A second door to one control.

## 5. "Vary by" with many fields

The genomics persona has 10 to 40 columns. `session.data.attributes()` already gives each
column's measurement, completeness, unique count, origin, run and `usedBy`
(`catalog/types.ts:985-1030`). `styles.proposeEncoding` returns whether a column fits a channel,
and why not, cheaply enough for every row (`StylesApi.ts:375-388`).

- (a) A flat searchable list. Fine at 8, slow at 40.
- (b) Grouped (Hick's law): `SearchInput` focused, then In use, Data, one group per run, Facts;
  each `DataRow` with level glyph, unique count and completeness.
- (c) **Recommended.** (b), with non-fitting columns folded into one closing row, "12 that do
  not fit color", expanding to show them disabled with the element's reason. Search covers all.

Element: nothing new.

## 6. A visual gradient control

- (a) The mock's text fields. Complete, but read rather than seen.
- (b) A palette gallery only. Loses domain, clamp and midpoint.
- (c) **Recommended.** A ramp drawn over the histogram, on the value axis in data units. End
  handles set the domain. Shaded tails set a percentile clamp ("14 outside"). A center handle
  sets the midpoint. Tick marks show steps, and dragging a tick changes the step count. The flip
  button reverses. The axis follows the scale (log spaces the bars). A "No value" chit sits
  beside the bar. Typed fields stay under the bar for precision, as Figma's stop rows do. The
  palette is a swatch-strip `StyleSelect`.

compact-mantine: a ramp editor built from `GradientEditor` and `HistogramRow`.

Element: bins come from `session.data.histogram` and `RunResult.histogram` (with a log option).
Additive: a binding may carry an inline ramp (colors with positions) instead of a palette id.
`registerPalette` is global and cannot be removed, so it is no place for a reader's own stops.

## 7. Is the Louvain "folder" a layer?

Yes. It holds a binding and schemes that its children inherit, so it is a split parent, not a
folder. Folders write nothing, so their panel lists their rows and has no property sections.

- (a) **Recommended.** Keep both kinds and draw them apart. A split parent shows the layer glyph
  plus a caret, and its children show color chits. A folder shows the folder glyph. A folder
  never gets a Which elements rule: a folder with a rule would be a second way to scope a layer.
- (b) A split becomes a folder of copied layers: a palette change no longer reaches them.
- (c) Folders write to their children: silently overrides each child's choices.

## 8. Picking which elements

The element already thinks in halves: every rule leaf "speaks" nodes, edges or both
(`catalog/types.ts:1124-1136`), and a set reads edges `induced` or `listed` (`SetDefinition`).

- (a) Separate rules per kind. A route needs one rule, not two that drift.
- (b) **Recommended.** One Which elements section at the top: a `SegmentedControl` (Nodes,
  Edges, Both), then the rule. When Both is chosen and the rule speaks only nodes, one
  `StyleSelect` asks which edges: between them, touching them, or none.
- (c) One rule plus a per-kind narrowing. Two homes for scope.

One layer painting both kinds is breaking (model section 10, item 7); the additive alternative
is a new `targets` field beside an unchanged `target`.

## 9. Does the mock cover every style?

No. Missing or unreachable:

- the six rich-text markup tags
- `textPath`, billboard mode, resolution, auto size, borders and text outline join (no channel
  reaches them; `catalog/unreachable.ts`)
- gradient fills (drawn disabled)
- the node icon (`node.marker`, refused)
- outline width
- the context point

**Recommended:** a test over `CHANNEL_DESCRIPTORS` and `LABEL_STYLE_FIELDS` (`./catalog`) that
fails when one has no control, so coverage is a check, not a review.

## 10. Text labels

A label has 47 look fields (`catalog/label-style.ts:196-244`).

- (a) The mock's popover with six subgroups. Long.
- (b) Presets only. Too narrow for experts.
- (c) **Recommended.** At rest, a two-line entry. One `Popout`, "Label settings", with tabs
  (Basics, Box, Letters, Placement), as Figma's Type settings splits Basics and Details
  (https://help.figma.com/hc/en-us/articles/360039956634-Explore-text-properties). A Preset
  `StyleSelect` at its top lists the element's nine badges (`BadgeStyleManager.ts:3-117`).

Saved label styles (like Figma's text styles) would need an additive
`StyleDocument.labelStyles`; build only if the study shows reuse.

## 11. Generic picking for manual layers

- (a) Selection and find as doors. "Style selected" makes a layer whose rule is `member of` a
  kept set, which follows the set. Find's "Select where" row gains "Style these".
- (b) A rule builder: the RuleTree that Data > Filters already builds (range, categories,
  degree, neighborhood, member; `Filters.tsx:269-358`), so filtering and styling share one rule
  language.
- (c) A JMESPath expression (`match: "expression"`), checked by `validate`
  (`catalog/types.ts:1432`).

**Recommended:** all three as doors into one home, the Which elements editor: (b) by default,
(c) as "Edit as expression" for Expert Emma, (a) from the canvas. No algorithm gets a special
entry: "Top N by" takes any number.

Element (additive):

- a selector that takes a RuleTree directly (`{ match: "rule", where }`)
- a text leaf (contains, starts with, ends with, equals, case option). JMESPath 0.16's
  `contains` is case-sensitive and the reader cannot type it.
- a number leaf for odd, even and multiple of. JMESPath has no modulo.
- the element id as a readable value (spelling under issue #2029)

## 12. What can vary

- **Already bindable (catalog 9.3):** color (6), number (11), enum (4), text (5), boolean (3).
  Recommended: all but the booleans, which are rules and go to Which elements.
- **Literal only today:** label looks (`labelStyle`).

Element additive: per-field label channels (text size, color, background) so they can vary. Each
row takes the same vary glyph, and "=" in number fields opens the picker
(https://help.figma.com/hc/en-us/articles/15343107263511-Apply-variables-to-designs).
