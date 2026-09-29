# Session: a finished community detection, read by the Gephi holdout

**Participant:** Dr. Mara Lindqvist (simulated; associate professor, Gephi user since 0.8).
**Task as given by the moderator:** "Community detection has finished. Say what groups it found,
how good the split is, and whether you could reproduce it."
**Screens used:** the Results panel in its finished Louvain state, then the same result opened in
the table under the canvas (the communities tab).
**Renders looked at:** `shots/r3-mara-gdf-louvain.png`, `shots/r3-mara-gdf-louvain-table.png`.

## Think-aloud

**1. The first screen.**

"All right. Human protein interactions -- not my data, but fine, 300 nodes, 1,262 edges, three
components. The right side has the counts; good, that is the first thing I check. On the left,
under 'In this project', Louvain with a 10 beside it. So ten communities. That is what Gephi would
put in the modularity report."

"The panel in the middle says Louvain, and right under the title: 'on: full graph, 300 nodes, 3
components'. Thank you. That is the question I always ask first -- on what? In Gephi it is
whatever is visible and nothing tells you. Here it says full graph, and the Scope box says Full
graph too. I'd still test it with a filter on, but at least it is written down."

"'Seeded', with a little i. Undirected. CPU. 'Weight: confidence, higher = stronger link (your
answer).' My answer? I don't remember answering anything -- oh, I suppose some earlier run asked
me which way the weight goes. Fine. At least it says the run was weighted. Gephi has a 'use
weights' checkbox and half my students forget whether they ticked it."

**2. What groups did it find?**

"Groups: 10 communities. Largest 62 proteins. Two single proteins, 'no interaction'. So really
eight communities and two isolates. That's honest -- Gephi would just give them classes 8 and 9
and you'd have to work out they're singletons."

"The legend on the canvas says Community 1, 62; Community 2, 43; 3 and 4 are 36 each; 6 more. I'd
want all ten there, but the '6 more' is fine for a panel. For a figure I'd need the whole legend."

"I click 'Communities table'." (Moves to the table render.)

"Now this is my Data Laboratory, sort of. One row per community. Size, edges inside, edges out,
density inside, a hub, and -- 'module, from the file; most members'. Ribosome 56 of 62,
Proteasome 40 of 43, Complex I 35 of 36. Oh, that's nice. So the detected groups line up with the
annotated modules mostly. Community 6 is the weak one -- TGF-beta 21 of 31. That's the one I'd
look at."

"'Sorted by size', and the communities are numbered by size. Community 1 is the biggest. Is that
numbering stable? If I re-run with a different seed, is Community 1 still the ribosome? Probably,
if it's the biggest, but 3 and 4 are both 36 -- which one gets 3 when they tie? That is exactly
the 'why did community 7 become community 4' letter from reviewer two. It doesn't say how ties are
broken."

"log2FoldChange, mean versus the rest -- that's the biologists' column, I'll skip it. 'Density
inside, not defined' for the single proteins. Good, not a zero."

"What I don't see is the node table with a community column. The tabs say Nodes, Edges,
Communities: Louvain. I assume the Nodes tab has a Louvain column I can export for R. I'd click
Nodes to check, but the render doesn't show it, so I'm taking that on faith. 'Export table as
CSV...' exports what, this table of ten rows or the nodes? From here, I'd guess these ten rows."

**3. How good is the split?**

"Modularity 0.716. That's high; for a protein network with annotated complexes, believable. And
'the file's modules 0.663' right under it -- so the annotated partition scores 0.663 on the same
measure. That's a useful comparison, I like that; it tells me Louvain is finding a slightly
tighter split than the curated modules. I'd put that sentence in a paper."

"But 0.716 computed how? Weighted, I assume, because it says weighted. I'd want the unweighted
number too, because NetworkX's default and Gephi's default are what reviewers check against.
There's nothing here that gives me both. I'd have to change Weight to none and run again."

"And one number from one seed is not a quality measure for Louvain. I want to know: over ten
seeds, is it 0.716 plus or minus what? Gephi doesn't give me that either, to be fair, I do it in
Python. But if a new tool wants me, that's the kind of thing that would do it."

"Edges out per community is here, so I could work out conductance myself. It isn't computed. Fine."

**4. Could I reproduce it?**

"Seed 7. It's a field I can see and change. Resolution 1. Good, those are the two things Gephi
buries in the dialog and never writes into the report."

"I click 'Details'." (The run record opens over the canvas.)

"Run record. Method: Louvain, weighted modularity, resolution 1. Seed 7. Damping: does not apply
-- why is that even listed? Fine, it's a template. Normalization: modularity divided by twice the
total confidence of all edges. That's the standard formula with weights, 2m. Good, I can check
that. Weight conversion: confidence used as given, 0.40 to 0.99, higher equals stronger link.
Numbering: by size, largest first. Engine: CPU, Louvain has no WebGPU version."

"And there is a Copy button. So I can paste this into my methods notes. That's more than Gephi's
report gives me."

"But -- reproduce with what? 'Louvain' is not one algorithm; it's a family of implementations.
Seed 7 in which library, which version? If I run `louvain_communities(G, weight='confidence',
resolution=1, seed=7)` in NetworkX I will not get the same partition, because the node order and
the random generator are different. The record doesn't name the implementation or a version
number, so seed 7 only reproduces the result inside this tool, and only if this tool doesn't
change. For a methods section I need 'graphty version such-and-such, Louvain from so-and-so'. That
line is missing."

"Also no number of levels or passes, and no 'randomize node order: yes/no'. Gephi has the
Randomize checkbox; it matters."

"So could I reproduce it? In here, probably: same file, seed 7, resolution 1, weight confidence,
full graph. Outside, against NetworkX -- I could get the same modularity *measure* for this exact
partition if I export the node column, and that's what I'd actually do: export the assignment,
recompute modularity in NetworkX, and if it says 0.716 I trust it. If it says anything else --
'No. That's wrong, and I don't have time to find out why.'"

## Answer to the moderator

"Ten communities: eight real ones, 29 to 62 proteins each, that mostly match the annotated
modules -- ribosome, proteasome, complex I, spliceosome and so on -- with community 6 the messy
one, only 21 of 31 TGF-beta. Plus two isolated proteins it calls their own communities.
Modularity 0.716, weighted by confidence, versus 0.663 for the file's own modules. Reproducible
inside this tool, yes, seed 7 and resolution 1 are right there. Reproducible for a paper, not
from what's on the screen: it doesn't say which Louvain implementation or which version."

## Single Ease Question

**5 of 7.** "Finding the groups and the modularity was quick, quicker than Gephi's report window.
Proving I could reproduce it is where I had to stop and think, and I didn't get all the way."

## Would I use this instead of Gephi?

"For this, reading a community result, it is better than Gephi: it says what it ran on, it shows
the seed and the resolution, it compares against the file's modules, and it doesn't leave me
guessing whether weights were on. I'd use it to check a partition. I wouldn't switch my course or
my papers to it yet -- it has to name its implementation and its version in that record, and I
have to see my own retweet network and ForceAtlas2 in it before I'd move anything. Right now I'd
stay on Gephi for the figure and use this beside it."

## Problems observed

1. **Run record names no implementation or software version** (severity 3). Seed 7 reproduces
   only inside the tool; the record cannot go into a methods section or be checked against
   NetworkX. Quote: "Seed 7 in which library, which version?"
2. **No sense of stability across seeds** (severity 2). One modularity from one seed; nothing
   says how much the split or the score moves on another seed, and there is no quick way to run
   several.
3. **Tie-breaking of size-based numbering is not stated** (severity 2). Communities 3 and 4 are
   both 36 proteins; which gets which number is not said, which is the reviewer-letter problem.
4. **Only the weighted modularity is shown** (severity 2). The unweighted figure, which
   reviewers compare against defaults, needs a second run.
5. **Randomize node order and number of passes are absent** from both the options and the run
   record (severity 2).
6. **"Your answer" in the weight line is confusing** when the reader does not remember being
   asked (severity 1).
7. **Export target unclear from the communities tab** (severity 1): "Export table as CSV..."
   could be the ten community rows or the per-node assignment; the per-node column is not visible
   from this state.
8. **"Damping: does not apply" in a Louvain record** reads as a template leftover (severity 1).
