# Repolish round 1: correctness review of the rebuilt selection editor

Build 7acb6c4c075c (graphty@0.8.92), a frozen copy of `graphty/dist` built after that commit, driven
with `real.mjs`. Sessions (main checkout, git-ignored) under
`tmp/design-studio/tier5/repolish-1/correctness/`: `v1` (volunteers.graphml, 24 nodes, 63 undirected
edges: style layers, So far, groups, save and reopen), `f1` (volunteers.graphml with a filter card,
then the Campus contacts sample), `n1` (neighbors.csv, 16 nodes, 30 directed edges: saved projects
from before the rebuild). Independent numbers come from networkx 2.8.8 (`.../correctness/py/*.py`).
Screenshot paths below are relative to that folder.

The old projects in `old/` were written from a project this build saved (`n1/downloads/`), with
`visibility.conditions` replaced by the forms the earlier builds saved: flat rules with effect
`keep`, `exclude` or `select` (tier 4), and a selection rule with effect `exclude` (the earlier tier 5
builds). `py/mk.py` and `py/mk2.py` write them.

## What held up

Every count below agreed with networkx in the outline, the step pane, the preview key, the table's
Group column and the canvas:

- A = Keep Degree min 6, Keep trained yes (7); B = Add role staff (5, draws 2); total 9; canvas 7
  green and 2 orange (`v1/13.png`).
- So far, added before any bound: the pane shows its own values, 0 to 8 (networkx: v02 and v05 8.0 on
  the 7 nodes), not an empty card; min 1 gives A = 4, total 6 (`v1/19.png`, `v1/20.png`). Round 3's
  blocker is fixed.
- Moving the So far step above trained (Mod+]): domain 0 to 12, step count 6, A = 5, total 7
  (`v1/21.png`). Undo gives 6, redo 7 (`v1/22.png`, `v1/23.png`). The red fill paints exactly 7 and
  the legend reads 7 of 24 (`v1/25.png`). The table lists A = v02, v05, v09, v21, v23 and B = v17,
  v24 (`v1/33.png`).
- Duplicating A (Mod+D) makes C, purple, after A, with no letter changing; C's first step set to
  Degree 3 to 5 gives C = 4 (v10, v11, v18, v20), total 11, and A's So far step still reads its own
  values, 1 to 12 (`v1/37.png`, `v1/38.png`). Round 3's shared-values finding is fixed.
- Edge layer, Keep role staff: Both ends 3, Either end 26, the row tagged "Either end" (`v1/42.png`,
  `v1/43.png`).
- Filter card All nodes / Except role volunteer: 8 of 24 nodes, 9 of 63 edges, filtered degree 1 to
  4; its Table button lists the 8 with Shown | All disabled (`f1/04.png`, `f1/07.png`). A style layer
  under it, Keep Degree min 3: 2 of 8, domain to 4 (`f1/05.png`). Save and reopen keep 8 of 24
  (`f1/11.png`).
- Within 1 hop of Selected (1) in a filter: 5 of 16 (Nils and his four neighbors), frozen to the
  token "Nils" (`n1/29.png`).
- Old flat cards open drawing what they drew before: Filter to kind family 12 of 16 nodes and 8 of 30
  edges (`n1/03.png`); Filter out kind neighbors plus Filter out degree min 5, 15 of 16 and 12 of 30,
  with the cards reading what stays, 14 of 30 and 15 of 16 (`n1/12.png`); the Filter out edit
  (tick and untick family) keeps 15 and 12 (`n1/14.png`); Select plus a Filter out of an `all`, 5 of
  16 and 2 of 30 (`n1/17.png`). Undo of a first edit restores the old card (`n1/11.png`).

## Findings, most severe first

### 1. Blocker: the first edit of a saved "Filter to" card on an edge value shows nodes it hid

Open `old/nb-to-edge.graphty.json` (one tier 4 card: keep, `kind` is family): 12 of 16 nodes, 8 of
30 edges, as before (`n1/03.png`). Open the card, tick coworkers, untick it: the card is back to
"kind 8 of 30", but the graph now draws 16 of 16 nodes. Desmond, Felix, Gwen and Kurt, who have no
family edge, come back as isolated nodes (`n1/10.png`). Nothing on the card shows the change, and
any edit of the card, even a no-op one, causes it.

Cause: a keep condition on an edge value with no `nodes` reading also keeps only the nodes at the
ends of the matching edges (`effectiveRule`, `graphty-element/src/session/visibility/conditions.ts:159`).
The editor shows the card as an edge-side selection (`filterSelection`,
`graphty/src/workspace/selection/values.ts:488`), and its first edit writes that selection as the
rule (`keepChange`, `graphty/src/workspace/data-place/filterCards.ts:290`). An edge-side selection
says nothing about nodes (`compileOne`'s `union` case, `graphty-element/src/session/visibility/filter.ts:1869`:
`{ node: null, edge: test }`), so every node stays.

Fix (graphty-element): spec 3.3 says graphty-element converts saved forms, so convert them in one
place, as the project is read (`readSavedConditions`), keeping the meaning. Two ways to do that:

- read an edge-side selection in a keep condition the way a flat keep leaf is read, keeping the
  nodes at the ends of what it keeps; or
- refuse to convert a legacy edge-value keep leaf (`asUnion` returns null), so the card stays
  read-only in its own words.

Element test: the flat keep card on neighbors.csv, converted and written back, keeps 12 of 16
nodes and 8 of 30 edges.

### 2. Major: a saved Select card shows as off but still selects nodes

Open `old/nb-select.graphty.json` (a tier 4 Select degree min 4, on, and a Filter out). The first
card's box is unticked and reads 12 of 16 (`n1/17.png`). The Graph place shows Selected 0 (`n1/18.png`).
Untick the other card: 12 nodes are selected at once, every node of degree 4 or more, by the card
whose box says it is off (`n1/19.png`). The element still holds that card as an on select condition,
and it reselects whenever a keep or exclude card changes (`FilterCondition.within`,
`graphty-element/src/catalog/types.ts`). The editor only draws it as off
(`graphty/src/workspace/data-place/Filters.tsx:387`) and writes the conversion when that card
itself is first edited.

Fix: the same conversion at load as finding 1. graphty-element writes a saved select condition as
keep, turned off, when it reads the project, so the box and the element agree and nothing reselects.
App test (real input): open the project, untick the other card, then Selected reads 0.

### 3. Major: a removing card saved as a selection opens read-only and counts what it removes

The earlier tier 5 builds saved a Filter out card as a selection rule with effect `exclude`.
`old/nb-union-out.graphty.json` holds one such card, removing Joy (degree 5). It draws 15 of 16
nodes, but the card reads "Rule" and "1 of 16", with no steps, only Delete (`n1/23.png`, `n1/24.png`).
A card's count now means what stays, so "1 of 16" says one node stays where 15 do.

Cause: `leftBy` (`graphty-element/src/session/scope/steps.ts`, the `union` case) returns null, so
`filterSelection` gives the editor nothing, and the read-only card shows the element's match count.

Fix (graphty-element): read the complement of a selection as a selection. One way is one group of
All with a single Except step whose rule is the saved selection (`compileOne` already compiles a
`union` leaf). The card then reads All nodes / Except ..., 15 of 16. Until then, a read-only removing
card must show what stays (total minus matched), never the match count. Element test: the saved
card converts and counts 15 of 16.

### 4. Major (carried, still open): after reopening, the layer's row counts 5 while 7 are painted

Saved with A (Degree, Betweenness on So far, trained) and B (staff), then reopened: the Layer 1 row
reads 5 while the canvas paints 7 and the legend reads 7 of 24. It still reads 5 eleven seconds
later (`v1/28.png`, `v1/29.png`). Selecting the layer brings the row to 7 (`v1/30.png`). The legend
half of round 3's finding is fixed. The row reads `styles.counts(id).matched`
(`graphty/src/workspace/style/WhichPicker.tsx:319`), and that count is still taken while the So far
step's own computation has not landed, and is not taken again when it does. This is the carried
"restore step-owned computations with the project" item in `decided.md`. It is listed again because
it is a confident wrong number at rest.

### 5. Minor: a long value pushes the row's tag and state word out of the outline

"Keep Betweenness: Bridging" with "No test", and later with the "So far" tag, is wider than the
outline. The panel gains a horizontal scrollbar, and the row ends in "No tes" and "So fa"
(`v1/17.png`, `v1/19.png`, `v1/20.png`). The state word is the only sign that the step changes
nothing yet. Spec 3.1 truncates only the test and never the tags or the state word. Fix: let the
value cell shrink with an ellipsis (`min-width: 0`) before the tags and state, and put the full
words in the row's tooltip as already done.

### 6. Minor: converted tier 4 cards on a structure rule are all called "Rule"

Both cards of `old/nb-select.graphty.json` read "Rule" (`n1/17.png`), and the on box of the second
is named "Apply a rule and not: a rule". So is the degree card of `old/nb-out.graphty.json`
(`n1/12.png`). The reader cannot tell the two cards apart or which one to switch. Fix: name a
converted card from its first step's value, as a new card is named ("Degree"), with
`conditionWords` giving the step's words in the box's name.
