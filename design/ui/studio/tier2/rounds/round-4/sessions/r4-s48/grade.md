# Grade: session r4-s48 -- Tom (tier 1 graduate), Florentine families (T23 B), who is a step or two away

**Grade: S** (success). Both halves of the task are met. The count: at Hops 2 the neighbor list
is headed "Medici and 11 connections" over the eleven names Acciaiuoli, Albizzi, Barbadori,
Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni (`07.png`), and Tom
answered 11 "besides the Medici", the key's number and the key's list. He read the number from the
header and then counted the list as a check; the screen gave it, so this is not the "counted by
hand" SD case. The drawing: the last screen (`08.png`) shows the header chip "12 of 15 nodes"
after a filter icon, 12 nodes drawn, all ringed, and "Filter to neighbors" drawn disabled at
Hops 2 -- the Medici and exactly the eleven. Peruzzi, Lamberteschi and Bischeri, the three unlit
nodes in `07.png`, are gone. No detour: Hops 2 was chosen straight from the Neighborhood list's
Hops 1 start, with no attribute filter tried.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `florentine-ranked.txt` (PageRank run, nodes sized and
colored by it, no names drawn). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **Count (right).** 11, with the key's eleven names, and Tom said in words that it excludes the
  Medici. He also reconciled Selection 12 with "11 connections" himself.
- **Drawing (right).** `08.png`: chip "12 of 15 nodes", 12 nodes on the canvas.
  `work.json`: one new filter step, `{"kind":"neighborhood","seeds":["Medici"],"depth":2}`, the
  key's step.
- **Work kept.** `work.json`: the PageRank run and the three style layers are the same at start
  and end; the only difference is the filter step Tom added on purpose. Nothing gone.
- **Ranking not rerun.** Tom noticed the PageRank row's history icon and the legend's "PageRank,
  full graph" after the filter, did not rerun, and said he would want to know whether the sizes
  come from all fifteen families or the twelve (recorded per the key).

## Measures

- **Route:** find box "Medici" -> the Medici row in the results -> the inspector's "..." menu ->
  Neighborhood -> Hops 2 -> Filter to neighbors. The key names the node menu's "Neighborhood" as a
  route to the same list. The `g` shortcut was not used.
- **Steps:** 7 `real.mjs` steps after the start (`02.png` to `08.png`), one of them a click the
  tool refused as ambiguous (`03.png`, identical to `02.png`: "Medici" matched 7 rows, the node
  and its six ties). The success path is 5 (find, Enter, g, Hops 2, Filter).
- **Wrong turns:** 0. The refused click changed nothing in the app and was a matching ambiguity
  of the tool's text target, not a move into the wrong place; opening the "..." menu led directly
  on to the task.
- **False "done":** none. "Done" (step 8) and the end claims ("11", "only the Medici and those
  families", "12 of 15") all hold on `08.png`. truth-on-screen: holds.
- **Silent commit:** none. Each step changed the list, the selection count or the chip.
- **Numbers that disagree:** none on the screen; "Selection 12" against "11 connections" looked
  like a disagreement to Tom for a moment (problem 3).
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the one refusal left
  the app unchanged, and `leaks.json` shows no leaks over 19 calls.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                       | Evidence                                                                                                                  |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | trust           | After the filter the PageRank row's icon turns into a history mark and the legend reads "PageRank, full graph"; nothing says whether the sizes now come from 15 or 12 families. Tom would have asked a colleague. | `08.png` (legend titles, PageRank row icon); transcript wrap-up: "whether the sizes are still from all fifteen families" |
| 2   | 1        | discoverability | The neighborhood list was found only by trying the inspector's "..." menu; nothing on the selected node's inspector names "Neighborhood" or the `g` shortcut.                                                   | `04.png` (inspector with no neighborhood entry), `05.png` (menu); transcript wrap-up: "tucked behind the three dots"       |
| 3   | 1        | wording         | "Selection 12" in the left panel and "Medici and 11 connections" in the inspector look for a moment like they disagree; one counts the Medici, the other does not.                                         | `07.png`; transcript wrap-up                                                                                              |
| 4   | 1        | discoverability | With no names on the nodes, the Medici could only be found through the find box, whose results list the node together with its six ties, all reading "Medici".                                               | `01.png`, `02.png`                                                                                                        |

Problems 1 to 4 rest on one participant and are not confirmed by this session alone. Problem 1 is
the "out of date under a filter" mark the key already records for this build.
