# Session: rename the two report groups -- Marcus, criminal intelligence analyst

Task as given: "The group of 14 characters in your report folder is called something meaningless.
Call it something meaningful, then do the same for the next group."

Renders are in design/ui/prototype/tmp/round-7-sessions/t38--intelligence-analyst/.
Every command was run from design/ui/prototype; D stands for that render folder.

## Start screen (shots/tasks/t38/01.png)

"OK. Left side is a list. There's a folder 'For the report' with 'Group 2' at 14 and 'Group 8'
at 13. So Group 2 is my 14. Those names mean nothing, agreed. Before I name it I want to know
who's in it, because a name I can't defend is worse than 'Group 2'. Whole chart is orange --
color is PageRank per the legend -- so I can't see which dots are Group 2 just by looking."

## Step 1 -- click the group

    timeout 120 node app-b/study.mjs --try D/02.png task:t38 --click "Group 2"

"Right panel switched to 'Group 2'. 'Set from the attribute group'. 'Paints 14 nodes'. 'Covered
for Color by PageRank' -- so its gold color is there but something else is painted over it.
That's why I can't see them. Fine. There's a Style and a Data tab. Let me see the members."

## Step 2 -- try to see who is in it

    timeout 120 node app-b/study.mjs --try D/03.png task:t38 --click "Group 2" --click "Data"

"That took me to a whole different Data page on the left -- sources, miserables.gexf, filters.
Not the members of my group. There are two things called 'Data' on the screen and I hit the
wrong one. Annoying."

    timeout 120 node app-b/study.mjs --try D/07.png task:t38 --click "Group 2" --click "Paints 14 nodes"

"'Paints 14 nodes' is a link, so I click it expecting the 14. It says '5 nodes' selected. Five?
The link said fourteen. 'Why this look' lists Group 2 at 1 of 5. So whatever I just selected is
not my group. That's the 'side panel said 212, I count 40' thing. Which one's lying?"

    timeout 120 node app-b/study.mjs --try D/08.png task:t38 --click "Group 2" --click "Table"

"Table opened at the bottom. 77 nodes, with a 'group' column. Valjean is group 2. Gavroche and
Marius are group 8. It didn't filter to my group -- it's everybody, sorted by degree -- but I
can read enough off the top rows. Group 2 has Valjean in it; Group 8 is Gavroche and Marius,
the barricade kids. Good enough to name them. In a real case I'd want the table filtered to the
group I clicked, not all 77."

## Step 3 -- find rename

    timeout 120 node app-b/study.mjs --try D/04.png task:t38 --click "Group 2" --click "Rename"

Tool said: nothing on screen is called "Rename".

"No Rename button. Right-click is usually where that lives. Let me try the 'more' dots."

    timeout 120 node app-b/study.mjs --try D/05.png task:t38 --click "Group 2" --click "More"

"Well, a menu opened, but it's for 'Community 3', not Group 2 -- and the Louvain list expanded on
the left. Wrong row entirely. But the menu shows 'Rename ... F2', grayed out, with 'A run's
groups renumber when it reruns; Keep as set to name one'. OK -- so that's the computed groups
and you can't name them. Mine are in 'For the report', different kind. And now I know the key
is F2. I only learned that by opening the wrong menu."

## Step 4 -- rename Group 2

    timeout 120 node app-b/study.mjs --try D/06.png task:t38 --click "Group 2" --key F2

"There it is. The name in the list turned into a box with 'Group 2' highlighted. I type
'Valjean circle' and press Enter."

    timeout 120 node app-b/study.mjs --try D/10.png task:t38 --click "Group 2" --key F2 --type "Valjean circle"
    timeout 120 node app-b/study.mjs --try D/09.png task:t38 --click "Group 2" --key F2 --type "Valjean circle" --key Enter

(The click-through tool does not take typing; the box stayed showing "Group 2" and Enter put
back the old name. In the session I treat the open, selected name box as the point where I
would have typed it.)

"Box is open, text selected, so typing replaces it. That's how Explorer works, that's how i2
works. I'd type and hit Enter. Fine."

## Step 5 -- the next group

    timeout 120 node app-b/study.mjs --try D/11.png task:t38 --click "Group 2" --key F2 --key Enter --click "Group 8" --key F2

"Click Group 8, F2, same box. 'Barricade students'. Done. Second one took five seconds because
I knew the trick by then."

## Wrap-up

Succeeded? "Yes, I think so -- both names were editable in the list. But I got there by
accident. There's no Rename on the row or the right panel I could find; I found F2 in a menu for
a different row. And one more worry: the panel says the group is 'set from the attribute group'.
If I rename it, did I rename the label only, or did I just change the 'group' value on fourteen
records? Nothing on screen told me. If that changes the data, I need to know before it goes in
a report."

Single Ease Question: 3 of 7. "Easy once you know F2. Nothing on screen tells you F2."

Would I use this instead of i2? "Not for this. In i2 I'd double-click or right-click the thing and
rename it. Here the right-click menu I eventually saw is for a different row, the 'Paints 14
nodes' link selected five, the 'Data' tab took me off to another page, and the table doesn't
narrow to the group I clicked. The renaming itself is fine. Getting to it, and knowing who's in
the group first, is the slow part."

## Problems seen

1. No visible Rename for a group: not on the row, not in the right panel. F2 was found only in
   a menu that opened for the wrong row. (06.png after 04.png, 05.png)
2. "More" opened the menu for "Community 3" and expanded the Louvain list instead of acting on
   the selected Group 2. (05.png)
3. "Paints 14 nodes" selected 5 nodes, not the 14 it names. (07.png)
4. Two controls called "Data"; the left rail's took me away from the group. (03.png)
5. The table did not narrow to the selected group; I had to read the 'group' column off all 77.
   (08.png)
6. Group colors are hidden under PageRank, so the group cannot be seen on the chart. (02.png)
7. Unclear whether renaming a group "set from the attribute group" renames the label or rewrites
   the data. (02.png, 06.png)
