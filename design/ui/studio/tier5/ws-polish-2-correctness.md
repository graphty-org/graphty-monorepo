# Workspace polish round 2: correctness review of the selection workspace

Build 64cb33f3a6 (graphty@0.8.92). The app was rebuilt at that commit, and a frozen copy of
`graphty/dist` was driven with `real.mjs`. The sessions are in the main checkout (git-ignored), under
`tmp/design-studio/tier5/ws-polish-2/correctness/`:

- `lm`: Les Miserables (77 nodes, 254 edges, edge weight `shared_chapters`). Core number with Links
  where, two groups, Cancel, undo and redo, save and reopen in browser storage, Degree with Links
  where.
- `v`: volunteers.graphml (24 nodes, 63 edges). A two-group layer with By position and Louvain, a
  filter card, undo and redo across the filter, deleting a group, Clear, Cancel of a layer and of a
  filter card, saving to a file and opening it in a fresh tab.
- `old`: the four tier 4 project files of repolish round 2 (`repolish-2/correctness/old/`).
- `m`: `mid-4k.graphml` (4,000 nodes). A Girvan-Newman step that waits for Run.

The independent numbers come from networkx 2.8.8 (`py/lm.py`, `py/vf.py`, and inline checks of the
volunteers file). Screenshot paths below are relative to the session folder.

## What held up

Every count below agreed with networkx in the workspace header, the outline, the preview key, the
matches strip, the sidebar layer row and the canvas.

- **Edge-scoped steps (Links where, "weak links dropped").**
    - Core number min 3 keeps 48; with Links where shared_chapters min 2 it keeps 42, the task 4
      answer (`lm/08.png`, `lm/11.png`).
    - The Core number histogram now rescales to the scoped 0 to 7 instead of disappearing
      (`lm/11.png`). Round 1's finding 6 is fixed.
    - Min 4 with the same links keeps 31. Or... Degree min 15 gives B 7, "7, under A", total 31, No
      match 46 (`lm/18.png`).
    - Keep Degree min 5 keeps 40 on all links and 31 with Links where shared_chapters min 2. Its
      histogram rescales to 0 to 22 (`lm/28.png`, `lm/31.png`).
- **Groups and colors.**
    - Degree By position 5 keeps 6 (v02, v05, v06, v09, v13, v21), and the pane says "5 asked, 6
      kept: tied" (`v/05.png`). Round 1's finding 10 is fixed.
    - B = role staff: the key reads A 6, B 2, No match 16 (`v/07.png`).
    - Keep Louvain Group 1 on A: the checklist counts the step's input (3, 2, 1). The key reads A 3,
      B 4, total 7 (`v/08.png`, `v/09.png`).
- **Filter card.**
    - Except role volunteer leaves 8 of 24 nodes and 9 of 63 edges (`v/12.png`).
    - The layer on it reads 5 of 8 (A 1, B 5), and the key reads 1 + 4 + 3 = 8 (`v/13.png`,
      `v/22.png`).
    - Further edits give 3 of 24 and 1 of 63 edges, then 2 of 24 and 0 edges. Both match networkx
      for board, and for trained board (`v/41.png`, `v/42.png`).
- **The layer row after undo and redo of a filter.**
    - It now follows the filter: 7 on the full graph, 5 on 8 nodes and 1 on 2 nodes, without
      selecting the layer (`v/17.png`, `v/18.png`, `v/45.png`).
    - Round 1's finding 1 is fixed.
- **Cancel.**
    - Two edits to the Les Miserables layer, then Cancel, restore 42. Mod+Z brings both back (31, A
      and B), and redo returns to 42 (`lm/19.png` to `lm/21.png`).
    - The same holds for Degree with Links (`lm/32.png`, `lm/33.png`).
    - On volunteers, Cancel of "board added" and "A deleted" restores 5 of 8 with A and B
      (`v/30.png`).
    - Cancel of two filter edits restores 8 of 24 and 9 of 63 (`v/43.png`). Undo after it brings
      back 2 of 24 (`v/45.png`).
- **Deleting a group.**
    - Delete on A leaves one group, still vermillion, named by the title "Which nodes" instead of
      "A" (`v/23.png`). Round 1's finding 7 is fixed.
    - Mod+Z restores A and B exactly (`v/25.png`).
- **Clear** gives All nodes, 8 of 8, and Mod+Z restores both groups (`v/26.png`, `v/27.png`).
- **Save and reopen.**
    - The project saved to browser storage reopens at 42 with Links kept (`lm/26.png`).
    - The file saved from volunteers, opened in a fresh tab, reads 8 of 24 nodes, 9 of 63 edges and
      a layer of 5 of 8 (`v/33.png`).
- **Old projects keep their counts.**
    - nb-select reads 5 of 16 and 2 of 30, nb-out 15 of 16 and 12 of 30, nb-union-out 15 of 16 and
      25 of 30, and nb-to-edge 12 of 16 and 8 of 30 (`old/02.png` to `old/05.png`).
    - The Select card now reads "Select Degree min 4" (`old/06.png`). Round 1's finding 8 is fixed.
- **Pending steps.**
    - Girvan-Newman asks "Run (about 15 minutes)" and, once pressed, reads Computing with Cancel.
    - After Cancel the button reads "Run (about 15 minutes)" again, and the strip drops its empty
      column (`m/05.png` to `m/07.png`). Round 1's finding 9 is fixed.

## Findings, most severe first

### 1. Major: Undo still takes back the element's Louvain rerun first, and that rerun now discards Redo (round 1, finding 2)

- After Done on the filter card, the first Mod+Z says "Undid running Louvain." A then reads
  "Waits", and its Louvain step reads "Run" (`v/14.png`, `v/15.png`).
- New this round:
    1. Two undos (the Louvain run, then the filter edit) go back to 24 of 24.
    2. One redo restores the filter, and the element reruns Louvain on the 8 nodes at once.
    3. That rerun writes a new history entry. The Redo button goes grey with one redo still owed
       (`v/18.png`).
    4. The next Mod+Z again says "Undid running Louvain." (`v/19.png`).
- The reader's own redo chain is lost to a computation they never asked for. Spec 6 says
  computations that belong to a step have "no undo step", and that a stale run is rerun by the
  element.

**Fix (graphty-element):** a run that the element starts or reruns to serve a selection step writes
no history entry and leaves the redo stack alone, as So far and link-scoped computations already
do.

**Element test:**

1. A style step on Louvain sits under a filter card.
2. Edit the filter, then undo twice and redo once.
3. Undo names the filter, Redo stays enabled, and the step stays applied.

### 2. Major: Louvain runs pile up, and the table shows each as another "Louvain (visible)" column with different groups (round 1, finding 5, now worse)

- After this session the saved file holds six Louvain runs, all `scope: "visible"`
  (`v/downloads/v-saved.graphty.json`).

    | Run       | Nodes | Edges |
    | --------- | ----- | ----- |
    | louvain   | 24    | 63    |
    | louvain_2 | 8     | 9     |
    | louvain_3 | 8     | 9     |
    | louvain_4 | 3     | 1     |
    | louvain_5 | 3     | 1     |
    | louvain_6 | 2     | 0     |

    Two pairs measure the same scope, so even an unchanged scope is not reused. Every filter edit made
    while editing, and every undo or redo, added one.

- The matches strip shows every run as a column, each headed "Louvain (visible)", and they disagree:
    - On 8 nodes, v02 reads "Group 1" in the first column and "Group 3" in the second. The step
      "Keep Louvain: Community Group 3" keeps v02, so only the second column matches it, and nothing
      says which (`v/24.png`).
    - On 2 nodes, four such columns give the same node Group 3, 2, 2 and 1 (`v/51.png`).
- Spec 6: "One run per algorithm, settings and scope, shared."

**Fix (graphty-element):** a rerun on a changed scope replaces the stale run under its id, and a
step whose scope matches an existing run reuses it. Until then, the strip shows only the run each
step reads.

**Element test:**

1. A step on Louvain sits under a filter.
2. Change the filter three times, then undo and redo.
3. `results` lists one Louvain run for that scope.

### 3. Major: the strip does not show the values a step tested (round 1, finding 3, wider)

- With Core number min 3 and Links where shared_chapters min 2, the strip's Core number column still
  shows the all-links run: Valjean reads 8, but the step computed 5 (networkx: 5)
  (`lm/11.png`, `lm/17.png`, `lm/31.png`).
- A Degree step has no column in the strip at all, scoped or not, since degree is not a stored
  column (`lm/28.png`, `v/05.png`). "Degree top 5" or "Degree min 5 Links" cannot be checked
  against any number on screen.

**Fix (graphty-element and app):**

- The element exposes each step's own computed values for its input (scope, So far, Links).
- The strip draws one column per step that tests a value, headed with its scope ("Core number,
  Links: shared_chapters min 2").

**App test:** in task 4, the strip's value for Valjean reads 5, and a Degree step adds a Degree
column.

### 4. Major: a checked community is still saved as a raw id, and its label keeps changing (round 1, finding 4)

- The saved step is `test: { kind: "categories", values: ["0"] }`
  (`v/downloads/volunteers.graphty.json`).
- The same row reads "Louvain: Community Group 1" on 24 nodes (`v/09.png`), "Group 3" on 8 nodes
  (`v/22.png`) and "Group 1" again on 2 nodes (`v/51.png`). The row gives no sign that anything
  changed.

**Fix:** as round 2 proposed. Save a checked group of an unstable result as `same-value` of a
member the element names, and show it as "Community of James Carter".

### 5. Minor: Redo names the filter as it was before the redo

- Undo of the filter edit says `Undid editing the filter "except role volunteer".` The Redo that
  restores exactly that card says `Redid editing the filter "except role pick values".`, naming
  the half-made state it left (`v/17.png`, `v/18.png`).
- Cause: `undoOrRedo` in `graphty/src/workspace/frame/historyWords.ts` takes `filterStep` from the
  session before it runs. For Redo that is the state being replaced.

**Fix:** for Redo, word the filter from the session after `session.redo()`
(`filterChange(session, next.fact) ?? filterStep`). Keep the words taken before the change for
Undo.

**App test:** edit a filter card, Done, Mod+Z, then Mod+Shift+Z. The status line names the card's
restored condition.
