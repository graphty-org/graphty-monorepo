# Session: using a colleague's file on your own genes -- Maren, genomics postdoc who uses Cytoscape

Task as given by the moderator: "Your lab lead emailed you this file. Use it on your gene list."

Participant: Maren, cancer genomics postdoc, the lab's de facto bioinformatician. Uses Cytoscape with stringApp two or three times a month. Played on a 14-inch laptop (1440 by 900).

Screens used: the start screen (first run, then dropping a file, then the recipe waiting for data) and the Apply recipe dialog (the preview, then the matching step with some genes unmatched, then with the column chosen). Her table for the session: qpcr-hits-2026-09.csv, 96 rows with the columns symbol, log2FC and padj.

Outcome: finished, with difficulty. She reached a ready-to-apply state with 85 of 96 genes matched and her own fold-change column chosen. On the way she nearly applied the recipe to a fold-change column she had not given it.

## Transcript (thinking aloud)

**Start screen, first run.**

"OK. 'Open a graph'. I don't have a graph, I have an email attachment from my PI, and I have my table. The attachment is called Expression overlay something. I don't know what kind of file that is -- is it a Cytoscape session? A style file?"

"'Files stay on this computer. graphty reads them in this browser and uploads nothing.' Good. That's the first thing my PI would ask. I'm not clicking 'Where your data goes' right now, but I'm glad it's there -- I might send that to him."

"Samples -- Karate club, Les Miserables, Protein interactions, Bank transfers. I don't need samples. There's 'Open...' and 'Connect to data source...'. Where's STRING? In Cytoscape I'd do File, Import, Network from Public Databases, pick STRING, paste my genes. There's nothing for pasting genes here. Maybe 'Connect to data source' is that, but I'm not going to guess. I'll just drag the attachment in, that's what I'd do anyway."

**Dragging the file over the window.**

"It highlights 'Drop to open'. It's under 'Open a graph', and this isn't a graph. I'm not sure it'll take it. Dropping anyway."

**The recipe card ("Recipe waiting for data").**

"'Recipe waiting for data. Expression overlay.' OK, so it's called a recipe. I've never called anything that, but fine."

"'Colors your genes by log2 fold change, red for up and blue for down.' Red-blue, not red-green -- good, my PI is red-green colour-blind, I don't have to fight that. 'Draws the other proteins in muted module colors, and hides interactions with confidence under 0.7.' So 0.7 is the STRING combined score, I assume. That's on the high side of what I usually use, but it's his call, it's his file."

"'It carries no data. To use it, open a protein network and a table of your genes with a fold-change column.' ... A protein network. I don't have a protein network. That's the whole point -- I have genes, the network comes from STRING. Is he expecting me to go to STRING, build it, export it and come back? What format? It doesn't say."

"'This recipe names no server, so graphty contacts none.' OK. So it isn't going to fetch STRING for me either. Hm."

"The blue button is 'Open...'. I'll click it, I guess, and see what it asks for. I'll give it my table if it asks for a file."

**Apply recipe dialog -- the preview (everything found by name).**

"Oh. It didn't ask me for anything. There's already a network open behind this -- ppi-core-300, 300 nodes. Where did that come from? I didn't pick that."

"'Brings 2 styles, 1 filter. You supply a network with a gene column.' Then a list of what it adds -- fold change colors, blue below 0, red above; module colors; confidence filter at 0.7."

"'What it reads from the data. Matched by name (3). Fold change -- log2FoldChange -- 152 up, 148 down.' OK, log2FoldChange, that's the DESeq2 column name, that's mine. 152 up, 148 down, that's about 300, I had about 300 DEGs. And the footer says 'Everything was found by name. One Undo takes it all back.' and Apply is blue. So... done? That was fast."

(Her cursor goes to Apply. She stops.)

"Wait. I haven't given it my file. How can it have my fold changes? ... 'Reads from ppi-core-300.graphml, opened by this recipe.' So those 300 fold changes are in HIS network file. That's his data, or somebody's data, from whenever he made this. That isn't my experiment. If I'd pressed Apply I'd have a nicely coloured network of someone else's fold changes and I'd have thought it was mine -- same column name, same rough number of genes. That's exactly the thing I'm afraid of. It says 'Everything was found by name' like that's good news."

"Where does my table go in? ... 'Add a table...', at the end of that line, very small. That's the only way in? OK. Add a table. qpcr-hits-2026-09.csv."

**Apply recipe dialog -- the matching step (12 genes did not match).**

"Right, this is the screen I've wanted from Cytoscape for years. '84 of 96 genes matched.' A number. Thank you. 'The table's symbol against the network's protein names; letter case must match.' OK, it tells me which column it used for the key. In Cytoscape I'd have got an empty column and no reason."

"'12 did not match. They stay in the table and are not colored.' Fine, at least it says so."

"'Mdm2 differs only in letter case from MDM2 -- Use MDM2.' Hmm. Mdm2 in that case is the mouse symbol. If this is a human network and one of my rows is written the mouse way, that's either someone typing sloppily in the qPCR sheet or it's a mouse assay. It's not the same question as a typo. Here I know it's human, it's our qPCR, somebody typed it badly, so -- Use MDM2. But I wouldn't want to click that on 40 genes without thinking."

"'Not in this network: 11 ids, for example 7-Sep.' 7-Sep, 'date?', 2-Mar, 'date?'. Ha. Excel ate my SEPT genes again. 'A spreadsheet can turn a gene name into a date when the file is opened. Correct them in your table and add it again.' Oh -- it caught the dates. Good. I'd rather it told me than guessed. 2-Mar could be MARCHF2 or MARC2, it can't know that. I'd have to go back into the sheet, fix it, save as CSV, add it again. Annoying, but fair."

"The rest: TP53BP1, H2AFX, GAPDH, ACTB, VEGFA, HIF1A, IL6, CXCL8, SERPINE1. GAPDH and ACTB are my reference genes, fine, I don't care about them. But HIF1A, VEGFA, IL6 not in the network? That's a cancer network without HIF1A. So this ppi-core-300 is some fixed 300-protein subnetwork he made for a different project. In STRING I'd query my genes and they'd be in the network because I asked for them. Here my genes just don't get coloured because they weren't in his network. That's backwards for what I'm doing. How do I get HIF1A in? I don't see a way."

"'Copy the 12 symbols.' Useful, I'd paste those into STRING to check."

"Down here -- 'Fold change: Choose a column. 2 columns fit.' log2FC, in the table, 84 values, -2.41 to 2.98. log2FoldChange, in the network file, 300 values, -2.52 to 3.15. OK, so NOW it's telling me there's a second fold change hiding in the network file. That's the thing I nearly applied a minute ago. Mine is log2FC, obviously. I'm glad it made me choose, but I'd have liked it to say 'this isn't yours' on the first screen."

"And Apply is grey: 'Choose the fold-change column to apply.' Fine, clear."

**After choosing log2FC and pressing Use MDM2.**

"'85 of 96 genes matched, 1 by hand.' 'Mdm2 matched by hand to MDM2, Undo match.' Good, it remembers I did that."

"'Fold change: log2FC -- 36 up, 49 down. Blue below 0, red above, as the recipe draws it; -2.41 to 2.98.' Centred on zero, that's what I want. 36 up and 49 down -- up and down by what? Everything with a fold change above zero? My padj column is right there and nothing uses it. In a figure I'd colour only the significant ones or at least grey the non-significant. It doesn't say what padj cutoff, because it isn't using one. That's a methods question I'd get from reviewer 2."

"'Module: module, 9 modules.' Module from where? That's also from his network file. MCODE? MCL? It doesn't say what clustering, and I'd have to write that in methods."

"'Apply is one step. One Undo takes all of it back.' OK. I'd press Apply now."

(Moderator ends the task here.)

## After the task

**Single Ease Question: 4 out of 7.**

"The matching part is honestly the best version of that I've seen -- a number, the unmatched genes by name, it caught the Excel dates, it made me choose the column. That part is a 6. But I nearly applied someone else's fold changes on the first screen, because it said everything was found and the column had my column's name. And the network isn't built from my genes, it's his fixed network, so a third of my interesting genes just aren't there. So, 4."

**Would she use this instead of Cytoscape?**

"For this exact job -- my PI sends me a style and I want to see my qPCR hits on the lab's network -- maybe, yes. It's faster than importing a table in Cytoscape and finding out the column is empty. But for my own gene lists, no. There's no STRING query from my genes, and I didn't see clustering or enrichment or hub genes, so I'd be leaving for half the pipeline anyway. And when reviewer 2 asks how the modules were made, I don't know what to write -- the recipe doesn't tell me. I'd use it to look. The figure stays in Cytoscape."

## Problems observed

1. **The preview says "Everything was found by name" using a fold-change column that came with the colleague's network file, not her data.** The column is named log2FoldChange, DESeq2's default, and the count (300) looked like her DEG count. She had her cursor on Apply before noticing she had not given it any file. Severity 3.
   > "If I'd pressed Apply I'd have a nicely coloured network of someone else's fold changes and I'd have thought it was mine."
2. **The recipe card says "open a protein network and a table", but the recipe opens its own network with no choice, and nothing lets her build a network from her genes.** She has a gene list, not a network. Severity 3.
   > "I don't have a protein network. That's the whole point -- I have genes, the network comes from STRING."
3. **Her genes that are not in the recipe's network (HIF1A, VEGFA, IL6) are only "not colored"; there is no way to bring them in.** For a gene-list-first user this is backwards. Severity 3.
   > "That's a cancer network without HIF1A. How do I get HIF1A in? I don't see a way."
4. **"Add a table..." -- the only way to give it her data -- is a small ghost button at the end of a line in the preview.** Severity 2.
   > "That's the only way in? OK."
5. **The fold-change colors ignore padj, and nothing says what "up" and "down" mean.** She cannot write the cutoff in methods. Severity 2.
   > "36 up and 49 down -- up and down by what? My padj column is right there and nothing uses it."
6. **"Use MDM2" treats a mouse-style symbol as a letter-case typo.** For her this is a species question, not a typing slip. Severity 2.
   > "Mdm2 in that case is the mouse symbol... I wouldn't want to click that on 40 genes without thinking."
7. **The module colors come from the colleague's file, and nothing says how the modules were made.** Severity 2.
   > "Module from where? MCODE? MCL? It doesn't say."
8. **"Drop to open" sits under "Open a graph", so she was not sure a non-graph file would be accepted.** She dropped it anyway. Severity 1.
9. **Fixing the Excel-date genes means leaving, editing the sheet and adding the table again.** She accepts it and praised the detection. Severity 1.

## What worked for her

- The file-privacy line on the first screen, before she gave it anything.
- "84 of 96 genes matched", with every unmatched gene named.
- The "date?" tag on 7-Sep and 2-Mar, and the plain explanation of it.
- Being made to choose between two fold-change columns, with each one's location, count and range.
- Red-blue centred on zero by default, not red-green.
- "Matched by hand" is marked and can be undone on its own.
