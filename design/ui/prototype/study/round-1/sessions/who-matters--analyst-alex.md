# Who matters -- session with Analyst Alex

Participant: Analyst Alex (operations data analyst; uses NetworkX for the numbers and Gephi for the picture).
Task as given by the moderator: "Your manager wants the people who matter most in this network, and how sure you are."
Screens used, in order: the Results panel (several of its states, treated as what happens after each click), the Inspector (one node selected), the frame at rest.
Outcome: finished, with difficulty. He named a top five and was confident about one of them.
Single Ease Question: 4 of 7.

## Transcript (thinking aloud)

**Results panel, first look (a run already going, "Patent citations").**

"OK. Patent citations. 124,318 nodes, 1,480,221 edges on the right. I don't know those numbers, I didn't load this, so I'll take them. Nothing on the canvas though. Down at the bottom: '124,318 nodes not drawn: more than this browser draws at once'. So... no picture. My manager is going to want a picture. Fine, park that."

"Left side there's a list -- Catalog. Centrality, Betweenness, 'hours'. Closeness, 'hours'. PageRank, 'under a minute'. Oh, that's actually -- that's the thing I want. Tell me before I click that it's going to eat my afternoon. Gephi never told me that. I'm writing that down as a plus."

"Something's already running. PageRank, 'Running on WebGPU, under a minute', progress bar, Cancel right there. Good. I can see it's alive. I don't know what WebGPU is but it sounds fast."

"The box in the middle. 'Options wait for Run' -- grey bar, not sure what it's telling me. Damping 0.5 and a note that it 'has not run'. I didn't change damping. Someone did. I'd leave that alone. I don't touch damping."

"For 'who matters' -- honestly my first instinct is betweenness. Who's the bottleneck. So I click Betweenness in the catalog even though it says hours."

**Results panel, betweenness refused.**

"Right, so it didn't just start and hang. Red bar: 'Takes hours; exact runs stop at 30 seconds.' Stop at 30 seconds says who? Is that a setting? Anyway it gives me three options. 'Sampled, 50 sources, under a minute.' 'Exact on Drug patent...' -- cut off, I can't read what that is. 'Exact on the full graph, hours.' 'Fits the budget' -- what budget? I never set a budget."

"I'm relieved it didn't hang, genuinely. Four hours over lunch is exactly what I don't want. But 50 sources out of 124,000? That feels like nothing. How close is that to the real betweenness? That is literally the second half of my manager's question -- how sure am I -- and it doesn't say. I'll click Details."

"...Details doesn't go anywhere. OK, prototype. But if that's where the 'how accurate is sampled' answer is supposed to live, I'd want it right there, not behind a link."

"I'll take the sampled one. It's the blue button."

**Results panel, sampled betweenness not run yet.**

"Sample size 50, Seed 7. Oh -- there's a seed. Good. So if I rerun it I get the same thing? I'd assume so. It doesn't say 'same seed, same answer' but I'd bet on it. Still nothing saying how rough 50 is. I'd bump it to 500 maybe, but I don't know what that costs, the 'under a minute' next to Run didn't change in my head. I leave it at 50 and press Run."

**Results panel, finished (the screen now shows a smaller network, "Human protein interactions", 300 nodes).**

"Hang on, this is a different network. Proteins. 300 nodes, 1,262 edges, 3 components. OK, the moderator says that's just the mock -- fine, I'll pretend this is mine. 'People' are proteins today."

"Now this is the good bit. The graph's painted, orange to dark brown. Labels on the big ones: MAPK1, TP53, AKT1, YWHAZ. And the box has a 'Top nodes' list: 1 MAPK1 0.1379, 2 TP53 0.1139, 3 YWHAZ 0.0695, 4 CDK1 0.0687, 5 AKT1 0.0642. That is basically what I'd paste. MAPK1 and TP53 are way ahead, then a cliff, then three bunched together. That cliff is something I can say out loud."

"Top line: 'on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected.' 'Exact' -- good, that answers the sampled worry for this one at least. I like that it says undirected and unweighted, that's the first thing someone in the meeting will ask."

"The histogram -- 'bar height: square root of the count'. I'm not going to explain a square-root histogram to a director. I'd skip it. 'middle 0.0038, highest 0.138, zero 10 nodes'. OK, so most of them are basically zero and a handful carry everything. That's actually useful as one sentence."

"'295 more in the table.' What table? It's not a link, and I don't see a table anywhere. My manager said top twenty, not top five. And I need it in Excel. The Export button top right, maybe? I'd try that next, but I'm not sure it gives me this list or the whole graph."

"Bigger dots are the ones with labels, so the big ones are the betweenness ones -- wait. Legend down in the corner: 'Betweenness color' and then 'Degree size'. So size is degree, colour is betweenness. I would have told my manager 'the big ones are the bottlenecks' and that's wrong. The legend's there, but I only saw it because I went looking. In Gephi I'd have set both myself so I'd know."

"Colour-wise, orange to brown, one colour, I can read it. Log scale, says so. Fine."

"How sure am I? What I actually want is: does betweenness agree with degree and PageRank at the top? If three measures give me the same top five, I'm sure. If they don't, I have to pick and defend it. This panel only shows me one measure. I'd have to run PageRank and degree and then compare them myself -- in Excel, again."

**Inspector, TP53 selected.**

"I clicked TP53 on the graph. Right side: degree 32, '#2 of 300'. betweenness 0.1139, '#2 of 300'. pagerank 0.01137, '#2 of 300'. Oh, that's nice. Second on all three. That's the sentence: 'TP53 is second on every measure we looked at.' That's the 'how sure' answer, for one protein."

"But I only get it one node at a time. I'd have to click MAPK1, YWHAZ, CDK1, AKT1 and write down each rank. For twenty that's twenty clicks and a notepad. That's the thing that should be a table with one column per measure."

"Connections 32 neighbours, member of DNA repair set. Module colour is DNA repair. OK, context, but not what I'm asked."

**Frame at rest (Les Miserables).**

"Different data again, the characters one -- I know this one from the Gephi tutorial. Valjean in the middle, big. Group colour legend says 2, 8, 4, 1, 3, 5, 0, Other. Numbers. That's modularity class 4 all over again; I'd have to rename them before anyone sees it. Size by degree, 1 to 36. So Valjean's the hub. Statistics on the right: 77 nodes, 254 edges, 2 components, 1 isolate. If I started here, I'd go to Results on the left rail to run something. Nothing on this screen tells me 'who matters' by itself, which is fine, it's the at-rest screen."

## What he would tell his manager

"By betweenness -- who sits on the most shortest paths -- MAPK1 and TP53 are well ahead of everything else, then YWHAZ, CDK1 and AKT1 as a second tier. It's an exact calculation, unweighted. TP53 is second on degree, betweenness and PageRank, so I'm confident about it. I haven't checked the others against the other measures yet. On the big patent graph I'd only have a sampled version and I can't tell you how accurate that is."

## After the task

**Single Ease Question: 4.** "Getting the top five was quick, maybe three clicks, and it didn't hang, which is more than I can say for Gephi. The 'how sure' part is where it fell apart: the sampled run doesn't tell me how rough it is, the Details link went nowhere, and comparing measures meant clicking node by node. And I still haven't got my top twenty in a spreadsheet."

**Would he use it instead of his current tool?** "For the picture half, maybe. The time estimates next to each algorithm, and refusing the four-hour run instead of freezing -- that's the stuff that burns me every month. Top nodes right there after the run, graph already coloured, no styling rule to build. But I'd still check the numbers against NetworkX before I trust it, and until I can get the full ranking out to Excel with the measures side by side, I'm doing the 'how sure' part in Python. So: alongside, not instead. Not yet."

## Problems observed

1. **No accuracy statement for a sampled run** (Results panel, refused and not-run states). "Sampled, 50 sources" on 124,318 nodes gives no sense of how close it is to the exact answer, so the participant could not answer "how sure". Severity 3.
2. **Only one measure at a time in Top nodes; cross-measure agreement only per node in the Inspector** (Results panel finished; Inspector). The strongest confidence evidence ("#2 of 300" on three measures) was found by accident and costs one click per node. Severity 3.
3. **"295 more in the table" leads nowhere visible** (Results panel finished). No link, no table on screen, no obvious path to a CSV of the ranking. Severity 3.
4. **Details link is dead** (Results panel, refused and finished). The one place the explanation might live could not be opened. Severity 2 (prototype gap, but it hid the confidence answer).
5. **Size is degree while colour is betweenness** (Results panel finished). The participant first read the biggest nodes as the betweenness leaders; the legend corrected him only after he looked for it. Severity 2.
6. **"Fits the budget" / "exact runs stop at 30 seconds" unexplained, and a route name truncated** ("Exact on Drug patent...") (Results panel refused). Severity 2.
7. **The large graph is not drawn at all** (Results panel on 124,318 nodes). No picture for the manager on the real-size network. Severity 2.
8. **Community legend names are bare numbers** (frame at rest: 2, 8, 4, 1...). Severity 2 (not on the task path).
9. **Square-root histogram** (Results panel finished). "bar height: square root of the count" read as something he would never explain to a director; skipped. Severity 1.
10. **Dataset changes between screens** (patents, proteins, Les Miserables). Mildly disorienting; a prototype artifact. Severity 1.
