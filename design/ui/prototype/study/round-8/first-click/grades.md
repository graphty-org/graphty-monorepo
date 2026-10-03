# Round 8 first-click test: grades

21 simulated participants, 14 prompts, all on the clickable refined B skeleton (participant view).
A click is correct when it lands on the answer key's target. Icon-only controls were checked by
hovering them in the skeleton: the first icon of the selection bar shows the tooltip "Neighborhood G";
the "Valjean, 36 connections" tag above that bar is a plain label, and clicking it does nothing; the
main menu (three lines) lists Open, Save, Export..., Apply recipe, Version history, Select where...,
Settings, Keyboard shortcuts and Help, and has no layout entry.

## Success rates

| Prompt | What it asks | Correct | Rate | Main miss |
|---|---|---|---|---|
| r8-fc01 | open a ready-made example | 21 / 21 | 100% | -- |
| r8-fc02 | bring in your own file | 21 / 21 | 100% | -- |
| r8-fc03 | find the most important nodes | 20 / 21 | 95% | Betweenness row (1) |
| r8-fc04 | find groups | 21 / 21 | 100% | -- |
| r8-fc05 | show labels on everything | 20 / 21 | 95% | "Labels show..." row in the list (1) |
| r8-fc06 | size nodes by a score | 21 / 21 | 100% | -- |
| r8-fc07 | rearrange the drawing | 13 / 21 | 62% | View (cube) 3, main menu 4, list "..." 1 |
| r8-fc08 | find one character | 21 / 21 | 100% | -- (5 of the 21 clicked his dot on the drawing) |
| r8-fc09 | export a picture | 21 / 21 | 100% | -- |
| r8-fc10 | export the data | 2 / 21 | 10% | Table toggle 18, Data in the left rail 1 |
| r8-fc11 | save the project | 21 / 21 | 100% | -- |
| r8-fc12 | check the whole file came in | 21 / 21 | 100% | -- |
| r8-fc13 | who this character is tied to | 12 / 21 | 57% | "Valjean, 36 connections" label 9 |
| r8-fc14 | replace last month's file | 21 / 21 | 100% | -- |

Overall: 256 of 294 first clicks correct (87%).

## Findings that need attention

1. Export data (r8-fc10), 2 of 21. 18 participants clicked "Table" at the bottom left, expecting the
   data export to live with the table; one clicked Data in the left rail. Nobody opened the main menu
   or the project name for it, although 21 of 21 found Export... there for a picture one prompt
   earlier (r8-fc09). The two who succeeded (cytoscape-holdout, expert-emma) used the table bar's
   "...". The Table click is a near miss -- the table opens, and its "..." holds Export table as
   CSV -- but the first click is not on the target. Reading: participants file "export the data"
   under the table, not under the project. Severity 3 (major): the path exists but is two steps
   away from where 19 of 21 looked, and nothing at the Table toggle says export is next door.
2. Neighbors of one node (r8-fc13), 12 of 21. 9 participants clicked the "Valjean, 36 connections"
   label, which reads as the answer ("it says 36 connections, that's exactly what I want") but is
   not clickable. Those who found the target icon recognized the concentric-circles glyph mostly
   from other tools (Cytoscape, Gephi users); first-timers and generalists went for the words.
   Severity 3: the most inviting thing on screen is inert, and the real control is an unlabeled icon.
   One participant (screen-reader-analyst) chose the inspector's Data tab, counted correct and
   reported apart.
3. Rearrange the drawing (r8-fc07), 13 of 21. Play was found by participants who know a layout
   "Run" button; the rest guessed the cube (3) or looked for a Layout menu (4 in the main menu, 1 in
   the list's "..."). Five transcripts say outright that none of the five toolbar icons says layout
   or arrange. Severity 2-3: an icon-only toolbar with no word for its most-used command.

## Notes the key asked for

- r8-fc08: 16 of 21 used the "Find rows and notes" search box; 5 clicked Javert's dot on the drawing
  (explorer-elena, class-project-student, analyst-alex, bioinformatics-researcher, gephi-holdout),
  counted correct and reported apart. Nobody chose Quick actions; no transcript reads the lightning
  bolt as search. Three transcripts on r8-fc07 name the bolt and say they cannot guess what it does.
- r8-fc14: 21 of 21 clicked the "..." on transfers-2026-03.csv (last round: 81%). No participant missed
  the row or remarked on its legibility, so the caption-gray source lines caused no observed miss.
- r8-fc03 and r8-fc04: several participants did not know PageRank, Betweenness or Louvain by name.
  For groups, recipe-recipient avoided the Louvain row as "an unknown algorithm name" and went to the
  flask; alert-reviewer chose the Louvain row only because it says "groups". Both are correct, but the
  algorithm names alone do not explain themselves.
- r8-fc06: 6 transcripts say no Size control is visible and the "+" on Shape is a guess.
- r8-fc11: 4 used the project name, 17 the main menu; alert-reviewer was unsure what "Local only" means.

## Every grade

C = correct, X = wrong, C* = correct but reported apart (drawing click on r8-fc08, Data tab on r8-fc13).

| Participant | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| explorer-elena | C | C | C | C | X | C | C | C* | C | X | C | C | X | C |
| recipe-recipient | C | C | C | C | C | C | X | C | C | X | C | C | X | C |
| alert-reviewer | C | C | C | C | C | C | X | C | C | X | C | C | X | C |
| class-project-student | C | C | C | C | C | C | C | C* | C | X | C | C | X | C |
| nonprofit-operations-analyst | C | C | C | C | C | C | X | C | C | X | C | C | X | C |
| data-journalist | C | C | C | C | C | C | X | C | C | X | C | C | X | C |
| analyst-alex | C | C | C | C | C | C | C | C* | C | X | C | C | X | C |
| bioinformatics-researcher | C | C | C | C | C | C | C | C* | C | X | C | C | C | C |
| cybersecurity-analyst | C | C | C | C | C | C | C | C | C | X | C | C | C | C |
| cytoscape-holdout | C | C | C | C | C | C | X | C | C | C | C | C | C | C |
| expert-emma | C | C | C | C | C | C | C | C | C | C | C | C | C | C |
| fraud-analyst | C | C | C | C | C | C | C | C | C | X | C | C | X | C |
| gene-ontology-cytoscape-user | C | C | C | C | C | C | C | C | C | X | C | C | C | C |
| genomics-cytoscape-user | C | C | C | C | C | C | X | C | C | X | C | C | C | C |
| gephi-holdout | C | C | C | C | C | C | C | C* | C | X | C | C | C | C |
| intelligence-analyst | C | C | C | C | C | C | C | C | C | X | C | C | C | C |
| knowledge-engineer | C | C | C | C | C | C | C | C | C | X | C | C | C | C |
| marketing-analyst | C | C | C | C | C | C | C | C | C | X | C | C | C | C |
| ml-engineer-recsys | C | C | C | C | C | C | C | C | C | X | C | C | C | C |
| screen-reader-analyst | C | C | C | C | C | C | X | C | C | X | C | C | C* | C |
| supply-chain-analyst | C | C | X | C | C | C | X | C | C | X | C | C | X | C |

## What each wrong click was

| Participant | Prompt | Clicked | Why it is wrong |
|---|---|---|---|
| explorer-elena | r8-fc05 | "Labels show... 1 node" row in the left list | an existing label row for one node, not the Label "+" for everything |
| supply-chain-analyst | r8-fc03 | Betweenness row in the left list | a hidden existing row; the key accepts Analyze, PageRank or Quick actions |
| recipe-recipient, alert-reviewer, data-journalist | r8-fc07 | View (cube) | the key names View as wrong |
| nonprofit-operations-analyst, cytoscape-holdout, genomics-cytoscape-user, supply-chain-analyst | r8-fc07 | main menu | the main menu has no layout entry |
| screen-reader-analyst | r8-fc07 | "..." beside the list's search box | list options, not layout |
| 18 participants (all but cytoscape-holdout, expert-emma, gephi-holdout) | r8-fc10 | "Table" toggle under the drawing | opens the table; export is in its "..." one click further |
| gephi-holdout | r8-fc10 | Data in the left rail | goes to the Data place, which is not on the key |
| explorer-elena, recipe-recipient, alert-reviewer, class-project-student, nonprofit-operations-analyst, data-journalist, analyst-alex, fraud-analyst, supply-chain-analyst | r8-fc13 | "Valjean, 36 connections" label | a plain label; clicking it does nothing |
