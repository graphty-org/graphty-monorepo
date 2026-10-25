# Owner feedback 1: answers from information architecture

Answers to the owner's three points on the tier 3 style panel (`tier3/owner-feedback-1.md`),
judged by one home per job and by every row behaving the same way.

## 1. Unsetting a field

A field on a layer has three states, each with its own look at rest:

| State          | At rest                                                     | Meaning                   |
| -------------- | ----------------------------------------------------------- | ------------------------- |
| Not set        | the value from beneath as gray placeholder; no minus        | the layers beneath decide |
| Set            | the value in normal text (a pill when derived), and a minus | this layer paints it      |
| Set to nothing | "None", "Hidden" or "No label" in normal text, and a minus  | this layer turns it off   |

Unsetting returns to "not set". Turning something off is a value, never the same control.

**One command: the minus.** Every set field has a minus at the row's end, always drawn, and only
set fields have one, so the right edge of the panel is the at-rest list of what this layer writes.
Gray text alone would rely on color (WCAG 1.4.1). A set rare property is drawn as its own row
(decision 1.1), so no set value hides in a popover.

**Every field kind, the same way:**

- Number, color, text: the minus, or empty the field and press Enter (empty means not set).
- Select (shape, arrow, pattern, the two-word yes-or-no selects): the minus, or the list's first
  option, "Not set (beneath: Sphere)", above "None" where one exists.
- Binding: the minus removes it and the field returns to not set. "Fix at <value>" stays in the
  binding popover for the other job, derived to fixed.
- Label and effect entries: the minus removes the entry and a label from beneath shows again; to
  hide that label, add an entry whose source is "No label".

**Keyboard and screen readers.** The minus is the tab stop after its field. The field's name gives
its state ("Node color, set here, #D55E00" / "Node color, not set here, from Degree"); the minus's
name gives what comes back ("Clear node color; beneath: Mixed, from Degree and Louvain").

**What comes back.** Before: hovering or focusing the minus shows the value beneath and the layer
painting it, from graphty-element's `styles.agreement({ below })`, already planned; "Mixed" lists
up to three layers. After: that value is the placeholder, the canvas repaints, Undo restores.

Rejected: an eye per field (a second way to let beneath show through, in the same row); "reset
all" on a layer (delete or Undo does it).

## 2. Split parent: replace it

Even as a command on any layer, split adds two row kinds that behave like neither a layer nor a
folder: refused drops, children that move only among siblings, a read-only child rule, Follow
parent, a search inside the tree. Each is a rule learned for one row type. Recommend the owner's
second path, built from three mechanisms that each have other uses:

1. **Per-value entries in the ordinary binding.** The categories popover already lists each value
   with chit, name, count and eye. Recoloring community 3 edits its chit, a value-table entry on
   the same layer; a palette change still reaches every value not overridden. Any categorical
   value works: a data column, a run's result, a binned number.
2. **"New layer for <value>"** on each category row (binding popover and Values tab), the same door
   as "New layer from selection": an ordinary layer above, rule "<field> is <value>", for per-group
   size, labels or effects.
3. **Editing several rows at once.** Select rows in the tree (compact-mantine's `Tree` already
   multi-selects); the Style tab heads "3 layers", shows shared properties or "Mixed", and a write
   goes to all as one undo step. Figma's multi-selection, serving every layer.

The tree keeps two row kinds, layer and folder. A community result is one ordinary layer with a
scheme; nothing is generated, so 500 communities never flood the tree.

What graphty-element still owes, generically: when a re-run renumbers arbitrary labels, a
value-table entry or rule leaf naming a label follows its group by member overlap, and an
unmatched group comes back as a code. A hand layer reading "community is 3" needs the same, so it
is a rule capability, not a row type. The split units shrink to this.

Lost, and accepted: a tree row per community with its own lock. The eye moves to the category row.

## 3. Figma consistency pass

Sources: the Figma help articles linked below; the local capture of Figma's right sidebar,
`design/ui/figma/right-sidebar-selection/README.md` (main checkout, not in git), sections 5, 15,
17, 22 and follow-up 5 and 8; `compact-mantine/design/figma-spec.md`.

| Figma pattern                                                                                                                                                                               | Verdict                    | Graphty form, reason                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "+" and "-" on lists (Fill, Effects, Export)                                                                                                                                                | adopt                      | Text, Effects, conditions, value tables; removing a Figma paint shows what is beneath, as our minus does                                                    |
| Clicking an empty section title adds an entry (capture 5)                                                                                                                                   | adopt                      | Text and Effects headings                                                                                                                                   |
| Effect row: icon and name open settings; eye and minus (capture 17)                                                                                                                         | adopt                      | list entries open settings from the entry, no extra button                                                                                                  |
| Settings icon at a row's start (layout guides, capture 22)                                                                                                                                  | adopt                      | rare properties, as designed                                                                                                                                |
| Eye per entry                                                                                                                                                                               | adopt for list entries     | rejected on one-value fields (section 1)                                                                                                                    |
| "Mixed"; typing overwrites all                                                                                                                                                              | adopt                      | multi-row editing; a placeholder "Mixed" means the elements differ, typing makes them one                                                                   |
| "Click + to replace mixed content"                                                                                                                                                          | adopt                      | lists under multi-row editing                                                                                                                               |
| Sections absent, not disabled                                                                                                                                                               | adopt                      | hide the Nodes or Edges group                                                                                                                               |
| Apply variable: in-field glyph on hover, search, groups, compatible only, value at right ([variables](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma)) | adapt                      | the vary picker; right column shows range or distinct count; misfits fold into one "N fields do not fit" row with reasons, so a missing column is explained |
| Bound pill, hover Detach (`VariablePill`)                                                                                                                                                   | adapt                      | Detach becomes "Fix at <value>", naming the value, since a binding paints many                                                                              |
| Instance overrides and reset ([overrides](https://help.figma.com/hc/en-us/articles/360039150733-Apply-overrides-to-instances))                                                              | adapt                      | placeholders show beneath; the minus is the reset, drawn at rest                                                                                            |
| Text styles; editing detaches ([text styles](https://help.figma.com/hc/en-us/articles/360039957034-Create-and-apply-text-styles))                                                           | adapt                      | a label look keeps its name plus "Edited" and Reset; the element stores look plus changes                                                                   |
| Selection colors: 3 chits and "+N", editable in place ([mixed colors](https://help.figma.com/hc/en-us/articles/360042553434-View-and-adjust-colors-in-a-mixed-selection))                   | adapt                      | folder panel and a selection's Values tab; a chit opens the layer that paints it, the one home                                                              |
| Frame versus group ([frames and groups](https://help.figma.com/hc/en-us/articles/360039832054-The-difference-between-frames-and-groups))                                                    | reject                     | that is the split parent; folders stay groups                                                                                                               |
| "+" adds a default entry at once ([fills](https://help.figma.com/hc/en-us/articles/360041003694-Guide-to-fills))                                                                            | reject                     | a default repaints every element the layer reaches                                                                                                          |
| Booleans as switches                                                                                                                                                                        | reject                     | no "not set" state                                                                                                                                          |
| No sticky titles (follow-up 8)                                                                                                                                                              | reject for Nodes and Edges | "Color" is in both groups; the heading tells them apart                                                                                                     |
| Gradient as a paint type in the color picker                                                                                                                                                | reject                     | "vary by" would get a second door, for color only                                                                                                           |
