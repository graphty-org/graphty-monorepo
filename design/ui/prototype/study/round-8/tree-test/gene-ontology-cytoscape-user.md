# Tree test -- Joaquin (Gene Ontology Cytoscape user)

Participant: Joaquin, computational biologist, ex-GO curator, weekly Cytoscape user (EnrichmentMap,
ClueGO, an old BiNGO install). Read only the text outline of the app's navigation. Answers in his
voice; confidence is 1 (pure guess) to 7 (certain).

## tree-1 -- something ready-made to try it on

Path: Start screen > Samples.
"Samples, with a line on what each is good for. That's it. I'd look for one that is a directed
hierarchy, not a social network, but that's my problem, not the menu's."
End: Start screen > Samples. Confidence 7.

## tree-2 -- bring in a spreadsheet from Downloads

Path: Start screen > Start. Two candidates: "Open project or file..." and "New from data...". A
spreadsheet is not a project, and "Open file" in Cytoscape opens a session, so I pick "New from
data...". Dropping the file would probably also work, but I don't trust drop on first use.
End: Start screen > Start > New from data... (expecting the Data page with column roles).
Confidence 6. The one doubt: whether "Open project or file..." would have done the same thing, and
then why are there two.

## tree-3 -- which people the network depends on most

Path: Toolbar > Analyze. "Measure the graph" sounds like whole-graph numbers (diameter, density).
"Rank nodes and edges" sounds like per-node scores -- betweenness, degree. "Depends on most" is
betweenness to me.
End: Toolbar > Analyze > Rank nodes and edges. Confidence 6. I'd want to see the word
"betweenness" inside before I believed it.

## tree-4 -- name beside each node, team under it

Path: In Cytoscape this is Style > Label mapping, so I go to the Inspector > Style tab > Label (+ adds
a label line). Add one line for name, a second for team. I also noticed the Data rail has an
attribute menu with "Add label line" -- probably the same thing from the other side.
End: Inspector > Style tab > Label (+). Confidence 5. Not sure whether, with nothing selected, the
Style tab is for all nodes or for something else. The attribute route (Data > Attributes > team >
Add label line) is my fallback.

## tree-5 -- try a different arrangement

Path: Toolbar > Layout > Method. There's also Inspector > Layout tab > Method; same thing, I assume.
I'm looking for a hierarchical, top-down option.
End: Toolbar > Layout > Method. Confidence 6.

## tree-6 -- picture for tomorrow's slides

Path: Project name > Export... > Image. (Main menu > Export... is the same item.)
End: Project name > Export... > Image. Confidence 7. I'd want SVG or PDF, not just PNG.

## tree-7 -- every person's scores in Excel

Path: First instinct, Project name > Export... > Data. Then I stop: "Data" could mean the network
file -- edges and nodes in GraphML or whatever -- not a table of scores. Backtrack. The scores are
columns in the node table, so: Table > Table options (...) > Export table as CSV... Excel opens CSV.
End: Table > Table options > Export table as CSV... Confidence 5. I'd check the CSV has the score
columns and not just the visible ones.

## tree-8 -- stop now, carry on tomorrow exactly here

Now: Project name > Save (Ctrl+S). Tomorrow: Start screen > Recent projects > this project.
"Exactly where you are" -- I'd wonder if the camera and the current selection come back. If not,
Views > Save view (+) before closing. I'm not doing both unless forced.
End: Save now; Start screen > Recent projects tomorrow. Confidence 6.

## tree-9 -- every number and drawing ignores the small ties from now on

Path: Header > "Full graph (filter)" catches my eye first -- it says filter, and it's at the top, so
maybe it is global. But it reads like a status, not a place to define a rule. Go to Data > Filters
(+ adds a step), add a step on edge weight above a cutoff, tick it.
End: Data > Filters (+). Confidence 4. My real worry: do the analyses run on the filtered graph or
on everything? In Cytoscape a filter only selects or hides; the numbers ignore it. Nothing in the
outline tells me which this is.

## tree-10 -- colleague's colors and settings file, no data

Path: Main menu (or Project name menu) > Apply recipe or style file...
"Style file" is the words I needed. I don't know what a recipe is but I don't need to.
End: Main menu > Apply recipe or style file... Confidence 6.

## tree-11 -- select everyone matching a typed rule (country X, score over 50)

Path: In Cytoscape I'd use the Select / Filter panel. Here: Data > Filters looked first, but that
hides things, I want them selected. Data > Attributes > country > "Select where (this attribute) is..."
only does one column. Back up to Main menu > Select where... -- that sounds like the general one.
Odd that selection lives in the main menu next to Save, but fine.
End: Main menu > Select where... Confidence 5.

## tree-12 -- add this week's swipes to last week's list

Path: Data > Sources > last week's file > its menu > "Add rows from file..." Not "Replace", not
Sources (+), which I'd guess adds a separate source.
End: Data > Sources > (file) > Add rows from file... Confidence 6.

## tree-13 -- April's export replaces March's, everything reruns

Path: Data > Sources > March file > Replace with file... That is the start. Whether the groups and
rankings then rerun on their own, I don't know; if not, each row on the Graph list has Rerun. I
briefly considered Export > Recipe then Apply recipe on April, because "recipe" sounds like "the
steps I did", and that's how I'd want it for reproducibility -- but replacing the file is fewer
steps.
End: Data > Sources > (March file) > Replace with file... Confidence 5. I'd want the program to tell
me which file each result was computed from afterward.

## tree-14 -- repeated person-building pairs count as heavier ties

Path: This is how the file is read, so: Data > Sources > the door-swipe file > Edit source... -> the
Data page > the chosen table. There is "One edge per: Row | Pair" and a "Weight" setting. Pair
sounds like collapsing the 40 rows into one edge; Weight sounds like where the count goes. I'd set
One edge per: Pair and then look at Weight hoping "count of rows" is an option.
End: Data page > chosen table > One edge per: Pair (then Weight). Confidence 4. Two controls that
might each be the answer, and I can't tell from the names whether pairing makes the count the
weight or just throws the duplicates away. "In every analysis" -- also not sure analyses use weight
by default.

## tree-15 -- see one coloring result alone for a moment

Path: Legend first, out of Cytoscape habit -- but the outline gives the legend no children. Back to
Graph rail > rows added by Analyze, each with an eye. Right-click a row > "Show only this row".
That's exactly the words.
End: Graph > (result row) > right-click > Show only this row. Confidence 6. I'd expect to toggle it
back and get all the others exactly as they were.

## Summary in his words

"Most of it I found where I'd expect. Three places I'd have to try it to know: whether a filter
changes the numbers or just the picture, how a repeated pair becomes a weight, and whether 'Export
Data' is my table or the network. Nothing here tells me yet whether it knows an edge has a type --
that's what I'd check first, and the outline doesn't say."
