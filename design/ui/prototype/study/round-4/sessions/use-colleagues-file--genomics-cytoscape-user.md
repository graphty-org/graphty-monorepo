# Session: using a colleague's analysis on your own genes -- Maren, genomics postdoc (Cytoscape user)

Task given by the moderator, and nothing more: "A colleague sent you their analysis to use on your own gene list. Get your genes into it and tell me when it is ready."

Screens used, in the order she met them: the start screen with a recipe waiting (`screens/start-screen.html`, state 4), the Apply recipe dialog (`screens/binding-step.html`: waiting for your table, 12 genes did not match, Mdm2 matched by hand, nothing matched), the applied result (`screens/recipe-apply.html`, states 2 to 6), the storyboard `storyboards/recipe-travels.html`, and a glance at `screens/replace-and-recipe.html`. Renders she looked at: `shots/record/start-screen--s4.png`, `shots/record/recipe-apply--start.png`, `shots/record/recipe-apply--binding.png`, `shots/record/recipe-apply--confirmed.png`, `shots/record/recipe-apply--applied.png`, and the participant-view renders `shots/record/r4-maren-colleague-start-screen.png`, `shots/record/r4-maren-colleague-binding-step.png`, `shots/record/r4-maren-colleague-recipe-apply.png`, `shots/record/r4-maren-colleague-recipe-travels.png`, `shots/record/r4-maren-colleague-replace-and-recipe.png`.

Outcome: success with difficulty. She got to a coloured network with a count she believed (84 of 96 matched, 85 after one fix by hand), every unmatched gene named, and the two Excel-mangled names caught before anything changed. She called it "ready" -- but ready on her colleague's 300-protein network, not on a network built from her own genes, and she said so. Three things cost her trust on the way: one render of the recipe card says the colours the other way round ("red for down and blue for up"); after Apply, the muted module colours (pale blue Ribosome, peach DNA repair) look like weakly changed genes on the same blue-to-red scale; and the two versions of the dialog she saw disagree about whether her colleague's own fold-change column is offered. Single Ease Question: 4 of 7.

## Transcript (think-aloud)

**The start screen, with the file already dropped on it.**

"OK, so my colleague sent me 'Expression overlay'. Recipe waiting for data. I don't know what a recipe is in this context but fine -- it's their setup. 'Colors your genes by log2 fold change, red for down and blue for up' --"

(She stops.)

"Red for down? Everybody does red for up. Is that their choice or a typo?"

(Moderator says nothing. She goes on to the newer render of the same card, where it reads "red for up and blue for down".)

"Now this one says red for up. So which is it? If the same card says it both ways I'm going to check the legend on every single figure. That's exactly the sort of thing that ends up in a paper backwards." (The first render is older than the page; she has no way to know that.)

"'It carries no data. To use it, add a protein network and a table of your genes with a fold-change column.' -- I don't have a protein network. I have a gene list and a DESeq2 table. In Cytoscape the stringApp makes the network from my list. Where's that here?"

"The newer card is different: 'Sender's network: STRING v12, 300 proteins, 1,262 interactions', with Replace... next to it. So the network IS here. But the other card said it carries no data. Which is it -- did they send me their network or not? If it's their network, fine, that's honest, it says 'Sender's'. But then my genes are going onto their 300 proteins, not onto a network of my genes."

"'Your table: not added yet. It needs a gene id and a fold-change column. The sender's fold change is not used.' Good. I don't want their numbers on my figure. That's the right default."

"'This recipe names no server, so graphty contacts none.' Good, that's what my PI will ask. Nothing unpublished goes anywhere."

"Apply is greyed, 'Waiting for your table'. Fine, I get it: add my table first. Add your table..."

"There's also 'Connect to data source...' further down with a little (i). Is that STRING? I hover the (i)." (Nothing appears in the mock.) "Nothing. I'm not going to guess. If that's where I build a STRING network from my list, it should say STRING somewhere."

**Apply recipe, before my table is in.**

"'Brings 2 styles, 1 filter, 3 runs. You supply a table with a gene id and a fold change column.' OK, short, I read that."

"'Sender's network: STRING v12, ppi-core-300.graphml' -- right, so it's their file. And there's a note under Travels on the sender's side -- 'Confidence is STRING's combined score, version 12.0. 0.7 is STRING's high-confidence cut: build your network from the same release.' So they are telling me to build my own network. From my genes. With what? It doesn't say how."

"'What the recipe reads from the data'. From your table: Genes, to join; Fold change, log2FC. 'Only your table's fold change is used. The sender's network also has a log2FoldChange column; it is not offered here.'"

"Hm. My DESeq2 export -- the column is literally called log2FoldChange. That's what DESeq2 writes. So if my table has log2FoldChange, is it going to refuse mine because it's the same name as theirs? I'd want to see that before I trust it."

"And my R export usually has the gene symbols in the first column with no header, because they were rownames. Does it understand a column with no name? I've been bitten by that in RCy3."

"From the sender's network: Module, 9 modules. Confidence, keeps 1,059 of 1,262. Weight, confidence, 10 communities, PageRank, Louvain. 'For confidence, a higher number means a closer or stronger link.' OK, sure, higher STRING score is more confident, obviously. I'm not touching that."

"Nine modules and ten communities -- are those different things? In Cytoscape I'd call any of this MCODE. Why is one nine and one ten? Nobody explains that and I'm not going to ask."

"PageRank, Louvain, degree. Where are the hub genes? I'd run cytoHubba, MCC. Degree I understand -- most connections. PageRank is Google."

**My table added: 84 of 96 genes matched.**

"'84 of 96 genes matched.' Big, at the top. That's the number I always want and never get. Good."

"'Your table's symbol against the network's protein names; letter case must match, as the recipe sets.' OK, it says what it matched against what."

"'12 did not match. They stay in your table and are not colored.' -- that's exactly the sentence. They're not deleted, they're not silently dropped."

"Mdm2 -- 'differs only in letter case from MDM2', Use MDM2. Hm. Mdm2 with a small letter is how you write the mouse gene. If someone pasted a mouse row into my human list I'd want to know that, not just have it fixed. But in my list, yes, it's MDM2. I click Use MDM2."

"85 of 96, '1 by hand', and 'Undo match' next to it. Good. I can see what I changed. Fold change went to '36 up, 49 down'. That adds to 85. OK."

"'Not in this network: 11 ids, for example 7-Sep.' 7-Sep 'date?', 2-Mar 'date?'. 'A spreadsheet can turn a gene name into a date when the file is opened. Correct them in your table and add it again.'"

"Did Excel eat my SEPT genes again. Yes. 7-Sep is SEPT7, 2-Mar is MARCH2. Thank you for catching it. But -- 'correct them and add it again' -- if I type SEPT7 back in, will STRING v12 even call it SEPT7? I think it's SEPTIN7 now, and MARCH2 is MARCHF2. So I fix it and it still doesn't match and I'm back here. It doesn't say anything about the new names."

"The rest: TP53BP1, H2AFX, GAPDH, ACTB, VEGFA, HIF1A, IL6, CXCL8, SERPINE1. GAPDH and ACTB are my reference genes, fine, they shouldn't be in a network. But IL6? VEGFA? HIF1A? Those are in every STRING network on earth. They're 'not in this network' because this network is my colleague's 300 proteins. That's true, and it says 'this network', so it's not lying. But it means the analysis doesn't fit my genes. I'd need Replace... with my own STRING export -- which I'd have to go and make in the STRING website, download, come back. And H2AFX is H2AX in newer STRING, so same alias problem."

"'Copy the 12 symbols' -- good, I'll paste those into my notes."

"'12 genes stay uncolored. Apply is one step; one Undo takes all of it back.' OK. Apply."

**A second version of the same dialog.**

(On `screens/recipe-apply.html`, state 3, she sees the other drawing of the dialog.)

"Wait, this one asks me something the other one didn't. 'Two columns could be the fold change': log2FoldChange 'in the network file; 300 values, the recipe's own name', or log2FC 'in your table'. So here it IS offering my colleague's column, and the other one said it would never offer it. If I picked the first one by accident I'd get their fold change on my figure and think it was mine. I pick log2FC, 'Below 0 is down, above 0 is up'. 36 up, 48 down. Fine."

"And this one says '8 modules and 26 unassigned', the other says '9 modules'. Small, but I notice numbers that don't agree."

**Applied.**

"OK. Legend in the corner: 'Fold change color, log2FC, 84 genes, -2.41 down, 0, 2.98 up'. Blue to red. Not red-green, my PI will be fine. The 0 is marked, and it's not in the middle of the bar, it's where zero actually is. Good -- that's the midpoint thing I always have to check."

"'Expression overlay applied: 84 of 96 genes matched. Show the 12. Undo.' And on the right: 'Expression overlay, 84 of 96 genes matched; 12 did not'. So the count stays after the message goes. Good."

"Table at the bottom: PSMA2 2.98, SNRPD3 2.62, NDUFA6... sorted by log2FC. 'log2FC -2.41 to 2.98; 216 empty.' Right, 216 of their proteins have none of my data."

"Now the picture. The labelled ones -- PSMA2, NDUFV2, SNRPD3 -- dark red, clear. But look at the cluster on the right. It's all pale blue. Is that my down-regulated genes, or is that 'Ribosome, muted'? The Ribosome swatch in the legend is pale blue. My -0.5 genes are pale blue. I can't tell them apart. Same with the orange cluster at the bottom -- 'DNA repair' is peach, and my slightly-up genes are peach. So on this picture I can't read which of my genes went down in the ribosome cluster. That's the one thing it was supposed to show."

"And the colour next to Proteasome in the table is orange, but in the legend Proteasome is pale yellow. Which one is the module colour?"

"There are dark grey dots too. Unassigned, I guess? It's not in the legend unless it's in '6 more'."

"Filter says 'Filtered: 1,059 of 1,262 edges'. That's their 0.7 cutoff. Statistics: 12 components, 11 isolated. In Cytoscape I'd keep the largest component now. I don't see where. Not this task, but I'd look."

**Undo.**

"Undo takes it all off and the card says 'Files on disk were not changed.' Good. I'd want that."

**The storyboard and the fraud screen.**

(She pages through `storyboards/recipe-travels.html`.)

"There's a column here, 'What we expect him to say', with quotes. Somebody wrote down what I'm supposed to say? 'Thirty-six and forty-eight, that's eighty-four. That's mine.' OK, well -- I did say roughly that. It's weird to read it before I've said it."

"'Saved by Maren Holt.' That's my name. I didn't make this. My colleague sent it. Confusing, but I assume it's a placeholder."

(`screens/replace-and-recipe.html`: bank transfers, "Apply recipe Mule ring triage".) "That's fraud stuff. The dialog looks different there, 'attributes to bind', 'Leave unbound'. Not mine, skipping."

**Moderator: "Is it ready?"**

"It's ready in the sense that my genes are on it and I know exactly which 11 aren't, and why. That part is better than Cytoscape. Cytoscape would have given me an empty column and a shrug."

"It's not ready in the sense that it's their network. Eleven of my genes -- IL6, VEGFA, HIF1A, the interesting ones -- aren't there because they didn't have them, not because they don't interact. For my own list I'd need my own STRING network, and I can't see how to make one in here. And I can't read my down-regulated genes in the pale blue cluster. I wouldn't show this to my PI yet."

## Single Ease Question

4 of 7. "Getting my genes in was easy and honest -- the count, the named misses, the Excel dates. That's a 6. But one card says the colours backwards, the dialog I saw twice disagreed about whose fold change it would use, and the result mixes module colours into my fold-change scale. And the network isn't built from my genes. So, 4."

## Would she use this instead of her current tool?

"For taking a colleague's setup and checking my list against it -- yes, maybe, because it tells me what matched, and I've wanted that for years. I'd use it to explore."

"Instead of Cytoscape, no. The STRING query from my gene list isn't here that I can see, the clustering is Louvain not MCODE, no cytoHubba, no enrichment. So I'd leave to do half of it -- then why not stay in Cytoscape. And how would I cite this in methods? My PI won't accept a figure from a tool nobody cites. The paper figure stays in Cytoscape."

## What the moderator observed

- She read the count first, then the unmatched list, then the fold-change line. She never read the "For confidence, a higher number means" row or the Weight row beyond one glance.
- She stopped on "red for down and blue for up" (a render older than its page) and it coloured the rest of the session: she checked the legend orientation twice more.
- She read "Not in this network" correctly as "not in the sender's network" and concluded the analysis is built on the wrong network for her list. Replace... was seen but she had no network file to replace it with, and nothing told her how to build one from her list.
- She caught Mdm2 as a possible mouse symbol before accepting the case match.
- She worried, unprompted, that her DESeq2 column name (log2FoldChange) is the same name the dialog says it will refuse, and that R's unnamed first column would not be offered as the gene id.
- After Apply she could not separate muted module colours from weak fold changes in the pale blue and peach clusters.
- She noticed the two drawings of the dialog disagree (the sender's column offered in one, never offered in the other; 9 modules in one, 8 plus 26 unassigned in the other).
- The storyboard's participant view still shows "What we expect him to say" quotes; she read them before answering.
