# Grade: session r2-s26 -- Sam (keyboard only), T12 prompt B (Florentine families, the Medici)

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json), 1440 x 900, no uncommitted changes.
Keyboard only (`--key`, `--type`). Graded from the last screenshot (23.png) and the transcript.
No files were saved (the task asks for none). Never from Sam's own rating (5 of 7).

## Grade: SD (success with difficulty)

Success B holds on the last screen:

- **Medici selected** through the find box (20.png: panel "Medici -- Node", Selection 1, the dot
  ringed). After the Degree row the selection widens to the Medici and his six neighbors (23.png:
  Selection 7, seven dots ringed, panel "Medici -- Neighborhood").
- **Fact read:** id "Medici", name "Medici", "Degree 6" in the Summary (20.png).
- **The six families named from the screen:** 23.png shows "Medici's 6 connections" with
  Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. Sam's ending names all six,
  spelled as on screen, with the count 6. This matches the answer key exactly.
- **Route:** the Degree row, by keyboard: find box, type, Down, Enter (focus moves to "Summary
  values"), Tab to "Degree 6", Enter. Focus moved into the new list by itself. This is the
  documented keyboard path, except that Sam reached the find box by walking focus instead of `/`.
- **Why SD, not S:** the result came on the documented route, but after three dead ends and a
  stretch where Sam could not see where focus was. After the network opened, focus sat on the
  drawing with no ring (09.png, 14.png); Sam spent 10 keys hunting for the find box, which `/`
  reaches in one, through a detour into the toolbar that ended on "Quick actions", not search.
- **Failure codes:** none. **Build-decided:** no (the invisible focus cost keys, not the result).
  **Void:** no; every step was a key a person could press.

## Counts

|                  | This session                                                                                            | Reference                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Steps (real.mjs) | 22 after the start                                                                                      | 6 (the pointer path)                           |
| Keys pressed     | 31 (10 to open the sample, 10 to reach the find box, 6 letters, 2 to choose Medici, 3 to open the list) | 30 (the keyboard path for Florentine families) |
| Wrong turns      | 3                                                                                                       | --                                             |

The key total is close to the reference only because the reference counts an Escape Sam did not
need and Sam typed nothing extra. Against the shortest keys Sam could have pressed from the start
screen (8 Tabs, Enter, `/`, 6 letters, Down, Enter, Tab, Enter = 20), 11 keys were spent on the
three wrong turns:

1. Step 6: ArrowDown on the Les Miserables card (07.png), expecting a list. Nothing moved.
2. Steps 9-16: after the load, Tab, Tab, Shift+Tab and three ArrowRights to read the toolbar's
   magnifier ("Quick actions Ctrl+K", 13.png), then four Shift+Tabs back through the drawing, the
   panel resize handle and the left list to the find box (17.png). 10 keys where `/` is one.
3. Step 20: ArrowDown inside "Summary values" (21.png), which changed nothing; Tab reached
   "Degree 6".

## False "done"

None. Sam's claims match the screen: "Parts 1 and 2 done" at 20.png (Medici selected, id, name,
Degree 6 shown) and the six families with the count at 23.png.

## Problems

Severity 0-4 (Nielsen); an opinion is held one level down. "Confirmed" means seen in two or more
participants; a build defect is confirmed at one once reproduced as a scripted path.

Repro for problems 1, 2 and 4: `rounds/round-2/repro/r2-s26/repro.sh` (logs `run1.log`,
`run2.log`), Sam's own keys in screen-reader mode so the tool prints the focused element after
every step. Both runs: Enter on "Open the Florentine families sample" leaves focus on "Canvas (no
name)" (`run1/03.png`, no ring anywhere); Tab goes to "Analyze" and Shift+Tab back to "Canvas (no
name)" (`run1/05.png`, no ring); `/` puts focus in combobox "Find" (06); after Enter on Medici,
focus is on group "Summary values", ArrowDown leaves it there and opens nothing (10,
`--expect-not "Medici's 6 connections"` held); Tab reaches button "Degree 6" and Enter opens
region "Medici's 6 connections" (12, `--expect` held).

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                                             | Evidence                                                                    |
| --- | --- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | 3   | build-defect | The drawing takes keyboard focus but draws no focus indicator and has no accessible name ("Canvas (no name)"). Focus lands there after a sample opens and again on Shift+Tab from Analyze, and a sighted keyboard user sees focus vanish (WCAG 2.4.7). Confirmed (reproduced; also r2-s01, r2-s11). | Step 9, 09.png; step 14, 14.png. Repro above, `run1/03.png`, `run1/05.png`. |
| 2   | 2   | behavior     | Nothing shows that `/` jumps to the find box: the box reads only "Find nodes, edges, values", with no key, while every toolbar tooltip prints its key (Analyze Shift+A). With focus starting on the drawing, Sam walked 10 keys to the box that one key reaches. The `/` key works (reproduced).    | Steps 9-17, 09.png-17.png. Repro step 06.                                   |
| 3   | 1   | wording      | The magnifier at the end of the toolbar reads as search but is "Quick actions Ctrl+K"; Sam went to it first looking for node search. One participant; unconfirmed.                                                                                                                                  | Step 13, 13.png.                                                            |
| 4   | 1   | behavior     | After choosing a node, focus moves to "Summary values", a group drawn with a plain white box that reads as a border, not focus; arrow keys do nothing inside it, and only Tab reaches "Degree 6". Cost one key. One participant; unconfirmed (the behavior itself reproduces).                      | Steps 20-22, 20.png-22.png. Repro steps 09-11.                              |
| 5   | 0   | opinion      | The sample cards look like a list but do not answer the arrow keys; only Tab moves between them. Tab between buttons is the expected pattern, so this is an expectation, not a defect. Opinion, held down from 1.                                                                                   | Step 6, 07.png.                                                             |

What worked, for the record: the find results took ArrowDown and Enter; focus followed the
choice into the right column and then into "Medici's 6 connections" after Enter on the Degree
row; the list is alphabetical, complete and headed with the count; the six neighbors lit up in the
drawing and Selection read 7, so the count, the list and the picture agreed.
