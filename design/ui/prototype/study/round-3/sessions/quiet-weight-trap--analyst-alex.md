# Can these rankings be trusted? -- Analyst Alex

Participant: Alex, a data analyst at a logistics company. He computes network metrics in Python
(NetworkX) and draws them in Gephi.

Task as given by the moderator: "Something about these rankings bothers a reviewer. Find out
whether the numbers can be trusted." The planted problem: on the Les Miserables co-appearance
graph, an edge weight that means "how often two characters appear together" (bigger = closer)
is suspected of having been used as a distance (bigger = farther) in a ranking.

Screens used: the Results panel mock (starting at its first state) and the load step mock.
Renders read: `shots/screens__results-panel.png`, `shots/screens__results-panel--finished.png`,
`shots/record/r3-alex-quiet-weight-filtered.png`, `shots/record/r3-alex-quiet-weight-louvain.png`,
`shots/record/r3-alex-quiet-weight-outofdate.png`, `shots/record/r3-alex-quiet-weight-load-policy.png`.

## Transcript

**First screen (a PageRank run on patent citations).**
"OK, this is patents, not Les Mis. 124 thousand nodes. PageRank running on WebGPU, under a
minute, there's a Cancel. Fine, that's nice, but it's not my graph. Where's Les Miserables? There's
no file switcher I can see except the project name at the top with a little arrow. I'll just
flip through the states strip until I see Les Mis."

**Flipping through.** "Proteins, proteins, proteins... finished Betweenness on proteins... OK,
here -- 'Les Miserables', top left. Filtered: 60 of 77 nodes, 1 step."

**The Les Miserables betweenness result.**
"Right. So the reviewer doesn't like the rankings. Top five: Valjean 0.419, Gavroche 0.172,
Marius 0.164, Fantine 0.154, Javert 0.073. Hm. When I've done Les Mis in NetworkX Valjean is on
top, like 0.57, and Myriel is second. Myriel's not here at all. That's the first thing that bugs
me."

"Wait -- it says 'Filtered graph, 60 of 77' in Scope. And the filter chip up top. So they've cut
the degree-one people. Myriel's whole betweenness is those nine hangers-on from the bishop
chapters, right, the ones only he connects to. Take those out and he's got nothing to bridge.
OK. That's actually probably fine. But I had to work that out myself -- nothing next to the top
five says 'these would be different on the full graph'. If I screenshot this for my director
without the chip, it's wrong."

"Now the weight thing. The line under the title: 'Exact. Unweighted, undirected. WebGPU.' Weight
field: 'None declared'. I click Details..." [run record opens] "'Weight conversion: None:
unweighted.' OK. Statistics on the right: 'Edges: undirected, no weight'. So that's three places
saying it didn't use any weight."

"So... if it's unweighted, it can't have used co-appearance as a distance, can it? That's the
reviewer's worry, and this run just didn't use it. The numbers are plain hop counts. So in that
sense yes, I'd trust them -- for the filtered graph."

"But hang on. Les Mis *has* weights. The Gephi sample, the NetworkX one -- every edge has the
number of chapters two characters share. Here it says 'no weight'. Did it drop the column when
it loaded? Did somebody load a version without it? There's nothing that tells me. 'None
declared' -- declared by who? I didn't declare anything. I click the Weight dropdown to see
what's in there..." [nothing opens in the prototype] "...nothing. And '4 more' under Edges
doesn't open either. So I can't see if the count column is even in the data."

"I hovered the little (i) next to Exact: 'Computed on every node, not estimated. It does not say
the ranking is meaningful.' Ha. OK, that's honest, I like that. Gephi never tells you that."

**Looking for a weighted run to compare.** "What I'd actually want is: run it again *with* the
co-appearance weight, the right way round, and see if the top five moves. There's 'Compare
with...' down there. But there's no weighted Les Mis run to compare with, and I can't make one
here. So I go look at the load step to see whether the weight gets lost at import."

**Load step.** "This is a protein file, not Les Mis. confidence, Number, role Weight. Nothing
here asks what a higher confidence means -- it just says Weight. Hmm. So when does it decide if
bigger is closer or farther? I don't see that anywhere on this dialog. The parallel edges thing is
clear though, Keep all or Merge, with counts. 2,298 or 1,262. Good. I like that it tells me the
two proteins with no edges by name."

**Back in the Results panel, protein graph -- Louvain.** "Here's a weighted one. Under the title:
'Weight: confidence, higher = stronger link (your answer)'. OK! That's the thing. It says which
way round it read the weight. And the run record: 'confidence used as given, 0.40 to 0.99; higher
= stronger link'. If the Les Mis one looked like this I'd know in two seconds whether it was read
as a distance. That's what I'd point the reviewer at."

"'(your answer)' though. I'd be like -- when did I answer that? If it was asked in some form the
first time I ran something, three weeks ago, I don't remember. That's fine as long as it's
right, but if it's wrong that's my name on it."

**Out of date state.** "Oh, this is the trap, on proteins. 'Louvain used confidence as a
distance. Your answer is now higher = stronger link. Re-run to update.' And 'Betweenness and
Closeness ran unweighted, so they stay current.' OK, this is good. It tells me which results were
wrong and which weren't touched. Re-run all, one button. That's exactly the kind of thing that
ends up in a deck wrong in Gephi and nobody notices."

"Same question though: how did it end up 'used as a distance' in the first place? Did somebody
pick that, or did the tool guess? It says 'your answer is *now*...', so somebody answered it
wrong before. I'd want to see who and when, because the reviewer's going to ask me."

## Verdict on the task

"For the Les Mis one: the numbers don't use the weight at all -- it says Unweighted in the
status line, the record and the Statistics box -- so the similarity-as-distance thing can't be
what's wrong with *this* ranking. What's different from what I know is Myriel, and that's the
filter, 60 of 77. So: trustworthy for what it is, filtered and unweighted. What I can't tell the
reviewer is where the co-appearance weights went. That's what I'd have to go check in Python."

## Single Ease Question

**4 out of 7.** "The screen told me the truth, in three places, and the record is great. But I
had to work out the Myriel thing myself, and I couldn't find out why the weights are missing.
And the actual weighted-the-wrong-way example was on a different dataset, so I had to put it
together."

## Would I use this instead of what I use now?

"For this kind of check, maybe yes. Gephi never tells you whether a statistic used the weight,
or which way round, and it certainly doesn't tell you a result went stale when you changed it.
The 'Louvain used confidence as a distance... Betweenness ran unweighted, so they stay current'
line is better than anything I have. But I'd still rerun betweenness in NetworkX before I put it
in front of my director, at least the first few times, and I'd want to see where a weight column
went when it says 'no weight'."
