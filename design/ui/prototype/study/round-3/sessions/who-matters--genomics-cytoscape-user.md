# Session: who matters most, and how sure -- Maren (genomics postdoc, Cytoscape user)

Participant: Maren, a cancer-genomics postdoc who builds STRING networks in Cytoscape and reports "top 10 hub genes" with cytoHubba. See `../../personas/genomics-cytoscape-user.md`.

Task as given by the moderator, and nothing more: "Your manager wants the people who matter most in this network, and how sure you are."

Screens seen, in order (participant view, design notes hidden, 1440 x 900 laptop):

- Results panel, a finished betweenness run on the protein network: `../../../shots/r3-maren-who-rp-finished.png`
- The same result scrolled to the end of its editor: `../../../shots/r3-maren-who-rp-finished-unpainted.png`
- The full ranking in the table: `../../../shots/r3-maren-who-rp-in-the-table.png`
- The node inspector, TP53 selected: `../../../shots/r3-maren-who-inspector.png`
- The main window at rest, same network: `../../../shots/r3-maren-who-frame-ppi.png`

## Transcript (think-aloud)

**Opening.** "People. OK, it's proteins, but fine -- 'who matters most' is hub genes. In Cytoscape I'd open cytoHubba, run MCC and Degree, take the top ten. Let's see what this has."

**Results panel, finished run.** "There's a list on the left. 'Catalog', 'Centrality'... Betweenness, Closeness, Eigenvector, Harmonic, HITS, Katz, PageRank. No Degree. No MCC. Hm. Degree is the one I'd actually start with -- hubs are the ones with the most connections, right? There's a 'Degree size' thing in the legend down there, so it knows degree, it just isn't in this list as something I can rank by."

"Someone's already run Betweenness, it's highlighted. 'on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected. WebGPU.' OK, 300 nodes, good, I like that it says the count. 3 components -- I'd normally keep the largest component before I do anything like this. Is it ranking across all three? I guess so, 'full graph'."

"There's a little popup: 'Exact. Computed on every node, not estimated. It does not say the ranking is meaningful.' ... Well, that's honest. Slightly unnerving, but honest. So 'exact' isn't the 'how sure' my manager means."

"Top nodes: MAPK1, TP53, YWHAZ, CDK1... it cuts off at 4. I'd scroll. I don't actually know what betweenness is. Nothing here tells me. Is high good? It's the biggest number, so I assume high is 'important'. I'd have to Google it before I'd put it in front of my PI."

"'Unweighted.' Wait. And 'Weight: None declared.' These are STRING edges -- the confidence score is the whole point. Did it ignore my confidence scores? If I asked my manager 'how sure are you' and the answer was 'I threw away the confidence', that's not a good answer. There's a dropdown, so I'd guess I can pick confidence there, but nothing says it would matter."

**Scrolled to the end.** "OK, all five: MAPK1 0.1379, TP53 0.1139, YWHAZ 0.0695, CDK1 0.0687, AKT1 0.0642. 'No near-ties in the top 5: the closest, ranks 3 and 4, differ by 1.2%.' ... Is 1.2% a lot? It says no near-tie, so I guess YWHAZ is really above CDK1. That's a statement about the arithmetic though, not about the biology. If one STRING edge flipped, would CDK1 jump? That's what 'how sure' means to me."

"Also the network went grey in this one and the colour row says 'not shown' with the eye crossed out. I'd have clicked the eye to get the colour back. Fine."

"'295 more in the table.' Click."

**The table.** "Oh -- this is actually what I wanted. Degree is a column. Betweenness with rank, PageRank with rank, 'of 300, ties share'. MAPK1 is #1 on everything and has degree 34, TP53 #2 on everything, degree 32. UBC is #6 on betweenness but #10 on PageRank. So the top five agree across two measures. That's something I can say: 'the top five are stable across two centrality measures.' That's my 'how sure', honestly -- more than one measure agreeing. I'd want Degree ranked the same way though, it's just the raw number here, and I'd want the top ten on all three side by side without me eyeballing it."

"'module from the file' -- YWHAZ, AKT1, UBC, UBB, MYC all 'Unassigned'. Great, my hub genes have no module. And UBC and UBB -- ubiquitin. Every reviewer knows ubiquitin is a hub in every STRING network. That's the 'hub gene paper' problem, the tool isn't going to tell me that, I'd know it."

"Export table as CSV -- good, it goes to R."

**Inspector, TP53.** "Clicking TP53. 'degree ... #2 of 30...' -- the numbers on the right are cut off on my screen. 'DNA repa', '0.113', '#2 of 30'. I assume that's 300. 32 neighbours. In 2 sets. There's a Neighbors button that filters to 33 nodes and says Ctrl+Z undoes it. I don't need that for this task."

**Main window at rest.** "This one says 'undirected, weight: confidence' under Edges. So the network DOES have confidence weights -- and the betweenness run said 'Unweighted, no weight'. The two screens disagree about my edges. That's the kind of thing that makes me stop trusting numbers. Which one is true?"

"And there's no Results open here, just the modules. The legend, the 2D -- fine. It's flat, it's not spinning, good."

**Wrapping up.** "What would I tell my manager? 'MAPK1 and TP53 are the top two by betweenness and PageRank, and they have the most partners; the top five are the same on both measures; the order is exact, ranks 3 and 4 are 1.2% apart.' And then I'd say 'it didn't use the STRING confidence', which I'd have to fix first. And I'd still be asked 'what's betweenness' and I'd be Googling it."

"I did find a 'Details' link next to 'WebGPU'. If that's the parameters I can copy into methods, that's useful. I'd click it. But I found it by accident."

## Single Ease Question

4 of 7. "Getting a top five was easy. Knowing what that top five means, and whether it used my confidence scores, was not."

## Would she use it instead of Cytoscape?

"For looking at it, maybe -- the table with the ranks side by side is nicer than cytoHubba's popup, and it told me how many nodes it ran on without me asking. But there's no MCC, no Degree as a ranking, and nothing that tells me what betweenness is in words I could put in a figure legend. Reviewers expect 'top 10 by MCC and Degree'. If I have to leave to do that, I stay in Cytoscape. And I'd want to know why one screen says my edges are weighted and the other says they aren't before I trust any of it."

## Problems observed

1. No plain meaning for any measure. Betweenness, PageRank, Katz, HITS are bare names; the only explanation shown ("Exact ... does not say the ranking is meaningful") explains exactness, not the measure. She ranked by a number she could not define. Severity 3.
2. The weight contradiction: the main window says "undirected, weight: confidence"; the result and the right panel say "Unweighted", "no weight", "Weight: None declared". She read it as the tool ignoring her STRING scores, and it cost her trust in all the numbers. Severity 3.
3. No Degree (or MCC) in the ranking catalog. Degree exists as a table column and a size layer, but not as a ranking with rank and "of 300" like the others. Her first instinct was degree. Severity 3.
4. "How sure" answered only as arithmetic (exact, near-tie 1.2%). The most convincing answer she found -- two measures agree on the top five -- she had to assemble by eye in the table; nothing states agreement across measures. Severity 2.
5. Top nodes list is cut at 4 in the default view; the near-tie sentence is below the fold, so on a laptop the "how sure" line is not seen without scrolling. Severity 2.
6. Inspector values truncated on the right at 1440 wide ("DNA repa", "0.113", "#2 of 30"). Severity 2.
7. "Details" (the parameters for a methods section) is a small link at the end of the status line; she found it by accident. Severity 1.
8. Ranking ran across all three components; no visible step to keep the largest component first, which her protocol does before any hub ranking. Severity 1.
