# Session: can these Les Miserables rankings be trusted? -- Expert Emma

Participant: Expert Emma, a network scientist who ranks entities for papers and client decks, lives in networkx and igraph, and checks every tool's weight handling.
Task as given: "Something about these rankings bothers a reviewer. Find out whether the numbers can be trusted." The planted problem: a similarity (Les Miserables co-appearance counts) read as a distance.
Screens: the Results panel (state 14, "Results after a filter", Les Miserables), with the protein Louvain and out-of-date states for comparison; the load step (clean and GraphML states).
Reference: networkx 3.1, `les_miserables_graph()`, run in her own notebook beside the mock.

## Think-aloud

**1. What am I looking at.** "Les Miserables. Fine, I know this one by heart: 77 characters, 254 edges, one component, and the edge value is how many chapters two characters share. That is a similarity. More chapters together means a closer tie. So the reviewer's worry writes itself: somebody fed the counts into shortest paths as lengths, and the most connected pairs became the *farthest* apart. That is exactly what `nx.betweenness_centrality(G, weight='weight')` does if you are not careful. Let us see whether this tool did it."

**2. The ranking.** "Top nodes: Valjean 0.547, Gavroche 0.163, Myriel 0.151, Marius 0.131, Fantine 0.127. Valjean first, as always. Nothing screams yet. Now the line under the title: 'on: filtered graph, 76 nodes, 1 component. Exact. Unweighted, undirected. WebGPU.' Unweighted. It says so in the first two lines, before I asked. Good. Weight field: 'None declared'. So as far as this screen tells me, the counts were not used at all, not as a similarity and not as a distance."

**3. Details.** "Click Details. Run record: Brandes betweenness, exact, every node a source. Seed: none, nothing sampled. Normalization: divided by (n-1)(n-2)/2 = 2,775 node pairs, n = 76, the filtered graph. Weight conversion: 'None: unweighted'. That is the row I would have hunted for in the source. It is here, in plain words, with the formula. Fine. That is good." (Short pause.) "Copy button, too. I would paste that into the methods section."

**4. So is it the similarity-as-distance problem?** "No. Not on this run. It is the other problem: the file *has* a co-appearance count and the run ignored it. Statistics on the right says 'Edges: undirected, no weight'. It does not say 'there is a numeric edge attribute called value that nobody gave a role'. If the reviewer says 'you ignored the weights', this screen does not warn me I did. I have to know the dataset. A student would not."

**5. Check against my notebook.** "Unweighted betweenness in networkx on the full 77 nodes: Valjean 0.570, Myriel 0.177, Gavroche 0.165, Marius 0.132, Fantine 0.130. Here Myriel is third at 0.151 and Valjean is 0.547. That is not the same ranking. Before I call it wrong, normalization: they divide by 2,775 because n is 76, networkx divides by 2,850. Undo that for Valjean: 0.570 x 2,850 is about 1,624 raw; over 2,775 that is 0.585, not 0.547. So it is not just the denominator. The graph is different."

**6. Why is the graph different.** "The chip at the top: 'Filtered: 76 of 77 nodes, 1 step'. The record says 'after Filter to Largest component'. Largest component of Les Miserables? It is connected. There is nothing to drop. So either this is not the Knuth file I know, or something split it. 'Connected components 1' in the list, with a filter funnel next to it, and 'components 1' with a funnel in Statistics. Both after the filter. Where is the count *before* the filter? I would guess this copy has an isolated node, and maybe other edits, and I cannot see which one got dropped or what else differs. If the file is different, the numbers are probably right for that file. I cannot prove it from here."

**7. Would it have caught the trap if the weight had a role?** "Let me look at what happens with a weight. The protein Louvain: Weight field 'confidence as similarity', record says 'used as given, 0.40 to 0.99; bigger is a closer tie'. That is the sentence I want. And the out-of-date list: 'Louvain used confidence as a distance. It is now a similarity. Re-run to update.' So the tool tracks the meaning and flags old runs. Good. But Louvain does not need a conversion. Betweenness does: 1/w, -log w, max minus w, they give different answers. On my notebook 1/w puts Marius second at 0.499; using the raw count as a length puts Javert third. Nowhere in these screens can I see a path-based run with a similarity weight and its conversion written down. That is the case the reviewer is asking about, and I only have your word that it would say it."

**8. The load step.** "Opening the file: roles start at None, and the note says nothing is guessed from a column name. Good; that is why the run is unweighted and not silently wrong. Setting the role to Weight asks nothing more at load. The meaning comes at the first run. Fine, if that question is really there. I did not see it."

**9. Small things.** "Distribution: 'zero 46 nodes, all 31=' -- what is 'all 31='? A truncated label, I assume. And 'middle 0.000' with 46 zeros out of 76, fine, the median is zero, but say 'median'. 'Middle' makes me wonder if it is the midrange."

**Answer to the moderator.** "The numbers are honest about what they are: exact, unweighted, undirected Brandes betweenness on a 76-node filtered graph, normalized by 2,775 pairs. They did not treat the co-appearance count as a distance; they did not use it at all. Whether that is acceptable is the reviewer's question, and the screen should have told me an unused weight column was sitting there. They do not match networkx on the standard Les Miserables, and I think it is because this file differs and a node was filtered out, but I cannot see the pre-filter statistics or which node went, so I cannot close that out without opening the file myself."

## Single Ease Question

4 of 7. Finding what the run did was easy; the record is the best part. Deciding whether to trust the ranking was not, because the difference from networkx has no visible explanation and the case the reviewer cares about is not on screen.

## Would she use it instead of her current tool?

"For the ranking itself, no. I will compute it in the notebook, because I can see the graph I computed on. For handing the view to someone and having the method written next to the number, maybe. That run record is better than anything Gephi shows me. Show me the unused weight column and the whole-graph counts next to the filtered ones and I would stop checking every number twice. Probably."

## Problems

1. Results panel, Statistics: a numeric edge attribute (value, the co-appearance count) exists but "no weight" gives no hint of it; an ignored weight is invisible. Severity 3.
2. Results panel, filtered state: after "Filter to Largest component" only filtered counts show; the pre-filter component count and the removed node are not visible, so a mismatch with networkx cannot be explained from the screen. Severity 3.
3. Results panel: no shown state of a path-based measure (betweenness, closeness, shortest path) with a similarity weight and its conversion (1/w, -log w) in the record -- the exact case of the planted problem. Severity 2.
4. Distribution block: "zero 46 nodes, all 31=" is garbled; "middle" is ambiguous for the median. Severity 1.
