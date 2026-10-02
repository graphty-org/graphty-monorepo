# Session: intersect two lists -- Expert Emma

Task as given: "Earlier you kept two lists of characters. Make a third list holding just the
characters the two lists have in common. The data on screen is a sample: characters of the novel
Les Miserables, linked when they appear in the same chapter."

Start screen: shots/tasks/t10/01.png. All commands run from design/ui/prototype; renders are in
tmp/round-7-sessions/t10--expert-emma/.

## Step 0 -- the start screen

Left tree: Selection, Notes, PageRank, Louvain (6 groups), Shortest paths (two paths), Watchlist
(5, locked), a folder "For the report" with Group 2 (14), Group 8 (13) and Betweenness, then
Everything. "Local only" in the top bar -- good, that is the first thing I look for.

"Two lists I kept." Lists of characters. The rows with the little check-circle icon look like the
list kind: Watchlist, Group 2, Group 8. That is three, not two. I would guess Group 2 and Group 8,
since they sit together in "For the report". Or Watchlist and one of them. The task does not tell
me and the screen does not either. Let me click them and see what they say they are.

## Step 1 -- click Watchlist

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t10--expert-emma/01.png task:t10 --click "Watchlist"

Inspector says "Watchlist -- Set", "Paints 5 nodes". So these are called sets. Fine, a set is a
list without order; that is the right word for an intersection anyway.

## Step 2 -- click Group 2, hover the "..." in the inspector

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t10--expert-emma/02.png task:t10 --click "Group 2"
    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t10--expert-emma/03.png task:t10 --click "Group 2" --hover "More"

Group 2: "Set, from the attribute group", 14 nodes. So Group 2 and Group 8 came from an attribute
column, not from me. Watchlist has no "from", so maybe that is the one I made. Still ambiguous.
The "..." tooltip says "More actions, Shift+F10". Good, a keyboard shortcut for the context menu.

## Step 3 -- open More actions

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t10--expert-emma/04.png task:t10 --click "Group 2" --click "More actions"

Wait. The menu header says "Community 3", and the tree has expanded Louvain and selected
Community 3. I had Group 2 selected. Why am I looking at Community 3's menu? The inspector now
says Community 3 too. That is not what I clicked on.

The menu itself is reasonable: Select members, Show members in table, Analyze, Keep as set,
"Combine with selected rows" with a submenu arrow, Move to folder, Compare with, Export. "Combine
with selected rows" is obviously where an intersection lives.

## Step 4 -- try the keyboard instead (Shift+F10 on Group 2)

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t10--expert-emma/05.png task:t10 --click "Group 2" --key Shift+F10

Same thing: Community 3's menu. So whatever I do I get Community 3. Annoying. I will go with it
and see what Combine does.

## Step 5 -- Combine with selected rows

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t10--expert-emma/06.png task:t10 --click "Group 2" --key Shift+F10 --click "Combine with selected rows"

Submenu: Union, Intersect, Subtract, Exclude. Plain set operations, no cute names. Good. But
"with selected rows" -- I have one row selected (or two? Group 2 and now Community 3?). I never
got to pick the second list. I click Intersect anyway.

## Step 6 -- Intersect

    timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t10--expert-emma/07.png task:t10 --click "Group 2" --key Shift+F10 --click "Combine with selected rows" --click "Intersect"

A new set at the top: "Group 8 and Top 9 by degree", 5 nodes. Toast: "Added on top of the tree.
Its two inputs are unchanged. Undo". Inspector, Data tab:
- Summary: 5 of 77 nodes, 6 percent, degree 13-22. Denominator given, thank you.
- Members: Gavroche 22, Marius 19, Enjolras 15, Courfeyrac 13, Bossuet 13.
- Made with: Combine > Intersect (in both rows), from Group 8 and Top 9 by degree, data
  miserables.json, all 77 nodes. "A set keeps its members; it does not follow later changes to
  its inputs."

That provenance block is exactly what I want: operation, both inputs, dataset, and the snapshot
semantics stated. I could cite that.

But: the inputs are Group 8 and "Top 9 by degree". I started from Group 2 and the menu was
Community 3's. "Top 9 by degree" was not in the tree when I started; now it is, and Shortest paths
and Betweenness are gone from the list. So the result is an intersection of two lists I did not
choose. Sanity check: 13 and 9 overlapping in 5 high-degree characters of the barricade group is
plausible, and the degrees listed are consistent with being in a top 9. If those are the two
lists "I kept earlier", then fine, the job is done. I cannot tell from the screen that they were.

I stop here. I would not keep clicking to reverse-engineer which two rows the app thought I meant.

## Verdict

Did I succeed? Probably, in the sense that a third set now exists holding the intersection of two
sets, with its inputs and operation recorded. Not in the sense that I chose the two inputs. I
could not multi-select two rows that I could see, and the menu I opened belonged to a different
row than the one I had selected. If this happened with client data I would undo it and do it in
pandas: `set(a) & set(b)`.

Single Ease Question: 3 of 7. Finding the operation was easy (context menu, Combine, Intersect,
standard names). Telling the app WHICH two lists was not possible as far as I could see, and the
"which lists did I keep" part of the task had three candidates on screen.

Would I use this instead of my current tool? For this job, no -- it is one line in the notebook.
For handing a view to an investigator, the result is good: the "Made with" block naming both
inputs, the dataset and that the set is a frozen snapshot is better than anything Gephi gives me,
and the members list with degree is the table I would want. Fix the selection so the operation
runs on the rows I picked, and show both inputs before I commit, and I would trust it.
