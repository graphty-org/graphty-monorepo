# Session: a graph too big to draw -- the knowledge graph engineer

**Participant:** Dr. Min-ji Kim (fictional composite), knowledge graph engineer and ontologist at a financial-services company; GraphDB workbench, SPARQL in notebooks, Protege; has given up on Neo4j Browser, WebVOWL and Gephi's RDF plugin. She did this task in an earlier round and gave it 5 of 7.
**Task as given by the moderator:** "This citation data is too big to draw. Is anything here worth a look?"
**Screens used, in order:** the frame past the drawing limit (not drawn, isolates opened, the filter steps list, Keep top rows, the 200 kept and drawn, the rule editor, narrowed and drawn, the two-step top-3-with-neighbors route, the no-WebGPU Layout row); the find screen (a pasted list of patent ids past the drawing limit, then a cross-project "bring in its links"); the table dock (past the drawing limit, getting rows out); the selection-over-cap screen (select all on a 3,000-account graph). All at 1440 x 900 in the study view (design notes hidden).
**Renders:** `shots/r6-minji-tbd-pdl-not-drawn.png`, `-isolates`, `-narrow`, `-keep`, `-kept`, `-rule`, `-drawn`, `-sample`, `-cpu2`; `shots/r6-minji-tbd-find-s7.png`, `-s14`; `shots/r6-minji-tbd-td-limit.png`, `-out`; `shots/r6-minji-tbd-soc-e1.png` to `-e5`.
**Dataset on screen:** a patent citation sample, 124,318 patents and 1,480,221 citations. The find screen's last state, the export dialog and the selection screen switch to other datasets (a transfers graph, a protein interaction core).

## Transcript (thinking aloud)

**Before touching anything.** Citation data again. One predicate, "cites", directed, patents to patents. No literals, no rdf:type, so the only things I am judging are: does it tell me the truth about what it could not draw, can I check its numbers, and can I get from a count to the rows behind it. Last time two of those three were yes, and the third was a dead link on exactly the thing I wanted. I am looking for that first.

**Not drawn.** Same opening: "124,318 nodes not drawn. More than this browser draws at once (50,000). Every node is counted in Statistics and listed in the table." One button, "Narrow the graph...". Still the best first screen I have seen in a graph viewer. It declined before it froze. I still want to know whether 50,000 is measured on my machine or a constant; the sentence does not say and I would not trust "this browser" on an integrated-graphics laptop until I saw it change.

The Layout row now says "ForceAtlas2 -- Waits for a narrower graph" with a greyed play button. Good, that answers "is it laying out 124,000 nodes in the background and about to hang me?" It is not.

Recheck the arithmetic, because I do. Nodes 124,318, edges 1,480,221. Density 0.0000958: 1,480,221 over 124,318 times 124,317 is 9.58e-5. Directed, right. Average total degree 23.8: two times edges over nodes is 23.81. Right, and it now says "total", so I do not have to ask which degree. Weak components 3,912, largest 116,905, 94.0 percent. Right. "Weak" -- thank you, on a directed graph that word matters.

The degree chart: "Nodes with in-degree k or more, both axes log", In / Out / Total switch, "max 236". And under it: "In-degree 0, not on the log axis, 41,873. Never cited by a patent in this sample; the 2,406 isolates are among them."

That last clause is new and it is exactly right: it tells me the isolates are a subset of the zero bucket, so I do not add them twice.

But the thing that cost the most trust last time is still here. The chart says max in-degree 236. The table right beside it, sorted by citationsReceived, starts at 779. Last round the chart said 238; now it says 236 -- I will assume a corrected fixture, not a bug, but I noticed. Both columns read like "how often was this patent cited". The sentence that reconciles them -- citationsReceived counts citations from outside the sample -- is still only on the isolates selection, one click away. Nothing on this screen, not the column header ("citationsReceived, 0 to 779"), not the chart, says the two measure different things. I know the answer now because I was here before. A first-time reader of this screen would see a factor of three between two "citation counts" and stop trusting both. Strike one, same as last time, and it is the same strike.

**Where did the data come from.** Bottom of Statistics: "Last import patent-citations-s..." still truncated, and "Edges: directed, weight not set" with a chevron. I cannot read the file name in the one place that tells me provenance. I would widen the panel. Not fatal, still sloppy.

**Isolates.** I click "2,406". The table switches to "Selected: 2,406 nodes, the isolates -- Show full graph". The column header now says citationsReceived "0 to 46" for this selection, which is a nice touch: the range follows the rows. The inspector: edges between them 0, in-degree 0, out-degree 0, and the sentence: "None of these patents cites or is cited by another patent in this sample. Their citationsReceived counts citations from patents outside it."

Right sentence, wrong place, second time. It explains the whole 236-versus-779 puzzle. Move it to the column header of citationsReceived or under the chart and I stop complaining.

Worth-a-look item one, unchanged: 5997071, Electrical, cited 46 times outside, zero edges inside a 1999-2001 window. The sample boundary. Export and check.

"Create set from selection, Ctrl+G" in the inspector. Good: I can keep the 2,406 as a named thing instead of re-clicking. I would.

**The small components.** "41 nodes", "23 nodes", "19 nodes", underlined. The isolates link worked, so I click "41 nodes". Nothing. It is still a link to nowhere in this mock. I have been told, by the export screen further on, that there is a Components tab with one row per component and a "contains" column -- I saw it later on a protein dataset, "Component 1, 298, MAPK1, TP53 and 296 more". So I believe the product intends "41 nodes" to select those 41 and list them, the way isolates does. But believing and clicking are different. In the session, the thing I came for -- a 41-patent island that cites nothing in the main body -- is still one dead click away. Strike two, same as last time. I am not ending the session over it because I now think it is the mock and not the design, but I am writing it down.

**Narrow the graph.** The Filter steps popover: "No filter steps. Every number reads the full graph: 124,318 nodes, more than this browser draws at once." Suggested: "Keep top rows by citationsReceived... the table's first rows, in its order; you set how many" and "Neighbors of a node... a row you pick in the table, or find by name". "Add step". "Create rule set" in grey at the top; I still do not know what a rule set is as opposed to a step, and I still leave it alone.

The old "Top 3, with neighbors, favors hubs" is gone from the first list and replaced by "keep top rows". That is plainer. It is the table I am already looking at, cut at N. No hidden neighborhood.

**Keep top rows.** "Keep the first 200 rows, in the table's order, citationsReceived, Highest first. Row 200 has citationsReceived 358; 1 more patent also has 358 and is left out. Scope: Full graph, no steps above. 200 nodes, 288 edges, will draw." Button: "Keep these 200 rows".

The tie sentence is good. That is the thing every "top N" in every tool hides: where the cut falls and who sits on the boundary. My question is which of the two 358s it kept and why. By id? By file order? If I rerun this next month with a different file order, do I get a different patent? It should say the tie-break. Small, but it is the difference between a reproducible filter and an accident.

And a count before the commit again. 288 edges before I press anything. That is a LIMIT in the query, not on the display. Still the thing I like most here.

**The 200 kept and drawn.** Chip: "200 of 124K nodes, 1 step". Toast: "Filtered to 200 of 124,318 nodes -- Undo". The chip still rounds to 124K. The toast, the table scope line ("Filtered graph: 200 of 124,318 nodes") and Statistics are all exact; the chip, the one I glance at, is not. I said this last time. Please.

Statistics now open with a grey box: "Describes the 200 most cited patents, not a random sample. Density reads high: highly cited patents cite each other." And a "reads high" tag on density 0.00724. That is the honest framing I asked for. Isolates 16, weak components 21, largest 174 at 87.0 percent. 174 over 200 is 0.87. Right. In-degree 0 inside the 200: 72.

The canvas: a loose web with the patent numbers labelled on the big ones. Is position meaningful? It is ForceAtlas2, "Engine: WebGPU", and nothing tells me if it has converged. For triage I do not care; for a slide I would not use it.

Here is a small real finding: among the 200 most cited patents of the sample, 72 are cited by none of the other 199. The most-cited patents do not mostly cite each other. With the outside-the-sample explanation that is expected, but it is a question for whoever cut the sample.

**The rule editor.** "New rule. Keep Nodes / Edges. Where category is Drugs and medical AND citationsReceived >= 25. Scope: Full graph, no steps above. 612 nodes, 1,843 edges, will draw." Same as last time, and still right. Two remarks, both carried over: the attribute list gives me citationsReceived but I do not see in-degree as a field I can filter on. For a structural question I want the structural number, not the imported one. And "Nodes / Edges" as a toggle is fine; I would say "Keep nodes where", but that is taste.

**Narrowed and drawn.** Chip "612 of 124K nodes, 1 step" -- 124K again. Edges 1,843 of 1,480,221; density 0.00493 (1,843 over 612 times 611 is 0.00493, correct); isolates 31; weak components 44, largest 545 at 89.1 percent; "In-degree 0 ... 326. Cited by none of the other patents the rule keeps." "The rule keeps" -- relative to the filtered set, said in words. Good.

The table header: "category, 1 value", "citationsReceived, 25 to 779". The profile follows the filter. That lets me confirm the rule did what I wrote without reading 612 rows. I like it.

The canvas: a dense grey ball for the 545 and a tidy grid of the small pieces on the right. The grid of small components is the most useful part of the drawing: I can count them. The ball is a hairball and I would not show it to anyone.

**No WebGPU.** The filter steps list, "Filter to -123,706 612, category is Drugs and medical AND citationsReceived >= 25", with a pencil and a menu, and "Each count is what is left after that step; the small number is what the step took out." Beside it the Layout row on an older machine: "ForceAtlas2, Engine: CPU; WebGPU not available". Plain text, not a red banner. That is the line I will actually see on my laptop, and it is written the way I would want it: a fact, not an apology.

The step line is still the thing I would paste into a ticket. Someone could reproduce my 612 from that line alone.

**Top 3, then their neighbors, as two steps.** Chip "586 of 124K nodes, 2 steps". Grey box: "Describes the 3 most cited patents and all their neighbors, not a random sample. It favors hubs, so density and clustering read high." Density "reads high" 0.00260. Three stars around 6117075, 6031111, 5960121, with a few bridging patents. Splitting it into "keep top 3" and "add their neighbors" is better than last round's one opaque step: I can see that the neighborhood is a separate decision and undo it on its own.

One thing I did catch: this state has the degree chart switched to Total, "max 241", and the patent 6117075 is cited 779 times by citationsReceived. The hub's total degree in the neighborhood is 241. Same puzzle, third screen, still no sentence next to the number. I understand it; the stakeholder I show this to will not.

**Find, past the drawing limit.** I paste three patent numbers, "6117075 6231106 6287586". "3 results in all 124,318 nodes". Each result says "category Drugs and medical". The first is selected; the table row is highlighted; the inspector says "Not drawn: the graph is past the drawing limit. Counted everywhere." and lists grantYear 2000, category Drugs and medical, citationsReceived 779. "In no sets." And on the canvas a small card: "124,318 nodes not drawn. Narrow the graph...".

That answers my question from last time: it matches patent numbers, not only labels, and it takes a pasted list. That is how I actually work -- I come with ids from a SPARQL result. Good.

What is missing: the inspector for one patent shows the three imported attributes and no structure. No in-degree, no out-degree, not even "cited by N patents in this sample". For 6117075 I want to see "citationsReceived 779" next to "in-degree in this sample 236" on the same card. That one pair of numbers would have ended my 236-versus-779 complaint two screens ago.

The next find state switches to a transfers graph, "ACC-705989", no hits here, found in two other projects, "Bring in its links..." with a dialog that says what it adds and "Accounts are matched by id, so one already in April is not added twice." For my work that is interesting -- it is exactly the question I ask of any merge: matched on what key? -- and it says it. But it is not my citation task and I lost my thread for a minute. Not scored.

**The table past the drawing limit.** A different arrangement of the same data: "Nothing has been sent from this project" under the title -- good, confidential data, I read that. A set in the left panel: "Drug patents cited 25+, rule, 612". A column in the table for that set, "member" on the matching rows, and a style layer "Drug patents cited 25+, highlight". So a rule can be a set that stays live, not only a filter. That is closer to how I think: a named query I keep. "Export table..." on the dock.

Two problems. First, Statistics here say "components 3,912" and "largest component 94%". On the other screen the same numbers were "weak components" and "94.0%". Same data, two labels, one of them drops the word that tells me which kind of component. Second, the grantYear and citationsReceived headers each have an empty dashed box under them where category has a small bar chart. It looks like a histogram that did not load. I would not know whether to wait for it.

**Getting rows out.** The export dialog (on a protein dataset): Figure SVG, Image PNG, Table CSV, Findings report HTML. "Rows: All 300: Nodes, full graph. Order: pagerank, highest first. Columns: 10, hidden ones included. Methods: Always written beside it." A preview of the CSV header, which names the method and its parameters in the column name ("community (Louvain, weighted, seed 7, full ..."), and "Beside it: ppi-core-300-nodes-methods.txt".

That is the best export I have seen in a graph tool. The methods file beside the data is what I would have to write by hand for a governance report. For my isolates: select 2,406, export, get the list and the scope it was cut from. This is the step that turns "worth a look" into a ticket.

This screen also showed me the Components tab: one row per component, node count, "contains". That is what "41 nodes" should open. I want it on the citation data.

**Selection over the cap.** A 3,000-account transfers graph, drawn as grey hexagons of density with 14 flagged accounts in orange. Select all: "3,000 nodes, 9,113 edges" in the inspector, one outline round everything on the canvas, and a badge "12,113". I stared at 12,113 for a while. It is 3,000 plus 9,113, nodes plus edges. The badge does not say so. Every count on this product has been labelled nodes or edges except this one, and it is the one sitting on the canvas. Label it or split it.

Then Ctrl+Z deletes the set she had just made, and the Edit menu says "Redo Create set Mule ring". The Undo item names what it will undo, which is correct and which I read. The lesson that selecting is not undoable is fair; I would have fallen into it too.

For my task the relevant part is this: if I click "116,905 nodes" on the citation data, I select more than the cap on a canvas that is not drawn. I assume the table and inspector lead, as it says here. I did not see that case on the patents, so I cannot vouch for it.

**What I would write down as "worth a closer look".**
1. The sample boundary. 41,873 of 124,318 patents (a third) are never cited inside the sample, 2,406 have no edges at all, some of those cited dozens of times from outside. Every centrality on this file is biased by the window. Export the isolates with the methods file and send it to whoever cut the sample.
2. The 41-, 23- and 19-patent islands. Could not open them in the mock. In the product I expect a Components tab; I would list their members and check whether they are one technology family or an id problem.
3. Among the 200 most cited patents, 72 are cited by none of the others. Same boundary story, visible from a different angle.
4. Drugs and medical, citationsReceived >= 25: 612 patents, 44 weak components, one of 545. Kept as a live rule set, not only a filter. The three hubs are the obvious story and I would not lead with them.

## After the task

**Single Ease Question:** 5 of 7.

Same score as last time, for different reasons. Better: Keep top rows is a plainer first step than the old top-3-with-neighbors, the tie at the cut is disclosed, the neighborhood is a separate undoable step, find takes pasted patent numbers, the isolates are placed inside the zero-in-degree bucket, the layout row says it is waiting, and the export writes the method beside the data. Not fixed: citationsReceived versus in-degree is still explained only behind the isolates click and nowhere on a single patent; the component links still go nowhere; the chip still rounds 124,318 to 124K; the import row is still truncated. New: "components" versus "weak components" for the same number on two screens, dashed empty boxes under two column headers, and an unlabelled 12,113 on the canvas. None of these is a hang or invented data, so none ends the session, but three carried-over faults from last round is why the score did not move.

**Would I use this instead of what I use now?** For this job -- someone hands me a big edge list and says "is anything here" -- yes, instead of Neo4j Browser and Gephi. It did not pretend to draw what it could not, the numbers I checked were right, every filter says what it took out, and I can export a list with its method. For my own knowledge graph, still no. It reads CSV and GraphML, not Turtle or a SPARQL endpoint, so I would flatten my graph and lose datatypes, language tags and named graphs, and then I would be the one explaining the loss. Until it reads RDF and groups by class, it stays a very honest triage tool for other people's edge lists, not a replacement for SPARQL and a spreadsheet.

In my words: "It still tells the truth about what it cannot draw, and the export is the best I have seen. Put 'cited in this sample' beside 'citationsReceived' on the patent itself, make '41 nodes' open something, and never round the one number I glance at."
