# Tree test -- Marcus, criminal intelligence analyst

Participant: Marcus, 44, fusion center analyst, lives in i2 Analyst's Notebook and Excel.
Material: the text outline of the app's navigation only. Confidence is 1 (pure guess) to 7 (certain).

## tree-1 -- something ready-made to try it on

Path: Start screen > Samples.
"Samples. Good, no signup wall. I'd pick whichever one says it's a network of people, not a
molecule or whatever."
Ends: Start screen > Samples. Confidence: 7.

## tree-2 -- bring in the spreadsheet from Downloads

Path: Start screen > Start > "Open project or file..."? No -- I don't have a project, I have a
spreadsheet. Back up. Start > "New from data...". Takes me to the Data page, where I'd expect
to tell it which column is who: From ->, To ->, Time. That's what I want.
"Before I drop anything real in, I'm reading that 'Local only' thing on the start screen."
Ends: Start > New from data... (then the Data page). Confidence: 6.

## tree-3 -- who the whole network depends on most

Path: Left rail first -- Graph, Data, Views, Notes, Assistant. None of them says analysis.
Not touching Assistant. Bottom toolbar > Analyze. Now "Rank nodes and edges" or "Measure the
graph"? "Measure the graph" sounds like one number for the whole thing -- density or something.
I want people ranked. Rank nodes and edges. I'd expect betweenness in there, and if it's called
something else I want to be told which one it is.
Ends: Toolbar > Analyze > Rank nodes and edges. Confidence: 5.

## tree-4 -- name beside each person, team underneath

Path: Inspector > Style tab > Label (+). But the Style tab shows "what is selected" -- if I have
one guy clicked, am I labeling one guy or everybody? Nothing selected shows "Canvas", not
labels. Not sure. Back up. Data rail > Attributes > "name" > Add label line, then "team" > Add
label line. That reads like it does it for everybody, and the second one should go under the
first.
Ends: Data > Attributes > (name, then team) > Add label line. Confidence: 4.
Note: in i2 this is just the label on the entity type. Two places that sound like they do the
same thing makes me wonder which one wins.

## tree-5 -- a different way of arranging the tangle

Path: Toolbar > Layout > Method. That's the auto-arrange picker.
Ends: Toolbar > Layout > Method. Confidence: 6.

## tree-6 -- picture for tomorrow's slides

Path: Project name > Export... > Image. (Main menu has Export too, same thing I assume.)
Ends: Project name > Export > Image. Confidence: 6.

## tree-7 -- every person's scores in Excel

Path: Project name > Export > Data. That should be a CSV I can open in Excel -- but does
"Data" mean my original rows or the scores it worked out? Don't know. If the scores aren't in
it, I'd go to the Table at the bottom > Table options > Export table as CSV, since the table is
where I'd expect the score column to show up.
Ends: Export > Data (backup: Table > Table options > Export table as CSV). Confidence: 4.

## tree-8 -- stop now, carry on tomorrow exactly where I am

Path: Now: Save (Ctrl+S) from the project name menu. Am I also supposed to "Save view" so it
keeps where everybody is on the screen? Views rail > Save view, maybe, to be safe.
Tomorrow: Start screen > Recent projects > click it.
Ends: Save now; tomorrow Start screen > Recent projects. Confidence: 5.
"If it comes back and the chart has rearranged itself, I'm done with it."

## tree-9 -- leave out the small ties everywhere from now on

Path: Header "Full graph (filter)" caught my eye but it doesn't say what clicking it does. Data
rail > Filters (+ adds a step) -- add a step for weight over whatever. Does that count for the
scores too, or only the drawing? Outline doesn't say. I'll assume yes.
Ends: Data > Filters > + (a step on weight). Confidence: 4.

## tree-10 -- colleague's colors and settings file

Path: First thought: Settings. But Settings is General, Privacy, Performance -- that's the
program, not the look. Back. Main menu > "Apply recipe or style file...". "Style file" is the
colors. No idea what a recipe is. Going with that.
Ends: Main menu > Apply recipe or style file... Confidence: 5.

## tree-11 -- pick out everyone matching a typed rule

Path: Graph rail > Find rows and notes? That's searching the list, not the people. Back. Toolbar
> Analyze > "Search, or say what to find" -- sounds like an AI box, skip. Main menu > "Select
where...". That's it, like a filter in Excel.
Ends: Main menu > Select where... Confidence: 4.

## tree-12 -- this week's swipes in with last week's, one list

Path: Not "Open project or file" -- that'll make a second network. Data rail > Sources > last
week's file > Add rows from file...
Ends: Data > Sources > (the file's menu) > Add rows from file... Confidence: 5.

## tree-13 -- rerun everything from March on April's numbers

Path: Data rail > Sources > March file > "Replace with file..." and pick April. Then I'd hope
the groups and rankings update on their own -- or I go to the Graph rail and Rerun each row. I
saw "Apply recipe" earlier and maybe that's what a recipe is, but nothing says so.
Ends: Data > Sources > (March file) > Replace with file... Confidence: 4.
"I want March kept somewhere too. Replace sounds like March is gone."

## tree-14 -- 40 appearances together counts more than one

Path: Data rail > Sources > the swipe file > Edit source... gets me back to the Data page. There:
"One edge per: Row | Pair" -- Pair, so forty rows become one link. And then "Weight" -- but I
don't have a weight column, I want it to count the rows. Does picking Pair do the counting, or
do I have to set Weight too? I'd click Pair and then poke at Weight and hope it offers "count".
Ends: Data > Sources > Edit source... > One edge per: Pair (and Weight). Confidence: 3.

## tree-15 -- see one coloring result by itself for a moment

Path: Graph rail > the list of rows > the result's row > right-click > "Show only this row".
Or turn the other eyes off one at a time, but Show only is faster. Hope it doesn't stick.
Ends: Graph > (the result's row) > Show only this row. Confidence: 5.

## Overall

The start screen and Export are where I'd expect. The Data rail is doing a lot of work -- adding
files, filtering, labels -- and I wouldn't have guessed labels live there. Two spots worried me:
the header "Full graph (filter)" that says nothing about what it does, and "recipe", which I
never figured out.
