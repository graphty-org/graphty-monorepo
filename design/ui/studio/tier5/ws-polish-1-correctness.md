# Workspace polish round 1: correctness review of the selection workspace

Build 6a37a22344 (graphty@0.8.92). A frozen copy of `graphty/dist`, built at that commit, was driven
with `real.mjs`. The sessions are in the main checkout (git-ignored), under
`tmp/design-studio/tier5/ws-polish-1/correctness/`:

- `lm`: Les Miserables (77 nodes, 254 edges, edge weight `shared_chapters`). Core number and
  Degree with Links where, Cancel, undo and redo, save and reopen in browser storage.
- `v`: volunteers.graphml (24 nodes, 63 edges). A two-group style layer, a Louvain step, a filter
  card, Cancel of a filter card, Clear, deleting a group, saving to a file and opening it again.
- `old`: the four tier 4 project files of repolish round 2 (`repolish-2/correctness/old/`).
- `m`: `mid-4k.graphml` (4,000 nodes, 7,996 edges). A Girvan-Newman step that waits for Run.

The independent numbers come from networkx 2.8.8 (`py/lm.py`, `py/vf.py`, and repolish 2's
`py/v2.py` and `py/nb.py`). Screenshot paths below are relative to the session folder.

## What held up

Each of these agreed with networkx in the workspace header, the outline, the preview key, the
matches strip, the sidebar layer row and the canvas.

- **Edge-scoped steps (Links where).**
    - Core number min 3 on all links keeps 48 nodes (`lm/10.png`).
    - With Links where shared_chapters min 2 it keeps 42 nodes, the spec's task 4 figure. The
      member list matches networkx exactly, and the max box reads 7, the scoped maximum
      (`lm/14.png`).
    - Min 4 with the same links keeps 31 (`lm/21.png`).
    - Adding Keep Degree min 8 keeps 26 on all links and 12 with Links where shared_chapters min 2. Both match networkx, and the degree histogram rescales to the scoped 0 to 22 (`lm/33.png`,
      `lm/34.png`).
    - An untouched link range changes no count (`lm/13.png`, `lm/33.png`).
- **Groups and their colors.**
    - A = Degree top 5 keeps 6 (v02, v05, v06, v09, v13, v21, ties kept together).
    - B = Add role staff has 5 members and draws 2. The total is 8, and the key reads A 6, B 2, No
      match 16, which adds up to 24 (`v/05.png`, `v/07.png`).
    - Adding Keep Louvain Group 1 to A keeps 3 (v02, v05, v06). The total is 7 and B draws 4
      (`v/09.png`).
    - The Louvain checklist now counts the step's input (3, 2, 1), so round 2's finding 7 is fixed
      (`v/08.png`).
- **Filter card.**
    - All / Except role volunteer leaves 8 of 24 nodes and 9 of 63 edges. The card is named "Except
      role volunteer", so round 2's finding 2 is fixed (`v/13.png`).
    - The layer on the filtered graph reads 5 of 8: A = v02, and B = 5 drawing 4. The strip lists
      exactly those (`v/15.png`).
- **Cancel.**
    - Three edits to a style layer (min 3 to 4, a group B, Degree min 15) and then Cancel restore
      42 of 77 and the one-group outline (`lm/23.png`).
    - Mod+Z brings all three edits back in one step (31 of 77, A and B), and redo returns to 42
      (`lm/24.png`, `lm/25.png`).
    - Two filter card edits and then Cancel restore 8 of 24 and 9 of 63, and the layer reads 5
      (`v/29.png`, `v/30.png`).
    - Undo after that Cancel brings back 2 of 24 (`v/31.png`).
- **Clear** empties the selection (0 of 8). Mod+Z restores A and B exactly, with their steps,
  colors and counts (`v/37.png`, `v/38.png`).
- **Save and reopen.**
    - The Les Miserables project saved to browser storage reopens at 42, with the link-scoped step
      kept (`lm/29.png`).
    - The volunteers project saved to a file and opened in a fresh tab reads 8 of 24 nodes, 9 of 63
      edges and a layer of 5 (`v/22.png`).
- **Old projects keep their counts.**

    | Project      | Nodes    | Edges    | Notes                           |
    | ------------ | -------- | -------- | ------------------------------- |
    | nb-select    | 5 of 16  | 2 of 30  | the Select card counts 16 of 16 |
    | nb-out       | 15 of 16 | 12 of 30 |                                 |
    | nb-union-out | 15 of 16 | 25 of 30 |                                 |
    | nb-to-edge   | 12 of 16 | 8 of 30  |                                 |

    All of these match networkx (`old/02.png`, `old/04.png` to `old/06.png`).

- **Pending steps.**
    - Round 2's blocker is fixed. On 4,000 nodes, Girvan-Newman asks "Run (about 15 minutes)"
      instead of "about 6 seconds" (`m/03.png`).
    - Run shows "Computing" with a Cancel button, and the page stays responsive (`m/05.png`).
    - Cancel returns the step to waiting for Run and leaves every count unchanged (`m/06.png`).
    - The 15-minute figure itself was not timed.

## Findings, most severe first

### 1. Major: after Undo or Redo of a filter edit, the layer row keeps the previous count

These steps start in `v`, after the filter card edits were cancelled.

- Redo brings back the card that leaves 2 of 24 nodes. Undo returns to 8 of 24. Even 3 seconds
  later, the Layer 1 row in the sidebar still reads 1, the count it had on the 2-node graph. The
  layer actually holds 5 (`v/33.png`, `v/34.png`).
- Undo again returns to 2 of 24, and the row reads 5, more than the 2 nodes drawn (`v/35.png`,
  `v/36.png`).
- The row corrects itself only when the layer is selected, which reads "1 of 2" (`v/32.png`).
- After a direct edit and Done, the row was right (`v/14.png`). Only the undo and redo path is
  stale.

**Fix:** the style tree's layer rows should re-read the element's layer counts when the filter
changes through the history, as they do after a direct edit.

**App test (real input):** edit a filter card under a style layer, press Done, then Mod+Z. The
layer row reads the count the layer panel reads.

### 2. Major: Undo still removes the element's Louvain rerun before the reader's own edit (round 2, finding 6)

In `v`, the reader's last action was Done on the filter card. The first Mod+Z instead says "Undid
running Louvain". The Louvain step then reads "Run" and A reads "Waits" (`v/17.png`).

That rerun is about 100 ms on 8 nodes, well under the app's 1 s ask limit. So it should be rerun
by the element, not left waiting for a press (spec 6: "A stale run is rerun by the element under
the same limits").

**Fix (graphty-element):** a run that the element starts or reruns for a step writes no undo entry,
as So far computations already do.

**Element test:** a filter change under a style step on Louvain, then one undo. The undo restores
the filter, and the step stays applied.

### 3. Major: a link-scoped step's value column shows the unscoped run, not what the step tested

With Core number min 3 and Links where shared_chapters min 2, the matches strip's "Core number"
column shows the full-graph run (`lm/18.png`, `lm/19.png`, `lm/34.png`):

- Valjean reads 8, but the step computed 5 for him (networkx: 5 on the weight 2 and up links).
- Gavroche, Marius and Enjolras read 9, above the step's maximum of 7.

A reader checking "min 3" against the strip reads numbers the step never used. In the main table
with Matches only off, 6 nodes would show a core number of 3 or more and still be left out.

**Fix (graphty-element and app):** the element should expose the step's own computed values for
its members. The strip's column for a step with Links (or So far) should read them, with the scope
in its header ("Core number, Links: shared_chapters min 2").

**App test:** in task 4, the strip's value for Valjean equals the step's value, 5.

### 4. Major: a checked community is still saved as a raw id, and its label changes under it (round 2, finding 4)

The saved file stores the step as `test: { kind: "categories", values: ["0"] }`, with no member
named (`v/downloads/volunteers.graphty.json`). On screen the same saved id reads "Group 1" on the
24-node graph and "Group 3" once the filter leaves 8 nodes (`v/09.png`, `v/15.png`). The row gives
no sign that anything changed.

The step kept v02's community here only because both Louvain runs happened to number the community
holding v01 and v02 as 0. Round 2 showed that numbering moving to the other end of the graph.

**Fix:** as round 2 proposed. Save a checked group of an unstable result as `same-value` of a
member the element names, and show it as "Community of James Carter".

**Element test:** on volunteers.graphml, a step saved as the group of v02 keeps v02's community
before and after a filter removes the volunteers.

### 5. Minor: a stale run is kept beside its rerun (round 2, finding 5, smaller)

After one filter change, the saved file holds two Louvain runs, both `scope: "visible"`:

- `louvain`, measured on 24 nodes and 63 edges, now stale;
- `louvain_2`, measured on 8 nodes and 9 edges.

Spec 6 asks for one run per algorithm, settings and scope.

**Fix (graphty-element):** a rerun on a changed scope replaces the stale run under the same id.

### 6. Minor: a link-scoped algorithm step loses its histogram

Core number shows its histogram on all links (`lm/11.png`). As soon as a Links edge value is
picked, the Core number histogram is gone, and only the Min and Max boxes stay (`lm/13.png`,
`lm/19.png`). Degree keeps its histogram and rescales it to the scoped values (`lm/34.png`).

Spec 3.5 says the step's histogram is drawn from the scoped computation.

**Fix:** read the binned facts of the step's scoped computation for algorithm fields too, as
Degree already does.

### 7. Minor: deleting group A renames the remaining group B to "A"

With A (teal) and B (vermillion), Delete on A leaves one group. It keeps its vermillion chit, but
its row and the inspector now read "A" (`v/39.png`). Spec 1 and 3.1 say "Letters never change".

Cause:

- `removeBranch` (`graphty/src/workspace/selection/model.ts:121`) drops the lone group's name.
- The outline row then labels it by its position, `letterOf(0)`
  (`graphty/src/workspace/selection/SelectionEditor.tsx:956`).
- A later "Or..." makes the rename permanent, because `lettered()` gives the unnamed group the
  letter A.

**Fix:** a lone unnamed group's row shows the selection's title, as the key and strip already do.
Better, keep the name until the outline takes the simple case.

### 8. Minor: a saved Select card reads "Select a rule", not its condition

The tier 4 Select degree min 4 opens as "Select a rule", with the body "a rule". Its condition
appears nowhere on screen, although its count (16 of 16) is right (`old/02.png`, `old/03.png`).
Spec 3.3 says it is shown "in its own words, 'Select <condition>'".

Cause: `ruleWords` (`graphty/src/workspace/data-place/filterWords.ts`, the `default` branch near
line 77) has no case for the `degree` rule kind.

Note: this fixture was written by repolish 2's `py/mk.py`, not saved by a tier 4 build. The same
missing case applies to any read-only card with that kind.

**Fix:** word every rule kind the element accepts. Preferably, take the words from the element's
coded description of the rule.

### 9. Minor: after Cancel of a run, Run no longer says how long it takes

Before the run, the pane reads "Run (about 15 minutes)". After Run and then Cancel, it reads only
"Run" (`m/03.png`, `m/06.png`). The strip also keeps an empty "Girvan-Newman" column from the
cancelled run (`m/06.png`).

**Fix:** after a cancel, the step asks again with its estimate. The strip shows no column for a
run with no values.

### 10. Minor: "top 5" keeps 6 and nothing says why (round 2, finding 8)

Degree By position 5 keeps 6, and the row reads "Degree top 5" (`v/05.png`). The By position pane
shows only the box and "of all nodes": there is no tie chip ("5 asked, 6 kept: tied at 7"), no #
or %, and no top or bottom.

**Fix:** draw spec 5's tie chip from the element's tie facts.
