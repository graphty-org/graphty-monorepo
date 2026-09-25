# Style inspector: every channel graphty-element exposes

Branch and pull request: `feat/style-inspector-all-channels`, one PR. The work packages in
section 4 may be implemented in parallel; each one owns a disjoint set of files.

## Goal

The graphty app's style-layer inspector must let a reader author every style a graphty-element
layer can carry:

- all 35 channels (14 node, 21 edge), as a fixed value (`set`), as a fixed-value binding
  (`encode: {value}`), and as a data binding (`encode: {by, ...}`) wherever the element accepts one;
- all 47 label-style fields, on all five label-style channels (`node.labelStyle`,
  `node.tooltipStyle`, `edge.labelStyle`, `edge.arrowHeadTextStyle`, `edge.arrowTailTextStyle`);
- every field of a data binding: `by`, `scale` and its options (`reverse`, `midpoint`, `bins`,
  `exponent`), `palette`, `domain` or `clamp`, `range`, `map`, `other`, `missing`, `overflow`;
- node layers and edge layers. 21 of the 35 channels are edge channels, and today the app can only
  create node layers.

Today the inspector draws a row for all 35 channels, but only as fixed values. A label style
exposes 5 of 47 fields. No channel can be bound to data. No layer can be removed or switched off.

## Rules this plan follows

- The app only consumes graphty-element. Every kind, range, step, enum list, default, scale rule
  and overflow rule the inspector needs is read from `@graphty/graphty-element/catalog` or
  `/schema`. Where the element does not publish a fact, the element is fixed first (work package 1)
  and the app copy is deleted (work package 4).
- Every edit goes through `session.styles` (`add`, `update`, `remove`, `move`, `validate`,
  `resolveToStatic`), addressed by the layer id the element assigns. Nothing touches a mesh or a
  material.
- Controls are compact-mantine components. Where one is missing a feature, compact-mantine gets
  the feature (work package 2). The forked copies in `graphty/src/components/sidebar/controls/`
  are deleted.
- `edge.width` has no documented unit (issue #125, blocked). Its control shows no unit suffix, no
  unit in its label, and never converts the number.
- Arrowheads are independent of the line. An arrow's size is `edge.arrowHeadSize` /
  `edge.arrowTailSize` and its fade is `edge.arrowHeadOpacity` / `edge.arrowTailOpacity`. The
  inspector never derives an arrow value from a line value. The one link is the element's own
  "arrow colour defaults to the line colour", which the inspector displays and does not compute.
- Label declutter is becoming a graph-level option in PR #338, not a style channel. No inspector
  row is added for it.
- Chromatic: new and changed stories produce new snapshots. Only the owner approves Chromatic
  changes; implementers never accept baselines.
- A row's unset state is always reachable: every control that writes a key has a reset that
  deletes the key. False, empty and zero are values, not "unset".

## Order against open pull requests

- PR #338 (glow strength per style, label declutter) changes `src/meshes/NodeEffects.ts`,
  `src/session/styles/channels.ts`, `src/session/styles/intern.ts`,
  `test/session/styles/channels.test.ts` and `docs/guide/styling.md`, and deletes the
  `node.glowStrength` caveat. Work package 1 starts only after #338 has merged, from a rebase of
  this branch onto master. Packages 2 and 3 do not touch those files and can start at once.
- PR #342 (arrowhead thickness and patterns) edits the `edge.patternCount` caveat text in
  `channels.ts`, and `src/config/EdgeStyle.ts` and `docs/guide/styling.md`. Whichever lands second
  resolves a comment-only conflict. Nothing in this plan depends on the caveat's wording.
- PR #348 has merged and is already on this branch's base.

## 1. Channel-by-channel table

Columns:

- Control: the compact-mantine component that edits the fixed value.
- Placement: "up front" is a row in the inspector body; "pop-out" is behind a `Popout` opened from
  that row. The design's door test decides this: a control goes behind a pop-out only when most
  layers never leave its default and the row left behind still shows whether this one did.
- Static: fixed value through `set`, or through `encode: {value}` when the layer already holds one
  (section 1.3).
- Data: which data bindings the element accepts, as published by `scalesForChannel(channel)`
  (new in work package 1). "all" is every built-in scale; "categorical" is `passthrough`,
  `ordinal` and `map` only, because the element refuses a built-in numeric scale on a text or
  boolean channel; "none" is fixed values only.
- Metadata source: the published export the control reads. `CD` is `CHANNEL_DESCRIPTORS[channel]`
  from `./catalog`; `default` means `channelDefault(channel)` (new, a function, see section 2.1).
  Fields marked "new" are added in work package 1.
- Status: exists (works today and only needs re-wiring), add (new in this plan), blocked.

Every row that can take a data binding carries a bind button in its trailing slot (the `attribute`
glyph), which opens the "Bind to data" pop-out (section 2.3). A row whose channel is bound draws
its control with `bound`, names the attribute, and offers "Convert to a fixed value". An
`InfoCircle` is drawn next to a row exactly when its descriptor has a `caveat`; the inspector names
no channel when deciding this.

### Node channels (14)

| Channel | Control | Placement | Static | Data | Metadata source | Status |
|---|---|---|---|---|---|---|
| node.shape | `StyleSelect` with `searchable` (25 values) | up front, Shape | yes | all (a number picks a slot) | CD `values`; `default` | static exists; search and bind add |
| node.size | `StyleNumberInput` | up front, Shape | yes | all | CD `min`, `step` (new); `default` | static exists; bind add |
| node.color | `CompactColorInput` (swatch, hex, opacity %) | up front, Color | yes | all, overflow other/shape/extend | CD `overflow` (new); `default`; `toColorValue` (new export) | static exists; alpha and bind add |
| node.opacity | the opacity % of the node.color row | up front, Color | yes | all | CD `min`/`max`, `step` (new); `default` | exists as its own row; merged into the colour row |
| node.glow | `ToggleWithContent` "Glow" revealing a `CompactColorInput` | up front, Effects | yes | all | CD `effectDefault` (new) | static exists; bind add |
| node.glowStrength | `StyleNumberInput`, its own row directly under the Glow toggle, always visible | up front, Effects | yes | all | CD `min`, `minExclusive` (new), `step` (new); `default` | static exists; own row and bind add |
| node.outline | `ToggleWithContent` "Outline" revealing a `CompactColorInput`; caveat in `InfoCircle` | up front, Effects | yes | all | CD `effectDefault` (new), `caveat` | static exists; caveat and bind add |
| node.wireframe | `ToggleRow` with reset, in the Effects `ToggleRowGroup` | up front, Effects | yes | categorical | `default` | static exists; unset state and bind add |
| node.flat | `ToggleRow` with reset, in the Effects `ToggleRowGroup` | up front, Effects | yes | categorical | `default` | static exists; unset state and bind add |
| node.marker | disabled row, reason is the element's `caveat` | up front, Effects | no (element refuses) | none | CD `renderable: false`, `caveat` | exists; switch to the element caveat |
| node.label | `PanelField kind="text"` with reset | up front, Text | yes | categorical | CD `accepts` | static exists; reset and bind add |
| node.labelStyle | `CompoundRow` (size, colour swatch, location) opening `LabelStyleEditor` | pop-out | yes | none | `default` (the pre-fill); `LABEL_STYLE_DESCRIPTORS` (new) | 5 of 47 fields exist; 42 add |
| node.tooltip | `PanelField kind="text"` with reset; caveat in `InfoCircle` | up front, Text | yes | categorical | CD `caveat` | static exists; caveat, reset and bind add |
| node.tooltipStyle | `CompoundRow` opening `LabelStyleEditor` | pop-out | yes | none | `default`; `LABEL_STYLE_DESCRIPTORS` | 5 of 47 exist; 42 add |

Glow and outline, in detail:

- The Glow toggle is checked when this layer sets `node.glow` or `node.glowStrength` (in `set` or
  `encode`), because the element switches glow on when either is present.
- Checking Glow writes `node.glowStrength` at its published `default`. That switches the glow on
  without writing a colour, so a lower layer's glow colour still shows through. The revealed colour
  input shows the element's `effectDefault` in italics while `node.glow` is unset.
- Unchecking Glow deletes both keys. A strength-only layer is still possible: set strength in its
  own row without touching the toggle.
- Checking Outline writes `node.outline` = its published `effectDefault`, since the colour is the
  only thing that switches an outline on. Unchecking deletes the key.
- A higher layer cannot switch off a lower layer's glow or outline: the element has no "off" value
  for a colour channel. That is an element limit, filed as an issue by work package 1, and not
  worked around here.

### Edge channels (21)

| Channel | Control | Placement | Static | Data | Metadata source | Status |
|---|---|---|---|---|---|---|
| edge.style | `StyleSelect` (9 values) | up front, Line | yes | all (slots) | CD `values`; `default` | exists; hand-copied options deleted |
| edge.width | `StyleNumberInput`, no unit suffix | up front, Line | yes | all | CD `min`, `minExclusive` (new), `step` (new); `default` | static exists; bind add; unit blocked on #125 |
| edge.color | `CompactColorInput` (swatch, hex, opacity %) | up front, Line | yes | all, overflow other/extend | CD `overflow` (new); `default` ("darkgrey"); `toColorValue` | static exists; alpha and bind add |
| edge.opacity | the opacity % of the edge.color row | up front, Line | yes | all | CD `min`/`max`, `step` (new); `default` | exists as its own row; merged |
| edge.curvature | `ToggleRow` "Curved" with reset; caveat in `InfoCircle` | up front, Line | yes | categorical | `default`; CD `caveat` | static exists; unset state, caveat and bind add |
| edge.patternCount | `PanelField kind="number"` in a `FieldRow`, `placeholder="auto"` when unset, reset; caveat in `InfoCircle`; always enabled | up front, Line | yes | all | CD `min`, `integer` (new), `step` (new), `caveat`; no default | static exists; auto, caveat and bind add |
| edge.animationSpeed | `StyleNumberInput` | up front, Line | yes | all | CD `min`, `step` (new); `default` | static exists; bind add |
| edge.arrowHead | `StyleSelect` with `searchable` (14 values) | up front, Arrows | yes | all (slots) | CD `values`; `default` ("normal") | exists; hand-copied options deleted |
| edge.arrowHeadSize | `StyleNumberInput` | up front, Arrows | yes | all | CD `min`, `minExclusive` (new), `step` (new); `default` | static exists; bind add |
| edge.arrowHeadColor | `CompactColorInput` whose opacity % writes edge.arrowHeadOpacity; unset reads "same as line" | up front, Arrows | yes | all, overflow other/extend | CD `defaultFrom: "edge.color"` (new) | static exists; bind add |
| edge.arrowHeadOpacity | the opacity % of the arrowHeadColor row | up front, Arrows | yes | all | CD `min`/`max`, `step`; `default` | merged into the colour row |
| edge.arrowHeadText | `PanelField kind="text"` with reset; caveat in `InfoCircle` | up front, Arrows | yes | categorical | CD `caveat` | static exists; caveat, reset and bind add |
| edge.arrowHeadTextStyle | `CompoundRow` opening `LabelStyleEditor` | pop-out | yes | none | `LABEL_STYLE_DESCRIPTORS`; no channel pre-fill | 5 of 47 exist; 42 add |
| edge.arrowTail | `StyleSelect` with `searchable` | Tail `ControlSubGroup` (collapsed unless a tail key is set) | yes | all (slots) | CD `values`; `default` ("none") | exists; app fallback literal deleted |
| edge.arrowTailSize | `StyleNumberInput` | Tail sub-group | yes | all | CD `min`, `minExclusive`, `step`; `default` | static exists; bind add |
| edge.arrowTailColor | `CompactColorInput` whose opacity % writes edge.arrowTailOpacity; unset reads "same as line" | Tail sub-group | yes | all, overflow other/extend | CD `defaultFrom: "edge.color"` | static exists; bind add |
| edge.arrowTailOpacity | the opacity % of the arrowTailColor row | Tail sub-group | yes | all | CD `min`/`max`, `step`; `default` | merged into the colour row |
| edge.arrowTailText | `PanelField kind="text"` with reset; caveat in `InfoCircle`; always enabled | Tail sub-group | yes | categorical | CD `caveat` | static exists; caveat, reset and bind add |
| edge.arrowTailTextStyle | `CompoundRow` opening `LabelStyleEditor` | pop-out | yes | none | `LABEL_STYLE_DESCRIPTORS`; no channel pre-fill | 5 of 47 exist; 42 add |
| edge.label | `PanelField kind="text"` with reset | up front, Text | yes | categorical | CD `accepts` | static exists; reset and bind add |
| edge.labelStyle | `CompoundRow` opening `LabelStyleEditor` | pop-out | yes | none | `default` (the pre-fill); `LABEL_STYLE_DESCRIPTORS` | 5 of 47 exist; 42 add |

`edge.patternCount` and `edge.arrowTailText` are never disabled. Whether this layer's line is
patterned or has a tail cannot be known from the layer: the pattern or tail can come from another
layer, from a binding, or differ per edge. A layer that sets only a pattern count or only a tail
caption is valid. The caveat says when the value has no effect.

Section order is fixed. Node layer: Which nodes, Shape, Color, Effects, Text. Edge layer: Which
edges, Line, Arrows, Text. Decision: keep the existing group names and order, because UAT-10 in
`design/ui/UAT.md` and the current tests assert them, and a rename is an edit.

### 1.1 Colour rows (colour and opacity in one row)

Four rows pair a colour channel with an opacity channel: node.color + node.opacity, edge.color +
edge.opacity, edge.arrowHeadColor + edge.arrowHeadOpacity, edge.arrowTailColor +
edge.arrowTailOpacity.

- The control is `CompactColorInput` with `opacityScale="fraction"` (new in work package 2), so the
  control takes and returns the channel's 0-1 number and only displays it as a percentage. The app
  converts nothing.
- The hex writes the colour channel; the percentage writes the opacity channel; `onChange(color,
  opacity)` writes both in one `update` when a gesture moves both.
- Each half resets on its own. Arrow opacity is writable while the arrow colour is unset ("same as
  line").
- Binding: the row's bind button opens the bind pop-out with a two-way choice at the top, Colour or
  Opacity (`IconGroupRow`, hybrid, words). The row is drawn bound when either half is bound; the
  bound half shows `bound` (`colorBound` / `opacityBound`, new in work package 2) and the other half
  stays editable.
- Alpha inside the colour: a colour may carry its own alpha (`#rrggbbaa`, an `Rgba` with `a`).
  `toColorValue(value)` reads it. When `a` is below 1, the row shows the hint "Colour carries alpha
  NN%" with a reset x that rewrites the colour as `toColorValue(value).hex`. A hex edit on such a
  colour writes an `Rgba` built from `toColorValue(newHex)` with the old `a`, so the alpha is kept
  until the reader clears it.
- Arrow colour unset: the swatch shows `channelDefault(CD.defaultFrom)` in italics and the label
  reads "same as line". The inspector does not look up any other layer's line colour.

### 1.2 Boolean and text rows (three states)

- A boolean channel or label field has three states: unset, true, false. False is how a higher
  layer turns off a lower layer's true. `ToggleRow` and `ToggleWithContent` get `inherited` and
  `onReset` (work package 2): unset draws the published default in the inherited (italic) style;
  a set value draws normally with a reset x that deletes the key.
- A text channel or label text field (`font`, `icon`, `overflowSuffix`) is unset, or a string.
  An empty string is a value: writing words switches the label on, so `""` draws an empty label.
  `PanelField` gets `onReset` (work package 2), which draws a reset x while the field has a value
  and deletes the key.

### 1.3 Fixed-value bindings (`encode: {value}`)

A channel may be held as `encode[channel] = {value: ...}`. `encode` wins over `set` on repaint, so
writing to `set` would be painted over. Such a row is drawn as an editable fixed value and every
edit writes back to `encode[channel].value`; its reset deletes the key from `encode`. This applies
to every channel, including the five label-style channels, which the element accepts as `{value}`
(only data bindings are refused for them). A `{by}` binding is drawn bound with "Convert to a fixed
value" (`resolveToStatic`) and the bind button, which reopens the pop-out on the existing binding.

### 1.4 Label style editor (all 47 fields, shared by the five label-style channels)

One component, `LabelStyleEditor`, renders every entry of `LABEL_STYLE_DESCRIPTORS` inside the
pop-out, choosing the control from the descriptor's `accepts`. Nothing in it names a field.

| Descriptor `accepts` | Control |
|---|---|
| number | `StyleNumberInput` (min, max, step, integer and default from the descriptor; unset with no default shows "not set") |
| color | `CompactColorInput` |
| enum, up to 6 values | `StyleSelect` (`IconGroupRow` needs pictures the element does not publish) |
| enum, more than 6 | `StyleSelect` with `searchable` |
| boolean | `ToggleRow` with reset; a boolean that gates a group (gradient, pointer, shadow, depthFade, smartOverflow) is a `ToggleWithContent` with reset wrapping that group |
| text | `PanelField kind="text"` with reset |
| colorList (gradientColors) | `GradientEditor` with `evenlySpaced` (new in work package 2): no offset handles, stops spread evenly, add and remove, `minStops` from the descriptor's `minItems` |

Enum values may be numbers as well as strings (the weight list is `"normal"`, `"bold"`, 100 to
900). The select's option value is the published value's text, and `onChange` writes back the
published value whose text matched, so the app never converts a spelling. A stored value that is
not in the list (for example `weight: 550`) is shown as an extra option with its own text, so the
select is never blank. New values outside the list cannot be authored; that is the published list.

Grouping comes from the descriptor's `group` and `advanced` fields, following the design's three
levels:

- Inline at the top of the pop-out: font, sizePx, weight, color, lineHeight, textAlign, location.
- Sections (`ControlSection`, collapsed unless a field in it is set): Background (background,
  padding, cornerRadius, gradient, gradientType, gradientColors, gradientDirection), Border
  (borderWidth, borderColor), Outline (outline, outlineWidth), Shadow (shadow, shadowColor,
  shadowBlur, shadowOffsetX, shadowOffsetY), Depth fade (depthFade, depthFadeNear, depthFadeFar).
- Advanced (`AdvancedButton`, with its `changed` dot when any field inside is set): Placement
  (attachOffset, marginTop, marginBottom, marginLeft, marginRight), Callout (pointer,
  pointerDirection, pointerWidth, pointerHeight, pointerOffset, pointerCurve), Animation (animation,
  animationSpeed), Badge (badge, icon, iconPosition, progress), Overflow (smartOverflow, maxNumber,
  overflowSuffix), Visibility (enabled).

That places each of the 47 fields exactly once. The row at rest (`CompoundRow`) shows three
segments: size, a colour swatch and location. The pop-out's title is the channel's `plainName`.
An unset field shows the channel pre-fill (from `channelDefault(channel)`) when it has one, else
the field's descriptor `default`, in italics; a field with neither shows "not set". Every edit
writes the whole label style with only that field changed; a reset removes the field.

## 2. Prerequisite work

### 2.1 graphty-element: publish the missing metadata (work package 1)

All additions are exported from `./catalog`, which is already Node-safe;
`test/packaging/node-safe-entries.test.ts` keeps it that way with no change.

1. **Channel defaults, as a function.** `GraphSession.ts` (`elementBaseLayers`) warns that
   `defaultNodeStyle` / `defaultEdgeStyle` are mutable exported objects and must not be read once
   at module load. So the default is `channelDefault(channel): ChannelValue | undefined`, which
   reads on every call:
   - base-layer channels (node.color, node.size, node.shape, edge.color, edge.width, edge.style,
     edge.arrowHead, edge.arrowHeadSize, edge.arrowHeadOpacity, edge.animationSpeed): read from
     `defaultNodeStyle` / `defaultEdgeStyle` through the descriptor's `stylePath`, the same values
     the element's "Node defaults" and "Edge defaults" layers write;
   - renderer fallbacks moved into one place in `channels.ts` (a frozen map, read by
     `channelDefault` and by the renderer): node.opacity 1, edge.opacity 1, node.glowStrength 1,
     edge.arrowTail "none", edge.arrowTailSize 1, edge.arrowTailOpacity 1, node.wireframe false,
     node.flat false, edge.curvature false. The renderer files read the same map:
     `src/meshes/NodeEffects.ts` (glow strength `?? 1`), `src/meshes/EdgeMesh.ts` (arrow
     `size ?? 1.0`, `opacity ?? 1.0`, line `opacity ?? 1.0`), `src/Edge.ts` (tail type
     `?? "none"` at the two tail sites, arrow size `?? 1.0` at the two size sites). So the published
     default and the drawn default are one value;
   - label-style channels: the pre-fill partial `LabelStyle` (next item);
   - no default: the five text channels, node.marker, node.glow, node.outline (unset draws no glow
     and no outline), edge.patternCount (unset means the spacing rule decides), the arrow colours
     (they use `defaultFrom`), and the arrow caption styles (they have no pre-fill).

   Left alone, with a one-line comment each: the head type `?? "none"` and the colour chain
   `?? "#FFFFFF"` in `Edge.ts`. They only apply when no base layer is present, and the published
   head default is the base layer's "normal".
2. **Effect switch-on colour.** `effectDefault` on the `node.glow` and `node.outline` descriptors:
   the colour drawn when the effect is on and this channel is unset. The literals
   `DEFAULT_GLOW_COLOR` and `DEFAULT_OUTLINE_COLOR` move from `NodeEffects.ts` into the descriptors,
   and `NodeEffects.ts` reads them from there.
3. **Arrow colour.** `defaultFrom: "edge.color"` on `edge.arrowHeadColor` and `edge.arrowTailColor`.
4. **Label-style pre-fills, declared once.** In `src/catalog/label-style.ts`, three internal
   `LabelStyle` partials: node label (`location: "top"`, `color: "#000000"`), node tooltip
   (`location: "top-right"`, `color: "#000000"`, `background: "#FFFFFF"`), edge label
   (`location: "top"`). `src/config/NodeStyle.ts` and `src/config/EdgeStyle.ts` build their
   `RichTextStyle.prefault(...)` arguments from these through the key map (item 7), so the
   renderer-spelled prefaults and the published pre-fills are one source. `channelDefault` returns
   them for `node.labelStyle`, `node.tooltipStyle`, `edge.labelStyle`.
5. **Numeric metadata.** `step` on every numeric channel (moving today's app values: size 0.1,
   width 0.5, opacity 0.05, arrow sizes 0.1, glowStrength 0.1, animationSpeed 0.1, patternCount 1);
   `integer: true` on `edge.patternCount`; `minExclusive: true` on `node.glowStrength`,
   `edge.width`, `edge.arrowHeadSize`, `edge.arrowTailSize`, agreeing with the schema's
   `positive()`. No unit field: units are undecided (#125).
   `converterFor` in `src/session/styles/encoding.ts` honours both: a scaled value at or below an
   exclusive minimum is a miss (not painted, like any other scale miss), and an `integer` channel
   rounds. Without this, a bound `edge.width` can produce 0 and a bound `edge.patternCount` 2.5,
   both of which the schema rejects.
6. **Binding rules, published once.**
   - `channelTakesScale(descriptor, scale, numeric)` is extracted from `assertChannelTakesScale`
     into `channels.ts`; `assertChannelTakesScale` calls it. `scalesForChannel(channel)` returns
     the built-in `ScaleDescriptor`s the channel takes, built from that predicate. The pop-out
     intersects it with the existing `scalesForDomain(domainKind)`.
   - `overflow: readonly BindingOverflow[]` on every descriptor that accepts a categorical
     binding: `["other", "shape", "extend"]` on node channels, `["other", "extend"]` on edge
     channels, absent on `node.marker` and the label-style channels. The three places that refuse
     `"shape"` on an edge (`Layer.ts` around line 735, `encoding.ts` `overflowKeep` around line
     1322, `EncodingSpec.ts` around line 449) read this field instead.
   - `map` and `missing` values widen from `string | number` to `string | number | boolean`
     (`Binding` in `src/catalog/types.ts`). The boolean converter already reads `true`; this lets a
     map row on a boolean channel store what its toggle produces, with no spelling conversion in
     the app.
7. **Label style descriptors.** In `src/catalog/label-style.ts`:
   - Move `RICH_TEXT_KEYS` out of `src/managers/StylePainter.ts` into this file (internal, not
     exported); `StylePainter.ts` imports it.
   - The runtime enum lists come from the existing Zod enums in `src/config/RichTextStyle.ts`
     (`.options`), so they cannot drift. The `LabelStyle` types are unchanged.
   - Publish `LABEL_STYLE_DESCRIPTORS: Readonly<Record<keyof LabelStyle,
     LabelStyleFieldDescriptor>>` with `field`, `plainName`, `accepts` (`ChannelValueKind` values
     plus `"colorList"`), `values` (`readonly (string | number)[]`), `min`, `max`, `step`,
     `integer`, `minItems`, `default`, `group`, `advanced`.
   - Where each fact comes from:
     - `default`, for the 37 fields in the key map whose `RichTextStyle` entry has a schema
       default: read from the schema under the renderer name, never retyped;
     - `weight`: values `["normal", "bold", 100, 200, 300, 400, 500, 600, 700, 800, 900]`, default
       "normal"; declared here, because the renderer's `fontWeight` is a free `z.string()`.
       `LabelStyle.weight` is not widened;
     - `outline`: no default (unset means no outline; writing it switches the outline on);
     - `gradientColors`: `accepts: "colorList"`, `minItems: 2`, no default. Package 1 confirms
       against the painter that a one-colour gradient is not drawn and adjusts `minItems` to what
       the painter needs;
     - `enabled`: no default. The schema default is false, but a label is on whenever words are
       written, so showing "off" would be wrong;
     - `background`, `badge`, `icon`, `progress`: no default (the schema has none);
     - numeric bounds, declared here and documented in the file: min 0 on sizes, widths, padding,
       radius, margins, blur, pointer sizes, depth distances and speeds; `progress` 0 to 1;
       `maxNumber` integer, min 0. Offsets (`attachOffset`, `pointerOffset`, shadow offsets) have
       no minimum;
     - `group` and `advanced`: as in section 1.4.
8. **Colour helper.** Export `toColorValue` and the `ColorValue` type from `./catalog` (they live
   in `src/session/styles/channels.ts`, which `catalog.ts` already re-exports from).
9. **Generated JSON and docs.** Add `channels` (the descriptors plus each channel's current
   default) and `labelStyleFields` to `scripts/generate-catalog-json.mjs`; describe both keys in
   `graphty-element/AGENTS.md`. Add a "Building a style editor" section to
   `graphty-element/docs/guide/styling.md` showing `CHANNEL_DESCRIPTORS`, `channelDefault`,
   `LABEL_STYLE_DESCRIPTORS`, `scalesForChannel` and `overflow`.
10. **Issue.** File a graphty-element issue: a layer cannot switch off a lower layer's glow or
    outline, because both are colour channels with no "off" value.

Files: `graphty-element/src/session/styles/channels.ts`, `src/session/styles/encoding.ts`,
`src/session/styles/EncodingSpec.ts`, `src/session/styles/Layer.ts`, `src/catalog/label-style.ts`,
`src/catalog/types.ts`, `src/config/NodeStyle.ts`, `src/config/EdgeStyle.ts`,
`src/managers/StylePainter.ts`, `src/meshes/NodeEffects.ts`, `src/meshes/EdgeMesh.ts`,
`src/Edge.ts`, `catalog.ts`, `scripts/generate-catalog-json.mjs`, `AGENTS.md`,
`docs/guide/styling.md`, and the tests below.

Tests (the `default` Node project unless noted):

- `test/session/styles/channels.test.ts`:
  - `channelDefault` is defined exactly for the channels listed in item 1, and undefined for the
    rest (the exemptions are asserted by name, so a new channel must be classified);
  - every defined default passes `styles.validate` as a `set` value;
  - base-layer defaults equal the values in the element's "Node defaults" / "Edge defaults"
    layers, and follow a change to `defaultNodeStyle` made after import;
  - label-style channel defaults equal the `NodeStyle` / `EdgeStyle` prefaults parsed through the
    schema and mapped back through the key map;
  - for each numeric channel, the schema accepts `min` exactly when `minExclusive` is absent;
  - `integer` channels reject 2.5.
- `test/session/styles/encoding.test.ts`:
  - for every channel and every built-in scale, `validate` refuses the binding exactly when the
    scale is not in `scalesForChannel(channel)`;
  - for every channel and each overflow policy on a categorical scale, `validate` accepts it
    exactly when the descriptor's `overflow` lists it (so `"shape"` passes on `node.shape` and
    `node.color`, and fails on every edge channel);
  - a linear binding on `edge.width` with range [0, 4] never paints 0, and one on
    `edge.patternCount` paints only integers; every painted value parses under the schema;
  - a `map` with boolean values on `node.wireframe` paints.
- `test/session/styles/label-style.test.ts`:
  - `LABEL_STYLE_DESCRIPTORS` has exactly the keys of `LABEL_STYLE_FIELDS`;
  - for the fields with a schema default and a plain rename, `default` equals the schema default;
    the exceptions listed in item 7 are asserted by name;
  - each enum's `values` equal the Zod enum's `.options` (weight excepted, asserted separately);
  - a label style written with every field survives `StylePainter` (existing painter test
    extended), including `weight: 600`.
- `test/packaging/exports-map.test.ts`: the new names resolve from `./catalog`.
- Unchanged and still passing, which shows the moved fallbacks draw the same thing:
  `test/Edge.arrowTail.test.ts`, `test/session/styles/arrow-channels.test.ts`,
  `test/node-shape-edge-reattach.test.ts`, `test/ai/commands/StyleCommands.test.ts`, and (browser
  project) `test/browser/glow-strength-per-style.test.ts` from #338.

### 2.2 compact-mantine: the missing control features (work package 2)

Every prop below is opt-in. With it absent, a control renders exactly as today (no trailing column
is reserved when `trailing` is absent).

1. **Search.** `searchable` and `renderOption` on `StyleSelect`
   (`compact-mantine/src/components/StyleSelect.tsx`) and on `PanelField kind="select"`
   (`src/components/rows/PanelField.tsx`), passed to the Mantine `Select`. Needed for 25 shapes,
   14 arrow types, the attribute list and the palette list (`renderOption` draws each palette's
   strip).
2. **Bound state and trailing slot** on the controls that lack them:
   - `StyleSelect`, `StyleNumberInput`: `bound`, `boundDescription`, `trailing`;
   - `CompactColorInput`: `colorBound`, `opacityBound`, `boundDescription`, `trailing`;
   - `ToggleWithContent`: `trailing` (it already has `bound`).
   `bound` announces through the existing `fieldBound` label, the same way `PanelField` and
   `ToggleRow` do.
3. **Reset for three-state values.** `inherited` and `onReset` on `ToggleRow` and
   `ToggleWithContent`: `inherited` draws the label in the italic default style used by
   `StyleSelect`; `onReset` draws the shared reset x while the value is set. `onReset` on
   `PanelField`: a reset x inside the field while it has a value.
4. **Opacity as a fraction.** `opacityScale?: "percent" | "fraction"` on `CompactColorInput`
   (default `"percent"`). With `"fraction"`, `opacity`, `defaultOpacity` and the opacity passed to
   `onChange` / `onOpacityChange` are 0 to 1; the display stays a percentage.
5. **Evenly spaced colour lists.** `evenlySpaced` on `GradientEditor`: stops are spread evenly,
   offset handles are hidden, add and remove keep the spacing, `minStops` still applies. That is
   what a label gradient is (colours with no positions), and it avoids a second colour-list editor.
6. **`disabledReason` on `PanelField`**, through `useControlAnnotation`
   (`src/utils/control-annotation.ts`), matching the other controls. Used for a text row whose
   channel the element refuses, and for consistency.

Not built, and why:

- A categorical palette editor: palettes are picked from the element's `PALETTE_DESCRIPTORS`, and
  per-value colours are `map` rows. Add it when a reader needs to author a new palette.
- A slider row: dragging the `PanelField` glyph covers it.
- A multi-line text row: labels are single-line templates.

Tests (`default` and `browser` projects):

- `tests/components/StyleSelect.test.tsx`: typing filters options; `renderOption` output appears;
  `bound` adds the bound description; `trailing` renders its node.
- `tests/components/StyleNumberInput.test.tsx`: `bound` and `trailing`.
- `tests/components/CompactColorInput.test.tsx`: `opacityScale="fraction"` shows 50% for 0.5 and
  emits 0.25 for 25%; `colorBound` and `opacityBound` each announce on their own half; `trailing`.
- `tests/components/ToggleWithContent.test.tsx` and `tests/components/rows/ToggleRow.test.tsx`:
  unset (inherited) then true then false then reset calls `onReset`; the reset x is absent while
  inherited.
- `tests/components/rows/PanelField.test.tsx`: searchable select; `onReset` shows only with a value
  and fires on click.
- `tests/components/GradientEditor.test.tsx`: `evenlySpaced` hides offsets, adding a stop
  re-spreads, removal stops at `minStops`.
- `tests/components/disabledReason.test.tsx`: add `PanelField` to its table.
- Stories (each with a play function):
  - `stories/StyleSelect.stories.tsx`: `Searchable` (types "ico", asserts two options remain),
    `Bound`;
  - `stories/PanelField.stories.tsx`: `SearchableSelect`, `Resettable`, `DisabledWithReason`;
  - `stories/ToggleRow.stories.tsx`: `InheritedAndReset`;
  - `stories/CompactColorInput.stories.tsx`: `FractionOpacity`, `HalfBound`;
  - `stories/StyleNumberInput.stories.tsx`: `BoundWithTrailing`;
  - `stories/GradientEditor.stories.tsx`: `EvenlySpaced`.

### 2.3 The "Bind to data" pop-out (work package 6)

`graphty/src/components/sidebar/panels/ChannelBindingPopout.tsx` is one component used for every
channel that takes a data binding. It builds a `Binding` from published facts only.

- **Channel choice** (colour rows only): Colour or Opacity, as in section 1.1.
- **Attribute:** a searchable `StyleSelect` over the `attributes` prop (the element's
  `session.data.attributes()`), filtered to `kind` equal to the layer's target, showing
  `plainName` and, for categorical attributes, `uniqueCount`. It writes `by` from
  `AttributeDescriptor.path`, never `name`. A stored `by` that is not in the list (for example a
  result path whose run has not happened yet) is shown as read-only text, not a blank select.
- **Scale:** `scalesForChannel(channel)` intersected with `scalesForDomain(attribute's kind)`, so
  a text attribute is never offered `log`. Square root, linear and log use `IconGroupRow` with
  their glyphs; the rest go in a `StyleSelect` beside it. Scale options come from
  `ScaleDescriptor.options` by `OptionDescriptor.type`: number is `StyleNumberInput`; integer is
  `StyleNumberInput` with step 1 (bins, 2 to 20); boolean is `ToggleRow` (reverse). `midpoint` is
  shown only when the chosen palette's kind is diverging.
- **Output:**
  - number channels: a `FieldRow` of two `PanelField kind="number"` (sizeSmallest / sizeLargest
    glyphs), bounded by the channel's `min` / `max`, writing `range`;
  - colour channels: a palette `StyleSelect` with `renderOption` over `palettesOfKind(...)`
    (categorical for a categorical scale, sequential and diverging for a numeric one), plus a
    `RampRow` preview;
  - `node.shape` with overflow "shape": the palette select too, because the shape cycle length is
    read from `palette`.
- **Map (every channel that takes a binding):** rows of a key `PanelField kind="text"` plus the
  channel's own control, in a `ControlGroup` with add and remove. Values are written as the control
  produces them: numbers, hex strings, enum values, words, booleans.
- **Lump rare values (`other`):** a threshold (`StyleNumberInput`, integer, min 1) plus a value in
  the channel's own control. Shown only for categorical scales; the element refuses it on a numeric
  one. This is the reader's way out of `E_CAP_EXCEEDED` on enum channels with more groups than
  values.
- **Domain:** one three-way choice (`StyleSelect`): Auto; Auto, clipped at percentiles (two
  numbers 0 to 100, low below high, writing `clamp`); Fixed (two numbers, writing `domain`). Never
  both `clamp` and `domain`. Numeric scales only.
- **Missing values:** skip, or a value in the channel's own control.
- **Overflow:** a `StyleSelect` over the descriptor's `overflow` list, only on a categorical scale
  and only when the list is present.
- **Apply:** calls `onValidate` (the element's `session.styles.validate`) on the layer with the new
  binding and shows the element's message inline. It then writes through `onUpdate(layerId,
  {encode})`; `onUpdate` returns a promise, and a rejection (for example `E_CAP_EXCEEDED`, which
  only a repaint finds) is shown inline too, with the pop-out left open.
- **Remove:** the bound row's reset x deletes the key from `encode`.

Not built, and why:

- The histogram and outlier count in the design's ramp options: the element publishes no column
  histogram. Add them when `session.data` does.
- The "Not computed yet" metric group: that is Analyze integration, a separate feature.
- Scales an extension registers by name: `scalesForChannel` lists built-ins only. Add a session
  method when an extension scale exists.

## 3. Removing app-side copies and workarounds (work package 4 unless noted)

| What | Where | Replacement |
|---|---|---|
| `LINE_TYPE_OPTIONS`, `ARROW_TYPE_OPTIONS` and their stale "module-private" comments | `graphty/src/constants/style-options.ts` | options built from `CHANNEL_DESCRIPTORS[...].values`; the word shown is the value with `-` / `_` turned to spaces |
| `NODE_SHAPE_OPTIONS` read from `NodeShapes` in `./schema` | `style-options.ts` | `CHANNEL_DESCRIPTORS["node.shape"].values` |
| literal fallbacks (`node.opacity` 1, `node.wireframe` / `node.flat` / `edge.curvature` false, `edge.arrowTail` "none", `edge.animationSpeed` 0) and every direct `defaultNodeStyle` / `defaultEdgeStyle` read | `graphty/src/utils/channelControls.ts` | `channelDefault(channel)` / `CD.defaultFrom` |
| `step` values | `channelControls.ts` | `CD.step` |
| `MARKER_REASON` | `channelControls.ts` | `CHANNEL_DESCRIPTORS["node.marker"].caveat` |
| `hexOf` / `defaultNodeHex` hex conversion | `channelControls.ts` | `toColorValue(...).hex`; `defaultNodeHex` stays exported for `canvas/legendChannels.ts` but reads `channelDefault("node.color")` |
| `colorOf` (drops alpha) | `StyleLayerPropertiesPanel.tsx` (work package 7) | `toColorValue` |
| label-style default literals (background `#FFFFFF`, right only for tooltips; outline `#FFFFFF`, wrong everywhere since the element's is `#000000`) | `StyleLayerPropertiesPanel.tsx` `LabelStyleRows` (work package 7) | deleted with `LabelStyleRows`; `LabelStyleEditor` reads the descriptors |
| encoded-row lock with its own sentence, including the dead row for a `{value}` binding | `StyleLayerPropertiesPanel.tsx` (work package 7) | section 1.3 |
| stale header comments ("nine fields of `LabelStyle`", `maxWidth` / `wrap`, "styles.explain() answers") | `StyleLayerPropertiesPanel.tsx` (work package 7) | rewritten to describe what the panel does |
| forked controls `CompactCheckbox`, `CompactColorInput`, `ControlSubGroup`, `EffectToggle`, `StyleNumberInput`, `StyleSelect` and their `__tests__` | `graphty/src/components/sidebar/controls/` | deleted; only tests import them |
| the `describe` block that renders the forked `CompactColorInput` | `graphty/src/components/__tests__/compact-css-regression.test.tsx` | deleted; compact-mantine's own `CompactColorInput.test.tsx` covers it |
| `console.error` on a refused layer edit | `AppShell.tsx` `updateLayer` (work package 8) | the promise is returned to the caller, which shows the element's message inline |

`CHANNEL_UI` keeps only presentation the element has no opinion about: the row label and the
group.

## 4. Work packages

Each package owns the files listed; no file appears in two packages. All land on
`feat/style-inspector-all-channels`.

| Package | Owns | Depends on |
|---|---|---|
| 1. Element metadata | the graphty-element files and tests in section 2.1 | PR #338 merged |
| 2. compact-mantine controls | `compact-mantine/src/components/StyleSelect.tsx`, `StyleNumberInput.tsx`, `CompactColorInput.tsx`, `ToggleWithContent.tsx`, `GradientEditor.tsx`, `rows/PanelField.tsx`, `rows/ToggleRow.tsx`, their tests in `compact-mantine/tests/components/`, `tests/components/disabledReason.test.tsx`, and the stories listed in section 2.2 | none |
| 3. Layer list | `graphty/src/components/layout/LeftSidebar.tsx`, `graphty/src/components/shell/panel/StylePanel.tsx`, `layout/__tests__/LeftSidebar.test.tsx`, `shell/panel/__tests__/StylePanel.test.tsx`, `sidebar/__tests__/SidebarCompactIntegration.test.tsx` | none |
| 4. Channel table and removals | `graphty/src/utils/channelControls.ts`, `graphty/src/constants/style-options.ts`, their tests, `graphty/src/components/sidebar/controls/` (delete), `graphty/src/components/__tests__/compact-css-regression.test.tsx` | 1 |
| 5. Label style editor | new `graphty/src/components/sidebar/panels/LabelStyleEditor.tsx` and `panels/__tests__/LabelStyleEditor.test.tsx` | 1, 2 |
| 6. Bind pop-out | new `graphty/src/components/sidebar/panels/ChannelBindingPopout.tsx` and `panels/__tests__/ChannelBindingPopout.test.tsx` | 1, 2 |
| 7. Panel integration | `graphty/src/components/sidebar/panels/StyleLayerPropertiesPanel.tsx`, `graphty/src/components/shell/inspector/StyleLayerInspector.tsx`, their tests, new `graphty/src/stories/StyleLayerInspector.stories.tsx` | 4, 5, 6 |
| 8. App wiring | `graphty/src/components/shell/AppShell.tsx`, `graphty/src/components/shell/__tests__/AppShell.test.tsx` | 3, 7 |

Packages 2 and 3 start at once; package 1 starts when #338 has merged. Packages 4, 5 and 6 start
when package 1 has built (`pnpm exec nx run graphty-element:build`); 5 and 6 also need package 2
built (`pnpm exec nx run compact-mantine:build`, since graphty tests import its `dist`). Package 7
follows 4, 5 and 6; package 8 is last. Each package passes build, lint and its own tests on its own:
package 3's new props are optional, and package 7's new inspector props are optional, so nothing
fails to type-check before package 8 passes them. `InspectorBody.tsx` only forwards
`StyleLayerInspectorProps` and needs no change.

Package 3 details:

- The `+` in the Layers header becomes a menu with "Node layer" and "Edge layer", in both places
  that draw it: `LeftSidebar.tsx` and the header button in `StylePanel.tsx` (around line 222).
  `onAddLayer` becomes `(target: "node" | "edge") => void`; today's zero-argument handler stays
  assignable until package 8 uses the argument.
- Each layer row gets a visibility toggle (`onToggleLayer?: (id, enabled) => void`) and a remove
  action (`onRemoveLayer?: (id) => void`), both drawn only when the handler is given.
- The list only ever receives unlocked layers: `AppShell.tsx` already filters out
  `layer.locked` (element-owned) layers. No disabled "owned by graphty-element" state is drawn.
- A layer's target is not editable: channel keys are target-prefixed, so a target change is a new
  layer.

Package 7 prop contract, added to `StyleLayerInspectorProps` and `StyleLayerPropertiesPanel`'s
props, all optional:

```ts
readonly attributes?: readonly AttributeDescriptor[]; // session.data.attributes()
readonly onValidate?: (spec: LayerSpec) => ValidationResult; // session.styles.validate
readonly onUpdate?: (layerId: string, patch: Partial<LayerSpec>) => Promise<void> | void;
```

`onUpdate` keeps its name and widens its return so a rejection can be shown inline; a `void`
return is treated as success.

Package 8 details:

- `handleAddLayer(target)` passes `target` and `selector: {match: "everything"}`.
- Toggle calls `session.styles.update(id, {enabled})`; remove calls `session.styles.remove(id)` and
  clears `selectedLayerId` when the removed layer was selected.
- `updateLayer` returns the element's promise instead of catching into `console.error`.
- At the call site that builds the `style-layer` inspector selection (around line 4246), pass
  `attributes` and `onValidate`, refreshing `attributes` on the element's data events.

## 5. Tests and stories

Packages 1 and 2 are covered in sections 2.1 and 2.2. graphty has one test project (browser); every
graphty test below runs there.

Package 3:

- `LeftSidebar.test.tsx`: the add menu offers both targets and calls `onAddLayer` with each; the
  toggle and remove call their handlers; neither is drawn without its handler.
- `StylePanel.test.tsx`: the header `+` offers both targets.
- `SidebarCompactIntegration.test.tsx`: updated for the new row actions; still compact-mantine
  controls only.

Package 4:

- `channelControls.test.ts`: every channel's step, default and enum options are the element's
  (identity with `CHANNEL_DESCRIPTORS` / `channelDefault`, not literals).
- A grep test fails if `style-options.ts` or `channelControls.ts` contains a hex literal or a line
  or arrow value string.

Package 5, `LabelStyleEditor.test.tsx`:

- one control is rendered per descriptor (47), each found by its `plainName`;
- editing each kind writes the whole label style with only that field changed;
- the reset x removes the field; each boolean goes unset, true, false, reset (key deleted);
- a text field set to "" writes "" and its reset deletes the key;
- the pre-fill shows for `node.tooltipStyle` (location top-right, background white);
- `weight: 600` displays as "600"; `weight: 550` displays as "550";
- gradient colours cannot drop below `minItems`;
- a label style held as `encode: {value}` is edited in place and written back to `encode`.

Package 6, `ChannelBindingPopout.test.tsx`:

- the scale list equals `scalesForChannel` intersected with `scalesForDomain`, for a text, a
  boolean, a number and a colour channel;
- `overflow` offers the descriptor's list; "shape" appears on `node.shape` and `node.color` and on
  no edge channel; choosing it on `node.shape` shows the palette select;
- `other` appears only on categorical scales and writes `{threshold, value}`;
- the domain choice writes `clamp` or `domain`, never both, and refuses low >= high;
- `midpoint` appears only with a diverging palette; `reverse` and `bins` render;
- `map` rows work on a colour, a number, an enum and a boolean channel;
- a stored `by` missing from `attributes` shows as read-only text;
- `by` is written from `path`;
- a binding `onValidate` refuses shows the element's message and does not call `onUpdate`; an
  `onUpdate` rejection shows its message and keeps the pop-out open.

Package 7:

- `StyleLayerPropertiesPanel.test.tsx`:
  - every channel in `channelsFor(target)` is reachable through some control, found by the
    channel's `plainName` or a `data-channel` attribute (merged colour rows and label pop-outs
    included);
  - colour rows write colour and opacity separately and together; arrow opacity writes while
    arrow colour is unset; an authored alpha is kept on a hex edit and cleared by its reset;
  - each boolean channel goes unset, true, false, reset (key deleted);
  - each text channel's reset deletes the key;
  - a `{value}` binding is editable and writes to `encode`; a `{by}` binding is bound with Convert
    and the bind button;
  - the Glow toggle is checked by a strength-only layer; checking writes `node.glowStrength` only;
    unchecking deletes both keys;
  - `edge.patternCount` shows "auto" when unset and is enabled on any layer;
  - an `InfoCircle` appears exactly on rows whose descriptor has a `caveat`;
  - `node.marker` shows the element's caveat.
- `StyleLayerInspector.test.tsx`: the new props reach the panel.
- New stories in `graphty/src/stories/StyleLayerInspector.stories.tsx`, with a `PopoutManager`
  decorator and a fake session object (not a live element) so snapshots are stable, each with a
  play function:
  - `NodeLayer`: sets size, asserts `onUpdate` received it;
  - `EdgeLayer`: opens the Tail sub-group;
  - `BoundChannel`: Convert is present;
  - `LabelStylePopout`: opens it, toggles Shadow, asserts the shadow fields appear;
  - `BindToData`: picks an attribute and a palette, asserts the encode patch.

Package 8, `AppShell.test.tsx`: adding an edge layer calls `styles.add` with `target: "edge"`;
remove calls `styles.remove` and clears the selection; the toggle calls `styles.update` with
`enabled: false`; picking an edge layer shows Line, Arrows, Text; a refused `update` reaches the
panel as an inline message.

Chromatic changes (all approved by the owner, never by an implementer):

- New: the 5 `StyleLayerInspector` stories; the compact-mantine stories named in section 2.2.
- Verify unchanged (the new props are opt-in and reserve no space when absent, so none should
  move): the existing compact-mantine `StyleSelect`, `StyleNumberInput`, `CompactColorInput`,
  `ToggleRow`, `ToggleWithContent`, `GradientEditor` and `PanelField` stories.
- Expected to change: any graphty story that renders the layer list with user layers (the
  `App` and `Graphty` stories, if they show the Style panel), because rows gain the toggle and
  remove icons.

Before pushing, from the repo root: `pnpm run build`, `pnpm run lint`, `pnpm run prepush:fast`,
then graphty-element `default` and `browser`, compact-mantine `default` and `browser`, and graphty
(`./tools/run-tests.sh`).

## 6. Decisions and open questions

Decided (two-way doors):

- Keep the current section names and order: UAT-10 and existing tests use them; renaming is an
  edit.
- The colour row's percentage writes the separate opacity channel, and an authored alpha is kept
  and shown until cleared: one opacity concept per row, and no silent data loss.
- Arrow tail controls sit in a collapsed "Tail" sub-group: the default tail is "none", so most
  layers never open it.
- `node.glowStrength` is its own always-visible row: a strength-only layer is valid.
- No row is disabled on a guess about other layers: the layer alone cannot know the effective
  value.
- `LabelStyle.weight` is not widened: numbers are already accepted; the published value list
  carries them.
- Label gradients reuse `GradientEditor` in an evenly spaced mode rather than a new list editor.
- No palette editor, slider row or text-area row: existing components cover every channel.
- Group and row labels stay in the app: they are presentation, and the element's `plainName` is
  still the accessible name.
- Build after #338: it changes the same element files and removes the glow strength caveat.

Open questions (one-way doors: these names become published graphty-element API when the PR is
released; renaming them before merge costs an edit, after release a major version). Implementation
proceeds on the names below unless the owner changes them.

1. New `ChannelDescriptor` fields: `step`, `integer`, `minExclusive`, `overflow`, `defaultFrom`,
   `effectDefault`.
2. New `./catalog` exports: `channelDefault(channel)`, `scalesForChannel(channel)`,
   `channelTakesScale(...)`, `LABEL_STYLE_DESCRIPTORS`, the type `LabelStyleFieldDescriptor` (with
   `accepts: "colorList"` and `minItems`), `toColorValue`, `ColorValue`.
3. Widening `Binding.map` and `Binding.missing` values to include `boolean`. Additive for
   consumers, but narrowing it later would be breaking.
4. A scaled value at or below an exclusive minimum becomes a miss (not painted). The alternative is
   clamping to a small positive number; the choice is visible to every consumer's bindings.
5. New top-level keys `channels` and `labelStyleFields` in the generated `graphty-catalog.json`.
