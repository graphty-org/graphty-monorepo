# Workspace polish round 3: correctness review of the selection workspace

Build 18e34e7295 (graphty@0.8.92). `graphty/dist` was rebuilt at that commit, because the copy on disk
predated it, and a frozen copy was driven with `real.mjs`. The sessions are in the main checkout
(git-ignored), under `tmp/design-studio/tier5/ws-polish-3/correctness/`:

- `lm`: Les Miserables (77 nodes, 254 edges, edge value `shared_chapters` 1 to 31). This session
  covers:
    - Core number 3 to 5 with Edges where shared_chapters min 2.
    - Or Degree min 15.
    - A second Keep step, Degree min 5, with the same edges.
    - Cancel after two edits, then undo and redo.
    - Saving to browser storage and reopening.
    - Clicks on the preview canvas.
- `v`: volunteers.graphml (24 nodes, 63 edges). This session covers:
    - Keep Louvain Group 1.
    - An Except role volunteer filter, widened to Except role staff, volunteer.
    - Undo and redo across the filter.
    - Saving to a file and opening it in a fresh tab.
- `old`: the four tier 4 project files (`repolish-2/correctness/old/`). Variants with single parts
  removed are in `variants/`.
- `m`: `mid-4k.graphml` (4,000 nodes). A Girvan-Newman step that waits for Run.

The independent numbers come from networkx 2.8.8 (`py/lm.py`, `py/lm2.py`, `py/v.py` and inline
checks of the neighbors and volunteers files). Screenshot paths below are relative to the session
folder.

The interrupted commit 4a3ed7cf1e (polish round 1) has since been superseded by the polish 2 fixes
and later rounds. Everything below was checked on the current build.

## What held up

Every count below agreed with networkx in the workspace header, the outline, the preview key, the
sidebar layer row and the canvas.

- **Edge-scoped steps.**
    - Core number min 3 keeps 48 of 77 on all edges. With Edges where shared_chapters min 2 it keeps
      42 (No match 35); networkx gives 48 and 42 (`lm/04.png`, `lm/07.png`).
    - The Core number histogram rescales to the scoped 0 to 7, with the scoped distribution: 19 at
      0, 17 at 7.
    - Core 3 to 5 with the same edges keeps 24 (networkx 24) (`lm/08.png`).
    - Adding Keep Degree min 5 on all edges gives A 22. With Edges where shared_chapters min 2 it
      gives A 13, B 4 drawn and a total of 17. networkx gives 22, then 13, 4 and 17
      (`lm/22.png`, `lm/23.png`).
    - The Degree histogram rescales to 0 to 22, the scoped maximum (Valjean 22).
    - Degree min 6 with the edges gives a total of 11 (networkx 11) (`lm/28.png`).
- **Groups and colors.**
    - Or Degree min 15 gives B 7 on its row, 4 drawn in the key and a total of 28. networkx agrees:
      7, of which Enjolras, Fantine, Gavroche and Marius are outside A (`lm/10.png`, `lm/12.png`).
    - Except on A gives A 53, B 1 drawn and a total of 54 (networkx 53, 1, 54) (`lm/13.png`).
    - On 4,000 nodes, team green reads "811, under A" (`m/03.png`).
- **Cancel** after two edits (B min 20, A Except) restores 28 with A 24 and B 7 (`lm/14.png`).
  Mod+Z brings back the cancelled 54, and redo returns to 28 (`lm/16.png`, `lm/17.png`).
- **Save and reopen.**
    - Les Miserables, saved to browser storage, reopens at 28 of 77. The step's tooltip still reads
      "Core depth 3 to 5, Edges: shared_chapters min 2" (`lm/19.png`, `lm/20.png`).
    - The volunteers file opened in a fresh tab reads 3 of 24 nodes, 1 of 63 edges and a layer of
      1 of 3 (`v/20.png`).
- **Filter card.**
    - Except role volunteer leaves 8 of 24 nodes and 9 of 63 edges (`v/04.png`).
    - Except role staff, volunteer leaves 3 of 24 nodes (v01, v13, v23) and 1 of 63 edges (v13 to
      v23), as networkx gives (`v/14.png`).
- **Old projects keep their counts.** nb-select reads 5 of 16 and 2 of 30, nb-out 15 of 16 and 12 of
  30, nb-union-out 15 of 16 and 25 of 30, and nb-to-edge 12 of 16 and 8 of 30. All eight figures
  were recomputed from `neighbors.csv` (`old/02.png` to `old/05.png`).
- **Round 2's finding 5 is fixed.** The Redo that restores the filter says `Redid editing the filter
"except role volunteer".` (`v/08.png`).

## Findings, most severe first

### 1. Major (new): a click on the preview canvas ends the workspace as Done

- These steps were taken with the workspace open on Les Miserables:
    1. Edit a step. The header reads 17 of 77, and Cancel would restore 26.
    2. Click empty canvas inside the preview, at 600,600, above the strip.
    3. The workspace closes, the edit is kept, and the layer is deselected (`lm/25.png`,
       `lm/26.png`).
- The same happens with a click on a node (Valjean):
    - The workspace closes and keeps Degree min 6. The layer reads 11.
    - The inspector moves to Valjean, and the camera moves (`lm/27.png`, `lm/28.png`).
- After either click, Cancel is no longer possible. A reader who clicks a node to check it loses
  the right to cancel without being told.
- Spec 3.0: "A click on the canvas does what it does on the canvas (selects, hovers) ... Neither
  closes the workspace." Spec 9: "a click on the canvas or in the sidebar never ends it."
- Cause:
    - Since polish 2 ("the canvas is the frame"), the preview is graphty-element's own canvas.
    - Its `canvas:empty-click` and `canvas:element-click` reach `useCloseOnNewSelection` in
      `graphty/src/workspace/inspector/Inspector.tsx`, which sets `inspected: null`. A node click
      also changes the selection.
    - The inspector then unmounts the layer pane. The `SelectionEditor` unmount effect ("Leaving
      the place unmounts the editor ... as Done") closes the workspace and keeps its edits.

**Fix (app):**

- While `store.get().selectionWorkspace !== null`, `useCloseOnNewSelection` leaves `inspected`
  alone on `canvas:empty-click`, `canvas:element-click` and `selection:changed`.
- The click still selects the node, and the Selected ring draws over the preview (spec 9). The
  inspector follows the selection only after the workspace closes.

**App test (real input):**

1. Open the workspace and edit a step.
2. Click empty preview canvas with the DevTools mouse (`test/helpers/real-input.ts`), then click a
   node.
3. The workspace stays open and the node is selected. Cancel restores the count from before the
   edit.

### 2. Major: Undo still takes back the element's Louvain rerun first, and the rerun still discards Redo (round 2, finding 1, unchanged)

- After Done on the filter card, the first Mod+Z says "Undid running Louvain." (`v/06.png`).
- In that state the screen disagrees with itself:
    - The sidebar layer row reads 2.
    - The outline's title row reads "0 of 8", and its step reads "Run".
- A second Mod+Z undoes the filter, which returns to 24 of 24 (`v/07.png`).
- One Mod+Shift+Z restores the filter. The element reruns Louvain, and Redo goes grey with one redo
  still owed (`v/08.png`).
- The next Mod+Z again says "Undid running Louvain." (`v/09.png`, `crop-v09.png`).

**Fix (graphty-element):** as round 2 proposed. A run that the element starts or reruns to serve a
selection step writes no history entry and leaves the redo stack alone (spec 6: "no undo step").

**Element test:**

1. A style step on Louvain sits under a filter.
2. Edit the filter, then undo twice and redo once.
3. Undo names the filter, Redo stays enabled, and the step stays applied.

### 3. Major: one Louvain run per scope ever seen, each its own "Louvain (visible)" column, disagreeing (round 2, finding 2, narrower)

- Undo and redo no longer add runs: after two undos and a redo the file holds two runs
  (`v/downloads/volunteers.graphty.json`). But every new filter scope still adds one.
- With the card widened to Except role staff, volunteer (still being edited), the strip shows three
  columns, all headed "Louvain (visible)" (`v/15.png`):

    | Node | Column 1 | Column 2 | Column 3 |
    | ---- | -------- | -------- | -------- |
    | v01  | Group 1  | Group 3  | Group 2  |
    | v13  | Group 2  | Group 1  | Group 1  |
    | v23  | Group 3  | Group 2  | Group 1  |

- Only the third column is the run the step reads. Nothing says which one that is.
- The saved file holds `louvain` (24 nodes), `louvain_2` (8) and `louvain_3` (3), all with
  `scope: "visible"` (`v/downloads/volunteers.graphty (2).json`).
- Spec 6: "One run per algorithm, settings and scope, shared".

**Fix (graphty-element):**

- A rerun on a changed scope replaces the stale run under its id.
- Until that lands, the strip shows only the run each step reads, headed with its scope.

**Element test:** a filter changed three times under a Louvain step leaves one Louvain run.

### 4. Major: the strip shows values the step did not test (round 2, finding 3, unchanged)

- Keep Core number 3 to 5 with Edges where shared_chapters min 2 keeps 24, and networkx agrees.
- The strip's Core number column lists those 24 nodes with all-edge values, most of them outside
  the tested range (`lm/08.png`, `lm/23.png`):

    | Node           | Strip shows | Step tested (networkx) |
    | -------------- | ----------- | ---------------------- |
    | Valjean        | 8           | 5                      |
    | Thenardier     | 8           | 4                      |
    | Mme Thenardier | 7           | 4                      |
    | Javert         | 8           | 4                      |
    | Cosette        | 6           | 4                      |

- A reader checking "3 to 5" against the strip sees members that seem to fail it.
- Degree steps (B min 15, A min 5 with Edges) add no column at all (`lm/12.png`, `lm/23.png`).

**Fix (graphty-element and app):**

- The element exposes each step's own computed values for its input (scope, So far, Edges).
- The strip draws one column per step that tests a value, headed with its scope ("Core number,
  Edges: shared_chapters min 2").

**App test:** in this setup, the strip's Core number for Valjean reads 5, and a Degree step adds a
Degree column.

### 5. Major: a ticked community is saved as a raw id, and its name changes (round 2, finding 4, unchanged)

- The reader ticks "Group 1" (v01 to v08) on 24 nodes. The file saves
  `test: { kind: "categories", values: ["0"] }`.
- The strip names groups by size rank ("Group 1" is the largest), while the step stores the raw
  run id.
- On the 3-node filter, id 0 is {v01}, which the strip calls "Group 2". The same step now reads
  "Louvain: Community Group 2, 1 of 3 nodes so far" (`v/18.png`). Nothing shows that the meaning
  changed.

**Fix:** as round 2 proposed. Save a ticked group of an unstable result as `same-value` of a member
the element names, and show it as "Community of Maria Lopez".

### 6. Minor: every old project opens with "1 part did not come back", though nothing was lost

- All four tier 4 files open with "Opened nb-... 1 part did not come back." Round 2's screenshots
  show the same message (`crop-old-notices.png`, `crop-old-prev-notices.png`).
- Their filters do come back, with the counts above.
- Removing parts one at a time shows the cause (`variants/`, `old/07.png` to `old/14.png`):
    - Without the style, view-state, sources, arrangement, notes or results part, the notice is
      unchanged.
    - Without `visibility.conditions`, the file opens clean.
- Cause: these files hold `conditions` but no `steps`. `readSavedConditions` in
  `graphty-element/src/session/visibility/conditions.ts` compares `stepsOf(read)` with the absent
  steps and reports `W_FILTER_STEPS_DIFFER`.
- `openedProject` in `graphty/src/workspace/project/actions.ts` counts every problem, warnings
  included, as a lost part.

**Fix:**

- **graphty-element:** report `W_FILTER_STEPS_DIFFER` only when the file holds a `steps` array.
- **App:** count only problems that dropped something in "did not come back".

**Element test:** a session member with conditions and no steps opens with no problems.

### 7. Minor: a narrow outline row cuts "3 to 5" to "3" and drops the Edges tag

- At the default outline width (`lm/09.png`, `lm/10.png`, `crop09.png`), the step row reads
  "Core number: Core dep... 3".
- The test "3 to 5" is cut to a bare "3" in the column where the B row's step shows its own words.
  It reads like a count of 3, while the step holds 24.
- The Edges tag, which changes the result, is not drawn at all. It appears only in the tooltip.
- With the outline wider (`lm/12.png`), the same row reads "3 t... E..".

**Fix:** the test column gives way before the value does. When the row can show neither whole, it
keeps the ellipsis visible, and the Edges tag keeps its minimum width, as the state word does.
