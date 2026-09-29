# Session: who matters most, and how sure -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional composite), associate professor of computational social science; Gephi since 0.8, NetworkX for anything reproducible.
**Task as given by the moderator:** "Your manager wants the people who matter most in this network, and how sure you are."
**Screens used, in order:** the results panel with nothing run yet, the frame at rest (the graph panel), the results panel with Betweenness finished, the Nodes table sorted by betweenness, the inspector on TP53. All at 1440 x 900, the study view (design notes hidden).
**Dataset on screen:** Human protein interactions, 300 proteins, 1,262 interactions (ppi-core-300.graphml).

## Transcript (thinking aloud)

**Before touching anything.** "People who matter most." It's a protein network, so "people" is proteins, fine. My manager -- I don't have a manager, I have a chair, but I know the question. "Who matters" in a methods section is centrality, and nobody who has reviewed a paper accepts one centrality on its own. I'll do betweenness and degree, maybe PageRank, and "how sure" is: do they agree, and is the number exact. That's my plan. In Gephi this is the Statistics tab on the right, Network Diameter for betweenness, Average Degree, PageRank, then Data Laboratory, sort the column. Five minutes.

**Results panel, nothing run.** Left side has "In this project: Connected components 3" and a "Catalog" with Centrality, Community, Path, Structure... OK, so this is my Statistics panel, except it lives on the left. There's a black dropdown open over the list -- Family, Source, "graphty-element 25". I didn't open that. Whatever, it's covering the right edge of the catalog. I can see "Closeness -- WF-corre..." cut off and "Eigenvector" with a yellow warning, "3 compon...". The text is small. I'm leaning in. Eigenvector warns about 3 components -- good, that's correct, eigenvector on a disconnected graph is a trap, and Gephi just runs it.

Right panel says "Statistics" and I get excited for a second because that's where Gephi's are, but it's only counts: 300 nodes, 1,262 edges, 3 components, average degree 8.41. Let me check the counts. 300 and 1,262 -- that's what the file should have. Fine. Then: "Edges: undirected, no weight."

Hold on. I'm going to flip to the Graph view, because I want the Data Lab and the attributes.

**Frame at rest (Graph view).** Coloured by "Module color" -- Ribosome, Proteasome, Complex I, and so on, with counts in the legend. Nice, that's a partition legend on the canvas, I'd kill for that in Preview. Right panel, Statistics: "Edges 1,262, undirected, weight: confidence." Density 0.0281. "Connected components 3 (2 isolates)."

So which is it? The Results side says "no weight", the Graph side says "weight: confidence". Same graph, same session. That's two panels disagreeing about the one thing that changes every path-based number. In Gephi I at least know it reads the Weight column whether I like it or not. Here I have to find out which panel is lying. I make a note: first strike.

Also, "3 components (2 isolates)". I remember that because it matters for betweenness normalization.

**Back to Results; I click Betweenness in the catalog. Finished state.** It ran -- or rather the prototype shows it finished. And the whole canvas turned orange. My module colours are gone. I didn't ask for that. There's an eye icon next to "Betweenness color" in the editor, so I assume I can switch it off, and I'd press Ctrl+Z to check whether undo brings the partition back. I don't like paint that happens to me. In Gephi nothing gets recoloured until I press Apply, and I've built a decade of habit on that.

Now the part I actually read. Top of the editor: "on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected. WebGPU. Details."

That line is good. Honestly. "On full graph, 300 nodes" is the sentence Gephi never gives me -- in Gephi the statistic runs on whatever the filter left visible and the column doesn't tell you. I'd put that line in my handout. The (i) popover on "Exact" says "Computed on every node, not estimated. It does not say the ranking is meaningful." Fine, a bit preachy, but correct.

"Unweighted." So betweenness ignored confidence. That's actually the right call -- confidence is a strength, not a distance, and feeding it into shortest paths as a length would be wrong. But the tool doesn't say WHY it's unweighted. The Weight dropdown says "None declared". None declared? The Graph panel just declared "weight: confidence". So either the file declared it or it didn't. I'd want: "confidence exists; not used, because betweenness reads weight as distance." Without that I'm guessing it did the right thing by accident.

I click "Details" -- I want the normalization and whether it's NetworkX's convention, because 0.1379 means nothing to me until I know what it's divided by. Nothing happens on this screen. (Moderator: that would open the run record; it isn't drawn for this run.) OK. So I cannot yet check 0.1379 against `nx.betweenness_centrality(G, normalized=True)`. With 3 components, the normalization question is live: divided by (n-1)(n-2)/2 with n = 300, or per component? I'd run it in NetworkX in a notebook next to it and if it doesn't match, that's the end of it. On this screen I can't tell.

Distribution: a histogram, "bar height: square root of the count" in type I can barely read. Most proteins near zero, a few out at the right. That's the shape I'd expect in a PPI network. "middle 0.0038, highest 0.138, zero 10 nodes, all 291=". It took me a second: 291= means the ten zeros all share rank 291. Fine, ties share a rank. That's how I'd do it.

Top nodes: MAPK1 0.1379, TP53 0.1139, YWHAZ 0.0695, CDK1 0.0687, then I have to scroll. Scrolled: AKT1 0.0642. Then a sentence: "No near-ties in the top 5: the closest, ranks 3 and 4, differ by 1.2%."

This is where I disagree with the tool. It's trying to answer "how sure", and its answer is that 1.2% is not a near-tie. On a protein interaction network where a good share of the edges are false positives, 1.2% between YWHAZ and CDK1 is nothing. Remove three edges and they swap. "How sure" for my manager is not numerical precision -- the computation is exact, I believe that -- it's whether the ranking survives the data being a bit wrong, and whether other measures agree. This sentence sounds like confidence and it isn't.

**"295 more in the table" -- the Nodes table.** It opens a table docked under the canvas, sorted by betweenness. This is my Data Laboratory. Good. It's in the same window, which is more than Gephi does. Columns: id, module ("from the file"), degree ("1 to 34"), betweenness ("exact, full graph"), betweenness rank ("of 300, ties share"), PageRank, PageRank rank. And PageRank is here already -- I didn't run PageRank, but it's in the project list, so someone did. Fine, I'll take it.

The headers carrying "exact, full graph" is exactly what I want. If I export this CSV and it keeps those headers, the column will still say what it was computed on six months from now. That's a real thing Gephi does not do.

Now reading across. MAPK1 #1 on both, TP53 #2 on both, YWHAZ #3 on both, CDK1 #4 on both, AKT1 #5 on both. Then it wobbles: UBC is #6 by betweenness, #10 by PageRank; MYC #9 and #7. So the answer to my manager writes itself: MAPK1 and TP53 clearly, then YWHAZ, CDK1, AKT1 as a group of three, don't read an order into them; after that, the next five depend on which measure you pick.

And then I check degree. Header says "degree 1 to 34". But the Graph panel said 2 isolates. An isolate has degree 0. So either the header is wrong or the isolate count is wrong. Second strike. This is the kind of thing that makes me stop trusting the whole table. Small, but it's a number, and numbers are the one thing I read.

Also the module column says "Unassigned" for YWHAZ, AKT1, UBC, UBB, EP300... and the canvas legend calls the same thing "Other". Two words for one thing. I'd translate it myself, but I'd mark it down.

PageRank "exact, full graph" -- PageRank is iterative, what's exact about it? What damping, what tolerance? The header doesn't say, and the editor for PageRank isn't open. I'd go look; I'm not going to call that a strike on this screen.

**Inspector on TP53.** I click TP53 on the canvas. Right panel: TP53, module DNA repair, degree 32 "#2 of 300", betweenness 0.1139 "#2 of 300", pagerank 0.01137 "#2 of 300". Matches the table. Good. "32 neighbors". Hovering Neighbors says "Filter to neighbors, 1 hop: 33 nodes. Ctrl+Z undoes it." 33 is 32 plus TP53 itself, I get it, but for one second I thought it was another mismatch. And "Ctrl+Z undoes it" -- if undo really covers filters, and appearance, that alone gets a second session from me.

But here the inspector says "betweenness 0.1139" without "exact, full graph". The table carried the scope, the inspector drops it. If I had a filter on, would the inspector's number be the filtered one? I can't tell from here. That's precisely the Gephi problem I was hoping this tool fixed; it's fixed in the table and the result editor, not in the inspector. And "pagerank" is lowercase here and "PageRank" in the table. Pick one.

**My answer to the moderator.** "MAPK1 and TP53 are the two that matter, by betweenness and PageRank both, and degree agrees. YWHAZ, CDK1 and AKT1 are the next tier, but I would not order them. How sure: the numbers are exact on the full 300 nodes, unweighted, so I'm sure of the computation -- assuming the normalization matches NetworkX, which I couldn't check here. I'm not sure of the order below the top two, because the data is a PPI network and 1% differences don't survive noisy edges." That's the answer I'd give. I got there, but I got there by reading across the table myself, not because the tool told me how sure to be.

## After the task

**Single Ease Question (1-7):** 5. Finding the statistic and the table was easy. What cost me was two panels disagreeing -- weight and degree -- and a "Details" I couldn't open.

**Would she use this instead of Gephi?** "Not for a paper yet. The 'on: full graph, 300 nodes, exact' line and the table headers that keep the scope are better than anything Gephi has, and I'd show them to my students tomorrow. But this screen told me 'no weight' and 'weight: confidence' about the same graph, and 'degree 1 to 34' next to two isolates. I can't publish from a tool that disagrees with itself before I've even checked it against NetworkX. Fix the numbers, let me open the run record and see the normalization, and I'll run my own retweet network through it. Until then, I'd stay on Gephi."

## Problems observed

1. **Weight contradicts itself across panels (severity 3).** Graph view statistics: "undirected, weight: confidence". Results view statistics: "undirected, no weight". Betweenness Weight field: "None declared". She could not tell whether the file declares a weight, and the tool did not say why betweenness left confidence out.
2. **Degree range contradicts the isolate count (severity 3).** The Nodes table's degree header says "1 to 34" while the graph statistics say "3 (2 isolates)"; isolates have degree 0.
3. **"Details" does nothing in the finished state (severity 2).** She wanted the normalization to check 0.1379 against NetworkX, especially with 3 components.
4. **"How sure" answered as numeric precision (severity 2).** "No near-ties in the top 5... differ by 1.2%" reads as reassurance; she judged 1.2% well inside noise for a PPI network and built her confidence from measure agreement in the table instead.
5. **Run repainted the module partition unasked (severity 2).** The finished state painted every node orange, replacing the module colours; she wants to see that undo restores them.
6. **Inspector drops the scope (severity 2).** "betweenness 0.1139, #2 of 300" without "exact, full graph"; she could not tell if a filter would change what the inspector shows.
7. **Small and inconsistent labels (severity 1).** 9px captions ("bar height: square root of the count"); "Unassigned" in the table vs "Other" in the legend; "pagerank" vs "PageRank"; a Family/Source filter menu open over the catalog on first view, hiding the cost column.

## What she liked

- The scope line "on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected." -- the thing Gephi never says.
- Table headers that carry the method and scope ("exact, full graph", "of 300, ties share"), and ranks that share on ties ("291=").
- Two measures' ranks side by side in one sorted table, so agreement is read across a row.
- The eigenvector warning about 3 components before running it.
- A partition legend with counts drawn on the canvas.
