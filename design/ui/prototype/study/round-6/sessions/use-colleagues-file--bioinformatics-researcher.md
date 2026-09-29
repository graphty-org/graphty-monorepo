# Session: using a colleague's analysis on your own gene list -- Dr. Chen (computational biologist)

Participant: Dr. Chen, group leader in computational biology; lives in R and igraph, drops into
Cytoscape for figures. Twenty-minute budget, skeptical by default.

Moderator's task, as given: "A colleague sent you their analysis to use on your own gene list. Get
your genes into it and tell me when it is ready."

This task was run for evidence only and is left out of the ease average: the start screen still
draws sample graphs directly under a recipe that is waiting for data, a change already decided but
not yet drawn. Any mix-up between a sample and the colleague's file is logged as known.

Screens seen, in order: the plain start screen; the start screen with the recipe waiting (the
recipe page's version, and the start-screen page's own version of the same card); the Apply recipe
dialog (waiting for a fold-change column, column chosen, two parts unbound); the binding step's
"Mdm2 matched by hand" state; the applied project; the storyboard of the recipe travelling, skimmed.
The replace-and-apply page is a fraud analyst's weekly file and was set aside.

## Transcript (think-aloud)

**1. The start screen.**

"Open a graph. 'Files stay on this computer. graphty reads them in this browser and uploads
nothing.' Good, that's the first thing I'd have asked. Four samples -- karate club, Les Miserables,
I've seen those in every network course since 2005 -- and Open... I'm not touching samples. The
colleague emailed me a file, so I drag it onto the page, or Open... and pick it."

**2. The recipe card.**

"'Recipe waiting for data. Expression overlay. Recipe, version 1. Saved by Maren on Sep 26 2026.'
Good -- a version and a name and a date. That goes in my notes.

'Colors your genes by log2 fold change, red for up and blue for down, draws the other proteins in
muted module colors, and hides interactions with confidence under 0.7.' Red and blue, not red and
green. Fine. Confidence 0.7 -- that's STRING's 'high'. I'd want to know it's the combined score and
which STRING version, but it's her file, I'll ask her.

'No data inside.' Clear. 'Expects: a protein network with a module per protein and a confidence per
interaction. It is not in this recipe; it was made on ppi-core-300.graphml.' OK. So this is a style
file, like a Cytoscape vizmap. It does not contain her network. Last time I had to guess that; this
time it says it in plain words. Good.

'Your own table of genes: a gene id per row and a fold change named log2FC, above and below 0. The
fold change is never taken from the network.' Right, I don't want her numbers on my genes.

'Data stays on this computer. This recipe names no server, so graphty contacts none.' Answered before
I asked. That's the privacy question done.

Now the problem. The task is 'get my genes into it'. It wants a protein network with modules and
confidence. I don't have ppi-core-300.graphml. I have a gene list with fold changes. My own STRING
export has node1, node2, combined_score -- no module column at all. So I either email Maren and ask
for her graphml, or I build modules myself first, which is not what 'use my colleague's analysis'
means."

She looks down the page.

"'Or try it on a sample. Protein interactions, 300 proteins.' ... Three hundred proteins. Her
network was 300 proteins. Is that her network? Is that the same thing as ppi-core-300? It has the
same number and it's sitting right under her recipe. If I were in a hurry I would click that and
assume it's what she built on. It isn't named ppi-core-300, and it's a 'sample', so I'm going to
assume it is somebody's demo, not hers. I don't put my genes on a demo network."

(Moderator did not answer.)

"I'll do what I'd really do: send Maren one line -- 'send me ppi-core-300.graphml' -- and carry on
when it arrives. Let's say it has."

Aside, on the start-screen page's own drawing of the same card: "This version says 'Sender's
network: STRING v12, 300 proteins, 1,262 interactions' with a Replace... button, as if her network
came in the file. The other one says it's not in the recipe. One of them is wrong. The one that
says 'not in this recipe' is the one I believe, because it also tells me the filename. But if I'd
seen this one first I'd have thought I already had her network." (Known.)

**3. Add data..., both files.**

"Add data... -- I give it ppi-core-300.graphml and my qpcr-hits-2026-09.csv. It doesn't ask me what
format they are. Good.

Dialog: 'Apply recipe Expression overlay. Data files: ppi-core-300.graphml, 300 proteins, 1,262
interactions; module, confidence, log2FoldChange. qpcr-hits-2026-09.csv, 96 rows: symbol, log2FC,
padj.' Those are the numbers I read first. 96 rows is right, that's my plate. 1,262 matches what
her card said. Good.

'84 of 96 genes matched.' In a heading. 'By the Gene id row below: the table's symbol column
against the network's protein names.' 'The 12 did not match. They stay in the table and are not
colored.' That is exactly what stringApp should have said instead of 'null'.

The 12:
- 7-Sep, 2-Mar -- 'not in this network; looks like a spreadsheet date.' Oh, for God's sake. Excel
  ate SEPT7 and MARCH2 again. Embarrassing, but it caught it, which is more than most tools do. I'll
  fix those in R. Although -- if I 'correct' them to SEPT7 and MARCH2, STRING v12 won't know those
  either; they're SEPTIN7 and MARCHF2 now. It can't tell me that, and it doesn't pretend to.
- Mdm2 -- 'differs only in letter case from MDM2. Use MDM2.' Somebody in my lab typed the mouse
  symbol. Click Use MDM2.
- TP53BP1, GAPDH, ACTB, VEGFA, HIF1A, IL6, CXCL8, SERPINE1 -- 'not in this network'. Fine, this is a
  300-protein network; GAPDH and ACTB are my housekeeping controls, I'd expect them to be missing.
- H2AFX -- 'not in this network'. Hm. H2AFX is the old symbol for H2AX. Is H2AX in her network and
  it just didn't recognise the alias, or is it genuinely absent? 'Not in this network' can mean
  either. That's the identifier-mapping problem I have with every tool.

'Copy the 12 ids.' Good. That goes straight into R."

After Use MDM2 (binding-step page): "'85 of 96 genes matched, 1 by hand. Mdm2 -- matched by hand to
MDM2. Undo match.' And 'No symbol appears twice. Every matched gene has a log2FC.' Good -- that's
the duplicate check I'd otherwise do myself."

**4. Which column is the fold change.**

"'Fold change, for color: Choose a column. Two columns could be the fold change. log2FoldChange --
in the network file; 300 values, -2.52 to 3.15; the recipe's own name. log2FC -- in the table; 84
matched values, -2.41 to 2.98.' Wait. Her network has a fold change column in it? The card said the
fold change is never taken from the network. So why is it offering it to me at all? And 'the
recipe's own name' next to hers reads like a recommendation. It's not my data. I pick log2FC, mine.

'Read as: Below 0 is down, above 0 is up' / 'An amount, bigger is more'. Below 0 is down. Obviously.
Then '36 up, 48 down; -2.41 to 2.98.' That I can check against my table in ten seconds. 36 up, 48
down, 84 total -- that adds up. On the binding-step page after the Mdm2 match it says 36 up, 49
down; 85. Also adds up. Good."

"'Module, for color: module -- same name in the network; 8 modules and 26 unassigned.' 'Confidence,
for the filter: confidence -- keeps 1,059 of 1,262 interactions.' So 203 edges under 0.7 go. That's
a number I can put in a legend."

On the binding-step version of the same dialog: "Here there's a third row from her network --
'Weight: confidence -> 10 communities, PageRank, Louvain' -- and 'Module: 9 modules'. The recipe
card never said it ran PageRank or Louvain. If it runs Louvain, what seed, what resolution? And is
it 8 modules or 9? And Louvain gives 10 communities, next to a 'module' column with 9 -- so which of
those is the colour? I'd be in the Data panel for ten minutes reconciling that."

"'Styles: Use these styles' or 'Add these styles on top'. I have no styles. Both say 'Base style
stays'. It makes me choose between two things that do the same thing to my empty project. I click
Use these styles. Apply."

Two-parts-unbound branch, skimmed: "If I'd given it the old graphml without module and confidence,
it says so before Apply: 'No category per protein in the data. Left unbound: Module color is kept
and switched off.' And 'all 1,262 interactions show'. That's honest. And 'proposed' next to log2FC
because nothing else is signed -- fine, it tells me it guessed."

**5. Applied.**

"'Expression overlay applied: 84 of 96 genes matched. Show the 12. Undo.' Top right, Statistics:
nodes 300, edges 1,059 of 1,262, 'Filtered'. 'Expression overlay: 84 of 96 genes matched; 12 did
not.' 'Last import: qpcr-hits-2026-09.csv.' So after the notice goes, the count is still there. I
like that. When Reviewer 2 asks, I can point at it.

Legend: 'Fold change color, log2FC, 84 genes, -2.41 down, 0, 2.98 up.' Blue-white-red, centred on
0, my column name, my range. That's a legend I could keep. 'Module color, 216 others, muted:
Ribosome 44, Proteasome 31, DNA repair 26, 6 more.' 44 + 31 + 26 is already 101 -- are those counts
of the whole module or of the 216 muted ones? And 3 plus 6 more is 9 modules. The dialog said 8.

Node table: id, module, log2FC, sorted by log2FC -- PSMA2 2.98, SNRPD3 2.62. My numbers, arrived as
numbers. Where's padj? The recipe colours every gene with a fold change regardless of significance.
A log2FC of 0.3 with padj 0.8 gets a faint colour. That's her choice, and it's wrong for my list,
but at least nothing is hidden.

Is it 2D? Yes. Thank you.

Is it ready? Yes: my genes are on her network, coloured by my fold change, filtered at her 0.7, and
I know which 12 are not on it. Ready to look at. Not ready to publish -- I'd add a padj cut first."

## Task outcome

Completed, with difficulty. The dialog itself was quick and clear. The difficulty was before it:
the recipe needs the colleague's network, which is not in the file, and nothing on the screen tells
her how to get it except its filename. She had to leave the tool to ask. The sample "Protein
interactions, 300 proteins" sitting under the recipe looked briefly like the colleague's network
(known mix-up).

## Single Ease Question

**5 of 7.** "Once I had both files, it was a 6 -- it told me the count, named every miss, caught the
Excel dates and the mouse symbol, and one Undo takes it back. It's a 5 because the first thing it
asks for is a network I don't have. 'It was made on ppi-core-300.graphml' is honest, but it means I
email Maren and wait. And that sample with 300 proteins right underneath is a trap for a student."

## Would she use this instead of her current tool?

"For this job -- putting my list on a colleague's colour scheme and filter -- yes, instead of
Cytoscape. Importing someone's vizmap XML in Cytoscape tells you nothing about what matched; this
told me 84 of 96 before it changed anything and named every one it missed. Instead of R? No. I still
don't know whether I can apply this recipe from a script or pull the node table back out as a TSV.
And it can't map old symbols to new ones, so I'd still clean my symbols in R first."

## Problems, in her words, with where she saw them

1. Recipe card and Apply dialog: the recipe needs the colleague's network and says only "it was made
   on ppi-core-300.graphml". No way to get that network from here, no hint to ask the sender. "The
   task stops at a filename." Severity: high -- it stopped her.
2. Start screen with the recipe waiting: the "Protein interactions, 300 proteins" sample sits under
   the recipe with the same node count as the colleague's network. Known, not a new finding.
3. Start-screen page's own drawing of the recipe card says "Sender's network: STRING v12, 300
   proteins, 1,262 interactions" with Replace..., while the recipe page's card says the network is not
   in the recipe. The binding-step page also lists "Sender's network" as a file. Known, same mix-up.
4. Fold-change picker offers the colleague's log2FoldChange from her network, labelled "the recipe's
   own name", although the card says the fold change is never taken from the network. Reads like a
   recommendation to use her values. Severity: medium.
5. Module counts disagree: "8 modules and 26 unassigned" (Apply dialog), "9 modules" (binding step),
   "10 communities" from Louvain in the Weight row, and the legend's 3 plus "6 more". Severity:
   medium -- a count she cannot reconcile.
6. Binding step: a Weight row that runs PageRank and Louvain appears in the dialog but nowhere on the
   recipe card; no seed or resolution shown. Severity: medium.
7. Unmatched list: H2AFX reported "not in this network" with no check of previous symbols (H2AX);
   "not in this network" does not separate an alias miss from a true absence. Severity: medium.
8. Unmatched list: the spreadsheet-date advice leads back to SEPT7 and MARCH2, which STRING v12 no
   longer uses; the dates get no one-click match while Mdm2 does. Severity: low.
9. Legend "Module color, 216 others, muted" followed by module sizes that already add to 101: unclear
   whether the counts are of the whole module or of the muted proteins. Severity: low.
10. "Use these styles" vs "Add these styles on top" when she has no styles of her own: a choice that
    makes no difference, and Apply waits for it. Severity: low.
11. padj arrives but is not shown in the node table, and the recipe colours every gene with a fold
    change whatever its significance; the dialog offers no significance cut. Severity: low.
12. Nothing about applying a recipe from R or Python, or getting the node table back out as a TSV.
    Severity: medium -- it caps her use at "viewer".

## What she liked

- The recipe card now says plainly "No data inside" and "It is not in this recipe", and who saved
  it, which version, and when.
- "This recipe names no server, so graphty contacts none" -- answered before she asked.
- "84 of 96 genes matched" first, in a heading, with all 12 named and a reason each, before anything
  changed; "Copy the 12 ids".
- The spreadsheet-date catch and the one-click Mdm2 match, marked "by hand" with its own Undo.
- "No symbol appears twice. Every matched gene has a log2FC."
- "36 up, 48 down" -- a count she can check against her own table.
- The applied count kept in Statistics after the notice goes, with the import filename.
- A blue-white-red legend centred on 0, on her column's own range, in 2D.
