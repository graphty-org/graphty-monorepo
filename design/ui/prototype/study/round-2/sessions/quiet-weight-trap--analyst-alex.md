# Session: can these rankings be trusted? (a similarity weight read as a distance) -- Analyst Alex

Participant: Alex, operations data analyst at a logistics company. Computes metrics in NetworkX,
draws them in Gephi. Knows Les Miserables as "the tutorial dataset" from the Programming Historian
and Gephi videos, and knows its edges carry a co-appearance count.

Task as given by the moderator: "Something about these rankings bothers a reviewer. Find out
whether the numbers can be trusted." The moderator added that the reviewer suspects a similarity
weight has been treated as a distance, on Les Miserables.

Screens: the Results panel page (it opens on a patent-citations graph with PageRank running, and
has numbered states along the top), then the Les Miserables state with Betweenness finished and
its Run record open, then the protein-network states (a finished Louvain run, the "Review out of
date" list), then the load step (a CSV and a GraphML file).

## Finding the rankings

**Results panel, first state.** "OK, this isn't Les Mis. 'Patent citations', 124 thousand nodes,
PageRank running on WebGPU, 'under a minute'. There's a progress bar and a Cancel. Fine, not my
problem today. There's a strip of numbered links across the top -- Running, Queued, Finished...
I'm going to click through until I see Les Mis."

"Finished, 8 -- human protein interactions. 10 -- the other answer. 12, Louvain. 14 --
'Results after a filter'. There. Les Miserables."

**Les Miserables, Betweenness finished.** "Right. Left side, 'Les Miserables, Filtered: 76 of 77
nodes, 1 step'. Hm. Filtered. Top nodes: Valjean 0.547, Gavroche 0.163, Myriel 0.151, Marius
0.131, Fantine 0.127. That's roughly the order I remember from NetworkX -- Valjean way out in front,
then that bunch. But I remember Valjean being more like 0.57. So either my memory's off or this
isn't the same calculation. That's exactly the kind of thing a reviewer pokes at."

"Under the title there's a grey line: 'on: filtered graph, 76 nodes, 1 component. Exact.
Unweighted, undirected. WebGPU. Details.' Wait -- unweighted. OK. So the reviewer is worried the
co-appearance count got read as a distance. It says here it didn't read the weight at all."

"And on the right, 'Edges: undirected, no weight'. Hang on. Les Mis has weights. Every edge has a
count of how many chapters two characters share. 'No weight' -- did the import drop them? Or does
'no weight' mean 'you didn't tell it which column'? The Weight box in the form says 'None declared'.
Declared where? I never declared anything, I opened a sample."

"There's '4 more' under Edges. I'd hope the counts are hiding in there, but nothing here tells me
there's a number column sitting unused."

**Details (the Run record).** "Clicking Details. OK, this is good actually. Method: 'Brandes
betweenness, exact: every node is a source.' Seed: none, nothing sampled. Normalization: 'Divided
by (n-1)(n-2)/2 = 2,775 node pairs; n = 76, the filtered graph.' Weight conversion: 'None:
unweighted.' Scope: 'Filtered graph, 76 of 77: after Filter to Largest component.' Engine WebGPU."

"So that's why it's 0.547 and not 0.57 -- it's dividing by the pairs of 76 nodes, and one character
is gone. That's the first time a tool has told me why its number doesn't match NetworkX before I
had to go find out. The Copy button -- I'd paste that straight into the reply to the reviewer."

"But. 'Filter to Largest component', 76 of 77. I thought Les Mis was all one piece. Which character
fell off? And who ran that filter -- me? It says '1 step' at the top. If somebody filtered the
network and then ranked it, the reviewer should be told that too. I'd click the filter chip to see
which node is gone. It doesn't tell me here."

"And the distribution box: 'zero: 46 nodes, all 31='. What is 31-equals? Oh -- they all tie at
rank 31? Maybe. I had to guess."

"Also the picture. Big nodes are Marius, Gavroche, Enjolras... I assumed big means high betweenness,
but the colours are 'Group' from the file, and Appearance says 'color not shown'. There's no size
key on this one. So I don't actually know what the big ones are big by."

## Looking for where "similarity" versus "distance" is set

"Right, the reviewer's actual worry: if I turn the weight on, will it treat 'shares more chapters'
as 'further apart'? Because that would flip the whole ranking -- the closest friends become the
longest road. I don't know how NetworkX does it either, honestly, I've never passed weight to
betweenness."

"The Weight dropdown says 'None declared'. Clicking it -- in this mock nothing opens. So I can't see
what I'd pick. I'm stuck on this screen."

**Protein states, looking for a weighted example.** "Let me find one where a weight is on. State 12,
Louvain. Weight: 'confidence as similarity'. Oh, there it is. And the grey line says 'Seeded,
confidence as similarity, undirected. CPU.' Details: 'Weight conversion: confidence as similarity:
used as given, 0.40 to 0.99; bigger is a closer tie.' OK. 'Bigger is a closer tie' -- that is a
sentence I can say to a reviewer. That's the thing I wanted to see for Les Mis."

"State 15, 'Out of date'. 'Louvain used confidence as a distance. It is now a similarity. Re-run to
update.' Same for the shortest path. And 'Betweenness and Closeness ran unweighted, so they stay
current.' So somebody had it backwards, changed it, and the tool flagged the two results that used
the old reading and left the two that didn't. That's -- yeah, that's the scenario the reviewer is
worried about, and it caught it. In Gephi I'd never have known."

"Though: Louvain using a distance? I didn't know communities could even read a weight that way.
If I'd seen that before the fix I wouldn't have known it was wrong."

"But the tool only caught it because somebody changed the setting. The first time -- when it was
read as a distance -- did anything ask? Where was that choice made?"

**Load step.** "Let me look at loading. CSV: amount gets 'Role: Weight'. That's it. Nothing about
what a bigger amount means. GraphML, the protein one: 'confidence, Number, Role: None'. So loading
doesn't ask either. Somewhere between here and the run, somebody decided it was a distance, and I
can't see where. I'd guess it's in that Weight dropdown I couldn't open."

## Verdict on the task

"For the Les Mis ranking the moderator showed me: I'd tell the reviewer the numbers are fine for
what they are -- unweighted betweenness, exact, on 76 of the 77 characters, normalised by the 76.
The weight wasn't read as a distance because it wasn't read at all. I can prove that with the Run
record."

"What I can't tell them is whether that's the right answer. The co-appearance counts were ignored,
and the screen says 'no weight' like the file hasn't got one. If the reviewer wanted a weighted
ranking, I couldn't show them how the tool would treat the counts, because I couldn't find where
you say 'bigger means closer' for Les Mis. I only saw that sentence on a different dataset."

**Single Ease Question: 4 of 7.** "The part where it tells you what it actually did was easy --
Details, one click, and it's all there. The part the reviewer actually asked -- is the weight the
right way round -- I had to go to a different dataset to even see the question asked."

**Would you use this instead of your current tool?** "For this kind of question, the record is
better than what I have. NetworkX doesn't tell me anything; I have to remember what I passed. If
the 'bigger is a closer tie' line showed up on every weighted run, and 'no weight' told me there's
a number column it's not using, I'd trust the rankings more than my own notebook. I'd still rerun
the top five in NetworkX the first time, to see the numbers match. After that, probably not."
