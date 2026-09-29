# Session: using a colleague's file on your own gene list -- the recipe recipient (Tom)

Participant: Tom, lab manager, cell biology lab; receives files, never builds them (persona:
`study/personas/recipe-recipient.md`). Simulated participant, round 1.

Task, as the moderator gave it: "Your lab lead emailed you this file. Use it on your gene list."

Screens used, in order: the start screen (first run, then with the recipe waiting for data), then
the Apply recipe dialog at its matching step (12 genes not matched; the column chosen; nothing
matched). Renders read: `shots/screens__start-screen.png`, `shots/tom-ucf-start-s4.png`,
`shots/tom-ucf-binding-some.png`, `shots/tom-ucf-binding-chosen.png`,
`shots/tom-ucf-binding-none.png`.

The files in Tom's hands: the attachment from his lab lead (the recipe "Expression overlay") and
his own spreadsheet of this week's qPCR hits, `qpcr-hits-2026-09.csv`, 96 rows.

## Transcript (think-aloud)

### 1. The start screen, before anything is dropped

> OK. "Open a graph." There's a little lock line under it -- "Files stay on this computer. graphty
> reads them in this browser and uploads nothing." Good. That's the first thing I'd have asked. I'm
> going to take that at its word for now, but I'd still mention it to IT. Our hits aren't
> published.
>
> Then there's karate club, Les Miserables, bank transfers... none of that is mine. Protein
> interactions, 300 proteins, that one at least looks like biology. But she didn't send me a
> sample, she sent me a file.
>
> I don't see anything that says "recipe" or "the file your colleague sent". There's "Open..." at
> the bottom in small type. I'd have double-clicked the attachment first, honestly. When that just
> downloads it, I'd drag it onto this window.

Tom drags the emailed file onto the window. (The start screen says a file dropped anywhere
opens as Open... would.)

### 2. The recipe waiting for data

> Right, now it's changed. "Recipe waiting for data. Expression overlay." That's the name she used
> in the email, so that's the right file.
>
> It doesn't say it's from her, though. No name, no date. If two of these turned up in my
> inbox I couldn't tell hers from the old one.
>
> "Colors your genes by log2 fold change, red for up and blue for down." Red and blue. Fine, I
> can tell those apart. "Draws the other proteins in muted module colors, and hides interactions
> with confidence under 0.7." I don't know what module colors are but I don't need to.
>
> "It carries no data. To use it, open a protein network and a table of your genes with a
> fold-change column."
>
> Hang on. A protein network AND a table. She said "just drop your gene list on it". I have a
> gene list. I don't have a protein network. Is that something she was supposed to send me too?
> Or is it one of these? [looks at recent projects] "Knockdown screen, September, 300 proteins,
> yesterday." Is that hers? I didn't open that. Maybe someone used this laptop. I'm not going to
> click somebody else's project.
>
> "This recipe names no server, so graphty contacts none." Good, same as the line at the top.
> That's twice it's told me. OK.
>
> The blue button is "Open...". That's the biggest thing. I'll click it and pick my spreadsheet
> and see what it says.

Tom clicks Open... and picks `qpcr-hits-2026-09.csv` from his Downloads. (The prototype moves on
to the Apply recipe dialog's matching step, state 2.)

### 3. The matching step: 84 of 96

> [first look] "Apply recipe Expression overlay". "Data files: ppi-core-300.graphml, 300
> proteins, 1,262 interactions; already open." Already open? I didn't open that. I opened my
> spreadsheet. Where did that come from -- did it come with her file? It just said it carries no
> data. I'd probably ask her about this bit.
>
> Then my file, "qpcr-hits-2026-09.csv, 96 rows". Yes, 96. That's right, I counted them this
> morning. Good.
>
> "84 of 96 genes matched." That's the number the PI wants. That's what I'd say in lab meeting.
> And "12 did not match. They stay in the table and are not colored." So it's telling me which
> twelve. Good.
>
> [reads the list] "7-Sep, looks like a spreadsheet date. 2-Mar, looks like a spreadsheet date."
> [laughs] Excel. Again. SEPT7 and MARCH2. Well, at least it told me instead of just dropping them.
> That's the first time a tool has noticed that for me. It doesn't tell me how to get them back
> though; I'd have to fix the spreadsheet and do this again, I suppose.
>
> "Mdm2, differs only in letter case from MDM2. Use MDM2." That's the same gene, someone typed it
> in mouse case. Yes, obviously use MDM2. I'll click that.
>
> "GAPDH, no node with this id. ACTB, no node with this id." Those are our housekeeping genes,
> they're the controls, they're always in the export. Of course they're not in her network. But
> what's a "node"? And "id"? Is this "it's not in her network", or "it's not a real gene"? I think
> it means the first one. VEGFA, HIF1A, IL6 -- those are real genes, I know they're real. So it
> must be the network doesn't have them. It could just say that.
>
> Then down below: "Fold change. Choose a column. 2 columns fit." Oh, it's asking me something.
> "log2FC, in the table: 84 matched values." That's mine, that's my column name. "log2FoldChange,
> in the network file: 300 values." Why does her network have fold changes in it? Those are
> somebody else's numbers. I want mine. I'll pick log2FC.
>
> The Apply button is grey until I do that. The line at the bottom says "Choose the fold-change
> column to apply." OK, I'd have missed that it was grey, but that line tells me.
>
> "Change matching...", "Genes, to join", "Matched by name (3)". I'm not touching any of that.
> That's her job.

Tom picks log2FC and clicks Use MDM2 (the prototype's state 3).

### 4. After the choice

> "85 of 96 genes matched, 1 by hand." Right, MDM2 went up by one. "Undo match" next to it, so I
> can take that back. Fine.
>
> "Fold change, log2FC, 36 up, 49 down." Thirty-six up, forty-nine down, that's 85. That adds up.
> "Blue below 0, red above, as the recipe draws it." Good.
>
> Now Apply is blue. "Apply is one step. One Undo takes all of it back." What I actually want to
> know is: does Apply change her file? The one she sent me? Or the ppi-core-300 thing? It says
> "one Undo takes it back", which is nice, but that's not the same as "her file is untouched".
> If I press this and next week her file looks different, that's on me.
>
> I'd press it. I'd be nervous about it, but I'd press it. Then I'd want to see my genes red and
> blue on the picture, and I'd count them.

### 5. The moderator's variant: the default export, nothing matched

The moderator shows state 4: the file from the qPCR software's default export, with a different
kind of ID.

> "None of the 96 genes matched." Well, at least it's not pretending. "The table's values look
> like a different kind of ID from the network's protein names: ENSG00000170312 in the table, CDK1
> in the network." OK, so those are the Ensembl numbers. That's the wrong export. That's my
> fault, not the file's. I understand that.
>
> "Match through a mapping table..." -- I don't have a mapping table. I wouldn't know what that
> is. "Change table..." -- that one I get: pick the other export.
>
> Down here: "Fold change, Leave unbound, kept, switched off." Unbound? Switched off? Is my result
> wrong now, or just incomplete? And the Apply button is still blue. "Apply adds the module colors
> and the filter now." So if I press Apply now, I get her picture with none of my genes on it? Why
> would I want that? I'd click Change table... and pick the right export. If that didn't work
> either, I'd ask her to just send me a PNG.

## After the task

**Single Ease Question** (1 very hard, 7 very easy): **4.**

> Middling. The bit where it told me 84 of 96 and named the twelve, that was the best thing I've
> seen one of these tools do -- the Excel dates especially. That's a 6 on its own. But getting
> there: it wanted a protein network I didn't know I had, then one appeared "already open" that I
> never opened, and at the end I still don't know if pressing Apply changes her file. That's a 3.

**Would you use this instead of what you do now?**

> What I do now is email her my spreadsheet and wait two days for a PNG. If she's around, this is
> faster, and it told me the number and the missing ones without me counting, and it said my data
> stays on my computer. So yes, probably, for the count. But the first time, I'd want her sitting
> next to me for the "protein network" part, because the email said "drop your list on it" and
> the screen said I need two things. If I'd got that wrong on my own, that's my one failure for
> the day and I'd already be halfway to asking for the PNG.

## Problems observed

1. **The recipe asks for a protein network the recipient does not know he has** (start screen,
   recipe waiting for data). The card says "open a protein network and a table of your genes"; the
   sender's instruction was "drop your gene list on it". Tom has only a gene list and could not
   tell whether the network should have come with the file, or is one of the recent projects.
   Severity 3.
2. **A network appears "already open" that the participant never opened** (matching step, data
   files). After choosing Open... and picking only his spreadsheet, the dialog lists
   `ppi-core-300.graphml ... already open`. He could not say where it came from. Severity 3.
3. **Apply does not say whether the sender's file changes** (matching step footer). "One Undo takes
   all of it back" answers a different question; Tom wanted to know that her file stays as she
   sent it. Severity 2.
4. **"no node with this id" reads as jargon and leaves blame unclear** (matching step, unmatched
   list). Tom knew GAPDH, ACTB, VEGFA are real genes and inferred "not in her network", but the
   words "node" and "id" did not say so. Severity 2.
5. **The recipe card does not name who saved it or when** (start screen, recipe waiting for data).
   He reads the file's title and author carefully and could not tell this recipe from an older
   copy. Severity 2.
6. **"Leave unbound" and "kept, switched off", with Apply still active, when nothing matched**
   (matching step, nothing matched). He did not understand what Apply would give him, and asked
   whether his result was wrong or just incomplete. Severity 2.
7. **No way to recover the spreadsheet-date genes in place** (matching step). 7-Sep and 2-Mar were
   correctly spotted, but he expects to fix the spreadsheet and repeat the whole apply. Severity 1.

## What worked for him

- "Files stay on this computer ... uploads nothing" at the top, and "This recipe names no server"
  on the card: he said this answered his first question before he gave it data.
- "84 of 96 genes matched" as the heading, with 96 matching his own row count.
- Every unmatched gene named, with the spreadsheet-date reason; he called that the best thing a tool
  like this had done for him.
- The one-click case fix (Mdm2 to MDM2) and the "36 up, 49 down" count that added up to 85.
- Red and blue for up and down; no red-green problem.
