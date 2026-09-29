# Session: who matters most in Les Miserables, and how sure

Participant: Maren, cancer genomics postdoc, Cytoscape user (persona: genomics-cytoscape-user).
Screen: 14-inch laptop, 1440 x 900, Chrome.
Task as given by the moderator: "You have the Les Miserables co-appearance network open. Find the few characters who matter most to how the story hangs together, and tell me how sure you are of their order."

Screens used, in the order she met them:

- The project at rest, Les Miserables: `screens/frame-at-rest.html?dataset=lesmis` (render `tmp/who-matters-maren-r4/lm-frame-at-rest.png`)
- The main menu's Algorithms list: `shots/screens__results-panel--catalog.png` (the mock draws it over the protein network; the list is the same one)
- A finished betweenness result, full graph: `shots/screens__results-panel--finished.png` (drawn on the protein network, see the moderator note below)
- The table with degree and betweenness ranked side by side, Valjean selected: `screens/table-dock.html` (render `tmp/who-matters-maren-r4/td-tall.png`, `lm-table-dock.png`)
- Valjean selected, inspector with his results: `shots/screens__navigation-frame-new-node.png`
- The betweenness result after a filter to degree >= 2, 60 of 77 characters, with its run record open: `shots/screens__results-panel--filtered.png`
- "Compare rankings..." from the table: `screens/comparison.html` (render `tmp/who-matters-maren-r4/cmp.png`)

Moderator note: the mocks have no full-graph betweenness result panel for Les Miserables, and the inspector page draws only the protein network. Where she met a protein screen, the moderator told her "imagine it is your characters; the numbers for your characters are in the table". She noticed the switch on her own the first time (below). Her Les Miserables numbers come from the table and the filtered result, which do show this network.

## Transcript (thinking aloud)

**The network, at rest.** OK. Les Miserables. I read it in school and I've seen the musical, so I know roughly who's who, which is actually a good test -- if the tool tells me something stupid I'll know. 77 nodes, 254 edges, "Connected components 1". Good, one piece, so I don't have to keep the largest component first. That's the first thing I'd do in Cytoscape.

Colour is "Group color" and the legend says 2, 8, 4, 1, 3, 5, 0, Other. Numbers. Group 2 has 14 characters. What's group 2? Nothing says. It's somebody's clustering from the file, I assume, like an MCODE column somebody imported. It's orange, blue, green, not red-green, fine, my PI could read it.

Under the legend: "Labels: the 18 characters with the most connections. 5 more hidden where they overlap." Oh, that's nice actually. Most tools label whatever they feel like. It tells me the labels ARE a ranking -- by degree. So Valjean, Javert, Marius, Gavroche, Fantine, Myriel -- those are already the hub characters. That's what I'd call the answer in a paper, honestly. Top ten by degree.

Right side, "Statistics". "Loaded: miserables.json, undirected, value not used yet. Change..." Value? I don't know what "value" is. Probably how many scenes two characters share. Like the STRING score. I'd leave it; I don't change things I don't understand in the first five minutes.

There's a "Results" heading with a plus. That's where I'd get my cytoHubba. Click.

**Picking a measure.** It opens a menu, Algorithms. Centrality: Betweenness, Closeness, Eigenvector, Harmonic centrality, HITS, Katz, PageRank. Community, Path, Structure...

Where's Degree? That's the one everybody uses. And no MCC, which is what I'd actually report -- "top ten by MCC". I'm skimming these names, I don't know what Katz or HITS are and I'm not going to learn now. Betweenness I've seen -- it's one of the cytoHubba options, next to Bottleneck. It's first and it's highlighted. Fine, Betweenness. I'll get degree from somewhere else; it was in the labels anyway.

"Eigenvector: 3 components" with a warning sign. My network is one component. So is this list not about my network? Whatever. Moving on.

**The result.** It ran. Right panel, "Betweenness, Result". "on: full graph, 300 nodes, 3 components." Wait. 300? MAPK1, TP53, YWHAZ... That's a protein network, not Les Mis. (Moderator: "imagine it is your characters; the numbers for your characters are in the table.") OK. Pretending.

So the shape of it. "Exact" with a little (i). Hovering: "Computed on every node, not estimated. It does not say the ranking is meaningful." Huh. That's honest. I like that it says it; I've never seen a tool admit that. cytoHubba just gives you the list.

"Weight: confidence, not used yet. Change..." Again. So it ignored the scores. For STRING I use the confidence as a cutoff before import, so that's what I'd expect anyway. Leave it.

"Top nodes", five of them with numbers like 0.1379. What's 0.1379? No unit. Fraction of something. Then: "Every step in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%." I read that twice. I think it's saying none of the five are tied. 1.2% of what -- of the value? The gap between 3 and 4 is 1.2% and that counts as not a tie? That's... thin. If I measured a western blot and two bands were 1.2% apart I'd call them the same. So I read this as "3 and 4 are basically a coin flip", which is maybe the opposite of what it wanted me to think.

Distribution histogram, "bar height: square root of the count". I skip that.

"295 more in the table." Click.

**The table -- this one is Les Mis.** Now it's my characters. "Full graph: 77 nodes." Two column groups: "Degree" and "Betweenness exact, unweighted, full graph". Each has a score and a rank, "rank of 77".

And a line above the table: "Valjean is #1 on both measures. At #2 they part: Gavroche by degree, Myriel by betweenness." Oh. That's the sentence I'd have to write myself. I'd normally take cytoHubba's MCC top ten and the Degree top ten into Excel and look for the overlap by eye. This just says it. Good.

Rows: Valjean 36, #1, 0.570, #1. Gavroche 22, #2, 0.165, #3. Marius 19, #3, 0.132, #4. And Myriel is #2 on betweenness with only 10 connections. Myriel -- the bishop? He's in the first book and then he dies. Why is he the second most important character in the story?

Looking at the network: Myriel sits up right with a little fan of blue nodes around him that only connect to him. Napoleon, the Countess, Cravatte, the Old Man. The one-scene people from the opening chapters. So he's #2 because he's the only way to reach a bunch of characters nobody else talks to. That's the "sits between" thing. That's not "matters to how the story hangs together", that's a cul-de-sac with a gatekeeper. In a PPI network I'd call that an artefact of one well-studied protein with a lot of one-off partners.

"Compare rankings..." -- click. It opens... "Payments network review", 3,093 accounts, a scatter plot, "0 of the top 50 in both". That's not my network at all. I'm lost. Back.

**Valjean.** I click Valjean in the table. Right side: "Valjean, Node". Attributes: group 2, degree 36. Results: "betweenness 0.57, highest". "bridges: on no bridge." I don't know what that means, and it sounds like a joke about the barricade. Skip.

0.57 against the next one at 0.177. That's three times. Valjean I'm sure about. You don't need a network for that -- the book is about him -- but fine, the network agrees with the book, which is at least a sanity check.

**Trying to see if the order holds.** In Cytoscape I'd drop the nodes with one partner before I do hubs, same as dropping unconnected genes. There's a filtered result in here: "Filtered: 60 of 77 nodes, 1 step". Betweenness again: "on: filtered graph, 60 nodes, 1 component." Top nodes now: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073.

Myriel's gone. Not lower -- gone from the top five. That's what I thought. With the one-scene characters removed, he doesn't hold anything together.

And it says so up top, "on: filtered graph, 60 nodes". I didn't have to guess which network the numbers came from. And the "Details" opens a "Run record": "Brandes betweenness, exact", "Normalization: divided by (n-1)(n-2)/2 = 1,711 node pairs; n = 60, the filtered graph", "Scope: filtered graph, 60 of 77: after Filter to degree >= 2", "Weight conversion: None: value not used". With a Copy button. OK -- that's my methods paragraph for this bit, mostly. I'd rewrite it, but I'd rewrite it from this, not from memory. That I like.

But nothing on this screen says "Myriel was #2 before you filtered". I noticed because I happened to look at both. If I'd filtered first I'd never have known he was there.

"Every step in the top 5 is over the 1% tie line; the smallest, ranks 2 and 3, is 4.7%." So Gavroche vs Marius here is 4.7% apart. Is that sure? I don't know what would make it unsure. It's exact, fine, but exact on a network with 60 nodes and one choice I made two minutes ago. The number that moves the order is my filter, not the rounding.

And the value thing, again. The edges have a value that's "not used". If two characters are in 20 chapters together that should count for more than one. Would the order change if it used it? I'd have to click "Change..." and I don't know what I'd be choosing -- if it says "use as distance" or "use as strength" I'd guess, and I'd probably guess wrong. So I don't.

**My answer.** The characters: Valjean first, and I'm sure of that -- he's far ahead on everything, both measures, with and without the small characters. Then Gavroche and Marius, who are near the top on both measures and whether or not I filter; I'd say they're second and third, in that order, but I wouldn't bet much on Gavroche over Marius. Then Fantine, and Javert or Thenardier depending on the measure. Myriel is #2 on betweenness only because of his little circle of one-scene people; I'd leave him out.

How sure of the order: #1 certain. #2 to #4 I'd give as a group, not an order. Anything past that depends on which measure you pick, whether you drop the one-scene characters, and whether you use the co-appearance counts, and I only tried two of those three.

## After the task

**Single Ease Question: 5 out of 7.** Getting a ranking was quick, and the table's line comparing the two measures did the thing I usually do in Excel. It lost points because the confidence part was mine to work out: the "1% tie line" sentence tells me the numbers aren't tied but not whether the order would survive my own choices, Myriel's fall only showed up because I happened to look at a filtered run, and two of the screens were a protein network and a bank.

**Would you use this instead of Cytoscape?** "For this -- which characters, which genes -- the table with two measures side by side and 'at #2 they part' is better than what I do now, which is cytoHubba twice and Excel. And the run record is the first time a tool wrote down what it actually did, including the filter. But there's no MCC and no Degree in the list of measures, and 'top ten by MCC' is what my reviewers expect, so I'd still run cytoHubba to have the number to cite. And honestly, it told me Valjean is the main character of Les Miserables. I knew that. The one surprise was Myriel, and the surprise was that he's an artefact. That's useful -- that's the thing I'd want to catch in my hub genes -- but I found it by accident. So: for exploring, yes. For the paper, the hub table still comes out of Cytoscape, because that's what the protocol says and what I can cite."

## Problems observed

1. **Severity 3 -- Nothing tells her the ranking depends on her filter.** Myriel is #2 by betweenness on the full graph and absent from the top five after "Filter to degree >= 2"; the filtered result names its scope ("on: filtered graph, 60 nodes") but not that the order changed. She found it only by looking at both runs.
   Quote: "If I'd filtered first I'd never have known he was there."
2. **Severity 3 -- The confidence sentence answers a question she was not asking.** "Every step in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%" says the scores are not tied. She read 1.2% as "a coin flip", the opposite of the intended reading, and it says nothing about whether the order holds under her choices (filter, weight, measure).
   Quote: "If I measured a western blot and two bands were 1.2% apart I'd call them the same."
3. **Severity 3 -- Degree is not in the list of measures, and MCC is absent.** Centrality lists Betweenness, Closeness, Eigenvector, Harmonic, HITS, Katz and PageRank. Degree, her working definition of a hub, appears only as the canvas label rule and a table column; she could not run it as a result. With no MCC she would still run cytoHubba for a number to cite.
   Quote: "Where's Degree? That's the one everybody uses."
4. **Severity 2 -- The co-appearance count is ignored, and she would not dare change it.** "value not used yet. Change..." appears on the frame and every result. She suspected using it could change the order but would not choose a conversion she did not understand.
   Quote: "If it says 'use as distance' or 'use as strength' I'd guess, and I'd probably guess wrong."
5. **Severity 2 -- "Compare rankings..." opens a different network.** From the Les Miserables table the link opens a comparison of a 3,093-account payments network; she was lost and went back. (A gap in the mock, but it hid the one screen that might answer "how sure".)
6. **Severity 2 -- The result panel and inspector pages show only the protein network.** Asked about Les Miserables, she met "300 nodes, 3 components, MAPK1" and noticed at once. The moderator had to supply the framing; the Les Miserables result panel exists only for the filtered graph.
7. **Severity 1 -- Group legend is bare numbers.** "2, 8, 4, 1, 3, 5, 0, Other" with no name or source; she assumed it was someone's imported clustering.
8. **Severity 1 -- "bridges: on no bridge" in the inspector means nothing to her.**
9. **Severity 1 -- Scores have no unit.** 0.1379, 0.570: she did not know what the number is a fraction of until the run record's normalization line, which she found only by opening Details.

What worked for her: the canvas says how its labels were chosen ("the 18 characters with the most connections"); the "Exact" tooltip admits it "does not say the ranking is meaningful"; the table puts degree and betweenness side by side with ranks and says in one line where they agree and where they part; every result names the graph it was run on; and the run record, with Copy, writes down the method, normalization, filter and weight she would otherwise reconstruct from memory for the methods section.
