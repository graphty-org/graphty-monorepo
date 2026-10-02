# Grades: two-line labels on the circle around the bishop

The task: "Have each character in the circle around the bishop carry two pieces of text in the
drawing: what they are called on top, and underneath it how many remarks have been written about
them. The data on screen is a sample: characters of the novel Les Miserables, linked when they
appear in the same chapter."

The intended path: select a group row (Group 2 in the "For the report" folder), and on its Style
tab press the "+" beside Label. That adds an empty "Above" line with a field list open, and the
participant picks the name ("label"). A second "+" adds a "Below" line straight into the list, and
the participant picks "Note count" from the Notes heading. The row then shows a line above and a
line below.

Grading rule: success means both lines were made this way and filled, name above and note count
below. Success with difficulty means only one line was filled on the first try, the position was
picked from the Label menu after expecting a prompt, or the end was reached after a wrong turn, a
long search or a hover that was needed to find the control. Failure means the names were typed
as text, or the participant expected the first line to come pre-filled and stopped when it did
not. Grades go by what was on screen at the end and what the participant concluded, not by how
they rated themselves.

Studio grading decision (reason: the rule says the label setup is under test, not which group
holds the bishop): all five participants who set labels did it on Louvain's "Community 3" rather
than on a group in the report folder. Community 3 is a group row with the same Style tab and the
same Label control, so it is counted. Which group they chose is not graded.

Two things are mock artifacts and are not counted against anyone:

- **The drawing never shows labels.** The intended path's own last screen (Above: label, Below:
  Note count) shows no new text on the canvas either. Four of the five who finished the setup said
  "I can't see it, so I'm not sure I did it", and that doubt drove their self-ratings of failure.
- **The setting vanishing after Escape** (Gephi user only). Escape in the skeleton returns to the
  start screen, and the label lines live in the screen, not in a saved project. Her finished setup
  is on 15.png; 21.png is a fresh screen.

Nobody reached the screen where the value list for a second line already shows two filled lines
they did not make, so that known artifact did not affect anyone.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Explorer Elena | failure | success with difficulty | Clicked the word "Label" (nothing), guessed three names for the plus, opened Shape's menu by mistake, hovered to learn "Add to Shape", then used "Add to Label" > Label line > Name, Label, and a second plus straight to "Below" > Note count. Ends with Community 3 showing Above: label, Below: Note count (15.png). Her "probably not" rests on the canvas not changing (artifact) and on not knowing which community is the bishop's (not graded). |
| Genomics Cytoscape user | failure | success with difficulty | The longest search: about fifteen hovers and guesses for a way to select the bishop's neighbors, then settled on Community 3. Her first pick of "label" sorted the open table's column instead; she collapsed the table and picked again. Ends with Above: label, Below: Note count on Community 3 (25.png). Concluded the setup is right and doubted only the canvas and the group, neither of which is graded. |
| Gephi user | failure | success with difficulty | Same wrong plus and hover as Elena, and the same "label" collision with the table. Reached Above: label, Below: Note count on Community 3 (15.png). Then added a third line by accident (the menu no longer offers "Show labels" once a line exists), followed "Paints 10 nodes" to a 5-node list that does not mention Community 3, and pressed Escape, which in the skeleton returns to the start screen. Her "No" is built on the blank canvas, that count, and the lost setting; only the count is a real design problem, and it is not the task. |
| Marketing analyst | success with difficulty | success with difficulty | Clicked the word "Label", tried four names, hovered to learn "Add to Shape", then "Add to Label" > Label line. Her first "label" pick sorted the table; she picked "Name, Label" instead, then the second plus and "Note count". Ends with Above: label, Below: Note count (14.png). Concluded correctly that the setup is right and that she could not see it on the map. |
| Recipe recipient | gave up | gave up | Found the bishop's circle best of anyone, by reading a note tagged "Community 3" ("Myriel's household"). Then clicked the word "Label" twice, tried four names for the plus without finding it, and stopped: "the obvious button has done nothing" (15.png, Label section empty). He never pressed a plus, so he never saw the label lines or the field list. |
| Screen-reader analyst | success with difficulty | success with difficulty | Picked Community 3 by working out that a star of one center and nine leaves gives its density. Clicked the word "Label", opened Shape's menu by mistake, learned the full name from the hover, then "Add to Label" > Label line; "label" first sorted the table, "Name, Label" worked, and the second plus went to "Below" > Note count. Ends with Above: label, Below: Note count (18.png). Concluded correctly about the label lines and honestly that she could not confirm who carries them. |

Totals: 0 success, 5 success with difficulty, 0 failure, 1 gave up.
Ease scores (out of 7): 2, 2, 2, 4, 2, 3. The low scores come mostly from finding the bishop's
circle and from the blank canvas, not from the label lines themselves, which four participants
called the easy part ("Above, Below and a Note count choice is how I'd want it").

Three participants graded themselves failure and are graded success with difficulty here. In each
case the panel on screen showed exactly the requested setup; what they doubted was the drawing,
which the skeleton does not update, and the group, which this task does not grade.

## Findings

1. **The plus beside Label cannot be found by its section name (6 of 6).** Every participant
   clicked the word "Label" first and nothing happened. Three then opened Shape's menu by pressing
   the first plus, and five needed a hover to learn that the buttons are called "Add to Shape" and
   "Add to Label". The recipe recipient never found it and gave up; it is the only reason anyone
   did not finish. The screen-reader analyst adds that four buttons all announced as "Add" are
   indistinguishable by ear. Severity 4: it stopped one participant outright and cost all the
   others several tries. Make the section heading itself open the same menu as its plus, and give
   each plus its full name ("Add to Label") as its accessible name, not only in the tooltip.
2. **Nothing takes you from the bishop to his circle (6 of 6).** All six clicked "Myriel" and got
   the "Myriel to Javert" shortest-path row instead of the person. Nobody looked in the "For the
   report" folder. All six ended on Louvain's Community 3, chosen by size, by its note count, by a
   density calculation, or (recipe recipient) by reading a note. With PageRank covering the color,
   nobody could see which ten nodes Community 3 is, and hovering the row only says the name cannot
   be changed. Severity 3. This is not what the task measures, but it is where most of the time
   went. Caveat: the study tool clicks by name, so some of "clicking Myriel hits the path row" may
   be the tool rather than the canvas; it should be confirmed with a real pointer before it is
   acted on. Wanted: a person's name in search leading to that person, a "select neighbors" action,
   and a group row that shows its members when hovered or opened.
3. **The drawing does not show the labels once they are set (5 of 5 who set them).** A mock
   artifact, and not counted in the grades, but it decided how four of the five rated themselves:
   "If the labels aren't on the picture, it didn't happen." Until the skeleton draws the label
   lines on the group's nodes, this task cannot measure whether people trust the result. Fix the
   skeleton before this task runs again.
4. **The second plus going straight to "Below", and "Note count" being ready-made, worked (5 of 5
   who got there).** Nobody expected the first line to come pre-filled, nobody typed text, and
   every one of them read "Above" and "Below" as the arrangement the task asked for. Three
   (Gephi user, Cytoscape user, marketing analyst) said a ready-made note count is something their
   current tool cannot do without building a column by hand. Keep it.
5. **"label" means two things on one screen (4 of 5 who reached the field list).** With the table
   open, picking "label" in the field list sorted the table's "label" column instead. Likely partly
   the study tool, which clicks the first match for a name, but for a screen-reader user two
   controls with the same name are a real problem. Severity 2. The same goes for "Data" (the left
   rail and the panel tab), which four participants reached the wrong one of.
6. **"Paints 10 nodes" opens a list of 5 (1 of 6, Gephi user).** Following the link on Community 3
   showed "5 nodes" with a list of reasons that did not include Community 3. Single voice, outside
   the task; check whether the link opens the wrong view before treating it as a finding.
7. **Once a line exists, "Show labels" disappears from the menu (1 of 6, Gephi user).** Pressing
   the plus a third time added a "Right" line when she was looking for a switch to draw the labels.
   This is the same blank-canvas artifact showing up as a search for a missing control; it should
   fade once the canvas draws labels.
