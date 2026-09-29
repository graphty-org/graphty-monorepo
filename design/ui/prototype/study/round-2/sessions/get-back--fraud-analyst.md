# Session: getting back after a wrong step -- Sarah, fraud investigator

Participant: Sarah, a level-2 financial crime investigator (composite persona, study/personas/fraud-analyst.md).
Mode: first impression, not mandated.
Version: A (undo is silent while the filter chip is in view), left panel open.
Task as given by the moderator: "After your last few actions the numbers changed in a way you did not expect. Get back to where you were, without losing work you meant to keep."
Screens, in the order she reached them: Undo and ways back (participant view), then Filter chip and its steps. Each state was rendered and read as a picture; the page source was read only to learn what a click or key would do.

Hidden from her: the graph had been narrowed in three steps -- keep the largest connected piece, keep characters with at least 5 connections, leave out group 8. The middle step was the mistake. A stray click had also cleared a hand-picked selection of 19 characters. The good end state is 63 of 77 with the middle step off, group 8 still out, and the 19 selected again.

## Transcript

**Start: "Filtered: 28 of 77 nodes - 3 steps".**
"Les Miserables again. Fine, it's a test file. Top left: 28 of 77, three steps. So something's cutting this down to 28."
"Bottom: 'Selected: none, showing the previous selection.' So I had a selection and I lost it. Previous selection -- that's a button? I'll take it."
She clicks "Previous selection" in the table's line.

**19 selected again: "Selected: 19 of 28 nodes".**
"OK, 19 back, the inspector on the right says 19 nodes, colours by group. Good. That's one thing. That was easy, and it said what it was showing me. Credit."
"Now the numbers. You said the numbers changed after my last few things. Last thing I did is the thing I undo. Ctrl+Z."

**First Ctrl+Z: 41 of 77, 2 steps.**
"Forty-one. A bunch of blue ones came back at the bottom -- Marius, Gavroche, Enjolras. Nothing popped up saying what it undid. I just have to spot that 28 went to 41."
"Is that 'where I was'? I don't know. The numbers went up. You said they changed in a way I didn't expect, so maybe up is right? I've no idea what I had before. Let me go one more."

**Second Ctrl+Z: 76 of 77, 1 step.**
"Seventy-six. Now it's basically everything. Hairball. That's too far, I definitely didn't start from the whole file."
"Ctrl+Y." (She is on Windows; it redoes.)

**Ctrl+Y: back to 41, 2 steps.**
"Good, redo works, Ctrl+Y like Excel. Still no message, I'm reading the chip every time to know what happened."
"I need to see the steps. The chip thing, top left, it has a little filter icon. Click."

**Filter steps list open: "Filter to Largest component 76", "Filter to degree >= 5 41", "Add step".**
"Two steps. 'Largest component', whatever that is, 76. 'degree >= 5', 41. Degree -- links, I'm guessing. Five or more links."
"That's wrong for me anyway. If I drop everything with under five links I drop the mules. Mules are the small ones, two, three transfers each. That's the step I didn't want. Untick it."
She unticks "degree >= 5".

**76 of 77, "1 of 2 steps", the degree row greyed with "--".**
"Right. 76, degree step off, one of two. Hang on -- when I started it said three steps. Now it's two. Where's the third one?"
"Ctrl+Y." Nothing changes.
"Nothing. Redo's gone."

**Edit menu (the three-line icon) > Edit.**
"'Undo Turn off degree >= 5.' 'Redo' greyed out. 'Undo history'."

**Undo history.**
"'Turn off degree >= 5', 'Filter to degree >= 5', 'Filter to Largest component'. That's it. The third step isn't anywhere. I undid it with my first Ctrl+Z, and then when I unticked the box it just threw it away."
"So what was it? I have to work it out from the picture. The blue ones, group 8 -- they weren't there at the start, the legend at the start was 4, 3, 2, 5. And 'The barricade, rule, 13' on the left, and group 8 is 13 in the legend. So I'd taken the barricade lot out. I think. That's me reconstructing my own work from a legend."
She clicks "Add step". In the prototype nothing happens (not built in this mock).
"And I can't put it back. So I'm at 76 with my 19 selected, which is not where I was. Fail."
"In Excel I'd have the three filters sitting on the column headers and I'd just clear the one. Here the undo ate the good one first because it was the last one, and nothing told me."

**Moderator moves her to the second screen: Filter chip and its steps, three steps, list open.**
"Same thing, but it's open this time, and all three are there. 76, 41, 28. Under degree it says '3 dropped below degree 5 by "Filter out group = 8"'. What? The later step made people drop out of the earlier one? I read that three times. Doesn't matter, I know what I want."
She unticks "degree >= 5".

**63 of 77, "2 of 3 steps".**
"63, two of three, group 8 still out, the barricade lot aren't back. That's it. That's the state. Took one click because I opened the list FIRST instead of hitting Ctrl+Z."
"'Split into 4 pieces by "Filter out group = 8"' under Largest component now. Pieces? Components on the right says 4. So without the students the network falls apart into four bits. Fine, that's actually worth knowing, but say it in words I'd use."
"Edges, 157 of 254. The other screen, same state, I'm fairly sure it was 158." (The first screen's data for this state has 158 edges; this screen shows 157.) "If two screens of the same tool give me two numbers for the same thing, I don't trust either, and I'm not putting either in a narrative."

## After the task

Single Ease Question: 2 out of 7.

"The selection came back in one click, that's good. The steps list, once you open it, is good -- tick boxes, I get it, the number after each step, I get it. But the obvious thing, Ctrl+Z, is the trap. It undoes the last thing, which here was the good thing, doesn't say so, and then the moment I fix the real mistake it throws the good step away for ever. I only got it right on the second screen because I'd already been burned."

Would she use this instead of her current tool?
"Not for this. My current tool for 'which filter is wrong' is Excel, and Excel shows me every filter at once and I clear the one I want. If this had shown me the three steps with what each one took out the moment the numbers looked wrong, fine. As it is I lost a step and had to guess what it was from colours. On a case, that's the bit I'd have to explain to a reviewer: 'I think I'd excluded the barricade group.' Think isn't good enough."

## What happened (for the studio)

- Recovered the lost selection first, from the table's "Previous selection" line, unprompted. Clear success.
- First reach: Ctrl+Z. The first press reversed the good step (leave out group 8); she did not notice it was the good step, only that the count went 28 to 41. No message in version A.
- Pressed Ctrl+Z again (to 76), then Ctrl+Y back to 41. Redo worked and she liked that Ctrl+Y works.
- Opened the steps list only after undoing, so it showed two steps, not three. Identified the degree step as the mistake on her own, for a domain reason (small accounts are the mules).
- Unticking it cleared Redo. The good step was then gone from the list, from Redo and from Undo history. She noticed only because the chip had said "3 steps" at the start. "Add step" was not built, so she could not rebuild it. End state on the first screen: 76 of 77, 19 selected -- not the goal.
- On the second screen, with the list already open showing all three steps, she reached the goal state (63 of 77, 2 of 3 steps) in one click.
- Words that tripped her: "degree" (guessed "links"), "Largest component", "pieces", and the cross-step explanation lines under a step.
- Count mismatch between the two screens for the same state: 158 edges (first screen's data) vs 157 (second screen).
