# Session: "get your list of connections into a blank project" -- the class-project student (Dev)

Task as given by the moderator: "A coworker started a new, blank project for you in this program
and then left for the day. It has nothing in it yet. Get your list of connections into it."

Renders are in design/ui/prototype/tmp/round-8-sessions/r8-t16--class-project-student/.
Every command was run from design/ui/prototype. The prefix
`timeout 120 node app-b/study.mjs --try <dir>/NN.png task:r8-t16` is written `try NN` below.

## 01 -- start screen (shots/tasks/r8-t16/01.png)

Dev: "OK, reading everything. Top says 'Untitled project', so that's the one my coworker made.
Left side has Graph, Data, Views, Notes, Assistant. Middle has a card: 'No nodes to draw. This
graph is empty.' and a blue 'Add data...' button. There's also 'Add data to start' on the left and
'Add data...' on the right. Three of the same thing -- fine, at least it's obvious. The tutorial
says step one is import the spreadsheet, so: the big blue button."

## 02 -- click "Add data..."

    try 02 --click "Add data..."

(The tool noted two controls with that name and clicked the button in the middle.)

Dev: "A little black list popped up that says 'Choose a file' -- Data file: CSV, JSON, GEXF or
GraphML; Recipe: mule-ring-triage.graphty; Style file: risk-review-look.json. My spreadsheet is a
CSV, so the first one. I have no idea what a 'recipe' or 'style file' is and I don't want them.
The left panel also switched to 'Data' with 'Sources' and some grayed text about filters behind
the popup, which I can't really read."

## 03 -- pick the data file

    try 03 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML"

Dev: "Whoa, a big table. It says 'CSV, comma' -- good, the tutorial told me to make sure the
separator is comma and it already is. 'Each row is ... an edge' is highlighted -- that's the
'Edges table' thing from the tutorial, so that's right too. It figured out from_account is the
'From' node and to_account is the 'To' node, and the other columns are 'Attribute'.

Wait -- the file is called transfers-2026-03.csv and it's bank account numbers, not my family
list. I guess that's just what this demo gave me as 'my file', so I'll pretend.

Two things bug me. The top of the project changed from 'Untitled project' to 'Transfers, March
2026' all on its own. And the strip at the top says 'Open as a new graph'. My coworker made a
project for me -- is this making a NEW one instead of putting it in theirs? It doesn't say.

The bottom half is a 'Match report' and it's actually nice: 9,113 rows, 3,000 nodes, nothing
dropped, 9,113 rows became 9,113 edges. That's the 'did my import work' thing I always worry
about. Bottom bar: Direction -- 'As the file says' (grayed), Directed (picked), Undirected. The
tutorial said pick Undirected for our assignment."

## 04 -- choose Undirected

    try 04 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Undirected"

Dev: "Undirected is highlighted now and the little line at the top changed from '-->' to '--'.
Cool, I can see it took. Now 'Load'."

## 05 -- Load

    try 05 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Undirected" --click "Load"

Dev: "It loaded. Right side says 3,000 nodes, 9,113 transfers, Undirected, 1 component. Average
degree 6.08. So the numbers match the report. The picture though is a gray blob of little
hexagons -- not the dots-and-lines I saw in the Gephi video. Is that the graph? I guess so, it's a
lot of nodes. There's a note up top 'Nothing is colored or sized by a row', which I don't get, but
the tutorial does coloring later anyway.

The right panel says 'Graph from 2 tables'. I loaded ONE file. Where's the second table? That
makes me a bit nervous."

## 06 -- check whether this is still my coworker's project

    try 06 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Undirected" --click "Load" --click "Transfers, March 2026"

Dev: "Clicked the project name to see if 'Untitled project' is still around somewhere. The menu
has Rename, Open project or file, Save, Export, Apply recipe or style file, Version history, Save
as, Close project. No list of projects, no 'Untitled project'. So I think it just renamed the
project my coworker made and put my data in it. I'm going to Save so it's not lost."

## 07 -- Save

    try 07 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Undirected" --click "Load" --click "Transfers, March 2026" --click "Save"

Dev: "A little 'Saved' bubble at the bottom. The menu is still open though, which is weird -- I'd
have expected it to close. But it saved. I'm done."

## Debrief

- **Succeeded?** "Yes, I think so. The numbers on the right match my file, it's undirected like
  the tutorial says, and it saved. I'm only mostly sure it went into my coworker's project and
  not a new one, because the screen said 'Open as a new graph' and the name changed by itself."
- **Single Ease Question:** 6 of 7. "It was basically: big button, pick CSV, Load. It even did the
  comma and the edges-table thing for me. One point off for the name changing and the 'new graph'
  and '2 tables' stuff that made me second-guess it."
- **Would I use this instead of my current tool?** "For the import part, yes. In Gephi I always
  mess up the Import As / separator screen and only find out later, and here the report told me
  nothing got dropped before I clicked Load. But I haven't seen if I can do the rest of the
  assignment -- sizing by degree, communities, labels, export -- and the hexagon blob doesn't look
  like the figures in the tutorial, so I'd need to see that before switching."

## What got in the way (observer notes, in plain terms)

1. The import screen's header says "Open as a new graph" while the task was to fill an existing
   blank project; the participant could not tell whether the data went into the coworker's
   project or a new one. (severity: medium)
2. The project title changed from "Untitled project" to "Transfers, March 2026" without the
   participant doing anything; he read it as a possible sign of a different project. (medium)
3. After loading one CSV, the graph header reads "from 2 tables"; he loaded one file and worried
   that something extra came in. (medium)
4. The loaded graph draws as a gray hexagon density blob rather than nodes and lines; he was not
   sure it was the graph. (low-medium)
5. "Nothing is colored or sized by a row" floats over the canvas with no explanation he could
   follow. (low)
6. The project menu stays open after Save. (low)
7. The file chooser lists "Recipe" and "Style file" next to the data file; unknown words for a
   newcomer, though he ignored them. (low)

## What worked

- The empty-state card's "Add data..." was the obvious first move.
- The import screen guessed comma separator, "each row is an edge", and the from/to columns --
  exactly the three settings his course tutorials warn students to set by hand.
- The match report ("9,113 rows became 9,113 edges", none dropped) answered his standing fear of
  not knowing whether the import worked.
- Choosing Undirected visibly changed the arrow in the "Makes" line.
