# Session: a figure a reviewer can read in gray -- Expert Emma

Participant: Expert Emma, network scientist (composite persona, study/personas/expert-emma.md).
Task as given by the moderator: "A reviewer wants a figure of this network they can read even
when printed in gray. Get it to them."
Screens, in the order she met them: screens/navigation (the app at rest and its project-name
menu), screens/styles-list (the style stack and its Look menu), screens/colour-by-value (a
signed column as colour), screens/export-dialog (figure, figure in the Print look), and
flows/export (the whole route, read at the end).
Renders she looked at: shots/r4-emma-reviewer-nav-new.png, r4-emma-reviewer-nav-new-menu.png,
r4-emma-reviewer-styles.png, r4-emma-reviewer-styles-looks.png, r4-emma-reviewer-cbv-numbers.png,
r4-emma-reviewer-export-figure.png, r4-emma-reviewer-export-figure-grey.png, flows__export.png.

Outcome: completed, with two real doubts left open (where the "no change" band came from, and
whether 300 triangles at 174 mm are legible at all). Single Ease Question: 5 of 7.

---

## 1. The app at rest (screens/navigation)

> "OK. 'Nothing has been sent from this project' under the project name. Good, that is the first
> thing I look for and it is right there, not in a footer. I will want to click it later and see
> what it counts as 'sent' -- does writing a file to Downloads count? Not now."

> "This is Les Miserables. The moderator said 'this network'. Fine, co-appearances, 77 nodes.
> Colour is 'Group color' -- ten categories. Ten categorical colours in gray is hopeless, I know
> that before I do anything. So either I change the encoding, or the tool has a trick."

> "Right panel, 'Style stack', and under it 'Look: Screen'. That is a dropdown. That is the first
> thing I would try. I am not going to hunt for a 'grayscale' checkbox in export if there is a
> look setting sitting there."

She did not open the rail buttons. She read the node table under the canvas for a second:

> "Degree column, '1 to 36'. Valjean 36. That matches what networkx gives for this dataset, so I
> will stop worrying about the numbers here."

## 2. The Look menu (screens/styles-list, the Looks state)

The render she was shown is on the protein interaction project, not Les Miserables.

> "Different graph now. ppi-core-300, 300 proteins. I will assume the moderator switched datasets
> on me; with the mocks I cannot tell whether that is the same project. I will do the task on
> this one, it is closer to what a reviewer would actually ask about anyway."

> "Look for the whole project: Screen, Print, High contrast. Print: 'Reads in gray on white paper
> and for colour-blind readers. Where a colour shows a direction, a shape shows it too.' That is
> the sentence I wanted. 'Where a colour shows a direction.' So it knows the difference between a
> diverging scale and a categorical one. Or it claims to."

> "And what about categories? My Les Miserables groups have no direction. The menu does not say
> what Print does to ten categories. Probably nothing. I would guess the honest answer is 'use
> shape for up to five and give up after that', and I would rather it said so here."

> "'Colors you set by hand are kept.' Fine. That is a warning in disguise: the one node I painted
> red for the client will still be red, i.e. mid-gray. OK."

She would pick Print here, on the canvas, before exporting.

> "Here the colour is betweenness on a log scale, orange to brown, sequential. Sequential in gray
> is fine as long as the ramp is monotone in lightness. Orange to brown probably is. So for this
> layer Print should change nothing, or nothing important."

## 3. Colour by a signed column (screens/colour-by-value)

> "log2FoldChange, red to blue, diverging at midpoint 0. It chose diverging without being asked
> because the column has both signs. Good. Midpoint box says 0, I can change it. Histogram of the
> domain with the ramp under it -- nice, I can see where the mass is."

> "Legend: 'Below 0: 148, Above 0: 152, No value or unstyled: 0'. Counts with a denominator. I
> like that. 148 plus 152 is 300."

> "Now the gray problem: pale red and pale blue both go to near-white. Every diverging palette
> has that. The thing that tells me whether this tool understands that is whether I can say
> 'within plus or minus x of zero is no change'. I see Scale, Palette, Domain, Midpoint, No value.
> I do not see a no-change band. Hm."

She looked again at the popover.

> "No. Midpoint only. OK, remember that."

## 4. Opening Export (screens/navigation, project-name menu)

> "Project-name menu, 'Export...  Ctrl+Shift+E'. There is a shortcut and it is written in the
> menu. That is how I will open it every time after today. Also 'Download project file' as a
> separate item from Export -- fine, that is a different thing, the whole project."

## 5. The Export dialog, Screen look (screens/export-dialog, figure)

> "Scope: 'Full graph: 300 nodes. The filter chip's scope, until you change it here.' Good. I have
> had Gephi export only the visible part without telling me."

> "Figure (.svg), 'Vector, with real text'. 174 mm, two columns; also 85 mm one column, 254 mm
> a slide. Somebody here has submitted to a journal. White background. Legend beside, right.
> Labels 'Top N by this layer's value', N = 10, by |log2 fold change|. Absolute value, good, not
> the ten most positive. '2 labels hidden to avoid overlap: show list.' Honest."

> "The footer inside the figure: 'Degree: exact, not normalized, on the full graph (300 proteins,
> 1,262 interactions). Weight: confidence not used yet; no measure here reads a weight.' That is
> the sentence I write by hand in every figure legend. It is already written. I would trim it for
> the journal, but I would rather trim than type."

> "And under the preview: 'Values just above and below 0 print as the same gray.' With a button,
> 'Use Print look'. So it actually checked. I did not have to know. That is the thing that would
> have saved one of my students a revision round."

> "Look control here says Screen. If I had set Print on the canvas in step 2, would it say Print
> here? I do not know. If it opens at Screen after I set Print for the whole project, I would be
> annoyed and slightly suspicious of which one wins. Two Look controls in two places need to agree
> or say which one the file takes."

The methods text box:

> "figure-methods.txt. Data file name, 300 proteins, 1,262 interactions, undirected, loaded date,
> scope, colour column 'from the file', linear, diverging at 0, the range. Size: degree, exact, not
> normalized. Drawn with graphty-element 2.6.2. That is a methods paragraph. That goes in the
> supplement as is. Good."

## 6. The Print look (screens/export-dialog, figure in gray)

She clicked Print (the render after Use Print look).

> "Two previews: 'The file, as written' and 'Printed in gray, the same file'. Side by side. Yes.
> That is exactly what I would otherwise do by printing to PDF and desaturating in Preview."

> "Triangles up for increases, down for decreases, a circle for no change. Darkness is distance
> from zero, same scale both sides. Right, that is the correct encoding -- sign on shape, magnitude
> on lightness. I would have done that in matplotlib with two scatter calls and a lot of swearing."

> "Check: 'Increases and decreases stay apart in gray (120 below 0, 133 above, 47 within 0.25 of
> 0 drawn as no change).' Wait. Within 0.25 of 0. Who said 0.25?"

> "I did not set 0.25. The colour popover had no such field -- I looked. So 0.25 is a default
> somebody chose. In log2 that is a 1.19-fold change. My collaborators use 0.58, 1.5-fold, or 1,
> 2-fold. A reviewer will ask why 47 genes are drawn as 'no change'. I need to answer 'because we
> said so, here is the threshold', not 'because the tool picked 0.25'."

> "And I cannot see where to change it in this dialog either. Width, background, legend, labels,
> N. No band. So the one parameter that decides what the figure claims is the one I cannot see
> the control for. That is precisely the thing I get cross about."

She reconciled the counts.

> "Screen legend said 148 below, 152 above. Print says 120 below, 133 above, 47 in the band.
> 120 + 47 + 133 = 300. So 28 of the negatives and 19 of the positives went into the band. The
> numbers add up; fine. But the methods text now says both: '148 below 0, 152 above' and then
> 'Print look: ... no change within 0.25 of 0'. The file's own legend says 133 / 120 / 47. If a
> reviewer reads the methods and the legend side by side they will see two sets of counts. I
> would want the methods line to give the same three numbers the legend gives."

On legibility of the drawing itself:

> "Now the honest question. 300 nodes at 174 mm with triangles. In the gray preview the middle is
> a dark mat of overlapping triangles. The ten labelled genes read. The rest is texture. That is
> not the tool's fault, that is a force-directed layout of 300 nodes, and I would tell the
> reviewer the figure shows the named genes and the distribution, not the structure. The legend
> should not pretend otherwise -- and it does not, it says nothing about the layout. I would
> actually like one line: 'positions from a force-directed layout; distance is not meaningful'.
> I would add that myself."

> "Hidden list: MRE11 +2.35, RPL17 -2.25. Two of my top ten are unlabelled. For a paper I would
> want to force those two and drop two weaker ones, or nudge. I do not see a way to pin a label.
> I would probably accept it and name them in the caption. Deadline."

## 7. Export

> "'2 files go to your Downloads folder. Nothing is uploaded.' Export 2 files. The SVG and the
> methods text. Done. I would open the SVG in Inkscape to check the text is text and not paths --
> it says 'real text', I will believe it after I have checked once."

## 8. The flow page (flows/export), read at the end

She skimmed the flow page's text rather than the diagram.

> "The flow describes the analyst typing 0.58 into 'No change within' in the layer's midpoint row.
> That row is not on the colour screen I was shown. So the design has the control and the screen
> lost it, or the screen is older. Either way, on what I saw, I could not have set it."

> "'Where scripting the same export would start is marked, but it goes nowhere yet.' At least it
> says so instead of a greyed-out button. I would still rather have `element.exportFigure({look:
> 'print', width: 174})` from the notebook. Then the 0.25 would be an argument I can see."

---

## Single Ease Question

**5 of 7.** "Getting the file out was a 2: menu, shortcut, one dialog, the gray check did the
thinking. It loses points for the no-change band I never set and could not find, and for not
knowing whether the project's Look and the dialog's Look are the same setting."

## Would she use this instead of her current tool?

> "For this job -- one figure that survives a gray printer, with a methods paragraph -- yes, over
> Gephi's Preview tab, which does not check anything, and over matplotlib, which would take me an
> evening to get the shape-for-sign encoding right. I am not saying I like it. I would stop using
> it the day a reviewer asked me why 47 genes are circles and I had to answer 'the tool's default'.
> Show me the band, let me type 0.58, and put it in the methods file, and this is my figure tool."

---

## Problems observed (moderator's notes)

1. The Print look draws a "no change" band (0.25 around 0) that the analyst never set and could
   not find: the colour-by-value popover has Midpoint and No value but no No change within, and
   the Export dialog's figure settings have no band either. The flow page says the field exists
   in the layer's midpoint row; the screen does not show it. For this persona this is the
   deciding defect: an unseen default decides what the figure claims. (severity 3 of 4)
2. The methods text in the Print look gives the Screen split (148 below 0, 152 above) and then
   the band, while the figure's own legend gives three counts (120, 133, 47). Two sets of numbers
   for one figure. (severity 2)
3. Two Look controls (project-wide in the style stack, per-file in the Export dialog) with no
   statement of how they relate; the dialog opened at Screen and she did not know whether a
   project set to Print would carry over. (severity 2)
4. The Print look's menu text explains what it does for a direction (diverging colour) but says
   nothing about categorical colour, which is the common gray-print failure (her Les Miserables
   groups). (severity 2)
5. No way to force a hidden label (MRE11, RPL17 are two of the ten strongest changes). She would
   accept it under deadline but noted it. (severity 1)
6. The mocks switch datasets between screens (Les Miserables, then the protein project); she
   carried on but said she could not tell whether it was the same project. A study artefact, not
   a product defect. (severity 1)

## What worked for her

- The gray check under the preview names the failure ("values just above and below 0 print as
  the same gray") and offers the fix in one click.
- The side-by-side preview: the file as written and the same file printed in gray.
- Sign on shape, magnitude on darkness, same scale both sides: the encoding she would have built
  by hand.
- The footer and methods text already say how degree was computed and that no weight was used.
- Scope stated at the top of the dialog; journal widths offered in mm; "Nothing is uploaded"
  next to the Export button; Ctrl+Shift+E written in the menu.
