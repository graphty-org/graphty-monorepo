# Iteration 3: coverage and generality of the style panel

A check of the third build of the unified style panel from the information architecture side, on
three questions: can every style graphty-element has be reached from the panel; does every property
that can vary by a value offer it, and can the binding be made into every scale the value needs; and
can a reader pick elements generically ("odd-numbered node ids", "name contains Bob") on different
datasets without any algorithm getting a door of its own. Severity runs from 0 (not a problem) to 4
(blocks the work). Each finding names its screenshot and the package that owns the fix.

## What was walked

- The build served at https://dev.ato.ms:9373 on 2026-10-13 (branch `design/studio-tier3`, build
  stamp `617b43b270eb graphty@0.8.68`), driven with Playwright in its own browser context through
  the studio's browser gate, at 1440 x 900.
- Three datasets. Two samples from the start screen: College football (115 teams, ids 0 to 114, a
  `label` column with each team's name, a `value` column holding the conference as a number 0 to 11,
  no edge columns) and Les Miserables (77 characters, ids that are names, a `name` column, one edge
  column `shared_chapters`). And a reader's own file, opened through Open project or file and the
  Data page's Load: seven people in GML with ids 1 to 7, a `name` column in which three names hold
  "Bob" (Bob Ross, Bobby Tables, Dave Bobson), a `team` number 1 to 3 and a `tint` column of hex
  colors. The samples hold no "Bob", so there "name contains Bob" was run literally and then with a
  word each dataset does hold: "State" (College) and "Mme" (Les Miserables).
- Every layer was made by clicks and keys: Add layer, a kind, a rule or a find offer, then a value.
  Degree and Louvain were started through the session only to check that their values reach the
  pickers without any special entry.
- The style catalog (`tier3/style-catalog.md`) was checked against every control, every "+" menu and
  every settings pop-out of the Everything row (which paints both kinds): label, tooltip, outline,
  glow and halo on nodes; label, both end captions, band and motion on edges. The number, category,
  per-value and color pop-overs were opened with every scale chosen that matters below.
- Screenshots (local, not committed) are in `design/ui/studio/tier3/build/ia-i3/`; names below are
  relative to it. The driving scripts, the GML file and their logs are in `tmp/ia-i3/` of this
  worktree.

## Summary

13 findings: 1 at severity 3, 5 at severity 2, 5 at severity 1, 2 at severity 0. Of iteration 2's
17 findings, 9 are fixed, 4 are partly fixed and 4 are unchanged (status at the end).

Coverage of styles is whole: every channel, label field and graph setting graphty-element publishes
has a control, and every property that takes a value now offers vary by (47 of 51; the four
yes-or-no properties have none by a recorded decision). Generic picking works on all three
datasets, by find and by conditions, with true counts, from a draft that now says what it holds
before anything paints; "name contains Bob" on the reader's own file finds exactly the three Bobs.
Clear now names what comes back over the layer's own elements, which answers the owner's unset
question.

What is left is about what a binding can be made INTO and what the pickers can read, not about
missing controls: the one-color-per-value path for a numeric category paints shades of orange while
the panel names a distinct palette; an enum property refuses the same column; Power has no exponent;
and two facts graphty-element now publishes (a value read at an edge's ends, and find's match on a
value's name) never reach the panel.

## Severity 3

### 1. "One color per value" on a numeric category paints a ramp and says it does not

The iteration 2 severity 3 (College's conference cannot be painted as categories) is half fixed.
Color by `value` now offers "One color per value". Pressing it gives twelve neighboring shades of
orange and brown on the canvas, while the pop-over's Palette field shows "Eight distinct colors" in
the gray not-set style, and the canvas key draws a continuous ramp labeled "6" at one end and "5" at
the other (`follow-College-03-per-value-default.png`, `bind-College-03-color-number-per-value.png`).
A reader cannot tell conference 6 from conference 3, and the panel and the key both say something
other than what paints. Choosing "Nine soft colors" by hand fixes all three: twelve distinguishable
colors and a key of twelve swatches (`follow-College-05-per-value-nine.png`), so the model works and
the defaults mislead.

- What happens: graphty-element resolves twelve groups with no palette named to the sequential
  "Orange to brown" palette (no built-in categorical palette holds twelve), and its legend chooses
  a ramp from the palette's kind, not from the scale. The app's Palette field shows the first
  categorical palette as the default (`BindingPopover.tsx`, the category pop-over's
  `defaultValue`) because the resolved palette is not in its list; its accessible name says
  "ylorbr", its text says "Eight distinct colors".
- Owner: graphty-element (a legend block for an `ordinal` binding is categorical whatever the
  palette, in `session/styles/legend.ts` `kindOf`); graphty app (the field shows the palette that
  paints, or "One color per value" names a categorical palette and "Extend the palette" when it
  writes the binding, as the reader's own choice would).

## Severity 2

### 2. Values read at an edge's ends never reach the panel

graphty-element now publishes every node value read at each edge's source and target as a readable
value (`ReadableValue.end`, since 3.26.0), as iteration 3's plan asked. All three pickers leave them
out: the rule editor's Attribute list for an Edges layer holds only `shared_chapters` on Les
Miserables and nothing at all on College football (`pick-Les-21-edge-attr.png`,
`pick-College-21-edge-attr.png`, an empty select with no words); find on an Edges layer answers "No
element matches State" (`pick-College-22-edge-find.png`); and the vary picker for Edge width offers
nothing on College (`follow-College-07-picker-edges-width.png`). So "edges whose source is
Valjean", "edges inside one conference" and "width by the source's Connections" still cannot be said
anywhere. "Edges touching the teams named State" does work through Both and "touching them" (229 of
613 edges on College, 26 of 254 on Les Miserables, `pick-College-24-both-written.png`,
`pick-Les-24-both-written.png`), so the gap is wording, not the model.

- Cause: `graphty/src/workspace/rules/conditions.ts` (`readableFields`) and `ValuePicker.tsx`
  (`entriesOf`) filter out `value.end` with a note that the picker must first word it ("the
  source's name").
- Owner: graphty app (list them under "Source" and "Target" groups, worded "Source's name"; the
  element already gives the path, the facts and the rule shape).

### 3. The empty vary picker points to Both, and Both says the same

On an edge property with no edge values the picker says "The edges carry no values. To paint by a
node value, make this layer Both in Which elements." On a layer that already is Both it says exactly
the same, with nothing to pick (`follow-College-08-picker-both-width.png`). Both changes which edges
are picked, never what an edge property can read. A door whose label does not match where it lands.
Owner: graphty app (once finding 2 is fixed the list is not empty; until then the words must not
promise a path that does not exist).

### 4. Find matches a value's numbers, not its name

After Degree and Louvain ran, typing "10" offers "Connections is 10", "Rank of Connections is 10" and
"Community size is 10" on both samples (`pick-Les-18-find-10.png`, `pick-College-18-find-10.png`):
the run values reach find, half of iteration 2's finding 5. Typing the name of a value does not:
"Connections", "degree", "Community" and "Group 3" all answer "No element matches" on both datasets
(`pick-Les-15-find-Connections.png`, `pick-College-16-find-degree.png`,
`pick-Les-19-find-Group_3.png`). graphty-element's find already returns these (`FindResult.named`:
"degree" finds Connections, with an "at least" cut for a number); the app does not show them.
"Group 3" is the word the key and the Values tab use for a community, so a reader who reads the key
and types what it says finds nothing.

- Owner: graphty app (render `named` rows in Which elements' find, and match the key's own group
  names, which are the app's words, against the group's value).

### 5. A number that names groups can be colored per value but not shaped per value

On College the vary picker for Shape folds `value` (the conference) under "Does not fit: Holds
amounts, not groups" (`follow-College-02-shape-value-search.png`); on the reader's file `team` (1 to 3) is folded the same way (`people-people-11-shape-by-team.png`). The same columns get "One color per
value" in the color pop-over, and Degree's Connections (7 to 12) does fit Shape
(`follow-College-01-picker-shape-after-runs.png`). One column, two answers, depending on which
property asks. Nothing in the app lets a reader say "this number names groups": graphty-element's
`data.declare(..., { measurement })` has no home in the Data page.

- Owner: graphty-element (`styles.proposeEncoding` proposes the ordinal scale for an enum channel on
  a number with few distinct values, as the color path does, additively); graphty app (a home for a
  column's measurement on the Data page, the one place that already says what each column is).

### 6. Power is offered without its exponent

The number pop-over's Scale list offers Power for size and color. Choosing it changes nothing on the
canvas and adds no control (`bind-College-05-size-power.png`): the exponent (0.1 to 10, default 1,
catalog section 9.1) is not reachable, so Power with exponent 1 is Linear under another name. Owner:
graphty app (an exponent field when Power is chosen, in the pop-over's Scale group).

## Severity 1

7. **Odd ids need a regular expression.** "Node id matches pattern [13579]$" gives the true counts
   on every dataset: 57 of 115 on College, 4 of 7 on the reader's file, 2 of 77 on Les Miserables
   (whose ids are names; two end in a digit) (`pick-College-11-cond-odd-red.png`,
   `people-people-07-odd-big.png`, `pick-Les-11-cond-odd-red.png`). It is the only way: find treats
   "[13579]$" and "odd" as text and matches nothing (`pick-College-12-find-pattern.png`), and the
   id's comparisons are text ones even where every id is a whole number (College, the reader's
   file), so no "at least", "between" or "is odd" exists for it. The owner's own example works, for
   a reader who writes regular expressions. Owner: graphty-element (number comparisons for a
   numeric id and a parity leaf in its rule language, additive); graphty app (offer them).
8. **The draft names its count but marks nothing on the canvas.** After "label contains State" the
   draft says "Nodes where label contains State" and "24 nodes, added when a property is set"
   (`pick-College-03-find-picked-draft.png`): iteration 2's finding 4 is fixed in words. The 24 teams
   are not marked until a value lands, so "the 24 I meant" still cannot be checked against the
   drawing. Owner: graphty app ("Select what it paints" exists on written layers; the draft can
   offer it).
9. **Two layers whose rules differ only in case.** "Label contains state" and "Label contains State"
   (and "Name contains mme" beside "Name contains Mme") sit side by side; the rule matches either
   case, so the second name adds nothing (`pick-College-11-cond-odd-red.png`). Unchanged from
   iteration 2. Owner: graphty app.
10. **Fold into Other has no threshold.** "More values than colors" offers Fold into Other, Repeat
    colors and Extend, but the binding's `other.threshold` (fold groups smaller than N) is not
    reachable; Other appears only when a palette runs out (the pop-over's controls are listed in
    `tmp/ia-i3/log-bind-College.txt`, "AFTER PER VALUE"; `bind-College-03-color-number-per-value.png`).
    Owner: graphty app.
11. **Styles no channel reaches.** Eight label style fields (text path, position, attach position,
    auto size, resolution, billboard mode, borders, outline join) and a node's gradient color have no
    channel in graphty-element (catalog sections 5.3 and 12), so no panel can set them. Unchanged.
    Owner: graphty-element, only if a use appears.

## Severity 0

12. Recorded decisions hold: `node.flat` (nothing draws it) and `node.marker` (refused by the
    element) are not offered; wireframe, show, curved and edge show have no vary because a rule plus
    a fixed value does the job; a label's look has no vary because its parts vary on their own. All
    are in `graphty/src/workspace/style/coverage.ts` (`NO_VARY`, `VARY_DECISIONS`), so the coverage
    test reads them as decisions. Correct.
13. An effect added from "+" opens its settings with a color not set; leaving with Escape removes it
    (`cover-Les-04-added-Halo.png`). This matches "nothing is added until a property is set" for a
    new layer, so it is one rule, not a defect.

## What works

- **Every style has a control.** Reached in this pass: shape (all 25), size, color with opacity,
  wireframe, show and combine on nodes; label and tooltip with source (a value or fixed text), look,
  size, position and every settings group, with text color and background that vary; outline, glow
  with strength, halo with size and opacity; edge color with opacity, width, pattern and count,
  curved, show, combine; head and tail kind, size, color and opacity; edge label and both end
  captions; band with color, width and opacity; motion with speed. Graph settings holds background
  color and image, 3D or 2D, lighting, same size at any depth, highlight color and the two label
  layout switches. Logs `tmp/ia-i3/log-cover-Les.txt`, `log-follow-College.txt`; screenshots
  `cover-Les-*`, `follow-College-09-tooltip-settings.png`, `follow-College-10-caption-settings.png`.
- **Vary on every property that takes a value**: 47 of 51 (iteration 2: 43). Opacity varies from the
  color's, line's, ends', halo's and band's settings (`bind-College2-06-color-settings.png`,
  `bind-College2-07-opacity-bound.png`, `cover-Les-14-set-Edge_ends_settings.png`). Every vary
  button is named after its property, captions included ("Edge caption at the target end color by
  attribute").
- **Most of what a binding can become.** Seven number scales, Equal bins with a count, domain,
  clamp, range, reverse, midpoint for a diverging palette, no-value, combine; for groups a palette,
  a color per value, hiding a value, overflow and no-value; all 18 palettes (10 for numbers, 8 for
  groups). "Use the values as colors" appears for the reader's `tint` column and paints each node
  its own color (`people-people-10-tint-as-colors.png`): iteration 2's finding 8 is fixed.
- **Name contains, three datasets, both paths, from the draft.** "label contains State" 24 of 115 on
  College and "name contains Mme" 6 of 77 on Les Miserables, by find and by conditions; "Bob"
  answers "No element matches Bob" on both samples and finds exactly three of seven on the reader's
  file (`people-people-05-find-bob.png`, `people-people-06-bob-red.png`). Layers are named by their
  rule ("Name contains Bob"). Find no longer offers the same set twice ("node id contains Mme" is
  gone).
- **No favored algorithm.** The rule kinds are Every one, Where a value, Top N by, Named, Members of
  a set, Selected, Hovered and Expression on every dataset, before and after runs. Run values join
  the same Attribute and Top N lists as data columns, grouped under Degree and Louvain and named
  alike in the rule editor and the vary picker ("Rank of Connections", "Community size")
  (`pick-College-13-attr-after-runs.png`, `follow-College-01-picker-shape-after-runs.png`):
  iteration 2's finding 7 is fixed.
- **Clear says what comes back over the layer's own elements.** "Community Group 3", made with "New
  layer for Group 3", reads "Clear: back to teal, from Communities"; College's "value 3" reads
  "back to blue, from Everything" (`bind-Les-07-split-new-layer.png`,
  `follow-College-06-new-layer-3.png`). Iteration 2's finding 3, the owner's unset question, is
  fixed. "New layer for" reads back as an ordinary rule ("Nodes where Community is one of Group 3",
  11 of 77), editable in Which elements (`bind-Les-08-split-rule-editor.png`).

## Iteration 2's findings

| Iteration 2 finding                               | Now                                                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1. Numeric category cannot be painted per value   | Partly fixed: offered, but the default paints a ramp and says otherwise (finding 1) |
| 2. Eight properties without vary                  | Fixed: opacity varies from settings; yes-or-no recorded as decisions (finding 12)   |
| 3. Clear says "mixed" when one value comes back   | Fixed                                                                               |
| 4. The draft says nothing about what it picks     | Partly fixed: sentence and count, no canvas mark (finding 8)                        |
| 5. Find cannot read a run's values                | Partly fixed: by number yes, by name no (finding 4)                                 |
| 6. Edge-only layers read nothing; ends unreadable | Partly fixed: the element publishes edge ends; the panel lists none (findings 2, 3) |
| 7. One run's values, two names and groupings      | Fixed                                                                               |
| 8. Data that holds colors cannot paint with them  | Fixed                                                                               |
| 9. Effect draft has no vary until a color         | Fixed: adding opens its settings with every vary glyph                              |
| 10. Caption vary buttons named otherwise          | Fixed                                                                               |
| 11. Yes-or-no vary recorded in the coverage map   | Fixed                                                                               |
| 12. Rules that differ only in case                | Unchanged (finding 9)                                                               |
| 13. Find offers the same set twice                | Fixed                                                                               |
| 14. Styles no channel reaches                     | Unchanged (finding 11)                                                              |
| 15. `node.flat` and `node.marker` not offered     | Unchanged, correct (finding 12)                                                     |
| 16. Scene items not in the panel                  | Unchanged, correct                                                                  |
| 17. Odd ids on data whose ids are names           | Unchanged, correct; odd ids need a regular expression everywhere (finding 7)        |
