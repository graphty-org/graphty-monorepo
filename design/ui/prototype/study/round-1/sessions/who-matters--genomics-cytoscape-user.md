# Session: "Who matters most, and how sure are you" -- Maren, genomics postdoc

Participant: Maren, cancer-genomics postdoc who normally does this in Cytoscape with cytoHubba (plays on a 14-inch laptop, 1440 x 900).
Task given by the moderator, nothing more: "Your manager wants the people who matter most in this network, and how sure you are."
Screens used, in order: the Results panel (running, finished, and the closeness-variant states), the Inspector (one protein selected), the frame at rest.
Outcome: success with difficulty. She produced a top-five list and a defensible "how sure" answer, but only by stitching it together across two panels, and she said the tool never helped with the "how sure" half.

## Transcript (think-aloud, lightly trimmed)

**Reading the task.** "People. OK, for me that's genes -- proteins. 'Who matters most' is hub genes. In Cytoscape I'd open cytoHubba, run MCC and Degree, take the top ten. 'How sure' -- honestly nobody asks me that. I'd say 'it's top ten by two methods'."

### Results panel, first view (a run in progress)

"This is patent citations. 124,318 nodes. That's not mine -- fine, it's a demo. There's PageRank running, a bar, 'under a minute'. OK."

"Left side is a Catalog: Centrality -- Betweenness, Closeness, Eigenvector, Harmonic centrality, HITS, Katz, PageRank. Where's Degree? That's the first thing I'd run. Hubs are the ones with the most connections. It's not in the list. I don't see MCC either, which, fine, that's a cytoHubba thing, but Degree not being there is weird."

"Some say 'hours', some 'under a minute', Girvan-Newman 'over a day'. Hours for betweenness? On my 300 genes? Oh -- no, this is the 124,000-node one. OK, that makes sense for that network, I guess."

"The popover in the middle -- Scope, Direction, Weight, Damping 0.5, 'Damping 0.5 has not run. Run queues it after this run.' I have no idea what damping is. I'm not touching that. 'Reset' is right there next to Run, I'm not clicking Reset."

### Results panel, finished (Human protein interactions, 300 nodes)

"Now this is more like it. Human protein interactions, 300 nodes, 1,262 edges, 3 components. Betweenness is done. It says 'on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected. WebGPU.' I like that it says exact and unweighted -- that's the kind of line I'd paste into methods. Unweighted -- so it ignored the STRING combined score? I think that's what that means. I'd want that said with the word 'score' somewhere, but OK."

"The network's all orange-brown. The legend bottom right: 'Betweenness color', 0 to 0.1, 'Log scale; the 10 proteins at 0 take the lightest color.' Log scale is fine. It's orange to dark brown, not red-green, so my PI can read it. Good. But it all looks the same shade to me -- the whole hairball is basically brown. I can pick out MAPK1, TP53 because they're bigger and labelled, but the colour isn't telling me much."

"Distribution: a histogram, 'bar height: square root of the count'. Why would you do that? I skipped it. Middle 0.0038, highest 0.138, zero: 10 nodes. OK, so most of them are basically nothing and a few are high."

"Top nodes: 1 MAPK1 0.1379, 2 TP53 0.1139, 3 YWHAZ 0.0695, 4 CDK1 0.0687, 5 AKT1 0.0642. '295 more in the table.' So that's my answer to 'who matters'... by betweenness. What is betweenness? I've heard it. Is it the number of connections? No -- the numbers are 0.13, so it's not a count. I don't know what 0.138 means. Is that good? There's no line saying what 'high' is."

"I'd click 'Details' hoping it explains betweenness. It seems to be about the run -- what ran, the engine. Not what the measure means. OK."

"And YWHAZ and CDK1 are 0.0695 and 0.0687. That's basically a tie. If my manager asks 'is YWHAZ really third', I'd say... no. Nothing here tells me that. It just gives me a rank."

### Trying a second measure (closeness variant state)

"So to get 'how sure' I'd do what I do in cytoHubba: run a second method and see if the same genes come up. I click Closeness in the catalog. It has a little 'WF-corrected' tag. Eigenvector has a yellow warning, '3 components'. I don't know what that means but it's yellow so I'm not running it."

"Closeness ran. There's a 'Variant: Wasserman-Faust corrected' and a tooltip: 'Each score is multiplied by the share of the other proteins the node can reach... scores drop by under 1% and no rank changes; the 2 isolated proteins score 0 either way. Without it, a node in a small piece can outscore a hub.' OK. That last sentence is actually useful -- it's the first time something told me why a number might be wrong. I'd read that one because it had my numbers in it, 297 of 299."

"But now I've got Betweenness and Closeness as two separate rows on the left, and I can only open one at a time. Where's the Top nodes list for closeness? I have to scroll down in this popover. I want MAPK1 / TP53 / YWHAZ side by side under both methods. I don't see a way to put them next to each other. In cytoHubba there's one table with a column per method. Here I'd have to write the top five down on paper and click back and forth. That's the whole 'how sure' question and I'm doing it with a pen."

"And the map is still brown. Closeness is brown too. They look identical to me."

### Inspector (clicking TP53)

"I click TP53 on the network. Right side: TP53, module DNA repair, degree 32 '#2 of 300', betweenness 0.1139 '#2 of 300', pagerank 0.01137 '#2 of 300'. Oh. OK -- that's what I wanted. It's number two on three measures. That I can say to my manager: 'TP53 is second on every measure.' That's my 'how sure'."

"And degree is here! 32, rank 2. So degree exists, it's just not in the catalog -- it's an attribute. Confusing. I'd have looked for it on the left for a while."

"'2 more attributes' -- I'd click that, maybe closeness is there."

"But I only get this one gene at a time. For the top five I'd click MAPK1, TP53, YWHAZ, CDK1, AKT1 one by one and copy '#n of 300' out of each. Five clicks is fine for a manager. For a paper table with ten genes and three methods, I'd want that in one table I can export."

"Neighbors 32, Edges 32. Memberships: DNA repair, TP53 partners. Fine, I didn't need those."

### Frame at rest

"This is Les Miserables. Valjean. OK, it's the same app with nothing selected. Statistics: 77 nodes, 254 edges, 'Connected components 2 (1 isolate)'. Nothing here about who matters. There's a 2D switch at the bottom -- good, it's 2D. Nothing new for my task."

### Her answer to the manager

"Top five by betweenness: MAPK1, TP53, YWHAZ, CDK1, AKT1. TP53 is second on degree, betweenness and PageRank, so I'm confident on TP53. MAPK1 is first on betweenness; I'd have to click it to check the others. Three through five I'm not sure about -- YWHAZ and CDK1 are basically tied. That's as sure as I can be, and I got there by clicking genes one at a time."

## Single Ease Question

**4 of 7.** "The number I needed was there, but split across two places. The rank-of-300 on the gene was the best thing I saw. The rest I'd have to assemble myself."

## Would she use it instead of Cytoscape?

"Maybe for poking around -- it's faster than cytoHubba to open, and it tells me 'exact, unweighted' without me having to remember. But for the hub-gene table in the paper, no. There's no MCC, which is what everyone reports and what reviewers expect. There's no table with all the methods side by side. And I still don't know what betweenness 0.138 means in biology. My figure stays in Cytoscape."

## Problems observed

1. **No side-by-side comparison of measures (severity 3).** Each result opens alone; the only place ranks from several measures meet is the Inspector, for one gene at a time. "How sure" requires the participant to copy ranks by hand.
2. **Degree missing from the Centrality catalog (severity 3).** Her working definition of a hub is degree; she looked for it first and did not find it. It exists only as an attribute in the Inspector.
3. **No meaning for the measure or for "high" (severity 2).** Betweenness 0.138 with no one-line meaning and no sense of what counts as high; "Details" describes the run, not the measure.
4. **Near-ties shown as clean ranks (severity 2).** YWHAZ 0.0695 and CDK1 0.0687 are ranked 3 and 4 with nothing saying the gap is negligible.
5. **Single-hue colour ramp reads as one colour (severity 2).** On the finished and closeness screens nearly every node is the same brown; the map does not help pick out hubs.
6. **Unexplained controls next to her data (severity 1).** Damping, "Reset" beside Run, the yellow "3 components" warning on Eigenvector: she avoided all three without knowing what they do.
7. **Demo data mismatch (severity 1).** The first screen is patent citations and the frame at rest is Les Miserables; only the protein network felt like hers.

## Things she liked

- "#2 of 300" under each measure in the Inspector: "That's the line I'd say to my manager."
- "Exact. Unweighted, undirected." on the result: "I can paste that into methods."
- The closeness variant note that used her own numbers (297 of 299) and said when the correction would matter.
- Colour-blind-safe orange ramp; 2D by default.
