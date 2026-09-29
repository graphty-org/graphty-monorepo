# First click on the Notes panel -- Analyst Alex

Participant: Analyst Alex, data analyst at a logistics company (NetworkX plus Gephi today).
Screen: the Notes panel mock, starting from its first state (no notes yet, nothing selected), on
the sample "Human protein interactions" graph (300 proteins, 1,262 interactions).
Task as given by the moderator, nothing more: "Write down why you kept this group, for next week."

## Think-aloud

**Looking at the first screen.**
"OK. Protein stuff, not my data, fine. Left side says 'No notes yet. Add a note about the
selection.' There's an 'Add note' button. Right side is the graph summary -- 300 nodes, 1,262
edges, density, three components with two isolates. Good, that's the stuff I'd check anyway.

'Why you kept this group.' Which group? I don't see a group. I see a hairball with a few lumps --
there's a lump at the bottom around TP53, one on the right around RPS8. Nothing is highlighted.
The top-left says 'Full graph', so I'm not filtered to anything. 'Kept' makes me think I saved a
group earlier, but nothing on this screen shows me a list of saved anything."

**First click: "Add note" in the left panel.**
"It's the only button on the panel and the task is literally 'write something down', so I'm
pressing it. I know it says 'about the selection' and I haven't selected anything. I'm half
expecting it to complain."

What the prototype shows next: the note opens headed "About the graph Human protein
interactions", with the Note tool switched on in the bottom toolbar.

"Huh. So with nothing selected it quietly makes it about the whole graph. At least it told me
before I typed. If it hadn't said that line at the top, I'd have written my paragraph, closed it,
and next week found a note stuck on the whole network with no idea which group I meant. That's
exactly the Gephi thing where the work is there but the context isn't."

**Second try: clicking the lump on the canvas.**
"Fine, then I'll click on the group. The tool's on, so I click the TP53 cluster." (He clicks a
node in the bottom cluster.) "And now it's 'About' one protein. Not the group, one dot. I don't
want to draw a lasso around 33 dots by hand, and even if I did, is that the same 33 I 'kept'? I
wouldn't bet my name on it." Presses Esc.

**Hunting for the group.**
"If I kept a group, it's saved somewhere. Notes panel doesn't show it. The icons down the left
are Graph, Assistant, Results, Notes. 'Results' is algorithm output, I think. 'Graph' is my best
guess for where saved stuff lives." Clicks Graph. (In the sibling mock this rail tab lists
"Sets and paths".) "'Sets and paths.' OK, 'set' -- that's their word for group. I'd have called it
a group or a selection. There's 'TP53 neighborhood, fixed, 33'. That's probably it."

Clicks the set. The right panel changes to "TP53 neighborhood -- Fixed set", with members,
statistics, and a "Notes" section with a plus.

"Now the plus next to Notes. That's where I'd have expected to start." Clicks the plus. The note
is headed "About TP53 neighborhood, 33 proteins". "Right, that's the group. 33, created from
'Neighbors of TP53'. Good, it says where the group came from, which is half of the 'why'."

Types: "Kept because TP53 is the only DNA-repair protein in the top five by betweenness. These 33
are its direct partners -- the knockdown panel. Recheck after next data refresh." Presses Add.

"And it goes into the list, with the group name on it. That's what I wanted. Would it still be
tied to the same 33 when the data refreshes next month? 'Fixed set' sounds like yes. I'd want to
test that before I trusted it."

## After the task

**Single Ease Question: 3 of 7.**
"The writing part was easy. Finding the thing to write it about was not. I started on the Notes
screen and the Notes screen couldn't show me the group. The button said 'about the selection'
and let me press it with nothing selected. I got there on my third try, and only because I
guessed 'Graph' holds saved groups and that 'set' means group."

**Would I use this instead of what I do now?**
"For this bit, maybe. Right now my 'why' lives in a text cell in the notebook or a speaker note in
the deck, and it's never next to the picture. A note that sticks to the exact 33 proteins and
travels in the project file -- that's better than what I've got, if it survives a save and a
reload, which Gephi Lite didn't for me. But I'd need the first click to go right. If a colleague
opens this cold and makes a note about the whole graph because that's what the big button does,
the note's worthless next week."

## Problems seen

1. With nothing selected, "Add note" is the only button and its line says "about the selection";
   pressing it writes about the whole graph. The heading warns, but the first click still goes to
   the wrong place. Severity 3.
2. From the Notes panel there is no way to see or pick the saved groups the task refers to; they
   live under a different rail tab ("Graph"), which the participant found by guessing. Severity 3.
3. With the Note tool on, clicking inside a visual cluster targets one protein, not the group the
   eye sees. Severity 2.
4. "Set" is not the participant's word for a saved group; "Sets and paths" only made sense after a
   pause. Severity 2.
5. The "+" beside Notes in the right panel, the route that worked, only means "a note about this"
   once something is selected; on the first screen it sits under the graph summary and reads the
   same as the left panel's button. Severity 1.
