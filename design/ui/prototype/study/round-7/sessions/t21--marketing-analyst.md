# Session: two-line labels on the bishop's circle -- Jordan, marketing network analyst

Task as given: "Have each character in the circle around the bishop carry two pieces of text in the drawing: what they are called on top, and underneath it how many remarks have been written about them. The data on screen is a sample: characters of the novel Les Miserables, linked when they appear in the same chapter. If that is not your line of work, treat them as your own people or things."

All commands run from design/ui/prototype. Renders are in tmp/round-7-sessions/t21--marketing-analyst/.

## Start screen (shots/tasks/t21/01.png)

"OK, Les Mis. The bishop is... Myriel, I'm guessing, that little starburst top right with all the spokes. So 'the circle around the bishop' is that cluster. Everything is orange because PageRank is on top. On the left there's a list -- PageRank, Louvain, Shortest paths, Watchlist. On the right a Style panel with Fill, Shape, Effects, Label, Tooltip. Label is probably where this goes. First I need to get hold of the bishop's people."

## Step 1 -- click the bishop

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t21--marketing-analyst/01.png task:t21 --click "Myriel"

"Huh. I clicked Myriel and it picked 'Myriel to Javert' -- a shortest path row, blue, 3 nodes. That's not what I meant. I wanted the guy and his friends. Not useful."

## Step 2 -- try the clusters

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t21--marketing-analyst/02.png task:t21 --click "Louvain"

"Louvain is the clustering, fine -- six groups. Clicking it opened a table at the bottom: Community 1 to 6, size, density, edges inside, edges leaving. Community 3 is 10 people with only 3 edges leaving, and it has a 2 in the Notes column. The bishop's starburst is about ten dots hanging off on its own. That smells like Community 3. But nothing on the map tells me which color is which, because PageRank is painted over everything."

## Step 3 -- pick Community 3

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t21--marketing-analyst/03.png task:t21 --click "Louvain" --click "Community 3"

"Right panel now says Community 3, 'Paints 10 nodes', 'Covered for Color by PageRank'. Good, at least it admits it's hidden. Still can't see on the map that these are the bishop's people. I'm going on a hunch."

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t21--marketing-analyst/04.png task:t21 --click "Louvain" --click "Community 3" --click "Data"

"I wanted the Data tab on the right to see who's in the group. Instead it jumped the whole left side to a Data page about the file. Two things called Data next to each other. Annoying. Backing out."

## Step 4 -- try to see the cluster colors

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t21--marketing-analyst/05.png task:t21 --click "Louvain" --click "Community 3" --hover "Hide"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t21--marketing-analyst/06.png task:t21 --click "Louvain" --click "Hide PageRank"

"Hovering the eye says 'Hide Community 3, Alt-click show only this row'. Nice, that's a real tooltip. So I hid PageRank to see the clusters. The eye is crossed out now... and the map is still all orange. So either it didn't work or the map doesn't update. That's the kind of thing that makes me not trust a screenshot for the deck. I'll go with Community 3 = bishop's circle and move on."

## Step 5 -- find the label control

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t21--marketing-analyst/07.png task:t21 --click "Louvain" --click "Community 3" --click "Label"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t21--marketing-analyst/08.png task:t21 --click "Louvain" --click "Community 3" --click "Add label"
      -> nothing on screen is called "Add label"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t21--marketing-analyst/09.png task:t21 --click "Louvain" --click "Community 3" --hover "+"
      -> nothing on screen is called "+"
    (also tried --hover "Add Label" and "Add a label": nothing on screen by those names)
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t21--marketing-analyst/09.png task:t21 --click "Louvain" --click "Community 3" --hover "Add"

"Clicking the word 'Label' does nothing. The plus is the thing. Rested on one -- 'Add to Shape'. OK so the Label one is 'Add to Label'. Took me four goes to find a plus sign, which is a bit silly, but now I know the pattern."

## Step 6 -- add the name line

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t21--marketing-analyst/10.png task:t21 --click "Louvain" --click "Community 3" --click "Add to Label"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t21--marketing-analyst/11.png task:t21 --click "Louvain" --click "Community 3" --click "Add to Label" --click "Label line"

"Menu: 'Label line' or 'Show labels'. Label line sounds like one line of text, and I need two, so that. Now there's an 'Above' row with 'Pick a field' and a list: Typed text, label, group, degree, betweenness, Louvain, PageRank, and then a Notes section with 'Latest note' and 'Note count'. Note count -- that's my 'how many remarks'. Great, I didn't have to count them myself."

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t21--marketing-analyst/12.png task:t21 --click "Louvain" --click "Community 3" --click "Add to Label" --click "Label line" --click "label"

"I clicked 'label' and it sorted my table by the label column instead and closed the list. Above still says Pick a field. The field is literally called 'label' and so is a column header, so I hit the wrong one."

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t21--marketing-analyst/13.png task:t21 --click "Louvain" --click "Community 3" --click "Add to Label" --click "Label line" --click "Name, Label"

"Clicked the grey 'Name, Label' bit on the right of that row instead. Above: label. Good."

## Step 7 -- add the count line underneath

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t21--marketing-analyst/14.png task:t21 --click "Louvain" --click "Community 3" --click "Add to Label" --click "Label line" --click "Name, Label" --click "Add to Label" --click "Label line" --click "Note count"
      -> nothing on screen is called "Label line"

"Second time I hit the plus it didn't ask 'Label line' again, it just put a 'Below' row in and I picked Note count. Now it reads Above: label, Below: # Note count. That's exactly the shape I asked for -- name on top, count under it."

"But the map hasn't changed at all. No names on the bishop's dots, no numbers. Fantine and Myriel and the big ones had names before and they still do; the little spokes are blank. So I set it up and I can't see it. And I'm still only guessing Community 3 is the bishop's crowd."

## Where I stopped

Stopped here. The panel says the right thing; the drawing doesn't show it, and I never confirmed the group is the bishop's.

Off-topic: "This is the same as our listening suite -- you configure a widget, it says 'saved', and the chart shows yesterday's data until you refresh three times. And my VP only reads the first slide anyway, so if the labels aren't on the picture, it didn't happen."

## Verdict

- Succeeded? Probably, partly. The label settings look right (name above, note count below) on Community 3. Two doubts: I had to guess that Community 3 is the circle around the bishop, because clicking Myriel picked a path and hiding PageRank did not reveal the cluster colors; and the map never showed the new labels.
- Single Ease Question: 4 of 7. "Note count" being a ready-made field saved me real work. Finding the unnamed plus, the 'label' field colliding with the 'label' column, and the two Data buttons all cost me tries.
- Would I use this instead of my current tool? Not yet. In Gephi I can't even put a note count on a node, so the idea is better than what I have. But I couldn't select the people by clicking the person, and I couldn't see the result on the map. If I can't see it, I can't screenshot it for the deck, and then it doesn't help me.
