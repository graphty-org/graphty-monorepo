Grade: SD
False done: 0
Wrong turns: 2
Steps: 14 (path steps: 9; 9 on the path, 1 click on the "Higher means" text that did nothing, 2 in the table's issue marks, 2 checks that clicked a node and the G05 row)
Model: opus (claude-opus-5-5 in the transcript; no Sonnet)
Leaks: none (leaks.json lists no file outside the session folder; 31 calls checked over 1 transcript)

# r1-s22 -- T64 B, Maren (returning user), build 79ed770292

## Result

The last screenshot (15.png) shows the inspector headed "Old Bridge" for the node whose id is G05
(Values: id G05, station Old Bridge, code 0068), the G05 row highlighted in the table, the station
column marked "Label", and Data > Fields with gauges.csv Label = station and flows.csv Weight = km,
Higher means = farther. `data.json` agrees: `nodeLabelPath` station, the station column's role
`label`, `edgeWeightPath` km with `edgeWeightMeaning` distance (shown as "farther"), the km column's
role `weight`. No filter, no style layer and no node or edge was changed (`work.json` start and end
match). No file was saved (no `downloads/`).

The participant reported that the program now calls G05 "Old Bridge", with the label set to
station and the weight to km read as farther. That matches the key (B: label `station`, G05 named
**Old Bridge**, weight `km`, higher means farther). The success state was reached at step 10; one
dead click and a two-step look at the issue marks before the checks make it SD.

## Route against the success path

The path (B, 9 steps) is Expand gauges.csv > "+" (Add to node fields) > Label > station >
"+" (Add to edge fields) > Weight > km > "Higher means" box > farther. The participant took:

1. Expand gauges.csv (02.png).
2. Add to node fields (03.png: the role menu, Label first).
3. Label (04.png: a Label line with its column list open).
4. station (05.png: Label = station; the table's station header gains a "Label" tag).
5. Add to edge fields (06.png: Weight and Time).
6. Weight (07.png: the list holds only km).
7. km (08.png: an empty "Higher means" box appears; Overview reads "Loaded weight km").
8. Clicked the words "Higher means" (09.png: nothing opened). Wrong turn 1: the click leaves the
   path and is abandoned. Reproduced, see Problems 1.
9. Clicked the box itself (10.png: closer, farther, capacity).
10. farther (11.png). Success state reached here.
11. Hovered the station header's warning mark (12.png: "Issues in station", no tooltip, default
    cursor).
12. Turned on "With issues 11" (13.png: Willow Run's name and Stone Weir's "-" tinted). Steps 11
    and 12 are wrong turn 2: a look into a place the task does not need, left without acting.
13. Clicked a node on the canvas (14.png: inspector headed "Cedar Bend" for G03).
14. Clicked the G05 row (15.png: inspector headed "Old Bridge").

Steps 13 and 14 are the key's check ("click it") and are not wrong turns. The participant said done
only after 15.png showed the name reported: no false done.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | ---- | -------- |
| 1 | 2 | build-defect | In Data > Fields, an edge Weight's "Higher means" words are plain text, not the box's label: clicking them neither focuses nor opens the box, so a person who clicks the words they read gets nothing. The box's accessible name is "Higher weight means", which does not contain the visible words "Higher means" (a voice user saying "click Higher means" misses it). Reproduced: `repro/r1-s22.sh` -- clicking "Higher means" leaves the combobox collapsed with no options on screen (05.png); clicking the box lists capacity, closer, farther (07.png); `--read` (06.png) reads "Higher means" as a separate text line before `combobox "Higher weight means"`. | Steps 8 and 9; 09.png, 10.png; repro/r1-s22/route.jsonl steps 4 to 6 |
| 2 | 2 | behavior | The station header's warning mark says only "Issues in station" when hovered, with no tooltip and a default cursor, so it does not say what is wrong (Willow Run's padded spaces) or that clicking it lists the fixes. "With issues 11" tints rows without a reason either. Already reproduced for the same mark on the A dataset by `repro/r1-s13.sh`. | Steps 11 and 12; 12.png, 13.png; route.jsonl step 11 (`tooltip: null`, `cursor: default`) |
| 3 | 1 | opinion | Setting the label to station changes the name in the inspector and the table, but the canvas draws no names, so "everywhere it names a gauge" could only be checked by clicking a node. Drawing names on the canvas is a style choice, not part of the label; the key grades the inspector and find. | Steps 13 and 14; 11.png to 15.png (no text on the canvas) |
| 4 | 1 | behavior | The 12th node (G12, only in flows.csv) has no station, so it keeps its id as its name; nothing near the Label setting says that one node has no value in the chosen column. The participant noticed only from the counts (12 nodes, 11 rows). | End-of-session notes; 05.png (Label = station); repro/r1-s22/06.png (`row "G12 No value ..."`) |
| 5 | 2 | opinion | The roles live behind a small "+" beside each file's counts; the participant found Weight by trying it, and expected the setting in an import dialog or in Style. Cost no extra steps here. | Steps 2 and 5; end-of-session notes |

## Study note (not a product problem)

The task asks for "the gauge whose code is G05", but gauges.csv has a column named `code` whose
value for that gauge is 0068; G05 is in the `id` column. The participant noticed and went with the
id, which is what the key means. A task wording that names a word the fixture also uses as a column
name can steer a participant to the wrong row; the B prompt could say "the gauge with id G05" or
avoid the word "code".
