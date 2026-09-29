# Session: "who matters most, and how sure" -- the Gephi holdout

**Participant:** Dr. Mara Lindqvist (simulated; persona in `../../personas/gephi-holdout.md`).
**Task as read aloud by the moderator:** "Your manager wants the people who matter most in this
network, and how sure you are."
**Screens, in order:** the Results panel (its states, starting at the first), the inspector, the
resting frame. Viewed at 1440 x 900 as static renders; controls were "clicked" by checking what
the page does when that control is pressed.
**Outcome:** a ranked answer, but "how sure" was answered by hand and with caveats the screen
would not settle. Success with difficulty.

## Transcript (think-aloud)

**1. Results panel, first state (a PageRank run in progress on "Patent citations").**

> "My manager. Fine -- I don't have a manager, I have a head of department, but I know what this
> means: who's central, and can I defend it. First thing: what network is this. Patent
> citations, 124,318 nodes, 1.48 million edges, directed. OK, so these are patents, not people.
> Whatever. 'People' is the moderator's word."

> "Left side is a list -- 'In this project', then 'Catalog' with Centrality, Community, Path.
> That's my Statistics panel, sort of, except Gephi puts them in one column with a Run button
> each. Here each one has a time next to it -- 'hours', 'under a minute', 'over a day'. I like
> that, actually. Gephi just freezes and you find out."

> "PageRank is already running. The middle card says 'on: full graph, 124,318 nodes. Exact.
> Directed.' Good -- that's the first thing I would ask, whole graph or what's visible, and it
> answers it before I ask. 'Values shown: run 1, damping 0.85.' Damping is visible. Also good.
> Someone typed 0.5 into damping and it says 'Damping 0.5 has not run. Run queues it after this
> run.' Fine, I understand that."

> "And then at the bottom: '124,318 nodes not drawn: more than this browser draws at once
> (50,000).' So... I can't see it. There's my web-tool complaint in one line. At least it says
> so instead of melting. But a map I can't see isn't visual network analysis. I'll leave it."

**2. Moving on to the finished state (the moderator steps forward to "Finished").**

> "Now it's a different network? 'Human protein interactions', 300 nodes, 1,262 edges, 3
> components. Is that the same project? No. OK, it's a mock, I'll go along with it. Proteins
> matter too."

> "Betweenness. 'on: full graph, 300 nodes, 3 components. Exact. Unweighted, undirected.
> WebGPU.' Good. Three components -- betweenness on a disconnected graph is fine, it just
> counts pairs that have paths. Top nodes: MAPK1 0.1379, TP53 0.1139, YWHAZ 0.0695, CDK1
> 0.0687, AKT1 0.0642."

> "Question. Is 0.1379 normalized? Gephi gives me raw betweenness and a normalized column if I
> tick the box. NetworkX normalizes by default, by 2 over (n-1)(n-2) for undirected. This number
> is small, so probably normalized, but it doesn't say so. I click 'Details'."

*(The Details link does nothing in the prototype.)*

> "Nothing. OK. So I can't check this against NetworkX, because I don't know what the
> denominator is. That's the first thing I would put in a methods section."

> "The histogram. 'bar height: square root of the count.' Honest, I appreciate that someone
> told me. Middle 0.0038, highest 0.138, ten nodes at zero. Heavy tail -- two nodes are far out,
> then a pack. That's actually the start of 'how sure': the gap between 2 and 3 is big, 0.114 to
> 0.07. The gap between 3, 4, 5 is nothing. 0.0695, 0.0687, 0.0642 -- those three are a coin toss.
> I'd tell my head of department: two proteins clearly, then a cluster."

> "'295 more in the table.' Where's the table? I click it."

*(The line is not a link in the prototype.)*

> "Nothing again. I need to sort the whole column. If I can't see and sort the rows, I don't
> trust the picture. That's my Data Lab and I can't get to it from here."

> "The graph got painted orange by betweenness automatically. I didn't ask for that. It's a
> log scale -- the legend says so, 'the 10 proteins at 0 take the lightest colour'. The legend
> is there on the canvas. That's nice, I'll admit that. I spend my life drawing that legend in
> Inkscape. But I'd have wanted to look at the numbers before the colours changed."

**3. "How sure": trying a second measure.**

> "One centrality is not an answer. The way I answer 'how sure' is: run three or four
> measures and see if the same names come out on top. Degree, betweenness, PageRank,
> closeness. If they agree, I say so. If they don't, the answer is 'depends what you mean by
> important', which is the honest answer anyway."

> "So I click Closeness in the catalog. It says 'WF-corrected' next to it. What's WF?"

*(Moderator steps to the Closeness state; a popover explains "Wasserman-Faust corrected".)*

> "Wasserman-Faust. Right, the correction for disconnected graphs, scale by the share you can
> reach. It even says 'scores drop by under 1% and no rank changes'. That's the kind of sentence
> I want: it tells me the choice didn't move the ranking. More of that, please, everywhere.
> 'Run harmonic centrality' as the alternative -- correct, that's the other standard fix. Fine."

> "Closeness top five -- I have to step through to see it -- MAPK1, TP53, AKT1, UBC, MYC.
> Betweenness was MAPK1, TP53, YWHAZ, CDK1, AKT1. So MAPK1 and TP53 top both. AKT1 in both.
> YWHAZ and CDK1 drop out. I'm doing this comparison in my head, flipping between two cards.
> There's nowhere that puts betweenness, closeness and PageRank in columns next to each other.
> In Gephi that's the Data Lab: every stat is a column and I sort. Here each result is its own
> little card."

**4. Inspector (clicking TP53 on the canvas).**

> "Oh. This is better. TP53: degree 32, '#2 of 300'. Betweenness 0.1139, '#2 of 300'. PageRank
> 0.01137, '#2 of 300'. It gives me the rank under each value. That is exactly what I'd compute
> by hand. TP53 is second on everything. That's my 'sure' for TP53."

> "But it's one node at a time. I'd have to click MAPK1, YWHAZ, CDK1, AKT1 one by one and write
> the ranks down on paper. Twenty clicks for a table I want in one view. And '2 more' attributes
> are hidden -- I'd expand them."

> "PageRank on an undirected protein network -- fine, it's close to degree then, everyone knows
> that. It would be nice if it said 'undirected, damping 0.85' here too, not just the number. On
> this panel the number has no provenance."

**5. Resting frame (moderator shows the at-rest screen).**

> "This is Les Miserables. Of course it is. Everyone's first graph. Statistics on the right:
> nodes 77, edges 254, density 0.0868, 2 components, 1 isolate. Those I know, those are right.
> Degree distribution 'not yet measured'. There's no centrality here at all -- this is the
> overview. So for my task this screen is just 'where do I start'. It's calm, I'll give it that.
> Nothing is popping up telling me about AI."

> "Where's the layout? 'Force-directed'. Which one? Is that ForceAtlas2? Can I set gravity,
> LinLog? It doesn't say. Not today's question, but I noticed."

**6. Answer she would give her head of department.**

> "MAPK1 and TP53 are the two most central proteins by betweenness, closeness and, for TP53 at
> least, degree and PageRank -- they're top two on every measure I checked. After that it's a
> tie between YWHAZ, CDK1 and AKT1 on betweenness and the list changes with the measure. How
> sure: sure about the top two, not about places three to five. I'd want to confirm the numbers
> in NetworkX before anything is written down, because I don't know if betweenness here is
> normalized."

## Single Ease Question

**4 of 7.** "The pieces are there -- the scope line, the rank under each value, the
Wasserman-Faust note. But 'how sure' I had to assemble myself, flipping between cards and clicking
nodes one at a time, and the two links I needed, Details and the table, went nowhere."

## Would she use this instead of Gephi?

> "No. Not for this. For a class, maybe -- it tells students what a statistic ran on, which is
> the thing they always get wrong, and it draws the legend. But for a paper I need the table
> with every centrality as a column I can sort and export, and I need to know whether the
> betweenness is normalized. Until then I'd stay on Gephi, and run it again in NetworkX anyway.
> And it wouldn't draw the 124,000-node graph, which is the size I actually work at."

## Problems observed

| Where | What happened | Severity (1-4) |
|---|---|---|
| Results panel, finished result | "Details" does nothing; nothing says whether betweenness is normalized or raw, so the number cannot be checked against NetworkX or Gephi | 4 |
| Results panel, Top nodes | "295 more in the table" is not a way into a table; no sortable view of every node's score | 3 |
| Results panel, across results | No side-by-side of several centralities; agreement between measures (her definition of "how sure") had to be done in her head by flipping cards | 3 |
| Results panel, Top nodes | Near-ties (0.0695, 0.0687, 0.0642) shown as a clean rank with nothing flagging that places 3-5 are indistinguishable | 2 |
| Inspector | Ranks per metric are there but only for one node at a time; checking five nodes means five clicks and paper | 2 |
| Inspector | The metric values carry no provenance (which run, which options) -- only the Results card does | 2 |
| Results panel, first state | 124,318-node graph not drawn at all (browser limit 50,000); she works at this size | 3 |
| Results panel, finished result | Colours changed on the canvas as soon as the run finished, before she looked at the numbers | 2 |
| Resting frame | "Force-directed" does not name the algorithm or expose ForceAtlas2 parameters | 1 |
| Prototype itself | The network changes between states (patents, proteins, Les Miserables); confusing for "this network" | 1 |

## What pleased her

- The scope line on every run: "on: full graph, 300 nodes, 3 components. Exact. Unweighted,
  undirected." It answers her Gephi question before she asks it.
- The inspector's "#2 of 300" under every metric.
- The Wasserman-Faust note saying the correction changes no ranks.
- A legend drawn on the canvas, with the log scale and the zero-value rule stated.
- Run-time estimates on every catalog entry instead of a frozen window.
