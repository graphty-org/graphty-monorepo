# Session r3-s53 -- Dev, returning (student, second assignment)

Task: with the Florentine marriages network open, leave two reminders -- one about the Medici
("Check the 1434 return from exile") and one about the whole network ("Marriages only; business
ties are a separate list") -- make sure both are still there next time, and show where to read them.

Every command ran with `REAL_DIST=<frozen build tier2-r3d2-26f3bb968>` and
`R=design/ui/studio/tool/real.mjs`, `S=<this session's folder>`. Screenshots 01.png to 17.png
are in this folder.

## Start

`node $R --start $S setup:florentine-ranked.txt` -> 01.png (waited for a free browser slot first)

Florentine families is open, dots sized and colored by PageRank, no names drawn. Left rail: Graph,
Data, Notes. "Okay, Notes -- that has to be where reminders go."

## Step 1

`node $R --step $S --click "Notes"` -> 02.png

Notes panel: "Notes" heading with a + and "No notes." Good, the obvious door. Next: the +.

## Step 2

`node $R --step $S --click-at 276,60` (button "Add note") -> 03.png

A text box opened labeled "About PageRank", with Cancel / Save note. "Wait -- About PageRank?
I want the note to be about the Medici. It must stick to whatever is picked on the right."
Next: cancel, then find the Medici.

## Step 3

`node $R --step $S --click "Cancel" --click "Graph"` -> 04.png

Note box gone, Graph panel back with its search box.

## Step 4

`node $R --step $S --click "Find nodes, edges, values" --type "Medici"` -> 05.png

The search lists "Nodes 1: Medici" and six Medici edges. "Oh nice." Next: click the Medici row.

## Step 5

`node $R --step $S --click-at 116,153` (option "Medici") -> 06.png

The biggest dot gets a yellow ring; the right panel says "Medici, Node", PageRank 0.1458, #1 of
15. Selection shows 1. Next: Notes, then +, hoping it says "About Medici" now.

## Step 6

`node $R --step $S --click "Notes" --click "Add note"` -> 07.png

The box now says "About Medici". "Yes, that's it." Next: type the reminder and save.

## Step 7

`node $R --step $S --type "Check the 1434 return from exile" --click "Save note"` -> 08.png

The note is listed: "Check the 1434 return from exile", a "Medici" chip, Oct 10, 6:31 PM, a trash
icon. The right panel under Medici now says "1 note". Next: the whole-network note. Since the
note goes to whatever is picked, click empty background so nothing is picked, then +.

## Step 8

`node $R --step $S --click-at 1050,700 --click "Add note"` (empty canvas) -> 09.png

The box says "About Graph"; the right panel switched to the Graph overview (15 nodes, 20 edges).
"That's the whole network." Next: type the second reminder and save.

## Step 9

`node $R --step $S --type "Marriages only; business ties are a separate list" --click "Save note"` -> 10.png

Both notes listed, newest on top, with chips "Graph" and "Medici". The Graph header now says
"1 note". Next: make sure they stick -- main menu, Save, as in the first assignment.

## Step 10

`node $R --step $S --click "Main menu"` -> 11.png

Menu: Back to start, New project, Open project or file..., Open sample, Save (Ctrl+S), Save as...,
Save local copy..., Export..., Rename, Settings..., Keyboard shortcuts, Help. Next: Save.

## Step 11

`node $R --step $S --click "Save"` -> 12.png

Dialog "Save Florentine families as", Name "Florentine families", Cancel / Save. Next: Save.

## Step 12

`node $R --step $S --click "Save"` (in the dialog) -> 13.png

Toast: "Saved Florentine families in this browser." The header still says "Local only". Next:
close and reopen to check, like coming back the night before the deadline.

## Step 13

`node $R --step $S --reopen` -> 14.png

Start page. Recent projects: "Florentine families -- In this browser - 15 nodes - Oct 10, 6:32 PM",
and under it: "This browser can clear projects kept here. Save a local copy of any project you
need to keep." "Wait, so it could just vanish? Okay, noted." Next: open the recent project.

## Step 14

`node $R --step $S --click-at 624,108` (Recent projects row) -> 15.png

"Opened Florentine families." Same picture (layout shifted a little), PageRank still on, Graph
header still says "1 note". Next: Notes.

## Step 15

`node $R --step $S --click "Notes"` -> 16.png

Both notes are back: "Marriages only; business ties are a separate list" (Graph, 6:32 PM) and
"Check the 1434 return from exile" (Medici, 6:31 PM). "Oh nice, that's it." Because of the
start-page warning, next: main menu, Save local copy..., so I also have a file.

## Step 16

`node $R --step $S --click "Main menu" --click "Save local copy..."` -> 17.png

The browser saved "Florentine families.graphty.json" (7,553 bytes). The app's own screen showed
no message for this one, where Save had shown a toast. "I think it worked? The download says so."

## End

`node $R --end $S` -> session ended. Work record: both notes present at the end, nothing gone.

## In character, at the end

**Did I finish?** Yes. Both reminders are in, the Medici one is tagged "Medici" and the network
one is tagged "Graph", I saved, closed and reopened, and both came back. I'd read them in the
Notes tab on the left rail (the third button). The right panel also says "1 note" next to the
Medici when he's picked and next to Graph when nothing is.

**Ease: 6 / 7.**

**What confused me:**

- The first time I hit +, the box said "About PageRank". I didn't know a note goes to whatever is
  picked on the right. It took me one cancel to figure out I had to pick the Medici first, and then
  click empty background for the whole-network one. Nothing on the Notes panel said "pick what
  this note is about first"; I only got it because the label changed.
- "Local only" at the top and "Saved ... in this browser" -- then the start page tells me the
  browser can clear it. So is Save actually safe for the deadline or not? I did Save local copy
  too just in case, and that one gave me no message in the app, only the browser download.
- Nothing else. Search for "Medici" was easy, and seeing "1 note" by his name was reassuring.
