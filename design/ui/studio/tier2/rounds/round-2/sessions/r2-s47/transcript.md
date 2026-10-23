# Session r2-s47 -- Grace (returning), task T19, prompt B (Florentine families)

Build: 8f0d5a6f7791 (frozen build `.study-builds/tier2-r2d4-8f0d5a6f7/`). Setup: `florentine-ranked.txt`.

Task as read: "You have used this program a few times. The ready-made network of Florentine
marriages is already open. Leave yourself two reminders in the program: one about the Medici,
'Check the 1434 return from exile', and one about the network as a whole, 'Marriages only;
business ties are a separate list'. Make sure both will still be there the next time you come back
to this, then show us where you would read them."

Commands are run from `design/ui/studio/tier2` with `S=rounds/round-2/sessions/r2-s47`.

## Step 0 -- start

`REAL_DIST=.../tier2-r2d4-8f0d5a6f7/ ../tool/with-browser.sh node ../tool/real.mjs --start $S setup:florentine-ranked.txt` -> 01.png

## Step 1

Grace: "Okay, the families map is up, already sized and colored by the ranking. Left side has Graph
and Data like before -- and there is a third one, 'Notes', I don't remember that. That sounds like
exactly where reminders would go. But the Medici one should be on the Medici, so first let me click
the big dark dot in the middle; I'd bet that's them. No names on the dots, so I'm guessing."

`--step $S --click-at 707,395`

Result 02.png: the right side now says "Medici", Node, with Values open: id, name, Degree 6, and
PageRank 0.1458, #1 of 15. Good, it is the Medici.

## Step 2

Grace: "Got the Medici. Right side shows their numbers but there's no box to write anything in.
There's a little three-dots menu up top next to their name -- that's usually where the extra stuff
lives. Let me look in there."

`--step $S --click-at 1419,73`

Result 03.png: a menu opened: Neighborhood, Path between..., Frame selection, Add note.

## Step 3

Grace: "There it is -- 'Add note'. That's a reminder. Clicking it."

`--step $S --click "Add note"`

Result 04.png: the left side switched to "Notes", with a box labeled "About Medici", and Cancel /
Save note under it. The box looks ready to type in (blue outline).

## Step 4

Grace: "Nice, it already knows it's about the Medici. Typing the reminder."

`--step $S --type "Check the 1434 return from exile"`

Result 05.png: the text is in the box under "About Medici".

## Step 5

Grace: "Text is in. Clicking 'Save note'."

`--step $S --click "Save note"`

Result 06.png: Notes list now shows "Check the 1434 return from exile" with a "Medici" tag, the date
Oct 9, 8:55 PM and a trash can. The right side under Medici now says "Node  1 note".

## Step 6

Grace: "One down, and it even shows '1 note' on the Medici panel. Now the one for the whole map.
There's a plus at the top of Notes. But the Medici are still picked -- I don't want the second one
stuck to them. Let me hover the plus first and see what it says."

`--step $S --hover-at 276,60`

Result 07.png: tooltip "Add note N". It doesn't say whether it will be about the Medici or the map.

## Step 7

Grace: "Doesn't tell me what it'll be attached to. Safest thing: click on empty white space so
nothing is picked, then press the plus."

`--step $S --click-at 1050,750`

Result 08.png: nothing picked; the right side shows "Graph", 15 nodes, 20 edges. 15 families --
matches what I'd expect.

## Step 8

Grace: "Good, now the right side is about the whole graph. Now the plus in Notes."

`--step $S --click "Add note"`

Result 09.png: a new box "About Graph", with the Medici reminder listed below it.

## Step 9

Grace: "'About Graph' -- that's the whole map. Typing it and saving in one go."

`--step $S --type "Marriages only; business ties are a separate list" --click "Save note"`

Result 10.png: two reminders in the Notes list: "Marriages only; business ties are a separate list"
tagged "Graph" (Oct 9, 8:56 PM), and the Medici one. The right side under Graph says "1 note".

## Step 10

Grace: "Both reminders are in. Now -- will they be here next time? Last time I saved the project
and it came back from Recent projects the next morning. Up top it says 'Local only' and I'm not sure
this one has ever been saved, so I'll do what I did before: Control+S."

`--step $S --key Control+s`

Result 11.png: a dialog "Save Florentine families as", Name "Florentine families", Cancel / Save.

## Step 11

Grace: "Same dialog as last time. The name is fine. Save."

`--step $S --click "Save"`

Result 12.png: a message at the bottom: "Saved Florentine families in this browser." Notes still listed.

## Step 12

Grace: "'Saved in this browser' -- good, that's the same as my board map. I don't fully trust it
until I see it come back, so I'll close the tab and open the program again, like the next morning."

`--step $S --reopen`

Result 13.png: the start screen. Recent projects: "Florentine families -- In this browser - 15
nodes - Oct 9, 8:57 PM". Under it: "This browser can clear projects kept here. Save a local copy of
any project you need to keep." There is also a sample called Florentine families on the right.

## Step 13

Grace: "There it is under Recent projects, 15 nodes, saved just now. Two things called 'Florentine
families' -- I want mine, the one under Recent, not the sample on the right. Hmm, and that line
about the browser clearing projects is a bit worrying; I'll come back to that. Opening mine."

`--step $S --click-at 623,108`

Result 14.png: "Opened Florentine families". Same map, sized and colored by PageRank, 15 nodes, 20
edges; the Graph panel on the right says "1 note". The left side is back on Graph.

## Step 14

Grace: "Map's back with my ranking, and the right side already says '1 note' for the graph. Let me
open Notes on the left -- that's where I'd come to read them."

`--step $S --click "Notes"`

Result 15.png: Notes lists both reminders after reopening: "Marriages only; business ties are a
separate list" (Graph, Oct 9, 8:56 PM) and "Check the 1434 return from exile" (Medici, Oct 9, 8:55 PM).

## Step 15

Grace: "Both are back. One more thing I'd want to show you: the little 'Medici' tag -- does it take
me to them on the map?"

`--step $S --click "Medici"`

Result 16.png: the Medici dot is highlighted on the map, and the right side shows Medici with
"Node  1 note".

## End

`--end $S`

## Grace, in her own words

**Did I finish?** Yes. Both reminders are in, the Medici one is tied to the Medici and the other
one is about the whole graph, I saved the project in this browser, closed it, opened it again from
Recent projects and both were still there. Where I'd read them: the Notes place on the left side
lists them all with a date; the Medici one also shows as "1 note" on the Medici's panel on the
right, and the graph one as "1 note" on the Graph panel. Clicking the Medici tag on a note finds
the Medici on the map.

**Ease: 6 out of 7.**

**What confused me or slowed me down:**

- There are no names on the dots, so I had to guess the big middle dot was the Medici and click it
  to check. It was, but on my own data I'd have to search first.
- The three-dots menu was the only way I found to write on the Medici from their panel. I'd have
  liked to see a "note" spot right in the panel, but the menu said "Add note" plainly, so it was
  fine.
- When I went to write the second reminder, the plus button's tooltip just said "Add note". It
  didn't say whether it would go on the Medici (still picked) or on the whole map. I clicked empty
  space first to be safe. Once the box said "About Graph" I was sure, but I only saw that after
  pressing it.
- "About Graph" is a bit of a computer word for "the whole map" -- I understood it, but I wouldn't
  say it to the board.
- Nothing told me the reminders were part of the project until I saved. I saved because that's
  what I did last time; I'm not sure if they would have been kept without saving.
- The start screen says "This browser can clear projects kept here. Save a local copy of any
  project you need to keep." That made me a little nervous -- "still there next time" might not be
  true if the browser gets cleaned up. For something I keep for months I'd want to know how to make
  that local copy; I didn't go looking today.
- There are two things called "Florentine families" on the start screen (mine under Recent
  projects and the sample). I picked the one under Recent and it was mine, but it's easy to grab
  the sample by mistake.
