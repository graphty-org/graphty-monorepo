# Grade: session r4-s26 -- Elena (tier 1 graduate), Les Miserables (T17 B), only the strong ties

**Grade: S** (success), task and follow-up both. At 5 or more shared chapters Elena answered "26
characters left (51 ties)", the key's value; at 8 or more (the follow-up) "17 characters (19
ties)", the key's value. Both times every character was brought back. The last screen (`11.png`)
shows the whole network drawn, no count chip in the top bar, the Filters row "shared_chapters is
at least 8" over "off" with its checkbox clear, the legend titles plain "Size: PageRank" and
"Color: PageRank", and the Overview reading Nodes 77, Edges 254. `work.json` agrees: the run and
the three layers are unchanged from the start, and the one step is kept, switched off (`step-1
off`, shared_chapters at least 8).

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `lesmis-ranked.txt` (Les Miserables sample opened, PageRank
run, nodes sized and colored by PageRank). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **At 5 or more (right).** `06.png`: top bar "26 of 77 nodes, 51 of 254 edges"; the Filters row
  "shared_chapters is at least 5" over "77 to 26 nodes, 254 to 51 edges", ticked; the Overview
  "Nodes showing 26 of 77", "Edges showing 51 of 254". Elena reported nodes as characters and
  edges as ties, so the `read-wrong` case (51 reported as characters, or 254 as the whole cast)
  did not occur.
- **Back by Undo (right).** `07.png`: the toast 'Undid adding "shared_chapters is at least 5".',
  the Filters list empty, Overview Nodes 77, Edges 254, the legend titles plain again. The key
  accepts Undo as equal to unticking or deleting the step.
- **At 8 or more (right).** Elena built a new step through the same door with 8 (`08.png` to
  `10.png`). `10.png`: chip "17 of 77 nodes, 19 of 254 edges", row "77 to 17 nodes, 254 to 19
  edges", ticked, Overview "Nodes showing 17 of 77", "Edges showing 19 of 254".
- **Back by unticking (right).** `11.png`: the step unticked ("Apply step: shared_chapters is at
  least 8"), the row's second line "off", the chip gone, Overview Nodes 77, Edges 254.
- **The "tick after save" trap:** not reachable on this route. Elena never edited an existing
  step (the first one was undone, so the follow-up started from an empty Filters list) and never
  pressed "Save and turn on"; her one tick was the untick that brought everyone back.
- **Work kept.** `work.json`: runs and layers identical at start and end; notes none; one step
  added and left off; source Les Miserables. Nothing gone.

## Measures

- **Door used:** the canvas toolbar's Filters tool (`--click-at 833,864`, reported as button
  "Filters"), which opened "New filter step" on the right and the Data panel on the left
  (`02.png`). The key accepts this door like the Filters "+". The attribute-row route was not
  used.
- **Steps:** 6 `real.mjs` steps for the task (`02.png` to `07.png`) and 4 for the follow-up
  (`08.png` to `11.png`). About the length of the key's success path.
- **Wrong turns:** 0.
- **False "done":** none. Every claim ("26 characters left", "everyone's back, 77 again", "17
  characters", "all back") is true on the screen it was made from. truth-on-screen: holds.
- **Silent commit:** none. Add step, Undo and the untick each changed the drawing, the chip and
  the Filters list; Undo also announced itself with a toast.
- **Numbers that disagree:** none. Chip, row and Overview agree at both thresholds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the tool reported what
  each pointer action hit, and `leaks.json` shows no leaks over 28 calls.
- **Scripted exit:** not applicable; Elena finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                  | Evidence                                                                                                                  |
| --- | -------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | 1        | discoverability | The canvas toolbar's Filters tool is an unlabeled three-line icon; its name appears only on hover. Elena did not know where filtering lived and guessed the icon, correctly, at no cost here.                                                              | `01.png` (toolbar, icon at 833,864, no label); transcript step 01 and wrap-up: "I didn't know where filtering lived. I guessed the funnel" |
| 2   | 1        | feedback        | The step editor gives no preview: typing the value changes nothing on the drawing or in any count until "Add step" is pressed, so Elena was unsure the value was taking.                                                                                     | `05.png` (Value 5, drawing unchanged); transcript step 05 and wrap-up: "I wasn't sure it was taking until I did"          |
| 3   | 1        | wording         | The editor's line "Keeps edges that pass and the nodes at their ends." was skipped; Elena read the result from the chip instead. The line says what happens to characters, the thing the task asks about, but was not read.                                    | `04.png`; transcript wrap-up: "I skipped it. I didn't need it"                                                            |
| 4   | 1        | comprehension   | Elena called the largest dark node "the main guy" without checking what size meant. While the step is on, the legend reads "Size: PageRank, full graph"; nothing on screen prompted her to look, and the guess did not touch the task.                       | `06.png`, `10.png` (legend "Size: PageRank, full graph", 0.003299 to 0.07543); transcript step 06 and wrap-up             |
| 5   | 0        | discoverability | Two ways back exist (Undo, which removes the step, and unticking, which keeps it). Elena found the checkbox only on the second try. Both worked and both kept the layout, so this is an observation, not a defect.                                        | `07.png`, `11.png`; transcript wrap-up: "I didn't know about the tick box before"                                         |

All rest on one participant and are not confirmed by this session alone. Problems 1 and 4 match
the same observations in session r4-s25 (T17 A), which together make two participants.
