# Session r1-s29 -- Tom (returning), task T21 prompt A (running club)

Build: frozen build named on the first line of criteria.md (946256efb876). All commands are run from
`design/ui/studio/tier2` with `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/`,
`T=../tool`, `S=rounds/round-1/sessions/r1-s29`.

## Step 0 -- start

`node $T/real.mjs --start $S setup:friends-ranked.txt` -> 01.png

Tom: "Right, the running club map is open, same as I left it. Orange dots, bigger and darker ones
matter more. 'PageRank' -- that's what the ranking was called. First I need to know who was first
before I touch anything. The dots don't have names on them. There's a 'Values' tab next to Style;
I'll try that, it sounds like numbers."

## Step 1

`node $T/real.mjs --step $S --click "Values"` -> 02.png

Tom: "Good, a Top 10 list with names. Farah is first, 0.06394, then Hana, then Milo. I'll write
that down: before, Farah. Now the new list. Last time I opened things from 'Open project or file'
on the start screen. Here there's the three-lines menu top left; that's usually where File is.
I'll try that."

## Step 2

`node $T/real.mjs --step $S --click-at 23,20` -> 03.png (button "Main menu")

Tom: "A menu. New project, Open project or file, Save, Export. Nothing says 'new version of the
list'. 'Open project or file...' is the one I know. I'm worried it will throw away the ranking,
but I always read the box before I press anything, so I'll try it and see what it asks."

## Step 3

`node $T/real.mjs --step $S --click "Open project or file..."` -> 04.png (a file chooser opened
straight away, no question first)

Tom: "It went straight to picking a file. Nothing asked whether I want to keep my work. I'll pick
friends-v2.csv from Downloads and read whatever comes next."

## Step 4

`node $T/real.mjs --step $S --upload friends-v2.csv` -> 05.png

Tom: "The heading says 'Add to friends'. I don't want to add, I want the new list instead of the
old one. And the numbers worry me: the file has 41 rows, the table says 41 rows, but the line at
the top says '20 nodes, 82 edges' and the bottom says 'the load makes 20 nodes and 82 edges'. 82 is
twice 41. If I press Load I think I get both lists on top of each other, old numbers and new
numbers. There is no button that says 'instead of'. I'm not pressing Load on something that says
'add'. Cancel, and look somewhere else -- there's a Data button on the left, maybe the list lives
there."

## Step 5

`node $T/real.mjs --step $S --click "Cancel"` -> 06.png

Tom: "Good, it's back as it was, Farah still on top. Nothing changed. Now the 'Data' button on the
left."

## Step 6

`node $T/real.mjs --step $S --click-at 28,130` -> 07.png (button "Data")

Tom: "There it is: 'friends.csv, 20 nodes, 41 edges' under 'Sources'. That's the old list. 41 --
that matches my spreadsheet. If anywhere lets me swap it, it's by clicking on that. I'll click the
name."

## Step 7

`node $T/real.mjs --step $S --click-at 143,134` -> 08.png (treeitem "friends.csv")

Tom: "It shows the old list's rows at the bottom, and on the right 'friends.csv, Source, Added:
Nodes 20, Edges 41'. That's just facts about the old file. No button to put a newer file in its
place. I'm not right-clicking around for hidden things. The other thing I do with files is drag
them onto the window, so I'll drag friends-v2.csv from Downloads onto it and read what it says."

## Step 8

`node $T/real.mjs --step $S --drop friends-v2.csv` -> 09.png (the tool reports the file was
dropped on the middle of the window)

Tom: "Nothing. The screen is exactly the same: still 'friends.csv, 20 nodes, 41 edges', same
dots, same numbers in the table at the bottom (Ava-Chloe still 5). No message, no box, nothing to
say it took the file or refused it. Did it do anything? I can't tell.

That's twice now. The menu one wanted to 'add' it and doubled the count to 82, and dragging it in
did nothing at all. I'm not going to guess any further on the lab's -- well, the club's -- map.
I'll ask her to just send me the new ranking."

`node $T/real.mjs --end $S`

## End of session (in character)

- **Did I finish?** No. I found who was first before -- Farah (0.06394), from the Top 10 list
  under Values. I never got the new list in place of the old one, so I don't know who is first
  now, and I did not redo the ranking.
- **Ease:** 2 out of 7. Finding the old ranking was easy once I clicked Values. Everything about
  the new file was hard.
- **What confused me:**
    - "Open project or file..." went straight to the file picker and then showed "Add to friends".
      I wanted the new list instead of the old one, not added to it. Nothing on that screen said
      "instead of", and nothing said whether my ranking would survive.
    - The counts did not match. The new file has 41 rows, the table said 41 rows, but the same
      screen said "20 nodes, 82 edges" and "the load makes 20 nodes and 82 edges". I took 82 to
      mean both lists on top of each other, so I cancelled.
    - The Data panel shows the old file under "Sources" with its counts, but clicking it only shows
      facts about it. I saw no way to put a newer file there.
    - Dragging the new file onto the window did nothing and said nothing. I couldn't tell whether
      it was refused or ignored.
    - There was a "Higher means: Not set / Closer / Farther / Capacity" question in the add screen.
      I don't know what my friend's numbers mean, and nobody asked me that last time.
