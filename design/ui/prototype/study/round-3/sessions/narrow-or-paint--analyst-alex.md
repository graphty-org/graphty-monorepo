# Session: narrow to the biggest piece, then find who matters -- Analyst Alex

**Participant:** Analyst Alex, operations data analyst, NetworkX for the numbers and Gephi for the
picture. Mild red-green colour deficiency.

**Task as the moderator gave it:** "Look only at the biggest connected piece, and tell me its size
and who matters most in it."

**Screens used:** the filter chip mock (Les Miserables co-appearances, 77 characters), the frame at
rest, and the Results panel (its "Results after a filter" state for Les Miserables; the other states
use protein and patent data and were only glanced at).

**Outcome:** answered correctly, with one wobble. Size: 77 characters, 254 links -- the whole graph
is one piece. Who matters most: Valjean, by degree (36) and by betweenness (top of the list).

---

## Think-aloud transcript

**00:00 -- the filter chip screen, "No steps" state.**

> OK. Les Miserables, the sample. Fine, I know this one, it's in every NetworkX tutorial. Before I do
> anything -- left rail says "Assistant: Off. Nothing is sent." Good, that's the line I look for.

> "Biggest connected piece." In Gephi that's Filters, Topology, Giant Component, drag it into the
> query box. Here... there's a thing under the title that says "Full graph" with a funnel. That's a
> filter. I'll click it.

The Filter steps popover is already open in this state: "No filter steps. Every number reads the
full graph." and "Add step".

> "Every number reads the full graph." OK, that's actually a useful sentence. Add step.

**00:40 -- the Add step menu.** Reading the page code for what the click opens: a menu with "Filter
to: Largest component, k-core..., Rule..." and "Filter out: Rule...".

> "Filter to -- Largest component." There it is, first item. That's two clicks, I'll take that.
> Gephi makes you go digging in a tree for it.

**01:00 -- before clicking, the Statistics panel on the right catches his eye.**

> Hang on. Statistics: nodes 77, edges 254, components 1, largest component 77. So... it's all one
> piece? The biggest piece is the whole thing?

He looks back at the canvas for a while.

> I'd have sworn those black dots at the top and the grey ones on the right were hanging off on
> their own. They're off by themselves on the picture. But it says one component, and there's a
> line going into each of them if I squint. OK. I believe the number over the picture.

> I'm still going to add the step, because the moderator said "only the biggest piece" and next
> month my supplier file won't be one piece.

**01:30 -- clicks Largest component.** From the page code: the step is added with no editor, and it
reads "Filter to Largest component -- took out 0 &middot; 77 left". The note that explains what a
component step kept only appears when the graph it reads has more than one piece, so here there is
no note. The chip changes from "Full graph" to "77 of 77 nodes &middot; 1 step". The Statistics
panel's first line becomes "Filtered graph: 77 of 77 nodes", every number gets a small funnel, and
the table grows a second degree column "degree on: full graph" with the same numbers as the first.

> "Took out 0, 77 left." Did it do anything? ... Right, it can't, it's already one piece. But now
> everything has a little funnel on it and the chip says "77 of 77". It looks like I filtered
> something. If I screenshot this for my manager, the first question is "what did you filter out?"
> and the answer is "nothing". I'd rather it said "already one piece, nothing to take out" right on
> the step.

> And the table now has two degree columns with the exact same numbers. Why are there two?

He hovers the second header (tooltip: "degree, on: full graph. Differs from the chip's scope, so it
is named.").

> "Differs from the chip's scope." It doesn't differ though. Same numbers. Fine, whatever -- I get
> why it's there when the filter actually removes stuff. I saw that on the three-steps version:
> Valjean 17 filtered versus 36 on the full graph. That's genuinely useful, Gephi never tells you
> that. It's just noise when the filter's a no-op.

**02:30 -- first answer, from the table.**

> Size: 77 characters, 254 edges. Table's sorted by degree already: Valjean 36, Gavroche 22,
> Marius 19, Javert 17. So by degree it's Valjean, by a mile.

> But "who matters most" -- my director would ask "most connected, or most in the middle of
> things?" Degree is just who's got the most co-appearances. I want betweenness. That's what I'd run
> in NetworkX.

**03:00 -- looking for betweenness.** The canvas toolbar has four icons: a pointer, something like
sliders, a sheet of paper and a lightning bolt. The left rail has Graph, Assistant, Results, Notes.

> Lightning bolt is "run something"? Maybe. Results has a little flask -- that's where algorithm
> results live, I'd guess. I'll try Results.

(Moderator moves him to the Results panel mock, "Results after a filter", where the filter is a
"degree >= 2" step, not his component step. He accepts the difference.)

**03:30 -- the Results panel.**

> Search box: "Find a result or algorithm". I'd type "betw" here. And there it is in the Catalog
> under Centrality anyway. Nothing next to it saying "hours" on this one -- on that patent graph it
> said "hours" next to Betweenness, which, honestly, I'd appreciate. Here it's a small graph so no
> warning. Makes sense.

He reads the open Betweenness card.

> "on: filtered graph, 60 nodes, 1 component." OK, that's exactly the thing I'd have been paranoid
> about -- did it run on the filtered bit or the whole thing. And the Scope dropdown says
> "Filtered graph, 60 of 77". Good. That's the first tool that's told me that without me asking.

> Top nodes: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073. And
> "No near-ties in the top 5". Fine. Valjean again, and it's not close.

He opens "Details", the run record.

> "Brandes betweenness, exact: every node is a source. Normalization: divided by (n-1)(n-2)/2."
> That's NetworkX's normalized=True. So I can check this against my notebook. If it matches, I'm
> sold on this part. That's the thing that makes me trust it -- not the picture.

**04:30 -- the parts that snag.**

> "zero: 32 nodes, all 29=" -- all 29 equals what? I don't know what that means. Tied at 29th? Just
> say it.

> "Appearance -- color not shown." So it ran but the picture didn't change? I ran betweenness and
> the graph is still coloured by group. I'd expect the graph to colour by the thing I just ran.
> I can open Appearance, I suppose, but that's one more click I'll be doing every week.

> There's an "Exact" with a little (i) next to it. I'd hover it. Probably fine.

> Legend's in the corner -- Group color, 2, 8, 4, 3 with counts. Orange, light blue, green,
> dark orange. I can tell those apart, actually. Not muddy.

**05:00 -- his answer to the moderator.**

> The biggest connected piece is the whole thing -- 77 characters, 254 links, it's already one
> piece, so filtering to it doesn't change anything. The most important character is Valjean:
> highest degree, 36, and highest betweenness, about 0.42 normalized, well clear of Gavroche in
> second. I'd say "Valjean is the one everybody's connected through", and I'd attach the table.

---

## Single Ease Question

**5 out of 7.**

> The actual clicks were easy. Filter chip, Add step, Largest component -- two clicks, great. What
> took longest was working out whether the filter did anything, because the screen went into
> "filtered" mode -- funnels everywhere, "77 of 77", a second column -- for a filter that took out
> nothing. And then I had to go to a different panel for betweenness and it didn't paint the graph.

## Would he use this instead of his current tool?

> For this bit -- "keep the giant component, rank the nodes, tell me which graph you ran it on" --
> yes, probably, over Gephi. Gephi's giant component filter works, but it never tells me the
> filtered degree versus the full degree, and it never tells me what the algorithm ran on. This
> does, and the run record gives me the normalization so I can match it against NetworkX. That's
> what I need to defend a number.

> What would stop me: it has to say "nothing removed, already one piece" instead of putting on a
> filtered costume, and running an algorithm has to change the picture without me hunting for it.
> And I'd need to see it load my CSVs first -- this is still the Les Mis sample.

---

## Problems observed

1. **A component filter that removes nothing still puts the whole screen into "filtered" mode.**
   Chip reads "77 of 77 nodes &middot; 1 step", every statistic gets a funnel, the table adds a
   "degree on: full graph" column identical to the first. The step row says only "took out 0
   &middot; 77 left" with no reason. Alex doubted the filter had worked. Severity 2.
2. **The duplicate degree column's tooltip says it "differs from the chip's scope" when it does
   not.** Severity 1.
3. **Nothing on the Statistics panel lets him act on "largest component 77".** He expected that
   row to be the way in to the component filter; he found the filter through the chip instead.
   Severity 1.
4. **Running betweenness does not repaint the graph** ("Appearance -- color not shown"): the
   result exists, the picture keeps group colours. Severity 2.
5. **"zero: 32 nodes, all 29=" is unreadable** to him; he guessed "tied at rank 29" but was not
   sure. Severity 2.
6. **The canvas toolbar icons (sliders, sheet, lightning bolt) do not say what they do**; he went
   to Results by guessing from the flask icon. Severity 1.
7. **Force layout draws connected nodes far out on their own**, and he briefly read the black and
   grey characters as separate pieces until the Statistics number contradicted the picture.
   The number won, but only because he checked. Severity 1.

## Delights

- "Assistant: Off. Nothing is sent." visible before anything else.
- "Filter to -- Largest component" is the first item in Add step; two clicks from the chip.
- The Statistics panel answers "how many pieces, how big is the biggest" without running anything.
- Filtered degree next to full-graph degree in the table (when a filter actually removes nodes).
- The Betweenness card says "on: filtered graph, 60 nodes, 1 component", and the Scope field
  names the filter.
- The run record names the algorithm and the normalization, so he can match NetworkX.
