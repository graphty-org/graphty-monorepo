# Session: leave a reminder on a circle and on a traced chain (class-project student)

Participant: Dev, an undergraduate history student with one tutorial video of graph experience.

Task as given: "The Les Miserables network is open with the program's circles of characters shown
(example data, not your own). Leave one reminder on the whole circle around the bishop Myriel, and
one on the chain the program already traced between Valjean and Javert as a whole, not on any one
character. Then locate both reminders again."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t23--class-project-student/. Below, D stands for that folder, and STEPS
stands for the setup steps of render 12:
`--click "Community 3" --click "Add note" --type "Bishop Myriel circle - check for essay" --click "Save" --click "Graph" --click "Valjean to Javert" --click "Add note" --type "Valjean-Javert chain - mention in conclusion" --click "Save"`

## Think-aloud

**01 (start screen, shots/tasks/r8-t23/01.png).** OK, lots of stuff. The left list has Louvain
with Community 1 through 6, a "Shortest paths" group with "Valjean t..." and "Myriel to...", and a
"Notes 4 items" row. "Reminder" probably means a note. I can see Myriel on the picture, top right.
One of the community rows ("Comm... 10 nodes 2 notes") already has notes, but I don't know which
circle Myriel is in. The names are cut off. I'll start by clicking Myriel.

`timeout 120 node app-b/study.mjs --try D/02.png task:r8-t23 --click "Myriel"`

**02.** Hmm, that selected the "Myriel to Javert" path, not Myriel and not his circle. That's not
what I wanted. I'll look at the Notes button on the left to see how notes work here.

`timeout 120 node app-b/study.mjs --try D/03.png task:r8-t23 --click "Notes"`

**03.** A list of notes. The first one, "Myriel's household and the people he meets in Digne", is
tagged "Community 3", so Myriel's circle is Community 3. I needed someone else's note to learn
that. There's a plus at the top, but I'd rather start from the circle itself.

`timeout 120 node app-b/study.mjs --try D/04.png task:r8-t23 --click "Graph" --click "Comm..."`

**04.** "Nothing on screen is called Comm..." -- right, it's truncated. And Louvain is now
collapsed and the list looks different from before (Louvain 2 is gone?). PageRank got selected.
Weird. I'll click "Community 3" by name.

`timeout 120 node app-b/study.mjs --try D/05.png task:r8-t23 --click "Community 3"`

**05.** Community 3 is selected. The right side says "Hub: Myriel, 9 links inside", so this is the
bishop's circle. At the very bottom: "Notes, 2 notes -- Open in Notes". I'll try the three dots for
a menu.

`timeout 120 node app-b/study.mjs --try D/06.png task:r8-t23 --click "Community 3" --click "More"`

**06.** A big menu, with "Add note N" near the bottom.

`timeout 120 node app-b/study.mjs --try D/07.png task:r8-t23 --click "Community 3" --click "More" --click "Add note"`
`timeout 120 node app-b/study.mjs --try D/08.png task:r8-t23 --click "Community 3" --click "More" --click "Add note N"`

**07-08.** Clicking it didn't do anything; the menu just stayed open. While the menu was open the
right panel scrolled and showed an "Add note (N)" link under Notes. I'll skip the menu and use
that link.

`timeout 120 node app-b/study.mjs --try D/09.png task:r8-t23 --click "Community 3" --click "Add note"`

**09.** It switched me to Notes with a box at the top: "Note on: Community 3", "Write a note",
Save. Good, that's clearly the whole circle.

`timeout 120 node app-b/study.mjs --try D/10.png task:r8-t23 --click "Community 3" --click "Add note" --type "Bishop Myriel circle - check for essay" --click "Save"`

**10.** Saved. It's at the top with a green "Community 3" tag, "8 notes in this graph", and the
right panel says 3 notes. One down.

Now the chain. Under Shortest paths there's a "Valjean t..." row, which is probably Valjean to
Javert.

`timeout 120 node app-b/study.mjs --try D/11.png task:r8-t23 STEPS(first four) --click "Graph" --click "Valjean to Javert"`

**11.** Right panel: "Valjean to Javert, Path from Shortest paths", 2 nodes, 1 edge, 17 shared
chapters. Under Notes it says "Note on: Path Valjean to Javert" and "No notes. Add note". That's
the whole chain, not one character. 

`timeout 120 node app-b/study.mjs --try D/12.png task:r8-t23 STEPS`

**12.** Saved, "9 notes in this graph". Both my notes are at the top: "Valjean-Javert chain" tagged
"Valjean to Javert", and "Bishop Myriel circle" tagged "Community 3". Now let me pretend I came back
later and look for them from the Graph list.

`timeout 120 node app-b/study.mjs --try D/13.png task:r8-t23 STEPS --click "Graph"`

**13.** The "Valjean ..." row says "1 note". Good. But Louvain is collapsed again and says
"1 note" with a little dotted circle "3" next to it. Is that my circle's notes? I can't tell. Also
the "Notes 4 items" row at the top still says 4, but the Notes page says 9. Which is it?

`timeout 120 node app-b/study.mjs --try D/14.png task:r8-t23 STEPS --click "Graph" --hover "3"`

**14.** Resting on the "3" shows nothing. I'll open Louvain.

`timeout 120 node app-b/study.mjs --try D/15.png task:r8-t23 STEPS --click "Graph" --click "Louvain" --click "Community 3"`

**15.** Oops: that opened a table at the bottom (there is also a "Louvain" tab down there). Anyway,
Louvain opened, and with Community 3 selected the right panel says "3 notes -- Open in Notes".
Strangely, the Community 3 row in the list no longer shows a notes count, though at the start
"Comm..." said "2 notes".

`timeout 120 node app-b/study.mjs --try D/16.png task:r8-t23 STEPS --click "Graph" --click "Louvain" --click "Community 3" --click "Open in Notes"`

**16.** It took me to Notes, but showed all 9 notes, not just Community 3's 3. Mine are at the top,
so I found them, but only because they're the newest. A week from now they'd be buried.

`timeout 120 node app-b/study.mjs --try D/17.png task:r8-t23 STEPS --click "Valjean to Javert"`

**17.** Clicking the "Valjean to Javert" tag highlights my note and shows the path on the right
again. The picture itself doesn't light up the two people, though. OK, I found both. Done.

## Outcome

- Succeeded? Yes, I think so. One note is on "Community 3" (the circle whose hub is Myriel) and one
  is on "Path Valjean to Javert". I found both again, in the Notes list and from each row's "1 note"
  or "3 notes" count.
- Single Ease Question: 5 of 7. Once I found "Add note" it was easy, and the "Note on: ..." line
  told me exactly what I was writing on. Getting there was the hard part: clicking Myriel picked a
  path, the community names were cut off, the menu's Add note did nothing, and the list kept
  collapsing and changing.
- Would I use this instead of what I have? Probably yes for this part. Gephi has nowhere to write
  notes at all, so I keep them in a Word doc and lose track of which group "group 4" was. Here the
  note stays attached to the circle. But I'd want "Open in Notes" to show only that circle's notes,
  and I'd want to know why the top Notes row says 4 when there are 9.

## Problems noticed (participant's words)

1. Clicking Myriel on the picture selected the "Myriel to Javert" path, not Myriel or his circle.
2. I couldn't tell which community was Myriel's from the list; I learned it from someone else's
   note. The names are cut off ("Comm...", "Community...").
3. "Add note" in the three-dots menu did nothing when clicked; the menu stayed open.
4. Going back to Graph collapsed Louvain and changed the selection (PageRank got selected), and once
   Louvain 2 disappeared from the list.
5. The "Notes 4 items" row never changed after I added 2 notes, while the Notes page said 9.
6. Louvain's "1 note" plus dotted "3" has no explanation when I rest the pointer on it.
7. The Community 3 row stopped showing its notes count after I added one.
8. "Open in Notes" from Community 3 showed every note, not just that circle's.
9. Clicking a note's tag doesn't show the chain on the picture.
