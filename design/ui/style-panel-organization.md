# Style panel organization

How the graphty app's style panel is organized: the layer tree on the left; on the right, one
Style tab that edits every style layer the same way and a Values tab that shows information. It
answers the owner's questions about calculated values, labels, Figma, progressive disclosure,
where information goes and how many of each setting can exist, then specifies the mock's panels
row kind by row kind, naming the compact-mantine component for every control.

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
- Who made a layer never changes what the panel offers.

Where the mock shows something graphty-element cannot draw today, the control is drawn and marked
(section 8).

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
5. **The derive menu follows the kind of property** (3.1, 3.2).
6. **Calculated values hide their controls, never their departures** (3.3).
7. **Labels and effects are repeatable lists** with an eye and a minus per entry, as Figma's fills
   and effects are. Today each holds at most one of a kind, and the panel says why.
8. **Rare settings sit behind a 24 px settings button** opening a light popover to the left of the
   panel. No property section collapses and nothing folds in place.
9. **Information goes in the Values tab;** scene-wide behavior (declutter, background, label
   budget) goes in the graph's settings, never on a layer.
10. **Combine mode is per property write,** shown as a word on the row only when it is not Replace.
11. **Split parents carry schemes; split children carry overrides,** shown in secondary and primary
    text, with "Follow parent" to undo an override.
12. **Folders write nothing,** so a folder's panel lists its rows and the colors they paint.

---

## 2. Words

The model's terms (off, fixed, derived) never appear on screen.

| On screen                         | Meaning                                                                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Style layer ("layer" on a row)    | A rule plus a setting per property. The tree heading says "Style layers", because a Figma user expects a layer to be an object on the canvas |
| Which elements                    | The rule, read as words: "Nodes where group is 3", "Top 10 nodes by degree", "Selected elements"                                             |
| Value                             | A data column, a run result, or a fact graphty-element provides (is selected, is hovered)                                                    |
| Vary by / Fix at <value>          | Derive a property from a value / turn it back into one value                                                                                 |
| Scheme / Ramp                     | Looks for categories (palette, shapes, patterns, arrow kinds) / a palette or range over a number                                             |
| Split into layers / Follow parent | Make a split parent / drop a child's override                                                                                                |
| Painted over by <layer>           | Layers above cover every element this property paints. Words, never dimming alone                                                            |
| Combine                           | Replace, Multiply, Add, Mix, Set hue, Set lightness, Set transparency                                                                        |

---

## 3. The owner's questions

### 3.1 Which styles apply to calculated categories

Every property can differ per category through Split into layers, because a split child is a full
layer. Which properties take a scheme directly:

| Property                                                      | Categories directly | Scheme                     | Note                                                                                    |
| ------------------------------------------------------------- | ------------------- | -------------------------- | --------------------------------------------------------------------------------------- |
| Node color, edge color                                        | yes                 | categorical palette        | the commonest binding                                                                   |
| Outline, glow and arrow colors                                | yes                 | categorical palette        | each color is its own mesh; capped by the palette                                       |
| Node shape                                                    | yes, up to 25       | shape scheme               | leads with shapes that read as different, never sphere second                           |
| Line pattern                                                  | yes, up to 9        | pattern list               | drawn solid on a curved edge                                                            |
| Arrow kind                                                    | yes, up to 14       | arrow kind list            | relation type to arrow kind                                                             |
| Label text, tooltip                                           | value table         | "1 is Low, 2 is High"      | the common case is passing a column through                                             |
| Size, width, opacity, glow strength, motion speed, arrow size | value table only    | numbers typed per category | never a palette of sizes: it invents an order                                           |
| Wireframe, curved, visible, labels on                         | never               | --                         | "on for these categories" is a rule; the derive menu sends the reader to Which elements |
| Label look (text color, background, size)                     | not today           | --                         | the bind glyph shows disabled with the reason                                           |

Past the scheme's length the rest fold into one Other group. Other can hold most of a community
run, so its share shows at rest; the overflow choice (fold into Other, cycle shapes, extend the
ramp) is in the binding popover.

### 3.2 Which styles apply to calculated gradients

| Property                                                    | Ramp | Drawn as                                                      |
| ----------------------------------------------------------- | ---- | ------------------------------------------------------------- |
| Node color                                                  | yes  | smooth; the default target of a picked number                 |
| Edge color                                                  | yes  | smooth, one draw batch per distinct color                     |
| Node size (by area), edge width, arrow size                 | yes  | steps: each distinct value is a mesh                          |
| Node and edge opacity                                       | yes  | steps; a bound range starts above 0 so nothing vanishes       |
| Outline, glow and arrow colors; glow strength; motion speed | yes  | steps                                                         |
| Shape, line pattern, arrow kind                             | no   | a number would be read as a slot index                        |
| Label text                                                  | no   | the number passes through; a number format is offered instead |

Where the canvas draws steps, the ramp preview and the legend draw the same steps, each labeled
with its interval.

### 3.3 The complexities of calculated values

A derived property is a value, a scale and about ten options. A novice abandons tools with "an
overwhelming number of options"; an expert maps "a diverging red-blue gradient to log fold change
with gray for missing values". The options split in three:

| Always visible on the row                       | Only when it applies                          | Behind the settings button                                                                  |
| ----------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| The value, and the scale's name when not linear | Midpoint (diverging palette or signed values) | Scale type                                                                                  |
| Palette (color) or range ends (number)          | Step count (stepped scale)                    | Domain ends as fields                                                                       |
| Domain ends as text                             | Exponent (power scale)                        | Percentile clamp                                                                            |
| "No value on N"                                 | List reduction (the value is a list)          | Paint elements with no value                                                                |
| Categories: the swatches and Other's share      | The combine word, when not Replace            | Hidden values, overflow, Other threshold, unmapped values, order, keep the domain on re-run |

**The note rule.** A control may hide; its effect may not. A setting behind the button that is not
neutral adds one line of secondary text to the row, and the legend prints the same words: "Log
scale", "Clamped at 2nd to 98th percentile, 14 outside", "Level guessed: categories", "Other: 41%
of nodes", "3 values hidden", "Range moved on re-run". graphty-element returns these as codes with
parameters; the app writes the words.

**Re-runs** change values, not layers. The row notes what moved: a re-fit domain, a community that
is new or unmatched ("Community 7 is new"). A child's override follows the members it was made on,
not the raw group number.

**Level.** A number column can be categories or a quantity. A declared level is used; a guessed one
is named on the pill with one click to switch. **Few values:** a ramp over three distinct values
says so and offers categories.

### 3.4 Labels: none, one or many per element

- **None** is the default: the Text section is a dimmed title with "+".
- **One** is today's only case: a node has one label slot plus a tooltip; an edge has one label
  plus a caption at each end, drawn only where that end has an arrow cap.
- **Many** is what readers want (a name above and a score below, a name plus a count badge, a type
  at an edge's middle and a weight at its end). graphty-element cannot draw it: two layers writing
  a label replace each other's words, and a badge restyles the one label.

The panel is built for many and honest about one. The Text section holds a **list of label
entries**: "+" adds one, each entry has its own position, size and settings popover, an eye and a
minus. While the element has one label slot, "+" on a section that holds a label is disabled with
"One label per element until graphty-element has label slots". The eye and the minus differ: the
minus removes the entry, so labels from layers beneath show through; the closed eye hides labels on
this layer's elements, including labels a lower layer wrote. A label hidden for overlapping another
is neither: it is a scene decision, counted in the Values tab. An edge's end captions are positions
in the same list ("At source end"), each saying "Needs an arrow at this end" until the element can
draw an end label without a cap. The tooltip is its own row below the labels, because it has its
own trigger.

### 3.5 What to learn from Figma

**Adopt:** a layer list beside a properties panel; top of the list paints on top; one fixed section
order; an empty section is its dimmed title with "+", and clicking the title adds; lists with an eye
and a minus per item; effect "+" opens a type menu; rare settings behind a 24 px button opening one
240 px popover at a time; "=" in a number field opens the value picker; a bound value is a pill;
only compatible values are offered; overrides with reset one and reset all (our split children);
commit on Enter, Tab or blur.

**Adapt:**

- "+" adds a draft, not a default: a fixed value covers every layer beneath it.
- Two-way hover becomes one-way: hovering a row marks what it paints; hovering a node lights no row.
- A second paint in a section becomes a second layer: one value per property per layer, so on a
  full section "+" offers "Add layer above, scoped like this one".
- Blend mode becomes combine mode, on each property write rather than the layer.
- Detach becomes "Fix at <value>", naming the value it keeps.
- Mixed appears where values differ: a split parent whose children override a property ("Mixed: 3
  communities changed"), and the inspector over several nodes.

**Reject:** canvas selection selecting the row; reordering inside a section (order lives in the
tree); a group's paint writing into its children (it would silently override each child's choices);
collapsible property sections (they hide what a layer does).

### 3.6 Progressive disclosure

- **At rest:** the header, Which elements, every section title, every property the layer writes,
  and for a derived property its pill, ramp or swatches and notes. A typical layer rests at one to
  four rows and fits without scrolling.
- **One click:** the settings popover of a property, a label entry, an effect, the edge line or a
  binding. A popover with more than four rows groups them under captions.
- **Never at rest:** anything at its neutral value. Zeros and defaults draw no row; departures
  print a note.

What grows in number collapses in the tree, not the panel: past 8 split children the tree shows 8
and "N more", with search. A popover never opens a second root popover; a color picker opened
inside one is its one allowed child.

### 3.7 Where non-style information goes

| Fact                                                                        | Where                                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| What a layer writes, and how                                                | Style tab                                                                      |
| How many elements the rule matches                                          | one count on Which elements; breakdown in Values                               |
| Histograms, group sizes, members, path order, selected and hovered elements | Values tab (histograms also in the binding popover, where the scale is chosen) |
| Painted counts per property                                                 | Values tab; "Painted over by" as one line on the Style row                     |
| Label counts: labeled, drawn, hidden by overlap                             | Values tab                                                                     |
| Run name, when it ran, whether it is out of date                            | Values tab                                                                     |
| Which layer paints this node's color; a node's attributes                   | Inspector, on a canvas selection                                               |
| Declutter, label avoidance, label budget, background, view mode             | Graph settings (the inspector with nothing selected)                           |

The Style tab holds what the reader can change about the layer; the Values tab holds facts about
what it reads and paints; the inspector is about elements and points at layers.

### 3.8 Cardinality of every setting

| Exactly 1                                         | 0 or 1                                                                                | 0 to many                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| The floor of defaults (not a layer, not a row)    | Each property's setting per layer: off, one value, or one binding                     | Layers, folders, rows per folder                        |
| The rule per layer (may be "everything")          | A binding's second input (bivariate color, clock)                                     | Split children; one override per property per child     |
| The value a split parent splits on                | Each label slot per element today (node label, tooltip, edge label, two end captions) | Label entries, once the element has slots               |
| The combine mode per write                        | Glow, outline, motion per element today                                               | Value table entries                                     |
| One scheme per derived property on a split parent | Each arrow end's cap and its size, color, opacity, caption                            | Values a layer reads                                    |
|                                                   | Line pattern, curve, wireframe; pin; lock                                             | Writers of one property on one element across the stack |
|                                                   | Everything, Selected, Hovered                                                         | Legend keys                                             |

Consequences the panel respects:

- A badge and a name label cannot both show on one node today; the mock never shows both.
- The renderer draws one outline and one glow per mesh at one width, so rings cannot stack. The
  combine menu offers "Add a ring" on outline and glow disabled, with that reason.
- Arrow color has a fourth state, follow the line: shown as "Line color" in secondary text, never
  as a fixed gray; the minus returns to it.
- A setting that means nothing without another appears only under it: glow strength under a glow;
  pattern count under a repeating pattern; an arrow end's size, color, opacity and caption only when
  its kind is not None; each label sub-setting under its switch.

### 3.9 Other considerations

- **Ontology.** Everything a layer paints is a set: everything, the selection, a path (an ordered
  set), a community, the top 10. No row kind is special to runs, paths or selection.
- **Equality.** Nothing on a row says who made it. "From Louvain" comes from the value read, so a
  hand layer reading Louvain's groups says the same.
- **Interaction.** Hovering or focusing a tree row marks what it paints; the row menu has "Select
  what it paints". Eye and lock fire on pointer down, so a drag down the column toggles many rows.
  A locked layer's controls are disabled with "This layer is locked". Removing a result lists the
  layers that read it before the reader confirms.
- **Keyboard.** The tree is an ARIA tree (arrows, Home, End, type-ahead, F2 rename, Alt+ArrowUp and
  Alt+ArrowDown to move, Alt+L collapse all, Control+Shift+H hide, Control+Shift+L lock). In the
  Style tab, Enter commits and keeps focus, Escape reverts, "=" opens the value picker, Shift+F10
  opens a row's menu.
- **Accessibility.** Icon buttons name their target ("Remove node color from Community 3"). A
  pill's name is the whole binding ("Node color varies by degree, 5 steps"). Moves are announced
  ("Degree moved above Louvain"). "Painted over" and "Mixed" are words.
- **Honesty.** The panel shows today's quirks: a node label switched on with no text draws the node
  id; label numbers draw unformatted; label size scales with zoom and does not wrap; edge labels are
  never decluttered; label animation runs on node labels only.

---

## 4. Building blocks

Widths follow compact-mantine's 240 px grid (`16 | 88 | 8 | 88 | 8 | 24 | 8`). Row actions on
property rows are always visible; only the tree hides them until hover.

### 4.1 Section header

`ControlSection`, 40 px. A written section has its title in primary text and, at the end, "+"
(ghost `ActionIcon`) where it can take another property, and `AdvancedButton` where it has shared
rare settings. An empty section's title is secondary text, and clicking it adds. "+" opens a dark
Mantine `Menu` of the section's unwritten properties; on a full section it offers "Add layer above,
scoped like this one".

### 4.2 Property row, fixed

```
| 16 | value control 156 | 4 | eye 24 | 4 | minus 24 | 8 |
```

- Value control: color `CompactColorInput` (no opacity part on node and edge color, which draw
  opaque); number `StyleNumberInput` with its unit; kind `StyleSelect` with a glyph per option;
  switch Mantine `Switch` on a `ToggleRow`; text Mantine `TextInput`.
- **Vary by:** every value control shows Figma's apply-variable glyph at its end on hover and focus
  (always on touch), and "=" in a number field opens the same picker. A property that cannot vary
  shows the glyph disabled with the reason.
- Eye: `ToggleIconButton` (swap variant), pausing the property without losing its value. Minus:
  ghost `ActionIcon`, setting it back to off.
- A `FieldRow` legend names the property where a section holds more than one.
- Combine, when not Replace: a prefix in the field ("x 1.5") or a word after it ("Mix 50%").
- Row menu (`ContextMenu`): Combine submenu, Vary by, Remove; on a split child, Follow parent.

### 4.3 Property row, derived

```
| 16 | pill 128 | 4 | settings 24 | 4 | eye 24 | 4 | minus 24 | 8 |
| 16 | ramp, swatches or range                        184 | ...  |
| 16 | notes, one line each                                     |
```

- Pill: `VariablePill`, bound-row form: a scale glyph (ramp, steps, swatches), the value's name and
  its run ("group, Louvain"). Clicking it reopens the value picker.
- Settings: `AdvancedButton`, opening the binding popover.
- Second line: a color ramp is a `RampRow` with the domain ends as text, stepped where the canvas
  steps; a number ramp is a `FieldRow` with From and To `StyleNumberInput`s; categories are up to 8
  `ColorSwatch` chits (or shape and pattern glyphs) and "+N"; pass-through text has none.
- Notes: `ProseBlock`, secondary text.

### 4.4 Value picker

A light `Popout` (240 px) from the vary glyph or "=". A `SearchInput`, then groups under captions:
Data (columns), one group per run (its fields), Facts (is selected, is hovered). Each row a
`DataRow` with a level glyph (categories, number, text, yes or no) and the value's name, plus the
run's state when out of date. Values that do not fit stay listed, disabled, with graphty-element's
reason in a `Tooltip` ("Shape takes categories; degree is a number"). Picking a number makes a ramp
with defaults; picking categories makes a scheme. Picking the value is the owner's one-click
"gradient" button.

### 4.5 Binding popover, ramp

`Popout` titled "Node color by degree", header action a subtle `Button` "Fix at <value>". Rows
(label column 72 px), scrolling in a `ScrollArea` when tall:

| Row                                     | Component                                                                          | Shown                    |
| --------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------ |
| Value                                   | `VariablePill`                                                                     | always                   |
| Histogram with the ramp and domain ends | `HistogramRow` over `RampRow`                                                      | always                   |
| Palette, with Reverse                   | `StyleSelect` with previews; `ToggleIconButton`                                    | color                    |
| Range                                   | two `StyleNumberInput`s with unit                                                  | number                   |
| Scale                                   | `StyleSelect`: Linear, Log, -log10, Square root, Power, Equal ranges, Equal counts | always                   |
| Midpoint / Steps / Exponent             | `StyleNumberInput`                                                                 | when they apply          |
| Domain, Keep on re-run                  | two `StyleNumberInput`s ("Auto"); `Checkbox`                                       | always                   |
| Clamp                                   | two percentile `StyleNumberInput`s                                                 | always, empty by default |
| No value                                | `SegmentedControl` Skip / Paint; `CompactColorInput` when Paint                    | always                   |
| List values                             | `StyleSelect`: Count, First, Min, Max                                              | list values only         |
| Combine                                 | `StyleSelect`                                                                      | always                   |

### 4.6 Binding popover, categories

| Row                                               | Component                                                                | Shown               |
| ------------------------------------------------- | ------------------------------------------------------------------------ | ------------------- |
| Value, level, "Read as a number" when guessed     | `VariablePill`, `Anchor`                                                 | always              |
| Scheme                                            | `StyleSelect`: palettes, shape schemes or pattern lists that fit         | always              |
| Category rows: chit, name, count; click to change | `DataRow`, `ColorSwatch`, `RankChip`; 8, then "N more" and `SearchInput` | always              |
| Other: share and count                            | `DataRow`                                                                | when anything folds |
| Overflow / Other threshold / Order                | `StyleSelect` / `StyleNumberInput` / `StyleSelect`                       | always              |
| Values not listed: Skip or Paint                  | `SegmentedControl`                                                       | value tables        |
| Combine                                           | `StyleSelect`                                                            | always              |
| Split into layers                                 | secondary `Button`, full width                                           | unsplit layers      |

On an unsplit layer, changing one category writes a value table entry. After Split into layers the
categories are children in the tree, changed by selecting the child.

### 4.7 Label entry

```
Text                                                  [+]
 [set] [ name                        v ]  (eye) (-)
       Size [ 48 px ]   Position [ . . . ]
                                 [ . # . ]
                                 [ . . . ]
```

- Line 1: `AdvancedButton` at the start (Figma's effect-row placement), the source (`VariablePill`
  when passed through, `TextInput` for typed words), eye, minus.
- Line 2, a `FieldRow`: Size (`StyleNumberInput`, label px) and Position: on a node the
  `AlignmentMatrix` (nine places); on an edge a `StyleSelect` (On the line, Above, Below, At source
  end, At target end).
- "Label settings" popover: Text color and Background (`CompactColorInput`), then captioned groups:
  Type (font, weight, line height, alignment), Box (padding, corners, border, margins, gradient),
  Letters (outline, shadow), Placement (offset, priority, pointer), Motion and distance (animation,
  depth fade), Badge (preset, icon, progress, number shortening). Switches gate their fields. A
  color picker opened here is the popover's one child.
- A number source's binding popover offers a number format and "When missing: show nothing / show
  <text>".
- The vary glyph on Size, Text color and Background is disabled: "Label looks take one value until
  graphty-element lets them vary".

### 4.8 Effect and end entries

```
Effects                                               [+]
 [set] [ # Glow      FFD54F          ]  (eye) (-)
 [set] [ # Outline   0D99FF          ]  (eye) (-)
```

- Effects "+" opens a type menu of the effects not yet written: Outline and Glow on nodes, Motion
  on edges. Each entry: `AdvancedButton`, a `CompactColorInput` (Motion: `StyleNumberInput` speed),
  eye, minus. Glow's settings hold Strength; Outline has none (one width for the scene). Motion
  carries the note "Not shown on curved or patterned edges, in 2D, in still exports or with reduced
  motion".
- Ends lists Head (target end) and Tail (source end), each written only when set: `AdvancedButton`,
  kind `StyleSelect` (14 kinds; None means no cap), eye, minus. Settings: Size, Color (empty reads
  "Line color"), Opacity, and Caption (a label entry with its own settings).

### 4.9 Row states at rest

| State                               | At rest                                                      |
| ----------------------------------- | ------------------------------------------------------------ |
| Off                                 | No row; dimmed section title with "+"                        |
| Fixed / Derived                     | The value control / the pill, its second line and notes      |
| Paused                              | Value in tertiary text, eye closed                           |
| Child following parent / overriding | Parent's value in secondary text / own value in primary text |
| Painted over                        | Plus "Painted over by <layer>", a link selecting that layer  |
| Locked                              | Controls disabled, reason in the tooltip                     |

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
```

| Row                     | Kind                                  | Paints                                                        |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------- |
| Hovered                 | layer, pinned top                     | the hovered node: glow, tooltip from `name`                   |
| Selected                | layer, pinned top                     | selected elements: size x 1.5, outline, edge width x 2        |
| Annotations             | folder                                | holds the next two rows                                       |
| Key people              | hand-made                             | five named nodes: octahedron, size 2, label from `name` below |
| Top 10 labels           | hand-made                             | 10 nodes of highest degree: label from `name` above           |
| Route Valjean to Javert | run's layer, nodes and edges together | color, edge width 3, head arrow, label from step order        |
| Edge betweenness        | run's layer                           | every edge: width by betweenness, 5 steps                     |
| Louvain                 | run's layer, split                    | every node: color by group; six children                      |
| Degree                  | run's layer                           | every node: color by degree; entirely painted over by Louvain |
| Everything              | layer, pinned bottom                  | the base look                                                 |

### 5.2 Row anatomy

compact-mantine `Tree` and `TreeItem`: 32 px rows, 24 px per level.

- Caret for folders and split parents, shown while the pointer is over the tree or the row is open.
- Type icon (layer, folder, split parent); a split child shows its color chit (`ColorSwatch`).
- Name, weight 600 top-level and 400 nested; rename by double-click or F2 (`InlineRename`).
- Marks after the name, 16 px glyphs with tooltips and accessible names: pin, override dot,
  painted over.
- Lock and eye `ToggleIconButton`s, shown on hover or focus and always when on. Pin is set from the
  row menu and shown as a mark, because only top-level rows can pin.
- Hidden rows draw in tertiary text; a hidden folder dims its children.
- Past 8 children: 8 rows and "N more"; a `SearchInput` joins the tree header while such a parent
  is open.

### 5.3 Menus and moves

- Header "+" (ghost `ActionIcon`) opens a dark `Menu`: **Add layer**, **Add folder**. The new row
  goes above the selected row, inside its folder; with nothing selected, to the top of the unpinned
  stack, beneath Hovered and Selected.
- Add layer creates "New layer", selected, with Which elements open and focused. It becomes a layer
  on its first property; abandoned, it leaves nothing. Add folder creates "New folder" in rename.
- Row menu (`ContextMenu`): Rename, Duplicate, Move to folder, Pin to top, Pin to bottom, Unpin,
  Select what it paints, Delete; Unsplit on a split parent; Follow parent for everything on a child;
  Ungroup on a folder. Several selected rows get hide, lock, move to folder and delete only.
- "Restore starting layers" shows in the tree footer only when Everything, Selected or Hovered has
  been deleted.
- Rows drag to reorder; dropping on a folder's middle moves a row in; a split child moves only among
  its siblings; pinned rows stay in their band. The tree reports moves through `onMove`; the app
  owns the data.

---

## 6. Right panel: what every row shares

```
+------------------------------------------+
| [Style] [Values]                          |
| (icon) Degree               (pin)(lk)(...) |
+------------------------------------------+
| Which elements                             |
|  Every node                    77 nodes    |
+------------------------------------------+
| Shape                                  [+] |  dimmed
| Visibility                             [+] |  dimmed
| Text                                   [+] |  dimmed
| Fill                                   [+] |
|  [ramp] degree       [set] (eye) (-)       |
|  [=========================]               |
|  1                              36         |
|  Painted over by Louvain                   |
| Rendering                              [+] |  dimmed
+------------------------------------------+
```

- **Tabs:** Mantine `Tabs`, pill variant, Style and Values, on every row kind; the choice persists
  across rows for the session.
- **Header:** type icon, name (`InlineRename`), pin mark when pinned, lock `ToggleIconButton`, and a
  "..." ghost `ActionIcon` opening the row menu.
- **Which elements:** a `ControlSection`; at rest the rule in words (`ProseBlock`) and a match count
  ("77 nodes, 254 edges", the zero half dropped). Clicking the words edits in place: a `StyleSelect`
  for the kind of rule (Everything, Where a value..., Top N by..., Named elements, Members of a set,
  Selected elements, Hovered element) and its fields (`ComboInput` for the value, `StyleSelect` for
  the comparison, `TextInput` or `StyleNumberInput` for the operand); "+" on the section adds an
  "and" condition.
- **Sections:** the union of what the rule can match, in the fixed order. Where one section holds
  both kinds, rows name theirs ("Node color", "Edge color").
- **Placeholders** in empty controls show the floor ("Default: icosphere"), so the reader knows
  what off falls back to.

---

## 7. Right panel per row kind

Sections not listed are dimmed titles with "+".

### 7.1 Everything (pinned bottom)

- Which elements: "Every node and edge", "77 nodes, 254 edges".
- Shape: Shape `StyleSelect` "Icosphere"; Size `StyleNumberInput` "1".
- Fill: Node color `CompactColorInput` "5B8FF9".
- Stroke: Edge color "BBBBBB", Edge width "1 px". The section's `AdvancedButton` opens Line
  settings (pattern `StyleSelect`, pattern count, curved `Switch`), all neutral, so none show at
  rest.
- Values tab: matched counts (`MetricRow`); painted counts per property as `DataRow`s ("Node color:
  0 of 77", because Louvain paints every node; "Edge width: 0 of 254"); values read: none.

### 7.2 Selected (pinned top)

- Which elements: "Selected elements", "2 nodes" (this view's count).
- Shape: Size `StyleNumberInput` "x 1.5" (Multiply).
- Stroke: Edge width "x 2" (Multiply): a selected edge keeps its color and thickens.
- Effects: Outline entry "0D99FF" (Replace; "Add a ring" disabled with its reason).
- Everything else dimmed with "+": a selection can take a label, a shape or a glow as any layer can.
- Behind disclosure: Combine in each row's menu.
- Values tab: values read, is selected (this view only); the selected elements as `DataRow`s, each
  focusing its element; painted counts.

### 7.3 Hovered (pinned top)

- Which elements: "Hovered element", "1 node" or "None now".
- Text: Tooltip row, a label entry with source pill "name"; its settings hold the tooltip look.
- Effects: Glow entry "FFD54F"; settings: Strength 1.
- Values tab: values read, is hovered (this view only); the hovered element or "Nothing hovered";
  painted counts while something is hovered.

### 7.4 Louvain (split parent)

- Which elements: "Every node", "77 nodes".
- Split by: Value `VariablePill` "group, Louvain"; Fill scheme `StyleSelect` "Okabe-Ito" with its
  swatch strip. The section's `AdvancedButton` opens the categories popover without its Split
  button; the header menu has Unsplit.
- Fill: Node color, derived: pill "group, Louvain", six chits, Community 3's with an override dot;
  note "Mixed: 1 community changed".
- Effects: dimmed. A glow added here reaches every child; varied by group it takes the scheme.
- Behind disclosure: overflow, Other threshold, order, combine.
- Values tab: values read, group from Louvain, with when it ran and whether it is out of date;
  group sizes as `DataRow`s (chit, name, `RankChip` count, largest first); Other's share when
  present; after a re-run, the matching report ("Community 7 is new; 1 not matched"); painted counts.

### 7.5 Community 3 (split child)

- Header menu: Follow parent for everything.
- Which elements: "Louvain's nodes where group is 3", "12 nodes", the parent's part in secondary
  text; not editable on the child.
- Fill: Node color "CC79A7" in primary text (an override); its row menu has Follow parent.
- Effects: Glow entry "CC79A7", on this child only.
- Other sections show the parent's value in secondary text where the parent writes one, else are
  dimmed: a child takes any property, not only those the parent derives.
- Values tab: members (count and a searchable `DataRow` list, each focusing its node); share of the
  graph; how it was matched on the last re-run; painted counts.

### 7.6 Degree (gradient)

- Which elements: "Every node", "77 nodes".
- Fill: Node color, derived: pill "degree" (ramp glyph); `RampRow` "Yellow-orange-brown", "1" and
  "36" at its ends; note "Painted over by Louvain", a link selecting Louvain.
- Behind disclosure: the ramp popover (histogram, palette with Reverse, scale Linear, domain Auto,
  no clamp, No value Skip, Replace). Choosing Log adds "Log scale" to the row and the legend.
- Values tab: values read, degree, with when it ran; a histogram on log-log axes, since degree is
  heavy-tailed, with zero-degree nodes counted beside it (`HistogramRow`); minimum, median, maximum
  (`MetricRow`); painted counts ("Node color: 0 of 77, painted over by Louvain").

### 7.7 Route Valjean to Javert (path)

- Which elements: "Nodes and edges on the route", "5 nodes, 4 edges".
- Text: a label entry, pill "step, route", Size 36 px, Position top right.
- Fill: Node color "D55E00".
- Stroke: Edge color "D55E00"; Edge width "3 px".
- Ends: Head entry, kind "Normal"; its settings show Color empty, "Line color".
- Values tab: values read, on route and step; the route as numbered `DataRow`s (1 Valjean ... 5
  Javert); its length and total weight; painted counts.

### 7.8 Edge betweenness

- Which elements: "Every edge", "254 edges". Node-only sections are absent.
- Stroke: Edge width, derived: pill "betweenness" (steps glyph); From 1 px To 6 px; note "5 steps".
- Behind disclosure: the ramp popover, with Steps shown because width is drawn in steps.
- Values tab: histogram with the five step bounds and the count per step; minimum and maximum;
  painted counts ("Edge width: 250 of 254", the route and the selection cover the rest).

### 7.9 Key people (hand-made layer)

- Which elements: "Named nodes: Valjean, Javert, Cosette, Marius, Fantine", "5 nodes".
- Shape: Shape "Octahedron"; Size "2".
- Text: a label entry, pill "name", Size 48 px, Position bottom center; the section's "+" disabled
  with the one-label reason.
- Nothing on it says it was made by hand; every control matches a run's layer.
- Values tab: "5 of 5 named nodes found"; labels: 5 labeled, 5 drawn, none hidden by overlap;
  painted counts.

### 7.10 Annotations (folder)

- Header: folder icon, name, lock, "..." (Rename, Ungroup, Move, Delete). No property sections.
- Contents: a `ControlSection` listing its rows in paint order as `DataRow`s with their own eye
  `ToggleIconButton`s; a name selects that row.
- Colors painted: up to 3 `ColorSwatch` chits and "+N"; each names the layer painting it and
  selects it. Never edited here.
- Values tab: the values its layers read, each with the reading layer ("degree: Top 10 labels").

### 7.11 A new layer (draft)

The state Add layer opens: name in rename; Which elements open and focused on the kind of rule,
never defaulted to everything (it would cover every layer beneath); every property section dimmed,
with one line "Choose which elements, then set a property"; the Values tab disabled until the rule
is set.

---

## 8. What the mock draws that graphty-element cannot draw today

Each is drawn and marked in the mock, and each is an additive change to graphty-element. The
model's breaking pieces (selection and hover as layers, a run's layer going on top, lock as a
reader's flag, one layer painting both kinds) are recorded in `design/ui/unified-style-layers.md`.

| The mock shows                                          | graphty-element needs                                       |
| ------------------------------------------------------- | ----------------------------------------------------------- |
| Selected and Hovered reading is selected and is hovered | those two values, scoped to a view                          |
| Folders, pins, locks on any row                         | folders, pins and a lock flag in the stack                  |
| Split parent and children with overrides                | split by value, children matched across re-runs             |
| Combine words                                           | a combine mode on each property write                       |
| The per-property eye                                    | a paused flag on a property write, saved with the layer     |
| A second label entry (disabled)                         | label slots keyed by name, with a combine mode and stacking |
| Label size, color, background varying (disabled)        | those look fields as properties that take bindings          |
| A number format on a label                              | a number format on text bindings                            |
| Shape schemes                                           | named shape lists, distinct shapes first                    |
| Keep on re-run; Values not listed: Skip                 | a pinned domain; the unmapped option on value tables        |

The mock never shows a badge and a name on one node, stacked rings, an outline width or an edge
tooltip: none can be drawn, so none has a control.

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

- The layer model: `design/ui/unified-style-layers.md` (branch `docs-unified-style-layers`).
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
