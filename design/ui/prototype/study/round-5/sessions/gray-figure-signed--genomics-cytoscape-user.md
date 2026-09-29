# Session: a black-and-white fold-change figure, and which genes went up the most -- Maren, genomics postdoc

Participant: Maren, cancer genomics postdoc, Cytoscape user (study/personas/genomics-cytoscape-user.md). Played on a 14-inch laptop, 1440 x 900.

Task as given by the moderator: "Make a black-and-white figure of the fold changes for a journal that prints in gray, and tell me which genes went up the most."

Screens seen, in the order she met them (participant view, renders in shots/):

- r4-maren-gfs-styles-list.png, r4-maren-gfs-styles-list-looks.png (the style stack and its Look menu)
- r4-maren-gfs-colour-by-value.png, r4-maren-gfs-colour-by-value-choose.png, r4-maren-gfs-colour-by-value-numbers.png (colouring by log2FoldChange)
- r4-maren-gfs-export-dialog-ways-in-menu.png, r4-maren-gfs-export-dialog.png (the ways into Export, and the table under the canvas)
- r4-maren-gfs-export-dialog-figure.png, r4-maren-gfs-export-dialog-figure-grey.png, r4-maren-gfs-export-dialog-first-release.png (the Export dialog, Screen and Print looks)
- r4-maren-gfs-table-dock-header.png (the column header menu, on another dataset)
- r4-maren-gfs-flow-export.png (the export walk-through page, read at the end)

## Think-aloud

### 1. Where I start

"OK, a network, 300 nodes, 1,262 edges, three components. It's already coloured orange-brown by... betweenness. I didn't ask for that. I want fold change. There's a stack on the right, 'Style stack', with Betweenness, Hub labels, Size: degree, Base style. Fine, that's Cytoscape's style, more or less, but as a list."

"The legend is on the canvas, bottom left. Good. That's already better than Cytoscape, where the legend is a separate app."

"Next to 'Style stack' there's 'Look: Screen'. Let me open that." (styles-list-looks)

"Screen, Print, High contrast. Print: 'Reads in gray on white paper and for colour-blind readers. Where a colour shows a direction, a shape shows it too.' Huh. That's literally my task. And 'Colours you set by hand are kept.' I'll remember that exists, but first I need the fold change on there at all -- I'm not picking a print mode for a betweenness colour I don't want."

### 2. Colour by fold change

(colour-by-value, choose)

"Style layer, Fill, Color. I click the colour and it gives me a list: palette colours, then 'From the data': log2FoldChange, numbers, -2.52 to 3.15. And module. Then 'Computed': degree, betweenness. Oh -- good, it tells me the range right there. In Cytoscape I'd be scrolling a mapping dropdown hoping the column imported. This one says the column is there and what's in it."

"Also on the right, under Attributes: log2FoldChange -2.52 to 3.15. So it matched on all 300? It says nothing about how many had no value. Let me pick it."

(colour-by-value, numbers)

"Linear, diverging, Red to blue, midpoint 0. Histogram under the gradient. 'No value: 0 nodes, not painted'. OK, there it is -- zero missing. Good. That's the number I wanted."

"Not red-green. My PI will be happy. But -- 'Below 0 is red, above is blue'. That's backwards for us. In every DE figure in my lab, red is up, blue is down. It says 'use Reverse for the opposite', and I see the little swap arrows next to the palette. Fine, I'd hit that. For a gray figure it doesn't matter anyway. But I'd bet someone publishes a figure with red meaning down and the reader assumes the opposite."

"The legend on the canvas: 'Below 0: 148, Above 0: 152, No value or unstyled: 0'. Numbers. I like numbers."

"One thing: nothing here asks me what 'no change' is. I'd normally only care about |log2FC| > 1, or padj < 0.05. There's no padj on this network at all, by the way. I'll come back to that."

### 3. Getting to Export

(export-dialog-ways-in-menu, export-dialog)

"Now I need the file. Project name, top left, the dropdown: Rename, Duplicate, Project info, Update with new data, Version history, Export... Ctrl+Shift+E. OK, that's where File > Export would be. I'd have found that."

"The Data panel also has an 'Export...' button next to 'Data'. And the table at the bottom has 'Export table...'. Three doors. Fine."

"While I'm here -- the table at the bottom: 'Full graph: 300 nodes. Sorted by |log2FoldChange|.' CHEK1 3.15, WRN 2.61, SNRNP70 2.58, RPS6 -2.52, MAPK10 -2.42... That's sorted by the absolute value, so it's mixing up and down. For 'which went up the most', CHEK1 is clearly first. WRN and SNRNP70 next. After that the list switches to down genes and I only see five rows on this screen."

"Also: the stack here says 'Fold change color', but I called mine... well, it named itself 'log2FoldChange color' back there. Is that the same layer? Probably. I'll assume so."

### 4. The Export dialog, Screen look

(export-dialog-figure)

"Figure (.svg), 'Vector, with real text. For a paper or slides.' Ticked. Width 174 mm, two columns -- also 85 mm one column. OK, somebody here has submitted a paper. White background. Legend beside, right. Labels: Top N by this layer's value, N = 10 'by |log2 fold change|'. '2 labels hidden to avoid overlap: show list'."

"The preview has the legend in it. 'log2 fold change. Red: down. Blue: up. White: 0.' Degree sizes. 'Labeled: the 10 largest changes, 8 shown'. And a methods file next to it, stress-response-study_figure-methods.txt, with the data file, 300 proteins, 1,262 interactions, loaded date, the colour mapping, 'Drawn with graphty-element 2.6.2.' -- I would paste half of that into my methods. I'd rewrite it, but I'd paste it."

"And under the preview, a yellow warning: 'Values just above and below 0 print as the same gray.' with a 'Use Print look' button. Yes. That's exactly the problem. In gray, pale red and pale blue are both just light gray. Nobody warned me about that in Cytoscape; the JensenLab exercise has you figure it out yourself. OK, Use Print look."

### 5. Print look

(export-dialog-figure-grey, zoomed crop in tmp)

"Now it shows two previews: 'The file, as written' and 'Printed in gray, the same file'. Triangles up for up, down for down, circles for no change. Darker is a bigger change. So in gray I can still tell direction by the shape. That's clever and it's the thing I'd have spent an afternoon faking in Illustrator."

"Legend: 'up: +0.25 to +3.15, 133. down: -0.25 to -2.52, 120. no change: within 0.25 of 0, 47.'"

"Wait. 0.25? Where did 0.25 come from? I never typed 0.25. I didn't see any box for it on the colour layer -- there was midpoint and no value, that's it. 0.25 is not my cutoff. A log2FC of 0.25 is a 1.19-fold change; nobody calls that a change. If I'm drawing 'no change' as circles on a published figure, I need that to be MY threshold -- 1, or 0.58 -- and I need to be able to set it. Right now it's something the program decided and then wrote into my figure legend as if it were a fact about my data. And into the methods file: 'no change within 0.25 of 0'. A reviewer will ask why 0.25 and I won't have an answer."

"And the counts don't agree. On the layer and in the Screen legend it was 148 below 0, 152 above. Here the green check line says 'Increases and decreases stay apart in gray (120 below 0, 133 above; 47 within 0.25 of 0 drawn as no change)'. 120 below zero? It was 148 below zero a minute ago. I think they mean 120 below -0.25, and 28 of the 148 got moved into the circles. But the sentence says 'below 0'. And the methods text still says '148 below 0, 152 above' in the same dialog. Three numbers for one column. That's the kind of thing that makes me stop and recount everything."

(The moderator did not answer; she worked it out from the legend.)

"OK -- 133 + 120 + 47 is 300. So nothing is lost. Fine. It's the words 'below 0' that are wrong, not the data. But I shouldn't have had to add it up."

"The degree legend is circles, but the nodes are triangles now. I can live with it, but a reviewer might ask whether a big triangle and a big circle are the same size."

"Labels: I open 'show list' -- the two hidden ones are MRE11 +2.35 and RPL17 -2.25. MRE11 is one of my top up genes and it's the one that got dropped! At least it tells me, by name. In Cytoscape it would just overlap into mush. But for this figure I'd want MRE11 on it. I don't see a way to force one label -- maybe drag it? I'd try that."

"Also the ten labels are the ten biggest changes either way, up and down mixed: MAPK10, MAPK2, E2F1, NDUFS5, SNRNP70, RPS6, WRN, CHEK1. On the gray version I have to look at which way the triangle next to each name points to know if it went up. SNRNP70 and CHEK1 are clearly dark up triangles. WRN I can't tell which triangle the label belongs to, it's in a cluster. In the real 174 mm print it might be clearer. Not in this preview."

"Export 2 files: the SVG and the methods text. 'Nothing is uploaded.' Good -- that's the first thing my PI asks."

### 6. The export walk-through page

(flow-export, read after the task, as the moderator offered it)

"This page tells the same story but on a different dataset, 84 qPCR genes, and in step 1 she types '0.58 into No change within, her lab's 1.5-fold cut-off' on the layer. So that box is supposed to exist! I didn't see it on the colour layer I made. If it's there, the 0.25 problem goes away -- I'd type 1 or 0.58 and the circles would mean something. On what I was shown, it's not there."

### 7. Which genes went up the most

"From the table sorted by |log2FC| and the hidden-label list:

1. CHEK1, +3.15
2. WRN, +2.61
3. SNRNP70, +2.58
4. MRE11, +2.35 (only found because it was a hidden label)

After that I don't know. The table showed only five rows and it's sorted by absolute value, so the next rows are down genes. I'd click the log2FoldChange header -- on the other table there's a column menu with 'Sort descending' -- and read the top ten up from there. I'm assuming it does a signed sort and not absolute again; on this screen it only ever said '|log2FoldChange|'."

"And 'went up the most' by fold change alone is not what I'd report. Without padj on here, CHEK1 at +3.15 could be three reads going to twelve. I'd go back to my DESeq2 table for that. This network doesn't have the p-values on it, so the figure can't say which of these are real."

## Single Ease Question

"5 out of 7. Finding fold change and getting a gray figure with a legend and direction you can read was easier than I expected -- the warning and the Use Print look button did most of the work. It lost points for the 0.25 I never set, the 'below 0' counts that don't match, the top-10 labels mixing up and down, and an up gene hidden from the label list. Answering 'which went up the most' was the harder half: the table sorted by absolute value, so I'm not sure of anything past number four."

## Would she use this instead of Cytoscape?

"For this kind of figure -- a gray-print journal -- honestly, maybe. Cytoscape doesn't give me the legend in the export, doesn't tell me my gray is ambiguous, and doesn't write my methods. This does all three. That's real."

"But: I'd have to be able to set the no-change band myself before I'd put circles on a published figure. And I'd need something to cite -- the methods says 'Drawn with graphty-element 2.6.2'. What's the paper? My PI will ask. And the STRING query and my enrichment still happen somewhere else, so it's one more tool in the chain, not a replacement. I'd use it for this figure and still keep the Cytoscape session, because reviewers know what a Cytoscape figure looks like and I know I can regenerate it in three years."

## Observed problems (moderator notes)

1. The Print look draws a "no change" band of 0.25 around 0 that the participant never set and could not find on the colour layer; it goes into the figure legend and the methods file as if it were her threshold. The export walk-through describes a "No change within" field on the layer, but the colour layer screen she used has only Midpoint and No value. Severity: high (a published figure states a cutoff the author did not choose).
2. Three sets of counts for one column in one dialog: the methods text and Screen legend say 148 below 0 and 152 above; the Print check line says "120 below 0, 133 above; 47 within 0.25"; the Print legend says up 133, down 120, no change 47. The check line's "below 0" should read "below -0.25". She had to add the numbers to confirm nothing was lost. Severity: medium-high.
3. "Top N by this layer's value" ranks by absolute change, so the labels mix increases and decreases; for "which went up" she had to read triangle direction next to each label, and in a dense cluster (WRN) could not tell which mark the label belongs to. Severity: medium.
4. A top increase (MRE11, +2.35) was one of the two labels hidden to avoid overlap; the list names it, which she valued, but she saw no way to keep a specific label. Severity: medium.
5. The table under the canvas is sorted by |log2FoldChange| and shows five rows; she could not see the top increases past the third without re-sorting, and she only assumed the column header offers a signed sort. Severity: medium.
6. The diverging default puts red below 0 and blue above, the opposite of the red-up convention in DE figures; Reverse is offered and named. Severity: low (irrelevant in gray, a trap in colour).
7. In the Print look the node-size legend is drawn as circles while the nodes are triangles. Severity: low.
8. The layer she created was named "log2FoldChange color"; on the export screens the same layer reads "Fold change color", and the graph is "Interactions" instead of "ppi-core-300". She assumed they were the same. Severity: low.
9. No p-value or padj on the network, so "went up the most" can only mean fold change; she would not report it without significance. Severity: low for the design, a real limit on the answer.

## What she valued

- The column picker names log2FoldChange with its range, and the layer says "No value: 0 nodes" -- the count she always looks for first.
- Default diverging palette is red-blue, not red-green, centred on 0, with the midpoint shown.
- The Export dialog warns in plain words that values either side of 0 print as the same gray, and fixes it with one button.
- Shape for sign, darkness for size, shown as written and as printed in gray side by side.
- The legend is inside the SVG; the width presets are journal column widths; text is 8 pt at print size.
- A methods text file written next to the figure, and "Nothing is uploaded".
- Hidden labels are named, not silently dropped.
