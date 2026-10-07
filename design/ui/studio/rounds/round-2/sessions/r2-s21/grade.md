# Grade: session r2-s21 -- Grace (nonprofit operations analyst), T12 prompt A (Les Miserables, Javert)

**Grade: SD** (success with difficulty). Grace opened Les Miserables, found and selected Javert,
read a fact about him (Degree 17), and reached the on-screen list "Javert's 17 connections"
through the Degree row. She named all 17 neighbors from that list and gave the count 17. The
difficulty: her first click, on the chevron at the right end of the "Degree 17 >" row, did nothing
(the chevron is outside the button's hit area; reproduced, see problem 1). She hesitated, hovered
the row looking for a hint, and only then clicked the word "Degree", which opened the list.

Build seen: `4a7a1a7fbdba graphty@0.8.53` (session.json), at 1440 x 900, no uncommitted changes.
No files were downloaded (none needed for this task; there is no downloads folder).

## Against the success definition (prompt A)

- **Javert selected:** `05.png` -- the right panel reads "Javert -- Node", Selection 1, his dot
  highlighted in yellow.
- **One fact read:** `05.png` -- Summary: id Javert, name Javert, Degree 17. She reported Degree 17.
- **Neighbors listed on screen by name:** `08.png` (last screenshot) -- "Javert -- Neighborhood",
  heading "Javert's 17 connections", 17 names in alphabetical order, Selection 18.
- **Named at least three and said 17:** her answer lists all 17, spelled exactly as on screen and
  matching the reference list (Babet ... Woman2), and says 17.
- **Route:** the Degree row ("Degree 17 >"), drawn by the chevron. First tried the chevron itself
  (dead), then the word "Degree" (worked). Not G, not the context menu, not dots one at a time.

## Measures

- **Steps:** 9 `real.mjs` actions after the start (`02.png` to `08.png`): No thanks, open the
  sample, a tool miss on the Find box (step 3, changed nothing), click the box, type, pick the
  suggestion, click the chevron (dead), hover the row, click "Degree". Leaving out the consent
  dismissal and the tool miss, 7 against the success path's 6 (open; `/`; type; Down; Enter;
  Degree), about 1.2x. The two extra are the dead chevron click and the hover it led to.
- **Wrong turns:** 1 (step 6, the chevron click that opened nothing; caused by the build defect
  below, not by a misreading).
- **False "done":** none. "The task is done" at step 7 is made beside `08.png`, which shows the 17
  names and "Javert's 17 connections"; true. truth_on_screen: not applicable.
- **Counts against the drawing:** Selection 18 beside "17 connections" (`08.png`) is Javert plus
  his 17; correct, but she counted twice before she saw it (problem 4).
- **Tool prints:** step 3, `--click "Find nodes, edges, values"` found nothing: the box's
  accessible name is "Find" and the longer text is its placeholder. She clicked the box by
  position, which a person would simply do; no app state changed. Not a tool fault; the session is
  not void. Step 6 reported the click at 1410,236 landing on group "Summary values", which is the
  defect, not a tool fault: a person clicking the drawn chevron hits the same spot. session.log
  is empty.
- **Build-decided:** no (the defect cost one wrong turn; the task was still completed).
  **Void:** no.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | build-defect | The chevron drawn at the right end of the "Degree 17 >" row is not part of the button "Degree 17": a click on it lands on the surrounding group "Summary values", only shades the row, and opens no list. The chevron is the cue that the row opens something, so the most natural click on it is the one that does nothing. Confirmed: same in r2-s19, and reproduced twice on this build. | Step 6, `06.png`; repro `rounds/round-2/repro/r2-s21/repro.sh` (run1/, run2/: at 1410,236 group "Summary values", no "Javert's 17 connections" in `05.png`; at 1252,236 button "Degree 17", list in `06.png`) |
| 2 | 1 | wording | "Degree" on the Summary does not say it means "how many characters he is tied to"; she guessed, and would not put the word on a slide. She said "17 connections" on the row would have made her click it at once. | Step 5, `05.png`; debrief |
| 3 | 1 | behavior | Selecting Javert from Find does not bring him into view; he stays a small yellow dot in the crowded middle, so she could not follow his lines. Did not cost her the task. | Step 5, `05.png` |
| 4 | 1 | wording | Selection says 18 while the heading says "Javert's 17 connections"; nothing says the 18 includes Javert himself, and she counted twice. Also in r2-s20, so confirmed at two participants. | Step 7, `08.png` |
| 5 | 1 | behavior | No names are drawn on the dots by default, so Javert cannot be found by looking; she had to search. Also in r2-s20. | Step 2, `02.png` |
| 6 | 1 | accessibility | The search box's accessible name is "Find" while the visible text is "Find nodes, edges, values"; speaking or targeting the visible words does not reach it (WCAG 2.5.3, if the placeholder is taken as its visible label). Also in r2-s03 and r2-s20. | Step 3 (no control found by the visible text); step 4 reports combobox "Find" |
| 7 | 0 | opinion | The node Summary (id, name, Degree) felt thin for "what the program knows about him". | Step 5, `05.png`; debrief |
