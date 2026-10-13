# Owner feedback 1: answers from Figma's editor

The owner asked three things about the tier 3 style panel design (`tier3/design.md`): how a reader
unsets a field so a layer stops covering the layers beneath it, whether the "split parent" row may
exist, and whether the panel stays consistent with Figma's right sidebar. Figma sources are the
help center and the repository's capture of the Figma editor, `design/ui/figma/` ("the capture").

## 1. Unsetting a field

- **Paint rows** carry a minus that is always visible, not on hover (the capture,
  `components.md` section 28). A row that exists is set; the minus is the mark.
- **Instances** show the main component's value until it is overridden, and an override is undone
  by Reset, per property or all at once
  (https://help.figma.com/hc/en-us/articles/360039150733-Apply-overrides-to-instances).
- **Multi-selection** shows "Mixed" when values differ (capture, `components.md` section 22).

**Recommend** the same grammar on every field:

1. **At rest, set and inherited look different two ways.** A set field shows its value in primary
   text with its minus beside it, always visible. An inherited field shows the beneath value in
   secondary text (Figma's empty-title color, `#00000080`) and has no minus. Two cues, never
   color alone.
2. **The minus everywhere, plus one key per field kind.** Text fields (number, hex, typed
   words): empty the text and commit. Other controls (selects, glyph grids, color chit, value
   pill): Delete or Backspace while focused and closed. The minus is a 24 px button in the tab
   order right after its field. A list entry's minus removes it, as Figma removes a fill.
3. **Say what comes back before the click.** The minus's tooltip and accessible description name
   the value and the layer that will supply it: "Clear: back to Icosphere, from Everything" or
   "Clear: back to mixed, from 3 layers". graphty-element already has the fact:
   `styles.agreement(scope, channel, { below })` returns the value and its `layerId`, or a mixed
   breakdown.
4. **After the click** that value becomes the placeholder, the canvas repaints, and one Undo
   restores it. No confirmation.
5. **One word.** Figma says Reset on an instance and Remove on a list; graphty has one mechanism,
   so **Clear** on every minus and **Clear all** in the row menu, which replaces a split child's
   "Follow parent" (see 2).

## 2. Is "split parent" a new row type?

Figma has exactly this shape already, and does not treat it as a third thing: a **frame** is a
row with children that also has its own fills; a **group** is a row with children that paints
nothing (https://help.figma.com/hc/en-us/articles/360039832054-The-difference-between-frames-and-groups).
Both expand, rename, hide, lock and drag alike; only their right panel differs. An **instance**
inherits from its main component, stores only overrides, and refuses layers dropped into it.

**Recommend: two row kinds, layer and folder. "Split" is something any layer can be, not a kind.**

- **A split layer is an ordinary layer that has children**: the same glyph as any layer, a
  disclosure chevron, the same panel. Drop the split and split-child glyphs from section 2.1;
  children keep their color chit, which is their value, not their kind.
- **A child is an ordinary layer** whose "beneath" is its parent. Its unset fields show the
  parent's value as the placeholder; its minus clears an override back to the parent. One rule:
  an empty field shows what you get from below.
- **Every row gesture is shared.** The one difference (children move only among siblings;
  nothing drops into a split layer) is Figma's instance rule, refused with its reason.
- **Reuse is the condition for keeping it.** Split into layers must work on any layer whose
  property derives from a categorical value or a value cut into steps: a run's communities, a data
  column (department, edge type), degree in five steps. The build acceptance already splits a data
  column; add a binned number so it is tested beyond communities.
- **Kept rejected:** a folder of independent layers instead of split: a palette switch would no
  longer reach untouched groups, which the settled model requires. Editing several ordinary
  layers at once is still worth having, on folders (adopt item 7).

## 3. Figma consistency pass

From the capture's right sidebar (`right-sidebar-selection/README.md` sections 4, 5, 15, 22, 24;
`components.md` sections 22, 28, 31).

**Adopt**

1. **"Mixed"** in any field whose beneath value differs across the layer's elements; typing over
   it writes one value. Already in decision 1.1.
2. **The bound field**: a derived value is a pill inside the field (section 31); the vary glyph
   sits at the field's right end on hover and focus, where Figma puts "Apply variable".
3. **An eye per list entry** (labels, effects), as on Figma's fill and effect rows; for labels it
   is the element's existing `enabled` field. Single-value rows get none: Clear and Undo cover it.
4. **A settings button at the row's start** (section 22). Already in the design.
5. **40 px section titles with actions at the right**; clicking an empty Text or Effects title
   opens its "+" menu, as Figma's empty Fill title adds a fill (section 5).
6. **The selection type row** (section 4): name, then 24 px actions. Put "Select what it
   paints" there, as Figma's "Select matching layers". **Remove the eye and lock from the panel
   header**: Figma keeps them on the layer row, and two controls for one state are a defect.
7. **Selection colors on a folder** (section 22): the title, up to three round swatches and
   "+N"; a click expands to one color row per color; editing a row rewrites that color in every
   layer of the folder that writes it, in one undo step (an additive element change if missing).
   It replaces the folder panel's three chits.
8. **Fixed section order** whatever the layer writes (section 24), and popovers that open to the
   left of the panel, 240 px wide, one at a time.
9. **The apply-variable picker** for "vary by" (decision 1.5).
10. **Text styles** for label looks, with Detach on hover turning a look into its fields
    (section 15's style row).

**Adapt**

- **Instance Reset** becomes Clear and Clear all, one word for layers and children (section 1).
- **Frame and group** become a layer with children and a folder: same gestures, different panels.

**Reject, with the reason**

- **Figma's Effects "+" adding a default entry at once.** A fixed value covers every layer
  beneath it, so a default repaints by surprise; the design's add-then-pick stays. Record it in
  `design/ui/framework/figma-crosswalk.md` section 4 as a departure.
- **Detach on a derived binding.** Detach keeps the current value; a derived property has one
  per element, so there is none to keep.
- **Components and variable modes as features.** graphty's reuse is split by value and label
  looks; a second inheritance system would compete with the stack.
