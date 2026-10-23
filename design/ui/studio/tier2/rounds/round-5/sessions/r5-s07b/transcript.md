# Session r5-s07b -- transcript (participant: Tom, the recipe recipient, returning user)

Task: bus-stops.csv is open. Without taking any stop or link off the drawing, point out on the
drawing every link that takes 10 minutes or more, and say how many there are.

All commands run from /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ and session folder
S=tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s07b

## 01.png (session already started)

The bus map is up: orange balls, one big dark one in the middle, arrows between them. A box top-left
says "Size: PageRank" and "Color: PageRank" -- that is the ranking my colleague showed me. Left side:
a search box "Find nodes, edges, values", Selection, PageRank, Everything. Nothing on the screen says
minutes. I need the links of 10 minutes or more. I will try the search box first -- it says "values".

Command: `node design/ui/studio/tool/real.mjs --step $S --click "Find nodes, edges, values"` -> 02.png

## 02.png

The search box is lit up now, nothing else changed. I don't know what the column is called. I'll
just type "10" and see what it finds.

Command: `--step $S --type "10"` -> 03.png

## 03.png

Now it offers "minutes is 10 or more (3)" under "Values". That is exactly my question, and it already
says 3. The little icon next to it looks like a funnel, though -- the filter thing. I was told not to
take anything off the drawing. I'll click it and watch the picture closely; if stops disappear I'll
undo.

Command: `--step $S --click "minutes is 10 or more (3)"` -> 04.png

## 04.png

Good -- nothing went away. I count the balls: still ten, and all the grey arrows are still there.
Three links are now drawn thick and blue, all at the top of the map around the big dark stop. The
right side says "3 edges selected" and lists them with their minutes: School -> Harbor 12,
Depot -> Station 15, Station -> Harbor 14. Three rows, three blue lines, and the search said 3. The
numbers agree. That is my answer, so I'll stop here.

Command: `--end $S`

Session ended.

## At the end, in Tom's words

- **Did I finish?** Yes. There are 3 links of 10 minutes or more: School -> Harbor (12), Depot ->
  Station (15) and Station -> Harbor (14). They are drawn thick and blue on the map, and every stop
  and link is still on it.
- **Ease:** 6 out of 7.
- **What confused me:** The suggestion "minutes is 10 or more (3)" had the funnel icon, the same one
  as the filter. I thought clicking it would hide the other stops, and I was told not to take anything
  off. It only selected the three links, but I didn't know that until after I clicked. I also had to
  guess at the search: nothing on the main screen says the links have minutes until you type
  something. The blue lines are fine for me, but I would not know if they stay blue for the PI
  next week -- it says "Selection", which sounds like it goes away when I click somewhere else.
