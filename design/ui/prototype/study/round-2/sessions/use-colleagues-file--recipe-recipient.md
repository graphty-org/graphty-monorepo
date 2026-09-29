# Session: use a colleague's file on your own gene list -- the recipe recipient (Tom)

**Participant:** Tom, lab manager, 52, receives the lab's network files and never builds them;
mild red-green color weakness, reads at 110 to 125 percent zoom, trackpad only.
**Task, as given by the moderator:** "Your lab lead emailed you this file. Use it on your gene
list."
**Screens used:** the start screen (first run, dropping a file, a recipe waiting for data), then
the recipe dialog and its matching step (renders at 1440 by 900, clicked as a prototype).
**Result:** done, with one near miss. He almost pressed Apply before his own list was in, which
would have painted the lab network's old fold changes and looked like success. He noticed only
because the up and down counts added to 300 and he has 96 rows. After he found "Add a table...",
the rest went well: he got 85 of 96, knew which 11 were missing and why, and applied.
**Single Ease Question:** 5 of 7.

## Transcript

### 1. The first screen

> Okay, so the email says "drop your list on the lab file". I've saved the attachment. It's
> called... "Expression overlay". Not a .cys at least. What opens it? She said it's a web thing.

Moderator opens the start screen (first run).

> "Open a graph". Four pictures: karate club, Les Miserables, protein interactions, bank
> transfers. None of those is ours. That's not what she sent. Fine, these are examples.
>
> This line I actually read: "Files stay on this computer. graphty reads them in this browser and
> uploads nothing." Good. That was my first question. Our hits aren't published. I'd still want
> IT to tell me that, not the page, but at least it says it without me asking. There's "Where
> your data goes" -- I'm not reading a policy now, I've got fifteen minutes.

He does not click the link.

> Nothing says "drop here". I'll just drag the file onto the window, that's what I'd do with
> anything.

He drags the file onto the page. The "Open..." row turns blue and reads "Drop to open".

> Oh, it lit up. "Drop to open". Okay, it knows what I'm doing. Good.

### 2. The recipe card

> "Recipe waiting for data. Expression overlay." Recipe. Fine, whatever she calls it. "Colors your
> genes by log2 fold change, red for up and blue for down." Red and blue. Good, I can actually
> tell those apart. "Draws the other proteins in muted module colors, and hides interactions with
> confidence under 0.7." Okay.
>
> "It carries no data. To use it, open a protein network and a table of your genes with a
> fold-change column."
>
> Hang on. A protein network? She didn't send me a network. I thought the network was IN the
> file. That's the whole point, "the lab's picture". I have a table. I don't have a network.

He looks down the page.

> "Knockdown screen, September, 300 proteins, yesterday." Is that hers? I didn't open that. Maybe
> it's from when she set this laptop up. I'd... I don't know. I'm not going to guess on that.
> I'll press the big blue one.
>
> "This recipe names no server, so graphty contacts none." Okay. I'll take that.

He clicks "Open..." in the card, and in the file picker chooses his qPCR list,
qpcr-hits-2026-09.csv, because it is the only file he has.

Moderator note: the prototype has no screen for what happens when a table alone is chosen here;
the moderator moves him to the recipe dialog, which in this prototype opens with the lab's
network already loaded.

### 3. The recipe dialog -- the near miss

> "Apply recipe. Expression overlay, version 1, opened today." Doesn't say who made it. I'd want
> it to say Maren. Anyway.
>
> "Brings 2 styles, 1 filter. You supply: a network with a gene column." A network again. I
> supplied a list.
>
> Down here: "Reads from ppi-core-300.graphml, opened by this recipe." Oh. So it DID bring the
> network. Then why did the first screen tell me to open one? Okay, it doesn't matter, it's here.
> And behind this box there's a grey picture with the dots, that's the lab network I think.
>
> Bottom: "Everything was found by name. One Undo takes it all back." Apply. Big blue button.
> Everything was found. Great.

He moves to Apply, then stops.

> Wait. "Fold change, log2FoldChange, 152 up, 148 down." 152 and 148 is 300. I've got 96 genes.
> That's not my list. That's the network's own numbers, from whenever she made it. Where's my
> file? I picked my file. It's not in here anywhere.

He reads the dialog again, slowly, top to bottom.

> ...There. "Add a table..." Tiny, at the end of the line about the network file. That's where my
> list goes? It's the smallest thing on the whole box, and the Apply button says everything is
> found. If I'd been in a hurry I'd have pressed Apply, it would have gone red and blue, and I'd
> have put her old numbers in front of the PI as mine. I wouldn't have known.

Moderator note: about 50 seconds from the dialog opening to finding "Add a table...". He counted
the up and down numbers against his row count, which is the only reason he caught it.

He clicks "Add a table..." and picks qpcr-hits-2026-09.csv again.

> Picking it twice. Fine.

### 4. What matched

> "84 of 96 genes matched." That's the number. 96 is my row count, good, it knows my file. That's
> what the PI will ask me. "12 did not match. They stay in the table and are not colored." Good,
> so it's telling me, not just leaving them grey.
>
> "Mdm2 differs only in letter case from MDM2. Use MDM2." Yes, obviously, that's the same gene.
> Somebody typed it in mouse case.

He clicks "Use MDM2".

> 85 of 96, "1 by hand". Good. And it says I can undo just that one.
>
> "Not in this network: 11 ids, for example 7-Sep." And there it is. 7-Sep, 2-Mar, "date?". And
> the grey box: "2 ids look like spreadsheet dates, SEPT2 to 2-Sep. A spreadsheet can turn a gene
> name into a date when the file is opened." Ha. Yes. Excel did that to us last year with the SEPT
> genes in a supplementary table. At least I know it's Excel and not me and not her file. I'll
> fix those two in the sheet.
>
> The other nine: TP53BP1, H2AFX, GAPDH, ACTB, VEGFA, HIF1A, IL6, CXCL8, SERPINE1. GAPDH and ACTB
> are our housekeeping controls, so of course they're not in her network. I can say that out loud
> in lab meeting. "Copy the 11 symbols" -- that's useful, I'll paste those into the email.

### 5. Which fold change

> "Needs a choice. Fold change. Choose a column. 2 columns fit." Oh, here we go. A question.
>
> Underneath: "log2FC, in the table: 84 matched values, -2.41 to 2.98." And "log2FoldChange, in
> the network file: 300 values." The one in the table is mine. log2FC is what our qPCR sheet
> calls it. The network one is hers, the one it was about to use a minute ago. So, log2FC.

He opens the picker and chooses log2FC.

> "36 up, 49 down." 36 and 49 is 85. That matches the 85. Good. "Blue below 0, red above, as the
> recipe draws it." Fine.
>
> I didn't love being asked that. But it told me which one was mine, so I could answer it. If it
> had just said "choose key column" I'd have closed it.

### 6. Apply, and whose file is this

> "Apply is one step. One Undo takes all of it back." Undo takes what back? Is this changing her
> network file? The graphml? If I press Apply, does Maren's file now have my qPCR in it? Because
> that goes on the shared drive and everyone uses it.
>
> Nothing here says. It says "opened by this recipe" -- so it's open, not changed? I'd guess it's
> a copy. I'd probably ask her about this bit before I saved anything.

He presses Apply.

Moderator note: the prototype ends at Apply; the applied picture is on another page and was not
part of this task.

### 7. The other case: nothing matched

Moderator shows the state where the table he added was the default export from the qPCR
instrument, with Ensembl IDs.

> "None of the 96 genes matched." At least it says so right away and doesn't pretend. "The
> table's values look like a different kind of ID from the network's protein names:
> ENSG00000170312 in the table, CDK1 in the network." Right, that's the instrument's export, the
> long numbers. Okay, so that's my file, not hers. That's what I want to know.
>
> "Match through a mapping table..." I don't have a mapping table. I don't know what that is.
> "Change table..." -- that one I understand, I'd go and get the sheet with the gene names.
>
> Down here: "Fold change: Leave unbound. Kept, switched off." Unbound? Switched off? Is my result
> wrong now, or just incomplete? And then "Apply adds the module colors and the filter now." Why
> would I apply anything when none of my genes matched? I'd close it. I wouldn't press Apply on
> this, it sounds like it's going to change her file with nothing of mine in it.

He presses Cancel.

## After the task

**Single Ease Question:** 5 of 7.

> Five. Once my list was actually in, it was the best version of this I've seen. It told me the
> number, it told me which ones, it told me two were Excel's fault. That's the thing I never get
> from Cytoscape, I just get grey dots and no explanation.
>
> It loses two points because it nearly let me put her old numbers up as mine. The button said
> "everything was found" before I'd given it anything. And the first screen told me to open a
> network I didn't have, when it already had one.

**Would you use this instead of what you do now?**

> What I do now is ask her to send me a PNG and an Excel file. For a one-off slide, I'd still do
> that. But if she's away and the PI wants the number -- yes, I'd use this, because it gave me the
> number and the list of misses without me counting, and nothing got installed and it said my file
> stays here. I'd want someone to tell me that pressing Apply doesn't change her file on the shared
> drive. Until I know that, I wouldn't save anything.

## Problems observed

| Where | What happened | Severity (1-4) |
|---|---|---|
| Recipe dialog, first view | Apply is enabled and the footer says "Everything was found by name" before his own table is in; the only way to add his list is a small "Add a table..." link. Pressing Apply would have colored the network's old fold changes, looking like success. Caught only by adding up 152 + 148. | 4 |
| Start screen, recipe card | Card says "It carries no data. To use it, open a protein network and a table", but the dialog then shows the recipe opened the lab's network itself. He had no network and nearly guessed at a recent project. | 3 |
| Start screen to dialog | He chose his gene list in the card's Open..., then the dialog did not show it and he had to pick the same file again with "Add a table...". | 3 |
| Matching step, footer | "One Undo takes all of it back" made him ask whether Apply changes the lab's network file on the shared drive; nothing says whether the file is changed. | 2 |
| Nothing-matched state | "Leave unbound" and "kept, switched off" were read as "my result is wrong"; Apply stays blue with nothing of his matched, and he did not understand why he would press it. "Match through a mapping table..." meant nothing to him. | 2 |
| Recipe dialog header | No sender shown ("version 1, opened today"); he wanted to see it came from Maren. | 1 |

## What worked for him

- The line about files staying on this computer answered his first question before he asked it.
- The drop target lighting up "Drop to open".
- Red for up and blue for down, named in words, with no red-green.
- "84 of 96 genes matched" in large type, with the 12 named and copyable.
- The spreadsheet-date explanation for 7-Sep and 2-Mar.
- The fold-change choice labelled "in the table" versus "in the network file", with value ranges,
  so he could answer a question he would normally refuse.
- Up and down counts that add up to the matched count.
