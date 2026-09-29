# Session: "A colleague sent this file. Is it worth an afternoon?" -- Maren, genomics postdoc (Cytoscape user)

Task as given by the moderator: "A colleague sent this file. Is it worth an afternoon?"
The same task, in the same words, was given to this participant in the previous round, where she rated it 4.33 on average across sessions.
Screens worked through, as the participant sees them (design notes hidden): the start screen, the load step with the confidence column open, the load step with the repeated-pairs choice open, the network at rest after loading; and, for what a click would lead to, three frames of the first-look storyboard (a node clicked, the Quick actions box open).
The file: ppi-core-300-evidence.tsv, a protein interaction list with columns protein_a, protein_b, source and confidence.
Renders: shots/tasks/worth-an-afternoon/01-start-screen.png to 04-frame-at-rest.png.

## Think-aloud

### 1. Start screen

"'Open a graph.' Network, but fine. The line under it: 'Files stay on this computer. graphty reads them in this browser and uploads nothing.' OK. That's the one sentence I need before I put anything of a colleague's into a website. It's unpublished, it's not mine, so that matters more than usual. There's a 'Where your data goes' link; I wouldn't click it today, but I'm glad it's there if my PI asks."

"'Projects are kept in this browser.' Meaning if I clear Chrome I lose it? Probably. Not my problem this afternoon."

"Samples. 'Protein interactions, 300 proteins' -- huh, is that the same thing my colleague sent me? Could be a coincidence. I'm not opening a sample, I have a file."

"'Open...' down at the bottom, 'Connect to data source...' under it. I'd just drag the TSV onto the window. Nothing says 'drop a file here', so I'd try it and, if nothing happened, click Open. For today that's fine. If this were my own DEG list I'd be looking for somewhere to paste gene symbols and there isn't one -- but the colleague sent a file, so I'll let that go."

### 2. Load step -- the confidence column

"'Open ppi-core-300-evidence.tsv.' Format: TSV, tab, header row. Each row is: an edge. Ends: protein_a -- protein_b. Undirected. All correct and I didn't touch anything. In Cytoscape I'd be in the import-network-from-table dialog clicking column headers to set source and target, and getting it wrong once."

"Right side, 'Issues 2'. First: 'confidence is read as text: 150 of 2,298 scores are NA.' Good. That's exactly the thing that's burned me -- a column that comes in as strings and then isn't there when I go to colour by it. Here it's a number, 150 of 2,298, and it shows me the rows: line 29, PSMA4 -- PSMD2, coexpression, NA. Line 31, PSMA5 -- PSMA7... all coexpression, so far. Is that all coexpression? It says '5 of 150', I only see five. I'd want to know if the NAs are all one source, because that tells me something about how the file was made. 'Show first rows' -- I'd click that, maybe."

"The dropdown: 'Number, NA as missing -- 2,298 edges; 150 of them with no confidence.' 'Number, leave out the rows with NA -- 2,148 edges; the 150 rows are not loaded.' 'Text -- 2,298 edges; confidence labels and filters, but is not a number.' Each one tells me what it does to the count. I pick NA as missing. I don't want rows dropped behind my back, and I can throw them out later if I decide to."

"Down at the bottom: 'What will load: 300 nodes, 2,298 edges. 2 proteins have no partner in the file: GSK3B, NOTCH1. They are loaded unconnected.' Named. Not '2 nodes unconnected', the actual names. That's the thing I never get."

"And -- wait. GSK3B and NOTCH1 with no partners, in a 300-protein core interactome? GSK3B interacts with half the cell. NOTCH1 too. So either my colleague filtered by some confidence cutoff and those fell out, or the IDs are wrong in those rows, or somebody dropped them on purpose. That's actually the most useful thing I've learned about this file so far, and it came from the import dialog, not the picture. I'd write that down and ask her."

### 3. Load step -- repeated pairs

"Now 'Issues 1', the NA one is gone because I chose. Good, it doesn't keep nagging me. '865 pairs appear more than once. Each row is one evidence source for a pair (parallel edges).' Right -- it's STRING-style channels: databases, textmining, experiments, coexpression. PSMA1 -- PSMB10 three times: databases 0.800, textmining 0.742, experiments 0.398."

"The choice: 'Keep each: 2,298 edges. One edge per row, so a pair reported by three sources is linked three times. A measure that needs one link per pair combines them itself and says so on its result.' Or 'Combine into one: 1,262 edges. One edge per pair of proteins, with its highest confidence. The source column is not kept.'"

"Hm. Highest confidence isn't how STRING combines channels. STRING's combined score is -- it's a probabilistic thing, not the max. So if I combine here I get a number that looks like a STRING score and isn't one, and I'd have to explain that in methods. And I lose the source column, which is the interesting part of this file. So: keep each. That was already the default. Fine."

"Left side: source is 'Category, 4 values', role 'Edge type'. I didn't set that, it guessed. 'Edge type' -- I assume that means I'll be able to colour edges by source. We'll see."

"'Weight: confidence, not used yet.' Not used yet by what? The layout? I don't know what that means and I'm not going to find out right now."

"Two choices, both explained in a sentence each, both with counts. That's not two dialogs in a row that I don't understand -- they're two questions about my data, and they're the right two questions. Load."

### 4. The network at rest

"OK. Flat, grey, 2D. Nothing spinning. Good -- '2D' on the toolbar at the bottom, so there's a 3D somewhere I'll ignore."

"Title 'Human protein interactions'. Where did 'Human' come from? The file's called ppi-core-300-evidence. And there's a recent project with that exact name, 'Human protein interactions (300 proteins)', from Sep 21. Did it open that one or my file? The chip under the title says 'ppi-core-300-...' so I think it's my file, but it's got someone else's name on it. That makes me look twice."

"Left: 'Graphs: Evidence rows.' OK, one network, called evidence rows. In Cytoscape the network panel would list the network and later my subnetworks under it. I don't see a largest-component entry, but I haven't asked for one."

"The picture. Hairball in the middle, a few lobes around the edge. I can pick out a dense bottom-right lobe and one on the left -- my bet is proteasome and ribosome, because the labels near there are RPL28 and RPS8, and the rows I saw were all PSMA/PSMB/PSMD. That's what every core PPI network looks like. Two dots floating off on their own -- GSK3B and NOTCH1, I'd guess, but they're not labelled, which is a bit funny since those are the two I actually care about now."

"'Labels: the 12 proteins with the most partners. 2 more hidden where they overlap.' So labelled: UBC, UBB, HSP90AA1, MYC, AKT1, TP53, YWHAZ, MAPK1, RPL28, RPS8. Ha. That's the sticky-protein list. Ubiquitin, HSP90, 14-3-3. Those are hubs in every network ever made, that's not a finding. If I sent this to my PI she'd say 'yes, and?' It's the 'top 10 hub genes' paper I don't want to write. Although -- 'partners', not 'connections'. Does 'partners' mean proteins or evidence rows? With the repeats kept that matters: UBC might just have more textmining rows."

"Right panel, Statistics. First there's a sentence: 'Loaded: ppi-core-300-evidence.tsv, undirected, NA read as missing, repeated pairs kept, no numeric edge column. Change...' Oh, that's nice -- it wrote down what I chose. That's half a methods sentence. But 'no numeric edge column'? I just told it confidence is a number with NA as missing. So which is it? Is confidence a number or not? That's exactly the kind of line that makes me go and check everything else on the screen."

"'Nodes 300 nodes. Edges 2,298 edges (rows). Linked pairs 1,262 linked pairs.' OK, that's good -- it's separating the rows from the actual pairs of proteins. 1,262 pairs is the number I'd actually quote. I'd have assumed 2,298 were interactions otherwise. It tells me the unit on every number, I like that."

"'Density 0.0281.' Is that high? Low? For 300 proteins? No idea. Skip."

"'Connected components 3 (2 isolates).' Good -- so one big component with 298 proteins and the two orphans. That answers my 'keep the largest connected component' step: it basically already is. I'd still like to click it and get the 298 as its own network, but I know the answer."

"'Degree distribution' -- the little bar chart. Long tail, a few hubs. Yes, like every PPI."

"'Attributes 2', '5 more'. Don't know what 5 more is. Skip."

"'Style stack: Base style.' I don't know what a style stack is. I'd look for where to colour edges by source. I set source as 'Edge type' back there and all the edges are the same grey. So what did 'Edge type' do? If it did something it isn't showing it. In Cytoscape I'd do a discrete mapping on the edge column 'source'. Here -- I'd click around. 'Quick actions' maybe."

### 5. What a click would do (first-look storyboard, another dataset)

"If I click a node, the right side turns into that node: degree 36, '#1 of 77', neighbours, edges. OK, '#1 of 77' is helpful -- it's the rank. For TP53 I'd want to see that. It's a Cytoscape node table row, basically, but for one node."

"Quick actions, type 'who matters most': 'Betweenness -- who sits between the groups.' 'PageRank -- who is tied to well-connected characters.' 'Closeness -- who is near everyone.' 'Degree -- who has the most direct ties.' Well. At least it says what each one means in one line. I'd still just take degree, honestly -- hubs are the ones with the most connections. 'Betweenness sits between the groups' -- huh. So in this file that might not be UBC, it might be whatever links the proteasome lobe to the rest. That'd be more interesting than UBC. I'd maybe try that. But this is for a novel, not my file; I'm guessing it looks the same for proteins."

"I don't see anything here that does clustering the way MCODE does, or enrichment on the lobes. If I want to say 'this lobe is proteasome' I'd copy the node names out and paste them into g:Profiler. Is there even a way to copy a lobe's names? The table at the bottom, I suppose."

### 6. Answering the question

"Is it worth an afternoon? My honest answer after ten minutes: probably not an afternoon, maybe an hour. It's a generic core interactome -- proteasome, ribosome, and the usual sticky hubs. There's no expression data in it, no condition, nothing that says why these 300. The one real question it raises is why GSK3B and NOTCH1 have no partners, and I got that from the load dialog in the first two minutes. That's worth an email to my colleague, not an afternoon."

"And that was fast. I knew how many rows, how many real pairs, how many NAs, which two proteins are orphaned, and that it's one big component -- before I'd drawn anything. In Cytoscape I'd have got the picture and none of the counts, and I'd have found out about the NAs when the colour mapping came out wrong."

## Single Ease Question

**5 of 7.**

"The loading part is a 6 -- it asked the right two questions and every answer had a number on it. I'm taking it down for the picture: the edges I told it were 'Edge type' are all the same grey, the summary says 'no numeric edge column' after I set confidence as a number, and the title calls it 'Human protein interactions' when that's not what my colleague called it. None of that stopped me, but each one made me check something twice."

## Would she use this instead of her current tool?

"For this -- a file someone sends me and I want to know what's in it before I spend time on it -- yes, I'd open it here rather than start Cytoscape. It's a browser tab, nothing uploaded, and it told me more about the file than Cytoscape would in the same ten minutes. For my own work, no, not yet. My starting point is a gene list and a DESeq2 table, not an edge file, and I don't see a STRING query, MCODE, cytoHubba or enrichment. So I'd have to leave to do half of it -- then why not stay in Cytoscape? And for a figure: how would I cite it in methods, and will it be here when reviewer 2 asks me to redo Figure 3? My PI won't take a figure from a tool nobody cites. For looking, maybe. For the paper, Cytoscape."

"Also, honestly -- UBC in the middle of a hairball. It's a nice picture of what everyone already knows. That's not on the tool, that's the file."

## Moments, in short

- Praise: "150 of 2,298 scores are NA", with rows and line numbers, and each read-as option says what it does to the edge count. The silent-text-column failure she has been hit by, made visible before loading.
- Praise: the two proteins with no partner are named (GSK3B, NOTCH1). This is where her one real insight about the file came from: two major signalling proteins orphaned in a core interactome means the file was filtered or broken.
- Praise: "Linked pairs 1,262" beside "Edges 2,298 (rows)"; every number carries its unit.
- Praise: the state line under Statistics writes down what she chose at load ("NA read as missing, repeated pairs kept") -- "half a methods sentence".
- Praise: flat 2D at rest; "Files stay on this computer ... uploads nothing" readable without clicking.
- Trust dent (repeat from the previous round): the state line still says "no numeric edge column" right after she set confidence to a number with NA as missing, while the load step said "Weight: confidence, not used yet".
- Confusion: source was given the role "Edge type" at load, and the drawn network shows every edge the same grey with no legend, so she cannot tell what the role did.
- Confusion: the project is titled "Human protein interactions", the same name as a recent project listed behind the load dialog, not the file's name; she had to check the file chip to believe it was her file.
- Confusion: "Combine into one ... with its highest confidence" is not how STRING combines channel scores, so she kept each row by default rather than by informed choice.
- Doubt: labels on "the 12 proteins with the most partners" are the usual sticky hubs (UBC, UBB, HSP90AA1, YWHAZ); with repeated rows kept she is not sure whether "partners" counts proteins or evidence rows. The isolates she cares about are not labelled.
- Missing, by her protocol: one-click largest component as its own network, colour edges by source, clustering, per-cluster enrichment, a way to paste a gene list at the start.
- Skipped as unknown: density (no scale), "5 more", "Style stack", "Weight ... not used yet".
- Would switch: for triaging a file someone sent, yes; for her own analysis and paper figures, no (missing STRING query, clustering, enrichment; citation and longevity).
