# Grade: session r2-s47 -- Morgan (blind, screen reader), T6 "What did I get?"

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json), screen-reader mode. Les Miserables from
the start screen. Graded from the last screenshot (90.png), the screenshots before it, the
transcript and one scripted keyboard-only re-run on the same build
(`rounds/round-2/repro/r2-s47/repro.sh`, output in `run/` and `run.log`). No files were saved (no
`downloads/` folder), and none were needed. Never graded from Morgan's own rating (2 of 7).

## Grade: G (gave up)

Morgan ended with "I am repeating myself without progress. I stop here." and answered "Did I
finish? No." He gave no confident answer to any of the four parts.

| Part               | Morgan's answer                                                                      | On screen                                                                | Right?                          |
| ------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------- |
| Characters         | "half done, by accident": inferred 77 from "Size 77" on Group 1, never heard a total | Overview "Nodes 77" from 09.png to 90.png                                | hedged inference, not an answer |
| Connections        | "not done. I heard no edge count anywhere"                                           | Overview "Edges 254" (09.png); Data page "77 nodes, 254 edges" (22.png)  | no                              |
| Everyone reachable | "probably yes, by inference ... a guess stacked on a guess"                          | Overview "Components 1" (09.png)                                         | right in substance, hedged      |
| Recorded facts     | "not done": only computed values (Degree, Group)                                     | Data page Attributes: `id`, `name`; `shared_chapters` (22.png to 27.png) | no                              |

- At most 2 of 4, both hedged inferences: below the SD bar (3 of 4) even if counted. He stopped
  without answering, so G rather than F.
- **The answers were on screen almost the whole session.** The Overview with all three counts
  was showing from step 9 (09.png). At step 21 Morgan pressed Enter on "From Les Miserables",
  which opened the Data page with every attribute (22.png); nothing was announced and focus
  stayed on the button, so he tabbed forward, away from it, and the left panel stayed on Data
  until step 41.
- **Failure codes:** `dead-end` (the counts are in no focusable name and no announcement),
  `silent-change` (the Data page opened unannounced).
- **Build-decided:** yes. Problems 2, 3 and 4 below took away every route Morgan could hear: no
  load announcement with the size, a Data page that opened in silence, and outline rows whose
  spoken names leave out their counts.
- **Void:** no, but see "Tool note". The tool did what Morgan asked at every step; step 72 was a
  refused key name, retried at step 73.

## Counts

|                  | This session                                          | Reference          |
| ---------------- | ----------------------------------------------------- | ------------------ |
| Steps (real.mjs) | 89 after the start (90 PNGs), plus 1 refused key name | 2-3 (pointer path) |
| Key presses      | about 160                                             | 35 (keyboard path) |
| Wrong turns      | 12                                                    | --                 |

Wrong turns, against the success path (open the sample, read Values > Overview, Data from the
rail):

1. Steps 15-17 (15.png-17.png): ArrowDown on the Overview toggle and arrowing the Values/Style
   tabs, looking for a way to hear the Overview's text.
2. Steps 18-20: opened Graph actions (layout only).
3. Steps 21-22: Enter on "From Les Miserables" opened the Data page (22.png) silently; Morgan
   heard nothing and tabbed away from it. Caused by problem 3.
4. Steps 23-31: Analyze, typed "connected", ArrowDown moved the highlight to Eigenvector (26.png),
   Enter and Run ran Eigenvector (31.png) without his knowing what was picked.
5. Steps 32-37: ran Connected components (not needed: Components 1 was already on screen), then
   tabbed looking for where results land.
6. Steps 38-41: wrapped round the page; Enter on the rail's "Graph" (no state spoken).
7. Steps 42-53: Find Valjean; Enter on "Separate pieces Group 1" dropped focus to the page and
   switched the inspector to Group 1's Style tab (48.png-50.png).
8. Steps 54-63: Control+A, walked the outline, picked "Everything"; its summary "77 nodes, 254
   edges" (71.png) is plain text he could not hear.
9. Steps 64-78: main menu, Keyboard shortcuts (the dialog opened with focus left outside it,
   71.png), then the "?" dialog.
10. Steps 79-81: Find Valjean again; ArrowRight on the rail's "Graph" (ArrowDown reaches "Data").
11. Steps 82-84: arrows on the unnamed canvas.
12. Steps 85-91: "Degree 36" opened "Valjean's 36 connections" (neighbor names only); Escape
    closed the list and moved focus to "Graph actions"; back to the Overview.

## False "done"

None. Morgan reported every part not done or "by inference". His picture of the app is wrong in
one way: he left believing "I heard no edge count anywhere" and "if the file has other columns I
never found them", while the Data page with `shared_chapters` and "254 edges" was open on screen
from step 21 to step 40. That is recorded as problem 3, not as a false "done".

## Problems

Severity 0-4 (Nielsen). Build defects were reproduced by `rounds/round-2/repro/r2-s47/repro.sh`,
keys only, in screen-reader mode; its parts are named A to G in `run.log`.

| #   | Sev | Kind          | Problem                                                                                                                                                                                                                                                                                                                                                                                                       | Evidence                                                                                                                                                                |
| --- | --- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3   | accessibility | The Graph's Overview (Nodes 77, Edges 254, Components 1) and the "Everything" summary ("Covers every node and edge: 77 nodes, 254 edges") are plain text with nothing focusable, while a node's Values are focusable buttons ("Degree 36"). With focus only, the one panel that answers this task cannot be heard. A real screen reader's browse mode would read it (see Tool note). Also recorded in r2-s07. | Steps 13-17, 37, 53, 63, 91; 09.png, 71.png. Repro part C and E: Tab goes from "Collapse Overview" straight to "Resize inspector".                                      |
| 2   | 3   | build-defect  | Loading the sample announces "No nodes to draw" then "Reading Les Miserables" and never that it finished or how big it is. Bar 8 asks for one announcement when a load finishes. Also in r2-s07 (confirmed).                                                                                                                                                                                                  | Steps 7-8; 07.png, 08.png. Repro part A: only those two live lines after a 3 s wait.                                                                                    |
| 3   | 3   | build-defect  | Enter on "From Les Miserables" switches the left panel to the Data page (the attribute answers) with no announcement and no focus move; the rail gives no state either. The user cannot know a page opened.                                                                                                                                                                                                   | Steps 21-22; 22.png. Repro part B: "button From Les Miserables" twice, no live line; `run/05.png` shows the Data page open.                                             |
| 4   | 3   | build-defect  | Outline rows leave their visible counts out of their spoken names: "Separate pieces" (shows 1), "Group 1" (shows 77); on the Data page "Les Miserables" (shows 77 nodes, 254 edges), "Node table" (77 rows), "Edge table" (254 rows). Each would have answered a part of the task.                                                                                                                            | Steps 56-58; 90.png shows the counts. Repro part C ("treeitem Node table", "treeitem Edge table") and part E ("treeitem Separate pieces expanded", "treeitem Group 1"). |
| 5   | 3   | build-defect  | Enter on "Separate pieces Group 1" in a character's Values drops focus to the page and silently switches the inspector to Group 1's Style tab. Bar 8: focus must not drop.                                                                                                                                                                                                                                    | Steps 47-50; 48.png-50.png. Repro part F: "button Separate pieces Group 1", Enter, "nothing (the page itself)"; `run/43.png` shows the Group 1 Style tab.               |
| 6   | 2   | build-defect  | Main menu > "Keyboard shortcuts" opens the modal dialog but leaves focus on "Main menu" behind it; Tab walks the page behind the dialog. (The "?" key does move focus into it.) The same defect on Export was recorded in r2-s07 (confirmed).                                                                                                                                                                 | Steps 70-71; 71.png. Repro part G: "menuitem Keyboard shortcuts ?", Enter, "button Main menu", Tab "button Project: Les Miserables"; `run/58.png` dialog open.          |
| 7   | 2   | build-defect  | A finished analysis is never announced: only "<measure> added, running". Also in r2-s07 (confirmed).                                                                                                                                                                                                                                                                                                          | Steps 30-31, 35-36. Repro part D: "Connected components added, running", nothing after 3 s.                                                                             |
| 8   | 2   | build-defect  | The rail's "Graph" and "Data" are spoken as plain buttons: no selected or pressed state, no sign that they are a group walked with Up and Down. Enter on "Graph" says nothing. Morgan tried ArrowRight and gave up on it; ArrowDown would have reached "Data".                                                                                                                                                | Steps 39-41, 81. Repro part C2: Enter on "button Graph" speaks no state; ArrowDown gives "button Data", ArrowUp "button Graph".                                         |
| 9   | 2   | build-defect  | After the sample opens, focus goes to the drawing, spoken "Canvas (no name)"; arrows and Enter on it say nothing. Also in r2-s01 and r2-s07 (confirmed).                                                                                                                                                                                                                                                      | Steps 7-9, 84; 07.png. Repro part A ("Canvas (no name)").                                                                                                               |
| 10  | 2   | behavior      | Escape in "Valjean's 36 connections" closed the list and put focus on "Graph actions"; Escape after a group pick dropped focus to the page. Morgan lost his place both times. One participant.                                                                                                                                                                                                                | Steps 52, 90; 52.png, 90.png.                                                                                                                                           |
| 11  | 1   | opinion       | Results are renamed into words he had to decode: connected components became "Separate pieces", eigenvector became "Influence by association". He wanted the textbook name beside it.                                                                                                                                                                                                                         | Steps 47, 59; debrief point 4.                                                                                                                                          |
| 12  | 1   | behavior      | Control+F does not reach the app's Find box; Morgan had to tab five stops each time. One participant.                                                                                                                                                                                                                                                                                                         | Step 78.                                                                                                                                                                |

What worked, for the record: the start page's "Open the Les Miserables sample" was found in five
Tabs; the outline is walkable with arrows; "Valjean's 36 connections" was, in his words, "exactly
the kind of label I want"; on the Data page, once reached, attributes are spoken as "id, node
attribute", "name, node attribute", "shared_chapters, edge attribute" (repro part C), which would
have answered the fourth part.

## Tool note (does not void the session)

Two limits of `real.mjs` in screen-reader mode shaped this session:

- **No browse mode.** The tool prints only the focused element and live regions, so plain text
  such as the Overview cannot be read. Morgan said so at step 15 ("With NVDA I would arrow
  through it in browse mode; I cannot here"). With browse mode he would likely have read Nodes 77,
  Edges 254 and Components 1 around step 13 and could have reached SD or S. The criteria define
  Morgan's mode as focus plus live regions, so the session is graded as run, but its grade rests
  on that definition; problem 1 is an accessibility finding, not a build defect, for that reason.
- **No active option.** In "Filter analyses", ArrowDown spoke only the combobox. The build moves
  the highlight (26.png shows Eigenvector highlighted), and an earlier grade found the list uses
  `aria-activedescendant`, which a real screen reader reads. This cost wrong turn 4 but did not
  decide the grade.
