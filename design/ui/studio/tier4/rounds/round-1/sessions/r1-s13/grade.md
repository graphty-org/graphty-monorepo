Grade: S
False done: 0
Wrong turns: 1
Steps: 8 (path steps: 3; the table's header-mark route the key also names takes 4; 7 steps to the fixed state, 1 more checking it)
Model: opus (claude-opus-5-5 in the transcript; no Sonnet)
Leaks: none (leaks.json lists no file outside the session folder; 19 calls checked over 1 transcript)

# r1-s13 -- T67 A, Grace (returning user), build 79ed770292

## Result

The last screenshot (09.png) shows pantries.csv loaded as 12 nodes with the table unfiltered: P06's
site reads "Northgate Center" with no leading spaces, P07 Library Annex has an empty families cell,
the families header carries the number mark (#) and its values are right-aligned, and no column
header and no Sources row shows an issue mark (the Sources row reads "pantries.csv 12" with no
warning count, against "pantries... 12, warning 2" at the start in 01.png). `data.json` agrees:
`families` is typed `integer`, `site` is `string`, 12 nodes in total and visible, no filters.

The participant's report names both issues the program found: P06 "Northgate Center" with padded
spaces, trimmed, and P07 Library Annex's "n/a" in families, not a number, made blank, after which
the issue count was 0 and all 12 sites remained. Both offered fixes were applied with the program's
own buttons, no value was edited by hand, and the report names what was found: every part of the
success definition holds. The route was the table's header warning marks, which the key lists as
offering the same fixes as the source row's issues chip: an equivalent path, so S.

## Route against the success path

The key's path is the Sources row's issues chip > the issue list > Make blank > Trim (3 steps). The
participant took:

1. "With issues 2" in the table (02.png): the table narrowed to P06 and P07, both flagged cells
   drawn orange. Used to find the rows the warnings meant; on task.
2. Hovered the warning mark on the site header (03.png): no tooltip, default cursor. Looking.
3. Clicked the orange "Northgate Center" cell (04.png): it selected P06 and showed its values in
   the inspector, with nothing saying why the cell was flagged. Abandoned: **wrong turn 1**.
4. Clicked the site header's warning mark (05.png): "1 value with padded spaces" with Trim, Ignore,
   Show rows, Ignore all.
5. Trim (06.png): "With issues 1", the site mark gone, the Sources row's count down to 1.
6. Clicked the families header's warning mark (07.png): "1 not a number" with Make blank, Ignore,
   Show rows, Ignore all.
7. Make blank (08.png): "With issues 0", "No rows", the Sources row's warning gone, families now
   typed as numbers. Success state reached.
8. "With issues 0" to clear the filter (09.png): checking that all 12 rows were still there and
   P07's cell was empty; on task.

The participant said done only after 09.png showed every claim in her report: no false done. Eight
steps against a path of 3 is 5 over; the header-mark route itself needs 4, and the extra steps were
spent finding out that the warning mark is the control that explains and fixes (problems 1 and 2).
She never used the Sources row's "2 issues in pantries.csv" chip, the key's path.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | ---- | -------- |
| 1 | 2 | build-defect | The warning mark on a table column header is the only control in the table that explains an issue and offers its fixes, but it does not look or act like one: hovering it shows no tooltip and a default cursor, and it is exposed as an image ("Issues in site"), not a button. The participant tried a hover and a cell click before clicking it and said she almost gave up after the hover. Reproduced by script (below). | Step 2, 03.png and route.jsonl (`img "Issues in site"`, `cursor: default`, `tooltip: null`); repro 03.png |
| 2 | 2 | build-defect | Clicking a cell the table draws orange as flagged only selects that row's node; nothing on the cell, in the table or in the inspector says what is wrong with the value, and the cell's accessible name is just its value. The participant could not tell what was wrong with "Northgate Center" (padded spaces are invisible) until she found the header mark. Reproduced by script (below). | Step 3, 04.png (inspector shows site "Northgate Center", no reason); repro 04.png and its read-out (`row "P06 ... Northgate Center ..." selected`, no issue named) |
| 3 | 1 | behavior | Trim and Make blank apply with no confirmation naming what changed (for example how many values were trimmed); the participant learned it only from the issue count going down and wanted something she could note for her records. | Steps 5 and 7, 06.png and 08.png; end-of-session notes |
| 4 | 1 | opinion | Nothing tells the participant whether the fixes would be applied again when a newer copy of the file is loaded. Replacing a file with a newer one is outside this round, so this is recorded only. | End-of-session notes |

### Repro for problems 1 and 2

Script `design/ui/studio/tier4/rounds/round-1/repro/r1-s13.sh` (it clears and writes
`repro/r1-s13/`), on the frozen build; `real.mjs --start` takes its own browser slot through the gate:

```bash
REAL_DIST=<frozen build> REAL_TIER=4 node tool/real.mjs --start <repro> setup:<setups>/pantries.txt
node tool/real.mjs --step <repro> --click "With issues 2"          # 02.png
node tool/real.mjs --step <repro> --hover-at 860,509               # 03.png: no tooltip
node tool/real.mjs --step <repro> --click-at 824,542 --read        # 04.png: P06 selected, no reason
node tool/real.mjs --step <repro> --click-at 860,509               # 05.png: the issue list opens
node tool/real.mjs --end <repro>
```

The hover reports `img "Issues in site"`, `cursor: default`, `tooltip: null`. The click on the
flagged cell selects P06; the table's read-out names the header marks only as "Issues in families"
and "Issues in site" and the selected row only by its values. A click on the same mark then opens
"1 value with padded spaces" with Trim, Ignore, Show rows and Ignore all (05.png).
