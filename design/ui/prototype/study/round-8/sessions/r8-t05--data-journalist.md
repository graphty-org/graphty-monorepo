# Session: r8-t05, data journalist ("Ruth")

Task as given: "You have never used this program before. A coworker emailed you an edited copy of a
network file of Les Miserables characters; it is saved as miserables-edited.graphml in your
Downloads folder. Bring it into the program and either get to a point where you can carry on
working, or know exactly what to tell your coworker to fix."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t05--data-journalist/.

## Step 1 -- the start screen (shots/tasks/r8-t05/01.png)

Think-aloud: "OK, a start page. 'Open project or file...' top left, that's what I want. There's a
Les Miserables sample on the right, but that's not my coworker's copy, so I'll leave it. First
though, this box at the bottom wants usage data. 'Files are read on this computer and never
uploaded' -- good, I like that line, I'd check it before putting unpublished names in here. I'm
saying No thanks anyway; I don't share usage from work machines."

## Step 2 -- decline usage data, open the file picker

    timeout 120 node app-b/study.mjs --try .../r8-t05--data-journalist/02.png task:r8-t05 --click "No thanks" --click "Open project or file..."

Saw: a "Choose files" dialog on Downloads with miserables-edited.graphml (18 KB, Sep 29),
miserables.gexf, a Patent citations .graphty file, and chapter-notes.docx grayed out.

Think-aloud: "There it is, 'miserables-edited.graphml', Sep 29, that's the one from the email. The
Word doc is grayed out, makes sense. Checkboxes, so I tick it and hit Open."

## Step 3 -- pick the file and open it

    timeout 120 node app-b/study.mjs --try .../r8-t05--data-journalist/03.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open"

Saw: a screen titled "Open as a new graph" with a red error box: "miserables-edited.graphml has
two nodes with the id 11 (lines 48 and 212), and 3 edges end at node 80, which no node has (lines
590, 611 and 640). A graph file sets its own ids: make each node id unique and give every edge's
ends a node, or choose another file." A blue "Choose another file..." button, "Nothing to show:
nothing was read." Footer: "Load is off: no setting here fixes miserables-edited.graphml", Load
grayed out, Cancel available. Format chip says GraphML, "auto".

Think-aloud: "Well, it won't take it. But honestly this is the most useful error message I've had
from software this year. Two problems, and it gives me line numbers: id 11 used twice, at lines 48
and 212, and three connections pointing at a node 80 that doesn't exist, lines 590, 611 and 640.
That's exactly what I can paste into an email. My guess is my coworker added a character, reused
11 by mistake, and maybe meant that one to be 80. 'No setting here fixes it' -- fine, so I'm not
going to waste time poking at options.

What I don't love: 'nothing was read'. I'd have liked it to load the other 76-odd characters and
just flag the bad ones so I could keep working while I wait. And 'node' and 'edge' -- I get it
from context, they mean the characters and the ties, but I'd have said that differently. Also I
don't know what the 'Makes / Nothing yet' strip at the top is for."

## Step 4 -- check whether the "Match report" line has more detail

    timeout 120 node app-b/study.mjs --try .../r8-t05--data-journalist/04.png task:r8-t05 --click "No thanks" --click "Open project or file..." --click "miserables-edited.graphml" --click "Open" --click "Match report: miserables-edited"

Saw: nothing changed. The "Match report" heading at the bottom has nothing under it.

Think-aloud: "I hoped the match report would list the characters it found, or the offending rows
by name -- I'd rather tell my coworker 'Valjean and whoever is at line 212 both got id 11' than
just line numbers. It's empty. Doesn't matter much, I have the line numbers. I'm stopping here:
I know what to send back."

## What I would tell my coworker

"The file won't open. Two node ids are both 11 (lines 48 and 212) -- give one of them a new
unique id. And three edges (lines 590, 611 and 640) point at node 80, which doesn't exist --
either add node 80 or fix those edges. Probably the new character was meant to be 80."

## Verdict

- Succeeded? Yes. I didn't get the graph in, but I know exactly what to tell my coworker, which
  was one of the two allowed outcomes.
- Single Ease Question: 6 of 7. Three clicks to a clear answer. One off because the screen says
  "nothing was read" with no option to load the good part, and the "Match report" heading is
  empty, which made me wonder if I was missing something.
- Would I use it instead of my current tool? For checking a file someone sent me, yes -- a
  spreadsheet or Gephi would either choke silently or quietly drop the bad rows and I'd never know,
  and an import I can't account for is one I can't print. Before switching for real I would want it
  to name the characters involved, not only line numbers, and to let me load what's good while I
  wait for the fix.
