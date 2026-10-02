# Grades: send a colleague's ranking scores to a spreadsheet

The task: "Send the characters' scores from the ranking your colleague made to a spreadsheet, so you
can work on them in Excel. The data on screen is a sample: characters of the novel Les Miserables,
linked when they appear in the same chapter."

The intended path: open the table under the canvas (or use the ranking row's Show in table), open
the table's "..." menu (named Table options), choose Export table as CSV..., which opens the Export
dialog on Data with CSV and the node table chosen, check which columns go, and Export. The dialog
can also be reached from the main Export... command, under Data.

Grading rule: success means a CSV holding the ranking's numbers was exported through that path, with
the participant checking which columns go. Success with difficulty means the same end after a wrong
turn, a long search, or exporting the whole table first and then correcting. Failure means copying
values by hand, ending somewhere else, or concluding wrongly. Grades go by what was on screen at the
end and what the participant concluded, not by how they rated themselves.

**The "checking which columns go" clause could not be met by anyone.** The Export dialog has no
column picker: not on the Data page, not under Advanced (which holds only header names, separator,
line ending, header row and formula neutralizing). The one participant who looked for a picker (the
ML engineer, under Advanced) found none. Grades below therefore leave that clause out and judge the
rest; the missing picker is the first finding.

**How a name guess is counted.** The study tool clicks controls by their name, so a participant who
"aims at the dots next to Columns: 7 of 7" has to guess the dots' name, and the guess "More" lands on
the first "More actions" button on screen, which is the PageRank row's menu. Part of the hunt below
is therefore caused by the tool, not the design. It is still graded as difficulty, because the
underlying problem is real: three unlabeled "..." buttons sit on this screen, two of them answer to
the same name, and for the screen-reader participant that is exactly what she would hear.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| ML engineer (recommendation systems) | success | success | Table, then Table options on the first try, Export table as CSV..., looked under Advanced for a column picker (none), Export. Ended on the toast "Exported les-miserables_nodes.csv to Downloads". Concluded correctly that the file holds every computed column, and stated honestly that the preview never showed a PageRank column. No wrong turn. |
| Analyst Alex | success with difficulty | success with difficulty | Opened the PageRank row's More actions menu first (no export there), tried "Export", then guessed names until "Table options" answered. From there straight through to the same toast (09.png). Concluded the file has a rank column; unsure which ranking was the colleague's. |
| Expert Emma | success with difficulty | success with difficulty | Clicked the left rail's Data by mistake (meant the panel's Data tab), then the PageRank row's More actions menu, then three guessed names before Table options. Same dialog and toast. Concluded correctly that the file holds every computed column, and noted she could not confirm PageRank from the cut-off preview. |
| Marketing analyst | success with difficulty | success with difficulty | Opened the PageRank row's menu while aiming at the table's dots, then guessed two names before Table options. Same dialog and toast. Concluded the file holds every score; disliked that it ignores the sort on screen. |
| Screen-reader analyst | success with difficulty | success with difficulty | Opened the wrong "More actions" (the row menu, which has Delete in it), then three name guesses before Table options. Same dialog and toast. Then opened Recent exports to find the fact again and found a list that does not show her export as the newest (08.png). Concluded the file is in Downloads, which is what the toast says. |

Totals: 1 success, 4 success with difficulty, 0 failure, 0 gave up. Nobody copied values by hand,
nobody went through Export... > Data, and nobody used the ranking row's Show in table (the table was
already the first thing all five opened). Ease scores: 6, 5, 5, 5, 5 out of 7.

All five reached the export the same way: "table first, export second -- that's how every tool
works" (marketing analyst). The dialog itself was praised by all five, mostly for one line, "Saved
to this computer only; nothing is uploaded", which three of them called the first question they
always have to ask. The note that a rank is a whole number with a separate Tie column, so it stays
numeric in a spreadsheet, was praised by four.

## Findings

Severity is on Nielsen's 0 to 4 scale. Counts are participants who said it or hit it.

1. **There is no way to choose the columns (5 of 5 exported every column; 1 looked for a picker,
   2 asked for one).** "Export table as CSV..." opens the general dialog set to "Full graph, every
   attribute and run result". The ML engineer searched Advanced for a column picker; he and the
   marketing analyst asked for "only the columns shown in the table" and "only my top 40". The task's
   own success definition needs the participant to check which columns go, so the design cannot
   pass it as drawn. Severity 3. Add a Columns control on the Data page (defaulting to the table's
   visible columns when the dialog is opened from the table), using the dialog's existing control
   patterns rather than a new one.

2. **The preview cannot show whether the ranking is in the file (5 of 5).** The preview's header
   line is cut off after "results.louvain." and cannot be scrolled, so no participant could confirm
   a PageRank column before exporting; all five "took it on faith" and planned to check in Excel.
   Worse, the skeleton's full preview header is
   `id,label,group,degree,betweenness,betweenness_rank,betweenness_tie,results.louvain.community,x,y,color,size`
   -- it has no PageRank column at all, while the dialog's subtitle and its own warning text say
   PageRank is written. In the prototype as drawn, the participants' shared conclusion ("PageRank is
   in there") is contradicted by the preview they could not read. Severity 3. Fix both: the preview
   header must wrap or scroll, and it must list every column the subtitle promises (PageRank, its
   rank and tie). This is partly a mock-fidelity defect, so the next round's result on this point
   depends on it being fixed first.

3. **Nothing says who made a result, so "my colleague's ranking" cannot be identified (5 of 5).**
   PageRank is selected, but Betweenness sits hidden in a folder "For the report", and the table has
   "Rank by PageRank". Every participant guessed, and every one said they got through only because
   the export takes everything: "If it had asked me to pick one ranking, I would have been stuck"
   (screen-reader analyst). Severity 3 for any hand-off workflow. Part of this is the task's
   scenario (the sample project has no colleague in it), so before rerunning, either give results
   an author or creator line and seed one, or reword the task to name no colleague.

4. **Export is not on the ranking's own menu (4 of 5 opened it and found no export; 2 said it is
   where they looked first).** The PageRank row's menu has Show in table and Filter to, but nothing
   that sends its values out. "I am looking at the result, give me its numbers" (Expert Emma); Alex
   does this weekly. Severity 2. An "Export values..." item on a result row's menu, opening the same
   Export dialog with that result's columns chosen, keeps one export pattern and meets them where
   they look first.

5. **Three unlabeled "..." buttons, two with the same name (4 of 5 opened the wrong one).** The
   PageRank row's menu and the right panel's menu both answer to "More actions"; the table's is
   "Table options". The screen-reader analyst heard "more actions, more actions" and landed in a menu
   with Delete in it. Some of the sighted participants' wrong turns came from the study tool, but the
   duplicate names are real. Severity 3 for screen-reader users, 2 otherwise. Give each "..." a name
   that says whose actions it holds ("PageRank actions", "Graph actions", "Table options").

6. **"Export table" exports the graph, not the table (2 of 5: ML engineer, marketing analyst).** The
   item says table; the dialog says "Full graph, every attribute", ignores the sort on screen and
   writes rows in file order. Severity 2. Either rename the item, or (better, with finding 1) open
   the dialog scoped to the table as shown: its rows, order and visible columns.

7. **Opening the table's menu switches the right panel to the graph summary (3 of 5 noticed: Alex,
   marketing analyst, screen-reader analyst; visible in every participant's render of that
   step).** Nobody asked for it, and the screen-reader analyst said she would have lost her place.
   Severity 2.

8. **Recent exports disagrees with what just happened (1 of 5, verified on screen).** After
   exporting at the moment of the task, the screen-reader analyst opened Recent exports: the newest
   entry is a PNG from 10:14, and the only CSV is from 9:52, so her export is either missing or out
   of order. Every entry also says "made from miserables.json" while the graph panel says "from
   miserables.gexf". Single voice, but both facts are visible in her final render. Severity 2;
   largely a prototype-data defect, fix before the next round so it does not cost trust again.

9. **Minor (severity 1):** a disabled "Time slider" item in the table menu, unrelated to the table
   (2 of 5); the yellow "CSV cannot hold everything" box alarmed one participant for a warning about
   edges she did not want (1 of 5; the ML engineer found the same box "fair, honest"); betweenness
   is shown without saying whether it is normalized (1 of 5).

## What this task says about the design

The route works and is where people expect it: table, then the table's menu, then export. Nobody
failed, and the dialog earned more praise than any other part of the session. What held the task
up was finding the right "..." and, after export, not being able to tell what the file holds. The
two changes that matter most are a column choice in the dialog with a readable preview of the
header, and distinct names for the three "..." menus; an export item on the result row's menu would
remove the most common wrong turn.
