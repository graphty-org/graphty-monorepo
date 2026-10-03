# Session: leave two notes (Valjean, and the Javert--Valjean tie) -- the recipe recipient (Tom)

Task as given: "The Les Miserables network is open (example data, not your own). Leave yourself
two reminders for later: one on Valjean (why he matters to your reading) and one on the tie
between Javert and Valjean. Then check that each reminder sits with the right thing and say when
it was written."

Start screen: shots/tasks/r8-t22/01.png. Renders are in
tmp/round-8-sessions/r8-t22--recipe-recipient/. Every command was run from design/ui/prototype.
`R` below is short for that render folder's absolute path.

## Steps, thinking aloud

1. Start screen. The picture is there and it's orange. On the far left there's a "Notes" icon,
   so I'll go there for reminders.
   `timeout 120 node app-b/study.mjs --try R/01.png task:r8-t22 --click "Notes"`
   -> A list of seven notes somebody else wrote, each with little tags and a date. A plus sign
   at the top next to "Notes".

2. Plus means new. I guessed it was called "New note".
   `... --try R/02.png task:r8-t22 --click "Notes" --click "New note"`
   -> nothing on screen is called "New note".

3. Rested the pointer on the plus to see its name. I tried "Add note", "Add a note", "Add".
   `... --try R/03.png task:r8-t22 --click "Notes" --hover "Add note"` (and the other two)
   -> tooltip "Add note N". "Add a note" matched nothing.

4. Clicked Add note.
   `... --try R/04.png task:r8-t22 --click "Notes" --click "Add note"`
   -> A box opened: "Note on: PageRank". I didn't choose PageRank. That's the coloring. If I
   hadn't read that line, my Valjean note would have gone on the colors. The line saying notes
   are saved without a name and to add my name in Settings I skipped.

5. Started over. Clicked Valjean on the picture first.
   `... --try R/05.png task:r8-t22 --click "Valjean"`
   -> Valjean has a ring around him, the right side says "Valjean, Node", "Valjean, 36
   connections" under the picture, and a row of icons I couldn't read. The last one looks like
   a speech bubble. I didn't try it.

6. Valjean picked, then Notes, then Add note.
   `... --try R/06.png task:r8-t22 --click "Valjean" --click "Notes" --click "Add note"`
   -> "Note on: Valjean". Good.

7. Typed "Hub", Ctrl+Enter (it shows that next to Save).
   `... --try R/07.png ... --click "Add note" --click "Write a note" --key H --key u --key b --key Control+Enter`
   -> "nothing on screen is called Write a note", but the box already had the cursor, so the
   typing went in anyway. Saved: "Hub", Valjean tag, Oct 2, 2026, 19:28, "8 notes in this
   graph".

8. Redid it with a real reason: "Hub that ties every group together".
   `... --try R/08.png task:r8-t22 --click "Valjean" --click "Notes" --click "Add note" --key H --key u ... (one --key per letter, Space for spaces) --key Control+Enter`
   -> Saved at the top with the Valjean tag and today's date.

9. Now the tie. On the picture Javert sits right on top of Valjean, so I can't hit the line
   between them. There's an "Edges" tab along the bottom.
   `... --try R/09.png (same as 8) --click "Edges"`
   -> A table of ties. "Javert | Valjean | (note icon 1) | 17". Somebody already has a note on it.

10. Clicked "Javert" to get that row.
    `... --try R/10.png (same) --click "Edges" --click "Javert"`
    -> Wrong. It picked Javert by himself ("Javert, Node") and the table flipped back to the
    people. I think I hit a Javert tag in the notes list instead of the row. First miss.

11. Tried the row as it reads on screen.
    `... --try R/11.png (same) --click "Edges" --click "Javert Valjean 1 17"`
    -> nothing on screen is called that. Second miss. Normally I'd stop here and ask the postdoc.

12. Last try. Somebody else's note at the bottom has a "Javert -- Valjean" tag with a line icon.
    I clicked that.
    `... --try R/12.png (same as 8) --click "Javert -- Valjean"`
    -> Right side: "Javert -- Valjean, Edge", ends Javert and Valjean, value 17, "1 note".
    That's the tie. A small icon row came up under the picture again.

13. Add note again.
    `... --try R/13.png (same) --click "Javert -- Valjean" --click "Add note"`
    -> "Note on: Javert -- Valjean". Good.

14. Typed "The chase is the spine of the book", Ctrl+Enter.
    `... --try R/14.png (same) --click "Javert -- Valjean" --click "Add note" --key T --key h ... --key Control+Enter`
    -> Top of the list: "The chase is the spine of the book", tag "Javert -- Valjean",
    "Oct 2, 2026, 19:31". Under it: "Hub that ties every group together", tag "Valjean",
    "Oct 2, 2026, 19:31". "9 notes in this graph". The tie's panel on the right says "2 notes".

15. Wanted to see Valjean's own panel say he has my note. Clicked "Valjean", then "Data".
    `... --try R/15.png (same as 14) --click "Valjean" --click "Data"`
    -> Took me to a page about the file (sources, filters, attributes). Valjean wasn't picked
    any more. Gave up on that check; the notes list already shows the tags.

## Answer

- Valjean note: "Hub that ties every group together", tagged Valjean, written Oct 2, 2026, 19:31.
- Tie note: "The chase is the spine of the book", tagged Javert -- Valjean (the right side
  calls it an Edge), written Oct 2, 2026, 19:31.
- The Valjean note first showed 19:28. When I looked again it said 19:29, then 19:30, then
  19:31, even though I hadn't touched it. Is that when I wrote it or when I last looked? I'd
  believe the list's time less now.
  (Moderator note: every run replays every step from the start screen, so each replay wrote the
  note again at that minute. The moving time is a side effect of the replay, not something the
  product showed. Do not count it as a finding.)

## Debrief

- Did I succeed? I think so. Both notes say what they're on and show a date. I did not manage to
  see Valjean's own details list my note; I only saw it from the notes list.
- Single Ease Question: 4 of 7. The Valjean one was fine once I knew to click him first. The
  first "Add note" quietly put it on PageRank, which I'd never pick. The tie was the hard part:
  I couldn't hit the line on the picture and couldn't pick the row in the Edges table. I only
  got it because somebody else's note had a tag for that tie. With a tie nobody had noted, I'd
  have been stuck.
- Would I use this instead of what I use now? For reminders, not really. Today I put a comment in
  the slide or the spreadsheet and that's where the PI and the postdoc look. That the notes stay
  with the person or tie is good. Then again, "Notes are saved without a name" -- if the
  postdoc's file goes around, will anyone know which notes are mine?
  She could have just sent me the PNG and I'd have written on it.
