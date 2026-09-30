# Session: what groups are there, and how is the biggest one different -- Jordan, marketing network analyst

Participant: Jordan (study/personas/marketing-analyst.md), a growth-marketing analyst who does "the network stuff" one or two days a week. Out of her domain: this is a protein network, not a mention network. She has seen this task once before, on an earlier version of the mocks.

Task as given: "On the protein network, what groups are there, and how is the biggest one different from the rest?"

Screens used, in the order she reached them, all at 1440 by 900 (her laptop):

- the finished Louvain result (shots/tasks/groups-differ/01-results-panel-louvain.png)
- the communities table (shots/tasks/groups-differ/02-results-panel-louvain-table.png)
- the style stack with a betweenness color open (shots/tasks/groups-differ/03-styles-list.png)
- the DNA repair set in the inspector (shots/tasks/groups-differ/04-inspector-set.png)
- the node table sorted by PageRank (shots/tasks/groups-differ/05-table-dock-ranked.png)
- the Community 4 inspector and a row chosen from it (shots/record/r6-jordan-gd-inspector-group.png, shots/record/r6-jordan-gd-inspector-group-row.png)
- the "Compared with the rest" section on Community 1 (shots/record/r6-jordan-gd-styles-list-group-compare.png)
- the "Community 1 and the rest" table tab, drawn on a payments network (shots/record/r6-jordan-gd-comparison-group-vs-rest.png)

## Think-aloud

**1. The finished run.** "Right, I've done this one. Louvain's already run. 0.4 seconds, CPU, fine. Ten communities, two of them single proteins, so eight real groups. Legend: Community 1, 62. Community 2, 43. Community 3 and 4, 36 each. Six more."

"Still 'Community 1'. Still 'the file's modules 0.663'. I know what that means now because I guessed it last time, but a new person would trip on it exactly like I did. Nothing's changed up here that I can see."

**2. The communities table.** "Communities table, one click, same as before. Here's my answer to the first half: Ribosome, Proteasome, Complex I, Spliceosome, MAPK signaling, TGF-beta, Cell cycle, DNA repair, plus two unassigned loners. The names are still in the last column, in grey. The first column still says Community 1. I'd still have to retype 'Ribosome' into the legend in PowerPoint."

"The shape of the biggest one is right there if you read across: 62 proteins, 93 edges out -- the most of anyone -- and density 0.123, the lowest. The others go 0.165 to 0.256. So it's the biggest, the loosest, and the one that leaks most into other groups. I got that by eyeballing a column, same as last time. There's no sort arrow showing on density, but I assume I could click the header."

"The fold change column says '+0.02 vs +0.09'. Mean. I'm going to remember that word this time, because last time the other panel said median and I got two different numbers."

"Is there anything to click on the row itself? I don't see a menu or a little dots button. I'd probably right-click it out of Excel habit. Don't know if that does anything."

**3. A wrong turn: the colors page.** "This one's all brown and orange -- betweenness as color, 'Stress response study', graph 'ppi-core-300'. That's not about groups at all. Also -- different project name again from the other screen, 'Human protein interactions'. Same 300 nodes, 1,262 edges, so I'll assume it's the same data. I'd back out of this."

**4. The DNA repair set.** "Oh, this is new. There's a big button on the right: 'Compare with the rest'. With a label. Good, that's what I'm looking for, a button that says what my task says. Last time I had to dig for this."

"But hang on, this is DNA repair, 30 nodes, 'Rule set'. That's not the biggest group, that's a set someone made from the module column. I want Community 1."

"And the map's colors are different now. Ribosome is light blue here. On the Louvain map, Community 1 -- which IS mostly ribosome -- was the orange-yellow one, and light blue was Community 2, which is the proteasome. Here the proteasome is orange-yellow. They've swapped. If I put the Louvain screenshot on slide 3 and this one on slide 4, somebody is going to say 'wait, I thought orange was ribosome'. That's the 'what's purple' problem, except worse, because it's the same two colors meaning opposite things."

**5. Community 4, then stepping to Community 1.** "Clicked Community 4 in the legend. OK, now the group itself on the right: 'Community 4', and a little '4 of 10' with arrows. So I'd click the left arrow three times to get to Community 1? Fine, or click Community 1 in the legend -- that's quicker."

"This panel has the Compare with the rest button too now, and Keep as set, and the member list. Last time the two group panels didn't match; now they both have the button. Good."

"Attributes: size 36, edges inside 104, edges out 44, and 'log2FoldCha...' -- cut off -- minus 0.10, 'mean; rest of graph +0.10'. Matches the table row. Fine."

"Clicked PRPF8 in the member list. Table pops up underneath filtered to Community 4, 36 nodes, 'Show filtered graph'. That's handy -- that's my 'copy the members of this segment' list. Didn't need it for this task though."

**6. The Community 1 panel with the box plots.** "This is the one from last time. 'Compared with the rest. Descriptive only; no statistical test.' Box plots. log2FoldChange median group -0.02, rest 0.05. The table said mean +0.02 vs +0.09. Still two numbers for one thing on the same screen set. At least I know why now. My VP won't."

"rank-biserial r. Still no idea. Still skipping it."

"So which one is the 'Compare with the rest' button? This section, or something else? The button says compare, this section says compared. I'd assume the button opens this."

**7. Pressing Compare with the rest.** "The screen I'm shown for what that button does is... a payments network. 'April data, 65 communities, accounts.' Not my proteins. OK, I'm told to imagine it with mine."

"It opens as a tab in the table, 'Community 1 and the rest', with a Save comparison and Done. Columns: accounts, edges inside, edges out, density, median PageRank, middle half. Then a row: 'Community 1 against the rest: 0.13 times, 0.066 times, same edges, 3.8 times, 0.90 times.' And then -- finally -- 'In words: Community 1 is 0.13 times the size of the rest, with density 3.8 times the rest and median PageRank 0.90 times the rest.'"

"The 'in words' line is what I asked for last time. A sentence. I could paste that. I'd rather it said 'about an eighth the size' than '0.13 times', and '0.066 times the edges inside' is just a weird number, nobody talks like that. But it's a sentence and it leads with size and density, which is where the difference actually was for me."

"Here's my problem though. On my proteins, the table told me Community 1 is the LOOSEST group -- lowest density of the eight. If this tab worked the same way on proteins, 'the rest' is all the other 238 proteins lumped together, including all the links between the other groups. That lump is going to be really sparse. So Community 1 would come out as, what, three or four times denser than the rest? The table says it's the least tight group and this would say it's much tighter than the rest. Both true, I guess, but that's two opposite headlines about the same group. I'd have put the wrong one on the slide."

"When I say 'how is it different from the rest' I mean 'from the other groups'. Not 'from everybody else mashed into one bucket'. For me the comparison I want is Community 1 next to the average group, or next to each group. The table actually does that better, because it lists all ten side by side."

Observer note: on the protein data the rest of the graph has 238 proteins and 1,262 - 232 - 93 = 937 edges inside it, over 28,203 possible pairs, a density of about 0.033. Community 1's 0.123 is about 3.7 times that. So a protein version of this tab would say "density 3.7 times the rest" for the group the communities table shows as the least dense of the eight real groups. Her suspicion is correct.

**8. The ranked node table.** "Nodes tab, sorted by PageRank. community and module side by side. AKT1, Community 1, module 'Unassigned'. So the hub of the ribosome group isn't a ribosome protein. Last time I didn't trust that. It's still not explained, but at least I can see it plainly in a row now. If this were our brand handle sitting in the wrong segment I'd want the tool to tell me why before my VP asks."

**9. Off-topic.** "You know what, the VP reads the first slide and nothing else. So whatever I write for 'how is it different' has to be one line and has to not contradict slide 2. Which is why the density thing bugs me. Also -- last quarter the listening tool relabelled all our clusters between two exports and I had to redo the deck. Same colors, different clusters. So the color swap here is not a small thing to me, I've been burned by exactly that."

**10. Scale.** "300 proteins, 0.4 seconds. My mention network is 40,000 accounts. Louvain says CPU, no WebGPU version. Nothing tells me before I press Run whether that's ten seconds or ten minutes. Same question as last time, no answer on these screens."

## Her answer to the task

"Eight real groups plus two loner proteins. They line up with the file's own labels: Ribosome, Proteasome, Complex I, Spliceosome, MAPK signaling, TGF-beta, Cell cycle and DNA repair. The biggest is Community 1, mostly ribosome, 62 proteins. Compared with the other groups it's the loosest -- density 0.123, the lowest -- and it has the most links out to other groups, 93. On the data itself -- fold change, degree -- it's about the same as everyone else. I got all of that from the communities table. I would not use the 'Compare with the rest' tab for the slide until I knew it wasn't going to tell me the opposite about density."

Correct in substance. She reached it from the communities table again, not from the new comparison.

## Single Ease Question

**5 of 7.** "Finding the groups is easy. The new Compare button is where I'd look and the sentence it gives is what I wanted. But the example was on other data, 'the rest' isn't what I mean by the rest, the colors flip between two screens, and I still have mean on one panel and median on another. I'm doing the same amount of cross-checking as last time."

## Would she use this instead of her current tool?

"For finding and naming segments and getting the table out: yes, over Gephi and over the notebook pivot table. The communities table with the name column and Export is still the best thing here. Instead of Brandwatch: no, Brandwatch collects the data; I'd run this next to it. The 'how are they different' part I'd still do by reading the table myself. The Compare tab is closer than last time -- it talks in words now -- but I'd want it to compare the group with the other groups, and to give me the same number the table does."

## Problems observed

1. "Compare with the rest" compares a group with everything else pooled into one bucket. For the biggest protein group that would report density about 3.7 times the rest, while the communities table shows it as the least dense of the eight real groups. She reads "the rest" as "the other groups", expected the opposite headline, and said she would have put the wrong one on the slide. Severity 3.
   Quote: "The table says it's the least tight group and this would say it's much tighter than the rest... two opposite headlines about the same group."
2. The same group gets opposite colors in two stylings: Ribosome is amber as Louvain's Community 1 but light blue in Module color, and Proteasome is light blue as Community 2 but amber in Module color. For someone who puts two screenshots on consecutive slides this is the missing-legend problem, made worse. Severity 3.
   Quote: "it's the same two colors meaning opposite things."
3. The fold change is still a mean in the communities table and the group panel (+0.02 vs +0.09) and a median in the "Compared with the rest" box plots (-0.02 vs 0.05). The comparison tab's design says the two surfaces carry the same statistic, but the only protein version she could open still shows the median. Severity 3.
4. The group-against-the-rest tab is drawn only on a payments network (accounts, April data). On the protein task she had to imagine it with her data, and could not check its numbers against the communities table. Severity 2.
5. The segment name is still in the last column in grey. The row, the legend and the inspector heading all still say "Community 1", so a screenshot of the map carries no names. Severity 2.
6. There are two things called compare for a group: the "Compare with the rest" button, which opens a table tab, and the "Compared with the rest" section with box plots and rank-biserial r. She could not tell whether the button opens the section or something else. Severity 2.
   Quote: "The button says compare, this section says compared. I'd assume the button opens this."
7. The ratios are exact but not how people talk: "0.13 times the size", "0.066 times the edges inside". She wanted "about an eighth". Severity 1.
8. On the protein communities table nothing on a row shows it has a menu; she would only find "Compare Community 1 with the rest" by right-clicking out of habit. Severity 1.
9. The project and graph names still differ between screens ("Human protein interactions / Interactions" and "Stress response study / ppi-core-300"). Severity 1.
10. The "log2FoldChange" label is cut to "log2FoldCha" in the group's Attributes, and "Created from" is cut to "Louvain run, conf...". Severity 1.
11. Nothing before Run says how long Louvain would take on 40,000 accounts on the CPU. Severity 1.

## What she liked

- A labeled "Compare with the rest" button on the group's own panel, where she looked first, and the same button on a set: "that's what my task says".
- The "In words" sentence under the comparison, leading with size and density: "A sentence. I could paste that."
- The Community 4 panel now has the button, Keep as set and the member list together; the two group panels no longer disagree about what they offer.
- Choosing a member filters the table to the group ("Community 4: 36 nodes"), which is her list of the segment's members.
- The communities table is still the answer: names, edges out and density side by side, with Export table.
