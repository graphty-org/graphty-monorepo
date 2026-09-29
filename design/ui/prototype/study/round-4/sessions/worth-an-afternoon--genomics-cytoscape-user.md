# Session: "A colleague sent this file. Is it worth an afternoon?" -- Maren, genomics postdoc (Cytoscape user)

Task as given by the moderator: "A colleague sent this file. Is it worth an afternoon?"
Screens worked through: the start screen, the load step (the evidence file, with its two issues), the network at rest after loading, the import report, and the first-look storyboard.
The file: ppi-core-300-evidence.tsv, a protein interaction list with columns protein_a, protein_b, source and confidence.

## Think-aloud

### 1. Start screen

"OK, 'Open a graph'. I'd say network, but fine. First thing I read is the line under it: 'Files stay on this computer. graphty reads them in this browser and uploads nothing.' Good. That's the first question my PI would ask, and I don't have to go hunting for it. I'd still want to know who wrote that sentence, but it's there."

"Samples: karate club, Les Miserables, protein interactions, bank transfers. I don't care about the samples, I have a file. There's Open... at the bottom, small. I'd probably just drag the file onto the window anyway. I don't see anything that says 'drop a file here', but the colleague's file is a TSV, so I'll try Open."

"There's no place to paste a gene list. That's fine for this task, the colleague sent me a file, but if this were my own DEGs I'd already be stuck here."

### 2. The load step -- confidence read as text

"'Open ppi-core-300-evidence.tsv'. Format TSV, each row is an edge, ends protein_a and protein_b, undirected. That's all correct, and I didn't have to tell it. That's already better than the Cytoscape table import wizard."

"Now the right side: 'Issues 2'. First one: 'confidence is read as text: 150 of 2,298 scores are NA.' Oh. Good. That's exactly the thing that bites me -- a column that silently comes in as strings and then isn't in the colour mapping list. Here it tells me how many and it shows me the rows: PSMA4 -- PSMD2, coexpression, NA. Line numbers too. I'd trust that."

"The options: 'Number, NA as missing -- 2,298 edges; 150 of them with no confidence', 'Number, leave out the rows with NA -- 2,148 edges; the 150 rows are not loaded', or Text. I pick NA as missing. I like that each choice says what it does to the count. I don't have to guess."

"'2 proteins have no partner in the file: GSK3B, NOTCH1. They are loaded unconnected.' Named, not just counted. Good. Although -- GSK3B and NOTCH1 with no partners in a 300-protein PPI network? That's strange biologically. Either the colleague filtered on something, or those two were queried and got nothing above the cutoff. I'd want to ask the colleague. The tool can't tell me that, and it's not the tool's fault."

### 3. The load step -- pairs that appear more than once

"'865 pairs appear more than once. Each row is one evidence source for a pair (parallel edges).' Right, so this is a STRING-style export split by channel -- databases, textmining, experiments. PSMA1 -- PSMB10 three times with 0.800, 0.742, 0.398."

"'Keep each: 2,298 edges' or 'Combine into one: 1,262 edges, one edge per pair of proteins, with its highest confidence. The source column is not kept.' Hmm. Highest? STRING's combined score is not the max of the channels, it's a combination -- it comes out higher than any single channel. So 'highest confidence' is not the number I'd put in methods as the STRING score. If I combine, I lose which evidence it was, and the score is a different number from what STRING would report. If I keep each, my network has three edges between two proteasome subunits and I don't know what that does to anything I compute."

"I'd pick Keep each, because it doesn't throw anything away, and I'd be uneasy about it. What I actually want is a confidence cutoff -- 'only keep interactions at 0.7 or above' -- and there's nothing about a cutoff here. In STRING that's the first thing you set."

"'What will load: nodes 300, edges 2,298, with no confidence 150.' Numbers, good. 'Weight: confidence, not used yet'. Not used yet for what? I don't know what 'weight' means here. I skip it."

### 4. The network at rest

"OK. It's flat, it's 2D, grey on a light background. Not spinning. Good -- if it had opened in 3D I'd have closed it. There's a '2D' button at the bottom, so I suppose 3D is in there somewhere. I'll leave it alone."

"It's a hairball in the middle with some clusters around it -- five or six lobes. The labels: MAPK1, HSP90AA1, AKT1, MYC, UBB, UBC, YWHAZ, TP53, RPL28, RPS8. The card at the bottom says 'Labels: the 12 proteins with the most partners'. Well, that's the usual suspects. UBC and UBB are in every PPI network ever, HSP90AA1 too. That's exactly the 'hub genes' figure I don't want to make. Those aren't interesting, they're sticky."

"Wait, 'most partners' -- with Keep each, PSMA1 and PSMB10 are linked three times. Is that three partners or one? If it counts edges, the proteins with the most evidence channels float to the top, not the ones with the most partners. The label says partners, so maybe it counts distinct proteins. I can't tell from here and I would want to know before I believe the labels."

"Right panel, Statistics. 'Loaded: ppi-core-300-evidence.tsv, undirected, NA read as missing, repeated pairs kept, no numeric edge column.' -- hang on. 'No numeric edge column'? I just told it confidence is a number with NA as missing. That's the thing I care about. Now I don't know if my choice took. The report says 'confidence: Number, NA as missing', so it did, I think. But the summary line in the main panel says the opposite of what I just did, or at least reads that way. That's the kind of thing that makes me stop trusting the rest."

"Nodes 300, Edges 2,298. Density 0.0281 -- means nothing to me, no idea if that's high. Connected components: 3 (2 isolates). OK, that's useful: one big component plus GSK3B and NOTCH1. So 'keep the largest component' would be easy here. I don't see a button for it, though. There's 'Full graph' at the top left with a dropdown -- maybe that's where the largest component would go? I'd click it and hope."

"Degree distribution, a little histogram. Fine. 'Attributes 2', '5 more' -- 5 more what? Two attributes, source and confidence, I guess."

"'Style stack: Base style' with a plus. I've never heard 'style stack' but I get that 'style' is where I'd colour things. There's nothing to colour by anyway -- this file has no fold change. To make it mean anything I'd need to bring in my DE table by gene symbol, and I don't see where I'd do that. There's a 'Data' button on the left, so maybe there. That's the step that always goes wrong for me in Cytoscape, and I can't see from this screen whether it goes better here."

"'Results' with a plus. Maybe clustering is in there. I'd want MCODE or MCL and then enrichment per cluster. I don't see anything about enrichment or GO terms anywhere, and nothing that knows these are genes."

"Top left: 'Nothing has been sent from this project.' And the Assistant is 'Off. Nothing is sent.' Good, I'd leave it off. I don't want AI telling me what my genes do."

### 5. The import report

"Version history, 'Loaded ppi-core-300-evidence.tsv, Sep 28, 10:42'. It wrote down what I chose: confidence as number with NA missing, 150 edges with no confidence, keep each, 865 pairs, 'Distinct pairs 1,262'. That's nice -- that's half a methods sentence, and it's the stuff I forget three months later. It doesn't say where the colleague's file came from, which STRING version, which cutoff -- but it can't know that, it's their file."

"'Weight is chosen when a run needs one.' OK, that explains the 'not used yet' from before. Sort of. I still don't know what a run is."

### 6. The first-look storyboard

"This is someone opening Les Miserables and then their own file with a weight question and betweenness. Not my data. I skimmed it. The part where it asks 'stronger or weaker ties' when a column is a weight -- I'd get that wrong, honestly, I'd guess."

### 7. Is it worth an afternoon?

"For this file? It's worth half an hour, not an afternoon. In ten minutes I know what's in it: 300 proteins, one big component plus two strays, the confidence column has 150 holes, and the file is per-evidence-channel, not STRING combined scores. That's more than I'd learn in ten minutes in Cytoscape, where I'd still be fighting the import. I'd write back to the colleague: 'Why are GSK3B and NOTCH1 unconnected, and which STRING version and cutoff is this?'"

"But the picture itself tells me what every PPI hairball tells me: ubiquitin and HSP90 are hubs. There's no expression on it, no clusters named, no enrichment. To make it worth an afternoon I'd have to bring my own data in, and I can't see how from these screens."

## Single Ease Question

5 of 7. Getting the file in was easier than I'm used to, and the counts were all there. I lost points where the summary said "no numeric edge column" right after I'd set confidence as a number, on the repeated-pair choice whose "highest confidence" isn't the score I'd report, and on not seeing a confidence cutoff or a largest-component button.

## Would I use this instead of my current tool?

No, not instead. I'd use it to look inside a file someone sends me before I decide whether to bother, because the import tells me what it did in numbers and names the proteins it couldn't connect -- that alone is better than Cytoscape. But my pipeline is STRING query, cutoff, largest component, fold-change colouring, MCODE, enrichment per cluster, cytoHubba, and a PDF with a legend. On these screens I only see the first bit of that. "So I'd have to leave to do half of this. Then why not just stay in Cytoscape?" And even if the rest were there, I'd need something to cite in the methods, and my PI would ask why the figure isn't from Cytoscape.

## Moments, in short

- Praise: "150 of 2,298 scores are NA", with the rows and line numbers shown. That is the silent failure I have been hit by, made visible.
- Praise: the two proteins with no partner are named (GSK3B, NOTCH1), not just counted.
- Praise: flat 2D at rest; no spinning.
- Praise: "Files stay on this computer" and "Nothing has been sent from this project" are on screen without looking.
- Trust dent: the Statistics summary says "no numeric edge column" right after she set confidence as a number with NA as missing.
- Confusion: "Combine into one ... with its highest confidence" is not how a STRING combined score works, so neither choice is one she could write into methods with confidence.
- Missing, by her protocol: a confidence cutoff, a one-click largest component, a way to join her DE table by gene symbol, clustering and enrichment.
- Doubt: "the 12 proteins with the most partners" labels UBC, UBB, HSP90AA1 -- the sticky proteins, the figure she does not want to make. With parallel edges kept, she cannot tell whether "partners" counts proteins or evidence rows.
- Unknown words skipped: density (no scale), "Weight ... not used yet", "Style stack", "Results", "5 more".
