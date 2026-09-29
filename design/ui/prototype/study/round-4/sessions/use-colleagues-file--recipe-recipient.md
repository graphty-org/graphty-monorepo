# Session: use a colleague's analysis on your own gene list -- the recipe recipient

**Participant:** Tom, lab manager in a twelve-person cell biology lab. The lab's computational
postdoc sends him files; he reads them, he does not build them. (Persona:
`../../personas/recipe-recipient.md`.)

**Task as given:** "A colleague sent you their analysis to use on your own gene list. Get your
genes into it and tell me when it is ready."

**What he had:** the emailed recipe `Expression overlay` from Maren, and his own qPCR table
`qpcr-hits-2026-09.csv` (96 rows: symbol, log2FC, padj). He knows it is 96 rows because he made it.

**Screens, in order, as the participant saw them (participant view, 1440 wide, whole page):**
`../../../shots/r4-tom-ucf-start-screen.png` (state 4, a recipe waiting for data),
`../../../shots/r4-tom-ucf-binding-step.png` (the Apply dialog, from "table not added" to
"85 of 96 matched"), `../../../shots/r4-tom-ucf-recipe-apply.png` (the applied graph and the Undo
state), then a look at `../../../shots/r4-tom-ucf-recipe-travels.png` and
`../../../shots/r4-tom-ucf-replace-and-recipe.png` when the moderator asked if anything else on
the gallery was relevant.

**Outcome:** He got his genes on and could say "84 of 96, 85 if I take the MDM2 fix, and here are
the 11 that aren't in there." That is the task done. Three things slowed him or made him distrust
it: he could not tell whether the lab's network came inside the recipe or whether he had to fetch
it; rows naming PageRank and Louvain sat in the dialog with a question he could not answer (it was
pre-answered, so he left it); and on the finished picture the pale module colours are the same
blues and oranges as up and down, so he could not tell his genes from the background at a glance.
Single Ease Question: 5 of 7.

---

## 1. Start screen, with the recipe dropped on it

> Right, I dragged her attachment onto the page, like she said. "Open a graph." There's a box:
> "Recipe waiting for your table. Expression overlay." Good, that's the name in her email.

> "Colors your genes by log2 fold change, red for up and blue for down, draws the other proteins
> in muted module colors, and hides interactions with confidence under 0.7." Fine. That's what the
> lab meeting slides look like, I think. Red and blue, not red and green. Good.

He reads the lock line above the card twice.

> "Files stay on this computer. graphty reads them in this browser and uploads nothing." And in
> the box, "This recipe names no server, so graphty contacts none." ... What server? Why would a
> colour file name a server? I don't know what that means, but the line above it says nothing is
> uploaded, and there's a link, "Where your data goes". I'd forward that to IT before I did it with
> the unpublished set. For this, today, I'll take the first line at its word. These are qPCR hits,
> not the screen.

> "Sender's network: STRING v12, 300 proteins, 1,262 interactions." With a Replace button. I'm
> not touching Replace. ... Hang on. Her email said the network is on the shared drive and I should
> open it. This says the sender's network is already here. So is it here, or do I go and get it?

He looks for who sent it.

> It doesn't say it's from Maren anywhere in this box. It says "sender". I'm assuming it's hers
> because I just dragged it out of her email. If I found this file on the shared drive next month,
> I wouldn't know whose it was from this.

> "Your table: not added yet. It needs a gene id and a fold-change column. The sender's fold
> change is not used." Good, I don't want hers. "Add your table..." is the blue button. Apply is
> grey, "Waiting for your table". That's clear. Click Add your table.

## 2. The Apply dialog, before his table is in

> Another box, "Apply recipe". "Saved by Maren Holt, Sep 26 2026." There she is. Why does it say
> that here and not on the first box?

> "Brings 2 styles, 1 filter, 3 runs." Runs of what? "You supply a table with a gene id and a fold
> change column." Right.

> Files: "Sender's network: STRING v12, ppi-core-300.graphml." There's the file name from her
> email. And there's a picture behind the box with dots on it, and "ppi-core-300, 300 nodes" on the
> left. So it IS loaded. I didn't open it. Either it came with the recipe or the thing found it by
> itself. I'd ask her which. The first page said "No data inside" somewhere, and now her 300
> proteins are sitting here. I don't like not knowing which of those is true.

> "What it adds": fold change colours, module colours, confidence filter, and "3 runs: PageRank,
> Louvain, degree ... they add results, not styles." I don't know what those are and I'm not
> learning them at four o'clock. Is it something I need? It doesn't say I have to do anything, so
> no.

He scrolls to the table of what the recipe reads.

> "Genes, to join ... waiting for your table. Fold change ... waiting for your table." Fine. Then
> "From the sender's network, found by name: Module, 9 modules. Confidence, keeps 1,059 of 1,262.
> Weight, confidence, 10 communities, PageRank, Louvain." And under it: "For confidence, a higher
> number means" and a drop-down that says "a closer or stronger link, similarity", "the recipe's
> answer". ... That's a question I can't answer. It's already filled in with hers. I'd leave it.
> If it had been blank I'd have stopped here and emailed her.

> Bottom: "Waiting for your table. This recipe needs log2FC from your data." That's my column
> name. OK. Add the table.

## 3. After his table is in

> "84 of 96 genes matched." Big letters. That's the number the PI wants. 96 is right, I have 96
> rows.

> "12 did not match. They stay in your table and are not colored." Good, it says what happened to
> them.

> "Mdm2, differs only in letter case from MDM2. Use MDM2." Somebody typed that in mouse case. Yes,
> that's MDM2. Does clicking that change her file? ... "matched by hand to MDM2", "Undo match". It
> sounds like it's only for me. I'd click it.

> "Not in this network: 11 ids." 7-Sep, "date?". 2-Mar, "date?". And the box: "2 ids look like
> spreadsheet dates (SEPT2 -> 2-Sep). A spreadsheet can turn a gene name into a date when the file
> is opened. Correct them in your table and add it again."

He sits back.

> That's Excel. That's exactly what happened to us last year. It told me it was Excel, not me and
> not the file. That's the first time a program has said that to me. ... Though it says "SEPT2 ->
> 2-Sep" and my list shows "2-Mar" and "7-Sep". So 2-Mar is MARCH2, I suppose? And 7-Sep is SEPT7?
> The example doesn't match either of my two. I worked it out, but I had to think.

> The rest, ACTB, GAPDH, IL6, VEGFA, HIF1A, those are just not in her network. GAPDH's a
> housekeeping gene, I'm not surprised. "Copy the 12 symbols." Good, that goes in the email to the
> PI.

> After I click Use MDM2 it says 85 of 96, "1 by hand", and the copy button now says 11. The
> bottom says "11 genes stay uncolored. Apply is one step; one Undo takes all of it back." Fold
> change row: "36 up, 49 down". 36 and 49 is 85. It adds up. I'll check that again on the picture.

> "Blue below 0, red above, as the recipe draws it; -2.41 to 2.98 on the matched genes." I didn't
> have to choose anything about the colours. Good.

> I'll press Apply.

## 4. Applied

> "Expression overlay applied: 84 of 96 genes matched." With "Show the 12" and "Undo". On the
> right, "Expression overlay, 84 of 96 genes matched; 12 did not". So it stays after the black box
> goes. Good. (This picture is without the MDM2 fix; with it I'd expect 85.)

> The legend: "Fold change color, log2FC, 84 genes", blue down, red up. "Module color, 216 others,
> muted: Ribosome 44, Proteasome 31, DNA repair 26, 6 more." 84 and 216 is 300. OK.

He leans in to the picture.

> Now which dots are mine? Ribosome is pale blue. DNA repair is a pinky orange. My down genes are
> blue and my up genes are red-orange. The cluster on the right is full of light blue dots; are
> those Ribosome, or my genes that went down a little? The ones in the bottom-left group are pale
> orange: DNA repair or slightly up? The dark ones I can read, PSMA2, SNRPD3, they're labelled. The
> pale ones I can't. If I put this on a slide the PI will ask me that and I won't know.

> And it says 9 modules in the dialog, "9 modules", but the other version of this page said "8
> modules and 26 unassigned". DNA repair is also 26. I noticed because I read numbers. I'd ask her.

> It's called "Untitled" at the top. Where is this? If I close the tab, is my version gone? It
> doesn't say. I'd want to know it's still like this when the PI asks next week.

> Is it ready? Yes. My genes are on it, it told me 84, and it told me which weren't. That's what
> you asked me.

## 5. After one Undo (the moderator asked him what would happen if he pressed Undo)

> "Expression overlay is waiting for data ... Files on disk were not changed." Good. That last
> sentence is the one I wanted. Her file's fine.

## 6. The other pages the moderator pointed at

**The older "Share and apply" version of the start box** (`r4-tom-ucf-recipe-apply.png`, state 2):

> This one's different. It says "Saved by Maren on Sep 26 2026" at the top, which the first one
> didn't. And it says "To use it, add a protein network and a table of your genes." So in this one
> I DO have to go and get the network. And the button is "Add data...", not "Add your table...".
> Which one is it? This is the thing I asked about in the first box. In this version the dialog
> also offers me two fold-change columns, hers and mine, and asks which. The other version said
> "The sender's fold change is not used." I prefer that one. But if they disagree, I'd assume the
> program's wrong and I'm about to look foolish.

> The branch at the bottom: "Module, for color: Not bound. Left unbound: Module color is kept and
> switched off." Not bound? Is my result wrong now, or just incomplete? "Bound" sounds like it's
> going to do something to her file. I'd stop there and email her.

**The bank one** (`r4-tom-ucf-replace-and-recipe.png`):

> This isn't mine, it's bank accounts. "2 attributes to bind." "Leave unbound." There's that word
> again. I skipped it. I did see the File menu there with "Export..." in it, which is where I'd go
> for a slide. I didn't see how to get a slide out of my own picture; nobody showed me.

**The storyboard** (`r4-tom-ucf-recipe-travels.png`):

> That's a comic of me. It says I'll say "That's the lab's picture with my genes on it." I'd say
> that about the dark dots. Not the pale ones.

---

## Single Ease Question

**5 of 7.**

> Getting the list on was easy. One button, one count, it told me the Excel dates. I lost points on
> three things: not knowing whether her network came in the file or I had to go get it; the
> PageRank rows with a question I couldn't answer, which I only got past because it was already
> filled in; and the finished picture, where the pale module colours look like my up and down
> genes.

## Would he use this instead of his current way?

His current way is: the postdoc sends a PNG and an Excel file, or he emails her the list and she
sends the PNG back.

> For this, yes, probably. I got the number without her. The not-found list with the Excel warning
> is better than what I get now, which is her saying "some didn't map". But I'd send the picture to
> her before it goes to the PI, because of the pale colours, and I'd want to know where "Untitled"
> lives before I trusted it for next week. If the network part had gone wrong, if it had asked me
> to find her network file and I'd picked the wrong one, I'd have asked her for a PNG.

---

## Observations (plain facts from the session, most serious first)

1. **Pale module colours share hue with up and down.** On the applied graph, "muted" Ribosome is
   light blue and DNA repair is salmon, the same hues as down and up. He could not tell a slightly
   changed gene of his from a background protein for any node without a label. He did not raise
   red-green: the up/down pair is red/blue, and that was fine for him.
2. **Where the network comes from is unclear.** The start box names "Sender's network: STRING v12"
   as if present, the Apply dialog shows it loaded with a graph behind it, the sender's side says
   the network is "named, not carried" and "they open the network themselves", and the email told
   him to fetch it from the shared drive. He could not say whether the recipe carried her data, and
   "No data inside" plus her 300 proteins on screen made him distrust one of the two.
3. **Two versions of the recipient flow disagree.** The start screen box ("Add your table...",
   sender's network already named, sender's fold change never offered) and the older "Share and
   apply" frames ("Add data...", add your own network, choose between two fold-change columns,
   "Not bound") tell different stories. He noticed and assumed the tool was wrong.
4. **Algorithm rows and a question he cannot answer in the dialog.** "3 runs: PageRank, Louvain,
   degree", "Weight ... 10 communities" and "For confidence, a higher number means ..." He got past
   only because it was pre-filled with "the recipe's answer".
5. **Who sent it is missing from the first box.** The start box says "sender"; the dialog says
   "saved by Maren Holt". He reads the author carefully and looked for it first on the box.
6. **The spreadsheet-date example does not match his ids.** The example is "SEPT2 -> 2-Sep"; his
   list shows "7-Sep" and "2-Mar". He worked out MARCH2 himself. He called the warning the best
   thing on the screen.
7. **"Untitled" and where it is kept.** After Apply he did not know whether his version survives
   closing the tab.
8. **Module count disagrees between pages.** "9 modules" in the Apply dialog, "8 modules and 26
   unassigned" in the older frames. He noticed because he reads counts.
9. **"This recipe names no server"** puzzled him (why would a colour file name a server?), but the
   line above it, "uploads nothing", answered his real question before he added data.
10. **No way to a slide was shown on his path.** He found "Export..." only on the bank analyst's
    File menu.
