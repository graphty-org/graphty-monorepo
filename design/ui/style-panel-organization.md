# Style panel organization

How the graphty app's style panel is organized: the layer tree on the left; on the right, one
Style tab that edits every style layer the same way, a Values tab that shows information, and Graph
settings when no layer is selected. It answers the owner's questions about calculated values,
labels, Figma, progressive disclosure, where information goes and how many of each setting can
exist, then specifies the mock's panels, naming the compact-mantine component for every control.

The layer model is the agreed one in `design/ui/unified-style-layers.md`: a style layer is a rule
for which elements times a setting for each property; each property is off, fixed or derived from
a value; layers stack and the topmost writer wins unless a combine mode says otherwise; a layer can
be split by value into generated children; folders organize rows; any row can be pinned or locked;
Everything is pinned at the bottom, Selected and Hovered at the top; a run's suggestion is an
ordinary layer. This document decides how a reader sees and edits that model.

Rules that bind every answer:

- graphty-element is neutral about presentation: it returns values, descriptors, counts and codes.
  Every word, heading, grouping and order here is the app's.
- The app uses compact-mantine's default components, never a bespoke control. A missing capability
  is fixed in compact-mantine.
- The app reads graphty-element's lists (shapes, palettes, arrow kinds, patterns, defaults and
  units) from the element. It never keeps its own copy and never converts between unit
  conventions; the mock copies them only because it never loads the element.
- Who made a layer never changes what the panel offers.

Where the mock shows something graphty-element cannot draw today, the control is drawn and marked
(section 8). The marks are off by default; the switch above the mock shows them.

---

## 1. Decisions in brief

1. **Two panels, two selections.** The tree lists style layers in paint order; the right panel
   edits the selected row. A canvas click selects nodes and edges, never a layer, because many
   layers paint one node; the inspector names the layer painting each property and opens it.
2. **One fixed section order on every layer:** Header, Which elements, Split by (split parents
   only), Shape, Visibility, Text, Fill, Stroke, Ends, Effects, Rendering. A section the layer does
   not write is its dimmed title with "+"; a section the rule cannot match is left out.
3. **No state words.** Off is an absent row, fixed is a value, derived is a pill naming the value.
4. **Adding never repaints by surprise.** "+" and Add layer open a draft that writes nothing until
   the first value is chosen.
5. **Every field can vary, wherever it sits.** A property row, an effect's color, an arrow's kind
   and a label's source all take the same vary glyph, "=" and value picker. A field that cannot
   vary shows the glyph disabled with the reason. The derive menu follows the kind of field (3.1,
   3.2).
6. **Calculated values hide their controls, never their departures** (3.3).
7. **Labels, effects and ends are repeatable lists** with an eye and a minus per entry, as Figma's
   fills and effects are. Today each holds at most one of a kind, and the panel says why.
8. **Rare settings sit behind a 24 px settings button at the start of the row**, before the value,
   on every kind of row that has one. It opens a light popover to the left of the panel. No
   property section collapses and nothing folds in place.
9. **Information goes in the Values tab,** built from the values a layer reads, the same for every
   layer. Scene-wide settings (background, view mode, label declutter) go in Graph settings, the
   right panel with no layer selected, never on a layer.
10. **Combine mode is per write,** shown on the row only when it is not Replace: inside a number
    field as its prefix ("x 2"), after a color ("Mix"), or as "appended" on an effect.
11. **Split parents carry schemes on their property rows; split children carry overrides,** shown
    in secondary and primary text, with "Follow parent" to undo an override.
12. **Folders write nothing,** so a folder's panel lists its rows and the colors they paint.
13. **The warning mark is for what the reader set that is not showing:** painted over, locked,
    hidden. Every other note is plain secondary text.

---

## 2. Words

The model's terms (off, fixed, derived) never appear on screen.

| On screen                         | Meaning                                                                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Style layer ("layer" on a row)    | A rule plus a setting per property. The tree heading says "Style layers", because a Figma user expects a layer to be an object on the canvas |
| Which elements                    | The rule, read as words: "Nodes where group is 3", "Top 10 nodes by degree", "Selected elements"                                             |
| Value                             | A data column, a run result, or a fact graphty-element provides (is selected, is hovered)                                                    |
| Vary by / Fix at <value>          | Derive a field from a value / turn it back into one value                                                                                    |
| Scheme / Ramp                     | Looks for categories (palette, shapes, patterns, arrow kinds) / a palette or range over a number                                             |
| Split into layers / Follow parent | Make a split parent / drop a child's override                                                                                                |
| Painted over by <layer>           | Layers above cover every element this property paints. Words, never dimming alone                                                            |
| Combine                           | Replace, Multiply, Add, Mix, Set hue, Set lightness, Set transparency; on a ring (outline, glow, halo), Replace or Append                    |
| Graph settings                    | What belongs to the whole graph, not to a layer                                                                                              |

---

## 3. The owner's questions

### 3.1 Which styles apply to calculated categories

Every property can differ per category through Split into layers, because a split child is a full
layer. Which fields take a scheme directly:

| Field                                                                                               | Categories directly | Scheme                     | Note                                                                                    |
| --------------------------------------------------------------------------------------------------- | ------------------- | -------------------------- | --------------------------------------------------------------------------------------- |
| Node color, edge color                                                                              | yes                 | categorical palette        | the commonest binding                                                                   |
| Outline, glow, halo and arrow colors                                                                | yes                 | categorical palette        | each color is its own mesh; capped by the palette                                       |
| Node shape                                                                                          | yes, up to 25       | shape scheme               | leads with shapes that read as different, never sphere second                           |
| Line pattern                                                                                        | yes, up to 9        | pattern list               | drawn solid on a curved edge                                                            |
| Arrow kind                                                                                          | yes, up to 14       | arrow kind list            | relation type to arrow kind                                                             |
| Label text, tooltip                                                                                 | value table         | "1 is Low, 2 is High"      | the common case is passing a column through                                             |
| Size, width, opacity, pattern count, glow strength, halo size, motion speed, arrow size and opacity | value table only    | numbers typed per category | never a palette of sizes: it invents an order                                           |
| Wireframe, curved, visible                                                                          | never               | --                         | "on for these categories" is a rule; the derive menu sends the reader to Which elements |
| Label look (text color, background, size)                                                           | not today           | --                         | the vary glyph shows disabled with the reason                                           |

Past the scheme's length the rest fold into one Other group, painted graphty-element's Other gray
unless the reader picks a color. Other can hold most of a community run, so its share shows at
rest; the overflow choice (fold into Other, cycle shapes, extend the ramp) is in the binding
popover.

### 3.2 Which styles apply to calculated gradients

| Field                                                                        | Ramp | Drawn as                                                      |
| ---------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| Node color                                                                   | yes  | smooth; the default target of a picked number                 |
| Edge color                                                                   | yes  | smooth, one draw batch per distinct color                     |
| Node size (by area), edge width, pattern count, arrow size                   | yes  | steps: each distinct value is a mesh                          |
| Node and edge opacity, arrow opacity, halo opacity                           | yes  | steps; a bound range starts above 0 so nothing vanishes       |
| Outline, glow, halo and arrow colors; glow strength; halo size; motion speed | yes  | steps                                                         |
| Shape, line pattern, arrow kind                                              | no   | a number would be read as a slot index                        |
| Label text                                                                   | no   | the number passes through; a number format is offered instead |

Where the canvas draws steps, the ramp preview and the legend draw the same steps, each labeled
with its interval. A picked number starts on graphty-element's own encode range: node size 1 to 3,
edge width 8 to 16.

### 3.3 The complexities of calculated values

A derived property is a value, a scale and about ten options. A novice abandons tools with "an
overwhelming number of options"; an expert maps "a diverging red-blue gradient to log fold change
with gray for missing values". The options split in three:

| Always visible on the row                       | Only when it applies                 | Behind the settings button                                                                                          |
| ----------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| The value, and the scale's name when not linear | Midpoint (diverging palette)         | Scale type                                                                                                          |
| Palette (color) or range ends (number)          | Step count (stepped scale)           | Domain ends as fields, or a percentile clamp: the two exclude each other, so one is disabled while the other is set |
| Domain ends as text                             | Exponent (power scale)               | Paint elements with no value, on ramps and categories alike                                                         |
| "No value on N"                                 | List reduction (the value is a list) | Per-category eye, overflow, Other threshold and color, unmapped values, order, keep the domain on re-run            |
| Categories: the swatches and Other's share      | The combine word, when not Replace   |                                                                                                                     |

**The note rule.** A control may hide; its effect may not. A setting behind the button that is not
neutral adds one line of secondary text to the row, and the legend prints the same words: "Log
scale", "Clamped at 2nd to 98th percentile, 14 outside", "Level guessed: categories", "Other: 41%
of nodes", "3 values hidden", "Range moved on re-run". graphty-element returns these as codes with
parameters; the app writes the words. A select at its neutral value stores nothing, so it offers no
reset that would only write the default again.

**Re-runs** change values, not layers. The row notes what moved: a re-fit domain, a community that
is new or unmatched ("Community 7 is new"). A child's override follows the members it was made on,
not the raw group number.

**Level.** A number column can be categories or a quantity. A declared level is used; a guessed one
is named on the row and in the popover ("Level guessed: categories. Read as a number"), one click
to switch. **Few values:** a ramp over five or fewer distinct values says so on the row and offers
"Use categories instead" in the popover.

**Hiding a category** is the eye on its row in the categories popover: the category is not painted
and keeps its legend row (graphty-element's `hidden`), and the row notes "1 value hidden".

### 3.4 Labels: none, one or many per element

- **None** is the default: the Text section is a dimmed title with "+".
- **One** is today's only case: a node has one label slot plus a tooltip; an edge has one label
  plus a caption at each end, drawn only where that end has an arrow cap.
- **Many** is what readers want (a name above and a score below, a name plus a count badge, a type
  at an edge's middle and a weight at its end). graphty-element cannot draw it: two layers writing
  a label replace each other's words, and a badge restyles the one label.

The panel is built for many and honest about one. The Text section holds a **list of label
entries**: "+" adds one, each entry has its own size, position and settings popover, an eye and a
minus. While the element has one label slot, "+" on a section that holds a label is disabled with
"One label per element until graphty-element has label slots", and the mock shows the many-labels
list on Key people as a greyed second entry ("degree, above") marked as not drawable. The eye and
the minus differ: the minus removes the entry, so labels from layers beneath show through; the
closed eye hides labels on this layer's elements, including labels a lower layer wrote. A label
hidden for overlapping another is neither: it is a scene decision, counted in the Values tab.

**End captions have one home: the Text list.** On a layer that reaches edges, "+" offers "Caption
at the target end" and "Caption at the source end" beside Label; a caption is a label entry whose
position is that end, with the same source, size and settings (graphty-element's caption defaults
fill its placeholders). Each says "Needs an arrow at this end" until the element can draw an end
label without a cap. The arrow end's settings name the caption and offer "Add one in Text"; they
hold no caption field of their own. The tooltip is its own row below the labels, because it has
its own trigger, and it carries the same size and position line as a label.

### 3.5 What to learn from Figma

**Adopt:** a layer list beside a properties panel; top of the list paints on top; one fixed section
order; an empty section is its dimmed title with "+", and clicking the title adds; lists with an eye
and a minus per item; effect "+" opens a type menu; rare settings behind a 24 px button at the start
of the row (the effect-row placement) opening one 240 px popover at a time; "=" in a number field
opens the value picker; a bound value is a pill; only compatible values are offered; overrides with
reset one and reset all (our split children); commit on Enter, Tab or blur.

**Adapt:**

- "+" adds a draft, not a default: a fixed value covers every layer beneath it.
- Two-way hover becomes one-way: hovering a row marks what it paints; hovering a node lights no row.
- A second paint in a section becomes a second layer: one value per property per layer, so on a
  full section "+" offers "Add layer above, scoped like this one".
- Blend mode becomes combine mode, on each write rather than the layer.
- Detach becomes "Fix at <value>", naming the value it keeps.
- Mixed appears where values differ: a split parent whose children override a property ("Mixed: 1
  community changed"), and the inspector over several nodes.

**Reject:** canvas selection selecting the row; reordering inside a section, including Move up and
Move down on an effect (order lives in the tree); a group's paint writing into its children (it
would silently override each child's choices); collapsible property sections (they hide what a
layer does).

### 3.6 Progressive disclosure

- **At rest:** the header, Which elements, every section title, every property the layer writes,
  and for a derived property its pill, ramp or swatches and notes. A label entry rests at two lines:
  its source, then its size and its position as a word ("Below"). A typical layer rests at one to
  four rows and fits without scrolling.
- **One click:** the settings popover of a property, a label entry, an effect, an arrow end or a
  binding. A popover with more than four rows groups them under captions, and its body scrolls
  inside the window when it is taller than the space below its button.
- **Never at rest:** anything at its neutral value. Zeros and defaults draw no row; departures
  print a note.

What grows in number collapses in the tree, not the panel: past 8 split children the tree shows 8
and "N more", with search. A popover opens at most one child: a color picker or the value picker
opened inside it.

### 3.7 Where non-style information goes

| Fact                                                                                             | Where                                                                          |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| What a layer writes, and how                                                                     | Style tab                                                                      |
| How many elements the rule matches                                                               | one count on Which elements; breakdown in Values                               |
| Histograms, group sizes, members, path order, selected and hovered elements                      | Values tab (histograms also in the binding popover, where the scale is chosen) |
| Painted counts per property                                                                      | Values tab; "Painted over by" as one line on the Style row                     |
| Label counts: labeled, drawn, hidden by overlap                                                  | Values tab                                                                     |
| Run name, when it ran, whether it is out of date                                                 | Values tab                                                                     |
| Which layer paints this node's color; a node's attributes                                        | Inspector, on a canvas selection                                               |
| Background (a color, or an image drawn as a sky), view mode, label declutter and label avoidance | Graph settings                                                                 |

Graph settings is the right panel with no layer selected; "Graph settings" under the tree selects
it. The selection's look is not a graph setting: it is the Selected layer's halo (7.2).

The Style tab holds what the reader can change about the layer; the Values tab holds facts about
what it reads and paints; the inspector is about elements and points at layers.

### 3.8 Cardinality of every setting

| Exactly 1                                         | 0 or 1                                                                                | 0 to many                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| The floor of defaults (not a layer, not a row)    | Each property's setting per layer: off, one value, or one binding                     | Layers, folders, rows per folder                        |
| The rule per layer (may be "everything")          | A binding's second input (bivariate color, clock)                                     | Split children; one override per property per child     |
| The value a split parent splits on                | Each label slot per element today (node label, tooltip, edge label, two end captions) | Label entries, once the element has slots               |
| The combine mode per write                        | Outline, glow, halo, motion per element today                                         | Value table entries                                     |
| One scheme per derived property on a split parent | Each arrow end's cap and its size, color, opacity                                     | Values a layer reads                                    |
|                                                   | Line pattern, pattern count, curve, wireframe; pin; lock                              | Writers of one property on one element across the stack |
|                                                   | Everything, Selected, Hovered                                                         | Legend keys                                             |

Consequences the panel respects:

- A badge and a name label cannot both show on one node today; the mock never shows both.
- The renderer draws one outline, one glow and one halo per node at one width, so rings cannot
  stack. Each ring's combine menu offers Append (a ring beside the layers' beneath), drawn and
  marked as not drawable today.
- Arrow color has a fourth state, follow the line: shown as "Line color" in secondary text, never
  as a fixed gray; the minus returns to it.
- A setting that means nothing without another appears only under it: glow strength under a glow;
  pattern count under a repeating pattern ("+" offers it disabled until the pattern repeats); an
  arrow end's size, color and opacity only when its kind is not None; each label sub-setting under
  its switch.

### 3.9 Other considerations

- **Ontology.** Everything a layer paints is a set: everything, the selection, a path (an ordered
  set), a community, the top 10. There are four row kinds (layer, split parent, split child,
  folder); none is special to runs, paths or selection.
- **Equality.** Nothing on a row says who made it. "From Louvain" comes from the value read, so a
  hand layer reading Louvain's groups says the same, and its Values tab shows the same group sizes.
- **Interaction.** Hovering or focusing a tree row marks what it paints; the row menu has "Select
  what it paints". Eye and lock fire on pointer down, so a drag down the column toggles many rows.
  A locked layer's controls are disabled with "This layer is locked". Removing a result lists the
  layers that read it before the reader confirms.
- **Keyboard.** The tree is an ARIA tree with one Tab stop (arrows, Home, End, type-ahead, F2
  rename, Alt+ArrowUp and Alt+ArrowDown to move, Alt+L collapse all, Control+Shift+H hide,
  Control+Shift+L lock); a row's lock and eye are reached by those shortcuts and the row menu, not
  by Tab. In the Style tab, Enter commits and keeps focus, Escape reverts, "=" opens the value
  picker, Shift+F10 opens a row's menu.
- **Accessibility.** Icon buttons name their target ("Remove node color from Community 3"). A
  pill's name is the whole binding ("Node color varies by degree, linear, 1 to 36"). A field with a
  combine prefix names it ("Edge width, multiplied by"). A tree row's name carries its marks
  ("Community 3, overrides its parent"; "Everything, pinned to the bottom"). Moves are announced
  ("Degree moved above Louvain"). "Painted over" and "Mixed" are words.
- **Honesty.** The panel shows today's quirks: a node label switched on with no text draws the node
  id; label numbers draw as they are; label size scales with zoom and does not wrap; edge labels
  are never decluttered; label animation runs on node labels only.

---

## 4. Building blocks

Widths follow compact-mantine's 240 px grid (`16 | 88 | 8 | 88 | 8 | 24 | 8`). Row actions on
property rows are always visible; only the tree hides them until hover.

### 4.1 Section header

`ControlSection`, 40 px. A written section has its title in primary text and, at the end, "+"
(ghost `ActionIcon`) where it can take another property. An empty section's title is secondary
text, and clicking it adds. "+" opens a dark Mantine `Menu` of the section's unwritten properties,
with the unavailable ones disabled and their reason; on a full section it offers "Add layer above,
scoped like this one". The Fill menu lists Linear gradient and Radial gradient disabled, because
graphty-element draws gradient fills but no style channel reaches them.

### 4.2 Property row, fixed

```
| 16 | value control 160 | 4 | vary 24 | 4 | eye 24 | 4 | minus 24 | 8 |
```

- Value control: color `CompactColorInput` (no opacity part on node and edge color, which draw
  opaque); number `PanelField` with the element's unit, or none where the element's unit is its
  own (edge width, default 8); kind `PanelField` select; switch `ToggleRow`; text Mantine
  `TextInput`.
- **Vary by:** the apply-variable glyph at the control's end on hover and focus (always on touch),
  and "=" in a number field, open the value picker. A property that cannot vary shows the glyph
  disabled with the reason.
- Eye: `ToggleIconButton` (swap variant), pausing the property without losing its value. Minus:
  ghost `ActionIcon`, setting it back to off.
- A caption names the property where a section holds more than one.
- Combine, when not Replace: inside a number field as its glyph ("x 2", read as "Edge width,
  multiplied by"), or a word after a color ("Mix").
- Row menu (`ContextMenu`): Combine submenu, Vary by, Remove; on a split child, Follow parent.
- Under it, when the layers above cover it: "Painted over by <layer>" (and "and N more"), a link
  selecting the topmost of them.

### 4.3 Property row, derived

```
| 16 | settings 24 | 4 | pill 128 | 4 | eye 24 | 4 | minus 24 | 8 |
| 44 | ramp, swatches or range                       156 | ...  |
| 16 | notes, one line each                                     |
```

- Settings: `AdvancedButton` at the start, as on every row that has one, opening the binding
  popover.
- Pill: `VariablePill`, bound-row form: a scale glyph (ramp, steps, swatches), the value's name and
  its run ("group, Louvain"). Clicking it reopens the value picker. Its accessible name is the
  whole binding.
- Second line: a color ramp is a `RampRow` with the domain ends as text, stepped where the canvas
  steps; a number ramp is a `FieldRow` with From and To; categories are up to 8 `ColorSwatch`
  chits (an override marked with a dot, a hidden category faded) and "+N"; pass-through text has
  none.
- Notes: `ProseBlock`, plain secondary text. Only "Painted over by" carries the warning mark.

### 4.4 Value picker

A light `Popout` (240 px) from the vary glyph or "=". A `SearchInput`, then groups under captions:
Data (columns), one group per run (its fields), Facts (is selected, is hovered). Each row a
`DataRow` with a level glyph (categories, number, text, yes or no) and the value's name, plus the
run's state when out of date. Values that do not fit stay listed, disabled, with graphty-element's
reason in a `Tooltip` ("Shape takes categories; degree is a number"; "Arrow kind tells 14
categories apart"). Picking a number makes a ramp with defaults; picking categories makes a scheme.
Picking the value is the owner's one-click "gradient" button.

### 4.5 Binding popover, ramp

`Popout` titled "Node color by degree", header action "Fix at <value>". Its body scrolls inside the
window. Rows (`ControlGroup` captions only where they do not repeat a field's label):

| Row                                              | Component                                                                                                | Shown                               |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Values: the value                                | `VariablePill`                                                                                           | always                              |
| "Read as a number (guessed: categories)"         | `Anchor` to switch back                                                                                  | a guessed level the reader switched |
| "Only 5 distinct values. Use categories instead" | `Anchor`                                                                                                 | five or fewer values                |
| Histogram, ramp, palette with Reverse            | `HistogramRow`, `RampRow`, `StyleSelect` of graphty-element's palettes by plain name, `ToggleIconButton` | color                               |
| Range                                            | two `PanelField`s with the unit                                                                          | number                              |
| Scale and domain: Scale                          | `StyleSelect`: Linear, Log, -log10, Square root, Power, Equal ranges, Equal counts                       | always                              |
| Midpoint / Steps / Exponent                      | `StyleNumberInput`                                                                                       | when they apply                     |
| Domain, Keep on re-run                           | two `PanelField`s ("Auto"), disabled while a clamp is set; `Checkbox`                                    | always                              |
| Clamp                                            | two percentile `PanelField`s, disabled while a domain end is typed, with the reason                      | always, empty by default            |
| Elements with no value                           | `SegmentedControl` Skip / Paint; `CompactColorInput` when Paint                                          | always                              |
| List values                                      | `StyleSelect`: Count, First, Min, Max                                                                    | list values only                    |
| Combine with the layers beneath                  | `StyleSelect`                                                                                            | always                              |

### 4.6 Binding popover, categories

| Row                                                  | Component                                                                                    | Shown                                     |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Value; "Level guessed: categories. Read as a number" | `VariablePill`, `Anchor`                                                                     | always; the line when guessed             |
| Scheme                                               | `StyleSelect`: palettes by plain name, shape schemes or kind lists that fit                  | always                                    |
| Category rows: chit, name, count, eye                | `DataRow`, `ColorSwatch`, `RankChip`, `ToggleIconButton`; 8, then "N more" and `SearchInput` | always                                    |
| "N values hidden: not painted, kept in the legend"   | `ProseBlock`                                                                                 | a category hidden                         |
| Other: share and count                               | `DataRow`                                                                                    | when anything folds                       |
| Overflow / Other threshold / Other color / Order     | `StyleSelect` / `StyleNumberInput` / `CompactColorInput` / `StyleSelect`                     | always; the color when folding into Other |
| Values not listed: Skip or Paint                     | `SegmentedControl`                                                                           | value tables                              |
| Elements with no value                               | `SegmentedControl` Skip / Paint; `CompactColorInput`                                         | always                                    |
| Combine with the layers beneath                      | `StyleSelect`                                                                                | always                                    |
| Split into layers                                    | secondary `Button`, full width                                                               | unsplit layers                            |

On an unsplit layer, changing one category writes a value table entry. After Split into layers the
categories are children in the tree, changed by selecting the child; the popover's chits show each
child's override, read from the child, never stored twice on the parent.

### 4.7 Label entry

```
Text                                                  [+]
 [set] [ name                        v ]  (eye) (-)
 Size [ 48 px ]  (vary)   Position [ Below      v ]
```

- Line 1: `AdvancedButton` at the start, the source (`VariablePill` when passed through,
  `TextInput` for typed words), eye, minus.
- Line 2: Size (`PanelField`, label px, empty shows the element's 48), its vary glyph disabled
  ("Label looks take one value until graphty-element lets them vary"), and Position as a word in a
  `PanelField` select: on a node graphty-element's ten locations (Above, Above left, Above right,
  Left, Center, Right, Below, Below left, Below right, Automatic); on an edge On the line, Above,
  Below, At source end, At target end. The tooltip has the same line.
- The source's popover holds the value picker, then "How it reads": a number source's Number
  format (As is, 1,234, 1.2k, 2 decimals, Percent; marked) and "When missing: Show nothing / Show
  text" with the text.
- Settings popover ("Label settings", "Tooltip settings" or "Caption settings"): Text color and
  Background (`CompactColorInput`, vary glyph disabled), then `ControlSubGroup`s. Every field shows
  graphty-element's default for its block while empty (label: black text, no background, Verdana,
  padding and corners 0, margins 5; tooltip: white background; caption: offset 0.3, pointer height
  15). Switches gate their fields:
    - Type: font, weight, line height, alignment.
    - Box: padding, corners, four margins; Border (width, color); Gradient (type, first and last
      color, direction when linear).
    - Letters: Outline (color, width); Shadow (color, blur, offset across and down).
    - Placement: the `AlignmentMatrix` for a node position; offset in world units; priority when
      crowded (marked); Pointer (side, width, height, offset, curved).
    - Motion and distance: animation, its speed when not None; Fade with distance (near, far, in
      world units).
    - Badge: the nine presets and None; an icon badge's icon and side; a progress badge's progress;
      Shorten large numbers (largest number in full, suffix).

### 4.8 Effect and end entries

```
Effects                                               [+]
 Halo  appended
 [set] [ # FFD700         ] (vary)  (eye) (-)
```

- Effects "+" opens a type menu of the effects not yet written: Outline, Glow and Halo on nodes,
  Motion on edges. Each entry: a caption with its type, `AdvancedButton` (Glow: strength; Halo:
  size as a multiple of the node, opacity; Outline and Motion have none), a `CompactColorInput`
  (Motion: speed), eye, minus. Every field has the vary glyph. The row menu has Combine: Replace,
  or Append, a ring beside the layers' beneath, shown as "appended" and marked. Motion carries the
  note "Not shown on curved or patterned edges, in 2D, in still exports or with reduced motion".
- Ends lists Head (target end) and Tail (source end), each written only when set:
  `AdvancedButton`, kind `PanelField` select (graphty-element's 14 kinds; None means no cap), eye,
  minus. Settings: Size, Color (empty reads "Line color"), Opacity, each with the vary glyph, and a
  line naming the caption in Text. The kind varies by categories, up to 14.

### 4.9 Row states at rest

| State                               | At rest                                                      |
| ----------------------------------- | ------------------------------------------------------------ |
| Off                                 | No row; dimmed section title with "+"                        |
| Fixed / Derived                     | The value control / the pill, its second line and notes      |
| Paused                              | Value in tertiary text, eye closed                           |
| Child following parent / overriding | Parent's value in secondary text / own value in primary text |
| Painted over                        | Plus "Painted over by <layer>", a link selecting that layer  |
| Locked                              | Controls disabled; "This layer is locked" at the top         |
| Hidden                              | "Hidden: changes will not show until it is shown" at the top |

---

## 5. Left panel: the layer tree

### 5.1 The tree for the mock

The mock's graph is the Les Miserables network (77 nodes, 254 edges) with four runs: Louvain,
degree, edge betweenness, and a shortest path from Valjean to Javert.

```
Style layers                                 [+]
   Hovered                           (pin)(lk)(eye)
   Selected                          (pin)(lk)(eye)
 v Annotations                            (lk)(eye)
     Key people                           (lk)(eye)
     Top 10 labels                        (lk)(eye)
   Route Valjean to Javert                (lk)(eye)
   Edge betweenness                       (lk)(eye)
 v Louvain                                (lk)(eye)
     Community 1 ... 6                    (lk)(eye)
       (Community 3 overridden, Community 5 hidden)
   Degree                   painted over  (lk)(eye)
   Everything                        (pin)(lk)(eye)
-------------------------------------------------
 Graph settings      (Restore starting layers)
```

| Row                     | Made by (not shown)           | Paints                                                                                     |
| ----------------------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| Hovered                 | starting layer, pinned top    | the hovered node: glow, tooltip from `name`                                                |
| Selected                | starting layer, pinned top    | selected elements: graphty-element's halo (FFD700, 1.45, 40%), edge width x 2              |
| Annotations             | folder                        | holds the next two rows                                                                    |
| Key people              | the reader                    | five named nodes: octahedron, size 2, label from `name` below                              |
| Top 10 labels           | the reader                    | 10 nodes of highest degree: label from `name` above                                        |
| Route Valjean to Javert | a run, nodes and edges        | color D55E00, edge width 24 (graphty-element's highlight), head arrow, label from step     |
| Edge betweenness        | a run                         | every edge: width by betweenness, 8 to 16 in 5 steps                                       |
| Louvain                 | a run, split                  | every node: color by group; six children                                                   |
| Degree                  | a run                         | every node: color by degree; entirely painted over by Louvain                              |
| Everything              | starting layer, pinned bottom | graphty-element's base look: icosphere, size 1, 6366F1, edge A9A9A9 width 8, a Normal head |

### 5.2 Row anatomy

compact-mantine `Tree` and `TreeItem`: 32 px rows, 24 px per level.

- Caret for folders and split parents, shown while the pointer is over the tree or the row is open.
- Type icon (layer, folder, split parent); a split child shows its color chit (`ColorSwatch`).
- Name, weight 600 top-level and 400 nested; rename by double-click or F2 (`InlineRename`).
- Marks after the name, 16 px glyphs with tooltips, also in the row's accessible name: pin,
  override dot, painted over.
- Lock and eye `ToggleIconButton`s, shown on hover or focus and always when on, outside the Tab
  order. Pin is set from the row menu and shown as a mark, because only top-level rows can pin.
- Hidden rows draw in tertiary text; a hidden folder dims its children.
- Past 8 children: 8 rows and "N more"; a `SearchInput` joins the tree header while such a parent
  is open.

### 5.3 Menus and moves

- Header "+" (ghost `ActionIcon`) opens a dark `Menu`: **Add layer**, **Add folder**. The new row
  goes to the top of the unpinned stack, beneath the rows pinned to the top, as the model says.
- Add layer creates "New layer", selected, with Which elements open and focus on its kind of rule
  (the name is editable in the header). It becomes a layer on its first property; abandoned, it
  leaves nothing. Add folder creates "New folder" in rename.
- Row menu (`ContextMenu`): Rename, Duplicate, Move to folder, Pin to top, Pin to bottom, Unpin,
  Select what it paints, Delete; Unsplit on a split parent; Follow parent for everything on a child;
  Ungroup on a folder. A top-level folder pins like a layer. Several selected rows get hide, lock,
  move to folder and delete only.
- The tree footer holds **Graph settings** and, only when Everything, Selected or Hovered has been
  deleted, **Restore starting layers**.
- Rows drag to reorder; dropping on a folder's middle moves a row in; a split child moves only among
  its siblings; a pinned row moves within its own band, so Selected and Hovered can swap. A pinned
  row moved into a folder, by drag or by Move to folder, unpins: a row inside a folder takes its
  folder's place. The tree reports moves through `onMove`; the app owns the data.

---

## 6. Right panel: what every row shares

```
+------------------------------------------+
| [Style] [Values]                          |
| (icon) Degree          (pin)(i)(lk)(eye)(...) |
+------------------------------------------+
| Which elements                             |
|  Every node                    77 nodes    |
+------------------------------------------+
| Shape                                  [+] |  dimmed
| Visibility                             [+] |  dimmed
| Text                                   [+] |  dimmed
| Fill                                   [+] |
|  [set] [ramp] degree         (eye) (-)     |
|        [=========================]         |
|        1                          36       |
|  ! Painted over by Louvain                 |
| Effects                                [+] |  dimmed
| Rendering                              [+] |  dimmed
+------------------------------------------+
```

- **Tabs:** Mantine `Tabs`, pill variant, Style and Values, on every row kind; the choice persists
  across rows for the session.
- **Header:** type icon, name (`InlineRename`, 11 px weight 600, the section title's size), pin
  mark when pinned, the lock's "not drawable today" mark (a reader-set lock is a gap on every row),
  lock and eye `ToggleIconButton`s, and a "..." ghost `ActionIcon` opening the row menu.
- **Which elements:** a `ControlSection`; at rest the rule in words and a match count ("77 nodes,
  254 edges", the zero half dropped). Clicking the words edits in place and focuses the kind of rule:
  a `StyleSelect` (Every node and edge, Every node, Every edge, Where a value..., Top N by...,
  Named elements, Members of a set, Selected elements, Hovered element) and its fields
  (`ComboInput` for the value, `StyleSelect` for the comparison, `TextInput` or `StyleNumberInput`
  for the operand); "+" on the section adds an "and" condition. Done keeps the rule; Escape puts it
  back. Either closes the editor and returns focus to the words.
- **Sections:** the union of what the rule can match, in the fixed order. Visibility holds Node
  visible, Node opacity, Edge visible and Edge opacity; Stroke holds Edge color, Edge width,
  Pattern, Pattern count and Curved. Rows name their kind ("Node color", "Edge opacity").
- **Placeholders** in empty controls show the floor in graphty-element's units ("Default:
  icosphere", "Default: 8"), so the reader knows what off falls back to.

---

## 7. The mock's rows

There are four row kinds: layer, split parent, split child and folder. The rows below are the
mock's data, not kinds; each is drawn by the same panel. Sections not listed are dimmed titles
with "+".

### 7.1 The Values tab, for every row

The Values tab is built from the rule and the values a layer reads (its rule's value, its split's
value, every derived write, every label source, every bound effect or end field), never from who
made the layer:

- Always: Matched (the rule's count) and Values read (each with its run's state, or "this view
  only" for a fact).
- A category value: group sizes as `DataRow`s (chit when the layer paints by it, name, `RankChip`
  count, largest first; a row with a split child selects it). On a split parent, the last re-run's
  matching report.
- A rule on one category ("where group is 3"): its members, 8 then "N more" with search when longer,
  the count at the caption's end; the share of the graph; on a split child, how it was matched on
  the last re-run.
- A number: a histogram (`HistogramRow`, on log-log axes for a heavy-tailed value) with minimum,
  median and maximum (`MetricRow`); the step bounds and counts when the layer draws it in steps; a
  ranked list when the rule is "Top N by" that number.
- An ordered set (a route's steps): a numbered list, its length and total weight.
- Named elements: the found count.
- Is selected / is hovered: the current elements ("Nothing hovered" when none; then no painted
  counts).
- A layer with labels: labeled, drawn and hidden by overlap.
- Always last: painted counts per property, a split child's followed properties included ("Node
  color: 11 of 11, follows Louvain").

A folder lists the values its layers read, each with the layers that read it.

### 7.2 Everything (pinned bottom)

- Which elements: "Every node and edge", "77 nodes, 254 edges".
- Shape: Shape "Icosphere"; Size "1".
- Fill: Node color "6366F1"; "Painted over by Louvain and 2 more".
- Stroke: Edge color "A9A9A9"; Edge width "8"; "Painted over by Edge betweenness and 2 more".
- Ends: Head "Normal", color following the line: the arrowhead every edge gets today, so the reader
  can see where arrows come from and choose None for all edges. Once the studio branch lands, the
  element draws it only on directed graphs.

### 7.3 Selected (pinned top)

- Which elements: "Selected elements", "2 nodes" (this view's count).
- Stroke: Edge width "x 2" (Multiply): a selected edge keeps its color and thickens.
- Effects: Halo "FFD700", settings size 1.45 times the node and opacity 40%, appended: graphty-
  element's selection look today, carried by the layer instead of a separate selection setting
  (marked, section 8). When the studio branch lands, its edge band becomes a Band effect here and
  replaces Edge width x 2.
- Everything else dimmed with "+": a selection can take a label, a shape or a glow as any layer can.

### 7.4 Hovered (pinned top)

- Which elements: "Hovered element", "None now".
- Text: Tooltip, a label entry with source pill "name", size and position ("Above right", the
  element's default); its settings hold the tooltip look.
- Effects: Glow "FFD54F"; settings: Strength 1.

### 7.5 Louvain (split parent)

- Which elements: "Every node", "77 nodes".
- Split by: the value pill "group, Louvain", nothing else; the header menu has Unsplit.
- Fill: Node color, derived: settings, pill "group, Louvain", six chits with Community 3's override
  dot; notes "Level guessed: categories" and "Mixed: 1 community changed". Its popover holds the
  scheme ("Eight Distinct Colors"), without the Split button.
- Effects: dimmed. A glow added here reaches every child; varied by group it takes the scheme.

### 7.6 Community 3 (split child)

- Header menu: Follow parent for everything.
- Which elements: "Louvain's nodes where group is 3", "12 nodes", the parent's part in secondary
  text; not editable on the child.
- Fill: Node color "882255" in primary text (an override); its row menu has Follow parent.
- Effects: Glow "882255", on this child only.
- Other sections show the parent's value in secondary text where the parent writes one, else are
  dimmed: a child takes any property, not only those the parent derives. Community 5 is hidden and
  says so.

### 7.7 Degree

- Which elements: "Every node", "77 nodes".
- Fill: Node color, derived: settings, pill "degree" (ramp glyph); `RampRow` "Orange to Brown", "1"
  and "36" at its ends; "Painted over by Louvain", a link selecting Louvain.
- Behind disclosure: the ramp popover (histogram, palette with Reverse, scale Linear, domain Auto,
  no clamp, No value Skip, Replace). Choosing Log adds "Log scale" to the row and the legend.

### 7.8 Route Valjean to Javert

- Which elements: "Nodes and edges on the route", "5 nodes, 4 edges".
- Text: a label entry, pill "step, route", Size 36 px, Position "Above right"; note "Numbers draw
  as they are".
- Fill: Node color "D55E00". Stroke: Edge color "D55E00"; Edge width "24".
- Ends: Head, kind "Normal"; its settings show Color "Line color" and the caption line.

### 7.9 Edge betweenness

- Which elements: "Every edge", "254 edges". Node-only sections are absent.
- Stroke: Edge width, derived: pill "betweenness" (steps glyph); From 8 To 16; note "5 steps".
  Stroke's "+" offers Edge color, Pattern and Curved; Pattern count waits for a repeating pattern.
- Visibility "+" offers Edge visible and Edge opacity.

### 7.10 Key people

- Which elements: "Named nodes: Valjean, Javert, Cosette, Marius, Fantine", "5 nodes".
- Shape: Shape "Octahedron"; Size "2".
- Text: a label entry, pill "name", Size 48 px, Position "Below", white text on 1F2933; below it a
  greyed second entry ("degree", "Above") marked as not drawable, showing the many-labels list. The
  section's "+" offers Label disabled with the one-label reason.

### 7.11 Annotations (folder)

- Header: folder icon, name, lock, eye, "..." (Rename, Ungroup, Pin, Delete). No property sections.
- Contents: a `ControlSection` listing its rows in paint order as `DataRow`s with their own eye
  `ToggleIconButton`s; a name selects that row.
- Colors painted: up to 3 `ColorSwatch` chits and "+N"; each names the layer painting it and
  selects it. Never edited here.

### 7.12 A new layer (draft)

The state Add layer opens: at the top of the unpinned stack; Which elements open with focus on the
kind of rule, never defaulted to everything (it would cover every layer beneath); every property
section dimmed, with one line "Choose which elements, then set a property"; the Values tab disabled
until the rule is set.

### 7.13 Graph settings (nothing selected)

- Background: Color or Image (`SegmentedControl`); a `CompactColorInput` (default F5F5F5) or an
  image address drawn as a sky around the graph.
- View: View mode (3D, 2D, VR, AR); "Same size at any depth" (marked: the studio branch adds it).
- Labels: "Hide overlapping labels" (declutter), "Move labels off nodes and edges" (avoidance).
- Highlight: Highlight color, the color a run paints its result in when no layer says otherwise
  (default D55E00 on master; marked: the studio branch adds the setter).

---

## 8. What the mock draws that graphty-element cannot draw today

Each is drawn and marked in the mock, and each is an additive change to graphty-element. The
model's breaking pieces (selection and hover as layers, a run's layer going on top, lock as a
reader's flag, one layer painting both kinds) are recorded in `design/ui/unified-style-layers.md`.

| The mock shows                                                                          | graphty-element needs                                                                                        |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Selected and Hovered reading is selected and is hovered                                 | those two values, scoped to a view                                                                           |
| Folders, pins, locks on any row                                                         | folders, pins and a reader-set lock flag in the stack                                                        |
| Split parent and children with overrides                                                | split by value, children matched across re-runs                                                              |
| Combine words                                                                           | a combine mode on each property write                                                                        |
| Append on outline, glow and halo                                                        | rings that stack: more than one outline, glow or halo per node                                               |
| The selection halo as a layer effect                                                    | halo color, size and opacity as style channels, instead of a setting drawn from the selection                |
| Node visible and Edge visible                                                           | visibility as a style write (today only session filters hide elements)                                       |
| The per-property eye                                                                    | a paused flag on a property write, saved with the layer                                                      |
| A second label entry (greyed)                                                           | label slots keyed by name, with a combine mode and stacking                                                  |
| Label size, color, background varying (disabled)                                        | those look fields as properties that take bindings                                                           |
| Label priority when crowded                                                             | a label priority read from a layer (declutter ranks by selection, degree and id)                             |
| A number format on a label                                                              | a number format on text bindings                                                                             |
| Shape schemes                                                                           | named shape lists, distinct shapes first                                                                     |
| Keep on re-run; Values not listed: Skip                                                 | a pinned domain; the unmapped option on value tables                                                         |
| Linear and Radial gradient in Fill's "+" (disabled)                                     | a style channel for the gradient fills it already draws                                                      |
| Draw on top, Clicking the label picks the node, Same size at any depth, Highlight color | the studio branch's `onTop`, `pickable`, depth-independent size and `setHighlightColor` (pull request #1727) |

When the studio branch lands, Selected also gains a Band effect on edges (the branch's selection
band: color, width multiple, opacity), replacing Edge width x 2, and Everything's head becomes
"Normal on directed graphs".

Nothing in the mock has a control for these, each for a reason:

- A badge and a name on one node: one label slot draws one or the other.
- An outline width: one highlight layer draws every outline at one width.
- An edge tooltip: edges cannot be hovered.
- `node.flat`: graphty-element accepts it, but nothing draws it.
- `node.marker`: graphty-element refuses it; it draws no marker.
- The context point (what a hidden node is drawn as while context is shown): the element sets it
  internally; it belongs with visibility filters, not styles.
- Edge width in pixels: graphty-element's edge width is its own unit, drawn differently by each
  renderer. The panel shows that unit; a pixel unit is an element change, never a conversion in the
  app.

---

## 9. Open questions

Each is reversible in the mock and does not block it.

- Whether a split child can itself be split (not offered).
- How deep folders nest (the mock shows one level; the tree assumes none).
- Whether a separate badge slot comes before label slots, as the smaller change.
- Whether a range the reader typed survives a re-run by default ("Keep on re-run" is unchecked).
- Whether the tooltip stays its own block or becomes a label entry on Hovered.
- Whether a run's categorical suggestion arrives split (the mock shows Louvain split).
- Editing several layers at once with Mixed values (the mock offers bulk row commands only).

---

## Sources

- The layer model: `design/ui/unified-style-layers.md`.
- graphty-element's style catalog, every channel, field, palette and scale with its source line:
  `tmp/style-catalog/catalog.md` in the main checkout.
- compact-mantine's Figma specification, audit and Storybook plan: `compact-mantine/design/`.
- The app framework's section order, row states and encoding rules, and the disclosure tiers:
  `design/ui/framework/options-and-encodings.md` and
  `design/ui/app-shell-progressive-disclosure-design.md` sections 6.2 and 6.17 (branch
  `design/studio-tier1`).
- Figma's help center (help.figma.com) on the right sidebar, fills, strokes, effects, styles,
  variables, mixed selections and instances, and the repository's Figma editor study,
  `design/ui/figma/`.
- The personas: `design/designloom/personas/`.
