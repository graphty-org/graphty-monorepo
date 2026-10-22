# Grade: session r5-s12b -- Alex (regular analyst), Les Miserables (T17 B), only the strong ties

**Grade: S** (success), first prompt and follow-up both. The last screen (`12.png`) is the whole
graph back: the Overview reads Nodes 77, Edges 254 with no "showing" rows, the header has no count
chip, the legend titles read plain "Size: PageRank" and "Color: PageRank", and the Filters row reads
"shared_chapters is at least 8" over "off" with its checkbox unticked. Alex answered **26
characters** at 5 or more shared chapters and **17 characters** at 8 or more, both the key's values,
read from the screen.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900. Start: the Les Miserables ranked setup (PageRank run, nodes sized and
colored by PageRank). Tool commit `0340fb332c5e`, no uncommitted changes. Twelve screenshots for
twelve steps; `leaks.json` shows no leaks over 26 calls.

## The answer against the key

- **First prompt, count (right).** `07.png`: chip "26 of 77 nodes, 51 of 254 edges", the Filters row
  "shared_chapters is at least 5" over "77 to 26 nodes, 254 to 51 edges", the Overview "Nodes showing
  26 of 77", "Edges showing 51 of 254". Alex reported 26 characters (and 51 ties as ties, not as
  people). No `read-wrong`.
- **First prompt, back (right).** `08.png` per the transcript: the step's checkbox unticked, Nodes 77,
  Edges 254, chip gone, row "off". The key accepts the untick.
- **Follow-up, count (right).** `11.png`: chip "17 of 77 nodes, 19 of 254 edges", row "77 to 17
  nodes, 254 to 19 edges", Overview "Nodes showing 17 of 77", checkbox ticked. Alex edited the
  existing step (row click, Value 8, "Save and turn on"), the key's follow-up path.
- **The trap (not fallen into).** After "Save and turn on" Alex did not tick the box to switch the
  step on; he read the count with the step already on, then unticked once to bring everyone back
  (`12.png`).
- **Door.** The canvas toolbar's Filters tool (the funnel at about 833,863), the third door the key
  accepts. He hovered it first to read its tooltip "Filters".
- **Work kept.** `work.json`: the PageRank run, the three style layers and the source are unchanged
  from start to end; one filter step was added and left off (`step-1 off`, rule shared_chapters at
  least 8). Nothing gone.
- **Legend.** Alex read "PageRank, full graph" as "the colors were not recomputed on the subset",
  which is right. No PageRank rerun.

## Measures

- **Steps, first prompt:** 7 (hover the funnel, click Filters, Attribute, shared_chapters, Value 5,
  Add step, untick). The key's success path through the Data page is 7; the toolbar door is about
  the same. The hover is a check of an unlabeled icon, not a wrong turn.
- **Steps, follow-up:** 4 (click the step's row, Value 8, Save and turn on, untick); the follow-up
  success path is 4. Within the bar (path + 1).
- **Wrong turns:** 0 on the first prompt, 0 on the follow-up.
- **False "done":** none. Both "done" claims (26 and everyone back; 17 and everyone back) are true
  on `07.png`/`08.png` and `11.png`/`12.png`. truth-on-screen holds.
- **Silent commit:** none. Each click changed the chip, the row and the Overview together.
- **Numbers that disagree:** none; chip, row and Overview agree on both thresholds.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. **Scripted exit:** not applicable; Alex finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                  | Evidence                                                                                          |
| --- | -------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | 1        | discoverability | The canvas toolbar's Filters tool is an icon with no label; Alex had to hover it to be sure it filters before clicking.                                                                  | `01.png`, `02.png` (tooltip "Filters" only on hover); transcript step 02 and "What took longest" |
| 2   | 1        | feedback        | The New filter step editor shows no count of what the step would keep before "Add step"; Alex compared it with a slider that shows the count while dragging. Known on this build.     | `06.png`; transcript step 06 and "What took longest"                                              |
| 3   | 1        | missing feature | Editing the one step to 8 replaced the 5 rule; Alex wanted both thresholds kept as saved steps to switch between, and did not try adding a second step, so whether that works was not observed. | `09.png` to `11.png`; transcript "What took longest"                                              |

No problem affected the outcome. Problem 2 is a note the answer key already records for this build
(the editor shows no count before "Add step").
