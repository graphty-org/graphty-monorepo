# Tree test transcript: Sarah, fraud investigator (level-2, complex cases)

Mode: first impression, not mandated. She reads only the outline in round-8/tree.md. Confidence is 1 (pure guess) to 7 (certain).

Her opening remark: "It's a menu. Fine. Half these words are developer words -- 'node', 'edge', 'rows', 'recipe'. I'll guess."

## tree-1 -- something ready-made to try it on

- Path: Start screen -> Samples.
- End: Samples.
- Confidence: 6.
- Says: "Samples, with one line on what each is good for. Good. If one of them is a money-flow case I'll try that one; if they're all social networks of monks I'll close it."

## tree-2 -- bring in the spreadsheet from Downloads, first launch

- Path: Start screen -> Start -> looked at "Open project or file..." first, because that's what Ctrl+O does everywhere. Then "New from data..." -- "a spreadsheet is data, not a project." Also noticed "drop a file anywhere".
- End: Start -> New from data... (would probably just drag the file in from Downloads).
- Confidence: 5.
- Says: "Two buttons that both sound like 'open my file'. I'd pick one and hope the other doesn't do something different. And before I drop anything I want to see that 'Local only' thing actually means nothing leaves my laptop."

## tree-3 -- which people the whole network depends on most

- Path: Looked at the left rail first for something like "hubs" -- nothing. Graph list mentions "A measure (a ranking)" but that's what comes out, not where you start. Went to Toolbar -> Analyze -> options: "Rank nodes and edges", "Find groups", "Find paths", "Measure the graph". "Measure the graph" sounded like one number for the whole thing. "Rank" sounds like a list of who matters most.
- End: Toolbar -> Analyze -> Rank nodes and edges.
- Confidence: 4.
- Says: "I'd call that the hub, the account everything touches. 'Rank nodes and edges' -- I'd have to guess that's it. Inside it had better not be a list of professors' names like 'eigenvector'. And it needs to say why someone ranks high."

## tree-4 -- name beside each person, team under it

- Path: Right-click on a node first -- nothing about labels. Then Inspector (right side) -> Style tab -> Label (+ adds a label line). Noticed the Data rail -> attribute menu also has "Add label line"; that's the one I'd actually use since I'd start from the "team" column.
- End: Inspector -> Style tab -> Label (+), adding a second line for team. Or Data -> Attributes -> team -> Add label line.
- Confidence: 4.
- Says: "Two places to do it. Fine, as long as both end up the same thing. Whether the second line goes under the first, I'd only find out by trying."

## tree-5 -- the drawing is a tangle, try a different arrangement

- Path: Right-click on empty canvas -> "Re-run layout" / "Reshuffle layout seed" -- that just shakes the same tangle. Backed out. Toolbar -> Layout -> Method.
- End: Toolbar -> Layout -> Method.
- Confidence: 4.
- Says: "'Layout' is your word, I'd say 'the chart'. 'Method' tells me nothing -- method of what? And 'seed' is a farming word. Worry: if I change it, does my reviewer see a different picture tomorrow?"

## tree-6 -- picture of the drawing for tomorrow's slides

- Path: Header -> Project name -> Export... -> Image. (Main menu also has Export..., probably the same thing.)
- End: Export... -> Image.
- Confidence: 6.
- Says: "That's the first thing I'd test. Does it include the legend? Does it work in grayscale? If I have to screenshot and crop in Paint, it failed."

## tree-7 -- the scores for every person, in Excel

- Path: Export... -> Data first. Stopped: "Data" probably means my original spreadsheet back, not the scores. Backtracked. Table (bottom) -> Nodes -> Table options (...) -> Export table as CSV...
- End: Table -> Table options -> Export table as CSV...
- Confidence: 4.
- Says: "I'd export the table and check the score column is in it. Hiding the CSV behind a '...' on the table is annoying -- it's the one button I'd use every case. And I'd want 'Export -> Data' to say whether scores come along."

## tree-8 -- stop now, carry on tomorrow exactly where you are

- Now: Ctrl+S (Main menu or project name -> Save). Then close.
- Tomorrow: Start screen -> Recent projects -> the project.
- Confidence: 5.
- Says: "Save, obviously. What I don't know is whether 'exactly where I am' includes the picture as it sat, the selection, the table I had open. If the chart rearranges itself on reopen, that's a problem for my reviewer. 'Views -> Save view' maybe? I wouldn't think of that tonight."

## tree-9 -- from now on leave out small ties everywhere

- Path: Header -> "Full graph (filter)" -- looked like where a filter would go. Not sure if that's just for the picture. Then Settings (Main menu) -> General / Performance -- no, that's the program, not this case. Backtracked to Data rail -> Filters (+ adds a step).
- End: Data -> Filters -> + (a step dropping links below an amount).
- Confidence: 3.
- Says: "I'm guessing. 'Filters' under 'Data' sounds like it changes what goes in, which is what I want. But the header filter button makes me think there are two kinds and I'd pick the wrong one. I'd also want to see the dropped links counted somewhere so I can say in the file what I excluded."

## tree-10 -- colleague's colors and settings file, no data, apply to your network

- Path: Main menu -> "Apply recipe or style file...".
- End: Apply recipe or style file...
- Confidence: 5.
- Says: "'Style file' -- that's what they sent me, probably. 'Recipe' I don't know and wouldn't open. I'd want to know first if it'll overwrite the colors I already set."

## tree-11 -- pick out everyone matching a typed rule (country X, score over 50)

- Path: Pasted it into the first search box I saw: Graph rail -> "Find rows and notes". That's for finding things in that list, not people. Then Toolbar -> Analyze -> "Search, or say what to find" -- maybe? Then spotted Main menu -> "Select where...".
- End: Main menu -> Select where...
- Confidence: 4.
- Says: "'Select where' is SQL talk but at least it's plain. I nearly typed the rule into the Analyze box. Odd that it lives in the main menu next to Save and not near the table."

## tree-12 -- add this week's swipes to last week's list, same columns

- Path: Data rail -> Sources -> last week's file -> its menu -> "Add rows from file...".
- End: Data -> Sources -> (file) -> Add rows from file...
- Confidence: 5.
- Says: "That one says what it does. I'd check the count afterwards -- last week plus this week, no duplicates."

## tree-13 -- April's export replaces March's, everything reruns

- Path: Thought about "Version history" -- no, that's going back, not forward. Looked at "Apply recipe" -- no idea. Data rail -> Sources -> March file -> "Replace with file...".
- End: Data -> Sources -> (March file) -> Replace with file...
- Confidence: 4.
- Says: "Replace sounds right. But does it actually rerun the groups and rankings, or do I have to rerun each one by hand? Nothing in the outline tells me. And I'd want March kept somewhere -- that's my audit trail."

## tree-14 -- 40 appearances together should count more than 1, in every analysis

- Path: Inspector -> Style tab -- no, that's looks. Data rail -> Attributes -> looked for a count column, there isn't one, it's rows repeated. Back to Data rail -> Sources -> the swipe file -> "Edit source..." -> Data page -> the chosen table -> "One edge per: Row | Pair" and "Weight".
- End: Data page -> One edge per: Pair (and Weight).
- Confidence: 3.
- Says: "I'd never have found that without hunting. 'Edit source' sounds like editing the file itself, which I'm not allowed to touch. 'One edge per Pair' -- edge is your word for a link; I think that means 'count repeats'. 'Weight' I know from i2. I'd only be confident after looking at a link and seeing '40' on it."

## tree-15 -- see one coloring result by itself without deleting the others

- Path: Canvas -> Legend card first, hoping to click one entry off. Nothing in the outline says it does. Graph rail -> the list -> "Rows added by Analyze, each with its eye" -- turn the others' eyes off. Then saw right-click -> "Show only this row".
- End: Graph rail -> the result's right-click menu -> Show only this row (or the eyes).
- Confidence: 5.
- Says: "Fine. And getting back to all of them -- is there a 'show all again', or do I click eyes back on one by one?"

## Overall

- Easy: samples, export image, add rows, replace file, apply a style file.
- Guesswork: anything about weighting links (tree-14), filtering out small ties everywhere (tree-9), and finding the "hub" ranking (tree-3). The words "node", "edge", "rows", "method", "seed" and "recipe" all made her stop.
- Her verdict: "Most of it I'd find in five minutes. The two things that change the actual analysis -- what counts as a link and what gets left out -- are the two I'd get wrong, and those are the ones an examiner asks about."
