# Session: what groups are there, and how is the biggest one different -- Jordan, marketing network analyst

Participant: Jordan (study/personas/marketing-analyst.md), a growth-marketing analyst who does "the network stuff" one or two days a week. Out of her domain here: this is a protein network, not a mention network.

Task as given: "On the protein network, what groups are there, and how is the biggest one different from the rest?"

Screens used, in the order she reached them: the main menu with Algorithms open (shots/screens__results-panel--catalog.png), the finished Louvain result (shots/record/screens__results-panel--louvain.png), the communities table (shots/screens__results-panel--louvain-table.png), the group inspector for one community (shots/screens__inspector-group.png, shots/record/screens__inspector-group-row.png), the "Compared with the rest" section (shots/screens__styles-list-group-compare.png, shots/screens__styles-list-group-columns.png), and a glance at the comparison surface (shots/screens__comparison.png). All at 1440 by 900, which is her laptop screen.

## Think-aloud

**1. The menu.** "OK, proteins. Not my world, but groups are groups. I'd normally look for a button that says 'Communities' or 'Find groups'. There isn't one on the canvas... there's a hamburger. Algorithms, and then -- Community, with Girvan-Newman, Label propagation, Leiden, Louvain. So it's the algorithm-name list again. I know Louvain from Gephi, that's the one the YouTube tutorial used, so I'd click Louvain. If I didn't know the name I'd be stuck: nothing here says which one to pick or why there are four. Gephi at least only gives you one."

"The panel on the right already says 'components 3'. Is that the groups? No -- components is 'things not connected at all', I remember that. Fine. I'd not answer the task with that."

**2. The finished run.** "It ran, 0.4 seconds, great, no spinning wheel. Colors are on. Legend says Community 1 62, Community 2 43, 3 and 4 36, '6 more'. So ten groups. The right side says '10 communities', modularity 0.716, 'the file's modules 0.663', largest 62 proteins, single proteins 2, no interaction."

"'The file's modules' -- I had to read that twice. I think it means the file came with its own grouping and this is how good that grouping scores. So the tool found a better split than the file had? I'd guess that. I wouldn't put it on a slide without asking someone."

"Ten groups, but two of them are single proteins with nothing attached. So really eight groups. I'd rather it just said that: 'eight groups, plus two loners.' That's the sentence I'd say to my VP."

"'Seeded' with a little i. The hover says another seed can place some proteins differently. OK, so this is the thing I'm suspicious of -- counts that change every run. At least it admits it. Would I rerun it with another seed to check? Probably not today. I'd want a button that says 'check how stable this is' and just does it."

"Community 1, 2, 3... these names are useless. Brandwatch would at least give me 'cluster 7' with top keywords. Where do I see what's in them?"

**3. Communities table.** "There's a link, 'Communities table'. Clicked it. Oh, this is good. One row per group: size, edges inside, edges out, density, something called log2FoldChange, the hub, and 'module -- from the file; most members'. Community 1 is Ribosome, 56 of 62. Community 2 Proteasome 40 of 43. Complex I, Spliceosome, MAPK signaling... So THAT is the name column. That's the thing I actually wanted: a name for each segment from what its members have in common. I'd put this straight in the messaging doc -- well, if these were customers."

"Except it's hidden in the last column, in grey 'from the file'. And the first column still says Community 1. Why doesn't the row just say 'Ribosome (Community 1)'? The legend on the map still says Community 1, Community 2. If I screenshot the map for a slide, it's back to 'what's orange?'."

"The canvas got squeezed to the top half when the table opened. On the laptop the map is now a strip with the legend sitting on top of the pink group. I'd live with it because the table is what I need, but I wouldn't screenshot the map like this."

"Export table... is right there. Good. That's my hand-off, the table of groups as CSV. I didn't click it, but I believe it."

**4. So how is the biggest one different?** "Looking across the row. Community 1: biggest by far, 62. Edges out 93 -- the most of anyone. Density 0.123 -- the lowest in the table; the others are 0.16 to 0.26. So it's the biggest and the loosest, and it talks to the other groups the most. That's actually my answer, from the table alone, and I got it by sorting it in my head, not from anything the tool told me."

"Its hub is AKT1. Hmm, on the map AKT1 sits in the middle of everything, not in the orange blob down on the right with RPS8 and RPL28. I don't know biology, but if this was our brand handle sitting in the wrong cluster I'd stop trusting it. I'd want to click AKT1 and see why it landed in Community 1."

"log2FoldChange: '+0.02 vs +0.09'. I don't know what that column is. Something the file came with. Community 1 is lower than the rest, by a bit? No idea if that's a lot."

**5. The group itself.** "I clicked the Community 1 row. The note says that selects the group and the inspector shows it. On the right I get 'Community 1, Community', created from Louvain run seed 7, size 62, edges inside 232, edges out 93, density 0.123. Same numbers as the table, good, they match. That matters to me -- the dashboard-says-4,000-download-says-3,100 thing."

"Then 'Compared with the rest'. First line: 'Descriptive only; no statistical test.' OK, honest. I like that it doesn't pretend. Then these little box things with dots. Orange is the group, grey is the rest. log2FoldChange median group -0.02, rest 0.05. Degree median 9 vs 8. 'rank-biserial r -0.02, effect size, not a significance test.'"

"Wait. The table said log2FoldChange '+0.02 vs +0.09'. This says '-0.02' and '0.05'. Different numbers for the same thing. OK -- the table header says 'mean', this says 'median'. I only worked that out because I went back and read the tiny grey word under the column header. My VP would not. Which one goes in the report? This is exactly what I get burned by."

"Rank-biserial r. I skipped that. I don't do formulas. 0.14 on degree. Is that big? The page doesn't tell me in words. I'd want it to say 'about the same' or 'a bit higher' next to it. As it is, I'd have to Google rank-biserial, and I won't."

"The sliders button lets me pick columns: log2FoldChange, degree, betweenness, pagerank. I added betweenness -- 'bridge score', that I care about. Group 0.0047, rest 0.0037, r 0.08. So the biggest group is maybe very slightly more 'in between' than the rest. Honestly, all three say: not really different. The note in the design even says the difference is near zero and that's a finding. Fine, I agree -- but the tool never SAYS that to me in a sentence. I had to read three boxes and decide myself that 0.08 and 0.14 and -0.02 are all 'nothing'."

"What it doesn't do: compare it with the other groups on the things that actually differ -- size, density, edges out. Those are in the table, not in this panel. The panel compares on data columns; the table has the structure. So the answer to 'how is it different' is split across two places, and the panel -- the one that looks like it's answering the question -- is the one that says 'not much'. The table is where the difference is."

"The two group screens don't look the same either. When I looked at Community 4 in the other screen, I got Keep as set, a member list sorted by degree, Appearance, and no 'Compared with the rest'. When I look at Community 1 here I get the comparison but no member list. And the project is called 'Human protein interactions' on one and 'Stress response study' with a graph 'ppi-core-300' on the other. Is it the same data? I'd assume yes, but I'd be asking."

"'Enrichment analysis isn't part of graphty. Copy members.' Fine, whatever enrichment is. For me that would be 'copy the 62 handles into the brief', which is what I'd want. Good."

**6. Comparison surface.** "There's a Compare with... in the result panel and a whole comparison page. I looked: it's PageRank against betweenness on some payments data -- that's comparing two scores, not two groups. Not for this task. I'd have clicked it thinking it compares groups, and backed out. The table notes mention a 'Between groups' view of the communities tab, but I never found anything that opens it."

**7. Off-topic.** "Honestly this is the step I do in the notebook my colleague set up -- the clustering, then a pivot table in Excel with average engagement per cluster. And half the time the listening tool's cluster labels don't match what the notebook says, and since Brandwatch lost Instagram the clusters are mostly X accounts anyway. So the table here with a name column and edges out, already done -- that saves my pivot table. The box plots don't save me anything; nobody on my team reads a box plot."

**8. Scale.** "300 proteins in 0.4 seconds is nice. What happens with 80,000 accounts? The run record says Louvain has no WebGPU version, CPU only. I'd want it to tell me before I click Run how long that will take. It didn't say anything here because it's tiny."

## Her answer to the task

"Eight real groups plus two single proteins nobody connects to. They line up with the file's own labels: ribosome, proteasome, complex I, spliceosome, MAPK, TGF-beta, cell cycle, DNA repair. The biggest is Community 1, mostly ribosome, 62 proteins. It's different mainly in shape: it's the loosest group -- lowest density, 0.123 -- and it has the most links out to other groups, 93. On the data columns -- that fold-change thing, degree, the bridge score -- it's basically the same as everyone else. I'm fairly sure of the shape part. I'm not sure what I'd say about the fold change, because the table and the panel gave me two different numbers."

Correct in substance: the structural difference (lowest density, most edges out) and the "no real difference on data columns" reading match the screens. She reached it from the table, not from the comparison panel.

## Single Ease Question

**5 of 7.** "Getting the groups was easy once I knew to click Louvain. Finding the names and the edges-out took one link. The 'how is it different' part I had to piece together myself from two places, and the panel that's supposed to answer it spoke statistics at me and gave me a different number from the table."

## Would she use this instead of her current tool?

"For this step -- find the clusters, name them, get a table out -- yes, over Gephi, because the table with the name column and the Export button is the thing Gephi never gave me, and it's in the browser. Instead of Brandwatch, no, not yet: Brandwatch collects the data, this doesn't. I'd use it next to Brandwatch, with the notebook out of the loop. The group comparison panel I'd skip until it tells me in plain words whether the difference is big, and until the legend says the group names instead of Community 1."

## Problems observed

1. The segment name is buried. The "module" column (Ribosome 56 of 62) is the most useful thing on the screen for her, but it sits last, in grey, and the row, the legend and the inspector all still say "Community 1". A screenshot of the map carries no names. Severity 3.
2. Mean in the table, median in the panel, same column, different numbers (+0.02 vs -0.02 for the group; +0.09 vs 0.05 for the rest). She noticed, resolved it only by reading the small grey profile word, and still did not know which to report. Severity 3.
3. "Compared with the rest" never states its conclusion in words. Rank-biserial r of -0.02, 0.14, 0.08 means nothing to her; she had to decide herself that all three meant "no real difference". Severity 3.
4. The real difference (size, density, edges out) lives in the communities table; the comparison panel only covers data columns. The panel that looks like the answer says "not much", and the answer is elsewhere. Severity 2.
5. Two group inspectors that disagree: the Community 4 inspector has Keep as set, members and Appearance but no comparison; the Community 1 inspector has the comparison but no members. The project name and graph name also differ between the two screens ("Human protein interactions / Interactions" against "Stress response study / ppi-core-300"). Severity 2.
6. Choosing the method means choosing among four algorithm names (Girvan-Newman, Label propagation, Leiden, Louvain) with no plain-words hint. She only chose because she knew Louvain from a Gephi tutorial. Severity 2.
7. "the file's modules 0.663" beside modularity is unreadable to her on first sight; she guessed its meaning. Severity 1.
8. A hub (AKT1) that sits in the centre of the map rather than inside its group's blob made her doubt the grouping, and nothing on screen explains it. Severity 1.
9. Opening the table halves the canvas at 1440 by 900 and the legend then covers part of a group. Severity 1.
10. "Compare with..." and the comparison surface compare two scores, not two groups; the "Between groups" view the table notes mention has no drawn entry point. She would have clicked the wrong thing. Severity 1.

## What she liked

- "Communities table" in one click, with edges out, density and a name column: "that saves my pivot table."
- The numbers in the inspector matched the table exactly (size, edges inside and out, density).
- "Descriptive only; no statistical test" -- the tool does not pretend to prove anything.
- "Seeded" admits the grouping can change with another seed.
- Export table on the communities tab and "Copy members" on the group.
