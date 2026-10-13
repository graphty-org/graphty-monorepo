# Tier 3, iteration 1: screenshot audit of the style panel -- Design Engineer

Build under test: the frozen build `tier3-i1-68a2140049` (`.study-builds/tier3-i1-68a2140049/`), served
at https://dev.ato.ms:9373. Every layer kind and every section and pop-out of the style panel was
opened in a 1366 x 768 window and in a 1920 x 1080 window, by Playwright in its own browser context
through the studio's browser gate. Every screenshot was looked at. After each screenshot the page
was measured: text cut by its box, values wider than their field, controls past the window that no
scroller holds, sideways and lengthwise scrolling, two controls overlapping, and every open popover
and whether it fits the window.

The scene is the one the owner's review stories build, on the Les Miserables sample: an Annotations
folder holding Key people (Valjean, Javert, Cosette and Marius in orange, size 2), a layer with a
long name, Degree ("Connections"), Edge betweenness ("Bridge edges"), Louvain ("Communities", with
community 3 recolored green) and the shortest route from Myriel to Marius on top. The second walk
also turns on the starting rows (Everything, Selected, Hovered) as the stories do, selects Valjean
and Javert, and adds a label, a tooltip, glow, halo, an edge label, band and motion.

Screenshots (not committed; `build/` is ignored by git):

- `design/ui/studio/tier3/build/audit-i1/<size>/NN-<state>.png` and `log.txt` (the measurements),
  for the first walk: the tree, the folder and its Selection colors, Key people with every list
  added, the shape and head lists, Which elements, the value picker, the label, its settings, the
  long name, Degree and its ramp, Louvain and its categories, Bridge edges, the route, three rows,
  the draft (Nodes, Edges, Both), the row menu, Graph settings, and each row's Values tab.
- `<size>-b/` for the second walk: Everything, Selected, Hovered, every settings pop-out (Shape,
  Color, Line, Ends) of Everything, Key people, Bridge edges and the route's edges, the Clear
  tooltip, a locked and a hidden layer, the edge label, Band and Motion, Graph settings' Style tab.
- `crops/` for enlarged details.

`<size>` is `1366x768` or `1920x1080`. A path below without a size names the 1366 x 768 picture;
the 1920 x 1080 one shows the same unless it says otherwise.

Severity: 0 cosmetic only if time allows, 1 cosmetic, 2 minor (slows or misleads), 3 major (hides
information a task needs, or breaks a rule the owner settled), 4 blocks a task. "Owner" is the
package where the fix belongs.

No step raised a script error, a `console.error` or a failed request. No popover other than Label
settings leaves the window. The inspector is 240 px wide at both sizes, so the two sizes differ
only in how much fits lengthwise; at 1920 x 1080 nothing in the style panel scrolls.

## Severity 4

1. **Label settings cannot be reached past its first screen.** The pop-out is 2280 px tall, starts
   at the top of the window and does not scroll; there is no scroller anywhere on the page. At 1366 x
   768 everything below "Margin right" is past the window (Gradient, Letters, Placement, Motion and
   distance, Badge: about 40 controls); at 1920 x 1080 everything below "Outline width". Sixty
   presses of Tab move focus through those controls and on to the page behind without scrolling
   anything into view. Evidence: `12-key-label-settings.png` (both sizes),
   `1366x768-b/20-label-settings-after-60-tabs.png`, `log.txt` ("PAST THE WINDOW").
   Owner: compact-mantine (`Popout`: cap the panel at the window's height and scroll its content, so
   every pop-out gets it), then the app's `LabelSettings.tsx` if it sets its own height.

## Severity 3

2. **The category popover's rows show no value and no count.** Each row is a color field, an eye
   and a menu; the value's name and its count are hidden under the color field, and the eye and the
   minus sit inside the field. The reader cannot tell which row is which community. The row gives
   the color a 96 px slot, but `CompactColorInput` draws at its own default width because the
   caller passes no `width`. Evidence: `24-louvain-categories.png`,
   `crops/1366-louvain-category-rows.png`, the measured overlaps "Louvain 1 color and Hide 1".
   Owner: graphty app (`style/BindingPopover.tsx`, `ValueRow`: pass the slot's width).

3. **Which elements shows only on layers the reader made.** Key people and the long-named layer
   show it; Degree, Louvain, Bridge edges, both route rows, Everything, Selected and Hovered do not.
   `StylePanel.tsx` mounts it only when every layer's `source.by` is "user". That is provenance
   changing what a layer offers, which the owner's settled model rules out, and the design's route
   example opens with "Which elements: Nodes and edges where on path". Evidence:
   `05-key-people.png` against `20-degree.png`, `23-louvain.png`, `27-edge-betweenness.png`,
   `32-route.png`, `1366x768-b/02-everything.png`. Owner: graphty app; if the editor cannot read a
   run layer's rule, that read is owed by graphty-element.

4. **The real app has no starting rows.** Opening the Les Miserables sample gives a tree with no
   Everything, Selected or Hovered, and no Restore starting layers in the footer (it only appears
   when the project already has starting rows on). Nothing in the app turns `startingRows` on; the
   review stories do it by hand. The owner's model has Selected and Hovered as default layers and
   Everything at the bottom. Evidence: `01-scene-tree.png` against
   `1366x768-b/01-scene-tree-starting-rows.png`. Owner: graphty app (a new or opened project sets
   `startingRows: true`; the element's default stays neutral).

5. **A route is two rows, "Shortest route (nodes)" and "Shortest route (edges)".** Unified style
   layers promise one layer that paints nodes and edges, and the design draws the route as one row
   with both marks. Each row's panel shows only its half. Evidence: `01-scene-tree.png`,
   `32-route.png`, `33-route.png`. Owner: graphty-element (the shortest-path run's suggested layers
   are two layers with no shared row; one row with both kinds is the fix).

6. **Bridge edges paints over the route.** Edge betweenness ran second but its row sits at the top
   of the tree, above the route that ran last and above the reader's own layers. Its Values tab says
   "Edge color 254 of 254" and the route's edges say "Edge color 0 of 2": the route's own edge
   color never shows. The owner-review stories have the same order
   (`build/owner-review/checkpoint-1/tree-1440x900.png`), so it is not this walk. Evidence:
   `31-eb-values.png`, `34-route-values.png`, `01-scene-tree.png`. Owner: graphty-element (where a
   run's layer is inserted); mechanism not traced yet.

7. **One community has two names.** The canvas legend names Louvain's groups "Group 1" to "Group 6"
   by size rank (the element's own naming rule, so the list of groups and the key agree), while the
   Values tab and the category popover name them by raw id "0" to "5". The pink group is "Group 6"
   in the legend and "0" in the Values tab. Evidence: `26-louvain-values.png` (legend on the left,
   groups on the right), `24-louvain-categories.png`. Owner: graphty app (`inspector/LayerValues.tsx`
   and `style/BindingPopover.tsx`: name a ranked group with `rankedName`, as the rest of the app does).

8. **The legend fills with entries a reader cannot read.** With the starting rows on and nothing
   selected, it starts with six rows each titled "Selected" ("Selected 0.4", "Selected 1.45", a yellow
   chit, "Selected 1", "Selected 2.5", a blue chit): the halo and band sizes, opacities and colors.
   A label adds "Key people 72" (its size) and the route's label "On the path 72"; a halo adds a
   block titled only "Key people". At 1366 x 768 the legend then scrolls (630 px of 850 px) and the
   run keys fall below the fold. The legend's filter (`keyBlocks` in `canvas/legendWords.ts`) knows
   the text and size channels from before this tier, not label size, halo, glow or band. Evidence:
   `1366x768-b/31-route-edges-full.png`, `18-key-people-full.png`. Owner: graphty app.

## Severity 2

9. **Shape and arrow names are cut to 56 px.** In the shape list 22 of 25 names end in "...", and
   three read "Pentago...", three "Elongat...", two "Triangul...": the glyphs alone must tell them
   apart. In the head list "Inverted...", "Open tri...", "Open di...", "Crow's f...". Evidence:
   `06-key-shape-list.png`, `28-eb-head-list.png`. Owner: compact-mantine (the glyph grid select:
   two-line names or wider cells).

10. **Values and colors cut in two-field rows.** Bridge edges' color pill reads "Edge ..." (42 px of
    101 px for "Edge betweenness"); the route's edge color reads "000000" with 15 of its 42 px shown
    once the vary glyph appears; Everything's "A9A9A9" loses its last digit. The color field of a
    Color | Width row is about 64 px. Evidence: `27-edge-betweenness.png`,
    `1366x768-b/26-route-edges-Pick_Edge_color.png`, `1366x768-b/08-everything-Pick_Edge_color.png`.
    Owner: graphty app (the row grid).

11. **Two ways to clear, side by side.** Property rows clear with a minus, as designed; the label's
    Look and Size, the ramp's Scale, "More values than colors" and Motion speed clear with a small
    "x" (the shared field's own reset). Motion speed shows an "x", an eye and a minus on one row.
    Evidence: `11-key-label-entry.png`, `21-degree-ramp.png`, `24-louvain-categories.png`,
    `1366x768-b/31-route-edges-full.png`. Owner: graphty app (`showReset={false}` and the row's
    minus); compact-mantine if the reset cannot be turned off.

12. **Where the minus sits in a two-field row moves, and fields change width.** In Shape | Size the
    one minus is at the row's end and belongs to Size; in Color | Width the Color minus sits between
    the two fields. A field is about 64 px with a minus beside it and about 90 px without, so fields
    jump as values are set and cleared. Evidence: `05-key-people.png`, `20-degree.png`,
    `27-edge-betweenness.png`, `33-route.png`. Owner: graphty app (`PropertyRow.tsx`).

13. **Text's "+" opens a menu of one item.** Tooltip is its own list, so Text's menu holds only
    Label; one click more than needed, and the design puts Label and Tooltip under Text's "+".
    Evidence: `09-key-text-menu.png`, `29-eb-text-menu.png`. Owner: graphty app.

14. **Escape on a new tooltip's source picker leaves an empty tooltip set.** The entry stays with
    an empty field and a minus; Effects drop their pending entry on Escape. Evidence:
    `13-key-tooltip.png` then `14-key-effects-menu.png`. Owner: graphty app (`ListSection`).

15. **Graph settings opens on the Values tab** when the last row was left on Values; the reader who
    asked for settings sees counts. Evidence: `42-graph-settings.png`. Owner: graphty app.

16. **Graph settings scrolls sideways at 1366 x 768.** Its content is 240 px in a 224 px scroller
    once the vertical scrollbar appears, and a horizontal scrollbar is drawn. Evidence:
    `1366x768-b/33-graph-settings-style.png`, `34-...-bottom.png`. Owner: graphty app (the
    inspector's scroller: reserve the scrollbar's gutter).

17. **Louvain's Values tab draws a histogram of community ids** ("0 to 5, median 3") under the list
    of groups: a number summary of a category. Evidence: `26-louvain-values.png`. Owner: graphty app
    (`LayerValues.tsx`), or graphty-element if the result's descriptor does not say it is a category.

18. **A locked layer draws some controls as enabled.** The Shape select, the label's eye and the
    label's Look select keep full contrast while the native disabled fieldset turns them off.
    Evidence: `1366x768-b/21-key-locked.png`, `crops/1366-key-locked.png`. Owner: compact-mantine
    (disabled styling that follows `fieldset:disabled`).

19. **The row menu lacks Duplicate, Move to folder and Select what it paints** (design 2.1). Moving
    a layer into a folder is drag only. Evidence: `41-row-actions.png`. Owner: graphty app.

20. **Tree rows cut the "Painted over" mark** to "Painted..." on Connections and on Selected.
    Evidence: `01-scene-tree.png`, `1366x768-b/01-scene-tree-starting-rows.png`. Owner: graphty app
    (`StyleTree.tsx`) or compact-mantine's `Tree` description slot.

## Severity 1

21. A long layer name shrinks the header's glyph to about two thirds of its size
    (`19-long-name.png`). Owner: graphty app (inspector header: the glyph must not shrink).
22. Color fields say "MIXED" and "LINE COLOR" in capitals while number fields say "Mixed"
    (`19-long-name.png`, `35-three-rows.png`, `1366x768-b/10-everything-Edge_ends_settings.png`).
    Owner: compact-mantine (`CompactColorInput` empty text takes the hex field's capitals).
23. Left edges differ: the header and Which elements at 9 px, the Nodes heading at 17 px, list
    titles at 21 px; the label's second lines have no gear column; the Size caption sits 2 px above
    Shape's (`crops/1366-key-people-inspector.png`, `11-key-label-entry.png`). Owner: graphty app.
24. The route's Values tab has two sections called "Summary" (`34-route-values.png`). Owner:
    graphty app.
25. The Tooltip source picker's last row is cut by the window's bottom edge at 1366 x 768
    (`13-key-tooltip.png`). Owner: graphty app (open it upward when there is no room).
26. Graph settings shows a code fragment, "with `dim: 2`", in the layout's description
    (`1366x768-b/33-graph-settings-style.png`). Owner: graphty-element (the layout's catalog
    description).
27. The inspector stays 240 px wide at 1920 x 1080, so findings 9 and 10 recur with 1380 px of
    canvas beside them. A question for the studio, not a defect.
28. The value picker lists "Degree in degree" and "Degree out degree" (`08-key-vary-picker.png`).
    Owner: graphty app's words for run results.

## Checked and fine

- Key people with a label, a tooltip, glow and halo fits at 1366 x 768 with about 60 px to spare
  (`18-key-people-full.png`); the draft with Both fits (`40-draft-both.png`); the route's edge row
  with a label, band and motion fits (`1366x768-b/31-route-edges-full.png`).
- Every settings pop-out (Shape, Color, Line, Ends, Glow, Band) fits the window at both sizes.
- The value picker scrolls inside its own list and shows each column's fact ("77 values").
- The folder panel, Selection colors, the three-row panel and the Values tabs of Degree, Selected
  and the route show without overlap or truncation.
