# Tree test, round 8 -- participant: computational biologist (Dr. Chen)

Participant: a computational biologist who builds protein interaction networks. She uses Cytoscape and R/igraph every day and is skeptical of new tools. She saw only the text outline in round-8/tree.md. Her own words are in quotes. Confidence: 1 = pure guess, 7 = certain.

## tree-1 -- something ready-made to try
Path: Start screen > Samples.
"Samples, obviously. I wouldn't use it myself, I'd drop my own STRING export in, but fine." It says each sample has one line on what it is good for, which is the part she reads.
End: Start screen > Samples. Confidence 7.

## tree-2 -- bring in the spreadsheet from Downloads
Path: Start screen > Start. She reads "Open project or file..." and "New from data...". "Open project or file sounds like it wants a saved session. New from data is my spreadsheet." She picks New from data..., expects a file picker, and expects the Data page with column roles.
Note: "Or I'd just drag it in. That line is the most honest one on the screen."
End: Start > New from data... (then the Data page). Confidence 6.

## tree-3 -- who the whole network depends on most
Path: She looks at the rail first (Graph, Data, Views, Notes, Assistant). Nothing in it says analysis. "Assistant -- no." She moves to the Toolbar > Analyze. She hesitates between "Rank nodes and edges" and "Measure the graph". "Measure the graph sounds like diameter, density, the whole-network numbers. I want betweenness per node, which is a ranking." She picks Rank nodes and edges.
Note: "If it gives me degree first I'll be annoyed. 'Depends on' means betweenness or bottlenecks, not hubs."
End: Toolbar > Analyze > Rank nodes and edges. Confidence 5.

## tree-4 -- name beside each node, team under it
Path: "Labels are style." She goes to Inspector > Style tab > Label (+ adds a label line). Then she stops: the Inspector "shows what is selected, or the graph when nothing is". "So if nothing is selected, is that the default for all nodes? Or do I have to select all first?" She doesn't know. She scans further down and finds Data > Attributes > an attribute's menu > Add label line. "Oh. That's actually how I think: take the name column, make it a label. Then do the same with team and it goes underneath, presumably."
End: Data > Attributes > (name) > Add label line, then (team) > Add label line. Inspector > Style > Label would be her second try. Confidence 4: she is unsure which one applies to every node, and unsure the second line goes under the first.

## tree-5 -- try a different arrangement
Path: Toolbar > Layout > Method. "Method is the algorithm, I assume. Spring-embedded, whatever they call it here." She also saw Inspector > Layout tab > Method and expects the two to be the same thing.
End: Toolbar > Layout > Method. Confidence 6.

## tree-6 -- picture for tomorrow's slides
Path: Header > Project name > Export... > Image. "Image. I hope it offers SVG and not just a PNG of whatever is on screen." She also noticed Main menu > Export... and assumes it is the same.
End: Project name > Export... > Image. Confidence 6.

## tree-7 -- every person's scores in Excel
Path: She tries Project name > Export... > Data first. "Data -- but is that my input file back, or the table with the computed columns?" She isn't sure, so she backtracks to the bottom Table > Nodes > Table options (...) > Export table as CSV. "That's the Cytoscape 'export node table' I actually want. CSV is fine, Excel opens it." She worries that the measure columns might not be in the table by default, and expects to check under Columns.
End: Table > Nodes > Table options > Export table as CSV. Confidence 5.

## tree-8 -- stop now, carry on exactly tomorrow
Path: Today: Header > Project name > Save (Ctrl+S). "If it has never been saved I expect it to ask me where. Save as is there too." Tomorrow: Start screen > Recent projects > the project. If it isn't listed, Open project or file...
Note: "Exactly where I am" means the layout positions, the selection and the runs. "Session files have burned me. If it reopens with a different layout I'll know." She briefly wondered about Views > Save view, then decided that is about camera angles, not her work.
End: Save now; tomorrow Start screen > Recent projects. Confidence 6.

## tree-9 -- leave out small ties in every number and drawing
Path: "This is a confidence cut-off, like STRING 0.7." She first thinks about Data > Sources > the file > Edit source..., because that is the import step. She backs off: "I don't want to re-import, I want a threshold." She goes to Data > Filters (+ adds a step) and adds a step on the weight, keeping weight above some value. She notices Header > Full graph (filter) but reads it as a status. "It tells me I'm unfiltered. Maybe clicking it does the same thing."
Note: She is unsure whether a filter changes what the algorithms compute or only what is drawn. "If the betweenness is still computed on the full network, that's a different analysis, and I need to know which."
End: Data > Filters > + (a step on edge weight). Confidence 4.

## tree-10 -- a colleague's colors and settings file
Path: Main menu > Apply recipe or style file... "Style file I understand. Recipe I don't. Is that a Cytoscape style XML equivalent?" She takes it because "style" is in the name.
End: Main menu (or Project name menu) > Apply recipe or style file... Confidence 6.

## tree-11 -- select everyone matching a typed rule
Path: She first goes to Toolbar > Analyze > "Search, or say what to find". "Say what to find -- is that an AI thing? I'm not typing English into a box and trusting it." She backs out. She considers Data > Attributes > an attribute's menu > Select where (this attribute) is..., but it covers one column and she needs country AND score. She finds Main menu > Select where... "That reads like a query. That's the one, but why is it in the hamburger menu with Save?"
End: Main menu > Select where... Confidence 4.

## tree-12 -- this week's swipes into the same list as last week's
Path: Rail > Data > Sources > last week's file > its menu > Add rows from file... "Same columns, append rows. Yes." She also considered Sources (+ adds data), but "+ adds data" sounds like a second source, maybe a second network.
End: Data > Sources > (last week's file) > Add rows from file... Confidence 6.

## tree-13 -- rerun everything built on March with April's numbers
Path: Data > Sources > the March file > Replace with file... "Replace the input and keep the pipeline. That's what I'd want from an R script." She then wonders whether the groups and rankings recompute by themselves or whether she has to right-click each row in Graph and choose Rerun. She also looked at Apply recipe..., thinking "recipe" might mean the analysis steps, but she isn't sure and doesn't want to experiment.
End: Data > Sources > (March file) > Replace with file... Confidence 5 for the place, 3 that everything reruns without more clicks.

## tree-14 -- count repeated pairs as a stronger tie
Path: She first looks for a "weighted" switch in Toolbar > Analyze > Rank nodes and edges. "Cytoscape asks per algorithm." She finds nothing in the outline there. Then she goes to Data > Sources > the swipe file > Edit source... > the Data page. Under the chosen table she sees "One edge per: Row | Pair" and "Weight". "Pair, so the 40 rows collapse to one edge, and then Weight is presumably the count." She is unsure whether Weight offers "number of rows" or wants a column she doesn't have.
End: Data > Sources > Edit source... > One edge per: Pair, and Weight. Confidence 4.

## tree-15 -- see one result alone for a moment
Path: Rail > Graph > the list of rows. "Rows added by Analyze, each with its eye" -- so each result can be hidden. She would turn off the other eyes, then finds the right-click menu > Show only this row. "Row is a strange word. To me a row is a line in a table, not a betweenness run. But Show only this is what I want."
Note: She would check that turning the others back on restores them exactly.
End: Graph > (the result) > right-click > Show only this row (or the eyes). Confidence 5.

## Her overall remarks
- "The Data page is the part that knows what an analysis is. Weight, one edge per pair, directed or undirected -- good. I want it to show me the counts after Load."
- "Too many places to do the same thing: Export in two menus, Select where in two places, Method in two places. I'll stop trusting that they're the same."
- "'Row' for a result, 'recipe', 'say what to find' -- I had to guess what each one meant."
- "Nothing in this outline says R, Python or API. That's my first question and I still don't know the answer."
