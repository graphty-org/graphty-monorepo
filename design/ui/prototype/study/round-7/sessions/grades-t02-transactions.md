# Grades: top ten receiving accounts (transfers sample)

Task given to six participants: "Which ten accounts receive transfers from the greatest number of
other accounts this month? Get graphty to work it out so you can hand the list on."

## What counted as success

The right measure is "Links in (count)" ("How many edges come into each node"). In this sample no
two transfers share both ends (the import report says so), so it equals the number of distinct
sending accounts.

- **Success:** Analyze is open on the transfers, "Links in (count)" is chosen with its short form
  and its Run button showing, and the participant would press Run. The drawn skeleton ends there.
  It has no running or finished state for this measure, so the facilitator only asks how the
  participant would read the top ten.
- **Success with difficulty:** reaches that screen after a wrong turn, such as the table first,
  Quick actions or search, or opening PageRank or a money total and correcting before Run.
- **Failure:** settles on a money total, the two-way count ("Links (count)") or PageRank as the
  answer, or ends somewhere else.

Outcomes below follow what ended on screen and what the participant concluded. They do not follow
how the participant judged themselves. All six judged themselves failed or gave up. All six
reached the right measure and pressed Run. What they could not do was everything after Run, and
the skeleton does not draw any of it (see "Why the self-reports differ").

Success path renders: shots/tasks/t02-transactions/01.png (start), 02.png (Analyze open),
03.png (Links in chosen, Run showing).

## Grades

| Participant | Their own verdict | Graded | Path to the right screen | Conclusion about the measure |
|---|---|---|---|---|
| Analyst Alex (data analyst, pandas) | failure | **success** | Analyze, Links in, Run. Direct | Right. Confirmed through the import report that each edge is a distinct pair |
| Marcus (intelligence analyst) | failure | **success** | Analyze, Links in, Run. Direct | Right. Confirmed through the import report |
| Chris (ML engineer, recommendations) | failure | **success** | Analyze, Links in, Run. Direct | Doubted it. Took the edges table as "one row per transfer" and said the list might be wrong "unless every pair only transacts once". Did not turn to another measure |
| Sarah (fraud analyst) | failure | **success with difficulty** | Table first (sorted Links in, stuck mid-list), then Analyze, Links in, Run | Wrong about the measure. Said "Links in counts transfers, not different sending accounts". Did not settle on another measure; planned to export and count by hand |
| Nadia (level-1 alert reviewer) | gave up | **success with difficulty** | Table first (sorted, stuck), then Analyze, Links in, Run | Unsure. Took Links in as "close enough" and would say so in the note |
| Dana (supply chain risk analyst) | gave up | **success with difficulty** | Table first (sorted, stuck), then Analyze, Links in, Run | Unsure. Guessed it counts transfers, "but it's all there is" |

**Totals: 3 success, 3 success with difficulty, 0 failure, 0 gave up.** No one opened PageRank,
a money total or the two-way count as their answer. Every participant passed over "Total amount
in" on purpose, because the question asks for a count and not money. Two named PageRank, and its
"Start here" tag, only to decline it.

No one took the answer from the "Links in (count)" row that the resting transfers screen already
draws. That row is a known mock artifact, and it did not affect any grade. (In this run the left
list started empty, so most participants never saw that row.)

## Why the self-reports differ from the grades

Every participant measured success by "I have ten account ids I can hand on". The skeleton
cannot deliver that, for reasons that are mostly in the mock and not in the design:

1. **Run does nothing visible.** All six saw "Would add Links in (count) at the top of the list,
   running" and no result. The running and finished states for this measure are not drawn. The
   only running row drawn for the transfers names Betweenness. *Mock artifact, 6 of 6.*
2. **The table never reaches row 1.** All six opened the node table, five sorted "Links in", and
   all of them landed on "Rows 381 to 420 of 3,000" with values of 4 and below. The back arrow's
   tooltip reads "Shows the next rows (the skeleton holds one page)". *Mock artifact, 6 of 6.* It
   also leaks the word "skeleton" and says "next" on a back arrow. Two participants quoted it as
   proof the tool was broken.
3. **The export preview shows a different graph.** Sarah's export dialog said "77 nodes, 254
   edges" with rows for Myriel and Napoleon, and opened on Nodes while she was on Edges. She
   stopped there: "If an export shows me someone else's rows, I cannot put anything from this
   tool in a case file." *Mock artifact, 1 of 6, severe in its effect on trust.*
4. **"Data" switches on a filter.** Clicking the Data tab on the left rail showed "812 of 3,000
   nodes" with "amount is at least 1,000" ticked. Back on Graph, the top bar read "Full graph"
   again, along with Louvain colors the participant had not asked for. The Data screen is drawn
   from another scenario's state. *Mock artifact, 2 of 6 (Nadia, Dana).* Both said they no
   longer trusted any number on screen.

These four artifacts drove all six self-reported failures. Fix them before this task runs again.
Otherwise the next round measures the mock and not the design.

## Real findings (design, not mock)

Severity is on Nielsen's 0 to 4 scale. Counts are participants out of 6.

1. **"Edges" does not say whether repeat payments count once. Severity 3, 6 of 6.** Every
   participant asked, unprompted, whether "How many edges come into each node" counts transfers
   or distinct senders. The task's wording ("from the greatest number of other accounts") makes
   this the first question a careful analyst asks. Only 2 of 6 answered it, and only by finding the
   import report behind the "from 2 tables" link ("No two transfers share both ends, so One edge
   per Pair would change nothing"). Both praised that sentence and wanted it next to the measure.
   2 of 6 concluded the measure was the wrong count. 2 left it unresolved. The Measure dropdown
   (Links, Links in, Links out) offers nothing about distinct neighbors. Direction: say on the
   measure's form, in one line, what an edge is in this graph. Either "each edge is one sender
   and receiver pair (repeats merged)" or "each edge is one transfer; N pairs repeat". A
   distinct-neighbor count is worth considering where edges can repeat.
2. **No visible way to hand a ranked list on. Severity 3, 5 of 6.** Five participants looked for
   an export, "copy top N" or a top-ten control. One found "Export table as CSV..." under the
   table's "..." (labeled "Table options"). The rest tried "More", "Export", "Table menu" and
   "Table actions", and "More" opened the graph's menu on the right instead. The task says "hand
   the list on". The route from a sorted column to a list someone can hand on is too hidden.
3. **Three of six went to the table before Analyze. Severity 2, 3 of 6.** Sarah, Nadia and Dana,
   the spreadsheet users, started with "Table". There they found "Links in (count, full graph)"
   already computed as a column. Two others asked afterward why Analyze offers a measure the
   table already holds ("So I didn't need Analyze at all?", 2 of 6). This is not an error path:
   sorting that column answers the question. The design should treat it as a supported route,
   and Analyze should say when its result already exists as a column.
4. **The open Analyze form covers the table toggle, and Escape steps back only one level.
   Severity 2, 4 of 6.** Alex, Marcus, Chris and Dana tried to open the table after Run. The
   click missed because the form lay on top of it. Escape went back to the Analyze list, not
   closed. Two needed Escape twice.
5. **"4 more readings not computed" opens the general graph menu. Severity 2, 2 of 6.** Sarah
   and Dana expected more readings. They got Select all, Re-run layout and "Clear graph data",
   and both remarked on how easy that last item would be to hit by accident.
6. **"Column menu" always targets the id column. Severity 1, 3 of 6.** Every column's menu has
   the same accessible name, so the menu for the sorted column could not be reached by name.
7. **Clicking the "Measure" label does nothing. Severity 1, 4 of 6.** The label is not tied to
   its dropdown.

## What worked

- **Finding the measure: 6 of 6.** Everyone reached "Links in (count)" in one click inside
  Analyze, and everyone matched "Links in" to "transfers coming in" without help. Alex and Chris
  wanted the word "in-degree" or "degree" as well. Alex found it only in the tooltip on the
  neighboring "Links (count)" row.
- **Privacy statements: 6 of 6.** "Local only", "Assistant: Off. Nothing is sent" and "Saved to
  this computer only; nothing is uploaded" were each named as the right default for bank or
  case data.
- **Import report: 2 of 6.** The plain sentence about repeat pairs was the only thing that
  settled the counting question, and both participants who found it said they would repeat it
  to a manager.

## Ease and preference

Single Ease Question (1 to 7): 2, 2, 2, 2, 2, 3. Median 2. These scores rate the whole attempt,
including the four mock artifacts above. They should not be read as a score for the Analyze
flow alone. All six would keep their current tool (Excel pivot or pandas) for this question.
Their conditions for switching were the same: open a sorted table at row 1, put an export next to
it, and say what an edge counts.
