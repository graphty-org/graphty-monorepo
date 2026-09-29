# Top 50 by betweenness into Excel or pandas -- Analyst Alex

Task as given: "Get the top 50 nodes by betweenness into Excel or pandas with their original ids,
and say how sure you are of the order."

Screens seen, as a participant sees them: the results panel after a betweenness run
(`shots/tasks/top-50-to-excel/01-results-panel-finished.png`), the same panel with the table open
(`02-results-panel-in-the-table.png`), the node table with three measures ranked
(`03-table-dock-ranked.png`), the table's Export popover (`screens/table-dock.html#out`) and the
full Export dialog (`screens/export-dialog.html#table`).

Dataset on screen: Human protein interactions, 300 nodes, 1,262 edges, 3 components.

## Think-aloud

**1. The results panel, betweenness already run.**

"OK, so betweenness is done. Top of the panel says 'Nothing has been sent from this project' --
good, that's the first thing I look for. Full graph, 300 nodes, 3 components. It says Exact,
Undirected, WebGPU. I hover Exact: 'Computed on every node, not estimated. It does not say the
ranking is meaningful.' Huh. That's actually honest. I'd rather have that than a tool pretending.

Top nodes: MAPK1 0.1379, TP53 0.1139, YWHAZ, CDK1, AKT1. Then there's this line, 'Every step in
the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%.' So YWHAZ and CDK1 are
1.2% apart. That's close. That's the kind of thing my director asks. But it's the top 5. I need 50.
It doesn't tell me anything about 6 to 50.

'Weight: confidence, not used yet.' Not used YET? Is it telling me I should have used it? NetworkX
defaults to unweighted too, so I'll leave it, but 'yet' makes me feel like I skipped a step.

Before I trust these numbers I'd want to know if they're normalised the way NetworkX does it. I
click Details."

(Details opens the run record: Brandes, exact, every node a source; normalisation divided by
(n-1)(n-2)/2 node pairs; weight not used.)

"(n-1)(n-2)/2. That's NetworkX's normalized=True for undirected. OK, so 0.1379 should be the same
number I'd get. I'd still check MAPK1 in my notebook once, but fine."

**2. Getting to the table.**

"'295 more in the table.' That's the obvious one. Click."

(The table opens under the graph, sorted by betweenness.)

"Right, one row per protein, id first -- MAPK1, TP53, YWHAZ. Header says 'Sorted by betweenness,
highest first'. There's a betweenness column and a 'betweenness rank, of 300, ties share' column,
and PageRank beside it because apparently I ran that too. I can see ten rows. UBC is #6 on
betweenness but #10 on PageRank -- fine, different measures, I know that.

Two clicks so far. Good."

**3. The table with three measures (the other state).**

"This one's sorted by pagerank, 'the run that opened the table'. And there's a line: 'Near tie:
the next rank's value is within 1%, so a small change in the data could swap them. "=" marks an
exact tie.' OK, that's what I want for the how-sure part. PageRank ranks say '#7, near #8',
'#9, near #10'. Degree has '#4=' and '#7='. Betweenness column, in the ten rows I can see, has no
'near' at all -- #1 to #10 are clean. I'd have to scroll to 50 to see if anything in 11 to 50 is
flagged. That's the part I actually need and I can't see it here.

Heads up though: if I'd come in through PageRank, this table is sorted by PageRank. If I then hit
export and take the first 50 rows, I've got the wrong 50. I'd catch it. Would the guy next to me?"

**4. Export table.**

"Top right of the table, 'Export table...'. Click."

(The Export popover: Rows 'All 300: Nodes, full graph'. Order 'pagerank, highest first' in the one
I'm looking at. Columns '10, hidden ones included'. Methods 'Always written beside it'. A preview of
the first lines, a file name ppi-core-300-nodes.csv, and 'Beside it: ppi-core-300-nodes-methods.txt'.)

"No 'top 50' option. It writes all 300. Honestly that's fine -- in pandas it's `.head(50)`, in Excel
it's rows 2 to 51. I'd rather have all 300 than a file that's secretly capped. It says 'All 300', so
I'm not wondering.

But 'Order: pagerank, highest first'. There it is. The file follows whatever the table is sorted by.
From my betweenness route it'd say betweenness. I'm going to sort it myself in pandas anyway,
because I don't trust file order, but in Excel somebody is going to just select the top 50 rows.

'The first column is the file's own id.' Good. That's the 'original ids' part. MAPK1 is what was in
the GraphML, so it'll join back to my table.

Preview. Let me actually read this header."

    id,module,"community (Louvain, weighted, seed 7, full graph)",degree (full graph),
    "degree rank (of 300, full graph)","betweenness (exact, unweighted, full graph)",
    "betweenness rank (of 300, exact, unweighted, full graph)", ...

"Oh, come on. `df["betweenness (exact, unweighted, full graph)"]`. I'm renaming every column the
first thing I do. I get why -- it's the method in the header so nobody mixes up runs -- but there's
already a methods file beside it. In Excel it's fine, it's just a wide header.

Values: 0.13785223783101427. Full precision. Good, I can check ties myself.

Ranks: YWHAZ's degree rank is '4='. That's text. So in pandas that whole rank column comes in as
object, and in Excel it's a text cell -- sort it and '4=' goes to the bottom or wherever Excel
feels like. I'll ignore their rank columns and rank it myself with `rank(method="min")`.

And the 'near #8' thing from the table -- I don't see it in the file. Only the '='. So the how-sure
bit stays in the app unless I rebuild it. I can: diff the sorted values, flag under 1%. Two lines.
But then it's my rule, not the tool's, and if the director asks 'says who' I'm the one answering."

**5. The full Export dialog.**

"This one's a different project -- some mule-ring case, 'Filtered: 14 nodes'. Whatever. Same idea:
Table (.csv), Nodes tab, rows count, order, columns, methods always written beside it. Bottom line
says '2 files go to your Downloads folder. Nothing is uploaded.' That's the sentence I'd paste into
the email to IT.

The methods file spells it out: order, data file, what was computed, 'graphty-element 2.6.2'. I'd
keep that with the deck. That's actually the thing Gephi never gave me."

**6. Answer to the moderator.**

"So: I've got a CSV with all 300, original ids, full-precision betweenness. I take the top 50 in
pandas after sorting on the betweenness column myself.

How sure am I of the order? It's exact, not sampled, unweighted, normalised the NetworkX way.
The top 2 are solid -- MAPK1 and TP53 are well clear. 3 and 4, YWHAZ and CDK1, are 1.2% apart,
so I'd say 'roughly tied' out loud. For 6 to 10 nothing is flagged as near. For 11 to 50 I honestly
don't know from what I saw -- the tool would mark near ties in the table if I scrolled, but it's not
in the file and the panel only talks about the top 5. Down there, with values around 0.02 and
smaller, I'd bet there are near ties, and I'd tell my director 'the top 5 is solid, below 10 treat
it as a band, not a ranking'."

## Single Ease Question

**5 out of 7.**

"The getting-it-out part is easy. Three clicks from the result to a file. It took longest to work
out how sure I am, because the tool only told me about the top 5 and the near-tie flags don't come
out with the file. And the headers and the '4=' ranks mean I clean the CSV before I use it."

## Would I use this instead of what I use now?

"For this, partly. Right now I compute betweenness in NetworkX and export from there -- that's
already easy for a table. What this gives me that NetworkX doesn't is the picture and the table in
one place, the methods file, and someone having thought about ties. If MAPK1 comes out at 0.1379 in
my notebook too, I'd use this for the first pass and the slide, and keep pandas for the final
top 50, because I'd still re-rank and re-flag the ties myself. I wouldn't switch completely until
the how-sure part comes out in the file."

## Problems

| Screen | What | Severity (1-4) |
|---|---|---|
| Table Export popover, Export dialog | The near-tie marks ("#7, near #8") shown in the table are not in the CSV; only "=" for exact ties is kept, so the evidence for how sure the order is stays in the app. | 3 |
| Results panel | The how-sure line covers only the top 5; nothing summarises near ties across the top 50 (or any top N the reader cares about). | 3 |
| Table Export popover | The file's row order follows the table's current sort (pagerank here); taking the first 50 rows of a file opened from another measure's run gives the wrong 50. The Order line says so, but it is easy to skip. | 2 |
| Table Export popover | Rank columns hold text like "4=", so the whole column is text in Excel and object dtype in pandas; sorting it misorders. | 2 |
| Table Export popover | Column headers carry the method in parentheses and commas ("betweenness (exact, unweighted, full graph)"), awkward to address in pandas; he renames every column first. | 2 |
| Export popover and dialog | No way to write only the top N rows; he accepts all 300 but has to cut to 50 himself. | 1 |
| Results panel | "Weight: confidence, not used yet" -- "yet" reads as a nudge that he skipped a step. | 1 |
| Export dialog | The full dialog page shows a different project (a 14-node filtered fraud case), so it does not follow on from the protein table. | 1 |
| Table dock | Column header spelled "PageRank" in one table and "pagerank" in the other. | 1 |

## What worked

- "Nothing has been sent from this project" at the top, and "Nothing is uploaded" at the foot of
  the Export dialog.
- The Exact tooltip admits exact does not mean the ranking is meaningful.
- Details gives the normalisation, which matches NetworkX, so he can check one number and trust the rest.
- "All 300" stated up front: no silent cap.
- Original ids in the first column, full-precision values, and a methods file beside every table.
- Near ties and exact ties marked in the table, with the rule stated in one line.
