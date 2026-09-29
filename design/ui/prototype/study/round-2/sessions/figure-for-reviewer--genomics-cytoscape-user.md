# Session: a figure a reviewer can read in gray -- Maren (genomics postdoc, Cytoscape user)

Task as given by the moderator: "Make the picture show which genes changed most, so a reviewer can read it, even printed in grey."

Screens used: the styles list and legend mock, then the export dialog mock. Maren played on a 14-inch laptop view (1440 by 900). She skims paragraphs, reads headers, numbers and legends.

## Think-aloud

**Styles list, first frame.**

"OK. Network in the middle, all orange-brown. Legend on the right says 'Color: betweenness'. That's not what I want -- I want fold change. Nobody asked for betweenness."

"Right side, Attributes: 'log2FoldChange -2.52 to 3.15'. Good, so my data actually got attached. That's the first thing I check in Cytoscape and usually it's the thing that's broken. -2.52 to 3.15, that's plausible."

"In Cytoscape I'd go to the Style tab, Fill Color, pick the column, continuous mapping. Here... Styles panel on the left. There's a plus. I'll click the plus." (The plus adds an empty layer with its editor open.) "An empty thing. Now I have to fill it in myself -- Applies to, Fill, Color. I'd expect a column dropdown in the colour field. I'm guessing I type log2FoldChange in there. There's nothing on this screen that shows me doing that, so I don't actually know if it gives me red-blue centred on zero or this orange thing."

"Can I click the log2FoldChange line on the right? It looks like a label, not a button. I hovered it -- nothing says 'Color by'. I'd probably right-click it. I don't know."

**Frame 12, the size layer.**

"Oh, here's someone who did 'Fold change size'. And it says 'Covered by Degree size above' and 'Move above'. OK, that's actually helpful -- in Cytoscape it would just silently not change and I'd sit there clicking the gradient handle like my lab mate. I'd press Move above."

"The editor says size is '|log2FoldChange|' -- absolute value. And then: 'By magnitude, sign not shown: 148 proteins went down and 152 went up. Color by log2FoldChange to show the direction.' Yes, exactly, that's the reviewer's first question: up or down? OK, so how do I colour by it? That sentence is just grey text. It's not a link. It tells me to do the thing but not where."

"And the counts -- 148 down, 152 up, out of 300. So every protein is either up or down? No padj cutoff? Fine, these are all the DEGs I guess."

"Legend for size: 0-0.6, 0.6-1.3 ... 2.5-3.15. Five bins. Fine. Bigger means changed more. A reviewer can read that in gray, circles are circles. That part actually works in print."

**Frame 13, labels.**

"Hub labels: 'Top 12 by degree'. There's a dropdown on 'degree'. I'd switch that to log2FoldChange so the biggest changers get names. That's nice, I usually do that by hand with a filter. Although -- top 12 by log2FoldChange, is that the most up, or the biggest either way? If it's only the most up, I lose my downregulated genes. It doesn't say."

**Frame 14, the palette icon.**

"There's a little palette icon next to 'Graph' on the right. I wouldn't have found it; it's a tiny icon. Menu: Default, Colorblind safe, Print, High contrast. 'Print: Prints well in gray: colors keep their order in grayscale and read on white paper.' That's the words I needed. I'd tick Print. And Colorblind safe too, for my PI -- can I tick both? They look like checkboxes but it says 'Look for the whole project', so maybe it's one or the other. I'd need both for this journal."

"'Colors you set by hand are kept.' Hm. So if I did pick red-blue by hand for fold change, Print won't touch it? Then what does Print do for me? Confusing. I don't know if my colour counts as 'by hand'."

"Also -- still orange everywhere. Orange to brown. In gray that's light to dark, I suppose that's OK. But I still haven't seen a single screen with fold change as the colour."

**Export dialog.**

"Export files, top right. OK, this is a different network -- 'Proteostasis screen', coloured by module. Not mine. Whatever, it's a mock."

"Scope, Figures, Current view, 2x, PNG. Where's PDF? Where's SVG? The format box only says PNG. Journals want vector, or at least 300 dpi TIFF. A PNG at 3,055 by 1,644 might be enough resolution but the art department will ask. If I can't get a vector out I'm back in Illustrator redrawing, which is the thing I'm trying to avoid."

"Background: Transparent by default. For print I want white. I can change it -- 'Also: White' -- fine."

"Include legend -- on. Good. The legend is in the image. That alone is a thing Cytoscape makes me install an app for."

"'View as: Color, Gray, Red-green, Blue-yellow'. Click Gray. Oh, that's useful. Now I can see Ribosome and Proteasome and Complex I all go to the same grey. The reviewer would not be able to tell them apart. OK -- so what do I do now? It says 'Preview only: the file is written in color.' It doesn't say 'switch to Print' or anything. I'd have to remember the palette icon from the other screen, close this, go find it, come back. I'd probably just export and hope."

"Red-green -- my PI. I'd click that and check. Nice to have it right there."

"Methods text on the right. 'Human protein interactions (300 proteins, 1,262 interactions ...), Okabe-Ito palette ...'. I'd rewrite it, but it's a start, and it wrote the palette name, which reviewers do now ask for. It doesn't say STRING version or confidence cutoff, but this isn't a STRING network, so fine."

"'3 files go to your Downloads folder. Nothing is uploaded.' Good. My PI would ask."

**Where I ended up.**

"I think I'd get: size by absolute fold change, labels on the top genes, Print look, legend in the image, checked in gray. What I did not get, because I couldn't see how: colour by fold change, blue for down, red for up, centred on zero. That's the actual figure. Without direction the reviewer asks 'up or down?' and the size doesn't answer it. And PNG only."

## After the task

**Single Ease Question: 3 of 7.**

"The pieces that were there were clear -- the 'covered by' message, the gray preview, the legend in the image. But the one thing I came to do, colour the genes by fold change, I never saw. The screen told me to do it and didn't show me where."

**Would you use this instead of Cytoscape?**

"For looking around, maybe. The gray preview and the legend-in-the-file are better than what I have, honestly. But for Figure 3? No -- not with PNG only, and not until I can see a diverging fold-change colour that I trust is centred on zero. And my PI will still ask how I cite it. So I'd explore here and redo the final figure in Cytoscape, because reviewers know what that looks like."

## Problems observed

1. Styles list: no visible way to colour by log2FoldChange. The size editor says "Color by log2FoldChange to show the direction" as plain text with no control; the attribute row is not visibly clickable; the plus opens an empty layer with no hint of a column mapping. Severity 4 (blocked the core of the task).
2. Export: only PNG offered; no vector (PDF or SVG). For a journal figure she expects to go back to Illustrator. Severity 3.
3. Export gray preview shows categories collapsing to the same gray but offers no way forward (no pointer to the Print look); she must remember an icon on another screen. Severity 3.
4. The Look (palette) icon is a small unlabeled icon on the inspector's Graph header; she would not have found it without the frame. Severity 2.
5. Look menu: unclear whether Print and Colorblind safe can both be on, and whether "Colors you set by hand are kept" means Print will ignore her own fold-change colours. Severity 2.
6. Labels "Top 12 by log2FoldChange": does not say whether it ranks by value (only the most up) or by magnitude (both directions). Severity 2.
7. Export defaults to a transparent background; for a printed figure she expects white. Severity 1.
