# Session: bring this week's door swipes in alongside March's -- intelligence analyst (Marcus)

Task as given: "Facilities just sent this week's door swipes from the new wing. Bring them into
this project alongside March's. The data on screen is a sample: a company's door swipes, people
and buildings. If that is not your line of work, treat it as your own records of who touched
what."

Start screen: shots/tasks/t28-doorentries/01.png
Renders: tmp/round-7-sessions/t28-doorentries--intelligence-analyst/02.png .. 14.png
All commands run from design/ui/prototype; D=tmp/round-7-sessions/t28-doorentries--intelligence-analyst

## Step 1 -- start screen (01.png)

Think-aloud: "OK, 'Door entries, March 2026'. Hairball of grey dots, side panel says 412 people,
9 buildings, 1,306 edges. Fine. This is like getting a second month of tolls on a phone -- same
columns, more rows. I want them in the same chart, not a new one. I'm looking for Import, or a
drop zone. No Import button up top. There's 'Data' down the left, that's my best bet."

## Step 2 -- Data (02.png)

    timeout 120 node app-b/study.mjs --try $D/02.png task:t28-doorentries --click "Data"

"Good, this is the bones of it. Sources: people.csv, buildings.csv, entries.csv -- 4,212 rows.
That entries file is March's swipes. There's a plus next to Sources. That's 'add a file',
probably."

## Step 3 -- hover the plus (03.png)

    timeout 120 node app-b/study.mjs --try $D/03.png task:t28-doorentries --click "Data" --hover "Add source"
    -> nothing on screen is called "Add source"
    timeout 120 node app-b/study.mjs --try $D/03.png task:t28-doorentries --click "Data" --hover "Add"

"Tooltip says 'Add data to this graph'. That's exactly what I want. 'This graph', good -- not a
new one."

## Step 4 -- Add data to this graph (04.png)

    timeout 120 node app-b/study.mjs --try $D/04.png task:t28-doorentries --click "Data" --click "Add data to this graph"

"File, From a URL, Paste, Set collection. File. Facilities emailed it to me, it's on my desktop."

## Step 5 -- File... (05.png)

    timeout 120 node app-b/study.mjs --try $D/05.png task:t28-doorentries --click "Data" --click "Add data to this graph" --click "File..."

"Data file: CSV, JSON, GEXF or GraphML. It's a CSV. Pick that."

## Step 6 -- pick the CSV (06.png)

    timeout 120 node app-b/study.mjs --try $D/06.png task:t28-doorentries --click "Data" --click "Add data to this graph" --click "File..." --click "Data file: CSV, JSON, GEXF or GraphML"

"Hold on. Top says 'Open as a new graph'. Title bar changed to 'Transfers, March 2026'. The file
is transfers-2026-03.csv -- account numbers, dollar amounts. That's somebody's bank return, not
my door swipes. And I clicked 'Add data to THIS graph' and it's offering to make a NEW graph.
That's two things wrong on one screen. If I'd hit Load on autopilot I'd have a money chart where
my swipes should be. Cancel."

(Out of character: the picker is canned, so the wrong file is the prototype's stand-in. But the
"Open as a new graph" heading after "Add data to this graph" is what a user would read, and it
contradicts the button he pressed.)

## Step 7 -- Cancel (07.png)

    timeout 120 node app-b/study.mjs --try $D/07.png task:t28-doorentries --click "Data" --click "Add data to this graph" --click "File..." --click "Data file: CSV, JSON, GEXF or GraphML" --click "Cancel"

"'Load cancelled: nothing was loaded.' Good, at least it says so and March is still there.
Try it from the other end -- open March's entries file and see if I can tack the new week on
to it."

## Step 8 -- click entries.csv (08.png)

    timeout 120 node app-b/study.mjs --try $D/08.png task:t28-doorentries --click "Data" --click "entries.csv"

"'Edit: entries'. Now this I like, honestly. It tells me 25 badge numbers in the swipes aren't
in the people list, 7 rows hit a building B12 that isn't in buildings, and three IDs differ
only by leading zeros and were NOT merged. That's the kind of thing I'd normally find in Excel
an hour in. But nothing here says 'add more rows' or 'append'. There's a plus by Tables."

## Step 9 -- hover the Tables plus (09.png)

    timeout 120 node app-b/study.mjs --try $D/09.png task:t28-doorentries --click "Data" --click "entries.csv" --hover "Add table"
    -> nothing on screen is called "Add table"
    timeout 120 node app-b/study.mjs --try $D/09.png task:t28-doorentries --click "Data" --click "entries.csv" --hover "Add"

"'Add a table'. A table. I don't want a fourth table, I want more rows in the third one. But
fine, maybe it'll ask."

## Step 10-11 -- Add a table, File... (10.png, 11.png)

    timeout 120 node app-b/study.mjs --try $D/10.png task:t28-doorentries --click "Data" --click "entries.csv" --click "Add a table"
    timeout 120 node app-b/study.mjs --try $D/11.png task:t28-doorentries --click "Data" --click "entries.csv" --click "Add a table" --click "File..."

"File, URL, Paste again. File. ... A little box says 'Opens the file picker' and that's it.
Nothing opened. Nothing asked me whether this goes with entries or next to it."

## Step 12-13 -- the three-dot menu on entries.csv (12.png, 13.png)

    timeout 120 node app-b/study.mjs --try $D/12.png task:t28-doorentries --click "Data" --hover "More"
    (that showed the right panel's "More actions", not the one I wanted)
    hovered "entries.csv actions", "More actions for entries.csv", "Source actions" -> nothing on screen is called ...
    timeout 120 node app-b/study.mjs --try $D/13.png task:t28-doorentries --click "Data" --click "Actions for entries.csv"

"Rename, Replace with file, Edit source, Refresh. Replace -- no. Replace throws March away, and
March is what I'm comparing against. Refresh -- refresh from what? Facilities sent me a new
file, they didn't overwrite the old one. There is no 'Add rows from file', no 'Append'."

## Step 14 -- last try, Set collection (14.png)

    timeout 120 node app-b/study.mjs --try $D/14.png task:t28-doorentries --click "Data" --click "Add data to this graph" --click "Set collection..."

"'Set collection' -- I don't know what a collection is, but maybe that's 'a set of files that
are the same shape'. ... No. Same screen as before: 'Open as a new graph', the transfers file.
I'm done."

## Outcome

Gave up. I did not get this week's swipes into the chart with March's.

Did I succeed? No. I found where data comes in, and I found a very good checker for the file
that's already there, but I never found a way to say "these rows are more of entries.csv" --
the only per-file option is Replace, which would lose March, and the add-data path opened a
new graph even though the button said "this graph".

Single Ease Question: 2 out of 7.

Would I use this instead of what I use now? Not for this. In Excel I paste the new week under
March's rows and the pivot picks it up; in i2 I import the new sheet with the same import spec
and it lands on the same chart. Here, two out of three tries put me on a screen titled "Open as
a new graph", and the third offered to replace my March data. The match report on the existing
file is better than anything I have -- if adding the new week had shown me that same report for
both weeks together ("38 new badge numbers this week, 2 of them not in people"), I'd have been
sold. As it is I can't tell my sergeant "it's all in one chart", so it isn't.

## What stood out

- "Add data to this graph" leads to a screen headed "Open as a new graph". Those say opposite
  things; I trusted the second one and backed out.
- No append. The file's own menu has Rename, Replace with file, Edit source, Refresh. Nothing
  for "add this week's rows to this table". Replace is the only file action and it is the one
  that destroys the comparison I need.
- "Add a table" in the editor is the wrong word for what I want: a second week of swipes is not
  a new table, it's more rows of the same one.
- "Set collection..." means nothing to me, and it led to the same new-graph screen.
- Good: the Cancel toast said "nothing was loaded" -- I knew March was safe. And the match
  report on entries.csv (badge numbers not in people, leading-zero IDs not merged) is exactly
  the cleanup I usually do by hand.
