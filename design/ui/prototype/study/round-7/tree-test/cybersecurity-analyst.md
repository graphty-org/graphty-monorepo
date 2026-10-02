# Tree test -- Priya, threat hunter (cybersecurity analyst persona)

Read the outline once, top to bottom, skimming headings. Opening remark: "Fine. There's a
'Local only (privacy)' thing right in the header -- that's the first thing I'd click, before any
of this. Where's the query box? I see 'Select where...' buried in the hamburger menu. Odd place
for it."

## tree01 -- the go-betweens

Path: Toolbar > Analyze > Rank nodes and edges.
"Go-betweens is betweenness. That's a ranking. I'd expect betweenness centrality in the rank list."
Glanced at Find paths and edge sets ("choke points could be a path thing") but stayed with Rank.
End: Toolbar > Analyze > Rank nodes and edges (pick betweenness). Confidence: 5.

## tree02 -- a colleague's note about a cluster

Path: Rail > Notes > Find in notes.
"Notes has a search. I'd type the cluster's name or the colleague's name. If I had the cluster
selected I'd use Show > about the selection." Did not look in the Graph list's Notes row.
End: Rail > Notes > Find in notes (or Show: about the selection). Confidence: 6.

## tree03 -- picture for Friday's slides

Path: Header > Main menu -- nothing about export there, backed out. Header > Project name >
Export... > Image.
"Export hiding under the project name is not where I'd look first. Ctrl+E is fine once I know it.
I want a legend on that picture or my lead asks what the colors mean."
End: Project name > Export... > Image. Confidence: 5.

## tree04 -- colleague's colors and settings file

Path: Header > Main menu > Open... -- stopped, "that probably opens it as a new project, I want it
on the one I have open." Backed out. Header > Project name > Apply recipe or style file...
"'Recipe' -- whatever. 'Style file' is close enough to what they sent."
End: Project name > Apply recipe or style file... Confidence: 5.

## tree05 -- what the project looked like before Tuesday

Path: Header > Undo -- no, that's my own clicks, not someone else's Tuesday. Header > Project
name > Version history.
"That's the audit log I want. If it doesn't say who did what, it's half a log."
End: Project name > Version history. Confidence: 6.

## tree06 -- drop small transfers from everything

Path: Header > Full graph (filter) -- "that's the filter, it says filter." Expected it to take me
to the filter steps. Then Rail > Data > Filters (+ adds a step), add a step on amount/weight.
"Not sure a filter here changes the numbers, or just what's drawn. 'Every number' is the point.
If the rankings still count the small ones I'd never know."
End: Rail > Data > Filters > + add a step (weight above a threshold). Confidence: 4.

## tree07 -- repeat door swipes count as a tighter tie

Path: Rail > Data > Sources > the spreadsheet's menu > Edit source... > the data page. Looked at
the column roles first -- Weight -- "but I don't have a count column, every row is one swipe."
Then saw "One edge per: Row | Pair".
"Pair. That's stats count by user, building. I'm guessing it turns the count into the weight. If
it doesn't, I'd count it in Splunk and load the count as a Weight column."
End: data page > One edge per: Pair (with Weight as fallback). Confidence: 4.

## tree08 -- try a different arrangement

Path: Canvas > Right-click on empty canvas > Re-run layout.
"I don't care where dots sit. Re-run layout or Reshuffle seed -- one of those." Did not go to the
Inspector; did not think of it as a place for layout.
"If Re-run just does the same tangle again, I'd be stuck and I'd give up on the drawing and use
the table."
End: Right-click empty canvas > Re-run layout. Confidence: 3.

## tree09 -- come back to this angle on Monday

Path: Toolbar > View > Save view. Noticed Rail > Views has Save view and Present too.
"Save it, then Monday I open Views and hit Present. Fine."
End: Toolbar > View > Save view (then Rail > Views on Monday). Confidence: 6.

## tree10 -- how far groups moved between last month and this month

Path: Rail > Graph > Graph switcher > Compare graphs...
"Two graphs, compare. Obvious enough." Saw a row's right-click Compare with another row... and
wondered if that's the one for groups specifically, but stayed with Compare graphs.
End: Graph switcher > Compare graphs... Confidence: 5.

## tree11 -- select everyone matching a typed rule

Path: Toolbar > Analyze > Search, or say what to find -- "'say what to find' sounds like an AI
box. I'm not typing my query into a chatbot." Backed out. Quick actions (Ctrl+K)? Skipped, that's
a command palette. Header > Main menu > Select where...
"'Select where' -- like a WHERE clause. That's the query box, hopefully. Why is it in the
hamburger menu with Settings? It should be the first thing on the screen."
End: Main menu > Select where... Confidence: 4.

## tree12 -- what does it send back to its makers

Path: Header > Local only (privacy) -- first click, it's the claim I want to check. Then Main
menu > Settings > Privacy to actually change it. Glanced at Diagnostics: "that's probably the
part that phones home, crash reports. I'd look there too."
End: Settings > Privacy (and Diagnostics). Confidence: 6.

## tree13 -- rerun March's work on April's export

Path: Header > Main menu > Open... -- no, that's a new project, I lose everything. Rail > Data >
Sources > March file's menu > Replace with file...
"Replace with April. Then I'd expect the groups and rankings to rerun on their own. If they
don't, I'd go to each row in the Graph list and hit Rerun, and I'd be annoyed."
End: Data > Sources > file menu > Replace with file... Confidence: 5.

## tree14 -- name next to each person, department under it

Path: Rail > Data > Attributes > name > Label by. Then department > Label by.
"Second Label by probably replaces the first. Then what?" Went looking: Inspector > Style tab >
Label (+ adds a label line). "Plus adds a line -- that's the 'under it'."
End: Attributes > name > Label by, then Inspector > Style > Label > + for department.
Confidence: 4.

## tree15 -- hide three people but keep them in counts

Path: select them, Selection bar > Hide on canvas (same as right-click a node > Hide on canvas).
"'On canvas' tells me it's only the drawing. Not Filter, filter would drop them from counts. I'd
check one ranking before and after to be sure."
End: Selection bar > Hide on canvas. Confidence: 5.

## tree16 -- scores came in as words, make them numbers

Path: Rail > Data > Attributes > score > Read as...
"Read as... is the only thing that sounds like a type cast." Thought about Edit source... and the
data page column role, but the roles list is Key, Name, Weight, Attribute -- nothing says number.
End: Attributes > score's menu > Read as... Confidence: 4.

## Closing remark

"Most of it I'd find. The query thing is the one that matters to me and it's the one hiding in
the hamburger menu next to Settings. And the 'say what to find' box -- I'd skip it, it reads like
an assistant."
