# Grade: session r3-s01 -- Morgan (screen-reader analyst), a whole first session, Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), screen-reader mode
(keys, typing and the accessibility tree only). Graded from the last screenshot (50.png), the saved
image `downloads/les-miserables_whole-graph.png` (1806 x 1720) and the transcript, plus one scripted
re-run on the same build. Not from the participant's rating (5 of 7).

## Grade: F (failure), build-decided

Four of the five parts hold. The fifth, the picture, fails the picture checklist on "the same
arrangement as the final screen", and a build defect alone caused that.

1. **Sample drawn.** Step 9 (09.png): the live region read "Les Miserables: 77 nodes, 254 edges".
   Holds.
2. **Ranking run from Analyze, finished.** Steps 11-17 (11.png-17.png): Shift+A, typed "betw",
   Betweenness, Run. The live region read "Betweenness added, running", then "Betweenness
   finished". Betweenness is an accepted ranking. Its Top 10 (26.png, read as text) matches the
   reference values: Valjean 1,624, Myriel 504, Gavroche 470.6. Holds.
3. **Sizes bound to the result, visibly different, meaning stated.** Steps 27-31 (27.png-31.png):
   Style, "Add to Shape", Size (the from-data list opened at once), typed "betw", Enter. The Size
   line reads "1 to 3, variable Betweenness". At step 41 the key read as text "Size: Betweenness 0
   1624" beside "Color: Betweenness 0 1624". The dots differ visibly in 50.png. In the debrief she
   said size and color both stand for betweenness: "bigger and darker brown means more of a
   go-between". Correct. The list was used, not closed, and "Fixed size" was not chosen. She did
   not say the sizes failed to change. Holds.
4. **Label line bound to `name` on a row covering every node, names drawn.** Steps 34-36 (35.png,
   36.png): "Add label line" on the Betweenness row, which holds all 77 nodes, then `name`. The live
   region read "77 labels, 7 hidden". "Show all labels" was used (step 37), and the statement became
   "77 labels". Every name is drawn in 50.png. Holds.
5. **Image downloaded that passes the picture checklist.** Steps 42-50: Main menu, Export..., View
   changed from "Current view" to "Whole graph", Export. The live region read "Exported
   les-miserables_whole-graph.png". The checklist, against 50.png:
    - **same nodes and arrangement as the final screen: no.** The picture shows the 3D drawing from
      another side, not a zoomed-out copy of the screen. On screen Gribier is far right and Mother
      Plutarch far left, with Myriel's group at the bottom; in the picture Gribier is far left,
      Mother Plutarch far right, Jondrette hangs at the bottom, and the bottom quarter is empty.
      The re-run shows the cause (problem 1);
    - sizes visibly different: yes;
    - the names drawn on screen are drawn in the image: yes, every name, small and soft;
    - a key naming every channel in use: yes, "Size: Betweenness" and "Color: Betweenness", each
      0 to 1624.

- **Build-decided:** yes. With the default "Current view", the same session's state exports a
  picture that matches the screen and passes the checklist. The re-run shows this:
  `run/downloads/les-miserables_current-view.png` against `run/21.png`. Without the defect the
  grade would be SD. She had one wrong turn, opened Advanced and the View list, and asked a sighted
  person whether the key was in the picture. That question counts as help.
- **Void:** no. One command was refused by the tool for its key spelling ("Shift+Slash", exit 2).
  She retried with "?". The tool did nothing a person could not, so this is not a tool fault.
- **Failure codes:** `false-done` (below). None of the listed codes names a picture whose
  arrangement differs from the screen; the cause is recorded as problem 1.
- **Partial:** 4 of 5 parts reached, and the fifth was downloaded with its key and names.
- **Activation measure:** yes. She picked Betweenness and ran it with no help and no tooltip. Her
  look at Advanced before Run was a check of the settings, not a detour to find the measure.
- **Usage card:** declined ("No thanks") without a detour. The confirmation "Usage data stays off.
  Change this in Settings > Privacy" arrived in a live region that already held that text, so many
  screen readers would not speak it. She formed no wrong belief about what is sent.
- **Bar 7 (keyboard only):** not met for this session (F), build-decided.

## Screen-reader check

The task's screen-reader check passes on this build. Each piece of text exists and was read:

- "Betweenness added, running", then "Betweenness finished" (step 17);
- the key as text, "Size: Betweenness 0 1624" (step 41);
- "77 labels, 7 hidden" (step 36), then "77 labels" after "Show all labels" (step 37);
- "Exported les-miserables_whole-graph.png" (step 50, assertive). Focus then returned to "Main
  menu".

No undo was used. Nothing was announced when the size was bound (step 31), and the answers list
that against bar 8, not against her. Focus moved to the new Size line.

## Counts

|                                      | This session                                   | Reference                                |
| ------------------------------------ | ---------------------------------------------- | ---------------------------------------- |
| Commands (real.mjs, after the start) | 49 (16 of them reads), plus 1 the tool refused | about 17                                 |
| Keys pressed                         | 145, plus "betw" typed twice                   | 105 keys on Les Miserables, round 3 walk |
| Wrong turns                          | 1                                              | --                                       |

- **The wrong turn:** at steps 37-38 she pressed "?" to find the keyboard shortcuts while focus was
  on the "Show all labels" checkbox. Nothing happened, and she gave up on it. The re-run does the
  same (problem 4).
- **One-key overshoots (not counted as wrong turns):** ArrowDown past Betweenness to Edge
  betweenness (step 13), Shift+Tab past the Style tab (step 25), Tab past "Add to Shape" (step 27),
  and Shift+Tab off the top of the page (step 40). Each was corrected on the next command.
- **Exploration (not counted):** opening Advanced on Betweenness (step 16), Tabbing through the
  toolbar after choosing the Betweenness row (step 22), and opening the View list to look for a
  "with key" choice (steps 45-47). That last search led her to choose "Whole graph", which set off
  problem 1.
- Keys against the reference: 145 / 105, about 1.4x, inside the 2x measure.

## False "done"

**One: the picture.** In the debrief she said "Did I finish? Yes, all five parts", and the saved
picture fails the checklist because its arrangement differs from the screen. She could not know
this. The preview's only accessible name is "Preview of les-miserables_whole-graph.png", and the
sighted moderator described the key and the names, not the angle. The thumbnail in 49.png shows the
other angle to a sighted eye, but no text says so. It is recorded as a false "done", not
`truth-on-screen`. The build defect is the cause, not a misreading. It is confirmed by the scripted
repro below.

Every other "done" claim matches the screen: "Graph part done" (10.png), "who matters most ...
done" (26.png), "Sizes part done, as far as text tells me" (32.png) and "Names part done" (37.png,
"77 labels" with "Show all labels" checked).

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. The build defects below were
reproduced by `rounds/round-3/repro/r3-s01/repro.sh`, which runs the session's route as a script.
Its output is in `run/` and `run.log`, and both images are in `run/downloads/`. Every re-run gave
the same result as the session.

| #   | Sev | Kind          | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Evidence                                                                                                                                                                                                                                           |
| --- | --- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3   | build-defect  | In the default 3D view, Export's View "Whole graph" draws the graph from a different camera angle (left and right are swapped) instead of fitting the current angle. The bottom quarter of the image is left empty. The saved picture no longer matches the screen the user worked on. The dialog's only hint is "your own camera does not move", and for a screen-reader user the preview is just a file name. A blind user cannot find out, and hands on a picture that does not match what she described. This decided the session's grade. | Steps 47-50, 49.png (thumbnail), 50.png against `downloads/les-miserables_whole-graph.png`. Repro: `run/downloads/les-miserables_whole-graph.png` against `run/downloads/les-miserables_current-view.png` and `run/21.png`, same state, every run. |
| 2   | 3   | accessibility | Focus falls to the page body after "No thanks" (step 6) and after opening a sample (step 9). She had to find her place again each time. This was already recorded for bar 8.                                                                                                                                                                                                                                                                                                                                                                   | 06.png, 09.png; transcript "focus: nothing (the page itself)".                                                                                                                                                                                     |
| 3   | 2   | accessibility | The usage confirmation ("Usage data stays off. Change this in Settings > Privacy") arrives in a live region that already holds the text, so many screen readers never speak it.                                                                                                                                                                                                                                                                                                                                                                | Step 6, 06.png; the tool marks it "unconfirmed".                                                                                                                                                                                                   |
| 4   | 2   | build-defect  | "?" does nothing while focus is on an inspector checkbox ("Show all labels"), although Main menu lists "Keyboard shortcuts ?".                                                                                                                                                                                                                                                                                                                                                                                                                 | Steps 37-38, 39.png. Repro: step 14, `run/14.png`; the read shows no shortcuts dialog.                                                                                                                                                             |
| 5   | 2   | accessibility | On the Values tab, the distribution chart reads as twenty "row (no name)" items before the summary and the Top 10.                                                                                                                                                                                                                                                                                                                                                                                                                             | Step 26, 27.png.                                                                                                                                                                                                                                   |
| 6   | 2   | behavior      | The Export dialog never says whether the key goes into the picture. She had to ask a sighted person, and searched the View list for a "with key" choice. Seen in one participant.                                                                                                                                                                                                                                                                                                                                                              | Steps 43-49, 44.png-49.png; debrief point 8.                                                                                                                                                                                                       |
| 7   | 2   | build-defect  | Names in the 2x export are small, soft and overlap in the crowded middle. Valjean's own name is hidden under his dot. This is the second participant to meet it (also in r3-s02).                                                                                                                                                                                                                                                                                                                                                              | `downloads/les-miserables_whole-graph.png`; the moderator's description; repro `run/downloads/`.                                                                                                                                                   |
| 8   | 2   | accessibility | Choosing the Betweenness row in the outline is silent. Nothing says that the inspector now shows that run, or where. She Tabbed through the toolbar to find it.                                                                                                                                                                                                                                                                                                                                                                                | Steps 21-23, 22.png, 23.png.                                                                                                                                                                                                                       |
| 9   | 1   | wording       | Betweenness's only setting, "Sample size", value 1, has no explanation, although the result is the exact one. The values are raw counts, and nothing on screen says so. An expert worked both out by arithmetic. Held one level down as an expert's opinion.                                                                                                                                                                                                                                                                                   | Steps 16-17, 17.png; step 19, 19.png.                                                                                                                                                                                                              |
| 10  | 1   | wording       | The Size line's name "1 to 3, variable Betweenness" puts the numbers before the measure. At screen-reader speed, "1 to 3" comes before the word that says what it is about.                                                                                                                                                                                                                                                                                                                                                                    | Step 31, 32.png.                                                                                                                                                                                                                                   |
| 11  | 1   | accessibility | "Label" is a bare button with no state. After a label line exists, the disabled "Label" and "Add label line" stay in the Tab order.                                                                                                                                                                                                                                                                                                                                                                                                            | Steps 33 and 39, 34.png, 40.png.                                                                                                                                                                                                                   |
| 12  | 1   | opinion       | "77 labels, 7 hidden" does not say which seven are hidden. "Show all labels" next to it resolved this.                                                                                                                                                                                                                                                                                                                                                                                                                                         | Step 36, 37.png.                                                                                                                                                                                                                                   |

**What worked:** real headings and named buttons on the start page. Shift+A opens a filterable list
of analyses, each with a one-line definition. The run announces "added, running" and "finished",
and focus returns to Analyze. The color key and the size key are exposed as text. The Top 10 can be
read as text. Size "+" opens its from-data list at once, so she never met "Fixed size". "Show all
labels" is a reachable checkbox, and its effect is announced ("77 labels"). Main menu lists its
shortcuts. Focus stays in the Export dialog and returns to "Main menu" after Export.
