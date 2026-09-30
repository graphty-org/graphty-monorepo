# Options and encodings

**Job.** The framework's one document on styling controls and on algorithm and layout options (no
separate "styling and options" document exists). It routes the five large option spaces (style
channels, algorithm options, layout options, import mapping and export) to their controls and
defaults: grouping, what is shown at rest and what is disclosed, reset, bound-value rows,
encoding kinds, default scales and legend rules. **Not here:** the lists and schemas
(graphty-element's code); validation, commit and cost (`interaction-patterns.md` 3.2, 3.3);
components and editor bodies (`interface-specification.md`); palettes and their thresholds
(`visual-language.md`); budgets (`state-matrix.md`); screen words (`glossary.md`, `content-design.md`);
element needs, element defects and their interims (`element-needs.md`); Figma mappings and
departures (`figma-crosswalk.md`). **Owner:** visual designer, with the interaction designer.
**Ceiling:** the README's table. **Validated by:** section 13.

**graphty-element** owns every graph capability; the **graphty app** is the window around it.
Each rule names the element field or function it renders, or the `element-needs.md` row that will
provide it and the interim until then; an interim is always a route over a published API, never
an app stand-in for element work (`implementation-mapping.md` 7). A verdict about the graph (is this heavy-tailed, how many
colors fit, which value would a fix keep) is always an element output, never app computation or
a number restated here.

## 1. One form, five option spaces

Every editor that shows options is one generator over a descriptor: `OptionDescriptor`
(`graphty-element/src/catalog/types.ts`) for algorithms, layouts and scales, `ChannelDescriptor`
(`src/session/styles/channels.ts`) for style channels. The same rules apply to all five spaces:

1. **Values come from the descriptor.** Names, defaults, bounds, choices, help text and caveats
   are shown as the element states them. `ChannelDescriptor` has no `default` or `description`,
   and element names are British ("Node Colour"): element needs, so **until they land** a channel row has no
   help text, shows its default as "element default", and quotes names as spelled, marked pending.
2. **Rare options sit behind the row or section they modify**, never in a "More" fold under a
   panel's rows. On a row drawn in a panel they open in a popover from the row's settings button
   (Figma's `AdvancedButton`); on a row already inside an editor popover they fold in place under
   it (only one editor popover plus one nested picker may be open, `interaction-pattern-entries.md`
   6.2). Order, not hiding, is how frequency is served. A button over hidden options carries the
   count of options changed behind it (`message-catalog.md`, `options.changed`). Whether a catalog
   entry's advanced tier is open is remembered per viewer in app preferences, so an expert who
   tunes it opens it once. While a result is focused, or a run form is open (a new run of a
   catalog entry, including one Quick actions has just chosen), Quick actions reaches its options
   by name; it never lists the options of every entry, which would bury its commands.
3. **Defaults look like defaults**: a placeholder in secondary text; a changed value in primary
   text. A row has the three returns `glossary.md` 9 defines, **Reset**, **Reset to default** and
   **Clear**, all in the row's context menu as Figma's row actions are, and Clear also as the row's
   minus button. Reset returns to the value the layer was made with (a recipe or style file, a
   verb, the import inference) and is absent when that value is not kept; Reset to default goes to
   the element default; Clear stops the layer writing the channel so the layers below show
   through. Figma has one row reset, an instance's reset override, so the three are a ledger row
   (`figma-crosswalk.md` 4.2). Keeping the made-with values on the layer's provenance is the
   element need "the values a layer was made with" (door 19, The recipe profile and how it binds); **until it lands** a style row offers Clear,
   and Reset to default once the channel default exists.
4. **Invalid input** is `interaction-patterns.md` 3.2. The form's part: the bound or the
   element's error (`E_OPTION_RANGE`, `E_UNKNOWN_OPTION` with its "did you mean" candidates)
   renders as the generated row's hint line, under the field, never only in a tooltip.
5. **Nothing the element cannot do gets a control.** A channel marked `renderable: false`
   (`node.marker`) has no row; an option of type `unknown` is a read-only row quoting its
   `unsupportedReason`; a layout whose `honoursWeights` is false shows no Weight row. Those are the
   cases the element declares; an option the element does not mark as ignored is shown.
6. **Each space commits with its own control**, under `interaction-patterns.md` 3.3; import
   mapping commits with Load, export settings with Export.

**Routing check.** Each space against each rule. The Figma counterpart is
`figma-crosswalk.md` 2's, cited, not restated:

| Space | 1 values | 2 disclosure | 3 reset | 4 invalid input | 5 no dead controls | 6 commit | Figma counterpart, and its ledger rows |
|---|---|---|---|---|---|---|---|
| Style channels | `CHANNELS` | settings button; folded inside the layer editor | Reset to the layer's made-with value; Clear unsets | a constant reverts (visual); a scale option in the encoding popover keeps text (meaning) | `renderable` | live | Fill, Stroke, Effects and Typography rows; ledger: "A panel section named Typography", "Appearance holds layer opacity", "Outlines is a view mode", "Effects are static", "A bound row has hover Detach", "Instance reset", "A shape's size is Layout's W and H" |
| Algorithm options | catalog schema | `advanced` behind the section's button, folded in the result editor | the value the run was made with, else default | keeps text, marks invalid, states the bound, blocks Run | `unknown` row | Run | a result's definition, edited in a popover from its row; ledger: "An invalid number reverts" |
| Layout options | catalog schema | method inline on the Layout row; options in the layout editor popover, tuning folded in place | as algorithms | keeps text, marks invalid, states the bound; the layout runs on the last valid value, which the row names | `honoursWeights` | live; Run starts a layout | Auto layout's settings; ledger: "Auto layout's options sit inline", "An invalid number reverts" |
| Import mapping | the element's inference (door 20, A measurement level per attribute) | unsettled columns first, "Show all columns" for the settled rest (section 10) | the inference | keeps text | a role a column cannot take is disabled with its reason | Import | ledger: "The Missing-fonts dialog lists unresolved items" |
| Export | export settings | background and legend behind the row's settings button | default | reverts (visual) | a setting a format lacks is disabled with its reason | Export | adopt |

A cell passes when it applies its rule with no exception, names the element field or element-needs
row it rests on, and, where it differs from Figma, names its row in `figma-crosswalk.md` 4 by the
row's Figma column.

## 2. What there is to control

**On 2026-09-27**, `CHANNELS` in `src/session/styles/channels.ts` has 14 node channels, 13 of them
drawable (`node.marker` is not), and 21 edge channels, six on each edge end (kind, size, color,
opacity, caption, caption style). Five text channels (node label, node tooltip, edge label, the
two end captions) each pair with a style channel that takes a `LabelStyle` of 47 fields
(`LABEL_STYLE_FIELDS`, `src/catalog/label-style.ts`); the tooltip's surface is the element's
tooltip role, so only its text fields are offered (`canvas-drawing.md` 8). That is **28 plain controls on layer rows
(29 channels less `node.glowStrength`, section 3) against 235 text-style controls**: "many style
controls" is mostly a typography problem. **A binding adds its own**: each bound channel carries
its scale's options (scale, domain, range, bins, palette, midpoint, reverse, exponent, overflow,
No value; the descriptors of `src/catalog/scales.ts`), up to about ten, disclosed only in the
encoding popover (section 4), never on the row. None of the 235 is
ever a panel row: a text row keeps size inline and opens the rest, text color included, in one grouped popover
(section 3). This is the one dated count of the channels; other documents cite it. The code, not
this line, is authoritative; recount when it changes.

- **Caveats.** A descriptor's `caveat` (an outline has no width) is shown verbatim: one line under
  the row while edited, an info glyph with an accessible name at rest, never a tooltip alone.
- **Text-style fields are constants only**: the element refuses to bind a `labelStyle` channel
  (`src/session/styles/encoding.ts`), so label size by attribute is not offered.
- **Position is not a style channel**: it belongs to the layout, through "Positions from columns".
- **Algorithm and layout options** come from Zod schemas (`src/catalog/optionsFromZod.ts`), with
  `group` nearly unused and about a hundred `advanced` flags, some wrong (9.2).

## 3. Style rows: sections and "+"

**Where a style layer sits in Figma** is `figma-crosswalk.md` 1's Style layer row.

**A property row exists only when the layer writes that channel.** A new layer shows its selector
and the section headers; a section with nothing written is its header with "+", as Figma's Effects
and Export sections are. A layer that writes two channels is two rows; a typical layer rests at one
to three. The **Base style** editor is the exception: it gives every channel its default, except
channels that inherit from another (the arrow colors follow their line), which it leaves unset; it
shows the channels whose values differ from the element's defaults, and "+" reaches the rest.
**Until the element publishes channel defaults** (`element-needs.md`, "`default` and `description`
on `ChannelDescriptor`"), it lists the channels the base layer writes, and "+" reaches the rest,
each showing the placeholder "element default".

**Sections follow Figma's design-panel order.** Figma's fixed order is Position, Layout,
Appearance, Typography, Fill, Stroke, Effects (`design/ui/figma/right-sidebar-selection/README.md`
section 24); graphty keeps it, renaming only where a Figma word collides with one of graphty's, and
Rendering, which has no Figma counterpart, comes last. Within a section rows follow how often the
workflows use them. Each difference is a row in `figma-crosswalk.md` 4.2:

| Target | Section, in order | Channels (ids) | Figma section |
|---|---|---|---|
| Node | Shape | `node.shape`, `node.size` | Layout (W, H) |
| Node | Opacity | `node.opacity`, whole-element opacity | Appearance (renamed: Appearance is graphty's name for the inspector region that routes paint) |
| Node | Text | label, tooltip | Typography, renamed ("typography" is a rejected word) |
| Node | Fill | `node.color` | Fill |
| Node | Stroke | `node.outline`, provisional until it is a crisp stroke, which an expert editor user expects (`element-needs.md`, "A crisp node outline") | Stroke |
| Node | Effects | `node.glow` | Effects |
| Node | Rendering | `node.flat`, `node.wireframe` | none: Figma's Outlines is a scene-wide view mode; these are per layer because a selector can scope them |
| Edge | Opacity | `edge.opacity` | Appearance (renamed) |
| Edge | Text | label | Typography (renamed) |
| Edge | Stroke | `edge.color`, `edge.width`, line pattern (`edge.style`, pattern count folded under it), curve (`edge.curvature`, its own row) | Stroke |
| Edge | Ends | head and tail: kind, size, color, opacity, caption | Stroke's Start point and End point |
| Edge | Effects | `edge.animationSpeed` | none: Figma's Effects are static and motion is its Prototype tab's; graphty has no Prototype tab, and a selector scopes animation per layer |

An edge has no Fill: a line's color and width are its stroke, Figma's rule for vectors. Curve is
its own row because a curve's shape is not a dash pattern, and it is the control nearest the
parallel-edges problem (`element-needs.md`, "parallel edges separated by `parallelRank`").
**Glow strength is not a layer row**: the element draws one glow strength for the whole scene
(`node.glowStrength`'s caveat, `channels.ts`), so a per-layer row would show values that are not
drawn. It is a graph-level row beside Look and Background in the graph's inspector, shown only
while some layer writes `node.glow` (`interface-specification.md` 4.1); it writes Base style's
`node.glowStrength`, so a higher layer that sets it wins and the row says so. That is an interim
the element's defect forces, deleted when the need lands, and it returns to
Effects when the element draws a strength per layer (`element-needs.md`, "glow strength per
style"). The same sections appear on the style-layer editor, the Base style editor and
Appearance; how Ends lays out head and tail is `interface-templates.md` 10.

The grouping is a proposal for data on the channel descriptor (`element-needs.md`, "`group` and
`advanced` on `ChannelDescriptor`"), so no consumer keeps a mapping table. **Until it lands,** the
form lists channels ungrouped in descriptor order (`interface-templates.md` 10).

**"+" adds with defaults** (`interaction-pattern-entries.md` 6.1): the section's next unset channel, at
its default (rule 1), its name a dropdown of the other unset channels, as a Figma effect row's
type is. On a full section "+" offers to add a layer scoped like this one directly above
(`glossary.md` 9 names the command), where a Figma user looks for a second paint (the ledger row
on Figma's "+" adding a second paint to a Fill section). Animation never ranks above a static
channel, because reduced motion and still exports drop it (section 6, rule 6).

**Modifiers fold under what they modify** (rule 2): pattern count under line pattern. Rule 2's
changed count applies to every button over a popover, the Ends pair and the text row included, so
a caption set only in a popover still shows on the row.

**Text rows.** A text row writes two channels: the text channel (literal text or an attribute
pill) and its style channel, with size inline. The rest of the `LabelStyle` opens in a popover
grouped as Text (font, size, weight, line height, alignment, overflow), Fill (text color,
background, gradient), Stroke (border, outline), Effects (shadow, animation, depth fade) and
Placement (location, offset, margins, pointer, badge, icon, progress). Text color sits in Fill, as
in Figma, because no workflow shows color as the commonest label edit. Two departures, each a
ledger row: the type fields other than size in a popover rather than on panel rows, and sections
nested in a popover. Figma's own structure, a label as
a child object stepped into from the node with the standard sections in the panel, was rejected:
it adds a sub-selection model the element lacks, and costs a step on the commonest edit.
**Inside the style-layer and Base style editors** the label record folds in place as a
`ControlSubGroup` with the same groups, and its color picker is the one nested picker, as Figma's
edit-text-style popover shows typography inline; the separate label popover opens only from an
inspector Appearance row, so the depth cap of `interaction-pattern-entries.md` 6.2 holds.
`LABEL_STYLE_FIELDS` is flat, so the grouping is proposed element data; **until it lands** the
popover is one flat list in declared order.

**Label records are inline; named text styles wait for evidence** (`decided-doors.md`, "Named text styles"). Of the 25 workflows
in `design/designloom/workflows/`, nine mention labels and none restyles a label's font or size.
Five want per-element labels, decided by which elements get one and what it says (W02, W05, W15,
W20, W23: "label the top 10", "label by display name"); that is **"Label with"** (section 4).
Three want a label per group, a community's or theme's name (W04, W21, W22, which asks for "labels
hidden on nodes but visible on themes"); that is not a text channel on nodes but a group label,
drawn with the group's hull (`canvas-drawing.md` 9), named by the group's Rename, and not yet
drawable (`element-needs.md`, "A style selector that targets a set as a whole"). W12's "label as
error, threat or genuine discovery" is a classification, not text: an analyst-written categorical
attribute, written by Add attribute (`conceptual-model.md`, operations table), drawn through "Color by" like any other
category. The trigger to add named text styles: a workflow, or the print-labels test (section
13), showing one look reused across several text channels or layers.

**Shapes.** The picker leads with `OVERFLOW_SHAPES` (`src/session/styles/encoding.ts`), the shapes
the element treats as distinguishable, once exported; until then, declaration order.

## 4. A row's states, and binding

On one layer a channel row is **unset** (absent, reached through "+"), **constant** (a value) or
**bound** (an encoding): Figma's absent, literal and variable states. A bound row whose attribute
this data does not carry, as after loading someone else's style or recipe, is **unbound**: it
names the attribute it needs (`message-catalog.md`, `style.unbound`) and opens the binding step
(section 10). In the
inspector a row may also be **overridden**, written by the Overrides layer
(`interface-specification.md` 3.1), and across a selection it shows the shared value or **Mixed**.
Mixed means the values differ, as in Figma; when the values agree but different layers paint them,
the row shows the value with "painted by 2 layers" as secondary text. Mixed over a large selection
comes from the element reading layer selectors (`element-needs.md`, "the winning layers per
channel across a selection").

**Emphasizing a few elements** (hubs) is an Override once door 31, Overrides, Base style and the stack order lands; **until then**, Create set and
then its Appearance, which writes the set's own layer (`interaction-patterns.md` 3.2), using
outline color, glow or size. Door 31 makes Figma's commonest edit, "make these red", one step, so
it is built before saving and recipes, which would otherwise record the two-step workaround.

**Binding enters where Figma's does** (`interaction-pattern-entries.md` 6.6). A section header's
four-dot "Apply styles and variables" button opens one picker with two groups, as Figma's does: the
current Look's palette colors (Figma's styles), then the attributes and results that fit the
channel, which have no Figma noun and borrow only Apply variable's gesture (`figma-crosswalk.md`
1). A number row carries Figma's in-field "Apply variable" button at the
input's right end. There is no separate bind icon. The picker is filtered by what the channel
accepts and by the attribute's measurement level (section 5); within the fitting attributes, and
among the verbs a column offers, the channel that suits the level is suggested first (Munzner, ch.
5; Mackinlay 1986): length and size before color for a quantity; hue and shape for categories.
Position is not suggested, because it is not a style channel; "Positions from columns" is offered
as a layout action on a numeric column. Shape, line pattern and arrow kind take
categories only; wireframe, flat, curve and pattern count are constants only (Munzner's
expressiveness principle). An attribute that does not fit stays listed below the rest, disabled
with the reason the element gives, which names the channel's level and the step that would make
the attribute fit (`message-catalog.md`, `style.cannotBind`). The filtered list is the element's
(`element-needs.md`, "Channels that cannot be bound flagged on their descriptor"); **until it lands** the
list is unfiltered and the element's refusal shows on commit. The app never learns bindability by
calling `planEncoding` and catching the error, and never keeps its own table of it.

A bound row shows a pill: an attribute icon, the name, a scale glyph (ramp, steps or swatches)
and, when the level was guessed, the guessed level in words (`message-catalog.md`, `style.levelGuessed`). **The pill is one
target, as Figma's bound fill is: a click reopens the attribute picker**; the glyph only shows the
scale kind. **The encoding popover opens from the row's settings button** (rule 2); its body is the
scale's own `OptionDescriptor`s (`src/catalog/scales.ts`), drawn by the option-form generator, and
its fields change meaning, so invalid text is kept (`interaction-patterns.md` 3.2). The pill uses
the neutral `VariablePill` fill, never the selection blue. Figma's bound row has only a hover
Detach; a graphty binding carries a scale (domain, range, bins) that a Figma variable does not, so
the settings button stays and Fix at sits in its popover (ledger row "A bound row has hover
Detach").

**Fix at <value>** is the encoding popover's header action, so it exists only in the layer editor,
where the scope is in view. It names the value it keeps first ("Fix at #E69F00, the largest
group"): the value painted on the canvas's focused element if any, else the largest group, else the
middle of the extent; one undoable command, no question. `StylesApi.resolveToStatic` writes and
returns the new layer, and the pure resolver that returns the value without writing is private
(`explain.ts`), so naming the value first is an element need ("a preview of a static resolution");
**until it lands** the action reads "Fix at current value" and names the value in its undo label.

**Encoding verbs.** "Color by", "Size by", "Width by" and "Label with" belong in a result editor's
Appearance region (`interface-templates.md` 10), a column header and an inspector value row,
because analysts start from an attribute or a result more often than from a layer. Figma makes a
binding only from the property row, so this is a departure (`figma-crosswalk.md` 4.2, "A binding is
made from the property row"). Each verb is also a palette command ("Color by...") on the focused
result or selection. A verb makes one ordinary layer, opening with its selector visible so "Label
with" on a large graph can be narrowed at once (`scale-levels.md` 2); repeating it for the same
source and channel edits that layer. **"Label with" asks which elements second**, offering "top N
by an attribute", because "label the top ten" is the label move the workflows make and labeling
every node of a large graph is the move analysts then undo. A top-N rule over a data attribute is
the sets design's `threshold` leaf (`top`, keyed on a value path), on master since 2.6.0, so top N
is offered over any numeric attribute. "Label with" labels
elements; naming a group is the group's Rename (section 3). `encode()` maps size onto the unit
interval unless given a range (`EncodingSpec.ts`), so "Size by" and "Width by" are **absent until
the element has a default range per numeric channel** (`element-needs.md`, "a default range per
numeric channel"), a hard prerequisite of the color slice (`implementation-mapping.md` 9), because
a verb that writes nothing until the reader types two numbers is the half-working copy
`implementation-mapping.md` 7 forbids. The Range fields, when shown in the encoding popover, state
their unit (CSS px at zoom 1 for size and width).

- **From a result editor's Appearance:** `styles.encode(spec)`, which already keeps one layer
  per run and channel (`src/session/styles/StylesApi.ts`). The region offers the verbs its result
  shape allows (`resultShapeContract(shape).layer`, `src/session/results/types.ts`); a shape that
  names a subset (a route, a chosen set of nodes or edges) offers **Highlight** instead, because
  `encode()` refuses it and sends it to `highlight()`.
- **On a column header or data row:** a data attribute binds only as a layer binding
  (`styles.add` with `LayerSpec.encode`), whose scale fallback gives a string column a ramp
  (section 5). Offering the verb would make the app pick the scale, so **these verbs ship with the
  element's one scale default on both paths** (section 5) and with the element keying a verb by
  source and channel (`element-needs.md`, "encoding a data attribute, keyed"), so a second use
  edits the layer the first made; both are prerequisites of the color slice, and the verbs are
  absent until they land.

**Edges styled by their ends.** An edge encoding may read an attribute of its source or target
(color an edge by its source's community), and any partition offers each edge a derived categorical
attribute, **within** or **between**, bound like any other; this is the commonest edge encoding
in community and flow work, and reading endpoint attributes is element work
(`element-needs.md`, "Edge selectors and bindings that read endpoint attributes").

## 5. Encoding kinds follow the measurement level

The level of the bound attribute, never a kind of set, decides the scale and the popover's body
(`conceptual-model.md` 5.1 answers the owner's question):

| Level | Scales offered | Popover body |
|---|---|---|
| Categorical | every scale whose `domainKind` is `categorical`, by its screen name (`glossary.md` 7) | one swatch row per category with its count, in legend order (largest first by default), each overridable (writes `map`) |
| Quantitative | every scale whose `domainKind` is `numeric`, by its screen name; "-log10 p" (-log10 p) only when the element says it applies (every value in (0, 1], `element-needs.md`, "applicability on scale descriptors") | a ramp over the attribute's histogram, draggable domain ends, a midpoint for a diverging palette, a No value count |
| Ordinal | element need: no rank-order scale (door 20); until then, as categorical. The element's scale keyed `ordinal` is categorical and is not this level | the same rows in rank order, never by count |
| Time | element need (door 20): `AttributeDescriptor.type` has no time level (`src/session/attributes.ts`), so **until then** a date column is the level the element infers | as its inferred level |

How the legend draws each level is `canvas-drawing.md` 3. Filtering by time is the time slider's
job (`state-matrix.md` 4.5).

**Who picks the scale.** Two write paths pick differently until one default serves both. `encode()` picks from the result
shape and field: for a community, layered-grouping or category-table primary field and for any
string or boolean field it picks the categorical scale the element keys `ordinal`
(`PRIMARY_FIELD_SCALES`, `defaultScale` in `EncodingSpec.ts`), so "Color by community" from a
result is already categorical. A layer binding with no scale falls back to `defaultScaleFor`
(`encoding.ts`), linear for any color or number channel, so a string column bound from a layer's
picker draws a ramp. **One scale default on both paths**, from the table below, is the element
need ("One scale default on both write paths"). The app never names a scale: **until then** the pill
states the scale in force, and the command that reads the attribute at the other level (`glossary.md` 9) is the reader's choice.

**The default scale for a quantity**, the one statement of it; the size default is `decided-doors.md`, "Decided, and not doors", and `element-needs.md`
cite this table. A default makes two separate choices, which Munzner keeps apart: the **transform**
(linear, square root, log, signed), which is perceptual, and the **bins** (how many steps, cut
where), which the renderer forces on some channels. Neither may undo the other: equal-interval
bins on a heavy tail put nearly every element in the lowest step and cancel any transform.

**The element decides; the app applies none of these steps.** The decision needs a verdict per
column, `{ signed, heavyTailed, hasZeros }` with heavy-tailed judged over the nonzero values, or
the chosen scale itself (`element-needs.md`, "One scale default on both write paths").
`suggestHistogramScale` (`src/session/results/statistics.ts`) is not that verdict: it returns only
linear or log, returns linear whenever the median is 0, so a sparse count column (alerts per host)
is never called heavy-tailed, and sees neither sign nor zeros. **Until the verdict exists** the pill
states whatever scale the element falls back to. The one verdict per column also serves the
histogram's axis, the encoding popover's ramp drawn over it and Scatter's axes, so a ramp and its
histogram never use two transforms (`state-matrix.md` 7 cites this).

**The degree distribution, and any heavy-tailed count**, is drawn on log-log axes as a
complementary cumulative distribution or with log-spaced bins, zero-degree nodes counted beside the
chart rather than dropped; below about 20 values it is the dot strip; a linear histogram of a heavy
tail shows one bar and hides the tail, the misreading the overview exists to prevent
(`interface-templates.md` 12 cites this).

1. **Signed values on a color channel** (log fold change, z-scores) get a linear scale diverging
   at 0 on a diverging palette, never log, because log leaves every negative value unpainted. Until
   a default diverging palette is measured (`canvas-drawing.md` 3, which states that red-blue fails
   its midpoint rule), the shipped `red-blue` is used and the legend names the midpoint in words.
2. **Signed values on a magnitude channel** (size, width, opacity, arrow size, animation speed)
   default to the magnitude, |x|: a negative size or width cannot be drawn and there is no
   diverging size. The pill and legend print the element's departure that the sign is not shown,
   and the encoding popover offers a color binding to carry it (`element-needs.md`, "signed values
   on magnitude channels").
3. **Heavy tails are compressed**: log when every value is above 0, log(1 + x) when zeros are
   present, so zeros are painted.
4. **Mesh channels are binned.** Every continuous channel whose role is `mesh` in `CHANNEL_ROLES`
   (`src/session/styles/intern.ts`) builds one source mesh per distinct value, so its default is
   binned. On 2026-09-27 those are `node.size`, `node.outline`, `node.glow`, `edge.width`,
   `edge.animationSpeed`, and each end's size, color and opacity; the code, not this list, is
   authoritative. Bin edges are cut in the transformed space (equal steps of the square root, the
   log or log(1 + x)), never in raw values, so on a heavy tail the top steps are narrow where the
   hubs are. Where the table below names log-spaced edges for a square-root channel, the edges and
   the mapping are two choices: the bin edges are log-spaced, and each step's size is mapped by
   square-root area. **A binned magnitude channel reads as ordinal**, so its step count is the
   element descriptor's (proposed five) and adjacent steps keep a floor apart (a minimum area ratio
   between sizes and a minimum px difference between widths at the fitted view), both provisional
   until measured. A color channel's step count is at most the number of ordered steps the palette
   clears (`canvas-drawing.md` 4; five for the default ramp), the same on every machine and never scaled to a
   mesh budget, because a published figure must reproduce. A binned color channel draws that many
   steps of its palette; that is why an arrow's color steps while its line's color ramps, the
   arrow cap being its own mesh, which is an element defect to fix, not a design
   (`element-needs.md`, "arrow color and opacity per instance"). Categorical mesh channels are
   capped instead (below).

| Channels | Not heavy-tailed | Heavy-tailed, all values above 0 | Heavy-tailed, with zeros | Signed |
|---|---|---|---|---|
| Instance color and opacity (`node.color`, `edge.color`, `node.opacity`, `edge.opacity`) | linear | log | log(1 + x) | color: linear diverging at 0; opacity: magnitude. A bound opacity's range starts at 0.15, never 0, so a bound element is never invisible and still pickable in sight |
| `node.size` | square root, equal bins | square root, log-spaced bin edges, range capped | square root, bin edges on log(1 + x), range capped | magnitude, square root, binned as its column |
| Other mesh magnitudes (width, arrow size, animation speed) | linear, equal bins | log-spaced bin edges | bin edges on log(1 + x) | magnitude, binned as its column |
| Mesh colors and opacities (outline, glow, arrow color and opacity) | stepped palette, equal bins | stepped, log-spaced edges | stepped, edges on log(1 + x) | color: stepped diverging at 0; opacity: magnitude |

Node size keeps square-root area when heavy-tailed, because log sizing would shrink the hubs that
"size the hubs" is meant to pick out; the log-spaced bins are what keep the largest hubs in steps
of their own. The cap on its range belongs to the element need "a default range per numeric
channel". Size shows magnitude, not exact rank: the exact top N is "Label with" top N (section 4).
Whether this holds is the hub-picking task of section 13, which separates the bins from the
transform. Square root against linear is a length-against-area question (square root, decided); compressing a
heavy tail is a separate one, so edge width, a length, is still compressed when heavy-tailed.
Quantile, which makes size encode rank while it reads as magnitude, stays an explicit choice,
never a default. The legend states the scale in force. **Not shipped:** a log(1 + x) scale and bins
cut on a transformed axis (`element-needs.md`, "log(1 + x) and log-axis bins"); **until then** no
default applies in those cells, and the element's current fallback shows in the pill.

Rules that follow:

- **The option schema refuses a level mismatch**, at all four levels: a categorical attribute is
  never offered a ramp (community ids never go on one), a quantitative one never a categorical
  palette until the reader switches it to categories (`glossary.md` 9), an ordinal one only sequential palettes in rank order, a time
  one only sequential ramps. Hiding the wrong palettes in a menu is not enough, because a file or a
  script reaches the schema without the menu. The refusal is the element's (door 20).
- **Size bound to a number reads by area** (decided, `decided-doors.md`, "Decided, and not doors"; the table below), because a length makes twice
  the value cover four times the area.
- **A comparison publishes its membership** ("A only", "B only", "both") as a categorical attribute
  on nodes and edges, bound like any other, which is how a figure gets a three-state edge legend
  (`graph-conventions.md` 3); the neutral comparison mark is the default when no layer binds it
  (`canvas-drawing.md` 11; `element-needs.md`, "A comparison's membership").
- **A fixed or rule set is membership only.** Binning makes no set. A quantity becomes a set only
  through a threshold or band ("Create rule set" from the histogram), a category only through
  Create set on its row. **A path is a sequence** (`conceptual-model.md`), and its step position is
  an ordinal attribute that "Label with" and color can bind (`element-needs.md`, "a path's step
  position"). Until it lands, step order is read from the members list in path order
  (`interaction-pattern-entries.md` 4.2).
- **A diverging palette is offered first only when the values have both signs**, midpoint at 0;
  its midpoint color is `canvas-drawing.md` 3's.
- **Two categorical encodings on screen do not share hues by default.** A second categorical
  binding defaults to a palette apart from the one in use, or to a shape or dash channel; the
  distance is `canvas-drawing.md` 4's (`element-needs.md`, "A second categorical binding").
- **Two partitions compared keep matched colors.** When a categorical binding on a partition is
  made while another partition is bound on a visible or compared view (two methods, two
  resolutions, two time windows), the element assigns colors by greatest member overlap with the
  earlier partition, so a surviving community keeps its hue and a new one takes a free color; the
  legend names the run the colors were matched to (`message-catalog.md`, `legend.colorsMatched`;
  `element-needs.md`, "partition colors matched by overlap"). It happens at first paint, so door 84, A category's color fixed at first paint holds. **Until then** each run's colors are
  independent, and the Compare surface is the stability check.
- **Declared levels win over guesses** (only primary fields are declared so far). A community is
  categorical even though its ids are integers (`communityFields` declares `group`
  `type: "integer"`, `src/catalog/algorithms.ts`), which `encode()` overrides by shape and a layer
  binding does not. `FieldDescriptor` has no level, so every other result field and every imported
  column is a guess, and its pill names the guess. Door 20's declared level has to cover result
  fields too, or "Color by" is safe from a result chip and unsafe from the table on the same field.
- **A category's color is fixed when its layer first paints it** (door 84): written into the layer's
  `map`, new categories take the next free color, and a filter, a re-run or new data never recolors
  a category or moves it into Other; until door 84 lands a filter can recolor one
  (`element-needs.md`, "Categorical colors never cycle").
- **A Look substitutes palette for palette under every binding** (door 85, What a Look is). A map fixed at first
  paint keeps its category-to-index assignment and changes only its colors; the hue-separation
  check above runs on the substituted palettes; the legend names the Look in force.
- **Categories past the palette.** Hue stops being distinguishable at about eight categories, which
  is why the categorical palettes stop near there and the Other group exists. On `encode()` the default `overflow` is `"other"`
  (`EncodingSpec.ts`): past the palette's `capacity`, the rest fold into one gray "Other" entry
  that opens its members, decided once, when the layer is made. On a layer binding, one default on
  both paths is element work in the color-by-value slice (`element-needs.md`, "Categorical colors
  never cycle"); the app never writes `overflow` itself. `"extend"` is opt-in with a
  warning; `"shape"` is offered for nodes only. **The same cap holds on every categorical mesh
  channel** (shape, line pattern, arrow kind, and a categorical outline or glow color): past the
  channel's own capacity (its distinguishable shapes, its dash patterns, its palette) the rest fold
  into Other, so the mesh count of section 8 is bounded for categories too. The element publishes
  no capacity for shapes or dashes (`element-needs.md`, "capacity on categorical mesh channels");
  **until it does**, a shape or dash binding offers Other at the length of `OVERFLOW_SHAPES` or of
  the dash list the element declares. **When Other holds most elements**, as Louvain's dozens of
  communities do, the legend states Other's share, and past a third of the elements (proposed) the
  binding offers undoable routes: hulls with group labels, collapsing the groups through the
  quotient graph, a coarser resolution, or coloring only the groups above a size. Colors are never
  reused, not even for groups that touch no common neighbor as map coloring would allow, because
  the legend would then name one hue twice and a reader matches by hue, not by adjacency.
  Capacity is the palette's published `capacity`;
  the black swatch and its replacement are `canvas-drawing.md` 4's. Over `ATTRIBUTE_UNIQUE_CAP` an
  attribute is offered as a label or identifier, never as a color.
- **Opacity bound beside color.** When opacity and color are bound on the same elements, the
  canvas blends the color with the canvas, so the legend says the color is shown at full opacity and
  the canvas blends it; while a color binding is active, opacity is never suggested first for a
  quantity, because opacity and luminance interfere (Munzner, ch. 5).
- **No value is never painted by default.** The element's default is `missing: "skip"`: an element
  with no value, or a zero or negative value under a log scale, is not painted by this layer, so
  the layers below show through (`encoding.ts`), and the legend counts them. An automatic layer
  never paints a no-value look (`CLAUDE.md`, "Algorithm Styles"). On a layer the analyst makes,
  the popover's No value row offers the command that paints them (`glossary.md` 9): a constant
  layer directly above, in one undoable step, scoped by the target the element returns for exactly
  the elements this layer skipped, so the row's count and the command's effect agree. The row
  splits its count into "no value" and "outside the log scale" when both occur (`element-needs.md`,
  "the skipped elements of a binding"). The app never writes the selector. **Until then** the
  command is offered only when the scale is not log, where the skipped elements are exactly those
  with no value.
- **The domain is pinned** to the scope in force when the layer was made, or the scope of the result
  it binds; a later filter step never moves it. A layer made during time playback or a comparison
  takes the shared union domain of those views at creation, then pins it (`state-matrix.md` 4.5,
  4.6 cite this). **Fit domain to current scope** moves it as one
  undoable command, and the legend names the domain's scope when it differs from the filtered
  graph (`element-needs.md`, "A continuous encoding's domain pinned").
- **A distance reads the other way.** When the bound attribute holds the distance role, Width by and
  Size by default to reverse (`graph-conventions.md` 2; `element-needs.md`, "Width by and Size by
  on an attribute holding the distance role").
- **Few values.** On a small graph, bins and quantiles carry the element's warning and the legend
  lists each value instead of a ramp; the warning is a legend departure the element returns
  (`element-needs.md`, "a few-values departure"); until it lands none shows.
- **One domain across compared views.** Time windows, synchronized views or compared runs showing
  the same binding share one domain over all of them, so one color means one value in every panel
  (Tufte on small multiples); a per-view domain is opt-in and labeled (`element-needs.md`, "one
  domain shared across compared views").

## 6. Legends

The legend is derived, never authored: `styles.legend()` (`src/session/styles/legend.ts`) drawn as
returned, one `LegendBlock` per bound channel per layer (`glossary.md` 7, legend block), in stack
order, with its **departures**, the element's finished sentences. **Blocks that read one attribute
over one domain merge** into one key showing every channel they drive ("Color and size by
degree"), counted once, because two keys for one attribute spend the reader's attention twice
(`element-needs.md`, "Legend blocks merged").

1. **Departures are printed in full.** A legend that drops them turns a reasonable choice into a
   false claim (`principles.md` 1).
2. **The form follows the binding's scale**, never the attribute's name: a ramp with its domain and
   midpoint; swatches with counts; a binned channel (section 5, step 4) shows one mark per step
   labeled with its interval, so the legend never hides a step the canvas draws; graduated marks
   (3 to 5, labeled with values) are for unbinned size and width only; marks come from the swatch
   sizes the element returns (`LegendSwatch.size`); plus a No value row.
3. **The legend is an input**; what a click does is `interaction-pattern-entries.md` 4.3. A swatch
   stands for the elements this layer paints with that value, whether or not a higher layer covers
   them. That read, and a band dragged on a ramp, are element needs.
4. **Every block has a text form in the table** (WCAG 1.1.1) and in export.
5. **A painted-over block** keeps its sentence; dimming alone is never the signal (WCAG 1.4.1).
6. **Animation is never the only carrier of a value.** A block for animation speed says it is not
   shown when motion is reduced or in a still export, and export warns in the same words.
7. **The canvas legend**, the element's own (door 58, The legend and not-drawn notice), groups blocks by `layerId`, a layer's
   channels as sub-rows. **Which blocks it keeps under its height cap** (`state-matrix.md` 7): blocks
   that win paint on at least one drawn element come first, in stack order; blocks painted over
   everywhere go behind "N more" with their sentence, so an automatic layer that paints nothing
   never takes the slot of the encoding the reader sees. **An exported
   legend** has, in full and uncapped, every enabled block that paints at least one element in the
   exported scope, with counts over that scope; a block that paints nothing there is listed in the
   export's methods text, not on the figure.
8. **The Look in force** is named in the legend when it is not the default (door 85).
9. **What the legend lists.** One block per painted channel, each scale with its domain and level;
   one entry per object mark (each active highlight by its dash or index and name, a path's start,
   end and direction, comparison membership); and the no-color cases of `canvas-drawing.md` 3,
   each counted: unstyled, no value, and Other with its own entry. When nothing sits between Base
   style and a no-value element they look alike, so the legend shows **one** entry, "No value or
   unstyled", with its count; two entries only when an analyst layer lies between. Hulls, badges
   and notes carry their own labels. **On the canvas, counts describe the filtered graph**, never the
   drawn subset (an export's describe its scope, item 7); what is not drawn is the not-drawn line's. The legend carries a note when direction is
   not drawn at this zoom (`state-matrix.md` 4.1), when edge opacity was lowered for density, and
   when a Look chosen for the light canvas is drawn on the dark one.

## 7. The table's chits

The table's chits come from the element's bulk read of encoded values (`element-needs.md`, "A bulk
read of encoded values"), and the table never recomputes a scale.

## 8. Many style layers: the encoding rules

- **The count cut** (`interaction-pattern-entries.md` 6.8) **is display only**: each row names its
  recorded `source` (`LayerSource`) as a word, so the style format gains no field.
- **Which layer wins is read, not marked.** A row's painted count counts the elements where it wins
  at least one channel, so a layer painted over everywhere reads 0, and a painted value names its
  winning layer (`interaction-pattern-entries.md` 4.7).
- **No cap on layers, provisionally.** The cost looked like distinct values of mesh channels
  (`src/session/styles/intern.ts`), not stack depth, but the measurement was not kept
  (`research/scale-measurements.md` 3), so the rule is unmeasured until a committed benchmark
  reproduces it. Continuous bindings on mesh channels are therefore binned by default (section 5).
- **A style edit stays live at every size**, bounded by the binned default's mesh count, until the
  element's style-edit estimate exists (`element-needs.md`, "A cost estimate for a style edit");
  then an edit the element says is slow is held as `interaction-patterns.md` 3.3 holds any other.

## 9. Algorithm and layout options

### 9.1 Order

1. **Arguments**, by option `type` (`node-id`, `node-set`, `attribute`, `partition`, `ordering`);
   a required one blocks Run. A node-valued argument accepts a click, the selection, a set, a
   group, a found path or pasted ids; a pair list has Sources and Targets.
2. **Scope**: the scope forms are `conceptual-model.md` 4.5's; a search adds its Filtered graph or
   Full graph field.
3. **Edge reading**: direction, defaulting to what the graph declares (`graph-conventions.md`),
   and a Weight row where the element says the entry takes one. A layout whose `honoursWeights` is
   false shows no Weight row; a graph with no numeric edge attribute shows it disabled, with the
   reason. **The Weight row is misfiled until the option-typing audit lands**: PageRank declares "Weight Attribute" as a string
   option flagged `advanced` (`src/algorithms/PageRankAlgorithm.ts`). It moves here when the
   element types it as an `attribute` argument (9.2); the app never moves an option by name.
4. **Parameters**, in the order the element declares them, by `group` where one is set; `advanced`
   options per rule 2 (`interface-templates.md` 11).

**Layouts follow Auto layout's entry, not its inline fields** (`figma-crosswalk.md` 2, Layout
settings). The method stays inline on the graph's Layout row. Its options open in the layout editor
popover, because Auto layout has a fixed four-field schema while a layout method's option schema runs
from none to more than ten fields and changes with the method, so an inline section would reflow
the inspector at every method change (ledger row "Auto layout's options sit inline"). Inside the
popover the options that change the result (9.2's "never advanced") come first, and the engine
tuning folds in place under them (rule 2), never in a second popover. Whether a layout option edit
applies as it is made or waits for Run layout is `interaction-patterns.md` 3.3's, shown on the
editor's Run line before the edit; a field holding invalid text leaves the layout running on the last
valid value, which the row names as the value in force (`interaction-patterns.md` 3.2).

### 9.2 The metadata is present and partly wrong

Classification is element data, never overridden by an app list; the audit is
`element-needs.md`'s option-typing row. The catalog copies `meta.advanced` and `meta.group` from
each engine's Zod schema (`src/catalog/optionsFromZod.ts`). What is wrong is the classification,
and the audit follows one rule rather than a vote:

- **Never advanced:** arguments, edge reading, and any option that changes what the result means:
  weight, direction, resolution (Louvain, Leiden), damping (PageRank), alpha (Katz), normalization,
  the sample size of a sampled method, the quality function (Leiden's modularity against CPM, whose
  resolution scales differ), LinLog (ForceAtlas2, which changes what a distance means), the seed.
  Each must appear in the methods text.
- **Advanced:** engine tuning that changes only how fast or how exactly the same answer is
  reached: tolerance, maximum iterations, jitter tolerance, Barnes-Hut theta, delta optimization.

An argument is told apart from a parameter by its option `type`; where an argument reaches the
descriptor untyped, typing it is the audit's work.

### 9.3 Controls, bounds and seeds

- **Controls by type** are `interface-templates.md` 11's table. A `seed` is a number field
  with "New seed" and a lock.
- **Bounds.** Fixed `min`, `max` and `values` validate. A bound or default that depends on
  the loaded graph (Katz's alpha, ForceAtlas2's tolerance) needs `catalog.optionsFor(key, scope)`;
  **until then** the static bound shows with a line saying the limit for this graph is not checked yet
  (`element-needs.md`).
- **Every stochastic entry publishes a seed, and every run records the seed it used**; which
  entries lack one is `element-needs.md`'s ("Every run records the seed it used"). The app never
  generates seeds to fill the gap.
- **Requirement notes** above Run inform and never block. They are the element's sentences, which no
  API writes yet, so **none shows until one does**; the app never composes one from `requires`.

### 9.4 Defaults and the run record

The run record keeps every resolved option, so replay is exact; the result's row lists only the
changed ones. A recipe stores an option resolved when the author changed it or its default does
not depend on the graph, because deltas would silently change meaning when an element default
changes; a graph-dependent default (Katz's alpha, ForceAtlas2's tolerance) is stored as "default"
and resolved on the recipient's scope, and the binding step lists any stored value outside the
recipient's bounds (`element-contract.md` 11.1; door 19). The record is copyable as methods text
(`output-homes.md`).

### 9.5 Commit

`interaction-patterns.md` 3.3 is the rule: when an option edit applies live, how its cost shows,
and the interim while the element publishes no response class (door 42, Cost bands and the cost gate's default).

### 9.6 Presets (deferred)

Saved option values are recipe data; per-viewer "last used values" are an app preference. Author
presets on catalog entries are deferred for want of evidence: no workflow names a reusable option
set without styles, and a recipe carries bindings and runs that a layout mode ("ForceAtlas2,
LinLog") does not. The trigger to reopen it is an analyst needing to cite a named mode in a methods
section; the app never hardcodes a list.

**Last used values** follow three rules:

- They are stored per viewer, keyed by catalog key, never in the project file, because a project
  reproduces from its run records, not from one reader's history.
- They load through the element's option resolution (`resolveOptionValues`,
  `src/catalog/options.ts`), so an option renamed or removed since is reported
  (`E_UNKNOWN_OPTION`) and dropped, never passed through.
- A prefilled value counts as changed: primary text, a source line saying it came from the last
  run, and a reset to the default, so the analyst can tell the algorithm's default from last week's
  choice (tested, section 13).

The need a workflow does name is provenance: "a complete parameter record per analysis, copyable
as text". That is the run record (9.4), not a preset.

## 10. Import mapping, export, and loading a style or recipe

- **Import mapping** is Figma's Missing-fonts dialog: columns the inference could not settle
  first, "Show all columns" for the rest, each with three pickers (element kind, level, role) at
  the inference (door 20). "Show all columns" is not the "More" fold rule 2 forbids: it hides
  settled rows, not rare options, as the Missing-fonts dialog lists only what is unresolved. Three
  pickers is a departure (ledger row "The Missing-fonts dialog lists unresolved items"), because an
  unconfirmed level misstates every encoding built on it.
- **Export** of a figure is Figma's Export section: a header with "+" and one row per setting,
  format and scale, with background and "include legend" behind its settings button, as Figma's
  export settings stack (`interface-specification.md` 3).
- **A file that brings its own colors or sizes** (a GEXF `viz:color`, which graph-io reads into a
  column with the color role) is offered "Use the file's colors" in the mapping, which makes one
  ordinary layer on the passthrough scale with the legend entry "colors from the file"; it is the
  one colored first render (`canvas-drawing.md` 1), and the element publishes the role
  (`element-needs.md`, "Color and size roles"). Other exports are `output-homes.md`'s.
- **Loading a style or a recipe without data** (door 19). Applying one returns
  `TemplateReport.unbound`, and the binding step resolves it (`interaction-pattern-entries.md` 6.10;
  `task-flows.md` 8). What a binding carries to other data is `element-contract.md` 11.1. Each attribute picker is filtered by what the channel accepts. A layer left
  unbound stays in the stack, disabled, with what it needs, never dropped. A layer applied from a
  recipe or style file keeps that file as its source, so Reset (rule 3) returns an edited row to
  the shared starting point.

## 11. The editors

The editor bodies and their order are `interface-templates.md` 10. A channel that cannot be
read at this size keeps its row in normal ink with a zoom hint (`content-design.md`), when a layer
sets it to a non-default value; an unset one shows nothing (`scale-levels.md` 4; `element-needs.md`,
"A readability level per style channel").

## 12. Element needs and doors

Each element need behind these rules is a row of `element-needs.md`, and each rule above that
depends on one states its interim, which decides nothing in the app. First to land, together, as
prerequisites of the color slice: one scale default on both write paths, a default range per
numeric channel, and encoding a data attribute keyed by source and channel (sections 4 and 5),
which unblock the encoding verbs on data. The doors
these rules rest on are 19, 20, 31, 42, 58, 84 and 85 (`one-way-doors.md`); the default palettes, the size scale and named text styles are decided (`decided-doors.md`).

## 13. Validation

Methods, participants and material are in `research/study-schedule.md`, "Options and encodings";
the bars are here.

- **Routing check** (section 1's table): re-run against the cited text and against
  `graphty-element/src/catalog/` (scales, palettes, channels) before each publish; passes when every
  cell applies its rule with no exception, names its element field or element-needs row, and names
  a departures row where it differs from Figma. It also checks for restatement: every other
  framework document that repeats rule 4 or rule 6 must cite `interaction-patterns.md` 3.2 or 3.3
  rather than restate it; its result is `research/last-check.txt`.
- **Closed card sort** of channel rows onto section 3's sections (15 to 20 participants, Tullis
  and Wood); 80% agreement confirms grouping, never order.
- **Graph-literacy tasks**, the check that matters most: value, rank and group questions per
  encoding kind, plus more categories than the palette holds, a departure sentence, and a signed,
  skewed column (a log fold change) drawn once by color and once by size. Pass: 80% correct per
  kind, 80% reading the gray as several groups, 80% finding a down-regulated element on the signed
  color drawing, and 80% saying the signed size drawing does not show the sign.
- **Matched partition colors**: two community runs with colors matched by overlap and their legend
  note; "which community split?" Pass: 80% name it.
- **Hub picking**: on a heavy-tailed degree column, "which nodes are in the largest size class?",
  under three sizings: binned square root (the default), unbinned square root and binned log, so a
  failure points at the bins or at the transform. Pass: 80% pick the class correctly under the
  default; naming the five largest is the "Label with" top-N route's task, because size shows
  magnitude, not rank.
- **Expert review of the default scales**: the section 5 table run over the sample graphs and the
  fixture corpus, including a zero-majority count column (alerts per host), each resulting default
  judged by a network scientist as right, acceptable or wrong; any "wrong" reopens its cell.
- **Three row returns**: a first-click and comprehension item asking for "return this row to what
  the recipe set", "to the element's default" and "let the layer below show". Pass: 80% choose
  Reset, Reset to default and Clear correctly.
- **Default or yours?** On a form prefilled from the last run, "is this value the algorithm's
  default or one you chose?" Pass: 80% correct.
- **First-click tests** from an empty layer ("make the hubs bigger"), and the pill check ("what
  changes if you edit this?", 70% answering "a value per element"); at 13 per condition the rates
  are directions, not proof (Sauro and Lewis).
- **Print labels** ("bigger labels with a white background"): under 80% moves background inline;
  repeated restyling of the same look across layers is the trigger to add named text styles.
- **The four common moves**: color by community, size the hubs, label the top ten, edge width by
  weight. A first-click test from an empty layer, and a within-subject, counterbalanced time-on-task
  comparison of the encoding verbs against the panel-only route; report median time and errors.
- **"Why is this edge red?"** on 30 to 40 layers (`interaction-pattern-entries.md` 4.7); under 80%,
  a section modeled on Figma's Selection colors is tested next.
- **Accessibility audit of the generated form** (WCAG 2.2): keyboard only through every row,
  popover and picker; reach "Color by" from the keyboard alone; accessible names for the pill (with
  its scale kind) and each legend swatch; every target at least 24 px (2.5.8); the caveat reachable
  without hover; non-text contrast of chits. Pass: no level A or AA failure.

That a verb and "+" make the same layer is an engineering test, `implementation-mapping.md` 11.

## Sources

- graphty-element `src/catalog/` (`types.ts`, `options.ts`, `optionsFromZod.ts`, `scales.ts`,
  `palettes.ts`, `label-style.ts`, `algorithms.ts`, `layouts.ts`); `src/session/styles/`
  (`channels.ts`, `EncodingSpec.ts`, `encoding.ts`, `explain.ts`, `legend.ts`, `StylesApi.ts`,
  `intern.ts`); `src/session/results/statistics.ts` (`suggestHistogramScale`);
  `src/session/planning.ts`; `src/algorithms/PageRankAlgorithm.ts`; `src/session/selection/targets.ts`
- Framework: `conceptual-model.md` 3.4, 5.1; `interaction-patterns.md` 3.2, 3.3;
  `interaction-pattern-entries.md` 4.3, 4.7, 6.1, 6.2, 6.6, 6.8; `interface-specification.md` 3.1;
  `interface-templates.md` 9 to 11; `scale-levels.md` to 7; `figma-crosswalk.md`; `one-way-doors.md`;
  `element-needs.md`; `canvas-drawing.md` 4, 9; `research/study-schedule.md`;
  `research/scale-measurements.md`
- Sets design, on master since PR #540: `design/sets/sets-design.md` 4.3 (the `threshold` leaf)
- `design/designloom/workflows/` (W02, W04, W05, W12, W15, W20 to W23 for labels and scales)
- Figma study: `design/ui/figma/right-sidebar-selection/README.md`; `design/ui/figma/components.md`
- Munzner, *Visualization Analysis and Design*, 2014, ch. 5; Mackinlay, "Automating the design of
  graphical presentations of relational information", ACM TOG 5(2), 1986; Tufte, *Envisioning
  Information*, 1990; Tullis and Wood, 2004; Sauro and Lewis, HFES 2005; WCAG 2.2
