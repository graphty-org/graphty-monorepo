# Session: top 50 by betweenness into Excel or pandas -- Dr. Chen (computational biologist)

Task as given: "Get the top 50 nodes by betweenness into Excel or pandas with their original ids, and
say how sure you are of the order."

Screens seen, in order: the Results panel with a finished betweenness run; the same panel after
"295 more in the table", with the table open below the drawing; the node table in its ranked state;
the Export dialog with Table (.csv) chosen; the Data panel after an export.

## Think-aloud

**1. Results panel, betweenness finished.**
"OK. Betweenness, Sep 28 09:12. Full graph, 300 nodes, 3 components. Exact, undirected, WebGPU. Good
-- it says exact, and the tooltip says exact does not mean the ranking is meaningful, which is the
first honest tooltip I've read this year. Weight: confidence, not used yet. So this is unweighted
betweenness. Fine, that's what I'd run first in igraph anyway, but I'd want to know if I *could*
use the STRING score as a distance. There's a 'Change...' link, I'll leave it.

MAPK1 0.1379, TP53 0.1139. What scale is that? igraph gives me raw counts unless I say normalized.
0.14 looks normalized by (n-1)(n-2)/2 but it doesn't say so here. There's 'Details' -- I'd click
it. I'd expect the normalisation there. It's still not on the panel.

'Every step in the top 5 is over the 1% tie line; the smallest, ranks 3 and 4, is 1.2%.' Right,
YWHAZ 0.0695 against CDK1 0.0687. That's close. 1.2% is tight; I'd not tell anyone YWHAZ beats CDK1.
Still don't know where the 1% comes from, but at least it tells me the gap. It only speaks for the
top 5 though, and I asked for 50.

Distribution: 'zero: 10 nodes, all 291='. I think that means they all share rank 291. The legend on
the canvas says 'the 10 proteins at 0 take the lightest color', so I get it now, but '291=' is
still a code."

**2. "295 more in the table".**
"Click. The table opens under the drawing. 'Full graph: 300 nodes. Sorted by betweenness, highest
first; PageRank's columns beside it.' Good -- it's sorted by the thing I came from. Last time it
opened sorted by PageRank and I had to wonder. Betweenness header says 'exact, full graph', rank
column 'of 300, ties share'. MAPK1, TP53, YWHAZ, CDK1, AKT1, UBC, UBB, EP300, MYC, HSP90AA1. Same
top 10 I'd expect from a STRING core. The PageRank rank next to it is useful -- UBC is 6 by
betweenness, 10 by PageRank.

The id column just says 'id'. Are these my file's ids or a display label? My GraphML has symbols as
the id, so I can't tell from this. If it had been Ensembl in the file and it's showing symbols, I
want to know."

**3. The ranked table.**
"Wait, this one says 'Sorted by pagerank, the run that opened the table.' I opened it from
betweenness. Maybe this is a different visit. Anyway, I can click the betweenness header to sort.
Now the header groups carry the method: 'betweenness exact, unweighted, full graph'. Unweighted, it
says it here. 'Near tie: the next rank's value is within 1%, so a small change in the data could
swap them. "=" marks an exact tie.' That's the sentence I wanted on the results panel.

PageRank ranks carry 'near #7' and so on. The betweenness rank column has none in what I can see.
Does that mean none of the betweenness ranks are near ties, or that it isn't marked for betweenness?
I can only see 11 rows; I'd scroll to 50 and look. If ranks 11 to 50 carry 'near' where they're
near, that's my answer on the order: the marked ones I'd report as ties, the rest I'd stand behind
for this network at this cut-off -- which is all betweenness can ever claim.

The 'Export table...' button is one label now, top right of the table. Good."

**4. Export dialog, Table (.csv).**
"Export table... and I get -- a bank. 'Mule ring, case ACC-233575', 'Filtered: 14 nodes', accounts
from Brazil. That's not my network. Again. I'm assuming it's a placeholder, but if this was a real
tool I'd close it and check I hadn't opened someone else's session.

Reading past the data: 'Table (.csv): the rows of a table tab, with its methods file.' Rows, From,
Order, Columns 'hidden ones included', Methods 'always written beside it'. 'Order: riskScore,
highest first' -- so the file follows whatever the table is sorted by. Then I must sort by
betweenness before I export. Fine, it tells me.

'The first column is the file's own id, written as it came in.' That's the answer to my id question,
and it's here, not on the table where I asked it. Good enough; I'd still want it on the table
header.

The CSV header: 'pagerank (exact, unweighted, normalized to sum 1, full graph)'. So the method goes
into the column name. For betweenness I'd expect 'normalized' spelled out in the same way, so the
normalisation question finally gets answered -- in the file, not on the panel. pandas will give me a
column called 'betweenness (exact, unweighted, normalized, full graph)', which I'll rename, but I'd
rather have it than not.

No rank column in the preview. Ties shown on screen as '#4=' won't arrive; I'd recompute rank in
pandas with method='min'. The near-tie markers don't come out either, as far as I can see.

Methods file beside it: rows, order, data file, load rules, weight 'not used yet; no measure here
reads a weight', each measure with its method and normalisation, graphty-element version. That is
the legend of my supplementary table written for me. This is the best thing on the screen.

CSV only. No TSV. If a postdoc opens this in Excel, SEPT7 and MARCH1 become dates, and nothing here
warns about it. For pandas I don't care; for 'Excel' in the task I do.

'2 files go to your Downloads folder. Nothing is uploaded.' Good. Export 2 files."

**5. After export.**
"The Data panel lists what went out: 'stress-response-study_nodes.csv and its methods file,
2026-09-24, to Downloads'. The project is called 'Stress response study' here and 'Human protein
interactions' on the other screens. Which is it? Minor, but it makes me check twice.

In pandas: read_csv, sort by the betweenness column, head(50), rank(method='min'). Done."

## How sure am I of the order?

"The top two, MAPK1 and TP53, I'm sure of for this network. Ranks 3 and 4 (YWHAZ, CDK1) are 1.2%
apart and I'd report them as tied in practice. Below 5 I only know what the near-tie markers tell me
on screen, and those don't come out in the file, so for ranks 11 to 50 I'd recompute the gaps
myself. And the whole order is for unweighted betweenness on a 0.7 STRING network: change the
cut-off and the middle of the list moves. The tool says that, more or less, which is more than
cytoHubba does."

## Single Ease Question

5 out of 7. "Getting the table out is straightforward and the methods file is better than anything
Cytoscape gives me. I lose points on the export preview showing a bank's accounts, the tie
information staying on the screen instead of going into the file, and the normalisation only turning
up in the file's column header."

## Would I use this instead of my current tool?

"Not instead. Beside. igraph does this in four lines and I choose the normalisation. I'd use this to
look, to see where degree and betweenness part, and for the methods file, which goes straight into a
supplementary legend. With an R or Python way to run the same measure and pull this same table, it
would go into the pipeline. Without it, it's a viewer with a very good export."

## Problems noted (her words, then what happened)

- "That's not my network." -- the Export dialog preview shows a bank-account case with 14 filtered
  nodes, not the 300-protein network she exported from. Same as last round.
- "What scale is 0.1379?" -- betweenness normalisation is not on the Results panel or the table
  header; it appears only in the exported column name and the methods file (and presumably
  behind Details, which she did not see opened).
- "Do the near ties go out?" -- the table marks near ties and exact ties ("near #7", "#4="), but the
  CSV preview holds no rank column and no tie marks, so the evidence for the order stays on screen.
- "Near ties on betweenness?" -- in the visible rows, only the PageRank rank column carries "near"
  marks; she cannot tell whether betweenness has none or simply isn't marked.
- "Sorted by pagerank?" -- the ranked table says it is sorted by PageRank, "the run that opened the
  table", though she came from betweenness; the table opened from the Results panel was correctly
  sorted by betweenness.
- "Is that my original id?" -- the table's id column does not say; only the Export dialog says the
  first column is the file's own id.
- "SEPT7 becomes a date." -- CSV only, no TSV, no warning about Excel reformatting gene symbols.
- "Which project is this?" -- "Human protein interactions" on the panels, "Stress response study"
  after export.
- "291=" -- the zero line in the distribution reads as a code.
- "Where's the R route?" -- no scripting path visible.

## What she liked

- The methods file beside every table: order, data file, load rules, weight, each measure's method
  and normalisation, software version.
- Method written into the CSV column header, so pandas carries it along.
- "The first column is the file's own id, written as it came in."
- The table opened from the Results panel sorted by betweenness, with one "Export table..." label.
- The top-5 gap sentence with the actual smallest gap (1.2%, ranks 3 and 4).
- "Exact ... does not say the ranking is meaningful" in the tooltip.
- "Nothing is uploaded" and the list of what was exported and when.
