# Session: see who a node deals with directly, on a small network and on one too large to draw

**Participant:** Dr. Mara Lindqvist, the Gephi holdout (fictional composite; see ../../personas/gephi-holdout.md).
**Task as given by the moderator:** "See who an account deals with directly, once on a small network and once on one too large to draw."
**Screens:** the inspector (small network: 300 human proteins) and the frame past the drawing limit (large network: 124,318 patents, 1,480,221 citations).
**Renders looked at:** shots/inspector-one-node.png, shots/inspector-grow.png, shots/inspector-filtered.png, shots/screens__past-drawing-limit.png, shots/record/screens__past-drawing-limit-narrow.png, shots/record/r3-mara-neighbors-pdl-rule.png, shots/record/r3-mara-neighbors-pdl-full.png (the editor insets under the rule state).

## Think-aloud

**Before starting.** "An account. Fine -- there are no accounts in either of these; one is proteins and one is patents. I'll take TP53 as my 'account' on the small one and the most cited patent on the big one. In Gephi this is the Ego Network filter, depth 1, or right-click, Select neighbors. Let's see if it's that easy."

### Part 1: the small network (300 proteins)

**First look (inspector-one-node).** "OK, TP53 is already selected, there's a ring on it. Right column: TP53, Node, and a button that says Neighbors with a little caret. That is -- honestly -- the word I'd look for. The tooltip says 'Filter to neighbors, 1 hop: 33 nodes. Ctrl+Z undoes it.' Thirty-three. So thirty-two neighbors plus TP53 itself, and further down Connections says '32 neighbors'. Degree 32. The numbers agree with each other, which is the first thing I check. Good."

"Ctrl+Z undoes it. Hm. I'll believe it when I press it -- in Gephi there is no undo -- but I like that it says so."

**Opens the caret (inspector-grow).** "Hops from TP53: 1 hop 33, 2 hops 169, 3 hops 296. That's nice, actually -- it tells me the ego network size before I run it. In Gephi I'd set depth 2 and then look at the counter at the bottom. Then Filter to neighbors and Select neighbors. So the main button filters, and select is tucked in here. I'd want to know which one I'd use for a figure... filter, I think, because I want the others gone."

"Question though: 2 hops is 169 of 300 and 3 hops is 296 -- this is a small-world graph, fine, that's realistic."

**Presses Neighbors (inspector-filtered).** "Right. Chip at the top says 'Filtered: 33 of 300 nodes'. The canvas redrew just the ego network -- TP53 in the middle, labels on everything. The legend recounted: DNA repair 13, Proteasome 4... I like that the legend follows the filter. There's a toast, 'Filter to neighbors, 1 hop: 33 nodes', with Undo."

"Now the thing I actually care about. Degree 32, '#1 of 33'. So the rank is inside the filter -- fine, TP53 is obviously top of its own ego network. Betweenness 0.1139, 'Out of date -- Re-run'. Oh. OK. That is exactly my Gephi complaint: statistics run on whatever's visible and the column never tells you. This tells me the betweenness is from the full graph and the filter has changed the world. I would still want to know WHAT it's out of date against -- the full graph, presumably -- but that's the right instinct."

"Wait, I'm a little suspicious of the 32 -- is that degree in the full graph or in the filter? In an ego network of depth 1 it's the same number for the ego, so I can't tell from here. On another node in this filtered view it would matter. I'd click, say, BRCA1 and check. The screen doesn't show me that."

"Who does TP53 deal with directly? I can read them off the canvas: PSMC6, RPS13, RAD51, MSH2, BRCA1, WRN... But I want them as a list I can sort and export. There's '32 neighbors' under Connections with a chevron. The prototype says that row selects them. Selecting isn't a list. I'd expect it to open the table with those 32 rows -- that's what I would do in the Data Laboratory. I can't tell from the screen whether a table opens."

**Part 1 verdict.** "That's done, and it's faster than Gephi. Two clicks, and it told me the size up front."

### Part 2: the large network (124,318 patents)

**First look (screens__past-drawing-limit).** "'124,318 nodes not drawn. More than this browser draws at once (50,000).' Well. At least it says so instead of hanging like Gephi does on my laptop with a 200k-edge graph. There's a table with every patent, sorted by citationsReceived. And the Statistics are there -- density 0.0000958, weak components 3,912, the giant one 94%. Fine, I'd check those against NetworkX."

**What she tries first.** "The account I want is the top one, 6117075, 779 citations. I click its row in the table. I expect the right column to become that patent's inspector with the same Neighbors button I just used."

*Moderator note: no frame on this page shows a single table row selected, so the click in a clickable prototype leads nowhere; the right column stays on the graph's Statistics.*

"...Nothing. The right side still says Citations, Graph. Hm. Did it select? I don't see the row highlight. So where's my Neighbors button? It was right there on the small one."

**Tries the blue button.** "OK, the only thing that's shouting at me is 'Narrow the graph...'. I don't want to narrow the graph, I want one patent's neighbors -- but fine, press it."

**The steps list (screens__past-drawing-limit-narrow).** "Filter steps. 'Suggested for this graph: Top 3 by citationsReceived, with neighbors, 586 -- follows the table's sort; favors hubs.' Then 'Around a node... a row you pick in the table, or find by name.' Around a node. That's it, that's the ego network. Why is it called 'Neighbors' in one place and 'Around a node' in another? I'd have to tell my students those are the same thing. In Gephi it's one filter with one name."

"And the grey text under those rows is small. I'm leaning in."

**Opens Around a node (editor inset under the rule state).** "Around: 6117075 -- it picked my row up, so the click DID select it, it just didn't show me. 1 hop, Both directions. Good, it knows this is directed: cites and cited-by. That's a question Gephi's ego filter doesn't even ask you. '242 nodes, 348 edges, will draw.' And a Filter to button. It even says 'The same step as Filter to neighbors on a node's inspector.' OK, so they know it's the same thing. Then call it the same thing."

"'Keep: Nodes / Edges' at the top. What does keeping edges around a node mean? I'd leave it alone."

**The number that stops her.** "Hold on. 242 nodes around 6117075 -- that's the patent plus 241 neighbors. But the table says this patent has 779 citations received. So 779 citations and only 241 of them are neighbors? Either citationsReceived was counted in the full patent database and this is a sample, or something is dropping edges. The in-degree chart says max 238. Nothing on the screen tells me why 779 and 238 differ. This is exactly the moment where I stop trusting a tool. I'd open Python and count it myself before I put any of this in a paper."

**Would she commit?** "I'd press Filter to, expect 242 nodes drawn, and then -- presumably -- the same inspector I had on the small graph. I don't see that drawn state for this step, only for a category rule. I'll assume it looks like the TP53 one."

**Part 2 verdict.** "Got there, but by the back door. The first thing I tried didn't show me anything, and the second thing had a different name. And one number I'd have to go and check."

## After the task

**Single Ease Question: 5 of 7.** "The small one is a 7 -- easier than Gephi. The big one is maybe a 4: I found it, but only because there was one blue button and I pressed it."

**Would she use this instead of Gephi?** "For looking at one node's ego network -- yes, for that job I'd happily use this. The count before you commit, the undo, and the 'out of date' on betweenness are all things I've wanted from Gephi for ten years. And it doesn't die on 124,000 nodes, it tells me what it won't draw. But I'm not switching my course over this. When the big graph says 779 citations in one place and 238 in another without a word of explanation, that's the paragraph in the methods section I don't want to write. Fix the naming, show me the inspector when I click a row, and explain that number, and I'd put it in front of my students next autumn as the 'first look' tool."

## Problems observed

1. **Past the drawing limit, clicking a table row shows no inspector and no Neighbors button** (frame past the drawing limit). The participant's first move was to click the patent's row and look for the button she had just used; nothing on the page shows that state, so she fell back on "Narrow the graph...". Severity 3.
2. **Two names for one action** (inspector vs frame past the drawing limit). "Neighbors" / "Filter to neighbors" on the inspector, "Around a node..." in the filter steps list. A caption admits they are the same step. Severity 2.
3. **citationsReceived 779 vs 242 nodes around the same patent, and in-degree max 238** (frame past the drawing limit). Nothing says the attribute counts citations from outside the sample. For a methods-minded user this breaks trust. Severity 3.
4. **"32 neighbors" row selects but does not list** (inspector). She wanted the neighbors as rows to sort and export; the screen does not show where they appear. Severity 2.
5. **"Keep: Nodes / Edges" in the Around a node editor** has no obvious meaning for an ego network. Severity 1.
6. **Small grey captions in the filter steps list** are hard to read for a presbyopic user. Severity 1.
7. **Degree after filtering: full-graph or in-filter value is ambiguous** (inspector, filtered). Equal for the ego node, so the screen cannot tell her which it is. Severity 1.
