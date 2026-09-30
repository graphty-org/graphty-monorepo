# Session: a graph too big to draw -- the knowledge graph engineer

**Participant:** Dr. Min-ji Kim (fictional composite), knowledge graph engineer and ontologist at a financial-services company; GraphDB workbench, SPARQL in notebooks, Protege; has given up on Neo4j Browser, WebVOWL and Gephi's RDF plugin.
**Task as given by the moderator:** "Here is last period's citation data. Find anything worth a closer look."
**Screens used, in order:** the frame past the drawing limit (all its states: not drawn, isolates opened, the filter steps list, the rule editor, narrowed and drawn, the offered top-3 route, the unsupported-browser Layout row), then the find screen, then the filter chip and its steps. All at 1440 x 900, the study view (design notes hidden). Renders: `shots/record/r3-ke-past-drawing-limit.png`, `shots/record/r3-ke-find.png`, `shots/record/r3-ke-filter-chip.png`.
**Dataset on screen:** a patent citation sample, 124,318 patents and 1,480,221 citations (patent-citations-sample.csv). The find and filter-chip screens switch to other datasets (Les Miserables co-appearances, a 3,000-account transfer graph).

## Transcript (thinking aloud)

**Before touching anything.** Citation data. Not mine, not RDF -- patents citing patents, so one predicate, "cites", directed. That actually makes it easier to judge: no literals to turn into nodes, no rdf:type swamping the canvas. "Worth a closer look" to me means data quality first: things that should not be isolated, components that should not exist, a node that is suspiciously big. Hubs second. My first question for any tool is what it did on import, so I look for that before I look at the picture.

**Not drawn.** The canvas is empty and says "124,318 nodes not drawn. More than this browser draws at once (50,000). Every node is counted in Statistics and listed in the table." And a button, "Narrow the graph...".

Good. That is the first graph viewer I have seen that tells me before the tab freezes instead of after. In Neo4j Browser the display limit is a lie: it still chews through every row. This one seems to have loaded the file and simply declined to lay it out. I would want to know whether 50,000 is a measured limit for this machine or a constant somebody picked -- "this browser" suggests measured, and on my integrated-graphics laptop I would like to know that number is mine. But it is honest and I can work with it.

Now I check the numbers, because that is what I do. Nodes 124,318, edges 1,480,221. Density 0.0000958 -- that is edges over n times (n minus 1), so they are treating it as directed. Correct. Average total degree 23.8 -- two times edges over nodes, 23.81. Correct. Weak components 3,912, the biggest 116,905 nodes, 94.0 percent. 116,905 over 124,318 is 0.940. Fine. The counts are labelled nodes versus edges, which most tools do not bother to do. So far nothing I cannot reproduce with a COUNT.

Then the in-degree chart. Complementary cumulative, log-log, "nodes with in-degree k or more". Thank you, someone read a paper. The zero bucket is counted beside it -- "In-degree 0, not on the log axis, 41,873" -- rather than silently dropped. Good.

But: the chart says "max 238". The table right next to it, sorted by citationsReceived, has 6117075 at 779. Those are both "how often was this patent cited". Which one is wrong? On the first screen, before I have done anything, two numbers that should be the same disagree by a factor of three, and nothing on this screen tells me why. I have a guess -- citationsReceived is a column from the source that counts citations from outside the sample, and in-degree counts only edges inside the file -- but I should not have to guess. This is exactly the kind of thing that makes me stop trusting every other number. Strike one, a soft one.

**Where did this come from.** At the bottom of Statistics: "Last import patent-citations-s..." cut off. I cannot read the file name, and it does not look clickable. I want to see what the import did: which column became source, which became target, how many rows it read, whether any were dropped or duplicated. "Edges: directed, weight not set" has a chevron, so I would click that next; the prototype does not say where it goes. "Attributes 4" and "4 more" -- I would open those too. I am told what the tool thinks the data is, which is better than most, but not how it got there.

**Isolates.** 2,406 isolates, underlined. That is the first quality question: 2,406 patents that neither cite nor are cited by anything in the sample. I click it.

The table switches to "Selected: 2,406 nodes, the isolates", with a "Show full graph" link. And the right side now says: in-degree 0, out-degree 0, and "None of these patents cites or is cited by another patent in this sample. Their citationsReceived counts citations from patents outside it."

There it is. That is the explanation for 238 versus 779, and it is in the wrong place. It is the right sentence, it is short, and it is hidden behind a click on isolates. It belongs next to the degree chart, or in the column header of citationsReceived. If I had not clicked isolates I would still be suspicious.

The isolates themselves are interesting: 5997071, Electrical, citationsReceived 46, but zero edges in the sample. A patent cited 46 times that has no citation inside a three-year window. Either the citing patents are later than 2001, which is plausible, or the sample was cut badly. That is "worth a closer look" item one: the sample boundary. I would export this list and check it against the source.

**Small components.** Under weak components: "116,905 nodes, 41 nodes, 23 nodes, 19 nodes, 3,908 more, each 19 nodes or fewer." A 41-patent island that cites nothing in the main body and is cited by nothing in it -- in a citation network that is either a very closed technology family or a merge or id problem. That is item two. I click "41 nodes".

Nothing happens. It is underlined like a link and it goes nowhere. The isolates link worked, so I expected this to do the same: select those 41 and list them. In a real tool I would try it twice and then assume it is broken. Strike two, and on the exact thing I came for.

**Narrow the graph.** OK, the picture. I click "Narrow the graph...". A panel, "Filter steps": "No filter steps. Every number reads the full graph: 124,318 nodes, more than this browser draws at once." Suggested: "Top 3 by citationsReceived, with neighbors -- 586 -- follows the table's sort; favors hubs", and "Around a node... a row you pick in the table, or find by name". And "Add step". "Create rule set" is greyed out in the corner; I do not know what a rule set is as opposed to a step, and I leave it.

"Favors hubs" -- good, it says the bias out loud. Most tools hand you an ego network and let you believe it is representative.

I open Top 3 to see what it is. "Top 3 by citationsReceived, with every neighbor, both directions, 1 hop. graphty chose 3, the most that reads at the fitted zoom; 4 would keep 734 nodes. Favors hubs, so density and clustering read high. 586 nodes, 893 edges, will draw." That is a honest explanation of a default. I still do not want the hubs first; hubs are the obvious answer. I would rather write my own condition.

**The rule editor.** "New rule. Keep Nodes / Edges. Where category is Drugs and medical AND citationsReceived >= 25." Before I press anything the bottom line says "612 nodes, 1,843 edges, will draw". That is the thing I have wanted for years: the count before the commit. It is a LIMIT in the query, not a limit on the display. I tried the other two variants in my head: >= 5 gives "58,316 nodes, 702,440 edges, will not draw: more than this browser draws at once (50,000). Add a condition to narrow it further" -- clear, and Filter to is still enabled, which I am not sure about; what happens if I press it anyway? Presumably the same "not drawn" screen, which is fine. >= 800 gives "No nodes match. The highest citationsReceived in Drugs and medical is 779." That is a good empty-result message; it tells me the range instead of just "nothing".

One thing: I filter on citationsReceived, which I now know is the outside-the-sample count, not in-degree. There is no way in the rule to say "in-degree", or I did not see it in the attribute list. For a structural question I want the structural number.

**Narrowed and drawn.** The chip now reads "612 of 124K nodes, 1 step". 124K. Statistics say 124,318. Pick one; I do not like rounding in the one place I glance at. The toast says "Filtered to 612 of 124,318 nodes -- Undo", which is exact, so the chip is the odd one out.

The canvas: a big dense ball of grey with labels 6117075, 6231106, 6207936, and off to the right a neat grid of small pieces. Statistics on the filtered graph: edges "1,843 of 1,480,221", isolates 31, weak components 44, largest 545 at 89.1 percent. I check: 1,843 over 612 times 611 is 0.00493, matches. "In-degree 0, 326. Cited by none of the other patents the rule keeps." That sentence is careful: it says "the rule keeps", so I know the zero is relative to the filtered set. Good -- that is exactly the explanation that was missing on screen one.

Is position meaningful? ForceAtlas2 says "Engine: WebGPU" with a play button. It does not tell me whether the layout is converged, or that position means nothing beyond "connected things are near". For a stakeholder I would not show this ball anyway.

The step list: "Filter to -- -123,706 -- 612", a pencil and a menu, and "Each count is what is left after that step; the small number is what the step took out." That is provenance for a filter. I like that more than anything else on the screen; I could write that down in a ticket and someone could reproduce it.

On the machine without WebGPU the Layout row says "Engine: CPU; WebGPU not available". Plain, not an error. My laptop is one of the older ones, so that is the line I will actually see, and I am glad it is not a red banner.

**The offered route, top 3.** Three hub stars, 6117075, 6031111, 5960121, with a handful of bridging patents between them. The grey box in Statistics: "Describes the 3 most cited patents and all their neighbors, not a random sample. It favors hubs, so density and clustering read high." Density has a small tag, "reads high". That is the right warning in the right place. I would put that same kind of tag on the in-degree chart on screen one.

**Find.** The prototype moves me to the find screen and -- this is Les Miserables. 77 nodes, Valjean, Thenardier. Where is my citation data? I understand it is a prototype, but as a participant I just lost my thread. I search "thenard" and get "2 results in all 77 nodes", Thenardier and Mme.Thenardier, "group 4, degree 11". It says "in all 77 nodes" while the chip says "27 of 77 nodes, 3 steps", so find searches beyond the filter -- good, and it says so. For patents I would search by patent number, which "find by name" does not promise; I would want to know it matches ids, not only labels.

The inspector: "degree 11, 16 in the full graph". Two numbers, both labelled. That is right. But "Size -- Size by degree": which degree? On a directed citation graph that matters a lot; here the graph is undirected so I let it go.

Colour. The legend: group 4 green, group 3 an orange-red, group 2 yellow-orange, group 5 pink. I have a red-green weakness. On the canvas, the green nodes and the orange-red ones are distinguishable only by hue, and I am not certain which of the darker ones around Fantine versus Javert is which. The legend has numbers and counts, which helps, but the nodes carry no label for group. I would not trust myself to read group 3 versus group 4 off this canvas.

**Filter chip and its steps.** Still Les Miserables. "Filter to degree >= 2, took out 17, 60 left. Filter to degree >= 5, took out 20, 40 left, keeps only nodes with at least 5 neighbors among the 60 it reads. Filter out group 8, took out 13, 27 left." That explanation under the second step -- "among the 60 it reads" -- is the one people get wrong in every tool: a degree filter after another filter is computed on what is left. It says so. Good.

The statistics each carry a small filter icon: "edges 104 of 254", "components 1". So I know which numbers read the filtered graph. Fine.

Below, the variants: a time window, and the chip on a larger graph with "Filtered: 2,940 of 3,000 accounts", "2,940 of 3,000 accounts", "2.9K of 3K accounts", "2.9K of 3K". Please never ship the last two. 2.9K of 3K is 2,900 to 2,949 of 2,950 to 3,049. If the chip is the thing I glance at, it must be exact. And "Counting... 2 steps" with a spinner on the second step -- that is honest; better than showing a stale number.

**What I would write down as "worth a closer look".**
1. The 2,406 isolates, many with citationsReceived above 0: likely the sample's time window, possibly a bad cut. Export and check.
2. The 41-, 23- and 19-patent islands: could not open them.
3. The 41,873 patents with in-degree 0: a third of the sample is never cited inside it. That is the window again, and it biases every centrality on this sample.
4. Drugs and medical with citationsReceived >= 25: 612 patents, 44 components, one of 545. The three hubs are the obvious story and I would not lead with them.

## After the task

**Single Ease Question:** 5 of 7.

The main path was easy: the not-drawn message, the counts, the rule with its count before commit. It lost points on the dead component links, the citationsReceived-versus-in-degree discrepancy explained only after a detour, the truncated and unclickable import row, and the prototype switching datasets under me halfway through.

**Would I use this instead of what I use now?** For this kind of file, a big edge list someone hands me and says "look at it", yes, over Neo4j Browser and over Gephi. It did not hang, it told me why it would not draw, every number I checked was correct, and the filters say what they took out. For my own work, no, not yet. My data is Turtle in a triple store, and this reads CSV and GraphML. I would have to flatten my graph to subject, predicate, object and lose datatypes, language tags and named graphs, and then I would be the one explaining the loss. Until it reads RDF and groups by class, this is a very honest triage tool for someone else's edge list, not a replacement for SPARQL and a spreadsheet.

In my words: "It is the first viewer that told me the truth about what it could not draw. Now make every underlined number go somewhere, and put the sentence about outside citations next to the chart, not behind the isolates."
