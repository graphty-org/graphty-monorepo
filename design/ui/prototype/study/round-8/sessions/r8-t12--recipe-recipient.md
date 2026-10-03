# Session: Tom, the recipe recipient -- find Javert and who he shares chapters with

Task as given: "You have never used this program before. You will practice on the ready-made
network of characters from the novel Les Miserables that comes with the program, not on your own
data. Go to the police inspector Javert, read what the program knows about him, and see which
characters he shares chapters with."

Renders are in tmp/round-8-sessions/r8-t12--recipe-recipient/. All commands were run from
design/ui/prototype; DIR below stands for
/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t12--recipe-recipient.

## Step 1 -- start screen (shots/tasks/r8-t12/01.png)

"OK, a start page. 'Files are read on this computer and never uploaded' -- good, I like seeing
that, though this is a sample so it does not matter today. There is a box at the bottom asking
about usage data. I'm not sharing anything from a university laptop, 'No thanks'. On the right,
Samples, 'Les Miserables, 77 characters'. That's the one."

## Step 2 -- open the sample

    timeout 120 node app-b/study.mjs --try DIR/02.png task:r8-t12 --click "No thanks" --click "Les Miserables"

"Whoa. That's a lot. A picture in the middle, orange dots, and a long list on the left: PageRank,
Louvain, Shortest paths, Density, Link prediction... I don't know what most of those are and I'm
not learning them now. A panel on the right about 'PageRank, Orange to brown'. Not what I asked
for. But I can see 'Javert' written in the picture, right next to Valjean. I'll click that."

## Step 3 -- click "Javert"

    timeout 120 node app-b/study.mjs --try DIR/03.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Javert"

(The tool reported "Javert" matched two rows in the left list, "Valjean to Javert" and "Myriel to
Javert", and clicked the first.)

"Hm. The right side now says 'Valjean to Javert -- Path from Shortest paths'. 2 nodes, 1 edge,
'17 shared chapters'. So Valjean and Javert share 17 chapters. That's something, but it's about
the pair, not about Javert. Down in 'Members' there's Javert again, in blue. I'll try that."

## Step 4 -- click Javert from the pair panel

    timeout 120 node app-b/study.mjs --try DIR/05.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Valjean to Javert" --click "Javert"

(The tool clicked the "To Javert" link.)

"It's showing me Valjean. I clicked Javert and got Valjean. 36 connections, PageRank... that's
him, not the policeman."

    timeout 120 node app-b/study.mjs --try DIR/06.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Valjean to Javert" --click "Javert end"

"Again. Clicked Javert in the list, got Valjean again. That's twice. Normally this is where I'd
write to her and ask for a PNG. I'll try one more thing because I'm being asked to."

(I also tried clicking the search box, "Find rows and notes", render 04. It put a cursor in it,
but nothing appeared, so I did not see a way to search without already knowing how it works.)

    timeout 120 node app-b/study.mjs --try DIR/04.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Find rows and notes"

## Step 5 -- the Table

"There's a 'Table' at the bottom. A table I understand."

    timeout 120 node app-b/study.mjs --try DIR/07.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table"

"Now that's more like it. A spreadsheet: label, group, degree, rank. 'Javert, group 4, 17,
#4 of 77'. I'll click his row."

    timeout 120 node app-b/study.mjs --try DIR/08.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert"

"There we go, the right side says 'Javert, Node'. And a little tag in the picture, 'Javert, 17
connections'. But the panel is on 'Style', 'Why this look', with PageRank, Louvain, Watchlist...
that's about colors. I want what it knows about him. There's 'Data' next to 'Style'. Click Data."

## Step 6 -- Data

    timeout 120 node app-b/study.mjs --try DIR/09.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "Data"

(The tool reported two things called "Data", the big button on the far left and the tab next to
Style, and clicked the left one. I meant the tab. A second try at the tab by name found nothing.)

    timeout 120 node app-b/study.mjs --try DIR/10.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "tab Data"

"Whatever I hit, now the whole left side is 'Sources', 'Filters', 'Attributes', and Javert is gone
from the right. It's showing the whole network. I've lost him."

## Step 7 -- who he shares chapters with

"Back to Javert selected. '17 connections' -- so 17 characters. Which 17? There's a row of little
icons over the picture, no words on them. I don't know what they do."

    timeout 120 node app-b/study.mjs --try DIR/11.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --hover "Neighbors"
    timeout 120 node app-b/study.mjs --try DIR/12.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "17 connections"

"Nothing is called that, and clicking '17 connections' did nothing. Last thing: the table has an
'Edges' tab. Maybe it lists his."

    timeout 120 node app-b/study.mjs --try DIR/13.png task:r8-t12 --click "No thanks" --click "Les Miserables" --click "Table" --click "Javert" --click "Edges"

"254 edges. All of them, Cosette-Valjean, Marius-Cosette... Javert-Valjean is in there at 17. It's
not just his. I'd have to go through 254 rows in pages of 20. No. I'm done."

## Outcome

Did I succeed? Partly. I got to Javert in the end through the table, and I know he has 17
connections, is in group 4, ranks 4th of 77, and has one note. I know he shares 17 chapters with
Valjean. I did not get the list of the characters he shares chapters with, and I never saw the
page of facts about him -- the side panel opened on colors, and when I went for "Data" I lost him.

Single Ease Question: 2 out of 7.

Would I use this instead of what I use now? No. Twice I clicked Javert and got Valjean. The table
was the only part that behaved the way I expected. If she wants me to know who Javert talks to, she
can send me the list in Excel.

## Problems as experienced

- Clicking Javert's name, both in the picture area and in the pair panel, showed Valjean instead.
- The first screen of the sample opens on a long list of terms (PageRank, Louvain, Link
  prediction) with nothing saying where a character's own page is.
- Selecting Javert opens his panel on how he is colored, not on what is known about him.
- Two different controls are both called "Data"; the one I hit took me away from Javert.
- "17 connections" is shown, but I could not find the 17 names. The icons above the picture have no
  words.
- The Edges table did not narrow to Javert after I had selected him.

## What worked

- "Files are read on this computer and never uploaded" on the start page.
- The table: a plain grid with names and numbers, and clicking a row selected the character.
- "17 shared chapters" on the Valjean-Javert pair said what the number meant in plain words.
