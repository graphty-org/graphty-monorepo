# Session: the 200 most in-between patents on a graph too big to draw -- Chris, ML engineer (recommendation systems)

**Task, as the moderator gave it:** "On a very large citation network, list the 200 most
in-between patents and look around one of them."

**Participant:** Chris, senior ML engineer on a retail recommendations team (persona:
`study/personas/ml-engineer-recsys.md`). 1440 x 900 laptop screen.

**Screens used, in order:** the graph past its drawing limit (`screens/past-drawing-limit.html`:
not drawn, the filter steps list, the step editors, narrowed and drawn, the most-cited route),
then the bottom dock table (`screens/table-dock.html`: the ranked protein table, the past-the-limit
frame, the CSV export). Seen as the study view renders them (design notes hidden).

**Outcome:** failure on the first half, success on the second. Chris never produced a list of the
200 patents ranked by betweenness: neither screen shows how to run betweenness on this graph, what
it would cost, or whether it would be exact. He did get an ego graph of one patent, but he picked
it by citation count, not by betweenness.

## Transcript (think-aloud)

**The opening frame: "124,318 nodes not drawn".**

> OK. Patent citations, 124,318 nodes, 1,480,221 edges. Canvas says "124,318 nodes not drawn.
> More than this browser draws at once (50,000)." Good. Genuinely good. That's the first graph
> tool that didn't try to hand me the galaxy. Every node is "counted in Statistics and listed in
> the table" -- fine, I'll hold it to that.

> Right panel: density 0.0000958, average total degree 23.8, isolates 2,406, weak components
> 3,912, the big one is 116,905 nodes, 94.0%. And there's an in-degree CCDF on log-log with the
> zero count beside it, 41,873. That's the plot I'd make first in a notebook. Axis ticks are tiny
> though, like 9px. I'm squinting at "max 236".

> Wait -- the table says the top patent has citationsReceived 779 and the chart says max in-degree
> 236. Oh, the note under isolates explains: citationsReceived counts citations from outside the
> sample. OK, that's actually a good catch that I'd have gotten wrong. Moving on.

**Looking for betweenness.** He scans the table header, then the right panel, then the left.

> "Most in-between" -- that's betweenness centrality. So I need a betweenness column, sort by it,
> take 200. The table is sorted by citationsReceived. Columns: id, grantYear, category,
> citationsReceived. No betweenness. Nothing's been run.

> Where do I run stuff? Left rail has Graph, Assistant, Results, Notes. "Results" with a flask --
> that's probably results of runs, not where you start one. There's a lightning bolt in the
> toolbar. I'd bet that's a command palette. I'd hit Cmd+K and type "betw". That's what I'd do
> in VS Code.

> [Moderator: the prototype doesn't show what happens there.]

> Then I'm stuck, honestly. And this is the part I actually care about. Exact betweenness on
> 124k nodes and 1.5M edges is Brandes, O(nm) -- that's order of 10^11 operations. In networkx
> I'd not even try that; I'd do k-sample approximation with k = 500 or so. So I need to know
> before I click: exact or sampled, how many sources, directed or undirected, and how long. None
> of that is on these two screens.

**Borrowing from the second screen.** He opens the table screen and finds the protein table.

> OK, here's what it looks like after a run, on some protein network. "Betweenness exact,
> unweighted, full graph" as a group header, a score column and a "rank of 300" column. That's
> nice -- method and scope right on the column, and the CSV writes the same words into the
> header. I like that a lot. That's what I'd want in the export so a teammate knows what the
> number is.

> But "exact, unweighted" -- it doesn't say directed. On a citation graph that's the whole
> question. Shortest path from A to B following "cites" edges only, or ignoring direction?
> Those give completely different top-200 lists. If it doesn't say, I assume it's wrong.

> And that's 300 nodes. It proves nothing about 124k. I don't know if this thing will take a
> second or a day.

**Trying to get "200 of them" through Narrow the graph...**

> Fine, suppose betweenness ran and the table is sorted by it. How do I get "the 200"? The
> button on the canvas: "Narrow the graph...". Opens "Filter steps". Suggested: "Top 3 by
> citationsReceived, with neighbors, 586". "Follows the table's sort; favors hubs." So if the
> table were sorted by betweenness this would be top N by betweenness. Good idea.

> I open it. "Top 3", a number box, "by citationsReceived", then "with every neighbor, both
> directions, 1 hop" -- and that line isn't a control, it's just text. I don't want the
> neighbors. I want 200 rows. "graphty chose 3, the most that reads at the fitted zoom; 4 would
> keep 734 nodes." So if I type 200 I'm going to get... tens of thousands of nodes, and the count
> line will tell me "will not draw". Which is fair, but it's answering a question I didn't ask.
> I asked for a list, not a picture.

> This is mixing two things. "Top 200" is a table operation: sort, head(200). "Draw them" is a
> separate thing. Here the only offered "top N" is glued to "and draw their neighborhoods".

**Falling back to the table.**

> Honestly the table already is the list. Sorted, every row reachable, the scroll thumb is
> sized for all 124k. If betweenness were a column, I'd sort it and the first 200 rows are my
> answer. Then I need to get them out. Where's export on this table? There's a search icon and a
> "..." in the dock header. On the other screen the same spot has a labelled "Export table as
> CSV...". Here it's just three dots. I'd guess it's in there.

> And the export dialog on the other screen says "Rows: All 300". Can I say "first 200 rows"? Or
> do I have to select 200 rows by shift-clicking? I don't see a "first N rows" option. I'd
> probably export all 124k and do head(200) in pandas. Which is fine, actually, but then why am I
> in this tool.

> Could I write a rule instead? New rule: Where [attribute] [op] [value]. I'd try "betweenness
> rank <= 200". The attribute list in the example only has category and citationsReceived; I
> can't tell if a run's rank column shows up there. Guessing yes. If it does, the count line
> would say "200 nodes, N edges, will draw" -- that'd be the win. But I'm guessing.

**Looking around one patent.**

> OK, second half. "Around a node..." -- "a row you pick in the table, or find by name". I pick
> the top row, 6117075. Opens "Around 6117075, 1 hop, Both directions". "242 nodes, 348 edges,
> will draw." Good. That's my ego graph, and it told me the size before I committed. That's
> exactly how it should work.

> Both directions is a dropdown, so I can do "cited by" only or "cites" only. Good. 2 hops would
> be the next thing I'd try; I assume the "1 hop" dropdown goes to 2 and the count would tell me
> if it blows up.

> I didn't see this particular ego graph drawn, but the other narrowed state draws gray nodes
> with arrows and labels, no legend. For an ego graph I'd want the center node obviously marked
> and the in-neighbors vs out-neighbors coloured differently. Gray on gray with arrows at that
> density -- I'll be zooming in to see arrowheads.

> And to be clear, I picked 6117075 because it's the most cited, not the most in-between. I
> never got a betweenness number, so I just looked around a hub. That's not the task.

**Wrap-up.**

> The not-drawing-the-hairball part is great. Stats first, table as the main surface, the count
> before you commit a filter, "Nothing is sent" in the rail -- that's all stuff I'd have to fight
> for in other tools. But the one thing the task needed, running betweenness on 124k nodes and
> knowing what I'm getting, isn't here. And "top N" means "top N plus their neighbors, drawn",
> when I just wanted the top N.

## After the task

**Single Ease Question:** 2 of 7.

> The looking-around bit is a 6. The listing bit I couldn't do at all, so overall it's a 2.

**Would he use this instead of his current tool?**

> Not for this. For the list I'd do it in a notebook: load the edge list into igraph or
> networkit, approximate betweenness with a fixed number of sampled sources, directed, sort,
> head(200), to_parquet. Maybe 15 lines and I know exactly what I computed. Where this would
> earn a spot is the second half -- pick one of those 200, see its 1-hop neighbourhood with a
> size check before it draws, flip direction, go to 2 hops. If I could paste my 200 ids in (or
> the tool computed them and told me "sampled 1,000 sources, directed, 40 s on GPU"), I'd use it
> for the exploring. Right now it's half a workflow.

## Problems observed

1. **No way to run betweenness on this graph is shown, and nothing says what it would cost.**
   The past-the-limit screen has no run control in view; the Results rail item and the lightning
   toolbar button are guesses. Exact vs sampled, directed vs undirected and expected time are all
   absent for a 124k-node, 1.48M-edge graph. Severity 4.
2. **"Top N" is fused with "and all their neighbors, drawn".** The offered step reads "with every
   neighbor, both directions, 1 hop" as fixed text, and its N defaults to 3 "the most that reads
   at the fitted zoom". There is no plain "keep the top 200 rows" step, so the list-making task
   gets steered into a drawing task that will not draw. Severity 3.
3. **Betweenness's column header does not say whether direction was used.** "exact, unweighted,
   full graph" on the protein example; on a citation graph direction changes the answer.
   Severity 3.
4. **Export is not visible on the past-the-limit table.** The dock header shows only a search
   icon and "...", while the other screen shows a labelled "Export table as CSV...". The export
   dialog offers "All N" rows with no "first N rows in this order" choice. Severity 2.
5. **Unclear whether a rule can use a run's rank column.** The rule editor's attribute list
   only shows imported attributes in the examples, so "betweenness rank <= 200" is a guess.
   Severity 2.
6. **Small text.** Axis ticks on the degree chart (about 9px) and 11px secondary lines are hard
   to read on a laptop screen. Severity 1.

## What landed well

- Not drawing 124k nodes, and saying so with the count and the limit, instead of freezing.
- Statistics first: density, components with the 94.0% giant component, the in-degree CCDF on
  log-log with the zero count beside it.
- The count before the commit: "242 nodes, 348 edges, will draw" on Around a node.
- Run columns that carry method and scope into the CSV header.
- "Assistant: Off. Nothing is sent." in the rail.
