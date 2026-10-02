# Grades: write a note attached to Valjean

The task: "You have just realized why Valjean matters to your argument. Write the thought down so
that next week you, or a colleague, can come back to it attached to him. You have never typed your
name into this program. The data on screen is a sample: characters of the novel Les Miserables,
linked when they appear in the same chapter."

The intended path: click Valjean on the canvas, choose Add note (the speech-bubble icon on the bar
that appears over the canvas when he is selected, the N key, or Add note in his right-click menu),
type into the box that opens already tagged with Valjean, and Save. The new note then sits at the
top of the Notes list with a Valjean chip, "Just now", and no author.

Grading rule: success means the note was written with Valjean as its subject and saved, and the
Notes list shows it with his chip and a time. Success with difficulty means it was written about the
whole graph first and moved, Notes was opened before Valjean was selected, or the end was reached
after a wrong turn or a long search. Failure means the note ended up attached to something the
participant did not intend, or they decided a name was required and stopped. Grades go by what was
on screen at the end and what they concluded, not by how they rated themselves.

How a hover is counted: every participant who used the icon bar picked the speech bubble as
"probably a comment" first, then rested the pointer on it to confirm before clicking. A single
hover that confirms the first choice is graded as no difficulty. (In the Neighborhood task, by
contrast, participants guessed two to four wrong names before finding the right icon, and that was
graded as difficulty.) The unlabeled icons are still a finding below.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Criminal intelligence analyst | success | success | Click Valjean, confirm the speech bubble by hovering, Add note, typed "Bridge", Ctrl+Enter. Saved note at the top of the list with the Valjean chip and "Just now" (05.png). Concluded correctly that it is attached to Valjean and carries a date but no name. His later detours (the wrong "Data", a "..." that opened Valjean's menu instead of the note's) came after the note was saved and did not undo it. |
| Gephi user | success | success | Same path. "Bridge: ties every group together" saved with the Valjean chip and "Just now", Valjean still selected (09.png). Her first three attempts to type failed because the study tool has no typing command, not because of the design: the box had focus when it opened. |
| Computational biologist | success | success | Same path; "Bridge node" saved with the Valjean chip and "Just now". Checked from two other panels and came back to find it still at the top (11.png). Concluded correctly that it saved, and correctly distrusted the "Notes 4" count, which did not change. |
| Recipe recipient | success with difficulty | success | Same path; "Bridge between Myriel and the students" saved with the Valjean chip and "Just now" (07.png). He rated himself lower because he could not tell whether the note survives closing the window and because it has no name on it. Neither changes what was on screen, and his reading of it (attached to Valjean, persistence unknown) is accurate. |
| Screen-reader analyst | success with difficulty | success | Started from the Table instead of the canvas, which is a valid way to select him, then reached Add note by its accessible name on the first try. "Val" and then "Hub" saved with the Valjean chip and "Just now" (08.png). Concluded correctly that writing worked and that coming back to the note from Valjean's side is unproven. Her lower rating comes from three disagreeing counts, a text box with no real label and the selection silently dropping, all of which are findings below, not detours on the way to the goal. |
| Analyst Alex | success | gave up | Got to the composer already tagged with Valjean (05.png) but never saved a note. Tried to type with the study tool's unsupported typing command, got nothing, pressed Ctrl+Enter on an empty box, and stopped: "in the real thing I'd type the sentence". His last screen is an empty draft with Save grayed out. The cause is the study tool, not the design; every other participant got past the same point by typing one key at a time. Not counted as evidence against the design. |

Totals: 5 success, 0 success with difficulty, 0 failure, 1 gave up (caused by the study tool).
Ease scores: 6, 6, 6, 6, 5, 5 out of 7. Nobody wrote the note about the whole graph first, nobody
opened Notes before selecting Valjean, and nobody thought a name was required. All six said they
would select the node first ("I want it on HIM"), and the selection bar's Add note opening a box
already tagged with Valjean was the most-praised thing in the session (6 of 6).

## Findings

1. **The "Notes" count on the Graph list never changes (4 of 6 noticed: biologist, intelligence
   analyst, recipe recipient, screen-reader analyst).** It reads 4 at the start and still 4 after
   a note is added, while the Notes list shows seven. The whole-graph panel on the right adds a
   third number, "1 note". Two of the four said this is where they would stop trusting the
   program, and the screen-reader analyst could not tell the three counts apart at all. Severity
   3 (major): a count that disagrees with its own list undermines exactly the "will it be there
   next week" confidence this task depends on. Either the counts mean different things (notes on
   the graph itself versus all notes in the project) and need different names, or the 4 is stale
   in the prototype. Either way it must be fixed before the next round.
2. **A saved note cannot be seen from Valjean's side (4 of 6: biologist, intelligence analyst,
   recipe recipient, screen-reader analyst; the Gephi user saw the hint but did not check).** After
   saving, nothing on the canvas marks Valjean as having a note, and his panel's Style tab says
   nothing about it. His "Why this look" list shows "Notes -- Label below", which three
   participants read as a promise of a visible label they could not find. The task is "come back
   to it attached to him", so a return path that starts from him is half the job. Severity 3. The
   screen-reader analyst reached his Data tab in an earlier task and it does list notes there; in
   this task nobody got to it (see finding 4).
3. **Nothing says the note has no author, or where a name would come from (5 of 6 raised it).**
   Every participant except the screen-reader analyst said a colleague coming back next week would
   not know who wrote which note; the intelligence analyst said that in his shop "a note without a
   name and a date doesn't exist". The owner has already decided this
   (owner-feedback.md): the author comes only from Settings, will usually be empty, is shown only
   when a project holds notes by more than one author, and the design must work well without it.
   So the finding is not "add an author field" but "the empty case is silent": nobody learned that
   a name can be set, or that it was not. The screen-reader analyst read the absence correctly
   ("I never gave one"). Severity 2. Worth testing: a quiet line in the composer or the note's
   menu, such as "No author set" with a link to Settings, shown only when none is set.
4. **Two controls named "Data" (3 of 6: biologist, intelligence analyst, screen-reader analyst).**
   Each wanted Valjean's Data tab to confirm the note and landed in the Data section on the left
   rail instead, which also cleared the selection. Same finding as in the Neighborhood task, now
   with three more participants. Severity 3 overall; here it blocked the confirmation step, not
   the task. Part of it is the study tool, whose click picks the first control with that name; a
   screen reader announcing "Data" twice is not.
5. **Unclear whether a saved note is kept (4 of 6: recipe recipient, Gephi user, intelligence
   analyst, biologist).** "Local only" reassured all four that nothing left the machine, but the
   recipe recipient opened it and read "Your project -- saved where you save it" as "you still
   have to save", with no unsaved-changes mark anywhere. He would email the note to a colleague
   instead. Three others asked how a colleague would read a note that stays on one computer.
   Severity 2 for most; severity 3 for anyone with a lost-work history, which is the recipe
   recipient's whole profile.
6. **The selection bar's icons have no words (5 of 5 who used the bar).** Every one hovered
   before clicking, and Alex named it as the one thing that cost him a point. The speech bubble was guessable, so it cost a
   hover here, not a failure. Severity 2. The same bar cost three participants several wrong
   guesses in the Neighborhood task, so the cost depends on the icon.
7. **The note box's only name is its placeholder (1 of 6, the screen-reader analyst).** "Write a
   note" is placeholder text, not a label, so a screen reader may announce only "edit, multi
   line". Focus landing in the box when it opens rescued her. One participant, but it is a basic
   accessibility rule (WCAG 1.3.1 and 4.1.2) and the fix is one label. Severity 2.
8. **Moving to another panel silently drops the selection (2 of 6: screen-reader analyst,
   biologist).** Going to the Graph list or the Data section cleared Valjean and swapped his panel
   for another, with nothing saying so. Severity 2.
9. **"Cites" is wanted but unreachable (4 of 6: Alex, biologist, Gephi user, intelligence
   analyst).** All four noticed that existing notes cite a measure ("Cites Betweenness") and said
   that is the most valuable part, then found no way to make their own note cite one. Not in this
   task's scope, but it is the strongest unprompted pull in the session. Recorded for the citation
   task.

## Prototype fidelity, not design findings

- The study tool has no way to click into the note box by name or type a sentence; participants
  had to send one key at a time. It cost every participant one to three failed attempts and ended
  Alex's session before Save. The tool needs a typing command before any other writing task runs.
- On the intelligence analyst's run, clicking "More" on his saved note opened Valjean's right-click
  menu on the canvas instead of the note's own menu, and the left panel jumped back to the Graph
  list. In the prototype, the "..." on a note card should open that note's menu.
