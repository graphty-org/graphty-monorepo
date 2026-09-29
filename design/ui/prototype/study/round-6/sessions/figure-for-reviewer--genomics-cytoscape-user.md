# Session: a figure a reviewer can read in gray -- Maren (genomics, Cytoscape user)

Task as given by the moderator: "A reviewer wants a figure of this network they can read even when
printed in gray. Get it to them."

Participant: Maren, cancer-genomics postdoc who makes her network figures in Cytoscape (persona:
`study/personas/genomics-cytoscape-user.md`). Played on a 14-inch laptop, 1440 by 900.

Screens seen, in order, as the participant sees them (study view):

- `shots/tasks/figure-for-reviewer/01-styles-list.png` -- the project as it opens
- `tmp/r6-maren-fig/sl-looks.png` -- the Look menu on the style stack, open
- `shots/tasks/figure-for-reviewer/02-colour-by-value.png` -- choosing what to colour by
- `tmp/r6-maren-fig/cbv-numbers.png` -- log2FoldChange on colour, with its scale panel
- `shots/tasks/figure-for-reviewer/03-export-dialog-figure.png` -- Export, Figure, Screen look
- `shots/tasks/figure-for-reviewer/04-export-dialog-figure-grey.png` -- Export, Figure, Print look
- `tmp/r6-maren-fig/ex-done.png` -- after Export

## Think-aloud

**1. The project opens.** "OK, 'Stress response study', ppi-core-300, 300 nodes, 1,262 edges. Three
components -- so there's stuff floating off on its own, I can see two dots out at the edge. Fine.

Everything is orange-brown. The legend down here says 'Color: betweenness, 0 to 0.138, log scale'.
I didn't ask for betweenness. For a reviewer the colour has to be fold change -- that's the whole
point of the figure, what's up and what's down. So first job is to change this.

Also: orange to brown. If a reviewer prints this in gray it's going to be one mud colour. Ten of
them are at 0 and lightest, the rest is brown. That's no good."

**2. Looking for where the colour is set.** "Right side, 'Style stack'. That's -- the styles, OK.
'Betweenness color', 'Hub labels', 'Size: degree', 'Base style'. In Cytoscape it's one style with
mappings in it; here it's a list. I can live with that.

There's a 'Look' dropdown next to it that says 'Screen'. Let me open that."

*(Look menu open.)* "'Screen, Print, High contrast'. Print: 'Reads in gray on white paper and for
colour-blind readers. Where a color shows a direction, a shape shows it too.' Huh. That's literally
my task. And 'Colors you set by hand are kept.' OK. But it's for 'the whole project' -- I don't
want my screen going gray while I work. I'll leave this and see if export has it too. And it
doesn't fix the betweenness problem anyway -- betweenness in gray is still betweenness."

**3. Colouring by fold change.** *(Colour picker open on a new layer.)* "OK, 'Color: apply a color
or a value'. 'From the data': log2FoldChange, numbers, -2.52 to 3.15. Module, categories, 9. Then
'Computed': degree, betweenness. That's my column, with its range right there, so it actually
attached. That's the thing that bites me in Cytoscape -- the column's there but it's empty. Here it
tells me the range. Good.

The layer is called 'Style layer 1', applies to 'All nodes'. Fine, whatever."

*(log2FoldChange on colour, scale panel open.)* "Linear, diverging, Red to blue, midpoint 0. It
shows the midpoint as a number I can type in. That's the thing I always fight with in Cytoscape --
here it just says 0. Histogram behind the ramp, -2.52, 0, 3.15. 'No value: 0 nodes, not painted.'
'paints 300 of 300 nodes.' OK, I believe it -- nothing got dropped.

But wait. 'Below 0 is red, above is blue.' Red is DOWN? Every heatmap I've ever made, every
volcano plot, red is up-regulated and blue is down. My reviewer is going to read red as up. There's
a 'use Reverse for the opposite' line, so I guess it's that little up-down arrow icon next to the
palette. I'd have missed it if I hadn't read the sentence -- it's just an arrow. I'd click it. I'm
assuming it flips it; nothing on screen tells me what happened to the legend after.

Red and blue, not red and green, so my PI can read it. That's something.

Now where did the betweenness layer go? This screen only has 'log2FoldChange color' and 'Base
style'. The hub labels and degree sizing are gone. Did I just replace them, or is this a different
project? Sets and paths is empty too. I'd want to know I didn't just throw away the degree sizing,
because I want that in the figure."

**4. Export.** "I'd look for File, Export. The done screen later shows an 'Export...' button on the
Data tab; I'd have found it eventually.

'Figures: Figure (.svg), vector, with real text. For a paper or slides.' SVG. Not PDF? The journal
wants PDF or TIFF. Illustrator opens SVG so I can live with it, but the reviewer -- I'd be emailing
a reviewer an SVG and hoping it opens. I'd convert it myself. Mildly annoying.

174 mm, two columns; also 85 mm one column. That's the journal widths, good, someone knew that.
White background. Legend 'Beside, right'. Oh -- the legend is IN the figure. That's the thing I
fight with every single time in Cytoscape. There it is, drawn next to the network, with the
scale, the counts, 148 below 0 and 152 above. Good.

Labels: 'Top N by this layer's value', 10, by |log2 fold change|. '2 labels hidden to avoid
overlap: show list'. It tells me which two didn't get drawn. That's exactly the kind of thing I'd
want told, not silently done. MRE11 and RPL17, with a 'Select' so I can go force them on. OK.

And the methods file. 'stress-response-study_figure-methods.txt': file, 300 proteins, 1,262
interactions, log2FoldChange linear diverging at 0, top 10 labels, which 2 hidden, 'Drawn with
graphty-element 2.6.2'. That's half my figure legend and half my methods paragraph. I'd still
rewrite it -- I don't paste text I didn't write -- but it's all the numbers I'd otherwise have to go
dig up. And it doesn't say anything about STRING or the cutoff, because I guess this network came
from a file. Fine.

Then this yellow warning: 'Values just above and below 0 print as the same gray.' Yes. Exactly my
reviewer's problem. With a button, 'Use Print look'. It found the problem before I sent it. OK,
click."

**5. The Print look.** "Two pictures side by side: 'The file, as written' and 'Printed in gray,
the same file'. Oh, that's useful -- I never actually know what it looks like on the reviewer's
printer, I just hope.

Now every node is a triangle. Pointing up for up, pointing down for down, and four gray steps for
how big the change is: 0 to 0.8, 0.8 to 1.6, 1.6 to 2.4, 2.4 to 3.2. 'No two of its 8 categories
print as the same gray.' And a little table in the legend, down and up counts per step, 148 and 152.
That adds up. I checked: 2, 13, 48, 85 is 148.

So does it work in gray? ... Yes, honestly, in the gray preview I can tell up from down, which I
couldn't in the red-blue one. The reviewer's question is answered.

But. A network of 300 triangles. I've never seen a PPI figure that looks like this. Reviewers know
what a Cytoscape figure looks like, circles with a gradient. This looks like a different kind of
plot. I'd have to explain the triangles in the legend -- well, it does, 'Shape is the sign'. OK.

And it's binned now. My continuous fold change is four steps. A gene at +0.1 and one at +0.7 are the
same triangle. On the screen look I had a gradient. For the reviewer that's probably fine, but I'd
want to say in the caption that it's binned, and the methods text does say '4 gray steps', so it's
there.

The lightest step, 0 to 0.8, is very pale gray triangles on white. On a bad printer those are going
to vanish. That's 157 of my 300 genes in the palest bin. In the preview they're already faint.

The legend has some lines in it I would delete before a reviewer sees them: 'Weight: confidence,
not used yet; no measure here reads a weight.' and 'Look: Print. Gray-safe: sign is shape.' That's
the software talking to me, not to the reader. The reviewer doesn't care what the tool calls a
'Look'. 'Degree: exact, not normalized, on the full graph (300 proteins, 1,262 interactions)' --
that one I'd keep, that's a real caption line.

And it's 174 by 86 mm with 300 nodes and 8 labels. It's a hairball with eight names on it. That's
not the tool's fault, that's the network. In Cytoscape I'd have taken the largest component and
dropped the two floating nodes first; here scope is 'Full graph: 300 nodes' and the two strays are
still in the corners of the figure. I'd look for largest component in that Scope dropdown."

**6. Export and after.** "'2 files go to your Downloads folder. Nothing is uploaded.' Good, I read
that. Nothing goes to a server with my unpublished data. Export 2 files.

After: a note at the bottom, 'Exported ... in the Print look', and in 'Sent and saved' it lists the
SVG and methods file, 'Print look, Today 19:12, to Downloads'. And my screen is still in colour, the
Look says Screen. Good -- it didn't turn my working view gray, it only wrote the file gray.

To actually get it to the reviewer, I email it. That's the same as always. There's no link to send,
but for a reviewer I'd rather send the file anyway."

## Single Ease Question

**5 of 7.**

"It did the gray part better than anything I've used: it warned me before I sent it and showed me the
gray version side by side. What cost me points: I started on somebody's betweenness colouring
and wasn't sure whether I'd wiped the other styles when I recoloured; red means down here, which is
backwards for my field, and the fix is an arrow icon; SVG only, no PDF; and the legend has tool
lines in it I'd have to strip out by hand."

## Would she use it instead of her current tool?

"For this -- a quick figure that has to survive a gray printer, with the legend and the numbers
written for me -- yes, I'd use it, and I'd use it over Cytoscape, because in Cytoscape I'd be
making that legend by hand in Illustrator.

For the Figure 3 in the actual paper, probably not yet. The triangles look like nothing a reviewer
has seen in a network figure, and I'd have to defend them. My PI would ask how to cite it. And I
still did the STRING query and the clustering somewhere else. So: this for the reviewer response,
Cytoscape for the paper, for now."

## Problems observed

1. **Red means down by default.** The diverging palette puts red below 0 and blue above, the
   opposite of the heatmap and volcano-plot convention in genomics. The only way to flip it is an
   unlabelled arrow icon, found only because the one-line hint mentions "Reverse". Severity 3.
   Quote: "Red is DOWN? Every heatmap I've ever made, red is up-regulated."
2. **The legend in the exported figure carries lines addressed to the user, not the reader.**
   "Weight: confidence, not used yet; no measure here reads a weight." and "Look: Print. Gray-safe:
   sign is shape." would have to be deleted by hand before a reviewer sees it. Severity 3.
3. **The palest Print step fades out.** The 0 to 0.8 band (85 down, 72 up; over half the genes)
   draws as very pale gray triangles on white, already faint in the "Printed in gray" preview.
   Severity 3.
4. **Screens did not carry the styles over.** The project opens coloured by betweenness with hub
   labels and degree sizing; the colour-by-fold-change screen shows only the new layer and the base
   style, so she could not tell whether recolouring had removed the degree sizing she wanted to
   keep. Severity 2.
5. **No PDF.** The figure is SVG only; journals and reviewers expect PDF or TIFF. Severity 2.
6. **Print binning and shape are unfamiliar for a network figure.** Triangles plus four gray steps
   read as correct but unlike any PPI figure a reviewer knows; the continuous fold change becomes
   four bins. The legend and methods file do say so. Severity 2.
7. **The figure keeps the two isolated nodes.** Scope is "Full graph: 300 nodes"; the largest
   component, which she would normally cut to first, was not offered where she looked. Severity 2.

## What worked for her

- The column picker shows log2FoldChange with its range, and the scale says "paints 300 of 300
  nodes, no value 0": proof the data attached.
- The midpoint is a visible number, 0.
- The legend is in the exported figure, with counts per side.
- The two labels hidden for overlap are named (MRE11, RPL17), not silently dropped.
- The export warned that values near 0 print as the same gray and offered the fix in one click.
- "The file, as written" next to "Printed in gray" answered the task directly.
- The methods file lists every setting she would otherwise dig up for the caption.
- Exporting in the Print look left her working screen in colour.
- "Nothing is uploaded" stated at the button.
