# Session: save, close and reopen the Les Miserables sample -- Chris, ML engineer (recommendation systems)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Open it, then imagine you have worked on it for an hour and must stop for the day. Make sure
the work is kept on this computer under a name you choose, put it away as you would at the end of
the day, and then bring it back as if it were tomorrow."

All commands ran from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t14--ml-engineer-recsys/.

## 01 -- start screen (shots/tasks/r8-t14/01.png)

"OK, a start page. Open / New from data on the left, recent projects empty, samples on the
right. 'Files are read on this computer and never uploaded' -- good, that's the first thing I'd ask.
There's a usage-data banner at the bottom. I'm saying no, I don't share telemetry from a work
laptop. Les Miserables is the first sample, 77 characters. Click it."

## 02 -- open the sample

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t14 --click "No thanks" --click "Les Miserables"

"It opened straight into a populated project: PageRank coloring, Louvain, shortest paths,
a bunch of rows on the left. That's the 'worked examples' it promised. Fine. Pretend I've spent an
hour here. Now I need to save. Ctrl+S is my reflex, but I want to pick a name, so I want Save As.
The title 'Les Miserables' in the top-left has a little caret -- that's the VS Code / Figma
pattern for the file menu. Click it."

## 03 -- project menu

    ... --click "No thanks" --click "Les Miserables" --click "Les Miserables"

"There it is: Rename F2, Open, Save Ctrl+S, Export Ctrl+E, Apply recipe, Version history, then
Save as Ctrl+Shift+S and Close project. Shortcuts match what I'd expect. Slightly weird that Save
as is down at the bottom, separated from Save by Export and Version history -- I'd have looked for it
right under Save. But I found it in about three seconds. Save as."

## 04 -- Save as dialog

    ... --click "Save as..."

"'Save Les Miserables as', one Name field, prefilled 'Les Miserables copy'. Minimal, fine. What I
don't see is WHERE it goes. No folder, no path, no 'this browser vs a file on disk'. For a tool that
brags about local-only, I want to know if this is IndexedDB or a real file I can back up or git.
I'd type 'lesmis-practice' here."

(Note for the record: the click-through tool gave me no way to type, so the name stayed at the
default 'Les Miserables copy'. In real life I would have replaced it. I'm counting the naming step as
something the dialog allows, not something I proved.)

## 05 -- after Save

    ... --click "Save"

"Title bar now says 'Les Miserables copy'. That's the only feedback. No toast, no 'Saved to ...',
no saved/unsaved dot. I assume it worked because the name changed. Mild unease."

## 06 -- close the project

    ... --click "Les Miserables copy" --click "Close project"

"Back to the start screen. Recent projects now shows 'Les Miserables copy, 77 nodes,
~/Documents/graphty/Les ...', Today 19:21. OK -- so it IS a file on disk under ~/Documents/graphty.
That answers my question from the dialog, but only after the fact, and the path is truncated.
Underneath: 'This list is kept in this browser.' So the list is browser-local but the file is on
disk. Makes sense, though if I clear site data tomorrow the list is gone and I'd have to Open
project or file and dig through ~/Documents/graphty myself. Acceptable."

## 07 -- reopen it ('tomorrow')

    ... --click "Les Miserables copy"

"Clicked the recent entry. Same project back: PageRank coloring, Louvain 6 groups, the two shortest
paths, the watchlist, 'For the report' folder, 4 notes. Same layout as far as I can tell. That's
what I wanted."

## 08 -- hover to see the full path

    ... --click "Close project" --hover "Les Miserables copy"

"Tried hovering the recent entry to read the full path. No tooltip -- just a row highlight and a
'...' menu. I'd want the full path on hover or in that menu, so I know the actual file name."

## Verdict

- Succeeded? Yes, mostly. Saved under a new name, closed, reopened from Recent with everything
  intact. Caveat: I could not actually type my own name in this session, and I only learned where the
  file lives after closing the project.
- Single Ease Question: 6 / 7. Standard menu, standard shortcuts, it just worked. Lost a point for
  the Save as dialog not saying where the file goes, no confirmation after saving, and the
  truncated path with no hover.
- Would I use this instead of my current tool? For this job my "current tool" is a notebook
  plus nx.write_gexf / a Parquet dump, and saving is free there. Saving here is fine and not a
  reason to switch either way. What I care about is that the project is a real file in
  ~/Documents/graphty that I can copy, diff or check in -- if it's a readable format, that's a plus.
  I'd still decide on whether it handles my own edge list, not on this.
