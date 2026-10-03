# Round 8 tree test -- grades

21 participants, 15 tasks, 315 answers. The tree is the clickable refined B skeleton
(app-b). Answer key and every participant's path are in the transcripts in this folder.

## How each answer was graded

- **Correct**: the participant's final location is one of the key's locations for that task.
  Where a participant named a first choice and a backup, only the first choice was graded.
- **Direct**: the path reached the final location without backtracking. A path counts as
  backtracking when it OPENS another place and leaves it -- written in the transcript as
  "back", "backed out", "backtrack", "(no)", "(nothing)", "(rejected)" on a step, "tried",
  "looked in", or opening one correct place and then moving to another. Reading a label
  without opening it ("considered", "weighed", "glanced at", "hesitated", "noticed") is not
  backtracking.
- **Direct success**: correct and direct.
- One judgment call: the box "Search, or say what to find" sits inside the Analyze popover
  and filters its list of analyses. For finding betweenness (tree-3) it is inside the key's
  location and counts as correct. For selecting nodes by a weight rule (tree-11) it does not
  select anything and counts as wrong.

## Per-task rates

| Task | What it asked for | Success | Directness | Direct success |
|---|---|---|---|---|
| tree-1 | Open a sample | 21/21 (100%) | 21/21 (100%) | 21/21 (100%) |
| tree-2 | Start from your own file | 21/21 (100%) | 19/21 (90%) | 19/21 (90%) |
| tree-3 | Run betweenness | 21/21 (100%) | 6/21 (29%) | 6/21 (29%) |
| tree-4 | Label every node with name and team | 21/21 (100%) | 11/21 (52%) | 11/21 (52%) |
| tree-5 | Change the layout method | 21/21 (100%) | 18/21 (86%) | 18/21 (86%) |
| tree-6 | Export a picture | 21/21 (100%) | 19/21 (90%) | 19/21 (90%) |
| tree-7 | Export scores as CSV | 21/21 (100%) | 8/21 (38%) | 8/21 (38%) |
| tree-8 | Save today, reopen tomorrow | 21/21 (100%) | 21/21 (100%) | 21/21 (100%) |
| tree-9 | Hide edges under a weight | 21/21 (100%) | 13/21 (62%) | 13/21 (62%) |
| tree-10 | Apply a colleague's style file | 21/21 (100%) | 20/21 (95%) | 20/21 (95%) |
| tree-11 | Select nodes by a rule | 20/21 (95%) | 2/21 (10%) | 2/21 (10%) |
| tree-12 | Add this week's rows | 21/21 (100%) | 20/21 (95%) | 20/21 (95%) |
| tree-13 | Replace March's file | 21/21 (100%) | 18/21 (86%) | 18/21 (86%) |
| tree-14 | Merge repeated edges into a weight | 21/21 (100%) | 8/21 (38%) | 8/21 (38%) |
| tree-15 | Show only one result | 21/21 (100%) | 9/21 (43%) | 9/21 (43%) |
| **All** | | **314/315 (99.7%)** | **213/315 (68%)** | **213/315 (68%)** |

Success is at the ceiling, so it does not separate the tasks. Directness does: tree-11,
tree-3, tree-7, tree-14 and tree-15 are under 50% and are where the tree costs people a
wrong turn. Note these are simulated participants reading labels, not real users; treat
the rates as a ranking of where to look, not as measured performance.

## Answers reported apart, as the key asks

- tree-5 (canvas menu Re-run layout / Reshuffle seed): no participant ended there. Two
  opened it first and rejected it (explorer-elena, fraud-analyst).
- tree-12 (Replace with file..., the harmful wrong answer): no participant chose it.
- tree-15 (switching other rows' eyes off one by one): one final answer
  (explorer-elena, who never saw Show only this row). Four more named the eyes as a backup.

## Which correct route people took

- tree-2: New from data... 13, drop a file 5, Open project or file... 3. 14 of the 18 who chose another route weighed "Open project or file..." first; one said it read as being for saved sessions only.
- tree-3: Rank nodes and edges 19, the Analyze search box 2. "Measure the graph" drew a pause or a wrong opening from 16 of 21.
- tree-4: Inspector Style Label 15, Data > Attributes > Add label line 6. Four of the six opened the Inspector's Label first and left it; two said they could not tell whether it labels one node or all of them.
- tree-7: Table > Table options > Export table as CSV... 15, Export... > Data 6. 13 opened Export... > Data and came back, doubting it contains computed scores.
- tree-9: Data > Filters 20, header Full graph (filter) 1 (explorer-elena, who would then go on to Data > Filters). Many
  read Full graph (filter) as a status label, not a control.
- tree-11: 20 ended at Main menu > Select where...; only 2 went there directly. Places opened or weighed first: Analyze search box 12, Graph > Find rows and notes 9, Data > Filters 6, an attribute's Select where (one column only) 6, Quick actions 3.
- tree-14: 13 went to Data > Attributes, Settings, Analyze or the Inspector first. Several
  were unsure what Weight counts when there is no weight column.
- tree-15: 13 looked to the Legend first, expecting to click a legend entry to isolate it.

## Every grade

Y = correct, n = wrong; D = direct, i = indirect (backtracked).

| Participant | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| explorer-elena | YD | YD | Yi | YD | Yi | YD | YD | YD | YD | YD | ni | YD | Yi | YD | Yi |
| recipe-recipient | YD | YD | Yi | Yi | YD | YD | YD | YD | Yi | YD | YD | Yi | Yi | Yi | Yi |
| alert-reviewer | YD | YD | Yi | YD | YD | YD | Yi | YD | Yi | YD | Yi | YD | YD | Yi | Yi |
| class-project-student | YD | YD | Yi | YD | YD | YD | YD | YD | Yi | YD | Yi | YD | YD | Yi | Yi |
| nonprofit-operations-analyst | YD | YD | Yi | YD | YD | YD | YD | YD | Yi | YD | YD | YD | YD | Yi | Yi |
| data-journalist | YD | YD | Yi | Yi | YD | Yi | YD | YD | Yi | YD | Yi | YD | YD | Yi | Yi |
| analyst-alex | YD | YD | Yi | Yi | YD | YD | Yi | YD | YD | YD | Yi | YD | YD | Yi | Yi |
| bioinformatics-researcher | YD | YD | Yi | Yi | YD | YD | Yi | YD | Yi | YD | Yi | YD | YD | Yi | YD |
| cybersecurity-analyst | YD | YD | Yi | YD | YD | YD | YD | YD | YD | YD | Yi | YD | YD | YD | YD |
| cytoscape-holdout | YD | Yi | Yi | YD | YD | YD | Yi | YD | YD | YD | Yi | YD | YD | Yi | YD |
| expert-emma | YD | YD | YD | YD | YD | YD | Yi | YD | YD | YD | Yi | YD | YD | Yi | YD |
| fraud-analyst | YD | YD | Yi | Yi | Yi | YD | Yi | YD | Yi | YD | Yi | YD | Yi | Yi | Yi |
| gene-ontology-cytoscape-user | YD | YD | YD | YD | YD | YD | Yi | YD | YD | YD | Yi | YD | YD | YD | Yi |
| genomics-cytoscape-user | YD | YD | YD | YD | YD | YD | Yi | YD | YD | YD | Yi | YD | YD | Yi | Yi |
| gephi-holdout | YD | YD | Yi | Yi | YD | YD | YD | YD | YD | YD | Yi | YD | YD | YD | YD |
| intelligence-analyst | YD | Yi | Yi | Yi | YD | YD | YD | YD | YD | Yi | Yi | YD | YD | YD | YD |
| knowledge-engineer | YD | YD | YD | YD | YD | YD | Yi | YD | YD | YD | Yi | YD | YD | YD | YD |
| marketing-analyst | YD | YD | Yi | YD | YD | Yi | Yi | YD | Yi | YD | Yi | YD | YD | Yi | Yi |
| ml-engineer-recsys | YD | YD | YD | Yi | YD | YD | Yi | YD | YD | YD | Yi | YD | YD | YD | YD |
| screen-reader-analyst | YD | YD | YD | Yi | YD | YD | Yi | YD | YD | YD | Yi | YD | YD | YD | YD |
| supply-chain-analyst | YD | YD | Yi | Yi | Yi | YD | Yi | YD | YD | YD | Yi | YD | YD | Yi | Yi |

The one wrong answer: explorer-elena, tree-11, ended at the Analyze search box and never
found Main menu > Select where....
