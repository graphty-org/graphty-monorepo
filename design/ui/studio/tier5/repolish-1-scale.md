# Re-polish 1: the selection editor on a large graph

Adversarial review of the rebuilt selection editor (build 7acb6c4c075c) on a generated graph of
50,000 nodes and 200,000 edges, with a `team` column of 5,000 string values (skewed sizes), a
`score` number, a `staff` flag and a 4-value edge `kind`. Driven with `real.mjs` in one session,
start to end; layout switched to Random so a running layout did not compete. Timings are the
tool's `ms.act` (how long the page took to take the input) from `route.jsonl`.

Walk folder (main checkout): `tmp/design-studio/tier5/repolish-1/scale/` -- `gen.py` (the
generator), `big-50k.graphml`, `dist/` (the frozen build), `s1/` (screenshots `NN.png`,
`route.jsonl`).

What held: the reference picker draws no node rows before typing ("Nodes 50,000", `s1/42.png`)
and 8 after ("Nodes 8 of 10", `s1/46.png`), each keystroke answered in about 100 ms; the category
checklist draws 8 rows, "Search 193", "8 of 112", "Check 112" / "Uncheck 112" and "104 more
checked" (`s1/34.png`, `s1/35.png`, `s1/38.png`); the step row summarizes "1, 10 and 110 more";
the table opens virtualized on Matches only with the Group column (`s1/48.png`); the text test's
suggestions stop at 8.

## Blockers

### 1. The preview takes over a minute to paint, and the canvas contradicts the key meanwhile

- **Evidence.** Selecting a step row on 50,000 nodes with the layout still (Random): the tool
  reports "a style repaint is still being applied in batches" for 30 s, and again for the next
  30 s (`s1/14.png`, `s1/15.png`: key "Which nodes 50,000", a quarter of the nodes still in the
  base blue); the repaint finished between 65 and 100 s. Every edit repeats it: after "Within 2
  hops of n17" the key reads 140 while about 12,000 nodes still draw in the group color 30 s later
  (`s1/47.png`); after a filter commit, `s1/53.png` to `s1/57.png`. Ending the preview (Escape)
  took over 3 minutes to restore the styling (`s1/09.png`, `s1/10.png` still part green; `s1/11.png`
  restored). While a repaint runs, the page answers input in 3 to 13 s (a hover 6,751 ms, a click
  12,862 ms; clicks past 3 s are reported as timeouts: `route.jsonl` steps 7, 8, 27, 35).
- **Why it blocks.** Spec 9 and acceptance 18: the preview starts and ends "in the same frame",
  and the key, table and canvas "always describe one selection". At 50,000 nodes the reader judges
  a selection from a picture that is a minute stale, with a frozen page.
- **Fix (graphty-element).** `UpdateManager.syncStyles` paints `NODE_PAINT_BATCH` (128) nodes per
  look at a 16 ms clock and each `applySessionPaint` costs far more than its share at this size.
  Draw the preview as a per-instance color/alpha attribute on the node and edge instance buffers
  (one typed-array write per member, one buffer upload per frame) instead of re-applying each
  node's session paint; members change, the materials do not. Until then, the key must say the
  canvas is still painting (an element `pending` fact the key reads), never show a finished count
  over an unfinished picture.

### 2. A live reference re-evaluates on every pointer move and stalls the page

- **Evidence.** Step "Keep, Within 2 hops of Hovered or selected" on 49,197 nodes: three canvas
  hovers took 5,949, 6,899 and 6,936 ms (`route.jsonl` steps 67 to 69, `s1/69.png`); the same three
  hovers with the reference set to a fixed node took 2,833, 2,818 and 2,832 ms (steps 74 to 76).
  No "Paused" state appeared.
- **Why it blocks.** Spec 6 and 7, acceptance 15: while the pointer moves, nothing above the live
  limit starts. The gate in `graphty-element/src/session/scope/stepRuns.ts` (`heldBack`) only holds
  `measure` steps with an `estimateMs`; a `hops` rule on a live reference has no estimate, so it is
  never held, and each move re-evaluates and repaints 50,000 nodes (blocker 1).
- **Fix (graphty-element).** Give rule evaluation the same gate: estimate a `hops` / `touching` /
  `same-value` step from the base's size and the hop limit, report `run-paused` while hovering
  above `liveMs`, and evaluate once on pointer rest. The app already words `Paused`.

### 3. A filter-card edit freezes the page for most of a minute

- **Evidence.** Import filter card "Keep Degree": typing "20" and Enter in Min took 26,289 ms to
  return (`route.jsonl` step 55); changing it to "2" and Enter took 18,275 ms, then the screenshot
  5,203 ms, then the next hover 32,426 ms (steps 59, 60; `s1/60.png`). One commit costs about
  55 s of an unresponsive page.
- **Why it blocks.** The lens: every count and preview stays responsive; "each change re-counts in
  under 50 ms for degree" (acceptance 37). Here the count is right (49,197) but nothing else on the
  page can be used for a minute after each edit.
- **Fix.** Profile the commit (likely the filter's hide of about 47,000 nodes and the style
  re-evaluation it triggers, plus blocker 1's repaint). In graphty-element, apply a filter's
  visibility as the same instance-attribute write as blocker 1 rather than per-node mesh changes,
  and slice the re-evaluation. In the app, `StepPane` calls `stepCard` (both sides'
  `readableValues` and a `scope.histogram` per structure value) and `pickerFields` on every render
  with no `useMemo` (`StepPane.tsx:279`, `:368`); memoize them on the rule and the data tick.

## Major

### 4. A 5,000-value string column has no checklist: only "Contains"

- **Evidence.** `team` (5,000 values over 50,000 nodes) is listed with the text glyph and no value
  summary (`s1/06.png`); picked, its test is "Contains" with a text box (`s1/08.png`). No count, no
  "Search 5,000", no "Check N". The element calls every string column `text`
  (`readableKindOf`, `graphty-element/src/session/styles/EncodingSpec.ts:865`) and stops counting
  distinct values past `ATTRIBUTE_UNIQUE_CAP` = 256 (`session/types.ts:4290`), so `tests` never
  holds `categories` for it.
- **Why.** Spec 4.3 and 5: a category gets a searchable counted checklist with "Search 5,000".
  Teams, cities, departments and countries are exactly the large string categories a 50,000-node
  graph has; "Contains T0001" also matches T00010 to T00019 in a 5-digit scheme.
- **Fix (graphty-element).** Classify by repetition, not by a fixed cap: a string column whose
  values repeat (distinct count at most half the records, the rule `readsAsValues` already uses
  for numbers) is a category; count its values on demand (`data.valueCounts`) when the picker
  asks, so the 256 cap stays a describe-time cost limit only. Add `categories` to its `tests`.

### 5. Past the 10th community, values are named two ways, and "Group 10" is not "10"

- **Evidence.** Louvain gave 193 communities. The checklist searched for "1" lists "Group 1" (941),
  "Group 10" (836), "10" (835), "15", "1" (753), "14", "11", "19" (`s1/34.png`): "Group 10" and
  "10" are different communities, as are "Group 1" and "1". The step row reads "1, 10 and 110 more"
  (raw ids) while the checklist ticks "Group 1" and "Group 10". The table names every community by
  rank, "Group 30", "Group 59" (`s1/48.png`), so a reader's "Group 30" in the table is not
  findable in the checklist. Cause: the app's `valueName` (`graphty/src/workspace/style/words.ts:736`)
  names a value by `summary().groups`, which the element caps at `SUMMARY_GROUP_LIMIT` = 10
  (`RunResult.ts:75`); past it, the raw id.
- **Fix (graphty-element, then app).** Expose every group's rank by id (the element already has
  `partitionGroupRanks`, used by the table) as a public fact, for example
  `results.groupRank(runId, value)` or a ranks map; `valueName` reads it for every value and the
  step row's summary uses the same names. Search matches the shown name ("Group 1x"), not the id.

### 6. A long run starts unasked and shows "No test" while it computes

- **Evidence.** Picking "Louvain: Community" (no run yet) on 50,000 / 200,000 started Louvain at
  once: no "Run (about X)", no Computing word, no Cancel. The row and its name read "No test" and
  the tooltip "No test yet: this step changes nothing" while it ran (`s1/31.png`, `s1/32.png`); the
  page drew 26 frames in 30 s and the Enter took 12,594 ms. The picker entry had no clock or
  estimate (`s1/29.png`).
- **Why.** Spec 6: above the ask limit (the app sets 1 s) the step waits for a press; under it, a
  Computing chip and Cancel. `heldBack` skips the gate whenever `estimateMs` is undefined.
- **Fix.** graphty-element: give Louvain (and every catalog algorithm) a cost estimate, and treat
  an unknown estimate on a graph above a size threshold as "ask", not "go". App: a `measure` step
  whose reading is `computing` reads "Computing", never "No test".

### 7. The number test has no histogram

- **Evidence.** Degree in the filter card (0 to 75, heavily skewed) shows a "Between" select, a
  two-thumb slider and two boxes, no bars (`s1/53.png`); the same in the style layer. No
  `HistogramRow` is used anywhere under `graphty/src/workspace/selection/` or in the number card.
- **Why.** Spec 4.3: "the histogram binned to 32 bars, log height when skewed, read from the
  element's binned facts". On 50,000 nodes a bare 0-75 slider gives no idea where the nodes are.
- **Fix (app).** Draw compact-mantine's `HistogramRow` with its `brush` over the boxes, bins from
  `session.scope.histogram(path, { within })`, log height when the element reports skew.

### 8. A node found by name is shown and chosen by its id

- **Evidence.** Typing "Person 0001" in the reference search finds the right nodes but lists them
  as "n17", "n13", "n14" ... (`s1/46.png`); the chosen token and the row read "n17" (`s1/47.png`).
  Among 50,000 nodes the reader cannot tell which "n" is the person typed. The graph's names are
  in its `name` column; `session.data.name(id)` returns nothing for them (`references.ts`).
- **Fix (graphty-element).** `data.name` falls back to the column the element reads as the label
  (a `name` / `label` column, as the table's name column), so the picker, the token and the row
  show "Person 00017". The app changes nothing.

## Minor

### 9. Counts lose their thousands separators outside the editor

- `s1/53.png`: filter bar "50000 of 50000 nodes", later "49197 of 50000 nodes, 199305 of 200000
  edges" (`s1/60.png`); layer tree "Everything 50000", "Layer 1 50000" (`s1/05.png`); the tree item
  name "Which nodes, 50000 of 50000 nodes". The editor itself writes "50,000 of 50,000". Fix: run
  those through `formatNumber` (`inspector/words`).

### 10. The row summary's count truncates away

- The step row shows "1, 10 and..." (`s1/35.png`): at 240 px the tail that holds "110 more" is
  what is cut. Fix: truncate the listed values, never the count: "1, 10... +110", or drop listed
  values before the count when the column is short.

### 11. "0 of 81" under a full checklist

- With 112 values checked and the search cleared, the list draws 8 checked rows, "104 more
  checked" and "0 of 81" (`s1/38.png`): the 81 unchecked are unreachable without searching and
  "0 of 81" reads as nothing. Fix: keep at least 2 rows for the largest unchecked when any remain
  (6 checked + 2 unchecked), so the footer reads "2 of 81".
