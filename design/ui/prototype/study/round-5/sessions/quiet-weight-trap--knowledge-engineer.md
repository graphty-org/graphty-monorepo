# Session: rank the Les Miserables characters by a weighted measure -- knowledge engineer

Participant: Dr. Min-ji Kim, knowledge graph engineer (OWL, SHACL, SPARQL; NetworkX in notebooks
for anything numeric). Mild red-green colour weakness.

Task as given by the moderator: "The Les Miserables edges carry a number. Rank the characters,
then tell me whether you trust the ranking and why."

Screens used: the weight-role-trap storyboard (the load step, the result, the result's editor,
the Edges editor, Out of date, the re-run), the Run a measure catalog, the Results list, the graph
inspector and the recipe binding step. The catalog, Results list and inspector renders show a
different dataset (human protein interactions); I read them as "the same menus, other data".

## Think-aloud

### 1. The load step (Open miserables.json)

"OK. JSON, nodes and links. 77 nodes, 254 edges, undirected, 0 isolated. That is Knuth's
co-appearance graph as NetworkX and D3 ship it: 77 and 254 is right. Known-answer check one:
passed. Good.

'Edge attribute value: whole numbers, 1 to 31; most edges 1 to 3.' The maximum is 31, which is
Valjean and Cosette if I remember the file. A histogram of the column before I commit to
anything -- that is exactly what I want from an import preview. I would call it an edge property,
not an 'attribute', but for a property graph I will let that go.

'For value, a higher number means...' -- finally someone asks the question instead of guessing.
The options: longer or costlier step, which is distance; closer or stronger link, similarity,
'such as a count of shared scenes'; capacity; don't use it.

Wait. Why is 'a longer or costlier step' already selected? It is highlighted with the radio
filled. I did not click anything. If that is a default, it is the wrong default for this file and
the tool is telling me what my data is. If it is not a default, the screen should not look like
one. [Moderator did not answer.]

The value is a count of chapters two characters share. More shared chapters means a closer tie.
That is similarity, and the second row even uses my example. I would click 'a closer or stronger
link'. But the storyboard loads it as a distance, so I will follow it and see whether the tool
catches me."

### 2. The ranking appears (betweenness, weight read as distance)

"Now I have a graph and a table sorted by betweenness. I did not ask for betweenness. Who ran
it? Where did 'Betweenness' in Results come from? I assume someone clicked it in the catalog.

Valjean 0.454, Gavroche 0.285, Javert 0.193, Myriel 0.177, Thenardier 0.129, Fantine, Mabeuf.
Honestly, that looks plausible. Valjean first is a given in any measure. If I did not know
better I would paste that into a slide.

But the inspector says, in Statistics, 'Weight: value, used as distance', and the Results row
says 'Weight: value, used as distance' again. Good: the reading is printed on the result itself,
not buried. That is the line that saves me. A count of shared scenes used as a distance means the
two characters who are together in 31 chapters are the FARTHEST apart. Shortest paths route
around the strongest relationships. This ranking is wrong, and nothing on screen looks wrong.
The only warning is that one grey line. I read it because I read everything. A student would
not."

### 3. Checking what the result used (the Betweenness editor)

"I open the result. Scope: Full graph, 77. 'Weight -- from Edges: value, used as distance.
Read as a distance: a bigger value is a longer step.' Plain and correct. 'Normalized' is on.
Normalized how -- by (n-1)(n-2)/2 for undirected? It does not say, and NetworkX and igraph
disagree on defaults. Top nodes, Details.

The weight is shown as a pill with a link icon, and on hover there is 'Detach: read value
another way for this run only'. I understand that: the role belongs to the column, the run
borrows it, and Detach is a per-run override. That is the right model. The property has one
meaning in the data; a run may deliberately differ. I would use Detach to do an unweighted run
as my second known-answer check -- unweighted Valjean should be about 0.57 normalized, which I
know from the NetworkX gallery. If I cannot get the unweighted number to match, I stop."

### 4. Fixing it where it lives (the Edges editor)

"Clicking the pill opens 'Edges' next to Statistics: Direction, Weight = value, 'A higher value
means' = I set 'a closer or stronger link'. Statistics now says 'value, used as similarity'.
Betweenness immediately says 'Out of date' with a Re-run button, and the table header says
'Out of date' too.

Good. It did not quietly recompute, and it did not quietly keep the old numbers as if they were
current. I can see which results depend on the property I just changed.

Then 'How it is converted', collapsed. This is the most important line on the screen for a path
measure and it is hidden. Betweenness needs a length. Similarity to length is a choice: 1/value,
max minus value, negative log. Each gives a different ranking. I click it -- and the mock shows
me nothing. So I do not know which conversion the next run will use."

### 5. Out of date, then Re-run

"Old numbers are still there, marked Out of date in two places. That is correct behaviour. My
worry is export: if I copy that table now, does the 'Out of date' travel with it, or do I get a
clean-looking CSV of stale numbers? I cannot tell from here.

Re-run. The new ranking: Valjean 0.795, Marius 0.499, Myriel 0.224, Fantine 0.193, Courfeyrac
0.177, Thenardier 0.172, Gavroche 0.102. Marius second makes sense -- he is the bridge between the
Valjean-Cosette strand and the students at the barricade. Javert has dropped out of the top
seven entirely. The row now says 'Weight: value, used as similarity'.

The 'degree' column: Valjean 36. That is the unweighted count of neighbours. Fine, but label it.
If I wanted 'who is most tied to the others' I would rank by weighted degree -- the sum of
shared scenes -- not betweenness. The load step says similarity is 'read by communities,
PageRank, weighted degree', but weighted degree is not in the catalog. Centrality lists
Betweenness, Closeness (WF-corrected -- thank you for naming the variant), Eigenvector, Harmonic,
HITS, Katz, PageRank. No degree, no weighted degree. So the simplest honest ranking for this data
is the one I cannot ask for."

### 6. Colour

"The legend: group 2 orange and group 3 (Fantine's) a red-orange. For me those two are close; I
tell them apart by lightness only. The green for group 4 is fine against the blues. It is not
blocking, because the table carries the group number next to the swatch."

## Answer to the task

Ranking by betweenness, with value read as similarity (shared scenes = closer):
1. Valjean, 2. Marius, 3. Myriel, 4. Fantine, 5. Courfeyrac, 6. Thenardier, 7. Gavroche.

Do I trust it? Conditionally. I trust that it used the reading I set, because the result says so
in words, the inspector says so, and changing the role put the old result Out of date instead of
silently recomputing or silently keeping it. I trust the counts (77, 254, 1 component, 0
isolated, values 1 to 31), which match what I know of the file.

I do not yet trust the number itself, for three reasons:
- The conversion from similarity to path length is not stated on the result. The row says
  "used as similarity"; it should say "length = 1 / value" (or whatever it is). Two people with
  the same file and different conversions will get different rankings and both screens will look
  identical.
- "Normalized" does not say normalized by what.
- The load step appeared to pre-select "a longer or costlier step". If a real user accepts that,
  they get the first ranking -- Gavroche second, Javert third -- which is believable and wrong,
  and the only warning is one grey line.

I would also not have picked betweenness to "rank the characters" in a co-appearance network.
Weighted degree is the direct answer and it is not offered as a measure.

## Single Ease Question

5 of 7. The model is right -- the weight's meaning lives on the property, runs borrow it, a run
can detach, results go out of date. It took me reading every grey line to get there, and the
conversion that decides the numbers was hidden and empty.

## Would I use this instead of my current tool?

No, not instead. For a ranking I would still run NetworkX in a notebook, where the weight
function is one line I wrote and can show a reviewer. I would use this beside it: it is the first
viewer I have seen that makes a result carry the reading it used and marks it stale when the data
changes, and that is what I would put in front of a stakeholder. If the result showed the
conversion and the normalization, and I could export the numbers with their reading attached,
I would stop re-running the notebook just to check the picture.

## Problems observed

- Load step: the distance option looks pre-selected before I choose anything; on this file it is
  the wrong reading, and accepting it gives a plausible, wrong ranking. (severity 3)
- Weight editor and result: "How it is converted" is collapsed and showed nothing; the result row
  names the role but not the conversion (1/value or other), which decides a path measure's
  numbers. (severity 3)
- Catalog: no degree or weighted degree measure, though the load step says similarity is read by
  weighted degree. (severity 2)
- Result editor: "Normalized" does not say by what. (severity 2)
- Result list: a Betweenness result appeared that I did not run; nothing says who or what ran it.
  (severity 2)
- Out of date: unclear whether a copied or exported table carries the Out of date state.
  (severity 2)
- Table: "degree" does not say weighted or unweighted. (severity 1)
- Legend: group 2 orange and group 3 red-orange are close for a red-green colour-weak reader;
  the number beside the swatch saves it. (severity 1)
- Load step wording: "Edge attribute" -- I would say edge property. (severity 1)

## What worked for me

- The import preview gave node, edge, isolated and value-range counts that match the known file,
  and a histogram of the column, before anything was committed.
- The load step asks what a higher value means, in plain words, with the example "a count of
  shared scenes".
- Every result names the weight reading it used, on the row itself.
- The role is set on the property once; a run can detach deliberately and says it is for this run
  only.
- Changing the role marked dependent results Out of date in the row and the table header and did
  not rerun anything by itself.
- Closeness names its variant (Wasserman-Faust corrected).
