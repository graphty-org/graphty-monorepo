# Can these rankings be trusted? -- Expert Emma, network scientist

**Task as given by the moderator:** "Something about these rankings bothers a reviewer. Find out
whether the numbers can be trusted." The dataset is Les Miserables (77 characters, edges weighted
by how many chapters two characters share). The seeded problem is a weight that means "stronger
tie" being read as a path length.

**Screens used:** the Results panel mock (starting at its first state, then "Results after a
filter", the only Les Miserables state, then "Out of date" and "A finished Louvain result") and
the load step mock (first state, "GraphML", "Repeated pairs", "Import report"). Renders read in
the study view, as a participant sees them.

**Outcome:** partly done. She established what the Les Miserables betweenness numbers ARE
(unweighted, exact, on a 60-node subgraph after a degree filter) and why they disagree with the
networkx values she knows. She could NOT establish from the screens whether the file's
co-appearance weight was loaded, dropped or ignored, so she could not answer the reviewer's
actual worry for this dataset. She found the "similarity read as distance" handling only on a
different dataset (the protein file), and it contained a statement she thinks is wrong.

---

## Transcript (thinking aloud)

**1. First screen of the Results panel.**

> "OK, this opens on patent citations, PageRank running on WebGPU. Not my dataset. Fine, I will
> read it anyway for what the tool shows me about a run. 'on: full graph, 124,318 nodes. Exact.
> Directed. Values shown: run 1, damping 0.85.' Good -- that is the sentence I want under every
> number. Weight: 'None declared'. Right, citations have no weight, that is correct.
>
> The row at the top of the page lists states. I need Les Miserables. I am scanning... 'Results
> after a filter'. That is the only one that could be it. Clicking."

**2. "Results after a filter" -- Les Miserables, Betweenness finished.**

> "Les Miserables, 'Filtered: 60 of 77 nodes, 1 step'. Hm. Right away that is a flag. Top five by
> betweenness: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073.
>
> I know this graph. Everybody knows this graph. networkx, unweighted, normalized, full graph:
> Valjean about 0.57, then Myriel about 0.18, then Gavroche about 0.165. Myriel is gone from the
> top five entirely. So either somebody used the weights as distances -- which is exactly what
> the reviewer is worried about -- or the graph is not the graph.
>
> Let me see what it says it ran. State line: 'on: filtered graph, 60 nodes, 1 component. Exact.
> Unweighted, undirected. WebGPU.' Unweighted. So it is not the weight trap, at least not here.
> There is a 'Details' link. Clicking."

**3. The run record popover.**

> "Method: Brandes, exact, every node is a source. Seed: none, nothing sampled. Normalization:
> divided by (n-1)(n-2)/2 = 1,711 node pairs, n = 60, the filtered graph. Weight conversion:
> None, unweighted. Scope: filtered graph, 60 of 77, after 'Filter to degree >= 2'. Engine WebGPU.
>
> Good. Honestly, good. That is more than Gephi has ever told me. And it explains Myriel: Myriel
> is the bishop with nine or ten one-scene characters hanging off him -- Napoleon, the Countess,
> Cravatte and so on. Degree one, every one of them. You filter to degree >= 2 and his leaves
> vanish, and every shortest path that ran through him to them vanishes with them. Valjean loses
> his leaves too, hence 0.419 instead of 0.57. And the normalization is over 60, not 77, so the
> numbers are not comparable with the paper's table anyway.
>
> So the numbers are correct for what was computed. What was computed is not what the reviewer
> thinks it is. The fix is to run it on the full graph. The Scope drop-down is right there; I
> assume Full graph is in it. I cannot open it in the mock, but OK.
>
> 'No near-ties in the top 5: the closest, ranks 2 and 3, differ by 4.7%.' Fine, useful.
> 'zero: 32 nodes, all 29=' -- tied rank shown as 29=. Correct convention. I approve."

**4. Where is the weight? (the part that actually bothers me)**

> "But the reviewer's question was about the weight, and I now have a different problem. Les
> Miserables ships with a 'value' on every edge -- the co-appearance count. The panel on the
> right says 'Edges: undirected, no weight'. The Weight field says 'None declared', in grey.
>
> Does 'no weight' mean the file had none? That the import dropped it? That it is there but
> nobody gave it a role? These are three very different answers. The first is false for this
> dataset, the second is a bug, the third is fine. I want to see the edge attributes. There is
> '4 more' under Statistics. Clicking... nothing opens. The Weight drop-down... nothing opens
> either, so I cannot see whether 'value' is even offered as a choice.
>
> I have lost attributes in a GEXF round trip before. This is precisely where I check column
> counts, and I cannot see the columns."

**5. Going to the load step to find out how the file came in.**

> "OK, the import is where a weight gets its role. Opening the load step mock. First screen is a
> CSV of card transactions: 'amount' read as Currency (USD), role Weight. GraphML state: a
> protein file, 'confidence' read as Number, role None. Nowhere is Les Miserables. I cannot see
> how 'value' was read on the file I care about.
>
> What I can see is the pattern: the load step asks for the role -- Weight or None -- and does
> NOT ask what a higher number means. On the import report for the protein file: 'Roles:
> confidence: weight. What a higher confidence means is asked by the first run that reads it.'
>
> I understand why. I do not love it. For Les Miserables that means: if someone gives 'value'
> the Weight role, nothing says 'this is a similarity' until the first weighted algorithm asks.
> And if the first weighted algorithm was run by a junior who clicks through the question, the
> answer is fixed from then on. I want it written on the attribute at import time, where I can
> see it, and next to the column on the Statistics panel."

**6. Looking for the "similarity used as distance" handling anywhere.**

> "Let me look at the other states for how a weighted run reports itself. 'A finished Louvain
> result', protein file: 'Weight: confidence, higher = stronger link (your answer)'. Run record:
> 'Weight conversion: confidence used as given, 0.40 to 0.99; higher = stronger link'. Good.
> That is the line I would want on Les Miserables. It is not there because that run was
> unweighted.
>
> 'Out of date': 'Louvain used confidence as a distance. Your answer is now higher = stronger
> link. Re-run to update.' And Statistics now says 'undirected, similarity weight'. So the tool
> does know the difference and does flag runs that used the old reading. The Review out of date
> list says Betweenness and Closeness read no weight, so they stay current. That is exactly the
> audit I want, and it is the thing that would have answered my reviewer.
>
> But -- 'Louvain used confidence as a distance'? Louvain does not use distances. Modularity uses
> edge weight as strength; there is no path length anywhere in it. Either the tool inverted the
> weights before handing them to Louvain, which would be a real bug and I would want to know how
> (1/w? 1 - w?), or the message is just wrong. Shortest path, yes, that reads a distance. Louvain,
> no. If I showed this screen to a student it would teach them the wrong thing."

**7. Conclusion, as I would write it back to the reviewer.**

> "The Les Miserables betweenness values are exact and unweighted, but computed on a 60-node
> subgraph after a degree >= 2 filter, normalized over 60 nodes. That is why Myriel drops out
> and Valjean reads 0.419, not 0.57. Re-run on the full graph before publishing. Whether the
> co-appearance weight was even loaded, I cannot tell you from this screen. It says 'no weight',
> which for this dataset is either an import loss or an unassigned role, and the tool does not
> let me see which."

---

## Single Ease Question

**4 out of 7.** "The run record is excellent -- that is what got me to the answer about the
filter. The weight half I could not finish. I spent most of my time trying to find out whether a
column exists."

## Would she use this instead of her current tool?

> "Not instead of the notebook. But the run record -- method, normalization with the actual n,
> weight conversion, scope with the filter step that made it -- is better than anything Gephi
> gives me, and the out-of-date list is something I have wanted for years. If the Statistics
> panel showed me the edge attributes and how each is being read, and if the out-of-date message
> stopped telling people Louvain uses distances, I would hand this to a client's analyst and let
> them check a reviewer comment without me. Right now I would still open the notebook to confirm
> the weight column was not dropped."

---

## Problems found

1. **"No weight" does not distinguish "file had none" from "loaded but no role" from "dropped".**
   Les Miserables has a co-appearance value on every edge; Statistics says "undirected, no
   weight" and the Weight field says "None declared". The participant could not tell which, and
   this was the question she was asked. Severity 3.
2. **"4 more" and the Weight drop-down reveal nothing.** The only way to see the edge columns and
   whether "value" is offered as a weight is closed. Severity 3.
3. **The meaning of a weight (stronger tie vs longer path) is not asked or shown at import.** The
   load step asks only the role; the meaning waits for the first weighted run. She wants it
   visible on the attribute from the start. Severity 2.
4. **"Louvain used confidence as a distance" is technically wrong or hides a conversion.**
   Modularity reads weight as strength; the message either misdescribes Louvain or reveals an
   undocumented inversion. Severity 3.
5. **A filtered-scope result carries no warning that the values are not comparable with the
   published full-graph values.** The record says so precisely; the ranking itself does not.
   She caught it only because she knows the reference numbers. Severity 2.
6. **No Les Miserables load step exists to trace how "value" was read.** She could not follow the
   file from import to result. Severity 2.

## What worked

- The run record: method, seed, normalization with the concrete n and pair count, weight
  conversion, scope with the filter step that produced it.
- The state line "Exact. Unweighted, undirected." under the run, readable without opening
  anything.
- Tied ranks written as "29=", and the near-tie sentence under the top five.
- The out-of-date review that says which runs read the weight and which did not.
