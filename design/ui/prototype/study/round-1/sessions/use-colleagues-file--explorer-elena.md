# Session: use a colleague's file on my gene list -- Explorer Elena

**Participant:** Elena, a product manager with no graph or biology training. For this session she is
handed a scenario outside her own job: she has a gene list (a CSV with columns `symbol`, `log2FC`,
`padj`, 96 rows) and her lab lead has emailed her a file called "Expression overlay". She has
never used graphty. First-contact clock.

**Task, as the moderator gave it:** "Your lab lead emailed you this file. Use it on your gene list."

**Screens used:** the start screen (first run, then with the recipe waiting for data) and the Apply
recipe dialog's binding step (twelve genes unmatched and two candidate columns, then the column
chosen). The recent projects on the start screen are the prototype's, not hers.

## Transcript (think-aloud)

### 1. The start screen, before the file

> OK, "Open a graph." Files stay on this computer, fine. There are four little pictures -- karate
> club, Les Miserables, proteins, bank stuff. None of that is mine.

> He didn't say what the file is. I'd just drag it in. That's what I do with everything.

*She drags the email attachment onto the window. (Prototype: the "drop anywhere" state, then the
recipe waiting for data.)*

### 2. The recipe card

> OK, it did something. "Recipe waiting for data." Recipe. So it's like a... template? Like a
> Slides theme, it has the look but not the stuff.

*Reads the first line of the card.*

> "Colors your genes by log2 fold change, red for up and blue for down" -- I don't really know what
> log2 is but I know my sheet has a column that says log2-something, so that's probably right.
> "Hides interactions with confidence under 0.7" -- no idea. Skipping.

> "It carries no data." Bold. Good, that's clear, it's empty. "To use it, open a protein network and
> a table of your genes."

*Pause.*

> A protein network? He didn't send me a network. He sent me this and I have my list. Is my list the
> network? No -- it says network AND a table. So that's two things and I have one.

*Looks down the screen.*

> "Knockdown screen, September -- 300 proteins -- yesterday." Is that his? Is that the network? It
> says proteins. It says yesterday... I didn't open anything yesterday. Maybe it's the lab's. I
> don't want to open somebody else's thing and change it.

> I'll just press Open and give it my list and see what it says. Maybe it knows where the network
> is.

*Clicks Open..., picks her gene list CSV. The prototype has no screen for a table with no network;
the moderator says "Assume the lab's network is already open -- here is what you see next" and shows
the binding step with twelve genes unmatched.*

> So I was supposed to have that other file. OK. I'd have had to email him back.

### 3. The binding step: 84 of 96

> "84 of 96 genes matched." OK! That's a number I understand. Most of them.

> "12 did not match. They stay in the table and are not colored." So twelve of mine won't get a
> color. Hm.

*Reads down the list.*

> "7-Sep -- looks like a spreadsheet date." Oh no. That's Excel. Excel does that to everything. I
> probably exported it wrong -- I should have made it text. Two of those. That's on me.

> "Mdm2 -- differs only in letter case from MDM2 -- Use MDM2." Yes, obviously it's the same thing,
> just press it.

*Hovers, hesitates.*

> Wait, does that change my file? It says "Use." It doesn't say it'll rename anything in my
> spreadsheet... I'll press it. It's one gene.

*Clicks Use MDM2. (Moderator shows the chosen state after the next step.)*

> The rest -- "GAPDH, no node with this id." Node. What's a node? An id is like a row number. I don't
> know what that means. Is it saying GAPDH is wrong? Or it's just not in his thing? I'd guess it's
> just not in his thing. I have no idea if that's normal. Is twelve a lot?

### 4. Apply is grey

*She scrolls straight down to the bottom and clicks Apply.*

> Nothing. It's grey.

*Reads the footer line.*

> "Choose the fold-change column to apply." Where's that?

*Looks up. Takes a few seconds to find the box in the table.*

> Oh, "Choose a column", there's a dropdown. I didn't see that, it's in the middle of this table
> thing. "2 columns fit." log2FC "in the table", log2FoldChange "in the network file".

> Which one? The table is mine, right? The table is my list. The network file is... his? Or the lab
> one? They both say minus two to three. They're basically the same. Why is it asking me? Just pick
> mine.

*Picks log2FC.*

> "36 up, 49 down. Blue below 0, red above." OK so more of mine went down. That's -- actually that's
> kind of interesting, I didn't know that.

*Notices the Mdm2 row now reads "matched by hand -- Undo match" and the count reads 85 of 96.*

> 85 now. Good, it counted the one I fixed.

### 5. Before pressing Apply

> "Confidence -- keeps 1,059 of 1,262." Keeps what? It's throwing away 200 of something? Of my
> stuff? It says "Used by: Confidence filter." I don't know. It's not my genes, I have 96. So it's
> his lines, I guess.

> "Genes, to join -- symbol." To join? Like a SQL join? OK, whatever, symbol is my column name, fine.

> "Apply is one step. One Undo takes all of it back." Good. That's the thing I wanted to hear.
> I'll press it.

*Clicks Apply. End of the prototype.*

### Moderator's questions (asked while the unmatched state was shown)

- **How many of your genes will be colored, and which will not?** "84. Well, 85 after I fixed the
  Mdm2 one. The ones in that list won't -- the Excel dates and the ones it says 'no node'."
- **Pick one gene that will not be colored. Why not? Whose problem is it?** "7-Sep. Because Excel
  turned it into a date. That's mine, I exported it wrong." *(GAPDH:)* "It says no node with this
  id. I think it means his network doesn't have it. So... his? I really don't know. I'd ask him."
- **Which of your columns will decide the colors? How did you tell?** "log2FC, because I picked it.
  I only found the box after Apply didn't work."
- **If you press Apply now, what will change, and how would you take it back?** "My genes get red and
  blue, the others get... module colors? And some lines disappear, the confidence thing. Undo takes
  it back, it said so."

## Single Ease Question

**3 of 7.** "The second half was fine, honestly. The first half I didn't have what it asked for."

## Would she use it instead of her current tool?

> For this? My current tool is emailing him back and asking him to do it. If he'd sent me the network
> too, or it just knew where his network was, yeah, maybe -- the '84 of 96' thing is nice, it told
> me what went missing, which Excel never does. But I didn't know what half the words meant and I had
> to be rescued at the start. I wouldn't do it alone the first time.

## Observations for the studio

- **Engagement dropped** at the recipe card's "open a protein network and a table" line: she had one
  file and nothing told her where the other comes from. She recovered only because the moderator
  supplied the network. Without that she would have emailed the sender.
- She treated an unfamiliar recent project ("Knockdown screen, September") as possibly the network
  she needed but would not open it for fear of changing someone else's work.
- She missed the fold-change picker until Apply refused; the footer line is what led her to it.
- She read "looks like a spreadsheet date" correctly and blamed herself; she could not tell whose
  problem "no node with this id" was.
- "node", "id", "join", "confidence", "log2" were all unknown words; none stopped her, but she
  guessed at each.
- "One Undo takes all of it back" was the line that got her to press Apply.
