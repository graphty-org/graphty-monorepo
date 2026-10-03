# Grades: rerun last month's work on next month's data

Task as given: "Last month you built groups, rankings and colors on March's card transfers, which
are open now. April's export has arrived as transfers-2026-04.csv. You want everything you built
to run again on April's numbers in place of March's, without rebuilding it."

The start screen shows March's project ("Transfers, March 2026") with Louvain groups coloring the
drawing and a "Links in (count)" ranking. Nothing on it says April is waiting.

What counts as success: open the Data place, open the transfers file's own menu, choose
"Replace with file...", pick transfers-2026-04.csv, Load, read the result (title "Transfers, April
2026", 8,370 transfers, the yellow warning that Louvain and the other runs still show March's
results, "Open Louvain"), then rerun Louvain or say they would.

Graded on what was on screen at the end and what the participant concluded, not on their own
verdict. Renders are in tmp/round-8-sessions/r8-t26--<persona>/.

## Outcomes

| Participant | Their call | Grade | Why |
|---|---|---|---|
| Fraud analyst (Sarah) | success with difficulty | success with difficulty | Clicked the file name first (column editor, a dead end), then hit the whole graph's "..." menu before the file's own menu. From there: Replace, April, Load, read the warning at once, Open Louvain, Rerun. Afterwards went on to Version history to check that March was kept, clicked "PageRank" in its log and ended in an unrelated sample project (17.png). The task was complete before that detour, so it does not change the grade, but the end screen is not hers. |
| Alert reviewer (Nadia) | success with difficulty | success with difficulty | Four wrong turns: could not reach the file's "...", opened the graph menu, opened the column editor twice, then "Open project or file..." with April, which went to "Open as a new graph"; she cancelled it. That is the listed difficulty case. Reached Replace by a second door (the inspector's "Data version: March" link, then Version history, then "Replace with file..."), loaded April, read the warning, opened Louvain, pressed Rerun (13-17.png). |
| Analyst Alex | success with difficulty | success with difficulty | Looked at the title menu and rejected "Open project or file" without opening it. Wrong turns: the column editor, then the graph's "..." menu. Then the success path end to end, read the warning, Open Louvain, Rerun (10-12.png). |
| Supply chain analyst (Dana) | success with difficulty | success with difficulty | Column editor, then the graph's "..." menu, then found the file's menu by its tooltip. Replace, April, Load, read the warning, Open Louvain, Rerun (10-12.png). |
| Marketing analyst (Jordan) | success with difficulty | success with difficulty | Column editor, file name clicked again, then the graph's "..." menu. Then the success path, read the warning, Open Louvain, Rerun (09-11.png). |
| Recipe recipient (Tom) | gave up | gave up | Tried "Open project or file..." first and backed out of "Open as a new graph". Second try reached the file's menu and saw "Replace with file...", but would not press it, because nothing there said his groups and colors would survive (08.png). April never loaded. Not a failure: he did not add April beside March or open it as a new project. |
| Genomics postdoc (Maren) | success with difficulty | success with difficulty | Column editor, then the graph's "..." menu, then the file's menu. Replace, April, Load, read the warning, Open Louvain, Rerun (10-14.png). |

Totals: 0 success, 6 success with difficulty, 0 failure, 1 gave up. Completion 6 of 7. No one
reached the replace without a wrong turn.

Single Ease Question (1-7): 4, 3, 5, 5, 4, 2, 5. Median 4.

## What the grades rest on

- The out-of-date warning worked. All 6 who loaded April read the yellow box right away, and
  every one of them said, unprompted, that the colors on screen were still March's and that a
  screenshot would have been wrong. Nobody needed the Graph list's warning mark to notice. That
  half of the task is close to effortless.
- The cost is all in finding the swap. 6 of 7 clicked the file name first and got the column
  editor, which has no way to change the file; 4 then clicked its file name too. "Edit: transfers"
  looks like where a file would be swapped and is not.
- 6 of 7 opened the whole graph's "..." menu in the panel header while aiming for the file's
  "..." on the row below, and saw "Clear graph data" in it. Part of this is the test harness:
  participants click by name and could not point at the row's dots, so they tried names until one
  matched. In a real browser the row's dots are a direct click. Weigh this one lower than the
  column-editor finding.
- Once the file's menu was open, "Replace with file..." was read as the right words by every
  participant who saw it, and 4 separately said "Add rows from file..." would have mixed March
  and April. The labels are not the problem; the place is.

## Problems, with evidence counts and severity (0-4)

1. "Louvain and the other runs" names one run and offers one button. 6 of 6 who loaded asked
   which other runs; 5 tried to open "Links in (count)" to check it and got "not available yet";
   it carries no stale or fresh mark, so none could tell if their ranking was on April. 3 asked
   unprompted for one "rerun everything out of date". Severity 3. The task's own wording
   ("everything you built") is exactly what this leaves unconfirmed.
2. The rerun never visibly finishes. 6 of 6 ended on "Rerunning" with March's counts (297, 182,
   ...) still in the legend and the panel. This is a skeleton limit (there is no finished-rerun
   state), not a design finding, but it means no participant ever saw "April's result is in", and
   4 said that is what would make them trust it. Draw the finished state before the next round.
3. Clicking a file in the Data place opens the column editor, which offers no file swap. 6 of 7.
   Severity 3: it is the first click nearly everyone makes, and the editor shows the file name as
   plain text that does nothing when clicked.
4. "Open project or file..." with the April file goes to "Open as a new graph" and its preview
   then shows transfers-2026-03.csv with March dates and 9,113 rows (alert reviewer 09.png). 2 of
   2 who went there backed out, and both cited the March dates as a reason to distrust the screen.
   The wrong file in the preview is a skeleton defect; it was half of why the recipe recipient
   quit. The missing design piece is that this door never offers "replace the data in the open
   project", though the app knows a project is open. Severity 3.
5. Nothing at "Replace with file..." says what survives. The recipe recipient stopped there
   because "replace" reads as destructive; 2 others, after loading, asked whether March had been
   overwritten when the title changed to April on its own. Version history answers it (March is
   kept as an older version), but only 1 participant went to look. Severity 3.
6. While Louvain is out of date its summary reads "35 communities and 26 unconnected nodes",
   mixing March's run with April's data. 2 of 6 caught it and called it the kind of number that
   ends up in a report. Severity 2.
7. The file picker on the Replace screen covers the yellow message behind it. 3 of 6. Severity 1.
8. The accounts file stays accounts-2026-03.csv after the swap and nothing says whether that
   matters. 4 of 6 raised it; all let it go because every account was found. Severity 1.
9. The preview's first six April amounts are identical to March's to the cent. 3 of 6 noticed and
   said that with real data it would make them suspect they loaded the same file twice. Sample
   data artifact; fix the fixture.

Single-voice observations, logged, not counted as findings:

- Fraud analyst: Version history's log lists a "PageRank" run that is not in the layer list, and
  a line saying 14 account ids were sent to api.anthropic.com. She called the second a compliance
  showstopper at a bank. Clicking "PageRank" there jumped to the Les Miserables sample project.
  The log's content and the link both look like skeleton leftovers; check them.
- Fraud analyst: Version history says 65 communities for April while the main screen says 35.
- Alert reviewer: Version history's preview shows the graph gray ("Nothing is colored or sized by
  a row") and made her think her colors were gone.
- Supply chain analyst: did not know what "27 components, was 1" means.
- Alert reviewer: the legend on the canvas carries no out-of-date mark; the warning lives only in
  the side panels.

## Notes for the record

- Legibility of the file lines (set in caption gray in this skeleton): no participant commented
  on it, for or against.
- The "amount is at least 1,000" filter step: no participant touched or mentioned it.
- The file's menu was reached between the Data place and the Replace screen by every participant
  who succeeded except the alert reviewer, who came in through Version history instead. That
  second door works and should stay, but it was found only because she had read the small
  "Data version: March" link on the start screen.
