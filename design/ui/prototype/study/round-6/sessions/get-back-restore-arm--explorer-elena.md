# Get back to where you were, the Ctrl+Z-restores version -- Explorer Elena

**Participant:** Elena, a product manager with no graph training. Lives in Google Sheets, Slides
and the company's analytics dashboard. Company 14-inch laptop, trackpad, Windows, Chrome. Says
"dots" and "lines", not "nodes" and "edges". Uses Ctrl+Z every day; has never deliberately used
Redo.

**Task as given by the moderator:** "After your last few actions the numbers changed in a way you
did not expect. Get back to where you were."

**Version tested:** when a selection is cleared, a one-line bar above the toolbar says "Selection
cleared (18 nodes)" with "Bring it back". In this version the first Ctrl+Z brings the selection
back (the bar then reads "Selection restored (18 nodes)") and leaves Redo as it was; the next
Ctrl+Z undoes the last filter step.

**Starting point** (not told to the participant): the Les Miserables sample, 77 characters,
narrowed by three filter steps to 27. The middle step (degree at least 5) was the mistake; the
other two are work to keep. A stray click on empty canvas has just cleared a hand-built selection
of Valjean and the 17 characters around him. The target end state is 47 of 77 nodes, 2 of 3 steps
(degree 5 off, group 8 still out), with the 18 characters selected again.

**Screens seen**, in order (study view, no design notes):
- `../../../shots/record/r6-elena-getback-restore-01-start.png` -- the starting screen
- `../../../shots/record/r6-elena-getback-restore-02-ctrlz1.png` -- after Ctrl+Z once
- `../../../shots/record/r6-elena-getback-restore-03-ctrlz2.png` -- after Ctrl+Z a second time
- `../../../shots/record/r6-elena-getback-restore-04-show-in-steps.png` -- after "Show in steps" on the bar
- `../../../shots/record/r6-elena-getback-restore-05-tick-g8.png` -- after ticking "Filter out group 8" again
- `../../../shots/record/r6-elena-getback-restore-06-hover-degree5.png` -- hovering the degree 5 row, not clicking

## Think-aloud

**The starting screen.** "OK. Numbers changed. Which numbers? ...There's numbers on the right,
edges 104, components 1, density 0.296. I don't know what density is, so I couldn't tell you if
that changed. And the table has numbers, Valjean 17, 36."

"There's a black thing in the middle. 'Selection cleared, 18 nodes. Bring it back.' Hm. So I had
18 of something picked and now I don't. That's probably the thing that changed. Did I click
something? I probably did, I do that on the trackpad."

*(She does not look at the button at the top left, "27 of 77 nodes, 3 steps". She reads the bar,
but not as a button: "Bring it back" is small grey-on-black text in a box and she takes it for
part of the sentence.)*

"Ctrl+Z. That's what I'd do in Sheets."

**Ctrl+Z, once.** *(Black rings come back on the dots around Valjean. The table rows turn light
blue and the line above the table says "Selected: 18 of 27 nodes". The right side changes to "18
nodes" with a coloured list, group 2 seven, group 4 seven, group 5 three, group 3 one. The bar now
reads "Selection restored (18 nodes)".)*

"Oh. Oh nice. OK, that's them. The circles are back. 'Selection restored.' Good, it even says so."

"That's what I'd want. I hit undo and it undid the last thing. Honestly that's the first time a
graph thing has done the normal thing."

"...But the numbers are the same. It still says 27 of 77 up there -- oh, there's a 27 up there, I
hadn't seen that. And the table still says Valjean 17. So the numbers didn't change back. The
selection isn't a number, I suppose."

"And the edges and density thing on the right is gone now. It's just '18 nodes'. Is that the
number that changed? It said 18 before too, on the bar."

*(She scrolls the table a little, then stops.)* "The task said my last few actions. Few. So maybe
it's one more back."

**Ctrl+Z, twice.** *(A light-blue bunch of dots appears at the bottom -- Marius, Gavroche, Enjolras.
The top left reads "40 of 77 nodes, 2 of 3 steps". Valjean's number in the table goes from 17 to
21. The bar reads "Undone: Filter out group 8" with "Show in steps".)*

"Whoa, OK. More dots. And my circles are still there -- good, it didn't eat them this time."

"'Undone: Filter out group 8.' So I filtered out group 8 at some point? I don't remember doing
that. The blue ones must be group 8." *(She checks the colour box at the bottom left: 8 is now at
the top, blue, 13.)* "Yeah, blue is 8, thirteen of them. And there's 'The barricade, 13' on the
left. Thirteen and thirteen. So the barricade is the blue ones? Maybe that's what I saved."

"Numbers changed. 27 to 40. Valjean 17 to 21. Is this 'where I was'? I genuinely don't know where
I was. I think it was smaller. I think it was 27, because that's what it said when I sat down."

"There's a button on the bar. 'Show in steps.' OK, let's see what the steps are."

**Show in steps.** *(A list opens at the top left under the filter button. "Filter to degree >= 2,
took out 17, 60 left", ticked. "Filter to degree >= 5, took out 20, 40 left, keeps only nodes with
at least 5 neighbors among the 60 it reads", ticked. "Filter out group 8, off, takes nothing out",
unticked and highlighted. The bar goes away.)*

"Oh, checkboxes. OK. This I understand. Three things, and the undo unticked the last one."

"'Took out 17, 60 left.' 'Took out 20, 40 left.' That's nice actually, it tells you what each one
did. 77, 60, 40. That's like a funnel. I could put that on a slide."

"'Degree greater than or equal to 5.' I don't know what degree is. 'Keeps only nodes with at least
5 neighbors among the 60 it reads.' ...Neighbours. So it's about how many lines a dot has? I think?
I didn't do that. Or I did, and I don't remember. Maybe it came like that."

"The undo turned off group 8. I didn't ask it to turn off group 8, I asked it to go back. So I'll
put it back how it was."

*(She ticks "Filter out group 8". The top left reads "27 of 77 nodes, 3 steps". The blue bunch goes.
The circles stay on her 18. The table reads "Selected: 18 of 27 nodes" and Valjean 17 again. Nothing
on the bar.)*

"27. There. That's what it said when I started. And my circles are still on."

**Hovering the middle row.** *(Her pointer rests on "Filter to degree >= 5, took out 20". A "..."
appears at the end of the row.)*

"This one took out the most. Twenty. The task said the numbers changed in a way I didn't expect...
twenty is a lot. But I don't know what it is, and if I untick it and it's wrong, I have to figure
out how to get back again. I'm not touching the one I don't understand."

"I'm going to say I'm back. It looks like it did when I sat down. I'd take a screenshot now."

*(Moderator asks: "Are the numbers where you expected them to be?")* "They're where they were. I
don't know where I expected them to be. Nobody told me what the numbers were before the thing I
didn't expect. I just know I got my selection back and the 27 back."

*(Moderator asks: "Did you see 'Bring it back' on the first screen?")* "The little box? I thought
it was part of the message. I didn't need it though, Ctrl+Z did it."

## Single Ease Question

**5 out of 7.** "Getting my circles back was easy -- one Ctrl+Z, and it told me it had done it.
That's the part I was scared of last time, and it just worked. After that I was guessing. The second
undo gave me more dots and a thing called group 8, and I had to find the checkboxes to put it back.
The checkboxes are fine. I just don't know if 'back' was the right place, because the one step I
think might be wrong uses a word I don't know."

## Would she use this instead of her current tool?

"I don't have a tool for this. It's Sheets, and Gephi once, which I didn't get past installing. So
yes, over nothing, it's in the browser. And this bit -- undo not eating my selection, the list
saying 'took out 20, 40 left' -- that's the first time I felt like I could poke around without
breaking it. I'd want someone to tell me what 'degree' is before I trust any number I'd show a
meeting, though."

## Moderator notes

Written for the design team, outside the think-aloud.

1. **The selection came back on her first move, with no hesitation.** She reached for Ctrl+Z, as in
   the earlier session on this task, and this time it did what she meant. "Selection restored (18
   nodes)" confirmed it in words she accepted. She called it "the first time a graph thing has done
   the normal thing". The arm removes the failure the earlier version had for her: there, two
   presses of Ctrl+Z took away filter steps and the selection stayed lost.
2. **She never read "Bring it back" as a button.** She took the small bordered text for part of the
   sentence. In this version that cost nothing, because the key did the same job; in a version where
   only the button restores, she would have missed it.
3. **The selection surviving later undos mattered to her.** After the second Ctrl+Z she checked for
   the rings first ("it didn't eat them this time") and was then willing to keep exploring. Her
   confidence for the rest of the task came from this.
4. **End state not reached: 27 of 77, three steps, selection back.** The target was 47 of 77 with the
   degree 5 step off. She put group 8 back because the undo had turned it off, not because she had
   judged it; she saw the degree 5 row as the likely culprit ("took out the most") and still left it
   on, because she does not know what degree means and was not sure she could get back from a wrong
   untick. Nothing on screen says which step changed the numbers "in a way you did not expect"; for
   her, "where I was" is the first screen she saw, which is already the mistaken state.
5. **"Numbers" was ambiguous to her.** Her first candidates were density (a word she does not know),
   the table's 17 and 36, and the "18 nodes" on the bar. She noticed the filter button's "27 of 77"
   only after the first Ctrl+Z. When the selection came back, the right panel swapped the statistics
   (edges, components, density) for the selection's summary, so the numbers she had first looked at
   disappeared from view at the moment she was trying to compare them.
6. **The steps list is what she understood,** again: checkboxes, "took out 20, 40 left", and the
   funnel 77, 60, 40 she said she could put on a slide. "Show in steps" on the bar was found and used
   this time, because it sat in the message she was already reading.
7. **"The barricade, 13" and group 8's 13 were matched by count alone.** She guessed the saved set was
   the blue group because both said 13. The guess happens to fit this sample, but it came from the
   number, not from anything that links the two.
8. **The undo line carries graph words she cannot map.** "Filter out group 8" was decoded from the
   legend; "degree >= 5" never was. The row's plain note ("keeps only nodes with at least 5 neighbors
   among the 60 it reads") got her as far as "how many lines a dot has", with a question mark.
