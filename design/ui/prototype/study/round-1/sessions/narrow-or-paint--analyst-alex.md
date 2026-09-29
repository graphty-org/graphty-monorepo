# Session: narrow the graph, then find who matters -- Analyst Alex

Participant: Alex, operations data analyst, uses NetworkX for the numbers and Gephi for the picture.
Task as given by the moderator: "Look only at the biggest connected piece, and tell me its size and
who matters most in it."
Screens, in order: the filter chip with its steps open, the app at rest, the results panel.
Data on screen: Les Miserables co-appearances (77 characters) for the first two; the results panel
shows other projects (patent citations, human protein interactions).

## Transcript (think-aloud)

**Filter chip screen, as it opens.**

> OK, Les Miserables, the sample. Fine. 77 nodes over here in the Graphs list. There's already a
> little box open, "Filter steps", with three things ticked: "Filter to Largest component", "Filter
> to degree >= 5", "Filter out group = 8". Somebody's been here before me.

> Right side, Statistics: "largest component 28". So... 28? That was quick.

(He starts to say "28 nodes" as his answer, then stops.)

> Hang on. The step row says "Largest component" and then 76 next to it. And the Statistics say
> largest component 28. Those can't both be the biggest piece. Which one is the answer?

> I think the 76 is how many are left after that step, and then the degree one knocks it down to 41,
> and the group one to 28. So the 28 is the biggest piece of whatever's left after all three. That
> is not what I was asked. If I'd been in a hurry I'd have put 28 in the email.

**Unticks "degree >= 5" and "group = 8".**

> I just want the component step, so I untick the other two. (Clicks the two checkboxes.) Top-left
> now says 76 of 77 nodes, 1 of 3 steps. Statistics says components 1, largest component 76. Good,
> those agree now.

> Edges: 253 of 254. Wait. It only threw out one node -- the one floating on its own on the left,
> the dot with no lines. How did I lose an edge by removing a node with no edges? In NetworkX I'd
> get 254 on the giant component of Les Mis. Either something's off or there's a self-loop it's
> quietly dropping. That's exactly the kind of thing I can't explain to my manager if the SQL count
> says 254.

> Also -- I'd left two steps in the list, unticked. Are they going to come back on? I'd rather
> just delete them but it's fine, they're greyed out.

**Looks at the table under the graph.**

> Table's sorted by degree. Valjean 36, then Gavroche, Marius, Javert. So the "who matters" answer
> this screen gives me is Valjean, by degree. There are two degree columns -- "degree" and "degree
> on: full graph" -- and they're identical now, which makes sense since I only lost an isolate.
> Nice that it tells me which graph the number came from, actually. Gephi never does that.

> But "who matters most" -- my director's next question is "according to what?" Degree's the
> cheap answer. For this kind of thing I'd normally run betweenness. There's no betweenness column
> here.

**Detour: the app at rest.**

> Going back to the plain screen for a second. Here the Statistics say "Connected components 2
> (1 isolate)". So I could have just read it: 77 minus the one isolate is 76. Didn't need the filter
> at all for the size. OK, good to know, but I only worked that out because I'd already done it the
> long way.

> Also the density here says 0.0868 and on the filter screen with no steps it said 0.0865, and
> average degree 6.57 there. 254 edges over 77 nodes is 6.6. Same self-loop thing, I bet. Small, but
> two numbers for the same graph on two screens is not great.

**Results panel (the flask icon, "Results").**

> Results. Different dataset in this one -- patent citations, then human proteins -- so I'm
> imagining it on mine. There's a catalog: Betweenness, and next to it "hours" on the big one, but
> nothing next to it on the 300-node one. OK, I like that it warns me before I click. That's the
> lunch-break thing.

> In the finished one, the box says "on: full graph, 300 nodes, 3 components". So it tells me it
> ran on the full graph. Good -- but I want it on my filtered piece. There's a "Scope" dropdown that
> says "Full graph". I'd click that and hope there's "Filtered graph" or "Largest component" in it.
> I can't tell from here. (Tries the dropdown; nothing opens in the prototype.)

> Up top of the left panel it says "Full graph" with a filter icon, same as the chip I used before.
> So is my filter still on when I go to Results, or does Results ignore it? If I set the filter and
> then Betweenness runs on the full graph anyway, that's a wrong number in a slide. I'd want the
> filter and the Scope box to obviously be the same thing.

> "Top nodes" at the bottom of the box, cut off -- 1. MAPK1, 0.138. So I'd get a ranked list.
> That's what I actually want to hand over. Can I get that list as a CSV? There's an Export
> button up top but I don't know what's in it.

**Answer given to the moderator.**

> The biggest connected piece is 76 of the 77 characters -- everyone except one loner. Edges it
> says 253, though I think it should be 254 and I'd check that in Python. Most connected is
> Valjean, degree 36. Who "matters most" by betweenness, I couldn't get on this piece from what I
> saw; I'd guess Valjean again but I wouldn't put that in writing until I ran it.

## After the task

**Single Ease Question: 4 of 7.**

> The size was easy once I understood the steps, but the first number my eye landed on was 28,
> and that was wrong. The "who matters" half I only got by degree. Betweenness on just the piece I
> filtered -- I couldn't see how to make sure of that.

**Would he use it instead of his current tool?**

> Not instead of Python yet. Maybe instead of the Gephi half. The filter list is better than
> Gephi's filter panel -- I can see what each step took out, and the table says which graph the
> degree came from, which I've never had. But I'd need the edge count to match NetworkX, and I'd
> need to know for certain that Betweenness runs on what I filtered, not the whole thing. If both
> of those are true I'd try it on next month's supplier deck.

## Problems observed

1. **The Statistics "largest component" read as the answer when other steps were on (severity 3).**
   With three steps ticked, Statistics said "largest component 28" while the step row said
   "Largest component ... 76". Alex almost reported 28. The Statistics block does say "Filtered
   graph: 28 of 77 nodes" above it, but he read the row named "largest component", not the scope
   line.
2. **Removing one isolated node dropped an edge (severity 3).** With only the component step on,
   edges read 253 of 254. The page leaves out a self-loop when it counts, but shows 254 as the
   total. Density and average degree on the no-steps view also disagree with the at-rest screen
   (0.0865 versus 0.0868). Alex checks counts against NetworkX and loses trust on a mismatch.
3. **No way to be sure an algorithm runs on the filtered piece (severity 3).** The results panel's
   Scope reads "Full graph" and its options are not visible; the filter chip at the top of the
   left panel also reads "Full graph". Alex could not tell whether a filter he set carries into a
   Betweenness run, or how to point the run at the largest component.
4. **"Who matters" only answered by degree on the filter screen (severity 2).** The table ranks by
   degree; betweenness lives on a different screen. Alex expected to answer the whole question in
   one place.
5. **The size was already on the at-rest screen, but not where he looked first (severity 1).**
   "Connected components 2 (1 isolate)" gives 76 by subtraction; Alex only noticed after doing the
   filter. It says the number of pieces, not the size of the biggest.
6. **Unticked steps stay in the list (severity 1).** He wondered whether they would switch back on
   and would have preferred to delete them; not a blocker.

## What went well

- Each step shows how many nodes it leaves, so he could work out the 76/41/28 chain himself.
- Unticking a step updated the chip, Statistics and table together; the numbers then agreed.
- The table names the graph a number came from ("degree on: full graph"), which Gephi never does.
- The results panel states the scope, node count and component count of a run, and warns "hours"
  before a slow algorithm.
