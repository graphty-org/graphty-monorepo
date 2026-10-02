# Session: get a network of characters into a new, empty project -- Morgan Reyes (screen-reader analyst)

Task as given by the moderator: "You have just started a new, empty project. Get your network of
characters into it. The data on screen is a sample: characters of the novel Les Miserables, linked
when they appear in the same chapter. If that is not your line of work, treat them as your own
people or things."

All commands were run from design/ui/prototype. D below is
tmp/round-7-sessions/t29--screen-reader-analyst (renders 02-19 are there; 01 is the start screen,
shots/tasks/t29/01.png).

## 01 -- start screen

Think-aloud: "Title says Les Miserables. Rail: Graph, Data, Views, Notes, Assistant -- named, good.
Left panel: Selection, Notes, Everything, then a link 'Add data to start'. Middle: 'No nodes to
draw. This graph is empty.' and a button 'Add data...'. Right panel: Summary, 'No nodes or edges.
Add data...'. Three things say 'Add data'. I'll assume they are the same thing. 'Local only' at the
top -- I hope that means my file stays here. Nobody has told me yet."

## 02 -- the big "Add data..." button

    timeout 120 node app-b/study.mjs --try $D/02.png task:t29 --click "Add data..."

Think-aloud: "I press Add data and ... I was never asked for a file. No file dialog. The title is
now 'Door entries, March 2026'. A table of person_id, building_id, time. That is not my data, and
the project name changed under me. 'Open as a new graph'? I asked to add data to THIS project.
There is a match report at the bottom with counts in words -- 4,212 rows, 4,180 have both ends,
25 person ids not in people. That part I like; it is the kind of check I do in pandas. But whose
file is this?"

## 03 -- the small "Add data" link in the left panel

    timeout 120 node app-b/study.mjs --try $D/03.png task:t29 --click "Add data"

Think-aloud: "Same thing. Door entries again. So all the 'Add data' links go to somebody's door
log. Dead end number one."

## 04 -- the Data section on the rail

    timeout 120 node app-b/study.mjs --try $D/04.png task:t29 --click "Data"

Think-aloud: "Now I am confused. I pressed 'Data' and the project is suddenly full: Sources,
miserables.gexf, 77 nodes, 254 edges. Summary on the right says Nodes 77, Edges 254, Undirected,
one connected component. Thirty seconds ago the same Summary said 'No nodes or edges'. Did I load
it? I did not do anything. Either the start screen lied or this one does. I will not count this
as having done the task -- I cannot tell what happened."

## 05-08 -- looking for an add control in the Data section

    timeout 120 node app-b/study.mjs --try $D/05.png task:t29 --hover "Add source"
      -> nothing on screen is called "Add source"
    timeout 120 node app-b/study.mjs --try $D/06.png task:t29 --click "Add data…"
      -> nothing on screen is called "Add data…"
    timeout 120 node app-b/study.mjs --try $D/07.png task:t29 --click "Data" --hover "Add source"
      -> nothing on screen is called "Add source"
    timeout 120 node app-b/study.mjs --try $D/07.png task:t29 --click "Data" --hover "Add a source"
      -> nothing on screen is called "Add a source"
    timeout 120 node app-b/study.mjs --try $D/07.png task:t29 --click "Data" --hover "Add data"
    timeout 120 node app-b/study.mjs --try $D/07.png task:t29 --click "Data" --hover "Add"
    timeout 120 node app-b/study.mjs --try $D/07.png task:t29 --click "Data" --hover "Add data"
    timeout 120 node app-b/study.mjs --try $D/08.png task:t29 --click "Data" --click "Add data"

Think-aloud: "The plus next to 'Sources' is named 'Add data to this graph'. Fine, it has a name.
It opens a menu: File..., From a URL..., Paste..., Set collection... This is what I expected the
first button to do. Why did the button in the middle of the empty screen skip this menu?"

## 09-10 -- File...

    timeout 120 node app-b/study.mjs --try $D/09.png task:t29 --click "Data" --click "Add data" --click "File..."
    timeout 120 node app-b/study.mjs --try $D/10.png task:t29 --click "Data" --click "Add data" --click "File..." --click "Data file: CSV, JSON, GEXF or GraphML"

Think-aloud: "'Choose a file': a data file, a recipe, a style file. I take the data file. And it
opens transfers-2026-03.csv. Bank account transfers. Title now 'Transfers, March 2026', again
'Open as a new graph'. I asked to add data to this graph and got a new one. Second wrong file.
Dead end number two."

## 11 -- going back and pressing Load on the first import, to see what Load does

    timeout 120 node app-b/study.mjs --try $D/11.png task:t29 --click "Add data..." --click "Load"

Think-aloud: "'Reading 3 tables: people.csv, buildings.csv, entries.csv: 421 nodes, 4,180
edges...' with a Cancel button. It tells me what it is reading and how much. That is a good
progress message, once. But the graph is now called 'Door entries'. My Les Miserables project is
gone from the title. I have loaded the wrong thing into the wrong place."

## 12-14 -- the main menu

    timeout 120 node app-b/study.mjs --try $D/12.png task:t29 --hover "Menu"
    timeout 120 node app-b/study.mjs --try $D/13.png task:t29 --click "Main menu"
    timeout 120 node app-b/study.mjs --try $D/14.png task:t29 --click "Main menu" --click "Open..."

Think-aloud: "The three-line button is 'Main menu'. New project, Open, Open recent, Settings,
Keyboard shortcuts with '?' -- I will remember that one. But opening the menu changed the screen
behind it: the empty project is a full graph again, a legend, Group 2, Group 8, Betweenness. I
only opened a menu. 'Open...' lists transfers-2026-04.csv, a .graphty recipe, a style file. No
characters file anywhere."

## 15-19 -- Paste...

    timeout 120 node app-b/study.mjs --try $D/15.png task:t29 --click "Data" --click "Add data" --click "Paste..."
    timeout 120 node app-b/study.mjs --try $D/16.png task:t29 --click "Data" --click "Add data" --click "Paste..." --click "Choose: GraphML or GEXF"
    timeout 120 node app-b/study.mjs --try $D/17.png task:t29 --click "Data" --click "Add data" --click "Paste..." --click "Choose: GraphML or GEXF" --click "Format"
    timeout 120 node app-b/study.mjs --try $D/18.png task:t29 --click "Data" --click "Add data" --click "Paste..." --click "Choose: GraphML or GEXF" --click "GEXF"
    timeout 120 node app-b/study.mjs --try $D/19.png task:t29 --click "Data" --click "Add data" --click "Paste..." --click "Choose: GraphML or GEXF" --hover "Format"

Think-aloud: "Paste finally shows my characters: Myriel, Napoleon, Mlle.Baptistine, two edges.
'Pasted, 8 lines.' Load is off, and it says why in words: 'Load is off: Pasted text: choose
GraphML or GEXF in File settings.' Honest, I appreciate that. I press 'Choose: GraphML or GEXF'
and a panel 'File settings: pasted text' opens, with Format, Ids, Stop reading. The Format box
ALSO says 'Choose: GraphML or GEXF' -- two controls with the same name, one opens the panel and
one is the setting. I cannot tell them apart. I press Format: nothing. I ask for GEXF: the panel
closes and nothing is chosen. Two silent controls in a row. I am not pressing keys at random in
an import dialog. I stop here."

## Verdict

- Did I succeed? No. The characters never got into my project. Every route I found either loaded
  someone else's file (door entries, bank transfers) into a NEW graph that replaced my project's
  name, or stalled at a format choice I could not make. Separately, the Data section showed the
  characters as already loaded when I had done nothing, which I do not trust.
- Single Ease Question: 2 out of 7.
- Would I use this instead of my current tool? Not for this. In Python, reading a GEXF file is one
  line and I know exactly what it read. Here the same words -- "Add data" -- led to three different
  places, the screen changed when I opened a menu, and the one place that had my data gave me two
  controls with one name. What I would keep: the match report and the "Load is off" sentence, which
  say in words what is wrong and how much. Those are better than what I get from NetworkX. They are
  not worth much if I cannot reach my own file.
