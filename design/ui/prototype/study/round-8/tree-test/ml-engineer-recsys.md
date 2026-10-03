# Tree test -- Chris, ML engineer (recommendation systems)

Participant: senior ML engineer, lives in notebooks and Spark, skims, reads labels and numbers
carefully, gives an unfamiliar control about 30 seconds before reaching for search or a keyboard
shortcut. Confidence is 1 (pure guess) to 7 (certain).

## tree-1 -- something ready-made to try it on

Path: Start screen > Samples.

"Samples, right there on the start screen. Fine. I'd rather drop my own edge list, but for a
first poke this is where it is."

End: Start screen > Samples. Confidence: 7.

## tree-2 -- bring in a spreadsheet from Downloads, first launch

Path: Start screen > Start > looked at "Open project or file..." first, but that sounds like
opening a saved project. Moved to "New from data..." -- that is my data. Also noted "or drop a
file anywhere in this window", which is what I would actually do: drag it from Finder.

End: Start screen > Start > New from data... (or drop the file on the window). Confidence: 6.

"If 'Open project or file' also takes a CSV, then you have two doors to the same room. Not fatal."

## tree-3 -- which people the whole network depends on most

Path: Toolbar > Analyze > "Rank nodes and edges". That is centrality -- betweenness if I mean
"depends on", PageRank or degree otherwise. Glanced at "Measure the graph" but that sounds like
whole-graph stats (density, components), not per-node.

End: Toolbar > Analyze > Rank nodes and edges. Confidence: 6.

"I'd want it to say which centrality, and whether weights and direction were used."

## tree-4 -- name beside each person, team under it

Path: Thought of the Inspector first since labels are styling: Inspector > Style tab > Label (+
adds a label line). Two lines: name, then team. Then saw Rail > Data > Attributes > an
attribute's menu > "Add label line", which is the column-first way I'd prefer: click the "name"
column, Add label line; click "team", Add label line.

End: Rail > Data > Attributes > (name, then team) > Add label line. Inspector > Style > Label
would be my second try. Confidence: 5.

"Two places for the same thing. I'd guess they do the same, but I'm not sure which order wins."

## tree-5 -- try a different arrangement for the tangle

Path: Toolbar > Layout > Method.

End: Toolbar > Layout > Method. Confidence: 7.

"Though honestly for a hairball I'd filter before I'd re-lay it out."

## tree-6 -- a picture of the drawing as it is now, for slides

Path: Header > Project name > Export... > Image. The main menu also has Export... (Ctrl+E); I'd
just hit Ctrl+E.

End: Project name > Export... > Image (Ctrl+E). Confidence: 6.

## tree-7 -- every person's computed scores, in Excel

Path: First went to Project name > Export... > Data. Not sure "Data" means my computed columns or
just the original rows I loaded. Backtracked: Rail > Graph > the ranking row > right-click > "Show
in table", then Table > Table options (...) > "Export table as CSV...". That one I trust: what I
see in the table is what lands in the CSV, with my ids.

End: Table > Table options > Export table as CSV... (via the ranking row's Show in table).
Confidence: 4.

"Why is there an Export > Data and a separate Export table as CSV? Which one has the scores? I'd
open both files and diff them."

## tree-8 -- stop now, carry on tomorrow exactly here

Path: Now: Ctrl+S (Main menu or Project name > Save). If it's never been saved it probably asks
for a name. Tomorrow: Start screen > Recent projects > click it. Fallback: Open project or file...

End: Save (Ctrl+S) today; Start screen > Recent projects tomorrow. Confidence: 6.

"Exactly where I am" -- does that include the selection, the camera, the layout positions? I'd
assume positions yes, camera maybe. Would check.

## tree-9 -- from now on, ignore the small ties in every number and drawing

Path: Saw "Full graph (filter)" in the header -- that looks like a status of which filter is on,
clicked it in my head, not sure it lets me build one. Went to Rail > Data > Filters (+ adds a
step), add a step on edge weight > threshold. The checkbox to apply it suggests it is global.

End: Rail > Data > Filters > + (weight above some cutoff). Confidence: 5.

"The question is whether the filter feeds the algorithms or only hides edges on screen. That's the
denominator question. The outline doesn't tell me."

## tree-10 -- a colleague's colors and settings file, no data, apply to my network

Path: Main menu > "Apply recipe or style file...". Literally says style file.

End: Main menu > Apply recipe or style file... (also under Project name). Confidence: 6.

"Recipe vs style file -- I'd guess a recipe also includes the analyses. Not sure what their file
is, but this item takes either."

## tree-11 -- select everyone matching a typed rule (country = X and score > 50)

Path: First instinct: Ctrl+K (Quick actions) and type "select". Then looked through the outline:
Main menu > "Select where...". That's the one. Also saw an attribute's menu > "Select where (this
attribute) is...", but that's one column at a time; I need two conditions.

End: Main menu > Select where... Confidence: 5.

"Odd that it lives in the main menu beside Save and Settings. I'd expect it near search or the
selection bar."

## tree-12 -- add this week's swipes to last week's list, same columns

Path: Rail > Data > Sources > last week's file > its menu > "Add rows from file...". Exactly what
I want; "Replace with file" would be wrong here.

End: Rail > Data > Sources > (the file) > Add rows from file... Confidence: 6.

"I'd want the match report to tell me how many rows were added and how many ids were new vs
existing."

## tree-13 -- rerun everything built on March against April's export

Path: Rail > Data > Sources > March file > "Replace with file...". Then I'd expect the rankings
and groups to rerun -- or I'd go Rail > Graph > each row > Rerun. Briefly considered exporting a
Recipe and applying it to a new April project, but that's more steps.

End: Rail > Data > Sources > (March file) > Replace with file... Confidence: 4.

"Does replacing the file rerun the analyses automatically, or do they go stale silently? If
stale, I'd hate that -- stale scores next to new data is how you ship a wrong number."

## tree-14 -- a pair appearing 40 times should count as more tightly tied than a pair seen once

Path: This is how rows become edges, so it's at import. Rail > Data > Sources > the swipe file >
"Edit source..." > Data page > The chosen table > "One edge per: Row | Pair" -> Pair, then
"Weight" (I expect a count option). Looked at an attribute's "Read as..." too, but that's
types.

End: Data page (via Sources > Edit source...) > One edge per: Pair + Weight. Confidence: 5.

"If 'Pair' aggregates rows into one edge with a count as weight, great. If it just dedups and
throws the count away, that's the opposite of what I want. The outline can't tell me."

## tree-15 -- see one coloring result alone for a moment, without deleting others

Path: Rail > Graph > the list of rows > "Rows added by Analyze, each with its eye". Toggle the
eyes off on the others -- tedious. Then saw the row's right-click menu > "Show only this row".
That's it. Considered the Legend card too, but it's a display, not a control, as far as I can
tell.

End: Rail > Graph > (the result row) > right-click > Show only this row. Confidence: 6.

"And I'd want a quick way back -- does showing only one remember which eyes were on before?"

## Overall

The top-level split mostly worked for me: Analyze for algorithms, Data for sources and filters,
Export for getting things out. Where I hesitated was every place there were two doors: Export >
Data vs Export table as CSV, Inspector Label vs attribute Add label line, Open file vs New from
data. And three answers hinge on behavior the outline can't show: whether filters feed the
algorithms, whether replacing a file reruns results, and whether "Pair" keeps the count.
