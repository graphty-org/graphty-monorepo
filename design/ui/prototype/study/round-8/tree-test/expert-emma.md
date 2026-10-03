# Tree test -- Expert Emma (network scientist, power user)

Participant: Expert Emma. Notebook person (networkx, igraph), Gephi for final figures. Reads
reference material, skips tours and samples, checks weights, parameters and exports first.
Material: the text outline of the app's navigation only. Confidence is 1 (pure guess) to 7 (certain).

Opening remark: "Before any task -- 'Local only (privacy)' is on the start screen and in the
header. Good. That is the first thing I look for. The usage data card I would read, then click No
thanks."

## tree-1 -- something ready-made to try it on

Path: Start screen > Samples (each sample, with one line on what it is good for)
Backtracking: none.
Ends at: Start screen > Samples.
Confidence: 6

"I normally skip samples, I would rather drop my own GraphML. But if I have nothing, that is the
obvious one. The one-line description had better say node and edge counts and whether it is
weighted, or I pick Karate club or whatever the classic is."

## tree-2 -- bring in a spreadsheet from Downloads, first launch

Path: Start screen > Start > looked at "Open project or file... (Ctrl+O)" > chose "New from data..."
Backtracking: hesitated between Open and New from data. A CSV is a file, so Open is plausible.
"New from data" reads as "build a network out of a table", which is what an edge list needs.
Would probably just drop it on the window if I had the folder open.
Ends at: Start screen > Start > New from data... (then the Data page)
Confidence: 5

"Two entries that may do the same thing. If both land on the Data page, fine. I want to see the
column roles -- From, To, Weight -- before it loads, and the Data page has that. Good."

## tree-3 -- which people the whole network depends on most

Path: Toolbar > Analyze (Shift+A) > Rank nodes and edges
Backtracking: briefly read "Measure the graph" -- that sounds like graph-level numbers (density,
components), not per node. Back to Rank.
Ends at: Toolbar > Analyze > Rank nodes and edges
Confidence: 6

"'Depends on most' is not a measure. I would pick betweenness, maybe articulation points if they
offer them. I expect to see the list of measures under Rank and the normalization written next to
each. If 'Rank' hides which centrality it is, I leave."

## tree-4 -- name beside each person, team under it

Path: Inspector > Style tab (nothing selected) > Label (+ adds a label line) -- add name, then
add a second line for team.
Backtracking: also saw Data > Attributes > an attribute's menu > Add label line. That is quicker:
right-click "name", Add label line; right-click "team", Add label line. Would probably use that
and check the order in the Inspector.
Ends at: Inspector > Style tab > Label
Confidence: 5

"Two places to do the same thing. Fine, as long as they are the same list. 'Label line' implies
multiple lines, which is what I want. I need to know the second line goes under the first and
not after it."

## tree-5 -- try a different arrangement of the tangle

Path: Toolbar > Layout > Method
Backtracking: none. Also noticed Inspector > Layout tab > Method; same thing.
Ends at: Toolbar > Layout > Method
Confidence: 6

"And Seed is right there. Good -- I want to set it so I can get the same picture twice. Though
for a tangle I would rather have the adjacency matrix. I did not see one anywhere in this
outline."

## tree-6 -- picture of the drawing for tomorrow's slides

Path: Header > Project name > Export... (Ctrl+E) > Image
Backtracking: none.
Ends at: Header > Project name > Export... > Image
Confidence: 6

"Honestly I would take a screenshot. But Export > Image, and I hope it offers SVG and keeps the
legend."

## tree-7 -- the computed scores for every person, in Excel

Path: Header > Project name > Export... > Data -- then backed out to Table (Shift+T) > Table
options (...) > Export table as CSV...
Backtracking: "Data" under Export might be the raw input I loaded, not the computed columns. I
cannot tell. The Table is where the computed columns would be visible, so I would check the
columns are there and export from the Table.
Ends at: Table > Table options > Export table as CSV...
Confidence: 5

"Export as CSV is fine, Excel opens it. I need to know whether Export > Data includes the scores.
Two exports and I do not know which carries the analysis columns. Also, the time slider is
hidden under 'Table options' -- odd neighbor for an export command."

## tree-8 -- stop now, carry on exactly here tomorrow

Path now: Header > Project name > Save (Ctrl+S)
Path tomorrow: Start screen > Recent projects > (this project)
Backtracking: considered Views > Save view (+) to keep the camera and what was shown. Not sure
Save keeps that, or the layout positions, or the Table state.
Ends at: Save now; Start screen > Recent projects tomorrow.
Confidence: 6

"Ctrl+S, then I would check it actually wrote something -- I have used a Save that did not save.
Version history exists, which reassures me. Whether 'exactly where I am' includes the camera and
the selection, I would only find out tomorrow."

## tree-9 -- leave out small ties in every number and drawing from now on

Path: Rail > Data > Filters (+ adds a step) -- a step on weight above some threshold, box ticked.
Backtracking: noticed "Full graph (filter)" in the header first and wondered if that is where
filters are set. It looks like an indicator, so went to Data > Filters. Also considered an edge
weight column's menu: Data > Attributes > weight > Filter to... -- that might create the same
step.
Ends at: Rail > Data > Filters
Confidence: 4

"My real question is whether analyses run on the filtered graph or on the full one. 'Full graph'
in the header suggests the app knows the difference, which is promising. But nothing here says
'every number' respects the filter. If PageRank ignores my threshold I would not know until the
numbers disagree with my notebook."

## tree-10 -- a colleague's saved colors and settings, no data

Path: Main menu (three lines) > Apply recipe or style file...
Backtracking: none; also listed under Project name.
Ends at: Main menu > Apply recipe or style file...
Confidence: 6

"'Recipe' is a marketing word but 'style file' says it. I would expect it to tell me which
attributes it needs and which ones my network lacks."

## tree-11 -- select everyone matching a typed rule

Path: Toolbar > Quick actions (Ctrl+K) first, typed "select" -- then, in the outline, Main menu >
Select where...
Backtracking: looked at Data > Attributes > Select where (this attribute) is... -- one attribute
only, so not a rule with "and". Considered Data > Filters but I want to select, not filter. Ended
at Select where... in the main menu.
Ends at: Main menu > Select where...
Confidence: 5

"Strange place for it, between Version history and Settings. I would not have found it by
browsing; the keyboard palette would have. I hope it takes an expression and not a stack of
dropdowns. If it is dropdowns I go back to pandas."

## tree-12 -- add this week's swipes to last week's list

Path: Rail > Data > Sources > last week's file > Add rows from file...
Backtracking: none.
Ends at: Rail > Data > Sources > (file) > Add rows from file...
Confidence: 6

"That is exactly the wording. I would then check the row count went up by the right amount and
that duplicate swipes are not merged without telling me."

## tree-13 -- rerun everything built on March on April's numbers

Path: Rail > Data > Sources > March's file > Replace with file...
Backtracking: first thought of Export > Recipe and then Apply recipe on a new project with April
-- that is the reproducible way, like a script. But the task says in place of March, so Replace.
Then I would check whether the runs re-ran on their own, or whether I must right-click each row
in Graph and Rerun.
Ends at: Rail > Data > Sources > (March file) > Replace with file...
Confidence: 4

"I do not know if Replace re-runs the communities and rankings or leaves the old results stuck
to new nodes. That is precisely the silent-stale-number problem I worry about. I would want a
message saying 'these 5 results were rerun with the same parameters and seed'."

## tree-14 -- repeated person-building pairs count as stronger ties

Path: Rail > Data > Sources > the swipe file > Edit source... > Data page > The chosen table >
One edge per: Pair, then Weight.
Backtracking: first looked at Data > Attributes > weight > Read as... but there is no weight
column; the weight is the count. "One edge per: Row | Pair" is the thing -- Pair collapses
repeats. Then I need Weight set to the count of rows.
Ends at: Data page > The chosen table > One edge per: Pair, and Weight
Confidence: 4

"I am guessing that Pair plus Weight means 'weight = number of rows for that pair'. It could
also mean 'sum a column'. And 'in every analysis' -- I would check that Rank and Find groups
actually say they used the weight. I check weights everywhere; I was burned before. Also: a
person and a building is a bipartite graph. I did not see anything about a projection."

## tree-15 -- see one coloring result alone, without deleting the others

Path: Rail > Graph > the list of rows > Rows added by Analyze -- right-click the one I want >
Show only this row.
Backtracking: considered clicking the eyes off on every other row, which works but is tedious
and I would have to remember which were on.
Ends at: Rail > Graph > (a row's right-click menu) > Show only this row
Confidence: 6

"Good. I hope clicking it again brings the others back as they were."

## Overall remarks

- Strong: privacy is stated on screen; Seed sits beside Layout Method; Data page shows column
  roles before Load; Add rows from file and Replace with file say what they do.
- Weak: two exports (Export > Data vs Table > Export as CSV) with no clue which has the computed
  scores; Select where... buried in the main menu; no stated rule that filters apply to analyses;
  Replace with file does not say what happens to existing results.
- Missing for me: no API or notebook entry anywhere in the outline; no adjacency matrix view; no
  degree distribution plot unless it hides in "Measure the graph".
