# Session: send a colleague's ranking scores to a spreadsheet -- Analyst Alex

Task given by the moderator: "Send the characters' scores from the ranking your colleague made to a
spreadsheet, so you can work on them in Excel. The data on screen is a sample: characters of the
novel Les Miserables, linked when they appear in the same chapter. If that is not your line of work,
treat them as your own people or things."

All commands were run from `design/ui/prototype`. Renders are in
`tmp/round-7-sessions/t17--analyst-alex/`.

## Step 1 -- start screen (shots/tasks/t17/01.png)

Think-aloud: "OK, Les Miserables. Graph is colored by PageRank, sized by degree, and the PageRank row
is highlighted on the left. There's also a Betweenness row tucked in a 'For the report' folder with a
crossed-out eye. 'Ranking my colleague made' -- which one is that? Nothing says who made what. I'll
assume PageRank since it's the one selected. Anyway, I want numbers, so: the 'Table' thing at the
bottom. 'Columns: 7 of 7' tells me there's a table."

## Step 2 -- open the table

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t17--analyst-alex/02.png task:t17 --click "Table"
```

Think-aloud: "Good, a real table. 77 nodes -- matches the 77 in the summary. Columns: label, group,
Degree, PageRank, Rank by PageRank, Betweenness, and one more cut off. 'Rank by PageRank' -- that
looks like somebody's ranking. Fine. Now where's export? There are two '...' buttons. I'll rest my
mouse on one."

## Step 3 -- hover a "More" button

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t17--analyst-alex/03.png task:t17 --click "Table" --hover "More"
```

Think-aloud: "That's the '...' up in the right panel, 'More actions'. It's next to PageRank, which is
the ranking, so maybe export is in there."

## Step 4 -- open More actions

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t17--analyst-alex/04.png task:t17 --click "Table" --click "More actions"
```

Think-aloud: "Rename, Select top N, Show in table, Filter, Lock, Hide, Add note, Compare, Delete. No
export. 'Show in table' -- it's already in the table. So the measure itself can't be sent anywhere
from here. Weird, that's where I'd look first in Gephi's Data Laboratory. Try the table's own dots."

## Step 5 -- look for anything called Export, then name the table's "..."

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t17--analyst-alex/05.png task:t17 --click "Table" --click "Export"
# nothing on screen is called "Export"
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t17--analyst-alex/06.png task:t17 --click "Table" --hover "Table actions"
# nothing on screen is called "Table actions"
for n in "Table options" "More table actions" "Table menu" "Download"; do timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t17--analyst-alex/07.png task:t17 --click "Table" --hover "$n"; done
# "Table options" found; the other three: nothing on screen is called ...
```

Think-aloud: "No Export button anywhere visible. No download icon. It's hiding behind three dots with
no label. The one by the table is 'Table options'."

## Step 6 -- open Table options

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t17--analyst-alex/07.png task:t17 --click "Table" --click "Table options"
```

Think-aloud: "Two items: a grayed-out time slider and 'Export table as CSV...'. There we go. Two
clicks deep in an unlabeled menu, but it's there. Also, the right panel jumped from PageRank to the
graph summary when I opened this menu -- not sure why, but whatever."

## Step 7 -- Export table as CSV

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t17--analyst-alex/08.png task:t17 --click "Table" --click "Table options" --click "Export table as CSV..."
```

Think-aloud: "An Export window. Footer: 'Saved to this computer only; nothing is uploaded.' Good,
that's the first thing I'd check. Data, CSV, Full graph, Table: Nodes -- not edges, so the Gephi
thing where you ask for nodes and get edges isn't happening. It warns that edges won't be in the
node file -- fine, I don't want them.

The preview, though: id, label, group, degree, betweenness, betweenness_rank, betweenness_tie,
results.louvain... The table I was looking at had PageRank and 'Rank by PageRank'. The preview
starts with betweenness. So was the colleague's ranking betweenness all along -- the hidden one
'For the report'? The subtitle says 'every attribute and run result', so PageRank should be in
there too, cut off on the right. I can't scroll the preview to check. I'll trust it.

The note about rank being a whole number, 1 = highest, with a tie column so it stays numeric in a
spreadsheet -- that's actually considerate. Sorting in Excel will work. Export."

## Step 8 -- Export

```
timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t17--analyst-alex/09.png task:t17 --click "Table" --click "Table options" --click "Export table as CSV..." --click "Export"
```

Think-aloud: "'Exported les-miserables_nodes.csv to Downloads.' Done. Sensible filename."

## Wrap-up

- **Succeeded?** I think so. I have a nodes CSV in Downloads with the scores and a rank column. What
  I'm not sure of is which ranking was "my colleague's" -- nothing on screen said who made PageRank or
  Betweenness, and the table showed PageRank while the export preview led with betweenness. Since it
  says every run result is in the file, I'd find out in Excel. If my director asked "is this the one
  Sam made?" I couldn't answer from this screen.
- **Single Ease Question:** 5 of 7. What took longest was finding export: it's not on the ranking's
  own menu, there's no Export or download button anywhere visible, and it's behind an unlabeled
  "..." on the table bar. Once I found it, the dialog was clear and the local-only line was right
  where I needed it.
- **Would I use this instead of my current tool?** For this step, it beats Gephi: the Data Laboratory
  export is a wizard, and it's the one that gave me edges once when I asked for nodes. Here it
  defaulted to nodes, warned about the edges, and kept ranks numeric. But I'd still do the metrics
  in NetworkX until I've checked the numbers match. And I'd want Export on the ranking's own menu --
  that's where I looked first, and I do this every week.
