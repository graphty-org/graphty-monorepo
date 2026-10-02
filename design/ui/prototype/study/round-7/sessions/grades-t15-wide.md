# Round 7 grades: t15-wide, "apply a colleague's colors and analysis steps to wide host data"

The task: a colleague sent the colors and analysis steps their team uses on host data, without
their data. Two of the things the file expects to find about each host are named differently in
the participant's hosts (the IT estate, 300 hosts, 69 attributes each). The participant puts the
file to use on their hosts so that nothing in it is silently skipped.

What counts as success: the Apply dialog over the hosts ("Apply recipe: Estate exposure review",
"4 of 6 matched by name and type") lists the two names it could not place, vuln_crit_30d and
owner, and the participant picks one of their own columns for each from the attribute list before
pressing Apply. Success with difficulty: they apply with one left unplaced and then notice it in
the result. Failure: they apply with the mismatches unread and believe everything applied.

The designed path is: the hosts graph at rest -> the Apply dialog over the hosts, with its two
unplaced names (shots/tasks/t15-wide/01.png, 02.png).

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating.

## The designed end state could not be reached

No control in the clickable skeleton leads to the hosts' Apply dialog. Every way in -- the
project-name menu's "Apply recipe or style file...", Quick actions, the main menu's "Open..." file
list and Data > Add data > File... -- opens one of two other files: the mule-ring triage recipe
or the risk-review style file. Both belong to a bank-transfers project, and opening either one
redraws the whole window as "Transfers, March 2026", 3,000 nodes. Cancel then closes the dialog
onto the skeleton's default project, "Les Miserables". The hosts recipe file
(estate-exposure-review.graphty) is listed in no file picker.

So these four sessions do not measure whether the dialog's two pickers get read and used. They
measure whether people can find where to bring in someone else's file, and what they do when the
app appears to change the open project under them. The grades below are still graded strictly
against the stated bar; the findings separate what is the design from what is the skeleton's
wiring.

## Grades

| Participant | Their rating | Grade | Why |
|---|---|---|---|
| Cybersecurity analyst (Priya) | gave up | **gave up** | Twenty steps: Views and its "..." menu, the Style tab, the right panel's "More actions", the main menu, "Open..." (opened the style file; the project became Transfers), Cancel (became Les Miserables), Open recent, Data > Add data > File... (opened the transfers recipe), Paste..., Analyze. Never saw the hosts' dialog. She concluded, correctly, that nothing was applied to her hosts. Last screen: the Analyze palette. |
| Knowledge engineer (Min-ji) | gave up | **gave up** | Views, the main menu, Style, the right panel's menu, Analyze, "Open..." (the style file, project switched), Open recent, Data > Add data > File... (the transfers recipe, switched again), From a URL..., Paste... (Les Miserables), Assistant. Never saw the hosts' dialog; concluded correctly that nothing applied: "I could not tell if my IT estate was still open." |
| Recipe recipient (Tom) | gave up | **gave up** | The shortest session: main menu > "Open..." > risk-review-look.json (project switched to Transfers), Cancel (Les Miserables), Open recent, Views. Stopped after "two goes"; would email the colleague for a picture and a spreadsheet. Concluded correctly that nothing applied. |
| Bioinformatics researcher (Dr. Chen) | failure | **gave up** | The only participant to find the designed command, "Apply recipe or style file..." under the project name, after about eight wrong places (main menu, right panel's menu, Views menu, graph dropdown). It opened the transfers recipe over a swapped project; Cancel landed in Les Miserables; "Show all" showed the matched rows. She stopped on her own and concluded correctly that nothing had been applied to her hosts. Graded as giving up rather than failure: she abandoned the task and believed nothing wrong. Last screen: the Analyze palette on the hosts. |

**Tally: 0 success, 0 success with difficulty, 0 failure, 4 gave up (4 sessions).**

No one applied anything, so no one could show the failure the task was built to catch (applying
with the two mismatches unread). Single Ease Question: 2 of 7 from all four.

## What the sessions show

Counts are out of 4. Each finding says whether it is the design or the skeleton's wiring.

1. **No one looks under the project name for "apply someone else's file".** (Design.) 3 of 4 went
   to the main menu first and chose "Open...", the only file-taking command there; 3 of 4 tried
   Views ("a colleague's way of looking at it might be a view"); 2 of 4 tried the Style tab.
   Only 1 of 4 found "Apply recipe or style file..." under the project name, after about eight
   wrong places, and said "I would never have looked under the file name first." 0 of 4 found it
   in under five steps. Three participants named "Import" as the word they were looking for; it
   appears nowhere. Nielsen severity 3 (major): the task cannot start without this command, and
   the one person who found it found it by exhaustion.

2. **Two file pickers for one job, with different wording.** (Design.) The main menu's "Open..."
   list shows bare file names; the Data > Add data > File... list labels the same files
   "Recipe:", "Style file:" and "Data file:". 2 of 4 saw both and noticed the difference; the
   cybersecurity analyst only learned that "recipe" is the word for colors plus steps from the
   second picker. 3 of 4 feared "Open..." would replace their project before choosing it.
   Severity 2 (minor): it slows people down and makes "Open..." feel destructive, but both lead
   to the same dialog.

3. **The project appears to change when the dialog opens, and again on Cancel.** (Skeleton
   wiring, with a real lesson.) 4 of 4 saw "IT estate" become "Transfers, March 2026" when an
   apply dialog opened, and 4 of 4 who pressed Cancel or a later entry landed in "Les
   Miserables". Every participant read this as losing their hosts; 3 of 4 named it as the reason
   they stopped trusting the tool. This is not a designed behavior -- the skeleton draws the
   transfers project behind the transfers recipe and returns to its default project on close --
   so it is not graded as a design defect. The lesson that does carry over: the title bar is the
   first thing people check after any file action, and the Apply dialog should say on its face
   which open project it will apply to ("Apply to: IT estate, March 2026").

4. **The hosts recipe is nowhere to be picked.** (Skeleton wiring.) 4 of 4 read the file lists
   and said none of them was for hosts. The task said the file had been sent, but no list offered
   it, so every participant spent their effort judging whether a transfers file might be the
   colleague's. Must be fixed before this task can be rerun: estate-exposure-review.graphty has
   to appear in both file pickers, and the project-name menu's command has to open the hosts
   dialog when the hosts project is open.

5. **The dialog itself was praised by everyone who saw it.** (Design, positive, but not tested on
   its real job.) 3 of 4 opened an Apply dialog and all three singled it out as the best thing in
   the session: "Brings / You supply / Expects", the match count, a per-row "Choose an attribute"
   or "Leave unbound", and Apply held back until each is decided ("the opposite of silently
   skipping"). One caution: the recipe recipient did not know what "unbound" means. None of this
   is evidence that people read and fix the two mismatches on the hosts, because no one saw the
   hosts' version with two open pickers and a 69-attribute list.

6. **The left panel's "..." beside the search box could not be reached.** (Mostly the study
   tool.) 3 of 4 tried to open it and could not guess its accessible name in about a dozen tries
   each. A real mouse user would just click it; this is a limit of naming controls by text in the
   click-through tool. It does suggest the menu's name is not one people would guess. Severity 1
   (cosmetic) as a design finding.

## Before this task is rerun

- Wire the hosts project's entries (project-name menu, Quick actions, both file pickers) to the
  hosts' Apply dialog, and list estate-exposure-review.graphty in both pickers.
- Make Cancel return to the project that was open, not the default one.
- Then rerun with at least four participants; until then, the question the task was written to
  answer -- do people read and fix the two unplaced names before Apply -- has no evidence either
  way.
