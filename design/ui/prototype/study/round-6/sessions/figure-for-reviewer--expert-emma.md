# Figure for a reviewer, readable in gray -- Expert Emma

Participant: Expert Emma (network scientist; notebooks for analysis, Gephi for final figures).
Task as given: "A reviewer wants a figure of this network they can read even when printed in gray.
Get it to them."
Screens seen, in order: the style stack (styles-list), colouring by a value (colour-by-value, the
attribute picker, then the numbers state), the export dialog (Figure, Screen look; then Print
look), the canvas after export.
Dataset in the mock: ppi-core-300.graphml, 300 proteins, 1,262 interactions, undirected.

## Think-aloud

**1. The first screen (style stack).**

"OK. A protein network, 300 nodes, 1,262 edges, 3 components, density 0.0281. Fine, those are the
four numbers I would have asked for. Top left says 'Nothing has been sent from this project'.
Good, that is the first thing I look for and it is right there.

What is on the canvas right now is betweenness on a log scale in orange to brown. 'Each value is
divided by 0.000077, the smallest above 0, before the log.' Hm. That is an honest sentence, I will
give it that -- most tools just take log(x+1) and do not tell you. And it says 10 proteins sit at
0 and get the lightest colour. Fine.

But the reviewer did not ask for betweenness. The reviewer asked for 'a figure of this network'. In
a stress-response study the thing anyone wants to see is the fold change. Betweenness on a hairball
is the figure I would reject as a referee. So I am going to throw this colouring away and put
log2 fold change on it. If I had a view of what the paper's figure is supposed to be I would use
that, but I do not see one."

(She does not look for the betweenness layer's parameters further; she goes to replace it.)

**2. Colour by a value -- the picker.**

"'Color: apply a color or a value.' Search box, palette swatches, then 'From the data':
log2FoldChange, numbers, -2.52 to 3.15; module, categories, 9. Then 'Computed': degree, 0 to 34,
betweenness, 0 to 0.138. 'Not computed: closeness, a few seconds.'

I like that the range is printed next to the column name. That is how I check that the import did
not mangle the column -- -2.52 to 3.15 is what my DESeq table says, give or take. And splitting
'from the data' from 'computed' is the right distinction. I would have liked to know which
closeness -- harmonic or the classic one, and what it does with 3 components -- but that is not
this task.

Pick log2FoldChange."

**3. Colour by a value -- the numbers state.**

"Linear, diverging, red to blue, midpoint 0. Histogram under the ramp. 'Below 0: 148, above 0:
152.' 'No value: 0 nodes, not painted.' 'The palest colour sits at 0. Below 0 is red, above is
blue: use Reverse for the opposite.'

Red for down is backwards from what most of my biology collaborators expect -- in their heatmaps red
is up. But it tells me, and there is a reverse button right there. I would flip it for a biology
paper. For this task it does not matter much, because red and blue are going to be gray anyway.

The legend on the canvas says the same counts, 148 and 152, and 'the palest colour is 0, not
missing'. Good. That is exactly the confusion I have seen in figures: white meaning zero or
white meaning NA. It says which.

Midpoint is a box I can type in. Fine. Domain is -2.52 to 3.15 -- so it is not symmetric. A
diverging scale with an asymmetric domain means the same red and the same blue do not mean the
same magnitude. Is it clipping to a symmetric range or not? The ramp under the histogram looks
like 0 sits left of centre, so I think it stretches each side separately. I would want to set it to
symmetric, say -3.2 to 3.2, for a paper. I do not see a 'symmetric' option. I would type it by
hand if the domain is editable; from the render I cannot tell that it is."

**4. Getting to export.**

"Now I need a file. Hamburger menu top left: Open, Update with new data, Export... Ctrl+Shift+E.
OK. There is also an Export button on the Data panel. Either way I found it in a few seconds."

**5. Export dialog -- Figure, Screen look.**

"Figure (.svg), 'vector, with real text'. Good, real text means the reviewer's typesetter can
touch the labels and I do not get outlined glyphs. 174 mm, two columns; also 85 mm and 254 mm.
Somebody has read a journal's author guidelines. Background white. Legend beside, right. Labels:
top N by this layer's value, N = 10, by |log2 fold change|. Absolute value -- right, otherwise
you only label the up-regulated ones. '2 labels hidden to avoid overlap: show list.' Thank you. In
Gephi they just vanish.

Preview says 'shown at 100% of print size' and 'text 8 pt'. The legend: 'log2 fold change. Red:
down. Blue: up. White: 0. 148 below 0, 152 above.' Degree: 'node size: number of interactions,
0-1, 2-3, 4-7, 8-16, 17-34'. And then this footer, 'Degree: exact, not normalized, on the full
graph (300 proteins, 1,262 interactions). Weight: confidence, not used yet; no measure here reads
a weight.'

That last line is the one I would actually have checked for. There is a confidence column in this
file and it tells me nothing in the figure uses it. OK.

And then under the preview: a warning. 'Values just above and below 0 print as the same gray.'
With a button, 'Use Print look'. Yes -- that is the whole task. A red-to-blue diverging ramp
goes to a symmetric gray, the light red and the light blue become the same gray, and the reviewer
cannot tell up from down. I am mildly surprised a tool noticed that for me."

**6. Export dialog -- Print look.**

(She clicks Use Print look.)

"Now it shows two previews side by side: 'The file, as written' and 'Printed in gray, the same
file'. That is good. That is the thing I actually do by hand -- print to the office printer, look
at it, swear.

Print look: the sign is a shape, triangle up for above 0, triangle down for below, and darkness is
|change| in four gray steps, 0 to 0.8, 0.8 to 1.6, 1.6 to 2.4, 2.4 to 3.2, same on both sides.
Legend is a little table: |change| bin, down count, up count. 2/3, 13/22, 48/55, 85/72, totals
148/152. The totals match the Screen legend. I checked that.

'Increases and decreases stay apart in gray (148 below 0, 152 above): the triangle carries the
sign.' Fine.

Now the skeptic's part.

- The shape carries the sign, but the size carries degree. So a protein with degree 1 gets the
  smallest glyph, and at 174 mm with 300 nodes I do not believe anyone can tell an up-triangle from
  a down-triangle on the smallest size. In the gray preview the little ones at the edge look like
  specks. The sign is the most important thing in this figure and it is being carried by the
  channel that fails first at small sizes. I would want either a minimum glyph size in Print, or
  the option to drop size-by-degree for this file. I do not see either in the dialog.
- The lightest step, 0 to 0.8, is a very pale gray triangle on white. 157 of the 300 proteins are
  in that bin. On a cheap printer they are going to disappear into the paper. Does the pale step
  get an outline? In the preview they seem to have a thin edge; I cannot tell at this zoom whether
  that survives printing.
- The bins: '0 to 0.8, 0.8 to 1.6'. Where does exactly 0.8 go? Half-open intervals, please, write
  them [0, 0.8). A reviewer in my field will ask.
- Why 0.8? It looks like max |change| divided by 4 and rounded. That is defensible but it is not
  what I would pick; people think in log2 of 1 and 2 (twofold, fourfold). I would want to set the
  breaks. I do not see where.

Still -- the grayscale problem itself is solved, and it is solved in a way I would have to spend
an evening doing in matplotlib with marker='^' and 'v'."

**7. The methods file.**

"stress-response-study_figure-methods.txt, written next to the SVG. It has the file name, the width,
the data file and load date, scope, colour: log2FoldChange from the file, linear, diverging at 0,
-2.52 to +3.15, the counts, 'Print look: shape is the sign, darkness is the distance from 0 in 4
gray steps', the bins, size: degree exact not normalized, weight not used, which labels were
hidden, 'Drawn with graphty-element 2.6.2'.

That is better than anything Gephi gives me. I can paste most of that into the figure caption.

What is missing: the layout. Nothing in there says which layout algorithm placed these nodes, with
what parameters, or what seed. If the reviewer asks me to regenerate the figure after a revision, I
cannot get the same picture back from this text. And a reviewer who knows anything will ask why
those two blobs are next to each other; I want to be able to say 'force-directed, positions carry
no meaning, seed 42' in the caption. That is not optional for me."

**8. After export.**

"Toast: 'Exported stress-response-study_figure.svg and its methods file, in the Print look.' In
the Data panel under 'Sent and saved' it is listed with the time and 'to Downloads', and 'Print
look'. Good, so in two weeks I can see what I sent. The canvas is still in the Screen look, which
is what I want -- I do not want to explore in triangles.

Small thing: the layer was 'log2FoldChange color' when I made it and it is 'Fold change color' on
this screen. Same layer, I assume. I would not have changed the name, so something else did.

And the right panel has its own 'Look: Screen' dropdown on the style stack, and the dialog has
'Look, for this file only'. So there are two looks. I think I understand -- one is the canvas, one
is the file -- but a junior would set Print on the canvas and then wonder why the file came out in
colour, or the reverse."

**9. Sending it.**

"It is in my Downloads folder. I email the SVG and paste the methods text into the response to
reviewers. Nothing was uploaded, the footer of the dialog says so and the top-left line says so.
Done."

## Single Ease Question

**6 out of 7.**

"Easy. The gray warning did the part I would have forgotten, and the side-by-side gray preview is
the check I would otherwise do with a printer. Not a 7 because the sign sits on glyphs that are
too small to read at the low-degree end, I cannot set the gray bin breaks, and the methods file
does not say how the layout was made."

## Would she use this instead of her current tool?

"For this job -- the one figure, under deadline, that has to survive a gray printer -- yes, I would
use this instead of Gephi's Preview tab plus matplotlib. It was faster and it told me the things I
normally find out after the reviewer does: which colour collides in gray, what the size means,
that the weight column was not used, which labels were dropped.

It does not replace the notebook. I would still want to drive this from code so the figure is
reproducible, and until the methods file includes the layout and its seed I would keep a
screenshot of the settings next to it, which is what I do with Gephi now. Fix those two and the
glyph-size problem and I would tell my students to use it."

## Problems, in her words, with severity (1 = cosmetic, 4 = blocks the task)

1. **Methods file does not record the layout** (algorithm, parameters, seed). "I cannot regenerate
   this picture after a revision, and I cannot answer 'why are these clusters close'." Severity 3.
2. **Sign carried by shape on glyphs sized by degree.** Low-degree proteins get triangles too small
   to read up from down at 174 mm; no minimum size in Print and no way to drop size for this file
   from the dialog. Severity 3.
3. **Palest gray step (0 to 0.8) holds 157 of 300 proteins** and risks vanishing on white paper;
   unclear from the preview whether those glyphs keep an outline. Severity 2.
4. **Gray bin breaks are fixed** (width 0.8) and their boundaries are written as closed ranges
   that share endpoints ("0 to 0.8, 0.8 to 1.6"). She wants to set breaks (for example 1 and 2 in
   log2) and see half-open intervals. Severity 2.
5. **Diverging scale with an asymmetric domain** (-2.52 to 3.15): no visible way to make it
   symmetric, so equal shades do not mean equal magnitudes on the two sides. Severity 2.
6. **Default red = down** is the opposite of most biology heatmaps; it is stated and reversible, so
   only a nuisance. Severity 1.
7. **Two "Look" controls** (style stack on the canvas, and "for this file only" in export) will
   confuse someone less experienced about which one the file uses. Severity 1.
8. **Layer name changed between screens** ("log2FoldChange color" vs "Fold change color").
   Severity 1.
9. **The starting colouring was betweenness, log scale**, and nothing indicated which view was
   meant to be the paper's figure; she had to decide to replace it. Severity 1.

## What pleased her

- "Nothing has been sent from this project" and "Nothing is uploaded" in the export footer.
- Attribute ranges next to column names in the picker; "from the data" vs "computed".
- Counts below and above the midpoint, and "the palest colour is 0, not missing".
- The gray-collision warning with a one-click fix, and the side-by-side "Printed in gray" preview.
- Journal widths (85 / 174 mm), 8 pt real text, vector SVG, labels by |change| with the hidden ones
  listed by name.
- The footer line saying the weight column is not used by anything in the figure.
- The methods file written next to the figure, ending with the graphty-element version.
