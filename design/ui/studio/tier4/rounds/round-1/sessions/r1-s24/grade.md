Grade: S
False done: 0
Wrong turns: 1
Steps: 6 (path steps: 4; Add filter, station, the match menu, Has a value -- Hide is the card's default)
Model: opus (claude-opus-5-5 in the transcript; no Sonnet)
Leaks: none (leaks.json lists no file outside the session folder; 17 calls checked over 1 transcript)

# r1-s24 -- T66 B, Maren (returning user), build 79ed770292

## Result

The last screenshot (07.png) shows the top bar reading "11 of 12 nodes, 13 of 14 edges" with the
filter icon, one filter card "station" set to "Has a value" with its chip "11 of 12" and the
effect control on Hide, and the inspector reading "Nodes showing 11 of 12", "Edges showing 13 of
14" and, under Full graph, Nodes 12 and Edges 14. The lone end of the lower branch (G12, 798,300 ->
850,240 in 04.png) is gone from the drawing. `data.json` agrees: totalNodes 12, totalEdges 14,
visibleNodes 11, visibleEdges 13; both sources still in place (gauges.csv 11 nodes, flows.csv 12
nodes and 14 edges, nothing left out), and `work.json` ends with one filter step on `data.station`.
No file was saved (no `downloads/`).

The participant reported the stray gauge as G12, hidden with the filter "station: Has a value" in
Hide mode and not deleted, with 11 gauges left in the picture out of 12 in the network. The key
names exactly this card as a right answer (B 11 of 12, 13 edges kept): S.

## Route against the success path

The key's path is Data > Filters "+" > Data source (tick gauges.csv) or a `station` card "Has a
value" with Hide. The participant took:

1. Start (01.png): read 11 in gauges.csv against 12 in the network.
2. Opened the flows.csv issues chip (02.png: "1 unknown end" with Add nodes, Leave out, Ignore) and
   closed it with nothing picked. Wrong turn 1 (a place the task does not need, closed unused); it
   also kept her away from Leave out, which the key lists as a deletion.
3. Escape and scrolled the table to G12, the row with every column blank (03.png). Reading, not a
   wrong turn.
4. Filters "+" (04.png: the attribute list, `station` "91% have a value").
5. Picked `station` (05.png: a card in "Contains" with an empty box).
6. Opened the match menu (06.png).
7. Picked "Has a value" (07.png). Success state reached here.

She said done only after 07.png showed the counts she reported: no false done.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | ---- | -------- |
| 1 | 2 | wording | The issue list's "Leave out" does not say what it does. She could not tell whether it deletes the gauge from the network or only hides it, so she backed out. The key records that it deletes G12 and its stretch; a reader who guessed "hide" would have deleted it and reported 11. | Step 2 notes; 02.png |
| 2 | 2 | behavior | The flows.csv issue still offers "Add nodes: 1 unknown end" while the network already holds the unknown end as a node (Overview Nodes 12, G12 in the table). Nothing says which of Add nodes, Leave out or Ignore is in effect now, so the list reads as a decision still open. | Step 2 notes; 02.png (popover beside Nodes 12); 03.png (G12 row) |
| 3 | 2 | behavior | The "Data source" condition -- the one that says "came from this file", which she asked for -- is in the Add filter list but below the visible part; the list opens on the node attributes (Node id, lat, lon, depth_cm, station...). She filtered on a column that happens to be blank for G12 and noted the result is less honest than a source condition would be. | Step 4 notes and wrap-up; 04.png; route.jsonl step 4 lists "option Data source" off screen |
| 4 | 1 | behavior | A new text card starts in "Contains" with an empty box and changes nothing in the picture, with no sign of whether it is live; she wondered if the filter worked until she picked a mode. | Step 5 notes and wrap-up; 05.png |

No build defect was found: the key's path worked as the key describes on this build, so no repro
was needed.
