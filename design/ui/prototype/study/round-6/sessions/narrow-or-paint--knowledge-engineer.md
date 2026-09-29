# Session: narrow, hide or paint -- Dr. Min-ji Kim, knowledge graph engineer

Task as given: "Look only at the characters with 5 or more co-appearance partners. How many are
there, and who matters most among them?"

Dataset: Les Miserables co-appearances (77 characters, 254 pairs). Screens seen, in order: the
frame at rest, the filter chip (opened from no steps, and in its three-step state), the Results
panel after a filter. Renders of the steps she took: `tmp/narrow-or-paint-ke/` (a-none, b-addmenu,
c-editor, d-edited, f-three-only-deg5).

## Think-aloud

**Frame at rest.** "Right. Les Miserables, the one every graph tool demos with. 77 nodes, 254
edges, and -- good -- it says 254 'linked pairs' next to 254 'edges (rows)', so there are no
parallel edges. That matters: 'co-appearance partners' is the number of distinct neighbours, and
if two rows could join the same pair then degree would overcount partners. Here they are the same
number, so degree is partners. I would not have trusted it without that line."

"Now, 'look only at'. In SPARQL this is a HAVING on a COUNT. Here I need to cut the graph. There
is a chip under the file name that says 'Full graph' with a funnel. That is the only thing on the
screen that looks like it narrows anything. The canvas toolbar has a pointer, some lasso thing,
Quick actions -- I am not going to lasso 41 nodes by hand, and I do not want to paint them, I want
the others gone from the numbers. Clicking the chip."

**Filter chip, from no steps.** "'No filter steps. Every number reads the full graph.' Fine, that
is a clear statement of scope, I like that. Add step. The menu has two headings, 'Filter to' and
'Filter out', with 'Largest component', 'k-core...' and 'Rule...' under the first. I nearly picked
k-core, because 5-core is what a graph person would reach for, but that is the wrong question: a
5-core keeps nodes with 5 neighbours among the kept, recursively. The task says 5 partners, full
stop. 'Rule...' under 'Filter to'."

"The editor opens with 'degree >= 1' already filled and 'kept all 77'. I change the 1 to 5.
'Step 1: Filter to degree >= 5. Scope: Full graph: 77 characters. Result: took out 36, 41 left.'
The chip now reads '41 of 77 characters, 1 step'. Statistics on the right says 'Characters 41 of
77, in the filtered graph'. So: 41."

"I want to be sure 'degree' here means degree in the full graph and not something else, because
that Scope line is the whole question. It says 'Scope: Full graph: 77 characters' on step 1. Good.
And the table underneath now has two columns, 'Degree (filtered)' and 'Degree (full graph)'.
Valjean 22 and 36. That is exactly the distinction I would have had to explain to a colleague, and
the tool is showing both instead of silently swapping one for the other. That is the first thing
in a graph viewer in a while that did not misrepresent the graph to me."

**The three-step state.** "Let me look at the version that was already set up with three steps,
because that is what I would inherit from a colleague's project. 'Filter to degree >= 2, took out
17, 60 left. Filter to degree >= 5, took out 20, 40 left -- keeps only nodes with at least 5
neighbors among the 60 it reads.' Forty. Not forty-one. So the steps are applied in order and
degree is recomputed on whatever is left. If I had opened this project and just switched off the
group 8 step, I would have reported 40 and been wrong by one, and nobody would ever have caught
it."

"What saved me is that one grey line, 'among the 60 it reads'. I read it because I read
everything. A person skimming would not. When I switch off step 1 and step 3, step 2 says 'took
out 36, 41 left', which agrees with what I built from scratch. So the tool is consistent; it is
the chaining that is dangerous. I would want the step to say its own scope as loudly as the
editor did -- 'reads 60 of 77' in the row, not only in the grey sentence. In the row, 'took out 20
. 40 left' reads like a plain degree cut of the whole graph."

"Also: on the filtered canvas Myriel sits out on the right with one edge. Myriel has 10 partners
in the book. He is in because he has 10; he looks like a leaf because most of his partners are
bishops and servants who did not make the cut. That is the induced subgraph, and it is correct,
but the picture will mislead any stakeholder I show it to. The table's two degree columns explain
it; the canvas does not."

**Who matters most.** "'Matters most' is not a defined measure, so I pick one and say which. The
cheapest defensible answer is already here: sorted by degree, Valjean is first either way, 36 in
the full graph, 22 among the 41. If someone means brokerage, it is betweenness."

"Results in the rail. There is a Betweenness run: 'Betweenness, on 60 of 77 nodes, Sep 28 11:02'.
Top nodes: Valjean 0.419, Gavroche 0.172, Marius 0.164, Fantine 0.154, Javert 0.073. The run record
is honest -- 'Normalization: divided by (n-1)(n-2)/2 = 1,711 node pairs; n = 60, the filtered
graph' and 'Scope: Filtered graph, 60 of 77: after Filter to degree >= 2'. I respect that. That is
a provenance record, and I can copy it."

"But it is on 60, not my 41. It is somebody else's filter. The button says 'Re-run (keeps Run 1)'
and it is greyed out, and nothing tells me whether a re-run would pick up my 41 or re-use the 60
it was made on. Options says 'Scope: Filtered graph, 60 of 77' as a read-out, not a control I can
see how to change. I would guess I have to go to 'Run a measure...' and start a fresh betweenness,
and then check that its title says 'on 41 of 77'. I do not like guessing, but the title will tell
me afterwards whether I guessed right, so it is a recoverable guess."

"And there is a question the tool does not ask me: do I want betweenness computed on the 41, or
computed on all 77 and then only read for the 41? Those are different numbers. Valjean's brokerage
in the full book is not his brokerage among the main cast. I want to choose. For this task, with
Valjean at 0.419 and the next at 0.172 on the 60, he is first under any reasonable reading, so it
does not change my answer. On my own data it would."

"Terminology, while I am here: the chip says '41 of 77 characters', Statistics says 'Character
pairs', the Results panel says 'on 60 of 77 nodes' and 'Filtered: 60 of 77 nodes'. Pick one. If
the data calls them characters, call them characters everywhere, or call them nodes everywhere.
Two names for one thing is how people end up thinking they are two things."

"Hide and paint: I never needed them and I am glad nothing tried to make me. The chip is plainly
the thing that changes the numbers, it has the funnel, and every number after it is marked with
the funnel. If someone had hidden the other 36 on the canvas instead, the chip would still say
'Full graph', and that is the warning. I would have trusted that."

**Answer.** "41 characters have 5 or more co-appearance partners. Among them, Valjean matters
most: highest degree (36 in the full graph, 22 among the 41), and highest betweenness on the
60-character graph I was handed (0.419, more than twice the next). I have not seen betweenness on
the 41 themselves, because I could not tell how to re-run it on that scope."

## Single Ease Question

**5 of 7.** Counting was easy -- the chip, a rule, and Statistics said 41 of 77 with its scope
spelled out, and the two degree columns are the best thing I saw. It loses points on the second
half: the only ranking on offer was on a different filter, the re-run was greyed with no word on
which scope it would use, and the chained-step state quietly gives 40 instead of 41 if you inherit
it and switch one step off.

## Would I use this instead of my current tool?

No, not instead. This task is one line of SPARQL for me: GROUP BY the character, HAVING COUNT of
distinct partners >= 5. That is faster than any interface and I can put it in version control. And
my graph is RDF; nothing here tells me it can load Turtle or tell a class from an instance, which
is my first question for any viewer.

Alongside, maybe. The filter chip that says what every number is counted over, the two degree
columns, and the run record with its normalization and its n are things my SPARQL notebook does
not give a stakeholder. If it loaded a CONSTRUCT result and let me choose where a measure is
computed, I would use it for the picture and keep SPARQL for the answer.
