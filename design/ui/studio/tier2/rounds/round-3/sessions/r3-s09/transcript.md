# Session r3-s09 transcript (Nadia, returning user)

Task: in bus-stops.csv, point out on the drawing every link that takes 10 minutes or more, without
taking any stop or link off the drawing, and say how many there are.

All commands run from /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ and
S=tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s09 (the session folder the briefing names).
The screenshots were copied here by --end.

## Start

`node design/ui/studio/tool/real.mjs --start $S setup:bus-stops-ranked.txt` -> 01.png

01.png: the bus-stops network is open, 10 orange balls sized by a PageRank someone ran, arrows
between them, no labels. Left panel has a find box "Find nodes, edges, values", Selection, PageRank,
Everything. I need the links with minutes 10 or more. The find box says "values", so I try that
first, the way I always do.

## Step 1

`node design/ui/studio/tool/real.mjs --step $S --click "Find nodes, edges, values" --type "minutes"` -> 02.png

02.png: no matches listed, but a hint "Start with = to select by a value:" and an offer
"=minutes  Select its matches". So there is a way to select by value. I'll write the condition the
way I would in a spreadsheet: =minutes >= 10.

## Step 2

`node design/ui/studio/tool/real.mjs --step $S --key Control+a --type "=minutes >= 10"` -> 03.png

03.png: red text "Put numbers in backticks:" and it already offers the fixed version
"=minutes >= `10`  Select its matches". Odd rule, but it wrote it for me. I click that suggestion.

## Step 3

`node design/ui/studio/tool/real.mjs --step $S --click "Select its matches"` -> 04.png

04.png: "3 edges selected". Three links are now drawn thick and blue on the map, all in the top
part around the big dark stop; nothing was removed, every stop and link is still there. The right
panel lists them with their minutes: School -> Harbor 12, Depot -> Station 15, Station -> Harbor 14.
The search box kept my rule (=minutes >= `10`), so a link of exactly 10 would be included too.
That is my answer: 3 links. Done; ending.

## End

`node design/ui/studio/tool/real.mjs --end $S` -> "session ended", no further request.

## In character, afterwards

- Finished: yes. Three links take 10 minutes or more: School -> Harbor (12), Depot -> Station (15),
  Station -> Harbor (14). They are highlighted in blue on the drawing and nothing was taken off it.
- Ease: 6 of 7. Three steps, under a minute -- faster than doing it in a spreadsheet.
- What confused me:
  - "Put numbers in backticks" -- I would never have guessed that. Lucky it rewrote it for me;
    if it had only told me off I would have been stuck. Why can't 10 just be 10?
  - I had to type "minutes" first to find out the "=" trick exists. The box says "Find nodes,
    edges, values", nothing about conditions.
  - The blue is a selection. I'm not sure it stays if I click somewhere else, so for the colleague
    or the alert file I'd want to screenshot it right away. Nothing told me whether this changed the
    data or just the view; I assume the view.
