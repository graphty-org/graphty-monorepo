# Session: a figure a reviewer can read in gray -- Dr. Chen, computational biologist

Participant: Dr. Chen, computational biologist (persona: study/personas/bioinformatics-researcher.md).
Task given by the moderator, and nothing more: "Make the picture show which genes changed most, so a
reviewer can read it, even printed in grey."
Screens: the Styles list (screens/styles-list.html) and the Export dialog (screens/export-dialog.html),
as renders in the study view (design notes hidden).

Renders she saw, in the order she saw them (all in shots/):

- r3-chen-sl-empty.png -- the network with no style layers yet
- r3-chen-sl-no-value.png -- a fold change color layer ("qPCR log2FC color") open in its editor
- r3-chen-sl-covered.png -- "Fold change size", covered by "Degree size"
- r3-chen-sl-top-n.png -- the label layer, "Top 12 by degree"
- r3-chen-sl-looks.png -- the Look menu (Default, Colorblind safe, Print, High contrast)
- r3-chen-ex-figure-signed-tall.png -- Export, fold change colored, Print look
- r3-chen-ex-figure-signed-grey-zoom.png -- the same preview, cropped and converted to gray by the
  moderator's print test, to check it the way a black-and-white journal page would

## Think-aloud transcript

**1. The empty network.** "OK. 300 proteins, 1,262 edges, three components. Fine, that matches.
It's in 2D, good. Everything is the same gray dot. On the right under Attributes there's
log2FoldChange, -2.52 to 3.15. That's the column I want. In Cytoscape I'd go to the Style tab, Fill
Color, pick the column, continuous mapping. Here... the Styles section says 'No style layers yet.
Add one with +, or with Color by or Size by on any attribute.' Where is Color by? I'm looking at the
log2FoldChange row on the right. It's just a name and a range. No button. Maybe it appears when I
hover. I'd right-click it, honestly. I don't see it, so I'll use the plus."

(Moderator note: the Color by action on an attribute row is not visible at rest in this render. She
chose the + on Styles; its editor opens empty.)

**2. Color by fold change.** "Right, here's one already made -- 'qPCR log2FC color'. Red to blue,
'log2FC, -2.41 to 2.98, 0 in the middle'. Good, it centred on zero without me telling it. That's
the thing Cytoscape gets wrong half the time. Red and blue, not red and green, thank you. But this
one only paints 84 of 300 -- that's a different file, the qPCR. I want my DE column on all 300.
I'll assume I make the same thing with log2FoldChange and it picks the same diverging scale. I
can't actually see what the palette button beside the column offers. Is there a gray-safe diverging
one in there? I'd want to see the list."

**3. What does 'changed most' mean on this picture.** "Colour alone doesn't say 'changed most' to a
reviewer -- it says up or down. Changed most is the magnitude. So I want size by absolute fold
change. Oh -- there is one: 'Fold change size', and it says 'By magnitude, sign not shown: 148
proteins went down and 152 went up. Color by log2FoldChange to show the direction.' That's
correct, and it's the first tool that has told me that in words. But it paints 0 of 300 because
'Covered by Degree size above'. Fine, I didn't want degree size anyway -- sizing by degree is how
you get TP53 in every figure. Move above. Actually I'd rather switch Degree size off, because a
reviewer will ask why both exist. The eye on the row does that, I think."

**4. Labels.** "The names on the canvas are MAPK1, AKT1, UBB, YWHAZ -- that's the top 12 by degree.
Those are the most-published proteins in the building, not the genes that changed. The label layer
says 'Top 12 by degree' with a dropdown on 'degree'. I'd change it to log2FoldChange. But top 12 by
log2FoldChange is the 12 most UP-regulated. I want the 12 biggest in either direction. Is there
absolute value in that dropdown? The size layer had '|log2FoldChange|' with the bars, so maybe. I
can't tell from here. If it's not there, I'd make a column in R and re-import, which is exactly the
chore I'm trying to avoid. Also '2 hidden where labels overlap' -- at least it tells me. Which two?
If one of them is my top gene, that's the one the reviewer asks about."

**5. Gray.** "Now the gray part. There's a little palette icon beside 'Graph' on the right. I only
found it because I was looking for anything that said print. Look for the whole project: Default,
Colorblind safe, Print -- 'Prints well in gray: colors keep their order in grayscale and read on
white paper.' That's the one. 'Colors you set by hand are kept' -- fine. I'd pick Print."

**6. Export.** "Export files, top right. Scope full graph, 300 nodes -- good, not just what's on
screen. Look: Print, 'File is written with: Print look'. The legend is drawn in: 'Fold change
(log2), darker is higher; 0, no change, is the middle gray', -2.52 to +3.15, below 0 148, above 0
152. The counts add to 300. And a methods text with the scale, 'diverging at 0', the counts, and
the graphty-element version. That is the paragraph I usually write by hand. I'd keep that."

"Then the check line: 'Checked in gray: fold change runs light to dark from -2.52 to +3.15, and the
legend states that 0 is the middle gray.' Hmm. Wait. Light to dark from -2.52. So the most
down-regulated genes are the LIGHTEST. On white paper."

**7. The printed test.** (She looked at the gray conversion of the preview.) "Yes, that's what I was
afraid of. It's a sea of middle gray. The handful of dark ones are the most up. The most
down-regulated genes -- which are half of what 'changed most' means -- are near-white dots on white
paper. In this print they look like the LEAST important nodes on the page. A reviewer reads darker
as 'more'. The legend is honest about it, but nobody reads the legend first, they read the dots.
Red-to-blue on screen was right. Turning it into one light-to-dark ramp for print throws away the
thing the diverging scale was for: that both ends are extreme."

"What I actually want in gray: magnitude on size, direction on something that survives gray -- a
filled versus open circle, or a dark outline for down, or a shape. Or two ends dark and middle
white, and then use shape for the sign. Not 'down is pale'."

"If I had Fold change size on, the big pale nodes would at least be big. That rescues it partly.
But the dialog didn't suggest it. It checked the colors and said 'passed'. It passed the wrong test."

**8. Format.** "And it's PNG, 2x. The format dropdown says PNG. I need SVG with real text for the art
department. I'd click the dropdown -- if SVG or PDF isn't in there, the figure goes through Cytoscape
anyway. I can't tell from this screen."

## Outcome

Partly done. She could get fold change onto color (diverging at 0, automatically), found the
magnitude layer, found the Print look and a real legend with methods text. She could not confirm
labels on the biggest changes in both directions, could not confirm SVG, and the Print look's
gray version makes the most down-regulated genes the palest marks on the page -- the opposite of
"show which genes changed most". The dialog's gray check said it passed.

## Single Ease Question

3 of 7. "The pieces are nearly all there, and the legend and methods text are better than what I do
by hand. But I had to assemble 'changed most' out of three layers myself, and the print version
quietly buries half the answer."

## Would she use it instead of her current tool?

"For looking, maybe. For this figure, not yet. Cytoscape plus Illustrator is ugly, but I control
what the down-regulated genes look like on paper. If the print version kept both ends of the fold
change strong, labelled the top genes by absolute change, and gave me an SVG, I'd take this over
Cytoscape for figures -- the auto-legend and the methods text alone save me an afternoon. And I'd
still ask whether I can regenerate it from R when Reviewer 2 wants a different cut-off."
