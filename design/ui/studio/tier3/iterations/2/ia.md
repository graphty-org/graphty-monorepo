# Iteration 2: coverage and generality of the style panel

A check of the second build of the unified style panel from the information architecture side, on
three questions: can every style graphty-element has be reached from the panel; does every property
that can vary by a value offer it; and can a reader pick elements generically ("odd-numbered node
ids", "name contains Bob") on two different datasets without any algorithm getting a door of its
own. Severity runs from 0 (not a problem) to 4 (blocks the work). Each finding names its screenshot
and the package that owns the fix.

## What was walked

- The build served at https://dev.ato.ms:9373 on 2026-10-12 (branch `design/studio-tier3`, build
  stamp `2faecd941bc0`), driven with Playwright in its own browser context through the studio's
  browser gate, at 1440 x 900.
- Two datasets opened from the start screen's samples: College football (115 teams, numeric ids 0 to
  114, a `label` column with each team's name, a `value` column holding the conference as a number
  0 to 11, no edge columns) and Les Miserables (77 characters, ids that are names, a `name` column,
  one edge column `shared_chapters`). Neither has a "Bob", so "name contains Bob" was run literally
  and then with a word each dataset does hold: "State" (24 teams) and "Mme" (6 characters).
- Every layer was made by clicks and keys: Add layer, a kind, a rule, then a value. Degree and
  Louvain were started through the session only to check that their values reach the pickers
  without any special entry.
- The style catalog (`tier3/style-catalog.md`) was checked against every control, every "+" menu and
  every settings pop-out of the Everything row (which paints both kinds), with every list entry
  added: label, tooltip, outline, glow and halo on nodes; label, both end captions, band and motion
  on edges. Graph settings, the ramp and category pop-overs and the combine choice were opened too.
- Screenshots (local, not committed) are in `design/ui/studio/tier3/build/ia-i2/`; names below are
  relative to it. The driving scripts and their logs are in `tmp/ia-i2/` of this worktree.

## Summary

17 findings: 1 at severity 3, 7 at severity 2, 6 at severity 1, 3 at severity 0. Of iteration 1's
13 findings, 9 are fixed, 2 are partly fixed and 2 are unchanged (status at the end).

Coverage is close to whole. Every channel graphty-element has now has a control, including the
captions at an edge's ends, a tooltip's look, label colors that vary, fixed label words and the
selection's look on the default Selected row. Vary is offered on 43 of the 51 properties that can
take a value (iteration 1: 11). Generic picking works on both datasets by find and by conditions,
from the draft before anything paints, and the rule editor now reads a run's values. What is left
is mostly about what the pickers can read and say: a number column that holds categories cannot be
painted as categories, find and the rule editor still read different lists, an edge-only layer has
nothing to read on a dataset without edge columns, and Clear names "mixed" where one value comes
back.

## Severity 3

### 1. A number that names a category cannot be painted as categories

College football's `value` column is the conference, stored as 0 to 11. Color by `value` gives a
12-step orange-to-brown ramp in which neighboring conferences cannot be told apart, and nothing in
the pop-over turns it into one color per conference: the Scale list offers only the seven number
scales (Linear, Logarithmic, Negative logarithmic, Square root, Power, Equal bins, Equal counts),
and the Palette list only the ten ramps, none of the eight categorical palettes
(`scale-College-01-scales.png`, `graph-College-06-palettes.png`). Coloring teams by conference is
the canonical task on this dataset, and cluster ids, group codes and years are stored as numbers in
most real data.

- Cause: `graphty/src/workspace/style/BindingPopover.tsx` filters the catalog's scales to
  `domainKind === "numeric"` and its palettes to non-categorical ones for a number. graphty-element
  already paints a number by category: its `ordinal` scale ("one color per value") reads numbers as
  text (catalog 9.1).
- Owner: graphty app (offer "One color per value" for a number, and switch to the category
  pop-over when chosen). graphty-element, additively, if the app should know when to suggest it:
  `ReadableValue.valueCount` is given today only for categories and yes-or-no values; give it for
  numbers with few distinct values too.

## Severity 2

### 2. Eight properties that can vary by a value offer no way to

43 of the 51 properties that take a binding offer it (every color, enum and text property, and 16
of 20 number properties). Not offered:

| Property                                                                 | Why it matters                                                                      | Evidence                                                                                |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Node opacity, edge opacity, arrowhead opacity, arrow tail opacity        | fade what scores low ("dim weak ties") is a common use; the percent box has no vary | `cover-Les-02-rest-top.png`, `cover-e-Les-06-set-Edge_ends_settings.png`                |
| Node wireframe, node show, edge curved, edge show (yes-or-no properties) | see finding 11: a rule and a fixed value already do this                            | `cover-Les-04-set-Node_shape_settings.png`, `cover-e-Les-05-set-Edge_line_settings.png` |

Opacity is the one that costs a reader something: graphty-element binds `node.opacity` and
`edge.opacity` like any number, and the opacity sits inside the color row (Figma's paint row), so
it has no field end for the vary glyph. Owner: graphty app (a vary entry for the percent box, for
example "Opacity by attribute" in the color row's settings, or the glyph on the percent box).

### 3. Clear says "back to mixed" when one value comes back

On a layer whose rule picks elements that all share one value beneath it, Clear and the gray
placeholder say the opposite. "Louvain Group 3" (made with "New layer for Group 3") paints 11 nodes
that Communities paints green; its Color's Clear reads "back to mixed, from Communities"
(`split-Les-02-new-layer.png`). A second "name contains Mme" layer over the first (all six at size 3) reads "back to mixed, from Node defaults and Nodes where name contains Mme", and its draft showed
Size "Mixed" (`pick-Les-08-cond-word-sized.png`, `pick-College-07-cond-word.png`). This is the
owner's first question (how does a reader unset a field and know what comes back), and the case
that misleads is the common one: a narrow layer over a varied one.

- Cause: `beneathOf` and `sharesBeneath` in `graphty/src/workspace/style/row.ts` read
  `styles.agreement("graph", ...)` over the whole graph, with a `ponytail:` note that the element
  has no scope for "what a layer matches".
- Owner: graphty-element, additively: an agreement scoped to the elements a row matches (the same
  set "Select what it paints" already selects). Then graphty: both readers use it.

### 4. The draft holds its rule but says nothing about what it picks

A draft now chooses its elements first (iteration 1's finding 3 is fixed): the rule is kept and
nothing paints until a value is written. But after picking "Nodes where label contains State" the
draft shows only "Nothing is added until a property is set": no sentence, no "24 of 115 nodes", no
mark on the canvas (`pick-College-03-find-picked-draft.png`; conditions,
`pick-College-07-cond-word.png`). The count appears only once a value lands. A reader typing a rule
cannot tell "matches nothing" from "matches the 24 I meant" until they paint. Owner: graphty app
(the written layer already shows the element's count; the draft can ask the same question of its
held rule).

### 5. Find cannot read a run's values; the rule editor can

After Degree and Louvain ran, the rule editor's Attribute list offers Connections, Rank, Percentile,
Community and Community size (`pick-College-12-attr-after-runs.png`), and Top N by offers them too
(`pick-College-13-topn-by.png`). Find does not: "degree" finds nothing, and on College football "10"
offers "node id contains 10" and "value is 10" but not "Connections is 10 or more", though degree
runs from 7 to 12 (`pick-College-14-find-degree.png`, `pick-College-15-find-10.png`). On Les
Miserables "10" offers nothing. This is iteration 1's "two lists of what can be read" in a new
place: the rule and the binding now share `readableValues`, find does not. Owner: graphty-element
(find over every readable value, run results included, with its existing "is N or more" rows).

### 6. An edge-only layer has nothing to read on data without edge columns

On College football (no edge columns) an Edges layer's Attribute list is an empty select with no
words, and find on edges answers "No element matches State" with no pointer to Both
(`edges-College-01-edge-attr.png`, `edges-College-02-edge-find.png`). The same holds for vary: Width,
Head and Pattern by attribute open on "No results" with no reason (`vary-College-04-picker-Edge_width.png`).
"Edges touching teams named State" does work, through Both and "touching them" (229 of 613 edges;
Les Miserables 26 of 254) with the node properties left unset (`edges-College-04-both-written.png`,
`edges-Les-04-both-written.png`), so the gap is the Edges kind, not the model. But an edge's own
ends (its source and target, and their values) are not readable values at all, so "edges whose
source is Bob", "edges inside one conference" or "width by the source's degree" cannot be said
anywhere. Owner: graphty-element, additively: readable values for an edge's source and target (id
and their columns and results). graphty app: an empty list says why and names Both.

### 7. One run's values have two sets of names and two groupings

The rule editor lists run values flat under "Nodes" by the element's plain names: Connections,
Rank, Percentile, Community, Community size. The vary picker groups them under "Degree" and
"Louvain" and names them Degree, Degree rank, Degree percentile, Louvain, Louvain group size
(`pick-College-12-attr-after-runs.png`, `vary-College-01-picker-Node_shape.png`). "Rank" and
"Percentile" in the rule list do not say of what, and typing "Community" in the vary picker finds
nothing (the shape-by-Community step failed on it). Both pickers read the same `readableValues`;
`ValuePicker.tsx` names an entry from the run's label and the field, `whichRule.ts` uses
`plainName`. Owner: graphty app (one naming function and one grouping, by run, for both lists).
The Figma walkthrough of this build reports the same names in the tree and the key.

### 8. Data that holds colors cannot be painted with them

The category pop-over for a text column offers a palette, per-value colors and an overflow choice,
but no scale (`cat-Les-01-cat-popover.png`), so graphty-element's `passthrough` scale ("use the value
as it is", catalog 9.1), which paints a column of color names or hex codes as themselves, is not
reachable. A dataset that carries its own colors is common (exports from Gephi and Cytoscape do).
Owner: graphty app (offer it when the element says a column's values read as colors); graphty-element,
additively, if no such fact exists yet.

## Severity 1

9. **An effect draft has no vary glyph until a color is typed.** Adding Outline, Glow, Halo, Band or
   Motion draws a focused field with no vary glyph; it appears once a value is written
   (`dsl-e3-03-outline-added.png`, `dsl-e6-02-motion.png`). To vary a glow, a reader first types a
   color they do not want. Owner: graphty app.
10. **Caption vary buttons use another name than the entry.** In "Caption at the target end"
    settings the vary buttons are named "Edge head text color by attribute" and "Edge head text
    background by attribute" (`tmp/ia-i2/cover-e-Les.log`); a screen reader user searching for
    "caption" does not find them. Owner: graphty app.
11. **Yes-or-no properties need no vary, but the coverage map should say so.** Wireframe, show and
    curved by a value are the same as a rule picking where the value is true plus a fixed value;
    adding a vary button would be a second door to one job. Recommend keeping them without vary and
    recording that in `coverage.ts`, so the coverage test reads it as a decision, not an omission.
    Owner: graphty app.
12. **Two layers whose rules differ only in case look the same in the tree.** "Nodes where name
    contains Mme" and "... mme" both cut to "Nodes where name cont..." (`pick-Les-08-cond-word-sized.png`).
    The rule matches either case, so the second name adds nothing. Owner: graphty app.
13. **Find still offers the same set twice on Les Miserables.** "node id contains Mme" and "name
    contains Mme" both pick the same six characters (`pick-Les-02-find-Mme.png`). Owner:
    graphty-element (whether two rules with one result are both offered is find's).
14. **Styles no channel reaches.** Eight label style fields (text path, position, attach position,
    auto size, resolution, billboard mode, borders, outline join) and a node's gradient color have
    no channel in graphty-element (catalog sections 12 and 5.3), so no panel can set them. Owner:
    graphty-element, only if a use appears.

## Severity 0

15. `node.flat` (nothing draws it; Lighting "flat" gives the look) and `node.marker` (refused by the
    element) are not offered, with reasons in `coverage.ts`. Correct.
16. The scene light, automatic framing and a screenshot's transparent background are not styles and
    are not in the panel. Correct: Lighting, view and background are, in Graph settings
    (`graph-College-01-graph-settings.png`).
17. Odd ids on data whose ids are names: "Node id matches pattern [13579]$" finds 2 of 77 on Les
    Miserables (`pick-Les-11-cond-odd-red.png`), the two ids ending in a digit. Right, as in
    iteration 1.

## What works

- **Every channel has a control.** Reached and checked in this pass: shape, size, color with
  opacity, wireframe, show and combine on nodes; label and tooltip with source (a value or Fixed
  text), look, size, position and every settings group (type, box with gradient stops, letters,
  placement, motion and distance, badge with icon and suffix), label and tooltip text and background
  colors that vary; outline, glow with strength, halo with size and opacity; edge color with
  opacity, width, pattern and count, curved, show, combine; head and tail kind, size, color and
  opacity; edge label and both end captions with the same look and settings; band with width and
  opacity; motion with speed; and in Graph settings the background color and image, 3D or 2D,
  lighting, same size at any depth, highlight color and the two label layout switches. Logs:
  `tmp/ia-i2/cover-Les.log`, `tmp/ia-i2/cover-e-Les.log`; screenshots `cover-Les-*`, `cover-e-Les-*`.
- **Vary at rest on every field that has it**, with "In use", Data and one group per run, a fact per
  row (range or value count) and a folded "Does not fit" row with its reason
  (`vary-College-01-picker-Node_shape.png`). Combine offers Replace, Multiply and Add on a set number
  (`graph-College-07-combine.png`).
- **Name contains, both datasets, both paths, from the draft.** College football: "label contains
  State" gives 24 of 115 by find and by conditions; Les Miserables: "name contains Mme" gives 6 of 77;
  lower-case words give the same sets. "Bob" answers "No element matches Bob". Layers are named by
  their rule. Evidence: `pick-College-02-find-State.png`, `pick-College-04-find-sized.png`,
  `pick-Les-02-find-Mme.png`, `pick-Les-04-find-sized.png`.
- **Odd ids.** "Node id matches pattern [13579]$" gives 57 of 115 on College football
  (`pick-College-11-cond-odd-red.png`); the Attribute list now names the element's id "Node id" and
  the data's column "id".
- **No favored algorithm.** Rule kinds are Every one, Where a value, Top N by, Named, Members of a set,
  Selected, Hovered and Expression on both datasets, before and after runs; run values enter the same
  Attribute and Top N lists as data columns.
- **"New layer for a value" round-trips.** From Louvain's category pop-over, "New layer for Group 3"
  makes a layer whose rule opens as Community / is one of / 3, every field editable, 11 of 77 nodes
  (`split-Les-03-rule-editor.png`), and the kind choice stays enabled on a written layer.

## Iteration 1's findings

| Iteration 1 finding                                 | Now                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1. Vary on 11 properties                            | Partly fixed: 43 of 51 (finding 2)                                                                     |
| 2. Which elements cannot read a run's values        | Fixed for the rule editor and "New layer for"; find still cannot (finding 5); names differ (7)         |
| 3. A new layer cannot get its rule before it paints | Fixed; the draft shows no count yet (finding 4)                                                        |
| 4. About 20 styles have no control                  | Fixed                                                                                                  |
| 5. "Id" and "id" in one list                        | Fixed ("Node id" and "id")                                                                             |
| 6. Find silent on no match                          | Fixed                                                                                                  |
| 7. Find cuts counts, repeats, hides which node      | Fixed for counts and names; one repeat left (finding 13)                                               |
| 8. Every layer named "New layer"                    | Fixed                                                                                                  |
| 9. Vary glyph hidden until hover                    | Fixed (drawn at rest)                                                                                  |
| 10. Vary picker lacks "In use" and "Facts"          | Partly fixed: "In use" and a fact per row; no "Facts" group, which the Selected and Hovered rows cover |
| 11. A layer's kind is fixed once it paints          | Fixed                                                                                                  |
| 12. One run, three names                            | Unchanged (finding 7 and the Figma walkthrough)                                                        |
| 13. Odd ids on data whose ids are names             | Unchanged, correct (finding 17)                                                                        |
