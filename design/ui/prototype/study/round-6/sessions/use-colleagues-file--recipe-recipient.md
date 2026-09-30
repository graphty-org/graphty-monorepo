# Session: use a colleague's file -- recipe recipient (Tom)

Participant: Tom, lab manager of a twelve-person cell biology lab (study/personas/recipe-recipient.md).
Bench scientist, not a network builder. Mild red-green colour weakness, reads at 110 to 125 percent
zoom, gives a new file about two minutes and two attempts.

Task as given, and nothing more: "A colleague sent you their analysis to use on your own gene list.
Get your genes into it and tell me when it is ready."

Scenario as Tom holds it: Maren, the lab's computational postdoc, emailed him a file called
"Expression overlay" with the line "the lab's colours, just drop your gene list on it". He has this
week's qPCR hits, qpcr-hits-2026-09.csv, 96 rows.

Material worked from, in study view: the start screen; the start screen with the recipe dropped on
it ("Recipe waiting for data"); the Apply dialog before and after his choices; the applied graph.
Page HTML was read only to see what a control offers.

Moderator note: this task is run for evidence only and is left out of the ease bar. The start
screen with a waiting recipe still shows the sample cards under it; a decided change moves them away
but could not be drawn in time. Any mix-up between a sample card and Maren's file below is logged
as known, not as a new finding.

## Think-aloud

**1. The start screen.** (shots/tasks/use-colleagues-file/01-start-screen.png)

"Open a graph. OK. Four pictures -- karate club, Les Miserables, protein interactions, bank
transfers. None of those is hers. There's a line at the top: 'Files stay on this computer. graphty
reads them in this browser and uploads nothing.' Good, that's the first thing I'd have asked. I'll
believe it about as far as IT tells me to, but at least it says it before I've done anything.

She said drop it on. I'll drag the attachment onto the window." (He drags the file from the email
onto the page, which is what he tries first with any file. Nothing on the screen says it accepts a
drop; he does it anyway. Had it not worked, he would have tried "Open..." next.)

**2. The recipe waiting for data.** (shots/tasks/use-colleagues-file/02-recipe-apply-start.png)

"'Recipe waiting for data. Expression overlay. Saved by Maren on Sep 26 2026.' OK, that's hers,
that's the right file, and it's from last week. Good.

'Colors your genes by log2 fold change, red for up and blue for down.' Red and blue. Fine, I can
tell those apart. 'Hides interactions with confidence under 0.7.' I'll take her word on that.

'No data inside.' Hm. So what did she send me, then?

'Expects:' -- 'a protein network with a module per protein and a confidence per interaction. It is
not in this recipe; it was made on ppi-core-300.graphml.' So the network isn't in here. She said
drop my gene list on it. Drop it on what? There's nothing to drop it on.

Second bullet: 'your own table of genes: a gene id per row and a fold change named log2FC.' That's
my spreadsheet. My column is log2FC, I checked when I exported it. 'The fold change is never taken
from the network.' OK, I don't know why you'd tell me that, but fine -- my numbers, not hers.

'Data stays on this computer. This recipe names no server, so graphty contacts none.' That box I
read twice. That's the question I'd have stopped on. It answers it before I've put anything in.
I'd still mention it to IT, but I'm not going to refuse today.

Now -- the network. Down here: 'Or try it on a sample. Protein interactions, 300 proteins.' Her file
is called ppi-core-300. Three hundred. Is that it? Is that her network?" (Known mix-up, logged, not
a new finding: he hovers over the Protein interactions card and nearly clicks it. What stops him
is the word "try" -- "I don't want to try it, I want it done" -- and that the card has no name on it
that matches hers.) "No. If it were hers it would say ppi-core-300. That's a demo. She's the one who
keeps the network on the shared drive; I'm the one who keeps the shared drive. I'll go find
ppi-core-300.graphml.

So it's not 'drop your gene list on it'. It's 'go get her network, then add your list'. She could
have said that in the email. The screen did say it, to be fair, in the second line of the bullet."

(He leaves the page, finds ppi-core-300.graphml in the lab's network folder, comes back.)

"'Add data...' -- the big blue button. That's the one." He clicks it. "I pick both files, the
network and my spreadsheet." (Moderator note: the mock goes straight to the Apply dialog with both
files added. Whether Tom would know to select two files in one file window, or would add one and
wonder what happened, is not drawn. He selected both only because he had just read that both were
expected.)

**3. The Apply dialog, before his choices.** (shots/record/screens__recipe-apply-binding--study.png)

"Apply recipe Expression overlay. Data files: ppi-core-300, 300 proteins; qpcr-hits-2026-09.csv,
96 rows. Ninety-six. That's my sheet, I have 96 rows. Good.

'84 of 96 genes matched.' There's my number. That's what the PI will ask me.

'12 did not match.' Let's see. 7-Sep -- 'looks like a spreadsheet date'. 2-Mar -- 'looks like a
spreadsheet date'. Of course. SEPT7 and MARCH2. Excel again. That's not the file and it's not me,
it's Excel, and it told me so. That's the first time a program has told me that instead of just
'not found'. I'll fix those in the sheet.

Mdm2 -- 'differs only in letter case from MDM2' -- 'Use MDM2'. That's someone typing it the mouse
way. Yes, use MDM2." He clicks Use MDM2. "Does that change my spreadsheet? It says they stay in the
table... I think it only means here. It should be 85 now." (See step 4: it still says 84.)

"The rest -- ACTB, GAPDH, VEGFA, IL6 -- not in this network. Housekeeping genes and a couple of
secreted ones; they wouldn't be in her protein network. That's fine. That's the file, not me.
'Copy the 12 ids' -- good, I can paste those in the slide notes.

'What the recipe reads from the data.' Gene id, symbol, 84 of 96. Fine.

'Fold change, for color: Choose a column.' And a warning: 'Two columns could be the fold change.'
log2FoldChange, 'in the network file ... the recipe's own name.' log2FC, 'in the table.'

Wait. The card said it wants a fold change named log2FC, and it said the fold change is never taken
from the network. Now it's telling me the recipe's own name is log2FoldChange, and that one is in
the network. Which is it? Did she already put fold changes in the network? Whose fold changes are
those -- last time's? If I pick the wrong one I'll be showing the PI last month's knockdown with
this month's title.

I'm going with log2FC. That's mine, it's the one the card named, and I only want mine. But I'd want
to ask her about this bit." (He chooses log2FC.)

"'Read as: Below 0 is down, above 0 is up' or 'An amount, bigger is more.' It's a fold change. Of
course below zero is down. Why is it asking me? ... Fine, first one."

"'Styles: 2 layers.' 'Use these styles' -- 'take the place of any of yours that write the same
thing; none of yours do.' 'Add these styles on top.' I don't have any styles. I have a spreadsheet.
'Take the place of' makes me nervous for a second, but it says none of mine, so nothing of mine gets
replaced. I want her version. First one." (He chooses Use these styles. He does not read the second
card's line.)

"Apply was grey until I'd done both. The bottom line said so: 'Apply waits for two choices.' OK."

**4. The Apply dialog, ready.** (shots/record/screens__recipe-apply-confirmed--study.png)

"'36 up, 48 down.' Thirty-six up, forty-eight down. That's about what I remember from the plate.
Good -- a number I can check against my own sheet.

'One Undo takes all of it back.' Good. If it's wrong I can get out.

Hang on -- it still says 84 of 96 matched and still lists Mdm2 with the 'Use MDM2' button. I pressed
that. Either it didn't take, or it doesn't count it. So is it 84 or 85? I'll say 84 to be safe and
check Mdm2 on the picture." (Moderator note: the drawn "ready" state shows the dialog as it would be
had Tom not pressed Use MDM2; whether pressing it updates the count is not drawn. His doubt is real
either way: he pressed a button and nothing he could see changed.)

He clicks Apply.

**5. Applied.** (shots/tasks/use-colleagues-file/03-recipe-apply-applied.png)

"There. Red and blue dots, the rest in pale colours, and the legend: 'Fold change color, log2FC, 84
genes, -2.41 down, 0, 2.98 up.' log2FC -- mine, good, that's the one I picked. Blue down, red up,
and the words 'down' and 'up' are written under the bar, so I don't have to trust my eyes on the
colour. That's how the slides looked last month, I think. I'd have to hold it next to last
month's to be sure; nothing here shows me hers.

The black bar at the bottom: 'Expression overlay applied: 84 of 96 genes matched. Show the 12.
Undo.' Same number as before. And on the right: 'Expression overlay, 84 of 96 genes matched; 12 did
not.' So it's written down somewhere that isn't going to vanish. Good.

'Filtered: 1,059 of 1,262 edges' at the top left -- that's her confidence cut-off, the card told me.
Fine.

The table under the picture: PSMA2, 2.98, the top one. Yes, PSMA2 was the big one this week. That
matches my sheet.

It says 'Untitled' at the top. If I close this, is it still here next week when the PI asks? The
first screen said projects are kept in this browser. On a managed laptop IT wipes... I'd want to
save it somewhere I know. That's not today's question, though.

Is it ready? Yes. My genes are on her picture, in her colours, 84 of 96, and I know which 12 aren't
and why. I'd tell you it's ready."

## Answers

**Single Ease Question: 5 of 7.**

"The end was easy. The number was right there, twice, and it told me the date genes were Excel's
fault -- that alone saves me an argument. What cost me was the start: she said drop my list on it,
and it turned out I needed her network too, which wasn't in the file, and I had to go find it. And
then it asked me which fold change, when the first screen had already told me which one. Two
questions I shouldn't have had to answer, and I pressed a Mdm2 button and couldn't see that it did
anything."

**Would you use this instead of what you do now?**

"For this job -- putting my list on her picture -- probably, yes. What I do now is send my list to
her and wait two days for a PNG. This got me the count and the misses myself, and it said my data
stays on the laptop before I put any in. I'd still run that past IT. And I'd still want to hold the
result up against her last slide, because nothing on the screen showed me what hers looked like.
If the network had been in the file, I'd say yes without the 'probably'."

## Observed problems

1. The recipe did not contain the network, so "drop your gene list on it" was not enough: Tom had to
   leave, find ppi-core-300.graphml himself and come back. The card says so, but only in the second
   line of a bullet, and a recipient without access to the lab's network folder would stop here.
2. The start card says the fold change is "named log2FC" and "never taken from the network"; the
   Apply dialog then offers the network's log2FoldChange as "the recipe's own name" and asks him to
   choose. The two screens contradict each other, and the contradiction made him suspect the network
   held old fold changes.
3. "Use MDM2" was pressed and the count still read 84 of 96 with Mdm2 still listed; he could not tell
   whether the press took effect, so he could not say for sure whether the answer was 84 or 85.
4. "Read as: below 0 is down" was asked of a column he had just called a fold change; he answered it
   but read it as a question with an obvious answer.
5. Nothing showed him what Maren's own picture looked like, so "ready" rested on his memory of last
   month's slide.
6. Whether both files can be chosen in one Add data window, or what happens when only the gene list
   is added, is not drawn.
7. Known, not new: the Protein interactions sample (300 proteins) sits right under the waiting recipe
   and was nearly taken for Maren's ppi-core-300 network.
