# Session: a figure a reviewer can read in gray -- Maren (genomics postdoc, Cytoscape user)

Participant: Maren, cancer genomics postdoc, uses Cytoscape a few times a month from the STRING protocol. Played on a 14-inch laptop (1440 x 900).

Moderator's task, as given: "A reviewer wants a figure of this network they can read even when printed in gray. Get it to them."

Screens seen, in order (renders in `shots/`):

1. `shots/tasks/figure-for-reviewer/01-styles-list.png` -- the project as it opens, colored by betweenness
2. `shots/tasks/figure-for-reviewer/02-colour-by-value.png` -- a new style, choosing what to color by
3. `shots/r4-maren-grayfig-cbv-numbers.png` -- colored by log2FoldChange
4. `shots/r4-emma-grayfig-screens_export-dialog_html_ways-in-menu.png` -- the menu under the project name
5. `shots/tasks/figure-for-reviewer/03-export-dialog-figure.png` -- the Export dialog, Screen look
6. `shots/tasks/figure-for-reviewer/04-export-dialog-figure-grey.png` -- after Use Print look
7. `tmp/maren-grayfig/grey-left.png`, `tmp/maren-grayfig/grey-right.png` -- the two previews, zoomed in to read them
8. `shots/r4-maren-grayfig-done.png` -- after Export
9. `shots/r4-maren-grayfig-styles-looks.png` -- the Look menu in the style stack, found afterwards

## Think-aloud

**Screen 1, the project as it opens.**

"OK, so this is the stress network. Three hundred proteins, 1,262 edges, three components -- fine, that's numbers, I like that. But why is everything orange and brown? 'Betweenness color, written by the run.' I didn't ask for betweenness. I don't even really know what betweenness is. The reviewer wants the fold change, not this. Orange to brown in gray is just... light to dark, which I suppose would print, but it's the wrong thing.

The legend at the bottom left says betweenness 0 to 0.138, log scale. Log scale on betweenness? I'd have to explain that to a reviewer. No. I want this colored by log2 fold change, red and blue, like always.

In Cytoscape I'd go to the Style tab, Fill Color, pick the column, continuous mapping. Here... there's 'Style stack' on the right with a plus. I'll try the plus."

**Screen 2, a new style layer.**

"'Style layer 1', applies to all nodes. Fill, Color, 808080 -- that's a gray hex. I click the little icon next to it and I get 'apply a color or a value'. Oh -- 'From the data: log2FoldChange, numbers, -2.52 to 3.15.' Good. My column is there, and it tells me the range, so I know it actually got attached. That's the thing that burns me in Cytoscape: you open the mapping list and it's just Name and Selected. Here it's right there with numbers. Degree and betweenness are under 'Computed', closeness 'not computed, a few seconds'. Fine, I'll ignore those. log2FoldChange."

**Screen 3, colored by fold change.**

"Linear, diverging, midpoint 0 -- I can see the midpoint, it's a box that says 0. Good. The histogram under the gradient, that's nice, I can see it's roughly centred and nothing's at 9 washing everything out. 148 below 0, 152 above, no value 0. OK, all 300 painted.

Wait. 'Below 0 is red, above is blue.' That's backwards. Up is red, down is blue. Every heatmap in every paper, pheatmap, everything. If I send a reviewer a figure where red means down, the first thing they'll do is misread it. There's a 'Reverse' there, fine, I'd click that. But why is the default the opposite of what the whole field does? For the gray version it probably doesn't matter, but I'd be annoyed if I didn't catch it.

Red and blue, not red and green, at least. My PI will be happy about that.

Now I need to get it out. Where's Export? There's no File menu. There's the three-lines thing top left... I'd try that first, honestly, it looks like a File menu. [Moderator did not help.] I'll try clicking the project name, 'Stress response study' with the little arrow."

**Screen 4, the project-name menu.**

"Rename, Duplicate, Project info, Update with new data, Version history, Export, Close project. OK, Export, Ctrl+Shift+E. It's there. I wouldn't have looked under the name first -- I'd have tried the three lines -- but it's not hidden."

**Screen 5, the Export dialog, Screen look.**

"Right, this is a big dialog. Left side, a list: Figure (.svg), Image (.png), Table, Findings report, Graph file. Figure is ticked. 'Vector, with real text. For a paper or slides.' Good -- real text, so I can fix a label in Illustrator. 174 mm, two columns. Also 85 mm one column. Somebody here has actually submitted a paper. White background. Legend beside, right.

And the preview has a legend in it. log2 fold change, the bar, -2.52, 0, +3.15, degree sizes. The legend is IN the file. That's the thing I spent a whole afternoon on with Legend Creator last year. OK. That's good.

And there's the methods text on the right. 'Color: log2FoldChange, linear, diverging at 0, -2.52 to +3.15; 148 below 0, 152 above.' 'Labels: top 10 by |log2FoldChange|; 8 drawn, 2 hidden to avoid overlap (MRE11, RPL17).' It even names the two it dropped. I'd rewrite this for the methods myself, I always do, but I can copy the numbers from it instead of hunting for them.

Then under the preview: yellow thing, 'Values just above and below 0 print as the same gray.' Huh. Yes. That's exactly the problem -- pale pink and pale blue both go to light gray. I didn't even think about that; I'd have printed it and found out. There's a button, 'Use Print look'. Obviously I click that."

**Screen 6, after Use Print look.**

"Oh, now it shows me two pictures. 'The file, as written' and 'Printed in gray, the same file.' That's actually what I wanted to know -- what the reviewer will see. Up is a triangle pointing up, down is a triangle pointing down, no change is a circle. Darker is bigger change. OK, I get it without reading anything. And the green tick: 'Increases and decreases stay apart in gray, 120 below, 133 above, 47 within 0.25 of 0 drawn as no change.'

Wait. Within 0.25? Who decided 0.25? I didn't set that. My cutoff is log2 fold change of 1 and padj under 0.05. A reviewer is going to look at a circle that says 'no change' and read that as 'not differentially expressed'. It's not. It's just 'the tool drew it as a circle'. And there's no padj anywhere in this -- the figure's calling things 'up' and 'down' purely on the sign. I don't see anywhere to change the 0.25 in this dialog. The top of the settings is View, Width, Background, Legend, Labels, N. Nothing about the no-change band. That's a number without a source in my figure legend, and reviewer 2 will ask."

**Zoomed in on the two previews.**

"Let me actually look at the gray one properly. The triangles -- at the bigger size I can tell up from down. At 174 mm wide on paper... the small ones are going to be tiny. In the dense cluster on the left, where they overlap, I honestly can't tell some of the up from the down. It's the hairball again, just in triangles.

Labels: MAPK10, MAPK2, E2F1, NDUFS5, SNRNP70, RPS6, WRN, CHEK1. RPS6 has a triangle sitting on the R. CHEK1's label runs into its own triangle. And the two it hid, MRE11 and RPL17, are in the top ten biggest changes. MRE11 is a DNA repair gene -- in a stress paper that might be one I actually want named. It says 'show list' and it lists them with their values, fine, but I don't see how to say 'keep this one, drop that one'. I'd end up adding it in Illustrator. Which is what I do now.

Shape legend: the triangles up and down are there, the circle for no change. But the degree size legend below is drawn as circles, and in the figure the nodes are triangles. A reviewer will work it out. Minor.

The bit under the legend: 'Degree: exact, not normalized, on the full graph. Weight: confidence not used yet; no measure here reads a weight. Look: Print. Gray-safe: sign is shape.' That's for me, not for the reviewer. 'Confidence not used yet' -- a reviewer reads that and asks why I didn't use the STRING confidence. I'd want that out of the picture and in the methods file only. I'd delete it in Illustrator. Again.

Size is degree. Fine, that's what I'd do anyway."

**Exporting.**

"Bottom: '2 files go to your Downloads folder. Nothing is uploaded.' Good -- this is unpublished data, I'm not putting it on anybody's server. Export 2 files. The SVG and the methods text.

SVG. Not PDF. The journal wants PDF or TIFF for figures. I'll open it in Illustrator and save as PDF, which I do anyway because I'm putting it in a panel with the volcano plot. But if the reviewer is 'get it to them' directly -- I'm not emailing a reviewer an .svg, half of them won't know what to do with it. I'd convert it."

**Screen 8, after Export.**

"Toast: 'Exported stress-response-study_figure.svg and its methods file, in the Print look.' And on the left, under 'Sent and saved', it's listed with the time. OK, so it keeps a record of what I sent out. Good for when reviewer 2 comes back in March.

But the network on screen is still red and blue circles. So the gray look was only in the export. That's fine, I suppose, but if I come back and export again, does it remember Print, or do I have to click the yellow button again?"

**Afterwards, the Look menu in the style stack (found looking for that answer).**

"There's a 'Look' dropdown up in the style stack too -- Screen, Print, High contrast. 'Print: reads in gray on white paper and for color-blind readers.' So there are two Looks, one for the screen and one in the Export dialog. I didn't need this one to do the job, but I don't know which one wins. I'd leave it alone."

## Where she got stuck or went wrong

- Started on a canvas colored by betweenness she did not ask for, and had to build a fold-change style herself before exporting (about two minutes).
- Expected Export under the three-line menu (her mental File menu), and went to the project name only by elimination.
- The default diverging palette is red for down, blue for up, the reverse of the field's convention; she caught it only because she read the popover's one line.
- The Print look's "no change within 0.25 of 0" band appeared in the figure with no control to set it and no link to her own significance cutoff.
- Two of the ten largest changes (MRE11, RPL17) were dropped from the labels; she could see which, but not keep one.
- The legend footer ("confidence not used yet", "Look: Print. Gray-safe...") is written into the figure itself, where a reviewer reads it.
- The only figure format is SVG; she needs PDF for the journal and for a reviewer.

## Single Ease Question

"Five. Getting the gray version was easy -- one yellow warning, one button, and it showed me what the printer would do, which Cytoscape never does. What knocks it down is everything I'd still fix: red-means-down, a 0.25 cutoff I didn't choose written into my figure, a missing label for a gene I care about, and text in the legend that's for me, not the reviewer."

SEQ: 5 / 7

## Would she use this instead of her current tool?

"For checking a figure in gray -- yes, honestly, I'd open it just for that side-by-side. Nothing I have does that. And the legend being in the file, with the numbers written down, that's the afternoon I lose every time.

For the actual Figure 3? No, not yet. My PI wants Cytoscape because reviewers know it and it has a paper to cite, and I still don't know how I'd cite this. The figure would still go through Illustrator because of the SVG and the labels. And the up/down split has to come from my padj, not from 'within 0.25 of 0' -- until I can make the circles mean 'not significant', I can't put this in front of reviewer 2. So: nice for exploring and for the gray check, and the paper figure stays in Cytoscape."
