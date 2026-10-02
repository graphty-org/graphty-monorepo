# Tree test -- Expert Emma (network scientist)

Read the whole outline once, top to bottom, before the first task. First impression: the main
menu mixes file things with selection things ("Select where...", "Select edges between") -- odd
place for those, but at least I know they exist now. Layout lives under Style in the Inspector,
which I would not have guessed. No API anywhere in this outline, which I noted and moved on.

## tree01 -- the go-betweens

This is betweenness centrality. I want a ranking.

1. Toolbar > Analyze. Glanced at "Find paths and edge sets" -- no, that is routes, not brokers.
2. Toolbar > Analyze > Rank nodes and edges. Expect betweenness in there, node betweenness
   specifically, and I want to see the normalization before I trust it.

End: Toolbar > Analyze > Rank nodes and edges (betweenness).
Confidence: 6. Only doubt is whether the ranking list calls it "betweenness" or some cute name.

## tree02 -- a colleague's note on a cluster

1. Rail > Notes. "Every note, newest first", and "Find in notes" if there are many.
2. Considered Graph > the grouping row (a run, opening to its groups) -- the note might be
   attached to the group itself. The Inspector Data tab also has Notes. But I do not know which
   group they meant, so the full notes list is the safer start.

End: Rail > Notes > Find in notes (or scroll every note).
Confidence: 5. The note is probably in there; I would not know which cluster without it.

## tree03 -- a picture for Friday's slides

1. Project name > Export... > Image.

Honestly I would screenshot. But if I am being good, that is the place.

End: Project name > Export... > Image.
Confidence: 6.

## tree04 -- the lab's colors and settings file

1. Main menu > Settings... > General > Theme. Colors, maybe? No -- that is the app's
   light/dark, not a style for the network. Back out.
2. Project name > Export... > Recipe -- that is the way OUT; the file came from there on their
   side, probably.
3. Project name > Apply recipe or style file...

End: Project name > Apply recipe or style file...
Confidence: 5. "Recipe or style" -- I do not know which of the two this file is, but the item
takes both, so fine.

## tree05 -- what changed since Tuesday

1. Project name > Version history.

End: Project name > Version history.
Confidence: 6. Assuming it shows who did what, not just timestamps.

## tree06 -- leave out the small transfers everywhere

1. Header > Full graph (filter). That chip says the graph is unfiltered, so clicking it is
   probably how I filter. But I do not know what it opens.
2. Rail > Data > Filters (+ adds a step). Add a step on edge weight, above some threshold.
3. My question: do the filters feed the algorithms, or only the drawing? "Every number" is the
   point. Nothing in the outline tells me. "Show filtered-out nodes faintly" in the Canvas
   settings suggests filtered things are out of the graph, not just greyed, which is what I want.

End: Rail > Data > Filters > + step (weight threshold).
Confidence: 4 on the place, 3 on whether the rankings honor it.

## tree07 -- 40 swipes means a stronger tie

This is aggregation: collapse repeated rows into one edge with a count as weight.

1. Rail > Data > Sources > the file's menu > Edit source... -- opens the data page.
2. The chosen table > "One edge per: Row | Pair". Pair, presumably merging duplicate pairs.
3. Then I want the count to become the Weight. The column roles list has Weight, but I have no
   count column -- the count would be created by the merge. I would hope Pair makes the count
   the weight automatically. Not stated.
4. Considered Analyze options, per algorithm "use weights" -- but the task says every analysis,
   so it belongs at the data.

End: Data > Sources > Edit source... > data page > One edge per: Pair (and Weight).
Confidence: 4. Right place, not sure the count becomes a weight without me doing something.

## tree08 -- a different arrangement

1. Toolbar > View. Fit, standard views, 2D/3D. Not layout methods. Back.
2. Right-click empty canvas > Re-run layout / Reshuffle layout seed. That is the same method
   again, not a different way.
3. Toolbar > Pause layout -- just pause.
4. Inspector (nothing selected) > Style tab > Layout > Method.

End: Inspector > Style tab > Layout > Method.
Confidence: 4. Took me four tries; layout under "Style" is the wrong word for it.

## tree09 -- keep this angle for Monday

1. Rail > Views > Save view (+). Also on Toolbar > View > Save view.
2. Monday: Rail > Views, or Toolbar > View > Your views.

End: Rail > Views > Save view, then pick it from saved views.
Confidence: 6.

## tree10 -- how far the groups moved between months

1. Rail > Graph > Graph switcher > Compare graphs...
2. Considered a grouping row's right-click > "Compare with another row..." -- if I ran the
   grouping on both months, that compares the two partitions, which is closer to what I want
   (how membership changed, a mutual-information style comparison). Not sure if it crosses
   graphs.

End: Graph switcher > Compare graphs...
Confidence: 4. Two candidates; I would try Compare graphs first and fall back to the row.

## tree11 -- select by a typed rule

1. Main menu > Select where... -- I saw it on the first read. Odd place, but it is the thing.
2. Briefly considered Toolbar > Analyze > "Search, or say what to find" -- the "say what" smells
   like a chat box, skipping it.

End: Main menu > Select where...
Confidence: 5. Only because I read the outline top to bottom; in the app I would look near the
selection or the table first and maybe never open the hamburger.

## tree12 -- what the program sends home

1. Header > Local only (privacy). That chip is the first thing I would click. It probably says
   what stays local.
2. Main menu > Settings... > Privacy -- to change it.
3. Also glanced at Settings > Diagnostics -- crash reports and the like probably live there,
   and that is exactly what IT means by "sends back". Two places for one question.

End: Settings > Privacy (checking Diagnostics as well), reached via the Local only chip.
Confidence: 5.

## tree13 -- rerun everything on April's file

1. Rail > Data > Sources > March's file > Replace with file...
2. Then each analysis row's right-click > Rerun, unless replacing does it on its own. The
   outline does not say.

End: Data > Sources > the file's menu > Replace with file...
Confidence: 5 on starting there; 3 on whether the rankings rerun without me clicking each one.

## tree14 -- name next to each person, department under it

1. Rail > Data > Attributes > name > Label by. That gets the name.
2. For the second line: Inspector > Style tab > Label (+ adds a label line), add department.
   I am not sure what has to be selected for that -- the graph, a row, all nodes?

End: Inspector > Style tab > Label (+ line), possibly starting from Attributes > Label by.
Confidence: 4.

## tree15 -- hide three people but keep them in the counts

1. Select them, then Selection bar > Hide on canvas (or right-click a node > Hide on canvas).
2. "On canvas" suggests drawing only, versus Data > Filters which removes them. That is the
   distinction I want, if the words mean what they say.
3. Main menu > Show hidden elements to bring them back later.

End: Selection bar > Hide on canvas.
Confidence: 5 on the place; 4 that counts really include them -- I would check the node count.

## tree16 -- scores came in as text

1. Rail > Data > Attributes > score > Read as...
2. Alternative: data page > the column's role / Type. But "Type" there seems to be about the
   table, not a column.

End: Data > Attributes > the score attribute's menu > Read as...
Confidence: 5.

## Overall

Most of it is findable by someone who reads the whole outline. Weak spots: layout hidden under
Style; "Select where..." buried in the main menu; filters that may or may not feed the numbers;
two possible answers for comparing groupings; privacy split across a chip, Privacy and
Diagnostics. And still no API in sight.
