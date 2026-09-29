# Session: who matters most to how the story hangs together -- Expert Emma

**Participant:** Expert Emma, network scientist, lives in notebooks (networkx, igraph, leidenalg),
uses Gephi for the final figure. See ../../personas/expert-emma.md.

**Task, as the moderator gave it:** "You have the Les Miserables co-appearance network open. Find the
few characters who matter most to how the story hangs together, and tell me how sure you are of
their order."

**Screens, in order:** the project at rest (screens/frame-at-rest.html, Les Miserables), the menu and
the Results catalog (screens/results-panel.html and screens/run-and-read.html, first states -- both
drawn on the protein network), the navigation canvas (screens/navigation.html), a betweenness run on
the filtered graph with its run record (screens/results-panel.html, "filtered"), the same run read
from the Results panel with a node selected (screens/run-and-read.html, "subset"), the table dock on
the full graph and after three filter steps (screens/table-dock.html, "small" and "stale"), the
three-measure ranking on the protein network (screens/table-dock.html, "ranked"), and Les Miserables
without Valjean (screens/closeness-variant.html, B1 and B2). Everything seen in the participant view.

**Renders she saw:** shots/r6-emma-who-frame-at-rest.png, shots/r6-emma-who-results-panel.png,
shots/r6-emma-who-run-and-read.png, shots/r6-emma-who-navigation.png,
shots/r6-emma-who-results-panel-html-filtered.png, shots/r6-emma-who-run-and-read-html-subset.png,
shots/r6-emma-who-table-dock-html-small.png, shots/r6-emma-who-table-dock-html-stale.png,
shots/r6-emma-who-table-dock-html-ranked.png, shots/r6-emma-who-closeness-variant-html-b1.png,
shots/r6-emma-who-closeness-variant-html-b2.png.

---

## Think-aloud transcript

**Reading the task.** "Matter most to how the story hangs together." That is not "most
connected". A character with 36 co-appearances matters, sure, but "hangs together" is about who
holds the thing in one piece: who sits on the paths between the parts of the book. That is
betweenness, and the honest check on betweenness is the removal test -- take the top person out and
see if it falls apart. Degree I'll look at as a sanity check. And "how sure of their order" -- for
an exact computation on 77 nodes there is no sampling error, so the uncertainty is all in the
choices: weighted or not, which measure, what's in the graph. I know this dataset; networkx ships
it. Valjean is first by a mile on anything. What I want to see is whether the tool tells me the
2-to-5 order is soft, because it is.

**The project at rest.** (frame-at-rest.) Les Miserables, miserables.json. Top left: "Nothing has
been sent from this project". Left rail: "Assistant Off. Nothing is sent." Good, that is my first
question answered before I asked it, same as every time I've opened this thing.

Right side, Statistics: 77 nodes, 254 edges, density 0.0868, 1 connected component, a degree
distribution sparkline. "Loaded: miserables.json, undirected, value not used yet." Right -- the
edge "value" is the co-appearance count, and it tells me nobody is using it yet. 254 times 2 over
77 times 76 is 0.0868. Fine. One component, so betweenness won't have the disconnected-pairs
question on the full graph.

The canvas: group colors 0 to 10 with counts, "Labels: the 18 characters with the most
connections". Valjean is in the middle with lines everywhere, which proves nothing, it's a force
layout. I'm not reading anything off the picture.

**Finding betweenness.** Where do I run something? Left rail says "Results". The hamburger menu has
Algorithms. Both open a list: Centrality, Betweenness, Closeness "WF-corrected", Eigenvector with a
warning "3 components", HITS, Katz, PageRank. (results-panel first state, run-and-read first state.)

Wait. These are the protein network. "Human protein interactions", 300 nodes, MAPK1, TP53. I have
Les Miserables open. Why did the project change when I opened a menu? I'm going to assume the menu
looks the same on my project and move on, but if this were the real thing and the project switched
under me I'd close the tab.

The Betweenness hover says "How often a node lies on the shortest paths between other nodes: the
brokers and bottlenecks. Click to run." Click to run. No dialog. Normalized or not? Weighted or
not? Endpoints? I don't get asked. Okay -- I'll accept that for a small graph IF the run tells me
afterwards exactly what it did. That's the deal.

The navigation canvas is a picture of the same shell, a table sorted by degree underneath, a File
menu with "Export..." and "Version history". Nothing there for this task. Moving on.

**The betweenness result that exists for Les Miserables.** (results-panel, "filtered".) Hm. The
only Les Mis betweenness run I can find is "Betweenness, on 60 of 77 nodes", after "Filter to
degree >= 2". Somebody filtered out the degree-1 characters first. Fine, it says so at the top:
"on 60 of 77 nodes: the filtered graph, 1 component". It says so in the chip at top left:
"Filtered: 60 of 77 nodes, 1 step". It says so above the Top nodes list: "Values on 60 of 77 nodes:
the filtered graph". I can't miss it. Good.

Top 5 here: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073.

Where's Myriel? On the full graph Myriel is second in networkx, 0.177. And I know why: the bishop's
betweenness is almost entirely his little household -- Napoleon, the Countess, Geborand, the
degree-1 hangers-on -- whose only route to the rest of the book is through him. Filter out the
degree-1 nodes and that brokerage evaporates. So this run already tells me something the moderator
would want to know: Myriel is second or absent depending on a filter. That's the order being soft,
right there. The tool didn't point it out; I knew it.

**The run record.** I click "Details". A card: "Method: Brandes betweenness, exact: every node is a
source. Seed: None: nothing is sampled. Damping: Does not apply. Normalization: Divided by
(n-1)(n-2)/2 = 1,711 node pairs; n = 60, the filtered graph. Weight conversion: None: value not
used. Scope: Filtered graph, 60 of 77: after Filter to degree >= 2. Engine: WebGPU. Took: 0.1 s."
And a Copy button.

Okay. That is the thing I have asked every tool for since grad school. (n-1)(n-2)/2 for undirected
is networkx's normalized=True. 59 times 58 over 2 is 1,711. Correct. It names Brandes, it says
exact, it says no seed because nothing is sampled, it says the weight column was not used. I'd put
that card in a methods section. Fine, that is good.

The "Exact" hover: "Computed on every node, not estimated. It does not say the ranking is
meaningful." Ha. Yes. Somebody on this team has refereed papers.

**How sure -- the tie line.** Under Top nodes: "Every step in the top 5 is over the 1% tie line;
the smallest, ranks 2 and 3, is 4.7%." 0.172 against 0.164 -- 4.7% of 0.172, yes. So it's telling
me no two adjacent ranks are numerically tied. That's a real check and I'm glad it's there, but
it's the wrong kind of sure. It's arithmetic separation. It says nothing about whether the order
survives a different, equally defensible choice -- weights, the filter, degree instead of
betweenness. A junior would read "over the 1% tie line" as "the order is solid" and it isn't.

Distribution panel: "middle 0.000", "zero 32 nodes, all 29=". What is "29="? ... Oh, tied at rank
29. Took me a second. More than half the filtered graph has betweenness zero. Plausible, it's a
book full of cliques.

"Runs of this measure 1". So there's no full-graph run in this state.

**The same run, read from the Results panel.** (run-and-read, "subset".) Similar, Valjean selected.
Now the inspector on the right shows two lines for betweenness: "0.419, on 60 of 77, #1 of 60" and
"0.57, on: full graph, #1 of 77". And degree "36, on: full graph". Every value names its scope.
That's exactly right -- the thing Gephi gets wrong silently is overwriting a column when you
re-run on a filtered graph.

"Runs of this measure 2: Run 2 on 60 of 77, Run 1 full graph, Sep 28 16:02". So there IS a full
graph run in this version. I'd want to click Run 1 and see its top 5. The mock doesn't draw it.

Small thing: this one says "CPU", the other one said "WebGPU". Different run dates, so I'll let it
go, but a reviewer would ask why the same 60-node computation went two ways. And the tie-line
sentence isn't here -- so which screen do I trust to tell me about near-ties?

**The table, full graph.** (table-dock, "small".) Here we go. Full graph, 77 nodes, degree and
betweenness side by side with rank columns. Header: "Betweenness exact, unweighted, full graph".
Rows: Valjean 36 / #1, 0.570 / #1. Gavroche 22 / #2, 0.165 / #3. Marius 19 / #3, 0.132 / #4.

And a sentence above the table: "Valjean is #1 on both measures. At #2 they part: Gavroche by
degree, Myriel by betweenness." That is the answer to "how sure of the order" in one line, and
it's the right shape: where do the measures agree, where do they stop agreeing. Valjean is
unambiguous. After that it depends on what you ask.

Checking against what I remember from networkx: Valjean 0.570, Myriel 0.177, Gavroche 0.165,
Marius 0.132, Fantine 0.130. Matches to three places. Good.

Now: Marius 0.132, Fantine 0.130. That's under 2% apart. On the protein screen (table-dock,
"ranked") the table marks that sort of thing -- "#6, near #7", and a line "Near tie: the next
rank's value is within 1%". The Les Mis table I'm looking at doesn't show me rows 4 and 5 without
scrolling, so I can't see if Fantine gets a "near" mark. 1.8% wouldn't trip a 1% line anyway. Which
is my point: 1% is a precision threshold, not a robustness threshold.

"Compare rankings..." opens a scatter of rank against rank, it says. I'd click it. Not drawn for
Les Mis in what I was given.

**After three filter steps.** (table-dock, "stale".) Filtered to 27 of 77. The betweenness column
header now says "Out of date" with "Re-run". Good -- it doesn't pretend the old numbers belong to
this graph. But the degree column says "degree (filtered graph)", Valjean 17, and the range under
the header still says "1 to 36". 36 is his full-graph degree. Either the header or the range is
lying. I'd file that.

**The removal test.** (closeness-variant, B1 and B2.) This is the one I actually wanted. Les
Miserables without Valjean: "76 of 77 nodes, 1 step". Statistics: 76 nodes, 218 of 254 edges,
7 components, 5 isolated nodes. So take Valjean out and the book breaks into seven pieces, five
characters with nobody left to talk to. THAT is "how the story hangs together", and it's a better
answer than any centrality score. Myriel's household is presumably one of those pieces, which
squares with the filter result.

Weight here says "value, shared scenes, 1 to 31", and the Runs list shows "Betweenness, Distance =
1 / value". Somebody converted co-appearance counts to distances the right way round -- more shared
scenes, shorter distance. I respect that it's written on the run. But that makes it a weighted
betweenness, and the table dock was unweighted. Two different betweenness numbers in the same
project, and the only thing distinguishing them is a sub-line in small grey text. I'd want the
weighted one as its own column next to the unweighted one, both with rank, because "does the order
hold with weights" is part of "how sure".

Closeness: the hover says "7 components: each score is scaled by the share of the graph the node
can reach (Wasserman-Faust)". Yes -- on a disconnected graph plain closeness is garbage and this is
the standard fix. Then "Scaled for 7 components -> Harmonic centrality" offered as the alternative.
Correct instinct. The result is named "closeness (WF-corrected)" in the column, so when I export it
the variant travels with the number. Javert tops closeness without Valjean, 0.997, then Enjolras,
Courfeyrac, Marius. Different question, but it's another view that says: once Valjean is gone,
Javert and the students hold what's left.

**Putting the answer together.** I didn't find one place that answers the moderator; I assembled it
from four screens.

---

## Her answer to the moderator

"Valjean, first, and I'm certain of that one: betweenness 0.570 against 0.177 for the next person,
number one on degree too, and when you remove him the network falls into seven components. That's
not a ranking, that's the spine of the book.

After him it's a pack, and I would not publish an order for it. On unweighted betweenness over the
full graph it's Myriel 0.177, Gavroche 0.165, Marius 0.132, Fantine 0.130. But Myriel is second only
because of his degree-1 household -- filter out the one-scene characters and he drops out of the top
five entirely. On degree, Gavroche is second, not Myriel. Marius and Fantine are within 2% of each
other. And none of those numbers use the co-appearance counts; the weighted run exists but I couldn't
see its ranking next to the unweighted one.

So: Valjean, certain. Then Gavroche and Marius as the likely next two -- they hold up under both
measures and the filter. Myriel and Fantine matter for specific parts of the book, not for the whole.
Anything finer than that is the method talking, not the novel."

---

## Single Ease Question

**5 out of 7.**

"Getting a correct number was easy and I trusted it -- the run record is the best I've seen in a GUI.
Getting the answer to 'how sure' was not one step. I had to go through a filtered run, a table, and a
removal state to assemble it, and the thing the screen calls sureness -- the 1% tie line -- is
numerical precision, which is the least interesting kind. The agreement sentence in the table is the
closest thing to the real answer. It should be the first thing I see, not the fourth."

## Would she use this instead of her current tool?

"For this job, no. In a notebook this is `nx.betweenness_centrality(G)`, `sorted`, and a loop that
removes the top node and counts components. Four lines, two minutes, and it's reproducible. I don't
see an API or a way to get that loop out of here as code.

But if a colleague who doesn't code asked me this question about their own network, I'd send them
this. The run record says exactly what was computed, the scope is written on every value, the tool
tells them the ranking isn't the same thing as meaningful, and nothing leaves their laptop. That's
more honesty than Gephi gives them. That's the hand-off case, and for that, yes."

---

## Problems found

1. **The menu and the catalog show a different project.** (results-panel and run-and-read, first
   states.) With Les Miserables open, the Algorithms menu and "Run a measure..." were drawn over the
   protein network. "Why did my project change when I opened a menu?" In a real tool that would be a
   walk-away moment. Severity 3.
2. **"How sure" is answered as numerical precision, not robustness.** (results-panel, "filtered".)
   "Every step in the top 5 is over the 1% tie line" reads as reassurance, but the real uncertainty in
   an exact run is the choices: filter, weights, measure. The filtered run drops Myriel from 2nd to
   out of the top 5 and nothing says so. "A junior would read that as 'the order is solid' and it
   isn't." Severity 3.
3. **The best answer is buried in the table.** (table-dock, "small".) "Valjean is #1 on both measures.
   At #2 they part" is exactly the answer, but it only appears once two measures have rank columns in
   the dock, and not on the result itself. Severity 2.
4. **Unweighted and weighted betweenness are told apart only by a grey sub-line.** (closeness-variant,
   B1/B2 vs table-dock.) "Distance = 1 / value" under one run, "unweighted" in another header. She
   wanted both rankings side by side to judge whether weights change the order. Severity 2.
5. **Filtered degree column shows the full-graph range.** (table-dock, "stale".) Header "degree
   (filtered graph)", Valjean 17, range under the header "1 to 36". "Either the header or the range is
   lying." Severity 2.
6. **The tie-line sentence and the engine differ between two views of what looks like the same
   filtered run.** (results-panel "filtered" says WebGPU and gives the tie line; run-and-read "subset"
   says CPU and has no tie line.) "Which screen do I trust to tell me about near-ties?" Severity 2.
7. **"all 29=" is cryptic.** (results-panel, "filtered", Distribution.) She worked out it means tied
   at rank 29 but it took a second. Severity 1.
8. **No parameters before the run.** Betweenness is "Click to run". She accepted it because the run
   record shows normalization and weight afterwards, but on a large graph she would want to choose
   before paying for it. Severity 1.
9. **No way to get the removal test or the ranking out as code.** "If I cannot script it, I cannot
   reproduce it." Severity 2 for her adoption; not a defect of these screens.

## What she liked

- The run record: "Brandes betweenness, exact", "Seed: None: nothing is sampled", "Divided by
  (n-1)(n-2)/2 = 1,711 node pairs", "Weight conversion: None: value not used", and a Copy button.
  "I'd put that card in a methods section."
- The "Exact" hover: "Computed on every node, not estimated. It does not say the ranking is
  meaningful." "Somebody on this team has refereed papers."
- Every value names its scope: "0.419, on 60 of 77" next to "0.57, on: full graph" in the inspector.
- The values match networkx to three places on the full graph.
- The agreement sentence: "At #2 they part: Gavroche by degree, Myriel by betweenness."
- "Out of date / Re-run" on the betweenness column after the graph was filtered again.
- Removing Valjean shows 7 components and 5 isolated nodes: "a better answer than any centrality
  score".
- Closeness names its Wasserman-Faust correction, in the column name too, and offers harmonic
  centrality for the disconnected case.
- "Nothing has been sent from this project" and "Assistant Off. Nothing is sent." on every screen.
