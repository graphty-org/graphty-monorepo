# Get back to where you were -- Analyst Alex

**Participant:** Analyst Alex (intermediate graph analyst; Python and Gephi user; Windows laptop, Ctrl keys).
**Task given aloud:** "After your last few actions the numbers changed in a way you did not expect. Get back to where you were, without losing work you meant to keep."
**Screens:** Undo and ways back (participant view, the silent version, left panel open), then Filter chip and its steps.
**Dataset on screen:** Les Miserables co-appearances, 77 characters, narrowed by three filter steps (largest component, degree at least 5, leave out group 8). A selection of 19 characters had also just been cleared by a click on empty canvas.
**Outcome:** reached the intended end state -- degree step off, group 8 still out, the 19 characters selected again -- but only after undoing the step he wanted to keep, redoing through the wrong one, and finding the step list by accident of habit.

## Transcript (think-aloud)

**Looking at the start screen.**
"OK. Les Mis, 77 nodes, I know this one. Top left says 'Filtered: 28 of 77 nodes, 3 steps'. Twenty-eight, that's a lot less than I thought I had. Table at the bottom -- Valjean, degree filtered 18, full graph 36. Eighteen? Valjean's got 36 connections, everybody knows that from the tutorial. So something I did cut his degree in half. That's the number that changed."

"Also the table says 'Selected: none, showing the previous selection'. I don't -- did I have a selection? I'm not sure what that line's telling me. Park that."

"Statistics on the right: 106 edges, 1 component, density 0.280. Fine, whatever, I don't have anything to compare that to."

**First move: Ctrl+Z.**
"Numbers changed, I didn't expect it, I hit Ctrl+Z. That's just what you do." *(presses Ctrl+Z)*

"Something happened -- a bunch of light-blue nodes just showed up at the bottom. Marius, Gavroche, Enjolras. Chip says 41 of 77, 2 steps now. Valjean went 18 to 22. Still not 36. Hm. No message, nothing telling me what it undid. I had to read the chip to know it did anything at all."

"Wait -- the blue ones are the barricade kids. Group 8. I took those out on purpose, I think. So that undo took out the thing I actually wanted? Nothing told me which step it was. In Excel at least the undo dropdown shows you."

**Second Ctrl+Z anyway.**
"Let me just keep going back and see where 36 comes back." *(Ctrl+Z again)*
"76 of 77, 1 step. Valjean 36. OK, so the degree number is right again. But now I've got the whole hairball back, the students are back, all the little one-connection guys are back. That's not 'where I was' either. I'd have had to redo the group 8 thing by hand -- and I don't see an 'add step' anywhere I'd think to look."

**Trying to get forward again.**
"Ctrl+Y." *(presses Ctrl+Y, the Windows redo)* "41, 2 steps -- that brought back the degree filter, the one I don't want. Ctrl+Y again -- 28, 3 steps. Great. I'm back exactly where I started. Undo only goes in a line: to get group 8 back I have to walk back through the bad one. That's the Gephi thing where you just redo it by hand."

**Looking for a list of what I did.**
"There's got to be a history. Hamburger menu, top left." *(opens it)* "File, Edit... Edit: 'Undo Filter out group 8, Ctrl+Z'. Oh, now it tells me. That would have been nice before I pressed it. 'Undo history' -- " *(opens the submenu)* "'Filter to degree >= 5, Undo back to here (1 step)', 'Filter to Largest component, Undo back to here (2 steps)'. Same problem. It's still all-or-nothing going backwards, I can't just pull the middle one out. Close that."

**The chip.**
"The top-left thing with the funnel -- 'Filtered: 28 of 77 nodes, 3 steps'. I'd been reading it as a label. Let me click it." *(clicks)*
"OK -- now this is what I wanted ten clicks ago. 'Filter steps': Filter to Largest component 76, Filter to degree >= 5 is 41, Filter out group 8 is 28. Checkboxes. Each one has its count after it. That's actually good, I can see where the 41 came from."

"Untick the degree one." *(unticks 'Filter to degree >= 5')*
"63 of 77, '2 of 3 steps'. Degree row greyed with dashes. Students still gone. Valjean 32, full graph 36 -- 32 because group 8 is out, fine, that I can explain. So that's the fix. And the step is still in the list, so if my manager asks 'what about degree 5' I can tick it back."

"But -- components 4? I said 'Filter to Largest component'. That's one component by definition. Oh, right, maybe taking out group 8 afterwards broke off those little pairs on the right. I'm guessing. Nothing on this screen says so." *(On the second screen, the filter chip mock, the same list says 'Split into 4 pieces by "Filter out group = 8"' under the first step. "OK, that one tells me. The first screen should have that too.")*

**The selection.**
"Now that line in the table: 'Selected: none, showing the previous selection', with a 'Previous selection' button. I think I had some nodes picked before this all went wrong. Click it." *(clicks 'Previous selection')*
"19 nodes selected, rows highlighted, inspector says 19 nodes, selection colors group 2 seven, group 4 seven. Table says 'Selected: 19 of 63 nodes'. Yeah, that's my list. OK. I wouldn't have known I'd lost it if the task hadn't said 'work you meant to keep'. It didn't look like anything was lost -- the rows were still there."

**Cross-checking the second screen.**
"Let me look at this other screen -- same thing, three steps, 28 nodes. Statistics here say edges '105 of 254', density 0.278. The first screen said 106 and 0.280. With one step off: 157 here, 158 there. Which is it? It's one edge, but that's exactly the kind of thing where my director asks why the slide says 105 and the spreadsheet says 106, and I don't have an answer."

"This one also has a little X to close the steps list and the Assistant says 'Off. Nothing is sent.' -- that I like. First screen didn't show me that."

**Done.**
"I think I'm where I wanted to be: largest component, group 8 out, the degree thing off, my 19 back. But I got there by undoing the good step, redoing the bad one, and then clicking a thing I thought was a label."

## Single Ease Question

**3 out of 7.** "The fix itself was one checkbox. Finding the checkbox took me two undos, two redos and a trip through the menu. The first thing anybody does is Ctrl+Z, and Ctrl+Z took out the wrong thing without saying so."

## Would he use it instead of his current tool?

"For this part, maybe. Gephi's filter panel has the same idea -- a stack of filters you tick -- but here I get a count on every step, and the step stays in the list when I turn it off, so I can put it back. That's better than Gephi. But undo just silently eating the step I wanted would have bitten me on a real deck. And the edge counts don't agree between the two screens, so right now I'd still check the numbers in NetworkX before anything went in a slide."

## Problems observed

1. **Undo removed the step he wanted, silently.** The first Ctrl+Z reversed "Filter out group 8", the step worth keeping. The only feedback was the chip count (28 to 41) and nodes reappearing; he inferred which step from node names. Severity 3.
2. **An undone step vanishes from the step list.** After the undo, the list shows two steps, so the good step cannot be re-ticked; getting it back means Redo, which first re-applies the wrong step. Severity 3.
3. **Linear undo and undo history cannot skip the middle step.** "Undo back to here" only goes further back. He spent two undos, two redos and a menu trip before trying the chip. Severity 2.
4. **The filter chip did not read as clickable.** He read "Filtered: 28 of 77 nodes, 3 steps" as a status label until he ran out of other ideas. Severity 2.
5. **Edge counts disagree between the two screens.** Three steps: 106 edges and density 0.280 on one screen, "105 of 254" and 0.278 on the other; with the middle step off: 158 against 157. Severity 3 for this user, who checks counts before he trusts anything.
6. **Four components after "Filter to Largest component", unexplained on the undo screen.** The filter chip screen explains it ("Split into 4 pieces by ..."), the undo screen does not. Severity 2.
7. **The lost selection did not look lost.** "Selected: none, showing the previous selection" kept the rows, so he did not realise 19 hand-picked nodes were deselected until the task wording prompted him. Severity 2.
8. **Unlabelled black nodes; legend ends in "5 more".** Some nodes are drawn black or dark grey with no legend entry. Severity 1.
