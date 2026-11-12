# Grade: session r2-s25 -- Ruth (data journalist), T12 prompt B (Florentine families, the Medici)

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json), 1440 x 900, no uncommitted changes.
Graded from the last screenshot (09.png) and the transcript. No files were saved (the task asks
for none). Never from Ruth's own rating (6 of 7).

## Grade: SD (success with difficulty)

Success B holds on the last screen:

- **Medici selected** through the find box (06.png: "Medici -- Node", Selection 1, the dot ringed).
  After the Degree row the selection widens to the Medici and the six neighbors (09.png:
  Selection 7, seven dots ringed), with the panel headed "Medici -- Neighborhood".
- **Fact read:** id "Medici", name "Medici", "Degree 6" in the Summary (06.png).
- **The six families named from the screen:** 09.png shows "Medici's 6 connections" with
  Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. Ruth's ending names all six,
  spelled as on screen, and gives the count 6. This matches the answer key exactly.
- **Route:** the Degree row ("Degree 6 >"), drawn by its chevron. First tried the chevron itself,
  which did nothing (a reproduced build defect, problem 1), then hovered the row, then clicked the
  row by its name and got the list.
- **Why SD, not S:** the list was reached on the documented route, but only after a dead click on
  the row's own cue and a hover to find out what the row was. Ruth: "If I hadn't been stubborn I
  would have gone hunting elsewhere."
- **Failure codes:** none. **Build-decided:** no (the defect cost steps, not the result).
  **Void:** no. At step 4 the tool found no control named by the placeholder "Find nodes, edges,
  values" and typed nothing; nothing reached the app, and the next step clicked inside the box, as
  a person would.

## Counts

|                  | This session                                           | Reference           |
| ---------------- | ------------------------------------------------------ | ------------------- |
| Steps (real.mjs) | 8 after the start: 7 that reached the app, 1 tool miss | 6 (the Degree path) |
| Wrong turns      | 1                                                      | --                  |

The wrong turn is step 7, the click on the chevron that opened nothing; step 8 (the hover) is the
recovery from it. Leaving out the usage card and the tool miss, the session took 6 app actions
against the path's 6 (the path's keyboard steps "/", type, Down, Enter are 2 pointer actions here:
click the box and type, click the result), so about 1.5x with the two extra being the dead chevron
click and the hover.

## False "done"

None. Ruth's claim, "the Medici married into 6 families" with the six names, is what 09.png
shows, and she checked it three ways (Degree 6, the list of 6, Selection 7 with the Medici
included). Her statement that the program knows only id, name and degree also matches 06.png.

## Problems

Severity 0-4 (Nielsen); an opinion is held one level down. "Confirmed" means seen in two or more
participants; a build defect is confirmed at one once reproduced as a scripted path.

Repro for problem 1: `rounds/round-2/repro/r2-s25/repro.sh` (logs `run1.log`, `run2.log`). It
follows Ruth's own path (find box, "Medici", chevron, "Degree 6"). Both runs: the click at the
chevron (1410,236) lands on group "Summary values" and no list opens (`run1/06.png`,
`run2/06.png`, `--expect-not "Medici's 6 connections"` held); a click on the button "Degree 6"
opens "Medici's 6 connections" (`run1/07.png`, `run2/07.png`, `--expect` held).

| #   | Sev | Kind          | Problem                                                                                                                                                                                                                                                                                                                                                                                        | Evidence                                                                 |
| --- | --- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | 3   | build-defect  | The chevron drawn at the right end of the "Degree 6 >" row is outside the row's button. A click on it lands on the surrounding "Summary values" group, which only shades the row and opens nothing. The chevron is the one cue that the row leads to "who", so the control a reader is most likely to click is the one that does nothing. Confirmed (reproduced; also r2-s19, r2-s21, r2-s23). | Step 7, 07.png (tool: "at 1410,236: group Summary values"). Repro above. |
| 2   | 2   | behavior      | Nothing says the Degree row opens the list of neighbors: the row has no tooltip on hover (tool: "tooltip: null") and no words beyond "Degree 6 >". Ruth found it only by persisting. Confirmed (r2-s19, r2-s21).                                                                                                                                                                               | Step 8, 08.png.                                                          |
| 3   | 2   | wording       | The list says "connections", not what a connection is in this file; Ruth would have to tell her editor that a connection here means a marriage. Confirmed (r2-s24 reports the same for "Degree 6").                                                                                                                                                                                            | Step 9, 09.png.                                                          |
| 4   | 1   | behavior      | No names are drawn on the dots by default, so the picture alone cannot tell which ringed dot is which family; search and the list did all the work. Confirmed (r2-s19, r2-s20, r2-s24).                                                                                                                                                                                                        | Steps 3-9, 03.png, 09.png.                                               |
| 5   | 1   | accessibility | The find box's visible text is "Find nodes, edges, values" but no control carries that name (its name is "Find"), so a voice-control user who speaks the visible words does not reach it (WCAG 2.5.3, taking the placeholder as its visible label). Confirmed (r2-s03, r2-s20, r2-s24).                                                                                                        | Step 4 (tool: nothing called that), step 5 (tool: combobox "Find").      |
| 6   | 1   | wording       | "Undirected, from the file: directed 0" took Ruth a second reading; she read it correctly. One participant; unconfirmed. Opinion, held one level down.                                                                                                                                                                                                                                         | Step 3, 03.png.                                                          |

What worked, for the record: the find box found exactly one Medici at once; the selected dot
ringed in the drawing; the Degree row opened an alphabetical, complete list headed with the
count, and the six neighbors lit up in the drawing, so the count, the list and the picture agreed.
