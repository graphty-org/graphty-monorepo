# Tier 5 panel: Information Architect

The selection model (colored groups; each starts from all or none and adds, keeps or removes step
by step; the result is everything in any group) goes into a style layer's "Which nodes / Which
edges" and the Data place's Filters. Evidence: a walk of the live build on Les Miserables,
screenshots in the main checkout's `tmp/design-studio/tier5/panel/ia/w1/` (01 to 15).

## 1. One editor, two hosts

- **One editor component, one field picker.** The two hosts already drift: the Style picker
  groups "Data / Structure", files Node id under Structure and omits edge fields; the Filters
  picker groups "Nodes / Edges / Structure" and files Node id under Nodes (07.png, 10.png).
  Neither lists an algorithm output before it has run.
- **A filter card is a shell around a selection.** The shell keeps the approved header: name, the
  count chip, remove, Select | Filter to | Filter out, and the on box. Its body is a selection.
  Cards still combine without order (the owner's option B, 2026-10-29). Order exists only inside a
  group, and the order icon marks the steps where it changes the result. A one-group, one-step
  selection draws as compactly as today's card.
- **A Nodes | Edges switch tops the editor**, the style layer's existing "Node | Edge" control,
  reused in the filter host.
- **The hover highlight is the Hovered system layer written with this editor** ("Keep while
  Hovered is set, Except within 1 hop of Hovered"). The Hovered, Selected and Pinned rows are
  already in the layer list (03.png): one home, no special code.

## 2. The owner's open questions

**Open the data table automatically while picking? No.** With both panels and a table dock open,
the canvas is too small to pick in (lasso, Shift+click, hover). Instead each group's and step's
count chip is a door: a click opens the table limited to those rows, group colors in its first
column. The table stays view-only.

**Suspend all styling and apply the group colors while picking? Yes, while the editor is open.**

- An open editor puts the canvas into a preview: other style layers suspended (not removed),
  members in their group's color, non-members faded. Selected and Hovered stay on top.
- A Preview toggle in the editor header (default on, tooltip "Preview groups (P)") shows the real
  styling. Done, collapsing or Escape ends it. In Filters, the preview fades what Filter to or
  Filter out would take away.
- The preview is a graphty-element preview layer (additive, @beta), never app painting.

## 3. Dropdown contents, in order

**Verb menu ("+" on a group).** Figma's boolean-operation icons (lucide `SquaresUnite`,
`SquaresSubtract`, `SquaresIntersect`, already installed), in Figma's order:

1. Add (union)
2. Except (subtract)
3. Keep (intersect)

Figma's Exclude (XOR) is left out: no task needs it. The bare "+" picks the likely verb (Add from
none, Keep from all); the caret opens the menu.

**Start with.** A segmented control on the group's first row: All nodes | No nodes (All edges | No
edges on the Edges side).

**Field picker.** One searchable list. With nothing typed, its sections are:

1. **Data**: attributes in the Attributes order, with kind glyph and range ("1 to 31").
2. **Computed**: runs this session holds, value first ("community -- Louvain"), with a dot.
3. **Algorithms**: Analyze's own headings ("Rank nodes and edges", ...) as submenus, each row with
   a clock and its estimate.
4. **Added**: algorithms registered through graphty-element's extension API.
5. **Structure**: within k hops of, connected to, on a path between, edges touching, largest
   component, data source (only with two or more sources).
6. **Selections**: named selections, as "in <name>".

Typing searches every section as one flat list. On the Nodes side, edge fields sit last under
"Edges (nodes touching)", mirrored on the Edges side. Graph values are never entries, only bounds.
An unsupported value kind stays greyed, with the reason in its tooltip.

**Test controls are not dropdowns.** Number, ordered and time: a "By value | By position"
segmented control over the histogram brush. Category: a checklist with counts. Only tags (any of /
all of / none of) and flags (is / is not) use a select. Each range end has the variable-binding
hexagon graphty already uses for "color / size by".

**Reference picker**, in order: Hovered (else selected), Selected, Picked nodes, This group so far,
named selections; typing finds a node by name. Beside it, the target button: arm, then click a
node. **Computed on** (Whole graph | This group so far) and Settings sit behind the card's "...".

## 4. Algorithms: outside the cards

- A card only reads a run. Picking an uncomputed field starts the same whole-graph run Analyze
  makes, gated by Analyze's existing Run panel ("Under a second", Run; 14.png).
- **No Runs list in the editor**: a second home for runs. The run's own row says "read by 2
  conditions"; the card's run chip is a door to it.
- Settings in a card point it at the run with those parameters (created if needed), never changing
  another reader's run. Only "this group so far" runs belong to the step and go with it.

## 5. Must match Figma and graphty

- The panel grid: 32 px rows, 40 px section headers, 24 px controls.
- Group rows follow Figma's Layers panel: color swatch, double-click rename, drag reorder, Delete.
- Steps toggle by checkbox, not eye: a step changes what is computed (`figma-crosswalk.md`).
- "+" only adds to lists. Reuse SegmentedControl, CountChips, the bind hexagon, TooltipShortcut.
- **Remove these sentences**, seen at rest today:
    - "Nodes that pass every condition" (06.png)
    - "All 77 nodes: add a condition to narrow" (09.png)
    - the toast "Dropped the name condition: it was not finished" (09.png). An unfinished step
      should stay as a not-ready row, not be thrown away.

## 6. Risks

1. **Words.** The glossary names set-row commands Union, Subtract, Intersect; Add, Keep, Except
   need one glossary entry tying them, Figma words as search aliases.
2. **"Focus" collides with the glossary's "focused" rows.** Use "Hovered", the system layer's name.
3. **Width.** Filters is about 240 px, the inspector about 225 px; a brush, reference row and
   bind hexagon need a full-width card. Test at 1200 px.
4. **Order.** "Order never matters" (2026-10-29) still holds between cards; inside a group it now
   matters, so the order icon shows at rest.
5. **Preview.** Ending it is tied to the editor's state, so closing the panel restores styling.
6. **compact-mantine.** A brush or counted checklist may need new components; if one would change
   an existing look, record it for the owner instead.
7. **Approved surfaces.** The filter card header stays as approved; only the body is new.
