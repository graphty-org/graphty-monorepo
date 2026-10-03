# Session: Explorer Elena -- get my list of connections into a blank project

Participant: Explorer Elena (product manager, no graph training, lives in Sheets and Slides).
Task as given: "A coworker started a new, blank project for you in this program and then left
for the day. It has nothing in it yet. Get your list of connections into it."
Start screen: shots/tasks/r8-t16/01.png
Renders: tmp/round-8-sessions/r8-t16--explorer-elena/02.png to 07.png
All commands were run from design/ui/prototype.

## Step 1 -- the start screen (01.png)

"OK, 'Untitled project', and a card right in the middle: 'No nodes to draw. This graph is
empty.' and a blue 'Add data...' button. I don't know what a node is, but 'empty' and 'Add data'
I get. That's obviously the button. There's also an 'Add data' link on the left and another on
the right -- three of them, fine, they all probably do the same thing. Big blue one."

## Step 2 -- click the blue Add data (02.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t16--explorer-elena/02.png task:r8-t16 --click "Add data..."

(The tool noted "Add data..." matched two controls and clicked the button.)

"A little black menu popped up -- over on the LEFT, not where I clicked in the middle. That's a
bit jumpy, my eye had to go find it. And the left panel changed to something with 'Sources',
'filter step', 'Attributes'... I'll ignore that. The menu says 'Choose a file': 'Data file: CSV,
JSON, GEXF or GraphML', 'Recipe: ...graphty', 'Style file: ...json'. My list is a CSV export, so
the first one. I don't know what a recipe is and I'm not going to find out right now."

## Step 3 -- pick the data file (03.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t16--explorer-elena/03.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML"

"Oh, this is nice actually -- it shows me my spreadsheet. from_account, to_account, amount,
timestamp. It figured out the first column is 'From' and the second is 'To' all by itself, and
it says 'auto' next to them. The bottom part reads like a sentence: 9,113 rows, every row has
both ends, nothing dropped, 'The data stays on this computer: nothing is uploaded.' I like that
last bit, I can tell security that.

Two things make me nervous. The top-left now says 'Open as a new graph'. A NEW graph? My
coworker made me a project and I want the list IN that one, not a second one. And the project
name at the very top already changed from 'Untitled project' to 'Transfers, March 2026' before I
even said yes. So... is it putting it in my project or making another one? I can't tell. There's
also a strip of tiny options -- 'Each row is a node / an edge', 'One edge per Row / Pair',
'Direction' -- I have no idea what these mean, but they're already set to something, so I'll
trust the defaults. 'Top node: ACC-393859, in 907 transfers' -- neat, that's a fact I can use.

Blue 'Load' button bottom right. Going for it."

## Step 4 -- Load (04.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t16--explorer-elena/04.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Load"

"Something's there. It's a big gray blob made of little hexagons -- honestly it looks like a
honeycomb, not like the network pictures I've seen with dots and lines. I can't see a single
connection. Is that my data? The right side says 3,000 nodes, 9,113 transfers, so I guess the
data went in. The rest of that panel -- density 0.00101, reciprocity, weak components, a log-log
chart -- means nothing to me. There's a little bubble at top saying 'Nothing is colored or sized
by a row', which I don't understand either; it sounds like a warning but I don't know if I did
something wrong.

Also: 'Graph from 2 tables'. I gave it one file. Where did the second table come from?"

## Step 5 -- did it go into MY project? (05.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t16--explorer-elena/05.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Load" --click "Transfers, March 2026"

"I still want to know if this is my coworker's project. I clicked the name at the top. Rename,
Open, Save, Export, Version history, Save as, Close project. Nothing tells me 'this is the
project Sam made' or where it lives. There's only one project open, and there's no second tab or
anything, so I'll assume it's the same one and it just renamed itself after my file. I'd rather it
had asked -- if Sam named it something I'd be annoyed. Let me just save so it doesn't vanish."

## Step 6 -- Save (06.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t16--explorer-elena/06.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Load" --click "Transfers, March 2026" --click "Save"

"'Saved' popped up at the bottom. Good. The menu stayed open though, which is weird -- in Google
Docs a menu closes when you pick something."

## Step 7 -- curiosity about '2 tables' (07.png)

    timeout 120 node app-b/study.mjs --try tmp/round-8-sessions/r8-t16--explorer-elena/07.png task:r8-t16 --click "Add data..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Load" --click "from 2 tables"

"So now there's 'accounts, 3,000' and 'transfers, 9,113'. I think it made a list of the
accounts out of my two columns -- OK, that's kind of clever, but nobody told me. What actually
bothers me is that this screen doesn't match the one I said 'Load' on. Before, the columns said
'From -> node' and 'Weight: none (each edge counts 1)'. Now they say 'From -> account', and
amount is a 'Weight' with 'Stronger / Farther / Capacity'. Did it change my settings after I
agreed? Or is this just a different screen? If I were presenting numbers off this, I'd want to
know which version is true. I'm not touching anything here. Leaving."

## Outcome

Did I succeed? I think so: the data is in, it says 3,000 and 9,113, which sounds like my file,
and I saved it. I'm about 80 percent sure it's the project my coworker made and not a new one,
because the import screen said "Open as a new graph" and the name changed on its own.

Single Ease Question: 5 of 7. Getting the file in was easy -- one obvious button, a preview that
read my columns correctly, one Load. What cost points: not knowing if it went into the right
project, the "2 tables" surprise, the settings looking different after loading, and a result
that is a gray honeycomb instead of a picture of connections.

Would I use this instead of what I use now (a spreadsheet, and asking a colleague for a Flourish
chart)? For getting data in -- yes, this was far easier than the Gephi attempt that died at the
installer, and "nothing is uploaded" is a real plus. But I wouldn't switch yet: what came out
doesn't look like anything I could show in a meeting, and half the right panel is math words.
I'd come back if the first picture after Load actually showed me the shape.

## Problems observed (participant's words, moderator's severity guess 1 low - 4 blocking)

1. Import screen header says "Open as a new graph" while the task was to fill an existing blank
   project; the project title also changes from "Untitled project" to the file's name before Load.
   She could not confirm her data went into the coworker's project. Severity 3.
2. After Load, the setup screen shows different choices than the one she approved ("node" became
   "account"; Weight "none" became "amount"; a second "accounts" table appears). Looks like the
   app changed settings behind her back. Severity 3.
3. "Graph from 2 tables" after importing one file -- unexplained. Severity 2.
4. First picture is a dense gray hexagon blob; no visible connections. Severity 2 for this task
   (the data is in), higher for her real goal.
5. "Nothing is colored or sized by a row" reads like an error she caused. Severity 2.
6. The "Add data..." menu opens at the left edge, away from the center button she clicked; the
   left panel also switches underneath it. Severity 1.
7. Project menu stays open after choosing Save. Severity 1.
8. Right panel summary (density, reciprocity, weak components, log-log degree chart) is jargon to
   her. Severity 1 for this task.

## What she liked

- One obvious "Add data..." button on the empty screen.
- The preview recognized From and To columns by itself.
- "The data stays on this computer: nothing is uploaded."
- Plain-sentence match report ("every row has both ends", "none is dropped").
- "Top node: ACC-393859, in 907 transfers" -- a concrete fact before loading.
