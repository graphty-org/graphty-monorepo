# Session: a figure a reviewer can read, even printed in grey -- Dr. Chen (computational biologist)

Task as given by the moderator: "Make the picture show which genes changed most, so a reviewer can read
it, even printed in grey."

Screens used: the styles list (with its layer editor, legend and the Look menu) and the Export dialog.
Renders were read as a participant would see them; the page HTML was consulted only to learn what a
control does when clicked.

Outcome: success with difficulty. She got a figure where size carries |log2FoldChange| and the Print
look is on, and she found the export preview in gray. She did not find a way, on these screens, to put
log2FoldChange on colour with a diverging palette, which is what she actually wanted, and she could not
see an SVG option in Export.

## Transcript (thinking aloud)

**On the styles list, first frame.**

"OK. Stress response study, ppi-core-300, 300 nodes, 1,262 edges. Good, numbers up front. Everything is
orange-to-brown. Why is everything orange? ... 'Betweenness color, written by the run.' So I ran
betweenness and it painted my network for me. I didn't choose that colour. Fine, at least it says so.

The legend says betweenness 0 to 0.138, log scale. 'Each value is divided by 0.000077, the smallest
above 0, before the log.' Huh. That's actually honest. I'd want that in the legend of a paper, not just
here, but OK.

What I want is changed-most genes. My column is log2FoldChange. I can see it on the right, under
Attributes: 'log2FoldChange -2.52 to 3.15'. Good, the column arrived as a number, and the range looks
like my DE table. Can I click it? It looks like a read-out, not a button. In Cytoscape I'd go to Style,
Fill Color, pick the column, continuous mapping. Where is Style here? There's 'Styles' on the left with a
plus."

**Looking for a way to colour by log2FoldChange.**

"Plus on Styles. I'd click that. I expect a list of properties or my columns. The prototype doesn't show
me what comes up, so I'm guessing. Alternatively I open 'Degree size' -- that's the one I apparently
made -- and there's a 'Fill' row with a plus. Fill plus, pick log2FoldChange. That's what I'd try.
Nothing on these frames shows me what Fill plus does. I can't tell if it'll give me a diverging palette
centred on zero or another orange ramp. The betweenness one says 'Palette -- sequential, 5 steps'. If
log fold change comes out sequential I'm out: a sequential ramp on a signed value puts -2.5 and 0 at two
ends of 'light', which is wrong."

**The frame where size is set by fold change.**

"Here -- 'Fold change size'. Someone put |log2FoldChange| on size. And it says 'Covered by Degree size
above: it sets the size of all 300 proteins, so this layer paints none. Move above.' Right, so the
layers stack like Illustrator layers and the top one wins. I would not have guessed that the canvas
didn't change because of that. But it tells me, and there's a button. I'd press Move above.

'By magnitude, sign not shown: 148 proteins went down and 152 went up. Color by log2FoldChange to show
the direction.' Now that's the right sentence. That is exactly the caveat I'd write in a legend. But
'Color by log2FoldChange' is just text. Why isn't it a button? You've told me what to do and then made me
go find where to do it.

Size for magnitude is actually not bad for grey print -- size survives a photocopier. Legend bins 0-0.6,
0.6-1.3, 1.3-1.9, 1.9-2.5, 2.5-3.15. I'd want the bins at round numbers, 0.5, 1, 2, and I'd want to know
where my |logFC| > 1 cut-off sits, because that's what 'changed' means in my Methods. And with degree
gone from size, the hubs aren't big any more -- fine, that's what I asked for."

**Making it survive grey: the Look menu.**

"The frame about Looks. There's a little palette icon next to 'Graph' in the right panel. I'd never have
found that on my own -- it's a 12-pixel icon with no label. But when it's open: 'Colorblind safe', 'Print:
prints well in gray, colors keep their order in grayscale and read on white paper.' That's the right
promise. Can I have both? Reviewers want colour-blind safe AND the journal prints grey. These look like
radio choices, one tick only. If I pick Print, is it still colour-blind safe? It doesn't say.

'Colors you set by hand are kept.' Good -- so it won't overwrite a palette I chose. But then if I pick a
red-blue diverging by hand, does Print leave it alone even if it fails in grey? That's the question I
actually have and nothing answers it."

**Export.**

"Export files, top right. Big dialog. Scope: full graph, 300 nodes -- good, not just what's zoomed in.
That's the Cytoscape pain, gone. 'Current view, 2x PNG'. PNG. Where's SVG? The format dropdown says PNG
and I can't see what else is in it. If it's PNG only, this is a screenshot with a legend, and the art
department sends it back. I need real text.

Background: Transparent by default. For a journal I want white; it's there as an option, fine.

'View as: Color, Gray, Red-green, Blue-yellow. Preview only: the file is written in color.' Oh, this I
like. I click Gray and I see what the reviewer sees. And I can see the problem straight away on this
example -- Ribosome, Proteasome, Complex I, Spliceosome all turn into the same mid grey. So the preview
tells me it fails, but then what? It doesn't say 'switch to the Print look' or offer to. I'd have to
close this, go back to the tiny palette icon, change the Look, and come back. That's a loop.

This example is coloured by module, not fold change, so I can't see what my diverging legend would look
like here. I'd want the legend to say 'log2FoldChange, -2.52 to 3.15, centred at 0, |logFC| > 1'.

Methods text: 'Human protein interactions (300 proteins, 1,262 interactions, undirected, 3 components,
2 isolated), from ppi-core-300.graphml... Color: module, 8 modules... (Okabe-Ito palette)... Size:
degree, exact, full graph.' Yes. That's the paragraph I'd write by hand. It names the palette. It
doesn't say which STRING version or score cut-off, but that's the file's fault, not the export's. This
is the best part of the whole thing.

'3 files go to your Downloads folder. Nothing is uploaded.' Good, that's the first thing I'd have asked."

## After the task

**Single Ease Question: 3 of 7.** The pieces I needed are mostly there -- size by |logFC| with an honest
note, a Print look, a gray preview, a methods paragraph -- but the one thing I asked for first, fold
change on colour with a diverging palette, isn't reachable on these screens, and I couldn't see SVG.

**Would she use it instead of her current tool?** "Not instead. Maybe beside. For a figure, the gray
preview and the methods text are better than anything I get from Cytoscape, where I build the legend in
Illustrator. But if export is PNG only, it goes back to being a nice viewer, and I'd still regenerate the
real figure from R. Give me a diverging fold-change colour in one step, a grey check that offers the fix,
and an SVG with real text, and I'd make my next figure in it."

## Problems observed

1. No visible way to colour by log2FoldChange from these screens; the note "Color by log2FoldChange to
   show the direction" is plain text, not an action (severity 3).
2. No sign on these screens that a signed column gets a diverging palette centred on zero; the only
   colour ramp shown is sequential orange-brown (severity 3).
3. The Export format shows PNG and no SVG or PDF is visible; a raster figure is not accepted as a
   figure (severity 3).
4. The Look menu is a single choice; Print and Colorblind safe cannot visibly be combined, and it is
   unclear whether Print leaves a hand-picked palette that fails in gray (severity 3).
5. The gray preview shows a failure (four modules become one grey) but offers no fix; the Look is set
   elsewhere, behind an unlabeled icon (severity 2).
6. The Look menu is behind an unlabeled small palette icon she would not find unaided (severity 2).
7. A run's layer paints every protein by default ("colours I didn't choose"); replacing it means
   understanding layer order first (severity 2).
8. Size legend bins for |log2FoldChange| are equal-width odd numbers (0.6, 1.3, 1.9) rather than round
   thresholds, and no cut-off (|logFC| > 1) is shown (severity 2).
9. Export background defaults to transparent; a journal wants white (severity 1).

## What pleased her

- "Covered by Degree size above ... Move above": the reason nothing changed, and the fix, in one row.
- "By magnitude, sign not shown: 148 went down and 152 went up": the caveat she would write herself.
- The gray and colour-vision previews in Export.
- The methods text, including the palette name and exact counts.
- "Full graph: 300 nodes" as export scope, not the zoomed view; "Nothing is uploaded."
