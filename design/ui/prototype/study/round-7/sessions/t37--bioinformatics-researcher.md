# Session: t37, played as Dr. Chen (computational biologist)

Task as given by the moderator: "Look at just one of the coloring results on its own for a moment. Then take three characters out of sight while every count still includes them, and check that the numbers really did not change."

All commands were run from design/ui/prototype. D = tmp/round-7-sessions/t37--bioinformatics-researcher.

## Start screen (shots/tasks/t37/01.png)

"Les Miserables, 77 characters. Left panel is a stack of rows: PageRank, Louvain with 6 groups, two shortest paths, a Watchlist, a folder 'For the report' with Group 2 (14), Group 8 (13), Betweenness, then 'Everything'. Everything on the canvas is orange; the right panel says PageRank 'Covers Louvain for Color'. So the colorings are stacked like Cytoscape styles, except Cytoscape only ever lets you have one. 'Just one on its own' -- I want a solo button. I don't see one."

## Step 1 -- looking for "show only this"

    timeout 120 node app-b/study.mjs --try $D/01.png task:t37 --hover "PageRank"

"Hovering the row does nothing new. There's an eye on the right of the PageRank row."

    timeout 120 node app-b/study.mjs --try $D/02.png task:t37 --click "More"

"Row menu: Rename, Select top N, Show in table, Filter to, Lock, Hide in list, Add note, Compare with another row, Delete. No 'show only this'. Annoying -- that's the first place I'd look."

    timeout 120 node app-b/study.mjs --try $D/03.png task:t37 --hover "Hide"

"Tooltip on the eye: 'Hide PageRank -- Alt-click or Alt+Space: show only this row.' So solo is a hidden modifier on the eye. I'd never have found that without hovering; it's the second line of a tooltip, which I normally skip."

    timeout 120 node app-b/study.mjs --try $D/04.png task:t37 --click "Louvain" --key "Alt+Space"

"I wanted Louvain, the one coloring that actually distinguishes groups. Clicking 'Louvain' opened a Louvain table at the bottom (6 communities, sizes 25/17/10/10/9/6) instead of selecting the row. Alt+Space did nothing visible. Fine, the community table is useful, but not what I asked for."

    timeout 120 node app-b/study.mjs --try $D/05.png task:t37 --click "PageRank" --key "Alt+Space"

"The eye on PageRank went blue and the other rows look a shade grayer. The canvas looks identical, because PageRank was already the color on top. Is this solo? Nothing tells me 'showing only PageRank' in words. I'll take it that it is, but I'm guessing. I'd have preferred to see Louvain on its own, where the change would be visible."

## Step 2 -- hiding three characters

Baseline numbers I wrote down before hiding: 77 nodes; Group 2 = 14, Group 8 = 13, Watchlist = 5; Valjean degree 36, Gavroche 22, Marius 19, Javert 17; PageRank 0.0754 / 0.0358 / 0.0309 / 0.0303.

    timeout 120 node app-b/study.mjs --try $D/06.png task:t37 --click "Myriel"

"Tried to click a character on the canvas. It selected the 'Myriel to Javert' path row instead. OK, use the table."

    timeout 120 node app-b/study.mjs --try $D/07.png task:t37 --click "Table"

"Node table: 77 nodes, columns 'Degree (full graph)', 'PageRank (full graph)', 'Betweenness (full graph)'. Good -- the header says what the number is computed over. That's exactly the thing I'd check."

    timeout 120 node app-b/study.mjs --try $D/08.png task:t37 --click "Table" --click "Gavroche"
    timeout 120 node app-b/study.mjs --try $D/09.png task:t37 --click "Table" --click "Gavroche" --click "Marius" --click "Javert"

"Clicking a row selects that node and a small action bar appears. Clicking another row replaces the selection; Selection stays at 1. I can't build a selection of three by clicking."

    timeout 120 node app-b/study.mjs --try $D/10.png task:t37 --click "Table" --click "Gavroche" --hover "Hide"

"The crossed eye in the action bar is 'Hide on canvas (Ctrl+Shift+H)'. 'On canvas' is the right wording -- it tells me it's only visual."

    timeout 120 node app-b/study.mjs --try $D/11.png task:t37 --click "Table" --click "Gavroche" --click "Hide on canvas" --click "Marius" --click "Hide on canvas" --click "Javert" --click "Hide on canvas"

"What? The toast says 'Valjean hidden on canvas'. I never selected Valjean. Gavroche, Marius and Javert are all still drawn. Only one node is hidden."

    timeout 120 node app-b/study.mjs --try $D/12.png task:t37 --click "Table" --click "Gavroche" --click "Hide on canvas"

"Just Gavroche, one click on Hide: again 'Valjean hidden on canvas', the panel now says Valjean is selected. It hid the wrong character. That is a stop-the-session problem for me -- if I can't trust which node it acted on, I can't trust anything it says it excluded."

    timeout 120 node app-b/study.mjs --try $D/13.png task:t37 --click "Table" --click "Gavroche" --click "Hide on canvas" --click "Marius" --hover "Hide on canvas"

"And selecting Marius afterwards brings Valjean back: the '1 node hidden on canvas' line is gone. So hiding doesn't even stick."

    timeout 120 node app-b/study.mjs --try $D/14.png task:t37 --click "More" --click "Select top N..."
    timeout 120 node app-b/study.mjs --try $D/15.png task:t37 --click "More" --click "Select top N..." --click "How many" --key Backspace --key 3 --click "Select"

"Other route: select the top three by PageRank and hide them together. 'Select top N by PageRank', default 5. My attempt to type 3 didn't take; it selected 5 nodes. The 'Why this look' panel now says 'x of 5', which I do like. But no visible selection outline on the canvas."

    timeout 120 node app-b/study.mjs --try $D/16.png task:t37 --click "More" --click "Select top N..." --key Tab --key "Control+a" --key 3
    timeout 120 node app-b/study.mjs --try $D/17.png task:t37 --click "More" --click "Select top N..." --key Tab --key "Control+a" --key 3 --click "Select" --click "Hide on canvas"

"Got 3 into the box. Selected, hit Hide on canvas: 'Valjean hidden on canvas', Selection count dropped to 1, one node hidden. The other two of my three were not hidden."

    timeout 120 node app-b/study.mjs --try $D/18.png task:t37 --click "More" --click "Select top N..." --key Tab --key "Control+a" --key 3 --click "Select" --click "Hide on canvas" --click "Table"
    timeout 120 node app-b/study.mjs --try $D/19.png task:t37 --click "Table" --click "Gavroche" --key "Control+Shift+H" --click "Marius" --key "Control+Shift+H" --click "Javert" --key "Control+Shift+H"

"Checking counts with Valjean hidden: still 77 nodes, Valjean's degree still 36, PageRank 0.0754, Group 2 still 14, Group 8 13. So for ONE hidden node the numbers did hold, and the column headers say '(full graph)', which is how I'd know. The keyboard shortcut does the same thing as the button: Valjean, every time, no matter who I selected."

## Outcome

"I'm stopping. I could solo a coloring only through a modifier key buried in a tooltip, and on PageRank it changed nothing I could see. I could not hide three characters: every hide hid Valjean, whom I never selected, and selecting anyone else unhid him. For the one node that did vanish, the counts did not move, and the '(full graph)' headers and '1 node hidden on canvas -- Select, Show' line are the right idea. But the task was three, and the tool acted on the wrong node."

- Succeeded? No. Solo: probably, but unconfirmed. Hiding three: failed; hid one, and the wrong one.
- Single Ease Question: 2 / 7.
- Would I use this instead of my current tool? "Not on this showing. In igraph I'd subset the plot with a logical vector and the degree vector is untouched, and I can prove it. Here, 'hide on canvas' versus filtering and '(full graph)' on the column headers are exactly the distinctions I want, and Cytoscape muddles them. But a hide that lands on a node I didn't pick is the kind of silent wrong-node error I can't defend to a reviewer. Fix that, give me shift-click or a way to hide a whole selection, put a plain 'Show only this' in the row menu, and I'd look again."
