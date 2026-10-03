# Tree test -- Priya, threat hunter (cybersecurity analyst persona)

Text outline only. First thing I looked for, before any task: "Local only (privacy)" on the start
screen and in the header. Good, that is the question I ask first. I would click it before loading
anything. The "Usage data card" on first launch: "No thanks", immediately.

## tree-1 -- something ready-made to try it on
Path: Start screen > Samples.
I would normally skip samples and drag in my own file, but with no data, Samples is the obvious
word. One line per sample on what it is good for is fine; I would pick whichever sounds like a
network of accounts and hosts.
End: Start screen > Samples. Confidence: 7.

## tree-2 -- bring in a spreadsheet from Downloads, first launch
Path: Start screen > Start > "or drop a file anywhere in this window". I drag it from Downloads.
If drag is blocked on the managed laptop, "New from data..." is next; "Open project or file..."
sounds like it wants a project, so I would pass on it.
I expect to land on a page that asks which columns are from, to and time. The Data page looks
like that (From ->, To ->, Time). Good, as long as it shows its guesses.
End: Start > drop a file (or New from data...). Confidence: 6.

## tree-3 -- who the network depends on most
"Depends on most" = choke points, betweenness for me.
Path: Toolbar > Analyze. I would try typing "betweenness" in "Search, or say what to find" first
because I want to type, not browse. The "say what to find" part smells like an assistant, so if
it starts chatting I back out. Then "Rank nodes and edges" -- ranking is what I want, sorted.
End: Toolbar > Analyze > Rank nodes and edges (betweenness). Confidence: 5.
Note: I want the result as a table sorted by score, not just colored dots.

## tree-4 -- name beside each person, team under it
Path: Inspector (right, nothing selected so it is the whole graph) > Style tab > Label (+ adds a
label line). Add name, then add a second line for team.
Backtrack worry: is that the label for the selected thing only, or for everybody? If nothing is
selected I assume everybody. I also see Data rail > Attributes > attribute's menu > "Add label
line", which is probably the same thing from the other side. I would try the attribute route
second, on "team", if the first only did one node.
End: Inspector > Style > Label (+), twice. Confidence: 4.

## tree-5 -- tangle, try a different arrangement
Path: Toolbar > Layout > Method. Not "Re-run layout" or "Reshuffle layout seed" on the right-click
-- that is the same arrangement again.
End: Toolbar > Layout > Method. Confidence: 6.
I do not care where dots sit, but I would check the match list did not change.

## tree-6 -- picture for tomorrow's slides
Path: Project name > Export... > Image. (Ctrl+E from the main menu is the same.)
End: Export > Image. Confidence: 6.
I want the legend in the picture. If the image comes out without the legend card it is useless
to my lead.

## tree-7 -- every person's scores, in Excel
Path: Table (Shift+T) > Nodes tab -- check the score column is there and the row count matches
what I loaded -- then Table options (...) > Export table as CSV...
Considered Export > Data under the project name; "Data" sounds like the whole graph in some
graph format, not my rows. CSV from the table is what I trust.
End: Table > Table options > Export table as CSV. Confidence: 5.
Question: does it export all rows or only what is filtered or visible right now? It does not say.

## tree-8 -- stop now, carry on tomorrow
Now: Save (Ctrl+S). The first time it will probably ask where (Save as). I would want to know it
saved to my disk, not somewhere online.
Tomorrow: Start screen > Recent projects > my project.
End: Ctrl+S, then Recent projects. Confidence: 6.
Does it keep my query and my selection, or just the data? An alert pulls me away mid-hunt all
the time; I'd hope it autosaves and nothing in the outline says so.

## tree-9 -- leave out small ties everywhere from now on
Path: header "Full graph (filter)" caught my eye first -- clicked it, assume it shows the filter
state. Then Data rail > Filters (+ adds a step) > add a step: edge weight greater than X, checkbox
on.
Doubt: does a filter step change the numbers (the rankings) or only what is drawn? The task says
every number. Nothing tells me. I would check one ranking before and after.
Also looked at Data page > Weight, but that is about reading the file, not dropping ties.
End: Data > Filters > + step. Confidence: 4.

## tree-10 -- colleague's colors and settings file, no data
Path: Main menu > "Apply recipe or style file...". "Style file" is the words that match. "Recipe"
means nothing to me -- cooking? -- but it is on the same line so I assume it is fine.
Also saw Settings, but those sound like my program preferences, not the look of the network.
End: Main menu (or project name menu) > Apply recipe or style file... Confidence: 5.

## tree-11 -- select everyone matching a typed rule (country = X, score > 50)
This is the one I care about. Where is the query box?
Path: Toolbar > Analyze > "Search, or say what to find" -- typed-ish, but "say" makes me think
it wants natural language or a name lookup, not a rule. Backtrack. Quick actions (Ctrl+K) is a
command palette, not a query. Then Main menu > "Select where..." -- "where" like a WHERE clause.
That is it, I think. Also saw Data > Attributes > "Select where (this attribute) is..." but that is
one attribute at a time; my rule has two.
End: Main menu > Select where... Confidence: 4.
If "Select where" turns out to be dropdowns and not a box I can type into, I want to see the
query it built. It is buried in the hamburger menu, which is the wrong place for the main thing I
do.

## tree-12 -- this week's swipes join last week's, one list
Path: Data rail > Sources > last week's file > its menu > "Add rows from file...".
Not "Sources +" -- that sounds like a second source next to it. Not "Replace with file..." --
that throws last week away.
End: Data > Sources > the file > Add rows from file... Confidence: 6.
I would check the row count afterward adds up to last week plus this week. Duplicates?

## tree-13 -- run everything built on March again on April
Path: Data rail > Sources > March file > "Replace with file..." > pick April.
Then I would expect the groups and rankings to rerun. If they do not, Graph rail > each row's
right-click > Rerun. Considered Export > Recipe then Apply recipe on a new project -- that might
be the real intended way, but it is two steps and I only half know what "recipe" means.
End: Data > Sources > Replace with file... Confidence: 4.
Need to know: does it say which month the numbers now belong to? If the ranking still looks like
March and I can't tell, I won't put it in a case.

## tree-14 -- 40 co-occurrences count tighter than 1, in every analysis
Path: it is about how the file is read, so Data rail > Sources > the file > "Edit source..." >
Data page. Saw "Weight", but my file has no weight column, it just has repeated rows. Then saw
"One edge per: Row | Pair". Guessing "Pair" collapses repeats into one edge and counts them as
the weight. That is a guess.
End: Edit source > Data page > One edge per: Pair (plus Weight). Confidence: 3.
If it does not say "count of rows becomes the weight" right there, I would not trust it.

## tree-15 -- see one result alone for a moment
Path: Graph rail > the list of rows > the result's right-click > "Show only this row".
Also saw the eye on each row; turning off the others one by one would work, but then I have to
remember to turn them back on. "Show only" sounds like a temporary solo. Hope it does not delete
anything.
Considered the Legend card first, since that is where the colors are explained, but nothing in it
says you can toggle.
End: Graph rail > row's right-click > Show only this row. Confidence: 5.

## Overall
- Privacy answer is visible up front. That earns some patience.
- The query is my main job and the closest thing, "Select where...", sits in the hamburger next to
  Settings. "Search, or say what to find" sounds like a chat box, which I avoid.
- Time range: I saw a "Time slider" buried under the table's options. For me that should be
  where I can see it at all times, not inside "...".
- "Recipe" is a word I had to guess at twice.
