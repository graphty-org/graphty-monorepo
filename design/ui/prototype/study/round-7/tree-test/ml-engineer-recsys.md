# Tree test -- Chris, ML engineer (recommendation systems)

Participant: an ML engineer who lives in notebooks and PyTorch Geometric, knows network-science
vocabulary, skims labels, and checks denominators. He saw only the text outline of the app.
Confidence is 1 (pure guess) to 7 (certain).

## tree01 -- the go-betweens between groups
Path: Toolbar > Analyze > "Search, or say what to find", typed "betweenness". If that came up
empty: Toolbar > Analyze > Rank nodes and edges, look for betweenness centrality.
End: Analyze > Rank nodes and edges (betweenness).
Confidence: 6
Says: "That's betweenness. Bridges between communities -- maybe I'd run Find groups first, but
the ranking is the answer. I want to know if it's exact or sampled."

## tree02 -- a colleague's written reason about a cluster
Path: Rail > Notes > Find in notes, typed the cluster name. Glanced at Show (about the selection)
too.
End: Rail > Notes > Find in notes.
Confidence: 6
Says: "Notes is right there on the rail. Could also be hanging off the grouping row in the Graph
list, but search in Notes is faster."

## tree03 -- a picture for Friday's slides
Path: Main menu first (no export there, backed out) > Project name > Export... > Image.
End: Project name > Export... > Image.
Confidence: 5
Says: "Export living under the project name took one wrong turn. Main menu is where I expected
File-ish stuff."

## tree04 -- colleague's colors and settings, no data
Path: Main menu > Settings... -- read General / Privacy / Performance, that's app preferences,
not it, backed out. Project name > Export... saw "Recipe", so the import side must be near it:
Project name > Apply recipe or style file...
End: Project name > Apply recipe or style file...
Confidence: 5
Says: "Word 'settings' sent me to Settings. 'Recipe' is a strange word for a style config. I only
connected it because I'd seen Export > Recipe one task ago."

## tree05 -- what the project looked like before Tuesday
Path: Project name > Version history.
End: Project name > Version history.
Confidence: 6
Says: "Assuming it shows who did what, not just timestamps. Undo/Redo won't cover Tuesday."

## tree06 -- leave out small transfers everywhere from now on
Path: Header "Full graph (filter)" looked like the place; it probably opens the same thing as
Rail > Data > Filters (+ adds a step), add a weight threshold step, keep its checkbox on.
End: Rail > Data > Filters > + (a weight step).
Confidence: 5
Says: "My real question is whether the rankings and group counts recompute on the filtered graph
or just the drawing. Nothing in the outline tells me. If it's only visual, it's useless to me."

## tree07 -- 40 co-occurrences tie tighter than 1
Path: Rail > Data > Attributes -- nothing about counts. Rail > Data > Sources > the file's menu >
Edit source... > data page. "One edge per: Row | Pair" -- Pair should collapse the 40 rows into
one edge, and hopefully the count becomes the weight. Also looked at the Weight role under the
columns, but I have no weight column, just repeated rows.
End: Data page > One edge per: Pair.
Confidence: 4
Says: "This is a groupby-count in pandas. I'm guessing 'Pair' does that and stores the count as a
weight. If it just dedups and throws the count away, it's the opposite of what I want. Also
needs 'every analysis' to actually use weight."

## tree08 -- try a different arrangement
Path: Toolbar -- Pause layout only, no choice of method. Right-click empty canvas > Re-run layout
/ Reshuffle layout seed -- that's the same layout again, not a different one. Tried Quick actions
(Ctrl+K) and would type "layout". Then Inspector (nothing selected) > Style tab > Layout > Method.
End: Inspector > Style tab > Layout > Method.
Confidence: 4
Says: "Layout under 'Style' is odd, and only when nothing is selected. I'd have found it through
Ctrl+K, not by browsing."

## tree09 -- come back to this exact angle on Monday
Path: Toolbar > View > Save view. (Same thing as Rail > Views > Save view.)
End: View > Save view.
Confidence: 6
Says: "Saved view, fine. As long as it keeps the camera and not just the filter. And Present is
there for the manager."

## tree10 -- how far groups moved between last month and this month
Path: Rail > Graph > Graph switcher > Compare graphs...
End: Graph switcher > Compare graphs...
Confidence: 5
Says: "Also saw 'Compare with another row...' on a grouping row -- that might be the better one if
I want group-to-group overlap, like a Jaccard or ARI between the two runs. I'd try Compare graphs
first."

## tree11 -- pick everyone matching a typed rule
Path: Toolbar > Analyze > "Search, or say what to find" -- that's for algorithms, backed out.
Rail > Data > Attributes > country > Create set where this is... -- one column at a time, I need
two conditions. Remembered the main menu had "Select where..." when I opened it earlier.
End: Main menu > Select where...
Confidence: 5
Says: "A query in the hamburger menu is weird. I want a filter bar where I type
country == 'DE' and score > 0.8. If I hadn't scanned that menu for the export task I'd have
missed it."

## tree12 -- what does it send back to its makers
Path: Header > "Local only (privacy)" chip to read it. To change it: Main menu > Settings... >
Privacy.
End: Main menu > Settings > Privacy.
Confidence: 6
Says: "Good that 'Local only' is in the header. IT will want it in writing in the docs too, but
this is where I'd check."

## tree13 -- rerun everything from March on April's export
Path: Rail > Data > Sources > the March file's menu > Replace with file...
End: Sources > file menu > Replace with file...
Confidence: 6
Says: "Exactly what I'd want. Then I'd check the Match report on the data page for ids that
didn't line up, and whether the rankings rerun on their own or I have to hit Rerun on each row."

## tree14 -- name next to each person, department under it
Path: Rail > Data > Attributes > name > Label by. For the department: Label by again on
department -- but that probably replaces the name. Moved to Inspector > Style tab > Label (+ adds a
label line) and added department as a second line.
End: Inspector > Style > Label (+ adds a label line).
Confidence: 4
Says: "Two places to set a label. I'm guessing the first one sets line one and the Inspector does
the rest."

## tree15 -- hide three people but keep them in every count
Path: Select the three, right-click a node > Hide on canvas (or the Selection bar > Hide on canvas).
End: Right-click a node > Hide on canvas.
Confidence: 5
Says: "'On canvas' suggests it's only visual and counts still include them, which is what I want.
Filters would drop them from the numbers. Nothing tells me the denominator though -- I'd check a
ranking's Summary afterward."

## tree16 -- scores came in as text, make them numbers
Path: Rail > Data > Attributes > score > Read as...
End: Attributes > score menu > Read as...
Confidence: 5
Says: "'Read as' is astype. I'd rather it had guessed numeric on import; I'd also look at the column
role on the data page if this weren't there."
