# Session: use a colleague's file -- Maren (genomics postdoc, Cytoscape user)

Task given by the moderator, and nothing more: "Your lab lead emailed you this file. Use it on your gene list."

Participant: Maren, fourth-year cancer genomics postdoc who builds her network figures in Cytoscape with stringApp. Played on a 14-inch laptop, 1440 by 900.

Screens used: the start screen with a recipe waiting for data, then the binding step of the Apply recipe dialog (the state where some genes did not match, then the state after choosing a column). Controls in the mock are not live; when she clicked, the moderator showed the next screen.

## Transcript

**Before anything.** "OK, so what is the file? He just said 'use this'. It's not a network, it's not a table... I'd double-click it and see what opens. If that does nothing I drag it onto the browser."

**Start screen, recipe waiting for data.**

"Right. 'Open a graph.' Then a box: 'Recipe waiting for data. Expression overlay.' So it's a... style file? Like a Cytoscape session with the data stripped out, I guess. It doesn't say it's from him. There's no name, no date. If he sent me two of these I wouldn't know which is which."

"'Colors your genes by log2 fold change, red for up and blue for down.' Good -- red/blue, not red/green, my PI can read that. 'Draws the other proteins in muted module colors.' Module by what, MCODE? It doesn't say. 'Hides interactions with confidence under 0.7.' That's STRING combined score, I assume. Which STRING version? That's going in my methods, I need it."

"'It carries no data. To use it, open a protein network and a table of your genes with a fold-change column.' ... OK. I don't have a protein network. I have a gene list and my DESeq2 output. The network is the thing I get *from* STRING. Where's STRING? There's 'Connect to data source' at the bottom -- maybe that's it? It doesn't say STRING anywhere, I'm not clicking a thing that 'sends my query' somewhere without knowing where."

"And it says a network AND a table, but there's one 'Open...' button. Do I pick both at once? One after the other? In Cytoscape I'd import the network first, then import the table onto it."

"There's 'Knockdown screen, September, 300 proteins, yesterday' in the recents. Is that the lab network? Is that mine? I don't remember making that. I'm not going to guess on somebody's project."

"The lock line -- 'This recipe names no server, so graphty contacts none.' Fine. Good, actually. I can't upload unpublished data, so I'm glad it says that up front."

*Clicks Open..., picks her DESeq2 CSV (the only file she has). The moderator shows the binding step.*

**Binding step, some genes did not match.**

"Wait -- 'Data files: ppi-core-300.graphml, 300 proteins, 1,262 interactions; already open.' I didn't open that. Where did that come from? Is that the lab's network that came with the file? Did it pull it from somewhere? It says the recipe carries no data, so... I'm confused, but OK, there's a network, let's go on."

"My table: '96 rows: symbol, log2FC, padj.' Fine."

"Oh. '84 of 96 genes matched.' Big, at the top. THAT is what I want. Cytoscape never tells me that, I find out when the column is empty."

"'Letter case must match, as the recipe sets.' Hm. Why would the recipe care about case? Anyway. 'Mdm2 differs only in letter case from MDM2 -- Use MDM2.' Yes, obviously, click. Someone typed that by hand in the sheet."

"'7-Sep -- looks like a spreadsheet date.' HA. Excel ate my SEPT genes again. OK, it caught it, I'll give it that. But then -- why is there a 'Use MDM2' button and no 'Use SEPT7' button? You know it's a date. 2-Mar is MARCH2. Or MARC2, depending on the alias... fine, maybe that's why it won't guess. But now I have to go back to Excel, fix it, save as CSV and do this again. At least it named them."

"'TP53BP1 -- no node with this id.' 'id'? You mean it's not in the network. GAPDH, ACTB -- those are housekeeping, fine, they shouldn't be there. But TP53BP1, HIF1A, VEGFA, IL6 -- those are real, I want those in my network. In Cytoscape I'd just query STRING with the full list and they'd come in. Here they 'stay in the table and are not colored.' So the network is fixed at whatever the 300 are? That's a problem. That's not *my* network then, it's his network with my colours on it."

"'Copy the 12 symbols.' Good, I'll paste those into STRING web and check them myself. 'No symbol appears twice in the table.' Nice, I didn't even think about duplicates."

"Down here -- 'Fold change: Choose a column. 2 columns fit.' 'log2FC, in the table: 84 matched values, -2.41 to 2.98.' 'log2FoldChange, in the network file: 300 values, -2.52 to 3.15.' Wait, why does his network have a fold change in it? Whose experiment is that? It doesn't say. If I'd picked that one my figure would be his data with my title on it. Glad it asked instead of choosing. I pick log2FC, that's mine -- I can tell from the name and the 84, not from anything that says 'yours'."

*Picks log2FC and clicks Use MDM2. The moderator shows the next state.*

**Binding step, the column chosen.**

"'85 of 96 genes matched, 1 by hand.' And Mdm2 says 'matched by hand to MDM2, Undo match.' Good, so it's recorded. I'd want that in the methods somewhere."

"'Fold change: log2FC, 36 up, 49 down. Blue below 0, red above, as the recipe draws it; -2.41 to 2.98.' OK so centred on zero. Where's the scale though? I want to see the gradient, where it maxes out. My real data has a log2FC of like 8 on one gene and that washes everything else to pink. This just says the range. I can't see it."

"'Confidence: keeps 1,059 of 1,262.' Good, a number. Still don't know which score that is."

"'Apply is one step. One Undo takes all of it back.' OK. I'd press Apply. I think I'd get my genes coloured. But it's 85 genes of a 300-protein network I didn't build."

## After the task

**Single Ease Question (1 very hard -- 7 very easy): 4.**

"The matching part is honestly the best I've seen -- a number, every missed gene named, the Excel dates caught. That part's a 6. But getting there, I got stuck on the first screen. It told me to open a protein network, I don't have one, and nothing on that screen gets me one. If you hadn't moved me on I'd have emailed my lab lead asking 'what network?' And then a network showed up that I never opened."

**Would she use it instead of Cytoscape?**

"For checking which of my genes are even in the lab's network -- yes, maybe, that count is exactly what I lose an afternoon on. But I can't start from my gene list here, so the STRING step is still somewhere else, and the genes that aren't in his 300 just sit in the table. So I'd have to leave to do half of this. Then why not just stay in Cytoscape? And I didn't see the legend, the export, or anything I can cite. The paper figure stays in Cytoscape."

## Problems observed

1. Start screen recipe card: "open a protein network and a table" with a single Open... button; she has a gene list and a DESeq2 table, no network, and nothing on the screen gets her one. Would have stopped here without the moderator. (Severity 4)
2. Binding step lists "ppi-core-300.graphml, already open" that she never opened; she cannot tell where the network came from. (Severity 3)
3. Spreadsheet-date genes (7-Sep, 2-Mar) are detected but, unlike Mdm2, offer no fix; she must go back to Excel and redo the whole apply. (Severity 3)
4. Genes not in the network are only reported ("no node with this id", "stay in the table"); there is no way to bring her real genes (TP53BP1, HIF1A) into the network, so it is the lab's network with her colours, not her network. (Severity 3)
5. The second fold-change column in the network file has no owner or date; she could not tell whose experiment it was. (Severity 2)
6. "Confidence 0.7" never says which score or database version, which she needs for methods. (Severity 2)
7. The recipe card shows no sender, date or version, so two emailed recipes could not be told apart. (Severity 2)
8. The colour scale is text only; no gradient, no midpoint marker, no sign of how an outlier is clipped. (Severity 2)
9. "no node with this id" is database wording; she reads it as "not in the network". (Severity 1)
