# Session: remember why these accounts were kept -- Analyst Alex

Participant: Analyst Alex, operations data analyst (logistics), Gephi and NetworkX user.
Task as given by the moderator: "Leave yourself what you would need next week to remember why you
kept these accounts."
Screens, in order: the notes panel (all nine states), then the inspector (the transfer-graph states:
7,495 accounts and transfers selected, and the pinned merchant account ACC-393859).

## Transcript (think-aloud)

**Notes panel, empty.**
"OK, first thing -- this is proteins. 'Human protein interactions', TP53, MAPK1. You said accounts.
I don't have any accounts here. I'll assume it's a sample and the idea is the same, but I'm going to
look for accounts in a minute."

"Left side says 'No notes yet. Add a note about the selection.' Fine, that's clear-ish -- I have to
select something first. 'Notes are saved in the project and travel in project files and findings
reports.' Saved in the project -- where is the project? On my laptop? On your server? 'Travel'
makes me a bit nervous, honestly. If I write 'kept these because they route through the Leeds
depot' and that goes out in a findings report to someone, I want to know that before I write it.
Top left still says 'Assistant: Off. Nothing is sent.' -- OK, that's the AI thing, not the notes.
I'd still like one line that says the project is a file on my machine."

"Where's the button to add a note? The panel doesn't have one. It says the selection. There's a
little '+' next to Notes on the right. And there's the toolbar at the bottom -- arrow, some squiggle,
a page icon, a lightning bolt, a square. I guess the page icon is 'note'? No label. In Gephi
there's no notes at all, so I don't have a habit here. I'd hover it and hope for a tooltip."

**Notes panel, with notes (hover, chosen).**
"This is what I'd want the list to look like, actually. 'About TP53 neighborhood, 33 proteins.
2h.' Then the text, then 'Cites Betweenness, full graph.' So the note knows what it's about and
which run it came from. That's good -- that's the part I always lose. I write 'these are the
risky ones' in a notebook cell and a week later I can't remember which run, which filter."

"When I click it, the popup shows 'QUOTES TP53 betweenness 0.114'. So it grabbed the number too.
Nice. If the number changes next month does it tell me? ... Out of date state: 'Earlier run, Use
current.' OK, so it flags it. Good. 'Detached, Restore set' on the DNA repair one -- I don't
know what detached means. The set got deleted? Changed? I'd guess the group isn't the same any
more. Would want it spelled out."

"The right side for that selection shows the set with its members, 'Members 33', and its own note.
So a note sticks to a group. That's what I need: the group of accounts plus why."

"Row menu: Edit note, Delete note. Delete with no 'are you sure'. Hmm. Is there undo? I'd assume
Ctrl+Z. Fine."

**Inspector, the accounts (state 11 and the pinned merchant).**
"There they are -- 'Transfers, March 2026', accounts. So say I've selected two hops around
ACC-393859: 7,495 selected, 1,863 nodes and 5,632 edges. I only want to keep the accounts, not the
transfers, but fine."

"Now, 'kept'. What does keeping mean here? There's 'Mule ring, fixed, 14' in Sets and paths on
the left. That's a kept group, I think. For my selection I'd want to make a set first, so it's
still there next week. Top right: a funnel and another icon next to 'Nodes and edges'. No labels.
The funnel is filter. The other one... might be 'make a group'? I'd hover. If I can't find it I'd
just add the note straight on the selection and hope it remembers the 1,863 accounts."

"Right column, 'Notes -- Add a note'. That's the obvious place. I click it."

"And... this is where the mock stops for me. I don't see what opens. I'd expect a text box, and
under it something showing what it's about -- '1,863 accounts' -- and ideally it grabs the
numbers like the TP53 one did, riskScore, degree. I can't tell if a note on a selection of 7,495
things is a note on a saved group or on a selection that's gone when I click away. That's the
whole question, really. If it's attached to a selection that disappears, then next week I have a
note that says 'kept these' and no 'these'."

"Also, 'Mule ring holds 13 of 1,863 nodes', but the set on the left says 14. So one of the mule
ring accounts isn't in my two-hop selection. That's actually useful -- but I had to do the
subtraction myself."

"Pinned merchant ACC-393859: 'Notes -- Add a note' again, same place. Consistent, good. Betweenness
'Not computed, under a minute, Run'. Under a minute -- I like that it tells me. Not part of this
task though."

**What I'd leave myself.**
"Make the group, name it something like 'ACC-393859 two hops, March', add a note: 'Kept because
they're within two hops of the biggest merchant and riskScore over 40. Check against April.' And
I want it to cite the date and the filter. From what I saw of the protein one, I think it would.
I'd then export -- 'Notes are in findings reports' -- and put a copy in my deck anyway, because I
don't trust anything to still be there next week until I've reopened it once."

## After the task

**Single Ease Question: 4 out of 7.**
"Middle. Seeing the notes list was easy and it's better than what I have, which is nothing. But
the actual doing -- where the note starts, whether it's glued to the accounts or to a selection
that'll vanish, what 'Detached' means -- I had to guess three times."

**Would I use this instead of my current tool?**
"For this bit, maybe. Right now 'why I kept these' lives in a Jupyter markdown cell and in my head,
and Gephi doesn't keep anything like it. A note that remembers the group and the run and the
number it quoted, and warns me when the number's out of date -- that's genuinely the thing I lose
every month. But I'd need to see it survive a close and reopen with my own data before I relied on
it, and I need to know the project file stays on my machine before I type anything about supplier
accounts into it."

## Problems observed

1. The prototype does not show what "Add a note" opens for an account selection; the participant
   could not tell whether the note would be attached to a kept group or to a passing selection.
   (Severity 3)
2. Keeping the accounts as a group relies on an unlabeled icon beside the funnel; the participant
   was not sure it meant "make a group" and would have skipped it. (Severity 3)
3. "Notes ... travel in project files and findings reports" raised a data-handling worry: nothing
   says where the project itself is saved. (Severity 2)
4. The Note tool in the bottom toolbar has no label; the participant guessed which icon it was.
   (Severity 2)
5. "Detached -- Restore set" was not understood. (Severity 2)
6. The notes panel demo uses protein data while the task was about accounts; the participant spent
   the first moments looking for accounts that were not there. (Severity 1, a study-material issue)
7. "Mule ring holds 13 of 1,863" against the set's 14 needed mental subtraction to see that one
   member is outside the selection. (Severity 1)
