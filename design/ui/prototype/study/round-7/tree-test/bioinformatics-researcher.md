# Tree test -- Dr. Chen, computational biologist

Participant: the bioinformatics researcher persona (protein interaction networks; Cytoscape and R/igraph
user). She saw only the text outline of the navigation. Confidence is 1 (pure guess) to 7 (certain).
Quotes are in her voice.

## tree01 -- the go-betweens

Path: Toolbar > Analyze > Rank nodes and edges.
Where she ends: Rank nodes and edges, expecting betweenness centrality in there.
Confidence: 6. Direct.

"Go-betweens is betweenness. Bottlenecks. That's a ranking, so Rank nodes. I glanced at 'Find paths and
edge sets' because of the word paths, but a single shortest path won't tell me who the network depends
on. I'd want to see whether it's weighted and whether it's normalized before I trust the list."

## tree02 -- a colleague's note about a cluster

Path: Rail > Notes > Find in notes (then scan "Every note, newest first").
Where she ends: Rail > Notes.
Confidence: 6. Direct.

"There's a Notes tab on the rail. I'd type the cluster name into Find in notes. If the note is pinned to
the grouping row I might also find it in the Inspector's Data tab under Notes, but I'd start at the
obvious place."

## tree03 -- a picture for Friday's slides

Path: Main menu (three lines) -- no Export there, back out -> Project name > Export... > Image.
Where she ends: Project name > Export > Image.
Confidence: 5. Backtracked once.

"In Cytoscape it's File > Export, so I opened the hamburger first. Nothing. Export lives under the
project name, which is not where I'd look, but Ctrl+E is there. Image -- I hope that means SVG with real
text and not a screenshot of whatever is on screen."

## tree04 -- a colleague's colors and settings file, no data

Path: Main menu > Open... (hesitated -- that would open it as a project, not apply it) -> back ->
Project name > Apply recipe or style file...
Where she ends: Project name > Apply recipe or style file...
Confidence: 5. Backtracked once.

"Cytoscape: File > Import > Styles. Here I was afraid Open would replace my network with an empty one.
'Apply recipe or style file' says what I want. I don't know what a recipe is, but style file is the part
that matches."

## tree05 -- what the project looked like before Tuesday

Path: Project name > Version history.
Where she ends: Version history.
Confidence: 6. Direct.

"Version history. I'd expect a list with dates and who did what. If it only says 'autosave 14:02' with no
description of the change, it doesn't answer the second half of the question."

## tree06 -- leave out small transfers everywhere

Path: Header > Full graph (filter) -- looked, unsure what it does -> Rail > Data > Filters (+ adds a step).
Where she ends: Data > Filters, adding a step on the weight.
Confidence: 5. Small detour.

"A cut-off on edge score, like STRING at 0.7. That's a filter. The 'Full graph' chip in the header is
probably telling me no filter is on, so I went to Data > Filters. What I need to know is whether a
filter changes the numbers or only the drawing -- the question says both. If the rankings still count
the dropped edges I'd want that stated."

## tree07 -- 40 swipes together means a tighter tie

Path: Rail > Data > Sources > the spreadsheet's menu > Edit source... -> the data page -> looked at the
column roles for Weight (but I have no count column, every row is one swipe) -> "One edge per: Row | Pair".
Where she ends: data page, One edge per: Pair (hoping it counts the rows and uses that as the weight).
Confidence: 3. Wandered.

"I know what I want: collapse duplicate pairs and use the count as the edge weight. I looked for
Weight first, but there is no column to give it. 'One edge per Pair' sounds like it merges duplicates. Does
it keep the count? Does it become the weight? Nothing in the outline says so. In R I'd do a group_by and
count and be done. I also wondered whether this belongs in each analysis's options, but the question
says every analysis, so the data page is the only place that is 'every'."

## tree08 -- try a different arrangement

Path: Toolbar > View (no layouts there) -> Canvas right-click (Re-run layout and Reshuffle seed, but
those are the same method again) -> Inspector, nothing selected > Style tab > Layout > Method.
Where she ends: Inspector > Style > Layout > Method.
Confidence: 4. Backtracked twice.

"Cytoscape has a Layout menu at the top. Here I tried View on the toolbar, then right-click. Re-run is not
a different method. I found Method under Style, which I would not have guessed -- layout isn't style.
At least there's a Seed, which I want."

## tree09 -- come back to this exact angle on Monday

Path: Rail > Views > Save view (+).
Where she ends: Views > Save view.
Confidence: 6. Direct.

"Save view. Also on the toolbar's View menu. On Monday it should be in the list under Views. Present
would be for the manager."

## tree10 -- how far the groups moved between last month and this month

Path: Rail > Graph > Graph switcher > Compare graphs...
Where she ends: Compare graphs...
Confidence: 4. Direct, but considered the row menu.

"Two networks, compare. That's the switcher. I also saw 'Compare with another row' on a grouping's menu,
which might be the actual module-to-module comparison. I'd start at Compare graphs and expect it to offer
the groupings from each month. If it only shows shared and specific edges, I'd come back to the row."

## tree11 -- select everyone matching a rule

Path: Toolbar > Analyze > "Search, or say what to find" (looks like a chatbot box, backed off) ->
Rail > Graph > Find rows and notes (that searches the list, not nodes) -> Data > Attributes > an
attribute's menu > Create set where this is... (only one attribute at a time) -> Main menu > Select where...
Where she ends: Main menu > Select where...
Confidence: 4. Backtracked three times.

"In Cytoscape this is the Select panel or a filter with two conditions. I didn't expect it under the
hamburger next to Settings; I only found it by reading the whole menu. 'Say what to find' I won't use
unless I can see the rule it wrote."

## tree12 -- what the program sends home

Path: Header > Local only (privacy) -> Main menu > Settings... > Privacy (and a look at Diagnostics).
Where she ends: Settings > Privacy.
Confidence: 5. Direct-ish.

"There's a 'Local only' chip at the top, which is what I want to hear. I'd click it, then go to Settings >
Privacy to see the actual list. Diagnostics might be where crash reports go out, so I'd check that too.
I want it in writing for IT, not a toggle."

## tree13 -- rerun March's work on April's export

Path: Rail > Data > Sources > the March file's menu > Replace with file...
Where she ends: Replace with file...
Confidence: 5. Direct.

"Replace the March file with April and everything downstream should recompute. I'd then look at each
grouping row for a Rerun, because I don't trust that it reruns on its own, and I'd check the node counts
before anything else. 'Refresh' is for when the same file changed, I think."

## tree14 -- name next to each person, department under it

Path: Rail > Data > Attributes > name > Label by -> then Inspector > Style > Label (+ adds a label line)
for the department.
Where she ends: Inspector > Style > Label, with two lines.
Confidence: 4. Two places.

"Label by on the attribute gets me the name. The second line I'd only find because the Inspector says
'+ adds a label line'. I'd rather do it all in one place. Cytoscape's style panel does both."

## tree15 -- hide three people but keep them in the numbers

Path: Canvas > right-click a node (after selecting the three) > Hide on canvas. Same on the selection bar.
Where she ends: Hide on canvas.
Confidence: 5. Direct.

"'Hide on canvas' versus filter -- the wording says it's only the drawing, so counts should keep them.
I'd verify by checking the node count didn't drop. 'Show hidden elements' in the main menu brings them
back, I assume."

## tree16 -- scores came in as text

Path: Rail > Data > Attributes > the score attribute's menu > Read as...
Where she ends: Read as...
Confidence: 5. Direct. (Considered the data page's column Type on re-import.)

"Read as -- number. If it can't parse some values I want to be told which rows, not have them silently
turned into zero or blank."

## Overall

Found most things on the first or second try. Hardest: making repeated pairs into a weight (no word for
weight or count where I'd expect it), selecting by a rule (buried in the hamburger), and changing the
layout method (filed under Style). Exporting under the project name rather than the main menu cost one
backtrack.
