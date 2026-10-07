# Grade: session r2-s07 -- Morgan (blind, screen reader), a whole first session, Les Miserables

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json), screen-reader mode. Graded from the last
screenshot (266.png), the transcript and three scripted re-runs on the same build. No files were
downloaded (no `downloads/` folder exists).

## Grade: G (gave up)

Morgan reached four of the five parts and then said "I'm giving up on the picture. Ending the
session." The picture part failed because of a build defect (problem 1), so the session is
**build-decided**. **Void:** no -- the tool did what Morgan asked at every step; the stranded
focus is the app's.

| Part | Reached | Evidence |
|---|---|---|
| 1. Sample drawn | yes | Step 11 "Reading Les Miserables"; 13.png shows the drawing. No "loaded" announcement and no size were spoken. |
| 2. A ranking run from Analyze, finished | yes (Degree, shown on screen as "Connections") | Step 111 "Degree added, running"; the Connections row (77) is in the outline from 140.png on. An Edge betweenness run (shown as "Bridge edges") was made by mistake first, at step 91. |
| 3. Sizes bound to the result, visibly different; meaning said | yes | Step 195 "1 to 3, variable Connections in degree"; 222.png shows sizes from small to large and the legend "Size: Connections". Morgan said sizes and colors both stand for each character's number of connections, which matches the legend ("Size: Connections", "Color: Connections"). Not `meaning-wrong`. |
| 4. Label line bound to the name attribute on a row covering every node, names drawn | yes | Step 202, live region "77 labels, 7 hidden to avoid overlap"; the line "Label, Above: name" on the Connections row, which covers all 77 nodes; names drawn in 222.png. |
| 5. Image downloaded that passes the picture checklist | **no** | No download. 266.png: the Export dialog is open, its Export button never pressed. |

- **Partial:** 4 of 5.
- **Failure codes:** `dead-end` (Export, problem 1).
- **Activation measure:** no -- the first run was the wrong measure (Edge betweenness), picked blind
  from a list that announced no options; Degree came on the third try.
- **Screen-reader check (answers.md):** "Degree added, running" was heard; no "finished"
  announcement exists (bar 8, problem 6). "Size: Connections" is in the legend but was not spoken;
  Morgan read the binding from the control name instead. "77 labels, 7 hidden to avoid overlap"
  was heard. "Exported les-miserables_current-view.png" was never reached.

## Counts

| | This session | Reference |
|---|---|---|
| Steps (real.mjs) | 265 after the start (266 PNGs) | about 18 (pointer path) |
| Key presses | about 265 (one key or one typed string per step) | 107 keys (keyboard path on round 2's build) |
| Wrong turns | 9 | -- |

Wrong turns:

1. Steps 13-34 (13.png-34.png): arrow and Enter on the drawing, then the keyboard-shortcut dialog,
   looking for a text way through the graph.
2. Steps 54-64: arrowed and opened the "Everything" outline row looking for the node count.
3. Steps 69-91: arrowed in the analyses list, then Down + Enter after typing "betweenness"; ran
   Edge betweenness (91.png), a measure on links, not characters.
4. Steps 93-96: typed "betweenness centrality" and got the same edge measure again ("Update Edge
   betweenness row", 96.png).
5. Steps 102-109: Down + Enter on "degree" did nothing (103.png); later Shift+Tab + Enter went back
   to the list instead of Advanced (109.png). Recovered with plain Enter at step 110.
6. Steps 115-139: after the run, tabbed the Graph's Values and Style tabs (canvas and layout only)
   and wrapped round the page looking for the result.
7. Step 179 (179.png): Alt+ArrowDown on the Size field, expecting a list, lowered the size from 1
   to 0; Morgan typed 1 back (183.png).
8. Steps 224-252: after Export opened (unannounced, focus outside it), a full Tab pass and
   Control+e looking for the dialog (226.png, 236.png).
9. Steps 253-266: back through the main menu, Space on Export; same result; gave up.

Turns 8 and 9 were caused by problem 1.

## False "done"

None. Each "done" Morgan claimed (parts 1, 3 and 4) is true on screen, and part 5 was reported as
not done. Morgan did leave with a wrong belief, though: "Export does nothing that I can detect",
while the Export dialog stood open on screen from step 223 to the end (224.png, 266.png). That is
recorded as problem 1, not as a false "done".

## Problems

Severity 0-4 (Nielsen). Build defects were reproduced by the scripts in
`rounds/round-2/repro/r2-s07/`: `repro-menu.sh` (output `run-menu/`, `run-menu.log`),
`repro.sh` (`run/`, `run.log`) and `repro-size.sh` (`run-size/`, `run-size.log`), keys only, in
screen-reader mode.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 4 | build-defect | Choosing "Export... Ctrl+E" from the main menu (Enter or Space) opens the Export dialog but leaves focus on the "Main menu" button behind it; nothing is announced, Tab walks the page behind the open dialog and never reaches its controls, and Control+e then does nothing because the dialog is already open. A screen-reader user cannot reach the dialog and believes Export is broken. (Control+e with no dialog open works: focus goes to its Close button.) | Steps 223-266, 223.png, 224.png, 236.png, 266.png. Repro: `run-menu.log` ("menuitem Export... Ctrl+E" then "button Main menu", Tabs to Project/Undo/Redo, Control+e stays on Redo), `run-menu/23.png` dialog open with focus outside it; `run.log` path B: Control+e from the page gives "button Close" then "gridcell Image". |
| 2 | 3 | accessibility | The analyses list ("Filter analyses") and the attribute list ("Find an attribute") announce no option when arrowed: every Down press reads only the combobox. Down + Enter picked a different item than Morgan intended or did nothing. Morgan ran the wrong measure because of it. | Steps 70-74, 78-79, 95-96, 102-105; 91.png. One participant; the tool prints focus, not an active option, so not counted as a build defect until checked against the accessibility tree. |
| 3 | 2 | build-defect | The Size field is announced as a combobox but behaves as a number box: Alt+ArrowDown (the open-the-list key for a combobox) lowers the value from 1 to 0, with no announcement. | Step 179, 179.png. Repro: `run-size.log` last steps ("combobox Size value 1", Alt+ArrowDown, "combobox Size value 0"). |
| 4 | 2 | build-defect | Settings show raw floating-point values to a screen reader and braille display: "Gravity -1.2000000476837158" (Graph Style), "Size 1.4500000476837158" (Selection Style). | Step 129, 129.png. Repro: `run-size.log` ("spinbutton Size value 1.4500000476837158"). |
| 5 | 2 | build-defect | After Enter on a sample, focus moves to the drawing, which has no accessible name and says nothing on arrows or Enter. (Also found in session r2-s01.) | Steps 11-14, 11.png. Repro: `run.log`, "Canvas (no name)". |
| 6 | 2 | build-defect | No announcement that a run finished, and none that the sample finished loading or how big it is; only "Reading Les Miserables" and "<measure> added, running". The 77-node count reached Morgan only through the label count, near the end. | Steps 11-12, 91-92, 111. Repro: `run-size.log` ("Degree added, running", nothing after a 2 s wait). |
| 7 | 2 | accessibility | In the outline, Tab lands on the rows' "Hide <result>" buttons before (or instead of) the rows, and arrows do nothing there; the result rows themselves were reached only by arrowing up from "Everything". | Steps 140-150, 140.png-150.png. Repro: `run-size.log` (Shift+Tab from the resize handle reaches "button Hide Connections" before "treeitem Selection"). |
| 8 | 2 | accessibility | Closing the keyboard-shortcut dialog with Done drops focus on the page itself, not on the element that was focused before; the dialog's title is not announced on open. | Steps 15, 34, 15.png, 34.png. One participant. |
| 9 | 2 | behavior | The Degree run colored the nodes on its own ("Connections, Color") without saying so; Morgan learned it only by tabbing the Style tab, and no color names or scale were spoken. | Steps 162-166. One participant. |
| 10 | 1 | opinion | "1 to 3, variable Connections in degree" puts the numbers first and "in degree" reads like the directed measure in-degree. | Step 195. |
| 11 | 1 | behavior | The Graph's Overview (Nodes 77, Edges 254) is shown on screen but none of it is focusable, so in this mode it could not be heard. A real screen reader's browse mode would read it; recorded for the keyboard-only path. | Steps 46-47; `run-menu/23.png` shows the Overview. |

What worked, for the record: every control in the start page and toolbar has a clear name; the
main menu reads each shortcut after its name; typing a measure and pressing Enter opens its form
with Run focused; after choosing a label attribute focus moved to "Label position" and the live
region gave one clear count ("77 labels, 7 hidden to avoid overlap"), which Morgan called "the
best thing I heard all session".
