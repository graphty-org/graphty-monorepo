# Leaving a reason on kept accounts -- Marcus, criminal intelligence analyst

Participant: Marcus, 44, criminal intelligence analyst at a state fusion center, i2 Analyst's
Notebook user for ten years. Screens seen: the notes panel (nine states) and the inspector (set,
one node and large-selection states), as static renders.

Task as given by the moderator: "Leave yourself what you would need next week to remember why you
kept these accounts."

## Think-aloud

**Notes panel, empty state.** "Okay. First screen is... human protein interactions. That's not
my case. I'm going to pretend those dots are my accounts. Left rail says Graph, Assistant,
Results, Notes, and Notes is lit up. So I'm already in notes. The left panel is blank. Nothing.
No 'add a note', no button, no text. Is it loading? Is it broken? In i2 I'd just drop a text box
on the chart. Here I've got a white column and no idea what to do with it."

"Right side, there's a Notes row with a plus. That's the only plus on the screen that says Notes,
so I'll hit that. But hang on -- a note on what? I haven't picked any accounts. If I click that
plus with nothing selected, is the note about the whole chart? I'd guess yes."

"Down at the bottom there's a toolbar. Arrow, some squiggle, a page icon, a lightning bolt, a
square. No labels. The page icon might be a note. Might be a document. Might be export. I'm not
hovering over five icons to find out."

**Inspector, the set state.** "Here's something I recognise. On the left, 'Sets and paths' --
'DNA repair, rule, 30' and 'TP53 partners, fixed, 33'. On the other demo (the transfers one)
it's 'Mule ring, fixed, 14'. That's what I'd call 'the accounts I kept'. Fixed means I picked
them by hand, I'm guessing. Rule means the computer picked them by some filter. Okay, that's
actually useful for me -- I'd want to know which ones I chose and which ones a filter chose."

"I click the set. Right side shows it: rule, where it came from ('Same value as TP53'),
statistics, members by degree, appearance, 'Used by: nothing yet', export. I'm scrolling for
Notes... it's cut off at the bottom of this one. On the TP53 one it's there: 'Notes 1', plus
sign, and the note under it. So: pick the set, go to Notes, hit plus. That's findable, but only
because I found it on a different screen first."

"What I don't see is what happens when I hit the plus. There's no picture of the box I type in.
Can I say where this came from? That's the whole point for me. 'Kept because all 14 received
wires from ACC-393859 between March 3 and March 9, per Wells Fargo subpoena return, received
3/14, reliability B2.' I need a source, a date, and a grade. If this is a sticky note with free
text, I'll type all of it in by hand, and that's fine, I do that now in i2's card. But I want a
place for it."

**Notes panel, a note chosen.** "Okay, here's a note that exists. 'About TP53 neighborhood, 33
proteins, 2h.' The text. Then 'Cites Betweenness, full graph' and 'Quotes TP53 betweenness
0.114'. So the tool stamped which number I was looking at when I wrote it. Huh. That I like. When
the defense asks 'what was the score when you flagged him', it's written down, and I didn't type
it. But 'cites' to me means a source document. Betweenness isn't a source. The subpoena is the
source. That word's going to confuse people in my shop."

"The little '1' badges on the chart -- those are notes pinned to the nodes. Good. That's the
closest thing to an i2 annotation. Next week I open the chart and I see a flag on the group.
That's what I'd need."

"Clicking the note highlights the 33 on the chart and the right side shows the set. So I can
get from the note back to the accounts. Good. That's the round trip."

**Row menu.** "Three dots: Edit note, Delete note. Fine. No 'copy to report', no 'print'. I'd
want these in my case file, not just in the tool."

**Out of date state.** "'Earlier run -- Use current.' 'Detached -- Restore set.' So if the
numbers changed after I wrote the note, it tells me. I actually like that. But 'Use current'
scares me -- does it rewrite my note with the new number? I wrote the note about the old number
on purpose. I'd leave it alone and not click that. 'Detached' -- I think it means the group I
wrote about was deleted or changed. 'Restore set' sounds like it'll put it back. I'd click that
one."

**View only.** "Somebody shared it with me read-only and I can still see the notes. Good. My
sergeant can read why I kept them. But no plus. So he can't add 'agree, pull their records'. In
i2 he'd just type on my chart, which is its own problem, but still."

**Next week.** "Would I find this next week? I'd open the case -- assuming I can find the case,
I haven't seen how -- click Notes on the left, and my notes are there newest first, with a find
box. That works. I'd type 'mule' and find it. What I'd NOT get is who wrote it. There's no name
on the note. At a task force three of us touch the same chart."

## After the task

**Single Ease Question: 4 of 7.** "The looking-back part is good. The writing part I had to find
on a second screen, and I never saw the box I'd type in, so I don't know if it takes a source."

**Would I use this instead of i2?** "Not instead. Next to it, maybe, for the part i2 is bad at --
remembering why. The note that remembers the number it was written against, and warns me when
the number changed, is better than anything I've got. But I can't tell from this whether it'll
hold a record number, a date and a reliability grade in their own spots, or who wrote it. And
before any of that, I need to know where the file lives. If it's on your server, none of this
matters."

## Problems observed

1. Empty notes panel shows nothing at all -- no prompt, no Add button. Read as broken or loading.
   Severity 3.
2. The way to write a note is the Notes "+" in the right column, found only after selecting the
   set and scrolling; on the set view shown it was below the fold. Severity 3.
3. The note editor itself was never shown, so it is unknown whether a note can carry a source
   record, date and reliability grade. For this user that is the whole task. Severity 3.
4. "Cites" means a source document to an analyst; here it names an algorithm run. Wrong word for
   this audience. Severity 2.
5. "Use current" on an out-of-date note reads as "overwrite my note with the new number".
   Participant would avoid it. Severity 2.
6. Notes show no author. Shared task-force charts need one. Severity 2.
7. Toolbar icons have no labels; the note tool was not recognised. Severity 2.
8. Demo data is protein interactions; the participant had to imagine his accounts. Severity 1.

## What worked

- Notes badges on the chart, and clicking a note brings back exactly the accounts it is about.
- The note records which score it was written against, without typing it.
- The out-of-date and detached warnings -- nothing he uses today does this.
- "Fixed" versus "rule" sets tell hand-picked from filtered.
- A read-only viewer still sees the notes.
