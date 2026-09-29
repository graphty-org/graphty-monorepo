# Session: the fold-change figure in grey, colour-blind safe, top 10 labelled -- Maren, genomics postdoc (Cytoscape user)

Task given by the moderator, and nothing more: "A reviewer wants the fold-change figure in greyscale, readable by a colour-blind reader, with the top 10 labelled."

Screens used, in order: the styles list (`screens/styles-list.html`, including its "Choosing a Look" and "Labels on the top 12 by degree" frames), the colour-by-value screen (`screens/colour-by-value.html`, the fold-change scale), and the export dialog (`screens/export-dialog.html`, the fold-change figure in the Print look). Renders the participant saw, study view with the design notes hidden:

- `shots/tasks/print-ready-grey/01-styles-list.png`, `02-colour-by-value.png`, `03-export-dialog-figure-grey.png`
- `shots/r3-maren-grey-sl-looks.png`, `shots/r3-maren-grey-sl-top-n.png`
- `shots/r3-maren-grey-cbv-numbers.png`
- `shots/r3-maren-grey-ex-figure-signed.png`, `shots/r3-maren-grey-ex-figure-print.png`

Outcome: success with difficulty. She got to an export preview of the fold-change network in the Print look, with a legend that says where zero sits and a methods paragraph. She did not get what the reviewer asked for in three places: she never saw the figure in grey (the "Print" preview is still red and blue), she could not tell whether Print is also colour-blind safe because the app offers "Print" and "Colorblind safe" as two different choices, and the labels are the top 12 hubs by degree with 2 of them hidden by overlap, not the top 10 changed genes. The file is a PNG with a transparent background. Single Ease Question: 3 of 7.

## Transcript (think-aloud)

**Styles list, first look.**

"Stress response study, ppi-core-300, 300 nodes, 1,262 edges. Everything is orange-brown and the little legend says 'Color: betweenness'. The reviewer said the fold-change figure. So first, this isn't even my fold-change colouring. Where's that?"

"Attributes on the right: log2FoldChange, -2.52 to 3.15. Good, it's there, with a range. That's the first thing I check."

"Styles list on the left: Betweenness color, Hub labels, Degree size, Base style. There's a plus. In Cytoscape I'd go Style tab, Fill Color, pick log2FoldChange, continuous mapping. Here I guess the plus adds a style. I click it."

(The plus has no menu in this prototype. The moderator moves her to the colour-by-value screen, which starts from a new style layer.)

**Colour by value.**

"OK, 'Style layer 1', Fill, Color, and a picker: 'From the data: log2FoldChange, numbers, -2.52 to 3.15'. Module, categories, 9. Then 'Computed: degree, betweenness'. That's clear. It shows me the range next to the column name, so I know the table actually attached. I pick log2FoldChange."

"Now: Scale linear, 'Palette -- diverging: Red to blue', Domain with a histogram, -2.52, 0, 3.15, Midpoint 0. Midpoint 0 in a box I can see. That's the thing that always goes wrong in Cytoscape, the gradient centring on the mean or something. Good."

"'The palest color sits at 0. Below 0 is red, above 0 is blue.' Hm. In my field up is red and down is blue. Everyone does red for up. There's a Reverse arrow, fine, I'd flip it. Red and blue at least -- not red-green. My PI would be OK with red-blue."

"Legend: Below 0, 148. Above 0, 152. No value or unstyled, 0. So nothing got dropped. Good."

"But the reviewer wants grey. Where do I say grey? There's nothing here about grey or colour-blind on this panel. The palette dropdown -- maybe there's a grey one in there. I'd open it." (The dropdown is not drawn open.) "I don't know. I'd look for it at export, that's where Cytoscape would do it, if it did it at all."

**Back to the styles list: the Look menu and the labels.**

"There's a frame where a menu is open off that little paint-palette icon by 'Graph': 'Look for the whole project'. Default, Colorblind safe, Print, High contrast. 'Colorblind safe: every pair of categories stays apart, and ramps change lightness one way only.' 'Print: prints well in gray, colors keep their order in grayscale.'"

"So... I need both. The reviewer said grey AND colour-blind. There's one tick. It's one or the other? If I pick Print, is it still colour-blind safe? It doesn't say. If I pick Colorblind safe, does it print in grey? It says lightness changes one way only, which sounds like it would print, but it doesn't say grey. I'd pick Print because 'grey' is the word the reviewer used, and then worry about it."

"And honestly I'd never have found that menu. It's an unlabelled icon next to the word 'Graph'. I don't click those."

"Labels: 'Hub labels', Applies to 'Top 12 by degree'. MAPK1, TP53, CDK1, YWHAZ, AKT1 and 7 more. OK, that's the hub genes, that's what I'd report anyway -- top by degree, it's basically cytoHubba. I change 12 to 10. Easy. That's actually nicer than cytoHubba, I can see the names it picked right there."

"Wait. On a fold-change figure, does the reviewer mean the top 10 hubs or the top 10 changed genes? Probably the most changed, if it's the fold-change figure. Can I say 'by log2FoldChange'? The by-box says degree; I assume it's a dropdown with my columns. But top 10 by log2FoldChange would just be the ten most up, wouldn't it? My most down gene is -2.52, I'd want that labelled too. I don't see a way to say 'biggest either way'. I'd keep degree and hope that's what they meant."

"'Hidden: 2 where labels overlap.' No. The reviewer said top 10 labelled. If two are hidden, I'm getting eight names and a reviewer who counts. How do I un-hide them? It doesn't say. In Cytoscape I'd drag the labels by hand, which is miserable, but at least they're there."

**Export dialog.**

"First frame I see is a module figure, 'Proteostasis screen', Ribosome, Proteasome, coloured dots. That's not my study, the project had a different name a minute ago. And the files are 'proteostasis-screen_...png'. Confusing, but OK, it's a mock-up."

"There's a yellow warning: 'Ribosome and Proteasome look the same in gray.' And a button 'Use Print look'. Oh, that's good. That's the sort of thing I'd never notice until the proofs came back."

"Now the fold-change one. Look: Print. 'File is written with: Print look.' The preview... is red and blue. It's lighter pink and dark blue dots. I asked for greyscale. Where is the grey? Underneath: 'Checked in gray: fold change runs light to dark from -2.52 to +3.15, and the legend states that 0 is the middle gray.' So it checked it in grey. But I can't see it in grey. I'm supposed to trust that sentence. I'd print it on the lab printer to find out."

"Legend in the figure: 'Fold change (log2). Darker is higher; 0, no change, is the middle gray.' OK, I read that twice. Darker is higher. So my most DOWN-regulated genes, -2.52, are the lightest dots on the page? Lighter than the genes that didn't change at all? In grey, a reader sees pale dots and thinks 'nothing happened there'. That's backwards for biology. Down-regulated is as interesting as up-regulated. I'd want both ends dark, or at least not have my down genes look like background."

"The methods box: 'Color: log2 fold change, linear, diverging at 0, -2.52 to +3.15; 148 proteins below 0, 152 above. Print look: one ramp, light red (lowest) through middle gray (0) to dark blue (highest). Drawn with graphty-element 2.6.2.' That's actually useful. I'd rewrite it, but the numbers are right there and I don't have to type the range in myself. That's the part I'd steal."

"Include legend: on. Good, legend in the file. That alone is worth something."

"Format: PNG, 2x, transparent. Transparent? For a journal I want white. There's a Background dropdown, 'Also: White, Light canvas'. I'd set White. PNG though. Where's PDF or SVG? The dropdown says PNG. Journals want vector or 300 dpi TIFF. '3,055 by 1,644 px' -- is that 300 dpi at what width? It doesn't tell me in inches. I'd click the PNG dropdown and hope there's PDF."

"The labels in the preview are tiny. Smaller than the legend text. At column width those are unreadable, and that's the other thing reviewers complain about. I can't see a size for labels anywhere."

"And I still don't see the label count. The preview shows MAPK1, HSP90AA1, MYC, AKT1, UBB, YWHAZ, RPS8, RPL28, TP53... I count maybe nine. Is that my ten minus overlaps? Where's the note saying 2 are hidden? It was on the style panel, not here where I'm exporting."

"'2 files go to your Downloads folder. Nothing is uploaded.' Good, that matters for unpublished data. I'd press Export 2 files."

**Moderator: did you finish the task?**

"Sort of. I have a file with a legend, the midpoint at zero, and red-blue not red-green. But I didn't see it in grey, I don't know if 'Print' is also 'colour-blind safe' because they're two separate choices, the down-regulated genes go pale in grey, two of the ten labels might be missing, and it's a PNG. I'd print it and look at it before I'd send it. With the reviewer I'd say 'revised' and then I'd be nervous."

## Single Ease Question

3 of 7. "Finding the colouring was fine once I was on the right screen. The grey part I couldn't check with my own eyes, and the labels I couldn't control."

## Would she use this instead of Cytoscape?

"For exploring, maybe. It shows the ranges and the counts -- 148 below, 152 above, 0 missing -- which Cytoscape never does, and the legend comes out with the figure, and the methods text has the numbers. Those are real. But this task was 'make the reviewer happy', and I'd still have to print it to see if the grey works, and fix the labels in Illustrator, and the file is a PNG. So the revised figure I'd probably still redo in Cytoscape with Legend Creator, because I know what I'm getting and reviewers know what it looks like. And, you know, how do I cite this in the methods?"

## Problems observed

1. **The Print look's preview is not grey.** The export preview in the Print look is still pink and blue; the only evidence of greyscale is a sentence saying it was checked. She cannot see the figure the reviewer will see and would print it to check. (Export dialog, fold-change figure in Print look.) Severity 3.
2. **"Print" and "Colorblind safe" are separate, single-choice Looks.** The reviewer asked for both; the menu lets her pick one and neither description says it also covers the other. She picked Print on the word "gray" and was left unsure. (Styles list, Look menu; export dialog, Look select.) Severity 3.
3. **In grey, the most down-regulated genes print palest.** The Print ramp runs light (lowest) to dark (highest), so -2.52 prints lighter than unchanged genes; she reads pale as "nothing happened" and calls it backwards for a diverging fold change. (Export dialog, legend "darker is higher".) Severity 3.
4. **Top N labels hide 2 of the 12 where they overlap, with no way shown to keep them; the export dialog does not repeat the count.** "Top 10 labelled" becomes eight names. (Styles list, Hub labels; export preview.) Severity 3.
5. **No "largest change either way" for top N on a signed column.** On a fold-change figure she expected "top 10 changed genes"; "by log2FoldChange" would only pick the most up-regulated. She fell back to degree. (Styles list, Hub labels, Applies to.) Severity 2.
6. **The Look menu hangs off an unlabelled palette icon.** She would not have found it; she only saw it because the frame showed it open. The export dialog's Look select is findable. (Styles list, Graph section header.) Severity 2.
7. **PNG only, transparent by default, pixel size with no inches or dpi.** Journals want vector or a stated dpi on white. (Export dialog, figure settings.) Severity 2.
8. **Label text in the exported figure is much smaller than the legend, with no size control visible.** (Export dialog preview.) Severity 2.
9. **The diverging palette's default is red for down, blue for up.** Her field uses red for up; there is a Reverse control, so it is a minor surprise, not a blocker. (Colour by value, fold-change scale.) Severity 1.
10. **The styles-list plus opens nothing in the prototype**, so she could not start the fold-change colour from the screen she was on; and the project name changes between screens (Stress response study, Proteostasis screen, Knockdown overlay). Prototype gaps, not design findings. Severity 1.

## What worked for her

- The column picker shows each column's type and range ("numbers, -2.52 to 3.15"), which tells her the table attached.
- Midpoint 0 is a visible, editable field, and the legend says "the palest color is 0, not missing".
- Below 0: 148, Above 0: 152, No value: 0 -- counts, so nothing was dropped silently.
- The legend is in the exported file, and the methods text carries the range, the counts, the look and the version.
- The warning "+3.15 (dark blue) and -1.85 (red) look the same in gray" with a one-click fix, and the module equivalent.
- "Nothing is uploaded."
- Changing "Top 12" to "Top 10" is one field, with the chosen names listed under it.
