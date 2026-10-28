# Unified styles: the user's view of the twelve open questions

For a first-time user who abandons steep tools and fears breaking things (Elena), a weekly
analyst who wants fewer clicks (Alex), and the expert and Cytoscape users as the ceiling
(`design/designloom/personas/`). The test: the same screens for everyone, and nothing looks set
unless it is. Element citations are `graphty-element/src/` paths.

## 1. "+" on properties that hold one value

- A. Keep "+" on every section (the mock). Two clicks to set a size.
- B. Core single-value properties are always present as empty fields; the placeholder is what the layers beneath paint now ("Icosphere", "Mixed: 3 values"). Typing sets it; clearing it turns it off.
- C. A switch per property, then a value. One more click.

**Recommend B** for the core rows (node Shape, Size, Color; edge Color, Width, Head, Tail), a
`Checkbox` only for true booleans (Curved, Wireframe), and "+" only for lists and rare
properties. Figma does the same: opacity and corner radius are always-present fields, while fills
and effects are lists with "+" (https://help.figma.com/hc/en-us/articles/360039832014-Design-prototype-and-explore-layer-properties-in-the-right-sidebar).
Head and Tail use `StyleSelect`, where "None" is a value (it covers arrows beneath) and empty is off.
**Element adds:** `styles.agreement(scope, channel)` (`session/styles/StylesApi.ts:509`) with an
optional "beneath this layer" argument, so the placeholder states what is really painted, not
only the floor.

## 2. Menus where "+" stays

- A. Text menus (the mock).
- B. Figma's way: "+" adds a default entry, then its type is changed on the row (https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers).
- C. A menu with a small picture per item; picking a colored item opens the color picker at once.

**Recommend C.** Effects "+" is a `Menu` with a glyph per ring (Outline, Glow, Halo) that opens
`CompactColorInput`'s picker on pick; Escape leaves nothing (B would paint a default the user did
not choose). Shape, arrow kind and line pattern selects show a glyph beside each name: Elena reads
pictures, not "Octahedron". **Element adds:** a preview image per shape, arrow kind and pattern
in the catalog, so the menu never shows a look the canvas draws differently.

## 3. A long panel on a layer with nodes and edges

- A. Nodes and Edges tabs: hides half of what a route layer does.
- B. One scroll, as today.
- C. Collapsible Nodes and Edges group headings, both open by default, a collapsed heading summarizing what it writes ("Color, size, 1 label").

**Recommend C plus a smaller rest state:** with question 1's change, empty sections disappear
into the core rows and a group "+" menu, so a both-kinds layer rests at about 16 rows. The summary
keeps the rule "a layer never hides what it does". Collapse state is remembered per session.

## 4. A layer with no nodes or no edges

- A. Hide the missing group.
- B. Show it disabled.
- C. Hide it, and let the rule bring it back.

**Recommend C.** Disabled sections invite "why can't I?". The rule line already says
"Every edge", so the kind is visible; the edge clause of question 8 is where edges are added. A
rule that could match edges but matches none now keeps its group and says "0 edges". **Element
adds:** which kinds a layer's rule can match, as a fact on the layer.

## 5. Choosing a field when there are many

- A. A searchable list grouped by Data, runs and facts (the mock).
- B. A table with statistics per column.
- C. A, ranked: fields in use first, fields that fit the property next, the rest folded under "N that do not fit" with the reason.

**Recommend C** in a `Popout` with `SearchInput`; each `DataRow` has a level glyph, the name and one
fact ("12 groups", "1 to 36", "84% filled"). The descriptor already carries `uniqueCount`, `min`, `max`, `completeness` and `usedBy`
(`catalog/types.ts:985-1030`). **Element adds:** "does this column fit this channel" as
`{ code, params }` per column, so the reason is the element's, not the app's guess.

## 6. A visual gradient picker for degree

- A. Today's text popover: Scale select, domain and clamp number fields.
- B. Preset chips ("Even", "Log", "Top 10%").
- C. One picture: the histogram on the value axis, the ramp aligned under it, draggable handles for the domain ends, clamp ends (outside shaded, "14 outside"), and midpoint; steps drawn as divisions; changing the scale redraws the axis; palettes as a swatch grid; a "No value" chit at the end. The number fields stay below for exact typing.

**Recommend C.** It keeps every feature and shows what each does before the user commits: the
Cytoscape user's "gradients that clip or center in the wrong place". Build it in compact-mantine from
`HistogramRow` and `GradientEditor`'s slider handles (`compact-mantine/src/components/GradientEditor.tsx`).
**Element adds:** a binding preview: bins in scale space with counts and the color each bin paints,
and the clamped count, so the picture equals the canvas.

## 7. The Louvain "folder"

- A. A split parent is a layer shown with children (the mock, the settled model).
- B. A plain folder of generated layers plus a separate binding layer.
- C. One layer with categories edited in its popover, split only on request.

**Recommend A's model with C as the arrival state:** a run's categories arrive as one layer;
"Split into layers" is the user's act. Elena sees one row per run, not six. A split parent must not
look like a folder: layer icon with a split mark and color chits, never the folder icon, and the
tree refuses a drop into it. Generic folders stay organize-only and never write (a folder's paint
would silently override its children). A split child offers "Copy as layer" to leave its parent.

## 8. Picking "which elements"

- A. One rule at the top (the mock).
- B. A rule per group.
- C. One rule at the top, with an edge clause: "Edges: between them / touching them / none / every edge".

**Recommend C.** It is the model's ontology (a set of nodes and edges), in one place.
Controls: `StyleSelect` for the kind, condition rows of `ComboInput` + `StyleSelect` + value, and a
`SegmentedControl` for the edge clause. **Element adds:** a selector that takes a `RuleTree` and an
`EdgeReading` directly (`catalog/types.ts:1120,1225`); today a rule tree reaches a layer only
through a kept set (`{ match: "member" }`, `catalog/types.ts:691`).

## 9. Does the mock cover every style?

Nearly: 33 of 35 channels; the two left out draw nothing (`node.flat`, `node.marker`; catalog 2.1).
Gaps: the six text markup tags (bold, color, size inside the words; catalog 5.5) have no hint;
the tier 1 edge selection band is a config setting, not yet the Selected layer's effect; lighting
has no control (settled default, fine). **Recommend** an app test that walks `CHANNEL_DESCRIPTORS`
and `LABEL_STYLE_FIELDS` and fails when a drawable one has no control, so coverage cannot drift.

## 10. Complex text labels

- A. A pop-out settings panel (the mock, six groups).
- B. Look presets applied like palettes.
- C. Saved looks: name a look and reuse it on other layers, as Figma text styles (https://help.figma.com/hc/en-us/articles/360039957034-Create-and-apply-text-styles).

**Recommend B on the row, A for detail, C for reuse.** A "Look" `StyleSelect` with previews
(Plain, Name tag, the element's nine badge presets, `BadgeStyleManager.ts:3-117`), the popover for
fine control, and "Save as look" for Alex's repeated figures. **Element adds:** badge presets as
catalog descriptors with plain names, and named label looks that layers reference and that are
saved with the project.

## 11. Picking nodes for a hand-made layer

- A. From the canvas selection ("New layer from selection"): a fixed list.
- B. From the find box: typing "Bob" offers "name contains Bob, 3 nodes"; picking it makes a live rule.
- C. A typed expression (JMESPath after "=").

**Recommend all three behind one door, the Which elements editor, with B first.** Studies so far:
0 of 16 users typed "=", so expressions cannot be the main route; they stay for Emma. Condition
rows cover equals, is one of, contains, between, at least, top N and has a value; the count selects
its members. "Odd ids" is an expression. **Element adds:** a text leaf in `RuleTree` (contains,
starts with), and "contains" rows in `find()` results (`session/types.ts:337`), so "Bob" never
needs JMESPath.

## 12. Which properties can vary

- A. Color and size only.
- B. Every channel the element can bind (catalog 9.3): color, number, kind and text channels; booleans by categories only.
- C. B, plus label looks once the element allows it.

**Recommend C over time, B now**, with the vary glyph on every field and disabled with the
element's reason where it refuses. Add the reverse door: a field row in the Values tab offers
"Show by: color / size / shape / label", one click for Alex. **Element adds:** label size, text
color and background as bindable channels (today `labelStyle` is literal only,
`session/styles/encoding.ts:994-999`), and named shape schemes, distinct shapes first.
