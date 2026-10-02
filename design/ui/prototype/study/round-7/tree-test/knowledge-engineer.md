# Tree test transcript -- Dr. Min-ji Kim, knowledge graph engineer

Participant reads only the text outline of the app's navigation. Paths are written top-down;
"back" marks a backtrack. Confidence is 1 (pure guess) to 7 (certain).

## tree01 -- the go-betweens between groups

Path: Toolbar > Analyze > (read the list) "Find paths and edge sets"? No, that is routes. Back. >
Rank nodes and edges.
End: Toolbar > Analyze > Rank nodes and edges.
Confidence: 5.
Said: "Go-betweens is betweenness centrality. I expect it under ranking. I will want to see that it
says betweenness, and which normalization, before I believe the number. 'Rank nodes and edges' is
the only place a centrality could live."

## tree02 -- a colleague's note on why a cluster mattered

Path: Rail > Notes > Find in notes (type the cluster's name). If that misses: Show > about this
graph.
End: Rail > Notes > Find in notes.
Confidence: 5.
Said: "There is also Notes in the Graph list and a Notes block in the Data tab. Three places for
notes. I go to the one called Notes. If the note is attached to the group itself I might have
needed the grouping row, but I would not know that."

## tree03 -- a picture of the network for Friday's slides

Path: Header > Project name > Export... > Image.
End: Project name > Export... > Image.
Confidence: 6.
Said: "I want SVG, not a screenshot. The outline does not say which formats Image gives me."

## tree04 -- a colleague's colors and settings, no data

Path: Header > Main menu > Settings... ? No -- that is my own app settings. Back. > Project name >
Apply recipe or style file...
End: Project name > Apply recipe or style file...
Confidence: 5.
Said: "'Style file' matches. I do not know what a 'recipe' is versus a style file, and I would want
a preview of what it will overwrite before it touches my graph."

## tree05 -- what the project looked like before Tuesday, and what changed since

Path: Header > Project name > Version history.
End: Project name > Version history.
Confidence: 6.
Said: "Assuming it lists who did what, not just timestamps. A change list is what I actually need."

## tree06 -- leave out small transfers everywhere from now on

Path: Header > Full graph (filter)? That looks like a status chip; I suspect it leads to the same
place. > Rail > Data > Filters (+ adds a step).
End: Data > Filters > + (a step on the weight or amount).
Confidence: 5.
Said: "Filters with steps and checkboxes reads like a pipeline. Good. I need to know the counts and
rankings are computed after the filter, not on the full graph. The outline does not tell me."

## tree07 -- 40 co-occurrences tie a pair more tightly than one

Path: Rail > Data > Attributes > ... there is no count to pick yet. Back. > Data > Sources > the
spreadsheet's menu > Edit source... > data page > One edge per: Row | Pair -> Pair. Then look for a
Weight role, but there is no column that holds the count.
End: data page > One edge per: Pair.
Confidence: 3.
Said: "I am guessing that 'one edge per pair' collapses the 40 rows into one edge and counts them
as its weight. Nothing says it does. If it just de-duplicates and throws the count away, that is
silent data loss, which is exactly what I do not trust. Weight is a column role, and I do not have
a weight column."

## tree08 -- try a different arrangement for a tangle

Path: Toolbar > Pause layout / Resume layout -- no. > View -- camera things only. Back. > Canvas
right-click > Re-run layout / Reshuffle layout seed -- same method, new seed, not a different way.
Back. > Inspector (nothing selected) > Style tab > Layout > Method.
End: Inspector > Style tab > Layout > Method.
Confidence: 4.
Said: "Layout under Style is odd. Position is not style -- unless you are telling me position is
meaningless, which I would rather you say out loud. Took me three tries."

## tree09 -- come back to this exact angle on Monday

Path: Rail > Views > Save view (+).
End: Views > Save view.
Confidence: 6.
Said: "Also under the toolbar's View. Same thing twice, fine."

## tree10 -- how far groups moved between last month and this month

Path: Rail > Graph > Graph switcher > Compare graphs...
End: Graph switcher > Compare graphs...
Confidence: 4.
Said: "There is also 'Compare with another row...' on a grouping. I do not know whether 'how far
groups moved' is comparing two graphs or comparing two groupings. I go with graphs because the
task says two months. I would want to know how it matched group 3 in March to a group in April --
group ids from two runs do not line up on their own."

## tree11 -- select everyone matching a typed rule

Path: Toolbar > Analyze > Search, or say what to find -- "say what to find" sounds like a chatbot;
I will not type a query into an assistant. Back. > Rail > Data > Filters -- but I want to select,
not remove. Back. > Rail > Graph > Find rows and notes -- that is searching the list, not the
nodes. Back. > Header > Main menu > Select where...
End: Main menu > Select where...
Confidence: 4.
Said: "Found it by reading the whole main menu. Selecting is a graph operation; why is it next to
'Open recent' and 'Settings'? I want to see the expression language documented, and whether it
takes AND, comparisons and a property path."

## tree12 -- what does the program send home, and change it

Path: Header > Local only (privacy) -- this I click first; it is the one thing I care about. Then
Main menu > Settings... > Privacy. Also glance at Diagnostics and Assistant.
End: Main menu > Settings... > Privacy (with the Local only chip as the first stop).
Confidence: 6.
Said: "Diagnostics and Assistant are the two that could leak. If Privacy does not cover both, IT
will not sign off. 'Report a problem' under Help -- what does it attach?"

## tree13 -- rerun everything built on March with April's numbers

Path: Rail > Data > Sources > the March file's menu > Replace with file...
End: Data > Sources > (March file) > Replace with file...
Confidence: 5.
Said: "I expect it to rerun the groupings and rankings on the new file. I would also look for a
Rerun on each row in the Graph list. What happens to a group whose members are gone in April --
does it tell me, or quietly drop them?"

## tree14 -- name next to each person, department under it

Path: Rail > Data > Attributes > name's menu > Label by. Then department > Label by -- would that
replace the name? Probably. Back. > Inspector (nothing selected) > Style tab > Label (+ adds a label
line), and add department as the second line.
End: Inspector > Style tab > Label, with a second line added.
Confidence: 4.
Said: "Two ways in. 'Label by' on the attribute does one line; the second line I only found because
of the plus sign."

## tree15 -- hide three people but keep them in every count

Path: select them > Canvas right-click on a node > Hide on canvas. (Selection bar has the same.)
End: right-click a node > Hide on canvas.
Confidence: 4.
Said: "'On canvas' suggests the counts keep them. Suggests. Filters clearly remove things; this
does not say what it does to the numbers. I would check the node count in the Summary before and
after."

## tree16 -- scores came in as words; tell it they are numbers

Path: Rail > Data > Attributes > score's menu > Read as...
End: Data > Attributes > (score) > Read as...
Confidence: 5.
Said: "Read as is the datatype cast. I would also have expected to fix this on the data page at
import, where I set the column roles, but there is no type for a column there, only a role.
I want to be told how many values failed to parse, not have them turned into zeros."

## Overall

Said: "Most things are where I would look, once I read every menu end to end, which I do. Three
worried me: weight from repeated rows is a guess, layout sits under Style, and nothing tells me
whether hiding or filtering changes the numbers. Those are the ones that decide whether I trust a
count."
