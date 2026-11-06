# Tier 5 dry run, pass 6: triage of the re-walks on build d3fda9f2b6

Build: d3fda9f2b6 (`criteria.md` line 1), which carries pass 4's two units, sent again by pass 5:
a study setup start ends with an empty undo history (c8581ff123, the study tool), and graphty-element's
record pages follow a history move that changes the filter (a93110cfb5). `git diff --stat f0a9a014cb
d3fda9f2b6` outside `design/` is `graphty-element/src/session/scope/ElementMask.ts` and its test only.
Pilot walks and screenshots are under the main checkout's
`tmp/design-studio/tier5/r1d2/pilot/<task>/<route>/`; a screenshot below is written `<route> NN.png`
under its task's folder. Rows are named `<task>.p6.<n>`; `pass 5 T..` points at a row of
`dry-run-r1-5.md`.

This file is pass 6. `dry-run-r1-3.md` already holds pass 3's triage (47c95a09fc), so this pass takes
the next free name instead of overwriting it, as pass 5 did.

Both carried units hold on their acceptance routes:

- setup-history: every start walked opens with Undo off, tooltip "Nothing to undo"; Undo and Ctrl+Z
  after Cancel on a new card change nothing, and the colleague's orange stays (T77 A touched-1 08.png,
  09.png; T77 B touched-1; T71 A touched-8 02.png to 06.png).
- table-after-history: after Cancel on a new card that matched one gauge, the node table reads "7 of
  11 nodes" with the 7 rows the top bar counts, where f0a9a014cb kept "Shown 1 of 11" (T77 B
  touched-2 03.png); T77 B's success path ends with the table on 9 of 11 (08.png).

## How each defect was classed

Pass 1's to 5's rules stand (`dry-run-r1-1.md` to `dry-run-r1-5.md`, "How each defect was classed";
`decided.md`, "Dry run pass 1" to "Dry run pass 5"): fix now only for a crash, a block or a spoiled
grade on a task's success path or a walked detour; what a keyboard or screen-reader user alone meets
is backlog (no round session runs with a screen reader; Sam's keyboard sessions are T70 A and T71 A,
`roster.md`); a row that repeats an earlier backlog row keeps its class unless the re-walk brought new
evidence; a fix-now unit stays open until a build carries it (both did).

## Fix now: the units

None. No defect this pass's pilots reported crashes, blocks a task or spoils a grade, and no earlier
fix-now unit is left unbuilt.

Totals over the fix-now rows: 0 (0 crashes, 0 blocks, 0 spoils); 0 regressions, 0 repeats, 0 new.

### Not fix now, and why

- **Focus after Undo takes away the card that held it** (T71B.p6.1): focus lands on the status bar's
  "Local only". Keyboard only, and the next Tab still reaches Filters; T71 B's grade reads the
  filter, which is right. Settled in `decided.md` pass 6 (focus goes to the section's Add filter).
- **Ctrl+Z and Ctrl+Shift+Z with nothing to undo or redo are silent** (T71B.p6.2, T75A.p6.2): screen
  reader only; nothing changes, which is right. Settled in `decided.md` pass 6 (the chord says what
  the disabled button says). Repeat of pass 4 T75A.p4.4.
- **The spoken count after Undo and after Redo are worded two ways** (T75A.p6.1): screen reader only;
  both name the right numbers (59.png shows 549 of 549 and 2,084 of 2,084). Settled in `decided.md`
  pass 6.
- **Nodes under the canvas toolbar** (T72B.p6.1): decided, the canvas is the frame; graded counts are
  read from the key, the layer row and the inspector, which read 5.
- **The mode select's name and the key card's gradient** (T74A.p6.1, T74A.p6.2): repeats of pass 5;
  the box takes the click and T74 A grades the layer and the names, which are right.
- **Edit in place of a focused row's count after Done** (T79B.p6.1): friction since pass 2; the count
  comes back when focus moves.

## Every defect

Columns: row, defect, route, class (backlog rows carry their kind), origin (fix now only), reason with
its citation. Counts: 10 lines from the pilots: 8 product defects (0 fix now, 1 decided, 0 design
questions, 7 backlog) and 2 lines that are not product defects.

### T71B

| Row       | Defect                                                                                                                           | Route                          | Class             | Origin | Reason                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| T71B.p6.1 | When Ctrl+Z undoes the adding of a filter card and the card goes, focus lands on the status bar's 'Local only', far from Filters | touched-5 21.png               | c [accessibility] |        | keyboard only; the next Tab still reaches Filters and the filter is right; decided.md pass 6 (focus goes to Add filter) |
| T71B.p6.2 | Ctrl+Z with nothing left to undo says nothing, while Enter on the disabled Undo button speaks 'Nothing to undo'                  | touched-5 05.png; 22 to 24.png | c [accessibility] |        | screen reader only; nothing changes, which is right; decided.md pass 6; pass 4 T75A.p4.4                                |

### T72B

| Row       | Defect                                                                                                                                  | Route          | Class | Origin | Reason                                                                                                               |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| T72B.p6.1 | With the node table open, one orange node sits half under the canvas toolbar (4 and a half counted on the picture; key and inspector 5) | success 10.png | n     |        | decided: the canvas is the frame; the toolbar and key are overlays (decided.md line 580; line 716); pass 5 T72B.p5.1 |

### T74A

| Row       | Defect                                                                                                   | Route          | Class             | Origin | Reason                                                                                                            |
| --------- | -------------------------------------------------------------------------------------------------------- | -------------- | ----------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| T74A.p6.1 | The mode select is named 'PageRank test', not by the 'By value' it shows, so a click on the words misses | success 06.png | c [accessibility] |        | the box itself takes the click; pass 5 T74A.p5.1                                                                  |
| T74A.p6.2 | The key card titled 'Color: Layer 1' also shows PageRank's gradient instead of only the layer's orange   | success 14.png | c [cosmetic]      |        | two entries drawn as one card; T74 grades the layer and names (answers.md T74), which are right; pass 5 T74A.p5.2 |

### T75A

| Row       | Defect                                                                                                                                                                                      | Route                     | Class             | Origin | Reason                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| T75A.p6.1 | The spoken count is worded two ways: after Ctrl+Z 'Filter on: 549 of 549 nodes, 2,084 edges'; after Ctrl+Shift+Z '112 of 549 nodes, 896 edges', while the screen shows '896 of 2,084 edges' | touched-14 59.png, 60.png | c [accessibility] |        | screen reader only; the numbers are right (59.png: 549 of 549, 2,084 of 2,084); decided.md pass 6 (one wording, the screen's "of") |
| T75A.p6.2 | Ctrl+Z or Ctrl+Shift+Z with nothing left to undo or redo is silent                                                                                                                          | touched-14 61.png, 64.png | c [accessibility] |        | the same as T71B.p6.2; pass 4 T75A.p4.4                                                                                            |

### T79B

| Row       | Defect                                                                                            | Route                         | Class        | Origin | Reason                                                  |
| --------- | ------------------------------------------------------------------------------------------------- | ----------------------------- | ------------ | ------ | ------------------------------------------------------- |
| T79B.p6.1 | After Done the focused Which nodes title row shows 'Edit' in place of its count until focus moves | success 09.png against 12.png | c [friction] |        | the count comes back when focus moves; pass 5 T79B.p5.5 |

### Not product defects

| Task | Line                                                                                                                                                                                    | Class                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T71B | The report was not written: the harness refused the subagent's Write, so `rounds/r1d2/pilot/T71B/report.md` still holds the 47c95a09fc report                                           | none (process; the orchestrator writes the report from the pilot's output)                                                                                                                                                                                                                                                                                                                                                                             |
| T79A | Two slot-pool checks of `real.mjs --prove` fail with "a session is already running in .../tmp/studio-sessions/tmp/prove/rounds/round-9/sessions/r9-s04" when two self-tests run at once | none for the product; a study tool defect for the engineer, not a session blocker. Mechanism: `real.mjs` line 3145 builds the self-test's round folder from `basename(REAL_PROVE_DIR)` when that folder is outside the studio, so two self-tests whose folders are both named `prove` share `round-9/sessions/r9-s04`. Round sessions have their own folders and never meet it; every setup-start check passed (`T79A/touched-8-d3fda9f2b6.prove.txt`) |
