# Session: use a colleague's file -- Maren (genomics postdoc, Cytoscape user)

Participant: Maren, cancer genomics postdoc who builds network figures in Cytoscape with stringApp two or three times a month (persona: `study/personas/genomics-cytoscape-user.md`).
Screen: 14-inch laptop, about 1440 by 900.
Task, as read by the moderator: "A colleague sent you their analysis to use on your own gene list. Get your genes into it and tell me when it is ready."
Task status: repeated from round 5 with unchanged wording. It is flagged: it depends on a decided change that could not be drawn (moving the sample cards away from a recipe that is waiting for data). It runs for evidence and is left out of the ease bar. Any confusion between a sample card and the colleague's file is logged below as known, not as a new finding.

Screens seen, in order: the start screen (`shots/tasks/use-colleagues-file/01-start-screen.png`), the recipe waiting for data (`02-recipe-apply-start.png`), the Apply dialog and its binding step (`screens/recipe-apply.html` states 3-4, `screens/binding-step.html` states 1-3b), the applied network (`03-recipe-apply-applied.png`). Also looked at: the newer recipe card on the start screen (`screens/start-screen.html`, state 4) and the storyboard of how the file travels (`storyboards/recipe-travels.html`).

## Think-aloud

### 1. The start screen

"OK. Open a graph. I've got an attachment in my email, which is -- it's their analysis, so I guess it's a file. There's Open... and there are these sample pictures. Karate club, Les Miserables. Protein interactions, 300 proteins. Bank transfers.

I'm not clicking a sample, I have a file. I'd just drag the attachment in. Or Open.... Fine.

'Files stay on this computer. graphty reads them in this browser and uploads nothing.' Good, that's the first thing my PI would ask. I'd click 'Where your data goes' once, later, to check it isn't lying, but for now I'll take it."

### 2. The recipe waiting for data

"Right, it opened something. 'Recipe waiting for data. Expression overlay. Recipe, version 1. Saved by Maren on Sep 26 2026.'

...Saved by Maren? I'm Maren. I didn't save this. Did I open the wrong attachment -- is this something of mine from last week? No, my colleague sent it. So there's another Maren, or it's showing my own name for some reason. That made me stop for a second. If it said the surname, or the colleague's email, I wouldn't have wondered.

'Colors your genes by log2 fold change, red for up and blue for down.' Red-blue, fine, not red-green, my PI can read that. 'Draws the other proteins in muted module colors, and hides interactions with confidence under 0.7.' 0.7 -- that's STRING's high-confidence cutoff, that's what I'd use for a figure. OK.

'No data inside.' Hm. So what did they actually send me? I thought I was getting their network.

'Expects: a protein network with a module per protein and a confidence per interaction. It is not in this recipe; it was made on ppi-core-300.graphml.'

So I need their network file and I don't have it. That's the problem with this whole thing for me: I don't have a network, I have a gene list. My network comes from a STRING query. I don't have a ppi-core-300.graphml anywhere, and I don't know what their 'modules' are -- MCODE? MCL? -- so I can't make one that matches. I'd have to email them back and say 'you forgot the network'. That's what I'd do. That's a day lost if they're slow.

'Your own table of genes: a gene id per row and a fold change named log2FC, above and below 0.' OK, my DESeq2 output has log2FoldChange, not log2FC. Does it have to be named exactly that? It says 'named'. I'd probably rename the column in R before I even try, because I've been burned before. That's me working around it, but I'd do it.

'Data stays on this computer. This recipe names no server.' Good.

Then 'Add data...' and 'Close recipe'. And underneath: 'Or try it on a sample.' Protein interactions, 300 proteins.

Wait -- 300 proteins. Their network is ppi-core-300. Is that it? Is the sample the network they meant? It's got 'protein interactions' and '300'. If I didn't have anyone to email, I would honestly click that and think I'd found the missing network. It's sitting right under the thing that says 'I need a protein network', with the same number in it." [Known: the sample cards under a waiting recipe; logged as known, not new.]

Moderator (neutral): "What would you do now?"

"Email them for the network file. Assume they send it back. ppi-core-300.graphml. Then I'd click Add data... and pick both files, the network and my table. It doesn't say it wants two files, it just says 'Add data...', but the Expects list does, so I'd select both."

Aside, on the other card design: "I also saw a different version of this card where it says 'Sender's network: STRING v12, 300 proteins, 1,262 interactions' with a Replace button, and 'Your table: not added yet'. That one reads like the network CAME with the file. But it also says no data inside. So which is it -- did they send me the network or not? In that version I wouldn't have emailed anybody, I'd have gone straight to adding my table. That one is better for me, if it's true. But I can't have both. If the network is in there, then 'no data inside' is wrong, and I'd start wondering what else is in there."

### 3. The Apply dialog: did my genes match

"OK. 'Data files: ppi-core-300.graphml, 300 proteins, 1,262 interactions; module, confidence, log2FoldChange. qpcr-hits-2026-09.csv, 96 rows: symbol, log2FC, padj.'

'84 of 96 genes matched.' Yes. That's the number. That's the first thing I look for and it's the biggest text in the box. 'By the gene id row below: the table's symbol column against the network's protein names.' Good, it tells me what it joined on.

'12 did not match. They stay in the table and are not colored.' And it lists them. 7-Sep -- 'not in this network; looks like a spreadsheet date'. There it is. Excel ate SEPT7. And 2-Mar, that's MARCH2. It caught it. I've literally lost a gene to that in a figure before. The other version of this screen says 'Correct them in your table and add it again' -- fine, it doesn't guess which gene a date was, which is right, because I wouldn't trust it if it did.

Mdm2 -- 'differs only in letter case from MDM2', Use MDM2. That's someone who copied a mouse symbol. Yes, use MDM2. It then says 85 of 96, 1 by hand, and 'Undo match'. Good, I can see what I did by hand. I'd want that in the methods, though, not just on screen.

GAPDH, ACTB -- 'not in this network'. Those are my reference genes, of course they're not. Fine. TP53BP1, VEGFA, HIF1A, IL6, CXCL8, SERPINE1 not in this network -- that's more annoying, because those would be in a STRING query of MY genes. That's the price of using their network instead of mine. It tells me, though. 'Copy the 12 ids.' Good, I'd paste those into my notes.

Then: 'Fold change, for color: Choose a column. Two columns could be the fold change. log2FoldChange: in the network file, 300 values, the recipe's own name. log2FC: in the table, 84 matched values.'

Why is there a fold change in their network? That's THEIR data. Obviously I want mine, log2FC. I'm glad it asked instead of just picking the one with the recipe's name, because that's exactly the silent thing Cytoscape does to me -- I'd have ended up coloring my figure with somebody else's experiment. In the other version it doesn't even offer theirs, it just says 'only your table's fold change is used' -- that's even better, one less thing to get wrong.

'Read as: Below 0 is down, above 0 is up' or 'An amount, bigger is more'. Below 0 is down. 36 up, 48 down -- 36 plus 48 is 84. OK, the numbers add up. I check that kind of thing.

Module and confidence come from the network, 'same name'. Keeps 1,059 of 1,262 interactions. Fine. In the other version there's a note that confidence is STRING's combined score, version 12.0 -- I want that line, that's my methods sentence.

There are also '3 runs: PageRank, Louvain, degree' in the other version. I don't know what Louvain is. I'd call it MCODE and move on. PageRank I've heard of, Google. Degree, yes, that's the hub genes. I skim that.

'Use these styles' or 'Add these styles on top'. I have nothing of my own yet, so I don't care. Use these. Apply."

### 4. Applied

"OK. It's flat, not spinning, white-ish background. Good. Fold-change legend in the corner: 'log2FC, 84 genes, -2.41 down, 0, 2.98 up.' The zero is in the middle and it's labeled. That's the thing I always have to fight for in Cytoscape. Module color underneath: Ribosome 44, Proteasome 31, DNA repair 26, 6 more -- and '216 others, muted'.

The bar at the bottom: 'Expression overlay applied: 84 of 96 genes matched. Show the 12. Undo.' And on the right, under Statistics, 'Expression overlay, 84 of 96 genes matched; 12 did not'. So the count is still there after the message goes away. Good -- that's the number I'd need a week from now.

The table: PSMA2 2.98, SNRPD3 2.62, NDUFA6... sorted by log2FC. The column says '-2.41 to 2.98; 216 empty'. 216 empty -- right, the ones without my data. At least it says so instead of pretending they're zero.

12 components, 11 isolated. I'd want to drop the isolated ones for the figure, like I do in Cytoscape with the largest component. I don't see it here but that's not this task.

It's ready. My genes are in their analysis. I'd tell you: ready, 84 of 96 matched -- 85 if I take the Mdm2 fix -- and here are the 12 that didn't."

## Single Ease Question

"How easy or difficult was this task?" (1 = very difficult, 7 = very easy)

**5.**

"Once I had both files, it was easy -- honestly easier than Cytoscape, because it told me the count, named the 12 and caught the Excel dates without me asking. What cost me was the start: the file they sent says it has no data and wants a network I don't have, and the only protein network in sight was the sample with 300 proteins, which looked like it might be theirs. If I hadn't been able to email them, I would have either clicked the sample or given up. And the 'Saved by Maren' threw me -- I thought I'd opened my own file."

## Would you use this instead of your current tool?

"For this -- someone hands me their setup and I drop my genes in to see where they land -- yes, I'd use it. It's faster than rebuilding their style in Cytoscape, and it doesn't lose my data quietly. The match count and the date warning are the two things I'd actually tell a lab mate about.

But not instead of Cytoscape. My network doesn't come from a colleague's file, it comes from a STRING query on my genes, and six of my 12 misses would have been in my own STRING network. I don't see the STRING query here, I don't see MCODE or cytoHubba, and I don't know how I'd cite this in the methods. So: I'd use it to look, and the figure for the paper still gets made in Cytoscape, because that's what the lab protocol says and what reviewers know."

## Observations for the studio

Known, not new (flagged in this task's setup):

- The sample cards sit under the waiting recipe, headed "Or try it on a sample". "Protein interactions, 300 proteins" looks like the missing "ppi-core-300" network the recipe asks for; the participant said she would have clicked it if she had no one to ask.

New or confirmed this session:

1. The recipe card the task path shows says the protein network "is not in this recipe", but the participant's job is to get her own gene list in, and she has no network file. Without the sender she was stuck, and a genomics user's network comes from a STRING query, not a file on a shared drive. (Severity 3.)
2. Two recipe cards disagree. The one on the task path (recipe-apply state 2) says the network is not in the recipe; the newer start-screen card (state 4) lists "Sender's network: STRING v12, 300 proteins, 1,262 interactions" with Replace..., under a card that elsewhere says "No data inside". Read side by side, she could not tell whether the colleague had sent the network or not, and began to doubt the "no data" claim. (Severity 3.)
3. "Saved by Maren" on the card collides with the participant's own name, and she briefly thought she had opened her own file. The sender is shown by first name only; the binding step shows "Maren Holt". A fixture problem, but also a sign that first name alone is not enough to tell sender from self. (Severity 2.)
4. "Add data..." on the older card does not say it wants two files (a network and a table); she read the Expects list to work that out. The newer card's "Add your table..." with the network already listed avoids this. (Severity 1.)
5. "a fold change named log2FC": she read "named" as a requirement and would rename her DESeq2 column (log2FoldChange) in R before trying. The dialog later proposes a column by type, but the card's wording made her do the work first. (Severity 2.)
6. On the task path's Apply dialog, the sender's own fold-change column is offered next to hers as "Two columns could be the fold change". She chose correctly and liked being asked, but preferred the binding-step version, where the sender's column is never offered. (Severity 1.)

What worked, in her words:

- "84 of 96 genes matched" as the biggest line, with all 12 named and a copy button.
- "7-Sep ... looks like a spreadsheet date": "It caught it."
- The legend with 0 in the middle, labeled -2.41 down and 2.98 up; red and blue, not red and green.
- The match count kept under Statistics after the notice goes away.
- "216 empty" in the log2FC column header instead of zeros.
- The STRING v12 note on the confidence filter (binding-step version), "that's my methods sentence".
