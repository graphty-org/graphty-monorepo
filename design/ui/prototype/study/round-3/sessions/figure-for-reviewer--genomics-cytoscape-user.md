# Session: a figure a reviewer can read in gray -- Maren, genomics postdoc (Cytoscape user)

Task given by the moderator, and nothing more: "Make the picture show which genes changed most, so a reviewer can read it, even printed in grey."

Screens used: the styles list (`screens/styles-list.html`), then the export dialog (`screens/export-dialog.html`). Renders the participant saw, study view with the design notes hidden: `shots/record/r3-maren-fig-styles-list.png` and `shots/record/r3-maren-fig-export-dialog.png`.

Outcome: failure. She reached a fold-change figure with a legend and a methods paragraph, but in the gray version the most down-regulated genes print as the palest dots on the page, lighter than the genes that did not change, and the gene names on the figure are the hubs rather than the genes that changed most. She would not send it to a reviewer. Single Ease Question: 2 of 7.

## Transcript (think-aloud)

**Styles list, first look.**

"OK. Stress response study, ppi-core-300, 300 nodes. It's a network, fine. Everything is orange-brown. The legend down here says 'Color: betweenness'. I didn't ask for betweenness. What I want is fold change."

"Right side, Attributes: log2FoldChange, -2.52 to 3.15. Good, so my fold change came in. It has a range, which is more than Cytoscape tells me. So the data is there. Now, how do I colour by it?"

"In Cytoscape I'd go to the Style tab, Fill Color, pick the column, continuous mapping. Here there's a 'Styles' list on the left: Betweenness color, Hub labels, Degree size, Base style. There's a plus next to Styles. I click the plus."

(Nothing happens in the prototype. The plus has no menu drawn.)

"Nothing. OK, maybe I click the log2FoldChange row on the right?"

(Also nothing; the attribute row is plain text.)

"Hm. So the thing I came to do isn't on this screen, or I can't find it. I can open Betweenness color -- there's an editor with 'Color: betweenness' in a little box and 'Edit a copy' at the top. Could I change 'betweenness' to 'log2FoldChange' in that box? It says 'written by the run', and there's a lock. I'm not going to edit something that's locked and generated. 'Edit a copy' -- a copy of betweenness? I don't want a copy of betweenness."

"The panel shows 'Scale: Log', 'Orange to brown', a histogram. Nice that it shows the histogram and '10 proteins, lightest' at zero -- that's the kind of number I want. But this is all about betweenness. Orange to brown is also not going to work for up and down. Up and down need two colours."

"There's a frame further down where the whole thing has a little menu off a paint-palette icon: 'Look for the whole project -- Default, Colorblind safe, Print, High contrast'. 'Print: prints well in gray.' OK, that's exactly the words I wanted. But I'd never have clicked that icon -- it's a tiny unlabelled thing next to the word 'Graph'. I only saw it because the screen was already open on it."

"I'd pick Colorblind safe, because of my PI. But I still don't have fold change on the nodes. I'm stuck on this screen. I'd go look for a tutorial at this point."

(Moderator moves her to the export dialog, where a fold-change style already exists on the project -- "Knockdown overlay", with a style called "Fold change color".)

**Export dialog, the fold-change figure.**

"OK, someone already did the colouring. Fine, pretend it was me. Export. There's a preview on the right with the legend in the picture. 'Fold change (log2)', -2.52, 0, +3.15, below 0: 148, above 0: 152. Oh -- the legend is in the file. That's the thing I've been fighting Cytoscape over for three years. Good."

"And the Methods text box: 'Color: log2 fold change (log2FoldChange), linear, diverging at 0, -2.52 to +3.15; 148 proteins below 0, 152 above.' It says 'diverging at 0'. That's the sentence I always have to write myself. I'd still rewrite it -- it says proteins, and my reviewer will want to know it's DESeq2 log2FC, not something it computed -- but it's a start."

"'2 files go to your Downloads folder. Nothing is uploaded.' Good, I'd have asked."

"Look: Print. 'File is written with: Print look.' And the little line under the preview: 'Checked in gray: fold change runs light to dark from -2.52 to +3.15, and the legend states that 0 is the middle gray.'"

"Wait. Light to dark from -2.52 to +3.15. So my most down-regulated gene is the lightest dot. Light pink, on white paper. The legend says 'darker is higher; 0, no change, is the middle gray'. So a gene that didn't change at all is middle gray, and a gene that went down four-fold is lighter than that -- basically white. In gray, the reviewer will look at the page and think the down genes are the ones where nothing happened."

"The task is 'which genes changed most'. Changed most is both ends. Down by 2.5 is just as much a change as up by 2.5. This picture, printed, says up is important and down is faint. My whole stress response story is half down-regulated genes -- 148 of them, it says so right there."

"And the preview -- it's still in colour. Pink and blue. It says 'Checked in gray' but I can't see the gray. I'd have to print it to find out. I'd print it."

"Now, the names. The labels on the network are MAPK1, HSP90AA1, MYC, AKT1, UBB, RPS8, TP53 -- those are the hubs, the ones with the most connections. They're always the hubs; every STRING network has UBC and HSP90AA1 in the middle. The genes that changed most aren't named. So the reviewer sees some dark blue dots and can't tell which genes they are. I'd have to label them in Illustrator. Which is the thing I'm trying to stop doing."

"The dots are tiny too. Three hundred nodes, most of them gray-ish, a few coloured specks. That's the hairball. The genes that changed most don't stand out from it. In Cytoscape I'd at least make the node size go with the absolute fold change or filter to padj < 0.05. I don't see padj anywhere here -- 148 'below 0' means every gene with any negative number counts, even -0.01."

"Format: 2x, PNG. Only PNG? The dropdown -- is there PDF? Nothing else is listed. Journals want vector or 300 dpi TIFF. 3,055 by 1,644 pixels, fine for a slide, but I'd want the PDF so the labels stay sharp. And 'Background: Transparent'. For a paper figure I want white. It says 'Also: White', so I'd change that. Transparent by default is going to surprise someone in PowerPoint."

"Earlier frame -- the one with the modules -- when it was on Screen it said 'Ribosome and Proteasome look the same in gray' and gave a 'Use Print look' button. That's actually useful. It told me something was wrong before I sent it. I just don't trust its idea of 'right' for fold change."

"So: I have a figure, with a legend, with a methods line. But printed in gray it hides my down-regulated genes, and it names the wrong genes. I wouldn't send that to a reviewer."

## After the task

**Single Ease Question: 2 of 7.** "I couldn't find how to colour by fold change at all on the first screen. Someone had to hand it to me. Then the print version made half of my result look like nothing."

**Would she use this instead of Cytoscape?** "Not for the paper figure. The legend in the file, and the methods line -- those I'd steal tomorrow. But in gray it tells the reviewer my down genes didn't change, it labels the hubs instead of my genes, and it's PNG only. And I still haven't seen my STRING query or my clustering in here. I'd maybe use it to look at the network. The Figure 3 panel stays in Cytoscape, because reviewers know what it looks like and my PI knows how to cite it."

## Problems, as she met them

1. **No way to start a fold-change colour from the styles list** (severity 3). The plus beside Styles opens nothing, the log2FoldChange attribute row is not clickable, and the only colour on screen is an algorithm's locked betweenness layer. She never found how to make "colour by fold change"; the moderator had to move her to a project where it already existed. "My fold change is right there on the right, -2.52 to 3.15. How do I put it on the nodes?"
2. **The Print look makes the strongest down-regulated genes the lightest marks on the page** (severity 4). The gray ramp runs light to dark from -2.52 to +3.15, with 0 as middle gray, so a gene down 2.5 prints paler than a gene that did not change. For "which changed most", both ends must stand out. "In gray, the reviewer will think my down genes are the ones where nothing happened."
3. **The names on the figure are the hubs, not the most-changed genes** (severity 3). Labels are the top 12 by degree. A reviewer cannot read which genes changed most without a name on them. "They're always the hubs. The genes that changed aren't named."
4. **The changed genes do not stand out from the hairball** (severity 2). Small dots, 300 of them, with no emphasis on the extremes and no significance cut (148 "below 0" includes tiny changes).
5. **PNG only, transparent by default** (severity 3). No PDF or other vector; a paper figure needs sharp labels and a white ground.
6. **The Print preview is still in colour** (severity 2). "Checked in gray" is a sentence she has to trust; she cannot see the gray version before printing.
7. **The Look menu hangs off an unlabelled icon** (severity 2). She found the Print and Colorblind safe choices only because a frame showed the menu already open.

## What she liked

- The legend is written into the exported image, with counts on each side of 0.
- The methods text says "linear, diverging at 0", the range and the counts, and names the look.
- "Nothing is uploaded" at the bottom of the dialog.
- Red-to-blue, not red-green.
- The gray check on the module figure named which modules would collide and offered a fix in place.
- The attribute panel shows log2FoldChange's range, so she knew her data had arrived.
