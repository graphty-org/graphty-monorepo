# Iteration 1: coverage and generality of the style panel

A check of the first build of the unified style panel from the information architecture side, on
three questions: can every style graphty-element has be reached from the panel; does every property
that can vary by a value offer it; and can a reader pick elements generically ("odd-numbered node
ids", "name contains Bob") on two different datasets without any algorithm getting a special door.
Severity runs from 0 (not a problem) to 4 (blocks the work). Each finding names its screenshot and
the package that owns the fix.

## What was walked

- The build served at https://dev.ato.ms:9373 on 2026-10-12 (branch `design/studio-tier3`, head
  `68a2140049`), driven with Playwright in its own browser context through the studio's browser
  gate, at 1440 x 900.
- Two datasets opened from the start screen's samples, with nothing added through the session:
  College football (115 nodes, numeric ids 0 to 114, a `label` column with each team's name) and
  Les Miserables (77 nodes, ids that are names, a `name` column). Neither has a "Bob", so "name
  contains Bob" was run literally and then with a word each dataset does hold: "State" (24 teams)
  and "Mme" (6 characters).
- Every layer was made by clicks and keys: Add layer, a kind, a value, then Which elements. Runs
  (Degree, Louvain) were started through the session only to check whether their values reach the
  pickers. The style catalog (`tier3/style-catalog.md`) was checked against every control, settings
  popover and "+" menu of a node layer, an edge layer, Graph settings and the Selected row.
- Screenshots (local, not committed) are in `design/ui/studio/tier3/build/ia-i1/`; names below are
  relative to it. The driving scripts are in `tmp/ia-i1/`.

## Summary

13 findings: 4 at severity 3, 7 at severity 2, 2 at severity 1 or 0. Generic picking works: both
worked examples reach the right elements on both datasets, by find and by conditions, with counts
that match the data, and no algorithm has its own entry. Coverage and generality break in three
places. Only 11 properties offer "vary by"; 21 more that graphty-element can drive from a value do not,
node shape (named by the owner) among them. The rule editor cannot read a run's values, so "Top N by degree" is
impossible and "New layer for 3" makes a rule the editor shows blank. A new layer cannot get its
rule until a value is written, so the first value always paints every node. About 20 styles have no
control at all: the captions at an edge's ends, a tooltip's look, a label's color varying by a value,
fixed label words, and, in the app a reader opens, the selection's look.

## Severity 3

### 1. "Vary by" is offered on 11 properties; 21 more that can vary have no button

The panel offers the vary button on 11 properties: node color, node size, label words and label
size (on nodes and on edges), tooltip words, edge color, edge width, and an arrowhead's and arrow
tail's color. graphty-element can also drive these 21 from a value, and the panel offers no way to:
node shape, node opacity, the outline, glow and halo colors, glow strength, halo size and opacity,
edge opacity, line pattern and its count, head and tail kind, size and opacity, motion speed, and the
band's color, width and opacity. (Label colors and edge-end captions have no control at all; see
finding 4.) In every one of those number fields, "=" types an equals sign instead of opening the
value picker. Design decision 1.12 promises the vary button on every field whose channel takes a
binding, and the owner's question 12 named shape and labels.

- Evidence: `vary-Les-02-hover-shape.png` (no button on Shape when hovered),
  `vary-Les-03-hover-outline.png` (none on an effect's color), `cover2-Les-08-edge-Edge-line-settings.png`,
  `cover2-Les-04-node-Glow-settings.png`; the "=" test is in `tmp/ia-i1/vary-Les.log`.
- Cause: `bindsAtRest` in `graphty/src/workspace/style/words.ts` admits only colors, `node.size`,
  `edge.width` and `node.tooltip`, and the effect rows (`Effects.tsx`) draw no vary button even for
  their colors.
- Owner: graphty app. graphty-element already says which channels take a binding and how.

### 2. Which elements cannot read a run's values

After Degree and Louvain ran, the vary picker lists them (`extra-College-05-vary-color-picker.png`),
but the rule editor does not: its Attribute list is "Id, id, label, value" on College football and
"Id, id, name" on Les Miserables, and "Top N by" offers "id, value" on one and nothing at all on the
other (`extra-College-04-attributes-after-runs.png`, `extra-Les-03-top-n-by.png`). So a reader cannot
write "nodes with degree at least 10" or "top 10 by betweenness", which is the generic path design
1.11 gives instead of special entries for runs.

The same gap breaks the mechanism that replaced the split parent. "New layer for 3" on Louvain's
color binding makes a layer that paints the right 11 nodes, but its sentence reads "Nodes where a
value is one of 3", and opening it shows a condition row whose attribute and comparison selects are
blank (`split-Les-03-new-layer-for-editor.png`). The reader cannot see what the rule reads or change
it.

- Cause: `WhichElements.tsx` builds its choices from `session.data.attributes()` only, while
  `ValuePicker.tsx` assembles its own list from `session.runs.list()` and `session.results.path()`.
  Two pickers composing two lists of "what can be read" is the app deciding something the element
  knows.
- Owner: graphty-element, additively: one list of every value a rule or a binding can read for a
  kind (data columns and each run's results, with the plain name, value type and the path a rule
  uses), so both pickers and the rule sentence read the same facts. Then graphty: both pickers and
  `conditionOf` use it.

### 3. A new layer cannot get its rule before it paints

The draft layer shows only Nodes | Edges | Both and "Nothing is added until a property is set"
(`draft-College-01-draft-nodes.png`). Find and the condition rows appear only after a value is
written, and a written value lands on every element: setting Size 3 to start the "name contains"
example grew all 115 teams (`pick-College-01-real-all-nodes.png`) before the rule narrowed them to 24. Design section 3.2 has the reader type "bob" in the draft before any property. Picking which
elements first is the order the model states ("which elements x property"), and the only order that
does not repaint the whole graph by surprise.

- Owner: graphty app. The draft already holds a kind without writing anything; it can hold a rule
  the same way.

### 4. About 20 styles have no control

Checked against every control, settings popover and "+" menu (`tmp/ia-i1/cover-Les.log`,
`cover2-Les.log`). Reachable: everything else in the catalog, listed under "What works". Not
reachable:

| Style                                                                                                                    | What the reader cannot do                                                                                                                     | Evidence                                                        |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Captions at an edge's ends (`edge.arrowHeadText`, `arrowTailText` and their style, size, color, background: 10 channels) | put text at either end of an edge, such as a role or a weight                                                                                 | `cover-Les-21-edge-text-menu.png` (Text "+" offers only Label)  |
| A tooltip's look (`node.tooltipStyle`, size, color, background: 4)                                                       | change how a tooltip looks                                                                                                                    | `cover-Les-12-tooltip.png`                                      |
| Label color and background as values (`node.labelColor`, `labelBackground`, and the edges': 4)                           | color a label by a value; Label settings takes one fixed color                                                                                | `cover2-Les-10-edge-Label-settings.png`                         |
| Fixed label words (`node.label` and `edge.label` as typed text), and the six formatting tags inside them                 | label a group "Hub" or "Team"; typing in the source picker says "No results", while the tooltip's picker offers "Fixed text"                  | `extra-Les-02-label-typed.png`                                  |
| Label fields `gradientColors`, `icon`, `overflowSuffix`                                                                  | set a label's gradient colors, a badge's icon, the text after a shortened number                                                              | `cover-Les-11-label-settings.png`                               |
| The selection's look (`selection.*`: halo and band color, size, opacity)                                                 | change how selected elements look, in the app a reader opens: it lives only on the Selected row, and the app never turns the starting rows on | `cover2-Les-13-selected.png` needed the session to turn them on |

The coverage test passes because `graphty/src/workspace/style/coverage.ts` marks the first five rows
"not offered" with a reason, which is honest. But the design's coverage table (section 6) placed
captions, tooltip looks, label colors and typed label words in the panel, so the test and the design
now disagree about what was promised. The selection's look is mapped to a row the reader's app
does not have, which the test cannot see.

- Owner: graphty app for every row (each channel exists in graphty-element). Captions and the
  selection's look matter most: one is a whole feature, the other is a default look nobody can
  change.

## Severity 2

### 5. "Id" and "id" are both in the Attribute list, and only one finds odd ids

On both datasets the list reads "Nodes: Id, id, ..." (`cond-College-03-odd-attr-list.png`).
"Id" is the element's id and offers "matches pattern"; "id" is the data's column, which on College
football holds numbers and so offers only number comparisons. The odd-ids example works only if the
reader happens to choose the capitalized one. Cause: `WhichElements.tsx` adds "Id" unless an
attribute's path is `id`, but the column's path is `data.id`. Owner: graphty app; one entry, with the
comparisons of both.

### 6. Find says nothing when nothing matches

Typing "Bob" in Find elements on either dataset shows no row and no words, and the count under the
editor still reads "115 of 115 nodes" (`pick-College-04-find-bob.png`, `pick-Les-04-find-bob.png`).
A reader cannot tell "no match" from "still looking". Owner: graphty app; find already answers with
an empty result.

### 7. Find's offers cut their counts, repeat themselves and do not say which node

"Nodes where label contains St..." hides "24 nodes", the count that tells the reader what the offer
picks; "This node" appears three times without saying which team; and on Les Miserables "Mme" is
offered twice for the same six characters, "id contains Mme" first and "name contains Mme" second
(`pick-College-05-find-text.png`, `pick-Les-05-find-text.png`). Owner: graphty app (words and
layout); whether two rules that pick the same set are offered twice is the element's find.

### 8. Every hand-made layer is named "New layer"

A layer keeps "New layer" after its rule is set, so two layers made for the two worked examples are
two identical rows in the tree, and the key lists "New layer" six times
(`cond-College-06-odd-real.png`, `cover2-Les-13-selected.png`). The studio decided in tier 2 that a
layer made by a rule is named by the rule, and "New layer for 3" already names its layer "Louvain
3". Owner: graphty app.

### 9. The vary button is hidden until the field is hovered or focused

At rest, Color and Size show no vary button (`vary-Les-01-node-rest.png`); hovering Color shows it
(`vary-Les-04-hover-color.png`). The function that decides it is named for showing the button "at
rest". In tier 1 the vary button was the one door to "color by" and "size by", and a door hidden
behind "+" was found only by guessing (18 of 18). Owner: graphty app.

### 10. The vary picker lacks its "In use" and "Facts" groups

With Communities reading Louvain and Connections reading Degree, the picker shows Data, Degree and
Louvain only: no "In use" group, no "Facts" (is selected, is hovered), and the run rows carry no fact
such as a range (`extra-College-05-vary-color-picker.png`). Design 1.5 relies on these to answer
"which degree?" and to keep a 200-column dataset searchable. Owner: graphty app; graphty-element
already describes every value.

### 11. A layer's kind is fixed once it paints

On a layer that exists, Edges and Both are disabled in Which elements
(`pick-College-06-offer-picked.png`); the kind can be chosen only in the draft. A reader who made
"teams whose name contains State" and then wants the games between them must start a new layer and
redo the rule. The code says why: "changing it waits on graphty-element". Owner: graphty-element,
additively: changing a layer row's kind (node, edge, both) in place, with its rule.

## Severity 1 and 0

### 12. One run, three names

The run's layer is "Communities" in the tree, the key titles it "Color: Louvain", and "New layer for
3" names its child "Louvain 3" (`split-Les-03-new-layer-for-editor.png`). Severity 1. Owner: graphty
app.

### 13. Odd ids on data whose ids are names

On Les Miserables "id matches pattern [13579]$" finds 2 of 77 nodes, which is right: the ids are
names, and only two end in a digit. Severity 0; the worked example's note in design section 3.3
already says the pattern works for whole-number ids.

## What works

- **Name contains, by find and by conditions.** College football: "label contains State" gives 24 of
  115 by either path, the same count, and the rule sentence reads it back ("Nodes where label
  contains State"). Les Miserables: "name contains Mme" gives 6 of 77. Lower-case "state" and "mme"
  give the same sets (`extra-College-01-find-lower.png`). Evidence: `cond-College-04-contains.png`,
  `cond-Les-04-contains.png`, `pick-College-07-text-layer-real.png`.
- **Odd ids.** "Id matches pattern [13579]$" gives 57 of 115 on College football, exactly the nodes
  whose id ends in an odd digit (`cond-College-06-odd-real.png`); an Expression rule
  ("id > `100`") gives 14.
- **No favored algorithm.** The rule kinds are Every one, Where a value, Top N by, Named, Members of
  a set, Selected, Hovered and Expression; no run has an entry of its own.
- **Reachable styles.** Node shape (25 glyphs), size, color, opacity, wireframe, show; outline, glow
  and its strength, halo and its size and opacity; label words from a value, look, size, position
  and every Label settings group (type, box, letters, placement, motion and distance, badge); tooltip
  words; edge color, width, opacity, pattern and count, curve, show; head and tail kind, size, color
  and opacity; band and its width and opacity; motion; and in Graph settings the background color
  and image, 3D or 2D, lighting, same size at any depth, highlight color, and the two label layout
  switches.
- **Unset.** Every set field carries its minus, and its name says what comes back ("Clear: back to
  1, from Node defaults").

## Against the owner's three questions on the design

- **Unsetting a field** works as designed where a field is drawn: the minus, its tooltip naming
  what comes back, and the field's accessible name ("Node size, not set, Node defaults gives 1").
- **Split parent replaced by ordinary layers.** The replacement's promise was that "New layer for a
  value" is one generic mechanism. Today it makes a rule the reader cannot read or edit (finding 2);
  until the rule editor reads run values, the mechanism is reusable in the element and not yet in
  the panel.
- **Figma.** Not repeated here; see the Figma walkthrough of this build (`figma.md` in this folder).
