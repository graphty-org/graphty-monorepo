# Read the numbers -- Analyst Alex

**Task as given:** "You loaded 300 proteins and filtered to one module. Explain every count on
screen, and why the node count is not 300."

**Participant:** Analyst Alex, operations data analyst. Knows NetworkX and Gephi, checks every
count against the number SQL gave him before he trusts anything else.

**Screens seen, in order:** the open-file dialog for ppi-core-300.graphml, the loaded graph at
rest, the graph filtered to the Ribosome module with its filter steps open, and the Results panel
after a betweenness run. The Navigation page was also offered; it shows a different dataset (Les
Miserables) and did not bear on this task.

Renders: `shots/tasks/read-the-numbers/01-load-step-graphml.png` to `04-results-panel-finished.png`.

---

## 1. The open-file dialog

> Okay, "Open ppi-core-300.graphml". Proteins aren't my world, but fine, a node table is a node
> table. First thing I look for is the totals. "What will load: nodes 300, edges 1,262." Good,
> that's before I hit Load, which I like -- I can stop here if it's wrong. If I'd written this out
> of SQL I'd have 300 and 1,262 on a sticky note and they match.
>
> Left side: "Node attributes 2" -- module, log2FoldChange. "Edge attributes 1" -- confidence. So
> three columns plus the id. "module: Category, 9 values." Okay, nine modules, or eight and a
> blank, I'll find out.
>
> "Weight: confidence, not used yet." Fine, it's telling me it's not weighting anything. I'd
> rather know that than find out later. Direction: "Undirected, as the file declares." Good.
>
> Sample, "first 5 of 300 nodes". All Proteasome. That's just the file order, I assume.
>
> Load.

## 2. The graph at rest

> Hairball-ish but coloured, so at least I can see the blobs. Right side, "Statistics". This is the
> bit I actually care about.
>
> - "Nodes 300 nodes." Matches.
> - "Edges 1,262 edges (rows)." Matches. "Rows" -- okay, as in rows of the file. Fine, that's how I
>   think about it anyway, it's an edge list.
> - "Linked pairs 1,262 linked pairs." ...Why is that a separate line if it's the same number? Pairs
>   of what? I'm guessing it's if the file has the same two proteins twice it counts them once. So
>   on this file there are no duplicates, which is actually something I'd check in pandas with a
>   drop_duplicates. If that's what it means, it's useful. But I'm guessing. I hover the little i
>   -- nothing comes up. So I'm going with my guess.
> - "Density 0.0281." 1,262 over 300 times 299 over 2 -- yeah, about 0.028. Right.
> - "Connected components 3 (2 isolates)." So one big piece and two loners. I can see two grey dots
>   floating out on their own, top right and bottom right. Okay, that checks out with the picture.
>   That's the "giant component plus dust" check I'd do anyway, done for me.
> - "Attributes 4." ...Hang on. The load screen said 2 node attributes and 1 edge attribute. That's
>   3. Where's the fourth? Is it counting the id? Did it make one up? This is exactly the kind of
>   off-by-one that I'd get asked about. It's not a big deal but I can't explain it, and the task is
>   explain every count. "5 more" underneath -- 5 more what? More statistics, I guess.
>
> The legend. Ribosome 56, Proteasome 40, Complex I 35, Spliceosome 32, MAPK 31, DNA repair 30,
> Cell cycle 29, TGF-beta 21, Other 26. Let me add these up... 56, 96, 131, 163, 194, 224, 253,
> 274, 300. Three hundred. Good, the legend totals the node count, I like that.
>
> Then underneath "Other" it says "Unassigned" with no number. So is Other the unassigned ones, or
> is Other some lumped small modules and Unassigned is zero? The load screen said 9 values. Eight
> named plus one... I'm going to guess Other *is* Unassigned, 26 proteins with no module. But why
> two words for one thing? Put "Unassigned 26" and be done.
>
> "Labels: the 22 proteins with the most partners, 7 more hidden where they overlap." Okay, so it's
> telling me the labels are the top 22 by degree and some are hidden. That's honest, I'll give it
> that. I count the labels... roughly 15. Fine.
>
> Bottom bar: "Table 300 nodes, 1,262 edges (rows)." Same numbers, same units. Good.

## 3. Filtered to the Ribosome module

> Top left the chip now says "56 of 300 proteins, 1 step." That's the answer to "why isn't it
> 300": I filtered. And it's right there in the chip, not hidden. Good. The filter steps box: "Filter
> to module Ribosome -- took out 244, 56 left." 300 minus 244 is 56. And 56 is the Ribosome number
> from the legend before. Three places agree. That's the sentence I'd say to my manager: "we're
> looking at the 56 Ribosome proteins out of 300, the filter took the other 244 out."
>
> Statistics on the right, now with a little funnel icon:
>
> - "Proteins 56 of 300, in the filtered graph." Yes.
> - "Interactions 217 of 1,262." ...Okay, now it's "Interactions", before it was "edges (rows)"
>   and "linked pairs". Which one is 217? Rows or pairs? On this file they're the same, so it
>   doesn't matter today, but next month on a file with duplicates I won't know which one I'm
>   reading. And it doesn't say how the edges went -- the step says "took out 244" nodes but nothing
>   about the 1,045 edges that went with them. I did that subtraction myself.
> - Is 217 edges with both ends in Ribosome, or any edge touching Ribosome? I look at the table
>   underneath: "Degree (filtered)" and "Degree (full graph)". RPL28 is 14 filtered, 17 full. So 3 of
>   its partners are outside the module and they got dropped. So it's both ends inside. Okay, that
>   table column answered my question, which I didn't expect. That's actually nice -- that's the
>   thing I'd have to write a merge in pandas for.
> - "Components 1", "Largest component 56", "Isolated proteins 0". So the module is one piece.
>   Makes sense for a ribosome, I assume.
> - "Average degree 7.75." 217 times 2 over 56 is 7.75. Checks. Full graph was 8.41, so these are
>   slightly less connected inside the module than proteins are overall. Hm, or they just lost
>   their outside partners. Probably that.
> - "Density 0.141." Higher than 0.028 because it's a small tight group. Fine.
>
> Every one of these lines says "of the filtered graph (56 of 300 proteins)" again and again. I got
> it the first time. It's making the panel twice as long. I skim past it.
>
> Left side: "Interactions 300 proteins" next to the graph name. That still says 300 while
> everything else says 56. I suppose that's the whole graph and the chip is the filter. It made me
> look twice.
>
> "Hubs -- rule -- 0 of 10." I didn't make that. Someone did. I'm guessing there are 10 hubs in
> the whole graph and none of them are Ribosome proteins. The biggest full-graph degree in the
> table is 17, so if a hub is "20 or more partners" that would fit. But it doesn't say what makes
> a hub, and "0 of 10" could also read as "zero out of ten looked at". Guessing again.
>
> The legend dropped to one row, "Ribosome 56". Good, the legend follows the filter.

## 4. The Results panel after betweenness

> Wait. The chip is back to "Full graph". Did my filter get dropped? The Results header says "on:
> full graph, 300 nodes, 3 components". So this run was on the full graph. Was it run before I
> filtered, "Sep 28 09:12"? Or did opening Results reset my filter? I can't tell from this screen,
> and that's the thing that would get me in trouble -- quoting a betweenness number as "within the
> module" when it's across the whole network. At least it *says* full graph in two places, so if I
> read it I don't get it wrong.
>
> Overview on the right: "nodes 300, edges 1,262, components 3, average degree 8.41." Same numbers
> as the rest screen. But here it just says "edges", not "edges (rows)", no linked pairs. So the
> units come and go depending on which panel I'm in.
>
> "Top nodes: MAPK1 0.1379, TP53 0.1139..." fine, top five. "295 more in the table." 300 minus 5.
> Good.
>
> "Every step in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%." I read
> that twice. I think it means the gaps between the ranks are big enough that they aren't ties.
> "Tie line" is not a phrase I'd use with a director. I'd skip it.
>
> "Distribution 300 nodes." Middle 0.0038, highest 0.138. "zero: 10 nodes, all 291=". What is
> "291="? That looks like broken text. Tied at rank 291? If it's a rank, say "all tied at rank 291".
> Right now it looks like a bug, and a bug next to a number makes me doubt the number.
>
> Legend bottom right says "the 10 proteins at 0 take the lightest colour" -- 10 proteins, same as
> the "10 nodes" in the distribution. Agrees. But one says proteins and the other says nodes.
>
> "Exact -- computed on every node, not estimated." Good, that's what I'd want to know before
> comparing to NetworkX.

## 5. Navigation page

> This is a different dataset -- Les Miserables, 77 nodes. Nothing here about my proteins. Moving
> on.

---

## My answer to the task, as I'd say it

The file has 300 proteins and 1,262 interaction rows; no pair appears twice, so linked pairs is
also 1,262. The network is one big piece plus two proteins with no partners. The module legend adds
up to 300 (26 of them have no module, shown as Other). I filtered to Ribosome, which removed 244
proteins, leaving 56 -- that's why it isn't 300. Inside the module there are 217 interactions,
counting only ones where both proteins are Ribosome; the other 1,045 went with the removed
proteins or crossed out of the module. The 56 are all one connected piece. The betweenness run on
the Results screen is on the full 300, not on the module.

What I could not explain: why Attributes says 4 when the load screen listed 3; whether "Other"
and "Unassigned" are the same thing; what "0 of 10" on Hubs means; and what "291=" is.

## Single Ease Question

**5 of 7.**

The main question -- why not 300 -- took about three seconds: the chip says 56 of 300, the filter
step says took out 244, and the legend said Ribosome 56 before I filtered. That part is better than
Gephi, where the filter count lives in a corner of the Filters panel and I'd have to go to Data
Laboratory to be sure. What cost me time was the side counts: Attributes 4 against 3 on load,
Other versus Unassigned, Hubs 0 of 10, the unit on edges changing from "edges (rows)" to
"Interactions" to plain "edges" as I moved between panels, and "291=". None of them is wrong in a
way that breaks the answer, but each one is a question someone in the room could ask me that I
can't answer.

## Would I use this instead of what I use now?

For the "did it load what I think it loaded" check, yes. Nodes, edges, components, isolates and a
legend that adds up to the total, all before I've done anything -- that's the pandas cell I run
every time, done for me. The filtered-versus-full degree columns side by side answered a question
I'd normally write a merge for. I'd still recompute the headline numbers in NetworkX the first few
times, and if betweenness comes out different I'm out. And I'd need it to not quietly be on the
full graph when I think I'm on the module -- it says so, but only if I read the header.
