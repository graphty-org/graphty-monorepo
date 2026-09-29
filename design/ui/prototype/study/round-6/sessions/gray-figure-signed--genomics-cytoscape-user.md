# Session: a black-and-white fold-change figure, and which genes went up the most -- Maren, genomics postdoc

Participant: Maren, cancer genomics postdoc, Cytoscape user (study/personas/genomics-cytoscape-user.md). Played on a 14-inch laptop, 1440 x 900.

Task as given by the moderator: "Make a black-and-white figure of the fold changes for a journal that prints in gray, and tell me which genes went up the most."

Screens seen, in the order she met them (participant view; renders in shots/tasks/print-ready-grey/ and tmp/maren-r6-grayfig/):

- shots/tasks/print-ready-grey/01-styles-list.png, tmp/maren-r6-grayfig/styles-list-top-n.png (the style stack, the label layer)
- shots/tasks/print-ready-grey/02-colour-by-value.png, tmp/maren-r6-grayfig/colour-by-value-numbers.png (colouring by log2FoldChange)
- shots/tasks/print-ready-grey/04-export-dialog-first-release.png (Export, Screen look, with the gray warning)
- shots/tasks/print-ready-grey/03-export-dialog-figure-grey.png, tmp/maren-r6-grayfig/grey-zoom.png (Export, Print look, read enlarged)
- tmp/maren-r6-grayfig/table-dock-ranked.png, tmp/maren-r6-grayfig/table-dock-header.png (the table under the canvas and its column menu)
- tmp/maren-r6-grayfig/inspector-one-node.png (one gene in the inspector)
- tmp/maren-r6-grayfig/export-dialog-done.png (after exporting)

## Think-aloud

### 1. Where I start

"300 nodes, 1,262 edges, three components. It's coloured orange-brown by betweenness, and there's a little editor open for it that says 'Log', 'Orange to brown'. Not what I want. I want fold change. The stack on the right: Betweenness color, Hub labels, Size: degree, Base style. That's my Cytoscape style, as a list. OK."

"Legend is on the canvas, bottom left, with the colour scale and the size key. Nice. In Cytoscape that's a separate app."

"There's a 'Look: Screen' thing next to Style stack. I'll come back to it -- no point choosing a print mode for a colouring I'm going to replace."

### 2. Colour by fold change

(02-colour-by-value)

"New layer, Fill, Color, click it -- a list. 'From the data: log2FoldChange, numbers, -2.52 to 3.15.' Good, the column is there and it tells me the range before I commit. That's the thing that has burned me: in Cytoscape I only find out the import failed when the mapping list is empty. And on the right under Attributes it says log2FoldChange again with the same range. I pick it."

(colour-by-value-numbers)

"Linear, diverging, Red to blue, midpoint 0, a histogram under the gradient. 'No value: 0 nodes, not painted.' OK, all 300 have a value. That's the count I always want and never get. Legend: below 0 is 148, above 0 is 152. Good, it's centred on zero by itself."

"But -- 'Below 0 is red, above is blue.' That's backwards for my field. Red is up. Every heatmap in my lab, every DESeq2 volcano, red is up. There's a swap button and a note saying 'use Reverse for the opposite', so I'd click it. For the gray figure it won't matter. For the colour version, someone's going to publish red-means-down and a reader is going to read it wrong."

### 3. The gray figure

"Now the journal. Where's export... there's an Export dialog."

(04-export-dialog-first-release)

"Figure (.svg), 174 mm two columns, white background, legend beside, right. Labels: 'Top N by this layer's value', N = 10, 'by |log2 fold change|'. And a preview with the legend inside it -- 'Red: down. Blue: up. White: 0.' -- and the degree key. The legend comes out WITH the figure. That alone is most of what I use Legend Creator for."

"And a yellow warning: 'Values just above and below 0 print as the same gray.' With a button, 'Use Print look'. Yes. That is exactly the problem, it's telling me before the journal does. Click."

(03-export-dialog-figure-grey, read enlarged)

"Now it shows two previews: 'The file, as written' and 'Printed in gray, the same file.' So it's still coloured, but it's also safe in gray? Shape is the sign: triangle up for up, triangle down for down. Darkness is how big the change is, four gray steps, 0 to 0.8, 0.8 to 1.6, 1.6 to 2.4, 2.4 to 3.2, with counts down and up for each. 'No two of its 8 categories print as the same gray.' Fine, I'll believe that when I print it, but the idea is right."

"Hmm. Triangles. 300 triangles on a hairball is busy, and the little ones at low degree -- I can't tell up from down at that size in the preview. At 8 pt on a real page maybe. I'd print it on the lab printer before I send it. And a reviewer might ask why the nodes are triangles; that's not what a STRING figure looks like. But I'd rather have triangles than two grays nobody can tell apart."

"The methods file. 'Color: log2FoldChange (from the file), linear, diverging at 0, -2.52 to +3.15; 148 below 0, 152 above. Print look: shape is the sign... darkness is the distance from 0 in 4 gray steps... Labels: top 10 by |log2FoldChange|; 8 drawn, 2 hidden to avoid overlap (MRE11, RPL17). Drawn with graphty-element 2.6.2.' I would paste half of that straight into the figure legend. That's the EnrichmentMap protocol telling me to type 'q < 0.01' by hand, done for me."

"Wait -- 'Look, for this file only.' And there's also a 'Look' on the style stack. So if I pick Print here, the canvas stays in colour? I think so, 'for this file only'. OK. Two places for the same thing, but the one in export says what it does."

"The two hidden labels. MRE11 +2.35 is one of my biggest changes and it's dropped from the figure because it overlaps. That's the gene a reviewer would look for. There's 'Select' next to it and a line saying the inspector has 'Show label anyway'. So I have to leave the dialog, go to the node, force the label, come back. It's doable. I'd rather have a tick box right there."

"Export 2 files. 'Nothing is uploaded.' Good."

(export-dialog-done)

"Data panel: 'stress-response-study_figure.svg and its methods file, Print look. Today 19:12, to Downloads.' And the canvas is still in colour. Fine. The figure part is done."

### 4. Which genes went up the most

"Now the second half. Which went UP the most. The labels are 'top 10 by |log2 fold change|' -- absolute value. So that's up and down mixed. MAPK10, E2F1, MAPK2, NDUFS5, SNRNP70, WRN, CHEK1, RPS6, and hidden MRE11 +2.35, RPL17 -2.25. Which of those are up? I'm reading the direction of a triangle, or in the colour preview, blue. SNRNP70, CHEK1, WRN look dark blue, pointing up. RPS6 and NDUFS5 are red, so down. MAPK10 and MAPK2 I honestly can't tell at that size."

"The labels menu said 'Also: Above a threshold'. I don't see 'top N up' or 'largest positive'. So I can't label just the up genes without making a set first, I think."

"The legend says the top up bin, 2.4 to 3.2, has 3 genes. So three genes are above 2.4. Which three? That's my answer and the figure doesn't say it."

"The table. There's a table under the canvas." (table-dock-ranked)

"id, module, community, degree and rank, betweenness and rank, pagerank and rank. Sorted by pagerank. Where's log2FoldChange? It's MY column, it's the whole point of the dataset, and it's not in the table. Maybe it's off to the right, I'd scroll. The column menu (table-dock-header) has Sort descending, Filter, Color by, New column, Join... 'New column' -- do I have to add my own data as a new column? That can't be right, it's already imported. I'd scroll right, and if it's not there I'd give up on the table."

"Clicking one gene: TP53, log2FoldChange -0.84 'from ppi-core-300.graphml'. That's one at a time. Not how I'm going to rank 300 genes."

"What I'd actually do: Export, tick 'Table (.csv)', open it in R -- not Excel, Excel eats my gene names -- arrange(desc(log2FoldChange)), head(10). Two minutes. I know the columns are in the CSV. But then why did I need this tool for that half?"

"So my answer to the moderator: from the figure alone, three genes are above +2.4, and the labelled ones that look up are SNRNP70, CHEK1 and WRN, plus MRE11 at +2.35 which is hidden. I would not put that in writing without the sorted table. I'd give you the real list after I sort the CSV."

## Single Ease Question

5 out of 7.

"The gray figure: that's a 6, maybe a 7. It warned me about the gray before I made the mistake, the legend is in the file, and the methods text writes itself. The 'which went up' part is a 3 -- the label rule is by absolute value and the table doesn't show my fold-change column, so I'd go back to R for it. Average, 5."

## Would she use this instead of Cytoscape?

"For this figure -- honestly, the export is better than what I do now. Legend inside the file, the gray check, the methods paragraph. I'd use it to make the gray version and I'd show my PI the methods file."

"Instead of Cytoscape? No, not yet. My STRING query, MCODE clustering, cytoHubba, per-cluster enrichment -- none of that was here today. And I have to cite it: 'drawn with graphty-element 2.6.2' is a version, not a paper. Reviewer 2 wants a reference. And I'd need to believe it will still open this file in three years."

"It's the first tool that made the print version easier than the screen one. If it had a fold-change column in the table I could sort, and 'top N up' as a label option, I'd do this whole task without leaving it."

## Findings, in her words and in plain terms

1. The table does not show the fold-change column, so "which went up the most" cannot be answered by sorting. Her own data column, the one the whole figure is about, is missing from the table under the canvas; she would scroll right, suspect she has to add it with "New column", and fall back to exporting a CSV and sorting it in R. Severity: high for this task.
2. Labels offer "top N by |value|" and "above a threshold", not "top N largest increases". Up and down are mixed in the labelled ten; she has to read triangle directions or colours to tell which labelled genes went up, and could not for MAPK10 and MAPK2 at preview size.
3. The default diverging palette puts red below 0 and blue above, opposite to the convention in expression biology (red up). Reverse exists and the note says so, but the default invites a misread colour figure.
4. A top-10 gene (MRE11, +2.35) is hidden to avoid overlap. Forcing its label means leaving the dialog for the inspector's "Show label anyway"; she wanted the choice in the dialog.
5. Two places choose a Look (the style stack and the export dialog, "for this file only"). The export one explains itself; the relation between the two was a guess.
6. Triangles for sign read well in the enlarged preview but small low-degree triangles are hard to tell apart; she would test-print before submitting, and expects a reviewer to ask why the nodes are triangles.
7. The session opened on a betweenness colouring she had not asked for; she had to build the fold-change layer herself. Minor, but the task's column was not what was showing.

## What worked for her

- The colour picker lists log2FoldChange with its range before she commits, and the layer reports "No value: 0 nodes". The matching count she never gets in Cytoscape.
- The diverging scale centred on 0 by itself, with below/above counts (148 / 152).
- The Screen look export warned "values just above and below 0 print as the same gray" with a one-click "Use Print look".
- Side-by-side previews: the file as written, and the same file printed in gray, with a legend that counts up and down genes in each gray step.
- The legend, size key and label rule are inside the exported SVG.
- The methods text file: scale, midpoint, counts, gray steps, label rule, hidden labels by name, and the version. She would paste it into the figure legend.
- "Nothing is uploaded" and the export listed in the Data panel with its time.
