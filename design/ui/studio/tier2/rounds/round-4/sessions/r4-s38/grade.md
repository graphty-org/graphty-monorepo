# Grade: session r4-s38 -- Grace (tier 1 graduate), team list (T21 B), swap team.csv for team-v2.csv and redo the ranking

**Grade: S** (success). Grace replaced team.csv with team-v2.csv in place, reran PageRank, and gave
all three answers right: 14 people now, Hal first before (0.1293), Di first now (0.1339), with Hal
second (0.1305). The last screen (`07.png`) shows the left panel titled "Graph team-v2.csv", the
PageRank row reading 14, the Values' "14 of 14 have a value, 0.02333 to 0.1339", Top 10 "Di
0.1339, Hal 0.1305, Ed 0.1245, Ida 0.1217, Jo 0.1141", the key 0.02333 to 0.1339 with no "out of
date" in its titles, and "Ran Oct 11, 3:32:39 AM" (was 3:31:41 AM on `02.png` and `06.png`). The
answer key for B is 14 people (21 ties), Hal 0.1293 before, Di 0.1339 now, then Hal 0.1305, Ed
0.1245, and the "after" screen it cites has the same Top 10, key range and row count.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `team-ranked.txt` (team.csv loaded, PageRank run, Size bound
to PageRank). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **People now (right).** 14, and 21 ties: the Replace page "Was 12 nodes, 16 edges; now 14, 21"
  and its footer "21 edge rows read; the load makes 14 nodes and 21 edges" (`05.png`), then the
  row's 14 and "14 of 14 have a value" after Rerun (`07.png`).
- **First before (right).** Hal 0.1293, read from the Values' Top 10 before anything changed
  (`02.png`), not from the stale screen after Replace.
- **First now (right).** Di 0.1339, read only after Rerun (`07.png`). Not `stale-read`: between
  Replace and Rerun (`06.png`) Grace saw Hal still first under "PageRank, out of date" and "Data
  changed since this run" and did not report it; she pressed Rerun first.
- **Replaced, not added (right).** `work.json`: sources team.csv at the start, team-v2.csv at the
  end, team.csv under "gone". The key says this is the replacement the task asks for, not
  `work-lost`.
- **Work kept (right).** The PageRank run (label Influence) and all three layers (Node defaults,
  Edge defaults, Influence) are the same at the start and the end (`work.json`); colors and sizes
  are drawn on the new numbers after Rerun (`07.png`).

## Measures

- **Route taken:** the right-click route the key lists as the success path: Values, Data,
  right-click on the team.csv Sources row, "Replace with file..." with team-v2.csv, Replace,
  Rerun. The run's inspector stayed open through the replacement, so no extra click on PageRank
  was needed.
- **Steps:** 6 `real.mjs` steps after the start (`02.png` to `07.png`), equal to the key's 6-step
  success path. Under the 2x limit of bar 11.
- **Wrong turns:** 0. Step 3 (Data) was a look before acting, and it is on the success path.
- **False "done":** none. Every claim in the end statement (14 people, 21 ties, Hal 0.1293
  before, Di 0.1339 now, Hal second) is on `02.png`, `05.png` or `07.png`. truth-on-screen:
  holds. Her side remark that after the swap "the list still said PageRank 12 and the top 10 was
  the old one" is also true (`06.png`).
- **Wording echo:** the key asks to record a participant who gives "closer" as a reason. At step 5
  Grace left "Higher means: Not set" alone, saying "last quarter's run said it assumed higher means
  closer, so I leave it alone so the ranking is done the same way". Her source is the run's Made
  with ("Its meaning was not set, so this run assumed a higher weight means closer", `02.png`),
  echoed by the Replace page's line under "Not set" (`05.png`). The choice is correct for the
  task; nothing there needed choosing.
- **Blue dots:** Grace read the two blue dots on `06.png` as "Mo and Nia with no ranking yet",
  which is what they are; she did not read them as a highlight or a selection. She inferred it
  ("I guess"): the key on the drawing does not explain them.
- **Moved drawing:** on B the replacement lays the drawing out again (`06.png` against `04.png`).
  Grace said "My colors and sizes stayed" and did not read the move as lost work.
- **Silent commit:** none. Replace returned to the Graph page with "Data changed since this run",
  the key titles marked "out of date" and the row's history icon; Rerun redrew colors and sizes
  and changed the time.
- **Numbers that disagree:** none. 14 people match the 12 earlier plus the two new names in the
  prompt; 21 ties match the 21 edge rows read.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, setup.log shows the
  setup's upload, and `leaks.json` shows no leaks over 19 calls.
- **Scripted exit:** not applicable; Grace finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                       | Evidence                                                                                                                                                         |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The Data page's source row shows no control that says replace. Grace found "Replace with file..." only by guessing a right-click; a reader who does not try that has no visible route on this page and may open the new file as a new project, which loses the earlier work. | `03.png` (Sources row "team.csv, 12 nodes, 16 edges", no button at rest); `04.png` (the menu only after a right-click); transcript step 3 and end: "Nothing on the Data page said 'replace' until I right-clicked" |
| 2   | 2        | trust           | Between Replace and Rerun the left panel's PageRank row still reads 12, and the inspector's histogram, "12 of 12 have a value" and the old Top 10 (Hal first) stay at full contrast with nothing on them marking them out of date. The only marks are the bar above the tabs, the key's titles and a history icon on the row with no words. Grace caught it from the bar, but asked for "out of date" on the list row too. | `06.png` (row "PageRank 12" with the history icon; Top 10 "Hal 0.1293" under the "Data changed since this run" bar); transcript end                                |
| 3   | 1        | visual          | After Replace the two new people are drawn as small saturated-blue dots unlike every other node, and the drawing's key does not explain the blue. Grace guessed right what they were, but only guessed.                                                                                  | `06.png` (blue dots at about 595,485 and 809,637; key shows only the orange PageRank scales); transcript step 6: "which I guess are Mo and Nia"                    |
| 4   | 1        | discoverability | The right-click menu covers the end of the Sources row, including its node and edge counts, so the "12 nodes, 16 edges" Grace was checking is hidden while she chooses.                                                                                                                  | `04.png` (menu over "12 no..." at about 113,150)                                                                                                                  |

Problems 1 to 4 rest on this one participant and are not confirmed by this session alone; each
matches what the answer key already records for T21 on earlier builds (the hidden row action, the
unmarked stale Values, the unexplained blue dots, the menu covering the row's counts).
