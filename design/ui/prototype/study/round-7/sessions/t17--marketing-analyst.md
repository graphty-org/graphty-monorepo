# Session: send the ranking's scores to a spreadsheet -- Jordan, marketing network analyst

Task as given: "Send the characters' scores from the ranking your colleague made to a
spreadsheet, so you can work on them in Excel."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t17--marketing-analyst/.

## Start screen (shots/tasks/t17/01.png)

Think-aloud: "OK, a map, colored orange by PageRank, and a list on the left. 'The ranking
your colleague made'... there's PageRank highlighted, and a 'For the report' folder with
Betweenness in it, crossed-out eye. Probably one of those. I don't need the map, I need
numbers. There's a 'Table' tab at the bottom. Table first, export second. That's how every
tool works."

## Step 1 -- open the table

    timeout 120 node app-b/study.mjs --try .../01.png task:t17 --click "Table"

Think-aloud: "Good, a table. Label, group, Degree, PageRank, Rank by PageRank, Betweenness.
Sorted by degree. Valjean on top, fine, that's the obvious one -- he's the main character,
so I'll believe the rest. The one-line summary above the table ('Valjean is first on all
three measures') is actually handy for a slide. Now where's download?"

## Step 2 -- look for the table's three dots

    timeout 120 node app-b/study.mjs --try .../02.png task:t17 --click "Table" --hover "..."
    -> nothing on screen is called "..."
    timeout 120 node app-b/study.mjs --try .../03.png task:t17 --click "Table" --click "More"

Think-aloud: "I aimed for the dots next to 'Columns: 7 of 7' and got a menu for the
PageRank row on the left instead. Rename, Select top N, Show in table, Lock, Delete... no
export, no download. Wrong dots. There are three-dot buttons everywhere on this screen --
the left list, the right panel, the table. Which one is which?"

## Step 3 -- find the right menu

    timeout 120 node app-b/study.mjs --try .../04.png task:t17 --click "Table" --click "Table actions"
    -> nothing on screen is called "Table actions"
    timeout 120 node app-b/study.mjs --try .../04.png task:t17 --click "Table" --click "Table options"
    timeout 120 node app-b/study.mjs --try .../04.png task:t17 --click "Table" --click "Table menu"
    -> nothing on screen is called "Table menu"
    timeout 120 node app-b/study.mjs --try .../04.png task:t17 --click "Table" --click "Table options"

Think-aloud: "There. 'Time slider' greyed out -- don't care -- and 'Export table as
CSV...'. That's exactly the words I wanted. Also the right-hand panel just flipped to some
graph summary when I opened the menu. Weird, but whatever."

## Step 4 -- the export window

    timeout 120 node app-b/study.mjs --try .../05.png task:t17 --click "Table" --click "Table options" --click "Export table as CSV..."

Think-aloud: "First thing I read: 'Saved to this computer only; nothing is uploaded.' Good.
That's the question I always have to ask, and it's answered at the bottom of the window.

Format CSV, Scope Full graph, Table: Nodes. The preview is id, label, group, degree,
betweenness, betweenness_rank, betweenness_tie, results.louvain... and it runs off the
edge, so I can't see whether PageRank made it in. The heading says 'every attribute and run
result', so I'll take it on faith -- but I'll check in Excel.

Two things bug me. One: I clicked 'Export TABLE' and it's telling me 'Full graph,
every attribute'. The rows in the preview are Myriel, Napoleon, Mlle. Baptistine -- file
order, not my sorted table. I wanted what I was looking at. I can re-sort in Excel, so not a
deal-breaker, but if I'd filtered to my top 40 I'd want only those 40. Two: the yellow
'CSV cannot hold everything' box made me stop for a second -- then it's just about edges,
which I don't need. Bit alarming for nothing.

'Rank' and 'Tie' columns -- fine, the note says they stay numeric. Good, I hate when a
rank comes out as '1st'. 'Advanced' I'm not touching."

## Step 5 -- export

    timeout 120 node app-b/study.mjs --try .../06.png task:t17 --click "Table" --click "Table options" --click "Export table as CSV..." --click "Export"

Think-aloud: "'Exported les-miserables_nodes.csv to Downloads.' Done. File name makes sense.

Honestly I still don't know which of these was 'my colleague's ranking' -- PageRank, the
Betweenness in their 'For the report' folder, or something under Views I never opened. Since
the file has every score, it doesn't matter for this. If the file only had one ranking in it,
I could easily have sent the wrong one.

Side gripe: half my job now is exporting things from tools into Excel because Brandwatch
won't let me shape a report. At least this one gave me a plain CSV and not a picture."

## Outcome

- Did I succeed? Yes, I think so: a CSV with every character and all the scores, including
  the Betweenness and PageRank rankings, is in my Downloads. I'm not certain which ranking was
  the colleague's, but the file has all of them.
- Single Ease Question: 5 of 7. Table to export is the right path and the words were right
  once I found them, but I hit the wrong three-dot menu first, and the export ignored the
  sort I had on screen.
- Would I use this instead of my current tool? For this step, maybe. It's quicker than
  Gephi's data laboratory export and it plainly says nothing gets uploaded, which saves me an
  email to IT. But Brandwatch already hands me a CSV, so I'd only switch if the export kept my
  sort and filter, so the top N goes straight into the brief.
