# Session: a colleague's recipe on my own table, with a column missing -- the recipe recipient (Tom)

Participant: Tom, lab manager, 52, reads shared files and never builds them (persona:
`study/personas/recipe-recipient.md`). Played in character; he reports, he does not design.

Moderator's task, as given: "A colleague sent you their analysis recipe. Apply it to your own
data; your table does not have one of the columns it needs."

Screens, in the order he met them:

- `screens/replace-and-recipe.html` (the File menu, the recipe picker, the step that asks about
  two missing attributes, the result). Render: `shots/record/r3-tom-missingcol-rr-full.png`.
- `screens/binding-step.html` (the Apply recipe dialog on the lab's protein network, before and
  after his qPCR table is added). Render: `shots/record/r3-tom-missingcol-bs-full.png`.

Both renders are the study view (design notes hidden). He looked at the pictures; where he
clicked something, the moderator showed him the state that control leads to.

## Transcript

**Minute 0. The first screen: the File menu.**

"Right. 'Mule ring review'. Transfers, 3,000 nodes, 'Flagged', 'High risk'. That's... not ours.
That's a bank thing. Is this the right file? She said the lab's recipe."

Moderator: "Carry on as if it were yours."

"Fine. The File menu is open. Open, Add data, Replace data... there's 'Recipes' on the left one.
She called it a recipe, so I'd go there. I'm not touching 'Replace data', I don't want to replace
anything."

**Minute 1. The recipe picker.**

"'Apply recipe'. 'Mule ring triage, from the fraud team, shared Sep 20. Carries no data.' OK, so
it says who sent it and when, that's good, I'd want that. 'Carries no data' -- good, so her
numbers aren't in it.

"Four ticked boxes. 3 sets, 2 runs, 3 style layers, 1 note. I'd leave them ticked, I want her
version. 'It needs: amount, timestamp, riskScore, counterparty_bank.' And the yellow thing: '2 of
the 4 are not in this graph by name. The next step asks how to read them.' How to read them? I
don't know how to read them, that's why she sent it.

"The button says 'Continue to binding'. Binding. What does 'bind' mean? Is that going to change
her file? ... There's nothing else to press except Cancel, so I'd press it. Nervously."

**Minute 2. The step that asks about the missing ones.**

"'2 attributes to bind. amount and timestamp matched by name.' So two were fine. riskScore -- it
has picked 'risk_score' and says 'matched by hand'. By whose hand? Not mine, I didn't do anything.
I suppose that's the same thing with an underscore. Fine.

"counterparty_bank: 'Leave unbound', 'no attribute fits'. And underneath: 'Left unbound,
Pass-through edges (style layer) is kept and switched off, marked missing attribute.' I read that
twice. Is my result wrong now, or just incomplete? Switched off sounds like broken.

"The watchlist bit I understand: '7 of 9 accounts found', and it names the two that aren't. That's
the part I'd actually want -- a number, and which ones.

"Apply. 'One undo step.' OK."

**Minute 3. After Apply.**

"The black bar says 'applied: recipe; 1 missing attribute', and Undo. So it did something. On the
left there's 'new' next to things, so I can see what came in. One of them has a little crossed-out
eye. On the right there's a box outlined in red with 'counterparty_bank' in it and a 'Bind...' link.
Red means I've done something wrong. I'd leave it. I'd probably ask her about this bit."

Moderator: "Now the same thing with your own data. This is your lab's recipe."

**Minute 4. The lab's recipe: first look.**

"That's more like it. 'ppi-core-300', 300 nodes. 'Apply recipe', 'Expression overlay, version 1,
opened today.' ... It doesn't say it's from her. The bank one said 'from the fraud team'. This one
could be anybody's. I'd want to see her name on it before I trust it.

"'Brings: 2 styles, 1 filter, 1 run. You supply: a network with a gene column.' I don't have a
network. I have a spreadsheet. So is this not for me?

"'What it adds': fold change colors, blue below 0, red above. Module colors. Confidence filter.
'Communities run: Louvain, weighted by confidence.' I don't know what Louvain is, and I'm not
learning it at 4 pm. Is it something I need? I'll leave it, it was ticked by her.

"The table: fold change, module, confidence, weight, all matched. 'Everything was found by name.
One Undo takes it all back.' And a big blue Apply."

He moves toward Apply, then stops.

"Hang on. Everything matched? I haven't given it anything. Those are her numbers, the ones already
in the network. If I press Apply I get her picture with her data. Where do my genes go? She said
drop your list on it. Drop it where?"

He looks for about half a minute before he finds it.

"'Reads from ppi-core-300.graphml, opened by this recipe.' And then, at the end of the grey line,
'Add a table...'. That's it? That little thing? I nearly pressed Apply."

**Minute 5. Before his data goes in.**

"Before I click that. These are this week's hits, they're not published. If I add them, where do
they go? Is this on a server somewhere? Nothing here says. ... On the far left, very small, it
says 'Assistant. Off. Nothing is sent.' That's about the assistant, whatever that is. It doesn't
say anything about my file. I'm not putting our hits into a web page that doesn't tell me where
they end up. I'll check with IT first."

Moderator: "Understood. For the session, use this practice copy of the table."

"With a practice copy, fine."

**Minute 6. After adding the table.**

"'Data files': the network, and 'qpcr-hits-2026-09.csv, 96 rows: symbol, log2FC, padj'. 96 rows.
That's right, I'd count them in Excel but that's the number.

"'84 of 96 genes matched.' Good. That's the number the PI asks for. Big and at the top, I can see
it without looking for it. '12 did not match. They stay in the table and are not colored.'

"'Mdm2 differs only in letter case from MDM2. Use MDM2.' Yes, obviously. I'd click that."

The moderator shows the next state.

"'85 of 96 genes matched, 1 by hand.' And 'matched by hand to MDM2, Undo match'. Good, so I can
see what I did and take it back.

"'Not in this network: 11 ids.' 7-Sep with 'date?', 2-Mar with 'date?'. And the grey box: '2 ids
look like spreadsheet dates (SEPT2 -> 2-Sep). A spreadsheet can turn a gene name into a date when
the file is opened.' Ha. Yes. Excel did this to us with the SEPT genes. So that one's Excel, not
me and not the file. Good, I know what to fix. The others, GAPDH, ACTB -- those are my controls,
they wouldn't be in her network, fine. 'Copy the 11 symbols' -- I'd use that to send her the list."

**Minute 7. The missing column.**

"Now it's gone quiet. Apply is grey. 'Choose the fold-change column to apply.' And in the table:
'Fold change -- Choose a column -- 2 columns fit.' Underneath: 'log2FC, in the table: 84 matched
values, -2.41 to 2.98. log2FoldChange, in the network file: 300 values, -2.52 to 3.15.'

"So that's what 'my table doesn't have the column' means. Mine's called log2FC, hers is called
log2FoldChange. Why does her network already have a fold change in it? Whose experiment is that?
If I pick the wrong one the slide shows her results with my name on it.

"I'd pick log2FC, because it says 'in the table', and the table's mine. But 'log2FoldChange' is the
proper-looking name, the same as the recipe, and it has more numbers. Someone in a hurry would
pick that. I nearly did."

The moderator shows the chosen state.

"'log2FC', a tick, '36 up, 49 down'. 36 and 49 is 85. Good, that matches the 85. 'Blue below 0,
red above, as the recipe draws it.' Fine, I can tell blue from red.

"The confidence line at the bottom, 'For confidence, a higher number means a closer or stronger
link, similarity, the recipe's answer.' I don't know what that is. She answered it, it says. I
leave it.

"'Apply is one step. One Undo takes all of it back.' Blue button. I'd press it."

**Minute 8. After Apply.**

The prototype stops here for his recipe; there is no screen after Apply.

"So what happens now? Does the 85 stay anywhere after this box closes, or do I have to write it
down now? And has her recipe changed because I picked log2FC? She'll send it to the others. I don't
want to have changed her file for everyone. Nothing on the box told me."

## Afterwards

Single Ease Question (1 very hard, 7 very easy): **4**.

"The part with my genes was good. 84 of 96, which ones didn't match, and the date thing -- I've
never had a program tell me that. I could say that in lab meeting. But I nearly pressed Apply
without my list at all, because the little 'Add a table' was the last thing on the line, and it
said everything matched when I hadn't given it anything. Then the two fold changes -- I got it
right, but only because I know my column is called log2FC. And it never said where my file goes.
With our real hits I'd have stopped there.

"Would I use it instead of what I do now? What I do now is ask her to do it. If she's away, maybe
this, with a practice file first and IT saying yes. It's better than Cytoscape, there's nothing to
install. But she could have just sent me a PNG and an Excel file."

## Observations for the studio

- He nearly applied the recipe to the colleague's data with none of his own: in the first state
  the only way to add his table is a small text button at the end of a grey line, while the footer
  says "Everything was found by name" and Apply is the primary button.
- "You supply: a network with a gene column" made him doubt the recipe was for him; he has a table.
- The lab recipe does not say who sent it; the fraud recipe did ("from the fraud team, shared
  Sep 20"), and he noticed the difference.
- Nothing on either screen said whether his table leaves the computer. The only line ("Nothing is
  sent") sits under "Assistant" in small grey text and he read it as being about something else.
  With real unpublished data he refused.
- The two-candidate fold-change choice worked for him, but the network's own column carries the
  recipe's exact name and more values; he said a hurried reader would take it.
- The match count, the named non-matches, the letter-case hand match and the spreadsheet-date line
  were what he valued most; "Copy the symbols" was used as intended.
- In the fraud mock, "bind", "Continue to binding", "Leave unbound", "switched off" and the red
  outline on "missing attribute" read to him as something broken or something that would change
  the sender's file.
- After Apply he could not tell whether the count would remain visible, or whether the sender's
  recipe was changed by his column choice.
