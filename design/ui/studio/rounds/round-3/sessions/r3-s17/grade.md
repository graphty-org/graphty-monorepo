# Grade: session r3-s17 -- Ruth (reporter with a contacts sheet), names on every dot, College football

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mode,
1440 x 900. Graded from the last screenshot (09.png) and the transcript. Nothing was downloaded,
and the task needs no file. Not from the participant's rating (6 of 7).

## Grade: S (success)

Every part of the success definition holds on 09.png:

1. **Label line bound to the name attribute on a row covering every node.** The Everything row is
   selected. Its Style tab (Nodes) shows the label line "Aa Above / Abc label". On College football
   the name attribute is `label`, not `id`.
2. **Names drawn on the canvas.** Team names are drawn beside the dots (GeorgiaTech, Maryland,
   Arizona, California, WashingtonState, BoiseState and the rest).
3. **Count read correctly.** At step 7 (07.png) the statement read "115 labels, 14 hidden". Ruth
   read it, said not every team was named, and ticked "Show all labels" (step 8). On 08.png and
   09.png the box is checked and the statement reads "115 labels" with no hidden part. That is the
   round 3 "switch on" success state.

- **Every name reached:** yes.
- **Build-decided:** no. **Void:** no. At step 6 the "+" was clicked by position (1420,362); the
  tool resolved it to the button "Add label line", the visible "+" beside "Label", as a person's
  click would.
- **Failure codes:** none. Not a wording echo in the grading sense: the attribute picked was the
  right one for this dataset, and the Les Miserables half is graded on its own sessions.

## False "done"

None. Ruth said "115 labels, 115 teams ... every team has its name" and, at the end, "Every team
has its name; the count says 115 of 115." On 08.png and 09.png the statement reads "115 labels"
with no hidden part, matching the 115 nodes on 03.png. She also said some names overlap and are
hard to read; the answer key says overlap after the switch is the switch working, so it does not
make her claim false, and she did not claim the names were all legible.

## Steps and wrong turns

The round 3 success path has 5 steps after the usage card: open the sample, Everything, Add label
line, label, Show all labels. Ruth took 7 steps after the card (steps 3-9): 8 commands counting
"No thanks", 9 screenshots counting the start. The two extras are the Graph Style tab (step 4)
and a verifying zoom (step 9).

- **Wrong turns: 1.** At step 4 she opened the Graph place's Style tab with nothing selected
  (04.png): canvas background and layout settings, nothing about names. She left it for
  "Everything" on a guess ("maybe that's 'all the dots'").
- The zoom at step 9 was a check of the result, not a detour: nothing was undone and she
  returned no different answer. Not counted as a wrong turn.
- No wrong turns hunting for hidden names: she found "Show all labels" beside the count on the
  first try.

## Problems

| #   | Problem                                                                                                                                                                                                                                                                                                                             | Severity | Kind     | Evidence                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | ------------------------------------------------------------------------- |
| 1   | With nothing selected, the first Style tab a newcomer opens is the graph's (canvas and layout settings), with no sign that dot appearance and names live under a row on the left. Ruth reached "Label" only by guessing that "Everything" meant all the dots. **Confirmed**: the same wrong turn in r3-s11 and r3-s12 on this task. | 2        | behavior | step 4, 04.png; debrief "Nothing on the Graph style tab pointed me there" |
| 2   | The attribute list (id, label, value) shows no sample value, so the participant had to guess which column holds the team names and still did not know what "value" holds.                                                                                                                                                           | 2        | wording  | step 6, 06.png                                                            |
| 3   | The hidden count ("115 labels, 14 hidden") and the "Show all labels" box are small gray text under the row; she said she nearly missed them. No false "done" here, but a less careful reader would stop at 101 names.                                                                                                               | 1        | opinion  | step 7, 07.png                                                            |
| 4   | With every name on, names in crowded spots (SouthernCalifornia over OregonState, Washington with a neighbor, the Mississippi area) print on top of each other and the text is tiny; she would not hand the picture to an editor. The answer key says overlap after the switch is not a defect against this task.                    | 1        | opinion  | steps 8-9, 08.png, 09.png                                                 |
| 5   | A mouse-wheel zoom (-600) grew the drawing only a little, so zooming did not make the stacked names readable. Not reproduced as a defect: the drawing did grow (08.png to 09.png), so the wheel works; the small step size is a behavior finding.                                                                                   | 1        | behavior | step 9, 08.png vs 09.png                                                  |

No build defect was found, so there is no repro. Every control did what it said: the label line
appeared at once, names drew as soon as "label" was picked, and the count changed when the box was
ticked.

## Bars touched

- Bar 1 (T10, College football half): one success.
- Bar 4 (silent commit): no. Picking "label" (06.png to 07.png) and ticking "Show all labels"
  (07.png to 08.png) each changed the canvas; more names appeared after the switch (SanDiegoState,
  Washington, ColoradoState, OregonState).
- Bar 5 (counts that disagree with the drawing): none seen. "115 labels" matches the 115 nodes on
  03.png.
- Bar 6 (false "done"): none.
