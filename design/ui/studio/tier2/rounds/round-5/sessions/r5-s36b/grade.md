# Grade: session r5-s36b -- Jordan (regular analyst), hiking trails (T20 B), a number that means "farther"

**Grade: S** (success). The last screen (`15.png`) matches the answer key's B end state: the run
"Shortest path" with Values Summary "Path 5 nodes, 4 edges" and "Total km 7.5", Nodes in order
Trailhead, Creek, Meadow, Ridge, Summit (1 to 5), and Made with From "Trailhead", To "Summit",
Follow "All", Weight "km (farther)". The left panel's run row reads "Shortest path km 7.5", and the
canvas key at the top left shows a black swatch beside "Shortest path". The weight was set at load
time: the import page reads "Weight: km (farther)" with Farther chosen under Higher means
(`07.png`), and after Load the graph's Overview reads "Loaded weight km (farther)", Direction
"Directed" (`08.png`). Jordan gave the right route in order and 7.5 km, and pointed to both the
Overview's "Loaded weight km (farther)" and Made with's Weight row "km (farther)" -- either is
enough for S.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of
the criteria, at 1440 x 900, with no setup (the start screen) and no uncommitted changes in the
tool's checkout.

## The answer against the key

- **Route (right).** Trailhead, Creek, Meadow, Ridge, Summit, read from Nodes in order (`15.png`).
  Not the `weight-not-read` route (Trailhead, Pine Fork, Summit, 9.0 km).
- **Total (right).** 7.5 km, read from "Total km 7.5"; Jordan also added the four legs from the
  file preview (1.5 + 2 + 2.5 + 1.5) and checked the rival routes, all correct against `07.png`.
- **Where the kilometers were used (right).** "Loaded weight km (farther)" (`08.png`) and Made
  with "Weight km (farther)" (`15.png`), plus the Path form's Weight box "km (farther, loaded)"
  before the run (`11.png`), which the key also accepts.
- **Pine Fork trap.** The thick black Creek-to-Meadow edge passes behind the large blue Pine Fork
  node (`15.png`, about 633,517). Jordan did not name Pine Fork; the route was read from the list.
- **Work kept.** `work.json`: start null (fresh start), end one run "Shortest path", its two style
  layers, one source trails.csv; nothing gone.

## Measures

- **Route:** the round 2 load-time route: Open project or file with the file, the km column's role
  set to Weight, Higher means Farther, Load, Analyze, Shortest path, From, To, Find path. Jordan
  reached Shortest path through the Analyze toolbar button and its filter box ("shortest") rather
  than the P shortcut -- two steps instead of one, not a detour.
- **Steps:** 14 `real.mjs` steps after the start (15 screenshots). Against the walked 10: one
  no-op click (below), one extra step for Analyze plus filter, and From and To each walked as type
  then pick (counted as one each by the key).
- **Wrong turns:** 1, minor. Step 3, `--click "km"`, was ambiguous between the "km" column header
  and the role box; the screen did not change (`03.png` and `04.png` are byte-identical). Jordan
  corrected it at once with `--click "Role of km"`.
- **False "done":** none. "Trailhead -> Creek -> Meadow -> Ridge -> Summit, 7.5 km" and the three
  places it names are all on screen (`07.png`, `08.png`, `15.png`). truth-on-screen holds.
- **Silent commit:** none.
- **Numbers that disagree:** none. Row "km 7.5", Summary "Total km 7.5" and the hand sum agree.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. 15 screenshots for the steps; `leaks.json` shows no leaks
  over 30 calls.
- **Scripted exit:** not applicable; Jordan finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                       | Evidence                                                                                                       |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The km column's role box starts on "Attribute"; "Weight" shows only inside the closed list. Jordan found it only because the summary line read "Weight: none (each edge counts 1)" and says he would otherwise have loaded without a weight. | `03.png` (role "Attribute", summary "Weight: none"); transcript step 3 and "What confused me", first bullet  |
| 2   | 2        | readability     | No node names are drawn on the canvas and the route's ends cannot be told apart on the drawing; the route can be read only from the Nodes in order list. Jordan would need labels for a slide.                                               | `15.png` (no labels; Creek and Summit overlap at about 755-790, 636-645); transcript "What confused me"       |
| 3   | 1        | comprehension   | Direction loaded as "Directed" from "As the file says" for two-way trails; Jordan noticed only after the run that Follow All made it harmless, and says on another file he would have missed it.                                            | `07.png` (Direction "As the file says"), `08.png` (Direction Directed), `11.png` (Follow All); transcript     |
| 4   | 1        | comprehension   | "Capacity" under Higher means gave Jordan no idea when to pick it; he skipped it. Did not affect the task.                                                                                                                                  | `06.png`; transcript step 6 and "What confused me"                                                            |
| 5   | 1        | discoverability | Jordan asked for a legend saying black = shortest route, but one is drawn: the canvas key at the top left shows a black swatch beside "Shortest path". He did not see it.                                                                   | `15.png` (key at about x 310 to 548, y 52 to 93); transcript "What confused me", third bullet                 |
| 6   | 1        | tool            | `--click "km"` matched both the column header and the role box and did nothing; a participant naming the visible column word lands nowhere.                                                                                                | `03.png` = `04.png` (identical files); transcript step 3                                                      |

Problem 2 (no names on the drawing) is the key's known B note and has been reported by earlier
participants on this task. Problem 1 repeats the key's note that the role list hides Weight until
opened.
