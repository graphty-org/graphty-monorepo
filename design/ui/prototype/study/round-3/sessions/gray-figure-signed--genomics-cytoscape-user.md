# Session: a black-and-white fold-change figure, and reading it back

Participant: Maren, cancer genomics postdoc, Cytoscape user (persona: genomics-cytoscape-user).
Screens: the Export dialog (state "A signed layer", then the Screen look by toggling Look), with the Color by value screen for how the network got its colours.
Task as given by the moderator: "A journal wants a black-and-white figure of your fold-change network. Write the file, then read which genes went up from the file alone."
Screen: 14-inch laptop, 1440 x 900.

What she saw, as rendered:

- Export dialog in the Print look: `shots/r3-maren-gray-figure-signed.png`
- The same dialog before it, on the module-coloured network (Screen look and Print look): `shots/r3-maren-gray-figure.png`, `shots/r3-maren-gray-figure-print.png`
- The canvas styling she had set up earlier: `shots/screens__colour-by-value--numbers.png`

## Transcript (thinking aloud)

**On the canvas, before export.** OK, this is my network coloured by log2 fold change, red to blue, and the legend on the canvas says 0 is white. Below 0 is 148, above 0 is 152. Fine. Red-blue, not red-green, so my PI can read it. Journal wants black and white. In Cytoscape I would honestly just change the style to a grayscale gradient by hand, re-export, and pray. So where's export... "Export files..." top right. Click.

**The dialog opens.** Big dialog. Left side is a list of checkboxes -- Figures, Methods text, Graph data, Tables, Recipe, Findings report, Project. Too many things. I only want the picture. "Current view" is ticked, "2x PNG". Right side is a preview with the legend inside it. Oh -- the legend is in the picture. Good. That's the thing I always end up doing in Illustrator.

There's a "Look" dropdown that says Print. "File is written with: Print look." I didn't choose Print, it's already on Print. OK, whatever, Print is probably what I want for a journal.

**Looking at the preview.** Hmm. It's still in colour. Pinkish reds, gray, dark blues. I asked for black and white. Under the preview it says "Checked in gray: fold change runs light to dark from -2.52 to +3.15, and the legend states that 0 is the middle gray." So it's telling me it checked it in gray, but it isn't showing me the gray. I have to take its word for it. I'd want to actually see the gray version before I send it to a journal -- I've been burned by "it looks fine" before.

Legend says "Fold change (log2) -- darker is higher; 0, no change, is the middle gray." Ramp goes from light pink to gray to dark blue. So in gray: up = darker than middle gray, down = lighter. OK, I can follow that, if I read the legend. But wait -- on my canvas 0 was white, and here 0 is middle gray. So the down genes print lighter than the unchanged genes? That's backwards from what I'm used to. In Cytoscape the no-change genes are the pale ones. A reviewer glancing at this will think the pale nodes are the boring ones. I suppose the legend says it... reviewers don't read legends either.

**Toggling Look to Screen, to compare.** Let me flip Look back to Screen and see what it would have done. Now there's a yellow warning: "Fold change: +3.15 (dark blue) and -1.85 (red) look the same in gray, so up and down cannot be told apart in print." With a "Use Print look" button. OK -- that is actually useful. I would not have known that. Nobody tells you that in Cytoscape; you find out when the proof comes back. Flip it back to Print.

**File settings.** "2x", "PNG". Journal wants vector, or at least 300 dpi TIFF. Let me open the PNG dropdown... in the prototype it doesn't open, and the dialog never says what else is in there. I don't see PDF or SVG anywhere on this screen. The line at the top right of the preview says "3,055 x 1,644 px, PNG, transparent". Transparent! A journal figure on transparent background -- when it goes into their system it'll be on whatever. On the earlier module figure there was a "..." with Background: Transparent, and a hint "Also: White, Light canvas". On this one the "..." is there but nothing is open. I'd have to know to click the three dots. I would probably miss it and find out in the proof.

Filename: "proteostasis-screen_current-view.png". My project is called "Knockdown overlay" at the top left. Why is it called proteostasis-screen? That makes me nervous -- is it exporting the right network? The preview looks like mine, the numbers match (300 proteins, 1,262 interactions), so probably it's just the file name. But I'd rename it and I'd double check it's the right network.

Methods text, right side: "Color: log2 fold change (log2FoldChange), linear, diverging at 0, -2.52 to +3.15; 148 proteins below 0, 152 above. Print look: one ramp, light red (lowest) through middle gray (0) to dark blue (highest). Drawn with graphty-element 2.6.2." OK, that's good -- that's the sentence I'd have to type in the figure legend. I'd rewrite it, but it's a start. "graphty-element 2.6.2" -- how do I cite that?

"2 files go to your Downloads folder. Nothing is uploaded." Good, I like that it says it. Click "Export 2 files". Written.

**Now: read which genes went up, from the file alone.** OK, this is the part. I look at the preview, because that's what the file is. I can see darker dots and lighter dots, so I can tell there's a mix of up and down in each cluster. But which genes? There are labels on maybe fifteen nodes -- MAPK1, HSP90AA1, MYC, AKT1, TP53, UBB, YWHAZ, RPL23, RPS8 -- and those are the hubs, not my DEGs. The other 280-something dots have no name at all. So from this file I cannot tell you which genes went up. I can tell you "about half of them", which the legend already said: 152.

Even for the labelled ones -- MAPK1, is that dot darker or lighter than the middle gray? At this size I honestly can't tell. The dots near 0, like +0.3 or -0.3, are going to be the same gray. There's no cutoff, no padj, nothing that says "these are the significant ones". A reviewer will ask the same thing.

In Cytoscape I'd turn on labels for all nodes, or at least for the DEGs, and make the font bigger. I don't see anything about labels in this dialog. Is that on the canvas somewhere? I don't know. The task said from the file alone, so: I can read direction for a cluster, not for a gene.

## After the task

**Single Ease Question: 3 out of 7.** Writing the file was easy -- maybe a 5. Getting a file that a journal takes and that I can read gene-by-gene: no. I had to trust a line of text that it looks right in gray without seeing gray, it defaulted to transparent PNG, and the gene names aren't there.

**Would you use this instead of Cytoscape?** "The gray check is the best thing here. The Screen look warning -- dark blue and red come out the same gray -- I didn't know that and nobody tells you. And the legend being inside the picture, with the methods line next to it, that's two things I do by hand every time. But I asked for a black-and-white figure and it shows me a colour picture and says 'trust me, it's fine in gray'. I'd have to convert it myself anyway to check. And I can't read which genes went up, because only the hub genes have names. For the paper figure I'd still go back to Cytoscape and label the DEGs myself -- reviewers know what that figure looks like, and my PI would ask how to cite this. For looking at the network, maybe. For Figure 3, not yet."

## Problems observed

1. **Severity 4 -- The file cannot answer "which genes went up".** Only about fifteen hub genes are labelled; the other dots have no names, and nothing in the dialog controls labels. The task's second half failed.
2. **Severity 3 -- No gray preview.** The dialog asks for a black-and-white figure but only shows the colour Print look, plus a sentence saying it passed a gray check. She would not send a figure she has not seen in gray.
3. **Severity 3 -- 0 moves from white on the canvas to middle gray in print.** Down genes then print lighter than unchanged genes, which is the opposite of the pale-means-nothing reading she and reviewers bring from Cytoscape figures. Near-zero values on either side print the same gray, and nothing marks the significant genes.
4. **Severity 3 -- Transparent PNG by default, no visible vector format.** "3,055 x 1,644 px, PNG, transparent" is a poor default for a journal. The background choice is hidden behind the "..." button on this row, and PDF or SVG is never shown.
5. **Severity 2 -- The file name does not match the project.** The project is "Knockdown overlay" but the files are named "proteostasis-screen_...", which made her doubt the export held the right network.
6. **Severity 1 -- Too many export kinds for one picture.** Recipe, Findings report and Project file sit in the same list, so she had to skim past five sections to confirm only the figure was ticked.

What worked for her: the legend is inside the figure, the Screen-look warning names the colour pair that collides in gray, the methods sentence states the scale and the 148/152 split, and "Nothing is uploaded" is stated.
