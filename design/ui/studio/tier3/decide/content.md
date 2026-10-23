# Unified style panel: the content designer's answers

The owner's twelve open questions on the unified style panel, answered from the words side:
options, a recommendation, and what graphty-element must add (all additive; the element returns
`{ code, params }`, the app writes every word). "Mock" is the style panel mock and
`design/ui/style-panel-organization.md` (pull request #2098); "catalog" is `tier3/style-catalog.md`.
Glossary rules that bind: a data column is an **attribute**, never "field", "property" or
"column" on screen (`design/ui/framework/glossary.md:107`); "preset" is a rejected word
(`glossary.md:187,209`).

## 1. "+" on settings that hold one value

- **A. Keep "+"** (mock 4.1): short, but "+" promises another one and there never is.
- **B. Every one-value setting always shown, empty until set.** The placeholder is the value
  it falls back to ("1", "Icosphere", "Normal"); clearing the field turns it back off. This is
  how Figma's Layer opacity and stroke weight behave: always there, never added
  (https://help.figma.com/hc/en-us/articles/360039832014-Design-prototype-and-explore-layer-properties-in-the-right-sidebar).
- **C. An on/off switch per row:** a control and a state word on every row.

**Recommend B.** Shape, Size, Color, Opacity, Width, Pattern, Curved, Head, Tail are rows,
never "+" items. Head and Tail are kind selects that include None. Yes/no settings (Wireframe,
Curved) are a `StyleSelect` of On and Off, because a switch has no "not set" state. Accessible
name: "Node size, not set, 1".
**Element adds:** nothing (`CHANNEL_DESCRIPTORS[c].default`).

## 2. Where "+" is right, and its menu

"+" is right only for lists: label entries, effects, rule conditions and value-table rows.

- **A. Type menu with icon and noun** (Outline, Glow, Halo; Label, Tooltip, Caption at target end).
- **B. Figma's way: add a default entry, then change its type** (Effects "+" adds a drop shadow,
  https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers). This paints
  before the reader chooses, which breaks the mock's rule that adding never repaints.
- **C. A color picker first:** skips the type, which is the first decision.

**Recommend A**, a dark Mantine `Menu`: a 16 px glyph and a noun per item, with no "Add" inside the
menu. The tooltip on "+" names the command ("Add effect", "Add label line", my 2026-10-03 name).
Color is a field of the entry once it exists.

## 3. Keeping a nodes-and-edges layer short

- **A. Nodes | Edges tabs:** short, but they hide half of what the layer does (the mock's
  objection).
- **B. Two collapsible group headings, each listing what it sets while it is collapsed:**
  "Edges: Color, Width, Head". compact-mantine's `ControlSection` already has `collapsible` and
  a `summary` shown only while collapsed (`ControlSection.tsx:91-110`).
- **C. Sticky headings:** the length stays.

**Recommend B.** Only the Nodes and Edges groups collapse; sections inside them never do. Both
start open, and the panel remembers each one per session. The summary keeps the mock's promise
that nothing a layer does is hidden.

## 4. A layer with no nodes, or no edges

- **A. Hide the group:** honest when the rule can never match that kind.
- **B. Show it disabled:** uniform, but a dead heading on every one-kind layer.

**Recommend A, with one exception.** Hide a group only when the rule cannot match that kind. When
it can but matches none right now (a route with no edges yet), show the group with the count in
its heading ("Edges, 0"). "Can never match" and "matches none now" are different facts.
**Element adds:** `styles.speaks(selector)` -> `{ nodes, edges }`, the halves `RuleTree`
already defines (`catalog/types.ts:1110-1120`).

## 5. The vary picker on wide data

The genomics persona joins 10 to 40 attributes.

- **A. A searchable list grouped as In use, Data and one group per run.**
- **B. Chips that filter by measurement level** (Categories, Numbers, Text).
- **C. Typing after "=" in the field, as Figma's variable picker works.**

**Recommend A, with C as its keyboard entry.** A `Popout` titled "Node color by", a
`SearchInput` "Find attributes" (the verb every list box uses), and `DataRow`s with a level glyph,
the name and one fact ("1 to 36", "6 values", "80% have a value"). Misfits stay listed, disabled,
with the reason.
**Element adds:** `AttributeDescriptor` already has level, counts, range, completeness, origin
and `usedBy` (`catalog/types.ts:985-1030`); missing is `styles.canBind(channel, path)` ->
`true` or `{ code, params }`.

## 6. A visual gradient for degree

The mock's ramp popover is about a dozen labeled fields (`StylePanelMock.stories.tsx:2270-2520`).

- **A. Keep the fields.** Precise, but reads as a form.
- **B. Histogram with the ramp under it and drag handles:** bars painted the color they get, two
  end handles for the domain, a middle handle for a diverging midpoint, ticks where steps cut.
- **C. A palette gallery of ramp strips** instead of palette names.

**Recommend B and C.** Handles are sliders in the attribute's own numbers (`aria-valuetext`
"Lowest 3, 12th percentile") and set the domain ends; the clamp and the typed fields stay below
as the keyboard path. At rest the row is still the ramp and two numbers. The handles go into
compact-mantine's histogram row, reusing `GradientEditor`'s slider handles
(`GradientEditor.tsx:23-25`).
**Element adds:** bins and counts for a given scale and domain, and a value's percentile.

## 7. Is the Louvain "folder" a style layer?

- **A. A split parent is a layer with children** (mock).
- **B. A non-painting folder of generated layers:** the scheme then has no home.
- **C. Folders that paint** their children.

**Recommend A.** It shows the layer icon with a split mark, never the folder icon, so "folder"
keeps one meaning: it never paints, as Figma groups carry no fills
(https://help.figma.com/hc/en-us/articles/360039832054-The-difference-between-frames-and-groups).

## 8. Picking "which elements"

- **A. One rule for both kinds** (mock): cannot say "nodes only".
- **B. A rule per kind:** one idea split in two.
- **C. A kind choice at the top (`SegmentedControl` Nodes | Edges | Both), then one rule.**

**Recommend C.** The rule reads as one sentence with its count: "Nodes where group is 3, and the
edges between them. 12 nodes, 30 edges". With Both, edges default to the glossary's "induced"
(the edges between the matched nodes, `glossary.md:79`). The kinds of rule are Every, Where an
attribute, Top N by, In a set, and Selected now.
**Element adds:** a layer that paints both kinds, as recorded in the agreed model.

## 9. Does the mock cover every style?

Nearly: 34 of 35 channels (`node.marker` draws nothing), the label look fields, badges and
graph keys. Gaps: the six rich-text tags work in label words but nothing tells the reader
(catalog 5.5); Graph settings has no lighting, though studio lighting is the default; gradient
fills have no channel. **Recommend** a words table keyed by channel id and a test that walks
`CHANNEL_DESCRIPTORS` and `LABEL_STYLE_FIELDS`, failing on any without a screen name.

## 10. Complex text labels

- **A. A pop-out with grouped settings** (mock 4.7: Type, Box, Letters, Placement, Motion, Badge).
- **B. Named label styles, applied by picking, like Figma's text styles**
  (https://help.figma.com/hc/en-us/articles/360039957034-Create-and-apply-text-styles).
- **C. Everything in place:** too long.

**Recommend B on top of A.** The pop-out opens with a "Label style" `StyleSelect`, then the
groups; a field changed after picking marks the entry "Edited", with a reset. The noun is
**label style**, the element's own `labelStyle`; add it to the glossary.
**Element adds:** named `LabelStyle` bundles with `plainName`, seeded from the nine badges
(`BadgeStyleManager.ts:3-117`); the reader's own save in the project.

## 11. Picking nodes for a hand-made layer

- **A. Selection and Find make a set** ("Create set"), and the layer's rule is "In set <name>".
- **B. A rule builder whose steps read as sentences:** "[name] [contains] [Bob]", the same step
  form as Filters.
- **C. The expression typed as text** (the element's JMESPath subset).

**Recommend all three in one rule editor shared with Filters and Find:** B by default, "Edit as
text" for C, "Use selection" for A. No algorithm gets its own door ("group is 3", "Top 10 by
degree"). Comparisons: is, is not, is at least, is at most, contains, starts with, matches pattern.
**Element adds:** the expression subset refuses functions (`predicate.ts:400-437`), so "contains
Bob" cannot be written today.
Add a `RuleTree` leaf `{ kind: "text", attribute, test: "contains" | "starts" | "ends" |
"matches", value, caseSensitive? }`. A pattern on the id attribute (role `key`) covers "odd ids"
(`[13579]$`). No remainder operator: no persona asks for one.

## 12. What can vary

- **A. A vary glyph on every field, disabled with the reason where binding is impossible** (mock
  3.1, 3.2).
- **B. Color and size only:** simple, but it hides shape, pattern, arrow kind and label text,
  which the element already binds.
- **C. A "Vary by" section listing bindings:** a second home for one setting.

**Recommend A.** Vary today: every color, every number (size, width, opacity, glow strength,
arrow size), shape, pattern and arrow kind by categories, label and tooltip text. Yes/no settings
never vary (the reason points to Which elements); label looks are refused (`E_BAD_LAYER`).
**Element adds:** label color, size and background as their own bindable channels
(`node.labelColor` and so on), beside `labelStyle`.
