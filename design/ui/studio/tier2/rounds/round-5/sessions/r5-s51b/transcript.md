# Session r5-s51b -- Tom, returning user

Task: friends.csv is open. Ava wants to invite the people she runs with, and the people they run with. How many people is that, not counting Ava? Then change the drawing so it has only Ava and those people.

All commands: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs --step tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s51b ...` (run from the worktree).

## 01.png (start)
Brown balls with arrows, no names on any of them. A PageRank box from last time. I need to find Ava. There's a search box top left, "Find nodes, edges, values" -- I'll type her name there.

## Step 1 -> 02.png
Command: `--click "Find nodes, edges, values" --type "Ava"`
Good, Ava is found: one node, six links -- Ben, Chloe, Dev, and Sana, Theo, Ivan pointing at her. So six people she runs with. Now I need the people THEY run with, and I am not counting that by hand. I'll click on Ava in the list and see what it offers.

## Step 2 -> 03.png (nothing happened; my click was ambiguous), Step 3 -> 04.png
Commands: `--click "Ava"` (refused, ambiguous), `--click "Ava#1"`
Ava is lit up yellow on the picture, bottom middle, and the right side says Degree 6. Six again, matches. No names on the drawing at all, though. There's a "..." at the top right next to her name -- maybe that has something like "show her friends".

## Step 4 -> 05.png
Command: `--click-at 1419,73` (the "..." button, "Node actions")
A short menu: Neighborhood, Path between..., Frame selection, Add note. "Neighborhood" sounds like the people around her. Trying that.

## Step 5 -> 06.png
Command: `--click "Neighborhood"`
"Ava and 6 connections", with names: Ben, Chloe, Dev, Ivan, Sana, Theo. Six circles lit on the picture. There's "Hops 1 2 3". I don't know the word "hops", but 1 is what I have now -- her own people. The people they run with should be one more step out, so 2. Follow is already on "All", which I'll leave alone.

## Step 6 -> 07.png (refused: "2" also matched "Dev 2" in the list), Step 7 -> 08.png
Commands: `--click "2"` (ambiguous), `--click "role=radio:2"`
"Ava and 14 connections." I counted the names in the list myself: Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo -- 14. On the left it says Selection 15, which is the 14 plus Ava. That adds up. So the answer is 14.
Now to make the drawing show only them. There's a "Filter to neighbors" button right under it. "Filter" I know from Excel -- it hides rows, doesn't delete them. Clicking it.

## Step 8 -> 09.png
Command: `--click "Filter to neighbors"`
The five unlit balls at the top right are gone. The top bar now says "15 of 20 nodes" -- Ava plus her 14. That's what I wanted, and it says plainly that 5 are hidden, not deleted. The legend box now says "PageRank, full graph", and a little clock icon showed up next to PageRank on the left; I don't know what that icon means, but the colours didn't change so I'm leaving it. The button greyed out, so it took. Done.

Command: `--end` (session ended)

## At the end, in Tom's words
- Did I finish? Yes. The answer is 14 people, not counting Ava, and the drawing now shows only Ava and those 14 ("15 of 20 nodes" at the top).
- Ease: 6 of 7.
- What confused me:
  - The picture has no names on it. I had to type Ava into the search box to find her at all; I couldn't have pointed at her on the drawing.
  - "Neighborhood" was tucked behind the "..." button. I found it because it was the only button there, not because anything pointed me to it.
  - "Hops" is not a word I use. I guessed 2 meant one step further out than her own people, and the names in the list confirmed it -- I wouldn't have trusted the number without seeing the names.
  - When I went to 2, the "weight" numbers next to the names disappeared and I don't know why.
  - After filtering, a little clock icon appeared next to PageRank on the left and the legend started saying "full graph". I don't know if my colours are now wrong or just the same as before. I'd probably ask about that bit.
  - It was good that the count (14) and Selection (15) and "15 of 20 nodes" all agreed. I could tell someone the number without counting.
