# Round 7 grades -- check what came in (March transfers)

The task: a colleague left one account (ACC-633005) selected in this month's transfers project.
Before anyone works the month, say how many accounts and transfers came in, whether the transfers
run one way, whether the month is one connected piece, and whether anything looks off. The
answer lives in the graph's own inspector, Data tab: 3,000 nodes, 9,113 edges, Directed, 1 weak
component, density 0.00101, average total degree 6.08, highest 907.

Six simulated participants. Grades are decided by what ended on screen and what the participant
concluded, not by their self-assessment. Simulated participants only: read every count as a
direction, not a measure.

## Grades

| Participant | Their call | Grade | Where the answer came from | What they concluded |
|---|---|---|---|---|
| fraud-analyst | success-with-difficulty | success-with-difficulty | Data rail, first click | 3,000 / 9,113, directed, reciprocity 0, one piece, 907 vs 6.08 |
| alert-reviewer | success-with-difficulty | success-with-difficulty | "Everything" style row first (3,000 / 9,113 read off "Paints"), then Data rail | Same, plus no zero-degree accounts from the degree chart |
| supply-chain-analyst | success-with-difficulty | success-with-difficulty | Data rail, first click; needed three hovers to read the row names | Same; 907 read as "ten percent of the month on one account" |
| analyst-alex | success-with-difficulty | success-with-difficulty | Data rail, first click | Same, plus total amount 14,156,522.28 |
| ml-engineer-recsys | success-with-difficulty | success-with-difficulty | Data rail, first click | Same, plus density; guessed the hub's id from the edge table, flagged it as unconfirmed |
| cybersecurity-analyst | success-with-difficulty | success-with-difficulty | Data rail (second action, after hovering Local only) | Same, plus all timestamps in March |

Outcome: 0 success, 6 success-with-difficulty, 0 failure, 0 gave up.

### Why every grade is "with difficulty" and none is failure

- All six reached the graph's inspector Data tab and reported 3,000 nodes, 9,113 edges, directed,
  one weak component, and the degree range (average 6.08, highest 907). One also read density.
  None reported the selected account's numbers or a table's row count as the month's counts, and
  none carried the 812 filtered count or the 77-node numbers into their answer. No failure.
- None reached it the intended way. Not one participant pressed Esc, clicked empty canvas or
  clicked the tree's top (0 of 6). All six took the Data rail button, whose right panel happens
  to be the same graph inspector, Data tab, with a filter banner on top. The answer key counts the
  Data place as a detour, so the grade is "with difficulty" for all six even though, for five of
  them, the Data click was their first move and gave them the whole answer in one step.
- One participant (alert-reviewer) also made a real wrong turn first: the "Everything" style row,
  where "Paints 3,000 nodes, 9,113 edges" gave the counts but no direction or components, and she
  doubted whether "paints" meant "has".
- No one opened the header's "from 2 tables" link (0 of 6). They did not need to: the Data
  place's Sources list ("9,113 rows, 9,113 edges") gave all six the import check they wanted, and
  all six named "rows equal edges, nothing dropped" as the first thing they trust.
- All six clicked "4 more readings not computed"; none got the four readings (see below).

The answer key may want revisiting: if the Data rail is a sanctioned route to the graph's
readings, five of these six are plain successes on the core question and the difficulty all came
afterward. That is a call for the synthesis, not for this grade sheet.

## What got in the way, with counts

Severity is Nielsen's 0-4. "Skeleton" marks a problem caused by how the clickable skeleton is
wired, not by the design; those must be fixed before the next round because they contaminate every
later finding, but they are not design findings.

| # | Problem | Seen by | Severity | Kind |
|---|---|---|---|---|
| 1 | "Compute the overview" replaced the transfers readings with another dataset's (Co-appearances, from miserables.gexf, 77 nodes, 254 edges, Undirected) while the left side still listed the March files. All six said they would stop trusting every number on the panel; two said they would re-check every number in Excel or SQL before writing any down. | 6 of 6 | 4 as experienced | Skeleton: the menu item always routes to the Les Miserables computed state (app-b/sections/context-menus.js, "Compute the overview") |
| 2 | "4 more readings not computed" opens the graph's "..." menu instead of the readings. Everyone expected the readings to appear; the menu also puts "Clear graph data" a few rows below the item they wanted, which two called out as alarming. "Compute on 812" opens the same menu, which four tried and abandoned. | 6 of 6 | 3 | Design: the spec says the link opens the menu at Compute the overview. The label promises readings; a link that opens a menu breaks that promise |
| 3 | "Highest total degree 907" is not a link. Every participant named the 907 account as the thing that looks off and then could not find out which account it is. | 6 of 6 | 3 | Design |
| 4 | The node table opens at "Rows 381 to 420 of 3,000" (around the selected account), stays there after a sort, and its arrows do not page. No one could reach row 1 to name the hub. | 6 of 6 | 3 for the open position; paging is skeleton | Mixed: opening mid-list on a sorted table is design; the dead arrows (tooltip "the skeleton holds one page") are skeleton |
| 5 | The top bar said "Full graph" on the start screen and "812 of 3,000 nodes" in the Data place, with a filter "amount is at least 1,000" switched on. All six noticed; two thought their own click had turned the filter on; one could not tell which screen to believe. | 6 of 6 | 3 | Probably skeleton (two states drawn with different filter fixtures), but it exposed a real question: whether the start screen would say a filter is on |
| 6 | The Summary shows "Nodes 812 of 3,000" next to "Edges 9,113" (unfiltered). The banner "5 readings are for all 3,000 nodes" resolved it for most, but every participant who mentioned it had to read it twice, and two said the two counts "don't add up". | 6 of 6 noticed the scope; 2 of 6 said it contradicted | 2 | Design |
| 7 | The row names "Weak components", "Reciprocity" and "degree" needed hovers or guesses. The hovers worked (one line each, all read), but participants asked for the answer in words: "1 connected group", "nothing comes back". | 3 of 6 (supply-chain-analyst, alert-reviewer, fraud-analyst) | 2 | Design |
| 8 | No way to count flagged accounts: clicking "flagged" in the Attributes list kept the amount column's details on the right. | 3 of 6 | 2 for the missing count; the wrong detail is skeleton | Mixed |
| 9 | Ascending sort shows row 381 with a total of 1, implying about 380 accounts with 0 links, while the degree chart says 0 accounts at degree 0. | 1 of 6 (cybersecurity-analyst) | 1 | Skeleton: table fixture and readings disagree |

## What worked

- The Data rail button was where every participant looked for counts, and it delivered: 6 of 6
  had the counts, direction and connectedness from that one screen. Four said it beat their usual
  tool for this job (a pivot table, Gephi's one-by-one statistics, a few lines of networkx).
- "9,113 rows, 9,113 edges" on the source line: 6 of 6 used it as the import check.
- "3,000 nodes (before the filter)" and "full graph" on the table columns: two named these as the
  first labels that told them plainly what scope they were looking at.
- The edge table's footer total ("Sum of amount, all 9,113 rows") and the amount column's range
  and distribution: 5 of 6 used them to spot the 98,400 transfer or the long tail.
- "Local only" in the top bar answered the first question for three participants (fraud-analyst, supply-chain-analyst, analyst-alex); a fourth hovered it and found "Privacy settings" did not say whether it calls out.

## Single Ease Question

3, 3, 4, 4, 4, 3 (fraud-analyst, alert-reviewer, supply-chain-analyst, analyst-alex,
ml-engineer-recsys, cybersecurity-analyst). Median 3.5 of 7. Every participant attributed the low
score to what happened after the first summary, not to finding it.
