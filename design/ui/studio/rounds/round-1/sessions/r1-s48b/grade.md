# Grade: session r1-s48b -- Elena, first look at the program (friends.csv)

**No grade; the session is incomplete and should be run again.** The first-look task is measured,
not graded. This session cannot supply its main measure: the transcript stops in its third line,
mid-sentence ("Participant: Elena, a product manager who has never used"), so nothing Elena said
was recorded -- no reading of the result and no verdict on whether she would keep using the
program. The nine screenshots are complete and consistent, and the app was working at every
step, so the session ended on the session agent's side, not the app's. The screenshots are kept
for the measures they can answer (below).

## What the screenshots show

1. `01.png`: the empty start screen with the usage card.
2. `02.png`: friends.csv drawn in one step (usage card answered, file opened). Overview reads
   Nodes 20, Edges 41, Directed, Components 1 -- the reference values.
3. `03.png`: clicked a dot; the side panel names it Pia, Degree 4.
4. `04.png`: opened Analyze; the list shows PageRank tagged "Start here".
5. `05.png`: picked PageRank; the damping factor 0.85 and Run are shown.
6. `06.png`: ran it. Every dot is colored, the key reads "Color: Influence 0.04382 to 0.06608",
   and Pia reads "Influence 0.04736, #11 of 20".
7. `07.png`: clicked the darkest dot in the middle: Ava, 0.06423, #2 of 20.
8. `08.png`: opened the Influence row: Top 10 Farah 0.06608, Ava 0.06423, Hana 0.05883, ...
9. `09.png`: clicked the dot half hidden behind another at the bottom: Farah, 0.06608, #1 of 20.

## Measures

- **Data used:** friends.csv.
- **Steps to the first drawing:** 1 step after the start (`02.png`).
- **Analysis run without being asked:** yes -- PageRank, the tagged "Start here" entry, finished
  at step 6.
- **Result read correctly:** not recorded (no words). What was on screen matches the reference
  values: top three Farah 0.06608, Ava 0.06423, Hana 0.05883, range 0.04382 to 0.06608. Her last
  two clicks went to the #2 and #1 people right after the Top 10 was open, which looks like
  checking the list against the drawing, but that is a guess.
- **Verdict (keep using it or not) and reason:** not recorded.
- **Steps:** 8 after the start. **Wrong turns:** 0 (there is no success path for this task; no
  step was undone or abandoned).
- **False "done":** none -- no claims were recorded. truth_on_screen: not applicable.
- **Build-decided:** no. **Void (tool fault):** no; the tool did what each step asked.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | build-defect | The Influence "Values" chart draws 20 bars of exactly the same height, as if the values were spread evenly. They are not: the median, 0.04736, sits in the bottom sixth of the 0.04382 to 0.06608 range, so at least 10 of the 20 values fall in the first few bands and several bands near the top must be empty. The chart gives a wrong picture of the distribution. Same on every run. | step 8 `08.png`; repro `rounds/round-1/repro/r1-s48b/06.png` (start empty, "No thanks", open friends.csv, Shift+A, PageRank, Run, click "Influence") |
| 2 | 2 | behavior | The top-ranked person, Farah, is drawn almost entirely behind another dot at the bottom of the drawing; only a sliver shows. Two other dots overlap at the bottom left. The answer to "who matters most" is the hardest dot to see or click. | step 2 `02.png`, step 9 `09.png`; the same layout in the repro `06.png` |
| 3 | 1 | behavior | No names are drawn on the canvas after opening a file, so the only way to find out who a dot is, is to click it. Three of her eight steps were clicks to identify a dot. | step 3 `03.png`, step 7 `07.png`, step 9 `09.png` |
| 4 | 1 | wording | The analysis is picked as "PageRank" and then shown everywhere as "Influence" (row, key, side panel), with no visible link between the two names until "Made with" in the Values tab. Also seen in r1-s03b, so confirmed. | step 5 `05.png`, step 6 `06.png` |
| 5 | 1 | behavior | The selection highlight repaints the selected dot an olive yellow, so while a person is selected their own Influence color cannot be seen -- exactly when she is comparing it with the key. | step 7 `07.png`, step 9 `09.png` |
