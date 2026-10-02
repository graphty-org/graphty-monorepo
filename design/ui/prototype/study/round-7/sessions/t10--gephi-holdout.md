# Session: make a third list of the characters two lists share

Participant: the Gephi holdout (Dr. Mara Lindqvist, fictional composite persona).
Task as given: "Earlier you kept two lists of characters. Make a third list holding just the
characters the two lists have in common. The data on screen is a sample: characters of the novel
Les Miserables, linked when they appear in the same chapter."

All commands were run from `design/ui/prototype`. D below is
`/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-7-sessions/t10--gephi-holdout`.

## Start screen (shots/tasks/t10/01.png)

"Les Mis, 77 nodes, colored by PageRank, sized by degree. Fine. Two lists I kept... On the left
there are rows with a little check-circle icon: Watchlist, 5, with a lock, and under a folder 'For
the report', Group 2 with 14 and Group 8 with 13. Watchlist is locked, so I probably did not make
it to play with. The two in the report folder are the obvious pair -- Group 2 and Group 8. In
Gephi this is an Intersection operator in the Filters panel: drag both partitions into it. Let me
see what a right-click or a row menu gives me here."

## Step 1 -- click Group 2

    timeout 120 node app-b/study.mjs --try $D/02.png task:t10 --click "Group 2"

"Right panel says 'Group 2, Set from the attribute group, Paints 14 nodes'. So a list is a 'set'.
Fine, I will translate that. No intersect anywhere in this panel. There is a '...' at the top
right."

## Step 2 -- the '...' menus

    timeout 120 node app-b/study.mjs --try $D/03.png task:t10 --click "Group 2" --hover "More"
    timeout 120 node app-b/study.mjs --try $D/04.png task:t10 --click "Group 2" --click "More"
    timeout 120 node app-b/study.mjs --try $D/05.png task:t10 --click "Group 2" --click "More actions"

"Hovering the '...' says 'More actions, Shift+F10'. I click it and -- what? The left tree has
expanded Louvain and jumped to 'Community 3', and the menu is titled Community 3. I asked for Group
2's actions. The right panel now says Community 3 too. I clicked it twice, same thing. That is the
sort of thing that makes me not trust a tool: I don't know which object I'm operating on."

## Step 3 -- try to select both lists

    timeout 120 node app-b/study.mjs --try $D/06.png task:t10 --click "Group 2" --click "Group 8"
    timeout 120 node app-b/study.mjs --try $D/07.png task:t10 --hover "Group 2 more"
      -> nothing on screen is called "Group 2 more"

"Clicking Group 8 just replaces Group 2. I can't ctrl-click from here [the session tool only
clicks], so I can't get both selected. No per-row '...' I can find by name."

## Step 4 -- keyboard shortcut from the tooltip

    timeout 120 node app-b/study.mjs --try $D/08.png task:t10 --click "Group 2" --key Shift+F10

"Shift+F10 on Group 2: again the Community 3 menu. Consistent, at least. Consistently wrong."

## Step 5 -- the Combine submenu

    timeout 120 node app-b/study.mjs --try $D/09.png task:t10 --click "Group 2" --click "More actions" --click "Combine with selected rows"

"'Combine with selected rows' -- Union, Intersect, Subtract, Exclude. Good, those are the right
words, that is Gephi's operator set. But 'selected rows' -- I only have one row selected, and the
menu belongs to Community 3, not to either of my lists. I'll press Intersect and see what it
claims to have done."

    timeout 120 node app-b/study.mjs --try $D/10.png task:t10 --click "Group 2" --click "More actions" --click "Combine with selected rows" --click "Intersect"

"It made a new row at the top: 'Group 8 and Top 9 by degree', 5 nodes -- Gavroche, Marius,
Enjolras, Courfeyrac, Bossuet. The provenance block is actually nice: 'Combine > Intersect (in
both rows), From Group 8, Top 9 by degree, miserables.json, all 77 nodes', and 'a set keeps its
members; it does not follow later changes to its inputs'. That is exactly the sentence I'd want
for reproducibility.

But: Top 9 by degree? I never saw a list called that. It was not in the tree when I started.
And I started from Group 2, the menu was Community 3's, and the result is Group 8 and something
else. Also the Shortest paths rows and Betweenness are gone from the tree now. Where did they go?
And the data says miserables.json while a minute ago the graph said miserables.gexf. I don't know
what I just computed on. The toast says 'Its two inputs are unchanged' and offers Undo -- good
that undo exists, I'll give it that."

## Step 6 -- look for another way in

    timeout 120 node app-b/study.mjs --try $D/11.png task:t10 --hover "Options"
    (also tried --hover "List actions" and "More list actions": nothing on screen is called those)
    timeout 120 node app-b/study.mjs --try $D/12.png task:t10 --click "List options"

"The '...' beside the search box is 'List options': New folder, Show hidden rows, Collapse all.
No combine there. I'm done. In Gephi I'd have dragged two partitions into an Intersection filter
and been finished in thirty seconds."

## Verdict

- **Succeeded?** I don't think so. I got a third list of 5 characters, but it is the overlap of
  Group 8 and a "Top 9 by degree" list I never saw, not of the two lists I picked. Either the app
  decided which two lists I meant, or it operated on something other than what I clicked. Either
  way I would not put that list in a report.
- **Single Ease Question:** 2 of 7.
- **Would I use this instead of Gephi?** No. The operator names are right and the "made with"
  record on the result is better than anything Gephi gives me. But I clicked Group 2, the menu
  opened for Community 3, and the result came from two other lists. If I can't tell which object
  an action applies to, I can't trust any number it gives me. I'd stay on Gephi.
