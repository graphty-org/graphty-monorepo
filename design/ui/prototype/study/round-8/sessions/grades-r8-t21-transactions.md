# Grades: the money path between two accounts (round 8)

The task: a month of card transfers between 3,000 accounts is open, already grouped into
communities. The participant must find how money could have gone from ACC-271813 to ACC-233575
through the fewest other accounts, name the accounts in between, say whether there is more than
one such way, and say whether the dates allow it.

The correct answer: two accounts in between (3 transfers), and two routes tie. Route 1 runs
through ACC-946224 and ACC-670564 (4, 7 and 9 Mar); Route 2 runs through ACC-946224 and
ACC-242954 (4, 7 and 8 Mar). The dates run forward on both.

The intended path: open Path between (from Analyze > Shortest path, the P shortcut, Quick
actions, the selection bar or the node menu), type both accounts into From and To, switch Weight
from 'amount (set at load)' to 'None (fewest steps)', press Find path, read Route 1, step to
Route 2.

Grading rule for this task: running with the amount weight first, not stepping to Route 2, or
more than two wrong turns makes it success with difficulty. Wrong accounts or no result is a
failure. Outcomes below are judged from the last screens rendered and the answer given, not from
the participant's own rating.

## Outcomes

| Participant | Their rating | Graded | Why |
|---|---|---|---|
| Fraud analyst | success with difficulty | **success with difficulty** | Three wrong turns before the path tool: the search box ("No match"), the table, the search box again with digits only. Then direct: switched to None before the first run, found the tie, stepped to Route 2 (render 11), named all four accounts and the dates correctly. |
| Alert reviewer | success with difficulty | **success with difficulty** | Ran with the amount weight first and got one route (via ACC-242954) with no sign of a tie, then switched to None and stepped to Route 2. Also lost time on the search box and the table. Final answer correct. |
| Intelligence analyst | success with difficulty | **success with difficulty** | Search box, table, then the From box lost the typed account when he moved to To without pressing Enter: three wrong turns. Switched to None before running; reached Route 2 (render 13). Answer correct. |
| Supply chain analyst | success with difficulty | **success with difficulty** | Search box twice (with and without Enter), the table, then ran with the amount weight and read a single route as the answer before checking the Weight list. Switched to None, reached Route 2 (render 15). Answer correct. |
| Knowledge engineer | success with difficulty | **success** | One deliberate detour to the Data tab to learn what the graph is (useful, not lost), one hover to confirm the flask icon is Analyze. Chose None (fewest steps) before the first run, found the tie, stepped to Route 2 (render 12, confirmed on screen), answer correct. She rated herself lower because of the default weight and a checkbox she could not tick, which did not cost her the path. |
| Cybersecurity analyst | success with difficulty | **success with difficulty** | The search box failed, then she hovered five unlabeled toolbar icons to find an entry point (a long search) before Quick actions and "path" opened Path between. From there direct: None before running, Route 2 reached (render 10, confirmed on screen). Answer correct. |

Tally: 1 success, 5 success with difficulty, 0 failures, 0 gave up. Six of six named the right
accounts, the tie and the date order. Mean Single Ease Question 4.5 of 7 (4, 4, 5, 4, 5, 5).

No participant ended on a wrong answer, and the result panel (hop list with amounts, dates and a
"Dates in order" column, plus the "2 routes tie" pager) was praised by all six. The difficulty
is entirely in getting to the tool and setting it up.

## Findings

Severity is Nielsen's 0 to 4. Counts are participants out of six who hit or named the problem.

1. **The search box cannot find an account by its id.** 5 of 6 (everyone who tried it; the
   sixth went to the Data tab first). "Find rows and notes" answers `No match for "ACC-271813"`
   for an account that is in the table and that the path form accepts a minute later. Every
   participant who hit it read it as the app saying the account does not exist, and it cost
   trust before the first real action ("that's how a tool loses me in the first minute"; "the
   search box is lying"). Severity 4: the first action of every A-to-B task, and a false "does
   not exist" on ground truth.

2. **The path tool defaults to weighting by amount on a tool introduced as "the fewest steps".**
   6 of 6 named it. Two (alert reviewer, supply chain analyst) ran with the default and got a
   single route through ACC-242954 with no hint that another route of the same length exists;
   both say they would have handed that in. The other four only avoided it by reading the grey
   "1/amount" line. The menu entry says "the fewest steps, or the lightest route"; the form opens
   on the lightest route. Severity 3: a wrong-kind answer that looks right. A weighted run that
   says nothing about other routes of the same hop count compounds it.

3. **The found path cannot be seen on the canvas.** 6 of 6. The path is drawn orange and
   Louvain's Community 5 (139 nodes) is the same orange; nothing dims, frames or zooms, and
   "4 accounts, 3 transfers" only selects, with no visible change (3 of 6 clicked it hoping to
   see the path). Every participant took the answer from the side panel and said the picture is
   unusable for a case file. Severity 3. Note this is a palette collision between two layers the
   app placed itself, not something the reader chose.

4. **"Follow time order" reads as broken.** 5 of 6 tried to tick it; every click failed. In the
   skeleton it is deliberately disabled (shown at half opacity, tooltip "Needs graphty-element:
   a path option that keeps each step no earlier than the one before"), but no participant found
   that reason, and two (alert reviewer, supply chain analyst) were left unsure whether "Dates in
   order" was checked or merely reported. Partly a fidelity limit of the skeleton (the feature is
   not in graphty-element yet), but the disabled state itself is a real design question: a faded
   checkbox next to the reader's exact question, with its reason only on hover. Severity 2.

5. **No confirmation that a typed id matched an account.** 4 of 6 (alert reviewer, intelligence
   analyst, supply chain analyst, knowledge engineer). From and To show no match list and no
   "found" state; participants inferred acceptance from Find path turning blue. After the search
   box had just said "No match", this mattered more. Severity 2.

6. **The From box drops a typed id if focus leaves without Enter.** 1 of 6 (intelligence
   analyst), silently. Single voice, but a silent loss of input; worth confirming in the next
   round. Severity 2 provisionally.

7. **Amounts that grow along the path are not called out.** 6 of 6 noticed on their own that
   ACC-946224 receives 3,530.28 and sends 9,468 or more, so most of what reaches ACC-233575 did
   not come from ACC-271813. The tool's "could have" wording is honest but says nothing; every
   participant added the caveat themselves. One (knowledge engineer) flagged "Sum of amount
   22,929.05" as a meaningless total for a chain that counts the same money three times.
   Severity 2.

8. **The shared account on both routes is not stated.** 4 of 6 worked out by paging that
   ACC-946224 is on every shortest route and called it the account to investigate; one asked for
   the tool to say so, and two asked whether "2 routes tie" means all ties. Severity 1.

9. **The entry point is an unlabeled icon.** 5 of 6 had to hover or guess names on the bottom
   toolbar to find Analyze or Quick actions; one went through five icons. Nothing near the search
   box or the accounts offers a path. Severity 2.

Single voices, not counted as findings: the From and To icons differ (building vs. person) for
two accounts; "riskScore 98, flagged" has no source; no visible export of the route as rows or a
picture (named by 4, but none looked for an export menu, so it is untested); "Local only" is a
settings button rather than a statement.

## Grader notes

- The hop-date inversion message and the legend versus inspector community wording are not drawn
  on this route and were not graded.
- The knowledge engineer's grade differs from her own rating. Her one detour was intentional
  orientation that informed her answer, and her hover only confirmed an icon's name; neither
  is a wrong turn under this task's rule.
