# Get back to where you were, the Cmd+Z-restores version -- Jordan, marketing network analyst

**Participant:** Jordan, growth-marketing analyst who "does the network stuff" one or two days a
week. Gephi and NodeXL in the past, a colleague's networkx notebook now, a social-listening suite
the company already pays for. Company MacBook Pro, Chrome, played at laptop size (1440 by 900).
Mac keys: Cmd+Z, Cmd+Shift+Z.

**Task as given by the moderator:** "After your last few actions the numbers changed in a way you
did not expect. Get back to where you were."

**Version tested:** when a selection is cleared, a one-line notice above the toolbar says so and
offers "Bring it back". While that cleared selection is held, the first Cmd+Z brings it back
("Selection restored (18 nodes)") and leaves Redo as it was; the next Cmd+Z undoes the last filter
step.

**Starting point** (not told to the participant): the Les Miserables sample, 77 characters,
narrowed by three filter steps to 27. The middle step (degree at least 5) was the mistake; the
other two are work to keep. A stray click on empty canvas has just cleared a hand-built selection
of Valjean and the 17 characters beside him. The target end state is 47 of 77 nodes, 2 of 3 steps
(degree 5 off, group 8 still out), with the 18 characters selected again.

**Screens seen**, in order:
- `../../../shots/r6-jordan-getback-restore-01-start.png` -- the starting screen
- `../../../shots/r6-jordan-getback-restore-02-cmdz.png` -- after the first Cmd+Z
- `../../../shots/r6-jordan-getback-restore-03-cmdz2.png` -- after the second Cmd+Z
- `../../../shots/r6-jordan-getback-restore-04-cmdz3.png` -- after the third Cmd+Z
- `../../../shots/r6-jordan-getback-restore-05-steps.png` -- Show in steps, the filter steps list
- `../../../shots/r6-jordan-getback-restore-06-tick-group8.png` -- after ticking "Filter out group 8" back on
- `../../../shots/r6-jordan-getback-restore-07-close.png` -- list closed with its X; the end state

## Think-aloud

**The starting screen.** "OK, so. It's the Les Mis thing again, not my data, fine. Numbers.
Top left, '27 of 77 nodes, 3 steps'. Right side, 104 edges, one component, density 0.296. I don't
really care about density, nobody's ever asked me for density."

"And there's the black pill in the middle. 'Selection cleared, 18 nodes. Bring it back.' Oh, that's
annoying -- I had a bunch picked and I've lost them. I must have clicked on the white bit. I do
that in Gephi constantly."

"The table says 'Selected: none, showing the selection just cleared'. So it's still showing me the
rows? Weird, but OK. Valjean 17, full graph 36. Hmm. Seventeen. Which one's the real number? I'm
guessing the 36 is before I filtered."

"Anyway. The numbers are off, that's what I'm told. Something I did. Mac, so -- Cmd+Z. That's what I
do in literally everything."

*(She reads Bring it back but does not click it. She goes straight to the key.)*

**First Cmd+Z.** *(The pill reads "Selection restored (18 nodes)". The rows light up blue, the nodes
get dark rings, the right panel now says "18 nodes" with a colour breakdown by group.)*

"Oh -- nice, OK, it gave me my selection back. I didn't expect that, I thought undo was going to
undo a filter or something. 'Selection restored, 18 nodes.' Good, that's clear. Eighteen is what it
said I lost, so that matches. I like that it says the number both times, because I would check."

"But -- hang on, the numbers didn't move. Still 27 of 77, still three steps, still Valjean 17. So
that wasn't the numbers thing. That was just my selection. So there's something else."

"Cmd+Z again, I guess. It's undo. Just keep going back till it looks right."

**Second Cmd+Z.** *(The chip reads 40 of 77, 2 of 3 steps. A light-blue cluster appears at the
bottom -- Marius, Gavroche, Enjolras. The pill reads "Undone: Filter out group 8" with Show in
steps. The 18 are still selected. Valjean now 21.)*

"Whoa, OK, a whole new bunch appeared. 'Undone: Filter out group 8.' Right. So I'd filtered out
group 8 and now they're back. Was that the bad one? ... I don't know. Honestly I don't remember
doing that. Did I?"

"The good thing is it tells me what it undid, by name. In Gephi you hit, like, reset on the filter
and you just get everything back and you're on your own."

"And my eighteen are still selected. Good. I was half expecting it to throw them away again."

"Valjean is 21 now. So Valjean's degree changes when I filter. That's -- that is exactly the kind
of thing that gets me in trouble. If I put 17 in a slide and my manager opens it and sees 36,
which one's right? It's the dashboard-says-4,000, download-says-3,100 thing all over again. I
mean, I get it, it's 'filtered' in the header. But still."

"Still not sure this is 'where I was'. One more."

**Third Cmd+Z.** *(60 of 77, 1 of 3 steps. The pill reads "Undone: Filter out group 8 and Filter to
degree >= 5". Lots of small nodes appear, some grey ones out to the right.)*

"OK now that's a lot. Sixty. 'Filter out group 8 and Filter to degree >= 5.' Oh, it's stacking
them, that's actually helpful -- it's telling me the last two things I undid, not just the last
one. Otherwise I'd have forgotten the first."

"Degree at least five. Hmm. See, I wouldn't do that on purpose. That's how you throw away all the
small accounts, and the small accounts are the whole point -- the micro-creators sitting between
the groups are who I'm looking for. Cutting everyone under five is how you end up with a list
that's just the top twenty big accounts, which, great, I already have that from the suite."

"So that one's the mistake. I think. But now I've also undone the group 8 thing, and I don't know
if I wanted that back or not."

*(She hovers over Cmd+Shift+Z, then stops.)*

"If I redo now, it'll redo... which one? The degree one, probably, because that's the last thing it
undid? That's the one I *don't* want. I'm not going to guess. There's a 'Show in steps' button,
let me just look at the list."

**Show in steps.** *(A panel opens at top left, "Filter steps": "Filter to degree >= 2, took out 17,
60 left" ticked; "Filter to degree >= 5, off, takes nothing out" unticked; "Filter out group 8, off,
takes nothing out" unticked; "Add step".)*

"Oh, OK. So they're not gone, they're just unticked. That's -- yeah, that's good. That's the thing
I actually want from undo: don't delete my work, just switch it off. 'Took out 17, 60 left' -- I
like that, I can put that in a footnote. 'We dropped 17 accounts with fewer than two connections.'"

"Now, group 8. Is that the barricade people? There's a thing on the left, 'The barricade, rule,
13'. And the legend says group 8 is 13. Same number. So I think I'd made a group of those guys and
then taken them out of the picture on purpose. I'd put that back."

"Tick group 8."

**Ticks "Filter out group 8".** *(47 of 77, 2 of 3 steps. The light-blue cluster disappears. The row
now reads "took out 13, 47 left". The 18 are still selected; "Selected: 18 of 47 nodes".)*

"Forty-seven. 'Took out 13, 47 left.' OK. Degree five stays off. My eighteen are still selected.
Valjean's 27 now. Again, that number keeps moving, and that's going to be my problem in a meeting,
not the tool's, but still."

"Is this where I was? ... I mean. I think it's where I *should* be, which is not quite the same
thing. The tool can't know I didn't mean the degree filter. I figured that out from the list, not
from undo."

*(She presses Escape to close the list. In this mock that also leaves the participant view and
resets the page; the moderator restores her state and she closes the list with its X instead. See
the notes. Her reaction to the reset, before it was restored:)* "Wait, what? It's all gone. It's
back to 27 and the selection's gone again. Did Escape just undo everything? ... Oh, it's the mock.
OK. But if the real thing does that I'm out."

**Closes the list with the X.** *(47 of 77, 2 of 3 steps, 18 selected. No pill.)*

"OK. Forty-seven, two of three, eighteen selected. The chip says '2 of 3 steps' -- it'd be nice if
it said which one's off without me opening it, but fine."

"And the pill's gone now. So there's nothing on screen saying what I just did. I kind of liked the
pill. It was a receipt."

*(Off-topic, while looking at the table:)* "You know what, this is the thing with the listening
suite. You change one filter in Brandwatch, the whole dashboard reloads, and there's no undo at
all. You just rebuild the query. And half the time Instagram's not even in there any more. So,
honestly, a list of what I did with checkboxes -- that's more than I get from the thing we pay
for."

**Moderator asked afterwards: did you see "Bring it back" before you pressed Cmd+Z?** "Yeah, I read
it. I just didn't need it -- Cmd+Z did the same thing, right? That was the nice surprise. I pressed
the key I always press and got the thing the pill was talking about. If it had undone a filter
first I'd have been confused, because the pill said the last thing was the selection."

**Moderator asked: after the first Cmd+Z, did you know what the second one would do?** "No. I
assumed 'the last thing before that'. It turned out to be a filter, which, OK. But I pressed it
three times without really knowing what each one would do, and the third one took away something I
wanted. I only knew because it told me after. If it told me before -- like, the menu says 'Undo
filter out group 8' -- I'd maybe have looked. I didn't open the menu. I never open the menu."

## Single Ease Question

**5 out of 7.** "The selection coming back on Cmd+Z was easy, that was the best bit, I didn't have
to learn anything. Getting the filters right was harder, but that's partly because I didn't know
which step I'd messed up -- the tool can't tell me that. Undo overshot, the list fixed it. I lost
a point for the three-times-and-guess thing, and one for the Escape thing, even if it's just the
mockup."

## Would she use this instead of her current tool?

"For this bit? Over Gephi, yes -- Gephi's filter panel has no real undo, you just drag stuff off
and hope. Over the listening suite, it's not even a contest, the suite has none. But I wouldn't
switch tools because of undo. Undo is table stakes. I'd switch if it gets me the top forty into the
brief without Excel. What this does is it doesn't make me *afraid* to try a filter, which in
Gephi it does. That counts."

"The thing that'd still bite me is the degree number changing with the filter. Seventeen,
twenty-one, twenty-seven, thirty-six -- same guy. I need to know which one's going in the CSV
before I trust any of it."

## Moderator notes

- **End state reached.** 47 of 77, 2 of 3 steps (degree 5 off, group 8 still out), 18 selected --
  matches the target. Path: three Cmd+Z, then the steps list, then ticking group 8 back on.
- **First move was Cmd+Z with the notice read, and it did what she expected.** She read "Selection
  cleared (18 nodes) / Bring it back", pressed Cmd+Z instead of the button, got "Selection restored
  (18 nodes)", and called it "the nice surprise". The number repeated on the restore line was what
  made her trust it ("eighteen is what it said I lost").
- **The restore did not change the numbers, so she read it as "not the problem" and kept pressing.**
  The task talks about numbers; the first press fixed the selection but left 27 of 77, which sent
  her straight on to a second and third press. She overshot by one (undid the group 8 step she
  later wanted), then recovered from the steps list, not from Redo.
- **She avoided Redo because she could not predict which step it would bring back.** Correctly, as
  it happens: Redo there would have turned degree at least 5 back on first. She never opened the
  Edit menu, so its "Undo ..." label, which would have answered this in advance, did no work for
  her.
- **She identified the wrong step from her own domain, not from the tool.** "Degree at least 5"
  read to her as "throw away the micro-creators", which she would never do on purpose. She matched
  group 8 to the saved set "The barricade" by its count (13) to decide it was deliberate.
- **The stacked undo line was praised** ("Filter out group 8 and Filter to degree >= 5" -- "it's
  telling me the last two things I undid"), as were the kept-in-place unticked rows and the
  "took out N, M left" counts ("I can put that in a footnote").
- **Filtered versus full-graph degree worried her more than the undo did.** Valjean read 17, 21, 27
  and 36 over the session; she tied this to her standing complaint that screen and download
  numbers disagree, and named it as what would stop her trusting a CSV.
- **She missed the line once it was gone.** After the tick, nothing on screen recorded what had
  happened ("It was a receipt"). The chip's "2 of 3 steps" does not say which step is off.
- **Mock defect: Escape in the steps list also leaves the participant view.** In the undo screen,
  Escape closes the list without marking the key as handled, so the kit's own Escape handler also
  runs, exits the participant view and resets the page to its starting state. She read it as the
  product undoing all her work. The session continued from the same state with the list's X.
