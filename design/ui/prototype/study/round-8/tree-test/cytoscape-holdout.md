# Tree test transcript: Renata, the Cytoscape holdout

Participant: Renata, staff scientist, runs a core facility's network-analysis service, daily
Cytoscape user since the 2.x days. Saw only the text outline of the navigation. Spoken aloud,
lightly cleaned up.

Opening remark: "Fine. No File menu, I see. The three-line button is going to be my File menu,
I suppose. And the project name has its own menu with Save and Export on it too, so there are
two of those. Which one's the real one? Let's go."

## tree-1 -- something ready-made to try it on

Path: Start screen > Samples.

"Samples, with a line on what each is good for. Same as Cytoscape's starter panel with the
sample sessions. Easy."

Ended at: Start screen > Samples. Confidence: 7.

## tree-2 -- bring in the spreadsheet from Downloads

Path: Start screen > Start > Open project or file... (paused) > back > New from data...

"In Cytoscape it's File, Import, Network from File. Here there's 'Open project or file' and
'New from data'. A spreadsheet is a file, so Open would probably take it -- but 'open' makes me
think it wants a project. 'New from data' is the import. I'd click that. I want to see the column
types before anything is built."

Ended at: Start screen > Start > New from data... Confidence: 5.

## tree-3 -- which people the whole network depends on most

Path: Toolbar > Analyze > Measure the graph (paused) > back > Rank nodes and edges.

"That's centrality. In Cytoscape I'd run Analyze Network and get betweenness and the rest as
columns. 'Measure the graph' sounds like that, but it might be whole-network numbers -- density,
diameter. 'Rank nodes and edges' is per node. I'd go there and expect a list of measures,
betweenness at least. If it's just degree I'm not interested."

Ended at: Toolbar > Analyze > Rank nodes and edges. Confidence: 5.

## tree-4 -- name beside each person, team written under it

Path: Inspector > Style tab > Label (+ adds a label line).

"This is a passthrough mapping on Label. The Style tab has Label with a plus that adds a label
line, so line one name, line two team. My worry: the Inspector 'shows what is selected'. If I
have one node selected, am I labeling one node? That's a bypass, not a Style. So I'd click empty
canvas first so it's showing the graph, then add the lines. I also see 'Add label line' on an
attribute's menu under Data -- two ways in, fine, as long as they make the same thing."

Ended at: Inspector (nothing selected) > Style tab > Label. Confidence: 5.

## tree-5 -- try a different way of arranging the tangle

Path: Toolbar > Layout > Method.

"Layout menu, pick a method. There's the same thing on the Inspector's Layout tab. Before I touch
it I'd want Undo to cover it -- I see Undo in the header, we'll find out. 'Re-run layout' on the
canvas right-click is the same method again, not a different one."

Ended at: Toolbar > Layout > Method. Confidence: 6.

## tree-6 -- a picture of the drawing as it is, for slides

Path: Header > Project name > Export... > Image.

"Export, Image. For slides a PNG is fine. For a paper I'd be asking whether 'Image' means SVG
or PDF with real text, but not today."

Ended at: Project name > Export... > Image. Confidence: 6.

## tree-7 -- the computed scores for every person, in Excel

Path: Header > Project name > Export... > Data (paused) > back > Table > Table options (...) >
Export table as CSV...

"The scores are columns in the node table, so I export the node table. 'Export > Data' might be
the whole network in some graph format, which isn't what I want in Excel. The table has 'Export
table as CSV' -- that's the one. I'd check the CSV has every score column and the node ids
intact."

Ended at: Table > Table options > Export table as CSV... Confidence: 6.

## tree-8 -- stop now, carry on exactly here tomorrow

Path now: Header > Project name > Save (Ctrl+S). Tomorrow: Start screen > Recent projects > the
project.

"Save the session. Tomorrow, Recent projects. The question is what Save actually keeps -- the
node positions I dragged, the selection, the open table, the styles. It says 'project', so I'm
assuming it's the session, the whole thing. There's also 'Version history', which I'd look at
before I trust it. If the positions don't come back, it's a viewer, not a workspace."

Ended at: Save now; Start screen > Recent projects tomorrow. Confidence: 5.

## tree-9 -- from now on, every number and drawing counts only the large ties

Path: Header > Full graph (filter) (paused) > Rail > Data > Filters (+ adds a step).

"That's a filter on edge weight. 'Full graph (filter)' in the header looks like it's telling me
no filter is on, so filters must live somewhere -- Data, Filters, add a step, weight above
whatever. What I don't know is whether the analyses respect it or just the drawing. In Cytoscape
I'd make a subnetwork from the filtered edges so there's no doubt. Nothing here says 'make a new
network from this'. I'd go with Filters and then check a degree count to see whether it changed."

Ended at: Data > Filters. Confidence: 4.

## tree-10 -- colleague's saved colors and settings, no data, apply to the open network

Path: Header > Main menu > Apply recipe or style file...

"That's my styles.xml case. 'Style file' -- yes. I don't know what a 'recipe' is, and I'd want
to know whether my colleague's file is a recipe or a style file, but this is the item either
way. If it doesn't say which of their mappings didn't match my columns, I'm not using it."

Ended at: Main menu > Apply recipe or style file... Confidence: 6.

## tree-11 -- select everyone matching a typed rule (country and score over 50)

Path: Rail > Data > Filters (paused) > back > Data > Attributes > country's menu > Select where
(this attribute) is... (paused, it is one attribute) > back > Header > Main menu > Select where...

"In Cytoscape this is the Select panel, column filters, AND them together. My first stop is
Filters, but here filters seem to change what's shown, and I want a selection, not a hidden
network. The attribute menu has 'Select where' but that's one column. There's a 'Select where...'
in the main menu, between Version history and Show hidden elements, of all places. That's
probably the general one. Odd home for it."

Ended at: Main menu > Select where... Confidence: 4.

## tree-12 -- this week's badge swipes into the same list as last week's

Path: Rail > Data > Sources > last week's file's menu > Add rows from file...

"Append, not a new network. The source has 'Add rows from file' -- that's exactly it. I'd want
the match report to tell me how many rows came in and that no columns dropped."

Ended at: Data > Sources > the file > Add rows from file... Confidence: 6.

## tree-13 -- April's numbers in place of March's, everything rerun

Path: Rail > Data > Sources > March's file's menu > Replace with file...

"Replace with file. Then the question is whether the groups and rankings rerun by themselves or
I go down the Graph list and hit Rerun on each one. I see Rerun on a row's right-click. I'd start
at Replace and then check every row. In Cytoscape I'd be doing this from an RCy3 script, honestly."

Ended at: Data > Sources > the file > Replace with file... Confidence: 5.

## tree-14 -- 40 co-appearances should count as tighter than one, in every analysis

Path: Rail > Data > Attributes (looking for a weight column -- there isn't one yet) > back >
Data > Sources > the spreadsheet's menu > Edit source... > Data page > The chosen table > One
edge per: Row | Pair > Pair, and Weight.

"There's no column for it, so it's not an attribute thing; it's how the file is turned into
edges. Edit the source. On that page: 'One edge per: Row or Pair'. Pair, so the 40 rows collapse
into one edge, and then Weight -- presumably the count. I'm not sure 'Weight' there is the count
or a column I have to pick. And 'in every analysis' -- I'd have to trust each algorithm reads
that weight. In Cytoscape you pick the edge weight column in every app's dialog, separately."

Ended at: Data > Sources > Edit source... > One edge per: Pair + Weight. Confidence: 4.

## tree-15 -- see one coloring result by itself for a moment

Path: Rail > Graph > the list of rows > the result's right-click menu > Show only this row.

"Each result has an eye, so I could turn the others off one by one, but 'Show only this row' is
the solo button. I'd expect it to be a toggle that puts the others back. If it means 'show only
those nodes' instead of 'show only this coloring', that's a different thing, and I can't tell
from the name."

Ended at: Graph > a row's right-click menu > Show only this row. Confidence: 5.

## Closing remarks

"Most of it I found. Two menus that both have Save and Export is one too many -- I'd teach the
project-name one and forget the other. 'Select where' being in the main menu is the one I'd have
to look up every time. And I still don't know what a recipe is versus a style. If those are two
names for one thing, pick one. If they're different, tell me how."
