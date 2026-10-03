# Grades: a picture with its color key, and the per-character numbers (round 8, task r8-t13)

Task given to participants: "You have never used this program before. You will practice on the
ready-made network of characters from the novel Les Miserables that comes with the program, not on
your own data. You need two things for a report: a picture file of the drawing as it looks now,
with its key to the colors, and the numbers the program worked out for each character in a file
Excel can open."

Success state: from the main menu or the project-name menu, Export... opens the Image page
(app-b/#/export-dialog/image). The participant checks that the preview shows the color key and
exports. They then switch to Data (app-b/#/export-dialog/data), choose the Nodes table so each
character is a row, and export. "Export table as CSV..." in the table's options menu also counts
for the numbers. Success with difficulty: exported the Edges table first and corrected it, looked
for the key in the Image page's settings before noticing the preview, or more than two wrong
turns. Failure: either file missing, or the numbers exported without the per-character values.

Each grade was checked against the participant's last render, not only their own account. Eleven
last renders show the toast "Exported les-miserables_nodes.csv to Downloads" over the Nodes table;
the screen-reader analyst's last render is the Recent exports list, opened after that same toast.

## Grading rules for this task

Two kinds of stall came from the click-through tool, not from the design. They were checked by
rendering the same steps with an exact target, and they are not counted as wrong turns:

- The tool could not click "Data" or "Nodes" inside the Export dialog by name, because controls
  of the same name behind the dialog (the left rail's Data, the table's Nodes tab) matched first.
  Aimed at the dialog's own controls, both clicks work. Data opens the Data page. Nodes gives a
  clean state: "Every one in the scope, with no cap: 77 nodes", "9 of 9, as the table's Columns
  shows them", and no warning. A person with a mouse would have reached it in one click.
- The "..." button by "Columns: 9 of 9" has no visible text, so the tool had to guess its name
  ("More", "Table actions", and so on) and hover it to find "Table options". A person would just
  click the dots. Those guesses and hovers are not counted as a long search or hover help.

The participants who use a mouse switched to the keyboard only because the tool stalled. What
happened next (arrow keys that did not move the Table choice, Shift+Tab then Space or Enter
running Export) is a real defect, logged below. It is counted for the screen-reader analyst,
whose own way in is the keyboard. It is not counted for the mouse users, who would never have
reached it. Three people (fraud analyst, screen-reader analyst, supply-chain analyst) were left
with an unwanted les-miserables_adjacency.csv. It does not make anyone fail: each of them also
exported the nodes CSV, and the task's failure test is a missing file or numbers without the
per-character values.

## Result

| Participant | Their own grade | Graded | Saw the Edges default | Way the numbers came out |
|---|---|---|---|---|
| alert-reviewer | success-with-difficulty | success | no | table options, Every column |
| analyst-alex | success-with-difficulty | success | no | table options, Every column |
| class-project-student | success-with-difficulty | success | no | table options, Shown in the table |
| genomics-cytoscape-user | success | success | no | table options, Every column |
| explorer-elena | success-with-difficulty | success | yes, rejected it (254 vs 77) | table options, Shown in the table |
| data-journalist | success-with-difficulty | success | yes, rejected it | table options, Every column |
| fraud-analyst | success-with-difficulty | success | yes, rejected it | table options, Every column (plus a stray adjacency CSV) |
| gene-ontology-cytoscape-user | success-with-difficulty | success | yes, rejected it | table options, Every column |
| nonprofit-operations-analyst | success-with-difficulty | success | yes, rejected it | table options, Shown in the table |
| recipe-recipient | success-with-difficulty | success | yes, rejected it | table options, Shown in the table |
| supply-chain-analyst | success-with-difficulty | success | yes, rejected it | table options, Shown in the table (plus a stray adjacency CSV) |
| screen-reader-analyst | success-with-difficulty | success-with-difficulty | yes, rejected it | table options, Every column (plus a stray adjacency CSV) |

Totals: 11 success, 1 success with difficulty, 0 failure, 0 gave up (12 participants).

What the totals do and do not show:

- **The picture half is solid.** All twelve found Export... on the first menu they opened. Eight
  used the main menu and four the project-name menu. Every one of them read "Full graph, with the
  legend" and exported on the default. Nobody looked for the key in the Image page's settings.
  Eleven saw the key box in the corner of the preview. All eleven called it too small to read and
  trusted the caption instead, and the screen-reader analyst could only trust the caption.
- **The Edges default was caught by everyone who met it.** Eight reached the Data page, and all
  eight rejected "Table: Edges" before exporting. Nobody exported the Edges table. They all
  caught it the same way, by comparing "254 edges" with the 77 characters on the sample card.
  The page gave them no other warning.
- **The study did not watch anyone switch Edges to Nodes inside the dialog.** For the mouse
  users the tool stopped it, and for the keyboard user the keyboard defect did. All twelve got the
  numbers out through the table's "Export table as CSV...", which opens the same dialog already
  set to Nodes. Read the 11 successes as "the default is noticed". They do not show that fixing
  the default inside the dialog is cheap.
- **The participants' own grades were harsher than the evidence.** Eleven of the twelve graded
  themselves success with difficulty, mostly because of the tool stalls. Their doubt about what
  the CSV holds is real, though (see the findings below).

## Per participant

**alert-reviewer -- success.** Used Main menu > Export..., kept Image "with the legend" and
exported. Her click on the dialog's Data was a tool stall, so she went to Table > Table options >
Export table as CSV... and exported with Every column. She was unsure whether the hidden
Betweenness column is in the file. Her last render (14.png) shows the nodes CSV toast.

**analyst-alex -- success.** She first looked for an Export button on the main screen and found
none (one wrong guess), then went Main menu > Export... > Image > Export. Her click on Data was a
tool stall, so she took the table route with Every column. She checked that the dialog said Nodes
and 77 rows before exporting. Last render 15.png.

**class-project-student -- success.** Main menu > Export... > Image > Export. Data was a tool
stall, so he took the table route and kept "Shown in the table". He could not tell whether
"Every column" would add numbers. Last render 14.png.

**genomics-cytoscape-user -- success.** Main menu > Export... > Image > Export. Data was a tool
stall, so she went straight to the node table, "as in Cytoscape", with Every column. Last render
14.png.

**explorer-elena -- success.** Went through the project-name menu: Export... > Image > Export. On
the Data page she worked out from "77 characters" and "77 nodes" that she wanted Nodes, not the
254 edges. Her Nodes click stalled in the tool. The keyboard path then left Adjacency selected,
with an adjacency warning on screen, and she cancelled. She took the table route, which "started
on the right thing". Last render 12.png.

**data-journalist -- success.** Went through the project-name menu: Export... > Image > Export.
She rejected the Edges default. She made one wrong turn the design caused: she reopened Export
with the Nodes table open, expecting it to follow her, and it still said Edges. The Adjacency
state she landed on came from the tool. She then took the table route with Every column. One wrong
turn is within the bar. Last render 15.png.

**fraud-analyst -- success.** Main menu > Export... > Image > Export. She rejected the Edges
default. After the tool stall she fell back on the keyboard: Shift+Tab jumped to Copy, and Enter
exported les-miserables_adjacency.csv straight after the warning that it holds none of the
numbers. She then took the table route with Every column. The stray file is logged as a keyboard
defect, not counted against her. Last render 17.png.

**gene-ontology-cytoscape-user -- success.** Main menu > Export... > Image > Export. He rejected
the Edges default ("I would have got an edge list and only noticed in Excel"). After the tool
stall the keyboard would not move the Table choice, and he went "the way I would in Cytoscape",
to the node table, with Every column. Last render 16.png.

**nonprofit-operations-analyst -- success.** Went through the project-name menu: Export... >
Image > Export. She rejected the Edges default. Her Nodes and Edges clicks went to the tabs behind
the dialog, which was the tool. She took the table route and kept "Shown in the table". Last
render 15.png.

**recipe-recipient -- success.** Main menu > Export... > Image > Export. He rejected the Edges
default by reading 254 against 77. After the tool stall he took the table route and kept "Shown
in the table". He said he would otherwise have "given up and emailed her", but the evidence shows
the dialog's Nodes click works for a mouse. Last render 16.png.

**supply-chain-analyst -- success.** Main menu > Export... > Image > Export. She rejected the Edges
default. After the tool stall, Shift+Tab then Space exported an unwanted adjacency CSV. She took
the table route and kept "Shown in the table". The stray file is logged as a keyboard defect.
Last render 17.png.

**screen-reader-analyst -- success with difficulty.** Main menu > Export... (the Ctrl+E shortcut
noted) > Image > Export. She trusted "with the legend" because she could not check the preview.
Her own input is the keyboard, so her detours count. Arrow keys did not move the Table choice
(wrong turn 1). Shift+Tab then Space ran Export and saved an unwanted adjacency CSV (wrong turn
2). A further try left the choice on Edges (wrong turn 3). Then she took the table route with
Every column. That is more than two wrong turns. Her last render (19.png) is the Recent exports
list, which does not list either file she had just exported.

## Findings

Severity is Nielsen's 0 to 4. A count is the number of participants out of 12 who showed the
problem.

1. **Severity 3. Keyboard use of the dialog's Table choice is broken, and a stray key press
   exports the wrong file.** Seen in 5 of 12: the screen-reader, fraud, supply-chain and
   gene-ontology analysts, and explorer-elena. Confirmed by rendering the steps: after Adjacency
   is clicked, ArrowLeft leaves it selected. The README says the segmented control is "one Tab
   stop, arrows move and select", but the selected segment does not keep focus after a redraw.
   So Shift+Tab lands at the end of the dialog (Copy or Export), and Space or Enter exports. In
   three sessions this produced les-miserables_adjacency.csv right after the warning that it holds
   none of the numbers, with no confirmation.
2. **Severity 3. Export > Data from the main menu opens on Edges for a per-character request, and
   says nothing about it.** Seen in 8 of 8 who reached the page. The success definition assumes
   the page warns that Edges leaves out the per-character values. The render
   (shots/tasks/r8-t13/05.png) carries no such warning, only "Rows: ... 254 edges" and "As the
   Edges table's Columns shows them". Everyone caught it by the count alone. The default also
   does not follow the table that is open (data-journalist, gene-ontology analyst, nonprofit
   analyst, supply-chain analyst), although the table's own "Export table as CSV..." does preset
   Nodes.
3. **Severity 2. "Every column" plus the caption "Hidden columns too" reads as a third choice,
   and as "every does not mean every".** Seen in 7 of 12. The code shows "Hidden columns too" is
   the caption for the selected "Every column", not a button. Together with Betweenness's
   crossed-out eye in the left list, 9 of 12 ended unsure whether the CSV holds betweenness and
   said they would open it in Excel to check.
4. **Severity 2. The Export dialog does not hide the page behind it.** Seen in 1 of 12 (the
   screen-reader analyst), and it is what caused every tool stall. While the dialog is open,
   "Data" names four reachable controls and "Nodes" three. For a screen-reader user that is a
   real defect: the background is not inert behind a modal.
5. **Severity 2. With Adjacency chosen, the dialog contradicts itself.** Seen in 4 of 12. The
   subtitle says "every attribute and run result", while the warning says "every node attribute
   and run result is not written". The Columns row also turns into an "Advanced" menu, so the
   form changes shape under the pointer. Confirmed in render.
6. **Severity 2. The key in the image preview is too small to read.** Seen in 11 of 11 sighted
   participants. Everyone trusted the caption "with the legend" instead of the picture. Two also
   noted that the preview key seems to carry a sentence the on-screen key lacks.
7. **Severity 2. The key says "PageRank 0.00330 to 0.0754" with no plain words.** Seen in 5 of 12
   (explorer-elena, fraud, nonprofit, recipe, supply-chain). Each expects to be asked "what is
   PageRank" by the person they hand the picture to.
8. **Severity 1. The Data page's "What is written" block is skipped.** Skipped by 7 of 12. It
   also mixes "betweenness (full graph, exact)" with "sampled from 20 sources" without saying
   which applies here (2 of 12). The data-literate participants (3 of 12) praised its points on
   ids and numeric ranks.
9. **Severity 1. Opening the table's options menu changes the left-list selection and switches
   the right panel to the graph summary.** Seen in 3 of 12. It did no harm.
10. **Severity 1. "64 labels hidden to avoid overlap" made participants doubt the picture.** Seen
    in 4 of 12. Each accepted it as matching "as it looks now".
11. **Mock fidelity, not a design finding: Recent exports shows fixed sample files.** The list
    has other names and times and does not show the files just exported (screen-reader analyst).

What worked: twelve of twelve found Export... in the first menu they opened. "Full graph, with
the legend" answered the key question in words. The confirmation toasts named the file and the
folder. "Saved to this computer only; nothing is uploaded" was noticed and valued by 8 of 12. The
table's "Export table as CSV..." opened the dialog already set right (Nodes, 77 rows, 9 of 9).

Evidence renders for this grading (the Data page's Nodes and Adjacency states, reached with exact
targets) are in tmp/grade-r8-t13/.
