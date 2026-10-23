# Grade: session r5-s39b -- Alex (regular analyst), running club (T21 A), the list was updated

**Grade: S** (success). The last screen (`14.png`) matches the answer key's A end state after
Rerun: the left panel reads "Graph friends-v2.csv" with the PageRank row at 20 and no out-of-date
mark, the inspector's subtitle reads "Measure ran Oct 11, 10:37:10 AM", the Distribution line reads
"20 of 20 have a value, 0.02872 to 0.08012", and the Top 10 starts Ava 0.08012, Farah 0.06556,
Hana 0.06428, Ivan 0.06141. The drawing's key reads 0.02872 to 0.08012 for both Size and Color,
with no "out of date" in its titles. Alex named Farah (0.06394) as first before and Ava (0.08012)
as first now -- both right. The only thing added on the last screen is the toast "Saved friends in
this browser." from an unasked Save.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of
the criteria, at 1440 x 900, with no uncommitted changes in the tool's checkout. The setup (load
friends.csv, run PageRank, size and color by PageRank) produced the expected start: one run, three
layers, one source (`work-start.json`, `01.png`).

## The answer against the key

- **First before (right).** Farah 0.06394, read from the Values tab's Top 10 before any change
  (`02.png`), not from a stale screen after Replace.
- **First now (right).** Ava 0.08012, read after Rerun (`11.png`, still on `14.png`). The rest of
  the new top three named in the wrap-up also matches the key (Farah 0.06556, Hana 0.06428).
- **Replaced, not added (right).** The Replace page reads "Replace: friends-v2.csv", "Was 20 nodes,
  41 edges; now 20, 41", confirm button "Replace" beside Cancel (`08.png`); afterwards the graph is
  titled friends-v2.csv. `work.json` lists friends.csv under "gone" in sources, which the key says
  is the replacement itself, not lost work: the PageRank run and all three layers (Node defaults,
  Edge defaults, Influence) are kept from start to end.
- **Stale-read trap (avoided).** After Replace the old Top 10 (Farah first) stays on screen under
  the "Data changed since this run" bar (`10.png`). Alex read the bar and the key's "out of date"
  titles as meaning the list was old, and pressed Rerun before naming anyone now.
- **"Closer" line (recorded as the key asks).** On the Replace page Alex left Higher means at "Not
  set" because "it says PageRank reads higher as closer, same assumption the old run used"
  (transcript step 08) -- the word comes from the page's own line under Higher means (`08.png`).
  Nothing there needs choosing for this task, so it does not affect the grade.

## Measures

- **Route:** the key's source-inspector route (left click on the Sources row, then the source's
  "..." menu), after a two-step wander in the Graph panel: Values; the "friends.csv" name in the
  Graph panel title; its "..." (Graph actions); Escape and Data; the friends.csv Sources row;
  Source actions; "Replace with file..." with friends-v2.csv; Replace; PageRank (the run row, now
  marked out of date); Rerun. Then an unasked Save: Main menu, Save, Save in the "Save friends as"
  dialog.
- **Steps:** 13 `real.mjs` steps (plus `--end`): 10 to the answer against the source-inspector
  route's 8 (2 over, the two wrong turns), plus 3 for the unasked Save.
- **Wrong turns: 2.**
  1. `--click "friends.csv"` in the Graph panel's title (`03.png`): opened the Graph inspector
     (20 nodes, 41 edges, "From friends.csv"), which offers no way to replace the file. Abandoned.
  2. `--click-at 1419,73` on that inspector's "..." (`04.png`): Re-run layout, Reshuffle layout
     seed, Add note -- nothing about the file. Closed with Escape.
  Both are in the Graph place, which a returning user's history names, so they count under the
  "broken habit" bar: the file name at the top of the Graph panel looks like the file's own
  control and leads nowhere. Not seen in the other graded round 5 sessions of this task (r5-s37b,
  r5-s38b, r5-s40b went to Data or the main menu first), so one session so far, not confirmed.
- **Recovery:** yes -- the session had wrong turns and still succeeded.
- **First move:** `--click "Values"` to note the first name before changing anything.
- **False "done":** none. Every claim in the wrap-up (Farah 0.06394 before; Ava 0.08012 now,
  Farah 0.06556, Hana 0.06428; still 20 nodes and 41 edges; run, sizing and coloring kept; saved)
  is on screen in `02.png`, `08.png`, `11.png` and `14.png`. truth-on-screen holds.
- **Silent commit:** none. The Replace page showed the counts before the commit (`08.png`).
- **Numbers that disagree:** none.
- **Positions after Replace:** the drawing keeps its shape; the camera zooms out slightly
  (`02.png` against `11.png`), as the key expects on A. Alex did not read it as lost work.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. 14 screenshots for the 13 steps plus the start;
  `leaks.json` shows no leaks over 30 calls.
- **Scripted exit:** not applicable; Alex finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                       | Evidence                                                                                              |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The file name in the Graph panel's title ("Graph friends.csv") looks like the place to act on the file, but it opens the Graph inspector, whose "..." holds only layout and note items. Replace lives only under Data, on the Sources row's right-click menu or the source inspector's "...". Two wrong turns. | `03.png`, `04.png`; transcript steps 02-04 and "What took longest", first bullet                     |
| 2   | 1        | comprehension   | The Replace page asks "Higher means: Not set" again every time, with no sign of what the earlier run used; Alex reasoned it out from the page's "closer" line and wants the meaning set once and kept.                                                                                                       | `08.png`; transcript step 08 and "What took longest", fourth bullet                                  |
| 3   | 1        | feedback        | Between Replace and Rerun the old Top 10 and Distribution stay at full contrast with nothing on them marking them out of date; only the bar, the row's history icon and the key titles say so. After Rerun nothing keeps the earlier list for a before/after. Alex was not misled but had to note Farah first. | `10.png` (Top 10 Farah first under "Data changed since this run"); `11.png`; "What took longest", second bullet |
| 4   | 1        | layout          | The left click on the Sources row opens an edge-table drawer along the bottom of the canvas that stays open through Replace, Rerun and Save, pushing the drawing and its toolbar up. Alex did not remark on it.                                                                                               | `06.png` to `14.png`                                                                                  |
| 5   | 1        | expectation     | Save on the project opened "Save friends as" with a name box; Alex expected a plain save. The project had never been saved in this browser ("Local only" in the top bar), so a first-save name prompt is reasonable; held down as opinion-only. Dev (r5-s38b) met the same prompt and accepted it.          | `13.png`; transcript step 13 and "What took longest", last bullet                                    |
