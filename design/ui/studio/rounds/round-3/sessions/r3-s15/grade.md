# Grade: session r3-s15 -- Nadia (level-1 alert reviewer), names on every dot, College football

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mode,
1440 x 900. Graded from the last screenshot (07.png) and the transcript. Nothing was downloaded,
and the task needs no file. Not from the participant's rating (5 of 7).

## Grade: S (success)

Every part of the success definition holds on 07.png:

1. **Label line bound to the name attribute on a row covering every node.** The Everything row is
   selected. Its Style tab (Nodes) shows the label line "Aa Above / Abc label". On College football
   the name attribute is `label`, and she picked it, not `id`.
2. **Names drawn on the canvas.** Team names are drawn beside the dots (GeorgiaTech, Maryland,
   Arkansas, BrighamYoung, Washington, Arizona, and the rest).
3. **Count read correctly.** At step 5 (06.png) the statement read "115 labels, 14 hidden". She read
   it, said 14 teams were missing, and ticked "Show all labels" (step 6). On 07.png the box is
   checked and the statement reads "115 labels" with no hidden part. That is the round 3 "switch on"
   success state.

- **Every name reached:** yes.
- **Build-decided:** no. **Void:** no. At step 4 the plus was clicked by position (1419,362); the
  tool resolved it to the button "Add label line", the visible "+" beside "Label". A person could
  click the same thing.
- **Failure codes:** none.
- **Wording echo (for the per-dataset report):** she chose `label` "because it matched the word on
  the row", and said she would have been wrong without knowing if the name had been under `id`.
  The answer key counts a College football pass reached this way as a wording echo when the Les
  Miserables half fails; record it as echo-assisted.

## False "done"

None. She said "115 labels, and the sample said 115 teams. That matches. Done." On 07.png the
statement reads "115 labels" with no hidden part and the names are drawn. Overlap in the crowded
parts, which she noted, is the switch working per the answer key, so the claim is not false.

## Steps and wrong turns

The success path has 5 steps after the usage card: open the sample, Everything, Add label line,
label, Show all labels. Nadia took 6 (No thanks and the sample at step 1, then steps 2-6).

- **Wrong turns: 1.** At step 2 she opened the Style tab of the Graph place with nothing selected
  (03.png): Canvas Background, Method, Shape, Spring length, Gravity, nothing about the dots. She
  left it for "Everything" on a guess ("sounds like every dot").
- No wrong turns hunting for hidden names: she found "Show all labels" beside the count first try.

## Problems

| # | Problem | Severity | Kind | Evidence |
|---|---|---|---|---|
| 1 | With nothing selected, the first Style tab a newcomer opens is the graph's (canvas and layout), with no sign that dot appearance and names live under a row on the left. She reached "Label" only by guessing that "Everything" meant every dot. **Confirmed**: the same wrong turn in sessions r3-s11 and r3-s12. | 2 | behavior | step 2, 03.png; debrief "Nothing on screen told me that's where the look of the dots lives" |
| 2 | The attribute list offers `id`, `label`, `value`; none says "name". She picked `label` only because it echoed the row's word, and said she could have picked wrong without knowing. | 2 | wording | step 4, 05.png; debrief "Picking between id, label and value was a guess" |
| 3 | The hidden-for-overlap note ("115 labels, 14 hidden") is small gray text; she said she would have believed she was done with 14 teams missing had she not read it. No false "done" here. | 1 | opinion | step 5, 06.png |
| 4 | The "+" on the Label row does not say what it adds; she could not tell "add a name" from "add another thing" (its name, "Add label line", is not visible). | 1 | wording | step 3-4, 04.png, 05.png |
| 5 | With "Show all labels" on, names in crowded spots print on top of each other and the smallest are hard to read; she would not hand the screenshot to QA without zooming. The answer key says overlap after the switch is not a defect against this task. | 1 | opinion | step 6, 07.png |

No build defect was found, so there is no repro. Each control did what it said: the label line
appeared at once, names drew as soon as `label` was picked, and the count and the drawing changed
when the switch was ticked.

## Bars touched

- Bar 1 (T10, College football half): one success (echo-assisted, see above).
- Bar 4 (silent commit): no. Picking `label` (05.png to 06.png) drew names; ticking "Show all
  labels" (06.png to 07.png) added names such as Washington, SanDiegoState and OregonState.
- Bar 5 (counts that disagree with the drawing): none seen. "115 labels" matches the 115 nodes on
  the Values tab at step 1 and "115 teams" on the start page.
- Bar 6 (false "done"): none.
