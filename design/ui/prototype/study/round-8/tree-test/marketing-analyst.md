# Tree test -- Jordan, marketing network analyst

Participant: Jordan, a growth-marketing analyst who does "the network stuff" one or two days a week.
She knows NodeXL, Gephi and Gephi Lite, says "cluster" for community, "influence score" for any
centrality and "export" for both pictures and tables. She saw only the text outline of the app.

Confidence is on a scale of 1 (pure guess) to 7 (certain).

## tree-1: something ready-made to try it on

"Samples, obviously. It's right on the start screen."

- Start screen > Samples

Ends at: Start screen > Samples. Confidence 7. Direct.

"Fine. I'd still load my own export right after, the samples are always too clean."

## tree-2: bring in a spreadsheet from Downloads, first time in

"I'd just drag it in. It says 'drop a file anywhere', good. If that didn't work, 'New from
data...', since 'Open project' sounds like it wants a file from this program. Before I drop
anything, though -- there's a 'Local only (privacy)' thing on the start screen. I'd look at that
first if it was customer data. It's not here, it's a who-knows-who list, so I'd just drop it."

- Start screen > or drop a file anywhere in this window
- (fallback) Start screen > Start > New from data...

Ends at: Start screen > Start > drop a file (New from data... as the backup). Confidence 6. Direct.

## tree-3: which people the whole network depends on most

"That's bridges. Connectors. I'm looking for a button that says something like 'find influencers'.
The rail on the left is Graph, Data, Views, Notes, Assistant -- none of those. The toolbar at the
bottom has Analyze. Inside: Rank nodes and edges, Find groups, Find paths, Measure the graph.
'Rank' is the ranking, so that's the influence score. I'd expect to pick 'bridges' or betweenness
inside it. 'Measure the graph' made me hesitate -- is that one number for the whole graph, or a
score per person? I think the whole graph. So Rank."

- Rail > Graph (looked, no) -> back
- Toolbar > Analyze > Rank nodes and edges

Ends at: Toolbar > Analyze > Rank nodes and edges. Confidence 5. Indirect (one backtrack).

"I'd have clicked 'Search, or say what to find' if Rank wasn't obvious. 'Depends on most' isn't a
word I'd type though."

## tree-4: name beside each person, team under it

"Labels. In Gephi it's a label column. Here -- the panel on the right, Inspector, Style tab, has
'Label (+ adds a label line)'. So add a line for name, add a second line for team. With nothing
selected it should apply to everyone, I hope. I also saw on the Data side, under Attributes, each
attribute has 'Add label line' -- that would actually be quicker: find 'team', add label line. But
I'd start in the style panel because that's where looks live."

- Inspector > Style tab > Label (+), add name, add a second line for team
- (noticed) Rail > Data > Attributes > team's menu > Add label line

Ends at: Inspector > Style tab > Label. Confidence 5. Direct.

"Not sure the Inspector is showing 'everyone' and not one person. If I'd clicked a node first,
did I just label one guy?"

## tree-5: the drawing is a tangle, try another arrangement

"Layout. Toolbar > Layout > Method. That's the one I'd want, ForceAtlas or whatever they call it."

- Toolbar > Layout > Method

Ends at: Toolbar > Layout > Method. Confidence 6. Direct.

"Right-click on the canvas also has 'Re-run layout' and 'Reshuffle layout seed', but that's the
same arrangement shaken again, not a different one."

## tree-6: a picture of the drawing for tomorrow's slides

"Export. Three-line menu, 'Export... (Ctrl+E)'. It doesn't say picture or table, which is my
complaint with every tool -- I hit export and get the wrong thing. Then I noticed the project name
menu has Export with Image, Video, Report, Recipe, Data spelled out. Image. I'd go there instead
so I know what I'm getting."

- Header > Main menu > Export... (no options shown) -> back
- Header > Project name > Export... > Image

Ends at: Header > Project name > Export > Image. Confidence 5. Indirect.

"Does the image have the legend on it? That's what matters for the VP. I'd want to know before I
paste it. And why are there two Exports in two menus?"

## tree-7: everyone's scores, in Excel

"Export again, I suppose. Project name > Export > Data. But -- 'Data' could be my original
spreadsheet back, without the scores. I don't trust that. What I actually want is the table:
sort by the score, get it out. Table at the bottom, Table options, 'Export table as CSV...'.
That's it, that's the one. CSV opens in Excel, fine."

- Header > Project name > Export > Data (hesitated, unsure it includes the scores) -> back
- Table > Table options (...) > Export table as CSV...

Ends at: Table > Table options > Export table as CSV. Confidence 5. Indirect.

"Hiding the CSV behind a '...' on the table is a bit much. That's the thing I do every single
time."

## tree-8: stop now, carry on tomorrow exactly where you are

"Save. Ctrl+S. Tomorrow I open it and it's under Recent projects on the start screen. 'Exactly
where I am' -- I'd assume Save keeps the coloring and the view too. There's 'Save view' under
Views, which made me wonder if Save doesn't keep where I was zoomed. I'd probably press both to be
safe."

- Today: Header > Main menu > Save (Ctrl+S); also Rail > Views > Save view (+), just in case
- Tomorrow: Start screen > Recent projects > (the project)

Ends at: Save, then Start screen > Recent projects. Confidence 6. Direct.

## tree-9: from now on, leave out small ties in every number and drawing

"Filter. I see 'Full graph (filter)' up in the header -- that looks like what's being shown right
now, a switch. And on the Data side, Filters with '+ adds a step'. I'd go to Data > Filters, add a
step, 'weight over something', tick it on. Then I'd expect the header to stop saying 'Full graph'.
Honestly I'm not sure the scores get recalculated on the filtered version, or it just hides the
lines. That's the bit I'd test."

- Header > Full graph (filter) (looked, seems to be a status) -> back
- Rail > Data > Filters (+ adds a step)

Ends at: Rail > Data > Filters > add a step. Confidence 4. Indirect.

"'Every number' is the scary part. If the influence score still counts the small ties, my list is
wrong and I wouldn't know."

## tree-10: a colleague's colors and settings file, no data

"'Apply recipe or style file...' in the main menu. 'Style file' is the word that got me. I don't
know what a recipe is. A cooking word. Maybe that's the settings part."

- Header > Main menu > Apply recipe or style file...

Ends at: Header > Main menu > Apply recipe or style file... Confidence 6. Direct.

"'Apply' -- does this overwrite my colors? Is there an undo? There's an Undo in the header, okay."

## tree-11: pick out everyone matching a typed rule (country X, score over 50)

"A filter? No, she wants them picked out, not the rest hidden. Search box -- Analyze has 'Search,
or say what to find'. I'd try typing it there first. But that's under Analyze, so it might be
searching for algorithms, not people. Graph rail has 'Find rows and notes' -- rows of what? Then I
remembered the main menu had 'Select where...'. That reads like a rule. I'd go there."

- Toolbar > Analyze > Search, or say what to find (unsure it searches people) -> back
- Rail > Graph > Find rows and notes (not people, I think) -> back
- Header > Main menu > Select where...

Ends at: Header > Main menu > Select where... Confidence 4. Indirect.

"The column menus also had 'Select where (this attribute) is...' but that's one column. I need
two conditions."

## tree-12: this week's badge swipes go in with last week's, one list

"Data rail, Sources. The file I loaded last week is there, it has a menu: Rename, Replace with
file, Add rows from file. 'Add rows' -- that's appending. Not Replace, Replace would throw last
week away."

- Rail > Data > Sources > last week's file's menu > Add rows from file...

Ends at: Rail > Data > Sources > file menu > Add rows from file... Confidence 6. Direct.

## tree-13: April's export, rerun everything built on March

"Same place. Sources, March's file, 'Replace with file...', pick April. I'd hope the groups and
rankings rerun themselves. If not, each result row in the Graph list has 'Rerun' on right-click.
I'd be nervous though -- 'Replace' sounds like I lose March. I'd Save as... a copy first."

- Header > Project name > Save as... (a safety copy)
- Rail > Data > Sources > March file's menu > Replace with file...
- (if results don't update) Rail > Graph > a result row's menu > Rerun

Ends at: Rail > Data > Sources > file menu > Replace with file... Confidence 5. Direct.

## tree-14: 40 swipes together should count as a tighter tie, in every analysis

"Weight. I'd go to Data > Attributes first, looking for a count column. There's 'Read as...',
which might be 'read this as weight'? Not sure. Then I thought this is about how the file was
brought in -- Sources > the swipe file > Edit source... That opens the Data page, and the Data
page has 'One edge per: Row | Pair' and 'Weight'. Pair, I guess, so 40 rows become one heavy tie.
And weight from... the count? I'm honestly guessing at 'Row versus Pair'."

- Rail > Data > Attributes > an attribute's menu > Read as... (unclear) -> back
- Rail > Data > Sources > the swipe file's menu > Edit source...
- Data page > The chosen table > One edge per: Pair, and Weight

Ends at: Data page (via Edit source...) > One edge per: Pair / Weight. Confidence 3. Indirect.

"In my head 'weighted' means bigger dots for bigger accounts. I'd have looked in Style first if
the question hadn't said 'in every analysis'."

## tree-15: see one coloring result by itself for a moment, keep the others

"The legend first -- Legend card, Legend (L). Legends usually let you click a thing off. The
outline doesn't say it can, so back. The Graph list has 'Rows added by Analyze, each with its
eye'. I could close every other eye, but 'for a moment' means I'd have to turn them all back on.
Right-click a row: 'Show only this row'. That."

- Canvas > Legend card (nothing listed under it) -> back
- Rail > Graph > the list of rows > a result row's right-click menu > Show only this row

Ends at: Rail > Graph > row menu > Show only this row. Confidence 5. Indirect.

"How do I get back? I'd assume clicking it again, or pressing the eyes. Not told."

## Overall

"The start screen and the export-the-table bits I'd find. The data stuff -- weight, rows versus
pairs, recipes -- is where I'd stall and go ask the data-science guy, which is the whole thing I'm
trying to avoid. Two Export menus that say different things annoyed me. And nobody told me whether
my CSV leaves the laptop until I spotted 'Local only' myself. Our Brandwatch contract renews in
March and I'd still need a reason to switch."
