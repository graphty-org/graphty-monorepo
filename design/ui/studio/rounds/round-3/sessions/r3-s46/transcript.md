# Session r3-s46 -- Grace (nonprofit operations analyst), task T14: stop for the day and come back

Dataset: Les Miserables sample (setup: rounds/pilot/T14/setup.txt). Build: commit f108a2350, graphty@0.8.53.

## Start

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s46 setup:rounds/pilot/T14/setup.txt` -> 01.png

Saw (01.png): the Les Miserables drawing, orange nodes with names above them, a "Color: PageRank" key
at top left of the canvas (0.003299 to 0.07543), a left list with "Selection", "PageRank 77" and
"Everything" (selected), the right panel on Everything's Style tab with a Label line "Above / Abc name".
The top bar says "Les Miserables", undo/redo, a lock and "Local only". "Local only" reassures me
nothing is uploaded. So this is my work: the PageRank coloring and the name labels.

## Step 1

Thinking: I want to save under a name I choose. In Excel that is the File menu, so I try the
three-line icon at the top left.

Command: `--step --click-at 24,20` -> "button Main menu" -> 02.png

Saw: a menu like a File menu: Back to start, New project, Open project or file..., Open sample, Save
(Ctrl+S), Save as... (Shift+Ctrl+S), Save local copy..., Export..., Rename (F2), Settings..., Keyboard
shortcuts, Help. Familiar. Small hesitation: "Save as..." versus "Save local copy..." -- which one keeps
it on this computer? I go with "Save as..." because I want to choose the name, like in Excel.

## Step 2

Command: `--step --click "Save as..."` -> 03.png

Saw: a small dialog "Save Les Miserables as" with one Name box, "Les Miserables" already selected,
Cancel and Save. Clear. It does not say where it will be kept (this computer? a folder?), but the top
bar said "Local only". I type my own name and press Save.

## Step 3

Command: `--step --type "Characters ranked - Grace" --click "Save"` -> 04.png

Saw: the top bar now reads "Characters ranked - Grace", and a message at the bottom: "Saved Characters
ranked - Grace in this browser." Good, it took my name. Hesitation: "in this browser" is not quite "on
this computer" -- I am not sure what happens if IT clears the browser, and I did not get a file I could
see in my Documents folder. "Save local copy..." in the menu might be that, but the task only asks that
it is kept here, so I accept it. Note the left panel still says "Graph Les Miserables" -- the graph
name and the project name are different things, a little confusing.

At the end of the day I would just close the browser tab, so I close it and reopen the app as if it
were tomorrow.

## Step 4 -- "tomorrow"

Command: `--step --reopen` -> 05.png

Saw: a start page. Under "Recent projects": "Characters ranked - Grace -- In this browser - 77 nodes -
Oct 7, 2026, 5:01 AM". 77 nodes matches the 77 characters. Under it, small gray text: "This browser can
clear projects kept here. Save a local copy of any project you need to keep." That worries me a bit --
it answers my earlier doubt, but only after I closed the window; the save message itself did not
say it. On the left: "Files are read on this computer and never uploaded." Good for donor names.
I click my project.

## Step 5

Command: `--step --click "Characters ranked - Grace"` -> 06.png

Saw: "Opened Characters ranked - Grace" message; the top bar has my name. The drawing looks the same as
yesterday: same shape, same orange shades, names over the nodes, the "Color: PageRank" key
(0.003299 to 0.07543). The left list still has Selection, PageRank and Everything. The right panel now
shows a Graph overview instead of my Everything style: Nodes 77, Edges 254, Density, Components 1.
Small differences I noticed: the "77" that sat next to PageRank yesterday is not shown, and the
right panel opened on something else than where I left it. A line "Undirected, from the file:
"directed": f..." is cut off at the edge. I click Everything to check my name label is still set.

## Step 6

Command: `--step --click "Everything"` -> 07.png

Saw: the Everything style panel exactly as I left it: Label "Above / Abc name", "77 labels, 7 hidden",
fill color, size, shape. Together with the PageRank coloring and its key on the drawing, all my work
is there. I stop.

Command: `--end rounds/round-3/sessions/r3-s46`

## Verdict (in character, Grace)

- **Did I finish?** Yes. I saved the work as "Characters ranked - Grace", closed the window, came back,
  found it under Recent projects, opened it, and the PageRank coloring with its key, the name labels
  and the drawing itself were all there.
- **Ease: 6 of 7.** File menu, Save as, type a name, Save: just like Excel. Coming back was one click.
- **What confused or worried me:**
  - The menu has three saves ("Save", "Save as...", "Save local copy..."). I did not know which one
    keeps it "on this computer" until later.
  - The save message said "Saved ... in this browser." Only the next day, on the start page, did small
    gray text tell me "This browser can clear projects kept here. Save a local copy of any project you
    need to keep." That warning belongs at the moment I save, not after. For donor work I would want
    a real file I can see in a folder, and now I would go back and do "Save local copy..." too.
  - The left panel still says "Graph Les Miserables" while the top says my project name; two names
    for one thing.
  - Small: the "77" count beside PageRank was gone after reopening, the right panel opened on a Graph
    overview instead of where I left it, and a line about "directed" is cut off at the panel edge.
