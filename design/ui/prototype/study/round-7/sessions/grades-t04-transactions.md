# Round 7 grades: who sent money to the alerted account (Transfers, March 2026)

Task as given: "An alert names account ACC-633005. Bring it up, see what is known about it, and
pick out the accounts that sent money to it -- not the ones it paid. The data on screen is a
sample: one month of card and bank transfers between accounts."

Grading bar:

- Success: the account's inspector Data tab is on screen and read (kind, country, risk score and
  its results), and the Neighborhood popover is set to incoming transfers ("In").
- Success with difficulty: reaches the account through the table or Select where rather than the
  tree's search box, or chooses both directions first and corrects.
- Failure: picks the accounts it paid, or cannot bring the account up.
- Gave up: stops with no account up and no answer.

The intended path is: the loaded transfers graph, then the account's inspector Data tab (id, kind
business, country GB, riskScore 3, flagged no, results degree 15 and PageRank), then the
Neighborhood popover with Direction set to In.

Grades go by what ended on screen and what the participant concluded, not by how sure they felt.

## Grades

| Participant | Their own call | Grade | Where they ended | Answer |
|---|---|---|---|---|
| Fraud analyst (Sarah) | failure | failure | Data rail, "Add filter", "By an attribute" list; "Neighbors of the selection" grayed out | "Links in 0, so nobody" -- refused to put it in a report |
| Alert reviewer (Nadia) | gave up | failure | Edges table with the account picked; transfers not narrowed | "0 senders if the count is right" -- would not file it |
| SOC threat hunter (Priya) | failure | failure | Data rail with the amount filter showing on; one run earlier had landed on Les Miserables | "Nobody paid it, read literally" -- would not put it in a case |
| Supply chain analyst (Dana) | gave up | failure | Analyze menu with the account picked in the table | "The tool says nobody paid it, but I wouldn't sign my name to that" |

Totals: 0 success, 0 success with difficulty, 4 failure, 0 gave up.

Nobody opened the account's inspector and nobody saw the Neighborhood popover on the transfers
graph, so nobody saw the Out / In / Both choice the task is built around. All four found the
account in the node table, all four read "Links in (count, full graph): 0" off that row, and all
four drew the same provisional answer -- no account sent it money -- while saying they would not
stand behind it.

## Why each grade

The two participants who called their own outcome "gave up" are graded failure, not gave up,
because the bar puts "cannot bring the account up" under failure, and because each of them still
stated an answer ("0 senders", "nobody paid it") rather than stopping empty-handed. Their own word
is recorded in the table.

**Fraud analyst -- failure.** The longest and most methodical session (23 renders). Search said
`No match for "ACC-633005"` and `No match for "633005"`; she found the account as the first row of
the node table, clicked it, and got the "Selects ACC-633005" tooltip and no inspector. She came
closest to the target of anyone: in "Add filter" she found "Neighbors of the selection" and said
"That's the one", but it stayed grayed out with the row selected (render 22), which confirmed for
her that the table click selects nothing. She also noted that the neighbors filter would give
both directions and nothing there offered in versus out. Ended on the attribute-filter list.

**Alert reviewer -- failure.** Her typed account number never reached the search box (a
study-tool effect, see caveats), so to her the box ignored input. She reached the account through
the table, read business, GB, 0 in, 15 out, and tried three times to open it (row click, Selection
row, second click). Never saw riskScore or alertRule values. Tried to filter the Edges table by
to_account and could only sort. Ended on the Edges table for the whole graph.

**SOC threat hunter -- failure.** Search returned a no-match for the account; so did the Analyze
box. She found "Neighborhood" in Analyze and tried row-then-Neighborhood, which replaced the
transfers graph with Les Miserables and a "Neighborhood of Valjean, Undirected graph" popover
(render 19, confirmed). That is the only Neighborhood popover any participant saw, and it was on
the wrong dataset. Ended on the Data rail; answer "nobody paid it" from the count column.

**Supply chain analyst -- failure.** Same table route and the same dead row click; her typing also
never reached the search box or Quick actions (study-tool effect). Checked Notes, Views, Quick
actions and Analyze for anything phrased as "who sent money to this account" and found none.
Ended on Analyze; answer "nobody", explicitly unsigned.

## What the grades show

| Finding | Evidence | Severity (Nielsen 0-4) |
|---|---|---|
| Clicking an account row in the node table shows "Selects ACC-633005" and then nothing opens: the inspector stays on the whole graph, the drawing does not highlight, Selection says "Paints 0 nodes", "Neighbors of the selection" stays grayed | 4 of 4 clicked the row and expected the account to open; 4 of 4 tried a second gesture (Enter, second click, Selection) | 4 |
| The tree's search box ("Find rows and notes") returns no match for an account id that is in the table | 2 of 2 whose typing reached the box got `No match`; both concluded the box does not search accounts. Label "rows" did not say what is searched (3 of 4 remarked) | 4 (see caveat: partly a skeleton gap) |
| The node table's "Links in (count, full graph)" reads as the answer, so participants answer "nobody sent it money" from a count with no rows behind it | 4 of 4 gave that provisional answer; 4 of 4 said they would not put it in a file | 3 |
| No way to narrow the Edges table to one account (column filter not discoverable; picking an account does not narrow the transfer list) | 4 of 4 looked for a to_account filter; 0 found one; 2 of 4 expected selection to narrow the edges | 3 |
| Opening the Data rail or pressing "Full graph" shows an "amount is at least 1,000" filter switched on and "812 of 3,000 nodes", which participants read as a filter they caused | 4 of 4 saw it; 4 of 4 said it lowered their trust in every number | 3 |
| Nothing anywhere offers in versus out as a choice outside the Neighborhood popover; the one place direction appeared was a count column | 2 of 4 said so directly (fraud analyst, supply chain analyst) | 2 |
| Row then Analyze then Neighborhood swapped the dataset to Les Miserables | 1 of 4 (threat hunter); single voice, but confirmed on the render; almost certainly a skeleton routing gap rather than a design finding | 2 (fix in the skeleton) |
| Vocabulary: "Links in", "nodes", "edges" for accounts and transfers | 2 of 4 (supply chain analyst, fraud analyst implicitly) | 1 |

What participants valued, independently: the Edges table as a plain ledger (from, to, timestamp,
amount, with a running sum) 4 of 4; "Local only" and "Assistant off, nothing is sent" 3 of 4.

## Caveats on the evidence

- This round says almost nothing about the intended design of this task, because the skeleton
  could not carry participants to the target. Three gaps in the skeleton, not in the spec, decided
  the outcome:
  - The tree's search box has no id-matching hit list for the transfers graph; it only draws a
    no-match line. The spec expects Find to match a row id exactly, so the "No match" result is a
    mock artifact, not evidence that id search fails.
  - A node-table row click on the transfers graph does not route to the account's inspector, so
    the "Selects ... and nothing happens" finding is also partly a mock artifact. The tooltip
    promising a selection that does not happen is still a real expectation the design must meet.
  - Row then Analyze then Neighborhood falls back to the Les Miserables graph.
  These three should be fixed in the skeleton and the task rerun before any design conclusion is
  drawn about finding an account or choosing direction.
- The table shows ACC-633005 with 0 links in (and so do the next five rows; reciprocity is 0), yet
  the task asks for the accounts that sent it money. Either the sample data has no incoming
  transfers for this account, in which case "nobody" is the correct answer and the task is broken,
  or the count column is inconsistent with the scenario. The success path's own Neighborhood
  render also names a different account (ACC-893168). The data and the target render need to
  agree with the task before a rerun, or every participant will again answer "nobody".
- Two participants' typing never reached a box: the study tool's `--type` did not type, so the
  alert reviewer and supply chain analyst experienced "the box ignores input". The other two
  pressed keys one at a time and got `No match`. The "box ignores typing" complaint is a tool
  effect and is not counted as a finding.
- The "amount is at least 1,000" filter appearing on the Data rail may be the frame that rail
  section draws for its own state rather than something the click switched on. Whether it is a
  skeleton artifact or a real behavior, all four read it as a filter they had caused, which is
  worth checking in the spec: a scope change must show who made it.
- All four are simulated personas, three from the same fraud and security domain; agreement
  among them is weaker evidence than four real people.
