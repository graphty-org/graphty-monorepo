# Session: rename two groups -- Explorer Elena

Task as given: "The group of 14 characters in your report folder is called something meaningless.
Call it something meaningful, then do the same for the next group. The data on screen is a sample:
characters of the novel Les Miserables, linked when they appear in the same chapter."

Start screen: shots/tasks/t38/01.png. All commands run from design/ui/prototype; D is
tmp/round-7-sessions/t38--explorer-elena (absolute path used in the real commands).

## Step 0 -- looking at the start screen

"OK, left list. There's a folder 'For the report' and under it 'Group 2' with 14 and 'Group 8'
with 13. So Group 2 is the one with 14. That is a meaningless name, agreed. Before I rename it I
need to know who is IN it, otherwise I'm just making something up. The picture is all orange
though -- everything is the same color, so the picture does not tell me who is in Group 2."

## Step 1 -- click the row

    timeout 120 node app-b/study.mjs --try $D/01.png task:t38 --click "Group 2"

"It highlighted and the right side now says Group 2, 'Paints 14 nodes', 'Covered for Color by
PageRank'. Covered? I don't know what that means. The dot next to Group 2 is yellow but nothing on
the picture turned yellow. There's a 'Style' and a 'Data' tab on the right -- Data might list the
people."

## Step 2 -- try Data

    timeout 120 node app-b/study.mjs --try $D/02.png task:t38 --click "Group 2" --click "Data"

"Huh. The whole left side changed to some file thing, 'miserables.gexf', sources, filters. The
right says Co-appearances, 77 nodes. That isn't my group at all. I clicked the wrong Data -- there
are two words 'Data' on screen, one on the far left strip. Back."

## Step 3 -- look for Rename

    timeout 120 node app-b/study.mjs --try $D/03.png task:t38 --click "Group 2" --click "Rename"

Result: nothing on screen is called "Rename".

"No Rename button anywhere. In Google Sheets I'd double-click a tab name."

    timeout 120 node app-b/study.mjs --try $D/04.png task:t38 --click "Group 2" --click "Group 2"

"Clicking it again does nothing. OK, the three dots at the top right, that's usually where stuff
hides."

## Step 4 -- the three dots

    timeout 120 node app-b/study.mjs --try $D/05.png task:t38 --click "Group 2" --hover "More"

"Tooltip says 'More actions, Shift+F10'. Click it."

    timeout 120 node app-b/study.mjs --try $D/06.png task:t38 --click "Group 2" --click "More actions"

"Wait. The menu says 'Community 3' at the top, and the list on the left jumped open to some
Louvain thing with Community 1, 2, 3. The right panel now says Community 3 too. I didn't pick
Community 3. And Rename is grayed out with a note: 'A run's groups renumber when it reruns; Keep
as set to name one.' I have no idea what that means. But at least I learned Rename exists and the
key is F2. Let me go back to Group 2 and press F2."

## Step 5 -- F2 on Group 2

    timeout 120 node app-b/study.mjs --try $D/07.png task:t38 --click "Group 2" --key F2

"There we go -- the name turned into a text box with 'Group 2' highlighted. Like renaming a file.
But I still don't know what to call it. Who are these 14 people?"

## Step 6 -- trying to see who is in the group

    timeout 120 node app-b/study.mjs --try $D/08.png task:t38 --click "Group 2" --click "Paints 14 nodes"

"I clicked 'Paints 14 nodes' expecting it to show me the 14. Now the top right says '5 nodes' and
Selection says 5. Five? It said 14. And the picture still looks exactly the same, all orange, so I
can't see which five either. There's a 'Why this look' list that I don't understand. This is the
part where I'd start to doubt myself."

    timeout 120 node app-b/study.mjs --try $D/09.png task:t38 --click "Group 2" --click "Table"

"A table came up from the bottom. 77 nodes, not just my group, but there's a 'group' column.
Valjean has group 2 with a yellow square. Gavroche and Marius are group 8, blue. Javert and
Thenardier are 4. It's sorted by degree, whatever that is, so I only see the top few. I'd want to
filter this to group 2 and it doesn't look like it did that by itself even though I had Group 2
picked. Still -- Valjean is the biggest name in group 2, and Marius and Gavroche are group 8, the
cluster at the bottom with Enjolras, Bossuet, Courfeyrac -- those are the students at the
barricade, I remember that much from the musical. Good enough: Group 2 is 'Valjean's circle',
Group 8 is 'Barricade students'."

## Step 7 -- typing the new names

    timeout 120 node app-b/study.mjs --try $D/10.png task:t38 --click "Group 2" --key F2 --type "Valjean's circle" --key Enter
    timeout 120 node app-b/study.mjs --try $D/11.png task:t38 --click "Group 2" --key F2 --type "Valjean circle"

Moderator note: the click-through tool did not take typed text; render 11 shows the name box open
with "Group 2" selected and ready to be overwritten, which is where a real participant would type.
I count reaching an open, selected name box as reaching the rename.

    timeout 120 node app-b/study.mjs --try $D/12.png task:t38 --click "Group 2" --key F2 --key Escape --click "Group 8" --key F2

"Same thing for Group 8: click it, F2, the box opens with the old name selected. Once I knew F2,
the second one took two seconds."

## Wrap-up

**Did I succeed?** Mostly yes. I got both names into edit mode and I'd have typed "Valjean's
circle" and "Barricade students". But I only found F2 by accident, from a menu that opened for the
wrong thing (Community 3), and I picked the names from a table of all 77 people and my memory of
the musical, not because the app showed me who was in each group.

**Single Ease Question:** 3 of 7. Renaming itself is easy once you know F2. Knowing it's F2, and
knowing who's in the group so the name means something, was hard.

**Would I use this instead of what I use now?** Not yet. In Sheets or Slides I'd double-click a
name and type. Here there's no visible rename, the dots menu showed me the wrong group, clicking
"Paints 14 nodes" told me 5, and the group colors never show up in the picture, so I can't see the
people I'm naming. If clicking a group lit up its members in the picture and double-clicking the
name let me type, I'd be fine.

## Problems seen

1. No visible way to rename a row: no Rename button, double-click/second click does nothing; F2 is
   only discoverable from a menu. (Severe)
2. "More actions" opened a menu for Community 3 under Louvain, not for Group 2 which was selected,
   and changed the right panel to Community 3. (Severe)
3. The group's own color is hidden on the canvas ("Covered for Color by PageRank"), so selecting a
   group shows nothing on the picture; you can't see who is in it. (High)
4. "Paints 14 nodes" link selected 5 nodes, contradicting its own count. (High)
5. Two controls called "Data" (left rail and right-panel tab); the obvious one jumped to a
   different screen. (Medium)
6. The table did not narrow to the selected group; I had to scan a group column across 77 rows.
   (Medium)
7. Grayed Rename note "A run's groups renumber when it reruns; Keep as set to name one" is
   unreadable jargon to me. (Low)
