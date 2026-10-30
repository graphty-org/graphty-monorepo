Grade: SD
False done: 0
Wrong turns: 2
Steps: 16 (path steps: 7; 11 to the joined network, 5 more checking it and changing it)
Model: opus (claude-opus-5-5 in both transcripts; no Sonnet)
Leaks: none (leaks.json lists no file outside the session folder; 37 calls checked over 2 transcripts)

# r1-s02 -- T61 B, Maren (returning user), build 79ed770292

## Result

The last screenshot (16.png) shows one network built from both files: Sources lists gauges.csv
(11 nodes) and the joined flows file (row "flows.c...", a grey "1", 11 nodes, 13 edges), the
inspector reads "From 2 files", Nodes 11, Edges 13, Components 1, and the Edges table holds 13
edges with G03 -> G04 once. `data.json` agrees: 11 nodes and 13 edges, source s1 gauges.csv (11
nodes) and source s2 flows.csv of kind join onto s1 (15 rows, 13 matched, 11 nodes, 13 edges).

The participant reached the key's success state at step 11 (11.png: Nodes 12, Edges 14, "From 2
files"), confirmed G12 was a new empty node by scrolling the node table (12.png), then opened the
flows.csv issue list and chose "Leave out" for the one unknown end (14.png), which removed G12 and
its stretch. Her report: 11 gauges (all from the gauge list), 13 stretches in the network, and two
things that did not fit: G09 -> G12 (G12 is not on the gauge list; she left it out) and G03 -> G04
listed twice and kept once, "so 15 rows -> 13 stretches".

The key's numbers are 12 gauges and 14 stretches, and it accepts "11 gauges plus the one unknown"
as equally right. Her report names G12 as the unknown, names the repeat, and accounts for every one
of the 15 rows; 13 plus the one she removed is the key's 14. Her end network differs from the
key's only by a choice the product offers and she made on purpose, and both files are in Sources.
That is success; it is SD rather than S because she reached it after a detour she recovered from
herself (the Join split button's menu item, which did nothing, problem 1).

## Follow-up

Asked "How many of the stretches came from the second spreadsheet, and where did you read that?",
she answered 13, all from flows.csv, read on the flows.csv Sources row in Data (the orange 13),
under the flows.csv heading in Fields (the edge chip 13), the inspector's Edges 13 and the Edges
table header "13 edges" (16.png). That matches her own end network; the key's 14 belongs to the
network before her "Leave out". She added that she could not tell what the grey "1" on the row
means and guessed it is the row she left out (problem 3).

## Route against the success path

The path is Open a file > gauges.csv > Data > Sources "+" > File... > flows.csv > Join (7 steps).
The participant took:

1. Open a file, gauges.csv (2 steps; 02.png: 11 nodes, 0 edges).
2. Data (03.png).
3. "+" beside Sources, by point, "Add source" (04.png: File..., Samples..., Server..., Network
   data..., Paste).
4. File..., flows.csv (2 steps; 05.png: "Join flows.csv -> gauges.csv", chips "14 edges added",
   "1 new node", "1 not in graph", "1 repeated key").
5. Hovered "1 not in graph" (looking; 06.png, "tooltip: null").
6. Clicked "1 not in graph": the stretch list narrowed to G09 - G12 (07.png). Used to find what did
   not fit; on task.
7. Clicked "1 new node": nothing changed (08.png). Abandoned: **wrong turn 1**.
8. Opened "Join choices" (09.png: Join, Add as rows, Replace gauges.csv, Open as a separate graph)
   and picked "Join": the menu closed and the join screen stayed (10.png). She then pressed the
   Join button itself: **wrong turn 2** (the menu detour, two steps).
9. Join (11.png: Nodes 12, Edges 14, "From 2 files"). Success state reached at step 11.
10. Wheel to the bottom of the node table (12.png: G12 with every column empty). Checking; on task.
11. "1 issue in flows.csv" (13.png: "Issues in flows.csv", "1 unknown end", Add nodes / Leave out /
    Ignore), then "Leave out" (14.png: "Resolved 1", Nodes 11, Edges 13). A deliberate change she
    kept and reported, not taken back; not counted as a wrong turn.
12. Close panel, Edges (15.png, 16.png: 13 edges, G03 -> G04 once).

She said done only when the screen showed the network and every number she reported (14.png,
16.png): no false done. Sixteen steps against a path of 7 is 9 over: two on the menu detour, two on
the chips that name no row, and four checking and changing what Join had done with G12 and the
repeat, which the join screen did not let her decide beforehand (problems 2 and 4).

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | ---- | -------- |
| 1 | 2 | build-defect | On the join screen, the Join split button's menu lists "Join" first, but picking it only closes the menu: nothing is joined and nothing on screen changes, so the person has to find the main half of the button. The screen-reader read-out after the pick still shows the join screen's header and its Join, "Join choices" and Cancel buttons. Reproduced by script (below). | Steps 9 and 10, 09.png and 10.png ("menu closed, nothing else changed"); repro 04.png and 05.png |
| 2 | 2 | build-defect | "1 new node" and "1 not in graph" describe the same row (G09 -> G12), but only "1 not in graph" does anything when clicked, neither has a tooltip, and nothing on the join screen says whether Join will create G12 or skip the row. She joined without knowing, and learned only from Nodes 12 that an empty G12 had been invented. Same defect as r1-s01 on the A half, reproduced there by script (`repro/r1-s01/`, 03.png against 04.png). | Steps 6 to 8, 06.png ("tooltip: null"), 08.png unchanged from 07.png; step 11 and 12, 11.png and 12.png |
| 3 | 2 | behavior | After "Leave out", nothing names what was removed or folded: the issue list reads only "Resolved 1", the flows.csv row shows an unlabeled grey "1" beside its name, and the repeated G03 -> G04 is mentioned nowhere after Join. The row's accessible name, "13 of 15 rows joined", is the only place the two missing rows are counted, and it is not on screen. She reconstructed 15 -> 13 from the preview she had read before Join and said she would otherwise have thought data was dropped without a word. | Steps 14 and 15, 14.png and 16.png; repro 08.png and 09.png and the read-out (`button "flows.csv 13 of 15 rows joined 11 nodes, 13 edges"`, `button "Resolved 1"`) |
| 4 | 1 | opinion | What to do with an unknown end (Add nodes, Leave out, Ignore) can be chosen only after Join, in the issue list; on the join screen, where she was looking at the row, there is no such choice, and the default adds an empty node. | Step 9 note (09.png: the Join menu has no choice for the unmatched row); step 13, 13.png |
| 5 | 1 | opinion | The joined river network opens in 3D although the gauges carry Latitude and Longitude; she expected it flat or on a map. Outside this task. | End-of-session notes; 11.png ("3D" in the toolbar) |

### Repro for problems 1 and 3

`design/ui/studio/tier4/rounds/round-1/repro/r1-s02/` (script `repro.sh` there), on the frozen build;
`real.mjs --start` takes its own browser slot through the gate:

```bash
REAL_DIST=<frozen build> node tool/real.mjs --start <repro> empty
node tool/real.mjs --step <repro> --click "Open a file" --upload gauges.csv
node tool/real.mjs --step <repro> --click Data --click "Add source" --click "File..." \
  --upload flows.csv                                              # 03.png: the join screen
node tool/real.mjs --step <repro> --click "Join choices"          # 04.png: the menu
node tool/real.mjs --step <repro> --click "role=menuitem:Join" --read   # 05.png: still the join screen
node tool/real.mjs --step <repro> --click "role=button:Join"      # 06.png: joined, 12 / 14
node tool/real.mjs --step <repro> --click "1 issue in flows.csv"  # 07.png
node tool/real.mjs --step <repro> --click "Leave out" --read      # 08.png: "Resolved 1"
node tool/real.mjs --step <repro> --click "Close panel" --read    # 09.png: the grey "1" on the row
node tool/real.mjs --end <repro>
```

05.png after the menu item matches 03.png's join screen, and its read-out lists the join screen's
header and buttons. 09.png shows the flows.csv row as "flows.c... 1 | 11 | 13" with the "1"
unlabeled; the row's accessible name is "flows.csv 13 of 15 rows joined 11 nodes, 13 edges", and
the issue dialog before it read only "Resolved 1".
