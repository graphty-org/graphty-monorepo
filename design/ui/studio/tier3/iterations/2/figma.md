# Iteration 2: the style panel walked as a Figma product designer

An expert walkthrough of the second build of the unified style panel (the layer tree on the left,
the Style tab on the right), judged against how Figma's right sidebar solves the same control
problems: controls, menus, cardinality, density and consistency. Severity runs from 0 (not a
problem) to 4 (blocks the work). Each finding names its screenshot and the package that owns the
fix; where the cause was read in source, the file is named.

## What was walked

- The production build served at https://dev.ato.ms:9373, build stamp `2faecd941bc0` (the branch
  head). Driven with Playwright in its own browser context through the studio's browser gate, at
  1440 x 900 and then 900 x 700, device scale 2.
- Les Miserables from Samples, laid out as a circle in 2D. The app now turns on the starting rows
  and top placement by itself (read back from the session: `startingRows: true`,
  `runPlacement: "top"`). Then, through graphty-element's session as the owner-review stories do:
  an Annotations folder holding Key people (four characters in orange, size 2), Degree, Edge
  betweenness, Louvain with community 3 recolored green, and a route from Myriel to Marius.
  Everything after that was clicks, keys and hovers.
- Screenshots (local, not committed): `design/ui/studio/tier3/build/figma-i2/`. Names below are
  relative to that folder. The driver and its two step files are in `tmp/figma-i2/` of this
  worktree (`walk.mjs`, `s2.mjs`, `s3.mjs`).

## Summary

24 findings: 2 at severity 3, 13 at severity 2, 9 at severity 1. Of iteration 1's 22 findings, 14
are fixed as decided, 5 are partly fixed and 3 are still open (listed at the end).

The frame Figma would recognize has arrived: one row per run, Which elements on every layer,
popovers beside the panel at the row's height, a reserved icon column so property fields no longer
jump, opacity inline as a percent, a chip-and-name color picker, a value picker with a fact per
value, a ramp that paints its bars in their own colors, and a row menu with Duplicate, Move to
folder and Select what it paints. What is left is mostly density and naming: every property costs
two lines, so a both-kinds layer scrolls at 900 x 700; one value carries two or three names
between the tree, the rule, the binding and the key; and "Mixed" means two different things.

## Severity 3

1. **Undo right after a Clear does nothing.** Clear (the minus) moves focus into the emptied field
   (`graphty/src/workspace/style/PropertyRow.tsx` line 214, so focus never falls to the page). The
   app's key handler then treats Ctrl+Z as typing in a text field and leaves it to the browser
   (`graphty/src/workspace/keys/keys.ts`, `isTypingTarget`), and the field has no edit of its own
   to undo, so nothing happens and nothing says so. Escape, then Ctrl+Z, does undo the clear.
   Figma passes Cmd+Z through to the document whenever a field holds no uncommitted edit. Script:
   `tmp/figma-i2/s3.mjs`, section `undo-after-clear` (log: "AFTER CTRL+Z IN FIELD Node size, not
   set" then "AFTER ESC THEN CTRL+Z Node size, set here, 2"). Clear is the owner's first question,
   and undo is its safety net. Owner: graphty app (`keys.ts`: a text field with no pending edit
   hands Ctrl+Z and Ctrl+Shift+Z to the app). Evidence: `crop-s2-17-key-undo.png`,
   `s3-01-undo-after-esc.png`.

2. **One value, two or three names.** Degree's row is "Connections" in the tree and its rule reads
   "Nodes where Connections has a value", while its color pill, the value picker and the Values tab
   say "Degree". Louvain's row is "Communities", its rule says "Community", its pill and the key
   say "Louvain". Edge betweenness's row is "Bridge edges", its rule says "Bridging", its pill and
   key say "Edge betweenness". The route is "Shortest route" in the tree and "Shortest path" in the
   key. A reader who wants "degree at least 10" looks for "Degree" in the rule's attribute list and
   finds "Connections". Figma names a variable once and shows that name everywhere it is bound.
   Owner: graphty-element (a run result needs one plain name, the one `readableValues` gives, used
   by the rule it reads back too); graphty app for the words. Evidence: `s2-12-connections-which.png`,
   `s2-37-communities-pop.png`, `s2-40-bridge-tab-crop.png`, `s2-08-route.png`.

## Severity 2

3. **"Mixed" means two things, and still shows a color.** A field this layer does not set shows
   "Mixed" when the layers beneath disagree (Selected, the route, Connections and Communities all
   read Size "Mixed"), which is the same word Figma reserves for a multi-selection whose objects
   disagree (`s2-42-multi.png`). The reader cannot tell "you set different values" from "you set
   nothing, and what lies beneath varies". Mixed color fields still carry a swatch: purple for nodes
   and gray for edges, colors neither row paints. Mixed is upright in number fields and italic in
   color fields. Proposal: an unset field over varied values shows the beneath range as its
   placeholder ("1 to 2"), and "Mixed" stays for selections; a Mixed color draws no swatch. Owner:
   compact-mantine (`CompactColorInput`'s mixed state), graphty app (the placeholder). Evidence:
   `s2-06-selected.png`, `s2-08-route.png`, `s3-06-selected-effects-focus-crop.png`.

4. **Every property costs two lines, so a both-kinds layer scrolls.** Each field has its caption on
   a line of its own (Shape, Size, Color, Width, Head, Tail), and pairs that iteration 1 put on one
   row (Shape | Size, Head | Tail) are now stacked. At 900 x 700 the Selected layer's Style tab is
   756 px against 660 (`s3-13-small-selected.png`) and the route's 692 against 660; at 1440 x 900
   the route with its Which elements editor open reaches the bottom (`s2-09-route-which.png`).
   Figma's property row is one 32 px line: the section title names the property (Fill, Stroke) or
   an icon prefix inside the field names it (W, H), and two short fields share a row. This is the
   owner's question about panel length; the reserved icon column now makes pairing safe. Owner:
   graphty app (`PropertyRow.tsx`), compact-mantine if the field needs a prefix slot. Evidence:
   `s2-05-everything.png`.

5. **Effect rows show an 11 px color field.** Glow, Halo and Band carry a color input 11 px wide,
   showing "FF" or "11" of a six-digit hex; on focus it widens over the vary glyph, eye and minus,
   so the row changes under the pointer. Figma's effect row is icon, effect name, eye and minus,
   with every value of the effect in its settings popover; here Glow's popover holds only Glow
   strength (`s3-04-glow-settings.png`). Proposal: a chip only in the row (the chip-only color
   control the category rows also need), or the color moved into the settings popover. Owner:
   graphty app (`Effects.tsx`), compact-mantine for a chip-only color control. Evidence:
   `s3-05-selected-effects-rest-crop.png`, `s3-06-selected-effects-focus-crop.png`,
   `s2-31-effect-glow.png`.

6. **Five left edges in one tab.** Which elements starts at x 1679 (CSS px at 1440 wide), the Nodes
   heading at 1690, Text and Effects titles at 1696, the gears at 1707 and the captions and fields
   at 1727; a label entry's Look, Size and Position start back at 1696 and run to the panel's edge,
   wider than every other field. Figma's panel has one 16 px gutter for titles and fields alike.
   Owner: graphty app (`StylePanel.tsx`, `LabelSection.tsx`, `style.css`). Evidence:
   `s2-26-label-entry.png`, `s2-14-key-nodes-crop.png`.

7. **Label settings is still a full-height column.** It now opens beside the panel and scrolls
   (2,802 px of content in 860), which ends iteration 1's blocker, but it still starts at the top of
   the window over the top bar, 349 px wide, with about 50 fields each on two lines. Every unset
   field reads "Default" where the rest of the panel shows the value beneath as its placeholder.
   Figma's Type settings popover anchors at its row and splits its fields into Basics and Details
   tabs. Owner: compact-mantine (pop-out placement), graphty app (grouping and placeholders).
   Evidence: `s2-27-label-settings.png`.

8. **A label added at the default size cannot be read.** Adding "name" to Key people draws labels
   about 4 px tall in the 2D view of 77 nodes; the panel says "4 labels, 0 hidden" and Size reads 48. A control that changes nothing visible is the failure tier 1 kept meeting. Owner:
   graphty-element (the default label size against the framed view). Evidence:
   `crop-label-canvas.png`, `s2-26-label-entry.png`.

9. **Clear names a layer the tree does not show.** The minus on Key people's size reads "Clear: back
   to 1, from Node defaults"; the tree's bottom row is Everything, and "Node defaults" appears
   nowhere. Iteration 2 turned on the starting rows so that what comes back would always name a row
   the reader can see. Owner: graphty-element (which layer `agreement` reports when Everything sets
   nothing), graphty app for the words. Evidence: `s2-15-key-minus-tooltip.png`.

10. **A painted-over field gives no sign.** Key people's color is orange in its field, but
    Communities paints over it, so its four nodes show green and blue. The row's "painted over"
    mark appears only once every property is covered (it showed after its size was cleared,
    `s2-16-key-size-cleared.png`). The reader edits a color and sees no change. Figma has no
    stacking of paints, so this one is graphty's own: mark the field, not only the row, with the
    tooltip already written for the row ("Painted over by Communities"). Owner: graphty app;
    graphty-element already reports the winning layer per channel. Evidence: `s2-15-key-minus-tooltip.png`
    (orange field, green and blue nodes).

11. **"Painted over" on a layer that paints nothing.** Selected (0 nodes, 0 edges) carries the
    painted-over mark, and its tooltip says only "Painted over", naming no layer, where Connections'
    says "Painted over by Communities and Shortest route". Owner: graphty-element (no painted-over
    fact for a layer that matches nothing), graphty app (every such tooltip names the layers).
    Evidence: `s3-02-selected-glyph-tip.png`, `s2-01-tree-crop.png`.

12. **The route's rule is shown as an expression.** Which elements reads "Nodes and edges where
    results.shortest_path.onPath == `true`", and its editor opens on Expression with the same text,
    while Connections and Communities read back as conditions. The value picker already lists the
    route's values by name (Shortest path order, Shortest path distance). Owner: graphty-element
    (read a run's selector back as a condition when it is one), graphty app for the sentence.
    Evidence: `s2-08-route.png`, `s2-09-route-which.png`.

13. **Category rows: the hex outweighs the name, and the columns move.** Each Louvain row is a
    90 px hex field, then the name and count in small text, then an eye and "...". The recolored
    row (Group 3) gains a minus, which pushes its count and eye about 25 px left of every other
    row. Figma's Selection colors and variable rows are a chip, a name and actions in a fixed
    column. Owner: graphty app (`BindingPopover.tsx`), compact-mantine for the chip-only control.
    Evidence: `s2-38-communities-pop-crop.png`, `s3-07-cat-3-menu.png`.

14. **Condition fields truncate both halves.** The condition row puts the attribute and the test
    side by side in 240 px: "Connec..." and "has a va...". Figma stacks a field on its own line
    before it truncates a value the reader must choose. Owner: graphty app (`WhichElements.tsx`).
    Evidence: `s2-12-connections-which.png`.

15. **Clear still has the "x" in four places.** The ramp's Scale, "More values than colors", and
    Graph settings' Background color and Highlight color clear with an "x"; property rows, label
    and effect entries and category rows use the minus. Owner: graphty app (`BindingPopover.tsx`,
    graph settings). Evidence: `s2-35-degree-log-crop.png`, `s2-37-communities-pop.png`,
    `s2-46-graph-settings.png`.

## Severity 1

16. Escape on a new tooltip entry removes it (fixed), but focus falls to the page instead of
    returning to Text's "+". Owner: graphty app. `s3-09-tooltip-after-esc.png`.
17. A new layer lands under the pinned rows at the top of the tree rather than above the selected
    row, and its kind is not preselected from the selection (Communities, a node layer, was
    selected). Figma inserts above the selection. Owner: graphty app. `s2-45-draft.png`.
18. Right-clicking a row opens its menu without selecting it; the inspector stays on Graph. Figma
    selects the layer it is opened on. Owner: compact-mantine tree, graphty app.
    `s2-04-tree-context-menu.png`.
19. The row menu has no dividers between its groups, only Move to folder carries an icon, Unpin is
    shown disabled with a "Not pinned" caption, and Hide and Lock are missing (Figma's layer menu
    has Show/Hide and Lock/Unlock). Owner: graphty app. `s2-04-tree-context-menu.png`.
20. The value beneath is marked two ways: a dashed outline in the shape grid, a check and highlight
    in the label Look list. Owner: compact-mantine. `s2-18-shape-open.png`, `s2-28-label-look.png`.
21. Value picker rows take two lines each (name, then fact), so five fit in 360 px; numbers and
    categories share one bar glyph. Figma's variable picker puts the value right-aligned on the
    name's line. Owner: graphty app (`ValuePicker.tsx`). `s2-20-vary-picker.png`.
22. Tree kind glyphs differ in size and weight: the node glyph is a 16 px ring, the both-kinds glyph
    a small dim pair. Owner: graphty app. `s2-01-tree-crop.png`.
23. Not-set number fields are upright gray on a filled field; not-set selects are italic gray on an
    empty one. Owner: compact-mantine. `s2-40-bridge-tab-crop.png`.
24. Graph settings and the Values tab use collapsible sections; the layer Style tab uses flat titles.
    Owner: graphty app. `s2-46-graph-settings.png`, `s3-12-connections-values.png`.

## Iteration 1 findings, rechecked by clicking

- Fixed: Which elements on run rows (`s2-12-connections-which.png`); the route is one row
  (`s2-01-tree-crop.png`); the key at rest lists only blocks for the canvas; one-item menus (Text
  "+" offers Label and Tooltip, a category's "..." offers Select these 11 nodes and New layer);
  shape names readable; value picker facts and groups (In use, Degree, Louvain, Shortest path, Does
  not fit); the ramp paints bars in their colors, labels Values from and Values to, and draws domain
  handles; label entry writes only its source; row menu commands and the header's Select what it
  paints; Graph settings opens on Style with titled sections; opacity inline as a percent; effect
  entries on one line; the paintbrush gone from tree rows; Shape and Size no longer sit 2 px apart
  (they are stacked now, which finding 4 questions).
- Partly fixed: popovers beside the panel (vary, color, ramp, category, glow and label source all
  are; Label settings still starts at the window top, finding 7); field width (property rows
  stable; effect and category rows still move, findings 5 and 13); category names (shown, but
  outweighed, finding 13); Clear looks (finding 15); painted-over naming (finding 11).
- Open: Mixed with a swatch (finding 3); draft kind preselection (finding 17); undo wording after a
  Clear was not reached, because Undo itself did not run (finding 1).

## Against the owner's three questions

- **Unsetting.** The grammar reads: a set field carries its minus at rest, the minus's tooltip says
  what comes back, the field then shows that value as a gray placeholder, and the row never moves.
  Three things still undercut it: the first Undo after a Clear is lost (finding 1), the value that
  comes back is credited to a layer the tree does not show (finding 9), and "Mixed" in an unset
  field reads like a value this layer holds (finding 3).
- **No split parent.** Built as decided and consistent: only layers and folders in the tree;
  Louvain's per-group colors are entries of an ordinary binding with their own eye and "...", and
  "New layer for Group 3" makes an ordinary layer. Nothing in the walk behaved like a third row
  kind.
- **Figma.** Taken since iteration 1: popovers beside the panel, the reserved icon column, opacity
  inline, Figma's color picker with document swatches, the variable-picker grammar, Select
  matching layers, Duplicate and Move to folder. Next to take: Figma's one-line property row with a
  prefix or section-title label and paired short fields (finding 4); Cmd+Z passing through a field
  with no pending edit (finding 1); "Mixed" only for a selection (finding 3); the effect row as
  icon, name, eye and minus with its values in the popover (finding 5); a Type settings popover
  anchored at its row with Basics and Details tabs (finding 7).

## Not walked

- Changing a layer's kind in place (Nodes to Both): the click on "Both" did not land in the script,
  so the change is unverified.
- A data set with many fields: Les Miserables has two data columns, so the value picker's search
  and grouping were not stressed.
