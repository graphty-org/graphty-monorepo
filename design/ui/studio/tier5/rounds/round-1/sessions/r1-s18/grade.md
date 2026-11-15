# Grade: session r1-s18 (task T78B, Tom, returning)

Grade: P
False done: no
Wrong turns: 2
Steps: 68 (counted by `tool/steps.mjs` from `route.jsonl`; the answer key's path for T78 B is 19, so 49 over)
Overwhelm: 4 (least sure: screenshot 03, the Edges table scrolled to all 13 stretches with km, the map above and Style layers with its "+" on the left -- nothing offered to count each gauge's walkable neighbors, so he counted by hand; a close second: screenshots 17-18, "Or..." gone gray after the sixth name with groups A to F listed, the reason only in a tooltip)
Participant model: opus (claude-opus-5-5 in both transcripts; not sonnet)
Leaks: none (`leaks.json`, 52 calls checked, 2 transcripts)
Build: 1e123d7d33 (`session.json`), setup ran clean (`setupOk: true`)
Tool refusal: none (step 13's exit code 1 is the participant's own click landing on Advanced, so "--type Cedar Bend" found no text box; the tool reported it and the next step recovered)

## The last screen and the records

Screenshot 24 and the end-state records hold the right gauges, made by a route the answer key does
not count as success:

- Two style layers. "Crew walks" (`styles.json` layer-1_2): an Or of six text steps on `station`,
  each "contains" one name -- Mill Pond, Cedar Bend, Quarry Pool, Fox Creek, Old Bridge, Stone
  Weir -- 6 of 11, `node.color` #FFA500. "Crew walks 2" (layer-1_4): `station` contains Heron
  Marsh, 1 of 11, #FFA500.
- `key.json`: key rows "Color: Crew walks 2, 1 of 11 nodes" and "Color: Crew walks, 6 of 11
  nodes"; 7 nodes drawn #ffa500, 4 in the default #6366f1.
- The seven are G02, G03, G11, G04, G05, G07, G08 -- exactly the key's 7 of 11. Reported: 7. The
  count is right and the screen shows it (the key's 6 + 1, seven orange on the map), so not a
  false "done".

Why P and not S: the success definition is a style layer whose selection is Degree computed on
just the stretches under 3 km (Degree min 2, Advanced's Edges where km max 2.9). The participant
read the 13 stretches from the Edges table and worked out the seven gauges on paper; the layers
hold a typed list of station names, not "two or more walkable neighbors", and it took two layers.
The program computed nothing. A miscount would have shown no sign, and the rule would not follow
a change in the data. It is not the named near miss (9, Degree on every stretch) and the set is
right, so P rather than F.

## Path and wrong turns

Edges table and scroll (steps 2-3), Style layers "+" > Layer (4-5), name it, Which nodes (6),
`station` (7-8), how-to-match list, "Is exactly" (9-10), Mill Pond, its suggestion, Enter (10-12:
1 of 11), Or... with `station` and a name five more times (13-17: 6 of 11, Or... then disabled),
hover on Or... (18), Done (19), Fill "+", the color box, "orange" + Enter (20-22), then a second
layer for Heron Marsh the same way (23-24).

Wrong turns (the session never reached the success state, so every abandoned detour counts):

1. The Graph place's Edges table, read and scrolled to work the answer out by hand (steps 2-3);
   the path never needs it, and it led him off the Degree route for the rest of the session.
2. The click that opened Advanced ("Match case") instead of the text box, after the boxes moved
   up under Or... (step 14); left and not used.

Not counted: step 7's ambiguous "station" (the tool did nothing); the "Is exactly" choice that did
not take (a build defect, problem 2); the hover on the gray Or... (step 18).

The 49 steps over the path are the hand-built route: six Or groups typed one by one and a second
whole layer for the seventh name.

## Follow-up

Present in the transcript. Rating 4. Least sure: right after step 3, the Edges table with Source,
Target and km for all 13 stretches, the map above, Style layers with a small "+" on the left;
nothing on that screen offered a count of neighbors or a condition on km, so he counted on paper
and chose the "+" only because it was the only "add" he saw. Close second: "Or..." gray after the
sixth name with groups A to F listed on the right, no message until he held the pointer on it
("No more: 6 is the most"). The first is the Graph place and its table, not the selection editor
(backlog); the second is the selection editor.

## Problems

1. Severity 3, behavior. The route the task needs -- Degree in Which nodes, with Advanced's Edges
   where on `km` -- was never found. The open value picker lists attributes only (screenshot 06:
   id, lat, lon, depth_cm, station, code ...); Degree appears only when searched, and nothing
   ties "how many neighbors" or "stretches under 3 km" to a node step. He computed the answer by
   hand and typed names, so the result holds no rule and a miscount would carry no sign. Evidence:
   steps 3 and 6, screenshots 03 and 06; the follow-up's least-sure moment; the wrap-up's first
   confusion. One session; a second on the other half (A) would confirm it.
2. Severity 3, build-defect. Choosing "Is exactly" in a text step's how-to-match list leaves the
   step on "Contains", by pointer and by keyboard; the saved step is `mode: "substring"`. A reader
   who chose an exact match gets a substring match, with only the box's word showing it. Evidence:
   step 10, screenshot 10 (box still "Contains"); `styles.json` every step `"mode": "substring"`.
   Reproduced on the frozen build: `../../repro/r1-s18/repro.sh` -- 04.png the box reads
   "Contains" after clicking "Is exactly"; 05.png the reopened list still ticks Contains; 06.png
   ArrowDown x3 + Enter gives the same.
3. Severity 2, behavior. "Or..." stops at six groups and turns gray with the reason only in a
   tooltip ("No more: 6 is the most"); a seventh name forced a second layer, and the canvas key now
   lists two entries for one idea. Evidence: steps 17-18, screenshots 17-18, 23-24.
4. Severity 2, behavior. A new text step's count stays "11 of 11" after a name is typed and after
   its suggestion is clicked; only Enter in the box commits it (1 of 11). He read it as "did
   nothing". Evidence: steps 10-12, screenshots 10-12.
5. Severity 2, behavior. After Or..., the step's boxes sit higher than on the first group, so a
   click at the text box's earlier place opened Advanced. Evidence: step 14, screenshot 14 (tool
   line "at 1040,218: button Advanced").
6. Severity 2, behavior. Each Or group gets its own color (A green, B orange, C purple ...) in the
   workspace, and he could not tell whether those colors would be painted; only after Fill did he
   see they were not. Evidence: steps 13 and 16, screenshots 13 and 16; the wrap-up.
7. Severity 2, behavior. Clicking the empty Fill Color box gives only a text cursor, no swatches;
   typing "orange" worked by luck. The Fill color box, not the selection editor: backlog, not bar 9.
   Evidence: steps 20-21, screenshot 21. Also r1-s19.
