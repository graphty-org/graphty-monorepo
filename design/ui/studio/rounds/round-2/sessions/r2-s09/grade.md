# Grade: session r2-s09 -- Dev, a whole first session on his own file (friends.csv)

**Grade: SD** (success with difficulty). All five parts of the task were reached in one sitting
and none was undone by a later step. It is SD rather than S because of three wrong turns, all on
the names step (`16.png`, `17.png`, `19.png`), and two tooltips used as help ("Size by attribute"
at step 10, "Label position" at step 18).

Build seen: `4a7a1a7fbdba graphty@0.8.53` (session.json), at 1440 x 900, no uncommitted changes.

## The five parts (5 of 5 reached)

1. **friends.csv drawn.** `03.png`: opened with "Open project or file..."; the Values tab reads
   Nodes 20, Edges 41, Directed, matching the reference values.
2. **A ranking run finished.** `06.png`: Degree, from Analyze's "Rank nodes and edges" group, run
   with its defaults. Every dot is colored, the key reads "Color: Connections, 3 to 6", and a row
   "Connections 20" appeared. Degree ranks people by how many ties they have, which answers "who
   matters most". The maximum, 6, is Ava's, matching the reference (Ava 6, Ivan 5).
3. **Sizes bound to the result and visibly different.** `12.png`: a Size line reading "1 to 3"
   bound to Connections; the key gains "Size: Connections, 3 to 6". Ava is clearly the largest dot,
   Ivan next. Meaning, said in the debrief: sizes and colors "both mean the same thing --
   Connections, how many people each person is linked to, from 3 (small, light orange) to 6 (big,
   dark brown)". Correct. His essay sentence ("Ava ... 6 connections, the most of anyone; Ivan is
   the next most connected") matches the reference.
4. **Names drawn.** `15.png`: a label line bound to `id` (which holds the names in friends.csv) on
   the Connections row, which covers all 20 nodes. Real names are drawn, not ids such as "n0". The
   line reads "20 labels, 1 hidden to avoid overlap". The prompt asked for everyone's name; the
   success definition asks for names drawn, as in the other sessions on this task, so the part
   counts. Two names are in fact unreadable, not one (problem 1).
5. **Image downloaded and passes the picture checklist.** `downloads/friends_current-view.png`
   (1806 x 1720, the default "To share" preset). Same nodes and arrangement as `23.png`; sizes
   visibly different; the names drawn on screen are drawn in the image (with the same two
   unreadable); the key names both channels in use, "Size: Connections" and "Color: Connections",
   each 3 to 6. `23.png` shows the toast "Exported friends_current-view.png".

## Measures

- **Steps:** 22 `real.mjs` steps after the start (`02.png` to `23.png`), two of them hovers, one
  (step 13, "Add to Label") matching no control and doing nothing; the + beside Label is named
  "Add label line", so he pointed at it instead. The success path is about 18. Export from the
  main menu (`21.png`) rather than Control+e is an equal route, not a detour.
- **Wrong turns:** 3, all while trying to show the hidden name: clicking the "1 hidden" note
  (`16.png`, it is plain text), clicking beside the "Aa" icon (`17.png`, missed), and opening
  "Label position" (`19.png`, it only places the name). Step 13 is a tool miss on a name, not a
  wrong turn by the person.
- **False "done":** none. "Part 1 done" (`03.png`), "Parts 2 and 3 done" (`12.png`) and "Part 5
  done" (`23.png`) each match the screen. For names he said "MOSTLY DONE -- ... 1 is hidden ... I
  could not find a way to show it" (`19.png`) and repeated it in the debrief. He did believe 19 of
  20 names showed when 18 were readable; that belief came from the app's count (problem 1), and he
  did not claim the step finished. truth_on_screen: not applicable.
- **Activation:** yes. He chose Degree himself from the Analyze list and ran it with its defaults,
  with no tooltip, help or detour (the toolbar hint naming the flask is on-screen text). He passed
  over PageRank's "Start here" tag on purpose, to follow his tutorial's order.
- **Usage card:** declined ("No thanks", `02.png`); no wrong belief drawn from it.
- **Silent commits:** one. Adding Size (`09.png`) put a fixed "1" and changed no dot. He did not
  take it for done ("that would make them all the same size").
- **Counts against the drawing:** one disagrees: "1 hidden" against two unreadable names
  (problem 1). Nodes 20, Edges 41 and the Connections range 3 to 6 check against the reference.
- **Tool prints:** step 13 matched nothing; "Export" at step 23 was ambiguous between the dialog
  and its button and took the button. Neither did something a person could not, so the session is
  not void.
- **Build-decided:** no. **Void:** no.

## Problems

"Confirmed" means the same finding was also seen in another round 2 session.

| #   | Severity | Kind         | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Evidence                                                                                                           |
| --- | -------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | 3        | build-defect | Once the dots are sized, two pairs of people overlap (Eli under Dev, Farah under Chloe). Eli's name is drawn behind Dev's dot, showing only "E"; Farah's name does not show at all. The label line still says "20 labels, 1 hidden to avoid overlap": a name covered by a dot counts as shown, so the count is wrong. Nothing on screen offers a way to show the hidden name, and the prompt asked for everyone's. Dev left believing 19 names showed; 18 are readable. Confirmed: r2-s08 problem 2 (the same pairs, "0 hidden" while names sat on dots). | Steps 15-19 (`15.png`, `16.png`, `17.png`, `19.png`), `23.png`, `downloads/friends_current-view.png`. Repro below. |
| 2   | 2        | behavior     | Size has no row of its own: it is under the "+" beside Shape, arrives as a fixed "1" that changes nothing, and is bound to a value only through a small chain-link icon he hovered to understand. Confirmed (r2-s04, r2-s05, r2-s06, r2-s08).                                                                                                                                                                                                                                                                                                             | Steps 7-12 (`07.png`, `08.png`, `09.png`, `11.png`, `12.png`)                                                      |
| 3   | 2        | behavior     | The "1 hidden to avoid overlap" note names a problem but gives no way to act on it, and the "Aa" label control does not look like a button. He spent three tries there before giving up on the step.                                                                                                                                                                                                                                                                                                                                                      | Steps 16-19 (`16.png`, `17.png`, `19.png`)                                                                         |
| 4   | 2        | wording      | The method picked is "Degree", but its result is "Connections" everywhere afterward (row, key, Style tab, Size by attribute list); he had to guess they are the same. Confirmed (the same rename for Betweenness and PageRank in r2-s05, r2-s06, r2-s08).                                                                                                                                                                                                                                                                                                 | Steps 4-7 (`04.png`, `06.png`, `07.png`)                                                                           |
| 5   | 2        | behavior     | The label picker offers "id", not a name column; he chose it only by guessing that ids were the names. Confirmed (r2-s08 problem 5).                                                                                                                                                                                                                                                                                                                                                                                                                      | Step 14 (`14.png`)                                                                                                 |
| 6   | 1        | wording      | The file is read as Directed; his course tells him to choose Undirected for a "who knows whom" list, and he saw no place to change it. It did not stop the task.                                                                                                                                                                                                                                                                                                                                                                                          | Step 3 (`03.png`); debrief                                                                                         |
| 7   | 1        | wording      | "Open project or file..." and "New from data..." both look like the way in for a spreadsheet; he hesitated between them.                                                                                                                                                                                                                                                                                                                                                                                                                                  | Step 2 (`02.png`)                                                                                                  |
| 8   | 1        | opinion      | The key in the Export dialog's preview is too small to read; he was not sure it was there until he opened the file.                                                                                                                                                                                                                                                                                                                                                                                                                                       | Step 22 (`22.png`)                                                                                                 |

### Reproduction of problem 1

`rounds/round-2/repro/r2-s09/repro.sh` repeats the session's clicks on the same build through
`real.mjs` (friends.csv opened, Degree run, the Connections row selected, Size bound to
Connections, a label line bound to `id`) twice, into `run-1/` and `run-2/` with logs `run-1.log`
and `run-2.log`. `crop.py` cuts the two overlapping pairs and the label line from each run's last
screenshot into `run-1-overlap.png` and `run-2-overlap.png`. Both runs are identical to the
session: Eli's name shows only as "E" behind Dev's dot, Farah's name is not drawn, and the line
reads "20 labels, 1 hidden to avoid overlap".
