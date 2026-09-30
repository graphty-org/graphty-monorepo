# Use a colleague's file -- Explorer Elena

**Participant:** Elena, a product manager with no graph or biology training. Spreadsheets every
day; has never said "node", "fold change" or "confidence score" out loud. Company laptop,
trackpad, browser only. Run as her first contact with graphty (short clock: about five minutes to
something that means something to her; two dead ends in a row and she stops).

**Task as given by the moderator:** "A colleague sent you their analysis to use on your own gene
list. Get your genes into it and tell me when it is ready."

She was handed a CSV of 96 genes (columns `symbol`, `log2FC`, `padj`) that had been opened and
saved once in Excel, and the colleague's email with its attachment, "Expression overlay". She was
not told what any column means.

**This task is flagged.** It depends on a studio decision that could not yet be drawn: the sample
cards are to move away from a recipe that is waiting for data. Two of the mocks still show them.
Where she mixes up a sample card with the colleague's file, that is logged as known, not as a new
finding, and this task is left out of the ease bar.

**Screens seen:** the email; the start screen with the recipe waiting for her table (the start
screen page, state 4); the older card with "Expects:" and the samples under it (the recipe apply
page, first state, and the storyboard); the Apply recipe dialog in the binding step page (table
not added, 84 of 96 matched, Mdm2 matched by hand, the "higher number means" menu); the Apply
recipe dialog on the recipe apply page (the version that asks her to choose the fold-change
column, the confirmed version, the version with an older network); the graph after Apply; the
project after one Undo. The "Replace data and apply a recipe" page was opened and left: it is a
bank-transfers picture with a File menu open.

Renders the participant looked at (participant view, design notes hidden):
- `../../../shots/record/r6-elena-colleague-recipe-travels.png` (the email and the older card)
- `../../../shots/record/r6-elena-colleague-start-screen--s4.png` (the "Recipe waiting for your table" card)
- `../../../shots/record/r6-elena-colleague-recipe-apply--start.png` (the older card, samples below)
- `../../../shots/record/r6-elena-colleague-binding-step.png` (the whole binding step page)
- `../../../shots/record/r6-elena-colleague-recipe-apply--binding.png`
- `../../../shots/record/r6-elena-colleague-recipe-apply--confirmed.png`
- `../../../shots/record/r6-elena-colleague-recipe-apply--unbound.png`
- `../../../shots/record/r6-elena-colleague-recipe-apply--applied.png`
- `../../../shots/record/r6-elena-colleague-recipe-apply--undone.png`
- `../../../shots/record/r6-elena-colleague-replace-and-recipe.png` (top only, left)

## Think-aloud

**The email.** "From Maren, to Tom -- OK, pretend it's to me. 'Lab overlay for Thursday.'
Attachment, 'Expression overlay', and then grey 'recipe'. Recipe. It's a file. I'm going to drag
it onto the window, that's what I do with everything."

**Start screen, the recipe card.** "'Open a graph.' 'Files stay on this computer', fine. And a
box: 'Recipe waiting for your table.' OK, so it caught the thing I dropped. 'Expression overlay.
Colors your genes by log2 fold change, red for up and blue for down.' Red up, blue down, got it.
Log2, no idea. 'Draws the other proteins in muted module colors, and hides interactions with
confidence under 0.7.' ...I'm skipping that sentence."

"'Sender's network: STRING v12, 300 proteins, 1,262 interactions.' Sender is Maren. So her
network's in here. Good, I don't have one of those. There's a Replace... button -- no. Not
touching Replace."

"'Your table: not added yet. It needs a gene id and a fold-change column. The sender's fold
change is not used.' OK. So it wants MY numbers, not hers. My sheet has 'symbol' and 'log2FC'.
FC, fold change. Symbol... is that a gene id? Probably. Hopefully it figures that out."

"Blue button, 'Add your table...'. Grey Apply next to it, 'Waiting for your table.' Yeah, I get
it, table first." *(She goes straight to the blue button this time; she does not click the grey
Apply.)*

"Down here, 'Recent projects', 'Mule ring review', 'Knockdown screen, September, 300 proteins.'
Wait, is that one Maren's? It's highlighted. 300 proteins, same as the network." *She hovers over
it, does not click.* "No -- it says recent, it's mine, I guess? I didn't make that. I'm leaving it."
*(The recents in this mock belong to someone else's work; for her they read as a possible second
copy of the colleague's thing. Small, but she paused on it.)*

**The other card (shown on the recipe apply page and in the storyboard).** *The moderator shows
her the version she would get from another entry.* "This one's different. 'Recipe waiting for
data.' 'Expects: a protein network with a module per protein and a confidence per interaction.
It is not in this recipe; it was made on ppi-core-300.graphml.' So... here I don't have her
network? The first one said her network was in it."

"And underneath, 'Or try it on a sample' -- 'Protein interactions, 300 proteins.' Oh! 300
proteins. That's the network. That's what it wants, right? I'd click that one." *(Known mix-up:
she took the sample card for the network the recipe needs. Logged as known, per the flag.)* "And
the blue button here just says 'Add data...', not 'your table'. Data, table. I'd have put my gene
list in here too, I think. Or the sample. Not sure which first."

*Back to the first card.* "I like the first one. It told me what I have and what I'm missing."

**Add your table.** *Picks the CSV.* "It's thinking. 'Matching 96 genes against 300 proteins.'
OK."

**The dialog: 84 of 96 genes matched (binding step page).** "Big heading, 84 of 96. So twelve
didn't make it. 'They stay in your table and are not colored.' OK, it didn't delete anything."

"'Mdm2, differs only in letter case from MDM2', button 'Use MDM2'. Sure." *Clicks.* "85 of 96,
'1 by hand'. Ha. And there's an 'Undo match' right next to it. Nice."

"'Not in this network: 11 ids, for example 7-Sep.' 7-Sep, 'date?', 2-Mar, 'date?'. Oh no, that's
Excel. And the grey box: '2 ids look like spreadsheet dates (SEPT2 -> 2-Sep).' Oh! So 7-Sep was
SEPT7. And 2-Mar is... MARCH2? M-A-R-C-H-2? That's a gene name? OK. I can fix that in my sheet.
That's on me, I opened it in Excel. 'Correct them in your table and add it again.' Fine, later."
*(She could act on it this time; she read the example mapping and worked out the second one.)*

"The rest -- TP53BP1, GAPDH, ACTB -- 'not in this network'. So her network just doesn't have
them? Or I spelled them wrong? ...Probably my list is weird. I'll leave them."

**The lower half.** "'What the recipe reads from the data.' Genes, to join: symbol, 85 of 96
matched. Fold change: log2FC, checkmark, '36 up, 49 down'. OK, that I can say out loud. 36 went
up, 49 went down."

"'From the sender's network, found by name.' Module, Confidence, Weight. '10 communities'.
Weight -- 'For confidence, a higher number means' -- dropdown -- 'a closer or stronger link,
similarity' -- 'the recipe's answer'." *Pause.* "No idea. But it's Maren's answer, and it's
Maren's network, so I'm not changing it."

*The moderator opens the menu.* "'A longer or costlier step, distance, your answer on this
network'? My answer? I didn't answer anything. 'More can pass through, capacity.' 'Don't use
confidence.' ...I'm closing that. Leave it on hers."

"'How the styles go in.' 'Use these styles -- No data inside. Its 2 layers take the place of any
of yours that write the same thing; none of yours do. Base style stays.' And 'Add these styles on
top.' Layers? I don't have any styles. The first one's already blue, I'll leave it."

"Up top it said 'Brings 2 styles, 1 filter, 3 runs.' Runs? PageRank, Louvain. Is that going to
take a long time? ...Whatever, it's hers."

"Bottom: '11 genes stay uncolored. Apply is one step; one Undo takes all of it back.' OK. That
makes me braver."

**The other dialog (recipe apply page, the version that asks her to choose).** *The moderator
shows her the version she might get instead.* "'Two columns could be the fold change', yellow
warning. 'log2FoldChange -- in the network file; 300 values, -2.52 to 3.15; the recipe's own
name.' And 'log2FC -- in the table; 84 matched values.'"

"But the first screen said the sender's fold change isn't used. And now it's offering it to me?
Hm." *Long pause.* "'The recipe's own name.' 300 values is more than 84. ...I'd pick the long one.
It's the recipe's. The recipe knows what it wants." *Picks log2FoldChange.* "'Read as: Below 0 is
down, above 0 is up.' That one."

*(She chose the colleague's fold change again, as in the last round. The version on the binding
step page and the confirmed version on the recipe apply page both say the network's column is not
used or not offered; this one still offers it, with the "recipe's own name" label that pulled her
toward it. She noticed the contradiction and still went with the recipe's name.)*

"Also 'Apply waits for two choices: the fold-change column and how the styles go in.' Two? I
only saw one question. Oh, the styles thing. Neither is blue here. I'd click 'Use these styles'
because it's first."

*The confirmed version.* "This one just says log2FC, 'the table; the network's log2FoldChange is
not used.' OK, see, that's clearer. Why did the other one ask me then?"

*The version with an older network.* "'Module: Not bound.' 'Confidence: Not bound.' Yellow
things. 'Left unbound: Module color is kept and switched off.' Bound, unbound. I don't know what
bound means. It still lets me click Apply, so... I'd click Apply and hope."

**Apply.** *Back on the main path. Clicks Apply.*

**The graph.** "Ooh. OK. It spread out into little clumps. That's nice."

"Bottom: 'Expression overlay applied: 84 of 96 genes matched', 'Show the 12', 'Undo'. Same
number as before. Good."

"Legend: 'Fold change color, log2FC, 84 genes', blue to red, -2.41 down, 2.98 up. 'Module color,
216 others, muted' -- Ribosome, Proteasome, DNA repair."

"And there's a table at the bottom. 'Filtered graph: 300 nodes, 84 with log2FC. Sorted by
log2FC.' PSMA2 2.98, SNRPD3 2.62, NDUFA6... OK, this I like. It's a sorted list. That's the thing
I'd actually paste into Slack: 'top ones are PSMA2 and SNRPD3.'"

"Right side, Statistics: 'components 12, isolated 11.' Isolated 11 -- that's the 11 that weren't
in her network. They're off on their own." *(They are not. 'Isolated' counts proteins in the
network with no interaction left after the filter; her 11 unmatched genes are not in the picture
at all. The two elevens lined up and she was sure.)*

"The labelled dots, PSMA2, SNRPD3, SKI, SMAD3 -- those are the important ones, they got names."

"Top left: 'Filtered: 1,059 of 1,262 edges.' Filtered? I didn't filter anything. Is it hiding
some of my stuff? ...It's probably her 'confidence' thing from the first sentence I skipped.
Leaving it."

"'Untitled' up top. Is this saved? I'd want it named 'Thursday' before I send anything."

**Undo, shown by the moderator.** "OK, back to a box. 'Expression overlay is waiting for data.
Add a protein network and a table of your genes with a fold-change column.' Wait -- a protein
network? It had Maren's network a minute ago. Did Undo throw her network away? Do I have to go
find it now?" *Pause.* "'Files on disk were not changed.' OK, but her network wasn't on my disk,
it was in the... thing. I'd just drop the email attachment in again and start over."

**"Tell me when it is ready."** "It's ready. It says applied, 84 of 96 -- 85 if I click the Mdm2
thing. Red went up, blue went down, PSMA2 is the top one, it's in the list at the bottom. The 11
that didn't match are the isolated ones on the side. I'd fix the two Excel dates, add it again,
and send Maren a screenshot and ask 'is this right?'"

## Single Ease Question

**5 of 7.** "The main way was easy. Blue button, my file, it told me what matched and what
didn't, and this time it even told me what the Excel date was supposed to be. But one version
asked me which fold change, and I picked hers, and another version wanted a protein network I
don't have. And after Undo it forgot her network. If I only ever got the first one, that's a 6."

## Would she use this instead of her current tool?

"My current tool for this is 'ask Maren'. So yes -- if someone sends me one of these, I'd rather
drop my list in than wait two days. It says what's going to happen before it does it, the counts
match all the way through, and the sorted list at the bottom is the part I'd actually use. I still
wouldn't put it in front of my VP without Maren checking it. I don't know if I picked the right
things, and I wouldn't build one of these myself."

## What the facilitator saw (not said by the participant)

- Main path (start-screen card with the sender's network named, Add your table..., 84 of 96, Use
  MDM2, Apply) completed in about three minutes with no wrong click; she went to the blue button
  first this time.
- The spreadsheet-date line now gives the before-and-after example ("SEPT2 -> 2-Sep"), and she
  used it to work out the other id. Last round she could not act on it. The date line on the
  recipe apply page's dialog still reads only "looks like a spreadsheet date", with no example.
- The recipe apply page's dialog still offers the network's `log2FoldChange` as a choice,
  labelled "the recipe's own name", with more values than hers. She chose it again and declared
  the result ready. She saw that it contradicted the start card ("The sender's fold change is not
  used") and still deferred to the recipe's name. The binding step page and the confirmed state
  never offer it.
- Known, per the flag: on the older card she took the "Protein interactions, 300 proteins" sample
  for the network the recipe needs.
- After Undo the card asks for "a protein network and a table", although the start card had the
  sender's network in place; she concluded Undo had thrown the colleague's network away.
- She read "isolated 11" in Statistics as her 11 unmatched genes, and the labelled dots as the
  important ones.
- She did not understand "Use these styles" / "Add these styles on top", "runs", "bound" /
  "unbound", or "a higher number means"; she passed each only because an answer was prefilled or
  first. Where the style choice was not prefilled, the footer's "two choices" surprised her.
- A highlighted recent project, "Knockdown screen, September, 300 proteins", made her ask whether
  it was the colleague's project.
- The sorted table under the graph was the single most useful thing to her; it gave her the
  sentence she would paste.
