# Style panel v2: design

The Style panel is the right-hand panel of the graphty app that edits one style layer (Everything, Hovered,
Selected, Hubs, or any layer a reader adds). This is its next version, built in the graphty app behind a feature
flag (section 10). It replaces the panel body only; the layer tree, selection workspace, layer menu and every
value picker stay.

Rules that hold throughout, from the owner:

- The panel holds controls only: no pills, chips, badges, captions, sentences, warnings, counts or "from X"
  markers, in the panel, its popovers or its lists (issue #8739). Tooltips carry names only.
- It marks only what the layer sets (its minus). An unset control shows the value graphty-element would draw
  there (Input rules, 2026-11-23), never an empty field. It never says where a value comes from or how layers stack.
- No special layers. Everything, Hovered, Selected and Pinned open this same panel with the same controls.
- Graph-wide settings are **Graph** ("Graph settings"), never "Scene" or "World", in every name and option.
- Every input is a compact-mantine component (Input rules: "The style panel may only use components from
  compact-mantine"). compact-mantine is locked to Figma and changes only with the owner's approval; the app
  supplies the words, the glyphs (shape, arrow and pattern) and the values, never an input of its own. Where
  compact-mantine has no component for an input, the gap goes to the owner; the app does not build one. An icon
  is reused only for the same meaning.
- Every style offered was asked for by the owner, was already a graphty-element style, or is written by
  graph-io's style imports; nothing else is added. A custom shader is treated exactly like a built-in one.
- Section names, membership and order follow the style grouping study
  (`tmp/style-panel-design/v6/ia-design.md`, section 2): the parts of the mark first, then how it shows,
  each ordered by use.

## 1. The owner's points, answered

1. **Massive lists**: a popover opens on its main settings; other groups are added with its "+" (2.6). Value
   lists show one section at a time (8).
2. **Switch to** keeps the row and shared settings; it is a menu on the row, and every member or kind lists
   every other (5).
3. **Calmer**: no tabs or eyes; a separator between the two groups of sections, as Figma draws one between its
   groups; a section with rows collapses from its caret; by-data on every popover line (2.6); counted in 3.
   Swipe to delete is rejected: no mouse affordance, it collides with number scrubbing, and Figma uses "-".
4. **"+" on each section header**, above what it adds; only the "+" is a button. **Every section or only used
   ones**: every section is always shown (11). **A control rubric**, icons required wherever an option can be
   pictured (6).
5. **Hovering a row does nothing on the graph**: the owner never asked for a highlight on hover.
6. **Numbers are Figma's number input**: a letter to scrub, arrow keys to step, typed values (2.2).

## 2. Panel anatomy

### 2.1 Header (unchanged)

The layer name and menu, "Select nodes..." / "Select edges..." (no Style nodes / Style edges checkbox; a layer with no selection holds all of them and the line says All), the node / edge tabs, the Find a setting box
(key "/") and saving and loading styles stay as today. Find gains aliases in
`parts/aliases.ts` (arrow -> Arrow, name -> Label, hide -> Visibility, highlight -> Ring).

### 2.2 Grids and widths

| Line    | Grid                                                          | Control width, panel 240 (`PANEL_MIN`) / popover 264 (`SettingsPopout`) |
| ------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Named   | `.ws-field`: 16 gutter, 80 name, control, 24, 24              | panel 96, popover 120                                                   |
| Unnamed | `.ws-field:not([data-named])`: control spans name and control | panel 176, popover 200                                                  |

The two trailing slots are the same on every line, panel and popover alike: slot one is the
line's settings ("...") on a thing row, its by-data link on a popover line, and empty on a line under a row
(2.5); slot two is "-", the right-most icon (Input rules, 2026-11-23, which replace E550's "..." at the far
right).

**Number fields.** Every number field on the Node, Edge and Graph tabs is Figma's scrubbable number input
(`ComboInput numeric`, design/ui/figma "Scrubbable number input"): its slot at the left holds a letter -- a
pair's letter (X, Y, W, H) or the line's initial -- never an icon (E674), and dragging the letter scrubs the
value. Arrow keys step 1 and Shift steps 10; a typed value applies on Enter, Tab or blur. There are no stepper
buttons, because Figma's number input has none. Clearing a field (empty, Enter) unsets its channel.

A **pair** (X | Y, W | H, near | far) is two number fields in a Mantine `Group grow` in a named line's control
slot (88 each in a popover unnamed line), with no new CSS. "-" unsets both. A name over 80 px truncates with
an ellipsis; its tooltip is the full name.

### 2.3 Section

Every section is a `PlusList` at section level: a `ControlSection` whose only button is the "+" in its header's
last slot. The title never adds and never toggles. A section with rows collapses from its caret alone (a reader
preference, not saved in the layer). Every section is always shown, an empty one as its header and "+"; no
section is hidden in either view. The "+" opens `AddButton`, whose `groups` prop draws `Menu.Divider` between
tiers (everyday, sometimes, rare). A one-only thing leaves the menu once set; a disabled item shows its name
only. No menu holds more than 12 items.

The sections sit in two groups with a separator between them: the parts of the mark first, then how it shows.

Node tab order: **Fill, Text, Shape, Border** -- separator -- **Visibility, Effects.**

Edge tab order: **Line, Arrows, Route, Text** -- separator -- **Visibility, Effects.**

A shader is never a section of its own on either tab: shaders are Effects' Shader item (E668), and a shader that
draws instead of the node is a Shape kind (E378).

**Kind groups.** Several kinds of one style are one "+" item whose row carries its kind in the name column:
node Label (Text, Card, Dark, Pill, Callout or Glyph), edge Label (Text, Card, Dark, Pill or Callout), node
Plate (Behind or Over), edge Arrow (Target, Source, Middle to target, Middle to source), edge End caption
(Target or Source) and edge Outline (Under line or Over line). Tooltip and External label are kind groups too,
whose kinds are the label looks. A kind group that holds one row per kind (Plate, Arrow, End caption, Outline)
is one "+" item that adds the first free kind in that order, so a second "+" Arrow gives a Source arrow beside
the Target one. Label is "many", so its kinds may repeat: its "+" lists each look as its own item (below), and
each adds a new Label row of that kind. Glyph is never a "+" item: it is reached only from a Label row's Switch
to (E275, E276). A row's kind is changed from its Switch to (5).

**A label's look is its kind** (E196: "the toggle between "Plain" and "Card" label must be removed and replaced
with `+` having label or card"). There is no look select. The Label kinds Text, Card, Dark, Pill and Callout are
graphty-element's label looks (`look` unset, `card`, `dark`, `pill`, `callout`); Glyph draws a character instead
of text and has no look. The Text section's "+" offers each look directly: "Label" adds a Text label (`look`
unset), "Card" a Card label, and so on, so the reader picks label or card from "+" (E196); Switch to changes a
look afterwards. Tooltip, External label and End caption carry the same looks as kinds, Plain first (End
caption's Switch to lists its ends, a divider, then its looks); "+" adds them Plain.

### 2.4 Thing row

```
| Border    [o 1F2937   100%]  -  ... |   paint row: name, color main control
| Width     [W 0.6 ]           -      |   common line (2.5)
| <> Solid  [o 6366F1   100%]  -  ... |   row with kinds (Fill): Switch to, the kind
```

Row: `[<> name] [main] [...] [-]` (Input rules, "Slot order").

- **Name**: every row has a name column (ia-design section 2, rule 4). It holds the thing's name
  (Border, Route, Visible, Size), or, for a thing with kinds (Fill, Line, Shape and the other kind groups), its
  current kind (Solid, Gradient, Basic shape ...). One exception: a Label row (node or edge Label) shows its
  text, since one node can hold several labels; an empty one reads "Label" and a Glyph one "Glyph" (7.4).
  A row with members or kinds starts its name column with the Switch to glyph (`MemberMenu`), which opens the
  menu of members (5).
- **Main control** (section 7): a paint-like thing (border, ring, plate, outline, effects) leads with its color;
  a geometric thing with its defining value (size, shape, arrow, route). A family row shows the current
  member's value.
- **Remove** ("-"): removes the thing and every setting it has on this layer.
- **Settings** (`GLYPHS.more`, "...", drawn `...` in wireframes, never the sliders glyph): opens the settings
  popover; it is the last control in the row. It takes today's set state (accent) when the popover holds a set
  line. Clicking the row's name opens nothing; settings open from "..." (E176: "I would have thought that would
  have been "..."").
- **Off**: a thing switched off on this layer (2.6) draws its main control as a read-only field reading "Off",
  which opens the popover. Nothing is dimmed for it.
- **Bound**: a main value bound to data draws on the row as the field with the column name as its value, with no
  glyph of its own; no pill, no summary line. Its Stop varying button (the existing detach glyph, `GLYPHS.unlink`,
  E355) and its link live on Main's first line in the popover (2.6), because the row's trailing slot already holds
  "..."; a line under a row has its second trailing slot free, so it carries them on the line (2.5). Pressing "="
  in a field opens the value picker (a key, not a button).
- **Hover**: hovering a row does nothing on the graph (E181), and there is no setting for it.

### 2.5 Lines under a row

Under a row show only the lines the layer sets for that thing, in popover order, each named, each with its
"-". A line appears when its value is set (in the popover, or by "+" writing a required partner, 5.1) and goes
when it is unset; there are no empty lines waiting to be written. Every line is the one common pattern: name,
value control, "-" (E674). A line under a row carries its by-data link in its second trailing slot, as every line in
the popover does (2.6, E679), and binds from it or by "=" in its field (2.4). A line that holds no value of its own
(a Unit line, which only picks the unit a number is in) draws no link. Nothing above a line moves when one is
written.

### 2.6 Settings popover

`SettingsPopout` (264 px) beside the panel at the row's height; closes on outside click and Escape. Views opened
from it open beside it, never in its place (Input rules, "Nesting"); pickers are plain `Popout`s (SettingsPopout
refuses nesting).

- **Header**: the thing's name, and the "..." (compact-mantine `Popout.Panel` `more`) before the close button when
  the thing has groups of settings (Input rules, '"..." menu and group pop-overs'). There is no "+" in the
  popover except on a list.
- **Tabs**: a family's members or a kind group's kinds whose settings differ are the popover's first row, a tab
  strip (Input rules, "Tabs"); the same choice shown under a row with no popover (a basic Shape) is the same
  choices in the same words, as grouped buttons named above them (owner, 2026-11-24: one control, one wording).
- **First lines**: there is no separate By data line. Every line, the main value's included, carries its own
  by-data link in its trailing slot; a line that holds no value of its own (a Unit line) draws none. A line of two
  values (a pair) has one link whose list opens with a "Which value" choice (E680). For a switchable thing, a **Show** line (R7 checkbox, the one control for
  every Show line, label Show included, 7.3) writes its dedicated off field (10.2). Kind groups have no Off
  member, so a switchable kind group (Label, Tooltip, External label, End caption, Plate) has its Show line. Only
  a family whose element member list holds an off value (Shape: none, 5) shows it as an **Off** member and has no
  Show line, so every thing has exactly one control for being off. Then
  **Combine** (R8 icon segments Set / Add / Subtract / Multiply / Divide, `COMBINE_WORDS` in `words.ts`) on
  number lines only.
- **Main lines**: always shown, under no legend. Its first line is the row's main value
  (Color, Visible, Shading ...), then the row's common lines (Width, Strength, Size, Color ...), then the
  thing's own Main lines. The main value binds from its line's by-data link (`GLYPHS.link`) like any other line;
  bound, the line shows the column name and draws the existing Stop varying (detach) glyph, `GLYPHS.unlink`, in
  that slot (E355: the by-data control keeps its look).
- **Groups**: each its own pop-over beside the popover, opened from the "..." menu (at most 6 rows, a "-" in its
  header that unsets every line in it). A look's line (a Text shadow color) switches its look on when set
  (graphty-element's `needs`).
- **Lines**: unset, the control shows the value graphty-element would draw (Input rules, "Every input has a
  value"), with no "-"; writing a value sets it and shows "-". A set boolean unchecked writes
  `false`; "-" unsets it. A location line draws only its segments until written (R2).
- **Never empty**: a row whose main value can be bound always has its main value line in Main, bound or not,
  so its "..." always opens lines. A row whose main value cannot be bound and whose thing has no other settings
  leaves its "..." slot empty (as Figma does) and is drawn `[<> name] [main] [-]`.
- **Depth**: panel, the settings popover, a group pop-over beside it, and a dedicated component (a picker,
  the link dialog) beside either; never in place, never a fourth (Input rules, "Nesting"). The popover opens scrolled to its first set line; height follows content, capped at the viewport.

## 3. Marks, counted

Every hit target counts. Budgets: an empty layer at most 8; the default Everything node tab at most 26.
"-" stays visible on every set line, never on hover only, since every set value needs a visible way to unset it.

| Layer                                | Shown                      | Marks                                                                                    |
| ------------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------- |
| Empty layer                          | 6 empty section headers    | 6 "+"                                                                                    |
| Everything, node tab                 | Fill; Size, Shape          | 6 "+", 2 section carets, 3 rows x 3 (main, "-", "..."), 2 Switch to glyphs, 1 swatch: 20 |
| "color by community, size by degree" | Fill (bound); Size (bound) | 6 "+", 2 section carets, 2 rows x 3, 1 Switch to glyph, 2 links: 17                      |

## 4. Sections and things

**Fit to label** (`node.labelFit*`) is a sub-group of Size's settings, since it sizes the shape and overrules
Size (`x-size-labelfit`). In the "+" lists below, `|` is a divider between tiers.

### 4.1 Node tab

| Section    | "+" menu (dividers between tiers)                                     | Cardinality                      |
| ---------- | --------------------------------------------------------------------- | -------------------------------- |
| Fill       | Fill \| Image \| Stripes, Pie, Chart, Finish                          | one each                         |
| Text       | Label, Card, Dark, Pill, Callout \| Tooltip \| Record, External label | each Label kind many; others one |
| Shape      | Size, Shape                                                           | one each                         |
| Border     | Border                                                                | one                              |
| Visibility | Visible                                                               | one                              |
| Effects    | Ring, Shader, Glow \| Drop shadow, Raised edge, Plate                 | Shader many; others one          |

- **Fill** (kinds Solid and Gradient). The color box's "%" writes `node.opacity`.
- **Image** absorbs the old Fill kind Picture as its **Wrap around shape** setting: off (the default) places the
  picture on the node (`node.image`), on wraps it over the 3D surface (`node.texture`). A Solid color it hides
  dims (`x-picture-hides-fill`).
- **Stripes, Pie, Chart** as today. **Finish** (3D only): a Shading row, Smooth (the default), Flat or Unlit.
- **Label** (many; kinds Text, Card, Dark, Pill, Callout and Glyph, 2.3). Each look is a "+" item that adds a
  Label row of that kind ("Label" adds Text). Glyph is a kind of Label, never a separate style and never a "+"
  item: a Label row's Switch to reaches it (E275, E276); the looks are kinds, never a select (E196).
  **Tooltip**, **Record** (a table of fields inside the node) and **External label** as today.
- **Size**: the shape's size, its own row, so "size by degree" needs no Shape row (E189).
- **Shape** (kinds Basic shape, Model, and every shader that declares place "replace", built-in or custom, with
  "New shader..." in the same list). A Basic shape row has no settings pop-over (owner, 2026-11-23): its
  drop-down picks the shape and its Kind line sits under it, grouped buttons in the same words as a Model's or
  shader's tab strip (Basic, Model, Shader; Shader opens the gallery); Rotation, Corners and Custom shape values a layer
  already sets (an imported file's) are drawn under the row with their minus, and are not offered to add. A
  Model or a replace shader keeps its pop-over. Mesh detail is not offered: the Graph
  settings hold the drawing's detail (owner, 2026-11-23). Wireframe is an Effects option and writes the low
  detail it needs. The
  Shape section holds no draw-order or group lines (E420, E422).
- **Border**: one item, the stroke on the node's own edge (color, width, unit, opacity, style, position, wave).
  It has no kinds and nothing drawn around the node is in it.
- **Visibility**: Visible, Shown or Hidden.
- **Ring**: a stroke standing off the node's edge, outside any border (width, opacity, style, offset, count).
  The old wide translucent ring is a Ring with a width and an opacity.
- **Shader** is ONE gallery for the node from `catalog.shaders`, the shaders that declare place "paint" or
  "around", built-in and custom alike, "New shader..." first; the list is not split by place. A replace shader
  is a Shape kind instead, so no shader shows in two lists. A place is chosen only in the code dialog, when a
  shader is created (E368); choosing or using a shader never asks for a place.
- **Glow**: a soft light fading out from the node (color, strength).
- **Drop shadow** as today. **Raised edge** (2D only, E441): a bevel. **Plate** (2D only, E669; kinds Behind
  and Over): a filled plate behind the node (`node.underlay*`) or a translucent one over it (`node.overlay*`).
- No table lists a built-in shader by name. Membership in any list is decided by a shader's declared place,
  never by its id.
- **Multiples are named by what tells them apart**: Label rows by their text (7.4), shader uses by preset,
  kind rows by their kind.

### 4.2 Edge tab

| Section    | "+" menu                                                                | Cardinality                                    |
| ---------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| Line       | Line, Pattern \| Outline                                                | one each                                       |
| Arrows     | Arrow                                                                   | one per kind (four)                            |
| Route      | Route \| Force curves                                                   | one each                                       |
| Text       | Label, Card, Dark, Pill, Callout \| End caption, Record, External label | each Label kind many; End caption one per kind |
| Visibility | Visible                                                                 | one                                            |
| Effects    | Shader, Animation                                                       | Shader many; Animation one                     |

- **Line** (kinds Solid and Gradient). Width is its line; the color box's "%" writes `edge.opacity`.
  **Pattern** (dashed, dotted, wavy and the rest) is its own item, so "dashed" is in "+".
- **Outline** (kinds Under line and Over line): every band drawn along the line is this one item. Under line is
  an opaque casing beside the line (`edge.outline*`); graphty-element folds its two other casing families,
  `edge.band*` and `edge.underlay*`, into it (10.2, fix 1). Over line (`edge.overlay*`, 2D only) is a
  translucent wash over the line.
- **Arrows** holds one item, **Arrow**, one row per arrow; kinds Target, Source, Middle to target and Middle
  to source. The section is called Arrows.
- **Route**: one value list of every route graphty-element draws -- Straight, Curve, Bundling (edges gathered
  into shared paths, force-directed edge bundling) and the rest -- with Curve as its line; ports and node gaps
  are its Attach sub-group, and lift its 3D sub-group. **Force curves** (the force-bowed curve, edges bent by a
  physics simulation) is a separate item.
- **Label** (many; kinds Text, Card, Dark, Pill and Callout, each a "+" item as on the node tab); **End caption**
  (kinds Target and Source); **Record** (the label table, `edge.labelTable`);
  **External label**. Tooltip joins Text as on the node tab once graphty-element draws an edge tooltip (10.2,
  fix 2).
- **Visibility**: Visible, Shown or Hidden.
- **Shader** is ONE gallery for the edge, the shaders that declare place "paint" or "along", built-in and custom
  alike, "New shader..." first; the list is not split by place. **Animation**: a texture running along a solid
  line.

### 4.3 Graph settings

Opened from the tree footer button "Graph settings"; v2 switches in both `case "graph"` branches of
`inspector/Inspector.tsx` (`headerOf` and `bodyOf`). Every change below is in v2's branch only.

| Thing (the style model's Graph things) | Home and change                                                                                                                                                                                                                                                                                             | Writes                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Background                             | One row, family Color / Sky (5); Sky opens compact-mantine's `ImagePicker`. No `drawnIn` caption or sentence. Keep on import (R7)                                                                                                                                                                           | today's keys                                                             |
| View (Canvas section)                  | `ControlGroup`s: **View** lighting, rotation (R5, degrees; 2D, dims in 3D), highlight color (R1). **Framing** extent (R8 Drawn / Centers, unnamed line), padding (R5). **Marks** same size at any depth (R7), smallest mark node \| edge                                                                    | `styles.setHighlightColor`, `viewRotation`, `framing.*`, `minMarkSize.*` |
| Labels                                 | Hide overlaps (R7, off by default), Avoid nodes and edges (R7, off by default): the reader's label preferences, so labels draw statically at their set place unless the reader turns these on (E270); sample cell (R5); label text (R9 Canvas / Atlas, never "Glyphs", which reads as the Glyph kind, E275) | app preferences; `behavior.labels.*`                                     |
| Shader gallery                         | as today                                                                                                                                                                                                                                                                                                    | -                                                                        |
| Annotations (new)                      | "+" adds one (many). Row: kind (R9); popover lines by kind: text R14, font R13, fill and border R1, arrow ends R10, picture R16, position X \| Y                                                                                                                                                            | `session.annotations`                                                    |
| Map                                    | the Layout panel's map fields, unchanged                                                                                                                                                                                                                                                                    | -                                                                        |
| Layout motion                          | the Layout panel's `TransitionRow`, unchanged                                                                                                                                                                                                                                                               | -                                                                        |

View mode stays in the toolbar.

**Not built yet** (the flag stays on until they are): Annotations wait for graphty-element's annotation units
(10.2); Map and Layout motion stay in the Layout panel; the label sample cell and label text are `behavior.*`
settings the app writes as reader preferences through `ElementHost`, so each needs its preference and element
attribute wiring before Graph settings can show it.

Also waiting on graphty-element, and left out of v2 until it lands (each a 10.2 change): the **Show** line of
Drop shadow and Plate (their off fields); the Glyph kind's **italic** line (graphty-element lacks a glyph italic
channel); an arrow's **Image** picker (an arrow's image takes a URL, not an asset id, so it stays a typed
address); a Record field's **text source** (R12: `shapeTexts` holds literal words, no template); and a chart's
values from data fields (R12: the element binds the whole `chartValues` list, not one value).

### 4.4 Layer-wide

- **Applies to**: the existing selection workspace.
- **Vary by data**: 2.4, 7.5. **Combine**: 2.6. The number field shows today's combine prefix glyph only when the
  value is not Replace.

## 5. Switch families, kinds and exclusions

A family is a thing whose members the element draws one at a time in one slot. Members and the channels each
owns come from the element's exclusion data (10.2), never from a list of ids.

| Family             | Member-owned                                                                                                                                           | Thing-wide (kept through every switch, shown in every member)      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Shape              | Basic shape: `node.shape` and its shape-only settings (corners, points, custom shape, mesh detail); Model: `node.model*`; each replace shader: its use | shapeRotation                                                      |
| Fill               | Solid: `node.color`; Gradient: `node.gradient*`                                                                                                        | `node.opacity` (the color box's "%"; an Opacity line for Gradient) |
| Line               | Solid: `edge.color`; Gradient: `edge.gradient*`                                                                                                        | width, opacity, taper, blending, fade                              |
| Background (graph) | Color: `backgroundType`; Sky: `data`                                                                                                                   | `color`, `shader`                                                  |

A **kind group** is the app's (`v2/kindGroups.ts`): several kinds of one style, which may coexist on one node or
edge, each kind its own row, all from one "+" item (2.3). Switching a row's kind moves the shared slot values
(color, size) to the new kind in one undo step; switching between label looks writes only `look`, so every
other label field stays. The kind groups are node Label (Text, Card, Dark, Pill, Callout, Glyph), edge Label
(Text, Card, Dark, Pill, Callout), node Plate (Behind, Over), edge Arrow (Target, Source, Middle to target,
Middle to source), edge End caption (Target, Source) and edge Outline (Under line, Over line); Tooltip,
External label and End caption carry the label looks as kinds (2.3).

Collapses considered (owner, E495: "review all other controls that can be collapsed down"):

| Candidate                                    | Outcome                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| End captions                                 | collapsed: End caption, kinds Target and Source                                                           |
| Node underlay and overlay                    | collapsed: Plate, kinds Behind and Over                                                                   |
| The four arrows                              | collapsed: Arrow; their settings are identical                                                            |
| Glyph, Label and the label looks             | collapsed: Label, kinds Text, Card, Dark, Pill, Callout and Glyph; no look select (E196, E275)            |
| Edge band, underlay, outline, overlay        | collapsed: Outline, kinds Under line and Over line (band and underlay fold in with graphty-element fix 1) |
| Fill picture and Image                       | collapsed: Image with its Wrap around shape setting                                                       |
| The wide ring and Ring                       | collapsed: Ring; the wide ring is a Ring with a width and an opacity                                      |
| Route and force curves                       | kept apart: Force curves is a simulation with its own settings; Bundling is a route value                 |
| Drop shadow and Glow                         | rejected: an offset dark shadow and a centered soft light look plainly different                          |
| Pie, Stripes, Chart                          | rejected: slices, bands and a chart are different looks with different settings                           |
| Record and Label                             | rejected: the element draws them by other rules (`shapeTexts`, label lists)                               |
| Model and Basic shape; Fill and Line members | already families                                                                                          |

**Switch to** has one look and one place for every family and kind group: the glyph before the row's name
(`MemberMenu`), opening a menu of every member or kind, the current one checked. There is no Switch to strip in
the popover. A member gated by a flag or the view (Model in 2D) is disabled, never hidden, and the current
member is always enabled. Only a family whose element member list holds an off value adds an **Off** member
(today Shape: none), its one control for being off, and it has no Show line. Kind groups never have an Off
member; a switchable kind group or thing is switched off by its Show line (2.6). A Label row's Switch to lists
Text, Card, Dark, Pill, Callout and Glyph; it is the only way to Glyph, which no "+" menu offers (E275, E276).

1. **Same row, same settings.** The row keeps its place and height, and its name column shows the new kind
   (2.4); thing-wide lines stay in every member.
   Clicking a member that needs a pick (Model, a replace shader, Sky) opens its picker beside the row; the row
   keeps the old member until the pick; Escape changes nothing; the pick removes the leaving member's own
   channels and writes the new member in one `session.transaction`. Others switch at once.
2. **Symmetrical.** While the selected row id stays the same, the panel holds each left member's values as UI
   state, like an unsent draft, and switching back writes them: Basic shape (star, rounded) -> a replace shader
   -> Basic shape gives the star with its corners. Once the selected row id changes, switching back writes the
   member's start (5.1). Undo reverses each switch in one step, so the star is always one undo away.
3. **Shared**: Model's popover shows `node.shape` as **Fallback shape** (`x-shape-model`); switching to Model
   keeps it.

### 5.1 Starting writes

"+" writes the element's declared `start` value and every `needs` partner, so no row shows an empty required
value (E305). A list starts with two visible items. An inherited list is edited per item, never copied.

| Thing or member                                 | On add or switch                                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Basic shape, Solid                              | today's `AddButton` values                                                                                                            |
| Border                                          | a color and a width                                                                                                                   |
| Ring                                            | a color, a width and an offset above 0, so it stands apart from the rim                                                               |
| Arrow                                           | the first free kind, an arrowhead and a size                                                                                          |
| Gradient (node, edge)                           | two stops: the current color (or today's default) to white                                                                            |
| Model, Image, replace shaders, Sky, shader uses | opens its picker; writes on pick                                                                                                      |
| Label, External label, Tooltip, End caption     | nothing: an empty row (empty source = every label, 7.4) that stays until set or removed; the element's default label size is 1 (E671) |
| Glow                                            | the element's default color, yellow (E670)                                                                                            |
| Wireframe                                       | On, with `meshDetail: "low"` (graphty-element's start and need)                                                                       |
| Drop shadow                                     | color and `opacity: 0.5`                                                                                                              |
| Plate                                           | Behind, with a rounded-rectangle shape and a padding; switching to Over starts at opacity 30%                                         |
| Outline (edge)                                  | Under line; switching to Over line starts at opacity 30% and the same width                                                           |
| Pie, Stripes, Record, the inner lines           | the popover on its list; writes the first item                                                                                        |
| Chart                                           | `kind: "bar"`, then the values picker; writes on pick                                                                                 |
| Annotation                                      | `kind: "text"` at the view center                                                                                                     |

### 5.2 Exclusions that are not families

Within one layer only, the overruled or dependent line dims, its tooltip naming the winner; other layers never
dim anything. Dimming means only this.

| Exclusion                                                                                                                                                                                                                                                                                                              | Treatment                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x-picture-hides-fill`, `x-model-gradient`, `x-size-labelfit`, `x-table-cell-picture`, `x-edge-fade-gradient`, Record vs labels, a paint shader vs a replace shader, drawn patterns vs outline / gradient / fade / taper, edge blending vs opacity and fade, arrow `position` / `gap`, caption `distance` / `location` | dim the overruled line                                                                                                                                          |
| `x-size-extents`: width, height or depth replace size on their axis unless Relative to size is on                                                                                                                                                                                                                      | dim Size when all three axes are overruled; dim nothing per axis (one field)                                                                                    |
| `x-edge-path-kind`: lift > bends > route > force curves > fanned > bow > curved                                                                                                                                                                                                                                        | dim every line it overrules, across Route and Force curves                                                                                                      |
| `r-forcecurve-curved`, Fit to label needs a Label, border needs a shape other than none, pattern needs width > 0, flow needs the solid pattern and the straight route                                                                                                                                                  | dim the dependent line                                                                                                                                          |
| `x-view-2d-3d`: a style or field drawn in one view only, from graphty-element's `channelDrawn` / `labelFieldDrawn` facts and a shader's `views` -- among them Raised edge, Plate and the Over line outline (2D only), Model, Finish, Mesh, lift and flow (3D only), graph rotation (2D)                                | dim in the other view with the tooltip "2D only" or "3D only"; never hidden, never reordered; a "+" item dims the same way                                      |
| `x-chart-kind`                                                                                                                                                                                                                                                                                                         | the lines follow the kind (`appliesWhen`)                                                                                                                       |
| `x-bend-arc`                                                                                                                                                                                                                                                                                                           | bendCurve's "arc" option disabled with 2 or more bends                                                                                                          |
| `x-edge-paint-shader`                                                                                                                                                                                                                                                                                                  | a second paint shader is disabled in the edge's Shader gallery once one paint use exists                                                                        |
| `x-value-binding-combine`                                                                                                                                                                                                                                                                                              | a value, a binding, a combine or off: writing one replaces the others in one transaction                                                                        |
| Competing settings of one quantity (below)                                                                                                                                                                                                                                                                             | the number field plus a **Unit** line (R8 / R8f) in the popover; changing the unit moves the value: writes the new channel, removes the others, one transaction |
| `x-binding-stops`                                                                                                                                                                                                                                                                                                      | stops editor replaces palette and range (7.5)                                                                                                                   |

Unit writes: border Graph `width` / Screen `screenWidth`; label size Graph `size` / Screen `sizePx` with
`sizeMode: "screen"` / Letter `letterSize` (each removes the other two and `sizeMode`); label padding Text
`padding` / Box `boxPadding`; shape size Graph / Pivot / Screen `sizeSpace`.

## Input rules (owner, 2026-11-23)

The owner adds to and updates these rules over time. Section 6's rubric must agree with them: where a rubric
row and a rule differ, the rule wins and the row is changed. Every Style panel input follows them, in the panel,
its pop-overs, the link-a-value dialog and Graph settings. `graphty/src/workspace/style/__tests__/
StylePanelV2InputRules.real-element.test.tsx` checks the ones a test can see; its known-violations lists only
shrink.

### The owner's rules (verbatim)

Rules for all inputs

- If a pop-over is more than 6 components tall (not total of 6 components, since there may be multiple on the
  same line, but 6 components from top to bottom), it is probably too complex and should move the less commonly
  used features or optional features to an advanced dialog
- Pop-outs must never be nested more than two layers deep
- You must use the right component for each type of input
    - Picking a single color must use the color picker component
    - Picking a gradient must use the gradient picker component
    - Picking from a list of options must use a drop-down
    - Picking files must use the file picker component
    - Picking from a range of inputs must use a slider component
    - Selecting between fewer than six options should use grouped buttons
    - Picking angles must use the angle picker component
    - Picking fonts must use the font picker component
    - Picking images must use the image picker component
- Every input must be self describing, either through an attached icon that will have common knowledge for users,
  a tooltip that appears on-hover for a button, through an obvious affordance like a color picker, or through the
  component's small text label above the input
- Inputs may be two per line where they make sense together: e.g. x and y values for a point
- If an input has a default value, it must show the default value in the input when nothing has been set

Rules for style inputs:

- The minus sign to remove an item should always be the right-most icon
- Every input must have a value, no input can show as empty
- Linking buttons and settings buttons must be positioned on the same line after to the control they are linking
  the value to. They should be hidden until on-hover
- The style panel may only use components from compact-mantine (added 2026-11-24)

Added 2026-11-24:

- The 'advanced' button is always a '...' icon
- The 'advanced' button opens a new pop-over, it doesn't replace the current pop-over
- do not use in-place pop-overs
- "when I said no more than two levels of pop-overs, I wasn't thinking of dedicated components. the things you just
  named are fine as third-level pop-overs." (The things named: color pickers, drop-down lists, the picture picker,
  the shape, pattern and arrow lists with their section drop-down, the data field picker, the link dialog with its
  color table's swatch picker and "Set properties", and a link dialog opened from a line inside the Advanced
  pop-over.)
- "Labels for an input must never go to the left of the input. Always use the built-in label that adds a small label
  above the component" (approved 2026-11-24)

Added 2026-11-24 (one-of choices are tabs; any-of groups are a menu):

- When a pop-over's settings depend on choosing one of several alternatives (only one can be in effect at a
  time, such as a fill that is Solid or Gradient, or two ways of setting the same value, such as Custom or
  Palettes in a color picker), show the alternatives as a strip of tabs at the top of the pop-over. Picking a
  tab is picking the value. The strip is all icons when every choice has a common-knowledge icon (each with a
  tooltip), otherwise all words. At most five tabs; six or more alternatives use a drop-down. The strip counts
  as one of the pop-over's six rows. Tabs are not in-place pop-overs: every tab stays visible and nothing opens
  on top of another view.
- Use tabs only when each choice shows different settings; a one-of whose settings are the same for every
  choice is a grouped-buttons line.
- A pop-over has at most one tab strip, for its defining choice. A nested one-of that changes settings is
  merged into that strip when every combination fits five tabs; otherwise it is a line, and its settings
  appear under it when they apply.
- When a thing has independent groups of settings that can all be in effect at once (a label's Position,
  Wrap and Badge), its "..." opens a menu listing the groups, marking each one that is set, and choosing a
  group opens that group's own pop-over beside the current one. A thing with only one group opens it directly
  from "...". Only one group pop-over is open at a time. Every group pop-over is at most six rows; a group that
  would be taller is split into two menu entries, never given a "..." of its own.
- A "..." menu has at most 16 entries, grouped under headings of at most 6 entries each.
- A group of one line is not a menu entry: it joins the main pop-over.
- A list of copies of the same thing (pie slices, gradient stops, strands) is neither tabs nor a menu: it stays
  a list with "+". "+" adds copies to a list; it is never used to reveal a group of settings.

This replaces the earlier wording that the Advanced "..." opens a new pop-over: "..." opens a menu of the
thing's groups when it has more than one, and each opens a new pop-over.

### How they are applied (decisions)

- **Nesting: pop-overs beside, never in place.** The panel is level 0. The two-level limit counts the panel's own
  pop-overs: a row's settings pop-over is level 1, and a group pop-over its header's "..." opens is level 2.
  A dedicated component (a color picker, a drop-down's list, the Picture picker, a shape, pattern or arrow list
  with its section drop-down, the data field picker, the link dialog and what it opens) is not a pop-over level:
  it may open from level 1 or level 2 as the third, and nothing opens a fourth. Nothing replaces a pop-over's
  content: every pop-out opens beside the one it came from, which stays open with its own title, and there are no
  back buttons. The link dialog opens as a pop-out of its own: from a sidebar line, beside the panel; from a line
  in a pop-over (a group pop-over included), beside that pop-over.
- **Height.** "Components tall" counts lines from top to bottom with every sub-group shown: two inputs on one
  line count once, a Kind line and a Combine or operation line count, each list item counts, and a 3 x 3 grid (a
  label's Location cells) counts as its own row unless it sits beside the line's other control. A caption line above an
  input does not count as a row toward the six-row pop-over limit. Over 6, the rarer
  or optional lines move to a group in the "..." menu. A tab strip counts as a line; the "..." sits in the header
  and is no line.
- **Components.** A single color: `CompactColorInput`. A gradient: compact-mantine `GradientEditor`. A list of
  6 or more options: a drop-down (`PanelField kind="select"`, or the existing `ValueListbox` for pictured
  lists). Fewer than six exclusive options: grouped buttons (`SegmentedControl`). A number with a fixed minimum
  and maximum (opacity, any 0-1 or 0-100% value, a fixed range): compact-mantine `Slider`, with its number
  field beside it so the value is read and typed; the line draws its name above them. An open-ended number
  stays the scrubbable number input. An angle (a number graphty-element marks `angle`: a shape's, a pie's, a
  label's or a caption's rotation, a gradient's direction, a model's turn): compact-mantine `AnglePicker`. A font:
  compact-mantine `FontPicker`, listing the fonts the project holds (graphty-element `session.fonts`), the common
  and generic families and the fonts on this computer, with an upload that adds the file to `session.fonts`, so
  it is saved in the project and drawn. An image: compact-mantine `ImagePicker`, listing the project's pictures
  (`session.assets`), with a file and an address. A color's picker shows its Palettes tab. Files: compact-mantine
  `FileSource`.
- **Only compact-mantine components.** Every input in `graphty/src/workspace/style/v2/` is imported from
  `@graphty/compact-mantine`; the `graphty/style-panel-inputs` lint rule fails an input control imported from
  anywhere else (`@mantine/core`, an app file). Layout that takes no input (`Box`, `Group`, `Stack`, `Text`,
  `VisuallyHidden`, `Tooltip`) is not an input and may come from `@mantine/core`. The app's shared pieces that
  wrap compact-mantine controls (`ValueField`, `ValueListbox`, `BindingPopover`) are app code and are listed
  in the rule as open gaps until compact-mantine has their component.
- **Font style.** Bold, Italic, Underline and Strikethrough are toggle icon buttons on one line (compact-mantine
  `ToggleIconButton` or the existing grouped-button component, lucide glyphs, each with a hover tooltip). Bold
  toggles the weight between the regular and the bold weight; the numeric weight is in the label's advanced
  settings. graphty-element's label style carries underline and strikethrough (an additive API change where
  missing).
- **Names above, never beside (approved 2026-11-24).** Names go above inputs, never beside them: every input's
  visible name is a compact-mantine caption (FieldRow label above) or group legend (ControlGroup); app code never
  draws its own name text next to an input. A full-width line (a control with its link and minus) takes a
  `ControlGroup` legend over it (the same 9/14 caption), since `FieldRow`'s columns keep the 240 px grid and hold
  one trailing control, not a link and a minus; a pair takes one name ("W / H"). An input whose
  icon or affordance describes it gets no name: a color swatch whose name would only be "Color", the B / I / U / S
  toggles, a checkbox (its own words). A color with a name of its own ("Highlight", "Letter outline") keeps it: a
  swatch says it is a color, not which. An icon-only control has a hover tooltip naming it.
- **Self describing.** A full-width segment line of words (a size's Unit) and the Kind drop-down are named too,
  and the link dialog's grouped buttons (Operation, More values than colors, No value) carry their name above them.
- **Every input has a value.** An unset input shows its default: the value graphty-element would draw there
  (what the layers beneath draw, else graphty-element's default), in the normal text color. Never an empty
  field, a placeholder-only field, or a segment line with nothing selected. The minus still shows only when the
  layer sets the value.
- **Slot order.** Every line reads `[control] [link or ...] [-]`, its name above it: the link or settings button right after
  its control on the same line, the minus the right-most icon. A list's "+" sits before the minus.
- **Hover.** The link and settings buttons are hidden until the line is hovered, and also shown while focus is
  within the line, while their own pop-out is open, and always on devices without hover (`(hover: none)`: the
  owner uses an iPad). Hidden keeps their 24 px slot, so the control never changes width.
- **Link operation.** Linking a value to a number input includes what to do with the number: a grouped-button
  line Set / Add / Subtract / Multiply / Divide (icons with tooltips allowed), default Set. Add to Divide combine
  the mapped data value with the value the input would have without the link. This is graphty-element's binding
  option (`combine`: graphty-element's `"replace"` is Set, plus `"add"`, `"subtract"`, `"multiply"` and
  `"divide"`); the app only writes it. The link dialog draws it as its "Operation" line, right after the source;
  a plain number's pop-over has no Combine line: it shows only where a layer already writes a combine (a file,
  an earlier version), named "Combine", so that value stays changeable.

- **"..." menu and group pop-overs (2026-11-24).** A pop-over's main lines are always shown; there is no Main
  legend and no "+" that reveals a group of settings ("+" only adds copies to a list). A thing with groups of
  settings has a "..." icon button in its pop-over's header (compact-mantine `Popout.Panel` `more`), drawn in the
  brand ink while a group is set. With one group, "..." opens it directly; with more, it opens a menu of the
  groups (compact-mantine `MenuGroupItem`, a dot marking each set group), under headings of at most 6 entries
  where there are more than 6, at most 16 entries in all. Choosing a group opens that group's own pop-over
  beside the pop-over (compact-mantine `placement="beside"`: the start side when it fits, else the end side, else
  below or above where there is more room, as on an iPad held upright), which stays open and uncovered. One group
  pop-over is open at a time. A group pop-over is at most 6 rows, titled with the group's name, with a "-" in its
  header that unsets the whole group once set; its lines carry their link, so the link dialog opens from there as
  the third level. A line under a switch is called by its whole name there. A group of one line joins the main
  pop-over. The rubric's `SubGroup.heading` (a label group's too) names the menu heading.
- **Tabs.** A one-of whose choices show different settings is the pop-over's first row: compact-mantine
  `SegmentedControl` (all words, or all icons with tooltips), at most 5 choices; picking one is picking the value
  (a family member, a kind, a route). A one-of whose choices show the same settings is a grouped-buttons line
  (or a drop-down at 6 or more). A line that depends on a one-of in the same pop-over is drawn only when it
  applies or when the layer sets it; a line that depends on the view (2D or 3D) stays dimmed.
- **Link dialog.** At most 6 components tall, with no Advanced of its own, so one opened from the Advanced
  pop-over never needs a fourth level. Two choices that go together share a line, in every state. A number:
  source, Operation | Scale (and Steps for a stepped scale), the histogram with its value range, the from / to
  output, Clamp outliers (with its two percentiles once on, or Fit to the data once the extent is set by hand),
  No value (with its one value beside it once One value is picked). A color ramp: source, the ramp, Scale,
  Clamp outliers as above. A color by groups: source, palette, the group table, More values than colors | No
  value, and its one value under them. It is 312 wide in v2, so a pair's halves read
  whole. A bound value's dialog is the same dialog.
- **Free text and pictures.** An unset text field holds the words drawn there ("+" for a badge's suffix) as its
  value, or "None" where none are drawn; left so, nothing is written. A picture (a label's image, a node image's
  Fallback, an arrow's Image) is compact-mantine's `ImagePicker` (R16), reading "None" with no picture. A
  label's Icon is a character drawn beside its words (graphty-element's `icon`), not a file, so it stays text.
- **Sidebar rows with a pictured list or a drop-down** (Pattern, Arrow, Route, Force curves) draw their name above
  and the value across the row, so a value is never cut ("Triangle", "Barnes hut").
- **A basic Shape row** has no settings pop-over: its Kind line is under it, the pop-over's tabs as grouped buttons
  in the same words (Basic, Model, Shader).
- **Unset values.** A number graphty-element names no one value for (it picks one per element: a node's width
  follows its shape) reads "Auto". A segment line whose unset state is none of the element's values has an option
  for it ("Off" for Fit to label, "Both" for an arrow's side), shown while unset; picking it unsets. A drop-down
  of a field with no default starts with "None". A new list item starts with words ("Field 1", "Cell"). Unit
  lines show their first unit (Graph) while unset.

## 6. Control rubric

Widths from 2.2. Panel main controls sit on panel lines (96 named, 176 unnamed); popover lines are 120 named, 200
unnamed. An icon segment needs 28 px; a word segment 7 px a letter plus 16, at least 40. Pick the first rule that
matches. The input rules above win over this table where they differ.

**Pictured.** An option can be pictured when `GLYPHS` or lucide-react has a glyph of the same meaning, or the option
is a direction, side, alignment or geometric kind. When every option of a setting can be pictured, icons are
required, not permitted. One exception: an icon set may end in a single "Auto" word segment.

**Common lines** (E674). No row or line carries a toggle, an icon or a widget the other lines lack: a boolean
that modifies another line (italic, keep ratio, separate sides) is its own R7 line. Three glyphs are allowed,
each on every line of its kind: the Switch to glyph on every family and kind row (E100, E105), `GLYPHS.link`
on every line that can bind and `GLYPHS.unlink` (Stop varying) in its place once bound, and the scrub letter on every number field (2.2). Nothing else.
The link glyph and a row's settings "..." sit on the same line as their control, right after it, and the minus
is the right-most icon: `[name] [control] [link or ...] [-]`. The link and "..." are hidden until the line is
hovered, and shown while focus is within the line, while their pop-out is open, and always under
`(hover: none)` (Input rules, "Slot order" and "Hover").

| #    | When                                                                                              | Control                                                                                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1   | A color (with opacity)                                                                            | `CompactColorInput` with its Palettes tab, always a full line                                                                                                                                     |
| R2   | A label, tooltip or caption location                                                              | R8f Outside / Inside / Auto, then `AlignmentMatrix` once written (Auto disables it); values from the location descriptor (10.2)                                                                   |
| R3   | A family member or a kind                                                                         | Switch to on the row (section 5)                                                                                                                                                                  |
| R5   | An open-ended number (no fixed minimum and maximum)                                               | Figma's scrubbable number input (2.2): a letter slot, arrow keys step 1 and Shift 10, no stepper buttons; two related numbers as a pair; shows its default when unset                             |
| R5s  | A number with a fixed minimum and maximum (opacity, 0-1 or 0-100% values, a fixed range)          | compact-mantine `Slider`, opacity in percent; a pair's ranged half takes its own line                                                                                                             |
| R5b  | A number with named presets                                                                       | `ComboInput` with the presets as options: mesh detail (Full, Low, or a number); font weight (Regular, Bold, or 1-1000) only in a label's advanced settings, the Bold toggle (R7t) everywhere else |
| R7   | A boolean                                                                                         | `Checkbox` with its name, checked as graphty-element draws it when unset                                                                                                                          |
| R7t  | Font style: bold, italic, underline, strikethrough                                                | `ToggleIconButton`s on one line, lucide glyphs, each with a hover tooltip; Bold toggles regular and bold weight                                                                                   |
| R8   | 2 to 5 exclusive options (fewer than six) fitting the line where they sit                         | `SegmentedControl`, icons when pictured, else words                                                                                                                                               |
| R8f  | The same, fitting only a popover full line (200)                                                  | `SegmentedControl` on an unnamed popover line under its sub-group legend; popovers only                                                                                                           |
| R9   | 6 to 12 options, without pictures                                                                 | `PanelField kind="select"`                                                                                                                                                                        |
| R10  | 6 or more options with pictures (catalog glyphs, or lucide glyphs named in the option-name table) | Existing `ValueListbox`: today's rows and glyphs, one section at a time (section 8), search placeholder "Search"; fewer than 6 pictured options are R8 icon segments                              |
| R11  | 13 or more options without pictures                                                               | `PanelField` with `{ group, items }` data                                                                                                                                                         |
| R12  | A data field or text source                                                                       | The existing attribute picker / `ValuePicker`                                                                                                                                                     |
| R13  | A font                                                                                            | compact-mantine `FontPicker`: the project's fonts (`session.fonts`), common and generic families, this computer's fonts, and an upload saved in the project                                       |
| R14  | Free text                                                                                         | `TextInput size="xs"`, commits on Enter or blur                                                                                                                                                   |
| R15  | An ordered list                                                                                   | Popover only: `ItemListEditor`, "+" on its legend, "-" per line, drag grip on hover; `GradientEditor` for stops                                                                                   |
| R15r | A list thing's row control                                                                        | A read-only strip of its swatches (Pie, Stripes) or its first item; opens the popover on the list                                                                                                 |
| R16  | An image; a model or shader parameters                                                            | An image: compact-mantine `ImagePicker`. A model: `ModelsPopover`; shader parameters: `ShaderParamRows`                                                                                           |
| R18  | An angle (graphty-element's `angle` on the channel or label field)                                | compact-mantine `AnglePicker`, 0 at the top, clockwise                                                                                                                                            |
| R17  | A set of sides                                                                                    | Four `ToggleIconButton`s with `GLYPHS` `arrowUpToLine`, `arrowRightToLine`, `arrowDownToLine`, `arrowLeftToLine` on one line                                                                      |

**Glyphs.** New `GLYPHS` entries come from lucide-react (as `glyphs.ts` imports it), only those the option-name
table names for the icon settings below. Catalog shape, arrow and pattern glyphs are never redrawn. Display
names and glyph names come from the app's option-name table beside `optionGlyphs`; a test fails on any option
label "Scene" or "World".

**Fit results** (formula above; checked against where each control sits):

| Rubric              | Settings (width)                                                                                                                                                                                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R8 icons            | textAlign (84), iconPosition, stripes direction, gradient kind Linear / Radial (56), border position and labelBorderAlign Inside / Center / Outside (84), arrow side (84), repeat None / Both / X / Y (112)                                                                                                 |
| R8 words, 120       | shiftOf and gapOf Box / Words (91), declutter Degree / Size (102), labelFit Inside / Bounds (116), modelCenter Bounds / Origin (116), supportScale Unit / Drawing (109), clip (88), Unit Graph / Screen (109), px / % (80), Text / Box (84), overflow (95), Show On / Off (80)                              |
| R8 words, panel 176 | Visibility Shown / Hidden (109), framing extent Drawn / Centers (116)                                                                                                                                                                                                                                       |
| R8f, 200            | sizeMode (188), location (167), mapping (142), box (167), lineBox (146), runAlign (195), supportModel (179), autoSize (165), modelFit Contain / Stretch (130), modelDoubleSided (124), Combine (177), label Unit Graph / Screen / Letter (167), unmapped (123), pointerDirection four arrows and Auto (152) |
| R9                  | imageFit (204), modelTint, badge, animation, label text Canvas / Atlas (116, on a 96 named panel line), paddingOf, modelSourceUp, modelAnimation, the Force curves row's supportModel (179 over 176)                                                                                                        |
| R10 lucide          | chart kind, bendCurve, route (its icons inside the list)                                                                                                                                                                                                                                                    |

`ControlGroup` is used in popovers and in Graph settings' View section. v2 popover-page files join the `ignores`
list of `graphty/style-sidebar-controls` in `graphty/eslint.config.js`, as `BindingPopover.tsx` does; the rule's
`files` gain `inspector/GraphSettings*`. `__tests__/v2-widths.test.ts` computes every R8 width from the
option-name table and fails when one passes the width where it sits.

## 7. The rubric applied

Ids are graphty-element channel names (`node.` / `edge.` omitted) and `labelStyle` fields. "Row" is the main
control; "Lines" the lines under the row once set (2.5); "Main" the popover's always-shown sub-group; "Name: a, b"
a sub-group added with "+"; "|" a pair. Every popover's Main starts with the row's main value line and the
Lines column's common lines (2.6); the Popover column lists only what follows them, and "-" there means nothing
follows.

### 7.1 Node

| Thing                                  | Row                               | Lines       | Popover                                                                                                                                                                                                                                                                  |
| -------------------------------------- | --------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fill: Solid                            | color R1                          | -           | -                                                                                                                                                                                                                                                                        |
| Fill: Gradient                         | stops (`GradientRow`)             | -           | Main: kind R8 icons, direction R5 or center X \| Y and radius R5 (by kind), endColor R1, opacity R5                                                                                                                                                                      |
| Image                                  | image R16                         | Opacity     | Main: Wrap around shape R7, imageFit R9, fallback R16. Size: width \| height or pixelSize R5 (by fit), autoSize R8f, keep aspect R7. Place: position X \| Y, offset X \| Y. Tiling: repeat R8 icons, clip R8, smoothing R7                                               |
| Stripes                                | colors R15r                       | -           | Main: Stripes R15 (color, size, opacity), direction R8 icons, size R5. Frame: R17                                                                                                                                                                                        |
| Pie                                    | slices R15r                       | -           | Main: Slices R15 (color, size, opacity). Disc: hole, radius, rotation R5, pieFitBox R7, offset X \| Y                                                                                                                                                                    |
| Chart                                  | kind R10                          | -           | Main: values R12, colors R15, min \| max, horizontal R7 (by kind). Box: size or width \| height, offset X \| Y, margin, gap R5. Strokes: lineWidth R5, borderColor R1, borderWidth R5, backgroundColor R1                                                                |
| Finish (3D only)                       | shading R10 (Smooth, Flat, Unlit) | -           | -                                                                                                                                                                                                                                                                        |
| Label: Text, Card, Dark, Pill, Callout | text source R12                   | Size, Color | 7.3                                                                                                                                                                                                                                                                      |
| Label: Glyph                           | char R14                          | Size, Color | Main: font R13, weight R5b                                                                                                                                                                                                                                               |
| Tooltip, External label                | text source R12                   | Size, Color | 7.3                                                                                                                                                                                                                                                                      |
| Record                                 | fields R15r                       | -           | Main: Fields R15 (`shapeTexts`: point, text R12). Table: the label table editor R15, cell picture R7, padding R5, font R13                                                                                                                                               |
| Size                                   | size R5                           | -           | Main: Unit R8f, sizeMode R8f, width \| height, keep ratio R7, depth R5, relativeExtents, planar R7. Fit to label: labelFit R8, padding X \| Y, labelFitSquare R7, labelFitQuantum R5, labelFitImage R7, labelFitImagePadding R5                                          |
| Shape: Basic shape                     | shape R10                         | -           | Kind line under the row, no pop-over. Set lines only: shapeRotation R5, cornerRadius R5, exactCornerRadius R7, cornerFraction R5, shapePoints R15, shapeStretchPoints R7, shapeParts R15, inner lines R15, inner line width R5, inner line backing color R1 and width R5 |
| Shape: Model                           | model R16                         | -           | Main: Fallback shape R10, modelTint R9, modelFit R8f, modelCenter R8. Orient: modelSourceUp R9, modelTurn R5, modelDoubleSided R8f. Animation: modelAnimation R9, speed \| offset                                                                                        |
| Shape: replace shader                  | preset R10                        | -           | Main: ShaderParamRows R16; reach, minSize R5                                                                                                                                                                                                                             |
| Border                                 | color R1                          | Width       | Main: Unit R8, opacity R5, style R10, position R8 icons. Wave (wavy styles): amplitude \| period                                                                                                                                                                         |
| Visibility                             | shown R8 Shown / Hidden           | -           | -                                                                                                                                                                                                                                                                        |
| Ring                                   | color R1                          | Width       | Main: opacity R5, style R10, offset R5, count R5                                                                                                                                                                                                                         |
| Shader use                             | preset R10 (`ShaderGallery`)      | -           | Main: params R16, reach, minSize R5                                                                                                                                                                                                                                      |
| Glow                                   | color R1                          | Strength    | -                                                                                                                                                                                                                                                                        |
| Wireframe (3D only)                    | wireframe R8 On / Off             | -           | -                                                                                                                                                                                                                                                                        |
| Drop shadow                            | color R1                          | -           | Main: opacity, blur R5, offset X \| Y; Show once its off field lands (4.3, 10.2)                                                                                                                                                                                         |
| Raised edge (2D only)                  | width R5                          | -           | Main: lightColor R1, darkColor R1                                                                                                                                                                                                                                        |
| Plate: Behind, Over (2D only)          | color R1                          | -           | Main: opacity, padding R5, shape R10 (the element's backdrop shape list), cornerRadius R5; Show once its off field lands (4.3, 10.2)                                                                                                                                     |

### 7.2 Edge

| Thing                                                     | Row                | Lines       | Popover                                                                                                                                                                                                          |
| --------------------------------------------------------- | ------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Line: Solid, Gradient                                     | color R1, or stops | Width       | Main: minScreenWidth, taper R5, blending R7; Gradient adds kind R8 icons first and an opacity line. Long-line fade: fadeStart \| fadeEnd, fadeOpacity R5. 3D: flow speed R5                                      |
| Pattern                                                   | style R10 (15)     | -           | Main: patternCount R5. Dashes: length \| gap. Wave: amplitude \| period                                                                                                                                          |
| Outline: Under line, Over line (Over line 2D only)        | color R1           | Width       | Main: opacity R5; Under line adds style R10 (line-pattern glyphs)                                                                                                                                                |
| Arrow: Target, Source, Middle to target, Middle to source | arrow R10          | Size, Color | Main: fill color R1, opacity R5, width R5, side R8 icons, outline width R5, position R5, image R16; Target and Source add gap R5 and stack R15                                                                   |
| Route                                                     | route R10          | Curve       | Main: arcRadius, arcHeight R5 (by route). Bends: bends R15, bendCurve R10. Attach: nodeGap R5, source \| target gap, sourcePort X \| Y, targetPort X \| Y. Parallel edges: fanned R7, fanSpacing R5. 3D: lift R5 |
| Force curves                                              | supportModel R9    | -           | Springs: length \| constant, repulsion \| gravity. Curve: supportUnit R5, supportScale R8                                                                                                                        |
| Label: Text, Card, Dark, Pill, Callout; External label    | text source R12    | Size, Color | 7.3                                                                                                                                                                                                              |
| End caption: Target, Source                               | text source R12    | Size, Color | 7.3, Position adds distance R5                                                                                                                                                                                   |
| Record                                                    | fields R15r        | -           | as node Record (`edge.labelTable`)                                                                                                                                                                               |
| Visibility                                                | shown R8           | -           | -                                                                                                                                                                                                                |
| Shader use                                                | preset R10         | -           | Main: params R16, reach R5                                                                                                                                                                                       |
| Animation                                                 | animationSpeed R5  | -           | -                                                                                                                                                                                                                |

### 7.3 Label, external label, tooltip, caption

Each line is a `LabelFieldLine` (10.1) writing one `labelStyle` field (`node.labelStyle`, `node.xlabelStyle`,
`node.tooltipStyle`, caption styles); `LabelSettings.tsx` is not used by v2. Each kind shows only the fields
the element says it draws (`drawnBy`, 10.2).

Every label, tooltip, external label and end caption uses the same groups, as the style grouping study sets
them (ia-design.md section 2, "Label settings groups"; E268, E675). The row carries the common lines size
(`size`, `sizePx`, `letterSize`) and color. The popover's Main lines come first, then nine "+" groups of at
most 10 lines each, with a divider after Position and another after Box stroke (everyday | sometimes | rare).
No group reuses a node or edge section's name: the box's stroke is **Box stroke**, not Border, and the shadows
are **Label shadow**, not Shadow, so Find a setting never shows one word for two places. Every shadow is in
Label shadow, every stroke of the box in Box stroke and the letters' own stroke in Letters, so no look has two
homes.

| Sub-group           | Lines                                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main (always shown) | Show R7 (`enabled`); font R13; Style R7t (Bold, Italic, Underline, Strikethrough toggles; owner, 2026-11-23); textAlign R8 icons; location R2; Unit R8f (`sizeMode`); the look is the row's kind (2.3), never a line here |
| Position            | attachOffset R5, offset X \| Y, box R8f, onTop R7, shift X \| Y, shiftOf R8, gapOf R8, keepInView R7                                                                                                                      |
| Letters             | weight R5b (the number; Bold is Main's toggle); opacity, lineHeight, rotation R5; runAlign R8f; Letter outline R1 (`outline`), Letter outline width R5, Letter outline opacity R5                                         |
| Wrap                | width \| maxLines, Break anywhere R7 (`wrapAnywhere`), Cut long lines R7 (`wrapEllipsis`), Ellipsis at max lines R7, keepBlankLines R7, wrapTrailingSpace R7, wrapSkipEndSpace R7, wrapSpaceCount R5                      |
| Background          | background R1, opacity R5; backgroundShape R8; cornerRadius R5; padding R5; boxPadding R5; gradient R7, gradientType R8, gradientColors R15, gradientDirection R5                                                         |
| Box stroke          | borderWidth R5, borderColor R1, borderOpacity R5, borderAlign R8 icons, lineBox R8f; margin top \| right, bottom \| left                                                                                                  |
| Label shadow        | Text shadow R7 (`shadow`), Text shadow color R1, Text shadow blur R5, Text shadow offset X \| Y; Box shadow R7 (`panelShadow`), Box shadow color R1, Box shadow blur R5, Box shadow offset X \| Y                         |
| Callout             | pointerDirection R8f, width \| height, pointerOffset R5, pointerCurve R7                                                                                                                                                  |
| Badge               | badge R9, then its kind's lines: Icon beside text R14 (`icon`), Icon side R8 icons (`iconPosition`); or progress R5; or maxNumber R5, overflowSuffix R14, smartOverflow R7                                                |
| Behavior            | minScreenSize R5, declutter R8, minNodeScreenSize R5, depthFade R7, near \| far, animation R9, animationSpeed R5, pickable R7, closeButton R7                                                                             |

The **Callout** kind and the **Callout** group are one home: the kind is a look that writes the box fields
and the Callout group's fields (`pointer`, `pointerDirection`), and those fields show in the Callout group like
any other set line. Choosing the kind adds no setting the Callout group does not hold.

The "+" menu holds the sub-groups after Main. Every one of the label fields is reachable from the label row's
popover by clicks (E673).

**By data on a label field** binds the field's flat channel (`node.labelColor`, ...) where the element has one,
while `set` writes `labelStyle`; fields without one get By data from per-field encoding (10.2).

### 7.4 Several labels

Zero, one or many labels per node or edge, built on graphty-element's list-valued labels (`node.labels` /
`edge.labels`): each label has a stable `id` (a new one from `session.styles.newLabelId`); a layer addresses one
label by `id` and merges per field (`mergeLabelStyle`); the save format is the list of
`{ id, text, location, ...style }`; a single label loads as id `label`.

- The text-source picker (R12) lists "In this graph" labels above the data fields; picking one addresses its
  `id` (Hubs picks "name (top)" and restyles that label only); picking a field adds a label.
- A Label row with no text source applies to every label of the matched nodes, so restyling needs no key.
- Rows are named by their text, with the location added ("name, top") only when two rows share a text; an empty
  row is "Label"; a row of kind Glyph is "Glyph".
- External label and Record stay separate: the element draws them by other rules (`xlabel`, `shapeTexts`).

### 7.5 Vary by data (`BindingPopover`)

One page, opened as a pop-out of its own beside what it opened from (Input rules, "Nesting" and "Link dialog"). The field's type picks the starting mapping, as
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

| List              | Sections                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Node shape        | Basic (with none), Polygons, Rounded, Symbols, Round solids, Polyhedra, Prisms and pyramids; Models; replace shaders         |
| Plate shape       | the element's backdrop list, flat sections only                                                                              |
| Arrow             | Filled, Open, Bars and barbs, Strokes, Special                                                                               |
| Edge line pattern | Lines, Shapes, Waves, Slashes, Arrows                                                                                        |
| Palette           | Sequential, Categorical, Diverging                                                                                           |
| Shader gallery    | one list per target, built-in and custom alike, "New shader..." first, in `ShaderGallery`'s categories; never split by place |

## 9. Wireframe: the Everything node tab

`v` caret, `-` remove, `...` settings (`GLYPHS.more`), `+` add, `<>` Switch to, `S` the Size field's letter.

```
+------------------------------------------+
| (header unchanged)                       |
| v Fill                                 + |
| <> Solid  [o 6366F1     100%]    -  ...  |
| Text                                   + |
| v Shape                                + |
| Size      [S 1.0        ]        -  ...  |
| <> Basic shape [Rectangle v]     -  ...  |
| Border                                 + |
|==========================================|
| Visibility                             + |
| Effects                                + |
+------------------------------------------+
```

Empty headers are `ControlSection`'s empty state; the double rule is the separator between the two groups.

## 10. Build

### 10.1 Components

Reused: every component named here, `style/row.ts` writes and `session.transaction`. The v2 components, each the
one place its pattern is drawn: `PlusList` (every "+" list: sections, popover sub-groups, item lists),
`ThingLine` (every row and line), `MemberMenu` (Switch to, families and kind groups), `ValueButton` (every value
list's main control), `ItemListEditor` (the one list editor), `LabelFieldLine` (add, unset by removing the key
from the layer's `labelStyle` object, merge with `mergeLabelStyle` semantics, vary slot per 7.3),
`SettingsPopout` `actions`, `AddButton` `groups`, `ValueListbox` `sections`, the home table. Deleted: SwitchTo,
AddItemButton, ListGroup's ActionIcon, WordsStrip, ReplacePreset, SwatchStrip. Long sections separate by kind
with always-open legends; nothing collapses below section level. Shared-component changes are props only v2
passes, so the flag-off panel is unchanged. `COMBINE_WORDS` is `words.ts`'s; `BindingPopover.tsx`'s copy goes.

### 10.2 graphty-element changes

Proposed at the start, each its own pull request:

| Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Size                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Exclusion data**, three pull requests. (1) Families: `family` defined in the catalog, members as channel sets or shader places (`place: "replace"`), with thing-wide channels. (2) Precedence: `excludes: { code, winner, loser, scope }`, reconciled with `modifies`, `follows` and `off`; `scope: "layer"` means both set on one layer and one wins (`x-size-labelfit`), `scope: "value"` means a value disables an option (`x-bend-arc`). (3) `appliesWhen: { channel, values } \| { view }`. The codes here are proposed names. Until (1) lands, v2 shows today's KindSwitch; until (2) and (3), nothing dims | LARGE                  |
| **Off fields**: a dedicated boolean per switchable thing (as `LabelStyle.enabled`), so Off never overwrites width or opacity and a typed 0 stays 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | SMALL-MEDIUM, additive |
| **Caps as facts**: the arrow stack cap exported (`session.styles.canAdd(layer, use)` or a descriptor `max`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | SMALL, additive        |
| **Location descriptor** (`{ row, column, inside }` per `LabelLocation`), for R2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | SMALL, additive        |
| **`drawnBy`** on `LabelStyleFieldDescriptor`: which label kinds draw each field                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | SMALL, additive        |
| **Per-field label encoding** (`encode` on a `labelStyle` field), so every label line can vary by data                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | MEDIUM                 |
| **Annotation units** in graph units                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | SMALL, additive        |
| **List-valued labels** (`node.labels` / `edge.labels`, 7.4) with rendering, batching, save format and API report; required before v2 leaves its flag                                                                                                                                                                                                                                                                                                                                                                                                                                                                | LARGE                  |

Made since, on the style panel branch:

- `drawnWhen` with `channelDrawn` / `labelFieldDrawn`, and a shader's `views`: the facts behind every "2D only"
  and "3D only" dimming. The raised edge (`node.raisedBorder*`), the node underlay and overlay (Plate) and the
  edge overlay (Outline, Over line) are drawn in the 2D view only; the Under line (`edge.outline*`) draws in
  both views.
- `needs` and `start` (the values "+" writes), `modifies`, declared defaults and `suggestedMax`, the
  `catalog.shaders` filter by place, `labelFieldOf` for every text kind, shader parameter and list item
  addresses, a base look without off values, record field placement (a field with no point sits one line below
  the one before), list-valued labels with `styles.newLabelId`, and render fixes.
- Removed: the node outline (`node.outline`, `node.outlineWidth` and `behavior.node.outlineWidth`; a graphty-
  written file's border color reads back as a border, E309); the `node.halo*` channels, folded into the ring
  (`node.outerBorder*`), with a saved halo read as a ring; the group outline family (no group shader place, no
  outline pass, no presets; E422).
- Kept, with the recorded reason: `node.zIndex`, `node.drawOrder` and the `node.group*` channels still draw,
  because graph-io writes them (yEd and Cytoscape imports) and the node renderers read `node.zIndex` for draw
  order; they have no line in the panel (E420, E422).
- New: the glow's default color is yellow (E670); the default label size is 1 (E671); `edge.route` gains
  "bundled", force-directed edge bundling (edges subdivided and drawn toward compatible neighbors), which the
  Route value list offers as Bundling.

Still to land, from the style grouping study (`ia-design.md`, section 5): (fix 1) one channel family for the
edge casing, `edge.band*` and `edge.underlay*` folded into `edge.outline*`; (fix 2) edge tooltips; (fix 4)
`node.marker`, which nothing draws, removed.

### 10.3 Home table and its test

Built at test time from `CHANNEL_DESCRIPTORS`, the label style descriptors and the graph config keys; each entry
has one home: panel (section, thing, sub-group), graph settings, Layout panel, alias, or not offered (the
element's code, or an owner removal with its ledger entry). `__tests__/v2-homes.test.ts` fails on any entry with
two homes, and checks that every family member's popover reaches every thing-wide channel;
`__tests__/v2-inventory.real-element.test.tsx` fails on any entry with no home, counts only a normal visible
control as a home, covers every label field and every enum option, and fails on any panel entry not traceable
to the owner, graphty-element or graph-io. `PARTS` and coverage strings are not homes.
`__tests__/owner-forbidden.real-element.test.tsx` fails when anything the owner removed comes back.

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

Every section is always shown, on every layer and in both views: an empty one as its header and "+", in
`ControlSection`'s empty state. There is no reader preference that hides empty sections and no "Add section"
bar.

## 12. Acceptance checks

1. Basic shape (star, size) -> a replace shader -> Basic shape keeps the row's name, place, height and Size row
   and brings back the star; after another row was selected, one undo does. Every family and kind row has the
   same Switch to on the row, and no popover has a Switch to strip.
2. Depth is panel, one popover, one picker; no tabs; no sub-group passes 10 lines; no menu passes 12 items.
3. Every value list over 12 shows at most 12 rows at a time; every catalog value is in one section.
4. Every "+" is on a section header, a list legend or a popover header, and is the only button there; a section
   collapses only from its caret; "..." or the link then "-", with "-" the right-most icon of every line; no control overlays
   another.
5. "Scene" and "World" never appear in the panel, Graph settings or any option name.
6. No pill, chip, badge, caption, count, sentence or default anywhere in the panel, popovers or lists, including
   a bound value and the list search placeholder (`SidebarControls` with the flag on).
7. Glyphs, list rows and pickers are today's; new glyphs only from section 6; no line carries a glyph or toggle
   the other lines lack, except the three section 6 allows (Switch to on family and kind rows, the link on a
   bound value, the scrub letter on a number field).
8. Every set value is visible in the panel or its thing's popover with a visible "-"; Off never changes another
   value.
9. Setting label color and size on a Hubs layer draws one label per node.
10. The Everything node tab stays within 26 marks; `v2-widths.test.ts` passes.
11. The home-table and inventory tests pass; owner-forbidden passes.
12. A folder and a multi-row selection open v2.
13. Flag off: the old panel draws and every test passes. Undo reverses each add, set, unset, switch, remove.
14. Every number field scrubs from its letter, steps 1 with the arrow keys and 10 with Shift, and has no
    stepper buttons.
15. Hovering a row changes nothing on the canvas; a fresh workspace draws labels at their set place.
16. Each tab has one Shader gallery, holding built-in and custom shaders alike, with no place choice; replace
    shaders are only in the Shape list.
17. A style drawn in one view only is dimmed in the other with "2D only" or "3D only", never hidden.
18. The sidebar never scrolls sideways under a wheel with a horizontal delta; every style and label field
    changes the picture in each view its `drawnWhen` allows.
