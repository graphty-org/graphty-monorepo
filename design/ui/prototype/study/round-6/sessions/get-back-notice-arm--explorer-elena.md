# Get back to where you were, notice version -- Explorer Elena

**Participant:** Elena, a product manager with no graph training. Lives in Google Sheets, Slides
and the company's analytics dashboard. Company 14-inch laptop, trackpad, Windows, Chrome. Says
"dots" and "lines", not "nodes" and "edges". Not sure anything can be undone until she has seen it
undone.

**Task as given by the moderator:** "After your last few actions the numbers changed in a way you
did not expect. Get back to where you were."

**Version under test:** when a selection is cleared, the one-line message above the toolbar says
so and offers "Bring it back". Ctrl+Z does not bring the selection back; it always undoes the last
filter step. This was her session with this version; the other version (Ctrl+Z brings the
selection back first) is a separate session.

**Clock:** long "curious afternoon" variant (no deadline, three or four dead ends tolerated).
Where the short variant would have ended is marked.

**Starting point:** the Les Miserables sample, 77 characters, narrowed by three filter steps to
27. She had selected Valjean and the 17 characters around him (black rings on the dots, blue rows
in the table, "18 nodes" at the top right). A click on empty canvas has just cleared that
selection. She was shown the selected screen for a few seconds before the task, as "what you were
looking at", and told only that she had been "narrowing it down" a moment ago.

**Screens seen** (renders, in order, all in the participant view):
- `../../../shots/r6-elena-getback-notice-01-start.png` -- the starting screen, selection just cleared
- `../../../shots/r6-elena-getback-notice-02-bring-back.png` -- after clicking "Bring it back"
- `../../../shots/r6-elena-getback-notice-03-undo1.png` -- after Ctrl+Z once
- `../../../shots/r6-elena-getback-notice-04-undo2.png` -- after Ctrl+Z a second time
- `../../../shots/r6-elena-getback-notice-05-steps.png` -- after clicking "Show in steps" on the message
- `../../../shots/r6-elena-getback-notice-06-tick-g8.png` -- after ticking "Filter out group 8" back on

For comparison only, not seen by her: `../../../shots/r6-elena-getback-notice-x-ctrlz-first.png`
is what Ctrl+Z pressed first, before "Bring it back", would have done: the filter step comes off,
the message changes to "Undone: Filter out group 8", and "Bring it back" is gone with the
selection.

## Think-aloud

**The starting screen.** "OK. The black circles are gone. The ones I picked."

*(Her eyes go to the middle of the screen. The dark strip right above the little toolbar is the
first thing she reads.)*

"'Selection cleared, 18 nodes.' Eighteen -- yeah, that was mine, it said 18 up in the corner.
'Bring it back.' ...Well, that's nice of it. Did I clear it? I must have tapped the trackpad."

*(She hovers over "Bring it back" for a second.)*

"It's not going to do something else, right? It says bring it back. OK."

*(She clicks it.)*

**After "Bring it back".** "There. Black circles. And the right side says 18 nodes again. OK,
good, that was painless."

"'Selection restored.' Yep."

*(She sits back. She does not look at the button at the top left, "27 of 77 nodes, 3 steps".)*

"So... am I done? That's where I was."

*(Moderator repeats the task wording: "the numbers changed in a way you did not expect.")*

"The numbers. Um. Which numbers." *(She looks at the table.)* "Valjean 17, 36... I don't know if
those changed. The eighteen is the same."

*(About 40 seconds of scanning the table and the right panel. She reads "degree, filtered" and
"full graph" as column headings and moves on.)*

"I was narrowing it down, you said. Like in our dashboard, when you click a filter and the list
gets shorter. If I did too many filters, I'd just... undo." *(She presses Ctrl+Z.)* "Control Z
works in everything, so."

**After Ctrl+Z once.** "Whoa, OK -- a bunch of blue ones showed up at the bottom. Marius,
Gavroche."

"'Undone: Filter out group 8.' Group 8. I don't -- is group 8 the blue ones? The legend says 8, 13.
So there are 13 of them back."

*(She reads the top-left button now, because it changed: "40 of 77 nodes, 2 of 3 steps".)*

"Oh, that's the number. 40 of 77. It was 27 before, I think. Yeah, it said 27 when I brought my
circles back."

"And my circles are still there. Good. I was worried Control Z would undo the bringing-back."

*(A wrong reading, stated with confidence:)* "So the blue ones are all connected to Valjean's
people -- that's why they came back with them. They're the next ring out."

*(They are not; they are the group the undo put back. The selection did not change.)*

"Hm. Did I want the blue ones gone? I think I did, actually. I remember hiding a group. But the
number went too low, so something else took out too many. Let me go back one more."

*(Ctrl+Z again.)*

**After Ctrl+Z twice.** "60! OK, that's a lot. And now there's a bunch of little ones everywhere,
grey ones, black ones."

"'Undone: Filter out group 8 and Filter to degree greater-than-or-equal 5.' ...Degree. OK, I didn't
type the word degree. Or I did, from a menu. I don't know what degree is."

"So now both of them are undone. But I wanted the group 8 one. Ugh. If I press Control-Shift-Z
does that redo, like in Docs? That would redo the wrong one, wouldn't it? The last one I undid is
group 8... no, wait. I don't know which order it goes."

*(She does not press Redo. She is not sure what it would do.)*

"There's a button, 'Show in steps'. Let me look at the steps."

*(Short clock: this is the first moment she has had to think about how undo works, not about her
data. She is still engaged; the message named what came off, and that was enough to keep her
going. She would not have ended here.)*

**After "Show in steps".** "Oh, it's a list. Like a checklist. 'Filter to degree >= 2', ticked,
'took out 17, 60 left'. 'Filter to degree >= 5', not ticked. 'Filter out group 8', not ticked."

"So these are my steps. And undo just unticked them. OK. That's actually... that's clear. I can
see them."

"The group 8 one, I want. The degree 5 one -- that says 'off, takes nothing out'. I don't know
what it took out when it was on. I'd like to know that before I decide."

*(She ticks "Filter out group 8".)*

**After ticking group 8 back on.** "47 of 77. 'Took out 13, 47 left.' The blue ones are gone again.
Good, I meant that."

"Those three grey dots on the right are just sitting there with no lines now. Did I break those?
They were connected to the blue ones before. ...Probably my fault, I hid their friends." *(She
leaves them.)*

"Do I tick the degree 5 one? I don't think so. That's the one that made it drop to 27. I didn't
mean to make it 27. I don't even know what degree is, so I definitely didn't mean to filter by
it."

"My circles are still on. 18 nodes. 47 of 77, two of three steps. I think this is where I was --
well, where I meant to be."

*(She closes the list with the x.)*

"OK. Done."

## After the task

**Single Ease Question (1 = very difficult, 7 = very easy): 5.**

"Bringing my circles back was a 7. That was the easy part -- it was right there in the middle and
it said what happened in words I know. The numbers part was harder. I didn't see the 27 up in
the corner until it changed. And I pressed undo twice when I only needed once, and then I wasn't
sure if redo would give me the wrong one. The checklist saved it. If I hadn't clicked 'Show in
steps' I'd probably still be at 60 thinking that's fine."

**Would you use this instead of what you use now?**

"For this kind of thing -- poking around a picture of who connects to who -- I don't have anything
now, so, sure. The part I liked is that it tells you what it undid, in words, and the steps are
just a checklist you can tick back on. Our dashboard doesn't even have undo; you just clear all
filters and start over. I'd still take a screenshot into Slides at the end. And I'd want it to say
what 'degree' means somewhere, because I'm filtering on it apparently."

## What happened, in brief

- **Outcome:** reached the intended end state -- 47 of 77, two of three steps (the degree step off,
  group 8 on), with the same 18 characters selected. Success with difficulty.
- **Selection:** came back first, from "Bring it back" on the message, within about 10 seconds. She
  read the message because it sat in the middle of the canvas, where she was already looking. She
  never tried Ctrl+Z for the selection, so the difference between the two versions (Ctrl+Z
  restoring the selection) did not come into play for her. Had she pressed Ctrl+Z first, this
  version would have taken the filter step off and emptied the "Bring it back" slot, and the
  selection would have been lost for good; she would not have known it had been recoverable.
- **Filter:** she did not see the "27 of 77 nodes, 3 steps" button until Ctrl+Z changed it. She
  undid twice (one too many), taking off the step she wanted to keep, then used "Show in steps" on
  the message to reach the steps list and ticked the good step back on. She did not press Redo,
  because she could not predict which step it would redo.
- **Misreading:** she took the blue group that the first undo put back as "the next ring out"
  from her selection, because it appeared right after she had restored the selection.
- **Vocabulary:** "degree" meant nothing to her; she decided which step was wrong by guessing that
  she would never have chosen a word she does not know. The guess was right by luck.
- **Wanted and missing:** what an unticked step would take out if she ticked it again ("off, takes
  nothing out" gave her nothing to decide with). Three grey dots left with no lines after she
  ticked group 8 on read to her as something she had broken.
