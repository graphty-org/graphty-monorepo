# Session: open a GEXF file and check that all of it arrived -- nonprofit operations analyst ("Grace")

Task as given: "You have never used this program before. A colleague sent you a network file of the
characters in Les Miserables and the chapters they share; you saved it as miserables.gexf in your
Downloads folder. Bring it into the program and, before you do anything else with it, check that
all of it arrived: how many characters, how many connections, and that nothing was dropped on the
way in."

Renders are in design/ui/prototype/tmp/round-8-sessions/r8-t03--nonprofit-operations-analyst/.
Every command was run from design/ui/prototype. "DIR" below stands for that renders folder
(the full absolute path was passed each time).

## 01 -- start screen (shots/tasks/r8-t03/01.png)

Think-aloud: "OK, a start page. 'Open project or file...' is right at the top, good. And it says
'Files are read on this computer and never uploaded' -- that is the first thing I look for, so
thank you. There's a sample called Les Miserables with 77 characters over on the right. That's
tempting, but my colleague sent me THEIR file, so I'm not clicking the sample; I want to know my
file is what arrived. There's a big box at the bottom asking about usage data. I'll say no thanks,
I don't want anything going anywhere."

## 02 -- Open project or file

    timeout 120 node app-b/study.mjs --try DIR/02.png task:r8-t03 --click "No thanks" --click "Open project or file..."

Think-aloud: "A file chooser on Downloads. miserables.gexf, 22 KB, Sep 27 -- that's mine. There's
also a 'miserables-edited.graphml' from the 29th, which I don't recognize; I'll leave it. Tick the
gexf and Open."

## 03 -- after Open: a table view of my file

    timeout 120 node app-b/study.mjs --try DIR/03.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open"

Think-aloud: "Oh nice, this I understand -- it looks like a spreadsheet. Left side: my file, with
'nodes 77' and 'edges 254', both with green checks. Top line: 'Les Miserables: 77 nodes, 254
edges'. At the bottom: 'Match report: nodes -- 77 rows; every id is unique.' So 77 characters, no
duplicates. 'Showing the first 8 of 77 rows.' I'd have liked to scroll through all 77 to eyeball
it like in Excel, but OK. 'Nodes' and 'edges' -- I'd say characters and connections, but I get it.
The 'Key' and 'Name' pills I don't really understand but they seem to be guessed for me ('auto')."

## 04 -- the edges table

    timeout 120 node app-b/study.mjs --try DIR/04.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges"

Think-aloud: "254 rows; 'every edge has both ends'. Good -- that's the sentence I wanted: nothing
points at a missing character. One thing bugs me: up top it says 'Weight: none (each edge counts 1)'
but there's a 'value' column right there with 8, 10, 6 in it. Is it throwing that number away? My
colleague said 'the chapters they share' -- I'd guess value is how many chapters. If the program is
ignoring it, is that 'dropped'? It doesn't say the column is lost, it says 'Attribute', so I'll
assume it's kept but not used. I'm not going to touch it. Direction 'As the file says' is fine.
Click Load."

## 05 -- Load: a progress box that does not finish

    timeout 120 node app-b/study.mjs --try DIR/05.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load"

Think-aloud: "'Reading miserables.gexf, 77 nodes, 254 edges...' with a bar about two thirds full.
The panel on the right says 'Summary: Reading...'. I'll wait."

## 06 -- still reading; hovering 'Everything'

    timeout 120 node app-b/study.mjs --try DIR/06.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --hover "Everything"

Tooltip shown: "Built-in rows keep their names"

Think-aloud: "Still at the same place on the bar. I pointed at 'Everything' to see if it says how
much is there, and the tip says 'Built-in rows keep their names'. That means nothing to me. The
bar isn't moving. Is it stuck? There's no number of how far it got."

## 07 -- clicking 'from miserables.gexf' in the right panel

    timeout 120 node app-b/study.mjs --try DIR/07.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "from miserables.gexf"

Think-aloud: "I clicked the link with my file name to see what was happening. It took me back to
the spreadsheet view, now titled 'Edit: miserables.gexf', with 'Apply is off: Nothing has changed
yet'. So the file is there. Still 77 and 254. I'll cancel out and go back to the picture."

## 08 -- back on the graph: much more than my file

    timeout 120 node app-b/study.mjs --try DIR/08.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "from miserables.gexf" --click "Cancel" --click "Graph"

(The tool reported "Cancel" and "Graph" each matched more than one control and clicked the first.)

Think-aloud: "Wait. Now there's a picture -- fine -- but the list on the left has PageRank,
Louvain 6 groups, Shortest paths 'Valjean t...', Density, Link prediction, 'Top 9 by de...',
'Watchlist 5 nodes' with a padlock, a folder 'For the report', Notes 4 items. I didn't do any of
that. It's all colored orange by 'PageRank'. Did it open the sample instead of my file? The sample
on the start page said 'Opens with worked examples: measures, groups, paths and notes already
added' -- this looks exactly like that. My file was a plain file from my colleague. Either my
colleague's file had all this saved in it, or the program mixed my file with its sample. I can't
tell which, and that worries me: if it does this with my donor list, whose notes am I looking at?"

## 09 -- Everything

    timeout 120 node app-b/study.mjs --try DIR/09.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "from miserables.gexf" --click "Cancel" --click "Graph" --click "Everything"

Think-aloud: "Clicking 'Everything' -- right side says 'Paints 77 nodes, 254 edges'. 'Paints' is a
funny word for 'contains', but those are my numbers. So 77 characters and 254 connections made it
into the picture too. Underneath the list it says '1 row not listed still paints' and 'Show rows
removed from list view'. REMOVED? That's the word that makes me nervous -- was something dropped?"

## 10 -- 'Show rows removed from list'

    timeout 120 node app-b/study.mjs --try DIR/10.png task:r8-t03 --click "No thanks" --click "Open project or file..." --click "miserables.gexf" --click "Open" --click "edges" --click "Load" --click "from miserables.gexf" --click "Cancel" --click "Graph" --click "Show rows removed from list"

Think-aloud: "It's a 'Group 6, not listed, 1 node'. So it's one of those colored group things that
someone hid from the list, not a character that went missing. Phew, I think. The character count
is still 77. I'm stopping here."

## Wrap-up

Did I succeed? Mostly yes. Before loading, the file view told me exactly what I wanted in plain
sentences: 77 rows, every id unique; 254 rows, every edge has both ends. After loading, 'Everything'
said 77 nodes and 254 edges. I'm fairly sure nothing was dropped.

What shook my confidence:
- The loading box sat at the same point and the summary said "Reading..." -- I never saw it say
  "done".
- After loading, the graph was full of analyses, groups, a padlocked watchlist and notes I never
  made. I can't tell whether that came from my colleague's file or from the built-in sample of the
  same name. With donor data, that is a real concern.
- "Weight: none" next to a 'value' column that clearly has numbers in it. I don't know if the
  chapter counts were used, kept or ignored.
- "Removed from list" and "not listed" sound like data loss even when they are not.
- Words: "nodes", "edges", "paints", "built-in rows". I'd say characters, connections, contains.
- I could only see the first 8 rows of each table; I like to scroll the whole thing to check.

Single Ease Question (1-7): 5. Finding my numbers was easy; trusting what I was looking at afterward
was not.

Would I use this instead of my current tool (Excel)? Not yet. The check-before-loading screen is
better than anything I have -- the "every edge has both ends" sentence is exactly what I'd want to
show my director. But I'd need to know that what I see after loading is ONLY my file, with nothing
from a sample mixed in, before I put donor names into it.
