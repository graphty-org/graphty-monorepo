Grade: S
False done: 0
Wrong turns: 2
Steps: 16 (path steps: 7; 13 to the joined network, 2 more reading the result, 1 after the follow-up)
Model: opus (claude-opus-5-5 in both transcripts; no Sonnet)
Leaks: none (leaks.json lists no file outside the session folder; 35 calls checked over 2 transcripts)

# r1-s01 -- T61 A, Grace (returning user), build 79ed770292

## Result

The last screenshot (14.png) shows one network built from both files: Sources lists pantries.csv
(12 nodes) and the joined deliveries file (row cut to "d..", 13 nodes, 18 edges, one issue), the
inspector reads "From 2 files", Nodes 13, Edges 18, Components 1, and the Edges table, narrowed to
"With issues 1", holds the one route P05 -> P13 (4 trips) with P13 marked. `data.json` agrees: 13
nodes and 18 edges in total, source s1 pantries.csv (12 nodes) and source s2 deliveries.csv of kind
join onto s1 (19 rows, 17 matched, 13 nodes, 18 edges).

The participant's report: the program shows 13 nodes and 18 edges; pantries.csv holds 12 sites and
the 13th, P13, came only from a route row; 18 routes as joined (17 between listed sites and one to
P13); two things did not fit: P05 -> P13 (P13 is not on the site list) and P03 -> P10 listed twice
and counted once. The key accepts "12 sites plus the one unknown" as equally right, and every part
of the success definition holds (13 sites with P13 named, 18 routes, P13 not on the site list, one
route listed twice): S.

## Follow-up

Asked "How many of the routes came from the second spreadsheet, and where did you read that?", the
participant answered 18, read on the second Sources row in Data (the orange edge chip with 18, next
to a blue 13 and an issue mark 1), repeated as the orange 18 under the deliveries.csv heading in
Fields, and matching the inspector's Edges 18 with "From 2 files" (14.png). This matches the key
(A 18 on the second file's Sources row). The participant noted the row's name is cut to "d.." and
that she knew the row was deliveries only by order and by the heading below it.

## Route against the success path

The path is Open a file > pantries.csv > Data > Sources "+" > File... > deliveries.csv > Join (7
steps). The participant took:

1. Open a file, pantries.csv (2 steps; 02.png: 12 nodes, 0 edges).
2. Data (03.png).
3. "+" beside Sources, by point, named "Add source" (04.png: File..., Samples..., Server..., Network
   data..., Paste).
4. File..., deliveries.csv (2 steps; 05.png: the join screen, "Join deliveries.csv -> pantries.csv",
   chips "18 edges added", "1 new node", "1 not in graph", "1 repeated key").
5. Clicked "1 new node": nothing changed (06.png identical to 05.png). Abandoned: **wrong turn 1**.
6. Hovered "1 not in graph" (looking, not a step; 07.png: no tooltip).
7. Clicked "1 not in graph": the route list narrowed to P05 - P13 (08.png). Used to find the route
   that does not fit; kept and reported, so on task.
8. Clicked "1 repeated key": a menu Keep first / Keep both / Ignore (09.png), closed with Escape
   and nothing picked: **wrong turn 2**.
9. Escape, "1 not in graph" again to clear the filter, wheel to the bottom of the route list (3
   steps; 10.png): found the second P03 -> P10, 6 row. Reading the input to name the repeat; on task.
10. Join (11.png: Nodes 13, Edges 18, "From 2 files"). Success state reached at step 13.
11. Edges tab (12.png: 18 edges, "With issues 1"), "With issues 1" (13.png: P05 -> P13). These read
    the answer off the result; on task.
12. After the follow-up was given: Data (14.png), to read the source row.

The participant said done only after the screen showed the joined network and every number she
reported (11.png, 13.png): no false done. Fifteen steps before the first end against a path of 7 is 8
over; the extra steps were spent finding out, on the join screen, which rows the chips meant,
because two of the four chips name no row (problems 1 and 2).

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | ---- | -------- |
| 1 | 2 | build-defect | On the join screen, "1 new node" is drawn as a chip like "1 not in graph" beside it, which filters the route list to its row when clicked, but "1 new node" is plain text: clicking it does nothing, and nothing names P13 as the node that will be added. The participant only learned after Join that the 13th node was invented from a route row ("a number that changed on me"). Reproduced by script (below); same finding as r1-s04 on the B half. | Step 5, 05.png against 06.png (no change); repro 03.png against 04.png |
| 2 | 2 | build-defect | "1 repeated key" opens Keep first / Keep both / Ignore, but the menu marks no current choice (the items are plain menu items, none checked) and nothing names the repeated row; both P03 -> P10 rows are drawn alike. The participant refused to choose blind, cleared the filter and scrolled all 19 rows to find the repeat herself, and could tell whether it had been kept only by reasoning from 19 rows to 18 edges after Join. Reproduced by script (below); r1-s04 saw the same on B. | Steps 8 and 9, 09.png and 10.png; repro route.jsonl (`menuitem "Keep first"`, `"Keep both"`, `"Ignore"`, no checked state) |
| 3 | 2 | behavior | "18 edges added" on the join screen does not say whether it counts the P05 -> P13 row or the repeat, and P05 - P13 is drawn without the edge tag the other rows carry, which reads as "left out"; Join then adds it and creates P13. The participant could settle what 18 meant only after Join, in the Edges table. | Step 4 and 9, 05.png and 10.png; step 10 to 11, 11.png to 13.png; end-of-session notes |
| 4 | 1 | wording | "not in graph" and "repeated key" are database words for "not in the first file" and "a row listed twice"; the participant translated both. | Steps 8 and 9 notes; end-of-session notes |
| 5 | 1 | accessibility | Hovering "1 not in graph" shows no tooltip, and its label is drawn in a visibly smaller type than the other three chips. | Step 6, 07.png ("tooltip: null"); 05.png |
| 6 | 1 | wording | The deliveries Sources row cuts its name to "d.." beside its counts, so the row that answers the follow-up does not say which file it is; she matched it by order and by the deliveries.csv heading under Fields. | 14.png (Sources row "d.."); follow-up answer |

### Repro for problems 1 and 2

`design/ui/studio/tier4/rounds/round-1/repro/r1-s01/` (script `repro.sh` there), on the frozen build;
`real.mjs --start` takes its own browser slot through the gate:

```bash
REAL_DIST=<frozen build> node tool/real.mjs --start <repro> empty
node tool/real.mjs --step <repro> --click "Open a file" --upload pantries.csv
node tool/real.mjs --step <repro> --click Data --click "Add source" --click "File..." \
  --upload deliveries.csv                                         # 03.png: the join screen
node tool/real.mjs --step <repro> --click "1 new node"            # 04.png
node tool/real.mjs --step <repro> --click "1 repeated key" --read # 05.png and the read-out
node tool/real.mjs --end <repro>
```

03.png and 04.png differ only in a 65 x 24 pixel patch on the pantries.csv Sources row (its hover
controls); the chips, the route list and the site table are unchanged. The screen-reader read-out
of the join screen gives "Edge 18 edges added Node 1 new node" as plain text, while "1 not in graph"
is a checkbox and "1 repeated key" a menu button. The open menu's items are `menuitem "Keep first"`,
`menuitem "Keep both"`, `menuitem "Ignore"`, none marked as the current choice, and no row of the
route list is marked as the repeat.
