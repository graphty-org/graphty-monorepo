# Tier 3, iteration 3: screenshot audit of the style panel -- Design Engineer

Build under test: the frozen build `tier3-i3-617b43b270` (`.study-builds/tier3-i3-617b43b270/`),
served at https://dev.ato.ms:9373. Playwright, in its own browser context through the studio's
browser gate, opened every layer kind and every section, list, menu and pop-out of the style panel
in a 1366 x 768 window and in a 1920 x 1080 window, with classic (always visible) scrollbars. Every
screenshot was looked at. After each one the page was measured: text cut by its box, values wider
than their field, controls past the window that no scroller holds, sideways and lengthwise
scrolling, overlapping controls, and every open popover and whether it fits the window.

The scene is the one the owner's review stories build, on the Les Miserables sample opened from
the start page (so the app's own starting rows, Everything, Selected and Hovered, are on): an
Annotations folder holding Key people (Valjean, Javert, Cosette and Marius in orange, size 2), a
layer with a long name, Degree ("Connections"), Edge betweenness ("Bridge edges"), Louvain
("Communities", one group recolored green) and the shortest route from Myriel to Marius on top.
The walk selects Valjean and Javert for Selected, then adds a label, a tooltip, glow and halo to
Key people, and an edge label and a band to the route. A second, shorter scene (Louvain, the route
and Key people only) covers a category's row menu, motion on the route, Tab through Label settings
and the route's Values tab. A third opens College football and makes its conference layer through
the panel (Add layer, Nodes, the color's vary glyph, "value", "One color per value").

Screenshots (not committed; `build/` is ignored by git), under
`design/ui/studio/tier3/build/audit-i3/`:

- `<size>/NN-<state>.png` and `log.txt` (the measurements and the accessible names of each panel),
  where `<size>` is `1366x768` or `1920x1080`. A path below without a size names the 1366 x 768
  picture; the 1920 x 1080 one shows the same unless it says otherwise. The numbering differs
  slightly between the two sizes after picture 81.
- `1366x768-sup/` for the second and third scenes.
- `crops/` for enlarged details.

Severity: 0 cosmetic only if time allows, 1 cosmetic, 2 minor (slows or misleads), 3 major (hides
information a task needs, or breaks a rule the owner settled), 4 blocks a task. "Owner" is the
package where the fix belongs. CONFIRMED means the mechanism was found in the code or measured;
PLAUSIBLE means it is seen in the pictures but the cause was not traced.

No step raised a script error, a `console.error` or a failed request. No popover leaves the
window. The inspector is 240 px wide at both sizes, so everything said about its fields holds at
1920 x 1080 too. Two walk steps failed only because the script expected a menu (see 1.21).

## Severity 4

None.

## Severity 3

1. **Property names are cut to two letters in the label column.** A field line's label column is
   56 px. When the settings gear sits in it, the name gets about 26 px: Shape reads "Sh...", Color
   "Co...", Head "He...". When the painted-over mark sits there too, Color reads "C." (Key people,
   Connections, Communities, Bridge edges). The names that need reading most -- the ones with
   settings and the ones another layer paints over -- are the ones cut. Settings pop-outs cut the
   same way: "Wirefra...", "Pattern ...", "Head c...", "Head o...", "Tail opa...". The Tooltip
   entry reads "Tool...". The 240 px inspector does not grow at 1920 x 1080, so it is the same
   there. Evidence: `03-everything.png`, `29-key-people.png`, `crops/1366-key-label-column.png`,
   `64-degree.png`, `04-everything-Node_shape_settings.png`, `07-everything-Edge_line_settings.png`,
   `09-everything-Edge_ends_settings.png`, `46-key-effects-menu.png`; `log.txt` ("Color" shows 12px
   of 29px). CONFIRMED (measured). Owner: graphty app (`style/Field` grid and `--ws-label` in
   `style/style.css`; the settings button and painted-over mark share the label column). Figma
   keeps a row's name whole and puts its extra buttons at the row's end.

2. **"One color per value" on a number column paints shades of one orange, and the key calls it
   a ramp.** College football's conference (a number column, 12 values) after "One color per
   value": twelve oranges from light to dark, the popover's palette select still says "Eight
   distinct colors", and the canvas key draws a sequential ramp labelled "6" to "5" (the largest
   group to the smallest). Evidence: `1366x768-sup/10-football-one-per-value.png`,
   `1366x768-sup/11-football-layer.png`. CONFIRMED (known from the iteration 3 review stories,
   still open). Owner: graphty-element, whose ordinal binding with no palette on a number column
   picks the sequential "ylorbr" and reports a sequential key block. Changing that default is
   breaking and the owner's call; the additive way is for the app to pass a categorical palette as
   its own choice.

3. **The Values tab's histogram breaks for a value bound by category or as text.** College
   football's "value", bound one color per value: the bars are the twelve groups sorted largest
   first, not the values in order, and the axis reads "0" to "0" above "115 have a value, 0 to 11".
   The route, whose edge label reads Bridging: no bars at all, the axis "0" to "0", and "254 have
   a value, 1 to 536, median 16.46" for a layer that matches 2 edges. Evidence:
   `1366x768-sup/12-football-values.png`, `103-route-values.png`, `104-route-values-bottom.png`.
   CONFIRMED for the axis: `NumberValues` in `graphty/src/workspace/inspector/LayerValues.tsx`
   takes the binding preview's bins whenever one has a paint, and a category preview's bins carry
   no `from`/`to`, so `bin.from ?? 0` and `bin.to ?? 0` print 0. PLAUSIBLE for the route's empty
   bars and whole-graph count (not traced). Owner: graphty app.

## Severity 2

4. **The vary picker cuts names where they differ.** Rows are one line in a 240 px popover, with
   the range on the right: "Rank of Connectio...", "Percentile of ...", "Position on the rou...",
   "Distance from the ...", "Percentile of B..." and "3 that do not fi...". The cut part is often
   the part that tells two values apart. Evidence: `36-key-vary-picker.png`,
   `37-key-vary-picker-bottom.png`, `40-key-label-source.png`, `89-route-edge-label-source.png`.
   CONFIRMED (measured: "Distance from the source of On the route" shows 130 px of 257 px). Owner:
   graphty app (`ValuePicker`; a two-line row, or a wider popover, or a title on the cut name).

5. **The key card scrolls while most of the canvas is empty.** The card is capped at 289 px at
   1366 x 768 and 414 px at 1920 x 1080. Once Key people's glow and halo and the route's band add
   blocks, the edge ramp, Group 6 and the Key people entries sit behind the "more below" fade and a
   scrollbar, with 400 px (1366) to 600 px (1920) of empty canvas under the card. Evidence:
   `46-key-effects-menu.png`, `91-route-full.png`, `1920x1080/90-route-full.png`. Owner: graphty
   app (`canvas/LegendCard.tsx` cap).

6. **A layer's Text and Effects list the entries of layers beneath it.** Every layer above Key
   people shows "Label, from Key people", "Tooltip, from Key people", "Glow, from Key people" and
   "Halo, from Key people", each with an eye that hides Key people's entry from another layer's
   panel. That is four rows (about 110 px) on Connections, Communities, the long-named layer and
   the route, and it is what pushes the route into scrolling at 1366 x 768 once its rule is open
   (790 px in 728 px). Whether these belong on a layer that does not paint them is a question for
   the information architect. Evidence: `63-long-name.png`, `64-degree.png`, `68-louvain.png`,
   `79-route.png`, `80-route-which-elements.png`. Owner: graphty app.

7. **The panel's header and tabs scroll away.** In a Style or Values tab that scrolls, the layer's
   name, its kind and the Style / Values tabs leave the top, so the reader loses which layer they
   are editing. Evidence: `81-route-which-elements-bottom.png`, `91-route-full.png`,
   `104-route-values-bottom.png`, `116-graph-settings-bottom.png`. Owner: graphty app (inspector
   layout: make the header and tabs sticky, or scroll only the tab body).

8. **A locked layer still draws some controls as live.** On locked Key people the size, shape and
   look fields dim, but the color's hex, the label and tooltip sources ("name"), every gear, eye
   and minus, the Effects "+", the rule's pencil and every vary glyph stay at full strength.
   Evidence: `61-key-locked.png`, `crops/1366-key-locked.png`. PLAUSIBLE (whether they are inert
   was not tried). Owner: graphty app.

9. **A yes-or-no condition is a text box.** The route's rule opens as "On the route", "is", and a
   free text box holding "true". Evidence: `80-route-which-elements.png`. Owner: graphty app (the
   rule editor; a yes-or-no value wants a select or a segmented control).

10. **Find offers name a node by its id.** Typing "Mme" in a new layer offers "This node:
    MmeMagloire" and "This node: MmeDeR" right under "name is Mme Magloire" and "name is Mme de R".
    Evidence: `112-draft-find-mme.png`. Owner: graphty app (the offer's words; the element's offer
    carries the matched name).

11. **A bound color pill cuts the value's name.** With the 36 px color strip, the pill shows
    "Conne..." and "Comm..."; only a short name such as "value" or "Bridging" fits. Evidence:
    `64-degree.png`, `68-louvain.png`. Owner: graphty app (field width) or compact-mantine
    (`VariablePill`).

12. **Several rows together claim a label they do not all have.** Key people, Connections and the
    route selected together show a Label from "name" and a Tooltip from "name", with Look, Size
    and Position, as if all three had them; only Key people does. An edit there would write to all
    three. Evidence: `105-three-rows.png`. PLAUSIBLE. Owner: graphty app (the several-rows panel).

13. **Tab leaves Label settings for the top of the page.** After the pop-out's last field, Tab
    goes to the inspector's resize handle and then to the page's first control (the main menu),
    not to the control after the gear that opened it; the pop-out stays open behind. Evidence:
    `1366x768-sup/log.txt` ("LABEL TABS", stops 53 to 56),
    `1366x768-sup/06-label-settings-tab-out.png`. Owner: compact-mantine (`Popout`: return Tab
    to the trigger's next control, as a non-modal popover should).

## Severity 1

14. **Label settings covers the canvas toolbar at 1366 x 768.** The pop-out runs from the header
    to the window's bottom and hides the right end of the bottom toolbar (the search button is
    half covered). Evidence: `42-key-label-settings.png`. Owner: graphty app (pass a bottom
    boundary) or compact-mantine (`Popout`).

15. **Everything's Values tab has an empty "Painted" heading.** Evidence:
    `10-everything-values.png`, `107-add-menu.png`. Owner: graphty app.

16. **The vary picker keeps its full height for three values.** College football's picker shows
    id, label and value over about 170 px of empty list. Evidence:
    `1366x768-sup/07-football-vary-picker.png`. Owner: graphty app or compact-mantine
    (`QuickActions` height).

17. **A set palette's name is cut.** Once the ramp's palette is set, its Clear minus takes room and
    the select reads "Orange to br...". Evidence: `1366x768-sup/09-football-ramp-popover.png`.
    Owner: graphty app.

18. **Shape and Line settings mix two layouts.** Their rows put the name beside the field, but
    "Size combines" and "Width combines" put the name above a full-width select. Evidence:
    `04-everything-Node_shape_settings.png`, `07-everything-Edge_line_settings.png`. Owner:
    graphty app.

19. **A new layer's Which elements starts 8 px left of every other section.** Its title, Nodes /
    Edges / Both, find and rule sit at x 1135; Nodes and Edges below sit at 1143. Evidence:
    `108-draft.png`, `109-draft-nodes.png`. Owner: graphty app.

20. **Motion's entry is out of line.** Motion has no chip, so its glyph sits alone in the chip
    column, about 5 px above the name's baseline and without the 24 px box the other entries have.
    Evidence: `1366x768-sup/03-route-motion-new.png`, `1366x768-sup/04-route-with-motion.png`.
    Owner: graphty app (`style/Effects.tsx`).

21. **The same "+" sometimes opens a menu and sometimes adds.** With two or more effects left,
    Effects' "+" opens a menu; with one left it adds that effect at once ("Add motion", "Add
    outline"). Same glyph, two behaviors in one panel. Evidence: `log.txt` (the button's name
    changes to "Add motion" after the route gets a band), `92-route-full-bottom.png`. Owner:
    graphty app; a question for the interaction designer.

22. **A dark effect chip has no edge on the dark panel.** Selected's glow (#111111) is a black
    square on #2b2b2b with nothing to mark its edge. Evidence: `11-selected.png`. Owner:
    compact-mantine (`CompactColorInput` chip: the ring the white chip has, for dark colors too).

23. **Two "None" values are text boxes.** In Label settings, Icon and Progress are text boxes
    reading "None" beside selects reading "None". Evidence: `43-key-label-settings-bottom.png`.
    Owner: graphty app.

## Severity 0

24. Graph settings' "Advanced" disclosure caret sits 8 px left of the content edge. Evidence:
    `116-graph-settings-bottom.png`. Owner: graphty app.

## Fixed since iteration 2

- Effect colors are chips with their name, eye, gear and minus on one 24 px line; the hex lives
  in the settings (`11-selected.png`).
- A label and a tooltip carry their own glyph and word (`46-key-effects-menu.png`).
- Rules read in words ("Nodes and edges on the route", "Named: Valjean, Javert, Cosette,
  Marius"), and a run's groups are "Group 1" to "Group 6" everywhere (`70-louvain-values.png`).
- Number labels are rounded on the canvas and in Values ("130", "536").
- Several rows together keep their Edges section and show the selection colors.
- Key people with a label, a tooltip, glow and halo fits at 1366 x 768 without scrolling
  (`60-key-people-full.png`); the route at rest fits (`79-route.png`).
- The ramp popover is 240 px wide and fits the window (`65-degree-ramp.png`).
