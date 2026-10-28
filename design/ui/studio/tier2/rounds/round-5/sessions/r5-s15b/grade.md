# Grade: session r5-s15b -- Nadia (tier 1 graduate), running club (T17 A), only the strong ties

**Grade: S** (success), on the task and on its follow-up. The last screen (`11.png`) shows the
whole club back: the Overview reads Nodes 20, Edges 41 with no "showing" rows, the header has no
filter chip, all 20 people and their ties are drawn, and the Filters list keeps the step as
"weight is at least 5 -- off" with its box unticked. Before that, the narrowed counts were read
where the app shows them: at 4 or more, chip "19 of 20 nodes, 12 of 41 edges", row "20 to 19
nodes, 41 to 12 edges", Overview "Nodes showing 19 of 20" (`06.png`); at 5 or more, chip "10 of 20
nodes, 5 of 41 edges", row "20 to 10 nodes, 41 to 5 edges", Overview "Nodes showing 10 of 20"
(`10.png`). Both match the answer key (19 people and 12 ties; 10 people and 5 ties). Nadia answered
19 and 10, and brought the club back both times by unticking the step.

Build seen: `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
criteria, at 1440 x 900. Start: friends.csv loaded, PageRank run, nodes sized and colored by
PageRank; the Data page was open. Tool commit `0340fb332c5e`, no uncommitted changes.

## The answer against the key

- **Narrowed (right).** `06.png`: one person (left middle) and 29 ties gone from the drawing; the
  key's Theo is the one left out.
- **Count (right).** 19, read from the chip, the Filters row and the Overview, which agree. Nadia
  also counted dots and named the overlap that nearly made her miscount, but said she would trust
  and write down the chip. Not `read-wrong`: she never gave the Full graph's 20 as "still in it".
- **Back (right).** Unticked "Apply step: weight is at least 4" (`07.png`), the key's own route.
- **Follow-up (right).** Opened the step from its row, replaced 4 with 5, "Save and turn on",
  read 10 (`10.png`), unticked once (`11.png`). She did not fall into the key's known trap (edit,
  then tick to switch on, which turns it off): she read the box ticked after saving and unticked it
  to bring everyone back.
- **Door.** The canvas toolbar's funnel (about 833,864) to a "New filter step" editor, then picking
  `weight` from the Attribute list. The key accepts this door like the Filters "+".
- **Work kept.** `work.json`: runs, layers, notes and sources identical start and end; one step
  added and left off (`step-1 off {"kind":"range","attribute":"data.weight","min":5,...}`); nothing
  gone.

## Measures

- **Steps:** task 6 `real.mjs` steps (funnel, Attribute, weight, Value 4, Add step, untick) against
  a key path of 7 from the Data page; follow-up 4 (row, Value 5, Save and turn on, untick) against
  the follow-up path of 4. Within the second-time target (path + 1, 0 wrong turns).
- **Wrong turns:** 0 on the task, 0 on the follow-up. Guessing the icon-only funnel was right first
  time; it is a problem below, not a wrong turn.
- **Broken habit:** none. Her first move went to the toolbar's filter, which led on to the task.
- **False "done":** none. Every claim in the wrap-up ("19 of the 20 people stay (12 of 41 pairs)",
  "5 or more: 10 people (5 pairs)", "whole club brought back both times") is true on `06.png`,
  `10.png`, `07.png` and `11.png`. truth-on-screen holds.
- **Stale ranking:** the legend read "Size: PageRank, full graph" under the filter; Nadia read it
  correctly as colors not recomputed and did not rerun PageRank.
- **Silent commit:** none; Add step and Save and turn on changed the drawing and the counts at once.
- **Numbers that disagree:** none; chip, row and Overview agree on both screens.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Eleven screenshots for eleven steps; `leaks.json` shows no
  leaks over 25 calls; setup completed (`setup.log`).
- **Scripted exit:** not applicable; Nadia finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                 | Evidence                                                                                                       |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 1        | discoverability | The filter tool on the canvas toolbar is an icon with no word; Nadia found it by guessing from the funnel shape.                                                                                         | `01.png` (toolbar at about 833,864); transcript step 1 and "What confused me"                                   |
| 2   | 1        | feedback        | The step editor gives no count of what a step would keep before "Add step"; the count is only seen after committing. Easy to undo, so it cost nothing here. Already noted in the key for earlier builds. | `05.png` (Value 4, Add step enabled, no preview); transcript step 5                                             |
| 3   | 1        | perception      | Two dots at the bottom overlap almost completely, so a dot count nearly came out one short at 5 or more. The on-screen counts were right and were what she used. Already noted in the key.              | `10.png` (pair near 717-735, 745); transcript step 11 and "What confused me"                                   |
| 4   | 0        | missing feature | Wants to export the filtered picture with its count for a flyer; not tried, outside the task.                                                                                                           | transcript "What confused me", last item                                                                        |
