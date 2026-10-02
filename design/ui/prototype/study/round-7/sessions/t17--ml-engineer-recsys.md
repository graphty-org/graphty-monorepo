# Session: export the colleague's ranking scores to a spreadsheet -- Chris, ML engineer (recommendation systems)

Task as given: "Send the characters' scores from the ranking your colleague made to a spreadsheet,
so you can work on them in Excel. The data on screen is a sample: characters of the novel Les
Miserables, linked when they appear in the same chapter. If that is not your line of work, treat
them as your own people or things."

Start screen: shots/tasks/t17/01.png. Renders: tmp/round-7-sessions/t17--ml-engineer-recsys/01.png to 05.png.
All commands run from design/ui/prototype; D=tmp/round-7-sessions/t17--ml-engineer-recsys.

## Step 0 -- looking at the start screen

Okay. Graph colored by PageRank, sized by degree, legend gives the range 0.0033 to 0.0754 -- good,
at least the color has a legend. Left list has PageRank selected, Louvain, shortest paths, a
watchlist, and a "For the report" folder with a Betweenness item that is hidden. "The ranking my
colleague made" -- PageRank is the obvious ranking here, it is the selected one. Could also be
that Betweenness in "For the report", nobody tells me who made what. I am not going to dig; I want
the numbers in a table first, and a table is where export usually lives. There is a "Table" at
the bottom.

## Step 1 -- open the table

    timeout 120 node app-b/study.mjs --try $PWD/$D/01.png task:t17 --click "Table"

Table opens under the canvas: 77 nodes, columns label, group, Degree (full graph), PageRank (full
graph), Rank by PageRank, Betweenness (full graph), and more off the right edge. "Columns: 7 of 7".
Good -- the scores are right there with a rank column and it says "full graph", so I know the
denominator. Now the export. There is a "..." next to the column count; that is where I would
expect it.

## Step 2 -- the table's "..." menu

    timeout 120 node app-b/study.mjs --try $PWD/$D/02.png task:t17 --click "Table" --click "Table options"

Menu: "Time slider -- this data has no time attribute" (disabled) and "Export table as CSV...".
That is exactly what I wanted. Took about ten seconds.

## Step 3 -- Export table as CSV

    timeout 120 node app-b/study.mjs --try $PWD/$D/03.png task:t17 --click "Table" --click "Table options" --click "Export table as CSV..."

Hm, it opened a big general Export dialog (Image, Video, Report, Recipe, Data) on Data. Format
CSV, Scope "Full graph", Table "Nodes", file shape Generic. Subtitle says "77 nodes, 254 edges --
every attribute and run result". So not "this table with my 7 columns" -- it is everything. Fine
for me, I would rather have too many columns than too few, but it is not what "Export table" said.

Warning box: CSV cannot hold the edges in the node table, pick Edges to keep them. Fair, honest,
and it gives the count. Footer: "Saved to this computer only; nothing is uploaded." That is the
line my privacy review wants to see. Good.

Preview header: id,label,group,degree,betweenness,betweenness_rank,betweenness_tie,results.louvain...
and then it is cut off. I came here for PageRank and I cannot see a pagerank column in the
preview. It is probably further right, but I cannot scroll the preview line and I am trusting it.
The ids are kept (id column first, then label) -- good, I need the original ids to join back.
The note about rank being a whole number with a tie column so it stays numeric in a spreadsheet
-- that is actually thoughtful, Excel would have mangled "1 (tie)".

## Step 4 -- check Advanced for a column picker

    timeout 120 node app-b/study.mjs --try $PWD/$D/04.png task:t17 --click "Table" --click "Table options" --click "Export table as CSV..." --click "Advanced"

CSV options: header names Generic/Gephi, separator comma/semicolon/tab, LF/CRLF, header row on,
"neutralize formulas" on. Sensible -- semicolon and CRLF matter for Excel on some locales. No
column picker, no way to see the full header. Okay, I will drop columns in Excel.

## Step 5 -- Export

    timeout 120 node app-b/study.mjs --try $PWD/$D/05.png task:t17 --click "Table" --click "Table options" --click "Export table as CSV..." --click "Export"

Toast: "Exported les-miserables_nodes.csv to Downloads". Done. Filename is reasonable.

## Verdict

- Succeeded? Yes, I think so: a node CSV with ids, labels and every computed score, saved locally.
  Two doubts. I never confirmed the PageRank column is in the file -- the preview header is cut off
  right where it would be. And I never confirmed PageRank is "the colleague's" ranking; the app
  does not say who made which result, so if they meant the Betweenness in "For the report", it is
  in the file anyway (I did see betweenness and betweenness_rank in the header).
- Single Ease Question: 6 of 7. Found it in three clicks where I expected it. Points off for the
  truncated preview and for "Export table" exporting the full graph rather than the table I was
  looking at.
- Would I use this instead of my current tool? For this job, no -- in a notebook it is
  `pd.DataFrame(nx.pagerank(G).items()).to_csv()` and I already have the graph there. But if a
  colleague did the analysis in this app and sent it to me, yes, this is how I would pull their
  numbers out, and the local-only promise plus keeping the original ids means I could join it back
  to my own tables. What would make me trust it more: a full, scrollable header in the preview,
  a column picker ("only the columns shown in the table"), and Parquet as a format.
