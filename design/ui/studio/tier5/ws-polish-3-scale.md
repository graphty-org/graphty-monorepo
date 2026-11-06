# Workspace polish 3: the selection workspace on a large graph

Adversarial review of the selection workspace (sidebar outline plus the non-modal workspace, spec
3.0 and 4.3) at build 18e34e72950b (graphty@0.8.92, rebuilt from HEAD and frozen). The graph is
the one the earlier large-graph rounds used: 50,000 nodes and 200,000 edges, with these columns:

- `team`, a string column of 5,000 values;
- `score` and `staff`;
- edge `kind` and `weight`.

Label propagation on it gives 10,786 communities: 1,540 of them inside a 1,703-node group.
Driven with `real.mjs` in one session at 1440 x 900, layout Random, through the style host (Layer
1), the filter host (a new filter card) and the edge selection.

Each timing below has two parts, both from the tool's `ms` record in `route.jsonl`:

- **input delay** (`act`): how long the page took to accept the input;
- **then busy** (`settleDom`): how long until the page answered the tool's DOM reads and the frame
  was still.

The probes are Playwright scripts on the same frozen build, run through `with-browser.sh`, on the
same graph with a `team` category step:

- `probe.mjs` records long tasks and when `styles.settled()` and `waitForStableFrame()` resolve
  after each action;
- `probe2.mjs` takes source-mapped CPU profiles.

Walk folder (main checkout): `tmp/design-studio/tier5/ws-polish-3/scale/`. It holds:

- `dist/`, the frozen build;
- `big-50k.graphml`;
- `s1/`, the screenshots `NN.png` and `route.jsonl`;
- `probe.mjs` and `probe2.mjs`;
- the profiles `profile-styled.log` and `profile-tick2.log`.

## What works at this size

- **Lists are bounded and fast.**
    - The checklists draw 8 rows: "8 of 1,540" in the style host (`s1/17.png`) and "8 of 10,786" in
      the filter (`s1/45.png`).
    - After "Check 1,898" and clearing the search, the checklist reads "1,892 more checked" and
      "2 of 8,888" (`s1/50.png`).
    - One keystroke in the 10,786-value search takes 62 ms (`s1/47.png`).
    - The reference picker lists no node row before typing and "Nodes 8 of 10" after
      (`s1/30.png`).
    - The matches table sorts 50,000 rows in 1.2 s and scrolls in 0.25 s (`s1/39.png`, `s1/40.png`).
    - Edge `kind` counts are drawn for the 23,379 visible edges (`s1/64.png`).
- **The histogram is fixed.** The Degree histogram has 32 bins and log heights, and the
  2,500-node tail is drawn (`s1/37.png`, `s1/38.png`). This was round 2's item 4.
- **The workspace outline shows state words in the style host:** "No test", "Run" and "No
  reference" (`s1/10.png`, `s1/16.png`, `s1/28.png`).
- **Label propagation finishes.** It now finishes in about 12 s in the style host, where round 2
  measured 70 s.

## Blockers

### 1. Every edit locks the page for 13 to 38 s; spec 4.3 check 37 asks for a re-count under 50 ms

- **Evidence from the walk.** Input delay, then busy, on 50,000 nodes:

    | Action                              | Input delay | Then busy | Screenshot  |
    | ----------------------------------- | ----------- | --------- | ----------- |
    | open the workspace (All nodes)      | 9.9 s       | 22.2 s    | `s1/08.png` |
    | choose `team` (no test yet)         | 6.8 s       | --        | `s1/10.png` |
    | commit Contains T0001               | 5.8 s       | 21.7 s    | `s1/14.png` |
    | choose Label propagation (not run)  | 7.4 s       | --        | `s1/16.png` |
    | tick one checklist row              | 6.4 s       | --        | `s1/19.png` |
    | the same with the Table hidden      | 6.4 s       | --        | `s1/21.png` |
    | Check 389                           | 7.6 s       | --        | `s1/23.png` |
    | add Within 2 hops with no reference | 8.9 s       | --        | `s1/28.png` |
    | choose the reference                | 5.5 s       | --        | `s1/31.png` |
    | Clear                               | 7.6 s       | 15.6 s    | `s1/34.png` |
    | Degree min 20                       | 7.5 s       | 21.7 s    | `s1/38.png` |
    | Done                                | 6.3 s       | over 30 s | `s1/41.png` |
    | add a filter card                   | 5.8 s       | 21.3 s    | `s1/43.png` |
    | filter: Check 1,898                 | 11.7 s      | 26.0 s    | `s1/49.png` |
    | filter: tick one row                | 11.2 s      | --        | `s1/51.png` |
    | filter: Done                        | 7.5 s       | 21.8 s    | `s1/52.png` |
    | filter card off                     | 10.7 s      | --        | `s1/53.png` |
    | filter card on                      | 9.7 s       | --        | `s1/54.png` |
    | edges: open the workspace           | 5.7 s       | 24.6 s    | `s1/62.png` |
    | edges: Cancel                       | 5.0 s       | 26.7 s    | `s1/66.png` |

    Notes on the table:

    - "Done" never settled: the tool reported "a style repaint is still being applied in batches"
      30 s after it.
    - A plain tab click right after "filter card on" took 7.4 s (`s1/55.png`), against 1.5 s at
      rest (`s1/56.png`, `s1/57.png`). Work left over from the edit runs into the next input.
    - Steps that change nothing still cost 7 to 9 s: a value with no test, a step with no
      reference, an algorithm not yet run.

- **Evidence from the probe** (`probe.mjs`, long tasks after each action):

    | Action                                  | Long tasks | Frame still at | Longest task | `styles.settled()` at |
    | --------------------------------------- | ---------- | -------------- | ------------ | --------------------- |
    | first edit                              | 14.3 s     | 14.5 s         | --           | 1.4 s                 |
    | second edit                             | 22.8 s     | 24.5 s         | 9.6 s        | --                    |
    | Styled (view only, no selection change) | 17.8 s     | 20.9 s         | --           | 0.74 s                |
    | Group colors                            | 15.8 s     | 18.7 s         | --           | --                    |
    | Done                                    | 19.1 s     | 21.0 s         | --           | --                    |
    - In the first edit, the tasks run back to back, about 250 ms each, with gaps of a few
      milliseconds.
    - In the `drawing` mode of `probe2.mjs`, a `page.evaluate` queued 1.5 s after an edit
      returned 17.2 s after it. No script could run on the page for 17 s.

- **Cause, from the profiles.**
    - **Styled** (`profile-styled.log`): 11.7 s of 13.7 s is graphty-element's `runUpdatePass`.
        - `updateEdges` takes 7.6 s: `Edge.update` 6.9 s, of which Babylon's `equalsWithEpsilon`
          is 2.9 s.
        - `syncStyles` takes 4.0 s, inside `disposeLabelsTogether`.
        - The edge walk is forced by `syncEdgeStyles`, which calls `forceEdgeWalk()` on every
          frame that paints edges (`graphty-element/src/managers/UpdateManager.ts:1029`).
          `EDGE_PAINT_BATCH` is 1,024, so the repaint is about 200 frames. Each of them walks all
          200,000 edges, to repaint 1,024.
        - The node path already avoids this. It walks only on the frame that finishes, or when a
          node was resized (comment at `UpdateManager.ts:1095`).
    - **A checklist edit** (`profile-tick2.log`):
        - `syncNodeStyles` takes 3.9 s, of which `DataManager.setAsideAndDispose` is 3.3 s
          (Babylon `isDisposed` 1.3 s);
        - the same forced edge walk takes 4.3 s;
        - on the app side, the right sidebar's `RowStyle` (`StylePanel.tsx:427`) re-renders for
          0.5 s, on `StylesApi.counts` (0.46 s).
    - Round 2 put the scope evaluation at 3 to 11 ms in Node, so the cost is the repaint and the
      re-render, not the count.
- **Fix.**
    - **graphty-element.**
        - In `syncEdgeStyles`, do not `forceEdgeWalk()` per batch. Update only the edges the batch
          painted, and walk once on the frame that empties the queue, as `syncNodeStyles` does.
        - Find why a paint-only change sets aside and disposes node meshes
          (`DataManager.setAsideAndDispose`). A color change should write the instance buffer,
          not rebuild the mesh.
        - Bound the repaint task to the frame budget. It currently runs about 250 ms per frame and
          once ran 9.6 s in one task.
    - **App.** While the workspace is open, do not re-render the right sidebar's style rows or
      read `StylesApi.counts` on every edit. Read them once the workspace closes, as was done for
      the covered style tree.

## Major

### 2. `styles.settled()` resolves 15 to 20 s before the canvas finishes, so the key's "Drawing" ends too early

- **Evidence.**
    - In `probe.mjs`, `styles.settled()` resolved at 0.74 s after Styled and at 1.4 s after an
      edit. `waitForStableFrame()` resolved at 20.9 s and 14.5 s.
    - In the walk, `waitForStableFrame` explained the wait itself: "a style repaint is still being
      applied in batches" (`s1/41.png` step).
    - Spec 7 says the key reads "Drawing" until `styles.settled()`. The key's counts are therefore
      shown as final for 15 s or more while the canvas still draws the old colors.
- **Fix (graphty-element).** Resolve `styles.settled()` only when the batched repaint has applied
  its last batch. Or add a `styles.drawn()` promise (additive, `@beta`) and have the key wait on
  that one.

### 3. Most members are hidden behind faint non-members in the preview

- **Evidence.** Visible green members, counted as connected blobs in the screenshots:

    | Members | Visible blobs | Screenshot               |
    | ------- | ------------- | ------------------------ |
    | 1,703   | 169           | `s1/14.png`              |
    | 442     | 76            | `s1/28.png`              |
    | 9       | 1             | `s1/31.png`, `s1/33.png` |
    - The graph is drawn in 3D, and the faint no-match nodes in front cover the members behind
      them.
    - On a large graph the preview therefore shows about a tenth of what the key counts.
    - Spec 7 asks that "members draw in their group's color" with the rest faint.

- **Fix (graphty-element, preview view).** Draw group members after the faint nodes, with depth
  test off for them or a render group above them. Or draw the faint nodes without depth write. The
  state layers (Selected, Hovered) already stay on top by the same means.

### 4. Fit pushes the drawing out of the preview cell

- **Evidence.**
    - With the Table hidden, the drawing was cut off at the top and sides (`s1/28.png`).
    - Fit then moved it left, so that its left side is cut off by the outline column and the
      right third of the cell is empty (`s1/32.png`).
    - It stayed that way 3 s later (`s1/33.png`) and after the Table was shown again
      (`s1/37.png`).
    - Spec 3.0 says Fit "frames the group's members" in the cell.
- **Fix (graphty-element or the app's placement).**
    - Re-read the cell box when the strip is hidden or shown.
    - Frame with that box, not the element's previous size, so that Fit centers the graph inside
      the cell.
    - Check it with `nodesInRect` over the cell, as the open-time framing does.

### 5. A run blocks the page with no Cancel, and the filter re-runs what already exists (round 2, partly fixed)

- **Style host.** Label propagation offers "Run (about 8 seconds)" (`s1/16.png`). The press took
  12.3 s of input delay, and the run finished inside it (`s1/17.png`). No frame with "Computing"
  or Cancel ever reached the screen.
- **Focus.** After the run, focus is on the "Layer 1" title in the right sidebar (`s1/17.png`),
  not on the step.
- **Filter host.**
    - With no filter on, picking "Label propagation" under Results offers "Run (about 8 seconds)"
      again (`s1/44.png`).
    - The press took 18.0 s and made a second run: the table gains "Label propagation (visible)"
      beside "Label propagation" (`s1/45.png`).
- **Fix (graphty-element).**
    - Run step-local algorithms in the element's Worker, as Girvan-Newman does (spec 4.3 Runs),
      so that Cancel can be pressed.
    - When no filter is on, treat the visible graph as the full graph and reuse the existing run.
- **Fix (app).** Keep focus on the step's pane after a run lands.

## Minor

### 6. A chosen node still shows its id (rounds 1 and 2, not fixed)

- **Evidence.** Choosing "Person 00017" sets the field and the outline row to "n17" (`s1/31.png`).
- **Fix.** Show the name column's value, with the id in the tooltip.

### 7. Two value-picker results cannot be told apart

- **Evidence.** Searching "commun" lists "Label propagation: Comm..." twice and "Girvan-Newman:
  Commun..." twice: Community and Community size (`s1/15.png`).
- **Fix (app).** Cut the algorithm name, not the field: "Label prop...: Community size". Or put
  the full name in the option's tooltip.

### 8. Rows in the filter host's outline cut the value name and lose the state word

- **Evidence.**
    - The filter's outline step reads "Label pr... 1,898 values" (`s1/49.png`).
    - Its first row, "Label propagation: Com...", shows no "Run" while the run is waiting
      (`s1/44.png`). The sidebar card says "Run", and the style host's outline row does too
      (`s1/16.png`).
- **Fix (app).** Use the same row component and state word as the style host. Shorten the count
  ("1.9k values") before the name.

### 9. The spec contradicts itself on how a long checked list is said

- **Evidence.**
    - Spec line 193 and the build say "1,898 values".
    - Spec lines 239, 419 and check 37 (line 690) still say "1, 3 and 2,083 more".
- **Fix (spec).** Keep one wording and update the other three places.

## Not re-checked

Round 2's item 3 (turning a filter on changes which communities a style step selects) was not
re-tested in this round.
