# Use a colleague's file -- Explorer Elena

**Participant:** Elena, a product manager with no graph or biology training. Spreadsheets every
day; has never said "node", "fold change" or "confidence score" out loud. Company laptop,
trackpad, browser only. Run as her first contact with graphty (short clock: about five minutes to
something that means something to her, two dead ends in a row and she stops).

**Task as given by the moderator:** "A colleague sent you their analysis to use on your own gene
list. Get your genes into it and tell me when it is ready."

For the session she was handed a CSV of 96 genes (columns `symbol`, `log2FC`, `padj`) that had
been opened and saved once in Excel, and the colleague's email with its attachment,
"Expression overlay". She was not told what any column means.

**Screens seen:** the email with the attachment; the start screen with the recipe waiting for
data (two versions of the card); the Apply recipe dialog before a table is added, after the table
is added (84 of 96 matched), the version that asks which column is the fold change, the version
with an older network, and the "a higher number means" question; the graph after Apply; the
project after one Undo. The "Replace data and apply a recipe" page was glanced at and left: it is
about bank transfers.

Renders the participant looked at (participant view, design notes hidden):
- `../../../shots/record/r4-elena-colleague-recipe-travels.png` (the email frame only)
- `../../../shots/record/r4-elena-colleague-start-screen.png` (the "Recipe waiting for your table" state)
- `../../../shots/record/r4-elena-colleague-recipe-apply.png`
- `../../../shots/record/r4-elena-colleague-binding-step.png`
- `../../../shots/record/r4-elena-colleague-replace-and-recipe.png` (scrolled, left)

## Think-aloud

**The email.** "From Maren, 'Lab overlay for Thursday', attachment 'Expression overlay recipe'.
Recipe. OK. I don't know what that means but fine, it's a file. I'll just drag it onto the thing."

**Start screen, recipe card.** "'Open a graph'... and then a box, 'Recipe waiting for your table'.
OK so it knew what I dropped. 'Expression overlay'. 'Colors your genes by log2 fold change, red for
up and blue for down.' I don't know what log2 is. Red up, blue down, I get that part."

"'Sender's network: STRING v12, 300 proteins, 1,262 interactions.' Proteins? I have genes. Is
that the same? I'm going to assume that's her thing and it came with the file. There's a
'Replace...' button next to it -- no. Not touching anything called Replace."

"'Your table: not added yet. It needs a gene id and a fold-change column.' My sheet has 'symbol'
and 'log2FC'. log2FC... fold change... FC, fold change. OK, I think that's it. Gene id, I don't
have a column called gene id, I have symbol. Hopefully it figures that out."

*She moves to the grey Apply button first and clicks it. Nothing.* "Apply's greyed out. Oh --
'Waiting for your table', right next to it. And the blue one, 'Add your table...'. Yeah, obviously."

"'This recipe names no server, so graphty contacts none.' Good, I guess. I wasn't worried until
it said it."

*The moderator shows her the other version of the card (the one on the "Share and apply a recipe"
page).* "Wait, this one says 'To use it, add a protein network and a table of your genes.' I don't
have a protein network. She didn't send me one. Do I have to go get one? From where?" *Pause.*
"If I got this one I'd just message Maren and ask her to do it. The first one was fine, it
already had her network in it."

**Add your table.** *Picks the CSV.* "OK, it's thinking... 'Matching 96 genes against 300
proteins'."

**The dialog: 84 of 96 genes matched.** "84 of 96. That's most of them. What happened to the other
12?"

"'12 did not match. They stay in your table and are not colored.' OK, so it didn't delete them,
good. Then a list. '7-Sep, date?' '2-Mar, date?' ...I don't have a gene called 7-Sep. Oh no.
That's Excel. I opened it in Excel. That's on me."

"'2 ids look like spreadsheet dates. Correct them in your table and add it again.' Correct them to
what? What was 7-Sep before Excel ate it? I don't know gene names. SEPT something? I'd have to ask
Maren. I'm leaving those two."

"'Mdm2, differs only in letter case from MDM2', and a button, 'Use MDM2'. Sure." *Clicks.* "'85 of
96.' Ha. OK, that was easy."

"'Not in this network: TP53BP1, H2AFX, GAPDH, ACTB, VEGFA...' Not in this network. So did I
spell them wrong, or does her network just not have them? ...Probably my list is weird. I'll
leave it." *(She does not try Copy the 11 symbols.)*

**The lower half.** "'What the recipe reads from the data.' Genes, to join: symbol. Fold change:
log2FC, a checkmark, '36 up, 48 down'. OK! That's a sentence I can actually say. 36 of my genes
went up and 48 went down. I don't know what 'went up' means biologically, but I can say it."

"'Module', 'Confidence', 'Weight' -- 'from the sender's network, found by name'. Those are hers.
Fine."

"'For confidence, a higher number means' -- and a dropdown, 'a closer or stronger link,
similarity'." *Long pause.* "I have no idea. It's already filled in, it says 'the recipe's answer',
so, the recipe knows. I'm not changing it."

*The moderator shows her the version where that dropdown says "Choose" and Apply is off.* "Then
I'm stuck. 'A longer or costlier step, distance'? 'More can pass through, capacity'? These are
all words. I'd pick the first one because it's first, or I'd close it. Probably close it."

**The version that asks which column is the fold change.** "'Two columns could be the fold
change.' Yellow warning thing. Options: 'log2FoldChange -- in the network file; 300 values; the
recipe's own name' and 'log2FC -- in the table; 84 matched values'."

"log2FoldChange is the full name. And it says 'the recipe's own name'. So that's the one the
recipe wants, right? Mine is just the short version." *Picks log2FoldChange.* "Then 'how should it
be read' -- 'Below 0 is down, above 0 is up'. Up and down, like the card said. That one."

*(She chose the colleague's fold change, not her own. The picture she would have got would show
Maren's numbers on the network. She did not notice and was confident.)*

*The moderator asks what she thinks she picked.* "The fold change? For my genes. It said 300
values, which is more than 84, so it's the complete one, I figured." 

**Apply.** "'Apply is one step. One Undo takes all of it back.' OK, good, that makes me braver."
*Clicks Apply.*

**The graph.** "Ooh. OK, that's nice. It spread out into little clumps." *Watches.* "Pretty."

"Bottom: 'Expression overlay applied: 84 of 96 genes matched', 'Show the 12', 'Undo'. So it says
the same number as before. Good, nothing went missing between the two."

"Legend on the left: 'Fold change color, log2FC, 84 genes', blue to red, -2.41 down, 2.98 up.
'Module color: Ribosome 44, Proteasome 31, DNA repair 26, 6 more.'"

"So the dark red ones are my important genes. PSMA2 is the reddest -- that's the top one. SNRPD3,
NDUFA6. Those are the winners."

"And all the grey dots, those are the 12 that didn't match." *(They are not. The grey dots are the
network's other proteins, which were never on her list; her 12 unmatched genes are not in the
picture at all. The legend says "216 others, muted"; she did not read that line.)*

"Top left says 'Filtered: 1,059 of 1,262 edges'. Filtered? I didn't filter anything. ...Is it
hiding some of my stuff? I don't know what an edge is. I'm going to leave it, it was probably in
her recipe."

"It says 'Untitled' up there. Is this saved? Did it go back to Maren? I'd want it to have a name
before Thursday."

**Undo, shown by the moderator.** "OK so it went back to the box, 'Expression overlay is waiting
for data'. And my file is still fine, 'Files on disk were not changed'. Good. That's nice to know,
I would not have clicked Undo myself to find out."

**"Tell me when it is ready."** "It's ready. It says applied, 84 of 96. My genes are the colored
ones, the red ones are up, the blue ones are down, PSMA2 is the biggest one. The grey ones didn't
make it. I'd screenshot it and send it to Maren and say 'is this right?'"

## Single Ease Question

**5 of 7.** "Most of it I just clicked the blue button. The dates were my fault. The 'higher
number means' thing, no idea, and if it hadn't been filled in I'd have been stuck. And I'm not a
hundred percent sure what I'm looking at."

## Would she use this instead of her current tool?

"My current tool for this is 'ask Maren to do it'. So... yes, if someone sends me one of these,
I'd rather drop my list in than wait two days for her. It told me what was going to happen before
it happened, and it gave me numbers I can repeat. But I would not trust it enough to show my VP
without Maren looking at it first -- I don't actually know if I picked the right things. I
wouldn't build one of these myself."

## What the facilitator saw (not said by the participant)

- Completed the main path (start-screen card, Add your table..., 84 of 96, Apply) in about three
  minutes, with one wrong first click on the disabled Apply.
- In the "which column is the fold change" version she chose the network's `log2FoldChange`
  because it was labelled "the recipe's own name" and had more values, and declared the result
  ready. That version of the dialog led a first-time user to a confidently wrong result. The
  other version of the dialog, which does not offer the network's column at all ("Only your
  table's fold change is used"), would have prevented it.
- The card version that says "add a protein network and a table" made her plan to stop and ask;
  the version that already names the sender's network did not.
- After Apply she misread the muted grey proteins as her 12 unmatched genes, and read the
  reddest gene as "the most important" one.
- She could not answer "a higher number means"; she passed it only because an answer was
  prefilled.
- She could not act on the spreadsheet-date advice: she knew the ids were wrong but not what they
  should be.
- Engagement stayed up throughout; the goodwill came from the plain counts ("36 up, 48 down",
  "84 of 96") and the one-step Undo line.
