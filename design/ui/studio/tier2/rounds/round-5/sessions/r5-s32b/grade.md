# Grade: session r5-s32b (task T20, half B, Dana, regular analyst)

Task: bring the hiking club's trails.csv in so that every calculation treats more kilometers as a
longer walk, find the shortest walk from the Trailhead to the Summit (junctions in order and the
total), and show where the program says it used the kilometers. Build 8c015b806086
(graphty@0.8.65), the frozen round 5 build; `session.json` records it, with no uncommitted changes.

**Grade: S** -- right route, right total, weight set at load, and the participant pointed to the
right places.

## Why

- **Route and total.** The last screenshot (`16.png`) shows the Shortest path run open in the
  right-hand inspector: Summary "Path 5 nodes, 4 edges", "Total km 7.5"; Nodes in order
  Trailhead 1, Creek 2, Meadow 3, Ridge 4, Summit 5; Made with From "Trailhead", To "Summit",
  Follow "All", Weight "km (farther)". That is the answer key's route and total exactly. The
  route is drawn black and thicker with the "Shortest path" key at the top left, and the left
  tree reads "Shortest path km 7.5".
- **Set at load, so every calculation uses it.** On the import page the km column was given the
  Weight role and "Higher means" set to Farther before Load (`07.png`: "Weight: km (farther)" and
  "A higher weight means farther apart, such as a longer distance or travel time; a path takes
  the smallest total."). After Load the graph's Overview reads "Loaded weight km (farther)"
  (`08.png`), and the Shortest path form's Weight opened already set to "km (farther, loaded)"
  (`11.png` to `15.png`). This is the load-time route, not a per-run weight.
- **Where the program says so.** The debrief names "Loaded weight: km (farther)", the form's
  "km (farther, loaded)", and the result's "Total km 7.5" with Made with "Weight: km (farther)".
  Each is on screen as quoted; any one meets the answer key.
- **Route taken.** The round 2 route ("Open project or file..." with the file chosen), then
  the Analyze button, a filter of "shortest" and the Shortest path entry instead of the `p` key.
  That entry costs two more steps than the key but is a direct way to the same form, not a
  detour. Steps through Find path: 13 (counting each type-then-pick of From and To as one, and
  the one refused click), against 10 for the walked route -- well inside 2x.
- `work.json` shows one run (shortest path), its two style layers, the source trails.csv and
  nothing gone. `leaks.json` lists no leaks.

## Counts

- False "done" claims: 0. The final answer, its arithmetic (1.5 + 2 + 2.5 + 1.5 = 7.5), the
  alternatives she ruled out (via Pine Fork 8, Pine Fork to Summit 9) and every quote match the
  file preview (`07.png`) and the result (`16.png`). She did not name Pine Fork as part of the
  walk, although the thick route edge passes behind the large Pine Fork node (`16.png`, about
  633,517).
- Wrong turns: 1, minor -- step 3 clicked "km", which matched both the column label and the role
  box; the tool refused it as ambiguous and nothing changed (`04.png` is the same as `03.png`).
  She reached the role box on the next step.

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 2 | A numeric column named "km" comes in as "Attribute" with only a small line "Weight: none (each edge counts 1)". She said that without being told to look, she would have pressed Load straight away, as she always does, and every path would have counted stops, not kilometers (on this file Trailhead, Pine Fork, Summit, 9 km). Same finding as other T20 B sessions this round. | `03.png`; debrief, first "What confused me" bullet |
| 2 | No junction names on the drawing, and two route nodes (Creek and Summit) overlap at the bottom of the canvas, so the route cannot be read from the picture; she read it from Nodes in order. | `16.png` (two black nodes at about 755,645 and 790,636); debrief, third bullet |
| 1 | "Weight" as a column role is a word she had to guess at; she chose it only because nothing else sounded like "this number matters". | `05.png`; transcript step 4; debrief, second bullet |
| 1 | Direction "As the file says" became "Directed" for a trails file, and she could not tell whether the both-ways answer depended on Follow defaulting to "All". The route is the same either way on this file, so no wrong answer resulted. | `07.png`, `08.png`, `15.png`; debrief, fourth bullet |
| 1 | The right panel's labels are small and gray; she said she would lean in on a laptop. Opinion only, held one level down. | `16.png`; debrief, last bullet |
| 1 | The preview caption reads "All 13 rows" while line 14 is cut off at the bottom of the pane once "Higher means" pushes the table down (a scrollbar is drawn). She did not notice it. | `07.png` |
| 1 | The Shortest path form opens over the lower part of the drawing, where both ends of the route sit, so picking From and To hides them. She did not remark on it. | `11.png` to `15.png` |

## Notes for the report

The participant is simulated: a pass is weak evidence until real people confirm it. As a
returning user she was briefed on the Open button and the Analyze button and used both; she was
not briefed on the import page's role boxes, and found the weight question only because the task
told her to look for it. Her ease rating (6 of 7) played no part in this grade.
