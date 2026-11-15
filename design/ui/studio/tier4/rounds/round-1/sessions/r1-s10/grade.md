Grade: S
False done: 0
Wrong turns: 0
Steps: 16 inputs, 15 without the ambiguous no-op click (path steps: 13)
Model: opus (claude-opus-5-5; the transcript names no other model)
Leaks: none (leaks.json lists no file outside the session folder; 30 calls checked)

# r1-s10 -- T65 B, Tom (returning user), build 79ed770292

## Result

The last screenshot (12.png) shows the top bar "5 of 12 nodes, 2 of 14 edges", the table listing
G01, G02, G04, G09 and G11, with G01 Upper Falls (1998), G02 Mill Pond (2003) and G09 Lake Inlet
(1999) shaded as selected, the inspector reading "3 nodes selected", and three rings on the canvas.
Data > Filters holds two cards: "telemetry, depth_cm" on Hide with the chip "5 of 12" ("telemetry
is yes and depth_cm is between 70 and 210"), and "installed" Before 2005 on Select with the chip
"3 of 5".

`data.json` agrees: filter-1 is `keep`, on, telemetry in [yes] and depth_cm 70 to 210, matched 5 of
12; filter-2 is `select`, on, within the picture, installed at most the end of 2004, matched 3 of
5; counts are 5 visible nodes and 3 selected. Both halves of the success definition hold, with the
answer key's exact numbers (5 of 12 in the picture; 3 selected, G01, G02, G09), and no gauge was
taken out by the marking card. The participant said done only on this screen: no false done.

## Route against the success path

The path (13 steps): Add filter, telemetry, yes, Add a condition, depth_cm, the "from" box, 70,
Enter, Add filter, installed, 2005, Enter, Select. The participant took the same steps in the same
order:

1. Add filter (02.png).
2. "telemetry" by name matched two controls and did nothing (03.png); the option was then picked
   (04.png). The no-op is the tool refusing an ambiguous name, not a step in the product.
3. yes: 7 of 12 (05.png).
4. Add a condition (06.png), depth_cm (07.png: "Between 48 to 210", 6 of 12).
5. The "from" box, select all, 70, Enter: 5 of 12 (08.png).
6. Add filter (09.png), installed (10.png).
7. Clicked the date box, typed 2005, Enter: the new card started on Hide, so the picture fell to
   3 of 12 (11.png). The answer key's path passes through this same state.
8. Select on that card: back to 5 of 12 with 3 selected (12.png).

Extra inputs over the path: the click into the date box (the card opens with it focused) and
Control+A in the "from" box. Nothing was taken back or abandoned, so no wrong turn.

## Follow-up

Asked "Would it have made any difference if you had done those the other way round? How can you
tell?", Tom answered that he thought the result would be the same but could not say he knew it. He
read "3 of 5" as counting among the five left by the first card, but could not tell from the
screen whether marking first would leave marks on gauges the first card then hides, or change "3
nodes selected". The answer key's success is "the order makes no difference". His answer leans the
right way but stays unsure, and nothing on screen let him check it. That is problem 5 below.

## Problems

| # | Severity | Kind | What | Evidence |
| - | -------- | ---- | ---- | -------- |
| 1 | 2 | behavior | A new filter card starts on Hide, so typing a value into a card meant to mark nodes takes them out of the picture first (5 of 12 fell to 3 of 12). The participant caught it only because he was watching the count. | Step 7, 11.png (top bar "3 of 12 nodes", card on Hide) |
| 2 | 2 | behavior | The same card's chip uses a different basis depending on Select or Hide: on Hide the "installed" card read "5 of 12" while the picture showed 3 of 12; switched to Select it read "3 of 5". The participant could not tell which number to believe until he checked the top bar and the table. | 11.png ("installed" chip "5 of 12", top bar "3 of 12") against 12.png (chip "3 of 5") |
| 3 | 2 | accessibility | The Select / Hide switch on a card is small, and its unchosen half is pale gray text with no border, so the way to stop a card hiding nodes is easy to miss. | 11.png ("Select" pale beside the outlined "Hide" on both cards) |
| 4 | 1 | wording | Nothing near Hide says that hidden nodes stay in the network; the participant was uneasy until the top bar's "7 of 12" reassured him. | Step 4, 05.png |
| 5 | 1 | behavior | The screen gives no way to see that the cards' order does not matter (that a Select card only marks what is in the picture whichever card came first), so the participant could only guess at the follow-up. | Follow-up answer; 12.png |
| 6 | 1 | wording | "2 nodes have no value and are left out" under depth_cm was read twice: it does not name which nodes, so the participant could not tell whether the gauge with the blank depth was the only reason. | Step 6, 07.png |
| 7 | 0 | behavior | "telemetry" by name matched both the table header button and the list option, and the tool did nothing. It is a limit of the study tool's name matching, not of the product. | Step 2, 03.png |

No build defect: every problem is friction on a working path, and the end state matches the answer
key exactly, so no scripted repro was made.

## Participant's own rating (not used for the grade)

Finished: yes. Ease 5 of 7.
