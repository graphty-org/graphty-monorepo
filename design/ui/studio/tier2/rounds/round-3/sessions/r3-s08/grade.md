# Grade: session r3-s08 -- Dana (regular analyst, returning), hiking trails (T20 B), a number that means "farther"

**Grade: S** (success). The last screen (`18.png`) shows the right route and total: Summary "Path
5 nodes, 4 edges", "Total km 7.5"; Nodes in order Trailhead 1, Creek 2, Meadow 3, Ridge 4,
Summit 5; Made with Analysis "Shortest path", From "Trailhead", To "Summit", Weight "km
(farther)". The left panel's run row reads "Shortest path km 7.5", and the route is drawn black
and thicker with a "Shortest path" key at the top left. Dana took the load-time route: she gave
the km column the Weight role and chose Farther on the import page before Load (`07.png`), and
the Overview after loading read "Loaded weight km (farther)" (`10.png`), so every later
calculation reads the km as a length, as the task asks. She pointed to Made with's Weight row, to
"Total km 7.5", to Loaded weight and to the Path form's "km (farther, loaded)" before the run
(`13.png`), all of which the answer key accepts. No detour.

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: empty, no setup. Tool commit `acf3894e2c56`, no uncommitted
changes.

## The answer against the key

- **Route and total (right).** `18.png`, as above. Dana checked the sum against the import table
  (1.5 + 2 + 2.5 + 1.5 = 7.5); those four rows are lines 4 to 7 in `09.png`.
- **Meaning set at load (right).** `07.png` and `09.png`: role box "Weight", Higher means
  "Farther", summary "Weight: km (farther)". `10.png`: Overview "Loaded weight km (farther)".
  `work.json` agrees: one run, `shortest_path`, one source `trails.csv`, no steps, nothing gone.
- **Not a wrong answer.** Not `weight-not-read` (not Trailhead, Pine Fork, Summit, 9.0 km); not
  `read-wrong` (the run row shows "km 7.5", no hop count given as the total).
- **Direction set to Undirected.** Dana changed Direction from "As the file says" to "Undirected"
  before Load (`08.png`, `09.png`, header "each edge goes both ways"; `10.png` Direction
  "Undirected, set in the project"). The key says B's route and total are the same directed or
  undirected, so this does not change the grade. It is a deliberate, reasoned choice ("you can
  walk a trail either way"), not a detour. Because the graph loaded undirected, the Path form has
  no Follow row and Made with lists no Follow, unlike the key's reference screens.

## Measures

- **Steps:** 17 `real.mjs` steps after the start (`02.png` to `18.png`); 16 that did something,
  since step 3 (`04.png`, byte for byte the same as `03.png`) was refused by the tool and changed
  nothing. The round 2 route is 10. Of the extra 6: 2 are the Direction change (open, choose),
  2 are the analysis button plus a typed filter plus a click (3 steps) in place of the `p` key
  (1 step), 1 is the refused click, and From and To were each walked as type then pick (counted
  once each by the key, 2 extra screenshots). About 1.2x the round 2 route counted the key's way.
- **Wrong turns:** 0. Every move went forward. The step 3 refusal was an aiming slip caused by a
  duplicate accessible name (problem 6), not a wrong place.
- **False "done":** none. "Yes" in the debrief is true: the route, the total and the weight
  meaning are on screen in `18.png`. truth-on-screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Wording echo:** she quoted "a path takes the smallest total", which appears only after
  Farther is chosen; she did not echo "longer", "distance" or "time". Not a lead.
- **Silent commit:** none. Load drew the graph and the Overview named the loaded weight; Find path
  drew the route, its key and the run's Values.
- **Numbers that disagree:** none. "Total km 7.5" matches the four edges in the table and the run
  row's "km 7.5".
- **Wrong weight reading without a sign:** no.
- **Broken habit:** none. Her history's first moves (Open project or file, the analysis button)
  both led on to the task.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot, and the tool named the
  ambiguous match it refused; leaks.json shows no leaks.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind               | Problem | Evidence |
| --- | -------- | ------------------ | ------- | -------- |
| 1   | 2        | discoverability    | A number edge column starts with the role "Attribute", Load is enabled, and only the summary line "Weight: none (each edge counts 1)" says the km are not used. "Higher means" appears only after Weight is picked, and starts on "Not set". Dana opened the role box only because of that one line; without it she would have loaded and got the wrong route. | `03.png`; transcript step 2 and debrief: "If that line were missing, I'd have loaded and gotten the wrong answer" |
| 2   | 1        | comprehension      | Direction defaults to "As the file says", which loads trails.csv as Directed (one-way trails). Dana changed it by her own check; she notes a hurried user would not. On this data the answer is the same either way, so no wrong result was possible here; held one level down as an opinion on this task. | `08.png`, `09.png`, `10.png`; transcript debrief |
| 3   | 1        | wording            | "Weight" is not her word for a distance ("length" or "cost" would be); she chose it as the only sensible option in the role list. | `05.png`; transcript debrief |
| 4   | 1        | legibility         | No junction names are drawn on the nodes, so the black route on the canvas can be read only through Nodes in order; the drawing alone tells her nothing. | `10.png`, `18.png`; transcript debrief |
| 5   | 1        | legibility         | The small gray captions ("Higher means", "Each row is") are hard for her to read. Opinion only; contrast not measured in this session. | `09.png`; transcript debrief |
| 6   | 1        | accessibility-name | The column header "km" and the role box are both matched by the name "km"; the tool refused the click and nothing happened. Cost one step. | `04.png` (unchanged from `03.png`); transcript step 3 |

No severity 3 or 4: the answer was right, the meaning was set for every run, and every doubt she
raised was about wording, legibility or discoverability on a path she completed.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
