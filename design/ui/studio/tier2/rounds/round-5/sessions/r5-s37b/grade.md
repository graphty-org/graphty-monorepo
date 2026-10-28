# Grade: session r5-s37b -- Grace (tier 1 graduate), running club (T21 A), the list was updated

**Grade: S** (success). The last screen (`07.png`) matches the answer key's A end state after
Rerun: the left panel reads "Graph friends-v2.csv" with the PageRank row at 20, the inspector's
subtitle reads "Measure ran Oct 11, 10:35:54 AM" with no "Data changed since this run" bar, the
Distribution line reads "20 of 20 have a value, 0.02872 to 0.08012", and the Top 10 starts Ava
0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141. The drawing's key reads 0.02872 to 0.08012 for
both Size and Color with no "out of date" in its titles. Grace named Farah (0.06394) as first
before and Ava (0.08012) as first now -- both right.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of
the criteria, at 1440 x 900, with no uncommitted changes in the tool's checkout. The setup (load
friends.csv, run PageRank, size by PageRank) produced the expected start: one run, three layers,
one source (`work-start.json`, `01.png`).

## The answer against the key

- **First before (right).** Farah 0.06394, read from the Values tab's Top 10 before any change
  (`02.png`), not from a stale screen after Replace.
- **First now (right).** Ava 0.08012, read after Rerun (`07.png`). The rest of the new top four
  also matches the key (Farah 0.06556, Hana 0.06428, Ivan 0.06141).
- **Replaced, not added (right).** The Replace page reads "Replace: friends-v2.csv", "Was 20 nodes,
  41 edges; now 20, 41" (`05.png`); afterwards the graph is titled friends-v2.csv. `work.json`
  lists friends.csv under "gone" in sources, which the key says is the replacement itself, not
  lost work: the PageRank run and all three layers (Node defaults, Edge defaults, Influence) are
  kept from start to end.
- **Stale-read trap (avoided).** Between Replace and Rerun the old Top 10 (Farah first) and the old
  range stay on screen at full contrast (`06.png`). Grace read them as old ("The list still shows
  the old numbers") and pressed Rerun before naming anyone.
- **"Closer" line (recorded as the key asks).** On the Replace page Grace left Higher means at
  "Not set" because "last time's run also had it not set and read higher as closer" -- the word
  comes from the page's own line under Higher means (`05.png`). Nothing there needs choosing for
  this task, so it does not affect the grade.

## Measures

- **Route:** the right-click route of the success path: Values, Data, right-click on the
  friends.csv Sources row, "Replace with file..." with friends-v2.csv, Replace, Rerun.
- **Steps:** 6 `real.mjs` steps (plus `--end`), equal to the success path's 6.
- **Wrong turns:** 0. The first move into a place the history names (the Data place, `03.png`)
  led on to the task through the row's right-click menu (`04.png`).
- **First move:** `--click "Values"` to note the first name before changing anything.
- **False "done":** none. Every claim in the wrap-up (Farah 0.06394 before; Ava 0.08012 now, Farah
  second 0.06556; still 20 people; styling kept) is on screen in `02.png` and `07.png`.
  truth-on-screen holds.
- **Silent commit:** none. The Replace page showed the counts before the commit.
- **Numbers that disagree:** none.
- **Positions after Replace:** the drawing keeps its shape; the camera zooms out slightly
  (`04.png` against `06.png`), as the key expects on A. Grace did not read it as lost work.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. 7 screenshots for the 7 steps; `leaks.json` shows no leaks
  over 16 calls.
- **Scripted exit:** not applicable; Grace finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                 | Evidence                                                                                                  |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Replace lives only in the source row's right-click menu (and a "..." that appears only on hover); at rest the row shows nothing that offers it. Grace found it by guessing a right-click.                               | `03.png` (row with no button); `04.png` (menu); transcript step 03 and "What confused me", first bullet |
| 2   | 1        | comprehension   | The Replace page asks "Higher means: Not set" again with no sign of what the earlier run used; Grace stopped to reason it out and asked for a line saying "same as last time".                                       | `05.png`; transcript step 05 and "What confused me", second bullet                                       |
| 3   | 1        | feedback        | Between Replace and Rerun the old Top 10 and old Distribution stay at full contrast with nothing on them marking them out of date; only the bar above the tabs, the row icon and the key titles say so. Grace was not misled. | `06.png` (Top 10 Farah first under "Data changed since this run")                                       |
| 4   | 1        | feedback        | After Rerun nothing shows that the top person changed or what the earlier list was; Grace had to remember Farah herself and wants a before/after for her board slide.                                                 | `07.png`; transcript "What confused me", third bullet                                                     |
| 5   | 1        | vocabulary      | "PageRank" is a name Grace still has to translate for her board. Outside the question the task asks.                                                                                                                  | `07.png`; transcript "What confused me", last sentence                                                    |
