# Owner feedback 1: answers from interaction design

Answers to the owner's three points on the tier 3 style panel design (`tier3/design.md`).

## 1. Unsetting a field

A layer covers the layers beneath it only where it sets a value. Unsetting means "stop covering":
the field goes back to empty and the elements show what the layers beneath give them. That is a
different act from setting a value that blocks: "None" arrowheads, Show "Hidden", and a Text entry
set to Hidden (`labelStyle.enabled: false`, which already hides words a lower layer wrote) are
values, and they cover.

**At rest, set and inherited differ by two cues, never by color alone.** A set field shows its
value in primary text and has a minus at the row's end. An inherited field is empty, its
placeholder the value beneath in secondary text (or "Mixed"), with no minus. The accessible name
says the same: "Node color, set here, #D55E00" against "Node color, not set, Degree gives #3388FF".

**One gesture for every kind of field.** The minus, always in the tab order right after its field,
clears a number, color, glyph select, two-word select, a derived value (the whole binding) or a
list entry (a label, an effect). From the keyboard: empty a number or text field and press Enter or
Tab; press Delete or Backspace on a focused select, color chit or value pill. Label settings drop
"Edited" and Reset: each changed field there gets the same minus, back to the look's value, so the
panel has one way to take a value back.

**Before unsetting, the reader sees what comes back.** Hover or focus on the minus shows a tooltip
with a chit and the source: "Clear: Degree gives #3388FF" or "Clear: 3 values beneath". It is read
from graphty-element's `styles.agreement` below this row, which must also name the row that gives
the value (an additive `from` field). No live canvas preview: a hover that repaints the graph is a
change nobody committed.

**After unsetting:** the canvas and legend repaint at once; focus moves to the field, because its
minus is gone; the field shows the value beneath as its placeholder; one undo step, "Clear node
color".

**Lists show what they inherit, as fields do.** An empty Text or Effects list shows each entry a
lower layer writes as one secondary line ("Glow, from Selected") with no minus. Clicking the line
adds an entry on this layer that starts from those values.

## 2. The split parent: replace it with a folder of ordinary layers

The split parent is a third row type with rules of its own (refused drops, Follow parent,
Unsplit), and the unset rule above removes the reason for it. The
model asks that a palette change reach every group the reader has not overridden. That already
happens if the group layers sit **above** the original layer and set nothing until the reader
changes them: an empty field falls through to the original layer and its palette.

**Split into layers becomes a command, not a row type.** On any layer with a categorical or binned
derived property it makes, in one undo step:

```
v Louvain                      folder
    Community 1 ... 6          ordinary layers, rule "group is N", nothing set yet
    Louvain                    the original layer, unchanged, last in the folder
```

- Every row is a layer or a folder: two row kinds, two glyphs.
- A group's empty fields show its palette color as the placeholder. Overriding is setting a field;
  following the palette again is the minus. No special words or commands.
- A palette change edits the original layer and reaches every group without an override.
- Changing several groups at once is multi-selection: Shift or Control-click rows, edit them
  together, "Mixed" where they differ (section 3).
- A group dragged out of the folder keeps working as an ordinary layer. Dragged below the original
  layer it is painted over, and the tree says so, as for any layer.

**It is reusable.** The same command splits a data column ("country", an edge "relationship"
column), a minimum cut's sides, k-core shells or degree in steps, on node or edge layers.

**graphty-element (additive):** keep a layer that sets nothing (refused today), so group layers and
the Add layer draft are both ordinary element rows; a `split` call that builds the folder and its
layers; and a rule on an arbitrary label (a community id) that follows its members across a
re-run, for any layer. The style tree loses the split parent and split child kinds. A new value
after a re-run is painted at once by the original layer's palette; Split again adds layers only
for values that have none.

**Given up:** a group's rule is copied from the original layer at split time, so a later change to
the original's which-elements does not reach the groups.

## 3. Figma consistency pass

Sources: the repository's capture of the Figma editor (`design/ui/figma/components.md` sections 22,
28, 31 and 44; `design/ui/figma/flows.md`) and Figma's help center on instance overrides
(https://help.figma.com/hc/en-us/articles/360039150733-Apply-overrides-to-instances), mixed
selection colors
(https://help.figma.com/hc/en-us/articles/360042553434-View-and-adjust-colors-in-a-mixed-selection),
variables (https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma) and
effects (https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers).

| Figma pattern                                              | Verdict | Why                                                                                              |
| ---------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| "+" on a section header, "-" on each list row              | Adopt   | Already the rule: "+" only on lists.                                                             |
| Effects "+" opens a type menu, then the entry's settings   | Adapt   | Picking opens the value picker and writes nothing until a value is chosen.                       |
| Clicking an empty section title adds an item               | Reject  | A second, unlabeled door to "+".                                                                 |
| Settings icon at the start of a row                        | Adopt   | Home of the rare one-value properties.                                                           |
| Eye on each fill or effect row                             | Adapt   | List entries only. On one-value fields "set but off" would be a third state.                     |
| "Mixed" in a field; multi-select rows and edit together    | Adopt   | Multi-row editing, and the placeholder when the layers beneath differ.                           |
| Selection colors: every color in the selection, edit one   | Adapt   | A folder or multi-row selection lists the colors its layers set; editing one edits every setter. |
| Apply variable button at a field's end, on hover and focus | Adopt   | The vary glyph's place; its picker has search, groups, compatible values only.                   |
| Variable pill inside a bound field                         | Adopt   | The derived row's value pill (compact-mantine `VariablePill`).                                   |
| Detach on a bound field or a text style                    | Reject  | A derived property has a value per element, nothing single to keep; the minus clears it.         |
| Instance overrides: reset per property, overrides unmarked | Adapt   | Reset is the minus. We mark set fields: "what does this layer set" is the main question.         |
| Sections hidden by selection type, few collapse            | Adopt   | Supports hiding the group a layer cannot reach, and no accordions.                               |
| Frame and group as distinct row kinds                      | Adopt   | Layer and folder; the folder paints nothing.                                                     |
