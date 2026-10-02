# Session: make a list of what two kept lists have in common -- played as Maren (genomics postdoc, Cytoscape user)

Task as given: "Earlier you kept two lists of characters. Make a third list holding just the characters the two lists have in common. The data on screen is a sample: characters of the novel Les Miserables, linked when they appear in the same chapter. If that is not your line of work, treat them as your own people or things."

Start screen: shots/tasks/t10/01.png. All commands run from design/ui/prototype; renders in tmp/round-7-sessions/t10--genomics-cytoscape-user/.

## Step 0 -- the start screen

Maren: "OK, so characters are my genes. Two lists I kept... On the left there's 'Watchlist, 5' with a lock, and a folder 'For the report' with 'Group 2, 14' and 'Group 8, 13'. Those two have the same little check-circle icon and sit together in a folder I apparently made, so I'm guessing those are my two lists. Watchlist has the same icon too, though, which bugs me a bit -- three lists, the task says two. I'll go with the two in the report folder. In Cytoscape I'd do this in the node table, or honestly I'd paste both lists into R and run intersect(). Let's see if it has a way."

## Step 1 -- click Group 2

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t10--genomics-cytoscape-user/01.png task:t10 --click "Group 2"

Saw: Group 2 highlighted; right panel says "Group 2 -- Set from the attribute group", "Paints 14 nodes", fill color. Nothing about combining.

Maren: "Fine, it's a 'set'. 'From the attribute group' -- so it was made from a column. There's a three-dot button top right of that panel. That's usually where the stuff lives."

## Step 2 -- what's the three-dot button?

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t10--genomics-cytoscape-user/02.png task:t10 --click "Group 2" --hover "More actions"
    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t10--genomics-cytoscape-user/03.png task:t10 --click "Group 2" --click "More actions"

Saw (02): tooltip "More actions Shift+F10". Saw (03): a big dark menu -- but its title says "Community 3", the Louvain branch in the tree has sprung open, Community 3 is highlighted, and the right panel now says "Community 3, Group from Louvain". The menu has "Keep as set", "Combine with selected rows >", "Compare with >", "Export...", "Delete".

Maren: "Wait. I had Group 2 selected. Why is it talking about Community 3? I didn't touch Louvain. ... Anyway, 'Combine with selected rows' -- that sounds like the thing. But it's Community 3's menu, not mine."

## Step 3 -- look in the combine submenu

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t10--genomics-cytoscape-user/04.png task:t10 --click "Group 2" --click "More actions" --click "Combine with selected rows"

Saw: submenu Union / Intersect / Subtract / Exclude. Menu is still titled Community 3.

Maren: "Intersect. Good, that's the word I'd use, that's what I want. But 'with selected rows' means I need both of my lists selected first, and the menu keeps opening on Community 3. Let me select both of mine and try again."

## Step 4 -- select both groups, open the menu again

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t10--genomics-cytoscape-user/05.png task:t10 --click "Group 2" --click "Group 8" --click "More actions"

Saw: exactly the same menu, titled Community 3, Community 3 highlighted. Nothing on screen tells me Group 2 and Group 8 are both selected.

Maren: "Same thing. I can't even tell whether clicking Group 8 added it or just replaced Group 2. In a list I'd expect shift-click or checkboxes; those little circles next to the names might be checkboxes but I don't know."

## Step 5 -- try the Data tab for the set

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t10--genomics-cytoscape-user/06.png task:t10 --click "Group 2" --click "Data"

Saw: this took me to the left-side "Data" section (sources, miserables.gexf, attributes), not the Data tab of Group 2. Right panel shows a summary of the whole network.

Maren: "No, that's the whole file. Not what I meant. Wrong 'Data'. Two things called Data on one screen."

## Step 6 -- keyboard shortcut from the tooltip

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t10--genomics-cytoscape-user/07.png task:t10 --click "Group 2" --key "Shift+F10"

Saw: the Community 3 menu again.

Maren: "Every road leads to Community 3. OK."

## Step 7 -- peek at Compare with

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t10--genomics-cytoscape-user/08.png task:t10 --click "Group 2" --click "More actions" --click "Compare with"

Saw: "Another row..." / "The rest of the graph".

Maren: "'Compare' would show me differences, I want the overlap as a list. I'll just go for Intersect and see what it gives me."

## Step 8 -- Intersect

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t10--genomics-cytoscape-user/09.png task:t10 --click "Group 2" --click "Group 8" --click "More actions" --click "Combine with selected rows" --click "Intersect"

Saw: a new row at the top of the tree, "Group 8 and Top... 5". Right panel: "Group 8 and Top 9 by degree -- Set from Intersect", Nodes 5 of 77, members Gavroche, Marius, Enjolras, Courfeyrac, Bossuet with their degrees, "Made with: Combine > Intersect (in both rows), From: Group 8, Top 9 by degree". Toast: "Added on top of the tree. Its two inputs are unchanged. Undo". The tree now also shows a "Top 9 by degree, 9" row I had never seen, and the "Shortest paths" rows are gone.

Maren: "Hold on. 'Group 8 and Top 9 by degree'? I picked Group 2 and Group 8. Where did 'Top 9 by degree' come from? It wasn't in the list a second ago. I like that it tells me what it was made from, and that the two inputs are unchanged, and that I get a member list with a count -- that's the bit I'd actually paste into a paper. But it intersected the wrong thing, or a thing I didn't know I had. That's the silent swap that kills me in Cytoscape."

## Step 9 -- was Top 9 hiding?

    timeout 120 node app-b/study.mjs --try tmp/round-7-sessions/t10--genomics-cytoscape-user/10.png task:t10 --click "Show hidden rows"

Saw: the hidden row is "Degree", a measure. No "Top 9 by degree" anywhere on the start screen.

Maren: "No. It wasn't hidden. So either I kept 'Top 9 by degree' earlier and the list just didn't show it, or the app picked it for me. Either way I don't know which two lists my 'earlier' self kept, and the one place I could check -- the tree -- didn't show it. I'm stopping here."

## Wrap-up

Did I succeed? "Not sure, leaning no. I got a third list of 5 names and it says it's an intersection, which is the right operation. But it lists inputs I didn't choose. If my two lists were Group 2 and Group 8, this isn't it. If they were Group 8 and Top 9 by degree, I'd never have known that from the screen I started on."

Single Ease Question (1 = very difficult, 7 = very easy): 3. "Finding Intersect was fine once I opened the dots menu. Everything around it fought me: the menu kept naming Community 3, I couldn't see whether I had two rows selected, and the result named a list I'd never seen."

Would I use this instead of my current tool? "For this? No -- I'd paste the two columns into R, intersect(), done, and I know exactly what went in. The 'made from' record and the member list with degree are nice; Cytoscape doesn't give me that. But the inputs have to be the ones I clicked, and the screen has to show me what's selected. And the paper figure would still come out of Cytoscape."

## Problems seen (for the moderator)

1. The three-dot menu and Shift+F10 always opened a menu titled "Community 3" and expanded Louvain, while Group 2 (or Group 8) was the selected row.
2. No visible sign of multi-select: after clicking Group 2 then Group 8, nothing showed two rows selected, though the action says "with selected rows".
3. The intersection's inputs were "Group 8" and "Top 9 by degree"; "Top 9 by degree" was not on the start screen, even with hidden rows shown. Feels like silent input substitution.
4. Which "two lists" the task means is ambiguous: Watchlist, Group 2 and Group 8 all carry the same set icon.
5. Two controls called "Data" (rail section and inspector tab); clicking "Data" went to the rail.
6. The Shortest paths rows vanished from the tree after the intersection, unexplained.

## Liked

- "Intersect" is the plain word, under "Combine".
- The result says what it was made from, gives a count (5 of 77), lists members, and says the inputs are unchanged, with Undo.
