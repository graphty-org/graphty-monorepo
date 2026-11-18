# Style panel v2: design

The Style panel is the right-hand panel of the graphty app that edits one style layer (Everything, Hovered,
Selected, Hubs, or any layer a reader adds). This is its next version, built in the graphty app behind a feature
flag (section 10). It replaces the panel body only; the layer tree, selection workspace, layer menu and every
value picker stay.

Rules that hold throughout, from the owner:

- The panel holds controls only: no pills, chips, badges, captions, sentences, warnings, counts or "from X"
  markers, in the panel, its popovers or its lists (issue #8739). Tooltips carry names only.
- It shows only what the layer sets. An unset control is empty: no placeholder, gray default or inherited value.
  It never says where a value comes from or how layers stack.
- No special layers. Everything, Hovered, Selected and Pinned open this same panel with the same controls.
- Graph-wide settings are **Graph** ("Graph settings"), never "Scene" or "World", in every name and option.
- The look is the app's: compact-mantine (locked to Figma, unchanged) and `graphty/src/workspace/style/`.
  Section and thing names and what each thing holds are `style/parts/parts.ts`'s; shape, arrow and pattern
  glyphs, `ValueListbox` rows, the by-data link and every picker are today's. Nothing the app already draws is
  redrawn. An icon is reused only for the same meaning.

## 1. The owner's round 4 points, answered

1. **Massive lists**: a popover opens on its main settings; other groups are added with its "+" (2.6). Value
   lists show one section at a time (8).
2. **Switch to** keeps the row and shared settings; every member lists every other (5).
3. **Calmer**: no collapsing, tabs or eyes; `ControlSection`'s rule between sections, as Figma; by-data in the
   settings popover (2.6); counted in 3. Swipe to delete is rejected: no mouse affordance, it collides with
   number scrubbing, and Figma uses "-".
4. **"+" on each section header**, above what it adds. **Every section or only used ones**: both, a reader
   preference (11). **A control rubric**, icons required wherever an option can be pictured (6).

## 2. Panel anatomy

### 2.1 Header (unchanged)

The layer name and menu, "Style Nodes..." / "Style Edges...", the node / edge tabs, the Find a setting box
(key "/") and saving and loading styles stay as today. Find gains aliases in
`parts/aliases.ts` (arrow -> Target end, name -> Label, hide -> Visibility).

### 2.2 Grids and widths

| Line    | Grid                                                          | Control width, panel 240 (`PANEL_MIN`) / popover 264 (`SettingsPopout`) |
| ------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Named   | `.ws-field`: 16 gutter, 80 name, control, 24, 24              | panel 96, popover 120                                                   |
| Unnamed | `.ws-field:not([data-named])`: control spans name and control | panel 176, popover 200                                                  |

The two trailing slots keep today's `.ws-field` order on every line, panel and popover alike: slot one is the
line's modifier (settings on a thing row; by-data link, lock or sides toggle on other lines), slot two is "-".
"-" is always the far right.

A **pair** (X | Y, W | H, near | far) is two `ComboInput numeric` fields in a Mantine `Group grow` in a named
line's control slot (88 each in a popover unnamed line), with no new CSS. Each field's `glyph` slot holds its
letter (X, Y, W, H), which scrubs. Clearing one field (empty, Enter) unsets its channel; "-" unsets both.

**In-field glyphs.** Letters X, Y, W, H only in geometry pairs; `GLYPHS.weight` (lucide `Weight`) in every stroke
width (border, rings, outline, line, label border, outline width). Other number fields carry no glyph; their
line's name names them and they step as today's `Field` number lines do. A name over 80 px truncates with an
ellipsis; its tooltip is the full name.

### 2.3 Section

The existing `ControlSection`, `collapsible={false}`, `hasConfiguredValues={false}`. An empty section uses its
`empty` and `onAdd`: the 40 px header, Figma's empty state, whose title also adds. A section with one item
(Visibility) adds it directly; otherwise `onAdd` and the header "+" open `AddButton`, which gains a `groups` prop
drawing `Menu.Divider` between groups. A one-only thing leaves the menu once set; a disabled item shows its name
only. No menu holds more than 12 items.

Order: Shape, Fill, Border, Text, Effects, Visibility, Order and groups, Shaders (node); Line, Ends, Route, Text,
Effects, Visibility, Shaders (edge). The advanced sections come last.

### 2.4 Thing row

```
| Border    [o 1F2937           100%]  # - |   paint row: color main control
| Width     [w 0.6 ]                     - |   common line (2.5)
| Label     [name               v]     # - |   named row
```

- **Name**: the thing's `parts.ts` name. A thing named by its section (Fill, Border, Shape, Line, Visibility) has
  no name column; its control spans it.
- **Main control** (section 7): a paint-like thing (border, rings, outline, band, effects) leads with its color;
  a geometric thing with its defining value (shape, arrow, route, zIndex). A family row shows the current
  member's value.
- **Settings** (`GLYPHS.sliders`, drawn `#` in wireframes): opens the settings popover. It takes today's set state
  (accent) when the popover holds a set line. Clicking the row's name opens nothing (ledger 19).
- **Remove** ("-"): removes the thing and every setting it has on this layer.
- **Off**: a thing switched off on this layer (2.6) draws its main control as a read-only field reading "Off",
  which opens the popover. Nothing is dimmed for it.
- **Bound**: a main value bound to data draws as the field with the column name as its value and `GLYPHS.link`
  in its glyph slot; no pill, no summary line. Clicking it opens `BindingPopover`. Pressing "=" in a field opens
  the value picker (a key, not a button).
- **Hover** keeps today's `highlightStyle` on the graph.

### 2.5 Common lines

Each thing names at most two **common** settings (section 7). They show under the thing row from the moment it
is added, as named lines (a color as an unnamed full line), empty until written; a value written shows "-". They
live only in the panel, never again in the popover. Nothing above them moves when one is written.

### 2.6 Settings popover

`SettingsPopout` (264 px) beside the panel at the row's height; closes on outside click and Escape. Pickers
opened from it are plain `Popout`s (SettingsPopout refuses nesting).

- **Header**: the thing's name. The popover's "+" (`AddButton`), listing the thing's sub-groups not shown yet
  (at most 12), sits on the Main legend: compact-mantine's `Popout` header actions are icon buttons with an
  `onClick` and cannot hold a menu, and compact-mantine is locked to Figma. Main draws no legend when it holds
  no lines and there is nothing to add.
- **First lines**: the family's **Switch to** strip (section 5), or for a switchable non-family thing a **Show**
  line (R8 On / Off) writing its dedicated off field (10.2); then **By data** for the main value; then
  **Combine** (R8f Replace / Multiply / Add, today's `COMBINE_WORDS` in `words.ts`) on number lines only.
- **Main** sub-group: always shown, with its lines empty until written.
- **Other sub-groups**: a `ControlGroup` legend with "-" (unsets every line in it) over at most 8 lines. A
  sub-group shows when it holds a set line or the reader adds it from "+". Adding a switchable sub-group (text
  shadow, box shadow, pointer) writes its on field; it has no "On" line.
- **Lines**: unset, the control drawn empty (an empty field, an unchecked checkbox, a segment line with nothing
  selected, `value=""`), with no "-"; writing a value sets it and shows "-". A set boolean unchecked writes
  `false`; "-" unsets it. A location line draws only its segments until written (R2).
- **Depth**: panel, one popover (settings, or `BindingPopover` in its place, with Back), one picker beside it.
  No tabs. The popover opens scrolled to its first set line; height follows content, capped at the viewport.

## 3. Marks, counted

Every hit target counts. Numbers have no caret. Budgets: an empty layer at most 8; the default Everything node tab at most 26; at most one caret a section.
"-" stays visible on every set line, never on hover only, since every set value needs a visible way to unset it
(ledger 21, 36).

| Layer                                | Shown                                                   | Marks                                                                                                    |
| ------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Empty layer, every section           | 8 empty headers                                         | 8 "+"                                                                                                    |
| Empty layer, used sections only      | "Add section"                                           | 1                                                                                                        |
| Everything, node tab                 | Shape + Size; Fill; Border + Width; Label + Size, color | 8 "+", 4 rows x 2, 4 "-" on common lines, 2 carets (shape, label source), 3 swatches, 1 weight glyph: 26 |
| "color by community, size by degree" | Fill (bound), Shape + Size (bound)                      | 8 "+", 2 x 2, 1 "-", 1 caret, 2 links: 16                                                                |

## 4. Sections and things

Names and contents are `parts.ts`'s. One move: **Fit to label** (`node.labelFit*`) moves to the Shape popover's
Size sub-group, since it sizes the shape and overrules Size (`x-size-labelfit`).

### 4.1 Node tab

| Section          | "+" menu (dividers between groups)                                               | Cardinality                                                |
| ---------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Shape            | Shape (family: Basic shape / Model / Sticker / Mandala / custom replace shaders) | one                                                        |
| Fill             | Fill (family: Solid / Gradient / Picture) -- Image -- Pie, Stripes, Chart        | one each                                                   |
| Border           | Border -- Rings, Raised edge, Outline, Inner lines                               | one each                                                   |
| Text             | Label -- External label, Tooltip -- Glyph, Record                                | Label one (many after list-valued labels, 7.4); others one |
| Effects          | Drop shadow, Glow, Halo -- Underlay, Overlay                                     | one each                                                   |
| Visibility       | (added directly)                                                                 | one                                                        |
| Order and groups | Order -- Group -- Group outline                                                  | Group outline many, up to the element's cap                |
| Shaders          | Around -- Material -- Custom shader (`ShaderEditorDialog`)                       | Material one; Around up to the element's cap               |

- **Fill family** follows `x-fill-mode`. **Image** (`node.image*`) is not a member: the element draws it over the
  fill, so it is its own row, and a Solid color it hides dims (`x-picture-hides-fill`).
- Shader places (catalog): replace (Sticker, Mandala: Shape members), around, paint (Material). "Around" disables
  in the "+" menu once the element's cap is reached, read from the element (10.2), never copied. "+" items open
  `ShaderGallery` filtered by place; a use's place changes in its popover.
- **Multiples are named by what tells them apart**: Group outline "{shader} by {field}" (name column the shader,
  main control the field); Annotation by kind and text (kind alone when it has no text); shader uses by preset.

### 4.2 Edge tab

| Section    | "+" menu                                                          | Cardinality              |
| ---------- | ----------------------------------------------------------------- | ------------------------ |
| Line       | Line (family: Solid / Gradient) -- Band -- Outline                | one each                 |
| Ends       | Target end, Source end -- Middle target end, Middle source end    | each once                |
| Route      | Route -- Bundling                                                 | one each                 |
| Text       | Label -- External label, Record -- Target caption, Source caption | as node                  |
| Effects    | Underlay, Overlay                                                 | one each                 |
| Visibility | (added directly)                                                  | one                      |
| Shaders    | Along -- Material (Fiber) -- Custom shader                        | Along many; Material one |

Rows and menu use the same `parts.ts` names. Pattern, fade, lift, flow and blending stay Line settings; ports and
node gaps stay Route settings. Edge **Record** holds the label table (`edge.labelTable`).

### 4.3 Graph settings

Opened from the tree footer button "Graph settings"; v2 switches in both `case "graph"` branches of
`inspector/Inspector.tsx` (`headerOf` and `bodyOf`). Every change below is in v2's branch only.

| Thing (the style model's Graph things) | Home and change                                                                                                                                                                                                                                                   | Writes                                                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Background                             | One row, family Color / Sky (5); Sky opens `PicturePopover`. No `drawnIn` caption or sentence. Keep on import (R7)                                                                                                                                                | today's keys                                                                                           |
| View (Canvas section)                  | `ControlGroup`s: **View** lighting, rotation (R5, degrees; 2D, dims in 3D), highlight color (R1). **Framing** extent (R8 Drawn / Centers, unnamed line), padding (R5). **Marks** same size at any depth (R7), node outline width (R5), smallest mark node \| edge | `styles.setHighlightColor`, `viewRotation`, `framing.*`, `behavior.node.outlineWidth`, `minMarkSize.*` |
| Labels                                 | sample cell (R5); label text (R9 Canvas / Glyphs)                                                                                                                                                                                                                 | `behavior.labels.*`                                                                                    |
| Shaders                                | as today                                                                                                                                                                                                                                                          | -                                                                                                      |
| Annotations (new)                      | "+" adds one (many). Row: kind (R9); popover lines by kind: text R14, font R13, fill and border R1, arrow ends R10, picture R16, position X \| Y                                                                                                                  | `session.annotations`                                                                                  |
| Map                                    | the Layout panel's map fields, unchanged                                                                                                                                                                                                                          | -                                                                                                      |
| Layout motion                          | the Layout panel's `TransitionRow`, unchanged                                                                                                                                                                                                                     | -                                                                                                      |

View mode stays in the toolbar.

**Not built yet** (the flag stays on until they are): Annotations wait for graphty-element's annotation units
(10.2); Map and Layout motion stay in the Layout panel; the label sample cell, label text and node outline width
are `behavior.*` settings the app writes as reader preferences through `ElementHost`, so each needs its
preference and element attribute wiring before Graph settings can show it.

### 4.4 Layer-wide

- **Applies to**: the existing selection workspace.
- **Vary by data**: 2.4, 7.5. **Combine**: 2.6. The number field shows today's combine prefix glyph only when the
  value is not Replace.

## 5. Switch families and exclusions

A family is a thing whose members the element draws one at a time in one slot. Members and the channels each
owns come from the element's exclusion data (10.2), never from `parts.ts`.

| Family             | Member-owned                                                                                                                                           | Thing-wide (kept through every switch, shown in every member)                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Shape              | Basic shape: `node.shape` and its shape-only settings (corners, points, mesh detail, `shapeParts`); Model: `node.model*`; each replace shader: its use | size, width, height, sizeMode, sizeSpace, depth, shapeRotation, Finish (wireframe, flat, unlit), labelFit* |
| Fill               | Solid: `node.color`; Gradient: `node.gradient*`; Picture: `node.texture`                                                                               | `node.opacity` (in R1 for Solid; an Opacity line for the others)                                           |
| Line               | Solid: `edge.color`; Gradient: `edge.gradient*`                                                                                                        | width, opacity, pattern, fade                                                                              |
| Label look         | each look: `look`                                                                                                                                      | every other label field                                                                                    |
| Group outline      | Bubble, Hull                                                                                                                                           | groupBy                                                                                                    |
| Background (graph) | Color: `backgroundType`; Sky: `data`                                                                                                                   | `color`, `shader`                                                                                          |

**Switch to** has one look and one place for every family: the first line of the thing's settings popover, a
`SegmentedControl` of the members (icons when every member can be pictured, else words; an R9 select named
"Switch to" when they fit neither), apart from any value list. Every member lists every member; a member gated
by a flag (Picture with node-models off) or the view (Model in 2D) is disabled, never hidden, and the current
member is always enabled. A thing with an off field adds an **Off** member (Shape: none).

1. **Same row, same settings.** The row keeps its place, height and name; thing-wide lines stay in every member.
   Clicking a member that needs a pick (Model, Picture, Sticker, Mandala, Sky) opens its picker beside the
   popover; the row keeps the old member until the pick; Escape changes nothing; the pick removes the leaving
   member's own channels and writes the new member in one `session.transaction`. Others switch at once.
2. **Symmetrical.** While the selected row id stays the same, the panel holds each left member's values as UI
   state, like an unsent draft, and switching back writes them: Basic shape (star, rounded) -> Sticker -> Basic
   shape gives the star with its corners. Once the selected row id changes, switching back writes the member's
   start (5.1). Undo reverses each switch in one step, so the star is always one undo away.
3. **Shared**: Model's popover shows `node.shape` as **Fallback shape** (`x-shape-model`); switching to Model
   keeps it.

### 5.1 Starting writes

| Thing or member                                           | On add or switch                                                                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Basic shape, Solid, Border, ends                          | today's `AddButton` values                                                                                                               |
| Gradient (node, edge)                                     | two stops: the current color (or today's default) to white                                                                               |
| Model, Picture, Image, Sticker, Mandala, Sky, shader uses | opens its picker; writes on pick                                                                                                         |
| Label, External label, Tooltip, captions                  | nothing: an empty row (empty source = every label, 7.4) that stays until set or removed; its source control opens the text-source picker |
| Halo                                                      | `on: true` and today's color                                                                                                             |
| Drop shadow                                               | color and `opacity: 0.5`                                                                                                                 |
| Underlay, Overlay                                         | color and `opacity: 1`                                                                                                                   |
| Pie, Stripes, Inner lines, Record                         | the popover on its list; writes the first item                                                                                           |
| Chart                                                     | `kind: "bar"`, then the values picker; writes on pick                                                                                    |
| Annotation                                                | `kind: "text"` at the view center                                                                                                        |

### 5.2 Exclusions that are not families

Within one layer only, the overruled or dependent line dims, its tooltip naming the winner; other layers never
dim anything. Dimming means only this.

| Exclusion                                                                                                                                                                                                                                                                                                                             | Treatment                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x-picture-hides-fill`, `x-model-gradient`, `x-size-labelfit`, `x-table-cell-picture`, `x-edge-fade-gradient`, Record vs labels, Material vs a replace shader, drawn patterns vs outline / underlay / overlay / gradient / fade / taper, edge blending vs opacity and fade, arrow `position` / `gap`, caption `distance` / `location` | dim the overruled line                                                                                                                                          |
| `x-size-extents`: width, height or depth replace size on their axis unless Relative to size is on                                                                                                                                                                                                                                     | dim Size when all three axes are overruled; dim nothing per axis (one field)                                                                                    |
| `x-edge-path-kind`: lift > bends > route > Bundling > fanned > bow > curved                                                                                                                                                                                                                                                           | dim every line it overrules, across Line (lift), Route and Bundling                                                                                             |
| `r-forcecurve-curved`, Fit to label needs a Label, border needs a shape other than none, pattern needs width > 0, flow needs the solid pattern and the straight route                                                                                                                                                                 | dim the dependent line                                                                                                                                          |
| `x-view-2d-3d`: Order (2D), Model, lift, flow, flat, unlit, graph rotation (2D)                                                                                                                                                                                                                                                       | dim in the other view; never removed, never reordered                                                                                                           |
| `x-chart-kind`                                                                                                                                                                                                                                                                                                                        | the lines follow the kind (`appliesWhen`)                                                                                                                       |
| `x-bend-arc`                                                                                                                                                                                                                                                                                                                          | bendCurve's "arc" option disabled with 2 or more bends                                                                                                          |
| `x-edge-paint-shader`                                                                                                                                                                                                                                                                                                                 | Material disabled in edge place once one paint use exists                                                                                                       |
| `x-value-binding-combine`                                                                                                                                                                                                                                                                                                             | a value, a binding, a combine or off: writing one replaces the others in one transaction                                                                        |
| Competing settings of one quantity (below)                                                                                                                                                                                                                                                                                            | the number field plus a **Unit** line (R8 / R8f) in the popover; changing the unit moves the value: writes the new channel, removes the others, one transaction |
| `x-binding-stops`                                                                                                                                                                                                                                                                                                                     | stops editor replaces palette and range (7.5)                                                                                                                   |

Unit writes: border Graph `width` / Screen `screenWidth`; group padding px `padding` / % `paddingRatio`; label
size Graph `size` / Screen `sizePx` with `sizeMode: "screen"` / Letter `letterSize` (each removes the other two
and `sizeMode`); label padding Text `padding` / Box `boxPadding`; shape size Graph / Pivot / Screen `sizeSpace`.

## 6. Control rubric

Widths from 2.2. Panel main controls sit on panel lines (96 named, 176 unnamed); popover lines are 120 named, 200
unnamed. An icon segment needs 28 px; a word segment 7 px a letter plus 16, at least 40. Pick the first rule that
matches.

**Pictured.** An option can be pictured when `GLYPHS` or lucide-react has a glyph of the same meaning, or the option
is a direction, side, alignment or geometric kind. When every option of a setting can be pictured, icons are
required, not permitted. One exception: an icon set may end in a single "Auto" word segment.

| #    | When                                                                                    | Control                                                                                                                                                                                                                              |
| ---- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1   | A color (with opacity)                                                                  | `CompactColorInput`, always a full line                                                                                                                                                                                              |
| R2   | A label, tooltip or caption location                                                    | R8f Outside / Inside / Auto, then `AlignmentMatrix` once written (Auto disables it); values from the location descriptor (10.2)                                                                                                      |
| R3   | A family member                                                                         | Switch to (section 5)                                                                                                                                                                                                                |
| R5   | A number                                                                                | `ComboInput numeric`, `options={[]}`, no caret; two related numbers as a pair; opacity in percent                                                                                                                                    |
| R5b  | A number with named presets                                                             | `ComboInput` with the presets as options: font weight (Regular, Bold, or 1-1000) everywhere; mesh detail (Full, Low, or a number)                                                                                                    |
| R6   | A boolean modifying its line, with a glyph of the same meaning                          | `ToggleIconButton` in the line's modifier slot: keep ratio (`lock`); italic (lucide `Italic`) on the font weight line; sides (new `sides` glyph) on padding                                                                          |
| R7   | Any other boolean                                                                       | `Checkbox` with its name                                                                                                                                                                                                             |
| R8   | 2 to 6 exclusive options fitting the line where they sit                                | `SegmentedControl`, icons when pictured, else words                                                                                                                                                                                  |
| R8f  | The same, fitting only a popover full line (200)                                        | `SegmentedControl` on an unnamed popover line under its sub-group legend; popovers only                                                                                                                                              |
| R9   | Up to 12 options, without pictures, fitting neither                                     | `PanelField kind="select"`                                                                                                                                                                                                           |
| R10  | Options with pictures (catalog glyphs, or lucide glyphs named in the option-name table) | Existing `ValueListbox`: today's rows and glyphs, one section at a time (section 8), search placeholder "Search"                                                                                                                     |
| R11  | 13 or more options without pictures                                                     | `PanelField` with `{ group, items }` data                                                                                                                                                                                            |
| R12  | A data field or text source                                                             | The existing attribute picker / `ValuePicker`                                                                                                                                                                                        |
| R13  | A font                                                                                  | The existing font list                                                                                                                                                                                                               |
| R14  | Free text                                                                               | `TextInput size="xs"`, commits on Enter or blur                                                                                                                                                                                      |
| R15  | An ordered list                                                                         | Popover only: list editor, "+" on its legend, "-" per line, drag grip on hover; `GradientEditor` for stops                                                                                                                           |
| R15r | A list thing's row control                                                              | A read-only strip of its swatches (Pie, Stripes) or its first item; opens the popover on the list                                                                                                                                    |
| R16  | An asset or shader parameters                                                           | `PicturePopover` / `ModelsPopover`; `ShaderParamRows`                                                                                                                                                                                |
| R17  | A set of sides                                                                          | Four `ToggleIconButton`s with `GLYPHS` `arrowUpToLine`, `arrowRightToLine`, `arrowDownToLine`, `arrowLeftToLine` on one line; per-side numbers come from R6 sides, whose top \| right and bottom \| left pairs carry the same glyphs |

**Glyphs.** New `GLYPHS` entries come from lucide-react (as `glyphs.ts` imports it): `weight`, `italic`, `sides`, and
those the option-name table names for the icon settings below. Catalog shape, arrow and pattern glyphs are never
redrawn. Display names and glyph names come from the app's option-name table beside `optionGlyphs`; a test fails
on any option label "Scene" or "World".

**Fit results** (formula above; checked against where each control sits):

| Rubric              | Settings (width)                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R8 icons            | textAlign (84), iconPosition, stripes direction, gradient kind Linear / Radial (56), border position and labelBorderAlign Inside / Center / Outside (84), arrow side (84), repeat None / Both / X / Y (112), route Straight / Arc / Great circle (84, panel row)                                                                                                   |
| R8 words, 120       | shiftOf and gapOf Box / Words (91), declutter Degree / Size (102), labelFit Inside / Bounds (116), modelCenter Bounds / Origin (116), supportScale Unit / Drawing (109), clip (88), Unit Graph / Screen (109), px / % (80), Text / Box (84), overflow (95), Show On / Off (80)                                                                                     |
| R8 words, panel 176 | Visibility Shown / Hidden (109), framing extent Drawn / Centers (116)                                                                                                                                                                                                                                                                                              |
| R8f, 200            | sizeMode (188), shader place (160), edge place Material / Along (123), location (167), mapping (142), box (167), lineBox (146), runAlign (195), supportModel (179), autoSize (165), modelFit Contain / Stretch (130), modelDoubleSided (124), Combine (177), label Unit Graph / Screen / Letter (167), unmapped (123), pointerDirection four arrows and Auto (152) |
| R9                  | imageFit (204), modelTint, badge, animation, label text Canvas / Glyphs (116, on a 96 named panel line), paddingOf, modelSourceUp, modelAnimation, Bundling row's supportModel (179 over 176)                                                                                                                                                                      |
| R10 lucide          | chart kind, bendCurve                                                                                                                                                                                                                                                                                                                                              |

`ControlGroup` is used in popovers and in Graph settings' View section. v2 popover-page files join the `ignores`
list of `graphty/style-sidebar-controls` in `graphty/eslint.config.js`, as `BindingPopover.tsx` does; the rule's
`files` gain `inspector/GraphSettings*`. `__tests__/v2-widths.test.ts` computes every R8 width from the
option-name table and fails when one passes the width where it sits.

## 7. The rubric applied

Ids are graphty-element channel names (`node.` / `edge.` omitted) and `labelStyle` fields. "Row" is the main
control; "Common" the panel lines (2.5); "Main" the popover's always-shown sub-group; "Name: a, b" a sub-group
added with "+"; "|" a pair.

### 7.1 Node

| Thing                          | Row                          | Common      | Popover                                                                                                                                                                                                                                                                         |
| ------------------------------ | ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shape: Basic shape             | shape R10                    | Size        | Main: shapeRotation R5, meshDetail R5b, shapeParts R15. Corners (by shape): cornerRadius R5, exactCornerRadius R7, cornerFraction R5, shapePoints R15, shapeStretchPoints R7                                                                                                    |
| Shape: Model                   | model R16                    | Size        | Main: Fallback shape R10, modelTint R9, modelFit R8f, modelCenter R8. Orient: modelSourceUp R9, modelTurn R5, modelDoubleSided R8f. Animation: modelAnimation R9, speed \| offset                                                                                               |
| Shape: replace shader          | preset R10                   | Size        | Main: ShaderParamRows R16; reach, minSize R5                                                                                                                                                                                                                                    |
| (every Shape member)           |                              |             | Size: Unit R8f, sizeMode R8f, shapeRotation R5, width \| height with lock, depth R5, relativeExtents, planar R7. Finish: wireframe, flat, unlit R7. Fit to label: labelFit R8, padding X \| Y, labelFitSquare R7, labelFitQuantum R5, labelFitImage R7, labelFitImagePadding R5 |
| Fill: Solid                    | color R1                     | -           | Main: By data only                                                                                                                                                                                                                                                              |
| Fill: Gradient                 | stops (`GradientRow`)        | -           | Main: kind R8 icons, direction R5 or center X \| Y and radius R5 (by kind), endColor R1, opacity R5                                                                                                                                                                             |
| Fill: Picture                  | texture R16                  | -           | Main: opacity R5                                                                                                                                                                                                                                                                |
| Image                          | image R16                    | Opacity     | Main: imageFit R9, fallback R16. Size: width \| height or pixelSize R5 (by fit), autoSize R8f, imageAspect R6. Place: position X \| Y, offset X \| Y. Tiling: repeat R8 icons, clip R8, smoothing R7                                                                            |
| Pie                            | slices R15r                  | -           | Main: Slices R15 (color, size, opacity). Disc: hole, radius, rotation R5, pieFitBox R7, offset X \| Y                                                                                                                                                                           |
| Stripes                        | colors R15r                  | -           | Main: Stripes R15 (color, size, opacity), direction R8 icons, size R5. Frame: R17                                                                                                                                                                                               |
| Chart                          | kind R10                     | -           | Main: values R12, colors R15, min \| max, horizontal R7 (by kind). Box: size or width \| height, offset X \| Y, margin, gap R5. Strokes: lineWidth R5, borderColor R1, borderWidth R5, backgroundColor R1                                                                       |
| Border                         | color R1                     | Width       | Main: Unit R8, style R10, position R8 icons. Waves (wavy styles): amplitude \| period                                                                                                                                                                                           |
| Rings                          | color R1                     | Count       | Main: width, offset R5, style R10 (10), opacity R5                                                                                                                                                                                                                              |
| Raised edge                    | width R5                     | -           | Main: lightColor R1, darkColor R1                                                                                                                                                                                                                                               |
| Outline                        | color R1                     | Width       | Main: By data only                                                                                                                                                                                                                                                              |
| Inner lines                    | lines R15r                   | -           | Main: Lines R15, lineWidth R5. Halo: lineHaloColor R1, lineHaloWidth R5                                                                                                                                                                                                         |
| Label, External label, Tooltip | text source R12              | Size, color | 7.3                                                                                                                                                                                                                                                                             |
| Glyph                          | char R14                     | color       | Main: size R5, font R13, weight R5b with italic R6                                                                                                                                                                                                                              |
| Record                         | fields R15r                  | -           | Main: Fields R15 (`shapeTexts`: point, text R12). Table: the label table editor R15, cell picture R7, padding R5, font R13                                                                                                                                                      |
| Drop shadow                    | color R1                     | -           | Main: Show, opacity, blur R5, offset X \| Y                                                                                                                                                                                                                                     |
| Glow                           | color R1                     | -           | Main: strength R5                                                                                                                                                                                                                                                               |
| Halo                           | color R1                     | -           | Main: Show (writes `on`), scale, opacity R5                                                                                                                                                                                                                                     |
| Underlay, Overlay              | color R1                     | -           | Main: Show, shape R10 (the element's backdrop shape list), padding, cornerRadius, opacity R5                                                                                                                                                                                    |
| Order                          | zIndex R5                    | -           | Main: drawOrder R5                                                                                                                                                                                                                                                              |
| Group                          | padding R5                   | -           | Main: Unit R8 (px / %), paddingOf R9, includeLabels R7. Min size: minWidth \| minHeight, biasLeft \| biasTop                                                                                                                                                                    |
| Group outline                  | groupBy R12                  | -           | Main: Switch to Bubble / Hull, params R16                                                                                                                                                                                                                                       |
| Visibility                     | shown R8 Shown / Hidden      | -           | Main: By data only                                                                                                                                                                                                                                                              |
| Shader use (Around / Material) | preset R10 (`ShaderGallery`) | -           | Main: place R8f, params R16, reach, minSize R5                                                                                                                                                                                                                                  |

### 7.2 Edge

| Thing                                            | Row                | Common      | Popover                                                                                                                                                                                                                                                                 |
| ------------------------------------------------ | ------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Line: Solid, Gradient                            | color R1, or stops | Width       | Main: opacity, taper, minScreenWidth R5, blending R7; Gradient adds kind R8 icons first. Fade: fadeStart \| fadeEnd, fadeOpacity R5. 3D: lift R5, flow speed R5. Pattern: style R10 (15), patternCount R5, dash length \| gap (dashed), wave amplitude \| period (wavy) |
| Band                                             | color R1           | -           | Main: width, opacity R5                                                                                                                                                                                                                                                 |
| Outline                                          | color R1           | -           | Main: width, opacity R5, style R10 (line-pattern glyphs)                                                                                                                                                                                                                |
| Target, Source, Middle target, Middle source end | arrow R10          | Size        | Main: width R5, color R1, opacity R5, side R8 icons. Open caps (open arrows): outlineWidth R5, fillColor R1. Place: arrowHeadPosition R5, arrowHeadGap R5. Stack: stack R15, image R16                                                                                  |
| Route                                            | route R8 icons     | -           | Curve: curved R7, arcRadius, arcHeight R5 (by route). Fan: fanned R7, fanSpacing R5. Bends: bends R15, bendCurve R10. Gaps: nodeGap R5, source \| target gap. Ports: sourcePort X \| Y, targetPort X \| Y                                                               |
| Bundling                                         | supportModel R9    | -           | Springs: length \| constant, repulsion \| gravity. Curve: supportUnit R5, supportScale R8                                                                                                                                                                               |
| Label, External label                            | text source R12    | Size, color | 7.3                                                                                                                                                                                                                                                                     |
| Record                                           | fields R15r        | -           | as node Record (`edge.labelTable`)                                                                                                                                                                                                                                      |
| Target, Source caption                           | text source R12    | Size, color | 7.3, Position adds distance R5                                                                                                                                                                                                                                          |
| Underlay, Overlay                                | color R1           | -           | Main: Show, padding, opacity R5                                                                                                                                                                                                                                         |
| Visibility                                       | shown R8           | -           | Main: By data only                                                                                                                                                                                                                                                      |
| Shader use (Along / Fiber)                       | preset R10         | -           | Main: place R8f (Material / Along), params R16, reach R5                                                                                                                                                                                                                |

### 7.3 Label, external label, tooltip, caption

Each line is a new `LabelFieldLine` (10.1) writing one `labelStyle` field (`node.labelStyle`, `node.xlabelStyle`,
`node.tooltipStyle`, caption styles); `LabelSettings.tsx` is not used by v2. Each kind shows only the fields
the element says it draws (`drawnBy`, 10.2).

| Sub-group           | Lines                                                                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main (always shown) | Switch to (look: Plain / Card / Dark / Pill / Callout, R9 select); font R13; weight R5b with italic R6; textAlign R8 icons; Unit R8f; location R2                                                    |
| Letters             | lineHeight, rotation, opacity R5; runAlign R8f                                                                                                                                                       |
| Background          | background R1; cornerRadius R5; padding R5 with Unit R8 and sides R6 (splits into top \| right, bottom \| left)                                                                                      |
| Border              | borderWidth R5, borderColor R1, labelBorderAlign R8 icons, lineBox R8f                                                                                                                               |
| Badge               | badge R9, then its kind's lines: icon R14, iconPosition R8 icons; or progress R5; or maxNumber R5, overflowSuffix R14, smartOverflow R7                                                              |
| Position            | attachOffset R5, offset X \| Y, box R8f, onTop R7, shift X \| Y, shiftOf R8, gapOf R8                                                                                                                |
| Pointer             | pointerDirection R8f, width \| height, pointerOffset R5, pointerCurve R7                                                                                                                             |
| Wrap                | width \| maxLines, Break anywhere R7 (`wrapAnywhere`), Cut long lines R7 (`wrapEllipsis`), Ellipsis at max lines R7, keepBlankLines R7, wrapTrailingSpace R7, wrapSkipEndSpace R7, wrapSpaceCount R5 |
| Small               | minScreenSize R5, declutter R8, minNodeScreenSize R5, keepInView R7                                                                                                                                  |
| Outline             | outline R1, outlineWidth R5                                                                                                                                                                          |
| Text shadow         | color R1, blur R5, offset X \| Y                                                                                                                                                                     |
| Box shadow          | color R1, blur R5, offset X \| Y                                                                                                                                                                     |
| Motion              | animation R9, animationSpeed R5, pickable R7, closeButton R7, depthFade R7, near \| far                                                                                                              |

The "+" menu holds the 12 sub-groups after Main. Look is a Switch to (ledger 47).

**By data on a label field** binds the field's flat channel (`node.labelColor`, ...) where the element has one,
while `set` writes `labelStyle`; fields without one get By data from per-field encoding (10.2).

### 7.4 Several labels

Zero, one or many labels per node or edge needs list-valued labels in graphty-element (10.2), a prerequisite
before v2 leaves its flag (ledger 41, 42). Contract: each label has a stable `id` the element assigns on add; a
layer addresses one label by `id` and merges per field (`mergeLabelStyle`); the save format is the list of
`{ id, text, location, ...style }`; today's single label loads as id `label`.

- The text-source picker (R12) lists "In this graph" labels above the data fields; picking one addresses its
  `id` (Hubs picks "name (top)" and restyles that label only); picking a field adds a label.
- A Label row with no text source applies to every label of the matched nodes, so restyling needs no key.
- Rows are named by their text, with the location added ("name, top") only when two rows share a text; an empty
  row is "Label".
- Before the element change, v2 builds on today's single `labelStyle`: Label stays in the "+" menu, disabled while
  set, and the multi-label naming is not built.
- External label and Record stay separate: the element draws them by other rules (`xlabel`, `shapeTexts`).

### 7.5 Vary by data (`BindingPopover`)

One page, opened in place of the settings popover with Back. The field's type picks the starting mapping, as
today. Its pickers (field, palette, colors) are the one picker beside it.

| Sub-group                      | Settings                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Main                           | by R12; mapping R8f (Range / Stops / Map); palette R10 or colors R15 (Range, Map); range min \| max (Range); stops R15 (Stops) |
| Map ("+")                      | map R15, otherwise (the bound setting's control), unmapped R8f                                                                 |
| Scale ("+", numeric fields)    | scale R9, domain min \| max, clamp R7, reverse R7, midpoint, exponent, bins R5                                                 |
| Overflow ("+", numeric fields) | other, overflow R8, missing, choices R15, format R9, hidden R15                                                                |

## 8. Sections for long value lists

An app table beside `optionGlyphs`, keyed by value id, read from the element's descriptor options. `ValueListbox`
(behind a `sections` prop only v2 passes) shows "In this graph" first, then a section filter (R9 of section
names, defaulting to the current value's section), then that section's rows only: at most 12 rows at a time.
Search covers every section. The section order is the same in 2D and 3D. A test fails when a value is in no
section, a section passes 12, or a count differs from the element's descriptor. Lists of 12 or fewer get none.

| List                     | Sections                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Node shape               | Basic (with none), Polygons, Rounded, Symbols, Round solids, Polyhedra, Prisms and pyramids |
| Underlay / overlay shape | the element's backdrop list, flat sections only                                             |
| Arrow                    | Filled, Open, Bars and barbs, Strokes, Special                                              |
| Edge line pattern        | Lines, Shapes, Waves, Slashes, Arrows                                                       |
| Palette                  | Sequential, Categorical, Diverging                                                          |
| Shaders                  | by place (4.1); Material in `ShaderGallery`'s categories                                    |

## 9. Wireframe: the Everything node tab

`v` caret, `-` remove, `#` settings (`GLYPHS.sliders`), `+` add, `w` weight glyph.

```
+------------------------------------------+
| (header unchanged)                       |
| Shape                                  + |
| [<> Rectangle               v]    #  -   |
| Size      [1.0          ]            -   |
|------------------------------------------|
| Fill                                   + |
| [o 6366F1                100%]    #  -   |
|------------------------------------------|
| Border                                 + |
| [o 1F2937                100%]    #  -   |
| Width     [w 0.6        ]            -   |
|------------------------------------------|
| Text                                   + |
| Label     [name             v]    #  -   |
| Size      [14           ]            -   |
| [o 111827                100%]       -   |
|------------------------------------------|
| Effects                                + |
| Visibility                             + |
| Order and groups                       + |
| Shaders                                + |
+------------------------------------------+
```

Empty headers are `ControlSection`'s empty state.

## 10. Build

### 10.1 Components

Reused: every component named here, `style/row.ts` writes and `session.transaction`. New: the panel body, common lines, the Switch to
strip, popover sub-groups, `LabelFieldLine` (add, unset by removing the key from the layer's `labelStyle`
object, merge with `mergeLabelStyle` semantics, vary slot per 7.3), `SettingsPopout` `actions`, `AddButton`
`groups`, `ValueListbox` `sections`, the new `GLYPHS`, the home table. Shared-component changes are props only v2
passes, so the flag-off panel is unchanged. `COMBINE_WORDS` is `words.ts`'s; `BindingPopover.tsx`'s copy goes.

### 10.2 graphty-element changes

Each its own pull request, in this order:

| Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Size                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Exclusion data**, three pull requests. (1) Families: `family` defined in the catalog, members as channel sets or shader places (`place: "replace"`), with thing-wide channels. (2) Precedence: `excludes: { code, winner, loser, scope }`, reconciled with `modifies`, `follows` and `off`; `scope: "layer"` means both set on one layer and one wins (`x-size-labelfit`), `scope: "value"` means a value disables an option (`x-bend-arc`). (3) `appliesWhen: { channel, values } \| { view }`. The codes here are proposed names. Until (1) lands, v2 shows today's KindSwitch; until (2) and (3), nothing dims | LARGE                  |
| **Off fields**: a dedicated boolean per switchable thing (as halo `on` and `LabelStyle.enabled`), so Off never overwrites width or opacity and a typed 0 stays 0                                                                                                                                                                                                                                                                                                                                                                                                                                                    | SMALL-MEDIUM, additive |
| **Caps as facts**: the stack cap and group outline cap exported (`session.styles.canAdd(layer, use)` or a descriptor `max`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | SMALL, additive        |
| **Location descriptor** (`{ row, column, inside }` per `LabelLocation`), for R2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | SMALL, additive        |
| **`drawnBy`** on `LabelStyleFieldDescriptor`: which label kinds draw each field                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | SMALL, additive        |
| **Per-field label encoding** (`encode` on a `labelStyle` field), so every label line can vary by data                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | MEDIUM                 |
| **Annotation units** in graph units                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | SMALL, additive        |
| **List-valued labels** (`node.labels` / `edge.labels`, 7.4) with rendering, batching, save format and API report; required before v2 leaves its flag                                                                                                                                                                                                                                                                                                                                                                                                                                                                | LARGE                  |

### 10.3 Home table and its test

Built at test time from `CHANNEL_DESCRIPTORS`, the label style descriptors and the graph config keys; each entry
has one home: panel (section, thing, sub-group), graph settings, Layout panel, alias, or not offered (the
element's code). `__tests__/v2-homes.test.ts` fails on any entry with no home or two, and checks that every
family member's popover reaches every thing-wide channel.

### 10.4 Folders and several layers

As `FolderPanel.tsx` / `MultiRowPanel.tsx` (`ctx.many`, `writeIn`): differing values show the "Layer" palette.

### 10.5 Feature flag

- One flag, `style-panel-v2` ("Style panel v2"), a row in graphty-element's `src/features/registry.ts` with its
  tracking issue and `since` date, commented as the graphty app's UI only like `node-models`. `FeatureId` is a
  public union: rebuild and commit the API report.
- Gate `stylePanelV2On(session)` in `graphty/src/workspace/features.ts`: `style-panel-v2` AND `file-styles`.
- Switch points: `RowStyle` in `style/StylePanel.tsx` draws v2, else `PartsPanel`, else today's sections; and
  `headerOf` / `bodyOf` in `inspector/Inspector.tsx`.
- Off by default; locally `?features=file-styles,style-panel-v2`.
- The `-features-on` projects run with `all`, so every existing test or story that renders the Style panel body or
  Graph settings with file-styles on (found by grep for `StylePanel`, `RowStyle`, `GraphSettings` and `Inspector`
  renders; the pull request lists them) declares `withoutFeatures(["style-panel-v2"])`. `SidebarControls.real-
element` runs flag off and on, so #8739 is enforced on v2.
- New tests under `style/__tests__/` use `withFeatures(["file-styles", "style-panel-v2"])`, real input, and
  assert on `session.styles.list()` and the page.

## 11. Shown sections

A reader preference in the app's settings, under the flag, "Show empty style sections", on by default:

- **On**: every section header shows, an empty one in `ControlSection`'s empty state. No section is hidden in
  either view.
- **Off**: only sections the layer sets show; directly under the last one, an `AddButton` with the words
  "Add section" lists the section names (8 at most); picking one shows its header and opens its own "+" menu.

## 12. Acceptance checks

1. Basic shape (star, size) -> Sticker -> Basic shape keeps the row's name, place, height and Size line and brings
   back the star; after another row was selected, one undo does. Every member has the same Switch to strip.
2. Depth is panel, one popover, one picker; no tabs; no sub-group passes 8 lines; no menu passes 12 items.
3. Every value list over 12 shows at most 12 rows at a time; every catalog value is in one section.
4. Every "+" is on a section header, a list legend or a popover header; numbers have no caret; at most one caret
   a section on Everything; settings then "-", "-" far right; no control overlays another.
5. "Scene" and "World" never appear in the panel, Graph settings or any option name.
6. No pill, chip, badge, caption, count, sentence or default anywhere in the panel, popovers or lists, including
   a bound value and the list search placeholder (`SidebarControls` with the flag on).
7. Glyphs, list rows and pickers are today's; new glyphs only from section 6.
8. Every set value is visible in the panel or its thing's popover with a visible "-"; Off never changes another
   value.
9. Setting label color and size on a Hubs layer draws one label per node.
10. The Everything node tab stays within 26 marks; `v2-widths.test.ts` passes.
11. The home-table test passes.
12. A folder and a multi-row selection open v2.
13. Flag off: the old panel draws and every test passes. Undo reverses each add, set, unset, switch, remove.
