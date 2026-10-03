# Grades: keep a project under your own name and reopen it (round 8, task r8-t14)

Task given to participants: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. Open it, then imagine you have worked on it for an hour and must stop for the day.
Make sure the work is kept on this computer under a name you choose, put it away as you would at
the end of the day, and then bring it back as if it were tomorrow."

Success state: Save as... from the project-name menu (or a Save that asks for a name), a name typed
by the participant shown in the header, Close project back to the start screen with that name at the
top of Recent projects dated today, and a click on it reopening the Les Miserables project (77
nodes) under the new name.

How the grades were set. Each grade was checked against the participant's last renders, not only
their own account. A "wrong turn" is an action off the success path that left the participant
somewhere they had to recover from: a plain Save or Ctrl+S that saved without a name, a project
saved under a garbled name, a click that hit the wrong control. A typing slip noticed in the name
box and fixed before pressing Save is logged but is not a wrong turn. Exploring a control to answer
a question (resting on the main menu button, opening "Local only") is not a wrong turn either.

## Result

| Participant | Their own grade | Graded | Wrong turns | Ended on |
|---|---|---|---|---|
| explorer-elena | success-with-difficulty | success-with-difficulty | 1: saved as "Elena practiceLes Miserables copy", redid it | reopened as "Elena practice" |
| recipe-recipient | success-with-difficulty | success-with-difficulty | 3: a click aimed at "File" hit a panel row; plain Save from the main menu; saved a garbled name | reopened as "Tom practice Oct 2" |
| alert-reviewer | success | success | 0 (garbled text caught in the box before Save) | reopened as "Practice - Les Mis" |
| class-project-student | success-with-difficulty | success-with-difficulty | 2: looked for a Save button that does not exist; plain Save from the main menu ("Saved", no name) | reopened as "Dev Les Mis practice" |
| nonprofit-operations-analyst | success-with-difficulty | success-with-difficulty | 1: saved a garbled name, redid it | reopened as "Grace practice Oct 2" |
| data-journalist | success-with-difficulty | success-with-difficulty | 1: saved a garbled name, redid it | reopened as "Les Mis practice" |
| screen-reader-analyst | success | success-with-difficulty | 1: Ctrl+S first, which said "Saved" with no name or place ("Saved as what, and where?") | reopened as "Morgan practice" |
| intelligence-analyst | success-with-difficulty | success-with-difficulty | 2: plain Save from the main menu; the main menu stayed open and swallowed the next click | reopened as "Practice - Les Mis" |
| ml-engineer-recsys | success | success (see note) | 0 | reopened as "Les Miserables copy" |
| bioinformatics-researcher | success | success | 0 (garbled text caught in the box before Save) | reopened as "lesmis practice oct2" |

Totals: 3 success, 7 success-with-difficulty, 0 failure, 0 gave up (10 participants).

One grade differs from the participant's own. The screen-reader analyst pressed Ctrl+S first, got
a bare "Saved", and said they could not tell what it had saved or where. That is the task's own
definition of success with difficulty, even though they then went straight to Save as... and
finished cleanly.

Note on ml-engineer-recsys: they did not type a name. They said the click-through tool "gave me no
way to type", which is wrong (other sessions typed with it), and they saved under the suggested
name "Les Miserables copy". The project was kept under a new name and reopened, so the outcome is a
success. But this session is no evidence about the name box, and it is the only participant who
never met the name-box defect below because they never typed into it.

Nobody failed or gave up, and nobody reopened through Open project or file...: all ten reopened from
Recent projects, and every reopen showed the same rows, 77 nodes and the new name.

## What the sessions show, with counts

1. **The suggested name is not selected when the Save as box opens (7 of 7 who typed straight in).**
   Typing goes in front of "Les Miserables copy". Four participants pressed Save and got a project
   called, for example, "Elena practiceLes Miserables copy" (explorer-elena, recipe-recipient,
   nonprofit-operations-analyst, data-journalist); three caught it in the box (alert-reviewer,
   class-project-student, bioinformatics-researcher). Two others pressed Ctrl+A before typing out
   of habit (screen-reader-analyst, intelligence-analyst). Every one who hit it said other programs
   select the name. This is the skeleton, not the click-through tool: the field is focused with the
   cursor at the start and never selected (app-b/sections/project-menu.js, the save-as state),
   while Rename in place in the same menu does select its text. One job, two behaviors.
   Severity 3 (major): it silently produces a wrongly named file, and four of ten did not notice
   until the header showed it.

2. **Nothing confirms Save as, and nothing says where the project went (10 of 10).** Every
   participant said the Save as box asks only for a name, with no folder, and that after Save only
   the header changed. Every one learned the location (~/Documents/graphty/...) only on the start
   screen after closing, cut off, and the five who rested the pointer on the recent row to read the
   rest (data-journalist, screen-reader-analyst, intelligence-analyst, ml-engineer-recsys,
   bioinformatics-researcher) got no tooltip. Most inferred "saved" from Close project not warning
   them, which is a weak signal. Part of this is a skeleton defect: the save-as code does call a
   "Saved as <name>" notice, but no participant's render shows one, so the notice is lost when the
   dialog closes. Fix the skeleton before judging the design's confirmation.
   Severity 3.

   A caution for whoever reads this: the reassurance participants valued most was the
   "~/Documents/graphty/<name>" path in Recent projects. The project-menu file itself records that
   "Show file location" was removed because a browser cannot show where a file lives. A web build
   that saves through the browser's file picker or a download generally knows the file name, not
   the folder. If the real product cannot show that path, this round's relief at seeing it is a
   prototype effect, and the true experience is closer to the anxiety participants felt at the Save
   as box. That needs settling in the spec before the next round tests it.

3. **"This list is kept in this browser" next to a Documents path reads as a contradiction (10 of
   10).** All ten stopped on it, and all ten asked whether clearing the browser would lose the work
   or only the list. Most worked out "only the list", none was sure. Two who opened "Local only"
   (intelligence-analyst, bioinformatics-researcher) found Settings > Privacy saying "Your project:
   Saved where you save it" and called it circular, because the Save as box never asked where. The
   empty start screen's wording ("They are kept in this browser") made one participant
   (bioinformatics-researcher) think the work itself lived in browser storage. Severity 2.

4. **A plain Save on the untouched sample says "Saved" with no name (4 of 4 who used it).**
   recipe-recipient, class-project-student and intelligence-analyst chose Save from the main menu,
   and screen-reader-analyst pressed Ctrl+S. All four asked "saved as what, and where", and three
   worried they had written over the sample. The task's own success path says Save asks for a name
   the first time; the skeleton does not draw that, so this is a gap between the skeleton and the
   intended design. The participants' worry is exactly the case that first-time naming exists to
   prevent. Severity 3 until the skeleton draws it.

5. **The project-name menu reads as the File menu for most people (7 of 10 went there first).**
   explorer-elena, alert-reviewer, nonprofit-operations-analyst, data-journalist,
   screen-reader-analyst, ml-engineer-recsys and bioinformatics-researcher clicked the name with
   the arrow first, citing Google Docs, Office online, Figma or VS Code, and found Save as and Close
   project on the first try. The other three (recipe-recipient, class-project-student,
   intelligence-analyst) opened the main menu first, found Save but no Save as and no Close project,
   and all three complained about two overlapping menus where neither is complete. Positive for the
   name menu; Severity 2 for the split.

6. **The main menu stays open after Save (2 of 4 who used it).** recipe-recipient and
   intelligence-analyst both had to press Escape; for intelligence-analyst the open menu swallowed
   the next click. Severity 1.

7. **Opening a menu changed the right panel (2).** class-project-student and screen-reader-analyst
   saw the inspector switch from PageRank to the graph summary when they opened a menu, and said
   they had not asked for it; the screen-reader analyst called this how they lose their place.
   Severity 2 for screen-reader users, 1 otherwise.

8. **Reopening restored the content, not the place (1).** screen-reader-analyst noticed the right
   panel reopened on PageRank rather than where they left it. Restoring the saved selection on
   reopen is already a decided change that the skeleton does not draw, so this is logged as
   expected, not as a new finding.

## Notes on the study itself

- Enter in the Save as name box does save in the current skeleton (screen-reader-analyst pressed
  Enter and the dialog closed with the header renamed; the save-as code handles Enter). The grading
  note that says it does not is out of date.
- recipe-recipient's click on "File" matched a panel row whose text contains "this file" and showed
  that row's tooltip. A real person would not have clicked that row, so this wrong turn is partly the
  click-through tool's loose name matching. It does not change the grade: two other wrong turns
  remain.
- ml-engineer-recsys did not exercise the naming step; see the note under Result.
- Single Ease Question scores: 6, 4, 6, 5, 5, 5, 5, 5, 6, 6 (median 5). The lowest, 4, came from the
  participant with three wrong turns.
