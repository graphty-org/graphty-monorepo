# Grades: a file that will not read (round 8, task r8-t05)

Task given to participants: "You have never used this program before. A coworker emailed you an
edited copy of a network file of Les Miserables characters; it is saved as
miserables-edited.graphml in your Downloads folder. Bring it into the program and either get to a
point where you can carry on working, or know exactly what to tell your coworker to fix."

Success state: from the first-launch start screen the participant opens the file picker (Open
project or file..., Ctrl+O, or the drop line), picks miserables-edited.graphml and reaches the
refusal on the import page (app-b/#/data-page/refused-ids: header "Untitled project", "Nothing to
show: nothing was read", Load off). They then say in their own words what is wrong (a repeated id,
and links to a node that does not exist) and what the coworker should fix, and either stop there
with that message or go on with "Choose another file..." to miserables.gexf or back to a
ready-made network. The file picker is an intermediate click, not a graded route.

Success with difficulty: understood the file was refused but could not say what to fix, or needed
more than one try to leave the page, or reached the answer after wrong turns. Failure: believed the
file opened, or left with no reason and no way on.

Grading rule for a known skeleton defect: on the refusal page, "Choose another file..." opens a
menu that says "No other data files in this folder", although the Downloads picker one step
earlier listed miserables.gexf. The "go on to miserables.gexf" branch of the success state is
therefore unreachable in the skeleton. A participant who tried that branch and was stopped by it
is graded on the rest of the task; the dead end is logged below as a skeleton defect, not counted
as a design wrong turn.

A look at the settings box after the participant had already read and understood the refusal, to
confirm that nothing there helps, is not counted as a wrong turn. Trying settings or Load in the
belief that they would get the file in is.

Each grade was checked against the participant's last render, not only their own account.

## Result

| Participant | Their own grade | Graded | Ended on | Message to coworker correct |
|---|---|---|---|---|
| alert-reviewer | success | success | refusal page | yes, both faults with line numbers |
| bioinformatics-researcher | success | success | refusal page, file settings open | yes, both faults with line numbers |
| data-journalist | success | success | refusal page | yes, both faults with line numbers |
| gephi-holdout | success | success | refusal page, file settings open | yes, both faults with line numbers |
| nonprofit-operations-analyst | success | success | refusal page | yes, both faults with line numbers |
| recipe-recipient | success | success | start screen, file picker reopened after Cancel | yes, both faults with line numbers |
| explorer-elena | success-with-difficulty | success | refusal page, "Choose a file" menu showing no files | yes, both faults with line numbers |
| class-project-student | success-with-difficulty | success-with-difficulty | refusal page, file settings open, "Never: read every record" chosen | yes, both faults with line numbers |

Totals: 7 success, 1 success with difficulty, 0 failure, 0 gave up (8 participants).

Every participant took the same way in: "No thanks" on the usage-data box, "Open project or
file...", tick miserables-edited.graphml, Open. Three clicks to the refusal for all eight. Nobody
used Ctrl+O or the drop line, nobody opened the Les Miserables sample by mistake, and nobody
believed the file had opened. All eight wrote a correct, forwardable message naming both faults:
id 11 used twice (lines 48 and 212) and three edges pointing at a missing node 80 (lines 590, 611
and 640).

## Per participant

**alert-reviewer -- success.** Read the red message on arrival, translated node and edge into
characters and links, and took "no setting here fixes" at its word. Clicked "Match report" hoping
for detail; nothing happened. Stopped with a correct email. The Match report click came after she
already had the answer, so it is not a wrong turn. Last render 03.png shows the refusal page.

**bioinformatics-researcher -- success.** Understood the refusal at once ("exactly what I want
from an importer"), clicked the empty "Match report", then opened file settings explicitly to
confirm there was no "skip bad edges" option ("I believe it now"). Both clicks were verification
after understanding. Correct email, including a likely cause. Last render 05.png shows the file
settings popover over the refusal.

**data-journalist -- success.** Read the message, said she would not poke at options because the
footer told her not to, clicked "Match report" hoping for character names, found it empty, and
stopped with a correct email. Last render 04.png shows the refusal page.

**gephi-holdout -- success.** Read the refusal twice, called it "the right answer", and opened
file settings looking for Gephi's "create missing nodes" and "merge" options, already expecting
the footer to be right. Stopped with a correct diagnosis and a guess at the cause from the
original's id range. Last render 04.png shows the settings popover over the refusal.

**nonprofit-operations-analyst -- success.** Read the refusal, compared it to a VLOOKUP returning
#N/A, heeded the footer and stopped. Two renders only: the cleanest session. Correct email.

**recipe-recipient -- success.** Read the first line as the whole answer, judged correctly that
the fault was in the file, and left with Cancel in one try. Cancel returned him to the start
screen with the file picker open again and a "Load canceled: nothing was loaded" notice with
Undo, which puzzled him ("undo what?"), but he had already left the page and closed the picker.
Correct email. Last render 03.png confirms the start screen and the reopened picker.

**explorer-elena -- success.** Understood the refusal from the first line and that the fault was
the coworker's ("I was about to assume I opened it wrong"). Opened file settings once, found it
unreadable, closed it, citing the footer. Then tried to carry on with the original file through
"Choose another file...", which said "No other data files in this folder" and covered the error
text. That is the skeleton defect above; it ended her attempt to go on, but she stopped with a
correct message, which the success state allows. She rated herself lower because of the dead
end, which is fair as an experience report and is logged as the top problem below.

**class-project-student -- success with difficulty.** Understood the refusal and could say what
to fix, but did not believe the footer: opened file settings, pressed the disabled Load, then set
"Stop reading" to "Never: read every record" expecting it to skip the bad records. Three tries
before accepting the file could not be read. Ended on the refusal page with a correct email. In
his words: "In hindsight the bottom line had already told me no setting would help; I just did
not believe it, because the settings box was right there."

## Problems seen, with counts

Severity is Nielsen's 0 to 4 (1 cosmetic, 2 minor, 3 major, 4 catastrophe). Counts are out of 8.

| Problem | Seen by | Severity | Note |
|---|---|---|---|
| "Choose another file..." on the refusal page lists no files, although the Downloads picker had just shown miserables.gexf; the menu also covers the error text | 1 (explorer-elena), the only one who tried it | 3 | Skeleton defect: the file list for this page has no entries for the Les Miserables case (sections/data-page.js, the chooseFile menu). It makes the "go on" half of the task unreachable and reads as the app contradicting itself. Fix before the next round, then retest the go-on branch, which no participant reached this round. |
| "Match report: miserables-edited" heading with nothing under it on a file that was not read | 7 (all but explorer-elena); 3 clicked it (alert-reviewer, bioinformatics-researcher, data-journalist) | 2 | Several expected a list of the offending records there and wondered whether something was missing. Hide it when nothing was read, or put the offending records in it. |
| Footer "Load is off: no setting here fixes ..." not believed while the settings box is offered beside it | 1 tried settings and Load to get in (class-project-student); 3 more opened settings to confirm (bioinformatics-researcher, gephi-holdout, explorer-elena) | 2 | The footer worked for 7 of 8, but it is small gray text at the bottom, read after the red box and the settings chip. "Stop reading: Never: read every record" looks like a way to skip bad records. Single voice for the failed attempts; the confirming looks show the question is common. |
| Error names ids and line numbers but not the characters (labels) involved, and nothing read means the rows cannot be seen | 3 (alert-reviewer, data-journalist, gephi-holdout) | 2 | They wanted to tell the coworker "Valjean and the new one both got 11". The labels are in the file being refused. |
| "Node", "edge", "id", "edge's ends" need translating for a first-time user | 6 (alert-reviewer, explorer-elena, nonprofit-operations-analyst, data-journalist, recipe-recipient, class-project-student) | 1 | All understood from context; the line numbers carried the meaning. |
| No way to load the valid part and list what was left out | 5 (bioinformatics-researcher, class-project-student, data-journalist, gephi-holdout, nonprofit-operations-analyst) | -- | A wish, not a usability defect: refusing a file whose ids conflict is the intended behavior, and four of the five said they preferred a refusal to a silent drop. Logged for the studio to weigh, not graded. |
| File settings text "1 and "1" are one node" is unreadable to a newcomer | 2 (explorer-elena, class-project-student) | 2 | Both read it as nonsense. |
| "Makes / Nothing yet" strip unexplained | 3 (class-project-student, data-journalist, recipe-recipient) | 1 | Noticed and ignored. |
| Cancel returns to the start screen with the file picker reopened and an Undo that reads as "undo the cancel" | 1 (recipe-recipient) | 2 | Single voice; the reopening follows from Cancel returning to whatever opened the page, here the picker. Worth a check with more participants. |
| No way to copy the error text | 1 (alert-reviewer) | 1 | Single voice. |

## What worked

- The refusal itself: all 8 read it on arrival, all 8 named both faults correctly with line
  numbers, and all 8 put it straight into an email. Several compared it favorably with Gephi,
  Cytoscape, stringApp and Excel, which would have dropped or merged records silently.
- Nobody believed the file opened. "Nothing to show: nothing was read" and the disabled Load left
  no doubt.
- "Load is off: no setting here fixes ..." stopped 7 of 8 from fiddling with options.
- "Files are read on this computer and never uploaded" on the start screen was noticed and valued
  by 5 participants before they opened a coworker's file.
- The file picker opened on Downloads with the right file at the top; nobody picked the older
  miserables.gexf by mistake.

## Caveats

- These are simulated participants in a clickable skeleton. The error text is a fixed string, so
  its clarity says nothing about how the real importer will word other faults.
- Nobody reached the "go on" branch, because of the skeleton defect above, so this round says
  nothing about how well "Choose another file..." or a return to the samples works after a
  refusal.
