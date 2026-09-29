# Session: a colleague's saved analysis, used on your own gene list -- Explorer Elena

Participant: Elena, senior product manager at a B2B software company. No biology, no graph
training. Company 14-inch laptop, trackpad, Chrome, browser shared with Slack.

Task as given by the moderator: "Your lab lead emailed you this file. Use it on your gene list."
The moderator also handed her a CSV, `qpcr-hits-2026-09.csv`, as "your gene list".

Screens: the start screen with the colleague's file dropped on it (the "Recipe waiting for data"
card), then the Apply recipe dialog at the step that says what matched (84 of 96 genes, a
fold-change column to choose), then the same dialog after her choices.

Moderator note, not part of the session: the task is cast for a lab scientist and Elena is not one.
She was told to play along as if she were helping a lab out. Her reading of the biology words is
therefore a floor, not a fair test of a scientist's; what she shows is how much of this dialog a
non-specialist can follow from the screen alone. Also, the checked-in render of the start screen's
recipe state (`shots/start-screen--s4.png`) is out of date: it says "red for down and blue for up"
and its button reads "Add data...", while the current page says "red for up and blue for down" and
"Open...". The session used a fresh render of the current page.

## Part 1 -- the start screen

"OK, so I'm the lab person today. Fine. I have the file from my 'lab lead' in my downloads, and this
gene list. I'd just drag the email attachment onto the window, that's what I do with everything."

(Dragging over the window: the Open... row turns into "Drop to open".) "Oh nice, it knows I'm
dragging. Drop."

"'Open a graph.' Then a box. 'Recipe waiting for data.' Recipe? ... OK, so the file is a recipe. Like
a template? 'Expression overlay.' No idea what that is but that's the file name so fine."

"'Colors your genes by log2 fold change, red for up and blue for down...' -- I'm going to skip the
science. 'draws the other proteins in muted module colors, and hides interactions with confidence
under 0.7.' Honestly I read 'colors your genes' and 'red' and 'blue' and stopped."

"'It carries no data.' OK, that's clear, I like that it's bold. 'To use it, open a protein network
and a table of your genes with a fold-change column.' Hmm. Two things? I have one thing. I have a
gene list. Is my gene list the 'table'? Probably. What's the 'protein network', do I need to get
that from my lab lead too? ... I'd probably Slack her at this point. 'hey do I need a network file??'"

"Lock icon, 'This recipe names no server, so graphty contacts none.' Good, I guess. I don't know why
a recipe would name a server."

"Buttons: Open... and Close recipe. Open is blue so that's the one. Below it, recent projects --
'Mule ring review', 'Knockdown screen, September, 300 proteins' -- are these mine? This is a shared
laptop in the story, whatever. 'Knockdown screen' has 300 proteins, and it says protein network up
there... should I click that one? No, I don't know what it is, I'm not touching someone else's
project."

"I'll click Open... and pick my gene list, and see if it yells at me for the network."

## Part 2 -- the dialog after picking the gene list

"OK, a popup. 'Apply recipe Expression overlay.' 'Data files': 'ppi-core-300.graphml, 300 proteins,
1,262 interactions; opened by this recipe.' Oh. So it found the network by itself? Then why did the
card tell me to open one? Whatever, it's there. I don't know what graphml is but 'opened by this
recipe' -- OK, the recipe brought it. Fine."

"Second line is my file, 'qpcr-hits-2026-09.csv, 96 rows: symbol, log2FC, padj.' Yes, 96, that sounds
right, that's my list."

"Big text: '84 of 96 genes matched.' OK! That I get. That's the first thing on this whole screen I
actually understand. 84 good, 12 not."

"'The table's symbol against the network's protein names; letter case must match, as the recipe
sets.' ... Skipping. 'Change matching...' -- no."

"'12 did not match. They stay in the table and are not colored.' So twelve of mine won't get a color.
Probably I exported it wrong. First one: 'Mdm2 differs only in letter case from MDM2' and a button
'Use MDM2'. Oh, that's easy, yes, obviously, same thing. Click." (the moderator shows the later
state: 85 of 96, "1 by hand", "matched by hand to MDM2, Undo match") "Great, 85, and I can undo it.
That's exactly how I'd want that to work. Why didn't it just do that for me though?"

"'Not in this network: 11 ids, for example 7-Sep.' Then a grid. '7-Sep date?', '2-Mar date?' -- oh,
that's the Excel thing! Excel does that to everything, it turned my stuff into dates. I've had that
with product SKUs. Then there's a grey box: 'Correct them in your table and add it again.' OK, but
correct them to what? It says 'SEPT2 -> 2-Sep' as an example. So 7-Sep was... SEPT7? I'm guessing.
I would not guess on a real thing, I'd ask. I'm leaving those."

"The rest -- TP53BP1, GAPDH, VEGFA, IL6... those just aren't 'in this network'. So is the network
wrong or is my list wrong? I have no idea. It doesn't say. I'll assume my list has extra stuff. Not
my problem today."

"'Copy the 12 symbols.' Useful, I'd paste that to my lab lead: 'these didn't work, do you care?'"

"Then a table. 'What the recipe reads from the data.' Need, Your column, On your data, Used by.
'Needs a choice (1): Fold change -- Choose a column -- 2 columns fit.' Hmm. Honestly I didn't see
this at first -- I went straight to Apply at the bottom and it's grey. The footer says 'Choose the
fold-change column to apply.' OK, so that's what the grey is about. Back up."

"The dropdown. Two options under it: 'log2FC, in the table: 84 matched values, -2.41 to 2.98' and
'log2FoldChange, in the network file: 300 values, -2.52 to 3.15.' ... The thing is literally called
'Fold change'. log2FoldChange says fold change right there in the name, and it has 300 values, all
of them, not 84. The other one is an abbreviation. I'd pick log2FoldChange."

(Moderator, after she picks it: "Which of your columns will decide the colors?") "log2FoldChange.
... Wait, is that mine? 'In the network file.' Oh. So that's not my gene list, that's the thing the
recipe brought. So if I pick that, it colors with... someone else's numbers? Then what was the point
of giving it my list? ... I only noticed that because you asked me. I would have pressed Apply."

"OK, switching to log2FC. Now it says '36 up, 49 down' with a green check, and 'Blue below 0, red
above, as the recipe draws it.' Fine. 36 and 49 is 85, which is my matched number, so that adds up.
I like that it adds up."

"'Matched by name (3).' 'Genes, to join -- symbol -- 85 of 96 matched.' 'Module -- module -- 9
modules.' 'Confidence -- confidence -- keeps 1,059 of 1,262.' Keeps 1,059 of what? Interactions? It
hides some of them? I don't know what I'd tell anyone about that. I'm not going to touch it."

"Footer: 'Apply is one step. One Undo takes all of it back.' OK, that's reassuring, that's the
sentence that makes me actually press it. Apply."

(Moderator: "What will change on your network when you press it?") "It'll color... my 85 genes red
and blue, and the rest in some muted colors, and hide some lines. I think. Honestly the 'module'
part I'm just trusting."

## After the task

**Single Ease Question: 3 of 7.**

"The start was easy, the dragging and the 'it carries no data' part. The '84 of 96' is great, I'd
screenshot that for my lab lead. But the middle is a wall of words I don't have -- log2, padj, module,
confidence, join -- and the one choice it actually made me make, I got wrong, and the only reason I
caught it was that you asked me. If you hadn't asked, I'd have colored the network with the wrong
numbers and felt good about it."

"Would I use this instead of what I use now? For this? There is no 'what I use now', I'd send the
list back to the lab lead and say 'can you just do it.' If it were my own thing -- the matching
part, the 'these 12 didn't match, here's why, copy them' -- that's better than anything in Sheets,
where stuff just silently doesn't VLOOKUP. I'd want that on my accounts data. This recipe screen,
though, is for people who already know what all of it means."
