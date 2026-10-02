# Round 7 grades: t15, "apply a colleague's recipe"

The task: a colleague in another team emailed their team's colors and analysis steps, saved from
their own copy of graphty with none of their data. The participant puts them to use on the
transfers already open and makes sure everything in them landed on something.

What counts as success: the recipe is applied (project-name menu > "Apply recipe or style
file...", or main menu > "Open..." or the Sources "+", which hand a recipe to the same dialog),
the dialog shows every item matched, and after Apply the new rows sit on top of the tree.
Success with difficulty is the same end after first looking in the rail or in Views. Failure is
opening the recipe as a new project and losing the open transfers.

The designed path is: the transfers at rest -> the apply dialog for "Mule ring triage" -> the
transfers with the recipe's six rows on top (Watchlist "7 of 19", Personalized PageRank, Max flow,
Cycles, riskScore, alertRule) and a toast with Undo.

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating.

## The click-through could not reach the end state

Read this before the table. In the participant view, pressing Apply in the dialog does not lead
to the designed end state. Instead:

- From the project-name menu's dialog, Apply shows the toast "Mule ring triage added 6 rows on
  top of the tree", but the tree, the canvas and the "Nothing is colored or sized by a row" chip
  are exactly as before (fraud analyst render 04). The designed end state (shots/tasks/t15/03.png)
  has the six rows, a colored canvas and the Watchlist inspector.
- From "Open..." > risk-review-look.json, Apply lands on a different project entirely (Les
  Miserables, with its own rows), and Undo then says "Nothing to undo" (recipe recipient renders
  07 and 08).
- Clicking Graph after Apply shows yet another state (Louvain and "Links in" rows, colored by
  community), none of it from the recipe (alert reviewer render 19, genomics user render 12).

So no participant could see "the new rows sit on top", whatever they did. Four of the five did
everything the designed path asks up to and including Apply. Every one of them went on to look
for the rows (Style, Views, Table, Everything, Notes, hovering the toast) and stopped because
the screen contradicted the toast. Their stop is the right reaction to what was on screen and
says nothing about the design's end state, which nobody saw.

The grade column follows the rule (what ended on screen). The column "If Apply had worked" grades
the same path against the designed end state, so the round's synthesis can tell a finding about
the design from a finding about the click-through.

## Grades

| Participant | Their rating | Grade | If Apply had worked | Why |
|---|---|---|---|---|
| Fraud analyst | failure | **gave up** | success | Went to the case name first ("in Excel I'd go File"), found "Apply recipe or style file..." in under a minute, opened Show all and saw every row's column match (fee -> fee, time -> timestamp, riskScore -> riskScore, alertRule -> alertRule), pressed Apply. The screen then showed the toast and nothing else; she searched Style, Views, Table and the Watchlist name, found none of the six rows, and stopped: "It told me it added six things and I can't find one of them." Last screen: the transfers, unchanged. Her conclusion (cannot confirm anything landed) matches the screen. |
| Genomics Cytoscape user | failure | **gave up** | success | Project-name menu on the first try ("File menus usually live there"), dialog, Show all, Apply. Then Style, Everything, Table, Views, the Columns panel and Notes: no recipe rows anywhere, and two places disagree about whether anything is colored. Clicked Graph and got an unrelated Louvain state: "I don't know whose state this is. That's where I stop." Concluded, correctly for the screen, that she cannot say what the file did. |
| Marketing analyst | failure | **gave up** | success | Project-name menu first ("I almost went to Export"), dialog, Show all, Apply. Searched Style, Everything, Table, the Watchlist name, Views and the toast; stopped: "The tool told me six rows landed, and I can't see a single one of them." Last screen: the toast over the unchanged transfers. |
| Alert reviewer | failure | **gave up** | success with difficulty | Five wrong places before the right door: main menu (saw Open... and avoided it, fearing it would replace her project), Style, the graph's More actions, Views and its "More for views", then Analyze. Found the item under the project name ("I would not have looked under the project name -- that's where I rename things"), Show all, Apply. Then the same empty result, an Escape that showed an unrelated Louvain state, and a stop: "Six rows added, zero rows I can see." Even on a working end state this is difficulty: Views and the rail were searched first. |
| Recipe recipient | failure | **failure** | failure | Took "Open..." from the main menu (a valid door), but in the file list chose risk-review-look.json (colors only) over mule-ring-triage.graphty (which he feared was "a whole project with their data"), and never came back for the analysis steps. In the style dialog, 4 of 5 matched; he bound the fifth (alertRule, a label) to "id (account)" as a guess "rather than leave something unbound". Apply landed on Les Miserables and Undo said "Nothing to undo". He concluded his data was gone. The landing and the failed Undo are the click-through defect, but the outcome stays a failure on design grounds too: he applied half of what was sent, with a guessed binding, and nothing told him the other file held the steps. |

**Tally (what ended on screen): 0 success, 0 success with difficulty, 1 failure, 4 gave up
(5 sessions).**

**Tally (if Apply had reached the designed end state): 3 success, 1 success with difficulty,
1 failure.**

Nobody opened the recipe as a new project, which is the failure the task was built to catch. The
recipe recipient lost his transfers on screen only because of the click-through defect, not
because he chose a "replace my project" door.

## What the sessions say about the design (evidence counts)

Findings are counted by participants who hit them independently. Severity is Nielsen's 0-4 scale.

1. **The door is under the project name, and three of five went there first** (fraud, genomics,
   marketing). The other two started at the main menu and saw "Open..."; one avoided it for fear
   it would replace her project (alert reviewer), the other used it and picked the wrong file
   (recipe recipient). No one looked for "recipe" by that word; "style file" is what three of them
   recognized. Two of five took a long route or the wrong file. Severity 2.
2. **"4 of 4 matched" sits over six rows, and nobody could tell what was counted.** Five of five
   asked "four of what?" (the recipe recipient's "4 of 5" over a five-row list read correctly).
   Show all answered it for everyone who pressed it: the count is of column matches. Severity 3:
   the task asks "did everything land", and the header looks like it answers that, but it does not.
3. **The Watchlist row says "19 accounts" without saying how many exist in the open data.** Five
   of five raised it, four in the words "whose 19 accounts?". The designed end state answers it
   ("7 of 19", with the twelve missing names in the inspector), but the dialog, the one screen
   everyone saw, does not. Severity 3: this is the one row where "did it land" has a non-trivial
   answer, and the answer arrives only after Apply.
4. **"Weight: loaded weight" on the PageRank row has no source-to-target arrow.** Four of five
   (all but the recipe recipient, who never saw that dialog). Severity 2.
5. **The style file and the recipe are two files, and nothing on the file list says which holds
   the steps.** One of one participant who reached the file list chose the colors-only file and
   never learned there was a second part. Single voice, but it is the only participant who saw
   that screen. Severity 3 if it holds.
6. **"Choose an attribute" / "Leave unbound" is a question the recipient could not answer, so he
   guessed.** One of one who met an unmatched item. Single voice. Severity 2.
7. **No way to leave a row out, and the comment bubble on the Cycles row cannot be opened from
   the dialog.** Fraud analyst asked for a per-row untick; three asked what the "1" said. Severity
   2.
8. **Jargon: "recipe", "set", "run", "the tree".** Raised by three (marketing, fraud, recipe
   recipient). Severity 1.

What worked, in the participants' words: the preview before Apply ("the most honest one I've
seen in one of these tools"; "better than Cytoscape's style import"), the column arrows under
Show all, and "one undo step" with Undo on the toast.

## Click-through and mock defects found (not design findings)

- Apply from the dialog does not lead to the designed end state (all five sessions; see the
  section above). This is the defect that decided four grades.
- Apply from the style-file dialog lands on a different project, and Undo then says "Nothing to
  undo" (recipe recipient).
- Escape or Graph after Apply shows a Louvain and "Links in" state that belongs to no step of
  this task (alert reviewer, genomics user).
- The Show all link becomes "Hide matched" but the list does not change (fraud analyst).
- "Everything" says its fill is 6366F1 (purple) while every dot is gray, and the Columns panel
  says kind is a color while the chip says nothing is colored (alert reviewer, genomics user,
  marketing analyst).
- The designed states disagree with each other: the dialog says alertRule matched alertRule (4 of
  4), but the designed end state's tree lists alertRule as "Unbound"; the dialog's backdrop says
  "March data" and the end state says "April data".
- The three-dot button next to the left search box has no accessible name the click-through tool
  could reach (alert reviewer tried six names).
