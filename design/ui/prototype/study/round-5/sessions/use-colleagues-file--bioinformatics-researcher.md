# Session: using a colleague's analysis on your own gene list -- Dr. Chen (computational biologist)

Participant: Dr. Chen, group leader in computational biology; lives in R and igraph, drops into
Cytoscape for figures. Twenty-minute budget, skeptical by default.

Moderator's task, as given: "A colleague sent you their analysis to use on your own gene list. Get
your genes into it and tell me when it is ready."

Screens seen, in order: the start screen with a recipe waiting (current page, state 4, and an older
render of the same state in the shots folder), the recipe's card on its own, the Apply recipe dialog
(both the "two fold-change columns" version and the binding step's states: waiting, some matched,
Mdm2 matched by hand, nothing matched, what a weight means), the applied project, and the sender's
Export preview. The fraud-analyst replace-and-apply page was glanced at and set aside: it is not her
work.

## Transcript (think-aloud)

**1. The start screen, with the file dropped on it.**

"OK, so I dropped the file she emailed me. 'Recipe waiting for your table. Expression overlay.' Fine,
I'll call it a style file, that's what it is. 'Colors your genes by log2 fold change, red for up and
blue for down, draws the other proteins in muted module colors, and hides interactions with
confidence under 0.7.' Good -- red/blue, not red/green. Somebody has read Nature Methods.

'Sender's network: STRING v12, 300 proteins, 1,262 interactions.' Wait. Is the network in this file
or not? It's sitting there with a count, so it looks like she sent me her network. Then the page
says 'This recipe names no server.' And on the other version of this card I saw, it said in bold 'It
carries no data. To use it, add a protein network and a table of your genes.' Those two can't both
be true. Either I have 300 proteins on my machine right now or I don't. If I don't, where did the
1,262 come from?"

(Moderator did not answer.)

"I'll assume the colleague's network came with it, because it's got a number on it and a Replace
button. If I'm wrong I'll find out when it asks me for a file."

"'Your table: not added yet. It needs a gene id and a fold-change column. The sender's fold change
is not used.' Good, that last sentence matters -- I don't want her numbers on my genes. 'Add your
table...' is the obvious button, Apply is greyed with 'Waiting for your table'. That's clear. I'm
clicking Add your table."

Small thing: "One of the pictures of this card said 'red for down and blue for up'. The other said
red for up. The legend at the end says red is up. If the card and the legend disagree on the real
thing, I stop trusting both."

"And no author line on this version. The older card said 'Version 1. Saved by Maren Holt on 26 Sep
2026.' I want that. When Reviewer 2 asks where the colour scheme came from, 'an email' is not an
answer."

**2. Adding my table: the matching count.**

"I give it my qPCR hits CSV, 96 rows, symbol, log2FC, padj. The dialog: '84 of 96 genes matched.
Your table's symbol against the network's protein names; letter case must match, as the recipe
sets.' Good. That's the number I read first, and it names the 12. This is what stringApp should have
done instead of saying 'null'.

Now the 12.

- 'Mdm2, differs only in letter case from MDM2. Use MDM2.' Somebody on my team typed the mouse
  symbol. Fine, I click Use MDM2. It now says '85 of 96 matched, 1 by hand' and there's an Undo
  match. That's correct behaviour. 36 up, 49 down now; the Mdm2 went into down. The numbers moved
  the way they should. I checked.
- '7-Sep date?', '2-Mar date?' -- yes, Excel did that. The note says 'SEPT2 -> 2-Sep'. But my list
  says 7-Sep, not 2-Sep. Your example doesn't match my data; which one is it? And it tells me to
  'correct them in your table and add it again.' Correct them to what? HGNC renamed these in 2019 to
  SEPTIN7 and MARCHF2 exactly because of Excel. STRING v12 uses the new names. If I type SEPT7 back
  in, it still won't match. You know it's a date, you know which gene it was -- offer me the match
  like you did for Mdm2.
- 'H2AFX, no node with this id.' H2AFX is H2AX now. That's not 'not in the network', that's an old
  symbol. STRING knows the alias. So does g:Profiler. You're telling me it's absent when it's
  probably there under its current name. That's the identifier-mapping problem again, just politer.
- TP53BP1, GAPDH, ACTB, VEGFA, HIF1A, IL6, CXCL8, SERPINE1 -- genuinely not in a 300-protein core
  network, I believe that. GAPDH and ACTB are my housekeeping controls, I don't care. But VEGFA,
  HIF1A, IL6, CXCL8, SERPINE1 -- that's my hypoxia and inflammation signature. Those are the genes
  I'd want coloured. Her network is the wrong background for my list.

So what do I do about that? The only thing offered is 'Replace...' on her network. If I replace it
with my own STRING export, do I keep her modules? I'd guess no -- my STRING TSV has no 'module'
column. The other screen I saw confirms it: with a network that has only protein names, 'Module
color' and the confidence filter are switched off. So I can have her analysis or my genes, not both.
What I actually want is 'expand this network with my unmatched genes from STRING v12 at 0.7' -- and
nothing here does that."

"'Copy the 12 symbols' -- fine, I'll paste them into STRING myself. 'No symbol appears twice in the
table' -- good, I'd have asked."

**3. The other version: two fold-change columns.**

(On the screen where the network already carries a column called log2FoldChange.)

"'Two columns could be the fold change.' log2FoldChange, in the network file, 300 values, -2.52 to
3.15, 'the recipe's own name.' log2FC, in your table, 84 matched values. Honestly -- 'the recipe's
own name' makes the first one sound like the right one. It's the colleague's fold change. Her
experiment. If I'd been in a hurry I might have clicked it because it says 'recipe'. The newer
dialog just doesn't offer hers at all, and says so. That's safer. I prefer the newer one.

Then 'Below 0 is down, above 0 is up' vs 'An amount, bigger is more.' Obvious for log2FC. Harmless."

**4. What the recipe reads from the network.**

"'Module: module, 9 modules.' The older dialog said '8 modules and 26 unassigned.' Is 'unassigned'
the ninth module? Say so. And then 'Weight: confidence, 10 communities, PageRank, Louvain.' So her
'module' column has 9 and Louvain gives 10. Which one are the colours? I think the colours come from
her column, and Louvain is a separate run. But how was her 'module' column made? MCL? Louvain with a
different seed? It doesn't say, and I'm going to be putting module colours in a figure. 'Louvain
resolution 1, seed 7' -- that I like, there's a seed. I'd like the same for the column.

'For confidence, a higher number means: a closer or stronger link (similarity), the recipe's
answer.' Yes. For STRING's combined score, higher is stronger. I'm glad it asks. I'm surprised it
asks inside a colouring job, but it tells me who uses it -- PageRank and Louvain -- so fine.

'Confidence filter: keeps 1,059 of 1,262.' If her network was built at 0.7 from STRING there'd be
nothing to filter. So she pulled it at 0.4 and filters at 0.7 here. The note on the filter says
'build your network from the same release.' Reasonable. I'd want to see the 0.4 somewhere."

**5. Apply.**

"Footer: '12 genes stay uncolored. Apply is one step; one Undo takes all of it back.' (11 after the
Mdm2 fix.) Good. I press Apply."

**6. Applied.**

"'Expression overlay applied: 84 of 96 genes matched. Show the 12. Undo.' And the same count stays
in the Statistics panel after the toast goes -- '84 of 96 genes matched; 12 did not'. Good, because
toasts vanish while I'm looking at the other monitor. (If I'd done the Mdm2 fix it should say 85
and 11; I'd check.)

The legend: 'Fold change color, log2FC, 84 genes, -2.41 down, 0, 2.98 up', blue through white to
red. It's centred on zero, I think -- the white sits roughly at the zero tick. Not symmetric in range,
which is correct, it's my data's range. It says it's MY column. Good.

'Module color, 216 others, muted. Ribosome 44, Proteasome 31, DNA repair 26, 6 more.' 44 plus 31
plus 26 is already 101. Out of 216? Or those are the whole module sizes including my coloured genes?
I can't tell which. That's a number I'd be asked about.

The node table underneath: id, module, log2FC, sorted by log2FC, 'Filtered: 300 nodes, 84 with
log2FC'. PSMA2 2.98, SNRPD3 2.62. I can see my column arrived as a number. Where's padj? The
recipe colours every gene with a fold change regardless of significance. A 0.3 log2FC with padj 0.8
gets a faint colour. That's her choice, and it's wrong for my list, but at least I can see what it
did.

Is it ready? Yes: my genes are on her network, coloured by my fold change, and I know exactly which
12 are not. I'd call it ready -- ready to look at. Not ready to publish."

"Last thing I noticed: the file she'd export is 'expression-overlay.graphty, readable text (JSON)
with styles, steps and layout. It never holds your data.' Readable JSON I can put in git and diff.
That's the most useful sentence I've seen today. Can I apply it from R? Nothing here says."

## Task outcome

Completed, with difficulty. She got her table in, fixed one mismatch by hand, applied, and read the
result in about the time she'd allow. The difficulty was not the controls; it was two unanswered
questions: whether the colleague's network was in the file, and what to do about the 11 genes that
matter to her but are absent from a 300-protein network.

## Single Ease Question

**5 of 7.** "Clicking through it was easy. It's a 5 because I had to decide on my own whether her
network was in the file, and because the genes it couldn't place are the ones I care about, and it
gave me no way to bring them in. It told me the truth about them, which is more than Cytoscape does,
so it's not a 3."

## Would she use this instead of her current tool?

"For this one job -- taking a colleague's colour scheme and filter and putting my list on it --
yes, instead of Cytoscape. Importing someone's vizmap XML in Cytoscape tells you nothing about what
matched; this told me 84 of 96 and named every missing one, and one Undo takes it back. Instead of R?
No. I have no idea whether I can apply that JSON from a script and get the node table back as a TSV.
Until I can, this sits next to my pipeline, not in it. And if it can't recover SEPTIN7 and H2AX
from their old names, I'll be fixing symbols in R before I ever open it, which is what I do now."

## Problems, in her words, with where she saw them

1. Start screen (current) vs recipe card (older version on the recipe-apply page): one shows
   "Sender's network: STRING v12, 300 proteins" as if present, the other says in bold "It carries no
   data. To use it, add a protein network." The Export preview says the network is "named, not
   carried." "Is her network on my machine or not?" Severity: high -- it decides what she does next.
2. Binding step, unmatched list: the spreadsheet-date note says "SEPT2 -> 2-Sep" while the list
   shows 7-Sep and 2-Mar; and the advice "correct them in your table" leads back to SEPT7/MARCH2,
   which STRING v12 no longer uses (SEPTIN7, MARCHF2). The dates get no one-click match although
   Mdm2 does. Severity: medium.
3. Binding step, unmatched list: H2AFX reported as "no node with this id" when it is the previous
   symbol of H2AX. No alias or previous-symbol matching. Severity: medium (her top-listed
   frustration, identifier mapping).
4. No path to bring her unmatched genes into the colleague's network (for example, add their STRING
   neighbours at the same version and cut-off); Replace... drops the colleague's modules and filter,
   as the "two parts unbound" branch shows. Severity: high for her -- the genes she cares about are
   the unmatched ones.
5. Module counts disagree between screens: "9 modules" vs "8 modules and 26 unassigned"; and Louvain
   reports "10 communities" beside the "module" column, with no statement of how that column was
   made. Severity: medium.
6. Applied legend: "Module color 216 others, muted" then module sizes 44 + 31 + 26 (already 101) --
   unclear whether those counts are of the muted proteins or of each whole module. Severity: low.
7. Older start-screen render in the shots folder says "red for down and blue for up"; every other
   screen says red for up. Severity: medium if it ships, since it contradicts the legend.
8. On the older fold-change picker, "the recipe's own name" beside the sender's log2FoldChange reads
   like a recommendation to use the colleague's values. The newer dialog, which never offers the
   sender's column, avoids this. Severity: low (already addressed in the newer page).
9. The recipe ignores padj; every gene with a fold change is coloured whatever its significance, and
   nothing in the dialog lets the recipient add a significance cut. Severity: low (recipe content,
   not the tool).
10. No sign anywhere of applying a recipe from R or Python, or of pulling the node table back out.
    Severity: medium -- it caps her use at "viewer".

## What she liked

- "84 of 96 genes matched" first, in a heading, with all 12 named and a reason each, before
  anything changed.
- The Mdm2 case match offered as one click, marked "by hand", with its own Undo.
- The sender's fold change never offered as hers (newer dialog), and said so in one line.
- The applied count kept in Statistics after the toast goes.
- Blue-white-red diverging legend on her own column's range, labelled with the column name.
- The recipe file is readable JSON that "never holds your data", and the recipe states Louvain's
  seed and ForceAtlas2's settings.
- "This recipe names no server, so graphty contacts none" -- answered before she had to ask.
