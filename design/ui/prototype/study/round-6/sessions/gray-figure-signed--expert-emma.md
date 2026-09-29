# Session: a gray-print figure of fold changes, and which genes went up most -- Expert Emma

**Participant:** Expert Emma (network scientist, lives in notebooks, uses Gephi for the final
figure and resents it). See study/personas/expert-emma.md.

**Task as given by the moderator:** "Make a black-and-white figure of the fold changes for a
journal that prints in gray, and tell me which genes went up the most."

**Pages worked through (participant view):** screens/styles-list.html (base, looks),
screens/colour-by-value.html (choose, numbers, legend), screens/export-dialog.html (figure,
figure-grey, done), screens/table-dock.html (base, ranked, header, out),
screens/inspector.html (one-node).

**Renders looked at (in shots/):** r6-emma-gfs-styles-list.png, r6-emma-gfs-styles-list-looks.png,
r6-emma-gfs-colour-by-value-choose.png, r6-emma-gfs-colour-by-value-numbers.png,
r6-emma-gfs-colour-by-value-legend.png, r6-emma-gfs-export-dialog-figure.png,
r6-emma-gfs-export-dialog-figure-grey.png, r6-emma-gfs-export-dialog-done.png,
r6-emma-gfs-table-dock.png, r6-emma-gfs-table-dock-ranked.png, r6-emma-gfs-table-dock-header.png,
r6-emma-gfs-table-dock-out.png, r6-emma-gfs-inspector-one-node.png. Enlarged crops of the two
figure previews: tmp/emma-gfs-r6/grey-zoom.png and tmp/emma-gfs-r6/file-zoom.png.

---

## Think-aloud transcript

### 1. Orientation

> Stress response study, ppi-core-300. 300 nodes, 1,262 edges, 3 components, density 0.0281.
> "Nothing has been sent from this project" under the name, and "Assistant Off. Nothing is
> sent." on the rail. Fine. I will check it again at the export, that is where it matters.
>
> Style stack: Betweenness color on top, Hub labels, Size: degree, Base style. There is a
> "Look: Screen" dropdown next to the stack header now. Noted. I do not want betweenness in this
> figure, I want fold change.

### 2. Coloring by the fold change column

On colour-by-value, "choose":

> New layer, Fill, the little grid button next to the color. "Color: apply a color or a value."
> From the data: log2FoldChange, numbers, -2.52 to 3.15; module, categories, 9. Computed:
> degree, betweenness. Not computed: closeness, "a few seconds". Good, it separates what is in
> my file from what it computed and does not pretend closeness is free. I pick log2FoldChange.

On "numbers":

> It went straight to linear, diverging, Red to blue, midpoint 0. It did that because the column
> is signed; I did not have to ask. Histogram of the domain under the ramp. "No value: 0 nodes,
> not painted." Canvas legend: "Linear, diverging at 0. The palest color is 0, not missing."
> Below 0: 148, above 0: 152. 148 + 152 = 300. Good.
>
> Red is down, blue is up. Every biologist I work with has red as up. "Use Reverse for the
> opposite" -- fine, there is a button, it tells me which way it goes. Not my fight today.
>
> And again the Attributes list on the right lost betweenness once the color layer went on.
> It was there on the previous state. Probably the mock, but it is exactly the kind of thing
> that makes me count columns.
>
> My real worry: red-to-blue in gray is one gray ramp that folds over at 0. +2 and -2 print the
> same. Let's see if it knows.

### 3. The Look menu on the style stack

On styles-list, "looks":

> "Look for the whole project": Screen, Print, High contrast. Print: "Reads in gray on white
> paper and for color-blind readers. Where a color shows a direction, a shape shows it too."
> That is the right idea -- sign as shape. "Colors you set by hand are kept."
>
> I am not switching the whole project to Print; I do not want to work on triangles all
> afternoon. I will do it at the export if the export lets me.

### 4. Export, Screen look first

On export-dialog, "figure":

> Figure (.svg), vector with real text, 174 mm two columns, white, legend beside right, labels
> top N by this layer's value, N = 10 "by |log2 fold change|". "Look, for this file only:
> Screen / Print / High contrast. File is written with: Screen look." OK, so this one is per
> file, and the one on the style stack is for the project. Two scopes for the same word. I get
> it, but a student will set it in one place and wonder why the other did not change.
>
> The warning is there under the preview: "Values just above and below 0 print as the same
> gray." with Use Print look right next to it. Good, it caught what I said a minute ago.
>
> Footer: "2 files go to your Downloads folder. Nothing is uploaded." That is the sentence I
> look for. Methods file beside the figure: data file, 300 proteins, 1,262 interactions,
> undirected, loaded date; Color: log2FoldChange from the file, linear, diverging at 0, -2.52 to
> +3.15, 148 below, 152 above; size is degree, exact, not normalized, full graph; weight
> "confidence, not used yet"; labels top 10 by |log2FoldChange|, 8 drawn, 2 hidden (MRE11,
> RPL17); graphty-element version. That is the figure caption I usually write at 11 pm, and it
> is right.

### 5. Print look

On "figure-grey", after Print:

> "Print: sign as a triangle, size of the change as 4 gray steps a side. No two of its 8
> categories print as the same gray." Two previews: "The file, as written" and "Printed in
> gray, the same file".
>
> Legend table: |change| steps 2.4 to 3.2, 1.6 to 2.4, 0.8 to 1.6, 0 to 0.8, with counts down
> and up. Down: 2 + 13 + 48 + 85 = 148. Up: 3 + 22 + 55 + 72 = 152. Those are the same 148 and
> 152 as the screen legend. Good. Last time there was a "within 0.25 of 0 is no change" band
> that nobody set, with a different set of counts. It is gone. Nothing is called "no change"
> any more; every node is up or down. That is honest. I can put a threshold in the caption
> myself if the biologist wants one.
>
> "Increases and decreases stay apart in gray (148 below 0, 152 above): the triangle carries
> the sign." And a strip printing the gray at each step with its |log2 fold change| range. That
> answers my referee question from before -- where are the breaks. They are printed. Fine.
>
> Now the complaints.
>
> One. I asked for black and white. "The file, as written" is still red and blue triangles. The
> gray one is labelled as what a gray printer will make of that file. For most journals that is
> actually what I want -- color online, gray in print, one file. But if the author guidelines
> say "submit figures in grayscale", I have no switch for it. I would open the SVG in Inkscape
> and desaturate, which is five minutes, but it is five minutes this was supposed to save me.
> At least it is honest: the gray preview says "the same file", it does not pretend the file is
> gray.
>
> Two. Who chose 0.8-wide steps? Four equal steps from 0 to 3.2. That is 3.2 = 4 x 0.8, so it is
> evidently "equal width up to the largest magnitude, rounded". I cannot see a control for the
> step edges or the number of steps. For fold changes people think in 1 (two-fold) and 0.58
> (1.5-fold); I might want edges at 1 and 2. Not fatal -- the edges are stated -- but I cannot
> set them. And "0 to 0.8" then "0.8 to 1.6": which side is 0.8 on? A referee will not ask, a
> reviewer who counts will.
>
> Three. In the gray zoom, the small triangles are specks. Size is still degree, so the
> degree 0-1 genes are tiny triangles and I cannot tell up from down on them at this preview
> size. At 174 mm printed it may be fine; I would want to see it at 100%. The dialog says the
> figure is shown at 76% of print size, so at least it tells me. Also the size legend is still
> circles, 0-1 to 17-34, while every mark is now a triangle. Triangle area is not circle area
> at the same "size". Minor, but it is a legend.
>
> Four. Near-zero genes. A gene at +0.02 is a pale up triangle, same shape as a gene at +0.7.
> That is correct -- it is up -- and the lightness says it is small. I would rather have that
> than a band someone invented. Fine.

### 6. Which genes went up the most

> The figure labels are the ten largest |changes|, up and down mixed. For the figure that is
> right. For "which went UP most" it is not the answer: no values on the labels, and I read the
> direction off a triangle.
>
> What I can read: the legend says 3 genes are up by 2.4 to 3.2. In the gray zoom the dark up
> triangles with labels are CHEK1, WRN and SNRNP70. So my answer from the figure is "CHEK1,
> WRN and SNRNP70, each between +2.4 and +3.2", and MRE11 at +2.35 is next -- that one only
> because the hidden-label list prints its value. Which of the three is the +3.15 maximum, the
> figure does not say. I would not put that sentence in a paper from a picture.
>
> So, the table. Table dock, "ranked": Human protein interactions, sorted by pagerank. Columns
> id, module, community, degree, betweenness, pagerank with ranks. No log2FoldChange column.
> The column header menu (header state) has Sort descending / Sort ascending, so if I had the
> column I would sort it descending and be done. But I cannot find how to show it. "New column"
> in that menu is for computed columns, I assume, not for hiding and showing. The inspector for
> TP53 shows log2FoldChange -0.84 for one node, which is no help for a ranking.
>
> The Export table dialog (out state) says "Columns: 10, hidden ones included", and the CSV
> header ends in log2FoldChange. So the column exists and is hidden in the table. Right. I
> would export the CSV and do `df.sort_values("log2FoldChange", ascending=False).head(10)` in
> the notebook. That takes me thirty seconds and it is what I would do anyway, but the
> moderator asked me to tell you from this tool, and in this tool I can give you three names
> and a range, not a ranked list with values.
>
> Also: the CSV ships with a methods file and says "N of M rows". Good. Plain ids. Good.

### 7. After export

On export-dialog, "done":

> Toast: "Exported stress-response-study_figure.svg and its methods file, in the Print look."
> Data panel: "Sent and saved" lists the figure, "and its methods file, Print look. Today 19:12,
> to Downloads". Style stack still says Look: Screen. Right -- for this file only. Consistent.
> The layer is called "Fold change color" here and "log2FoldChange color" on the earlier
> screen. Same layer, two names. Mock slip, probably.

---

## Answer given to the moderator

"The figure: yes, done -- SVG, 174 mm, Print look, sign as triangles, four gray steps each side
with the edges and counts printed, methods file beside it. It is a color file that survives
gray printing, not a grayscale file; if the journal demands grayscale I would desaturate it
myself. Went up most: from the figure, CHEK1, WRN and SNRNP70 are the three genes above +2.4
(the legend says three), with MRE11 next at +2.35. I cannot tell you which of the three is the
top one, +3.15, from these screens -- the fold change column is hidden in the table. I would
get the ranked list from the CSV in pandas."

## Single Ease Question

**5 of 7.**

The figure half is a 6: it knew the diverging-in-gray problem before I said it, fixed it in one
click, printed the step edges and counts that reconcile with the screen legend, dropped the
made-up "no change" band, and wrote my caption for me. The "which went up most" half is a 3:
the one place that should answer it -- a table sorted by the signed column -- does not show the
column, and the figure only gives me names in a range.

## Would I use this instead of my current tool?

For the figure, yes, instead of Gephi's Preview tab. This is faster than fighting Preview, and
the methods file is something Gephi has never given me. I am not saying I like triangles.

For the ranking, no, and I would not expect to: I export the CSV and sort in pandas. But then
show me the column in the table, because the biologist I hand this to does not have pandas.

---

## Problems observed

| Screen | Problem | Severity (0-4) |
|---|---|---|
| table-dock (ranked, out) | log2FoldChange is a hidden column in the node table; no visible way to show it, so "which went up most" cannot be answered by sorting by the signed value in the tool. The CSV has it. | 3 |
| export-dialog (figure-grey) | The file is still written in color; asked for black and white. The gray preview is only a check. No grayscale file option for journals that require one. | 2 |
| export-dialog (figure-grey) | The four gray step edges (0.8 wide, up to 3.2) cannot be set, and which step a boundary value (0.8, 1.6) falls in is not stated. | 2 |
| export-dialog (figure-grey) | Labels (top 10 by absolute change) carry no values and mix up and down, so the figure names candidates but cannot say which gene is the maximum. | 2 |
| export-dialog (figure-grey) | Small-degree marks become tiny triangles whose direction is unreadable in the preview; the size legend still shows circles while the marks are triangles. | 2 |
| styles-list (looks) vs export-dialog | "Look" is "for the whole project" on the style stack and "for this file only" in Export; the same word at two scopes. | 1 |
| colour-by-value (numbers) | Betweenness disappears from the Attributes list after adding the color layer. | 1 |
| export-dialog (done) vs colour-by-value | Same layer named "Fold change color" in one place and "log2FoldChange color" in another. | 1 |
| colour-by-value (numbers) | Red is down, blue is up by default; biology convention is the reverse (Reverse exists and is stated). | 1 |

## What worked

- The signed column went to a diverging scale at 0 without asking, with counts below and above
  0 that add to the node count.
- The export dialog flagged "values just above and below 0 print as the same gray" before
  export, with the fix one click away.
- Print look: sign as shape, darkness as magnitude, same steps both sides, edges and counts
  printed; counts reconcile with the screen legend (148 and 152). No invented "no change" band.
- The methods file: data, scope, scale, midpoint, normalization, weight answer, hidden labels,
  graphty-element version. A caption I can paste.
- "2 files go to your Downloads folder. Nothing is uploaded." and the Sent and saved record.
