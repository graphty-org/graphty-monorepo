# Grade: session r2-s25 -- Nadia (returning), running club (T18 A), the fewest people in between

**Grade: S** (success), prompt and follow-up both. The last screen of the prompt (`11.png`) is the
answer key's end state: the inspector opens the Shortest path run on its Values, Summary "Path 5
nodes, 4 edges", Nodes in order Chloe 1, Ava 2, Ivan 3, Kofi 4, Milo 5; Made with From "Chloe", To
"Milo", Follow "All", Weight "None" with "Each edge counts as 1. A path needs a distance, and
"weight" has no meaning set." under it; the Graph tree row reads "Shortest path 4 hops"; the
legend adds "Shortest path" over "On the path"; five nodes and four ties are black on the orange
drawing. Nadia's answer, "Chloe -> Ava -> Ivan -> Kofi -> Milo. Three people in between, four
introductions", matches the key and was read off the Values list. The follow-up's last screen
(`16.png`) shows Ben 1, Theo 2, Ravi 3, Pia 4, Nora 5, "5 nodes, 4 edges", From "Ben", To "Nora",
Ran "Oct 9, 8:17:17 PM"; her answer matches the key's follow-up answer. She did not put Quinn (the
orange node the Ravi-Pia tie crosses on this layout) in the chain.

It is S, not SD: no wrong turn and no dead end. Her two find-box lookups before the path (`02.png`,
`03.png`) were her history's habit, changed nothing, and gave a true partial check (no shared tie,
so at least two people between), like a Data page visit in other grades. She then took a route the
key lists (Analyze, "Shortest path") with Follow left on All and Weight left on None, which is the
right reading for this task (not `meaning-wrong`).

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `friends-ranked.txt` (PageRank run, size and color by PageRank).

## The answer against the key

- **Chain (right).** Chloe, Ava, Ivan, Kofi, Milo, in order, from the Values' "Nodes in order"
  (`11.png`). The key: the only chain of that length.
- **Count (right).** 4 introductions, 3 people between, both stated; on screen as "5 nodes, 4
  edges" and "4 hops".
- **Settings (right).** Follow All, Weight None (`10.png`, `11.png`). She did not set the tie
  numbers as a distance, and did not quote the Weight line's "A path needs a distance" as a reason
  to set one.
- **Her cross-check is true.** Ava is one of Chloe's four ties (`02.png`) and Kofi one of Milo's
  (`03.png`).
- **Follow-up (right).** Ben, Theo, Ravi, Pia, Nora; 4 introductions (`16.png`).

## Route

Find box "Chloe" (`02.png`: one node, ties to Ava, Ben, Dev, Farah), find box "Milo" (`03.png`:
Kofi, Lena, Nora, Omar). Analyze from the toolbar (`04.png`), her own word "chain" in its filter
box, which found "Shortest path" marked "Start here" (`05.png`), picked it (`06.png`: the Path
popover). From: typed Chloe, picked the suggestion, focus moved to To (`07.png`, `08.png`); To:
typed Milo, picked it, focus on Find path (`09.png`, `10.png`); Find path (`11.png`). Follow-up:
Analyze, "Shortest path" under Recent (`12.png`), empty form again (`13.png`), Ben, Nora, Find path
(`14.png` to `16.png`).

## Measures

- **Steps:** prompt, 10 screenshots after the start (`02.png` to `11.png`), 14 `real.mjs` actions.
  The path itself, from Analyze to Find path, is 8 screenshots (`04.png` to `11.png`) against the
  key's 4 for the success path; the extra 4 are the Analyze route's filter and option click and
  typing and picking each name as separate steps. The 2 find-box lookups before it were
  verification. Follow-up: 5 screenshots (`12.png` to `16.png`).
- **Wrong turns:** 0.
- **False "done":** none. Every claim in her end summary (both chains, both counts, the first
  chain gone after the second run, one "Shortest path" row) is on screen in `11.png` and
  `16.png`. truth_on_screen: holds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Silent commit (bar 4):** none. Find path drew the chain, added the legend entry and the tree
  row, and opened the run's Values at once (`10.png` to `11.png`, `15.png` to `16.png`).
- **Numbers that disagree (bar 5):** none. "4 hops", "5 nodes, 4 edges" and the five rows of
  Nodes in order agree with each other and with the black chain drawn.
- **Earlier work (bar 2):** `work.json` lists nothing gone: the PageRank run and its layers are
  kept, and one Shortest path run with its two layers was added. The first chain was replaced by
  the second run (problem 1); she chose to run again and had written the first chain down, so it
  is not scored `work-lost` here.
- **Broken habit:** none. Her history's moves (find box, the analysis button in the toolbar) led
  to the task.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot; `session.log` is empty;
  `setup.log` shows the file chooser answered; no tool error.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                       | Evidence                                                                                                |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | 2        | persistence     | A second Find path replaces the first chain without a word: the drawing, the Values and the tree's single "Shortest path 4 hops" row all switch to the new chain. A reviewer who needs both chains for one file loses the first unless she wrote it down. Nadia noticed only because the tree still had one row. | `11.png` vs `16.png`; `work.json` (one shortest_path run at the end); transcript step 16 and end        |
| 2   | 1        | comprehension   | "Follow: Out / All" has no explanation of what Out follows. She left it on All by reasoning that an introduction works both ways, and said she would want to know before putting the result in front of QA.                                                                                    | `06.png`; transcript step 06 and end                                                                    |
| 3   | 1        | legibility      | No names are drawn on the dots, so the black chain alone names nobody; only the Values list does. For the case-file screenshot her role needs, the picture says nothing without names put on. (The chain's start, Chloe, also half-covers a larger orange node not on it.)                      | `11.png` (about 716,744), `16.png`; transcript step 02 and end                                          |
| 4   | 1        | vocabulary      | The tree says "4 hops" and the Values "5 nodes, 4 edges"; neither is in the reader's terms of people and introductions. She mapped "four of whatever" to four introductions correctly.                                                                                                          | `11.png`; transcript end                                                                                |
| 5   | 1        | discoverability | She "would never have found this in the long list of analyses"; Shortest path was found only because her own word "chain" matched its description in the Analyze filter. Nothing on the find box's results for a node, where she started, points to a path between two.                       | `04.png`, `05.png`; transcript steps 03 to 05 and end                                                   |
| 6   | 0        | feedback        | Typing a name in the find box lists the node and its ties but marks nothing on the drawing ("Nothing lit up on the drawing that I can tell").                                                                                                                                                  | `02.png`; transcript step 02                                                                            |

No severity 3 or 4: both answers were right and read off the screen, and every problem cost
confidence or a step on a path she completed. No problem here is an implementation fault of the
build or the tool; all six are design questions.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
