# Session: using a colleague's file on your own genes -- Maren, genomics postdoc (Cytoscape user)

Task given by the moderator, and nothing more: "Your lab lead emailed you this file. Use it on your gene list."

Screens used: the start screen (`screens/start-screen.html`: first run, then the state with a recipe waiting for data), then the binding step (`screens/binding-step.html`: 12 genes not matched, then the column chosen, then nothing matched). Renders the participant saw: `shots/screens__start-screen.png`, `shots/record/start-screen--s4.png` and the study-view renders `shots/record/r3-maren-colleague-start.png` and `shots/record/r3-maren-colleague-binding.png`.

Outcome: success with difficulty. She got the file open and reached a screen that said exactly how many of her genes matched (84 of 96, then 85 after one fix by hand), named the 12 that did not, and caught two Excel-mangled gene names. The rough part was before that: nothing on the start screen said her lab lead's file was the kind of thing it opens, and the recipe then told her to open a protein network she does not have -- and a network appeared anyway, with no word on where it came from. She never saw her genes coloured in these screens; she stopped at Apply. Single Ease Question: 5 of 7.

## Transcript (think-aloud)

**Start screen, first look.**

"OK, 'Open a graph'. My PI sent me... whatever this is. It's an attachment, it's called something like Expression overlay. Is that a graph? I don't know what it is. It's not a GraphML, it's not an edge list, she said 'use it on your gene list'."

"Samples: karate club, Les Miserables, protein interactions, bank transfers. Karate club. OK. Protein interactions, 300 proteins -- that's the only one that's anything to do with me."

"'Files stay on this computer. graphty reads them in this browser and uploads nothing.' Good, that's the first thing my PI would ask. Our data is unpublished. I'm not clicking 'Where your data goes' right now but I like that it's there -- I could forward that to her."

"There's no 'paste your genes' box. There's Open... and Connect to data source. Connect to data source -- is that STRING? It doesn't say. I'll try the file first. I'll just drag the attachment onto the window, that's what I'd do in anything."

(The moderator says a dropped file opens the same way Open... does, and shows the next state.)

**Start screen, recipe waiting for data.**

"Oh, so it knew what it was. 'Recipe waiting for data. Expression overlay.' Recipe. OK, it's like a saved style, a session file without the data. That's actually what I'd want from her -- I don't want her data, I want her settings."

"'Colors your genes by log2 fold change, red for up and blue for down.' Red and blue, not red and green. Good, because the PI is red-green colour-blind and she'd send it back. 'Draws the other proteins in muted module colors, and hides interactions with confidence under 0.7.' 0.7 -- so that's the STRING combined score cutoff, high confidence. I'd have picked 0.4 or 0.7, fine, and it's written down, which matters for methods."

"'It carries no data. To use it, open a protein network and a table of your genes with a fold-change column.' ...A protein network. I don't have a protein network. I have a gene list and a DESeq2 table. In Cytoscape I'd do the STRING query from the gene list and then import the table onto that. Where's the STRING query? Is that 'Connect to data source' down there? It doesn't say STRING."

"And Open... here opens one file. It wants two things: a network and a table. Which do I open first? I'll open my table, because that's what I have."

"No version, no date, no 'from' on this card. If my PI changes this next month I'd want to know which one I used. For the methods."

(The moderator shows the binding step, the state with 12 genes not matched.)

**Binding step, 12 genes did not match.**

"'Apply recipe Expression overlay.' Data files: ppi-core-300.graphml, '300 proteins, 1,262 interactions; opened by this recipe.' Wait. Opened by this recipe? The card just told me it carries no data and I have to open a network. Now there's a network and the recipe opened it. From where? Is that my PI's network? Is it on her computer, or did it come in the email? I didn't open a GraphML. That's the kind of thing I'd stop and ask her about before I trusted any of this."

"Second file: qpcr-hits-2026-09.csv, '96 rows: symbol, log2FC, padj'. OK, that's my table. 96 genes. Fine, it read the columns and told me what they are."

"'84 of 96 genes matched.' Oh. A number. Thank you. That's the first thing I look for and I never get it in Cytoscape, I get an empty column and I have to go find out."

"'The table's symbol against the network's protein names; letter case must match, as the recipe sets.' So it matched on my symbol column. I didn't have to pick the key column, it just says which one it used. Good. Letter case must match -- hmm, why? They're human gene symbols, they're upper case anyway."

"'12 did not match. They stay in the table and are not colored.' OK, so it's not deleting them. That's good to know."

"'Mdm2 differs only in letter case from MDM2. Use MDM2.' Mdm2 -- that's the mouse style. Somebody typed that by hand in my table, or it came from a mouse list. Yes, obviously, use MDM2. That's the kind of thing where Cytoscape would just silently not match and I'd never know."

"'Not in this network: 11 ids, for example 7-Sep.' 7-Sep, date?, 2-Mar, date? -- DID EXCEL EAT MY SEPT GENES AGAIN. Yes it did. That's SEPT7 and MARCH2. And it caught it. 'Two ids look like spreadsheet dates (SEPT2 -> 2-Sep).' The example says SEPT2 but mine are 7-Sep and 2-Mar, so the example isn't even my genes, which is a little odd, but it's clear enough."

"'Correct them in your table and add it again.' So I have to go back into Excel -- which is what broke them in the first place -- and fix them and save as CSV and not let it convert them again. And actually, they're SEPTIN7 and MARCHF2 now, officially. If this network uses the new names, typing SEPT7 back in still won't match. It doesn't say which name it wants."

"The rest: TP53BP1, H2AFX, GAPDH, ACTB, VEGFA, HIF1A, IL6, CXCL8, SERPINE1. GAPDH and ACTB are my housekeeping controls, fine, they shouldn't be there anyway -- that's a qPCR table. But VEGFA? HIF1A? IL6 not in a protein interaction network? Those are the most connected genes in the whole interactome. That's because this network is only 300 proteins. So it's not the interactome, it's whatever my PI's network is. That's the problem with starting from someone else's network -- half my biology might not be in it. H2AFX -- that's H2AX now, maybe that's a naming thing again, it doesn't tell me."

"'Copy the 12 symbols.' Good, I'd paste those into a note. 'No symbol appears twice in the table.' OK, nice that it checked."

"Down here: 'Fold change -- Choose a column -- 2 columns fit.' 'log2FC, in the table: 84 matched values, -2.41 to 2.98.' 'log2FoldChange, in the network file: 300 values, -2.52 to 3.15.' The network file already has fold changes in it? Whose? My PI's experiment, I suppose. That's exactly the trap -- if I hadn't read this I'd colour my network with someone else's fold changes. I pick log2FC, mine, from the table."

"Apply is grey. 'Choose the fold-change column to apply.' OK, so it won't let me go on without choosing. Good."

**Binding step, column chosen and Mdm2 matched.**

"'85 of 96 genes matched, 1 by hand.' Mdm2 matched by hand to MDM2, Undo match. Fine."

"'log2FC -- 36 up, 49 down.' 85. Adds up. 'Blue below 0, red above, as the recipe draws it; -2.41 to 2.98.' So it's centred on zero and it tells me so. And the range is small, no crazy outlier at 9 washing everything out -- on this table. Good."

"'Every matched gene has a log2FC.' Good, no empties."

"Then Module, 9 modules. Confidence, keeps 1,059 of 1,262. So the 0.7 cutoff drops about 200 interactions. I like that it says how many, I'd put that in methods."

"'Weight -- confidence -- 10 communities -- Communities run.' Communities is the clustering, like MCODE. Louvain, it said on the first screen. 9 modules and 10 communities -- are those different clusterings? Now I have two sets of clusters and I don't know which one is 'the' clusters."

"'For confidence, a higher number means: a closer or stronger link, similarity.' Well, yes. It's a confidence score. Higher is more confident. I don't know why it's asking me. I'd leave it. 'Similarity' -- I wouldn't have used that word."

"'Apply is one step. One Undo takes all of it back.' OK. I'd press Apply."

(The moderator says the session ends at Apply. She does not see the coloured network.)

**Binding step, nothing matched (the moderator shows it as a what-if).**

"'None of the 96 genes matched.' Ensembl IDs in the table, gene symbols in the network. At least it says so instead of giving me an empty column. 'Match through a mapping table...' I'd need to make that mapping table myself in R with biomaRt, I suppose. But it tells me what's wrong in one sentence, which is more than the helpdesk ever did."

## After the task

**Single Ease Question:** 5 of 7.

"The matching screen was good. Honestly the best version of that step I've seen -- it told me 84 of 96, it named every one that didn't match, it caught Excel. Getting there was confusing: the first screen says 'open a graph' and nothing tells you it'll open my PI's file, and then the recipe says 'open a protein network' when I don't have one, and then a network turns up anyway and I don't know where it came from. If I'd been on my own I'd have emailed her to ask what file I was supposed to open with it."

**Would she use this instead of Cytoscape?**

"For this -- getting my table onto the lab's network with her settings, and knowing exactly what matched -- yes, I'd rather do that here than in Cytoscape, where the table import fails quietly. But it starts from her network, not from my genes. VEGFA and IL6 weren't in it. In Cytoscape I start from my list and STRING builds the network around it; here I don't see a way to do that. And I didn't see enrichment or cytoHubba. So I'd use this to check what matched and have a look, and the figure for the paper still goes through Cytoscape, because that's what's in the lab protocol and what reviewers recognise."

## Moderator notes (for the studio)

- The study view of the start screen hides the product's own text: the "Open a graph" title, the two privacy lines, and the recipe card's name, description, "It carries no data" and privacy line. The kit's study mode hides every heading and paragraph outside a `.k-app` frame, and the start screen draws its window as `.ss-win`, not `.k-app`, so the participant would see a recipe card with a heading and two buttons and nothing else. Her reactions above are to the full text, read from the normal render and the page.
- The saved render `shots/record/start-screen--s4.png` is out of date against the page: it shows "Add data...", a "Saved by ... on 26 Sep 2026" line, "Or try it on a sample" and "red for down and blue for up"; the page now has "Open...", no author line, no samples and "red for up and blue for down".
