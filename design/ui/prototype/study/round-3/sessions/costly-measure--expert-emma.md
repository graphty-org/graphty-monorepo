# Session: a measure too costly to run exactly -- Expert Emma

**Participant:** Expert Emma, network scientist, lives in notebooks (networkx, igraph, graph-tool),
uses Gephi for the final figure. See ../../personas/expert-emma.md.

**Task, as the moderator gave it:** "Measure who bridges the groups across this whole citation graph."

**Screens, in order:** the measure options form with cost (screens/option-form-cost.html, the
patent-citation states), the Results panel's refused and finished-sampled states
(screens/results-panel.html), and the not-drawn view of the same graph
(screens/past-drawing-limit.html).

**Renders she saw:** shots/option-form-cost-over-budget.png, shots/option-form-cost-within-budget.png,
shots/option-form-cost-sample-over-budget.png, shots/screens__results-panel--refused.png,
shots/record/r3-emma-costly-rp-sampled.png, shots/record/r3-emma-costly-past-limit.png.

---

## Think-aloud transcript

**Reading the task.** "Who bridges the groups." Okay, first question is what the groups are. If the
groups are communities, that is a two-step job: find the communities, then something like a
participation coefficient or betweenness restricted to inter-community paths. If the moderator just
means 'brokers', betweenness is the lazy proxy everyone reaches for. I'll start with betweenness
because that's what the screen seems to be built around, and I'll complain about the groups later.

**The first screen: Betweenness already refused.** (option-form-cost, over the time limit.) Left
column: Patent citations, full graph. Betweenness has a yellow bang and says "hours". Right side:
124,318 nodes, 1,480,221 edges, directed, average total degree 23.8. Fine, those I'd check first
anyway, and they're right there. Good.

The popover: "Takes hours. The time limit is 30 seconds. Directed, on the full graph: 124,318 nodes."
Hours is honest. Exact Brandes on 124k nodes and 1.5M edges is O(nm), so yes, hours, in any
language. I appreciate it didn't just start and pin my fan. Who set 30 seconds? Is that mine to
change? It doesn't say. In igraph I'd just let it run overnight.

Four options. "Sampled, 101 sources, under a minute." "Exact, on 5,318 nodes, under a minute."
"Sampled, 500 sources, a few minutes." "Exact, on the full graph, hours." That is actually the list
I'd have in my head. The 5,318 one I don't understand at first -- 5,318 what? Oh, over on the right
under Sets and paths: "Drug patents granted in 2..." truncated, 5,318. So someone already made a set.
Betweenness on a subgraph is a different quantity, it's not "betweenness of those nodes", it's
betweenness inside that island. The menu row just says "Exact, on 5,318 nodes" as if that were the
same measure cheaper. It is not. A junior would pick that because it says exact. I'd want it to say
"inside the set Drug patents..., paths leaving the set are not counted".

101 is a weird number. Why 101 and not 100? I assume it's what the cost model says fits. Fine.

Directed. Hmm. On a citation graph directed betweenness is nearly useless -- citations go backwards
in time, it's close to a DAG, so directed shortest paths are chains through time and most nodes get
zero. For "bridging groups" you read it undirected. Is there a direction choice here? Not in this
popover. I'll pick the sample and hope the form lets me change it.

**Clicking "Sampled, 101 sources" / Run sampled.** (option-form-cost, within the time limit.) Now
it's running, progress bar, "under a minute", "Directed". The form now has Scope, Direction ("As the
graph: directed" -- a dropdown, so I *can* change it, good), Sample size 101 "of 124,318", "The
largest sample that fits the time limit", Seed 7, and "Edits wait for Re-run". Seed visible. That is
the single most important thing on this screen and it's there. Thank you.

I'd change Direction to undirected now, but it's already running. "Edits wait for Re-run", fine, I'll
let it finish and re-run. Or cancel. The Cancel is right there. I'd cancel, honestly, because the
directed number is not what I want. Let's say I let it finish to see what I get.

"Readings, when it finishes: Scores are estimated from 101 sources. The top of the ranking is usually
stable; a single score can be well off." True, and I like that it says so. It's the Brandes-Pich /
Riondato-Kornaropoulos story in one line. I'd want the citation, but fine.

**Trying a bigger sample.** (option-form-cost, sample of 500.) Typed 500. It warns in place: "500
sources take a few minutes, past the 30-second time limit. Run starts it in the background." And
"101 is the largest that fits." Okay, so the 30 seconds isn't a wall, it's a "we'll do it in the
background" threshold. That was not clear from the first screen, which said "The time limit is 30
seconds" like a law. Now I know it'll run in the background. Good behavior, confusing first
wording.

**The finished result.** (results-panel, finished-sampled.) "Betweenness (sampled)". The state line:
"on: full graph, 124,318 nodes. Sampled, 101 sources. Unweighted, directed. WebGPU." Direction
dropdown says "Directed". Then I open Details and get a proper run record: Method -- "Brandes
betweenness from 101 random sources, scaled up by 124,318 / 101". Seed 7. Damping does not apply.
Normalization "Divided by (n-1)(n-2)/2, the node pairs of an undirected graph". Error bound "+-
0.00035 on each value, 95 runs out of 100". Direction: "**Citations read as undirected**". Engine
WebGPU.

Wait. Wait. The editor says directed. The dropdown says Directed. The record says undirected, and
the normalization is the undirected one. Which one ran? This is exactly the thing I've been burned
by -- a tool that tells you one thing in the form and does another. I can't send this to anyone.
Either the label is wrong or the number is wrong, and I have no way from this screen to tell which.
If I had a notebook open I'd run igraph with the same seed on a subsample and compare, which is
what I'm trying not to have to do.

And separately: the refusal screen in this same panel said "Sampled, **50** sources" and
"Undirected", while the options form said 101 sources and Directed. Same graph, same measure. I
don't know if that's the mock or the product, but in a real tool, two screens disagreeing on the
sample size would end my trial.

Everything else in the record is what I'd write in a methods section: method, seed, normalization
formula, the n it used, weight conversion, error bound with its confidence. The "Copy" button for
that is the best thing I've seen in one of these tools. If the direction line agreed with the form,
I'd paste it straight into a paper.

**Reading the numbers.** Distribution: middle ~0, highest ~0.016, zero ~79,554 nodes. 79,554
estimated zeros out of 124k. On a sample of 101 sources, an estimated zero isn't a zero, it's "no
sampled path went through you". It says "estimated" in the header, but "zero" as a row label reads
like a fact. I'd call it "no sampled path" or similar.

Top nodes: #1 5879702 ~0.0160, #2 5902311 ~0.0037, then "#3-#7" three times. Oh, that's clever --
rank ranges from the error bound, so it's telling me 3 through 7 are indistinguishable. "Ranks below
#2 may swap between runs." That is honest and I've never seen a GUI do it. The column head "rank,
low-high" took me a second; I read it as "sorted low to high" before I understood it meant the
range.

But these are patent numbers. Who is 5879702? For "bridges the groups" I want to see its category
next to it. The table view (past-drawing-limit screen) has a category column with 6 values, and
grantYear. The Top nodes list shows neither. "124,313 more in the table" -- so the table has the
rest, presumably with category beside it. I'd go there.

**The groups problem.** (past-drawing-limit, not drawn.) Here's the graph view: "124,318 nodes not
drawn. More than this browser draws at once (50,000)." Good, it didn't try to draw a hairball of
124k nodes, it gave me the table, sorted by citations received, and a degree distribution, log-log,
in/out/total. That is the right first screen for a graph this size. More tools should do this.

The table has "category, 6 values": Drugs and medical, Computers and communications, Electrical,
and so on. So maybe the moderator's "groups" are these categories. Then the real question is: which
patents sit on paths between categories. Betweenness doesn't answer that; it counts all paths,
including within-category ones. What I want is participation coefficient with category as the
partition, or betweenness counting only between-group pairs, or at minimum an edge-level count of
cross-category citations per node. Nothing in the catalog on the left is that. Leiden and Louvain are
there, so I could make data-driven groups, but then there's no step that says "now, who connects
these groups". I'd export the betweenness column and the category column and do it in pandas. That's
five lines. Fine, but it means the tool did the expensive part and I do the part the question was
actually about.

**Where I ended.** I have a sampled betweenness ranking with its seed and error bound, which I trust
as a ranking of the top two and a rough band after that -- *if* I knew whether it was directed or
undirected. I did not get "who bridges the groups" in the sense I'd defend to a reviewer.

---

## Single Ease Question

**3 out of 7.** Getting a number out was easy -- the refusal handed me the right four choices and
the sample defaults were sensible. Getting a number I'd sign was hard, because the form and the run
record disagree on direction, and the task's "groups" part isn't something the tool can do.

## Would she use this instead of her current tool?

"Not instead. Next to. The refusal-with-routes screen and that run record are better than anything
Gephi has ever shown me -- Gephi just freezes on 124k nodes and you find out an hour later. If I could
point it at my notebook's graph, get the sampled ranking with the seed and error bound, and copy the
methods line into a draft, I'd use it for that. But the day it tells me 'directed' in one place and
'undirected' in another, I'm back in igraph, because in igraph at least I know what I typed. And for
anything with 'groups' in the question, I need a bridging measure that takes a partition -- a
participation coefficient over a column I choose. Until then it's betweenness and pandas, same as
always."

---

## Problems found

1. **Direction contradicts itself between the form and the run record.** (results-panel,
   finished-sampled.) State line and Direction field say "directed"; the run record says "Citations
   read as undirected" and gives the undirected normalization. Severity 4: she cannot tell which
   computation produced the numbers, so she cannot use any of them.
2. **The refusal disagrees across two screens for the same graph.** (option-form-cost state 3 vs
   results-panel refused.) 101 sources and Directed in one, 50 sources and Undirected in the other;
   "Fits the time limit" vs "Fits the budget". Severity 3.
3. **Directed is the default for betweenness on a citation graph, and the refusal gives no way to
   change it.** (option-form-cost, over the time limit.) The four routes all inherit "Directed"; the
   Direction choice only appears after a route has started running. On a near-DAG, directed
   betweenness is mostly zeros. Severity 3.
4. **"Exact, on 5,318 nodes" reads as the same measure, cheaper.** (option-form-cost, over the time
   limit.) It is betweenness inside a subgraph, a different quantity, and the set's name is not on
   the row. Severity 3.
5. **"The time limit is 30 seconds" reads as a hard wall, but it is only the background threshold.**
   (option-form-cost, over the time limit vs sample of 500.) She learned it can run longer only when
   she typed 500. Who sets it and whether she can change it is not said. Severity 2.
6. **No bridging measure over a chosen partition.** (Catalog, all three screens.) "Who bridges the
   groups" needs participation coefficient or between-group betweenness over a column such as
   category or a Leiden result; the catalog has neither, so the task's real question goes to pandas.
   Severity 3.
7. **Top nodes shows bare patent numbers.** (results-panel, finished-sampled.) No category or year
   beside them, so "bridges which groups" cannot be read off the list. Severity 2.
8. **"zero ~79,554 nodes" on a sampled estimate.** (results-panel, finished-sampled.) An estimated
   zero means no sampled path, not zero betweenness. Severity 2.
9. **"rank, low-high" column head.** (results-panel, finished-sampled.) Read first as a sort order
   rather than a rank range. Severity 1.

## What she liked

- A refusal that lists the ways forward with their costs, instead of freezing.
- The seed shown in the form and in the record; the sample size named as what it is.
- The run record: method, seed, normalization formula with its n, weight conversion, error bound
  with its confidence, and a Copy button for a methods section.
- Rank ranges ("#3-#7") and "Ranks below #2 may swap between runs": honesty about sampling error.
- For 124k nodes, a table and a log-log degree distribution instead of a hairball.
