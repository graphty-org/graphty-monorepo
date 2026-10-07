# Grade: session r1-s17b -- Elena, Javert and who he is tied to (Les Miserables)

**Grade: F** (failure). Codes: a count with no names behind it; `never-found` (the list of his
connections).

The task succeeds when Javert is selected, his neighbors are listed on screen by name, and the
participant reads at least three of them from that list and says 17. Elena selected Javert and
read "Degree 17" (`07.png`). She never opened the list "Javert's 17 connections". It is one click
on "Degree" in his Values, and she was looking at that row in `07.png`. Her final answer was
"17, and one of them is Babet -- I couldn't find the rest". That gives one name, and the only
place she read it was the selection summary's "Babet (1)" (`09.png`), not a list of his
neighbors. The last screenshot (`16.png`) shows 18 nodes highlighted, an inspector with only the
heading "Selection" and nothing under it, and no names anywhere on screen.

No files were downloaded, and none were expected.

## Measures

- **Steps:** 15 `real.mjs` steps (`02.png` to `16.png`). The success path is 6 steps. The
  session ended without success.
- **Wrong turns: 6.**
  1. Clicked Valjean in the middle of the drawing, taking him for the main character (`04.png`).
  2. Node actions, then Neighborhood (`08.png`, `09.png`). This highlights the neighbors but
     lists no names, the same dead end as the G shortcut.
  3. Clicked "id Babet (1)", hoping it would open the rest of the list (`10.png`).
  4. Opened the Data rail, then "Node table", which opened "Add to Les Miserables". She backed
     out with Cancel, then Graph (`11.png` to `14.png`).
  5. Clicked "Selection 18" on the left, which emptied the inspector (`15.png`).
  6. Hovered a highlighted dot to see its name and got nothing (`16.png`).
- **False "done":** none. She said she had "half" finished. Both of her claims are true:
  Javert has 17 connections, and Babet is one of them.
- **Ease (from the transcript):** she gave 5 on a scale where 7 is hardest, which is about 3 on
  the Single Ease Question (7 = easiest).
- **Tool note (not voided):** at `05.png` a click on the search box's visible hint text, "Find
  nodes, edges, values", resolved to nothing, because the box's accessible name is "Find". A
  person clicking that text would have focused the box. The next step did exactly that by
  position (`06.png`), and the path did not change, so the session is not voided. At `09.png`
  "Neighborhood" took the button instead of the menu item. From the reader's side the effect is
  the same.
- **Build-decided:** partly. The defects below wasted 3 of her 6 wrong turns. They did not
  decide the outcome: "Degree 17" was on screen and working the whole time.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 4 | behavior | "Degree 17" on a node's Values looks like a plain number. Nothing shows that clicking it opens the names of his 17 connections. Nothing even shows that "Degree" means connections ("maybe how important he is?", "I'd guess so but nothing says it"). She looked at the row and never clicked it, so the task could not be done. | `07.png`; transcript at 04 and 07 |
| 2 | 3 | build-defect | When several nodes are selected, the Summary shows "id Babet (1)" and "name Babet (1)": one of the 18 names, with a count. She read it as the first entry of a list she could not open, and clicking it does nothing. | `09.png`, `10.png`; repro `05.png` |
| 3 | 3 | build-defect | In the Data rail, clicking the "Node table" treeitem opens "Add to Les Miserables" (a file loader) instead of the table. She thought she had broken something. | `12.png`; repro `07.png` |
| 4 | 3 | build-defect | Clicking the "Selection 18" row in the left panel empties the inspector: it shows the heading "Selection" with nothing under it, which is less than before the click. | `15.png`, `16.png`; repro `09.png` |
| 5 | 2 | wording | After a neighborhood selection the header says "18 nodes, 0 edges", and the Summary under it says "Edges 0" and "Edges among them 61". Two edge counts for one selection, and she could not tell which was right. | `09.png`; repro `05.png` |
| 6 | 2 | behavior | Neighborhood highlights the neighbors but lists none of them, and Node actions offers no way to list who they are. | `08.png`, `09.png` |
| 7 | 2 | behavior | Hovering a node shows no name; the tool reported no tooltip. With no labels drawn, the picture cannot say who anyone is. | `16.png`; repro `10.png` (tooltip: null on Fantine) |
| 8 | 2 | accessibility | Two reachable controls are both named "Neighborhood" (a button and the menu item). | transcript at 09 |
| 9 | 1 | accessibility | The search box's accessible name is "Find", but the only visible label is its hint text "Find nodes, edges, values" (label in name). | `05.png` |

Severity 4 on problem 1 counts as one participant's behavior. It needs a second participant to be
confirmed.

## Scripted repro

`rounds/round-1/repro/r1-s17b/run.sh` (log and PNGs beside it), run on build
`452285142099 graphty@0.8.53` (commit 4522851420998602a015e60ae2cbf339049a2c97). It opens Les
Miserables, finds Javert, then:

- **A.** Node actions > Neighborhood. `05.png` shows "18 nodes, 0 edges", "Edges among them 61",
  and "id Babet (1)" and "name Babet (1)" (problems 2 and 5).
- **B.** Data rail > "Node table" opens "Add to Les Miserables" (`07.png`, problem 3).
- **C.** Cancel, Graph, then the "Selection" row leaves an empty inspector (`09.png`, problem 4).
- **D.** Hovering Fantine prints `tooltip: null` (`10.png`, problem 7).

Each of these matched the participant's screenshots.
