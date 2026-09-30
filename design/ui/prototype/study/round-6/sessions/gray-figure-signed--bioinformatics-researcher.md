# Session: "A gray figure of the fold changes, and which genes went up the most" -- Dr. Chen, computational biologist

Participant: Dr. Chen, group leader in a translational research institute (persona:
study/personas/bioinformatics-researcher.md). Laptop docked to a 27-inch monitor, Chrome. Friday
afternoon, her usual twenty minutes.

Moderator's task, as given: "Make a black-and-white figure of the fold changes for a journal that
prints in gray, and tell me which genes went up the most."

Data on screen: the "Stress response study" project, ppi-core-300.graphml -- 300 proteins, 1,262
interactions, a node column log2FoldChange from -2.52 to 3.15, and a confidence column marked "not
used yet".

Screens, as a participant sees them (study view): screens/colour-by-value.html (field picker,
numbers popover), screens/styles-list.html (the Look menu), screens/export-dialog.html (ways in,
figure, figure in the Print look, written), screens/table-dock.html (ranked, column menu),
screens/inspector.html (one node).

Renders (all study view, taken for this session):
shots/record/r6-chen-grayfig-colour-by-value.png,
shots/record/r6-chen-grayfig-colour-by-value-numbers.png,
shots/record/r6-chen-grayfig-styles-list-looks.png,
shots/record/r6-chen-grayfig-export-dialog-ways-in.png,
shots/record/r6-chen-grayfig-export-dialog-figure.png,
shots/record/r6-chen-grayfig-export-dialog-figure-grey.png,
shots/record/r6-chen-grayfig-export-dialog-done.png,
shots/record/r6-chen-grayfig-table-dock-ranked.png,
shots/record/r6-chen-grayfig-table-dock-header.png,
shots/record/r6-chen-grayfig-inspector-one-node.png.

## Transcript (thinking aloud)

### 1. Fold change onto the nodes

"300 nodes, 1,262 edges, 3 components. Same as the file. Good, I'll stop worrying about that."

"Style layer 1, Fill, the dotted button. 'Color: apply a color or a value.' From the data:
log2FoldChange, numbers, -2.52 to 3.15. It read it as a number. Under a minute, which is my bar."

"Popover: linear, diverging, Red to blue, midpoint 0, a histogram over the ramp. 'The palest color
sits at 0.' 148 below 0, 152 above, 0 with no value. Red is down, blue is up -- the opposite of what
half my colleagues use, but it tells me, and there's Reverse. Fine for the screen. It is not a gray
figure: dark red and dark blue come out the same gray. I know that, I've been burned by it."

### 2. Is there a print setting?

"The style stack has 'Look: Screen'. Open it. 'Look for the whole project': Screen, Print, High
contrast. Print -- 'Reads in gray on white paper and for color-blind readers. Where a color shows a
direction, a shape shows it too.' That's what I'm after. But 'for the whole project' -- I don't want
my working view restyled. I'll see whether the export can do it for just the file."

(The Look menu render shows a different state of the project -- betweenness colouring, a path
highlighted. She notices, shrugs: "someone else's session, presumably. Same menu.")

### 3. Export

"Export button in the Data panel header. I'd have looked top right first, but it's labelled, I found
it."

"Figure (.svg) -- 'Vector, with real text.' Good, that's the Illustrator question answered. 174 mm,
two columns, white, text 8 pt, shown at 100% of print size. Legend beside, right. Labels 'Top N by
this layer's value', N 10, 'by |log2 fold change|'."

"Look, 'for this file only': Screen, Print, High contrast. There it is -- the file gets its own look,
the canvas doesn't change. That was my worry in step 2 and it's answered here."

"Under the preview, a yellow warning: 'Values just above and below 0 print as the same gray.' With
'Use Print look' next to it. It caught the problem before I sent anything to a journal. I click it."

### 4. The Print look

"Two previews now: the file as written, and 'Printed in gray, the same file'. I've never had a tool
show me that. Normally I print a test page on the office laser and squint."

"Line under the Look: 'sign as a triangle, size of the change as 4 gray steps a side. No two of its 8
categories print as the same gray.'"

"Let me read the legend closely, because this is what goes past a reviewer." [zooms the gray
preview]

"'Shape is the sign; darker is a larger change.' Then a real table: |change| 2.4 to 3.2, down 2, up
3; 1.6 to 2.4, 13 and 22; 0.8 to 1.6, 48 and 55; 0 to 0.8, 85 and 72; total 148 and 152. OK. Equal
steps of 0.8, the same on both sides, and the breaks are printed. I can put that in a caption. The
totals match the screen legend -- 148 and 152 -- so nothing has been quietly thrown into a 'no
change' bin. That matters to me: 'no change' is a statistical claim and this file has no adjusted
p-values to support it. Whoever took that out, thank you."

"The check below: 'Increases and decreases stay apart in gray (148 below 0, 152 above): the triangle
carries the sign.' And the swatches under it with the value each gray stands for. Good."

"Nitpicks, because Reviewer 2 will make them:
- '0 to 0.8' then '0.8 to 1.6' -- which bin is exactly 0.8 in? Write it as [0, 0.8) or '0.8 or
  more'. It's in the methods file the same way.
- The top step is '2.4 to 3.2' but my maximum is 3.15. Fine, the step width is fixed, but the
  caption should say 'up to 3.15' somewhere or someone asks where the 3.2 gene is.
- The Degree size key is drawn as circles, and every node in the figure is a triangle. Small thing,
  but a legend should show the mark that's actually on the page.
- The degree 0-1 nodes are specks. At that size an up triangle and a down triangle are the same dot.
  The check says the sign survives; for the biggest nodes it does. For the tiny ones I can't see it.
  Most of my network is low-degree. For the figure I'd probably set size to constant, and I'd have to
  go back to the style stack to do that -- the dialog doesn't mention it."

"Also -- the file is still in colour. Red and blue triangles; the gray one is a simulation of the
printer. For most journals that's what I want: colour online, gray in print, one file. But the
moderator said black-and-white. If production asks for a grayscale file, this doesn't make one. I'd
convert in Illustrator, which is two clicks and I trust it. I'll accept that; I'd be annoyed only if
the conversion lost the shape, and it can't, the shape is in the file."

"The methods .txt beside it: data file, date, scope, 'Print look: shape is the sign (a triangle up
above 0, down below 0); darkness is the distance from 0 in 4 gray steps, the same steps for both
sides: 0 to 0.8, 0.8 to 1.6, 1.6 to 2.4, 2.4 to 3.2.' Degree exact, not normalized. Weight: confidence
not used. 'Drawn with graphty-element 2.6.2.' That's most of a figure legend. It still can't give me
the STRING version or the cut-off, but it can only say what the file told it."

### 5. Which genes went up the most

"The labels are the ten largest by |log2FC| -- both directions. MAPK10 and RPS6 point down. So the
figure doesn't answer the question; it answers 'what changed the most'. The label rule offers
'Also: Above a threshold', but the N field says 'by |log2 fold change|', so I'd guess the threshold
is on the absolute value too. There's no 'largest increases' choice. I want the figure to be able to
say 'top 10 up'."

"The legend helps more than the labels, honestly: the top step, 2.4 to 3.2, has 3 up. So there are
exactly three genes above 2.4. The dark triangles pointing up and labelled are CHEK1, WRN and
SNRNP70. That's three. Good, the counts and the picture agree."

"'2 labels hidden to avoid overlap: show list' -- MRE11 +2.35, RPL17 -2.25. So MRE11 is up, at 2.35."

"Now the table under the canvas: 'Full graph: 300 nodes. Sorted by |log2FoldChange|.' CHEK1 3.15,
WRN 2.61, SNRNP70 2.58, RPS6 -2.52, MAPK10 -2.42. Absolute again -- it followed the label rule. I
want signed, descending. The column menu I can see on the other table screen has 'Sort descending'
with a check, so I'd open the chevron on log2FoldChange and pick that. I'm assuming 'descending' on
the column means the signed value and not the absolute one the table was already using. That's an
assumption I would check by looking for a negative number at the top of the ascending sort."

"The ranked table and the inspector I was shown are a different project -- 'Human protein
interactions', graph called 'Interactions', no fold change column in the ranked table. The inspector
does show log2FoldChange for TP53, -0.84, 'from ppi-core-300.graphml', which is the provenance line I
like. But I couldn't watch my own column get sorted."

"So, from what I can actually see: up the most, by log2 fold change, CHEK1 (+3.15), WRN (+2.61),
SNRNP70 (+2.58), then MRE11 (+2.35). E2F1, NDUFS5 and MAPK2 are also in the top ten by size, and at
this preview size I cannot tell which way their triangles point, so one of them could sit between
SNRNP70 and MRE11. I'd sort the table before I told anyone number four."

"CHEK1, WRN, MRE11 -- checkpoint and DNA repair up under stress. That's a nice story, which is
exactly why I want adj.P.Val next to it. There's no p-value column in this project, so 'went up the
most' here means fold change only, and I'd say so."

### 6. Written

"Export 2 files. The toast: 'Exported stress-response-study_figure.svg and its methods file, in the
Print look.' Data panel, Sent and saved: the svg, 'and its methods file, Print look, Today 19:12, to
Downloads'. The canvas is still on Screen, red-blue circles. Exporting didn't restyle my project.
'Nothing is uploaded.' Good."

## Answers

**The figure:** stress-response-study_figure.svg, 174 mm, vector with real text, Print look -- sign
by triangle direction, size of change by four equal gray steps of 0.8 per side, legend with breaks
and counts, methods file beside it. The file itself is colour plus shape; its gray print is checked,
not written.

**Went up the most (log2FoldChange, no significance filter):** CHEK1 +3.15, WRN +2.61, SNRNP70
+2.58 -- the only three above 2.4, which the legend's count confirms -- then MRE11 +2.35 as far as I
could see; the fourth place needs a signed sort to be sure.

**Single Ease Question: 5 of 7.** The gray figure is now close to easy -- 6 on its own. The tool
warned me, the Print look is for the file only, and the legend prints its breaks and counts with no
invented "no change" class; I could write the caption from it. The second half of the task is still
roundabout: every label and the table defaulted to absolute change, there's no "largest increases"
label rule, and I had to piece the answer together from the legend count, the hidden-label list and
a sort I could only assume.

**Would I use this instead of my current tool?** For this figure, yes, over Cytoscape plus
Illustrator guesswork -- the side-by-side gray preview and the generated methods text save me a
test print and half a caption. Not instead of R for the question itself: "which genes went up" is a
sorted, signed data frame with p-values, and here it isn't one click. If the label rule had "top N
increases" and the table sorted signed by default on a signed column, I'd move to a 6.

## Observations for the studio (her words, condensed)

1. Labels and the table default to |log2FC| and offer no signed choice; "which went up the most"
   cannot be answered on the figure. Wants "Top N increases / decreases" beside "Top N by size".
2. Bin boundaries "0 to 0.8, 0.8 to 1.6" are ambiguous at the edges; top step "2.4 to 3.2"
   overshoots the data maximum 3.15 without saying so.
3. The Degree size key draws circles while the figure draws triangles.
4. The smallest nodes (degree 0-1) are too small for the triangle to show its direction; the gray
   check passes anyway. Wants the check (or a hint) to cover mark size, or an offer to set size
   constant for the file.
5. "Black-and-white" was asked; the file stays colour and only its gray print is simulated.
   Acceptable to her, but a reader who needs a grayscale file has no option in the dialog.
6. The ranked table and inspector screens show a different project, so she could not watch her own
   column sort; she had to assume "Sort descending" sorts the signed value.
