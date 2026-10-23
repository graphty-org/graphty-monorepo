# Grade: session r4-s23 -- Dev (tier 1 graduate), running club (T17 A), only the strong ties

**Grade: S** (success), on the prompt and on the follow-up. Dev kept only the pairs who ran
together 4 or more times, answered "19 of the 20 runners (12 of 41 pairs)", the key's value, and
brought the whole club back by unticking the step. On the follow-up he edited the same step to 5,
answered "10 runners (5 pairs)", the key's value, and brought everyone back again. The last screen
(`12.png`) shows the whole club: the Filters row reads "weight is at least 5" over "off" with its
checkbox clear, the header chip is gone, the Overview reads Nodes 20 and Edges 41, every line is
drawn, and the key titles read "Size: PageRank" and "Color: PageRank" without "full graph".

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (one PageRank run labeled Influence,
nodes colored and sized by it). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **At 4 or more (right).** `07.png`: chip "19 of 20 nodes, 12 of 41 edges", row "weight is at
  least 4" over "20 to 19 nodes, 41 to 12 edges", Overview "Nodes showing 19 of 20", "Edges
  showing 12 of 41". Dev reported the node count as the people (19) and the edge count as pairs
  (12), so not `read-wrong`. He did not name Theo as the one left out; the task does not ask for it.
- **Back (right).** `08.png`: checkbox "Apply step: weight is at least 4" cleared, row "off",
  chip gone, Overview Nodes 20, Edges 41, full drawing.
- **Follow-up at 5 or more (right).** `11.png`: chip "10 of 20 nodes, 5 of 41 edges", row "weight
  is at least 5" over "20 to 10 nodes, 41 to 5 edges", ticked; Overview "Nodes showing 10 of 20",
  "Edges showing 5 of 41". He pressed "Save and turn on" and did not then tick the checkbox, so he
  did not fall into the trap the key describes (ticking after the save turns the step off).
- **Back again (right).** `12.png`, as above. One untick, as on the success path.
- **Work kept.** `work.json`: the PageRank run, the three style layers and the source friends.csv
  are the same at start and end; nothing gone. The one addition is the filter step, left off
  (`step-1 off`, range on `data.weight`, min 5, nodes "ends"), which is how the key's success path
  ends.

## Measures

- **Door to the filter:** the Filters tool on the canvas toolbar (the funnel at 833,863, tooltip
  "Filters"), which the key accepts like the Filters "+". The Data page's attribute route was not
  used.
- **Steps, first prompt:** 7 `real.mjs` steps after the start (`02.png` to `08.png`): hover the
  funnel, Filters, Attribute, weight, Value 4, Add step, untick. The key's success path is 7; the
  toolbar door is 6 without the hover. Within the target.
- **Steps, follow-up:** 4 (`09.png` to `12.png`): open the row, Value 5, Save and turn on, untick.
  The follow-up's success path exactly.
- **Wrong turns:** 0 on the prompt, 0 on the follow-up. The hover was exploration and changed
  nothing.
- **False "done":** none. "Done" after step 7 is true on `08.png`; "Done" after step 11 is true on
  `12.png`; every number claimed (19 and 12, 10 and 5, 20 and 41) is on the screen it cites.
  truth-on-screen: holds.
- **Silent commit:** none. Add step, Save and turn on and each untick changed the chip, the row's
  second line, the Overview and the drawing at once.
- **Numbers that disagree:** none on screen. Dev's own dot count at 5 or more briefly came to 11
  against the screen's 10 because of overlapping dots; he trusted the three agreeing counts.
- **Ease (from the transcript):** 7 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the tool reported what
  each pointer action hit (step 7: input "Apply step: weight is at least 4"), and `leaks.json`
  shows no leaks over 29 calls.
- **Scripted exit:** not applicable; Dev finished both parts.

## Problems

| #   | Severity | Kind     | Problem                                                                                                                                                                                                                                     | Evidence                                                                                                                       |
| --- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 1        | visual   | Two pairs of dots overlap near the bottom of the drawing (about 567,758 / 583,753 and 717,745 / 735,744), so counting by eye comes out wrong; at 5 or more Dev nearly reported 11 instead of 10 before deferring to the numbers. Known on this build (answer key, "On the drawing"). | `07.png`, `11.png`; transcript step 10: "that would be 11. Let me look again"                                                  |
| 2   | 1        | feedback | While a step's value is edited and unsaved, the editor's header still names the saved rule ("weight is at least 4" over a Value of 5); Dev briefly wondered whether his 5 was taken. Known on this build (answer key, T17).               | `10.png`; transcript step 9 and end: "for a second I wondered if it took my 5"                                                 |
| 3   | 1        | feedback | The step editor shows no preview or count of what the rule would keep before "Add step"; the drawing changes only on commit.                                                                                                              | `06.png` (Value 4, "Add step" enabled, drawing unchanged); transcript end: "The filter has no live preview"                    |
| 4   | 1        | content  | Nothing names which person a filter left out (at 4 or more only Theo drops); the counts give only how many. Not asked by the task; Dev noted he might want it for the flyer.                                                              | `07.png`; transcript end: "I would not know which one person dropped out at 4+ without hunting"                                |

All problems rest on this one participant and are not confirmed by this session alone; problems 1
and 2 are behaviors the answer key already records on this build. Dev is a simulated returning
user briefed on earlier sessions; a pass is weak evidence until real people confirm it.
