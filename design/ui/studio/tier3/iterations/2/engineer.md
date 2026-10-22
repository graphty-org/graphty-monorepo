# Tier 3, iteration 2: screenshot audit of the style panel -- Design Engineer

Build under test: the frozen build `tier3-i2-2faecd941b` (`.study-builds/tier3-i2-2faecd941b/`),
served at https://dev.ato.ms:9373. Playwright, in its own browser context through the studio's
browser gate, opened every layer kind and every section, list, menu and pop-out of the style panel
in a 1366 x 768 window and in a 1920 x 1080 window. Every screenshot was looked at. After each
one the page was measured: text cut by its box, values wider than their field, controls past the
window that no scroller holds, sideways and lengthwise scrolling, overlapping controls, and every
open popover and whether it fits the window.

The scene is the one the owner's review stories build, on the Les Miserables sample opened from
the start page (so the app's own starting rows, Everything, Selected and Hovered, are on): an
Annotations folder holding Key people (Valjean, Javert, Cosette and Marius in orange, size 2), a
layer with a long name, Degree ("Connections"), Edge betweenness ("Bridge edges"), Louvain
("Communities", community 3 recolored green) and the shortest route from Myriel to Marius on top.
The walk selects Valjean and Javert for Selected, then adds a label, a tooltip, glow and halo to
Key people, and an edge label, band and motion to the route.

Screenshots (not committed; `build/` is ignored by git), under
`design/ui/studio/tier3/build/audit-i2/`:

- `<size>/NN-<state>.png` and `log.txt` (the measurements and the accessible names of each
  panel), where `<size>` is `1366x768` or `1920x1080`. A path below without a size names the
  1366 x 768 picture; the 1920 x 1080 one shows the same unless it says otherwise.
- `1366x768-sup/` and `1366x768-sup2/` for a second, shorter scene (Louvain and the route only):
  a category's row menu, Escape on a new effect, the tree's right-click menu, and motion.
- `crops/` for enlarged details.

Severity: 0 cosmetic only if time allows, 1 cosmetic, 2 minor (slows or misleads), 3 major (hides
information a task needs, or breaks a rule the owner settled), 4 blocks a task. "Owner" is the
package where the fix belongs.

No step raised a script error, a `console.error` or a failed request. No popover leaves the
window. The inspector is 240 px wide at both sizes; at 1920 x 1080 only the Values tabs and Label
settings scroll.

## Severity 4

None.

## Severity 3

1. **Effect colors show two characters of their hex.** Every effect entry's value field is about
   34 px wide with 11 px of text, so Glow reads "FF", Halo "11", Band "FF" and Key people's glow
   "00". The Selected starting row is two effects, so its whole look is unreadable at rest. The
   field is wide only while it has focus (the pick in `45-key-glow-pick.png`) and shrinks when it
   loses it. Property rows' color fields show all six digits in the same panel. Evidence:
   `10-selected.png`, `crops/1366-selected-effects.png`, `57-key-people-full.png`,
   `88-route-full.png`, `log.txt` ("Glow color" value "FFFFFF" 11px of 36px). Both sizes. Owner:
   graphty app (`style/Effects.tsx` and its row in `style/style.css`: the value's slot gets what
   is left after the name, vary, eye and minus; give it the property row's control column).

2. **A label and a tooltip look the same.** Each Text entry is a gear, a source field ("name"),
   an eye, a minus, then Look, Size and Position. Nothing on screen says which is the label and
   which the tooltip; the kind is only in the accessible name. A layer beneath does name them
   ("Label, from Key people", "Tooltip, from Key people"), so the owning layer says less than the
   layers that inherit from it. Evidence: `57-key-people-full.png` against `60-long-name.png`.
   Owner: graphty app (`style/LabelSection.tsx`: the kind's name on the entry's first line, as
   effect entries carry "Glow" and "Halo").

3. **The route's Which elements is a code fragment.** It reads "Nodes and edges where
   results.shortest_path.onPath == `true`", and editing it opens the Expression mode with that
   text in a 220 px box that cuts it. graphty-element already reads this selector as a rule
   (`selectorRule` turns a `results.` path compared with a yes-or-no value into a leaf), but the
   app's `formOf` in `style/whichRule.ts` maps every expression selector straight to Expression
   without asking it. Evidence: `76-route.png`, `78-route-which-elements.png` (both sizes).
   Owner: graphty app.

4. **One community still has two names.** The canvas key and the category popover call Louvain's
   groups "Group 1" to "Group 6"; the Values tab lists them as "1, 5, 3, 4, 2, 0". The pink group
   is "Group 6" in the key and "0" in Values. Open since iteration 1. Evidence:
   `67-louvain-values.png` against `66-louvain-categories.png`. Owner: graphty app
   (`inspector/LayerValues.tsx`: the group's ranked name, as the popover now uses).

## Severity 2

5. **One value goes by up to four names.** Degree's layer says "Nodes where Connections has a
   value" while its color pill says "Degree"; Louvain's says "Community" against the pill's and the
   key's "Louvain"; Edge betweenness's says "Bridging" against "Edge betweenness"; the route row
   is "Shortest route" and the key calls it "Shortest path". A reader who reads the sentence cannot
   find "Bridging" in the vary picker. Evidence: `61-degree.png`, `66-louvain-categories.png`,
   `68-edge-betweenness.png`, `88-route-full.png`. Owner: graphty app (the rule sentence and the
   pill should name a value the same way); if the two names come from two catalog entries (the
   result field's and the algorithm's), graphty-element should say which one names the value.

6. **"Mixed" for a layer that matches nothing.** Hovered matches 0 nodes and shows Size "Mixed"
   and Color "Mixed"; Selected with no edge selected shows edge Color and Width "Mixed"; Hovered
   also lists "Glow, from Selected" and "Halo, from Selected" though nothing is hovered.
   graphty-element's agreement read returns no channel at all for no elements; the app draws that
   as Mixed. Evidence: `24-hovered.png`, `10-selected.png`. Owner: graphty app (an empty match
   is "not set", with the layer's own count of 0 beside it).

7. **Settings pop-outs are mostly empty space.** Shape settings puts about 80 px of nothing
   between Wireframe, Show and Size combines, and Size combines is wider than the two above it;
   Ends settings spreads four fields over 700 px, down to the window's bottom; Band settings and
   Glow settings leave a blank band under each field. Evidence: `29-key-Node_shape_settings.png`,
   `70-eb-Edge_ends_settings.png`, `21-selected-Band_settings.png`,
   `14-selected-Glow_settings.png`. Owner: graphty app (the property grid inside a pop-out keeps
   a paired row's empty second slot).

8. **A number label turns the Values tab into a list of 15-digit decimals.** After the route gets
   an edge label from Edge betweenness, its Values tab shows "Edge betweenness, Groups, largest
   first: 1, 76, 19.826190476190476, 51.17380952380953 ... 147 more", then a second section with
   the same title holding the histogram. A continuous measure is listed as groups and unrounded.
   Evidence: `99-route-values.png`, `100-route-values-bottom.png`. Owner: graphty app
   (`inspector/LayerValues.tsx`: a number column read by a text channel is still a number).

9. **The same label prints its value unrounded on the canvas** ("129.64334674418718" along a
   route edge). Evidence: `crops/1920-route-edge-label.png` from
   `1920x1080/85-route-full.png`. Owner: graphty-element (a label bound to a number value has no
   number format by default; the label's "Shorten large numbers" does not cover decimals).

10. **A locked layer still draws some controls as live.** The color's hex ("E8590C"), the label
    sources ("name"), the effect chits, every eye and every minus keep full ink while Size, Shape
    and the label's Look dim. Partly open since iteration 1. Evidence: `58-key-locked.png`,
    `crops/1366-key-locked.png`. Owner: compact-mantine (`CompactColorInput`'s text and the
    icon buttons do not follow an `aria-disabled` ancestor), then the app's label source field.

11. **Two ways to clear remain.** Property rows clear with a minus; the ramp's Scale, the category
    popover's "More values than colors", and Graph settings' Background color and Highlight color
    clear with a small "x". Partly open since iteration 1. Evidence: `62-degree-ramp.png`,
    `66-louvain-categories.png`, `110-graph-settings.png`. Owner: graphty app (`showReset={false}`
    and the row's minus).

12. **Several rows together lose their edges.** Key people, Connections and the route selected
    together show Nodes (Shape, Size, Color) and Selection colors only: no Edges section though the
    route paints edges, and no Text or Effects. Evidence: `101-three-rows.png`. Owner: graphty app
    (`style/MultiRowPanel.tsx`).

13. **Find's offers are cut where they differ.** Typing "Mme" in a new layer's find offers three
    rows that all read "Nodes where name is Mme ..." with "1 node" below; the name that tells them
    apart is in the cut (158 px of up to 202 px). Evidence: `108-draft-find-mme.png` (both sizes).
    Owner: graphty app (`ResultRow`: wrap the first line, or put the value first).

14. **A bound field changes width when its popover opens.** Bridge edges' color pill shows "Edge
    betweenness" whole at rest and "Edge betwe..." while the ramp is open, because the detach
    button appears inside the row. Evidence: `68-edge-betweenness.png` against `74-eb-ramp.png`.
    Owner: graphty app (reserve the detach button's column as the vary column is reserved).

15. **The panel scrolls at 1366 x 768 once a layer paints both kinds.** The route with a label, a
    band and motion is 944 px of content in 728 px; the header, the Style and Values tabs and Which
    elements scroll away, and only the Nodes and Edges titles stick. Selected alone is 28 px too
    long, which hides its Band. Evidence: `88-route-full.png`, `89-route-full-bottom.png`,
    `11-selected-bottom.png`. Owner: graphty app (a data point for the brief's question on long
    panels; at 1920 x 1080 nothing scrolls).

16. **The key shows motion speed as a bare number** ("Shortest path: On the path 2").
    `NUMBER_CHANNELS` in `canvas/legendWords.ts` lists halo, band and text sizes but not motion
    speed. Evidence: `1366x768-sup2/04-route-motion-set-bottom.png`. Owner: graphty app.

17. **The ramp popover scrolls while there is room above it.** It opens downward from the field at
    y 335, is capped at the 388 px below, and scrolls 73 px of its own content, so the histogram
    leaves the view; scrolled to its end it shows 70 px of blank. Evidence: `62-degree-ramp.png`,
    `63-degree-ramp-bottom.png` (both sizes). Owner: compact-mantine (`Popout`: move the panel up
    before capping it, as it already does at the window's bottom).

18. **Label settings shows the gradient's colors, with an open color picker, while Gradient is
    off.** The two stops are drawn white and black in set ink under "Gradient: Default", and at
    1920 x 1080 the picker's pad runs past the panel's bottom. Evidence:
    `1920x1080/39-key-label-settings.png`. Owner: graphty app (`style/LabelSettings.tsx`: show
    the colors once a gradient is chosen), compact-mantine if `GradientEditor` cannot start with
    its picker closed.

## Severity 1

19. The inspector header draws a paintbrush for every layer while the tree draws what the layer
    paints (a node dot, an edge line, both); a folder's child list also uses the paintbrush
    (`03-everything.png`, `25-folder.png`). Owner: graphty app.
20. Left edges differ: Which elements at 1135 px, the Nodes title at 1143, Text and Effects at
    1147, fields at 1169; the label's Look, Size and Position start at 1147, off the field column,
    with no Clear column (`28-key-people.png`, `39-key-label-entry.png`). Open since iteration 1.
    Owner: graphty app.
21. Label settings mixes two caption sizes (Text color, Background and Border color are larger
    than Font, Padding and the rest), and "Icon" and "After a shortened number" show "Default" in
    upright body ink where every other unset field is italic (`40-key-label-settings.png`,
    `41-key-label-settings-bottom.png`). Owner: graphty app (`LabelSettings.tsx`), compact-mantine
    for the text field's not-set look.
22. Band settings shows opacity as "1" while every color field shows opacity as "100 %"
    (`21-selected-Band_settings.png`). Owner: graphty app.
23. The canvas key scrolls by 11 px with only three runs on (`02-scene-tree.png`); a scrollbar for
    one partly hidden row. Owner: graphty app (`canvas/LegendCard`).
24. The inspector's "Layer actions" menu has no Move to folder; the tree's right-click menu has it
    (`109-row-actions.png` against `1366x768-sup/04-tree-row-move-to-folder.png`). Owner: graphty
    app.
25. Right-clicking a tree row opens its menu without selecting it, so the previous row keeps the
    selection highlight and the menu does not show which row it acts on
    (`1366x768-sup/03-tree-row-context-menu.png`). Owner: compact-mantine (`Tree`).
26. A Clear tooltip names "Node defaults", which is not a row in the tree ("Clear: back to 1, from
    Node defaults", `36-key-clear-tooltip.png`). Owner: graphty app (name it "Everything", or the
    element's default by its value alone).

## Fixed since iteration 1, checked on screen

- Label settings is capped at the window's height and scrolls; sixty presses of Tab keep the
  focused field on screen (`40` and `41-key-label-settings*.png`, `log.txt` "LABEL TAB60").
- The category popover shows each group's name and count beside its color (`66`).
- Which elements shows on every layer: run layers, starting rows, the route (`61`, `65`, `68`,
  `76`, `03`).
- The app opens a project with Everything, Selected and Hovered (`02`).
- A route is one row with a Nodes and an Edges section; runs stack in run order with the route on
  top, and Bridge edges no longer paints over it (`02`, `76`, `100` "Edge color 2 of 2").
- The key drops Selected's sizes and opacities and the label sizes (`02`, `57`).
- Shape and arrow names are whole, on two lines where needed (`31-key-shape-list.png`,
  `71-eb-head-list.png`).
- Property rows keep their width, show a six-digit hex, and put the minus in one column (`03`,
  `28`, `76`).
- Text's "+" holds Label and Tooltip; a one-item list becomes a direct button ("Add motion").
- Escape on a new effect leaves nothing (`1366x768-sup/02-everything-glow-escape.png`).
- Graph settings opens on Style and no longer scrolls sideways; the layout description has no code
  (`110`, `111`).
- Louvain's Values tab has no histogram of community ids; the route's has one Summary and a Route
  section (`67`, `99`).
- The row menus have Duplicate, Move to folder and Select what it paints; the tree's "Painted
  over" mark is a whole glyph; the header glyph keeps its size beside a long name; "Mixed" is no
  longer in capitals (`109`, `02`, `60`, `10`).
