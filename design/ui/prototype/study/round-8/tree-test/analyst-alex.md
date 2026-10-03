# Tree test -- Analyst Alex

Participant: Analyst Alex, a data analyst who uses Python and Gephi. He saw only the text outline
of the app's navigation. Confidence is from 1 (a guess) to 7 (certain).

## tree-1 -- something ready-made to try

Path: Start screen > Samples.
"Samples, right there on the start screen. That's what I'd use anyway -- I'm not putting supplier
data in this until I know where it goes. I clocked 'Local only (privacy)' next to it, which is the
first thing I'd click after this."
End: Start screen > Samples. Confidence: 7.

## tree-2 -- bring in a spreadsheet from Downloads

Path: Start screen > Start. Two candidates: "Open project or file..." and "New from data...". I
don't have a project, I have a spreadsheet, so "New from data...". Could have been "Open ... file"
too; I would have tried either. Dropping the file in is fine but I'd want to see the privacy line
before I drop anything.
End: Start screen > Start > New from data... (then the Data page). Confidence: 5.
"Two buttons that both sound like 'bring a file in' -- I'd hesitate a second on which."

## tree-3 -- who the whole network depends on most

Path: Looked at the left rail first (Graph, Data, Views, Notes, Assistant) -- no "Analyze" or
"Statistics" there. Main menu -- no. Found Toolbar > Analyze. I'd type "betweenness" into
"Search, or say what to find". If that didn't work, "Rank nodes and edges".
End: Toolbar > Analyze > Search (typing betweenness), fallback Rank nodes and edges. Confidence: 6.
"Odd that the thing I came here to do is a bottom toolbar icon and not on the rail."

## tree-4 -- name beside each person, team under it

Path: Toolbar first -- nothing about labels. Inspector on the right > Style tab > Label (+ adds a
label line). Add one for name, add a second for team. Then I noticed the Data rail > Attributes >
an attribute's menu > "Add label line", which is probably quicker: pick "name", add label line;
pick "team", add label line. Not sure which one controls the order, i.e. that team ends up under.
End: Inspector > Style tab > Label (+), twice. Confidence: 4.
"'Style' and 'Paints' sound like a design tool. I found it, but I'd want a preview to know the
team line goes underneath."

## tree-5 -- try a different arrangement

Path: Toolbar > Layout > Method. (Also saw the Layout tab in the Inspector, same thing.)
End: Toolbar > Layout > Method. Confidence: 6.
"Fine. I'd want to know if it's going to take forever on a big one before I click."

## tree-6 -- picture for tomorrow's slides

Path: Project name > Export... > Image. (Main menu also has Export, same place.)
End: Export... > Image. Confidence: 7.

## tree-7 -- every person's scores in Excel

Path: Export... > Data. Then I stopped: does "Data" mean my original file back, or the computed
scores? I've been burned exporting the wrong table before. "Report" -- probably a PDF. Backtracked
to Table (bottom) > Nodes, where the scores should be columns, > Table options (...) > Export
table as CSV...
End: Table > Nodes > Table options > Export table as CSV... Confidence: 5.
"CSV is fine, Excel opens it. But 'Export > Data' should tell me if it includes the scores, or
I'll never trust it."

## tree-8 -- stop now, carry on tomorrow

Path: Now: Save (Ctrl+S) -- it asks where to save the first time, presumably. Tomorrow: Start
screen > Recent projects > click it.
End: Save now; Recent projects tomorrow. Confidence: 5.
"Saving is obvious. Whether my filters, colors and the layout are actually in that save, I won't
believe until I reopen it and see them. That's the Gephi thing."

## tree-9 -- leave out the small ties, everywhere, from now on

Path: Header > "Full graph (filter)" caught my eye first -- that looks like where filtering lives.
Then Data rail > Filters (+ adds a step), which is the actual list of filters. Add a weight
filter there.
End: Data rail > Filters > + (weight step). Confidence: 4.
"What I don't know is whether a filter changes the numbers or only the picture. The task says
every number. In Gephi filters change what statistics run on, sometimes. I'd need it to say so."

## tree-10 -- colleague's colors and settings file

Path: Main menu > "Apply recipe or style file...". The words "style file" match what they sent.
End: Main menu (or Project name menu) > Apply recipe or style file... Confidence: 6.
"Would it wipe my own colors or add to them? I'd want to know before I apply it."

## tree-11 -- select everyone matching a typed rule

Path: Toolbar > Analyze > "Search, or say what to find" -- 'find' sounded right, but that's for
algorithms. Backtracked. Rail > Graph > "Find rows and notes" -- no, that's searching a list.
Main menu > "Select where..." -- that's it, I think. (The attribute menu has "Select where (this
attribute) is..." but my rule has two columns, country and score.)
End: Main menu > Select where... Confidence: 4.
"Weird place for it, in the hamburger menu with Save and Settings. I'd have looked for a filter
bar."

## tree-12 -- add this week's swipes to last week's list

Path: Data rail > Sources > last week's file > its menu > "Add rows from file...".
End: Data > Sources > (file) > Add rows from file... Confidence: 6.
"That's the one. Hope it tells me how many rows it added and if any were duplicates."

## tree-13 -- rerun March's work on April's export

Path: First thought: is this a "recipe"? Export... > Recipe, then open April and Apply recipe.
That's two trips. Then looked at Data rail > Sources > March's file > "Replace with file..." --
that sounds like exactly "swap the data underneath and keep everything".
End: Data > Sources > (March file) > Replace with file... Confidence: 5.
"If 'Replace' keeps my groups and colors and reruns them, great. If it just dumps everything, I'd
lose an afternoon. The word 'Replace' with no undo makes me nervous -- I'd save first."

## tree-14 -- pairs that appear 40 times count more

Path: Data rail > Attributes > a column's menu > "Read as..." -- no, that's about the type.
Data rail > Sources > the swipe file > "Edit source..." > Data page > "One edge per: Row | Pair"
and "Weight". Pick Pair, so repeated rows collapse and presumably count into the weight.
End: Data > Sources > (file) > Edit source... > One edge per: Pair, Weight. Confidence: 4.
"'One edge per Pair' -- I think that's what I want, but I'm guessing the count becomes the
weight. I'd want it to say 'weight = number of times'."

## tree-15 -- see one coloring result alone for a moment

Path: Legend (L) first -- that's where the colors are explained, maybe I can toggle there. Not
listed. Rail > Graph > the list, "Rows added by Analyze, each with its eye". Right-click one >
"Show only this row". Or turn the others' eyes off.
End: Graph rail > the result's right-click > Show only this row. Confidence: 5.
"Calling my betweenness result a 'row' is confusing -- I think of rows as table rows. But the eye
icon I get, that's like layers in anything."

## Overall

Easiest: samples, export image, layout, adding rows from a file. Hardest: where the scores go out
to Excel (Export > Data vs the table), selecting by a rule (buried in the main menu), and
whether filters and weights change the numbers or just the drawing. The left rail's "Graph"
section is really a list of my results and sets, which the name does not tell me.
