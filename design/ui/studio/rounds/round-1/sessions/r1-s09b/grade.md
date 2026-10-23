# Grade: session r1-s09b -- Sam (sighted, keyboard only), T15 prompt B (friends.csv)

**Grade: SD** (success with difficulty). All five parts reached, in one sitting, none undone,
by keys and typing only. Build commit 452285142 (graphty 0.8.53), 1440 x 900, empty start.

Graded from the last screenshot (33.png), the saved picture
(`downloads/friends_current-view.png`) and the transcript, not from Sam's own rating (4 of 7).

## The five parts

| Part                                                          | Reached | Evidence                                                                                                                                                                                                                                |
| ------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. friends.csv drawn                                          | yes     | 03.png: 20 dots, 41 arrows; panel Nodes 20, Edges 41, Directed                                                                                                                                                                          |
| 2. A ranking run from Analyze, finished                       | yes     | 06.png: "Influence 20" row, key "Color: Influence 0.04382 to 0.06608" (PageRank, the reference range)                                                                                                                                   |
| 3. Sizes bound to the result, visibly different; meaning said | yes     | 25.png: Size line "1 to 3", key "Size: Influence"; Ava and Farah plainly largest. Sam: "Both the size and the color show the same thing: Influence, which is what the program calls PageRank ... Bigger and darker means more." Correct |
| 4. Label line bound to the names on a row covering every node | yes     | 29.png: label line "Abc id" on the Influence row (20 of 20 nodes carry a value), "20 labels, 0 hidden to avoid overlap"; names, not ids, are drawn (friends.csv keeps names in `id`)                                                    |
| 5. Picture that passes the checklist                          | yes     | `downloads/friends_current-view.png` (1806 x 1720): same nodes and arrangement as 33.png; sizes visibly different; all 20 names drawn; key names both channels in use, "Size: Influence" and "Color: Influence"                         |

Top names Sam stated (Farah, Ava, then Hana, Ivan) were on screen first (10.png, the Top 10) and
match the reference (Farah 0.06608, Ava 0.06423, Hana 0.05883).

Activation measure: yes. Sam picked PageRank ("Start here") and ran it with no help, no tooltip
and no detour (04-06.png).

## Steps and wrong turns

- **Steps:** 32 tool steps after the start screen (02-33.png), about 47 key presses plus 4 typed
  strings, against a success path of about 18 steps (118 keys on the rehearsed keyboard path,
  which counts every Tab). The excess is all in the size part (18 steps, 07-25.png).
- **Wrong turns: 1** -- Ctrl+K, typed "size": "No results" (07-08.png); recovered by Escape.
- **Detours forced by the build: 2** -- focus thrown to the page start after choosing Size from
  the Shape menu (18-19.png) and after choosing the size attribute (25-26.png); each cost a
  Shift+Tab hunt back to the Style panel (20-23.png, 27.png). Not counted as the participant's
  wrong turns.
- Why SD, not S: a detour then a correction (the Ctrl+K dead end), and "Size by attribute" found
  only from the tooltip shown when focus landed on the unlabeled chain icon (23.png).

## False "done"

None. Each "done" (06, 25, 29, 33.png) matches the screen. On names, Sam said all are drawn and
noted the overlaps himself ("Chloe over Farah, Eli and Dev"); 29.png agrees: 20 labels, 0 hidden,
some overlapping on the drawing.

## Problems

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                                                         | Evidence                          |
| --- | --- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1   | 3   | build-defect | Choosing an item from a Style panel menu (Size from the Shape "+" menu; an attribute from "Size by attribute"; an attribute for the label line) drops focus to the page body; the next Tab lands on the main menu at the top left. A keyboard user must hunt back. Sam: "Twice in one task is my abandon line." | 18-19.png, 25-26.png; repro below |
| 2   | 2   | behavior     | Tab stops with no visible focus: one between the left list and the bottom bar (12.png), and further stops in the Style panel walk (16.png counted blind, 22.png); a thin blue line on the panel edge with no meaning to the user (20.png)                                                                       | 12, 16, 20, 22.png                |
| 3   | 2   | behavior     | The command list (Ctrl+K) knows Export and Analyze but returns "No results" for "size"; no styling command is reachable from it                                                                                                                                                                                 | 08.png                            |
| 4   | 2   | behavior     | Size sits under "Shape" and "size by a value" is an icon-only chain button whose name is seen only once focus reaches it                                                                                                                                                                                        | 15-18.png, 23.png                 |
| 5   | 1   | opinion      | In the PageRank form Sam could not tell whether Run had focus before pressing Enter (05.png shows a ring on Run, faint against the blue fill)                                                                                                                                                                   | 05.png                            |
| 6   | 1   | opinion      | Some names overlap at the bottom of the picture (Chloe over Farah, Eli and Dev) while the line reads "0 hidden to avoid overlap"                                                                                                                                                                                | 29.png, the saved PNG             |

Problem 1 is already noted in the answer key's keyboard path ("focus falls to the body") and is a
bar 8 failure ("focus never drops"); this session shows its cost to a keyboard user.

## Repro of problem 1

Reproduced on the same build (commit 452285142, graphty 0.8.53) in
`rounds/round-1/repro/r1-s09b/`:

```
node tool/real.mjs --start rounds/round-1/repro/r1-s09b empty
node tool/real.mjs --step rounds/round-1/repro/r1-s09b --click "No thanks" --key Control+o --upload friends.csv
node tool/real.mjs --step rounds/round-1/repro/r1-s09b --key Shift+A --type pagerank --key Enter --key Enter
node tool/real.mjs --step rounds/round-1/repro/r1-s09b --click "Influence" --click "Style"
node tool/real.mjs --step rounds/round-1/repro/r1-s09b --click "Add to Shape" --key Enter   # Size chosen from the menu by Enter
node tool/real.mjs --step rounds/round-1/repro/r1-s09b --type "x"     # prints: focus is on the page
node tool/real.mjs --step rounds/round-1/repro/r1-s09b --key Tab      # 07.png: main menu focused, top left
```

05.png shows the Size line added; the type probe reports "nothing that takes text has focus
(focus is on the page)"; 07.png shows the next Tab on the main menu button, as in Sam's 19.png.
The same drop after a label attribute is chosen is in the answer key's rehearsed keyboard walk
(`tmp/researcher/keypaths.out`, "key Enter -> focus BODY" after the label line).

## Usage card

Skipped: the card was on screen (01.png) but Sam never mentioned it and opened his file by Ctrl+O,
so the card went away unanswered. Usage data stays off ("Local only" chip, 03.png). No wrong
belief about what is sent was stated.
