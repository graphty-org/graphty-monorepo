# Grade: session r4-s27 -- Tom (tier 1 graduate), running club (T17 A), only the strong ties

**Grade: SD** (success with difficulty). Both parts of the task and both parts of the follow-up
are met, with the key's values. At 4 or more runs together Tom answered "19 people (12 pairs)",
the key's value: chip "19 of 20 nodes, 12 of 41 edges", Filters row "20 to 19 nodes, 41 to 12
edges", Overview "Nodes showing 19 of 20" (`07.png`, `09.png`). On the follow-up (5 or more) he
answered 10 people (5 pairs), again the key's value (`13.png`). The last screen (`14.png`) shows
the whole club back: Overview Nodes 20, Edges 41, no count chip in the header, the legend titles
without "full graph", the rule "weight is at least 5" kept in the list and marked "off" with its
box unticked, and the full drawing.

The difficulty: after the filter, the edge table under the drawing still read "41 edges" and
listed pairs the rule had dropped (Ava-Ben 3, Ava-Dev 2), with no word that it shows the whole
file (`09.png`). Tom doubted his count ("That shook my confidence"), spent two steps checking,
and kept 19 only by majority vote of the other three places that agreed. He also could not find
which one person had dropped out. The answer is right, but he reached it against a number on
screen that said otherwise.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (running club, PageRank run, sized and
colored by PageRank). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **Count at 4 or more (right).** 19 of 20 people, read as the node count, not the edge count
  (12). Tom named both and kept them apart, so no `read-wrong`. Theo (the one left out) was not
  named; the task does not ask for him.
- **Everyone back (right).** `10.png`: untick of "Apply step: weight is at least 4"; Overview
  Nodes 20, Edges 41, chip gone, row "off".
- **Follow-up at 5 or more (right).** `13.png`: chip "10 of 20 nodes, 5 of 41 edges", row "20 to
  10 nodes, 41 to 5 edges", Overview "Nodes showing 10 of 20". He edited the existing step (row
  click, Control+A, Value 5, "Save and turn on") and did not fall into the trap of ticking the box
  after saving: he read it as ticked and unticked it only to bring everyone back.
- **Everyone back after the follow-up (right).** `14.png` as above.
- **Work kept.** `work.json`: runs, layers and sources at the end equal the start (one PageRank
  run, three style layers, friends.csv); one new step, `step-1 off` (range on `data.weight`, min
  5, nodes "ends"). Nothing gone.

## Measures

- **Door used:** the canvas toolbar's Filters tool (funnel at 833,863), which the key accepts like
  the Filters "+". The Data page's attribute route was not used.
- **Steps, first prompt:** 9 `real.mjs` steps after the start (`02.png` to `10.png`): hover the
  funnel, Filters, Attribute, weight, Value 4, Add step, Table, Edges tab, untick. The success
  path is 7. Within 2x. Two of the nine (Table, Edges tab) were checks caused by problem 1 below.
- **Steps, follow-up:** 4 (`11.png` to `14.png`): open the row, Value 5, Save and turn on,
  untick. The follow-up's success path is 4. Meets the target (<= path + 1).
- **Wrong turns:** 0 on the first prompt, 0 on the follow-up. The hover was exploration and the
  table was a check; neither changed anything or moved away from the goal.
- **False "done":** none. "Done" at step 10 is true on `10.png`; the end claims (19 of 20, 10 of
  20, everyone back both times) are true on `07.png`, `13.png`, `10.png`, `14.png`.
  truth-on-screen: holds.
- **Silent commit:** none. Each action changed the drawing, the chip, the row and the Overview.
- **Numbers that disagree:** yes. With the step on, the edge table's header reads "41 edges" and
  lists filtered-out pairs while the chip reads "12 of 41 edges" and the Overview "Edges showing
  12 of 41" (`09.png`, again `13.png` at 5 or more); the Nodes tab read "20 nodes" against "19 of
  20" (`08.png`).
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot; `leaks.json` shows no
  leaks over 34 calls.
- **Scripted exit:** not applicable; Tom finished both prompts.

## Problems

| #   | Severity | Kind             | Problem                                                                                                                                                                                                                                                                 | Evidence                                                                                                                                         |
| --- | -------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 3        | numbers-disagree | While a filter step is on, the data table under the drawing still shows the whole file ("20 nodes", "41 edges", rows with weight 2 and 3) and says nothing about the filter, so it contradicts the chip, the Filters row and the Overview. Tom nearly doubted the right answer. | `08.png` ("20 nodes" beside chip "19 of 20 nodes"), `09.png` ("41 edges", Ava-Ben 3, Ava-Dev 2), `13.png`; transcript step 9: "That shook my confidence" |
| 2   | 2        | content          | Nothing on screen says which node a filter left out; with two dots drawn on top of each other (about 620,563) the drawing cannot answer it either, so a surprising "19 of 20" cannot be checked.                                                                         | `07.png` (overlapping dots, no names); transcript step 7 and end: "I couldn't tell which one person dropped out"                                  |
| 3   | 1        | affordance       | The canvas toolbar's Filters button shows the arrow cursor, not the hand, so Tom hovered first to make sure it was a control.                                                                                                                                             | transcript step 2 ("cursor: default"); `02.png`                                                                                                   |
| 4   | 1        | legibility       | The small gray labels in the step editor ("Is", "Value", the note "Keeps edges that pass and the nodes at their ends") are hard to read for this participant.                                                                                                          | `05.png`; transcript step 5 and end                                                                                                               |

All problems rest on one participant and are not confirmed by this session alone. Problem 1 is a
build behavior (the table shows the same whole-file counts on every filtered screen of this
session) and becomes confirmed once a scripted path on the build shows the table's counts
unchanged under a filter step, or a second participant meets it. It is not a severity 4: Tom
reported the right number. Problems 3 and 4 are opinions held one level down. Tom is a simulated
returning user briefed on earlier sessions; a pass is weak evidence until real people confirm it.
