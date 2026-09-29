# Narrow to the biggest piece, then rank it -- Expert Emma

Participant: Emma, network scientist, networkx / igraph in notebooks, Gephi for the one figure.
Task as given by the moderator: "Look only at the biggest connected piece, and tell me its size
and who matters most in it."
Screens, in the order she met them: the filter chip and its steps, the frame at rest (for
comparison), the Results panel with a filter on.

Outcome: success, with friction. She reached "76 nodes, one component; Valjean by a wide margin
on betweenness (0.547), then Gavroche, Myriel, Marius, Fantine". SEQ 5 of 7.

## Transcript (think-aloud, lightly cleaned)

**Filter chip screen, as it opens.**

"Les Miserables. Fine, I have used this set in every intro lecture for ten years. Top left,
under the title, a blue pill: 'Filtered: 28 of 77 nodes, 3 steps'. So somebody has already
filtered it. And a popover is open with three steps. The first one is literally 'Filter to
Largest component, 76'. OK, so the thing I want exists and it is called what I would call it.
Good. But I did not ask for degree >= 5 or for group 8 to be thrown out. I need those gone."

"The 76 is a count on the right of the row, I assume that is what is left after that step.
Yes -- the next step says 41, the last 28, and the pill says 28. So each number is what
survives. That is readable."

She unticks 'degree >= 5' and 'Filter out group = 8'.

"Ticking them off rather than deleting, because I might want them back. Pill should now say
76 of 77. The Statistics panel on the right has little funnel marks next to every number,
which I take to mean 'this is on the filtered graph'. Components 1, largest component 76,
isolated nodes 0. Good, that is what I want to see, and it says the scope in words at the top
of the list, 'Filtered graph: 76 of 77 nodes'. I like that it does not make me guess."

"Wait. What was the one node? Let me look at the unfiltered state."

She switches to the 'No steps' tab to see the full graph.

"Components 2, largest 76, isolated 1. The isolate is that lone blue dot at far left of the
canvas. Blue is group 1, the Myriel group. In Knuth's data Les Mis is connected -- OldMan
hangs off Myriel. So either this is a different copy of the file or something ate an edge.
254 edges, which is the right count for the standard set, so the edge is not missing, it has
gone somewhere else. A self-loop, probably. That would bother me with client data. Here it is
a teaching set, so I note it and keep going."

"Also: density here is 0.0865 and average degree 6.57. On the other screen [frame at rest]
the same graph says density 0.0868. 254 over 77 choose 2 is 0.0868. And 2 times 254 over 77
is 6.60, not 6.57. So this panel is dividing by 253 edges and printing 254. Either a self-loop
is being counted in one number and not the other, or it is a bug. Either way two screens of
the same tool disagree on the third decimal of density, and the third decimal is exactly where
I look. I would file that before I trusted anything else."

**Size: answered.**

"Size of the biggest piece: 76 nodes. Edges -- with the isolate gone, the filtered edge count
should still be 254 because the isolate had none, which the Results screen later confirms.
Fine."

**Who matters most.**

"Now 'who matters most'. The node table at the bottom is sorted by degree, and with the filter
on it has a second column 'degree on: full graph'. Nice touch for the three-step case, pointless
here since removing an isolate changes nobody's degree. Degree gives me Valjean 36, Gavroche 22,
Marius 19. But 'matters' in a co-appearance network is a brokerage question, so I want
betweenness, and I want to know which normalization."

"Nothing on this screen runs an algorithm. There is a lightning bolt in the bottom toolbar --
no idea what that is, I will not guess. There is 'Results' on the left rail with a flask icon.
Flask means computed stuff, presumably."

She goes to the Results panel.

**Results panel, with the filter on.**

"The pill still says 'Filtered: 76 of 77 nodes, 1 step'. Good, the filter survived the move.
A catalog on the left: Centrality, Betweenness first. I click it."

"The editor says, in order: 'on: filtered graph, 76 nodes, 1 component. Exact. Unweighted,
undirected. WebGPU.' Then Scope: 'Filtered graph, 76 of 77'. That is exactly the sentence I
would write in a methods section. I did not have to pick the scope, it followed the chip -- I
would want to know I CAN pick full graph there, and the dropdown suggests I can."

"Weight: 'None declared'. The Les Mis file has a value on each edge, the co-appearance count.
The frame-at-rest screen literally says 'weight: value' under Edges. So why does this say none
declared? Either the Results panel does not see the attribute, or 'declared' means something
narrower than 'present'. For betweenness I would actually run it unweighted anyway, because
weight-as-count makes strong ties LONG paths, which is the wrong direction. But I want the tool
to ask me that, not to tell me there is nothing to ask about."

"Top nodes: Valjean 0.547, Gavroche 0.163, Myriel 0.151, Marius 0.131, Fantine 0.127. The
ordering is right for this network. The numbers are a bit off what networkx gives me on the
standard set -- Valjean is about 0.57 there, Myriel about 0.18 -- but that is consistent with
Myriel having lost OldMan, whose only route goes through Myriel. So the lower Myriel score is
the data, not the algorithm. If that is the explanation, it actually confirms the edge problem."

She opens Details.

"Run record: Brandes, exact, every node a source. Seed none, because nothing is sampled.
Normalization: divided by (n-1)(n-2)/2 = 2,775 pairs, n = 76, the filtered graph. Scope:
'after Filter to Largest component'. Copy button. This is the page I usually have to read the
source to get. networkx's normalized=True for undirected is the same 2/((n-1)(n-2)), so I can
check it against my notebook directly. That is the best thing on any of these screens."

"Distribution: 46 nodes at zero, all ranked '31='. Ties sharing a rank -- correct, and more
honest than Gephi's arbitrary ordering."

"'Appearance: color not shown'. So the canvas is still painted by group, not by betweenness.
That is fine by me, I read the ranking, not the picture."

**Answer to the moderator.**

"The biggest connected piece is 76 of the 77 characters, 254 co-appearance links, one
component. Valjean matters most by a mile on betweenness, about three times the next one;
then Gavroche, Myriel, Marius, Fantine. On degree it is Valjean, Gavroche, Marius. And I'd
double-check the file, because OldMan should not be an isolate."

## After the task

**Single Ease Question: 5 of 7.**

"Finding the step was easy because it was already sitting there, and the name is the name I
use. Running betweenness on the filtered graph was easy and the record is excellent. It loses
two points because two screens disagree on density and average degree, because the weight says
'none declared' on a file that has weights, and because nothing on the filter screen tells me
where the centralities live -- I only found them because I guessed a flask meant results."

**Would she use it instead of her current tool?**

"Not instead of the notebook. Beside it, possibly, for the hand-off: the run record is better
than what Gephi gives me, and 'Filtered graph, 76 of 77, after Filter to Largest component' is
the sentence a reviewer asks for. But a tool that prints 0.0865 in one panel and 0.0868 in
another for the same graph gets zero client data until someone explains which one is right.
I also still have not been told anywhere on these screens whether I can do this from code."

## Problems observed

1. Density and average degree differ between two screens for the same full graph (0.0865 and
   6.57 on the filter screen; 0.0868 on the overview; 254 edges gives 0.0868 and 6.60).
   Severity 3.
2. Weight reads "None declared" in the Results editor while the overview says the edges carry
   "weight: value". Severity 3.
3. The Les Miserables fixture has OldMan as an isolate and 254 edges; in the standard data OldMan
   links to Myriel. A network scientist recognizes the set and suspects the file or the importer.
   Severity 2.
4. The filter screen gives no route to rankings; "who matters" meant guessing the Results rail
   icon. The node table's only measure is degree. Severity 2.
5. The filter chip opens with three steps already on, so the task began with removing someone
   else's filter. Severity 1 (prototype start state, but it would happen in a shared project).

## What worked

- "Largest component" is a named filter step, in the field's own word, with its surviving count
  on the row.
- Scope follows the chip into the Results editor and is stated with both counts.
- The run record names method, seed, normalization with the actual n, and the step that made the
  scope; copyable.
- Tied scores share a rank ("31=").
