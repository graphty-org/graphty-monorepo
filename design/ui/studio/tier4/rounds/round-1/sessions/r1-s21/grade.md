Grade: SD
False done: 0
Wrong turns: 4
Steps: 14 (path steps: 10; Expand pantries.csv, Fields "+" > Label > site, Fields "+" > Weight > trips, "Higher means" > closer, then the check by clicking P05)
Model: opus (claude-opus-5-5 in the transcript; no Sonnet)
Leaks: none (leaks.json lists no file outside the session folder; 32 calls checked over 1 transcript)

# r1-s21 -- T64 A, Alex (returning user), build 79ed770292

## Result

The last screenshot (15.png) shows Data > Fields with pantries.csv's Label set to `site`, and
deliveries.csv's Weight set to `trips` with "Higher means" set to `closer`. Row P05 is selected in
the table, and the inspector's header reads **Harbor Market** (Node), with id P05 and site Harbor
Market. `data.json` agrees: `nodeLabelPath` is `site`, `edgeWeightPath` is `trips` with
`edgeWeightMeaning` `strength` (the "closer" reading), the site column carries the `label` role
and the trips column carries the `weight` role. No file was saved (no `downloads/`).

The participant reported that the program calls P05 **Harbor Market**, with the label set to site
and the weight set to trips, read as closer. That matches the key for A (label `site`, weight
`trips`, higher means closer, P05 named Harbor Market). The success state was reached at step 11
after one recovered detour (step 9), so the grade is SD.

## Route against the success path

1. Start (01.png): pantries.csv joined with deliveries.csv, 13 nodes, 18 edges.
2. Expand pantries.csv (02.png). On path: the group starts collapsed.
3. pantries.csv "+" (Add to node fields) (03.png). On path.
4. Label (04.png). On path; the column list opens by itself.
5. site (05.png). On path; the table's site header gains a Label tag.
6. deliveries.csv "+" (Add to edge fields) (06.png). On path.
7. Weight (07.png). On path.
8. trips (08.png). On path; an empty "Higher means" row appears.
9. Clicked the text "Higher means" (09.png). **Wrong turn**: nothing opened (see problem 1).
10. Clicked the box itself (10.png): closer, farther, capacity. On path.
11. closer (11.png). On path. The Overview reads "Loaded weight trips (closer)". Success state
    reached here.
12. Hovered the site column's issue mark (12.png). **Wrong turn** (left the path to check the
    site column, abandoned). The screenshot does show a hover card ("1 value with padded spaces",
    Trim, Ignore, Show rows, Ignore all); the participant read it as "no tooltip".
13. Turned on "With issues 2" (13.png): P06 and P07 only. **Wrong turn**, taken back at step 14.
14. Turned the filter off and opened Quick actions on the canvas toolbar (14.png). **Wrong turn**:
    the command list is not a node search; closed with Escape.
15. Escape, then clicked row P05 (15.png). On path (the key's "or click it" check): the inspector
    names it Harbor Market.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | ---- | -------- |
| 1 | 2 | accessibility (build defect, reproduced) | The weight's reading control shows the text "Higher means" beside it, but that text is not its label: the control's accessible name is "Higher weight means", which does not contain the visible words, and clicking the visible text opens nothing. A voice-control user saying "Higher means" and a pointer user clicking the label both miss it. | Session step 9 (09.png: no list open after the click) and step 10 (route.jsonl: `combobox "Higher weight means"`). Repro: `repro/r1-s21-script/repro.sh`, output in `repro/r1-s21/`: the read after clicking the text prints `Higher means` as plain text and then `combobox "Higher weight means" collapsed`, and 05.png shows the list still closed. |
| 2 | 2 | opinion | "Higher means" offers closer, farther and capacity with nothing on screen about what each does to a measure. The participant chose correctly by reasoning from NetworkX, hesitated over capacity, and said he would have to defend the choice. Not confirmed from this session alone. | Step 10 (10.png) and the end-of-session notes. |
| 3 | 1 | behavior | The issue mark in a column header keeps a default cursor and has no tooltip role, so its hover card is easy to miss: the participant reported nothing on hover although 12.png shows the card. Same mark as the earlier repro in `repro/r1-s13/`. | Step 12 (12.png; route.jsonl prints `cursor: default`, `tooltip: null`). |
| 4 | 1 | opinion | The magnifier on the canvas toolbar is a command list, not a node search; the participant expected to type P05 there. The key already records that Quick actions answers "No results" for a node and that the find box is Control+F. | Step 14 (14.png). |
| 5 | 0 | opinion | The canvas draws no names on the nodes after the label is set, so the participant could check "everywhere" only in the table and the inspector. Drawing text on nodes is a style choice, not part of the label; not a problem. | 15.png. |
| 6 | 0 | opinion | 12 sites in pantries.csv but 13 nodes in the graph. This is the data: deliveries.csv names a site (P13) the list does not hold, and the table shows it with no values. Not a problem. | 01.png; repro read output row "P13 No value ...". |

No false "done": the participant said done at step 15 and the screen and `data.json` both show the
label, the weight and its reading set, and P05 named Harbor Market.
