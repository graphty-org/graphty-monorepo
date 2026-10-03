# Round 8 grades: weight the transfers by how often two accounts trade

The task: the accounts and transfers spreadsheets are already open on the import page. The
participant is told that "in every analysis from now on, two accounts that trade often should
count as more tightly tied than two that traded once", and to set that up before loading and then
check that it took. People outside banking were told to treat it as example data.

The default on the import page weights each transfer by its amount ("Weight: amount", "Higher
means Stronger"). Frequency only exists as a weight after "One edge per Pair" merges the rows of
each pair into one edge with a derived "count" column.

What counts as success: switch to One edge per Pair, give the count column the Weight role (the
notice "Weight moved from amount to count" says what moved), load, and read the weight on the
loaded graph's Data tab ("Weight: count, stronger"). Success with difficulty is keeping amount as
the weight first and changing it only after reading a notice, or reaching the goal with a wrong
turn, a long search or a hover. Failure is loading with amount still the weight without noticing,
or concluding wrongly about the result.

The designed path is: the import page on the transfers table -> One edge per Pair with count made
the weight -> the graph loading -> the loaded graph's Data tab with nothing selected.

Grades are decided from what ended on screen and what the participant concluded, not from their
own rating. Choosing Undirected is not counted against anyone: the task does not say whether
A-to-B and B-to-A are the same tie, and both directed and undirected setups are correct answers.
Clicking Pair first and reading its notice ("amount stays the Weight, summed") is part of the
designed path, not a wrong turn, because the count column does not exist until Pair is chosen.

## Grades

| Participant | Their rating | Grade | Why |
|---|---|---|---|
| Fraud analyst | success with difficulty | **success with difficulty** | Pair, count's role menu, Weight, in three clicks; read "Weight: count, stronger" on the Data tab after Load and said "that reads like it took". One wrong turn on the import page (tried Undirected, backed out to keep who paid whom). Then the Weight link opened an edit page showing the original setup and the Edges table had no count column; she ended on the Analyze list concluding "I think it's set, I couldn't verify it." Her conclusion is hedged but not wrong. |
| Alert reviewer | failure | **failure** | Set it up correctly the first time and read "count, stronger" on the Data tab. Clicking that link opened an edit page showing amount, so she concluded the load had lost her setting, redid it there and pressed Apply. She ended on the Data panel where the Summary says count but the Sources and Attributes lists say amount, and concluded "I don't know, and that means no" -- she would escalate the case. The setup did take, so her final conclusion is wrong, and she acted on it. The cause is a skeleton defect (below), which is why this failure is not evidence against the import page itself. |
| Intelligence analyst | failure | **success with difficulty** | Pair, count as Weight, Undirected, Load; read "9,087 ... Undirected ... count, stronger" on the Data tab and said "that looks like it took". The edit page behind the Weight link and the Edges table (9,113 rows, no count) then contradicted it. Final conclusion: "I think I set it up before loading ... the summary agrees", but he would not trust a score. That is doubt, not a wrong conclusion, and he did not undo or redo anything. Graded the same as the analyst and the ML engineer, who did and said the same. |
| Analyst Alex | success with difficulty | **success with difficulty** | Same path as the intelligence analyst, no wrong turn. Read the Data tab and concluded "that's the check -- it took", and correctly reasoned that 9,087 matched the merge line and the "9,113 rows became 9,113 edges" line was stale. The edit page and the Edges table then disagreed; final conclusion "set up, yes; checked, no". |
| ML engineer (recommendations) | success with difficulty | **success with difficulty** | Pair, Undirected, count as Weight, Stronger, Load; read "count, stronger, undirected, 9,087" on the Data tab. Ended on the Edges table showing 9,113 rows and no count column; concluded "partly ... the graph summary says it took" but would not trust weighted centrality. |

**Tally: 0 success, 4 success with difficulty, 1 failure, 0 gave up (5 sessions).**

Mean Single Ease Question: 3.4 of 7 (4, 3, 3, 3, 4). Every participant split it the same way:
setting the weight rated about 5 to 6, checking it rated 1 to 2.

Nobody loaded with amount still the weight. All five noticed the default was money, not
frequency, on the first screen, and all five found the count column's role menu without help.
No participant would have reached plain success: the difficulty in four sessions, and the failure
in the fifth, all come from the check, not from the setup.

## Read this before trusting the tally

Every participant's doubt traces to the same thing: after Load, three surfaces show the ORIGINAL
import setup instead of what was loaded, because the skeleton renders them as fixed states that do
not carry the session's choices.

- The "count, stronger" link in the Data tab Summary opens "Edit: transfers" showing One edge per
  Row, Weight: amount, Directed, no count column, "Apply is off: Nothing has changed yet"
  (5 of 5 who clicked it -- all five did).
- The Edges table shows 9,113 edges, columns from_account, to_account, timestamp, amount, and no
  count or earliest/latest columns (4 of 5 opened it).
- The Data section's Sources and Attributes lists say "one edge per row. Weight: amount" and
  "amount -- Weight" (1 of 5 saw it, the alert reviewer).
- The designed path's own last render (the Data tab after Load) reads "Weight: amount, stronger"
  and "Directed". The target state of this task contradicts the task.

So the grades measure a skeleton that contradicts itself, not only the design. The design
finding underneath is still real and still severe: whatever a loaded graph says its weight is,
every place that shows the source's setup (the edit page, the Sources list, the Attributes list,
the Edges table) must say the same, and the derived column the weight uses must be visible in the
Edges table. The spec should state that explicitly; the skeleton should then render it.

## What the sessions show

Counts are out of 5. Nielsen severity: 0 not a problem, 1 cosmetic, 2 minor, 3 major,
4 catastrophe.

### What worked

- **The default was read correctly (5 of 5).** Everyone read "Weight: amount" / "Higher means
  Stronger" on the first screen as "a big transfer is a tight tie" and knew that was not what was
  asked.
- **"One edge per Pair" read as "count the trades between two accounts" (5 of 5)**, in their own
  terms: a pivot (fraud analyst, intelligence analyst), Gephi's parallel-edge merge (Alex), a
  groupby (ML engineer).
- **The role chip under count was found as the place to change the weight (5 of 5)**, because
  "Attribute" sits where amount's "Weight" chip sits.
- **The weight-moved notice (5 of 5 praised or relied on it).** "Weight moved from amount to
  count" with Undo said exactly what changed, and the toolbar line "Weight: count, the number of
  rows per pair" was called "literally the sentence I wanted" (Alex).
- **"No two transfers share both ends" before loading (5 of 5 read it)** told every participant
  up front that the weight would be 1 almost everywhere on this data.
- **"Nothing is uploaded" / "Local only"** was the first thing three participants looked for.

### Problems

| Problem | Seen by | Severity |
|---|---|---|
| After Load, the edit page opened from the Summary's Weight link shows the original setup (Row, amount, Directed) and offers Apply, so it reads as "your setting did not take" and invites re-applying the old one. | 5 of 5 | 4 |
| The loaded Edges table has no count column and keeps the raw 9,113 rows when the Summary says 9,087 pairs; the weight cannot be seen, checked per edge or exported. | 4 of 5 | 3 |
| The Sources and Attributes lists in the Data section say "Weight: amount" while the Summary beside them says count. | 1 of 5 | 3 (one voice, but the same defect as the first row) |
| On the import page with Undirected chosen, the report says "9,113 edges become 9,087" while the Makes header and the report's last line still say 9,113, and "One edge per Pair changes nothing" stays. | 4 of 4 who chose Undirected | 3 |
| Nothing says whether the weight holds only for this graph or for next month's import too; the task's "from now on" went unanswered. | 3 of 5 (fraud analyst, alert reviewer, Alex) | 2 |
| No way to count A-to-B and B-to-A as one tie while keeping who paid whom; two money-trail analysts gave up direction for it or refused to. | 2 of 5 (fraud analyst, intelligence analyst) | 2 |
| Weight by frequency is only reachable after choosing Pair; the first screen does not suggest it. Everyone found it, but by domain habit (pivot, groupby, Gephi merge). | 2 of 5 said so | 2 |
| The Analyze list does not say which weight an algorithm uses or which way ("lightest route" when higher means stronger). | 1 of 5 (fraud analyst) | 2, single voice |
| The Summary calls 9,087 merged pairs "9,087 transfers". | 1 of 5 (Alex) | 1 |
| A weight that is almost constant (count is 1 on all but 26 pairs) is not flagged. | 1 of 5 (ML engineer) | 1, single voice |
| Two controls labeled "Weight" on screen at once (the menu item and amount's chip). | 1 of 5 (Alex) | 1 |

### Example data note

The example file has no repeated directed pairs and only 26 reciprocal ones, so frequency
weighting changes almost nothing. Four participants said this made it impossible to see whether
the setting had any effect, which compounded the check problem. A transfers example meant to
exercise this task should have repeated pairs.
