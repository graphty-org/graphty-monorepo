# Session: can these rankings be trusted? -- Chris, ML engineer (recommendation systems)

Participant: Chris, senior ML engineer on a retail recommendations team (persona:
`study/personas/ml-engineer-recsys.md`). Laptop size, 1440 x 900.

Task as given by the moderator: "Something about these rankings bothers a reviewer. Find out
whether the numbers can be trusted." The graph is Les Miserables. The planted problem was a
similarity (the co-appearance count) being read as a distance.

Screens used: the Results panel (`screens/results-panel.html`, first state, then the Les
Miserables state) and the load step (`screens/load-step.html`, the loaded graph and the
version-history report).

What the participant saw:

- `shots/screens__results-panel.png` -- the first state, PageRank running on patent citations
- `shots/record/r3-chris-quiet-weight-rp-filtered.png` -- Les Miserables, Betweenness finished, with the
  run record open
- `shots/screens__results-panel--outofdate.png` -- the protein project's out-of-date review
- `shots/record/r3-chris-quiet-weight-load-loaded.png` and `shots/record/r3-chris-quiet-weight-load-report.png`
  -- the load step for the protein file

## Think-aloud transcript

**00:00 -- first screen.** "OK, this is PageRank running on some citations graph, 124k nodes.
That's not Les Mis. The strip at the top lists states, so I'm clicking along until I find the
graph I was told about." I click through the state names. Number 14, "Results after a filter",
says Les Miserables in the header, so I stop there.

**00:40 -- Les Miserables, Betweenness finished.** "OK. First thing, the denominator. The header
chip says 'Filtered: 60 of 77 nodes, 1 step'. So this is NOT the full Les Mis graph. The reviewer
is probably comparing these numbers against networkx's `betweenness_centrality` on all 77, and
they won't match. That alone could be what's bugging them." The Scope field says "Filtered graph,
60 of 77" too. Good, it says it twice, so I can't really miss it.

**01:10 -- reading the state line.** "'on: filtered graph, 60 nodes, 1 component. Exact.
Unweighted, undirected. WebGPU.' Unweighted. Hmm." I hover the (i) next to Exact: "Computed on
every node, not estimated. It does not say the ranking is meaningful." "Ha. That's honest,
actually. I like that someone wrote that down."

**01:30 -- the weight question.** "Wait. Les Mis has an edge column, `value`, the co-appearance
count. I know this dataset, it's in every networkx tutorial. The count is a similarity: more
scenes together means a stronger tie. If somebody fed that to Brandes as an edge length, the two
characters who share the most scenes would count as the FARTHEST apart, and every shortest path
would go through the minor characters. Classic bug. I've shipped that bug with a Faiss inner
product and an L2 index." So that's what I'm hunting: did it use `value`, and which way round?

**01:50 -- Weight field.** It reads "None declared" in grey. "None declared... declared by whom?
By me? Is the file supposed to declare it?" I click the dropdown. In the prototype nothing opens,
so I can't see if `value` is even listed as a choice. "I'd expect `value (edge), integer` in
there. I just have to guess that it would be."

**02:20 -- right panel, Statistics.** "Edges: undirected, no weight." Then "4 more", which
doesn't look like something I can click. "'No weight' is wrong, or at least it's misleading. The
file HAS a numeric edge column. What the tool means is 'you haven't told me to use it'. Those are
two different statements. If I'm the reviewer and I read 'no weight', I conclude the file has no
counts and I go and blame the file."

**02:50 -- Details, the run record.** I click Details. The popover lists method (Brandes, exact,
every node is a source), seed (none), damping (does not apply), normalization ((n-1)(n-2)/2 =
1,711 node pairs, n = 60), weight conversion ("None: unweighted"), scope (filtered graph, 60 of
77, after "Filter to degree >= 2"), and engine (WebGPU). "OK, this is the good part. This is
basically the run config I'd log to MLflow. Normalization with the actual n, the filter step that
made the scope... I can reproduce this in networkx: take the subgraph with degree >= 2 and run
`betweenness_centrality(G, normalized=True)` with no weight. And there's Copy, so it goes straight
into the review thread."

**03:30 -- so is the planted problem here?** "According to this record, nothing was used as a
distance. Weight conversion is 'None: unweighted'. So on THIS result the counts can't be flipped,
because they weren't used at all. The ranking (Valjean 0.419, Gavroche 0.172, Marius 0.164,
Fantine 0.154, Javert 0.073) is plain hop-count betweenness on the 60-node subgraph. Valjean on
top is what I'd expect either way."

"But I was told something is wrong. If someone had run it weighted, where would I see which way
the count was read? Not on this screen. I'd be taking 'unweighted' on trust."

**04:10 -- looking elsewhere for the weight direction.** I click through to other states. In
state 10, "Out of date" (the protein project), the Review panel says "confidence is now read as a
similarity; these read it as a distance", and names the two results that used it: Louvain and a
shortest path. The line "Betweenness and Closeness read no weight, so they stay current." "OK, so
the tool DOES track this. That's exactly the check I wanted: which results used the column, and
which way round. And it tells you which ones are safe. That's great. But it's on a different
project, so on Les Mis I only get it by extrapolating."

**04:50 -- the load step.** "Let me check if the load step tells me about the columns." The load
screen is the protein file, not Les Mis. Its Statistics say "confidence: numbers, not used", and
the version-history report says "Roles: confidence: weight ... What a higher confidence means is
asked by the first run that reads it." "THAT is the sentence I wanted on the Les Mis screen:
'value: numbers, not used'. The protein screen says it, and the Les Mis statistics just say 'no
weight'. Same situation, two different sentences. And 'asked by the first run that reads it' is
fine, as long as the answer shows up on every run afterwards. The out-of-date screen suggests it
does."

**05:30 -- smaller snags.** "In Distribution: 'zero: 32 nodes, all 29='. I had to stare at that.
I think it means they're all tied at rank 29. Just say 'tied at rank 29'. And 'middle 0.000', so
more than half the nodes have zero betweenness after the filter. Fine, that's Les Mis with the
leaves gone. But the reviewer should know that the degree >= 2 filter removed exactly the nodes
that would have had zero anyway, so it barely moves the top ranks. What it moves is the
normalization. Values come out bigger with n = 60 than with 77."

**06:00 -- verdict.** "My answer to the reviewer: the numbers are trustworthy for what they are,
which is exact, unweighted betweenness on a 60-node degree >= 2 subgraph. They are not full-graph
numbers, and they ignore the co-appearance counts completely. No similarity was read as a
distance in this run, because the counts weren't used. If the reviewer expected weighted numbers,
this is the wrong run. If they compared against the full 77-node graph, it's the wrong
denominator. I got there from the run record, not from the panel. The panel's 'no weight' almost
sent me the wrong way."

## Single Ease Question

**4 of 7.** "The run record answered it in one click, and it's honest. But I had to know Les Mis
has a `value` column to even ask the question. The screen told me 'no weight', which is the
opposite of the truth about the file. I couldn't open the Weight dropdown to see whether `value`
would be offered or which way round it would be read."

## Would he use this instead of his current tool?

"For this kind of question, 'which numbers went into this ranking', the run record is better
than what I have. In a notebook the config is whatever I remembered to log. Here it's the
normalization with the real n, the filter step, the engine and the weight conversion, and it
copies. The out-of-date review that lists which results used a column as a distance is something
I'd actually want for my score columns. But I'm still in the notebook for now. I'd switch for
debugging when the Statistics panel stops saying 'no weight' for a file with a numeric edge column
in it, and when the Weight field shows me which way a column will be read before I run, not after."

## Problems observed

1. **Statistics says "no weight" when the file has a numeric edge column** (Results panel, right
   Statistics section, "Edges: undirected, no weight"). The Les Miserables file carries `value`,
   the co-appearance count. The protein load step says "confidence: numbers, not used" in the
   same situation. The participant read "no weight" as a claim about the file and nearly blamed
   the data. Severity 3.
2. **The Weight field "None declared" doesn't say what could be declared, or by whom** (Results
   panel, Weight field). The participant couldn't tell whether `value` would appear as a choice,
   or which way it would be read, before running. Severity 3.
3. **The weight direction is visible only on a result that used a weight.** Les Miserables has no
   weighted result, so the "similarity read as a distance" check could not be done there. The
   participant found the mechanism only on the protein project's out-of-date state. Severity 2.
4. **"all 29=" in Distribution is cryptic** (Results panel, Distribution, zero row). It was read
   correctly, but only after staring at it. Severity 1.
5. **"4 more" under Statistics doesn't look clickable**, so the edge columns stayed hidden
   (Results panel, Statistics). Severity 2.

## What worked

- The run record (Details) gave method, normalization with the real n, weight conversion, the
  filter step and the engine in one popover, with Copy. That is what settled the question.
- Scope shows both counts ("Filtered graph, 60 of 77"), and the header chip repeats it, so the
  denominator could not be missed.
- The Exact tooltip, "It does not say the ranking is meaningful", earned trust.
- The out-of-date review names which results read a column as a distance and which stay current.
