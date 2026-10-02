# Session: rearrange the drawing and stop it moving -- played as Tom, the lab manager who only receives files

Task as given by the moderator: "The drawing of the characters is hard to read. Try a different way
of arranging it, and once it looks better, stop it moving so you can study it. The data on screen is
a sample: characters of the novel Les Miserables, linked when they appear in the same chapter. If
that is not your line of work, treat them as your own people or things."

Start screen: shots/tasks/t08/01.png. Every command below was run from
design/ui/prototype; renders are in tmp/round-7-sessions/t08--recipe-recipient/.

## Step 0 -- looking at the start screen

"OK, a ball of orange dots. Valjean in the middle, a clump at the bottom. Legend top-left: color is
PageRank, size is degree. Fine, I don't need those. I'm supposed to arrange it differently. There's
no button that says 'arrange' or 'layout' anywhere I can read. Left side is a long list --
Selection, Notes, PageRank, Louvain, Shortest paths, Watchlist... that's more than six rows, I'm not
reading all that. There's a little row of icons at the bottom middle. And there's the word 'Graph'
on the far left. Let me try 'Graph' first, it's the biggest word."

## Step 1 -- click "Graph"

    timeout 120 node app-b/study.mjs --try .../01.png task:t08 --click "Graph"

"Nothing changed. Same screen. All right, maybe it's under the menu, top left, the three lines.
That's where File usually is."

## Step 2 -- the three-line menu

    timeout 120 node app-b/study.mjs --try .../02.png task:t08 --click "Menu"

"New project, Open, Open recent, Select where, Settings, Keyboard shortcuts, Help. Nothing about
arranging. I'm not going into Settings. That's one strike."

## Step 3 -- the play button at the bottom

    timeout 120 node app-b/study.mjs --try .../03.png task:t08 --click "Layout"

(The play-triangle icon at the bottom is what responded.)

"I pressed the triangle. It turned into a pause sign. Did anything happen? The dots look exactly
where they were. So is it moving now? I can't tell. That's not 'a different way of arranging', it's
the same picture with a pause button."

## Step 4 -- resting the pointer on the icons to read what they are

    timeout 120 node app-b/study.mjs --try .../04.png task:t08 --hover "Layout"
    timeout 120 node app-b/study.mjs --try .../05.png task:t08 --click "Layout" --hover "Layout"
    timeout 120 node app-b/study.mjs --try .../06.png task:t08 --click "Arrange"
    timeout 120 node app-b/study.mjs --try .../07.png task:t08 --hover "Analyze"
    timeout 120 node app-b/study.mjs --try .../08.png task:t08 --hover "3D"
    timeout 120 node app-b/study.mjs --try .../09.png task:t08 --hover "Legend"

"I had to sit on each one. Triangle says 'Resume layout'; once pressed, 'Pause layout'. So that
IS the stop-it-moving part, I suppose -- but it said 'Resume', which means it was already stopped
when I opened it? Then the drawing was never moving. The flask is 'Analyze' -- no, that's
algorithms, not my job. The blue one is 'Legend'. Nothing is called 'Arrange'."

## Step 5 -- the graph name at the top of the list

    timeout 120 node app-b/study.mjs --try .../10.png task:t08 --click "Co-appearances"
    timeout 120 node app-b/study.mjs --try .../11.png task:t08 --click "Co-appearances" --key Escape --click "Style"

"A dropdown with 'Co-appearances, 77 nodes' and 'Compare graphs'. Not it. The right-hand panel
changed to numbers about the graph -- density, components. When I pressed Escape it jumped back to
PageRank. Style tab only has Fill, Shape, Effects, Label, Tooltip. No arranging there either."

## Step 6 -- the last two icons

    timeout 120 node app-b/study.mjs --try .../12.png task:t08 --hover "Actions"
    timeout 120 node app-b/study.mjs --try .../13.png task:t08 --hover "View"
    timeout 120 node app-b/study.mjs --try .../14.png task:t08 --hover "Camera"
    timeout 120 node app-b/study.mjs --try .../15.png task:t08 --click "View"

"The lightning bolt is 'Quick actions'. The cube is 'View'. I'll open View. Fit, Front, Side, Top,
Isometric, 'Whole cast', 'Valjean's circle', Switch to 2D, Enter VR. These are camera angles, aren't
they? Turning it to the side won't untangle anything. 'Valjean's circle' is somebody's saved
view. Not what I was asked."

## Step 7 -- Quick actions

    timeout 120 node app-b/study.mjs --try .../16.png task:t08 --click "Quick actions"

"A search box: 'Type a command or a place'. And the first thing listed is 'Re-run layout -- Canvas
menu > Re-run layout'. Well, that's the closest thing to 'arrange' I've seen in five minutes. I
don't know what a canvas menu is. Re-run isn't 'different', but let's see."

    timeout 120 node app-b/study.mjs --try .../17.png task:t08 --click "Quick actions" --click "Re-run layout"

"It opened another menu instead of doing it. 'Re-run layout', 'Reshuffle layout seed', 'Unpin
all', 'Compute the overview', and at the bottom 'Clear graph data' -- I'm staying well away from
that. 'Reshuffle layout seed' -- seed? No idea. I'll press Re-run layout again."

    timeout 120 node app-b/study.mjs --try .../18.png task:t08 --click "Quick actions" --click "Re-run layout" --click "Re-run layout"

"Everything's gone. The picture is blank, the list on the left is down to three rows and says 'Add
data to start', and there's a box saying 'Reading miserables.gexf, 77 nodes, 254 edges' with a
Cancel button. Did I just wipe her file? I asked it to redo the arrangement and it's reloading the
whole thing from scratch. The colors list -- PageRank, Louvain, the Watchlist -- all gone from the
side. I'm not touching anything else. That's my second strike. I'll ask her to just send me a PNG."

## Stopped here

Gave up after the screen emptied and started reloading the data.

## Debrief

- **Did I succeed?** No. I never found a different way of arranging it. The only things that
  sounded like it were "Re-run layout" and "Reshuffle layout seed", which are the same arrangement
  again, not a different one, and the second time I pressed it the whole screen emptied and went
  back to reading the file. The pause button I did find, but only because I sat on a triangle icon
  long enough for its name to appear, and it said "Resume", so I am not even sure it was moving.
- **Single Ease Question (1 = very difficult, 7 = very easy): 2.** I clicked around for several
  minutes and the one thing I tried made the whole picture disappear.
- **Would I use this instead of what I use now?** No. What I use now is the postdoc sending me a
  PNG. Nothing on the main screen says "arrange" or "layout" in words; everything I needed was
  behind an unlabeled icon or a menu I only reached by accident, and the step that looked right
  made it look like I had deleted her work. If the colors list hadn't come back I'd be explaining
  that in lab meeting.

What I expected versus what happened, in plain terms:

- I expected a word on the screen for how the dots are laid out, with a few choices. I found none.
- I expected "stop it moving" to be obvious once I'd changed something. The pause button only
  names itself when you rest the pointer on it, and it started out saying "Resume", so I couldn't
  tell whether the picture had been moving at all.
- The "View" menu looks like it might rearrange things (Top, Side, Switch to 2D) but those turn the
  camera. I couldn't tell the difference until I'd tried.
- "Re-run layout" reloaded the whole file and emptied the list on the left. I don't know whether
  my work, or hers, survived.
- Words I didn't understand: "layout seed", "Unpin all", "Compute the overview", "Canvas menu".
