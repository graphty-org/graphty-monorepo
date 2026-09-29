# Team colors from a mailed file -- Maren, genomics postdoc (Cytoscape user)

**Participant:** Maren, fourth-year cancer genomics postdoc, the lab's de facto bioinformatician.
DESeq2 in R, STRING and Cytoscape for network figures, follows the lab's written protocol closely.
Plays on a 14-inch laptop (1440 x 900), Chrome.

**Task as given by the moderator:** "Your team always draws its networks the same way, and a
colleague just mailed you the file with those colors and sizes. Make this project look like the
team's."

**Screens seen:** the Data panel (empty and with two applied recipes), the style stack's "+" menu,
a style file dropped on the canvas (the Apply dialog), its binding step and its result, the Apply
recipe picker and its result, the gene version of the same dialog (a recipe waiting for data, the
gene matching step, the fold-change column chosen, the result, and the variant where two parts
have nothing to read), and the color picker's Libraries tab.

Renders the participant looked at (all 1440 x 900, study view):
- `../../../shots/r6-maren-teamcolors-dp-s1.png`, `../../../shots/r6-maren-teamcolors-dp-s6.png`
- `../../../shots/r6-maren-teamcolors-sl-plus-menu.png`, `../../../shots/r6-maren-teamcolors-sl-libraries.png`
- `../../../shots/r6-maren-teamcolors-rr-s-style-drop.png`
- `../../../shots/r6-maren-teamcolors-rr-s-bind-style.png`
- `../../../shots/r6-maren-teamcolors-rr-s-style-applied.png`
- `../../../shots/r6-maren-teamcolors-rr-s-recipe-pick.png`
- `../../../shots/r6-maren-teamcolors-rr-s-recipe-applied.png`
- `../../../shots/r6-maren-teamcolors-ra-start.png`, `../../../shots/r6-maren-teamcolors-ra-binding.png`,
  `../../../shots/r6-maren-teamcolors-ra-confirmed.png`, `../../../shots/r6-maren-teamcolors-ra-applied.png`,
  `../../../shots/r6-maren-teamcolors-ra-unbound.png`

## Think-aloud

**Before anything.** "In Cytoscape: File, Import, Styles from File, pick the .xml, then choose it
in the Style dropdown. The lab's is 'Lab_DE_v3'. It takes two minutes and then half the time the
fold-change mapping is blank because the new network calls the column something else. So what I
want to know is: does this thing tell me when that happens."

"My colleague just said 'here's the style'. I don't know what the attachment is. If it's our
Cytoscape .xml I already doubt this tool reads it."

**Data panel, empty.** "Left side: Data. Sources, Versions, 'Applied recipes, None yet. A recipe
is a file of styles, sets or runs, from a colleague or another project; a file of colors and sizes
is a recipe too.' OK. That's the one sentence I needed and I found it by accident. I would not
have called it a recipe. In my head it's a style. But fine, it says 'a file of colors and sizes
is a recipe too', so the plus there is where it goes."

"On the right, 'Style stack', empty. Wait, this project has colors on it -- the legend on the
canvas says Community color. Why is the Style stack on the right empty? Is that a different
thing? That confuses me a bit. I'll ignore it."

**Style stack "+" menu (on a protein network).** "OK here, on the right, the plus under Style stack:
'Empty layer', 'From a recipe or file... Only a recipe's styles; your data stays here.' That's
the one. 'Your data stays here' -- good, I was going to ask whether loading someone else's file
sends anything anywhere. So there are two doors, Data's plus and this one. I'd have used this
one, because I'm thinking 'style', not 'data'."

"But honestly what I'd really do is drag the attachment from Mail onto the network."

**Dropped on the canvas: the Apply dialog.** *The project in these frames is a payments network,
not genes; she notices.* "Bank transfers. Fine, I'll pretend it's my PPI network."

"'Apply recipe fraud-team-colors. fraud-team-colors.graphty. A recipe that holds only styles: 4
layers, bound by attribute name.' So it's a .graphty file, not our Cytoscape .xml. That's already
the problem -- our lab's style is an .xml. Nobody's going to mail me a .graphty unless they already
use this. I'll go on."

"Two choices. 'Use these styles... No data inside. Its 4 layers take the place of these 3 of
yours, which write the same thing:' and then it lists them -- Risk ramp, Risk color, Mule ring,
each 'node color'. 'Your other 5 stay: Community color (from an algorithm, never replaced), Size by
PageRank, Watchlist ring, Pass-through edges, Base style.'"

"That's better than I expected. It tells me exactly which three of mine go, by name, and why --
they all set node color. Last time I tried something like this I got a number that didn't match
what I could see. Here 3 plus 5 is 8, and I count 8 on the right. Good. I can check it."

"The other one is 'Add these styles on top... 4 layers above your 8; all 8 stay.' I don't know
what 'on top' means for colors. If both color the nodes, which one wins? I guess the top one. I
don't want a mix of theirs and mine, I want theirs. 'Make it look like the team's' is 'Use these
styles'."

"'Either is one undo step.' And the bottom line: '1 layer, Chargeback heat, needs chargeback_rate,
which this graph lacks: you choose next whether to leave it off.' So it already warned me before
I clicked. Good, that's the thing Cytoscape never does."

"There's no Apply button, only Cancel. I suppose I click the card. I click 'Use these styles'."

**Binding step.** "'Use these styles: Risk ramp, Risk color and Mule ring go.' Repeats it, fine.
'1 layer to bind. 3 layers matched by name: Cleared accounts, Merchant hubs, Amount width.' Good,
it names which ones matched -- I'd want that as '3 of 4 matched' in bigger type, but it's there."

"'Chargeback heat reads chargeback_rate, numbers. Leave unbound.' 'This graph has no such
attribute. Ask the sender which one they meant.' Ha. That's honest. In my world this is the
fold-change column being called log2FoldChange in the style and log2FC in my table. The dropdown
would let me point it at the right column. OK. Leave unbound, Apply."

**Result.** "Toast: 'fraud-team-colors in use: 3 of your layers replaced; 1 missing attribute.
Undo.' The right side now has Cleared accounts, Merchant hubs, Amount width, each marked 'recipe'
and 'new', then Chargeback heat greyed with a yellow mark and a crossed eye, tooltip 'missing
attribute: chargeback_rate. Bind... in its row's menu.' That's clear. I know what's off and where
to fix it."

"But -- the network. It's grey. It was grey before and it's grey now. It says it applied the
team's colors and I don't see a single colored node. Cleared accounts is green, Merchant hubs is
orange. Where are they? If I did this for real and the picture didn't change, I'd assume it
failed, whatever the toast says. The whole point of the task is that it LOOKS like the team's.
Maybe that's just this drawing. I'm marking it down anyway because it's the only proof I'd trust."

**Apply recipe picker (the File-menu route).** "This is the other way in. Left: 'In graphty,
Overview', 'Recently opened', three .graphty files, 'Open a recipe file...'. Right side shows what
the selected one carries, with checkboxes: 3 sets, 2 runs, 3 style layers, 1 note. And under the
style layers the same two cards, 'Use these styles' and 'Add these styles on top'. Here 'Add on
top' is already highlighted. On the drop dialog nothing was highlighted. Inconsistent, and a bit
sneaky -- if I'd hit Enter I'd have got the mix I didn't want."

"'It needs amount, timestamp, riskScore, counterparty_bank. 2 of the 4 are not in this graph by
name.' Good, the count before I continue."

"For my task I'd uncheck the sets and runs. I only want colors and sizes. It lets me. Fine."

**Recipe applied.** "New sets with 'new' tags, one with a warning. Right panel shows the
Pass-through edges layer: 'missing attribute', 'Bind...', and the Color field outlined red with
'counterparty_bank'. So the thing it couldn't find is shown in red where I'd fix it. OK. And
'Source: From the recipe Mule ring triage, applied today 09:31.' I like that it remembers where a
color came from. In Cytoscape I lose that the moment I edit the style."

**Now the gene version -- this is my world.** "Recipe waiting for data: 'Expression overlay.
Recipe, version 1. Saved by Maren on Sep 26 2026.' That's me, apparently. 'Colors your genes by
log2 fold change, red for up and blue for down, draws the other proteins in muted module colors,
and hides interactions with confidence under 0.7. No data inside.' Then 'Expects:' -- a protein
network, and 'your own table of genes: a gene id per row and a fold change named log2FC, above and
below 0.' And 'Data stays on this computer.' That paragraph is what I'd paste into our lab
protocol. It says in plain words what the style needs. Our Lab_DE_v3 has never said that."

**Gene matching step.** "'84 of 96 genes matched.' Big, at the top. Thank you. '12 did not match.'
And they're listed, by name: '7-Sep, not in this network; looks like a spreadsheet date.' '2-Mar,
looks like a spreadsheet date.' -- Excel ate SEPT7 and MARCH2. It caught it. That happened to me
in March and nothing told me. 'Mdm2, differs only in letter case from MDM2', with a button 'Use
MDM2'. The rest just 'not in this network'. And 'Copy the 12 ids'. That is exactly what I always
have to dig for."

"It doesn't offer to fix the Excel dates the way it offers MDM2, though. It says 'looks like a
spreadsheet date' and then... nothing. I'd have to go back to Excel. Still, it told me, which is
more than I get now."

"'Fold change, for color: Choose a column. Two columns could be the fold change.' log2FoldChange
in the network file, 300 values, and log2FC in the table, 84 matched values. It refuses to pick
for me. Good -- the network one is from an old run, I'd want my table. 'Read as: Below 0 is down,
above 0 is up' or 'An amount, bigger is more'. I pick the first. It says '36 up, 48 down; -2.41 to
2.98'. Numbers I can check against my DESeq2 output. And 'Confidence, for the filter: keeps 1,059
of 1,262 interactions.' That's STRING's combined score cutoff and it tells me what it removed."

"Apply is greyed until I choose the column and one of the two cards. 'Apply waits for two
choices.' Fine. Use these styles, Apply."

**Result, gene version.** "Now THAT is a colored network. Legend on the canvas: 'Fold change color
log2FC, 84 genes', blue to red, '-2.41 down, 0, 2.98 up'. The zero is in the middle and it's
blue-red, not red-green, so my PI can read it. Module color '216 others, muted'. The toast: '84 of
96 genes matched, Show the 12, Undo.' And on the right under Statistics, 'Expression overlay, 84 of
96 genes matched; 12 did not'. So the count is still there after the toast is gone. Good."

"Two gripes. One: the module colors -- Ribosome is light blue. My down-regulated genes are blue.
In the picture a light-blue ribosomal protein and a mildly down gene look the same to me. That's
the kind of thing a reviewer circles. Two: the gradient -- is -2.41 and 2.98 the ends, or does it
clip? If one gene is at 9 does everything go pale? It doesn't say."

**Two parts with nothing to read.** "An older network with only names: 'Module, for color: Not
bound. No category per protein in the data. Left unbound: Module color is kept and switched off;
the other 216 proteins stay in the Base style.' Same for confidence: 'all 1,262 interactions
show.' And the fold change says 'proposed -- the only signed number in the data; the recipe called
it log2FoldChange'. It's guessing, but it says it's guessing. I can live with that. It doesn't
silently drop anything. That's the line for me."

**Color picker, Libraries.** "Palettes: Okabe-Ito, Viridis, Blue to red. And 'Style layers from
the recipe Stress response' -- so once the team's file is in, its pieces show up here to reuse.
Okabe-Ito being first is nice, that's the colour-blind one. I wouldn't have come here for this
task though."

**Data panel after applying.** "'Applied recipes: Community overview, Applied Apr 2;
fraud-team-colors, Colors and sizes only, no data. Applied Apr 20.' So I can see later that the
team's colors were applied and when. That's what I'd want when reviewer 2 asks. But again the
right side says 'Style stack' with nothing under it, while the network is full of community
colors. Either it's hidden in this view or it's broken; I can't tell which."

## After the task

**Single Ease Question (1-7): 5.**

"Getting the file in and choosing 'use theirs' was easy, and I could check every number it gave
me -- which ones of mine go, which of theirs matched, what's off. On my genes it was genuinely
good: 84 of 96, the Excel dates named, no silent binding of the wrong fold-change column. I took
off for three things: in the payments one the network didn't visibly change, so I couldn't see
that it worked; the two dialogs don't agree on which card is pre-selected; and 'recipe' is not
the word I'd look for -- I found it only because of that one sentence in the Data panel."

**Would you use this instead of your current tool?**

"For this job, no, not yet, and it's not about the screens. The team's style is a Cytoscape .xml.
This wants a .graphty file, which means somebody on the team has to already be using graphty to
send me one. Nothing here says it can read our .xml. If it can't, the task doesn't exist for me."

"If the whole lab moved, the matching step alone would be worth it -- '84 of 96, here are the 12,
two are Excel dates' is the thing I've wanted from Cytoscape for four years. I'd use it to check
my table against the network before I do anything else. But the figure still goes through
Cytoscape, because that's what our protocol says and that's what reviewers recognise, and I'd need
to know how to cite this in methods before my PI would sign off."

## Problems observed

1. **The applied team style changes nothing visible on the payments network** (style result). The
   toast and the style stack say the team's layers are in use, but the canvas is the same grey as
   before. Quote: "It says it applied the team's colors and I don't see a single colored node."
   Severity 3.
2. **Pre-selection differs between the two Apply dialogs** (style drop vs recipe picker). The drop
   dialog selects neither card; the File-menu picker highlights "Add these styles on top". Quote:
   "if I'd hit Enter I'd have got the mix I didn't want." Severity 2.
3. **No sign that a Cytoscape style file is accepted** (style drop). Only .graphty files appear;
   her team's style is an .xml. Quote: "Nobody's going to mail me a .graphty unless they already
   use this." Severity 3 (a switching blocker, not a screen defect).
4. **"Recipe" is not her word for a style file** (Data panel). She found the door only through the
   one-line empty-state sentence; the style stack's "From a recipe or file..." was the one she'd
   actually use. Severity 2.
5. **The style stack on the right is empty in the Data panel view** while the canvas legend shows
   community colors. Quote: "Either it's hidden in this view or it's broken; I can't tell which."
   Severity 2.
6. **Module blue collides with the fold-change blue** (gene result). Ribosome's light blue reads as
   mildly down-regulated. Severity 2.
7. **Excel-damaged ids are named but not fixable in place** (gene matching). MDM2 gets a "Use"
   button; 7-Sep and 2-Mar do not. Severity 1.
8. **No word on whether the fold-change gradient clips at an outlier** (gene result legend).
   Severity 1.
9. **The drop dialog has no Apply button; the cards are the action** (style drop). She guessed
   right, but only Cancel looks like a button. Severity 1.

## What worked

- "Its 4 layers take the place of these 3 of yours", with the three named and the five that stay
  named: the count matched what she could see, so she trusted it.
- The missing attribute was announced before Apply, and after Apply sits greyed in the stack with
  "Bind..." one click away.
- "84 of 96 genes matched", the 12 listed by name, spreadsheet-date damage and a case-only match
  identified, and "Copy the 12 ids".
- Two candidate fold-change columns: it refuses to pick silently and shows range and count for each.
- The count survives the toast in Statistics; Applied recipes records which file was applied and
  when.
- Blue-to-red, centred on 0, legend on the canvas by default.
