# Unified styles: answers from Figma's editor

Answers to the owner's twelve open questions for the unified style panel: options, a
recommendation, the compact-mantine controls, and what graphty-element must add (all additive).
"The mock" is `graphty/src/stories/mocks/StylePanelMock.stories.tsx` on branch `mock/style-panel`.

## 1. Cardinality: when is "+" right?

On one layer a property holds at most one value, so "+" as "add another" fits only lists.

- A. "+" per section opens a menu of unwritten properties (the mock). Two clicks for Shape, and
  "+" promises a second shape.
- B. Figma's instance overrides
  (https://help.figma.com/hc/en-us/articles/360039150733-Apply-overrides-to-instances): every
  property always shown, its placeholder the value beneath; typing takes over, reset releases.
  One click, but a nodes-and-edges layer rests at about 14 rows.
- C. Figma's stroke grammar
  (https://help.figma.com/hc/en-us/articles/360049283914-Apply-and-adjust-stroke-properties):
  a single-value section is one unit. Clicking its dimmed title adds the whole section as empty
  fields: Shape adds shape and size side by side, Line adds color, width and pattern, Ends adds
  head and tail kind selects. A minus on the header releases it. Curved and Wireframe are
  `ToggleIconButton`s inside the row; opacity, pattern count, motion speed and arrow size sit
  behind the section's `AdvancedButton`.

**Recommend C.** "+" stays only where a list grows: Effects, Text entries, conditions in Which
elements. This changes the owner's 2026-10-01 rule ("+" adds a line) for single-value sections.
Placeholders should show the value beneath, not the floor, with "Mixed" when it varies
(https://help.figma.com/hc/en-us/articles/360042553434-View-and-adjust-colors-in-a-mixed-selection).
**Element adds** `styles.beneath(layer, channel)`: `{ value }` or `{ mixed: count }`.

## 2. Menus where "+" is justified

Figma's Fill and Effects "+" add an entry at once; its type is a select, its swatch opens the picker
(https://help.figma.com/hc/en-us/articles/360041003694-Guide-to-fills,
https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers).

- A. A dark `Menu` of types (the mock).
- B. Add first: Effects "+" adds the first unused type (Glow on nodes, Motion on edges) with an
  empty color, focus on its type `StyleSelect`, each option with an icon. Nothing paints until a
  color is picked.
- C. "+" opens a color picker. Rejected: one glyph would mean "add" and "color".

**Recommend B.** The swatch opens `CompactColorInput`'s Figma picker, its swatches the layer's
palette. Text "+" adds an entry and opens the value picker at once (the owner's Label rule).
Shape, pattern and arrow-kind selects draw each option's silhouette (`renderOption`); the lists
come from the element.

## 3. Keeping the panel short

- A. Nodes and Edges stacked with every section title (the mock): 11 empty titles, about 440 px,
  before any value.
- B. A Nodes / Edges `SegmentedControl`: hides half of a route layer.
- C. Accordions: ruled out by the owner (2026-10-01); they hide what a layer does.
- D. Stacked groups showing only written sections; the unwritten ones fold into one "+" on each
  group heading that opens a `Menu` of the rest, with icons.

**Recommend D**, with sticky group headings and the Which elements count ("5 nodes, 4 edges")
as links to each group. The route layer then fits 1280 x 800. Figma shows every title, but it
has five sections; we have eleven.

## 4. A layer with no nodes or no edges

- A. Hide the group (the mock). B. Show it disabled. C. Show its heading only.

**Recommend A**, by what the rule can match, not today's count, so "Selected elements" keeps both
groups. Figma omits what does not apply. To add edges, widen Which elements. **Element adds**
`styles.kindsOf(selector)`, which halves a rule speaks (already documented per rule kind,
`graphty-element/src/catalog/types.ts:1143-1182`).

## 5. "Vary by" with many fields

Figma's variable picker: search first, collections as groups, only compatible variables
(https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma).

- A. One flat list with search (the mock).
- B. Search always shown and focused; groups In use, Data, one per run, Facts; past 8 per group,
  "N more".
- C. Type filter chips first, then the list.

**Recommend B**, adding C's filter as a `SegmentedControl` past 30 columns. `DataRow`s: level
glyph, name, distinct count or range; the tooltip shows samples and coverage. Misfits stay listed,
disabled, with the element's reason (the genomics persona: "attribute tables with 30 columns").
**Element has** the facts
(`session.data.attributes()`: measurement, completeness, uniqueCount, min, max, sampleValues,
usedBy; `graphty-element/src/catalog/types.ts:985-1030`). **Element adds**
`styles.canEncode(channel, path)`: ok or `{ code, params }`.

## 6. A visual gradient

- A. The ramp row plus a popover of fields (the mock): complete, but all words.
- B. A palette gallery: fast, but loses domain, clamp and midpoint.
- C. A data gradient: compact-mantine's `GradientEditor` (Figma's,
  `compact-mantine/src/components/GradientEditor.tsx`) laid over a `HistogramRow` on the value's
  axis.

**Recommend C, with B as its palette select.** Every current feature becomes visible:

- palette: thumbnail `StyleSelect`; Reverse: the editor's flip; custom colors: click a stop;
- domain: the end handles (fields still typeable); midpoint: a center stop snapping to a value;
- steps: hard stops with ticks at bin edges; scale: a `SegmentedControl` (Linear, Log, Root,
  Curved) that redraws the histogram axis, so the reader sees what log does;
- clamp: shaded tails with a draggable bracket; no value: a chit before the bar.

Size and width use it with a wedge bar. It answers the genomics persona's "gradients that clip or
center in the wrong place for skewed fold changes".
**compact-mantine adds** a data axis and a backdrop slot to `GradientEditor`. **Element adds**
custom stops (`stops: [{ at, color }]`; `palette` takes only an id),
`styles.histogram(path, { scale, bins })` and `styles.positionOf(binding, value)`, so the app
never redoes scale math.

## 7. Is the Louvain "folder" a style layer?

Figma separates the two: a frame has its own fills and children, a group has none
(https://help.figma.com/hc/en-us/articles/360039832054-The-difference-between-frames-and-groups).

- A. The split parent is a layer that looks like a folder (the mock).
- B. The same layer, drawn as a frame: its own type icon plus its binding glyph, never the folder
  icon.
- C. A folder of independent layers: loses the one-step palette change.

**Recommend B.** Folders stay groups: name, eye, lock, pin, move; no rule, no Style sections, no
paint. A run's categorical suggestion should arrive unsplit (swatches on the row), "Split into
layers" one click away, so 40 communities do not flood the tree.

## 8. Picking "which elements"

- A. One rule at the top, with the kind inside its select (the mock).
- B. A rule per group: flexible, but a route is one set and the model has one rule per layer.
- C. One rule at the top: a kind `SegmentedControl` (dot, line, both), then conditions. Under
  Both with node conditions, an Edges select (between these nodes, touching them, listed only)
  maps to `EdgeReading` (`graphty-element/src/catalog/types.ts:1225`).

**Recommend C.** Conditions reuse Data > Filters' grammar and component
(`graphty/src/workspace/data-place/Filters.tsx`): one rule editor to learn. A layer reaches a rule
tree today through `{ match: "member", of: { define } }`.

## 9. Does the mock cover every style?

Nearly: 33 of 35 channels have a control; `node.flat` and `node.marker` draw nothing. **Missing:**
Lighting (studio, headlight, matte, flat; `graphty-element/src/config/Lighting.ts:4`), for Graph
settings as a `SegmentedControl` with icons. The halo and edge band are already marked.

## 10. Text labels

- A. One settings popover holding all 47 label fields (the mock).
- B. Text styles (https://help.figma.com/hc/en-us/articles/360039957034-Create-and-apply-text-styles):
  a style `StyleSelect` per entry with previews (the nine badges, plain looks, the reader's own);
  an edited field marks it modified, with Reset and "Save as new style".
- C. A docked pop-out panel: slows every edit, as Figma's reverted floating panels did.

**Recommend B, with A behind the entry's `AdvancedButton`.** The entry rests at two lines: source;
style, size, position. Saved styles answer Analyst Alex's "no way to save analysis patterns".
**Element adds** label presets as catalog data (badges already are,
`graphty-element/src/BadgeStyleManager.ts:3-117`), saved in the project.

## 11. Picking nodes for manual layers, generically

- A. Selection first: canvas, find box, Shift-click, then "New layer from selection", which keeps
  a fixed set (https://help.figma.com/hc/en-us/articles/360040449873-Select-layers-and-objects).
- B. A condition builder: the filter rule tree (range, categories, degree, neighborhood, top N,
  all, any, not; `graphty-element/src/catalog/types.ts:1120-1182`).
- C. An expression condition: JMESPath in `ComboInput`
  (`compact-mantine/src/components/inputs/expression.ts`), for Expert Emma.

**Recommend all three as doors into one rule**, B its home; typed find text becomes a condition.
A run's field is one more value, never favored. Both owner examples fail today: "name contains
Bob" needs JMESPath `contains(name, 'Bob')`; odd ids are unreachable (JMESPath has no arithmetic).
**Element adds** a text leaf, `{ kind: "text", attribute, op: "contains" | "starts" | "ends" |
"matches", value }`; a regular expression on the id (`[13579]$`) covers odd ids.

## 12. Which properties can vary?

Bindings reach color (6 channels), number (11), kind (4) and text (5); booleans take a table only
and label looks refuse bindings (`graphty-element/src/session/styles/channels.ts`).

- A. Color only.
- B. Every field whose channel accepts a binding, disabled with the reason elsewhere (the mock).
- C. B plus label size, text color and background.

**Recommend B now, C next**, as Figma shows apply-variable on every field that accepts one.
Booleans get no vary glyph: "on for these values" is a Which elements rule. **Element adds**
bindable label channels (`node.labelSize`, `node.labelColor`): new names, so additive.
