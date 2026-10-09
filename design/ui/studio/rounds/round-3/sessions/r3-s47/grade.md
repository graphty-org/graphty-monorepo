# Grade: session r3-s47 -- Morgan (screen-reader analyst), stop for the day and come back

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de22b, session.json), screen-reader
mode (keys, typing and the accessibility tree only). Started from the T14 setup: Les Miserables
open, a PageRank run coloring the nodes, a name label line on Everything ("77 labels, 7 hidden").
Graded from the last screenshot (49.png), the reopen screenshots (13.png, 28.png, 33.png), the saved
file `downloads/Les Mis PageRank Oct 7.graphty.json` (29,860 bytes, a valid project file naming the
PageRank run and the name label) and the transcript, plus one scripted re-run on the same build.
Not graded from the participant's rating (5 of 7).

Screenshot numbering: step N of the transcript is (N+1).png; 01.png is the start.

## Grade: S (success)

Each part of the success definition holds:

1. **Saved under a name she chose.** Steps 1-4 (02.png-05.png): Control+s opened "Save Les
   Miserables as" with the Name field focused; Control+a, typed "Les Mis PageRank Oct 7", Enter.
   The live region read "Saved Les Mis PageRank Oct 7 in this browser."
2. **The project closed.** Step 5 (06.png): she closed the tab and opened the app again
   (`--reopen`, the same browser storage). The answer key accepts closing the tab.
3. **Reopened from Recent projects.** Steps 7-12 (08.png-13.png): five Tabs to the grid cell "Les
   Mis PageRank Oct 7 In this browser - 77 nodes - Oct 7, 2026, 5:01 AM" (12.png), Enter. The live
   region read "Opened Les Mis PageRank Oct 7" and "PageRank finished" (a restored run, per the
   answer key).
4. **The run, its colors and the names are back.** Step 13 read the PageRank tree item and the key
   "Color: PageRank 0.003299 0.07543"; step 27 (28.png) selected Everything ("77 labels, 7 hidden");
   step 32 (33.png) read the label line "Label, Above: name". 49.png shows the same: the header
   "Les Mis PageRank Oct 7", the PageRank row, the orange ramp on every node, the key, and names
   drawn over the nodes.
5. **Her "did everything come back" matches the screen.** She said the PageRank item with its color
   key and the name labels came back, and quoted the range and "77 labels, 7 hidden" -- all on
   screen. She did not mention the missing "77" beside PageRank; the answer key counts that row as
   restored, so her reading is not contradicted.

- **Build-decided:** no. The defects she met (problems 2 and 3) cost her orientation, not the
  outcome.
- **Void:** no. Every command was one a person could do.
- **Failure codes:** none.
- **Bar 7 (keyboard only):** met for this task (S).

## Counts

|                                     | This session                             | Success path (round 3, keyboard)                                                                                    |
| ----------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Steps to the reopened project       | 12 (steps 1-12; 10 actions plus 2 reads) | 33 keys (Control+s, type, Enter, Tab x21 to Main menu, Enter, Enter, Tab x5, Enter); 6 commands on the sighted path |
| Steps to confirm the work came back | 20 (steps 13-32)                         | about 4 (Tab to the outline, arrows to Everything, Enter, read)                                                     |
| Extra: "Save local copy..."         | 16 (steps 33-48)                         | 0 (accepted, not a wrong turn)                                                                                      |
| Wrong turns                         | 1 (minor, recovered)                     | --                                                                                                                  |

- Two of her twelve steps to the reopen were reads of the save dialog and the start page (steps 2
  and 6); she closed the tab (1 step) where the path uses Main menu > Back to start (2). Both are
  accepted routes, and closing the tab skips the 21 Tabs to Main menu. Steps against the path to the
  reopen: 12 / 33 keys, 0.4x; against the 6-command path, 2.0x.
- **Wrong turn:** steps 14-23 Tabbed ten times through the header and past the outline tree to the
  "Resize left panel" separator, then Shift+Tab twice back into the tree and arrowed to Everything
  (steps 24-26). The tree takes one Tab stop and arrows inside, which she then used correctly.
  Recovered in 3 steps.
- Steps 33-48 saved a local copy because the start page's warning ("This browser can clear projects
  kept here") made her distrust browser storage. The answer key does not count this as a wrong
  turn. The download did not change the grade: the task was done at step 12.
- **Recovery:** the one wrong turn was recovered without help.

## False "done"

None. "Did I finish? Yes" and "all of my work was there" match 49.png: the project name, the
PageRank run with its key and colors, and the names drawn. On the local copy she did not claim it
worked; she said she could not tell, which matches what the app told her (nothing).

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. Build defects were
reproduced with the scripted path `rounds/round-3/repro/r3-s47/repro.sh` (output in `run/` and
`run.log`): the T14 setup in screen-reader mode, Control+s, name "Repro r3-s47", Enter, reopen,
five Tabs and Enter on the Recent projects row, Tab to Main menu, Enter, seven ArrowDowns, Enter on
"Save local copy...". Repro PNGs: 04.png save, 07.png reopen, 11.png local copy.

| #   | Sev | Kind          | Problem                                                                                                                                                                                                                                                                                                                                                                                 | Evidence                                                  |
| --- | --- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | 2   | behavior      | The save dialog and its confirmation say only "in this browser"; the warning that the browser can clear projects kept there, and the advice to save a local copy, appear only on the start page after the save. She would have saved a file at once had she known, and spent 16 steps doing it the next "morning". Also met in session r3-s46 (confirmed, 2 participants).              | Steps 2 and 4 (03.png, 05.png); step 6 (07.png); debrief. |
| 2   | 2   | build-defect  | "Save local copy..." downloads the project file with no announcement: no live-region text, focus simply returns to "Main menu". The ordinary Save announces "Saved ... in this browser." A screen-reader user cannot tell whether the file was written or under what name. Reproduced: run.log shows only `focus: button "Main menu"` and the tool's own download line after the Enter. | Steps 47-48 (48.png, 49.png); repro run/11.png, run.log.  |
| 3   | 2   | build-defect  | After Enter on a Recent projects row, focus falls to the page body ("nothing (the page itself)"); she had to start Tabbing from the top to check her work. Reproduced: run.log shows `focus: nothing (the page itself)` after the Enter that opened "Repro r3-s47". The answer key already records the same drop on this path.                                                          | Step 12 (13.png); repro run/07.png, run.log.              |
| 4   | 2   | accessibility | After Enter in the save dialog, focus fell to the page body (the answer key's round 2 walk put it on Analyze). Not reproduced as-is: in the re-run the tool still reported focus on the closed dialog's Name field after the same Enter, so where focus lands after a save is not stable between runs. Either way it does not land on a named control in the workspace.                 | Step 4 (05.png); repro run/04.png, run.log.               |
| 5   | 1   | wording       | On reopen the live region says "PageRank finished", which she read as a possible re-run; nothing says the run was restored rather than computed again. Harmless for PageRank, she said, but it would matter for a randomized method.                                                                                                                                                    | Step 12 (13.png); debrief.                                |
| 6   | 1   | accessibility | The selection statement "77 labels, 7 hidden" arrives in a live region already holding that text, so many screen readers would not speak it; she found it only by reading.                                                                                                                                                                                                              | Step 27 (28.png); tool note.                              |
| 7   | 1   | behavior      | On Everything's Style tab, "Label" and "Add label line" are both disabled beside an existing label line, with no reason given. She could not tell why.                                                                                                                                                                                                                                  | Step 32 (33.png); 49.png.                                 |
| 8   | 0   | accessibility | Reading the open main menu read the whole page before the menu items. Likely the tool's browse-mode read rather than the app (a menu read should start at the menu); recorded, not counted.                                                                                                                                                                                             | Steps 45-46 (46.png, 47.png).                             |

**What worked:** Control+s opens a short, labeled save dialog with the Name field focused and its
old value selectable; Enter saves and the save is announced. The start page has real headings, the
Tab order reaches the project row in five stops with every control named, and the row reads the
node count and date. Reopening announced the project by name and brought back the run, its key and
the names. Shift+Tab reversed the Tab order cleanly, and the main menu lists its shortcuts.
