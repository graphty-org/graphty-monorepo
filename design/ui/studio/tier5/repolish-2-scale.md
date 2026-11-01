# Re-polish 2: the selection editor on a large graph

Adversarial review of the selection editor at build 1b8c1045bc84 on the same generated graph as
round 1: 50,000 nodes, 200,000 edges, a `team` string column of 5,000 values, `score`, `staff`
and an edge `kind`. A Label propagation run on it gives 10,786 communities, so the 5,000-value
category was exercised there as a 10,786-value one. Driven with `real.mjs` in one session, layout
switched to Random. Timings are the tool's `ms.act` (how long the page took to take the input),
from `route.jsonl`.

Walk folder (main checkout): `tmp/design-studio/tier5/repolish-2/scale/` -- `gen.py`,
`big-50k.graphml`, `dist/` (the frozen build), `s1/` (screenshots `NN.png`, `route.jsonl`).

Fixed since round 1, verified: thousands separators in the layer rows, the Which row and the filter
chip (`s1/08.png`, `s1/49.png`); the checklist keeps the two largest unchecked values, "1,891 more
checked", "2 of 8,889" (`s1/27.png`); the community checklist names every value by rank
("Search 10,786", "8 of 10,786", `s1/20.png`) and its search answers in about 1.7 s for seven
keystrokes (`s1/21.png`); a step's number test has the HistogramRow brush (`s1/47.png`); a run
with no cost estimate on a large scope waits for "Run (about 8 seconds)" and then reads
"Computing" with Cancel (`s1/16.png`, `s1/19.png`); the reference picker draws no node rows before
typing ("Nodes 50,000") and at most 8 after, each keystroke answered in about 150 ms
(`s1/30.png`, `s1/33.png`); the table opens on "Matches only" and sorts all 50,000 rows by score
in 1.3 s (`s1/42.png`).

## Blockers

### 1. The preview still paints for over a minute, and the key reads a finished count meanwhile (round 1, not fixed)

- **Evidence.** Every step change on 50,000 nodes leaves "a style repaint is still being applied
  in batches" for 30 s or more. `s1/34.png`: key "Which nodes 55", most of the canvas still in
  the group color; it was right only about 90 s later (`s1/36.png`). Opening an empty "New filter"
  repaints all 50,000 nodes to say nothing has changed ("New filter 50,000", `s1/44.png`, 30 s+).
  Adding a step that changes nothing (While, no reference) cost 8,822 ms of input delay
  (`route.jsonl` step 36). While a repaint runs, clicks land 5 to 9 s late and are reported as
  timeouts: a checklist row 9,137 ms (step 24), "Table" 6,466 ms (step 38), the Degree option
  5,232 ms (step 46); an Enter on the field picker never took (`s1/46.png`).
- **Fix (graphty-element).** As round 1: draw the preview as a per-instance color/alpha write on
  the node and edge instance buffers (one typed-array write per member, one upload per frame)
  instead of `applySessionPaint` per node in `NODE_PAINT_BATCH` slices. Skip the repaint when the
  member set did not change (a no-op step, a new filter that keeps everything). Until then, expose
  a `pending` fact the key reads, so it never shows a finished count over an unfinished canvas.

### 2. A filter-card edit still freezes the page for 22 s (round 1, not fixed)

- **Evidence.** Filter card "Keep Degree", typing "20" and Enter: 22,329 ms before the page took
  the next input (`route.jsonl` step 47), then the 30 s repaint above (`s1/49.png`). Counts are
  right (2,500 of 50,000 nodes, 5,214 edges; checked against the file: 2,500 nodes of degree 20 or
  more).
- **Fix.** As round 1: apply filter visibility as the same instance-attribute write, and slice the
  re-evaluation it triggers (every style layer's steps, every step-local run re-reading the visible
  graph, see major 5).

### 3. A live hops step still re-evaluates on every pointer move (round 1, not fixed)

- **Evidence (code).** `graphty-element/src/session/scope/stepRuns.ts:230-247`: `heldBack` is
  only called for `measure` leaves (lines 346, 399), so "Within 2 hops of Hovered or selected"
  has no estimate and is never `run-paused`. Round 1 measured 5.9 to 6.9 s per hover on this
  graph; nothing in this build changes that path, and blocker 1 makes each re-evaluation a full
  repaint.
- **Fix (graphty-element).** Estimate `hops` / `touching` / `same-value` leaves from the base size
  and hop limit and send them through `heldBack`, so they report `run-paused` above `liveMs` while
  hovering.

## Major

### 4. Typing a node's exact id and pressing Enter chooses a different node

- **Evidence.** Reference search "n4999": the list reads "Nodes 8 of 11" with n49994, n49990,
  n49998, n49991, n49993, n49995, n49996 and n4999 last (`s1/32.png`). Enter took the first:
  the field reads "n49994", the key 55 nodes (`s1/34.png`), and the step row cuts the id to
  "n499..." so the wrong node cannot be seen. "n1" finds "Nodes 8 of 11,111" with n1005, n181,
  n1475... (`s1/33.png`): node n1 can never be reached by typing, because no longer text narrows
  to it, and Pick on canvas cannot find one node among 50,000.
- **Cause.** `graphty/src/workspace/selection/references.ts:40-49` (`findNodes`) asks for
  "starts with" sorted by degree; an exact match has no priority.
- **Fix.** Put the exact id (and exact name) match first: look it up with `session.data.node(id)`
  (or a `matching.mode: "exact"` page) before the starts-with page. Let the step row show the
  whole reference before cutting the verb's words.

### 5. A filter re-computes a community step and changes what it selects and what its values are called

- **Evidence.** Layer 1's step "Keep Label propagation: Community", checked "Group 1x" (1,898
  groups, then Group 1 unchecked): tree name "Group 10, Group 11 and 1,8..." (`route.jsonl`
  step 24). After the filter "Degree min 20", the same row reads "725, 731 and 1,895 more" in its
  accessible name, "Lab... 7. and 1,895 more" on screen (`s1/49.png`, `s1/51.png`), and its
  checklist reads "Search 724" with Group 1, Group 2, Group 3, Group 5, Group 6, Group 11 checked
  (`s1/51.png`): the reader unchecked Group 1 and never checked Group 2. The same step's values are
  named three ways at once (raw ids in the row, "7." on screen, re-ranked groups in the list).
- **Cause (likely).** The step's measure reads the visible graph (`baseScope` in `stepRuns.ts:203`),
  so a filter re-runs Label propagation over 2,500 nodes; the step keeps the old run's community
  ids, which mean different communities (or none) in the new result, and the ranks come from a
  different result than the ids.
- **Fix (graphty-element).** A partition id is not stable across re-runs: either keep a step's
  partition result fixed to the base it was chosen on until the reader re-runs it (the `stale`
  state the step already has), or store the checked groups by member set and re-map them, and
  report the step as `stale` when its ids no longer exist. App: name the row's values with the same
  `valueName` the checklist uses.

### 6. "Run (about 8 seconds)" took over a minute and froze the page

- **Evidence.** Label propagation on 50,000 / 200,000 offered "Run (about 8 seconds)"
  (`s1/16.png`). After the click, the page took 12,978 ms to return, drew 32 frames in the next
  30 s while "Computing" and Cancel showed (`s1/19.png`), and the values arrived between 60 and
  86 s after the click (`route.jsonl` steps 18 and 19, `s1/20.png`). Cancel was drawn but the page
  could not answer it in time.
- **Why.** Spec 6: the ask limit and the live limit are judged from the estimate; one that is
  8 to 10 times low lets long runs start unasked, and a run on the main thread makes Cancel useless.
- **Fix (graphty-element).** Calibrate the estimate (time the run's first iteration and scale), and
  run step-local algorithms off the main thread or in yielding slices so Cancel and the pointer
  stay live.

### 7. The step row cuts the value's name and the listed values to one or two letters

- **Evidence.** "Keep L Run (about 8 seconds)" (`s1/16.png`), "Keep La... G.. and 1,896 more"
  (`s1/23.png`), "Keep Lab... 7. and 1,895 more" (`s1/49.png`), "Within 2... No reference",
  "While ... ... No reference" (`s1/38.png`). The count survives (round 1's minor 10 is fixed),
  but "G.." and "7." say nothing, and a reader cannot tell which value the step reads.
- **Fix (app).** When the row cannot hold the value name and two listed names, drop the listed
  names first ("Label propagation: Comm... 1,898 groups"), then cut the value name, never to
  fewer than about 8 characters; the state word ("Run", "No reference") keeps its full width.

### 8. Names never find nodes on a graph file whose names are in a `name` column

- **Evidence.** Reference search "Person 0001" finds nothing: a bare "Nodes" heading with no rows
  and no count (`s1/31.png`). Round 1 found these nodes (by id). The table shows the same nodes
  as "Person 00017" (`s1/42.png`).
- **Cause.** The search now matches ids and `knownFields.nodeLabelPath` only
  (`graphty-element/src/session/data.ts:2141-2145`), which is null for this file; the owner has
  not yet decided whether `data.name` should read a `name` column
  (`owner-decisions.md`, 2026-11-01).
- **Fix.** Independent of that decision: let `matching.names` search the column the table shows as
  the node's name (or every string column, as before) without changing what `data.name` returns.
  On no match, show "Nodes 0".

### 9. A 5,000-value string column still gets only Contains (round 1, waiting for the owner)

- **Evidence.** `team` is listed as text with no value count (`s1/09.png`); picked, its test is
  Contains with a box (`s1/10.png`). Its suggestions show the first 10 values with no count
  (`s1/12.png`). `readableKindOf` (`graphty-element/src/session/styles/EncodingSpec.ts:865`)
  never calls a string column a category.
- **Fix.** The owner's choice in `owner-decisions.md` (2026-11-01). Nothing more to do here until
  then.

## Minor

### 10. The Degree histogram draws the tail as empty

- `s1/47.png`: degree 0 to 75 on 50,000 nodes; bars past about 12 are flat dashes, although
  2,500 nodes have degree 20 or more. Log bar heights when the element reports skew (deferred in
  round 1, still open).
