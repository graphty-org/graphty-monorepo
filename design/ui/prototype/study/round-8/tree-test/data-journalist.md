# Tree test, round 8 -- the reporter with a contacts sheet (Ruth)

Ruth is a reporter on an investigations desk who is quick in a spreadsheet and new to graph tools.
She worked only from the text outline of the app. Confidence runs from 1 (a guess) to 7 (certain).

## tree-1: ready-made data to try the program on

Start screen. I read down: Start, Recent projects (empty, I have none), Samples. "Each sample, with
one line on what it is good for." That is exactly it.

- Path: Start screen > Samples
- Confidence: 7

## tree-2: bring in the spreadsheet from Downloads

Start screen > Start. Two choices: "Open project or file..." and "New from data...". My first
instinct is "Open ... file", since a spreadsheet is a file and that is what Open means everywhere
else. Then I hesitate, because "project" makes it sound like it wants a file this program made.
"New from data..." says data, and my sheet is data. I go with that. I'd also be fine just dropping
the file on the window, which it says I can do.

- Path: Start screen > Start > New from data...
- Confidence: 5 (the two choices look like they might do the same thing; I can't tell which is "right")

## tree-3: which people the whole network depends on most

I look for a word like "important" or "key people". Nothing on the left rail says it. The Graph
rail has "rows added by Analyze", which tells me Analyze is where numbers come from. Toolbar >
Analyze: "Rank nodes and edges" -- ranking is the nearest thing to "who matters most". I'd still
want to know what the ranking counts before I'd print it.

- Path: Toolbar > Analyze > Rank nodes and edges
- Confidence: 5

## tree-4: name beside each person, team written under it

First I right-click a person on the drawing: no label option there. Then the Inspector on the
right, Style tab, "Label (+ adds a label line)". Name as one line, team as a second line under it.
I only notice later that Data > Attributes > an attribute's menu also has "Add label line", which
would be quicker if I start from the column I want, but I'd find the Inspector first.

- Path: canvas right-click on a node (backtrack) > Inspector > Style tab > Label (+), twice
- Confidence: 4 (not sure the second line goes under the first, or which line is which)

## tree-5: a different way of arranging the tangle

Toolbar > Layout > Method. "Arranging" and "layout" are the same thing to me.

- Path: Toolbar > Layout > Method
- Confidence: 6

## tree-6: a picture of the drawing for tomorrow's slides

Header > Main menu (three lines) > Export... It doesn't say what kinds there. Project name menu >
Export... lists Image. I'd take Image.

- Path: Header > Project name > Export... > Image
- Confidence: 6

## tree-7: everyone's scores, in Excel

I just used Export, so I go back there: Project name > Export... > Data. "Data" is my best bet for
a spreadsheet, though I'm not sure it includes the scores the program worked out, rather than just
what I brought in. "Report" sounds like a document, not a table. I'd try Data. If the scores were
missing I would then go looking in the Table at the bottom; I can see it has "Export table as
CSV..." under its options, and Excel opens CSV, but I would not have started there.

- Path: Header > Project name > Export... > Data (fallback: Table > Table options > Export table as CSV...)
- Confidence: 4

## tree-8: stop now, carry on tomorrow exactly where I am

Now: Save (Ctrl+S), from the Project name menu. I'd half expect it to ask where to put it the first
time. Tomorrow: the Start screen > Recent projects, and click it. I would worry about whether
"exactly where I am" includes the zoom and what I had selected; "Save view" under Views makes me
think the view might NOT be saved with Save, so I might save a view too, just in case.

- Path: Project name > Save; tomorrow Start screen > Recent projects
- Confidence: 6

## tree-9: from now on, leave out the small ties in every number and drawing

"From now on" sounds like a setting, so I try Main menu > Settings... General, Privacy,
Accessibility, Performance, Assistant, Headset, Diagnostics. None of those is about my ties.
Back out. The header has "Full graph (filter)" -- that sounds like it's telling me no filter is on,
so clicking it might add one. Then I see the Data rail has "Filters (+ adds a step)". I'd add a
step there that keeps only ties above some size. What I don't know is whether a filter changes
the numbers or only what's drawn. The task says both, and nothing in the outline tells me.

- Path: Main menu > Settings (backtrack) > header "Full graph (filter)" (considered) > Data rail > Filters (+)
- Confidence: 3

## tree-10: a colleague's colors and settings file, no data in it

Main menu > "Apply recipe or style file...". "Recipe" means nothing to me, but "style file" is what
she sent. That's where I'd put it.

- Path: Main menu > Apply recipe or style file...
- Confidence: 5

## tree-11: pick out everyone matching a typed rule (one country, score over 50)

I type into the first search box I see. In the Graph rail it's "Find rows and notes" -- that sounds
like it searches the list, not the people. The Analyze box says "Search, or say what to find",
so I'd try typing the rule there. If that just ran an analysis instead of selecting people, I'd
back out and scan the Main menu, where "Select where..." is a fit: select people where something
is true.

- Path: Graph rail > Find rows and notes (rejected) > Toolbar > Analyze > Search, or say what to find (tried) > Main menu > Select where...
- Confidence: 4 (I'd land on Select where..., but only after trying search)

## tree-12: add this week's badge swipes to last week's, one list

Not "Open", that would open a second network. Data rail > Sources > last week's file > its menu >
"Add rows from file...". That is plainly what I want.

- Path: Data rail > Sources > (last week's file) menu > Add rows from file...
- Confidence: 6

## tree-13: run everything built on March again on April's numbers

Data rail > Sources > March's file > "Replace with file...". Replace March with April and keep
the rest. I did think about "Apply recipe" and "Export > Recipe" for a moment, because "recipe"
might mean "everything I built", but I'd try Replace first since it says what I want in plain words.
I'm trusting that replacing the file reruns the groups and rankings rather than throwing them away;
I'd want it to tell me what changed.

- Path: Data rail > Sources > (March's file) menu > Replace with file...
- Confidence: 5

## tree-14: pairs that appear 40 times count more than pairs that appear once

This is about how my sheet is read, so I look near the file. First I try Data > Attributes > an
attribute's menu > "Read as..." -- no, that's about one column, and there's no column that holds
the count. Back to Data rail > Sources > the file > "Edit source...", which I'm guessing opens the
page where it read my file. On that page, under the chosen table: "One edge per: Row | Pair" and
"Weight". I think I'd pick Pair and hope the count becomes the Weight. I'm guessing; nothing says
"count how often they appear together".

- Path: Data rail > Attributes > Read as... (backtrack) > Data rail > Sources > (file) menu > Edit source... > Data page > chosen table > One edge per: Pair, then Weight
- Confidence: 3

## tree-15: see one result alone for a moment, without deleting the others

The Legend at the top left first, since it shows what the colors mean; nothing there says I can
switch them. Then the Graph rail: "Rows added by Analyze, each with its eye". I could close every
other eye, but that's fiddly. A row's right-click menu has "Show only this row" -- that's it.

- Path: Canvas > Legend card (backtrack) > Graph rail > (the result's row) right-click > Show only this row
- Confidence: 5

## In her words

"Most of it I could find. Where I lost my nerve was anything about how the program counts: whether
a filter changes the numbers, whether Pair turns a count into a weight, whether Replace keeps my
work. Those are exactly the things I have to explain to an editor, and the menu names don't tell me."
