# Session: a figure a reviewer can read, even printed in grey -- Dr. Chen (computational biologist)

Participant: Dr. Chen, computational biologist, group leader; builds protein interaction networks from
differential expression results; makes figures in Cytoscape (driven from R) and finishes them in
Illustrator. Screens used: the Styles list and editor, then the Export dialog. Laptop on a 27-inch monitor.

Task as given by the moderator: "Make the picture show which genes changed most, so a reviewer can read
it, even printed in grey."

Outcome: partial. She got log fold change onto colour (she thinks), but could not confirm the figure
would survive greyscale, and could not get a vector file. She would redo the figure in R.

---

## Transcript (think-aloud)

**Looking at the first screen (Styles list, betweenness coloured).**

> "OK. Stress response study, ppi-core-300, 300 nodes, 1,262 edges. Fine, that's the network. Everything
> is orange-brown. Betweenness color -- I didn't ask for that, it came from a run. I don't want
> betweenness on colour for this, I want fold change. First thing I'd do anyway."

> "On the right, Attributes: log2FoldChange, -2.52 to 3.15. Good, it arrived as a number, and the range
> looks like my DE table. That's the column I want."

She moves the pointer to the log2FoldChange row in the right panel and clicks it.

> "Nothing? I expected clicking the column to give me 'map to colour', like the Style tab in Cytoscape
> where you pick the column. It's just a row with a range."

(The prototype shows no action on the attribute row. The empty-network frame says "Add one with +, or with
Color by or Size by on any attribute", but on this screen nothing named Color by is visible.)

> "Right-click, maybe? ... No. All right, the plus next to Styles."

She clicks + next to Styles. An empty layer opens with its editor (Applies to, Size, Fill, Label, each with
a +).

> "Fill, plus. I suppose Fill is node colour. Then 'Color' ... and I get a box where I drop a column? It
> shows degree in a pill for size, so I'd put log2FoldChange there."

She binds the Color field to the log fold change column.

> "Now -- which log fold change. In the other frame the layer was called 'qPCR log2FC color', the pill says
> 'log2FC', and the legend says -2.41 to 2.98. My column on the right says log2FoldChange, -2.52 to 3.15.
> Those are not the same numbers. Is that two columns, or did it clip something? The panel says 84 of 300
> proteins have a value and 216 have none. My RNA-seq table has a value for every gene. So that one is a
> different file. I'd have to be very careful which pill I dragged in, and the pill just says log2FC --
> it doesn't say which file."

**The palette.**

> "The legend under it is blue, white-ish, red, '0 in the middle'. Good, it centred on zero without me
> asking; Cytoscape never does that by default. That's the continuous mapping I want. Is it symmetric,
> though? -2.41 to 2.98 with 0 in the middle -- is dark red 2.98 and dark blue -2.41, or is it clamped at
> plus and minus 3? Because if the two ends are stretched differently, a reviewer compares a blue and a
> red of the same darkness and thinks they're the same magnitude."

She clicks the sliders button beside the Color field, expecting the scale settings (as on the betweenness
layer: Scale, Palette, a histogram).

> "Scale, Palette -- 'sequential, 5 steps, Orange to brown' on the betweenness one. For mine I'd open the
> palette list and look for something that says grey-safe or print-safe. I don't see a list of palettes
> anywhere on this screen, so I'd be guessing at what's in it."

> "And here's the problem with the task. Blue-white-red is a diverging palette. It's fine for colour-blind
> readers -- blue and red are OK -- but in greyscale the dark blue and the dark red come out almost the
> same grey. So printed in grey you see 'changed a lot' versus 'didn't change', but not up versus down.
> Half the information is gone. That is exactly what a reviewer with a black-and-white printout would
> complain about."

> "What I'd actually do: colour for direction, and something that survives grey for magnitude -- node
> size by absolute log fold change, or labels on the top twenty genes by absolute fold change. Size is
> bound to degree already. Can I size by the absolute value? I see a Scale field that says Log for
> betweenness; I don't see 'absolute value' anywhere. I'd have to go back to R, add an abs_logFC column
> and re-import. Fine, I'd do that, but it's a round trip."

> "Labels: there's 'Hub labels -- Names on degree 17 to 34'. So labels can be on a rule. I'd want 'names
> on the genes with absolute logFC above 1.5'. I can't see where that rule is written. 'Down in stress,
> rule, 148' is a set -- maybe I make a set 'changed most' and label that? Guessing."

> "Is there a greyscale preview? I'd expect a 'view as greyscale' or 'check colour-blind' toggle. Nothing.
> I'd print it and look, or screenshot it and desaturate in Illustrator."

She looks at the stack: Module color, Betweenness color, Degree size, Hub labels, Base style.

> "Also I'd turn the betweenness layer off with the eye so it doesn't fight my fold change. OK, eye --
> that's clear. And it tells me when a layer paints nothing. That's honest; I like that."

**The Export dialog.**

She clicks Export... at top right.

> "Scope: Full graph, 300 nodes. Good -- whole network, not just what's on screen. That alone fixes a
> Cytoscape annoyance."

> "Current view, 2x PNG. I click the PNG box expecting SVG and PDF."

(The screen shows only PNG. Nothing in the dialog names a vector format.)

> "PNG only? Then this is not a figure. The journal's art department will want to change the font, and I
> want to move the legend in Illustrator. A 3,055 by 1,644 pixel PNG, at print width that's maybe 300
> dpi if it's a single column. It'll pass, but it can't be edited. This is the point where I'd go back to
> RCy3."

> "The preview: the legend is drawn into the image, with counts per category. That's good. Methods
> text: '300 proteins, 1,262 interactions, loaded 2026-09-22 ... Okabe-Ito palette ... Drawn with graphty.'
> Now that I like -- that's the caption I usually type by hand. For mine I'd want it to say which column,
> the midpoint, the clamp range and the palette name. I'm assuming it would."

> "Background transparent -- for print I want white. It's under the three dots; OK, found it: 'Also:
> White'."

> "Still no way to see it in grey before I write the file. The preview is in colour. I'd export, open it
> in Preview, desaturate, and look."

> "'3 files go to your Downloads folder. Nothing is uploaded.' Good. I'd have asked."

---

## After the task

**Single Ease Question (1 = very hard, 7 = very easy): 3.**

> "Getting fold change onto colour was about a minute, once I stopped trying to click the column and used
> the plus. The zero-centred legend and the methods text are genuinely better than Cytoscape. But the
> task was 'reviewer can read it in grey', and the tool doesn't help with the grey part at all: no
> palette that says it survives greyscale, no greyscale preview, no way to encode magnitude by size
> without me making a new column, and a PNG at the end. So I'd have done the half that's easy and still
> done the hard half in R and Illustrator."

**Would you use this instead of your current tool?**

> "For looking at the network and for the methods text, maybe -- that caption is worth something. For the
> actual figure, not yet. Give me SVG with real text, a greyscale check before I export, and size or
> labels by absolute fold change, and I'd try it for the next paper. Right now I can do this in igraph
> and ggraph with viridis in twenty lines, and I know exactly what it did."

---

## Problems observed

1. **No vector export.** The format list shows PNG only; she clicked it looking for SVG or PDF. For a
   journal figure this ends the task in the tool. (Severity 4.)
2. **No help for greyscale.** No greyscale or colour-vision preview, and no palette labelled as surviving
   grey. The blue-white-red palette loses up versus down in grey, and nothing warns her. (Severity 3.)
3. **Magnitude cannot be encoded by size or labels without a new column.** No absolute-value transform on
   the scale; the rule for "names on the genes that changed most" is not visible. (Severity 3.)
4. **Two fold change columns, one ambiguous pill.** The pill says "log2FC"; the inspector says
   "log2FoldChange" with a different range (-2.52 to 3.15 vs -2.41 to 2.98, and 84 vs 300 proteins).
   The pill does not name its source file. (Severity 3.)
5. **Clicking an attribute does nothing.** The empty-state text promises "Color by ... on any attribute",
   but on the attribute row there is no visible Color by action; she found the + instead. (Severity 2.)
6. **Midpoint shown, clamp not.** "0 in the middle" is good, but whether the two ends are symmetric is not
   stated, and she cannot compare a blue and a red of the same darkness safely. (Severity 2.)
7. **Transparent is the default background** for a print figure; White is behind the "..." settings.
   (Severity 1.)

## What she liked

- Log fold change centred on zero without being asked, with "0 in the middle" in the legend.
- The generated methods text (data, date, palette name, scope) -- "the caption I type by hand".
- Scope defaults to the full graph, not the visible window.
- "Nothing is uploaded" stated in the dialog.
- A layer that paints nothing says so; the eye toggles are obvious.
