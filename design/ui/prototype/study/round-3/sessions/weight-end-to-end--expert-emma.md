# Session: one weight column, a cheapest route and a centrality -- Expert Emma

**Participant:** Expert Emma, network scientist, lives in notebooks (networkx, igraph, graph-tool),
uses Gephi for the final figure. See ../../personas/expert-emma.md.

**Task, as the moderator gave it:** "Your edges have an amount column. Find the cheapest route
between two accounts and who is most central, and say what each result used."

**Screens, in order:** the recipe binding step (screens/binding-step.html), the measure options
form with cost (screens/option-form-cost.html, the weight refusal and the weight question), and
the Results panel (screens/results-panel.html: finished, a finished Louvain with its run record,
out of date).

**Renders she saw:** shots/screens__binding-step.png, shots/record/screens__binding-step--study.png,
shots/option-form-cost-weight-refused.png, shots/option-form-cost-weight-meaning.png,
shots/screens__results-panel--finished.png, shots/record/screens__results-panel-louvain--study.png,
shots/screens__results-panel--outofdate.png.

**A note on the data.** None of the three mocks shows an accounts network or an amount column.
Every state is the 300-protein interaction network with a confidence column (and, in two states,
the patent citation graph). The participant was told to treat "confidence" as her amount column
and carried on; her comments about that substitution are kept below, because they are part of what
she would say.

---

## Think-aloud transcript

**Reading the task.** Amount on the edges. "Cheapest route" means amount is a cost, so shortest
path with amount as the edge length -- Dijkstra, amounts are non-negative, fine. "Most central" is
not a question, it is three questions. I'll assume betweenness, because if I'm computing weighted
paths anyway, betweenness over the same lengths is the consistent choice. And I want it directed:
money goes from one account to another. If this thing symmetrises my transfers without telling me,
we're done.

**First screen: the binding step.** (screens__binding-step.png.) "Apply a recipe: what matched,
before anything changes." A recipe? Genes? qPCR table? I didn't ask for a recipe. This is somebody
else's saved analysis being mapped onto a protein network. Nothing here is about accounts or about
running a path. I don't know why I'm starting here.

I scroll. Okay, there is one thing I recognise: a row "Weight -- confidence -- 10 communities --
Communities run", and under it "For confidence, a higher number means... a closer or stronger
link". And in the inset lower down, the select open: "a closer or stronger link (similarity)", "a
longer or costlier step (distance)", "more can pass through (capacity)", "Don't use confidence".

That is actually the right question. That is exactly the question networkx never asks you -- it
just takes `weight="amount"` and treats it as a length for paths and as a strength for eigenvector,
and you find out when a number looks odd. Here it's asked once, on the column. "Every measure and
the Path tool read this one answer." Good. For me, amount would be "a longer or costlier step".
Distance. Fine.

Though -- I pause on this -- for a fraud case, a bigger transfer is also a *stronger* tie. If I
said "distance" for the route, and then ran eigenvector or PageRank, would it now treat big
transfers as weak links? It says every measure reads the same answer. That is consistent, but it
is not always what I want. In igraph I'd pass `1/amount` to one and `amount` to the other,
deliberately. I'll park it.

What I'd do next here: nothing. This screen is for applying a recipe. Close it.

**Second screen: the measure options, refused.** (option-form-cost-weight-refused.png.) Now this is
more like it. Betweenness editor open. Right panel: nodes 300, edges 1,262, direction undirected,
"weight: confidence: numbers, not used". I like that line. It tells me the column exists and that
nothing is using it. That is a sentence I would put in a methods section.

The editor: "Can't weight paths by confidence: confidence isn't set up as a length yet.
Betweenness counts shortest paths. Until you say what a higher confidence means, no measure uses
it, PageRank included." Weight by: confidence, with a warning mark. Button at the top: "Set up
confidence".

Good: it refused instead of quietly running unweighted. That is the Gephi thing I check for every
time, and here it can't happen. Mildly annoying: it says "length" in the error, "distance" and
"costlier step" in the question, and the stats line says "numbers, not used". Three words for the
same concept on one screen. I know they're the same. A junior would not.

Direction: "undirected, as the graph". It's a text, not a control. My transfers are directed. On
this protein network undirected is correct, but I can't tell from here whether I could run
directed betweenness on a directed graph, or whether "as the graph" means it'd follow the file. I
assume it follows the file. I'd check.

I click "Set up confidence".

**Third screen: the weight question.** (option-form-cost-weight-meaning.png.) Radios inline, under
Weight by: "For confidence, a higher number means... Examples: 0.99, 0.79, 0.40." Examples from my
own column -- nice, that is how I'd sanity-check that it picked the right column. I'd pick "a
longer or costlier step (distance)". "Nothing runs until you answer. The answer is kept on
confidence: every measure and the Path tool read it."

So after this, Run. That's the centrality half. What the result used should then be in the state
line.

**Fourth screen: finished.** (screens__results-panel--finished.png.) Betweenness done. State line:
"on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected. WebGPU. Details". This one
ran unweighted -- it's the default state, not mine -- but the line is the thing I'd want: scope,
exact or sampled, weighting, direction, engine. That is the answer to "what did it use" in one
line. Top nodes list is cut off at the bottom of the panel; I see "1. MAPK1" and then it scrolls.
Distribution with "middle 0.0038, highest 0.138". What normalization is that 0.138? It doesn't say
here. Presumably Details.

**Fifth screen: the run record.** (screens__results-panel-louvain--study.png.) This is Louvain, not
betweenness, but it shows me what Details opens. "Run record: Method, Seed, Damping (Does not
apply), Normalization, Weight conversion: confidence used as given, 0.40 to 0.99; higher = stronger
link (your answer...), Numbering, Engine." And a Copy button.

Okay. This is the page I'd screenshot for the paper appendix. Seed shown, normalization written
out, "Does not apply" rather than blank. Weight conversion says the range it read. For my case I'd
want it to say how a distance weight was used by betweenness -- as given, or inverted, or what. The
patent state apparently shows "Normalization: divided by (n-1)(n-2)/2" for betweenness, which is
networkx's undirected convention. I'd check that against networkx before trusting it, but at least
it's written down.

**Now the cheapest route.** This is where I'm stuck. There is "Shortest path" in the Catalog
under Path. There is no mock of what happens when I click it. How do I pick the two accounts? Click
two nodes? Type ids? Is there a source and target field? Does it give me the total amount along the
route, the hops, the edge list? Is it "cheapest" by sum of amounts? I can't tell, because there is
no screen for it.

The only trace of a path anywhere is in the out-of-date state.

**Sixth screen: out of date.** (screens__results-panel--outofdate.png.) "Needs action 2: Louvain,
Shortest path TP53 to SMAD3 -- Out of date, Re-run." Popover: "confidence is now read as a
similarity; these read it as a distance. Betweenness and Closeness read no weight, so they stay
current." And the dashed route drawn on the canvas.

So a path result exists, it has a name with its two endpoints, and it records which weight meaning
it read. That's actually the answer to "say what each result used" for the path -- by inference:
it used confidence as a distance. And it tells me when that answer changed under it. I like that
very much; that's the non-reproducibility trap caught for me. But I only know what the path used
because something went stale. I never saw the path's own state line or its total cost.

**Answering the moderator.** "Centrality: betweenness, exact, on the full graph, undirected, and
either unweighted or weighted by the column read as a distance -- the state line says which, and
Details has the normalization and seed. Cheapest route: I'm guessing. There's a Shortest path
result from TP53 to SMAD3 that read confidence as a distance; I didn't see how to create it, and I
don't know the total cost of the route. On the accounts version I'd do this in the notebook."

---

## Single Ease Question

**3 of 7.** The centrality half and the "what did it use" half were a 5 -- the state line, the
refusal, the column-level answer and the run record are all things I'd want. The route half was a
1: there is nothing to do it with. And I spent the first screen in a recipe dialog about genes.

## Would she use this instead of her current tool?

"Not instead of the notebook. For the analysis, no -- I'd run `nx.dijkstra_path(G, a, b,
weight='amount')` and betweenness in two lines and be done. But the weight question is better than
what my notebook does: networkx lets me forget that amount means cost in one call and strength in
the next, and this doesn't. If I could hand this to a fraud investigator with the column already
declared, and the route showed its total amount and every hop, and the run record copied cleanly,
I'd use it for the hand-off. Right now I can't see the route part at all, so I can't say."

---

## Problems

1. **No shortest-path screen.** Nothing shows how to choose two nodes, what the path result shows
   (total cost, hops, edge list), or its state line. "What did the route use" could only be
   inferred from the out-of-date message. Severity 3.
2. **The first screen is off-task.** The binding step is about applying a recipe to genes; it
   contains the weight question but gives no way into a path or a measure. Severity 2.
3. **No accounts or amount data.** Every state is the protein network with confidence; a money
   column (large range, skewed, directed transfers) would test the question much harder than
   0.40 to 0.99. Severity 2.
4. **One meaning for every measure.** Declaring amount a distance means every measure reads it as
   a distance. For centrality on transfer networks she sometimes wants the strength reading.
   Nothing on screen says what a strength-based measure (PageRank, eigenvector) does with a
   distance answer. Severity 2.
5. **Three words for one idea.** "length" (refusal), "distance" / "longer or costlier step"
   (question), "numbers, not used" (statistics). Severity 2.
6. **Direction is a read-only line.** "undirected, as the graph" is text in the refused form; she
   cannot tell whether a directed run is available on a directed graph. Severity 2.
7. **Label drift on the weight field.** "Weight by" in one state, "Weight: None declared" in
   another. Severity 1.
8. **Normalization not beside the value.** The distribution shows 0.138 with no normalization
   note; it is only under Details. Severity 1.

## What worked for her

- The refusal instead of a silently unweighted run.
- "weight: confidence: numbers, not used" in Statistics.
- The meaning asked once on the column, with examples from her own data.
- The one-line state line (scope, exact, weighted or not, direction, engine).
- The run record with seed, normalization, weight conversion, "Does not apply" and Copy.
- The out-of-date list naming what each result used and what changed.
