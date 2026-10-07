# Grade: session r3-s16 -- Grace (nonprofit operations analyst), names on every dot, College football

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mode,
1440 x 900. Graded from the last screenshot (08.png) and the transcript. Nothing was downloaded,
and the task needs no file. Not from the participant's rating (5 of 7).

## Grade: S (success)

Every part of the success definition holds on 08.png:

1. **Label line bound to the name attribute on a row covering every node.** The Everything row is
   selected. Its Style tab (Nodes) shows the label line "Aa Above / Abc label". On College football
   the name attribute is `label`, and she picked it, not `id`.
2. **Names drawn on the canvas.** Team names are drawn beside the dots (GeorgiaTech, Maryland,
   Arkansas, NewMexicoState, WashingtonState, Arizona and the rest).
3. **Count read correctly.** At step 6 (06.png) the statement read "115 labels, 14 hidden". She read
   it, said 14 teams were missing, and ticked "Show all labels" (step 7). On 08.png the box is
   checked and the statement reads "115 labels" with no hidden part. That is the round 3 "switch on"
   success state.

- **Every name reached:** yes.
- **Build-decided:** no. **Void:** no. The plus and the `label` option were clicked by position
  (1419,362 and 1115,532); the tool resolved them to the button "Add label line" and the option
  "label", the visible controls a person would click.
- **Failure codes:** none.
- **Wording echo (for the per-dataset report):** she chose `label` because "id" is a number in her
  own database and "label sounds most like the name", and said she "would have been lost" had the
  names been under `id`. Record the pass as echo-assisted.

## False "done"

None. She said every team's name is written: "115 labels" with "Show all labels" ticked, matching
the 115 teams on the sample card. On 08.png the statement reads "115 labels" with no hidden part
and names are drawn. The overlap she noticed in crowded spots is the switch working per the answer
key, so the claim is not false.

## Steps and wrong turns

The success path has 5 steps after the usage card: open the sample, Everything, Add label line,
label, Show all labels. Grace took 7 (No thanks and the sample at step 2, then steps 3-8).

- **Wrong turns: 1.** At step 3 she opened the Style tab of the Graph place with nothing selected
  (03.png): Canvas background, Method, Shape, Spring length, Gravity, Advanced, nothing about the
  dots. She left it for "Everything" on a guess ("might mean all the dots").
- **1 extra step, not a wrong turn:** at step 8 she zoomed in to check the crowded names (08.png).
  It verified the result and changed nothing.

## Problems

| # | Problem | Severity | Kind | Evidence |
|---|---|---|---|---|
| 1 | With nothing selected, the first Style tab a newcomer opens is the graph's (canvas and layout), with no sign that dot appearance and names live under a row on the left. She reached "Label" only by guessing; she said "Everything" "sounds like a filter", not a place to click. **Confirmed**: the same wrong turn in sessions r3-s11, r3-s12 and r3-s15. | 2 | behavior | step 3, 03.png; debrief "Nothing told me that the dots' own look lives under Everything" |
| 2 | The attribute list offers `id`, `label`, `value`; none says "name" or shows a sample value. She picked `label` by guessing and said she would have been lost if the names were under `id`; she asked for a one-line preview ("label -- e.g. Georgia Tech"). **Confirmed** with r3-s15. | 2 | wording | step 5, 05.png |
| 3 | The "+" on the Label row has no visible words; she learned it adds a "label line" only from its hover name, and "line" did not mean anything to her. | 1 | wording | step 4-5, 04.png, 05.png |
| 4 | With "Show all labels" on, names in crowded spots print on top of each other (SouthernCalifornia over OregonState, near ColoradoState) in small thin serif text, and she found no size control beside the label line for a board slide. The answer key says overlap after the switch is not a defect against this task. | 1 | opinion | step 7-8, 07.png, 08.png |
| 5 | Terms she did not understand and ignored on the way: "Icosphere", "Density", "Edges per ...". | 1 | wording | step 4, 04.png; debrief |

Names without spaces ("NorthCarolinaState") come from the sample's own data, not from the build,
and are not recorded as a problem.

No build defect was found, so there is no repro. Each control did what it said: the label line
appeared at once, names drew as soon as `label` was picked, and the count and the drawing changed
when the switch was ticked.
