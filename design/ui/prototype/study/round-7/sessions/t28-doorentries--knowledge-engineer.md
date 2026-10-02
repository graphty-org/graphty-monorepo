# Session: add this week's door swipes alongside March's -- Dr. Min-ji Kim, knowledge graph engineer

Task as given: "Facilities just sent this week's door swipes from the new wing. Bring them into this
project alongside March's. The data on screen is a sample: a company's door swipes, people and
buildings. If that is not your line of work, treat it as your own records of who touched what."

Start screen: shots/tasks/t28-doorentries/01.png. Renders: tmp/round-7-sessions/t28-doorentries--knowledge-engineer/.
All commands were run from design/ui/prototype with
`timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t28-doorentries--knowledge-engineer/NN.png task:t28-doorentries ...`;
only the steps are listed below.

## Think-aloud

**Start.** "Door entries, March 2026." Summary on the right: 421 nodes, 412 person, 9 building,
1,306 edges, directed. Good, counts are labeled nodes versus edges. "Graph from 3 tables" is a
link. In my terms what I want is to append rows to the entries source, not to create a new kind
of thing. The provenance link is the honest place to start.

**01** `--click "from 3 tables"`. Table editor for entries. "person (412) --entries (1,306 edges
from 4,180 of 4,212 rows)--> building (9)". That header line I like. A real match report: 25
person ids not in people, 7 building ids not in buildings, a type mismatch between Number and
Category with 3 keys that differ by leading zeros "(not merged)". That is the kind of honesty I
ask for and rarely get. But nothing here says "add rows" or "append". There is a plus beside
Tables and a minus beside entries.

**02** `--click "from 3 tables" --hover "Add"`. Tooltip: "Add a table". Not quite what I want --
this week's swipes are more rows of the same table, not a new table. If I add a table, do I get a
second edge set, "entries" and "entries 2"? I will look anyway.

**03** `... --click "Add a table"`. Menu: File..., From a URL..., Paste...

**04** `... --click "File..."`. A toast "Opens the file picker" and nothing else. No picker, no
question about whether this file is new rows of entries or a new table. Dead end, first one.

**05** `--click "from 3 tables" --click "CSV, comma"`. File settings for entries.csv: format,
separator, id matching ("1 and "1" are one node", which is reasonable), stop after 100 errors. No
"also read" or "add file". Closed it in my head.

**06** `--click "Door entries, March 2026"`. Project menu: Rename, Save, Save as, Export, Apply
recipe or style file, Version history, Close project. No import here. Fine, that is project
housekeeping.

**07** `--click "Menu"`. Main menu: New project, Open, Open recent, Select where, Settings,
Keyboard shortcuts, Help. Open would replace the project. Not what I want.

**08** `--click "Data"`. Data panel: Sources (people.csv, buildings.csv, entries.csv "4,212 rows,
1,306 edges"), Filters, Attributes split into "In use" and "Other attributes". This is the panel I
expected. Each source has a "..." and Sources has a plus.

**09** `--click "Data" --hover "More"`. Got the tooltip of the inspector's "More actions" instead,
not the source row's. I could not find the name of the source row's button by hovering at first.

**10** `--click "Data" --click "Actions for entries.csv"`. Menu for entries.csv: Rename, Replace
with file..., Edit source..., Refresh. No "Add rows from file" or "Append". "Replace" is the
opposite of "alongside". If Facilities had sent me March plus this week in one file, Replace would
do, but they did not.

**11** `--click "Data" --hover "Add source"`. No tooltip appeared. The plus beside Sources gives
me no name.

**12** `--click "Data" --click "Add" --click "Set collection..."`. The Sources plus has File...,
From a URL..., Paste..., and "Set collection...". I hoped "collection" meant "several files that
are one table", which is exactly my case. Instead the title bar changed to "Transfers, March
2026" and the panel says "Open as a new graph" with a transfers-2026-03.csv of bank account
transfers. That is not my project and not my data. Why did adding a source to my door-entries
project open a new graph? Second unexplained failure.

**13** `--click "Data" --click "Add" --click "File..."`. A file chooser: "Data file: CSV, JSON,
GEXF or GraphML", a recipe, a style file. None of these is "this week's swipes", but the data
file is the only candidate.

**14** `... --click "Data file: CSV, JSON, GEXF or GraphML"`. Same as 12: "Transfers, March 2026",
"Open as a new graph". So adding a file from inside my project's Sources list starts a new
project. That is what I would call silently leaving my context, and I would be very nervous that
my door-entries project was just closed.

**15** `--click "from 3 tables" --click "Add a table" --click "Paste..."`. Now the title says "Les
Miserables" and again "Open as a new graph", with a pasted GraphML snippet. Every add path I find
leaves the project.

**16** `--click "Data" --click "Actions for entries.csv" --click "Replace with file..."`. One
last look, only to read what Replace offers. It says "Replace: transfers-2026-03.csv" under a
"Transfers, March 2026" title, with transfers-2026-04.csv. I started on door entries. I no longer
know which project I am in.

I stop here. That is three unexplained jumps into other graphs; my limit is two.

## Outcome

- Succeeded: no. I never found a way to add this week's file as more rows of entries, or even as a
  second edge table, inside the door-entries project. Every path that accepted a file opened a
  different graph ("Transfers, March 2026", "Les Miserables") as a new graph.
- Single Ease Question: 2 of 7.
- Would I use this instead of my current tool? Not for this job. Today I would append the week's
  CSV to March's in a notebook (pandas concat, check the key dtypes) and reload, which takes two
  minutes and I can see exactly what happened. What I would come back for is the match report: the
  "25 person_id values are not in people", the leading-zero warning and "4,180 entries became
  1,306 person-building edges" are better than what my triple store's loader tells me. If adding a
  file to an existing table showed that same report for the new rows -- how many new rows, how many
  new people and buildings, how many existing pairs gained swipes, any overlap in dates with March
  -- I would use it.

## What I would tell the designers, in my words

- "Alongside" means append. There is Replace, there is Add a table, there is no Add rows. Put
  "Add rows from file..." (or "Add file to entries") in the entries.csv menu.
- Adding a file from inside a project must not open a new graph. If it is going to, say so before
  I pick the file, and say what happens to the project I am in.
- The plus beside Sources has no tooltip I could find; the plus beside Tables says "Add a table",
  which is the wrong noun for my case.
- "Set collection..." told me nothing about what a collection is.
- When I add the second week, I want to know whether a swipe that appears in both files is
  counted twice. Silent de-duplication or silent double counting would both cost my trust.
