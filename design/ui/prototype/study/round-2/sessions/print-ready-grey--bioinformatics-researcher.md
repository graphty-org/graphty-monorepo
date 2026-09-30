# Session: a print-ready gray figure -- Dr. Chen (computational biologist)

Task as given by the moderator: "A reviewer wants the fold-change figure in greyscale, readable by a
colour-blind reader, with the top 10 labelled."

Screens used, in order: Styles list (frames 1, 13 and 14), Color or size by a value (the fold-change
state), Export dialog (a figure, viewed as gray, and the first release). Renders of the exact frames
she looked at: shots/record/r2-chen-grey-top-n.png, shots/record/r2-chen-grey-looks.png,
shots/record/r2-chen-grey-cbv-numbers.png, shots/record/r2-chen-grey-export-figure-grey.png,
shots/record/r2-chen-grey-export-first-release.png.

## Think-aloud transcript

**Reading the task.** "Right. Reviewer 2. Greyscale, colour-blind safe, top ten labelled. Top ten of
what -- they'll mean fold change, the biggest movers, both directions. Not degree. If I label the top
ten by degree I get TP53, UBC, HSP90AA1, and the reviewer writes 'these are hubs, not your result'."

"And one thing up front: a diverging palette cannot survive greyscale on its own. Minus two and plus
two are both dark in gray. So either the up and down genes get a second channel -- shape, a border --
or I give up the sign. Let's see whether the tool knows that."

**Styles list, frame 1.** "OK, a stack of layers on the left. Betweenness color, Hub labels, Degree
size, Base style. This is Cytoscape's style panel cut into layers, fine. My fold change is not here
yet on this one -- it's betweenness. I'll assume I already mapped log2FoldChange, like the other
screen."

**Color or size by a value, the fold-change state.** "There we go. log2FoldChange color, Red to blue,
diverging at 0, histogram of the values, midpoint 0. Legend: 148 below 0, 152 above. Good, it tells
me 0 is the pale one and not missing, I like that. 'Below 0 is red, above is blue' -- that's backwards
from how everyone draws it, but there's Reverse, fine."

"Now greyscale. Red to blue in gray: dark, pale, dark. That's the thing I just said. I open the
Palette dropdown... what's in it? The screen only shows Red to blue. I'd hope for a sequential gray, or
a blue-orange. I can't see the list, so I'm guessing. Nothing on this panel says 'this palette fails in
gray'."

"Shape has a plus. Could I bind shape to 'up or down'? I'd need a column that says up or down, which I
don't have unless I make one in R and re-import. Nothing here offers 'shape by sign'. Park it."

**Styles list, frame 14 -- the Look menu.** "Little palette icon on the Graph header. Opens 'Look for the
whole project': Default, Colorblind safe, Print, High contrast. 'Prints well in gray: colors keep their
order in grayscale and read on white paper.' Colorblind safe: 'ramps change lightness one way only.'"

"Hmm. So I want both. Print AND colour-blind. The tick is on Default; do these stack, or is it one or
the other? It looks like a radio list to me -- one tick. If it's one, I pick Colorblind safe, because
'lightness one way only' is the thing that would survive gray too. But then it's not diverging any more.
So what does it do to my fold change? Does it turn Red to blue into a one-way ramp and lose zero? Nothing
here tells me what my log2FC layer will look like after I pick it. 'Colors you set by hand are kept' --
did I set Red to blue by hand? No, it was the default. Or does choosing it in the dropdown count as by
hand? I don't know."

"I'd click Print and look at the canvas. On a real app I'd see it. On this mock the canvas is the
betweenness one, so I can't check. I'll assume it changes the ramp and see what export says."

**Styles list, frame 13 -- labels on the top N.** "Hub labels: 'Applies to: Top 12 by degree.' Oh, that's
nice, actually. Top, a number, by, a column. I change 12 to 10. And 'by' -- I open it, I pick
log2FoldChange."

"...And then it gives me the top ten by log2FoldChange, which is the ten most UP-regulated. The
down-regulated ones -- the stress-repressed ribosomal proteins, probably -- get nothing. I need top ten
by absolute fold change. Is there an |log2FC|? The list isn't drawn. I'd look for 'absolute', or a
'bottom' option. If it's not there I make a column abs_logFC in R and import it. Annoying, but it's
what I'd do in Cytoscape too."

"'2 hidden where labels overlap.' Good that it says so -- but for a figure, a reviewer asked for ten
labels, and if two of them vanish in the file I've just not done what was asked. Does the export also
hide them? I'd need to check the preview."

"The legend block says 'Labels: top 12 by degree'. So mine would say 'top 10 by log2FoldChange'. That's
exactly what goes in the figure legend. Good."

**Export dialog, a figure.** "Export files, top right. Scope full graph, 300 nodes. Current view, 2x, PNG.
Include legend. Methods text as a separate file -- and it states the palette and the counts. Right, that
is the thing I spend an hour on in Cytoscape. That's good."

"Format: PNG. I click the format dropdown... In the version called 'the first release', PNG only. No
SVG, no PDF. A PNG is not a figure. The journal's art department will want to change the font on the
gene labels; with a PNG they can't. I'd have to re-type ten labels in Illustrator over a raster."

**Export dialog, viewed as gray.** "View as: Color, Gray, Red-green, Blue-yellow. OK, this is the thing I
actually wanted. I click Gray, I look at whether up and down separate. In the mock it's the module
figure, and it shows Ribosome and Proteasome collapsing to the same gray -- so the tool would show me the
failure honestly. Credit for that. Then Red-green, check the reds and greens -- well, reds and blues in
my case."

"'Preview only: the file is written in color.' Hm. The reviewer asked for the figure in greyscale. So I
export in colour and convert it in Illustrator? Or I trust the journal to convert it? I'd rather the
tool wrote the gray file I just previewed. It's one checkbox."

"And the preview is a check, not a fix. If gray shows my up and down genes merging, it doesn't tell me
what to do -- change palette, add shape. I'd be back in the Look menu guessing."

**Where she ends up.** "So: fold change mapped, Colorblind safe picked -- or Print, I'm not sure which one
wins -- ten labels, if the abs column exists, gray preview checked, PNG out. That's a figure I could send
to a co-author. It's not a figure I'd send to the journal, because it's raster and because I'm not sure
the sign survives the gray. In practice: I'd do the labels and the gray check here, then redo the final
in R with ggraph and a proper up/down shape."

## After the task

**Single Ease Question: 4 of 7.** "Middle. Every piece exists -- the top N rule is actually better than
Cytoscape, and the gray preview is the thing I always wish I had -- but the two hard parts, keeping the
sign readable in gray and getting a vector file, I couldn't do, or couldn't tell if I'd done."

**Would she use it instead of her current tool?** "For checking a figure, yes -- the gray and red-green
preview plus the methods text is worth opening it for. For the figure that goes in the paper, not yet.
Give me SVG with real text, tell me what Print does to a diverging ramp before I pick it, and let me
label the top ten by absolute fold change, and I'd stop doing this bit in Cytoscape. Until then it's a
viewer, and the final is ggraph."

## Problems observed

1. **The Look menu does not say what it will do to a diverging ramp** (Styles list, frame 14; severity 3).
   Print promises "colors keep their order in grayscale", Colorblind safe promises "ramps change
   lightness one way only". Neither says what happens to a signed log2FC palette, whose two ends are
   equally dark in gray. She could not tell whether the sign would survive. "What does it do to my
   fold change? Does it lose zero?"
2. **Unclear whether Looks combine** (Styles list, frame 14; severity 2). The task needs gray AND
   colour-blind; the menu looks single-choice with one tick on Default. She guessed one excludes the other.
3. **"Colors you set by hand are kept" is ambiguous** (Styles list, frame 14; severity 2). She did not
   know whether choosing Red to blue in the palette field counts as setting it by hand, so she could not
   predict whether a Look would change her layer.
4. **Top N offers no absolute value** (Styles list, frame 13; severity 3). "Top 10 by log2FoldChange"
   gives only up-regulated genes; a fold-change figure needs the largest magnitude in both directions.
   The "by" list is not drawn, so no |log2FoldChange| or bottom-N is visible. Workaround: a new column
   made in R.
5. **Labels the figure hides are hidden silently from the reader of the file** (Styles list, frame 13;
   severity 2). "2 hidden where labels overlap" is honest on screen, but a reviewer asked for ten labels;
   she had no way to force all ten to be written, or to see whether the export drops them too.
6. **No way to encode the sign redundantly** (Color or size by a value; severity 3). In gray the only
   fix is a second channel (shape or border for up versus down). Shape is an empty channel with a plus,
   but nothing offers "by sign" without a new column.
7. **Palette list not visible and no gray warning on the palette field** (Color or size by a value;
   severity 2). She could not see which palettes exist, and the field does not say that the chosen
   diverging palette fails in gray, though the export preview would.
8. **PNG only in the first release** (Export dialog, the first release; severity 4). No SVG or PDF with
   real text, so the file cannot go to a journal's production department. This alone sends the final
   figure back to R.
9. **The gray view is a preview, not an output** (Export dialog, viewed as gray; severity 2). The reviewer
   asked for a greyscale figure; the dialog writes colour only. She wanted to write the file she
   previewed.

## What worked

- The top-N label rule ("Top 12 by degree", editable in place) and its legend title, which states the
  rule in the figure.
- View as Gray / Red-green / Blue-yellow in the export preview, which shows collapsing colours honestly.
- The methods text file with palette, counts and scope -- the caption chore done for her.
- The fold-change legend naming 0 as the pale colour, "not missing", with counts below and above 0.
