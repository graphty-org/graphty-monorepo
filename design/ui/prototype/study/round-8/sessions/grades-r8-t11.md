# Grades: rearranging the drawing so the clusters separate (round 8, task r8-t11)

Task given to participants: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. The drawing looks crowded in the middle. Try a different way of arranging the dots
so the clusters are easier to tell apart."

Success state: the toolbar's Layout popover (app-b/#/toolbar/layout-open) or the graph inspector's
Layout tab opens the method list (app-b/#/inspector-nothing-selected/layout-method), and the
participant picks a method other than Spread Out and says why it should separate the clusters.
Success with difficulty: tried the canvas menu's re-run or reshuffle, or View, first; or more than
two wrong turns; or reached it with a long search or help from a hover. Failure: only zoomed or
fit, or re-ran the same arrangement and stopped.

Grading notes applied:
- The sample opens already settled, so stopping the motion is not part of the task.
- While the method list is open the skeleton draws the canvas behind it blank. Comments about not
  seeing the drawing while choosing are logged below, not graded.
- The study tool lets a participant click or hover a control by its name. Clicking an icon-only
  button by its hidden name ("Layout") is not something a real first-time user can do without
  first hovering it, so a direct click by that name is graded as reaching it, with the caveat noted.

Each grade was checked against the participant's last render, not only their own account.

## Result

| Participant | Their own grade | Graded | How they found Layout | Method picked | Ended on |
|---|---|---|---|---|---|
| explorer-elena | success-with-difficulty | success-with-difficulty | hovered the toolbar icon | Natural Grouping | separated clusters |
| recipe-recipient | success-with-difficulty | success-with-difficulty | main menu, then saw the Layout tab; clicked "Layout" | Natural Grouping | separated clusters |
| alert-reviewer | success-with-difficulty | success-with-difficulty | hovered all five toolbar icons | Natural Grouping | separated clusters |
| class-project-student | success | success | clicked by the word "Layout" | Natural Grouping | separated clusters |
| nonprofit-operations-analyst | success-with-difficulty | success-with-difficulty | Graph, then the graph-name menu revealed the Layout tab | Natural Grouping | separated clusters |
| data-journalist | success-with-difficulty | success-with-difficulty | hovered the toolbar icon (looked for "Arrange" first) | Natural Grouping | separated clusters |
| gephi-holdout | success-with-difficulty | success-with-difficulty | clicked by the word "Layout" | Natural Grouping, then ForceAtlas2 | original arrangement, layout running |
| expert-emma | success-with-difficulty | success-with-difficulty | hovered the toolbar icon (tried "Run" too) | Natural Grouping | separated clusters |
| cytoscape-holdout | success-with-difficulty | success-with-difficulty | main menu first; landed on the toolbar button by accident | Natural Grouping | separated clusters, "Nothing to undo" toast |
| analyst-alex | success-with-difficulty | success-with-difficulty | hovered the toolbar icon (tried "Run" too) | Natural Grouping | separated clusters |

Totals: 1 success, 9 success with difficulty, 0 failure, 0 gave up (10 participants).

Single Ease Question: 5, 4, 5, 5, 4, 5, 5, 5, 5, 5 (mean 4.8 of 7). The two 4s are the two
participants who reached "Layout" only by luck through the right panel.

Every participant reached the method list and every one picked Natural Grouping, each with a
reason tied to the task ("sounds like put the groups together", "sounds like the one meant for
clusters"). Nobody tried the canvas menu's re-run or reshuffle, View, zoom or fit. Nobody used the
inspector's Layout tab to get to the method list: the three who saw that tab clicked "Layout" and
got the toolbar popover instead. The difficulty in this task is almost entirely in finding the
door, not in choosing once inside.

## Why each grade

- explorer-elena: opened the sample, said nothing on screen said arrange or layout, hovered the
  bottom toolbar and learned the play triangle is "Layout" ("I would not have clicked that by
  myself without the tooltip"). Then Layout, Spread Out, Natural Grouping. Last render (08) shows
  the separated clusters and Method: Natural Grouping. Found by hover: success with difficulty.
- recipe-recipient: hovered "Play" (no such name), opened the main menu (no layout there), noticed
  a Layout tab appear on the right, clicked "Layout" and got the toolbar popover without noticing
  the difference. Then Natural Grouping with a clear reason. Last render (08) shows the result.
  Two wrong turns plus luck: success with difficulty. He also asked whether the clumps are real or
  an artifact of the method -- a sound question, not a misreading.
- alert-reviewer: hovered "Graph" in the left list, then hovered each of the five toolbar icons in
  turn until one said Layout. Natural Grouping, closed the dialog. Last render (13) shows the
  result. Long search: success with difficulty.
- class-project-student: typed the tutorial word "Layout" and the click landed on the icon-only
  toolbar button; no wrong turns, no hover. Natural Grouping, with "Columns by Group" considered
  and rejected for a reason ("columns doesn't sound like a network picture"). Last render (06)
  shows the result. Graded success by the rule, with the caveat that a real first-timer could not
  click an unlabeled icon by its name; read this as "the word Layout was what he looked for," not
  as evidence the icon is findable.
- nonprofit-operations-analyst: clicked Graph (no effect), opened the graph-name menu (Compare
  graphs and a technical note; nothing about arranging), and only then saw a Layout tab on the
  right. Escape, Layout, Natural Grouping. Last render (08) shows the result. Two wrong turns and
  "finding it was luck": success with difficulty.
- data-journalist: looked for "Arrange" (nothing has that name), hovered the toolbar and found
  Layout on the play triangle. Natural Grouping, with "Columns by Group" as the runner-up. Last
  render (08) shows the result. Found by hover: success with difficulty.
- gephi-holdout: clicked "Layout" by name on a Gephi-informed guess that the play triangle is
  Run, picked Natural Grouping for the clusters, closed the dialog and confirmed the clusters
  separated (render 06). She then went looking for ForceAtlas2, found it in the engine menu under
  Spread Out, chose it, and after Resume layout ended on the original hairball with Method: Spread
  Out (render 12). Her conclusion is correct -- Natural Grouping did the task and she "would go
  back to it" -- but the screen she left is not the separated arrangement. Reached the success
  state cleanly, ended elsewhere with a correct conclusion: success with difficulty.
- expert-emma: hovered "Layout" and "Run", found the play triangle. Picked Natural Grouping and
  rejected Columns by Group because it "would just put Louvain groups in columns, which is
  circular". Last render (08) shows the result. Found by hover: success with difficulty.
- cytoscape-holdout: looked for a Layout menu in the main menu (none), saw the Layout tab appear
  on the right, aimed for it, and got the toolbar popover by accident. Hovered Natural Grouping,
  then picked it. Last render (10) still shows the separated clusters, plus a "Nothing to undo"
  toast from her Ctrl+Z test. One wrong turn and an accidental find: success with difficulty.
- analyst-alex: hovered "Layout" and "Run", found the play triangle ("an odd icon for it"). Picked
  Natural Grouping. Last render (09) shows the result. Found by hover: success with difficulty.

## What stood in the way, with counts

Severity is Nielsen's 0-4 scale (4 = usability catastrophe).

1. The way in to layout is an unlabeled play-triangle icon (10 of 10 remarked on it; severity 3).
   Five found it only by hovering the toolbar (elena, alert-reviewer, data-journalist,
   expert-emma, analyst-alex), three found the word "Layout" only after opening an unrelated menu
   made a Layout tab appear on the right (recipe-recipient, nonprofit-operations-analyst,
   cytoscape-holdout), and two clicked it by the word (class-project-student, gephi-holdout). Six
   said the play triangle reads as "run", "start", "animate" or "play a presentation", not
   "arrange". Two looked for the word "Arrange" or "arrange" first. The Layout tab in the right
   panel is not shown on first open (the panel shows the selected PageRank row), so the only
   labeled door is hidden until something else changes the selection.
2. The Layout dialog covers the result after a method is chosen (10 of 10 had to close it to see
   what they did; severity 2). Choosing applies at once, which was liked, but nobody could judge
   the arrangement without closing the box.
3. Escape does not close the Layout dialog (10 of 10 pressed Escape and it stayed open, raising a
   row tooltip instead; severity 2). The X worked every time. This may be a skeleton gap rather
   than a design decision; check the spec before treating it as a finding.
4. Engine parameters are shown open beside the method list (7 of 10 called them out as jargon or
   intimidating: "physics homework", "a wall of numbers"; severity 2). Elena said this was the part
   that made the tool feel "not for me". The three experts (cytoscape-holdout, expert-emma,
   gephi-holdout) valued the same fields.
5. Method names hide the algorithm until one is chosen (6 of 10: analyst-alex, cytoscape-holdout,
   expert-emma, gephi-holdout, class-project-student, data-journalist; severity 2). The experts
   want ForceAtlas2 or spectral named in the list; the novices want a one-line plain description
   of what each method does. The row tooltip repeats the Size and Weights columns instead of
   describing the method (cytoscape-holdout, data-journalist).
6. After rearranging, every node is still one color, so the clusters are told apart only by
   position (6 of 10; out of scope for this task, logged for the coloring tasks).
7. Ctrl+Z after a layout says "Nothing to undo" although the toast just offered Undo (1 of 10,
   cytoscape-holdout; severity 3 for her, because undo across a layout is her named trust test).
   Single voice and possibly a skeleton gap; confirm against the spec before acting.
8. ForceAtlas2 sits in the engine menu under Spread Out, not in the method list; its fields stay
   those of the previous engine; after choosing it the canvas did not change and the Method
   readout says "Spread Out" with no engine (1 of 10, gephi-holdout). The unchanged canvas and the
   unchanged fields are likely skeleton fidelity limits; the hiding of a named algorithm under a
   plain-language family, and a readout that omits the engine, are design questions.
9. Single-voice remarks: "Resume layout -- resume what? It says settled" (elena); unsure whether
   rearranging changes the data or only the picture (alert-reviewer); clicking the play button
   also switched the right panel to the graph summary unasked (gephi-holdout; three others
   noticed it neutrally or as a plus).

Logged, not graded: four participants (analyst-alex, nonprofit-operations-analyst,
recipe-recipient, data-journalist) noted the drawing vanished or was hidden while the method list
was open; recipe-recipient asked "Did I break it?". This is the skeleton's blank canvas behind the
list.

## What worked

- "Natural Grouping" matched the task's words for all ten; eight weighed "Columns by Group" and
  rejected it with a reason.
- Choosing applies at once with "Laid out again ... Undo" (praised by 8 of 10).
- The seed shown next to the method, and the engine named once chosen, built trust with the four
  expert participants.
