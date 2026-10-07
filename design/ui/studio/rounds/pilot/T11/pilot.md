# Pilot: T11, untangle the drawing

The pilot walked the task "try a different way of arranging the dots so the clusters of characters
are easier to tell apart, and tell us whether it helped" on the real graphty app, using the
production build of graphty 0.8.53 (commit a1e6b91f, build 0196d46212aa), starting from an empty
app, with the study tool `tool/real.mjs`. The screenshots are in this folder. No script errors,
console errors or failed requests were printed at any step.

## Verdict

The graded end state is reached: a different layout method was applied and node positions changed
visibly between screenshots (03.png to 06.png, and again to 09.png). The success path in the answer
key works as written, in 3 steps.

But the question the prompt asks -- does a different arrangement make the clusters easier to tell
apart -- has no "yes" answer in this build. The two methods a participant is most likely to try
next both make the drawing worse than the default, and one of them is broken. Expect every
participant to answer "no, it got worse". The task still tests finding and using the Layout
control; it cannot test whether an alternative layout helps.

## Steps

| Step | Command | Screenshot | What it shows |
| ---- | ------- | ---------- | ------------- |
| 1 | `--start ... empty` | 01.png | Start screen; Les Miserables listed under Samples with "77 characters" |
| 2 | `--click "No thanks"` | 02.png | Usage-data notice dismissed |
| 3 | `--click "Les Miserables"` | 03.png | The default "Force - Recommended" drawing: 77 nodes, 254 edges, visible groups (a tight top-left group, a fan of leaves at the bottom, a right-side group) |
| 4 | `--click "Layout"` | 04.png | The Layout popover above the bottom toolbar: Method "Force - Recommended", Seed 1 |
| 5 | `--click "Method"` | 05.png | Method list: Force - Recommended, Force flat, Circle, Grid, Spiral, Spectral, No crossings, Random, Keep positions |
| 6 | `--click "Spectral"` | 06.png | Drawing collapses to a diagonal line: one node top right, the other 76 piled in the bottom-left corner, partly clipped at the canvas edge |
| 7-8 | reopen Method (`--click-at 708,820`) | 07.png, 08.png | List reopened |
| 9 | `--click "Force, flat"` | 09.png | A uniform disk of nodes with long crossing edges; no groups visible |
| 10 | `--wait 10000` | 10.png | Identical to 09.png: this is the settled result, not a start frame |
| 11 | `--key Escape --hover "Layout"` | 11.png | The Layout button's tooltip reads "Layout" |

## Blockers and findings

### 1. Spectral layout collapses the graph onto a line (graphty-element defect, in the layout package it uses)

- Evidence: step 6, 06.png. All nodes lie on the diagonal x = y; one node is far top right and the
  rest are a clump in the bottom-left corner, some cut off by the canvas edge.
- Cause, from the source: graphty-element's Spectral method calls `spectral` from `@graphty/layout`
  (`layout/src/indexed/spectral.ts`). That function runs plain power iteration on the graph
  Laplacian, which converges to the eigenvectors with the LARGEST eigenvalues (dominated by the
  highest-degree node) instead of the smallest non-trivial ones a spectral layout needs. It also
  orthogonalizes the second start vector against the first only once, before iterating, so both
  coordinates converge to the same dominant eigenvector -- hence x equals y and the drawing is a
  line.
- Effect on the study: any participant who picks Spectral sees the graph destroyed and may think
  they broke it.

### 2. "Force, flat" gives a uniform disk with no clusters (graphty-element defect)

- Evidence: steps 9 and 10, 09.png and 10.png (the same picture 10 seconds apart).
- Cause, from the source: graphty-element's catalog entry for `force-2d`
  (`graphty-element/src/catalog/layouts.ts`) describes it as "the same pull and push as Spread Out,
  worked out on a single plane", but it runs the ARF engine (`ArfLayoutEngine.ts`, `arf` in
  `layout/src/indexed/arf.ts`). ARF attracts every pair of nodes almost equally (1.0 for
  non-neighbors, 1.1 for neighbors), so it spreads nodes evenly regardless of who is tied to whom.
  The description is wrong, and the method cannot show clusters.
- Minor: the Seed field shows 0 here while the default Force method shows 1 (04.png); the ARF
  options schema declares the seed as positive or null, so 0 is not a value it accepts as a seed.

### 3. No offered method separates clusters better than the default (task wording / design gap)

- The prompt asks for an arrangement that makes clusters "easier to tell apart". The method list
  (05.png) offers nothing aimed at that (no "group by community" arrangement); Circle, Grid,
  Spiral and Random ignore structure by design. The default is already the best on offer.
- This does not block grading -- the answer key grades only "a different method applied and
  positions changed", and records "helped" as opinion. It should be read that way: a "no, it did
  not help" answer is the correct observation for this build, not a participant failure.
  Consider either softening the prompt ("try a different way of arranging the dots and tell us
  what you think of it") or noting in the answer key that "it did not help" is expected.

### 4. The Layout control has no visible label (app, discoverability, not a blocker)

- The answer key's `--click "Layout"` works by accessible name, but on screen it is an unlabeled
  four-arrow icon in the bottom toolbar (03.png). Its tooltip says "Layout" on hover (11.png). A
  first-time participant has to hover the icons to find it; record time-to-find.

### 5. Drawings run under the floating toolbar and popover (app, minor)

- In 09.png to 11.png nodes sit behind the Layout popover and the bottom toolbar (around y 780-870);
  in 06.png the clump is cut by the bottom-left canvas edge. The fit to view does not leave room for
  the floating controls.

### 6. Overview panel text (app, minor, not on this task's path)

- 03.png, Values > Overview: the row reads "Undirected, from the file: directed 0" (a truncated or
  garbled sentence) and "Edges per ..." is truncated. Edges also draw small arrowheads although the
  panel says the graph is undirected.

## Study-tool notes

- `--click "Method"` printed `ambiguous: "Method" matches 2 controls (combobox "Force -
  Recommended", label "Method"); took the first` and worked.
- After a change the combobox is named by its current value only through the label; neither
  `--click "role=combobox:Spectral"` nor `--click "Spectral"` reopened it (step 7 printed `nothing on
  screen is called "Spectral"`). `--click "Method"` or `--click-at` does. Not a defect, but worth a
  line in the README for graders replaying participant steps.
- No tool defects found.
