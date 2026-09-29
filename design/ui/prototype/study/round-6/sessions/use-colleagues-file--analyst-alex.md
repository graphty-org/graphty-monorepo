# Session: use a colleague's analysis on your own gene list -- Analyst Alex

Participant: Analyst Alex, an operations data analyst at a logistics company. He makes network
pictures for a monthly supplier-risk deck, usually NetworkX for the numbers and Gephi for the
picture. Genes are not his field; he knows Excel very well. He has mild red-green colour
deficiency.

Task as read to him: "A colleague sent you their analysis to use on your own gene list. Get your
genes into it and tell me when it is ready."

This task is run for evidence only and is left out of the ease average: the start screen still
shows the sample cards right under a recipe that is waiting for data, and moving them away is a
decided change that has not been drawn yet. Any mix-up between a sample and the colleague's network
below is logged as that known problem, not as a new finding.

Screens, in the order he saw them (study view; the colleague's file is `expression-overlay.graphty`,
his gene list is `qpcr-hits-2026-09.csv`, 96 rows):

1. `shots/tasks/use-colleagues-file/01-start-screen.png` -- the start screen
2. `shots/tasks/use-colleagues-file/02-recipe-apply-start.png` -- the recipe waiting for data
3. `tmp/alex-colleague-r6/ra-binding.png` -- the Apply dialog, fold change not yet chosen
4. `tmp/alex-colleague-r6/ra-confirmed.png` -- the Apply dialog, everything chosen
5. `shots/tasks/use-colleagues-file/03-recipe-apply-applied.png` -- the graph after Apply
6. `tmp/alex-colleague-r6/ra-unbound.png` -- looked at afterwards: the same dialog with an older
   network that has no modules or confidence
7. `tmp/alex-colleague-r6/binding-step.png` -- looked at afterwards: what the recipe holds

## Think-aloud

**Screen 1, the start screen.**

"OK. So someone sent me a file. Where does a file go... 'Open...'. That's the obvious one. Before I
do anything -- 'Files stay on this computer. graphty reads them in this browser and uploads
nothing.' Good. That's the first thing I look for and it's right at the top, I don't have to go
hunting in a privacy page. I'm not clicking 'Where your data goes', the sentence is enough for now.

Samples, karate club, Les Mis, protein interactions, bank transfers. Not what I want. I have a file
from a colleague. 'Open...', pick the file they sent me. One click, fine."

**Screen 2, the recipe waiting for data.**

"Right, it's opened something called a recipe. 'Expression overlay. Recipe, version 1. Saved by
Maren on Sep 26.' OK, so my colleague is Maren in this story. Fine.

It reads it back to me: colours my genes by log2 fold change, red up, blue down, other proteins in
muted module colours, hides interactions under 0.7 confidence. Honestly that's more than Maren
would ever have written in the email. I like that it tells me what it does before it does it.

'No data inside.' OK, so it's the steps, not the data. That's actually the thing I've wanted from
Gephi for years -- the settings without the file. And 'Data stays on this computer, this recipe
names no server.' Twice now. Good, I believe it.

'Expects:' -- two things. 'A protein network with a module per protein and a confidence per
interaction. It is not in this recipe; it was made on ppi-core-300.graphml.' Hm. So I need the
network too. I've got my gene list. Do I have the network? The moderator said my gene list. Maren
didn't send me a network, as far as I know.

And then right under it, 'Or try it on a sample' -- Protein interactions, 300 proteins. ppi, core,
300... 'ppi' is protein-protein interaction, right? So is that the same network? It says 300 and
the recipe was made on something called core-300. I'd guess the sample IS the network it wants.
That's my guess. I'm not sure, and it doesn't say. If I were doing this for real I'd message Maren
'which network file do I use', and wait an hour for the answer.

[Moderator note: this is the known sample-card mix-up. He reads the sample as a possible source of
the colleague's network. Logged as known, not as a new finding.]

Second bullet: 'your own table of genes: a gene id per row and a fold change named log2FC, above
and below 0. The fold change is never taken from the network.' OK, that's my CSV. Mine does have a
column called log2FC, so that's fine.

'Add data...' That's the button. I'll assume I can pick two files in the dialog, the network and my
CSV. If it only takes one I'll do it twice. I'm not clicking the sample, I'll go with Add data and
pick the network file I'd have got from Maren and my CSV."

**Screen 3, the Apply dialog, before choosing the fold change.**

"OK, both files are listed. ppi-core-300.graphml, 300 proteins, 1,262 interactions, and my CSV, 96
rows, symbol, log2FC, padj. 96 rows -- yes, that's how many I had. Good, that's the first thing I
check and it matches.

'84 of 96 genes matched.' And it lists the 12 that didn't. Oh -- '7-Sep, looks like a spreadsheet
date.' '2-Mar, looks like a spreadsheet date.' Ha. That's Excel eating gene names, isn't it. I know
that one. Excel turns anything that looks like a date into a date. That is exactly the kind of
thing that ends up in a report wrong, and it's telling me instead of quietly dropping them. That's
good. I'd have never spotted that myself.

'Mdm2 differs only in letter case from MDM2' with a 'Use MDM2' button. Yes, obviously, click. So
that's 85 now, I assume. It doesn't say 85 anywhere on this screen, I'd want it to go up when I
click. [Moderator: the mock does not show the count changing.]

The rest just 'not in this network'. ACTB, GAPDH -- even I know those are housekeeping genes, fine,
they're just not in a 300-protein network. 'Copy the 12 ids' -- good, that goes straight into my
spreadsheet as a note for Maren.

'What the recipe reads from the data.' Gene id: symbol, 84 of 96 matched. OK. Fold change: 'Choose
a column', with a yellow warning, 'Two columns could be the fold change.' log2FoldChange in the
network file, 300 values, and log2FC in my table, 84 values. Hm, so the network file has its own
fold change in it. Maren's, presumably. Well, the whole point is MY genes. And the recipe card said
'the fold change is never taken from the network.' So log2FC, mine. It would have been a nasty
mistake to get that wrong -- the picture would look perfect and be Maren's data. So I'm glad it
stopped me rather than picking one.

Though -- if the recipe itself says it never takes the fold change from the network, why is it
offering me the network one at all? That's a bit odd. I'd have expected it to just pick mine and
tell me.

'Read as: Below 0 is down, above 0 is up' or 'An amount, bigger is more'. It's log fold change, so
negative is down. The first one. That's fine, it's in plain words.

Module: module, confidence: confidence, 'keeps 1,059 of 1,262 interactions'. So it's going to hide
about 200 edges. At least it tells me the number up front.

Down the bottom, 'Styles: 2 layers', 'Use these styles' or 'Add these styles on top'. Layers. OK,
this is the one bit that sounds like a developer wrote it. 'Its 2 layers take the place of any of
yours that write the same thing; none of yours do.' I don't have any of mine, I just opened this.
So it makes no difference? Then why am I being asked? I'll pick 'Use these styles' because it's
first and 'use' is what I'm doing. It's a guess, but the sentence says nothing of mine gets lost
either way.

The footer: 'Apply waits for two choices: the fold-change column and how the styles go in.' OK,
that's honest, it tells me why the button is grey. I like that more than a grey button with no
reason."

**Screen 4, everything chosen.**

"log2FC, 'the table; the network's log2FoldChange is not used.' Good, that's the sentence I want.
'36 up, 48 down, -2.41 to 2.98.' 36 plus 48 is 84. Numbers add up. Use these styles is ticked.
'Apply is one step. One Undo takes all of it back.' Good, I'm less nervous. Apply."

**Screen 5, the graph after Apply.**

"'Expression overlay applied: 84 of 96 genes matched', Show the 12, Undo. OK.

Hang on, I clicked Use MDM2 -- shouldn't that be 85 of 96? It still says 84. Either the button
didn't do anything or I misread what it does. That's the kind of thing I'd have to check before I
tell anyone a number. [Moderator: the mock's applied state keeps 84 whether or not the case match
was accepted.]

Right panel: 300 nodes, 1,059 edges of 1,262. Filtered, and it says so, up at the top left too,
'Filtered: 1,059 of 1,262 edges'. That's what the dialog said. Components 12, isolated 11. Fine.
'Expression overlay, 84 of 96 genes matched; 12 did not' stays in the stats after the toast goes.
Good, I can find it again. 'Last import: qpcr-hits-2026-09.csv' -- yes, that's mine.

The legend: fold change colour, -2.41 down, 0, 2.98 up, blue to red. Blue and red I can tell apart,
that's not the muddy red-green thing. Good. 'Module colour, 216 others, muted', Ribosome 44,
Proteasome 31, DNA repair 26, 6 more. 216 plus 84 is 300. Adds up again.

Table at the bottom sorted by log2FC. PSMA2 2.98 top. That's the top of my CSV too, I think. I'd
check two or three against the spreadsheet. The column header says '-2.41 to 2.98; 216 empty',
fine, those are the ones not in my list.

Style stack: 'Fold change color, recipe', 'Module color, recipe', 'Base style'. So these came from
Maren's file and it marks them. Fine.

So is it ready? I'd say yes. Except the project's called 'Untitled'. If I close the tab is it gone?
The start screen said 'Projects are kept in this browser', so maybe it's saved already, but nothing
here says 'saved'. I'd rename it and look for a save before I said 'done' to anyone.

Also the picture itself -- the red and blue are my genes, great, but the big clumps are coloured by
Maren's modules, and I'll read those as 'my genes cluster here' whether that's right or not.
Anyway. It's ready. I'd tell you: ready, 84 of 96 matched, the 12 are in a list I copied."

**Screen 6, afterwards: the same dialog with an older network.**

"If I'd picked the wrong network -- this one says 'protein names only', and module and confidence
are 'Not bound' with a warning each, and it tells me what it switches off: module colour off, the
filter off, all 1,262 interactions show. That's good, it doesn't pretend. But again the dialog
doesn't tell me which network Maren meant; I'd only find out I had the wrong one here, after
picking it."

**Screen 7, afterwards: what the recipe holds.**

"Oh, there's more in here than the card said. It also runs PageRank, Louvain with seed 7, and
degree, and a ForceAtlas2 layout with seed 7. Seed shown, good, that's the thing I always ask
about Louvain. And 'Not included: 300 fold-change values, data.' OK, that explains the
log2FoldChange column -- Maren's own values were stripped. Wait, no, the network file itself still
had them. Whatever. 'Build your network from the same release', STRING v12. That's the answer to
my 'which network' question, but it's on a page I only found after I was done. On the card I
started from, the runs and the network version weren't mentioned."

## Single Ease Question

"Five. Maybe five and a half, but five. Getting my CSV in and the matching part was actually easy,
easier than anything I've done in Gephi -- it caught the Excel dates, it caught the case thing, it
made me pick my fold change instead of quietly using the wrong one. What took longest was working
out which network file it wanted. It says 'it was made on ppi-core-300.graphml' and then shows me a
sample called Protein interactions, 300 proteins, right below, and I had to guess. And the
Use-MDM2 button didn't change the count, so I don't fully trust that I clicked it."

Score: 5 of 7 (not counted in the ease average for this round; see the note at the top).

## Would he use it instead of his current tool?

"For this, yes. This is exactly the thing I can't do today. If someone sends me a Gephi project I
get their data, their colours and their layout, and I redo it by hand on mine. Here I got the steps
without the data, it told me what didn't match and why, and it drew it. That's the Gephi half of my
week done for me, if it works on my own networks the same way.

Would I switch for my supplier deck? Not yet. I'd want to see one of my own recipes rerun next
month and come out the same. But receiving someone's setup and pointing it at my data -- yes, I'd
do that here instead of rebuilding it."

## Findings (moderator notes, in plain terms)

1. Known, not new: the recipe card says the network is not included and names the file it was made
   on, while a sample called "Protein interactions, 300 proteins" sits directly underneath. He read
   the sample as a likely source of the colleague's network and had to guess. This is the decided
   but undrawn change (moving the samples away from a recipe waiting for data).
2. Beyond the sample mix-up, the card never tells him how to get the right network. The
   answer ("STRING v12, build your network from the same release") exists only on the recipe's
   detail view, which he found after he had finished. He would have asked the colleague and waited.
3. After he clicked "Use MDM2" the count stayed "84 of 96" in the dialog and in the applied notice.
   He expected 85 and began to doubt whether the button worked. That doubt carries over to any
   number he reports.
4. The fold-change picker offered the network's own fold change column even though the card had
   said the fold change is never taken from the network. He chose correctly and liked being
   stopped, but asked why a column the recipe rules out is offered at all.
5. "Use these styles" or "Add these styles on top" is a required choice on a blank project where
   both give the same result. The word "layers" read as developer speak. He guessed, without harm.
6. "Add data..." is one button for two files. He assumed it takes both at once, but nothing on the
   card says so.
7. After Apply the project is still "Untitled" and nothing says it is saved. He would not call it
   ready for anyone else until he had renamed and saved it.
8. The card summary mentions colours and the confidence filter but not the three runs (PageRank,
   Louvain, degree) or the layout the recipe also carries. He found them only on the detail view.

## What he liked

- The data-stays-here sentence at the top of the start screen and again on the recipe card, in
  plain words, where he loads the file.
- Row count of his CSV (96) shown in the dialog before anything happens, and the matched count
  (84 of 96) with every unmatched id and a reason.
- "Looks like a spreadsheet date" for 7-Sep and 2-Mar: he recognised Excel's date mangling at once
  and called it the kind of thing that ends up in a report wrong.
- "Copy the 12 ids" for his spreadsheet.
- Being made to choose his own fold change column instead of the tool silently using the one
  already in the network.
- The greyed Apply button with a footer saying exactly what it is waiting for.
- "One Undo takes all of it back."
- Numbers that add up everywhere he checked: 36 up plus 48 down is 84; 84 plus 216 muted is 300;
  1,059 of 1,262 edges said before and after Apply.
- A blue-to-red scale he can read, not red against green.
- The match count staying in the statistics panel after the notice goes away.
