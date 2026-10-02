# Session: export the ranking's scores to a spreadsheet -- Expert Emma (network scientist)

Task as given by the moderator: "Send the characters' scores from the ranking your colleague made
to a spreadsheet, so you can work on them in Excel. The data on screen is a sample: characters of
the novel Les Miserables, linked when they appear in the same chapter."

Start screen: shots/tasks/t17/01.png. Renders: tmp/round-7-sessions/t17--expert-emma/NN.png.
All commands run from design/ui/prototype; each replays from the start screen.

## Step 1 -- look at the start screen

Think-aloud: "PageRank is selected in the list on the left and the right panel shows its style.
There is also a Betweenness row tucked in a folder called 'For the report', hidden. 'The ranking
my colleague made' -- I assume PageRank, since that is the one on screen. Scores into Excel means
a node table and a CSV. I see a 'Table' strip at the bottom with a '...' at its right. First I'll
try the Data tab of the PageRank panel; that should be the scores."

## Step 2 -- "Data" (meant the panel tab, got the left rail)

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t17--expert-emma/01.png task:t17 --click "Data"

Result: the Data section of the left rail opened (sources, filters, attributes) and the right
panel switched to the graph summary.
Think-aloud: "Not what I aimed at, but fine. 77 nodes, 254 edges, undirected, weighted by
'value', one component, a degree distribution log-log. Honest numbers up front, good. PageRank is
under Results, betweenness is just an attribute. Still no export here. Open the table."

## Step 3 -- open the table

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t17--expert-emma/02.png task:t17 --click "Table"

Result: node table, 77 nodes; columns label, group, Degree (full graph), PageRank (full graph),
Rank by PageRank, Betweenness (full graph), more off to the right. A sentence on top: "Valjean is
first on all three measures; Gavroche is in the top 3 on all three".
Think-aloud: "A node table with the computed columns and '(full graph)' on each. That is what I
want in Excel. Where's export -- the three dots next to 'Columns: 7 of 7'."

## Step 4 -- hunt for the table's menu

    timeout 120 node app-b/study.mjs --try .../03.png task:t17 --click "Table" --hover "More"
    -> showed the tooltip "More actions (Shift+F10)" on the right panel's three dots, not the table's
    timeout 120 node app-b/study.mjs --try .../04.png task:t17 --click "Table" --click "More actions"
    -> opened the PageRank row menu: Rename, Select top N, Show in table, Filter to, Lock, Hide in
       list, Add note, Compare with another row, Delete. No export.
    timeout 120 node app-b/study.mjs --try .../05.png task:t17 --click "Table" --click "Export"
    -> nothing on screen is called "Export"
    timeout 120 node app-b/study.mjs --try .../06.png task:t17 --click "Table" --hover "Table actions"
    -> nothing on screen is called "Table actions"
    (then hovered "Table options" -- exists; "More table actions", "Table menu" -- do not)

Think-aloud: "The PageRank row's own menu has 'Show in table' and 'Filter to' but no 'Export
these values'. That is where I'd expect it first: I am looking at the result, give me its numbers.
Then the dots by the table: three icons with three dots on this screen, and I'm guessing which is
which. Annoying, but I'd find it with the mouse in ten seconds in a real browser."

## Step 5 -- table options

    timeout 120 node app-b/study.mjs --try .../07.png task:t17 --click "Table" --click "Table options"

Result: a menu with a disabled "Time slider -- This data has no time attribute" and "Export table
as CSV...".
Think-aloud: "There it is. Why a time slider lives in the table's menu I do not know, but fine."

## Step 6 -- the export dialog

    timeout 120 node app-b/study.mjs --try .../08.png task:t17 --click "Table" --click "Table options" --click "Export table as CSV..."

Result: Export dialog, Data tab. "Full graph, 77 nodes, 254 edges -- every attribute and run
result -- CSV". Format CSV, Scope Full graph, Table Nodes (Edges, Adjacency also offered), File
shape Generic / Neo4j, Advanced. A warning that the node table leaves out edges. A preview:
id,label,group,degree,betweenness,betweenness_rank,betweenness_tie,results.louvain... (cut off).
Footer: "Saved to this computer only; nothing is uploaded." Copy and Export buttons.
Think-aloud: "This I respect. A plain statement that nothing is uploaded, a preview of the actual
header, a note that rank is a whole number and tie counts are their own column so Excel keeps it
numeric. Adjacency as an option -- nice. But the preview is cut off at 'results.louvain.' and the
first ranking I see in it is betweenness, not PageRank. Which was my colleague's ranking? The
folder says 'For the report' around Betweenness. It says every run result, so I'll trust both are
in and check in Excel. I am not opening Advanced to find out."

## Step 7 -- export

    timeout 120 node app-b/study.mjs --try .../09.png task:t17 --click "Table" --click "Table options" --click "Export table as CSV..." --click "Export"

Result: toast "Exported les-miserables_nodes.csv to Downloads".
Think-aloud: "Done. File name says what it is. I'd open it in pandas before Excel, but that's me."

## Verdict

- Succeeded? Yes, I think so -- the file has every computed column, so whichever ranking the
  colleague meant (PageRank or the Betweenness one in 'For the report') is in it. I could not
  confirm the PageRank column from the preview because the header was truncated.
- Single Ease Question: 5 of 7. The dialog was good; getting there was not. I expected export on
  the ranking itself, and the table's menu is three anonymous dots next to two other sets of
  three anonymous dots.
- Would I use this instead of my current tool? For the hand-off, yes: local-only stated in the
  dialog, a preview of the header, numeric rank and tie columns. That is better than Gephi's data
  laboratory export. For the analysis itself, no -- the notebook wins, and I still want an API so
  this is not a click path I have to repeat.

## Problems she hit

1. The ranking's own menu (row "More actions") has no export of its values; it has "Show in
   table" and "Filter to" but not "Export". (severity 2)
2. Three identical three-dot buttons on screen; the table's is only findable by guessing its name.
   (severity 2)
3. The export preview header is truncated before the PageRank column, so she could not confirm
   the ranking she was asked for was in the file. (severity 2)
4. "The ranking your colleague made" is ambiguous on screen: PageRank is selected, but Betweenness
   sits in a folder "For the report"; nothing says who made what. (severity 2)
5. A disabled "Time slider" item sits in the table menu, unrelated to the table. (severity 1)
