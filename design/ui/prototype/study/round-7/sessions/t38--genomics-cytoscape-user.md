# Session: rename two report groups -- genomics Cytoscape user (Maren)

Task given: "The group of 14 characters in your report folder is called something meaningless. Call it something meaningful, then do the same for the next group. The data on screen is a sample: characters of the novel Les Miserables, linked when they appear in the same chapter. If that is not your line of work, treat them as your own people or things."

Start screen: shots/tasks/t38/01.png. Renders: tmp/round-7-sessions/t38--genomics-cytoscape-user/NN.png.
All commands were run from design/ui/prototype with the prefix `timeout 120 node app-b/study.mjs --try <render path> task:t38`.

## Step 1 -- read the start screen (01.png)

Think-aloud: "Left list has a folder 'For the report' with Group 2 (14) and Group 8 (13). So Group 2 is the one. Meaningless name, yes. In Cytoscape I'd right-click the network in the Network panel and Rename. The whole network on the canvas is orange-to-brown by PageRank, so I can't tell from the picture who is in Group 2."

## Step 2 -- click the row (02.png)

Command: `--click "Group 2"`

Result: the row highlights and the right panel shows "Group 2", "Paints 14 nodes", "Covered for Color by PageRank". There is a three-dot button next to the title.

Think-aloud: "Fine, it's selected. 'Covered for Color by PageRank' -- so its yellow is hidden under the PageRank coloring? That's why I can't see them. The dots are where Rename usually lives."

## Step 3 -- hover the dots (03.png)

Command: `--click "Group 2" --hover "More"`

Result: tooltip "More actions  Shift+F10".

## Step 4 -- open More actions (04.png)

Command: `--click "Group 2" --click "More actions"`

Result: a menu opened, but titled "Community 3", the Louvain folder in the tree expanded and the right panel switched to "Community 3, Group from Louvain". Rename at the top is grayed out with "A run's groups renumber when it reruns; Keep as set to name one", shortcut F2.

Think-aloud: "Wait. I clicked the dots for Group 2 and now it's Community 3 from Louvain and the Louvain folder flipped open. That's not what I clicked. If I hadn't looked at the title of the menu I'd have renamed or deleted the wrong thing -- and Delete is right at the bottom of that menu. At least it tells me Rename is F2, like Excel."

## Step 5 -- F2 on the row (05.png)

Command: `--click "Group 2" --key F2`

Result: the row turns into a text box with "Group 2" highlighted.

Think-aloud: "OK, that's a rename. Same as a filename. Good."

## Step 6 -- type a name and Enter (06.png, 07.png)

Commands:
- `--click "Group 2" --key F2 --type "Barricade students" --key Enter` (06.png)
- `--click "Group 2" --key F2 --type "Barricade students"` (07.png)

Result: in both renders the name is still "Group 2"; in 07 the edit box is open with "Group 2" still highlighted and none of my text in it. (The click-through tool may not support typing; there was no message either way.)

Think-aloud: "Nothing I type shows up. Did it take it? I can't tell. The box is there, so in a real browser I'd just type. I picked 'Barricade students' because the tight cluster at the bottom is Marius, Enjolras, Courfeyrac, Bossuet -- but that's a guess; nothing told me those are the 14."

## Step 7 -- try to see who is in it (08.png)

Command: `--click "Group 2" --click "Data"`

Result: that hit the Data icon in the far-left rail, not the Data tab in the right panel. The whole left side switched to the data source view (miserables.gexf, 77 nodes, 254 edges) and the right panel to the graph summary.

Think-aloud: "Two things called 'Data' a few centimeters apart. I wanted the member list for this group. Not going to fish for it. Whatever, I'll name the next one."

## Step 8 -- the next group (09.png)

Command: `--click "Group 2" --key F2 --key Escape --click "Group 8" --key F2`

Result: Group 8 (13, blue) row becomes an edit box with "Group 8" highlighted; right panel shows Group 8, Paints 13 nodes.

Think-aloud: "Same thing, works. I'd type a name here too. Done, I think."

## Wrap-up

Succeeded? "Mostly. I found the rename -- F2 on the row -- and opened it on both groups. I could not actually see my new name land, so I'm not fully sure it saved. And I named the first group by guessing who was in it."

Single Ease Question: 4 of 7. "Renaming itself is easy once you know F2. Finding it was not: the dots menu jumped to a different group, and nothing on the row itself says you can rename. And naming something meaningfully means knowing what's in it, and the coloring hides the group."

Would she use this instead of Cytoscape? "Not for this. Renaming a network in Cytoscape is right-click, Rename, done. Here it's fine once you know, but the menu opening on the wrong group would make me nervous about everything else in that menu. It's not a reason to switch; renaming is never the hard part of my week."

## Problems observed

- The "More actions" menu opened for Community 3 (Louvain) instead of the selected Group 2, and expanded the Louvain folder. High risk: Delete is in that menu.
- No visible cue on the row that it can be renamed; the only hint (F2) was inside a menu on the wrong item.
- No confirmation that a rename was saved (could not verify typed text in the click-through).
- No obvious way from the selected group to see its members; two controls labeled "Data" near each other, and the one hit was the left rail, which left the Graph view entirely.
- The group's own color is hidden by the PageRank coloring ("Covered for Color by PageRank"), so the canvas cannot be used to tell who is in the group before naming it.
