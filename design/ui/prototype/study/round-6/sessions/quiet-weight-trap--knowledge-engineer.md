# Session: rank the Les Miserables characters when the edges carry a number -- knowledge engineer (Min-ji)

Task as given: "The Les Miserables edges carry a number. Rank the characters, then tell me whether
you trust the ranking and why."

Screens seen, in order (study view, design notes hidden):

- shots/tasks/quiet-weight-trap/01-weight-role-trap.png -- the load step
- shots/r6-minji-qwt-a2.png -- the Betweenness run form, unanswered
- shots/r6-minji-qwt-a3.png -- the "bigger value means" list open
- shots/r6-minji-qwt-a4.png -- a result read the other way (Distance = value)
- shots/r6-minji-qwt-a5.png -- the result editor with the answer changed, Out of date
- shots/r6-minji-qwt-a6.png -- the re-run (Distance = 1 / value), both runs listed
- shots/r6-minji-qwt-results-panel-html-finished.png -- what a result's detail page looks like
- shots/r6-minji-qwt-results-panel-html-compare-with.png -- the "Compare with" menu

## Think-aloud

**Load step.** "Open miserables.json. Read as JSON, nodes and links. 77 nodes, 254 edges,
undirected, zero isolated. That is the Knuth co-appearance graph; 77 and 254 are the numbers I
know. Good, the counts match before I commit anything. Then 'Edge attribute value, whole numbers,
1 to 31, most edges 1 to 3', with a histogram. That is a description of the data and nothing
else. I like that it does not guess a meaning here. Last round this step had a radio button that
looked already chosen; now it just says 'a measure that reads value asks, each time it runs, what
a bigger value means'. Fine. I would call it an edge property, not an attribute, but I will live."

"One thing I want to know already: where are the node properties? It says nothing about 'group'.
Later I see a group column in the table, so it came through, but the preview only told me about
the edge column. For my own data that is the part I read most carefully."

Clicks Load.

**Choosing a measure.** "Catalog: Betweenness, Closeness, Harmonic, PageRank, Eigenvector. 'Rank
the characters' is underspecified -- rank by what? With a co-appearance count the first thing I
would compute is strength, the weighted degree: total shared scenes per character. It is not in
the catalog. There is a 'degree' column in the table, 36 for Valjean, which is the unweighted
count of neighbours, and the header does not say unweighted. So for strength I would have to go
elsewhere. I will take betweenness, because that is where the weight actually changes the answer
and that is what you are testing me on anyway."

**Run form (a2).** "Scope Full graph 77. Weight: value. 'In this run, a bigger value means:
Choose...' and Run is greyed out, with a tooltip 'Choose what a bigger value means first'. Good.
It will not run on a silent default. That is the right place for the question, because the same
column is a strength for betweenness and could be a capacity for a flow measure. The meaning
belongs to the use, not the column."

"The right panel says 'Weight: value, shared scenes, 1 to 31'. Wait. Who said shared scenes? The
file says 'value'. The load step did not ask me for a unit and did not show one. If the tool made
that phrase up from the dataset name, that is the Gephi 'resource' node again: a label that is not
in my data. On this file it happens to be true. On my file it would be a guess dressed as a fact.
I want to know where it came from, or I want it gone."

**The answers (a3).** "Two answers. 'A longer or costlier step -- Distance = value'. 'A closer or
stronger link -- Distance = 1 / value, such as a count of shared scenes.' Each one says the
conversion. That is what I asked for last time: not a role word, the formula. A count of shared
scenes is a strength, so 1/value. I pick the second."

"But I notice the example text 'such as a count of shared scenes' is suspiciously well tailored to
this demo. Is that string written for this file? If it always says shared scenes, that is fine for
a demo. For my data I would want the example to be generic, or to say nothing."

"And 1/value is one convention. Opsahl's weighted betweenness has an exponent; Newman uses 1/w;
some people use max minus w. It does not offer anything else, which is acceptable for a default,
but I want to see that the choice is named in the result, and it is."

**Sensitivity check (a4 to a6).** "I do not trust one run of a weighted path measure. I want to
see how much the reading matters. So I run it both ways."

Reading the result read as length (a4): "Run 1, Distance = value: Valjean 0.454, Gavroche 0.285,
Javert 0.193, Myriel 0.177, Thenardier 0.129. Plausible. Nothing on the screen says it is wrong,
because it is not wrong arithmetic, it is the wrong reading. The run row says 'Distance = value'
right under the name, which is how I would catch it if someone else had run it."

Opening the result and changing the answer (a5): "Same form, my answer shown, I switch it. The row
goes Out of date immediately, the table column header says Out of date, the old numbers stay,
and the button says 'Re-run (keeps Run 1)'. That is honest. Nothing is thrown away and nothing
pretends to be current. I would want to know whether an exported table carries that Out of date
mark; if I copy the column into a spreadsheet the warning is gone."

Run 2 (a6): "Distance = 1 / value. Valjean 0.795, Marius 0.499, Myriel 0.224, Fantine 0.193,
Courfeyrac 0.177, Thenardier 0.172, Gavroche 0.102. Javert has fallen out of the top seven.
Marius from nowhere to second. That is a big swing, which is exactly why the reading has to be on
the result. Both runs are in the Runs list with their conversions, so the table's caption 'Sorted
by betweenness, Run 2' tells me which one I am reading."

"Can I see them side by side? The table shows one betweenness column. The detail page of a result
has 'Compare with...', and the menu lists 'Earlier runs of this measure'. So I would open Run 2,
Compare with Run 1, and hopefully get both columns and the rank change. I did not see what the
comparison itself looks like on these screens, so I cannot say it works."

**The number itself.** "0.795. Normalized, the switch says. Normalized by what? (n-1)(n-2)/2 for
undirected? Divided by the maximum? For betweenness that changes whether 0.795 means 'on 79.5
percent of shortest paths between other pairs' or 'relative to the top node'. Here Valjean has
0.795, not 1.0, so it is not max-normalized; probably the pair count. Probably. I would not write
'probably' in a governance report. The detail page shows 'Exact -- computed on every node, not
estimated. It does not say the ranking is meaningful', which I like very much, but it still does
not say the normalization."

"Ties: with integer counts turned into 1/value there will be many equal-length shortest paths.
Does it split credit among them, Brandes-style? I assume so. Nothing says."

**Colour.** "Group legend: 2 is orange, 3 is red-orange, 4 green, 8 light blue. Orange next to
red-orange is where my eyes fail; the number next to each swatch saves it, and in the table the
group number is printed. Groups are not what I am ranking anyway."

## Answer to the moderator

Ranking, Run 2 (betweenness, value read as a strength, distance = 1 / value, full graph,
normalized): Valjean, Marius, Myriel, Fantine, Courfeyrac, Thenardier, Gavroche, and so on.

Do I trust it? Conditionally. I trust that it is betweenness on the reading I chose, because the
run carries "Distance = 1 / value" on its row, the table says which run it shows, and the other
reading is still there, named, for comparison. That is more than most viewers give me. I do not
fully trust the numbers as numbers: I do not know what "Normalized" divides by, I do not know how
ties between equal shortest paths are split, and the only inversion offered is 1/value. And I do
not trust the "shared scenes" label on the weight until I know where the tool got it, because it
is not in my file. Also: the question was "rank the characters", and for co-appearance counts I
would have started from weighted degree, which the tool does not offer.

## Single Ease Question

5 out of 7. Getting to a correctly weighted ranking was easy and the tool would not let me run
without deciding. Establishing whether to trust it still needed my own knowledge of the
conventions, and two facts I need (normalization, where "shared scenes" came from) are not on
screen.

## Would I use this instead of my current tool?

No, not instead of NetworkX in a notebook, where the weight function and normalization are lines
I wrote and can show a reviewer. Beside it, yes, more than last time: the result now says the
conversion it used, it refuses to run on an unanswered question, and re-running keeps the old run
under its own label. That is the first viewer I have seen where I could hand a ranking to a
stakeholder and the reading travels with it. If the result said what it normalized by and the
weight label came from my data rather than from the tool, I would stop re-running the notebook to
check the picture.

## Problems observed

- Graph statistics: the weight is described as "value, shared scenes", but the file only says
  "value" and the load step never asked for a unit; the tool appears to have supplied a meaning
  that is not in the data. (severity 3)
- Result editor and detail: "Normalized" does not say by what, so 0.795 cannot be interpreted
  exactly. (severity 2)
- Catalog: no weighted degree (strength), the obvious first ranking for a co-appearance count;
  the table's "degree" does not say unweighted. (severity 2)
- Answer list: the example "such as a count of shared scenes" reads as written for this demo;
  unclear what it says on other data. (severity 1)
- Only one inversion (1 / value) is offered; acceptable as a default, but other conventions
  are not visible. (severity 1)
- Out of date: unclear whether an exported or copied column keeps the Out of date mark.
  (severity 2)
- Load preview: describes the edge column but not node columns such as group. (severity 1)
- Comparison: "Compare with..." exists, but I could not see what the side-by-side of two runs
  looks like, so I cannot say it answers "how much did the ranking move". (severity 1)
- Legend: group 2 orange and group 3 red-orange are close for a red-green colour-weak reader;
  the printed numbers save it. (severity 1)

## What worked for me

- The load preview counts (77, 254, undirected, 0 isolated) match the known file before commit.
- No meaning is guessed for the weight at load, and Run stays disabled until the run is told what
  a bigger value means.
- Each answer states its conversion as a formula, and the result row repeats it.
- Changing the answer marks the old result Out of date at once, keeps its numbers, and the
  re-run keeps Run 1 alongside, each labelled with its conversion.
- The detail page says the result is exact and that exactness does not make the ranking
  meaningful.
