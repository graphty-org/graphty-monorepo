# Session: class-project student ("Dev") -- shortest connection, Fantine to Gavroche

Task as given: "The Les Miserables network is open (example data, not your own). Work out how
Fantine and Gavroche are connected through the smallest number of go-betweens: say who the
go-betweens are, in order, and how many links it takes."

Start screen: shots/tasks/r8-t21/01.png. Renders: tmp/round-8-sessions/r8-t21--class-project-student/.
All commands run from design/ui/prototype. `$D` is the render folder above; `K word` expands to
one `--key` per letter of the word (typing it).

## Step 0 -- reading the start screen (shots/tasks/r8-t21/01.png)

"OK, it's the Les Mis one, same as the tutorial video. There's a long list on the left: Selection,
Notes, Labels, PageRank, Louvain, then 'Shortest paths' with two things under it, 'Valjean t...'
and 'Myriel to...'. Shortest paths -- that's literally my task. I can see Fantine at the top of the
picture and Gavroche down at the bottom right. Someone already did shortest paths for other
people, so I'll click that row and see if there's a way to do a new one."

## Step 1 -- click the "Shortest paths" row (01.png)

    timeout 120 node app-b/study.mjs --try $D/01.png task:r8-t21 --click "Shortest paths"

"The row went blue, but the panel on the right says 'Louvain' and 'Paints 77 nodes', 'Covered by
PageRank'. I clicked Shortest paths, why is it telling me about Louvain? Nothing changed in the
picture either. Maybe the three dots on the row."

## Step 2 -- the little toolbar icon, and the row's three dots (02.png, 03.png)

    timeout 120 node app-b/study.mjs --try $D/02.png task:r8-t21 --hover "Analyze"
    timeout 120 node app-b/study.mjs --try $D/03.png task:r8-t21 --click "Shortest paths" --click "More actions"

"The beaker at the bottom says 'Analyze'. Good to know. But first the dots -- the menu that opened
is titled 'Louvain' again: Rerun, Run as copy, 'Check against a null model'... none of this is
about paths. That's twice the left list showed me Louvain when I asked for Shortest paths. I give
up on that row. 'Analyze' sounds like the Statistics panel from the tutorial, I'll try that."

## Step 3 -- Analyze (04.png)

    timeout 120 node app-b/study.mjs --try $D/04.png task:r8-t21 --click "Analyze"

"A box called Analyze with a search bar. Under 'Recent' there's 'Shortest path -- The fewest steps,
or the lightest route, between two nod...'. Fewest steps is exactly what I want. Clicking it."

## Step 4 -- the Path between box (05.png)

    timeout 120 node app-b/study.mjs --try $D/05.png task:r8-t21 --click "Analyze" --click "Shortest path"

"'Path between'. From, To, Weight, Scope, and a grayed-out Find path button. At the top of the
picture it says 'Click a node for From'. Weight says 'value (set at load)' and 'Stronger',
'Farther', 'Capacity', and 'Shortest path reads a weight as distance: it uses 1/value.' I don't
really know what that means. 'Uses value. Edges with no value, left out: 0 of 254' -- so nothing
left out, sounds fine. I'll leave it, the defaults are probably the normal way."

## Step 5 -- clicking the names on the picture (06.png)

    timeout 120 node app-b/study.mjs --try $D/06.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "Fantine" --click "Gavroche"

Tool reported: nothing on screen is called "Fantine"; nothing on screen is called "Gavroche".

"It told me to click a node, so I clicked Fantine's name on the picture and nothing happened.
Same for Gavroche. Maybe I have to hit the dot not the word. The From box says 'Type a name'
though, I'll just type."

## Step 6 -- typing the names (07.png, 08.png, 09.png)

    timeout 120 node app-b/study.mjs --try $D/07.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "Type a name"
    timeout 120 node app-b/study.mjs --try $D/08.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "Type a name" --key F --key a --key n
    timeout 120 node app-b/study.mjs --try $D/09.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "Type a name" $(K Fantine) --key Enter --click "Click to pick" $(K Gavroche) --key Enter

Tool reported on the last: nothing on screen is called "Click to pick" (Enter had already moved
the cursor into To, so typing landed there anyway).

"Typing 'Fan' -- no dropdown of names came up, just a hint 'Click a node on the canvas, or type a
name'. I typed the whole thing and hit Enter and it jumped to To by itself, which is nice. Now it
says From Fantine, To Gavroche and the Find path button turned blue."

## Step 7 -- Find path (10.png)

    timeout 120 node app-b/study.mjs --try $D/10.png task:r8-t21 --click "Analyze" --click "Shortest path" --click "Type a name" $(K Fantine) --key Enter $(K Gavroche) --key Enter --click "Find path"

"There it is. A green line from Fantine down through Valjean, then Marius, then Gavroche. The right
side lists 'Members, in path order': Fantine start, Valjean hop 1, Marius hop 2, Gavroche end.
'4 nodes, 3 edges'. The bubble at the bottom says '3 steps. Weakest value on the path: 4'. A new
row 'Fantine t... 4 nodes' showed up in the list. 'Made with: All at their defaults.'

So the go-betweens are Valjean then Marius, and it takes 3 links. Makes sense, Valjean is in the
middle of everything and Marius ends up with the students. I don't know what 'weakest value 4'
means but I don't need it for the answer. Done."

## Answer given

Go-betweens, in order: Valjean, then Marius. Fantine -> Valjean -> Marius -> Gavroche, 3 links.

## Debrief

- **Did I succeed?** "Yes, I think so. The picture shows the path in green and the panel lists it
  in order, so I'm pretty confident."
- **Single Ease Question:** 5 of 7. "Once I found Analyze it was quick. The left list sending me
  to Louvain twice wasted time, and clicking the names on the picture didn't work."
- **Would I use this instead of my current tool (Gephi from the tutorial)?** "For this, yes --
  in Gephi I'd have had to find a plugin or just eyeball it. Here I typed two names and got the
  path written out in order, which I can paste straight into my essay. The weight stuff I'd skip,
  I don't get it."

## Moderator observation (outside the participant's voice)

The participant left Weight at its default ("value, Stronger", read as 1/value distance), so the
tool returned the lightest weighted route, which has 3 links. The task asked for the fewest
go-betweens, i.e. a hop count, which ignores weight; in this dataset Valjean and Gavroche are
directly linked, so the hop-count answer should be Fantine -> Valjean -> Gavroche, 2 links, one
go-between. The participant read the weight sentence, did not understand it, trusted the default,
and was confident in a wrong answer. Nothing on the result ("3 steps", "All at their defaults")
hinted that a route with fewer steps exists.
