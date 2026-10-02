# Session: make a third list of the characters two lists share -- Marcus, criminal intelligence analyst

Task as given: "Earlier you kept two lists of characters. Make a third list holding just the
characters the two lists have in common. The data on screen is a sample: characters of the novel
Les Miserables, linked when they appear in the same chapter. If that is not your line of work,
treat them as your own people or things."

Start screen: shots/tasks/t10/01.png. Renders: tmp/round-7-sessions/t10--intelligence-analyst/.
All commands were run from design/ui/prototype.

## Step 0 -- the start screen

"Two lists. I see Watchlist (5, locked), and under 'For the report' there's Group 2 (14) and
Group 8 (13), same little check-circle icon. Those two sitting together look like my two lists.
This is the 'who's on both' question -- I do it in Excel with a COUNTIF every week."

## Step 1 -- click Group 2

    timeout 120 node app-b/study.mjs --try .../t10--intelligence-analyst/01.png task:t10 --click "Group 2"

Right panel: "Group 2, Set from the attribute group, Paints 14 nodes". "It calls it a 'Set'. Fine,
14 people. Now where's the overlap button?" There's a three-dot button up by the name.

## Step 2 -- hover the three dots

    timeout 120 node app-b/study.mjs --try .../02.png task:t10 --click "Group 2" --hover "More"

Tooltip: "More actions  Shift+F10". "OK, that's the right-click menu."

## Step 3 -- open More actions

    timeout 120 node app-b/study.mjs --try .../03.png task:t10 --click "Group 2" --click "More actions"

The menu opened, but its title says "Community 3", the right panel switched to "Community 3,
Group from Louvain", and the Louvain row in the left list expanded into six communities.
"Hold on. I picked Group 2 and it threw me onto Community 3. That's not what I clicked." The menu
does have "Combine with selected rows" -- "that's the kind of thing I want, but it's on the
wrong row."

## Step 4 -- select both lists

    timeout 120 node app-b/study.mjs --try .../04.png task:t10 --click "Group 2" --click "Group 8"

Group 8 is selected, Group 2 is not. "Second click dropped the first. I'd Ctrl-click in Windows."
Nothing on screen told me how to pick two rows.

## Step 5 -- the Combine submenu from Group 8

    timeout 120 node app-b/study.mjs --try .../05.png task:t10 --click "Group 8" --click "More actions" --click "Combine with selected rows"

Again the menu is for Community 3. Submenu: Union, Intersect, Subtract, Exclude. "Intersect --
that's my word. But it's going to intersect the wrong thing."

## Step 6 -- try the other three-dot button by the search box

    timeout 120 node app-b/study.mjs --try .../06.png task:t10 --click "Group 2" --hover "List actions"

Tool said: nothing on screen is called "List actions". I guessed its name and missed; it has no
label I could see.

## Step 7 -- Shift+F10, the way I would in Explorer

    timeout 120 node app-b/study.mjs --try .../07.png task:t10 --click "Group 2" --key Shift+F10

Same menu, same "Community 3". "Third time. Whatever I pick, it's Community 3."

## Step 8 -- just hit Intersect and see

    timeout 120 node app-b/study.mjs --try .../08.png task:t10 --click "Group 2" --click "More actions" --click "Combine with selected rows" --click "Intersect"

New row on top: "Group 8 and Top 9 by degree", 5 people -- Gavroche, Marius, Enjolras, Courfeyrac,
Bossuet. Toast: "Added on top of the tree. Its two inputs are unchanged. Undo". The "Made with"
box says: Combine > Intersect (in both rows), From Group 8 and Top 9 by degree.

"I never made a 'Top 9 by degree'. It wasn't there when I sat down, and now it's in my list. My
Shortest paths and Betweenness rows are gone too. So it crossed Group 8 with something I didn't
pick, and it rearranged my list while it was at it. If I tell the sergeant these five are on both
lists, I'm wrong, and I'm wrong on the stand. The one thing I'll give it: the 'Made with' box
told me exactly where the list came from. That's how I caught it. That box is good."

"That's three strikes. Paste two columns into Excel, COUNTIF, done in two minutes. I'm stopping."

## Outcome

- Did I succeed? No. I made a third list, but it is Group 8 crossed with "Top 9 by degree",
  not Group 2 crossed with Group 8. I would not use it.
- Single Ease Question: 2 of 7.
- Would I use this instead of my current tool? Not for this. Excel does "who's on both lists" in
  two minutes and I can see both inputs. The word "Intersect" was right there and the result
  traced its own inputs, which I like a lot -- if the menu had acted on the rows I actually
  picked, this would have been two clicks and I'd have started asking about export.

## What got in the way

1. The row menu ("More actions", and Shift+F10) opened for "Community 3" no matter which list I
   had selected, and expanded Louvain in the list. I never got a menu for Group 2 or Group 8.
2. Clicking a second row replaced the first; nothing said how to select two rows for "Combine
   with selected rows".
3. Intersect ran on an input I did not choose ("Top 9 by degree", which was not on the start
   screen) and the list lost rows I had before (Shortest paths, Betweenness).
4. The three-dot button beside "Find rows and notes" has no name I could find.

## What worked

- The words "Combine", "Intersect", "Subtract" -- plain, the ones I'd use.
- The result's "Made with" box names the operation and both inputs, with links. That is the
  sourcing I need, and it is what let me see the result was wrong.
- The toast saying the two inputs were left unchanged, with Undo.
