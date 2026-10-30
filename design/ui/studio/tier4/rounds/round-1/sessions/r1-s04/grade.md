Grade: S
False done: 0
Wrong turns: 1
Steps: 12 (path steps: 7; 9 to the joined network, 3 more reading the result)
Model: opus (claude-opus-5-5; the transcript names no other model)
Leaks: none (leaks.json lists no file outside the session folder; 30 calls checked over 2 transcripts)

# r1-s04 -- T61 B, Tom (returning user), build 79ed770292

## Result

The last screenshot (12.png) shows one network built from both files: Sources lists gauges.csv
(11 nodes) and the joined flows file (12 nodes, 14 edges, one issue), the inspector reads "From 2
files", Nodes 12, Edges 14, Components 1, and the Edges table, narrowed to "With issues 1", holds the
one stretch G09 -> G12 (4 km) with G12 marked. `data.json` agrees: 12 nodes and 14 edges in total,
source s1 gauges.csv (11 nodes) and source s2 flows.csv of kind join onto s1 (15 rows, 13 matched,
12 nodes, 14 edges).

The participant's report: 12 gauges in the network, 11 real ones from gauges.csv plus G12, which
only the stretch list names; 14 stretches, because flows.csv has 15 rows and G03 - G04 is listed
twice and counted once; and one stretch that does not fit the gauge list, G09 to G12. Every part
of the success definition holds (12 gauges with G12 named, 14 stretches, G12 not on the gauge list,
one stretch listed twice): S.

## Follow-up

Asked "How many of the stretches came from the second spreadsheet, and where did you read that?",
the participant answered 14, read on the flows file's Sources row (an orange edge mark with 14),
repeated under the flows.csv heading in Fields, and matching the join screen's "14 edges added" and
the inspector's Edges 14 (12.png). This matches the key (B 14 on the second file's Sources row).
The participant could not say what the blue 12 on the same row counts and guessed.

## Route against the success path

The path is Open a file > gauges.csv > Data > Sources "+" > File... > flows.csv > Join (7 steps).
The participant took:

1. Open a file, gauges.csv (2 steps; 02.png: 11 nodes, 0 edges).
2. Data (03.png).
3. "+" beside Sources, named "Add source" (04.png: File..., Samples..., Server..., Network data...,
   Paste).
4. File..., flows.csv (2 steps; 05.png: the join screen, "Join flows.csv -> gauges.csv", chips "14
   edges added", "1 new node", "1 not in graph", "1 repeated key").
5. Clicked "1 not in graph": the stretch list narrowed to G09 - G12 (06.png). Used to identify the
   stretch that does not fit; kept and reported, so not a wrong turn.
6. Clicked "1 new node": nothing changed (07.png). Abandoned: **wrong turn 1**.
7. Join (08.png: Nodes 12, Edges 14, "From 2 files"). Success state reached at step 9 of 12.
8. Wheel on the node table to the bottom (09.png: an empty G12 row), Edges tab (10.png: 14 edges),
   "With issues 1" (11.png: G09 -> G12). These read the answer off the result; on task.

The participant said done only after the screen showed the joined network and every number reported
(11.png, 12.png): no false done. Twelve steps against a path of 7 is 5 over; the extra steps were
checking the join screen's chips before Join and reading the result after it.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | ---- | -------- |
| 1 | 2 | build-defect | On the join screen, "1 new node" is drawn like the "1 not in graph" chip beside it, which filters the stretch list to its row when clicked, but clicking "1 new node" does nothing, and the left table never shows which node would be new (G12). The participant could only guess that the new node was G12 until after Join. Reproduced by script (see below). | Step 6, 06.png against 07.png (no change); repro 02.png against 03.png |
| 2 | 2 | behavior | The join screen says G09 - G12 is "not in graph" and draws its row without the edge tag every other row carries, which reads as "this stretch will be left out"; Join then adds it and creates G12 as a gauge with no name or position. The participant noticed only by comparing counts after Join and was unsure whether the river team now has a gauge that does not exist. | Step 4 and 5, 05.png and 06.png (no tag on G09 - G12); step 8, 09.png (empty G12 row); end-of-session notes |
| 3 | 2 | behavior | "1 repeated key" names no row: both G03 - G04 rows are drawn alike in the stretch list, and after Join nothing records that one row was folded into another (the Edges table shows 14, the source row 14). The participant worked out the repeat only from 15 rows against 14 edges. | Step 4, 05.png (two identical G03 - G04 rows, no mark); step 9, 10.png |
| 4 | 1 | wording | The flows file's Sources row cuts its name to "f..." beside its counts, so the row that answers the follow-up does not show which file it is; the participant matched it by the flows.csv heading under Fields. The row's blue 12 (nodes the source touches, the whole network here) was not understood. | 12.png (Sources row "f...", blue 12); follow-up answer |
| 5 | 1 | wording | Nothing on the join screen says the original files are left unchanged; the participant was unsure before pressing Join whether it would change gauges.csv. | Step 7 notes; end-of-session notes |
| 6 | 1 | wording | After "1 not in graph" is clicked, a ticked box appears at the right of the stretch list's header and row with no label; the participant did not know what ticking means there. | Step 5, 06.png and 07.png (check box in the km header) |
| 7 | 1 | wording | The gauge file's warning "3" in Sources and the node table's "With issues 11" were present from the first open and were never explained to the participant; off task here, but they compete with the one issue the task cares about. | Step 1 and 2, 02.png and 03.png; 09.png ("With issues 11") |

### Repro for problem 1

`design/ui/studio/tier4/rounds/round-1/repro/r1-s04/`, through the browser gate on the frozen build:

```bash
REAL_DIST=<frozen build> REAL_TIER=4 tool/with-browser.sh node tool/real.mjs --start <repro> empty
node tool/real.mjs --step <repro> --click "Open a file" --upload gauges.csv --click Data \
  --click "Add source" --click "File..." --upload flows.csv      # 02.png: the join screen
node tool/real.mjs --step <repro> --click "1 new node"            # 03.png
node tool/real.mjs --end <repro>
```

02.png and 03.png differ only in a 65 x 24 pixel patch on the gauges.csv Sources row (its hover
controls); the chips, the stretch list and the node table are unchanged, and no row names G12 as the
new node. The step log's list of the screen's controls names "1 repeated key" as a button but has
no control named "1 new node".

## Participant's own rating (not used for the grade)

Finished: yes. Ease 5 of 7.
