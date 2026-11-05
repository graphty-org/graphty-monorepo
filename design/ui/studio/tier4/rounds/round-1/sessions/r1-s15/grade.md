Grade: SD
False done: 0
Wrong turns: 2
Steps: 7 (path steps: 3; the success state was reached at step 5, 2 more checking the result)
Model: opus (the transcript names no Sonnet model; no retry)
Leaks: none (leaks.json lists no file outside the session folder; 18 calls checked over 1 transcript)

# r1-s15 -- T67 A, Alex (returning user), build 79ed770292

## Result

The last screenshot (08.png) shows the full Nodes table, 12 rows: P07 Library Annex's `families`
cell is empty, P06 reads "Northgate Center" with no orange mark, no column header carries a warning
mark, the `families` header now shows the number glyph and its values are right-aligned, and the
pantries.csv Sources row shows only the node count (no warning mark). 07.png, one step earlier,
shows the issue list for pantries.csv reading "Resolved 2" and the row's warning count at 0.
`data.json` agrees: 12 nodes, 0 edges, one source pantries.csv, `families` of type integer.

The participant's report names both issues the program found -- `families` "1 not a number"
(P07 Library Annex, "n/a") and `site` "1 value with padded spaces" (P06 Northgate Center) -- and
both changes made through the program: Trim on the site and Make blank on the families value. Every
part of the success definition holds: S on the outcome. Two detours came first, both recovered by
the participant alone (below), so SD.

## Route against the success path

The path is the source row's issues chip > the issue list > Make blank > Trim (3 steps; the order
of the two fixes does not matter). The participant took:

1. "With issues 2" on the table (02.png: P06 and P07 with their values in orange). It shows which
   rows, not what is wrong; turned off again at the end: **wrong turn 1**.
2. Hovered the warning mark on the `site` header (looking, not a step; 03.png). The one-line fix
   list opened on hover ("1 value with padded spaces" with Trim, Ignore, Show rows, Ignore all) --
   the answer key's second door -- but the participant read the tool's "tooltip: null" line and
   reported that nothing appeared. Not a product fault; see the note under Problems.
3. Clicked the orange "Northgate Center" cell (04.png): it selected node P06 and the inspector
   showed its values with no word of the issue. Abandoned: **wrong turn 2**.
4. The issues chip on the pantries.csv Sources row (05.png: "Issues in pantries.csv", families
   "1 not a number" with Make blank / Ignore, site "1 value with padded spaces" with Trim /
   Ignore). On the path.
5. Trim (06.png: "Resolved 1", count 1). On the path.
6. Make blank (07.png: "Resolved 2", count 0, the filtered table "No rows"). Success state reached.
7. Escape and "With issues 0" (2 steps; 08.png): closed the list and took the filter off to check
   P07 and the other rows. Undoes step 1; checking the result.

Seven steps against a path of 3 is 4 over (bar 7 allows path plus 3 as the task's median). The
extra steps were the two detours spent looking for what the orange marks meant.

The participant said done only after 08.png showed both fixes, no warning left and 12 rows: no
false done.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | -------- | -------- |
| 1 | 2 | build-defect | Clicking a value the table marks as an issue (orange text) only selects its node. Neither the table nor the inspector then names the issue or offers its fix: the inspector lists "site Northgate Center" like any other value, and the table's row reads the same as an unmarked row. The person who points at the problem value -- the most direct thing to try -- learns nothing and has to find the Sources row chip or the header mark. Reproduced by script (below). | Step 3, 04.png; repro walk/03.png and its read-out |
| 2 | 2 | accessibility | A flagged value is marked only by its orange color: the read-out of the table row is "P06 42.38 -71.06 75 Northgate Center 02129 2020-02-10 Y", identical in form to an unflagged row, and the header names only "Issues in site". A reader who does not see color cannot tell which cell is the problem. | Repro walk/03.png read-out; 02.png |
| 3 | 1 | wording | "1 value with padded spaces" names spaces the table does not show: the cell reads "Northgate Center" before and after Trim, so the participant "had to take its word for it". | Step 5 notes; 05.png against 08.png |
| 4 | 1 | behavior | After Make blank the screen does not say whether the change touches the original CSV file or only the copy in the program, nor where a later reader would see that the value was changed; P07's cell is simply empty in 08.png. | Wrap-up notes; 08.png |
| 5 | 0 | behavior | Not a product problem: the participant reported that hovering the header's warning mark showed nothing, but 03.png shows the fix list open under the mark. The study tool's hover line printed "tooltip: null" because the list is a popover, not a tooltip, and the participant trusted that line over the screenshot. | Step 2, 03.png; route.jsonl step 3 (`dialog 1 value with padded spaces Trim Ignore Show rows Ignore all` in the screen list) |

### Repro for problems 1 and 2

`design/ui/studio/tier4/rounds/round-1/repro/r1-s15/repro.sh`, on the frozen build; `real.mjs
--start` takes its own browser slot through the gate, and the walk is written to `walk/` beside the
script:

```bash
REAL_DIST=<frozen build> node tool/real.mjs --start <walk> setup:rounds/tier-4/setups/pantries.txt
node tool/real.mjs --step <walk> --click "With issues 2"                 # walk/02.png
node tool/real.mjs --step <walk> --click "Northgate Center" --read       # walk/03.png
node tool/real.mjs --step <walk> --hover-at 860,509 --read              # walk/04.png
node tool/real.mjs --end <walk>
```

walk/03.png: P06 selected, the inspector shows "site Northgate Center" with no issue mark, and the
table offers no fix. The read-out gives the selected row as "P06 42.38 -71.06 75 Northgate Center
02129 2020-02-10 Y" with nothing marking the flagged cell. walk/04.png: hovering the `site` header's
mark opens "1 value with padded spaces" with Trim, Ignore, Show rows and Ignore all, while the
tool's hover line still prints "tooltip: null".
