# Session: a figure a reviewer can read in gray -- the Gephi holdout

Participant: Dr. Mara Lindqvist (persona: study/personas/gephi-holdout.md), associate professor,
Gephi user since 0.8. Played at 1440 x 900.

Task, as the moderator gave it: "A reviewer wants a figure of this network they can read even when
printed in gray. Get it to them."

Screens seen, in order, as the participant sees them (study view, renders in
shots/tasks/figure-for-reviewer/): the Style stack (01-styles-list.png), the Color picker on a new
style layer (02-colour-by-value.png), the Export dialog in the Screen look (03-export-dialog-figure.png)
and in the Print look with the hidden-label list open (04-export-dialog-figure-grey.png). Also looked
at the Look menu in the Style stack header (shots/screens__styles-list-looks.png) and read what the
inspector's Show label anyway does (screens/inspector.html, the Show label anyway crops). Glanced at
flows/export.html and put it down: it is a design document, not the program.

## Think-aloud

**1. The Style stack.** "Stress response study, ppi-core-300. 300 nodes, 1,262 edges, 3 components,
density 0.0281. 300 times 299 over 2 is 44,850; 1,262 over that is 0.0281. Fine, undirected, the
density is right. I always check that one, half the tools out there divide by n squared."

"What's on the canvas: orange to brown, 'Betweenness color', log scale. The layer card says each value
is divided by 0.000077 before the log, and on a straight scale 289 of 300 proteins would share the
lightest color. Good, somebody knows betweenness is a power law. Labels top 12 by degree, size by
degree. There's a legend on the canvas. Gephi has never given me that."

"For a gray print, orange-to-brown is a single-hue ramp. That already prints as light-to-dark gray.
Honestly this one is probably printable as it is. But the reviewer's figure is not going to be
betweenness in my paper; it's going to be whatever the result is. Let me look for the gray switch.
There -- 'Look: Screen' in the Style stack header."

**2. The Look menu.** "Look for the whole project: Screen, Print, High contrast. 'Print: reads in gray
on white paper and for color-blind readers. Where a color shows a direction, a shape shows it too.'
'Colors you set by hand are kept.'"

"Two things. One: whole project. I explore in color and print in gray, those are Overview and Preview
in Gephi and they are separate for a reason. I don't want my canvas going gray while I work. Two:
'a direction'. My figures are modularity classes. Nine, twelve communities. A partition has no
direction. What does Print do to a partition? This menu doesn't tell me. And the hand-set colors are
kept -- I always hand-set my community colors. So Print would leave exactly my case alone. I'm not
clicking this. I'll go to the export and see what it does there; in Gephi the paper settings live in
Preview anyway."

**3. The Color picker on a new layer.** "Different state -- the graph is all gray here and there's a
'Style layer 1'. I suppose this is how you'd set up the color from scratch. Palette colors, then From
the data: log2FoldChange, numbers, -2.52 to 3.15; module, categories, 9. Computed: degree, betweenness.
Not computed: closeness, 'a few seconds'. I like that it separates what came in the file from what the
program computed. That's the first question I ask of any column."

"The palette swatches -- orange, sky blue, green, blue, vermilion, pink, black, yellow. That's
Okabe-Ito. Good, I teach that palette. But in gray, the sky blue and the yellow and the orange are all
going to land close together. Nothing here says so. For the reviewer I'd pick log2FoldChange, since
that's what the export is going to show me anyway, I gather."

**4. Export, Screen look.** "Ctrl+Shift+E, or the project menu. Scope: 'Full graph: 300 nodes. The
filter chip's scope, until you change it here.' Good, that's the Gephi trap named out loud -- in Gephi
whatever is visible is what gets exported and computed."

"Hold on. View: Current view. The current view on the canvas was orange-brown betweenness with
labels top 12 by degree. This preview is red-to-blue log2 fold change, labels top 10 by |log2 fold
change|. Which is it? If 'Current view' means what's on my canvas, the preview is showing me a
different figure. If it means something else, the word is wrong. I'll assume the fold-change layer is
on top in whatever view this is, but I'd check the canvas after closing, and if a reviewer's figure
came out colored by something I didn't choose, that's the end of the tool for me."

"Otherwise: Figure .svg, 'Vector, with real text'. 174 mm two columns, 85 mm one column. Text 8 pt,
shown at 100% of print size. White background. Legend beside, right, with the degree key in the file.
Legend has '148 below 0, 152 above' -- 300, adds up. The methods file: data file, date, scope, color
rule, size rule, labels, 'Drawn with graphty-element 2.6.2.' That's my methods sentence and a version
number to cite. The weight line -- 'confidence, not used yet; no measure in this figure reads a
weight' -- is exactly the question a reviewer asks, answered before they ask it."

"And the yellow warning: 'Values just above and below 0 print as the same gray.' Use Print look.
Correct -- a diverging ramp through white prints as a V in gray, minus 2 and plus 2 are the same
darkness. It caught it without me asking. Click."

**5. Export, Print look.** "'Look, for this file only.' Answered, then: this one doesn't touch my
canvas. But now there are two controls with the same three names, one 'for the whole project' in the
Style stack and one 'for this file only' here. Which wins if the project is on Print and this says
Screen? I'd guess this one, since it's closer to the file. I shouldn't have to guess."

"Two previews: the file, and 'Printed in gray, the same file'. That's what I do by hand -- print one on
the department printer and squint. Triangle up for up, down for down, darkness is size of the change,
four steps a side: 0 to 0.8, 0.8 to 1.6, 1.6 to 2.4, 2.4 to 3.2. Counts in the legend: down 2, 13,
48, 85 -- that's 148. Up 3, 22, 55, 72 -- 152. Total 148 and 152, same as the Screen look. The methods
file says the same. Good. No invented 'no change' band. The steps are equal widths and the same on
both sides, so a reviewer can't say I stretched one side."

"But the sentence under Look: 'No two of its 8 categories print as the same gray.' Then the key right
under the check line shows each step as a pair of squares, down and up, in the SAME gray -- '0.8 to
1.6', two identical squares. That's the whole design: same gray, the triangle carries the sign. So the
sentence is false as written. What they mean is no two categories print alike, shape and gray
together. A reviewer who reads 'no two print the same gray' and then looks at the figure will think
someone didn't look. I'd rewrite that line before I trusted the rest of the panel."

"Second worry: the triangles at the small end. Degree 0-1 nodes are drawn at about a millimetre in a
174 mm figure. Can you tell a one-millimetre triangle pointing up from one pointing down after a
laser printer has smeared it? In the gray preview I can't tell, but the preview is at 76% of print
size now -- in the Screen look it said 100%. Why did it shrink? I check labels and marks at print size.
Give me the 100% preview of the gray one, even if I have to scroll."

**6. The two hidden labels.** "Two labels hidden to avoid overlap: MRE11 +2.35, RPL17 -2.25. Those are
among the biggest changes, so of course the coauthor will ask where they are. 'Select' -- 'Select
closes the dialog, keeping its settings, and selects the node. Its inspector has Show label anyway.'
So: close the export, find the node in the inspector, press Show label anyway, which adds it to a layer
called 'Labels shown anyway (this file)', and Ctrl+Z undoes it. Then come back to the export. It's a
round trip, but at least it's a layer I can see and remove, not a label I dragged in Inkscape that's
gone next time. I'd rather have a checkbox right here in the list. Two rows, two ticks, done. Twice
out of the dialog for two labels is the kind of thing I'd do grumbling."

**7. What I didn't get to check: my own kind of figure.** "Everything in this dialog is written for a
diverging number. The line under Look even says 'a red-to-blue ramp with no categories'. My paper
figure is nine modularity classes. The column is right there -- 'module, categories, 9' -- and not one
screen told me what Print does to it. Different shapes per community? Hatching? Does it refuse past
some count and tell me? That's the question I came in with last time and it's still the question."

**8. Export.** "Two files, SVG and a methods .txt, to Downloads, 'Nothing is uploaded.' Good, some of my
data is under IRB. Export 2 files. I'd open the SVG in Inkscape once to confirm the labels are text
and the legend is text, and then send it. No legend to draw by hand. That part is genuinely better
than my Gephi routine."

## Single Ease Question

**5 of 7.** "The gray part was easy: the dialog warned me, one click, a gray preview beside the file,
and the counts agree everywhere now. That's a real improvement. I lose points for the preview showing
a different coloring than the canvas under 'Current view', for a check sentence that says the opposite
of what its own key shows, for the gray preview shrinking below print size just when I need to judge
tiny triangles, and for having to leave the dialog to put two labels back. And my actual figure, a
partition, is still an open question."

## Would I use this instead of Gephi?

"For this figure -- a single diverging measure on a few hundred proteins, to a reviewer this week --
yes, I'd use it. The legend and the methods file in the export would save me the Inkscape half hour,
and the gray preview is what I do by hand. For my own papers, no, not yet. My figures are modularity
partitions on 20,000-node crawls, and nothing here showed me how a partition prints in gray or whether
it holds that size. I'd stay on Gephi for paper work and use this for the odd figure like this one."
