# Session: share the setup without the data -- Maren, genomics postdoc (Cytoscape user)

Task as given by the moderator: "Send your lab your setup so they can use it on their own data, without sending yours."

Screen: the Export dialog (screens/export-dialog.html), starting from its first state -- the dialog as it opens from Export... in the header, with a protein network of 300 proteins and 1,262 interactions loaded. Played on a 14-inch laptop, about 1440 by 900.

## Think-aloud

**1. Finding where to start.**
"OK, 'setup'. In Cytoscape I'd export the style -- File, Export, Styles to File, and I get a styles.xml I email around. Or I send the whole session file, but that has my data in it, which is exactly what I can't do. The unpublished screen isn't going to a partner lab's inbox. So I'm looking for something that is the style without the network."

"Top right, 'Export...'. That's the only thing that looks like it gets stuff out. Clicking."

**2. The dialog opens on figures.**
"Right, it's opened on the figure. There's my network with a legend -- actually with the legend in it, that's nice, I'll come back to that some other day. But that's not what I asked for. On the left: Figures, 'Current view' ticked, 'Figure 3: modules' ticked, Methods text ticked. Bottom right it says 'Export 3 files'. I don't want three files."

"The list scrolls. Graph data -- 'Graph file, nodes, edges and attributes, for Gephi, Cytoscape or a script'. No, that's the data. There's a pink tag, 'waits on graphty-element: graph-file export' -- I don't know what graphty-element is, I assume that one doesn't work yet. Skipping it. Tables -- no, that's the data too."

"'Starting point'. Hm. Starting point for what? I wouldn't have looked here. Under it: 'Recipe -- Definitions only, never the data', and 'Style file -- Style layers and the Look only'."

**3. Recipe or Style file?**
"This is the bit I'd actually hesitate on. 'Style file' is what I know. That's the Cytoscape thing. But 'style layers and the Look' -- what's 'the Look' with a capital L? And does a style file have my STRING cutoff in it? In Cytoscape it doesn't; the cutoff is in the query, and I have to tell people separately. 'Recipe' -- 'never the data' is the words I need to see, honestly. The word 'never' is doing the work. I'll try Recipe. If I'm wrong I can come back."

"I'm ticking Recipe. Do the figures untick? ...In what I'm looking at, the preview now shows the recipe and the figure rows are unticked, and the button says 'Export 1 file'. If they'd stayed ticked I'd have sent my lab my Figure 3 PNG by accident, which, fine, it's a picture, but it has my genes on it. I'd check that button count before I click."

**4. The preview: 'No data inside.'**
"Oh. OK. 'No data inside. No genes, interactions, fold-change values, positions or notes on genes.' Good. That's the first thing it says and it's the thing I'd have to say to my PI. I believe it a bit more because the third column actually lists what stays: '300 proteins, 1,262 interactions', '300 fold-change values', 'Knockdown hits (38 fixed)', '4 notes on genes'. Those are my numbers, so it's actually looked at my stuff and not just said 'trust me'."

"'Left behind' -- 'positions, the camera'. So they don't get my layout. Fine, their network is different anyway."

**5. 'Travels' -- what actually goes.**
"'style layers: fold change, module -- 2'. OK, so my fold-change colouring and the cluster colouring. Good, that's the style. 'filter: confidence 0.7 or more -- 1'. Good -- that's the STRING cutoff, I think, so they get the same cutoff. That's actually better than a styles.xml."

"'overview readings -- 6'. What's an overview reading? I don't know what that is. Six of something. I'd skip it, but I don't like sending things I can't name. 'view, without positions -- 1'. A view of what, if there are no positions? 'notes on definitions -- 1' versus '4 notes on genes' left behind -- OK, I think I get it, a note I wrote on the colour scale goes, a note I wrote on TP53 stays. I'd want to see which note is going, though. If I wrote something like 'CDK1 looks weird, check with Paul' on a style, that's going to the other lab."

**6. 'Asked for when applied.'**
"This column is for them, I guess. 'gene symbols, to join a table -- text'. Yes, they need gene symbols. Symbols, not UniProt IDs, or Ensembl? It says symbols; half my lab exports Ensembl out of DESeq2. They're going to hit this."

"'a fold change, above and below 0 -- signed'. Good, log2FC."

"'a module per protein -- categories'. Wait. They don't HAVE modules. Modules are what you get after you run MCL on the network. My lab mates have a gene list and a DE table. Is this going to re-run the clustering on their network, or is it going to stop and ask them for a module column they don't have? If it's the second, that's the 'only the column headers' thing all over again -- the colouring comes out grey and nobody knows why. This is the line that would make me email them a paragraph of instructions anyway."

"'a confidence per interaction -- number'. So they need a STRING network with scores already. Where do they get that? Does the recipe query STRING for them, or do they need to go do it in the stringApp first and bring a file? It doesn't say. If they have to go to Cytoscape to build the network before they can use this, my lab is just going to stay in Cytoscape."

**7. The file and the send.**
"'File: expression-overlay.graphty'. A .graphty file. So they need graphty. Is that something they install? A website? I'd have to tell them. The name field says 'Expression overlay', filled in -- fine, I'd rename it with the date, 'string07-fc-modules-2026-09' or something, because I'll have three of these by Christmas."

"Scope is greyed out, 'Whole project', and next to it 'A recipe takes definitions, not a scope of data'. Fine. Didn't need it."

"Footer: '1 file goes to your Downloads folder. Nothing is uploaded.' Good. I'd have looked for that. No 'share link', no sign-in. I email it. 'Export 1 file.' Clicking."

"Should I tick 'One methods file for this export' too? For a recipe? I don't know what it would write. For the lab protocol it would actually be useful -- 'cutoff 0.7, gradient centred on zero, clustering was this' -- so they know what they're reproducing. But I can't see what it would say before I tick it, the preview only shows the recipe. I left it off."

## After the task

**Single Ease Question (1 very hard -- 7 very easy): 4.**

"I got there. The part where it tells me what stays behind, with my actual numbers, is the best thing I've seen for this -- Cytoscape doesn't do that; you just trust that the style file has no data in it. But I found it under 'Starting point', which I wouldn't have guessed, I had to pick between Recipe and Style file without knowing the difference, and there are two lines in 'Travels' I can't name. And I'm not sure my lab can use it: it asks them for modules they won't have and a scored network it doesn't tell them where to get."

**Would I use it instead of what I do now?**

"For sending the setup? Maybe, for the colouring and the cutoff in one file -- that beats a styles.xml plus an email saying 'use 0.7'. But my lab's protocol says Cytoscape, and they'd have to install or open this thing, build the STRING network somewhere, and then run whatever makes the modules. If half the pipeline happens elsewhere, they'll just follow the protocol they have. I'd need to see what happens on their end -- when my lab mate opens this file with her gene list -- before I told anyone to use it."

## Problems observed

1. The recipe is under a heading, "Starting point", that does not say "setup" or "template" to her; she found it only by scrolling past every data row. (severity 2)
2. "Recipe" and "Style file" sit side by side with no visible difference she can act on; she guessed Recipe because it said "never the data", and she did not know whether a style file carries the confidence cutoff. "the Look" is an unexplained term. (severity 2)
3. "Asked for when applied" lists "a module per protein" -- a result of clustering, which her lab mates will not have. She cannot tell whether the recipe re-runs the clustering or will ask for a column they do not have; she expects silent grey nodes. (severity 3)
4. "Asked for when applied" lists "a confidence per interaction" but does not say where the recipient gets a scored network (STRING); she reads this as "they still have to go to Cytoscape first". (severity 3)
5. "overview readings (6)" and "view, without positions (1)" are items she cannot name, in a file she is about to send. (severity 2)
6. The one "note on definitions" that travels is counted but not shown; she wants to read it before it leaves. (severity 2)
7. Nothing tells her what the recipient needs to open a .graphty file. (severity 2)
8. Ticking the methods file with a recipe gives no preview of what it would write, so she left it off, though a written protocol for the lab is what she wanted. (severity 1)
9. The dialog opens with two figures and the methods file ticked; whether ticking Recipe clears them was only knowable from the button count. (severity 1)

## What pleased her

- "No data inside" is the first line of the preview.
- "Left behind" lists her own numbers (300 proteins, 1,262 interactions, 300 fold-change values, 38 knockdown hits, 4 notes on genes), so the claim is checkable.
- The confidence 0.7 cutoff travels with the colours, which a Cytoscape style file does not do.
- "1 file goes to your Downloads folder. Nothing is uploaded." -- no sign-in, no link.
- The blue-white-red fold-change ramp, not red-green.
