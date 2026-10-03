# Session: find Javert, read what is known about him, see who he shares chapters with

Participant: Nadia, level-1 alert reviewer (study/personas/alert-reviewer.md)
Task given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your
own data. Go to the police inspector Javert, read what the program knows about him, and see
which characters he shares chapters with."

Start screen: shots/tasks/r8-t12/01.png
Renders: tmp/round-8-sessions/r8-t12--alert-reviewer/NN.png
All commands run from design/ui/prototype. P = the full path of the renders folder.

## Steps

### 1. Start screen (01.png)

"Start page. Pop-up at the bottom asking for usage data. No thanks. On the right, samples. Les
Miserables, 77 characters. That's the one."

### 2. Open the sample (02.png)

    timeout 120 node app-b/study.mjs --try P/02.png task:r8-t12 --click "No thanks" --click "Les Miserables"

"That's a lot at once. A list on the left with PageRank, Louvain, shortest paths, link
prediction, watchlist... I don't know what most of these are. The map in the middle. I can see
'Javert' printed right next to 'Valjean'. I'll click him."

### 3. Click "Javert" (03.png)

    timeout 120 node app-b/study.mjs --try P/03.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Javert"

(Tool: "Javert" matched two rows in the left list, "Valjean to Javert" and "Myriel to Javert";
the first was clicked.)

"That opened 'Valjean to Javert', a path. 2 nodes, 1 edge, 17 shared chapters. Useful, I
suppose, but it's not Javert. It's a thing about Javert. Let me do what I always do and use the
search box."

### 4. Type Javert into the search box (04.png)

    timeout 120 node app-b/study.mjs --try P/04.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Find rows and notes" --type "Javert"

"Typed it. Nothing happened. The list is the same, nothing lit up on the map. Is it broken?"

### 5. Press Enter (05.png)

    timeout 120 node app-b/study.mjs --try P/05.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Find rows and notes" --type "Javert" --key Enter

"OK, Enter. Should show results as I type, every other search does. Now: Nodes - Javert, 17
neighbors. Rows - two paths and a Watchlist he's a member of. Two notes. That first one is him."

### 6. Click the Javert result (06.png)

    timeout 120 node app-b/study.mjs --try P/06.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Find rows and notes" --type "Javert" --key Enter --click "17 neighbors"

"There, he's circled on the map. Right side says 'Javert, Node', and under it 'Why this look' --
PageRank, Color, Degree, Size. I don't care how he's painted, I want what's known about him.
There's a 'Data' tab. A row of icons popped up above the bottom toolbar, no words on them. A
label: 'Javert, 17 connections'."

### 7. Click "Data" (07.png)

    timeout 120 node app-b/study.mjs --try P/07.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Find rows and notes" --type "Javert" --key Enter --click "17 neighbors" --click "Data"

(Tool: "Data" matched the left-side "Data" button and the right-side "Data" tab; the left button
was clicked. The left one is bigger and has an icon, so a first-time user could easily hit it.)

"Whoa. The whole left side changed to files, filters and attributes, and the right side is
about the whole graph now. 77 nodes, 254 edges, density. Where did Javert go?"

### 8. Back to Graph (08.png)

    timeout 120 node app-b/study.mjs --try P/08.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Find rows and notes" --type "Javert" --key Enter --click "17 neighbors" --click "Data" --click "Graph"

"Lost him. Selection is empty. Same thing as clicking away from an account in the case system
and having to paste the number again. Search again."

### 9. Try to reach the small Data tab on the right (09.png)

    timeout 120 node app-b/study.mjs --try P/09.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Find rows and notes" --type "Javert" --key Enter --click "17 neighbors" --click "tab Data"

(Tool: "nothing on screen is called 'tab Data'". The click-through tool cannot pick the second
of two controls with the same name, so the right-hand Data tab for Javert was never opened in
this session. This is a limitation of the study tool, not something the participant did; it
also means this session never saw what that tab shows.)

### 10. Click the "Javert, 17 connections" label (10.png)

    timeout 120 node app-b/study.mjs --try P/10.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Find rows and notes" --type "Javert" --key Enter --click "17 neighbors" --click "Javert, 17 connections"

"Nothing. It's just a label. Fine, the icons then. Rest the mouse on each."

### 11. Hover the icons for tooltips (11.png - 14.png)

    for i in 1 2 3; do timeout 120 node app-b/study.mjs --try P/1$i.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Find rows and notes" --type "Javert" --key Enter --click "17 neighbors" --hover-icon $i; done
    for i in $(seq 4 23); do timeout 120 node app-b/study.mjs --try P/14.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Find rows and notes" --type "Javert" --key Enter --click "17 neighbors" --hover-icon $i; done

Tooltips on the bar that appeared when Javert was picked: Neighborhood (G), Path between (P),
Create set (Ctrl+G), Hide on canvas (Ctrl+Shift+H), Add note (N).

"Neighborhood. That's who he's connected to. Who he shares chapters with, I'd guess."

### 12. Neighborhood (15.png)

    timeout 120 node app-b/study.mjs --try P/15.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Find rows and notes" --type "Javert" --key Enter --click "17 neighbors" --click "Neighborhood"

"Neighborhood of Javert. Distance 1, 2, 3 edge away. One hop from what? From him, I suppose,
since it says 'Covers: Javert and 17 neighbors'. Two buttons: 'Add as steps' -- steps of what?
-- and 'Filter to neighbors', which is blue. I'll take the blue one. I hope filter doesn't
delete everyone else."

### 13. Filter to neighbors (16.png)

    timeout 120 node app-b/study.mjs --try P/16.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Find rows and notes" --type "Javert" --key Enter --click "17 neighbors" --click "Neighborhood" --click "Filter to neighbors"

"Black box at the bottom: 'Added filter step: Neighbors of Javert, 1 edge away'. Top button now
says 18 of 77 nodes. But the map looks exactly the same -- every dot is still there. And the
right side now says Valjean. I picked Javert. Did it switch to Valjean on its own? I want a list
of names. There's a Table at the bottom."

### 14. Table (17.png)

    timeout 120 node app-b/study.mjs --try P/17.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Find rows and notes" --type "Javert" --key Enter --click "17 neighbors" --click "Neighborhood" --click "Filter to neighbors" --click "Table"

"A spreadsheet. Finally something I know. Javert's row: group 4, degree 17, number 4 of 77 by
degree, PageRank 0.0303, one note. So that's what it knows about him, more or less. But the
header says '18 of 77 nodes' and the corner says 'Rows 1 to 77 of 77'. Which is it? Is this his
17 people or everybody? I can only see four rows. Edges might give me who-with-whom and how many
chapters."

### 15. Edges (18.png)

    timeout 120 node app-b/study.mjs --try P/18.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Find rows and notes" --type "Javert" --key Enter --click "17 neighbors" --click "Neighborhood" --click "Filter to neighbors" --click "Table" --click "Edges"

"254 edges. Cosette-Valjean 31, Marius-Cosette 21, Courfeyrac-Enjolras 17. Javert isn't in most
of these. So the filter didn't filter the table and didn't filter the map. Javert-Valjean 17 is
the only one that's his. Let me click that '18 of 77 nodes' button and see what it thinks it's
doing."

### 16. The filter button at the top (19.png)

    timeout 120 node app-b/study.mjs --try P/19.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Find rows and notes" --type "Javert" --key Enter --click "17 neighbors" --click "Neighborhood" --click "Filter to neighbors" --click "18 of 77 nodes"

"Now it says 40 of 77. The filters are 'Degree 2 or more', 'Degree 5 or more', 'group is not 0'.
I didn't make any of those. Where's 'Neighbors of Javert'? It's gone. I've been at this longer
than an alert takes. I'm stopping."

## Outcome

Did I succeed? "Half. I found him, and from the table I know he's in group 4, he has 17
connections, he's fourth by connections, and there's a note on him. I know he and Valjean share
17 chapters. I never got a list of the other sixteen people. The filter said it worked and then
nothing on screen agreed with it."

Single Ease Question (1 = very difficult, 7 = very easy): **2**

Would I use this instead of my current tool? "No. I don't have a graph tool -- my current tool
is the case system and a spreadsheet, and with those I'd have pulled the counterparty list in
two minutes. Here: the search didn't search until I hit Enter, two buttons both say 'Data' and
the wrong one threw away what I'd picked, the person on the right changed from Javert to Valjean
without me asking, and the filter said 18 then showed me 77, then 40. If QA asked me 'which 17'
I couldn't tell them. And I'd want to know before trusting anything whether it can give me one
picture and a few lines for the file. I never got that far."

## What got in the way (participant's words, summarized)

1. Search shows no results while typing; only Enter shows them.
2. Clicking a name on the map/list grabbed a path ("Valjean to Javert") instead of the person.
3. Two controls called "Data": the left one replaces the whole panel and drops the selection.
4. The right panel opens on "Style / Why this look" for a person -- how he's painted, not what's
   known about him.
5. The actions that appear for a selected person are icons only; needed to hover all of them.
6. "Add as steps" and "1 edge away" are not words a first-timer knows.
7. After "Filter to neighbors": map unchanged, table still shows all rows ("18 of 77" vs "Rows 1
   to 77 of 77"), the right panel switched from Javert to Valjean.
8. Opening the filter button showed three filters that were not hers, a new count (40 of 77),
   and no sign of the neighbors filter she had just added.
9. Never found a plain list of "Javert's characters, with chapters shared".

Study-tool note: the click-through tool picks the first of two same-named controls, so the
right-hand Data tab on Javert was never reached in this session.
