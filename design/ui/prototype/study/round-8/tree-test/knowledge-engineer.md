# Tree test -- Dr. Min-ji Kim, knowledge graph engineer

Participant: a knowledge graph engineer who looks after a large company knowledge graph. She
reads specifications end to end but skips tours. She does not trust a tool until it has proved
it shows her data honestly. She saw only the text outline of the app's navigation. Confidence
runs from 1 (a pure guess) to 7 (certain).

Opening remark, before the first task: "I read the whole outline first; I always do. No Turtle,
no SPARQL endpoint anywhere at the top level, so I am assuming CSV gets in somewhere under
'New from data'. The people-and-teams tasks are not my data, but fine, I can think in
instances."

---

## tree-1 -- something ready-made to try

Path: Start screen > Samples.

"Start screen, and there it is: Samples, each with a line on what it is good for. I did not
need to open anything else. That is fine for a demo. What I want to know is whether one of them
has typed nodes, so I can see if it tells a class from an instance."

Ended at: Start screen > Samples. Confidence: 7.

## tree-2 -- bring in a spreadsheet from Downloads, first launch

Path: Start screen > Start > considered "Open project or file..." > chose "New from data...".

"Two candidates: 'Open project or file' and 'New from data'. 'Open project or file' sounds like
it wants a project file, its own format. A spreadsheet is not a project, it is data, so 'New
from data'. Further down I see a Data page that opens from both of them anyway, so I suspect
it does not matter. On that page I would read 'Each column's role' carefully. From, To, Weight,
Subtype -- Subtype is the nearest thing I see to a predicate column. I would want to know whether
it also has a 'Label' role for my predicate, and it does not seem to."

Ended at: Start screen > Start > New from data... (onto the Data page). Confidence: 5.

## tree-3 -- which people the network depends on most

Path: Toolbar > Analyze > looked at "Measure the graph" > chose "Rank nodes and edges".

"'Depends on most' is not a measure, it is a question. Which centrality: betweenness, if you
mean brokers; degree, if you mean popular. 'Measure the graph' sounds like one number for the
whole graph -- density, diameter. 'Rank nodes and edges' is per node, so that one. I expect a
list of centralities inside, and if it does not name which one it used I will not quote the
number."

Ended at: Toolbar > Analyze > Rank nodes and edges. Confidence: 5.

## tree-4 -- name beside each person, team under it

Path: Inspector > Style tab > Label (+ adds a label line), adding two lines. Considered Data
rail > Attributes > an attribute's menu > Add label line.

"Label is under Style in the Inspector, and the plus 'adds a label line', so lines stack:
name first, team second. I assume the second line goes under the first; the outline does not
say. The Inspector shows the graph when nothing is selected. Does a label I add there apply to
every node, or only to what I have selected? That is my doubt. The attribute menu's 'Add label
line' on the Data rail is the same thing from the other side -- I would probably do it from
there, click 'name', then 'team', because then I know which property I picked. Two ways in. I
went with the Inspector because that is where styling lives."

Ended at: Inspector > Style tab > Label. Confidence: 4.

## tree-5 -- try a different arrangement for the tangle

Path: Toolbar > Layout > Method.

"Layout, Method. Same thing is in the Inspector's Layout tab. Before I trust whatever method I
pick, I want to know whether position means anything in it. A force layout on a hairball is
still a hairball. Honestly, the answer to a tangle is to filter, not re-arrange."

Ended at: Toolbar > Layout > Method. Confidence: 6.

## tree-6 -- a picture of the drawing for tomorrow's slides

Path: Header > Project name > Export... > Image.

"Export, Image. The main menu has Export too but no sub-items listed, so I went to the project
menu, which shows Image. Is it SVG or only PNG? For a slide I want SVG so I can fix a label
later. 'Image' does not tell me."

Ended at: Header > Project name > Export... > Image. Confidence: 6.

## tree-7 -- every person's scores, in Excel

Path: Header > Project name > Export... > Data > backtracked > Graph rail > the measure's row >
right-click > Show in table > Table > Table options > Export table as CSV...

"First instinct: Export, Data. But 'Data' probably means the graph I loaded, nodes and edges,
in some graph format. Will it include the computed scores? I cannot tell, and if it silently
drops them I will not know until I open the file. The Table is a safer bet: I can see the score
column with my own eyes and then export what I see. Table options has 'Export table as CSV'.
CSV is not Excel, but Excel opens it. I would check the score column survived before closing
anything."

Ended at: Table > Table options > Export table as CSV... Confidence: 4.

## tree-8 -- stop now, carry on tomorrow

Path: now -- Header > Project name > Save (Ctrl+S). Tomorrow -- Start screen > Recent projects >
the project.

"Ctrl+S. The first time it will presumably ask where. My question is what Save keeps: my
layout positions, the analysis rows, the notes, the filter? If the layout is random every time
and it does not store positions, 'exactly where I am' is a lie. 'Version history' tells me it
keeps something over time, which is reassuring. Tomorrow: Recent projects on the start screen."

Ended at: Save now; Start screen > Recent projects tomorrow. Confidence: 6.

## tree-9 -- leave out small ties for every number and every drawing

Path: Header > "Full graph (filter)" > looked, unclear > Data rail > Filters (+ adds a step).

"The header says 'Full graph (filter)', which reads like a status: you are looking at
everything. Clicking it might take me to the filters. The Filters section on the Data rail has
'+ adds a step', each with a checkbox. A step on the weight attribute, weight greater than
something. What I do not know is whether a filter step changes what the analysis counts, or
only what is drawn. The task says every number. If a filter only hides things on the screen and
the rankings still count the hidden edges, that is exactly the kind of mismatch that makes me
stop trusting the numbers. The outline does not tell me, so I guess yes, it affects both."

Ended at: Data rail > Filters > + step. Confidence: 4.

## tree-10 -- a colleague's saved colors and settings, no data

Path: Main menu > Apply recipe or style file...

"'Apply recipe or style file'. 'Style file' is what my colleague sent. 'Recipe' I do not know --
a cooking word, maybe a saved analysis pipeline. Not 'Open project or file', because that might
replace what I have open. 'Apply' says it goes on top. I would want a preview of what it is
going to change before it touches my drawing."

Ended at: Main menu > Apply recipe or style file... Confidence: 5.

## tree-11 -- pick out everyone matching a typed rule

Path: Toolbar > Analyze > "Search, or say what to find" > hesitated > Main menu > Select where...

"My first thought was the Analyze search -- 'say what to find' sounds like natural language,
an assistant guessing what I meant. I do not want a guess, I want a query. Then I saw 'Select
where...' in the main menu. That reads like a WHERE clause: country = X and score > 50. Strange
place for it, the menu with Save and Settings in it, but the name is right. The attribute menu
also has 'Select where (this attribute) is...', but that is one attribute at a time and I have
two conditions."

Ended at: Main menu > Select where... Confidence: 5.

## tree-12 -- this week's swipes appended to last week's

Path: Data rail > Sources > last week's file > its menu > Add rows from file...

"Sources, the file, 'Add rows from file'. Exactly what I want: same columns, more rows, one
table. Not 'Replace', not the plus on Sources, which I suspect adds a second source beside it.
What I would check on the Data page: does it de-duplicate? If a swipe appears in both files, I
want to be told, not have it silently merged."

Ended at: Data rail > Sources > (file) > Add rows from file... Confidence: 6.

## tree-13 -- rerun everything built on March against April

Path: Data rail > Sources > March's file > its menu > Replace with file... Considered Export >
Recipe and then Apply recipe on a new April project.

"Two ways I can see. One: 'Replace with file', on March's source -- swap the data underneath and
keep everything on top. Two: export a Recipe, which I now guess is the saved pipeline, then open
April and apply it. Replace is the shorter one, so I start there. Will the groups and rankings
rerun on their own, or do they go stale and I have to hit 'Rerun' on each row in the Graph
list? If they keep showing March's numbers on April's nodes without saying so, that is a
serious problem. I would want each row to tell me it is out of date."

Ended at: Data rail > Sources > (March file) > Replace with file... Confidence: 4.

## tree-14 -- 40 co-occurrences count as a stronger tie than one

Path: Data rail > Sources > the swipe file > its menu > Edit source... > Data page > the chosen
table > One edge per: Pair > Weight.

"This is an import decision, so it belongs where the columns get their roles. Edit source opens
the Data page. 'One edge per: Row | Pair' -- Pair should collapse the 40 rows into one edge, and
then 'Weight' next to it should be the count. That is my reading; the outline does not say
Weight becomes the count, it might want a weight column I do not have. And 'in every analysis
from now on' depends on the algorithms actually using the weight. Ranking by degree ignores it;
weighted degree would not. I would check which one it runs."

Ended at: Data page > One edge per: Pair, then Weight. Confidence: 4.

## tree-15 -- see one coloring result alone for a moment

Path: Graph rail > the list of rows > the row's right-click menu > Show only this row.

"Each row added by Analyze has an eye, so I could turn off the others one at a time. But
'Show only this row' in the right-click menu is exactly the task. My worry is getting back.
Does it remember which eyes were on, or do I have to turn each one back on by hand? 'For a
moment' means I need a way back, and the outline does not show one."

Ended at: Graph rail > (row) > right-click > Show only this row. Confidence: 6.

---

## Closing remarks, in her words

"The outline is readable. I found most things on the first or second look, and where I
backtracked it was because two places looked like they did the same job: labels from Style or
from the attribute, Export Data or the table's CSV, Select where in the main menu or in the
attribute menu. Every time, I want to know the same thing: does this change what is counted
or only what is drawn, and does it tell me when it is stale or what it dropped? None of that
shows in an outline. And none of it gets my Turtle file in, which is still the first thing I
would look for."
