# Session r3-s45 -- Ruth (reporter with a contacts sheet), task T14 "Stop for the day and come back"

Start: `node tool/real.mjs --start rounds/round-3/sessions/r3-s45 setup:rounds/round-3/setups/T14.txt`

## 01.png -- what I see at the start

The Les Miserables network is open. Orange balls with names next to them, a small key at the top
"Color: PageRank 0.003299 -- 0.07543". On the left: a search box, "Selection", "PageRank 77",
"Everything". On the right a Style panel with a Label line "Above / Abc name". Top bar says
"Les Miserables", undo/redo, a padlock and "Local only". So my work is: PageRank coloring and the
names on the drawing. I want to save it under my own name. No "File" menu that I can see -- I'll
try the three-line menu at the top left.

## Step 1 -- `--click-at 23,20` (Main menu) -> 02.png

A menu like a word processor's File menu: Back to start, New project, Open project or file...,
Open sample, Save, Save as..., Save local copy..., Export..., Rename, Settings, Help. Good. I want
my own name, so "Save as..." is what I'd use in Word. I hesitated a second over "Save local
copy..." -- the top bar said "Local only" and I'm not sure what the difference is -- but Save as
sounds like the normal one.

## Step 2 -- `--click "Save as..."` -> 03.png

A small box "Save Les Miserables as", Name field with "Les Miserables" already highlighted,
Cancel / Save. Easy. I'll type my own name over it: "Les Mis key characters".

## Step 3 -- `--type "Les Mis key characters" --click "Save"` -> 04.png

The title at the top now says "Les Mis key characters" and a message at the bottom: "Saved Les Mis
key characters in this browser." Hmm. "In this browser" -- not "on this computer". I wonder if
clearing my browser history would wipe it. The top bar still says "Local only" with a padlock.
Before I trust it, I'll point at "Local only" to see what it means.

## Step 4 -- `--hover-at 314,20` (Local only) -> 05.png

Tooltip: "Nothing is sent. Opens Settings > Privacy". Good -- the names don't leave my machine,
which matters to me. So "in this browser" means it's kept here on this computer. I'll take that.
At the end of the day I just close the tab, like I close everything else. Then "tomorrow" I open
the program again.

## Step 5 -- `--reopen` (closed the tab at end of day, opened the app again "tomorrow") -> 06.png

A start page: Start (Open project or file..., New from data...), Recent projects, Samples. Under
Recent projects: "Les Mis key characters -- In this browser - 77 nodes - Oct 7, 2026, 5:00 ...".
My name, there. Under it a gray note I had not seen before: "This browser can clear projects kept
here. Save a local copy of any project you need to keep." That worries me a little -- I'd have
liked to be told that when I saved, not the next morning. First let me open it and check my work.

## Step 6 -- `--click "Les Mis key characters"` -> 07.png

"Opened Les Mis key characters". Same drawing, same places, names still on the balls, the PageRank
color key still at top left (0.003299 to 0.07543), PageRank still in the left list. The right
panel now shows a graph overview (77 nodes, 254 edges) instead of the Style panel I had open --
fine. One small thing: yesterday the PageRank row said "77" next to it and now it doesn't. I want
to make sure the actual numbers came back, not just the colors, so I'll click PageRank.

## Step 7 -- `--click "PageRank"` -> 08.png

Right panel: "PageRank -- Measure from PageRank, Oct 7", Color = PageRank. So it remembers when it
was worked out. There's a "Values" tab -- that's where I'd expect the numbers I can check line by
line.

## Step 8 -- `--click "Values"` -> 09.png

There it is: "77 of 77 have a value, 0.003299 to 0.07543, median 0.01242", a Top 10 (Valjean
0.07543, Myriel 0.04278, Gavroche 0.03577, Marius, Javert, ...), and "Made with: Analysis PageRank,
Ran Oct 7, Damping factor 0.85, Weight None". That is exactly what I'd want to show an editor. My
work is all back. Because of yesterday's... this morning's warning that the browser can clear
projects, I'll also make a file copy the way it suggests: main menu, "Save local copy...".

## Step 9 -- `--click "Main menu" --click "Save local copy..."` -> 10.png

The tool reports a file was downloaded: "Les Mis key characters.graphty.json", 29,860 bytes. On
the screen itself nothing changed -- no message in the app like the "Saved ... in this browser"
one I got earlier. In a normal browser I'd see it in my downloads, so I'd accept that, but a word
from the app ("Saved a copy to your Downloads") would have reassured me.

`node tool/real.mjs --end rounds/round-3/sessions/r3-s45`

## In character, at the end

**Did I finish?** Yes. I saved the work as "Les Mis key characters", closed it, opened the program
again, and it was listed under Recent projects. Opening it brought back everything: the same
drawing in the same places, the names on the characters, the PageRank coloring and its key, and
the PageRank numbers themselves (77 of 77 values, the top 10 list, the settings it ran with and
the date). All of my work was there when I returned. As a precaution I also saved a file copy.

**Ease: 6 out of 7.** Save as... was where I expected it and asked for a name. Reopening was one
click from the start page.

**What confused or bothered me:**

- After saving, the message said "Saved ... in this browser", not "on this computer". I had to
  point at "Local only" ("Nothing is sent") to be sure my unpublished names had not gone anywhere.
- Only the next morning, on the start page, did I read "This browser can clear projects kept
  here. Save a local copy of any project you need to keep." That is the one thing I'd have needed
  to know at the moment I saved, and I was not told then. If I had cleared my browser data
  overnight, the work would have been gone.
- "Save", "Save as...", "Save local copy..." side by side: I wasn't sure which one makes a real
  file I can find later. I guessed right by reading the warning, not from the menu.
- "Save local copy..." gave no message in the app that a file was written or where.
- Small: before I left, the PageRank row in the left list showed "77"; after reopening it did not,
  which made me look twice before I found the numbers were all there.
