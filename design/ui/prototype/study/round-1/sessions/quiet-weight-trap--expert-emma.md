# Session: "Can these rankings be trusted" -- Emma, network scientist

Participant: Emma, network scientist and consultant; lives in Jupyter with networkx and igraph, uses Gephi for final figures (plays on a 14-inch laptop, 1440 x 900).
Task given by the moderator, nothing more: "Something about these rankings bothers a reviewer. Find out whether the numbers can be trusted." The planted problem: an edge weight that measures similarity (higher means more strongly tied) being read as a distance (higher means farther apart), which inverts every path-based ranking.
Screens used, in order: the Results panel (running, finished, editor error, out of date, closeness variant), then the Open a graph step (the GraphML file with its edge attribute, and the CSV file with the weight meaning choice).
Outcome: success with difficulty. She found the likely cause -- the shortest path had been computed reading a confidence score as a distance -- and she established that the betweenness ranking itself ignored the weight. She could not find out HOW a similarity is turned into a distance when a path algorithm reads one, so she could only say which numbers were wrong, not whether the re-run numbers would be right.

## Transcript (think-aloud, lightly trimmed)

**Reading the task.** "A reviewer is bothered by a ranking. Nine times out of ten that is one of three things: the weights were ignored, the weights were used backwards, or the normalization is not the one the reviewer thinks. The moderator said 'similarity used as distance', so I will look for the second one. On Les Miserables the edge weight is the number of scenes two characters share. That is a similarity. If you feed that to Dijkstra as a length, Valjean's strongest ties become his longest edges and betweenness gets handed to the minor characters. Classic. Let me see if this thing lets that happen quietly."

### Results panel, first view (a run in progress)

"Patent citations, 124,318 nodes. Not Les Mis. Fine, I will read whatever graph it gives me. PageRank running on WebGPU, 'under a minute'. The state line says: full graph, exact, directed, damping 0.85. Good, it names the damping. Weight: 'None declared'. Right side, Edges: 'directed, no weight'. OK, so this graph has no weight at all. Nothing to invert here. Next."

"Somebody typed 0.5 into damping and it is held until Run. Fine. That is not my problem today."

### Results panel, finished betweenness (Human protein interactions, 300 nodes)

"Protein interactions. Still not Les Mis. 300 nodes, 1,262 edges, 3 components. Betweenness, finished. State line: 'Exact. Unweighted, undirected. WebGPU.' Weight field: 'None declared'. Right panel: 'Edges undirected, no weight'."

"So in this version of the project there is no weight, and betweenness says unweighted. Then the ranking cannot have the similarity-as-distance problem. MAPK1 0.1379, TP53 0.1139, YWHAZ 0.0695. I cannot check these against networkx from here -- and it does not say normalized how. 0.138 on 300 nodes looks like networkx's default normalization, 2 over (n-1)(n-2), but that is me guessing from the magnitude. There is a 'Details' link after the state line. I click it." (It does nothing in the prototype.) "Nothing. That is where I expected the normalization and the formula. I would have opened the source by now."

"Three components and exact betweenness. Fine for betweenness; it does not care. I will come back to closeness."

### Results panel, editor error (someone typing a weight)

"Here the right panel says 'Edges undirected, similarity weight'. Interesting -- so on this version of the graph, the file does have a weight, and somebody declared it a similarity. And the betweenness state line STILL says 'Exact. Unweighted'. OK, consistent: the weight exists, betweenness was not told to use it."

"Someone typed 'confidnce' into the Weight field and it says 'unknown attribute confidnce; Closest: confidence'. Good, it does not guess. Run is greyed. Good."

"But this is the moment I actually care about. Suppose they fix the typo. Betweenness with weight = confidence, which is declared a similarity. Betweenness is shortest paths. What does it do? Invert it? One over w? Minus log w? Refuse? Warn me? Nothing on this screen tells me. There is no line under the field saying 'confidence is a similarity; paths will use 1/confidence as length', or 'betweenness needs a distance, pick one'. That is the whole trap, and the field that springs it is silent about it."

### Results panel, out of date

"Now we're talking. 'Needs action 2': Louvain and 'Shortest path TP53 to SMAD3', both out of date. I click 'Review out of date'."

"Popover: 'confidence is now read as a similarity; these read it as a distance.' Then Louvain and the shortest path. 'Betweenness and Closeness read no weight, so they stay current.'"

"So here is my answer, or most of it. The shortest path from TP53 to SMAD3 was computed with confidence as a length. That means it went through the LEAST confident interactions -- it found the weakest chain, not the strongest. The path drawn on the canvas, TP53 to MSH2 to SMAD3 via UBB, is wrong in the way the reviewer suspects, and the tool knows it. That is good. That is better than Gephi, which would have said nothing."

"But I have to read that sentence twice. 'These read it as a distance.' Present tense. Louvain does not read anything as a distance. Modularity uses weights as strengths, full stop. Do they mean 'these runs were computed when it was declared a distance'? Then say 'were computed with it as a distance'. As written, I first read it as 'Louvain treats a similarity as a distance', which would be a bug in the algorithm, not a stale result. For a reviewer I need the past tense and the old declaration named."

"And the Louvain one bothers me for a different reason. If confidence was declared a distance when Louvain ran, what did Louvain do with a distance? Invert it? Ignore it? Use it raw as a strength anyway? If it used it raw, the communities are fine and nothing is out of date. If it inverted it, they are wrong. The popover does not say which, so I cannot tell the reviewer whether the old communities were wrong or merely re-labelled."

"'Re-run all' is right there. I would not press it yet. I want to know what the re-run will do with a similarity on a shortest path before I trust the new path either. I look for the conversion... nothing. Re-run is a verb without a formula."

### Results panel, closeness variant

"Closeness, 'WF-corrected'. I hover the variant: 'Wasserman-Faust corrected. Each score is multiplied by the share of the other proteins the node can reach...' Good. That is exactly the right thing to say, and it says 297 of 299 and 'no rank changes'. That is the tone I want for the weight problem too. Also 'Unweighted' in the state line. So closeness is clean for my purpose."

### Open a graph -- the GraphML (where the weight gets its meaning)

"I want to see where 'similarity' was declared. Open ppi-core-300.graphml. Edge attributes: confidence, Read as Number, Role: None. Hm. Role None. So on import it is not a weight at all, and later someone made it one and called it a similarity. That matches what I saw."

"There is no preview of the edge values here. The sample table shows nodes only -- module, log2FoldChange. I want to see five confidence values. If they are 0.15 to 0.99, that is a STRING-style score, a similarity. If they are 1 to 40, they might be a distance. The dialog asks me to assign a role to a column it does not show me."

### Open a graph -- the CSV (the weight meaning choice)

"This is the transactions file, but it shows the control I was looking for: 'amount as a weight means' Similarity / Distance / Capacity / Unknown, and under it: 'Paths ignore it; PageRank and communities read it as a similarity.' The (i) has all four."

"OK. That is the right question to ask. Honestly, better than any tool I use -- networkx just takes whatever 'weight' is and treats it as a length for paths and a strength for everything else, and you find out when a reviewer does. So credit where due."

"But: Unknown is the default, and 'paths ignore it' is a quiet rule. If I leave it at Unknown and run betweenness, I get unweighted betweenness. Does the result say 'weight ignored because its meaning is unknown', or just 'Unweighted'? From the finished screen I would only see 'Unweighted', which is a different claim -- it sounds like I chose it. And in the GraphML dialog the same question is a plain Role dropdown with 'None', not this segmented choice, so I would never have seen the four meanings on that file."

**Verdict to the moderator.** "The betweenness and closeness rankings on screen can be trusted as far as weights go: both state 'Unweighted' and the tool agrees they do not read confidence. The shortest path TP53 to SMAD3 cannot be trusted -- it was computed with a similarity as a length, and the tool flags it as out of date. Louvain I cannot tell you, because nothing says what Louvain did with a weight declared as a distance. And I cannot tell you whether the re-run will be right, because nothing says how a similarity becomes a length. Normalization for betweenness is also not stated; 'Details' goes nowhere."

## Single Ease Question

3 of 7. "The one screen that answers it -- the out-of-date popover -- is good. Getting there, and then not being able to find the conversion or the normalization, is not."

## Would she use this instead of her current tool

"For the analysis, no; that stays in the notebook where I can write `weight=lambda u,v,d: 1/d['confidence']` and see it. For the hand-off view, maybe -- the out-of-date flag is something I would want a non-coder to see, because they would never catch this themselves. But before I put its numbers in front of a reviewer, the state line has to say what the weight was read as and how it became a length, and 'Details' has to open to the formula and the normalization. Otherwise it is a nicer-looking way to be wrong."

## Problems observed

1. Out of date popover, tense and meaning: "these read it as a distance" reads as a present-tense claim about the algorithms, and makes Louvain look like it treats weights as distances. It should say the runs were computed under the old declaration, and name it. Severity 2.
2. No statement anywhere of how a similarity is converted to a length for path-based algorithms (inverse, negative log, or refusal) -- not in the Weight field, the state line, the out-of-date popover or the load step. The core of the trap. Severity 4.
3. No statement of what Louvain (or any strength-based algorithm) did with a weight declared as a distance, so the reader cannot tell whether the old communities were wrong or merely re-labelled. Severity 3.
4. "Details" after the state line does nothing; the normalization of betweenness is never stated. Severity 3.
5. The Weight field in the result editor gives no warning when a similarity-declared attribute is chosen for a path algorithm. Severity 3.
6. The state line says "Unweighted" whether the analyst chose no weight or the tool ignored a weight of unknown meaning; those are different claims. Severity 2.
7. The GraphML load step shows an edge attribute's Role as a plain "None" dropdown, without the four meanings the CSV step offers, and shows no sample of edge values to judge them by. Severity 2.
