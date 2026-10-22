# Grade: session r4-s21 -- Grace (tier 1 graduate), running club (T17 A), only the strong ties

**Grade: S** (success), on the prompt and on the follow-up. Grace kept only the pairs who ran
together 4 or more times, answered "19 people still in it (12 pairs)", the key's value, and
brought the whole club back by unticking the step. On the follow-up she edited the same step to
5, answered "10 people (5 pairs)", the key's value, and brought everyone back again. The last
screen (`15.png`) shows the whole club: the Filters row reads "weight is at least 5" over "off"
with its checkbox clear, the header chip is gone, the Overview reads Nodes 20 and Edges 41, every
line is drawn, and the key titles read "Size: PageRank" and "Color: PageRank" without "full graph".

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked.txt` (one PageRank run labeled Influence,
nodes colored and sized by it). Tool commit `435e878a1d4c`, no uncommitted changes.

## The answer against the key

- **At 4 or more (right).** `06.png`: chip "19 of 20 nodes, 12 of 41 edges", row "weight is at
  least 4" over "20 to 19 nodes, 41 to 12 edges", Overview "Nodes showing 19 of 20", "Edges
  showing 12 of 41". Grace reported the node count as the people (19), not the edge count, so not
  `read-wrong`. She did not name Theo as the one left out; the task does not ask for it.
- **Back (right).** `11.png`: checkbox cleared ("Apply step: weight is at least 4"), row "off",
  chip gone, Overview Nodes 20, Edges 41.
- **Follow-up at 5 or more (right).** `14.png`: chip "10 of 20 nodes, 5 of 41 edges", row "weight
  is at least 5" over "20 to 10 nodes, 41 to 5 edges", ticked; Overview "Nodes showing 10 of 20",
  "Edges showing 5 of 41". She pressed "Save and turn on" and did not then tick the checkbox, so
  she did not fall into the trap the key describes (ticking after the save turns the step off).
- **Back again (right).** `15.png`, as above. One untick, as on the success path.
- **Work kept.** `work.json`: the PageRank run, the three style layers and the source friends.csv
  are the same at start and end; nothing gone. The one addition is the filter step, left off
  (`step-1 off`, range on `data.weight`, min 5, nodes "ends"). Leaving the step in place switched
  off is how the key's success path ends; the drawing and counts are the whole graph's.

## Measures

- **Door to the filter:** the Filters tool on the canvas toolbar (the funnel at 833,863), which
  the key accepts like the Filters "+". It opened "New filter step" with an empty Attribute; Grace
  picked "weight" from the list on the first try (`03.png`, `04.png`), so the grayed "Add step"
  with no hint never cost her anything.
- **Steps:** 14 `real.mjs` steps after the start (`02.png` to `15.png`). Prompt: 10 (Filters,
  Attribute, weight, Value 4, Add step, then Table, Edges tab, sort, scroll to check the count,
  untick). Follow-up: 4 (open the row, Value 5, Save and turn on, untick), the key's follow-up
  path exactly. The success path for the prompt is 6 actions; the 4 extra are the table check.
- **Wrong turns:** 0. The table detour (steps 7 to 10) was a deliberate check of a correct count,
  not a wrong route; it changed nothing and she came back to the right reading. It is recorded as
  a problem below because the table gave a misleading picture on the way.
- **False "done":** none. Each "Done" (after step 11 and step 15) is true on its screen, and
  every number claimed (19 and 12, 10 and 5, 20 and 41) is on the screen it cites.
  truth-on-screen: holds.
- **Silent commit:** none. Add step, Save and turn on and each untick changed the chip, the row's
  second line, the Overview and the drawing at once.
- **Numbers that disagree:** the table under the drawing reads "20 nodes" (`07.png`) and "41
  edges" (`08.png`) while the chip and the Overview read 19 of 20 and 12 of 41, and it lists ties
  of weight 3 and 2 that the drawing hides, with nothing on the table saying it is unfiltered.
  Grace reconciled them herself by sorting and counting rows.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the tool reported what
  each pointer action hit, and `leaks.json` shows no leaks over 36 calls.
- **Scripted exit:** not applicable; Grace finished both parts.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                      | Evidence                                                                                                                                         |
| --- | -------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 2        | trust           | While a filter step is on, the data table under the drawing still lists every node and every tie ("20 nodes", "41 edges", ties of weight 3 and 2 included) and says nothing about the filter: no "showing 19 of 20", no mark on hidden rows. Its counts contradict the chip and the Overview on the same screen. Grace stopped trusting the 19 until she had sorted and counted rows by hand. | `07.png` ("20 nodes" under chip "19 of 20 nodes"), `08.png` ("41 edges", Ava-Ben 3, Ava-Dev 2); transcript step 8: "Nothing on the table says 'all rows, filter not applied'" |
| 2   | 1        | layout          | The table opens four rows high at 1440 x 900, so checking a count meant scrolling and estimating from the scrollbar position.                                                                                                                                                                                                 | `09.png`, `10.png`; transcript step 10: "Judging from the scrollbar the 3s start at about row 13"                                                 |
| 3   | 1        | information     | Nothing tells which person a filter left out. At 4 or more only Theo drops, and the chip, row and Overview give only counts. Grace wanted the name for the flyer; the count was enough for the task.                                                                                                                       | `06.png`; transcript end: "I would have liked to be told who"                                                                                   |
| 4   | 1        | visual          | Two pairs of dots overlap near the bottom of the drawing (about 567,758 / 583,753 and 717,745 / 735,744), so counting dots by eye comes out short. Known on this build (answer key, "On the drawing"); Grace relied on the numbers instead.                                                                               | `06.png`, `14.png`; transcript step 6                                                                                                            |
| 5   | 1        | model           | Editing the step's value replaces the 4-or-more step with a 5-or-more one; there is no way offered to keep both or duplicate the step. Grace noticed and accepted it, but had to think about losing the earlier rule.                                                                                                      | `13.png`, `15.png` (one row, now "at least 5"); transcript step 15 and end                                                                       |

Problem 1 rests on this participant's screens; it becomes a confirmed build defect once a
scripted repro (open the table with a filter step on) or a second participant records it. Problems 2 to 5 rest on one
participant and are not confirmed by this session alone.
