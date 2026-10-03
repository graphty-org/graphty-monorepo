# Tree test -- Morgan Reyes (screen-reader analyst)

Morgan read the outline the way they read any page: top level first, then down one branch at a
time. Morgan reads the outline as text. Whether a real screen reader can reach each item is a
separate question, and Morgan flags it where it matters. Confidence runs from 1 (a guess) to
7 (certain).

General remarks before the tasks, in Morgan's words:

- "The toolbar and the selection bar are 'icons, named by their tooltips'. If the tooltip is the
  accessible name, fine. If it only appears on mouse hover, that whole strip does not exist for
  me. I am assuming it is named."
- "'Each with its eye.' I hope the eye says what it does, and whether it is on or off, and not
  just 'eye'."
- "'Or drop a file anywhere in this window.' Not for me. As long as it is not the only way in."
- "Two menus both have Open, Save, Export and Apply recipe: the three-lines menu and the project
  name. I will use whichever I land on first, but I do not know why there are two."

## tree-1 -- something ready-made to try

1. Start screen. Read the headings: Start, Recent projects, Samples.
2. Samples. "Each sample, with one line on what it is good for" -- good, that is what I want. And
   a sample means I am not loading agency data before I know where files go.
3. Noted "Local only (privacy)" on the way past. That is the first thing I would read before
   loading anything real.

End: Start screen > Samples. Confidence 7.

## tree-2 -- bring in a spreadsheet from Downloads

1. Start screen > Start. Two candidates: "Open project or file..." and "New from data...".
2. The spreadsheet is not a project, it is data. "New from data..." sounds like what I want.
   "Open project or file" would probably also take it, but I would not bet on it.
3. That opens the Data page, I assume with a file dialog first. From the outline the Data page
   has Tables, the column roles, From and To. That is the right shape for an edge list.

End: Start > New from data... (then the Data page). Confidence 5. I would read "Local only"
first, before I pick the file.

## tree-3 -- which people the network depends on most

1. My word for this is betweenness. I look for "Analyze". Two places: the toolbar
   (Analyze, Shift+A) and right-click on a node > Analyze.... A node is the wrong scope; I want
   the whole network.
2. Toolbar > Analyze. Options: Rank nodes and edges, Find groups, Find paths and edge sets,
   Measure the graph.
3. "Measure the graph" made me hesitate. Is "depends on" a measure of the graph? No -- that
   sounds like whole-graph numbers, density and so on. I want a score per person, ranked.
4. Rank nodes and edges. I would expect betweenness inside it, and I want to be told whether it
   is normalized.

End: Toolbar > Analyze > Rank nodes and edges. Confidence 5. The extra two points would come if
"Measure the graph" were clearly the whole-graph numbers. From the name alone, I cannot tell.

## tree-4 -- name beside each person, team under it

1. First thought: this is about the drawing, so the Inspector > Style tab > Label (+ adds a label
   line). But the Inspector shows what is selected. With nothing selected it shows "the graph",
   so maybe that works for everyone. Not sure.
2. Then I saw Data > Attributes > an attribute's menu > "Add label line". That is plainer: go to
   the name attribute, Add label line; go to the team attribute, Add label line.
3. "Under it": I assume the second line goes under the first. Nothing in the outline says how
   to reorder lines if I get them backwards.

End: Data > Attributes > name > Add label line, then team > Add label line. Confidence 4. Two
places for the same job, and the order of the lines is a guess.

## tree-5 -- try a different arrangement

1. Toolbar > Layout > Method. Straightforward.
2. Also saw Inspector > Layout tab > Method, and the empty-canvas right-click has "Re-run layout"
   and "Reshuffle layout seed". Reshuffling is not a different arrangement, it is the same one
   with new randomness. There is a Seed, which I like. I want to be able to put the old one back.

End: Toolbar > Layout > Method. Confidence 6.

## tree-6 -- picture for tomorrow's slides

1. Export. Project name > Export... > Image. (The three-lines menu also has Export..., Ctrl+E.)
2. Colleagues make the pictures, but I would use this to hand them one.

End: Project name > Export... > Image. Confidence 6.

## tree-7 -- every person's scores, in Excel

1. First instinct: Export... > Data. Backed off. "Data" could just be the file I loaded,
   coming back out. I want the scores the program computed, and nothing says Data includes them.
2. Tables are where I live anyway. Graph rail > the ranking row > right-click > "Show in table".
   That should put the scores as a column in Table > Nodes.
3. Table > Table options (...) > Export table as CSV.... CSV opens in Excel. Fine.
4. I would check the column header says which measure and which settings. A column called
   "score" is a rumor.

End: Graph > ranking row > Show in table, then Table > Table options > Export table as CSV....
Confidence 5. Two of five steps lean on the table actually holding the scores.

## tree-8 -- stop now, carry on exactly tomorrow

1. Now: Save, Ctrl+S. If it has never been saved I expect it to ask for a name and place. Fine.
2. "Exactly where you are" -- does Save keep the camera, the selection, what is open? The outline
   does not say. To be safe I might also do Views > Save view (+), but that feels like a
   workaround.
3. Tomorrow: Start screen > Recent projects > the project.

End: Ctrl+S now; tomorrow Start screen > Recent projects. Confidence 5 for getting the project
back. Confidence 3 that I land exactly where I was.

## tree-9 -- leave out small ties in every number and drawing

1. Data rail > Filters (+ adds a step). "Each step, with a checkbox to apply it." That looks like
   the place.
2. My doubt: does a filter step change the numbers, or only the drawing? The header has
   "Full graph (filter)", which I read as a status saying whether a filter is on. That suggests
   the filter applies everywhere, but I am inferring.
3. Considered Settings, then the Data page's Weight, and rejected both. Settings is preferences,
   and the Data page is about reading the file in.

End: Data > Filters > + (a step on weight). Confidence 4. I would rerun one ranking with and
without the step before I trust that the analyses see it.

## tree-10 -- colleague's colors and settings file

1. Main menu (three lines) > "Apply recipe or style file...". Also under the project name menu.
2. I do not know whether my colleague's file is a "recipe" or a "style file". Since the item says
   both, it does not matter.

End: Main menu > Apply recipe or style file.... Confidence 6.

## tree-11 -- pick everyone matching a typed rule

1. First tried Graph rail > "Find rows and notes". No -- that finds rows in that list, not people.
2. Then Toolbar > Analyze > "Search, or say what to find". Possible, but it lives under Analyze,
   and I am not analyzing anything.
3. Main menu > "Select where...". That is the one. An attribute's menu also has "Select where
   (this attribute) is...", but my rule has two attributes, country and score.
4. Odd that selecting lives in the main menu next to Save and Settings. I would not have looked
   there first.

End: Main menu > Select where.... Confidence 5.

## tree-12 -- add this week's swipes to last week's list

1. Data rail > Sources > last week's file > its menu > "Add rows from file...". Says exactly that.
2. Opens the Data page; I would check the Match report says the columns lined up.

End: Data > Sources > last week's file > Add rows from file.... Confidence 6.

## tree-13 -- run March's work again on April's numbers

1. Data rail > Sources > the March file > "Replace with file...". Swap March for April.
2. Will the groups, rankings and colors run again by themselves? The outline does not say. The
   Graph list rows have "Rerun", so maybe I rerun each by hand. Or maybe the program does it.
3. Thought about Export > Recipe then Apply recipe on a new project. Too many steps if Replace
   works.

End: Data > Sources > March file > Replace with file.... Confidence 5 that this is where I start.
Confidence 3 that the results rerun without me rerunning each one.

## tree-14 -- 40 co-occurrences count more than 1

1. This is about how the file is read, so: the Data page. To get back to it for a loaded file:
   Data > Sources > the file > "Edit source...".
2. On the Data page: "One edge per: Row | Pair". Pair, so the 40 rows become one tie. Then
   "Weight" -- I hope Weight can be "count of rows". The outline does not say what Weight's
   choices are.
3. Hesitated over an attribute's "Read as...", but there is no column that holds the count yet,
   so that is not it.
4. "In every analysis from now on" -- I assume the analyses use the weight. Some algorithms
   ignore weights unless told, so I would want each result to say whether it used them.

End: Data > Sources > file > Edit source... > One edge per: Pair, with Weight. Confidence 4.

## tree-15 -- see one coloring result by itself for a moment

1. Graph rail > the list of rows > the rows added by Analyze, each with its eye.
2. Option A: switch off every other row's eye. Tedious, and I have to remember to switch them
   back on.
3. Option B: right-click that row > "Show only this row". That is the one. But I do not know how
   to undo it. Is there a "show all again"? The outline does not list one. If I have to switch
   eyes back on one by one, that is "changing the others".
4. Also noticed "Lock" and "Remove from list view" in that menu. I would stay away from both
   until I knew what they do.

End: Graph > the row's right-click menu > Show only this row. Confidence 5. The way back is the
part I would test first.

## Morgan's closing remark

"The data side reads well. Sources, Add rows, Replace, Edit source -- they say what they do. The
analysis side is less clear. 'Measure the graph' and 'Rank' blur together. Selecting lives in
the main menu. Labels can be set in two places. And there is a 'Show only' with no obvious way
back. Whether any of this works with a keyboard is a different test. The outline does not tell
me."
