# Fix the wrong middle step -- Explorer Elena

**Participant:** Explorer Elena, a product manager who has never used a graph tool for real
(study/personas/explorer-elena.md). Curious-afternoon clock: no deadline, three or four dead ends
tolerated.

**Task, as read to her:** "You narrowed the graph in three steps and the middle one was wrong. Fix
it without losing the third."

**Screens she saw, in order:** the undo screen as the task opens it (shots/tasks/fix-wrong-middle-step/01-undo.png),
then the filter chip with its steps open (02-filter-chip.png), the steps list with one step off
(shots/record/r6-elena-fixmid-chip-off.png), the step editor (shots/record/r6-elena-fixmid-chip-edit.png), and
the steps list with a row menu open and after an Undo (shots/record/r6-elena-fixmid-steps-full.png, a render
of screens/filter-steps-and-undo.html). The "three ways back" page (screens/filter-step-recovery.html)
uses a different set of steps (Valjean, largest component, Javert), so it was not shown to her for
this task.

Lines in quotes are hers. Lines in square brackets are what she did or what the screen did.

## Transcript

[The undo screen. A graph of coloured dots, a table underneath, and a dark box above the toolbar:
"Selection cleared (18 nodes)  Bring it back".]

"OK. So this is after I did my three things. It says 27 of 77 nodes, 3 steps, up in the corner. I
guess 'nodes' is the dots."

"And this black thing says selection cleared, bring it back. I didn't clear anything. Or... did I?
Is 'bring it back' going to bring back the step I messed up? I don't want that, I want the step
gone. I'm not pressing that."

[She reaches for Ctrl+Z out of habit, then stops.]

"In Sheets I'd just hit undo. But undo goes backwards, right? So the first undo takes away the last
thing I did, which is the third one, the one I want to keep. So... no. I'd have to undo two and then
redo one and I never trust redo."

[She presses Ctrl+Z once anyway, "just to see". The facilitator shows the result: "Selection
restored (18 nodes)", 18 dots get dark outlines and rows in the table turn blue.]

"Oh. OK, that brought back... some dots got circled. That's not what I meant. Fine, whatever, it
didn't break anything. I'm not pressing it again, the next one is probably my third step."

[She tries the canvas first: clicks a big orange dot near the middle.]

"Is there a way to see what I did? Like a history? ... Hmm. The dot just gets picked."

[She looks back at the top left. The chip reads "27 of 77 nodes - 3 steps" with a little arrow.]

"3 steps. That's my three things. It has an arrow, so it opens."

[Clicks the chip. The Filter steps box opens: three rows with ticks.]

"OK, there they are. Filter to degree at least 2, took out 17, 60 left. Filter to degree at least
5, took out 20, 40 left. Filter out group 8, took out 13, 27 left."

"I don't know what 'degree' is. The grey line under the middle one says 'keeps only nodes with at
least 5 neighbors among the 60 it reads'. So degree is... how many friends a dot has? I'll go with
that."

"So the middle one is the wrong one. The one that took out 20. That's a lot, that's probably why
it's wrong."

"There's a tick next to each. I bet unticking turns it off without deleting it. Let's try that
first, that seems safe."

[Unticks the middle row.]

"Oh, it didn't go away, good. It says 'off, takes nothing out'. The top thing now says 47 of 77, 2
of 3 steps. And the third one is still ticked, 'took out 13, 47 left'. So my third one still works."

[The picture fills in: more dots appear, including three grey dots far off to the right and a
couple of black ones at the top.]

"Oh, so the grey ones over there are the ones that are switched off, I guess, the ones the middle
step used to throw out. And the black ones... are those errors? Something that didn't load?"

[Neither is true: grey and black are group colours past the four the legend lists; the legend
card ends in "3 more", which she did not open. She did not check.]

"On the right it says 'up from 1 when Filter to degree >= 5 was turned off'. OK, it's telling me what
my change did. That's nice, actually. I'm not reading all of that, but nice."

"But the task says fix it, not turn it off. Maybe it should have been a smaller number, not 5. Like
3. Can I just change the 5?"

[Clicks on the text "degree >= 5" in the middle row. The row gets a light highlight. Nothing else
happens.]

"Hm. It just went grey-ish. In Sheets I'd double-click the cell."

[Before trying that, she moves the pointer along the row and notices three dots appear at the right
end, only while the pointer is on the row.]

"Oh, there's a little dots menu. It wasn't there before. Or I didn't see it."

[Clicks it. The menu: Edit rule..., Turn off step, Move up, Move down, Create rule set, Add note...,
Delete.]

"Edit rule. That's it. I'm not touching Delete. And 'rule set', no idea."

[Picks Edit rule. The box turns into an editor: "Step 2: Filter to degree >= 5", Outcome with
"Filter to" and "Filter out", then Rule with "degree", ">=", "5", then Scope "After step 1: 60
characters", Result "took out 20 - 40 left".]

"OK so this is the middle one. There's the 5. I'll make it 3."

[Changes 5 to 3. The Result line changes as she types; so does the count at the top.]

"The number at the bottom changed right away, took out... fewer. OK. Is there a Save? ... There's
no Save. There's 'Add note' and a back arrow. Did it keep my 3?"

"I don't love that there's no button. Our dashboard has an Apply."

"Wait, why does it say 'characters' here and 'nodes' on the other screen? Oh, because it's Les
Miserables and they're people. OK. Characters I understand better, honestly."

[Clicks the back arrow, "< Filter steps".]

"OK, back to the list. The middle one says degree at least 3 now. And the bottom one, group 8, is
still ticked and has its own number. So I fixed the middle one and didn't lose the third. Done?"

"Oh, I unticked the middle one before. Is it still off?"

[The facilitator confirms: the row she edited still shows an empty box.]

"So I have to tick it back on, or it's changed but not doing anything. That's confusing, I'd have
missed that in real life."

[Ticks it back on. The count moves.]

"OK. Now it's on and it's 3. Done. I think."

[Facilitator asks: what would you do if you'd pressed undo twice by accident? She is shown the
"Undone: Filter out group 8 and Filter to degree >= 5  Show in steps" line and the list with both
steps unticked.]

"Oh, so undo doesn't throw them away, it just unticks them? Then I could have just undone and
ticked the third one back. I wouldn't have guessed that. I'd have been too scared to press it twice.
But it's good that it says which ones it undid, by name."

"The legend doesn't have group 8. Did I lose group 8 completely? ... Oh, right, the third step
throws it out. That's what I asked for. OK."

## Single Ease Question

**5 of 7.**

"Finding the steps was easy once I saw '3 steps'. Turning one off was easy. Changing the number was
harder, the menu only shows up when you're on the row, and then there's no Save so I wasn't sure it
kept it. And I didn't realise I'd left it switched off after editing."

## Would she use this instead of her current tool?

"For this, yes, probably. Our dashboard has filters, but if you remove one in the middle you start
over. Here I could switch one off and the others kept working, and it told me the numbers after each
one. I still don't know what 'degree' is and I wouldn't put 'degree >= 3' on a slide. But the
steps thing I'd use."

## What the observer noticed (not said by her)

- She found the steps through the chip on the first look at the top left, after trying the canvas
  and one reflexive Ctrl+Z. The word "steps" on the chip matched the task's word.
- Her first fix was to untick the step. It worked, and the third step's count updated, which she read.
- The row's "..." control is hidden until the pointer is over the row. She found it by luck while
  moving the pointer; single-clicking the rule text did nothing she could see. She did not try
  double-click, though she named it as her Sheets habit.
- The editor has no Save or Done. She looked for one and was unsure her change was kept until she
  went back to the list.
- She edited a step she had already unticked and did not notice it was still off until asked. The
  editor does not say "this step is off" anywhere she looked.
- The toast on the opening screen, "Selection cleared (18 nodes)  Bring it back", read to her as
  possibly bringing back the wrong filter step. She avoided it.
- She did not know undo unticks steps rather than removing them; had she known, undo would have
  been a path. She would not have pressed it twice on her own.
- Wrong reading of the picture: she took the grey and black dots that appeared after turning the
  step off to be "switched off" dots and "errors". They are group colours beyond the four listed in
  the legend.
- The counts under each step ("took out 20, 40 left") were what told her which step was doing the
  most, and she used them to decide the middle step was "probably why it's wrong".
- The two screens she saw show the same step list two ways: one with "took out N - M left" under
  each row, the other with a single number at the right. One says "nodes", the other "characters".
