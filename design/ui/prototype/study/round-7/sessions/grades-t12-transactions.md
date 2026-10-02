# Round 7 grades -- trace the money (March transfers)

The task: money left account ACC-271813 and ended up in ACC-233575, which monitoring flagged.
Through which accounts did it travel, counting only transfers in the direction the money moved,
and how much passed along the way? The intended route: open Path between, keep Direction on
following the transfers, run it, read the route in the result bar (with "Route 1 of 2" when two
routes tie, and open the second), read the members and the 22,397.82 total in the path's
inspector or its table, and say what the Weight line ("amount, farther") did to the choice of
route.

Four simulated participants. Grades are decided by what ended on screen and what the participant
concluded, not by their self-assessment. Simulated participants only: read every count as a
direction, not a measure.

## Grades

| Participant | Their call | Grade | Where the answer came from | What they concluded |
|---|---|---|---|---|
| fraud-analyst | success-with-difficulty | success-with-difficulty | Search (no effect), then Analyze > Shortest path > Find path; path inspector; Made with | ACC-271813 -> ACC-946224 -> ACC-670564 -> ACC-233575, 3,530.28 / 9,468.23 / 9,399.31 on 4, 7, 9 Mar; would not use either total; at most 3,530.28 traceable |
| alert-reviewer | success-with-difficulty | success-with-difficulty | Same, plus a click on the result bar and the "..." menu looking for export | Same route and amounts; sum 22,397.82 "can't reconcile" the 22,929.05; at most 3,530.28 made the trip |
| supply-chain-analyst | success-with-difficulty | success-with-difficulty | Same, plus a failed search for the table | Same route and amounts; total 22,397.82, also shown as 22,929.05; at most 3,530.28 |
| analyst-alex | success-with-difficulty | success-with-difficulty | Analyze first (no search), Shortest path, Find path, path inspector, Made with | Same route and amounts; reports 3,530.28 as what traveled and 22,397.82 as the total moved along the chain |

Outcome: 0 success, 4 success-with-difficulty, 0 failure, 0 gave up.

### Why every grade is "with difficulty" and none is failure

- Direction: all four kept "Follow edges", each by reasoning that "Either way" would let money
  run backwards, and all four confirmed "Direction: Follow it" in the result's Made with. No one
  ignored direction. None of them changed it, because it was already the default.
- Route and total: all four read the four accounts in order, the three amounts and dates, and
  22,397.82 in the path inspector, and added the hops by hand to check it. No failure on the
  core question.
- No tie was on their screen. All four ran with the Weight left at its default ("amount,
  stronger"), and a weighted run in the skeleton returns one route: the result bar showed no
  "Route 1 of 2". The tie appears only on an unweighted run. So the failure condition "takes one
  route as the only one when two tie" does not apply. Still, no one found the second route
  (ACC-271813 -> ACC-946224 -> ACC-242954 -> ACC-233575), even though the result bar's
  22,929.05 is that route's total. Three of four (fraud-analyst, alert-reviewer,
  supply-chain-analyst) said unprompted they could not tell whether this was the only route.
- The weight is the reason no grade is a plain success. 0 of 4 could say what the Weight did to
  the choice of route. All four left it alone on purpose ("I'm not touching that", "I'd have to
  explain it to QA"). analyst-alex came closest, guessing "bigger transfers count as closer" --
  which describes the Stronger reading, the opposite of the "farther" reading the inspector says
  ran. All four then saw "Stronger" picked in the setup and "amount, farther" in Made with, and
  none could say which one was used.
- 0 of 4 reached the path's table. The flagged formatter difference (inspector 3,530.28 and
  22,397.82, table 3,530 and 22,398) therefore never came up and needs no mock-artifact filing
  from this task.

## What got in the way, with counts

Severity is Nielsen's 0-4. "Skeleton" marks a problem caused by how the clickable skeleton is
wired, not by the design. Skeleton problems must be fixed before the next round because they
contaminate every later finding, but they are not design findings.

| # | Problem | Seen by | Severity | Kind |
|---|---|---|---|---|
| 1 | Two totals on one screen: inspector 22,397.82, result bar 22,929.05. All four added the hops, found the inspector right and the bar "wrong", and two (fraud-analyst, alert-reviewer) said they would write down neither or could not answer QA. The two numbers are two different routes, and nothing on screen says so. | 4 of 4 | 4 as experienced | Skeleton, with a design gap under it. The setup defaults to "amount, stronger"; the result bar follows that setting and reports the route via ACC-242954 (3,530.28 + 9,782.05 + 9,616.72 = 22,929.05). The path inspector is a fixed fixture: it always shows the route via ACC-670564 and always records "amount, farther" (app-b/sections/path-popover.js, foundPath and routesOf; the found frame always loads inspector-group-set-path-row/path). Design gap: the bar names a total without naming the route, so a reader cannot match the bar to the member list. |
| 2 | "Stronger" picked in the setup, "amount, farther" in the result's Made with. All four read it as "it ran something other than what I picked". | 4 of 4 | 3 | Skeleton (same cause as 1). Note: the intended tie screen has the same contradiction -- the tie only exists unweighted, yet its inspector still says "Weight amount, farther". |
| 3 | Nobody could say what the Weight does to the route. "Stronger / Farther / Capacity" and "reads a weight as distance: it uses 1/amount" were skipped by all four as too technical to explain to a reviewer. | 4 of 4 | 3 | Design. For a money trail, the choice between "follow the biggest transfers" and "follow the smallest" decides which route is reported, and the words do not say that. |
| 4 | "How much passed" is not the sum of the hops. All four worked out on their own that at most 3,530.28 can have come from ACC-271813, and that ACC-946224 sends on more than it received on this trail (pooling). Three called the 22,397.82 sum misleading for a flow of funds. | 4 of 4 | 3 | Design, and a question for the answer key: it treats 22,397.82 as the answer to "how much passed", which every participant rejected with a correct reason. The smallest hop (the most that can have traveled the whole way) is the figure they wanted. |
| 5 | The path is invisible on the canvas. After Find path the canvas is colored by 35 Louvain communities, the path's orange matches "Community 5", and Louvain and "Links in (count)" rows appear in the tree that none of them ran. | 4 of 4 | 3 | Mixed. The Louvain and Links-in rows and the community coloring are skeleton: the found screen loads a tree and canvas from a project where those had already run. The path color matching a categorical community color is design. |
| 6 | No sign that another route exists, when one does (equal in hops). "Shortest" was read as "not necessarily the way the money went". | 3 of 4 (not analyst-alex) | 3 | Design. A weighted run that hides equally short alternatives gives the reader no prompt to look. |
| 7 | Typing an account number into "Find rows and notes" did nothing: no result, no "no match". | 3 of 3 who tried | 0 for the design | Skeleton / study tool: app-b/study.mjs has no --type option, so the text was never typed. The participants' expectation (search an account id first) is still a design input for the search box. |
| 8 | "4 accounts, 3 transfers" only flashes "Selects the path's accounts and transfers"; nothing visibly changes. Participants expected a zoom to, or isolation of, the four accounts. | 3 of 4 (not alert-reviewer) | 2 | Skeleton (the select is not wired), with a design expectation: selecting should show on the canvas. |
| 9 | No way to get the three transfers out. The table strip is gone on the result screen (supply-chain-analyst); the inspector's "..." menu is titled "Community 3", so alert-reviewer refused to export from it; fraud-analyst found no export at all. | 3 of 4 | 3 | Mixed. The missing table strip and the menu titled for a community are skeleton wiring. The intended route to the table is the path row's "Show members in table"; no one found it. |
| 10 | "Follow edges" is developer vocabulary; three asked for "only the way the money moved". All four still guessed right. | 3 of 4 | 2 | Design |

## What worked, with counts

- "Dates in order: Yes" on every hop: praised by 4 of 4, each calling it the check they would
  otherwise do by hand.
- From and To prefilled with the alert's two accounts: noticed by 4 of 4, all positively, though
  two wanted to know where the values came from.
- Made with naming the direction, scope and data file (transfers-2026-03.csv): 4 of 4 named it as
  the audit trail a reviewer could rerun.
- The per-account "in / out, this trace" lines: the evidence all four used to spot the pooling at
  ACC-946224.

## Ease and preference

Single Ease Question: 5, 4, 5, 5 (median 5). All four would use it beside their current tool,
not instead of it, until the totals agree and the route can be exported and seen on the canvas.

## For the next round

- Fix the skeleton first: the path inspector, Made with and the result bar must describe the same
  run. Otherwise problems 1 and 2 will dominate every session of this task again.
- The tie and the second route went untested: no participant ran unweighted. Either the task
  should start from an unweighted graph or the weighted result should say that another route
  ties in hops.
