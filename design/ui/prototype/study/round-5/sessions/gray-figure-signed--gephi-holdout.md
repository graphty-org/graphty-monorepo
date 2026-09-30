# Session: "A black-and-white figure of the fold changes, and which genes went up the most" -- Mara, Gephi holdout

Participant: Dr. Mara Lindqvist, associate professor of computational social science, Gephi user
since 0.8 (persona: study/personas/gephi-holdout.md). Laptop at 1440 by 900, Chrome, zoom 100
percent. Not her data and not her field: a biologist colleague's protein network with a fold-change
column.

Screens used: the open "Stress response study" project with the 300-protein network
(ppi-core-300); color by value (choosing an attribute, then the numbers settings); the Styles
list's Look menu; the Export dialog with Figure (.svg) checked in the Screen look and in the Print
look, and its table preview; the table dock (as drawn on other datasets); the export flow page.

Renders she looked at: shots/record/r4-mara-graysig-choose.png, shots/record/r4-mara-graysig-numbers.png,
shots/record/r4-mara-graysig-looks.png, shots/record/r4-mara-graysig-fig.png, shots/record/r4-mara-graysig-figgrey.png,
shots/record/r4-mara-graysig-dock.png, shots/record/r4-mara-graysig-ranked.png,
shots/record/r4-mara-graysig-exptable.png, shots/record/r4-mara-graysig-flow.png (the flow page, first screen,
plus its text).

Moderator's task, as given: "Make a black-and-white figure of the fold changes for a journal that
prints in gray, and tell me which genes went up the most."

## Transcript (thinking aloud)

**Before touching anything.** "Fold changes. So this is a biology network, which is Cytoscape
territory, and I'm the wrong person. Fine. In Gephi this is: Appearance, Nodes, Color, Ranking, pick
the column, pick a white-to-black ramp, apply. Then Data Laboratory, click the column header twice,
read the top rows. Then Preview, export SVG, and Inkscape for the legend because Preview can't make
one. Twenty minutes, most of it in Inkscape. That's the bar."

"Wait. A white-to-black ramp on a signed column is wrong, isn't it. Minus two would be white and
plus three black, and zero would be a meaningless middle gray. I'd probably do it anyway on a
deadline and let the reviewer catch it. Let's see what this does."

**The open project.** "Stress response study, ppi-core-300. 300 nodes, 1,262 edges, 3 components,
density 0.0281. I can't check those against anything; not my file. Attributes on the right:
module, 9 values; log2FoldChange, -2.52 to 3.15; degree, 0 to 34. Good, the column is there and it
tells me the range. That's more than Gephi's Overview tells me without opening the Data Lab."

**Finding where color lives.** "There's a Styles section in the left panel. Style layer 1, Base
style. The layer is open as a floating card: Applies to, All nodes. Shape, Opacity, Text, Fill.
Fill has a Color field saying 808080 and 100%, and two little buttons. I'll click the four-dot one
beside Fill, that looks like the 'use a variable' thing."

"'Color: apply a color or a value.' Palette colors across the top, then 'From the data':
log2FoldChange, numbers, -2.52 to 3.15; module, categories, 9. Then 'Computed': degree and
betweenness. 'Not computed': closeness, a few seconds. OK -- this is my Appearance panel's
Partition and Ranking tabs collapsed into one list, and it tells me which one I'd get by saying
'numbers' or 'categories'. I don't love losing the words partition and ranking, but the mapping is
one to one: numbers is ranking, categories is partition. I pick log2FoldChange."

**The ranking settings.** "'log2FoldChange as color.' Scale linear. 'Palette -- diverging', Red to
blue. Midpoint 0. So it looked at the sign and gave me a diverging ramp centered on zero without
being asked. That's the thing I was about to get wrong in Gephi. Fine, I'll give it that."

"There's a histogram over the ramp, -2.52 to 3.15. Midpoint field, 0. 'No value: 0 nodes, not
painted.' 'The palest color sits at 0. Below 0 is red, above is blue.' And the legend on the canvas
already: log2FoldChange color, linear, diverging at 0, 'the palest color is 0, not missing.' Below
0, 148. Above 0, 152. No value or unstyled, 0. 148 plus 152 is 300. Good. It adds up, which is the
first thing I check."

"Where's the gray ramp? I asked for black and white. The palette dropdown says Red to blue; I can't
see what else is in it from here. I'd click it expecting a Grays option. If it had one I'd probably
pick it and make exactly the mistake I just described. Let me look for something about printing
first."

"'Fix at current value' in the corner. That I like -- that's Gephi's paint-that-stays-put. I'd want
it before a paper figure so nothing moves between drafts. Not clicking it yet."

**The Look menu.** "On the Styles screen there's a Look dropdown next to 'Style stack' in the right
panel: Screen, Print, High contrast. 'Print: reads in gray on white paper and for color-blind
readers. Where a color shows a direction, a shape shows it too.' So that's the answer to 'where is
the grayscale ramp': it's not a palette, it's a mode for the whole project. 'Colors you set by hand
are kept.' OK."

"This particular picture is a different state of the project -- betweenness colors and a path from
TP53 to SMAD3, not my fold changes -- so I can't see what Print does to my layer here. And I notice
this menu says 'Look for the whole project'. Does switching it repaint my canvas for everyone
working on this? I'd leave it on Screen and see if Export has its own. Preview in Gephi is separate
from Overview for exactly this reason."

**Export, Screen look.** "Export dialog. Scope: 'Full graph: 300 nodes', 'the filter chip's scope,
until you change it here'. That's the thing Gephi never tells you -- what's actually going out.
Good."

"Figures: Figure (.svg), 'vector, with real text, for a paper or slides', 174 mm. Image (.png)
separately. So the best export is not a screenshot. Width: 174 mm, two columns; 'also 85 mm, one
column; 254 mm, a slide'. Somebody has read a journal's author guidelines. Background white. Legend:
beside, right."

"And the preview has a legend. An actual legend, in the file. 'log2 fold change. Red: down. Blue:
up. White: 0.' The ramp, -2.52, 0, +3.15, '148 below 0, 152 above'. Then 'Degree, node size, number
of interactions' with five size steps. Then a footer: 'Degree: exact, not normalized, on the full
graph (300 proteins, 1,262 interactions). Weight: confidence, not used yet.' That's the Inkscape
step gone. I've been waiting ten years for Preview to do that."

"Hold on. Degree as size? I never sized by degree. The stack I built had one layer, log2FoldChange
color, and the base style. Where did 'Size: degree' come from? Either this is a different state of
the project or it added a size layer I didn't ask for. I'd go and check the Style stack before I
trusted this figure."

"Labels: 'Top N by this layer's value', N 10, 'by |log2 fold change|'. Absolute value. So the ten
labels are the ten biggest changes in either direction, not the ten biggest increases. For the
figure that's defensible. For the question I was asked, it's not what I need. 'Also: above a
threshold.' '2 labels hidden to avoid overlap: show list.' At least it says so -- Gephi's SVG export
just drops them and you find out from the reviewer."

"Under the preview: a yellow mark, 'Values just above and below 0 print as the same gray', with a
button, 'Use Print look'. Right. Pale pink and pale blue both go to pale gray. It's telling me the
figure I'd have made in Gephi is broken, before I send it. I click Use Print look."

**Export, Print look.** "Now the Look row reads Print, and 'File is written with: Print look'. Two
previews side by side: 'The file, as written' and 'Printed in gray, the same file'. The file is
still in color, with triangles. The gray one is all triangles. Up triangles for up, down triangles
for down, small circles for no change. Darker is a bigger change on both sides."

"So the sign is a shape and the size of the change is darkness. That's correct. I'd have had to
build that by hand -- two partitions, shape in Preview, which Gephi doesn't really do -- and I'd
have given up and used color and hoped. The check under it says 'Increases and decreases stay apart
in gray (120 below 0, 133 above; 47 within 0.25 of 0 drawn as no change).'"

"Stop. 120 and 133. A minute ago it was 148 and 152. 47 within 0.25 of 0. Who picked 0.25? I didn't
type 0.25 anywhere. The color settings had Midpoint and No value, nothing called a band. Somebody
decided that 47 genes didn't change, and that's a claim that'll be printed in a journal under my
coauthor's name. In my field that's like the tool silently applying a degree filter before
modularity. It told me, I'll grant that, it's in the check line and in the methods file: 'no change
within 0.25 of 0'. But I can't see where to change it or turn it off. That's the Gephi problem
again -- a number that depends on a setting I can't see."

"And I looked at the export flow page to see if this is explained. There, a postdoc sets 'No change
within' herself, 0.58, 'her lab's 1.5-fold cut-off', in the color layer. And it says with no band
set, there are no circles and the legend says 'No band around 0 set'. So the flow says the band is
mine and optional, and the dialog I just used drew 47 circles with a band I never set. Also the flow
is a different column and different genes -- log2FC from a qPCR file, -2.41 to 2.98, PSMA2 as the
top gene -- so I can't use it to check anything on this project. One of these two pages is wrong,
and I don't know which one the software will do."

"The preview dropped to 76 percent of print size to fit both. For a gray journal the gray version
is the one I'd want at 100. Minor. Legend in Print: 'Shape is the sign; darker is a larger change.'
Up: +0.25 to +3.15, 133. Down: -0.25 to -2.52, 120. No change: within 0.25 of 0, 47. 133 plus 120
plus 47 is 300. It adds up again. Three shades on each side, but it doesn't tell me where the shades
break. A reviewer will ask."

"The file on disk is still in color with triangles, not gray. For a journal that prints in gray,
that's actually what I want -- they convert it. I'd still like a switch for an honest gray file
because some journals ask for one."

**The methods file.** "stress-response-study_figure-methods.txt, written beside it. 'Data:
ppi-core-300.graphml, 300 proteins, 1,262 interactions, undirected, loaded 2026-09-22. Scope: full
graph. Color: log2FoldChange (from the file), linear, diverging at 0, -2.52 to +3.15; 148 below 0,
152 above. Print look: shape is the sign... no change within 0.25 of 0. Size: degree... Labels: top
10 by |log2FoldChange|; 8 drawn, 2 hidden to avoid overlap (MRE11, RPL17). Drawn with
graphty-element 2.6.2.'"

"That's a methods paragraph I can nearly paste. And a version number, which is the thing I said a
new tool needs. But: nothing about the layout. Where are these nodes placed and why? In Gephi the
methods sentence is 'spatialized with ForceAtlas2'. Here the positions of 300 nodes are the whole
picture, and the methods file doesn't say which algorithm, which parameters, or which seed. A
reviewer in my field asks that first. That's a hole."

**Which genes went up the most.** "Now the second half. In Gephi: Data Laboratory, click
log2FoldChange twice, read the top rows. Here there's a table dock at the bottom of the canvas,
Nodes and Edges tabs, sortable headers with little histograms and rank columns. I've seen it --
but only on Les Miserables and on a 'Human protein interactions' project with degree, betweenness,
PageRank, community. Neither one shows me a log2FoldChange column. I assume I'd scroll right, or
add the column, and click the header. I can't do that on what I've been given."

"So I'm left reading the picture. The figure labels the top 10 by absolute change. In the Screen
preview, the labeled blue ones -- blue is up -- are CHEK1, dark blue, and SNRNP70, medium blue. WRN
might be blue or might be the red node next to it, I can't tell whose label is whose in that
cluster. MAPK10, MAPK2, E2F1, NDUFS5 and RPS6 are dark red, so those are the big decreases. In the
gray preview I'd have to find each label's triangle, and in the dense clusters the triangles overlap
so badly I can't tell which way half of them point."

"The only actual numbers I got are the two hidden labels: MRE11, +2.35, and RPL17, -2.25. So MRE11
went up by 2.35. And the maximum in the column is +3.15 -- I don't know which gene that is.
Probably CHEK1, from the color, but that's a guess from a shade of blue."

"My answer to you: CHEK1 and SNRNP70 look like the biggest increases on the figure, and MRE11 is up
2.35. I would not put that in writing. I'd open the table and sort, and if I couldn't, I'd open the
GraphML in Python. In Gephi this was the easy half."

## Single Ease Question

**4 out of 7.** "The figure was easier than in Gephi -- honestly much easier. It gave me a
diverging ramp on its own, a legend in the SVG, a methods file with a version number, and it stopped
me from printing the pink-and-blue-to-gray mistake I would have made. That's worth a lot. It loses
the rest because it decided 47 genes didn't change without asking me, the counts moved from 148/152
to 120/133 between two screens, the methods file says nothing about the layout, and the question
'which went up the most' -- a sort -- I could only answer by squinting at blue dots."

## Would she use it instead of her current tool?

"No. Not for my work. My projects are .gephi files and my coauthors send me .gephi files, and
nothing here spatializes with a name I can cite. But for this kind of figure -- a signed value
that has to survive a gray printer, with a legend -- I'd open it again, export from here and skip
Inkscape. That's a second session, not a switch. And I'd want to see the table sort on the actual
column and the no-change band as a setting I own, or off, before I let a student use it for a
thesis figure."

## Problems observed

1. The Print look draws every node within 0.25 of 0 as "no change" (47 of 300) using a band the
   analyst never set, and no screen she saw has a field to set or remove it; the export flow page
   says the band is the analyst's own, optional, and absent means no circles, which contradicts the
   dialog. Severity 3.
2. "Which genes went up the most" has no direct answer on the path: labels rank by absolute change,
   carry no values, and mix increases with decreases; the only signed numbers shown are the two
   hidden labels; no table on this project with log2FoldChange sorted was drawn. She answered by
   reading shades of blue and would not stand behind it. Severity 3.
3. The figure's methods file names data, scope, color, size, labels and version but not the layout
   (algorithm, parameters, seed), which is the first thing a reviewer in her field asks and what
   makes node positions citable. Severity 3.
4. Counts for the same column change between screens: 148 below and 152 above in the color layer,
   its legend and the Screen export; 120, 133 and 47 in the Print look. Explained in the methods, but
   two sets of numbers will reach a paper. Severity 2.
5. The exported figure sizes nodes by degree and carries a Degree legend, but the style stack she
   built had only the log2FoldChange color layer; she could not tell where the size came from and
   would have gone to check before trusting it. Severity 2.
6. There are two Look controls: "Look for the whole project" beside the Style stack and a Look row in
   the Export dialog that applies to the file only. Nothing on the project menu says whether
   changing it repaints the canvas for everyone. She avoided the project one. Severity 2.
7. The export flow page uses a different column, range and gene list (log2FC from a qPCR file, -2.41
   to 2.98, PSMA2 on top) from the screens (log2FoldChange from the network file, -2.52 to 3.15), so
   it cannot be used to check what the screens will do. Severity 2.
8. The gray legend gives three shades per side without stating the break values. Severity 2.
9. In dense clusters overlapping triangles hide the sign in the gray preview, and labels in a
   cluster cannot be matched to their marks. Severity 2.
10. The palette dropdown's contents are not drawn; a gray ramp there would invite the exact mistake
    the Print look exists to prevent (a one-sided ramp on a signed column), and nothing in the color
    settings points to the Print look. Severity 1.
11. In the Print look the side-by-side preview shows the gray version at 76 percent, not at print
    size. Severity 1.
12. "Numbers" and "categories" replace ranking and partition; the mapping is one to one and she
    accepted it, but noted it. Severity 1.

Quote to keep: "It stopped me from printing pink and blue as the same gray, which Gephi would have
let me do. Then it decided on its own that 47 genes didn't change, and it can't tell me what layout
drew the picture. I'd use it for the legend. I'd stay on Gephi."
