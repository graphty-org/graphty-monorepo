# Session: save, close and reopen the Les Miserables sample -- Marcus, intelligence analyst

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Open it, then imagine you have worked on it for an hour and must stop for the day. Make sure
the work is kept on this computer under a name you choose, put it away as you would at the end of
the day, and then bring it back as if it were tomorrow."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t14--intelligence-analyst/. `D` below stands for that folder (absolute path).

## 01 -- start screen (shots/tasks/r8-t14/01.png)

Start, Recent projects (empty, "kept in this browser"), Samples. Big box at the bottom asking me to
share usage data. No. I do not opt into telemetry, ever. "No thanks". Les Miserables is right there
in Samples, 77 characters.

## 02 -- open the sample

    timeout 120 node app-b/study.mjs --try D/02.png task:r8-t14 --click "No thanks" --click "Les Miserables"

It opened straight into a chart, already colored orange, with a long list on the left -- PageRank,
Louvain, shortest paths, watchlist, "For the report". Somebody already did an hour of work on this.
Fine, that is my "hour". Now I need File > Save As, the way every Windows program has it.

## 03-04 -- look for a File menu

    timeout 120 node app-b/study.mjs --try D/03.png task:r8-t14 --click "No thanks" --click "Les Miserables" --hover "Menu"
    timeout 120 node app-b/study.mjs --try D/04.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Main menu"

Three-lines button top left is "Main menu". Opened it: New project, Open recent, Open project or
file, Save Ctrl+S, Export, Version history, Settings. That is my File menu. There is Save, but no
Save As. I wanted to name it, so I am already a little annoyed. I'll hit Save and see what it asks.

## 05 -- Save

    timeout 120 node app-b/study.mjs --try D/05.png task:r8-t14 --click "No thanks" --click "Les Miserables" --click "Main menu" --click "Save"

A little black "Saved" box. That is it. It never asked me for a name or a place. Saved as what --
"Les Miserables"? Did I just write over the sample that came with the program? It did not say.

## 06-07 -- the title has a dropdown arrow

    timeout 120 node app-b/study.mjs --try D/06.png task:r8-t14 ... --click "Save" --click "Les Miserables, project menu"
    (failed: the main menu was still open over it)
    timeout 120 node app-b/study.mjs --try D/07.png task:r8-t14 ... --click "Save" --key Escape --click "Les Miserables, project menu"

The menu stayed open after Save, so my click hit nothing. Escape, then the name at the top. That
one has Rename, Open, Save, Export, Version history -- and Save as... and Close project. So there
are two menus with almost the same list, and the one I opened first is missing the two things I
needed. Why are Save As and Close only in the second one? I found it because the name had a little
arrow, not because it made sense.

## 08-10 -- Save as, with my own name

    timeout 120 node app-b/study.mjs --try D/08.png task:r8-t14 ... --click "Save as..."
    timeout 120 node app-b/study.mjs --try D/09.png task:r8-t14 ... --click "Save as..." --key Control+a --type "Practice - Les Mis"
    timeout 120 node app-b/study.mjs --try D/10.png task:r8-t14 ... --type "Practice - Les Mis" --click "Save"

Box: "Save Les Miserables as", Name "Les Miserables copy". Good -- "copy" tells me it will not
touch the original. Typed "Practice - Les Mis", Save. Title bar now reads "Practice - Les Mis".
But the box only asked for a name. No folder, no path. Where did it go? On a work laptop that
matters: if it is in the browser, IT's profile cleanup wipes it.

## 11 -- what does "Local only" mean

    timeout 120 node app-b/study.mjs --try D/11.png task:r8-t14 ... --click "Save" --click "Local only"

Opens Settings > Privacy. "Where your data goes. A plain statement you can forward to whoever asks."
Files you open: read on this computer, never uploaded. Usage data: off, nothing sent. Good -- that
is the paragraph I would paste into an email to IT. But "Your project: Saved where you save it."
I did not choose where. The start screen said projects "are kept in this browser". Those two lines
do not agree, as far as I can tell.

## 12 -- put it away for the day

    timeout 120 node app-b/study.mjs --try D/12.png task:r8-t14 ... --key Escape --click "Practice - Les Mis, project menu" --click "Close project"

Close project, back to the start screen. NOW it tells me: Recent projects, "Practice - Les Mis,
77 nodes, ~/Documents/graphty/Prac...", Today 19:21, and "This list is kept in this browser."
So the work is a file in my Documents folder and only the list is in the browser. That is what I
wanted -- but I learned it after closing, not when I saved. The path is cut off.

## 13 -- full path?

    timeout 120 node app-b/study.mjs --try D/13.png task:r8-t14 ... --click "Close project" --hover "Practice - Les Mis"

Rested the pointer on it. Nothing. No tooltip with the full path or the file name. I'd want to see
the actual file name so I can find it in Explorer and back it up to the case share.

## 14 -- tomorrow

    timeout 120 node app-b/study.mjs --try D/14.png task:r8-t14 ... --click "Close project" --click "Practice - Les Mis"

Click, and it is back: "Practice - Les Mis" in the title, same chart, nodes in the same places,
same list on the left -- PageRank, Louvain with its 6 groups, the two paths, Watchlist, the "For
the report" folder. Exactly where I left it. That is the thing that matters most to me. If it had
come back rearranged, I would have quit right there.

## Verdict

- Succeeded? Yes. It is saved under my name, in what looks like a file in Documents, closed, and
  reopened exactly as I left it.
- Single Ease Question: 5 of 7. The reopen was perfect. Getting there was clumsy: Save in the
  main menu silently saved with no name, Save As and Close were only in a second menu behind the
  project name, the Save As box never said where the file goes, and the only place that told me
  was the start screen afterwards, with the path cut off.
- Would I use it instead of my current tool? Not for this alone -- i2 saves a .anb file I can
  see in a folder, and that is the bar. But this part did not lose my work, and "never uploaded"
  in plain words is more than most web tools give me. Show me where the file is when I save it,
  put Save As next to Save, and I would have no complaint about this part.
