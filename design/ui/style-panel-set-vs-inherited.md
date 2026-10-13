# Style sidebar: showing what a layer sets, and what it does not

## The problem

In the graphty app's style sidebar, every layer draws all seven core property rows (node
shape, size and color; edge color, width, head and tail). A row the layer does not set still
shows a value: the value from the layers beneath, as gray placeholder text, or as a full color
swatch with its hex code, marked only by italics. So the Selected, Hovered and Everything
layers all look as if they set the default blue, the default size and the default shape. They
do not:

- Selected sets only a halo and a glow.
- Hovered sets nothing at all, which is why hovering seems to do nothing.
- Everything sets almost nothing, which is why hiding it hides nothing.

The default look really comes from two locked layers that graphty-element creates beneath
Everything, "Node defaults" and "Edge defaults" (`elementBaseLayers()` in
`graphty-element/src/session/GraphSession.ts`). The layer tree does not show them.

Restyling the inherited values has been rejected twice (gray placeholder text, then italics).
Readers misread an inherited value as a set value however it is styled, as long as it sits in
the control where a set value would sit. Unity, VS Code (issue #58038, open since 2018),
Power BI and Cytoscape all draw every value and mark the set ones, and their users report the
same confusion.

## The layer model these options keep

Every layer is equal and offers the same styling. Where a layer came from never matters.
Layers stack, and the topmost layer that writes a property wins for each element. Everything
is at the bottom. Selected and Hovered are layers like any other, created by default. Folders
only organize.

## Two rules every option follows

1. **The control slot belongs to the layer alone.** A field, swatch, select or value pill is
   drawn only for a property the layer sets. An unset property never has a control holding a
   value.
2. **Special states are words, never blanks.** "Mixed", "Not set here", "Sets nothing yet"
   and "by Degree" are written out. Adobe's "blank means mixed" is not used, because in this
   panel a blank would already mean "not set".

Where the value beneath appears at all, it appears as plain words outside any control and
names the layer it comes from ("#3388FF, from Everything").

## A decision shared by every option: Everything owns the base look

**The decision.** The default look moves into Everything. Everything starts with real, set
values (Icosphere, size 1, #3388FF, the edge color, width and arrows), each with its minus.
There is nothing beneath it. I made this call because it is what the eye on Everything needs
to "hide everything", and it is a two-way door: the app can stop asking for it.

**What changes in graphty-element (additive, default unchanged).**

- A new session option, `createSession({ styles: { base: "locked" | "editable" } })`.
    - `"locked"`, the default, keeps today's two locked layers. No existing consumer changes.
    - `"editable"` seeds the same default values into one ordinary bottom layer that writes both
      nodes and edges. It can be edited, hidden and cleared like any layer. It cannot be deleted
      or moved off the bottom (refused with the existing `E_PROTECTED`). Its default name comes
      from the catalog as `plainName`, so the app can call it "Everything".
- Defined behavior for "nothing writes this element": a node or edge that no visible layer
  writes at all is not drawn. A channel that no visible layer writes on a drawn element takes
  the renderer's documented neutral value, and `explain`, `agreement` and `legendOf` report it
  as the fact `{ code: "unstyled", params: { channel } }`. The app writes the words
  ("built-in gray").
- `npm run api:report`, and the report committed with the change.

**What changes in the app.** It passes `base: "editable"`, shows the element's bottom layer as
the Everything row, and drops its own, nearly empty Everything layer.

**What the eye on Everything does then.** It hides what Everything paints, which with the
default layers is the whole graph: the canvas goes empty. Elements a visible higher layer
writes stay drawn, with that layer's look over the neutral value. With Everything hidden and
Degree visible, every node stays drawn in Degree's colors on the neutral shape and size, which
shows plainly what Degree does. With Everything hidden and only Selected visible, the selected
nodes appear as neutral spheres with their halo.

A stricter rule is possible: draw an element only when a visible layer writes its shape (for a
node) or its line (for an edge). Under it, hiding Everything empties the canvas even with
Degree visible. I chose the looser rule because it makes every eye mean the same thing ("remove
this layer's writes, keep the rest"), and because it makes "show only this layer" (Option 6)
fall out of the same mechanism.

**The rejected alternative.** Show "Node defaults" and "Edge defaults" as two locked rows under
Everything, the way Chrome DevTools shows the "user agent stylesheet". It needs no element
change, but those rows could not be hidden or edited, which breaks "every layer is equal", and
the eye on Everything would still hide almost nothing.

**Rows at rest under every option, once Everything owns the base look.**

| Layer      | What it shows at rest                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| Everything | The seven core properties, set, at their default values, each with its minus |
| Selected   | Halo and Glow only                                                           |
| Hovered    | "Sets nothing yet", so hover doing nothing is visible instead of hidden      |

## What graphty-element already answers

All of these already exist in `graphty-element/src/session/styles/StylesApi.ts`:

- `styles.explain(target)`: for one node or edge, each layer's contribution, bottom first, and
  the winning layer for each property.
- `styles.agreement(scope, channel, { below })`: across many elements, the value beneath a
  layer and the layer that paints it, or a breakdown by layer when the elements differ.
- `styles.counts(id)`: for each property a layer writes, on how many elements it actually
  decides.
- `styles.hideRow(id, hidden)` and `styles.legendOf(id)`: a layer's eye and its legend.

---

## Option 1 (recommended): show only what the layer sets, plus a line of named "add" buttons

**Description.** A layer draws a full row only for each property it writes: the control, then
the minus. Below those rows sits one always-visible line, "Not set here:", followed by the
name of every core property the layer does not write, each a small button holding only the
name, with no value and no swatch. Clicking a name adds that row, already filled with the
value now in effect, so the canvas does not change until the reader edits it; the picker opens
with focus in it. Rare properties (opacity, wireframe, curve, arrow size, label font and so on)
sit behind a "More styles" button at the end of the line, grouped and named. This is the
pattern of Illustrator's Appearance panel, Photoshop's effect list and Figma's fills, which
show only what is applied, with one change: the core properties are named on the panel instead
of hidden behind a "+". That change answers the tier 1 finding that every participant (18 of 18) found Size only by guessing at a "+" inside another row.

**Selected**

```
+------------------------------------------------+
| (eye) Selected                    sets 2       |
|  Nodes: selected                               |
|   Halo   [## #FFD400]  width [ 2  ]        (-) |
|   Glow   [## #FFD400]  amount [0.6]        (-) |
|  --------------------------------------------  |
|  Not set here:  Color  Size  Shape  Label      |
|                 [+ More styles]                |
+------------------------------------------------+
```

**A Degree-colored layer**

```
+------------------------------------------------+
| (eye) Degree                      sets 1       |
|  Nodes: every node                             |
|   Color  [||||| by Degree     ] (unlink)   (-) |
|          low #2C7BB6 ---> high #D7191C         |
|  --------------------------------------------  |
|  Not set here:  Size  Shape  Label  Halo  Glow |
|                 [+ More styles]                |
+------------------------------------------------+
```

- **Everything:** all seven core rows, set, each with its minus; the "Not set here" line is
  empty until the reader clears something. Its eye hides the base look, as described above.
  Clearing a property on Everything leaves the neutral value; the minus tooltip says "Clear:
  back to the built-in gray circle".
- **Selected:** two rows, Halo and Glow, then the line. Nothing on the panel suggests that
  selecting changes a node's color.
- **Hovered:** "Sets nothing yet", then the line with every core name.
- **Values that vary with the data:** the row's control is a value pill (a ramp and "by
  Degree"). The unlink icon beside it, labeled "Use one color" on hover and focus, is the only
  way to break the link; the gradient popover loses its own "Use one color" button.
- **Mixed values:** a single layer's own value differs across elements only when it is bound to
  data, and the pill covers that. With several layers selected in the tree, a row appears when
  any of them sets the property and reads "Set on 2 of 3" when only some do; differing values
  read "Mixed" as a word, and editing it writes to every selected layer. A name appears on the
  "Not set here" line only when no selected layer sets it. If the value beneath is itself
  mixed when a property is added, the row is added empty with its picker open, and nothing is
  written until the reader picks.
- **Clearing:** the minus removes the row and the name returns to the line; focus moves to that
  name. Delete or Backspace on a focused field does the same. One Undo restores the row.
- **Finding the source:** on demand only. Hovering or focusing a name says "Now #3388FF, from
  Everything" (from `agreement` with `below`); the minus tooltip says "Clear: back to #3388FF,
  from Everything". The full picture is Option 6.
- **Accessibility:** the layer heading reads "Selected, sets 2 styles". A set field is named
  "Halo color, #FFD400"; every visible row is set, so no state needs announcing. Each name on
  the line is a button named "Add node color to Selected", described as "Now #3388FF, from
  Everything". Tab order: each field then its minus, then the names, then More styles. After
  an add, focus is in the new field; after a clear, on the returned name.
- **Precedents:** Illustrator Appearance panel, Photoshop's layer effects list, Figma fills,
  Chrome DevTools rule blocks, Word's Style Inspector "Plus:" list. The named line is invented.
- **Costs and risks:** a row moves between the set rows and the line when it is set or cleared,
  so focus and the undo labels ("Set node size", "Clear node size") must follow it. The line
  must read as buttons, not a sentence; that needs a pilot check. The full look of a layer is
  not on one panel; Option 6 answers that.
- **graphty-element:** nothing beyond the shared base-look option. The set rows come from the
  layer's own spec; the prefill and hover text from `agreement`.
- **App:** a new panel layout built from compact-mantine's Chip (or Button, subtle variant) and
  the existing controls; delete the gray placeholders and italics; reverse the "always seven
  rows" rule in tier 3 design.md section 1.1 and its "Rejected: a row must be added before it
  can be set" note.

## Option 2: show only what the layer sets, plus one "Add style" menu

**Description.** Option 1 without the line of names. A layer shows its set rows and one
visible "+ Add style" button. The button opens a menu of every property, grouped, each with a
second line giving the value now in effect ("Color -- now #3388FF, from Everything"). Choosing
one adds the row, prefilled, with focus in it. This is the shortest panel and the closest copy
of Illustrator and Figma.

**Selected**

```
+------------------------------------------------+
| (eye) Selected                    sets 2       |
|   Halo   [## #FFD400]  width [ 2  ]        (-) |
|   Glow   [## #FFD400]  amount [0.6]        (-) |
|   [+ Add style]                                |
+------------------------------------------------+
```

**A Degree-colored layer**

```
+------------------------------------------------+
| (eye) Degree                      sets 1       |
|   Color  [||||| by Degree     ] (unlink)   (-) |
|   [+ Add style]                                |
+------------------------------------------------+
```

- **Everything:** all seven core rows, set, and the button. Eye as above.
- **Selected:** two rows and the button.
- **Hovered:** "Sets nothing yet" above the button.
- **Values that vary with the data, mixed values, clearing:** as in Option 1; a cleared
  property simply returns to the menu, and focus moves to the Add style button.
- **Finding the source:** in the menu's second lines and the minus tooltip; the full picture is
  Option 6.
- **Accessibility:** a standard menu button; each menu item is named "Node color" and described
  "now #3388FF, from Everything".
- **Precedents:** Illustrator's Add New Effect, Figma's section "+", Photoshop's fx menu.
- **Costs and risks:** every core property costs two clicks, and the names are not visible at
  rest, which is a milder form of the tier 1 discovery failure. Choose it over Option 1 only if
  a pilot shows the line of names reads as clutter.
- **graphty-element:** nothing beyond the shared base-look option.
- **App:** as Option 1, with a compact-mantine Menu instead of the line.

## Option 3: every core row kept, with an "Includes" checkbox and no value when off

**Description.** All seven core rows stay in fixed positions. Each row starts with a checkbox
whose hit area is the whole label. Checked, the row shows its control. Unchecked, the control
is gone: the slot holds the muted words "Not set", and nothing else at rest. Checking the box
copies in the value now in effect, so the canvas does not change, and moves focus into the new
control; unchecking clears the property. This keeps every property visible on every layer, the
way Excel's "Style includes" and Godot's and Unreal's override checkboxes do.

**Selected**

```
+------------------------------------------------+
| (eye) Selected                                 |
|  [ ] Shape   Not set                           |
|  [ ] Size    Not set                           |
|  [ ] Color   Not set                           |
|  [x] Halo    [## #FFD400]  width [ 2  ]        |
|  [x] Glow    [## #FFD400]  amount [0.6]        |
+------------------------------------------------+
```

**A Degree-colored layer**

```
+------------------------------------------------+
| (eye) Degree                                   |
|  [ ] Shape   Not set                           |
|  [ ] Size    Not set                           |
|  [x] Color   [||||| by Degree     ] (unlink)   |
+------------------------------------------------+
```

- **Everything:** every box checked. Unchecking one leaves the neutral value, and the row says
  "Not set (built-in gray)". Eye as above.
- **Selected:** Halo and Glow checked, the core rows unchecked.
- **Hovered:** every box unchecked.
- **Values that vary with the data:** the pill and unlink icon, as in Option 1.
- **Mixed values:** with several layers selected, the checkbox is tri-state ("set on some"),
  and the control reads "Mixed" when the set values differ.
- **Clearing:** the checkbox replaces the minus; unchecking is Clear, with the same Undo.
- **Finding the source:** hovering or focusing an unchecked row says "Now #3388FF, from
  Everything". It is not shown at rest, so no value sits beside an unset row.
- **Accessibility:** a native checkbox, "Include node color in this layer, not checked"; Space
  toggles it and focus moves into the new control. Standard, well announced.
- **Precedents:** Excel's Style dialog "Style includes", Unreal's EditCondition, Godot's theme
  overrides (Godot 4.5 starts a newly enabled override from the value in effect).
- **Costs and risks:** five "Not set" rows on a layer that writes two things is the same noise
  the owner objected to, in a quieter form. The checkbox is a second on/off control next to the
  eye, which is Photoshop's known two-switch confusion. Godot and VS Code users still misread
  unchecked rows. Tier 3 design.md already rejected "a checkbox" because it had no "not set"
  state; here the checkbox is the set bit and the value is separate, so that reason no longer
  holds, but the noise does.
- **graphty-element:** nothing beyond the shared base-look option.
- **App:** compact-mantine Checkbox with the label as its hit area; delete the placeholders.

## Option 4: two columns, "This layer" and "Result"

**Description.** Every core row has two slots. The left slot, "This layer", holds the editor
when the layer sets the property, or a "Set" button when it does not. The right slot, "Result",
is a read-only caption with no border: what the canvas draws for this layer's elements and the
name of the layer that decides it ("#3388FF - Everything"). A color in the Result column is
written as words only, never a swatch, so it is plainly a caption and not something to click.
This keeps every property visible and keeps the value beneath visible at rest, which people
asked Godot for, without ever putting it in the control slot. It borrows Cytoscape's separate
Default, Mapping and Bypass columns, with two columns instead of three.

**Selected**

```
+--------------------------------------------------------+
| (eye) Selected                                         |
|           This layer                  Result           |
|  Shape    [ Set ]                     Ico - Everything |
|  Size     [ Set ]                     1 - Everything   |
|  Color    [ Set ]                     varies - Degree  |
|  Halo     [## #FFD400] 2        (-)   this layer       |
|  Glow     [## #FFD400] 0.6      (-)   this layer       |
+--------------------------------------------------------+
```

**A Degree-colored layer**

```
+--------------------------------------------------------+
| (eye) Degree                                           |
|           This layer                  Result           |
|  Shape    [ Set ]                     Ico - Everything |
|  Size     [ Set ]                     1 - Everything   |
|  Color    [||| by Degree] (unlink)(-) this layer       |
+--------------------------------------------------------+
```

- **Everything:** the left column fully set. Where a higher layer covers it, the Result says
  so: Color reads "covered - Degree", so a reader sees at once why changing Everything's color
  changes nothing on screen. Eye as above.
- **Selected:** "Set" buttons on the core rows; the Result column shows what selected nodes end
  up looking like.
- **Hovered:** "Set" everywhere on the left; on the right, "nothing hovered: as Everything"
  (the `readOver: "everyElement"` case of `agreement`).
- **Values that vary with the data:** the pill on the left; "varies - Degree" on the right.
- **Mixed values:** the Result reads "Mixed" with a count, and hovering lists each deciding
  layer. With several layers selected, the left slot reads "Mixed" or "Set on 2 of 3".
- **Clearing:** the minus clears; the "Set" button returns. "Set" adds the property prefilled
  from the Result.
- **Finding the source:** at rest, in the Result column. Clicking or pressing Enter on a source
  name selects that layer in the tree.
- **Accessibility:** each row is one group: "Node color, not set in this layer, button Set.
  Result #3388FF from Everything." The Result is reachable but read-only.
- **Precedents:** Cytoscape's style columns, the Chrome DevTools Styles and Computed panes side
  by side. The two-column row is invented.
- **Costs and risks:** the closest option to the rejected design, because a value still sits on
  the same line as an unset row; its defense is a separately labeled, borderless column. It is
  wide: at today's sidebar width the Result caption must truncate, with the full text on hover.
- **graphty-element:** nothing beyond the shared base-look option; `agreement` already returns
  the value and the deciding layer.
- **App:** a two-column row layout; all captions are app words over `agreement` facts.

## Option 5: a "stack strip" on unset rows (invented)

**Description.** All seven core rows stay in fixed positions. An unset row shows no value at
all. Where the value would be, it draws a stack strip: one small mark for each layer that
writes this property on this layer's elements, topmost first. The winning layer's mark is
filled, covered layers are hollow, and this layer's own position is an empty ring. The strip
answers "who decides this here?" without showing anything that looks like a set value. Hover
or focus gives the value and the layers in words; clicking a mark selects that layer in the
tree; clicking the empty ring sets the property here, starting from the winning value.

**Selected**

```
+------------------------------------------------+
| (eye) Selected                                 |
|  Shape  ( )-[#]           Everything           |
|  Size   ( )-[#]           Everything           |
|  Color  ( )-[#]-[ ]       Degree, Everything   |
|  Halo   [## #FFD400]  width [ 2  ]         (-) |
|  Glow   [## #FFD400]  amount [0.6]         (-) |
+------------------------------------------------+
```

**A Degree-colored layer**

```
+------------------------------------------------+
| (eye) Degree                                   |
|  Shape  ( )-[#]           Everything           |
|  Size   ( )-[#]           Everything           |
|  Color  [||||| by Degree     ] (unlink)    (-) |
|         covers Everything on 52 of 52          |
+------------------------------------------------+
```

- **Everything:** all rows set; a strip appears only under a row a higher layer covers ("Color:
  covered by Degree on 52 of 52"). Eye as above.
- **Selected:** Halo and Glow set; strips on the core rows.
- **Hovered:** seven strips, no values: plainly "this layer decides nothing".
- **Values that vary with the data:** the winning mark carries a tiny ramp; a set row shows the
  pill.
- **Mixed values:** when different layers win on different elements, each winner is a filled
  mark whose width is its share (a bar split 60/40). There is no "Mixed" inside a field,
  because there is no field.
- **Clearing:** the minus clears; the strip returns.
- **Finding the source:** at rest, by name and position; exact values on hover.
- **Accessibility:** the strip is one tab stop, described "Node color, not set here. Decided by
  Degree on 40 nodes, Everything on 12." Arrow keys move between marks, Enter selects that
  layer, and S sets the property here. Meaning never rests on filled versus hollow alone: the
  layer names are written beside the strip.
- **Precedents:** none direct; it borrows the filled and hollow markers of the After Effects
  timeline and the covered-rule strikethrough of DevTools.
- **Costs and risks:** a new glyph to learn, and the strip could still be read as a control.
  Its strength is fixed row positions, which the tier 1 Size finding argued for.
- **graphty-element (additive):** a new method, `styles.writers(scope, channel)`, returning
  every layer that writes the property on any element in the scope, topmost first, with its
  count and whether it wins. Neither `agreement` (winners only) nor `counts` (one layer at a
  time) answers this in one call; it reuses the walk `explain` already does.
- **App:** the strip component, its words and its keyboard handling.

## Option 6 (pairs with any of 1 to 5): "Full look", "Why this look" and "Show only this layer"

**Description.** Three read-only ways to see where a look comes from, so the layer panel never
has to. A switch in the layer header, "This layer" or "Full look", turns the panel into a
read-only list of every property's resolved value for the layer's elements, each with its
source; nothing in it is editable, so nothing can be mistaken for a value the layer sets.
Selecting a node opens "Why this look", which lists each property's winning value and layer,
with the layers it beat beneath it, struck through. And an S button on each layer row ("Show
only this layer", like solo on an audio mixer) draws the graph with only that layer while held
or toggled on: solo Selected and only the selected nodes appear, as neutral spheres with their
halos; solo Hovered and the canvas is empty, which is correct.

**Selected, with "Full look" on**

```
+------------------------------------------------+
| (eye)(S) Selected   [This layer | Full look]   |
|  Full look of selected nodes                   |
|   Color   #3388FF          from Everything     |
|   Size    1                from Everything     |
|   Shape   Icosphere        from Everything     |
|   Halo    #FFD400          this layer          |
|   Glow    #FFD400          this layer          |
+------------------------------------------------+
```

**A Degree-colored layer, and "Why this look" for one node**

```
+------------------------------------------------+
| (eye)(S) Degree     [This layer | Full look]   |
|   Color  [||||| by Degree     ] (unlink)   (-) |
|   Not set here:  Size  Shape  Label            |
+------------------------------------------------+
| Why node "Alice" looks like this               |
|   Color   #2A788E (degree 7)   Degree          |
|           #3388FF              Everything (covered) |
|   Halo    #FFD400              Selected        |
|   Shape   Icosphere            Everything      |
+------------------------------------------------+
```

- **Everything:** Full look shows its own values except where covered ("Color: varies, from
  Degree"). Solo Everything shows the base look alone. Its eye and solo compose like mixer
  controls: solo shows one layer, the eye removes one layer.
- **Selected and Hovered:** solo makes each one's effect visible on the canvas (or its absence).
- **Values that vary with the data:** the inspector gives the element's value and its data
  ("#2A788E (degree 7)"); Full look reads "varies, from Degree".
- **Mixed values:** in Full look, a property decided by different layers on different elements
  reads "Mixed" and expands into each layer with its count. With several nodes selected, the
  inspector does the same per property.
- **Clearing:** not applicable; all three views are read-only.
- **Finding the source:** this is the source view. Clicking a source name selects that layer.
- **Accessibility:** the switch is a two-option radio group; S has `aria-pressed`; inspector
  lines read "Node color, #2A788E, from Degree; covers Everything", so "covered" is never
  conveyed by the strikethrough alone.
- **Precedents:** After Effects' Reveal Modified Properties, Chrome DevTools' Computed pane,
  Word's style-source display, mixer solo buttons.
- **Costs and risks:** two read-only views and one button, all small. Solo is a temporary view
  state that must clearly end (it does not save and is not undoable).
- **graphty-element (additive):** Full look and the inspector use `agreement` and `explain`; if
  `explain` does not list the covered writers, it gains an optional `covered` field. Solo needs
  a transient `styles.solo(layerId | null)` that draws only that layer, not saved and not
  undoable, like hover; under the shared base-look rule it is the same as hiding every other
  layer, so it adds little new mechanism.
- **App:** the switch, the inspector panel, the S button and all their words.

## Option 7 (pairs with any): a "sets N" count in the layer tree

**Description.** Each row in the layer tree carries a small count of the properties the layer
sets, with the list on hover or focus. The reader learns what a layer does without opening it,
and an empty Hovered layer is visibly empty in the tree itself.

```
  (eye) Hovered        --
  (eye) Selected        2     (hover: Halo, Glow)
  (eye) Degree          1     (hover: Node color by Degree)
  (eye) Everything      7
```

- **Everything, Selected, Hovered:** 7, 2 and "--" ("sets nothing") at rest.
- **Values that vary with the data:** the hover list says "by Degree".
- **Mixed values, clearing:** not applicable; the count updates on every set and clear.
- **Finding the source:** not its job.
- **Accessibility:** the count is part of the row's name: "Selected, sets 2 styles: halo,
  glow".
- **Precedents:** InDesign's "Body+" style marker and its hover summary, Photoshop's fx badge.
- **Costs and risks:** one more number in a dense tree.
- **graphty-element:** none; the list comes from the layer's own spec.
- **App:** the count and its tooltip.

---

## Considered and not offered

- **Stronger marking on today's layout** (Unity's bold label and bar, Blender's tinted field,
  a dashed "Not set" box beside the inherited value, Webflow's colored labels): every unset
  property still occupies a control-shaped box next to a value, which is the family rejected
  twice. Unity and VS Code show the confusion survives strong marking.
- **Rows ordered by what the layer is for** (effects first for Selected and Hovered, the bound
  property first for a data layer): it treats layers differently by where they came from, which
  the layer model forbids.

## Recommendation

**Option 1, with Options 6 and 7, and Everything owning the base look.**

- A layer shows only what it writes, so nothing on the panel looks set that is not set.
  Selected shows exactly its halo and glow, Hovered plainly sets nothing, and Everything
  plainly holds the base look and its eye hides it.
- Every core property is still named on every layer and one click away, which answers the tier
  1 discovery failure.
- The value beneath is available on demand and labeled with its source, and the full picture
  lives in read-only views (Full look, Why this look, Show only this layer) that cannot be
  mistaken for settings.

If the owner wants every property visible at rest, Option 4 is the fallback (the value beneath
in its own labeled column), then Option 5 (fixed rows with no values at all, at the cost of one
additive method). Option 3 is the most familiar but keeps the noise.

The graphty-element changes under the recommendation are all additive: the `styles.base:
"editable"` option with its "not written, not drawn" rule and `unstyled` fact, and the
transient `styles.solo`. Everything else is app work over `agreement`, `explain`, `counts` and
each layer's own spec.

## How this answers the rest of the 2026-10-13 feedback

- **The eye on Everything hides nothing:** fixed by Everything owning the base look.
- **The legend shows "glow: selected" and "halo: selected":** with one block per layer, the
  legend reads "Selected: halo and glow".
- **The gradient popover's "Use one color":** removed; the unlink icon beside the value pill is
  the only path, labeled "Use one color" on hover and focus.
- **The selected node's highlight is gray, not yellow:** a separate bug. The app sets yellow
  with `session.styles.setHighlightColor`, and the element draws the selection highlight from a
  selection mask outside the layer stack; the yellow is not reaching the renderer. It needs its
  own fix in graphty-element, independent of this choice.

---

## Recommendation after the reviews (2026-10-13)

Four reviewers drove the Storybook mocks of every option with real clicks and keys: a first-time
reader, a returning analyst, a Figma and Photoshop user, and a keyboard and screen reader user.
Each scored every option 1 to 5 on five criteria (understood at a glance, never misread as a
value, speed of common edits, consistent with the eye on other rows, fits the layer model), so
the best possible total is 25. The table gives the average of the four totals.

| Rank | Option                          | Average of 25 | Verdict                                                                                               |
| ---- | ------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------- |
| 1    | 1 Named add buttons             | 21.75         | Best of the base options for all four reviewers: nothing unset looks set, one click to add            |
| 2    | 6 Full look, Why, Solo (add-on) | 21.0          | The clearest explanation of where a look comes from; costs extra tab stops and has focus bugs         |
| 2    | 7 Sets N count (add-on)         | 21.0          | Shows what each layer does without opening it; the number needs a unit and an accessible name         |
| 4    | 2 Add style menu                | 19.25         | Never misread, but every add takes two clicks and the property names are hidden at rest               |
| 5    | 4 This layer and Result         | 16.5          | Answers "what will it look like" at rest, but its captions are cryptic and hidden from screen readers |
| 6    | 3 Includes checkbox             | 15.75         | Brings back the "Not set" noise and a second on/off switch beside the eye                             |
| 7    | 5 Stack strip                   | 14.0          | Its marks look like empty fields and fail target size; its "covered by" caption is worth keeping      |

Stories: https://dev.ato.ms:9048/?path=/story/mocks-set-vs-inherited--option-1 (and `option-2`
to `option-7`, and `overview`).

### What to build

**Option 1, with Option 7 and the inspector half of Option 6, Everything owning the base look,
and five fixes the reviews found.**

A layer shows a row only for what it writes, so the confusion the owner reported cannot happen:
nothing on Selected looks like a node color, Hovered says "Sets nothing yet", and Everything
visibly holds the base look. Every core property is still named on every layer and is one click
away, which keeps the tier 1 finding that readers could not find Size behind a "+". All four
reviewers ranked it first, and the two lowest-scoring parts of it (consistency, glance) are
fixed by the add-ons and the fixes below rather than by a different layout.

The fixes, each found by at least two reviewers:

1. **"Covered by" caption (from Option 5).** Under any set row that a higher layer overrides on
   some elements, a caption reads "Covered by Degree on 77 of 77". Without it, a reader edits
   Everything's color, sees nothing change and decides the panel is broken. This was the single
   most damaging observation in the reviews.
2. **Adding a property over a data-bound value starts from one plain value.** Today adding Color
   to Selected copies Degree's "by Degree" mapping, so a reader who wanted yellow must find the
   unlink first. The add starts from one color (the most common value beneath), and the mapping
   is offered as a choice, not the default.
3. **Multi-edit never puts another layer's value in a field.** With Selected and Key people both
   selected, Size showed Key people's "2" although Selected sets no size, and typing quietly
   added a size to Selected. A row set on only some selected layers reads "Set on 1 of 2" with
   an empty field.
4. **The count in the tree has a unit and is in the row's name.** "2 styles", not "2" (which read
   as "2 people"), and the row is announced "Selected, sets 2 styles: halo, glow".
5. **Keyboard and focus.** The source text ("Now #3388FF, from Everything") shows on keyboard
   focus as well as hover; focus never drops to the page after a clear or undo; Ctrl+Z works
   anywhere outside a text field; the panel's layer name is a heading; adds and clears are
   announced in a live region.

Option 6: build "Why this look" (the per-node inspector) now; every reviewer called it the
clearest explanation in the mocks. Defer Full look and the Solo button until the tree's tab
stops are reduced, because Solo doubled them and Full look lost focus; Solo is the same
mechanism as hiding every other layer, so it costs little to add later.

### The eye on Everything under this recommendation

Everything holds the seven base values, set, and nothing sits beneath it. Clicking its eye hides
everything it paints, which with the default layers is the whole graph: the canvas goes empty,
the same as the eye on any other layer removing that layer's look. If a higher layer is visible
and writes some elements (Degree, say), those elements stay drawn with that layer's look over
the renderer's neutral values, which shows plainly what that layer does on its own.

Every eye in the tree is drawn at rest, not only on hover, so a reader looking for "hide
Everything" finds it; a hidden layer's eye is named "Show <layer>".

### What changes in graphty-element (all additive, no default changes)

- `createSession({ styles: { base: "editable" } })`. The default `"locked"` keeps today's two
  locked "Node defaults" and "Edge defaults" layers. `"editable"` seeds the same values into one
  ordinary bottom layer that can be edited, hidden and cleared, but not deleted or moved
  (`E_PROTECTED`); its default name is a catalog `plainName`.
- Defined behavior when nothing visible writes an element: it is not drawn. A channel nothing
  writes on a drawn element takes the renderer's documented neutral value, and `explain`,
  `agreement` and `legendOf` report the fact `{ code: "unstyled", params: { channel } }`.
- The "covered by" caption needs, for one layer and property, how many of the layer's elements a
  higher layer overrides and which layer. If `counts(id)` and `agreement` cannot answer it in one
  call, `counts` gains an optional `coveredBy` breakdown.
- If `explain` does not already list the covered writers, it gains an optional `covered` field
  (for "Why this look").
- `npm run api:report`, with the report committed.
- Separately, not caused by this choice: the selection highlight is gray because the color the
  app sets with `session.styles.setHighlightColor` does not reach the renderer. That is an
  element bug with its own fix.

### What changes in the app

- Passes `base: "editable"`, shows the element's bottom layer as the Everything row, and drops
  its own nearly empty Everything layer.
- The new layer panel: set rows with their minus, the "Not set here:" line of compact-mantine
  Chip or subtle Button names, "More styles", "Sets nothing yet", the "Covered by" caption, and
  "Set on 1 of 2" for multi-edit. The gray placeholders and italics are deleted.
- The tree's "N styles" count, eyes visible at rest, and "Why this look" for a selected node.
- The gradient popover loses "Use one color"; the unlink icon beside the value pill is the only
  path, labeled "Use one color" on hover and focus.
- The legend shows one block per layer ("Selected: halo and glow").
- Tier 3 design.md section 1.1: the "always seven rows" rule and its "Rejected: a row must be
  added before it can be set" note are reversed.
- Shared component fix in compact-mantine: `CompactColorInput` names its swatch and hex field
  after the property ("Halo color"), not "Color swatch".

### Decisive evidence

- Every reviewer confirmed Option 1 shows nothing as set that is not set: Selected shows only
  Halo and Glow, and Hovered reads "Sets nothing yet".
- Options 3, 4 and 5 were each misread or failed accessibility: Option 3's seven "Not set" rows
  and 12 px checkboxes, Option 4's Result values skipped by a screen reader and 14 px links,
  Option 5's white marks read as empty fields and clicked like them.
- Option 2 never misled anyone, but hid the property names, which repeats the tier 1 discovery
  failure, and Size was unreachable by Tab without opening the menu.
- Three of four reviewers independently named the "covered by" caption as the fix Option 1
  needs; without it, editing Everything's color changed nothing on screen and nothing said why.
