# Session: a gray-print figure of fold changes, and which genes went up most -- Expert Emma

**Participant:** Expert Emma (network scientist, lives in notebooks, uses Gephi for the final
figure and resents it). See study/personas/expert-emma.md.

**Task as given by the moderator:** "Make a black-and-white figure of the fold changes for a
journal that prints in gray, and tell me which genes went up the most."

**Pages worked through:** screens/styles-list.html, screens/colour-by-value.html,
screens/export-dialog.html, flows/export.html, screens/table-dock.html (participant view).

**Renders looked at (in shots/):** r4b-emma-gf-styles.png, r4b-emma-gf-styles-looks.png,
r4b-emma-gf-styles-top-n.png, r4b-emma-gf-cbv-base.png, r4b-emma-gf-cbv-choose.png,
r4b-emma-gf-cbv-numbers.png, r4b-emma-gf-ex-figure.png, r4b-emma-gf-ex-figure-grey.png,
r4b-emma-gf-ex-table.png, r4b-emma-gf-flow-full.png, r4b-emma-gf-td-base.png,
r4b-emma-gf-td-ranked.png, r4b-emma-gf-td-header.png. Zoomed crops of the two figure previews
are in tmp/emma-grayfig/.

---

## Think-aloud transcript

### 1. Where am I, and is anything leaving the machine

> Stress response study, ppi-core-300, 300 nodes, 1,262 edges, three components, density
> 0.0281. Fine, the counts are up front, good. Under the project name: "Nothing has been sent
> from this project". The rail says "Assistant Off. Nothing is sent." OK. I will hold them to
> that later, at the export.
>
> Not my data, obviously -- this is a biology collaborator's protein set with a fold change
> column. Which is exactly the kind of job I get: "can you make the network figure for the
> paper, the journal prints in gray".

### 2. Finding the fold change column

> Right panel, Attributes: module (9 values), log2FoldChange -2.52 to 3.15, degree 0 to 34,
> betweenness 0 to 0.138. So the column is there and it is signed. -2.52 to +3.15 is not
> symmetric, noted.
>
> There is a style stack with Betweenness color, Hub labels, Size: degree, Base style. I do not
> want betweenness on this figure. I would hide that layer and add one for fold change.

On screens/colour-by-value.html (base and "choose"):

> New layer, "Style layer 1", Applies to All nodes, Fill with a grey 808080. The little four-dot
> button next to Fill opens "Color: apply a color or a value". Palette colors, then "From the
> data": log2FoldChange, numbers, -2.52 to 3.15. Computed: degree, betweenness. Not computed:
> closeness, "a few seconds". Fine. It tells me what is data and what is computed, and it does
> not pretend closeness is free. I pick log2FoldChange.

On the "numbers" state:

> It went straight to a diverging scale at 0, linear, "Red to blue". Histogram of the domain,
> -2.52 to 3.15, midpoint 0, "No value: 0 nodes, not painted". Legend on the canvas: "Linear,
> diverging at 0. The palest color is 0, not missing." Below 0: 148, above 0: 152. Those add
> to 300. Good, I can reconcile that.
>
> Red is down and blue is up. My biology people would want it the other way round -- red is up
> in every heatmap they have ever made -- but there is a Reverse button. Not my fight.
>
> Small thing: on this state the Attributes list lost betweenness. It was there a second ago.
> Did adding a colour layer drop a computed column? Probably a mock slip, but it is the kind of
> thing that makes me check column counts.
>
> Now the real problem, before I even export: a red-to-blue diverging ramp in gray is useless.
> Pale red and pale blue are the same light gray, dark red and dark blue are about the same dark
> gray. So on paper you cannot tell up from down at all. Let me see if it knows that.

### 3. The Look menu in the style stack

On screens/styles-list.html, "looks" state:

> "Look for the whole project": Screen, Print, High contrast. Print: "Reads in gray on white
> paper and for color-blind readers. Where a color shows a direction, a shape shows it too."
> OK -- that is actually the right idea. Shape for the sign. "Colors you set by hand are kept."
>
> I will not flip it here yet; I would rather see what the export does. I do not want my
> screen view turning into triangles while I work.

### 4. The Export dialog

On screens/export-dialog.html, "figure" state:

> Opened from the project-name menu. Scope: Full graph, 300 nodes. Figure (.svg), "Vector, with
> real text." 174 mm, two columns; also 85 mm and a slide. White background. Legend beside,
> right. Labels: Top N by this layer's value, N = 10, "by |log2 fold change|". 2 labels hidden
> to avoid overlap, show list. Footer: "2 files go to your Downloads folder. Nothing is
> uploaded." Good. That is the sentence I look for.
>
> And there it is under the preview: "Values just above and below 0 print as the same gray."
> with a Use Print look button. Fine. It caught the problem I just described. I respect that.
>
> The methods text beside it: data file, 300 proteins, 1,262 interactions, undirected; colour
> is log2FoldChange from the file, linear, diverging at 0; 148 below, 152 above; "Size: degree
> (number of interactions), exact, not normalized, full graph. Weight: confidence, not used yet;
> no measure in this figure reads a weight." And the graphty-element version. That is a figure
> legend I can paste into a supplement. This is the part I usually write by hand at 11 pm.

"figure-grey" state, after Use Print look:

> Two previews side by side: "The file, as written" and "Printed in gray, the same file". Up
> triangles above, down triangles below, hollow circles for no change. Darker is a larger change
> on both sides. The check line: "Increases and decreases stay apart in gray (120 below 0, 133
> above; 47 within 0.25 of 0 drawn as no change)." 120 + 133 + 47 = 300. And 148 - 120 = 28,
> 152 - 133 = 19, 28 + 19 = 47. The numbers reconcile with the screen legend. Good.
>
> But wait. Within 0.25 of 0? Who set 0.25? I did not. The colour layer only had a Midpoint
> field and a No value field -- there was no "no change" band anywhere. So the Print look
> invented a threshold, and that threshold decides which 47 genes the figure calls "no change".
> That is a claim about the data, printed in the legend of a journal figure. A log2 fold change
> of 0.25 is about 1.19-fold; most biologists I work with use 1 (two-fold) or 0.58 (1.5-fold).
> I need to see where that default comes from and I need to be able to set it. Right now I
> cannot find the control. This is the "default parameter values that are not shown" thing,
> except it is shown, in the legend, and not settable, which is almost worse.
>
> The flow page (flows/export.html) says she "types 0.58 into No change within" in the layer's
> midpoint row. That row is not on the colour-by-value screen I just used. So either the
> screen is behind the flow, or the flow is fiction. I am going by the screen.
>
> Second thing. I asked for a black-and-white figure. "The file, as written" is still red and
> blue triangles. Only the second preview is gray, and that is labelled as what a gray printer
> will do. So what I would send the journal is a colour file that happens to survive gray
> printing. For most journals that is fine -- online is colour, print is gray -- but if the
> author guidelines say "submit in grayscale" I have no option to write the file in gray. I
> would have to open the SVG in Inkscape and desaturate it, which defeats the point.
>
> Third: the legend. Three darkness steps for up, three for down, and the only numbers are
> "+0.25 to +3.15" and "-0.25 to -2.52". Where are the breaks between the steps? A referee will
> ask. "Darker is a larger change" is not a scale.
>
> Fourth, smaller: the size legend is circles, 0-1 up to 17-34, but the marks are now triangles.
> Triangle area and circle area are not the same thing at the same "size". And at 174 mm the
> degree 0-1 triangles are specks -- in the gray zoom I cannot tell up from down on the small
> ones. The sign is only readable on the big nodes. For a figure whose whole point is the sign,
> that is a problem for low-degree genes. Maybe put a floor on mark size in Print.

### 5. Labels, and the second half of the question

> Labels are "the 10 largest changes", by |log2 fold change|. That mixes up and down. For the
> figure that is actually right -- you want the strongest effects named either way. But the
> moderator asked which genes went UP the most. The figure does not answer that. I get names,
> no values, and I have to read the direction off the triangle next to each name.
>
> From the preview: CHEK1, WRN and SNRNP70 sit on dark up triangles (dark blue in the colour
> file). MAPK10, E2F1, NDUFS5 and RPS6 look like dark down triangles. MAPK2 is ambiguous -- the
> label sits between a blue and a red node, I cannot tell which it names. The hidden list gives
> the only two actual numbers: MRE11 +2.35 and RPL17 -2.25. So MRE11 is up, and it is not even
> drawn.
>
> The maximum is +3.15. Which gene is +3.15? The figure does not say. Presumably one of CHEK1,
> WRN, SNRNP70, but I am reading pixels. I would not put that in an email to a PI.
>
> Is there an "up only" option? The N field says "by |log2 fold change|" in grey text -- it does
> not look like I can change it to signed. "Also: Above a threshold" -- maybe that one lets me
> say "> 1"? Unclear, it is a hint line, not a control.
>
> On the styles list, the Hub labels layer has "Top 12 by degree" with the names spelled out:
> "MAPK1, TP53, CDK1, YWHAZ, AKT1 and 7 more." I could make a layer "Top 10 by
> log2FoldChange" and it would list the first five and "and 5 more". That is a signed top-N, so
> that would be up. It is a workaround via a label layer, but it would work. I still would not
> get values.

### 6. The table

> The obvious place is the table: sort log2FoldChange descending, read the top ten with values.
> screens/table-dock.html: the base state is Les Miserables. The ranked state is "Human protein
> interactions", 300 nodes -- same size, different project name, different graph name
> ("Interactions" not "ppi-core-300"), and the columns are module, community, degree,
> betweenness, pagerank. No log2FoldChange column. The header menu has Sort descending, Filter
> to..., Color by, Size, New column, Join. So I assume I could add the column and sort it. I
> am assuming. Nothing shows me this project's fold change column in the table.
>
> Honestly, if it were real, I would not be in the table. I would do
> `df.sort_values("log2FoldChange", ascending=False).head(10)` in the notebook where the file
> already is. Ten seconds. The table would be fine if it showed the fold change column with its
> rank, the way it shows "degree ... rank #2 of 300".
>
> Export table (.csv) exists, with a methods file that is "always written beside it". The
> example is some fraud case, not mine, but the shape is right: header names the scope, rows
> ordered by the column, no comment lines to break read_csv. I like that.

### 7. The flow page, read against the screens

> The flow tells the same story on what it says is the same project, and none of the numbers
> match. Flow: 84 proteins with a fold change from a joined qPCR file, filtered graph 1,059 of
> 1,262 interactions, 48 below 0, 36 above, band 0.58, top genes PSMA2 up and GSK3B down.
> Screens: 300 proteins, fold change from the file, full graph, 148 below, 152 above, band 0.25,
> labels CHEK1, WRN, MAPK10 and friends. Its "See it" link in step 3 points at a figure-signed
> state the export dialog does not have.
>
> I know these are mocks. But if the product ever showed me 48/36 in one place and 148/152 in
> another for "the same" figure, that is the end of the session. Same data, same action, two
> answers.
>
> And step 6 of the flow says "Which genes went up? The ones whose triangles point up." That is
> not an answer to "which went up the most". That is an answer to "which went up".

### 8. My answer to the moderator

> The figure: yes. Print look, 174 mm, white, legend right, SVG plus the methods text. I would
> export that and, with caveats, send it. The caveats: I would want to set the no-change band
> myself (0.58 or 1, not 0.25), I would want the darkness breaks printed in the legend, and I
> would want an option to write the file in gray if the journal asks for grayscale submission.
>
> Which genes went up the most: from what I can see, CHEK1, WRN and SNRNP70 are the darkest up
> triangles, and MRE11 is at +2.35 but its label was hidden. I cannot tell you which one is the
> +3.15 maximum and I cannot give you a ranked list with values from these screens. I would get
> that from pandas.

---

## Single Ease Question

**4 out of 7.**

> The figure part alone would be a 6. It found the gray problem before I printed anything, the
> fix is one button, the side-by-side gray preview is exactly the check I would otherwise do by
> printing a page, and the methods text is better than what I write. The "which went up most"
> part is a 2: the figure mixes up and down on purpose, the values are not on it, and the table
> I would sort does not show this data. Averaged honestly, 4.

## Would I use this instead of my current tool?

> For the figure: yes, over Gephi's Preview tab, if the no-change band is mine to set and the
> legend prints its breaks. It keeps the data local, says so in the footer, and hands me a
> vector file and a methods paragraph in one go. That is my adoption bar and it clears it,
> conditionally. OK, this is actually faster than fighting Gephi. I am not saying I like it.
>
> For the question "which genes went up most": no. That is a sort on a column, and I already
> have the column in a DataFrame. I would use this if the table showed the column with a rank
> the way it shows degree, but I would still check it in pandas.

---

## Problems observed (for the designers; in the participant's words where quoted)

1. **The Print look invents a no-change band nobody set.** The export's Print look draws 47
   genes as "no change: within 0.25 of 0" and prints that in the legend, but the colour layer
   offers only Midpoint and No value; there is no control for the band anywhere on the screens.
   The flow describes a "No change within" field that the colour-by-value screen does not have.
   "A threshold I did not choose, printed in the legend of a journal figure." Severity 4.
2. **"Which went up most" is not answerable from these screens.** Labels are top N by absolute
   change, with no values; the only values shown are for the two hidden labels; the table dock
   mock is a different project with no fold change column. "I am reading pixels." Severity 4.
3. **The flow and the screens give different numbers for the same figure.** 84 proteins, 48/36,
   band 0.58, 1,059 of 1,262 interactions, PSMA2 and GSK3B in the flow; 300 proteins, 148/152,
   band 0.25, full graph, CHEK1 and MAPK10 on the screens. The flow's step 3 links to an export
   state (figure-signed) that does not exist. Severity 3.
4. **The Print-look file is still in colour.** The task was a black-and-white figure; "The file,
   as written" is red and blue triangles and only the second preview is gray. There is no option
   to write the file in gray for a journal that asks for grayscale submission. Severity 3.
5. **The darkness steps have no breaks in the legend.** Three steps each side, labelled only
   "+0.25 to +3.15" and "-0.25 to -2.52" and "darker is a larger change". "A referee will ask
   where the steps are." Severity 3.
6. **Label direction cannot be chosen.** N is fixed "by |log2 fold change|" (grey text, not a
   control); there is no "largest increases" option. A signed top-N exists only on the styles
   list's label layer ("Top 12 by degree"). Severity 2.
7. **Small marks lose the sign.** At 174 mm the degree 0-1 triangles are too small to show which
   way they point, and the size legend is drawn with circles while the marks are triangles.
   Severity 2.
8. **Two Look controls.** One in the style stack for the whole project, one in the export
   dialog; the screens do not say which wins or whether the export follows the project's Look.
   Severity 2.
9. **Attributes list drops betweenness** on the colour-by-value numbers state (present on the
   choose state), and the panel heading is "Statistics" on one page and "Overview" on another.
   "Makes me check column counts." Severity 1.
10. **Red for down, blue for up** is the reverse of what her biology collaborators expect; Reverse
    exists, so this is a default, not a blocker. Severity 1.

## What worked for her

- "2 files go to your Downloads folder. Nothing is uploaded." in the export footer, and
  "Nothing has been sent from this project" under the project name.
- The gray check named the real problem ("Values just above and below 0 print as the same
  gray") before anything was printed, with a one-button fix.
- The side-by-side "as written" and "printed in gray" previews at print size.
- The counts reconcile: 148/152 on the canvas legend, 120/133/47 in Print, all summing to 300.
- The methods text: data file, direction, scale, "degree exact, not normalized", "weight not
  used", the graphty-element version -- ready for a supplement.
- The hidden-label list names the hidden genes with their values.
- The colour picker separates columns from the data, computed results and not-yet-computed
  measures, with an honest cost ("a few seconds").
