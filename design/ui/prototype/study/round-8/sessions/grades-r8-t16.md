# Round 8 grades: filling a blank project that is already open

The task, as read to participants: "A coworker started a new, blank project for you in this
program and then left for the day. It has nothing in it yet. Get your list of connections into
it." It is the first-use moment, and it is counted apart from the tasks that start from the empty
app, because here a project is already open and the question is whether people bring data INTO
it rather than opening something else.

What counts as success: from the empty project, the participant takes one of the empty-state
"Add data" entries (the card in the middle of the canvas, the "Add data" link under Sources on
the left, or the "+" beside Sources) and reaches the intake: the Data panel with no sources and
the "Choose a file" list, then the import page. Success with difficulty is going to the main
menu's "Open project or file..." first and coming back, or more than two wrong turns. Failure is
not finding a way to bring data into this project, or opening a different project instead.

The designed path is: the empty project's Graph screen -> the Data panel with no sources and the
file list.

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating. Everything the participants did after the intake (reading the import page, Load,
checking the project menu, Save, opening "from 2 tables") is follow-up checking, not a wrong
turn: the task is met once the intake is open, and every participant went on to load the file
and confirm the counts. The sample file the prototype always opens (bank transfers, not the
participant's own list) is a prototype limit; participants were told to treat it as theirs.

## Grades

| Participant | Their rating | Grade | Why |
|---|---|---|---|
| Explorer Elena | success with difficulty | **success** | First click was the blue "Add data..." on the empty-canvas card; the file list opened; she picked the data file, loaded it and saved. No wrong turn. Her lower rating comes from doubts AFTER loading (was it her coworker's project, "2 tables", the gray result), not from finding the way in. |
| Class-project student | success | **success** | Card button, data file, set Undirected as his course asks, Load, Save. No wrong turn. |
| Nonprofit operations analyst | success | **success** | Card button, data file, Load; confirmed 3,000 / 9,113 matched the preview and that the project was the same one, renamed. No wrong turn. |
| Data journalist | success with difficulty | **success** | Card button, data file, Load, all on the designed path. She opened a column's role menu on the import page and backed out without changing anything; that is inside the intake, after the task was met, and not a wrong turn. She concluded correctly that the data is in the coworker's project (one graph in the graph list). |
| Knowledge engineer | success | **success** | Card button, data file, Load; read counts before and after. No wrong turn. |
| Analyst Alex | success | **success** | Before adding data he checked the "Local only" chip (hover, then click) to learn where his data goes. That is one detour, taken on purpose to answer a privacy question, not a search for the intake. He then went card button, data file, Load, and confirmed 3,000 / 9,113. One detour is under the rubric's limit of two. See the prototype defect below: the chip's click showed a different project behind the Settings dialog; he did not open that project himself and started again from the blank one. |

**Totals: 6 of 6 success.** Single Ease Question ratings: 5, 6, 6, 5, 5, 5 (mean 5.3 of 7). The
ratings were pulled down by what came after Load, not by the way in.

First click: 6 of 6 chose the blue "Add data..." button on the empty-canvas card. Nobody used the
left-panel "Add data" link, the Sources "+", or the main menu. All six noticed the three "Add
data" entries on one screen and read them as the same action; nobody was confused by it.

Caveat on the click tool: "Add data..." names both the card button and the right panel's link,
and the tool clicked the button. Every participant said beforehand that they meant the big blue
button, so the record matches their intent.

## Findings

Severity is Nielsen's 0 to 4 scale. Counts are participants out of six who hit or voiced the
problem. Problems marked as prototype artifacts come from how the skeleton is wired, not from
the design, and are listed so they are fixed before they contaminate other tasks.

1. **"Open as a new graph" plus the automatic rename leaves people unsure where their data went.
   6 of 6. Severity 3.** The import page's header says "Open as a new graph", and the project
   title changes from "Untitled project" to "Transfers, March 2026" while the preview is still
   open, before Load. Every participant asked whether the data was going into the coworker's
   project or a new one. All six ended up reasoning that it was the same project (only one
   project open; the journalist checked the graph list), but none was certain, and three
   (student, Elena, Alex) said a coworker looking for "Untitled project" tomorrow would not find
   it. When the import page is reached from an existing project, its header should say it adds
   to this project, and the project's name should not change without the user asking.

2. **"Graph from 2 tables" after loading one file. 6 of 6. Severity 2.** The derived accounts
   table is created silently. Four went on to click it to find out what the second table was.
   The import page should say before Load that it will build a node list from the two id
   columns.

3. **The table editor contradicts the import page that was approved. 4 of the 4 who opened it
   (Alex, data journalist, Elena, knowledge engineer). Severity 3.** Before Load: ends are
   "node", amount is an Attribute, weight is "none". In "Edit: transfers" after Load: ends are
   "account", amount is the Weight, timestamp is Time, weight is "amount". The graph Summary
   still says "Weight: None". All four said they could not trust a number from the Summary until
   this is explained; the knowledge engineer and Alex named betweenness as the number at risk.
   This is very likely a prototype artifact (the "from 2 tables" link opens a canned state of a
   different, already-mapped transfers import), but the design rule it tests is real: the editor
   reached after Load must show exactly the mapping that was loaded.

4. **Unfamiliar items in the file list of a blank project. 5 of 6. Severity 1.** "Recipe:
   mule-ring-triage.graphty" and "Style file: risk-review-look.json" were unknown words to five
   participants, and two (journalist, nonprofit analyst) read them as someone else's files
   appearing in their blank project. Partly a prototype artifact (fixed sample names). Nobody
   chose them.

5. **The file list opens on the left, away from the center button that was clicked. 2 of 6
   (Elena, nonprofit analyst). Severity 1.** The left panel also switches to Data underneath it
   at the same moment. Both found the list within a second.

6. **The first picture after Load is a gray hexagon density blob. 4 of 6 commented. Severity 0
   for this task, 2 for the tasks that follow.** Elena, the nonprofit analyst and the student
   expected dots and lines with names, and the student wondered whether it was the graph at all.
   Out of scope here, logged for the drawing tasks.

7. **"Nothing is colored or sized by a row" reads as a warning. 3 of 6 (Elena, nonprofit
   analyst, student). Severity 1.** Elena asked whether she had done something wrong. The
   knowledge engineer, by contrast, valued it as honesty about what the picture means.

8. **No sign the project was saved, and the project menu stays open after Save. Severity 1.**
   Two participants (knowledge engineer, nonprofit analyst) said nothing told them it was saved;
   both who chose Save (student, Elena) saw "Saved" but noted the menu stayed open. The menu
   staying open may be a prototype artifact.

9. **Prototype defect: clicking "Local only" shows a different, full project behind the
   Settings dialog. 1 of 6 (Alex). Not rated; fix in the skeleton.** The Privacy page itself
   answered his question well ("Read on this computer. Never uploaded."), but the route lands on
   the "Les Miserables" sample, so he believed the chip had opened another project. He also
   noted the chip's tooltip says only "Privacy settings", not that data stays local (severity 1).

10. **Developer text in the graph list. 1 of 6 (data journalist). Severity 2 if shipped,
    prototype artifact now.** "This version has no transform API: extract, bipartite projection,
    ..." is visible to participants.

11. **Smaller single-voice notes (1 of 6 each, not acted on without corroboration):** "Esc to
    leave" in the import header discouraged pressing Escape to close a menu (journalist); "3,000
    nodes of type node" reads as gibberish or as a class literally named node (nonprofit analyst,
    knowledge engineer -- 2 of 6); the "Makes node --...--> node" line looks like code (nonprofit
    analyst); the column role menu offers no plain way to say "people versus companies"
    (journalist); no RDF formats in the file list (knowledge engineer, standing persona verdict).

## What worked, with counts

- The empty-canvas card's "Add data..." was the first click for 6 of 6.
- The match report on the import page (rows in, nodes found, nothing dropped, "9,113 rows became
  9,113 edges") was named as the best part by 6 of 6; three compared it favorably with Gephi's
  import.
- "The data stays on this computer: nothing is uploaded" on the import page was valued by 5 of 6.
- The automatic From / To detection was praised by 5 of 6; the nonprofit analyst said it spared
  her renaming her headers.
- Counts after Load matched the preview, and every participant checked that.
