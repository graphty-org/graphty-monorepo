# Grade: session r2-s37 -- Ruth (returning), running club (T21 A), the list was updated

**Grade: S** (success). The last screen (`10.png`) shows the rerun on the new list: the left panel
reads "Graph friends-v2.csv", the PageRank inspector's subtitle "ran Oct 9, 8:37:08 PM" (the run
before was 8:35:24 PM, `02.png`), no "Data changed since this run" bar, the key titles without
"out of date" and the range 0.02872 to 0.08012, "20 of 20 have a value", and the Top 10 starting
Ava 0.08012, Farah 0.06556, Hana 0.06428, Ivan 0.06141. Ruth reported first before Farah
(0.06394, read from the Values before she touched the file, `02.png`) and first now Ava (0.08012).
Both names match the key. She took the round 2 route through the source's inspector menu with no
detour.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `friends-ranked.txt` (one PageRank run, its Influence layer, source
friends.csv).

## The answer against the key

- **First before: Farah (right).** `02.png`, Top 10 "Farah 0.06394", ran 8:35:24 PM on
  friends.csv.
- **First now: Ava (right).** `10.png`, Top 10 "Ava 0.08012", key 0.02872 to 0.08012, as the key
  gives (`rounds/r2/pilot/T21A/07.png`). The rest of her top four (Farah 0.06556, Hana 0.06428,
  Ivan 0.06141) also matches.
- **Replaced, not added (right).** `07.png`, "Replace: friends-v2.csv", "Was 20 nodes, 41 edges;
  now 20, 41"; `08.png` "Graph friends-v2.csv", Overview Nodes 20, Edges 41. `work.json`: the run
  and all three layers kept, friends.csv under "gone" in sources, friends-v2.csv in its place --
  the replacement the task asks for, not lost work.
- **Not a trap.** Not `stale-read`: she saw the "out of date" key and the old Top 10 in `08.png`
  and `09.png` and named no one from them as the new first. Not `added-not-replaced`. She chose
  "Replace with file...", not "Edit source...".

## Measures

- **Steps:** 9 `real.mjs` steps after the start (`02.png` to `10.png`). The round 2 route (the
  source inspector's "..." menu) is 8 walked; the extra step is the file upload taken on its own
  rather than chained to "Replace with file...". No step was wasted. She reached the "..." by its
  position (`--click-at 1419,73`), which opened the "Source actions" menu (`05.png`).
- **Wrong turns:** 0.
- **False "done":** none. "I'm done" (`10.png`) is true: both names, the replacement and the
  rerun are on screen. truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. Replace returned to the map with the key marked "out of date"
  and the run row's icon changed (`08.png`); Rerun redrew the key and the Top 10 and changed the
  time (`10.png`).
- **Numbers that disagree (bar 5):** none on the final screen. Between Replace and Rerun the
  histogram, "20 of 20 have a value, 0.03779 to 0.06394" and the old Top 10 stay at full contrast
  under a "Data changed since this run" bar (`09.png`), as the key records; Ruth read them as old.
- **Wrong weight reading without a sign (bar 7b):** no. Both runs' Made with say "weight (read as
  closer)" and "Its meaning was not set, so this run assumed a higher weight means closer"
  (`02.png`, `10.png`). She quoted "closer" from the Replace page's line ("PageRank and communities
  read a higher weight as closer") as her reason to leave "Higher means: Not set" alone
  (`07.png`, transcript step 07) -- recorded as the key asks.
- **Broken habit:** none. Her history's habit (read the top ten from the run's Values) was the
  first move and worked.
- **"Added" heading:** not seen. After this build's replacement she did not return to the source's
  inspector, so the "Added"/"Loaded" heading the key mentions was never on her screen.
- **Moved drawing:** the drawing kept its shape and zoomed out slightly (`07.png` to `08.png`);
  she did not read it as lost work.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; the file chooser and
  the upload worked.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                                                       | Evidence                                                                                                                         |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The only way to swap the file is under an unlabeled "..." in the source's inspector (or the Sources row's hover or right-click menu). The file name in the Graph panel's title ("Graph friends.csv") does nothing. Ruth found it after two guesses (Data, then the file) and said a first-timer might not open the "...".                                                  | `03.png`, `04.png`, `05.png`; transcript end: "the Graph list names the file but does nothing with it ... A first timer might not open that '...'" |
| 2   | 2        | missing feature | After Rerun the old ranking is gone: the program keeps no before-and-after view and no copy of the earlier Top 10. Ruth could answer "who was first before" only because she wrote it down before replacing. A reader who had not would have no way to recover it.                                                                                                     | `09.png` (old Top 10) against `10.png` (replaced in place); transcript end: "if I had not copied it I could not have told my editor who was first last month" |
| 3   | 1        | comprehension   | "Higher means: Not set" on the Replace page made Ruth stop and read the line under it twice. The line was enough for her to leave it, quoting "closer" as her reason.                                                                                                                                                                                                       | `07.png`; transcript step 07 and end: "I had to read it twice"                                                                   |
| 4   | 1        | consistency     | Between Replace and Rerun the run's histogram, its "20 of 20 have a value" line with the old range, and its old Top 10 (Farah first) stay at full contrast with nothing on them saying they are old; only the bar above and the key's titles carry the "out of date" mark. Ruth read them correctly as old, so no wrong answer resulted.                                     | `09.png`                                                                                                                         |
| 5   | 1        | navigation      | After the replacement the app returns to the Graph inspector (Overview), not to the run, and no Rerun is on screen; the run row's only sign is a history icon with no words. Ruth clicked PageRank on her own to find Rerun. One extra step, no confusion.                                                                                                                  | `08.png`; transcript step 08                                                                                                     |

No severity 3 or 4: the answer was right, nothing was lost, and every stale value was marked
somewhere she looked. The problems are about how the swap is found and what the program does not
keep.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
