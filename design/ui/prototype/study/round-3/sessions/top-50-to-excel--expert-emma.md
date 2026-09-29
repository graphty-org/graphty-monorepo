# Top 50 by betweenness, out to pandas -- Expert Emma

**Participant:** Expert Emma, network scientist; lives in Jupyter with networkx and igraph; uses
Gephi for final figures.
**Task, as the moderator gave it:** "Get the top 50 nodes by betweenness into Excel or pandas with
their original ids, and say how sure you are of the order."
**Screens:** the Results panel (the finished betweenness state on the 300-protein interaction
network, then the sampled state on the patent citations graph) and the table under the canvas
with its CSV export.
**Outcome:** done, in about four moves. One thing she could not get from the screen: how firm the
order is past rank 5. **Ease (1-7):** 6.

## Transcript (think-aloud)

**Results panel, Betweenness finished.**
"OK. Human protein interactions, 300 nodes, 1,262 edges, three components, undirected, no
weight. Those are the numbers I would check first, and they are right there on the right.
Good."

"Betweenness is selected in the list on the left, and this card is open. First line: 'on: full
graph, 300 nodes, 3 components. Exact. Unweighted, undirected. WebGPU.' Fine. That is the line
I would otherwise have to go and find. 'Exact' has a little popover open -- 'Computed on every
node, not estimated. It does not say the ranking is meaningful.' Ha. Thank you. I say that to
students every term."

"Highest value 0.138. So it is normalized. By what? networkx divides by (n-1)(n-2)/2 for
undirected; igraph gives you the raw count unless you ask. Nothing on this card says which. There
is a 'Details' link. I will come back to it."

"Top nodes: MAPK1 0.1379, TP53 0.1139, YWHAZ 0.0695, CDK1 0.0687, AKT1 0.0642. Then 'No
near-ties in the top 5: the closest, ranks 3 and 4, differ by 1.2%.' That is a nice sentence.
It is also only five rows. I asked for fifty."

"'295 more in the table.' That is where I would click anyway. I want the table."

**The table under the canvas, sorted by betweenness.**
"Right, it opened the Nodes tab, sorted by betweenness, highest first. 'Full graph: 300 nodes.
Sorted by betweenness, highest first; PageRank's columns beside it.' Columns: id, module (from the
file), degree, betweenness 'exact, full graph', betweenness rank 'of 300, ties share', then
PageRank and its rank. So the id column is MAPK1, TP53 -- are those the ids in my file or a
label it picked? For a protein file those might be the same thing. I cannot tell from here."

"Ranks: #1, #2, ... UBC is #6 by betweenness and #10 by PageRank. Fine. 'Ties share' -- so exact
ties get the same number. The ten zeros are all 291=, it said on the card. Good, that is the
convention I would use."

"Now fifty. Is there a 'top N' or 'export visible rows'? I do not see one. 'Export table as
CSV...' at the top right of the table. That will do: I will take all 300 and head(50) in pandas.
I would honestly rather have all 300 anyway."

**Export table as CSV dialog.**
"'Rows: All 300: Nodes, full graph.' Good, it tells me the count before it writes it, so I am not
wondering whether it quietly capped at 100. 'Order: ... highest first.' 'Columns: 9, hidden ones
included.' Good. 'The first column is the file's own id.' There, that answers my id question --
but it answers it in a dialog I only saw because I was exporting."

"The preview: id, module, degree (full graph), degree rank (of 300, full graph), betweenness
(exact, unweighted, full graph), betweenness rank... and the values are full precision,
0.13785223783101427, not the four digits on screen. Good. That is what I need to diff against
networkx."

"Two things. One: the column header says exact, unweighted, full graph -- not how it was
normalized. When I read this file in six months I will not know if 0.1379 is divided by the pair
count or not. Put it in the header, or at least in the file somewhere. Two: those rank headers
are going to be horrible column names in pandas -- 'betweenness rank (of 300, exact, unweighted,
full graph)' with commas and parentheses inside quotes. It parses. I will rename it on line one
like everybody does. And what does a tie look like in the rank column in the file -- 291 or
'291='? If it is '291=' my rank column becomes object dtype and I have to strip it. The preview
only shows the top rows so I cannot see."

"File name ppi-core-300-nodes.csv. Export. Done. In pandas that is
`pd.read_csv(...).head(50)`. Fine."

**Back to the card: Details, and 'how sure are you of the order'.**
"Now the second half of the question. How sure am I of the order? It is exact, it is not
sampled, so the values are deterministic -- the order is certain in the sense that running it
again gives the same thing. What I actually want to know is which neighbours are so close that I
should not tell anyone rank 23 beats rank 24. The card tells me for the top five only. The
table says nothing about near-ties at all; it only marks exact ties with '='. So for 6 to 50 I
would compute the gaps myself: `df.betweenness.diff()` on the head(50). That is a line of code,
and I would do it anyway, but then the sentence on the card is decoration for my purpose."

"And the 1% -- who decided 1% is a near-tie? Not stated. I would want the rule written next to
it, or the gap as a number I can judge."

"Let me look at a sampled one to compare -- the patent citations state. 'Sampled, 101 sources.'
Top nodes with 'rank, low-high': #1, #2, then #3-#7 for three patents. 'Ranks below #2 may swap
between runs.' Now THAT is how you answer my question. That is an honest bound. The Details
opens a run record: method 'Brandes betweenness from 101 random sources, scaled up by
124,318/101', seed 7, normalization 'divided by (n-1)(n-2)/2, the node pairs of an undirected
graph', error bound plus or minus 0.00035, 95 runs out of 100. And a Copy button for a methods
section. Good. That is what I wanted on the exact one too -- I assume Details there shows the
same record."

"Wait. On this sampled card the Direction dropdown says 'Directed', and the state line says
'Unweighted, directed.' The run record says 'Citations read as undirected' and normalizes by the
undirected pair count. Which is it? Those give different numbers by a factor of two. If I saw
that in a real tool I would stop and rerun it in igraph before I believed any value on the
screen."

**Answer to the moderator.**
"I have the 300 rows in a CSV with the file's ids, sorted, exact values, full precision. Top 50
is head(50). How sure am I of the order: for this run, it is exact, so the order is reproducible;
the top 5 are separated by at least 1.2%. Past rank 5 the tool does not tell me, so I would say
'I do not know yet' until I have looked at the gaps myself. And I would not quote a single
number until I had checked the normalization in Details and one value against networkx."

## After the task

**Single Ease Question: 6.** "Getting the numbers out was easy: card, table, export, three
clicks, and the dialog told me the row count and the ids. It loses a point because 'how sure'
is only answered for five rows on an exact run, and because the normalization is not in the file
I walk away with."

**Would she use it instead of her current tool?** "For computing the ranking, no -- the notebook
is already open and networkx does this in two lines. As a check, and as the thing I hand to the
biologist so she can find MAPK1 and see its rank of 300 without me, yes, probably. The export is
honest, and it tells me what it computed. If the sampled run's error bound is real, that is
better than what I get from networkx's k-sample betweenness, which gives me no bound at all.
But the directed-versus-undirected contradiction on the sampled card would end it for me if it
shipped like that. And I still want to call this from Python."

## Problems observed

1. **Near-tie information stops at rank 5** (Results panel, Top nodes; table). The exact run's
   sentence covers the top five only, and the table marks only exact ties with '='. For a top 50
   she has to compute the gaps herself. Severity 2.
2. **Normalization is not in the CSV header or the table header** (export dialog; table column
   header). 'betweenness (exact, unweighted, full graph)' does not say whether values are divided
   by the pair count; the answer is only in Details. The file outlives the session. Severity 3.
3. **Sampled card contradicts its own run record on direction** (Results panel, finished sampled
   state). Direction 'Directed' and state line 'directed' vs record 'Citations read as undirected'
   with undirected normalization. Severity 3 -- the kind of mismatch that makes her rerun
   everything elsewhere.
4. **How a tied rank is written to the CSV is not shown** (export dialog preview). If it is
   '291=' the rank column will not parse as a number. Severity 2.
5. **'id' vs label is only explained in the export dialog** (table). In the table she could not
   tell whether MAPK1 was the file's id or a display label. Severity 1.
6. **Near-tie threshold (1%) is unstated** (Results panel). Severity 1.
7. **No top-N or visible-rows export**; she did not need it (head(50)), but noted it. Severity 1.

## Quotes

- "It does not say the ranking is meaningful. Ha. Thank you."
- "It tells me the count before it writes it, so I am not wondering whether it quietly capped."
- "No near-ties in the top 5. Nice sentence. It is also only five rows. I asked for fifty."
- "Put the normalization in the header. When I read this file in six months I will not know."
- "Directed on the card, undirected in the record. Which is it? Those differ by a factor of
  two."
