# Unified styles: the Visual Designer's answers

The owner's twelve open questions on the unified style panel, answered for look and density. Each question gets options, a recommendation, the compact-mantine controls, and what
graphty-element must add (everything listed is additive). `element/` is `graphty-element/src/`;
`cm/` is `compact-mantine/src/components/`; "organization" is
`design/ui/style-panel-organization.md` (pull request #2098).

## 1. Too many "+"

Each property on a layer is off, one value, or one binding (organization 3.8).

- A. A "+" per section, as in the mock: up to 11 dimmed titles of 40 px each.
- B. Every single-value property always shown, empty, with the default as placeholder: about 16
  mostly gray rows.
- C. **One Add strip per kind (Nodes, Edges):** a row of 24 px `ToggleIconButton`s in a
  `ToolGroup`, one per single-value property. An icon is pressed while the layer writes that
  property. Clicking an unpressed icon adds the row, focused, with its picker open. Clicking a
  pressed one moves focus to its row.

**Recommend C.** This is the on/off toggle, kept on one strip instead of on every row. The strip
also shows at a glance what a layer writes. Removing a property is still the row's minus;
unpressing an icon does not remove it. Switches (Show, Curved, Wireframe) are added already on.
graphty-element adds nothing.

## 2. Where "+" stays, and its menu

"+" stays only on lists that can grow: effects, label entries (once there are label slots),
value-table rows, and "and" conditions.

- A. A word menu that adds a default value, as Figma does
  (https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers). This breaks our
  rule that adding never repaints by surprise.
- B. **A menu with an icon per kind, whose pick opens that kind's picker at once**: the color
  picker for outline and glow, an icon grid for an arrow kind. Escape leaves nothing behind.

**Recommend B.** Adding and choosing become one gesture. Every enum is an icon grid (25 shapes, 14
arrow kinds, 9 patterns), like Figma's end-point menu
(https://help.figma.com/hc/en-us/articles/360049283914-Apply-and-adjust-stroke-properties).
`StyleSelectOption` is `{ value, label }` only (`cm/StyleSelect.tsx:31`), so compact-mantine adds a
glyph per option and a grid layout. **graphty-element adds** `previewStyle(style, size)`, an image
from the real renderer. An app-drawn icon cannot tell icosphere from sphere, and a plugin shape
would have none.

## 3. A long panel for nodes and edges together

- A. Accordions, or Nodes and Edges tabs. Rejected by the organization design: they hide part of
  what a layer does.
- B. **Remove the empty rows and pair fields on one row**: the Add strip replaces the dimmed
  titles. Shape and Size share a `FieldRow`, as Figma's W and H do, and so do Width and Pattern.
  The Nodes and Edges headings stick to the top and work as jump links.

**Recommend B.** On the mock's grid, the route layer drops from about 770 px to about 520 px, which
fits a 900 px window. Nothing collapses.

## 4. A layer with no nodes or no edges

- A. Hide the group. B. Show it disabled.
- C. **Decide by the rule, not by today's count.** A kind the rule can never reach shows only its
  28 px heading, in tertiary text: "Edges: not reached". Clicking it opens Which elements.

**Recommend C.** Nodes and Edges keep the same place on every layer, and sections do not jump
around as data loads. Disabled stays the look for "unavailable", not for "outside this rule".

## 5. The field picker with many fields

The genomics persona joins 10 to 40 columns, and every run adds more.

- A. A flat list with search. B. Fields grouped by where they come from (Data, each run, Facts).
- C. **B, plus chips for the kind of value** (Number, Categories, Text, Yes/no). Fields in use come
  first, and fields that cannot drive this property fold away under "Show 6 that cannot vary size",
  each with its reason.

**Recommend C**: a `Popout` with a `SearchInput` and `DataRow`s showing a kind glyph, the name, the
distinct count and the fill rate. `data.attributes()` already carries `measurement`,
`completeness`, `uniqueCount` and `usedBy` (`element/catalog/types.ts:985-1031`).
`styles.proposeEncoding()` is cheap enough to ask for every column on every render
(`element/session/styles/StylesApi.ts:375-388`). graphty-element adds nothing.

## 6. A visual gradient picker

Today the gradient is set through a scale select, Steps, an exponent, two domain fields, two clamp
fields and a midpoint.

- A. Keep the fields and add a histogram (the mock).
- B. Reuse `GradientEditor`. Its stops are colors, not data values, so it cannot set a domain.
- C. **A ramp editor.** The value's histogram (`HistogramRow`, `cm/rows/ChartRow.tsx:154`) draws
  each bar in the color its values get. Handles under it set the two domain ends, plus a midpoint
  for diverging palettes. Each handle shows its value and its percentile ("12, 94th"). A
  "Keep as percentiles on re-run" tick decides whether the handles save a domain or a clamp, so the
  two fields that exclude each other become one gesture. Stepped scales draw cut lines on the bars.
  Changing the scale (a `StyleSelect` with a curve glyph) recolors the bars at once. Bars past the
  handles are hatched and counted, and a "No value: 3" chit chooses whether elements with no value
  are painted.

**Recommend C**: a new compact-mantine `RampEditor`, built from `HistogramRow` and the slider
handles of `GradientEditor`. The typed fields stay behind the settings button. **graphty-element
adds** `styles.paintAt(layerId, channel, values)`, so the app never computes a scale.

## 7. Louvain as a split parent, and folders

The model settles both: a split parent is a layer, and a folder writes nothing.

- A. One icon for both. B. **Different marks:** a split parent shows stacked color chits and a
  "paints" mark, and each of its children shows its own chit. A folder shows a folder icon and no
  paint mark, and its panel lists its rows instead of property sections.

**Recommend B.** The reader sees which rows paint without opening them. Folders stay generic: a
hand-made folder and a folder holding runs look and behave alike.

## 8. "Which elements": one picker or two

`Selector` already spans both kinds (`element/catalog/types.ts:674-691`).

- A. A separate rule per kind, inside each group.
- B. **One rule at the top, read as a sentence:** a `SegmentedControl` for Nodes, Edges or Both,
  then condition rows built from `ComboInput` and `StyleSelect`. A rule on nodes asks one more
  question: "and edges: none, touching, between these".

**Recommend B**: one rule and one count ("5 nodes, 4 edges"). **graphty-element adds** endpoint
reads, extension 6 of the model.

## 9. Does the mock cover every style?

Nearly. Missing: lighting (studio lighting is the default look, and the scene light is internal,
catalog 7.2), default palettes, inline text markup, and label words from an expression
(`textPath`). Left out on purpose: `node.flat`, which nothing draws, and `node.marker`, which the
element refuses.

**Recommend** an app test that walks `CHANNELS` and fails for any channel with neither a row nor a
written reason. Graph settings gains Lighting and Default palettes. **graphty-element adds** a
lighting preset to `GraphStyle`.

## 10. Text labels

A label look has 47 fields (catalog 5.2).

- A. Every field in the settings popover (the mock). B. A docked panel that stays open.
- C. **Named looks, like palettes:** a Look `StyleSelect` on each label entry, each option shown as
  a preview: graphty-element's nine badges, a few plain looks, and "Save look..." for the reader's
  own. The full popover stays one click away.

**Recommend C**, after Figma's text styles
(https://help.figma.com/hc/en-us/articles/360040316193-Apply-styles-to-layers-and-objects).
`labelStyle` accepts only a fixed value, so a look is simply a value. A saved look is copied, not
linked, and the library is a reader preference the app may keep. **graphty-element adds**
`previewStyle` for text and, later, looks stored in the style document so that one edit updates
every layer using it.

## 11. Picking nodes generically

- A. Selection only: keep a set, then match its members (`match: "member"`).
- B. An expression only (JMESPath, through `jmespath` 0.16).
- C. **Three ways in, one rule out:** condition rows (contains, starts with, matches a pattern,
  compare, between, top N); "From selection" or "From search results", which keep a set; and "Edit
  as expression", a text field that suggests field names.

**Recommend C.** "Name contains Bob" is one condition row. "Odd-numbered ids" is the pattern
`[13579]$`. Find already runs patterns (`element/session/types.ts:390-394`), but a layer rule
cannot. No algorithm is favored. **graphty-element
adds** pattern matching to expressions, and top N by a data column.

## 12. Which properties can vary

graphty-element can bind 29 of its 35 channels (catalog 9.3). Only the five label looks and the
marker cannot.

- A. Color only. B. **Every bindable property gets the vary glyph,** and the picker offers only
  the fields that fit. Yes/no properties vary only by a yes/no field.

**Recommend B.** Label size by importance is wanted but blocked today, so its glyph shows disabled
with the reason. **graphty-element adds** label size, text color and background color as bindable
channels.
