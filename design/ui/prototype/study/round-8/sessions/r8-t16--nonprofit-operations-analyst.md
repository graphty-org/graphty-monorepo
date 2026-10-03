# Session: nonprofit operations analyst ("Grace"), task r8-t16

Task as given by the moderator: "A coworker started a new, blank project for you in this program
and then left for the day. It has nothing in it yet. Get your list of connections into it."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t16--nonprofit-operations-analyst/.

## Step 1 -- the start screen (shots/tasks/r8-t16/01.png)

Think-aloud: "OK, 'Untitled project'. Empty. There's a box right in the middle that says 'No nodes
to draw -- This graph is empty' and a blue 'Add data...' button. I don't know what a node is but
'Add data' is what I want. There's also an 'Add data' link on the left and one on the right. Three
of the same thing, fine, I'll take the big blue one. 'Local only' up top -- I hope that means it
isn't sending my donor list anywhere."

## Step 2 -- click "Add data..." (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t16 --click "Add data..."

(The tool noted two controls are named "Add data..."; it clicked the button.)

Think-aloud: "A little black list popped up over on the LEFT, not by the button I clicked. Took me
a second to find it. 'Choose a file': 'Data file: CSV, JSON, GEXF or GraphML', 'Recipe:
mule-ring-triage.graphty', 'Style file: risk-review-look.json'. I don't know what a recipe or a
style file is and those names look like somebody else's files. CSV I know -- that's my export. The
left panel also switched to something called 'Data' with 'Sources' and a gray sentence about a
filter and 'the eye in the Graph tree'. Ignoring that."

## Step 3 -- pick the CSV (03.png)

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML"

Think-aloud: "Wait, the file name is 'transfers-2026-03.csv' and it's full of account numbers and
dollar amounts. That's not my board list. (Moderator note: the prototype always opens this sample
file; she was told to treat it as hers.) OK, pretending this is my export.

It shows me my columns, like Excel. Good. The first column says 'From -> node', the second 'To ->
node', and amount and timestamp say 'Attribute'. I think it's saying column one connects to column
two -- that's right, person in one column, organization in the other. I didn't have to rename my
headers to Source/Target, which I was dreading.

Bottom section: '9,113 rows.' -- I'd check that against Excel's row count, and it's the number I'd
expect. 'The data stays on this computer: nothing is uploaded.' THANK you, that's the sentence I
was looking for. '9,113 rows became 9,113 edges.' and '3,000 nodes of type node' -- 'nodes of type
node' is gibberish to me, but I get that it found 3,000 names and nobody was dropped. That's what I
care about.

Things I don't follow: 'Makes node --transfers-2026-03 (9,113)--> node' looks like code. 'Each row
is a node / an edge / node to node', 'One edge per Row / Pair', 'Weight', 'Directed /
Undirected'. I'm leaving all of that alone because it already says everything matched. Also the
top bar says 'Open as a new graph' -- my coworker made me a project, does 'new' mean it's going
somewhere else? And the project name at the top changed by itself to 'Transfers, March 2026'. A
little nervous, but there's a big blue 'Load' button bottom right."

## Step 4 -- click "Load" (04.png)

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Load"

Think-aloud: "Something's there. Right side: 'Nodes 3,000', 'Edges 9,113 transfers'. Numbers match
the preview. So it's in.

But the picture is a big gray blob of little hexagons. No lines, no names. I expected the
spider-web thing with people's names on it. I can't put this on a board slide. 'Nothing is colored
or sized by a row' -- not sure what that means. Also the right side says 'Graph from 2 tables' --
I only gave it one file. Did it add something? Density, reciprocity, 'weak components',
log-log -- this is the data-overload part, I skip it."

## Step 5 -- check I'm still in my coworker's project (05.png)

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Load" --click "Transfers, March 2026"

Think-aloud: "Clicked the name at the top to see what happened to 'Untitled project'. Rename,
Save, Save as, Close project. OK, so it's the same project, it just renamed itself after my file. I
guess that's fine, I'd rather have picked the name. Nothing told me it saved -- I'd press Save
(Ctrl+S) out of habit before leaving. I'm calling it done: the list is in."

## Outcome

- Succeeded? Yes, I think so. The counts after loading match the rows in my file and the preview
  said no one was dropped.
- Single Ease Question: 6 of 7. Three clicks and the check of my numbers was right there. Lost a
  point for the file list popping up across the screen from the button, the code-looking line,
  'nodes of type node', the project renaming itself, 'from 2 tables' when I gave it one, and not
  knowing whether it saved.
- Would I use this instead of my current tool (Excel plus a whiteboard)? For getting the list in,
  yes -- it took my headers as they are and said in plain words that nothing is uploaded, which
  NodeXL-style add-ins never did for me. But I wouldn't switch yet: what came out is a gray blob
  with no names, and the thing I actually need is a picture my director can read. I'd come back
  for that before deciding.

## Problems noticed (participant's words, ranked by how much they bothered her)

1. After Load, the picture is an unlabeled gray hexagon blob -- not a network of named people. (Not
   a blocker for this task, but it's the first thing she sees and it doesn't look like "my list".)
2. "Graph from 2 tables" after loading one file -- makes her doubt what got loaded.
3. Project name silently changed from "Untitled project" to the file's name; preview header says
   "Open as a new graph" though she was told to fill an existing project.
4. The file chooser appeared over the left panel, far from the center button she clicked.
5. Jargon on the preview: "Makes node --...--> node", "3,000 nodes of type node", "One edge per
   Row / Pair", "Weight". She ignored them only because the report said everything matched.
6. No sign the project was saved.

Liked: her own column headers were accepted without renaming; "9,113 rows" to check against Excel;
"The data stays on this computer: nothing is uploaded."; "none is unconnected or dropped".
