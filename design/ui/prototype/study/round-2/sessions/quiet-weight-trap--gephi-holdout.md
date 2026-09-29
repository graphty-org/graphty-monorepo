# Session: can the rankings be trusted? -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (simulated), associate professor, a decade of Gephi, NetworkX for
anything reproducible.
**Task as given by the moderator:** "Something about these rankings bothers a reviewer. Find out
whether the numbers can be trusted."
**What was planted:** the Les Miserables co-appearance graph, where the edge column `value` counts
how often two characters appear together -- a similarity, where bigger means a stronger tie. The
trap is a ranking that treats that count as a distance, or quietly ignores it.
**Screens used:** the Results panel (starting on its first state) and the load step, both as static
renders with a clickable list of states along the top.

## Transcript (think-aloud)

**1. First screen.** "Patent citations. PageRank running on WebGPU. This is not my graph. The
reviewer is asking about rankings on Les Miserables, so where is Les Miserables? There's a strip of
numbered links across the top -- 'Running', 'Queued', 'Refused by the cost gate'... I assume those
are the screens of your prototype. In the real thing I'd have opened my file, I know. Fine, I'll
click through until I see my data."

**2. Clicking through.** "Protein interactions, protein interactions, proteins again... 'Results
after a filter' -- there it is, Les Miserables, top left. It took me a while to find my own
dataset, but that's the prototype, not the product."

**3. The first thing I look at: the statistics on the right.** "Nodes 76 with a little funnel,
edges 254, one component, density 0.0891. And -- 'Edges: undirected, no weight.' Hm. Les Mis has a
weight. Every copy of that file I've ever loaded has `value` on the edges, the co-appearance count.
In Gephi it lands in the Weight column automatically. So either your file has no weight, or the
tool loaded it and decided it wasn't a weight. The screen doesn't tell me which. That's the first
thing I'd write down for the reviewer: the tie strength is not in these numbers."

**4. The Betweenness card.** "On: filtered graph, 76 nodes, 1 component. Exact. Unweighted,
undirected. WebGPU. OK -- it says Unweighted in plain words, right at the top. Good. In Gephi I
would have to *know* that betweenness ignores the weight column; nothing on screen tells you. So
the classic NetworkX mistake -- calling `betweenness_centrality(G, weight='value')` and getting
co-appearance counts treated as path lengths, so Valjean's strongest ties become his *longest*
paths -- did not happen here. That's the thing I was actually worried about."

**5. The run record (Details).** "Method: Brandes, exact, every node a source. Seed: none, nothing
sampled. Normalization: divided by (n-1)(n-2)/2 = 2,775 node pairs, n = 76, the filtered graph.
Weight conversion: None, unweighted. Scope: filtered graph, 76 of 77, after 'Filter to Largest
component'. Engine: WebGPU. Now *this* I like. This is a methods paragraph. The normalization
naming n -- that's exactly my Gephi complaint, statistics following the filter without saying
so. Here the scope is written into the result itself. There's a Copy button; I'd paste that
straight into the response letter."

**6. But the filter bothers me.** "Wait. Filtered to the largest component and it dropped one of
77? Les Miserables is one connected piece, as far as I remember. Which character got dropped, and
why? The chip says '76 of 77 nodes, 1 step' -- I'd click it to see. If it's an isolate your file
added, fine, but I'd want to know before I send numbers to a reviewer. On this screen I can't see
who is missing."

**7. The numbers themselves.** "Valjean 0.547, Gavroche 0.163, Myriel 0.151, Marius 0.131, Fantine
0.127. That's the order I'd expect for unweighted betweenness on Les Mis -- Valjean miles ahead,
Myriel up there because all the bishop's minor characters hang off him. I remember Valjean around
0.57 from NetworkX on the full 77, so 0.547 on 76 nodes with a different denominator is plausible.
I wouldn't swear to the third decimal without checking in Python."

**8. The Distribution block.** "'middle 0.000'. 'zero: 46 nodes, all 31='. What is 'all 31='? ...
Oh. They all tie at rank 31. I've never seen a tie written like that; I read it as a typo first.
And 'middle' -- you mean the median? Say median. 46 of 76 characters with zero betweenness is
right for this graph, the leaves around Myriel and the Thenardiers."

**9. Can I make it use the weight?** "Weight: 'None declared', and the box is grey, so I'd assume I
can't touch it. If I click it, I expect to see `value`. Then I'd expect it to ask me what the value
*means* -- I saw on one of the protein screens, 'confidence as similarity: used as given, bigger is
a closer tie', and a Louvain record that said 'Weight conversion'. That is the right question. But
on this Les Mis screen there's no hint that `value` exists at all. It's quiet. Nothing says 'your
file has a numeric edge column that this result is not using'."

**10. Also glanced at the load step.** "The file-opening dialog -- this one's a bank CSV, not mine.
There's a Role column: amount is set to Weight, and in one version there's a row 'amount as a
weight means: Similarity / Distance / Capacity / Unknown'. If that shows up when I load Les Mis,
then I'd pick Similarity once and be done. But from these screens I can't tell whether it will ask
me at load or later at the first run -- the two pictures didn't agree."

**11. Verdict to the moderator.** "The rankings can be trusted *as unweighted betweenness* on 76
characters. The tool says so three times: the state line, the run record and the normalization.
What it doesn't do is warn me that the co-appearance counts are sitting there unused. If the
reviewer's complaint is 'you ignored tie strength', the answer is yes, we did, and the screen
proves it. If the complaint is 'you treated similarity as distance', the answer is no, and the
screen proves that too. That's more than Gephi would give me."

## After the task

**Single Ease Question:** 5 of 7. "The answer was there and it was honest. Finding my graph among
your protein screens, and working out 'all 31=', cost me time."

**Would she use this instead of Gephi?** "Not instead. Not this term -- my handout, my students,
my coauthors' `.gephi` files. But I'd use it *next to* Gephi to check a result before a revision,
because that run record is the paragraph a reviewer wants, and Gephi has never given it to me. If
it also told me when my file has a weight it isn't using, I'd start taking it seriously."

## Problems observed

| Where | What happened | Severity (1-4) |
|---|---|---|
| Statistics panel, Les Mis | "Edges: undirected, no weight" on a file known to carry a co-appearance count. Nothing says whether `value` was seen and left without a role, or never loaded. The unused weight is silent. | 3 |
| Betweenness card, Weight field | "None declared" in a grey box reads as disabled; no hint that a numeric edge column is available to choose. | 3 |
| Filter chip / Scope | "Largest component, 76 of 77" on a graph she believes is connected; the screen does not show which node was dropped, so she cannot vouch for the set. | 2 |
| Distribution | "all 31=" read as a typo; "middle" instead of "median". | 2 |
| Load step | Two renders disagree on whether the weight's meaning (similarity, distance) is asked at load or at the first run. | 2 |
| Prototype navigation | The first state is a different dataset; Les Mis appears only in state 14. | 1 |

## What worked for her

- "Unweighted" stated in the result's first line, not buried.
- The run record: method, seed, normalization with its n, weight conversion, scope with the filter
  step, engine -- copyable into a methods section.
- Scope naming the filtered graph with both counts, the exact problem she has with Gephi.
