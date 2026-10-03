# Tree test -- Maren (genomics postdoc, Cytoscape user)

Participant: Maren, cancer genomics postdoc who uses Cytoscape a few times a month and follows its protocols literally. She calls it a "network", never a "graph", and "style" means visual mapping to her. She has never heard "layer" or "recipe" used about a figure. She saw only the text outline of the app.

Confidence is on a scale of 1 (pure guess) to 7 (certain).

## tree-1 -- something ready-made to try
Path: Start screen > Samples.
"There it is, Samples, with a line on what each one is for. I'd want one that is a gene network and not a karate club, but fine."
End: Start screen > Samples. Confidence: 7.

## tree-2 -- bring in the spreadsheet from Downloads
Path: Start screen > Start. I see "Open project or file..." and "New from data...". I don't have a project, I have a table, so "New from data...". Honestly I'd probably just drag the CSV onto the window first, because it says I can.
End: Start screen > Start > New from data... (or drop the file). Confidence: 6.
"If it then wants me to tell it which column is 'From' and which is 'To', fine, as long as it tells me how many rows matched."

## tree-3 -- who the whole network depends on most
Path: I'm looking for hub genes. Nothing says "hub". Toolbar > Analyze. Options: Rank nodes and edges, Find groups, Find paths, Measure the graph. "Measure the graph" sounds like it might be it, but it reads like one number for the whole network, density or something. "Rank nodes and edges" is the top-10 list I want.
End: Toolbar > Analyze > Rank nodes and edges. Confidence: 5.
"I'd want degree and MCC in there. If it only has names like eigenvector with no explanation I'll just take degree."

## tree-4 -- name beside each person, team under it
Path: This is style, so I look for the style panel. Inspector > Style tab > Label (+ adds a label line). Click +, pick the name column; click + again, pick the team column. Not sure if that applies to every node or only the one I have selected -- the outline says the Inspector shows the graph when nothing is selected, so I'd deselect first. I also notice Data > Attributes > an attribute's menu > Add label line, which might be quicker, but I'd find the Style tab first.
End: Inspector > Style tab > Label (+). Confidence: 4.

## tree-5 -- a different arrangement of the tangle
Path: Toolbar > Layout > Method. There's also a Layout tab in the Inspector. Either.
End: Toolbar > Layout > Method. Confidence: 6.
"Half the time it's still a hairball whatever you pick."

## tree-6 -- picture for tomorrow's slides
Path: Main menu (three lines) > Export... It doesn't show the choices from there, but I'd click it. Under the project name the same Export opens to Image, Video, Report, Recipe, Data. Image.
End: Project name (or Main menu) > Export... > Image. Confidence: 6.
"First thing I'd check in there is whether the legend comes out with it."

## tree-7 -- every person's scores, in Excel
Path: Export > Data first. Then I hesitate -- "Data" could just be my original file handed back, without the scores. In Cytoscape I export the node table, so I go looking for a table. Table (bottom) > Table options (...) > Export table as CSV... That one I trust, because I can see the score columns before I export.
End: Table > Table options > Export table as CSV... Confidence: 5.
"And then Excel turns SEPT2 into a date. Not this program's fault."

## tree-8 -- stop now, carry on tomorrow
Now: Main menu > Save (Ctrl+S). It's not clear where it saves to -- a file I choose, or somewhere inside the program. If it asks for a location I'd put it next to my analysis folder.
Tomorrow: Start screen > Recent projects > click it. If it's not listed, Open project or file...
End: Save now; Start screen > Recent projects tomorrow. Confidence: 5.

## tree-9 -- leave out the small ties, from now on, for every number and drawing
Path: In Cytoscape this is the STRING confidence cutoff. Here: header "Full graph (filter)" catches my eye first -- it says filter. Clicking it probably shows what's filtered, but I can't tell if I can set a cutoff there. Then Rail > Data > Filters (+ adds a step). Add a step: edge weight above some number, tick the checkbox.
Doubt: does a filter only hide edges in the picture, or do the rankings and groups also get recalculated without them? The outline doesn't say. I'd want it to say.
End: Rail > Data > Filters > + (add a step). Confidence: 3.

## tree-10 -- colleague's colors and settings file, no data in it
Path: In Cytoscape it's File > Import > Styles from file. Main menu > "Apply recipe or style file..." -- "style file" is the word I know. I have no idea what a recipe is, I'll ignore it.
End: Main menu > Apply recipe or style file... Confidence: 6.

## tree-11 -- pick out everyone matching a typed rule
Path: In Cytoscape this is the Select panel with filters, so I go to Data > Filters first. But that seems to take things away, not select them. Back out. Main menu > "Select where..." -- that sounds like typing a condition. There's also Analyze > "Search, or say what to find", which might do it too, but I don't want to type a sentence to a chatbot about my data.
End: Main menu > Select where... Confidence: 4.

## tree-12 -- this week's swipes into the same list as last week's
Path: My first instinct is Open project or file, but that would make a new network -- the task says no. Rail > Data > Sources. There's a + that "adds data", but I worry that adds it as a second separate table. Open last week's file's menu instead: "Add rows from file..." -- that's exactly appending.
End: Rail > Data > Sources > (last week's file) menu > Add rows from file... Confidence: 5.

## tree-13 -- run everything built on March on April's numbers
Path: Looked at "Apply recipe or style file..." because recipe sounds like it might be a saved set of steps, but I don't know that and I don't trust a word I can't define. Rail > Data > Sources > March file's menu > "Replace with file..." -- that's literally "in place of".
Doubt: does replacing the file rerun the groups and rankings, or do they just sit there showing March's results on April's network? There's a "Rerun" on each result row in the Graph list, so maybe I'd have to rerun each one myself. I'd check every one afterwards.
End: Rail > Data > Sources > (March file) menu > Replace with file... Confidence: 4.

## tree-14 -- pairs seen 40 times count as more tightly tied, in every analysis
Path: This is how the table is read, so back to where I brought it in. Rail > Data > Sources > (the swipe file) menu > Edit source... That should open the Data page. On the chosen table: "One edge per: Row | Pair" -- Pair, so the 40 rows become one edge. And "Weight" -- I'd guess that's where I say the count is the weight. I don't have a weight column, so I'm not sure Weight will offer "number of rows".
Before that I looked at Analyze for a weight option, but that would be per analysis and the task says every analysis.
End: Data > Sources > Edit source... > Data page > One edge per: Pair, then Weight. Confidence: 3.

## tree-15 -- see one coloring by itself for a moment
Path: In Cytoscape I'd switch styles, which isn't the same. Legend card first, since that's where the colors are listed -- but nothing in the outline under it. Then Rail > Graph > the list: "Rows added by Analyze, each with its eye". So these "rows" are my results. I could turn off the eyes of the others, but then I have to remember to turn them back on. Right-click the one I want > "Show only this row". That sounds right, if it's temporary.
End: Rail > Graph > (result) right-click > Show only this row. Confidence: 4.
"I'd never have called a result a 'row'. A row is a gene in my table."

## Overall
- Easy: samples, bringing in a file, export picture, layout, saving.
- Words that slowed me: "rows" for results, "recipe", "Measure the graph" vs "Rank". "Weight" with no column to point at.
- What I couldn't tell from the outline: whether a filter changes the numbers or just the picture, and whether replacing a file reruns what I built. Both are the kind of thing that silently goes wrong.
