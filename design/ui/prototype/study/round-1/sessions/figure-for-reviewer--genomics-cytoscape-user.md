# Session: a figure a reviewer can read in grey -- Maren (genomics postdoc, Cytoscape user)

Participant: Maren, cancer-genomics postdoc who makes network figures in Cytoscape two or three times a month.
Screens used: the styles list mock and the export dialog mock, 1440 by 900.
Moderator's task, word for word: "Make the picture show which genes changed most, so a reviewer can read it, even printed in grey."

## Think-aloud transcript

**Starting point (styles list, freshly loaded network, everything gray).**

"OK. It's a network, 300 nodes, all gray. Fine, that's the usual starting point. First thing I want is colour by fold change. On the right there's Attributes -- module, log2FoldChange -2.52 to 3.15, degree, betweenness. Good, the fold change column is actually there. That's already better than half my Cytoscape imports where the mapping list only shows Name and Selected."

"Where's padj, though? 'Changed most' to me means big fold change AND significant. I only see log2FoldChange. I guess somebody filtered already. I'd want to know."

"Left side: Graphs, Sets and paths, Styles. Styles is the style panel, I assume. It says 'Base style' and then 'No style layers yet. Add one with +, or with Color by or Size by on any attribute.' What's a layer? I just want a style. And where is 'Color by'? I don't see a button called Color by anywhere. Maybe if I right-click log2FoldChange on the right? There's nothing on that row that looks clickable. I'll use the plus."

**Clicks + next to Styles.** (Per the prototype: adds an empty layer on top with its editor open, like the Degree size editor.)

"A box pops up. 'Applies to: All proteins'. Then Size, Fill, Label, each with a plus. OK, Fill is colour, I think. Plus next to Fill."

**Clicks + next to Fill, picks log2FoldChange.** (Assumed from the qPCR frame: Color becomes a pill with the attribute name and a small sliders button next to it.)

"Now the legend line says something like 'minus 2.4 to 3, 0 in the middle' with a blue-white-red bar. Oh -- it's centred on zero. That is actually the thing I fight with in Cytoscape every time. Blue down, red up, not red-green, so my PI can read it. Good."

"Wait. The qPCR one said -2.41 to 2.98 and the attribute panel says -2.52 to 3.15. Which numbers is the colour using? If that's clipping something I want to know which genes got clipped. Probably it's just a different file... I can't tell from this screen."

"'no value: 216 proteins'. OK, that's a count, I like a count. But those 216 stay gray. In grey print, gray unmatched nodes and white 'no change' nodes are going to look the same as the middle of the scale. A reviewer can't tell 'not measured' from 'didn't change'."

"Now the grey part. Blue and red. If I print this in black and white, dark blue and dark red are both just dark grey. So the most up and the most down genes look identical. That's fine if the reviewer only needs 'which changed most' but not which direction... no, they'll want direction, that's the whole biology. Is there a grey version? A preview? I'm looking for a palette choice. The only thing near the colour is this little sliders icon."

**Clicks the sliders icon beside Color.** (In the betweenness frame, this opened a side panel: Scale, Palette 'Orange to brown', a histogram, marked 'read only'. For her own layer it is presumably editable, but no frame shows the palette choices.)

"Scale, palette, a histogram of the values -- the histogram is nice, I can see if one outlier squashes everything. Palette is a dropdown. I don't know what's in it. Nothing says 'grayscale' or 'print safe' or 'colour-blind safe'. I'd have to try each one and then print a page to check. That's what I do in Cytoscape anyway, honestly."

"Maybe I make size show it instead, since size survives grey printing. Plus next to Size, log2FoldChange... no, then the down-regulated genes, the negative ones, come out tiniest. That's backwards for 'changed most'. I'd need the absolute value and I don't see anything for that. In R I'd just make an abs column. Here I'd have to go back to R, add a column, and re-import. OK."

"Labels. The labels on the picture are the hubs, 'Names on degree 17 to 34'. I don't want hub names, I want the names of the genes that changed most. There's a Label plus in my layer editor. I'd guess I add Label there... but then it labels all 300 and it's the hairball. I'd want only the top ten or twenty. There are 'Sets' on the left -- 'Down in stress, rule, 148', 'Up in stress, 152'. Maybe I'd make a set of the top ones and label that. I don't know how, and 148 is way too many to label."

**Opens the export dialog (Export... top right).**

"Export dialog. 'Scope: Full graph, 300 nodes.' Current view is ticked, '2x PNG'. The preview on the right shows the picture with the legend drawn inside it -- 'Module', counts per module, 'Degree, node size'. Oh, the legend comes out WITH the figure. Good. That's the Legend Creator step I don't have to do."

"Background: Transparent. For print that's a checkerboard nobody wants; I'll switch it to White. It says 'Also: White, Light canvas'. OK."

"Format: PNG. I click the dropdown. It's only PNG. The journal wants a PDF or at least a 300 dpi TIFF, and the figure person wants vector so they can move labels in Illustrator. '2x' -- 2x of what? What dpi is that? It says 3,055 by 1,644 pixels. I'd have to do the maths for a 7-inch column. I'd rather it just said 300 dpi."

"Methods text as a second file -- 'Color: module, 8 modules ... Okabe-Ito palette; unassigned in gray.' I'd rewrite it, but it's nice that it writes down what I did. Okabe-Ito, I think that's the colour-blind one. Would it write the fold-change mapping and midpoint the same way? It should."

"'3 files go to your Downloads folder. Nothing is uploaded.' Good. That's the first thing my PI would ask."

"And still nothing that shows me what this looks like in grey. I'd export, print it on the lab printer, and look."

**End of task.** Maren would click Export with background White, legend on, a blue-white-red fold-change colour and degree size, having not solved the grey-print question.

## Single Ease Question

3 out of 7. "The colour part was easy -- centred on zero without me fighting it, that's new. The 'in grey' part I couldn't do at all, and I can't get a PDF out."

## Would she use this instead of Cytoscape?

"For looking at my network, maybe. Colour by fold change centred on zero, the counts, the legend in the export -- those are the three things I swear at Cytoscape about. But the paper figure? It's PNG only, I can't check it in grey, and the labels are the hubs, not my genes. And how do I cite it? I'd still make Figure 3 in Cytoscape, because that's what the lab protocol says and reviewers know what it looks like."
