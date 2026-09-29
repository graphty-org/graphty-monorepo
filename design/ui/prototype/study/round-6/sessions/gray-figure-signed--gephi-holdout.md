# Session: "A black-and-white figure of the fold changes, and which genes went up the most" -- Mara, Gephi holdout

Participant: Dr. Mara Lindqvist, associate professor of computational social science, Gephi user
since 0.8 (persona: study/personas/gephi-holdout.md). Laptop at 1440 by 900, Chrome, zoom 100
percent. Not her data and not her field: a biologist colleague's 300-protein network with a
fold-change column. She did this same task last round and remembers it.

Moderator's task, as given: "Make a black-and-white figure of the fold changes for a journal that
prints in gray, and tell me which genes went up the most."

Screens used, all in the study view: the Styles list (the project at rest and its Look menu), color
by value (choosing an attribute, then the numbers settings), the Export dialog with Figure (.svg) in
the Screen look and in the Print look, the Export dialog's table preview, the table dock (as drawn,
at rest, ranked, and its column-header menu), and the inspector on one node.

Renders she looked at: shots/r6-mara-graysig-sl.png, shots/r6-mara-graysig-sl-looks.png,
shots/r6-mara-graysig-cbv-choose.png, shots/r6-mara-graysig-cbv-numbers.png,
shots/r6-mara-graysig-exp-fig.png, shots/r6-mara-graysig-exp-grey.png,
shots/r6-mara-graysig-exp-table.png, shots/r6-mara-graysig-dock.png,
shots/r6-mara-graysig-dock-ranked.png, shots/r6-mara-graysig-dock-header.png,
shots/r6-mara-graysig-insp-one.png.

## Transcript (thinking aloud)

**Before touching anything.** "Same task as last time. Last time it stopped me printing pink and
blue as the same gray, then decided on its own that 47 genes hadn't changed, and I couldn't find
the gene list at all. So I'm checking three things: does it still invent a no-change band, do the
counts match between screens, and can I sort the column. In Gephi: Appearance, Ranking, a ramp,
Data Laboratory, click the header twice, Preview, Inkscape for the legend. Twenty minutes."

**The project at rest.** "Stress response study, ppi-core-300. 300 nodes, 1,262 edges, 3
components, density 0.0281. Same as last time, good -- if those moved between rounds I'd stop now.
The canvas is in orange-brown by betweenness with a TP53-to-SMAD3 path, and the stack has
Betweenness color, Hub labels, Size: degree, Base style. That's somebody else's state of the
project, not mine. I'll ignore it and start the color from a layer."

**Choosing the column.** "Style layer 1, Applies to All nodes, Fill, the four-dot button. 'Color:
apply a color or a value.' From the data: log2FoldChange, numbers, -2.52 to 3.15. module,
categories, 9. Then computed degree and betweenness, and closeness not computed, 'a few seconds'.
Numbers is Ranking, categories is Partition. I've made my peace with that. log2FoldChange."

**The numbers settings.** "log2FoldChange as color. Linear. Palette, diverging, Red to blue.
Midpoint 0. Histogram over the ramp, -2.52 to 3.15. No value: 0 nodes, not painted. 'The palest
color sits at 0. Below 0 is red, above is blue: use Reverse for the opposite.' Legend on the
canvas: below 0, 148; above 0, 152; no value or unstyled, 0. 148 plus 152 is 300. Adds up."

"And this time I look for the thing that bit me: there's Scale, Palette, Domain, Midpoint, No
value. Nothing called a band, nothing called 'no change within'. Good -- if there is no field,
there had better be no band. We'll see if Export agrees."

"The palette dropdown still doesn't show me what's in it. If there's a 'Grays' in there, a student
will pick it for a signed column and get minus two as white and plus three as black. I'd put a line
here: 'for a gray journal, use the Print look in Export'. Nothing here points there."

"My stack now reads: log2FoldChange color, Base style. Two layers. Remember that."

**The Look menu.** "On the Styles screen, Look, next to Style stack: Screen, Print, High contrast.
'Look for the whole project.' 'Print: reads in gray on white paper and for color-blind readers.
Where a color shows a direction, a shape shows it too.' I still don't want to touch a project-wide
switch to make one file. Gephi keeps Preview separate for a reason. I'll go to Export and see if it
has its own."

**Export, Screen look.** "Scope: Full graph, 300 nodes, 'the filter chip's scope, until you change
it here'. Figure (.svg), 'vector, with real text', 174 mm two columns, also 85 mm one column, 254 mm
a slide. White. Legend beside, right. Labels: Top N by this layer's value, N 10, by |log2 fold
change|. And here's the thing I wanted: 'Look, for this file only: Screen, Print, High contrast.'
So the file has its own look and the project one stays put. That answers last round's worry. I'd
still like the project menu to say 'Export has its own', but fine."

"Preview legend: log2 fold change, red down, blue up, white 0; 148 below 0, 152 above. Then Degree,
node size, number of interactions, five sizes. Wait. Again. My stack is log2FoldChange color and
Base style. There is no size layer. Where is 'Size: degree' coming from? The methods file says it
too: 'Size: degree (number of interactions), exact, not normalized, full graph.' Either the figure
is drawing the other state I saw on the Styles screen, or Export adds sizing I didn't ask for. I'd
go back and check the stack before I trusted a single node's size. In Gephi, what's in Overview is
what's in Preview. That was true in Gephi and it is not obviously true here."

"Yellow mark: 'Values just above and below 0 print as the same gray.' Button: Use Print look. Yes.
Click."

**Export, Print look.** "Look: Print. 'File is written with: Print look.' 'Print: sign as a
triangle, size of the change as 4 gray steps a side. No two of its 8 categories print as the same
gray.' Two previews at 76 percent: the file as written, in color with triangles, and the same file
printed in gray."

"Now the gray legend. Up triangle and down triangle, and a small table: |change| 2.4 to 3.2, down
2, up 3. 1.6 to 2.4, 13 and 22. 0.8 to 1.6, 48 and 55. 0 to 0.8, 85 and 72. Total 148 and 152.
Down column: 2 plus 13 plus 48 plus 85 is 148. Up: 3 plus 22 plus 55 plus 72 is 152. Same
148 and 152 as the color layer, the canvas legend and the Screen export. The check line says it:
'Increases and decreases stay apart in gray (148 below 0, 152 above).' No circles. No 47 genes
quietly declared unchanged. That was my biggest complaint and it's gone."

"And the break values are printed: 0 to 0.8, 0.8 to 1.6, 1.6 to 2.4, 2.4 to 3.2, the same for both
sides, and the methods file spells it out -- 'darkness is the distance from 0 in 4 gray steps, the
same steps for both sides'. A reviewer can't ask me where the shades break; it's in the legend.
Last time it was three shades with no numbers."

"A biologist would say a gene at +0.02 is 'no change' and here it gets a pale up-triangle. That's
honest -- it's the data -- but if my colleague wants a 1.5-fold cut-off, where does she set it?
Not on any screen I've seen now. I'd rather have no band than a band I didn't choose, so I'll take
this, but I'd want to know the band exists as her own setting somewhere before I tell a
bioinformatician this tool is finished."

"The file on disk is color with triangles, and gray is how it prints. For a journal that converts,
correct. For one that says 'submit grayscale files', I don't see a switch to write the gray version
itself. I'd have to do it in Inkscape. Small, but it's exactly the Inkscape step I wanted gone."

"Both previews are at 76 percent. For a gray journal I'd want the gray one at 100 and the color one
as the thumbnail, not both shrunk. Minor."

"Looking at the gray version itself. The dense clusters are a pile of triangles. In the zoom I can
tell up from down on the labeled ones, but in the middle of the Complex I cluster I can't tell which
way half of them point, they overlap. That's a layout problem as much as a style problem --
ForceAtlas2 with prevent overlap would fix it in Gephi. Here I don't know what the layout is."

**The methods file.** "stress-response-study_figure-methods.txt. Data, 300 proteins, 1,262
interactions, loaded 2026-09-22. Scope full graph. Color: log2FoldChange from the file, linear,
diverging at 0, -2.52 to +3.15, 148 below, 152 above. Print look: shape is the sign, darkness the
distance from 0 in 4 steps, 0 to 0.8, 0.8 to 1.6, 1.6 to 2.4, 2.4 to 3.2. Size degree. Labels top
10 by |log2FoldChange|, 8 drawn, 2 hidden, MRE11, RPL17. Drawn with graphty-element 2.6.2."

"Almost a methods paragraph. Still nothing about where the nodes are. Which layout, which
parameters, which seed. The recipe export mentions 'layout: force-directed, its settings and
seed', so the software knows. It just doesn't put it in the one file a reviewer reads. In my field
'spatialized with ForceAtlas2, LinLog, scaling 2, gravity 1' is the first sentence. This is still a
hole, and it's the easiest one to fill."

**Which genes went up the most.** "Now the half that should be a sort. Table dock. Les Miserables:
label, group, degree, betweenness. The protein one: id, module, community, degree, betweenness,
pagerank. No log2FoldChange column in either. The header menu has Sort descending, Sort
ascending, Filter to, Compare with, Color by, Size, New column, Join. So if the column were there,
I'd click the header, Sort descending, done -- that's the Data Laboratory move and it looks right.
But I'm not shown the column on this project, so I can't say I did it."

"The inspector on one node does show it: TP53, log2FoldChange -0.84, 'from ppi-core-300.graphml'.
That's the value with its source, which I like. But one node at a time is not a ranking."

"So I read the figure, more carefully than last time because now I know the steps. The darkest step
up, 2.4 to 3.2, has 3 genes. The top 10 labels are by absolute change, and the darkest step has 2
down plus 3 up, 5 genes -- so all five must be among the labeled ten. Labeled with dark up
triangles: CHEK1, WRN and SNRNP70. Three. That matches the 3 in the legend. The next step, 1.6 to
2.4, has 22 up, and the hidden-label list gives me one of them with a number: MRE11, +2.35."

"On the down side I see MAPK10, MAPK2 and RPS6 all as dark down triangles, and the legend says only
2 are in the darkest step. At this size the two darkest grays look the same to me. So I can't tell
you which down gene is in which step -- but you didn't ask about down."

"My answer: CHEK1, WRN and SNRNP70 went up the most, all between 2.4 and 3.2 on the log2 scale; the
maximum is 3.15, and I'd guess that's CHEK1 because it's the darkest and biggest-looking, but I'm
reading gray. MRE11 is next that I can name, at +2.35. I'd tell you the three names. I would not
write down their order or their values until I'd sorted the column."

## Single Ease Question

**5 out of 7.** "The figure part is a 6 now. It picked a diverging ramp on its own, it caught the
gray collision and fixed it with a shape, the counts are the same 148 and 152 on every screen, the
gray steps are printed with their break values, nobody decided that 47 genes didn't change, and
the legend and a methods file come with the SVG. That's better than anything I do in Gephi plus
Inkscape. It loses a point because a Size by degree turned up in my figure that wasn't in my stack,
and because the methods file still won't say what layout put the nodes where they are. And the
second half -- which genes went up most -- I answered by deduction from a legend table and three
labels, not by sorting a column. I got the right three names, I think, but I'd not sign it."

## Would she use it instead of her current tool?

"Instead of Gephi, no. My projects are .gephi files, my coauthors send .gephi files, my course is
Gephi screenshots, and I still can't cite the layout. Instead of Gephi's Preview plus Inkscape for
a figure like this -- a signed value that has to survive a gray printer -- yes, I'd do this here
now. It's the first time the legend I'd draw by hand came out of the software correct. Before I
put a student on it for a thesis figure I want three things: the layout and its seed in the methods
file, the export drawing only what's in my stack, and the table showing the column I just colored
by, sorted, one click."

## Problems observed

1. The exported figure and its methods file size nodes by degree and carry a Degree legend,
   although the stack she built held only the log2FoldChange color layer and Base style; she could
   not tell whether Export drew another state of the project or added sizing on its own, and would
   check the stack before trusting any node size. Seen for the second round running. Severity 3.
2. "Which genes went up the most" still has no direct answer on the screens: the table dock is
   never drawn on this project with a log2FoldChange column, the inspector gives one node at a
   time, and the figure's labels rank by absolute change without values. She named the right top
   three (CHEK1, WRN, SNRNP70) only by cross-reading the gray legend's counts with the labels, and
   would not state order or values. Severity 3.
3. The figure's methods file names data, scope, color, the gray steps, size, labels and version but
   not the layout (method, parameters, seed), though the Recipe export shows the software holds
   them; for her field that is the first sentence of a methods section. Seen for the second round
   running. Severity 3.
4. At 76 percent the two darkest gray steps are hard to tell apart on small triangles: she saw
   three down genes as darkest where the legend says two. Severity 2.
5. There is no way to write the gray version as the file itself, for journals that require
   grayscale submissions; the file is always the colored one with triangles. Severity 2.
6. With no band around 0, a gene at +0.02 prints as a pale up triangle. She prefers that to a band
   she did not choose, but saw no place on these screens where an analyst could set a fold-change
   cut-off of her own if the lab wants one. Severity 1.
7. The palette dropdown's contents are not drawn and nothing in the color settings points to the
   Export dialog's Print look; a gray ramp chosen there would put a one-sided ramp on a signed
   column. Severity 1.
8. In dense clusters overlapping triangles hide the sign in the gray preview. Severity 1.
9. Both previews in the Print look are at 76 percent; she wanted the gray one at print size.
   Severity 1.
10. The Styles screen opens on a different state of the same project (betweenness, a path, hub
    labels, size by degree) from the one she builds; harmless for the task but it may be where
    problem 1 comes from. Severity 1.

Resolved since last round, in her words: "No 47 genes declared unchanged. The same 148 and 152
everywhere. The gray steps have numbers. And the file has its own Look, so I don't have to repaint
the project to make a figure."

Quote to keep: "It's the first time the legend I'd draw in Inkscape came out of the software
correct. Now tell me where the size came from, tell me what layout drew it, and let me sort the
column I just colored by."
