# Round 7 grades -- send this month's flagged-accounts spreadsheet (transfers)

The task: "Last month you sent the flagged accounts to the case team as a spreadsheet. Send the
case team this month's version of it." The intended answer: open Export... (project-name menu or
Ctrl+E), go to Recent exports, find last month's case file, and press Export again on this
month's data -- checking which month the new file is made from.

Grading rule: success = repeated last month's export on this month's data and checked the month;
success with difficulty = got there with a wrong turn or a long search, or rebuilt the export by
hand; failure = re-sent last month's file, or cannot tell which data the export used; gave up =
quit without reaching the export. Grades go by what ended on screen and what the participant
concluded, not by their self-assessment. Four simulated participants: read every count as a
direction, not a measure.

## Grades

| Participant | Their call | Grade | How they reached Recent exports | What they concluded | Ease (1-7) |
|---|---|---|---|---|---|
| fraud-analyst | gave up | failure | Views (empty), then project-name menu > Export... > Recent exports: 3 clicks, the most direct of the four | Pressed Export again twice; could not tell whether a file was made or whether it used March or April; manual rebuild blocked; sent nothing | 2 |
| alert-reviewer | failure | failure | Table, Views, graph "More", main menu, a search for "Export", four guesses at the table's dots name, then Table options > Export table as CSV... > Recent exports | Pressed Export again (twice, then again from the project-name route); "QA would ask me which month that file was built from and I couldn't answer"; sent nothing | 2 |
| supply-chain-analyst | failure | failure | Table, a failed hover, Views, two filter attempts, a search for "Export", "More", main menu, then project-name menu > Export... > Recent exports (14th render) | Pressed Export again; "I can't confirm a file exists, what it's called, or how many accounts are in it"; April vs March unresolved; sent nothing | 3 |
| analyst-alex | failure | failure | Views, Table, two filter attempts, table dots, main menu, then project-name menu > Export... > Recent exports | Pressed Export again twice; "Did it export? I genuinely don't know"; manual rebuild blocked; sent nothing | 2 |

Outcome: 0 success, 0 success-with-difficulty, 4 failure, 0 gave up.

### Why all four are failure and not gave up

- All four reached the success screen (Export dialog, Recent exports), identified last month's
  file, and pressed the right control, "Export again, on April data". The path itself was found
  by 4 of 4.
- All four then did exactly what the task asks a careful analyst to do: they checked which month
  the export would use. And all four found the screen contradicting itself -- the button says
  April; the project title ("Transfers, March 2026") and both source files (accounts-2026-03.csv,
  transfers-2026-03.csv) say March. None could resolve it. That is the rubric's named failure,
  "cannot tell which data the export used".
- None re-sent last month's file and none concluded wrongly that they had succeeded. Two called
  their own outcome "gave up" or "failure" after detours elsewhere (fraud-analyst ended in the
  Data export with "Nodes" unclickable; alert-reviewer ended on the Data export showing 77 nodes),
  but both had already pressed Export again and stopped over the same unresolved month question.
  The grade records where they got to, not the detour they tried afterward.

### How much of this is the skeleton

Most of it. Two skeleton defects decided every outcome, and they must be fixed before this task is
run again or the next round will measure them a second time:

1. **Export again draws no result.** The press only flashes a one-line note that reads like a
   description of what the button would do. The list stays "1 file", no new row, no file name,
   no account count. (The section file says this result is "not drawn in the skeleton".)
2. **The fixture says March where the task needs April.** The Recent exports row is written for a
   project whose April data replaced March, but the project title and the Sources list still show
   March. A participant who checks the month -- the behavior the task rewards -- is punished for
   checking.

With both fixed, the evidence points at success with difficulty for three of four (a long search
for Export) and success or near-success for fraud-analyst (one wrong click on Views). That is a
direction, not a grade: the next round has to show it.

## What got in the way, with counts

Severity is Nielsen's 0-4. "Skeleton" marks a problem caused by how the clickable skeleton is
wired or by its sample data, not by the design; they contaminate every later finding but are not
design findings.

| # | Problem | Seen by | Severity | Kind |
|---|---|---|---|---|
| 1 | Export again gives no visible result: a passing note, no new file in the list, no name, no row count, no "saved to Downloads". Three pressed it twice; one tried a second route to it. Every participant said they would not send a file they could not see and count. | 4 of 4 | 4 | Skeleton (stub). Also a design gap: the spec says what Export again does, not what the participant sees afterward. The result state needs the new file at the top of the list with its name, month and count ("14 accounts last month, 17 now" was asked for in those words) |
| 2 | "on April data" while the title and both source files say March / 2026-03. All four asked "which month is loaded?" and none could answer. | 4 of 4 | 4 as experienced | Skeleton (fixture mismatch). The design idea -- the button names the month it will use -- was understood by all four and is the right one |
| 3 | The Data export reads "Full graph, 77 nodes, 254 edges" and talks of Louvain and PageRank on a 3,000-account, 9,113-transfer project; the Image preview shows a different graph. All four said this broke their trust in anything the dialog says. | 4 of 4 | 4 as experienced | Skeleton (the dialog draws the Les Miserables sample) |
| 4 | Every participant looked in Views first for "what I did last month", found "No saved views", and moved on. | 4 of 4 | 2 | Design. Views is where people expect recurring work to live; an empty Views has no pointer to Recent exports |
| 5 | Export is hard to find: not in the main menu, not obviously on the table. Found after 3 to 5 tries by three of four; the main menu ("New project, Open, Settings, Help") was opened and rejected by three. Two clicked the graph's "More" expecting the table's menu. Only one found the table's own "Table options > Export table as CSV...". | 3 of 4 (fraud-analyst found it on her second click) | 3 | Design. "In every program I use, Export is in the File menu." The main menu has no Export entry, and two "..." buttons sit near the table with different jobs |
| 6 | Last month's file is described as "14 accounts of the Mule ring ... ring-pagerank", not as flagged accounts. All four had to guess it was the right file; one objected to "pagerank" in a file going to a case team. | 4 of 4 | 2 | Mixed: partly task wording vs fixture (the task says "flagged"), partly design (the row says what algorithm made it, not what the recipient asked for) |
| 7 | Clicking "flagged" in the attribute list or in the filter's field picker showed "amount" instead; the new filter step stayed "Kept all 812 nodes". This closed the build-it-by-hand route for three. | 3 of 4 | 3 as experienced | Skeleton (both clicks route to the amount attribute) |
| 8 | A filter "amount is at least 1,000" was already on, and nothing says whether last month's export used it. | 2 of 4 | 2 | Design. A Recent exports row should say what it was cut from (filter, scope, table) so a repeat can be checked |
| 9 | The manual Data export has no scope for "what the filter keeps" or "what's in the table"; only Full graph or a 5-node Watchlist. "Nodes" could not be selected. | 2 of 4 | 3 | Mixed: the missing scope is design; the unclickable Nodes is skeleton |
| 10 | Clicking last month's file name in Recent exports does nothing; the participant wanted to see its columns and accounts before repeating it. | 1 of 4 | 2 | Design (single voice; watch for it next round) |

## What worked

- Recent exports was recognized at sight by 4 of 4 as "last month's version", and all four named
  Export again as exactly the idea they wanted. Three said that if it produced a named, counted
  file it would beat their current tool (Excel, Power BI, pandas) for a monthly report, because
  they would not rebuild the selection by hand each month.
- The button naming the month it will use made every participant check the month -- the
  behavior the task is after. It only failed because the screen disagreed with it.
- "Saved to this computer only; nothing is uploaded" was called out unprompted by 2 of 4 as the
  first thing compliance or IT would ask.
- 0 of 4 re-sent last month's file.
