# Workspace polish 1: the selection workspace on a large graph

Adversarial review of the selection workspace (the read-only sidebar outline plus the one
non-modal workspace, spec 3.0) at build 6a37a22344aa, on the generated graph used by both repolish
rounds: 50,000 nodes, 200,000 edges, a `team` string column of 5,000 values, `score`, `staff` and
an edge `kind`. Label propagation on it gives 10,786 communities, so the 5,000-value category was
exercised as a 10,786-value one. Driven with `real.mjs` in one session at 1440 x 900, layout
switched to Random. "Input delay" is the tool's `ms.act` in `route.jsonl` (how long the page took
to take the input).

Walk folder (main checkout): `tmp/design-studio/tier5/ws-polish-1/scale/` -- `gen.py`,
`big-50k.graphml`, `dist/` (the frozen build), `s1/` (screenshots `NN.png`, `route.jsonl`).

Verified working at this size: the reference picker lists no node before typing ("Nodes 50,000",
`s1/32.png`) and at most 8 after; an exact id is listed first ("n1" above n1005, n181,
`s1/34.png`) and Enter takes it (`s1/35.png`); a name column is searched ("Person 0001" finds
"Nodes 8 of 10", `s1/33.png`); the community checklist reads "Search 10,786", 8 rows, "8 of
10,786" (`s1/21.png`), its search answers 7 keystrokes in 2.2 s (`s1/24.png`), "Check 1,898" ticks
every match (`s1/28.png`) and its counts agree after a filter (324 checked + 400 unchecked = "Search
724", `s1/62.png`); a hops step on Hovered or selected no longer re-evaluates per hover (canvas
settles in 0.7 s per hover, `route.jsonl` steps 40-44); the matches strip sorts 12,162 rows in
1.2 s (`s1/47.png`); the workspace opens on a filter card at once (`s1/54.png`).

## Blockers

### 1. Every edit repaints the preview for 30 to 90 s, and the key reads the new count meanwhile (repolish 1 and 2, not fixed)

- **Evidence.** Every step change on 50,000 nodes left "a style repaint is still being applied in
  batches" after the tool's 30 s wait, and most needed a further 40 s wait before the next step
  could be read. `s1/15.png`: key "Which nodes 1,703 / No match 48,297" while most of the canvas
  is still in the group color, 33 s after the change. Repaints that change nothing still run in
  full: opening the workspace on an all-nodes layer (Edit took 9,655 ms of input delay and its
  click timed out, `s1/08.png`), adding a condition with no test (50,000 to 50,000, `s1/11.png`),
  opening an empty New filter (`s1/54.png`), and Done (`s1/49.png`, `s1/60.png`). While a repaint
  runs, input lands 4 to 8 s late: a checklist tick 5,601 ms (`s1/25.png`), a no-op "Within 2 hops
  of" step 7,827 ms (`s1/31.png`), the Degree option 6,728 ms (`s1/56.png`).
- **Cause.** `graphty-element/src/managers/UpdateManager.ts:275,1031`: the preview paints
  `NODE_PAINT_BATCH` = 128 nodes per frame, so 50,000 nodes take 390 frames; at the 6 to 7 frames a
  second the page draws under this load (162 to 228 frames in 30 s, `route.jsonl`) that is about
  60 s.
- **Fix (graphty-element).** Write the preview as a per-instance color/alpha write on the node and
  edge instance buffers (one typed-array write per member, one upload per frame) instead of a
  per-node paint in 128-node slices. Skip the repaint when the member set did not change (a step
  with no test, a new filter that keeps everything, Done with nothing changed). Until then expose a
  `pending` fact the key and the header count read, so they never show a finished count over an
  unfinished canvas.

### 2. A filter edit freezes the page for 25 s (repolish 1 and 2, not fixed)

- **Evidence.** Filter card, Degree, typing "20" and Enter: 25,500 ms before the page took the next
  input (`route.jsonl`, `s1/57.png`), then blocker 1's repaint (`s1/58.png`). Counts are right
  (2,500 of 50,000 nodes, 5,214 of 200,000 edges).
- **Fix (graphty-element).** Apply filter visibility as the same instance-attribute write, and slice
  the re-evaluation it triggers (every style layer's steps, and every step-local run that reads the
  visible graph, major 4).

## Major

### 3. "Run (about 8 seconds)" takes 70 to 120 s and freezes the page (repolish 2, not fixed)

- **Evidence.** Label propagation: Community on 50,000 / 200,000 offers "Run (about 8 seconds)"
  (`s1/18.png`). The click took 16,878 ms of input delay; 28 frames were drawn in the next 30 s while
  "Computing" and Cancel showed (`s1/20.png`, still computing 71 s after the click); the values were
  there at the next screenshot, 120 s after the click (`s1/21.png`). Cancel is drawn but the page
  cannot take its click for most of that time.
- **Fix (graphty-element).** Calibrate the estimate (time the first iteration and scale it to the
  base size), and run step-local algorithms in the element's Worker as Girvan-Newman already does
  (spec 4.3), so Cancel and the pointer stay live.

### 4. A filter re-runs a community step and changes what it selects (repolish 2, not fixed)

- **Evidence.** Layer 1's step "Label propagation: Community", 1,898 groups checked, read "Group 1,
  Group 10 and 1,896 more, 12,162 of 50,000" (`s1/51.png` tooltip). After the filter "Degree min 20"
  the same step reads "725, 731 and 1,896 more, 1,129 of 2,500 nodes" in its accessible name and
  "Lab... 7. and 1,896 more" on screen (`s1/61.png`); its checklist now reads "Search 724" with Group
  1, 2, 3, 5, 6 and 11 checked and Group 4 and 7 not (`s1/62.png`). The reader never chose these
  groups; the old run's ids now mean other communities of a new run over 2,500 nodes, and the row
  names its values three ways (raw ids, "7.", re-ranked names).
- **Fix (graphty-element).** As repolish 2: keep the partition a step was chosen on until the reader
  re-runs it (report `stale`), or store the checked groups by member set and re-map them, reporting
  `stale` when an id no longer exists. App: name the row's values with the checklist's `valueName`.

### 5. Step rows cut the value and the listed names to one or two letters (repolish 2, not fixed)

- **Evidence.** Workspace outline, 280 px: "Label prop... Grou... and 1,896 more" (`s1/28.png`).
  Sidebar outline: "La... G.. and 1,896 more" (`s1/28.png`), "Lab... 7. and 1,896 more"
  (`s1/61.png`), "Within 2 hops of Pau..." (`s1/41.png`). "G.." and "7." name nothing.
- **Fix (app).** When the row cannot hold the value name and two listed names, drop the listed names
  first ("Label propagation: Comm... 1,898 groups"), then cut the value name, never below about 8
  characters; the state word keeps its full width.

## Minor

### 6. The workspace never says a live step is Paused, and its count and table read empty meanwhile

- **Evidence.** "Within 2 hops of Hovered or selected", pointer on node n43 (`s1/41.png`): only the
  sidebar's cut row says "Pau..."; the workspace outline row reads "Keep Within 2 hops of Hovered or
  selected" with no state, its pane shows no state, the header reads "0 of 50,000", the key "Which
  nodes 0" and the strip "No rows". The reader is looking at the workspace and sees an empty result,
  not a held one.
- **Fix (app).** Draw the step's state word ("Paused", `words.ts:58`) at the end of the workspace
  outline row as the sidebar does, and in the pane's first row; while any step is `run-paused`, show
  the header count and the key count as the last computed values with the state, not as 0.

### 7. A node found by its name is listed and chosen by its id

- **Evidence.** "Person 0001" lists n17, n13, n14, ... with no name (`s1/33.png`); a chosen node
  shows "n1" in the field and the row (`s1/35.png`). Spec 4.3 says the chosen node shows as "a node's
  name". On a graph whose ids are opaque the reader cannot tell which row is the person typed.
- **Fix.** List and show the node by the name the table shows (the matched name column), with the id
  as secondary text when they differ.

### 8. The outline column grows with a row's words, moving and narrowing the preview

- **Evidence.** Ticking one checklist value widens the workspace outline from 240 to 280 px
  (`s1/24.png` to `s1/25.png`): the key and the strip move 40 px right, and the preview narrows to
  543 px, under the spec's 560 px at 1440 x 900 (3.0, "Per surface"). Long summaries are the normal
  case on a large category.
- **Fix (app).** Size the outline column once on open (or only grow it when the row's fixed words,
  not its value list, need it); a long value list truncates per finding 5 instead of widening the
  column.

### 9. The Degree histogram draws its tail as empty (repolish 1 and 2, not fixed)

- `s1/56.png`: degree 0 to 75; bars past about 12 are flat dashes although 2,500 nodes have degree 20
  or more. Spec 4.3 asks for log heights when skewed.

### 10. A 5,000-value string column still gets only Contains (waiting for the owner)

- `team` is listed as text with no value count (`s1/10.png`), and its test is Contains with 10
  suggestions and no count (`s1/13.png`). The owner's choice in `owner-decisions.md` (2026-11-01);
  nothing more to do here until then.
