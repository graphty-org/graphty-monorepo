# Grade: session r2-s06 -- Elena, back after a month, finds the shortest hike by kilometers (trails.csv)

**Grade: S** (success). The route and the total are right: Trailhead, Creek, Meadow, Ridge,
Summit, 7.5 km. She took the load-time route: on the import page she gave the km column the
Weight role and chose "Farther" before Load. The graph's Overview then read "Loaded weight km
(farther)" (`10.png`), the Shortest path form's Weight started on "km (farther, loaded)" untouched
(step 13), and the last screen's Made with reads Weight "km (farther)". She pointed to all three,
and the answer key accepts any of them. No detour and no wrong turn.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named at the top of the criteria. The session is not void. Two tool
events, neither a participant action and neither changing the screen she saw:

- Step 04: the driver's `--click "km"` matched two things (the km column header and the "Role of
  km" box), so the tool clicked nothing; the screen did not change. The next step named the box.
- Step 18: the tool printed `Could not click "Find path": elementHandle.click: Timeout 3000ms
  exceeded`, yet the click took effect. Mechanism: the click closed the popover and replaced it
  with the run's result while Playwright was still waiting for the click action to settle on the
  now-detached button. `18.png` shows the finished run.

## What the last screen shows (`18.png`)

- The run's Values, Summary: "Path 5 nodes, 4 edges", "Total km 7.5".
- Nodes in order: Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5. This is the answer key's
  route B.
- Made with: Analysis Shortest path, Ran Oct 9, 7:38:06 PM, From Trailhead, To Summit, Weight
  "km (farther)"; Advanced run settings closed. No Follow row, because she loaded the graph
  undirected (below).
- The Graph tree lists Selection, Shortest path (4 hops), Everything. The canvas key reads
  "Shortest path / On the path" and the route is drawn black and thicker.
- `work.json` ends with one run (`shortest_path`), its two style layers, the default layers and
  the source trails.csv; nothing gone.

## Measures

- **Steps:** 17 after the start (`02.png` to `18.png`); 16 without the tool's no-op at step 04.
  The answer key's round 2 route is 10 steps. The extra ones: opening the Analyze list and typing
  "shortest" instead of the `p` shortcut (2), typing each node name before picking it (2), and
  opening Direction and choosing Undirected (2).
- **Wrong turns: 0.** Setting Direction to Undirected (`08.png`, `09.png`) was a deliberate choice
  she gave a reason for ("A trail isn't one-way"). It is not on the success path, but it is not a
  detour: on B the answer key says the route and the total are the same with the graph undirected,
  and the Overview recorded it as "Undirected, set in the project" (`10.png`).
- **False "done": none.** Her claims match the screen: the route and "Total km 7.5" (`18.png`),
  "Loaded weight: km (farther)" (`10.png`), "km (farther, loaded)" in the form (step 13), and Made
  with's "Weight: km (farther)". Her hand check (1.5 + 2 + 2.5 + 1.5 = 7.5 against Pine Fork routes
  of 8 and 9) agrees with the file as the preview shows it (`09.png`, lines 2 to 7 and 10).
  truth-on-screen: no wrong claim.
- **Wrong answers avoided:** never ran with no weight (`weight-not-read`), never chose Closer,
  "Date or time" or Capacity, and did not read "4 hops" as the total (`read-wrong`).
- **Wording echo:** she did not quote the "Farther" helper line ("a longer distance or travel
  time"); she chose Farther from the button label, before the line appeared, in her own words
  ("More kilometers is a longer walk").
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). None blocked the task.

1. **Severity 2 -- the role name "Weight" is not a word a user reaches for to say "this column is
   a length".** She found it only because the summary line above the table read "Weight: none
   (each edge counts 1)" and the list offered the same word. Without that line, she said, she
   would have loaded and found out later. Evidence: `03.png`, `05.png`, steps 03 and 05 remarks,
   debrief.
2. **Severity 2 -- the "Higher means" choices are not explained until one is chosen.** Farther was
   obvious for trails, but she could not tell what "Capacity" means, and "Closer" read as the
   opposite of what she wanted; the explanation under the row describes only the chosen option.
   A user with a less obvious column has nothing to choose by. Evidence: `06.png`, `07.png`,
   debrief.
3. **Severity 2 -- no node names are drawn on the canvas.** She could not tell which dot was the
   Trailhead until the run listed the route on the right; the answer key notes Summit and Creek
   sit almost on top of each other. The route was read from Nodes in order, not from the drawing.
   Evidence: `10.png`, `18.png`, step 10 remark, debrief.
4. **Severity 1 -- "4 hops" in the Graph tree against "4 edges" in the Summary**: two words for
   the same count, side by side. Evidence: `18.png`, step 18 remark, debrief.
5. **Severity 1 -- Direction sits alone at the bottom of the import page, far from the column
   roles, with nothing saying what "As the file says" will do.** She opened it only out of
   curiosity and could not tell whether leaving it would have changed the answer. Evidence:
   `07.png`, `08.png`, debrief.
6. **Severity 1 (grader-observed; not noticed by the participant) -- the preview caption reads
   "All 13 rows" while line 14 is cut off at the bottom of the pane** once Higher means pushes
   the table down. The answer key lists this. Evidence: `09.png`.

What worked: the "Weight: none (each edge counts 1)" summary line is what sent her to the km
column's role, and the load-time weight was then visible at every later point she looked (the
Overview's "Loaded weight", the form's "(farther, loaded)", Made with's Weight row, and the total's
label "Total km"). The Analyze filter matched "shortest" on the first try.

## Implementation issues

No build defect showed in this session: every control did what the answer key says, and no time
was spent on a broken control. The two oddities above (the ambiguous name at step 04 and the
reported timeout at step 18) are in the study tool, not the app.
