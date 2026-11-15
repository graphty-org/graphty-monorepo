Grade: SD
False done: 0
Wrong turns: 2
Steps: 20 (path steps: 7; 14 to the joined network, 6 more reading the result and leaving the unknown site's route out)
Model: opus (claude-opus-5-5 in both transcripts; the transcript names no other model)
Leaks: none (leaks.json lists no file outside the session folder; 43 calls checked over 2 transcripts)

# r1-s03 -- T61 A, Alex (returning user), build 79ed770292

## Result

The last screenshot (20.png) shows one network built from both files: Sources lists pantries.csv
(12 nodes) and the joined deliveries file (12 nodes, 17 edges, no issue), the inspector reads "From
2 files", Nodes 12, Edges 17, Components 1, and the Edges table reads "17 edges". `data.json` agrees:
12 nodes and 17 edges in total, source s1 pantries.csv (12 nodes) and source s2 deliveries.csv of
kind join onto s1 (19 rows, 17 matched, 12 nodes, 17 edges).

The participant reached the answer key's success state at step 14 (12.png: Nodes 13, Edges 18, "From
2 files"), then opened the deliveries file's issue list and chose "Leave out" for the one unknown
end, which removed P05 -> P13 and the made-up node P13 (18.png). The report: 12 sites and 17
routes; P05 -> P13 (4 trips) names a site P13 that is not in pantries.csv and was left out; P03 ->
P10 (6 trips) is listed twice and kept once (19 rows - 1 - 1 = 17).

The key's success is 13 sites (or 12 plus the one unknown, P13) and 18 routes, with P13 named as not
on the site list and one route named as listed twice. Every part of the report holds against the
network on screen, P13 is named as the unknown site, and the repeat is named; the route count is 17
rather than 18 only because the participant deliberately left the unknown site's route out with the
product's own control and said so. Counts that are the end network's own count as right (the key's
rule for the other detour). Both sources are in the network, so it is not the key's "not success".
Graded SD rather than S because the end network departs from the key's by that choice and the
participant reached it after the join-screen detours below, recovered by themselves.

## Follow-up

Asked "How many of the routes came from the second spreadsheet, and where did you read that?", the
participant answered 17, read on the deliveries file's Sources row (an edge mark with 17), repeated
under the deliveries.csv heading in Fields, and matching Overview Edges 17 and the table's "17 edges"
(20.png). For this network that is right (the key's 18 is the network before "Leave out"). The
participant noted that the row's name is cut to "deliveri..." and that the counts carry only a dot
and a slash glyph, so "edges" was read off the glyph, not a word.

## Route against the success path

The path is Open a file > pantries.csv > Data > Sources "+" > File... > deliveries.csv > Join (7
steps). The participant took (inputs counted as clicks, keys and files chosen; hovering not counted):

1. Open a file, pantries.csv (2 steps; 02.png: 12 nodes, 0 edges).
2. Data (03.png).
3. "+" beside Sources, named "Add source" (04.png: File..., Samples..., Server..., Network data...,
   Paste).
4. File..., deliveries.csv (2 steps; 05.png: the join screen, "Join deliveries.csv -> pantries.csv",
   chips "18 edges added", "1 new node", "1 not in graph", "1 repeated key").
5. "1 not in graph" (06.png: the route list narrowed to P05 -> P13). Used to find the misfit route,
   kept and reported: on task.
6. "1 repeated key" (07.png: a menu Keep first / Keep both / Ignore with no row named), closed with
   Escape and nothing picked: **wrong turn 1**. Turned "1 not in graph" off and scrolled the list to
   find the repeat by eye (08.png: the second P03 - P10 at the bottom).
7. "1 repeated key" > "Keep first" (09.png): the screen did not change at all. Not taken back; it
   leaves the result as the default does.
8. Hovered "1 repeated key": no tooltip.
9. "1 new node" (11.png): nothing changed. Abandoned: **wrong turn 2**.
10. Join (12.png: Nodes 13, Edges 18, "From 2 files"). The key's success state, at step 14 of 20.
11. Edges tab (13.png: 18 edges), "With issues 1" (14.png: P05 -> P13 with P13 in orange); hovered the
    Target warning and the P13 cell, neither has a tooltip.
12. The warning "1" on the deliveries Sources row (17.png: "Issues in deliveries.csv", "edges 1
    unknown end", Add nodes / Leave out / Ignore), "Leave out" (18.png: Nodes 12, Edges 17,
    "Resolved 1"). A deliberate, reported change to the result, not abandoned.
13. Escape, "With issues 0" off, scrolled the edge list (19.png, 17 edges, the repeat and P05 -> P13
    gone).

The participant said done only after the screen showed 12 nodes and 17 edges from both files, which
is what was reported (19.png, 20.png): no false done. Twenty steps against a path of 7 is 13 over;
14 to the joined network (7 over) went on reading the join screen's chips, which explain little,
and the rest on finding where the unknown site is decided.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | ---- | -------- |
| 1 | 3 | build-defect | The join screen's preview marks the wrong rows. The P05 -> P13 row is drawn without the edge tag every other row carries, which reads as "this route will be left out", while the second, identical P03 - P10 row carries an edge tag as if it adds a route. Join then does the opposite: P05 -> P13 is added (with a new site P13) and the repeat is folded into the first P03 - P10. The total "18 edges added" happens to match, so the reader cannot see the mismatch from the numbers. The participant misread it ("the preview and the result disagreed") and caught the made-up site only because they knew the food bank has 12 sites. Reproduced by script (see below). | Step 4 and 6, 05.png and 08.png (no tag on P05 - P13, tag on the second P03 - P10); step 10, 12.png and 14.png (P05 -> P13 in the network, Nodes 13); repro 02.png against 04.png |
| 2 | 2 | build-defect | "1 repeated key" opens Keep first / Keep both / Ignore without naming the repeated row, shows no current choice, and choosing "Keep first" changes nothing on screen: not the chip, not the counts, not the duplicate row's edge tag. The participant had to find the repeat by scrolling and could not tell whether the choice took. Reproduced by script: the join screen before and after "Keep first" is byte-for-byte the same image. | Step 6 and 7, 07.png and 09.png; repro 02.png and 03.png (identical files) |
| 3 | 2 | behavior | The decision that matters for the task -- what to do with a route whose end is not on the site list (Add nodes / Leave out / Ignore) -- is not on the join screen where the participant was deciding. It appears only after Join, behind the small warning count on the second file's Sources row, with "Add nodes" already applied. The join screen's "1 new node" and "1 not in graph" chips do not offer it. | Step 9 and 10, 11.png and 12.png; step 12, 17.png |
| 4 | 2 | behavior | "1 new node" is drawn like "1 not in graph", which filters the route list when clicked, but clicking it does nothing, and the site table never shows which node would be new (P13). Same defect as in another session's repro on the B half. | Step 9, 11.png (no change from 09.png) |
| 5 | 1 | behavior | The Target column's warning glyph and the orange P13 cell explain nothing on hover (no tooltip), so the meaning of the orange mark is reachable only through the Sources row's issue count. | Steps 11, `route.jsonl` entries for the hovers at 532,509 ("Issues in Target", tooltip null) and 446,542 (rowheader "P13", tooltip null) |
| 6 | 1 | wording | The second file's Sources row cuts its name to "d.." (after the issue chip goes, "deliveri...") and its counts are a dot and a slash glyph with no word, so the row that answers the follow-up does not say which file or what it counts; the participant read "edges" off the glyph. | 12.png and 17.png ("d.."), 20.png ("deliveri..."); follow-up answer |

### Repro for problems 1 and 2

`design/ui/studio/tier4/rounds/round-1/repro/r1-s03/`, through the browser gate on the frozen build:

```bash
REAL_DIST=<frozen build> REAL_TIER=4 tool/with-browser.sh node tool/real.mjs --start <repro> empty
node tool/real.mjs --step <repro> --click "Open a file" --upload pantries.csv --click Data \
  --click "Add source" --click "File..." --upload deliveries.csv --wheel 975,600,800   # 02.png
node tool/real.mjs --step <repro> --click "1 repeated key" --click "Keep first" \
  --wheel 975,600,800                                                                   # 03.png
node tool/real.mjs --step <repro> --click Join --click Edges --click "With issues 1"   # 04.png
node tool/real.mjs --end <repro>
```

02.png: the join screen scrolled to the end of the route list; the P05 - P13 row has no edge tag and
the second P03 - P10 row has one, under "18 edges added". 03.png is byte-for-byte identical to 02.png
after "Keep first". 04.png: after Join, Nodes 13, Edges 18, and the one edge with an issue is P05 ->
P13 -- the route the preview drew as not added. The repro's `data.json`: 13 nodes, 18 edges,
deliveries.csv 19 rows, 17 matched.

## Participant's own rating (not used for the grade)

Finished: yes. Ease 4 of 7.
