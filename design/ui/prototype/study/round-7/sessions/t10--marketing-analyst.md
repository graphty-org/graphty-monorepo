# Session: make a third list of the characters two kept lists share -- Jordan, marketing network analyst

Task as given: "Earlier you kept two lists of characters. Make a third list holding just the
characters the two lists have in common. The data on screen is a sample: characters of the novel
Les Miserables, linked when they appear in the same chapter."

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t10--marketing-analyst/ (D below).

## Start screen (shots/tasks/t10/01.png)

"OK, left side is a tree of stuff. PageRank, Louvain, Shortest paths, a Watchlist with 5, then a
folder called 'For the report' with Group 2 (14) and Group 8 (13). Those two have the same little
check-circle icon as Watchlist, so I guess those are lists. 'Two lists I kept' -- I'm going to bet
it's the two in the report folder, Group 2 and Group 8. Watchlist has a lock on it, so I'm leaving
that alone. Honestly in Excel I'd just VLOOKUP one against the other. Let me find something that
says 'compare' or 'overlap'."

## Step 1 -- click Group 2

    timeout 120 node app-b/study.mjs --try $D/01.png task:t10 --click "Group 2"

"Right panel says 'Group 2, Set from the attribute group', paints 14 nodes, then a color. That's
styling. Nothing about what's in it or what to do with it. No 'compare' anywhere."

## Step 2 -- hover Group 2; click the dots ("More")

    timeout 120 node app-b/study.mjs --try $D/02.png task:t10 --click "Group 2" --hover "Group 2"
    timeout 120 node app-b/study.mjs --try $D/03.png task:t10 --click "Group 2" --click "More"

"Hover does nothing new. I clicked the three dots and... it opened Louvain and threw up a menu for
'Community 3'? I didn't touch Community 3. That's a bit alarming. But fine, the menu has 'Combine
with selected rows' and 'Compare with'. That's the kind of thing I want -- I just want it on MY
list."

## Step 3 -- look for Combine on Group 2 directly; try selecting both lists

    timeout 120 node app-b/study.mjs --try $D/04.png task:t10 --click "Group 2" --click "Combine with selected rows"
      -> nothing on screen is called "Combine with selected rows"
    timeout 120 node app-b/study.mjs --try $D/05.png task:t10 --click "Group 2" --click "Group 8"

"Not there without the menu. And clicking Group 8 after Group 2 just swaps to Group 8 -- I can't
get both highlighted. 'Combine with selected rows' implies I select two rows. How? I'd try
Cmd-click in real life, but nothing tells me that works."

## Step 4 -- the dots on the right panel ("More actions")

    timeout 120 node app-b/study.mjs --try $D/06.png task:t10 --click "Group 8" --click "More actions"
    (I also tried "Actions" and "Options"; the render was overwritten, then redone with "More actions")

"Group 8 selected, I hit the dots... and it's Community 3 again. Same menu, same wrong row. Every
dots button I touch takes me to Community 3. OK, whatever, let me see what Combine even offers."

## Step 5 -- Combine with selected rows

    timeout 120 node app-b/study.mjs --try $D/07.png task:t10 --click "Group 8" --click "More actions" --click "Combine with selected rows"

"Union, Intersect, Subtract, Exclude. Intersect is the one -- 'in both'. Database words, but I know
them. I'll gamble and click it."

## Step 6 -- Intersect

    timeout 120 node app-b/study.mjs --try $D/08.png task:t10 --click "Group 8" --click "More actions" --click "Combine with selected rows" --click "Intersect"

"OK, something happened. New row at the top: 'Group 8 and Top...', 5. Toast says 'Added on top of
the tree. Its two inputs are unchanged.' and there's an Undo -- good, I like Undo. Right panel: 5 of
77 nodes, members Gavroche, Marius, Enjolras, Courfeyrac, Bossuet with their degree, and 'Made with:
Combine > Intersect (in both rows), From Group 8, Top 9 by degree'. That's actually nice -- it says
where it came from.

"But wait. Top 9 by degree? I never saw a 'Top 9 by degree' list. It wasn't on the screen when I
started -- it's in the tree NOW, and Shortest paths and Betweenness have disappeared. I meant Group
2. So either the app picked my second list for me, or there's a list I forgot I made. I can't tell
which. If this were my creator shortlist I would not send that to anyone without checking."

## Step 7 -- check the mystery list

    timeout 120 node app-b/study.mjs --try $D/10.png task:t10 --click "Group 8" --click "More actions" --click "Combine with selected rows" --click "Intersect" --click "Top 9 by degree"

"I clicked 'Top 9 by degree' to see what's in it and the whole tree went back to how it was at the
start -- my new list is gone, Top 9 is gone, Community 3 is selected again. Did it undo? I have no
idea. That's my second weird thing in one session. I'm stopping here."

## Wrap-up

- Did I succeed? "Kind of. I got a list of 5 that's 'in both' something, and it tells me how it was
  made, which I liked. But it was Group 8 and a 'Top 9 by degree' list I never saw, not the two
  lists I thought I had. And when I went to check, it vanished. I'd say I don't trust it."
- Single Ease Question: 3 out of 7. "The word Intersect was there once I found it. Getting a menu
  for MY list, and getting two lists selected at once, I never managed."
- Would I use this instead of my current tool? "Not for this. In Excel or Brandwatch I'd export both
  lists and do a lookup, two minutes, and I know exactly which two lists went in. Here the menu kept
  opening for a row I didn't pick and the second input was chosen for me. The 'made with' panel is
  better than what I have -- if the inputs were the ones I chose, I'd use it."

## Problems seen

1. Every three-dots button (left list header and right panel header) opened a menu for "Community 3",
   a row I had not selected, and expanded Louvain in the tree. (severity: high)
2. No visible way to select two lists at once; "Combine with selected rows" assumes a multi-select
   the screen never teaches. Clicking a second row replaces the first. (high)
3. Intersect combined Group 8 with "Top 9 by degree", a list not on the start screen, instead of the
   other list in the same folder; the participant had no say in the second input. (high)
4. After Intersect the tree changed shape (Shortest paths and Betweenness rows gone, Top 9 by degree
   appeared) with no explanation. (medium)
5. Clicking an input list named in "Made with" reset the whole screen to the start state, losing the
   new list with no message. (high)
6. Combine options use set-theory words (Intersect, Exclude) with no plain gloss like "in both". The
   result's "(in both rows)" helped after the fact. (low)

## Delights

- The result explains itself: count, share of the graph, members with degree, "Made with Combine >
  Intersect, from Group 8 and Top 9 by degree", and the source file.
- The toast says the two inputs are unchanged and offers Undo.
