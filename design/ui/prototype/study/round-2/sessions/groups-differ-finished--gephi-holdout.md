# Session: a finished community detection -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional), associate professor, Gephi user since 0.8.
**Task as given by the moderator:** "Community detection has finished. Say what groups it found,
how good the split is, and whether you could reproduce it."
**Screens used:** the Results panel with a finished Louvain run on "Human protein interactions"
(300 proteins, 1,262 edges), and the same run's groups opened in the table under the canvas.
Viewed at 1440 x 900.

## Transcript (thinking aloud)

**1. First look at the Results panel.**
"Right. Not my data -- a protein network, fine, 300 nodes, 1,262 edges, three components. The top
right says that, good, I can check it. On the left there's a list, 'In this project', and Louvain
is highlighted with a 10 next to it. So ten modularity classes. Louvain, not 'community
detection', thank you -- if it had just said 'Communities' I'd be asking which algorithm."

"There's a little box over the canvas, which I assume is the Statistics report -- in Gephi this is
the HTML window that pops up after you hit Run on Modularity. It says 'on: full graph, 300 nodes,
3 components'. That's the first thing I'd ask and it's already answered. Whole graph, not what's
visible. Good. That's the thing Gephi never tells you."

**2. The groups.**
"Under 'Groups': 10 communities, modularity 0.716. Then 'the file's modules 0.663'. Hm. What's
that? ... I think it's saying: the attribute that came in the file, scored as if it were a
partition, gets 0.663. So the detected split is 'better' than the curated one by modularity.
That's actually useful, I do that by hand in NetworkX when a dataset ships with a ground-truth
label. But 'the file's modules' reads like it's a file called modules. I'd write 'modularity of
the imported module column'."

"Largest 62 proteins. 'Single proteins: 2, no interaction.' So two isolates, each its own class.
Fine, Gephi does the same and doesn't tell you."

"The legend at the bottom right: 'Louvain color community' -- that runs together, I read it
twice. Community 1 62, Community 2 43, 3 and 4 at 36... and '6 more'. And Community 7 on the
canvas is black. Black nodes on a black-edged hairball. I wouldn't put that on a slide."

"The numbering -- is it by size? 62, 43, 36, 36 -- looks like it. If it's always largest first
then Community 1 means something across drafts. That's reviewer two's question answered.
Nearly. Two classes of 36 -- which one is 3 and which is 4 when I rerun? It doesn't say how
ties are broken."

**3. How good is the split?**
"0.716 for a 300-node PPI network at resolution 1 is high, plausibly real structure. But it's one
number from one run. Louvain on a different seed, what do I get? 0.71? 0.69? Is this partition
stable or did seed 7 get lucky? In NetworkX I'd run it twenty times and look at the spread, or
compare partitions with NMI. There's a 'Compare with...' button. Let me guess what that does --
compare Louvain with another result? That might be it, maybe I could compare with a second
Louvain run on another seed. I'd click it. I don't know what it compares, the label doesn't say."

"I click 'Communities table'."

**4. The table (the communities tab under the canvas).**
"Oh. OK. This I like. One row per class: size, edges inside, edges out, density inside, the hub,
and 'module from the file; most members' -- Ribosome 56 of 62, Proteasome 40 of 43, MAPK
signaling 31 of 31, DNA repair 29 of 29. So Louvain recovered the curated complexes nearly
one to one, except Community 6 is a mess -- TGF-beta 21 of 31. That's the answer to 'what groups
did it find', and I didn't have to export to R to get it. In Gephi I'd be in Data Lab sorting by
modularity_class and counting by eye."

"Density for the isolates says 'not defined' rather than zero. Correct. Somebody thought about
that."

"log2FoldChange -- that's biology, not mine, skip. 'mean, vs the rest', fine."

"Header line says 'Full graph: 10 communities, 2 of them a single protein. Sorted by size.' Good.
Scope is on the table too, not just in the panel."

"But this is a table of groups. Where's the per-node column? I want the node table with a
modularity_class column so I can export it and run my regression. There's a 'Nodes' tab next to
it. I'd guess the class is a column there. I'd click it to check -- this screen doesn't show me.
'Export table as CSV...' on this tab gives me ten rows. That's the summary, not the partition."

**5. Could I reproduce it?**
"In the panel: 'Seeded' with an i. Hover: 'The grouping depends on the seed. The same seed gives
the same groups; another seed can place some proteins differently.' Right. Obviously. Resolution
1, Seed 7, both as fields I can change. Good -- Gephi has a randomize checkbox and no seed at all,
so that's already better than Gephi."

"Details opens a 'Run record'. Method: Louvain, weighted modularity, resolution 1. Seed 7.
Normalization: divided by twice the total confidence of all edges. Weight: confidence used as
similarity, 0.40 to 0.99. Numbering: by size, largest first. Engine: CPU, 'Louvain has no WebGPU
version'. That is a methods paragraph. I would paste that. There's a Copy button, I assume it
copies this as text."

"What's missing to reproduce it outside this tool: the version of the software, and which
Louvain implementation. Seed 7 in your code isn't seed 7 in NetworkX -- `louvain_communities(G,
weight='confidence', resolution=1, seed=7)` will not give me these ten groups, different random
number generator, different node order. So 'reproduce' means 'reproduce in this tool, this
version'. Fine, but then I need the version number in the record, and I don't see one. Also:
Louvain has levels -- is this the final level? Is there a threshold? NetworkX has one. Not here."

"And would 0.716 match NetworkX's modularity() on this partition? It should, if the
normalization line is honest -- I can check that part: export the node partition, compute
modularity in Python. That's the check I'd do before citing it. Whether I can do that depends on
the Nodes tab having the class column, which I can't see."

**6. Wrapping up.**
"Groups: ten, eight real ones plus two isolates, mapping almost cleanly onto the curated
complexes, one mixed group. Quality: modularity 0.716 on the full graph, weighted, versus 0.663
for the imported modules. Reproduce: in this tool yes -- seed, resolution, weight, scope all
written down. Outside it, no, and it doesn't say what version to cite."

## Single Ease Question

**5 of 7.** "The first two questions took me a minute. The third one I could answer only half,
and I had to guess where the per-node partition lives."

## Would she use this instead of Gephi?

"Not instead. For this job -- run modularity, say what it found, say what it ran on -- it's
better than Gephi. The scope line and the seed are exactly what Gephi doesn't give me, and the
groups table with 'module 56 of 62' is something I build by hand every time. But I don't cite a
number I can't recompute, and without a version in the run record and the node-level classes in
a CSV, I'd still run it in NetworkX for the paper. I'd use this to look, and teach with it maybe.
Ask me again when the record has a version number."

## Problems observed

1. The run record has no software version or implementation name; "seed 7" cannot be cited or
   reproduced outside this tool, and nothing says so. (severity 3)
2. No way visible to see how stable the partition is across seeds (a spread of modularity, or
   agreement between runs); one run's 0.716 is presented alone. "Compare with..." does not say
   what it compares. (severity 2)
3. The per-node community assignment is not visible on these screens; the Communities tab exports
   ten summary rows, and she had to guess the Nodes tab holds the class column. (severity 3)
4. "the file's modules 0.663" is ambiguous -- reads as a file named modules rather than the
   modularity of the imported module column. (severity 2)
5. Ties in the size-based numbering (Communities 3 and 4, both 36) have no stated tie-break, so
   ids may still swap between reruns. (severity 2)
6. Community 7 is drawn black, which disappears against dark edges and prints badly. The
   legend's "Louvain color community" runs its name and its column together. (severity 1)
7. The run record popover covers most of the canvas while open. (severity 1)
