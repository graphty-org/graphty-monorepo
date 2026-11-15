# Workspace polish 2: the selection workspace on a large graph

Adversarial review of the selection workspace (sidebar outline plus the non-modal workspace, spec
3.0) at build 64cb33f3a61e (graphty@0.8.92, rebuilt from HEAD and frozen), on the graph both
earlier large-graph rounds used: 50,000 nodes, 200,000 edges, a `team` string column of 5,000
values, `score`, `staff`, edge `kind` and `weight`. Label propagation on it gives 10,786
communities; inside a 1,703-node group the checklist held 1,540 of them, inside a 2,500-node
group 2,423. Driven with `real.mjs` in one session at 1440 x 900, layout Random. "Input delay" is
the tool's `ms.act` in `route.jsonl`: how long the page took to accept the input.

Walk folder (main checkout): `tmp/design-studio/tier5/ws-polish-2/scale/`. It holds
`big-50k.graphml`, `dist/` (the frozen build), `st.sh`, `bench-watch.ts` (the Node timing of
`scope.watchSteps`), `hist-crop.png`, and `s1/` (screenshots `NN.png`, `route.jsonl`).

**Works at this size:**

- **Repaints settle now.** The preview canvas settles under 1.2 s after every edit. Round 1 took
  30 to 90 s, so the round 1 blocker on the repaint is fixed (`settleCanvas` 0.8 to 1.1 s in
  `route.jsonl` from step 08 on; no "still moving" after any edit).
- **The filter freeze is shorter.** A filter edit now takes 10 s of input delay, down from
  25.5 s.
- **Lists stay bounded.**
    - The matches strip renders 17 rows out of 50,000 (the `row` count in `route.jsonl`). It
      sorts 50,000 rows in 230 ms and scrolls in 243 ms (`s1/42.png`, `s1/43.png`).
    - The reference picker lists no node row before typing ("Nodes 50,000", `s1/28.png`) and 8
      after ("Nodes 8 of 10", `s1/29.png`). Each node row shows the matching name dimmed.
    - The checklist reads "Search 1,540" with 8 rows, then "8 of 1,540" (`s1/18.png`). Its search
      takes 7 keystrokes in 1.7 s and offers "Check 389" (`s1/19.png`).
    - A long value list collapses to its count ("389 values", `s1/21.png`).
    - Edge checklist counts sum to 200,000 (`s1/88.png`).
- **Outline width.** The workspace outline column keeps its width while open.
- **Existing runs are reused.** A style step on an existing run reads that run with no Run button
  (`s1/73.png`).

## Blockers

### 1. Every edit freezes the page for 7 to 11 s; filter changes for 8 to 18 s

- **Evidence.** Measured input delay for the next input after an edit, in the style workspace on
  50,000 nodes:
    - commit a Contains test: 9,108 ms (`s1/14.png`)
    - choose a value that has no test yet: 8,690 ms (`s1/10.png`) and 9,116 ms (`s1/16.png`)
    - tick one checklist row: 8,318 ms (`s1/20.png`); with the strip hidden, 7,478 ms
      (`s1/23.png`)
    - "Check 389": 9,266 ms (`s1/21.png`)
    - add a step that has no reference yet: 9,391 ms (`s1/27.png`)
    - choose a reference: 7,079 ms (`s1/30.png`)
    - Clear: 9,300 ms (`s1/40.png`)
    - Degree min 20: 5,324 ms (`s1/46.png`)
    - edge `kind` work, on 200,000 edges: 9,570 ms (`s1/88.png`)

    In the filter host:
    - Degree min 20: 9,975 ms (`s1/59.png`)
    - switch the filter card off: 9,275 ms (`s1/62.png`)
    - switch it on: 17,744 ms (`s1/78.png`)
    - switch it off again: 8,167 ms (`s1/82.png`)

    Most of these clicks timed out in Playwright ("performing click action" for 3 s): the main
    thread did not take the input. A step that changes nothing still costs about 9 s (a value with
    no test, a step with no reference). Spec 4.3 check 37 asks for a re-count under 50 ms.

- **Not the scope evaluation.** `bench-watch.ts` builds the same graph in Node and times
  `session.scope.watchSteps`:
    - one category step reads in 9 to 11 ms (98 ms cold);
    - Degree reads in 3 ms;
    - two steps read in 10 ms.

    Nor is it the repaint alone. A view-only repaint of all 50,000 nodes (Group colors to Styled)
    takes 1.9 s (`s1/24.png`), and hiding or showing a layer 3.7 to 4.5 s (`s1/48.png`,
    `s1/50.png`).

- **Likely contributors.** These were read in the code, not profiled:
    - Each edit is a document change (an undo entry, `project:derived`, the sidebar style tree
      re-reading its counts, an autosave of the `rest` part).
    - The selection is read by about six separate `watchSteps` watchers that share nothing:
        - the workspace editor and the sidebar outline (`useSteps`, each with a synchronous peek
          in render plus the effect's watch);
        - `PreviewKey`, `MatchesStrip` and `TableDock` (`useEditedSelection`);
        - the element's own branches view.
- **Fix.**
    - **Profile first.** Record a Performance profile of one checklist tick on this graph and
      attribute the long task.
    - **Element, whatever the profile shows.**
        - Let one selection reading be shared: `watchSteps` keyed by the rule's digest, one
          evaluation per input change for every watcher.
        - Skip the paint and the change event when a step's member set did not change (no test, no
          reference).
    - **App.**
        - Read the open selection once and pass the reading to the key, the strip and the table,
          instead of four watchers.
        - Drop the synchronous peek in `useSteps` (`graphty/src/workspace/selection/useSteps.ts:30`).
        - Whatever the profile shows is document-change overhead (style tree, derived counts,
          autosave serialization): defer it to idle time, and never run it inside the input's task.

### 2. "Run (about 8 seconds)" takes about 70 s, and Cancel cannot be pressed (round 1, not fixed)

- **Evidence.** Label propagation: Community on 50,000 / 200,000 offers "Run (about 8 seconds)"
  (`s1/16.png`).
    - **The click.** It took 11,307 ms of input delay. 34 frames were drawn in the next 30 s, with
      "Computing" and Cancel on screen (`s1/17.png`).
    - **Cancel.** Pressing Cancel 60 s after Run took 13,212 ms to land, and by then the run had
      finished: the checklist showed "No test" and the values (`s1/18.png`).
    - **Elapsed time.** About 70 s from Run to values. The estimate is 9 times too low, and Cancel
      does nothing for the whole run.
    - **The filter host.** Picking the already-computed "Label propagation" under Results offers
      the same "Run (about 8 seconds)" again (`s1/55.png`). This happens with no filter on, when
      the full graph and the filtered graph are the same graph.
- **Fix (graphty-element).** As in round 1:
    - Run step-local algorithms in the element's Worker, as Girvan-Newman does (spec 4.3 Runs).
    - Calibrate the estimate: time the first iteration and scale it to the base size.
    - In a filter, let an existing run be reused when its scope is the full graph: with no filter
      on, the filtered graph is the full graph, so the run is not circular.

## Major

### 3. Turning a filter on changes which communities a style step selects (round 1, not fixed)

- **Evidence.** On 50,000 nodes, Layer 1 was "Degree min 20, Keep Label propagation: Community"
  with Group 1 and Group 123 checked: 6 nodes (`s1/76.png`). The filter "Degree min 20" was then
  switched on (17.7 s, `s1/78.png`).
    - The same step's tooltip reads "Label propagation: Community Group 352, Group 464 ... 0 of
      2,500" (`s1/80.png`). The reader never chose those groups.
    - With the filter off again the layer reads 6 once more (`s1/84.png`). The step's meaning
      follows the filter.
- **Fix (graphty-element).** As in round 1: keep the partition a step was chosen on until the
  reader re-runs it, and report `stale`. Or store the checked groups by member set and remap
  them, reporting `stale` when a group no longer exists.

### 4. The Degree histogram draws a 2,500-node tail as empty (rounds 1 and 2, not fixed)

- **Evidence.** The Degree histogram on 50,000 nodes has three visible bars, and every bin from
  about degree 12 to 75 is a flat dash (`hist-crop.png`, from `s1/45.png`). Those bins hold 2,500
  nodes, 160 to 441 per 32nd of the range (computed from `big-50k.graphml`).
    - With "min 20" the whole selected range draws as dashes while 2,500 nodes are selected
      (`s1/46.png`, and the filter's `s1/59.png`).
    - Heights are linear. Spec 4.3 asks for "log height when skewed", and the commit cb77e6425f
      claims it ("skewed values draw log heights").
    - About 19 bins are drawn, where spec 4.3 says 32.
- **Fix (app or element, wherever the skew test lives).** Treat a max/median bin ratio above about
  20 as skewed, draw log(1 + count) heights, and give any non-empty bin at least 2 px. Bin to 32.

## Minor

### 5. The workspace outline never shows a step's state; only the sidebar and the pane do (round 1, not fixed)

- **Evidence.** These workspace outline rows show no state word:
    - "team" with no test (`s1/10.png`);
    - "Keep Label propagation: Community" waiting for Run (`s1/16.png`) and while computing
      (`s1/17.png`);
    - "Keep Within 2 hops of" with no reference (`s1/27.png`);
    - "Keep Within 2 hops of Hovered or ..." while paused (`s1/35.png`).

    In each case the sidebar row says "No test", "Run", "Computing", "No re..." or "Pau...", and the
    pane says "No reference" or "Paused".

- **Fix (app).** End the workspace outline row with the same short state word the sidebar draws
  (`words.ts`), at its full width.

### 6. Sidebar rows lose the words that matter first

- **Evidence.**
    - Layer step with two checked groups: "Keep Label propagation: Co..." with no hint of the
      groups (`s1/76.png`).
    - Hops on Hovered or selected: "Keep Within 2 hops of Pass..." loses the reference and cuts the
      state word (`s1/34.png`).
    - Filter cards: "Label... Run" (`s1/55.png`) and "D... No test" (`s1/57.png`).
    - Edge selection: "Which edg... 200,000 of 200,000" (`s1/84.png`). The 7-digit count pushes
      the label out.
- **Fix (app).** Keep the state word and the label ("Which edges") whole. Cut the value name
  before the reference token, never below about 8 characters. Write a long count as "200k of
  200k" when the row cannot hold it.

### 7. A chosen node shows its id, not its name (round 1, not fixed)

- **Evidence.** Choosing "Person 00017" from "Person 0001" sets the field and the row to "n17"
  (`s1/30.png`), and "Person 00001" sets "n1" (`s1/39.png`). Spec 4.3 says the chosen node
  shows as "a node's name".
- **Fix.** Show the matched name column's value in the field and the row, with the id in the
  tooltip.

### 8. The value picker cannot find a computed community by its full name

- **Evidence.** These searches find nothing:
    - "Label propagation: Comm" in the filter's value picker (`s1/64.png`) and in the layer's
      (`s1/69.png`);
    - "commun", once the run exists: it lists only "Community size" under Results, and the
      algorithm is gone from Find groups (`s1/71.png`).

    Only "label" finds it, as "Label propagation" (`s1/72.png`). On a large graph the run is the
    expensive part, and the reader who searches by its full step name cannot reach the result.

- **Fix (app).** Index a result under its algorithm and field ("Label propagation: Community"),
  and match words in any order, ignoring the colon.

### 9. A 5,000-value string column still gets only Contains (waiting for the owner)

- `team` gets Contains with suggestions (`s1/13.png`). This is the owner's open choice in
  `owner-decisions.md`, and nothing more is needed until he decides.
