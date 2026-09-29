# Session: measure who bridges the groups on a graph too big to measure exactly -- knowledge graph engineer

**Participant:** a knowledge graph engineer at a financial-services company. Owns an OWL ontology and
a 40-million-triple corporate knowledge graph in a triple store; queries it in SPARQL and in Python
notebooks (rdflib, pandas, sometimes networkx). Uses the word "centrality" precisely and always asks
which one. Mild red-green colour weakness.

**Task as the moderator gave it:** "Measure who bridges the groups across this whole citation graph."

**Screens used:** the patent citation graph (124,318 patents, 1,480,221 citations) open in the main
window: the Results panel with the cost refusal for Betweenness and its three ways forward; the
sampled estimate running; the sample size edited past the budget; the refusal with no sampled method;
the Results panel's finished state (shown on the 300-protein graph, the only finished example); and
the canvas when the graph is past the drawing limit, including the "sample of the most connected
patents" route.

**Outcome:** partly done. She gets a sampled betweenness estimate running inside the time limit on the
whole graph, which is more than a notebook would have told her up front. But the tool never meets the
word "groups": nothing connects a bridging measure to a partition, the measure silently treats a
directed citation graph as undirected, and she never sees what the finished answer looks like on this
graph. She would report the ranking as "a first look", not as a number.

---

## Part 1: reading the task

> "'Who bridges the groups.' First question: which groups? Patent categories -- I will guess there is a
> category column -- or communities the tool computes? Those are different questions. If it is
> categories, what I actually want is something like a participation coefficient, or betweenness
> restricted to paths that cross categories. If it is communities, I need the partition first and
> then the bridging measure over it.
>
> I do not expect a viewer to have a participation coefficient. So realistically this is going to be
> betweenness, and I will have to say out loud that betweenness is a proxy for bridging, not the
> definition of it. High betweenness in a citation graph is often just a hub that sits on a lot of
> shortest paths inside one field."

## Part 2: the Results panel, before clicking anything

**Screen: main window, Results panel open, Betweenness selected in the catalog.**

> "Left side: 'In this project' -- Betweenness with a yellow exclamation and 'hours', and Connected
> components, 3,912. Then a Catalog filtered to Centrality: Betweenness, Closeness, Eigenvector,
> Harmonic, HITS, Katz, PageRank.
>
> So the catalog is a flat list of centralities. There is no 'bridging', no 'brokerage', no
> 'participation'. The task word does not exist here. Someone who does not know that betweenness is
> the usual stand-in would be stuck at this list. I know, so I pick Betweenness.
>
> 'Hours' next to it before I click -- good. That is the thing Neo4j Browser never told me. I would
> rather it said 'about 3 hours' than 'hours', because 'hours' could be two or twenty, but it is
> honest that it is expensive before I start it. That I like.
>
> 3,912 connected components. On a directed citation graph I assume that is weakly connected. On
> another screen the same row says 'Weakly connected components', which is the correct name. Pick
> one. I notice when a count changes its label between screens."

## Part 3: the refusal

**Screen: the Betweenness popover, over budget.**

> "'Takes hours; exact runs stop at 30 seconds.' Fine, it refuses instead of hanging the tab. That is
> the single most important thing a tool can do with a graph this size, and it does it. There is an
> error code, E_CAP_EXCEEDED, which I can put in a ticket. Good.
>
> 'Undirected, on the full graph: 124,318 nodes.' Wait. Undirected? The Statistics panel on the right
> says direction: directed. Citations have a direction -- a later patent cites an earlier one. So
> betweenness here throws the direction away. It tells me, which is better than not telling me, but
> it does not tell me why and it does not let me choose. On a citation graph, undirected shortest
> paths go 'backwards in time' through the patent that both cite. That changes who looks like a
> bridge. I want a Directed option, or at least a sentence saying directed is not offered and why.
>
> Three routes. 'Fits the budget': 'Sampled, 50 sources -- under a minute', and 'Exact on Drug
> patent...' -- truncated. I cannot read the set name. I would hover it. Probably 'Drug patents
> granted in 2001', from the Sets panel on the right, 5,318 nodes. Either way, the moderator said
> the whole graph, so a drug-patent subset is not my answer; exact on a subset measures bridges
> inside that subset, which is a different graph.
>
> 'Over the budget': 'Exact on the full graph, hours.' I am not waiting hours for a proxy measure.
>
> So: Sampled. Which estimator? Brandes and Pich pivots? Uniform random sources? 50 sources out of
> 124,318 is 0.04 percent. That is a very thin sample. I would want to set the sample size before I
> run, and there is no field here -- just the route. The button says 'Run sampled'. I click it
> because there is nothing else to set."

## Part 4: running

**Screen: 'Betweenness (sampled)' running.**

> "Now there are two rows on the left: 'Betweenness' still with 'hours', and 'Betweenness (sampled)',
> 'under a minute'. Two results, good, the refused one stays as a record. A progress bar in the
> popover and another in a toast at the bottom, with Cancel. Fine.
>
> And NOW the sample size field appears: 50, 'of 124,318', 'About 100 fits the budget.' Why did you
> not show me that before I pressed Run? If 100 fits, I would have chosen 100. Now I have to let this
> finish and re-run. 'Edits wait for Re-run.' OK, so I will re-run with 100.
>
> 'Seed: random', with a little pink 'proposed' tag next to it. I do not know what 'proposed' means --
> proposed by whom? I will assume the seed is not recorded. That is a problem: if I send someone a
> ranking I need to tell them how to reproduce it. In a notebook I pass seed=42 and I am done.
>
> 'Readings, when it finishes: Scores are estimated from 50 sources. The top of the ranking is usually
> stable; a single score can be well off.' I appreciate that someone wrote a caveat. But 'usually' is
> not a number. Give me an error bound, or at least the rank overlap between two seeds. I would run it
> twice with different seeds and compare the top 20 myself.
>
> Scope: 'Full graph', a dropdown. So I could have changed scope here too. Fine."

## Part 5: trying a bigger sample

**Screen: sample size set to 500.**

> "I typed 500 because 100 felt thin. Red: '500 sources take a few minutes; runs stop at 30 seconds.'
> Run is greyed out. So the cap is hard, and I cannot choose to wait a few minutes even if I want to.
> The cap is someone else's decision about my time. I would at least want 'Run anyway' behind a
> confirmation for the sampled route -- I chose 'hours' is too long, not 'a few minutes' is too long.
>
> Otherwise the refusal is clear: it keeps my 50-source result and does not throw it away because I
> typed a bad number. OK. I set it to 100."

## Part 6: the answer

**Screen: the finished state (shown on the 300-protein graph; there is no finished patent example).**

> "In the sampled popover after it finishes there is a collapsed 'Top nodes' row. That is where my
> answer is. I cannot open it in this mock. On the protein example, a finished betweenness shows a
> distribution, middle, highest, how many are zero, and a Top nodes list with names and scores.
> If the patent version looks like that, I get patent numbers and estimated scores. I need to know
> whether the list and any export say 'estimated from 100 sources' on every row or column header,
> because the moment it leaves this screen someone will quote the score as exact.
>
> The colour ramp on the protein graph is light-to-dark orange, single hue, log scale. I can read that
> one; it does not depend on red versus green.
>
> But on my graph the canvas says '124,318 nodes not drawn: more than this browser draws at once
> (50,000). Narrow the graph...' So there is no picture of who bridges what. Honestly, good -- tell me
> before it freezes. But it means the answer is a list, not a map. For 'bridges the groups' I want to
> see the bridge sitting between two clusters."

## Part 7: the offered drawing route

**Screen: the canvas past the drawing limit, 'sample of the most connected patents'.**

> "The offered route draws 586 patents: top 3 by degree with their neighbours, and the statistics say
> 'Describes a sample: top 3 by degree, with neighbors. It favors hubs, so density and clustering
> read high.' That is an unusually honest label. I respect that.
>
> But for my question it is exactly the wrong sample. Hubs are not bridges. Three stars with their
> leaves, joined by a few patents in the middle -- 6,018,952, 5,907,468 -- and those in-between ones
> are the only interesting nodes on the screen. What I would want is 'draw the top 50 by the
> betweenness I just computed, plus their neighbours'. Nothing on the refusal or the result offers
> that path from the result to the drawing. I would probably try the filter rule editor and write
> 'betweenness in top 50', if it lets me filter on a result. I did not see that it does."

## After the task

**Single Ease Question: 4 of 7.**

> "Getting a number was not hard: pick Betweenness, read the refusal, click Run sampled. That part is
> better than anything I use -- a notebook would have just sat there for three hours with no warning,
> and Neo4j Browser would have hung the tab.
>
> What made it a 4: 'groups' appears nowhere, so I had to supply the method myself; the measure
> quietly drops direction on a directed graph; the sample size shows up only after I have already run;
> the seed is not recorded; and I never saw my actual answer on this graph.
>
> Would I use it instead of my current tool? No, not instead. For this question I would open a
> notebook, run networkx betweenness with k=500 and a fixed seed, directed, and know exactly what I
> computed. I would use graphty before that, as the first look: it told me up front what is
> expensive, which is worth something. If it offered a directed option, showed the sample size before
> Run, kept the seed, and let me draw the top-ranked bridges with their neighbours, I would use it
> for the first pass and export the ranking. Right now it is a well-behaved estimate I cannot fully
> defend."

---

## Problems observed

1. **The task word is not in the tool.** The catalog lists centralities by name only; nothing maps
   "who bridges the groups" to betweenness or offers a bridging measure over a partition. Severity 3.
2. **Direction silently dropped.** The refusal says "Undirected" on a graph the Statistics panel calls
   directed, with no reason and no option. Severity 3.
3. **Sample size appears only after the run starts.** "About 100 fits the budget" is shown once the
   50-source run is already going, forcing a re-run. Severity 3.
4. **No finished result on this graph.** The Top nodes row stays collapsed; she never sees the
   answer or whether it is labelled as an estimate on export. Severity 2.
5. **Seed shown as "random" with an unexplained "proposed" tag.** Reproducibility is unclear, and the
   tag reads as noise. Severity 2.
6. **Hard 30-second cap on the sampled route.** 500 sources is refused even though the reader chose a
   few minutes knowingly. Severity 2.
7. **No path from a result to a drawing.** The offered drawing sample is by degree ("favors hubs"),
   which is the wrong sample for bridges; nothing offers "draw the top-ranked by this result".
   Severity 3.
8. **Vague cost words.** "hours" and "over a day" without a number. Severity 1.
9. **Truncated route name.** "Exact on Drug patent..." cannot be read without hovering. Severity 1.
10. **Inconsistent labels between screens.** "Connected components" versus "Weakly connected
    components", "Patent citations" versus "Citations 1999 to 2001". Severity 1.

## What worked

- The cost is shown on the catalog row before the click, and the refusal arrives instead of a hang.
- The refusal lists the ways forward cheapest first, with an error code she can put in a ticket.
- The refused result stays in the list next to the sampled one.
- An out-of-range sample size is refused in the field without discarding the previous result.
- The "not drawn" line and the "favors hubs, so density reads high" caption are honest about what the
  screen does and does not describe.
- The betweenness colour ramp is a single hue, readable with red-green colour weakness.
