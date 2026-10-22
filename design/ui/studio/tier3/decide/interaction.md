# Unified style panel: the interaction answers

Answers to the owner's twelve open questions, from interaction design. Sources: the panel
organization and mock (`design/ui/style-panel-organization.md`, pull request #2098), the agreed
model (`design/ui/unified-style-layers.md`), the style catalog, graphty-element on this branch and
`design/designloom/personas/`. Every graphty-element change named is additive.

## 1. "+" and cardinality

Every property holds at most one setting per layer (a channel appears once per layer,
`graphty-element/src/session/styles/Layer.ts:663-671`). Only label entries and effects are lists.
So "+" on Shape or Size means "write this", not "add another".

- A. "+" per section (mock). Discoverable, but a click before every common edit, and up to
  eleven dimmed titles on a two-kind layer.
- B. The six core fields always shown, empty until set: node Color, Size, Shape; edge Color, Width,
  Head. The placeholder is what the layers beneath give ("6366F1", or "Mixed"). Typing writes;
  the minus or Delete clears. Everything else comes from one "Add style" menu per group.
- C. A switch per property (on = written): a state word again, and it cannot tell "not written"
  from "written as off".

**Recommend B.** "+" survives only on the lists (Text, Effects). Switches (Curved, Wireframe,
Show) come from the menu already flipped, with a minus: only the row's presence says "written".
Element adds: `styles.agreement(scope, channel, { below: layerId })`, the value the stack
beneath a layer gives its elements, so the placeholder is computed, not guessed.

## 2. What the menus look like

- A. Plain text `Menu` (mock).
- B. `Menu` items with a glyph each, captions per section, a disabled item's reason on its second
  line (`MenuItemDescription`), as Figma's effect type menu
  (https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers).
- C. "+" opens the value picker directly (a color picker on Effects).

**Recommend B for adding; pictures for choosing values.** After a pick, focus lands in the new
row's value; a color row opens its `CompactColorInput` picker at once. Shape (25), arrow kind (14) and line pattern (9) are chosen by sight, so
their `StyleSelect` shows a glyph per option; if `StyleSelect` has no option glyph slot, it is
added in compact-mantine. The lists come from graphty-element (`NodeShapes`, `EdgeArrowTypes`,
`EdgeLineTypes`).

## 3. Keeping the panel short

- A. Accordions. The owner ruled "popovers, never accordions", and a folded section hides what a
  layer does.
- B. Nodes and Edges tabs. Hides half of a two-kind layer (the route).
- C. One scroll, shorter: at rest only written rows plus the core fields; unwritten sections fold
  into the group's "Add style" menu; sticky Nodes and Edges headings; a `SegmentedControl`
  "Nodes / Edges" that scrolls to its group, shown only when the panel overflows.

**Recommend C.** The route layer rests at about 12 rows, under 400 px.

## 4. A layer with no nodes or no edges

- A. Hide the group the rule cannot reach (mock).
- B. Show it disabled: a dead control, since it cannot be enabled there.
- C. A, but keep a group live when the rule can reach that kind and matches none now (Selected with
  only nodes selected), with "0 edges now".

**Recommend C.** Uniformity comes from fixed order (Nodes above Edges) and from the rule line
naming the kinds; widening a layer happens in Which elements, its one door. Element adds: which
kinds a rule can reach, from `styles.validate()` (`reaches: { node, edge }`).

## 5. "Vary by" with many fields

The genomics persona hates "30 columns crammed into a preview".

- A. One flat searchable list.
- B. Grouped by origin (Data, each run, Selection and hover), fitting fields first, the rest folded
  into "N that do not fit", each disabled with graphty-element's reason.
- C. "In use" first (the fields other layers already read), then search.

**Recommend B with C's group on top.** A `Popout` with `SearchInput` focused on open, `DataRow`s
with a level glyph, distinct count and "82% have it". Keys: "=" opens, arrows, Enter picks.
graphty-element already gives `measurement`, `completeness`, `uniqueCount`, `usedBy` and `runId`
(`src/catalog/types.ts:985-1030`). Element adds: a fit check per channel and path returning
`{ code, params }`, unless `proposeEncoding` already answers it.

## 6. A visual gradient

The ramp popover holds about ten text controls (palette, scale, midpoint, steps, exponent,
domain, clamp, no-value color).

- A. Keep them; add the `GradientEditor` for the palette. Two editors of one ramp.
- B. A ramp over the histogram: `HistogramRow` with the ramp on the same axis. Two end handles
  set the domain; dragging past the data, or the handle's menu, sets a percentile clamp, with the
  bars outside hatched and counted. A midpoint handle appears for a diverging palette. Steps are
  tick marks: drag one in or out to change the count. The scale is a `SegmentedControl` (Linear,
  Log, Square root, Equal counts) and the axis redraws in it, so the reader sees the spread change.
  Each handle is an APG slider, like `GradientEditor`'s stops; double-click opens the exact number.
- C. Preset chips ("Even spread", "Log").

**Recommend B, with C as its first row**; exact fields stay behind the settings button. A shared `RampEditor` in compact-mantine, built from `GradientEditor`'s
handles and `HistogramRow`, never app-only. Element adds: `styles.distribution(path, { scale,
bins })`, bin counts and the step bounds the paint uses, so the editor draws the canvas's steps.

## 7. The Louvain "folder"

- A. Split parent drawn like a folder (mock); a drop into it is refused, which surprises.
- B. Split parent as an ordinary row; its groups live only in its panel.
- C. Split parent as a layer row with its own glyph, children generated beneath it; a folder has a
  folder glyph, writes nothing, and its panel lists its rows.

**Recommend C**, as the model says. A drop onto a split parent is refused during the drag, the
reason on the drop line; its menu says Unsplit, a folder's Ungroup. Folders stay organizers: one
that scoped its rows would change what a row paints just by moving it.

## 8. Picking which elements

- A. Separate rules under Nodes and Edges: two editors, against the model's one rule per layer.
- B. One rule at the top of the Style tab (mock).
- C. B with "Nodes / Edges / Both" as its first control, and edges offered from nodes in words:
  "and the edges between them", "and the edges touching them" (graphty-element's `EdgeReading`).

**Recommend C.** A new layer starts with nothing chosen.

## 9. Does the mock cover every style?

Nearly, not wholly. Missing or partial: rich-text markup in label words, label animation outside
badges, the eight `RichTextStyle` fields no channel reaches (text path, billboard mode, resolution
and others, `src/catalog/unreachable.ts:138-211`), gradient fills (listed, disabled), and the
graph keys beyond background and view. **Recommend** an app test that walks
`CHANNEL_DESCRIPTORS` and fails when a channel has neither a control nor a written "not offered"
reason.

## 10. Text labels

- A. One settings pop-out holding every label field (mock).
- B. Named label looks applied in one pick, as Figma text styles
  (https://help.figma.com/hc/en-us/articles/15871097384471-The-difference-between-variables-and-styles):
  edit the look, every label using it changes.
- C. Inline only source, look, size and position; A's pop-out for departures.

**Recommend C, with B's looks.** The look `StyleSelect` previews each as sample text. graphty-element's
nine badges (`src/BadgeStyleManager.ts`) are already looks. A departure shows as "2 changes" with
reset; "Save as look" makes a new one. Element adds: named label looks a layer refers to by id,
saved with the project.

## 11. Picking elements for a manual layer

- A. From the selection: "New layer from selection" fixes the ids (`{ match: "ids" }`). Easy, but
  it does not follow the data.
- B. The Filters step editor's rule builder (range, categories, degree, top N, all, any, not), the
  same editor the Data place uses, plus an expression row for JMESPath.
- C. Type in Which elements as in the find box ("name: bob"): it lists hits live (`session.find`)
  and offers "Nodes where name contains bob (3)" as a live rule, or "These 3 nodes" as fixed.

**Recommend C as the front door, B behind "Edit rule", A on the selection bar.** No algorithm gets
its own entry. Odd ids is `regex:[13579]$` on id today, or
a computed value once the model's expressions exist. Element adds: a text leaf on `RuleTree`
(contains, starts, ends, equals, pattern), and `FindResult.rule`, the rule its text means, so the
app never turns text into rules itself.

## 12. Which properties can vary

Every channel takes a binding except the label look blocks and `node.marker` (catalog section 9.2):
color, size, shape, opacity, outline, glow and strength, wireframe, edge color, width, opacity,
pattern and count, curve, motion, arrow kind, size, color and opacity, and label, tooltip and
caption words.

- A. The vary glyph on every field (mock): one pattern everywhere.
- B. A layer-level "Vary by" that binds several properties at once.
- C. Color and size only.

**Recommend A.** Label size, color and background show the glyph disabled with the reason. Element
adds: label size, text color and background as channels that take bindings.
