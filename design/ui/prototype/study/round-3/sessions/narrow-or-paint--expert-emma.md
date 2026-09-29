# Session: the biggest connected piece -- Expert Emma

**Participant:** Expert Emma, network scientist (see `../../personas/expert-emma.md`).
**Task as the moderator read it:** "Look only at the biggest connected piece, and tell me its size
and who matters most in it."
**Screens, in order:** the frame at rest (Les Miserables loaded), the filter chip and its steps,
the Results panel after a filter.
**Renders the participant saw (design notes hidden):** `shots/emma-r3-nop-frame.png`,
`shots/emma-r3-nop-chip.png`, `shots/emma-r3-nop-rp.png`.

## Transcript (think-aloud)

**Frame at rest.**

> "Les Miserables. The Knuth co-appearance graph. I know this one -- 77 characters, 254 edges,
> and it is connected. So the trick answer is 'the biggest connected piece is the whole thing'.
> Let me see if the tool agrees before I say that out loud."

She reads down the right panel before touching anything.

> "Nodes 77, edges 254, 'undirected, weight: value'. Good, it found the value column and calls it
> a weight. Density 0.0868 -- 254 over 77 choose 2 is 0.0868, fine. Connected components: 1. There
> it is. So the giant component is all 77 nodes and all 254 edges."

> "Top left: 'This browser. Nothing sent.' That is the sentence I look for first. I would want a
> link behind it that tells me what 'nothing' covers, but it is in the right place."

> "What I do not see in Statistics is a 'largest component' row. With one component I can do the
> arithmetic, but on a client graph with 40 components I want the size of the giant component as a
> number, not as something I infer. It is not here at rest."

**The filter chip.** She clicks "Full graph" under the file name, because the task literally says
"look only at", and that is a filter.

> "Opens a popover. 'No filter steps. Every number reads the full graph.' Fine. 'Add step'."

The Add step menu lists, under Filter to: Largest component, k-core..., Rule...; under Filter out:
Rule....

> "'Largest component' is the first item. Good, that is exactly
> `G.subgraph(max(nx.connected_components(G), key=len))`. I would add it even though it is a no-op
> here, because the day I rerun this on the next snapshot it will not be a no-op, and I want the
> step written down."

She adds it. The row reads "Filter to Largest component -- took out 0 &middot; 77 left".

> "Took out 0, 77 left. Honest. No note under it, because there is only one piece -- it does not
> invent a warning. I like that it says 'took out 0' instead of hiding the step. I would still want
> it to say 'of 1 connected piece' so I know it looked, not that it silently failed."

She looks at the Three steps version of the same popover that the prototype shows by default.

> "The other example has 'keeps only nodes with at least 5 neighbors among the 60 it reads'. That
> sentence is exactly the thing people get wrong -- degree on the filtered graph versus the original.
> And the table has 'degree' and 'degree on: full graph' as two columns. Somebody here has been
> burned by that. Good."

> "Is the chip scriptable? Is there a text form of these steps I can paste into a notebook? I do
> not see one. 'Create rule set from step' is in a row menu, which is not the same thing."

**Size answer.** "77 nodes, 254 edges. One component, so the biggest piece is the graph."

**Who matters most.** She goes to Results.

> "'Who matters most' -- by which centrality? The moderator will say 'your call'. For a
> co-appearance graph, degree and betweenness. Valjean wins both on this graph; I have computed it
> in class. Let me see what it says."

The Results panel opens with Betweenness already run.

> "Wait. The chip now says 'Filtered: 60 of 77 nodes, 1 step', and the run says 'on: filtered graph,
> 60 nodes, 1 component', scope 'Filtered graph, 60 of 77', and the run record says 'after Filter
> to degree >= 2'. That is not my filter. I added Largest component and it left 77. Either the
> prototype jumped, or it kept somebody else's step."

Moderator: "Assume the scope is whatever you set."

> "Then I would open Scope and pick... what? 'Filtered graph, 77 of 77'? That is a strange thing to
> read. If the filter kept everything I would want it to say so -- 'Filtered graph (same as full
> graph), 77'."

She reads the run record because it is open.

> "Now this I like. 'Brandes betweenness, exact: every node is a source.' 'Seed: None, nothing is
> sampled.' 'Normalization: divided by (n-1)(n-2)/2 = 1,711 node pairs; n = 60, the filtered
> graph.' That is networkx's normalized=True for undirected. I can check that. That is the line
> Gephi never gives me. And 'Copy' next to it -- that goes in the methods section."

> "Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073. On 60 nodes, fine --
> I do not have the reference number for the 60-node graph in my head, I would check in the
> notebook. On the full graph networkx gives Valjean about 0.57. I would want to see that number."

> "'No near-ties in the top 5: the closest, ranks 2 and 3, differ by 4.7%.' That is actually useful
> -- somebody will ask whether Gavroche and Marius are 'really' different."

Then the weights.

> "Hang on. Weight: 'None declared'. 'Unweighted, undirected.' And Statistics on this screen says
> 'Edges: undirected, no weight'. Two screens ago it said 'undirected, weight: value'. Which is it?
> The value column in this dataset is the number of co-appearances. If the tool detected it as a
> weight on load and then Results says 'none declared', either something dropped it or 'declared'
> means something I have not been told. This is the exact thing I check in every tool."

> "To be fair, for betweenness I would probably run it unweighted anyway, because networkx treats
> weight as distance and co-appearance count is a strength, so you would have to invert it. The run
> is honest that it was unweighted. But the two panels disagreeing about whether the graph has a
> weight at all -- I would stop and go look at the file."

> "'WebGPU' as the engine. For 60 nodes? I do not care, as long as it matches."

**Her answer to the moderator:** "The biggest connected piece is the whole graph: 77 nodes, 254
edges, one component. The person who matters most is Valjean -- highest degree and highest
betweenness by a wide margin. I would put the betweenness value in writing only after the run was
on all 77 nodes and I had checked it against networkx; what is on screen is the 60-node number."

## After the task

**Single Ease Question:** 5 of 7.

> "Easy for the size -- the component count was on the first screen and 'Largest component' was the
> first thing in the filter menu. Harder for the second half, because the Results screen was scoped
> to a filter I did not make and it contradicted itself on the weight."

**Would she use this instead of her current tool?**

> "For the analysis, no. The notebook does this in three lines and I trust it. For the thing I
> would actually hand to the fraud investigator, maybe: the filter steps with 'took out, left' on
> every row, the 'among the 60 it reads' sentence, and a run record that states the normalization
> are better than anything Gephi shows a non-coder. If I could export those steps and that run
> record as text I can paste into a notebook, and the weight story is consistent, I would try it on
> a client graph. Not before."
