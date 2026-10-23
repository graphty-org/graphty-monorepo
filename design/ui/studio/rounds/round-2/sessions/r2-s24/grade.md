# Grade: session r2-s24 -- Nadia (level-1 alert reviewer), T12 prompt B (Florentine families, the Medici)

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json), 1440 x 900, no uncommitted changes.
Graded from the last screenshot (06.png) and the transcript. No files were saved (the task asks
for none). Never from Nadia's own rating (6 of 7).

## Grade: S (success)

Success B holds on the last screen:

- **Medici selected** through the find box (05.png: "Medici -- Node", Selection 1). After the
  Degree row the selection widens to Medici and the six neighbors (Selection 7), with the panel
  still headed "Medici".
- **Fact read:** id "Medici", name "Medici", "Degree 6" in the Summary (05.png).
- **The six families named from the screen:** 06.png shows "Medici's 6 connections" with
  Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. Nadia's debrief names all six,
  spelled as on screen, and gives the count 6. This matches the answer key exactly.
- **Path:** sample, find box, the "Medici" row under Elements, the "Degree 6" row -- the
  documented Degree route, by pointer, with no detour.
- **Failure codes:** none. **Build-decided:** no. **Void:** no. At step 3 the tool found no control
  named by the placeholder text "Find nodes, edges, values" and typed nothing; nothing reached the
  app, and the next step clicked the box directly, as a person would.

## Counts

|                  | This session                                            | Reference             |
| ---------------- | ------------------------------------------------------- | --------------------- |
| Steps (real.mjs) | 5 after the start (4 that reached the app, 1 tool miss) | 6 (keyboard-led path) |
| Wrong turns      | 0                                                       | --                    |

The hesitation between the two search rows (step 4) ended in the right row and cost no step.

## False "done"

None. Nadia's claim, "the Medici married into 6 families" with the six names, is what 06.png
shows. Her one reservation (Selection 7 against the list's 6) she resolved correctly herself.

## Problems

Severity 0-4 (Nielsen); an opinion is held one level down. None of these is a build defect under
the criteria (no crash, no dead control, no wrong count: Selection 7 correctly counts Medici plus
six), so no scripted reproduction was made and `rounds/round-2/repro/r2-s24/` was not needed.
"Confirmed" means seen in two or more participants.

| #   | Sev | Kind          | Problem                                                                                                                                                                                                                                                                                                                          | Evidence                                     |
| --- | --- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | 2   | behavior      | Two numbers for one answer: "Selection 7" on the left beside "Medici's 6 connections" on the right, with nothing saying the 7 includes the Medici. Nadia worked it out but said QA would ask which number is right; a reviewer who copies the selection count writes 7. Confirmed: the same 18-vs-17 split in r2-s19 and r2-s20. | Step 6, 06.png.                              |
| 2   | 2   | wording       | "Degree 6" is jargon: Nadia guessed it meant six links and only knew once the list said "6 connections". Nothing says a connection in this sample is a marriage. Confirmed: r2-s19 and r2-s20 report the same for "Degree 17".                                                                                                   | Step 5, 05.png; step 6, 06.png.              |
| 3   | 1   | behavior      | Clicking a details row ("Degree 6") changes the selection on the canvas (1 to 7) without saying so. Nadia asked whether she had changed something or only viewed it. One participant; unconfirmed.                                                                                                                               | Step 6, 05.png vs 06.png (Selection 1 to 7). |
| 4   | 1   | behavior      | The find box offers two rows for one name, "Medici" under Elements and "Select where name is Medici (1)" under Values, with nothing saying how they differ. She guessed the first, which was right. One participant; unconfirmed.                                                                                                | Step 4, 04.png.                              |
| 5   | 1   | behavior      | No names are drawn on the dots by default, so the picture alone cannot find the Medici or show who they married; search and the list did all the work. Confirmed: r2-s19 and r2-s20.                                                                                                                                             | Steps 2-6, 02.png, 06.png.                   |
| 6   | 1   | accessibility | The find box's visible text is "Find nodes, edges, values" but no control carries that name, so a voice-control user who speaks the visible words does not reach it (WCAG 2.5.3, taking the placeholder as its visible label). Confirmed: r2-s03 and r2-s20.                                                                     | Step 3 (tool: nothing called that).          |

What worked, for the record: the find box was the first place Nadia looked and found the Medici at
once; the selected dot turned gold; the Degree row opened an alphabetical, complete list headed
with the count, and the six neighbors lit up in the drawing; four clicks from the start page to
the answer, well inside her five-to-ten-minute budget.
