# Session: "A gray figure of the fold changes, and which genes went up the most" -- Dr. Chen, computational biologist

Participant: Dr. Chen, group leader in a translational institute (persona:
study/personas/bioinformatics-researcher.md). Laptop on a 27-inch monitor, Chrome.

Moderator's task, as given: "Make a black-and-white figure of the fold changes for a journal that
prints in gray, and tell me which genes went up the most."

Data on screen: the "Stress response study" project, ppi-core-300.graphml -- 300 proteins, 1,262
interactions, a node column log2FoldChange from -2.52 to 3.15, and a confidence column marked "not
used yet".

Screens, as a participant sees them (study view): screens/colour-by-value.html (the field picker and
the numbers popover), screens/styles-list.html (the Look menu), screens/export-dialog.html (ways in,
figure, figure in the Print look, written), screens/table-dock.html (ranked). The flow page
flows/export.html rendered blank in the study view, so the flow was followed on the dialog's own
states instead.

Renders: shots/r4-chen-grayfig2-screens_colour-by-value_html.png,
shots/r4-chen-grayfig2-screens_colour-by-value_html_numbers.png,
shots/r4-chen-grayfig2-screens_styles-list_html_looks.png,
shots/r4-chen-grayfig2-screens_export-dialog_html_ways-in.png,
shots/r4-chen-grayfig2-screens_export-dialog_html_figure.png,
shots/r4-chen-grayfig2-screens_export-dialog_html_figure-grey.png,
shots/r4-chen-grayfig2-screens_export-dialog_html_done.png,
shots/r4-chen-grayfig2-screens_table-dock_html_ranked.png,
shots/r4-chen-grayfig2-flows_export_html.png (blank).

## Transcript (thinking aloud)

### 1. Fold change onto the nodes

"300 nodes, 1,262 edges, three components. That matches the file. Style stack on the right, Style
layer 1 open on the left. Fill, the four-dot button -- 'Color: apply a color or a value'. Under 'From
the data': log2FoldChange, numbers, -2.52 to 3.15. Good, it read it as a number, not text. Under a
minute. That's my bar and it cleared it."

"The popover: linear, 'Palette -- diverging', Red to blue, midpoint 0, and a histogram of the domain.
It says the palest colour sits at 0 and 0 is not missing. 148 below, 152 above, 0 with no value. I
like that it counts. Red for down, blue for up -- fine, red-blue is colour-blind safe. But it is not
gray safe: both ends go dark in gray and the middle goes white. A gray printer will print a
-2.5 and a +3 as the same dark blob. So this is the screen, not the figure."

### 2. Looking for 'gray'

"Where would a print setting be... Style stack, 'Look: Screen'. Open it. Screen, Print, High
contrast. Print: 'Reads in gray on white paper and for colour-blind readers. Where a colour shows a
direction, a shape shows it too.' That is literally what I'm asking for. 'Colours you set by hand
are kept' -- OK, I didn't set any by hand."

"I'd rather not flip the whole project, though. I just want the file. Let me see if the export does
it."

### 3. Export

"No Export button top right, which is where I looked first. It's in the Data panel header, and under
the project name, Ctrl+Shift+E. Fine, I found it in two seconds on the Data panel."

"Figure (.svg), 'Vector, with real text'. Good -- that's the Illustrator question answered before I
asked it. 174 mm, two columns, white, 8 pt. Legend beside, right. Labels: 'Top N by this layer's
value', N 10, by |log2 fold change|."

"The preview is at print size, and the legend is generated: 'log2 fold change, Red: down. Blue: up.
White: 0.' Then the footer: degree is exact, not normalized, on the full graph; 'Weight: confidence
not used yet; no measure here reads a weight.' Honest. I'd have asked. And a methods .txt next to it
with the data file, date, scope, palette, label rule, and 'Drawn with graphty-element 2.6.2'. That's
most of my figure legend written for me. I'd still want the STRING version and the cut-off in there,
but it can only say what the file told it."

"And there's the warning under the preview: 'Values just above and below 0 print as the same gray.'
With 'Use Print look' next to it. It found my problem before I did. Click it."

### 4. The Print look

"Now two previews: the file, and 'Printed in gray, the same file'. That's what I want to see, and I
have never had a tool show it to me -- I usually print a test page on the office laser."

"Shape is the sign: triangle up for up, triangle down for down, a circle for no change. Darkness is
the size of the change. In the gray one I can still tell the directions apart. The check under it:
'Increases and decreases stay apart in gray (120 below 0, 133 above; 47 within 0.25 of 0 drawn as no
change).'"

"Wait. 47 within 0.25 of 0, drawn as 'no change'. Who picked 0.25? I didn't. On the screen legend it
was 148 below and 152 above, no middle class. Now 47 genes are empty circles with a legend entry that
says 'no change'. In my field 'no change' is a statistical statement. A reviewer reads that circle as
'not differentially expressed', and I have nothing in this file -- no adjusted p-value -- that says
so. If I use a band it's |log2FC| > 1 and adj.P < 0.05, and I choose it. I looked on the dialog for
where the 0.25 is set. It isn't anywhere I can see. It's in the legend and in the methods file, so at
least it's stated, but I'd have to change the word in Illustrator or find a setting that I can't
find."

"The darkness: three steps up, three steps down. Where are the breaks? The legend says '+0.25 to
+3.15' and shows three triangles. Is the middle one 1 to 2? Equal thirds? Quantiles? I can't write
that in a caption. Put the numbers under the swatches."

"Zooming in on the gray preview: the degree 0-1 nodes are tiny. At that size an up triangle and a
down triangle are the same speck. Most of my genes are small nodes. For those, the sign is lost again,
just in a different way. In print I'd set the size to constant for the figure, and I don't see a
switch for that here -- I'd have to go back and remove the size layer. That's fine, it's two clicks,
but the dialog should warn me the way it warned me about gray."

"Also -- the file is still in colour. Red and blue triangles. The gray one is a simulation. For most
journals that's actually right: colour online, gray in print, one file. But the moderator said
black-and-white. If the production office wants a grayscale file, this doesn't give me one; I'd
convert in Illustrator. I'll take it, I'd rather have colour online anyway."

### 5. Which genes went up the most

"The labels are the 10 largest changes by absolute value. That's both directions. MAPK10, MAPK2,
RPS6 point down. So the labels don't answer the question, and the labels carry no values, so I'd
have to read the darkness of a triangle to guess."

"The hidden-label list shows values: MRE11 +2.35, RPL17 -2.25. Useful."

"The table dock under the canvas: 'Full graph: 300 nodes. Sorted by |log2FoldChange|.' CHEK1 3.15,
WRN 2.61, SNRNP70 2.58, RPS6 -2.52, MAPK10 -2.42. Absolute again, it just followed the label rule.
I need signed, descending. From the ranked table screen, the header chevron has Sort descending, so
I'd click that on log2FoldChange."

"So, up the most, by log2 fold change: CHEK1 (+3.15), WRN (+2.61), SNRNP70 (+2.58), then MRE11
(+2.35) from the hidden-label list. I can't see the fifth from what's shown; after sorting I'd
expect it right there. CHEK1, WRN, MRE11 -- DNA damage response going up under stress. That's a
sensible biological story, which also makes me suspicious enough to want the adjusted p-values
beside them. There's no adj.P.Val column in this project, so 'went up the most' here is fold change
only. I'd say that out loud in the paper."

"And I would want the figure labelled 'top 10 increases', not 'top 10 by absolute'. The label rule
says 'Also: Above a threshold', which is not the same thing. A 'largest increases' option would have
answered the question on the figure itself."

### 6. Written

"Export 2 files. The toast names both files and says Print look. The Data panel's 'Sent and saved'
shows the svg and its methods file, today, to Downloads, and the canvas is still on Screen. Good --
exporting didn't restyle my project behind my back. 'Nothing is uploaded.' Also good."

## Answers

**The figure:** stress-response-study_figure.svg, 174 mm, Print look -- sign by triangle direction,
size of change by darkness, legend and methods file generated.

**Went up the most (log2FoldChange, no significance filter):** CHEK1 +3.15, WRN +2.61, SNRNP70 +2.58,
MRE11 +2.35.

**Single Ease Question: 5 of 7.** Getting a gray-safe vector figure was easy, and the tool warned me
before I made the mistake. Answering the question was harder than it should be: every list and label
defaulted to absolute change, and a 'no change' class appeared with a threshold I never chose and
couldn't find.

**Would I use this instead of my current tool?** For this figure, yes, over Cytoscape. The gray
preview, the real-text SVG and the methods file replace an afternoon of legend-building and a test
print. Instead of R, no: the ranking I would do in R with the p-values, and I still don't know if I
can regenerate this figure from a script. If it can, it goes into the pipeline. If it can't, it's my
figure tool, which is still more than most things get.

## Problems, in her words

1. "47 genes drawn as 'no change' within 0.25 of 0. I never set 0.25 and I can't find where to.
   'No change' is a claim I can't back without p-values." -- export dialog, Print look. Severity 3.
2. "Labels, table order and 'largest changes' are all by absolute value. I asked what went up."
   -- export labels and table dock. Severity 3.
3. "Three darkness steps and no numbers under them. I can't caption that." -- Print look legend.
   Severity 2.
4. "The smallest nodes are specks in print; a triangle's direction is invisible at that size."
   -- gray preview. Severity 2.
5. "The file is still colour; the gray one is a preview. Fine for me, but not a black-and-white
   file if that's what a journal asks for." -- export, Print look. Severity 1.
6. "Labels carry no values; I have to read a gray level to guess the size." -- figure preview.
   Severity 1.
7. "No STRING version or cut-off in the methods file." -- methods text. Severity 1.
8. "The export flow page is blank." -- flows/export.html in the study view. Severity 1 (study
   material, not the product).
