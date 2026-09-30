# Session: who matters most, and how sure -- Maren (genomics postdoc, Cytoscape user)

Participant: Maren, cancer-genomics postdoc who makes network figures in Cytoscape two or three times a month and reports "top 10 hub genes" the way the papers she copies from do.
Screens used: the Results panel mock (its states in order), the Inspector mock and the resting frame on the protein network, at 1440 by 900 (her laptop).
Moderator's task, word for word: "Your manager wants the people who matter most in this network, and how sure you are."

Renders she looked at: `shots/screens__results-panel.png`, `shots/record/r2-maren-rp-finished-sampled.png`, `shots/record/r2-maren-rp-finished.png`, `shots/record/r2-maren-rp-finished-unpainted.png`, `shots/record/r2-maren-rp-in-the-table.png`, `shots/record/screens__results-panel--new-project.png`, `shots/screens__inspector.png`, `shots/inspector-one-node.png`, `shots/screens__frame-at-rest-dataset-ppi.png`.

## Think-aloud transcript

**Reading the task.**

"'People.' It's a protein network, so I'm going to read that as genes. Proteins, whatever. My manager wants the hub genes. That's the top ten by degree, or by MCC if you're doing it the cytoHubba way. 'How sure' -- nobody's ever asked me that about a hub list, honestly. I'd say the STRING confidence cutoff, I guess. 0.7."

**First state of the Results panel (Running, patent citations).**

"Patent citations? 124,318 nodes. That's not my network. There's a PageRank running on it, 'Running on WebGPU, under a minute'. Damping 0.5... I don't know what damping is. I'm skipping this, it's someone else's data."

"The list on the left is useful though. 'Catalog', Centrality: Betweenness, Closeness, Eigenvector, Harmonic centrality, HITS, Katz, PageRank. Then Community, Louvain, Leiden. OK, it's a menu of algorithms. Where's degree? Degree is the hub one. I'm reading down again... Betweenness, Closeness, Eigenvector, Harmonic, HITS, Katz, PageRank. No Degree. And no MCC. Hm."

**Flips forward to the protein network (Finished, sampled comes first; still patent data).**

"Still patents. 'Rank ranges from the run's own error bound.' '#3 to #7'. Oh, that's interesting, actually -- it says the ranks below #2 may swap between runs. That's a 'how sure' answer. But it's a sampled one on a huge graph, and the nodes are numbers, 5879702. Not my case. Next."

**Finished state on Human protein interactions.**

"Right, this is my kind of thing. 300 nodes, 1,262 edges, 3 components. MAPK1, TP53, YWHAZ, CDK1, AKT1 labelled. Someone already ran Betweenness -- it's in 'In this project'. I'd have run degree first, but fine, let's see."

"Top line: 'on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected. WebGPU.' OK, I like that it tells me what it ran on, with a count. 'Exact' has a little (i) and it's popped open: 'Computed on every node, not estimated. It does not say the ranking is meaningful.' ...Huh. That's weirdly honest. So 'exact' means the maths is exact, not that the answer is right. I wouldn't have read it that way on my own, I'd have taken 'exact' as 'sure'. So that's already half my answer to 'how sure' and it's a 'not very, from this alone'."

"Wait. 'Unweighted.' And 'Weight: None declared'. And on the right, 'Edges: undirected, no weight'. My STRING edges have a combined score on every one of them -- that's the confidence. Is it not using that? Did it drop the column? I'm going to go look at the resting screen to check."

**Checks the resting frame (Proteins).**

"'Edges 1,262, undirected, weight: confidence.' So HERE it says the edges have a confidence weight. And the Results panel said 'no weight', 'None declared'. Which one is it? Either it has my confidence scores or it doesn't. If it has them and betweenness ignored them, fine, but tell me that -- 'confidence is there, not used'. If it lost them, that's the thing that makes me stop trusting every number on the page. This is exactly the import-shows-only-headers feeling."

"I'd open the Weight dropdown and see if confidence is in it. From the picture I can't tell -- it just says 'None declared'. 'Declared' by who? I didn't declare anything, I imported a STRING network."

**Back on the Finished state; reads the ranking.**

"Distribution, 300 nodes, grey bars. 'bar height: square root of the count' -- don't care. 'middle 0.0038, highest 0.138, zero 10 nodes, all 291='. Two-ninety-one equals? Oh -- the ten with zero all tie at rank 291. I had to read that twice. I'd just write '291 (tied)'."

"Top nodes: 1 MAPK1 0.1379, 2 TP53 0.1139, 3 YWHAZ 0.0695, 4 CDK1 0.0687... and it's cut off at the bottom of my screen. I want ten. Nobody reports top four. I'd scroll the panel, I guess, or there's '295 more in the table'."

"The colour. Legend bottom right: 'Betweenness color', log scale, 0 to 0.1, orange to dark brown. Not red-green, good, my PI can read it. But look at the network -- almost everything is the same brown. I can't see hubs from the colour at all; I'm seeing them from the size, and the size is degree, it says 'Degree size' underneath. So the picture is actually showing me degree and the list is showing me betweenness. That's fine by me, but a manager would think the big ones are the 'important' ones by the measure in the panel."

**Next state ("the other answer", nothing painted).**

"Same numbers, network gone grey, 'Betweenness c... not shown' with a crossed-out eye. OK, so the colour can be switched off. Doesn't change my answer."

**"295 more in the table".**

"Now this is useful. A table: id, module, degree, betweenness, betweenness rank. Sorted by betweenness. MAPK1 degree 34, #1. TP53 degree 32, #2. YWHAZ 24, CDK1 25, AKT1 24, UBC 21, UBB 21, EP300 21, MYC 23, HSP90AA1 21. So degree and betweenness mostly agree at the top. MAPK1 and TP53 are top two either way -- degree says it too, 34 and 32 are the two biggest. That's my answer."

"Hang on. UBC and UBB. Ubiquitin. Those are in every PPI network's hub list because ubiquitin sticks to everything. Any reviewer who knows anything says 'take out UBC'. Same with YWHAZ and HSP90AA1, the chaperone-y, 14-3-3 things. So my honest top list is MAPK1, TP53, CDK1, AKT1, MYC, EP300. The tool can't know that, that's biology. But it also means I don't believe the list as it comes out."

"And lots of 'Unassigned' in module. YWHAZ, AKT1, UBC, UBB, EP300, MYC, HSP90AA1 -- all Unassigned. So the top genes are the ones between the modules. Which, I think, is what betweenness is supposed to find? 'Sits between groups'? Nobody told me that on this screen, I'm guessing from the table."

"'Export table as CSV...' Good. That goes into Excel for my manager. (And I'll check Excel didn't eat anything.)"

**Looks for a degree ranking.**

"I still want a 'degree rank' column next to the betweenness rank, so I can say 'top 10 by both'. The table has degree but no degree rank. I'd sort by the degree column, I assume clicking the header works. But Degree isn't in the algorithm list, so I can't 'run' it and get its own Top nodes box. Odd that the most basic one is the one missing."

"There's 'Compare with...' under the table link. Compare with what? Another algorithm? That might be the side-by-side I want. I'd click it." (In the prototype it goes nowhere; she would have expected a list of other measures.) "Nothing happened. OK."

**Inspector: clicks TP53.**

"TP53 selected. Right column: module DNA repair. degree 32, '#2 of 300'. betweenness 0.1139, '#2 of 300'. pagerank 0.01137, '#2 of 300'. Oh, nice. That's the sentence: 'TP53 is second by all three measures.' That's how sure -- it doesn't depend on which method I pick. I like '#2 of 300' a lot. A number with a denominator."

"Where did pagerank come from? Nobody ran it that I saw in this project, but fine, someone did. And 'Neighbors 32'. Sets: 'DNA repair' and 'TP53 partners'."

"But I have to click them one by one. For ten genes that's ten clicks and writing it down. I'd do it in the table instead if I could get the ranks in columns there."

**Answer she would give the manager.**

"MAPK1 and TP53 are the most central -- top two by number of partners and by betweenness, and TP53 is second by PageRank too. Then CDK1, AKT1, MYC, EP300, after I throw out ubiquitin and the chaperones. How sure: sure about the top two, because every measure I looked at agrees. Past #2 the order shuffles between measures, so I'd give a group, not a ranking. And it's on STRING, so it's only as good as the interactions -- which, by the way, I'm not sure it used the confidence scores for."

**End of task.** She reached an answer (top two firm, a group of four to six after removing ubiquitin and chaperones), from the betweenness Top nodes, the table and the Inspector's per-measure ranks. She never ran a degree ranking because there was none to run, never found out whether the STRING confidence was used, and "Compare with..." did not take her anywhere.

## Single Ease Question

4 out of 7. "Getting a list was easy -- it was already there. Getting 'how sure' I had to build myself out of three screens, and the thing I'd actually say about confidence, the STRING score, the screens disagree on."

## Would she use this instead of Cytoscape?

"For this question, maybe, for looking. The '#2 of 300' next to every measure is better than anything cytoHubba gives me -- cytoHubba gives me eleven top-ten lists and I pick MCC because the paper said so. And 'Exact... does not say the ranking is meaningful' -- I'd actually quote that to a student. But there's no degree to run and no MCC, and every hub-gene paper my PI reads says 'top 10 by MCC and degree'. If I can't produce that, I have to explain a new method to reviewers. So: I'd explore here, then redo the table in cytoHubba for the paper, because that's what gets cited. And I need to know what happened to my confidence scores before I'd trust any of it."

## Problems seen (for the studio)

1. The Results panel says the edges have no weight ("Weight: None declared", "undirected, no weight") while the resting frame says "weight: confidence" for the same protein network. For a STRING user the confidence score IS the certainty, so the contradiction lands on exactly the "how sure" half of the task and reads as silent data loss. (Severity 3.)
2. Degree is not in the catalog's Centrality list, so the measure she calls "hub" cannot be run and has no Top nodes box or rank column; it exists only as a size layer, a table column without rank, and a line in the Inspector. (Severity 3.)
3. "How sure" has no one place: agreement between measures is visible only per node in the Inspector, "Compare with..." gives no hint of what it compares and went nowhere, and the table shows one rank column. She assembled the answer across three screens. (Severity 3.)
4. The Top nodes list shows four or five rows before the panel ends on a 900-pixel screen; her reporting unit is ten. (Severity 2.)
5. Colour by betweenness on a log scale paints nearly every protein the same dark brown, so the picture shows degree (size) while the panel talks about betweenness. (Severity 2.)
6. "291=" for a tie had to be read twice. (Severity 1.)
7. Catalog names are bare (Betweenness, HITS, Katz, "WF-corrected"); she learned what betweenness means only by noticing the top genes were "Unassigned" between modules. (Severity 2.)
8. No way to flag or set aside known sticky hubs (ubiquitin, chaperones) -- she did it in her head. Domain point, not a screen defect; noted because it is why she distrusts any raw top-10. (Severity 1.)

## What she liked

- "#2 of 300" for degree, betweenness and PageRank on the selected protein: a number with a denominator, and agreement at a glance.
- The popover on "Exact": "It does not say the ranking is meaningful."
- The state line with scope and counts ("full graph, 300 nodes, 3 components").
- The table sorted by the measure, with degree next to it, and Export table as CSV.
- On the big sampled run, "#3 to #7" and "Ranks below #2 may swap between runs" -- the kind of answer to "how sure" she wanted on her own network too.
- Colour not red-green; "Assistant Off. Nothing is sent."
