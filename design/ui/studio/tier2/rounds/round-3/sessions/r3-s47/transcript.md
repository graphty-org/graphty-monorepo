# Session r3-s47 -- Tom, returning user

Task: friends.csv is open. Ava wants to invite the people she runs with, and the people they run with. How many is that, not counting Ava? Then change the drawing to show only Ava and those people.

## Start

Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs --start <session> setup:friends-ranked.txt`

01.png: the lab map is open -- friends.csv, colored by PageRank, 20 in the list. No names on the dots. Ava is not visible anywhere. I will type her name in the search box at the top left.

## Step 2
Command: `--step <session> --click "Find nodes, edges, values" --type "Ava"`

02.png: found her. Nodes 1: Ava. Edges 6: Ava -> Ben, Chloe, Dev; Sana, Theo, Ivan -> Ava. So six people she runs with. I don't know who THEY run with yet. I'll click Ava in the list and see what it gives me.

## Step 3
Command: `--step <session> --click-at 107,153` (Ava in the results)

03.png: Ava is picked, a small dot lit up in the middle. Right side says Degree 6, PageRank #20 of 20. Selection 1. Nothing about her friends' friends. There's a "..." at the top right of her panel. I'll try that.

## Step 4
Command: `--step <session> --click-at 1419,74` (Node actions)

04.png: a short menu: Neighborhood, Path between..., Frame selection, Add note. "Neighborhood" sounds like the people around her. Trying it.

## Step 5
Command: `--step <session> --click "Neighborhood"`

05.png: "Ava and 6 connections", a list Ben, Chloe, Dev, Ivan, Sana, Theo. Selection now 7. There is "Hops 1 2 3". The people they run with is one more step out, so 2. Follow is on All, which I leave -- running with someone goes both ways as far as I'm concerned. Clicking 2.

## Step 6
Command: `--step <session> --click-at 1350,178` (Hops 2)

06.png: "Ava and 14 connections". I counted the list: Ben, Chloe, Dev, Eli, Farah, Gus, Hana, Ivan, Jada, Kofi, Quinn, Ravi, Sana, Theo -- 14. Selection says 15, which is the 14 plus Ava. So the answer is 14. Now to show only them: there's a button right there, "Filter to neighbors". Pressing it.

## Step 7
Command: `--step <session> --click "Filter to neighbors"`

07.png: the top bar now says "15 of 20 nodes" and the five dots up in the top right corner are gone. I count 15 dots, all ringed. That is Ava and her 14. The button went grey, so it took. The legend now says "PageRank, full graph" and the PageRank row on the left got a little clock-looking icon instead of the bar icon. I don't know what that clock means -- I'd ask her whether the ranking is still right or out of date now. But the drawing has only Ava and those people, which is what was asked. I'm done.

## End
Command: `--end <session>`

Session ended normally; no further request.

## In my own words (Tom)

- **Did I finish?** Yes. 14 people, not counting Ava. The drawing now shows only Ava and those 14 ("15 of 20 nodes" at the top).
- **Ease:** 6 of 7.
- **What went well:** typing her name found her, and the "..." menu had "Neighborhood". The "Hops 1 2 3" made "the people they run with" a single click, and it said "Ava and 14 connections" with the names listed, so I could count them myself and it matched.
- **What confused me:** the "..." menu was the only way in; I only tried it because nothing else on Ava's panel looked like it. "Hops" is not my word, but 1, 2, 3 next to a list that grew was clear enough. After filtering, the legend says "full graph" and the PageRank row got a clock icon; I can't tell if that means the ranking is now stale or wrong. I'd ask her about that bit. I also don't know whether "Filter" changed the saved lab map or only what I'm looking at.
