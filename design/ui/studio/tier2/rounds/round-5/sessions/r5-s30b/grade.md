# Grade: session r5-s30b (task T20, half B, Grace, tier 1 graduate)

Task: bring the hiking club's trails.csv in so that every calculation treats more kilometers as a
longer walk, find the shortest walk from the Trailhead to the Summit (junctions in order and the
total), and show where the program says it used the kilometers. Build 8c015b806086
(graphty@0.8.65), the frozen round 5 build; `session.json` records it, with no uncommitted changes.

**Grade: S** -- right route, right total, set at load, and the participant pointed to the right
places.

## Why

- **Route and total.** The last screenshot (`17.png`) shows the Shortest path run open in the
  right-hand inspector: Summary "Path 5 nodes, 4 edges", "Total km 7.5"; Nodes in order Trailhead
  1, Creek 2, Meadow 3, Ridge 4, Summit 5. That is the answer key's route and total exactly. The
  route is also drawn black and thicker on the canvas, with the "Shortest path" key at the top
  left, and the left tree reads "Shortest path km 7.5".
- **Set at load, so every calculation uses it.** On the import page the km column was given the
  Weight role and "Higher means" set to Farther before Load (`07.png`: "Weight: km (farther)",
  "A higher weight means farther apart, such as a longer distance or travel time; a path takes
  the smallest total."). After Load the graph's Overview reads "Loaded weight km (farther)"
  (`10.png`), and the Path form's Weight box opened already filled "km (farther, loaded)"
  (`13.png`). This is the load-time route, not the per-run route.
- **Where the program says so.** The participant named "Loaded weight km (farther)", the Path
  form's "km (farther, loaded)", and Made with's "Weight km (farther)" (`17.png`). Any one of
  these meets the answer key; she gave all three, and each is on screen as quoted.
- **Direction.** She set Direction to Undirected (`09.png`; Overview "Undirected, set in the
  project", `10.png`) instead of leaving "As the file says". The answer key says the route and
  total are the same with the graph undirected, so this changes nothing.
- **No detour.** Her one unproductive step (step 3, a click on "km" that matched two elements) changed nothing
  on screen (`04.png` is identical to `03.png`); she reached the role box on the next step. That
  is not a detour through another route, so it does not lower the grade to SD.
- `work.json` shows one run (shortest path), its two style layers, the source trails.csv and
  nothing gone. `leaks.json` lists no leaks.

## Counts

- False "done" claims: 0. Her final answer, its arithmetic (1.5 + 2 + 2.5 + 1.5 = 7.5) and every
  quote she gives match the screenshots.
- Wrong turns: 1, minor -- step 3 aimed at the "km" column header instead of its role box; the
  click was refused as ambiguous and nothing changed.

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 2 | A numeric column named "km" comes in as "Attribute" with "Weight: none (each edge counts 1)". A reader who presses Load without reading that line gets every path counted in trails, not kilometers (on this file, Trailhead, Pine Fork, Summit, 9 km). She caught it only because she was looking for it. | `03.png`; transcript "In my own words", first bullet |
| 2 | No junction names on the drawing, and Creek and Summit sit almost on top of each other at the bottom of the canvas, so the black route cannot be read from the picture; she read it from Nodes in order. She would want names on for a club handout. | `17.png` (two black nodes overlapping at about 755,645 and 790,636); transcript, last bullet |
| 1 | "Higher means: Not set / Closer / Farther / Capacity" made her stop to think; "Capacity" meant nothing to her. The helper sentence under Farther settled it. | `06.png`, `07.png`; transcript step 6 and "In my own words" |
| 1 | The Direction list offers "As the file says" for a CSV, which says nothing about direction; she could not tell what it would do and chose Undirected. | `08.png`; transcript step 7 |
| 1 | The preview caption reads "All 13 rows" while line 14 is cut off at the bottom of the pane once "Higher means" pushes the table down (a scrollbar is drawn). She did not notice it. | `07.png` |
| 1 | The Path form opens over the lower part of the drawing, where both ends of the route sit, so picking From and To hides them. She did not remark on it. | `13.png` to `16.png` |

## Notes for the report

The participant is simulated: a pass is weak evidence until real people confirm it. Her ease rating (6 of 7) played no part in
this grade.
