Grade: S
False done: 0
Wrong turns: 1
Steps: 27 inputs to the success state, 47 in all (keyboard only, so reported apart from bar 7; path steps: 7 with a pointer -- Open a file, the file chosen, Data, Add source, File..., the file chosen, Join)
Model: opus (claude-opus-5-5 in both transcripts; no Sonnet)
Leaks: none (leaks.json lists no file outside the session folder; 64 calls checked over 2 transcripts)

# r1-s27 -- T61 A, Sam (keyboard only, returning user), build 79ed770292

## Result

The last screenshot (29.png) shows one network: Sources lists pantries.csv (12) and the
deliveries.csv join row (13 nodes, 18 edges, issue chip 1), the right panel reads deliveries.csv
Loaded: Nodes 1, Edges 18, and the node table is scrolled to its last row, P13, which holds only
its id. `data.json` agrees: 13 nodes and 18 edges in total, two sources (pantries.csv as a file,
deliveries.csv as a join onto it, 17 of 19 rows matched). There are no downloads, and the task
asks for none.

His report gives 13 sites and 18 routes, names P13 as the site that is only in the route list,
and says one route is listed twice (19 rows, 18 routes, "1 repeated key" on the join screen).
That is the key's success definition for A in full: S.

The follow-up is answered in the transcript: 18 routes came from deliveries.csv, read on the
join screen's "18 edges added" chip, on the deliveries row under Sources, and in the right panel's
"Loaded: Nodes 1, Edges 18".

## Route against the success path

The key's path, in pointer steps, is Open a file, pantries.csv, Data, Add source, File...,
deliveries.csv, Join. He walked the same path by keyboard:

1. Tab x13 to "Open a file" (02-06.png): the top bar and every demo button come first.
2. Enter and pantries.csv (07.png: 12 nodes, 0 edges).
3. F6 x3 and Shift+Tab to reach the rail (08-11.png), ArrowDown and Enter to Data (12.png).
4. Tab x2 to the "+" beside Sources (14.png), Enter (15.png: File..., Samples..., Server...,
   Network data..., Paste).
5. Enter on File... and deliveries.csv (16.png: "Join deliveries.csv -> pantries.csv", Edges,
   from = Id, to = Id; chips 18 edges added, 1 new node, 1 not in graph, 1 repeated key).
6. Enter on Join (17.png: Nodes 13, Edges 18, "From 2 files"). Success state reached.

After that he looked for which site did not fit: Enter on the source row (18.png), Enter on its
issue chip (20.png: "Issues in deliveries.csv", "1 unknown end", Add nodes / Leave out / Ignore),
three Tabs inside the popup and Escape with nothing changed (21-24.png) -- the one wrong turn, a
panel closed with nothing picked -- then F6 x4 and Tab x7 into the node table and Control+End to
its last row (25-29.png), where he read P13.

He said done only after reading P13 off the table; the screen and `data.json` hold what he
reported: no false done.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | -------- | ---- |
| 1 | 2 | accessibility | The start screen puts the top bar links and each demo button (Communities, Key players, Shortest path, 2D, pause) in the Tab order ahead of "Open a file": 13 Tabs to the main action, and the button shows no shortcut. | Steps 2-6; 02.png-06.png |
| 2 | 2 | accessibility | The F6 region cycle stops at the canvas, the canvas toolbar, the divider, the left panel and the right panel, but not at the table or the left rail. Reaching the grid took F6 to the divider and then Tab past the table's tabs and header buttons; reaching Data took a Shift+Tab out of the panel heading. Finding P13 cost about 13 presses. | Steps 8-11, 25-29; 08.png-11.png, 25.png-29.png |
| 3 | 2 | behavior | The issues panel for the joined file says "1 unknown end" but never names the end (P13) or the route (P05 -> P13), and offers no way from there to the rows concerned. He had to find P13 at the bottom of the node table. | Steps 20-23; 20.png, 23.png |
| 4 | 2 | behavior | "1 repeated key" is shown only on the join screen before Join. After Join the issues panel lists only the unknown end and nothing says one of 19 rows was a repeat; he worked out 19 rows against 18 edges himself. | Steps 16, 20; 16.png, 20.png (the key notes the same on this build) |
| 5 | 2 | accessibility | When the issues panel opens, focus sits on the panel itself with no visible ring; the first Tab lands on its close button. | Steps 20-21; 20.png, 21.png |
| 6 | 1 | wording | Adding a second file lives behind an unlabeled "+" beside Sources in the Data panel; on focus it shows no name or tooltip, and nothing in the Graph view points there. He found it by guessing Data. | Steps 12-14; 12.png, 14.png |
| 7 | 1 | wording | The second source's row is cut to "d.." and counts 13 nodes, while the right panel for the same source says Loaded: Nodes 1. The two counts for one source disagree in meaning and he stopped to reconcile them. | Steps 17-18, follow-up; 17.png, 18.png, 29.png |
| 8 | 1 | accessibility | The focus ring on the green "Open a file" button is thin and dark and hard to see against the green fill. | Step 6; 06.png |

The "edges" chip in the issues panel is a label, not a control (the page's accessible tree has no
button for it), so its missing Tab stop is part of problem 3, not a separate defect.

No build defect was found: the join, the counts and the focus returns after Join and after Escape
behaved as the key describes on this build, so no repro was needed.
