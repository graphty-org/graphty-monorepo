# Session: a reviewer's greyscale, colour-blind-safe figure -- Dr. Chen, computational biologist

Task as given by the moderator: "A reviewer wants the fold-change figure in greyscale, readable by a
colour-blind reader, with the top 10 labelled."

Screens, in the order she met them: the styles list (the project "Stress response study", 300
proteins, 1,262 interactions), colouring by a value, and the Export dialog. Renders she looked at:
shots/tasks/print-ready-grey/01-styles-list.png, 02-colour-by-value.png, 03-export-dialog-figure-grey.png,
04-export-dialog-first-release.png, plus the frames the links on those pages open (the Looks menu,
the top-N labels layer, the Export dialog in the Print look with a fold-change layer).

## Think-aloud

**Styles list, first look.** "Right. Left panel, 'Styles', four rows. Betweenness colour, Hub labels,
Degree size, Base style. My figure is fold change, not betweenness, so the first thing is that this
isn't my figure yet. Canvas is all orange-to-brown. Fine, I'd colour by logFC first anyway."

"The attributes on the right are useful: log2FoldChange, -2.52 to 3.15. So it read the column as a
number with a sign. Good. Degree 0 to 34."

**Colouring by fold change.** She opens the second screen. "Colour, then a picker: palette swatches,
then 'From the data', log2FoldChange, 'numbers, -2.52 to 3.15'. Module, categories, 9. That's what I'd
expect -- that's the column mapping in Cytoscape but without the three-dropdown dance. I'd click
log2FoldChange."

On the diverging state: "Linear, diverging, midpoint 0, red to blue. Not red-green, thank God. The
histogram of the domain behind the ramp is nice, I can see it's roughly symmetric. 'The palest colour
sits at 0' -- yes. And the legend says 148 below 0, 152 above, 0 no value. I can reconcile those
numbers: 148 plus 152 is 300. Good."

"Red-to-blue is mostly fine for deuteranopes. But the reviewer said greyscale. Red at -2.5 and blue at
+3 can come out the same grey. Where do I tell it about print?"

**Looking for greyscale.** "There's no 'grayscale' anywhere on this panel. I'd look at the layer's
palette dropdown first -- 'Red to blue', there might be a grey diverging one in there." (She reads the
dropdown; the mock does not show its list.) "I can't see what's in it, so I'm guessing."

She notices the small palette icon on the graph's 'Graph' header in the right panel only after scanning
for a while. "Is that a colour wheel? ... 'Look for the whole project'. Default, Colorblind safe,
Print, High contrast. OK, the one-line descriptions help: 'Prints well in gray: colours keep their order
in grayscale and read on white paper.' And 'Colorblind safe: every pair of categories stays apart, and
ramps change lightness one way only.'"

"But my reviewer wants both. Is this a pick-one? Default has the tick, it looks like radio buttons. If
I pick Print, is it still colour-blind safe? If I pick Colorblind safe, does it survive grey? The
descriptions sound like they'd give almost the same answer for a ramp, but I have to guess. I'll pick
Print, because greyscale is the harder constraint -- if it's pure grey, colour blindness is moot."

"And 'for the whole project'? I don't want my screen view turned grey. I want the figure grey."

**Labels, top 10.** "Hub labels, 12. Open it: 'Top 12 by degree'. I change 12 to 10, easy. But 'by
degree' -- no. On a fold-change figure the reviewer means the ten most changed genes. I'd open the
'by' dropdown and pick log2FoldChange... and then it gives me the ten most UP-regulated, because the
top ten of a signed column is the ten largest numbers. I want the ten largest absolute values, or
the ten smallest adj.P.Val, and I don't have adj.P.Val in this file. I see nothing that says
'absolute' here. I'd probably add an abs(logFC) column in R and re-import it. Which is what I do in
Cytoscape too, so it's not worse, but it's not better."

"'2 hidden where labels overlap'. No. If the reviewer asked for ten labels there have to be ten labels
in the file. Does the export also drop them? It doesn't say. I'd have to zoom in, export, and count."

**Export.** "Export files, top right. The dialog... this is a different project, 'Proteostasis screen',
coloured by module. Hm. OK, pretend it's mine." (Moderator confirms she can use the frame with the
fold-change layer.)

"Scope, full graph, 300 nodes -- good, it's the whole network, not just what's on screen. That's the
thing Cytoscape gets wrong. Look: Screen. And right under the preview in the Screen look: 'Ribosome and
Proteasome look the same in gray' with a Use Print look button. That is genuinely useful. Nobody tells
you that until the proof comes back from the journal."

In the Print look with the fold-change layer: "'Checked in gray: fold change runs light to dark from
-2.52 to +3.15, and the legend states that 0 is the middle gray.' So it's one ramp, pale to dark. Hmm.
So my most down-regulated genes are the palest dots on white paper. The ones I care about just as much
as the up ones are nearly invisible. And a mid-grey dot -- is that 0 or -0.4? In grey there's no way to
see the sign; you read it off the legend. I understand why -- you can't do a diverging palette in pure
grey honestly -- but I'd rather have direction on shape or a stroke, say down-regulated as a different
outline, and grey for magnitude. I don't see that offered."

"Also the preview isn't grey. The legend swatch is still pink through grey to blue. If the file is
written in colour and the journal converts it, fine, but the reviewer said greyscale, and I want to SEE
the greyscale before I send it. A 'view as grey' preview would settle it."

"Methods text: 'Print look: one ramp, light red (lowest) through middle gray (0) to dark blue
(highest). Drawn with graphty-element 2.6.2.' That's the caption line I always type by hand. I like
that. It should say where the logFC came from, the DE method, but that's my job."

"Format: 2x, PNG. Where's SVG? PDF? ... The dropdown says PNG and I can't see anything else. I need an
SVG with real text or the art department can't fix the font and I can't move a label in Inkscape. A
PNG at 3,055 by 1,644 is fine for a slide. It's not a figure."

"'2 files go to your Downloads folder. Nothing is uploaded.' Good. That's the right sentence."

## Outcome

She reaches a figure that is, in her words, "probably acceptable to the reviewer for the colour
question, not yet for the labels, and not for the journal." She would switch the file to the Print
look, change the labels to top 10, and export -- but the ten would be ranked by degree or by signed
fold change unless she adds an absolute-value column outside the tool, two of the labels may be hidden
where they overlap, and the file is a PNG.

## Single Ease Question

4 of 7. "The grey check is the best thing I've seen in one of these. Everything around it I had to
hunt for or work around."

## Would she use this instead of her current tool?

"For looking, maybe -- the export dialog is better than Cytoscape's, it covers the whole network and
writes the methods line. For the actual figure, not until it writes an SVG with real text and lets me
label the top ten by absolute fold change without leaving the tool. Right now I'd still regenerate it
from R and finish it in Illustrator."

## Problems she hit

1. Export: only PNG is visible as a format; no SVG or PDF with real text. Severity 3.
2. Print look on a signed column: a single light-to-dark ramp makes the most down-regulated genes the
   palest on white paper and puts the sign only in lightness read off the legend; no option to carry
   direction on a second channel (outline, shape). Severity 3.
3. The top-N labels offer "by" any numeric column, but nothing shows ranking by absolute value, so
   "top 10 by log2FoldChange" would give only up-regulated genes. Severity 3.
4. "2 hidden where labels overlap": a requested label can be silently missing from the figure, and the
   export does not say whether it keeps them. Severity 3.
5. Looks menu: Colorblind safe and Print read as mutually exclusive choices with Default ticked; she
   could not tell which one satisfies "greyscale AND colour-blind", and guessed. Severity 2.
6. The Look is set in two places -- "for the whole project" behind a small icon on the graph header,
   and per file in Export -- and the icon was hard to find. Severity 2.
7. The Print preview and legend are still in colour (pink to blue); there is no true greyscale preview
   of what the reviewer will see. Severity 2.
8. The Export dialog opened on a different project coloured by module, not her fold-change figure.
   Severity 1 (the mock, not the design).

## What she liked

- The grey check under the preview naming exactly which colours collide in grey, with a one-click fix.
- Export scope is the full graph, not the current viewport.
- The methods text records the palette, the Look, the domain and the element version.
- Counts she can reconcile: 148 below 0, 152 above, 0 no value.
- "Nothing is uploaded."
