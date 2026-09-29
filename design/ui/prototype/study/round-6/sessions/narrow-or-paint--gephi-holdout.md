# Session: characters with 5 or more partners -- Gephi holdout

**Participant:** Dr. Mara Lindqvist (fictional composite), associate professor, uses Gephi weekly
since 2012, teaches it. Plays at 1440x900.
**Task as given:** "Look only at the characters with 5 or more co-appearance partners. How many
are there, and who matters most among them?"
**Data:** Les Miserables co-appearances, 77 characters, 254 pairs.
**Screens seen, in order:** the frame at rest; the filter chip and its steps (driven by hand: no
steps, then Add step, then a degree rule); the Results panel after a filter; the flow page
"Narrow, hide or paint -- which one did you do?".

Renders: `shots/tasks/narrow-or-paint/01-frame-at-rest.png`, `02-filter-chip.png`,
`03-results-panel-filtered.png`, `shots/flows__narrow-hide-paint.png`. The hand-driven chip
states (no steps, the Add step menu, the rule editor at 1 and at 5) are in
`tmp/narrow-or-paint--gephi-holdout/`.

## Answer she gave

**41 characters** have 5 or more partners in the full graph (checked against the page's own
table: Valjean 36 down to Judge, Champmathieu, Brevet, Chenildieu and Cochepaille at 6; nobody
sits at exactly 5). **Valjean matters most** among them by every measure on screen. Correct.
She did not accept the betweenness ranking the screen offered below rank 1, because it was
computed on a different subset (60 characters, degree at least 2), not on her 41.

## Think-aloud

**1. The frame at rest.**
"Les Mis. Fine, I know this one by heart -- 77 and 254. Top right says 77 nodes, 254 edges. Good,
the counts are right, I'll keep going."
"Where are the filters? In Gephi it's a whole panel on the right, Topology, Degree Range. Here I
have Graph, Data, Results, Notes on the left rail. No Filters. Statistics on the right, Style
stack... that's Appearance, I suppose."
"There's a little thing under the file name with a funnel on it: 'Full graph', with a caret. That
looks like a view switcher. A funnel is a funnel, though. I'll try it."
"Before that -- the lazy way would be the Data Lab: open the table, sort by degree, count down to
5. The table bar at the bottom says 77 nodes, 254 edges. I could do that. But I'd be counting
rows by hand at 11 pixels, so no."
"Also 'Linked pairs 254' right under 'Edges 254 edges (rows)'. Why do I need both? Multi-edges,
I assume. And 'Overview: General, Change overview...' -- I don't know what that is and I won't
click it."

**2. The chip, empty.**
"OK, it opens. 'No filter steps. Every number reads the full graph.' That's the sentence I've
wanted in Gephi for ten years. Add step."
"Menu: Filter to -- Largest component, k-core, Rule. Filter out -- Rule. No 'Degree range' by
name. I'd want degree to be right there, it's the one everybody uses. k-core is close but it's
not the question; the question is partners in the whole book, not a core. Rule, then."

**3. The rule editor.**
"Step 1: Filter to degree >= 1. Oh, it defaulted to degree already. Fine. Scope: 'Full graph: 77
characters'. Result: 'kept all 77'. Good -- it tells me what the degree is counted on before I
touch anything."
"Change 1 to 5. 'took out 36, 41 left.' The chip now reads '41 of 77 characters, 1 step'. The
canvas dropped the fringe. Statistics on the right: 'Characters 41 of 77, in the filtered graph',
and every line says 'of the filtered graph'. There's a funnel on the Statistics header. This is
what Gephi should have done: the context panel says 'Nodes: 41 (53%)' and that's all you get."
"Wait -- 'Largest component 41, down from 77 when step 1 was edited.' Why only on that line? The
character count went down from 77 too. Odd place for it. Not important."
"Table: two degree columns, 'Degree (filtered)' and 'Degree (full graph)'. Valjean 22 and 36.
Yes. That's exactly the column confusion I get from students every year. Keep that."
"So: 41. Let me check it against memory... the Les Mis degree tail is long and nobody has exactly
5, so 41 with a cutoff of 5 and 6 is plausible. I'd check it in NetworkX before I wrote it in a
paper: `sum(1 for _, d in G.degree() if d >= 5)`. But I believe it."

**4. The prepared chip with three steps.**
"Someone else's filter here: degree >= 2, then degree >= 5, then filter out group 8. And under the
second step: 'keeps only nodes with at least 5 neighbors among the 60 it reads'. Ah. So it's 40
there, not 41, because degree is recounted after the first step. Gephi does the same thing in a
filter chain and never tells you. This tells you, in grey, in small type. I'd have liked that in
black. A student would read '5 or more partners' and write 40."

**5. Who matters most -- the Results panel.**
"Now the second half. 'Who matters most' -- my students always ask this and the honest answer is:
by what? Degree says Valjean. Betweenness is what reviewers ask for."
"Results panel: 'Betweenness, on 60 of 77 nodes, Sep 28 11:02'. Sixty. That's not my filter. That
was run on the degree >= 2 filter. The chip at the top says 'Filtered: 60 of 77 nodes, 1 step'.
So this screen is a different afternoon. I can't use its ranking for my 41."
"But credit where due: the run says which graph it was computed on, in its own name. Top nodes:
'Values on 60 of 77 nodes: the filtered graph'. The Run record: Brandes, exact, every node a
source, no seed, normalized by (n-1)(n-2)/2 = 1,711 pairs with n = 60. That is the NetworkX
normalization for undirected. I can check that number. That's the first web tool that showed me
its denominator."
"Valjean 0.419, Gavroche, Marius, Fantine, Javert. Valjean first again. The runner-up order I
don't trust for my question."
"'Every step in the top 5 is over the 1% tie line; the smallest, ranks 2 and 3, is 4.7%.' I read
that three times. I think it means the gaps are real, not ties. Say that."
"Now how do I run it on the 41? 'Re-run (keeps Run 1)' is grey. Options: Scope 'Filtered graph, 60
of 77' -- that's a label, not a menu. So the run follows the chip. Same as Gephi: whatever is on
screen is what the statistic ran on. At least it says so. I'd move the chip to 41 and re-run, and
I assume the button wakes up then. Can't confirm from here."
"And here's the real problem, and it's methodological, not the tool's fault: do I want
betweenness on the 41 as their own little graph, or betweenness on the whole book, then look at
the 41? They are different answers. Look at Myriel -- 10 partners in the full graph, but on the
41-character canvas he hangs off Valjean by one line, because all his partners were bit players
that the filter took out. On the full graph Myriel has high betweenness; on the 41 he has nearly
none. For 'who matters most among them' I want the full-graph number, restricted to the 41.
Nothing here offers 'compute on the full graph, show me these rows'. I'd have to turn the step
off, run, turn it back on, and hope the table keeps the full-graph column beside the filtered
rows. The table did head a result column 'exact, full graph' on another screen, so maybe."

**6. The flow page: narrow, hide or paint.**
"This is a design diagram about a fraud dataset. I'm skimming. The point is there are three ways
to make nodes 'go away' and only one changes the numbers. Filter changes numbers, Hide changes
the drawing, Paint changes the color."
"For my task it's Filter, obviously. 'Look only at' plus 'among them' means the numbers must
describe the 41 -- or rather, as I just said, the ranking should come from the whole graph and
only the list should shrink. That's closer to paint than to filter, actually: paint the 41, keep
the numbers whole. Huh. So the right move for the second half is the one the diagram calls 'only
changes the look'. The diagram doesn't have that exit -- 'numbers from the full graph, list from
the subset'."
"Hide on canvas: the chip still reads Full graph and the legend says '60 nodes hidden'. Fine, I
understand it. My students would hide, see the fringe vanish, run betweenness and write it up as
the core. The chip not moving is the only warning. The page even says so itself: 'the absence of
a change is a weak signal'. Agreed. In Gephi there is no hide, so they can't make that mistake;
they make the other one."
"Undo on the filter step: Mod+Z, or the checkbox. Undo on paint too. Undo on appearance -- if that
works it's the thing I'd tell my colleagues about."

## Single Ease Question

**4 of 7.** "The count was easy once I found the chip: one step, clear scope, 41. That half is a 6. 'Who
matters most' is where it fell down: the screen's ranking was run on someone else's subset, I
can't pick which graph a run reads without moving the filter, and the tool never asks the
question that decides the answer -- the whole book, or just these 41? I got Valjean because
Valjean wins everything. Ask me for number two and I'd have been wrong or stuck."

## Would she use this instead of Gephi?

"No. Not for this, not yet. I'd stay on Gephi -- my course, my coauthors, my .gephi files. But
three things here Gephi doesn't have and I'd come back for a second look: the chip that always
says what every number was computed on, the filtered and full-graph degree side by side, and a
run record that prints the normalization so I can check it against NetworkX. Make me able to
compute on the full graph and read the subset, and that's the thing I complain about every year
in Gephi, fixed."

## Problems she hit

1. **A run cannot be pointed at a different graph than the chip.** To get full-graph centrality
   for a filtered subset she has to switch the filter off, run, and switch it back, and she could
   not tell whether the table then keeps the full-graph column beside the filtered rows. For "who
   matters most among them" that is the answer a methodologist wants. Severity 3.
2. **The prepared Results screen answers a different subset (60, degree at least 2) than the
   task's (41, degree at least 5).** She rejected its ranks 2 to 5. On the real product she would
   re-run, but "Re-run (keeps Run 1)" was disabled and Scope is a label, so she could not confirm
   re-running follows a changed chip. Severity 3.
3. **No filter place on the rail.** She looked for a Filters panel (Gephi's home for it) and
   found the funnel chip under the file name by guessing; it reads like a view switcher. Severity 2.
4. **Stacked degree steps recount on the shrunk graph** (40 rather than 41 in the prepared three
   steps). The note under the step says so, but in small grey type a student will not read.
   Severity 2.
5. **Three vocabularies for the same counts:** "nodes / edges (rows) / linked pairs" at rest,
   "characters / character pairs" in the filtered Statistics, "nodes / edges" in the Results
   panel's overview. Severity 2.
6. **The Add step menu has no "Degree range".** Degree hides under "Rule...". It happened to
   default to degree, which saved her. Severity 1.
7. **"Every step in the top 5 is over the 1% tie line..."** was unreadable to her on first pass.
   Severity 1.
8. **The "down from 77 when step 1 was edited" note sits only under Largest component**, not under
   Characters, which also moved. Severity 1.

## What worked for her

- The empty chip's sentence: "No filter steps. Every number reads the full graph."
- The rule editor's Scope and Result lines, live, before and after changing the value.
- Every Statistics line saying "of the filtered graph (41 of 77 characters)".
- Degree (filtered) and Degree (full graph) as two named columns.
- The run's scope in its own name, and a run record with method, seed, and the normalization
  denominator she can check against NetworkX.

## Moderator-facing observation

The narrow, hide or paint flow frames the choice as "should these still count in the numbers?".
For a centrality question on a subset, the expert's answer is "both": numbers from the full
graph, the list from the subset. None of the flow's three exits is that. She reached it on her
own by reading Myriel's filtered degree against his full degree; a less expert reader would
Filter, run, and report the subgraph's ranking as the characters' importance.
