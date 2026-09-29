# Session: a greyscale, colour-blind-safe figure with the top 10 labelled

Participant: Maren, cancer-genomics postdoc who makes her network figures in Cytoscape (persona: genomics-cytoscape-user).
Task as given: "A reviewer wants the fold-change figure in greyscale, readable by a colour-blind reader, with the top 10 labelled."
Screens used, in order: Styles list, editor and legend; Color or size by a value; Export dialog. Laptop size, 1440 by 900.
Result: partly done. She found every control she needed, but she could not confirm the file would come out grey, and the labels would not reliably show all 10.

## Transcript

**Styles list, first frame (Color by a result).**

"OK, so this is the network already styled. Left side says Styles -- that's like the Style tab in Cytoscape, fine. But the colour here is betweenness, orange to brown. My figure is fold change. So first thing, I need the fold-change colour on, and then I need to make it grey."

"Where's the grey? I'm looking for a checkbox that says greyscale, or an export option. Nothing on the left. There's a little palette icon next to 'Graph' on the right side. Unlabelled. I'd normally not click an unlabelled icon, but it's the only colour-looking thing, so fine."

**Styles list, the Look menu (frame 14).**

"Oh. 'Look for the whole project': Default, Colorblind safe, Print, High contrast. And each one says what it does in one line. OK, that's nice, I'll give it that. 'Print -- prints well in gray: colors keep their order in grayscale.' 'Colorblind safe -- ramps change lightness one way only.'"

"But the reviewer wants both. Grey AND colour-blind. These are checkmarks, so can I tick two? It looks like a pick-one list -- Default has the tick. I'd guess Print, because if it's readable in grey it's readable to my PI, I think. Colour-blind people see lightness fine, right? I'm not a hundred percent sure. I'd pick Print and hope."

"Then my real question: my fold change is red to blue, centred on zero. Down-regulated is dark red, up-regulated is dark blue. In grey those are BOTH dark. 'Colors keep their order in grayscale' -- what order? A diverging scale doesn't have one dark end. So does Print turn it into white-to-black, and then minus 2.5 is white and plus 3 is black? That changes what the figure says. Nothing here shows me what it does to MY scale. It only shows the betweenness one, which is already one-colour. I'd have to click it and look at the network and squint."

"'Colors you set by hand are kept.' Hm. So if I'd set the up and down colours myself it would ignore Print? I have in the past. Then it would silently not be grey. That's the kind of thing that bites me."

**Color or size by a value (the log2FoldChange scale).**

"This is the fold-change editor. Linear, Red to blue, diverging, midpoint 0 -- good, it's centred on zero, and it tells me 148 below, 152 above, 0 with no value. That's the count I always want. The histogram is nice too."

"'The palest color sits at 0' -- good, I'd want that written in the legend and it is."

"But for grey? The Palette dropdown -- I'd click it to see if there's a grey diverging option, or a blue-orange one. The screen doesn't show the list open, so I don't know what's in it. In Cytoscape I'd just set the three points by hand, which is annoying but I know what I get."

"Honestly for greyscale fold change, the thing I'd actually do is keep the colour for direction and... no, you can't, it's grey. You'd need the sign some other way. Shape? Border? I don't know. Nothing here tells me, and the Print menu doesn't warn me either."

**Labels on the top N (frame 13).**

"Top 10 labelled. Here: Hub labels, 'Applies to: Top 12 by degree.' OK, so I change 12 to 10. Easy. That's actually quicker than cytoHubba plus hand-labelling."

"But top 10 by what? Reviewer said 'top 10' on a fold-change figure, so they probably mean top 10 by fold change. The dropdown says degree. I'd switch it to log2FoldChange. And then -- is top 10 the biggest positive numbers? Because I'd want the biggest either way, up or down. Top 10 by log2FoldChange would give me ten up-regulated genes and zero down. There's nothing that says absolute value. For size it said '|log2FoldChange|, by magnitude, sign not shown' -- does that apply to 'Top N by' too? I can't tell."

"And this: '2 hidden where labels overlap.' No. The reviewer asked for ten labels. If two are hidden, I've sent them eight and they'll ask again. At least it tells me the number, which Cytoscape wouldn't -- there they'd just overlap into mush. But I don't see how to force them to show. I'd zoom or move the nodes, I guess, and check it's 0 hidden."

**Export dialog.**

"Export files, top right, fine. It's the modules figure in this example, not mine, but same dialog."

"Legend is drawn into the image. Good -- that's my number one Cytoscape complaint. Methods text with palette name and counts. I'd rewrite it, but it's a start."

"View as: Color, Gray, Red-green, Blue-yellow. Oh good, I'll click Gray -- and it says 'Preview only: the file is written in color.' ... Wait. So the Gray button I'd have clicked to MAKE it grey doesn't. It just shows me. OK, that is at least honest, and it's useful to check the Print setting from before. But if I'd skipped the Look menu I'd have thought Gray here was the setting. I nearly did."

"In the grey preview of their figure, half the modules turn into the same grey -- Ribosome and Proteasome look identical. So this is showing me that the default isn't grey-safe. Useful. Then I'd go back to the Look menu, pick Print, and come back here and click Gray again to check. Back and forth, but it works."

"Red-green -- that's the one for my PI. Good that I can check it. But I'd want to check grey AND red-green at the same time on one figure, not click between."

"Format: PNG. 2x. Where's PDF? The journal wants vector, or at least 300 dpi TIFF. The dropdown only shows PNG and I don't see what else is in it. If it's PNG only, I'm back in Illustrator anyway."

"Background: transparent by default. For a greyscale print figure I want white. I'd have to know to change that, it's under the three dots. The checkerboard gives it away, at least."

## After the task

**Single Ease Question: 4 of 7.** "The pieces are all there -- the Look menu, the top N, the grey preview. But I had to go to three places and I'm still not sure the file I send is grey and shows the sign of the fold change. I'd open the PNG afterwards to check, which I'd do anyway."

**Would she use it instead of Cytoscape?** "For this request -- a reviewer revision -- maybe for checking. The grey and red-green preview is genuinely something I'd use; I've been printing figures on the lab printer to check greyscale. And a legend in the file is a big deal. But if it's PNG only, and the top 10 by fold change is only the up-regulated ones, the final figure still goes through Cytoscape and Illustrator. And I'd still have to explain to my PI where the figure came from. So: I'd use it to check, not to make the figure. Yet."

## Problems observed

1. Print Look does not say what it does to a diverging (signed) colour scale. In grey, both ends of Red to blue go dark; she could not tell whether Print keeps the sign readable. Severity 3.
2. Grey and colour-blind are separate Looks, apparently pick-one; the task asks for both and nothing says Print also covers colour-blind readers. Severity 2.
3. "Colors you set by hand are kept" means a hand-set colour would silently stay in colour under Print. Severity 2.
4. Export's View as Gray is preview only. It is labelled, but it is the control she reached for to make the file grey, and it does not link back to the Look that would. Severity 2.
5. Top N by a signed column: no way to say "largest either way" (absolute value). Top 10 by log2FoldChange would be all up-regulated. Severity 3.
6. "2 hidden where labels overlap": a reviewer asked for 10 labels; there is no visible way to force all N to show. Severity 3.
7. Export format shows PNG only; journals want vector. Severity 3.
8. The Look menu opens from an unlabelled palette icon on the property header. Severity 1.
9. Default background is transparent; a print figure needs white and the option is behind the "..." button. Severity 1.

## Delights

- Each Look is described in one plain sentence.
- The fold-change scale states its midpoint, and counts below 0, above 0 and no value.
- The export preview can be viewed as Gray and as Red-green before writing.
- The legend is drawn into the exported image.
- The label layer says how many labels are hidden, instead of letting them overlap.
