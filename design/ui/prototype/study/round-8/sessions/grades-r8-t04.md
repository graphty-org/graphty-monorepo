# Round 8 grades: two spreadsheets of links into one network

The task: a first-time user has two CSV files in Downloads, one listing the machines on an office
network (hosts-2026-03.csv) and one listing which machine talks to which
(connections-2026-03.csv). They want both in as one network, and they want to know that every
machine and every connection arrived. Participants outside IT were told to treat the files as
"a list of things and a list of links between them".

What counts as success: from the empty start screen, "Open project or file...", "New from
data..." or the drop line opens the file chooser on the two CSVs; both files are picked at once,
or the second is added with the "+" beside Tables; the import page shows two tables and the
"Makes host (300) --connections (1,105)--> host (300)" line; the participant states 300 machines
and 1,105 connections (from the import page or after Load); and Load ends on the drawn network.
Success with difficulty is one file loaded first and the second added later, counts read only
after Load, more than two wrong turns, or needing a hover to reach the right conclusion. Failure
is loading only one table, not stating the counts, or believing connections were dropped when
they were not.

The designed path is: the empty start screen -> the file chooser with both CSVs ticked -> the
import page (hosts and connections tables, match report) -> the drawn network after Load.

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating. Steps taken after reaching the drawn network (clicking the isolated-nodes count,
returning to the import page through "from 2 tables") are counted as follow-up checks, not as
wrong turns: the task asks the participant to be sure everything arrived, and both are ways of
checking. The hosts table's 69 columns are not under test; comments on them are logged below but
do not affect a grade.

## Grades

| Participant | Their rating | Grade | Why |
|---|---|---|---|
| Cybersecurity analyst | success | **success** | New from data on the first click, both files ticked, read "1,105 of 1,105 source / target found" and "1,105 rows became 1,105 edges" on the import page, Load, confirmed 300 / 1,105 in the Summary. Then checked "from 2 tables" and clicked the isolated count; neither changed her correct conclusion. |
| Knowledge engineer | success | **success** | Same path with no wrong turn; stated both counts from the import page and again from the Summary, then confirmed the mapping is still reachable through "from 2 tables". |
| Explorer Elena | success | **success with difficulty** | Path and counts were clean, and on the import page she concluded "all my links got in". After Load, "Isolated nodes 7" made her ask "Did I lose some? I probably did something wrong". Clicking the 7 did not answer it; only the tooltip on "Isolated nodes" ("Nodes with no edges") restored the right conclusion. Under the rubric, a correct conclusion reached through a hover is success with difficulty. |
| Nonprofit operations analyst | success | **success** | Clean path, both counts stated from the match report and the Summary. "Isolated" made her nervous, but she reasoned from the 300 total that the seven are present and simply unlinked, before clicking anything. |
| Class-project student | success | **success** | Clean path, counts stated twice. Read "Isolated nodes 7" as a possible loss for a moment, then reasoned from the match report that the seven are machines nobody talks to. Ended on the drawn network. |
| Data journalist | success | **success** | Clean path, counts stated before and after Load. Reasoned correctly that the seven isolated machines are present with no links. Follow-up checks: "from 2 tables", then the 7. |
| Supply-chain analyst | success | **success** | Clean path, counts stated before and after Load. Briefly worried about the 7; concluded on her own that "7 machines with no links in the links file is a data question ... not a loading failure". |
| Screen-reader analyst | success | **success** | Clean path; read the full match report in text before loading and the Summary after. Interpreted the seven isolated nodes correctly from the start. Confirmed the report survives load through "from 2 tables". |
| Recipe recipient | success | **success** | Clean path, counts stated. Wondered whether the seven "didn't come in properly", then reasoned from "every connection found both ends" that they just have no links. Ended on the drawn network. |
| Alert reviewer | success | **success** | Clean path, counts stated before and after Load. Reasoned that the seven are absent from the links file, not lost, but said she took that "on trust" because clicking the 7 did not show them. Her conclusion is correct, so it stays a success. |

**Tally: 9 success, 1 success with difficulty, 0 failure, 0 gave up (10 sessions).**

Mean Single Ease Question: 5.9 of 7 (nine gave 6, the recipe recipient gave 5).

No participant loaded only one table, and no participant ended believing a connection was
dropped. All ten stated 300 machines and 1,105 connections from the import page, before Load,
and saw the same numbers again in the Summary after Load.

## What the sessions show

Counts are out of 10. Nielsen severity: 0 not a problem, 1 cosmetic, 2 minor, 3 major,
4 catastrophe.

### What worked

- **"New from data..." was everyone's first click (10 of 10).** Nobody tried "Open project or
  file..." ("file" read as singular, "project" as something they did not have) and nobody
  noticed or used the drop line. One participant looked for the word "import" and did not find
  it, but still guessed correctly.
- **Picking both files at once (10 of 10).** The checkboxes in the chooser told every participant
  that two files could be taken in one step. Three said they had feared doing one file and then
  bolting on the second. Because of this, the other way in, adding the second file with the "+"
  beside Tables, was never tried; this round says nothing about it.
- **The match report answered the task before Load (10 of 10).** Every participant opened the
  connections table before pressing Load and quoted "1,105 of 1,105 source found in hosts", the
  same line for target, and "1,105 rows became 1,105 edges". Seven compared it to a check they
  would otherwise do by hand (pandas merge, VLOOKUP / XLOOKUP, COUNTIF). Two said they would
  paste the lines into a case or an email.
- **The Summary after Load repeats the counts (10 of 10)**, which participants used as a second
  confirmation that nothing was lost between the import page and the graph.
- **The import report stays reachable after Load.** 6 of 10 clicked "from 2 tables" and were
  reassured that they could show the report later; "Apply is off: Nothing has changed yet" also
  told one participant her clicking had not changed the data.
- **"Files are read on this computer and never uploaded"** on the start screen was noticed and
  valued unprompted by 8 of 10.

### Problems

1. **The graph opens sized by a column nobody chose, and the legend cuts the column's name.**
   10 of 10 noticed that node size follows a vulnerability count ("vu....iated_over_30_days" in
   the floating legend, "vuln_co...0_days" in the left panel), and 9 of 10 objected that they
   never asked for it. One participant did not read the legend at all and concluded the big dots
   were "the busiest machines, the ones with the most traffic" -- a wrong reading of the picture.
   Three said they could not put the picture in front of an editor, a director or a ticket
   because they could not explain the sizes. Severity 3 (major): it is universal, it produced one
   false belief about the data, and on a task whose point is "did my data arrive", the first
   picture carries an interpretation the reader did not make. It is a studio question, not a
   graded one, whether a plain import should apply any size encoding at all; it is in tension
   with the rule that styling enters only as layers the reader can see and remove.

2. **"Isolated nodes 7" reads as "7 machines may not have arrived".** 7 of 10 voiced that doubt
   on the Summary (Elena, nonprofit operations analyst, class-project student, data journalist,
   supply-chain analyst, recipe recipient, alert reviewer). Six of them argued their way back from
   the match report or the 300 total; one needed the tooltip, which only she hovered. The three
   with graph or IT backgrounds read it correctly at once. Severity 3 (major): nobody ended wrong,
   but it attacks the exact confidence the task is about, for most of the non-technical
   participants, and the only plain-language explanation is behind a hover one person in ten
   found.

3. **Clicking the 7 opens all 300 nodes, with no visible sign of which 7.** 6 of 10 clicked the
   count (cybersecurity analyst, Elena, nonprofit operations analyst, data journalist,
   supply-chain analyst, alert reviewer). All six got the table "300 nodes from
   hosts-2026-03.csv" starting at its first row, and none could find the seven. The tooltip says
   the table marks them as selected rows, but no marked row is in view in any render (for
   example tmp/round-8-sessions/r8-t04--explorer-elena/05.png). This may be a skeleton-fidelity
   gap -- the selected rows could lie below the first eight -- but as drawn, the promised
   selection is invisible, the table neither filters nor scrolls to it, and three of the six
   called it the list they most wanted to export. Severity 2 (minor) for this task, since it
   comes after success; it is the one follow-up check that failed for everyone who tried it.

4. **An edge weight is chosen without asking, with controls first-time users cannot read.**
   10 of 10 saw "bytes_total_24h" marked Weight. The two experts objected that a weight is an
   interpretation and should be asked, not decided; eight did not understand "Higher means:
   Stronger / Farther / Capacity" and left it alone hoping the default was harmless. 5 of 10
   tripped on the "a row without one would weigh 1 / 0" control placed in the middle of a
   sentence of the match report (one noted it will read oddly by screen reader). Severity 2
   (minor): no one changed anything or was blocked, but participants trusted the default out of
   uncertainty, not understanding.

5. **The direction choice gives no hint.** 4 of 10 commented: one student's course tutorial says
   always choose Undirected, and he kept Directed by guess; others left it alone without knowing
   what it does. Severity 1 (cosmetic) here, since the default suits the data.

6. **The "Makes" line looks like code.** 5 of 10 called "host (300) --connections (1,105)-->
   host (300)" code-like or programmer-looking; all five decoded it. Two others (knowledge
   engineer, screen-reader analyst) named it the best line on the page. Severity 1 (cosmetic).

7. **The project names itself, and has two names.** 4 of 10 noticed the project was already
   called "IT estate, March 2026" without being asked and did not know where the name came from;
   2 of 10 asked whether the graph is "IT estate, March 2026" (title bar) or "Hosts" (panel).
   Severity 1 (cosmetic).

8. **The full links check is on the second table only.** The import page opens on the hosts
   table, whose report says only "300 rows; every key is unique". All ten clicked "connections"
   to see the links check, but the recipe recipient said he "nearly pressed Load from the first
   screen", and had he done so he would have seen the counts only after Load. Severity 1
   (cosmetic) on this evidence: one near miss in ten.

### Logged, not graded

- The hosts table's 69 columns: 6 of 10 remarked on the width ("lots of columns", "I won't look
  at them all"); none was slowed by it.
- Small, low-contrast gray text on the "auto" tags and "Showing the first 8 of 300 rows" (1 of 10).
- The Summary says "Edges: 1,105 connections" using the table's name; one participant wanted it
  to say "edges" (1 of 10).
- "Node", "edge" and "total degree" go unexplained for non-technical readers (2 of 10).
- The screen-reader analyst could not tell from the renders whether the dimmed file row, the
  selected direction and the preview grid's column headers are announced. The skeleton cannot
  answer this; it needs a test with a real screen reader on a real build.

## Paths not exercised

Every participant took the same route, so three entry routes in the success bar went untested:
"Open project or file...", the drop line, and adding the second file afterwards through the "+"
beside Tables. A future round that wants evidence on the add-a-second-file route needs a task
where the participant has only one file at the start.
