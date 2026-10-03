# Session: rank characters by how much the network depends on them -- screen-reader analyst (Morgan Reyes)

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Have the program put the characters in order of how much the whole network depends on them,
and tell us the top three, in order, and what the order was based on."

All commands were run from design/ui/prototype. Renders are in
tmp/round-8-sessions/r8-t07--screen-reader-analyst/. Every command starts again from the start
screen; the steps before the last one replay the earlier path.

## Start screen (shots/tasks/r8-t07/01.png)

"Start, Recent projects, Samples. A usage-data request is at the bottom and asks first. It says
nothing is collected until I answer, and 'files are read on this computer and never uploaded'.
That's the first thing I'd ask about, so good. I'll say no, then open the Les Miserables sample:
77 characters."

## Step 1 -- open the sample (02.png)

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t07 --click "No thanks" --click "Les Miserables"

"It opened straight into a graph with a list on the left: PageRank (selected), Louvain, Shortest
paths, Density, and further down, under 'For the report', a Betweenness row that is hidden.
'How much the whole network depends on them' means betweenness to me: who sits on the paths
between everyone else. PageRank measures something else, and the program already chose it for me.
The legend says 'Color: PageRank', a range of numbers with no definition."

## Step 2 -- try to read Betweenness's data (03.png)

    ... --click "Betweenness" --click "Data"

(The tool reported "Data" matches two controls, a rail button and a tab.)

"Wrong 'Data'. Two things with the same name, and I got the side rail. Still, the summary I always
ask for is here in text: 77 nodes, 254 edges, undirected, weight is 'value, stronger', density
0.0868, 1 connected component. Good. Under attributes, 'betweenness' and 'degree' arrived with the
file, and PageRank is listed under Results. A betweenness that came with the file isn't one the
program computed, and I don't know how the file computed it."

## Step 3 -- the table (04.png)

    ... --click "Table"

"A real table: label, notes, group, degree, rank by degree, PageRank, and so on. It's sorted by
degree: Valjean 36, Gavroche 22, Marius 19, Javert 17. Above it is the line 'Valjean is first on
all three measures; Gavroche is in the top 3 on all three'. Which three? It doesn't say. Degree is
'who has the most co-appearances', not 'who the network depends on'. I want the program to compute
betweenness."

## Step 4 -- find Analyze (05.png, 06.png)

    ... --hover "Analyze"        -> tooltip "Analyze Shift+A"
    ... --click "Analyze"

"There's no Analyze in the left rail. The flask on the floating toolbar is called Analyze and has
a shortcut, Shift+A. I'll write that in my keystroke file. The dialog has a search box, a Recent
list, and 'Rank nodes and edges' with a one-line definition for each entry. PageRank carries a
'Start here' badge. I'm not letting a badge choose my measure. Betweenness: 'Which nodes sit on
the most shortest paths between o...', cut off. Next to it is a small clock icon with no name I
can hear. Closeness has one too."

## Step 5 -- choose Betweenness (07.png)

    ... --click "Betweenness"      -> went to the hidden list row behind the dialog; timed out
    ... --click "Betweenness Which nodes sit on the most"

"The first try reached the Betweenness row behind the dialog, not the entry in it. Same name
twice again. On the second try I got the settings: 'Which nodes sit on the most shortest paths
between others.' Weight: value (loaded weight). Higher means: Stronger / Farther / Capacity, each
explained. 'All 254 edges have value set; none is left out.' 'Betweenness reads a weight as
distance: it uses 1/value.' That's the most honest thing I've read in a graph tool this year.
It says outright what NetworkX would make me work out myself. What it doesn't say is whether the
result is normalized. Estimate: under a second. Run."

## Step 6 -- run it (08.png, 09.png)

    ... --click "Run"
    ... --click "Run" --click "Betweenness 2"

"Nothing was said aloud that I can tell. A new row appeared near the top called 'Betweenness 2',
with a progress bar. '2' because the file's betweenness already has the name? I didn't choose that
name and I can't tell the two apart by ear. I selected it and it's still spinning. The right-hand
panel still describes the whole graph, not my result. The dialog promised under a second.
That's my first dead end."

## Step 7 -- look for the result in the table (10.png, 11.png)

    ... --click "Run" --click "Table"
    ... --click "Run" --click "Table" --click "Columns: 9 of 9"

"Still nine columns, still sorted by degree. Nothing new. The column chooser lists only what came
with the file: label, group, betweenness, degree. And now 'Betweenness 2' has gone from the list
on the left as well. My run started, never told me it finished, and then disappeared. Second dead
end in a row. My rule says stop chasing the feature and go to the table."

## Step 8 -- fall back to the table's own betweenness column (12.png, 13.png)

    ... --click "Table" --click "betweenness"     -> the tool said it matched six controls; it hit "Show Betweenness" (the eye on the list row)
    ... --click "Table" --click "# Betweenness (full graph)"   -> nothing on screen is called that
    ... --click "Table" --click "Betweenness (full graph)"

"Six controls with nearly the same name: a show button, a column menu, the rank column, the list
row, and two headers. I hit the eye first. Then the column header itself, 'Betweenness (full
graph)', which sorted the table high to low:

    Valjean   0.570   #1 of 77
    Myriel    0.177   #2 of 77
    Gavroche  0.165   #3 of 77
    Marius    0.132   #4 of 77

I know these numbers. They're NetworkX's default betweenness for this graph: normalized and
UNWEIGHTED, to three places. So this column ignores the co-appearance weights. The run I set up
would have used 1/value as distance, and that could put the characters in a different order. The
caption above the table still says 'sorted by degree' while the arrow is on Betweenness. The screen
says two different things. And nothing tells me whether this column came with the file or the
program computed it, or with which settings."

## Answer given to the moderator

"Top three: Valjean, Myriel, Gavroche, in that order. Based on betweenness centrality, the share
of shortest paths between other characters that pass through each one. As far as I can tell it's
normalized and ignores the edge weights, because it matches NetworkX's unweighted numbers. The
program didn't tell me that. I worked it out."

## Did I succeed?

"Partly. I have the right three in the right order for unweighted betweenness, but I didn't get
the program to compute it. I read a column that was already there. The run I asked for showed a
spinner, never finished, and then vanished. If you wanted the weighted ranking the settings
dialog described, I don't have it."

Single Ease Question: 3 of 7.

## Would I use this instead of my current tool?

"Not instead of NetworkX. The summary panel and the Analyze settings are better than most tools
I've tried: they state direction, weight and the 1/value rule in plain words, and the table is a
real table I can sort. But my run disappeared with no message. Two different 'Data' controls,
two 'Table's, six things called 'betweenness'. A result is named 'Betweenness 2'. The caption
contradicts the sort. It's enthusiastic. I might use it to show a sighted colleague which
character I mean. For the numbers, my scripts stay."

## Problems noted (Morgan's words, for the record)

- My betweenness run never finished: a spinner, no announcement, no result in the table or the
  side panel, then the row vanished. The dialog had said under a second.
- The new result is named "Betweenness 2", which can't be told apart from the existing
  "Betweenness" by ear.
- Names that sound the same: two "Data" controls, two "Table" controls, six controls containing
  "betweenness"; the Analyze dialog's Betweenness entry has the same name as the list row behind it.
- The table caption says "sorted by degree" after I sorted by betweenness.
- "Valjean is first on all three measures" doesn't name the three measures.
- The table's betweenness column doesn't say whether it came from the file or was computed, or
  whether it's weighted or normalized; its numbers match unweighted, normalized NetworkX.
- Unnamed clock icons next to Betweenness and Closeness in Analyze.
- PageRank arrives preselected with a "Start here" badge, nudging toward a measure that doesn't
  answer "who does the network depend on".

## What worked

- The text summary on first open (nodes, edges, direction, weight, components) without running
  anything.
- The Analyze settings stated the definition, the weight, what "higher" means, that every edge
  has a weight, and the 1/value rule.
- The table is a real table, sortable by column, with a "#N of 77" rank column.
- "Files are read on this computer and never uploaded" on the start screen.
