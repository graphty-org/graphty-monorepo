# Grades: write every character's name on the Les Miserables sample

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Right now only a few characters have their names written on the drawing. Get every
character's name written next to its dot."

Intended path: dismiss the usage banner, open the Les Miserables sample, select the Everything
row, press the plus beside Label in the inspector, choose "Label line", and in the empty line's
attribute picker choose the name column, "label". Names then appear on every dot.

Grading rule: what ended on screen and what the participant concluded, not what they believed.

- Success: the line bound to "label" on Everything (or a row covering all 77), no detours.
- Success with difficulty: got there after a wrong turn, a long search, help from a hover, or
  "Show labels" first and a line second.
- Failure: no line bound to the names (or typed text instead), or a wrong conclusion.
- Gave up: stopped without names and said so.

## Results

| Participant | Their call | Graded | Why |
|---|---|---|---|
| Explorer Elena | success with difficulty | **failure** | Ended on Everything with "Show labels" ticked and no label line (final render 14: the same dozen names). She concluded "I think it's on", which is wrong. |
| Recipe recipient (Tom) | gave up | **gave up** | Three tries: "Label" on the PageRank panel, the "Labels shown anyway" row, a hover on the plus that showed nothing. He stopped, partly afraid that adding a label under PageRank would change the colors. |
| Alert reviewer (Nadia) | success with difficulty | **success with difficulty** | Found "Add to Label" only by hovering a sibling plus. Took "Show labels", ticked it with no effect, then went back to "Label line" and chose "label". Final render 16: all 77 names. |
| Class-project student | success with difficulty | **success with difficulty** | Dead ends on the Labels row and on PageRank's Label heading, then the "Show labels" detour. A second press of the plus opened the attribute picker directly and she chose "label". Final render 14: all names, with the line and the ticked checkbox. |
| Nonprofit operations analyst (Grace) | failure | **gave up** | Ticked "Show labels" on Everything and saw no change. She concluded correctly that it had not worked and stopped: "I'd stop here and ask someone." A correct conclusion and an explicit stop make this gave up, not failure. |
| Data journalist (Ruth) | failure | **failure** | Ended with "Show labels" ticked and no names added. She believed "that's the right switch" but couldn't confirm it, so she ended on the wrong control. |
| Gene-ontology Cytoscape user (Joaquin) | success with difficulty | **success with difficulty** | About 20 attempts: the Labels row, Quick actions, the graph Style tab he couldn't reach, then hover discovery of "Add to Label", the "Show labels" detour, then a line bound to "label". |
| Intelligence analyst (Marcus) | gave up | **gave up** | Never found the plus by name. Data page and main menu dead ends, and the graph Style tab snapped back to PageRank. He stopped with the original names only. |
| Supply-chain analyst (Dana) | gave up | **gave up** | The plus had no name she could find. Row menus, Settings and the graph Style tab (which snapped back to PageRank) were all dead ends. She stopped. |
| Screen-reader analyst (Morgan) | success with difficulty | **success with difficulty** | Found "Add to Label" by tabbing. Took "Show labels" first (no effect), then on a fresh start "Label line" and "label". Final render 16: all names. She needed the moderator to confirm success because nothing on screen said so in words. |
| ML engineer, recommender systems (Chris) | gave up | **gave up** | The plus did nothing for him. The command palette's "Add label line" jumped into another project. The column menu's "Add label line" said "not available yet". He stopped with the original names. |
| Bioinformatics researcher (Dr. Chen) | success with difficulty | **success with difficulty** | About 12 attempts: the Labels row, the PageRank heading, the main menu, Settings, the graph Style tab (five tries), the "Show labels" detour and an accidental Columns popover. Then a second plus press and "label". All 77 names drawn. |

**Totals (12 participants):** 0 success, 6 success with difficulty, 2 failure, 4 gave up.
Completion was 6 of 12, and nobody took the direct path. Median ease rating (1 = very difficult,
7 = very easy): 2.5. Every finisher rated it 3, every non-finisher 2.

Two grades differ from the participant's own call. Elena thought she had partly succeeded, but
she ended on the wrong control with no names drawn. Grace called herself a failure, but she
stopped and asked for help after correctly concluding that nothing had happened.

## Findings, with evidence counts and severity (Nielsen 0-4)

1. **"Show labels" is a trap. Severity 4.** 8 of 12 chose "Show labels" from the plus menu
   because its name matches the task. It adds an unticked checkbox, and ticking it changes
   nothing on the drawing. Three people stopped there (Elena, Ruth, Grace), which is every
   failure but the ones who never found the plus. The five who recovered did so by guessing
   that something must also say WHAT text to show. Morgan's fresh-start run shows that a label
   line alone draws the names, so the checkbox is not even needed for this task.
   Two participants (Elena, Grace) explained the silence with the inspector's "Covered by
   PageRank for Color" note: they guessed PageRank was covering the labels too.

2. **The Label heading is not a control, and its plus has no findable name. Severity 4.**
   12 of 12 clicked the word "Label" (on Everything, on PageRank or both), and nothing
   happened. The plus's own hover showed nothing ("Label" hover: no tooltip). People learned
   its name, "Add to Label", only from a NEIGHBORING plus's tooltip ("Add to Effects", "Add to
   Shape") or by tabbing. Two people stopped here without ever opening it (Tom, Dana), and two
   more never opened it (Marcus, Chris). Six people also said "Add to Label" reads like adding
   to an existing label, not like "show names".

3. **The "Labels shown anyway" row draws everyone first and dead-ends. Severity 3.**
   12 of 12 clicked it (first click for 10 of them). It says "1 node" while about 13 names
   are drawn, and opening it says "not available yet". 9 of 12 said the count contradicts the
   drawing, and 3 called that a trust problem (Marcus, Ruth, Dr. Chen). Nothing on screen
   explains why the starting dozen names are shown.

4. **The inspector opens on PageRank, not on the characters. Severity 3.** 7 of 12 first
   tried Label on PageRank's panel. 4 said they didn't want names "under a ranking". Tom
   stopped partly for fear of changing someone's colors. Everything was found by guessing
   ("sounds like all the dots"). 10 of 12 got there, but only after a dead end.

5. **The graph's own Style tab can't be reached. Severity 3.** 5 of 12 (Dr. Chen, Joaquin,
   Marcus, Chris, Dana) looked for a graph-level label setting. They saw the graph panel only
   while a menu, palette or dropdown was open, and it snapped back to PageRank when that
   closed. It cost Dr. Chen five tries. Dana: "I don't trust a screen that changes what I'm
   editing."

6. **No confirmation that names were drawn. Severity 3 (4 for screen-reader users).** 4 of
   12 asked for a sentence like "77 names shown" (Morgan, Ruth, Grace, Elena). Morgan could
   only learn she had succeeded by asking the moderator.

7. **The plus behaves differently the second time. Severity 2.** 3 of 12 (the student,
   Joaquin, Dr. Chen) saw it open a menu once and then go straight to the attribute picker.
   It helped all three, but none of them chose it.

8. **Overlap after labeling. Severity 2.** All 6 finishers said the center is a pile of
   overlapping names. The intended behavior, hiding some names to avoid overlap and letting
   the reader notice, is not drawn in the skeleton: every final render shows all 77 names on
   top of each other. So nobody could notice the hiding, and that part of the success
   criterion was not graded. Joaquin: "at my 350 GO terms it would be the hairball of labels
   I always get."

9. **The attribute picker worked. Positive.** Every one of the 6 who reached it chose "label"
   at once. The "Name, Label" hint beside it was cited as the cue by 4 (Nadia, the student,
   Joaquin, Morgan). Joaquin and Dr. Chen said the grouping (my columns, results, notes) beats
   Cytoscape's passthrough mapping.

## Mock-fidelity notes (not graded against participants)

- The command palette's "Add label line" result opened a different sample project (Chris). It
  should act on the open graph.
- The column menu's "Add label line" (Data > label > More actions) answers "not available yet".
  That is one of the accepted alternate routes, so nobody could use it.
- The Data page for "label" says "Painted by: No row paints from label" while about 13 names
  are drawn (Marcus). The panel and the picture disagree.
- The reference render for the attribute picker (shots/tasks/r8-t10/04.png) shows the picker
  on the Group 2 row with existing Above and Below lines, not on Everything with an empty line.
  It does not depict the graded path.
- The Everything row's Color reads 808080 while every dot is orange because PageRank covers it.
  The intended base color is not drawn. Comments: Joaquin recorded "Fill color 808080" without
  objecting. Elena and Grace read the "Covered by PageRank" note under it as a possible reason
  their labels didn't appear. That is a misreading the cover note invites when another
  property is silently ineffective.
- Shape "Faceted sphere" on a 2D drawing drew two puzzled remarks (Dr. Chen, Marcus).
