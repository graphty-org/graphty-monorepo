# Grade: session r3-s12 -- Tom (the recipe recipient), names on every dot, Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mode,
1440 x 900. Graded from the last screenshot (08.png) and the transcript. Nothing was downloaded,
and the task needs no file. Not from the participant's rating (5 of 7).

## Grade: S (success)

Every part of the success definition holds on 08.png:

1. **Label line bound to the name attribute on a row covering every node.** The Everything row is
   selected. Its Style tab shows the label line "Aa Above / Abc name". The attribute is `name`,
   not `id`.
2. **Names drawn on the canvas.** Names are drawn beside the dots (Blacheville, Fameuil, Myriel,
   Napoleon, Gribier, and the rest).
3. **Count read correctly.** At step 7 (07.png) the statement read "77 labels, 7 hidden". Tom read
   it, said 7 names were missing, and ticked "Show all labels" (step 8). On 08.png the box is
   checked and the statement reads "77 labels" with no hidden part. That matches the round 3 "switch
   on" success state.

- **Every name reached:** yes.
- **Build-decided:** no. **Void:** no. The tool did nothing a person could not. At step 6 the plus
  was clicked by position (1419,362). The tool resolved that click to the button "Add label line",
  the visible "+" beside "Label".
- **Failure codes:** none.

## False "done"

None. Tom said "77 labels, 77 characters, nothing hidden. That's every one. I'm done." On 08.png
the statement reads "77 labels" with no hidden part, and every name is drawn. The claim matches
the screen. He said in the debrief that names overlap in the dense middle. The answer key says that
overlap is the switch working, so it does not make his claim false.

## Steps and wrong turns

The success path has 5 steps after the usage card: open the sample, Everything, Add label line,
name, Show all labels. Tom took 6 steps after the card (steps 3-8). That is 7 commands counting
"No thanks", and 8 screenshots counting the start.

- **Wrong turns: 1.** At step 4 he opened the Style tab of the Graph place with nothing selected
  (04.png). It shows Canvas Background, Method, Shape, Spring length and Gravity, and nothing
  about names. He left it at once for "Everything" on a guess ("sounds like all the dots").
- No wrong turns hunting for hidden names. He found "Show all labels" beside the count on the
  first try.

## Problems

| # | Problem | Severity | Kind | Evidence |
|---|---|---|---|---|
| 1 | When nothing is selected, the first Style tab a newcomer opens is the graph's: canvas and layout settings, with no sign that dot appearance and names are under a row on the left. Tom reached "Label" only because he guessed that "Everything" meant all the dots. **Confirmed**: Elena (session r3-s11) took the same wrong turn on this task. | 2 | behavior | step 4, 04.png; debrief "If that hunch had not worked I would have been at my second failure" |
| 2 | The two Style tabs (Graph and Everything) show different things, and nothing tells the reader that the left list chooses what the right panel describes. | 2 | behavior | steps 3-5, 03.png-05.png; debrief "I did not know the left side was choosing what the right side talks about" |
| 3 | The hidden-for-overlap note ("77 labels, 7 hidden") is small gray text. Tom caught it only because he reads counts, and said a less careful reader would think they were done. No false "done" in this session. | 1 | opinion | step 7, 07.png |
| 4 | With "Show all labels" on, names in the dense middle are tiny, thin and stacked on top of each other. Tom could not tell which name belongs to which dot and would not hand the picture over as a figure. The answer key says overlap after the switch is not a defect against this task. | 1 | opinion | step 8, 08.png |
| 5 | "Attribute" and "Pick an attribute" are not the reader's words. He got through only because the list also held "name". | 1 | wording | step 6, 06.png |

No build defect was found, so there is no repro. Every control did what it said: the label line
appeared at once, the names drew as soon as "name" was picked, and the count changed when the
switch was ticked.

## Bars touched

- Bar 1 (T10, Les Miserables half): one success.
- Bar 4 (silent commit): no. Picking "name" (06.png to 07.png) and ticking "Show all labels"
  (07.png to 08.png) each changed the canvas. More names appeared in the dense middle after the
  switch, for example Gillenormand and Mother Innocent.
- Bar 5 (counts that disagree with the drawing): none seen. "77 labels" matches the 77 nodes
  shown at step 3.
- Bar 6 (false "done"): none.
