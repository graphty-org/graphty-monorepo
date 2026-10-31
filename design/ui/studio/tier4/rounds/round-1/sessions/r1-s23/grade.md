Grade: SD
False done: 0
Wrong turns: 2
Steps: 11 (path steps: 3 by the Data source card, 4 by the answer key's other right card, site "Has a value"; the success state was reached at step 11)
Model: opus (claude-opus-5-5 in the transcript; no Sonnet, no retry)
Leaks: none (leaks.json lists no file outside the session folder; 26 calls checked over 1 transcript)

# r1-s23 -- T66 A, Dana (returning user), build 79ed770292

## Result

The last screenshot (12.png) shows one filter card on `site`, "Has a value", with Hide on and its
chip reading "12 of 13". The top bar reads "12 of 13 nodes, 17 of 18 edges"; the inspector reads
"Nodes showing 12 of 13" and "Edges showing 17 of 18", and under Full graph still Nodes 13 and
Edges 18. The table reads "12 of 13 nodes" with Shown on. The canvas draws twelve nodes. Both
sources are still listed (pantries.csv 12, deliveries.csv 13 nodes and 18 edges).

`data.json` agrees: 13 nodes and 18 edges in the network, 12 and 17 visible; one filter card,
effect keep (Hide), on, reading `data.site`, its count 12 of 13; both sources present. `work.json`
shows no node or source deleted and no style layer added.

The success definition asks for a filter condition that leaves out P13 while the network still
holds it, 12 of 13 visible; a `site` "Has a value" card with Hide is named in the answer key as
right. The participant's report says 12 sites are still in the picture and that the network still
holds 13. Every part holds: success on an equivalent path. The participant first built a card that
showed only P13 and abandoned it by themselves (below), so SD.

## Route against the success path

The answer key's path, from the Data place (already showing at the start), is Add filter > Data
source > tick pantries.csv (3 steps); its other right card is Add filter > site > the match list >
Has a value (4 steps). The participant took:

1. Scrolled the table (02.png) to find the 13th row: P13, with an id and nothing else. Finding
   which site is the stray; not a wrong turn.
2. Add filter (03.png): the attribute list. "Data source" is in the list (the step's screen list
   names it) but below the part the list shows; the participant picked from the visible part.
3. Node id (04.png): a card with "Contains" and a text box. Off the path.
4. Opened the match list (05.png): Contains, Starts with, Ends with, Is exactly. No way to leave a
   value out.
5. Is exactly, typed P13 (06.png): the chip reads "1 of 13", but the canvas still draws all 13
   nodes and the card shows no Select | Hide control while the box has focus.
6. Right-clicked the card header looking for an exclude or invert choice (07.png). No menu opened;
   the click moved focus out of the box and the card applied: the canvas draws only P13, the top
   bar reads "1 of 13 nodes, 0 of 18 edges". **Wrong turn 2** (a menu sought, nothing picked).
7. Hovered Hide (08.png): "Hide nodes that do not match". The participant concluded a card always
   keeps what matches.
8. Removed the Node id card and pressed Add filter again (09.png): back to 13 of 13. Steps 3 to 7
   are abandoned here: **wrong turn 1** (the Node id card).
9. site (10.png). On the right-card path.
10. Opened the match list (11.png): this one adds Has a value and Has no value. On the path.
11. Has a value (12.png): 12 of 13 nodes, 17 of 18 edges. Success state.

Eleven steps against a path of 4 for the card used (3 for the Data source card) is 7 over. T66 is
not a core task, so bar 7 does not apply; the extra steps were the Node id detour, spent finding
out that a card cannot leave one named value out.

The participant said done only after 12.png showed 12 of 13 visible and 13 in the full graph: no
false done. The edge that went with P13 (17 of 18) is the delivery route to it, which the answer
key's site card also hides.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | ---- | -------- |
| 1 | 2 | build-defect | A filter card cannot leave one named value out. The Node id card's match list offers only Contains, Starts with, Ends with and Is exactly -- no "is not", no Has no value -- and every card keeps what matches, so "Is exactly P13" with Hide leaves P13 alone in the picture (1 of 13 nodes, 0 of 18 edges), the opposite of what the person asked. Leaving one item out means describing every other one; it worked here only because the stray had a blank `site`. A stray with full values, on any attribute, leaves only the Data source card, which this participant never saw (problem 4). Reproduced by script (below). | Steps 4 to 6, 05.png and 07.png; repro 03.png (the four options in its screen list) and 05.png |
| 2 | 2 | build-defect | While the card's text box has focus, the chip already counts the match ("1 of 13") but the canvas, the top bar and the table are unchanged and the card shows no Select \| Hide control; the card applies only when focus leaves the box. For that moment the chip and the picture disagree, and the participant read it as the filter doing nothing. Reproduced by script: with P13 typed and focus in the box, 13 nodes drawn and no "of" count in the top bar; after Tab, "1 of 13 nodes, 0 of 18 edges". | Step 5, 06.png against 07.png; repro 04.png against 05.png |
| 3 | 2 | wording | The card's effect control reads "Select \| Hide" with Hide lit while the picture shows only the node the card names. "Hide" means "hide what does not match", which the screen says only in the tooltip; at rest it reads as "hide this", the opposite. The participant needed a hover to learn which way it works. | Steps 6 and 7, 07.png and 08.png (tooltip "Hide nodes that do not match") |
| 4 | 1 | behavior | The attribute picker lists "Data source" -- the card that keeps what came from one file, the answer key's 3-step path for exactly this task -- below the part of the list shown when it opens (Node id, lat, lon, families, site, zip, opened, volunteer_run are visible). A person who reads the visible part picks a column and never learns the source card exists. | Step 2, 03.png; route.jsonl step 2 screen list names "Data source" |
| 5 | 1 | accessibility | The card's "Select" label and the hint line under "Use the selected nodes" are small, light gray text; the participant reported them hard to read. | 07.png, 12.png; wrap-up notes |

The repro is `../../repro/r1-s23.sh` (output in `../../repro/r1-s23/`): it starts from the same
joined pantries setup on the frozen build, adds a Node id card, opens its match list, chooses Is
exactly, types P13 and presses Tab.
