# Session: a colleague's recipe on his own gene list -- the recipe recipient (Tom)

Participant: Tom, lab manager, 52, reads shared files and never builds them (persona:
`study/personas/recipe-recipient.md`). Played in character; he reports, he does not design.

Moderator's task, as given: "Your lab lead emailed you this file. Use it on your gene list."

Screens, in the order he met them: the start screen with nothing open, the start screen while
a file is dragged over it, the start screen with the recipe waiting for data, then the Apply
recipe dialog: the recipe preview, the matching step with 12 genes unmatched, and the same step
after he chose a column. The "nothing matched" state was shown afterwards as a probe. What he saw:

- `shots/screens__start-screen.png` -- the start screen, nothing opened yet
- `shots/r3-tom-recipe-start-s4.png` -- the recipe waiting for data
- `screens/binding-step.html`, frames "Everything matched", "12 genes did not match", "The
  column chosen", "Nothing matched" (rendered in the study view, design notes hidden)

## Transcript

**Minute 0. The email and the file.**

"Maren's email says 'here's the lab file, just drop your list on it'. The attachment is called
Expression overlay. I'd double-click it first. ... The moderator says it opened in the browser.
Fine. No install, no Java. That part is already better than last time."

**Minute 0 to 1. The start screen.**

"'Open a graph.' Four little pictures: Karate club, Les Miserables, Protein interactions, Bank
transfers. None of those is ours. Where's the picture she showed in lab meeting? ... Not here.

"Under the title: 'Files stay on this computer. graphty reads them in this browser and uploads
nothing.' OK. That's the first question I would have asked, and it's the second line on the
page. I don't just take a web page's word for it, but there's a link, 'Where your data goes',
and that's something I could forward to IT. I'd do that before I put anything unpublished in.
For today I'll go on, because the moderator says the list is a practice copy."

"She said 'drop your list on it'. Drop it where? There's no box. I'll drag the file onto the
window."

(Shown the drag state.) "The 'Open...' line lights up blue and says 'Drop to open'. Good, so
dropping works. I dropped her file, not my list. I think. I'm not sure which one she meant."

**Minute 1 to 2. The recipe card.**

"'Recipe waiting for data. Expression overlay.' So that's her file. 'Colors your genes by log2
fold change, red for up and blue for down.' Red up, blue down, I can tell those apart, fine.
'Draws the other proteins in muted module colors, and hides interactions with confidence under
0.7.' I'd skip that part.

"'It carries no data. To use it, open a protein network and a table of your genes with a
fold-change column.' ... A protein network? She didn't send me a network. She said drop my
list. I have the list. I don't have a network. Is the network one of these recent things?
'Knockdown screen, September, 300 proteins, yesterday.' I didn't open that yesterday. That's
not mine. I'm not touching it.

"'This recipe names no server, so graphty contacts none.' OK, good, nothing goes out.

"Biggest button is 'Open...'. I'll press that and pick my qPCR file, because that's all I've
got."

(The prototype goes to the Apply recipe dialog, with ppi-core-300 open behind it.)

**Minute 2. The recipe preview.**

"Now there's a network. 'ppi-core-300.graphml, opened by this recipe.' Hang on. A minute ago it
said the recipe carries no data. Now it opened a network? From where? It also said graphty
contacts no server. So where did this come from, her laptop? I'd ask her about this bit.

"'Brings 2 styles, 1 filter, 1 run. You supply a network with a gene column.' I didn't supply
a network, it did. So what am I supplying?

"'Communities run. Louvain, weighted by confidence.' I don't know what Louvain is and I'm not
learning it at 4 pm. Do I need it? ... 'For confidence, a higher number means a closer or
stronger link, similarity, the recipe's answer.' That's her question, not mine. I'm leaving it
exactly as it is.

"'Everything was found by name.' Everything? My list isn't even in yet. And the picture behind
it is grey dots. That's not what she showed us. I suppose it colors after I press Apply.

"Down here, 'Add a table...'. That's my list. I'd press that, not Apply. If I press Apply now I
think I get her colors on her numbers, not mine."

**Minute 3 to 4. The matching step.**

"'84 of 96 genes matched.' My sheet has 96 rows. 84 and 12 is 96. Good, it adds up. That's the
number the PI will ask for.

"'12 did not match. They stay in the table and are not colored.' Good, so it isn't pretending.
'Mdm2 differs only in letter case from MDM2.' That's our typo, someone typed it like a mouse
gene. 'Use MDM2'. Yes. (Clicks.) Now 85 of 96, '1 by hand', and 'Undo match' next to it. OK.

"'Not in this network: 11 ids.' 7-Sep, 2-Mar, TP53BP1, GAPDH, ACTB... GAPDH and ACTB are our
housekeeping genes, they wouldn't be in a protein-interaction network anyway, so that's the
file, not me. And then: '2 ids look like spreadsheet dates (SEPT2 -> 2-Sep).' There it is.
Excel again. It tells me which two, and that I have to fix them in the sheet. That's the first
time a program has told me that instead of me finding out in lab meeting. Whose fault is it?
Mine, well, Excel's. It says so. Fine.

"Why does it say 7-Sep is SEPT2 as '2-Sep'? The one in my list is 7-Sep, so SEPT7. The example
is just an example. OK.

"'Copy the 12 symbols.' I'd copy them into my email to Maren."

**Minute 4. Which column.**

"'Fold change: Choose a column. 2 columns fit.' 'log2FC, in the table: 84 matched values.'
'log2FoldChange, in the network file: 300 values.' Mine's the one in the table, log2FC, that's
the header in my sheet. The other one must be her old experiment. If I'd pressed Apply on the
first screen, I'd have painted her numbers and told the PI they were mine. Good thing it asks.
But it only asks because I happened to add the table first.

"(Chooses log2FC.) '36 up, 49 down. Blue below 0, red above.' 36 and 49 is 85. Matches.

"'Genes, to join.' 'Leave unbound' was in the other one. What does 'join' mean here? Joined to
what? I'd leave it.

"'Apply is one step. One Undo takes all of it back.' OK. What it doesn't say is whether this
changes Maren's file. If I press Apply, does her recipe now have my genes in it? Will she open
hers next week and see my hits? I'd want to know that before I press it. I press Apply anyway,
because it says Undo."

(The mock ends at the Apply button; nothing after it is drawn.)

"So I don't know what it looks like. I'd want to see the picture, and then get a slide."

**Probe: the Ensembl export.** (The moderator shows the state where none of the 96 matched.)

"'None of the 96 genes matched.' Well, at least it says so, in big letters, instead of saying
'imported' and doing nothing. 'The table's values look like a different kind of ID: ENSG...
in the table, CDK1 in the network.' Right, that's the default export from the qPCR machine. I'd
re-export with symbols. 'Match through a mapping table...' I don't have one of those and I
don't know what it is.

"'Fold change: Leave unbound, kept, switched off.' Is my result wrong now, or just incomplete?
And the Apply button is still blue. 'Apply adds the module colors, the filter and the
communities run now.' So if I press Apply I get her picture with none of my genes on it, and it
looks like it worked. I wouldn't press that. I'd press Cancel and email her."

## After the task

**Single Ease Question: 5 of 7.**

"The part with my genes was the best I've seen. It told me the number, it told me which ones
weren't there and why, and it caught the Excel dates. That's the whole reason I'd use it. What
made it harder: the first screen told me to bring a network I don't have, then a network
appeared from nowhere, and then it said everything was found before my list was even in. I got
through because I pressed the one thing I recognized. I'd have been stuck if I'd believed the
first card."

**Would he use it instead of what he does now?**

"Instead of Cytoscape, yes, today. No install, and it tells me what didn't match. Instead of
Maren sending me a PNG and an Excel file? Maybe. If I could see the picture before I pressed
Apply and knew her file wasn't changed, then yes, because I'd stop having to ask her. As it is
I'd do it once, and then ask her whether I did it right."

## Problems observed

1. **The recipe card asks for a network he was never sent** (start screen, recipe waiting for
   data). "Open a protein network and a table of your genes" contradicts the email ("drop your
   list on it") and the next screen, where the recipe opens the lab network itself. He had no
   network and nearly stopped. Severity 3.
2. **"Carries no data" and "opened by this recipe" read as a contradiction** (recipe preview).
   A network appears that he did not open, right after being told the recipe holds no data and
   contacts no server; he could not tell where it came from and read it as a possible privacy
   question. Severity 3.
3. **"Everything was found by name" before his list is added** (recipe preview). With Apply
   ready, he could have painted the network's own fold-change column and reported it as his. He
   avoided it only because he recognized "Add a table..." as his list. The route for his own
   list is a small text link, not the main action. Severity 3.
4. **Apply stays active when none of his genes matched** (nothing matched). The footer says what
   Apply adds, but the result would look like the lab picture with none of his genes on it,
   which he would mistake for success. Severity 2 (he read it and stopped; a hurried reader
   would not).
5. **No word on whether Apply changes the colleague's file** (every state). "One Undo takes it
   all back" answers undo, not "will Maren see my hits in her file". Severity 2.
6. **No picture of the lab's look before applying** (start screen and preview). He looked first
   for the picture from lab meeting; the card and the preview are text, and the canvas behind
   the dialog is grey dots. Severity 2.
7. **Jargon he skipped without understanding**: "Louvain", "Communities run", "Weight", "a
   closer or stronger link / similarity", "the recipe's answer", "Genes, to join", "Leave
   unbound, kept, switched off", "letter case must match, as the recipe sets". He left every
   one alone; none blocked him except "switched off", which made him unsure the result was
   complete. Severity 2.
8. **"Drop your list" versus dropping the recipe** (start screen). The drop target works, but
   nothing tells him whether to drop the recipe, his list, or both. Severity 1.

## What worked for him

- The data line under "Open a graph" and the "Where your data goes" link answered his first
  question before he asked it.
- "84 of 96 genes matched" adds up to his row count, and the 12 unmatched are named.
- The spreadsheet-date line named the Excel problem outright and said whose fix it is.
- "Use MDM2" and "Undo match" for the case typo.
- Being asked which fold-change column, with "in the table" versus "in the network file",
  stopped him from painting someone else's numbers.
- "None of the 96 genes matched" said loudly, with the reason.

## Notes for the studio (moderator, not participant)

- The study view of the start screen (`kit/shoot.mjs --study`, `?study`) hides product text on
  that page: the "Open a graph" title, both data lines, and every line of the recipe card except
  its heading and buttons. The kit's note-hiding pass hides every `h1`/`p` outside a `.k-app`,
  and the start-screen windows are `.ss-win`, not `.k-app`. This session used the normal render
  (`shots/r3-tom-recipe-start-s4.png`) with the notes out of frame instead. Any session run from
  the study render of this page saw an empty recipe card.
- `shots/start-screen--s4.png` is older than the page and disagrees with it: it says "red for
  down and blue for up" (the page and the recipe preview say red for up), "Add data..." instead
  of "Open...", and shows an author line. It should be rendered again or removed so the gallery
  does not show the reversed colors.
